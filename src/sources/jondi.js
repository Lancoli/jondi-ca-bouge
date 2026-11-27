// Jondi.fr: a very rich local agenda (bars, concerts, workshops, car-boot sales…). One page per day.
// Its public venue API also serves as a gazetteer: venue name -> coordinates.
const cheerio = require("cheerio");
const { get, pmap } = require("../lib/http");
const { today, addDays } = require("../lib/dates");
const { clean } = require("../lib/text");

const DAYS = 21;

async function fetchVenues() {
  const venues = [];
  for (let page = 1; page <= 30; page++) {
    const batch = await get(`https://jondi.fr/wp-json/jondi-lieux/v1/venues?per_page=100&page=${page}`, { as: "json" });
    if (!Array.isArray(batch) || !batch.length) break;
    for (const v of batch) if (v.lat && v.lng) venues.push({ name: clean(v.title), lat: +v.lat, lng: +v.lng });
    if (batch.length < 100) break;
  }
  return venues;
}

module.exports = {
  id: "jondi",
  name: "Jondi",
  site: "https://jondi.fr",
  kind: "Agenda local",
  every: 12 * 3600, // two collections a day at most
  fetchVenues,
  async fetch() {
    const days = Array.from({ length: DAYS }, (_, i) => addDays(today(), i));
    const pages = await pmap(days, 3, (day) => get(`https://jondi.fr/evenements/${day}/`));
    const events = [];
    pages.forEach((html, i) => {
      if (!html) return;
      const day = days[i];
      const $ = cheerio.load(html);
      $("section.jondi-time-group").each((_, section) => {
        const slot = $(section).attr("data-time");
        $(section).find("article.jondi-list-card").each((_, el) => {
          const card = $(el);
          const url = card.find("a.jondi-event-card__link").attr("href");
          const title = clean(card.find(".jondi-list-title").html());
          if (!url || !title) return;
          // an occurrence's URL carries its date and time: /evenement/slug/2026-10-09/18-30-00/
          const m = url.match(/\/(\d{4}-\d{2}-\d{2})\/(\d{2})-(\d{2})-\d{2}\/?$/);
          const time = m ? `${m[2]}:${m[3]}` : /^\d{2}:\d{2}$/.test(slot) ? slot : null;
          const price = clean(card.find(".jondi-list-price").html());
          events.push({
            title,
            url,
            start: time ? `${day}T${time}` : day,
            venue: clean(card.find(".jondi-event-card__venue").html()) || null,
            tags: [clean(card.find(".jondi-list-category").html())].filter(Boolean),
            price: /voir le d[ée]tail/i.test(price) ? null : price || null,
            free: /gratuit|prix libre|entr[ée]e libre/i.test(price) ? true : null,
            image: card.find("img").attr("src") || null,
          });
        });
      });
    });
    return events;
  },
};
