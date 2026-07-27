/**
 * ADR-011 — THE DESIGN DOC'S RESULT BANDS TRAVEL IN THE EVENT STREAM.
 *
 * `ResultTier` is the generic nine-tier ladder. It is not the vocabulary this
 * project speaks: §6-§14, the §17 printout and every entry in
 * `CALIBRATION-BACKLOG.md` speak in BANDS — `RUSHER_WINS_REP`, `SEPARATION_3_4`,
 * `SOFT_SPOT`, `HOLE_OPEN`, `BROKEN_TACKLE`, `CLEAN_RELEASE_CB_BEAT`. Before the
 * amendment none of them reached the stream, so the only way to recover one was
 * to hold the engine's band tables and re-derive it from `margin` — and those
 * tables are `TUNABLES`, which is calibration's own moving tuning target. Every
 * such consumer desyncs SILENTLY the first time a boundary moves.
 *
 * The tests below are the two halves of the fix:
 *   1. the INVARIANT — every check whose resolution has a band table carries a
 *      non-empty `band`, and every check that has none carries no band;
 *   2. the ACCEPTANCE TEST — the §17 renderer names results without any band
 *      table at all.
 */
import { describe, expect, it } from "vitest";
import { gameId, playId, playerId } from "@ff/contracts";
import type { MatchEvent, MatchEventEnvelope, RollDetail } from "@ff/contracts";
import { renderPlay, simulatePassPlay, simulateRunPlay } from "../src/index.js";
import {
  STAMP,
  buildDeflectionScenario,
  buildLopsidedRushScenario,
  buildMixedCoverageScenario,
  buildRunScenario,
  buildScenario,
  buildScramblerScenario,
  buildShortConceptScenario,
  buildStalledPocketScenario,
  buildZoneScenario,
} from "./fixtures.js";

/**
 * THE CLASSIFICATION, and it is the invariant rather than a spot check.
 *
 * A check kind is in exactly one of these two sets. `BANDED` names a resolution
 * whose outcome is selected from a `bands` table in `TUNABLES`, so a label
 * always exists and must always be published. `UNBANDED` names a resolution that
 * rolls against a bare target and reads the sign of the margin — there is no
 * doc band to carry, and inventing one would be the fabrication ADR-005 forbids.
 *
 * A kind that appears in the stream and in NEITHER set fails the test. That is
 * what makes this an invariant: the day a check is added, it must be classified.
 */
const BANDED: readonly string[] = [
  "pass_rush_tick",       // §7.1 RUSHER_WINS_REP …
  "pocket_movement",      // §7.2 SOUND / RUSHED / PANICKED
  "scramble",             // §8.8 CLEAN_ESCAPE …
  "release_vs_press",     // §9.1 CLEAN_RELEASE_CB_BEAT …
  "man_coverage",         // §9.3 SEPARATION_3_4 …
  "zone_coverage",        // §9.4 SOFT_SPOT / WINDOW / TIGHT_WINDOW …
  "anticipation",         // §8.1 ON_TIME / ANTICIPATED / NOT_YET / LOCKED_ON
  "qb_decision",          // §8.5 OPTIMAL / GOOD / ADEQUATE …
  "accuracy",             // §10.4 PERFECT / EXCELLENT / GOOD … — the placement band
  "catch",                // §11.2 SECURED / CAUGHT_SLIGHT_BOBBLE …
  "contested_catch",      // §11.3 CLEAN_CATCH / TIP_BALL / INTERCEPTION …
  "deflection_quality",   // §12.2 GIFT / FLOATER / LIVE_BALL …
  "run_block",            // §6.3 DRIVEN_BACK / SEALED / PENETRATION …
  "gap_battle",           // §6.2 GAP_HELD / OVERFLOWED
  "yac_tackle",           // §13.2 DEFENDER_MISSED / PARTIAL_TACKLE …
  "break_tackle",         // §14.4 BROKEN_TACKLE / PARTIAL_TACKLE / TACKLED
  "tackle",               // §14.3 FELL_FORWARD / STOPPED, EVADED / TACKLED_FOR_LOSS
  "downfield_block",      // §13.3 PANCAKED / SEALED / SHED
  "breakaway",            // §13.4 TOUCHDOWN_POTENTIAL / SIGNIFICANT_GAIN …
];

