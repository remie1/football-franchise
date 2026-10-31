/**
 * ADR-091 M1 to M4 and ADR-092 R2 to R4: the quarterback's count, the stem on the defense's call,
 * the stem's record and the sideline's, what they allow and what they refuse.
 *
 * The `@ts-expect-error` lines fail `pnpm --filter @ff/contracts typecheck` (part of `pnpm verify`)
 * if an edit is loosened or lost; the runtime asserts only show the file ran. Contracts gain types
 * and comments only, so nothing here can change a stream.
 */
import { describe, expect, it } from "vitest";
import type {
  Cadence,
  CheckKind,
  DefensivePlayCall,
  GameId,
  MatchEvent,
  OffensivePlayCall,
  PlayId,
  PlayerId,
  RunPlayCall,
  SidelineAdjustmentPayload,
  StemCall,
  StemPayload,
  TeamId,
} from "../src/index.js";

const p = (id: string) => id as PlayerId;
const base = { gameId: "g" as GameId, playId: "g:play:7" as PlayId };

const stem: StemPayload = {
  kind: "STEM",
  trigger: p("mike"),
  movers: [p("le"), p("dt1"), p("dt2"), p("re")],
  cadence: "NORMAL",
  countRead: 41.5,
  timing: "EARLY",
  ending: "CAUGHT",
  snappedOnMovement: true,
  caught: [p("le"), p("dt1"), p("dt2"), p("re")],
  rollRef: "game:g/call:7/stem/timing",
};

describe("ADR-091 M1: the quarterback's count on the offense's call", () => {
  it("a pass and a run may each state one; absent is a normal count", () => {
    const pass: Pick<OffensivePlayCall, "cadence"> = { cadence: "HARD_COUNT" };
    const run: Pick<RunPlayCall, "cadence"> = { cadence: "QUICK" };
    const none: Pick<OffensivePlayCall, "cadence"> = {};
    // @ts-expect-error a count is NORMAL, QUICK or HARD_COUNT
    const silent: Cadence = "SILENT";
    // @ts-expect-error exactOptionalPropertyTypes: no `cadence: undefined`
    const undef: Pick<RunPlayCall, "cadence"> = { cadence: undefined };
    expect([pass.cadence, run.cadence, "cadence" in none]).toEqual(["HARD_COUNT", "QUICK", false]);
    expect([silent, undef].length).toBe(2);
  });
});

describe("ADR-091 M2: the stem on the defense's call", () => {
  it("names the stem and the Mike who calls it; step S-a plays the plain Stem only", () => {
    const call: Pick<DefensivePlayCall, "stem"> = { stem: { kind: "STEM", trigger: p("mike") } };
    // @ts-expect-error Stem Back joins at step S-d, with the picture it stems to
    const back: StemCall = { kind: "STEM_BACK", trigger: p("mike") };
    // @ts-expect-error a stem names who calls it
    const nobody: StemCall = { kind: "STEM" };
    expect(call.stem?.trigger).toBe("mike");
    expect([back, nobody].length).toBe(2);
  });
});

describe("ADR-091 M3 and ADR-092 R4: the new rolls", () => {
  it("are check kinds a CHECK may carry, beside communication's first producer", () => {
    const kinds: readonly CheckKind[] = [
      "stem_timing",
      "stem_shift",
      "snap_on_movement",
      "communication",
      "adjustment_notice",
      "adjustment_read",
      "habit_drop",
    ];
    // @ts-expect-error offside stays penalty_check, with step S-c
    const offside: CheckKind = "stem_offside";
    expect(new Set(kinds).size).toBe(7);
    expect(offside).toBeDefined();
  });
});

describe("ADR-091 M4 and ADR-092 R2: the STEM event", () => {
  it("is play-scoped and carries the count, the read at that snap, how it ended and who was caught", () => {
    const event: Extract<MatchEvent, { type: "STEM" }> = { type: "STEM", payload: stem, ...base };
    expect(event.payload.countRead).toBe(41.5);
    // @ts-expect-error a STEM is a play's: it carries a playId
    const loose: Extract<MatchEvent, { type: "STEM" }> = { type: "STEM", payload: stem, gameId: "g" as GameId };
    // @ts-expect-error a timing is ON_TIME, EARLY, CAUGHT or CALLED_OFF
    const late: StemPayload = { ...stem, timing: "LATE" };
    // @ts-expect-error exactOptionalPropertyTypes: a stem the quarterback was not asked about writes no key
    const undef: StemPayload = { ...stem, recalled: undefined };
    expect([loose, late, undef].length).toBe(3);
  });
});

describe("ADR-092 R3: the SIDELINE_ADJUSTMENT event", () => {
  const t = (id: string) => id as TeamId;
  it("records the film read, the halftime step and the offensive coordinator's change of count", () => {
    const film: SidelineAdjustmentPayload = {
      kind: "FILM_READ",
      defense: t("d"),
      offense: t("o"),
      quarterback: p("qb"),
      ceiling: 68,
      share: 0.5,
      countRead: 34,
    };
    const halftime: SidelineAdjustmentPayload = { kind: "HALFTIME", defense: t("d"), offense: t("o"), countRead: { before: 60, after: 62 } };
    const change: SidelineAdjustmentPayload = {
      kind: "CADENCE_CHANGE",
      defense: t("d"),
      offense: t("o"),
      noticeRef: "game:g/call:31/sideline/notice",
      newWord: { read: false, rollRef: "game:g/call:31/sideline/new-word" },
      hardCounts: 3,
      habit: { dropped: true, rollRef: "game:g/call:31/sideline/habit" },
      countRead: { before: 55, after: 30 },
    };
    const events: Extract<MatchEvent, { type: "SIDELINE_ADJUSTMENT" }>[] = [film, halftime, change].map((payload) => ({
      type: "SIDELINE_ADJUSTMENT",
      payload,
      ...base,
    }));
    expect(events.map((e) => e.payload.kind)).toEqual(["FILM_READ", "HALFTIME", "CADENCE_CHANGE"]);
    // @ts-expect-error a halftime step states the read before and after, not a ceiling
    const wrong: SidelineAdjustmentPayload = { kind: "HALFTIME", defense: t("d"), offense: t("o"), ceiling: 68 };
    expect(wrong).toBeDefined();
  });
});
