/**
 * Decode per-instance shiny/colourful status from pet packet JSON.
 *
 * The game PetData.mutation_type bit 0 is shiny, bit 3 is colorful.
 * Cross-checked against the open-source rocom-capture PetData model:
 * https://github.com/whoisnian/rocom-capture/blob/master/internal/pet/model.go
 *
 * A missing or contradictory field is UNKNOWN, never silently "normal".
 * Does not read game process memory or alter packets.
 */
export type MutationSource = "mutation_type" | "flag" | "unknown" | "conflict";
export interface PetMutation {
  isShiny: boolean | undefined;
  isColorful: boolean | undefined;
  source: MutationSource;
  hasConflict: boolean;
}

const integer = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 && value <= 0xFFFFFFFF ? value : undefined;
  }
  if (typeof value === "string" && /^(?:0|[1-9][0-9]*)$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isSafeInteger(n) && n >= 0 && n <= 0xFFFFFFFF ? n : undefined;
  }
  return undefined;
};

function flag(item: Record<string, unknown>, keys: string[]): { value?: boolean; conflict: boolean } {
  const values = keys.map(k => item[k]).filter((v): v is boolean => typeof v === "boolean");
  return { value: values.length ? values[0] : undefined, conflict: values.some(v => v !== values[0]) };
}

export function decodePetMutation(raw: unknown): PetMutation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { isShiny: undefined, isColorful: undefined, source: "unknown", hasConflict: false };
  }
  const data = raw as Record<string, unknown>;
  const mutationFields = [data.mutation_type, data.mutationType].filter(v => v !== null && v !== undefined);
  const numbers = mutationFields.map(integer);
  const mutationConflict = mutationFields.length > 1 && (
    numbers.some(n => n === undefined) || numbers.some(n => n !== numbers[0])
  );
  // If an unparseable mutation_type was supplied, don't guess that it is normal.
  const mutationInvalid = mutationFields.some(v => integer(v) === undefined);
  const mutation = numbers.length && !mutationInvalid && !mutationConflict ? numbers[0] : undefined;
  const fromMutationShiny = mutation === undefined ? undefined : (mutation & 1) !== 0;
  const fromMutationColorful = mutation === undefined ? undefined : (mutation & 8) !== 0;
  const shinyFlags = flag(data, ["is_shiny", "isShiny", "shiny"]);
  const colorfulFlags = flag(data, ["is_colorful", "isColorful", "colorful"]);
  const disagreement =
    mutationConflict || mutationInvalid || shinyFlags.conflict || colorfulFlags.conflict ||
    (fromMutationShiny !== undefined && shinyFlags.value !== undefined && fromMutationShiny !== shinyFlags.value) ||
    (fromMutationColorful !== undefined && colorfulFlags.value !== undefined && fromMutationColorful !== colorfulFlags.value);
  if (disagreement) {
    return { isShiny: undefined, isColorful: undefined, source: "conflict", hasConflict: true };
  }
  const isShiny = fromMutationShiny ?? shinyFlags.value;
  const isColorful = fromMutationColorful ?? colorfulFlags.value;
  return {
    isShiny,
    isColorful,
    source: mutation !== undefined ? "mutation_type" :
      isShiny !== undefined || isColorful !== undefined ? "flag" : "unknown",
    hasConflict: false
  };
}
