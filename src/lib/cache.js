// Cache disque clé/valeur avec durée de vie, pour les fiches détail et le géocodage.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

function openCache(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  let store = {};
  try {
    store = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    /* premier lancement : cache vide */
  }
  let dirty = false;
  return {
    get(key) {
      const hit = store[key];
      if (!hit) return undefined;
      if (hit.exp && hit.exp < Date.now()) return undefined;
      return hit.v;
    },
    set(key, v, ttlSeconds) {
      store[key] = { v, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 };
      dirty = true;
    },
    save() {
      if (!dirty) return;
      for (const k of Object.keys(store)) if (store[k].exp && store[k].exp < Date.now()) delete store[k];
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(store));
      dirty = false;
    },
  };
}

module.exports = { openCache, DATA_DIR };
