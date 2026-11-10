import test from "node:test";
import assert from "node:assert/strict";
import { resolvePetNameByConfig, importedPetGid, catalogDexId } from "../src/petImportIdentity";

const names={"3001":"喵喵","3200":"魔力猫","3806":"阿瓦鲨_柠檬鲨的样子","3807":"阿瓦鲨_虎纹鲨的样子"};
test("current evolution or form base_conf_id must win over family conf_id", () => {
  assert.equal(resolvePetNameByConfig({conf_id:3001,base_conf_id:3200},names),"魔力猫");
  assert.equal(resolvePetNameByConfig({conf_id:3806,base_conf_id:3807},names),"阿瓦鲨_虎纹鲨的样子");
});
test("falls back to family config only when current form is not mapped", () => {
  assert.equal(resolvePetNameByConfig({conf_id:"3001",base_conf_id:"999999"},names),"喵喵");
});
test("does not interpret game config IDs as dex IDs", () => {
  assert.equal(catalogDexId({base_conf_id:3807,conf_id:3806}),undefined);
  assert.equal(catalogDexId({dex_id:478,base_conf_id:3807}),478);
});
test("preserves full length GID as string on both SQLite and API responses", () => {
  const gid="12345678901234567890";
  assert.equal(importedPetGid({gid,base_conf_id:3807}),gid);
  assert.equal(importedPetGid({id:gid,base_conf_id:3807}),gid);
  assert.equal(importedPetGid({id:478}),undefined);
  assert.equal(importedPetGid({gid:Number(gid)}),undefined);
});
