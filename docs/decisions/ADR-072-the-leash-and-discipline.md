# ADR-072 (DESIGN): The leash and discipline — ADR-068 step 2

- **Date:** 2026-10-15
- **Proposed by:** Orchestrator, building ADR-068 step 2 in the order ADR-069 §10 ruled
- **Status:** **accepted; built and measured (§10); merged to main** — the owner chose to have it
  built and measured before ruling on it *(owner, 2026-10-15: "#2 yes to the three contracts")*, and
  with that said yes to the three contracts edits in §4. §9 ruled yes on all four, as recommended
  *(owner, 2026-10-15/16, decision cards)*, with the merge.
- **Builds on:** ADR-068 (rulings 1–5; §4's leash and quadrant; step 1's re-order), ADR-070 §3 (what a
  fooled quarterback believes), ADR-069 §10 ruling 3 (the leash comes after the corner looks).
  Nothing is reopened.

---

## 0. What the owner is deciding

ADR-068 ruled that the pre-snap phase is **read, then decide, within a leash**; that the leash is a
**0–100 slider** set by the coach (ruling 3); and that every player gets a **`discipline`** rating
(ruling 2). It left one thing to this step: *which decisions open at which point on the slider.*
This ADR proposes:

- **the slider is a ladder**: each pre-snap decision opens at its own point, and step 1's one
  decision, the re-order, becomes two rungs (§1);
- **discipline decides a breach**: when a quarterback's read wants a decision above his leash, one
  roll says whether he stays inside it (§2);
- **the leash rides on the pass call**, set by the coach, and the calibration caller sets one
  league-wide value that leaves main's numbers exactly where they are (§3);
- **the contracts change**, approved by the owner ahead of this ADR (§4);
- **the measurement**: the leash across the owner's quadrant, with its predictions written before any
  arm runs (§5).

---

## 1. The ladder

**The leash governs decisions** — the things the offence changes before the snap. It does not govern:

- **perception.** A fooled quarterback still sees the shown hole when he reads that man (ADR-070 §3).
  A short leash keeps him from chasing it, not from believing it.
- **the call's own answers.** The hot routes a recognised blitz converts (ADR-022) are authored on the
  card, so they are the call, at rung 0. ADR-068 §4's old NONE level said the same: *"run the call;
  only hot routes the protection forces."*

| opens at | decision | in the tree |
|---|---|---|
| **0** | Run the call, with the hot routes its protection forces | ✅ ADR-022 |
| **20** | **Work away** — a man his read says is covered goes to the back of his progression | ✅ half of step 1's re-order |
| 30 | Protection adjustment: slide to the pressure, keep the back in | ⛔ ADR-068 step 3 — *provisional* |
| **40** | **Work to** — a man his read says is open goes to the front | ✅ the other half |
| 50 | Sight adjustment on one route | ⛔ step 4 — *provisional* |
| 60 | Check-with-me | ⛔ step 6 — *provisional* |
| 70 | Hard count | ⛔ step 7 — *provisional* |
| 80 | Audible | ⛔ step 6 — *provisional* |
| 90 | Motion | ⏸ held (ADR-068 §8) — *provisional* |

