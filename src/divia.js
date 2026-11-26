// Réseau DiviaMobilités (Keolis Dijon) à partir de l'open data officiel :
//  - GTFS théorique (arrêts, lignes, horaires) publié sur data.gouv.fr
//  - GTFS-RT « prochains passages » via le proxy transport.data.gouv.fr
// On en tire les arrêts proches d'un lieu et un calcul d'itinéraire direct ou avec une correspondance.
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const GtfsRt = require("gtfs-realtime-bindings");
const { get } = require("./lib/http");
const { distance } = require("./lib/geo");
const { DATA_DIR } = require("./lib/cache");
const { nowLocal, addDays, pad, strip } = require("./lib/dates");

const GTFS_URL = "https://www.data.gouv.fr/api/1/datasets/r/e0dbd217-15cd-4e28-9459-211a27511a34";
const RT_URL = "https://proxy.transport.data.gouv.fr/resource/divia-dijon-gtfs-rt-trip-update";
const GTFS_FILE = path.join(DATA_DIR, "gtfs-divia.zip");
const GTFS_MAX_AGE = 7 * 86400 * 1000;

const WALK_RADIUS = 700; // mètres à vol d'oiseau jusqu'à un arrêt
const WALK_SPEED = 1.25 / 1.3; // m/s, avec 30 % de détour par rapport à la ligne droite
const TRANSFER = 180; // secondes mini pour changer de véhicule

let net = null;
let loading = null;

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const split = (line) => {
    if (!line.includes('"')) return line.split(",");
    const out = [];
    let cur = "", quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]).map((h) => h.trim());
  return { head, rows: lines.slice(1).map(split) };
}

const seconds = (hms) => {
  const [h, m, s] = hms.split(":");
  return +h * 3600 + +m * 60 + +(s || 0);
};
const clock = (sec) => {
  const s = ((Math.round(sec) % 86400) + 86400) % 86400;
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;
};
const walkSeconds = (meters) => Math.round(meters / WALK_SPEED);

async function ensureFile() {
  let age = Infinity;
  try {
    age = Date.now() - fs.statSync(GTFS_FILE).mtimeMs;
  } catch {
    /* pas encore téléchargé */
  }
  if (age < GTFS_MAX_AGE) return;
  try {
    const zip = await get(GTFS_URL, { as: "buffer", timeout: 90000 });
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(GTFS_FILE, zip);
  } catch (err) {
    if (age === Infinity) throw err; // sinon on continue avec l'ancien fichier
  }
}

