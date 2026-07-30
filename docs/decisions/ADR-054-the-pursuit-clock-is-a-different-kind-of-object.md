# ADR-054 — The pursuit clock is a different kind of object, and publishing it as a threat would relocate the lie

**Date:** July 2026
**Proposed by:** Orchestrator, on `match-engine`'s fact-finding; raised from `CALIBRATION-BACKLOG.md` entry 58
**Status:** PROPOSED — contract petition, awaiting owner ratification
**Category:** new event type (`MatchEvent` union), ADR-013's pre-approved widening category

---

## 0. Provenance of factual claims — REQUIRED (`ADR-TEMPLATE.md`)

⛔ **This petition originated as a claim in a dispatch report — the upward-travelling unverified
claim in its pure form** (Charter §4.1). It was therefore briefed to **refute rather than confirm**,
and every row below is marked.

| claim | source | computed or reported? |
|---|---|---|
| The pursuit clock is built at `sim/passPlay.ts:900-905` on a successful `ESCAPE`; deadline is `escapeTick + scramble.pursuitSeconds` (1.5s, no die) | `match-engine`, code trace | **COMPUTED** |
| On scramble ticks `highestPressure ≡ 0` and `previousTickBands ≡ []`, so **`pocketFloorFromArrival` is the ENTIRE determinant** of `POCKET_STATUS` | `match-engine`, traced through `pocketStatusFor`'s three-way `worst-of` | **COMPUTED** |
| Nothing about the clock reaches the stream — no `RUSH_THREAT`, and the tuck logs only as `QB_DECISION` + `RUN_RESOLUTION` | `match-engine`, code trace | **COMPUTED** |
| ⛔ **`rusher` and `alignment` on the pursuit clock are PLACEHOLDERS** — `matchups[0]` (arbitrary array order) and a hardcoded `"EDGE"`, never read for content downstream | `match-engine`; **re-verified independently by the Orchestrator** at `passPlay.ts:1484-1507` | **COMPUTED ×2** |
| `rollRef` is already `escape.check.roll.rngLabel`, and that CHECK is already emitted (`passPlay.ts:855`) | `match-engine`, code trace | **COMPUTED** |
| Pursuit clock **governs** 19.013% of dropbacks at supply=15, 14.225% at supply=45 | `match-engine`, throwaway diagnostic run directly against `@ff/engine`, 40 seeds | **COMPUTED** |
| Reconstruction **exclusion boundary** 34.5% / 22.2% (any `scramble` CHECK, incl. failed attempts) | calibration's reclassifier; re-run by `match-engine` at 36.371% / 23.017% | **COMPUTED ×2**, values differ by run size |
| `ArrivalClock` was typed weaker *"rather than handed a fabricated origin"* | `resolve/rushThreat.ts` doc comment | **READ** — and the code it describes was **COMPUTED**-verified |
| `ThreatOrigin`'s four members exist to distinguish *which player and why* (ADR-022 petition 5) | ADR-022 | **READ** |
| Proposed event **name** `QB_PURSUIT` | Orchestrator | ⚠ **NEITHER** — a naming choice, flagged as such in §5 |

**Neither collapse question went the petition's way by luck.** Both were live, and both were tested.

---

## 1. Need

**The event stream is the single source of truth (Charter §3). For §8.8's pursuit clock, it is not.**

When a quarterback escapes the pocket, the engine builds a pursuit clock and **suspends the §7.1 line
battle entirely** — every matchup's `pressure` resets to `0` and `previousBand` to `undefined`
(`passPlay.ts:912-917`). From that tick until the play ends, two of `pocketStatusFor`'s three channels
are pinned at `CLEAN` by construction, so:

> ### **The pursuit clock is the SOLE determinant of `POCKET_STATUS` on every scramble tick — and no event describes it.**

**It is a correctness petition, not a convenience one**, and the fact-finding tested exactly that:

- **`rusher` and `rollRef` are never reconstructible** from the published stream under any
  circumstances. Nothing names an actor or a roll for those ticks.
- **The numeric ETA is reconstructible only by coincidence.** Under today's tunables
  (`collapsingWithinSeconds=1.0`, `tickStepSeconds=0.5`, `pursuitSeconds=1.5`) the grid aligns, so a
  consumer can *usually* back out the deadline from where `IMMEDIATE` first appears. ⚠ **That is a
  property of four current numbers, not a contract** — it breaks when the play ends on a `THROW`
  before `IMMEDIATE` (common: the QB throws from outside structure without tucking), and it breaks
  the moment any threshold moves off the 0.5s grid. **A calibration sweep would break it on purpose.**

**The cost is being paid now.** Every stream-based reconstruction must exclude these plays — **34.5%
of dropbacks at supply=15, 22.2% at supply=45.** ⚠ And the excluded population is **scrambles**,
which is *where the pursuit clock and the pocket interact most*: not 30% missing at random, but **the
population most likely to differ**, removed from exactly the measurements that study it. Roadmap 1d's
channel-share measurement is blocked behind this for that reason.

---

## 2. ⛔ The finding that decides the shape — and nobody asked for it

