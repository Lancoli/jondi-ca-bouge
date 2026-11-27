// Dijon municipal library: the portal exposes its agenda as RSS (the feed address is read from the home page).
const cheerio = require("cheerio");
const { get } = require("../lib/http");
const { clean, absolute } = require("../lib/text");

const HOME = "https://bm.dijon.fr/";
const day = (s) => {
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

module.exports = {
  id: "bm",
  name: "Bibliothèques de Dijon",
  site: HOME,
  kind: "Flux RSS",
  async fetch() {
    const home = await get(HOME);
    const feed = (home.match(/href="([^"]*SearchRss[^"]*)"/) || [])[1];
    if (!feed) throw new Error("flux RSS introuvable sur l'accueil");
    const $ = cheerio.load(await get(absolute(feed.replace(/&amp;/g, "&"), HOME)), { xmlMode: true });
    const events = [];
    $("item").each((_, el) => {
      const item = $(el);
      const body = cheerio.load(item.find("description").text());
      if (/annul[ée]/i.test(body(".session-short h4").text())) return;
      // "Le 10/10/2026 de 10:00 à 12:00" or "Du 01/10/2026 au 31/10/2026"
      const when = clean(body(".session-date").html());
      const days = [...when.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => day(m[0]));
      const times = [...when.matchAll(/\b(\d{2}):(\d{2})\b/g)].map((m) => `${m[1]}:${m[2]}`);
      if (!days[0]) return;
      const single = days.length === 1;
      const venue = clean(body(".location").html());
      events.push({
        title: clean(item.find("title").text()),
        url: item.find("link").text().trim(),
        start: single && times[0] ? `${days[0]}T${times[0]}` : days[0],
        end: single ? (times[1] ? `${days[0]}T${times[1]}` : null) : days[1],
        venue: venue || "Bibliothèque municipale de Dijon",
        city: "Dijon",
        tags: [clean(body(".event-category").text()), "bibliothèque"].filter(Boolean),
        free: true,
        price: "Gratuit",
        image: item.find("enclosure").attr("url") || null,
        description: clean(body(".abstract").html()),
      });
    });
    return events;
  },
};
