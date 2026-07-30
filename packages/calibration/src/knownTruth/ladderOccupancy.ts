/**
 * THE LADDER OCCUPANCY SURFACE — what each of `resultTierLadder`'s nine tiers actually MEANS, per
 * check, as a probability.
 *
 * ================== THE QUESTION THIS ANSWERS, AND THE ONE IT REFUSES ==================
 *
 * ADR-049 §6c measured `RUSHER_WINS_REP` at **31.909%** of §7.1 reps and asked the owner whether a
 * 15-point d100 margin is "past his blocker and travelling". The owner declined to rule until the
 * LADDER was measured, because `passRush.bands[0].minMargin = 15` is `resultTierLadder`'s
 * `STRONG_SUCCESS` boundary and *"if a strong success fires at 36% on an even contest then the
 * problem is larger than §7.1 and touches every check in the game."*
 *
 * So: **the exact firing probability of every tier of the ladder, on an even contest, for every
 * check that reads it.** No threshold is recommended here and none is implied. The ruling is the
 * owner's.
 *
 * ================== ⛔ TIER OCCUPANCY IS NOT BAND REACH, AND CONFLATING THEM IS THE BUG ==================
 *
 * `scaleSurface.ts` computes `pEven` = P(margin ≥ boundary) — a **CUMULATIVE**, because a band table
 * asks "did the margin clear this row's floor". A LADDER TIER is an **INTERVAL**: `STRONG_SUCCESS`
 * is `[15, 29]`, not `[15, ∞)`, because `CRITICAL_SUCCESS` sits above it and takes everything from
 * 30 up. **The two numbers differ by a factor of three on the very check the owner asked about**, and
 * every sentence in the record that reads "`STRONG_SUCCESS` fires at 36%" is quoting the cumulative.
 *
 * This module reports BOTH, side by side, and never one alone:
 *
 *   `occupancy`  — P(margin lands IN this tier). The nine numbers sum to 1. This is what "how often
 *                  does this tier fire" means.
 *   `atOrAbove`  — P(margin ≥ this tier's floor). What a `minMargin` band row selects, and therefore
 *                  the only one of the two that is comparable to `pEven` or to a band census.
 *
 * ================== "EVEN CONTEST" — DEFINED, AND THE FLAT-LEAGUE TRAP NAMED ==================
 *
 * **EQUAL RATINGS on both sides, no situational flats.** Not "zero margin shift" — that would be
 * assuming the answer. The distinction is the whole finding: a check whose two stacks hold a
 * different NUMBER of terms produces a non-zero shift at equal ratings, so *evenly rated* and
 * *evenly matched* are different conditions and this module reports the gap between them
 * (`shiftAt`).
 *
 * **THE TRAP.** Every rating in `FLAT_SYNTHETIC` is 60, so a flat-60 corpus can only ever observe
 * the equal-ratings case — which makes it look as though a flat corpus settles this question. It
 * does not, and the discriminator is arithmetic rather than empirical:
 *
 *   - An OPPOSED check whose stacks are **term-symmetric** (same count, same divisors) has
 *     `shiftAt(R) = 0` for EVERY `R`. Its even-contest occupancy is a property of the LADDER and the
 *     roll form, and a flat-60 measurement of it generalises to every rated league. `pass_rush_tick`
 *     on a POWER rush is exactly this case.
 *   - An OPPOSED check that is term-ASYMMETRIC has `shiftAt(R)` growing with `R`. Its even-contest
 *     occupancy is a property of the LEAGUE LEVEL, and a flat-60 measurement is a measurement OF THE
 *     FIXTURE. `pass_rush_tick` on a SPEED or FINESSE rush is this case, in the same check kind.
 *   - Every TARGET check is level-sensitive by construction, because the target is a constant and
 *     the stack is not. `qb_decision`'s ladder position moves 20 points of margin between a
 *     0-rated league and a 99-rated one.
 *
 * `sweepLadderOccupancy` therefore evaluates every check at SIX league levels and publishes
 * `levelInvariant` per check. **A number quoted from the 60 column of a level-variant row is a
 * statement about a flat-60 league and nothing else**, and this module refuses to print one without
 * the other five columns beside it.
 *
 * ================== WHAT IS DERIVED AND WHAT IS DECLARED ==================
 *
 * DERIVED, and therefore cannot go stale:
 *   - the nine tiers and their floors, read from `DEFAULT_TUNABLES.resultTierLadder`;
 *   - every probability, computed exactly (d100 is uniform on 1..100; the difference of two d100s is
 *     triangular on [−99, 99]) — no sampling, no seeds, no corpus;
 *   - each check's term stacks, through `scaleSurface.ts`'s `SURFACE`, which is itself half derived
 *     from `TUNABLES` and half declared with the doc's formula quoted.
 *
 * DECLARED, and falsifiable by the corpus census below:
 *   - **the tier-selection rule**: "the first tier whose floor the margin clears, table descending".
 *     That restates `rolls.ts`'s `bandFor`, which is NOT on the engine's barrel (it was removed
 *     deliberately — see `engine/src/index.ts`'s "WHAT WENT"). A restatement is a second source of
 *     truth, so it is checked rather than trusted: the engine publishes BOTH `margin` and `tier` on
 *     every CHECK, and `censusLadder` compares `tierOfMargin(margin)` against the published `tier`
 *     on every single observation. A single disagreement is red.
 *   - **`PASS_RUSH_VARIANTS`** — `SURFACE`'s `pass_rush_tick` row describes the POWER branch only
 *     (it says so). The other two branches are declared here and are falsified by the census, which
 *     discovers the shifts the corpus actually produced without being told what to look for.
 *
 * ================== WHAT WOULD MAKE THIS INSTRUMENT GO RED (backlog entry 55) ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | the tier walk restates `bandFor` correctly | ONE CHECK in the corpus whose published `tier` differs from `tierOfMargin(margin)` |
 * | the ladder has nine tiers with these floors | `LADDER_FLOORS` disagreeing with `DEFAULT_TUNABLES.resultTierLadder` — it is derived, so this is a compile/throw, not a drift |
 * | occupancies are a probability distribution | any check's nine occupancies not summing to 1 within 1e-12 |
 * | the derivation predicts the engine | an observed (kind, shift) cell whose empirical tier histogram is more than 4 SE from the exact prediction |
 * | `shiftAt` is what the engine actually applies | a corpus shift bucket that no rating level in the static sweep can produce |
 * | the reader set is complete | a `CheckKind` observed carrying a tier that `SURFACE` calls UNIMPLEMENTED — already true of `punt` and `kick_return`, recorded in `LADDER_READERS_WITHOUT_SCALE` |
 *
 * For the printed occupancies themselves: **nothing.** They are arithmetic, not gates.
 */