**Only the bold rungs are proposed here.** The provisional ones are listed so the slider can be read
whole; each is ruled with its own step. Read that way: **0 to 19**, run it as called; **20 to 39**, he
may work away from what he reads as covered; **40 and up**, he may also work to what he reads as open
(today's behaviour); **60 and up**, the play itself, once those decisions exist. ADR-068 §4's
superseded three levels sit roughly at NONE 0–19, LIMITED 20–59, FULL 60–100.

**Why the re-order splits in two.** Working away from a covered man keeps the call's intent: the ball
still goes where the call sends it, to the next man. Working to a man he likes changes where the ball
is going. Coaches give the first to a young quarterback (*"if the corner squats, skip the hitch"*) long
before the second (*"pick the matchup you like and go there first"*).

**What step 1's two outcomes do at each leash** (unless he breaks it, §2):

| his read | what it wants | leash 0–19 | 20–39 | 40 and up (today) |
|---|---|---|---|---|
| **sees through** | traps last (work away); hidden men first (work to) | as called | traps last | both |
| **fooled** | traps first (work to); hidden men last (work away) | as called | hidden men last | both |
| neither (adequate, partial) | nothing | as called | as called | as called |

⚠ **The middle band is not symmetric, and should not be.** There, a fooled quarterback stops chasing
the shown hole but still gives up on the man the look hid; one who sees through stops wasting time on
the trap but does not go hunting the hidden man.

---

## 2. Discipline decides a breach

- **When.** Only when his read wants a decision whose rung is above the leash. No such decision, no
  roll (ADR-005). At a leash of 40 or more, today's ladder has no rung above it, so nothing is ever
  rolled — which is what makes §3's default inert.
- **The roll.** `d100 + Discipline + breach ÷ 2` against **100**, where **breach** is the highest rung
  his read wants minus the leash. He **holds** the leash if the total reaches 100.
- **Held:** he makes the decisions at or below the leash and none above it. **Broke:** he makes every
  decision his read wants, exactly as step 1 does today. **One roll per snap**, not one per rung.

So Discipline is close to his chance of holding a leash he wants to break, and a bigger breach is
harder to commit:

| Discipline | breach 10 | breach 20 | breach 40 |
|---|---|---|---|
| 20 | 26% | 31% | 41% |
| 60 (the flat league) | 66% | 71% | 81% |
| 95 | 100% | 100% | 100% |

**Full rating, not ÷5.** The match doc's ÷5 is for a contest between two players' skills; this is one
man's disposition against his coach's instruction. At ÷5 the best and the worst discipline in the
league would hold the leash at rates under 20 points apart, and the owner's quadrant (*"discipline
matters most here"*) could not show. The divisor is a tunable, so calibration can move it.

**What the stream says.** The roll is a `PRESNAP_READ` of a new kind, `leash_discipline`, band `HELD`
or `BROKE`, after the coverage read it answers (ADR-004: recorded once). `PLAY_START.offense` carries
the leash he played under (100 when the call states none); its `readOrder` stays the progression he
actually worked. Half the breach is its own modifier on the roll, named with the breach's size, so
the rung he wanted is the leash plus that size, read off the stream (Iron Rule 3). The printout names
the rung he wanted and whether he held.

**Its own die.** The roll draws from its own address (`leashDiscipline`, a fork of the pre-snap
stream), so a change of leash moves no other roll in the game: the same seed under two leashes is
the same luck, and a test holds it to that.

---

## 3. Where the leash lives

- **On the pass call:** `OffensivePlayCall.leash?: number`, a whole number from 0 to 100. The call is
  already the coach's decision — `OffensiveCallRequest` carries `authority: "COACH"` — so the leash
  carries Iron Rule 6's tag without a decision type of its own. **Omitted means 100**, every decision
  open: what a call has meant since step 1, so every call the tree already builds keeps its meaning.
- **Who sets it.** In the game, the gameplan: the human sets it, and an NPC coach derives it from his
  attributes and his read of his quarterback (ADR-068 §4); the caller stamps it on each call. That is
  the franchise domain's, later. Because it rides the call, a coach can loosen it for a two-minute
  drill with no new field.
- **In calibration.** The frozen caller is coach-agnostic by design (`coaching-staff.md` §4.3), so it
  stamps **one league-wide leash, 50**, a mid-slider coach, on every pass call. At 50 both of today's
  rungs are open, so the default changes no play and main's numbers do not move (proved twice, §7).
  Any other leash is a measurement knob, like ADR-069's mask catalogue: a report batch never moves
  it, and a caller set to another leash says so in its identity (`v4/…/leash-20`), so two leashes are
  never silently compared. ⚠ The default is inert only against today's ladder: a rung above 50 would
  change what it plays, so that change must bump the caller's version.
- **Considered and not proposed:** on the team's game snapshot (once a game; a new engine input, and it
  cannot change by situation); on the player (the leash is the coach's decision, not the player's
  attribute; a gameplan can still hold one per quarterback and stamp it on his calls).

