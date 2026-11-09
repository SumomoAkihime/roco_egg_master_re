/** Convert the local rocom-helper /api/box-info response to a pet-instance position map. */
export interface LocalBox {
  id: number | string;
  data: Array<number | string | null>;
}
export function gameIdString(value: unknown): string | null {
  if (typeof value === "string") return /^\\d+$/.test(value) && value !== "0" ? value : null;
  // A JSON number larger than MAX_SAFE_INTEGER may have already lost precision.
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  return null;
}
export function mapLocalBoxPositions(boxes: unknown): Map<string, string> {
  if (!Array.isArray(boxes)) throw new Error("仓库接口未返回数组");
  const positions = new Map<string, string>();
  for (const box of boxes) {
    if (!box || !Array.isArray(box.data)) continue;
    const boxId = Number(box.id);
    if (!Number.isSafeInteger(boxId) || boxId < 0) continue;
    (box.data as unknown[]).forEach((gid, index) => {
      const key = gameIdString(gid);
      if (key) positions.set(key, `仓库${boxId + 1}·位置${index + 1}`);
    });
  }
  return positions;
}
export function assignLocalBoxPositions<T extends { gid?: unknown; position?: string }>(
  pets: T[],
  positions: Map<string, string>
): T[] {
  return pets.map(pet => {
    const key = gameIdString(pet.gid);
    return { ...pet, position: (key ? positions.get(key) : null) || pet.position || "-" };
  });
}