import type { CheckKind, MatchEventEnvelope, ResultTier } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { SURFACE, stackAt, termsOf, type AttrTerm, type CheckDescriptor } from "./scaleSurface.js";

// ---------------------------------------------------------------------------
// THE LADDER, DERIVED
// ---------------------------------------------------------------------------

export interface LadderTier {
  readonly tier: ResultTier;
  /** Inclusive lower bound. `-Infinity` on the bottom rung. */
  readonly floor: number;
  /** Inclusive upper bound: one below the tier above. `+Infinity` on the top rung. */
  readonly ceiling: number;
  /** `ceiling - floor + 1`, or `Infinity` on an open rung. What a uniform margin spends here. */
  readonly width: number;
}

/**
 * The nine tiers with their intervals, derived from the tunables tree.
 *
 * ⚠ **THE TOP AND BOTTOM RUNGS ARE OPEN AND THAT IS THE HEADLINE.** Seven of the nine tiers are
 * bounded intervals whose widths are fixed by the ladder (15, 10, 4, 1, 4, 10, 15); the two extreme
 * rungs absorb everything past ±30. On a symmetric opposed roll that is 24.85% EACH — so the ladder's
 * modal outcome, on the most common roll form in the engine, is `CRITICAL_SUCCESS` or
 * `CRITICAL_FAILURE`. Nothing about that is visible from a cumulative.
 */
export function ladderTiers(tunables: Tunables = DEFAULT_TUNABLES): readonly LadderTier[] {
  const rows = tunables.resultTierLadder;
  return rows.map((row, i) => {
    const above = rows[i - 1];
    const floor = row.minMargin;
    const ceiling = above === undefined ? Number.POSITIVE_INFINITY : above.minMargin - 1;
    return {
      tier: row.label,
      floor,
      ceiling,
      width: Number.isFinite(floor) && Number.isFinite(ceiling) ? ceiling - floor + 1 : Number.POSITIVE_INFINITY,
    };
  });
}

/** Tier order, highest first — the ladder's own order. */
export function ladderOrder(tunables: Tunables = DEFAULT_TUNABLES): readonly ResultTier[] {
  return tunables.resultTierLadder.map((r) => r.label);
}

/**
 * DECLARED — a restatement of `rolls.ts`'s `bandFor`, which the engine barrel does not export.
 * Falsified against `CHECK.tier` on every observation by `censusLadder`; see the header.
 */
