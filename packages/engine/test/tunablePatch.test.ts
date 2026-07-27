/**
 * ADR-012 — THE NAMED SURFACE, AND THE PATCH INTERFACE THAT REPLACES AN EDIT.
 *
 * The amendment lets `@ff/calibration` import `@ff/engine` — one-directionally —
 * on the condition that the exception NAMES its permitted surface rather than
 * describing it, and that the barrel is trimmed to match in the same commit. "A
 * narrow rule alongside a wide export list is aspirational; the wide list is the
 * real contract. If the two ever disagree, the code wins."
 *
 * So the barrel itself is under test here, not merely documented. And the
 * tunables channel is a PATCH interface rather than a mutable ambient constant,
 * because `docs/design/calibration.md` §3.1 states the workflow that way:
 * *"proposals are patches, not edits: `{tunableId, currentValue, proposedValue,
 * evidence, expectedEffect}` filed as ADR petitions."*
 */
import { describe, expect, it } from "vitest";
import * as engine from "../src/index.js";
import { TUNABLES, applyTunablePatch, TunablePatchError } from "../src/tunables.js";
import type { TunablePatch } from "../src/tunables.js";

/** A well-formed petition against the value the ADR itself uses as its example. */
function patch(over: Partial<TunablePatch> = {}): TunablePatch {
  return {
    tunableId: "passRush.blockerStructuralAdvantage",
    currentValue: 15,
    proposedValue: 12,
    evidence: "reports/2024-pressure-rate.md",
    expectedEffect: "pressure rate +2pp, sack rate +0.5pp",
    ...over,
  };
}

describe("ADR-012 — the barrel is exactly the permitted surface", () => {
  /**
   * Verbatim, and asserted as a SET rather than a subset: an addition fails this
   * test as loudly as a removal does, which is the property the amendment needs.
   * Anything wider than this list is a border the next agent will reach through.
   */
  const PERMITTED: readonly string[] = [
    // 1. the simulation entry points — one play, and one whole game
    "simulatePlay",
    "simulatePassPlay",
    "simulateRunPlay",
    "simulateGame",
    // 1b. the two pure constructors a caller needs to BUILD the game entry
    //     point's arguments. `createMatchState` is the opening state;
    //     `deriveGameId` is the derivation FANTASY-GATE-PHASE1 §3.3 requires,
    //     and exporting it is what stops a consumer minting ids from a counter.
    "createMatchState",
    "deriveGameId",
    // 1c. the play-calling seam's minimal default. The interface is a type; a
    //     caller cannot run a game without SOME implementation, and calibration
    //     owns the real one (`calibration.md` §3.1).
    "defaultPlayCaller",
    // 2. the errors a caller distinguishes on (types are erased at runtime)
    "IncoherentPlayCallError",
    "UnsupportedPlayCallError",
    "GameLoopError",
    // 3. the tunables-PATCH interface — never the TUNABLES value
    "applyTunablePatch",
    "TunablePatchError",
    // 4. the §17 debug renderers — one play, and one game
    "renderPlay",
    "renderDriveChart",
    "renderGameSummary",
    "renderBoxScore",
    // 5. FIFTH CATEGORY, ratified as ADR-014 item 15 (an amendment to ADR-012
    //    §B): the statline reducer and the statline shapes it returns. Per
    //    FANTASY-GATE-PHASE1 §3.5 the box score must be a pure reduction of the
    //    stream, and the reducer is LOGIC so it cannot live in contracts
    //    (`contracts.md` §10). Without it here, calibration writes a second
    //    reducer over the same stream and the two drift.
    "reduceStatlines",
  ];

  it("exports these runtime values and no others", () => {
    expect(Object.keys(engine).sort()).toEqual([...PERMITTED].sort());
  });

  it("does NOT export the internals ADR-012 removed", () => {
    const removed = [
      // the mutable ambient tunables value — an edit channel, which is the thing
      // the patch workflow exists to replace
      "TUNABLES",
      // the band machinery: ADR-011 put bands in the stream so this is unneeded
      "bandFor",
      "tierFor",
      "actorAttrModifier",
      // registry access — attributes reach calibration through the stream
      "ATTR",
      "TRAIT",
      "resolveAttr",
      "resolveTrait",
      // a representative resolver from each subsystem that used to be exported
      "resolvePassRushTick",
      "resolveManCoverage",
      "resolveZoneCoverage",
      "advanceCarrier",
      "resolveTackleContest",
      "resolveAccuracy",
      "resolveCatch",
      "resolveRunBlock",
      "resolveRbVision",
      "pointOfAttackFor",
      "selectTarget",
      "resolveQbRead",
      "resolveScramble",
      "resolvePocketMovement",
      "eligibleRecoverers",
      "termModifiers",
      "assertCoherentPlayCall",
      "formatRoll",
      "isRunCall",
    ];
    for (const name of removed) {
      expect(Object.keys(engine), `${name} is still on the barrel`).not.toContain(name);
    }
  });

  it("the entry points and the renderer are callable through it", () => {
    expect(typeof engine.simulatePlay).toBe("function");
    expect(typeof engine.simulatePassPlay).toBe("function");
    expect(typeof engine.simulateRunPlay).toBe("function");
    expect(typeof engine.renderPlay).toBe("function");
    expect(typeof engine.applyTunablePatch).toBe("function");
  });
});

