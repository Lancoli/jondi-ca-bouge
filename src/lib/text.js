const cheerio = require("cheerio");

// HTML -> texte lisible, entités décodées, espaces resserrés.
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

// Extrait tous les objets schema.org d'un type donné depuis les blocs JSON-LD d'une page.
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
      /* bloc JSON-LD invalide : on l'ignore */
    }
  }
  return found;
}

module.exports = { clean, truncate, absolute, jsonLd };