export function tierOfMargin(margin: number, tunables: Tunables = DEFAULT_TUNABLES): ResultTier {
  for (const row of tunables.resultTierLadder) {
    if (margin >= row.minMargin) return row.label;
  }
  const last = tunables.resultTierLadder[tunables.resultTierLadder.length - 1];
  if (last === undefined) throw new Error("ladderOccupancy: the result-tier ladder is empty");
  return last.label;
}

// ---------------------------------------------------------------------------
// EXACT OCCUPANCY
// ---------------------------------------------------------------------------

/** Per-tier probability, keyed by tier, in ladder order. Sums to exactly 1. */
export type Occupancy = ReadonlyMap<ResultTier, number>;

function accumulate(
  tunables: Tunables,
  massAt: (margin: number) => number,
  lo: number,
  hi: number,
): Occupancy {
  const out = new Map<ResultTier, number>();
  for (const tier of ladderOrder(tunables)) out.set(tier, 0);
  for (let m = lo; m <= hi; m++) {
    const tier = tierOfMargin(m, tunables);
    out.set(tier, (out.get(tier) ?? 0) + massAt(m));
  }
  return out;
}

/**
 * TARGET form. `margin = d100 + shift`, d100 uniform on 1..100, so the margin is uniform on a
 * 100-wide window and every BOUNDED tier's occupancy is simply its width in percent — clipped where
 * the window's edge cuts it. The two OPEN rungs take whatever the window leaves.
 */
export function uniformOccupancy(shift: number, tunables: Tunables = DEFAULT_TUNABLES): Occupancy {
  return accumulate(tunables, () => 0.01, 1 + shift, 100 + shift);
}

/**
 * OPPOSED form. `margin = d100_a − d100_b + shift`; the difference of two independent d100s is
 * triangular with mass `(100 − |d|)/10000` on [−99, 99].
 *
 * Summed rather than closed-form for the same reason `scaleSurface.pOpposed` sums: the closed form
 * is off by one at the apex and this runs a few hundred times, not a few million.
 */
export function triangularOccupancy(shift: number, tunables: Tunables = DEFAULT_TUNABLES): Occupancy {
  return accumulate(tunables, (m) => (100 - Math.abs(m - shift)) / 10000, shift - 99, shift + 99);
}

/** Cumulative from the top: P(margin ≥ tier floor). What a `minMargin` band row selects. */
export function atOrAbove(occ: Occupancy, tunables: Tunables = DEFAULT_TUNABLES): Occupancy {
  const out = new Map<ResultTier, number>();
  let running = 0;
  for (const tier of ladderOrder(tunables)) {
    running += occ.get(tier) ?? 0;
    out.set(tier, running);
  }
  return out;
}

// ---------------------------------------------------------------------------
// PER-CHECK STRUCTURE — the shift an EVENLY RATED contest produces
// ---------------------------------------------------------------------------

export type LadderForm = "OPPOSED" | "TARGET";

/**
 * A description of ONE roll structure that reads the ladder. Most check kinds have exactly one;
 * `pass_rush_tick` has three, because §7.1's rusher stack depends on the move the card called.
 */
export interface LadderStructure {
  readonly kind: CheckKind;
  /** `""` for the single-structure case, otherwise the branch name. */
  readonly variant: string;
  readonly form: LadderForm;
  readonly docRef: string;
  readonly actor: readonly AttrTerm[];
  /** OPPOSED: the opposing stack. TARGET: terms the TARGET carries (§9.4's `50 + ZoneCoverage÷5`). */
  readonly opposing: readonly AttrTerm[];
  /** TARGET only. */
  readonly target: number;
  readonly note: string;
}

/**
 * §7.1's OTHER TWO BRANCHES, DECLARED.
 *
 * `SURFACE.pass_rush_tick` says in its own note that it shows the POWER rush — *"the WORST case for
 * the doc"* — which is the three-term branch. The card also calls SPEED and FINESSE, and those carry
 * **two** rusher terms against the blocker's **three**, so they are not the same contest and they do
 * not sit at the same place on the ladder. `resolve/passRush.ts` lines 37-48, and the §7.1 quote is
 * `SURFACE`'s own.
 *
 * ⚠ Declared, therefore falsifiable and falsified: `censusLadder` discovers the shift buckets the
 * corpus produced without being told what they should be, and `PASS_RUSH_VARIANTS`' predictions are
 * compared against them.
 */
