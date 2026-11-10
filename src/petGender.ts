/** Parse pet sex without assigning an arbitrary default to unknown / genderless pets. */
export function parseBreedingGender(value: unknown): "♂" | "♀" | undefined {
  if (value === null || value === undefined) return undefined;
  const s=String(value).trim().toLowerCase();
  if(["1","male","m","♂","公","雄","雄性"].includes(s))return "♂";
  if(["2","female","f","♀","母","雌","雌性"].includes(s))return "♀";
  return undefined;
}
