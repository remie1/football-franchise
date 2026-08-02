# ADR-058: Arrival is authoritative for a won rep

**Status:** RATIFIED (owner, August 2026). Implementation pending.
**Supersedes, in part:** ADR-033's band-floor rule, as it applies to `RUSHER_WINS_REP`. **Nothing else
in ADR-033 is touched.**
**Raised by:** backlog entries 105-109.

> ## ⛔ **THIS IS A NARROWING OF `bandFloor`'s SCOPE, NOT ITS REMOVAL.** ⚠ **Stated in those words so nobody reads it as deleting a channel.** **`bandFloor` keeps every population it uniquely covers.**

## Provenance of factual claims — REQUIRED

| claim | status | evidence |
|---|---|---|
| `bandFloor` structurally cannot reach `IMMEDIATE` | **MEASURED** | `tunables.ts:999-1006` — `minimumStatusByBand`'s only non-`CLEAN` values are `PRESSURE` and `COLLAPSING` |
| Every `IMMEDIATE` tick on a won rep is arrival's | **DERIVED** from the above + the counter's `0.00%` at the deciding instant (entry 107) |
| `bandFloor` has ZERO reach for free runners / loopers / lost pickups | **MEASURED** | `RushPlan` is a discriminated union (`preSnap.ts:120-127`); the rep loop skips `m.blocker === undefined` (`passPlay.ts:580`), so `previousBand` stays `undefined` for the play's life |
| Arrival cannot see a time-retired won rep | **MEASURED** | `m.previousBand` set unconditionally at `passPlay.ts:592`; `retireIfBeyondClock` may already have fired. §7.1 dates this at **6 occurrences in 40,000 plays** |
| They tie exactly on INTERIOR at every margin | **DERIVED from constants** | `travel` `1.0` all moves + `arrival.minTravelSeconds` `1.0` clamps the dominance shave (`tunables.ts:641,758`) |
| They disagree on slower EDGE wins | **DERIVED from constants** | `EDGE.SPEED` travel `2.0` ⇒ `minTta 1.5` at the deciding tick ⇒ arrival `PRESSURE` vs bandFloor `COLLAPSING` |
| The counter contributes `0.00%` at the deciding instant | **MEASURED**, canonical `n=496` | entry 107; and solely necessary on **zero** plays, entry 105 |
| `minTta` at the deciding tick is `travel − 0.5` | **DERIVED** | `pocketStatusFor` reads last tick's state (`passPlay.ts:525-530`); first read of a rep won at `T` is `T+0.5` |

## Need

**Two channels were reading one event.** `statusFromBandFloor` floors instantly off the band table;
`pocketFloorFromArrival` floors on `minTta <= C`; and for an INTERIOR rusher these cross together —
not by design, but because `travelSecondsByAlignmentAndMove.INTERIOR` and `arrival.collapsingWithin
Seconds` were **independently derived and accidentally equal** *(entry 83's relational class, third
instance)*.

⛔ **The owner's ruling (entry 108): collapse the reading, do not loosen the stack. A won rep should
force through ONE path.**

## Decision

> # ⛔ **ARRIVAL IS AUTHORITATIVE FOR A WON REP. `bandFloor` STOPS FLOORING ON WON REPS.**

### The decisive fact

⛔ **`bandFloor` STRUCTURALLY CANNOT REACH `IMMEDIATE`. So every `IMMEDIATE` tick on a won rep is
ALREADY arrival's.**

> ### ⚠ **MAKING `bandFloor` AUTHORITATIVE WOULD LEAVE THE MOST SEVERE STATUS ON A WON REP WITH NO SUPPLIER. THAT IS NOT A CHANNEL CHOICE — IT IS REMOVING THE TOP OF THE LADDER.**

### And the football supports it

**A won rep is a rusher who is PAST HIS MAN AND TRAVELLING. What matters after that is HOW MUCH TIME
THE PASSER HAS — which is exactly what arrival computes.**

