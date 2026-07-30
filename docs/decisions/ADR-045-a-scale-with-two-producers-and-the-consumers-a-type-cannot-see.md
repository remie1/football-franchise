# ADR-045: A scale with two producers, and the consumers a type cannot see

- **Date:** 2026-07-29
- **Proposed by:** `match-engine`
- **Status:** IMPLEMENTED (phases 1–3 complete, `pnpm typecheck` and `pnpm test` green from the root)
  with **two items brought rather than absorbed** — §5.1 and §5.2 — and **one refusal recorded as a
  result** — §4.1.
- **Supersedes nothing. Discharges:** ADR-039 SA-08 (re-ruled), ADR-043's decision request,
  §9.3's *"Engine change owed"*, and §9.4's one-band question.

> **HOW TO READ THIS ADR.** The owner fixed a strict phase order — enumerate and pin, then move the
> values, then price the consequences — precisely so that the pins would **predate** the values and
> could therefore be evidence about them. Every measurement below is therefore **labelled with the
> phase it belongs to**, and the labels are load-bearing: a §3 number is only meaningful because the
> §1 pin that produced it was written and run green before any value moved.

---

## 0. What this is

SA-08 said §9.3's separation words and §8.4's openness numbers disagreed. It was recorded as a
four-cell change to one table. It landed as a **thirteen-cell scale correction across two tables**,
with a compiler pin re-ruled and a threshold carried with its anchor, because:

1. **The cell list was not arithmetically satisfiable** (ADR-043; the owner re-ruled it).
2. **§9.4 produces the same scale, and no type can see that it does** — its bands are stated in
   §8.4's *words*.

Item 2 is the finding worth keeping. Everything else is bookkeeping.

---

## 1. PHASE 1 — ENUMERATE AND PIN. *(No value moved in this phase.)*

### 1.1 The opaque-type fixpoint, re-run over the enlarged surface

Method: Charter §4.1 / ADR-043. Make the quantity an opaque type at its **producers**, let `tsc` walk
the transitive closure, and read each round's terminal errors as the consumer list.

The surface is bigger than ADR-043's, so the previous enumeration does **not** carry over. Producers
opaqued: `manCoverage.bands[].openness` (§9.3), `zoneCoverage.bands[].openness` **and**
`zoneCoverage.uncoveredOpenness` (§9.4).

**Thirteen rounds to a fixpoint over `src`.** Transcript, by round:

| round | what `tsc` surfaced | classification |
|---|---|---|
| 1 | `ManCoverageOutcome.openness`, `ZoneCoverageOutcome.openness`, `ReceiverTrack.baseOpenness` | carriers |
| 2 | `opennessAt`, `settledOpennessAt` (§8.7/§9.4 decay) | carriers |
| 3 | `decayedOpenness` | carrier + **laundering site** (§1.3) |
| 4 | `currentOpenness`, `readOpenness` | carriers |
| 5 | `ReceiverTrack.lastOpenness`, `.scrambleBaseOpenness`, `scrambleOpennessAt` | carriers |
| 6 | `resolveQbRead`'s openness parameter, `laneDefenderEligible`, `catchTypeFor` | carriers |
| 7 | **`QbReadOutcome.{actual,perceived,effective}Openness`** | **the laundering site that mattered** |
| 8–9 | `ReceiverTrack.lastRead`, `takeRead`, `TargetCandidate.effectiveOpenness` | carriers |
| 10–12 | `bestOf`, `ThrowArgs.effectiveOpenness`, `selectThrowType` | carriers |
| 13 | — | fixpoint |

**The laundering site is the reason a careful list would have failed.** `resolveQbRead` takes an
openness and returns three plain `number`s. Everything downstream of it — the throw thresholds, the
checkdown floor, §8.5's ordering, §10.2's throw-type selection — reads a quantity whose type has
already been erased. Tightening that one return type is what surfaced **four of the seven threshold
consumers**. There is nothing to read at a laundering site; the type is already gone.

### 1.2 The terminals — the threshold consumers, pinned

Seven, plus three event-boundary terminals. Not asserted to be complete; the method **bounds** the
class, it does not eliminate it, and it closes over one package only.

