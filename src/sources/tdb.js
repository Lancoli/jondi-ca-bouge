// Théâtre Dijon Bourgogne (CDN) : saison paginée, dates au format "08.10 → 16.10".
const cheerio = require("cheerio");
const { get } = require("../lib/http");
const { pad, seasonYear, currentSeasonStart } = require("../lib/dates");
const { clean, absolute } = require("../lib/text");

const BASE = "https://www.tdb-cdn.com/la-saison?content_subsection=toute-la-saison";

module.exports = {
  id: "tdb",
  name: "Théâtre Dijon Bourgogne",
  site: BASE,
  kind: "Salle",
  async fetch() {
    const season = currentSeasonStart();
    const toDay = (s) => {
      const m = String(s).match(/(\d{1,2})\.(\d{1,2})/);
      return m ? `${seasonYear(+m[2], season)}-${pad(+m[2])}-${pad(+m[1])}` : null;
    };
    const events = [];
    const seen = new Set();
    for (let page = 1; page <= 10; page++) {
      const $ = cheerio.load(await get(`${BASE}&page=${page}`));
      let added = 0;
      $(".preview").each((_, el) => {
        const card = $(el);
        const href = card.find("a").attr("href");
        const [from, to] = clean(card.find(".preview__infos__right__dates").html()).split("→");
        const start = toDay(from);
        if (!href || !start || seen.has(href)) return;
        seen.add(href);
        added++;
        events.push({
          title: clean(card.find("[class*='__title']").first().html()),
          url: absolute(href, BASE),
          start,
          end: to ? toDay(to) : null,
          venue: "Théâtre Dijon Bourgogne",
          address: "Rue Danton, 21000 Dijon",
          city: "Dijon",
          tags: [clean(card.find(".preview__infos__left__tag").html()) || "théâtre", "théâtre"],
          image: card.find("img").attr("src") || null,
        });
      });
      if (!added) break;
    }
    return events;
  },
};
