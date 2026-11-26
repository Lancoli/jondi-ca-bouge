// Le « navigateur » : compare les façons d'aller d'un point à un autre.
// Chaque mode est un objet { id, label, plan(from, to, opts) } qui renvoie
// { minutes, meters, shape?, details? } ou null. Ajouter un mode = ajouter une entrée à MODES.
const { route } = require("./valhalla");
const { chiffrer } = require("./couts");
const divia = require("../divia");

const rues = (costing) => async (from, to) => {
  const r = await route(costing, from, to);
  return r && { minutes: Math.max(1, Math.round(r.seconds / 60)), meters: r.meters, shape: r.shape };
};

const MODES = [
  { id: "marche", label: "À pied", plan: rues("pedestrian") },
  { id: "velo", label: "À vélo", plan: rues("bicycle") },
  {
    id: "divia",
    label: "Bus / tram",
    async plan(from, to, { arriveBy } = {}) {
      const r = await divia.plan({ from, to, arriveBy });
      const best = r.options[0];
      return { minutes: best ? best.duration : null, meters: null, details: r };
    },
  },
  { id: "voiture", label: "En voiture", plan: rues("auto") },
];

async function comparer({ from, to, arriveBy, modes, profil }) {
  const wanted = modes?.length ? MODES.filter((m) => modes.includes(m.id)) : MODES;
  const results = await Promise.all(
    wanted.map(async (m) => {
      let r = null;
      try {
        r = await m.plan(from, to, { arriveBy });
      } catch {
        r = null;
      }
      if (!r) return { mode: m.id, label: m.label, ok: false };
      const out = { mode: m.id, label: m.label, ok: r.minutes != null, ...r };
      out.couts = chiffrer(out, profil);
      return out;
    })
  );
  return { modes: results };
}

module.exports = { comparer, MODES };