async function load() {
  if (net) return net;
  if (loading) return loading;
  loading = (async () => {
    await ensureFile();
    const zip = new AdmZip(GTFS_FILE);
    const table = (name) => {
      const entry = zip.getEntry(name);
      return entry ? parseCsv(entry.getData().toString("utf8")) : { head: [], rows: [] };
    };
    const col = (t, name) => t.head.indexOf(name);

    const stops = new Map();
    const groups = new Map();
    {
      const t = table("stops.txt");
      const [id, name, lat, lon] = ["stop_id", "stop_name", "stop_lat", "stop_lon"].map((c) => col(t, c));
      for (const r of t.rows) {
        const group = strip(r[name]).replace(/[^a-z0-9]+/g, " ").trim();
        stops.set(r[id], { id: r[id], name: r[name], lat: +r[lat], lng: +r[lon], group });
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(r[id]);
      }
    }

    const routes = new Map();
    {
      const t = table("routes.txt");
      const [id, short, long, type, color] = ["route_id", "route_short_name", "route_long_name", "route_type", "route_color"].map((c) => col(t, c));
      for (const r of t.rows) {
        routes.set(r[id], { id: r[id], short: r[short], long: r[long], tram: r[type] === "0", color: `#${r[color] || "666666"}` });
      }
    }

    const trips = new Map();
    {
      const t = table("trips.txt");
      const [route, service, id, headsign] = ["route_id", "service_id", "trip_id", "trip_headsign"].map((c) => col(t, c));
      for (const r of t.rows) trips.set(r[id], { id: r[id], route: r[route], service: r[service], headsign: r[headsign], stops: [], times: [], seq: [] });
    }

    {
      const t = table("stop_times.txt");
      const [trip, dep, stop, seq] = ["trip_id", "departure_time", "stop_id", "stop_sequence"].map((c) => col(t, c));
      for (const r of t.rows) {
        const tr = trips.get(r[trip]);
        if (!tr || !r[dep]) continue;
        tr.stops.push(r[stop]);
        tr.times.push(seconds(r[dep]));
        tr.seq.push(+r[seq]);
      }
    }

    const stopTrips = new Map();
    const stopRoutes = new Map();
    for (const tr of trips.values()) {
      // le fichier n'est pas garanti trié par ordre de passage
      if (tr.seq.some((s, i) => i && s < tr.seq[i - 1])) {
        const order = tr.seq.map((_, i) => i).sort((a, b) => tr.seq[a] - tr.seq[b]);
        tr.stops = order.map((i) => tr.stops[i]);
        tr.times = order.map((i) => tr.times[i]);
      }
      delete tr.seq;
      tr.stops.forEach((s, i) => {
        if (!stopTrips.has(s)) stopTrips.set(s, []);
        stopTrips.get(s).push([tr, i]);
        if (!stopRoutes.has(s)) stopRoutes.set(s, new Set());
        stopRoutes.get(s).add(tr.route);
      });
    }

    const services = new Map();
    {
      const t = table("calendar.txt");
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((c) => col(t, c));
      const [id, from, to] = ["service_id", "start_date", "end_date"].map((c) => col(t, c));
      for (const r of t.rows) services.set(r[id], { days: days.map((d) => r[d] === "1"), from: r[from], to: r[to] });
    }
    const exceptions = new Map();
    {
      const t = table("calendar_dates.txt");
      const [id, date, type] = ["service_id", "date", "exception_type"].map((c) => col(t, c));
      for (const r of t.rows) {
        if (!exceptions.has(r[date])) exceptions.set(r[date], { add: new Set(), remove: new Set() });
        exceptions.get(r[date])[r[type] === "1" ? "add" : "remove"].add(r[id]);
      }
    }

    net = { stops, groups, routes, trips, stopTrips, stopRoutes, services, exceptions };
    return net;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

// Services en circulation un jour donné ("YYYY-MM-DD").
function activeServices(n, day) {
  const key = day.replace(/-/g, "");
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
  const active = new Set();
  for (const [id, s] of n.services) if (s.days[dow] && s.from <= key && key <= s.to) active.add(id);
  const ex = n.exceptions.get(key);
  if (ex) {
    for (const id of ex.add) active.add(id);
    for (const id of ex.remove) active.delete(id);
  }
  return active;
}

// Décalage à appliquer aux horaires d'une course pour le jour demandé : les courses d'après minuit
// (25:10:00) appartiennent au service de la veille.
function offsetFor(n, day) {
  const todaySvc = activeServices(n, day);
  const yesterdaySvc = activeServices(n, addDays(day, -1));
  return (trip) => (todaySvc.has(trip.service) ? 0 : yesterdaySvc.has(trip.service) && trip.times[trip.times.length - 1] >= 86400 ? -86400 : null);
}

const lineOf = (n, routeId) => {
  const r = n.routes.get(routeId) || {};
  return { name: r.short || routeId, color: r.color || "#666666", tram: !!r.tram };
};

function platformsNear(n, point, radius = WALK_RADIUS) {
  const near = new Map();
  for (const s of n.stops.values()) {
    const d = distance(point, s);
    if (d <= radius && n.stopTrips.has(s.id)) near.set(s.id, d);
  }
  return near;
}

// Arrêts proches d'un point, quais regroupés par nom, avec les lignes qui y passent.
async function nearby(point, { radius = 600, max = 4 } = {}) {
  const n = await load();
  const byGroup = new Map();
  for (const [id, d] of platformsNear(n, point, radius)) {
    const s = n.stops.get(id);
    const g = byGroup.get(s.group) || { name: s.name, distance: d, lat: s.lat, lng: s.lng, routes: new Set() };
    if (d < g.distance) Object.assign(g, { distance: d, lat: s.lat, lng: s.lng });
    for (const r of n.stopRoutes.get(id) || []) g.routes.add(r);
    byGroup.set(s.group, g);
  }
  return [...byGroup.values()]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, max)
    .map((g) => ({
      name: g.name,
      distance: Math.round(g.distance),
      lat: g.lat,
      lng: g.lng,
      lines: [...g.routes].map((r) => lineOf(n, r)).sort((a, b) => b.tram - a.tram || a.name.localeCompare(b.name, "fr", { numeric: true })),
    }));
}

// Version synchrone pour étiqueter des centaines d'événements une fois le réseau chargé.
function nearestStop(point) {
  if (!net) return null;
  let best = null;
  for (const s of net.stops.values()) {
    if (Math.abs(s.lat - point.lat) > 0.008 || Math.abs(s.lng - point.lng) > 0.012) continue;
    if (!net.stopRoutes.has(s.id)) continue;
    const d = distance(point, s);
    if (!best || d < best.d) best = { s, d };
  }
  if (!best || best.d > 800) return null;
  const routes = new Set();
  for (const id of net.groups.get(best.s.group)) for (const r of net.stopRoutes.get(id) || []) routes.add(r);
  const lines = [...routes].map((r) => lineOf(net, r)).sort((a, b) => b.tram - a.tram || a.name.localeCompare(b.name, "fr", { numeric: true }));
  return { name: best.s.name, distance: Math.round(best.d), lines: lines.slice(0, 6), tram: lines.some((l) => l.tram) };
}

let rtCache = { at: 0, byTrip: new Map() };
async function realtime() {
  if (Date.now() - rtCache.at < 20000) return rtCache.byTrip;
  try {
    const feed = GtfsRt.transit_realtime.FeedMessage.decode(await get(RT_URL, { as: "buffer", timeout: 8000, retries: 0 }));
    const byTrip = new Map();
    for (const entity of feed.entity) {
      const tu = entity.tripUpdate;
      if (!tu?.trip?.tripId) continue;
      const stopsMap = new Map();
      for (const u of tu.stopTimeUpdate || []) {
        const t = u.departure?.time ?? u.arrival?.time;
        if (t != null) stopsMap.set(u.stopId, Number(t));
      }
      byTrip.set(tu.trip.tripId, stopsMap);
    }
    rtCache = { at: Date.now(), byTrip };
  } catch {
    rtCache = { at: Date.now() - 10000, byTrip: rtCache.byTrip }; // flux indisponible : on retente dans 10 s
  }
  return rtCache.byTrip;
}

function leg(n, trip, i, j, offset) {
  return {
    line: lineOf(n, trip.route),
    headsign: trip.headsign,
    from: n.stops.get(trip.stops[i]).name,
    to: n.stops.get(trip.stops[j]).name,
    dep: trip.times[i] + offset,
    arr: trip.times[j] + offset,
    stops: j - i,
    tripId: trip.id,
    fromStopId: trip.stops[i],
  };
}

// Itinéraires entre deux points pour un jour donné, départs compris entre t0 et t1 (secondes depuis minuit).
function search(n, from, to, day, t0, t1) {
  const A = platformsNear(n, from);
  const B = platformsNear(n, to);
  const offset = offsetFor(n, day);

  // toutes les façons d'atteindre un arrêt d'arrivée, indexées par arrêt de montée
  const toB = new Map();
  for (const [bId, dB] of B) {
    for (const [trip, iB] of n.stopTrips.get(bId) || []) {
      const o = offset(trip);
      if (o == null) continue;
      const arr = trip.times[iB] + o;
      if (arr < t0 || arr > t1 + 5400) continue;
      for (let i = 0; i < iB; i++) {
        const g = n.stops.get(trip.stops[i]).group;
        if (!toB.has(g)) toB.set(g, []);
        toB.get(g).push({ trip, i, iB, o, dep: trip.times[i] + o, total: arr + walkSeconds(dB), walkB: dB });
      }
    }
  }
  for (const list of toB.values()) list.sort((a, b) => a.dep - b.dep);

  const found = [];
  for (const [aId, dA] of A) {
    for (const [trip, iA] of n.stopTrips.get(aId) || []) {
      const o = offset(trip);
      if (o == null) continue;
      const dep = trip.times[iA] + o;
      if (dep < t0 + walkSeconds(dA) || dep > t1) continue;

      let direct = null;
      for (let j = iA + 1; j < trip.stops.length; j++) {
        const dB = B.get(trip.stops[j]);
        if (dB == null) continue;
        const total = trip.times[j] + o + walkSeconds(dB);
        if (!direct || total < direct.total) direct = { j, total, walkB: dB };
      }
      if (direct) {
        found.push({ legs: [leg(n, trip, iA, direct.j, o)], walkA: dA, walkB: direct.walkB, arrive: direct.total });
        continue;
      }

      let best = null;
      for (let j = iA + 1; j < trip.stops.length; j++) {
        const list = toB.get(n.stops.get(trip.stops[j]).group);
        if (!list) continue;
        const ready = trip.times[j] + o + TRANSFER;
        const next = list.find((x) => x.dep >= ready && x.trip.route !== trip.route);
        if (next && (!best || next.total < best.next.total)) best = { j, next };
      }
      if (best) {
        const { next } = best;
        found.push({
          legs: [leg(n, trip, iA, best.j, o), leg(n, next.trip, next.i, next.iB, next.o)],
          walkA: dA,
          walkB: next.walkB,
          arrive: next.total,
        });
      }
    }
  }
  return found;
}

const signature = (it) => it.legs.map((l) => `${l.line.name}>${l.to}`).join("|");

// from/to : { lat, lng }. arriveBy : "YYYY-MM-DDTHH:mm" (heure de l'événement) ou rien pour « partir maintenant ».
async function plan({ from, to, arriveBy }) {
  const n = await load();
  const now = nowLocal();
  const crow = distance(from, to);
  const walk = { meters: Math.round(crow * 1.3), minutes: Math.round(walkSeconds(crow) / 60) };
  const nowSec = seconds(now.slice(11));

  // l'heure d'arrivée n'a de sens que si elle est dans le futur et couverte par le calendrier publié
  const useArrive = arriveBy && arriveBy.length > 10 && arriveBy > now;
  const day = useArrive ? arriveBy.slice(0, 10) : now.slice(0, 10);
  const target = useArrive ? seconds(arriveBy.slice(11)) : null;
  const covered = activeServices(n, day).size > 0;

  let options = [];
  if (covered) {
    const all = useArrive ? search(n, from, to, day, target - 6000, target) : search(n, from, to, day, nowSec, nowSec + 5400);
    // un même véhicule se prend à plusieurs arrêts voisins : on garde celui qui fait le moins marcher
    const byVehicle = new Map();
    for (const it of all) {
      const key = it.legs.map((l) => l.tripId).join("|");
      const kept = byVehicle.get(key);
      if (!kept || it.walkA + it.walkB < kept.walkA + kept.walkB) byVehicle.set(key, it);
    }
    const found = [...byVehicle.values()];
    const ranked = useArrive
      ? found.filter((it) => it.arrive <= target - 300).sort((a, b) => b.legs[0].dep - a.legs[0].dep || a.legs.length - b.legs.length)
      : found.sort((a, b) => a.arrive - b.arrive || a.legs.length - b.legs.length);

    const perSignature = new Map();
    const direct = ranked.find((it) => it.legs.length === 1);
    const leave = (it) => it.legs[0].dep - walkSeconds(it.walkA);
    for (const it of ranked) {
      // une correspondance n'est proposée que si elle fait gagner au moins 5 min sur le meilleur direct
      if (direct && it.legs.length > 1) {
        const gain = useArrive ? leave(it) - leave(direct) : direct.arrive - it.arrive;
        if (gain < 300) continue;
      }
      const count = perSignature.get(signature(it)) || 0;
      if (count >= 2) continue;
      perSignature.set(signature(it), count + 1);
      options.push(it);
      if (options.length >= 4) break;
    }
  }

  const live = !useArrive && options.length ? await realtime() : null;
  const dayStart = Date.parse(`${day}T00:00:00Z`) / 1000;
  const parisOffset = () => {
    // secondes à retrancher d'un "minuit UTC" pour obtenir minuit à Paris ce jour-là
    const noonUtc = new Date(`${day}T12:00:00Z`);
    const parisHour = +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(noonUtc);
    return (parisHour - 12) * 3600;
  };

  const out = options.map((it) => {
    const first = it.legs[0];
    let dep = first.dep;
    let realtimeDep = false;
    const rt = live?.get(first.tripId)?.get(first.fromStopId);
    if (rt) {
      dep = rt - (dayStart - parisOffset());
      realtimeDep = true;
    }
    const leaveAt = dep - walkSeconds(it.walkA);
    return {
      legs: it.legs.map((l) => ({ line: l.line, headsign: l.headsign, from: l.from, to: l.to, dep: clock(l.dep), arr: clock(l.arr), stops: l.stops })),
      depart: clock(dep),
      realtime: realtimeDep,
      delayMin: realtimeDep ? Math.round((dep - first.dep) / 60) : 0,
      inMin: useArrive ? null : Math.max(0, Math.round((dep - nowSec) / 60)),
      leaveAt: clock(leaveAt),
      arrive: clock(it.arrive + (realtimeDep ? dep - first.dep : 0)),
      walkToStop: Math.round(it.walkA * 1.3),
      walkFromStop: Math.round(it.walkB * 1.3),
      duration: Math.round((it.arrive - leaveAt) / 60),
    };
  });

  return {
    mode: useArrive ? "arriveBy" : "now",
    day,
    target: useArrive ? arriveBy.slice(11) : null,
    covered,
    walk,
    options: out,
    stopsFrom: await nearby(from, { max: 3 }),
    stopsTo: await nearby(to, { max: 3 }),
  };
}

module.exports = { load, nearby, nearestStop, plan };