---

## 4. Contracts *(approved by the owner, 2026-10-15)*

1. **`discipline`** — a registry attribute, all positions, `mental`: *"stays inside his coach's
   instructions when his own read says otherwise."* `schemaVersion` 3 → 4, with `MIGRATION_V3_TO_V4`:
   one `add`, **no `defaultFrom`**. Nothing in the tree measures discipline, and seeding it from
   awareness would tie the two together by construction; a map without it reads `getAttr`'s 50, league
   average, until the attributes pipeline derives it (`attributes.md` §3 names pre-snap penalty rates as
   its source). It is not `gapDiscipline`, which is the line's and the backers' run-fit knowledge.
   Its `introducedIn` is 4, the schema version that added it (`contracts.md` §2).
2. **`OffensivePlayCall.leash?: number`** — as §3.
3. **`CheckKind` `"leash_discipline"`** — §2's roll.

Nothing else: `PLAY_START`'s payload is `unknown` in contracts, so `offense.leash` there is the
engine's. No event type is added. The save format does not change: `SAVE_FORMAT_VERSION` versions the
file's layout, the registry's own `schemaVersion` gates the migration, and events are never saved.

The contracts guardian reviewed the three (2026-10-15): they stand as approved, no fourth edit is
needed, and two of its fixes are made inside them: `discipline`'s `introducedIn`, and a contracts test
that pins the bump (version 4 on both sides of the migration, one `add` with no default, a version-3
map coming through unchanged and reading 50, all ten position groups).

---

## 5. The measurement — the owner's quadrant

ADR-068 §6 set this step's target: **`int_rate` split by leash × discipline quadrant.**

- **Two leagues** of 8 teams, frozen caller v4, new seeds `adr-072:leash-arm`:
  - **the flat league** (every rating 60): leash **50, 20, 0** — the league-wide effect, with 50
    reproducing main;
  - **a designed league** (`calibration.md` §5.2 instrument 2) whose quarterbacks carry the quadrant,
    two teams to a cell: **Football IQ 20 or 95** (poor or good reader) × **Discipline 20 or 95**.
    Everyone else is 60. Leash **50, 20, 0**.
- **Football IQ alone moves the reader.** Awareness also feeds the blitz read, the read window and
  more, so moving it would change a dozen things at once. Football IQ also feeds anticipation and the
  look-off (§8.1, §9.4), which fits the quadrant's own label (*"good reader / decision-maker"*), and the
  comparisons that matter, one cell at three leashes, hold everything else fixed.
- **What the cells read**, on a +10 look (§5.1, computed): Football IQ 95 sees through 57% and is
  fooled 14%; Football IQ 20 sees through 42% and is fooled 29%; the flat league's 60, 50% and 21%.
- **Size.** Arms are cheap here, about a minute per 840 games per process, so each arm is **6,720
  games**, four times step 2's, halving the standard error.

**Predictions, written before any arm runs:**

1. **At leash 50 nothing is rolled**, so Discipline changes nothing: each reader's two discipline cells
   match. One `leash_discipline` roll at 50 is a bug.
2. **A closed leash wastes the good reader:** from leash 50 to 0, at Discipline 95, his completion on
   disguised dropbacks falls.
3. ⚠ **The quadrant says a closed leash protects the poor reader. I predict it costs him too, by
   less.** At Football IQ 20 he still sees through more often than he is fooled (42% against 29%), and
   ADR-070 §10 found the re-order's gain from seeing through outweighs its cost from being fooled. If
   his numbers improve when the leash closes, the fooled snaps matter more than the read rates
   suggest — and either way, whether the "protected" cell exists is the read balance ADR-070 §10 left
   unruled.
