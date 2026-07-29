# ADR-033: A pocket status describes space — gaining ground is not pressure, and a sack is not a status

- **Date:** 2026-07-29
- **Proposed by:** `match-engine`
- **Status:** approved (implements two owner rulings; filed for the record and for the two petitions it raises)

## Need

Two owner rulings on `docs/design/match-engine.md` §7.2, both decided before this
dispatch began, both implemented here. They share one sentence:

> **A pocket status describes THE SPACE THE PASSER IS WORKING IN.**

Ruling 1 says a rusher who has gained a step has not changed that space. Ruling 2
says the play having ended is not a description of that space at all. Everything
below follows from applying that sentence twice.

This ADR petitions `packages/contracts` for nothing, and it changes nothing
outside `packages/engine`. It records **one contract question** (§6) that is the
Orchestrator's to decide, and **two calibration follow-ups** (§7) that are
`packages/calibration`'s.

---

## Ruling 1 — gaining ground is not pressure

### What the doc said, and what it says now

§7.2 read *"POCKET PRESSURE: 1+ rushers winning by 1-14"*. The engine transcribed
it faithfully: `passRush.bands` put `RUSHER_GAINING` at `minMargin: 1` and
`pocket.minimumStatusByBand.RUSHER_GAINING` at `"PRESSURE"`. **The doc was
wrong**, and the owner amended it:

> PRESSURE requires **either** (a) a **won** rep whose arrival falls inside the
> pressure horizon, **or** (b) a margin high enough that the blocker is **beaten**
> rather than merely losing ground. A rusher gaining by a single point against a
> blocker who is still in front of him is a **CLEAN** pocket.
>
> *"Winning a rep and pressuring the passer are not the same event. A rusher who
> has gained a step at tick 1.0 with two more ticks of travel ahead of him has not
> affected the throw. Pressure means the passer's platform, vision, or timing was
> disturbed."*

### Limb (a) — implemented, and deliberately not moved

`arrival.pressureWithinSeconds` (ADR-031) **is** the pressure horizon. It is
`POS_INF`, which is limb (a) in its widest form: every won rep, at every distance,
floors the pocket at PRESSURE. The amendment is therefore satisfied at the
committed default with no change to this field, and none was made.

Narrowing it was considered and **rejected as out of scope**, on three grounds:

1. It is a football claim ADR-030 and ADR-031 both explicitly declined to settle.
   An unblocked blitzer is pressure by most charting conventions; a man three
   seconds away is not. Nothing in the amendment answers that.
2. It is a **sweep**, and sweeps belong to `packages/calibration`. ADR-031 named
   this field precisely so it could be swept, and it is the last unswept named
   candidate in §7.
3. Its budget is not this ADR's budget. ADR-030 measured **100.000% of governed
   dropbacks pressured at every rung of the arrival grid** with no third horizon,
   so a finite value moves the pressure rate by tens of points — against the
   2.382pp ADR-032 priced this ruling's band map at. Moving it here would have
   smuggled the largest unswept dial in §7 into a definition correction.

### Limb (b) — the judgement call, and what was rejected

Limb (b) needs a margin at which a blocker is **beaten** rather than **losing**.
§7 gives no interior boundary between a stalemate (0) and a won rep (15), so the
number had to come from somewhere. **It came from the engine's own margin
vocabulary, not from feel.**

`resultTierLadder` is the nine-tier scale every check in the game is read on, and
`passRush.bands` **already agreed with it at two of its three interior
boundaries** — 15 is `STRONG_SUCCESS`, 1 is `MARGINAL_SUCCESS`, −15 is
`STRONG_FAILURE`. The one boundary the ladder offers between "marginal" and
"decisive" is **5** (`SUCCESS`). Adopting it makes the §7.1 band table a
projection of the universal ladder rather than a private set of numbers, and
`test/pocketStatus.test.ts` now asserts that coincidence so it cannot drift.

| band | margin | tier it coincides with | football reading | floor |
|---|---|---|---|---|
| `RUSHER_WINS_REP` | 15+ | `STRONG_SUCCESS` | past him and travelling | COLLAPSING |
| `BLOCKER_BEATEN` **(new)** | 5–14 | `SUCCESS` | leverage won; the blocker is recovering, not controlling | **PRESSURE** |
| `RUSHER_GAINING` | 1–4 | `MARGINAL_SUCCESS` | gained a step; the blocker is still in front of him | **CLEAN** |
| `STALEMATE` | 0 | `TIE` | — | CLEAN |

