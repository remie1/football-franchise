import { gameId, playerId, setAttr, teamId } from "@ff/contracts";
import type {
  AttributeMap,
  CalendarStamp,
  PlayerId,
  PlayerState,
  PersonalitySheet,
} from "@ff/contracts";
import { resolveAttr, resolveTrait } from "../src/attrs.js";
import type { MatchGameState, PlayCalls, ReadSystem } from "../src/index.js";

const PERSONALITY: PersonalitySheet = { needs: {}, type: "quiet" };

export const STAMP: CalendarStamp = { season: 2026, phase: "REGULAR_SEASON", week: 4, day: 7 };

export function makePlayer(
  id: string,
  displayName: string,
  position: PlayerState["bio"]["position"],
  values: Readonly<Record<string, number>>,
  traits: readonly string[] = [],
): PlayerState {
  let map: AttributeMap = {};
  for (const [key, value] of Object.entries(values)) {
    map = setAttr(map, resolveAttr(key), value);
  }
  return {
    bio: {
      id: playerId(id),
      displayName,
      position,
      age: 26,
      heightIn: 73,
      weightLb: 210,
      draft: "UDFA",
    },
    attributes: {
      kind: "true",
      values: map,
      traits: new Set(traits.map((t) => resolveTrait(t) as unknown as string)),
    },
    condition: { stamina: 100, morale: 0 },
    personality: PERSONALITY,
  };
}

export interface Scenario {
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
  readonly names: (id: PlayerId) => string;
}

/**
 * A vanilla dropback: 2x2, Cover 1 press on the X, off coverage on the slot,
 * four-man rush with two blockers accounted for.
 */
