/**
 * KNOWN-TRUTH GATE — the pocket-status ladder. Charter §4.1's first instance.
 *
 *   > *"an ordered enum whose order carries meaning gets a monotonicity gate."*
 *
 * The reasoning, the two tiers, the axis choices and the tolerance rule are in
 * `src/knownTruth/pocketLadder.ts`. This file is the assertions.
 *
 * ================== IT IS A DIFFERENT SHAPE FROM ITS FIVE PEERS, DELIBERATELY ==================
 *
 * `knownTruth.<attribute scenario>.test.ts` ladders an ATTRIBUTE and asserts that the outcome
 * MOVES: monotone AND at least `minEffect`. This one ladders a STATUS and asserts that the
 * outcome does not move BACKWARDS: monotone, with no effect floor at all. A worse pocket that
 * produces exactly the same outcome is a finding for a sensitivity report, not a defect — but a
 * worse pocket that produces a BETTER one is a broken ladder whatever its size.
 *
 * So it does not go through `gateFor`, and `knownTruth.test.ts`'s file guard has been widened to
 * know that this second family exists rather than left to be silently satisfied by a filename
 * that does not match its pattern.
 *
 * ================== COST ==================
 *
 * Tier A is free. Tier B is 4 rungs × 160 games = 640 games since ADR-033 took `SACK` off the
 * ladder — it was 5 rungs × 800 games, measured at 33.6s on this repo, against `db-coverage`'s
 * ~90s — and Vitest parallelises FILES, so the package's wall clock is the longest file and
 * barely moves for this gate (`knownTruthGate.ts` has the argument).
 * MEASURED, not asserted: the package ran 95.8s with this file and ~92s without it, and the
 * whole 800 games cost 3.8s of wall clock because they ran beside `db-coverage` rather than
 * after it. That is why the gate is in the default suite rather than env-gated behind `FF_*`
 * like the sweeps. The rung the ladder lost gave that headroom back rather than spending it.
 *
 * IF IT EVER EXCEEDS `db-coverage`, §22c's answer is to split the suite — the fast files on
 * every push, the long ones on a schedule. Never a smaller `n`, and never a wider tolerance.
 * The headroom is real but finite: this file may grow to ~90s before it costs anything, and the
 * NEXT ordered-enum gate spends the same headroom, not a fresh one.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  DIAGNOSTIC_MEASURES,
  LADDER_TABLES,
  POCKET_STATUS_LADDER_SCENARIO as SCENARIO,
  SIZING_DEFECT,
  ladderTableFindings,
  pocketLadderFailures,
  pocketStatusLadder,
  renderTableFindings,
  runPocketLadder,
  rusherAheadBands,
  severityOf,
  tunablesForRung,
  tunablesWithSizingDefect,
} from "../src/knownTruth/pocketLadder.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("pocket-status ladder — TIER A, the ladder's own tables", () => {
  it("is monotone in severity in every table keyed by pocket status", () => {
    const findings = ladderTableFindings(DEFAULT_TUNABLES);
    expect(
      findings.length,
      `\n${renderTableFindings(findings)}\n\n` +
        `Charter §4.1. \`pocket.severity\` claims its ${pocketStatusLadder().length} states are ` +
        `ordered by urgency and ` +
        `every mechanic downstream reads the claim. A table that disagrees with it makes a ` +
        `pocket the engine has labelled WORSE less constraining than one it has labelled ` +
        `BETTER — which is not a tuning question, it is the ladder contradicting itself.\n` +
        `Fixing this belongs to \`packages/engine\`; calibration files the evidence.`,
    ).toBe(0);
  });

  it("enumerates every status-keyed table the engine has, so a new one cannot go ungated", () => {
    // The hand-written `LADDER_TABLES` list is the liability this closes. Anything in the
    // tunables tree whose OWN KEY SET is exactly the ladder is a status-keyed table, and if it
    // is not in the list then nothing checks its ordering.
    //
    // It does not subsume the list: `pocket.thresholds` is an ARRAY of `{label, minProgress}`
    // and `arrival.*WithinSeconds` is three scalar fields, so neither is discoverable this way.
    // The walk catches the shape that is easy to add; the list catches the shape that is easy
    // to miss.
    const ladder = new Set<string>(pocketStatusLadder());
    const listed = new Set(LADDER_TABLES.map((t) => t.path));
    const found: string[] = [];
    const seen = new Set<unknown>();
    const walk = (node: unknown, path: string): void => {
      if (typeof node !== "object" || node === null || seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) {
        for (const [i, child] of node.entries()) walk(child, `${path}[${i}]`);
        return;
      }
      const keys = Object.keys(node as Record<string, unknown>);
      if (keys.length === ladder.size && keys.every((k) => ladder.has(k))) found.push(path);
      for (const [k, child] of Object.entries(node as Record<string, unknown>)) {
        walk(child, path === "" ? k : `${path}.${k}`);
      }
    };
    walk(DEFAULT_TUNABLES, "");

    // `pocket.severity` IS the ladder's definition. Checking it against itself is vacuous.
    const unlisted = found.filter((p) => p !== "pocket.severity" && !listed.has(p));
    expect(
      unlisted,
      `these tunables tables are keyed by PocketStatus and are not in LADDER_TABLES, so nothing ` +
        `asserts that they agree with pocket.severity's order: ${unlisted.join(", ")}. Add each ` +
        `to LADDER_TABLES with the rule its ordering means, or state why its order is free.`,
    ).toEqual([]);
    // …and the walk must have found the ones we know about, or it has stopped working.
    expect(found).toContain("pocket.severity");
    expect(found).toContain("pocket.accuracyModifier");
    expect(found).toContain("pocket.readCapacityDelta");
  });

  it("derives the ladder from the engine rather than restating it", () => {
    const ladder = pocketStatusLadder();
    expect(ladder.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < ladder.length; i++) {
      const previous = ladder[i - 1];
      const current = ladder[i];
      if (previous === undefined || current === undefined) continue;
      expect(severityOf(current)).toBeGreaterThan(severityOf(previous));
    }
    expect(() => severityOf("NOT_A_STATUS")).toThrow(/pocket.severity/);
  });
});

// ===========================================================================
// THE TOLERANCE RULE, AS AN ASSERTION. Free — reads recorded numbers, runs no batches.
// Same purpose as `knownTruth.test.ts`'s three: the cheapest green for a red ladder is to widen
// the tolerance until it cannot fail, and these make that edit a visible falsification instead
// of a plausible tweak.
// ===========================================================================

describe("pocket-status ladder — the tolerance rule", () => {
  it("records one measured step, with an SD, for every step of every axis", () => {
    const steps = pocketStatusLadder().length - 1;
    for (const m of SCENARIO.measures) {
      expect(m.recordedSteps, `"${m.id}" records ${m.recordedSteps.length} of ${steps} steps`)
        .toHaveLength(steps);
      expect(m.recordedStepSD, `"${m.id}" records ${m.recordedStepSD.length} of ${steps} SDs`)
        .toHaveLength(steps);
      for (const sd of m.recordedStepSD) expect(sd).toBeGreaterThan(0);
      expect(m.tolerance).toBeGreaterThan(0);
    }
  });

  it("keeps every tolerance under half the inversion it exists to catch — the SIGNAL margin", () => {
    // `scenarios.ts` uses "half the smallest TRUE STEP". That rule degenerates here: this ladder
    // asserts a NON-STRICT ordering, most of its true steps are legitimately ~0, and half of zero
    // is a coin flip. The replacement is half the smallest inversion the axis must CATCH, and
    // every target is a measured red rather than an aspiration.
    for (const m of SCENARIO.measures) {
      expect(
        m.sensitivityTarget,
        `"${m.id}" names no inversion it is required to catch, so its tolerance is unfalsifiable`,
      ).toBeGreaterThan(0);
      expect(
        m.tolerance,
        `"${m.id}" tolerates ${m.tolerance} against a recorded inversion of ` +
          `${m.sensitivityTarget}. A tolerance above half the defect it polices cannot catch ` +
          `that defect. Raise \`games\` or strengthen the probe — never widen the tolerance.`,
      ).toBeLessThanOrEqual(m.sensitivityTarget / 2);
    }
  });

  it("keeps every step at least four SD clear of its tolerance — the NOISE margin", () => {
    // Written on the SIGNED step, so it still means something when the step is zero: a flat step
    // contributes `tolerance / SD` and the rule reduces to `tolerance ≥ 4 SD`.
    //
    // ONE definition of "inverted" across this whole file, and it is `step < −tolerance`. A step
    // recorded at −0.00007 against a tolerance of 0.025 is a FLAT step that happened to measure
    // microscopically negative, and it must satisfy this rule; the recorded inversion is
    // policed by the signal margin instead, because 4σ on the defect itself is not the property
    // that keeps the gate from flaking.
    for (const m of SCENARIO.measures) {
      for (const [i, step] of m.recordedSteps.entries()) {
        if (step < -m.tolerance) continue;
        const sd = m.recordedStepSD[i] ?? Number.POSITIVE_INFINITY;
        const margin = (step + m.tolerance) / sd;
        expect(
          margin,
          `"${m.id}" step ${i} sits ${margin.toFixed(1)}σ from its tolerance (signed step ` +
            `${step}, SD ${sd} at ${SCENARIO.games} games). Under 4σ this gate flakes on a suite ` +
            `that runs on every push. Raise \`games\` — SD falls as 1/√games.`,
        ).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("records a MONOTONE ladder — the recorded red was fixed, not tolerated", () => {
    // WHAT THIS TEST USED TO SAY, AND WHY IT SAYS THE OPPOSITE NOW. It required exactly one
    // inverted step per axis and required it to BE the sensitivity target: the gate was recorded
    // red against the engine as committed at ADR-032, and the previous version of this file
    // predicted its own retirement — "if a future engine fix makes the recorded steps monotone,
    // these become historical and the field says so".
    //
    // ADR-033 is that fix. `SACK` left `pocket.severity`, the IMMEDIATE→SACK step ceased to
    // exist, and the ladder re-recorded MONOTONE on all three axes across eight independent seed
    // lists. So the assertion inverts with it: a recorded inversion would now mean the gate is
    // shipping a known-red record, which is a different and worse thing than the deliberate red
    // it used to be.
    for (const m of SCENARIO.measures) {
      const inversions = m.recordedSteps.filter((s) => s < -m.tolerance);
      expect(
        inversions,
        `"${m.id}" records ${inversions.length} inverted step(s). The recorded ladder is monotone ` +
          `since ADR-033; a recorded inversion means either the engine has regressed or the ` +
          `record was edited to describe a ladder nobody measured. Re-measure with ` +
          `FF_POCKET_LADDER=1 FF_POCKET_LADDER_SEEDS=8.`,
      ).toEqual([]);
    }
  });

  it("keeps the retired red, with its provenance, rather than truncating it", () => {
    // §22a: a gate that has never fired is indistinguishable from a vacuous one. The corollary
    // `pocketLadderRerung.test.ts` step 2 adds is that a gate which DELETES the red it fired on
    // is back in the same position one commit later and less visibly — the row simply is not
    // there to notice. So the red is kept, and this asserts it is still kept.
    //
    // It is not decoration. `retiredRed` is what makes the CURRENT `sensitivityTarget` legible:
    // the sizing defect below re-opens the same upward-closure hole at the ladder's new top, so
    // −0.07003 and −0.13071 are the same defect measured one rung apart, and a reader who cannot
    // see the old number cannot tell whether the new one is large or small.
    const ladder = pocketStatusLadder();
    for (const m of SCENARIO.measures) {
      const red = m.retiredRed;
      expect(red.inversion, `"${m.id}" retired red records no inversion`).toBeLessThan(0);
      expect(red.stepSD, `"${m.id}" retired red records no SD`).toBeGreaterThan(0);
      expect(red.seedLists, `"${m.id}" retired red was not replicated`).toBeGreaterThanOrEqual(8);
      expect(red.games).toBeGreaterThanOrEqual(SCENARIO.games);
      expect(red.retiredBy.length, `"${m.id}" retired red does not say what removed it`)
        .toBeGreaterThan(0);
      // The step it names must be one the ladder NO LONGER HAS. A retired red that still
      // describes a live step is not retired, it is a red being quietly carried.
      const rungs: readonly string[] = ladder;
      const [from, to] = red.step.split("→");
      expect(
        from !== undefined && to !== undefined && rungs.includes(from) && rungs.includes(to),
        `"${m.id}" retires "${red.step}", but both ends are still rungs of pocket.severity ` +
          `(${ladder.join(", ")}). That step is live and its red may not be filed as history.`,
      ).toBe(false);
    }
  });

  it("sizes every tolerance against a defect that is STILL INJECTABLE, and proves it here", () => {
    // THE FAILURE MODE THIS CLOSES, named by ADR-033 §7.1 and left to calibration to solve: a
    // tolerance sized against a defect the engine has since fixed is unfalsifiable, and nothing
    // about the recorded number says so. ADR-033 suggested the `readCapacityDelta.SACK` orphan as
    // the replacement sizer; that row was REMOVED by the same ADR, so it can size nothing — and
    // even when it existed it was a table row read only on ticks carrying a status, never able to
    // produce the behavioural inversion `sensitivityTarget` is measured in.
    //
    // `tunablesWithSizingDefect()` applies the replacement through `applyTunablePatch`, which
    // rejects a stale `currentValue`. So if the engine ever changes these lists, THIS FREE TEST
    // throws `TunablePatchError` on the committed tree — the gate cannot go on quoting a target
    // for a defect that has stopped being one.
    const defected = tunablesWithSizingDefect();
    expect(
      ladderTableFindings(defected).length,
      "SIZING_DEFECT applies but Tier A does not report it, so the sizer is no longer a defect " +
        "this gate can see for free. Re-measure the targets or choose a new sizer.",
    ).toBeGreaterThanOrEqual(SIZING_DEFECT.patches.length);
    // …and it must be a defect the COMMITTED tree does not have, or the gate is sizing itself
    // against the engine's own behaviour.
    expect(
      ladderTableFindings().length,
      "the committed tree reports table findings of its own — the sizing defect is not a " +
        "counterfactual, it is the status quo",
    ).toBe(0);
    for (const m of SCENARIO.measures) {
      expect(
        m.sensitivityTarget,
        `"${m.id}" names no inversion it is required to catch, so its tolerance is unfalsifiable`,
      ).toBeGreaterThan(0);
    }
  });

  it("names the measures it reports and does not assert, so an exclusion cannot be silent", () => {
    const asserted = new Set(SCENARIO.measures.map((m) => m.id));
    for (const d of DIAGNOSTIC_MEASURES) {
      expect(
        asserted.has(d.id),
        `"${d.id}" is both asserted and reported-only. Pick one.`,
      ).toBe(false);
    }
    expect(DIAGNOSTIC_MEASURES.map((d) => d.id)).toContain("scramble_rate");
    expect(DIAGNOSTIC_MEASURES.map((d) => d.id)).toContain("throwaway_rate");
  });

  it("keeps the gate on the canonical seeds — this file may not re-draw a ladder", () => {
    // The same rule `knownTruth.test.ts` enforces for the five attribute gates, checked at the
    // SOURCE because a re-drawn ladder produces numbers that look exactly like a ladder.
    const source = readFileSync(join(here, "knownTruth.pocket-status-ladder.test.ts"), "utf8");
    expect(
      /batchSeed\s*:/.test(source),
      "this gate passes a seed override. It must call runPocketLadder() without one, so every " +
        "CI run measures the same games. Replicates belong in a separate, env-gated file.",
    ).toBe(false);
    // …and the same rule for the BASE TUNABLES, added when `runPocketLadder` gained a `base`
    // option so the sizing defect could be measured on the gate's own instrument. A gate that can
    // be handed its own base is a gate that can be walked on a tree nobody committed — and it
    // would go green while measuring something else entirely, which is worse than failing.
    expect(
      /\bbase\s*:/.test(source),
      "this gate passes a base-tunables override. It must walk DEFAULT_TUNABLES. Measuring a " +
        "patched base is `test/pocketLadderRerung.test.ts`'s job, env-gated and out of CI.",
    ).toBe(false);
  });
});

// ===========================================================================
// TIER B — THE WALK
// ===========================================================================

describe("pocket-status ladder — TIER B, the walk", () => {
  it("patches only what it names, and returns the base untouched at the committed rung", () => {
    // The probe must be a FLOOR imposed on named cells and nothing else, because that is the
    // whole reason the walk's input ordering is guaranteed rather than argued.
    for (const status of pocketStatusLadder()) {
      const t = tunablesForRung(SCENARIO, status);
      for (const band of SCENARIO.probeBands) {
        expect((t.pocket.minimumStatusByBand as Record<string, string>)[band]).toBe(status);
      }
      // Nothing outside the named cells moved.
      expect(t.pocket.severity).toEqual(DEFAULT_TUNABLES.pocket.severity);
      expect(t.pocket.forcesDecision).toEqual(DEFAULT_TUNABLES.pocket.forcesDecision);
      expect(t.pocket.sackWhenNoTarget).toEqual(DEFAULT_TUNABLES.pocket.sackWhenNoTarget);
      expect(t.pocket.thresholds).toEqual(DEFAULT_TUNABLES.pocket.thresholds);
      expect(t.arrival).toEqual(DEFAULT_TUNABLES.arrival);
    }
    // And the engine's own constants are untouched by any of it.
    //
    // ================== PROVENANCE, RE-POINTED AT THE AMENDED §7.2 ==================
    //
    // This block used to assert `minimumStatusByBand.RUSHER_GAINING === "PRESSURE"`, transcribed
    // from §7.2's original sentence *"POCKET PRESSURE: 1+ rushers winning by 1-14"*. The owner
    // amended that sentence — **gaining ground is not pressure** — and the amendment block in
    // `docs/design/match-engine.md` §7.2 (July 2026, implemented as ADR-033 ruling 1) is the
    // authority for what these cells now say. It is cited rather than restated here on purpose:
    // this package does not get to hold a second copy of the classification, and a reader who
    // wants to know WHY `RUSHER_GAINING` floors at CLEAN should be sent to the doc that decided
    // it, not to a comment that paraphrases the doc and will drift from it.
    //
    // The assertion itself is deliberately still literal. It is a PROVENANCE check — "the walk
    // ran against these committed values" — and a provenance check written in terms of the thing
    // it is checking asserts nothing at all.
    expect(DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_WINS_REP).toBe("COLLAPSING");
    expect(DEFAULT_TUNABLES.pocket.minimumStatusByBand.BLOCKER_BEATEN).toBe("PRESSURE");
    expect(DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING).toBe("CLEAN");
  });

  it("probes every band in which the rusher is ahead, DERIVED rather than listed", () => {
    // §22c STRENGTH DECISION, and it is calibration's (ADR-033 §7.2 says so explicitly).
    //
    // The probe used to be the literal pair `["RUSHER_GAINING", "RUSHER_WINS_REP"]`, documented
    // as "both DIRTY rows of the band map". ADR-033 split the doc's old 1–14 interval into
    // `BLOCKER_BEATEN` (5–14 → PRESSURE) and `RUSHER_GAINING` (1–4 → **CLEAN**), and the literal
    // survived the change while silently meaning something else: one dirty row and one clean one.
    // Nothing failed, because a literal cannot notice that a band was split underneath it.
    //
    // The replacement is `rusherAheadBands()` — every band with `minMargin >= 1`, read off
    // `passRush.bands`. Margin sign is a fact about §7.1's roll and is independent of the §7.2
    // classification the walk overwrites, so the probe is no longer selected out of the very
    // table `tunablesForRung` patches. This assertion is what makes the derivation load-bearing:
    // the next band change fails HERE, loudly, with one instruction attached.
    expect(
      SCENARIO.probeBands,
      "the probe no longer names every band in which the rusher is ahead. If `passRush.bands` " +
        "changed, RE-DERIVE THE REACH — run FF_POCKET_LADDER_REACH=1 and update `hypothesis`. " +
        "Reach is the term that sizes every tolerance on this gate and it is the one input here " +
        "that cannot be read off a table.",
    ).toEqual(rusherAheadBands());
    // MEASURED REACH, 3 seed lists × 160 games at DEFAULT_TUNABLES: 98.36% ± 0.10pp of dropbacks
    // carry at least one probe band. Per band: RUSHER_WINS_REP 95.53%, BLOCKER_BEATEN 53.35%,
    // RUSHER_GAINING 28.72%. The old "~95%" was RUSHER_WINS_REP alone — a correct number attached
    // to the wrong argument — and the other two bands add at most 2.83pp of union reach on top.
    expect(SCENARIO.probeBands).toContain("RUSHER_WINS_REP");
    expect(SCENARIO.probeBands).toContain("BLOCKER_BEATEN");
  });

  it(
    "never produces a strictly better outcome from a strictly worse pocket",
    async () => {
      const result = await runPocketLadder();
      const failures = pocketLadderFailures(result);
      if (failures.length > 0) throw new Error(failures.map((f) => f.report).join("\n\n"));
      expect(result.monotone).toBe(true);
    },
    900_000,
  );

  it(
    "is reproducible — the same walk twice produces the same numbers",
    async () => {
      // Ten games, not two: every axis returns `null` below 200 observations, and at two games a
      // rung the ladder would compare nulls and pass without consulting the simulation. That the
      // sample clears the thresholds is ASSERTED below rather than assumed, because a threshold
      // moving would silently restore the vacuum.
      const a = await runPocketLadder(SCENARIO, { games: 10 });
      const b = await runPocketLadder(SCENARIO, { games: 10 });
      expect(
        a.rungs.every((r) => Object.values(r.measured).every((v) => v !== null)),
        "at 10 games a rung some axis still measures nothing, so this test would compare nulls",
      ).toBe(true);
      expect(a.rungs.map((r) => r.measured)).toEqual(b.rungs.map((r) => r.measured));
      expect(a.rungs.map((r) => r.seedDigest)).toEqual(b.rungs.map((r) => r.seedDigest));
      expect(a.rungs.map((r) => r.tunablesDigest)).toEqual(b.rungs.map((r) => r.tunablesDigest));
      // Five distinct configurations, so the walk cannot be five copies of one arm.
      expect(new Set(a.rungs.map((r) => r.tunablesDigest)).size).toBe(a.rungs.length);
    },
    900_000,
  );
});