**Rejected, and why:**

- **1** — the committed value, and the thing the amendment overturns. A one-point
  edge on a hundred-point scale is not a disturbed platform.
- **8** ("halfway to a won rep") — a number with no referent anywhere else in the
  engine. It would be the third private constant in a table trying to stop having
  private constants.
- **15** — that is the won rep. Setting limb (b) there **deletes** limb (b)
  rather than implementing it: pressure would then require a won rep, full stop,
  and the amendment's "either/or" would have one limb.
- **Not splitting the band at all** (keeping five bands and raising
  `RUSHER_GAINING.minMargin` to 5, letting `STALEMATE` widen to 0–4) — cheaper,
  and it would have kept `minimumStatusByBand.RUSHER_GAINING = "PRESSURE"` and
  with it one calibration assertion (§7.2 below). Rejected because the label
  `RUSHER_GAINING` would then mean *beaten* and `STALEMATE` would mean *losing by
  four*, and both would be published in the event stream on every rep for the
  rest of the project. The stream is the single source of truth; a band label
  that means the opposite of what it says is a permanent lie told several
  thousand times a game.

### The counter was deliberately not touched

`BLOCKER_BEATEN` inherits `RUSHER_GAINING`'s `pressureProgressByBand` row exactly
(+1, no reset), so the pressure counter cannot tell the new band from the old one
and **the whole measured effect is attributable to the status map**.

It also makes the two mechanisms agree for the first time. The floor now says
*one* tick of gaining is not pressure; the counter says *three* ticks of it is
(`thresholds.PRESSURE = 3`, at +1 a tick). Before the amendment the floor
short-circuited the counter and that sentence was unreachable. **A rusher who
gains ground every tick is still pressure — he just has to actually do it.**

### Measured delta

40 games, seeds `pressure-0..39`, 3,679 dropbacks, four arms over identical
seeds with each ruling reverted in memory:

| arm | sack rate | pressure rate |
|---|---|---|
| both reverted (pre-ADR-033) | 9.432% | 93.667% |
| ruling 1 only | 9.378% | 93.232% |
| ruling 2 only | 9.432% | 93.667% |
| committed (both) | 9.378% | 93.232% |

**Ruling 1: −0.435pp of pressure, −0.054pp of sack.** ADR-032 priced the whole
reachable domain of this band map at **2.382 ± 0.051pp of pressure and 0.000pp of
sack**; this change is a strict subset of that domain and lands well inside it.
The sack figure is **two plays out of 3,679** against a binomial SE of ~0.48pp —
indistinguishable from the predicted 0.000pp. Nothing else moved.

### This does not close the pressure-rate gap and must not be cited as though it did

88.3% of the divergence survives extinguishing **every** classification threshold
in §7.2 (ADR-032). The rate is produced by the **supply** of threats (§7.1, §7.3,
§7.4), not by how §7.2 classifies them. This is a definition correction, banked
because it is directionally right and costs nothing downstream.
`CALIBRATION-BACKLOG.md` entry 40 remains open and is a supply problem.

---

## Ruling 2 — `SACK` is an outcome, not a status

### The category error, and the inversion it produced

`pocket.severity` ranked `SACK: 4` above `IMMEDIATE: 3` while `forcesDecision` and
`sackWhenNoTarget` both stopped at `IMMEDIATE` — so **the worst status on the
ladder forced nothing**, and moving a band up to it *lowered* the sack rate. That
state was reachable via `pocket.thresholds.minProgress: 9`.

A third affected table, found by the new gate and not named in ADR-032:
`readCapacityDelta.SACK = 0`, against `PRESSURE −1`, `COLLAPSING −1`,
`IMMEDIATE −2` — **the worst pocket on the ladder returned the quarterback's full
progression.**

### What changed

- `pocket.severity` — `SACK: 4` removed. Four rungs: CLEAN 0, PRESSURE 1,
  COLLAPSING 2, IMMEDIATE 3.
- `pocket.thresholds` — the `{ label: "SACK", minProgress: 9 }` row removed with
  the rung. Nine points of accumulated pressure now reads as IMMEDIATE and forces
  a decision like any other. **This is the only behavioural half of ruling 2.**
