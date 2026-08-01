/**
 * THE POCKET-STATUS MONOTONICITY GATE — Charter §4.1: *"an ordered enum whose order carries
 * meaning gets a monotonicity gate."*
 *
 * The engine ranks the pocket statuses in `TUNABLES.pocket.severity` — `CLEAN | PRESSURE |
 * COLLAPSING | IMMEDIATE` at 0/1/2/3 since ADR-033 took `SACK` off the top of it. That ranking is
 * a CLAIM — that the states are ordered by urgency — and everything downstream of the status
 * reads the claim: the accuracy modifier, the read-capacity delta, whether the quarterback is
 * forced to decide, whether he may go down. Nothing in this repository has ever asserted the
 * claim.
 *
 * ⚠ `PocketStatus` in `@ff/contracts` is still the WIDER union: it also contains `"SACK"`, which
 * no longer ranks anywhere. That is a live contract petition (ADR-033 §6) and not this file's to
 * decide. What this file does about it is refuse to rank what the engine does not rank —
 * `severityOf` throws on an unranked status rather than defaulting it, so the wider type cannot
 * produce a silent ordering. See its doc comment.
 *
 * ================== THE PROPERTY ==================
 *
 *   **A STRICTLY WORSE POCKET NEVER PRODUCES A STRICTLY BETTER OUTCOME.**
 *
 * Non-strict in both halves: a worse-or-equal pocket must produce a worse-or-equal outcome. Two
 * adjacent rungs that measure identically PASS. The gate is looking for an INVERSION, not for an
 * effect — which is the whole difference between this file and `scenarios.ts`, and the reason
 * that file's tolerance rule could not simply be copied (see THE TOLERANCE RULE below).
 *
 * ================== WHY THIS IS A LADDER WALK AND NOT A BATCH STATISTIC ==================
 *
 * ADR-032 §2b found the original inversion by patching a band→status map to `SACK` and measuring.
 * At the tunables as they then stood the `SACK` rung was reachable (`pocket.thresholds` put it at
 * `minProgress: 9` and the counter accrued +2 per won rep with no cap) but RARE — 4.96% of
 * in-pocket ticks on this package's flat-60 league, and ADR-033 measured **0 of 9,929** on the
 * engine's own 40-game corpus — so a default-config batch statistic was dominated by the rungs
 * below it and would have been GREEN with the inversion sitting right there. A gate that is green
 * while the defect is present is `CALIBRATION-BACKLOG.md` §22a's disease.
 *
 * That is not a historical remark, it is the argument for the shape of this file. ADR-033 records
 * that ruling 2 moved NOTHING on any batch statistic the engine can produce, and that it took
 * this walk — which IMPOSES each rung rather than sampling it — to see the inversion at all. The
 * same argument sizes the gate today, on a defect that is common rather than rare (see THE
 * TOLERANCE RULE).
 *
 * So the gate does not sample the ladder as the engine happens to use it. **It walks the ladder,
 * imposing each rung in turn on the same games under the same dice**, and asserts the ordering
 * over the reachable domain rather than over the default distribution.
 *
 * ================== HOW A RUNG IS IMPOSED ==================
 *
 * Through `pocket.minimumStatusByBand`, in memory, via `applyTunablePatch`. That table is a
 * FLOOR: `pocketStatusFor` takes the worst of the band floor, the arrival floor and the counter,
 * so setting the dirty bands to status S makes every tick they touch **at least** S and touches
 * nothing else. Walking S up the severity order therefore produces a sequence of pocket
 * conditions that is weakly worsening BY CONSTRUCTION — the input ordering is guaranteed by the
 * severity table itself, not by an argument about football — and the only thing left to measure
 * is whether the OUTCOME ordering follows.
 *
 * The engine is untouched. `packages/engine/src/tunables.ts` is not written by this file or by
 * anything it calls, and every rung dies with the process that measured it.
 *
 * ================== TWO TIERS, AND WHY BOTH ==================
 *
 *  - **Tier A, `ladderTableFindings`** — the ladder's own tables, checked for monotonicity
 *    directly. Free, deterministic, cannot flake, runs on every push. It catches the whole class
 *    of defect where a status-keyed table simply disagrees with the severity order.
 *  - **Tier B, `runPocketLadder`** — the behavioural walk. Expensive, env-gated. It catches the
 *    class Tier A cannot see: an inversion produced by a FORMULA that reads severity numerically,
 *    by an interaction between two individually-monotone tables, or by a mechanic that reads the
 *    status without a table at all.
 *
 * Tier A alone would be a gate over a config file. Tier B alone would cost 135 seconds on every
 * push and get switched off. Neither subsumes the other and the pair is cheap where it can be.
 *
 * ================== THE TOLERANCE RULE, AND WHY `scenarios.ts`'s DOES NOT TRANSFER ==================
 *
 * `scenarios.ts` sets a tolerance by two halves: a NOISE margin of 4σ, and a SIGNAL margin of
 * `tolerance ≤ ½ × the smallest true step`. The second half is unusable here. Those ladders
 * assert a STRICT increase at every step and have an effect floor to prove it; this one asserts a
 * NON-STRICT ordering, and most of its true steps are legitimately at or near zero — the sack
 * rate moves +0.00116 from `CLEAN` to `PRESSURE`, because neither status forces anything. Half of
 * zero is zero, and a tolerance of zero on a sampled quantity is a coin flip.
 *
 * The half that survives verbatim is the noise margin, because it is written on the SIGNED step
 * and therefore still means something when the step is zero:
 *
 *   1. **NOISE MARGIN — `(signed step + tolerance) / step SD ≥ 4` for every step.** A step signed
 *      in the direction urgency requires. A flat step contributes `tolerance / SD`, so this alone
 *      forces `tolerance ≥ 4 SD` and nothing about it degenerates.
 *
 * The half that has to be replaced is the signal margin, and the replacement is the reason this
 * gate is not vacuous:
 *
 *   2. **SIGNAL MARGIN — `tolerance ≤ ½ × sensitivityTarget`**, where `sensitivityTarget` is the
 *      size of a KNOWN INVERSION the axis is required to catch. Not a step the ladder is supposed
 *      to produce — a defect it is supposed to find, MEASURED rather than asserted.
 *
 * Both halves together force `8 × stepSD ≤ sensitivityTarget`, which is a statement about `n` and
 * not about the tolerance. §22c: when the two halves conflict, `games` goes up. It may never be
 * satisfied by widening the tolerance and never by reducing `n`.
 *
 * ================== THE RED THIS GATE WAS RECORDED ON, AND WHY IT IS NOT ITS SIZER ANY MORE ==================
 *
 * The gate was recorded RED, deliberately and per §22a, against the engine as committed at
 * ADR-032: all three axes inverted at `IMMEDIATE → SACK` and nowhere else. **ADR-033 removed that
 * rung**, on the owner's ruling that a sack is an outcome and not a description of the space the
 * passer is working in, and the ladder became three steps with no edit in this package.
 *
 * `test/pocketLadderRerung.test.ts` step 2 forbids the cheap response, which is to delete the
 * fourth row and call the gate re-rung: **a tolerance with no defect behind it is unfalsifiable**,
 * and a gate that quietly loses the red it was sized against is indistinguishable from one that
 * never fired. So the red is RETIRED WITH ITS PROVENANCE, not truncated: every measure carries a
 * `retiredRed` recording what was measured, on what probe, at what `n`, and what removed it. It
 * is a permanent record and `knownTruth.pocket-status-ladder.test.ts` asserts it is still there.
 *
 * ================== WHAT SIZES THE TOLERANCES NOW ==================
 *
 * ADR-033 §7.1 suggested the `readCapacityDelta.SACK` orphan as the replacement sizer. **It
 * cannot be one, for two independent reasons, and this file says so rather than pretending
 * otherwise:**
 *
 *   1. ADR-033 *removed* it. There is no `readCapacityDelta.SACK` to re-introduce, and
 *      `applyTunablePatch` refuses a path that is not in the tree — correctly. A sizer has to be
 *      injectable through the public patch API or the number behind it is prose.
 *   2. Even when it existed it sized NOTHING on these axes. It was a Tier A finding: a table row
 *      keyed by a status, read only on ticks carrying that status. `sensitivityTarget` is a
 *      BEHAVIOURAL quantity — the size of an inversion in `runPocketLadder`'s output — and a row
 *      that is never read cannot produce one. Tier A already catches it, for free, in the sense
 *      that matters; it was never able to size Tier B.
 *
 * The replacement is `SIZING_DEFECT` below: **the top rung of the ladder neither forces a decision
 * nor permits a sack.** It is the SAME DEFECT CLASS as the retired red — an upward-closure hole in
 * `pocket.forcesDecision` and `pocket.sackWhenNoTarget`, which is exactly what `SACK`'s absence
 * from those two lists was — injected at the ladder's new top instead of its old one. It is two
 * leaf patches through `applyTunablePatch`, so it is reproducible by anyone; Tier A reports it as
 * `MEMBERSHIP_GAP` findings for free; and unlike the orphan it is behaviourally live, MEASURED at
 * 8 seed lists × 160 games, inverting every axis at the last step with 8/8 lists negative.
 *
 * **A SMALLER SIZER WAS TRIED FIRST AND REFUTED BY MEASUREMENT**, and the refutation is the reason
 * to trust the one that shipped. Holing `forcesDecision` ALONE is the smaller defect, and a
 * smaller defect makes a STRONGER signal margin (`tolerance ≤ ½ × target` is a constraint that a
 * large target relaxes), so it was measured first on the same 8 lists. It inverts `time_to_throw`
 * by −0.235 and **does not invert the other two axes at all**: `sack_rate` moves **+0.109** and
 * `net_yards_per_dropback` **+1.167**, both in the direction urgency requires. A quarterback who
 * is no longer forced to decide holds the ball longer, and holding it longer while
 * `sackWhenNoTarget` still names `IMMEDIATE` produces MORE sacks and FEWER yards. Two of three
 * tolerances would have had no defect behind them — the exact unfalsifiable state this apparatus
 * exists to prevent. The preference lost; the numbers are recorded in `hypothesis` so nobody has
 * to re-run them to find out why the sizer is the shape it is.
 *
 * ================== WHY THREE AXES AND NOT ONE ==================
 *
 * Sack rate is the obvious axis and it is the WEAKEST of the three, which was not the expected
 * result. It needs roughly six times the sample of time-to-throw to police the same ladder,
 * because its flat steps are noisy where its inversion is small. **The re-runging confirmed this
 * ordering rather than disturbing it, and it is also why the vector is not one axis: the sizing
 * defect's smaller sibling inverted `time_to_throw` and NOTHING ELSE.** A single-axis gate built
 * on either of the other two would have been blind to it. An axis-by-axis argument is in
 * `URGENCY_MEASURES` below, including the two urgency-adjacent measures that are REPORTED and
 * deliberately NOT asserted (scramble rate, throwaway rate) and the one that is excluded on the
 * same grounds `db-coverage` excludes it (completion rate).
 */
