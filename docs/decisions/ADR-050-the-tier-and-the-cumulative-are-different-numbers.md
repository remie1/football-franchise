# ADR-050: The tier and the cumulative are different numbers — `STRONG_SUCCESS` is an 11.700% event, and 36.550% is the ladder's TOP TWO TIERS

- **Date:** July 2026
- **Proposed by:** `calibration`
- **Status:** proposed — MEASUREMENT ONLY, no tunable moved, one football ruling still owed to the owner
- **Supersedes nothing. Corrects a reading in:** ADR-049 §Proposal item 1, `scaleSurface.ts`'s
  `BOUNDARY_ON_FAT` note, `tunables.ts`'s §7.1 band comment

## Need

ADR-049 §Proposal put two football questions to the owner. The owner refused to rule on the first
until the ladder itself was measured:

> *"`RUSHER_WINS_REP` is `STRONG_SUCCESS` on `resultTierLadder`, and the question is whether 'past
> his blocker and travelling' is the right football meaning for that tier, or whether threat creation
> should require the tier above it. My read is that the tier is right and the LADDER MAPPING is what
> is producing 36% — a strong success on an even contest should not be a one-in-three event. Bring me
> the ladder's actual probabilities before choosing, because if `STRONG_SUCCESS` fires at 36% on even
> matchups then the problem is larger than §7.1 and touches every check in the game."*

So: **the empirical firing probability of every tier of `resultTierLadder`, on an even contest, for
every check that reads it.**

## What was built

| file | tier | scope |
|---|---|---|
| `packages/calibration/src/knownTruth/ladderOccupancy.ts` | — | the derivation and the census fold |
| `packages/calibration/test/ladderOccupancy.test.ts` | FREE — every push | exact arithmetic, no corpus, no seeds |
| `packages/calibration/test/ladderOccupancy.measure.test.ts` | 3, `FF_LADDER=1` | 4 seed lists × 160 games |

**Every probability in this ADR is DERIVED, not sampled.** d100 is uniform on 1..100 and the
difference of two d100s is triangular on [−99, 99], so a firing probability is arithmetic and needs
no corpus. The corpus exists only to falsify, and it did its job: see §5.

Seeds: `known-truth:band-table-monotonicity` `fnv1a:60f21076#160`,
`known-truth:ladder-occupancy/set-1` `fnv1a:197eb3a6#160`, `/set-2` `fnv1a:53763925#160`,
`/set-3` `fnv1a:6f560ccd#160`. **1,552,112 tiered resolutions.**

## 0. "EVEN CONTEST" — DEFINED, AND THE FLAT-LEAGUE TRAP ANSWERED FIRST

**Even contest = EQUAL RATINGS on both sides, no situational flats.** Not "zero margin shift", which
would assume the answer. The distinction is load-bearing: a check whose two stacks hold a different
NUMBER of attribute terms produces a non-zero shift at equal ratings, so *evenly rated* and *evenly
matched* are different conditions and this instrument reports the gap between them.

**Is the answer a property of the ladder or of the flat-60 fixture?** Both, and the discriminator is
arithmetic rather than empirical. Every check is evaluated at six league levels (0/20/40/60/80/99):

- **12 of 31 structures are LEVEL-INVARIANT.** Their shift is the same at every rating, so their
  even-contest occupancy belongs to the LADDER and generalises to any rated league. `pass_rush_tick`
  on a POWER rush is one of them: three rusher terms against three blocker terms, all at ÷5, so the
  shift is identically 0 at rating 0, 60 and 99. **The 36.550% is not an artefact of the flat
  league.**
