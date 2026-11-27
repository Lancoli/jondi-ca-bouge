// City websites (dijon.fr, musees.dijon.fr): same WordPress theme, same card markup.
// The list gives the dates; time, place and price are on the detail page. At most DETAIL_MAX
// new pages are read per run, nearest first, and kept in cache: the site is not
// hammered and coverage fills up from run to run.
const cheerio = require("cheerio");
const { get, pmap } = require("../lib/http");
const { today, parseFrTime } = require("../lib/dates");
const { clean } = require("../lib/text");

const DETAIL_MAX = 140;

// The pages write places in capitals: "MUSEE DES BEAUX ARTS" -> "Musee des Beaux Arts".
const SMALL = new Set(["de", "des", "du", "la", "le", "les", "et", "à", "au", "aux", "en", "d", "l"]);
function calm(text) {
  if (!text || text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/[a-zà-ÿ]+/g, (w, i) => (i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
}

// "LE 1204 - CENTRE … - 12 Parvis de l'UNESCO - 21000 - Dijon" -> { venue, address, city }
// (museums variant: "MUSEE ARCHEOLOGIQUE, DIJON - 5 Rue Docteur Maret -,21000 - Dijon (ouverture…)")
function splitPlace(text) {
  const parts = clean(text)
    .replace(/\(ouverture[^)]*\)/i, "")
    .replace(/-\s*,/g, "- ")
    .split(/\s+-\s+/)
    .map((p) => calm(p.trim()))
    .filter(Boolean);
  const tidy = (name) => name.replace(/^[-\s]+/, "").replace(/,\s*dijon$/i, "").replace(/,\s*$/, "");
  const i = parts.findIndex((p) => /^\d{5}$/.test(p));
  if (i < 1) return { venue: tidy(parts.join(" - ")) };
  const city = parts[i + 1] || "Dijon";
  const street = parts[i - 1].replace(/^0\s+/, "");
  return {
    // without a venue name, the source only gives the address
    venue: i >= 2 ? tidy(parts.slice(0, i - 1).join(" - ")) : street,
    address: `${street}, ${parts[i]} ${city}`,
    city,
  };
}

async function readDetail(url) {
  const $ = cheerio.load(await get(url));
  const panel = $(".card-panel-event").first();
  const detail = {};
  panel.find("li").each((_, li) => {
    const text = clean($(li).html());
    if ($(li).find("address").length) detail.place = clean($(li).find("address").text());
    else if (/^(de|à)\s+\d{1,2}\s*h/i.test(text)) {
      const [from, to] = text.split(/\s+à\s+/);
      detail.time = parseFrTime(from);
      detail.endTime = to ? parseFrTime(to) : null;
    } else if (/gratuit|€|tarif|payant/i.test(text)) detail.price = text;
  });
  detail.description = clean($(".article-content").first().html()).slice(0, 600);
  return detail;
}

module.exports = function dijonWp({ id, name, site, listUrl, defaultVenue }) {
  return {
    id,
    name,
    site,
    kind: "Site institutionnel",
    async fetch(ctx) {
      const $ = cheerio.load(await get(listUrl, { timeout: 45000 }));
      const t = today();
      const events = [];
      $("article.card-event").each((_, el) => {
        const card = $(el);
        const from = card.find("time.date-from").attr("datetime");
        const to = card.find("time.date-to").attr("datetime");
        const url = card.find("a.stretched-link").attr("href") || card.find(".card-title a").attr("href");
        const title = clean(card.find(".card-title").html());
        if (!from || !url || !title) return;
        if ((to || from) < t) return;
        events.push({
          title,
          url,
          start: from,
          end: to && to !== from ? to : null,
          tags: card.find(".term").map((_, s) => $(s).text().trim()).get(),
          venue: clean(card.find(".taxo-museum").html()) || defaultVenue || null,
          image: card.find("img").attr("src") || null,
          description: clean(card.find(".card-text").html()),
        });
      });

      const byDate = [...events].sort((a, b) => a.start.localeCompare(b.start));
      let budget = DETAIL_MAX;
      const todo = byDate.filter((e) => ctx.cache.get(`detail:${e.url}`) || budget-- > 0);
      await pmap(todo, 4, async (e) => {
        const key = `detail:${e.url}`;
        let d = ctx.cache.get(key);
        if (!d) {
          d = await readDetail(e.url);
          ctx.cache.set(key, d, 5 * 86400);
        }
        if (d.time && !e.end) {
          e.end = d.endTime ? `${e.start}T${d.endTime}` : null;
          e.start = `${e.start}T${d.time}`;
        }
        // the place is cached raw and split here: a fix to the split applies to the whole cache
        const place = d.place ? splitPlace(d.place) : {};
        if (place.venue) e.venue = place.venue;
        if (place.address) e.address = place.address;
        if (place.city) e.city = place.city;
        if (d.price) {
          e.price = d.price;
          if (/gratuit/i.test(d.price)) e.free = true;
        }
        if (d.description && d.description.length > (e.description || "").length) e.description = d.description;
      });
      return events;
    },
  };
};
