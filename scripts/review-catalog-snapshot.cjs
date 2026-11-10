#!/usr/bin/env node
/**
 * Compare an unverified public snapshot with local static species names.
 * Results are a review queue, NOT S5 patches.
 * Run after fetch-public-catalog.cjs.
 */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const candidate = path.join(root, "data-candidates", "091p-pets-unverified.json");
const localCatalog = path.join(root, "src", "pets_data.json");
const gameMapping = path.join(root, "src", "game_id_to_name.json");
function die(message) { console.error("[review] " + message); process.exit(1); }
function normalized(value) {
  return String(value ?? "").trim().normalize("NFKC").toLowerCase();
}
function rawName(item) {
  const fields = ["name", "pet_name", "display_name", "petName", "title"];
  for (const field of fields) {
    if (typeof item[field] === "string" && item[field].trim()) return item[field].trim();
  }
  return "";
}
function rawId(item) {
  const fields = ["pet_id", "config_id", "conf_id", "id"];
  for (const field of fields) {
    const value = item[field];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return "";
}
function csvField(input) {
  let string = String(input ?? "");
  if (/^[=+@-]/.test(string)) string = "'" + string; // spreadsheet formula injection prevention
  return '"' + string.replace(/"/g, '""') + '"';
}
if (!fs.existsSync(candidate)) die("Missing snapshot: run node scripts/fetch-public-catalog.cjs first.");
const snapshot = JSON.parse(fs.readFileSync(candidate, "utf8"));
if (snapshot.type !== "unverified-public-catalog-snapshot" || !Array.isArray(snapshot.items)) die("Unexpected snapshot format");
const local = JSON.parse(fs.readFileSync(localCatalog, "utf8"));
const mapping = fs.existsSync(gameMapping) ? JSON.parse(fs.readFileSync(gameMapping, "utf8")) : {};
const localNames = new Set();
for (const pet of local) {
  if (pet.name) localNames.add(normalized(pet.name));
  for (const form of pet.forms || []) if (form.name) localNames.add(normalized(form.name));
}
const records = [];
const unrecognized = new Set();
for (const item of snapshot.items) {
  if (!item || typeof item !== "object") continue;
  const id = rawId(item);
  const name = rawName(item);
  if (!name) for (const key of Object.keys(item)) unrecognized.add(key);
  const localName = id ? String(mapping[id] || "") : "";
  const inLocal = name ? localNames.has(normalized(name)) : false;
  const mappingConflict = !!(name && localName && normalized(name) !== normalized(localName));
  records.push({
    source_id: id, source_name: name, mapped_name_for_id: localName,
    found_in_local_catalog: inLocal, id_name_mismatch: mappingConflict,
    requires_review: !name || !inLocal || mappingConflict
  });
}
const recognizable = records.filter(x => x.source_name).length;
if (recognizable === 0) die("Could not identify pet-name field in this API response. Example keys: " + [...unrecognized].slice(0, 30).join(", "));
const report = {
  source: snapshot.source,
  source_updated_at: snapshot.source_updated_at,
  s5_freshness_gate: snapshot.s5_freshness_gate,
  disclaimer: "Candidate-only diff, not proof of S5 coverage. Source IDs may differ from project catalog IDs.",
  source_count: records.length,
  local_species_and_forms_count: localNames.size,
  candidate_missing_names: records.filter(x => !!x.source_name && !x.found_in_local_catalog).length,
  missing_name_fields: records.filter(x => !x.source_name).length,
  id_name_mismatches: records.filter(x => x.id_name_mismatch).length,
  entries: records
};
const outputPath = path.join(root, "data-candidates", "catalog-review.json");
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
const header = ["source_id","source_name","mapped_name_for_id","found_in_local_catalog","id_name_mismatch","requires_review"];
const csv = [header.join(","), ...records.filter(x => x.requires_review).map(row =>
  header.map(k => csvField(row[k])).join(","))].join("\n") + "\n";
const csvPath = path.join(root, "data-candidates", "catalog-review.csv");
fs.writeFileSync(csvPath, "\ufeff" + csv, "utf8");
console.log(JSON.stringify({
  source_updated_at: report.source_updated_at, freshness: report.s5_freshness_gate,
  source_count: records.length,
  candidate_missing_names: report.candidate_missing_names,
  id_name_mismatches: report.id_name_mismatches,
  review_json: outputPath, review_csv: csvPath,
  note: "Only read/review files were written; catalog and player data unchanged."
}, null, 2));
