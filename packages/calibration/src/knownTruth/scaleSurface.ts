/**
 * THE SCALE SURFACE — every `CheckKind`, its modifier stack over the 0-99 attribute scale, and
 * whether the die can still decide the outcome.
 *
 * `CALIBRATION-BACKLOG.md`'s Phase 3 opening deliverable specifies the method verbatim:
 *
 *   > enumerate every `CheckKind`, compute best-case and worst-case totals from `TUNABLES` plus the
 *   > attribute scale, compare against the target (or against the opposing stack for opposed rolls),
 *   > and flag any check where the die cannot meaningfully decide the outcome — in either direction.
 *   > Report as a table, ranked by how little the dice matter.
 *
 * and states why a sweep is the wrong instrument for it: *"These are AUTHORING errors, not
 * implementation surprises, and they are mechanically detectable without simulating anything."*
 *
 * ================== WHAT IS ELIMINATED HERE, AND IT IS THE COVERAGE ==================
 *
 * `SURFACE` is a `Record<CheckKind, CheckDescriptor>`. `CheckKind` is a closed union in
 * `@ff/contracts`, so **a check kind added to the vocabulary fails to COMPILE here** until somebody
 * either describes its scale or declares it unimplemented with a doc reference. That is Charter
 * §4.1's declared-coverage rule at its strongest form: not "I enumerated everything I found" but "I
 * enumerated everything there is, and the compiler agrees."
 *
 * It is also why every unimplemented check is present rather than omitted. §5.1's coverage read,
 * §5.4's audible, §8.6's unseen defender, §9.5's option route and §10.3's D-line tip all have a
 * `CheckKind` and no producer. Omitting them would make this file's silence about them
 * indistinguishable from their being fine.
 *
 * ================== WHAT IS ONLY BOUNDED ==================
 *
 * A stack is DERIVED wherever the engine holds its terms as data (`{ attr, divisor }` lists in
 * `TUNABLES`) — those cannot go stale. Where the term list lives in resolver CODE the descriptor
 * DECLARES it, with the doc's own formula quoted beside it, and a declaration can drift: a term
 * added to `resolve/manCoverage.ts` tomorrow would not redden anything here. That is stated rather
 * than papered over, and the mitigation is named in `scaleSurface.test.ts` — the engine publishes
 * `CHECK.testsAttrs`, so a corpus can falsify a declared term count, which is the same instrument
 * `knownTruth/attributeUsage.ts` already uses for a different question.
 *
 * ================== THE STATISTIC, AND WHY IT IS NOT "MODIFIER RANGE" ==================
 *
 * A modifier range compared to a target is not a claim about whether the dice matter — it is a claim
 * about arithmetic. What matters is the PROBABILITY the check can produce, and how much of that
 * probability the ATTRIBUTE SCALE can move as against how much the SITUATION can. Probabilities are
 * computed exactly rather than sampled (d100 is uniform on 1..100; the difference of two d100s is
 * triangular on [-99, 99]).
 *
 * Two spans, and separating them is the whole value:
 *
 *   `ratingSpan` — p(actor 99 vs opponent 0) − p(actor 0 vs opponent 99), NO flats. What ratings own.
 *   `totalSpan`  — the same with the check's situational modifiers at their extremes. What the whole
 *                  check can reach.
 *
 * `deflection_quality` is why they are separate: §12.2's roll has NO attribute term at all, so its
 * rating span is exactly 0.000 while its total span is 0.300 — a single number would have hidden the
 * fact that no player's rating touches that check.
 *
 * `levelInvariant` is reported and never flagged. A symmetric opposed contest is invariant to the
 * LEVEL of the league and sensitive only to the GAP, which is correct football and is also the
 * constraint on what a flat-60 corpus can measure: **on a flat league, a symmetric check measures
 * its band boundary and nothing else.**
 *
 * The flags:
 *
 *   `DIE_CANNOT_LOSE`  — at EVEN ratings with the check's best flat, p ≥ 0.99.
 *   `DIE_CANNOT_WIN`   — at EVEN ratings with the worst flat, p ≤ 0.01.
 *   `RATING_INERT`     — `ratingSpan` under 5 points.
 *   `BOUNDARY_ON_FAT`  — an OPPOSED band the doc frames as DECISIVE (boundary ≥ 10) that an evenly
 *                        matched pair clears more than a third of the time. Backlog entry 13's
 *                        defect stated as a class: *"a doc band boundary set without reference to
 *                        the distribution the roll actually produces."*
 *
 * The flags are computed at EVEN ratings deliberately. Computed at rating 99 they would fire on
 * every check in the game and would be saying only that elite players are good.
 *
 * None of these is a verdict. `DIE_CANNOT_LOSE` on §12.4's recovery roll is backlog entry 6, already
 * measured at 1,474 attempts and zero failures; `BOUNDARY_ON_FAT` on `break_tackle` reproduces
 * entry 13's measured 36.70% to the third decimal without simulating anything. **A static
 * instrument agreeing with two independently measured numbers is the check on the check.**
 */
import type { CheckKind } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";

// ---------------------------------------------------------------------------
// EXACT PROBABILITY
// ---------------------------------------------------------------------------

