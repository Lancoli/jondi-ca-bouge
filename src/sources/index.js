// Source registry. To add one: a module { id, name, site, kind, fetch(ctx) } that returns
// raw events { title, url, start, end?, occurrences?, venue?, address?, city?, lat?, lng?, tags?, price?, free?, image?, description? }.
const dijonWp = require("./dijonwp");
const jsonLd = require("./jsonld");

module.exports = [
  require("./openagenda"),
  dijonWp({
    id: "dijonfr",
    name: "Ville de Dijon",
    site: "https://www.dijon.fr/toute-lactu-de-dijon/agenda/",
    listUrl: "https://www.dijon.fr/toute-lactu-de-dijon/agenda/",
  }),
  dijonWp({
    id: "musees",
    name: "Musées de Dijon",
    site: "https://musees.dijon.fr/agenda/",
    listUrl: "https://musees.dijon.fr/agenda/",
    defaultVenue: "Musées de Dijon",
  }),
  require("./jondi"),
  require("./dijoncter"),
  require("./bm"),
  require("./otdijon"),
  require("./zenith"),
  require("./vapeur"),
  require("./opera"),
  require("./tdb"),
  require("./cedre"),
  require("./atheneum"),
  require("./ube"),
  jsonLd({
    id: "eventbrite",
    name: "Eventbrite",
    site: "https://www.eventbrite.fr/d/france--dijon/all-events/",
    urls: [1, 2, 3].map((p) => `https://www.eventbrite.fr/d/france--dijon/all-events/?page=${p}`),
  }),
  jsonLd({
    id: "meetup",
    name: "Meetup",
    site: "https://www.meetup.com/fr-FR/find/?location=fr--Dijon&source=EVENTS",
    kind: "Communautés",
    urls: ["https://www.meetup.com/fr-FR/find/?location=fr--Dijon&source=EVENTS&distance=tenMiles"],
  }),
];
