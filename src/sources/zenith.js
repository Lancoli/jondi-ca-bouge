// Zénith de Dijon : API REST WordPress publique, les séances sont dans acf.sessions.
const { get } = require("../lib/http");
const { nowLocal } = require("../lib/dates");
const { clean } = require("../lib/text");

const FIELDS = "id,link,title,class_list,acf.sessions,acf.subtitle,acf.price_start,acf.image_cover.url,acf.event_description,acf.about_us.description";

module.exports = {
  id: "zenith",
  name: "Zénith de Dijon",
  site: "https://www.zenith-dijon.fr/evenements/",
  kind: "Salle · API",
  async fetch() {
    const now = nowLocal();
    const events = [];
    for (let page = 1; page <= 6; page++) {
      let batch;
      try {
        batch = await get(`https://www.zenith-dijon.fr/wp-json/wp/v2/event?per_page=100&page=${page}&_fields=${FIELDS}`, { as: "json" });
      } catch (err) {
        if (page === 1) throw err;
        break; // au-delà de la dernière page, WordPress répond 400
      }
      for (const p of batch) {
        const acf = p.acf || {};
        const occurrences = (acf.sessions || [])
          .filter((s) => s.session_date && s.status_event !== "canceled")
          .map((s) => ({ start: s.session_date.slice(0, 16).replace(" ", "T") }))
          .filter((o) => o.start >= now)
          .sort((a, b) => a.start.localeCompare(b.start));
        if (!occurrences.length) continue;
        const type = (p.class_list || []).find((c) => c.startsWith("type-") && c !== "type-event");
        events.push({
          title: clean(p.title?.rendered),
          url: p.link,
          start: occurrences[0].start,
          occurrences,
          venue: /annexe/i.test(acf.subtitle || "") ? "Zénith de Dijon – L'Annexe" : "Zénith de Dijon",
          address: "Rue de Colchide, 21000 Dijon",
          city: "Dijon",
          tags: [type ? type.replace("type-", "") : "concert"],
          price: acf.price_start ? `À partir de ${acf.price_start} €` : null,
          image: acf.image_cover?.url || null,
          description: [clean(acf.about_us?.description), clean(acf.event_description)].filter(Boolean).join("\n\n"),
        });
      }
      if (batch.length < 100) break;
    }
    return events;
  },
};
