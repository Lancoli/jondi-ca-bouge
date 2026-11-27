# Jondi ça bouge — app rules

Every event in Dijon, filtered, with the Divia trip (see [README.md](README.md): sources, API, cache).
Shared rules: [../CLAUDE.md](../CLAUDE.md). Notes: [docs/NOTES.md](docs/NOTES.md) · sources: [docs/PROVIDERS.md](docs/PROVIDERS.md).

## Own rules

- **No route to an imprecise place**: an event without reliable coordinates has neither a "y aller" button nor
  a pin (rule shared with HAL's map).
- **Dark purple theme** (mock-up of 12/10); activities are **classified** (categories, axes), never a raw list.
- **The app brings traffic to the sources**, it does not replace them: always the link to the source.
- Runs on the sources are limited (at most twice a day, the venue directory once a week): do not add more
  frequent scraping.
- **Languages**: code, comments, docs and the API (`/api/trips`, mode ids, fields) in English. The interface is
  French (local audience); its move to `i18n/` is the next language step. Keys stored on visitors' devices
  (`jcb:v1`, `prefs.car.conso` / `prix`) are kept as they are.

## Check

`npm start` then http://localhost:4021 · `lancer ci` (image, health) · `node tools/jalons.mjs jondi_ca_boouge` (root).
