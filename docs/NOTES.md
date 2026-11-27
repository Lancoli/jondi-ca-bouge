# Project notes

## Jondi: listing only, with a visible citation (to be decided)

Noted on 10 October 2026. Nothing is implemented; to be revisited later.

### The idea

Keep the events that come from Jondi, but as a plain listing: title, date, place, theme, then a clearly
visible "Consulter l'événement sur Jondi.fr" button. Neither their presentation text nor their image.

### Why

Jondi weighs heavily in the short term (measured on 10 October, 814 events):

| Horizon | Events | Known only through Jondi |
| --- | --- | --- |
| 7 days | 145 | 58 (40 %) |
| 21 days | 335 | 126 (38 %) |
| Beyond | 433 | 0 |

Without it, we mostly lose festivals (57 %), games (46 %), evenings out (40 %), markets, sport and
solidarity (about 30 % each). It all rests on 45 venues: the list is in `data/leads-jondi.json`.

### What the citation changes, and what it does not

- It makes the app a traffic provider rather than a substitute. That is the test that matters in database
  law: does the reuse harm the producer's investment?
- It is not a permission. Jondi has published no reuse licence; a meta-search engine that linked back to its
  sources has already been convicted in Europe because it made the visit pointless.
- For personal use, the question does not arise. It arises as soon as there is public distribution, and more
  so if there is revenue.

### What the code would need

1. A "listing only" mode, set per source, applied to Jondi: no description, no image, the main button to the source.
2. Stop reading Jondi's detail pages to copy their presentation (`src/enrich.js` does it today).
3. Count outgoing clicks per source, to have a figure to show.

### Possible next step

Write to Jondi with that figure: "I list your events and I send you people". If they accept, it is a written
agreement; if they refuse, the source is removed. Meanwhile, going to the 45 venues directly reduces the
dependency whatever they answer (see `PROVIDERS.md`).

### Current state

- Jondi is collected at most twice a day, its venue directory once a week.
- Dijon libraries forbid robots (`robots.txt`) and the source still goes through a browser agent: to remove
  before any public distribution.
