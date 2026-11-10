import test from "node:test";
import assert from "node:assert/strict";
import { getPetDetails, getPetGuideSize, ALL_PET_NAMES } from "../src/petHelper";
import { eggGroups } from "../src/shinyPlanner";

test("S5 variant-only 阿瓦鲨 resolves under its base species name", () => {
  const base = getPetDetails("阿瓦鲨");
  assert.ok(base, "base species alias must exist");
  assert.deepEqual(base.groups, ["海洋组"]);
  assert.deepEqual(eggGroups("阿瓦鲨"), ["海洋组"]);
  assert.deepEqual(eggGroups("阿瓦鲨_虎纹鲨的样子"), ["海洋组"]);
  assert.ok(ALL_PET_NAMES.includes("阿瓦鲨"));
  assert.ok(getPetGuideSize("阿瓦鲨"));
});
test("S5 bell family has dual egg groups", () => {
  for(const name of ["呆呆铃","跳跳铃","铃兰夫人"]){
    assert.deepEqual(eggGroups(name), ["植物组","拟人组"]);
  }
});
test("unconfirmed egg groups do not invent a breeding compatibility", () => {
  for (const name of ["小冥龙","地银链","阿布"]) {
    assert.deepEqual(eggGroups(name), []);
  }
});