const UNBANDED: readonly string[] = [
  "pursuit_angle",        // §14.4 — a gate: he got there or he did not
  "rb_vision",            // §14.2 — "finds best lane" is a sign test
  "passing_lane",         // §10.3 — deflected or not
  "second_level_climb",   // §6.4 — LB engaged or free
  "zone_read_qb",         // §9.4 — broke on the ball or stayed
  "deflection_recovery",  // §12.4 — met the final target number or did not
];

/**
 * The renderer writes plain English for the two UNBANDED checks whose outcome is
 * a sign test — `passing_lane` ("DEFLECTED") and `zone_read_qb` ("BREAKS ON THE
 * BALL"). Neither is a band, neither claims to be, and neither can desync from a
 * table because neither reads one.
 */
const PROSE_RESULTS: readonly string[] = ["DEFLECTED", "BREAKS"];

/** A minimal, hand-built §7.1 stream with a band chosen by the test, not the engine. */
function syntheticRushStream(band: string | undefined, margin: number): MatchEventEnvelope[] {
  const base = { gameId: gameId("g-synthetic"), playId: playId("p-synthetic"), tick: 0.5 };
  const roll = (raw: number, label: string): RollDetail => ({
    die: "d100",
    raw,
    modifiers: [],
    total: raw,
    rngLabel: label,
  });
  const check: MatchEvent = {
    type: "CHECK",
    payload: {
      checkKind: "pass_rush_tick",
      actors: [playerId("de-1"), playerId("lt-1")],
      roll: roll(90, "synthetic/rush"),
      opposedRoll: roll(90 - margin, "synthetic/block"),
      tier: "CRITICAL_SUCCESS",
      ...(band === undefined ? {} : { band }),
      margin,
      testsAttrs: [],
    },
    ...base,
  };
  return [{ seq: 0, at: STAMP, event: check }];
}

/** Every fixture, both entry points: as wide a sample of the stream as exists. */
function everyStream(seedPrefix: string, n: number): MatchEventEnvelope[][] {
  const out: MatchEventEnvelope[][] = [];
  const passFixtures = [
    buildScenario,
    buildZoneScenario,
    buildMixedCoverageScenario,
    buildDeflectionScenario,
    buildScramblerScenario,
    buildStalledPocketScenario,
    buildLopsidedRushScenario,
    buildShortConceptScenario,
  ];
  for (const build of passFixtures) {
    for (let i = 0; i < n; i++) {
      const { state, calls } = build();
      out.push([...simulatePassPlay(state, calls, `${seedPrefix}-pass-${i}`).events]);
    }
  }
  for (const scheme of ["ZONE", "GAP"] as const) {
    for (let i = 0; i < n; i++) {
      const { state, calls } = buildRunScenario(scheme);
      out.push([...simulateRunPlay(state, calls, `${seedPrefix}-run-${scheme}-${i}`).events]);
    }
  }
  return out;
}