- `pocket.accuracyModifier.SACK` and `pocket.readCapacityDelta.SACK` — removed,
  not re-valued. The orphan the gate found is gone rather than left dangling; a
  row keyed by a status the ladder does not declare is a row nothing can read.
- `forcesDecision` and `sackWhenNoTarget` — **values unchanged**, and now
  upward-closed for the first time. The hole was `SACK`, and it was closed by
  removing the rung, not by adding an entry: adding one would have made the
  outcome a more urgent kind of *space* instead of admitting it is not a space.
- `PlayEventLog.escalatePocketStatus` — **deleted**, with the `tunables`
  constructor argument that existed only to serve it. Both callers rewrote a
  tick's status to `SACK`. A tick now has exactly one `POCKET_STATUS` because
  exactly one call site emits one, not because a later call rewrites the first.
- Nothing is lost from the stream. §17's own rule already reads a sack off it —
  a dropback with no `THROW` and no `RUN_RESOLUTION` that lost ground — and
  `PLAY_RESULT` carries the yardage, and `RUSH_THREAT`/`ARRIVED` names the man
  when there was one. `src/stats/statline.ts` and `packages/calibration`'s
  collector both already used that rule and neither read `POCKET_STATUS`.

### Measured delta: exactly zero, and the reason is the finding

Ruling 2 moved **nothing** on the engine's own 40-game corpus, on either axis, to
the digit. With the rung restored, that corpus produced **0 `SACK`-status ticks
out of 9,929**. The rung was **unreachable here**: it needs a pressure counter of
9 at +2 a won rep with the play still alive, and these plays end first.

So the inversion was invisible to every batch statistic this package can produce.
It took `packages/calibration`'s ladder **walk** — which *imposes* each rung
rather than sampling it — to see the defect at all. That is the argument for the
walk, happening. (ADR-032 reports the rung at 4.96% of in-pocket ticks on
calibration's flat-60 league; the two corpora differ and calibration owns the
reconciliation.)

### What a sack tick reports now

The tick keeps the space it actually had. Measured over 400 sacks on the lopsided
fixture, the terminal status is always one `sackWhenNoTarget` names, and both
values occur:

- **IMMEDIATE** — the common case. A rusher arrived, and the arrival floor had
  already said so at the top of the tick.
- **COLLAPSING** — §8.8's failed escape. The quarterback bailed and closed the
  last of the distance himself; `arrivedAt` dates the meeting at this tick,
  *after* the status was emitted from the previous tick's inputs (§7.2's one-tick
  lag). Before this change the tick was relabelled `SACK` and the lag was hidden.
  The honest report is the space he was in when he chose to run.
- A coverage sack at the tick horizon keeps whatever status it had, frequently
  **CLEAN** — which is correct, and is what a coverage sack *is*.

Escalating that tick to IMMEDIATE was considered and rejected: it is a new rule
no ruling asked for, and the model's stated behaviour is that a status is emitted
at the top of a tick from the previous tick's inputs.

---

## The gate

`packages/calibration`'s `knownTruth.pocket-status-ladder` was recorded **red**
against the committed engine, `IMMEDIATE → SACK` on all three axes (sack rate
−0.13071, time to throw −0.40996s, net yards per dropback −1.93256).

**Both tiers are green after this change, with no edit in `packages/calibration`:**

- Tier A `ladderTableFindings(DEFAULT_TUNABLES)` — **0 findings** (was 7).
- Tier B, the behavioural walk — **monotone**, 39.1s, four rungs. The ladder is
  derived from `pocket.severity`, so removing the rung removed the step.
- Tier B reproducibility — passes.

## The two findings the gate reported as design signal

The dispatch asked whether the severity *ordering* is a latent bug or a redundant
field, given that (1) on sack rate the whole ladder below `SACK` is flat
(0.00128 total, under one step SD) and (2) on time-to-throw exactly one step is
alive — `PRESSURE → COLLAPSING`, the `forcesDecision` membership boundary.

**Read: it is neither. It is a field with two jobs, and only one of them is
behavioural.**

