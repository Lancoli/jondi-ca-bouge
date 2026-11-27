// Le Cèdre (Chenôve): the date is spelled out in full in each show's title.
const cheerio = require("cheerio");
const { get } = require("../lib/http");
const { parseFrDate } = require("../lib/dates");
const { clean } = require("../lib/text");

const URL = "https://www.cedre.ville-chenove.fr/programmation-culturelle/";

module.exports = {
  id: "cedre",
  name: "Le Cèdre",
  site: URL,
  kind: "Salle",
  async fetch() {
    const $ = cheerio.load(await get(URL));
    const events = [];
    $("article.mix").each((_, el) => {
      const card = $(el);
      const link = card.find(".portfolio_title a").first();
      const dateText = clean(link.find(".date-artiste").html());
      const start = parseFrDate(dateText);
      if (!start) return;
      link.find(".date-artiste").remove();
      events.push({
        title: clean(link.html()),
        url: link.attr("href"),
        start,
        timeHint: true, // the time is written on the detail page, right after the date
        venue: "Le Cèdre",
        address: "9 Esplanade de la République, 21300 Chenôve",
        city: "Chenôve",
        tags: clean(card.find(".project_category").html()).split("/").map((s) => s.trim()).filter(Boolean),
        image: card.find("img").attr("src") || null,
      });
    });
    return events;
  },
};
