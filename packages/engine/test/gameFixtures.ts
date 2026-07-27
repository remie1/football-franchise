/**
 * Two whole football teams, deliberately ORDINARY.
 *
 * Every rating sits in Appendix A's 70-85 "solid starter / Pro Bowl" band on
 * both sides of the ball, for the same reason `buildScenario` is a normal
 * dropback rather than a shootout: the measured game-level numbers should
 * describe the MECHANICS, not a mismatch. `bias` shifts one team a few points
 * either way so two teams are not literally identical, which would make every
 * metric a statement about a single roster.
 *
 * Twenty-four players per team: eleven on offence, eleven on defence, a kicker
 * and a punter. The return man is a receiver, as he usually is.
 */
import { teamId } from "@ff/contracts";
import type { CalendarStamp, PlayerId, PlayerState, TeamId } from "@ff/contracts";
import { defaultPlayCaller } from "../src/game/playCaller.js";
import { createMatchState } from "../src/game/simulateGame.js";
import type {
  GameCoordinates,
  GameInputs,
  GameSnapshot,
  MatchState,
  TeamSnapshot,
} from "../src/game/types.js";
import { makePlayer } from "./fixtures.js";

export const GAME_STAMP: CalendarStamp = {
  season: 2026,
  phase: "REGULAR_SEASON",
  week: 4,
  day: 7,
};

function b(base: number, bias: number): number {
  return Math.max(20, Math.min(99, base + bias));
}

/**
 * One team's twenty-four. Ids are prefixed with the team so two snapshots can be
 * merged into one `MatchGameState.players` map without collision.
 */
