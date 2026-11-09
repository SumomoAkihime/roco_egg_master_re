#!/usr/bin/env node
"use strict";
/**
 * Import the current S5 WIKI Lua Catalog as a REVIEWABLE overlay.
 *
 * Source: 洛克王国世界 WIKI Module:Pets/data/Catalog, CC BY-SA 4.0.
 * Attribution: https://wiki.biligame.com/nrc
 * Adaptations: numeric egg group IDs -> Chinese, physical ranges -> numbers,
 * species/appearance forms -> application data shape. No copyrighted descriptions
 * or game artwork is bundled.
 *
 * Defaults to DRY RUN. Use --apply only after review of report and source date.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname,"..");
const outputDir = path.join(root,"data-candidates");
const overlaysDir = path.join(root,"data","season-overlays");
const args = process.argv.slice(2);
const option = key => {const i=args.indexOf(key);return i>=0?args[i+1]:undefined};
const apply = args.includes("--apply");
const requireS5 = !args.includes("--allow-pre-s5");
const sourceFile=option("--file");
const sourceUrl=option("--source-url");
const endpointCandidates=[
 "https://wiki.biligame.com/nrc/index.php?title=Module%3APets%2Fdata%2FCatalog&action=raw",
 "https://wiki.biligame.com/nrc/Module%3APets%2Fdata%2FCatalog?action=raw",
 "https://wiki.biligame.com/nrc/api.php?action=parse&page=Module%3APets%2Fdata%2FCatalog&prop=wikitext&format=json"
];
const EGG_GROUPS={1:"无法孵蛋",2:"巨灵组",3:"两栖组",4:"昆虫组",5:"天空组",
 6:"动物组",7:"妖精组",8:"植物组",9:"拟人组",10:"软体组",11:"大地组",
 12:"魔力组",13:"海洋组",14:"龙组",15:"机械组"};
function fail(msg){throw new Error(msg)}
function parseLua(content){
 const re=/\s+|--[^\n]*|"(?:\\.|[^"\\])*"|-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z0-9_]*|[{}=\[\],;]/gy;
 const tokens=[];let pos=0;
 while(pos<content.length){re.lastIndex=pos;const m=re.exec(content);
   if(!m)fail("Malformed WIKI Lua at byte "+pos);
   pos=re.lastIndex;const v=m[0];
   if(!/^\s|^--/.test(v))tokens.push(v);
 }
 let ix=0;function take(expected){const x=tokens[ix++];if(expected!==undefined&&x!==expected)fail("Lua expected "+expected+" got "+x);return x;}
 function value(){const t=tokens[ix];if(t==="{"){take("{");const obj={},seq=[];let keyed=false;
   while(tokens[ix]!=="}"){if(ix>=tokens.length)fail("Unclosed Lua table");
     if(tokens[ix+1]==="="&&/^[A-Za-z_]/.test(tokens[ix])){const k=take();take("=");obj[k]=value();keyed=true;}
     else if(tokens[ix]==="["){take("[");const k=value();take("]");take("=");obj[k]=value();keyed=true;}
     else seq.push(value());
     if(tokens[ix]===","||tokens[ix]===";")take();else if(tokens[ix]!=="}")fail("Missing Lua table comma");
   }
   take("}");if(keyed&&seq.length)seq.forEach((v,i)=>obj[i+1]=v);return keyed?obj:seq;
 }
 if(t?.startsWith('"'))return JSON.parse(take());
 if(/^-?(?:\d|\.)/.test(t)){take();return Number(t)}
 if(["true","false","nil"].includes(t)){take();return t==="nil"?null:t==="true";}
 fail("Invalid Lua value "+t);
 }
 if(tokens[0]==="return")take("return");
 const parsed=value();if(ix!==tokens.length)fail("Trailing Lua tokens");if(!parsed||Array.isArray(parsed)||typeof parsed!=="object")fail("Expected Lua record map");return parsed;
}
function groups(record){
 const g=Array.isArray(record.egg_group)?record.egg_group:[];
 const result=g.map(x=>EGG_GROUPS[x]);
 if(result.some(x=>!x))fail("Unknown egg group "+JSON.stringify(g)+" on "+record.name);
 return result.length?[...new Set(result)]:["无法孵蛋"];
}
function range(v){const m=String(v||"").match(/([\d.]+)\s*(?:[~～-]\s*([\d.]+))?/);return m?[Number(m[1]),Number(m[2]||m[1])]:[null,null]}
function cleanTypes(v){return (Array.isArray(v)?v:[]).map(x=>String(x).replace(/系$/,""));}
function nativeForm(item){
 const [hmin,hmax]=range(item.height),[wmin,wmax]=range(item.weight),s=item.stats||{};
 const stats={hp:Number(s.hp)||0,speed:Number(s.spe)||0,atk:Number(s.atk)||0,
  def:Number(s.def)||0,sp_atk:Number(s.spa)||0,sp_def:Number(s.spd)||0};
 return {id:Number(item.number),name:item.title||item.name,egg_groups:groups(item),
  height_min:hmin,height_max:hmax,weight_min:wmin,weight_max:wmax,
  giant_weight_line:null,tiny_weight_line:null,types:cleanTypes(item.types),
  stats:{sum:Object.values(stats).reduce((a,b)=>a+b,0),stats}};
}
function convertLua(content,source){
 const parsed=parseLua(content);
 const all=Object.values(parsed).filter(x=>x&&/^[0-9]+$/.test(String(x.number||""))&&x.name);
 const s5=all.filter(x=>Number(x.number)>=467);
 const numbers=[...new Set(s5.map(x=>Number(x.number)))].sort((a,b)=>a-b);
 const hasS5Name=s5.some(x=>["小冥龙","冥古龙","地绡银龙","龙嵴金脉"].includes(x.name));
 if(requireS5&&(s5.length<5||!hasS5Name))
   fail("S5 freshness gate failed. Source has "+s5.length+" entries with dex number >=467; S5 signature not confirmed. Nothing written.");
 if(!s5.length)fail("No entries with dex number >=467");
 const allByEvo=new Map();
 for(const p of all){
   if(!p.evolution_id)continue;const list=allByEvo.get(p.evolution_id)||[];
   list.push(p);allByEvo.set(p.evolution_id,list);
 }
 const records=[];
 const gidToName={};
 for(const number of numbers){
   const species=s5.filter(x=>Number(x.number)===number).sort((a,b)=>(Number(a.stage)||0)-(Number(b.stage)||0));
   const base=species.find(x=>x.name===x.title)||species[0];
   const evolution=allByEvo.get(base.evolution_id)||species;
   const chain=[...new Set(evolution.sort((a,b)=>(Number(a.stage)||0)-(Number(b.stage)||0)||Number(a.number)-Number(b.number)).map(x=>x.name))];
   const egg=base.egg_size||{};
   records.push({
     id:number,name:base.name,filename:number+"-"+base.name+".png",
     egg_data:{egg_groups:groups(base),height_min:null,height_max:null,
       weight_min:Number.isFinite(egg.min)?egg.min/1000:null,
       weight_max:Number.isFinite(egg.max)?egg.max/1000:null,
       giant_weight_line:Number.isFinite(egg.huge_min)?egg.huge_min/1000:null,
       tiny_weight_line:Number.isFinite(egg.mini_max)?egg.mini_max/1000:null},
     evolution_chain:chain,forms:species.map(nativeForm),types:cleanTypes(base.types),
     has_shiny:species.some(x=>x.has_shiny===true),
     source_pet_key:base.id||null,source_game_id:base.game_id||null,
     source_release_date:base.release?.date||null
   });
   for(const x of species)if(Number.isSafeInteger(x.game_id)){
     const key=String(x.game_id),name=x.title||x.name;
     if(gidToName[key]&&gidToName[key]!==name)fail("Duplicate config ID "+key);
     gidToName[key]=name;
   }
 }
 const existingIds=new Set();for(const p of records){if(existingIds.has(p.id))fail("Duplicate dex ID "+p.id);existingIds.add(p.id)}
 const meta={
  source:"洛克王国世界 WIKI 实时 Lua Catalog",source_url:source,
  source_license:"CC BY-SA 4.0",license_url:"https://creativecommons.org/licenses/by-sa/4.0/",
  modification:"转换蛋组名称/单位和六维字段为本地应用结构；不含原文说明或图片",
  season_coverage:"S5 编号 467+ 初步候选，S5 实际完整性仍需逐项验收",
  min_number:numbers[0],max_number:numbers.at(-1),
  raw_sha256:crypto.createHash("sha256").update(content).digest("hex"),
  record_count:records.length,form_count:s5.length,
  generated_at:new Date().toISOString()
 };
 return {meta,records,game_id_to_name:gidToName};
}
async function getSource(){
 if(sourceFile){return {body:fs.readFileSync(path.resolve(sourceFile),"utf8"),url:path.resolve(sourceFile)}}
 const errors=[];
 for(const url of sourceUrl?[sourceUrl]:endpointCandidates){
   try {
     const response=await fetch(url,{headers:{accept:"text/plain,application/json;q=0.8","user-agent":"RocoEggMaster-WikiCatalogSync/0.1 (non-commercial research; one request)"},redirect:"follow",signal:AbortSignal.timeout(20000)});
     if(!response.ok)throw new Error("HTTP "+response.status);
     let body=await response.text();
     if(body.startsWith("{")&&body.includes('"parse"')){const d=JSON.parse(body);body=d.parse?.wikitext?.["*"]||d.parse?.wikitext||"";}
     if(!body.trim().startsWith("return {"))throw new Error("Unexpected payload prefix "+body.slice(0,80));
     return {body,url};
   } catch(error){errors.push(url+": "+error.message)}
 }
 fail("Unable to download current wiki Lua. "+errors.join("; "));
}
async function main(){
 const {body,url}=await getSource();
 const output=convertLua(body,url);
 fs.mkdirSync(outputDir,{recursive:true});
 const reportPath=path.join(outputDir,"s5-wiki-overlay.preview.json");
 fs.writeFileSync(reportPath,JSON.stringify(output,null,2)+"\n");
 console.log(JSON.stringify({dry_run:!apply,source:url,records:output.records.length,
  forms:output.meta.form_count,max_id:output.meta.max_number,signature:"S5 verified by names, full coverage NOT guaranteed",
  file:reportPath},null,2));
 if(apply){
   fs.mkdirSync(overlaysDir,{recursive:true});
   const target=path.join(overlaysDir,"wiki-s5.json");
   if(fs.existsSync(target))fail("Target already exists: "+target+" (manual review required)");
   fs.writeFileSync(target,JSON.stringify(output,null,2)+"\n",{flag:"wx"});
   console.log("[OK] Generated S5 candidate overlay at "+target+"; review and commit only after comparison");
 }
}
if(require.main===module)main().catch(e=>{console.error("[S5 ERROR]",e.message);process.exitCode=1;});
module.exports={parseLua,convertLua};
