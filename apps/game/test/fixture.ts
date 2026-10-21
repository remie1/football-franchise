/**
 * A small hand-built game for the viewer's tests: two drives with one of each kind of play the
 * log words. Shaped like `export-game`'s output; the payloads carry only what the viewer reads.
 */
import type { MatchEvent, MatchEventEnvelope } from "@ff/contracts";
import type { BoxScoreLine, GameFile } from "../src/gameFile.js";

const at = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 7 } as MatchEventEnvelope["at"];
const G = "g:test";
const HOME = "t:00";
const AWAY = "t:01";

type Loose = { type: string; payload: unknown; playId?: string };
const game = (type: string, payload: unknown): Loose => ({ type, payload });
const play = (playId: string, type: string, payload: unknown): Loose => ({ type, payload, playId });

function snap(playId: string, kind: string, down: number, distance: number, ballOn: number, clockSeconds: number, offense: object = {}, defense: object = {}): Loose {
  return play(playId, "PLAY_START", {
    kind,
    situation: { down, distance, ballOn, clockSeconds },
    offense: { team: AWAY, call: kind === "PASS_PLAY_V1" ? "Spot Option" : "Inside Zone", quarterback: "qb", ...offense },
    defense: { team: HOME, call: "Cover 1", tags: [{ kind: "PRESSURE", id: "SMOKE", name: "Smoke" }], ...defense },
  });
}
const result = (playId: string, yards: number, more: object = {}) => play(playId, "PLAY_RESULT", { yards, turnover: false, clockRunoff: 5, ...more });

