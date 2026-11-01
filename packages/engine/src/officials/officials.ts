/**
 * THE OFFICIALS (ADR-093 step 1): the seen and wrong-flag chances, and the one roll that judges a
 * foul roll.
 *
 *  - The seen chance (§5.2, Q1; A3): `min(seenCap, seen[visibility] × crew × let them play × road)`.
 *    A crew's factor on a foul is `max(crewFloor, 1 + weight × (lean − 50) ÷ 50)`, so a lean of L
 *    calls the family at L ÷ 50 of the league's rate wherever neither the cap nor the floor binds;
 *    a kick takes no lean. What the cap cuts is not moved onto wrong flags ("compress").
 *  - The wrong-flag chance (§5.3, Q2; A9): the kind's filed chance times the same three factors,
 *    capped only at 1. None is filed at step 1, so judging a near-foul refuses.
 *  - Let them play (Q4; A7) and home and road (Q5; A8) multiply both chances. Every let-them-play
 *    factor is 1 until each family's step fits its own. A kick takes no crew's lean (A3: F5 gives
 *    KICKS none). At step 1 it also takes no let-them-play factor (A7) and no home-and-road factor
 *    (ADR-093 §16 A8; Table 7 counts scrimmage snaps only), so a foul on a kick is seen at its
 *    kind's own visibility. Step 8 (kicks) decides whether a kick takes either of those two.
 *  - The roll: one bare d100 on the foul roll's own fork, `<its label>/officials`, on every foul and
 *    every near-foul, whatever its target (§5.1; A9). A clean roll draws nothing. A chance
 *    above 0.995, which would round to a certain flag, is refused.
 *
 * Why the dials live here and not in the engine's tunables: step 1 changes no game, since nothing
 * calls these rolls until step 2. ADR-089's filing pins the tunables' leaf census while the pocket
 * fix is measured, so a new leaf there would move a pin without moving a game. The dials move into
 * the tunables by an amendment that re-pins the census once ADR-089 lifts it (A12), as the stem's
 * will (`game/stem.ts:18-23`). Every function takes them as an argument, so a test injects its own.
 *
 * Nothing here is on the barrel. A game calls only `crewOnRecord` at step 1, and only when it is
 * handed a crew.
 */