| tunables path | comparison | site |
|---|---|---|
| `qb.throwThreshold` (+ `readSystem.*.throwThresholdDelta`) | `best >= T` | `sim/passPlay.ts`, in-rhythm throw |
| `qb.checkdown.threshold` | `effective >= T` | `sim/passPlay.ts`, the outlet enters §8.5's pool |
| `qb.desperationThreshold` | `best >= T` | `sim/passPlay.ts`, forced decision |
| `qb.window.tightWindowThreshold` | `perceived < T` | `resolve/qbRead.ts`, §8.4 compensation |
| `throwExec.typeSelection.tightWindowMaxOpenness` | `effective <= T` | `resolve/throwExecution.ts`, §10.2 |
| `throwExec.lane.contestOpennessMax` | `actual <= T` | §10.3 lane contest, **both arms** |
| `catching.contestedMaxOpenness` | `actual <= T` | `resolve/catchResolution.ts`, §11.1 |

Plus **`targetSelection`'s ordering** — `sort((a,b) => b.effectiveOpenness - a.effectiveOpenness)` —
which is not a threshold and is the only site that puts **both producers' outputs in one list**.

Event-boundary terminals (the method stops here by construction): `ROUTE_STATUS.openness`,
`QB_READ.{actual,perceived,effective}Openness`, `CATCH_RESOLUTION.openness`.

All of the above are pinned in **`packages/engine/test/opennessScaleConsumers.test.ts`**, by a
recorded producers × consumers matrix, read **by dotted path** so a renamed cell throws rather than
leaving a stale literal green.

### 1.3 Two laundering sites that are also §4.1 sorting sentinels — REPORTED, NOT FIXED

The fixpoint incidentally surfaced two `?? 0` defaults on an **ordered** scale, which Charter §4.1
forbids: *the supplied value must be unreachable on that scale, or the expression must throw.* `0` is
**reachable** — it is §8.4's `no window` floor.

- `sim/passPlay.ts` `decayedOpenness`: `track.baseOpenness ?? 0`
- `sim/passPlay.ts` `readCandidates`: `t.lastRead?.effective ?? 0`

Both are **unreachable today** — every caller narrows the `undefined` away first — so this is a latent
instance, not a live defect, and it is the *worst* rung rather than the best (unlike ADR-032's
`severityOf(status) ?? 0`, which supplied the **cleanest** pocket). Reported here rather than fixed:
a behaviour-neutral refactor of `sim/passPlay.ts` is not part of a scale correction, and folding it in
would make this dispatch's diff unreviewable. **Backlog item, with the §4.1 rule already stated
against it.**

### 1.4 The reading pass — the half no instrument can do

**This is the finding, not a caveat.** A type cannot see a **label** consumer, and §9.4 states its
bands in §8.4's *words*. A fixpoint over §9.3 alone returns a complete-looking numeric answer and is
**blind exactly where a scale correction originates**, because a scale correction is almost always a
label re-pointing.

Read forwards through §8.4 → §9.3 → §9.4 → §10.2 → §10.3 → §11.1:

| §9.4 row | §9.4's own words | §8.4 band those words name | held value | verdict |
|---|---|---|---|---|
| `SOFT_SPOT` | "found soft spot, **wide open**" | wide open (70+) | 85 | inside its band, but **on the wrong mapping** |
| `WINDOW` | "window exists, **open**" | open (50-69) | **70** | **MISLABELLED — 70 is §8.4's wide-open FLOOR** |
| `TIGHT_WINDOW` | "**tight window**" | tight window (30-49) | 45 | inside its band, wrong mapping |
| `DEFENDER_IN_LANE` | "defender in passing lane" | **names no §8.4 band** | 20 | inside `covered`; mapping does not reach it |
| `uncoveredOpenness` | (§9.4 step 2, not a row) | — | 90 | not label-mismatched |

The `WINDOW` row is **SA-08's own defect, one table over**. No numeric method could have found it:
nothing in `zoneCoverage.bands` says "open".

**This pass has no instrument and must be redone whenever §8.4, §9.3 or §9.4 changes.** It belongs on
the Charter register's *no path to elimination* line.

#### 1.4a Two more label defects the same pass found — in §17's own example printout. REPORTED, NOT EDITED.

`docs/design/match-engine.md` §17.1's worked example carries the identical defect twice, and it was
**already** inconsistent with the table before this ADR:

- **line 2155-2156** — *"CB wins by 4 → **CB IN PHASE**"* then *"Actual Openness: **32** (tight
  window)"*. `CB_IN_PHASE` has held **25** for the life of the table (32 was `EVEN_BRACKET`), and
  §8.4 puts 25 in `covered`, not `tight window`. Two errors in one line.