4. **Low discipline undoes the leash:** at leash 0, the Discipline 20 cells sit nearer their own
   leash-50 numbers than their Discipline 95 ones (they break about 6 times in 10).
5. **Small.** The re-order nets to about zero overall (ADR-068 §9, ADR-070 §10), so no league-wide
   number moves beyond 2 SE between any two flat-league arms; the quadrant cells are where it shows,
   if anywhere.
6. **Inert at the default:** leash 50 on the flat league reproduces main (caller v4, same seeds)
   number for number.

---

## 6. Build order

One step, landing together: the contracts (§4) with their tests; the engine (the rungs and the roll as
tunables, the re-order taking the decisions the leash allows, the roll, the stream, the printout, a
range check on the leash) with falsifier tests; the calibration caller's league-wide leash and its
identity, and the new check kind's row in the scale surface; the inertness proof (§7); the arms (§5),
reported in §10. The contracts cannot land first on their own: calibration's scale surface is keyed on
every `CheckKind`, so a kind with no row breaks its build (ADR-059's rule: contracts land with their
producer).

## 7. Inertness proof — REQUIRED (the default claims no change)

- **Algebraic:** at a leash of 40 or more, no rung of today's ladder is above the leash, so the
  decision set the re-order receives is the full one and no roll is made. The default is 50; an
  omitted leash is 100.
- **Empirical:** leash 50 on the flat league reproduces main's v4 accumulator on the same seeds, every
  number equal.

---

## Provenance of factual claims — REQUIRED