export function buildScenario(overrides: Partial<MatchGameState> = {}): Scenario {
  const qb = makePlayer("qb1", "Miles Corbin", "QB", {
    awareness: 82, footballIQ: 84, decisionMaking: 85, accuracy: 84, armStrength: 86, touch: 78,
    pocketPatience: 76, poise: 80, release: 80, mobility: 70,
  }, ["pocketAwareness"]);

  // `jumping` (ADR-003) is set on everyone who can contest a ball in the air,
  // so the §11.3 term is actually exercised rather than falling back to 50.
  //
  // `reaction` and `awareness` are set on the RECEIVERS as well as the defenders
  // as of §12. They were absent, which was harmless while nothing on offence
  // read them — and stopped being harmless the moment §12.4 made Reaction the
  // resolution ORDER for a live ball. Left unset they fall back to 50, the whole
  // offence sorts behind every defender, and "who recovers a tip" is decided by
  // a hole in the fixture rather than by the mechanic.
  const wr1 = makePlayer("wr1", "Dez Ellis", "WR", {
    speed: 91, acceleration: 88, agility: 87, strength: 62, jumping: 88, reaction: 78, awareness: 74,
    routeRunning: 84, releaseWR: 80, catching: 83, catchInTraffic: 76, spectacularCatch: 80,
  }, ["routeTechnician"]);

  const wr2 = makePlayer("wr2", "Cole Rankin", "WR", {
    speed: 84, acceleration: 85, agility: 86, strength: 58, jumping: 74, reaction: 74, awareness: 71,
    routeRunning: 78, releaseWR: 74, catching: 79, catchInTraffic: 70,
  }, ["reliableHands"]);

  const cb1 = makePlayer("cb1", "Ray Whitfield", "CB", {
    speed: 90, acceleration: 88, agility: 85, strength: 66, jumping: 84,
    manCoverage: 82, press: 80, ballSkills: 76, reaction: 79,
  }, ["pressSpecialist"]);

  const cb2 = makePlayer("cb2", "Trey Nunez", "CB", {
    speed: 86, acceleration: 84, agility: 82, strength: 60, jumping: 79,
    manCoverage: 71, press: 62, ballSkills: 68, reaction: 72,
  });

  // A 6'5" seam tight end: elite at the high point, ordinary everywhere else.
  const te = makePlayer("te1", "Sam Pryor", "TE", {
    speed: 78, acceleration: 79, agility: 76, strength: 74, jumping: 86, reaction: 70, awareness: 76,
    routeRunning: 74, releaseWR: 70, catching: 82, catchInTraffic: 80,
  }, ["reliableHands"]);

  // The linebacker who has to cover him — and gives up eight inches of reach.
  const lb = makePlayer("lb1", "Isaiah Ford", "MLB", {
    speed: 80, acceleration: 80, agility: 76, strength: 78, jumping: 64,
    manCoverage: 66, press: 60, ballSkills: 60, reaction: 74,
  });

  const lt = makePlayer("lt1", "Owen Brooks", "LT", {
    strength: 85, passBlock: 82, footwork: 79, anchor: 80, awareness: 75,
  }, ["brickWall"]);

  const lg = makePlayer("lg1", "Hank Doyle", "LG", {
    strength: 88, passBlock: 74, footwork: 68, anchor: 82, awareness: 71,
  });

  const edge = makePlayer("de1", "Kade Vance", "DE", {
    strength: 80, passRush: 88, firstStep: 90, finesseMove: 84, powerMove: 74,
  }, ["quickTwitch"]);

  const dt = makePlayer("dt1", "Marcus Bell", "DT", {
    strength: 92, passRush: 76, firstStep: 68, finesseMove: 60, powerMove: 85,
  });

  const roster = [qb, wr1, wr2, te, cb1, cb2, lb, lt, lg, edge, dt];
  const players: Record<string, PlayerState> = {};
  for (const p of roster) players[p.bio.id as unknown as string] = p;

  const state: MatchGameState = {
    gameId: gameId("g-2026-04-hou-den"),
    at: STAMP,
    playNumber: 12,
    nextEventSeq: 400,
    players,
    offenseTeam: teamId("t-hou"),
    defenseTeam: teamId("t-den"),
    quarterback: qb.bio.id,
    down: 2,
    distance: 8,
    ballOn: 41,
    clockSeconds: 742,
    ...overrides,
  };

  const calls: PlayCalls = {
    offense: {
      name: "Y Cross",
      formation: "Shotgun Trips Right",
      readSystem: "HALF_FIELD",
      routes: [
        { receiver: wr1.bio.id, routeName: "Go", depthClass: "DEEP", airYards: 24 },
        { receiver: wr2.bio.id, routeName: "Dig", depthClass: "INTERMEDIATE", airYards: 14 },
        { receiver: te.bio.id, routeName: "Shallow Cross", depthClass: "QUICK", airYards: 5 },
      ],
      readOrder: [wr2.bio.id, wr1.bio.id, te.bio.id],
      protection: [
        { blocker: lt.bio.id, rusher: edge.bio.id },
        { blocker: lg.bio.id, rusher: dt.bio.id },
      ],
    },
    defense: {
      name: "Cover 1 Press",
      front: "Nickel Even",
      assignments: [
        { kind: "MAN", defender: cb1.bio.id, covers: wr1.bio.id, technique: "PRESS" },
        { kind: "MAN", defender: cb2.bio.id, covers: wr2.bio.id, technique: "OFF" },
        { kind: "MAN", defender: lb.bio.id, covers: te.bio.id, technique: "PRESS" },
      ],
      rush: [
        { rusher: edge.bio.id, move: "SPEED" },
        { rusher: dt.bio.id, move: "POWER" },
      ],
    },
  };

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state, calls, names };
}

/**
 * The SAME play — same eleven players, same defensive call, same routes — run
 * under a different §8.1 reading system. This is the fixture the three systems
 * have to diverge on: if the only thing that changes is a label, §8.1 is not
 * implemented.
 */
export function withReadSystem(base: Scenario, readSystem: ReadSystem): Scenario {
  return { ...base, calls: { ...base.calls, offense: { ...base.calls.offense, readSystem } } };
}

/** The same personnel running a different CONCEPT: the progression is re-ordered. */
export function withReadOrder(base: Scenario, order: readonly PlayerId[]): Scenario {
  return { ...base, calls: { ...base.calls, offense: { ...base.calls.offense, readOrder: order } } };
}

/**
 * The base concept behind a line that actually holds. Coverage is untouched, so
 * the routes and the reads run normally — this is the fixture for anything that
 * has to observe the quarterback WITHOUT the pocket forcing his hand, which on
 * the base matchup happens by tick 1.0 on ~90% of dropbacks
 * (CALIBRATION-BACKLOG 3: `blockerStructuralAdvantage`, frozen).
 */