const EVENTS: Loose[] = [
  game("GAME_START", { home: HOME, away: AWAY, seed: "s" }),
  game("COIN_TOSS", { winner: AWAY, choice: "RECEIVE", receivesFirst: AWAY }),
  game("PERIOD_START", { period: 1, clockSeconds: 900 }),
  play("k1", "KICKOFF", { kicker: "hk", team: HOME, fromYardLine: 35, touchback: true, returnYards: 0, resultYardLine: 30 }),
  game("DRIVE_START", { driveNumber: 1, offense: AWAY, defense: HOME, period: 1, clockSeconds: 900, startYardLine: 30, cause: "OPENING_KICKOFF" }),
  // 1: complete under pressure, a big play
  snap("p1", "PASS_PLAY_V1", 1, 10, 30, 900, {
    formation: "Shotgun Trips Right",
    readSystem: "CONCEPT",
    readOrder: ["wr", "te"],
    routes: [
      { receiver: "wr", routeName: "Post" },
      { receiver: "te", routeName: "Seam" },
    ],
    protectionScheme: { kind: "SLIDE", slideSide: "LEFT", available: ["rb2"], slideCheck: true },
    leash: 50,
  }, {
    personnel: "Nickel",
    front: "Over",
    coverage: "MIXED",
    coverageDisguise: "ROTATED",
    blitzDisguise: "STANDARD",
    tags: [
      { kind: "LOOK", id: "SHOW_2", name: "Show 2" },
      { kind: "PRESSURE", id: "SMOKE", name: "Smoke" },
    ],
    assignments: [
      { kind: "MAN", defender: "cb", covers: "wr", technique: "PRESS" },
      { kind: "ZONE", defender: "fs", zone: { horizontal: "LH", vertical: "DEEP" } },
    ],
    shownAssignments: [
      { kind: "MAN", defender: "cb", covers: "wr", technique: "PRESS" },
      { kind: "ZONE", defender: "fs", zone: { horizontal: "C", vertical: "DEEP" } },
    ],
    rush: [{ rusher: "de", move: "SPEED" }],
  }),
  play("p1", "PRESNAP_READ", {
    actor: "qb",
    kind: "coverage_read",
    roll: { die: "d100", raw: 40, modifiers: [{ source: "QB Awareness", value: 12 }], total: 52, rngLabel: "r" },
    target: 50,
    tier: "MARGINAL_SUCCESS",
    band: "GOOD_READ",
  }),
  play("p1", "CHECK", {
    checkKind: "pass_rush_rep",
    actors: ["de", "lt"],
    roll: { die: "d100", raw: 70, modifiers: [{ source: "DE Pass Rush", value: 12 }], total: 82, rngLabel: "r" },
    opposedRoll: { die: "d100", raw: 30, modifiers: [{ source: "LT Pass Block", value: -2 }], total: 28, rngLabel: "r" },
    tier: "DOMINANT_SUCCESS",
    band: "RUSHER_WINS_REP",
    margin: 54,
    testsAttrs: [],
  }),
  play("p1", "TICK", { tick: 1 }),
  play("p1", "POCKET_STATUS", { status: "PRESSURE" }),
  play("p1", "POCKET_STATUS", { status: "COLLAPSING" }),
  play("p1", "THROW", { target: "wr", throwType: "BULLET", accuracyTier: "SUCCESS" }),
  play("p1", "CATCH_RESOLUTION", { receiver: "wr", catchType: "ROUTINE", openness: 50, rollRef: "r", caught: true }),
  result("p1", 25),
  // 2: sack, credited to the last ARRIVED rusher
  snap("p2", "PASS_PLAY_V1", 1, 10, 55, 860),
  play("p2", "RUSH_THREAT", { rusher: "de", alignment: "EDGE", origin: "WON_REP", rollRef: "r", etaTick: 3, state: "ARRIVED" }),
  result("p2", -7),
  // 3: dropped pass
  snap("p3", "PASS_PLAY_V1", 2, 17, 48, 820),
  play("p3", "THROW", { target: "te", throwType: "TOUCH", accuracyTier: "SUCCESS" }),
  play("p3", "CHECK", { checkKind: "catch", actors: ["te"], tier: "FAIL", band: "DROPPED_CLEANLY", margin: -3 }),
  play("p3", "CATCH_RESOLUTION", { receiver: "te", catchType: "ROUTINE", openness: 50, rollRef: "r", caught: false }),
  result("p3", 0),
  // 4: interception
  snap("p4", "PASS_PLAY_V1", 3, 17, 48, 815),
  play("p4", "THROW", { target: "wr", throwType: "BULLET", accuracyTier: "FAIL" }),
  play("p4", "CHECK", { checkKind: "contested_catch", actors: ["wr", "cb"], tier: "FAIL", band: "INTERCEPTION", margin: -5 }),
  result("p4", 0, { turnover: true }),
  game("DRIVE_END", { driveNumber: 1, offense: AWAY, result: "INTERCEPTION", plays: 4, yards: 18, elapsedSeconds: 90, endYardLine: 48, points: 0 }),
  game("POSSESSION_CHANGE", { from: AWAY, to: HOME, cause: "INTERCEPTION", ballOn: 40 }),
  game("DRIVE_START", { driveNumber: 2, offense: HOME, defense: AWAY, period: 1, clockSeconds: 810, startYardLine: 40, cause: "INTERCEPTION" }),
  // 5: run for a touchdown, then the extra point after DRIVE_END
  play("p5", "PLAY_START", {
    kind: "RUN_PLAY_V1",
    situation: { down: 1, distance: 10, ballOn: 40, clockSeconds: 810 },
    offense: { team: HOME, call: "Power", carrier: "rb" },
    defense: { team: AWAY, call: "Cover 3" },
  }),
  play("p5", "RUN_RESOLUTION", { carrier: "rb", carryType: "DESIGNED", gap: "RIGHT-B", yardsBeforeContact: 4, yards: 60 }),
  result("p5", 60, { score: 6 }),
  game("SCORE", { team: HOME, kind: "TOUCHDOWN", points: 6, home: 6, away: 0 }),
  game("DRIVE_END", { driveNumber: 2, offense: HOME, result: "TOUCHDOWN", plays: 1, yards: 60, elapsedSeconds: 5, endYardLine: 100, points: 6 }),
  play("x1", "CHECK", {
    checkKind: "field_goal",
    actors: ["hk"],
    roll: { die: "d100", raw: 77, modifiers: [], total: 77, rngLabel: "r" },
    target: 10,
    tier: "TOTAL_SUCCESS",
    band: "GOOD",
    margin: 67,
    testsAttrs: [],
  }),
  play("x1", "PLACEKICK", { kind: "EXTRA_POINT", kicker: "hk", team: HOME, distanceYards: 33, made: true, band: "GOOD", rollRef: "r", target: 10 }),
  game("SCORE", { team: HOME, kind: "EXTRA_POINT", points: 1, home: 7, away: 0 }),
  play("k2", "KICKOFF", { kicker: "hk", team: HOME, fromYardLine: 35, touchback: false, returner: "kr", returnYards: 22, resultYardLine: 25 }),
  game("SOMETHING_NEW", { from: "the future" }),
  game("PERIOD_END", { period: 1, home: 7, away: 0 }),
  game("GAME_END", { home: 7, away: 0, periods: [{ period: 1, home: 7, away: 0 }], plays: 5, drives: 2, reason: "REGULATION", seed: "s" }),
];

