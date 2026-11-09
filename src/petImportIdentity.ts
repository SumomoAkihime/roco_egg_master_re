/**
 * Resolve imported pets against game configuration IDs without confusing
 * book/dex numbers, base species, evolved forms, and unique instance GIDs.
 *
 * PetData.base_conf_id is the CURRENT form, conf_id is the family/base.
 * https://github.com/whoisnian/rocom-capture/blob/master/internal/pet/model.go
 */
export type NameMap = Record<string, string>;
export type ImportedPetObject = Record<string, unknown>;

function positiveId(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value.trim())) return value.trim();
  return undefined;
}
export function resolvePetNameByConfig(item: ImportedPetObject, names: NameMap): string | undefined {
  const current = positiveId(item.base_conf_id ?? item.baseConfId);
  const family = positiveId(item.conf_id ?? item.confId);
  return (current ? names[current] : undefined) ?? (family ? names[family] : undefined);
}
export function importedPetGid(item: ImportedPetObject): string | undefined {
  // id is the SQLite row key only when a PetData config identifier is present.
  // Some third-party JSON files instead use "id" as the species/book number.
  const hasConfig = item.base_conf_id !== undefined || item.baseConfId !== undefined ||
    item.conf_id !== undefined || item.confId !== undefined;
  return positiveId(item.gid ?? item.Gid ?? (hasConfig ? item.id : undefined));
}
export function catalogDexId(item: ImportedPetObject): number | undefined {
  // Never infer species from base_conf_id or conf_id: those are NOT dex IDs.
  const raw = item.dex_id ?? item.dexId ?? item.book_id ?? item.bookId;
  const id = positiveId(raw);
  const n = id ? Number(id) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}
