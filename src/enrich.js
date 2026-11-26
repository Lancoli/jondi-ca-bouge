// Complète les événements pauvres en allant lire leur fiche : beaucoup de sources ne donnent en liste
// qu'un titre et une date. On en tire le texte de présentation, et quand la page les expose proprement
// (JSON-LD), l'heure et le tarif. Quota par passage et cache : la couverture monte au fil des actualisations.
const cheerio = require("cheerio");
const { get, pmap } = require("./lib/http");
const { toLocal, parseFrTime } = require("./lib/dates");
const { clean, jsonLd, truncate } = require("./lib/text");
const { strip } = require("./categories");

const BUDGET = 150;
const TTL = 10 * 86400;
const THIN = 80; // en dessous, la description ne dit rien
const NOISE = /cookie|newsletter|javascript|inscrivez-vous|mentions l[ée]gales|tous droits|connectez-vous|abonnez-vous|placement\s*:/i;
const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

const dayOf = (s) => (s ? s.slice(0, 10) : null);
const hasTime = (s) => !!s && s.length > 10;

function readPage(html) {
  const $ = cheerio.load(html);
  const ld = jsonLd(html, "Event")[0] || {};
  const meta = [$('meta[property="og:description"]').attr("content"), $('meta[name="description"]').attr("content")]
    .map((s) => clean(s).replace(/^[\w.#, ]+\{[^}]*\}\s*/, "")) // certains sites laissent du CSS dans la balise
    .sort((a, b) => b.length - a.length)[0];
  const short = [clean(ld.description), meta].sort((a, b) => b.length - a.length)[0] || "";

  $("script, style, nav, header, footer, form, aside, noscript").remove();
  const paragraphs = $("p")
    .map((_, p) => clean($(p).html()))
    .get()
    .filter((t) => t.length > 100 && !NOISE.test(t));
  const long = [...new Set(paragraphs)].slice(0, 4).join("\n\n");

  // Les paragraphes ne sont retenus que s'ils prolongent bien le résumé officiel de la page ;
  // sinon on risque de prendre des consignes de billetterie pour une présentation.
  const sameText = short.length >= 40 && strip(long).includes(strip(short).slice(0, 40));
  const description = short.length < 120 || sameText ? (long.length > short.length ? long : short) : short;

  const offer = [].concat(ld.offers || [])[0] || {};
  const price = offer.price ?? offer.lowPrice;
  const start = ld.startDate && /T\d{2}:\d{2}/.test(ld.startDate) ? (/[zZ]|[+-]\d{2}:?\d{2}$/.test(ld.startDate) ? toLocal(ld.startDate) : ld.startDate.slice(0, 16)) : null;
  return {
    description: truncate(description, 1600),
    start,
    free: ld.isAccessibleForFree === true || (price != null && price !== "" && +price === 0) || undefined,
    price: price != null && price !== "" && +price > 0 ? `À partir de ${String(price).replace(/\.0+$/, "")} €` : undefined,
    text: strip(clean($("body").html() || "")).slice(0, 6000),
  };
}

// « samedi 10 octobre 2026 / 20h » : heure écrite juste après la date de l'événement.
function timeNearDate(text, day) {
  const [, m, d] = day.split("-").map(Number);
  const re = new RegExp(`\\b0?${d}(?:er)?\\s+${MONTHS[m - 1]}(?:\\s+\\d{4})?[\\s/,|a:-]{0,6}(\\d{1,2}\\s?h\\s?\\d{0,2})`);
  const hit = text.match(re);
  return hit ? parseFrTime(hit[1]) : null;
}

async function enrich(events, cache) {
  const wants = (e) => (e.description || "").length < THIN || (e.timeHint && e.occurrences.length === 1 && !hasTime(e.occurrences[0].start));
  const first = (e) => (e.occurrences[0]?.start || e.period?.start || "9999").slice(0, 10);
  const todo = events.filter((e) => e.sources[0].url && wants(e)).sort((a, b) => first(a).localeCompare(first(b)));

  let budget = BUDGET;
  await pmap(todo, 4, async (e) => {
    const url = e.sources[0].url;
    let page = cache.get(`page:${url}`);
    if (!page) {
      if (budget-- <= 0) return;
      page = await get(url, { timeout: 15000, retries: 0 }).then(readPage).catch(() => null);
      if (!page) return;
      if (!e.timeHint) delete page.text; // le texte brut ne sert qu'à retrouver une heure
      cache.set(`page:${url}`, page, TTL);
    }
    if (page.description.length > (e.description || "").length) e.description = page.description;
    if (!e.price && page.price) e.price = page.price;
    if (e.free == null && page.free) e.free = true;

    // l'heure n'est reprise que pour un rendez-vous unique, et seulement si la page parle du même jour
    const only = e.occurrences.length === 1 ? e.occurrences[0] : null;
    if (only && !hasTime(only.start)) {
      if (page.start && dayOf(page.start) === only.start) only.start = page.start;
      else if (e.timeHint) {
        const time = page.text ? timeNearDate(page.text, only.start) : null;
        if (time) only.start = `${only.start}T${time}`;
      }
    }
  });
  cache.save();
}

module.exports = { enrich };
