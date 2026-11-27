// Small HTTP client shared by every scraper: max delay, one retry.
// Browser UA: the libraries portal answers 403 to any other agent.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function get(url, { timeout = 25000, retries = 1, headers = {}, as = "text" } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9", ...headers },
        signal: AbortSignal.timeout(timeout),
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
      if (as === "json") return JSON.parse((await res.text()).replace(/^\uFEFF/, ""));
      if (as === "buffer") return Buffer.from(await res.arrayBuffer());
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Runs fn on each item with at most `limit` concurrent requests (staying polite with the sites).
async function pmap(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i], i);
      } catch {
        out[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

module.exports = { get, pmap, UA };
