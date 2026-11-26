const { toLocal } = require("./dates");

// Parseur iCalendar minimal : VEVENT -> objet de propriétés (les lignes repliées sont recollées).
function parseIcal(text) {
  const lines = String(text).replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
    } else if (cur) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const key = line.slice(0, i).split(";")[0].toUpperCase();
      cur[key] = line.slice(i + 1).replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
    }
  }
  return events;
}

// "20261009T170000Z" -> heure de Paris ; "20261009" -> jour seul ; sans Z : déjà en heure locale.
function icalDate(v) {
  const m = String(v || "").match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return null;
  if (!m[4]) return `${m[1]}-${m[2]}-${m[3]}`;
  if (m[7]) return toLocal(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
}

module.exports = { parseIcal, icalDate };
