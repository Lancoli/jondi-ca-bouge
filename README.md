# Jondi ça bouge

Tout ce qui se passe à Dijon, au même endroit, filtré selon tes goûts, avec le trajet Divia pour t'y rendre.

```bash
npm install
npm start          # http://localhost:4021
```

Au premier lancement, le serveur passe sur toutes les sources (30 à 60 s), puis recommence toutes les
trois heures. Le bouton « Actualiser » de l'interface force un passage.

## Sources

| Source | Méthode | Ce qu'elle apporte |
| --- | --- | --- |
| OpenAgenda | API open data (OpenDataSoft, sans clé) | associations, festivals nationaux, agendas partagés |
| Ville de Dijon | page agenda + fiches | programmation municipale, lieux et tarifs |
| Musées de Dijon | page agenda + fiches | visites, ateliers, expositions |
| Jondi | pages jour + API des lieux | bars, concerts, ateliers, vide-greniers |
| Dijoncter | flux iCal | agenda militant et alternatif |
| Bibliothèques de Dijon | flux RSS | lectures, jeux, ateliers gratuits |
| Office de tourisme | pages agenda | fêtes, marchés, visites, alentours |
| Zénith de Dijon | API WordPress | grands concerts, séances |
| La Vapeur | données Nuxt de la page programme | musiques actuelles |
| Opéra de Dijon | calendrier de saison | opéra, musique, danse |
| Théâtre Dijon Bourgogne | saison paginée | théâtre |
| Le Cèdre (Chenôve) | page programmation | spectacles |
| Atheneum | page programmation | campus, arts-sciences |
| Université Bourgogne Europe | page événements | colloques, conférences |
| Eventbrite, Meetup | JSON-LD schema.org | rencontres, ateliers, pro |

Une source en panne n'arrête pas les autres : l'onglet « Sources » montre ce que chacune a rendu au dernier
passage, et permet de masquer celles qui ne t'intéressent pas.

Un même événement annoncé par plusieurs sources n'apparaît qu'une fois ; ses sources sont listées sur la fiche.

### Ajouter une source

Un fichier dans `src/sources/`, déclaré dans `src/sources/index.js` :

```js
module.exports = {
  id: "masource", name: "Ma source", site: "https://…", kind: "Salle",
  async fetch(ctx) {
    return [{ title, url, start: "2026-10-10T20:30", end, venue, address, city, lat, lng, tags: [], price, image, description }];
  },
};
```

`start` est une heure de Paris (`YYYY-MM-DD` si l'heure est inconnue). Tout le reste est facultatif : le
lieu est géocodé, la catégorie déduite des étiquettes et du titre. Pour tester une source seule :

```bash
node src/aggregate.js --only masource
```

Une page qui expose ses événements en JSON-LD se branche en trois lignes avec `jsonld.js`.

## Trajets

- **Divia** : horaires théoriques (GTFS) et prochains passages en temps réel (GTFS-RT), publiés en open data
  sur transport.data.gouv.fr. Le calcul propose les trajets directs, ou avec une correspondance quand elle
  fait gagner du temps, soit « pour arriver à l'heure », soit « en partant maintenant ».
- **Google Maps** : liens d'itinéraire pré-remplis (transports, à pied, à vélo, en voiture) depuis ton point
  de départ.

- **À pied, à vélo, en voiture** : durée et distance sur le vrai réseau de rues (OpenStreetMap, serveur
  Valhalla public de FOSSGIS). Un mode qui ne répond pas est masqué plutôt qu'estimé.

Le point de départ est ta position GPS ou l'un de tes **lieux** (Maison, Travail…), choisis dans « D'où
pars-tu ? » et basculables directement sur la fiche. Tout reste dans le navigateur (`localStorage`).

Le calcul vit dans `src/trajets/` (`GET /api/trajets`) :
- `index.js` : registre des modes `{ id, label, plan(from, to) }` — en ajouter un = une entrée ;
- `couts.js` : estimateurs de coût par mode. L'essence est branchée (conso et prix saisis dans « Ma
  voiture ») ; prochaine étape possible : lire le prix à la pompe sur prix-carburants.gouv.fr.