const PASS_RUSH_VARIANTS: readonly { readonly variant: string; readonly rusher: readonly AttrTerm[] }[] = [
  { variant: "POWER", rusher: [{ attr: "passRush", divisor: 5 }, { attr: "powerMove", divisor: 5 }, { attr: "strength", divisor: 5 }] },
  { variant: "SPEED", rusher: [{ attr: "passRush", divisor: 5 }, { attr: "firstStep", divisor: 5 }] },
  { variant: "FINESSE", rusher: [{ attr: "passRush", divisor: 5 }, { attr: "finesseMove", divisor: 5 }] },
];

/** Every structure that reads the ladder and that `SURFACE` can describe on the attribute scale. */
export function ladderStructures(tunables: Tunables = DEFAULT_TUNABLES): readonly LadderStructure[] {
  const out: LadderStructure[] = [];
  for (const [kind, d] of Object.entries(SURFACE) as [CheckKind, CheckDescriptor][]) {
    if (d.form === "UNIMPLEMENTED") continue;
    const actor = termsOf(d.actor, tunables);
    if (d.form === "OPPOSED") {
      const opposing = termsOf(d.opponent, tunables);
      if (kind === "pass_rush_tick") {
        for (const v of PASS_RUSH_VARIANTS) {
          out.push({
            kind,
            variant: v.variant,
            form: "OPPOSED",
            docRef: d.docRef,
            actor: v.rusher,
            opposing,
            target: 0,
            note: `§7.1 ${v.variant} branch — ${String(v.rusher.length)} rusher terms vs ${String(opposing.length)} blocker terms.`,
          });
        }
        continue;
      }
      out.push({ kind, variant: "", form: "OPPOSED", docRef: d.docRef, actor, opposing, target: 0, note: d.note });
      continue;
    }
    out.push({
      kind,
      variant: "",
      form: "TARGET",
      docRef: d.docRef,
      actor,
      opposing: d.targetTerms === undefined ? [] : termsOf(d.targetTerms, tunables),
      target: d.target,
      note: d.note,
    });
  }
  return out;
}

/**
 * The margin shift an EVENLY RATED contest produces at league level `rating`, flats excluded.
 *
 * OPPOSED: `actorStack(R) − opposingStack(R)`. Zero for a term-symmetric check at every `R`.
 * TARGET:  `actorStack(R) − target − targetStack(R)`. Never level-invariant unless the actor has no
 *          terms at all (`deflection_quality`).
 */
export function shiftAt(s: LadderStructure, rating: number): number {
  return s.form === "OPPOSED"
    ? stackAt(s.actor, rating) - stackAt(s.opposing, rating)
    : stackAt(s.actor, rating) - s.target - stackAt(s.opposing, rating);
}

export function occupancyOf(s: LadderStructure, rating: number, tunables: Tunables = DEFAULT_TUNABLES): Occupancy {
  const shift = shiftAt(s, rating);
  return s.form === "OPPOSED" ? triangularOccupancy(shift, tunables) : uniformOccupancy(shift, tunables);
}

// ---------------------------------------------------------------------------
// THE SWEEP
// ---------------------------------------------------------------------------

/**
 * The league levels the sweep evaluates. 60 is the corpus's own; the other five exist so that a
 * number read off the 60 column can be recognised as fixture-dependent when it moves.
 */
export const LEVELS: readonly number[] = [0, 20, 40, 60, 80, 99];

/** The flat league's rating. Named here so the "even contest" column is not a magic 60. */
export const FLAT_LEVEL = 60;

export interface LadderRow {
  readonly kind: CheckKind;
  readonly variant: string;
  readonly form: LadderForm;
  readonly docRef: string;
  readonly actorTerms: number;
  readonly opposingTerms: number;
  /** Margin shift at each of `LEVELS`. */
  readonly shifts: readonly number[];
  /** Occupancy at `FLAT_LEVEL` — the even-contest answer, in ladder order. */
  readonly occupancy: Occupancy;
  /** P(margin ≥ tier floor) at `FLAT_LEVEL`. */
  readonly cumulative: Occupancy;
  /** Occupancy of each tier at every level in `LEVELS`, tier-major. */
  readonly byLevel: ReadonlyMap<ResultTier, readonly number[]>;
  /** True when the shift is the same at every level in `LEVELS`. */
  readonly levelInvariant: boolean;
  /**
   * The largest swing any single tier's occupancy takes across `LEVELS`. The size of the
   * flat-league trap for this check, in probability.
   */
  readonly levelSpread: number;
  readonly note: string;
}

