// Toutes les dates manipulées sont des heures murales de Paris, au format "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm".
const TZ = "Europe/Paris";

const MONTHS = {
  janvier: 1, janv: 1, jan: 1,
  fevrier: 2, fevr: 2, fev: 2,
  mars: 3, mar: 3,
  avril: 4, avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7, juil: 7, jul: 7,
  aout: 8, aou: 8,
  septembre: 9, sept: 9, sep: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  decembre: 12, dec: 12,
};

const pad = (n) => String(n).padStart(2, "0");
const strip = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const fmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

// Instant (Date, ISO avec fuseau, timestamp) -> heure murale de Paris.
function toLocal(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d)) return null;
  return fmt.format(d).replace(" ", "T").replace("T24:", "T00:");
}

const nowLocal = () => toLocal(new Date());
const today = () => nowLocal().slice(0, 10);

function addDays(day, n) {
  const d = new Date(day.slice(0, 10) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function monthNumber(word) {
  return MONTHS[strip(word).replace(/\./g, "")] || null;
}

// "Samedi 10 octobre 2026", "10 oct.", "1er mars" -> "2026-10-10". Sans année : la prochaine occurrence.
function parseFrDate(text, { defaultYear } = {}) {
  const m = strip(text).match(/(\d{1,2})(?:er)?\s+([a-z]{3,9})\.?(?:\s+(\d{4}))?/);
  if (!m) return null;
  const month = monthNumber(m[2]);
  if (!month) return null;
  let year = m[3] ? +m[3] : defaultYear;
  if (!year) {
    const t = today();
    year = +t.slice(0, 4);
    // une date sans année déjà passée de plus de deux mois désigne l'an prochain
    if (`${year}-${pad(month)}-${pad(+m[1])}` < addDays(t, -60)) year++;
  }
  return `${year}-${pad(month)}-${pad(+m[1])}`;
}

// "14h30", "14 h", "14:30", "20h" -> "14:30"
function parseFrTime(text) {
  const m = String(text || "").match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/i);
  if (!m || +m[1] > 23) return null;
  return `${pad(+m[1])}:${m[2] || "00"}`;
}

// Année d'une date de saison culturelle (sept. -> août) exprimée sans année.
function seasonYear(month, seasonStartYear) {
  return month >= 8 ? seasonStartYear : seasonStartYear + 1;
}

// Saison en cours : démarre en août.
function currentSeasonStart() {
  const t = today();
  return +t.slice(5, 7) >= 8 ? +t.slice(0, 4) : +t.slice(0, 4) - 1;
}

module.exports = {
  TZ, pad, strip, toLocal, nowLocal, today, addDays, monthNumber, parseFrDate, parseFrTime, seasonYear, currentSeasonStart,
};
