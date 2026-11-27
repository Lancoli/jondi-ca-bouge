// Mode « Explorer » : la carte autour de soi, ce qui se passe au créneau choisi, et une frise du temps
// qu'on fait glisser pour voir la suite. S'appuie sur l'API exposée par app.js (window.JCB).
(() => {
  "use strict";
  const J = window.JCB;
  if (!J || !window.L) return;

  const $ = (sel) => document.querySelector(sel);
  const DIJON = { lat: 47.322, lng: 5.0415 };
  const STEP = 30; // minutes par cran de la frise
  const STEPS = 7 * 48; // sept jours
  const WINDOW = 180; // on montre ce qui est en cours ou démarre dans les 3 h suivant le curseur
  const BUCKET = 6; // crans regroupés par barre de l'histogramme (3 h)

  const dayOf = (s) => s.slice(0, 10);
  const addMin = (wall, n) => new Date(Date.parse(`${wall.padEnd(16, "T00:00")}:00Z`) + n * 60000).toISOString().slice(0, 16);
  const minutes = (a, b) => (Date.parse(`${b}:00Z`) - Date.parse(`${a}:00Z`)) / 60000;
  const fmtDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });
  const fmtDayLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
  const asDate = (wall) => new Date(`${dayOf(wall)}T12:00:00Z`);
  const walk = (km) => Math.max(1, Math.round((km * 1.3 * 60) / 4.5));

  const ui = { mapQuiet: 0, listQuiet: 0, step: 0, expos: false, autoFit: true, active: null, items: [], base: null };
  let map, pins, me, tiles;
  const markers = new Map();

  // ---------- Le log de modifications ----------
  const logs = new Map();

  function logChange(id, action, author = 'toi') {
    if (!logs.has(id)) logs.set(id, []);
    logs.get(id).unshift({ date: new Date().toISOString().split('T')[0], auteur: author, action });
  }

  function showLog(e) {
    const modal = document.createElement('dialog');
    modal.className = 'change-log-modal';
    const header = document.createElement('div');
    header.className = 'change-log-header';
    const h3 = document.createElement('h3');
    h3.textContent = `Historique : ${e.title}`;
    header.append(h3);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'change-log-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => modal.close());
    header.append(closeBtn);
    modal.append(header);

    const history = logs.get(e.id) || [];
    if (!history.length) {
      history.push({ date: new Date().toISOString().split('T')[0], auteur: 'toi', action: 'Création' });
    }

    const list = document.createElement('ul');
    list.className = 'change-log-list';
    history.forEach(({ date, auteur: author, action }) => {
      const li = document.createElement('li');
      li.className = 'change-log-item';
      const dateSpan = document.createElement('span');
      dateSpan.className = 'change-log-date slate';
      dateSpan.textContent = date;
      const authorSpan = document.createElement('strong');
      authorSpan.className = 'change-log-author';
      authorSpan.textContent = author;
      const actionSpan = document.createElement('span');
      actionSpan.className = 'change-log-action';
      actionSpan.textContent = action;
      li.append(dateSpan, authorSpan, actionSpan);
      list.append(li);
    });
    modal.append(list);

    document.body.append(modal);
    modal.showModal();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
    modal.addEventListener('close', () => modal.remove());
  }

  // Début de la frise : maintenant, arrondi à la demi-heure précédente.
  function base() {
    const now = J.nowParis();
    return `${now.slice(0, 14)}${+now.slice(14, 16) < 30 ? "00" : "30"}`;
  }
  const cursor = () => (ui.step === 0 ? J.nowParis() : addMin(ui.base, ui.step * STEP));

  function cursorLabel() {
    if (ui.step === 0) return "En ce moment";
    const t = cursor();
    const today = dayOf(J.nowParis());
    const h = +t.slice(11, 13);
    const part = h < 6 ? "dans la nuit" : h < 12 ? "matin" : h < 18 ? "après-midi" : "soir";
    if (dayOf(t) === today) return h < 6 ? "Cette nuit" : h < 12 ? "Ce matin" : h < 18 ? "Cet après-midi" : "Ce soir";
    if (dayOf(t) === dayOf(addMin(today, 1440))) return `Demain ${part}`;
    const name = fmtDayLong.format(asDate(t));
    return `${name[0].toUpperCase()}${name.slice(1)} ${part}`;
  }

  // Ce qui est en cours ou commence dans la fenêtre qui suit le curseur.
  function collect(t) {
    const until = addMin(t, WINDOW);
    const o = J.origin();
    const timed = [];
    const loose = [];
    for (const e of ui.pool) {
      if (e.period) {
        if (ui.expos && !e.permanent && e.period.start <= dayOf(t) && e.period.end >= dayOf(t)) loose.push({ e, kind: "period" });
        continue;
      }
      for (const occ of [{ start: e.start, end: e.end }, ...e.occurrences]) {
        if (occ.start.length <= 10) {
          if (occ.start === dayOf(t)) loose.push({ e, kind: "day", start: occ.start });
          continue;
        }
        const end = occ.end && occ.end > occ.start ? occ.end : addMin(occ.start, 120);
        // un « créneau » de plus de 16 h est une ouverture sur plusieurs jours, pas un rendez-vous
        if (minutes(occ.start, end) > 960) {
          if (ui.expos && occ.start < until && end > t) loose.push({ e, kind: "long" });
          continue;
        }
        if (occ.start < until && end > t) {
          timed.push({ e, kind: "timed", start: occ.start, end, live: occ.start <= t });
          break;
        }
      }
    }
    const dist = (x) => (o && x.e.precise && x.e.lat != null ? J.distance(o, x.e) : null);
    for (const x of [...timed, ...loose]) x.km = dist(x);
    timed.sort((a, b) => a.start.localeCompare(b.start) || (a.km ?? 99) - (b.km ?? 99));
    loose.sort((a, b) => (a.km ?? 99) - (b.km ?? 99));
    return [...timed, ...loose.slice(0, 12)];
  }

  function whenText(x, t) {
    if (x.kind === "period") return { text: `Jusqu'au ${fmtDay.format(asDate(x.e.period.end))}`, live: false };
    if (x.kind === "day") return { text: "Dans la journée", live: false };
    if (x.kind === "long") return { text: "Sur plusieurs jours", live: false };
    const now = ui.step === 0;
    if (x.live) return { text: now ? `En cours · jusqu'à ${J.hour(x.end)}` : `Commencé à ${J.hour(x.start)}`, live: now };
    const m = Math.round(minutes(t, x.start));
    return { text: now && m < 60 ? `Dans ${m} min` : `À ${J.hour(x.start)}`, live: false };
  }

  // ---------- Carte ----------
  function initMap() {
    map = L.map("map", { zoomControl: false, attributionControl: true, zoomSnap: 0.5 }).setView([DIJON.lat, DIJON.lng], 14);
    // Fond OpenStreetMap, sans clé ; en thème sombre, les tuiles sont assombries par un filtre CSS.
    tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    pins = L.layerGroup().addTo(map);
    me = L.layerGroup().addTo(map);
    // dès que tu déplaces la carte toi-même, elle cesse de se recadrer toute seule
    map.on("dragstart zoomstart", (ev) => {
      if (ev.originalEvent || ev.type === "dragstart") ui.autoFit = false;
      $("#exRecenter").hidden = ui.autoFit;
    });
    // Carte -> carrousel : quand tu déplaces la carte, l'événement le plus proche du centre visible
    // devient celui du carrousel.
    map.on("moveend", () => {
      if (Date.now() < ui.mapQuiet || ui.autoFit) return;
      const id = nearestToCentre();
      if (id && id !== ui.active) focusCard(id, false);
    });
  }

  function drawMe() {
    me.clearLayers();
    const o = J.origin();
    if (!o) return;
    // deux cercles de marche : environ 5 et 15 minutes à pied
    for (const [r, op] of [[1150, 0.05], [380, 0.09]]) L.circle([o.lat, o.lng], { radius: r, color: "#c80082", weight: 1, opacity: 0.35, fillColor: "#c80082", fillOpacity: op, interactive: false }).addTo(me);
    L.marker([o.lat, o.lng], { icon: L.divIcon({ className: "", html: '<span class="me"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, keyboard: false }).addTo(me);
  }

  function drawPins() {
    pins.clearLayers();
    markers.clear();
    const groups = new Map();
    for (const x of ui.items) {
      if (!x.e.precise || x.e.lat == null) continue;
      const key = `${x.e.lat.toFixed(4)},${x.e.lng.toFixed(4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(x);
    }
    for (const list of groups.values()) {
      const first = list[0];
      const live = list.some((x) => x.live && ui.step === 0);
      const label = list.length > 1 ? list.length : J.esc(J.cat(first.e.categories[0]).label[0]);
      const icon = L.divIcon({
        className: "",
        html: `<span class="pin${live ? " is-live" : ""}" data-c="${J.hueOf(first.e)}"><b>${label}</b></span>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      const marker = L.marker([first.e.lat, first.e.lng], { icon, title: list.map((x) => x.e.title).join(" · "), riseOnHover: true }).addTo(pins);
      let turn = 0;
      // plusieurs événements au même endroit : chaque clic passe au suivant
      marker.on("click", () => focusCard(list[turn++ % list.length].e.id, true));
      for (const x of list) markers.set(x.e.id, marker);
    }
  }

  // Zone de la carte réellement visible : sous les boutons, au-dessus du bandeau.
  function visibleZone() {
    const size = map.getSize();
    const bottom = size.y - $(".dock").offsetHeight;
    return { size, top: 56, bottom, centre: L.point(size.x / 2, (56 + bottom) / 2) };
  }

  function nearestToCentre() {
    const zone = visibleZone();
    let best = null;
    for (const x of ui.items) {
      const m = markers.get(x.e.id);
      if (!m) continue;
      const p = map.latLngToContainerPoint(m.getLatLng());
      if (p.x < 0 || p.x > zone.size.x || p.y < zone.top || p.y > zone.bottom) continue;
      const d = p.distanceTo(zone.centre);
      if (!best || d < best.d) best = { d, id: x.e.id };
    }
    return best?.id || null;
  }

  function fit() {
    if (!ui.autoFit) return;
    ui.mapQuiet = Date.now() + 900;
    const o = J.origin();
    const points = [...new Set(markers.values())].map((m) => m.getLatLng());
    if (o) points.push(L.latLng(o.lat, o.lng));
    const dock = $(".dock").offsetHeight;
    if (!points.length) return map.setView([DIJON.lat, DIJON.lng], 14);
    if (points.length === 1) return map.setView(points[0], 15);
    // on cadre d'abord ce qui est proche : au-delà de 6 km du départ, les points ne tirent plus le cadrage
    const center = o ? L.latLng(o.lat, o.lng) : L.latLng(DIJON.lat, DIJON.lng);
    const near = points.filter((p) => p.distanceTo(center) < 6000);
    map.fitBounds(L.latLngBounds(near.length > 1 ? near : points), { paddingTopLeft: [36, 70], paddingBottomRight: [36, dock + 24], maxZoom: 16, animate: true });
  }

  function setActive(id, pan) {
    ui.active = id;
    for (const [eid, m] of markers) m.getElement()?.firstElementChild.classList.toggle("is-active", eid === id);
    for (const c of document.querySelectorAll(".xcard")) c.classList.toggle("is-active", c.dataset.id === id);
    const m = markers.get(id);
    if (m) {
      m.setZIndexOffset(1000);
      if (pan) {
        const zone = visibleZone();
        const offset = map.latLngToContainerPoint(m.getLatLng()).subtract(zone.centre);
        if (Math.hypot(offset.x, offset.y) > 30) {
          ui.mapQuiet = Date.now() + 800;
          map.panBy(offset, { animate: true, duration: 0.45 });
        }
      }
    }
  }

  function focusCard(id, pan) {
    const card = document.querySelector(`.xcard[data-id="${id}"]`);
    ui.listQuiet = Date.now() + 900; // ce défilement vient de la carte : il ne doit pas la redéplacer
    if (card) card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActive(id, pan);
  }

  // ---------- Bandeau du bas ----------
  function renderCards(t) {
    const box = $("#exCards");
    const keep = box.scrollLeft;
    const sameSet = box.dataset.sig === ui.items.map((x) => x.e.id).join(",");
    const cards = ui.items.map((x) => {
      const { e } = x;
      const w = whenText(x, t);
      const where = e.venue || e.city || "Lieu non précisé";
      const far = x.km != null ? ` · ${J.km(x.km)}${x.km < 2.5 ? ` · ${walk(x.km)} min à pied` : ""}` : e.precise || !(e.venue || e.city) ? "" : " · adresse imprécise";
      const img = e.image ? `<img src="${J.esc(e.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
      return `<article class="xcard${J.isWished(e) ? " is-wished" : ""}" data-id="${e.id}" data-c="${J.hueOf(e)}">
        <button class="xcard__main" type="button" data-id="${e.id}" data-start="${x.start || e.start}">
          <span class="xcard__media" aria-hidden="true">${J.esc(J.cat(e.categories[0]).label[0])}${img}</span>
          <span class="xcard__body">
            <span class="xcard__when${w.live ? " is-live" : ""}">${J.esc(w.text)}</span>
            <span class="xcard__title">${J.esc(e.title)}</span>
            <span class="xcard__place">${J.esc(where)}${far}</span>
          </span>
        </button>${J.wishButton(e)}
      </article>`;
    });

    // la dernière carte invite à avancer dans le temps
    const next = nextWindow();
    if (next) cards.push(`<button class="xcard xcard--next" type="button" data-ex-step="${next.step}"><span class="xcard__next"><strong>${ui.items.length ? "Et ensuite ?" : "Rien dans ce créneau"}</strong><span>${J.esc(next.label)} · ${next.count} événement${next.count > 1 ? "s" : ""}</span><b aria-hidden="true">→</b></span></button>`);
    box.innerHTML = cards.join("");
    box.dataset.sig = ui.items.map((x) => x.e.id).join(",");
    box.scrollLeft = sameSet ? keep : 0;

    // Ajouter les gestionnaires pour afficher le log
    requestAnimationFrame(() => {
      box.querySelectorAll('.xcard[data-id]').forEach((card) => {
        const id = card.dataset.id;
        const item = ui.items.find(x => x.e.id === id);
        if (!item) return;

        let longPressTimer = null;
        card.addEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          showLog(item.e);
        });

        card.addEventListener('pointerdown', (ev) => {
          if (ev.target.closest('button')) return;
          longPressTimer = setTimeout(() => showLog(item.e), 500);
        });

        card.addEventListener('pointerup', () => {
          if (longPressTimer) clearTimeout(longPressTimer);
        });

        card.addEventListener('pointercancel', () => {
          if (longPressTimer) clearTimeout(longPressTimer);
        });
      });
    });
  }

  // Prochain créneau non vide après la fenêtre courante.
  function nextWindow() {
    const after = addMin(cursor(), WINDOW);
    const first = ui.starts.find((s) => s >= after);
    if (!first) return null;
    const step = Math.floor(minutes(ui.base, first) / STEP);
    if (step > STEPS) return null;
    const t = addMin(ui.base, step * STEP);
    const until = addMin(t, WINDOW);
    const count = ui.starts.filter((s) => s >= t && s < until).length;
    const here = ui.step;
    ui.step = step;
    const label = `${cursorLabel()} · ${J.hour(t)}`;
    ui.step = here;
    return { step, count, label };
  }

  function renderJumps() {
    const now = J.nowParis();
    const today = dayOf(now);
    const stepOf = (wall) => Math.round(minutes(ui.base, wall) / STEP);
    const jumps = [{ label: "Maintenant", step: 0 }];
    if (now.slice(11, 13) < "18") jumps.push({ label: "Ce soir", step: stepOf(`${today}T19:00`) });
    const tomorrow = dayOf(addMin(today, 1440));
    jumps.push({ label: "Demain", step: stepOf(`${tomorrow}T10:00`) }, { label: "Demain soir", step: stepOf(`${tomorrow}T19:00`) });
    // le prochain samedi, s'il n'est pas déjà couvert par « demain »
    for (let d = 2; d < 7; d++) {
      const day = dayOf(addMin(today, d * 1440));
      if (asDate(day).getUTCDay() === 6) jumps.push({ label: "Samedi", step: stepOf(`${day}T14:00`) });
    }
    $("#exJumps").innerHTML =
      jumps.map((j) => `<button class="jump" type="button" data-ex-step="${j.step}" aria-pressed="${Math.abs(ui.step - j.step) < 2}">${j.label}</button>`).join("") +
      `<button class="jump jump--toggle" type="button" data-ex="expos" aria-pressed="${ui.expos}">Expos en cours</button>`;
  }

  // Histogramme : combien d'événements démarrent dans chaque tranche de 3 h des sept prochains jours.
  function renderTimeline() {
    const counts = new Array(STEPS / BUCKET).fill(0);
    for (const start of ui.starts) {
      const b = Math.floor(minutes(ui.base, start) / STEP / BUCKET);
      if (b >= 0 && b < counts.length) counts[b]++;
    }
    const max = Math.max(1, ...counts);
    const at = Math.floor(ui.step / BUCKET);
    $("#exBars").innerHTML = counts.map((n, i) => `<i style="height:${n ? 12 + Math.round((88 * n) / max) : 4}%" class="${i === at ? "is-on" : i < at ? "is-past" : ""}"></i>`).join("");
    const days = [];
    for (let d = 0; d < 7; d++) days.push(d === 0 ? "Auj." : fmtDay.format(asDate(addMin(dayOf(ui.base), d * 1440))));
    $("#exDays").innerHTML = days.map((d) => `<span>${d}</span>`).join("");
    const input = $("#exTime");
    input.max = STEPS;
    input.value = ui.step;
    input.setAttribute("aria-valuetext", `${cursorLabel()} ${J.hour(cursor()) || ""}`);
  }

  function render() {
    if (document.body.dataset.mode !== "explore") return;
    if (!map) initMap();
    map.invalidateSize();
    ui.base = base();
    // les goûts et filtres ne sont évalués qu'une fois par rendu
    ui.pool = J.state.events.filter((e) => e.status !== "Annulé" && J.matches(e));
    ui.starts = ui.pool
      .filter((e) => !e.period)
      .flatMap((e) => [e.start, ...e.occurrences.map((o) => o.start)])
      .filter((s) => s.length > 10)
      .sort();
    const t = cursor();
    ui.items = collect(t);
    const n = ui.items.length;
    const o = J.origin();
    $("#exTitle").textContent = cursorLabel();
    $("#exSub").textContent = ui.step === 0 ? (n ? `${n} événement${n > 1 ? "s" : ""} en cours ou dans les 3 h${o ? " autour de toi" : ""}` : "Rien dans les 3 prochaines heures") : `${J.hour(t)} · ${n} événement${n > 1 ? "s" : ""} dans ce créneau`;
    $("#exCarnet").textContent = J.prefs.seen.length ? `Carnet · ${J.prefs.seen.length}` : "Carnet";
    $("#exWish").textContent = J.prefs.wish.length ? `♥ ${J.prefs.wish.length}` : "♥";
    $("#exHint").hidden = !!o;
    renderCards(t);
    renderJumps();
    renderTimeline();
    drawMe();
    drawPins();
    fit();
    if (ui.active && ui.items.some((x) => x.e.id === ui.active)) setActive(ui.active, false);
    else if (ui.items[0]) setActive(ui.items[0].e.id, false);
  }

  function goTo(step) {
    ui.step = Math.max(0, Math.min(STEPS, step));
    ui.autoFit = true;
    ui.active = null;
    $("#exRecenter").hidden = true;
    render();
  }

  // ---------- Interactions ----------
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-ex-step], [data-ex]");
    if (!el) return;
    if (el.dataset.exStep != null) return goTo(+el.dataset.exStep);
    if (el.dataset.ex === "expos") {
      ui.expos = !ui.expos;
      ui.autoFit = true;
      render();
    } else if (el.dataset.ex === "recenter") {
      ui.autoFit = true;
      el.hidden = true;
      fit();
    }
  });

  $("#exTime").addEventListener("input", (ev) => {
    ui.step = +ev.target.value;
    ui.autoFit = true;
    ui.active = null;
    render();
  });

  // La carte au centre du carrousel devient l'événement mis en avant sur la carte.
  let scrollTimer;
  $("#exCards").addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (Date.now() < ui.listQuiet) return;
      const box = $("#exCards");
      const mid = box.getBoundingClientRect().left + box.clientWidth / 2;
      let best = null;
      for (const c of box.querySelectorAll(".xcard[data-id]")) {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (!best || d < best.d) best = { d, id: c.dataset.id };
      }
      if (best && best.id !== ui.active) setActive(best.id, true);
    }, 120);
  });

  // Sur ordinateur, une rangée horizontale s'attrape à la souris comme on la ferait glisser au doigt.
  function dragScroll(el, { settle = false } = {}) {
    let grab = null;
    let moved = false;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "mouse" || ev.button !== 0) return;
      grab = { x: ev.clientX, left: el.scrollLeft };
      moved = false;
    });
    addEventListener("pointermove", (ev) => {
      if (!grab) return;
      const dx = ev.clientX - grab.x;
      if (!moved && Math.abs(dx) < 6) return;
      moved = true;
      el.classList.add("is-dragging");
      el.scrollLeft = grab.left - dx;
    });
    const release = () => {
      if (!grab) return;
      grab = null;
      if (!moved) return;
      // on termine en douceur sur la carte la plus proche avant de rendre la main à l'aimantation
      if (settle) {
        const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
        let best = null;
        for (const c of el.children) {
          const r = c.getBoundingClientRect();
          const d = r.left + r.width / 2 - mid;
          if (!best || Math.abs(d) < Math.abs(best)) best = d;
        }
        if (best != null) el.scrollBy({ left: best, behavior: "smooth" });
      }
      setTimeout(() => el.classList.remove("is-dragging"), settle ? 380 : 0);
    };
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);
    // un glissement n'est pas un clic : on n'ouvre pas la fiche en relâchant
    el.addEventListener("click", (ev) => {
      if (!moved) return;
      ev.preventDefault();
      ev.stopPropagation();
      moved = false;
    }, true);
    el.addEventListener("dragstart", (ev) => ev.preventDefault());
  }
  dragScroll($("#exCards"), { settle: true });
  for (const row of document.querySelectorAll("#soonRail, #exJumps, #catChips")) dragScroll(row);

  // « Maintenant » avance tout seul.
  setInterval(() => document.visibilityState === "visible" && ui.step === 0 && render(), 60000);

  window.JCBExplore = { render, map: () => map };
  render();
})();