export function buildTeamSnapshot(team: string, bias = 0): TeamSnapshot {
  const id = (role: string): string => `${team}-${role}`;

  const qb = makePlayer(id("qb"), "QB", "QB", {
    awareness: b(80, bias), footballIQ: b(80, bias), decisionMaking: b(80, bias),
    accuracy: b(80, bias), armStrength: b(82, bias), touch: b(76, bias),
    pocketPatience: b(74, bias), poise: b(78, bias), release: b(78, bias),
    mobility: b(68, bias), improvisation: b(70, bias),
    elusiveness: b(60, bias), power: b(55, bias), speed: b(72, bias),
    acceleration: b(72, bias), agility: b(70, bias), yac: b(55, bias),
  }, ["pocketAwareness"]);

  const rb = makePlayer(id("rb"), "RB", "RB", {
    speed: b(88, bias), acceleration: b(87, bias), agility: b(85, bias), strength: b(74, bias),
    vision: b(80, bias), patience: b(78, bias), elusiveness: b(82, bias), power: b(78, bias),
    ballSecurity: b(80, bias), yac: b(78, bias), catching: b(70, bias), catchInTraffic: b(66, bias),
    routeRunning: b(64, bias), releaseWR: b(60, bias), reaction: b(72, bias), awareness: b(70, bias),
    jumping: b(70, bias), runBlock: b(58, bias),
  });

  const wr1 = makePlayer(id("wr1"), "WR1", "WR", {
    speed: b(90, bias), acceleration: b(88, bias), agility: b(86, bias), strength: b(62, bias),
    jumping: b(86, bias), reaction: b(78, bias), awareness: b(74, bias),
    routeRunning: b(84, bias), releaseWR: b(80, bias), catching: b(83, bias),
    catchInTraffic: b(76, bias), spectacularCatch: b(80, bias), yac: b(78, bias),
    elusiveness: b(76, bias), runBlock: b(62, bias),
  }, ["routeTechnician"]);

  const wr2 = makePlayer(id("wr2"), "WR2", "WR", {
    speed: b(86, bias), acceleration: b(85, bias), agility: b(84, bias), strength: b(60, bias),
    jumping: b(76, bias), reaction: b(76, bias), awareness: b(72, bias),
    routeRunning: b(78, bias), releaseWR: b(74, bias), catching: b(80, bias),
    catchInTraffic: b(70, bias), spectacularCatch: b(72, bias), yac: b(74, bias),
    elusiveness: b(72, bias), runBlock: b(58, bias),
  }, ["reliableHands"]);

  const wr3 = makePlayer(id("wr3"), "WR3", "WR", {
    speed: b(84, bias), acceleration: b(86, bias), agility: b(87, bias), strength: b(56, bias),
    jumping: b(72, bias), reaction: b(74, bias), awareness: b(74, bias),
    routeRunning: b(80, bias), releaseWR: b(76, bias), catching: b(78, bias),
    catchInTraffic: b(68, bias), spectacularCatch: b(66, bias), yac: b(76, bias),
    elusiveness: b(78, bias), runBlock: b(54, bias),
  });

  const te = makePlayer(id("te"), "TE", "TE", {
    speed: b(78, bias), acceleration: b(78, bias), agility: b(74, bias), strength: b(76, bias),
    jumping: b(82, bias), reaction: b(72, bias), awareness: b(76, bias),
    routeRunning: b(74, bias), releaseWR: b(70, bias), catching: b(80, bias),
    catchInTraffic: b(80, bias), spectacularCatch: b(70, bias), yac: b(66, bias),
    elusiveness: b(62, bias), runBlock: b(72, bias), passBlock: b(66, bias), sustain: b(70, bias),
  }, ["reliableHands"]);

  const line = (role: string, name: string, position: PlayerState["bio"]["position"], nudge: number): PlayerState =>
    makePlayer(id(role), name, position, {
      strength: b(84 + nudge, bias), passBlock: b(78 + nudge, bias), runBlock: b(79 + nudge, bias),
      footwork: b(74 + nudge, bias), anchor: b(78 + nudge, bias), awareness: b(74, bias),
      sustain: b(76 + nudge, bias), pullSkill: b(70, bias),
    });

  const lt = line("lt", "LT", "LT", 3);
  const lg = line("lg", "LG", "LG", 1);
  const c = line("c", "C", "C", 0);
  const rg = line("rg", "RG", "RG", 0);
  const rt = line("rt", "RT", "RT", 1);

  const edge = (role: string, name: string, nudge: number): PlayerState =>
    makePlayer(id(role), name, "DE", {
      strength: b(80, bias), passRush: b(82 + nudge, bias), firstStep: b(84 + nudge, bias),
      finesseMove: b(80, bias), powerMove: b(74, bias), runStuff: b(76, bias),
      blockShed: b(78, bias), tackling: b(76, bias), pursuit: b(80, bias),
      gapDiscipline: b(74, bias), speed: b(78, bias), instincts: b(72, bias),
    }, ["quickTwitch"]);

  const interior = (role: string, name: string, nudge: number): PlayerState =>
    makePlayer(id(role), name, "DT", {
      strength: b(90, bias), passRush: b(74 + nudge, bias), firstStep: b(70, bias),
      finesseMove: b(62, bias), powerMove: b(84, bias), runStuff: b(84, bias),
      blockShed: b(76, bias), tackling: b(74, bias), pursuit: b(66, bias),
      gapDiscipline: b(80, bias), speed: b(68, bias), instincts: b(70, bias),
    });

  const de1 = edge("de1", "LE", 0);
  const de2 = edge("de2", "RE", -2);
  const dt1 = interior("dt1", "DT1", 0);
  const dt2 = interior("dt2", "DT2", -2);

  const backer = (role: string, name: string, position: PlayerState["bio"]["position"]): PlayerState =>
    makePlayer(id(role), name, position, {
      tackling: b(82, bias), strength: b(76, bias), pursuit: b(82, bias), instincts: b(78, bias),
      playRecognition: b(80, bias), blockShed: b(72, bias), speed: b(82, bias),
      zoneCoverage: b(70, bias), manCoverage: b(66, bias), press: b(58, bias),
      ballSkills: b(62, bias), reaction: b(74, bias), jumping: b(68, bias),
      awareness: b(76, bias), agility: b(76, bias), acceleration: b(80, bias),
    });

  const lb1 = backer("lb1", "MLB", "MLB");
  const lb2 = backer("lb2", "WLB", "OLB");

  const corner = (role: string, name: string, nudge: number): PlayerState =>
    makePlayer(id(role), name, "CB", {
      speed: b(89 + nudge, bias), acceleration: b(88, bias), agility: b(85, bias),
      strength: b(64, bias), jumping: b(82, bias), manCoverage: b(78 + nudge, bias),
      zoneCoverage: b(76 + nudge, bias), press: b(74, bias), ballSkills: b(72, bias),
      reaction: b(78, bias), tackling: b(66, bias), pursuit: b(76, bias),
      instincts: b(74, bias), blockShed: b(60, bias), playRecognition: b(74, bias),
      awareness: b(74, bias),
    });

  const cb1 = corner("cb1", "CB1", 3);
  const cb2 = corner("cb2", "CB2", 0);
  const nb = corner("nb", "NB", -3);

  const safety = (role: string, name: string, position: PlayerState["bio"]["position"], cover: number): PlayerState =>
    makePlayer(id(role), name, position, {
      speed: b(85, bias), acceleration: b(84, bias), agility: b(80, bias), strength: b(72, bias),
      jumping: b(78, bias), zoneCoverage: b(cover, bias), manCoverage: b(cover - 8, bias),
      ballSkills: b(74, bias), reaction: b(78, bias), tackling: b(78, bias), pursuit: b(84, bias),
      instincts: b(80, bias), blockShed: b(64, bias), playRecognition: b(78, bias),
      awareness: b(78, bias), press: b(56, bias),
    });

  const fs = safety("fs", "FS", "FS", 82);
  const ss = safety("ss", "SS", "SS", 74);

  const kicker = makePlayer(id("k"), "K", "K", {
    strength: b(78, bias), accuracy: b(80, bias), awareness: b(70, bias), speed: b(60, bias),
  });
  const punter = makePlayer(id("p"), "P", "P", {
    strength: b(76, bias), accuracy: b(74, bias), awareness: b(68, bias), speed: b(58, bias),
  });

  const roster = [qb, rb, wr1, wr2, wr3, te, lt, lg, c, rg, rt,
    de1, dt1, dt2, de2, lb1, lb2, cb1, cb2, nb, fs, ss, kicker, punter];
  const players: Record<string, PlayerState> = {};
  for (const p of roster) players[p.bio.id as unknown as string] = p;

  return {
    team: teamId(team),
    players,
    offense: {
      quarterback: qb.bio.id,
      runningBack: rb.bio.id,
      receivers: [wr1.bio.id, wr2.bio.id, wr3.bio.id],
      tightEnd: te.bio.id,
      leftTackle: lt.bio.id,
      leftGuard: lg.bio.id,
      center: c.bio.id,
      rightGuard: rg.bio.id,
      rightTackle: rt.bio.id,
    },
    defense: {
      edges: [de1.bio.id, de2.bio.id],
      interior: [dt1.bio.id, dt2.bio.id],
      linebackers: [lb1.bio.id, lb2.bio.id],
      corners: [cb1.bio.id, cb2.bio.id, nb.bio.id],
      safeties: [fs.bio.id, ss.bio.id],
    },
    specialTeams: { kicker: kicker.bio.id, punter: punter.bio.id, returner: wr3.bio.id },
  };
}

