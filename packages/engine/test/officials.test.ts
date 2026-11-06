/**
 * ADR-093 step 1: the officials' tables, chances and judging roll (`src/officials/`), unit by unit,
 * with no game. Nothing in a game calls these rolls at step 1 (`officialsGame.test.ts` proves it);
 * these tests pin the arithmetic step 2 and the family steps will call.
 *
 * The bundle is the engine's default, taken by its rule-set name (`legacy`, the default's own
 * reference) so this file never names the ambient constant.
 */
import { describe, expect, it } from "vitest";
import { createRng, officiatingCrewId, playerId, teamId } from "@ff/contracts";
import type { CrewLeanFamily, FoulKind, GameKind, OfficiatingCrew, PlayerId, Rng, TeamId } from "@ff/contracts";
import { checkPayload } from "../src/events.js";
import type { CheckEmission } from "../src/events.js";
import { FOUL_VISIBILITY, SCRIMMAGE_FAMILY, foulFamily, readFoulRoll } from "../src/officials/fouls.js";
import type { FoulPhase, FoulVisibility } from "../src/officials/fouls.js";
import {
  LEAGUE_LEANS,
  OFFICIALS_DIALS,
  OfficialsError,
  crewFactor,
  crewOnRecord,
  judgeFoulRoll,
  letThemPlayFactor,
  officialsChance,
  officialsTarget,
  officiatingGameOf,
  roadFactor,
  wrongFlagChanceFor,
} from "../src/officials/officials.js";
import type { FoulRollJudgment, JudgedFoul, LetThemPlay, OfficialsDials, OfficialsRoll, OfficialsSituation, OfficiatingGame } from "../src/officials/officials.js";
import { tierFor } from "../src/rolls.js";
import { applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { RULE_SETS } from "./pocketTunables.js";

function ruleSet(name: string): Tunables {
  const found = RULE_SETS.find((r) => r.name === name);
  if (found === undefined) throw new Error(`no rule set named ${name}`);
  return found.tunables;
}
const legacy = ruleSet("legacy");

const HOME = teamId("t-home");
const AWAY = teamId("t-away");
const OFFENDER: PlayerId = playerId("p-offender");
const OTHER: PlayerId = playerId("p-other");

const FAMILIES: readonly CrewLeanFamily[] = ["LINE_HOLDING", "COVERAGE", "PLAYER_SAFETY", "TECHNICAL", "SNAP"];
const GAME_KINDS: readonly GameKind[] = ["PRESEASON", "REGULAR", "WILD_CARD", "DIVISIONAL", "CONFERENCE_FINAL", "CHAMPIONSHIP"];
const PHASES: readonly FoulPhase[] = ["SCRIMMAGE", "KICK"];

/** ADR-093 §6.1's families with A1's nine placements (§16), copied here so the module cannot grade itself. */
const PLACED_FAMILY: Readonly<Record<FoulKind, CrewLeanFamily>> = {
  FALSE_START: "SNAP", DEFENSIVE_OFFSIDE: "SNAP", NEUTRAL_ZONE_INFRACTION: "SNAP", ENCROACHMENT: "SNAP",
  OFFENSIVE_OFFSIDE: "SNAP", DEFENSIVE_DELAY_OF_GAME: "SNAP",
  DELAY_OF_GAME: "TECHNICAL", ILLEGAL_FORMATION: "TECHNICAL", ILLEGAL_SHIFT: "TECHNICAL", ILLEGAL_MOTION: "TECHNICAL",
  INELIGIBLE_DOWNFIELD_PASS: "TECHNICAL", OFFENSIVE_TOO_MANY_MEN_ON_FIELD: "TECHNICAL",
  DEFENSIVE_TOO_MANY_MEN_ON_FIELD: "TECHNICAL", INTENTIONAL_GROUNDING: "TECHNICAL", ILLEGAL_FORWARD_PASS: "TECHNICAL",
  OFFENSIVE_HOLDING: "LINE_HOLDING", ILLEGAL_USE_OF_HANDS: "LINE_HOLDING", CHOP_BLOCK: "LINE_HOLDING",
  CLIPPING: "LINE_HOLDING", ILLEGAL_BLOCK_ABOVE_THE_WAIST: "LINE_HOLDING",
  DEFENSIVE_PASS_INTERFERENCE: "COVERAGE", OFFENSIVE_PASS_INTERFERENCE: "COVERAGE", DEFENSIVE_HOLDING: "COVERAGE",
  ILLEGAL_CONTACT: "COVERAGE",
  ROUGHING_THE_PASSER: "PLAYER_SAFETY", UNNECESSARY_ROUGHNESS: "PLAYER_SAFETY", FACE_MASK: "PLAYER_SAFETY",
  HORSE_COLLAR_TACKLE: "PLAYER_SAFETY", UNSPORTSMANLIKE_CONDUCT: "PLAYER_SAFETY", TAUNTING: "PLAYER_SAFETY",
  TRIPPING: "PLAYER_SAFETY",
};

/** ADR-093 §5.2's visibility with A1's placements (§16). */
const PLACED_VISIBILITY: Readonly<Record<FoulKind, FoulVisibility>> = {
  FALSE_START: "PLAIN", DEFENSIVE_OFFSIDE: "PLAIN", NEUTRAL_ZONE_INFRACTION: "PLAIN", ENCROACHMENT: "PLAIN",
  OFFENSIVE_OFFSIDE: "PLAIN", DEFENSIVE_DELAY_OF_GAME: "PLAIN",
  DELAY_OF_GAME: "PLAIN", ILLEGAL_FORMATION: "PLAIN", ILLEGAL_SHIFT: "PLAIN", ILLEGAL_MOTION: "PLAIN",
  INELIGIBLE_DOWNFIELD_PASS: "CROWD", OFFENSIVE_TOO_MANY_MEN_ON_FIELD: "PLAIN", DEFENSIVE_TOO_MANY_MEN_ON_FIELD: "PLAIN",
  INTENTIONAL_GROUNDING: "PLAIN", ILLEGAL_FORWARD_PASS: "OPEN",
  OFFENSIVE_HOLDING: "CROWD", ILLEGAL_USE_OF_HANDS: "CROWD", CHOP_BLOCK: "CROWD", CLIPPING: "CROWD",
  ILLEGAL_BLOCK_ABOVE_THE_WAIST: "CROWD",
  DEFENSIVE_PASS_INTERFERENCE: "OPEN", OFFENSIVE_PASS_INTERFERENCE: "OPEN", DEFENSIVE_HOLDING: "CROWD",
  ILLEGAL_CONTACT: "CROWD",
  ROUGHING_THE_PASSER: "OPEN", UNNECESSARY_ROUGHNESS: "OPEN", FACE_MASK: "OPEN", HORSE_COLLAR_TACKLE: "OPEN",
  UNSPORTSMANLIKE_CONDUCT: "OPEN", TAUNTING: "OPEN", TRIPPING: "OPEN",
};

const KINDS = Object.keys(PLACED_FAMILY) as FoulKind[];

/** Table 1 (REAL): flags per 1,000 scrimmage snaps, 2022 to 2024; a kind under 30 flags is 0. */
const TABLE_1_RATE: Readonly<Record<FoulKind, number>> = {
  FALSE_START: 16.18, DEFENSIVE_OFFSIDE: 5.36, NEUTRAL_ZONE_INFRACTION: 2.3, ENCROACHMENT: 0.87,
  OFFENSIVE_OFFSIDE: 0.43, DEFENSIVE_DELAY_OF_GAME: 0,
  DELAY_OF_GAME: 4.26, ILLEGAL_FORMATION: 2.27, ILLEGAL_SHIFT: 1.68, ILLEGAL_MOTION: 0.34,
  INELIGIBLE_DOWNFIELD_PASS: 2.75, INTENTIONAL_GROUNDING: 1.21, DEFENSIVE_TOO_MANY_MEN_ON_FIELD: 1.26,
  OFFENSIVE_TOO_MANY_MEN_ON_FIELD: 0.33, ILLEGAL_FORWARD_PASS: 0,
  OFFENSIVE_HOLDING: 15.92, ILLEGAL_USE_OF_HANDS: 2.17, ILLEGAL_BLOCK_ABOVE_THE_WAIST: 0.6, CHOP_BLOCK: 0, CLIPPING: 0,
  DEFENSIVE_PASS_INTERFERENCE: 7.69, DEFENSIVE_HOLDING: 6.52, ILLEGAL_CONTACT: 2.62, OFFENSIVE_PASS_INTERFERENCE: 2.16,
  UNNECESSARY_ROUGHNESS: 4.12, ROUGHING_THE_PASSER: 2.58, FACE_MASK: 2.08, UNSPORTSMANLIKE_CONDUCT: 0.76,
  TAUNTING: 0.46, HORSE_COLLAR_TACKLE: 0.33, TRIPPING: 0,
};

/** Table 2 (REAL): each kind's crew SD as a share of its mean, three seasons pooled; null where Table 2 has no row. */
const TABLE_2_CREW_SD: Readonly<Record<FoulKind, number | null>> = {
  FALSE_START: 0.07, DEFENSIVE_OFFSIDE: 0.1, NEUTRAL_ZONE_INFRACTION: 0, ENCROACHMENT: 0,
  OFFENSIVE_OFFSIDE: null, DEFENSIVE_DELAY_OF_GAME: null,
  DELAY_OF_GAME: 0.16, ILLEGAL_FORMATION: 0.21, ILLEGAL_SHIFT: 0.36, ILLEGAL_MOTION: 0.59,
  INELIGIBLE_DOWNFIELD_PASS: 0, INTENTIONAL_GROUNDING: 0, DEFENSIVE_TOO_MANY_MEN_ON_FIELD: null,
  OFFENSIVE_TOO_MANY_MEN_ON_FIELD: null, ILLEGAL_FORWARD_PASS: null,
  OFFENSIVE_HOLDING: 0.13, ILLEGAL_USE_OF_HANDS: 0.17, ILLEGAL_BLOCK_ABOVE_THE_WAIST: 0, CHOP_BLOCK: null, CLIPPING: null,
  DEFENSIVE_PASS_INTERFERENCE: 0.04, DEFENSIVE_HOLDING: 0.15, ILLEGAL_CONTACT: 0.2, OFFENSIVE_PASS_INTERFERENCE: 0.34,
  UNNECESSARY_ROUGHNESS: 0.22, ROUGHING_THE_PASSER: 0.24, FACE_MASK: 0.19, UNSPORTSMANLIKE_CONDUCT: 0.07,
  TAUNTING: 0.34, HORSE_COLLAR_TACKLE: null, TRIPPING: null,
};

const COVERAGE_ROAD_KINDS: readonly FoulKind[] = ["DEFENSIVE_PASS_INTERFERENCE", "DEFENSIVE_HOLDING", "ILLEGAL_CONTACT"];

const leansAt = (lean: number): Record<CrewLeanFamily, number> => ({
  LINE_HOLDING: lean, COVERAGE: lean, PLAYER_SAFETY: lean, TECHNICAL: lean, SNAP: lean,
});

const gameWith = (leans: Readonly<Record<CrewLeanFamily, number>>, over: Partial<OfficiatingGame> = {}): OfficiatingGame => ({
  leans, kind: "REGULAR", neutralSite: false, home: HOME, ...over,
});

const FIRST_QUARTER: OfficialsSituation = { period: 1, offenseScore: 0, defenseScore: 0 };

const foulOf = (kind: FoulKind, over: Partial<JudgedFoul> = {}): JudgedFoul => ({
  kind, phase: "SCRIMMAGE", player: OFFENDER, team: HOME, ...over,
});

/** A stub generator: its d100, and every fork's, deals the next face; any other draw is refused. Every draw is counted. */
interface Dealer {
  readonly faces: number[];
  draws: number;
}
function stubRng(label: string, dealer: Dealer): Rng {
  const refuse = (): never => {
    dealer.draws += 1;
    throw new Error("the officials draw only a d100");
  };
  const rng: Rng = {
    next: refuse,
    int: refuse,
    d20: refuse,
    pick: refuse,
    d100: () => {
      dealer.draws += 1;
      const face = dealer.faces.shift();
      if (face === undefined) throw new Error(`the stub at ${label} has no face left`);
      return face;
    },
    fork: (child: string) => stubRng(`${label}/${child}`, dealer),
    seed: "stub",
    label,
  };
  return rng;
}

/** The `penalty_check` a foul roll writes, drawn on `rng`, with the given margin. */
function penaltyCheck(rng: Rng, margin: number, actors: readonly PlayerId[] = [OFFENDER]): CheckEmission {
  return {
    checkKind: "penalty_check",
    actors,
    roll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: rng.label },
    target: 50 - margin,
    tier: tierFor(legacy, margin),
    margin,
    testsAttrs: [],
  };
}