export function buildCleanPocketScenario(): Scenario {
  const base = buildScenario();
  const futileA = makePlayer("dl-clean-a", "Nate Orme", "DE", {
    passRush: 10, firstStep: 10, powerMove: 10, finesseMove: 10, strength: 25,
  });
  const futileB = makePlayer("dl-clean-b", "Cy Redfern", "DT", {
    passRush: 10, firstStep: 10, powerMove: 10, finesseMove: 10, strength: 25,
  });
  const wallA = makePlayer("ol-clean-a", "Duke Halloran", "LT", {
    passBlock: 99, footwork: 99, strength: 95,
  }, ["brickWall"]);
  const wallB = makePlayer("ol-clean-b", "Pete Vasquez", "RG", {
    passBlock: 99, footwork: 99, strength: 95,
  }, ["brickWall"]);

  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const p of [futileA, futileB, wallA, wallB]) players[p.bio.id as unknown as string] = p;

  const calls: PlayCalls = {
    offense: {
      ...base.calls.offense,
      protection: [
        { blocker: wallA.bio.id, rusher: futileA.bio.id },
        { blocker: wallB.bio.id, rusher: futileB.bio.id },
      ],
    },
    defense: {
      ...base.calls.defense,
      // Off coverage everywhere: no jam, so every route's break time is its
      // §9.2 base and the progression can be observed without the release
      // battle moving the goalposts underneath it.
      assignments: base.calls.defense.assignments.map((a) =>
        a.kind === "MAN" ? { ...a, technique: "OFF" as const } : a,
      ),
      rush: [
        { rusher: futileA.bio.id, move: "SPEED" },
        { rusher: futileB.bio.id, move: "POWER" },
      ],
    },
  };

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state: { ...base.state, players }, calls, names };
}

/**
 * CALIBRATION-BACKLOG 4b — a SHORT-primary concept, on a committed card.
 *
 * Until this existed, no fixture in the repo carried a `SHORT` route: the base
 * concept is DEEP / INTERMEDIATE / QUICK, and the depth-class timing split was
 * only ever exercised by a throwaway harness that remapped a depth class. So
 * `TUNABLES.route.readySeconds.SHORT` (1.5s) and
 * `TUNABLES.qb.anticipation.depthModifier.SHORT` (0) had never resolved a play.
 *
 * "Stick" is the natural carrier: the stick route IS the primary, it breaks at
 * six yards, and the concept is built around throwing it on rhythm — which makes
 * it the one shape where the SHORT column is load-bearing rather than incidental.
 * Zones are stated explicitly so the same card can be run against zone coverage.
 */
export function buildShortConceptScenario(): Scenario {
  const base = buildScenario();
  const { deep, intermediate, quick } = baseReceivers(base);

  const calls: PlayCalls = {
    ...base.calls,
    offense: {
      ...base.calls.offense,
      name: "Stick",
      formation: "Shotgun Trey Right",
      routes: [
        // The stick: sit at six, in the right hash. SHORT, and the primary.
        {
          receiver: intermediate,
          routeName: "Stick",
          depthClass: "SHORT",
          airYards: 6,
          breakZone: { horizontal: "RH", vertical: "SHORT" },
        },
        // The flat, underneath and outside him — the other half of the read.
        {
          receiver: quick,
          routeName: "Flat",
          depthClass: "QUICK",
          airYards: 3,
          breakZone: { horizontal: "RW", vertical: "SHORT" },
        },
        // The backside clear-out, keeping a safety honest.
        {
          receiver: deep,
          routeName: "Go",
          depthClass: "DEEP",
          airYards: 24,
          breakZone: { horizontal: "LW", vertical: "DEEP" },
        },
      ],
      readOrder: [intermediate, quick, deep],
    },
  };

  return { ...base, calls };
}

/**
 * The base concept against a spot-drop zone. Nobody is manned; four defenders
 * own four cells, and the routes are placed so that TWO of them are covered and
 * one — the shallow cross into the left hash — runs into a cell nobody owns.
 * That hole is the point: it is what zone gives up, and it is a fact the engine
 * could not previously represent at all.
 */