import type {
  CrewLeanFamily,
  FoulKind,
  GameKind,
  OfficiatingCrew,
  PlayerId,
  Rng,
  ScheduledGame,
  TeamId,
} from "@ff/contracts";
import type { CheckEmission, OfficialsCheckEmission } from "../events.js";
import { rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import { FOUL_VISIBILITY, SCRIMMAGE_FAMILY, readFoulRoll } from "./fouls.js";
import type { FoulPhase, FoulVisibility } from "./fouls.js";

/** Thrown when an official's roll or a crew cannot be taken as given. Module-local, as `AtTheLineError` is. */
export class OfficialsError extends Error {
  constructor(message: string) {
    super(`@ff/engine: officials: ${message}`);
    this.name = "OfficialsError";
  }
}

/** Q4, for one family (A7): how the officials let them play through a game. Every factor is 1 at step 1. */
export interface LetThemPlay {
  /** Quarters 1 to 4. */
  readonly arc: readonly [number, number, number, number];
  /** A period past regulation. */
  readonly overtime: number;
  /** The last quarter of regulation or later, with the score within `closeWithin` points. */
  readonly lateAndClose: number;
  /** WILD_CARD, DIVISIONAL, CONFERENCE_FINAL and CHAMPIONSHIP. */
  readonly playoffs: number;
}

export interface OfficialsDials {
  /** PLAIN 0.95 and OPEN 0.80 (§5.2, CHOSEN, confirmed §13); CROWD 2 in 3 (Q1, ruled). */
  readonly seen: Readonly<Record<FoulVisibility, number>>;
  /** Even the strictest crew misses 1 plain foul in 100 (CHOSEN, A3). */
  readonly seenCap: number;
  /** No crew calls under a fifth of the league's rate of any kind (CHOSEN, A3). */
  readonly crewFloor: number;
  /** The league's lean (contracts `officials.ts:16-17`). */
  readonly leanCenter: number;
  /** Each kind's weight on its family's lean: its Table 2 crew spread over the family's (COMPUTED, A3). */
  readonly crewWeight: Readonly<Record<FoulKind, number>>;
  /** A foul roll that made its target by this much or less is a near-foul (§5.3 as amended, A2). */
  readonly nearFoulMargin: number;
  /** The share of flags thrown wrongly: 1 in 20 on judgment calls, 1 in 200 on plain ones (Q2, ruled). */
  readonly wrongShare: { readonly judgment: number; readonly plain: number };
  /** Each kind's filed wrong-flag chance, filed at its family's step (A9). None at step 1. */
  readonly wrongFlagChance: Readonly<Partial<Record<FoulKind, number>>>;
  /** "Close" is a score within this many points (Q4, ruled: "within 8 points"). */
  readonly closeWithin: number;
  readonly letThemPlay: Readonly<Record<CrewLeanFamily, LetThemPlay>>;
  /** Road over home flags on the defense's judgment calls Q5 names (REAL, Table 7; A8). */
  readonly roadRatio: Readonly<Partial<Record<FoulKind, number>>>;
}

/** Every let-them-play factor at 1: step 1's placeholder until each family's step fits its own (A7). */
const LET_THEM_PLAY_AT_ONE: LetThemPlay = Object.freeze({
  arc: Object.freeze([1, 1, 1, 1] as const),
  overtime: 1,
  lateAndClose: 1,
  playoffs: 1,
});

/** The officials' dials as filed for step 1. Deeply frozen, as `STEM_DIALS` is. */
export const OFFICIALS_DIALS: OfficialsDials = Object.freeze({
  seen: Object.freeze({ PLAIN: 0.95, OPEN: 0.8, CROWD: 2 / 3 }),
  seenCap: 0.99,
  crewFloor: 0.2,
  leanCenter: 50,
  /** A3's table: Table 2's crew SD over the family's rate-weighted composite, to 3 places; 1 where Table 2 has no row. */
  crewWeight: Object.freeze({
    FALSE_START: 1.037,
    DEFENSIVE_OFFSIDE: 1.481,
    NEUTRAL_ZONE_INFRACTION: 0,
    ENCROACHMENT: 0,
    OFFENSIVE_OFFSIDE: 1,
    DEFENSIVE_DELAY_OF_GAME: 1,
    DELAY_OF_GAME: 1.019,
    ILLEGAL_FORMATION: 1.338,
    ILLEGAL_SHIFT: 2.293,
    ILLEGAL_MOTION: 3.759,
    INELIGIBLE_DOWNFIELD_PASS: 0,
    INTENTIONAL_GROUNDING: 0,
    DEFENSIVE_TOO_MANY_MEN_ON_FIELD: 1,
    OFFENSIVE_TOO_MANY_MEN_ON_FIELD: 1,
    ILLEGAL_FORWARD_PASS: 1,
    OFFENSIVE_HOLDING: 0.996,
    ILLEGAL_USE_OF_HANDS: 1.303,
    ILLEGAL_BLOCK_ABOVE_THE_WAIST: 0,
    CHOP_BLOCK: 1,
    CLIPPING: 1,
    DEFENSIVE_PASS_INTERFERENCE: 0.299,
    DEFENSIVE_HOLDING: 1.12,
    ILLEGAL_CONTACT: 1.493,
    OFFENSIVE_PASS_INTERFERENCE: 2.538,
    UNNECESSARY_ROUGHNESS: 1.033,
    ROUGHING_THE_PASSER: 1.127,
    FACE_MASK: 0.892,
    UNSPORTSMANLIKE_CONDUCT: 0.329,
    TAUNTING: 1.596,
    HORSE_COLLAR_TACKLE: 1,
    TRIPPING: 1,
  } satisfies Record<FoulKind, number>),
  nearFoulMargin: 10,
  wrongShare: Object.freeze({ judgment: 1 / 20, plain: 1 / 200 }),
  wrongFlagChance: Object.freeze({}),
  closeWithin: 8,
  letThemPlay: Object.freeze({
    LINE_HOLDING: LET_THEM_PLAY_AT_ONE,
    COVERAGE: LET_THEM_PLAY_AT_ONE,
    PLAYER_SAFETY: LET_THEM_PLAY_AT_ONE,
    TECHNICAL: LET_THEM_PLAY_AT_ONE,
    SNAP: LET_THEM_PLAY_AT_ONE,
  } satisfies Record<CrewLeanFamily, LetThemPlay>),
  roadRatio: Object.freeze({
    DEFENSIVE_PASS_INTERFERENCE: 1.14,
    DEFENSIVE_HOLDING: 1.11,
    ILLEGAL_CONTACT: 1.29,
  } satisfies Partial<Record<FoulKind, number>>),
});

/** No crew: the league's average, every lean 50 (contracts `events.ts:710-716`). */
export const LEAGUE_LEANS: Readonly<Record<CrewLeanFamily, number>> = Object.freeze({
  LINE_HOLDING: 50,
  COVERAGE: 50,
  PLAYER_SAFETY: 50,
  TECHNICAL: 50,
  SNAP: 50,
});

/** The families in the contract's order (contracts `penalties.ts:64`), the order a crew's leans are written in. */
const CREW_LEAN_FAMILIES: readonly CrewLeanFamily[] = Object.freeze([
  "LINE_HOLDING",
  "COVERAGE",
  "PLAYER_SAFETY",
  "TECHNICAL",
  "SNAP",
] as const satisfies readonly CrewLeanFamily[]);

/** The kinds of game Q4 counts as the playoffs. PRESEASON counts as regular (CHOSEN). Exhaustive. */
const IN_THE_PLAYOFFS: Readonly<Record<GameKind, boolean>> = Object.freeze({
  PRESEASON: false,
  REGULAR: false,
  WILD_CARD: true,
  DIVISIONAL: true,
  CONFERENCE_FINAL: true,
  CHAMPIONSHIP: true,
});

/** What the officials know of the game they work: the crew's leans, the kind of game and the site. */
export interface OfficiatingGame {
  readonly leans: Readonly<Record<CrewLeanFamily, number>>;
  readonly kind: GameKind;
  readonly neutralSite: boolean;
  readonly home: TeamId;
}

/**
 * The game as the officials see it. No crew: LEAGUE_LEANS. No `scheduled`: a regular-season game at
 * the home team's field (CHOSEN). A crew is checked as `crewOnRecord` checks it. Its input is
 * structural and names no `GameInputs`, so this compiles before the game takes a crew.
 */
export function officiatingGameOf(
  inputs: {
    readonly crew?: OfficiatingCrew;
    readonly scheduled?: Readonly<Pick<ScheduledGame, "kind" | "neutralSite">>;
  },
  home: TeamId,
): OfficiatingGame {
  return {
    leans: inputs.crew === undefined ? LEAGUE_LEANS : crewOnRecord(inputs.crew).leans,
    kind: inputs.scheduled === undefined ? "REGULAR" : inputs.scheduled.kind,
    neutralSite: inputs.scheduled === undefined ? false : inputs.scheduled.neutralSite,
    home,
  };
}

/**
 * The crew as the record carries it: a checked copy in the contract's key order, `{ id, referee,
 * leans: { LINE_HOLDING, COVERAGE, PLAYER_SAFETY, TECHNICAL, SNAP } }`, so no other key of the
 * caller's object rides into the stream and a crew read back from a save in another order writes
 * the same bytes. Refuses an empty id or referee, a lean on anything but the five families (KICKS
 * takes none), a missing family, and a lean that is not a number from 0 to 100.
 */
export function crewOnRecord(crew: OfficiatingCrew): OfficiatingCrew {
  const given: unknown = crew;
  if (typeof given !== "object" || given === null) throw new OfficialsError("a crew must be an object");
  const { id, referee, leans } = given as { readonly id?: unknown; readonly referee?: unknown; readonly leans?: unknown };
  if (typeof id !== "string" || id.length === 0) throw new OfficialsError("a crew needs an id, a non-empty string");
  if (typeof referee !== "string" || referee.length === 0) {
    throw new OfficialsError(`crew ${id} needs a referee, a non-empty string`);
  }
  if (typeof leans !== "object" || leans === null) throw new OfficialsError(`crew ${id} has no leans`);
  const byFamily = leans as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(byFamily)) {
    if (key === "KICKS") throw new OfficialsError(`crew ${id} leans on KICKS, which takes no lean (ADR-093 §6.1)`);
    if (!(CREW_LEAN_FAMILIES as readonly string[]).includes(key)) {
      throw new OfficialsError(`crew ${id} leans on ${key}, which is not one of the five families`);
    }
  }
  const lean = (family: CrewLeanFamily): number => {
    const value = byFamily[family];
    if (value === undefined) throw new OfficialsError(`crew ${id} has no lean on ${family}`);
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new OfficialsError(`crew ${id}'s lean on ${family} is ${String(value)}, not a number from 0 to 100`);
    }
    return value;
  };
  return {
    id: crew.id,
    referee,
    leans: {
      LINE_HOLDING: lean("LINE_HOLDING"),
      COVERAGE: lean("COVERAGE"),
      PLAYER_SAFETY: lean("PLAYER_SAFETY"),
      TECHNICAL: lean("TECHNICAL"),
      SNAP: lean("SNAP"),
    },
  };
}

