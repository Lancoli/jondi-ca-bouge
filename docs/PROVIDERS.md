# Possible data providers

Analysis of 10 October 2026. "Checked" means the source was queried that day from this machine; the rest
comes from public documentation and remains to be confirmed before committing to it.

## At a glance

1. **DATAtourisme** is the best addition: an open national database, 641 events in Côte-d'Or across
   166 municipalities, with address and coordinates. It is also the way into the countryside.
2. **Four town halls of the metro area** expose their agenda through an open API, pluggable with little work.
3. **Two venues** (Bistrot de la Scène, CROUS) expose the same standard API.
4. For non-profits and bars, there is no open database: it takes **HelloAsso** (keyed API) and
   **Instagram monitoring**.
5. The big closed platforms (Eventbrite, Meetup, Infoconcert, Facebook) offer no usable path.

## 1. Open databases, pluggable right away

| Provider | What it brings | Access | Licence | State |
| --- | --- | --- | --- | --- |
| **DATAtourisme** | Festivals, markets, tours, nature outings, tastings across the département. 641 events in Côte-d'Or, 102 in Dijon, 91 in Beaune, 17 in Talant, 166 municipalities in all | Regional CSV file (28 MB), updated daily on data.gouv.fr | Licence Ouverte | Checked |
| **OpenAgenda, direct API** | Fresher and fuller than the export used today (age, registration, accessibility). 120 events within 30 km, 160 in the département | Free API, key to request | Open licence on public agendas | Export checked, API not tested (no key) |
| **Chevigny-Saint-Sauveur** | Municipal agenda | "The Events Calendar" API | Public body | Checked |
| **Marsannay-la-Côte** | Municipal agenda | WordPress API, type `event` | Public body | Checked |
| **Saint-Apollinaire** | Municipal agenda | WordPress API, type `event` | Public body | Checked |
| **Fontaine-lès-Dijon** | Municipal agenda | WordPress API, type `evenement` | Public body | Checked |

Notes:

- DATAtourisme is the source the tourist office, Bourgogne Tourisme and "La Côte-d'Or j'adore" already
  display. Plugging it in lets us **drop the tourist office scraping** and gain precise addresses, whereas
  today almost none of its events have a route.
- On OpenAgenda, the most active agendas around Dijon are France Travail (53 events), La Vapeur (18), the
  Semaine de l'industrie (13), **Shotgun** (10) and the art-house cinemas. So Shotgun publishes its nights
  there: no need to scrape its site, which blocks robots anyway.

## 2. Town halls and venues to read as HTML

No API, but public agenda pages and no refusal in `robots.txt` (checked).

| Source | Page | Interest |
| --- | --- | --- |
| **Talant** | event list on the site | Covers **L'Écrin**, the first venue of the Jondi list (6 events) |
| **Chenôve** | `/agenda` | Complements Le Cèdre |
| **Quetigny** | `/sortir` | Espace Mendès-France, La Parenthèse |
| **Longvic** | WordPress site | Municipal agenda |
| **Bistrot de la Scène** | "The Events Calendar" API | Jondi adds 6 dates the other sources lack |
| **CROUS BFC** | "The Events Calendar" API | Student life |
| **Un Singe en Hiver** | `/programmation` | 4 events only Jondi has |
| **La Minoterie** | `/agenda` | Young audiences |
| **Latitude 21** | `/agenda` | Architecture, environment |
| **Consortium Museum** | Drupal site | Contemporary art |
| **DFCO, JDA** | match calendars | Sport |

For private venues, a word to the teams before publishing: being relayed is in their interest.

## 3. Official APIs, with a key and conditions

| Provider | What it brings | Conditions | Opinion |
| --- | --- | --- | --- |
| **HelloAsso** | Non-profit events: courses, meals, lotteries, car-boot sales, solidarity ticketing. The fabric Jondi covers and the open databases lack | API v5 with directory search, credentials to request. The public site refuses robots (403 checked) | **Dig into first** for non-profits and the countryside. Directory access conditions not checked |
| **Ticketmaster** | Big shows, prices, ticketing link | Free key, 5,000 calls a day, brand display rules | Mostly duplicates of the Zénith. Useful for prices, not for coverage |
| **Instagram (Business Discovery)** | Announcements from bars, collectives and third places, found nowhere else | Professional account and a Meta app; reads only public professional accounts; Meta review for use beyond testing | The only official path to Instagram. The text is free-form: an LLM is needed to extract date and place, then a human check |
| **Mobilizon (keskonfai.fr)** | 601 events found around Dijon | Open API, no key (checked) | The first results are Zénith shows: it is itself an aggregator. Provenance to examine before use |

## 4. To set aside, or to take only with an agreement

| Source | Why |
| --- | --- |
| **Jondi** | A direct competitor's database. See `NOTES.md` |
| **Eventbrite** | Public search by place is no longer offered by the API; the terms forbid extraction |
| **Meetup** | API reserved for paying subscribers |
| **Infoconcert** | Refuses robots (403 checked) |
| **Le Bien Public "Pour sortir"** | A press group's database, commercial use excluded without agreement |
| **Facebook Events** | No read API |
| **vide-greniers.org** | Commercial database; car-boot sales are partly in DATAtourisme and at the town halls |
| **Dijon libraries** | `robots.txt` forbids every robot except Google |

## 5. Unreachable from this machine

Addresses to find by hand: Péniche Cancale (invalid certificate), Darcy Comédie, the cinemas (Eldorado,
Darcy, Olympia, Cap Vert), the MJC federation, Demosphere Dijon (expired certificate).

## 6. What each lead fills

The categories where Jondi stands alone today, and what can take over:

| Gap | Possible relays |
| --- | --- |
| Festivals, village fêtes | DATAtourisme, town halls |
| Markets, car-boot sales | DATAtourisme, town halls |
| Sport | Club calendars, DATAtourisme |
| Solidarity, non-profits | HelloAsso |
| Nights out, bars, games | Venues directly (Un Singe en Hiver, Bistrot de la Scène), Instagram monitoring |
| Young audiences | La Minoterie, town halls |
| Cinema | Art-house cinemas' agenda on OpenAgenda; cinema sites to find |

## 7. Recommended order

1. **DATAtourisme**: the biggest gain for the least risk, and it replaces a scraped source.
2. **The four town halls with an API, Bistrot de la Scène and the CROUS**: the adapter almost exists already.
3. **Talant, Chenôve, Quetigny** as HTML: Talant alone recovers the first venue of the Jondi list.
4. **OpenAgenda key**: free, improves a source already in place.
5. **HelloAsso**: check the directory access conditions first.
6. **Assisted Instagram monitoring**: for what exists nowhere else.

Steps 1 to 3 need neither a key nor a permission. How many of the 126 events only Jondi has they recover
cannot be measured before plugging them in: that is the first measurement to redo.