/** P(d100 + modifier ≥ target), d100 uniform on 1..100. */
export function pTargetCheck(modifier: number, target: number): number {
  const need = Math.ceil(target - modifier);
  if (need <= 1) return 1;
  if (need > 100) return 0;
  return (100 - need + 1) / 100;
}

/**
 * P(d100_a − d100_b + delta ≥ boundary), both uniform on 1..100.
 *
 * Summed rather than closed-form because the closed form is off by one at the apex and this runs
 * 44 times, not 44 million. The triangular mass is `(100 − |d|)/10000`.
 */
export function pOpposed(delta: number, boundary: number): number {
  const need = boundary - delta;
  let mass = 0;
  for (let d = -99; d <= 99; d++) {
    if (d >= need) mass += (100 - Math.abs(d)) / 10000;
  }
  return mass;
}

// ---------------------------------------------------------------------------
// TERMS
// ---------------------------------------------------------------------------

export interface AttrTerm {
  readonly attr: string;
  readonly divisor: number;
}

/**
 * A term source. `derived` reads the live `TUNABLES` array — it cannot go stale. `declared` is a
 * hand-written claim about resolver code, and carries the doc's formula so it can be falsified by
 * reading one line of the design document.
 */
export type TermSource =
  | { readonly derived: string }
  | { readonly declared: readonly AttrTerm[]; readonly docQuote: string }
  /** A stack the engine holds partly as data and partly in code — §12.4's five terms plus `hands`. */
  | { readonly sum: readonly TermSource[] };