- **line 2165-2166** — *"SUCCESS by **19** → **Found soft spot**"* then *"Actual Openness: **71**
  (open)"*. §9.4's own bands put a margin of 19 in `WINDOW` (10-19), not `SOFT_SPOT` (20+); and
  **71 labelled "open" is `zoneCoverage.bands.1`'s exact defect**, in the doc's own illustration of
  it.

Not edited: §17 is the debug-output spec's illustration rather than a mechanic section, and Charter
§4.1's rule is to **report the mismatch and implement the behaviour** — the behaviour is already
right. Correcting an example is an Orchestrator edit, exactly as ADR-040 §2.1 recorded for §10.3's
`+15`.

### 1.5 The audit — every pin run against a case it should fail on

Charter §4.1: *an instrument with no failing case is not yet an instrument; it is a claim.* Six cases,
each applied, run, and reverted; the tree was verified clean after each.

| # | injected defect | result |
|---|---|---|
| A | `qb.desperationThreshold` 25 → 20 (a **threshold** moves) | matrix red — 1 test |
| B | `manCoverage.bands.2.openness` 55 → 45 (a **producer** moves) | matrix + rank order red — 2 tests |
| C | `EVEN_BRACKET` relabelled `DEAD_EVEN`, **row count unchanged** | matrix + rank order red — 2 tests |
| D | `qb.checkdown.threshold` → `qb.checkdown.floor` (cell **renamed away**) | path pin throws: *"qb.checkdown.threshold is not a path into TUNABLES"* |
| E | `zoneCoverage.bands.1.openness` 70 → 60 | matrix + rank order red — 2 tests |
| F | `tightWindowMaxOpenness` 50 → 45 (the **compile-time tie**) | `TS2322` ×2 — *"Type '45' is not assignable to type '50'"* |

**Case C is the one worth keeping.** ADR-041: *a cardinality cannot see a swap.* The matrix carries
each row's **label and value**, not a count, so a net-zero substitution reddens it.

Case F pins the two spellings of the tight-window boundary — `qb.window.tightWindowThreshold` and
`throwExec.typeSelection.tightWindowMaxOpenness` — which ADR-039 SA-09 recorded as untied. They are
now tied **by mutual assignability of two literal types**, not by a runtime `expect(50).toBe(50)`,
which on an `as const` tree is the tautology §4.1 requires to fail to compile.

### 1.6 Phase 1 gate

`pnpm typecheck` clean; `@ff/engine` **45 files / 766 tests green**, with the new pin file green
against the **pre-correction** table. **No value moved.**

---

## 2. PHASE 2 — THE VALUES, ALL OF THEM, IN ONE CHANGE

> *A scale used by two producers cannot be corrected for one — and that prohibition applies within
> this change as much as to it.* Thirteen cells, one commit.

### 2.1 §9.3 — the owner's ruled column

| row | was | now | §8.4 band its label names |
|---|---|---|---|
| `SEPARATION_5_PLUS` | 85 | **70** | wide open — the floor |
| `SEPARATION_3_4` | 70 | **52** | open |
| `SEPARATION_1_2` | 55 | **38** | tight window — mid |
| `SEPARATION_HALF_YARD` | 40 | **30** | tight window — floor |
| `EVEN_BRACKET` | 32 | **25** | covered |
| `CB_IN_PHASE` | 25 | 25 | **HELD** |
| `CB_ON_HIP` | 15 | 15 | **HELD** |
| `CB_IN_POSITION` | 6 | 6 | **HELD** |

Monotone by construction; every ruled value inside the band its label names.

### 2.2 §9.4 — re-pointed onto the same mapping

| row | words | was | now |
|---|---|---|---|
| `SOFT_SPOT` | "wide open" | 85 | **70** |
| `WINDOW` | "open" | **70** | **52** ← the mislabelled cell |
| `TIGHT_WINDOW` | "tight window" | 45 | **38** |
| `DEFENDER_IN_LANE` | names no §8.4 band | 20 | 20 **HELD** |
| `uncoveredOpenness` | not a §9.4 row | 90 | 90 **HELD** |

