# Fournisseurs de données possibles

Analyse du 10 octobre 2026. « Vérifié » signifie que la source a été interrogée ce jour-là depuis cette
machine ; le reste vient de la documentation publique et reste à confirmer avant de s'engager.

## En bref

1. **DATAtourisme** est le meilleur ajout : base nationale ouverte, 641 événements en Côte-d'Or sur
   166 communes, avec adresse et coordonnées. C'est aussi la porte d'entrée du rural.
2. **Quatre mairies de la métropole** exposent leur agenda par une API ouverte, branchable en peu de travail.
3. **Deux lieux** (Bistrot de la Scène, CROUS) exposent la même API standard.
4. Pour le tissu associatif et les bars, il n'y a pas de base ouverte : il faut **HelloAsso** (API à clé)
   et la **veille Instagram**.
5. Les grandes plateformes fermées (Eventbrite, Meetup, Infoconcert, Facebook) n'offrent pas de voie utilisable.

## 1. Bases ouvertes, branchables tout de suite

| Fournisseur | Ce que ça apporte | Accès | Licence | État |
| --- | --- | --- | --- | --- |
| **DATAtourisme** | Fêtes, marchés, visites, sorties nature, dégustations dans tout le département. 641 événements en Côte-d'Or, dont 102 à Dijon, 91 à Beaune, 17 à Talant, et 166 communes en tout | Fichier CSV régional (28 Mo), mis à jour chaque jour sur data.gouv.fr | Licence Ouverte | Vérifié |
| **OpenAgenda, API directe** | Plus frais et plus complet que l'export utilisé aujourd'hui (âge, inscription, accessibilité). 120 événements à 30 km, 160 dans le département | API gratuite, clé à demander | Licence ouverte sur les agendas publics | Export vérifié, API non testée (pas de clé) |
| **Chevigny-Saint-Sauveur** | Agenda municipal | API « The Events Calendar » | Organisme public | Vérifié |
| **Marsannay-la-Côte** | Agenda municipal | API WordPress, type `event` | Organisme public | Vérifié |
| **Saint-Apollinaire** | Agenda municipal | API WordPress, type `event` | Organisme public | Vérifié |
| **Fontaine-lès-Dijon** | Agenda municipal | API WordPress, type `evenement` | Organisme public | Vérifié |

Remarques :

- DATAtourisme est la source que l'Office de tourisme, Bourgogne Tourisme et « La Côte-d'Or j'adore »
  affichent déjà. La brancher permet de **retirer le scraping de l'Office de tourisme** et de gagner des
  adresses précises, alors qu'aujourd'hui presque aucun de ses événements n'a d'itinéraire.
- Sur OpenAgenda, les agendas les plus actifs autour de Dijon sont France Travail (53 événements),
  La Vapeur (18), la Semaine de l'industrie (13), **Shotgun** (10) et les cinémas d'art et essai. Shotgun
  y publie donc ses soirées : inutile de scraper son site, qui bloque d'ailleurs les robots.

## 2. Mairies et lieux à lire en HTML

Pas d'API, mais des pages d'agenda publiques et aucun refus dans `robots.txt` (vérifié).

| Source | Page | Intérêt |
| --- | --- | --- |
| **Talant** | liste d'événements sur le site | Couvre **L'Écrin**, premier lieu de la liste Jondi (6 événements) |
| **Chenôve** | `/agenda` | Complète Le Cèdre |
| **Quetigny** | `/sortir` | Espace Mendès-France, La Parenthèse |
| **Longvic** | site WordPress | Agenda municipal |
| **Bistrot de la Scène** | API « The Events Calendar » | Jondi y ajoute 6 dates que les autres sources n'ont pas |
| **CROUS BFC** | API « The Events Calendar » | Vie étudiante |
| **Un Singe en Hiver** | `/programmation` | 4 événements exclusifs à Jondi |
| **La Minoterie** | `/agenda` | Jeune public |
| **Latitude 21** | `/agenda` | Architecture, environnement |
| **Consortium Museum** | site Drupal | Art contemporain |
| **DFCO, JDA** | calendriers des matchs | Sport |

Pour les lieux privés, un mot aux équipes avant de publier : ils ont intérêt à être relayés.

