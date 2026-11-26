// Office de tourisme de Dijon Métropole : « tout l'agenda » (fêtes, marchés, visites, y compris autour de Dijon).
const cheerio = require("cheerio");
const { get, pmap } = require("../lib/http");
const { today, parseFrDate } = require("../lib/dates");
const { clean } = require("../lib/text");

const URL = "https://www.destinationdijon.com/pratique/sortir/tout-lagenda/";
const PAGES = 8;

const titleCase = (slug) =>
  String(slug || "").split("-").map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join("-");

module.exports = {
  id: "otdijon",
  name: "Office de tourisme",
  site: URL,
  kind: "Tourisme",
  async fetch() {
    const urls = Array.from({ length: PAGES }, (_, i) => (i ? `${URL}page/${i + 1}/` : URL));
    const pages = await pmap(urls, 3, (u) => get(u));
    if (!pages[0]) throw new Error("page agenda illisible");
    const t = today();
    const seen = new Set();
    const events = [];
    for (const html of pages) {
      if (!html) continue;
      const $ = cheerio.load(html);
      $(".wpetOffer").each((_, el) => {
        const card = $(el);
        const link = card.find(".wpetOfferContentTitle a").first();
        const url = link.attr("href");
        if (!url || seen.has(url)) return;
        seen.add(url);
        // "Jusqu'au 31 décembre 2026", "Le 10 octobre 2026", "Du 9 au 11 octobre 2026"
        const when = clean(card.find(".wpetOfferDate").html());
        let start, end = null;
        const range = when.match(/du\s+(.+?)\s+au\s+(.+)/i);
        if (/jusqu/i.test(when)) {
          start = t;
          end = parseFrDate(when);
        } else if (range) {
          end = parseFrDate(range[2]);
          start = parseFrDate(/[a-zéû]{3,}/i.test(range[1]) ? range[1] : `${range[1]} ${range[2].replace(/^\d+\s*/, "")}`);
        } else start = parseFrDate(when);
        if (!start) return;
        events.push({
          title: clean(link.html()),
          url,
          start,
          end,
          city: titleCase(clean(card.find(".wpetOfferContentMetaLocation").html())) || null,
          tags: ["tourisme"],
          image: card.find("img").attr("src") || null,
        });
      });
    }
    return events;
  },
};
