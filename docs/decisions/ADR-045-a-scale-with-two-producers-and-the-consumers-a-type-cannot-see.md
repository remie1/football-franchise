# ADR-045: A scale with two producers, and the consumers a type cannot see

- **Date:** 2026-07-29
- **Amended:** 2026-07-29 — **§2.3's brought item is RULED and landed** (see §2.3a), and §4.1's
  ratification item is **RATIFIED** (see §4.1a). Amended in place rather than filed as a new ADR,
  because this is §2.3 being *resolved* rather than a new question.
- **Proposed by:** `match-engine`
- **Status:** IMPLEMENTED (phases 1–3 complete, `pnpm typecheck` and `pnpm test` green from the root)
  with **one item still brought rather than absorbed** — §5.2, now filed as **ADR-046** — and **one
  refusal recorded as a result** — §4.1, now ratified.
- **Supersedes nothing. Discharges:** ADR-039 SA-08 (re-ruled), ADR-043's decision request
  (**both halves, as of §2.3a**), §9.3's *"Engine change owed"*, and §9.4's one-band question.

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

**AMENDMENT, same day.** It landed with a **fourteenth cell owed** — the `EVEN_BRACKET`/`CB_IN_PHASE`
tie at 25, which §2.3 **brought rather than tidied**. The owner ruled it (`CB_IN_PHASE` → **22**), and
the ruling produced a second finding of the same species as item 2: **the property the owner ruled on
had no instrument at all.** Three separate instruments were pointed at that column and **not one of
them could fail on a tie** (§2.3b). It is item 2's shape again — *a scale's real content sitting where
the tooling structurally cannot look* — arriving from a different direction, which is why this is an
amendment and not a footnote.

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

**Still not edited as of §2.3a, and note that the first of the two is now WORSE.** §17.1 line 2155-56
reads *"CB wins by 4 → CB IN PHASE"* then *"Actual Openness: 32 (tight window)"*. `CB_IN_PHASE` was 25
when that was written up; it is **22** now, so the printed 32 is off by ten rather than seven, and
still labelled with a band it was never in. The example did not become wrong here — **it was already
wrong before this ADR chain started** — but it drifts further every time the column is ruled on, which
is the argument for correcting it rather than leaving it.

#### 1.4b A THIRD doc defect, introduced by the SA-08 amendment itself. REPORTED, NOT EDITED.

