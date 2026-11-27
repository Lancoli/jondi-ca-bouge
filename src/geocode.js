// Gives coordinates to events without any: venue gazetteer (Jondi), then Base Adresse Nationale.
const { get, pmap } = require("./lib/http");
const { DIJON, distance } = require("./lib/geo");
const { strip } = require("./categories");

const BAN = "https://data.geopf.fr/geocodage/search";
const slug = (s) => strip(s).replace(/[^a-z0-9]+/g, " ").trim();
const STREET = /\b(rue|avenue|av|boulevard|bd|place|quai|cours|chemin|all[ée]e|impasse|esplanade|parvis|route|square|passage)\b/i;

async function ban(q, { municipality = false } = {}) {
  const url = `${BAN}?q=${encodeURIComponent(q.slice(0, 180))}&limit=1&lat=${DIJON.lat}&lon=${DIJON.lng}${municipality ? "&type=municipality" : ""}`;
  const data = await get(url, { as: "json", timeout: 12000 });
  const f = data.features?.[0];
  if (!f || (f.properties.score ?? 0) < 0.45) return null;
  const [lng, lat] = f.geometry.coordinates;
  // a result more than 60 km from Dijon is a namesake, not our place
  if (distance(DIJON, { lat, lng }) > 60000) return null;
  return { lat, lng, label: f.properties.label };
}

// Places known only by name ("Espace Mendès-France"): OpenStreetMap, bounded to the metro area.
// Nominatim asks for an identifiable agent and at most one request per second: we stick to it, with a
// small quota per run; the cache does the rest over the refreshes.
const OSM = "https://nominatim.openstreetmap.org/search";
const OSM_BUDGET = 20;
const VAGUE = /^(hors les murs|musees de dijon|dijon|centre ville|centre ville de dijon|online|parking|campus de dijon)$/;

async function osm(name) {
  const url = `${OSM}?format=jsonv2&limit=1&bounded=1&viewbox=4.85,47.43,5.25,47.22&q=${encodeURIComponent(name.slice(0, 120))}`;
  const data = await get(url, { as: "json", timeout: 12000, retries: 0, headers: { "User-Agent": "JondiCaBouge/0.1 (agenda local, usage personnel)" } });
  const hit = data?.[0];
  return hit && sameName(name, hit.name) ? { lat: +hit.lat, lng: +hit.lon, label: hit.display_name } : null;
}

// A wrong position is worse than a missing one (it would confidently give a wrong trip):
// a result is accepted only if its name really matches the place searched for.
const HOLLOW = new Set(["les", "des", "une", "aux", "sur", "dijon"]);
const WRONG_KIND = new Set(["residence", "rue", "avenue", "boulevard", "impasse", "allee", "chemin"]);
function sameName(wanted, found) {
  const words = (s) => slug(s).split(" ").filter((w) => w.length >= 3 && !HOLLOW.has(w));
  const a = words(wanted);
  const b = words(found);
  if (!a.length || !b.length || !a.some((w) => w.length >= 5)) return false;
  const extra = (big, small) => (small.every((w) => big.includes(w)) ? big.filter((w) => !small.includes(w)) : null);
  const more = extra(b, a); // the result narrows the place: "Lycée polyvalent Hippolyte Fontaine"
  if (more) return more.length <= 2 && !more.some((w) => WRONG_KIND.has(w));
  const less = extra(a, b); // the searched place narrows the result: "Université … Bâtiment Sciences Gabriel"
  return !!less && b.length >= 2;
}

// Address search for the interface (home autocomplete).
async function suggest(q) {
  const url = `${BAN}?q=${encodeURIComponent(q.slice(0, 180))}&limit=6&autocomplete=1&lat=${DIJON.lat}&lon=${DIJON.lng}`;
  const data = await get(url, { as: "json", timeout: 10000 });
  return (data.features || []).map((f) => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
  }));
}

async function geocodeEvents(events, { gazetteer = [], cache }) {
  const byName = new Map(gazetteer.map((v) => [slug(v.name), v]));
  const lookupVenue = (name) => {
    const key = slug(name);
    if (!key) return null;
    if (byName.has(key)) return byName.get(key);
    if (key.length < 8) return null;
    // "Musée des Beaux-Arts de Dijon" must find "Musée des Beaux-Arts"
    for (const [k, v] of byName) if (k.length >= 8 && (key.startsWith(k) || k.startsWith(key))) return v;
    return null;
  };

  const pending = new Map();
  const byVenue = new Map();
  for (const e of events) {
    if (Number.isFinite(e.lat) && Number.isFinite(e.lng)) continue;
    const known = lookupVenue(e.venue);
    if (known) {
      e.lat = known.lat;
      e.lng = known.lng;
      continue;
    }
    // some sources put the address in place of the venue name
    const street = e.address && STREET.test(e.address) ? e.address : e.venue && STREET.test(e.venue) && /\d/.test(e.venue) ? `${e.venue}, ${e.city || "Dijon"}` : null;
    const hasStreet = !!street;
    const q = street || (!e.venue && e.city ? e.city : null);
    if (!q) {
      const key = slug(e.venue);
      if (key && !VAGUE.test(key)) {
        if (!byVenue.has(key)) byVenue.set(key, { name: e.venue, events: [] });
        byVenue.get(key).events.push(e);
      }
      continue;
    }
    const key = `${hasStreet ? "a" : "m"}:${slug(q)}`;
    if (!pending.has(key)) pending.set(key, { q, municipality: !hasStreet, events: [] });
    pending.get(key).events.push(e);
  }

  await pmap([...pending.entries()], 4, async ([key, job]) => {
    let hit = cache.get(key);
    if (hit === undefined) {
      hit = await ban(job.q, { municipality: job.municipality }).catch(() => undefined);
      if (hit !== undefined) cache.set(key, hit, hit ? 0 : 7 * 86400);
    }
    if (!hit) return;
    for (const e of job.events) {
      e.lat = hit.lat;
      e.lng = hit.lng;
      if (job.municipality) e.approxGeo = true;
    }
  });

  let budget = OSM_BUDGET;
  for (const [key, job] of byVenue) {
    let hit = cache.get(`o:${key}`);
    if (hit === undefined && budget > 0) {
      budget--;
      hit = await osm(job.name).catch(() => undefined);
      if (hit !== undefined) cache.set(`o:${key}`, hit, hit ? 0 : 14 * 86400);
      await new Promise((r) => setTimeout(r, 1100));
    }
    if (hit) for (const e of job.events) Object.assign(e, { lat: hit.lat, lng: hit.lng });
  }
  cache.save();
}

module.exports = { geocodeEvents, suggest, slug, sameName };
