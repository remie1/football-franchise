# FANTASY GATE — PHASE 1 (ENGINE)

**Advisor:** `fantasy-advisor` (D9, read-only)
**Occasion:** Phase 1 engine half complete; game-loop dispatch pending
**Date:** July 2026
**Reviewed:** ARCHITECTURE_CHARTER.md (§1.2, §3-D9, §5, Amendment Log incl. #6),
`docs/design/fantasy-brief.md`, ADR-001 through ADR-013, CALIBRATION-BACKLOG.md, all of
`packages/contracts/src`, `packages/engine/src/{types,index,events}.ts`,
`src/sim/{play,passPlay,runPlay}.ts`, `src/validate/playCall.ts`

---

## 1. Verdict

**Fantasy-viable, and more so than at the Phase 0 gate.** Nothing built or ratified in Phase 1
forecloses any of Shapes A, B or C. Two of the brief's four red lines were actively
strengthened rather than merely not-crossed: the engine is genuinely stateless across plays
and takes its whole view of the world — rosters, attributes, chemistry — as a per-call
snapshot, which answers watch item #1 ("does the engine cleanly accept mid-season roster and
stat updates?") with an unqualified yes; and ADR-008 established, for a reason having nothing
to do with fantasy mode, the exact delivery pattern a weekly re-sync needs (derived state
computed on the franchise clock, handed to the engine resolved and read-only, absent ⇒ neutral
⇒ unchanged behaviour). The PRNG is a hash-addressed fork tree rather than a linear stream,
which means partial re-simulation is a property the project already has and does not know it
has.

**The risk is entirely prospective and entirely in the next dispatch.** The game loop is where
possession, clock, drive state and per-player statlines get their shape, and three plausible,
natural implementation choices there would each be expensive to reverse.

---

## 2. Foreclosing findings

**Nothing in the code or the eleven ADRs is foreclosing.** The three findings below are
foreclosure risks in the *pending* game-loop dispatch, which is why this memo was commissioned
now.

### F1 — Statlines produced by an internal accumulator rather than a reducer over the stream

**What it forecloses.** Fantasy scoring — under every shape — is per-player weekly production
compared against the real box score and against league-mates. If the game loop's result carries
statlines assembled by an accumulator running alongside the simulation, the single number the
entire mode is judged on is not derivable from the event stream. Charter §5's replay promise
would cover the simulation but not the score. A re-synced week could not be re-scored and
verified; head-to-head disputes would be unauditable — the one thing determinism was supposed
to buy for free.

**Why reversal is expensive.** By the time it is noticed, calibration, the UI play log,
franchise season stats and narrative triggers all read the blob. Replacing it means changing
four consumers and re-validating every baseline computed from it. It is also a Charter pillar-3
violation (side-channel game facts) that will not announce itself — the numbers will look
right.

**Cheapest prevention.** Statlines are a pure `(readonly MatchEventEnvelope[]) → StatLine[]`
reducer, exported as a fifth named category on the ADR-012 barrel, with a test asserting that
whatever the game loop returns equals the reducer's output over the events it returned. If the
two can disagree, one of them is a side channel. ADR-010's separation of `RUSH_ZONE` from
`YAC_ZONE` already did the hard half — rushing and receiving are separable from the stream
today.

### F2 — `gameId` minted from a counter or a clock rather than derived from schedule coordinates

**What it forecloses.** The play fork label is `game:{gameId}` → `play:{n}`, so a play's random
stream is a function of `(seed, gameId, playNumber)`. That survives only if `gameId` is stable
across re-derivation. Mint IDs from a monotonic world counter (or a timestamp) and re-running
week 3 with replaced inputs is either not reproducible, or — if the schedule is ever
regenerated — every downstream game's ID shifts and the season's streams change. Weekly re-sync
*is* "replace this week's inputs and re-run"; it becomes unaddressable.

**Why reversal is expensive.** IDs end up in save files, persisted game summaries, narrative
references and any eventual league-shared record. Re-keying them later is a save migration.

**Cheapest prevention.** Derive `gameId` deterministically from stable schedule coordinates
(season, week, home, away, plus a replay ordinal if a game can be re-run). This does not
violate `ids.ts`'s opacity rule — nobody *parses* the ID; the minter derives it. And record the
exact seed string used on the persisted game summary. One field.

### F3 — Possession, score and drive boundaries existing only in `newState`, never in the stream

**What it forecloses.** Today both simulators compute the possession/down/distance/spot
transition privately (`applyOutcome` at `passPlay.ts:1497`, `applyRunOutcome` at
`runPlay.ts:384` — two independent copies of the same rules) and emit nothing about it.
`PLAY_RESULT` carries `{yards, turnover, score?, clockRunoff}`. A consumer holding only the
stream cannot say who had the ball, when a drive ended, or what the score was at any point.
If the game loop follows that precedent:

- Fantasy's "your decisions vs. reality" comparison is a *diff of two games*. A diff over
  streams containing neither possession nor score is not a comparison of games; it is a
  comparison of yardage.
- Shape A ("coach your version of this week's real matchup, score it against the real result")
  has nothing to compare, because the real-world side is a drive chart and a scoreboard.
- The two duplicated transition functions become three, and a replayed game can produce a
  different final state from the same event stream if the versions ever diverge — replay
  integrity fails silently.

**Cheapest prevention.** Possession changes, drive boundaries, period boundaries and scoring
are stream facts. Add them as events (ADR-010: widen or add, never overload) in the same
petition that introduces the loop. Not a fantasy-specific ask — ADR-007's reconstruction test
applied one level up — but fantasy is where its absence becomes unrecoverable.

---

## 3. Constraints on the game-loop dispatch

Items marked ★ are the F-findings above.

1. **★ Same shape as the play loop: `(GameState, inputs, seed) → {events, newState}`.**
   Everything the loop needs lives in the returned state — flat, `readonly`, serializable,
   complete. Not in instance fields, not in a closure, not in a generator's suspended frame.
   Weekly re-sync requires constructing a game from scratch, running two variants of a week
   side by side, and re-running a completed game with replaced inputs; a loop whose state is
   not fully in its state object supports none of the three.
2. **★ Every random draw addressed by fork label, never by stream position.** Do not thread one
   mutable `Rng` forward across plays for the coin toss, penalties, injuries or clock. The
   current tree is hash-addressed: a play's stream depends only on its coordinates, not on how
   many numbers earlier plays consumed. A carried-forward `Rng` replaces that with a linear
   stream and destroys re-simulation locality — change anything at play 12 and every draw after
   it moves. New game-level draws get their own labels (`game:{id}/coin`,
   `game:{id}/drive:{k}/…`).
3. **★ `gameId` derived from stable schedule coordinates; the seed string recorded on the
   persisted game summary.** (F2.)
4. **★ Possession, drive start/end, period boundaries and scoring are events, not just state
   deltas.** (F3.)
5. **★ Per-player statlines are a pure reducer over the returned stream, with an equality
   test.** (F1.) The reducer is logic, so it belongs on the engine's barrel, not in contracts
   (`contracts.md` §10).
6. **Nothing may appear in `GAME_END` that is not derivable from the preceding stream.** Its
   payload is `{home, away}` today; whatever it grows must summarise facts the stream already
   carries — ADR-004's discipline at game scale.
7. **The world arrives as a per-game snapshot argument, not a world handle.** `players`,
   `chemistry` and whatever availability/condition bundle the loop needs are parameters of the
   game call. If the loop acquires a reference to a long-lived world object, brief §5 red line
   1 is crossed.
8. **State the engine derives in-game leaves as events; franchise applies it.**
   `STAMINA_DELTA` is the existing precedent. If in-game injuries land in the loop, they emit
   and franchise applies — the engine must never write back authoritative persistent player
   condition. Otherwise "does a real injury happen in your world?" stops being a re-sync policy
   decision and becomes an engine behaviour.

   > ### ⛔ CORRECTED BESIDE (backlog entry 98, August 2026) — **THERE IS NO PRECEDENT.**
   >
   > **`STAMINA_DELTA` HAS NO PRODUCER ANYWHERE.** ⚠ Verified by a derived sweep of the whole
   > contract surface: **zero occurrences across `packages/*/src` outside `contracts/src/events.ts`
   > itself.** Same for `ENV_APPLIED`. **No stamina or weather mechanic exists in the engine.**
   > *(`docs/design/contracts.md:256-257` also lists both in its event table as though shipped.)*
   >
   > ⛔ **THE ARCHITECTURAL PATTERN THIS ITEM CITES AS ESTABLISHED HAS NEVER BEEN EXERCISED — it is a
   > TYPE DECLARATION, not a precedent.**
   >
   > ⚠ **The GATE ITEM ITSELF STANDS: "the engine emits, franchise applies" is still the right rule,
   > and the red line it draws is unaffected.** ⛔ **What is withdrawn is the claim that it has been
   > DONE BEFORE.** **Whoever implements in-game injuries will be establishing the pattern, not
   > following it — which is a materially different amount of design work and is the reason this
   > correction matters at a phase boundary.**
   >
   > **Left standing rather than rewritten:** the wrong claim is the useful part, and this is the
   > class ADR-033's *"frequently `CLEAN`"* named — **an assertion that reads as established fact
   > because of where it sits.** ⚠ **Here it sits in a GATE DOCUMENT, whose entire purpose is to be
   > relied on at a boundary.**
9. **In-game decision points carry an `authority` tag.** Timeouts, fourth-down calls, two-point
   decisions, kick/receive, challenges — typed decision requests carrying `authority: "COACH"`,
   not a single untagged `onDecision(state)` callback. The tag is inert in v1 and costs one
   field; an untagged callback is the one shape that forecloses both split-authority
   single-player modes and coach-only fantasy variants.
10. **Resolve ADR-012's open item with, or before, the loop — toward an explicit `tunables`
    argument.** Fantasy reason: in a shared league, tunables version is part of league
    identity. Two participants' games are only comparable if simulated under the same tunables,
    and ADR-011's bands are free strings whose meaning moves with `TUNABLES`. A per-call
    argument makes the version pinnable and recordable; a module-level ambient constant makes
    it a property of whichever build each participant installed, which is unverifiable across
    machines.
11. **One owner for the possession/down/distance transition.** Two copies exist today. Two
    versions that drift produce two different `newState`s from the same event stream, which
    breaks replay verification — the thing head-to-head fairness rests on.
12. **No wall clock.** Currently clean. The game loop is where scheduling-shaped code lives and
    where a `Date.now()` is most tempting. `CalendarStamp` is an input and stays one.

**Explicitly not required, so the dispatch does not over-engineer it:** resuming a game from
play 40 without having run plays 1–39. `MatchGameState` at play 40 is only obtainable by
forward iteration, and that is fine — weekly re-sync replaces inputs and re-runs from the
opening kickoff. The requirement is that a *whole game* be re-runnable and addressable.

---

## 4. The eleven ADRs

| ADR | Verdict | Note |
|---|---|---|
| 003 `jumping` | Mild help | Exercised `MIGRATION_V1_TO_V2` end to end. Red line 3 (ratings patchable between weeks) now demonstrated, not just claimed. |
| 004 roll accounting | **Help** | A roll recorded exactly once makes a stat reducer over the stream well-defined. Without it F1's reducer would double-count and the accumulator would win by default. |
| 005 optional tier | Mild help | Absent means "no roll", never "failed roll" — a derived aggregate cannot mistake an unmade decision for a bad one. |
| 006 play-card validity | Constraining, net help | Under re-sync a card goes stale (an IRL trade removes a named blocker) and the engine throws rather than silently substituting. That loud failure is exactly the reconciliation hook re-sync needs. **Standing flag: never "fix" this by having the engine substitute a player.** |
| 007 pocket vocabulary | Neutral | Establishes the reconstruction test F3 applies one level up. |
| 008 chemistry ownership | **Help — strongest of the eleven** | The template for every world material fantasy would re-sync: derived state on the franchise clock, delivered resolved and read-only, absent ⇒ neutral ⇒ unchanged. That last property makes a *partial* live feed degrade gracefully. Counter-note: chemistry is a divergence **generator** — it accrues from your world's reps with no IRL counterpart to snap to. Shape C's central tension made concrete; it lands on the "your decisions persist" side of the line and the eventual spec should say so rather than discover it. |
| 009 tipped ball / zone | Neutral | Follows the no-stream-invalidated convention. |
| 010 widen-or-add | **Help — most valuable standing rule for fantasy** | A live weekly feed and a re-sync mechanism are exactly the late additions that tempt overloading an existing event. Separately, `RUSH_ZONE`/`YAC_ZONE` separation makes per-player rushing vs. receiving derivable from the stream — fantasy scoring's core requirement, delivered as a side effect of a run-game question. |
| 011 bands in the stream | **Help** | The stream became self-describing. Corollary carried into §3 item 10: because bands are free strings whose vocabulary moves with calibration, a shared league must pin a tunables version. |
| 012 domain-exercises-domain | **Help** | Establishes the gate a future live-feed or re-simulation module passes through, and the named surface is close to exactly what such a module needs. Barrel trim from ~90 exports to a dozen is a small, stable contact area. |
| 013 named payload unions | Mild help | A future shared-league client is a consumer; importing a named union beats restating it and drifting into a silent subset. |

**None of the eleven hurt or foreclose.**

---

## 5. Determinism and seeds — direct answer

**The current structure supports partial re-simulation natively, and this appears to be
accidental good fortune worth protecting.** `createRng(seed, label)` hashes `seed::label` and
`fork` recomputes from the full label path. There is no shared mutable counter between forks.
A play's random stream is therefore a pure function of `(seed, gameId, playNumber)`, unaffected
by how many numbers any earlier play consumed. That is a counter-based / hash-tree PRNG, not a
linear stream, and it is exactly what "re-run week 3 with replaced inputs and leave week 4's
seeds untouched" requires.

Preserved by §3 items 2 and 3; destroyed by their violation. Order-dependence *within* a fork
exists and is harmless — deterministic given the inputs, and the inputs are the state.

---

## 6. Save format — direct answer

**"Games regenerate from `worldSeed` + inputs" holds mechanically and stops holding
semantically the moment inputs are external.** Under fantasy mode the inputs include real-world
results that did not exist when the save was written, so regeneration is only sound if the save
records *which* feed version was in effect for each already-played week. Otherwise re-opening a
save six weeks later regenerates week 3 against week 9's ratings and the record book changes
retroactively.

**Nothing forecloses this today.** ADR-002's `leagueContext?: unknown` is the reserved slot and
red line 2 remains removed. The thing to watch is elsewhere: `world.standings`,
`history.seasons` and `history.transactions` are all `unknown` and get typed by franchise in
Phase 4. When they are typed, the per-completed-game record should carry the seed string used
and a feed/tunables version stamp. Two fields, free at typing time, a save migration
afterwards.

**Phase 4 franchise-gate note, not a Phase 1 action.** Recorded so it is not rediscovered.

---

## 7. Same-franchise multiplayer

Nothing new forecloses it. The engine takes no authority tag and correctly should not — a play
call is COACH authority by definition and the engine is a resolver, not an arbiter of who may
call it. `Decision<T, P>` still carries `authority` and `decidedBy`, untouched by Phase 1.
ADR-006 putting playbook ownership in franchise is if anything helpful: play-card authoring is
a COACH act and now lives in the layer that has tags.

The one prospective risk is §3 item 9 — an untagged in-game decision callback. Same fix as for
fantasy's coach-only variant, so one field serves both.

---

## 8. What I checked and found clean

- **PRNG** — hash-addressed fork tree, pure TS, no wall clock. Supports partial re-simulation.
  Stronger than the brief assumed.
- **No nondeterminism leaks** — all of `packages` grepped for `Math.random`, `Date.`,
  `performance.now`: zero hits outside the ban comment.
- **Engine statelessness across plays** — `simulatePlay(state, calls, seed)`;
  `MatchGameState.players` is a per-call `Readonly<Record<string, PlayerState>>`. Mid-season
  roster, rating and condition injection costs nothing. **Watch item #1 answered: yes.**
- **Graceful degradation on partial data** — `getAttr` falls back to 50; `ChemistryTable`
  absent ⇒ 50 ⇒ neutral. A partial live feed degrades rather than throws. Nobody designed this
  for that purpose.
- **Registry migrations** — `applyMigration` + `MIGRATION_V1_TO_V2` exist and are exercised.
  Red line 3 holds.
- **`SaveFile.leagueContext?: unknown`** present. Red line 2 remains removed.
- **Engine is calendar-blind** — `at: CalendarStamp` threaded in only to satisfy
  `EventEnvelope`; the engine never asks what time it is. Red line 4 untouched at engine level
  (the real test is franchise's calendar in Phase 4).
- **Engine barrel** — three entry points, ~25 types, the patch interface, the renderer. A
  small, stable contact area for any future re-simulation module.
- **No I/O, no globals** except the `TUNABLES` module constant, which ADR-012 already flags.
- **`LeagueRules` as data, not constants** — league structure is per-save, which a fantasy
  league mirroring real NFL structure will want. Incidental, useful.

---

*Filed under Charter §6 ("fantasy advisor reviews at every phase gate") and §3-D9.
Informational; blocks nothing.*
