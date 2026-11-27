// Raw events from every source -> a single list, deduplicated, dated relative to now.
const crypto = require("crypto");
const { categorize, facets } = require("./categories");
const { slug } = require("./geocode");
const { distance } = require("./lib/geo");
const { nowLocal, today, addDays } = require("./lib/dates");
const { truncate } = require("./lib/text");

const dayOf = (s) => (s ? s.slice(0, 10) : null);
const hasTime = (s) => !!s && s.length > 10;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const STREET = /\b(rue|avenue|av|boulevard|bd|place|quai|cours|chemin|all[ée]e|impasse|esplanade|parvis|route|square|passage)\b/i;
const VAGUE_PLACE = /^(dijon|centre ville|centre ville de dijon|hors les murs|online|en ligne|musees de dijon|campus de dijon|cote d or|france|bourgogne)$/;
const FREE = /\b(gratuit\w*|entr[ée]e libre|prix libre|acc[èe]s libre|libre participation)\b/i;

// Matching key across sources: "JOK'AIR au Zénith de Dijon" and "JOK'AIR" must meet.
const FILLER = new Set(["dijon", "a", "au", "de", "du", "en", "le", "la", "zenith", "concert", "vapeur", "cedre", "the"]);
function titleKey(title) {
  const words = slug(title).split(" ");
  while (words.length > 1 && FILLER.has(words[words.length - 1])) words.pop();
  return words.join(" ");
}

// A span of several days without sessions (exhibition, festival) is a "period", not a date.
function shape(raw, source) {
  const title = String(raw.title || "").replace(/\s+/g, " ").trim();
  if (!title || !raw.start) return null;
  let occurrences = (raw.occurrences || []).filter((o) => o && o.start);
  let period = null;
  const startDay = dayOf(raw.start);
  const endDay = dayOf(raw.end);
  const length = endDay ? daysBetween(startDay, endDay) : 0;
  if (!occurrences.length) {
    // 11 pm -> 5 am crosses midnight without being a period
    if (length >= 2 || (length === 1 && !hasTime(raw.start))) period = { start: startDay, end: endDay };
    else occurrences = [{ start: raw.start, end: raw.end || null }];
  } else if (occurrences.length >= 10 && length >= 14) {
    // an exhibition open every day: the slots are kept, but it is filed with the periods
    period = { start: startDay, end: endDay };
  }
  return {
    title,
    key: titleKey(title),
    venueKey: slug(raw.venue),
    occurrences,
    period,
    venue: raw.venue || null,
    address: raw.address || null,
    city: raw.city || null,
    lat: raw.lat != null && Number.isFinite(+raw.lat) ? +raw.lat : undefined,
    lng: raw.lng != null && Number.isFinite(+raw.lng) ? +raw.lng : undefined,
    tags: (raw.tags || []).filter(Boolean),
    fallback: raw.fallback,
    timeHint: raw.timeHint || undefined,
    price: raw.price ? truncate(raw.price, 160) : null,
    free: raw.free === true || FREE.test(`${raw.price || ""} ${title}`) ? true : raw.free === false ? false : null,
    image: raw.image || null,
    description: truncate(raw.description || "", 1600),
    sources: [{ id: source.id, name: source.name, url: raw.url, via: raw.via || undefined }],
  };
}

function span(e) {
  const starts = e.occurrences.map((o) => dayOf(o.start));
  const ends = e.occurrences.map((o) => dayOf(o.end) || dayOf(o.start));
  if (e.period) {
    starts.push(e.period.start);
    ends.push(e.period.end);
  }
  return [starts.sort()[0], ends.sort().pop()];
}

function sameVenue(a, b) {
  if (!a.venueKey || !b.venueKey) return true;
  if (a.venueKey.includes(b.venueKey) || b.venueKey.includes(a.venueKey)) return true;
  if (a.lat != null && b.lat != null) return distance(a, b) < 350;
  return false;
}

function overlaps(a, b) {
  const [a0, a1] = span(a);
  const [b0, b1] = span(b);
  return a0 <= b1 && b0 <= a1;
}