const FOUL_LABEL = "game:g1/call:12/stem/offside:p-offender";

/** One judgment of a foul roll (margin −5, a foul) or a near-foul (margin 5), with a stub die of `face`. */
function judgeWithFace(
  face: number,
  over: { dials?: OfficialsDials; game?: OfficiatingGame; foul?: JudgedFoul; margin?: number } = {},
) {
  const dealer: Dealer = { faces: [face], draws: 0 };
  const foulRng = stubRng(FOUL_LABEL, dealer);
  const judgment = judgeFoulRoll({
    dials: over.dials ?? OFFICIALS_DIALS,
    tunables: legacy,
    game: over.game ?? gameWith(LEAGUE_LEANS),
    situation: FIRST_QUARTER,
    foul: over.foul ?? foulOf("OFFENSIVE_HOLDING"),
    judged: penaltyCheck(foulRng, over.margin ?? -5),
    foulRng,
  });
  return { judgment, dealer };
}

/** Injected dials whose seen chance is `chance` for every visibility, under a cap of 1. */
const seenAt = (chance: number): OfficialsDials => ({
  ...OFFICIALS_DIALS,
  seenCap: 1,
  seen: { PLAIN: chance, OPEN: chance, CROWD: chance },
});

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

function everyNestedObjectIsFrozen(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return true;
  return Object.isFrozen(value) && Object.values(value).every(everyNestedObjectIsFrozen);
}

