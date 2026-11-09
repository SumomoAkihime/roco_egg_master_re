#!/usr/bin/env node
/**
 * Fetch ONLY a non-authoritative public catalog snapshot for manual review.
 * This intentionally DOES NOT write to database/ or src/pets_data.json.
 * Node.js 22+.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "data-candidates");
const endpoint = "https://091p.com/lkwg/wiki-api.php";
const s5Start = Date.parse("2026-11-05T00:00:00+08:00");
const PAGE_SIZE = 100;
const MAX_PAGES = 30;

function fail(message) {
  console.error("[catalog] " + message);
  process.exit(1);
}
async function getPage(pageNo) {
  const url = new URL(endpoint);
  url.searchParams.set("resource", "pets");
  url.searchParams.set("page_no", String(pageNo));
  url.searchParams.set("page_size", String(PAGE_SIZE));
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json", "user-agent": "roco-egg-master-catalog-check/0.1 (read-only)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} on page ${pageNo}`);
  const data = await response.json();
  if (!data || data.ok !== true || !Array.isArray(data.items)) throw new Error(`Page ${pageNo}: unexpected JSON structure`);
  return data;
}
function identity(record) {
  const id = record.pet_id ?? record.id ?? record.config_id ?? record.conf_id;
  return id === undefined ? JSON.stringify(record) : String(id);
}
async function main() {
  const items = [];
  const seen = new Set();
  const sources = [];
  let stale = false;
  let updatedAt = null;
  let pages = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await getPage(page);
    pages++;
    sources.push(data.source || endpoint);
    if (data.stale === true) stale = true;
    if (typeof data.updated_at === "string" && (!updatedAt || data.updated_at > updatedAt)) updatedAt = data.updated_at;
    for (const item of data.items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const id = identity(item);
      if (seen.has(id)) continue;
      seen.add(id);
      items.push(item);
    }
    if (data.items.length < PAGE_SIZE) break;
    // Avoid hammering the community API.
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  if (pages >= MAX_PAGES) fail("Reached maximum pages; pagination may be unstable. No data saved.");
  if (!items.length) fail("Empty public catalog; no data saved.");
  const recentEnough = !!updatedAt && Date.parse(updatedAt) >= s5Start;
  const output = {
    type: "unverified-public-catalog-snapshot",
    source: endpoint,
    fetched_at: new Date().toISOString(),
    source_updated_at: updatedAt,
    source_stale: stale,
    s5_freshness_gate: recentEnough && !stale ? "recent-but-unverified" : "not-s5-verified",
    items_count: items.length,
    pages,
    warning: "Source IDs may be game config IDs rather than this project's catalog IDs. Do not directly feed items into import-season-data.cjs.",
    items,
  };
  fs.mkdirSync(outDir, { recursive: true });
  const filename = path.join(outDir, "091p-pets-unverified.json");
  const raw = JSON.stringify(output, null, 2) + "\n";
  fs.writeFileSync(filename, raw, "utf8");
  console.log(JSON.stringify({
    path: filename,
    source_updated_at: updatedAt,
    items_count: items.length,
    pages,
    s5_freshness_gate: output.s5_freshness_gate,
    sha256: crypto.createHash("sha256").update(raw).digest("hex"),
    note: "Snapshot is for manual comparison ONLY. Existing catalog not modified."
  }, null, 2));
}
main().catch(error => fail(error.message));
