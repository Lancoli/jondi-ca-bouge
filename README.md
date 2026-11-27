# Jondi ça bouge

<!-- badges : généré par tools/kit-github.mjs -->
[![qualité](https://github.com/Lancoli/jondi-ca-bouge/actions/workflows/qualite.yml/badge.svg)](https://github.com/Lancoli/jondi-ca-bouge/actions/workflows/qualite.yml) [![release](https://img.shields.io/github/v/release/Lancoli/jondi-ca-bouge?include_prereleases&label=version)](https://github.com/Lancoli/jondi-ca-bouge/releases) [![Conventional Commits](https://img.shields.io/badge/commits-conventionnels%20%2B%20gitmoji-ff69b4)](https://www.conventionalcommits.org/fr/) [![dernier commit](https://img.shields.io/github/last-commit/Lancoli/jondi-ca-bouge)](https://github.com/Lancoli/jondi-ca-bouge/commits)
<!-- /badges -->

Everything happening in Dijon, in one place, filtered by your tastes, with the Divia trip to get there.
The interface is in French (local audience); code and docs are in English.

```bash
npm install
npm start          # http://localhost:4021
```

On first run, the server goes through every source (30 to 60 s), then again every three hours.
The interface's "Actualiser" button forces a run.

## Sources

| Source | Method | What it brings |
| --- | --- | --- |
| OpenAgenda | open data API (OpenDataSoft, no key) | non-profits, national festivals, shared agendas |
| City of Dijon | agenda page + detail pages | municipal programme, venues and prices |
| Dijon museums | agenda page + detail pages | tours, workshops, exhibitions |
| Jondi | day pages + venue API | bars, concerts, workshops, car-boot sales |
| Dijoncter | iCal feed | activist and alternative agenda |
| Dijon libraries | RSS feed | readings, games, free workshops |
| Tourist office | agenda pages | festivals, markets, tours, surroundings |
| Zénith de Dijon | WordPress API | big concerts, sessions |
| La Vapeur | Nuxt data of the programme page | contemporary music |
| Opéra de Dijon | season calendar | opera, music, dance |
| Théâtre Dijon Bourgogne | paginated season | theatre |
| Le Cèdre (Chenôve) | programme page | shows |
| Atheneum | programme page | campus, art-science |
| Université Bourgogne Europe | events page | symposia, lectures |
| Eventbrite, Meetup | schema.org JSON-LD | meet-ups, workshops, professional |

A broken source does not stop the others: the "Sources" tab shows what each one returned on the last run,
and lets you hide the ones you do not care about.

An event announced by several sources appears only once; its sources are listed on its sheet.

### Add a source

A file in `src/sources/`, declared in `src/sources/index.js`:

```js
module.exports = {
  id: "mysource", name: "My source", site: "https://…", kind: "Salle",
  async fetch(ctx) {
    return [{ title, url, start: "2026-10-10T20:30", end, venue, address, city, lat, lng, tags: [], price, image, description }];
  },
};
```

`start` is a Paris time (`YYYY-MM-DD` when the time is unknown). Everything else is optional: the place is
geocoded, the category inferred from the tags and the title. To test one source alone:

```bash
node src/aggregate.js --only mysource
```

A page that exposes its events as JSON-LD plugs in with three lines using `jsonld.js`.

## Trips

- **Divia**: scheduled timetables (GTFS) and real-time next departures (GTFS-RT), published as open data on
  transport.data.gouv.fr. The calculation offers direct trips, or with one transfer when it saves time,
  either "to arrive on time" or "leaving now".
- **Google Maps**: pre-filled route links (transit, walking, cycling, driving) from your starting point.
- **Walking, cycling, driving**: duration and distance on the real street network (OpenStreetMap, FOSSGIS's
  public Valhalla server). A mode that does not answer is hidden rather than estimated.

The starting point is your GPS position or one of your **places** (Home, Work…), chosen in "D'où pars-tu ?"
and switchable directly on the sheet. Everything stays in the browser (`localStorage`).

The calculation lives in `src/trips/` (`GET /api/trips?from=lat,lng&to=lat,lng&modes=walk,bike,transit,car`):
- `index.js`: the mode registry `{ id, label, plan(from, to) }`; adding one = one entry;
- `costs.js`: cost estimators per mode. Fuel is wired (`consumption` and `price`, entered in "Ma voiture");
  a possible next step: read the pump price from prix-carburants.gouv.fr.

## App

The interface installs as an app (PWA): home-screen icon, full screen, opens offline.

- **Android, Chrome, Edge**: the "Installer l'appli" button appears at the top when the browser allows it
  (or menu ⋮ → "Install app").
- **iPhone**: Safari → Share → "Add to Home Screen".

Offline, the app shows the last agenda received and says so in the status bar. Divia trips, address search
and refresh stay online only: yesterday's trip would be wrong.

Installation requires a page served over HTTPS (or `localhost`). On the phone, go through the portfolio
deployed behind HTTPS, not `http://<pc-ip>:4021`. Files involved: `public/manifest.webmanifest`,
`public/sw.js` (change `CACHE` to force a cache update), `public/assets/icons/`.

## Calendar

Each sheet offers "Ajouter à mon agenda": a pre-filled Google Calendar link, or an `.ics` file for other
calendars (Apple, Outlook, Proton…). No account is linked to the app. When the source has no time, the event
is written as all-day; without an end time, it lasts one hour and the note says so.

## Layout

```
server.js            local HTTP server, API and static files
src/aggregate.js     orchestration: sources -> normalisation -> geocoding -> data/events.json
src/normalize.js     sessions, periods, de-duplication across sources
src/categories.js    classification on three axes (theme, format, public) and practical conditions
src/enrich.js        reads detail pages to complete presentation, time and price
src/geocode.js       Jondi venues, Base Adresse Nationale, OpenStreetMap
src/divia.js         Divia network: nearby stops, routes, real time
src/trips/           trip comparison (walk, bike, transit, car) and costs
src/sources/         one adapter per source
public/              interface: index.html, sw.js and the manifest at the root (their scope),
  css/ js/             the stylesheet and the scripts (no dependency)
  assets/icons/        icons of the installed app
  vendor/              Leaflet and the font, served locally
  retours/             the "Dire à Claude" widget (copied by retours/installer.mjs)
docs/                work notes (NOTES.md) and data providers (PROVIDERS.md)
data/                caches (created on first run, not versioned)
```

## Known limits

- Sites without an API change their markup without notice: the adapter then returns zero events and the
  "Sources" tab says so.
- dijon.fr detail pages are read in batches of 140: it takes two or three runs for every distant event to get
  its place and time.
- The Divia calculation stops at one transfer; beyond that, use the Google Maps link.
- Personal project, unrelated to the City of Dijon or Keolis.

## Interface

A single dark theme: an almost black background, panels outlined by a thin edging, purple `#a528f2` for what
is active. Each category has its hue and pictogram (`CAT_LOOK` in `public/js/app.js`): the hue gives the edging
of the "Ça commence bientôt" cards and the colour of the tags. The Outfit font is served locally
(`public/vendor/fonts/`).

The filter panel gathers the themes (a row of chips), then "Quand ?", "Où ?", "Type" (the formats: workshop,
tour, festival…) and "Source". "Accès rapide" switches the agenda between one row per event and detailed cards.
The travel time shown on a row is an estimate (walking up to 2 km, cycling beyond); the exact Divia
calculation is on the sheet.
