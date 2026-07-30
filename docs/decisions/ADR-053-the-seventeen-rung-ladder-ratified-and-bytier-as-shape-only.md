# ADR-053 — The seventeen-rung ladder, ratified; `ByTier<T>` as shape only

**Status:** RATIFIED (owner, 2026-07-30). Contract petition — `packages/contracts/src/events.ts`.
**Supersedes the open items of:** ADR-050 (the tier and the cumulative are different numbers),
ADR-051 (the consumer audit), ADR-052 (the tail derivation).
**Category:** closed-union widening (ADR-013's pre-approved category) plus one new exported type.

---

## 1. What is ratified

Four decisions, all owner rulings on ADR-052's derivation.

| # | Decision |
|---|---|
| 1 | **17 rungs, four new per side.** Success floors `45 / 60 / 75 / 90`, mirrored. Gated at **the engine's shift set**, not shift 0. |
| 2 | **The form conflict is ACCEPTED, not reconciled.** The ladder is ratified for the OPPOSED form. Target-form behaviour is recorded, not fixed. |
| 3 | **Naming: `DECISIVE` / `DOMINANT` / `CRITICAL` / `OVERWHELMING` / `TOTAL`**, with `CRITICAL` at `[60, 74]` — 4.950% at shift 0. |
| 4 | **`ByTier<T>` ships as shape and rule, instantiated nowhere.** The escape hatch was correctly taken. |

The ladder:

| Rung | Interval | Width |
|---|---|---|
| `TOTAL_SUCCESS` | [90, +∞) | open |
| `OVERWHELMING_SUCCESS` | [75, 89] | 15 |
| `CRITICAL_SUCCESS` | [60, 74] | 15 |
| `DOMINANT_SUCCESS` | [45, 59] | 15 |
| `DECISIVE_SUCCESS` | [30, 44] | 15 |
| `STRONG_SUCCESS` | [15, 29] | 15 |
| `SUCCESS` | [5, 14] | 10 |
| `MARGINAL_SUCCESS` | [1, 4] | 4 |
| `TIE` | [0, 0] | 1 |
| `MARGINAL_FAILURE` | [−4, −1] | 4 |
| `FAILURE` | [−14, −5] | 10 |
| `STRONG_FAILURE` | [−29, −15] | 15 |
| `DECISIVE_FAILURE` | [−44, −30] | 15 |
| `DOMINANT_FAILURE` | [−59, −45] | 15 |
| `CRITICAL_FAILURE` | [−74, −60] | 15 |
| `OVERWHELMING_FAILURE` | [−89, −75] | 15 |
| `TOTAL_FAILURE` | (−∞, −90] | open |

`CRITICAL_SUCCESS` is **renamed by floor, never by label** — the word appears twice during
construction, once as the committed rung at 30 and once as the new rung at 60, and a label-keyed
rename would rewrite both. ADR-052 avoids this structurally. Any implementation must do the same.

---

## 2. Why 17 and not 15 — the gate scope is the decision

The 15-rung ladder (floors `45 / 60 / 75`) is monotone **at shift 0** and fails at **shift −12**,
which is §7.1's SPEED/FINESSE branch — *half of every pass-rush rep played*. Six of the engine's
eleven even-contest shifts fail it.

The owner's ruling: *"a shift-0 gate would have passed the 15-rung ladder … we'd be choosing a
ladder that holds only under a measurement we already know is the wrong scope."* That is backlog
entry 49's flat-league trap presenting live, and it is the reason the scope is ratified alongside
the numbers.

The stop re-derives cleanly at the wider scope rather than being extended by hand. At worst-case
shift ±20 the triangular support widens from 100 to 120, so the condition `2·T(B) < T(B−15)`
becomes `u = 120 − B`, giving `B ≥ 85` and **first lattice point 90**. Same three steps as
ADR-052 §2; only the shift the stop is evaluated at differs. **Nothing here is a chosen number.**

---

## 3. The naming, and the one slot the ratification did not cover

The owner ratified `DECISIVE` / `DOMINANT` / `TOTAL` with `CRITICAL` at low single digits, against
**ADR-052's 15-rung table**. Seventeen rungs need **five** names above `STRONG_SUCCESS`; four were
ratified. ADR-052's `derivedLadder` is honest about the gap — it pads with a literal
`ABSOLUTE_SUCCESS_1` placeholder rather than inventing one.

**`OVERWHELMING_` fills the `[75, 89]` slot** — Orchestrator's call, flagged rather than absorbed.
It is not invented for this ADR: it is already ADR-052's own vocabulary, carried in
`NAMING.ADJACENT`. It satisfies both stated constraints — `TOTAL` stays at the extreme, and
`CRITICAL` stays at `[60, 74]`, whose 4.950% is **unchanged by the split**, because splitting the
rung *above* `CRITICAL` cannot move `CRITICAL`'s own interval.

Owner's standing note, recorded for the UI and narrative phases: **these names become
player-facing**, so the top rung must be the one that sounds like an outlier.

---

## 4. The form conflict — accepted, and the real question deferred

One ladder cannot serve both roll forms. Opposed monotonicity needs a top floor ≥ 61; the target
form's exact-width property needs ≤ 50. Every admissible ladder has an **empty target window** —
asserted over all 57 two-rung and 1,587 three-rung candidates.

And the deeper half: **on the uniform form strict monotonicity is unsatisfiable outright, by any
ladder**, because a bounded rung's occupancy *is* its width, so equal widths are equally likely.
That is not a boundary problem. It is a statement that **the two forms have incompatible
requirements**, i.e. the ladder is being asked to do two jobs.

Ratified: the derived ladder governs the **opposed** form, where the football lives and where
monotonicity is meaningful. Recorded, not fixed: target-form checks read the same tier names under
a distribution where strict monotonicity **does not hold by construction**.

The gain taken while the conflict stands is large and real — non-strict compliance goes from
**0 of 30** engine target shifts on the committed ladder to **26 of 30** on the derived one. The
four survivors (`field_goal`, `deflection_recovery`, five R99 checks) are stacks sitting *above*
their target: **rating work, unreachable by any ladder**. That is a clean mechanic-versus-rating
disambiguation falling out of the derivation for free.

> ⛔ **DEFERRED, DELIBERATELY: should target checks read a separate ladder?**
> Not answered here. It is a design decision needing its own evidence, and shipping a compromise
> boundary to avoid asking it is exactly what this project has refused all week. Logged to the
> calibration backlog as an open question with the conflict as its evidence.

---

## 5. ⛔ The correction this ADR exists to record

**The ruling that ratified the re-banding contained ADR-050's exact error, one dispatch after we
named it.**

ADR-050 established that the tier and the cumulative band are different numbers. The owner's
ruling on it then predicted that `RUSHER_WINS_REP` — §7.1's cumulative band — *"lands near 10–15%
per rep once the tail above it is a tail."*

**It does not, and it cannot.** `passRush.bands` is a separate `minMargin` table
(`packages/engine/src/tunables.ts:275`), structurally independent of `resultTierLadder`
(`:97–105`). `P(margin ≥ 15)` is fixed by the roll and is **invariant under every re-partition of
the ladder above 15**: 31.871% before this change, 31.871% after, to three decimals, asserted under
both namings and both scopes. What actually sits in the 10–15% window is the *tier*
`STRONG_SUCCESS` at 10.816% — and it sat there before the change too, because `[15, 29]` is
untouched.

Two things follow, and the second is the one that matters.

**(a) The re-banding was never going to fix §7.1's supply.** Entry 40's supply correction remains
separate work and is still owed. The ladder change is worth doing on its own merits — the
modal-critical naming defect is real, and 26-of-30 is a genuine gain — but **it is not the pressure
fix, and the roadmap must not read as though it were.**

**(b) A ratified ruling is the artifact review cannot catch.** Charter §4.1's audit-priority
corollary says a pin that drifts stops the build while a stored ruling that drifts keeps being
cited. This is the sharpest instance yet, and the owner's own diagnosis of why it survived is the
part worth keeping: **because it was mine and recent.** A ruling issued by the authority that
reviews rulings, on a distinction that authority had just drawn, is the exact configuration in
which no reviewer is looking. It was caught by an implementer computing the number rather than
quoting it — the same mechanism that caught ADR-046's constant.

Related: ADR-046 (a quoted constant in a Need section is a restated constant with a ratification
attached).

---

## 6. `ByTier<T>` — shape and rule, instantiated nowhere

The owner ruled that a mapped type ships. The finding that motivated it stands: with the union
widened, **the engine compiles clean at seventeen rungs with zero errors**, because every
tier-keyed structure is a runtime `Map` that gains a key in silence.

But the placement constraint could not be satisfied honestly. ADR-052's sweep found that
`ResultTier` appears repo-wide **only** as a payload field type and `tierFor`'s return —
**no structure is keyed by tier anywhere.** The reason is not an oversight; it is **ADR-029
holding**: every football meaning lives on a per-check *band table*, never on a tier.

The owner's escape hatch was pre-authorised and is taken: *"a mapped type invented purely to force
compile errors is a guard with no subject."* So:

- **`ByTier<T>` is exported** as a mapped type **over the union**, never a hand-written record of
  rung names. It is derived from the ladder; it does not restate it. A future ladder change edits
  one place, not two.
- **It is instantiated nowhere today.** Its subjects are scheduled, not invented: the UI outcome
  badge and the narrative trigger table, both of which must supply a per-tier meaning by
  construction when those phases open.

**The guard's live subject is elsewhere, and it is documented.** `pocket.severity`,
`accuracyModifier`, `readCapacityDelta` and `minimumStatusByBand` are bare object literals keyed by
`PocketStatus` — and ADR-033/034 record **this exact failure already having happened there**: a
status-keyed lookup with `?? 0` where `0` is the *best* rung, so an unranked status reported as the
cleanest possible pocket and every `worst()` silently agreed.

> A guard whose subject is a **documented past defect** is the opposite of a guard with no subject.

Referred to `match-engine` as a separate change, not folded into this petition.

---

## 7. `metrics/collect.ts` — closed, and logged as latent

The tier arm read `margin ≥ 5` against the band arm's `≥ 15`, counting `BLOCKER_BEATEN` as a rusher
win — the interval ADR-033 split out on the ruling that *gaining ground is not pressure*. The three
tier identities were **removed rather than corrected**, because three equality comparisons against
tier *names* are a restated constant: ADR-051 showed that a rung added above `CRITICAL_SUCCESS`
would make that line record the largest-margin win in the game as a **loss**, and credit the
blocker with it. Both arms now derive from `passRush.bands`.

**Blast radius zero, for a checkable reason**: `pass_rush_tick` has one emitter
(`engine/src/resolve/passRush.ts:93`) which publishes `band` unconditionally, so the fallback arm
was **unreachable**. Recorded as **latent, not active** — and it would have activated silently on
the first second producer. Landed in `e6a36ff`.

---

## 8. Consumer position (from ADR-051, re-confirmed)

- No `Record<ResultTier, …>` exists anywhere; the widened union compiles clean.
- The engine has **no** tier consumers — ADR-011 working as designed.
- `metrics/collect.ts`'s equality consumer is **removed** (§7).
- `tippedBall.test.ts:391`'s `accuracyTier === "CRITICAL_FAILURE"` filter (live at 55/371) moves by
  **zero**, because `CRITICAL_FAILURE`'s floor is −74, beyond the −60 at which it stops moving.
  ⚠ **No boundary was shaded to achieve this.** Boundaries are identical under both candidate
  namings; only the label differs, and the naming was chosen on the owner's own *"low single
  digits"* test. The zero impact is a consequence, not the motive.

## 9. Implementation order

1. `packages/contracts` — widen `ResultTier` to 17; export `ByTier<T>`. *(Orchestrator)*
2. `packages/engine` — `resultTierLadder` floors; the `PocketStatus` `ByTier` subject. *(match-engine)*
3. `packages/calibration` — re-point the derivation and its gates onto the engine-scope ladder;
   record §5; backlog updates. *(calibration)*
