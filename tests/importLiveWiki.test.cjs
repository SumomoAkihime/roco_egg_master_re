const test=require("node:test");
const assert=require("node:assert/strict");
const {parseLua,convertLua}=require("../scripts/import-live-wiki.cjs");

test("Lua catalog literal records parse safely",()=>{
 const source='return {pet_000001={number="467",name="小冥龙",title="小冥龙",stage=1,egg_group={14},stats={hp=123,atk=64,def=78,spa=45,spd=67,spe=89},evolution_id="evoA",height="1~2M",weight="3~4KG",has_shiny=true,game_id=7777}}';
 const parsed=parseLua(source);
 assert.equal(parsed.pet_000001.name,"小冥龙");
 assert.deepEqual(parsed.pet_000001.egg_group,[14]);
});

test("S5 importer rejects old mirror even if data is structurally valid",()=>{
 const s='return {pet_000001={number="466",name="果实立方人",title="果实立方人",egg_group={1}}}';
 assert.throws(()=>convertLua(s,"fixture"),/S5 freshness gate failed/);
});

test("S5 importer normalizes egg groups and game mappings",()=>{
 const make=(n,name)=>`pet_00${n}={number="${n}",name="${name}",title="${name}",stage=1,egg_group={14,7},evolution_id="evo${n}",game_id=${7000+n},height="1~2M",weight="2~3KG",stats={hp=1,atk=1,def=1,spa=1,spd=1,spe=1}}`;
 const s='return {'+[make(467,"小冥龙"),make(468,"S5样例B"),make(469,"S5样例C"),make(470,"S5样例D"),make(471,"S5样例E")].join(",")+"}";
 const o=convertLua(s,"fixture");
 assert.equal(o.records.length,5);
 assert.equal(o.records[0].id,467);
 assert.deepEqual(o.records[0].forms[0].egg_groups,["龙组","妖精组"]);
 assert.equal(o.game_id_to_name["7467"],"小冥龙");
});
