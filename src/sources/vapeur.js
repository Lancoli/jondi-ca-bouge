// La Vapeur (musiques actuelles) : site Nuxt, la programmation est sérialisée dans le bloc __NUXT_DATA__.
const { get } = require("../lib/http");
const { clean } = require("../lib/text");

const URL = "https://www.lavapeur.com/programme";

// Le payload Nuxt est un tableau à plat où chaque valeur d'objet est l'index d'une autre case.
function hydrate(flat) {
  const memo = new Map();
  const resolve = (i) => {
    if (typeof i !== "number" || i < 0) return undefined;
    if (memo.has(i)) return memo.get(i);
    const v = flat[i];
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) {
      // enveloppes de réactivité : ["Reactive", n], ["Ref", n]…
      if (typeof v[0] === "string" && v.length === 2 && typeof v[1] === "number") return resolve(v[1]);
      const arr = [];
      memo.set(i, arr);
      for (const x of v) arr.push(resolve(x));
      return arr;
    }
    const obj = {};
    memo.set(i, obj);
    for (const k of Object.keys(v)) obj[k] = resolve(v[k]);
    return obj;
  };
  return resolve(0);
}

function collect(node, out, seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  if (node.slug && node.fieldsEvenement && node.title) out.push(node);
  for (const v of Array.isArray(node) ? node : Object.values(node)) collect(v, out, seen);
}

module.exports = {
  id: "vapeur",
  name: "La Vapeur",
  site: URL,
  kind: "Salle",
  async fetch() {
    const html = await get(URL);
    const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("payload Nuxt introuvable");
    const nodes = [];
    collect(hydrate(JSON.parse(m[1])), nodes);
    const bySlug = new Map(nodes.map((n) => [n.slug, n]));
    const events = [];
    for (const n of bySlug.values()) {
      const f = n.fieldsEvenement || {};
      const occurrences = (f.dates || [])
        .filter((d) => d && d.dateDebut && !/annul/i.test(String(d.statut || "")))
        .map((d) => {
          const base = String(d.dateReport || d.dateDebut).slice(0, 10);
          const time = d.heureReport || d.heureDebut || d.ouvertureDesPortes;
          return {
            start: /^\d{2}:\d{2}/.test(time || "") ? `${base}T${time.slice(0, 5)}` : base,
            end: d.dateFin ? String(d.dateFin).slice(0, 10) + (d.heureFin ? `T${d.heureFin.slice(0, 5)}` : "") : null,
          };
        })
        .sort((a, b) => a.start.localeCompare(b.start));
      if (!occurrences.length) continue;
      const types = (n.typesEvenements?.nodes || []).map((t) => t?.name).filter(Boolean);
      events.push({
        title: clean(n.title),
        url: `https://www.lavapeur.com/programme/${n.slug}`,
        start: occurrences[0].start,
        end: occurrences[occurrences.length - 1].end,
        occurrences: occurrences.length > 1 ? occurrences : undefined,
        venue: "La Vapeur",
        address: "42 avenue de Stalingrad, 21000 Dijon",
        city: "Dijon",
        tags: [...types, "musiques actuelles"],
        image: f.imagePrincipale?.srcSet ? String(f.imagePrincipale.srcSet).split(/[ ,]/)[0] : null,
        description: [f.sousTitre, clean(f.texte)].filter(Boolean).join(" — "),
      });
    }
    return events;
  },
};
