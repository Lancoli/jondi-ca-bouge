// Université Bourgogne Europe: symposia, lectures, openings. Administrative deadlines are left out.
const cheerio = require("cheerio");
const { get } = require("../lib/http");
const { pad, today, addDays } = require("../lib/dates");
const { clean } = require("../lib/text");

const URL = "https://www.ube.fr/all-events/";
const ADMIN = /candidature|inscription|bourse|appel à|examen|d[ée]p[oô]t de dossier|campagne/i;

module.exports = {
  id: "ube",
  name: "Université Bourgogne Europe",
  site: URL,
  kind: "Campus",
  async fetch() {
    const t = today();
    const year = +t.slice(0, 4);
    // "du 12.10" without a year: take the occurrence closest to today
    const toDay = (s) => {
      const m = String(s).match(/(\d{1,2})\.(\d{1,2})/);
      if (!m) return null;
      const d = `${year}-${pad(+m[2])}-${pad(+m[1])}`;
      const guess = d < addDays(t, -120) ? `${year + 1}${d.slice(4)}` : d;
      return guess <= addDays(t, 150) ? guess : null; // further away: it is last year's archive
    };
    const events = [];
    for (let page = 1; page <= 1; page++) {
      let html;
      try {
        html = await get(page === 1 ? URL : `${URL}page/${page}/`);
      } catch (err) {
        if (page === 1) throw err;
        break;
      }
      const $ = cheerio.load(html);
      const before = events.length;
      $("a.eventLink").each((_, el) => {
        const card = $(el);
        const title = clean(card.find(".eventTitle").html());
        const dates = card.find(".eventStartDate").map((_, d) => toDay($(d).text())).get();
        const venue = clean(card.find(".eventLocation").html());
        if (!title || !dates[0] || ADMIN.test(title) || /teams|visio|en ligne|online|zoom/i.test(venue)) return;
        events.push({
          title,
          url: card.attr("href"),
          start: dates[0],
          end: dates[1] && dates[1] > dates[0] ? dates[1] : null,
          venue: venue || "Campus de Dijon",
          city: "Dijon",
          tags: ["campus"],
          fallback: "conference",
        });
      });
      if (events.length === before && page > 1) break;
    }
    return events;
  },
};
