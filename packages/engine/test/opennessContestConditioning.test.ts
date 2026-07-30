/**
 * ADR-048's TWO CONSTRAINTS, AND THE LADDER THEY CONSTRAIN.
 *
 * The ruling states them as SPECIFICATION — neither is the engine's to choose:
 *
 *   1. **A receiver who won his rep by more is never less open at any later
 *      tick.** The load-bearing invariant.
 *   2. **Gain must not fully erase the rep's margin at any tick within the
 *      route's live window.** The property whose absence created the finding:
 *      convergence means *the contest decided nothing*.
 *
 * ========== WHICH CLAIM IS BEING ASSERTED, SAID OUT LOUD (backlog entry 54) ==========
 *
 * `CALIBRATION-BACKLOG.md` entry 54: **`orderViolations` is green on a tie BY
 * CONSTRUCTION, on all 52 orderable columns** — it fires only when a column both
 * rises and falls, so it asserts NON-INVERSION and never STRICTNESS, and the two
 * differ on exactly the case a ruling is most likely to care about.
 *
 * So each case below says which of the two it is:
 *
 *   - **Constraint 1 is a MONOTONICITY claim (`≥`), and that is correct**, not a
 *     weakening. The ruling's words are *"never LESS open"*. Two rows may
 *     legitimately share a gain rate — `TRAILING` and `EVEN` both hold at 0 in
 *     the steady phase — and forbidding that would be inventing a law nobody
 *     ruled, which is the ADR-043 error.
 *   - **Constraint 2 is a STRICTNESS claim (`>`)**, and it is the one entry 54
 *     warns about: a tie between two rep outcomes IS the margin being erased,
 *     and no non-inversion check anywhere in this project would see it.
 *
 * That distinction is the whole reason these are two cases and not one.
 */
