// What a trip costs. Each estimator receives a mode's result and the user's profile, and returns
// { id, label, value, unit, detail } or null when a piece of data is missing (never a default value
// disguised as a real one). To add a cost (toll, ticket, CO₂…): one more entry in ESTIMATORS.
const ESTIMATORS = [
  {
    id: "fuel",
    modes: ["car"],
    // profile.vehicle = { consumption: L/100 km, price: €/L }; later, price read from prix-carburants.gouv.fr
    estimate(trip, profile) {
      const v = profile?.vehicle;
      if (!v || !(v.consumption > 0) || !(v.price > 0)) return null;
      const litres = (trip.meters / 1000) * (v.consumption / 100);
      // label and detail are visitor text (French)
      return { id: "fuel", label: "Essence", value: +(litres * v.price).toFixed(2), unit: "€", detail: `${litres.toFixed(2)} L à ${v.price} €/L` };
    },
  },
];

function estimateCosts(trip, profile) {
  return ESTIMATORS.filter((e) => e.modes.includes(trip.mode)).map((e) => e.estimate(trip, profile)).filter(Boolean);
}

module.exports = { estimateCosts, ESTIMATORS };
