/**
 * ADR-089 P2 to P8 and P17: what the edits allow and what they still refuse.
 *
 * The cases are type-level: the `@ts-expect-error` lines fail `pnpm --filter @ff/contracts
 * typecheck` (part of `pnpm verify`) if the edit is loosened or lost. The runtime asserts only
 * show the file ran. Contracts gain types and comments only, so nothing here can change a stream.
 */
import { describe, expect, it } from "vitest";
import { attrId } from "../src/ids.js";
import type { ContactFrom, MatchEvent, PlayerId, QbHitPhase, ResultTier, RollDetail, RushApproach } from "../src/index.js";

type CheckPayload = Extract<MatchEvent, { type: "CHECK" }>["payload"];
type ThreatPayload = Extract<MatchEvent, { type: "RUSH_THREAT" }>["payload"];
type PresnapPayload = Extract<MatchEvent, { type: "PRESNAP_READ" }>["payload"];
type QbHitPayload = Extract<MatchEvent, { type: "QB_HIT" }>["payload"];
type ThrowPayload = Extract<MatchEvent, { type: "THROW" }>["payload"];

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

describe("ADR-089 P5: RUSH_THREAT.distanceYards and closingSpeed", () => {
  it("a threat may carry the pair; a threat without it writes neither key", () => {
    const plain: ThreatPayload = { rusher: p, alignment: "EDGE", origin: "UNBLOCKED", rollRef: "g/presnap/recognition", etaTick: 2.4, state: "TRAVELLING", approach: "FREE" };
    const withPair: ThreatPayload = { ...plain, distanceYards: 11.25, closingSpeed: 4.69 };
    // @ts-expect-error exactOptionalPropertyTypes: distanceYards: undefined is refused, so a threat without the pair writes no key
    const undefDistance: ThreatPayload = { ...plain, distanceYards: undefined };
    // @ts-expect-error nor closingSpeed: undefined
    const undefSpeed: ThreatPayload = { ...plain, closingSpeed: undefined };
    // @ts-expect-error yards are a number
    const text: ThreatPayload = { ...plain, distanceYards: "11.25" };
    expect(Object.keys(plain)).not.toContain("distanceYards");
    expect(Object.keys(plain)).not.toContain("closingSpeed");
    expect([withPair.distanceYards, withPair.closingSpeed]).toEqual([11.25, 4.69]);
    expect([undefDistance, undefSpeed, text].length).toBe(3);
  });
});

describe("ADR-089 P17: a late block's rolled tick on shape L", () => {
  it("carries both dice and names its touching CHECK by rollRef", () => {
    const rb = "rb1" as PlayerId;
    const late: CheckPayload = {
      checkKind: "pass_rush_tick", actors: [p, rb], tier, margin: 4, testsAttrs: [], band: "STALEMATE",
      roll: { ...d100, rngLabel: "g/rush/t1.0/p1:late" },
      opposedRoll: { ...d100, rngLabel: "g/rush/t1.0/rb1:late:p1" },
      rollRef: "g/presnap/pickup/p1",
    };
    expect(late.rollRef).toBe("g/presnap/pickup/p1");
  });
});

