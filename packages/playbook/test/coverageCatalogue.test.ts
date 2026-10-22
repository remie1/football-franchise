/**
 * ADR-073 step 3.4 — THE v6 COVERAGE CATALOGUE, STATED THEN CHECKED.
 *
 * `coverageCatalogue.ts` states v6's parts: eighteen coverages, five pressures that reproduce the
 * book's pressure cards, three creepers, and five line games. This file holds them to the book
 * and to ADR-073 §2.6:
 *
 *   - the parts are the ones §3.4 names, and each of the 22 cards folds onto the coverage that
 *     hosts it;
 *   - in bound mode each of the five pressures over its coverage IS the shipped card, key for
 *     key and on every formation (Base Run Blitz's corners excepted, by R25, unreachable);
 *   - each creeper is §2.6's form, rushes four, and is said a Creeper over Cover 3;
 *   - every composed call validates, is said as ADR-071 §5 says it, and wears the one pressure
 *     word its rush fits;
 *   - a line game is legal only where §2.6 and step 3.4's additions allow, and every refusal
 *     names its rule;
 *   - every legal look applies over every composed call, and none moves a rusher;
 *   - the harness's host key resolves every call to its host from the call alone.
 *
 * `coverageCatalogueCorpus.test.ts` carries the corpus-wide checks the book's own tests run on
 * `DEFENSIVE_CARDS` alone.
 *
 * Nothing here is random: the catalogue draws nothing (the draws are `pressureDraw.ts`'s, held by
 * `pressureDraw.test.ts`). Its determinism is purity — composing twice gives the same call, and
 * composing changes no card.
 */
import type { DefensivePlayCall } from "@ff/contracts";
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import * as CATALOGUE from "../src/coverageCatalogue.js";
import {
  COMPOSED,
  CREEPER_SPECS,
  DIME_COVER_1,
  HOST_OF,
  LINE_GAMES,
  PRESSURE_SPECS,
  V6_COVERAGES,
  composeCall,
  composedKey,
  legalLineGames,
  lineGameRefusals,
  type ComposedCall,
  type HostedPressure,
  type LineGame,
  type LineGameId,
  type LineGameRefusal,
} from "../src/coverageCatalogue.js";
import { isPressure, rusherCount, type AnyDefensiveCard, type DefensiveDuty } from "../src/defense.js";
import {
  BASE_COVER_1,
  BASE_COVER_2,
  BASE_COVER_3,
  BASE_RUN_BLITZ,
  DEFENSIVE_CARDS,
  DIME_MAN_BLITZ,
  DIME_QUARTERS,
  NICKEL_COVER_1,
  NICKEL_COVER_3_BUZZ,
  NICKEL_COVER_3_SKY,
  NICKEL_COVER_6,
  NICKEL_FIRE_ZONE,
  NICKEL_TAMPA_2,
} from "../src/defensiveCards.js";
import { PlaybookError } from "../src/errors.js";
import { FORMATIONS, type AnyFormation } from "../src/formations.js";
import { instantiateDefense } from "../src/instantiate.js";
import {
  SHOW_2,
  applyLooks,
  legalLookCombinations,
  maskShows,
  type CoverageMask,
  type LookDraw,
} from "../src/masks.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEFENSE_ROLES, type DefenseRole } from "../src/roles.js";
import { PRESSURE_TAGS, type PressureTagId } from "../src/tags.js";
import { errorsOnly, validateDefensiveCard } from "../src/validate.js";
import { DEEP_CHART } from "./fixtures.js";

/** ADR-071 §5, verbatim — `tags.test.ts`'s SPOKEN table, copied so this file reads the book's words. */
const SPOKEN: Readonly<Record<string, string>> = {
  DEF_NICKEL_COVER_3_SKY: "Nickel Over, Cover 3 Sky",
  DEF_NICKEL_COVER_3_BUZZ: "Nickel Over, Cover 3 Buzz",
  DEF_NICKEL_COVER_3_PRESSURE: "Nickel Over, Smoke, Cover 3 Sky",
  DEF_NICKEL_COVER_2: "Nickel Even, Cover 2",
  DEF_NICKEL_TAMPA_2: "Nickel Even Triple, Tampa 2",
  DEF_NICKEL_QUARTERS: "Nickel Over, Quarters",
  DEF_NICKEL_COVER_6: "Nickel Over Tex, Cover 6",
  DEF_NICKEL_COVER_1: "Nickel Over, Cover 1",
  DEF_NICKEL_COVER_1_RAT: "Nickel Even, Cover 1 Rat",
  DEF_NICKEL_COVER_2_MAN: "Nickel Even, Cover 2 Man",
  DEF_NICKEL_FIRE_ZONE: "Nickel Over Tex, Fire, Cover 3",
  DEF_NICKEL_DOUBLE_A_BLITZ: "Nickel Mug, Double A, Cover 1",
  DEF_NICKEL_COVER_0_BLITZ: "Nickel Mug, Zero, Cover 0",
  DEF_BASE_COVER_3: "Base Over Tex, Cover 3",
  DEF_BASE_COVER_1: "Base Under, Cover 1",
  DEF_BASE_COVER_2: "Base Over Delay, Cover 2",
  DEF_BASE_RUN_BLITZ: "Base Bear, Fire, Cover 1",
  DEF_DIME_QUARTERS: "Dime Even Twist, Quarters",
  DEF_DIME_MAN_BLITZ: "Dime Mug, Smoke, Cover 1",
  DEF_DIME_PREVENT: "Dime Prevent, Prevent",
  DEF_GOAL_LINE_MAN: "Goal Line 5-3, Man",
  DEF_GOAL_LINE_ZONE: "Goal Line 5-3, Zone",
};

/** The calls the book has no card for, said with their lines bound. */
const SPOKEN_NEW: Readonly<Record<string, string>> = {
  DEF_DIME_COVER_1: "Dime Even, Cover 1",
  "DEF_NICKEL_COVER_3_SKY+CREEPER": "Nickel Over, Creeper, Cover 3 Sky",
  "DEF_NICKEL_COVER_3_BUZZ+CREEPER": "Nickel Over, Creeper, Cover 3 Buzz",
  // Base Cover 3 states the Tex, and a creeper over it keeps the coverage's own line game.
  "DEF_BASE_COVER_3+CREEPER": "Base Over Tex, Creeper, Cover 3",
};