/** What the officials read of the moment. */
export interface OfficialsSituation {
  readonly period: number;
  readonly offenseScore: number;
  readonly defenseScore: number;
}

/** The foul or near-foul being judged. `team` is the fouling team; Q5 reads it against `game.home`. */
export interface JudgedFoul {
  readonly kind: FoulKind;
  readonly phase: FoulPhase;
  readonly player: PlayerId;
  readonly team: TeamId;
}

/** SEES: the officials see a foul. PHANTOM: they flag a near-foul that was no foul. */
export type OfficialsRoll = "SEES" | "PHANTOM";

/** The arc has four quarters; a game of another length has no arc to read. */
function regulationPeriods(tunables: Tunables): number {
  const periods = tunables.game.periodsInRegulation;
  if (periods !== 4) {
    throw new OfficialsError(
      `the let-them-play arc has four quarters, but this game has ${String(periods)} periods in regulation`,
    );
  }
  return periods;
}

/** A3: 1 on a kick; else `max(crewFloor, 1 + crewWeight[kind] × (lean − leanCenter) ÷ leanCenter)`. */
export function crewFactor(
  dials: OfficialsDials,
  kind: FoulKind,
  phase: FoulPhase,
  leans: Readonly<Record<CrewLeanFamily, number>>,
): number {
  if (phase === "KICK") return 1;
  const lean = leans[SCRIMMAGE_FAMILY[kind]];
  return Math.max(dials.crewFloor, 1 + (dials.crewWeight[kind] * (lean - dials.leanCenter)) / dials.leanCenter);
}

