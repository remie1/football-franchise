/**
 * ADR-089 P2, P3 and P4: what the three edits allow and what they still refuse.
 *
 * The cases are type-level: the `@ts-expect-error` lines fail `pnpm --filter @ff/contracts
 * typecheck` (part of `pnpm verify`) if the edit is loosened or lost. The runtime asserts only
 * show the file ran. Contracts gain types and comments only, so nothing here can change a stream.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, PlayerId, ResultTier, RollDetail, RushApproach } from "../src/index.js";

type CheckPayload = Extract<MatchEvent, { type: "CHECK" }>["payload"];
type ThreatPayload = Extract<MatchEvent, { type: "RUSH_THREAT" }>["payload"];

const p = "p1" as PlayerId;
const tier: ResultTier = "TIE";
const d100: RollDetail = { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: "g/rush/t0.5/p1:jitter" };

describe("ADR-089 P2: the pass_rush_beat CHECK and its uniform", () => {
  it("records one uniform in (0, 1] as raw and total, with no modifiers", () => {
    const u: RollDetail = { die: "uniform", raw: 0.734, modifiers: [], total: 0.734, rngLabel: "g/rush/beat/g/rush/p1:rep" };
    const beat: CheckPayload = { checkKind: "pass_rush_beat", actors: [p], roll: u, tier, margin: 7, testsAttrs: [], rollRef: "g/rush/p1:rep" };
    expect(beat.checkKind).toBe("pass_rush_beat");
    expect(u.raw).toBe(u.total);
  });
});

describe("ADR-089 P3: CHECK.roll is optional for pass_rush_tick only", () => {
  it("a pass_rush_tick may carry no roll (shape S), and today's tick still carries both", () => {
    const dieless: CheckPayload = { checkKind: "pass_rush_tick", actors: [p], tier, margin: 0, testsAttrs: [], band: "STALEMATE", rollRef: "g/rush/beat/g/rush/p1:rep" };
    const today: CheckPayload = { checkKind: "pass_rush_tick", actors: [p], roll: d100, opposedRoll: d100, tier, margin: 3, testsAttrs: [], band: "RUSHER_GAINING", rollRef: "g/rush/p1:rep" };
    expect("roll" in dieless).toBe(false);
    expect("roll" in today).toBe(true);
  });

  it("every other kind still needs its roll, written or read", () => {
    // @ts-expect-error a blitz_pickup CHECK without a roll does not compile
    const pickup: CheckPayload = { checkKind: "blitz_pickup", actors: [p], tier, margin: 0, testsAttrs: [] };
    // @ts-expect-error nor does a pass_rush_rep without one
    const rep: CheckPayload = { checkKind: "pass_rush_rep", actors: [p], tier, margin: 0, testsAttrs: [] };
    const read = (c: CheckPayload): string => (c.checkKind === "blitz_pickup" ? c.roll.rngLabel : "");
    expect([pickup, rep].length).toBe(2);
    expect(read({ checkKind: "blitz_pickup", actors: [p], roll: d100, tier, margin: 0, testsAttrs: [] })).toBe(d100.rngLabel);
  });

  it("a dieless tick carries no opposedRoll and always names its beat", () => {
    // @ts-expect-error a pass_rush_tick with an opposedRoll but no roll does not compile
    const half: CheckPayload = { checkKind: "pass_rush_tick", actors: [p], opposedRoll: d100, tier, margin: 0, testsAttrs: [], rollRef: "g/rush/beat/g/rush/p1:rep" };
    // @ts-expect-error nor does a dieless tick that names no beat
    const orphan: CheckPayload = { checkKind: "pass_rush_tick", actors: [p], tier, margin: 0, testsAttrs: [] };
    // @ts-expect-error exactOptionalPropertyTypes: roll: undefined is refused, so a legacy tick can never carry the key with no value
    const undef: CheckPayload = { checkKind: "pass_rush_tick", actors: [p], roll: undefined, tier, margin: 0, testsAttrs: [], rollRef: "g/rush/beat/g/rush/p1:rep" };
    const ref = (c: CheckPayload): string => (c.roll === undefined ? c.rollRef : c.roll.rngLabel);
    expect([half, orphan, undef].length).toBe(3);
    expect(ref({ checkKind: "pass_rush_tick", actors: [p], tier, margin: 0, testsAttrs: [], rollRef: "beat" })).toBe("beat");
  });
});

describe("ADR-089 P4: RUSH_THREAT.approach", () => {
  it("a threat may say how he got there; a legacy threat writes no key", () => {
    const approach: RushApproach = "PUSH";
    const legacy: ThreatPayload = { rusher: p, alignment: "INTERIOR", origin: "WON_REP", rollRef: d100.rngLabel, etaTick: 2, state: "TRAVELLING" };
    const withApproach: ThreatPayload = { ...legacy, approach };
    // @ts-expect-error exactOptionalPropertyTypes: approach: undefined is refused, so legacy writes no key
    const undef: ThreatPayload = { ...legacy, approach: undefined };
    expect(Object.keys(legacy)).not.toContain("approach");
    expect(withApproach.approach).toBe("PUSH");
    // @ts-expect-error a threat is never BLOCKED
    const blocked: ThreatPayload = { ...legacy, approach: "BLOCKED" };
    expect(undef).toBeDefined();
    expect(blocked).toBeDefined();
  });
});
