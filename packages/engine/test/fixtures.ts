import { gameId, playerId, setAttr, teamId } from "@ff/contracts";
import type {
  AttributeMap,
  CalendarStamp,
  PlayerId,
  PlayerState,
  PersonalitySheet,
} from "@ff/contracts";
import { resolveAttr, resolveTrait } from "../src/attrs.js";
import type { MatchGameState, PlayCalls } from "../src/index.js";

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
    awareness: 82, decisionMaking: 85, accuracy: 84, armStrength: 86, touch: 78,
    pocketPatience: 76, poise: 80, release: 80, mobility: 70,
  }, ["pocketAwareness"]);

  // `jumping` (ADR-003) is set on everyone who can contest a ball in the air,
  // so the §11.3 term is actually exercised rather than falling back to 50.
  const wr1 = makePlayer("wr1", "Dez Ellis", "WR", {
    speed: 91, acceleration: 88, agility: 87, strength: 62, jumping: 88,
    routeRunning: 84, releaseWR: 80, catching: 83, catchInTraffic: 76, spectacularCatch: 80,
  }, ["routeTechnician"]);

  const wr2 = makePlayer("wr2", "Cole Rankin", "WR", {
    speed: 84, acceleration: 85, agility: 86, strength: 58, jumping: 74,
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
    speed: 78, acceleration: 79, agility: 76, strength: 74, jumping: 86,
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
      coverage: "MAN",
      assignments: [
        { defender: cb1.bio.id, covers: wr1.bio.id, technique: "PRESS" },
        { defender: cb2.bio.id, covers: wr2.bio.id, technique: "OFF" },
        { defender: lb.bio.id, covers: te.bio.id, technique: "PRESS" },
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
      assignments: base.calls.defense.assignments.map((a) => ({ ...a, technique: "PRESS" as const })),
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