**The one place the mapping was not forced one-to-one, stated plainly:** §9.3 has *two* tight-window
values (38 mid, 30 floor) because it has a distinct **boundary case** — half a yard. §9.4 has one
generic "tight window" and no boundary counterpart, so it takes **38**, the mapping's tight-window
value. It is a label re-pointing and invents no number; 34 (interpolating to preserve §9.4's old
position *between* §9.3's two rows) was rejected as exactly the invention ADR-039 SA-01 recorded.

**What did not change: zone's shape versus man's.** Zone's good outcomes were never numerically
better than man's — rows 0 and 1 were already **equal** (85/85, 70/70). Zone's advantage is in the
**margin required** (+20 for a soft spot vs +30 for five yards). That equality is preserved exactly:
70/70 and 52/52. The tunables comment claiming zone's outcomes are "BETTER" was **already wrong** and
is corrected.

### 2.3 ⚠ BROUGHT, NOT ABSORBED — the tie the ruled column creates

`EVEN_BRACKET` lands on **25**, and `CB_IN_PHASE` is **held at 25**. The column is therefore
`70 / 52 / 38 / 30 / 25 / 25 / 15 / 6`: **non-strictly** monotone. The band gate fires on a column
that *both rises and falls*, so a tie is green.

**As football it is not obviously right.** ADR-043's argument was that *a receiver dead even with his
man cannot be **less** open than one whose corner has won the rep and is in phase* — equality
satisfies "not less", but a dead-even rep arguably ought to be **more** open than a beaten one. The
ruled column names five rows; rows 5-7 were not ruled. **Nothing is picked here to tidy the column** —
choosing a value for `CB_IN_PHASE` to restore strictness is precisely the invention this correction
exists to remove. **Recorded, unresolved, for the owner.**

### 2.4 §11.1's threshold — the anchor moved, so the judgement was owed again

`catching.contestedMaxOpenness`: **40 → 30**.

This was **forced, not chosen**. ADR-040 §3.1 pinned it to `SEPARATION_HALF_YARD`'s openness *by type
equality*, with a second assertion on the anchor's own identity (`= 40`) added specifically because
*a compiler pin anchored to a symbol inherits that symbol's definition*. Moving the row made
`pnpm typecheck` **red**, exactly as designed. ADR-040 §3's argument, re-run against the re-pointed
table per that test's own three steps:

| §9.3 row | separation | openness | within one yard? |
|---|---|---|---|
| `EVEN_BRACKET` | 0 yards | 25 | yes, beyond argument |
| `SEPARATION_HALF_YARD` | ½ yard | **30** | yes, beyond argument |
| `SEPARATION_1_2` | 1-2 yards | 38 | **STRADDLES** |

**Same row, new value.** And the alternative ADR-040 §3 explicitly left open — *"the `SEPARATION_1_2`
row was rejected only because SA-08 was then unruled"* — got **weaker**, not stronger: that rejection
rested on §9.3's parenthetical **"(contested)"**, and SA-08's amendment **deletes that word from §9.3
entirely**, reserving it for §11.1. The only ground for pulling the row in was removed by the same
ruling that moved the anchor.

**⚠ THE RECLASSIFICATION IS NIL, AND THAT IS THE EVIDENCE THIS IS A DERIVATION AND NOT A
COMPENSATION.** The five rows contested at 40 against the old column — half yard, dead even, and all
three CB-wins rows — are **exactly** the five contested at 30 against the new one, and
`SEPARATION_1_2` is routine on both. A number chosen to hold an outcome in place would have been
chosen against a *different* set of rows.

### 2.5 What was NOT touched, and would have been compensation debt if it had been

`qb.throwThreshold` (50), `qb.checkdown.threshold` (30), `qb.desperationThreshold` (25),
`qb.window.tightWindowThreshold` (50), `throwExec.typeSelection.tightWindowMaxOpenness` (50),
`throwExec.lane.contestOpennessMax` (60), `route.opennessGainPerTick` (8), and every per-system
`throwThresholdDelta`. **Not one was moved.** If any of them needs to move now that the scale is
correct, that is a separate petition with its own football argument.

### 2.6 Collateral repairs, each a §4.1 defect the correction exposed

Four tests went red. **None was satisfied by editing a literal to match:**

1. `throwCatch.test.ts` "classifies contested vs. routine" probed `15 / 40 / 41` — **restated
   constants**, a second copy of `contestedMaxOpenness`. Rewritten as `max−15 / max / max+1`, which
   is what the case always claimed: inclusive at the boundary, exclusive one point above.
2. `passPlay.test.ts` "SA-14's reach is countable" filtered `openness > 30 && <= 40` — SA-14's own
   before/after interval, restated. Replaced with **the general property it was a case of**, derived
   from the live threshold and the next §9.3 row above it: the population any next threshold move
   would reclassify.
3. `game.test.ts` overtime seed `ot-95` → **`ot-124`**. The file's own protocol: a seed chosen by
   scanning for a whole-game outcome is not a property of the overtime branch and is re-found whenever
   a resolution changes (sixth such re-scan). **2,353 seeds scanned; 40 overtimes, 3 ties.** The tie
   seed `ot-891` survived and was **re-scanned, not assumed**.
4. `tippedBall.test.ts`'s 24-game corpus fence, re-baselined (§3.3), and its "all 163" title —
   already stale at 164 since ADR-040 — de-numbered. A restated constant *in prose*, which nothing
   checks (Charter §4.1's ADR-044 corollary).

---

## 3. PHASE 3 — PRICING THE MECHANIC CONSEQUENCES, SEPARATELY

The QB-reluctance shift and any change in *who gets the ball* are **consequences to be priced, not
part of the fix**. Nothing below was acted on.

### 3.1 Structural pricing — the phase-1 matrix, diffed

This is the half that is exact, and it is evidence **only because the matrix was recorded before the
values moved**. Six lines of thirteen changed:

| producer row | permission gained | permission lost |
|---|---|---|
| `§9.3 SEPARATION_3_4` | — | **now lane-contestable** (52 ≤ 60) |
| `§9.3 SEPARATION_1_2` | — | **no longer an in-rhythm throw**; **now a tight window**; **now forced BULLET**; **now lane-contestable** |
| `§9.3 SEPARATION_HALF_YARD` | — | **now a CONTESTED catch** |
| `§9.3 EVEN_BRACKET` | — | **no longer clears the checkdown floor** |
| `§9.4 WINDOW` | — | **now lane-contestable** |
| `§9.4 TIGHT_WINDOW` | — | **now forced BULLET** |

**The single largest structural consequence: `SEPARATION_1_2` — one to two yards of separation — stops
being a ball the quarterback turns loose in rhythm.** That is the correction working as football (one
to two yards *is* a tight window), and it is the mechanism behind every population number below.

**And the incoherence is gone.** Before: `man 85/70/55` against `zone 85/70/45` — the two producers
disagreed on the tight-window band, so `selectTarget` ranked a zone tight window *below* a man one at
the same football. After: `70/70`, `52/52`, `38/38`.

### 3.2 Population pricing — 12 games, identical seeds, identical fixture

`metrics-0…metrics-11`, the engine's own corpus, measured before and after the value move.

| metric | before | after | Δ | ≈σ |
|---|---|---|---|---|
| mean **actual** openness per read | 45.62 | **38.79** | **−6.83** | deterministic |
| mean **effective** openness per read | 49.33 | **43.32** | **−6.01** | deterministic |
| reads inside a tight window | 55.35% | **63.83%** | **+8.48pp** | **≈6.0σ** |
| HOLD decisions | 1,489 | 1,519 | +30 (+2.0%) | — |
| SCRAMBLE | 30.72% of dropbacks | 31.76% | +1.04pp | 0.7σ |
| CHECKDOWN | 37.50% of attempts | 38.36% | +0.86pp | 0.5σ |
| **sacks** | 13.04% of dropbacks | **12.93%** | **−0.11pp** | 0.1σ |
| **throwaways** | 2.32% of dropbacks | **2.22%** | **−0.10pp** | ~0.1σ |
| completion % | 49.19% | 48.86% | −0.33pp | 0.2σ |
| INT % of attempts | 7.12% | 7.00% | −0.12pp | 0.1σ |
| contested share of catches | 19.96% | 19.73% | −0.23pp | 0.1σ |
| BULLET share of throws | 97.85% | 98.25% | +0.40pp | — |
| yards per attempt | 4.69 | 4.65 | −0.04 | — |
| mean tick at release | 1.112 | 1.127 | +0.015 | — |

**⚠ READ THE σ COLUMN BEFORE THE Δ COLUMN.** At n ≈ 744 attempts / 1,035 dropbacks, only **two** rows
are resolved: the openness shift (deterministic — it *is* the correction) and the tight-window read
share. **Every behavioural rate moved by less than a quarter of its standard error.** That is **not**
evidence of no effect; it is *not measured at this n*. §5.3's live-population rule applies, and the
population pricing belongs to calibration's batch harness, not to a 12-game engine fixture.

### 3.3 The 24-game tipped-ball corpus, re-baselined

| digit | ADR-035/036 | ADR-040 | **ADR-045** |
|---|---|---|---|
| plays | 3,420 | 3,421 | **3,420** |
| yards | 20,047 | 21,107 | **20,953** |
| turnovers | 107 | 113 | **109** |
| points | 1,545 | 1,683 | **1,655** |
| tips | 271 | 270 | **273** |
| dead tips | 163 | 164 | **166** |
| live tips | 108 | 106 | **107** |

**The structural half did not move, and that is a measurement rather than an aside.**
`deadEligible`, `deadRecoveryChecks`, `deadCarryingTheKey`, `deadClaimingRecoverable` and
`liveMissingTheKey` all still read **0**, and `liveTargets` still reads §12.2's five real thresholds
— across a stream where every football digit changed. ADR-036's claim was that those are properties
of the **type** and not of the corpus; this is the second independent corpus-wide change to confirm it.

### 3.4 The prediction that did not come true, stated because it was the reason for the phase order

§9.3's scope block predicted the quarterback would become **materially more reluctant to throw —
longer holds, more sacks, more throwaways**. Holds did rise (+2.0%). **Sacks and throwaways both went
very slightly DOWN**, and every one of those moves is inside noise.

The mechanism, offered as a hypothesis and **not acted on**: §8.7's route development adds
`route.opennessGainPerTick = 8` per half-tick for the first three seconds regardless of coverage, so a
15–18 point drop in *base* openness is recovered in roughly two ticks of route development. **The
correction is substantially eroded by a gain term that does not know what the coverage did.** That is
a real observation about §8.7 and it is **not this dispatch's to act on** — it would be a mechanic
change riding inside a labelling fix, which is the pattern being refused.

---

## 4. RESULTS THAT ARE REFUSALS

### 4.1 ⛔ THE SCALE CHANGE AND ONE THRESHOLD CONSUMER ARE **NOT SEPARABLE**. REPORTED AS A RESULT.

`catching.contestedMaxOpenness` is pinned to `SEPARATION_HALF_YARD.openness` **by type equality**
(ADR-040 §3, assertion 1). Moving the row makes the package **fail to compile** until the threshold
moves with it. **There is no landing of §9.3's column that leaves §11.1's threshold alone.**

The requirement was that a threshold needing to move is a separate petition with its own football
argument. Here is the distinction that decided it, stated so it can be overruled:

- **`contestedMaxOpenness` is not an independent knob.** ADR-040 §3.1 defines it as *"the half-yard
  row's own openness"*. When the anchor moves, the derived value following it is the derivation
  working, not a threshold being tuned.
- **The football argument was re-run in full and is written up** at §2.4 and in the tunables block —
  which is what the pin's own instructions demand, and the reason it is a ruling rather than a
  transcription.
- **It reclassifies nothing** (§2.4), so it cannot be compensation debt: compensation is a number
  chosen to hold an outcome in place, and holding the outcome in place here required *no* choice.

**What is still owed to the owner:** the anchor-identity assertion `AdrO40RuledHalfYardOpenness` has
been re-ruled from `40` to `30` by this ADR. That is a **ratification item**, not an implementation
detail. If the owner instead wants §11.1's "within one yard" to name `SEPARATION_1_2` (38), one
literal and one paragraph change and nothing else does.

### 4.2 ⛔ `packages/calibration`'s SA-08 register is now **STALE**. Reported, not touched.

`packages/calibration/src/knownTruth/docConformance.ts` still carries, for four cells:

- **"⏳ SA-08 RULED, OWED"** and *"THE ENGINE MAPPING CHANGE IS NOT IMPLEMENTED"* — **now false**;
- the **first, unsatisfiable ruling**: *"`1-9 → covered (15-29)`, `tie → covered, low end`"* — which
  ADR-043 refuted and the owner re-ruled to `30` (tight-window floor) and `25`;
- on `manCoverage.bands.3`: *"the two findings cannot be priced separately, and the compiler will NOT
  complain, because the equality is preserved while the football moves."* **The second half is wrong
  in a way that matters** — the compiler *did* complain, because ADR-040 §3.1's second assertion
  exists precisely to make it. The first half is right and is §4.1 above.

Charter §4.1's rule is that an implementer who finds prose contradicting behaviour **reports the
mismatch and implements the behaviour**. I own `packages/engine`; this is calibration's to correct,
and the register's own tests pass either way, so nothing will surface it but this paragraph.

---

## 5. BROUGHT RATHER THAN ABSORBED

### 5.1 The `EVEN_BRACKET` / `CB_IN_PHASE` tie at 25 (§2.3)

ADR-043's decision request #1 — *do rows 5-7 move, and to what?* — was not answered by the re-ruling,
and the corrected column makes a **dead-even rep exactly as open as one where the corner has won the
rep**. Green under the gate; unresolved as football. **No value was picked to tidy it.**

### 5.2 §8.7's coverage-blind development gain (§3.4)

`route.opennessGainPerTick = 8` applies identically whatever the coverage rep produced, which erodes
most of a 15–18 point base correction within two ticks. This is why the predicted reluctance shift did
not materialise. It is a **mechanic** question, it is large, and it is **not part of a labelling fix**.

### 5.3 The two `?? 0` sorting sentinels (§1.3)

Latent, not live. §4.1's rule already applies to them.

---

## 6. What a future implementer must actually do

1. **Re-run the fixpoint** (§1.1) whenever this scale moves. Its silence means *not observed*.
2. **Re-do the reading pass** (§1.4) whenever §8.4, §9.3 or §9.4 changes. **There is no instrument and
   there cannot be one.**
3. **Re-run every failing case** in §1.5 when the pins' subject changes — reading an instrument tells
   you what it claims to check; only failing it tells you what it does.
4. Do not satisfy a red pin by editing its literal. Every red in §2.6 had a derivation waiting behind
   it.

---

## 7. Verification

- `pnpm typecheck` (root, all 8 packages incl. every `test/`) — clean.
- `pnpm test` (root) — contracts 12, playbook 1,267, **engine 768**, calibration 473 (+34 skipped).
  All green.
- Determinism: `test/determinism.test.ts`, `test/gameDeterminism.test.ts` and
  `test/tunablesThreading.test.ts`'s byte-identical whole-game replay all green under the new tree.
- Band-table monotonicity gate (`FF_BAND_GATE=1`) re-run, because **its subject is exactly what this
  ADR moved** — see §8.
- Files touched: `packages/engine/src/tunables.ts`,
  `packages/engine/test/opennessScaleConsumers.test.ts` (new),
  `packages/engine/test/{throwCatch,passPlay,game,tippedBall}.test.ts`,
  `docs/design/match-engine.md` §9.3/§9.4.
- `packages/contracts` and `packages/calibration` **untouched**.

---

## 8. The band-table monotonicity gate, re-run because its SUBJECT moved

Charter §4.1's standing practice #2: *re-run an instrument when its subject changes, not only when
the instrument does — a green instrument over a changed subject is the configuration all three known
instrument failures shared.* Both openness columns are that subject, so `FF_BAND_GATE=1` was run
rather than assumed. It is a **tier-3** instrument: nothing in CI can tell whether a human typed the
variable, so this paragraph is the only evidence it happened.

```
corpus: 160 games · 30,400 plays · 904,018 events
stream digest fnv2:b1765fa349633ab7 · tunables digest fnv1a:79dce2b6 · seeds fnv1a:60f21076#160
26 band tables · 119 rows · 248 effect cells · 52 orderable columns
97 corpus runs · 943.5 s wall clock
VERDICT: GREEN
```

**What it says about this change specifically.** The gate checks all 52 orderable columns for
inversion and then derives liveness only for the ones that invert — *"10 columns invert before
exemption; the derivation was scoped to their 51 cells"*. **Neither `manCoverage.bands.openness` nor
`zoneCoverage.bands.openness` is among the ten.** Both corrected columns are monotone, and the
`EVEN_BRACKET`/`CB_IN_PHASE` tie at 25 (§2.3) produces neither a rise nor a fall, exactly as
predicted — so the tie is **green by the gate's own definition and still unresolved as football**.
Those two facts are not in tension and both are recorded on purpose.

The surviving adjudicated inversions (`ballCarrier.contests.*`), the two declared abstentions
(`tippedBall.qualityBands` `GIFT`/`FLOATER`) and the one `UNREACHED_ROW` are **unchanged from ADR-037**
— this dispatch neither created nor cleared any of them.