| claim | provenance |
|---|---|
| ADR-068's rulings 1–5, §4's leash and quadrant, §6's target metric | **REPORTED** — ADR-068 §4, §6, §8 (owner, October 2026) |
| The leash comes after the corner looks | **REPORTED** — ADR-069 §10 ruling 3 |
| The go-ahead to build before ruling, and the yes to the three contracts edits | **REPORTED** — owner, 2026-10-15 02:42 |
| The contracts review (the three stand, no fourth edit, two fixes inside them, two outside) and the fantasy review (nothing foreclosed; the stamp, the no-show default, discipline's pace, the trade fallback) | **REPORTED** — the contracts guardian and the fantasy advisor, 2026-10-15 |
| The save format is untouched by a registry bump; `SAVE_FORMAT_VERSION` versions layout, `registrySchemaVersion` gates migration, events are never saved | **COMPUTED** — `contracts/src/save.ts` |
| Calibration's scale surface is a `Record<CheckKind, …>`, so a new kind needs its row in the same change | **COMPUTED** — `calibration/src/knownTruth/scaleSurface.ts` |
| Step 1's re-order: seeing through puts hidden men first and traps last; fooled, the reverse; hot conversions lead either way; other bands keep the called order | **COMPUTED** — `reorderForCoverageRead`, `engine/src/sim/passPlay.ts` |
| A fooled read's belief is applied to the tracks apart from the order | **COMPUTED** — the `coverageRead?.fooled` block, same file |
| Hot routes convert only on a recognised blitz, from the card's specs | **COMPUTED** — `resolveHotRoutes`, `engine/src/sim/preSnap.ts` |
| §5.1's read: `d100 + Awareness÷5 + Football IQ÷5` against `50 + complexity`, six bands; d100 runs 1–100 | **COMPUTED** — `engine/src/resolve/coverageRead.ts`, `tunables.ts` `presnap.coverageRead`, `contracts/src/rng.ts` |
| The read rates per Football IQ (57/14, 42/29, 50/21) | **COMPUTED** — from that formula at Awareness 60 on a +10 look; the flat league's 21% fooled matches ADR-068 §9's measured 21% (**REPORTED** there) |
| Registry at `schemaVersion` 3; no `discipline`; `gapDiscipline` is OL, DL and LB knowledge; `getAttr` falls back to 50; an `add` without `defaultFrom` leaves the id absent | **COMPUTED** — `contracts/src/registry.ts` |
| No `CheckKind` for a discipline roll; `PLAY_START`'s payload is `unknown` in contracts | **COMPUTED** — `contracts/src/events.ts` |
| `OffensiveCallRequest.authority` is `"COACH"` | **COMPUTED** — `engine/src/game/types.ts` |
| The calibration caller stays coach-agnostic | **REPORTED** — `coaching-staff.md` §4.3 |
| Awareness feeds the blitz read, the read window, anticipation, the look-off and the coverage read; Football IQ feeds the last three | **COMPUTED** — a search of `engine/src` and `tunables.ts` for both ids |
| The flat league sets every active attribute to 60 | **COMPUTED** — `calibration/src/league/flat.ts` |
| Arms take about a minute per 840 games per process | **COMPUTED** — `seconds` in step 2's saved arms (`/mnt/project-files/arms/`) |
| The hold-rate table | **COMPUTED** — from §2's formula |
| The rungs at 20 and 40, and the provisional points | **CHOSEN — provenance NONE** (a football judgement) |
| The roll's form: full rating, half the breach, against 100 | **CHOSEN — INVENTED**; the arms measure it |
| The calibration default of 50 | **CHOSEN** |
| The names `leash`, `leash_discipline`, `HELD`, `BROKE`, "work away", "work to" | **CHOSEN — provenance NONE** |
| What coaches give young quarterbacks first | **CHOSEN — provenance NONE** (a football judgement) |
| The predictions' sizes | **INFERRED** — from ADR-068 §9 and ADR-070 §10 |
| §10's numbers | **COMPUTED** — the scratch arm harness (`/mnt/project-files/arms/adr072Arm.test.ts`), seeds `adr-072:leash-arm` (240 rounds) and `adr-072:leash-arm-2` (720 rounds), caller v4, 2026-10-15; saved as `/mnt/project-files/arms/adr072-*.json` |
| Leash 50 reproduces main, 2,771,091 numbers | **COMPUTED** — main's arm, captured on `adr-072:leash-arm` before the build, against leash 50's (`compare_main.py`, same folder) |
| Nothing but the leash's roll reads `discipline` | **COMPUTED** — a search of `packages/*/src` |

## Conjoined mechanisms — REQUIRED

**The ladder and the breach are separately priceable, and the arms price them apart:** the ladder alone
is a closed leash at Discipline 95 (nobody breaks); the breach is the same leash at Discipline 20
against 95; joint is Discipline 20 at leash 0 against leash 50. **The two rungs** are priced apart by
leash 20 against 0 and 50.

## Implied scope — REQUIRED

- **Run plays** have no pre-snap stage (`simulateRunPlay`), so no leash; a run/pass check (step 6)
  would be their first rung. `unruled`.
- **The defence's leash.** ADR-071 step 4's captain's live check is the defence's audible; a
  coordinator's leash on his captain would be the same slider on the defensive call. `unruled`.
- **Discipline's other readers:** pre-snap penalties (`snap_jump`, `penalty_check`, no producer yet) and
  the hard count against *"defender discipline"* (`match-engine.md` §16). Step 7. `unruled`.
- **The NPC coach's leash**, from his attributes and his perception of his quarterback (Spec #11,
  Spec #6). Franchise. `unruled`.
- **Setting the leash is a decision with its own tag.** The stamp rides the call's `COACH` authority,
  but choosing the gameplan's leash happens before the game: in franchise it is a `COACH`-tagged
  `Decision` (`contracts/src/calendar.ts`, Iron Rule 6). `unruled`.
- **Fantasy mode** (fantasy advisor, 2026-10-15: nothing foreclosed). A game's version stamp must name
  the ladder (the tunables digest covers the rungs and the roll), registry version 4, and the caller
  with its league-wide 50, because the default and an omitted leash are inert only against today's
  ladder; a human's leash is an input, recorded with the game. Once rungs at 60 and up land, an omitted
  leash (100) should not be fantasy's default for a manager who did not set one. Discipline's source
  is a low-confidence inference, so it should move slowly, season to season, not week to week. A
  gameplan that holds one leash per quarterback needs a fallback when the GM trades him. `unruled`.
- **A situational leash** (two-minute, red zone): the field allows it and nothing sets it. `unruled`.
- **Conviction** — a perfect read or a complete misread tempting him more than a good read or a misread
  — is not modelled. `unruled`.
- **The read balance** (ADR-070 §10) decides whether the quadrant's "protected" cell exists (§5,
  prediction 3). `unruled`.
