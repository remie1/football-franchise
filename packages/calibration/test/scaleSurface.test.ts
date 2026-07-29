/**
 * THE SCALE SURFACE GATE — free tier, runs on every push.
 *
 * The sweep itself is arithmetic over `DEFAULT_TUNABLES` and costs nothing, so unlike the band-table
 * gate there is no env-gated tier here. What is asserted:
 *
 *  1. **Coverage is total over `CheckKind`**, and the compiler already proves it (`SURFACE` is a
 *     `Record<CheckKind, …>`). The runtime assertion below is the belt to that braces: it pins the
 *     implemented/unimplemented split, so a check kind that acquires a producer cannot silently
 *     stay described as absent.
 *  2. **Every derived term source still resolves.** `termsOf` throws on a stale path rather than
 *     returning an empty stack, because an empty stack reads as "no attributes here" — a sorting
 *     sentinel in a different costume (Charter §4.1).
 *  3. **The flagged rows are pinned.** These are the findings. A row acquiring or losing a flag is
 *     a change to the audit's conclusions and must be deliberate.
 *
 * WHAT THIS CANNOT SEE, stated because §4.1 wants the class rather than the outcome: a DECLARED term
 * list (one whose terms live in resolver code rather than in `TUNABLES`) can drift. Adding a term to
 * `resolve/manCoverage.ts` would not redden anything here. The engine publishes `CHECK.testsAttrs`
 * and `knownTruth/attributeUsage.ts` already folds it, so a corpus CAN falsify a declared count —
 * that check is not wired here, and until it is, the declared rows are BOUNDED and the derived rows
 * are not.
 */
import { describe, expect, it } from "vitest";
import {
  SURFACE,
  renderScaleSurface,
  sweepScaleSurface,
  termsOf,
  type CheckDescriptor,
} from "../src/knownTruth/scaleSurface.js";

describe("scale surface", () => {
  it("describes every CheckKind, and pins which ones have no producer", () => {
    const unimplemented = Object.entries(SURFACE)
      .filter(([, d]) => (d as CheckDescriptor).form === "UNIMPLEMENTED")
      .map(([k]) => k)
      .sort();
    expect(unimplemented).toEqual(
      [
        "audible",
        "coin_toss",
        "communication",
        "coverage_read",
        "dline_tip",
        "fumble",
        "hold_decision",
        "kick_return",
        "option_route",
        "penalty_check",
        "punt",
        "qb_read",
        "route_break",
        "snap_jump",
        "unseen_defender",
      ].sort(),
    );
    expect(Object.keys(SURFACE)).toHaveLength(44);
  });

  it("resolves every derived term source against the committed tree", () => {
    for (const [kind, d] of Object.entries(SURFACE)) {
      const desc = d as CheckDescriptor;
      if (desc.form === "UNIMPLEMENTED") continue;
      expect(termsOf(desc.actor).length, `${kind} actor`).toBeGreaterThanOrEqual(0);
      if (desc.form === "OPPOSED") {
        expect(termsOf(desc.opponent).length, `${kind} opponent`).toBeGreaterThan(0);
      } else if (desc.targetTerms !== undefined) {
        expect(termsOf(desc.targetTerms).length, `${kind} target`).toBeGreaterThan(0);
      }
    }
  });

  it("pins the flagged rows — these ARE the audit's scale findings", () => {
    const flagged = sweepScaleSurface()
      .filter((r) => r.flags.length > 0)
      .map((r) => `${r.kind}:${[...r.flags].sort().join("+")}`)
      .sort();
    expect(flagged).toMatchInlineSnapshot(`
      [
        "anticipation:DIE_CANNOT_LOSE",
        "break_tackle:BOUNDARY_ON_FAT",
        "breakaway:BOUNDARY_ON_FAT",
        "deflection_quality:RATING_INERT",
        "deflection_recovery:DIE_CANNOT_LOSE",
        "field_goal:DIE_CANNOT_LOSE",
        "pass_rush_tick:BOUNDARY_ON_FAT",
        "pursuit_angle:DIE_CANNOT_LOSE+DIE_CANNOT_WIN",
      ]
    `);
  });

  it("prints the ranked table", () => {
    // Not an assertion — the report the backlog's Phase 3 deliverable asks for, emitted where a
    // reader of a CI log will see it rather than filed somewhere that rots.
    console.log(`\n${renderScaleSurface(sweepScaleSurface())}\n`);
    expect(sweepScaleSurface()).toHaveLength(44);
  });
});
