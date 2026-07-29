# ADR-040: Awareness narrows the band; and two orderings the doc, not the table, decides

- **Date:** 2026-07-29
- **Proposed by:** `match-engine`
- **Status:** proposed — **implements three owner rulings on ADR-039 (SA-09, SA-13, SA-14).** The
  rulings are the owner's; everything below is the engine's implementation of them, its measurements,
  and the things it found while implementing and did **not** fix.

---

## 0. WHAT THIS IS

Three ruled findings from the scale audit, implemented in `packages/engine` only. No contracts
change. No calibration change (two are required and are **reported** in §6, not made).

| ruling | finding | what changed |
|---|---|---|
| 1 | **SA-09** §8.3 | Awareness now narrows a band **centred on the truth**. The mean shift is gone. |
| 2 | **SA-13** §10.2 vs §10.3 | Bullet's lane modifier `15 → 10`; the angle table is re-keyed from **throw type** to **geometry**. |
| 3 | **SA-14** §11.1 | `contestedMaxOpenness` `30 → 40`, derived from §9.3's half-yard row. |

**Two things were found on the way and are reported rather than fixed** (§5): a green test that was
decided by one sack, and an open defect in §5.3's hot-route mechanic that predates this dispatch.

---

## 1. RULING 1 — SA-09. THE ENGINE CHANGED, AND IT HAD TO

The dispatch asked me to say so plainly if I read the amended §8.3 and concluded the engine must
move. **I did, and it must.** The ruling landed on two properties — *centred on the true value at
every awareness*, *half-width monotone decreasing in awareness* — and the committed engine held
**neither**:

- **not centred.** `d20 − 10 + (Awareness − 70) ÷ 5` has mean `+0.5 + (A − 70)/5`. At the game
  fixture's quarterbacks (82 and 78 awareness) the measured mean perception error was **+2.63 over
  4,904 unmodified reads.** An elite passer saw receivers as more open than they were.
- **not narrowing.** The width was 20 points at every rating; only the centre moved.

So the sentence's mechanic was implemented nowhere and the examples' bias was implemented exactly.

### 1.1 The half-width mapping, and what was rejected

**Derived from §8.3 itself. Two numbers, both already in the section, neither invented:**

```
halfWidth(A) = baseHalfWidth − (A − baseline) ÷ divisor
             = 10           − (A − 70)      ÷ 5
```

- `10` is **§8.3's own `d20 − 10`** — the doc's offset IS the die's excursion magnitude. It becomes
  the half-width at the baseline rating instead of a shift of the centre.
- `(A − 70) ÷ 5` is **§8.3's own awareness term**, moved from the centre to the half-width: the
  quantity the superseded sentence always claimed it applied to.

Scale: **95 → ±5 · 70 → ±10 · 60 → ±12 · 40 → ±16.** Nothing is clamped on the registry's 0-99
range (the largest possible narrowing is 5.8 against a base of 10).

**REJECTED, named per the ADR-033 precedent:**

1. **a per-awareness-band table of half-widths** — a new scale nobody asked for; SA-01's failure with
   better intentions;
2. **a fresh divisor chosen so the elite band comes out ±5** — the same invention wearing a formula.
   The elite band *is* ±5, but as a consequence of §8.3's own arithmetic rather than as a target;
3. **interpolating the doc's superseded examples' 20-point width** into the elite band — they are
   superseded precisely because they were never a narrowing;
4. **§8.4's window divisors (÷2, ÷4, ÷4)** — that stack is a *compensation for a tight window*, a
   different mechanic on a different axis; borrowing it would have coupled perception accuracy to arm
   talent.

### 1.2 The draw, and why symmetry is exact rather than approximate

`perceptionVariance(face, h) = sign(x) · round(|x|)` where `x = (2·face − 21) · h ÷ 19`.

- `2·face − 21` maps the d20's 20 faces onto `±{1,3,…,19}` — symmetric about the die's midpoint, no
  face on zero, no face unpaired.
- Rounding **away from zero** keeps the map **odd**: `v(21 − face) = −v(face)` for every face and
  every half-width. `Math.round` alone breaks ties upward and would have reinstated half a point of
  optimism, which is the same defect as five points of it.

**Consequences, and both are proved over the whole domain rather than sampled**
(`test/qbDecision.test.ts`):

- **CENTRED:** the variance over the 20 faces sums to exactly 0 — asserted at every integer awareness
  from 0 to 99, and at eleven half-widths;