- **Deriving discipline** in the attributes pipeline (pre-snap penalty rates). `unruled`.
- **The gameplan's slider** on screen. UI. `unruled`.
- **`gapDiscipline` and `discipline`** may correlate once both are derived; whether to merge them is
  calibration's kill/merge question. `unruled`.
- **Two contracts fixes the guardian found outside the three edits**, each needing its own yes:
  `jumping` and the four kicking attributes say `introducedIn` 1 (they came in at 2 and 3; nothing
  reads the field); and the contracts' `test` script runs no `tsc`, so a type-only contracts edit
  (edits 2 and 3 here) is pinned only by its consumers' compile. `unruled`.
- **A stale row found on the way:** the scale surface still calls `coverage_read` unimplemented,
  though step 1 built its producer. Calibration's, separately. `unruled`.

## Decision

**Accepted** *(owner, 2026-10-15/16)*. ✅ Rulings on §9, asked again in plain words
(`/mnt/project-files/design/ADR-072-questions-explained.md`) and answered on decision cards:

1. **The ladder — yes.** Work away opens at leash 20, work to at 40; later rungs stay provisional.
2. **The breach — yes.** One roll per snap: d100 + Discipline + half the breach against 100.
3. **The default — 50.** The calibration caller stamps a league-wide leash of 50 on every pass call.
4. **The measurement — accepted** as run (§10).

The owner also said yes to merging this once the four rulings matched the recommendations.

---

## 9. Questions for the owner

1. **The ladder.** The slider opens each pre-snap decision at its own point. Step 1's re-order becomes
   two rungs: **work away** from a man he reads as covered at 20, **work to** a man he reads as open at
   40. Later decisions' points are provisional and ruled with their own steps. Yes?
2. **The breach.** When his read wants a decision above the leash, one roll: Discipline plus half the
   breach, on a d100, against 100. Held, he does what the leash allows; broke, he does everything his
   read wants. Yes?
3. **The default.** The calibration caller puts one league-wide leash of 50 on every pass call, which
   leaves main's numbers where they are; in the game a gameplan sets it. Yes, or another default?
4. **The measurement.** §5's arms and predictions; the results are in §10. Accept, or ask for more?

---

## 10. Built and measured *(2026-10-15)*

**In short.** The default is inert, number for number, and the roll holds at the rates §2 computes.
On ADR-068 §6's target, `int_rate` on every dropback, no quadrant cell moves by more than 0.05 points
at any leash: the leash touches at most one dropback in six. Where it touches, **it trades**. It
spares a fooled quarterback the trap he would have worked to, and it costs one who saw through the
look the time he would have saved by working away from it. The good reader loses on that trade at a
leash of 0, and the poor reader comes out about even. **The two rungs split the trade:** working away
(20) carries what seeing through earns, and working to (40) carries what being fooled costs. So a
leash of 20 keeps the first and avoids most of the second.

**The arms.** Each arm ran on two seed sets, pooled to **26,880 games an arm** and 161,280 in all:
`adr-072:leash-arm` (6,720 games, §5's size) and `adr-072:leash-arm-2` (20,160, added when the first
set read too close to call in the reader cells; the two sets agree in sign on every effect below
that is beyond 2 SE, shown in bold).
Frozen caller v4; the flat league and the quadrant; leashes 50, 20 and 0. Every difference is a cell
against itself at 50: the same team slots, schedule and seeds, so only the leash differs. ± is one
standard error. "Disguised" is a dropback against a look; "seen through" and "fooled" are its read.