- **19 of 31 are LEVEL-VARIANT**, with tier occupancies moving up to **100pp** across the rating
  range (`deflection_recovery`), **40pp** (`anticipation`, `blitz_recognition`, `field_goal`,
  `passing_lane`, `pocket_movement`, `pursuit_angle`, `rb_vision`, `scramble`, `stunt_communication`,
  `zone_read_qb`), **20pp** (`accuracy`, `catch`, `qb_decision`, `second_level_climb`) and **16.1pp**
  (`contested_catch`, `downfield_block`, and `pass_rush_tick` on its SPEED and FINESSE branches).
  **For every one of these, a number read off the flat-60 column is a statement about the fixture.**

`levelInvariant` is pinned per check by the free tier, so the flat-league trap is never one lookup
away from any figure quoted here. **This is backlog entry 49's hazard handled in the direction that
matters: the §7.1 headline survives it, and nineteen other rows do not.**

## 1. ⛔ THE FINDING — THE PREMISE OF THE QUESTION IS WRONG, AND IN THE OWNER'S FAVOUR

**`STRONG_SUCCESS` does not fire at 36% anywhere in the engine.** The ladder, as intervals:

| tier | interval | width | occupancy, even OPPOSED | occupancy, TARGET |
|---|---|---|---|---|
| `CRITICAL_SUCCESS` | [30, +∞) | **open** | **24.850%** | 23–71% (shift-dependent) |
| `STRONG_SUCCESS` | [15, 29] | 15 | **11.700%** | **15.000%** |
| `SUCCESS` | [5, 14] | 10 | 9.050% | 10.000% |
| `MARGINAL_SUCCESS` | [1, 4] | 4 | 3.900% | 4.000% |
| `TIE` | [0, 0] | 1 | 1.000% | 1.000% |
| `MARGINAL_FAILURE` | [−4, −1] | 4 | 3.900% | 4.000% |
| `FAILURE` | [−14, −5] | 10 | 9.050% | 10.000% |
| `STRONG_FAILURE` | [−29, −15] | 15 | **11.700%** | **15.000%** |
| `CRITICAL_FAILURE` | (−∞, −30] | **open** | **24.850%** | 0–40% (shift-dependent) |

> ### On an evenly matched opposed contest, `STRONG_SUCCESS` fires on **11.700%** of resolutions. On a target check it fires on **15.000%**. Both sit inside the owner's own football window for a won rep — *"10–15% of snaps"*.

**36.550% is P(margin ≥ 15) — `STRONG_SUCCESS` AND `CRITICAL_SUCCESS` together.** The two differ by a
factor of 3.12 because a `minMargin` band row is OPEN ABOVE and a ladder TIER is not. `RUSHER_WINS_REP`
is not "`STRONG_SUCCESS`"; it is **"`STRONG_SUCCESS` or better"**, and the tier above it is *bigger
than it is*.

This is a reading error in the record, made three times independently, and it is corrected here:

- `tunables.ts`'s §7.1 comment: *"`RUSHER_WINS_REP` 15+ — `resultTierLadder`'s STRONG_SUCCESS,
  unchanged."* Accurate about the FLOOR; read by everyone since as a statement about the TIER.
- `scaleSurface.ts`'s `pEven` is a cumulative by construction (correctly — it prices band rows) and
  its `BOUNDARY_ON_FAT` note quotes *"at 15 an even pair clears 36.6% of the time"*, which is the
  cumulative and says so, but nothing in the package published the occupancy beside it.
- ADR-049 §Proposal: *"`minMargin = 15`, which is `P ≈ 0.32` per rep"*, correct, then framed against
  a tier name whose occupancy is a third of that.

**Nothing in the engine is mis-computed. What was mis-read is which of two numbers the tier name
denotes.**

## 2. AND THE NUMBER NOBODY HAD LOOKED AT: `CRITICAL_SUCCESS` IS THE MODAL TIER OF THE LADDER

The ladder's seven interior rungs are bounded intervals of widths 15/10/4/1/4/10/15 — 59 points of
margin between them. **The two extreme rungs are OPEN and absorb everything past ±30**, which on a
symmetric opposed roll is **24.850% each.**