import type { PocketStatus } from "@ff/contracts";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { runBatch, type BatchResult } from "../harness/batch.js";
import { stableDigest } from "../harness/digest.js";
import { generateSeeds } from "../harness/seeds.js";
import { buildFlatLeague, syntheticTeamIds } from "../league/flat.js";

// ---------------------------------------------------------------------------
// THE LADDER ITSELF — read off the engine, never restated
// ---------------------------------------------------------------------------

/**
 * The severity order, ascending, DERIVED from `pocket.severity` rather than written down.
 *
 * This matters for exactly the change that is coming. The owner has ruled that `SACK` is an
 * OUTCOME and not a status and that a `match-engine` dispatch will remove it from the ladder. A
 * hard-coded five-element list would then assert an ordering over a rung that no longer exists
 * and would have to be edited by hand in the same commit — which is the shape of edit that
 * silently drops a rung. Derived, the gate follows the engine's own declaration: remove `SACK`
 * from `severity` and this ladder becomes four rungs with no edit here at all.
 */
export function pocketStatusLadder(tunables: Tunables = DEFAULT_TUNABLES): readonly PocketStatus[] {
  const severity = tunables.pocket.severity as Readonly<Record<string, number>>;
  return Object.entries(severity)
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name as PocketStatus);
}

/**
 * The rank of one status, and a `RangeError` for anything the ladder does not rank.
 *
 * THE THROW IS THE POINT, and it is Charter §4.1's "prefer a loud failure to a silent default".
 * The alternative — `severity[status] ?? 0` — ranks an unknown status as CLEAN, the SAFEST rung on
 * the ladder, which is how `SACK: 4` outranked `IMMEDIATE` unnoticed for as long as it did: a
 * silent ranking produces a plausible-looking number for a status nothing has ever ordered. It
 * matters more since ADR-033, not less: `PocketStatus` in `@ff/contracts` still admits `"SACK"`
 * while `pocket.severity` no longer ranks it, so this function is the boundary between a type that
 * is wider than the ladder and code that sorts by it. `packages/engine`'s
 * `pocketSeverityOfEmitted` throws for the same reason, on the same input.
 */
export function severityOf(status: string, tunables: Tunables = DEFAULT_TUNABLES): number {
  const severity = tunables.pocket.severity as Readonly<Record<string, number>>;
  const value = severity[status];
  if (value === undefined) {
    throw new RangeError(
      `"${status}" is not a rung of pocket.severity (have ${pocketStatusLadder(tunables).join(", ")})`,
    );
  }
  return value;
}

/**
 * ================== THE PROBE SET, DERIVED — EVERY BAND IN WHICH THE RUSHER IS AHEAD ==================
 *
 * `passRush.bands` labelled by `minMargin >= 1`, in the table's own (descending) order. At the
 * committed tunables that is `RUSHER_WINS_REP` (15+), `BLOCKER_BEATEN` (5–14) and
 * `RUSHER_GAINING` (1–4).
 *
 * WHY THIS DEFINITION AND NOT "THE DIRTY ROWS OF THE BAND MAP", which is what the probe used to
 * be documented as. ADR-033 amended §7.2 and re-shaped `passRush.bands` into six bands, splitting
 * the doc's old 1–14 interval: `BLOCKER_BEATEN` (new, 5–14) floors at PRESSURE and
 * `RUSHER_GAINING` (now 1–4) floors at **CLEAN**. The old two-element literal therefore survived
 * the change while quietly meaning something else — one clean row and one dirty one, described in
 * the file as "both DIRTY rows". Two problems with the old definition, and this one has neither:
 *
 *  1. **It went stale silently.** A literal pair cannot notice that a band was split underneath
 *     it. Derived, the probe follows the engine's own table; the gate asserts `probeBands` against
 *     this function, so a future band change is a LOUD failure with one instruction attached —
 *     re-derive the reach, which is the one input here that must be measured rather than read.
 *  2. **It was circular.** Selecting probe rows by their value in `minimumStatusByBand` picks the
 *     probe out of the very table `tunablesForRung` overwrites. Margin sign is independent of the
 *     classification under test: "the rusher is ahead on this rep" is a fact about §7.1's roll,
 *     and it stays true whatever §7.2 decides to call it.
 *
 * AND IT IS THE STRONGEST PROBE AVAILABLE, which is the whole reason the probe is chosen at all.
 * Every tolerance on this gate is sized by `8 × stepSD ≤ sensitivityTarget`, and REACH is the term
 * that moves the target without moving the SDs — measured, when `RUSHER_WINS_REP` was first added
 * to a one-band probe: target ×7.3, flat-step SDs unchanged. Taking every band in which the rusher
 * leads is the widest floor the walk can impose through this table.
 *
 * ⚠ IT DELIBERATELY OVERRIDES THE COMMITTED CLASSIFICATION, INCLUDING ADR-033's RULING. At every
 * rung above CLEAN the walk floors `RUSHER_GAINING` ticks at that rung, which is the opposite of
 * what the engine ships. That is not a disagreement with the ruling: the walk is a claim about
 * the LADDER MECHANIC — that imposing a worse rung never produces a better outcome — and not
 * about the band map's football content, which ADR-032 measured separately and priced at 2.382pp.
 * Each rung's `tunablesDigest` records exactly what ran.
 */
export function rusherAheadBands(tunables: Tunables = DEFAULT_TUNABLES): readonly string[] {
  const bands = tunables.passRush.bands as readonly {
    readonly label: string;
    readonly minMargin: number;
  }[];
  return bands.filter((b) => b.minMargin >= 1).map((b) => b.label);
}

// ---------------------------------------------------------------------------
// TIER A — THE LADDER'S OWN TABLES
// ---------------------------------------------------------------------------

/**
 * What a status-keyed table promises about the severity order.
 *
 *  - `NON_INCREASING` — a worse pocket's value is no LARGER. Penalties: the accuracy modifier and
 *    the read-capacity delta both get more negative as the pocket gets worse, or stay put.
 *  - `NON_DECREASING` — a worse pocket's value is no SMALLER. Entry requirements: a worse status
 *    needs at least as much accumulated pressure to reach.
 *  - `UPWARD_CLOSED` — membership. If status S is in the list, every status worse than S must be
 *    too. This is what "a list of statuses under which the quarterback must decide" MEANS: the
 *    list names a threshold, and a threshold with a hole in the top of it is not a threshold.
 */
export type LadderTableRule = "NON_INCREASING" | "NON_DECREASING" | "UPWARD_CLOSED";

export interface LadderTable {
  /** Dotted path, as a patch would address it. */
  readonly path: string;
  readonly rule: LadderTableRule;
  /** What the ordering means in football, printed on failure. */
  readonly meaning: string;
  /**
   * Rungs this table is not required to name. Non-empty ONLY where the omission is structural
   * and stated — the arrival horizons are the one case, and they are a status ladder expressed
   * as three separate scalar fields rather than a keyed table.
   */
  readonly exempt?: readonly PocketStatus[];
  /** `null` for a rung the table does not name. */
  read(tunables: Tunables): Readonly<Record<string, number | boolean | null>>;
}