export function buildZoneScenario(): Scenario {
  const base = buildScenario();
  const { deep, intermediate, quick } = baseReceivers(base);
  const assignments = base.calls.defense.assignments;
  const cb1 = assignments[0]?.defender;
  const cb2 = assignments[1]?.defender;
  const lb = assignments[2]?.defender;
  if (cb1 === undefined || cb2 === undefined || lb === undefined) throw new Error("bad fixture");

  const players = withZoneRatings(base.state.players, {
    [String(cb1)]: 84,
    [String(cb2)]: 68,
    [String(lb)]: 74,
  });

  const calls: PlayCalls = {
    offense: {
      ...base.calls.offense,
      routes: [
        { receiver: deep, routeName: "Go", depthClass: "DEEP", airYards: 24, breakZone: { horizontal: "RW", vertical: "DEEP" } },
        { receiver: intermediate, routeName: "Dig", depthClass: "INTERMEDIATE", airYards: 14, breakZone: { horizontal: "C", vertical: "INTERMEDIATE" } },
        // Into the left hash — and nobody drops there.
        { receiver: quick, routeName: "Shallow Cross", depthClass: "QUICK", airYards: 5, breakZone: { horizontal: "LH", vertical: "SHORT" } },
      ],
    },
    defense: {
      name: "Cover 3 Spot Drop",
      front: "Nickel Even",
      assignments: [
        { kind: "ZONE", defender: cb1, zone: { horizontal: "RW", vertical: "DEEP" } },
        { kind: "ZONE", defender: cb2, zone: { horizontal: "C", vertical: "INTERMEDIATE" } },
        { kind: "ZONE", defender: lb, zone: { horizontal: "RH", vertical: "SHORT" } },
      ],
      rush: base.calls.defense.rush,
    },
  };

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state: { ...base.state, players }, calls, names };
}

/**
 * MIXED COVERAGE — the shape a single `coverage: "MAN" | "ZONE"` flag on the
 * whole call cannot express, and the reason coverage moved onto the assignment.
 *
 * Built on the Stick concept rather than on Y Cross deliberately: the two
 * covered routes break at 1.0s and 1.5s, so BOTH reps are resolved on nearly
 * every snap rather than only on the ones the protection survives long enough to
 * reach a fourteen-yard dig. A man/zone split measured on a fixture where the
 * man rep only happens on slow-developing plays is a split by play length.
 *
 *   Flat  (QUICK, RW/SHORT)  → MAN, the nickel travelling with the back
 *   Stick (SHORT, RH/SHORT)  → ZONE, the hook dropper
 *   Go    (DEEP,  LW/DEEP)   → ZONE, the deep third
 */
export function buildMixedCoverageScenario(): Scenario {
  const base = buildShortConceptScenario();
  const routes = base.calls.offense.routes;
  const stick = routes.find((r) => r.depthClass === "SHORT");
  const flat = routes.find((r) => r.depthClass === "QUICK");
  if (stick === undefined || flat === undefined) throw new Error("bad fixture");

  const assignments = base.calls.defense.assignments;
  const cb1 = assignments[0]?.defender;
  const cb2 = assignments[1]?.defender;
  const lb = assignments[2]?.defender;
  if (cb1 === undefined || cb2 === undefined || lb === undefined) throw new Error("bad fixture");

  const players = withZoneRatings(base.state.players, { [String(cb1)]: 84, [String(lb)]: 74 });

  const calls: PlayCalls = {
    ...base.calls,
    defense: {
      name: "Cover 1 Robber",
      front: base.calls.defense.front,
      assignments: [
        { kind: "MAN", defender: cb2, covers: flat.receiver, technique: "OFF" },
        { kind: "ZONE", defender: lb, zone: { horizontal: "RH", vertical: "SHORT" } },
        { kind: "ZONE", defender: cb1, zone: { horizontal: "LW", vertical: "DEEP" } },
      ],
      rush: base.calls.defense.rush,
    },
  };

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state: { ...base.state, players }, calls, names };
}

/**
 * The base fixture only ever set `manCoverage` on its cover players, so without
 * this every zone rep would resolve against `getAttr`'s 50 fallback and a zone
 * defender's rating would be untested.
 */
function withZoneRatings(
  players: Readonly<Record<string, PlayerState>>,
  ratings: Readonly<Record<string, number>>,
): Record<string, PlayerState> {
  const out: Record<string, PlayerState> = { ...players };
  for (const [id, zoneCoverage] of Object.entries(ratings)) {
    const existing = out[id];
    if (existing === undefined) throw new Error(`bad fixture: no player ${id}`);
    out[id] = {
      ...existing,
      attributes: {
        ...existing.attributes,
        values: setAttr(existing.attributes.values, resolveAttr("zoneCoverage"), zoneCoverage),
      },
    };
  }
  return out;
}

