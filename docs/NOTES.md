# Notes de projet

## Jondi : référencement seul avec citation visible (à décider)

Noté le 10 octobre 2026. Rien n'est implémenté, on y revient plus tard.

### L'idée

Garder les événements venus de Jondi, mais en simple référencement : titre, date, lieu, thème, puis un
bouton bien visible « Consulter l'événement sur Jondi.fr ». Ni leur texte de présentation, ni leur image.

### Pourquoi

Jondi pèse lourd sur le court terme (mesure du 10 octobre, 814 événements) :

| Horizon | Événements | Connus par Jondi seul |
| --- | --- | --- |
| 7 jours | 145 | 58 (40 %) |
| 21 jours | 335 | 126 (38 %) |
| Au-delà | 433 | 0 |

Sans lui, on perd surtout les festivals (57 %), les jeux (46 %), les soirées (40 %), les marchés, le
sport et la solidarité (environ 30 % chacun). Tout repose sur 45 lieux : la liste est dans
`data/leads-jondi.json`.

### Ce que la citation change, et ce qu'elle ne change pas

- Elle fait de l'app un apporteur de trafic plutôt qu'un substitut. C'est le critère qui compte en droit
  des bases de données : la reprise nuit-elle à l'investissement du producteur ?
- Elle ne vaut pas autorisation. Jondi n'a publié aucune licence de réutilisation ; un métamoteur qui
  renvoyait vers ses sources a déjà été condamné en Europe parce qu'il rendait la visite inutile.
- Pour un usage personnel, la question ne se pose pas. Elle se pose dès qu'il y a diffusion publique,
  et davantage s'il y a un revenu.

### Ce qu'il faudrait faire dans le code

1. Un mode « référencement seul » réglable par source, appliqué à Jondi : pas de description, pas
   d'image, bouton principal vers la source.
2. Arrêter de lire les fiches Jondi pour en recopier la présentation (`src/enrich.js` le fait aujourd'hui).
3. Compter les clics sortants par source, pour avoir un chiffre à montrer.

### La suite possible

Écrire à Jondi avec ce chiffre : « je référence vos événements et je vous envoie du monde ». S'ils
acceptent, c'est un accord écrit ; s'ils refusent, on retire la source. En parallèle, aller chercher les
45 lieux à la source réduit la dépendance quoi qu'ils répondent (voir `PROVIDERS.md`).

### État actuel

- Jondi est relevé deux fois par jour au plus, son répertoire de lieux une fois par semaine.
- Les bibliothèques de Dijon interdisent les robots (`robots.txt`) et la source passe encore par un
  agent de navigateur : à retirer avant toute diffusion publique.
