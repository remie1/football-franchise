/**
 * §8.4's OPENNESS SCALE — ITS PRODUCERS, ITS THRESHOLD CONSUMERS, AND WHICH SIDE
 * OF EACH THRESHOLD EVERY BAND ROW FALLS ON.
 *
 * ADR-045 PHASE 1. **NOTHING IN THIS FILE MOVES A VALUE, AND PHASE 1 MOVED NONE.**
 * It exists so the scale correction in phase 2 lands with its consequences
 * ALREADY VISIBLE: written and run GREEN against the PRE-correction table, then
 * re-recorded in phase 2. **The diff of the recorded matrix between those two
 * commits is the structural half of phase 3's pricing**, and it only counts as
 * evidence because the pins predate the values.
 *
 * ========================= WHY A MATRIX AND NOT ASSERTIONS =========================
 *
 * §9.3 and §9.4 both produce §8.4 openness. Seven tunables then compare that
 * quantity against a threshold, and NOT ONE of them errors, warns, or moves a
 * test when the scale underneath it shifts — the numbers stay in range and the
 * quarterback simply behaves differently. Charter §4.1: *where a wrong answer
 * would look like a right one, make the failure loud.* For a threshold with no
 * natural invariant, the loudest available failure is a RECORDED CLASSIFICATION
 * that cannot survive the scale moving under it.
 *
 * ============================ HOW THE LIST WAS BUILT ============================
 *
 * The OPAQUE-TYPE FIXPOINT (Charter §4.1, ADR-043's method), re-run over the
 * ENLARGED surface — §9.3's `manCoverage.bands.openness` **and** §9.4's
 * `zoneCoverage.bands.openness` + `zoneCoverage.uncoveredOpenness` — because the
 * surface grew and the previous enumeration does not carry over. Thirteen rounds
 * to a fixpoint. The terminals, the carriers and the two laundering sites are
 * transcribed in ADR-045 §1; the instrumentation was reverted and this file is
 * what it left behind.
 *
 * ⚠ THE FIXPOINT CANNOT SEE THIS FILE'S OTHER HALF. A type cannot see a LABEL
 *   consumer, and §9.4's bands are stated in §8.4's WORDS. The reading pass that
 *   found them is ADR-045 §2; it has no instrument and must be redone whenever
 *   `docs/design/match-engine.md` §8.4, §9.3 or §9.4 changes.
 *
 * ============================ WHAT THIS FILE IS NOT ============================
 *
 * It is not a target and not a tuning gate. Every threshold below is the value
 * the doc or a prior ruling put there. If a row's classification looks wrong,
 * that is a petition with a football argument, NEVER an edit to a literal here.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import { TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { throwThresholdFor } from "../src/resolve/qbRead.js";
import { selectTarget } from "../src/resolve/targetSelection.js";
import type { TargetCandidate } from "../src/resolve/targetSelection.js";
import { makePlayer } from "./fixtures.js";

// ---------------------------------------------------------------------------
// 1. THE PRODUCERS — derived from the tables, never restated.
// ---------------------------------------------------------------------------

interface ProducerRow {
  readonly site: string;
  readonly label: string;
  readonly openness: number;
}

/**
 * Every row of every table that produces a §8.4 openness, tagged with the doc
 * section that owns it. DERIVED: a row added to either band table appears here,
 * and the recorded matrix below then fails until somebody re-records it — which
 * is the point. A cardinality would not notice a substitution (ADR-041), so the
 * matrix carries each row's LABEL and VALUE, not a count.
 */
function producerRows(t: Tunables): ProducerRow[] {
  return [
    ...t.manCoverage.bands.map((b) => ({ site: "§9.3", label: b.label, openness: b.openness as number })),
    ...t.zoneCoverage.bands.map((b) => ({ site: "§9.4", label: b.label, openness: b.openness as number })),
    // Not a band row: §9.4 step 2's "nobody is responsible for this cell". It is
    // a producer of the same scale and the fixpoint found it, so it is here.
    { site: "§9.4", label: "UNCOVERED", openness: t.zoneCoverage.uncoveredOpenness as number },
  ];
}