export function sweepLadderOccupancy(tunables: Tunables = DEFAULT_TUNABLES): readonly LadderRow[] {
  const order = ladderOrder(tunables);
  return ladderStructures(tunables).map((s) => {
    const shifts = LEVELS.map((r) => shiftAt(s, r));
    const perLevel = LEVELS.map((r) => occupancyOf(s, r, tunables));
    const byLevel = new Map<ResultTier, readonly number[]>();
    let spread = 0;
    for (const tier of order) {
      const series = perLevel.map((o) => o.get(tier) ?? 0);
      byLevel.set(tier, series);
      spread = Math.max(spread, Math.max(...series) - Math.min(...series));
    }
    const flatIndex = LEVELS.indexOf(FLAT_LEVEL);
    const occupancy = perLevel[flatIndex] ?? occupancyOf(s, FLAT_LEVEL, tunables);
    return {
      kind: s.kind,
      variant: s.variant,
      form: s.form,
      docRef: s.docRef,
      actorTerms: s.actor.length,
      opposingTerms: s.opposing.length,
      shifts,
      occupancy,
      cumulative: atOrAbove(occupancy, tunables),
      byLevel,
      levelInvariant: shifts.every((v) => v === shifts[0]),
      levelSpread: spread,
      note: s.note,
    };
  });
}

/**
 * The two CANONICAL rows: what a tier means on a perfectly even roll of each form.
 *
 * These are the numbers the ladder's tier NAMES have to be read against, because they are the only
 * occupancies that belong to the ladder alone rather than to a check's stack arithmetic. An OPPOSED
 * check whose stacks are term-symmetric sits exactly here at every league level; a TARGET check
 * whose stack happens to equal its target sits exactly on the uniform row.
 */
export function canonicalOccupancies(tunables: Tunables = DEFAULT_TUNABLES): {
  readonly opposedEven: Occupancy;
  readonly targetOnTheNumber: Occupancy;
} {
  return { opposedEven: triangularOccupancy(0, tunables), targetOnTheNumber: uniformOccupancy(0, tunables) };
}

// ---------------------------------------------------------------------------
// LADDER READERS THE SCALE SURFACE DOES NOT DESCRIBE
// ---------------------------------------------------------------------------

/**
 * ⚠ **`SURFACE`'s `UNIMPLEMENTED` DOES NOT MEAN "NO PRODUCER", AND FOR TWO KINDS IT IS THE OPPOSITE.**
 *
 * `scaleSurface.test.ts` pins fifteen `CheckKind`s as unimplemented, and thirteen of them genuinely
 * have no producer (ADR-039). Two do: `game/specialTeams.ts` emits `punt` and `kick_return` CHECKs
 * through `distanceCheck`, each of which calls `tierFor` — so **they read the ladder and are absent
 * from every scale table in this package.** `SURFACE`'s note is accurate about the reason ("yardage
 * model, not a target check": the `target` is a neutral die and the `margin` is a distance
 * deviation), but the consequence is that a tier census will find kinds the scale sweep cannot
 * predict, and a reader must not take that for a census bug.
 *
 * `censusLadder` reports them separately rather than silently dropping them.
 */
export const LADDER_READERS_WITHOUT_SCALE: readonly CheckKind[] = ["punt", "kick_return"];

/**
 * ⚠ **THREE EMISSIONS CARRY A TIER THAT IS NOT A LADDER POSITION AT ALL, AND THE ENGINE SAYS SO.**
 *
 * `game/specialTeams.ts`'s header, verbatim: *"`tier` on those three emissions (punt gross, kickoff
 * return, punt return) is NOT meaningful and should be read as noise. `ResultTier` is the nine-rung
 * ladder of d100 margins (±30/±15/±5/±1); a d20 deviation plus an attribute modifier cannot reach
 * the outer rungs and cannot go negative."* It is carried because `CHECK.payload.tier` is REQUIRED
 * by the contract, and omitting it would be a contract change rather than an engine choice.
 *
 * The census reproduces that declaration as a MEASUREMENT — it keeps the die in its cell key, so a
 * d20 emission is never pooled with a d100 one, and the observed histograms show the three lower
 * halves of the ladder at exactly zero. **The engine's "read as noise" is right, and this is the
 * first time it has been quantified.**
 *
 * Two consequences a reader has to carry:
 *
 *  - the derivation gate is scoped to **d100** emissions. A uniform/triangular model of a d20
 *    deviation would be wrong arithmetic, not a wrong engine, and a gate that failed on it would be
 *    reporting its own mis-specification;
 *  - `kick_return` reads the ladder TWICE with two different roll forms — a real d100 depth check
 *    against `touchbackTarget`, and the d20 distance check. One `CheckKind`, two structures, the
 *    same species of ambiguity `tackle` has with its two band tables (`bandTables.ts`'s
 *    `tablesWithNoEmitter` note).
 */