⛔ **`bandFloor` answers *"was this rep won"* — A FACT ABOUT THE CONTEST, NOT ABOUT THE POCKET — and
then floors the pocket as if the answer to the first were the answer to the second.**

⚠ **Distance gradation on a won rep is NOT cosmetic. It is the actual mechanic, and arrival is the
channel that has it.**

## ⛔ COSTS — both real, neither changes the ruling, and the first is a WEAKENING

### Cost 1 — ADR-033's *"one won rep is sufficient"* stops being a STRUCTURAL guarantee

⚠ **Recorded explicitly, because THE WEAKENING DIRECTION IS THE ONE NOBODY VOLUNTEERS FOR.**

**What that rule guarantees against is a specific state: A RUSHER PAST HIS MAN WHILE THE POCKET READS
`CLEAN`.** ⛔ **Arrival at `minTta 0.5` does not produce that state.**

> ### ⇒ **THE GUARANTEE SURVIVES IN SUBSTANCE WHILE CEASING TO BE STRUCTURAL.** ⚠ **It becomes a consequence of the horizons rather than an independent floor — and a consequence can be broken by a horizon change that an independent floor would have survived.**

### Cost 2 — and it carries an OBLIGATION

**Won-rep forcing now routes through `travelSecondsFor`'s dominance-shave heuristic, which is
MARKED `INTERPRETATION` AND EXPLICITLY NOT DOCTRINE (ADR-031 §1c/1d).**

> ## ⛔ **THE ARRIVAL HORIZONS ARE NOW LOAD-BEARING IN A WAY THEY WERE NOT. THEIR `INTERPRETATION` MARKING MUST BE REVISITED ON ITS OWN TERMS RATHER THAN INHERITED.**

⚠ **NOT as part of this change. AS THE NEXT ITEM AFTER IT.** ⛔ **Ratifying this without booking that
obligation would be inheriting a marking the ruling just made load-bearing.**

## What `bandFloor` KEEPS — this is a narrowing, not a removal

- ✅ **`BLOCKER_BEATEN → PRESSURE`** and every other band mapping. **Untouched.**
- ✅ **Time-retired won reps** — where arrival structurally cannot see the threat *(6 in 40,000)*.
- ⚠ **NOTE the free-runner population is NOT bandFloor's** — it never was. `bandFloor` has zero reach
  there and arrival is already sole. **This ruling does not change that either way.**

## Implied scope — REQUIRED

- ⛔ **`arrival.collapsingWithinSeconds`'s value** — now the sole determinant of when a won INTERIOR rep
  forces. **`unruled`**, and the subject of the Cost-2 obligation above.
- ⚠ **`pocket.minimumStatusByBand.RUSHER_WINS_REP`'s value becomes unreachable-for-won-reps.** ⛔ **Do
  NOT delete the key — that is the ADR-056 unproduced-member trap. Its disposition is `unruled`.**
- ⚠ **Every pre-`ADR-058` channel-share figure describes the OLD derivation** — entries 105-107 and
  every `pocketChannelShares` measurement. **`unruled`; they are dated records, not to be revised.**
- ⛔ **The `C >= 0.5` boundary is DERIVED AND UNTESTED** *(entry 109)*. **`C=0.5` unexplored. `unruled`.**

## Impact

**`packages/engine`** — `pocketFloorFor` no longer floors on `RUSHER_WINS_REP`. **`packages/calibration`**
— every channel-share instrument re-measures a changed derivation; **expect the `bandFloor` sole share
and the multi-channel share to move, and that movement IS THE POINT.** ⛔ **Every Tier 1 figure that
touches pocket status may move; re-baseline and report before/after per the citable-count rule.**

⚠ **This is a `docs/design/match-engine.md` §7.2 amendment as well as a code change** — the doc's
literal *"1+ rushers won… previous tick"* sentence no longer describes the implementation.

## Decision record

**Owner ruling, August 2026, on the mechanism read in backlog entry 109.** **Orchestrator to dispatch
implementation to `match-engine`; doc amendment and register updates required per Charter §4 and
`match-engine.md`'s own amendment-note convention (ADR-056 `C6`'s list applies).**