// ---------------------------------------------------------------------------
// 2. THE THRESHOLD CONSUMERS — the fixpoint's terminals, by tunables path.
// ---------------------------------------------------------------------------

/**
 * `read` walks `TUNABLES` by the SAME dotted path `applyTunablePatch` accepts,
 * so a renamed or relocated cell throws HERE rather than leaving a stale literal
 * quietly passing. Charter §4.1's derivation corollary: a check must not survive
 * a change to its subject.
 */
function readNumber(t: Tunables, path: string): number {
  let node: unknown = t;
  for (const key of path.split(".")) {
    if (typeof node !== "object" || node === null) {
      throw new Error(`@ff/engine test: "${path}" runs through a leaf`);
    }
    const record = node as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw new Error(`@ff/engine test: "${path}" is not a path into TUNABLES`);
    }
    node = record[key];
  }
  if (typeof node !== "number") throw new Error(`@ff/engine test: "${path}" is not a number`);
  return node;
}

interface ThresholdConsumer {
  /** Short name used in the recorded matrix. */
  readonly name: string;
  /** Dotted path of the cell, read at run time so a move throws. */
  readonly path: string;
  readonly site: string;
  /** True when this openness is on the PERMISSIVE side of the threshold. */
  readonly permits: (openness: number, t: Tunables) => boolean;
}

/**
 * ⚠ THIS LIST IS HAND-WRITTEN, AND THIS PROJECT'S RECORD ON HAND-WRITTEN
 *   COVERAGE LISTS IS THAT THEY HAVE BEEN WRONG EVERY TIME THEY WERE CHECKED
 *   (Charter §4.1). It is written by hand because the derivation that produced
 *   it — the opaque-type fixpoint — is a COMPILER RUN over deliberately broken
 *   source, which no test can perform. Mitigations, strongest first:
 *
 *   1. every entry is READ BY PATH, so a moved or renamed cell throws;
 *   2. the recorded matrix is a full cross-product of producers × consumers, so
 *      a threshold whose VALUE moves reddens without anyone editing this list;
 *   3. ADR-045 §1 carries the fixpoint transcript, so re-running it is cheap.
 *
 *   None of that is a completeness claim. RE-RUN THE FIXPOINT when the scale
 *   moves; its silence means *not observed*, never *not present*.
 */
const THRESHOLD_CONSUMERS: readonly ThresholdConsumer[] = [
  {
    name: "throwThreshold",
    path: "qb.throwThreshold",
    site: "sim/passPlay.ts — the in-rhythm throw (+ readSystem.throwThresholdDelta)",
    // Recorded at HALF_FIELD's delta of 0; FULL_FIELD is +5 and CONCEPT −5.
    permits: (o, t) => o >= throwThresholdFor(t, "HALF_FIELD"),
  },
  {
    name: "checkdownThreshold",
    path: "qb.checkdown.threshold",
    site: "sim/passPlay.ts — the outlet enters §8.5's pool",
    permits: (o, t) => o >= readNumber(t, "qb.checkdown.threshold"),
  },
  {
    name: "desperationThreshold",
    path: "qb.desperationThreshold",
    site: "sim/passPlay.ts — forced decision: throw it rather than eat it",
    permits: (o, t) => o >= readNumber(t, "qb.desperationThreshold"),
  },
  {
    name: "notTightWindow",
    path: "qb.window.tightWindowThreshold",
    site: "resolve/qbRead.ts — §8.4's window compensation applies strictly BELOW this",
    permits: (o, t) => !(o < readNumber(t, "qb.window.tightWindowThreshold")),
  },
  {
    name: "notForcedBullet",
    path: "throwExec.typeSelection.tightWindowMaxOpenness",
    site: "resolve/throwExecution.ts — §10.2 forces BULLET at or below this",
    permits: (o, t) => !(o <= readNumber(t, "throwExec.typeSelection.tightWindowMaxOpenness")),
  },
  {
    name: "notLaneContestable",
    path: "throwExec.lane.contestOpennessMax",
    site: "resolve/throwExecution.ts + sim/passPlay.ts — §10.3's lane contest",
    permits: (o, t) => !(o <= readNumber(t, "throwExec.lane.contestOpennessMax")),
  },
  {
    name: "notContestedCatch",
    path: "catching.contestedMaxOpenness",
    site: "resolve/catchResolution.ts — §11.1 CONTESTED at or below this (ADR-040 §3)",
    permits: (o, t) => !(o <= readNumber(t, "catching.contestedMaxOpenness")),
  },
];

