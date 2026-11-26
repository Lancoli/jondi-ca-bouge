// Itinéraires sur le réseau de rues OpenStreetMap, via le serveur Valhalla public de FOSSGIS.
// Usage raisonnable demandé : un appel par mode et par fiche ouverte, mis en cache 10 min.
const { get } = require("../lib/http");

const URL = "https://valhalla1.openstreetmap.de/route";
const cache = new Map();
const TTL = 10 * 60 * 1000;
const key = (costing, a, b) => `${costing}|${a.lat.toFixed(5)},${a.lng.toFixed(5)}|${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;

// Renvoie { seconds, meters, shape } ou null : pas de chiffre inventé si le serveur ne trouve rien.
async function route(costing, from, to) {
  const k = key(costing, from, to);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const body = {
    locations: [{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }],
    costing,
    directions_options: { units: "km" },
    narrative: false,
  };
  let value = null;
  try {
    const data = await get(`${URL}?json=${encodeURIComponent(JSON.stringify(body))}`, {
      as: "json",
      timeout: 12000,
      retries: 0,
      headers: { "User-Agent": "JondiCaBouge/0.1 (agenda local, usage personnel)" },
    });
    const s = data?.trip?.summary;
    if (s && Number.isFinite(s.time)) value = { seconds: Math.round(s.time), meters: Math.round(s.length * 1000), shape: data.trip.legs?.[0]?.shape || null };
  } catch {
    value = null;
  }
  cache.set(k, { at: Date.now(), value });
  return value;
}

module.exports = { route };
