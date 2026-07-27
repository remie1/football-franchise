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
    // 3. the tunables-PATCH interface. Never the MUTABLE ambient constant —
    //    but, since ADR-016 item 2 amended ADR-012 §B category 3, the DEEPLY
    //    FROZEN one, because `applyTunablePatch(base, patch)` had no reachable
    //    first argument from outside the package and the workflow the amendment
    //    ratified was therefore uninvokable by the consumer it exists for.
    "applyTunablePatch",
    "DEFAULT_TUNABLES",
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
      // the MUTABLE ambient tunables value — an edit channel, which is the thing
      // the patch workflow exists to replace. `DEFAULT_TUNABLES` is the same
      // object under a different name and is permitted (ADR-016 item 2), because
      // it is frozen to the leaves and so is not a channel; the bare name stays
      // off the barrel so that "the writable one" has no export at all.
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

/**
 * ADR-016 ITEM 2 — THE BASE A PATCH IS A PATCH OF, AND WHY FREEZING IT DEEPLY IS
 * THE WHOLE OF THE ARGUMENT.
 *
 * ADR-012 kept the tunables value off the barrel because "a mutable ambient
 * constant exported across a package boundary is an edit channel". The objection
 * was to the CHANNEL, not to the value — and a shallow `Object.freeze` would
 * leave the objection standing in full, because `TUNABLES` is a deeply nested
 * tree and everything worth editing lives three or four levels down. Sealing
 * thirteen top-level keys while every band table, every term list and every
 * block beneath them stays writable is not a smaller edit channel; it is the
 * same one with a locked front door.
 *
 * So the assertions below reach for LEAVES, and they assert on the VALUE rather
 * than on a thrown error: a write to a frozen object throws `TypeError` in
 * strict-mode ESM and silently no-ops in sloppy mode, and "the number did not
 * change" is the property in both worlds.
 */
describe("ADR-016 item 2 — DEFAULT_TUNABLES is the constant itself, frozen to the leaves", () => {
  /**
   * Attempt a write the way a consumer reaching across the boundary would, and
   * swallow the strict-mode `TypeError` so the caller can assert on the value.
   * Typed through `Record<string, unknown>` rather than `any`: the point is to
   * defeat `readonly`, not to defeat the type checker generally.
   */
  function attemptWrite(node: unknown, key: string, value: unknown): void {
    try {
      (node as Record<string, unknown>)[key] = value;
    } catch {
      // Frozen + strict mode. Expected on exactly the objects under test.
    }
  }

  it("is the module constant, not a copy — so the default and the base cannot drift", () => {
    // If this were a structural clone, the entry points' default and the value
    // calibration measures a patch against would be two objects that agree
    // today and diverge on whichever one the next edit lands in.
    expect(engine.DEFAULT_TUNABLES).toBe(TUNABLES);
  });

  it("is frozen at the root", () => {
    expect(Object.isFrozen(engine.DEFAULT_TUNABLES)).toBe(true);
    attemptWrite(engine.DEFAULT_TUNABLES, "qb", { throwThreshold: 0 });
    expect(engine.DEFAULT_TUNABLES.qb.throwThreshold).toBe(50);
  });

  it("is frozen at every depth a shallow freeze would have missed", () => {
    // One node per level, down to a band inside a band table inside a contest
    // inside a block. A shallow freeze passes the first of these and fails the
    // rest, which is exactly what this test exists to tell apart.
    const t = engine.DEFAULT_TUNABLES;
    expect(Object.isFrozen(t.ballCarrier)).toBe(true);
    expect(Object.isFrozen(t.ballCarrier.contests)).toBe(true);
    expect(Object.isFrozen(t.ballCarrier.contests.secondLevel)).toBe(true);
    expect(Object.isFrozen(t.ballCarrier.contests.secondLevel.bands)).toBe(true);
    expect(Object.isFrozen(t.ballCarrier.contests.secondLevel.bands[0])).toBe(true);
  });

  it("a nested LEAF cannot be written: a band's minMargin", () => {
    const band = engine.DEFAULT_TUNABLES.ballCarrier.contests.secondLevel.bands[0];
    expect(band?.minMargin).toBe(15);
    attemptWrite(band, "minMargin", 999);
    attemptWrite(band, "label", "FREE_YARDS");
    expect(engine.DEFAULT_TUNABLES.ballCarrier.contests.secondLevel.bands[0]?.minMargin).toBe(15);
    expect(engine.DEFAULT_TUNABLES.ballCarrier.contests.secondLevel.bands[0]?.label).toBe(
      "BROKEN_TACKLE",
    );
  });

  it("a TERM LIST cannot be edited, replaced, or grown", () => {
    const terms = engine.DEFAULT_TUNABLES.pocketMovement.appeal.standIn.terms;
    expect(terms[0]?.attr).toBe("poise");
    expect(terms[0]?.divisor).toBe(2);
    // the entry's fields...
    attemptWrite(terms[0], "attr", "speed");
    attemptWrite(terms[0], "divisor", 0.5);
    // ...the slot the entry sits in...
    attemptWrite(terms, "0", { attr: "speed", divisor: 0.5 });
    // ...and the array's own length.
    try {
      (terms as unknown as unknown[]).push({ attr: "speed", divisor: 1 });
    } catch {
      // Frozen array in strict mode.
    }
    const after = engine.DEFAULT_TUNABLES.pocketMovement.appeal.standIn.terms;
    expect(after.length).toBe(2);
    expect(after[0]?.attr).toBe("poise");
    expect(after[0]?.divisor).toBe(2);
  });

  it("the ADR-012 example value survives a direct assignment through the barrel", () => {
    attemptWrite(engine.DEFAULT_TUNABLES.passRush, "blockerStructuralAdvantage", 12);
    expect(engine.DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage).toBe(15);
  });

  /**
   * The capability the item exists for, exercised the way calibration will: a
   * base obtained from the barrel, a patch applied to it, a new tunables handed
   * to an entry point. Before this export, the first argument was unobtainable
   * from outside the package and none of this composed.
   */
  it("is a usable first argument to applyTunablePatch, and the result is writable", () => {
    const next = engine.applyTunablePatch(engine.DEFAULT_TUNABLES, patch());
    expect(next).not.toBe(engine.DEFAULT_TUNABLES);
    expect(next.passRush.blockerStructuralAdvantage).toBe(12);
    expect(engine.DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage).toBe(15);
    // A patched copy is a fresh object along the rewritten path — the freeze is
    // a property of the BUILD's tunables, not a property every Tunables carries.
    expect(Object.isFrozen(next.passRush)).toBe(false);
    // ...and the branches it did not name are still the frozen originals.
    expect(next.ballCarrier).toBe(engine.DEFAULT_TUNABLES.ballCarrier);
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
