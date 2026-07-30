# ADR-054 — The pursuit clock is a different kind of object, and publishing it as a threat would relocate the lie

**Date:** July 2026
**Proposed by:** Orchestrator, on `match-engine`'s fact-finding; raised from `CALIBRATION-BACKLOG.md` entry 58
**Status:** ✅ **RATIFIED AS PROPOSED** (owner, July 2026) — contract petition
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

## 5. Open items — both RULED

**1. The name `QB_PURSUIT` — RULED: keep it, recorded as CHOSEN, provenance NONE.**

Owner ruling, and the general form is worth keeping: **event names are named by someone; there is no
derivation available.** Marking it as the one provenance-less row was correct precisely because the
honest answer is *"chosen"* — a provenance table that only ever says `COMPUTED` is a table nobody
filled in honestly. It also reads accurately: **the subject is the quarterback being pursued, not a
threat with an origin**, which is exactly the distinction this event exists to make.

**2. The two percentages — RULED: keep BOTH, with the distinction written down.**

| figure | what it means |
|---|---|
| **19.013% / 14.225%** (supply 15 / 45) | dropbacks the pursuit clock **GOVERNS** — successful escapes, where the clock is live and is the sole determinant of `POCKET_STATUS` |
| **34.5% / 22.2%** | calibration's **EXCLUSION BOUNDARY** — every play carrying a `scramble` CHECK, *including failed attempts* where the clock never starts |

**Both are right and they answer different questions.** The exclusion boundary is correctly the wider
one: a reclassifier **cannot know in advance which escape attempts succeed**, so it must exclude the
attempt, not the outcome. ⚠ **Written down because someone will otherwise conflate them later** —
they differ by ~15pp and both describe "scrambles".

## 6. Decision

✅ **RATIFIED AS PROPOSED**, owner, July 2026. `QB_PURSUIT` as specified in §3 — `sinceTick`,
`deadlineTick`, `rollRef`, and nothing else.

**The ratifying reasoning, recorded because it settles the vocabulary question empirically rather than
by judgement:** *"A field that is a placeholder in one event type and a fact in all the others is
worse than a sentinel, because the surrounding rows vouch for it."* Three real fields and two
placeholders under a contract whose whole meaning is that all five are facts — **two kinds of object
sharing a shape, so ADD rather than WIDEN.** Promoted to Charter §4.1 with its operative test: **before
reusing an event shape for a new subject, check every field the shape requires, not only the one you
were worried about.**

**Implementation order:** (1) `packages/contracts` — the event, Orchestrator. (2) `packages/engine` —
emit at `passPlay.ts:900-905`, `match-engine`. (3) `packages/calibration` — drop the scramble
exclusion, then roadmap **1d**: *enumerate the three channels' shares before pricing any of them.*