function numberTable(
  source: Readonly<Record<string, unknown>>,
  ladder: readonly PocketStatus[],
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const rung of ladder) {
    const value = source[rung];
    out[rung] = typeof value === "number" ? value : null;
  }
  return out;
}

/**
 * EVERY TABLE IN REACH THAT IS KEYED BY, OR ORDERED BY, `PocketStatus`.
 *
 * Enumerated by hand and that is a liability, so `test/knownTruth.pocket-status-ladder.test.ts`
 * carries a companion check that walks `pocket` looking for any object whose key set is the
 * ladder and that is not listed here. A table added to the engine and not added to this list is
 * a table nothing gates, which is the same failure `knownTruth.test.ts`'s "every scenario has a
 * gate file" exists to prevent, one level down.
 */
export const LADDER_TABLES: readonly LadderTable[] = [
  {
    path: "pocket.accuracyModifier",
    rule: "NON_INCREASING",
    meaning:
      "§10.4's accuracy modifier by pocket status. A quarterback in a worse pocket throws no " +
      "more accurately than one in a better pocket.",
    read: (t) => numberTable(t.pocket.accuracyModifier as Readonly<Record<string, unknown>>, pocketStatusLadder(t)),
  },
  {
    path: "pocket.readCapacityDelta",
    rule: "NON_INCREASING",
    meaning:
      "§7.2's read-capacity penalty by pocket status. A quarterback in a worse pocket gets " +
      "through no MORE of his progression than one in a better pocket.",
    read: (t) => numberTable(t.pocket.readCapacityDelta as Readonly<Record<string, unknown>>, pocketStatusLadder(t)),
  },
  {
    path: "pocket.thresholds",
    rule: "NON_DECREASING",
    meaning:
      "`minProgress` needed to reach each status off the pressure counter. Reaching a worse " +
      "status takes at least as much accumulated pressure as reaching a better one.",
    read: (t) => {
      const ladder = pocketStatusLadder(t);
      const rows = t.pocket.thresholds as readonly { readonly label: string; readonly minProgress: number }[];
      const out: Record<string, number | null> = {};
      for (const rung of ladder) {
        const row = rows.find((r) => r.label === rung);
        out[rung] = row === undefined ? null : row.minProgress;
      }
      return out;
    },
  },
  {
    path: "pocket.forcesDecision",
    rule: "UPWARD_CLOSED",
    meaning:
      "§7.2's statuses under which the quarterback may no longer hold the ball. A pocket worse " +
      "than one that forces a decision must also force a decision.",
    read: (t) => {
      const list = t.pocket.forcesDecision as readonly string[];
      const out: Record<string, boolean> = {};
      for (const rung of pocketStatusLadder(t)) out[rung] = list.includes(rung);
      return out;
    },
  },
  {
    path: "pocket.sackWhenNoTarget",
    rule: "UPWARD_CLOSED",
    meaning:
      "§7.2's statuses under which the quarterback may go down. A pocket worse than one in " +
      "which he may be sacked must also be one in which he may be sacked.",
    read: (t) => {
      const list = t.pocket.sackWhenNoTarget as readonly string[];
      const out: Record<string, boolean> = {};
      for (const rung of pocketStatusLadder(t)) out[rung] = list.includes(rung);
      return out;
    },
  },
  {
    /**
     * THE LADDER EXPRESSED AS THREE SCALAR FIELDS INSTEAD OF A KEYED TABLE, which is why it took
     * a hand-written reader to find it. `pocketFloorFromArrival` walks these in order, so they
     * are a status ladder whatever their shape: the horizon for a worse status must be no wider
     * than the horizon for a better one, or a rusher could be simultaneously inside the worse
     * band and outside the better one.
     *
     * `CLEAN` is exempt and the exemption is structural, not a waiver: it is the fall-through when
     * nothing is travelling, so there is no horizon to state.
     *
     * `SACK` USED TO BE EXEMPT HERE TOO, and its exemption was recorded at the time as "a small
     * piece of evidence for the owner's ruling that `SACK` is not a status" — a rung with no
     * arrival horizon at all. The ruling landed (ADR-033) and the rung is gone, so the exemption
     * is gone with it rather than left behind: an entry naming a rung the ladder does not declare
     * is the same orphan ADR-033 removed from `readCapacityDelta`, on the gate's side of the
     * fence. `ladderTableFindings` iterates the DERIVED ladder, so the stale entry would have gone
     * unread rather than wrong — which is precisely why it had to be deleted deliberately.
     */
    path: "arrival.{immediate,collapsing,pressure}WithinSeconds",
    rule: "NON_INCREASING",
    meaning:
      "Time-to-arrival horizons that floor the pocket status. A worse status is reached by a " +
      "TIGHTER horizon, so the seconds must not increase as severity does.",
    exempt: ["CLEAN"],
    read: (t) => ({
      CLEAN: null,
      PRESSURE: t.arrival.pressureWithinSeconds,
      COLLAPSING: t.arrival.collapsingWithinSeconds,
      IMMEDIATE: t.arrival.immediateWithinSeconds,
    }),
  },
];

export interface LadderTableFinding {
  readonly path: string;
  readonly kind: "INVERSION" | "MEMBERSHIP_GAP" | "MISSING_RUNG";
  /** The strictly worse rung, and the better rung it is measured against. */
  readonly worse: PocketStatus;
  readonly better: PocketStatus;
  readonly detail: string;
}

/**
 * TIER A. Every finding, over every table, with no simulation. Deterministic and free.
 */
export function ladderTableFindings(
  tunables: Tunables = DEFAULT_TUNABLES,
): readonly LadderTableFinding[] {
  const ladder = pocketStatusLadder(tunables);
  const findings: LadderTableFinding[] = [];

  for (const table of LADDER_TABLES) {
    const values = table.read(tunables);
    const exempt = new Set<string>(table.exempt ?? []);

    for (const rung of ladder) {
      if (exempt.has(rung)) continue;
      if (values[rung] === null || values[rung] === undefined) {
        findings.push({
          path: table.path,
          kind: "MISSING_RUNG",
          worse: rung,
          better: rung,
          detail:
            `"${rung}" is a rung of pocket.severity and ${table.path} does not name it. An ` +
            `unnamed rung reads as the table's default, which makes the ladder's order ` +
            `unobservable at that rung rather than merely wrong.`,
        });
      }
    }

    // Every ordered pair, not only adjacent ones: an inversion can skip a rung, and
    // "IMMEDIATE is worse than PRESSURE and gets a better value" is a finding even when
    // COLLAPSING sits between them holding the adjacent comparisons green.
    for (let i = 0; i < ladder.length; i++) {
      for (let j = i + 1; j < ladder.length; j++) {
        const better = ladder[i];
        const worse = ladder[j];
        if (better === undefined || worse === undefined) continue;
        if (exempt.has(better) || exempt.has(worse)) continue;
        const a = values[better];
        const b = values[worse];
        if (a === null || a === undefined || b === null || b === undefined) continue;

        if (table.rule === "UPWARD_CLOSED") {
          if (a === true && b === false) {
            findings.push({
              path: table.path,
              kind: "MEMBERSHIP_GAP",
              worse,
              better,
              detail:
                `${table.path} contains "${better}" (severity ` +
                `${severityOf(better, tunables)}) and NOT "${worse}" (severity ` +
                `${severityOf(worse, tunables)}). ${table.meaning} A pocket the engine has ` +
                `labelled worse is therefore LESS constraining than one it has labelled better.`,
            });
          }
          continue;
        }

        if (typeof a !== "number" || typeof b !== "number") continue;
        const inverted = table.rule === "NON_INCREASING" ? b > a : b < a;
        if (inverted) {
          findings.push({
            path: table.path,
            kind: "INVERSION",
            worse,
            better,
            detail:
              `${table.path}["${worse}"] = ${b} and ${table.path}["${better}"] = ${a}, but ` +
              `"${worse}" (severity ${severityOf(worse, tunables)}) is worse than "${better}" ` +
              `(severity ${severityOf(better, tunables)}) and the table is ${table.rule}. ` +
              `${table.meaning}`,
          });
        }
      }
    }
  }

  return findings;
}