/**
 * A fixture built to produce DEFLECTIONS, so §12 is exercised rather than
 * merely present. Every cover player is a ball-skills specialist with elite
 * reaction sitting in the throwing lane, and the pocket holds long enough for
 * the ball to be thrown. Tips are still rolled for, not scripted.
 */
export function buildDeflectionScenario(): Scenario {
  const base = buildCleanPocketScenario();
  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const assignment of base.calls.defense.assignments) {
    if (assignment.kind !== "MAN") continue;
    const defender = players[assignment.defender as unknown as string];
    if (defender === undefined) throw new Error("bad fixture");
    players[assignment.defender as unknown as string] = makePlayer(
      String(assignment.defender),
      defender.bio.displayName,
      defender.bio.position,
      {
        manCoverage: 95, agility: 92, press: 70, ballSkills: 99, reaction: 99,
        speed: 92, acceleration: 92, awareness: 90, jumping: 90, strength: 80,
      },
      ["ballHawk", "shutdown"],
    );
  }

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state: { ...base.state, players }, calls: base.calls, names };
}

/** Receivers of the base scenario in a stable order: [WR1 go, WR2 dig, TE shallow]. */
export function baseReceivers(base: Scenario): { deep: PlayerId; intermediate: PlayerId; quick: PlayerId } {
  const routes = base.calls.offense.routes;
  const deep = routes.find((r) => r.depthClass === "DEEP")?.receiver;
  const intermediate = routes.find((r) => r.depthClass === "INTERMEDIATE")?.receiver;
  const quick = routes.find((r) => r.depthClass === "QUICK")?.receiver;
  if (deep === undefined || intermediate === undefined || quick === undefined) {
    throw new Error("bad fixture: expected DEEP/INTERMEDIATE/QUICK routes");
  }
  return { deep, intermediate, quick };
}

/**
 * A play that goes nowhere: the line holds all day and nobody ever gets open.
 * This is the shape that produces held balls and eventually a throwaway, which
 * is where ADR-005's "no roll, no tier" rule has to hold.
 */
export function buildStalledPocketScenario(): Scenario {
  const base = buildScenario();

  const futileA = makePlayer("dl-a", "Nate Orme", "DE", {
    passRush: 10, firstStep: 10, powerMove: 10, finesseMove: 10, strength: 25,
  });
  const futileB = makePlayer("dl-b", "Cy Redfern", "DT", {
    passRush: 10, firstStep: 10, powerMove: 10, finesseMove: 10, strength: 25,
  });
  const wallA = makePlayer("ol-a", "Duke Halloran", "LT", {
    passBlock: 99, footwork: 99, strength: 95,
  }, ["brickWall"]);
  const wallB = makePlayer("ol-b", "Pete Vasquez", "RG", {
    passBlock: 99, footwork: 99, strength: 95,
  }, ["brickWall"]);

  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const p of [futileA, futileB, wallA, wallB]) {
    players[p.bio.id as unknown as string] = p;
  }
  // Blanket man coverage: every receiver is smothered, every defender is elite.
  for (const assignment of base.calls.defense.assignments) {
    if (assignment.kind !== "MAN") continue;
    const covered = players[assignment.covers as unknown as string];
    const defender = players[assignment.defender as unknown as string];
    if (covered === undefined || defender === undefined) throw new Error("bad fixture");
    players[assignment.covers as unknown as string] = makePlayer(
      String(assignment.covers), covered.bio.displayName, covered.bio.position,
      { releaseWR: 5, agility: 10, routeRunning: 5, catching: 40, catchInTraffic: 35, jumping: 40, strength: 40 },
    );
    players[assignment.defender as unknown as string] = makePlayer(
      String(assignment.defender), defender.bio.displayName, defender.bio.position,
      { press: 99, strength: 95, manCoverage: 99, agility: 95, ballSkills: 90, jumping: 92, reaction: 90 },
      ["pressSpecialist", "shutdown"],
    );
  }

  const state: MatchGameState = { ...base.state, players };
  const calls: PlayCalls = {
    offense: {
      ...base.calls.offense,
      protection: [
        { blocker: wallA.bio.id, rusher: futileA.bio.id },
        { blocker: wallB.bio.id, rusher: futileB.bio.id },
      ],
    },
    defense: {
      ...base.calls.defense,
      assignments: base.calls.defense.assignments.map((a) =>
        a.kind === "MAN" ? { ...a, technique: "PRESS" as const } : a,
      ),
      rush: [
        { rusher: futileA.bio.id, move: "SPEED" },
        { rusher: futileB.bio.id, move: "POWER" },
      ],
    },
  };

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state, calls, names };
}

