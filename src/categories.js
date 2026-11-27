// Activities are classified along three independent axes, rather than one flat list:
//   - theme  : what it is about (music, nature, struggles…)
//   - format : how one takes part (attend, practise, visit, bargain-hunt…)
//   - public : who it is meant for in particular (families, students, seniors)
// An event gets at most two themes, one or two formats, and its publics.
// Patterns apply to lowercase text without accents.
// `axe` uses the three colours of the City's brand guide (Arquebuse green, Cassissine pink, Honey yellow).
const CATEGORIES = [
  // --- themes ---
  { id: "musique", kind: "theme", label: "Musique", axe: "rose", re: /\b(concerts?|musiques?|music|dj|electro|rock|jazz|rap|hip.?hop|chanson|chorale|choeur|orchestre|recital|opera|symphoni\w*|fanfare|blues|folk|techno|karaoke|scene ouverte|jam|punk|metal|reggae|flamenco|piano|pop)\b/ },
  { id: "spectacle", kind: "theme", label: "Scène", axe: "rose", re: /\b(theatre|spectacles?|danse|cirque|humour|one.?(wo)?man|stand.?up|impro\w*|marionnettes?|comedie|magie|cabaret|performance|sortie de residence)\b/ },
  { id: "expo", kind: "theme", label: "Expo & arts visuels", axe: "rose", re: /\b(expo\w*|vernissage|arts? visuels?|galerie|photograph\w*|peinture|sculpture|art contemporain|street.?art|beaux.?arts)\b/ },
  { id: "cinema", kind: "theme", label: "Cinéma", axe: "rose", re: /\b(cine\w*|projection|films?|courts?.metrages?|documentaire)\b/ },
  { id: "livres", kind: "theme", label: "Livres & lectures", axe: "rose", re: /\b(livres?|lectures?|litterature|poesie|ecriture|bibliotheque|auteur|autrice|bd|contes?|librairie|dedicace)\b/ },
  { id: "jeux", kind: "theme", label: "Jeux", axe: "rose", re: /\b(jeux?|ludique|gaming|escape|blind.?test|quiz|loto|echecs|tournoi de)\b/ },
  { id: "patrimoine", kind: "theme", label: "Patrimoine & histoire", axe: "jaune", re: /\b(patrimoine|histoire|architecture|archeolog\w*|monuments?|musees?|medieval\w*|ducs?)\b/ },
  { id: "gastronomie", kind: "theme", label: "Gastronomie & vin", axe: "jaune", re: /\b(gastronom\w*|degustation|vins?|oenolog\w*|oenotourisme|cuisine|gourmand\w*|brunch|repas|bieres?|cassis|food|saveurs?|vendanges?)\b/ },
  { id: "sport", kind: "theme", label: "Sport", axe: "jaune", re: /\b(sports?|match|course|marathon|trail|foot\w*|rugby|basket|handball|velo|cyclo\w*|escalade|natation|tournoi|randonnee|marche nordique|running|foulees)\b/ },
  { id: "nature", kind: "theme", label: "Nature & écologie", axe: "vert", re: /\b(nature|jardins?|plantes?|botani\w*|biodiversite\w*|foret|oiseaux?|agro\w*|potager|ecolog\w*|climat\w*|compost\w*|reforest\w*|plantation|arbres?|graines?|permaculture|plein air|durable|sentiers?)\b/ },
  { id: "sciences", kind: "theme", label: "Sciences", axe: "vert", re: /\b(sciences?|astronom\w*|numerique|planetarium|scientifique|observation publique)\b/ },
  { id: "bienetre", kind: "theme", label: "Santé & bien-être", axe: "vert", re: /\b(bien.?etre|yoga|meditation|sophrologie|sante mentale|psychi\w*|sante|massage|relaxation|sonotherapie|qi.?gong)\b/ },
  { id: "militant", kind: "theme", label: "Luttes & débats", axe: "vert", re: /\b(militant\w*|luttes?|manif\w*|greve|feminis\w*|antifa\w*|syndica\w*|reunions? publiques?|autogere\w*|mobilisation|rassemblement|antiracis\w*|sexisme|exil\w*|migrant\w*|palestine|paix|blocage|anticapital\w*|decolonial\w*|lgbt\w*|queer|alternatives?)\b/ },
  { id: "solidaire", kind: "theme", label: "Solidarité", axe: "vert", re: /\b(solidarit\w*|solidaires?|entraide|benevol\w*|caritati\w*|octobre rose|don du sang|telethon|repair cafe|gratiferia|collecte|tousmobilises|levee de fonds|lutte contre le cancer)\b/ },
  { id: "pro", kind: "theme", label: "Emploi & formation", axe: "jaune", re: /\b(entrepreneu\w*|business|juridique|networking|emploi|webinar|recrutement|metiers?|facture|decouverte formation|coaching|industrie|job dating|alternance|orientation)\b/ },
  // --- formats ---
  { id: "atelier", kind: "format", label: "Atelier", axe: "rose", re: /\b(ateliers?|stage|initiation|workshop|masterclass|fabrication|diy|couture|tricot|poterie|ceramique|pratique musicale)\b/ },
  { id: "conference", kind: "format", label: "Rencontre & conférence", axe: "rose", re: /\b(conferences?|rencontres?|debats?|table ronde|colloque|seminaire|causerie|discussion|cafe.?philo|journees? d.?etudes?)\b/ },
  { id: "visite", kind: "format", label: "Visite & balade", axe: "jaune", re: /\b(visites?|balades?|guidee?s?|promenade|parcours)\b/ },
  // "Fête de la science" is not a party, and a festival is a format of its own
  { id: "fete", kind: "format", label: "Soirée & fête", axe: "jaune", re: /\b(fetes?(?! de la science)|clubbing|afterwork|bal|guinguette|apero\w*|dansant\w*|latino|dans les bars|bars?|boum|soiree (etudiante|dansante|clubbing|karaoke))\b/ },
  { id: "festival", kind: "format", label: "Festival", axe: "jaune", re: /\b(festivals?|fest|fete de la science|journees europeennes)\b/ },
  { id: "marche", kind: "format", label: "Marché & troc", axe: "jaune", re: /\b(vide.?greniers?|brocantes?|marches?|braderie|puces|gratiferia|troc|bourse aux|foire)\b/ },
  // --- publics ---
  { id: "famille", kind: "public", label: "Famille & enfants", axe: "rose", re: /\b(enfants?|familles?|jeune public|jeunesse|bebes?|parents?|tout.?petits|kids)\b/ },
  { id: "etudiants", kind: "public", label: "Étudiants", axe: "rose", re: /\b(etudiant\w*|campus|crous)\b/ },
  { id: "seniors", kind: "public", label: "Seniors", axe: "rose", re: /\b(seniors?|retraites?|semaine bleue)\b/ },
];