export const DECLARED_NON_LADDER_EMISSIONS = {
  die: "d20",
  kinds: ["punt", "kick_return"] as readonly CheckKind[],
  source: "packages/engine/src/game/specialTeams.ts, file header (ADR-014 item 12, ADR-004)",
} as const;

// ---------------------------------------------------------------------------
// THE EMPIRICAL CENSUS — falsification, not measurement
// ---------------------------------------------------------------------------

/**
 * ONE observed resolution, reduced to the three things that decide its tier.
 *
 * `shift` is derived from the stream WITHOUT reading `target`, which is optional on the payload:
 *
 *   OPPOSED  margin = (rawA + modsA) − (rawB + modsB) = (rawA − rawB) + shift
 *   TARGET   margin = (raw + mods) − target           = raw + shift
 *
 * so `shift = margin − raw + (opposedRaw ?? 0)` in both forms. That is an identity, not an
 * assumption, and it means the census discovers each check's structural offset rather than being
 * told it.
 */
export interface LadderCell {
  readonly kind: CheckKind;
  readonly form: LadderForm;
  readonly die: string;
  readonly shift: number;
  /** tier → count. */
  readonly counts: ReadonlyMap<ResultTier, number>;
  readonly n: number;
}

export interface LadderCensus {
  readonly cells: readonly LadderCell[];
  readonly observations: number;
  /**
   * Observations whose published `tier` disagrees with `tierOfMargin(margin)`. **RED at 1.** This is
   * the falsification of the restated `bandFor` walk.
   */
  readonly tierWalkMismatches: number;
  /** Kinds observed carrying a tier that `SURFACE` calls UNIMPLEMENTED. */
  readonly kindsWithoutScale: readonly CheckKind[];
  /** Kinds `SURFACE` describes that this corpus never produced. */
  readonly kindsNotObserved: readonly CheckKind[];
}

interface MutableCell {
  kind: CheckKind;
  form: LadderForm;
  die: string;
  shift: number;
  counts: Map<ResultTier, number>;
  n: number;
}

/**
 * Fold a stream into `(kind, form, die, shift)` → tier histogram.
 *
 * Both event types that carry a tier are folded — `CHECK` and `PRESNAP_READ` — per ADR-004's roll
 * accounting. `PRESNAP_READ` carries no `margin`, so its shift is computed from `total − raw −
 * target`, which the payload does supply and which is the same identity.
 */
export function foldLadder(events: readonly MatchEventEnvelope[], into?: Map<string, MutableCell>): Map<string, MutableCell> {
  const cells = into ?? new Map<string, MutableCell>();
  for (const envelope of events) {
    const event = envelope.event;
    let kind: CheckKind;
    let form: LadderForm;
    let die: string;
    let shift: number;
    let tier: ResultTier;
    if (event.type === "CHECK") {
      const p = event.payload;
      kind = p.checkKind;
      form = p.opposedRoll === undefined ? "TARGET" : "OPPOSED";
      die = p.opposedRoll === undefined ? p.roll.die : `${p.roll.die}/${p.opposedRoll.die}`;
      shift = p.margin - p.roll.raw + (p.opposedRoll?.raw ?? 0);
      tier = p.tier;
    } else if (event.type === "PRESNAP_READ") {
      const p = event.payload;
      kind = p.kind;
      form = "TARGET";
      die = p.roll.die;
      shift = p.roll.total - p.roll.raw - p.target;
      tier = p.tier;
    } else {
      continue;
    }
    const key = `${kind} ${form} ${die} ${String(shift)}`;
    let cell = cells.get(key);
    if (cell === undefined) {
      cell = { kind, form, die, shift, counts: new Map<ResultTier, number>(), n: 0 };
      cells.set(key, cell);
    }
    cell.counts.set(tier, (cell.counts.get(tier) ?? 0) + 1);
    cell.n += 1;
  }
  return cells;
}

/** Count the observations whose published tier disagrees with the restated walk. */
export function countTierWalkMismatches(
  events: readonly MatchEventEnvelope[],
  tunables: Tunables = DEFAULT_TUNABLES,
): number {
  let bad = 0;
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "CHECK") {
      if (tierOfMargin(event.payload.margin, tunables) !== event.payload.tier) bad += 1;
    } else if (event.type === "PRESNAP_READ") {
      const p = event.payload;
      if (tierOfMargin(p.roll.total - p.target, tunables) !== p.tier) bad += 1;
    }
  }
  return bad;
}

