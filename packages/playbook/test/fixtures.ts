/**
 * Test fixtures: a depth chart deep enough to field every personnel grouping in
 * the corpus, and the ADR-006 coherence checks restated locally.
 *
 * THE COHERENCE CHECKS ARE DUPLICATED ON PURPOSE. They are the engine's, in
 * `packages/engine/src/validate/playCall.ts`, and playbook may not import the
 * engine (ADR-017 §Decision 3). Copying the four rules here means the corpus proves
 * it satisfies them without a dependency — and if the engine ever adds a fifth, the
 * corpus finds out from a failing integration rather than from this file, which is
 * the correct direction for that discovery to travel.
 */
import type {
  DefensivePlayCall,
  OffensiveCall,
  OffensivePlayCall,
  PlayerId,
  Position,
  RunPlayCall,
} from "@ff/contracts";
import { playerId } from "@ff/contracts";
import type { DepthChart } from "../src/personnel.js";

function squad(position: Position, count: number): readonly PlayerId[] {
  return Array.from({ length: count }, (_, i) => playerId(`${position}${i + 1}`));
}

export const DEEP_CHART: DepthChart = {
  QB: squad("QB", 2),
  RB: squad("RB", 3),
  FB: squad("FB", 1),
  WR: squad("WR", 6),
  TE: squad("TE", 3),
  LT: squad("LT", 2),
  LG: squad("LG", 2),
  C: squad("C", 2),
  RG: squad("RG", 2),
  RT: squad("RT", 2),
  DE: squad("DE", 4),
  DT: squad("DT", 4),
  NT: squad("NT", 1),
  OLB: squad("OLB", 4),
  MLB: squad("MLB", 2),
  ILB: squad("ILB", 2),
  CB: squad("CB", 5),
  FS: squad("FS", 2),
  SS: squad("SS", 2),
};

/** A chart with one tight end, for testing that 12 personnel refuses to be faked. */
export const THIN_CHART: DepthChart = { ...DEEP_CHART, TE: squad("TE", 1) };

export const PLAYERS_ON_THE_FIELD = 11;

function duplicates(ids: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  return dupes;
}

export interface CoherenceReport {
  readonly problems: readonly string[];
}

/** ADR-006's four rejections for a dropback, restated. */
export function checkPassCoherence(
  quarterback: PlayerId,
  offense: OffensivePlayCall,
  defense: DefensivePlayCall,
): CoherenceReport {
  const problems: string[] = [];
  const routeRunners = offense.routes.map((r) => String(r.receiver));

  for (const id of offense.readOrder) {
    if (!routeRunners.includes(String(id))) problems.push(`readOrder names ${String(id)} with no route`);
  }
  for (const dupe of duplicates(routeRunners)) problems.push(`${dupe} runs two routes`);
  for (const dupe of duplicates(offense.protection.map((p) => String(p.blocker)))) {
    problems.push(`${dupe} blocks twice`);
  }
  for (const p of offense.protection) {
    if (routeRunners.includes(String(p.blocker))) {
      problems.push(`${String(p.blocker)} blocks and runs a route`);
    }
  }
  for (const dupe of duplicates(defense.rush.map((r) => String(r.rusher)))) {
    problems.push(`${dupe} rushes twice`);
  }
  for (const dupe of duplicates(defense.assignments.map((a) => String(a.defender)))) {
    problems.push(`${dupe} has two coverage assignments`);
  }
  for (const r of defense.rush) {
    if (defense.assignments.some((a) => a.defender === r.rusher)) {
      problems.push(`${String(r.rusher)} rushes and covers`);
    }
  }
  const offensePlayers = new Set<string>([
    String(quarterback),
    ...routeRunners,
    ...offense.protection.map((p) => String(p.blocker)),
  ]);
  if (offensePlayers.size > PLAYERS_ON_THE_FIELD) {
    problems.push(`${offensePlayers.size} offensive players`);
  }
  const defensePlayers = new Set<string>([
    ...defense.assignments.map((a) => String(a.defender)),
    ...defense.rush.map((r) => String(r.rusher)),
  ]);
  if (defensePlayers.size > PLAYERS_ON_THE_FIELD) {
    problems.push(`${defensePlayers.size} defensive players`);
  }

  /**
   * WHAT USED TO BE HERE, AND WHY IT IS NOT.
   *
   * "Every rusher must be blocked until §7.4" — labelled a scope limit rather than an
   * incoherence, correctly, and it expired with ADR-022. A rusher no `ProtectionAssignment`
   * names now resolves as a free runner. Asserting the old rule would make the corpus's
   * own test the last thing enforcing entry 21.
   *
   * WHAT REPLACED IT is the coherence the new fields actually have to satisfy, and all
   * three are properties of the CALL rather than of the engine's scope.
   */
  const scheme = offense.protectionScheme;
  if (scheme !== undefined) {
    const blockers = new Set(offense.protection.map((p) => String(p.blocker)));
    for (const man of scheme.available ?? []) {
      // Available means IN PROTECTION AND UNENGAGED. A man who is running a route
      // cannot be picked up out of it, which is ADR-022 petition 1's rule about paying
      // for protection before the snap.
      if (routeRunners.includes(String(man))) {
        problems.push(`${String(man)} is available for pickup and running a route`);
      }
      if (blockers.has(String(man))) {
        problems.push(`${String(man)} is available for pickup and already blocking somebody`);
      }
    }
    // The centre is a protector, so he is engaged or he is available — never neither.
    const centre = scheme.center;
    if (centre !== undefined) {
      const known = blockers.has(String(centre)) || (scheme.available ?? []).includes(centre);
      if (!known) problems.push(`the centre ${String(centre)} is not in the protection at all`);
    }
  }
  for (const route of offense.routes) {
    // The entry-8 invariant, extended to conversions: contracts lets a hot omit its
    // break zone; this corpus does not, and the check lives here so it is asserted
    // against the CALL the engine receives rather than against the card.
    if (route.hot !== undefined && route.hot.breakZone === undefined) {
      problems.push(`${String(route.receiver)}'s hot conversion states no break zone`);
    }
  }
  const rushers = new Set(defense.rush.map((r) => String(r.rusher)));
  for (const stunt of defense.stunts ?? []) {
    if (!rushers.has(String(stunt.penetrator)) || !rushers.has(String(stunt.looper))) {
      problems.push(`a stunt names somebody who is not rushing`);
    }
    if (String(stunt.penetrator) === String(stunt.looper)) {
      problems.push(`${String(stunt.penetrator)} twists with himself`);
    }
  }
  return { problems };
}