const strip = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const hits = (text) => CATEGORIES.filter((c) => c.re.test(text));

// Each clue weighs by its reliability: a source tag is worth more than a word in the title, which
// is worth more than a mention in the description. A catch-all tag ("Spectacles & concerts")
// names several categories at once: it is shared between them instead of counting in full.
function categorize({ tags = [], title = "", description = "", fallback }) {
  const score = new Map();
  const add = (c, n) => score.set(c.id, (score.get(c.id) || 0) + n);
  for (const tag of tags) {
    const found = hits(strip(tag));
    for (const c of found) add(c, found.length >= 3 ? 1 : found.length === 2 ? 2 : 3);
  }
  for (const c of hits(strip(title))) add(c, 2);
  // in the description, a category mentioned several times wins over those mentioned once
  const body = strip(description);
  for (const c of hits(body)) add(c, 1 + Math.min(0.9, (body.match(new RegExp(c.re.source, "g")).length - 1) * 0.3));

  const ranked = (kind) =>
    CATEGORIES.filter((c) => c.kind === kind && score.has(c.id)).sort((a, b) => score.get(b.id) - score.get(a.id));

  // themes: the two best supported; a mere mention in the description only counts for lack of better
  const themes = ranked("theme");
  const top = themes.length ? score.get(themes[0].id) : 0;
  let picked = themes.filter((c) => score.get(c.id) >= Math.max(2, top - 2)).slice(0, 2);
  if (!picked.length && themes.length) picked = themes.slice(0, 1);

  const formats = ranked("format").filter((c) => score.get(c.id) >= 2).slice(0, 2);
  const publics = ranked("public").filter((c) => score.get(c.id) >= 2);

  const ids = [...picked, ...formats, ...publics].map((c) => c.id);
  if (!picked.length) ids.unshift(...(fallback && !ids.includes(fallback) ? [fallback] : formats.length ? [] : ["autre"]));
  return ids;
}

// Practical conditions the sources state plainly but without a dedicated field.
function facets({ title = "", description = "", price = "", tags = [] }) {
  const head = strip(`${title} ${tags.join(" ")}`);
  const text = strip(`${title} ${description} ${price} ${tags.join(" ")}`);
  const out = {};
  const range = text.match(/\b(\d{1,2})\s*(?:-|a)\s*\d{1,2}\s*ans\b/);
  const from = text.match(/\b(?:des|a partir de)\s+(\d{1,2})\s*(ans|mois)\b/);
  if (from) out.ageMin = from[2] === "mois" ? 0 : +from[1];
  else if (range) out.ageMin = +range[1];
  if (/\b(sur inscription|inscription (obligatoire|requise|necessaire)|sur reservation|reservation (obligatoire|indispensable|conseillee|requise)|places limitees)\b/.test(text)) out.booking = true;
  if (/\b(prix libre|participation libre)\b/.test(text)) out.priceLibre = true;
  // the status is read from the title only: "complet" in a description talks about something else
  const status = head.match(/\b(annule|complet|reporte)e?s?\b/);
  if (status) out.status = { annule: "Annulé", complet: "Complet", reporte: "Reporté" }[status[1]];
  return out;
}

const PUBLIC = [
  ...CATEGORIES.map(({ id, kind, label, axe }) => ({ id, kind, label, axe })),
  { id: "autre", kind: "theme", label: "Autre", axe: "jaune" },
];

module.exports = { CATEGORIES: PUBLIC, categorize, facets, strip };
