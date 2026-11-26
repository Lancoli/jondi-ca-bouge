// Ce que coûte un trajet. Chaque estimateur reçoit le résultat d'un mode et le profil de l'utilisateur,
// et renvoie { id, label, value, unit, detail } ou null quand il lui manque une donnée (jamais de valeur par défaut
// déguisée en vraie). Pour ajouter un coût (péage, ticket, CO₂…) : une entrée de plus dans ESTIMATEURS.
const ESTIMATEURS = [
  {
    id: "carburant",
    modes: ["voiture"],
    // profil.vehicule = { conso: L/100 km, prix: €/L } ; plus tard, prix lu sur prix-carburants.gouv.fr
    estimer(trajet, profil) {
      const v = profil?.vehicule;
      if (!v || !(v.conso > 0) || !(v.prix > 0)) return null;
      const litres = (trajet.meters / 1000) * (v.conso / 100);
      return { id: "carburant", label: "Essence", value: +(litres * v.prix).toFixed(2), unit: "€", detail: `${litres.toFixed(2)} L à ${v.prix} €/L` };
    },
  },
];

function chiffrer(trajet, profil) {
  return ESTIMATEURS.filter((e) => e.modes.includes(trajet.mode)).map((e) => e.estimer(trajet, profil)).filter(Boolean);
}

module.exports = { chiffrer, ESTIMATEURS };
