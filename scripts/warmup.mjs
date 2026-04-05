import { readFileSync } from "fs";
import { resolve } from "path";

const SAMPLES = [
  "70 Pine Street, New York, NY",
  "8500 Burton Way, Los Angeles, CA",
  "301 West Ave, Austin, TX",
  "200 N Michigan Ave, Chicago, IL",
  "1600 NE 1st Ave, Miami, FL",
  "929 Massachusetts Ave, Cambridge, MA",
  "265 Ponce De Leon Ave NE, Atlanta, GA",
  "2116 4th Ave, Seattle, WA",
];

const BASE = "http://localhost:3000";
const DELAY = 120; // seconds between each API call
const TIMEOUT = 300000; // 5 minutes fetch timeout

function sleep(sec) {
  return new Promise(r => setTimeout(r, sec * 1000));
}

function cacheKey(addr) {
  return addr.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function loadCache() {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), "data/sample-cache.json"), "utf-8"));
  } catch { return { geocode: {}, analyze: {} }; }
}

async function fetchWithTimeout(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function warmOne(address, idx, total) {
  const label = `[${idx}/${total}]`;
  const cache = loadCache();
  const geoKey = cacheKey(address);

  // --- GEOCODE ---
  let geo;
  if (cache.geocode[geoKey]) {
    geo = cache.geocode[geoKey];
    console.log(`${label} Geocode CACHED: ${geo.normalized}`);
  } else {
    console.log(`${label} Geocoding: ${address}`);
    const t0 = Date.now();
    try {
      const res = await fetchWithTimeout(`${BASE}/api/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      geo = await res.json();
      if (!res.ok || geo.error) {
        console.log(`${label} GEOCODE FAILED: ${geo.error || "unknown"}`);
        return "fail";
      }
      console.log(`${label} Geocoded in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${geo.normalized}`);
    } catch (e) {
      console.log(`${label} GEOCODE ERROR: ${e.message}`);
      return "fail";
    }
    // wait before next API call
    console.log(`${label} Cooling down ${DELAY}s...`);
    await sleep(DELAY);
  }

  // --- ANALYZE ---
  const analyzeKey = cacheKey(geo.normalized || "");
  const freshCache = loadCache();
  if (freshCache.analyze[analyzeKey]) {
    console.log(`${label} Analyze CACHED: ${geo.normalized}`);
    return "cached";
  }

  console.log(`${label} Analyzing: ${geo.normalized}`);
  const t1 = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property: geo }),
    });
    const ana = await res.json();
    if (!res.ok || ana.error) {
      console.log(`${label} ANALYZE FAILED: ${ana.error || "unknown"}`);
      return "fail";
    }
    console.log(`${label} Analyzed in ${((Date.now() - t1) / 1000).toFixed(1)}s`);
    console.log(`${label} Risk: ${ana.regulatoryRiskLevel || "?"} | Class: ${ana.finalApplicability?.classification || "?"}`);
    return "done";
  } catch (e) {
    console.log(`${label} ANALYZE ERROR: ${e.message}`);
    return "fail";
  }
}

async function main() {
  // figure out what still needs work
  const cache = loadCache();
  const todo = SAMPLES.filter(addr => {
    const gk = cacheKey(addr);
    const geo = cache.geocode[gk];
    if (!geo) return true;
    const ak = cacheKey(geo.normalized || "");
    return !cache.analyze[ak];
  });

  console.log("=== RENT CONTROL INTELLIGENCE - CACHE WARMUP ===");
  console.log(`Total samples: ${SAMPLES.length} | Already complete: ${SAMPLES.length - todo.length} | Remaining: ${todo.length}`);
  console.log(`Delay between API calls: ${DELAY}s | Fetch timeout: ${TIMEOUT / 1000}s`);
  console.log(`Started: ${new Date().toLocaleString()}\n`);

  if (todo.length === 0) {
    console.log("All samples already cached! Nothing to do.");
    return;
  }

  let success = 0, fail = 0;

  for (let i = 0; i < todo.length; i++) {
    const result = await warmOne(todo[i], i + 1, todo.length);
    if (result === "fail") fail++;
    else success++;

    if (i < todo.length - 1 && result !== "cached") {
      console.log(`\n--- Waiting ${DELAY}s before next sample ---\n`);
      await sleep(DELAY);
    }
  }

  console.log("\n=== WARMUP COMPLETE ===");
  console.log(`Success: ${success} | Failed: ${fail}`);
  console.log(`Finished: ${new Date().toLocaleString()}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
