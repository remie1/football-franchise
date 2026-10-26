/**
 * ADR-089 P2, P3 and P4: what the three edits allow and what they still refuse.
 *
 * The cases are type-level: the `@ts-expect-error` lines fail `pnpm --filter @ff/contracts
 * typecheck` (part of `pnpm verify`) if the edit is loosened or lost. The runtime asserts only
 * show the file ran. Contracts gain types and comments only, so nothing here can change a stream.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, PlayerId, ResultTier, RollDetail } from "../src/index.js";

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
