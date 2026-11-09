import test from "node:test";
import assert from "node:assert/strict";
import { assignLocalBoxPositions, gameIdString, mapLocalBoxPositions } from "../src/localHelperApi";

test("map /api/box-info zero-based box and slot identifiers", () => {
  const positions = mapLocalBoxPositions([{ id: 0, data: [0, 10001, 0, 10002] }]);
  assert.equal(positions.size, 2);
  assert.equal(positions.get("10001"), "仓库1·位置2");
  assert.equal(positions.get("10002"), "仓库1·位置4");
});

test("preserve 64-bit IDs supplied as strings without Number conversion", () => {
  const largeGid = "12345678901234567890";
  const positions = mapLocalBoxPositions([{ id: 3, data: [largeGid] }]);
  const [pet] = assignLocalBoxPositions([{ gid: largeGid, position: "-" }], positions);
  assert.equal(pet.position, "仓库4·位置1");
  assert.equal(gameIdString(Number(largeGid)), null);
});

test("preserve non-box positions, reject invalid box values", () => {
  const positions = mapLocalBoxPositions([{ id: -1, data: [1] }, { id: 0, data: [null, "not-a-gid"] }]);
  assert.equal(positions.size, 0);
  const pets = assignLocalBoxPositions([{ gid: "888", position: "随身携带" }], positions);
  assert.equal(pets[0].position, "随身携带");
});

test("reject malformed API response instead of pretending all boxes are empty", () => {
  assert.throws(() => mapLocalBoxPositions({ boxes: [] }), /未返回数组/);
});