describe("ADR-011 — the band invariant", () => {
  it("every CHECK whose resolution has a band table carries a non-empty band", () => {
    const seen = new Set<string>();
    let banded = 0;
    for (const events of everyStream("band-invariant", 40)) {
      for (const { event } of events) {
        if (event.type !== "CHECK") continue;
        const p = event.payload;
        seen.add(p.checkKind);

        if (BANDED.includes(p.checkKind)) {
          banded += 1;
          expect(
            p.band,
            `${p.checkKind} has a band table and must publish its label`,
          ).toBeTruthy();
          expect(typeof p.band).toBe("string");
          // The doc's vocabulary, not free prose: SCREAMING_SNAKE, as every
          // band table in TUNABLES spells them.
          expect(p.band ?? "").toMatch(/^[A-Z][A-Z0-9_]*$/);
          continue;
        }

        if (UNBANDED.includes(p.checkKind)) {
          // ADR-005 — no table, so no label. Absent means "there is no band",
          // never "the band was not worth carrying".
          expect(p.band, `${p.checkKind} has no band table and must not invent one`).toBeUndefined();
          continue;
        }

        throw new Error(
          `check kind "${p.checkKind}" is classified neither BANDED nor UNBANDED — ` +
            "classify it in resultBands.test.ts when you add a check",
        );
      }
    }
    expect(banded).toBeGreaterThan(0);
    // ...and the sample really did reach every kind the engine can emit, so the
    // invariant cannot pass by never exercising the interesting ones.
    for (const kind of [...BANDED, ...UNBANDED]) {
      expect(seen, `no stream in the sweep emitted "${kind}"`).toContain(kind);
    }
  });

  it("the band a CHECK publishes is the band the resolution acted on", () => {
    // Spot-checked against a fact only the true band explains: a `gap_battle`
    // labelled OVERFLOWED is a defender who LOST the roll (margin is
    // defender − blocker), and GAP_HELD is one who did not.
    for (const events of everyStream("band-agrees", 10)) {
      for (const { event } of events) {
        if (event.type !== "CHECK") continue;
        const p = event.payload;
        if (p.checkKind === "gap_battle") {
          expect(p.band).toBe(p.margin >= 0 ? "GAP_HELD" : "OVERFLOWED");
        }
        // §11.3's interception is the extreme low band and nothing else.
        if (p.checkKind === "contested_catch" && p.band === "INTERCEPTION") {
          expect(p.margin).toBeLessThan(-19);
        }
        // §10.4's MISS is the uncatchable ball, and no catch follows one.
        if (p.checkKind === "accuracy" && p.band === "MISS") {
          expect(p.margin).toBeLessThan(-29);
        }
      }
    }
  });
});

describe("ADR-011 — the §17 renderer reads bands instead of re-deriving them", () => {
  /**
   * THE ACCEPTANCE TEST.
   *
   * The point of the amendment is not that the printout happens to be correct;
   * it is that a consumer can name a result from the stream ALONE. So this hands
   * the renderer a hand-built stream whose band DISAGREES with the one the
   * engine's own tables would derive from the same margin, and requires it to
   * print what the stream says.
   *
   * A renderer holding the tables prints `RUSHER_WINS_REP` here, because +50 is
   * a won rep. One reading the stream prints `MOVED_BOUNDARY_BAND` — which is
   * exactly what it would have to do the day calibration moves that threshold
   * and the engine starts labelling +50 something else. That divergence is the
   * silent desync ADR-011 exists to prevent, staged.
   */
  it("prints the band the STREAM carries, not the one its margin would derive", () => {
    const text = renderPlay(syntheticRushStream("MOVED_BOUNDARY_BAND", 50), (id) => String(id));
    expect(text).toContain("MOVED_BOUNDARY_BAND (+50)");
    expect(text).not.toContain("RUSHER_WINS_REP");
  });

  it("prints nothing rather than guessing when a check carries no band", () => {
    // ADR-005's rule applied to rendering: absent is absent. The renderer states
    // that it does not know, and does not reconstruct a plausible label.
    const text = renderPlay(syntheticRushStream(undefined, 50), (id) => String(id));
    expect(text).toContain("→ - (+50)");
    expect(text).not.toContain("RUSHER_WINS_REP");
  });

  it("prints band labels that are actually present in the stream it was given", () => {
    // A renderer reading the stream can only print bands the stream contains.
    // A renderer re-deriving them can print one the stream never carried, which
    // is precisely the silent desync ADR-011 describes.
    for (const events of everyStream("render-bands", 4)) {
      const bands = new Set(
        events.flatMap(({ event }) =>
          event.type === "CHECK" && event.payload.band !== undefined ? [event.payload.band] : [],
        ),
      );
      // Names are irrelevant to a band assertion; the id is a fine display name.
      const text = renderPlay(events, (id) => String(id));
      for (const line of text.split("\n")) {
        const match = /Result: ([A-Z][A-Z0-9_]{3,}) \(/.exec(line);
        const printed = match?.[1];
        if (printed === undefined || PROSE_RESULTS.includes(printed)) continue;
        expect(bands, `printed "${printed}", which is in no CHECK in this stream`).toContain(
          printed,
        );
      }
    }
  });
});
