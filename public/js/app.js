(() => {
  "use strict";

  // ---------- Outils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    pin: icon('<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.6"/>'),
    euro: icon('<path d="M17 6a7 7 0 1 0 0 12M5 10h8M5 14h8"/>'),
    bus: icon('<rect x="5" y="3" width="14" height="14" rx="2"/><path d="M5 11h14M8 21l1-4M16 21l-1-4"/><circle cx="8.500" cy="14" r=".6"/><circle cx="15.500" cy="14" r=".6"/>'),
    calendar: icon('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
    clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    age: icon('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>'),
    ticket: icon('<path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V6H4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>'),
    route: icon('<path d="M3 11 21 3l-8 18-2-8z"/>'),
    share: icon('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.200 10.800 7.600-4.400M8.200 13.200l7.600 4.400"/>'),
    out: icon('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    walk: icon('<circle cx="13" cy="4.500" r="1.500"/><path d="m9 21 2-6-2-3 1-4 4 1 2 3 3 1M7 11l3-3M13 15l2 6"/>'),
    bike: icon('<circle cx="6" cy="16" r="3.500"/><circle cx="18" cy="16" r="3.500"/><path d="M6 16l4-8h5l3 8M10 8l4 8M9 5h2"/>'),
    heart: icon('<path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.300a4.300 4.300 0 0 1 7.500 2.500C19.500 15.400 12 20 12 20z"/>'),
    arrow: icon('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    chevron: icon('<path d="m6 9 6 6 6-6"/>'),
    tag: icon('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="8.500" r="1.200"/>'),
    nodes: icon('<circle cx="6" cy="6" r="2.500"/><circle cx="6" cy="18" r="2.500"/><circle cx="18" cy="12" r="2.500"/><path d="M6 8.500v7M8.200 7.200l7.600 3.600M8.200 16.800l7.600-3.600"/>'),
    bolt: icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
    all: icon('<rect x="4" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.500"/>'),
  };
  // Pictogramme et teinte de chaque catégorie (la teinte donne le liseré des cartes et la couleur des étiquettes).
  const CAT_LOOK = {
    musique: ["rose", '<path d="M9 18V5l11-2v13"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="17.500" cy="16" r="2.500"/>'],
    spectacle: ["orange", '<path d="M4 5h16v6a8 8 0 0 1-16 0z"/><path d="M8.500 9.500h.01M15.500 9.500h.01M9 14c1.800 1.400 4.200 1.400 6 0"/>'],
    expo: ["violet", '<path d="M3 21h18M5 21V10M19 21V10M9.500 21V10M14.500 21V10M2.500 10 12 4l9.500 6z"/>'],
    cinema: ["indigo", '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M16 5v14M3 10h5M3 14h5M16 10h5M16 14h5"/>'],
    livres: ["cyan", '<path d="M4 5.500A2.500 2.500 0 0 1 6.500 3H20v15H6.500A2.500 2.500 0 0 0 4 20.500zM4 20.500A2.500 2.500 0 0 0 6.500 21H20"/>'],
    jeux: ["jaune", '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01"/>'],
    patrimoine: ["bleu", '<path d="M5 21V8L4 7V3h3v2h3V3h4v2h3V3h3v4l-1 1v13zM10 21v-4a2 2 0 0 1 4 0v4"/>'],
    gastronomie: ["orange", '<path d="M7 3h10l-.6 5.500a4.400 4.400 0 0 1-8.800 0zM12 13v8M8 21h8"/>'],
    sport: ["vert", '<circle cx="13" cy="4.500" r="1.500"/><path d="m9 21 2-6-2-3 1-4 4 1 2 3 3 1M7 11l3-3M13 15l2 6"/>'],
    nature: ["vert", '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15zM5 19l9-9"/>'],
    sciences: ["cyan", '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.800 3h10.400A2 2 0 0 0 19 18l-5-9V3M7.500 15h9"/>'],
    bienetre: ["vert", '<circle cx="12" cy="5" r="2"/><path d="M12 9v5M6 13c2-1 4-3 6-4 2 1 4 3 6 4M5 19c2-2 5-2 7-2s5 0 7 2"/>'],
    militant: ["rouge", '<path d="M4 10v4h3l8 4V6l-8 4zM18 9.500a3.500 3.500 0 0 1 0 5M8 14v5h3"/>'],
    solidaire: ["rose", '<path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.300a4.300 4.300 0 0 1 7.500 2.500C19.500 15.400 12 20 12 20z"/>'],
    pro: ["violet", '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'],
    atelier: ["jaune", '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>'],
    conference: ["indigo", '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>'],
    visite: ["bleu", '<circle cx="12" cy="12" r="9"/><path d="m15.500 8.500-2 5-5 2 2-5z"/>'],
    fete: ["rose", '<path d="M5 4h14l-7 8zM12 12v8M8 20h8"/>'],
    festival: ["orange", '<path d="M3 20 12 4l9 16zM12 4v16M9 20c0-3 1.200-5 3-6 1.800 1 3 3 3 6"/>'],
    marche: ["jaune", '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>'],
    famille: ["cyan", '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.500 14.500c2 2 5 2 7 0"/>'],
    etudiants: ["indigo", '<path d="M2 9l10-5 10 5-10 5zM6 11.500V16c3 2.500 9 2.500 12 0v-4.500M22 9v6"/>'],
    seniors: ["bleu", '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c.8-3.500 3.500-5.500 6.500-5.500s5.700 2 6.500 5.500M16 4.800a3.500 3.500 0 0 1 0 6.400M18 14.800c1.800.800 3 2.600 3.500 5.200"/>'],
    autre: ["violet", '<path d="M12 3l2.200 6.800L21 12l-6.800 2.200L12 21l-2.200-6.800L3 12l6.800-2.200z"/>'],
  };
  const look = (id) => CAT_LOOK[id] || CAT_LOOK.autre;
  const catIcon = (id) => icon(look(id)[1]);

  // Les dates des événements sont des heures murales de Paris : on compare avec « maintenant à Paris ».
  const parisFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const nowParis = () => parisFmt.format(new Date()).replace(" ", "T").replace("T24:", "T00:");
  const dayOf = (s) => s.slice(0, 10);
  const asDate = (day) => new Date(`${dayOf(day)}T12:00:00Z`);
  const addDays = (day, n) => {
    const d = asDate(day);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const minutesBetween = (a, b) => (Date.parse(`${b.padEnd(16, "T00:00")}:00Z`) - Date.parse(`${a.padEnd(16, "T00:00")}:00Z`)) / 60000;
  const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const fmtShort = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const fmtWeekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
  const fmtDayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
  const fmtTiny = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const hour = (s) => (s && s.length > 10 ? `${+s.slice(11, 13)}h${s.slice(14, 16) === "00" ? "" : s.slice(14, 16)}` : null);
  const dayLabel = (day) => {
    const t = dayOf(nowParis());
    if (day === t) return "Aujourd'hui";
    if (day === addDays(t, 1)) return "Demain";
    return fmtLong.format(asDate(day));
  };
  const distance = (a, b) => {
    const rad = Math.PI / 180;
    const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  const km = (d) => (d < 1 ? `${Math.round(d * 100) * 10} m` : `${d.toFixed(1).replace(".", ",")} km`);
  const ago = (iso) => {
    const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return "à l'instant";
    if (m < 60) return `il y a ${m} min`;
    return `il y a ${Math.round(m / 60)} h`;
  };

  // ---------- Préférences (stockées sur l'appareil) ----------
  const STORE = "jcb:v1";
  const DEFAULTS = { home: null, places: [], placeId: null, car: null, useGps: false, mode: "explore", compact: true, wish: [], seen: [], tastes: { cats: {}, like: [], block: [], moments: [], maxKm: 3, sourcesOff: [] } };
  const prefs = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
      return { ...DEFAULTS, ...saved, tastes: { ...DEFAULTS.tastes, ...(saved.tastes || {}) } };
    } catch {
      return structuredClone(DEFAULTS);
    }
  })();
  prefs.wish = Array.isArray(prefs.wish) ? [...prefs.wish] : [];
  prefs.seen = Array.isArray(prefs.seen) ? [...prefs.seen] : [];
  // Lieux enregistrés (Maison, Travail…) : l'ancienne adresse unique devient le premier d'entre eux.
  prefs.places = Array.isArray(prefs.places) ? [...prefs.places] : [];
  if (prefs.home && !prefs.places.length) {
    prefs.places.push({ id: "maison", name: "Maison", label: prefs.home.label, lat: prefs.home.lat, lng: prefs.home.lng });
    prefs.placeId = "maison";
  }
  prefs.home = null;
  const activePlace = () => prefs.places.find((p) => p.id === prefs.placeId) || prefs.places[0] || null;
  const placeOrigin = (p) => p && { lat: p.lat, lng: p.lng, label: `${p.name} (${p.label})` };
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs));
    } catch {
      /* navigation privée : les réglages ne survivent pas à la session */
    }
  };

  const state = {
    events: [], categories: [], sources: [], generatedAt: null, refreshing: false,
    range: "7j", view: "agenda", search: "", cats: new Set(),
    type: "", source: "", sort: "heure",
    toggles: { free: false, near: false, tram: false },
    limit: 120, gps: null, temp: null, open: null,
  };

  const MOMENTS = [
    { id: "matin", label: "Matin", from: 6, to: 12 },
    { id: "aprem", label: "Après-midi", from: 12, to: 18 },
    { id: "soir", label: "Soirée", from: 18, to: 23 },
    { id: "nuit", label: "Nuit", from: 23, to: 30 },
  ];
  // Les trois axes du classement : de quoi ça parle, comment on y prend part, pour qui.
  const KINDS = [
    { id: "theme", label: "Thèmes", hint: "De quoi ça parle." },
    { id: "format", label: "Formats", hint: "Comment on y prend part." },
    { id: "public", label: "Publics", hint: "À qui ça s'adresse en particulier." },
  ];
  const RANGES = [
    { id: "auj", label: "Aujourd'hui" },
    { id: "demain", label: "Demain" },
    { id: "we", label: "Ce week-end" },
    { id: "7j", label: "Aujourd'hui → 7 jours" },
    { id: "30j", label: "Aujourd'hui → 30 jours" },
    { id: "tout", label: "Toutes les dates" },
  ];
  const SORTS = [
    { id: "heure", label: "Par heure" },
    { id: "pertinent", label: "Plus pertinent" },
    { id: "proche", label: "Plus proche" },
  ];
  const RADII = [1, 2, 3, 5, 10, 20];

  // Point de départ : adresse ponctuelle > GPS (si choisi) > adresse enregistrée > GPS.
  const origin = () => state.temp || (prefs.useGps && state.gps) || placeOrigin(activePlace()) || state.gps || null;
  const cat = (id) => state.categories.find((c) => c.id === id) || { id, label: id, axe: "jaune" };
  const axeOf = (e) => cat(e.categories[0]).axe;
  const hueOf = (e) => look(e.categories[0])[0];
  const hasTastes = () => Object.values(prefs.tastes.cats).some((v) => v === 1) || prefs.tastes.like.length > 0;

  // ---------- Ma liste ----------
  // On garde une copie de chaque événement mis de côté : il reste retrouvable même si son identifiant
  // change à une actualisation, ou s'il disparaît des sources une fois passé.
  const isWished = (e) => prefs.wish.some((w) => w.id === e.id);
  function findLive(w) {
    const byId = state.events.find((x) => x.id === w.id);
    if (byId) return byId;
    const same = state.events.filter((x) => fold(x.title) === w.key);
    if (same.length <= 1) return same[0] || null;
    // plusieurs événements portent ce titre : on ne raccroche que si le lieu concorde
    return same.find((x) => fold(x.venue || x.city || "") === fold(w.venue)) || null;
  }
  const snapshot = (e) => ({ id: e.id, key: fold(e.title), title: e.title, start: e.start, venue: e.venue || e.city || "", url: e.url });
  function toggleWish(id) {
    const e = state.events.find((x) => x.id === id);
    const i = prefs.wish.findIndex((w) => w.id === id);
    if (i >= 0) prefs.wish.splice(i, 1);
    else if (e) prefs.wish.push({ ...snapshot(e), addedAt: Date.now() });
    save();
  }
  // Après chaque chargement : on raccroche les entrées aux événements du jour et on rafraîchit leur copie.
  function relinkWish() {
    let changed = false;
    for (const w of prefs.wish) {
      const e = findLive(w);
      if (e && (e.id !== w.id || e.start !== w.start)) {
        Object.assign(w, snapshot(e));
        changed = true;
      }
    }
    if (changed) save();
  }
  const wishButton = (e, cls = "wish") => {
    const on = isWished(e);
    const label = on ? "Retirer de ma liste" : "Ajouter à ma liste";
    const text = cls === "wish" ? ICONS.heart : `<span class="act__ico">${on ? "♥" : "♡"}</span><span>${on ? "Sauvegardé" : "Sauvegarder"}</span>`;
    return `<button class="${cls}" type="button" data-wish="${e.id}" aria-pressed="${on}" aria-label="${label} : ${esc(e.title)}" title="${label}">${text}</button>`;
  };

  // ---------- Carnet de présence ----------
  // Comme une capture : on ne valide un événement qu'en y étant (GPS à moins de 300 m), autour de son horaire.
  const CHECKIN_KM = 0.300;
  const isSeen = (e) => prefs.seen.some((w) => w.id === e.id || w.key === fold(e.title));
  function checkinBlock(e, slot) {
    if (isSeen(e)) return `<div class="checkin is-done"><strong>✓ Dans ton carnet</strong><span>Tu y étais.</span></div>`;
    if (!e.precise || e.lat == null) return "";
    const now = nowParis();
    const timed = slot.start.length > 10;
    const open = e.period ? e.period.start <= dayOf(now) && e.period.end >= dayOf(now)
      : timed ? minutesBetween(now, slot.start) <= 45 && minutesBetween(slot.end && slot.end > slot.start ? slot.end : slot.start, now) <= (slot.end && slot.end > slot.start ? 0 : 180)
      : dayOf(slot.start) === dayOf(now);
    if (!open) return `<div class="checkin"><strong>Carnet de sorties</strong><span>Le moment venu, valide ta présence sur place pour l'ajouter à ton carnet.</span></div>`;
    if (!state.gps) return `<div class="checkin"><strong>C'est maintenant</strong><span>Active ta position pour valider ta présence sur place.</span><button class="btn btn--vert btn--small" type="button" data-action="gps">Activer ma position</button></div>`;
    const d = distance(state.gps, e);
    return d <= CHECKIN_KM
      ? `<div class="checkin is-here"><strong>Tu y es !</strong><span>À ${km(d)} du lieu.</span><button class="btn btn--rose btn--small" type="button" data-action="checkin">J'y suis — ajouter au carnet</button></div>`
      : `<div class="checkin"><strong>C'est maintenant</strong><span>Tu es à ${km(d)}. Approche-toi à moins de 300 m pour valider ta présence.</span><button class="btn btn--small" type="button" data-action="gps">Actualiser ma position</button></div>`;
  }
  function logbookHtml() {
    if (!prefs.seen.length) return "";
    const rows = [...prefs.seen].sort((a, b) => b.at - a.at).map((w) => `<div class="gone__row"><span><strong>${esc(w.title)}</strong><small>${esc(fmtShort.format(asDate(w.start)))}${w.venue ? " · " + esc(w.venue) : ""}</small></span>${w.url ? `<a class="btn btn--small" href="${esc(w.url)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</div>`).join("");
    return `<div class="day panel"><div class="day__head">${ICONS.calendar}<h2>Carnet de sorties</h2><p class="muted">${prefs.seen.length} événement${prefs.seen.length > 1 ? "s" : ""} où tu as validé ta présence sur place.</p></div><div class="gone">${rows}</div></div>`;
  }

  // Bascule entre la carte (Explorer) et l'agenda complet (Liste).
  function setMode(mode, view) {
    prefs.mode = mode;
    save();
    document.body.dataset.mode = mode;
    for (const b of document.querySelectorAll(".modeswitch button")) b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    if (view) state.view = view;
    scrollTo(0, 0);
    render();
  }

  // ---------- Filtrage et pertinence ----------
  function haystack(e) {
    return (e._text ||= fold([e.title, e.venue, e.city, e.address, e.description, e.tags.join(" "), e.categories.map((c) => cat(c).label).join(" ")].join(" ")));
  }

  // Recherche par mots, pas par sous-chaîne : « rap » ne doit pas trouver « photographie » ni « rapport ».
  // Un terme court (3 lettres ou moins) doit être un mot entier ; un terme plus long peut en être le début
  // (« expo » trouve « exposition »). Quelques genres ont des équivalents qu'on cherche en même temps.
  const ALSO = {
    rap: ["hip.?hop", "rappeu\\w*", "trap", "drill"],
    "hip-hop": ["rap", "hip.?hop", "rappeu\\w*"],
    hiphop: ["rap", "hip.?hop", "rappeu\\w*"],
    electro: ["techno", "house", "dj"],
    techno: ["electro\\w*", "house"],
    theatre: ["comedie"],
    expo: ["vernissage"],
    enfant: ["enfants", "jeune public", "famille\\w*"],
    velo: ["cyclo\\w*", "bicyclette"],
  };
  const termCache = new Map();
  function termRe(raw) {
    const term = fold(raw).trim();
    if (!termCache.has(term)) {
      const literal = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      const self = term.length <= 3 ? literal : `${literal}\\w*`;
      termCache.set(term, new RegExp(`(?<![a-z0-9])(?:${[self, ...(ALSO[term] || [])].join("|")})(?![a-z0-9])`));
    }
    return termCache.get(term);
  }
  const says = (text, term) => termRe(term).test(text);
  const searchTerms = () => fold(state.search).split(/\s+/).filter(Boolean);

  function score(e, start) {
    const t = prefs.tastes;
    let s = 0;
    s += Math.min(6, e.categories.filter((c) => t.cats[c] === 1).length * 3);
    const text = haystack(e);
    for (const w of t.like) if (says(text, w)) s += 4;
    // en recherche, un terme trouvé dans le titre pèse plus qu'une mention dans la description
    for (const w of searchTerms()) if (says(fold(e.title), w)) s += 2;
    if (start && start.length > 10 && t.moments.length) {
      const h = +start.slice(11, 13);
      const hh = h < 6 ? h + 24 : h;
      if (MOMENTS.some((m) => t.moments.includes(m.id) && hh >= m.from && hh < m.to)) s += 1;
    }
    s += Math.min(1, (e.sources.length - 1) * 0.500);
    const o = origin();
    if (o && e.precise && e.lat != null) {
      const d = distance(o, e);
      if (d <= 1) s += 1;
      else if (d <= 3) s += 0.500;
    }
    return s;
  }

  function matches(e) {
    const t = prefs.tastes;
    if (e.sources.every((s) => t.sourcesOff.includes(s.id))) return false;
    if (state.cats.size && !e.categories.some((c) => state.cats.has(c))) return false;
    if (state.type && !e.categories.includes(state.type)) return false;
    if (state.source && !e.sources.some((s) => s.id === state.source)) return false;
    // une catégorie masquée n'écarte l'événement que s'il n'en a pas d'autre qu'on aime
    if (e.categories.every((c) => t.cats[c] === -1)) return false;
    if (e.categories.some((c) => t.cats[c] === -1) && !e.categories.some((c) => t.cats[c] === 1)) return false;
    const text = haystack(e);
    if (t.block.some((w) => says(text, w))) return false;
    if (!searchTerms().every((w) => says(text, w))) return false;
    if (state.toggles.free && !e.free) return false;
    if (state.toggles.tram && !e.stop?.tram) return false;
    if (state.toggles.near) {
      const o = origin();
      if (!o || !e.precise || e.lat == null || distance(o, e) > t.maxKm) return false;
    }
    return true;
  }

  function bounds(range) {
    const now = nowParis();
    const t = dayOf(now);
    if (range === "auj") return [t, t];
    if (range === "demain") return [addDays(t, 1), addDays(t, 1)];
    if (range === "7j") return [t, addDays(t, 6)];
    if (range === "30j") return [t, addDays(t, 29)];
    if (range === "we") {
      const dow = asDate(t).getUTCDay(); // 0 = dimanche
      if (dow === 0) return [t, t];
      if (dow === 6) return [t, addDays(t, 1)];
      const friday = addDays(t, 5 - dow);
      return [friday, addDays(friday, 2)];
    }
    return [t, "9999-12-31"];
  }

  // Un événement à plusieurs séances apparaît à chaque jour de la période où il a lieu.
  // Une séance est révolue une fois finie, ou trois heures après son début quand la fin est inconnue.
  function isPast(o, now = nowParis()) {
    if (o.start.length <= 10) return false;
    const ends = o.end && o.end > o.start;
    return minutesBetween(ends ? o.end : o.start, now) > (ends ? 0 : 180);
  }

  function slots(range) {
    const now = nowParis();
    const [from, to] = bounds(range);
    const out = [];
    for (const e of state.events) {
      if (e.ongoing || !matches(e)) continue;
      const byDay = new Map();
      for (const o of [{ start: e.start, end: e.end }, ...e.occurrences]) {
        const day = dayOf(o.start);
        if (day < from || day > to) continue;
        // le « week-end » ne commence que le vendredi soir
        if (range === "we" && asDate(day).getUTCDay() === 5 && o.start.length > 10 && +o.start.slice(11, 13) < 18) continue;
        const past = isPast(o, now);
        const kept = byDay.get(day);
        // par jour : la première séance encore à venir ; à défaut, la dernière déjà passée
        if (!kept || kept.past) byDay.set(day, { e, start: o.start, end: o.end, day, past, score: score(e, o.start) });
      }
      const list = [...byDay.values()];
      out.push(...(range === "tout" ? list.slice(0, 2) : list));
    }
    return out;
  }

  const byTime = (a, b) => {
    const at = a.start.length > 10, bt = b.start.length > 10;
    if (at !== bt) return at ? -1 : 1; // sans heure : en fin de journée
    return a.start.localeCompare(b.start) || b.score - a.score;
  };

  // ---------- Rendu ----------
  function whenLabel(slot) {
    const { e, start, end } = slot;
    if (e.period && start.length <= 10) return `Du ${fmtTiny.format(asDate(e.period.start))} au ${fmtTiny.format(asDate(e.period.end))}`;
    const h = hour(start);
    if (!h) return "Dans la journée";
    const endH = end && dayOf(end) === dayOf(start) ? hour(end) : null;
    return endH ? `${h} – ${endH}` : h;
  }

  function soonLabel(slot) {
    const now = nowParis();
    const mins = minutesBetween(now, slot.start);
    const t = dayOf(now);
    if (mins <= 0) return { text: "En cours", live: true };
    if (mins < 60) return { text: `Dans ${Math.round(mins)} min`, live: false };
    const h = hour(slot.start);
    if (slot.day === t) return { text: `${+slot.start.slice(11, 13) >= 18 ? "Ce soir" : "Aujourd'hui"} · ${h}`, live: false };
    return { text: `${dayLabel(slot.day)} · ${h}`, live: false };
  }

  function placeLine(e) {
    const o = origin();
    const where = [e.venue, e.city && !fold(e.venue || "").includes(fold(e.city)) ? e.city : null].filter(Boolean).join(" · ") || "Lieu à préciser";
    const d = o && e.precise && e.lat != null ? ` · ${km(distance(o, e))}` : "";
    return esc(where) + d;
  }

  const media = (e) => {
    const img = e.image ? `<img src="${esc(e.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
    return `<span class="card__media" aria-hidden="true">${catIcon(e.categories[0])}${img}</span>`;
  };

  function card(slot) {
    const { e } = slot;
    const tags = e.categories.slice(0, 2).map((c) => `<span class="tag tag--cat">${esc(cat(c).label)}</span>`);
    tags.push(priceTag(e));
    if (e.ageMin != null) tags.push(`<span class="tag">dès ${e.ageMin} an${e.ageMin > 1 ? "s" : ""}</span>`);
    if (e.status) tags.unshift(`<span class="tag tag--status">${esc(e.status)}</span>`);
    if (hasTastes() && slot.score >= 3) tags.unshift('<span class="tag tag--you">Pour toi</span>');
    for (const l of (e.stop?.lines || []).slice(0, 2)) tags.push(`<span class="tag tag--line" style="--line:${esc(l.color)}" title="Arrêt ${esc(e.stop.name)} à ${e.stop.distance} m">${esc(l.name)}</span>`);
    const more = e.occurrences.length ? `<span class="tag">+${e.occurrences.length} date${e.occurrences.length > 1 ? "s" : ""}</span>` : "";
    const src = e.sources.length > 1 ? `<span class="tag" title="${esc(e.sources.map((s) => s.name).join(", "))}">${e.sources.length} sources</span>` : `<span class="tag">${esc(e.sources[0].name)}</span>`;
    // le cœur est un bouton voisin de la carte : pas de bouton dans un bouton
    return `<div class="cardwrap${slot.past ? " is-past" : ""}${isWished(e) ? " is-wished" : ""}"><button class="card" type="button" data-id="${e.id}" data-start="${slot.start}" data-c="${hueOf(e)}">
      ${media(e)}
      <span class="card__body">
        <span class="card__when">${slot.past ? "Terminé · " : ""}${esc(whenLabel(slot))}</span>
        <span class="card__title">${esc(e.title)}</span>
        <span class="card__place">${placeLine(e)}</span>
      </span>
      <span class="card__tags">${tags.join("")}${more}${src}</span>
    </button>${wishButton(e)}</div>`;
  }

  // Le tarif n'est étiqueté que si la source le dit : ni « gratuit » ni « payant » par défaut.
  const priceTag = (e) => (e.free ? '<span class="tag tag--free">Gratuit</span>' : e.priceLibre ? '<span class="tag tag--free">Prix libre</span>' : e.price ? `<span class="tag tag--paid" title="${esc(e.price)}">Payant</span>` : "");

  // Temps de trajet estimé depuis le point de départ : à pied jusqu'à 2 km, à vélo au-delà.
  // La distance est à vol d'oiseau, majorée de 30 % pour le détour des rues.
  function travel(d) {
    const byFoot = d <= 2;
    const mins = Math.max(1, Math.round(((d * 1.300) / (byFoot ? 4.500 : 15)) * 60));
    return { ico: byFoot ? ICONS.walk : ICONS.bike, text: `≈ ${mins} min`, title: `Estimation ${byFoot ? "à pied" : "à vélo"}, d'après la distance à vol d'oiseau` };
  }
  const shortDay = (day) => {
    const l = dayLabel(day);
    return l === "Aujourd'hui" || l === "Demain" ? l : fmtShort.format(asDate(day));
  };

  function row(slot) {
    const { e } = slot;
    const o = origin();
    const d = o && e.precise && e.lat != null ? distance(o, e) : null;
    const tags = [];
    if (e.status) tags.push(`<span class="tag tag--status">${esc(e.status)}</span>`);
    if (hasTastes() && slot.score >= 3) tags.push('<span class="tag tag--you">Pour toi</span>');
    tags.push(`<span class="tag tag--cat">${esc(cat(e.categories[0]).label)}</span>`, priceTag(e));
    const where = [e.venue, e.city && !fold(e.venue || "").includes(fold(e.city)) ? e.city : null].filter(Boolean).join(" · ") || "Lieu à préciser";
    const img = e.image ? `<img src="${esc(e.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
    const t = d != null ? travel(d) : null;
    const when = e.period && slot.start.length <= 10 ? whenLabel(slot) : `${shortDay(slot.day)} · ${whenLabel(slot)}`;
    return `<div class="rowwrap${slot.past ? " is-past" : ""}${isWished(e) ? " is-wished" : ""}" data-c="${hueOf(e)}"><button class="row" type="button" data-id="${e.id}" data-start="${slot.start}">
      <span class="row__media" aria-hidden="true">${catIcon(e.categories[0])}${img}</span>
      <span class="row__main"><span class="row__title">${esc(e.title)}</span><span class="row__place">${ICONS.pin}<span>${esc(where)}</span></span></span>
      <span class="row__tags">${tags.join("")}</span>
      <span class="row__fact row__when">${ICONS.clock}<span>${slot.past ? "Terminé · " : ""}${esc(when)}</span></span>
      ${d != null ? `<span class="row__fact row__dist">${ICONS.pin}<span>${km(d)}</span></span><span class="row__fact row__walk" title="${t.title}">${t.ico}<span>${t.text}</span></span>` : ""}
      <span class="row__go" aria-hidden="true">${ICONS.arrow}</span>
    </button>${wishButton(e)}</div>`;
  }
  const listOf = (items, past = false) => (prefs.compact ? `<div class="rows">${items.map(row).join("")}</div>` : `<div class="grid${past ? " grid--past" : ""}">${items.map(card).join("")}</div>`);
  const dayHead = (title, hint, extra = "") => `<div class="day__head">${ICONS.calendar}<h2>${title}</h2>${hint}${extra}</div>`;

  function renderSoon() {
    const now = nowParis();
    const t = dayOf(now);
    const pool = slots("7j").filter((s) => !s.past && s.e.status !== "Annulé" && s.start.length > 10 && minutesBetween(now, s.start) > -30);
    const mine = hasTastes();
    let picks = pool.filter((s) => s.day === t).sort(byTime);
    if (picks.length < 6) picks = pool.filter((s) => s.day <= addDays(t, 1)).sort(byTime);
    // avec des goûts renseignés, ce qui te correspond passe devant à heure proche
    if (mine) picks = picks.slice(0, 40).sort((a, b) => (b.score >= 3) - (a.score >= 3) || byTime(a, b));
    // ce que tu as mis dans ta liste et qui commence aujourd'hui ou demain passe en tête
    const wished = pool.filter((s) => s.day <= addDays(t, 1) && isWished(s.e)).sort(byTime);
    picks = [...wished, ...picks.filter((s) => !wished.includes(s))];
    picks = picks.slice(0, 14);
    $("#soonHint").textContent = picks.length ? (mine ? "Tes goûts d'abord, puis le reste par heure." : "Les prochains départs, toutes sources confondues.") : "";
    $("#soonRail").innerHTML = picks.length
      ? picks.map((s) => {
          const l = soonLabel(s);
          const img = s.e.image ? `<img src="${esc(s.e.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
          return `<div class="herowrap${isWished(s.e) ? " is-wished" : ""}" data-c="${hueOf(s.e)}"><button class="hero" type="button" data-id="${s.e.id}" data-start="${s.start}">
            ${img}<span class="hero__glyph" aria-hidden="true">${catIcon(s.e.categories[0])}</span>
            <span class="hero__when${l.live ? " is-live" : ""}">${ICONS.calendar}${esc(l.text)}</span>
            <span class="hero__tag">${esc(cat(s.e.categories[0]).label)}</span>
            <span class="hero__title">${esc(s.e.title)}</span>
            <span class="hero__meta">${ICONS.pin}<span>${placeLine(s.e)}</span></span>
          </button>${wishButton(s.e)}</div>`;
        }).join("")
      : '<p class="rail__empty">Rien d\'imminent avec ces filtres. Élargis la période ou desserre tes goûts.</p>';
  }

  function renderControls() {
    const counts = {};
    for (const e of state.events) for (const c of e.categories) counts[c] = (counts[c] || 0) + 1;
    const t = prefs.tastes;
    const shown = (kinds) => state.categories
      .filter((c) => kinds.includes(c.kind) && counts[c.id] && t.cats[c.id] !== -1)
      .sort((x, y) => (t.cats[y.id] === 1) - (t.cats[x.id] === 1) || counts[y.id] - counts[x.id]);
    // la rangée porte les thèmes et les publics ; les formats (atelier, visite…) sont dans « Type »
    $("#catChips").innerHTML = `<button class="chip" type="button" data-cat="" aria-pressed="${!state.cats.size}">${ICONS.all}Tout</button>` + shown(["theme", "public"])
      .map((c) => `<button class="chip${t.cats[c.id] === 1 ? " is-loved" : ""}" type="button" data-cat="${c.id}" aria-pressed="${state.cats.has(c.id)}" title="${counts[c.id]} événements">${catIcon(c.id)}${esc(c.label)}</button>`).join("");

    const o = origin();
    const tg = state.toggles;
    const field = (ico, label, value, name, options) => `<label class="field-select">${ico}<span class="field-select__txt"><small>${label}</small><b>${esc(value)}</b></span>${ICONS.chevron}
      <select data-field="${name}" aria-label="${label.replace(" ?", "")}">${options.map(([v, l, on]) => `<option value="${esc(v)}"${on ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
    const radii = [...new Set([...RADII, t.maxKm])].sort((x, y) => x - y);
    const types = shown(["format"]);
    if (state.type && !types.some((c) => c.id === state.type)) state.type = "";
    const srcs = state.sources.filter((x) => x.kept && !t.sourcesOff.includes(x.id));
    if (state.source && !srcs.some((x) => x.id === state.source)) state.source = "";
    $("#fields").innerHTML = [
      field(ICONS.calendar, "Quand ?", RANGES.find((r) => r.id === state.range).label, "range", RANGES.map((r) => [r.id, r.label, r.id === state.range])),
      field(ICONS.pin, "Où ?", tg.near ? `Autour de moi (${t.maxKm} km)` : "Dijon et alentours", "near", [["", "Dijon et alentours", !tg.near], ...radii.map((r) => [r, `Autour de moi (${r} km)`, tg.near && r === t.maxKm])]),
      field(ICONS.tag, "Type", state.type ? cat(state.type).label : "Tous", "type", [["", "Tous", !state.type], ...types.map((c) => [c.id, `${c.label} (${counts[c.id]})`, c.id === state.type])]),
      field(ICONS.nodes, "Source", state.source ? srcs.find((x) => x.id === state.source).name : "Toutes les sources", "source", [["", "Toutes les sources", !state.source], ...srcs.map((x) => [x.id, `${x.name} (${x.kept})`, x.id === state.source])]),
      `<button class="field-select field-switch" type="button" data-action="compact" aria-pressed="${!!prefs.compact}"><span class="field-switch__ico">${ICONS.bolt}</span><span class="field-select__txt"><small>Accès rapide</small><b>Infos essentielles d'abord</b></span><span class="switch"></span></button>`,
    ].join("");
    const n = Object.values(t.cats).filter(Boolean).length + t.like.length + t.block.length + t.moments.length + t.sourcesOff.length + tg.free + tg.tram;
    $("#tastesCount").hidden = !n;
    $("#tastesCount").textContent = n;
    for (const tab of document.querySelectorAll(".views button")) tab.setAttribute("aria-selected", String(tab.dataset.view === state.view));
    $("#wishCount").textContent = prefs.wish.length ? `(${prefs.wish.length})` : "";
    $("#ongoingCount").textContent = `(${state.events.filter((e) => e.ongoing && matches(e)).length})`;
    $("#sourcesCount").textContent = `(${state.sources.filter((s) => s.kept).length}/${state.sources.length})`;
    $("#originBtn").classList.toggle("is-set", !!o);
    $("#originLabel").textContent = o ? `Départ : ${o.label}` : "Définir mon point de départ";
  }

  function renderAgenda() {
    const root = $("#agenda");
    if (!state.events.length) {
      root.innerHTML = `<div class="empty"><h3>${state.refreshing ? "Premier passage sur les sources…" : "Aucun événement en mémoire"}</h3><p class="muted">${state.refreshing ? "Compte une trentaine de secondes, la page se met à jour toute seule." : "Lance une actualisation depuis le bandeau."}</p></div>`;
      return;
    }
    if (state.view === "sources") return renderSources(root);
    if (state.view === "wish") {
      renderWish(root);
      return root.insertAdjacentHTML("beforeend", logbookHtml());
    }
    if (state.view === "ongoing") {
      const list = state.events.filter((e) => e.ongoing && matches(e)).map((e) => ({ e, start: dayOf(e.start), end: e.end, day: dayOf(e.start), score: score(e, null) }));
      list.sort((a, b) => (state.sort === "pertinent" ? b.score - a.score : 0) || a.e.period.end.localeCompare(b.e.period.end));
      const block = (title, hint, items) =>
        items.length ? `<div class="day panel">${dayHead(title, `<p class="muted">${hint}</p>`)}${listOf(items)}</div>` : "";
      root.innerHTML = list.length
        ? block("En ce moment", "Expositions, festivals et rendez-vous en cours, par date de fin.", list.filter((s) => !s.e.permanent)) +
          block("Toute l'année", "Visites et offres permanentes : pas d'urgence, elles seront encore là.", list.filter((s) => s.e.permanent))
        : emptyState();
      return;
    }
    // une recherche porte sur toutes les dates : on cherche un artiste, pas « un artiste cette semaine »
    const searching = searchTerms().length > 0;
    const all = slots(searching ? "tout" : state.range);
    if (!all.length) {
      root.innerHTML = emptyState();
      return;
    }
    const found = new Set(all.map((s) => s.e.id)).size;
    let html = searching ? `<p class="muted" style="margin-bottom:16px">${found} événement${found > 1 ? "s" : ""} pour « ${esc(state.search.trim())} », toutes dates confondues.</p>` : "";
    const days = new Map();
    for (const s of all) {
      if (!days.has(s.day)) days.set(s.day, []);
      days.get(s.day).push(s);
    }
    let shown = 0;
    const o = origin();
    const far = (x) => (o && x.e.precise && x.e.lat != null ? distance(o, x.e) : Infinity);
    const order = state.sort === "pertinent" ? (a, b) => b.score - a.score || byTime(a, b) : state.sort === "proche" ? (a, b) => far(a) - far(b) || byTime(a, b) : byTime;
    const sorter = `<span class="sort">Trier par <label class="field-select"><b>${SORTS.find((x) => x.id === state.sort).label}</b>${ICONS.chevron}<select data-field="sort" aria-label="Trier par">${SORTS.map((x) => `<option value="${x.id}"${x.id === state.sort ? " selected" : ""}>${x.label}</option>`).join("")}</select></label></span>`;
    const today = dayOf(nowParis());
    let first = true;
    for (const day of [...days.keys()].sort()) {
      if (shown >= state.limit) break;
      const ahead = days.get(day).filter((s) => !s.past).sort(order);
      const gone = days.get(day).filter((s) => s.past).sort(byTime);
      const list = ahead.slice(0, state.limit - shown);
      shown += list.length + gone.length;
      const near = day === today || day === addDays(today, 1);
      const title = `${esc(near ? dayLabel(day) : fmtWeekday.format(asDate(day)))} <i>•</i> ${esc(fmtDayMonth.format(asDate(day)))}`;
      const hint = `<span class="day__count">${ahead.length} événement${ahead.length > 1 ? "s" : ""}</span>${gone.length ? `<span class="muted">${gone.length} déjà passé${gone.length > 1 ? "s" : ""}</span>` : ""}`;
      html += `<div class="day panel">${dayHead(title, hint, first ? sorter : "")}
        ${list.length ? listOf(list) : `<p class="muted" style="padding:6px 0 12px">Plus rien à venir ce jour-là.</p>`}
        ${gone.length ? `<p class="pastlabel">Déjà passé</p>${listOf(gone, true)}` : ""}</div>`;
      first = false;
    }
    if (shown < all.length) html += `<div class="more"><button class="btn btn--ink" type="button" id="moreBtn">Afficher la suite (${all.length - shown} restants)</button></div>`;
    root.innerHTML = html;
  }

  // Ma liste ignore les filtres et les goûts : ce que tu as mis de côté s'affiche toujours.
  function renderWish(root) {
    if (!prefs.wish.length) {
      root.innerHTML = `<div class="empty"><h3>Ta liste est vide</h3><p class="muted">Touche le ♥ d'un événement pour le mettre de côté. Il restera ici, enregistré sur cet appareil.</p></div>`;
      return;
    }
    const live = [];
    const gone = [];
    for (const w of prefs.wish) {
      const e = findLive(w);
      if (e) live.push({ e, start: e.start, end: e.end, day: dayOf(e.start), score: 0, past: isPast(e) });
      else gone.push(w);
    }
    const days = new Map();
    for (const s of live.filter((s) => !s.e.ongoing).sort(byTime)) {
      if (!days.has(s.day)) days.set(s.day, []);
      days.get(s.day).push(s);
    }
    const n = prefs.wish.length;
    let html = `<p class="muted" style="margin-bottom:16px">${n} événement${n > 1 ? "s" : ""} mis de côté, du plus proche au plus lointain.</p>`;
    for (const day of [...days.keys()].sort()) {
      html += `<div class="day panel">${dayHead(esc(dayLabel(day)), `<p class="muted">${esc(fmtShort.format(asDate(day)))}</p>`)}${listOf(days.get(day))}</div>`;
    }
    const ongoing = live.filter((s) => s.e.ongoing).map((s) => ({ ...s, start: dayOf(s.e.start) }));
    if (ongoing.length) {
      ongoing.sort((a, b) => a.e.period.end.localeCompare(b.e.period.end));
      html += `<div class="day panel">${dayHead("En ce moment", '<p class="muted">par date de fin</p>')}${listOf(ongoing)}</div>`;
    }
    if (gone.length) {
      const rows = gone
        .sort((a, b) => b.start.localeCompare(a.start))
        .map((w) => `<div class="gone__row"><span><strong>${esc(w.title)}</strong><small>${esc(fmtShort.format(asDate(w.start)))}${w.venue ? " · " + esc(w.venue) : ""}</small></span>
          <span class="linkrow">${w.url ? `<a class="btn btn--small" href="${esc(w.url)}" target="_blank" rel="noopener">Source ↗</a>` : ""}<button class="btn btn--small" type="button" data-wish="${esc(w.id)}">Retirer</button></span></div>`)
        .join("");
      html += `<div class="day panel">${dayHead("Passés ou retirés", '<p class="muted">Ils ne sont plus dans les sources.</p>')}<div class="gone">${rows}</div></div>`;
    }
    root.innerHTML = html;
  }

  const emptyState = () =>
    `<div class="empty"><h3>Rien ne correspond</h3><p class="muted">Essaie une période plus large, retire un filtre, ou revois les catégories masquées dans « Mes goûts ».</p></div>`;

  function renderSources(root) {
    const off = prefs.tastes.sourcesOff;
    root.innerHTML = `<div class="day panel"><div class="day__head">${ICONS.nodes}<h2>Sources</h2><p class="muted">D'où viennent les événements. Masque celles qui ne t'intéressent pas.</p></div><div class="sources">${state.sources
      .map((s) => {
        const down = !s.fetched;
        return `<article class="source${down ? " is-down" : ""}${off.includes(s.id) ? " is-off" : ""}">
          <h3><span>${esc(s.name)}</span><strong>${s.kept ?? 0}</strong></h3>
          <p>${esc(s.kind)}${down ? ` · <span class="source__err">${esc(s.error || "indisponible")}</span>` : ` · ${s.fetched} relevés`}</p>
          <div class="source__row"><a href="${esc(s.site)}" target="_blank" rel="noopener">Voir le site</a>
          <button class="btn btn--small" type="button" data-source="${s.id}" aria-pressed="${!off.includes(s.id)}">${off.includes(s.id) ? "Masquée" : "Affichée"}</button></div>
        </article>`;
      })
      .join("")}</div></div>`;
  }

  function renderStatus() {
    const el = $("#status");
    if (!state.generatedAt) {
      el.textContent = state.refreshing ? "Premier passage sur les sources…" : "Aucune donnée";
      return;
    }
    const live = state.sources.filter((s) => s.fetched).length;
    // hors connexion, le service worker rend le dernier agenda reçu : on le dit, et on n'offre pas d'actualiser
    if (state.offline) {
      el.innerHTML = `<span>Hors connexion · ${state.events.length} événements · agenda mis à jour ${esc(ago(state.generatedAt))}</span>
        <button type="button" data-action="reload">Réessayer</button>`;
      return;
    }
    el.innerHTML = `<span>${state.events.length} événements · ${live} sources actives sur ${state.sources.length} · mis à jour ${esc(ago(state.generatedAt))}</span>
      <button type="button" id="refreshBtn" ${state.refreshing ? "disabled" : ""}>${state.refreshing ? "Actualisation…" : "Actualiser"}</button>`;
  }

  function render() {
    renderStatus();
    renderControls();
    renderSoon();
    renderAgenda();
    window.JCBExplore?.render();
  }

  // ---------- Fiche événement et trajet ----------
  function gmaps(e, mode) {
    const numbered = e.address && /^\s*\d/.test(e.address);
    const dest = numbered || e.lat == null ? [e.address ? null : e.venue, e.address || e.city].filter(Boolean).join(", ") : `${e.lat},${e.lng}`;
    const p = new URLSearchParams({ api: "1", destination: dest, travelmode: mode });
    const o = origin();
    if (o) p.set("origin", `${o.lat},${o.lng}`); // sans origine, Google part de la position de l'appareil
    return `https://www.google.com/maps/dir/?${p}`;
  }

  // ---------- Agenda ----------
  // Heure murale de Paris -> instant UTC au format iCalendar ("20261010T183000Z").
  function utcStamp(wall) {
    const guess = Date.parse(`${wall.slice(0, 16)}:00Z`);
    const shown = Date.parse(`${parisFmt.format(new Date(guess)).replace(" ", "T").replace("T24:", "T00:")}:00Z`);
    return new Date(guess - (shown - guess)).toISOString().replace(/[-:]|\.\d{3}/g, "");
  }

  // Créneau à inscrire : sans heure, la journée entière (ou toute la période) ; sans heure de fin,
  // une heure par défaut, signalée dans la note. Rien pour une offre permanente sans horaire.
  function calendarEntry(slot) {
    const { e, start, end } = slot;
    const timed = start.length > 10;
    if (!timed && e.permanent) return null;
    const compact = (day) => day.replace(/-/g, "");
    let from, to, guessed = false;
    if (timed) {
      guessed = !(end && end.length > 10 && end > start);
      from = utcStamp(start);
      to = utcStamp(guessed ? new Date(Date.parse(`${start.slice(0, 16)}:00Z`) + 3600000).toISOString() : end);
    } else {
      from = compact(e.period ? e.period.start : slot.day);
      to = compact(addDays(e.period ? e.period.end : slot.day, 1)); // fin exclue
    }
    const priceText = e.free ? "Gratuit" : e.priceLibre ? "Prix libre" : e.price || "";
    const text = (e.description || "").replace(/\s+/g, " ").trim();
    const details = [
      guessed ? "Heure de fin non indiquée par la source : une heure mise par défaut." : "",
      priceText,
      e.booking ? "Sur inscription ou réservation." : "",
      text.length > 500 ? `${text.slice(0, 500)}…` : text,
      e.url,
    ].filter(Boolean).join("\n\n");
    return { e, timed, from, to, details, location: [e.venue, e.address || e.city].filter(Boolean).join(", ") };
  }

  function googleCalendar(c) {
    const p = new URLSearchParams({ action: "TEMPLATE", text: c.e.title, dates: `${c.from}/${c.to}`, details: c.details });
    if (c.location) p.set("location", c.location);
    return `https://calendar.google.com/calendar/render?${p}`;
  }

  // Fichier .ics : lu par Apple Calendrier, Outlook, Proton, Thunderbird…
  function downloadIcs(c) {
    const txt = (s) => String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
    const date = (k, v) => (c.timed ? `${k}:${v}` : `${k};VALUE=DATE:${v}`);
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jondi ca bouge//FR", "BEGIN:VEVENT",
      `UID:${c.e.id}-${c.from}@jondi-ca-bouge`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, "")}`,
      date("DTSTART", c.from), date("DTEND", c.to),
      `SUMMARY:${txt(c.e.title)}`,
      c.location ? `LOCATION:${txt(c.location)}` : "",
      `DESCRIPTION:${txt(c.details)}`,
      `URL:${c.e.url}`,
      "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean);
    // lignes repliées à 60 caractères (la norme en tolère 75 octets)
    const folded = lines.map((l) => Array.from(l).reduce((acc, ch, i) => acc + (i && i % 60 === 0 ? "\r\n " : "") + ch, ""));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([folded.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" }));
    a.download = `${fold(c.e.title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "evenement"}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function openEvent(id, start) {
    const e = state.events.find((x) => x.id === id);
    if (!e) return;
    const slot = { e, start: start || e.start, end: start && start !== e.start ? (e.occurrences.find((o) => o.start === start) || {}).end : e.end, day: dayOf(start || e.start) };
    state.open = { e, slot, mode: null };
    const sheet = $("#eventSheet");
    const dates = [{ start: e.start }, ...e.occurrences].filter((o) => o.start !== slot.start).slice(0, 12);
    const when = e.ongoing && slot.start.length <= 10 ? `Jusqu'au ${fmtLong.format(asDate(e.period.end))}` : `${dayLabel(slot.day)} · ${whenLabel(slot)}`;
    const byKind = (k) => e.categories.filter((c) => cat(c).kind === k).map((c) => cat(c).label);
    const fact = (ico, main, sub = "") => `<div class="fact">${ico}<div>${main}${sub ? `<small>${sub}</small>` : ""}</div></div>`;
    const priceText = e.free ? "Gratuit" : e.priceLibre ? "Prix libre" : e.price || "";
    const about = (e.description || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const modes = [["walking", "À pied"], ["bicycling", "À vélo"], ["driving", "En voiture"]];
    const go = e.precise
      ? `<div class="trip" id="trip"></div>
        <p class="modes">Autres itinéraires Google Maps : ${modes.map(([m, label]) => `<a target="_blank" rel="noopener" href="${esc(gmaps(e, m))}">${label}</a>`).join(" · ")}</p>`
      : `<div class="trip"><p class="trip__note" style="margin:0">La source ne donne pas d'adresse assez précise pour ce lieu${e.city ? ` (seulement « ${esc(e.venue || e.city)} »)` : ""}. Plutôt que de t'envoyer au centre de la commune, aucun itinéraire n'est proposé : l'adresse exacte est sur la page d'origine.</p></div>`;
    const entry = calendarEntry(slot);
    const agenda = entry
      ? `<h3>Ajouter à mon agenda</h3>
          <div class="linkrow">
            <a class="btn btn--small" target="_blank" rel="noopener" href="${esc(googleCalendar(entry))}">${ICONS.calendar} Google Agenda</a>
            <button class="btn btn--small" type="button" data-action="ics">${ICONS.calendar} Autre agenda (.ics)</button>
          </div>
          ${entry.timed ? "" : `<p class="modes">${e.period ? "Pas d'horaire précis dans la source : toute la période est inscrite, en journées entières." : "Pas d'heure dans la source : l'événement est inscrit sur la journée entière."}</p>`}`
      : "";
    const text = about.join(" ");
    const long = text.length > 420;
    sheet.innerHTML = `
      <div class="modal__scroll">
        <header class="modal__hero" data-c="${hueOf(e)}">
          ${e.image ? `<img src="${esc(e.image)}" alt="" referrerpolicy="no-referrer">` : ""}
          <form method="dialog"><button class="icon-btn modal__close" aria-label="Fermer">✕</button></form>
          <div class="modal__head">
            <p class="modal__when">${e.status ? `<span class="tag tag--status">${esc(e.status)}</span> ` : ""}${esc(when)}</p>
            <h2 class="modal__title" id="sheetTitle">${esc(e.title)}</h2>
          </div>
        </header>
        <div class="modal__body">
          <div class="card__tags" style="margin:0">
            ${e.categories.map((c) => `<span class="tag tag--cat" data-c="${look(c)[0]}">${esc(cat(c).label)}</span>`).join("")}
            ${e.tags.filter((t) => !e.categories.some((c) => fold(cat(c).label) === fold(t))).slice(0, 5).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
          </div>

          <div class="facts facts--grid">
            ${fact(ICONS.pin, esc(e.venue || e.city || "Lieu non précisé par la source"), esc(e.address || (e.venue ? e.city : "") || ""))}
            ${fact(ICONS.euro, priceText ? esc(priceText) : "Tarif non indiqué", e.free && e.price && !/gratuit/i.test(e.price) ? esc(e.price) : "")}
            ${e.ageMin != null ? fact(ICONS.age, `À partir de ${e.ageMin} an${e.ageMin > 1 ? "s" : ""}`) : byKind("public").length ? fact(ICONS.age, esc(byKind("public").join(", "))) : ""}
            ${e.booking ? fact(ICONS.ticket, "Sur inscription ou réservation", "À faire sur la page d'origine.") : ""}
            ${e.stop ? fact(ICONS.bus, `Arrêt ${esc(e.stop.name)} · ${e.stop.distance} m`, e.stop.lines.map((l) => `<span class="line" style="--line:${esc(l.color)}">${esc(l.name)}</span>`).join("")) : ""}
          </div>

          <h3>À propos</h3>
          ${about.length
            ? `<div class="desc${long ? " is-clamped" : ""}" id="about">${about.map((p) => `<p>${esc(p)}</p>`).join("")}</div>${long ? `<button class="more-link" type="button" data-action="more" aria-expanded="false">Lire la suite</button>` : ""}`
            : `<p class="desc muted">La source ne donne pas de présentation pour cet événement.</p>`}

          ${dates.length ? `<h3>Autres dates</h3><div class="dates">${dates.map((o) => `<span class="tag">${esc(fmtShort.format(asDate(o.start)))}${hour(o.start) ? " · " + hour(o.start) : ""}</span>`).join("")}</div>` : ""}

          ${agenda}

          <h3>S'y rendre</h3>
          ${go}
          ${checkinBlock(e, slot)}

          ${e.sources.length > 1 ? `<h3>Annoncé par</h3><p class="modes">${e.sources.map((src) => `<a target="_blank" rel="noopener" href="${esc(src.url)}">${esc(src.name)}</a>`).join(" · ")}</p>` : ""}
        </div>
      </div>
      <footer class="modal__actions">
        ${wishButton(e, "act wishbtn")}
        ${e.precise ? `<a class="act act--main" target="_blank" rel="noopener" href="${esc(gmaps(e, "transit"))}"><span class="act__ico">${ICONS.route}</span><span>Itinéraire</span></a>` : ""}
        <a class="act${e.precise ? "" : " act--main"}" target="_blank" rel="noopener" href="${esc(e.url)}"><span class="act__ico">${ICONS.out}</span><span>${e.booking ? "Réserver" : "Voir la source"}</span></a>
        <button class="act" type="button" data-action="share"><span class="act__ico">${ICONS.share}</span><span>Partager</span></button>
      </footer>`;
    if (!sheet.open) sheet.showModal();
    $(".modal__scroll", sheet).scrollTop = 0;
    loadTrip();
  }

  async function loadTrip() {
    const box = $("#trip");
    if (!box || !state.open) return;
    const { e, slot } = state.open;
    const o = origin();
    if (!e.precise || e.lat == null) {
      box.innerHTML = `<p class="trip__note">Ce lieu n'a pas d'adresse précise dans la source : le trajet Divia ne peut pas être calculé. Google Maps cherchera le lieu par son nom.</p>`;
      return;
    }
    if (!o) {
      box.innerHTML = `<p>Indique d'où tu pars pour voir le trajet en bus ou en tram, avec les prochains passages.</p>
        <div class="linkrow" style="margin-top:10px"><button class="btn btn--vert btn--small" type="button" data-action="origin">Définir mon point de départ</button></div>`;
      return;
    }
    const future = slot.start.length > 10 && minutesBetween(nowParis(), slot.start) > 25;
    if (!state.open.mode) state.open.mode = future ? "arrive" : "now";
    const mode = state.open.mode;
    const modes = future
      ? `<div class="trip__modes"><button type="button" data-trip="arrive" aria-pressed="${mode === "arrive"}">Arriver pour ${hour(slot.start)}</button><button type="button" data-trip="now" aria-pressed="${mode === "now"}">Partir maintenant</button></div>`
      : "";
    const from = prefs.places.length > 1 && !state.temp && !(prefs.useGps && state.gps)
      ? `<div class="trip__from"><span class="muted">Depuis</span>${prefs.places.map((p) => `<button type="button" class="chip" data-place="${esc(p.id)}" aria-pressed="${activePlace()?.id === p.id}">${esc(p.name)}</button>`).join("")}</div>`
      : "";
    box.innerHTML = `${from}<div class="compare" id="compare"><p class="trip__note">Comparaison des trajets…</p></div>${modes}<p class="trip__note">Calcul du trajet Divia…</p>`;
    loadCompare(o, e);
    const q = new URLSearchParams({ from: `${o.lat},${o.lng}`, to: `${e.lat},${e.lng}` });
    if (mode === "arrive") q.set("arriveBy", slot.start);
    let r;
    try {
      const res = await fetch(`/api/route?${q}`);
      r = await res.json();
      if (!res.ok) throw new Error(r.error || "erreur");
    } catch (err) {
      box.innerHTML = `${from}${$("#compare")?.outerHTML || ""}${modes}<p class="trip__note">Le réseau Divia n'a pas répondu (${esc(err.message)}). Les liens Google Maps restent utilisables.</p>`;
      return;
    }
    if (state.open?.e !== e) return; // une autre fiche a été ouverte entre-temps

    const options = r.options
      .map((op) => {
        const legs = op.legs
          .map((l, i) => `${i ? `<li class="walk"><time></time><span>Correspondance à ${esc(l.from)}</span></li>` : ""}
            <li><time>${l.dep}</time><span><span class="line" style="--line:${esc(l.line.color)}">${esc(l.line.name)}</span>${esc(l.from)} → ${esc(l.to)} <span class="muted">· dir. ${esc(l.headsign)} · ${l.stops} arrêt${l.stops > 1 ? "s" : ""}</span></span></li>`)
          .join("");
        const rt = op.realtime ? ` <span class="rt">temps réel${op.delayMin > 0 ? ` · +${op.delayMin} min` : ""}</span>` : "";
        const head = r.mode === "now" ? `Dans ${op.inMin} min à l'arrêt${rt}` : `Pars à ${op.leaveAt}`;
        return `<div class="option">
          <div class="option__head"><span>${head}</span><span>${op.duration} min · arrivée ${op.arrive}</span></div>
          <ol class="steps">
            <li class="walk"><time>${op.leaveAt}</time><span>${op.walkToStop} m à pied jusqu'à ${esc(op.legs[0].from)}</span></li>
            ${legs}
            <li class="walk"><time>${op.arrive}</time><span>${op.walkFromStop} m à pied jusqu'au lieu</span></li>
          </ol></div>`;
      })
      .join("");

    const walkNote = false ? `<p class="trip__note">${ICONS.walk} À pied : ${r.walk.minutes} min environ (${km(r.walk.meters / 1000)}).</p>` : "";
    let body;
    if (options) body = options;
    else if (!r.covered) body = `<p class="trip__note">Les horaires Divia de cette date ne sont pas encore publiés. Voici les arrêts les plus proches du lieu.</p>${stopsList(r.stopsTo)}`;
    else body = `<p class="trip__note">Pas de bus ni de tram trouvé ${r.mode === "arriveBy" ? "pour arriver à cette heure" : "dans l'heure et demie qui vient"} (service terminé, ou plus d'une correspondance). Arrêts proches du lieu :</p>${stopsList(r.stopsTo)}`;
    const foot = r.mode === "arriveBy" ? "Horaires théoriques Divia, avec 5 min de marge avant le début." : "Prochains passages Divia ; « temps réel » quand le véhicule est suivi.";
    box.innerHTML = `${from}${$("#compare")?.outerHTML || ""}${modes}${body}${walkNote}<p class="trip__note">${foot} Départ : ${esc(o.label)}.</p>`;
  }

  // À pied, à vélo, en voiture sur le vrai réseau de rues (OpenStreetMap). Un mode sans réponse est
  // simplement absent : pas de durée à vol d'oiseau présentée comme un calcul.
  async function loadCompare(o, e) {
    const q = new URLSearchParams({ from: `${o.lat},${o.lng}`, to: `${e.lat},${e.lng}`, modes: "walk,bike,car" });
    // prefs.car keeps its stored keys (conso, prix): visitors already saved them
    if (prefs.car) q.set("consumption", prefs.car.conso), q.set("price", prefs.car.prix);
    let r;
    try {
      r = await (await fetch(`/api/trips?${q}`)).json();
    } catch {
      r = null;
    }
    const box = $("#compare");
    if (!box || state.open?.e !== e) return;
    const ok = (r?.modes || []).filter((m) => m.ok);
    box.innerHTML = ok
      .map((m) => {
        const cost = (m.costs || []).map((c) => ` · <span title="${esc(c.detail)}">${c.value.toFixed(2).replace(".", ",")} ${c.unit}</span>`).join("");
        return `<div class="compare__m"><small>${esc(m.label)}</small><b>${m.minutes} min</b><span class="muted">${km(m.meters / 1000)}${cost}</span></div>`;
      })
      .join("");
  }

  const stopsList = (stops) =>
    stops.length
      ? `<div class="stops">${stops.map((s) => `<div>${esc(s.name)} <span class="muted">· ${s.distance} m</span> ${s.lines.map((l) => `<span class="line" style="--line:${esc(l.color)}">${esc(l.name)}</span>`).join("")}</div>`).join("")}</div>`
      : `<p class="trip__note">Aucun arrêt Divia à moins de 600 m.</p>`;

  // ---------- Panneau « Mes goûts » ----------
  function renderTastes() {
    const t = prefs.tastes;
    const sortKey = (c) => {
      const v = t.cats[c.id] || 0;
      const b = (val, label) => `<button type="button" data-taste="${c.id}" data-v="${val}" aria-pressed="${v === val}">${label}</button>`;
      return `<div class="taste" data-c="${look(c.id)[0]}"><span class="taste__name"><i></i>${esc(c.label)}</span><span class="tri">${b(1, "♥ J'aime")}${b(0, "Neutre")}${b(-1, "Masquer")}</span></div>`;
    };
    const words = (list, key) => (list.length ? list.map((w, i) => `<span class="word">${esc(w)}<button type="button" data-unword="${key}" data-i="${i}" aria-label="Retirer ${esc(w)}">✕</button></span>`).join("") : '<span class="muted">Aucun pour l\'instant.</span>');
    const tg = state.toggles;
    $("#tastesBody").innerHTML = `
      <h3>Filtres rapides</h3>
      <div class="toggles">
        <button class="toggle" type="button" data-toggle="free" aria-pressed="${tg.free}">Gratuit</button>
        <button class="toggle" type="button" data-toggle="tram" aria-pressed="${tg.tram}">Tram à côté</button>
      </div>
      <h3>Catégories</h3>
      <p class="note" style="margin:0 0 8px">Ce que tu aimes passe devant et reçoit l'étiquette « Pour toi ». Ce que tu masques disparaît partout.</p>
      ${KINDS.map((k) => `<p class="taste__group"><strong>${k.label}</strong> ${k.hint}</p>${state.categories.filter((c) => c.kind === k.id).map(sortKey).join("")}`).join("")}
      <h3>Mots-clés que j'aime</h3>
      <form class="field" data-words="like"><input type="text" placeholder="reforestation, jazz, Lentillères… puis Entrée" aria-label="Ajouter un mot-clé aimé"></form>
      <div class="words" style="margin-top:8px">${words(t.like, "like")}</div>
      <h3>Mots-clés à éviter</h3>
      <form class="field" data-words="block"><input type="text" placeholder="karaoké, afterwork… puis Entrée" aria-label="Ajouter un mot-clé à éviter"></form>
      <div class="words" style="margin-top:8px">${words(t.block, "block")}</div>
      <h3>Moments préférés</h3>
      <div class="toggles">${MOMENTS.map((m) => `<button class="toggle" type="button" data-moment="${m.id}" aria-pressed="${t.moments.includes(m.id)}">${m.label}</button>`).join("")}</div>
      <h3>Rayon « près de moi »</h3>
      <div class="range"><input type="range" id="maxKm" min="1" max="20" step="1" value="${t.maxKm}" aria-label="Rayon en kilomètres"><strong id="maxKmOut">${t.maxKm} km</strong></div>
      <h3>Sources</h3>
      <p class="note" style="margin:0">${t.sourcesOff.length ? `${t.sourcesOff.length} source(s) masquée(s).` : "Toutes les sources sont affichées."} Le réglage se fait dans l'onglet « Sources ».</p>
      <div class="linkrow" style="margin-top:26px"><button class="btn btn--small" type="button" data-action="resetTastes">Tout remettre à zéro</button></div>`;
  }

  // ---------- Panneau « D'où pars-tu ? » ----------
  function renderOrigin(message = "") {
    const active = !(prefs.useGps && state.gps) && activePlace();
    const rows = prefs.places
      .map((p) => {
        const on = active && active.id === p.id;
        return `<div class="place${on ? " is-on" : ""}"><button class="place__pick" type="button" data-place="${esc(p.id)}" aria-pressed="${!!on}">${ICONS.pin}<span><b>${esc(p.name)}</b><small>${esc(p.label)}</small></span></button><button class="btn btn--small" type="button" data-forget="${esc(p.id)}" aria-label="Oublier ${esc(p.name)}">Oublier</button></div>`;
      })
      .join("");
    const car = prefs.car || {};
    $("#originBody").innerHTML = `<div class="stack">
      ${rows ? `<div class="places">${rows}</div>` : ""}
      <div class="field">
        <label for="placeName"><strong>${rows ? "Ajouter un lieu" : "Ton premier lieu"}</strong></label>
        <input id="placeName" type="text" placeholder="${rows ? "Travail, Atelier…" : "Maison"}" maxlength="30" aria-label="Nom du lieu">
        <input id="addr" type="search" placeholder="12 rue de la Liberté, Dijon" autocomplete="street-address" style="margin-top:8px">
        <ul class="suggestions" id="addrList"></ul>
        <p class="note">Donne un nom puis choisis l'adresse. Les lieux restent sur cet appareil ; une adresse n'est envoyée que pour calculer un trajet.</p>
      </div>
      <div class="linkrow">
        <button class="btn btn--vert" type="button" data-action="gps">${ICONS.pin} Utiliser ma position GPS</button>
      </div>
      ${state.gps ? `<p class="note">Position GPS : ${esc(state.gps.label)}${prefs.useGps ? " (utilisée comme départ)" : ""}.</p>` : ""}
      <details class="car"${car.conso ? " open" : ""}><summary><strong>Ma voiture</strong> <span class="muted">(facultatif, pour le coût en essence)</span></summary>
        <form class="car__row" data-car>
          <label>Conso <input name="conso" type="text" inputmode="decimal" value="${car.conso || ""}" placeholder="6,5"> L/100 km</label>
          <label>Prix <input name="prix" type="text" inputmode="decimal" value="${car.prix || ""}" placeholder="1,85"> €/L</label>
          <button class="btn btn--small" type="submit">Enregistrer</button>
        </form>
      </details>
      ${message ? `<p class="note" role="alert">${esc(message)}</p>` : ""}
    </div>`;
  }

  function setAddress(place) {
    const typed = ($("#placeName")?.value || "").trim();
    const name = typed || (prefs.places.length ? `Lieu ${prefs.places.length + 1}` : "Maison");
    const id = `${fold(name).replace(/[^a-z0-9]+/g, "-") || "lieu"}-${Date.now().toString(36)}`;
    prefs.places.push({ id, name, label: place.label, lat: place.lat, lng: place.lng });
    prefs.placeId = id;
    prefs.useGps = false;
    state.temp = null;
    save();
    afterOriginChange();
    $("#originSheet").close();
  }

  function afterOriginChange() {
    render();
    if ($("#originSheet").open) renderOrigin();
    if ($("#eventSheet").open && state.open) {
      state.open.mode = null;
      openEvent(state.open.e.id, state.open.slot.start);
    }
  }

  function locate({ silent = false } = {}) {
    if (!navigator.geolocation) return renderOrigin("Ce navigateur ne donne pas accès à la position.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "ma position" };
        try {
          const r = await (await fetch(`/api/reverse?at=${p.lat},${p.lng}`)).json();
          if (r.label) p.label = `ma position (${r.label})`;
        } catch {
          /* le libellé reste « ma position » */
        }
        state.gps = p;
        state.temp = null;
        prefs.useGps = true;
        save();
        afterOriginChange();
      },
      (err) => {
        if (!silent) renderOrigin(err.code === 1 ? "Accès à la position refusé : autorise-le dans le navigateur, ou saisis une adresse." : "Position introuvable pour l'instant. Réessaie ou saisis une adresse.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  let addrTimer;
  async function suggestAddress(q) {
    const list = $("#addrList");
    if (!list) return [];
    if (q.trim().length < 3) {
      list.innerHTML = "";
      return [];
    }
    try {
      const found = await (await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)).json();
      list._found = found;
      list.innerHTML = found.map((f, i) => `<li><button type="button" data-addr="${i}">${esc(f.label)}</button></li>`).join("") || '<li><button type="button" disabled>Aucune adresse trouvée</button></li>';
      return found;
    } catch {
      list.innerHTML = '<li><button type="button" disabled>Recherche d\'adresse indisponible</button></li>';
      return [];
    }
  }

  // ---------- Données ----------
  let pollTimer;
  async function load() {
    const res = await fetch("/api/events");
    const data = await res.json();
    Object.assign(state, { events: data.events, categories: data.categories, sources: data.sources, generatedAt: data.generatedAt, refreshing: data.refreshing, offline: !!data.offline });
    relinkWish();
    render();
    clearTimeout(pollTimer);
    if (data.refreshing) pollTimer = setTimeout(load, 4000);
  }

  // ---------- Événements d'interface ----------
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("button, a");
    if (!el) return;
    const d = el.dataset;
    if (d.action === "more") {
      const open = $("#about").classList.toggle("is-clamped") === false;
      el.textContent = open ? "Réduire" : "Lire la suite";
      el.setAttribute("aria-expanded", String(open));
      return;
    }
    if (d.action === "ics" && state.open) {
      const entry = calendarEntry(state.open.slot);
      if (entry) downloadIcs(entry);
      return;
    }
    if (d.action === "share" && state.open) {
      const { e } = state.open;
      const label = el.querySelector("span:last-child");
      const done = (msg) => {
        label.textContent = msg;
        setTimeout(() => (label.textContent = "Partager"), 1800);
      };
      // partage natif sur mobile ; ailleurs, le lien de la source est copié
      if (navigator.share) navigator.share({ title: e.title, text: `${e.title} — ${e.venue || e.city || "Dijon"}`, url: e.url }).catch(() => {});
      else navigator.clipboard?.writeText(e.url).then(() => done("Lien copié"), () => done("Copie impossible"));
      return;
    }
    if (d.wish) {
      toggleWish(d.wish);
      render();
      // la fiche ouverte reflète tout de suite le changement
      const inSheet = $("#eventSheet .wishbtn");
      if (inSheet && state.open) inSheet.outerHTML = wishButton(state.open.e, "act wishbtn");
      return;
    }
    if (d.mode) return setMode(d.mode);
    if (d.action === "seeall") return $("#agenda").scrollIntoView({ block: "start" });
    if (d.action === "reload") return load().catch(() => {});
    if (el.id === "installBtn" && installPrompt) {
      installPrompt.prompt();
      installPrompt = null;
      el.hidden = true;
      return;
    }
    if (d.action === "compact") {
      prefs.compact = !prefs.compact;
      save();
      return render();
    }
    if (d.action === "wishlist") return setMode("list", "wish");
    if (d.action === "tastes") {
      renderTastes();
      return $("#tastesSheet").showModal();
    }
    if (d.action === "checkin" && state.open) {
      const { e } = state.open;
      if (!isSeen(e)) prefs.seen.push({ id: e.id, key: fold(e.title), title: e.title, start: state.open.slot.start, venue: e.venue || e.city || "", url: e.url, at: Date.now() });
      save();
      render();
      return openEvent(e.id, state.open.slot.start);
    }
    if (d.id) return openEvent(d.id, d.start);
    if (d.range) {
      state.range = d.range;
      state.view = "agenda";
      state.limit = 120;
    } else if (d.cat === "") state.cats.clear();
    else if (d.cat) state.cats.has(d.cat) ? state.cats.delete(d.cat) : state.cats.add(d.cat);
    else if (d.toggle) {
      if (d.toggle === "near" && !origin()) {
        renderOrigin("Indique d'abord d'où tu pars pour filtrer par distance.");
        return $("#originSheet").showModal();
      }
      state.toggles[d.toggle] = !state.toggles[d.toggle];
      if ($("#tastesSheet").open) renderTastes();
    } else if (d.view) state.view = d.view;
    else if (d.source) {
      const off = prefs.tastes.sourcesOff;
      off.includes(d.source) ? off.splice(off.indexOf(d.source), 1) : off.push(d.source);
      save();
    } else if (el.id === "moreBtn") state.limit += 150;
    else if (el.id === "refreshBtn") {
      state.refreshing = true;
      fetch("/api/refresh", { method: "POST" }).then(() => setTimeout(load, 2500));
    } else if (el.id === "tastesBtn") {
      renderTastes();
      return $("#tastesSheet").showModal();
    } else if (el.id === "originBtn" || d.action === "origin") {
      renderOrigin();
      $("#originSheet").showModal();
      return $("#addr")?.focus();
    } else if (d.trip) {
      state.open.mode = d.trip;
      return loadTrip();
    } else if (d.taste) {
      prefs.tastes.cats[d.taste] = +d.v;
      if (!+d.v) delete prefs.tastes.cats[d.taste];
      if (+d.v === -1) state.cats.delete(d.taste);
      save();
      renderTastes();
    } else if (d.moment) {
      const m = prefs.tastes.moments;
      m.includes(d.moment) ? m.splice(m.indexOf(d.moment), 1) : m.push(d.moment);
      save();
      renderTastes();
    } else if (d.unword) {
      prefs.tastes[d.unword].splice(+d.i, 1);
      save();
      renderTastes();
    } else if (d.action === "resetTastes") {
      prefs.tastes = structuredClone(DEFAULTS.tastes);
      save();
      renderTastes();
    } else if (d.addr) return setAddress($("#addrList")._found[+d.addr]);
    else if (d.action === "gps") return locate();
    else if (d.place) {
      prefs.placeId = d.place;
      prefs.useGps = false;
      state.temp = null;
      save();
      return afterOriginChange();
    } else if (d.forget) {
      prefs.places = prefs.places.filter((p) => p.id !== d.forget);
      if (prefs.placeId === d.forget) prefs.placeId = prefs.places[0]?.id || null;
      save();
      return afterOriginChange();
    } else return;
    render();
  });

  document.addEventListener("submit", async (ev) => {
    const carForm = ev.target.closest("form[data-car]");
    if (carForm) {
      ev.preventDefault();
      const num = (v) => parseFloat(String(v).replace(",", "."));
      const consumption = num(carForm.conso.value);
      const priceValue = num(carForm.prix.value);
      prefs.car = consumption > 0 && priceValue > 0 ? { conso: consumption, prix: priceValue } : null;
      save();
      return renderOrigin(prefs.car ? "Voiture enregistrée : le coût en essence s'affichera sur les trajets." : "Voiture effacée.");
    }
    const form = ev.target.closest("form[data-words]");
    if (!form) return;
    ev.preventDefault();
    const input = form.querySelector("input");
    const list = prefs.tastes[form.dataset.words];
    for (const w of input.value.split(",").map((s) => s.trim()).filter(Boolean)) if (!list.some((x) => fold(x) === fold(w))) list.push(w);
    save();
    renderTastes();
    render();
    $(`form[data-words="${form.dataset.words}"] input`).focus();
  });

  // Les listes déroulantes du panneau de filtres et le tri.
  document.addEventListener("change", (ev) => {
    const f = ev.target.dataset?.field;
    if (!f) return;
    const v = ev.target.value;
    if (f === "range") {
      state.range = v;
      state.view = "agenda";
      state.limit = 120;
    } else if (f === "near") {
      if (v) {
        prefs.tastes.maxKm = +v;
        save();
        if (!origin()) {
          render();
          renderOrigin("Indique d'abord d'où tu pars pour filtrer par distance.");
          return $("#originSheet").showModal();
        }
      }
      state.toggles.near = !!v;
    } else state[f] = v;
    render();
  });

  document.addEventListener("input", (ev) => {
    if (ev.target.id === "search") {
      state.search = ev.target.value;
      state.limit = 120;
      renderControls();
      renderSoon();
      renderAgenda();
    } else if (ev.target.id === "maxKm") {
      prefs.tastes.maxKm = +ev.target.value;
      $("#maxKmOut").textContent = `${ev.target.value} km`;
      save();
      render();
    } else if (ev.target.id === "addr") {
      clearTimeout(addrTimer);
      addrTimer = setTimeout(() => suggestAddress(ev.target.value), 220);
    }
  });

  // Entrée dans le champ d'adresse : on valide la première proposition.
  document.addEventListener("keydown", async (ev) => {
    if (ev.key !== "Enter" || ev.target.id !== "addr") return;
    ev.preventDefault();
    clearTimeout(addrTimer);
    const found = await suggestAddress(ev.target.value);
    if (found[0]) setAddress(found[0]);
  });

  // Une image de source qui ne charge pas laisse place à l'aplat de couleur.
  document.addEventListener("error", (ev) => ev.target.tagName === "IMG" && ev.target.remove(), true);
  // Clic sur le fond assombri : on ferme le panneau.
  for (const dlg of document.querySelectorAll("dialog")) {
    dlg.addEventListener("click", (ev) => ev.target === dlg && dlg.close());
    dlg.addEventListener("close", () => {
      if (dlg.id === "eventSheet") state.open = null;
      else render();
    });
  }

  // ---------- Appli installable ----------
  // Le navigateur propose l'installation quand il la juge possible ; le bouton n'apparaît qu'à ce moment-là.
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    installPrompt = ev;
    $("#installBtn").hidden = false;
  });
  window.addEventListener("appinstalled", () => ($("#installBtn").hidden = true));
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

  window.JCB = { state, prefs, matches, isWished, origin, cat, axeOf, hueOf, catIcon, esc, km, distance, nowParis, hour, wishButton };
  document.body.dataset.mode = prefs.mode === "list" ? "list" : "explore";
  for (const b of document.querySelectorAll(".modeswitch button")) b.setAttribute("aria-pressed", String(b.dataset.mode === document.body.dataset.mode));
  if (prefs.useGps) locate({ silent: true });
  setInterval(() => document.visibilityState === "visible" && (renderSoon(), renderStatus()), 60000);
  load().catch(() => {
    $("#status").textContent = "Serveur injoignable : lance « npm start » dans le dossier du projet.";
  });
})();