1. `severity` is the **combinator**, and that job is load-bearing on every tick.
   `pocketStatusFor` takes the WORST of three independent derivations — the band
   floor, the arrival floor, the pressure counter — and "worst" is defined by
   nothing but this ordering. Delete the field and the pocket model has no way to
   reconcile its three inputs. Its flatness on the outcome axes is not evidence of
   redundancy; it is evidence that the *ordering* is doing its work upstream of
   the mechanics that read the *rungs*.
2. `severity` is also the **declaration** — the list of legal statuses, which
   calibration's gate derives its rungs from, which `PocketStatusRung` is derived
   from, and which the new engine-side table tests check every status-keyed table
   against. Ruling 2 works *because* the field is authoritative: removing one key
   removed a rung from three tables, one type, and one gate.
3. The **urgency** the finding is really about is carried by the membership
   lists, not by the numbers — and that is correct rather than accidental. The
   ladder is ordinal; `forcesDecision` and `sackWhenNoTarget` are where an ordinal
   becomes a decision. `time_to_throw` moving only at the membership boundary is
   the model working as designed. What was *wrong* was that the lists were not
   upward-closed, which let the two disagree — and that is now structurally
   impossible at the top of the ladder and asserted for the rest of it.

**The one real gap the finding exposes** is that the two *intermediate* rungs
(`PRESSURE`, `COLLAPSING`) currently differ only by an accuracy modifier and a
read-capacity delta, and `sack_rate` cannot see either. That is a **sensitivity**
question for calibration, not a defect: it says the rungs between "clean" and
"forced" are cheap, and if the design wants them to matter the lever is
`accuracyModifier`/`readCapacityDelta` magnitude, not the severity integers.

---

## The contract question — reported, NOT changed

`packages/contracts/src/events.ts:50` still reads:

```ts
export type PocketStatus = "CLEAN" | "PRESSURE" | "COLLAPSING" | "IMMEDIATE" | "SACK";
```

**Answers to the two questions asked:**

- **Was `POCKET_STATUS` ever emitted with `SACK`?** **Yes**, on two paths, on
  every sacked dropback: `sim/passPlay.ts`'s `sack()` helper (both the arrival
  sack and §8.8's failed escape) and the coverage sack at the tick horizon. Both
  went through `escalatePocketStatus("SACK")`, which *rewrote* the tick's already
  emitted status rather than appending, so it was one status per tick — but it was
  emitted, and seven engine test files inferred "this play was a sack" from it.
- **Is `SACK` reachable as a `PocketStatus` after this change?** **No.** Both
  emission sites are gone; `pocketStatusFor` returns `PocketStatusRung`, which is
  `keyof Tunables["pocket"]["severity"]` and no longer contains it;
  `PlayEventLog.pocketStatus` takes a rung; and `test/determinism.test.ts` asserts
  over 1,000 emitted statuses across four fixtures that every one is a key of
  `pocket.severity`. `SACK` is unreachable on every path.
- **No consumer breaks if the type narrows.** `packages/calibration`'s collector
  tests `status !== "CLEAN"`; its gate derives rungs from `pocket.severity`;
  `src/debug/renderPlay.ts` prints the string. Nothing switches on `"SACK"`.

**The engine narrowed locally rather than widening the shared type** (Iron Rule
2). `PocketStatusRung` in `src/resolve/pocket.ts` is derived from
`pocket.severity`, never restated, and a rung is assignable to `PocketStatus`, so
the event schema is untouched. `pocketSeverityOfEmitted` throws a `RangeError` on
a status the ladder does not rank — mirroring calibration's `severityOf` — so if
`SACK` ever re-enters the engine it fails loudly instead of sorting silently,
which is how `SACK: 4` outranked `IMMEDIATE` unnoticed in the first place.

