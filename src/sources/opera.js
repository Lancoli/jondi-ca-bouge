// Opéra de Dijon : calendrier de saison en HTML, paginé (jour + mois, sans année ni heure).
const cheerio = require("cheerio");
const { get } = require("../lib/http");
const { pad, monthNumber, seasonYear, currentSeasonStart } = require("../lib/dates");
const { clean, absolute } = require("../lib/text");
const { strip } = require("../categories");

const VENUES = {
  auditorium: { venue: "Auditorium de Dijon", address: "11 boulevard de Verdun, 21000 Dijon" },
  "grand theatre": { venue: "Grand Théâtre de Dijon", address: "Place du Théâtre, 21000 Dijon" },
};

module.exports = {
  id: "opera",
  name: "Opéra de Dijon",
  site: "https://opera-dijon.fr/fr/au-programme/calendrier/",
  kind: "Salle",
  async fetch() {
    const season = currentSeasonStart();
    const url = `https://opera-dijon.fr/fr/au-programme/calendrier/saison-${String(season).slice(2)}-${String(season + 1).slice(2)}/`;
    const events = [];
    const seen = new Set();

    for (let page = 1; page <= 12; page++) {
      let html;
      try {
        html = await get(page === 1 ? url : `${url}?&page=${page}`);
      } catch (err) {
        if (page === 1) throw err;
        break;
      }
      const $ = cheerio.load(html);
      const day = (node) => {
        const d = parseInt(node.find(".date_nombre").text(), 10);
        const m = monthNumber(node.find(".mois").text().trim());
        return d && m ? `${seasonYear(m, season)}-${pad(m)}-${pad(d)}` : null;
      };
      const before = seen.size;
      $(".bloc_spectacle").each((_, el) => {
        const bloc = $(el);
        const link = bloc.find("h2 a").first();
        const start = day(bloc.find(".jour_debut"));
        const href = link.attr("href");
        if (!start || !href || seen.has(href)) return;
        seen.add(href);
        const lieu = clean(bloc.find(".lieu_texte").html());
        const place = VENUES[strip(lieu)] || { venue: lieu ? `Opéra de Dijon – ${lieu}` : "Opéra de Dijon" };
        const bg = (bloc.attr("style") || "").match(/url\(([^)]+)\)/);
        events.push({
          title: clean(link.html()),
          url: absolute(href, url),
          start,
          end: day(bloc.find(".jour_fin")),
          ...place,
          city: "Dijon",
          tags: [clean(bloc.find(".text_goutte").html())].filter(Boolean),
          image: bg ? absolute(bg[1].replace(/['"]/g, ""), url) : null,
          description: clean(bloc.find(".titre_auteur .H2").html()),
        });
      });
      if (seen.size === before) break;
    }
    return events;
  },
};