/**
 * Q4 as A7 reads it: 1 for PLAIN kinds and kicks; else the arc's quarter (or overtime) × late and close
 * × the playoffs, by the kind's family. "Late" is the last quarter of regulation or later, so
 * overtime counts. Kicks take 1 at step 1; step 8 (kicks) decides whether crowd and open fouls on
 * kicks take a factor.
 */
export function letThemPlayFactor(
  dials: OfficialsDials,
  tunables: Tunables,
  game: OfficiatingGame,
  situation: OfficialsSituation,
  kind: FoulKind,
  phase: FoulPhase,
): number {
  const regulation = regulationPeriods(tunables);
  if (!Number.isInteger(situation.period) || situation.period < 1) {
    throw new OfficialsError(`a period is a whole number from 1, not ${String(situation.period)}`);
  }
  if (phase === "KICK" || FOUL_VISIBILITY[kind] === "PLAIN") return 1;
  const dial = dials.letThemPlay[SCRIMMAGE_FAMILY[kind]];
  const quarter = situation.period <= regulation ? dial.arc[situation.period - 1] : dial.overtime;
  if (quarter === undefined) throw new OfficialsError(`the arc has no quarter ${String(situation.period)}`);
  const close = Math.abs(situation.offenseScore - situation.defenseScore) <= dials.closeWithin;
  const lateAndClose = situation.period >= regulation && close ? dial.lateAndClose : 1;
  const playoffs = IN_THE_PLAYOFFS[game.kind] ? dial.playoffs : 1;
  return quarter * lateAndClose * playoffs;
}