/**
 * A quarterback who can actually run, behind a line that gives up the interior.
 * This is the shape that exercises §7.2's ESCAPE branch: with the climb lane
 * shut by penetration, a 94-mobility passer's own attributes make leaving the
 * pocket his best option — where the base fixture's 70-mobility passer stands in.
 *
 * Alignments are stated EXPLICITLY here rather than derived from position, which
 * is the case a base four-man front never exercises.
 */
export function buildScramblerScenario(): Scenario {
  const base = buildScenario();

  const runner = makePlayer("qb-scram", "Malik Ovande", "QB", {
    awareness: 78, footballIQ: 71, decisionMaking: 76, accuracy: 78, armStrength: 84, touch: 74,
    pocketPatience: 62, poise: 66, release: 78, mobility: 94, improvisation: 92,
  });
  // A three-technique who lives in the backfield, and a guard who cannot hold him.
  const penetrator = makePlayer("dt-wreck", "Ezra Kubiak", "DT", {
    passRush: 96, firstStep: 92, powerMove: 95, finesseMove: 88, strength: 96,
  });
  const guard = makePlayer("lg-soft", "Denny Roux", "LG", {
    passBlock: 30, footwork: 28, strength: 55, anchor: 40,
  });

  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const p of [runner, penetrator, guard]) players[p.bio.id as unknown as string] = p;

  const state: MatchGameState = { ...base.state, players, quarterback: runner.bio.id };
  const edgeRusher = base.calls.defense.rush[0];
  const edgeProtection = base.calls.offense.protection[0];
  if (edgeRusher === undefined || edgeProtection === undefined) throw new Error("bad fixture");

  const calls: PlayCalls = {
    offense: {
      ...base.calls.offense,
      protection: [edgeProtection, { blocker: guard.bio.id, rusher: penetrator.bio.id }],
    },
    defense: {
      ...base.calls.defense,
      rush: [
        { ...edgeRusher, alignment: "EDGE" },
        { rusher: penetrator.bio.id, move: "POWER", alignment: "INTERIOR" },
      ],
    },
  };

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state, calls, names };
}

/**
 * The case B1 was broken on, isolated: TWO rush matchups where one is dominated
 * and the other holds comfortably. §7.2's rule is per rusher — "1+ rushers won"
 * — so the interior collapse must set the pocket status even while the edge is
 * being handled. A status derived from an average, from a single matchup, or
 * from a counter that has to fill up first reads this pocket as clean.
 */
export function buildLopsidedRushScenario(): Scenario {
  const base = buildScenario();

  const wrecker = makePlayer("de-wreck", "Vic Marchetti", "DE", {
    passRush: 99, firstStep: 99, powerMove: 99, finesseMove: 99, strength: 99,
  }, ["quickTwitch"]);
  const turnstile = makePlayer("lt-bad", "Gil Tanner", "LT", {
    passBlock: 5, footwork: 5, strength: 20,
  });
  const futile = makePlayer("dt-weak", "Roy Emmett", "DT", {
    passRush: 5, firstStep: 5, powerMove: 5, finesseMove: 5, strength: 20,
  });
  const wall = makePlayer("rg-wall", "Bo Ackerman", "RG", {
    passBlock: 99, footwork: 99, strength: 95,
  }, ["brickWall"]);

  const players: Record<string, PlayerState> = { ...base.state.players };
  for (const p of [wrecker, turnstile, futile, wall]) {
    players[p.bio.id as unknown as string] = p;
  }

  const state: MatchGameState = { ...base.state, players };
  const calls: PlayCalls = {
    offense: {
      ...base.calls.offense,
      protection: [
        { blocker: turnstile.bio.id, rusher: wrecker.bio.id },
        { blocker: wall.bio.id, rusher: futile.bio.id },
      ],
    },
    defense: {
      ...base.calls.defense,
      rush: [
        { rusher: wrecker.bio.id, move: "POWER" },
        { rusher: futile.bio.id, move: "FINESSE" },
      ],
    },
  };

  const names = (id: PlayerId): string => {
    const p = players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };

  return { state, calls, names };
}
