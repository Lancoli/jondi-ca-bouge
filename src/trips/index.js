// The "navigator": compares the ways to get from one point to another.
// Each mode is an object { id, label, plan(from, to, opts) } that returns
// { minutes, meters, shape?, details? } or null. Adding a mode = adding an entry to MODES.
// Labels are visitor text (French, the interface language); ids and fields are the API contract.
const { route } = require("./valhalla");
const { estimateCosts } = require("./costs");
const divia = require("../divia");

const streets = (costing) => async (from, to) => {
  const r = await route(costing, from, to);
  return r && { minutes: Math.max(1, Math.round(r.seconds / 60)), meters: r.meters, shape: r.shape };
};

const MODES = [
  { id: "walk", label: "À pied", plan: streets("pedestrian") },
  { id: "bike", label: "À vélo", plan: streets("bicycle") },
  {
    id: "transit",
    label: "Bus / tram",
    async plan(from, to, { arriveBy } = {}) {
      const r = await divia.plan({ from, to, arriveBy });
      const best = r.options[0];
      return { minutes: best ? best.duration : null, meters: null, details: r };
    },
  },
  { id: "car", label: "En voiture", plan: streets("auto") },
];

async function compare({ from, to, arriveBy, modes, profile }) {
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
      out.costs = estimateCosts(out, profile);
      return out;
    })
  );
  return { modes: results };
}

module.exports = { compare, MODES };
