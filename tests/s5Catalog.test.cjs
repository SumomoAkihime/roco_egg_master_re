const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),"utf8"));
const catalog=read("src/pets_data.json");
const mapped=read("src/game_id_to_name.json");
const wiki=read("data/season-overlays/wiki-s5-467-493.json");
const extras=read("data/season-overlays/roco-world-s5-494-496.json");
const s5=[...wiki.records,...extras.records];

test("2026-11 S5 base catalog contains contiguous dex 467–496 with source attribution",()=>{
 assert.equal(s5.length,30);
 assert.deepEqual(s5.map(x=>x.id),Array.from({length:30},(_,i)=>i+467));
 assert.equal(s5.reduce((n,x)=>n+x.forms.length,0),32);
 for(const overlay of [wiki,extras]){
  assert.ok(/^https:\/\//.test(overlay.meta.source_url));
  assert.ok(overlay.meta.snapshot_date);
 }
});
test("new entries are bundled exactly once and retain distinct game configuration IDs",()=>{
 assert.equal(catalog.length,234);
 assert.equal(catalog.reduce((n,x)=>n+x.forms.length,0),667);
 assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
 assert.equal(catalog.at(-1).id,496);
 for(const row of s5) {
  const installed=catalog.find(x=>x.id===row.id);
  assert.deepEqual(installed,row);
  if ([480,486,489].includes(row.id)) {
   assert.equal(row.source_game_id,null);
   assert.ok(Number.isSafeInteger(row.source_game_id_candidate));
   assert.equal(mapped[String(row.source_game_id_candidate)],undefined);
  } else assert.ok(Number.isSafeInteger(row.source_game_id));
 }
 assert.equal(mapped["3168"],"阿布");
 assert.equal(mapped["3806"],"阿瓦鲨_柠檬鲨的样子");
 assert.equal(mapped["3807"],"阿瓦鲨_虎纹鲨的样子");
 assert.equal(mapped["3824"],"铃兰夫人");
});
test("all game ID aliases are unique, and form names for new S5 dex are represented",()=>{
 const knownNames=new Set(catalog.flatMap(p=>p.forms.map(f=>f.name)));
 for(const overlay of [wiki,extras]){
  for(const [configId,name] of Object.entries(overlay.game_id_to_name)){
   assert.equal(mapped[configId],name);
   assert.ok(knownNames.has(name),`missing form for ${configId} = ${name}`);
  }
 }
});
test("egg groups known from WIKI are accepted, unknown marked unknown (not cannot breed)",()=>{
 const valid=new Set(["两栖组","动物组","大地组","天空组","妖精组","巨灵组","拟人组","昆虫组","机械组","植物组","海洋组","软体组","魔力组","龙组"]);
 for(const row of s5){
  assert.ok(Array.isArray(row.egg_data.egg_groups));
  assert.ok(row.egg_data.egg_groups.every(x=>valid.has(x)));
  for(const form of row.forms){
   assert.ok(form.stats&&Number.isFinite(form.stats.sum)&&form.stats.sum>0);
   assert.equal(form.stats.sum,Object.values(form.stats.stats).reduce((a,b)=>a+b,0));
  }
 }
 for(const id of [469,470,471,472,473,474,475,476,493]){
  assert.deepEqual(catalog.find(p=>p.id===id).egg_data.egg_groups,[]);
 }
});