- **MONOTONE:** `halfWidth` is strictly decreasing across all 100 ratings, and **per face**
  `|v(face, h(A+1))| ≤ |v(face, h(A))|` — a better passer is no further from the truth on *any* draw,
  not merely on average.

**One honest limit on "centred", stated rather than buried.** The property is a property of the
**variance term**. `perceivedOpenness` is still clamped to the openness scale's `[0, 100]`, so a read
whose true openness is 6 has its negative tail truncated and the *perceived* value is optimistic at
the very bottom of the scale. That is a boundary of the scale, not a bias in the mechanic, it is
pre-existing and unchanged, and it is why the tests assert the property on `varianceRoll.total` and
not on `perceivedOpenness`.

`RollDetail`'s arithmetic is untouched: `total = raw + Σmodifiers` still holds, asserted directly.
The roll is built by a new `rollD20Shaped` in `rolls.ts` (modifiers as a function of the face) so no
resolver hand-builds a detail. The §17 printout now reads:

```
Awareness variance: d20 2 - 11 (d20 → perception band (±10)) + 2 (QB Awareness (perception band ±7.6)) = -7
```

The awareness modifier is emitted **even when it is zero**, against the usual `compact` convention:
the band width is the mechanic, and a reader of the printout has to be able to see it on a baseline
quarterback too.

### 1.3 §8.8's vision cone is untouched, and the distinction is the point

The scramble cone (`−20` / `−40`) still shifts the centre. That is a **deliberate** bias — a
quarterback running for his life genuinely cannot see the backside — and it is asserted to still
work. Awareness buys accuracy of perception; it never buys optimism. Two different things, now
implemented as two different things.

### 1.4 GATING RECOMMENDATION (calibration owns the gate; this is the recommendation)

**Gate both properties — but gate them HERE, in the engine's unit surface, and do NOT put them on the
corpus yet.**

- Both are properties of a **mapping**, not of a population: they are decidable exhaustively over 20
  faces × 100 ratings in milliseconds, with no simulation. That is a proof; a corpus gate over the
  same claim would be a sample of a thing already proved.
- On the flat-60 league every quarterback shares one band, so a corpus gate would be **measuring its
  own fixture**: green, confident, and evidence of nothing — `calibration.md` §5.3's "an instrument
  that runs and returns something is more dangerous than one that declines", and §22a's gate that
  passed by luck. §5's finding in this ADR is what that failure looks like when it goes unnoticed.
- **When `packages/attributes` lands** (backlog 49), the corpus question is a different and better
  one, and it is not this property: *does perception width, now unbiased, produce the completion and
  time-to-throw distribution real spread implies?* That needs the spread league. The two properties
  asserted here will still be true and will still not need a corpus.

### 1.5 ⚠ WHAT IS **NOT** CLAIMED

**No claim that the football improved.** The measurement below shows the mean perception error moved
`+2.63 → +0.11` and the range from `[−7, +12]` to `[−8, +8]`, and the stream digest moved. That is
**the ruled property arriving**, nothing more. On a flat league the term is a constant; on this
dispatch's fixture it is two quarterbacks four points apart. Evaluating whether this makes better
football is backlog 49's, and it is not available yet.

---

## 2. RULING 2 — SA-13. §10.2's NUMBER, AND §10.3's ANGLE PUT BACK ON GEOMETRY

**The number:** `throwExec.lane.velocityModifier.BULLET` **15 → 10**. §10.2 is the mechanic
description and wins; §10.3's velocity table is the restatement.

**The worse half — the mapping.** `angleByThrowType` put the throw type on **both** of §10.3's terms
(`BULLET → THROUGH_ZONE −10`, `TOUCH → OVER_DEFENDER +20`), and the angle half was the larger, so the
net lane targets came out **bullet 65 / touch 70**: a touch pass was harder to deflect than a bullet.

§10.3 computes `60 + velocity + angle` from **two independent inputs** — how fast the ball is
travelling, and where this defender is relative to its path. The engine already knows the second one.
It is now keyed on `ContestPosition`, the same input §11.3 uses:

| contest position | angle | value | football |
|---|---|---|---|
| `IN_FRONT` | `THROUGH_ZONE` | −10 | he undercut the route and is standing in the lane |
| `EVEN` | `PAST_DEFENDER` | 0 | alongside at the catch point, not in the flight path |
| `TRAILING` | `OVER_DEFENDER` | +20 | beaten and chasing, so the ball is thrown over him |