### The default is inert (prediction 6) ✅

Leash 50 on the flat league reproduces main's arm on `adr-072:leash-arm`, which was captured before
any of this code existed: **6,720 games, 2,771,091 numbers, 0 differ.** Every pass `PLAY_START`
carries leash 50, and no `leash_discipline` roll is made at 50 in either league, in 53,760 games.

### The roll does what §2 says

| Discipline | leash 20 (a breach of 20) | leash 0 (a breach of 20 or 40) |
|---|---|---|
| 20 | 31.1–31.6% held (§2: 31%) | 35.4–36.7% (§2: 31% and 41%) |
| 60, the flat league | 71.0% (71%) | 75.8% (71% and 81%) |
| 95 | 100% (100%) | 100% (100%) |

At a leash of 0 the roll comes on 16.6% of dropbacks, about 15 a game; at 20, on 8.0%, about 7.

### The target: `int_rate` by quadrant, every dropback (% of attempts, ±0.022)

| quarterback | leash 50 | leash 20 | leash 0 |
|---|---|---|---|
| poor reader, undisciplined (Football IQ 20, Discipline 20) | 1.943 | 1.934 | 1.921 |
| poor reader, disciplined (IQ 20, D 95) | 1.995 | 1.994 | 1.971 |
| good reader, undisciplined (IQ 95, D 20) | 1.970 | 1.979 | 1.965 |
| good reader, disciplined (IQ 95, D 95) | 1.994 | 1.977 | 1.952 |

**League-wide, nothing moves (prediction 5) ✅.** On the flat league, every dropback: completion
37.28 / 37.30 / 37.23% and `int_rate` 1.979 / 1.963 / 1.952% at 50 / 20 / 0 (±0.04 and ±0.011). The
largest move is `int_rate` at 0, −0.03 points (1.7 SE).

### Where it shows: the snaps the leash can touch

Disguised dropbacks whose read saw through the look or was fooled by it, each against itself at 50
(points; SE in brackets):

| quarterback | leash | seen through: completion | seen through: int | fooled: completion | fooled: int |
|---|---|---|---|---|---|
| flat (D 60) | 20 | −0.03 (0.2) | +0.08 (1.8) | +0.26 (1.1) | **−0.34 (4.0)** |
| flat (D 60) | 0 | **−0.77 (4.8)** | +0.09 (2.0) | −0.19 (0.8) | **−0.46 (5.5)** |
| good reader, disciplined | 20 | −0.13 (0.4) | +0.09 (1.1) | +0.20 (0.4) | **−0.54 (2.7)** |
| good reader, disciplined | 0 | **−1.18 (3.9)** | +0.04 (0.4) | −0.61 (1.1) | **−0.68 (3.4)** |
| poor reader, disciplined | 20 | +0.20 (0.6) | +0.16 (1.6) | +0.55 (1.4) | **−0.54 (3.6)** |
| poor reader, disciplined | 0 | −0.37 (1.1) | +0.10 (1.1) | +0.10 (0.3) | **−0.69 (4.7)** |
| good reader, undisciplined | 0 | −0.50 (1.7) | +0.03 (0.4) | −0.02 (0.0) | −0.20 (1.0) |
| poor reader, undisciplined | 0 | −0.30 (0.8) | −0.01 (0.1) | −0.19 (0.5) | −0.20 (1.4) |

- **Seen through, a closed leash costs completions, and almost all of it at 0, not 20.** Working away
  from the trap is where seeing through earns, and 20 still allows it: the flat league gives up
  0.03 points at 20 against 0.77 at 0, and the good reader 0.13 against 1.18.