export interface GameFixture {
  readonly state: MatchState;
  readonly inputs: GameInputs;
  readonly seed: string;
  readonly names: (id: PlayerId) => string;
}

export function buildGameFixture(options: Partial<GameCoordinates> & { seed?: string } = {}): GameFixture {
  const home: TeamId = teamId("t-hou");
  const away: TeamId = teamId("t-den");
  const coordinates: GameCoordinates = {
    season: options.season ?? 2026,
    week: options.week ?? 4,
    home,
    away,
    ...(options.replay === undefined ? {} : { replay: options.replay }),
  };
  const snapshot: GameSnapshot = {
    at: GAME_STAMP,
    home: buildTeamSnapshot("t-hou", 2),
    away: buildTeamSnapshot("t-den", -2),
  };
  const inputs: GameInputs = {
    coordinates,
    snapshot,
    callers: { home: defaultPlayCaller("baseline-home"), away: defaultPlayCaller("baseline-away") },
  };
  const lookup = (id: PlayerId): string => {
    const p = snapshot.home.players[id as unknown as string] ?? snapshot.away.players[id as unknown as string];
    return p === undefined ? String(id) : `${p.bio.displayName} (${p.bio.position})`;
  };
  return {
    state: createMatchState(coordinates, snapshot),
    inputs,
    seed: options.seed ?? "phase1-game-loop",
    names: lookup,
  };
}