/**
 * Q5 as A8 reads it: on the defense's DPI, DH and IC only, the home defense `2 ÷ (1 + r)` and the road
 * defense `2r ÷ (1 + r)`, so the pair averages 1 and the league's rate stays as ruled; 1 at a
 * neutral site and for every other kind. A foul judged on a kick takes 1 at step 1, as it takes no
 * crew's lean and no let-them-play factor, so its chances are its kind's own: the class seen chance
 * and the filed wrong-flag chance (ADR-093 §16 A8). Table 7's ratios count scrimmage snaps only;
 * step 8 (kicks) decides whether a kick takes them.
 */
export function roadFactor(dials: OfficialsDials, game: OfficiatingGame, foul: JudgedFoul): number {
  if (foul.phase === "KICK") return 1;
  const r = dials.roadRatio[foul.kind];
  if (r === undefined || game.neutralSite) return 1;
  return foul.team === game.home ? 2 / (1 + r) : (2 * r) / (1 + r);
}

/**
 * SEES: `min(seenCap, seen[visibility] × crew × let them play × road)`.
 * PHANTOM: `min(1, wrongFlagChance[kind] × crew × let them play × road)`; refused for a kind with no
 * filed chance (none is filed at step 1).
 */
export function officialsChance(
  dials: OfficialsDials,
  tunables: Tunables,
  game: OfficiatingGame,
  situation: OfficialsSituation,
  foul: JudgedFoul,
  roll: OfficialsRoll,
): number {
  const crew = crewFactor(dials, foul.kind, foul.phase, game.leans);
  const letThemPlay = letThemPlayFactor(dials, tunables, game, situation, foul.kind, foul.phase);
  const road = roadFactor(dials, game, foul);
  if (roll === "SEES") return Math.min(dials.seenCap, dials.seen[FOUL_VISIBILITY[foul.kind]] * crew * letThemPlay * road);
  const filed = dials.wrongFlagChance[foul.kind];
  if (filed === undefined) {
    throw new OfficialsError(`no wrong-flag chance is filed for ${foul.kind}; each family's step files its own (A9)`);
  }
  return Math.min(1, filed * crew * letThemPlay * road);
}

/** The largest chance a d100 can roll short of a certain flag: above it the target would round to 1. */
const HIGHEST_CHANCE = 0.995;

/**
 * The d100 target for a chance: `min(101, round(101 − 100 × chance))`. Made when the die is at or
 * above it, so P(made) = (101 − target) ÷ 100. Refuses a chance above 0.995, which would give target
 * 1, a certain flag; `OFFICIALS_DIALS` never reaches it (the cap is 0.99, target 2).
 */
export function officialsTarget(chance: number): number {
  if (typeof chance !== "number" || Number.isNaN(chance) || chance < 0) {
    throw new OfficialsError(`a chance is a number from 0, not ${String(chance)}`);
  }
  if (chance > HIGHEST_CHANCE) {
    throw new OfficialsError(
      `a chance of ${String(chance)} would round to target 1, a certain flag; the highest is ${String(HIGHEST_CHANCE)}`,
    );
  }
  return Math.min(101, Math.round(101 - 100 * chance));
}

/**
 * A9, the family steps' arithmetic: the wrong-flag chance that makes `share` of a kind's
 * flags wrong, `share ÷ (1 − share) × seen × foulsPerNearFoul`, where `seen` is the kind's class
 * chance and `foulsPerNearFoul` is measured at the kind's moment.
 */