**Petition (Orchestrator's to decide):** drop `"SACK"` from `PocketStatus`. If
approved, `PocketStatusRung` collapses to `PocketStatus` and can be deleted, and
`pocketSeverityOfEmitted`'s throw becomes unreachable-by-type rather than
guarded-at-runtime. The engine does not require it; the type is simply wider than
anything that can occur.

---

## Impact

**`packages/engine`** — all of it. 43 files, 716 tests, green. New band label
`BLOCKER_BEATEN` appears in the stream as `CHECK.band` on `pass_rush_tick`
(`band` is a free string in contracts, so no schema change). `PlayEventLog`'s
constructor lost its fifth argument.

**`packages/calibration`** — two follow-ups, both bookkeeping, **neither touched
by this dispatch** (the dispatch's standing instruction was to turn the gate green
by being right, not by editing calibration, and the gate *is* green):

1. **`test/knownTruth.pocket-status-ladder.test.ts:136` — "records one measured
   step, with an SD, for every step of every axis" is RED.** `recordedSteps`
   holds 4 entries for a ladder that now has 3 steps, on all three axes. This is
   the re-record the file's own comment anticipates: *"If a future engine fix
   makes the recorded steps monotone, these become historical and the field says
   so."* **The instrument already exists and names this change as its trigger** —
   `test/pocketLadderRerung.test.ts`, run with `FF_POCKET_LADDER=1
   FF_POCKET_LADDER_SEEDS=8`, whose header reads *"the engine change that will
   invalidate them is already scheduled — the owner has ruled that `SACK` leaves
   the severity ladder"*, and whose step 2 states the rule this ADR would
   otherwise have had to argue: **the recorded red may not simply be truncated.**
   The signal margin (`tolerance ≤ ½ × sensitivityTarget`) currently rests on an
   inversion that no longer exists, so the gate needs a new defect to size itself
   against or must retire the axis out loud. Suggested defect, since it is free
   and Tier A already catches it: the `readCapacityDelta.SACK` orphan.
2. **`test/knownTruth.pocket-status-ladder.test.ts:253` — "the engine's own
   constant is untouched by any of it" is RED.** It asserts
   `DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING === "PRESSURE"`;
   ruling 1 makes it `"CLEAN"`. This is a provenance assertion about the committed
   value, not part of the gate's property. It should be re-pointed at
   `BLOCKER_BEATEN === "PRESSURE"` and `RUSHER_GAINING === "CLEAN"`.

   **And a related judgement calibration should make deliberately**:
   `POCKET_STATUS_LADDER_SCENARIO.probeBands` is `["RUSHER_GAINING",
   "RUSHER_WINS_REP"]`, documented as *"both DIRTY rows of the band map"*. After
   ruling 1 the dirty rows are `BLOCKER_BEATEN` and `RUSHER_WINS_REP`;
   `RUSHER_GAINING` is a clean row covering ~4% of reps. The walk still passed
   comfortably, and `RUSHER_WINS_REP` alone reaches nearly every dropback — but
   the probe's *stated* reach argument (~95%, which sizes every tolerance) is now
   about the wrong band. Adding `BLOCKER_BEATEN` restores the probe's intent.
   That is a §22c strength decision and it is calibration's, not the engine's.

3. **`test/pocketBandSweep.test.ts:120` — env-gated, so GREEN in the default
   suite (skipped) and broken the next time it runs.** Its `DOMAIN` is
   `["CLEAN", "PRESSURE", "COLLAPSING", "IMMEDIATE", "SACK"]` typed as
   `keyof DEFAULT_TUNABLES.pocket.severity`, so `"SACK"` is now a type error —
   invisible today only because calibration's `test` script is `vitest run` with
   no `tsc` pass over `test/`, unlike `packages/playbook`'s. Its subject,
   `pocket.minimumStatusByBand.RUSHER_GAINING`, has also changed value, and its
   `severityOf` helper defaults an unranked status to `0` (`?? 0`) — which is the
   silent-ranking failure mode ruling 2 exists to remove, one package over. Worth
   a look when the sweep is next unfrozen.

**Everything else** — untouched. `packages/contracts` unmodified.
`packages/playbook` 1,267 tests green. `apps/game`'s build failure
(`Could not resolve entry module "index.html"`) is **pre-existing** and reproduces
on a clean tree.

## Decision

Both rulings were made by the project owner before this dispatch and are
implemented as written. The three judgement calls this ADR makes on its own
authority, each with its rejected alternatives stated above, are:

1. **The beaten-blocker margin is 5**, adopted from `resultTierLadder`'s
   `SUCCESS` boundary rather than invented. It is a `minMargin` like any other and
   calibration patches it by path.
2. **`arrival.pressureWithinSeconds` stays at `POS_INF`** — limb (a) is satisfied
   at the default and narrowing it is a calibration sweep, not a definition.
3. **`escalatePocketStatus` is deleted rather than repointed at `IMMEDIATE`.**

The contract narrowing in §6 is a petition and awaits the Orchestrator.
