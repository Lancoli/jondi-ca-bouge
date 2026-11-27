// OpenAgenda, through OpenDataSoft's public "evenements-publics-openagenda" dataset (no API key).
// Covers the agendas of many organisations: non-profits, libraries, national festivals held in Dijon…
const { get } = require("../lib/http");
const { toLocal, today } = require("../lib/dates");
const { clean } = require("../lib/text");

const BASE =
  "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/records";

const list = (v) =>
  Array.isArray(v) ? v : String(v || "").split(/[;,]/).map((s) => s.trim()).filter(Boolean);

module.exports = {
  id: "openagenda",
  name: "OpenAgenda",
  site: "https://openagenda.com",
  kind: "API open data",
  async fetch() {
    const where = `within_distance(location_coordinates, geom'POINT(5.0415 47.3220)', 14km) and lastdate_end >= '${today()}'`;
    const out = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const url = `${BASE}?where=${encodeURIComponent(where)}&order_by=firstdate_begin&limit=100&offset=${offset}`;
      const data = await get(url, { as: "json" });
      for (const r of data.results || []) {
        let occurrences = [];
        try {
          occurrences = JSON.parse(r.timings || "[]")
            .map((t) => ({ start: toLocal(t.begin), end: toLocal(t.end) }))
            .filter((o) => o.start);
        } catch {
          /* unreadable timings: keep the overall range */
        }
        const conditions = clean(r.conditions_fr);
        out.push({
          title: r.title_fr,
          url: r.canonicalurl,
          start: toLocal(r.firstdate_begin),
          end: toLocal(r.lastdate_end),
          occurrences,
          venue: r.location_name,
          address: r.location_address,
          city: r.location_city,
          lat: r.location_coordinates?.lat,
          lng: r.location_coordinates?.lon,
          tags: list(r.keywords_fr),
          price: conditions || null,
          free: /gratuit|entr[ée]e libre|libre participation/i.test(conditions) ? true : null,
          image: r.image || r.thumbnail,
          description: clean(r.description_fr) || clean(r.longdescription_fr),
          via: r.originagenda_title,
        });
      }
      if (offset + 100 >= (data.total_count || 0)) break;
    }
    return out;
  },
};