/** ADR-006's four rejections for a designed run, restated. */
export function checkRunCoherence(
  quarterback: PlayerId,
  offense: RunPlayCall,
  defense: DefensivePlayCall,
): CoherenceReport {
  const problems: string[] = [];
  const designed = `${offense.designedSide}-${offense.designedGap}`;
  if (!offense.blocking.some((b) => `${b.side}-${b.gap}` === designed)) {
    problems.push(`designed gap ${designed} has no blocking assignment`);
  }
  for (const dupe of duplicates(offense.blocking.map((b) => `${b.side}-${b.gap}`))) {
    problems.push(`gap ${dupe} assigned twice`);
  }
  const blockers = offense.blocking.flatMap((b) =>
    b.doubleTeamWith === undefined ? [String(b.blocker)] : [String(b.blocker), String(b.doubleTeamWith)],
  );
  for (const dupe of duplicates(blockers)) problems.push(`${dupe} blocks twice at the line`);
  for (const dupe of duplicates(offense.blocking.map((b) => String(b.defender)))) {
    problems.push(`${dupe} is engaged in two gaps`);
  }
  const perimeter = offense.perimeter ?? [];
  for (const dupe of duplicates(perimeter.map((p) => String(p.blocker)))) {
    problems.push(`${dupe} blocks twice in space`);
  }
  for (const dupe of duplicates(perimeter.map((p) => String(p.defender)))) {
    problems.push(`${dupe} is blocked by two men in space`);
  }
  for (const p of perimeter) {
    if (offense.blocking.some((b) => b.defender === p.defender)) {
      problems.push(`${String(p.defender)} is blocked at the line and in space`);
    }
  }
  const allBlockers = new Set<string>([...blockers, ...perimeter.map((p) => String(p.blocker))]);
  if (allBlockers.has(String(offense.carrier))) {
    problems.push(`${String(offense.carrier)} carries and blocks`);
  }
  for (const dupe of duplicates(defense.rush.map((r) => String(r.rusher)))) {
    problems.push(`${dupe} is in the front twice`);
  }
  for (const dupe of duplicates(defense.assignments.map((a) => String(a.defender)))) {
    problems.push(`${dupe} has two coverage assignments`);
  }
  for (const r of defense.rush) {
    if (defense.assignments.some((a) => a.defender === r.rusher)) {
      problems.push(`${String(r.rusher)} is in the front and in coverage`);
    }
  }
  const offensePlayers = new Set<string>([
    String(quarterback),
    String(offense.carrier),
    ...allBlockers,
  ]);
  if (offensePlayers.size > PLAYERS_ON_THE_FIELD) {
    problems.push(`${offensePlayers.size} offensive players`);
  }
  const defensePlayers = new Set<string>([
    ...defense.assignments.map((a) => String(a.defender)),
    ...defense.rush.map((r) => String(r.rusher)),
    ...offense.blocking.map((b) => String(b.defender)),
    ...perimeter.map((p) => String(p.defender)),
  ]);
  if (defensePlayers.size > PLAYERS_ON_THE_FIELD) {
    problems.push(`${defensePlayers.size} defensive players`);
  }
  return { problems };
}

export function checkCoherence(
  quarterback: PlayerId,
  offense: OffensiveCall,
  defense: DefensivePlayCall,
): CoherenceReport {
  return offense.kind === "RUN"
    ? checkRunCoherence(quarterback, offense, defense)
    : checkPassCoherence(quarterback, offense, defense);
}
