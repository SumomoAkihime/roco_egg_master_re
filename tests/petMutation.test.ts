import test from "node:test";
import assert from "node:assert/strict";
import { decodePetMutation } from "../src/petMutation";

test("mutation_type=0 is confirmed ordinary; not unknown", () => {
 assert.deepEqual(decodePetMutation({ mutation_type: 0 }), {
   isShiny: false, isColorful: false, source: "mutation_type", hasConflict: false
 });
});
test("mutation_type bit 0 marks shiny without colourful", () => {
 const r=decodePetMutation({ mutation_type: 1 });
 assert.equal(r.isShiny,true);
 assert.equal(r.isColorful,false);
});
test("mutation_type bit 3 marks colourful without shiny", () => {
 const r=decodePetMutation({ mutation_type: 8 });
 assert.equal(r.isShiny,false);
 assert.equal(r.isColorful,true);
});
test("mutation_type=9 marks both shiny and colourful", () => {
 const r=decodePetMutation({ mutation_type: "9" });
 assert.equal(r.isShiny,true);
 assert.equal(r.isColorful,true);
});
test("legacy is_shiny and rocom-capture shiny booleans are accepted", () => {
 assert.equal(decodePetMutation({is_shiny: true}).isShiny,true);
 assert.equal(decodePetMutation({shiny: true,colorful: true}).isColorful,true);
 assert.equal(decodePetMutation({is_shiny: false}).source,"flag");
});
test("missing flags remain unknown rather than false", () => {
 assert.deepEqual(decodePetMutation({}),{
   isShiny:undefined,isColorful:undefined,source:"unknown",hasConflict:false
 });
});
test("contradictory flags require manual review and never overwrite verified state", () => {
 for (const row of [
   {mutation_type: 1, shiny: false},
   {mutation_type: 8, is_shiny: true},
   {is_shiny: true, shiny: false},
   {mutation_type: "bad",shiny:true},
   {mutation_type: 1,mutationType: 0}
 ]) {
  const got=decodePetMutation(row);
  assert.equal(got.source,"conflict");
  assert.equal(got.hasConflict,true);
  assert.equal(got.isShiny,undefined);
 }
});
test("non boolean shiny flags and malformed numbers never become confirmed shiny",()=>{
 assert.equal(decodePetMutation({shiny:1}).isShiny,undefined);
 assert.equal(decodePetMutation({mutation_type:-1}).hasConflict,true);
 assert.equal(decodePetMutation({mutation_type:2**35}).hasConflict,true);
});