describe("ADR-089 P6: the arrival_contest CHECK", () => {
  const qb = "qb1" as PlayerId;
  it("a rated :contest carries both faces on their own labels; a :contest2 carries one die and no opposedRoll", () => {
    const contest: CheckPayload = {
      checkKind: "arrival_contest", actors: [p, qb], tier, margin: 6, target: 5, band: "RUSHER_SACKS",
      roll: { ...d100, raw: 60, total: 82, rngLabel: "g/pass/t2.4/p1:contest" },
      opposedRoll: { ...d100, raw: 40, total: 76, rngLabel: "g/pass/t2.4/qb1:contest:p1" },
      testsAttrs: ["tackling", "speed", "strength", "agility"].map(attrId),
    };
    const contest2: CheckPayload = {
      checkKind: "arrival_contest", actors: [p, qb], tier, margin: -3, target: 15, band: "QB_SHEDS",
      roll: { ...d100, raw: 12, total: 12, rngLabel: "g/pass/t3.1/p1:contest2" },
      testsAttrs: [],
    };
    expect(contest.roll?.rngLabel).not.toBe(contest.opposedRoll?.rngLabel);
    expect("opposedRoll" in contest2).toBe(false);
  });

  it("a PRESNAP_READ is never an arrival_contest", () => {
    const read: PresnapPayload = { actor: p, kind: "qb_read", roll: d100, target: 50, tier };
    // @ts-expect-error arrival_contest happens only after the snap
    const contest: PresnapPayload = { actor: p, kind: "arrival_contest", roll: d100, target: 50, tier };
    expect([read, contest].length).toBe(2);
  });
});

describe("ADR-089 P7: QB_HIT, QbHitPhase and ContactFrom", () => {
  const qb = "qb1" as PlayerId;
  const base: QbHitPayload = { qb, rusher: p, phase: "THROWING", contactSeconds: 2.731 };
  it("each of the four phases type-checks", () => {
    const phases: QbHitPhase[] = ["ARRIVAL", "THROWING", "SHED", "SACK"];
    const from: ContactFrom = "BEHIND";
    const hits: QbHitPayload[] = phases.map((phase) => ({
      ...base, phase, approach: "ARC", from, seen: true,
      ...(phase === "SHED" || phase === "SACK" ? { rollRef: "g/pass/t2.4/p1:contest" } : {}),
    }));
    expect(hits.map((h) => h.phase)).toEqual(phases);
  });

  it("a phase outside the union is refused", () => {
    // @ts-expect-error STRIP is not a QB_HIT phase
    const strip: QbHitPayload = { ...base, phase: "STRIP" };
    // @ts-expect-error nor is TOP a ContactFrom
    const top: ContactFrom = "TOP";
    expect([strip, top].length).toBe(2);
  });

  it("contactSeconds is required; the rest may be absent and refuse undefined", () => {
    // @ts-expect-error contactSeconds is required
    const noTime: QbHitPayload = { qb, rusher: p, phase: "ARRIVAL" };
    expect(Object.keys(base)).toEqual(["qb", "rusher", "phase", "contactSeconds"]);
    // @ts-expect-error exactOptionalPropertyTypes: rollRef: undefined is refused
    const r: QbHitPayload = { ...base, rollRef: undefined };
    // @ts-expect-error nor approach: undefined
    const a: QbHitPayload = { ...base, approach: undefined };
    // @ts-expect-error nor from: undefined
    const f: QbHitPayload = { ...base, from: undefined };
    // @ts-expect-error nor seen: undefined
    const sn: QbHitPayload = { ...base, seen: undefined };
    const blocked: QbHitPayload = { ...base, phase: "SHED", approach: "BLOCKED", rollRef: "g/pass/t2.4/p1:contest" };
    expect([noTime, r, a, f, sn, blocked].length).toBe(6);
  });
});

describe("ADR-089 P8: THROW.releaseSeconds", () => {
  it("a THROW may carry its release time; a THROW without it writes no key", () => {
    const plain: ThrowPayload = { target: p, throwType: "BULLET", accuracyTier: tier, rollRef: "g/pass/t2.4/qb1:accuracy" };
    const timed: ThrowPayload = { ...plain, releaseSeconds: 2.731 };
    // @ts-expect-error exactOptionalPropertyTypes: releaseSeconds: undefined is refused
    const undef: ThrowPayload = { ...plain, releaseSeconds: undefined };
    // @ts-expect-error seconds are a number
    const text: ThrowPayload = { ...plain, releaseSeconds: "2.731" };
    expect(Object.keys(plain)).not.toContain("releaseSeconds");
    expect(Object.keys(timed).at(-1)).toBe("releaseSeconds");
    expect([undef, text].length).toBe(2);
  });
});