> **`CRITICAL_SUCCESS` and `CRITICAL_FAILURE` are the two most likely outcomes of every symmetric
> opposed check in the game, at one in four apiece. "Critical" is the ladder's MODAL vocabulary, not
> its rare one.**

On TARGET checks it is worse and it is level-variant: `rb_vision`, `scramble`, `pocket_movement` and
`pursuit_angle` all sit at **45.0%** `CRITICAL_SUCCESS` on the flat league (rising to 61.0% at rating
99); `field_goal` at **61.0%**; `deflection_recovery` at **53.0%** (rising to 100% — it is backlog
entry 6's `DIE_CANNOT_LOSE` seen from the other side).

**This is the ladder's only genuine mis-scaling, it is global, and it is in the TOP rung rather than
the second one.** It has never been reported because every consumer to date has read the ladder
through a `minMargin` band table, where an open top row is exactly what is wanted.

## 3. DO THE TIERS MEAN THE SAME THING ACROSS CHECKS? — TWO REGIMES, NOT ONE, AND THEY ARE SHARP

**Answer 3 of the owner's three, with the governing structure named.** The tiers do NOT carry one
probability across the game, and the split is not per-check idiosyncrasy — it is **ROLL FORM**, and
there are exactly two:

| | OPPOSED (d100 − d100) | TARGET (d100 − constant) |
|---|---|---|
| margin distribution | **triangular**, peaked at the shift | **uniform**, 100 wide |
| bounded tiers, at even ratings | 11.700 / 9.050 / 3.900 / 1.000 / 3.900 / 9.050 / 11.700 | **15 / 10 / 4 / 1 / 4 / 10 / 15 — the tier's WIDTH, exactly** |
| what the shift moves | everything; the triangle slides | **only the two open rungs** |
| checks | **14 structures** | **17 structures** |

The TARGET row's invariance is exact and its domain is pinned: for any TARGET check whose shift lies
in **[−71, −30]**, all seven bounded tiers read their widths in percent, whatever the target and
whatever the stack. Both edges are tight — one step outside and the 100-wide window clips a tier
(`catch` at shift −83 clips `STRONG_SUCCESS` to 3.0%; `field_goal` at −10 clips four tiers to zero).

So the honest statement about the shared vocabulary:

> **A ladder TIER is a well-defined probability within a roll form and is not comparable across
> forms.** `STRONG_SUCCESS` means 11.7% of an opposed contest and 15.0% of a target check — a 28%
> relative difference that no reader of the tier name could infer. `TIE` alone means the same thing
> everywhere (1.000%), because it is the only rung one point wide.

And the corollary that matters more than the discrepancy: **the ladder is NOT globally mis-scaled in
the way the owner feared.** Both regimes put `STRONG_SUCCESS` in the 11–15% band, which is a
defensible reading of "strong". Answer 1 is refused on evidence.

## 4. IS §7.1 THE OUTLIER? — NO, AND THE THING THAT MAKES IT LOOK LIKE ONE IS NOT ITS SCALE

**Answer 2 is also refused.** `pass_rush_tick` on a POWER rush is one of **ten** opposed structures
whose stacks are term-symmetric, and it sits on the identical triangular distribution as
`break_tackle`, `breakaway`, `run_block`, `man_coverage`, `release_vs_press`, `yac_tackle`,
`gap_battle`, `tackle` and `blitz_pickup`. Its roll structure is the most ordinary in the engine.

Three checks put an open band row on the ladder's 15: `pass_rush_tick`, `break_tackle` and
`breakaway`. All three read 36.550%, and `scaleSurface.ts`'s `BOUNDARY_ON_FAT` flag already names
exactly those three. **§7.1 is not distinguished by its scale. It is distinguished by how many times
it fires** — ADR-049 §6c: 2.711 threats per dropback, ~4–5 matchups per tick over a mean 2.98 ticks.
`break_tackle` resolves about once per carry.

### 4a. `blockerStructuralAdvantage` and backlog entry 3 — the holding position is STALE

Entry 3 records *"the rusher carries two-to-three attribute terms against the blocker's two, so an
evenly-rated matchup favours the rush by ~15 points structurally."* **On today's tree that is no
longer true, in either limb.** ADR-028 gave the blocker `anchor` as a third real term and set
`blockerStructuralAdvantage` to 0, so at equal ratings:

| §7.1 branch | rusher terms | blocker terms | shift at R=60 | shift at R=99 | measured share of reps |
|---|---|---|---|---|---|
| POWER | 3 (`passRush`, `powerMove`, `strength`) | 3 | **0** | **0** | **49.923%** |
| SPEED | 2 (`passRush`, `firstStep`) | 3 | **−12** | −20 | **49.534%** (with FINESSE) |
| FINESSE | 2 (`passRush`, `finesseMove`) | 3 | **−12** | −20 | — |
| POWER after a stalemate | 3 + `counterMoveAfterStalemate` 15 | 3 | +15 | +15 | 0.289% |
| SPEED/FINESSE after a stalemate | 2 + 15 | 3 | +3 | +3 | 0.254% |

**The structural edge now runs the other way on half the reps**, and it is level-variant on exactly
those reps — a rated league would widen it to −20. The +15 the entry describes was the pre-ADR-028
constant, and the constant is gone.

The mixture is what produces ADR-049's number, and it is now derived rather than measured:

| §7.1 tier, as actually played (flat-60 mixture) | occupancy | at or above |
|---|---|---|
| `CRITICAL_SUCCESS` | 21.055% | **21.055%** |
| **`STRONG_SUCCESS`** | **10.816%** | **31.871%** |
| `SUCCESS` | 8.458% | 40.329% |
| `MARGINAL_SUCCESS` | 3.661% | 43.990% |
| `TIE` | 0.940% | 44.930% |
| `MARGINAL_FAILURE` | 3.759% | 48.689% |
| `FAILURE` | 9.362% | 58.051% |
| `STRONG_FAILURE` | 12.584% | 70.635% |
| `CRITICAL_FAILURE` | 29.365% | 100% |

Measured: **31.789%**, per-list `[31.787, 31.777, 31.850, 31.738]`, **SD across four independent seed
lists 0.047pp**. ADR-049 measured 31.909% (play scope) and 31.858% (corpus scope) on a different
seed list. The derivation predicts it to 0.08pp.

> **The tier the owner asked about — `STRONG_SUCCESS`, on §7.1's reps as they are actually rolled —
> occupies 10.816% of them. That is inside the owner's stated football window. The 31.9% is the
> band's floor picking up `CRITICAL_SUCCESS` as well.**

## 5. ⚠ THE GATE WENT RED ON ITS FIRST UNSTAGED RUN, AND THE FINDING IS REAL

Charter §22a: *a gate shipped without ever having been observed to fail is indistinguishable from a
vacuous one.* This one failed immediately, on `punt` and `kick_return`, at z = 91.7 and 99.7.

**Cause, and it is a coverage finding rather than a defect.** `game/specialTeams.ts` emits `punt` and
`kick_return` CHECKs through `distanceCheck`, which calls `tierFor` — **so two `CheckKind`s that
`scaleSurface.test.ts` pins as UNIMPLEMENTED do have producers and do read the ladder.** That pin is
about SCALE-DESCRIBABILITY, not about producers, and the difference is invisible until somebody
censuses tiers. ADR-039's "15 of 44 `CheckKind`s have no producer" should read **13 of 44**; the other
two have producers whose rolls are not target checks on the attribute scale.

The engine already declares the consequence, in its own file header, and this census is the first
measurement of it:

> *"`tier` on those three emissions is NOT meaningful and should be read as noise… a d20 deviation
> plus an attribute modifier cannot reach the outer rungs and cannot go negative."*

| emission | die | n | tiers reached |
|---|---|---|---|
| `punt` (gross) | d20 vs neutral die | 12,321 | **3 of 9** — `STRONG_SUCCESS` 40.18%, `SUCCESS` 49.77%, `MARGINAL_SUCCESS` 10.05% |
| `kick_return` (return) | d20 vs neutral die | 14,570 | **3 of 9** — 39.79% / 49.70% / 10.51% |

`kick_return` additionally reads the ladder as a REAL d100 target check (the touchback depth roll,
shift −43), so **one `CheckKind` carries two roll forms** — the same species of ambiguity `tackle`
has with its two band tables. The derivation gate is now scoped to d100 and asserts that the d20 set
is exactly the declared one, so a resolver that starts throwing a different die reddens it.

## 6. THE FALSIFICATION, AND WHY THE CORPUS IS NOT THE EVIDENCE

`tierOfMargin` restates `rolls.ts`'s `bandFor`, which the engine barrel deliberately does not export.
A restatement is a second source of truth, so it is checked rather than trusted: the engine publishes
BOTH `margin` and `tier` on every resolution, and the census compares them on every one.

**1,552,112 resolutions. 0 mismatches.**

The derivation was then compared against the observed histogram on every **(kind, die, shift)** cell
with n ≥ 2,000 — **50 cells, 450 tier comparisons, worst |z| = 3.37**, which is exactly what a max
over 450 standard normals should look like. The shift buckets were DISCOVERED from the stream by an
identity (`shift = margin − raw + opposedRaw`) rather than declared, so the four §7.1 buckets in §4a
are a measurement that was not looking for them.

**No occupancy in this ADR should be quoted from the corpus.** A derivation beats a sample and every
number above is exact; the corpus's contribution is the mixture weights in §4a, the falsification
here, and the red in §5.

## 7. DECLARED ABSTENTIONS (entry 45)

- **13 `CheckKind`s cannot be measured because nothing produces them** (`coverage_read`, `audible`,
  `route_break`, `option_route`, `qb_read`, `unseen_defender`, `hold_decision`, `dline_tip`,
  `communication`, `snap_jump`, `fumble`, `penalty_check`, `coin_toss`). Their ladder behaviour is
  not unknown-in-principle — `coverage_read`'s and `option_route`'s specified rolls are TARGET checks
  against 50 and would read the uniform row — but nothing is claimed for them, because a check with
  no producer has no occupancy.
- **`qb_read` would not read this ladder if implemented.** §8.3's roll is a d20 and is published as
  its own event type. A nine-rung d100 ladder is not defined on it, which is the same structural
  problem §5 found in special teams.
- **Nothing is claimed about a rated league beyond the level sweep.** The sweep varies BOTH sides
  together, so it prices the LEVEL and never the GAP. Every figure here is an even contest by
  construction; what an uneven contest does to a tier is a Mandate-1 question and needs a rated
  league that does not exist yet.
- **Trait bonuses are excluded**, and on `FLAT_SYNTHETIC` that is exact rather than an
  approximation — the flat league assigns no traits, so `quickTwitch`, `brickWall`, `shutdown` and
  the rest contribute identically zero. On a rated league they would move §7.1's shift by ±10 and
  put a fifth and sixth bucket in §4a's table.

## 8. WHAT WOULD MAKE EACH INSTRUMENT GO RED (entry 55)

| instrument | claim | what reddens it |
|---|---|---|
| free tier | the ladder is a contiguous nine-tier partition | a tier whose ceiling is not one below the tier above's floor |
| free tier | occupancies are a distribution | any check's nine tiers not summing to 1 within 1e-12 |
| free tier | the canonical rows | either inline snapshot moving — these are the numbers the ruling rests on |
| free tier | the per-check surface | a term added to any resolver's stack, which moves that check's shift |
| free tier | `levelInvariant` per check | a check crossing between the invariant and variant sets |
| free tier | the TARGET window is [−71, −30] | either edge moving, which means a ladder floor moved |
| census | the restated tier walk | ONE observation whose published `tier` ≠ `tierOfMargin(margin)` |
| census | the derivation predicts the engine | a d100 cell with n ≥ 2,000 more than 4 SE off the exact prediction |
| census | the d20 exclusion is the declared one | a d20 tier on a kind outside `DECLARED_NON_LADDER_EMISSIONS.kinds` |
| census | the seed lists are independent | two lists producing an identical seed digest |
| census | the corpus exercises §7.1 | fewer than 10,000 `pass_rush_tick` observations |

For the printed occupancies themselves: **nothing.** They are arithmetic, not gates.

## Proposal

**No contracts change. No tunable moved. `packages/engine` and `packages/contracts` untouched.**

Three things are settled and one ruling is returned to the owner unrecommended.

### Settled by measurement

1. **`STRONG_SUCCESS` is an 11.700% event on an even opposed contest and a 15.000% event on a target
   check.** The ladder mapping is NOT what produces 36%. The owner's *"a strong success on an even
   contest should not be a one-in-three event"* is satisfied by the tree as it stands — it never was
   one.
2. **The problem is not larger than §7.1 in the direction feared**, but a different global finding
   replaces it: the ladder's TOP rung is open and takes 24.850% of every symmetric opposed check and
   up to 71% of a target check. **Every consumer that reads the ladder as a nine-way classification
   rather than as a set of floors is reading a scale whose top tier name does not match its
   frequency.** Today all consumers read floors, so nothing is broken; a UI or narrative trigger that
   fired on "CRITICAL" would be.
3. **Two `CheckKind`s read the ladder and are absent from every scale table in this package**, and
   their tiers reach 3 of 9 rungs by construction. ADR-039's producer count is corrected from 15 to
   13.

### Returned to the owner, unrecommended

**§7.1's `minMargin` is a BAND FLOOR, and the ladder offers exactly two candidates for it.** The
owner's own framing — *"whether threat creation should require the tier above it"* — is now a choice
between two numbers and no others, because the ladder has no rung between 15 and 30:

| band floor | which ladder rung | per-rep rate, §7.1 mixture as played | ADR-049's threats/dropback, scaled |
|---|---|---|---|
| **15** (committed) | `STRONG_SUCCESS` floor | **31.871%** | 2.711 |
| **30** | `CRITICAL_SUCCESS` floor | **21.055%** | ~1.79 |

⚠ The right-hand column is **arithmetic on ADR-049's rep count, not a prediction.** ADR-049 §8 records
that `travelSecondsFor` reads the same boundary as its dominance zero, so moving it also moves the
shave; and §2 records that the pressure rate is over-determined, so a supply change is absorbed by
`BLOCKER_BEATEN`'s `PRESSURE` row on the committed tree. **A threshold move must be swept, not
inferred from this table.**

No threshold is recommended. The football question is unchanged and is now correctly posed: *is
"past his blocker and travelling" a `STRONG_SUCCESS`, or is it a `CRITICAL_SUCCESS`?* — and the
ladder itself has been cleared of producing the 36%.

## Impact

`packages/calibration` only. One new source module, one free-tier test file (three snapshots), one
env-gated Tier 3 test file. No product code, no engine change, no contracts change.

Follow-ups for the queue, not done here:

- **`scaleSurface.ts`'s `pass_rush_tick` row describes the POWER branch only** and its `pEven`
  therefore over-states §7.1's even-contest rate by 4.7pp against the played mixture. The variants
  are now declared in `ladderOccupancy.ts` and confirmed by census; folding them back into `SURFACE`
  would let `BOUNDARY_ON_FAT` price the check as it is played.
- **Backlog entry 3's `blockerStructuralAdvantage` note is stale** (§4a) and should be re-written
  against the post-ADR-028 tree before anyone reasons from it again.
- **ADR-039's "15 of 44" should read "13 of 44"** (§5).

## Decision

_Pending owner + Orchestrator._