/** Each line game's word, as `LINE_GAME_TAGS` names its row (ADR-071 §4). */
const GAME_WORD: Readonly<Record<LineGameId, string>> = {
  TEX_LEFT: "Tex",
  TEX_RIGHT: "Tex",
  TWIST: "Twist",
  DELAY: "Delay",
  TRIPLE: "Triple",
};
const LINE_WORDS: ReadonlySet<string> = new Set(Object.values(GAME_WORD));

/** The play log's convention (ADR-071 §1), as `tags.test.ts` says a call. */
function say(call: DefensivePlayCall): string {
  const words = (kind: string): string[] => call.tags.filter((t) => t.kind === kind).map((t) => t.name);
  return [
    [call.personnel, call.front, ...words("FRONT")].join(" "),
    ...words("PRESSURE"),
    call.concept,
    ...words("LOOK"),
  ].join(", ");
}

function lookAt(formation: AnyFormation) {
  return { formation, unit: buildOffensiveUnit(formation.personnel, DEEP_CHART) };
}

const FIRST_FORMATION: AnyFormation = (() => {
  const formation = FORMATIONS[0];
  if (formation === undefined) throw new Error("no formations");
  return formation;
})();

function callFor(card: AnyDefensiveCard, formation: AnyFormation = FIRST_FORMATION): DefensivePlayCall {
  return instantiateDefense(card, buildDefensiveUnit(card.personnel, DEEP_CHART), lookAt(formation)).call;
}

const errorCodes = (card: AnyDefensiveCard): readonly string[] =>
  errorsOnly(validateDefensiveCard(card)).map((d) => d.code);

const PRESSURE_IDS = Object.keys(PRESSURE_TAGS) as PressureTagId[];

const LINE_ROLES: readonly DefenseRole[] = ["DE_L", "DT_L", "NT", "DT_R", "DE_R"];

const ENTRIES: readonly ComposedCall[] = Object.values(COMPOSED);

const byId = (id: string): AnyDefensiveCard => {
  const card = [...DEFENSIVE_CARDS, DIME_COVER_1].find((c) => c.id === id);
  if (card === undefined) throw new Error(`no card ${id}`);
  return card;
};

const hostOf = (spec: HostedPressure): AnyDefensiveCard => byId(spec.over);

/** The pressure an entry lays over its coverage, if any. */
const specOf = (e: ComposedCall): HostedPressure | undefined =>
  [...PRESSURE_SPECS, ...CREEPER_SPECS].find((s) => s.over === e.coverage && s.pressure === e.pressure);

const entry = (key: string): ComposedCall => {
  const found = COMPOSED[key];
  if (found === undefined) throw new Error(`no composition ${key}`);
  return found;
};

/** The roles whose played duty differs from the host's, plus every man off the line who rushes. */
function derivedMoved(host: AnyDefensiveCard, call: AnyDefensiveCard): readonly DefenseRole[] {
  const roles = DEFENSE_ROLES[call.personnel] as readonly DefenseRole[];
  return roles.filter((role) => {
    const duty = call.duties[role];
    return (
      !isDeepStrictEqual(duty, host.duties[role]) || (duty?.kind === "RUSH" && !LINE_ROLES.includes(role))
    );
  });
}

// --- the parts ----------------------------------------------------------------------------------

