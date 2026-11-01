/**
 * ADR-093 F4 (step 1): the officials' two rolls, `official_sees` and `phantom_flag`: CHECKs, never
 * pre-snap reads, that always name the `penalty_check` they judge, state their chance and are never
 * opposed. No `penalty_check` is a pre-snap read either.
 *
 * Type-level, as the other ADR-093 files are: the `@ts-expect-error` lines and the pins
 * (`typePins.ts`) fail `pnpm --filter @ff/contracts typecheck` if the edit is loosened or lost.
 * Nothing rolls for the officials at step 1, so nothing here can change a stream.
 */
import { describe, expect, it } from "vitest";
import type { CheckKind, MatchEvent, PlayerId, RollDetail } from "../src/index.js";
import type { Is, OptionalKeys } from "./typePins.js";

type CheckPayload = Extract<MatchEvent, { type: "CHECK" }>["payload"];
type OfficialsCheck = Extract<CheckPayload, { checkKind: "official_sees" | "phantom_flag" }>;
type PresnapPayload = Extract<MatchEvent, { type: "PRESNAP_READ" }>["payload"];

const p = "p1" as PlayerId;
const ref = "g1/play:12/penalty:p1";
const d100: RollDetail = { die: "d100", raw: 60, modifiers: [], total: 60, rngLabel: "g1/play:12/officials:p1" };

describe("ADR-093 F4: the officials' two rolls", () => {
  // A hold in the crowd, seen 2 in 3 (§5.2): a d100 of 60 against 34 makes it by 26, so it is flagged.
  const sees: OfficialsCheck = {
    checkKind: "official_sees", actors: [p], roll: d100, target: 34, tier: "STRONG_SUCCESS", margin: 26, testsAttrs: [], rollRef: ref,
  };

  it("each carries a die, names the penalty_check it judges, states its chance and tests no rating", () => {
    const kinds: CheckKind[] = ["official_sees", "phantom_flag"];
    // A near-foul's wrong-flag roll: the same 60 against 95 misses by 35, so no flag is thrown.
    const phantom: OfficialsCheck = { ...sees, checkKind: "phantom_flag", target: 95, margin: -35, tier: "DECISIVE_FAILURE" };
    const general: CheckPayload = sees;
    expect(kinds).toHaveLength(2);
    expect(JSON.parse(JSON.stringify([sees, phantom]))).toEqual([sees, phantom]);
    expect(general.rollRef).toBe(ref);
  });

  it("refuses an official's roll without the check it judges, its chance or its die, an opposed one, and a near spelling", () => {
    // @ts-expect-error an official's roll names the penalty_check it judges
    const noRef: CheckPayload = { checkKind: "official_sees", actors: [p], roll: d100, target: 34, tier: "STRONG_SUCCESS", margin: 26, testsAttrs: [] };
    // @ts-expect-error and states its chance
    const noTarget: CheckPayload = { checkKind: "phantom_flag", actors: [p], roll: d100, tier: "DECISIVE_FAILURE", margin: -35, testsAttrs: [], rollRef: ref };
    // @ts-expect-error and records its roll (ADR-004); only a pass_rush_tick may lack one
    const dieless: CheckPayload = { checkKind: "official_sees", actors: [p], target: 34, tier: "STRONG_SUCCESS", margin: 26, testsAttrs: [], rollRef: ref };
    // @ts-expect-error the kind is official_sees
    const misspelled: CheckPayload = { checkKind: "officials_see", actors: [p], roll: d100, target: 34, tier: "STRONG_SUCCESS", margin: 26, testsAttrs: [], rollRef: ref };
    // @ts-expect-error and is never opposed: officials have no ratings to roll against
    const opposed: CheckPayload = { checkKind: "official_sees", actors: [p], roll: d100, opposedRoll: d100, target: 34, tier: "STRONG_SUCCESS", margin: 26, testsAttrs: [], rollRef: ref };
    const pins: true[] = [
      true as Is<Extract<OptionalKeys<OfficialsCheck>, "rollRef" | "target" | "roll">, never>,
      true as Is<Required<OfficialsCheck>["opposedRoll"], never>,
      // No kind sits in both the officials' arm and the general one, which takes it with no rollRef or target.
      true as Is<Extract<Exclude<CheckPayload, OfficialsCheck | { roll?: never }>["checkKind"], OfficialsCheck["checkKind"]>, never>,
    ];
    expect([noRef, noTarget, dieless, misspelled, opposed]).toHaveLength(5);
    expect(pins).toHaveLength(3);
  });

  it("is always a CHECK: a pre-snap read takes every kind but the foul roll and the officials' two", () => {
    const read: PresnapPayload = { actor: p, kind: "coverage_read", roll: d100, target: 34, tier: "STRONG_SUCCESS" };
    // @ts-expect-error the officials' roll on a false start is still a CHECK, naming its penalty_check
    const early: PresnapPayload = { ...read, kind: "official_sees" };
    // @ts-expect-error and so is the false start's own foul roll, the CHECK its foul, its flag and the officials name
    const foulRoll: PresnapPayload = { ...read, kind: "penalty_check" };
    const pin: true = true as Is<Extract<PresnapPayload["kind"], OfficialsCheck["checkKind"] | "penalty_check">, never>;
    expect([read.kind, early.kind, foulRoll.kind]).toEqual(["coverage_read", "official_sees", "penalty_check"]);
    expect(pin).toBe(true);
  });

  it("leaves every other CHECK as it was: a field goal still names no prior roll", () => {
    const kick: CheckPayload = { checkKind: "field_goal", actors: [p], roll: d100, target: 50, tier: "SUCCESS", margin: 10, testsAttrs: [] };
    expect("rollRef" in kick).toBe(false);
  });
});