function readPath(tunables: Tunables, path: string): unknown {
  let node: unknown = tunables;
  for (const key of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

export function termsOf(source: TermSource, tunables: Tunables = DEFAULT_TUNABLES): readonly AttrTerm[] {
  if ("sum" in source) return source.sum.flatMap((s) => termsOf(s, tunables));
  if ("declared" in source) return source.declared;
  const node = readPath(tunables, source.derived);
  if (!Array.isArray(node)) {
    throw new TypeError(
      `scaleSurface: "${source.derived}" is not a term array in TUNABLES — the derivation is stale, ` +
        `which is exactly the failure the derived form exists to make loud (Charter §4.1).`,
    );
  }
  return node.map((t) => {
    const term = t as { attr?: unknown; divisor?: unknown };
    if (typeof term.attr !== "string" || typeof term.divisor !== "number") {
      throw new TypeError(`scaleSurface: "${source.derived}" holds a non-term member`);
    }
    return { attr: term.attr, divisor: term.divisor };
  });
}

/** §1.3 "Attribute Rating ÷ 5 (rounded)" — the engine rounds, so this does too. */
export function stackAt(terms: readonly AttrTerm[], rating: number): number {
  return terms.reduce((sum, t) => sum + Math.round(rating / t.divisor), 0);
}

// ---------------------------------------------------------------------------
// THE DESCRIPTORS
// ---------------------------------------------------------------------------

export type Flag = "DIE_CANNOT_LOSE" | "DIE_CANNOT_WIN" | "RATING_INERT" | "BOUNDARY_ON_FAT";

interface Common {
  readonly docRef: string;
  readonly note: string;
}

export interface UnimplementedCheck extends Common {
  readonly form: "UNIMPLEMENTED";
}

export interface TargetCheck extends Common {
  readonly form: "TARGET";
  /** Terms on the ROLL. */
  readonly actor: TermSource;
  /** Base target number. */
  readonly target: number;
  /**
   * Flat modifiers that are always or typically present, as [worst, best] for the actor. Situational
   * tables (a disguise the defence chose, a status the pocket happened to be in) are NOT folded in —
   * they are the sweep's subject, not the scale's. Where one is structural enough to change the
   * verdict it is named in `note`.
   */
  readonly flat?: readonly [number, number];
  /** Terms the TARGET itself carries (§9.4's `50 + ZoneCoverage÷5`). Raises the bar with rating. */
  readonly targetTerms?: TermSource;
}

export interface OpposedCheck extends Common {
  readonly form: "OPPOSED";
  readonly actor: TermSource;
  readonly opponent: TermSource;
  /**
   * The `minMargin` of the band whose reach is the interesting claim, and its label.
   *
   * ⛔ **REQUIRED, NOT OPTIONAL — the dormant instance of this month's ADR's own shape, found and
   * fixed here.** This was `headlineBand?:`, read at its one call site as `d.headlineBand?.minMargin
   * ?? 0`. `0` is `TIE`'s boundary and several real bands legitimately declare `minMargin: 0`
   * (`PICKED_UP`, `SEALED`, `GAP_HELD`), so "no band declared" was indistinguishable from "the
   * boundary IS zero" — the exact `status-keyed lookup with ?? 0` shape ADR-034 named and this
   * package's own ladder work is about. It was unreachable (all twelve `OPPOSED` `SURFACE` entries
   * declare a `headlineBand`), which is why it survived undetected rather than why it was safe: a
   * thirteenth `OPPOSED` entry added without one would have silently priced itself against `TIE`
   * instead of failing loudly. Made non-optional rather than given a runtime throw, because the
   * violation is fully decidable at compile time — every `OpposedCheck` literal in `SURFACE` is
   * checked against this type on every build, so a missing `headlineBand` cannot reach `pOpposed`
   * silently the way a runtime-only guard would let it through an untyped caller.
   */
  readonly headlineBand: { readonly label: string; readonly minMargin: number };
  readonly flat?: readonly [number, number];
}

export type CheckDescriptor = UnimplementedCheck | TargetCheck | OpposedCheck;

/**
 * EVERY `CheckKind`. The compiler enforces it.
 *
 * Ordered as `CheckKind` is declared in `@ff/contracts`, so a reader can diff the two by eye.
 */
export const SURFACE: Record<CheckKind, CheckDescriptor> = {
  coverage_read: {
    form: "UNIMPLEMENTED",
    docRef: "§5.1",
    note:
      "The QB coverage-shell read has a CheckKind and no producer. §5.1 specifies it fully " +
      "(d100 + Awareness÷5 + FootballIQ÷5 vs 50 + disguise + complexity) and Appendix C agrees at " +
      "50. Its absence is not declared anywhere in TUNABLES.",
  },
  blitz_recognition: {
    form: "TARGET",
    docRef: "§5.3",
    actor: { declared: [{ attr: "awareness", divisor: 5 }, { attr: "awareness", divisor: 5 }], docQuote: "d100 + (QB Awareness ÷ 5) + (Center Awareness ÷ 5)" },
    target: 50,
    note: "Two awareness terms (QB and centre). Disguise adds 0-25 to the target and is the defence's choice.",
  },
  audible: {
    form: "UNIMPLEMENTED",
    docRef: "§5.4",
    note: "No producer. §5.4 specifies the roll and §15.2 modifies it; neither exists.",
  },

  release_vs_press: {
    form: "OPPOSED",
    docRef: "§9.1",
    actor: { declared: [{ attr: "release", divisor: 5 }, { attr: "agility", divisor: 5 }], docQuote: "d100 + (WR Release ÷ 5) + (WR Agility ÷ 5)" },
    opponent: { declared: [{ attr: "press", divisor: 5 }, { attr: "strength", divisor: 5 }], docQuote: "d100 + (CB Press ÷ 5) + (CB Strength ÷ 5)" },
    headlineBand: { label: "ROUTE_DISRUPTED", minMargin: -20 },
    note: "Symmetric two-a-side. The headline band is the one whose delay cell is finding SA-03.",
  },
  route_break: {
    form: "UNIMPLEMENTED",
    docRef: "§9.2",
    note:
      "A CheckKind with no producer: route development is deterministic in the engine (a ready " +
      "time per depth class), and §9.2 states no roll. The kind exists for a mechanic the doc " +
      "does not specify.",
  },
  man_coverage: {
    form: "OPPOSED",
    docRef: "§9.3",
    actor: { declared: [{ attr: "routeRunning", divisor: 5 }, { attr: "agility", divisor: 5 }], docQuote: "d100 + (WR Route Running ÷ 5) + (WR Agility ÷ 5)" },
    opponent: { declared: [{ attr: "manCoverage", divisor: 5 }, { attr: "agility", divisor: 5 }], docQuote: "d100 + (CB Man Coverage ÷ 5) + (CB Agility ÷ 5)" },
    headlineBand: { label: "SEPARATION_3_4 (open or better)", minMargin: 20 },
    note: "Symmetric. Trait bonuses (Route Technician +10, Shutdown +10) are not folded in.",
  },
  zone_coverage: {
    form: "TARGET",
    docRef: "§9.4",
    actor: { declared: [{ attr: "routeRunning", divisor: 5 }], docQuote: "d100 + (WR Route Running ÷ 5)" },
    target: 50,
    targetTerms: { declared: [{ attr: "zoneCoverage", divisor: 5 }], docQuote: "vs. Target: 50 + (Defender Zone Coverage ÷ 5)" },
    note:
      "ONE receiver term against a target that RISES with the defender's rating — the only coverage " +
      "check in the doc that is not symmetric. At equal ratings the receiver is a flat 50 underdog " +
      "regardless of how good he is.",
  },
  zone_read_qb: {
    form: "TARGET",
    docRef: "§9.4",
    actor: { declared: [{ attr: "zoneCoverage", divisor: 5 }, { attr: "awareness", divisor: 5 }], docQuote: "d100 + (Defender Zone Coverage ÷ 5) + (Defender Awareness ÷ 5)" },
    target: 60,
    flat: [-6, 6],
    note:
      "Backlog entry 7, confirmed here from the arithmetic alone: two ÷5 terms against a target of " +
      "60 ± a derived disguise of ±6. The flat range IS the disguise (ADR-009).",
  },
  option_route: {
    form: "UNIMPLEMENTED",
    docRef: "§9.5",
    note:
      "No producer. §9.5 specifies the roll (target 50), its ±openness consequences AND a " +
      "QB/WR joint-success rule that would give §10.4 a −10 timing modifier it does not have. " +
      "Undeclared absence.",
  },

  pass_rush_tick: {
    form: "OPPOSED",
    docRef: "§7.1",
    actor: { declared: [{ attr: "passRush", divisor: 5 }, { attr: "powerMove", divisor: 5 }, { attr: "strength", divisor: 5 }], docQuote: "d100 + (DL Pass Rush ÷ 5) + Move Modifier; power rush adds Power Move AND Strength" },
    opponent: { declared: [{ attr: "passBlock", divisor: 5 }, { attr: "footwork", divisor: 5 }, { attr: "anchor", divisor: 5 }], docQuote: "d100 + (OL Pass Block ÷ 5) + (OL Footwork ÷ 5), plus `anchor` since ADR-028" },
    headlineBand: { label: "RUSHER_WINS_REP", minMargin: 15 },
    note:
      "Shown at the WORST case for the doc — a power rush, which is the three-term branch the §7.1 " +
      "KNOWN ISSUE box is about. ADR-028 added `anchor` and zeroed the constant, so the stacks are " +
      "now symmetric in count. `startsThreat` on 31.85% of reps (backlog entry 40) is this band.",
  },
  run_block: {
    form: "OPPOSED",
    docRef: "§6.3",
    actor: { derived: "runBlock.blockerTerms" },
    opponent: { derived: "runBlock.defenderTerms" },
    headlineBand: { label: "DRIVEN_BACK", minMargin: 20 },
    flat: [-10, 20],
    note: "Derived. The flat range is §6.3 step 3's own scheme modifiers (pull −10, double team +20).",
  },
  second_level_climb: {
    form: "TARGET",
    docRef: "§6.4",
    actor: { derived: "runBlock.secondLevelClimb.climberTerms" },
    target: 50,
    targetTerms: { declared: [{ attr: "playRecognition", divisor: 5 }], docQuote: "vs. Target: 50 + (LB Play Recognition ÷ 5)" },
    note: "Two terms against 50 + one. The climber is favoured by one term at equal ratings.",
  },
  stunt_communication: {
    form: "TARGET",
    docRef: "§7.3",
    actor: { declared: [{ attr: "awareness", divisor: 5 }, { attr: "awareness", divisor: 5 }], docQuote: "d100 + (Centre Awareness ÷ 5) + (Adjacent OL Awareness ÷ 5)" },
    target: 60,
    flat: [-25, 0],
    note: "The flat range is §7.3's complexity table applied to the target. Finding SA-02 disputes the 60.",
  },
  blitz_pickup: {
    form: "OPPOSED",
    docRef: "§7.4 step 3",
    actor: { declared: [{ attr: "passBlock", divisor: 5 }], docQuote: "RB/TE Pass Block vs Blitzer Pass Rush" },
    opponent: { declared: [{ attr: "passRush", divisor: 5 }], docQuote: "…vs Blitzer Pass Rush" },
    headlineBand: { label: "PICKED_UP (blocked)", minMargin: 0 },
    flat: [-10, 10],
    note: "One term a side — the thinnest opposed stack in the engine. Flat range is §5.3's recognition modifier.",
  },

  qb_read: {
    form: "UNIMPLEMENTED",
    docRef: "§8.3",
    note:
      "Published as its own event type (`QB_READ`) rather than as a CHECK, so this kind has no " +
      "producer. §8.3's roll is a d20, not a d100, and is the one check in the engine off the " +
      "standard scale — finding SA-09 is about its direction, not its size.",
  },
  anticipation: {
    form: "TARGET",
    docRef: "not in the doc",
    actor: { derived: "qb.anticipation.terms" },
    target: 55,
    flat: [-40, 40],
    note:
      "Backlog entry 24's scale defect, reproduced from arithmetic. The flat range is the sum of " +
      "the depth modifier (+10 QUICK to −20 DEEP), the reading system's modifier (+10 to −15), " +
      "CONCEPT's first-read +30, chemistry (±10) and the earliness penalty (−20 a half-tick).",
  },
  qb_decision: {
    form: "TARGET",
    docRef: "§8.5",
    actor: { declared: [{ attr: "decisionMaking", divisor: 5 }], docQuote: "d100 + (QB Decision Making ÷ 5) vs. Target: 50" },
    target: 50,
    note:
      "ONE term against a flat 50. The doc's own ladder then spans 45 points of margin (OPTIMAL +30 " +
      "to POOR −15), so the outcome is 100% dice and 20% rating by construction. Finding SA-10 is " +
      "about what the failure rows DO, not about this scale.",
  },
  unseen_defender: {
    form: "UNIMPLEMENTED",
    docRef: "§8.6",
    note:
      "No producer. Backlog entry 4a: with §8.6 absent, a passed anticipation check carries NO " +
      "interception risk. The one unimplemented check with a logged consequence.",
  },
  hold_decision: {
    form: "UNIMPLEMENTED",
    docRef: "§8.7",
    note:
      "§8.7 is a time BUDGET, not a roll — the engine implements it deterministically and emits no " +
      "CHECK. The kind exists for a die the doc does not throw.",
  },
  pocket_movement: {
    form: "TARGET",
    docRef: "§7.2 ('throw, move, or take hit')",
    actor: { derived: "pocketMovement.checkTerms" },
    target: 50,
    note: "Entirely engine structure; the doc specifies nothing about the move branch.",
  },
  scramble: {
    form: "TARGET",
    docRef: "§8.8",
    actor: { declared: [{ attr: "mobility", divisor: 5 }, { attr: "improvisation", divisor: 5 }], docQuote: "QB Improvisation + Mobility vs. Pursuit" },
    target: 50,
    flat: [-25, 0],
    note:
      "⚠ FINDING SA-05. The doc's 'vs. Pursuit' is an OPPOSED form; the engine's target is a " +
      "constant plus two situational terms and reads no defender attribute, so the defence's " +
      "rating cannot move this check at all. The flat range is the edge-threat and urgency " +
      "penalties, both situational rather than rating-driven.",
  },

  passing_lane: {
    form: "TARGET",
    docRef: "§10.3",
    actor: { declared: [{ attr: "reaction", divisor: 5 }, { attr: "ballSkills", divisor: 5 }], docQuote: "d100 + (Defender Reaction ÷ 5) + (Defender Ball Skills ÷ 5)" },
    target: 60,
    flat: [-25, 10],
    note:
      "Flat range is §10.3's velocity (+15 bullet to −10 touch) and angle (+20 over to −10 through) " +
      "columns applied to the target, signs inverted for the actor. Finding SA-13 is about their combination.",
  },
  accuracy: {
    form: "TARGET",
    docRef: "§10.4",
    actor: { declared: [{ attr: "accuracy", divisor: 5 }], docQuote: "d100 + (QB Accuracy ÷ 5) + Modifiers vs. Target: 60" },
    target: 60,
    flat: [-40, 15],
    note:
      "Backlog entry 1's subject. ONE accuracy term against a target of 60, with a flat range " +
      "dominated by the pocket (0 to −30) and depth (+10 to −10); +5 chemistry and up to +3 of " +
      "poise refund are the only ways back. Declared rather than derived: the engine holds this " +
      "stack as a divisor plus resolver code, not as a term list.",
  },
  dline_tip: {
    form: "UNIMPLEMENTED",
    docRef: "§10.3",
    note:
      "Declared in tunables ('no D-line tip-at-release check'). §10.3's formula is also the only " +
      "one in the doc adding RAW attributes with no ÷5 besides §14.4's speed difference, and it " +
      "names 'Height', which is not an attribute.",
  },

  catch: {
    form: "TARGET",
    docRef: "§11.2",
    actor: { declared: [{ attr: "catching", divisor: 5 }], docQuote: "d100 + (WR Catching ÷ 5) + Accuracy Modifier" },
    target: 50,
    flat: [-25, 30],
    note:
      "Flat range is §10.5's catch modifier (+20 to −25) plus §11.2's difficulty applied to the " +
      "target (0 to −20) plus Reliable Hands +10.",
  },
  contested_catch: {
    form: "OPPOSED",
    docRef: "§11.3",
    actor: { derived: "catching.contested.receiverTerms" },
    opponent: { derived: "catching.contested.defenderTerms" },
    headlineBand: { label: "INTERCEPTION", minMargin: -20 },
    flat: [-15, 15],
    note:
      "THREE receiver terms against TWO defender terms — a structural receiver edge of ~20 points " +
      "at equal ratings, before §11.3's own position modifier. The headline band is the engine's " +
      "only direct interception channel.",
  },
  deflection_quality: {
    form: "TARGET",
    docRef: "§12.2",
    actor: { declared: [], docQuote: "Roll: d100 vs. Modified Target Number" },
    target: 70,
    flat: [-15, 15],
    note:
      "NO attribute terms at all — the doc's roll is a bare d100. Target shown at CHEST (70); the " +
      "height table spans 30-100, which is the real variance and is not a rating.",
  },
  deflection_recovery: {
    form: "TARGET",
    docRef: "§12.4",
    actor: {
      sum: [
        { derived: "tippedBall.recovery.attrTerms" },
        { declared: [{ attr: "catching|ballSkills", divisor: 5 }], docQuote: "Catching/Ball Skills: + Rating ÷ 5" },
      ],
    },
    target: 90,
    flat: [-10, 55],
    note:
      "⚠ BACKLOG ENTRY 6, reproduced from arithmetic alone. SIX terms at ÷5 against a target of 90 " +
      "— the HARDEST row in §12.2's table — with proximity on top (+25 same zone, and the modal " +
      "recoverer is in the ball's zone). The flat range is proximity plus §12.4's situational " +
      "column. Measured over 18,000 plays: 1,474 attempts, ZERO failures.",
  },

  yac_tackle: {
    form: "OPPOSED",
    docRef: "§13.2",
    actor: { derived: "ballCarrier.contests.yac.carrierTerms" },
    opponent: { derived: "ballCarrier.contests.yac.tacklerTerms" },
    headlineBand: { label: "DEFENDER_MISSED", minMargin: 20 },
    note: "Derived, symmetric. The headline band's two yardage cells are RIDER 2's subject.",
  },
  downfield_block: {
    form: "OPPOSED",
    docRef: "§13.3 / §14.5",
    actor: { derived: "ballCarrier.blockInSpace.profiles.STALK.blockerTerms" },
    opponent: { derived: "ballCarrier.blockInSpace.profiles.STALK.defenderTerms" },
    headlineBand: { label: "SEALED (block holds)", minMargin: 0 },
    note:
      "⚠ ONE blocker term against TWO defender terms — backlog entry 10, reproduced. §13.3 gives " +
      "the defender Block Shed + Tackling and §14.5 gives him Block Shed alone; the engine took " +
      "§13.3, so a stalk block fails by ~14 points structurally at equal ratings.",
  },
  breakaway: {
    form: "OPPOSED",
    docRef: "§13.4",
    actor: { derived: "ballCarrier.breakaway.carrierTerms" },
    opponent: { derived: "ballCarrier.breakaway.pursuerTerms" },
    headlineBand: { label: "TOUCHDOWN_POTENTIAL", minMargin: 15 },
    note:
      "Derived, symmetric, and the gate in front of `freeRunReachesGoalLine` — the single largest " +
      "yardage lever in §13/§14 (backlog entry 11).",
  },

  rb_vision: {
    form: "TARGET",
    docRef: "§14.2 PHASE 3",
    actor: { derived: "runGame.vision.terms" },
    target: 50,
    note: "Derived. Two terms against a flat 50; ZONE plays only.",
  },
  gap_battle: {
    form: "OPPOSED",
    docRef: "§6.2",
    actor: { derived: "runBlock.gapIntegrity.defenderTerms" },
    opponent: { derived: "runBlock.gapIntegrity.blockerTerms" },
    headlineBand: { label: "GAP_HELD", minMargin: 0 },
    note: "One term a side, split at zero — the doc states the roll and no result table.",
  },
  pursuit_angle: {
    form: "TARGET",
    docRef: "§14.4",
    actor: { derived: "ballCarrier.pursuitAngle.defenderTerms" },
    target: 50,
    flat: [-99, 99],
    note:
      "⚠ BACKLOG ENTRY 14, reproduced. The flat range is the doc's RAW speed difference in the " +
      "target — ±99 where every other modifier in the document is ±20. On a flat league it is " +
      "IDENTICALLY ZERO, so no flat-league measurement bears on it (a Mandate-1 rating question).",
  },
  tackle: {
    form: "OPPOSED",
    docRef: "§14.3",
    actor: { derived: "ballCarrier.contests.atLosPower.carrierTerms" },
    opponent: { derived: "ballCarrier.contests.atLosPower.tacklerTerms" },
    headlineBand: { label: "FELL_FORWARD", minMargin: 1 },
    note:
      "One term a side. Note this CheckKind emits for TWO tables (`atLosPower` and `atLosEvade`), " +
      "which is why the band gate reports both as `tablesWithNoEmitter`.",
  },
  break_tackle: {
    form: "OPPOSED",
    docRef: "§14.4",
    actor: { derived: "ballCarrier.contests.secondLevel.carrierTerms" },
    opponent: { derived: "ballCarrier.contests.secondLevel.tacklerTerms" },
    headlineBand: { label: "BROKEN_TACKLE", minMargin: 15 },
    note:
      "⚠ BACKLOG ENTRY 13, reproduced from arithmetic. Symmetric stacks, so the band boundary sits " +
      "on the difference of two d100s and a 15+ margin is a ~36% event by construction.",
  },

  communication: {
    form: "UNIMPLEMENTED",
    docRef: "Appendix C / §16.3",
    note:
      "Appendix C gives 'Communication | 40-50 | +10-25 (noise)'. §16.3's crowd-noise system is " +
      "unimplemented. Finding SA-02 is the contradiction between that row and §7.3's 60.",
  },
  snap_jump: {
    form: "UNIMPLEMENTED",
    docRef: "§16.3",
    note: "No producer; the doc's false-start/miscommunication mechanic is out of slice.",
  },
  fumble: {
    form: "UNIMPLEMENTED",
    docRef: "§16.1",
    note:
      "No producer. `ballSecurity` is in §4.7's attribute table and §16.1 states fumble-chance " +
      "modifiers; there is no base fumble rate anywhere in the doc, so the mechanic has no " +
      "specification to implement. Not a declared absence in TUNABLES.",
  },
  penalty_check: {
    form: "UNIMPLEMENTED",
    docRef: "not in the doc",
    note:
      "No producer and no specification. `game.clockStopsOn*` records that penalties and " +
      "out-of-bounds are unmodelled and that this shortens games.",
  },

  coin_toss: {
    form: "UNIMPLEMENTED",
    docRef: "not in the doc",
    note: "Game loop (ADR-014). `match-engine.md` specifies a play; the loop is declared invention.",
  },
  field_goal: {
    form: "TARGET",
    docRef: "not in the doc",
    actor: { declared: [{ attr: "kickPower", divisor: 5 }, { attr: "kickAccuracy", divisor: 5 }], docQuote: "no doc formula — game loop, declared invention" },
    target: 34,
    flat: [0, 42],
    note:
      "Out of the doc-conformance scope and included so the record is complete. The flat range is " +
      "distance: 1.5 per yard beyond 30, to the 58-yard attempt ceiling.",
  },
  punt: {
    form: "UNIMPLEMENTED",
    docRef: "not in the doc",
    note: "Yardage model, not a target check. Backlog entry 19 (placeholder depth, declared).",
  },
  kick_return: {
    form: "UNIMPLEMENTED",
    docRef: "not in the doc",
    note: "Yardage model, not a target check. Backlog entry 19.",
  },
};

// ---------------------------------------------------------------------------
// THE SWEEP
// ---------------------------------------------------------------------------

export interface ScaleRow {
  readonly kind: CheckKind;
  readonly form: CheckDescriptor["form"];
  readonly docRef: string;
  /** Actor stack at rating 0 / 60 / 99. */
  readonly stack: readonly [number, number, number];
  /** Opposing stack or target-side terms, same three ratings. */
  readonly opposing: readonly [number, number, number];
  readonly target: number | null;
  /**
   * WORST CASE: actor at 0 against an opponent at 99, with the worst flat.
   * **NAMED, per §22a — the opponent is moved OPPOSITELY, not held.** Holding the opponent at 60
   * would answer a different question (how much does MY rating matter in a fixed league) and would
   * halve every span on this table.
   */
  readonly pWorst: number;
  /** Both sides at the flat league's 60, no flats. The baseline corpus's own case. */
  readonly pEven: number;
  /** BEST CASE: actor at 99 against an opponent at 0, with the best flat. */
  readonly pBest: number;
  /**
   * The span the RATING scale owns, flats excluded: p(actor 99 vs opponent 0) − p(actor 0 vs
   * opponent 99), with no situational modifier on either end.
   *
   * Flats are excluded ON PURPOSE and it changes verdicts. `deflection_quality` has NO attribute
   * term at all — §12.2's roll is a bare d100 — but carries a ±15 velocity modifier, so a span
   * computed with flats reads 0.300 and hides the fact that no player's rating touches that check.
   */
  readonly ratingSpan: number;
  /** With the flats. The difference between the two is what SITUATION owns. */
  readonly totalSpan: number;
  /** p at even ratings with the WORST flat, and with the BEST. What the flags are computed on. */
  readonly pEvenWorstFlat: number;
  readonly pEvenBestFlat: number;
  /**
   * True when moving BOTH sides together leaves the probability unchanged — the correct property of
   * a symmetric opposed contest, and the reason a flat league measures a symmetric check's BAND
   * BOUNDARY and nothing else. Reported, never flagged: it is not a defect, it is a constraint on
   * what any flat-league measurement of that check can mean.
   */
  readonly levelInvariant: boolean;
  readonly flags: readonly Flag[];
  readonly note: string;
}

const FLAT_LEAGUE = 60;
/** Below this the 0→99 attribute span is not moving the outcome. */
export const RATING_INERT_SPAN = 0.05;
/** An opposed band an even pair clears more often than this is sitting on the fat part. */
export const FAT_BOUNDARY_P = 1 / 3;
/**
 * Only boundaries the doc frames as DECISIVE are candidates. A band split at 0 or 1 is a "who won"
 * line and is supposed to be a coin flip; a band the doc reaches for to mean *beaten*, *broken*,
 * *driven back* or *wide open* is a claim about rarity. The doc's own decisive magnitudes are 10,
 * 15, 20 and 30, so the cut is at 10 — and it discriminates: at 15 an even pair clears 36.6% of the
 * time and at 20 it clears 32.4%, which is the difference between `break_tackle` and `man_coverage`.
 */
export const DECISIVE_BOUNDARY = 10;

export function sweepScaleSurface(tunables: Tunables = DEFAULT_TUNABLES): readonly ScaleRow[] {
  const rows: ScaleRow[] = [];
  for (const [kind, d] of Object.entries(SURFACE) as [CheckKind, CheckDescriptor][]) {
    if (d.form === "UNIMPLEMENTED") {
      rows.push({
        kind,
        form: "UNIMPLEMENTED",
        docRef: d.docRef,
        stack: [0, 0, 0],
        opposing: [0, 0, 0],
        target: null,
        pWorst: Number.NaN,
        pEven: Number.NaN,
        pBest: Number.NaN,
        ratingSpan: Number.NaN,
        totalSpan: Number.NaN,
        pEvenWorstFlat: Number.NaN,
        pEvenBestFlat: Number.NaN,
        levelInvariant: false,
        flags: [],
        note: d.note,
      });
      continue;
    }

    const actor = termsOf(d.actor, tunables);
    const stack: [number, number, number] = [
      stackAt(actor, 0),
      stackAt(actor, FLAT_LEAGUE),
      stackAt(actor, 99),
    ];
    const [flatLow, flatHigh] = d.flat ?? [0, 0];
    const flags: Flag[] = [];

    let opposing: [number, number, number];
    let target: number | null;
    let pWorst: number;
    let pEven: number;
    let pBest: number;
    let ratingSpan: number;
    let pEvenWorstFlat: number;
    let pEvenBestFlat: number;
    let levelInvariant: boolean;

    if (d.form === "TARGET") {
      const tt = d.targetTerms === undefined ? [] : termsOf(d.targetTerms, tunables);
      opposing = [stackAt(tt, 0), stackAt(tt, FLAT_LEAGUE), stackAt(tt, 99)];
      target = d.target;
      // WORST: the actor at 0 against a target-side at 99. BEST: the reverse. Named per §22a — the
      // opponent MOVES, oppositely, and is not held at the league mean.
      pWorst = pTargetCheck(stack[0] + flatLow, d.target + opposing[2]);
      pEven = pTargetCheck(stack[1], d.target + opposing[1]);
      pBest = pTargetCheck(stack[2] + flatHigh, d.target + opposing[0]);
      ratingSpan = Math.abs(
        pTargetCheck(stack[2], d.target + opposing[0]) - pTargetCheck(stack[0], d.target + opposing[2]),
      );
      pEvenWorstFlat = pTargetCheck(stack[1] + flatLow, d.target + opposing[1]);
      pEvenBestFlat = pTargetCheck(stack[1] + flatHigh, d.target + opposing[1]);
      levelInvariant =
        Math.abs(pTargetCheck(stack[0], d.target + opposing[0]) - pTargetCheck(stack[2], d.target + opposing[2])) <
        0.005;
    } else {
      const opp = termsOf(d.opponent, tunables);
      opposing = [stackAt(opp, 0), stackAt(opp, FLAT_LEAGUE), stackAt(opp, 99)];
      const boundary = d.headlineBand.minMargin;
      target = boundary;
      pWorst = pOpposed(stack[0] - opposing[2] + flatLow, boundary);
      pEven = pOpposed(stack[1] - opposing[1], boundary);
      pBest = pOpposed(stack[2] - opposing[0] + flatHigh, boundary);
      ratingSpan = Math.abs(
        pOpposed(stack[2] - opposing[0], boundary) - pOpposed(stack[0] - opposing[2], boundary),
      );
      pEvenWorstFlat = pOpposed(stack[1] - opposing[1] + flatLow, boundary);
      pEvenBestFlat = pOpposed(stack[1] - opposing[1] + flatHigh, boundary);
      levelInvariant =
        Math.abs(pOpposed(stack[0] - opposing[0], boundary) - pOpposed(stack[2] - opposing[2], boundary)) < 0.005;
      if (pEven > FAT_BOUNDARY_P && boundary >= DECISIVE_BOUNDARY) flags.push("BOUNDARY_ON_FAT");
    }

    // Computed at EVEN ratings with the flats, not at the rating extremes: the question is whether
    // an ORDINARY matchup has a reachable configuration in which the die decides nothing. A flag
    // computed at rating 99 would fire on every check and say only that elite players are good.
    if (pEvenBestFlat >= 0.99) flags.push("DIE_CANNOT_LOSE");
    if (pEvenWorstFlat <= 0.01) flags.push("DIE_CANNOT_WIN");
    const span = ratingSpan;
    if (span < RATING_INERT_SPAN) flags.push("RATING_INERT");

    rows.push({
      kind,
      form: d.form,
      docRef: d.docRef,
      stack,
      opposing,
      target,
      pWorst,
      pEven,
      pBest,
      ratingSpan: span,
      totalSpan: Math.abs(pBest - pWorst),
      pEvenWorstFlat,
      pEvenBestFlat,
      levelInvariant,
      flags,
      note: d.note,
    });
  }
  return rows;
}

/** The report the backlog asks for: ranked by how little the dice matter. */
export function renderScaleSurface(rows: readonly ScaleRow[]): string {
  const live = rows.filter((r) => r.form !== "UNIMPLEMENTED");
  const dead = rows.filter((r) => r.form === "UNIMPLEMENTED");
  const ranked = [...live].sort((a, b) => a.ratingSpan - b.ratingSpan);
  const lines: string[] = [];
  lines.push(
    "check                | form    | stack 0/60/99  | opp 0/60/99    | tgt  | pWorst  pEven  pBest | ratSpan totSpan | lvlInv | flags",
  );
  for (const r of ranked) {
    lines.push(
      [
        r.kind.padEnd(20),
        r.form.padEnd(7),
        `${String(r.stack[0])}/${String(r.stack[1])}/${String(r.stack[2])}`.padEnd(14),
        `${String(r.opposing[0])}/${String(r.opposing[1])}/${String(r.opposing[2])}`.padEnd(14),
        String(r.target ?? "-").padEnd(4),
        ` ${r.pWorst.toFixed(3)}  ${r.pEven.toFixed(3)} ${r.pBest.toFixed(3)}`,
        `${r.ratingSpan.toFixed(3)}   ${r.totalSpan.toFixed(3)}`,
        (r.levelInvariant ? "yes" : "no").padEnd(6),
        r.flags.join(","),
      ].join(" | "),
    );
  }
  lines.push("");
  lines.push(`UNIMPLEMENTED (${String(dead.length)} of ${String(rows.length)} CheckKinds):`);
  for (const r of dead) lines.push(`  ${r.kind.padEnd(20)} ${r.docRef}`);
  return lines.join("\n");
}