export function finishCensus(
  cells: Map<string, MutableCell>,
  mismatches: number,
  tunables: Tunables = DEFAULT_TUNABLES,
): LadderCensus {
  const described = new Set<CheckKind>(ladderStructures(tunables).map((s) => s.kind));
  const observed = new Set<CheckKind>();
  let n = 0;
  const out: LadderCell[] = [];
  for (const cell of cells.values()) {
    observed.add(cell.kind);
    n += cell.n;
    out.push({ kind: cell.kind, form: cell.form, die: cell.die, shift: cell.shift, counts: cell.counts, n: cell.n });
  }
  out.sort((a, b) => a.kind.localeCompare(b.kind) || a.shift - b.shift);
  return {
    cells: out,
    observations: n,
    tierWalkMismatches: mismatches,
    kindsWithoutScale: [...observed].filter((k) => !described.has(k)).sort(),
    kindsNotObserved: [...described].filter((k) => !observed.has(k)).sort(),
  };
}

/**
 * How far the observed histogram sits from the exact prediction, in standard errors, on the tier
 * that diverges most. Under the null (the derivation is right) this is a max over nine
 * approximately-standard-normal statistics, so ~4 is the natural red line and is what the gate uses.
 */
/**
 * Whether the uniform/triangular model applies at all. **A d20 emission is not a mis-predicted d100
 * — it is a different die**, and pretending otherwise would make the gate report its own
 * mis-specification as an engine defect. See `DECLARED_NON_LADDER_EMISSIONS`.
 */
export function isD100(cell: LadderCell): boolean {
  return cell.die === "d100" || cell.die === "d100/d100";
}

export function worstZ(cell: LadderCell, tunables: Tunables = DEFAULT_TUNABLES): { readonly tier: ResultTier; readonly z: number } {
  const predicted = cell.form === "OPPOSED" ? triangularOccupancy(cell.shift, tunables) : uniformOccupancy(cell.shift, tunables);
  let worst: ResultTier = ladderOrder(tunables)[0] ?? "TIE";
  let best = 0;
  for (const tier of ladderOrder(tunables)) {
    const p = predicted.get(tier) ?? 0;
    if (p <= 0 || p >= 1) continue;
    const observed = (cell.counts.get(tier) ?? 0) / cell.n;
    const se = Math.sqrt((p * (1 - p)) / cell.n);
    const z = Math.abs(observed - p) / se;
    if (z > best) {
      best = z;
      worst = tier;
    }
  }
  return { tier: worst, z: best };
}

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------

function pct(p: number): string {
  return (p * 100).toFixed(3).padStart(7);
}

/** The canonical two rows plus a per-check occupancy table at the flat league's level. */
export function renderLadderOccupancy(
  rows: readonly LadderRow[],
  tunables: Tunables = DEFAULT_TUNABLES,
): string {
  const order = ladderOrder(tunables);
  const tiers = ladderTiers(tunables);
  const lines: string[] = [];

  lines.push("THE LADDER, AS INTERVALS (derived from DEFAULT_TUNABLES.resultTierLadder)");
  lines.push("  tier                 interval          width");
  for (const t of tiers) {
    const lo = Number.isFinite(t.floor) ? String(t.floor) : "-inf";
    const hi = Number.isFinite(t.ceiling) ? String(t.ceiling) : "+inf";
    lines.push(`  ${t.tier.padEnd(20)} [${lo}, ${hi}]`.padEnd(45) + (Number.isFinite(t.width) ? String(t.width) : "open"));
  }
  lines.push("");

  const canon = canonicalOccupancies(tunables);
  lines.push("CANONICAL — what a tier means on a PERFECTLY EVEN roll of each form (% occupancy)");
  lines.push(`  ${"form".padEnd(22)}${order.map((t) => t.slice(0, 7).padStart(8)).join("")}`);
  lines.push(`  ${"OPPOSED, shift 0".padEnd(22)}${order.map((t) => (100 * (canon.opposedEven.get(t) ?? 0)).toFixed(2).padStart(8)).join("")}`);
  lines.push(`  ${"TARGET, shift 0".padEnd(22)}${order.map((t) => (100 * (canon.targetOnTheNumber.get(t) ?? 0)).toFixed(2).padStart(8)).join("")}`);
  lines.push("");

  lines.push(`PER CHECK, AT THE FLAT LEAGUE'S LEVEL (rating ${String(FLAT_LEVEL)} both sides, no flats)`);
  lines.push(
    `  ${"check".padEnd(24)}${"form".padEnd(8)}${"trm".padEnd(6)}${"shift".padStart(6)}  ${order
      .map((t) => t.slice(0, 7).padStart(8))
      .join("")}  lvlInv  spread`,
  );
  const ranked = [...rows].sort((a, b) => b.levelSpread - a.levelSpread);
  for (const r of ranked) {
    const name = r.variant === "" ? r.kind : `${r.kind}:${r.variant}`;
    lines.push(
      `  ${name.padEnd(24)}${r.form.padEnd(8)}${`${String(r.actorTerms)}v${String(r.opposingTerms)}`.padEnd(6)}` +
        `${String(r.shifts[LEVELS.indexOf(FLAT_LEVEL)] ?? 0).padStart(6)}  ` +
        order.map((t) => (100 * (r.occupancy.get(t) ?? 0)).toFixed(2).padStart(8)).join("") +
        `  ${(r.levelInvariant ? "yes" : "NO").padEnd(6)}  ${(100 * r.levelSpread).toFixed(1).padStart(5)}pp`,
    );
  }
  return lines.join("\n");
}

