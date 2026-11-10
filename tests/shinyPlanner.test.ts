import test from "node:test";
import assert from "node:assert/strict";
import type { ParentPet } from "../src/types";
import { compatible, evolutionPath, findCrossPairWarnings, planShinyNests, planShinyRoutes } from "../src/shinyPlanner";

const p = (id: string, sprite: string, gender: "♂" | "♀", isShiny = false, groups: string[] = []): ParentPet => ({
 id, sprite, gender, isShiny, groups, brand: "普通", height: "", weight: "", nature: "", stats: []
});

test("no shiny parent means no proposed shiny nests", () => {
 const parents = [p("a","火花","♂"),p("b","水蓝蓝","♀")];
 assert.equal(planShinyNests(parents, [], 10).length, 0);
});
test("matching egg groups allow a candidate; mismatched groups do not", () => {
 const parents = [p("a","火花","♂",true),p("b","水蓝蓝","♀"),p("c","喵喵","♀")];
 const pairs = planShinyNests(parents, ["水蓝蓝"], 10);
 assert.equal(pairs.length, 1);
 assert.equal(pairs[0].mother.id, "b");
 assert.deepEqual(compatible(parents[0], parents[2]), []);
});
test("one-to-one limits reuse of a father", () => {
 const parents = [p("a","火花","♂",true),p("b","水蓝蓝","♀"),p("c","水灵","♀")];
 assert.equal(planShinyNests(parents, [], 10, "pairs").length, 1);
 assert.equal(planShinyNests(parents, [], 10, "shared").length, 2);
});
test("unknown target is flagged rather than invented", () => {
 const routes = planShinyRoutes([p("a","火花","♂",true)], ["不存在的S5精灵123"]);
 assert.equal(routes[0].status, "unknown");
});
test("cross pairs are reported for overlapping groups", () => {
 const father1 = p("a","火花","♂",true);
 const father2 = p("b","水蓝蓝","♂",true);
 const mother1 = p("c","水蓝蓝","♀");
 const mother2 = p("d","火花","♀");
 const pairs = planShinyNests([father1,father2,mother1,mother2],[],2,"pairs");
 const crosses = findCrossPairWarnings(pairs);
 assert.ok(crosses.every(pair => pair.groups.length > 0));
});

test("shiny female can be paired with a compatible ordinary male", () => {
 const parents = [p("a", "火花", "♀", true), p("b", "水蓝蓝", "♂")];
 const pairs = planShinyNests(parents, [], 10);
 assert.equal(pairs.length, 1);
 assert.equal(pairs[0].mother.id, "a");
});
test("female-only shiny source is a conditional route requiring male offspring", () => {
 const parents = [p("a", "火花", "♀", true), p("b", "水蓝蓝", "♂")];
 const route = planShinyRoutes(parents, ["水蓝蓝"])[0];
 assert.equal(route.status, "reachable");
 assert.equal(route.requiresMaleOffspring, true);
});
test("large warehouse with only one shiny source remains bounded by nest count", () => {
 const parents = [p("seed", "火花", "♂", true), ...Array.from({ length: 1000 }, (_, n) =>
   p("m" + n, "水蓝蓝", "♀"))];
 const pairs = planShinyNests(parents, [], 10);
 assert.equal(pairs.length, 10);
 assert.equal(new Set(pairs.map(x => x.mother.id)).size, 10);
});

test("owned earlier shiny evolution counts as a no-egg path",()=>{
 const pets=[p("a","布灵","♀",true)];
 const route=planShinyRoutes(pets,["布灵布灵"])[0];
 assert.equal(route.status,"evolve");
 assert.deepEqual(route.species,["布灵","布灵布灵"]);
 assert.deepEqual(route.missingMothers,[]);
});
test("evolution does not run backwards or between parallel terminal branches",()=>{
 assert.equal(evolutionPath("布灵布灵","布灵"),null);
 assert.equal(evolutionPath("翠顶夫人","黑羽夫人"),null);
});
test("a target's earlier evolution stage is prioritized as a breeding mother",()=>{
 const parents=[
   p("f","布灵","♂",true),
   p("m1","布灵","♀",false),
   p("m2","半朽蜜果灵","♀",false)
 ];
 const result=planShinyNests(parents,["布灵布灵"],1);
 assert.equal(result[0].mother.sprite,"布灵");
});