`docs/design/match-engine.md` §9.3's code block now lists **rows 6–8 twice**: once in the amended
numbered column (lines 1042-1044, *"CB wins by 1-9: CB in phase → 22 COVERED"*) and again immediately
below in the pre-amendment prose form (lines 1045-1047, *"CB wins by 1-9: CB in phase, trail
position"*). The old three lines were left standing when the new three were added.

**No behaviour is at stake and the two are not in conflict** — the prose rows carry no numbers, so
there is nothing for them to disagree with. But a duplicated row list is exactly the surface on which
a future ruling gets applied to one copy and not the other, which is `CALIBRATION-BACKLOG.md`'s
newly-added third shape (*a register that records a ruling drifts like a pin that enforces one*)
appearing inside the design doc. `docs/design/` is the Orchestrator's; reported here.

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

### 1.5a THE AUDIT, RE-RUN BECAUSE THE PINS' SUBJECT MOVED (§2.3a)

Charter §4.1 and §6 item 3: *re-run every failing case when the pins' subject changes — reading an
instrument tells you what it claims to check; only failing it tells you what it does.* §9.3's column
is exactly that subject, so the six cases were **re-run, not assumed**, re-pointed at the current
table where the old literals no longer exist, and **three more were added** for the surface §2.3a
created. Each applied, run, reverted; the three source files were **hashed before and after every
case** and the tree verified byte-identical each time.

| # | injected defect | result |
|---|---|---|
| A | `qb.desperationThreshold` 25 → 20 (a **threshold** moves) | matrix red — 1 test |
| B | `manCoverage.bands.2.openness` **38 → 45** (a **producer** moves; re-pointed from the old 55 → 45) | matrix + band-agreement + rank order red — 3 tests |
| C | `EVEN_BRACKET` relabelled `DEAD_EVEN`, **row count unchanged** | matrix + band-words + rank order red — **3 tests** (ADR-041's swap; it was 2 before §2.3c added rows, and the band-words case now throws *"no producer row §9.3 EVEN_BRACKET"*) |
| D | `qb.checkdown.threshold` → `qb.checkdown.floor` (cell **renamed away**) | path pin throws: *"qb.checkdown.threshold is not a path into TUNABLES"* — 2 tests |
| E | `zoneCoverage.bands.1.openness` **52 → 60** (re-pointed from 70 → 60) | matrix + band-agreement + rank order red — 3 tests |
| F | `tightWindowMaxOpenness` 50 → 45 (the **compile-time tie**) | `TS2322` ×2 — *"Type '45' is not assignable to type '50'"* |
| **G** | **`CB_IN_PHASE` put BACK to 25 — the ruled tie itself** | matrix + rank order + **the new strictness pin** red — 3 tests. The strictness message names the pair: *"CB_IN_PHASE@25 is not below EVEN_BRACKET@25"*. |
| **H** | `CB_IN_PHASE` 22 → 14 and `CB_ON_HIP` 15 → 13 — **still strictly decreasing**, but row 6 leaves `covered` | matrix + **band-words** + rank order red — 3 tests: *"§9.3 CB_IN_PHASE @14 is no window"* vs *"is covered"* |
| **I** | `catching.contestedMaxOpenness` 30 → 25 (**ADR-040's anchor pin**, re-audited because §4.1a ratifies it) | `TS2322` ×2 — *"Type '30' is not assignable to type '25'"* |

**G is the case that matters, and it is the case that did not exist before.** It is the defect the
owner actually ruled against, and until this dispatch **no instrument in the tree failed on it** —
§2.3b's table. H is its complement: it establishes that the strictness pin and the band-words pin are
**independent**, since H is monotone and still red. I re-confirms, by running it, the claim §4.1 makes
in prose — that the anchor coupling is enforced by the compiler.

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
| `CB_IN_PHASE` | 25 | 25 → **22** (§2.3a) | covered |
| `CB_ON_HIP` | 15 | 15 | **HELD** |
| `CB_IN_POSITION` | 6 | 6 | **HELD** |

Monotone by construction; every ruled value inside the band its label names. **Strictly** monotone as
of §2.3a.

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

> **RESOLVED by §2.3a.** Kept verbatim, because what it says about *why nothing was picked here* is
> the reason there was a ruling to transcribe rather than a number to defend.

`EVEN_BRACKET` lands on **25**, and `CB_IN_PHASE` is **held at 25**. The column is therefore
`70 / 52 / 38 / 30 / 25 / 25 / 15 / 6`: **non-strictly** monotone. The band gate fires on a column
that *both rises and falls*, so a tie is green.

**As football it is not obviously right.** ADR-043's argument was that *a receiver dead even with his
man cannot be **less** open than one whose corner has won the rep and is in phase* — equality
satisfies "not less", but a dead-even rep arguably ought to be **more** open than a beaten one. The
ruled column names five rows; rows 5-7 were not ruled. **Nothing is picked here to tidy the column** —
choosing a value for `CB_IN_PHASE` to restore strictness is precisely the invention this correction
exists to remove. **Recorded, unresolved, for the owner.**

### 2.3a ✅ RULED — `CB_IN_PHASE` 25 → **22**. §2.3 is resolved.

The owner ruled the item §2.3 brought. **`EVEN_BRACKET` stays at 25; `CB_IN_PHASE` moves to 22.**

> *"In phase, the defender has leverage — he's between the receiver and the ball, or he's got the hip,
> and he can play the throw. **Even means neither has won, and the receiver at least has the option of
> winning late.** Those are different situations and the column shouldn't call them identical."*

**Why 22 rather than something smaller:** it keeps `CB_IN_PHASE` comfortably inside `covered (15-29)`,
leaves room beneath for rows 7–8, and preserves the roughly even spacing the rest of the column has.
The full column is **`70 / 52 / 38 / 30 / 25 / 22 / 15 / 6` — strictly decreasing.** `CB_ON_HIP` (15)
and `CB_IN_POSITION` (6) are **held**, and the owner's standing instruction was that *if rows 7–8
turned out not to fit beneath 22 monotonically, that comes back as a question — it does not get solved
by compression.* **They fit**, and the fit is now asserted rather than eyeballed (§2.3b).

**The whole structural content of the ruling is one matrix line.** `CB_IN_PHASE` loses
`desperationThreshold`: at 25 an in-phase corner's receiver cleared §8.5's forced-decision floor (25,
compared `>=`); at 22 he does not. **22 and 25 are on the same side of the other six threshold
consumers** — which is also the reason the pricing below is small, and why the raw count over-states
the reach so badly (§3.1a).

### 2.3b The property the owner ruled on had NO INSTRUMENT. It has one now.

Worth recording as a finding, because it is the third time in this chain that the thing that mattered
was invisible to every instrument pointed at it:

| instrument | could it have seen the 25/25 tie? | why not |
|---|---|---|
| band-table monotonicity gate (`FF_BAND_GATE=1`) | **no** | fires on a column that *both rises and falls*. A tie is green **by construction** (§8). |
| §8.5's interleaved rank-order pin | **no** | under a tie, which row ranks higher was `Array.prototype.sort`'s **stability** over the order `producerRows` builds. A coincidentally-correct order is indistinguishable from a derived one. |
| the producers × consumers matrix | **no** | 25 and 25 classify identically, so the two lines were identical *and correct*. |
| §1.4's reading pass | **yes** | and it is the one with no instrument. |

`test/opennessScaleConsumers.test.ts` now carries **"§9.3's openness column strictly decreases"**,
which is the ruling's own content made checkable. Scope is stated in the test and stated here so it
can be overruled: **§9.3 only.** §9.4's column is a different table with a different ruling behind it
and nothing has ruled that *it* may not tie; widening the assertion would be inventing a law from one
ruling.

### 2.3c The reading pass, redone — and it found three rows that gained words

§1.4's rule is that the reading pass **must be redone whenever §8.4, §9.3 or §9.4 changes**. Redone.
§8.4, §9.4, §10.2, §10.3 and §11.1 are unchanged and re-read clean. §9.3's amended block, however,
**now names a §8.4 band for rows 6–8 for the first time** — `22 COVERED` / `15 COVERED floor` /
`6 NO WINDOW` — where before it gave them only prose ("CB in phase, trail position"). Three rows that
were deliberately absent from the band-words pin *because the doc gave them nothing to check against*
are now checked, and all three sit inside the band they name.

**That is the pass being re-run finding MORE to pin, not the pin being widened to swallow a change.**

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

> **⚠ AMENDED — READ §3a.5 BEFORE DRAWING ANYTHING FROM THIS SECTION.** The conclusion is unchanged;
> the *confidence* is not. §3a ran the same kind of change at **play scope** as well as corpus scope,
> and the corpus arm could not recover even the **sign** of the cell it was measuring. A corpus-scope
> before/after on a propagating change **cannot distinguish "no effect" from "effect present and
> swamped."** This section's "did not come true" is therefore *not measured at this instrument*, which
> is a weaker statement than the one it appears to make. ADR-046's mechanism is exactly what would need
> the play-scope arm.

---

## 3a. PRICING §2.3a's ONE CELL, SEPARATELY FROM THE THIRTEEN

Its own change, its own price. **Nothing below was acted on.**

### 3a.1 Structural pricing — the matrix, diffed again

One line of thirteen changed, and it is the line the ruling names:

| producer row | permission gained | permission lost |
|---|---|---|
| `§9.3 CB_IN_PHASE` (25 → 22) | — | **no longer clears `desperationThreshold`** |

That is the complete structural diff. **`EVEN_BRACKET` still clears the desperation floor and
`CB_IN_PHASE` no longer does — which is the ruling's football, restated as a permission:** *even* is
still a ball he will turn loose when the moment forces a decision; *the corner is in phase* is not.

### 3a.2 Raw and exclusive counts, per `calibration.md` §5.3 — **and its LIMIT applies**

> **⚠ THIS CHANGE PROPAGATES, SO THERE IS NO EXCLUSIVE COUNT AT GAME SCOPE. Saying so is the
> requirement.** Whole-corpus stream digests over 12 games differ; **12 of 12 games differ.** Per
> §5.3's LIMIT the two available counts are both wrong in opposite directions by unknown amounts, and
> **neither may be reported as if it were the exclusive count**:
>
> - *"play-ids differing"* — **314 of 2,103 (14.9%)** — over-counts without bound (propagation).
> - *"games differing"* — **12 of 12** — under-counts, collapsing a whole game to one.
>
> **The tell is satisfied in the negative: there is no digest-identical arm at game scope, so there is
> no exclusive count at game scope.**

**RAW COUNT — the §5.3 live-population precondition, cleared by a wide margin.** Over the same 12-game
corpus: `CB_IN_PHASE` is **105 of 1,330 man-coverage reps (7.89%)**, occurring on **101 of 1,635 plays
(6.18%)** and **101 of 1,034 dropbacks (9.77%)**. Compare the case that produced the precondition —
`freeRunnerArrivalSeconds` at 0.13% of dropbacks. This subject is **live**, by ~75×.

**AND AN EXCLUSIVE COUNT IS AVAILABLE AT PLAY SCOPE, BECAUSE AT PLAY SCOPE NOTHING PROPAGATES.**
`simulatePassPlay` is `(state, calls, seed, tunables)`; a pair of arms over the **same entering state
and the same seed** are causally independent play-to-play, so the digest-identical complement is real
evidence rather than an absence. 4,000 paired plays, `buildScenario`, seeds `price-0…price-3999`:

| count | value | what it is |
|---|---|---|
| **raw** — subject present, either arm | **453 / 4,000 (11.33%)** | how often is the subject present? |
| stream digest differs | 433 (95.58% of raw) | includes plays where only the *published number* moved |
| …of which the play did **not** carry the subject | **0** | the isolation check. A non-zero here would mean the arms were not isolated. |
| subject present, stream **digest-identical** | 20 (4.42% of raw) | the change was present and inert |
| **EXCLUSIVE, football scope** — decisions / throw type / catch type / play result differ, **openness numbers stripped** | **26 / 4,000 (0.65%) — 5.74% of raw** | how often is the subject **deciding** the outcome? |

**THE RAW COUNT OVER-STATES REACH BY 17×, AND §5.3 REQUIRES NAMING THE CO-DERIVING MECHANISM RATHER
THAN THE PERCENTAGE.** Here it is: **on a `CB_IN_PHASE` rep, 22 and 25 fall on the same side of six of
the seven threshold consumers** (§3a.1) — so on 94% of the plays where the subject is present, the
*same* comparisons resolve the *same* way and the row's move changes only the number printed in
`ROUTE_STATUS` and `QB_READ`. And the seventh, `desperationThreshold`, is compared against
**effective** openness — after §8.3's perception variance, §8.4's window compensation and §8.7's route
development — not against the base row, so a three-point move in the base is frequently swallowed
before the comparison happens.

**The 26 are all the same shape, and it is the shape the ruling asked for: THE BALL COMES OUT LATER.**
Every one of the 26 is a change in the decision *sequence*, never in the first decision
(`HOLD→HOLD` on all 433 differing plays). The two largest groups are
`HOLD>CHECKDOWN ⇒ HOLD>HOLD>CHECKDOWN` (6) and `HOLD>CHECKDOWN ⇒ HOLD>STEP_UP>CHECKDOWN` (5): the
quarterback does not turn it loose to the in-phase corner's man, so he takes another tick or climbs
the pocket. **That is exactly "he can play the throw", arriving as a mechanic.**

### 3a.3 Population pricing — 12 games, identical seeds, identical fixture

| metric | before (25) | after (22) | Δ | ≈σ |
|---|---|---|---|---|
| mean **actual** openness per read | 38.79 | **38.82** | **+0.03** | see below |
| mean **effective** openness per read | 43.32 | **43.24** | −0.08 | — |
| reads inside a tight window | 60.81% | **60.61%** | −0.20pp | 0.1σ |
| HOLD decisions | 1,519 | 1,514 | −5 (−0.3%) | — |
| SCRAMBLE | 31.82% of dropbacks | 32.10% | +0.28pp | 0.2σ |
| CHECKDOWN | 38.36% of attempts | 38.59% | +0.23pp | 0.1σ |
| sacks | 12.96% of dropbacks | 12.94% | −0.02pp | 0.02σ |
| throwaways | 23 | 23 | 0 | — |
| completion % | 48.86% | 49.32% | +0.46pp | 0.25σ |
| INT % of attempts | 7.00% | 6.93% | −0.07pp | 0.07σ |
| contested share of catches | 20.30% | 19.94% | −0.36pp | 0.2σ |
| BULLET share of throws | 98.25% | 98.37% | +0.12pp | — |
| yards per attempt | 4.65 | 4.67 | +0.02 | — |
| plays / points (24 team-games) | 1,635 / 757 | 1,630 / 771 | −5 / +14 | — |

**⚠ ONE ROW HERE IS DIFFERENT IN KIND FROM ADR-045's TABLE AND IT IS THE MOST INFORMATIVE ONE.** In
§3.2 the openness shift was **deterministic** — it *was* the correction, −6.83 with no sampling in it.
Here it is **+0.03, in the OPPOSITE DIRECTION TO THE CELL.** The cell moved **down** three points and
the corpus mean moved **up**, because the corpus composition itself moved: 105 `CB_IN_PHASE` reps
before, 99 after. **The direct effect is not even visible above the compositional noise it causes.**
That is §5.3's propagation LIMIT arriving as a measurement rather than as a caveat, and it is the
cleanest illustration of it this project has produced: *a two-run diff on a propagating change cannot
even recover the sign of the thing you changed.*

**Every behavioural row is inside a quarter of its standard error** at n ≈ 740 attempts / 1,030
dropbacks. Read that as **not measured at this n**, never as *no effect*. §5.3's live-population rule
applies and the population pricing belongs to calibration's batch harness.

### 3a.4 The 24-game tipped-ball corpus, re-baselined a third time

| digit | ADR-035/036 | ADR-040 | ADR-045 | **§2.3a** |
|---|---|---|---|---|
| plays | 3,420 | 3,421 | 3,420 | **3,415** |
| yards | 20,047 | 21,107 | 20,953 | **20,922** |
| turnovers | 107 | 113 | 109 | **107** |
| points | 1,545 | 1,683 | 1,655 | **1,663** |
| tips | 271 | 270 | 273 | **273** |
| dead tips | 163 | 164 | 166 | **166** |
| live tips | 108 | 106 | 107 | **107** |

**The structural half still did not move — third independent confirmation.** `deadEligible`,
`deadRecoveryChecks`, `deadCarryingTheKey`, `deadClaimingRecoverable` and `liveMissingTheKey` all read
**0**, and `liveTargets` still reads §12.2's five real thresholds `[20, 35, 55, 75, 90]`.

**A NEW OBSERVATION, RECORDED AS AN OBSERVATION AND EXPLICITLY NOT PROMOTED TO A LAW:** the three tip
digits are **unchanged** across this re-baseline while every football digit moved. They are ordinary
corpus counts with no reason they must hold, and the test comment says so — if a future change moves
them that is a corpus count behaving like a corpus count, not a regression. Recorded because the
tempting misreading is to fold them in with the structural half above, and they are not the same
claim.

### 3a.5 ⚠ THE METHOD FINDING — a play-scope arm sees a mechanism a corpus-scope diff structurally cannot

This is the part of §3a worth keeping, and it is a correction to how §3.4 was measured, not to what it
concluded.

§3.4 recorded a **prediction that did not come true**: §9.3's scope block predicted more reluctance,
and sacks and throwaways moved *down*, inside noise. That was measured the only way §3 had — a
corpus-scope before/after — and **that measurement cannot distinguish "no effect" from "effect
present and swamped."** §3a has both arms on the same one-cell change, and they disagree in a way that
is entirely explicable:

| scope | what it says |
|---|---|
| corpus (12 games, propagating) | mean actual openness **+0.03 — the wrong sign** for a cell that moved down. Every behavioural row inside a quarter of its standard error. |
| play (4,000 paired plays, isolated) | **26 plays where the ball comes out later**, every one of them, in the direction the ruling predicted — and a **digest-identical complement of 3,974** that proves the rest is zero. |

**The corpus arm cannot even recover the SIGN of the change; the play arm recovers the mechanism and
its exact count.** The reason is §5.3's LIMIT stated as a positive rather than a refusal: propagation
destroys attribution, and **removing propagation is a thing you can actually do here** — plays are
causally independent given their entering state and seed, so a paired play-scope arm has a
digest-identical complement and therefore a real exclusive count.

> **RECOMMENDED, NOT RULED — for calibration and for future engine dispatches: when a change's
> subject is a per-play quantity, price it at PLAY SCOPE first.** The corpus arm still belongs in the
> report — it is what the league actually sees, and its noise floor is a real fact about how much
> evidence 12 games carries — but it is the *wrong instrument for attribution* and this dispatch is a
> clean demonstration of why. §3.4's "prediction that did not come true" should be **re-measured this
> way before anyone concludes anything from it**; ADR-046 is the natural place, since its own
> ruling turns on exactly that mechanism.

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

### 4.1a ✅ RATIFIED — `catching.contestedMaxOpenness` 40 → 30 stands

The owner ratified §2.4 / §4.1 on the reasoning as written: it is a **derivation, not a choice** —
ADR-040's argument re-run against the re-pointed table returns the **same row**; the alternative got
*weaker* once SA-08's amendment deleted the "(contested)" parenthetical the rejection rested on; and
**the reclassification is nil**, which is the evidence it is not compensation.

The owner's addition, recorded because it generalises past this cell: **non-separability confirmed by
the compiler rather than argued is the strongest form of that claim available.** The type pin making
`pnpm typecheck` red is the pin working exactly as ordered, not an obstacle it created. That claim was
**re-audited by running it** in this dispatch (§1.5a case I), not carried forward on the strength of
having once been true.

**Re-checked against §2.3a:** `CB_IN_PHASE` moves **down**, from 25 to 22, and was already contested
at both values. The contested set is still the same five rows, so **§2.4's nil-reclassification claim
is unchanged by the ruling that moved the column beneath it.** Stated because that is precisely the
kind of inherited claim this chain has caught going stale twice.

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

**Re-checked for §2.3a, and the answer is a NEGATIVE worth recording:** the register carries entries
for `manCoverage.bands.3` and `.4` and a catch-all for `manCoverage.bands.*`, but **no entry for
`.5`** — so the `CB_IN_PHASE` ruling adds **no new stale claim** to a file that already holds three.
Separately, the band gate's ruled-cell register (`bandTables.ts`'s `ruledCells`, which re-applies
each ruled value as a no-op patch so a ruling cannot outlive its subject) is scoped **to adjudicated
inversions only**, and `manCoverage.bands.openness` is not one — so it correctly says nothing here
rather than saying something stale. The `CB_IN_PHASE` ruling is instead held by the matrix pin, which
records the value **with its consequences** rather than restating it.

---

## 5. BROUGHT RATHER THAN ABSORBED

### 5.1 ✅ CLOSED — the `EVEN_BRACKET` / `CB_IN_PHASE` tie at 25 (§2.3)

ADR-043's decision request #1 — *do rows 5-7 move, and to what?* — **is now answered**: row 6 moves to
22, rows 7–8 hold. See §2.3a. **Bringing it rather than tidying it was the correct call and the item
is discharged by a ruling, not by an implementer's judgement** — which is the only way an item of this
shape is allowed to close.

### 5.2 ➡ FILED AS **ADR-046** — §8.7's coverage-blind development gain (§3.4)

`route.opennessGainPerTick = 8` applies identically whatever the coverage rep produced, which erodes
most of a 15–18 point base correction within two ticks. **Not a tuning question.** The owner's read is
that it is a **structural insensitivity, the same species as ADR-028's constant swallowing blocker
quality** — the number is not wrong on any scale, the **shape** is. It is now **ADR-046**, with the
shape question (flat / proportional / contest-conditioned) put and answered there. **It is a separate
change and is not touched by this ADR**, including by §2.3a.

**Refusing to re-tune it inside a labelling fix was correct, and refusing again inside §2.3a's
labelling fix was correct for the same reason** — `opennessGainPerTick` was not touched by this
dispatch either.

### 5.3 The two `?? 0` sorting sentinels (§1.3)

Latent, not live. §4.1's rule already applies to them. **Untouched by §2.3a**, deliberately: a
behaviour-neutral refactor of `sim/passPlay.ts` is no more part of a one-cell ruling than it was part
of a thirteen-cell one.

---

## 6. What a future implementer must actually do

1. **Re-run the fixpoint** (§1.1) whenever this scale moves. Its silence means *not observed*.
   **NOT re-run for §2.3a**, and here is the reason, stated so it can be disputed: §2.3a changes a
   *value* inside a producer row that the fixpoint already enumerated, and adds no producer, no
   consumer and no call site. The fixpoint's output is a **consumer list**, and a consumer list
   cannot change when nothing about the call graph does. The matrix — which is what the fixpoint
   left behind — **was** re-recorded, and its diff is §3a.1.
2. **Re-do the reading pass** (§1.4) whenever §8.4, §9.3 or §9.4 changes. **There is no instrument and
   there cannot be one.** Done for §2.3a; it found three rows that gained words (§2.3c) and a third
   doc defect (§1.4b).
3. **Re-run every failing case** in §1.5 when the pins' subject changes — reading an instrument tells
   you what it claims to check; only failing it tells you what it does. Done for §2.3a: **§1.5a**,
   nine cases, three of them new.
4. Do not satisfy a red pin by editing its literal. Every red in §2.6 had a derivation waiting behind
   it, and §2.3a's single red — the 24-game corpus fence — is a **re-baseline** with its structural
   half re-verified unmoved (§3a.4), not a literal edited to agree.
5. **Price a change as its own change.** §3a prices one cell separately from §3's thirteen, including
   its own raw/exclusive counts, because a price inherited from a bigger change is not a price.

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

### 7a. Verification — the §2.3a amendment

- `pnpm typecheck` (root, all 8 packages incl. every `test/`) — **clean**.
- `pnpm test` (root) — contracts 12, playbook 1,267, **engine 769** (+1: the strictness pin),
  calibration 473 (+34 skipped). **All green.**
- **Exactly one test went red on the value move** and it is the 24-game corpus fence, re-baselined at
  §3a.4 with its structural half re-verified unmoved. The matrix pin also moved — **by design; it
  pins labels and values** — and was re-recorded as the ruled state.
- Determinism: `determinism.test.ts`, `gameDeterminism.test.ts` and `tunablesThreading.test.ts`'s
  byte-identical whole-game replay all green under the ruled tree.
- §1.5a's nine failing cases run and reverted; the three touched files hashed before and after each,
  tree byte-identical every time.
- Band gate (`FF_BAND_GATE=1`) re-run — **GREEN**, §8a, with both digests moved.
- Files touched: `packages/engine/src/tunables.ts`,
  `packages/engine/test/opennessScaleConsumers.test.ts`,
  `packages/engine/test/tippedBall.test.ts`, and this ADR.
- **`route.opennessGainPerTick` untouched** (ADR-046's subject). **`packages/contracts`,
  `packages/calibration`, `docs/design/` and the `?? 0` sentinels untouched.**

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

---

## 8a. The band gate, RE-RUN FOR §2.3a — same rule, same reason, and its subject moved again

Charter §4.1 standing practice #2 again. §2.3a moves a cell in `manCoverage.bands.openness`, which is
one of the gate's 52 orderable columns, so `FF_BAND_GATE=1` was **run, not assumed.** Tier 3: nothing
in CI can tell whether a human typed the variable, so **this paragraph is the only evidence it
happened.**

```
corpus: 160 games · flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024
        · caller v2 + FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN
batch seed `known-truth:band-table-monotonicity` · seed digest fnv1a:60f21076#160
tunables digest fnv1a:b444c217   (ADR-045: fnv1a:79dce2b6)
stream   digest fnv2:9bdb3011160a47c3   (ADR-045: fnv2:b1765fa349633ab7)
30,350 plays · 903,660 events   (ADR-045: 30,400 · 904,018)
26 band tables · 119 rows · 248 effect cells · 52 orderable columns · 3 string columns
10 columns invert before exemption; derivation scoped to their 51 cells
verdicts: LIVE 39 · GUARDED 11 (the exemption set) · UNREAD_COLUMN 0
        · UNREACHED_ROW 1 · UNDER_SAMPLED_ROW 0 · UNPERTURBABLE 0
97 corpus runs · 1,027.0 s wall clock
VERDICT: GREEN
```

**BOTH DIGESTS MOVED, AND THAT IS THE POINT OF RUNNING IT.** The tunables digest moved because the
cell moved; the stream digest and the play count moved because the cell reaches the football. **A
green instrument over an unchanged subject would have proved nothing** — that is the configuration all
three known instrument failures shared. This one is green over a subject that demonstrably moved.

**What it says about §2.3a specifically.** The ten inverting columns are unchanged and
`manCoverage.bands.openness` is **still not among them** — it was monotone before and is **strictly**
monotone now. The surviving adjudicated inversions (`ballCarrier.contests.*`, two `RULED_NO_CHANGE`
and two `OPEN`), the two declared abstentions (`GIFT`/`FLOATER`) and the one `UNREACHED_ROW` are
**unchanged**: this dispatch neither created nor cleared any of them, and the exemption set is the
same 11 `GUARDED` cells.

**⚠ AND THE GATE STILL COULD NOT HAVE SEEN THE THING THAT WAS FIXED.** It was green on the tie and it
is green on the ruling. §2.3b: *a tie is neither a rise nor a fall.* Recorded here rather than only in
§2.3b because this is the run that demonstrates it — **the same instrument returning the same verdict
across a change that was made precisely because the previous state was wrong is the clearest possible
statement of what this instrument does not measure.** It is not a defect in the gate; it is the reason
`opennessScaleConsumers.test.ts` now carries a strictness assertion the gate does not.
