// Adaptateur générique : toute page qui expose des événements schema.org en JSON-LD (Eventbrite, Meetup…).
const { get, pmap } = require("../lib/http");
const { toLocal } = require("../lib/dates");
const { jsonLd, clean } = require("../lib/text");
const { DIJON, distance } = require("../lib/geo");

// Les recherches « Dijon » de ces plateformes remontent aussi Paris ou la Belgique.
const LOCAL = /dijon|chen[oô]ve|talant|quetigny|longvic|fontaine-l[eè]s|marsannay|saint-apollinaire|chevigny/i;
function isLocal(e, postalCode) {
  if (Number.isFinite(e.lat) && Number.isFinite(e.lng)) return distance(DIJON, e) < 30000 && (!postalCode || /^21/.test(postalCode));
  return /^21/.test(postalCode || "") || LOCAL.test(e.city || "");
}

// "2026-10-13" reste un jour seul ; une date avec fuseau est ramenée à l'heure de Paris.
function ldDate(v) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) return toLocal(v);
  return String(v).slice(0, 16);
}

function fromLd(e) {
  const place = [].concat(e.location || []).find((l) => l && l["@type"] === "Place") || {};
  const addr = place.address || {};
  const offer = [].concat(e.offers || [])[0] || {};
  const price = offer.price ?? offer.lowPrice;
  return {
    title: clean(e.name),
    url: e.url,
    start: ldDate(e.startDate),
    end: ldDate(e.endDate),
    venue: clean(place.name) || null,
    address: typeof addr === "string" ? addr : [addr.streetAddress, addr.postalCode, addr.addressLocality].filter(Boolean).join(", "),
    city: addr.addressLocality || null,
    lat: place.geo ? +place.geo.latitude : undefined,
    lng: place.geo ? +place.geo.longitude : undefined,
    image: [].concat(e.image || [])[0]?.url || [].concat(e.image || [])[0] || null,
    description: clean(e.description),
    price: price != null && price !== "" ? (+price === 0 ? "Gratuit" : `${price} ${offer.priceCurrency || "€"}`) : null,
    free: price != null && price !== "" ? +price === 0 : null,
  };
}

module.exports = function jsonLdSource({ id, name, site, kind = "Billetterie", urls, tags = [] }) {
  return {
    id,
    name,
    site,
    kind,
    async fetch() {
      const pages = await pmap(urls, 2, (u) => get(u));
      const seen = new Set();
      const events = [];
      for (const html of pages) {
        if (!html) continue;
        for (const e of jsonLd(html, "Event")) {
          if (!e.url || !e.name || seen.has(e.url)) continue;
          seen.add(e.url);
          const event = fromLd(e);
          const place = [].concat(e.location || []).find((l) => l && l["@type"] === "Place") || {};
          if (isLocal(event, place.address?.postalCode)) events.push({ ...event, tags });
        }
      }
      if (!events.length && pages.every((p) => !p)) throw new Error("aucune page lisible");
      return events;
    },
  };
};
