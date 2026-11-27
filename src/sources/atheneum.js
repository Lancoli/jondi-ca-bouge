// Atheneum: the university's cultural centre, on campus (art-science exhibitions, concerts, residency showings).
const cheerio = require("cheerio");
const { get } = require("../lib/http");
const { parseFrDate } = require("../lib/dates");
const { clean } = require("../lib/text");

const URL = "https://atheneum.ube.fr/programmation-agenda/";

module.exports = {
  id: "atheneum",
  name: "Atheneum",
  site: URL,
  kind: "Salle",
  async fetch() {
    const $ = cheerio.load(await get(URL));
    const events = [];
    $(".kc-list-item-3").each((_, el) => {
      const card = $(el);
      const link = card.find(".post-title-alt a, h2 a").first();
      const dates = card.find("time.date_evenement").map((_, t) => parseFrDate($(t).text())).get();
      if (!dates[0] || !link.length) return;
      events.push({
        title: clean(link.html()).replace(/\s*🗓\s*/g, "").replace(/｜/g, " | "),
        url: link.attr("href"),
        start: dates[0],
        end: dates[1] || null,
        venue: "Atheneum",
        address: "Esplanade Erasme, 21000 Dijon",
        city: "Dijon",
        tags: ["campus"],
        image: card.find("img").attr("src") || null,
      });
    });
    return events;
  },
};