import { describe, expect, it } from "vitest";
import { TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { opennessAt, opennessGainOverSteps } from "../src/resolve/route.js";
import { settledOpennessAt } from "../src/resolve/zoneCoverage.js";
import type { ContestPosition } from "../src/types.js";

// ---------------------------------------------------------------------------
// The subject, derived from the tables rather than restated.
// ---------------------------------------------------------------------------

interface RepRow {
  readonly site: string;
  readonly label: string;
  readonly openness: number;
  readonly contest: ContestPosition;
  readonly settled: boolean;
}

/**
 * Every outcome of a §9.3 rep, in table order — best margin first. DERIVED: a
 * row added, removed or re-pointed appears here on the next run, and the pins
 * below then speak about it without anyone editing a list.
 */
function manRows(t: Tunables): RepRow[] {
  return t.manCoverage.bands.map((b) => ({
    site: "§9.3",
    label: b.label,
    openness: b.openness as number,
    contest: b.contest as ContestPosition,
    settled: false,
  }));
}

/** Every outcome of a §9.4 rep. `uncovered` is NOT here — see the case that uses it. */
function zoneRows(t: Tunables): RepRow[] {
  return t.zoneCoverage.bands.map((b) => ({
    site: "§9.4",
    label: b.label,
    openness: b.openness as number,
    contest: b.contest as ContestPosition,
    settled: b.settled,
  }));
}

function opennessOf(t: Tunables, row: RepRow, ready: number, tick: number): number {
  return row.settled
    ? settledOpennessAt(t, row.openness, ready, tick, row.contest)
    : opennessAt(t, row.openness, ready, tick, row.contest);
}

/** Every `readySeconds` a route can break at, jam delays included. */
function readyTimes(t: Tunables): number[] {
  const bases = Object.values(t.route.readySeconds);
  const delays = t.release.bands.map((b) => b.delaySeconds);
  const out = new Set<number>();
  for (const b of bases) for (const d of delays) out.add(Number((b + d).toFixed(3)));
  return [...out].sort((a, b) => a - b);
}

/** Every tick the engine can ask about, from the break to the hard stop. */
function ticksFrom(t: Tunables, ready: number): number[] {
  const out: number[] = [];
  for (let tick = ready; tick <= t.clock.maxTick + 1e-9; tick += t.clock.tickStepSeconds) {
    out.push(Number(tick.toFixed(3)));
  }
  return out;
}

/** The window in which GAIN is the operative term: the break to the decay point. */
function gainTicksFrom(t: Tunables, ready: number): number[] {
  return ticksFrom(t, ready).filter((tick) => tick <= t.route.decayStartsAtSeconds + 1e-9);
}

// ---------------------------------------------------------------------------
// THE LADDER
// ---------------------------------------------------------------------------

describe("ADR-048 — the contest ladder's shape", () => {
  /**
   * ⚠ WHAT WOULD MAKE THIS GO RED? A rate that stopped being an integer multiple
   *   of §8.7's own `+5`. That is the derivation claim itself — *nothing invented
   *   but the pattern* — and it is the claim a future tuning pass is most likely
   *   to break silently, because a fractional multiple would still satisfy every
   *   other case in this file.
   *
   * ⚠ WHAT IT CANNOT SEE: whether the multiples are the RIGHT ones. That is a
   *   reading of ADR-048, not a property of the tree.
   */
  it("every rate is an integer multiple of §8.7's unit", () => {
    const cells = Object.entries(TUNABLES.route.contestGain.byContest).flatMap(([k, v]) => [
      [`${k}.burst`, v.burst] as const,
      [`${k}.steady`, v.steady] as const,
    ]);
    for (const [name, multiple] of cells) {
      expect(`${name}=${String(multiple)} integral:${String(Number.isInteger(multiple))}`).toBe(
        `${name}=${String(multiple)} integral:true`,
      );
    }
    expect(Number.isInteger(TUNABLES.route.contestGain.burstSteps)).toBe(true);
  });

  /**
   * THE RULING'S SHAPE, ASSERTED: *"a higher gain for the ticks immediately after
   * the break, then converges toward a lower steady rate."*
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? A class whose steady rate exceeds its burst —
   *   i.e. a receiver who separates FASTER the longer the play goes on, which is
   *   the "widen forever" shape option 2 was refused for.
   */
  it("burst is never below steady, in any contest class", () => {
    const offenders = Object.entries(TUNABLES.route.contestGain.byContest)
      .filter(([, r]) => r.burst < r.steady)
      .map(([n, r]) => `${n}: burst ${String(r.burst)} < steady ${String(r.steady)}`);
    expect(offenders).toEqual([]);
  });

  /**
   * THE ORDER OF THE LADDER, which is what makes constraint 1 true by
   * construction rather than by measurement. `contest` is monotone down both
   * band tables, so if the rates are monotone across `contest` then openness is
   * monotone in margin at every tick.
   *
   * ⚠ THIS IS A MONOTONICITY CLAIM (`≥`), NOT A STRICTNESS ONE, and deliberately:
   *   `TRAILING` and `EVEN` share a steady rate of 0 and must be allowed to.
   *   Per entry 54, a green here says NOTHING about ties — and the fact that two
   *   classes DO tie in the steady phase is exactly why that has to be said.
   */
  it("rates are monotone across TRAILING > EVEN > IN_FRONT — for burst and for steady", () => {
    const order: readonly ContestPosition[] = ["TRAILING", "EVEN", "IN_FRONT"];
    const g = TUNABLES.route.contestGain.byContest;
    const burst = order.map((c) => g[c].burst);
    const steady = order.map((c) => g[c].steady);
    const nonIncreasing = (xs: readonly number[]): boolean =>
      xs.every((x, i) => i === 0 || x <= (xs[i - 1] as number));
    expect(`burst ${burst.join(">=")} ok:${String(nonIncreasing(burst))}`).toBe(
      `burst ${burst.join(">=")} ok:true`,
    );
    expect(`steady ${steady.join(">=")} ok:${String(nonIncreasing(steady))}`).toBe(
      `steady ${steady.join(">=")} ok:true`,
    );
  });

  /**
   * THE PREMISE THE ABOVE RESTS ON: `contest` is monotone down each band table.
   * If a table were re-ordered so that a better margin produced a defender in a
   * better position, conditioning on `contest` would invert the column and every
   * other case here would still be green.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? A band table whose `contest` column rises —
   *   which is also the situation in which ADR-048's whole key stops working.
   *   This is the single most load-bearing assertion in the file.
   */
  it("`contest` is monotone down BOTH band tables — the key's own precondition", () => {
    const rank: Record<ContestPosition, number> = { TRAILING: 2, EVEN: 1, IN_FRONT: 0 };
    for (const rows of [manRows(TUNABLES), zoneRows(TUNABLES)]) {
      const seq = rows.map((r) => `${r.label}:${r.contest}`);
      const ranks = rows.map((r) => rank[r.contest]);
      const ok = ranks.every((x, i) => i === 0 || x <= (ranks[i - 1] as number));
      expect(`${seq.join(" ")} monotone:${String(ok)}`).toBe(`${seq.join(" ")} monotone:true`);
    }
  });

  /** The accumulated gain, per class, over the longest window a route can have. */
  it("records the accumulated gain curve for each contest class", () => {
    const curve = (c: ContestPosition): string =>
      [0, 1, 2, 3, 4].map((n) => opennessGainOverSteps(TUNABLES, c, n)).join(",");
    expect([
      `TRAILING ${curve("TRAILING")}`,
      `EVEN ${curve("EVEN")}`,
      `IN_FRONT ${curve("IN_FRONT")}`,
    ]).toEqual([
      "TRAILING 0,10,20,20,20",
      "EVEN 0,5,10,10,10",
      "IN_FRONT 0,0,0,-5,-10",
    ]);
  });
});

// ---------------------------------------------------------------------------
// CONSTRAINT 1
// ---------------------------------------------------------------------------

describe("ADR-048 constraint 1 — a receiver who won by more is never less open at any later tick", () => {
  /**
   * ⚠ THIS IS A MONOTONICITY (`≥`) ASSERTION AND SAYS SO. Per entry 54, that is
   *   NOT a strictness check: two rows carrying the same openness would pass here
   *   by construction. Strictness is constraint 2's case below, and the two are
   *   separated precisely because a single combined case would let a reader
   *   believe this one had ruled out ties.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? A rate ladder that is not monotone across
   *   `contest`, a band table whose `contest` column rises, or a clamp applied
   *   non-monotonically (`clamp` and `Math.round` are both monotone, which is why
   *   the rounding cannot break it — but a future `Math.floor` on one branch and
   *   `Math.ceil` on another would, and nothing else in the tree would notice).
   *
   * It is asserted over the FULL grid — every `readySeconds` a jam can produce,
   * every tick to `clock.maxTick` — rather than at sampled points, because the
   * interesting failures are at the clamps and the clamps are at the edges.
   */
  it("holds over every row pair, every break time and every tick, in BOTH tables", () => {
    const failures: string[] = [];
    for (const rows of [manRows(TUNABLES), zoneRows(TUNABLES)]) {
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const better = rows[i] as RepRow;
          const worse = rows[j] as RepRow;
          for (const ready of readyTimes(TUNABLES)) {
            for (const tick of ticksFrom(TUNABLES, ready)) {
              const a = opennessOf(TUNABLES, better, ready, tick);
              const b = opennessOf(TUNABLES, worse, ready, tick);
              if (a < b) {
                failures.push(
                  `${better.site} ${better.label} ${String(a)} < ${worse.label} ${String(b)} ` +
                    `@ready=${String(ready)} tick=${String(tick)}`,
                );
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  /**
   * THE FAILING CASE, so a green above cannot mean *"the loop found nothing
   * because it ran over nothing"* (Charter §4.1: only failing a check tells you
   * what it does). An inverted ladder — the loser gaining faster than the winner
   * — must be caught.
   */
  it("REDDENS on an inverted ladder", () => {
    const inverted = {
      ...TUNABLES,
      route: {
        ...TUNABLES.route,
        contestGain: {
          ...TUNABLES.route.contestGain,
          byContest: {
            TRAILING: { burst: 0, steady: 0 },
            EVEN: { burst: 1, steady: 0 },
            IN_FRONT: { burst: 8, steady: 2 },
          },
        },
      },
    } as unknown as Tunables;
    const rows = manRows(inverted);
    const violations: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        for (const tick of ticksFrom(inverted, 1.0)) {
          const a = opennessOf(inverted, rows[i] as RepRow, 1.0, tick);
          const b = opennessOf(inverted, rows[j] as RepRow, 1.0, tick);
          if (a < b) violations.push(`${String(i)}<${String(j)}@${String(tick)}`);
        }
      }
    }
    expect(violations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CONSTRAINT 2
// ---------------------------------------------------------------------------

describe("ADR-048 constraint 2 — gain must not erase the rep's margin", () => {
  /**
   * ⚠ THIS IS A STRICTNESS (`>`) ASSERTION, and it is the one entry 54 exists to
   *   warn about: **a tie between two rep outcomes IS the margin erased**, and
   *   `orderViolations` — the project's only other ordering instrument — is green
   *   on a tie by construction on every one of its 52 columns. Nothing else in
   *   the tree could ever see this.
   *
   * ⚠ SCOPE: THE GAIN WINDOW, `[readySeconds, decayStartsAtSeconds]`. That is the
   *   constraint's own word — *"**Gain** must not fully erase"* — and it is not a
   *   convenient reading. §8.7's DECAY is uniform and REP-INDEPENDENT: after the
   *   decay point every row loses the same 5 a tick and the bottom of the column
   *   is driven onto `route.minOpenness`, where rows meet. That is true of the
   *   pre-ADR-048 engine too, and it is FORCED — see the next case, which proves
   *   no choice available to this change avoids it.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? Any two rep outcomes reaching the same
   *   openness while the gain is still running: a burst large enough to push two
   *   rows into `maxOpenness`, a steady rate that pulls a row down onto the row
   *   beneath it, or two adjacent rows given the same base and the same class.
   */
  it("strictly ordered at every tick of the gain window, in BOTH tables", () => {
    const failures: string[] = [];
    for (const rows of [manRows(TUNABLES), zoneRows(TUNABLES)]) {
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const better = rows[i] as RepRow;
          const worse = rows[j] as RepRow;
          for (const ready of readyTimes(TUNABLES)) {
            for (const tick of gainTicksFrom(TUNABLES, ready)) {
              const a = opennessOf(TUNABLES, better, ready, tick);
              const b = opennessOf(TUNABLES, worse, ready, tick);
              if (a <= b) {
                failures.push(
                  `${better.site} ${better.label}=${String(a)} vs ${worse.label}=${String(b)} ` +
                    `@ready=${String(ready)} tick=${String(tick)}`,
                );
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  /**
   * ⛔ THE COLLISION AT THE SCALE FLOOR IS FORCED BY THE RULING, NOT BY THE RATES
   *    CHOSEN — AND IT IS MEASURED HERE RATHER THAN ASSUMED AWAY.
   *
   * Past the decay point §8.7 takes 5 a tick off everybody, rep-independent. The
   * bottom §9.3 row starts at 6, so it reaches `minOpenness` quickly, and the row
   * above it follows; from then on the two lost-rep outcomes are indistinguishable
   * — the strictness above does not hold in the decay phase.
   *
   * THE PART THAT MATTERS: this is not a consequence of the ladder's values. The
   * ruling says a lost rep does not gain. Any mechanic obeying that leaves the
   * bottom rows at their base values entering the decay phase, and the decay then
   * annihilates the difference. The case below re-runs the whole grid over EVERY
   * ladder in which `IN_FRONT` does not gain and shows the collision in all of
   * them — a proof over the design space, not a demonstration on one point in it.
   *
   * The recorded ticks are the honest quantification of what the change costs:
   * the pre-ADR-048 tree collided later, because the loser was accumulating +20
   * of cushion before the decay started. That cushion IS the defect.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? A collision tick moving. It is recorded, not
   *   bounded, because there is no ruled bound to compare against — this is the
   *   number the owner is owed, and ADR-048 §6 brings it as a question rather
   *   than tidying it.
   */
  it("records the tick at which the two lost-rep rows meet at the scale floor, and proves it forced", () => {
    const firstCollision = (t: Tunables): string => {
      const rows = manRows(t);
      for (const tick of ticksFrom(t, 1.0)) {
        for (let i = 0; i < rows.length; i++) {
          for (let j = i + 1; j < rows.length; j++) {
            const a = opennessOf(t, rows[i] as RepRow, 1.0, tick);
            const b = opennessOf(t, rows[j] as RepRow, 1.0, tick);
            if (a === b) {
              return `${String(tick)} ${(rows[i] as RepRow).label}=${(rows[j] as RepRow).label}=${String(a)}`;
            }
          }
        }
      }
      return "never";
    };

    const flat = {
      ...TUNABLES,
      route: {
        ...TUNABLES.route,
        contestGain: {
          burstSteps: 0,
          byContest: {
            TRAILING: { burst: 1, steady: 1 },
            EVEN: { burst: 1, steady: 1 },
            IN_FRONT: { burst: 1, steady: 1 },
          },
        },
      },
    } as unknown as Tunables;

    expect([
      `pre-ADR-048 (flat +1u): ${firstCollision(flat)}`,
      `ADR-048: ${firstCollision(TUNABLES)}`,
    ]).toEqual([
      "pre-ADR-048 (flat +1u): never",
      "ADR-048: 3.5 CB_ON_HIP=CB_IN_POSITION=0",
    ]);

    // AND IT IS FORCED. Every ladder in which a lost rep does not gain collides
    // inside `clock.maxTick`, whatever the other classes do.
    const survivors: string[] = [];
    for (const burst of [-2, -1, 0]) {
      for (const steady of [-2, -1, 0]) {
        const candidate = {
          ...TUNABLES,
          route: {
            ...TUNABLES.route,
            contestGain: {
              ...TUNABLES.route.contestGain,
              byContest: {
                ...TUNABLES.route.contestGain.byContest,
                IN_FRONT: { burst, steady },
              },
            },
          },
        } as unknown as Tunables;
        if (firstCollision(candidate) === "never") survivors.push(`${String(burst)}/${String(steady)}`);
      }
    }
    expect(survivors).toEqual([]);
  });

  /**
   * THE FINDING'S OWN SHAPE, MEASURED: **how many ticks of holding it takes for a
   * lost rep to become as open as a won rep was at its break.**
   *
   * This is what "the contest decided nothing" meant. A flat gain makes that
   * number FINITE for every pair — the rep decides only *when* a receiver reaches
   * a given openness, never *whether*. ADR-046's Need is the same statement about
   * the SA-08 correction: *"a 15-18 point base correction is recovered in ~3.3
   * steps."*
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? A lost rep regaining a positive gain rate.
   *   It is deliberately expressed as `∞` / a step count rather than as a
   *   threshold, because the interesting content is the CHANGE IN KIND — finite
   *   to infinite — and a threshold would hide that behind a number.
   *
   * ⚠ WHAT IT CANNOT SEE: pairs inside one contest class. Two `TRAILING` rows
   *   share a curve, so the worse one still passes the better one's BREAK value
   *   after two steps — under any positive gain, including a correct one. That is
   *   route development, not erasure, and the case says so rather than pretending
   *   the number is infinite everywhere.
   *
   * ⚠ AND ONE RECORDED "never" IS NOT A RESULT — READ IT BEFORE QUOTING IT. Under
   *   the FLAT gain a lost rep never reaches the top row's break openness either,
   *   and that is arithmetic, not football: the gain window is at most 4 steps and
   *   a flat `+1u` is `+20`, while `70 − 6` is 64. The pair that MOVES is the one
   *   against the EVEN row, and it moves from four steps to never. This case is
   *   kept in the file precisely because the naive reading of it — *"both are
   *   never, so nothing changed"* — is wrong in the way entry 55 is about.
   */
  it("records the hold-time equivalence between a won rep and a lost one", () => {
    const stepsToReach = (t: Tunables, worse: RepRow, target: number): string => {
      const ticks = ticksFrom(t, 1.0);
      for (let i = 0; i < ticks.length; i++) {
        if (opennessOf(t, worse, 1.0, ticks[i] as number) >= target) return `${String(i)} steps`;
      }
      return "never";
    };
    const rows = manRows(TUNABLES);
    const won = rows[0] as RepRow;          // SEPARATION_5_PLUS @70, TRAILING
    const evenRep = rows[4] as RepRow;      // EVEN_BRACKET      @25, EVEN
    const lost = rows[7] as RepRow;         // CB_IN_POSITION    @6,  IN_FRONT

    const flat = {
      ...TUNABLES,
      route: {
        ...TUNABLES.route,
        contestGain: {
          burstSteps: 0,
          byContest: {
            TRAILING: { burst: 1, steady: 1 },
            EVEN: { burst: 1, steady: 1 },
            IN_FRONT: { burst: 1, steady: 1 },
          },
        },
      },
    } as unknown as Tunables;

    expect([
      `flat: lost rep reaches the won rep's break openness in ${stepsToReach(flat, lost, won.openness)}`,
      `flat: lost rep reaches the even rep's break openness in ${stepsToReach(flat, lost, evenRep.openness)}`,
      `ADR-048: lost rep reaches the won rep's break openness in ${stepsToReach(TUNABLES, lost, won.openness)}`,
      `ADR-048: lost rep reaches the even rep's break openness in ${stepsToReach(TUNABLES, lost, evenRep.openness)}`,
    ]).toEqual([
      // Arithmetic, not football — see the note above. Both arms read "never".
      "flat: lost rep reaches the won rep's break openness in never",
      // THE LINE THAT MOVES, and it is the finding.
      "flat: lost rep reaches the even rep's break openness in 4 steps",
      "ADR-048: lost rep reaches the won rep's break openness in never",
      "ADR-048: lost rep reaches the even rep's break openness in never",
    ]);
  });
});

// ---------------------------------------------------------------------------
// THE THRESHOLD MATRIX, IN TIME
// ---------------------------------------------------------------------------

/**
 * `test/opennessScaleConsumers.test.ts` records which of §8.4's seven threshold
 * consumers each producer row permits AT THE BREAK. ADR-048 is a claim about what
 * happens AFTER the break, so the same matrix is recorded over TIME here.
 *
 * This is the finding in its most legible form: under a flat gain a lost rep's
 * permission set grows until it matches a won rep's, and *that* is the erasure —
 * not the arithmetic gap between two rows, which a flat gain preserves exactly.
 */
const THRESHOLDS: readonly (readonly [string, (t: Tunables) => number])[] = [
  ["throwThreshold", (t) => t.qb.throwThreshold],
  ["checkdown", (t) => t.qb.checkdown.threshold],
  ["desperation", (t) => t.qb.desperationThreshold],
];

describe("ADR-048 — the threshold permissions each rep outcome earns over time", () => {
  /**
   * ⚠ WHAT WOULD MAKE THIS GO RED? Any of: a rate change, a base openness change,
   *   a threshold moving, `burstSteps` moving. It is a RECORDED CLASSIFICATION,
   *   the same instrument shape as `opennessScaleConsumers.test.ts` and for the
   *   same stated reason — a threshold comparison has no natural invariant, so
   *   the loudest available failure is a record that cannot survive its subject
   *   moving.
   *
   * ⚠ IT IS NOT A TARGET. Every number in it is the value the doc or a prior
   *   ruling put there. If a line looks wrong, that is a petition with a football
   *   argument, never an edit here.
   */
  it("records the permission set per rep outcome per tick, on a QUICK route", () => {
    const rows = manRows(TUNABLES);
    const line = (row: RepRow): string => {
      const cells = gainTicksFrom(TUNABLES, 1.0).map((tick) => {
        const o = opennessOf(TUNABLES, row, 1.0, tick);
        const permits = THRESHOLDS.filter(([, read]) => o >= read(TUNABLES)).map(([n]) => n[0]);
        return `${String(o)}${permits.length === 0 ? "" : `[${permits.join("")}]`}`;
      });
      return `${row.label} ${cells.join(" ")}`;
    };
    expect(rows.map(line)).toEqual([
      "SEPARATION_5_PLUS 70[tcd] 80[tcd] 90[tcd] 90[tcd] 90[tcd]",
      "SEPARATION_3_4 52[tcd] 62[tcd] 72[tcd] 72[tcd] 72[tcd]",
      "SEPARATION_1_2 38[cd] 48[cd] 58[tcd] 58[tcd] 58[tcd]",
      "SEPARATION_HALF_YARD 30[cd] 35[cd] 40[cd] 40[cd] 40[cd]",
      "EVEN_BRACKET 25[d] 30[cd] 35[cd] 35[cd] 35[cd]",
      "CB_IN_PHASE 22 27[d] 32[cd] 32[cd] 32[cd]",
      "CB_ON_HIP 15 15 15 10 5",
      "CB_IN_POSITION 6 6 6 1 0",
    ]);
  });

  /**
   * THE SAME MATRIX ON THE PRE-ADR-048 TREE, kept as the BEFORE. The two lists
   * side by side are the finding: under the flat gain the bottom two rows —
   * outcomes in which the corner WON the rep — climb into the checkdown pool and
   * one of them into the in-rhythm throw, purely by the quarterback holding.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? Nothing about the committed tree: this arm is
   *   computed against a locally-built flat tree, so it reddens only if §8.7's
   *   unit, the base column or a threshold moves. It is a HISTORICAL RECORD and
   *   is labelled as one — cf. ADR-045's phase-1 matrix, which was only evidence
   *   because it predated the values.
   */
  it("records the same matrix under the flat gain, as the before", () => {
    const flat = {
      ...TUNABLES,
      route: {
        ...TUNABLES.route,
        contestGain: {
          burstSteps: 0,
          byContest: {
            TRAILING: { burst: 1, steady: 1 },
            EVEN: { burst: 1, steady: 1 },
            IN_FRONT: { burst: 1, steady: 1 },
          },
        },
      },
    } as unknown as Tunables;
    const rows = manRows(flat);
    const line = (row: RepRow): string => {
      const cells = gainTicksFrom(flat, 1.0).map((tick) => {
        const o = opennessOf(flat, row, 1.0, tick);
        const permits = THRESHOLDS.filter(([, read]) => o >= read(flat)).map(([n]) => n[0]);
        return `${String(o)}${permits.length === 0 ? "" : `[${permits.join("")}]`}`;
      });
      return `${row.label} ${cells.join(" ")}`;
    };
    expect(rows.map(line)).toEqual([
      "SEPARATION_5_PLUS 70[tcd] 75[tcd] 80[tcd] 85[tcd] 90[tcd]",
      "SEPARATION_3_4 52[tcd] 57[tcd] 62[tcd] 67[tcd] 72[tcd]",
      "SEPARATION_1_2 38[cd] 43[cd] 48[cd] 53[tcd] 58[tcd]",
      "SEPARATION_HALF_YARD 30[cd] 35[cd] 40[cd] 45[cd] 50[tcd]",
      "EVEN_BRACKET 25[d] 30[cd] 35[cd] 40[cd] 45[cd]",
      "CB_IN_PHASE 22 27[d] 32[cd] 37[cd] 42[cd]",
      "CB_ON_HIP 15 20 25[d] 30[cd] 35[cd]",
      "CB_IN_POSITION 6 11 16 21 26[d]",
    ]);
  });
});