describe("ADR-093 step 1: the fouls' families and visibility", () => {
  it("every foul kind has one family on a scrimmage snap, as ADR-093 places it", () => {
    expect(KINDS).toHaveLength(31);
    expect(SCRIMMAGE_FAMILY).toEqual(PLACED_FAMILY);
    expect(Object.isFrozen(SCRIMMAGE_FAMILY)).toBe(true);
    const counts = Object.fromEntries(FAMILIES.map((f) => [f, KINDS.filter((k) => SCRIMMAGE_FAMILY[k] === f).length]));
    expect(counts).toEqual({ SNAP: 6, TECHNICAL: 9, LINE_HOLDING: 5, COVERAGE: 4, PLAYER_SAFETY: 7 });
    for (const kind of KINDS) expect(foulFamily(kind, "SCRIMMAGE")).toBe(PLACED_FAMILY[kind]);
    // A1: illegal use of hands is line holding whichever side commits it, so no row depends on the side.
    expect(foulFamily("ILLEGAL_USE_OF_HANDS", "SCRIMMAGE")).toBe("LINE_HOLDING");
  });

  it("every foul on a kick is KICKS and takes no lean, and at step 1 no home-and-road factor", () => {
    // A wrong-flag chance filed for every kind, so a near-foul on a kick is checked beside a foul.
    const wrongFlagChance: Partial<Record<FoulKind, number>> = {};
    for (const kind of KINDS) wrongFlagChance[kind] = 0.04;
    const filed: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance };
    const sites: readonly (readonly [string, Partial<OfficiatingGame>])[] = [
      ["a home field", {}],
      ["a neutral site", { neutralSite: true }],
    ];
    for (const kind of KINDS) {
      expect(foulFamily(kind, "KICK")).toBe("KICKS");
      expect(crewFactor(OFFICIALS_DIALS, kind, "KICK", leansAt(0))).toBe(1);
      expect(crewFactor(OFFICIALS_DIALS, kind, "KICK", leansAt(100))).toBe(1);
      // Nor does a kick take a home-and-road factor at step 1 (A8: Table 7 counts scrimmage snaps
      // only; step 8, the kicks step, decides). So at a home field as at a neutral site, the loosest
      // and the strictest crew see a foul on a kick alike, at its kind's own visibility, whichever
      // defense commits it, and a near-foul on a kick keeps its filed wrong-flag chance.
      const seen = OFFICIALS_DIALS.seen[PLACED_VISIBILITY[kind]];
      for (const [site, over] of sites) {
        for (const team of [HOME, AWAY]) {
          const onAKick = foulOf(kind, { phase: "KICK", team });
          for (const lean of [0, 100]) {
            const game = gameWith(leansAt(lean), over);
            const where = `${kind} on a kick by ${String(team)} at ${site}, lean ${String(lean)}`;
            expect(roadFactor(OFFICIALS_DIALS, game, onAKick), where).toBe(1);
            expect(officialsChance(OFFICIALS_DIALS, legacy, game, FIRST_QUARTER, onAKick, "SEES"), where).toBe(seen);
            expect(officialsChance(filed, legacy, game, FIRST_QUARTER, onAKick, "PHANTOM"), where).toBe(0.04);
          }
        }
      }
    }
    // So at a home field with no crew, a DPI on a kick is seen at its class's 0.8 by the home and the
    // road defense alike, not at a snap's 0.747664 and 0.852336 ("no crew calls the game at the
    // league's average" pins those), and a DH or IC on a kick at the crowd's 2 in 3. The same three
    // fouls on a snap at that field do take Q5, on both chances.
    const atHome = gameWith(LEAGUE_LEANS);
    const chanceAtHome = (dials: OfficialsDials, kind: FoulKind, phase: FoulPhase, team: TeamId, roll: OfficialsRoll): number =>
      officialsChance(dials, legacy, atHome, FIRST_QUARTER, foulOf(kind, { phase, team }), roll);
    for (const team of [HOME, AWAY]) {
      expect(chanceAtHome(OFFICIALS_DIALS, "DEFENSIVE_PASS_INTERFERENCE", "KICK", team, "SEES")).toBe(0.8);
      expect(chanceAtHome(OFFICIALS_DIALS, "DEFENSIVE_HOLDING", "KICK", team, "SEES")).toBe(2 / 3);
      expect(chanceAtHome(OFFICIALS_DIALS, "ILLEGAL_CONTACT", "KICK", team, "SEES")).toBe(2 / 3);
      for (const kind of COVERAGE_ROAD_KINDS) {
        expect(chanceAtHome(filed, kind, "KICK", team, "PHANTOM"), kind).toBe(0.04);
        expect(chanceAtHome(OFFICIALS_DIALS, kind, "SCRIMMAGE", team, "SEES"), kind).not.toBe(OFFICIALS_DIALS.seen[PLACED_VISIBILITY[kind]]);
        expect(chanceAtHome(filed, kind, "SCRIMMAGE", team, "PHANTOM"), kind).not.toBe(0.04);
      }
    }
  });

  it("visibility follows §5.2 as amended", () => {
    expect(FOUL_VISIBILITY).toEqual(PLACED_VISIBILITY);
    expect(Object.isFrozen(FOUL_VISIBILITY)).toBe(true);
    const count = (v: FoulVisibility): number => KINDS.filter((k) => FOUL_VISIBILITY[k] === v).length;
    expect([count("PLAIN"), count("OPEN"), count("CROWD")]).toEqual([13, 10, 8]);
    expect(FOUL_VISIBILITY.TRIPPING).toBe("OPEN");
  });

  it("the foul roll reads at its edges", () => {
    const near = OFFICIALS_DIALS.nearFoulMargin;
    expect(near).toBe(10);
    expect(readFoulRoll(-100, near)).toBe("FOUL");
    expect(readFoulRoll(-1, near)).toBe("FOUL");
    expect(readFoulRoll(0, near)).toBe("NEAR_FOUL");
    expect(readFoulRoll(10, near)).toBe("NEAR_FOUL");
    expect(readFoulRoll(11, near)).toBe("CLEAN");
    // A2's 11 faces: margins 0 to 10.
    const nearFaces = Array.from({ length: 41 }, (_, i) => i - 20).filter((m) => readFoulRoll(m, near) === "NEAR_FOUL");
    expect(nearFaces).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("ADR-093 step 1: chances and d100 targets", () => {
  it("chances become d100 targets", () => {
    expect(officialsTarget(0.95)).toBe(6);
    expect(officialsTarget(0.8)).toBe(21);
    expect(officialsTarget(2 / 3)).toBe(34);
    expect(officialsTarget(0.99)).toBe(2);
    // The line is 0.995, the chance that would round to target 1. These bracket it from both sides;
    // 0.995 itself, a floating-point edge, is not probed.
    expect(officialsTarget(0.994)).toBe(2);
    expect(officialsTarget(0.9949)).toBe(2);
    expect(() => officialsTarget(0.9951)).toThrow(/target 1, a certain flag/);
    expect(officialsTarget(0.0019)).toBe(101);
    expect(officialsTarget(0)).toBe(101);
    expect(() => officialsTarget(0.996)).toThrow(OfficialsError);
    expect(() => officialsTarget(1)).toThrow(OfficialsError);
    expect(() => officialsTarget(1)).toThrow(/target 1, a certain flag/);

    // Swept through the officials' own roll: PLAIN, OPEN and CROWD at the league, and a plain foul at the cap.
    const strictSnap = gameWith({ ...LEAGUE_LEANS, SNAP: 100 });
    const cases: readonly { foul: JudgedFoul; game: OfficiatingGame; made: number }[] = [
      { foul: foulOf("FALSE_START"), game: gameWith(LEAGUE_LEANS), made: 95 },
      { foul: foulOf("ROUGHING_THE_PASSER"), game: gameWith(LEAGUE_LEANS), made: 80 },
      { foul: foulOf("OFFENSIVE_HOLDING"), game: gameWith(LEAGUE_LEANS), made: 67 },
      { foul: foulOf("OFFENSIVE_OFFSIDE"), game: strictSnap, made: 99 },
    ];
    for (const { foul, game, made } of cases) {
      let flagged = 0;
      for (let face = 1; face <= 100; face++) {
        if (judgeWithFace(face, { foul, game }).judgment?.flagged === true) flagged += 1;
      }
      expect(flagged, foul.kind).toBe(made);
    }
  });

  it("a lean of 50 is the league: every kind's crew factor is exactly 1", () => {
    expect(LEAGUE_LEANS).toEqual(leansAt(OFFICIALS_DIALS.leanCenter));
    for (const kind of KINDS) expect(crewFactor(OFFICIALS_DIALS, kind, "SCRIMMAGE", LEAGUE_LEANS)).toBe(1);
  });

  it("a weight-1 kind is called at lean ÷ 50", () => {
    for (const kind of ["OFFENSIVE_OFFSIDE", "CHOP_BLOCK", "HORSE_COLLAR_TACKLE"] as const) {
      expect(OFFICIALS_DIALS.crewWeight[kind]).toBe(1);
      expect(crewFactor(OFFICIALS_DIALS, kind, "SCRIMMAGE", leansAt(30))).toBeCloseTo(0.6, 12);
      expect(crewFactor(OFFICIALS_DIALS, kind, "SCRIMMAGE", leansAt(65))).toBeCloseTo(1.3, 12);
    }
  });

  it("the crew factor is 1 + w(L − 50)/50, never under 0.20", () => {
    expect(crewFactor(OFFICIALS_DIALS, "ILLEGAL_MOTION", "SCRIMMAGE", leansAt(30))).toBe(0.2);
    expect(1 - 3.759 * 0.4).toBeLessThan(0.2);
    expect(crewFactor(OFFICIALS_DIALS, "OFFENSIVE_HOLDING", "SCRIMMAGE", leansAt(65))).toBeCloseTo(1.2988, 12);
    // Each kind reads its own family's lean and no other.
    const holdingOnly = { ...LEAGUE_LEANS, LINE_HOLDING: 65 };
    expect(crewFactor(OFFICIALS_DIALS, "OFFENSIVE_HOLDING", "SCRIMMAGE", holdingOnly)).toBeCloseTo(1.2988, 12);
    expect(crewFactor(OFFICIALS_DIALS, "DEFENSIVE_HOLDING", "SCRIMMAGE", holdingOnly)).toBe(1);
  });

  it("each family's weights average to 1 over Table 1's rates", () => {
    for (const family of FAMILIES) {
      const kinds = KINDS.filter((k) => SCRIMMAGE_FAMILY[k] === family);
      const rates = kinds.reduce((sum, k) => sum + TABLE_1_RATE[k], 0);
      const weighted = kinds.reduce((sum, k) => sum + TABLE_1_RATE[k] * OFFICIALS_DIALS.crewWeight[k], 0);
      expect(Math.abs(weighted / rates - 1), family).toBeLessThan(0.005);
    }
  });

  it("the weights are Table 2 over the family composite", () => {
    const w = OFFICIALS_DIALS.crewWeight;
    expect(w.OFFENSIVE_HOLDING).toBe(0.996);
    expect(w.DEFENSIVE_PASS_INTERFERENCE).toBe(0.299);
    expect(w.OFFENSIVE_PASS_INTERFERENCE).toBe(2.538);
    expect(w.FALSE_START).toBe(1.037);
    expect(w.INTENTIONAL_GROUNDING).toBe(0);
    expect(w.ILLEGAL_BLOCK_ABOVE_THE_WAIST).toBe(0);
    // Every weight, recomputed: a kind's Table 2 SD over its family's rate-weighted composite over
    // the kinds with a row, to 3 places; 1 for a kind with no row.
    for (const kind of KINDS) {
      const sd = TABLE_2_CREW_SD[kind];
      if (sd === null) {
        expect(w[kind], kind).toBe(1);
        continue;
      }
      const rowed = KINDS.filter((k) => SCRIMMAGE_FAMILY[k] === SCRIMMAGE_FAMILY[kind] && TABLE_2_CREW_SD[k] !== null);
      const rate = rowed.reduce((sum, k) => sum + TABLE_1_RATE[k], 0);
      const composite = rowed.reduce((sum, k) => sum + TABLE_1_RATE[k] * (TABLE_2_CREW_SD[k] ?? 0), 0) / rate;
      expect(w[kind], kind).toBe(Math.round((sd / composite) * 1000) / 1000);
    }
  });

  it("the seen chance is capped at 0.99, and nothing moves to the wrong-flag side", () => {
    const strict = gameWith(leansAt(100));
    const offside = foulOf("OFFENSIVE_OFFSIDE");
    expect(crewFactor(OFFICIALS_DIALS, "OFFENSIVE_OFFSIDE", "SCRIMMAGE", strict.leans)).toBe(2);
    const seen = officialsChance(OFFICIALS_DIALS, legacy, strict, FIRST_QUARTER, offside, "SEES");
    expect(seen).toBe(0.99);
    expect(officialsTarget(seen)).toBe(2);
    const filed: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { OFFENSIVE_OFFSIDE: 0.02 } };
    expect(officialsChance(filed, legacy, strict, FIRST_QUARTER, offside, "PHANTOM")).toBe(0.04);
    // The wrong-flag chance is capped only at 1, never at the seen chance's 0.99 (A3, A9). A chance of
    // 0.993 gives target 2 under either cap, so the chance itself is what is checked; a product
    // above 1 is held at 1.
    const nearTheTop: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { OFFENSIVE_OFFSIDE: 0.4965 } };
    expect(officialsChance(nearTheTop, legacy, strict, FIRST_QUARTER, offside, "PHANTOM")).toBe(0.993);
    const overTheTop: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { OFFENSIVE_OFFSIDE: 0.6 } };
    expect(officialsChance(overTheTop, legacy, strict, FIRST_QUARTER, offside, "PHANTOM")).toBe(1);

    // The cap is taken over the whole product, the situation's factors included (A3: min(0.99,
    // class × M × Q4 × Q5)), never before Q4 or Q5 is applied. Q5 first: the road defense's illegal
    // contact is under the cap at COVERAGE lean 60 and at it from 61, the threshold behind A8's 11.3%
    // of road crews whose illegal-contact chance reaches the ceiling.
    const coverageAt = (lean: number): OfficiatingGame => gameWith({ ...LEAGUE_LEANS, COVERAGE: lean });
    const contactBy = (team: TeamId): JudgedFoul => foulOf("ILLEGAL_CONTACT", { team });
    expect(officialsChance(OFFICIALS_DIALS, legacy, coverageAt(60), FIRST_QUARTER, contactBy(AWAY), "SEES")).toBeCloseTo(0.975368, 6);
    const roadAt61 = officialsChance(OFFICIALS_DIALS, legacy, coverageAt(61), FIRST_QUARTER, contactBy(AWAY), "SEES");
    expect(roadAt61).toBe(0.99);
    expect(officialsTarget(roadAt61)).toBe(2);
    // At COVERAGE 100 the home and the road defense both sit at the cap, though Q5 splits them below it.
    for (const team of [HOME, AWAY]) {
      const atTheTop = officialsChance(OFFICIALS_DIALS, legacy, coverageAt(100), FIRST_QUARTER, contactBy(team), "SEES");
      expect(atTheTop, String(team)).toBe(0.99);
      expect(officialsTarget(atTheTop), String(team)).toBe(2);
    }
    // Q4: under injected dials whose COVERAGE late-and-close factor is Table 4's all-flags 0.84 (REAL,
    // A7), offensive pass interference at COVERAGE 100, in the fourth quarter with a tie, is still at
    // the cap.
    const lateAndClose: OfficialsDials = {
      ...OFFICIALS_DIALS,
      letThemPlay: { ...OFFICIALS_DIALS.letThemPlay, COVERAGE: { ...OFFICIALS_DIALS.letThemPlay.COVERAGE, lateAndClose: 0.84 } },
    };
    const lateAndTied: OfficialsSituation = { period: 4, offenseScore: 17, defenseScore: 17 };
    expect(letThemPlayFactor(lateAndClose, legacy, coverageAt(100), lateAndTied, "OFFENSIVE_PASS_INTERFERENCE", "SCRIMMAGE")).toBe(0.84);
    expect(officialsChance(lateAndClose, legacy, coverageAt(100), lateAndTied, foulOf("OFFENSIVE_PASS_INTERFERENCE"), "SEES")).toBe(0.99);
    // The wrong-flag chance's cap at 1 is taken over the whole product too: a filed illegal-contact
    // chance of 0.4 is 0.9972 at COVERAGE 100 before Q5, and above 1 once the road defense's factor is in.
    const filedContact: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { ILLEGAL_CONTACT: 0.4 } };
    expect(officialsChance(filedContact, legacy, coverageAt(100), FIRST_QUARTER, contactBy(AWAY), "PHANTOM")).toBe(1);
    // Nor is it taken twice (A3: min(1, p × M × Q4 × Q5)). A filed illegal-contact chance of 0.5 is
    // 1.2465 at COVERAGE 100 before Q5, and still above 1 after the home defense's factor of 2 ÷ 2.29;
    // capped before Q5, with or without a second cap at the end, it would be 0.873362.
    const filedContactHigher: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { ILLEGAL_CONTACT: 0.5 } };
    expect(officialsChance(filedContactHigher, legacy, coverageAt(100), FIRST_QUARTER, contactBy(HOME), "PHANTOM")).toBe(1);
    // Q4 as well: a filed offensive pass interference chance of 0.4 is 1.4152 at COVERAGE 100 before Q4,
    // and 1.188768 under the late-and-close factor of 0.84 (the kind takes no Q5); capped before Q4,
    // with or without a second cap at the end, it would be 0.84.
    const filedInterference: OfficialsDials = { ...lateAndClose, wrongFlagChance: { OFFENSIVE_PASS_INTERFERENCE: 0.4 } };
    expect(officialsChance(filedInterference, legacy, coverageAt(100), lateAndTied, foulOf("OFFENSIVE_PASS_INTERFERENCE"), "PHANTOM")).toBe(1);
  });

  it("no crew calls the game at the league's average", () => {
    const game = officiatingGameOf({}, HOME);
    expect(game).toEqual({ leans: leansAt(50), kind: "REGULAR", neutralSite: false, home: HOME });
    // Q5's split at lean 50 (A8), and the d100 targets it gives: the class value's target is 21 for
    // DPI, and 34 for DH and IC.
    const split: Readonly<Record<string, { home: number; road: number; homeTarget: number; roadTarget: number; r: number }>> = {
      DEFENSIVE_PASS_INTERFERENCE: { home: 0.747664, road: 0.852336, homeTarget: 26, roadTarget: 16, r: 1.14 },
      DEFENSIVE_HOLDING: { home: 0.631912, road: 0.701422, homeTarget: 38, roadTarget: 31, r: 1.11 },
      ILLEGAL_CONTACT: { home: 0.582242, road: 0.751092, homeTarget: 43, roadTarget: 26, r: 1.29 },
    };
    expect(Object.keys(split)).toEqual(COVERAGE_ROAD_KINDS);
    for (const kind of KINDS) {
      const seen = OFFICIALS_DIALS.seen[PLACED_VISIBILITY[kind]];
      const atHome = officialsChance(OFFICIALS_DIALS, legacy, game, FIRST_QUARTER, foulOf(kind, { team: HOME }), "SEES");
      const onTheRoad = officialsChance(OFFICIALS_DIALS, legacy, game, FIRST_QUARTER, foulOf(kind, { team: AWAY }), "SEES");
      const q5 = split[kind];
      if (q5 === undefined) {
        expect(atHome, kind).toBe(seen);
        expect(onTheRoad, kind).toBe(seen);
        continue;
      }
      // The home defense is seen below its class value and the road defense above it, r apart; the
      // pair averages the class value, so the league's rate stays as ruled.
      expect(atHome, kind).toBeCloseTo(q5.home, 6);
      expect(onTheRoad, kind).toBeCloseTo(q5.road, 6);
      expect(officialsTarget(atHome), kind).toBe(q5.homeTarget);
      expect(officialsTarget(onTheRoad), kind).toBe(q5.roadTarget);
      expect(onTheRoad / atHome, kind).toBeCloseTo(q5.r, 12);
      expect((atHome + onTheRoad) / 2, kind).toBeCloseTo(seen, 12);
    }
    // Q5 moves the wrong-flag chance alike: a DPI wrong-flag chance filed at 0.04.
    const filed: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { DEFENSIVE_PASS_INTERFERENCE: 0.04 } };
    const wrongFlagOnDpi = (team: TeamId, at: OfficiatingGame): number =>
      officialsChance(filed, legacy, at, FIRST_QUARTER, foulOf("DEFENSIVE_PASS_INTERFERENCE", { team }), "PHANTOM");
    expect(wrongFlagOnDpi(HOME, game)).toBeCloseTo(0.0373832, 7);
    expect(wrongFlagOnDpi(AWAY, game)).toBeCloseTo(0.0426168, 7);
    // The schedule's kind and site are the game's when given; at a neutral site every chance is its class value.
    const final = officiatingGameOf({ scheduled: { kind: "CHAMPIONSHIP", neutralSite: true } }, HOME);
    expect(final).toEqual({ leans: leansAt(50), kind: "CHAMPIONSHIP", neutralSite: true, home: HOME });
    for (const kind of KINDS) {
      const seen = OFFICIALS_DIALS.seen[PLACED_VISIBILITY[kind]];
      expect(officialsChance(OFFICIALS_DIALS, legacy, final, FIRST_QUARTER, foulOf(kind, { team: AWAY }), "SEES")).toBe(seen);
    }
    for (const team of [HOME, AWAY]) expect(wrongFlagOnDpi(team, final)).toBe(0.04);
    // The site is the schedule's own field, never read off the kind of game.
    expect(officiatingGameOf({ scheduled: { kind: "WILD_CARD", neutralSite: true } }, HOME)).toEqual({
      leans: leansAt(50), kind: "WILD_CARD", neutralSite: true, home: HOME,
    });
    expect(officiatingGameOf({ scheduled: { kind: "CHAMPIONSHIP", neutralSite: false } }, HOME)).toEqual({
      leans: leansAt(50), kind: "CHAMPIONSHIP", neutralSite: false, home: HOME,
    });
    // A crew's leans come through checked, in family order.
    const crew: OfficiatingCrew = {
      id: officiatingCrewId("crew-03"),
      referee: "A. Stand-In",
      leans: { SNAP: 51, TECHNICAL: 52, PLAYER_SAFETY: 53, COVERAGE: 54, LINE_HOLDING: 55 },
    };
    const worked = officiatingGameOf({ crew }, HOME);
    expect(Object.keys(worked.leans)).toEqual(FAMILIES);
    expect(worked.leans).toEqual(crew.leans);
    expect(() => officiatingGameOf({ crew: { ...crew, leans: { ...crew.leans, SNAP: 101 } } }, HOME)).toThrow(OfficialsError);
  });
});