const PLAYERS: GameFile["players"] = {
  qb: { name: "Ada Quinn", position: "QB", team: AWAY },
  wr: { name: "Wes Reed", position: "WR", team: AWAY },
  te: { name: "Ty Ellis", position: "TE", team: AWAY },
  kr: { name: "Kai Ross", position: "WR", team: AWAY },
  de: { name: "Dez Edge", position: "DE", team: HOME },
  fs: { name: "Finn Shaw", position: "FS", team: HOME },
  lt: { name: "Lou Tate", position: "LT", team: AWAY },
  rb2: { name: "Rob Bell", position: "RB", team: AWAY },
  cb: { name: "Cal Burke", position: "CB", team: HOME },
  rb: { name: "Ray Banks", position: "RB", team: HOME },
  hk: { name: "Hal Kemp", position: "K", team: HOME },
};

const zero = {
  passing: { attempts: 0, completions: 0, yards: 0, touchdowns: 0, interceptions: 0, sacked: 0, sackYards: 0 },
  rushing: { attempts: 0, yards: 0, touchdowns: 0, longest: 0 },
  receiving: { targets: 0, receptions: 0, yards: 0, touchdowns: 0, drops: 0 },
  defense: { tackles: 0, sacks: 0, interceptions: 0, passesDefensed: 0, tacklesForLoss: 0 },
  kicking: { fieldGoalAttempts: 0, fieldGoalsMade: 0, extraPointAttempts: 0, extraPointsMade: 0, punts: 0, puntGrossYards: 0 },
  returns: { kickReturns: 0, kickReturnYards: 0, puntReturns: 0, puntReturnYards: 0 },
};
const STATLINES: BoxScoreLine[] = [
  { ...zero, player: "qb", team: AWAY, passing: { ...zero.passing, attempts: 3, completions: 1, yards: 25, interceptions: 1, sacked: 1, sackYards: 7 } },
  { ...zero, player: "wr", team: AWAY, receiving: { ...zero.receiving, targets: 2, receptions: 1, yards: 25 } },
  { ...zero, player: "te", team: AWAY, receiving: { ...zero.receiving, targets: 1, drops: 1 } },
  { ...zero, player: "rb", team: HOME, rushing: { attempts: 1, yards: 60, touchdowns: 1, longest: 60 } },
  { ...zero, player: "de", team: HOME, defense: { ...zero.defense, sacks: 1, tackles: 1, tacklesForLoss: 1 } },
  { ...zero, player: "hk", team: HOME, kicking: { ...zero.kicking, extraPointAttempts: 1, extraPointsMade: 1 } },
];

export const FIXTURE: GameFile = {
  format: "ff-game/1",
  seed: "s",
  league: "flat",
  callerVersion: "default",
  home: { id: HOME, city: "Home City", name: "Hosts" },
  away: { id: AWAY, city: "Away Town", name: "Visitors" },
  players: PLAYERS,
  events: EVENTS.map((e, seq) => ({ seq, at, event: { ...e, gameId: G } as unknown as MatchEvent })),
  statlines: STATLINES,
};
