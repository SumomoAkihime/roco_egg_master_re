import test from "node:test";
import assert from "node:assert/strict";
import type { ParentPet } from "../src/types";
import { compatible, findCrossPairWarnings, planShinyNests, planShinyRoutes } from "../src/shinyPlanner";

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
