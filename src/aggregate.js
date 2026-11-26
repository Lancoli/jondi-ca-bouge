// Lance toutes les sources en parallèle, isole les pannes (une source cassée n'empêche pas les autres),
// puis normalise, géocode, dédoublonne et écrit data/events.json.
const fs = require("fs");
const path = require("path");
const sources = require("./sources");
const jondi = require("./sources/jondi");
const { shape, dedupe, finalize, unifyVenues } = require("./normalize");
const { enrich } = require("./enrich");
const { geocodeEvents } = require("./geocode");
const { openCache, DATA_DIR } = require("./lib/cache");
const { DIJON, distance } = require("./lib/geo");

const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const MAX_KM = 45; // au-delà, ce n'est plus « à Dijon »

// Une source peut fixer son propre rythme (`every`, en secondes) : entre deux relevés, on resert le
// dernier résultat gardé sur disque au lieu de solliciter le site à chaque passage.
async function runSource(source, ctx) {
  const started = Date.now();
  const kept = source.every ? ctx.raw.get(`source:${source.id}`) : null;
  if (kept) return { source, raw: kept.raw, ms: 0, cachedAt: kept.at };
  try {
    const raw = (await source.fetch(ctx)) || [];
    if (source.every && raw.length) {
      const kept = { raw, at: new Date().toISOString() };
      ctx.raw.set(`source:${source.id}`, kept, source.every);
      ctx.raw.set(`last:${source.id}`, kept); // sans échéance : sert de secours si le site ne répond plus
    }
    return { source, raw, ms: Date.now() - started };
  } catch (err) {
    // en cas de panne, mieux vaut le dernier relevé connu que rien
    const last = source.every ? ctx.raw.get(`last:${source.id}`) : null;
    return last ? { source, raw: last.raw, ms: Date.now() - started, cachedAt: last.at } : { source, raw: [], error: err.message, ms: Date.now() - started };
  }
}

// Le répertoire des lieux change peu : un relevé par semaine suffit.
async function venues(ctx) {
  const kept = ctx.raw.get("venues");
  if (kept) return kept;
  const list = await jondi.fetchVenues().catch(() => []);
  if (list.length) ctx.raw.set("venues", list, 7 * 86400);
  return list;
}

async function aggregate({ only } = {}) {
  const detailCache = openCache("details");
  const geoCache = openCache("geocache");
  const rawCache = openCache("raw");
  const ctx = { cache: detailCache, raw: rawCache };
  const active = only ? sources.filter((s) => only.includes(s.id)) : sources;

  const [results, gazetteer] = await Promise.all([
    Promise.all(active.map((s) => runSource(s, ctx))),
    venues(ctx),
  ]);
  detailCache.save();
  rawCache.save();

  const shaped = [];
  const report = [];
  for (const r of results) {
    const ok = r.raw.map((e) => shape(e, r.source)).filter(Boolean);
    shaped.push(...ok);
    report.push({
      id: r.source.id,
      name: r.source.name,
      site: r.source.site,
      kind: r.source.kind,
      fetched: r.raw.length,
      error: r.error || (r.raw.length ? null : "aucun événement renvoyé"),
      cachedAt: r.cachedAt || undefined,
      ms: r.ms,
    });
  }

  await geocodeEvents(shaped, { gazetteer, cache: geoCache });

  unifyVenues(shaped);
  const merged = dedupe(shaped);
  await enrich(merged, detailCache);

  const events = merged
    .map(finalize)
    .filter(Boolean)
    .filter((e) => e.lat == null || distance(DIJON, e) <= MAX_KM * 1000)
    .sort((a, b) => a.start.localeCompare(b.start));

  for (const r of report) r.kept = events.filter((e) => e.sources.some((s) => s.id === r.id)).length;

  const payload = { generatedAt: new Date().toISOString(), sources: report, events };
  if (!only) {
    // un passage vide (réseau coupé, sites en panne) ne remplace pas le dernier relevé utile
    if (!events.length && readCached()?.events?.length) {
      throw new Error(`aucun événement relevé (${report.filter((r) => r.error).length} sources en échec) : dernier relevé conservé`);
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(payload));
  }
  return payload;
}

function readCached() {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
  } catch {
    return null;
  }
}

module.exports = { aggregate, readCached };

// Usage : node src/aggregate.js            -> scrape complet
//         node src/aggregate.js --only bm  -> une seule source, avec un aperçu (rien n'est écrit)
if (require.main === module) {
  const i = process.argv.indexOf("--only");
  const only = i > 0 ? process.argv[i + 1].split(",") : null;
  aggregate({ only }).then((p) => {
    console.table(p.sources.map(({ id, fetched, kept, ms, error }) => ({ id, fetched, kept, ms, error: error || "" })));
    console.log(`${p.events.length} événements à venir, ${p.events.filter((e) => e.lat != null).length} géolocalisés`);
    if (only) for (const e of p.events.slice(0, 6)) console.log(JSON.stringify(e, null, 1));
  });
}