describe("ADR-093 step 1: the situation (Q4, Q5)", () => {
  it("the road lean lifts the road defense on DPI, DH and IC only, never at a neutral site", () => {
    const game = gameWith(LEAGUE_LEANS);
    const expected: Readonly<Record<string, readonly [number, number]>> = {
      DEFENSIVE_PASS_INTERFERENCE: [0.9346, 1.0654],
      DEFENSIVE_HOLDING: [0.9479, 1.0521],
      ILLEGAL_CONTACT: [0.8734, 1.1266],
    };
    for (const kind of COVERAGE_ROAD_KINDS) {
      const atHome = roadFactor(OFFICIALS_DIALS, game, foulOf(kind, { team: HOME }));
      const onTheRoad = roadFactor(OFFICIALS_DIALS, game, foulOf(kind, { team: AWAY }));
      const [home, road] = expected[kind] ?? [Number.NaN, Number.NaN];
      expect(atHome, kind).toBeCloseTo(home, 4);
      expect(onTheRoad, kind).toBeCloseTo(road, 4);
      expect(onTheRoad).toBeGreaterThan(1);
      expect(atHome).toBeLessThan(1);
      expect((atHome + onTheRoad) / 2, kind).toBe(1);
    }
    for (const kind of ["OFFENSIVE_HOLDING", "ILLEGAL_USE_OF_HANDS"] as const) {
      expect(roadFactor(OFFICIALS_DIALS, game, foulOf(kind, { team: HOME }))).toBe(1);
      expect(roadFactor(OFFICIALS_DIALS, game, foulOf(kind, { team: AWAY }))).toBe(1);
    }
    for (const kind of KINDS) {
      if (COVERAGE_ROAD_KINDS.includes(kind)) continue;
      expect(roadFactor(OFFICIALS_DIALS, game, foulOf(kind, { team: AWAY })), kind).toBe(1);
    }
    const neutral = gameWith(LEAGUE_LEANS, { neutralSite: true });
    for (const kind of KINDS) {
      for (const team of [HOME, AWAY]) expect(roadFactor(OFFICIALS_DIALS, neutral, foulOf(kind, { team }))).toBe(1);
    }
  });

  it("let them play moves judgment calls only: the arc, overtime, late and close, the playoffs, on both chances", () => {
    const moving: LetThemPlay = { arc: [1, 1.1, 1.2, 0.9], overtime: 0.95, lateAndClose: 0.8, playoffs: 0.85 };
    const dials: OfficialsDials = {
      ...OFFICIALS_DIALS,
      letThemPlay: { LINE_HOLDING: moving, COVERAGE: moving, PLAYER_SAFETY: moving, TECHNICAL: moving, SNAP: moving },
    };
    const regular = gameWith(LEAGUE_LEANS);
    const at = (period: number, gap: number): OfficialsSituation => ({ period, offenseScore: 20 + gap, defenseScore: 20 });
    const factor = (kind: FoulKind, situation: OfficialsSituation, game: OfficiatingGame = regular): number =>
      letThemPlayFactor(dials, legacy, game, situation, kind, "SCRIMMAGE");

    // OPEN and CROWD kinds move; PLAIN kinds do not.
    for (const kind of KINDS) {
      const moved = factor(kind, at(4, 0));
      if (PLACED_VISIBILITY[kind] === "PLAIN") expect(moved, kind).toBe(1);
      else expect(moved, kind).toBeCloseTo(0.9 * 0.8, 12);
    }
    // Late and close: the fourth quarter or later, within 8 points either way.
    expect(factor("OFFENSIVE_HOLDING", at(3, 0))).toBeCloseTo(1.2, 12);
    expect(factor("OFFENSIVE_HOLDING", at(4, 8))).toBeCloseTo(0.9 * 0.8, 12);
    expect(factor("OFFENSIVE_HOLDING", at(4, -8))).toBeCloseTo(0.9 * 0.8, 12);
    expect(factor("OFFENSIVE_HOLDING", at(4, -9))).toBeCloseTo(0.9, 12);
    expect(factor("OFFENSIVE_HOLDING", at(5, -20))).toBeCloseTo(0.95, 12);
    expect(factor("OFFENSIVE_HOLDING", at(4, 9))).toBeCloseTo(0.9, 12);
    expect(factor("OFFENSIVE_HOLDING", at(5, 8))).toBeCloseTo(0.95 * 0.8, 12);
    expect(factor("OFFENSIVE_HOLDING", at(5, 9))).toBeCloseTo(0.95, 12);
    expect(factor("OFFENSIVE_HOLDING", at(1, 0))).toBe(1);
    expect(factor("OFFENSIVE_HOLDING", at(2, 0))).toBeCloseTo(1.1, 12);
    // The playoffs: PRESEASON and REGULAR are not; WILD_CARD through CHAMPIONSHIP are.
    for (const kind of GAME_KINDS) {
      const inThePlayoffs = kind !== "PRESEASON" && kind !== "REGULAR";
      expect(factor("DEFENSIVE_HOLDING", at(1, 20), gameWith(LEAGUE_LEANS, { kind })), kind).toBeCloseTo(inThePlayoffs ? 0.85 : 1, 12);
    }
    // A kick takes no factor at step 1, whatever its visibility.
    expect(letThemPlayFactor(dials, legacy, regular, at(4, 0), "OFFENSIVE_HOLDING", "KICK")).toBe(1);
    // SEES and PHANTOM move alike.
    const filed: OfficialsDials = { ...dials, wrongFlagChance: { OFFENSIVE_HOLDING: 0.03, ROUGHING_THE_PASSER: 0.04 } };
    for (const kind of ["OFFENSIVE_HOLDING", "ROUGHING_THE_PASSER"] as const) {
      for (const situation of [at(1, 0), at(3, 0), at(4, 8), at(5, 3)]) {
        const game = gameWith(LEAGUE_LEANS, { kind: "DIVISIONAL" });
        const f = factor(kind, situation, game);
        const sees = officialsChance(filed, legacy, game, situation, foulOf(kind), "SEES");
        const phantom = officialsChance(filed, legacy, game, situation, foulOf(kind), "PHANTOM");
        expect(sees / OFFICIALS_DIALS.seen[PLACED_VISIBILITY[kind]]).toBeCloseTo(f, 12);
        expect(phantom / (filed.wrongFlagChance[kind] ?? Number.NaN)).toBeCloseTo(f, 12);
      }
    }
    // Through the chances too, a kick takes no let-them-play factor at step 1 (A7), and no home-and-road
    // factor (A8). Late and close, where a foul on a snap would take 0.9 × 0.8 (and × 0.85 in a playoff
    // game), a foul on a kick is still seen at its kind's class value, by the home and the road defense
    // alike, and a near-foul on a kick keeps its filed wrong-flag chance.
    const divisional = gameWith(LEAGUE_LEANS, { kind: "DIVISIONAL" });
    const onAKick = (kind: FoulKind, team: TeamId = HOME): JudgedFoul => foulOf(kind, { phase: "KICK", team });
    expect(officialsChance(dials, legacy, regular, at(4, 0), onAKick("OFFENSIVE_HOLDING"), "SEES")).toBe(2 / 3);
    expect(officialsChance(dials, legacy, divisional, at(4, 0), onAKick("ROUGHING_THE_PASSER"), "SEES")).toBe(0.8);
    expect(officialsChance(filed, legacy, divisional, at(4, 0), onAKick("OFFENSIVE_HOLDING"), "PHANTOM")).toBe(0.03);
    expect(officialsChance(filed, legacy, divisional, at(4, 0), onAKick("ROUGHING_THE_PASSER"), "PHANTOM")).toBe(0.04);
    for (const kind of KINDS) {
      if (PLACED_VISIBILITY[kind] === "PLAIN") continue;
      for (const team of [HOME, AWAY]) {
        const seen = officialsChance(dials, legacy, divisional, at(4, 0), onAKick(kind, team), "SEES");
        expect(seen, `${kind} on a kick by ${String(team)}`).toBe(OFFICIALS_DIALS.seen[PLACED_VISIBILITY[kind]]);
      }
    }
  });

  it("at step 1 every let-them-play factor is 1", () => {
    let calls = 0;
    for (let period = 1; period <= 6; period++) {
      for (let gap = 0; gap <= 20; gap++) {
        for (const kind of GAME_KINDS) {
          const game = gameWith(LEAGUE_LEANS, { kind });
          const situation: OfficialsSituation = { period, offenseScore: gap, defenseScore: 0 };
          for (const foul of KINDS) {
            for (const phase of PHASES) {
              expect(letThemPlayFactor(OFFICIALS_DIALS, legacy, game, situation, foul, phase)).toBe(1);
              calls += 1;
            }
          }
        }
      }
    }
    expect(calls).toBe(6 * 21 * 6 * 31 * 2);
  });
});