- **Fooled, a closed leash saves interceptions, and most of it already at 20.** Working to the shown
  hole is where being fooled costs, and 20 already closes it: about three quarters of leash 0's
  saving (flat 0.34 of 0.46; the disciplined readers 0.54 of 0.68 and 0.54 of 0.69).
- **The price of 20 is the hidden man.** Seen through, he may not bring the man the look hid to the
  front, and throws 0.08 to 0.16 points more interceptions on those snaps: positive in all three
  leash-20 rows, though inside 2 SE in each.

On all disguised dropbacks, the net (completion, then int):

| quarterback | leash 20 | leash 0 |
|---|---|---|
| flat (D 60) | +0.03 (0.3), −0.04 (1.4) | **−0.26 (2.8)**, **−0.07 (2.3)** |
| poor reader, undisciplined | −0.08 (0.4), −0.02 (0.4) | −0.21 (1.1), −0.07 (1.2) |
| poor reader, disciplined | +0.14 (0.7), −0.07 (1.2) | −0.24 (1.2), **−0.12 (2.1)** |
| good reader, undisciplined | −0.01 (0.0), −0.01 (0.2) | −0.29 (1.5), −0.04 (0.7) |
| good reader, disciplined | −0.12 (0.6), −0.03 (0.5) | **−0.56 (2.9)**, −0.09 (1.6) |

### The predictions

1. **At 50 nothing is rolled** ✅, so a reader's two discipline cells are the same quarterback, and
   they agree within noise. The largest gap, 0.13 points of `int_rate` on disguised dropbacks between
   the poor reader's two cells (2.2 SE), is two different sets of games: nothing but the leash's roll
   reads `discipline` (a search of `packages/*/src`). It is also this report's noise floor. A
   difference near 2 SE here can be chance.
2. **A closed leash wastes the good reader** ✅: −0.56 points of completion on disguised dropbacks at
   0 (2.9 SE), and −1.18 on the snaps he saw through (3.9 SE). At 20, −0.12 (0.6 SE).
3. ⚠ **The poor reader: half right.** At 0 a closed leash does cost him completions, by less than half
   the good reader's (−0.24, 1.2 SE), as predicted. But it also saves him interceptions (−0.12, 2.1
   SE), which I predicted would not net out in his favour. At 20 he loses nothing measurable (+0.14
   completion, −0.07 `int_rate`). So the quadrant's protected cell exists in a weak form, *a short
   leash costs the poor reader nothing*, not *a short leash makes him better*. Across all his
   disguised dropbacks, his only number beyond 2 SE is the interception saving at 0.
4. **Low discipline undoes the leash** ✅: where the effect is big enough to see, the Discipline 20
   cells move about a third as far as the Discipline 95 ones, close to their 35–37% hold rate at 0.
   The good reader's completion on seen-through snaps moves −0.50 against −1.18; fooled
   interceptions move −0.20 against −0.68 (good reader) and −0.20 against −0.69 (poor reader).
5. **Small, league-wide** ✅: above.
6. **Inert at the default** ✅, exactly.

### What it means for §9

- **Question 1, the ladder.** The order is borne out. Working away, placed lower, is the decision
  whose loss costs a good reader; working to, placed higher, is the one whose use costs a fooled one.
  A coach who trusts his quarterback's eyes but not his conviction would set 20.
- **Question 2, the breach.** The roll measures as computed, and discipline separates the cells by
  about its hold rate.
- **Question 3, the default.** 50 is inert, proved twice (§7). For what it is worth, 20 would move the
  flat league's numbers by nothing measurable (completion +0.03, `int_rate` −0.02, both inside
  1.1 SE) while rolling on 8% of dropbacks and holding him on most of those; it is not proposed,
  because only 50 leaves main's numbers exactly where they are.
- **Question 4, the measurement.** Run at four times §5's size. Nothing here asks for more, but the
  reader cells' net effects sit inside 2 SE, so a later ruling that rested on them would want a
  bigger arm.
