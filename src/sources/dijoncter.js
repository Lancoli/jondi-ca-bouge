// Dijoncter.info: activist and alternative agenda (public meetings, screenings, work days, struggle parties), as iCal.
const { get } = require("../lib/http");
const { parseIcal, icalDate } = require("../lib/ical");

module.exports = {
  id: "dijoncter",
  name: "Dijoncter",
  site: "https://dijoncter.info/?page=agenda",
  kind: "Flux iCal",
  async fetch() {
    const ics = await get("https://dijoncter.info/spip.php?page=agenda-ical");
    return parseIcal(ics).map((e) => ({
      title: e.SUMMARY,
      url: e.URL,
      start: icalDate(e.DTSTART),
      end: icalDate(e.DTEND),
      venue: e.LOCATION || null,
      description: (e.DESCRIPTION || "").replace(/Retour ligne automatique/g, " ").replace(/\s+/g, " ").trim(),
      tags: ["militant"],
    }));
  },
};