function classify(openness: number, t: Tunables): string {
  const permitted = THRESHOLD_CONSUMERS.filter((c) => c.permits(openness, t)).map((c) => c.name);
  return permitted.length === 0 ? "—" : permitted.join(" ");
}

// ---------------------------------------------------------------------------
// 3. THE PINS
// ---------------------------------------------------------------------------

describe("ADR-045 §1 — §8.4's openness scale and everything that compares against it", () => {
  it("every threshold consumer's cell still exists at the path the fixpoint found it", () => {
    for (const consumer of THRESHOLD_CONSUMERS) {
      expect(() => readNumber(TUNABLES, consumer.path)).not.toThrow();
    }
    // And every one of them names a site. A consumer with no site is an entry
    // somebody added without saying what reads it.
    for (const consumer of THRESHOLD_CONSUMERS) {
      expect(consumer.site.length).toBeGreaterThan(0);
    }
  });

  /**
   * THE MATRIX. One line per producer row: which side of every threshold that
   * row's openness falls on.
   *
   * A name PRESENT means PERMISSIVE: he will throw it (`throwThreshold`,
   * `checkdownThreshold`, `desperationThreshold`); it is not a tight window
   * (`notTightWindow`); it is not forced to a bullet (`notForcedBullet`); it is
   * not lane-contestable (`notLaneContestable`); it is not a contested catch
   * (`notContestedCatch`).
   *
   * ⚠ RE-RECORDED POST-CORRECTION (ADR-045 phase 2). The PRE-correction matrix
   *   is one commit back in this file's history and in ADR-045 §3.1 beside it;
   *   the diff of the two is the STRUCTURAL half of the pricing, and it is
   *   evidence only because this file predates the value move.
   *
   *   Six lines moved. In summary: `SEPARATION_1_2` stops being an in-rhythm
   *   throw and becomes a tight window and a lane contest; `SEPARATION_3_4` and
   *   §9.4's `WINDOW` become lane-contestable; `SEPARATION_HALF_YARD` becomes a
   *   contested catch. NOTHING WAS COMPENSATED — see ADR-045 §3.
   */
  it("records which thresholds each §9.3 / §9.4 producer row is permissive against", () => {
    const matrix = producerRows(TUNABLES).map(
      (r) => `${r.site} ${r.label} @${String(r.openness)} → ${classify(r.openness, TUNABLES)}`,
    );
    expect(matrix).toEqual([
      "§9.3 SEPARATION_5_PLUS @70 → throwThreshold checkdownThreshold desperationThreshold notTightWindow notForcedBullet notLaneContestable notContestedCatch",
      "§9.3 SEPARATION_3_4 @52 → throwThreshold checkdownThreshold desperationThreshold notTightWindow notForcedBullet notContestedCatch",
      "§9.3 SEPARATION_1_2 @38 → checkdownThreshold desperationThreshold notContestedCatch",
      "§9.3 SEPARATION_HALF_YARD @30 → checkdownThreshold desperationThreshold",
      "§9.3 EVEN_BRACKET @25 → desperationThreshold",
      "§9.3 CB_IN_PHASE @25 → desperationThreshold",
      "§9.3 CB_ON_HIP @15 → —",
      "§9.3 CB_IN_POSITION @6 → —",
      "§9.4 SOFT_SPOT @70 → throwThreshold checkdownThreshold desperationThreshold notTightWindow notForcedBullet notLaneContestable notContestedCatch",
      "§9.4 WINDOW @52 → throwThreshold checkdownThreshold desperationThreshold notTightWindow notForcedBullet notContestedCatch",
      "§9.4 TIGHT_WINDOW @38 → checkdownThreshold desperationThreshold notContestedCatch",
      "§9.4 DEFENDER_IN_LANE @20 → —",
      "§9.4 UNCOVERED @90 → throwThreshold checkdownThreshold desperationThreshold notTightWindow notForcedBullet notLaneContestable notContestedCatch",
    ]);
  });

  /**
   * PHASE 2's ACCEPTANCE CRITERION, and it could not have been written in phase 1
   * because it was RED then: every producer value now sits inside the §8.4 band
   * its own §9.3 / §9.4 words name.
   *
   * The band edges are §8.4's prose (70+ / 50-69 / 30-49 / 15-29 / 0-14) and are
   * the one restated constant in this file — §8.4 is a doc paragraph, so there is
   * nothing to derive from. Flagged rather than hidden.
   */
  it("every producer value sits inside the §8.4 band its own label names", () => {
    const bandOf = (o: number): string =>
      o >= 70 ? "wide open" : o >= 50 ? "open" : o >= 30 ? "tight window" : o >= 15 ? "covered" : "no window";
    const named: readonly (readonly [string, string, string])[] = [
      // §9.3's words, as the doc states them after the SA-08 amendment.
      ["§9.3", "SEPARATION_5_PLUS", "wide open"],
      ["§9.3", "SEPARATION_3_4", "open"],
      ["§9.3", "SEPARATION_1_2", "tight window"],
      ["§9.3", "SEPARATION_HALF_YARD", "tight window"],
      ["§9.3", "EVEN_BRACKET", "covered"],
      // §9.4's words: "found soft spot, wide open" / "window exists, open" /
      // "tight window". Its fourth row ("defender in passing lane") names no §8.4
      // band and is deliberately ABSENT here rather than assigned one.
      ["§9.4", "SOFT_SPOT", "wide open"],
      ["§9.4", "WINDOW", "open"],
      ["§9.4", "TIGHT_WINDOW", "tight window"],
    ];
    const rows = producerRows(TUNABLES);
    for (const [site, label, expected] of named) {
      const row = rows.find((r) => r.site === site && r.label === label);
      if (row === undefined) throw new Error(`no producer row ${site} ${label}`);
      expect(`${site} ${label} @${String(row.openness)} is ${bandOf(row.openness)}`).toBe(
        `${site} ${label} @${String(row.openness)} is ${expected}`,
      );
    }
  });

  /**
   * THE OTHER HALF OF PHASE 2's ACCEPTANCE CRITERION: the two producers now put
   * the SAME number on the same §8.4 band. This is what "a scale used by two
   * producers cannot be corrected for one" means, asserted rather than asserted
   * about.
   */
  it("§9.3 and §9.4 agree, band by band, on the corrected mapping", () => {
    const man = (label: string): number => {
      const row = TUNABLES.manCoverage.bands.find((b) => b.label === label);
      if (row === undefined) throw new Error(`no §9.3 row ${label}`);
      return row.openness;
    };
    const zone = (label: string): number => {
      const row = TUNABLES.zoneCoverage.bands.find((b) => b.label === label);
      if (row === undefined) throw new Error(`no §9.4 row ${label}`);
      return row.openness;
    };
    expect([
      `wide open: man ${String(man("SEPARATION_5_PLUS"))} zone ${String(zone("SOFT_SPOT"))}`,
      `open: man ${String(man("SEPARATION_3_4"))} zone ${String(zone("WINDOW"))}`,
      `tight window: man ${String(man("SEPARATION_1_2"))} zone ${String(zone("TIGHT_WINDOW"))}`,
    ]).toEqual([
      "wide open: man 70 zone 70",
      "open: man 52 zone 52",
      "tight window: man 38 zone 38",
    ]);
  });

  /**
   * §8.5's ORDERING IS THE ONE CROSS-PRODUCER CONSUMER.
   *
   * `selectTarget` sorts man-covered and zone-covered candidates against each
   * other by effective openness. Nothing else in the engine puts the two
   * producers' outputs in one list, and two producers on two mappings is not a
   * magnitude shift — it changes WHO GETS THE BALL.
   *
   * Recorded as the interleaved rank order rather than as a sortedness check: a
   * sortedness check is true of any mapping and would go green through exactly
   * the incoherence this pin exists to expose.
   */
  it("records the interleaved man/zone rank order §8.5 produces", () => {
    const rows = producerRows(TUNABLES).filter((r) => r.label !== "UNCOVERED");
    const byId = new Map<string, string>();
    const candidates: TargetCandidate[] = rows.map((r, i) => {
      const player = makePlayer(`op-${String(i)}`, `P${String(i)}`, "WR", {});
      byId.set(String(player.bio.id), `${r.site} ${r.label} @${String(r.openness)}`);
      return { receiver: player.bio.id, effectiveOpenness: r.openness };
    });
    const out = selectTarget(
      TUNABLES,
      makePlayer("op-qb", "Q", "QB", { decisionMaking: 80 }),
      candidates,
      createRng("adr045", "qbread"),
    );
    expect(out.ranked.map((c) => byId.get(String(c.receiver)))).toEqual([
      "§9.3 SEPARATION_5_PLUS @70",
      "§9.4 SOFT_SPOT @70",
      "§9.3 SEPARATION_3_4 @52",
      "§9.4 WINDOW @52",
      "§9.3 SEPARATION_1_2 @38",
      "§9.4 TIGHT_WINDOW @38",
      "§9.3 SEPARATION_HALF_YARD @30",
      "§9.3 EVEN_BRACKET @25",
      "§9.3 CB_IN_PHASE @25",
      "§9.4 DEFENDER_IN_LANE @20",
      "§9.3 CB_ON_HIP @15",
      "§9.3 CB_IN_POSITION @6",
    ]);
  });

  /**
   * BOTH SPELLINGS OF THE TIGHT-WINDOW BOUNDARY, TIED.
   *
   * `qb.window.tightWindowThreshold` (§8.4, consumed `< 50`) and
   * `throwExec.typeSelection.tightWindowMaxOpenness` (§10.2, consumed `<= 50`)
   * are the SAME §8.4 boundary under two names. ADR-039 SA-09 recorded the
   * duplication and nothing tied them. The tie is made by the COMPILER, below,
   * because `TUNABLES` is `as const` and a runtime `expect(50).toBe(50)` over
   * two literal types is the tautology Charter §4.1 requires to fail to compile
   * rather than pass green.
   *
   * The `<` / `<=` difference is deliberately NOT reconciled: §8.4 says "If Base
   * Openness < 50" and §10.2's is a maximum. The pin is on the NUMBER.
   */
  it("both tight-window spellings resolve, and the tie itself is a compile error", () => {
    // This case asserts the tie's SUBJECT — that both paths still resolve — which
    // is not type-decidable. The equality is the two aliases at the foot of the
    // file, and moving either number is a compile error there.
    expect(() => readNumber(TUNABLES, "qb.window.tightWindowThreshold")).not.toThrow();
    expect(() => readNumber(TUNABLES, "throwExec.typeSelection.tightWindowMaxOpenness")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. THE COMPILE-TIME TIE (prose in the case above).
// ---------------------------------------------------------------------------

type QbTightWindowBoundary = (typeof TUNABLES)["qb"]["window"]["tightWindowThreshold"];
type ThrowTightWindowBoundary =
  (typeof TUNABLES)["throwExec"]["typeSelection"]["tightWindowMaxOpenness"];

/** Mutual assignability, so the pin fires whichever spelling moves. */
const _qbBoundaryIsThrowBoundary: QbTightWindowBoundary =
  null as unknown as ThrowTightWindowBoundary;
const _throwBoundaryIsQbBoundary: ThrowTightWindowBoundary =
  null as unknown as QbTightWindowBoundary;
void _qbBoundaryIsThrowBoundary;
void _throwBoundaryIsQbBoundary;