## Appli

L'interface s'installe comme une appli (PWA) : icône sur l'écran d'accueil, plein écran, ouverture hors
connexion.

- **Android, Chrome, Edge** : le bouton « Installer l'appli » apparaît en haut quand le navigateur le
  permet (ou menu ⋮ → « Installer l'application »).
- **iPhone** : Safari → Partager → « Sur l'écran d'accueil ».

Hors connexion, l'appli montre le dernier agenda reçu et le dit dans la barre d'état. Trajets Divia,
recherche d'adresse et actualisation restent en ligne seulement : un trajet d'hier serait faux.

L'installation demande une page servie en HTTPS (ou `localhost`). Sur le téléphone, il faut donc passer
par le portfolio déployé derrière HTTPS, pas par `http://<ip-du-pc>:4021`. Fichiers concernés :
`public/manifest.webmanifest`, `public/sw.js` (changer `CACHE` pour forcer la mise à jour du cache),
`public/assets/icons/`.

## Agenda

Chaque fiche propose « Ajouter à mon agenda » : un lien Google Agenda pré-rempli, ou un fichier `.ics`
pour les autres agendas (Apple, Outlook, Proton…). Aucun compte n'est relié à l'appli. Sans heure dans la
source, l'événement est inscrit en journée entière ; sans heure de fin, il dure une heure et la note le dit.

## Organisation

```
server.js            serveur HTTP local, API et fichiers statiques
src/aggregate.js     orchestration : sources -> normalisation -> géocodage -> data/events.json
src/normalize.js     séances, périodes, dédoublonnage entre sources
src/categories.js    classement sur trois axes (thème, format, public) et conditions pratiques
src/enrich.js        lecture des fiches pour compléter présentation, heure et tarif
src/geocode.js       lieux Jondi, Base Adresse Nationale, OpenStreetMap
src/divia.js         réseau Divia : arrêts proches, itinéraires, temps réel
src/sources/         un adaptateur par source
public/              interface : index.html, sw.js et le manifeste à la racine (leur portée),
  css/ js/             la feuille de style et les scripts (sans dépendance)
  assets/icons/        icônes de l'appli installée
  vendor/              Leaflet et la typo, servis en local
  retours/             le widget « Dire à Claude » (recopié par retours/installer.mjs)
docs/                notes de travail (NOTES.md) et les fournisseurs de données (PROVIDERS.md)
data/                caches (créé au premier lancement, non versionné)
```

## Limites connues

- Les sites sans API changent leur balisage sans prévenir : l'adaptateur concerné rend alors zéro
  événement et l'onglet « Sources » le signale.
- Les fiches de dijon.fr sont lues par lots de 140 : il faut deux ou trois passages pour que tous les
  événements lointains aient leur lieu et leur heure.
- Le calcul Divia s'arrête à une correspondance ; au-delà, passer par le lien Google Maps.
- Projet personnel, sans lien avec la Ville de Dijon ni Keolis.

## Interface

Thème sombre unique : fond presque noir, panneaux cernés d'un liseré fin, violet `#a528f2` pour ce qui est
actif. Chaque catégorie a sa teinte et son pictogramme (`CAT_LOOK` dans `public/js/app.js`) : la teinte donne
le liseré des cartes « Ça commence bientôt » et la couleur des étiquettes. La police Outfit est servie en
local (`public/vendor/fonts/`).

Le panneau de filtres réunit les thèmes (rangée de pastilles), puis « Quand ? », « Où ? », « Type » (les
formats : atelier, visite, festival…) et « Source ». « Accès rapide » bascule l'agenda entre une ligne par
événement et des cartes détaillées. Le temps de trajet affiché sur une ligne est une estimation (à pied
jusqu'à 2 km, à vélo au-delà) ; le calcul Divia exact est sur la fiche.