The brief asked whether the honest vocabulary was a fifth `ThreatOrigin`, a separate event, or a
widened `RUSH_THREAT`. **The answer came from a fact outside all three options.**

`activeThreats` (`passPlay.ts:1484-1507`) synthesises the pursuit clock as:

```ts
const chaser = matchups[0];          // ⛔ arbitrary array order
return [{
  rusher: chaser.rusher.bio.id,      // ⛔ NOT "the man chasing him"
  alignment: "EDGE",                 // ⛔ hardcoded literal
  wonAtTick: scramble.sinceTick,     // ✅ real
  etaTick: scramble.pursuitAtTick,   // ✅ real
  rollRef: scramble.escapeRollRef,   // ✅ real
}];
```

`matchups[0]` is **not** the nearest threat and **not** necessarily the man who forced the scramble —
it is array order. `"EDGE"` is never read for its value during a scramble. The code documents them as
a *"single threat so status derivation and arrival stay one code path"* — **a structural convenience,
never a claim about football.**

> ### ⚠ SO A `RUSH_THREAT`-SHAPED PUBLICATION WOULD PUBLISH A FABRICATED ACTOR IDENTITY — even with a perfectly honest fifth origin.
>
> **The defect ADR-036 and ADR-022 exist to prevent would not be avoided. It would be RELOCATED —
> from `origin` to `rusher`/`alignment`** — and it would be *harder* to see there, because those two
> fields are honest on every other `RUSH_THREAT` in the stream.

That is the sentinel pattern arriving in a **vocabulary**: three real fields and two placeholders,
published under a shape whose whole contract is that all five are facts.

---

## 3. Proposal — a new event, carrying only what is real

```ts
| { type: "QB_PURSUIT"; payload: {
      sinceTick: number;      // the tick the QB left structure
      deadlineTick: number;   // the tick pursuit forces the ball down
      rollRef: string;        // §8.8's escape roll — already on the stream as a CHECK
  } }
```

**No `rusher`. No `alignment`. No `origin`.** It states exactly what the engine knows and nothing it
does not — *the quarterback left structure at this tick, pursuit forces the ball down at this tick,
and this roll put him there.*

**Rejected, with reasons:**

| option | why not |
|---|---|
| **fifth `ThreatOrigin` member** | ADR-022 ratified `origin` at **individual-actor granularity** — *which player, and why*. An honest fifth word does not repair the two fields around it. |
| **`origin` made optional** | ADR-036: an absence must look like an absence. `T \| undefined` invites `?? default` and re-opens the not-published-versus-not-applicable ambiguity. |
| **widened `RUSH_THREAT` in any form** | inherits the `rusher`/`alignment` fabrication regardless of how `origin` is handled. |

**This is the widen-or-add rule arriving at a vocabulary boundary: they are two kinds of object that
share a shape, so the answer is ADD.**

⚠ **A single publication suffices** — unlike a blocked rusher's `TRAVELLING`/`DELAYED`/`RESET`/`ARRIVED`
lifecycle, the deadline never moves once set (nothing runs step-up logic while `scramble !==
undefined`). **COMPUTED.**

---

## 4. Impact, and the publication-versus-mechanism boundary

**Every published value exists at the emission site before this change** — the explicit test the owner
asked for:

| field | already computed? |
|---|---|
| `sinceTick` | ✅ `tick` |
| `deadlineTick` | ✅ `pursuitDeadline(tunables, tick)` |
| `rollRef` | ✅ `escape.check.roll.rngLabel`, whose CHECK is already emitted |

**No new roll. No new computation. Determinism and replay unaffected** — an additive log call with no
read-back into simulation logic; same seed, identical numeric play, one more event in it. **COMPUTED.**

> ### ⛔ AND THIS IS EXACTLY WHERE THE PETITION COULD HAVE DRIFTED
>
> *"Publish a fact already computed"* is **false of `rusher`/`alignment`** — they exist as values but
> not as facts. **Asking contracts for a believable actor would require the engine to compute a real
> nearest-pursuer that does not exist today: a MECHANISM CHANGE wearing a publication petition's
> price tag.** It would feel like completing the work rather than expanding it, which is precisely
> why it is named here and refused.
>
> If a future mechanism gives the engine a genuine chasing-defender identity, **that** is when a
> `RUSH_THREAT`-shaped event with a real fifth origin becomes honest. **Different petition, larger,
> and not this one.**

**Consumers:** `calibration` drops its scramble exclusion for stream-based pocket reconstruction —
unblocking roadmap 1d. No existing consumer changes; this is additive.

---

## 5. Open items for the ruling

1. ⚠ **The name `QB_PURSUIT` is the Orchestrator's, and it is the one item here with NO provenance.**
   `PURSUIT_CLOCK` was the alternative. Flagged rather than absorbed.
2. **A precision the ADR should probably state**: the pursuit clock **governs 19.013% / 14.225%** of
   dropbacks; the **34.5% / 22.2%** figure is calibration's *exclusion boundary*, which correctly
   also drops failed escape attempts (where the clock never starts) because a reclassifier cannot
   know in advance which attempts succeed. **Both are right; they answer different questions**, and
   the urgency argument holds on either.

## 6. Decision

*Owner ruling pending.*