// Merges b into a: keeps the richest field and adds up the sources.
function merge(a, b) {
  for (const o of b.occurrences) {
    const sameDay = a.occurrences.find((x) => dayOf(x.start) === dayOf(o.start));
    if (!sameDay) a.occurrences.push(o);
    // a source that only gives the day does not duplicate a session already known with its time
    else if (!hasTime(sameDay.start) && hasTime(o.start)) Object.assign(sameDay, o);
    else if (hasTime(o.start) && !a.occurrences.some((x) => x.start.slice(0, 13) === o.start.slice(0, 13))) a.occurrences.push(o);
  }
  if (b.period) {
    a.period = a.period
      ? { start: a.period.start < b.period.start ? a.period.start : b.period.start, end: a.period.end > b.period.end ? a.period.end : b.period.end }
      : b.period;
  }
  for (const k of ["venue", "address", "city", "price", "image", "fallback", "timeHint"]) a[k] = a[k] || b[k];
  if (!a.venueKey) a.venueKey = b.venueKey;
  if (a.lat == null && b.lat != null) Object.assign(a, { lat: b.lat, lng: b.lng });
  if ((b.description || "").length > (a.description || "").length) a.description = b.description;
  if (a.free == null) a.free = b.free;
  a.tags = [...new Set([...a.tags, ...b.tags])];
  for (const s of b.sources) if (!a.sources.some((x) => x.id === s.id)) a.sources.push(s);
  return a;
}

function dedupe(shaped) {
  const buckets = new Map();
  for (const e of shaped) {
    if (!buckets.has(e.key)) buckets.set(e.key, []);
    const bucket = buckets.get(e.key);
    const twin = bucket.find((x) => {
      // within one source, the same title in two places stays two events
      if (x.sources.some((s) => s.id === e.sources[0].id)) return x.venueKey === e.venueKey || (!!x.venueKey && !!e.venueKey && sameVenue(x, e));
      return overlaps(x, e) && sameVenue(x, e);
    });
    if (twin) merge(twin, e);
    else bucket.push(e);
  }
  return mergeVariants([...buckets.values()].flat());
}

// Second pass: the sources do not title the same concert alike ("Ghinzu", "Concert – Ghinzu",
// "Ghinzu, Dévore"). Two events from different sources are matched when they happen on the same
// day, at the same place, at the same time within 90 min, and one title starts with the other.
function mergeVariants(list) {
  const core = (e) => e.key.replace(/^concert /, "");
  const minutes = (s) => Date.parse(`${s}:00Z`) / 60000;
  const byDay = new Map();
  const out = [];
  for (const e of list) {
    const days = [...new Set(e.occurrences.map((o) => dayOf(o.start)))];
    let twin = null;
    for (const d of days) {
      twin = (byDay.get(d) || []).find((x) => {
        if (!sameVenue(x, e)) return false;
        if (x.sources.some((s) => e.sources.some((t) => t.id === s.id))) return false;
        const [short, long] = [core(x), core(e)].sort((a, b) => a.length - b.length);
        // without a known place on both sides, a more distinctive title is required
        if (short.length < (x.venueKey && e.venueKey ? 5 : 8) || !(long === short || long.startsWith(`${short} `))) return false;
        const a = x.occurrences.find((o) => dayOf(o.start) === d).start;
        const b = e.occurrences.find((o) => dayOf(o.start) === d).start;
        return !hasTime(a) || !hasTime(b) || Math.abs(minutes(a) - minutes(b)) <= 90;
      });
      if (twin) break;
    }
    if (twin) {
      // the longest title is the most complete (it names the opening acts)
      const plain = (t) => t.replace(/^concert\s*[–-]\s*/i, "");
      const title = plain(e.title).length > plain(twin.title).length ? plain(e.title) : plain(twin.title);
      merge(twin, e);
      twin.title = title;
      continue;
    }
    out.push(e);
    for (const d of days) {
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(e);
    }
  }
  return out;
}