describe("applyTunablePatch — patches, not edits", () => {
  it("returns a NEW tunables object and never touches the one it was given", () => {
    const before = JSON.stringify(TUNABLES);
    const next = applyTunablePatch(TUNABLES, patch());
    expect(next).not.toBe(TUNABLES);
    expect(next.passRush.blockerStructuralAdvantage).toBe(12);
    // the argument is untouched, and so is the module's own constant
    expect(TUNABLES.passRush.blockerStructuralAdvantage).toBe(15);
    expect(JSON.stringify(TUNABLES)).toBe(before);
  });

  it("shares structure with the branches the patch did not name", () => {
    const next = applyTunablePatch(TUNABLES, patch());
    // Rewritten along the path...
    expect(next.passRush).not.toBe(TUNABLES.passRush);
    // ...and identical everywhere else, so a patched tunables is cheap and a
    // diff against it is meaningful.
    expect(next.ballCarrier).toBe(TUNABLES.ballCarrier);
    expect(next.qb).toBe(TUNABLES.qb);
  });

  it("reaches a leaf at any depth, including inside a band table", () => {
    const next = applyTunablePatch(
      TUNABLES,
      patch({
        tunableId: "ballCarrier.contests.secondLevel.bands.0.minMargin",
        currentValue: 15,
        proposedValue: 20,
      }),
    );
    expect(next.ballCarrier.contests.secondLevel.bands[0]?.minMargin).toBe(20);
    expect(next.ballCarrier.contests.secondLevel.bands[0]?.label).toBe("BROKEN_TACKLE");
    // the array is a copy, not a mutation of the original
    expect(TUNABLES.ballCarrier.contests.secondLevel.bands[0]?.minMargin).toBe(15);
  });

  it("folds: a list of petitions is a reduce, and the order does not matter", () => {
    const a = patch();
    const b = patch({ tunableId: "qb.throwThreshold", currentValue: 50, proposedValue: 55 });
    const both = [a, b].reduce(applyTunablePatch, TUNABLES);
    expect(both.passRush.blockerStructuralAdvantage).toBe(12);
    expect(both.qb.throwThreshold).toBe(55);
    expect(JSON.stringify([b, a].reduce(applyTunablePatch, TUNABLES))).toBe(JSON.stringify(both));
  });

  /**
   * The four rejections, all loud. A silently-ignored patch is a calibration
   * report about a simulation that never ran, which is the same class of error
   * as a mis-labelled event: everything downstream stays well-formed and wrong.
   */
  it("rejects a path that does not exist", () => {
    expect(() => applyTunablePatch(TUNABLES, patch({ tunableId: "passRush.nonesuch" }))).toThrow(
      TunablePatchError,
    );
    expect(() => applyTunablePatch(TUNABLES, patch({ tunableId: "nonesuch.at.all" }))).toThrow(
      /is not a path into TUNABLES/,
    );
    expect(() =>
      applyTunablePatch(TUNABLES, patch({ tunableId: "passRush.blockerStructuralAdvantage.deeper" })),
    ).toThrow(/is a leaf/);
    expect(() => applyTunablePatch(TUNABLES, patch({ tunableId: "" }))).toThrow(/empty/);
  });

  it("rejects a branch: a tunable is a value, not a subtree", () => {
    expect(() => applyTunablePatch(TUNABLES, patch({ tunableId: "passRush" }))).toThrow(
      /names a branch/,
    );
    expect(() => applyTunablePatch(TUNABLES, patch({ tunableId: "passRush.bands" }))).toThrow(
      /names a branch/,
    );
  });

  it("rejects a STALE patch — currentValue is the version check", () => {
    expect(() => applyTunablePatch(TUNABLES, patch({ currentValue: 99 }))).toThrow(
      /stale patch, re-measure before filing/,
    );
    // ...and says what it actually found, so the report can be re-run.
    expect(() => applyTunablePatch(TUNABLES, patch({ currentValue: 99 }))).toThrow(/is 15/);
  });

  it("rejects a proposal of the wrong primitive type", () => {
    expect(() => applyTunablePatch(TUNABLES, patch({ proposedValue: "twelve" }))).toThrow(
      /is a number; the patch proposes a string/,
    );
  });

  it("carries evidence and expectedEffect without interpreting either", () => {
    // They are the petition's prose. The engine records the shape and reads
    // neither — an engine that acted on "expectedEffect" would be tuning itself.
    const next = applyTunablePatch(TUNABLES, patch({ evidence: "", expectedEffect: "" }));
    expect(next.passRush.blockerStructuralAdvantage).toBe(12);
  });
});