## 3. API officielles, avec clé et conditions

| Fournisseur | Ce que ça apporte | Conditions | Avis |
| --- | --- | --- | --- |
| **HelloAsso** | Événements des associations : stages, repas, lotos, vide-greniers, billetteries solidaires. C'est le tissu que Jondi couvre et que les bases ouvertes n'ont pas | API v5 avec recherche dans l'annuaire, identifiants à demander. Le site public refuse les robots (403 vérifié) | **À creuser en priorité** pour l'associatif et le rural. Conditions d'accès à l'annuaire non vérifiées |
| **Ticketmaster** | Grands spectacles, prix, lien de billetterie | Clé gratuite, 5 000 appels par jour, règles d'affichage de la marque | Surtout des doublons du Zénith. Utile pour les prix, pas pour la couverture |
| **Instagram (Business Discovery)** | Les annonces des bars, collectifs et tiers-lieux, qui ne sont nulle part ailleurs | Compte professionnel et application Meta ; ne lit que les comptes professionnels publics ; passage en revue par Meta pour un usage au-delà des tests | La seule voie officielle vers Instagram. Le texte est libre : il faut un LLM pour en extraire date et lieu, puis une validation humaine |
| **Mobilizon (keskonfai.fr)** | 601 événements trouvés autour de Dijon | API ouverte, sans clé (vérifié) | Les premiers résultats sont des spectacles du Zénith : c'est lui-même un agrégateur. Provenance à examiner avant usage |

## 4. À écarter ou à ne prendre qu'avec un accord

| Source | Pourquoi |
| --- | --- |
| **Jondi** | Base d'un concurrent direct. Voir `NOTES.md` |
| **Eventbrite** | La recherche publique par lieu n'est plus offerte par l'API ; les conditions interdisent l'extraction |
| **Meetup** | API réservée aux abonnés payants |
| **Infoconcert** | Refuse les robots (403 vérifié) |
| **Le Bien Public « Pour sortir »** | Base d'un groupe de presse, usage commercial exclu sans accord |
| **Facebook Events** | Aucune API de lecture |
| **vide-greniers.org** | Base commerciale ; les vide-greniers sont en partie dans DATAtourisme et chez les mairies |
| **Bibliothèques de Dijon** | `robots.txt` interdit tous les robots sauf Google |

## 5. Introuvables depuis cette machine

Adresses à retrouver à la main : Péniche Cancale (certificat invalide), Darcy Comédie, les cinémas
(Eldorado, Darcy, Olympia, Cap Vert), la fédération des MJC, Demosphere Dijon (certificat expiré).

## 6. Ce que chaque piste comble

Les catégories où Jondi est aujourd'hui seul, et ce qui peut le relayer :

| Manque | Relais possibles |
| --- | --- |
| Festivals, fêtes de village | DATAtourisme, mairies |
| Marchés, vide-greniers | DATAtourisme, mairies |
| Sport | Calendriers des clubs, DATAtourisme |
| Solidarité, associations | HelloAsso |
| Soirées, bars, jeux | Lieux en direct (Un Singe en Hiver, Bistrot de la Scène), veille Instagram |
| Jeune public | La Minoterie, mairies |
| Cinéma | Agenda des cinémas d'art et essai sur OpenAgenda ; sites des salles à retrouver |

## 7. Ordre conseillé

1. **DATAtourisme** : le plus gros gain pour le moins de risque, et il remplace une source scrapée.
2. **Les quatre mairies à API, le Bistrot de la Scène et le CROUS** : l'adaptateur existe presque déjà.
3. **Talant, Chenôve, Quetigny** en HTML : Talant à lui seul récupère le premier lieu de la liste Jondi.
4. **Clé OpenAgenda** : gratuit, améliore une source déjà en place.
5. **HelloAsso** : vérifier d'abord les conditions d'accès à l'annuaire.
6. **Veille Instagram assistée** : pour ce qui n'existe nulle part ailleurs.

Les étapes 1 à 3 ne demandent ni clé ni autorisation. Ce qu'elles récupèrent des 126 événements
exclusifs à Jondi n'est pas chiffrable avant de les avoir branchées : c'est la première mesure à refaire.