// Computes what matters at time t: next session, following sessions, current period.
function finalize(e) {
  const now = nowLocal();
  const t = today();
  const stillOn = (o) => {
    // what happened today stays visible until midnight; the interface greys it out
    if (dayOf(o.start) === t) return true;
    if (o.end && o.end > o.start) return (hasTime(o.end) ? o.end : addDays(o.end, 1)) > now;
    if (!hasTime(o.start)) return o.start >= t;
    // without an end time, a session stays shown three hours after it starts
    return o.start >= now || (dayOf(o.start) === t && +o.start.slice(11, 13) >= +now.slice(11, 13) - 3);
  };
  const upcoming = e.occurrences.filter(stillOn).sort((a, b) => a.start.localeCompare(b.start));
  const period = e.period && e.period.end >= t ? e.period : null;
  if (!upcoming.length && !period) return null;

  const next = upcoming[0] || { start: period.start < t ? t : period.start, end: period.end };
  const id = crypto.createHash("sha1").update(`${e.key}|${e.venueKey}|${span(e)[0]}`).digest("hex").slice(0, 12);

  // Can one get there without getting lost? It needs a named street, or a precise place whose
  // position is known. "Dijon", "Hors les murs" or a mere town centre lead nowhere useful.
  const street = !!e.address && STREET.test(e.address);
  const named = !!e.venueKey && !VAGUE_PLACE.test(e.venueKey);
  const located = e.lat != null && !e.approxGeo;
  return {
    id,
    title: e.title,
    start: next.start,
    end: next.end || null,
    allDay: !hasTime(next.start),
    period,
    ongoing: !!period && period.start <= t,
    occurrences: upcoming.slice(1, 25).map((o) => ({ start: o.start, end: o.end || null })),
    venue: e.venue,
    address: e.address,
    city: e.city,
    lat: e.lat,
    lng: e.lng,
    approxGeo: e.approxGeo || undefined,
    precise: street || (named && located),
    // a "period" of more than five months is a permanent offer (year-round visit), not an event
    permanent: (!!period && daysBetween(period.start, period.end) > 150) || undefined,
    categories: categorize(e),
    ...facets(e),
    tags: e.tags.slice(0, 8),
    price: e.price,
    free: e.free === true,
    image: e.image,
    description: e.description,
    url: e.sources[0].url,
    sources: e.sources,
  };
}

// One place arrives in several spellings ("MUSEE DES BEAUX ARTS", "Musée des Beaux-Arts",
// "Auditorium" / "Auditorium de Dijon"). A single spelling is kept per place: the best written
// (accents, case) among those that name the same spot.
function unifyVenues(list) {
  const groups = new Map();
  for (const e of list) {
    if (!e.venueKey) continue;
    if (!groups.has(e.venueKey)) groups.set(e.venueKey, { key: e.venueKey, names: new Map(), events: [], lat: e.lat, lng: e.lng });
    const g = groups.get(e.venueKey);
    g.names.set(e.venue, (g.names.get(e.venue) || 0) + 1);
    g.events.push(e);
    if (g.lat == null && e.lat != null) Object.assign(g, { lat: e.lat, lng: e.lng });
  }
  const quality = (name, count) => (name.match(/[à-ÿ]/g) || []).length * 2 + (name === name.toUpperCase() ? -5 : 0) + (/[-–’]/.test(name) ? 1 : 0) + count / 100;
  const best = (g) => [...g.names].sort((a, b) => quality(b[0], b[1]) - quality(a[0], a[1]))[0][0];

  // same spot (under 60 m) and one name inside the other: it is the same place, keep the most frequent
  const all = [...groups.values()].sort((a, b) => b.events.length - a.events.length);
  for (const g of all) {
    if (g.into || g.lat == null) continue;
    for (const h of all) {
      if (h === g || h.into || h.lat == null || h.events.length > g.events.length) continue;
      const contains = ` ${g.key} `.includes(` ${h.key} `) || ` ${h.key} `.includes(` ${g.key} `);
      if (contains && distance(g, h) < 60) h.into = g;
    }
  }
  for (const g of all) {
    const target = g.into || g;
    const name = best(target);
    for (const e of g.events) Object.assign(e, { venue: name, venueKey: target.key });
  }
}

module.exports = { shape, dedupe, finalize, unifyVenues };