describe("ADR-073 §3.4 — the catalogue's parts", () => {
  it("V6_COVERAGES is the book less its five decomposed cards, with DIME_COVER_1 after Dime Quarters", () => {
    expect(V6_COVERAGES.map((c) => c.id)).toEqual([
      "DEF_NICKEL_COVER_3_SKY",
      "DEF_NICKEL_COVER_3_BUZZ",
      "DEF_NICKEL_COVER_2",
      "DEF_NICKEL_TAMPA_2",
      "DEF_NICKEL_QUARTERS",
      "DEF_NICKEL_COVER_6",
      "DEF_NICKEL_COVER_1",
      "DEF_NICKEL_COVER_1_RAT",
      "DEF_NICKEL_COVER_2_MAN",
      "DEF_NICKEL_COVER_0_BLITZ",
      "DEF_BASE_COVER_3",
      "DEF_BASE_COVER_1",
      "DEF_BASE_COVER_2",
      "DEF_DIME_QUARTERS",
      "DEF_DIME_COVER_1",
      "DEF_DIME_PREVENT",
      "DEF_GOAL_LINE_MAN",
      "DEF_GOAL_LINE_ZONE",
    ]);
    // Every coverage the book ships is the book's own object, not a copy.
    for (const coverage of V6_COVERAGES) {
      if (coverage === DIME_COVER_1) continue;
      expect(DEFENSIVE_CARDS.includes(coverage), coverage.id).toBe(true);
    }
  });

  it("HOST_OF folds the five decomposed cards onto their hosts, and every other card onto itself", () => {
    const folded: Readonly<Record<string, string>> = {
      DEF_NICKEL_COVER_3_PRESSURE: "DEF_NICKEL_COVER_3_SKY",
      DEF_NICKEL_FIRE_ZONE: "DEF_NICKEL_COVER_3_SKY",
      DEF_NICKEL_DOUBLE_A_BLITZ: "DEF_NICKEL_COVER_1",
      DEF_BASE_RUN_BLITZ: "DEF_BASE_COVER_1",
      DEF_DIME_MAN_BLITZ: "DEF_DIME_COVER_1",
    };
    expect(Object.keys(HOST_OF)).toEqual(DEFENSIVE_CARDS.map((c) => c.id));
    for (const card of DEFENSIVE_CARDS) {
      expect(HOST_OF[card.id], card.id).toBe(folded[card.id] ?? card.id);
    }
    const coverages = new Set(V6_COVERAGES.map((c) => c.id));
    expect(Object.values(HOST_OF).every((host) => coverages.has(host))).toBe(true);
  });

  it("states the five pressures in the book's order, with the shipped ids, each over its host", () => {
    expect(PRESSURE_SPECS.map((s) => [s.id, s.over, s.pressure])).toEqual([
      ["DEF_NICKEL_COVER_3_PRESSURE", "DEF_NICKEL_COVER_3_SKY", "SMOKE"],
      ["DEF_NICKEL_FIRE_ZONE", "DEF_NICKEL_COVER_3_SKY", "FIRE"],
      ["DEF_NICKEL_DOUBLE_A_BLITZ", "DEF_NICKEL_COVER_1", "DOUBLE_A"],
      ["DEF_BASE_RUN_BLITZ", "DEF_BASE_COVER_1", "FIRE"],
      ["DEF_DIME_MAN_BLITZ", "DEF_DIME_COVER_1", "SMOKE"],
    ]);
    const bookOrder = DEFENSIVE_CARDS.map((c) => c.id);
    const positions = PRESSURE_SPECS.map((s) => bookOrder.indexOf(s.id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("states a creeper over each four-man Cover 3 call, and over nothing else", () => {
    expect(CREEPER_SPECS.map((s) => [s.id, s.over, s.pressure, s.blitzDisguise])).toEqual([
      ["DEF_NICKEL_COVER_3_SKY+CREEPER", "DEF_NICKEL_COVER_3_SKY", "CREEPER", "ZONE_BLITZ"],
      ["DEF_NICKEL_COVER_3_BUZZ+CREEPER", "DEF_NICKEL_COVER_3_BUZZ", "CREEPER", "ZONE_BLITZ"],
      ["DEF_BASE_COVER_3+CREEPER", "DEF_BASE_COVER_3", "CREEPER", "ZONE_BLITZ"],
    ]);
    const fourManCover3 = V6_COVERAGES.filter((c) => c.family === "COVER_3" && rusherCount(c) === 4).map((c) => c.id);
    expect(CREEPER_SPECS.map((s) => s.over)).toEqual(fourManCover3);
  });

  it("states the book's five line games, and the book states no other", () => {
    const shipped = (card: AnyDefensiveCard) => card.stunts;
    const game = (id: LineGameId) => LINE_GAMES.find((g) => g.id === id)?.stunts;
    expect(LINE_GAMES.map((g) => g.id)).toEqual(["TEX_LEFT", "TEX_RIGHT", "TWIST", "DELAY", "TRIPLE"]);
    expect(game("TEX_LEFT")).toStrictEqual(shipped(NICKEL_FIRE_ZONE));
    expect(game("TEX_LEFT")).toStrictEqual(shipped(BASE_COVER_3));
    expect(game("TEX_RIGHT")).toStrictEqual(shipped(NICKEL_COVER_6));
    expect(game("TWIST")).toStrictEqual(shipped(DIME_QUARTERS));
    expect(game("DELAY")).toStrictEqual(shipped(BASE_COVER_2));
    expect(game("TRIPLE")).toStrictEqual(shipped(NICKEL_TAMPA_2));
    for (const card of DEFENSIVE_CARDS.filter((c) => c.stunts !== undefined)) {
      expect(
        LINE_GAMES.some((g) => isDeepStrictEqual(g.stunts, card.stunts)),
        `${card.id} states a line game the catalogue does not`,
      ).toBe(true);
    }
  });

  it("enumerates its own card-shaped exports, and the coverage catalogue misses none of them", () => {
    // The same structural enumeration `shownAssignments.test.ts` runs over `defensiveCards.ts`.
    const cards = Object.values(CATALOGUE).filter(
      (value): value is AnyDefensiveCard =>
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof (value as { id?: unknown }).id === "string" &&
        typeof (value as { personnel?: unknown }).personnel === "string" &&
        typeof (value as { duties?: unknown }).duties === "object",
    );
    expect(cards.map((c) => c.id)).toEqual(["DEF_DIME_COVER_1"]);
    for (const card of cards) expect(V6_COVERAGES.includes(card), card.id).toBe(true);
  });
});

// --- DIME_COVER_1 --------------------------------------------------------------------------------

describe("ADR-073 §3.4 — DIME_COVER_1, the dime's bare Cover 1", () => {
  it("is valid with no diagnostic at all", () => {
    expect(validateDefensiveCard(DIME_COVER_1)).toEqual([]);
  });

  it("lives only in v6's catalogue: absent from DEFENSIVE_CARDS, weight 0, minDistance 7", () => {
    expect(DEFENSIVE_CARDS.some((c) => c.id === DIME_COVER_1.id)).toBe(false);
    expect(DEFENSIVE_CARDS.includes(DIME_COVER_1)).toBe(false);
    expect(DIME_COVER_1.usage).toStrictEqual({ weight: 0, minDistance: 7 });
  });

  it("is said Dime Even, Cover 1: Dime Quarters' front, Dime Man Pressure's coverage, no word, no game", () => {
    expect(say(callFor(DIME_COVER_1))).toBe("Dime Even, Cover 1");
    expect(DIME_COVER_1.front).toBe(DIME_QUARTERS.front);
    expect([DIME_COVER_1.personnel, DIME_COVER_1.concept, DIME_COVER_1.shellIntent, DIME_COVER_1.family]).toEqual([
      DIME_MAN_BLITZ.personnel,
      DIME_MAN_BLITZ.concept,
      DIME_MAN_BLITZ.shellIntent,
      DIME_MAN_BLITZ.family,
    ]);
    expect(DIME_COVER_1.pressure).toBeUndefined();
    expect(DIME_COVER_1.blitzDisguise).toBeUndefined();
    expect(DIME_COVER_1.stunts).toBeUndefined();
    expect(rusherCount(DIME_COVER_1)).toBe(4);
  });

  it("gives the dime back Nickel Cover 1's spare-man job, and keeps the rest of Dime Man Pressure", () => {
    // #3 to the right, and the robber in the hole when there is no #3 (defensiveCards.ts, Cover 1).
    expect(DIME_COVER_1.duties.CB_D).toStrictEqual(NICKEL_COVER_1.duties.S_S);
    for (const role of DEFENSE_ROLES.DIME) {
      if (role === "CB_D") continue;
      expect(DIME_COVER_1.duties[role], role).toStrictEqual(DIME_MAN_BLITZ.duties[role]);
    }
  });

  it("wears Show 2 and nothing else", () => {
    expect(legalLookCombinations(DIME_COVER_1).map((looks) => looks.map((m) => m.id))).toEqual([["SHOW_2"]]);
  });
});

// --- the five reproductions ----------------------------------------------------------------------

/** Base Run Blitz with Base Cover 1's corners: the card R25 says the decomposition reproduces. */
const BASE_RUN_BLITZ_WITH_THE_COVERAGE_CORNERS: AnyDefensiveCard = (() => {
  const { CB_L, CB_R } = BASE_COVER_1.duties;
  if (CB_L === undefined || CB_R === undefined) throw new Error("Base Cover 1 fields no corners");
  return { ...BASE_RUN_BLITZ, duties: { ...BASE_RUN_BLITZ.duties, CB_L, CB_R } };
})();

describe("ADR-073 §3.4 — in bound mode each pressure over its coverage is the shipped card", () => {
  const shipped = (spec: HostedPressure): AnyDefensiveCard => byId(spec.id);

  it.each(PRESSURE_SPECS.map((s) => [s.id, s] as const))("%s, key for key", (id, spec) => {
    const composed = composeCall(hostOf(spec), spec, "BOUND");
    const expected = id === BASE_RUN_BLITZ.id ? BASE_RUN_BLITZ_WITH_THE_COVERAGE_CORNERS : shipped(spec);
    expect(composed).toStrictEqual(expected);
  });

  it("differs from Base Run Blitz in its corners' fallbacks alone: the deep third, never the flat (R25)", () => {
    const spec = PRESSURE_SPECS.find((s) => s.id === BASE_RUN_BLITZ.id);
    if (spec === undefined) throw new Error("no Base Run Blitz spec");
    const composed = composeCall(BASE_COVER_1, spec, "BOUND");
    const differing = DEFENSE_ROLES.BASE.filter(
      (role) => !isDeepStrictEqual(composed.duties[role], BASE_RUN_BLITZ.duties[role]),
    );
    expect(differing).toEqual(["CB_L", "CB_R"]);
    const fallback = (card: AnyDefensiveCard, role: "CB_L" | "CB_R"): string => {
      const duty = card.duties[role];
      if (duty?.kind !== "MAN" || duty.ifAbsent.kind !== "ZONE") return "none";
      return `${duty.ifAbsent.responsibility}@${duty.ifAbsent.zone.horizontal}`;
    };
    expect([fallback(composed, "CB_L"), fallback(composed, "CB_R")]).toEqual(["DEEP_THIRD@LW", "DEEP_THIRD@RW"]);
    expect([fallback(BASE_RUN_BLITZ, "CB_L"), fallback(BASE_RUN_BLITZ, "CB_R")]).toEqual(["FLAT@LW", "FLAT@RW"]);
    expect({ ...composed.duties.CB_L, ifAbsent: undefined }).toStrictEqual({
      ...BASE_RUN_BLITZ.duties.CB_L,
      ifAbsent: undefined,
    });
  });

  it.each(PRESSURE_SPECS.map((s) => [s.id, s] as const))(
    "%s instantiates exactly as the shipped card on every formation",
    (_id, spec) => {
      const composed = composeCall(hostOf(spec), spec, "BOUND");
      const card = shipped(spec);
      const unit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      for (const formation of FORMATIONS) {
        const a = instantiateDefense(composed, unit, lookAt(formation));
        const b = instantiateDefense(card, unit, lookAt(formation));
        expect(JSON.stringify(a), formation.id).toBe(JSON.stringify(b));
        // The corners' fallback never runs: every formation has a #1 to each side (ADR-071:457-458).
        expect(a.fallbacksTaken.filter((role) => role === "CB_L" || role === "CB_R"), formation.id).toEqual([]);
      }
      expect(FORMATIONS).toHaveLength(12);
    },
  );
});

// --- moved men -----------------------------------------------------------------------------------

describe("ADR-073 §2.6 step 3 — each pressure states the men it moves, and they are the men it moves", () => {
  const specs: readonly HostedPressure[] = [...PRESSURE_SPECS, ...CREEPER_SPECS];

  it.each(specs.map((s) => [s.id, s] as const))("%s", (_id, spec) => {
    const host = hostOf(spec);
    const composed = composeCall(host, spec, "NONE");
    expect(spec.moved).toEqual(derivedMoved(host, composed));
    // `duties` restates nobody: each man it names is on the host's field and plays something new.
    const roles = DEFENSE_ROLES[host.personnel] as readonly DefenseRole[];
    for (const role of Object.keys(spec.duties) as DefenseRole[]) {
      expect(roles.includes(role), `${role} is not in ${host.personnel}`).toBe(true);
      expect(isDeepStrictEqual(spec.duties[role], host.duties[role]), `${role} restated unchanged`).toBe(false);
    }
  });

  it("names Base Run Blitz's four, and not its corners", () => {
    expect(PRESSURE_SPECS.find((s) => s.id === BASE_RUN_BLITZ.id)?.moved).toEqual(["LB_W", "LB_M", "LB_S", "S_S"]);
  });
});

// --- the creepers --------------------------------------------------------------------------------

describe("ADR-073 §2.6 — the Creeper over each four-man Cover 3 call", () => {
  it.each(CREEPER_SPECS.map((s) => [s.id, s] as const))("%s is §2.6's form", (_id, spec) => {
    const host = hostOf(spec);
    const call = composeCall(host, spec, "NONE");
    expect(call.duties.LB_W).toStrictEqual({
      kind: "RUSH",
      move: "SPEED",
      alignment: "INTERIOR",
      gap: "B",
      side: "LEFT",
    });
    // The right end drops into the Mike's zone, fitting the C gap he left.
    const mike = host.duties.LB_M;
    const will = host.duties.LB_W;
    if (mike?.kind !== "ZONE" || will?.kind !== "ZONE") throw new Error(`${host.id}: the backers do not play zones`);
    expect(call.duties.DE_R).toStrictEqual({ ...mike, runFit: { gap: "C", side: "RIGHT" } });
    // The Mike takes the Will's zone and keeps his own fit.
    expect(call.duties.LB_M).toStrictEqual({ ...will, runFit: mike.runFit });
    // Everybody else plays the host's duty.
    for (const role of DEFENSE_ROLES[host.personnel] as readonly DefenseRole[]) {
      if (role === "LB_W" || role === "LB_M" || role === "DE_R") continue;
      expect(call.duties[role], role).toBe(host.duties[role]);
    }
    expect(rusherCount(call)).toBe(4);
    expect(isPressure(call)).toBe(false);
    expect([call.pressure, call.blitzDisguise, call.family]).toEqual(["CREEPER", "ZONE_BLITZ", "COVER_3"]);
    expect([call.name, call.usage, call.front, call.concept]).toStrictEqual([
      host.name,
      host.usage,
      host.front,
      host.concept,
    ]);
  });

  it("over Buzz slides the Mike from the right hook across to the Will's left curl/flat", () => {
    const spec = CREEPER_SPECS.find((s) => s.over === NICKEL_COVER_3_BUZZ.id);
    if (spec === undefined) throw new Error("no creeper over Buzz");
    const where = (duty: DefensiveDuty | undefined): string =>
      duty?.kind === "ZONE" ? `${duty.responsibility}@${duty.zone.horizontal}` : "not a zone";
    expect(where(composeCall(NICKEL_COVER_3_BUZZ, spec, "NONE").duties.LB_M)).toBe("CURL_FLAT@LW");
    expect(where(NICKEL_COVER_3_BUZZ.duties.LB_M)).toBe("HOOK_CURL@RH");
    expect(where(NICKEL_COVER_3_BUZZ.duties.LB_W)).toBe("CURL_FLAT@LW");
  });

  it("when no pressure is laid over a coverage, the call is exactly that coverage", () => {
    for (const coverage of V6_COVERAGES) {
      expect(composeCall(coverage), coverage.id).toBe(coverage);
      expect(entry(composedKey(coverage.id, undefined, "BOUND")).call, coverage.id).toBe(coverage);
    }
  });
});

// --- the words -----------------------------------------------------------------------------------

/** What an entry is said as: its composition's words with lines bound, then its own line game. */
function expectedSaid(e: ComposedCall): string {
  const bound = SPOKEN[e.call.id] ?? SPOKEN_NEW[e.call.id];
  if (bound === undefined) throw new Error(`no words for ${e.call.id}`);
  if (e.line === "BOUND") return bound;
  const [front = "", ...rest] = bound.split(", ");
  const tokens = front.split(" ");
  const last = tokens[tokens.length - 1] ?? "";
  const bare = (LINE_WORDS.has(last) ? tokens.slice(0, -1) : tokens).join(" ");
  const said = e.line === "NONE" ? bare : `${bare} ${GAME_WORD[e.line]}`;
  return [said, ...rest].join(", ");
}

describe("ADR-071 §5 — every composed call is valid and said as the book says it", () => {
  it.each(ENTRIES.map((e) => [e.key, e] as const))("%s validates and is said in parts and tags", (_key, e) => {
    expect(errorCodes(e.call)).toEqual([]);
    expect(say(callFor(e.call))).toBe(expectedSaid(e));
  });

  it("says every creeper without a line game as Over, Creeper, Cover 3", () => {
    const said = ENTRIES.filter((e) => e.pressure === "CREEPER" && e.line === "NONE").map((e) => say(callFor(e.call)));
    expect(said).toEqual([
      "Nickel Over, Creeper, Cover 3 Sky",
      "Nickel Over, Creeper, Cover 3 Buzz",
      "Base Over, Creeper, Cover 3",
    ]);
  });

  it("says the four calls with overrides as ADR-071 §5 does, which their hosts would not", () => {
    // Fire over Sky (concept and family), and the front on Double A, Base Run Blitz and Dime Smoke.
    for (const [key, words] of [
      ["DEF_NICKEL_COVER_3_SKY|FIRE|BOUND", "Nickel Over Tex, Fire, Cover 3"],
      ["DEF_NICKEL_COVER_1|DOUBLE_A|BOUND", "Nickel Mug, Double A, Cover 1"],
      ["DEF_BASE_COVER_1|FIRE|BOUND", "Base Bear, Fire, Cover 1"],
      ["DEF_DIME_COVER_1|SMOKE|BOUND", "Dime Mug, Smoke, Cover 1"],
    ] as const) {
      expect(say(callFor(entry(key).call)), key).toBe(words);
    }
    expect(entry("DEF_NICKEL_COVER_3_SKY|FIRE|NONE").call.family).toBe("FIRE_ZONE");
  });

  it.each(ENTRIES.map((e) => [e.key, e] as const))("%s: the declared word is the only one its rush fits", (_key, e) => {
    const declared = e.call.pressure;
    for (const word of PRESSURE_IDS) {
      const codes = errorCodes({ ...e.call, pressure: word });
      if (declared === undefined) {
        // The line rushes alone: no word is the call's.
        expect(codes, `${e.key} as ${word}`).toContain("D_PRESSURE_WITHOUT_A_RUSHER");
      } else {
        expect(codes.includes("D_PRESSURE_MISNAMED"), `${e.key} as ${word}`).toBe(word !== declared);
      }
    }
  });
});

// --- line games ----------------------------------------------------------------------------------

/** ADR-073 §2.6 step 3 and step 3.4's additions, per composition (coverage|pressure). */
const ALL_FIVE: readonly LineGameId[] = ["TEX_LEFT", "TEX_RIGHT", "TWIST", "DELAY", "TRIPLE"];
const LEFT_AND_INSIDE: readonly LineGameId[] = ["TEX_LEFT", "TWIST", "TRIPLE"];
const EXPECTED_LEGAL: Readonly<Record<string, readonly LineGameId[]>> = {
  "DEF_NICKEL_COVER_3_SKY|-": ALL_FIVE,
  "DEF_NICKEL_COVER_3_SKY|SMOKE": ALL_FIVE,
  "DEF_NICKEL_COVER_3_SKY|FIRE": LEFT_AND_INSIDE,
  "DEF_NICKEL_COVER_3_SKY|CREEPER": LEFT_AND_INSIDE,
  "DEF_NICKEL_COVER_3_BUZZ|-": ALL_FIVE,
  "DEF_NICKEL_COVER_3_BUZZ|CREEPER": LEFT_AND_INSIDE,
  "DEF_NICKEL_COVER_2|-": ALL_FIVE,
  "DEF_NICKEL_TAMPA_2|-": ALL_FIVE,
  "DEF_NICKEL_QUARTERS|-": ALL_FIVE,
  "DEF_NICKEL_COVER_6|-": ALL_FIVE,
  "DEF_NICKEL_COVER_1|-": ALL_FIVE,
  "DEF_NICKEL_COVER_1|DOUBLE_A": [],
  "DEF_NICKEL_COVER_1_RAT|-": ALL_FIVE,
  "DEF_NICKEL_COVER_2_MAN|-": ALL_FIVE,
  "DEF_NICKEL_COVER_0_BLITZ|-": [],
  "DEF_BASE_COVER_3|-": ALL_FIVE,
  "DEF_BASE_COVER_3|CREEPER": LEFT_AND_INSIDE,
  "DEF_BASE_COVER_1|-": ALL_FIVE,
  "DEF_BASE_COVER_1|FIRE": [],
  "DEF_BASE_COVER_2|-": ALL_FIVE,
  "DEF_DIME_QUARTERS|-": ALL_FIVE,
  "DEF_DIME_COVER_1|-": ALL_FIVE,
  "DEF_DIME_COVER_1|SMOKE": ALL_FIVE,
  "DEF_DIME_PREVENT|-": [],
  "DEF_GOAL_LINE_MAN|-": [],
  "DEF_GOAL_LINE_ZONE|-": [],
};

const game = (id: LineGameId) => {
  const found = LINE_GAMES.find((g) => g.id === id);
  if (found === undefined) throw new Error(`no line game ${id}`);
  return found;
};

const NOT_A_RUSHER: LineGameRefusal = { reason: "VALIDATOR", codes: ["D_STUNT_NOT_A_RUSHER"] };

/** Every refusal, written out: the rule, and the men or the count it names. */
function expectedRefusals(composition: string, id: LineGameId): readonly LineGameRefusal[] {
  const dropsTheRightEnd = [
    "DEF_NICKEL_COVER_3_SKY|FIRE",
    "DEF_NICKEL_COVER_3_SKY|CREEPER",
    "DEF_NICKEL_COVER_3_BUZZ|CREEPER",
    "DEF_BASE_COVER_3|CREEPER",
  ];
  if (dropsTheRightEnd.includes(composition)) {
    if (id === "TEX_RIGHT" || id === "DELAY") {
      return [
        NOT_A_RUSHER,
        { reason: "MOVED_BY_PRESSURE", roles: ["DE_R"] },
        { reason: "DROPPED_LINEMAN", roles: ["DE_R"] },
      ];
    }
    return [];
  }
  if (composition === "DEF_NICKEL_COVER_1|DOUBLE_A") {
    const men = [...new Set(game(id).stunts.flatMap((s) => [s.penetrator, s.looper]))];
    return [
      { reason: "MOVED_BY_PRESSURE", roles: men.filter((m) => m === "DT_L" || m === "DT_R") },
      { reason: "RUSHES_MORE_THAN_FIVE", rushers: 6 },
    ];
  }
  if (composition === "DEF_NICKEL_COVER_0_BLITZ|-" || composition === "DEF_BASE_COVER_1|FIRE") {
    return [{ reason: "RUSHES_MORE_THAN_FIVE", rushers: 6 }];
  }
  if (composition === "DEF_DIME_PREVENT|-") {
    // Prevent's left tackle drops to the middle hook.
    if (id === "TEX_RIGHT" || id === "DELAY") return [{ reason: "PREVENT_OR_GOAL_LINE", family: "PREVENT" }];
    return [
      { reason: "VALIDATOR", codes: ["D_STUNT_NOT_A_RUSHER"] },
      { reason: "DROPPED_LINEMAN", roles: ["DT_L"] },
      { reason: "PREVENT_OR_GOAL_LINE", family: "PREVENT" },
    ];
  }
  if (composition.startsWith("DEF_GOAL_LINE_")) return [{ reason: "PREVENT_OR_GOAL_LINE", family: "GOAL_LINE" }];
  return [];
}

describe("ADR-073 §2.6 step 3 — which line games a composed call may wear", () => {
  const stripped = ENTRIES.filter((e) => e.line === "NONE");

  it("covers every composition, and only those", () => {
    expect(stripped.map((e) => `${e.coverage}|${e.pressure ?? "-"}`)).toEqual(Object.keys(EXPECTED_LEGAL));
  });

  it.each(stripped.map((e) => [`${e.coverage}|${e.pressure ?? "-"}`, e] as const))(
    "%s wears exactly its legal line games, and every refusal names its rule",
    (composition, e) => {
      expect(legalLineGames(e.call).map((g) => g.id)).toEqual(EXPECTED_LEGAL[composition]);
      for (const g of LINE_GAMES) {
        expect(lineGameRefusals(e.call, g), `${composition} wearing ${g.id}`).toEqual(
          expectedRefusals(composition, g.id),
        );
      }
    },
  );

  it("refuses every line game over Double A, because both tackles move", () => {
    const call = entry("DEF_NICKEL_COVER_1|DOUBLE_A|NONE").call;
    expect(legalLineGames(call)).toEqual([]);
    for (const g of LINE_GAMES) {
      expect(lineGameRefusals(call, g).map((r) => r.reason), g.id).toContain("MOVED_BY_PRESSURE");
    }
  });

  it("allows only Tex-left, Twist and Triple over Fire over Sky and every creeper, because the right end drops", () => {
    for (const key of [
      "DEF_NICKEL_COVER_3_SKY|FIRE|NONE",
      "DEF_NICKEL_COVER_3_SKY|CREEPER|NONE",
      "DEF_NICKEL_COVER_3_BUZZ|CREEPER|NONE",
      "DEF_BASE_COVER_3|CREEPER|NONE",
    ]) {
      expect(legalLineGames(entry(key).call).map((g) => g.id), key).toEqual(["TEX_LEFT", "TWIST", "TRIPLE"]);
      for (const id of ["TEX_RIGHT", "DELAY"] as const) {
        const reasons = lineGameRefusals(entry(key).call, game(id)).map((r) => r.reason);
        expect(reasons, `${key} ${id}`).toContain("DROPPED_LINEMAN");
      }
    }
  });

  it("allows none on a six-man call, on Prevent or on the goal line", () => {
    const sixes = stripped.filter((e) => rusherCount(e.call) >= 6);
    expect(sixes.map((e) => e.call.id)).toEqual([
      "DEF_NICKEL_DOUBLE_A_BLITZ",
      "DEF_NICKEL_COVER_0_BLITZ",
      "DEF_BASE_RUN_BLITZ",
    ]);
    const preventAndGoalLine = stripped.filter((x) => x.call.family === "PREVENT" || x.call.family === "GOAL_LINE");
    expect(preventAndGoalLine).toHaveLength(3);
    for (const e of [...sixes, ...preventAndGoalLine]) {
      expect(legalLineGames(e.call), e.key).toEqual([]);
    }
  });

  it("never puts a line game on a moved man, a dropped lineman, six rushers, Prevent or the goal line", () => {
    // Read off the calls themselves, not through `lineGameRefusals`.
    const moved = new Map<string, readonly DefenseRole[]>(
      [...PRESSURE_SPECS, ...CREEPER_SPECS].map((s) => [s.id, s.moved]),
    );
    let wearing = 0;
    for (const e of ENTRIES) {
      for (const stunt of e.call.stunts ?? []) {
        for (const man of [stunt.penetrator, stunt.looper]) {
          expect(LINE_ROLES.includes(man), `${e.key}: ${man}`).toBe(true);
          expect(e.call.duties[man]?.kind, `${e.key}: ${man}`).toBe("RUSH");
          expect(moved.get(e.call.id)?.includes(man) ?? false, `${e.key}: ${man} was moved`).toBe(false);
        }
      }
      if ((e.call.stunts ?? []).length === 0) continue;
      wearing += 1;
      expect(rusherCount(e.call), e.key).toBeLessThanOrEqual(5);
      expect(["PREVENT", "GOAL_LINE"].includes(e.call.family), e.key).toBe(false);
    }
    expect(wearing).toBeGreaterThan(0);
  });

  it("keeps a bound line game only where the draw could have given it", () => {
    for (const e of ENTRIES.filter((x) => x.line === "BOUND" && x.call.stunts !== undefined)) {
      const legal = legalLineGames(e.call);
      expect(legal.some((g) => isDeepStrictEqual(g.stunts, e.call.stunts)), e.key).toBe(true);
    }
  });

  it("reads the book's 22 cards, stripped, as their compositions", () => {
    for (const card of DEFENSIVE_CARDS) {
      const spec = PRESSURE_SPECS.find((s) => s.id === card.id);
      const composition = entry(composedKey(HOST_OF[card.id] ?? card.id, spec?.pressure, "NONE"));
      expect(legalLineGames(card).map((g) => g.id), card.id).toEqual(legalLineGames(composition.call).map((g) => g.id));
    }
  });

  it("ignores the stunts a call already states: a line game replaces them", () => {
    for (const e of ENTRIES.filter((x) => x.line === "BOUND")) {
      const none = entry(composedKey(e.coverage, e.pressure, "NONE"));
      expect(legalLineGames(e.call), e.key).toEqual(legalLineGames(none.call));
    }
  });

  it("names a man off the line, or a lineman the grouping does not field, as no down lineman", () => {
    // No book pattern reaches this rule (every grouping fields both ends and both tackles), so two
    // hand-made pairs stand in for a later pattern.
    const noseTackle: LineGame = { id: "TWIST", stunts: [{ penetrator: "NT", looper: "DT_R", complexity: "T_T" }] };
    expect(lineGameRefusals(entry("DEF_NICKEL_COVER_3_SKY|-|NONE").call, noseTackle)).toEqual([
      { reason: "VALIDATOR", codes: ["D_STUNT_NOT_A_RUSHER"] },
      { reason: "NOT_A_DOWN_LINEMAN", roles: ["NT"] },
    ]);
    const theWill: LineGame = { id: "TWIST", stunts: [{ penetrator: "LB_W", looper: "DT_L", complexity: "T_T" }] };
    expect(lineGameRefusals(entry("DEF_NICKEL_COVER_3_SKY|CREEPER|NONE").call, theWill)).toEqual([
      { reason: "MOVED_BY_PRESSURE", roles: ["LB_W"] },
      { reason: "NOT_A_DOWN_LINEMAN", roles: ["LB_W"] },
    ]);
  });

  it("refuses loudly a call that is no v6 coverage and no pressure over one", () => {
    const stranger: AnyDefensiveCard = { ...NICKEL_COVER_3_SKY, id: "DEF_NOT_IN_THE_CATALOGUE" };
    expect(() => lineGameRefusals(stranger, game("TWIST"))).toThrow(PlaybookError);
    expect(() => legalLineGames(stranger)).toThrow(/its moved men are unknown/);
  });
});

// --- every reachable composition -------------------------------------------------------------------

describe("ADR-073 step 3.4 — COMPOSED, every reachable composition", () => {
  it("holds each composition with its lines bound, with no line game, and with each legal one", () => {
    const expected = Object.entries(EXPECTED_LEGAL).flatMap(([composition, legal]) =>
      ["BOUND", "NONE", ...legal].map((line) => `${composition}|${line}`),
    );
    expect(Object.keys(COMPOSED)).toEqual(expected);
    expect(ENTRIES).toHaveLength(144);
    for (const e of ENTRIES) {
      expect(e.key).toBe(composedKey(e.coverage, e.pressure, e.line));
    }
  });

  it("is frozen, table and entries", () => {
    expect(Object.isFrozen(COMPOSED)).toBe(true);
    for (const e of ENTRIES) expect(Object.isFrozen(e), e.key).toBe(true);
  });

  it("holds exactly composeCall's call under each key", () => {
    for (const e of ENTRIES) {
      const spec = specOf(e);
      expect(e.pressure === undefined || spec !== undefined, e.key).toBe(true);
      expect(e.call, e.key).toStrictEqual(composeCall(byId(e.coverage), spec, e.line));
    }
  });

  it("wears the stunts its line says: the composition's own when BOUND, none for NONE, else the game's", () => {
    for (const e of ENTRIES) {
      if (e.line === "NONE") expect(e.call.stunts, e.key).toBeUndefined();
      else if (e.line === "BOUND") {
        const spec = specOf(e);
        expect(e.call.stunts, e.key).toStrictEqual(spec?.boundStunts ?? byId(e.coverage).stunts);
      } else expect(e.call.stunts, e.key).toStrictEqual(game(e.line).stunts);
    }
    // Fire over Sky keeps Fire Zone's Tex when lines are bound, which Sky itself never runs.
    expect(entry("DEF_NICKEL_COVER_3_SKY|FIRE|BOUND").call.stunts).toStrictEqual(NICKEL_FIRE_ZONE.stunts);
    expect(NICKEL_COVER_3_SKY.stunts).toBeUndefined();
  });

  it("refuses a pressure over a coverage that is not its host, or over a call that already wears more", () => {
    const smoke = PRESSURE_SPECS[0];
    if (smoke === undefined) throw new Error("no specs");
    expect(() => composeCall(NICKEL_COVER_3_BUZZ, smoke)).toThrow(/is laid over DEF_NICKEL_COVER_3_SKY/);
    const masked = applyLooks(NICKEL_COVER_3_SKY, { looks: [SHOW_2], timing: "EARLY" });
    expect(() => composeCall(masked, smoke)).toThrow(PlaybookError);
  });

  it("is pure: composing twice gives the same call, and composing changes no card", () => {
    const before = JSON.stringify([...DEFENSIVE_CARDS, DIME_COVER_1, PRESSURE_SPECS, CREEPER_SPECS, LINE_GAMES]);
    for (const e of ENTRIES) {
      const spec = specOf(e);
      const once = composeCall(byId(e.coverage), spec, e.line);
      const twice = composeCall(byId(e.coverage), spec, e.line);
      expect(twice, e.key).toStrictEqual(once);
      expect(JSON.stringify(callFor(twice)), e.key).toBe(JSON.stringify(callFor(once)));
    }
    expect(JSON.stringify([...DEFENSIVE_CARDS, DIME_COVER_1, PRESSURE_SPECS, CREEPER_SPECS, LINE_GAMES])).toBe(before);
  });
});

// --- looks over composed calls ------------------------------------------------------------------

function drawsOf(looks: readonly CoverageMask[]): readonly LookDraw[] {
  return looks.some((m) => m.row === "BY_TIMING")
    ? [
        { looks, timing: "EARLY" },
        { looks, timing: "LATE" },
      ]
    : [{ looks }];
}

/**
 * `applyLooks` throws on a look that moves a rusher, and `legalLookCombinations` reads only the
 * call's family, so a composed call that sends a man the book's card did not could in principle
 * draw a look it cannot wear. None does: this is the guard that says so on every call.
 */
describe("ADR-073 step 3.4 — every legal look applies over every composed call", () => {
  it.each(ENTRIES.map((e) => [e.key, e] as const))("%s", (key, e) => {
    const unit = buildDefensiveUnit(e.call.personnel, DEEP_CHART);
    for (const looks of legalLookCombinations(e.call)) {
      for (const draw of drawsOf(looks)) {
        const label = `${key} wearing ${looks.map((m) => m.id).join("+")} ${draw.timing ?? ""}`;
        for (const look of looks) {
          for (const role of Object.keys(maskShows(e.call, look)) as DefenseRole[]) {
            expect(e.call.duties[role]?.kind, `${label}: ${look.id} moves ${role}, who rushes`).not.toBe("RUSH");
          }
        }
        let masked: AnyDefensiveCard;
        try {
          masked = applyLooks(e.call, draw);
        } catch (cause) {
          throw new Error(`${label} throws: ${String(cause)}`);
        }
        for (const formation of FORMATIONS) {
          const honest = instantiateDefense(e.call, unit, lookAt(formation)).call;
          const call = instantiateDefense(masked, unit, lookAt(formation)).call;
          expect(call.assignments, `${label} vs ${formation.id}`).toEqual(honest.assignments);
          expect(call.rush, `${label} vs ${formation.id}`).toEqual(honest.rush);
          expect(call.shownRush, `${label} vs ${formation.id}`).toBe(call.rush);
        }
      }
    }
  });

  it("carries each host's family, so the looks are the host's, except Fire over Sky's own FIRE_ZONE", () => {
    for (const e of ENTRIES) {
      const fireOverSky = e.coverage === NICKEL_COVER_3_SKY.id && e.pressure === "FIRE";
      expect(e.call.family, e.key).toBe(fireOverSky ? "FIRE_ZONE" : byId(e.coverage).family);
    }
  });
});

// --- the harness's host key ------------------------------------------------------------------------

/**
 * THE ARMS HARNESS'S HOST KEY (step 3.4), read off the call the engine is handed — the stream
 * carries no card id and no family. A call whose PRESSURE tag is not the Creeper keys on
 * (personnel, pressure word); every other call keys on (personnel, concept): bare coverages, the
 * Creeper, Prevent and both goal-line calls. The front is left out, because a pressure's front
 * need not be its host's (Double A is a Mug over an Over Cover 1). The arms harness, outside the
 * suite, states this same rule; this test is the proof that it resolves every call.
 */
function hostKey(call: DefensivePlayCall): string {
  const pressure = call.tags.find((t) => t.kind === "PRESSURE");
  return pressure !== undefined && pressure.id !== "CREEPER"
    ? `${call.personnel}|PRESSURE:${pressure.id}`
    : `${call.personnel}|CONCEPT:${call.concept}`;
}

describe("ADR-073 step 3.4 — the harness's host key resolves every call to its host", () => {
  const table = new Map<string, string>();
  const collisions: string[] = [];
  const add = (key: string, host: string): void => {
    const other = table.get(key);
    if (other !== undefined && other !== host) collisions.push(`${key}: ${other} and ${host}`);
    table.set(key, host);
  };
  for (const coverage of V6_COVERAGES) add(hostKey(callFor(coverage)), coverage.id);
  for (const spec of PRESSURE_SPECS) add(hostKey(callFor(composeCall(hostOf(spec), spec))), spec.over);

  const resolve = (call: DefensivePlayCall): string | undefined => table.get(hostKey(call));

  it("is unique over V6_COVERAGES, and no pressure's key is another host's", () => {
    const keys = V6_COVERAGES.map((c) => hostKey(callFor(c)));
    expect(new Set(keys).size).toBe(V6_COVERAGES.length);
    expect(collisions).toEqual([]);
    expect(table.size).toBe(V6_COVERAGES.length + PRESSURE_SPECS.length);
  });

  it("resolves each of the 22 cards to HOST_OF on every formation", () => {
    for (const card of DEFENSIVE_CARDS) {
      for (const formation of FORMATIONS) {
        expect(resolve(callFor(card, formation)), `${card.id} vs ${formation.id}`).toBe(HOST_OF[card.id]);
      }
    }
  });

  it.each(ENTRIES.map((e) => [e.key, e] as const))("resolves %s to its coverage, with or without a look", (key, e) => {
    expect(resolve(callFor(e.call)), key).toBe(e.coverage);
    for (const looks of legalLookCombinations(e.call)) {
      for (const draw of drawsOf(looks)) {
        expect(resolve(callFor(applyLooks(e.call, draw))), `${key} wearing ${looks.map((m) => m.id).join("+")}`).toBe(
          e.coverage,
        );
      }
    }
  });

  it("resolves Prevent (three rush) and both goal-line calls (five down, no word) by their concept", () => {
    expect(hostKey(callFor(byId("DEF_DIME_PREVENT")))).toBe("Dime|CONCEPT:Prevent");
    expect(hostKey(callFor(byId("DEF_GOAL_LINE_MAN")))).toBe("Goal Line|CONCEPT:Man");
    expect(hostKey(callFor(byId("DEF_GOAL_LINE_ZONE")))).toBe("Goal Line|CONCEPT:Zone");
    // The creeper keys on its concept, which is its host's.
    expect(hostKey(callFor(entry("DEF_BASE_COVER_3|CREEPER|NONE").call))).toBe("Base|CONCEPT:Cover 3");
  });
});