describe("ADR-093 step 1: the officials' roll", () => {
  it("the officials' CHECK has the contract's shape and names the roll it judges", () => {
    const foulRng = createRng("officials-shape", FOUL_LABEL);
    const judged = penaltyCheck(foulRng, -3);
    const judgment = judgeFoulRoll({
      dials: OFFICIALS_DIALS, tunables: legacy, game: gameWith(LEAGUE_LEANS), situation: FIRST_QUARTER,
      foul: foulOf("OFFENSIVE_HOLDING"), judged, foulRng,
    });
    if (judgment === undefined) throw new Error("a foul is judged");
    const payload = checkPayload(judgment.check);
    expect(Object.keys(payload)).toEqual(["checkKind", "actors", "roll", "tier", "margin", "testsAttrs", "target", "rollRef"]);
    expect(payload.checkKind).toBe("official_sees");
    expect(payload.actors).toEqual([OFFENDER]);
    expect(payload.testsAttrs).toEqual([]);
    expect("band" in payload).toBe(false);
    expect("opposedRoll" in payload).toBe(false);
    expect(payload.rollRef).toBe(judged.roll.rngLabel);
    expect(payload.roll?.rngLabel).toBe(`${judged.roll.rngLabel}/officials`);
    expect(payload.roll?.modifiers).toEqual([]);
    expect(payload.target).toBe(34);
    expect(payload.margin).toBe((payload.roll?.total ?? Number.NaN) - 34);
    expect(payload.tier).toBe(tierFor(legacy, payload.margin));
    // The payload is a copy: the emission's lists are not the stream's.
    expect(payload.actors).not.toBe(judgment.check.actors);
  });

  it("the officials' CHECK names the fouler alone, wherever the fouler stands among the penalty_check's actors", () => {
    // A foul roll may name two players, in either order, as the block rolls do (`resolve/runBlock.ts`).
    // The fouler need only be among the penalty_check's actors, not first, and the officials' CHECK
    // names the fouler and no one else (F4: its actors are the one player whose foul or near-foul it
    // judges).
    const filed: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { OFFENSIVE_HOLDING: 0.06 } };
    const rolls = [
      { dials: OFFICIALS_DIALS, margin: -5, reading: "FOUL", checkKind: "official_sees" },
      { dials: filed, margin: 4, reading: "NEAR_FOUL", checkKind: "phantom_flag" },
    ] as const;
    for (const actors of [[OTHER, OFFENDER], [OFFENDER, OTHER]] as const) {
      for (const { dials, margin, reading, checkKind } of rolls) {
        const where = `${reading}, actors ${actors.join(" and ")}`;
        const foulRng = createRng("officials-two-actors", FOUL_LABEL);
        const judge = (): FoulRollJudgment | undefined =>
          judgeFoulRoll({
            dials, tunables: legacy, game: gameWith(LEAGUE_LEANS), situation: FIRST_QUARTER,
            foul: foulOf("OFFENSIVE_HOLDING"), judged: penaltyCheck(foulRng, margin, actors), foulRng,
          });
        expect(judge, where).not.toThrow();
        const judgment = judge();
        expect(judgment, where).toBeDefined();
        expect(judgment?.reading, where).toBe(reading);
        expect(judgment?.check.checkKind, where).toBe(checkKind);
        expect(judgment?.check.actors, where).toEqual([OFFENDER]);
      }
    }
  });

  it("F4's worked example", () => {
    const sees = judgeWithFace(60).judgment;
    expect(sees?.check.checkKind).toBe("official_sees");
    expect(sees?.target).toBe(34);
    expect(sees?.check.margin).toBe(26);
    expect(sees?.check.tier).toBe("STRONG_SUCCESS");
    expect(sees?.flagged).toBe(true);

    const filed: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { OFFENSIVE_HOLDING: 0.06 } };
    const phantom = judgeWithFace(60, { dials: filed, margin: 4 }).judgment;
    expect(phantom?.reading).toBe("NEAR_FOUL");
    expect(phantom?.check.checkKind).toBe("phantom_flag");
    expect(phantom?.target).toBe(95);
    expect(phantom?.check.margin).toBe(-35);
    expect(phantom?.check.tier).toBe("DECISIVE_FAILURE");
    expect(phantom?.flagged).toBe(false);
  });

  it("a clean roll draws no die", () => {
    for (const margin of [11, 12, 50, 100]) {
      const { judgment, dealer } = judgeWithFace(60, { margin });
      expect(judgment).toBeUndefined();
      expect(dealer.draws).toBe(0);
    }
  });

  it("every foul and every near-foul draws one die, and a certain flag is refused", () => {
    const tiny: OfficialsDials = { ...OFFICIALS_DIALS, wrongFlagChance: { OFFENSIVE_HOLDING: 0.004 } };
    const { judgment: never, dealer: once } = judgeWithFace(100, { dials: tiny, margin: 0 });
    expect(once.draws).toBe(1);
    expect(never?.target).toBe(101);
    expect(never?.check.checkKind).toBe("phantom_flag");
    expect(never?.check.margin).toBe(-1);
    expect(never?.flagged).toBe(false);

    expect(() => judgeWithFace(50, { dials: seenAt(1) })).toThrow(OfficialsError);
    expect(() => judgeWithFace(50, { dials: seenAt(0.996) })).toThrow(/a certain flag/);

    const atTheCap = gameWith({ ...LEAGUE_LEANS, SNAP: 100 });
    for (let face = 1; face <= 100; face++) {
      const { judgment, dealer } = judgeWithFace(face, { foul: foulOf("OFFENSIVE_OFFSIDE"), game: atTheCap });
      expect(judgment?.target).toBe(2);
      expect(dealer.draws).toBe(1);
      expect(judgment?.flagged).toBe(face !== 1);
    }
  });

  it("the officials' die replays from the seed and its label alone", () => {
    for (let i = 0; i < 25; i++) {
      const seed = `officials-replay-${i}`;
      const foulRng = createRng(seed, FOUL_LABEL);
      const judgment = judgeFoulRoll({
        dials: OFFICIALS_DIALS, tunables: legacy, game: gameWith(LEAGUE_LEANS), situation: FIRST_QUARTER,
        foul: foulOf("FALSE_START"), judged: penaltyCheck(foulRng, -2), foulRng,
      });
      if (judgment === undefined) throw new Error("a foul is judged");
      expect(createRng(seed, judgment.check.roll.rngLabel).d100()).toBe(judgment.check.roll.raw);
    }
  });

  it("same inputs, same judgment, and no input is changed", () => {
    const filed: OfficialsDials = deepFreeze({ ...OFFICIALS_DIALS, wrongFlagChance: { DEFENSIVE_HOLDING: 0.035 } });
    const game = deepFreeze(gameWith({ ...LEAGUE_LEANS, COVERAGE: 61 }, { kind: "WILD_CARD" }));
    const situation = deepFreeze({ period: 4, offenseScore: 17, defenseScore: 13 });
    const foul = deepFreeze(foulOf("DEFENSIVE_HOLDING", { team: AWAY }));
    for (const margin of [-7, 6]) {
      const judged = deepFreeze(penaltyCheck(createRng("same-inputs", FOUL_LABEL), margin));
      const before = JSON.stringify({ filed, game, situation, foul, judged });
      const judge = () =>
        judgeFoulRoll({ dials: filed, tunables: legacy, game, situation, foul, judged, foulRng: createRng("same-inputs", FOUL_LABEL) });
      const first = judge();
      const second = judge();
      expect(first).toBeDefined();
      expect(second).toEqual(first);
      expect(JSON.stringify({ filed, game, situation, foul, judged })).toBe(before);
    }
  });

  it("flagged exactly when the die reaches the target", () => {
    for (const chance of [0.95, 0.8, 2 / 3, 0.5]) {
      const target = officialsTarget(chance);
      let flagged = 0;
      for (let face = 1; face <= 100; face++) {
        const { judgment } = judgeWithFace(face, { dials: seenAt(chance) });
        expect(judgment?.chance).toBe(chance);
        expect(judgment?.target).toBe(target);
        expect(judgment?.check.margin).toBe(face - target);
        expect(judgment?.flagged).toBe(face >= target);
        if (judgment?.flagged === true) flagged += 1;
      }
      expect(flagged, String(chance)).toBe(101 - target);
    }
  });

  describe("refusals", () => {
    const crew: OfficiatingCrew = {
      id: officiatingCrewId("crew-01"),
      referee: "A. Stand-In",
      leans: { LINE_HOLDING: 50, COVERAGE: 50, PLAYER_SAFETY: 50, TECHNICAL: 50, SNAP: 50 },
    };
    const withLean = (family: CrewLeanFamily, lean: number): OfficiatingCrew => ({ ...crew, leans: { ...crew.leans, [family]: lean } });
    const { SNAP: _dropped, ...fourFamilies } = crew.leans;
    const judge = (over: { judged?: CheckEmission; foulRng?: Rng; foul?: JudgedFoul; tunables?: Tunables; margin?: number }) => {
      const foulRng = createRng("refusals", FOUL_LABEL);
      return () =>
        judgeFoulRoll({
          dials: OFFICIALS_DIALS,
          tunables: over.tunables ?? legacy,
          game: gameWith(LEAGUE_LEANS),
          situation: FIRST_QUARTER,
          foul: over.foul ?? foulOf("OFFENSIVE_HOLDING"),
          judged: over.judged ?? penaltyCheck(foulRng, over.margin ?? -4),
          foulRng: over.foulRng ?? foulRng,
        });
    };
    const fivePeriods = applyTunablePatch(legacy, {
      tunableId: "game.periodsInRegulation",
      currentValue: 4,
      proposedValue: 5,
      evidence: "test/officials.test.ts",
      expectedEffect: "a game of five periods, which the let-them-play arc cannot read",
    });
    const inPeriod = (period: number, dials: OfficialsDials = OFFICIALS_DIALS) => () =>
      letThemPlayFactor(dials, legacy, gameWith(LEAGUE_LEANS), { ...FIRST_QUARTER, period }, "OFFENSIVE_HOLDING", "SCRIMMAGE");
    const holding = OFFICIALS_DIALS.letThemPlay.LINE_HOLDING;
    const threeQuarterArc: OfficialsDials = {
      ...OFFICIALS_DIALS,
      letThemPlay: { ...OFFICIALS_DIALS.letThemPlay, LINE_HOLDING: { ...holding, arc: [1, 1, 1] as unknown as LetThemPlay["arc"] } },
    };
    const cases: readonly (readonly [string, () => unknown, RegExp])[] = [
      ["a judged CHECK that is not a penalty_check", judge({ judged: { ...penaltyCheck(createRng("refusals", FOUL_LABEL), -4), checkKind: "tackle" } }), /judge a penalty_check, not a tackle/],
      ["a judged CHECK whose margin is not a number", judge({ judged: { ...penaltyCheck(createRng("refusals", FOUL_LABEL), -4), margin: Number.NaN } }), /margin is NaN/],
      ["labels that do not match", judge({ foulRng: createRng("refusals", `${FOUL_LABEL}-elsewhere`) }), /was drawn on .*, but its generator is/],
      ["a player not among the judged actors", judge({ foul: foulOf("OFFENSIVE_HOLDING", { player: OTHER }) }), /p-other is not among the penalty_check's actors/],
      ["a near-foul of a kind with no filed chance", judge({ margin: 3 }), /no wrong-flag chance is filed for OFFENSIVE_HOLDING/],
      ["a period count other than four", judge({ tunables: fivePeriods }), /four quarters, but this game has 5 periods/],
      ["a period count other than four, on a clean roll too", judge({ tunables: fivePeriods, margin: 40 }), /four quarters/],
      ["a period of 0", inPeriod(0), /a period is a whole number from 1, not 0/],
      ["a period of 2.5", inPeriod(2.5), /a period is a whole number from 1, not 2.5/],
      ["a period of 4.5", inPeriod(4.5), /a period is a whole number from 1, not 4.5/],
      ["a let-them-play arc with no such quarter", inPeriod(4, threeQuarterArc), /the arc has no quarter 4/],
      ["a chance that is not a number", () => officialsTarget(Number.NaN), /a chance is a number from 0/],
      ["a negative chance", () => officialsTarget(-0.1), /a chance is a number from 0/],
      ["a wrong share of 1", () => wrongFlagChanceFor({ share: 1, seen: 0.8, foulsPerNearFoul: 1 }), /a share of wrong flags/],
      ["a seen chance above 1", () => wrongFlagChanceFor({ share: 0.05, seen: 1.2, foulsPerNearFoul: 1 }), /a seen chance is from 0 to 1/],
      ["fouls per near-foul below 0", () => wrongFlagChanceFor({ share: 0.05, seen: 0.8, foulsPerNearFoul: -1 }), /fouls per near-foul/],
      ["crewOnRecord given no crew at all", () => crewOnRecord(null as unknown as OfficiatingCrew), /a crew must be an object/],
      ["crewOnRecord given leans that are not an object", () => crewOnRecord({ ...crew, leans: null as unknown as OfficiatingCrew["leans"] }), /crew crew-01 has no leans/],
      ["crewOnRecord given a lean of NaN", () => crewOnRecord(withLean("COVERAGE", Number.NaN)), /lean on COVERAGE is NaN, not a number from 0 to 100/],
      ["crewOnRecord given a lean of -1", () => crewOnRecord(withLean("SNAP", -1)), /lean on SNAP is -1, not a number from 0 to 100/],
      ["crewOnRecord given a lean of 101", () => crewOnRecord(withLean("TECHNICAL", 101)), /lean on TECHNICAL is 101, not a number from 0 to 100/],
      ["crewOnRecord given a missing family", () => crewOnRecord({ ...crew, leans: fourFamilies as OfficiatingCrew["leans"] }), /has no lean on SNAP/],
      ["crewOnRecord given a KICKS key", () => crewOnRecord({ ...crew, leans: { ...crew.leans, KICKS: 50 } as OfficiatingCrew["leans"] }), /leans on KICKS, which takes no lean/],
      ["crewOnRecord given a key that is no family", () => crewOnRecord({ ...crew, leans: { ...crew.leans, HOLDING: 50 } as OfficiatingCrew["leans"] }), /leans on HOLDING, which is not one of the five families/],
      ["crewOnRecord given an empty id", () => crewOnRecord({ ...crew, id: officiatingCrewId("") }), /a crew needs an id/],
      ["crewOnRecord given an empty referee", () => crewOnRecord({ ...crew, referee: "" }), /crew crew-01 needs a referee/],
    ];
    it.each(cases)("refuses %s, with its reason", (_name, act, reason) => {
      expect(act).toThrow(OfficialsError);
      expect(act).toThrow(reason);
    });
  });

  it("crewOnRecord copies in the contract's key order and drops what is not the contract's", () => {
    const given = {
      bio: "a franchise-side key",
      leans: { SNAP: 44, PLAYER_SAFETY: 71, LINE_HOLDING: 58, TECHNICAL: 39, COVERAGE: 50 },
      referee: "B. Stand-In",
      id: officiatingCrewId("crew-11"),
    };
    const copy = crewOnRecord(given);
    expect(Object.keys(copy)).toEqual(["id", "referee", "leans"]);
    expect(Object.keys(copy.leans)).toEqual(["LINE_HOLDING", "COVERAGE", "PLAYER_SAFETY", "TECHNICAL", "SNAP"]);
    expect(copy).toEqual({ id: "crew-11", referee: "B. Stand-In", leans: given.leans });
    expect(copy.leans).not.toBe(given.leans);
    expect(JSON.stringify(copy)).toBe(
      '{"id":"crew-11","referee":"B. Stand-In","leans":{"LINE_HOLDING":58,"COVERAGE":50,"PLAYER_SAFETY":71,"TECHNICAL":39,"SNAP":44}}',
    );
    // Whole leans at the ends of the contract's range are a crew's.
    expect(crewOnRecord({ ...given, leans: leansAt(0) }).leans).toEqual(leansAt(0));
    expect(crewOnRecord({ ...given, leans: leansAt(100) }).leans).toEqual(leansAt(100));
  });

  it("wrongFlagChanceFor is share/(1 − share) × seen × fouls per near-foul", () => {
    const crowd = wrongFlagChanceFor({ share: 1 / 20, seen: 2 / 3, foulsPerNearFoul: 1 });
    const open = wrongFlagChanceFor({ share: 1 / 20, seen: 0.8, foulsPerNearFoul: 1 });
    const plain = wrongFlagChanceFor({ share: 1 / 200, seen: 0.95, foulsPerNearFoul: 0.4 });
    expect(crowd).toBeCloseTo(0.0351, 4);
    expect(open).toBeCloseTo(0.0421, 4);
    expect(plain).toBeCloseTo(0.00191, 5);
    expect(officialsTarget(plain)).toBe(101);
    expect(wrongFlagChanceFor({ share: OFFICIALS_DIALS.wrongShare.judgment, seen: OFFICIALS_DIALS.seen.CROWD, foulsPerNearFoul: 1 })).toBe(crowd);
    expect(wrongFlagChanceFor({ share: OFFICIALS_DIALS.wrongShare.plain, seen: OFFICIALS_DIALS.seen.PLAIN, foulsPerNearFoul: 0.4 })).toBe(plain);
  });

  it("OFFICIALS_DIALS is deeply frozen and files no wrong-flag chance", () => {
    expect(everyNestedObjectIsFrozen(OFFICIALS_DIALS)).toBe(true);
    expect(everyNestedObjectIsFrozen(LEAGUE_LEANS)).toBe(true);
    expect(Object.keys(OFFICIALS_DIALS.wrongFlagChance)).toEqual([]);
    expect(Object.keys(OFFICIALS_DIALS.crewWeight).sort()).toEqual([...KINDS].sort());
    expect(Object.keys(OFFICIALS_DIALS.letThemPlay)).toEqual(FAMILIES);
    expect(OFFICIALS_DIALS).toMatchObject({
      seen: { PLAIN: 0.95, OPEN: 0.8, CROWD: 2 / 3 },
      seenCap: 0.99,
      crewFloor: 0.2,
      leanCenter: 50,
      nearFoulMargin: 10,
      wrongShare: { judgment: 1 / 20, plain: 1 / 200 },
      closeWithin: 8,
      roadRatio: { DEFENSIVE_PASS_INTERFERENCE: 1.14, DEFENSIVE_HOLDING: 1.11, ILLEGAL_CONTACT: 1.29 },
    });
  });
});