export function renderTableFindings(findings: readonly LadderTableFinding[]): string {
  if (findings.length === 0) return "pocket-status ladder tables: monotone in severity";
  return [
    `POCKET-STATUS LADDER: ${findings.length} table finding(s). Charter §4.1 — an ordered enum ` +
      `whose order carries meaning gets a monotonicity gate, and this is the free half of it.`,
    ...findings.map((f) => `  [${f.kind}] ${f.path} — ${f.worse} vs ${f.better}\n      ${f.detail}`),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// THE SIZING DEFECT — what every tolerance on this gate is measured against
// ---------------------------------------------------------------------------

/**
 * **THE TOP RUNG OF THE LADDER NEITHER FORCES A DECISION NOR PERMITS A SACK.**
 *
 * `pocket.forcesDecision` and `pocket.sackWhenNoTarget` are both `["COLLAPSING", "IMMEDIATE"]`.
 * This replaces the second entry of each with a duplicate of the first, so both lists still
 * contain `COLLAPSING` and neither contains `IMMEDIATE`: the status the engine calls WORSE than
 * `COLLAPSING` becomes LESS constraining than it, in both of the two places where this ladder's
 * ordinal becomes a decision.
 *
 * IT IS THE RETIRED RED, RE-INJECTED AT THE LADDER'S NEW TOP. `SACK` sat on top of `severity` and
 * was absent from these exact two lists; that was the whole defect, and ADR-033 closed it by
 * removing the rung. The sizer re-opens the same hole one rung down, which is why the recorded
 * targets below are commensurable with the retired ones instead of being a fresh unit.
 *
 * ⚠ **BOTH LISTS, BECAUSE ONE WAS MEASURED AND REFUSED.** The first version of this sizer holed
 * `forcesDecision` ALONE, on the argument that the smallest honest defect makes the strongest
 * signal margin (`tolerance ≤ ½ × target` is a constraint a large target relaxes). Eight seed
 * lists × 160 games refuted it: it inverts `time_to_throw` by −0.235 (8/8 lists) and **does not
 * invert the other two axes at all** — `sack_rate` moves +0.109 and `net_yards_per_dropback`
 * +1.167, both in the direction urgency requires. The mechanism is plain in hindsight: a
 * quarterback who is no longer FORCED to decide holds the ball longer, and holding the ball
 * longer with `sackWhenNoTarget` still intact produces MORE sacks and FEWER yards, not fewer
 * sacks. Two of three axes would have had no defect behind their tolerance — which is exactly the
 * unfalsifiable state this whole apparatus exists to prevent. The preference lost to the
 * measurement; the measurement is recorded in `hypothesis` so the next reader does not re-run it.
 *
 * WHY DUPLICATES RATHER THAN SHORTER LISTS. `applyTunablePatch` patches LEAVES; an array element
 * is a leaf and an array's length is not. Overwriting index 1 is the only membership change
 * expressible through the public API, and expressibility is the requirement — a sizer built by
 * hand-editing a cloned tunables tree is a defect nobody else can reproduce.
 * `list.includes(status)` is how every reader consults these lists, and a duplicate is invisible
 * to `includes`.
 *
 * IT IS ALSO STALE-PROOF. Each patch names `currentValue: "IMMEDIATE"`, so if either list is
 * reordered or its top entry changes, `applyTunablePatch` throws `TunablePatchError`: the sizer
 * fails loudly and the gate's own free registry test (which applies it) reddens, rather than
 * sizing itself against a defect that has quietly stopped being one. That is the failure mode
 * ADR-033 §7.1 warned about, made structurally impossible instead of merely remembered.
 *
 * ON `sackWhenNoTarget` BEING FROZEN: ADR-027 settled this — *frozen means not editable, never
 * not observable*. Nothing here proposes a value. The patch is in memory, in an env-gated
 * instrument, and dies with the process; `packages/engine/src/tunables.ts` is not written by this
 * package at all.
 */
export const SIZING_DEFECT = {
  label:
    "the top rung of the ladder neither forces a decision nor permits a sack " +
    "(forcesDecision and sackWhenNoTarget both lose IMMEDIATE)",
  patches: [
    { tunableId: "pocket.forcesDecision.1", currentValue: "IMMEDIATE", proposedValue: "COLLAPSING" },
    {
      tunableId: "pocket.sackWhenNoTarget.1",
      currentValue: "IMMEDIATE",
      proposedValue: "COLLAPSING",
    },
  ],
  evidence:
    "POCKET-STATUS MONOTONICITY GATE — the sizing defect for `sensitivityTarget`, injected to " +
    "MEASURE what this gate must be able to catch. Not a proposal. In-memory only; " +
    "packages/engine/src/tunables.ts is unchanged and this patch dies with the process (ADR-027).",
  expectedEffect:
    "re-opens the upward-closure hole ADR-033 closed, at the ladder's new top: the walk's worst " +
    "rung stops both forcing a decision and permitting a sack, so the last step of every axis " +
    "inverts",
} as const;

/**
 * `DEFAULT_TUNABLES` with `SIZING_DEFECT` applied. Used by the env-gated instrument that MEASURES
 * `sensitivityTarget`, and by the gate's free registry test, which asserts only that the defect
 * still applies and that Tier A still reports it.
 */
export function tunablesWithSizingDefect(base: Tunables = DEFAULT_TUNABLES): Tunables {
  let out = base;
  for (const patch of SIZING_DEFECT.patches) {
    out = applyTunablePatch(out, {
      tunableId: patch.tunableId,
      currentValue: patch.currentValue,
      proposedValue: patch.proposedValue,
      evidence: SIZING_DEFECT.evidence,
      expectedEffect: SIZING_DEFECT.expectedEffect,
    });
  }
  return out;
}

/**
 * A red this gate was recorded on and no longer measures, kept with its provenance.
 *
 * §22a's rule is that a gate which has never fired is indistinguishable from a vacuous one, and
 * `test/pocketLadderRerung.test.ts` step 2 adds the corollary: a gate that DELETES the red it
 * fired on is back in the same position, one commit later and less visibly. So a retired red is
 * recorded, not removed, and the gate asserts its presence.
 */
export interface RetiredLadderRed {
  /** The step that inverted, in the ladder that existed when it was measured. */
  readonly step: string;
  /** Signed inversion, in the measure's own direction — negative. */
  readonly inversion: number;
  /** SD of that step across the independent seed lists below. */
  readonly stepSD: number;
  readonly probeBands: readonly string[];
  readonly games: number;
  readonly seedLists: number;
  readonly measuredAgainst: string;
  /** What removed the rung, and therefore the step. */
  readonly retiredBy: string;
  readonly note: string;
}

// ---------------------------------------------------------------------------
// TIER B — THE URGENCY VECTOR
// ---------------------------------------------------------------------------

/**
 * One rung's worth of simulation, reduced to the counts every axis is computed from. Kept as
 * COUNTS rather than as rates so a measure can choose its own denominator and two measures that
 * disagree about one are visibly disagreeing.
 */
export interface LadderSample {
  /** Pass plays, however they ended — the play-level denominator. */
  readonly dropbacks: number;
  readonly sacks: number;
  readonly attempts: number;
  readonly completions: number;
  readonly scrambles: number;
  readonly throwaways: number;
  /**
   * `throwaways` above, partitioned by `THROWAWAY.payload.cause` (ADR-056 amended beside; backlog
   * entry 100). Read straight off `PlayFold.throwawaysByCause` — no re-derivation on this side
   * either. `Object.values(...)` sums to `throwaways` by the same construction `collect.ts`
   * documents and `test/metrics.test.ts` pins.
   */
  readonly throwawaysByCause: Readonly<Record<string, number>>;
  readonly pressuredDropbacks: number;
  /** Seconds from snap to release, one entry per throw. */
  readonly throwTicks: readonly number[];
  /** Gross passing yards on completions, and sack yardage as a POSITIVE number. */
  readonly passYards: number;
  readonly sackYards: number;
  /** `attempts + sacked`, from the statlines — `NET_YARDS_PER_DROPBACK`'s denominator. */
  readonly statlineDropbacks: number;
}

export interface UrgencyMeasure {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  /** Which way a WORSE pocket must move it. */
  readonly direction: "INCREASES" | "DECREASES";
  /**
   * How far one step may travel the wrong way before the ladder is called inverted. Set by the
   * two-margin rule in this file's header and asserted by the gate's registry test.
   */
  readonly tolerance: number;
  /**
   * THE INVERSION THIS AXIS IS REQUIRED TO CATCH, measured with `SIZING_DEFECT` injected. Not a
   * step the ladder is meant to produce — a defect it is meant to find. Lowering it to make a
   * widened tolerance legal is a visible falsification: the defect is a named patch anyone can
   * re-apply, `test/pocketLadderRerung.test.ts` re-measures it on demand, and the gate asserts
   * that the patch still applies to the committed tree.
   */
  readonly sensitivityTarget: number;
  /** Mean signed step, in `direction`'s sign, across independent seed lists. One per step. */
  readonly recordedSteps: readonly number[];
  /** SD of ONE ladder's step across those lists, at this scenario's `games`. */
  readonly recordedStepSD: readonly number[];
  /** The red this axis was recorded on before ADR-033 removed the step it lived at. */
  readonly retiredRed: RetiredLadderRed;
  /** `null` when there were not enough observations to say anything. */
  measure(sample: LadderSample): number | null;
}

/**
 * ================== THE AXES, ONE ARGUMENT EACH ==================
 *
 * The dispatch that commissioned this gate asked for "a small ordered vector of urgency
 * measures" and asked the choice to be justified. Three are asserted, three are reported, and
 * one is excluded. Every exclusion below is a case where the measure moves for TWO opposite
 * mechanisms, so its sign cannot police an ordering:
 *
 *  - **`scramble_rate` — REPORTED, NOT ASSERTED.** A worse pocket should push the quarterback off
 *    his spot more often, so the naive direction is INCREASES. But scrambles and sacks compete
 *    for the same plays: past some urgency the rusher arrives before the escape can start, and a
 *    genuinely worse pocket produces FEWER scrambles and more sacks. The measure is legitimately
 *    non-monotone at the top of the ladder, so asserting it would manufacture a red the day the
 *    engine got MORE correct. It is printed on every failure because it is diagnostic — at the
 *    recorded red it moves −6.35pp, and it moves that way for the opposite reason (no sack ever
 *    came).
 *  - **`throwaway_rate` — REPORTED, NOT ASSERTED.** A throwaway is produced either by urgency (a
 *    forced decision with nobody open) or by the clock expiring with nobody open. Those are
 *    opposite mechanisms wearing the same event, and at the recorded red it is the second one:
 *    throwaways rise +2.78pp *because* the pocket forced nothing and the play simply ran out.
 *    An axis whose sign depends on which mechanism produced the event cannot police an ordering.
 *    ⚠ Backlog entry 100 (ADR-056 amended beside) partitioned this by `THROWAWAY.payload.cause` —
 *    `throwaway_rate_pocket_duress` / `throwaway_rate_clock_expired` in `DIAGNOSTIC_MEASURES`
 *    below — so a reader no longer has to take "which mechanism" on faith. On the CANONICAL
 *    baseline arm (a different corpus from this ladder walk) the split runs the other way from
 *    this file's own recorded red: 81.25% `POCKET_DURESS`, 18.75% `CLOCK_EXPIRED` (496 games,
 *    batch seed `baseline-0001`) — see `tier1.ts`'s `throwaway_rate_pocket_duress` header for the
 *    full measurement. The two corpora disagreeing is expected, not a contradiction: this walk
 *    imposes a single rung on a flat-2-team league, the baseline arm runs `DEFAULT_TUNABLES` on
 *    32 teams, and neither claims to describe the other.
 *  - **`completion_rate` — EXCLUDED**, on the same grounds `db-coverage-net-yards-per-dropback`
 *    excludes it (see its measurement's doc comment): pocket urgency changes WHICH throws happen,
 *    not only how they end, so completion rate can rise as the pocket worsens purely through
 *    selection. `net_yards_per_dropback` closes that channel by putting the sacks in the
 *    denominator and their yardage in the numerator, and it is here in its place.
 */
export const URGENCY_MEASURES: readonly UrgencyMeasure[] = [
  {
    /**
     * THE OBVIOUS AXIS, AND THE WEAKEST OF THE THREE. Its flat steps are the noisiest on the
     * ladder relative to their own scale — `PRESSURE → COLLAPSING` has an SD of 0.00235 against a
     * true step of 0.00047, five times the step — so it needs the largest tolerance as a fraction
     * of anything it could catch. With the ONE-BAND probe ADR-032 used it could not satisfy both
     * margins at any sample size this suite can afford (see the scenario's `hypothesis`); it
     * satisfies them comfortably on the two-band probe, which is why the probe is what it is.
     */
    id: "sack_rate",
    label: "sack rate",
    unit: "share of dropbacks",
    direction: "INCREASES",
    tolerance: 0.012,
    sensitivityTarget: 0.07003,
    recordedSteps: [0.00016, 0.00047, 0.00065],
    recordedStepSD: [0.001, 0.00235, 0.00203],
    retiredRed: {
      step: "IMMEDIATE→SACK",
      inversion: -0.13071,
      stepSD: 0.00296,
      probeBands: ["RUSHER_GAINING", "RUSHER_WINS_REP"],
      games: 160,
      seedLists: 8,
      measuredAgainst: "the engine as committed at ADR-032 (8/8 seed lists negative)",
      retiredBy: "ADR-033 ruling 2 — `SACK` left `pocket.severity`, so the step no longer exists",
      note:
        "The whole ladder BELOW the retired step was flat on this axis: CLEAN through IMMEDIATE " +
        "moved it 0.00128 in total, less than one SD of a single step. The inversion was 102× " +
        "the sum of the healthy ladder.",
    },
    measure: (s) => (s.dropbacks < 200 ? null : s.sacks / s.dropbacks),
  },
  {
    /**
     * URGENCY, MEASURED DIRECTLY, and the axis that makes this a vector rather than a scalar.
     * The ladder's entire claim is that a worse pocket compresses the quarterback's clock; this
     * is that sentence, as a number. It is also the axis that would catch an inversion which
     * never reached the box score — a pocket that stops constraining the quarterback shows up
     * here first and in `sack_rate` only if the extra time changes how the play ENDS.
     */
    id: "time_to_throw",
    label: "time to throw",
    unit: "seconds",
    direction: "DECREASES",
    tolerance: 0.025,
    sensitivityTarget: 0.34967,
    recordedSteps: [-0.00007, 0.02556, 0.00008],
    recordedStepSD: [0.00166, 0.00328, 0.00413],
    retiredRed: {
      step: "IMMEDIATE→SACK",
      inversion: -0.40996,
      stepSD: 0.00558,
      probeBands: ["RUSHER_GAINING", "RUSHER_WINS_REP"],
      games: 160,
      seedLists: 8,
      measuredAgainst: "the engine as committed at ADR-032 (8/8 seed lists negative)",
      retiredBy: "ADR-033 ruling 2 — `SACK` left `pocket.severity`, so the step no longer exists",
      note:
        "Exactly ONE step of the healthy ladder was alive on this axis, PRESSURE→COLLAPSING at " +
        "+0.02556 ± 0.00328, and it is the step where `forcesDecision` first contains the " +
        "status. That observation is why `forcesDecision` is the sizing defect now: the " +
        "membership boundary is where this ladder's urgency actually lives.",
    },
    measure: (s) =>
      s.throwTicks.length < 200
        ? null
        : s.throwTicks.reduce((a, b) => a + b, 0) / s.throwTicks.length,
  },
  {
    /**
     * THE COMPOSITE. Sacks in the denominator and their yardage in the numerator, which is what
     * closes the selection channel that disqualifies completion rate — `db-coverage`'s
     * `NET_YARDS_PER_DROPBACK` doc comment has the measurement that established it, on the
     * coverage side of the same problem. It is the axis that catches "the offence simply did
     * better" whatever channel the improvement arrived through, and it is the only one of the
     * three that a reader can price in football terms.
     */
    id: "net_yards_per_dropback",
    label: "net yards per dropback",
    unit: "yards",
    direction: "DECREASES",
    tolerance: 0.12,
    sensitivityTarget: 0.72298,
    recordedSteps: [0.04088, 0.11898, 0.48243],
    recordedStepSD: [0.02319, 0.04546, 0.0899],
    retiredRed: {
      step: "IMMEDIATE→SACK",
      inversion: -1.93256,
      stepSD: 0.08522,
      probeBands: ["RUSHER_GAINING", "RUSHER_WINS_REP"],
      games: 160,
      seedLists: 8,
      measuredAgainst: "the engine as committed at ADR-032 (8/8 seed lists negative)",
      retiredBy: "ADR-033 ruling 2 — `SACK` left `pocket.severity`, so the step no longer exists",
      note:
        "The one axis that moved at EVERY rung of the healthy ladder (+0.04088 / +0.11898 / " +
        "+0.48243), because it also reads `accuracyModifier` and `readCapacityDelta`, which do " +
        "vary rung to rung.",
    },
    measure: (s) =>
      s.statlineDropbacks < 200 ? null : (s.passYards - s.sackYards) / s.statlineDropbacks,
  },
];

/**
 * Reported beside every failure and asserted by nothing. See `URGENCY_MEASURES`'s header.
 *
 * ⛔ Renamed `pressure_rate` → `threat_creation_rate` alongside `tier1.ts`'s registered metric of
 * the same computation (backlog entry 93): this entry computes the identical sim-side quantity
 * (`pressuredDropbacks / dropbacks`) under the name that used to imply a real-football comparison
 * this known-truth diagnostic never made in the first place — it was already SIM SIDE ONLY,
 * reported and never graded, same as the rest of this list. Renamed for consistency so a reader
 * grepping for the old name after the Tier 1 metric's strip does not find one instance retired and
 * a second, identically-computed one still answering to the old name.
 *
 * ⛔⛔ `throwaway_rate` PARTITIONED, backlog entry 100 (ADR-056 amended beside). This axis's own
 * header above already named the problem — a throwaway is produced by two opposite mechanisms
 * wearing the same event — and until this dispatch nothing here separated them either.
 * `throwaway_rate_pocket_duress` and `throwaway_rate_clock_expired` are the partition, read off
 * `LadderSample.throwawaysByCause` (itself read straight off `THROWAWAY.payload.cause`, never
 * re-derived); `throwaway_rate` stays as a DECLARED DERIVED ROW — their sum, kept because this
 * exact name is what every existing reference to "the throwaway rate" in this file's own prose and
 * in the backlog already means, and because `tier1.ts` registers the identical three-row shape
 * (same ids) on the canonical baseline arm — a DIFFERENT corpus (that arm's default tunables
 * rather than this file's imposed-rung walk), kept in sync by name on purpose (backlog entry 93's
 * naming precedent), not by accident.
 *
 * Still REPORTED, NOT ASSERTED, same as before and for the same reason — nothing here claims the
 * split is monotone across the ladder; it only stops merging two mechanisms into one number.
 */
export const DIAGNOSTIC_MEASURES: readonly {
  readonly id: string;
  readonly measure: (s: LadderSample) => number | null;
}[] = [
  { id: "scramble_rate", measure: (s) => (s.dropbacks === 0 ? null : s.scrambles / s.dropbacks) },
  { id: "throwaway_rate", measure: (s) => (s.dropbacks === 0 ? null : s.throwaways / s.dropbacks) },
  {
    id: "throwaway_rate_pocket_duress",
    measure: (s) =>
      s.dropbacks === 0 ? null : (s.throwawaysByCause["POCKET_DURESS"] ?? 0) / s.dropbacks,
  },
  {
    id: "throwaway_rate_clock_expired",
    measure: (s) =>
      s.dropbacks === 0 ? null : (s.throwawaysByCause["CLOCK_EXPIRED"] ?? 0) / s.dropbacks,
  },
  { id: "completion_rate", measure: (s) => (s.attempts === 0 ? null : s.completions / s.attempts) },
  {
    id: "threat_creation_rate",
    measure: (s) => (s.dropbacks === 0 ? null : s.pressuredDropbacks / s.dropbacks),
  },
];

// ---------------------------------------------------------------------------
// THE SCENARIO
// ---------------------------------------------------------------------------

export interface PocketLadderScenario {
  readonly id: string;
  readonly hypothesis: string;
  /**
   * The `pocket.minimumStatusByBand` cells the rung is written into: every band in which the
   * rusher is ahead, as `rusherAheadBands()` derives them. See that function for the derivation
   * and `hypothesis` for the measured reach it buys.
   */
  readonly probeBands: readonly string[];
  readonly games: number;
  readonly measures: readonly UrgencyMeasure[];
}

export const POCKET_STATUS_LADDER_SCENARIO: PocketLadderScenario = {
  id: "pocket-status-ladder",
  hypothesis:
    "A strictly worse pocket never produces a strictly better outcome. `pocket.severity` ranks " +
    "CLEAN(0) < PRESSURE(1) < COLLAPSING(2) < IMMEDIATE(3); the walk imposes each rung as a floor " +
    "and asserts the outcome ordering follows. Config throughout: seed " +
    "known-truth:pocket-status-ladder, 160 games a rung, flat-60 two-team FLAT_SYNTHETIC, " +
    "SYNTHETIC_PAIR 2024, caller v2 with FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN. Every ± below is " +
    "the SD of ONE ladder's step across EIGHT independent seed lists, never the SE of the mean of " +
    "eight: the gate runs one ladder, so what threatens it is a single draw (§22c). " +
    "THE LADDER IS NOW THREE STEPS AND IT IS MONOTONE, RE-RECORDED 2026-07-29 AFTER ADR-033. " +
    "Signed so that negative is an inversion — sack rate +0.00016 ± 0.00100 / +0.00047 ± 0.00235 " +
    "/ +0.00065 ± 0.00203; time to throw −0.00007 ± 0.00166 / +0.02556 ± 0.00328 / " +
    "+0.00008 ± 0.00413; net yards per dropback +0.04088 ± 0.02319 / +0.11898 ± 0.04546 / " +
    "+0.48243 ± 0.08990. NOT ONE STEP IS AN INVERSION, which is why the gate needs a defect it " +
    "does not currently contain in order to stay falsifiable at all — see THE SIZING DEFECT. " +
    "THE RED THIS GATE WAS RECORDED ON IS RETIRED, NOT DELETED, and lives on each measure as " +
    "`retiredRed`: IMMEDIATE→SACK at −0.13071 ± 0.00296 (sack), −0.40996 ± 0.00558 (ttt), " +
    "−1.93256 ± 0.08522 (nypd), 8/8 lists negative on all three, measured against the engine as " +
    "committed at ADR-032 on the two-band probe. ADR-033 ruling 2 removed `SACK` from " +
    "`pocket.severity` and the step went with it. Per pocketLadderRerung step 2 the row may not " +
    "simply be dropped: a tolerance whose defect has been fixed is unfalsifiable, so the record " +
    "is kept and the tolerance is re-sized against something live. " +
    "THE THREE HEALTHY STEPS REPRODUCED THE PREVIOUS RECORD ALMOST EXACTLY, and that is a result " +
    "rather than a coincidence. Steps 0 and 1 agree to five decimals on all three axes and every " +
    "SD is unchanged; step 2 (COLLAPSING→IMMEDIATE) moved by 0.00016s on time to throw, 0.04σ. " +
    "The reason is that the old probe named every band with margin ≥ 1 and so does the new one: " +
    "ADR-033's split of the doc's 1–14 interval into BLOCKER_BEATEN (5–14) and RUSHER_GAINING " +
    "(1–4) RELABELS the same reps, and a probe defined as `rusherAheadBands()` covers the union " +
    "either way. The residue at step 2 is the old SACK rung, which the walk could reach through " +
    "`pocket.thresholds` at minProgress 9 and can no longer reach at all. " +
    "THE SIZING DEFECT — WHAT THE TOLERANCES ARE MEASURED AGAINST NOW, AND WHY IT IS NOT WHAT " +
    "ADR-033 §7.1 SUGGESTED. That ADR proposed the `readCapacityDelta.SACK` orphan as the " +
    "replacement sizer. It cannot be one: ADR-033 REMOVED that row, so there is nothing to " +
    "re-introduce and `applyTunablePatch` correctly refuses a path that is not in the tree; and " +
    "even when it existed it was a Tier A finding — a table row read only on ticks carrying a " +
    "status — so it could never have produced a behavioural inversion to size Tier B with. The " +
    "sizer is instead `SIZING_DEFECT`: pocket.forcesDecision.1 and pocket.sackWhenNoTarget.1 " +
    "both \"IMMEDIATE\"→\"COLLAPSING\", which re-opens at the ladder's NEW top the exact " +
    "upward-closure hole `SACK` used to sit in. Measured on 8 lists × 160 games, it inverts every " +
    "axis at COLLAPSING→IMMEDIATE, 8/8 lists negative: sack −0.07003 ± 0.00156, ttt " +
    "−0.34967 ± 0.00549, nypd −0.72298 ± 0.06090. " +
    "THE SMALLER SIZER WAS TRIED FIRST AND REFUTED, MEASURED RATHER THAN ARGUED. Holing " +
    "`forcesDecision` alone is the smaller defect and a smaller target makes a STRONGER signal " +
    "margin, so it was measured first on the same 8 lists — and it inverts ONLY time to throw " +
    "(−0.23525 ± 0.00624, 8/8). Sack rate moves +0.10860 ± 0.00454 and net yards per dropback " +
    "+1.16715 ± 0.08930, both in the direction urgency requires, because a quarterback who is no " +
    "longer FORCED to decide holds the ball longer and — with `sackWhenNoTarget` still naming " +
    "IMMEDIATE — is sacked MORE, not less. Two of three tolerances would have had no defect " +
    "behind them. The preference lost to the measurement. " +
    "THE PROBE, AND ITS REACH RE-DERIVED. `rusherAheadBands()` — every band with minMargin ≥ 1: " +
    "RUSHER_WINS_REP (15+), BLOCKER_BEATEN (5–14), RUSHER_GAINING (1–4). MEASURED at " +
    "DEFAULT_TUNABLES on the gate's own league and seed lists, 3 lists × 160 games, ~14,000 " +
    "dropbacks a list: PROBE REACH 98.36% ± 0.10pp of dropbacks. The old record claimed ~95% for " +
    "a probe documented as \"both DIRTY rows\", and after ADR-033 that description was wrong " +
    "twice over — RUSHER_GAINING is now a CLEAN row, and the ~95% was never the pair's reach in " +
    "the first place. Per-band, dropbacks touched: RUSHER_WINS_REP 95.53%, BLOCKER_BEATEN " +
    "53.35%, RUSHER_GAINING 28.72%. So the ~95% figure was RUSHER_WINS_REP alone, correct as a " +
    "number and mis-attributed as an argument; the other two bands add at most 2.83pp of union " +
    "reach on top of it. The probe is defined by margin sign and not by the status map because " +
    "the status map is the thing `tunablesForRung` overwrites — see `rusherAheadBands()`. " +
    "THE TOLERANCES, UNCHANGED BY THE RE-RECORD, AND WHAT WOULD DEFEAT THEM. sack 0.012 (17.1% " +
    "of the inversion it must catch; the flat steps sit 12.2σ / 5.3σ / 6.2σ clear of it), ttt " +
    "0.025 (7.2%; 15.0σ / 15.4σ / 6.1σ), nypd 0.12 (16.6%; 6.9σ / 5.3σ / 6.7σ). NOT ONE " +
    "TOLERANCE WAS WIDENED and `games` was not lowered: the re-record moved the targets down " +
    "(0.13071→0.07003, 0.40996→0.34967, 1.93256→0.72298) because the new sizer is a smaller " +
    "defect than the old one, and all three still clear both margins at 160 games. " +
    "WHAT THE THREE HEALTHY STEPS SAY, WHICH IS AS MUCH AS THE DEFECT DOES. On sack rate the " +
    "whole ladder is FLAT — CLEAN through IMMEDIATE moves it 0.00128 in total, less than one SD " +
    "of a single step. On time to throw exactly ONE step is alive, PRESSURE→COLLAPSING at " +
    "+0.02556 ± 0.00328, and that is the step where `forcesDecision` first contains the status: " +
    "the ladder's only real urgency transition is the membership boundary, not the severity " +
    "number. That observation is now load-bearing — it is why the sizing defect is a membership " +
    "hole. Net yards per dropback is the one axis that moves at every rung (0.041 / 0.119 / " +
    "0.482), because it also reads `accuracyModifier` and `readCapacityDelta`, which do vary rung " +
    "to rung. " +
    "THE FREE HALF IS NOW GREEN AND THAT IS ALSO RECORDED. `ladderTableFindings` reported 7 " +
    "findings on DEFAULT_TUNABLES before ADR-033 — `forcesDecision` and `sackWhenNoTarget` " +
    "omitting SACK (ADR-032 §2b), and `pocket.readCapacityDelta.SACK = 0`, better than " +
    "PRESSURE's −1, COLLAPSING's −1 and IMMEDIATE's −2, so a quarterback in the worst pocket got " +
    "his FULL progression back. That third cause was found by this gate and by nothing else, and " +
    "it was not reachable by any amount of batch statistics: it is a table, and reading the table " +
    "is free. It reports 0 on the committed tree and ≥2 with `SIZING_DEFECT` applied, which the " +
    "gate asserts so that Tier A cannot go quietly vacuous either.",
  probeBands: ["RUSHER_WINS_REP", "BLOCKER_BEATEN", "RUSHER_GAINING"],
  games: 160,
  measures: URGENCY_MEASURES,
};

// ---------------------------------------------------------------------------
// TIER B — THE WALK
// ---------------------------------------------------------------------------

/** The batch seed the gate's ladder runs on. The gate never uses any other. */
export function canonicalPocketLadderSeed(scenario: PocketLadderScenario): string {
  return `known-truth:${scenario.id}`;
}

/**
 * The tunables that impose one rung. `applyTunablePatch` only, in memory — the same split
 * ADR-027 established and `pocketBandSweep.test.ts` has used three times since.
 *
 * A cell already holding the rung's value is skipped, so the rung that happens to equal the
 * committed value returns `DEFAULT_TUNABLES` itself and its arm is EXACT rather than merely
 * equivalent.
 */
export function tunablesForRung(
  scenario: PocketLadderScenario,
  status: PocketStatus,
  base: Tunables = DEFAULT_TUNABLES,
): Tunables {
  let out = base;
  for (const band of scenario.probeBands) {
    const table = base.pocket.minimumStatusByBand as Readonly<Record<string, string>>;
    const current = table[band];
    if (current === undefined) {
      throw new RangeError(
        `"${band}" is not a row of pocket.minimumStatusByBand — the probe would patch nothing ` +
          `and the ladder would measure five copies of the committed configuration.`,
      );
    }
    if (current === status) continue;
    out = applyTunablePatch(out, {
      tunableId: `pocket.minimumStatusByBand.${band}`,
      currentValue: current,
      proposedValue: status,
      evidence:
        "POCKET-STATUS MONOTONICITY GATE (Charter §4.1) — a ladder walk, not a proposal. " +
        "In-memory only; packages/engine/src/tunables.ts is unchanged and this patch dies with " +
        "the process.",
      expectedEffect:
        "imposes one rung of the severity ladder as a floor on the bands the probe names, so " +
        "the walk's input ordering is guaranteed by pocket.severity itself",
    });
  }
  return out;
}

export interface PocketLadderRung {
  readonly status: PocketStatus;
  readonly severity: number;
  readonly sample: LadderSample;
  /** Axis id → value, `null` when under-sampled. */
  readonly measured: Readonly<Record<string, number | null>>;
  readonly diagnostics: Readonly<Record<string, number | null>>;
  readonly tunablesDigest: string;
  readonly batchSeed: string;
  readonly seedDigest: string;
  readonly games: number;
}

export interface PocketLadderAxis {
  readonly measure: UrgencyMeasure;
  /** One per step, SIGNED IN `direction`'s SENSE — negative is an inversion. */
  readonly steps: readonly (number | null)[];
  readonly monotone: boolean;
  /** The most negative signed step, or 0. */
  readonly worstInversion: number;
  /** Which step that was, or −1. */
  readonly worstStep: number;
}

export interface PocketLadderResult {
  readonly scenario: PocketLadderScenario;
  readonly rungs: readonly PocketLadderRung[];
  readonly axes: readonly PocketLadderAxis[];
  readonly tableFindings: readonly LadderTableFinding[];
  readonly monotone: boolean;
  readonly report: string;
}

export function signedSteps(
  measure: UrgencyMeasure,
  values: readonly (number | null)[],
): readonly (number | null)[] {
  const sign = measure.direction === "INCREASES" ? 1 : -1;
  const steps: (number | null)[] = [];
  for (let i = 1; i < values.length; i++) {
    const previous = values[i - 1];
    const current = values[i];
    steps.push(previous == null || current == null ? null : sign * (current - previous));
  }
  return steps;
}

export function axisFor(
  measure: UrgencyMeasure,
  values: readonly (number | null)[],
): PocketLadderAxis {
  const steps = signedSteps(measure, values);
  let worstInversion = 0;
  let worstStep = -1;
  for (const [i, step] of steps.entries()) {
    if (step === null) continue;
    if (step < worstInversion) {
      worstInversion = step;
      worstStep = i;
    }
  }
  return {
    measure,
    steps,
    monotone: Math.abs(worstInversion) <= measure.tolerance,
    worstInversion,
    worstStep,
  };
}

/** The counts one rung's batch produced, reduced from the fold and the statlines. */
export function sampleOf(result: BatchResult): LadderSample {
  const p = result.accumulator.play;
  let passYards = 0;
  let sackYards = 0;
  let attempts = 0;
  let sacked = 0;
  for (const line of Object.values(result.accumulator.player.statlines)) {
    passYards += line.passing.yards;
    sackYards += line.passing.sackYards;
    attempts += line.passing.attempts;
    sacked += line.passing.sacked;
  }
  return {
    dropbacks: p.dropbacks,
    sacks: p.sacks,
    attempts: p.passAttempts,
    completions: p.completions,
    scrambles: p.scrambles,
    throwaways: p.throwaways,
    throwawaysByCause: p.throwawaysByCause,
    pressuredDropbacks: p.pressuredDropbacks,
    throwTicks: p.throwTicks,
    passYards,
    sackYards,
    statlineDropbacks: attempts + sacked,
  };
}

export interface RunPocketLadderOptions {
  /**
   * A REPLICATE's batch seed, replacing `known-truth:{id}`.
   *
   * The same rule `assertions.ts` states and `knownTruth.test.ts` enforces: this is how a step SD
   * is measured across independent seed lists, and **the gate must never pass it**. A gate whose
   * seeds can be re-drawn is a gate somebody re-runs until it is green.
   */
  readonly batchSeed?: string;
  /** Overrides `scenario.games`. For the reproducibility check only; the gate never passes it. */
  readonly games?: number;
  /**
   * The tunables the rungs are patched ON TOP OF. `DEFAULT_TUNABLES` for every honest walk.
   *
   * IT EXISTS FOR EXACTLY ONE CALLER: the instrument that measures `sensitivityTarget`, which
   * walks the ladder with `SIZING_DEFECT` injected and records how far the last step inverts. That
   * measurement is the gate's whole falsifiability — a tolerance sized against nothing is
   * unfalsifiable — and it has to run the SAME instrument the gate runs, not a rebuilt copy of it
   * (see `test/pocketLadderRerung.test.ts`'s ⛔ list).
   *
   * **The gate must never pass it**, for the same reason it must never pass `batchSeed`: a gate
   * that can be handed its own base tunables is a gate that can be walked on a tree nobody
   * committed. `knownTruth.pocket-status-ladder.test.ts` greps its own source for both.
   */
  readonly base?: Tunables;
}

/**
 * ================== EVERY RUNG RUNS ON THE SAME SEEDS ==================
 *
 * Common random numbers, for the reason `assertions.ts`'s header gives at length: the dice are
 * addressed by `(seed, gameId, playNumber, fork label)` and none of those depends on the
 * tunables, so the five rungs share a schedule and a raw roll stream and differ only by what the
 * pocket status did with them.
 *
 * IT BUYS LESS HERE THAN IT DOES THERE, AND THE PLACE IT STOPS BUYING IS ITSELF THE FINDING.
 * Measured across eight seed lists at 160 games, the `CLEAN → PRESSURE` step's SD on sack rate is
 * 0.00100 and the `PRESSURE → COLLAPSING` step's is 0.00235 — 2.4× larger, on the same games and
 * the same dice. The reason is mechanical: `PRESSURE` is not in `forcesDecision`, `COLLAPSING`
 * is, so that step is where the pocket starts ending plays early and the paired trajectories
 * DECOHERE. Pairing survives a rung that changes a modifier and does not survive a rung that
 * changes which plays happen. Every tolerance is set from the decohered steps, not the paired
 * ones — which is also why the ladder's cheapest-looking step is not the one that sizes `games`.
 */
export async function runPocketLadder(
  scenario: PocketLadderScenario = POCKET_STATUS_LADDER_SCENARIO,
  options: RunPocketLadderOptions = {},
): Promise<PocketLadderResult> {
  const teams = syntheticTeamIds(2);
  const home = teams[0];
  const away = teams[1];
  if (home === undefined || away === undefined) throw new Error("two teams required");

  const games = options.games ?? scenario.games;
  const batchSeed = options.batchSeed ?? canonicalPocketLadderSeed(scenario);
  const base = options.base ?? DEFAULT_TUNABLES;
  const seeds = generateSeeds(batchSeed, games);
  const ladder = pocketStatusLadder(base);

  const rungs: PocketLadderRung[] = [];
  for (const status of ladder) {
    const tunables = tunablesForRung(scenario, status, base);
    const result = await runBatch({
      // A flat league, because the ladder is a claim about the POCKET MECHANIC and a designed
      // roster would put an attribute between the rung and the outcome. `FLAT_SYNTHETIC` is the
      // control condition (`league/flat.ts`): every contest evenly matched, so every number this
      // walk produces is a statement about the formula.
      league: buildFlatLeague({ teams: 2, variant: `pocket-ladder-${status}` }),
      schedule: { kind: "SYNTHETIC_PAIR", home, away, games, season: 2024 },
      seeds,
      playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
      ...(tunables === DEFAULT_TUNABLES
        ? {}
        : { tunables, tunablesVersion: `pocket-status-ladder:${status}` }),
    });
    const severity = severityOf(status, base);
    const sample = sampleOf(result);
    const measured: Record<string, number | null> = {};
    for (const m of scenario.measures) measured[m.id] = m.measure(sample);
    const diagnostics: Record<string, number | null> = {};
    for (const d of DIAGNOSTIC_MEASURES) diagnostics[d.id] = d.measure(sample);
    rungs.push({
      status,
      severity,
      sample,
      measured,
      diagnostics,
      tunablesDigest: result.provenance.tunablesDigest,
      batchSeed,
      seedDigest: result.seeds.digest,
      games,
    });
  }

  const axes = scenario.measures.map((m) =>
    axisFor(m, rungs.map((r) => r.measured[m.id] ?? null)),
  );
  const tableFindings = ladderTableFindings(base);
  const monotone = axes.every((a) => a.monotone);

  return {
    scenario,
    rungs,
    axes,
    tableFindings,
    monotone,
    report: renderPocketLadder(scenario, rungs, axes, tableFindings),
  };
}

function fmt(value: number | null, places: number): string {
  return value === null ? "n/a" : value.toFixed(places);
}

export function renderPocketLadder(
  scenario: PocketLadderScenario,
  rungs: readonly PocketLadderRung[],
  axes: readonly PocketLadderAxis[],
  tableFindings: readonly LadderTableFinding[],
): string {
  const lines: string[] = [
    `known-truth "${scenario.id}" — the pocket-status ladder, walked`,
    `  property: a strictly worse pocket never produces a strictly better outcome`,
    `  probe: pocket.minimumStatusByBand.{${scenario.probeBands.join(",")}} set to each rung of ` +
      `pocket.severity, in memory, via applyTunablePatch`,
    `  rungs (ascending severity): ${rungs.map((r) => `${r.status}(${r.severity})`).join(" → ")}`,
    "",
  ];

  for (const axis of axes) {
    const m = axis.measure;
    const places = m.unit === "yards" || m.unit === "seconds" ? 4 : 5;
    const values = rungs.map((r) => `${r.status} ${fmt(r.measured[m.id] ?? null, places)}`);
    const steps = axis.steps.map((s, i) => {
      const from = rungs[i]?.status ?? "?";
      const to = rungs[i + 1]?.status ?? "?";
      const flag = s !== null && s < -m.tolerance ? "  ← INVERTED" : "";
      return `      ${from}→${to}: ${s === null ? "n/a" : (s >= 0 ? "+" : "") + s.toFixed(places)}${flag}`;
    });
    lines.push(
      `  [${axis.monotone ? "ok " : "RED"}] ${m.label} (${m.unit}), worse pocket ${m.direction}`,
      `      ${values.join(" | ")}`,
      `    signed steps (negative = inversion), tolerance ${m.tolerance}:`,
      ...steps,
    );
    if (!axis.monotone) {
      const from = rungs[axis.worstStep]?.status ?? "?";
      const to = rungs[axis.worstStep + 1]?.status ?? "?";
      lines.push(
        `    → WORST: ${from}→${to} at ${axis.worstInversion.toFixed(places)}, which is ` +
          `${(Math.abs(axis.worstInversion) / m.tolerance).toFixed(1)}× the tolerance and ` +
          `${(Math.abs(axis.worstInversion) / (m.recordedStepSD[axis.worstStep] ?? Number.NaN)).toFixed(1)}σ ` +
          `on the recorded step SD (${m.recordedStepSD[axis.worstStep] ?? "?"}).`,
      );
    }
    lines.push("");
  }

  lines.push("  diagnostics (reported, asserted by nothing — see URGENCY_MEASURES' header):");
  for (const d of DIAGNOSTIC_MEASURES) {
    lines.push(
      `      ${d.id.padEnd(16)} ${rungs.map((r) => `${r.status} ${fmt(r.diagnostics[d.id] ?? null, 5)}`).join(" | ")}`,
    );
  }
  lines.push(
    "",
    `  reproduce: batch seed "${rungs[0]?.batchSeed ?? "?"}", ${scenario.games} games per rung, ` +
      `SHARED across every rung (common random numbers) — seed digest ${rungs[0]?.seedDigest ?? "?"}`,
    `  tunables digests: ${rungs.map((r) => `${r.status} ${r.tunablesDigest}`).join(" | ")}`,
  );

  if (tableFindings.length > 0) {
    lines.push("", "  " + renderTableFindings(tableFindings).split("\n").join("\n  "));
  }
  return lines.join("\n");
}

export interface PocketLadderFailure {
  readonly kind: "TABLE" | "MONOTONICITY" | "NO_OBSERVATIONS";
  readonly report: string;
}

export function pocketLadderFailures(result: PocketLadderResult): readonly PocketLadderFailure[] {
  const failures: PocketLadderFailure[] = [];
  if (result.rungs.some((r) => Object.values(r.measured).some((v) => v === null))) {
    failures.push({
      kind: "NO_OBSERVATIONS",
      report:
        `${result.report}\n  → a rung produced too few observations for an axis to measure. ` +
        `Raise \`games\`, never lower a measure's minimum-sample threshold (§22c).`,
    });
    return failures;
  }
  const broken = result.axes.filter((a) => !a.monotone);
  if (broken.length > 0) {
    failures.push({
      kind: "MONOTONICITY",
      report:
        `${result.report}\n` +
        `  → THE POCKET-STATUS LADDER IS NON-MONOTONE IN URGENCY on ` +
        `${broken.map((a) => a.measure.id).join(", ")}. A pocket the engine labels WORSE ` +
        `produced a BETTER outcome. This is a claim about the LADDER, not about a rating: the ` +
        `walk runs a flat-60 league under common random numbers, so no attribute varies across ` +
        `the rungs and nothing but the status can have moved the outcome.\n` +
        `     First place to look: whether every mechanic that reads the status agrees with ` +
        `pocket.severity's order. \`ladderTableFindings\` answers that half for free and its ` +
        `findings are printed above when there are any.`,
    });
  }
  return failures;
}