**The ordering is now a property of §10.2's two numbers alone and cannot depend on the mapping:** at
every geometry `bulletTarget − touchTarget = +20`, asserted for all three positions. All three of
§10.3's angle values are reachable — `TRAILING` and `EVEN` through §9.4's zone defender who broke on
the ball, which is why the mapping did not simply strand `OVER_DEFENDER` as a dead cell.

**Not touched:** `tippedBall.velocityModifier` (§12.2's own table, not §10.3's), and SA-08 / SA-17,
which are not ruled.

### 2.1 §10.3's TEXT STILL SAYS `+15` — ONE ORCHESTRATOR EDIT OUTSTANDING

The engine now holds §10.2's `+10` and its tunables comment carries the ruling. **`docs/design/
match-engine.md` §10.3's velocity table still reads `Bullet: +15`.** Correcting a mechanic section is
the Orchestrator's edit, not the engine's — but until it is made, the doc still contradicts itself
and the next reader can resolve it the other way. Appendix C's new rule is the model: *resolve
against the section, then correct the loser.*

---

## 3. RULING 3 — SA-14. THE THRESHOLD IS §9.3's HALF-YARD ROW: **40**

§11.1: *"CONTESTED CATCH: **Defender within 1 yard**"*. §9.3 supplies the mapping. Reading down it:

| §9.3 row | separation | openness | within one yard? |
|---|---|---|---|
| `SEPARATION_1_2` | 1-2 yards | 55 | **STRADDLES** — one yard is this row's lower edge, two is not |
| `SEPARATION_HALF_YARD` | ½ yard | **40** | yes, beyond argument |
| `EVEN_BRACKET` | 0 yards | 32 | yes, beyond argument |
| `CB_IN_PHASE` / `CB_ON_HIP` / `CB_IN_POSITION` | defender ahead | 25 / 15 / 6 | yes |

**§9.3's mapping cannot answer "what openness is exactly one yard".** It is eight discrete rows, not
a function of yards, and one yard is the lower edge of a row that also contains two. So the smallest
defensible reading is taken: **the threshold is the widest separation §11.1 makes contested beyond
argument — the half-yard row's own openness, 40, compared inclusively.**

**Why not the two alternatives:**

- **≈47 by interpolating 40 and 55** — a number this engine would have invented, on a scale with no
  continuous definition. That is SA-01's failure exactly.
- **55, pulling in the whole `SEPARATION_1_2` row** — that rests on §9.3's parenthetical
  *"(contested)"*, and **that parenthetical against §8.4's scale IS SA-08, which is not ruled.** If
  SA-08 later rules for §9.3's words, this cell moves to 55 **with** that ruling.

**The pair cannot drift apart silently.** `TUNABLES` is `as const`, so the equality
`contestedMaxOpenness === SEPARATION_HALF_YARD.openness` is a fact the type system decides, and it is
asserted **by the compiler** (mutual assignability of two literal types in
`test/throwCatch.test.ts`), not by a green runtime cell. Moving either number is a compile error at
the derivation. The ordering `40 < 55` is not type-decidable and is asserted at run time.

**On the cost.** The ruling's instruction was not to protect the metric, and this ADR does not: the
interception channel widens, `int_rate` is expected to move, and the interception figures below are
reported **contaminated by propagation**, never as exclusive counts.

---

## 4. PRICING — RAW COUNTS, AND A REFUSAL WHERE ONE IS OWED

### 4.1 ⚠ THE POPULATION IS NOT ADR-039's, AND THE NUMBERS ARE NOT COMPARABLE TO ITS

The corpus, the league and the playbook live in `packages/calibration`, which this dispatch may
report to but not edit. **These counts are measured on `packages/engine`'s own two-team game
fixture — 48 games, seeds `sa-meas-0..47`, ~6,900 plays, ~3,400 throws** — a different play mix and a
different roster from ADR-039's 160-game corpus. **Directions are comparable; absolute rates are
not.** (ADR-039 measured a 6.3% contested share; this fixture's is 17%.)

### 4.2 RAW REACH, measured on the pre-change arm

| ruling | cells | raw reach (48 games) |
|---|---|---|
| SA-09 | `qb.awarenessVariance.*` | **5,250 QB_READ perception draws** (4,904 without a §8.8 vision cone) — read on every read of every dropback |
| SA-13 | `lane.velocityModifier.BULLET` + the angle mapping | **646 `passing_lane` checks**, 18.6% of throws — **all 646 BULLET** |
| SA-14 | `catching.contestedMaxOpenness` | **2,285 catch resolutions** — read on every one |

**A finding inside the finding:** the touch-pass arm of SA-13's inverted ordering has a **raw reach of
zero** on this fixture. `selectThrowType` returns BULLET on any window at or under 50 openness and
lane eligibility needs openness ≤ 60, so **every lane check in 48 games was a bullet.** The inversion
was real in the mechanic and unexercised in this population; the change to the ordering therefore
prices as a change to the *bullet* row (65 → 60 for an undercutting defender) plus two newly
reachable geometries.

### 4.3 EXCLUSIVE REACH: **DECLINED, for all three** — `calibration.md` §5.3's LIMIT

All three changes alter target numbers or classifications that are **read**, so every arm's stream
diverges after the first affected play. Per the LIMIT note: *the tell is that you cannot produce a
digest-identical arm* — and none of the three can. **"Plays that differ" over-counts without bound
and "games that differ" under-counts; neither is reported here as an exclusive count.**

**One consequence worth recording for calibration.** SA-14's exclusive reach *ought* to be computable
from a **single** stream — it is a pure re-classification of reps whose openness falls in (30, 40] —
but `CATCH_RESOLUTION` publishes the catch **type** and not the **openness that decided it**, so the
population cannot be counted from the stream at all. A one-run bound is unavailable for a reason that
has nothing to do with propagation.

### 4.4 WHAT MOVED — sequential arms, each including the previous

| | baseline | +SA-13 | +SA-14 | +SA-09 (final) |
|---|---|---|---|---|
| stream digest | `a93120cb` | `3b35e14c` | `b725f8a8` | `86ee319a` |
| plays | 6,965 | 6,977 | 6,947 | 6,818 |
| throws | 3,472 | 3,485 | 3,444 | 3,296 |
| `passing_lane` checks | 646 | 636 | 629 | 546 |
| lane targets | all **65** | 60×583, 70×52, 90×1 | 60×575, 70×53, 90×1 | 60×493, 70×53 |
| lane deflections | 409 | 437 | 435 | 379 |
| routine catches | 1,898 | 1,908 | 1,743 | 1,713 |
| contested catches | 387 | 350 | **493** | 465 |
| INTERCEPTION band | 127 | 111 | **142** | 132 |
| turnovers | 241 | 226 | 251 | 235 |
| mean perception error | **+2.63** | +2.63 | +2.63 | **+0.11** |
| perception range | **[−7, +12]** | — | — | **[−8, +8]** |

**Read this table as directions with propagation in every cell, not as effect sizes.** The SA-14
column shows contested resolutions **+40.9%** and the INTERCEPTION band **+27.9%** against the arm
before it — the same directions ADR-039 measured on the real corpus (+34.8% / +20.1%) at different
magnitudes, as different populations should give. Even the contested delta is **not** an exclusive
count: the number of catch resolutions itself moved between the arms.

The mean-perception row is the one number in this table that is a **property** rather than a
measurement: it is +0.11 because of sampling, and it is exactly 0 by construction — proved per face
in the unit tests, not inferred from this corpus.

---

## 5. FOUND WHILE IMPLEMENTING, AND **NOT FIXED**

### 5.1 A green test that was decided by one sack

`blitz.test.ts`'s *"hot routes cut the sack rate on a blitz down"* went red. It was measured properly
before anything was concluded — **the same instrument, on the committed pre-ADR-040 tree**, at six
sample sizes:

| n | 100 | 200 | 400 | 800 | 1,600 | 3,200 |
|---|---|---|---|---|---|---|
| hot | 31 | 58 | **108** | 211 | 434 | 874 |
| cold | 25 | 56 | **109** | 215 | 437 | 847 |
| verdict | FAIL | FAIL | pass | pass | pass | FAIL |

**It passed at 400 by one sack and reverses at 3,200 — before this dispatch touched anything.** The
claim was never a property of the engine. ADR-040 did not break it; it moved a coin that was already
in the air.

### 5.2 THE DEFECT UNDERNEATH IT — §5.3's hot conversion gets the ball out LESS often

Measured over 4,000 seeds, **conditioned on the 3,309 where the conversion actually fired**
(`calibration.md` §5.3's live-population rule — the unconditioned comparison dilutes the mechanic
across seeds where it never ran):

| | throws | sacks |
|---|---|---|
| hot card | 2,188 | 1,028 |
| no hot card | 2,285 | 1,006 |

**The hot conversion currently reduces throws and raises sacks** — the opposite of §5.3's purpose,
and the same direction on the pre-ADR-040 tree at large n. **Not fixed here.** It is a question about
§8.5's throw threshold against a 6-yard slant's openness, and answering it inside a doc-conformance
dispatch would be a tuning change smuggled in behind three rulings. **Reported to calibration for the
backlog.**

The test now pins the **defect**, in the converted-tripwire form ADR-036 used: it asserts the
mechanic has a live population, that the arms genuinely differ, and **the current direction**, so that
the day somebody fixes §5.3 the test reddens and must be flipped deliberately.

### 5.3 Two fixtures re-cut, and why that is not the same thing

- `tippedBall.test.ts`'s six pinned corpus digits were ADR-035/036's proof that a **reporting** fix
  moved no football. ADR-040 is not a reporting fix, so they are re-baselined **with both columns in
  the comment**. Everything structural in that block — `deadEligible`, `deadRecoveryChecks`,
  `deadCarryingTheKey`, `deadClaimingRecoverable`, `liveTargets` — did not move, which is what
  ADR-036's claim predicted.
- `game.test.ts`'s overtime and tie seeds were re-scanned (`ot-2 → ot-95`, `ot-1465 → ot-891`), the
  fifth time this block has been re-scanned for the same reason. A seed found by scanning for a
  whole-game outcome is not a property of the branch it tests.

---

## 6. WHAT CALIBRATION MUST CHANGE (reported, not made)

`packages/calibration` is not this dispatch's to edit. **One test is red on the committed tree until
these are made**, and the register being the thing that noticed is the register working:

1. **`test/docConformance.test.ts:36` — `RECORDED_CENSUS.strings: 283 → 282`.** `angleByThrowType`
   had four string leaves (one per `ThrowType`); `angleByContestPosition` has three (one per
   `ContestPosition`). **`numbers: 699` and `booleans: 126` are unchanged** — SA-09 removed
   `d20Offset` and added `baseHalfWidth`, and SA-13/SA-14 changed values, not cell counts. This is
   the only red.
2. **`test/scaleAudit.measure.test.ts:158` — `patch("catching.contestedMaxOpenness", 30, 40)` is now
   stale** and will throw `TunablePatchError` when `FF_SCALE_AUDIT=1` is set. The probe has become
   the tree; the SA-14 pricing block should be retired or re-pointed.

**Three register notes are now stale** (they describe defects that no longer exist, and none of them
reddens anything): `qb.awarenessVariance.*` (SA-09), `throwExec.lane.velocityModifier.BULLET`
(SA-13, and its `docRef` should become §10.2), `catching.contestedMaxOpenness` (SA-14). The three
findings' `cells` lists all still resolve.

**Two new backlog candidates**, from §5: the hot-conversion defect (§5.2), and the general lesson
that a whole-fixture comparison at n=400 is not an instrument (§5.1).

---

## 7. FILES

| file | change |
|---|---|
| `packages/engine/src/tunables.ts` | `qb.awarenessVariance` re-derived; `lane.velocityModifier.BULLET` 15→10; `angleByThrowType` → `angleByContestPosition`; `catching.contestedMaxOpenness` 30→40 |
| `packages/engine/src/resolve/qbRead.ts` | `perceptionHalfWidth`, `perceptionVariance`, centred draw |
| `packages/engine/src/rolls.ts` | `rollD20Shaped` — modifiers as a function of the face, `total = raw + Σmods` preserved |
| `packages/engine/src/resolve/throwExecution.ts` | `PassingLaneArgs.contestPosition` (required); angle from geometry |
| `packages/engine/src/sim/passPlay.ts` | passes `track.contestPosition` to the lane check |
| `packages/engine/test/qbDecision.test.ts` | §8.3's two ruled properties, proved exhaustively |
| `packages/engine/test/throwCatch.test.ts` | lane ordering at every geometry; §11.1's contested rows; compiler-decided derivation |
| `packages/engine/test/blitz.test.ts` | the recorded defect (§5.1, §5.2) |
| `packages/engine/test/tippedBall.test.ts`, `test/game.test.ts` | fixtures re-cut (§5.3) |

`pnpm typecheck` — 8/8 packages clean. `pnpm test` — engine 757/757; calibration 469 pass, **1 fail**
(§6 item 1, which is calibration's to make).

---

## Decision

*Owner + Orchestrator. Pending.*
