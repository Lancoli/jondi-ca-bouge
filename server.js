// Serveur local : sert l'interface et expose les événements agrégés, le géocodage et les trajets Divia.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { aggregate, readCached } = require("./src/aggregate");
const { CATEGORIES } = require("./src/categories");
const { suggest } = require("./src/geocode");
const divia = require("./src/divia");
const trajets = require("./src/trajets");
const { get } = require("./src/lib/http");

const PORT = +process.env.PORT || 4021;
const PUBLIC = path.join(__dirname, "public");
const REFRESH_EVERY = 3 * 3600 * 1000;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".png": "image/png" };

let payload = readCached();
let refreshing = null;
let lastError = null;

// Ajoute à chaque événement géolocalisé son arrêt Divia le plus proche (calculé une fois par chargement).
function withTransit(p) {
  if (!p) return p;
  for (const e of p.events) {
    if (e.lat == null || !e.precise) continue;
    e.stop = divia.nearestStop(e) || undefined;
  }
  return p;
}

function refresh() {
  if (refreshing) return refreshing;
  refreshing = aggregate()
    .then((p) => {
      payload = withTransit(p);
      lastError = null;
    })
    .catch((err) => {
      lastError = err.message;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

const point = (v) => {
  const [lat, lng] = String(v || "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const routes = {
  "GET /api/events": (req, res) =>
    json(res, 200, {
      generatedAt: payload?.generatedAt || null,
      refreshing: !!refreshing,
      error: lastError,
      categories: CATEGORIES,
      sources: payload?.sources || [],
      events: payload?.events || [],
    }),

  "POST /api/refresh": (req, res) => {
    refresh();
    json(res, 202, { refreshing: true });
  },

  "GET /api/geocode": async (req, res, q) => {
    const text = (q.get("q") || "").trim();
    if (text.length < 3) return json(res, 200, []);
    json(res, 200, await suggest(text));
  },

  // Nom lisible d'une position GPS (Base Adresse Nationale).
  "GET /api/reverse": async (req, res, q) => {
    const p = point(q.get("at"));
    if (!p) return json(res, 400, { error: "position invalide" });
    const data = await get(`https://data.geopf.fr/geocodage/reverse?lon=${p.lng}&lat=${p.lat}&limit=1`, { as: "json", timeout: 8000 });
    json(res, 200, { label: data.features?.[0]?.properties?.label || null });
  },

  "GET /api/route": async (req, res, q) => {
    const from = point(q.get("from"));
    const to = point(q.get("to"));
    if (!from || !to) return json(res, 400, { error: "from et to attendus sous la forme lat,lng" });
    json(res, 200, await divia.plan({ from, to, arriveBy: q.get("arriveBy") || undefined }));
  },

  // Comparatif des modes (à pied, vélo, bus/tram, voiture) et de leurs coûts.
  // ?modes=marche,voiture pour n'en demander que certains ; ?conso=6.5&prix=1.85 pour chiffrer l'essence.
  "GET /api/trajets": async (req, res, q) => {
    const from = point(q.get("from"));
    const to = point(q.get("to"));
    if (!from || !to) return json(res, 400, { error: "from et to attendus sous la forme lat,lng" });
    const modes = (q.get("modes") || "").split(",").filter(Boolean);
    const conso = +q.get("conso");
    const prix = +q.get("prix");
    const profil = conso && prix ? { vehicule: { conso, prix } } : null;
    json(res, 200, await trajets.comparer({ from, to, arriveBy: q.get("arriveBy") || undefined, modes, profil }));
  },
};

function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) return json(res, 403, { error: "interdit" });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: "introuvable" });
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) return serveStatic(req, res, url.pathname);
    try {
      await handler(req, res, url.searchParams);
    } catch (err) {
      json(res, 502, { error: err.message });
    }
  })
  .listen(PORT, () => {
    console.log(`Jondi ça bouge → http://localhost:${PORT}`);
    divia
      .load()
      .then(() => withTransit(payload))
      .catch((err) => console.warn("Réseau Divia indisponible :", err.message));
    const age = payload ? Date.now() - Date.parse(payload.generatedAt) : Infinity;
    if (age > REFRESH_EVERY) refresh();
    setInterval(refresh, REFRESH_EVERY);
  });
