import type { ParentPet } from "./types";
import { ALL_PET_NAMES, getPetDetails } from "./petHelper";
import { EGG_GROUPS } from "./types";

// 只规划有明确蛋组的配对。不可孵蛋及未知蛋组不会进入计算。
const validGroups = new Set<string>(EGG_GROUPS);
export type PlacementMode = "shared" | "pairs";
export interface ShinyPair {
  father: ParentPet;
  mother: ParentPet;
  groups: string[];
  priority: number;
}
export interface ShinyRoute {
  target: string;
  species: string[];
  missingMothers: string[];
  requiresMaleOffspring?: boolean;
  status: "owned" | "reachable" | "unknown" | "unreachable";
}
export interface ShinyPlan {
  pairs: ShinyPair[];
  crossPairWarnings: Array<{ father: string; mother: string; groups: string[] }>;
  routes: ShinyRoute[];
  unknownSpecies: string[];
}
function nameOf(p: ParentPet): string {
  return (p.sprite || "").trim();
}
export function eggGroups(name: string, fallback: string[] = []): string[] {
  const info = getPetDetails(name);
  const groups = (info && info.groups && info.groups.length ? info.groups : fallback);
  return [...new Set(groups.filter(g => validGroups.has(g)))];
}
function overlap(a: string[], b: string[]): string[] {
  const rhs = new Set(b);
  return a.filter(x => rhs.has(x));
}
export function compatible(a: ParentPet, b: ParentPet): string[] {
  return overlap(eggGroups(nameOf(a), a.groups), eggGroups(nameOf(b), b.groups));
}
// 该算法只判断蛋组/性别和亲本异色条件，不推断出蛋概率或下一代性别。
// 轮次为“可能的传递阶段”，不是保证成功的产蛋次数。
export function planShinyNests(
  parents: ParentPet[],
  targets: string[],
  nestCount: number,
  mode: PlacementMode = "shared",
  maxFathers = 5
): ShinyPair[] {
  const males = parents.filter(p => p.gender === "♂" && nameOf(p) && eggGroups(nameOf(p), p.groups).length);
  const females = parents.filter(p => p.gender === "♀" && nameOf(p) && eggGroups(nameOf(p), p.groups).length);
  const goal = new Set(targets);
  const ownedShinies = new Set(parents.filter(p => p.isShiny).map(nameOf));
  const femaleByGroup = new Map<string, ParentPet[]>();
  const maleByGroup = new Map<string, ParentPet[]>();
  for (const mother of females) {
    for (const group of eggGroups(nameOf(mother), mother.groups)) {
      const list = femaleByGroup.get(group) || [];
      list.push(mother);
      femaleByGroup.set(group, list);
    }
  }
  for (const father of males) {
    for (const group of eggGroups(nameOf(father), father.groups)) {
      const list = maleByGroup.get(group) || [];
      list.push(father);
      maleByGroup.set(group, list);
    }
  }
  // 仅遍历至少有一方为异色的组合，避免把全部仓库做无意义的笛卡尔积。
  const candidates: ShinyPair[] = [];
  const seen = new Set<string>();
  const addCandidate = (father: ParentPet, mother: ParentPet) => {
    if (father.id === mother.id) return;
    const key = father.id + ":" + mother.id;
    if (seen.has(key)) return;
    seen.add(key);
    const groups = compatible(father, mother);
    if (!groups.length) return;
    const priority =
      (goal.has(nameOf(mother)) ? 100 : 0) +
      (!ownedShinies.has(nameOf(mother)) ? 30 : 0) +
      (father.isShiny ? 20 : 5) +
      (groups.length > 1 ? 3 : 0);
    candidates.push({ father, mother, groups, priority });
  };
  for (const father of males.filter(p => p.isShiny)) {
    for (const group of eggGroups(nameOf(father), father.groups)) {
      for (const mother of femaleByGroup.get(group) || []) addCandidate(father, mother);
    }
  }
  // 异色母体 × 普通公体也可以成为候选，不能只从异色公体扩散。
  for (const mother of females.filter(p => p.isShiny)) {
    for (const group of eggGroups(nameOf(mother), mother.groups)) {
      for (const father of maleByGroup.get(group) || []) addCandidate(father, mother);
    }
  }
  candidates.sort((a, b) => b.priority - a.priority ||
    nameOf(a.mother).localeCompare(nameOf(b.mother), "zh-Hans-CN") ||
    a.father.id.localeCompare(b.father.id));
  const selected: ShinyPair[] = [];
  const mothersUsed = new Set<string>();
  const fathersUsed = new Set<string>();
  for (const c of candidates) {
    if (selected.length >= Math.max(0, nestCount)) break;
    if (mothersUsed.has(c.mother.id)) continue;
    if (mode === "pairs" && fathersUsed.has(c.father.id)) continue;
    if (!fathersUsed.has(c.father.id) && fathersUsed.size >= Math.max(1, maxFathers)) continue;
    mothersUsed.add(c.mother.id);
    fathersUsed.add(c.father.id);
    selected.push(c);
  }
  return selected;
}
export function findCrossPairWarnings(pairs: ShinyPair[]): ShinyPlan["crossPairWarnings"] {
  const chosen = new Set(pairs.map(p => p.father.id + ":" + p.mother.id));
  const fathers = [...new Map(pairs.map(p => [p.father.id, p.father])).values()];
  const mothers = [...new Map(pairs.map(p => [p.mother.id, p.mother])).values()];
  const results: ShinyPlan["crossPairWarnings"] = [];
  for (const f of fathers) {
    for (const m of mothers) {
      if (chosen.has(f.id + ":" + m.id)) continue;
      const groups = compatible(f, m);
      if (groups.length) results.push({ father: nameOf(f), mother: nameOf(m), groups });
    }
  }
  return results;
}
export function planShinyRoutes(parents: ParentPet[], targets: string[], maxHops = 4): ShinyRoute[] {
  const allNames = [...new Set(ALL_PET_NAMES)];
  const groupsBySpecies = new Map<string, string[]>();
  const speciesByGroup = new Map<string, string[]>();
  for (const name of allNames) {
    const groups = eggGroups(name);
    if (!groups.length) continue;
    groupsBySpecies.set(name, groups);
    for (const group of groups) {
      const names = speciesByGroup.get(group) || [];
      names.push(name);
      speciesByGroup.set(group, names);
    }
  }
  const shinySeeds = [...new Set(parents.filter(p => p.isShiny).map(nameOf))]
    .filter(name => groupsBySpecies.has(name));
  const availableShinyMaleSpecies = new Set(parents.filter(p => p.isShiny && p.gender === "♂").map(nameOf));
  const ownedShinies = new Set(parents.filter(p => p.isShiny).map(nameOf));
  const ownedFemales = new Set(parents.filter(p => p.gender === "♀").map(nameOf));
  const visited = new Map<string, string[]>();
  const queue: string[] = [];
  // 母体异色可作为潜在传递起点，但需要先培育同种异色公体。
  for (const name of shinySeeds) {
    visited.set(name, [name]);
    queue.push(name);
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    const path = visited.get(current)!;
    if (path.length > maxHops) continue;
    for (const group of groupsBySpecies.get(current) || []) {
      for (const next of speciesByGroup.get(group) || []) {
        if (visited.has(next)) continue;
        const newPath = [...path, next];
        visited.set(next, newPath);
        queue.push(next);
      }
    }
  }
  return targets.map(target => {
    if (ownedShinies.has(target)) {
      return { target, species: [target], missingMothers: [], status: "owned" };
    }
    if (!groupsBySpecies.has(target)) {
      return { target, species: [], missingMothers: [], status: "unknown" };
    }
    const species = visited.get(target);
    if (!species) {
      return { target, species: [], missingMothers: [], status: "unreachable" };
    }
    return {
      target,
      species,
      missingMothers: species.slice(1).filter(s => !ownedFemales.has(s)),
      requiresMaleOffspring: !availableShinyMaleSpecies.has(species[0]),
      status: "reachable"
    };
  });
}
export function planShiny(parents: ParentPet[], targets: string[], nests: number, mode: PlacementMode): ShinyPlan {
  const pairs = planShinyNests(parents, targets, nests, mode);
  return {
    pairs,
    crossPairWarnings: findCrossPairWarnings(pairs),
    routes: planShinyRoutes(parents, targets),
    unknownSpecies: [...new Set(parents.filter(p => nameOf(p) && !eggGroups(nameOf(p), p.groups).length).map(nameOf))]
  };
}
