#!/usr/bin/env node
/**
 * 将人工核实过的赛季图鉴 JSON 安全导入 database/。
 * 使用方式：
 *   node scripts/import-season-data.cjs --file path/to/verified-s5.json --season S5
 *   node scripts/import-season-data.cjs --file path/to/verified-s5.json --season S5 --apply
 *
 * 数据必须是“本仓库原生 database 格式”数组，或 { season, records: [] }。
 * 此脚本不会抓包、猜测 ID，也不会从未确认的网页强制覆盖旧数据。
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const databaseDir = path.join(root, "database");
const args = process.argv.slice(2);
function opt(key) {
  const index = args.indexOf(key);
  return index >= 0 ? args[index + 1] : undefined;
}
function fail(message) {
  console.error("[ERROR] " + message);
  process.exit(1);
}
const file = opt("--file");
const season = opt("--season");
const apply = args.includes("--apply");
const allowReplace = args.includes("--allow-replace");
if (!file || !season) fail("必须提供 --file 路径和 --season 赛季（例如 S5）");
if (!/^S\d{1,3}$/.test(season)) fail("--season 格式必须为 S5 等赛季标识");
if (!fs.existsSync(file)) fail("数据文件不存在: " + file);
const source = JSON.parse(fs.readFileSync(file, "utf8"));
const records = Array.isArray(source) ? source : source && source.records;
if (!Array.isArray(records) || !records.length) fail("输入必须为非空数组或 { records: [...] }");
if (source && source.season && source.season !== season) fail("文件中的赛季与 --season 不一致");
const allowedGroups = new Set([
 "两栖组","动物组","大地组","天空组","妖精组","巨灵组","拟人组",
 "昆虫组","机械组","植物组","海洋组","软体组","魔力组","龙组",
 "飞龙组","无法孵蛋"
]);
function validate(record, index) {
  if (!record || typeof record !== "object" || Array.isArray(record)) fail(`第 ${index+1} 条不是对象`);
  if (!Number.isSafeInteger(record.id) || record.id <= 0) fail(`第 ${index+1} 条缺少有效整数 id`);
  if (typeof record.name !== "string" || !record.name.trim()) fail(`ID ${record.id} 缺少名称`);
  if (!Array.isArray(record.evolution_chain) || !record.evolution_chain.every(n => typeof n === "string")) fail(`ID ${record.id} 缺少进化链`);
  for (const key of ["egg_groups"]) {
    if (record[key] !== undefined && (!Array.isArray(record[key]) || record[key].some(g => !allowedGroups.has(g)))) {
      fail(`ID ${record.id} 有未知蛋组，请核对后再导入`);
    }
  }
  for (const key of ["regional_forms","lord_forms","other_forms"]) {
    if (record[key] !== undefined && !Array.isArray(record[key])) fail(`ID ${record.id} 的 ${key} 必须是数组`);
  }
  return record;
}
const all = records.map(validate);
const ids = new Set();
for (const p of all) {
  if (ids.has(p.id)) fail("重复游戏图鉴 id: " + p.id);
  ids.add(p.id);
}
fs.mkdirSync(databaseDir, { recursive: true });
const existing = new Map();
for (const filename of fs.readdirSync(databaseDir).filter(f => f.endsWith(".json"))) {
  const filepath = path.join(databaseDir, filename);
  let record;
  try { record = JSON.parse(fs.readFileSync(filepath, "utf8")); }
  catch (err) { fail(`旧图鉴文件损坏: ${filename} (${err.message})`); }
  if (record && Number.isSafeInteger(record.id)) {
    if (existing.has(record.id)) fail(`旧图鉴重复 ID ${record.id}: ${filename}`);
    existing.set(record.id, { filepath, record });
  }
}
// 仓库使用的主 ID 属于图鉴条目，不得直接使用 Wiki 的 3001 等游戏配置 ID。
// 若一个名字在旧数据库已有其它 ID，阻止误导入为重复精灵。
const existingByName = new Map();
for (const { record } of existing.values()) {
  const key = String(record.name || "").trim();
  if (key) {
    const prior = existingByName.get(key);
    if (prior !== undefined && prior !== record.id) fail(`旧图鉴存在同名不同 ID: ${key} (${prior}, ${record.id})`);
    existingByName.set(key, record.id);
  }
}
for (const p of all) {
  const otherId = existingByName.get(p.name.trim());
  if (otherId !== undefined && otherId !== p.id) {
    fail(`精灵 ${p.name} 在本地已使用图鉴 ID ${otherId}，输入 ID ${p.id} 冲突；请先核对游戏配置 ID 与图鉴 ID 的区别`);
  }
}
const changes = [];
for (const p of all) {
  const old = existing.get(p.id);
  const oldName = old && old.record.name;
  if (old && oldName !== p.name && !allowReplace) fail(`ID ${p.id} 名称冲突: 旧 ${oldName}, 新 ${p.name}; 如确认变更，使用 --allow-replace`);
  const same = old && JSON.stringify(old.record) === JSON.stringify(p);
  if (!same) changes.push({ p, old, action: old ? "update" : "create" });
}
const report = {
  season, source_file: path.resolve(file), source_sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
  total_records: all.length, existing_records: existing.size,
  create: changes.filter(c => c.action === "create").length,
  update: changes.filter(c => c.action === "update").length,
  unchanged: all.length - changes.length,
  apply, records: changes.map(c => ({ id: c.p.id, name: c.p.name, action: c.action }))
};
console.log(JSON.stringify(report, null, 2));
if (!apply) {
  console.log("\n[DRY-RUN] 未写入文件。检查差异后追加 --apply。");
  process.exit(0);
}
const backupDir = path.join(root, "database-backups", `${season}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const { p, old } of changes) {
  if (old) {
    fs.copyFileSync(old.filepath, path.join(backupDir, path.basename(old.filepath)));
    fs.writeFileSync(old.filepath, JSON.stringify(p, null, 2) + "\n", "utf8");
  } else {
    fs.writeFileSync(path.join(databaseDir, `season-${season.toLowerCase()}-${p.id}.json`), JSON.stringify(p, null, 2) + "\n", { encoding:"utf8", flag:"wx" });
  }
}
const reportPath = path.join(backupDir, "import-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(`[OK] 已应用 ${changes.length} 条变更。旧文件备份和报告: ${backupDir}`);
console.log("下一步执行 npm run build，触发 scripts/update-all.cjs 重新生成 src/pets_data.json");