/** The occupancy of one tier, per check, at every league level — the flat-league-trap table. */
export function renderTierAcrossLevels(
  rows: readonly LadderRow[],
  tier: ResultTier,
  cumulative = false,
  tunables: Tunables = DEFAULT_TUNABLES,
): string {
  const lines: string[] = [];
  lines.push(
    `${cumulative ? "AT OR ABOVE" : "OCCUPANCY OF"} ${tier} BY LEAGUE LEVEL (equal ratings both sides, %)`,
  );
  lines.push(`  ${"check".padEnd(24)}${LEVELS.map((l) => `R=${String(l)}`.padStart(9)).join("")}`);
  for (const r of [...rows].sort((a, b) => a.kind.localeCompare(b.kind))) {
    const name = r.variant === "" ? r.kind : `${r.kind}:${r.variant}`;
    const values = LEVELS.map((_, i) => {
      const occ = r.byLevel;
      if (!cumulative) return occ.get(tier)?.[i] ?? 0;
      let running = 0;
      for (const t of ladderOrder(tunables)) {
        running += occ.get(t)?.[i] ?? 0;
        if (t === tier) break;
      }
      return running;
    });
    lines.push(`  ${name.padEnd(24)}${values.map((v) => pct(v) + "  ").join("")}`);
  }
  return lines.join("\n");
}

/** The census, as a table, with the derivation's prediction beside every observed cell. */
export function renderCensus(census: LadderCensus, minN = 200, tunables: Tunables = DEFAULT_TUNABLES): string {
  const order = ladderOrder(tunables);
  const lines: string[] = [];
  lines.push(
    `LADDER CENSUS — ${String(census.observations)} tiered resolutions, ` +
      `${String(census.cells.length)} (kind, form, shift) cells, ` +
      `${String(census.tierWalkMismatches)} tier-walk mismatches`,
  );
  lines.push(
    `  ${"check".padEnd(22)}${"die".padEnd(10)}${"shift".padStart(6)}${"n".padStart(9)}  ` +
      `${order.map((t) => t.slice(0, 7).padStart(8)).join("")}   worstZ`,
  );
  for (const cell of census.cells) {
    if (cell.n < minN) continue;
    const modelled = isD100(cell);
    const z = modelled ? worstZ(cell, tunables) : null;
    lines.push(
      `  ${cell.kind.padEnd(22)}${cell.die.padEnd(10)}${String(cell.shift).padStart(6)}${String(cell.n).padStart(9)}  ` +
        order.map((t) => (100 * ((cell.counts.get(t) ?? 0) / cell.n)).toFixed(2).padStart(8)).join("") +
        `   ${z === null ? "  n/a — d20 DISTANCE CHECK, tier declared meaningless" : `${z.z.toFixed(2).padStart(6)} ${z.tier.slice(0, 8)}`}`,
    );
    if (!modelled) continue;
    const predicted = cell.form === "OPPOSED" ? triangularOccupancy(cell.shift, tunables) : uniformOccupancy(cell.shift, tunables);
    lines.push(
      `  ${"  (exact)".padEnd(22)}${"".padEnd(10)}${"".padStart(6)}${"".padStart(9)}  ` +
        order.map((t) => (100 * (predicted.get(t) ?? 0)).toFixed(2).padStart(8)).join(""),
    );
  }
  if (census.kindsWithoutScale.length > 0) {
    lines.push(`  ladder readers with no scale descriptor: ${census.kindsWithoutScale.join(", ")}`);
  }
  if (census.kindsNotObserved.length > 0) {
    lines.push(`  described but not produced by this corpus: ${census.kindsNotObserved.join(", ")}`);
  }
  return lines.join("\n");
}
