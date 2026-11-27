const cheerio = require("cheerio");

// HTML -> readable text, entities decoded, spaces collapsed.
function clean(html) {
  if (!html) return "";
  const withBreaks = String(html).replace(/<(br|\/p|\/div|\/li|\/h\d)\b[^>]*>/gi, "$& ");
  return cheerio.load(`<body>${withBreaks}</body>`)("body").text().replace(/\s+/g, " ").trim();
}

function truncate(s, n = 420) {
  s = String(s || "");
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

function absolute(url, base) {
  if (!url) return null;
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

// Extracts every schema.org object of a given type from a page's JSON-LD blocks.
function jsonLd(html, type) {
  const found = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    if ([].concat(o["@type"] || []).some((t) => t === type || String(t).endsWith(type))) found.push(o);
    Object.values(o).forEach(walk);
  };
  for (const m of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1]));
    } catch {
      /* invalid JSON-LD block: ignored */
    }
  }
  return found;
}

module.exports = { clean, truncate, absolute, jsonLd };