export function wrongFlagChanceFor(a: {
  readonly share: number;
  readonly seen: number;
  readonly foulsPerNearFoul: number;
}): number {
  if (!(a.share >= 0 && a.share < 1)) {
    throw new OfficialsError(`a share of wrong flags is from 0 to under 1, not ${String(a.share)}`);
  }
  if (!(a.seen >= 0 && a.seen <= 1)) throw new OfficialsError(`a seen chance is from 0 to 1, not ${String(a.seen)}`);
  if (!(a.foulsPerNearFoul >= 0 && Number.isFinite(a.foulsPerNearFoul))) {
    throw new OfficialsError(`fouls per near-foul is a number from 0, not ${String(a.foulsPerNearFoul)}`);
  }
  return (a.share / (1 - a.share)) * a.seen * a.foulsPerNearFoul;
}

/** What the officials made of one foul roll. */
export interface FoulRollJudgment {
  readonly reading: "FOUL" | "NEAR_FOUL";
  /** FOUL: the foul is flagged. NEAR_FOUL: a wrong flag is thrown. */
  readonly flagged: boolean;
  readonly chance: number;
  readonly target: number;
  /**
   * Always present: every foul and every near-foul gets its officials' roll (ADR-093 §5.1; contracts
   * `events.ts:164-165`, `:172-175`).
   */
  readonly check: OfficialsCheckEmission;
}

/**
 * Judge one foul roll (`judged`, the `penalty_check` CHECK, drawn on `foulRng`). CLEAN: undefined,
 * and no die is drawn. Otherwise always one bare d100 on `foulRng.fork("officials")`, whatever the
 * target: at target 101 (a chance under 0.005) the die is drawn, the CHECK is written and fails, and
 * no flag is thrown. The CHECK names the foul roll by its label (`rollRef`).
 *
 * Refuses:
 *  - `judged` that is not a `penalty_check`, or whose margin is not a number;
 *  - `foulRng.label !== judged.roll.rngLabel`;
 *  - `foul.player` not among `judged.actors`;
 *  - a period count in regulation other than 4 (the arc's length);
 *  - a near-foul of a kind with no filed chance;
 *  - a chance above 0.995 (target 1), which `OFFICIALS_DIALS` never reaches.
 */
export function judgeFoulRoll(args: {
  readonly dials: OfficialsDials;
  readonly tunables: Tunables;
  readonly game: OfficiatingGame;
  readonly situation: OfficialsSituation;
  readonly foul: JudgedFoul;
  readonly judged: CheckEmission;
  readonly foulRng: Rng;
}): FoulRollJudgment | undefined {
  const { dials, tunables, game, situation, foul, judged, foulRng } = args;
  if (judged.checkKind !== "penalty_check") {
    throw new OfficialsError(`the officials judge a penalty_check, not a ${judged.checkKind}`);
  }
  if (!Number.isFinite(judged.margin)) {
    throw new OfficialsError(`the penalty_check's margin is ${String(judged.margin)}, not a number`);
  }
  if (foulRng.label !== judged.roll.rngLabel) {
    throw new OfficialsError(`the foul roll was drawn on ${judged.roll.rngLabel}, but its generator is ${foulRng.label}`);
  }
  if (!judged.actors.includes(foul.player)) {
    throw new OfficialsError(`${String(foul.player)} is not among the penalty_check's actors`);
  }
  regulationPeriods(tunables);

  const reading = readFoulRoll(judged.margin, dials.nearFoulMargin);
  if (reading === "CLEAN") return undefined;

  const chance = officialsChance(dials, tunables, game, situation, foul, reading === "FOUL" ? "SEES" : "PHANTOM");
  const target = officialsTarget(chance);
  const roll = rollD100(foulRng.fork("officials"), []);
  const margin = roll.total - target;
  return {
    reading,
    flagged: margin >= 0,
    chance,
    target,
    check: {
      checkKind: reading === "FOUL" ? "official_sees" : "phantom_flag",
      actors: [foul.player],
      roll,
      target,
      tier: tierFor(tunables, margin),
      margin,
      testsAttrs: [],
      rollRef: judged.roll.rngLabel,
    },
  };
}
