# Jondi ça bouge — règles de l'app

Tous les événements de Dijon, filtrés, avec le trajet Divia (voir [README.md](README.md) : sources, API, cache).
Règles communes : [../CLAUDE.md](../CLAUDE.md). Notes : [docs/NOTES.md](docs/NOTES.md) · sources : [docs/PROVIDERS.md](docs/PROVIDERS.md).

## Règles propres

- **Pas d'itinéraire vers un lieu imprécis** : un événement sans coordonnées sûres n'a ni bouton « y aller » ni épingle
  (règle reprise par la carte de HAL).
- **Thème sombre violet** (maquette du 12/10) ; les activités sont **classées** (catégories, axes), jamais une liste brute.
- **L'app apporte du trafic aux sources**, elle ne les remplace pas : toujours le lien vers la source.
- Le passage sur les sources est limité (au plus deux fois par jour, le répertoire des lieux une fois par semaine) :
  ne pas ajouter de scraping plus fréquent.

## Vérifier

`npm start` puis http://localhost:4021 · `lancer ci` (image, santé) · `node tools/jalons.mjs jondi_ca_boouge` (racine).
