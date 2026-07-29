# ADR-039: The systematic scale audit — nineteen findings, and a register for the cells nobody asked for

- **Date:** 2026-07-29
- **Proposed by:** `calibration`
- **Status:** proposed — **findings are PRICED, not fixed.** Every ruling below is the owner's.

---

## 0. WHAT THIS IS, AND THE ONE THING IT IS NOT

Roadmap item 2 of the ratified order: the Phase 3 systematic sweep of every target number, threshold,
band boundary and modifier magnitude in `TUNABLES` against `docs/design/match-engine.md`, run against
instrumented surface (ADR-035/036/037's band gate, ADR-038's typecheck) rather than raw.

**It is not a tuning proposal.** No tunable is patched, no engine file and no contract file is
touched. Nineteen findings are stated with their doc citations and their reach; the owner rules.

---

## 1. SCOPE — CHOSEN, AND WHAT WAS EXCLUDED

### 1.1 In scope

**Every numeric leaf of `DEFAULT_TUNABLES`: 699 cells.** Not a sample, not the "interesting" blocks.
The register in `packages/calibration/src/knownTruth/docConformance.ts` classifies each against the
doc section it claims to implement, and `test/docConformance.test.ts` **asserts the classification is
total in both directions** — an unclassified leaf is red, and a rule matching no leaf is red.

**Every `CheckKind`: 44.** `packages/calibration/src/knownTruth/scaleSurface.ts` holds a
`Record<CheckKind, CheckDescriptor>`, so a check kind added to `@ff/contracts` **fails to compile**
until it is either described or declared unimplemented with a doc reference. Fifteen are declared
unimplemented; that is a finding in itself (§5).

### 1.2 Excluded, with counts and reasons — no silent caps

| excluded | size | reason |
|---|---|---|
| `game.*` — the loop, clock, scoring, special teams, default caller | **84 numeric cells** | `match-engine.md` specifies a PLAY. It has no drive, no clock between snaps, no kickoff, punt, field goal or scoreboard. There is no doc to conform to. Declared invention en bloc by the tunables comment and by backlog entry 19; still walked and still classified `OUT_OF_SCOPE`, so it cannot be confused with an omission. |
| string leaves | **283** | Attribute ids and closed vocabularies. `attrs.ts`'s load-time sweep already resolves all of them and `satisfies CheckKind` guards the rest; a string carries no scale. **§3's two spatial fakes are string-valued and therefore invisible to this audit** — they are backlog entry 8's, and a rule written for them was deleted when the totality gate reported it dead. |
| boolean leaves | **126** | Switches, not magnitudes. Several are load-bearing (`freeRunReachesGoalLine`, `grantsLaneContest`) and all are already backlog subjects. |
| `resultTierLadder` | 9 | Engine vocabulary; the doc has no universal margin ladder. Classified `STRUCTURAL`. |

**Nothing was dropped for cost.** The one place effort bound the result is *pricing*, not coverage —
see §4.3.

---

## 2. RIDER 1 — TRANSCRIPTION ARTIFACTS

**Eighteen cells, in eight places, classified `TABLE_SHAPE`: the value exists because the table's
rectangle demanded one, not because the doc specified one.**

For each: what the doc says, what the table holds, and which of the two proven failure directions it
is.

### SA-01 — §10.5's `MISS` row is three "N/A"s and the engine holds three zeros

| | |
|---|---|
| **DOC** | §10.5's accuracy→catch table, MISS row: `No catch possible \| N/A \| N/A` — the only row of seven whose three cells are all refusals. |
| **TABLE** | `throwExec.accuracy.bands[6]` = `catchMod: 0, defenderContestMod: 0, difficulty: 0`, plus `catchTransition.byAccuracyBand.MISS: 0` and `yacMultiplierByAccuracyBand.MISS: 0` in two more tables keyed by the same band. **Five cells.** |
| **DIRECTION** | **ADR-036's.** The doc said nothing and the engine transcribed a number. |
| **RAW** | **2,319 selections** of the `MISS` band, in 160 games / 29,973 plays. (Reach = band selections, the same measure the band gate floors its exemptions with.) |
| **EXCLUSIVE** | **0.** Proven by total comparison, not by sampling: each cell perturbed to an absurd value (0 → 77, 0 → −77, 0 → 7), the whole 160-game corpus re-run, **stream digest identical every time**. |

**This is fourteen times the reach of the cell ADR-036 removed** (163 publications). The band gate already
derives all three of the accuracy-table cells `GUARDED`, and ADR-035's staged falsification uses them
as its worked example — so the deadness was *known* and the doc reading was not.

### SA-16 — the cell ADR-036 left behind, in the row it emptied

| | |
|---|---|
| **DOC** | §12.3's eligibility grid, DEAD row: `None \| None \| None`. There is no candidate, so there is no distance at which one would need a speed check. |
| **TABLE** | `tippedBall.qualityBands[5].speedCheckFromDistance: 99`. |
| **DIRECTION** | **ADR-036's**, in the same row. |
| **RAW** | **699 selections.** |
| **EXCLUSIVE** | **0** — 99 → 0 leaves the corpus byte-identical. |

Milder than its sibling because 99 is *unreachable* on the zone-distance scale and therefore a legal
sentinel under §4.1, where `finalTargetNumber: 0` was a legal and **permissive** point on the target
scale. Same category — an answer to a question never asked — lower severity. The honest repair is the
one ADR-036 already ratified: the `DEAD` member of the union should not have the key.

### SA-18 — §13.1's zone 4 is `30+` and the table demanded a width

| | |
|---|---|
| **DOC** | `ZONE 1 (0-5) / ZONE 2 (5-15) / ZONE 3 (15-30) / ZONE 4 (30+ yards): Pursuit only`. Three closed intervals and **one open bound**. |
| **TABLE** | `ballCarrier.zones[3].widthYards: 30`, making zone 4 exactly 30–60. |
| **DIRECTION** | **ADR-036's.** |
| **PRICE** | **Already measured, and it is the largest yardage term in the project.** Backlog entry 12: `zones[4].widthYards 30→0` with `freeRunReachesGoalLine true→false` moves y/c **16.277 → 9.984, −6.293 = 52.6% of the gap**; singly −1.842 and −1.952, strongly super-additive. *Per attribution rule 3 that share is a statement about `DEFAULT_TUNABLES` at 496 games, seeds `baseline-0001` — not about §13.1.* |

**The most consequential artifact found.** Backlog 12 has always described it as a *geometry* problem
("zone 4 is unoccupiable from the line of scrimmage"). It is also a *transcription* problem, and that
reframing matters: the engine's rule "clearing a zone grants its full width" converts an open bound
into 30 free yards. There is no doc value to restore, because the doc gave none.

### SA-03 — §9.1's seventh row is prose and the delay column wanted a seventh number

| | |
|---|---|
| **DOC** | Six of §9.1's seven rows state a delay ("delayed 0.5 ticks", "Delayed 1.0 tick", "Delayed 1.5 ticks"). The seventh is `CB wins by 20+: Route disrupted, WR must improvise` — **prose, no delay**. |
| **TABLE** | `release.bands[6].delaySeconds: 2.0`. |
| **DIRECTION** | **ADR-036's.** |
| **AGGRAVATION** | §9.2's own timing-modifier list caps a jam at **"+0.5 to +1.0 ticks"**. Two rows exceed that envelope (1.5 and 2.0), so §9.1 and §9.2 also disagree — backlog entry 9's class. |
| **RAW** | **2,675 selections.** |
| **EXCLUSIVE** | **DECLINED.** The cell is READ, so a two-run diff is the only instrument, and a re-timed release changes the play → the down → the drive → every later play in that game. "Plays that differ" over-counts without bound; "games that differ" under-counts. Neither is an exclusive play count and neither is reported as one. |

The doc's own answer to "route disrupted" is §9.5's option-route mechanic ("WR must improvise"), which
is unimplemented. The 2.0 stands where a mechanic should.

### SA-04 — §7.2 states one read-capacity penalty and the status-keyed table produced three

| | |
|---|---|
| **DOC** | `POCKET PRESSURE: QB accuracy −10; QB processing: −1 read capacity`. **That is the only processing line in §7.2.** COLLAPSING's entry is "QB must throw, move, or take hit"; IMMEDIATE's is "Must decide THIS tick". Neither mentions processing. |
| **TABLE** | `pocket.readCapacityDelta` = `CLEAN: 0, PRESSURE: −1, COLLAPSING: −1, IMMEDIATE: −2`. |
| **DIRECTION** | **ADR-036's.** |
| **PROVENANCE, AND IT IS THE POINT** | **This table has form.** ADR-033 already deleted an orphan `SACK: 0` row from *this exact object*, and that row handed a quarterback in the worst pocket on the ladder **his full progression back**. The mechanism that produced the orphan is the mechanism that produced these two: a table keyed by a status ladder gets a value for every rung whether the doc gave one or not. |
| **RAW / EXCLUSIVE** | **DECLINED**, same propagation argument as SA-03. Both cells are read on every pressured tick, so raw is very large and exclusive is not derivable from a digest diff. |

### SA-07 — §9.2 gives DEEP a range and the table took the fast end

| | |
|---|---|
| **DOC** | `Quick: Ready at Tick 1.0 / Short: 1.5 / Intermediate: 2.0 / Deep (20+ yards): Ready at Tick 2.5-3.0`. Three single values and **one range**. |
| **TABLE** | `route.readySeconds.DEEP: 2.5`, with no note that a choice was made. |
| **DIRECTION** | **ADR-036's**, in its range-collapse form. |
| **WHY IT IS NOT COSMETIC** | It is half a second off the one Tier 1 metric that is a second and a half low. Backlog entry 24: corpus time-to-throw **1.147s against a real 2.682s**, with **88.3% of throws leaving before 2.0s** and the corpus's slowest concept (Four Verticals, 2.541s) still under the NFL mean. Taking the slow end of the doc's own range is the only movement available here that is not a tuning decision. |
| **EXCLUSIVE** | **DECLINED** — propagation, as above. |

### SA-12 — §10.1's table lost four rows including its strictest gate

| | |
|---|---|
| **DOC** | Six rows keyed by **throw type**: deep out (20+ yds) → **85**; deep post/corner (25+) → 80; comeback (18) → 75; seam → 80; across body to far side → 85; into 15+ mph wind → +10. |
| **TABLE** | `throwExec.armRequirements` keyed by **air yards**, two rows: `{25 → 80}, {18 → 75}`, first match wins. |
| **DIRECTION** | **NEITHER of the two proven ones — a third.** The doc's KEY met the table's KEY. Where ADR-036 was prose meeting a rectangle, this is a six-row table being re-keyed onto a two-row one, and four rows had nowhere to go. |
| **CONSEQUENCE** | **The 85 requirement does not exist anywhere in the engine.** A 20-yard out — the doc's own hardest throw — gates at 75. `seam` and `across body` have no representation at all. |

Recorded as `TABLE_SHAPE` because it is the same species of authoring loss and belongs with the
others; it is the one finding here where the artifact is what is **missing** from the rectangle.

### SA-R2 — RIDER 2's two cells, read against the doc and NOT RULED

Backlog 44 ruled the `minYards` halves no-change; ADR-037 refused to widen that ruling across
columns, on the ground that *"a broken tackle credits zero because the zone walk credits the yardage
separately"* is an argument about the **floor**. The audit was told to report what §13/§14 say about
the **ceilings** and stop. It does.

**`ballCarrier.contests.yac.bands.0.maxYards` (`DEFENDER_MISSED`), raw reach 1,647 selections.**

> §13.2 verbatim: `WR wins by 20+: Defender missed, advance to Zone 2`

The row names a **destination**, not a yardage. The three rows below it each state a quantity —
"gain 3-5 yards in zone", "gain 1-2 yards", "gain 0-1 yard" — and this one does not, in **either**
direction. **Verdict on provenance: demanded by the table's rectangle. Not specified by the doc.**

**`ballCarrier.contests.secondLevel.bands.0.maxYards` (`BROKEN_TACKLE`), raw reach 4,256 selections.**

> §14.4 verbatim: `RB wins by 15+: Broken tackle, continue`

The row names a **continuation**. The row below states "Partial tackle, gain 2-4 yards"; this one
states no quantity in either direction. **Verdict on provenance: demanded by the table's rectangle.
Not specified by the doc.**

**The distinction the register draws, and it is what makes this a report rather than a shrug.** Both
tables' *bottom* rows also hold `0/0` and they are **not** artifacts: "Tackled at catch point" and
"Tackled" fix the value by entailment — the catch point is where he is. So in each table exactly one
row's yardage is unspecified, and it is the winning one.

> **NO VALUE IS PROPOSED AND NO CHANGE IS RECOMMENDED.** The ruling is the owner's, and backlog 44's
> coupling to entry 23's unowned +0.847 y/c residual is unchanged: **decide once, with both halves
> visible.**

---

## 3. THE OTHER DIRECTIONS — the doc was wrong, or the doc was ignored

### 3.1 `DOC_DEFECT` — faithfully transcribed, and the doc is what is wrong (§7.2's direction)

**SA-09 — §8.3's awareness term is described as one mechanic and specified as another.**

> §8.3: *"Variance Roll: d20 − 10, modified by: + (QB Awareness − 70) ÷ 5 **(reduces variance
> range)**"* — then its own worked examples: *"Elite QB (95 Awareness): Variance = d20 − 10 + 5 = −5
> to +15 (Slightly optimistic but rarely fooled)"*.

The annotation says *narrowing*; the arithmetic is a **mean shift**, and the range stays 20 wide at
every rating. `resolve/qbRead.ts` implements the arithmetic exactly — the modifier is even *named*
"variance narrowing" in the stream while not narrowing anything.

**The consequence runs the wrong way as football:** an elite quarterback perceives receivers as **more
open than they are** (mean +5 at 95 awareness), a poor one as less open (−2 at 60). Perceived openness
feeds `qb.throwThreshold`, so awareness currently buys optimism rather than accuracy of perception.

**Mandate-1 caveat, and it is disqualifying for the corpus:** on the flat-60 league this term is a
**constant −2 for every quarterback in the league**, with zero variance. **No flat-league measurement
bears on it at all.** It needs a spread league, exactly as backlog entry 14's raw speed term does.

**SA-06 — four more durations written in TICKS and read as SECONDS, three of them silently.**

§7.4's *"~1.5 ticks"* carries an **authoring correction in the doc**, because the literal reading
(0.75s) made every blitz an automatic sack. The same ambiguity occurs four more times and none of
them is noted anywhere:

| doc | literal (0.5s ticks) | engine | cell |
|---|---|---|---|
| §8.7 *"Base 2.5 ticks"* | 1.25s | **2.5s** | `qb.timeBudget.baseSeconds` |
| §8.7 *"(Pocket Patience − 70) ÷ 20 ticks"* | ±0.5s at 90 | **±1.0s** | `qb.timeBudget.divisor` |
| §8.7 *"Coverage tightens after 3.0 ticks"* | 1.5s | **3.0s** | `route.decayStartsAtSeconds` |
| §9.1 *"delayed 0.5 / 1.0 / 1.5 ticks"* | 0.25/0.5/0.75s | **0.5/1.0/1.5s** | `release.bands[*].delaySeconds` |

The engine's resolution is almost certainly right — §2.1's timeline is *labelled* in seconds, and
§8.7's literal 1.25s budget would be shorter than an intermediate route's ready time. **The finding is
that a decision of this size was taken five times and written down once.** §8.7's is the largest: it
doubles both the base and the slope of the hold budget, which is the mechanic backlog entry 24 is
about.

### 3.2 `DOC_CONTRADICTION` — two sections, one check, different numbers (backlog entry 9's class)

| id | check | section A | section B | engine took |
|---|---|---|---|---|
| **SA-02** | OL stunt communication | §7.3: `Target: 60 + complexity` | **Appendix C**: `Communication \| 40-50 \| +10-25 (noise)` | §7.3's 60 |
| **SA-13** | bullet's passing-lane modifier | §10.2: `+10 to passing lane` | §10.3: `Bullet: +15` | §10.3's 15 |
| **SA-08** | separation → openness | §9.3: 1-2 yds = *"contested"*, 3-4 yds = *"open"* | §8.4: 50-69 = *open*, 70+ = *wide open* | §8.4's scale — so both rows read one band optimistic against §9.3's words |
| **SA-17** | blocked / grounded recoverers | §12.3: **excluded** from recovery | §12.4: modifiers −20 / −25 | §12.4's modifiers |

**Appendix C had never been audited against.** It is the doc's own summary of common target numbers
and it agrees with §5.1, §5.3 and §11.2 — and disagrees with §7.3 by 10 to 20 points on the base. That
makes SA-02 a doc reconciliation, not a tuning question, exactly as entry 9 is.

**SA-13 has a second half that is worse than the contradiction.** `angleByThrowType` maps
BULLET→`THROUGH_ZONE` (−10) and TOUCH→`OVER_DEFENDER` (+20), so the net defender targets are **bullet
65, touch 70** — *a touch pass is harder to deflect than a bullet*. §10.2 says the opposite in words
("BULLET: Harder for passing lane defenders" / "TOUCH: More time for coverage to close"). Two doc
modifiers combined by an engine-invented mapping produce an ordering the doc contradicts.

### 3.3 `INTERPRETATION_DRIFT` — a declared knob whose consequence contradicts the doc elsewhere

**SA-14 — a dead-even coverage rep is not a contested catch.**

> §11.1: *"CONTESTED CATCH: **Defender within 1 yard**"*

`catching.contestedMaxOpenness: 30`, and `catchTypeFor` is `actualOpenness <= 30`. §9.3's own
separation rows map to openness `85 / 70 / 55 / 40 / 32 / 25 / 15 / 6`. So:

- `SEPARATION_HALF_YARD` — **half a yard** of separation — openness 40 → **ROUTINE**.
- `EVEN_BRACKET` — a dead-even rep, **zero yards** — openness 32 → **ROUTINE**.

Two rows the doc's own words make contested are resolved as uncontested catches.

| | measured, 160 games, seeds `fnv1a:60f21076#160` |
|---|---|
| **RAW** — catch resolutions | 5,776 (5,411 routine + 365 contested) |
| contested share | **6.3%** |
| **EXCLUSIVE** — `contestedMaxOpenness` 30 → 40 | contested **365 → 492, Δ +127 (+34.8%)** |
| interceptions from the contested channel | **169 → 203, Δ +34 (+20.1%)** |

**The price is stated as a warning, not as an argument for the change.** `int_rate` currently PASSES
at 2.03% against a real 2.28%, and this would move it by roughly a fifth **on top of** backlog entry
6's recovery roll, which has never failed in 1,474 attempts. *Named, per §22a:* the two arms differ in
one cell only; the contested delta is the exclusive reach and the routine and interception deltas are
**contaminated by propagation** (a re-routed catch changes the play, which changes the drive).

**SA-05 — §8.8's scramble is an opposed roll and the engine's reads no defender.**

> §8.8: *"Scramble Resolution: **QB Improvisation + Mobility vs. Pursuit**"*

`resolveScramble` rolls `d100 + mobility/5 + improvisation/5` against `50 + edgeThreats×10 +
urgency×5`. **No rusher attribute is consulted.** The defence's rating cannot move the escape check at
all — ADR-028's structural-insensitivity argument, arriving in a different subsystem: *a constant
contributes nothing to the slope.* It is declared in the tunables comment ("Pursuit here is the target
number"), which is why it is drift rather than a defect, but the doc's form is opposed and the
engine's is not.

**SA-10 — §8.5's "may take suboptimal" is implemented as "cannot take the best".**

> §8.5: *"Miss by 1-14: QUESTIONABLE (**may** take suboptimal) / Miss by 15+: POOR (**likely** takes
> wrong option)"*

Both rows carry `poolFrom: 1`, and `targetSelection.ts` does `Math.min(band.poolFrom, ranked.length −
1)`. The best-perceived target is **structurally unreachable** on a failed decision check. The band
boundaries are the doc's; this consequence column is not. On a flat-60 league the failure rows are
~37% of target selections.

**SA-11 — two cells meaning "tight window", compared in opposite senses.**
`qb.window.tightWindowThreshold: 50` is consumed as `< 50` (§8.4's own wording, "If Base Openness <
50"); `throwExec.typeSelection.tightWindowMaxOpenness: 50` is consumed as `<= 50`. Same concept, same
value, disagreeing at exactly 50.

**SA-19 — `runGame.phaseTicks` contradicts its own stated derivation.**
The tunables comment says these are §14.2's timeline with each phase resolving *"on the tick it ends
on"*. §14.2's phases end at **1.0, 1.5, 2.0**; the cells are **0.5, 1.0, 1.5**, and a fourth
(`openField: 2.0`) exists that §14.2 does not name. Two of three contradict the stated rule.

---

## 4. THE SCALE SWEEP PROPER

`packages/calibration/src/knownTruth/scaleSurface.ts`, printed by `test/scaleSurface.test.ts`. Exact
probabilities, no simulation: d100 uniform on 1..100, the difference of two d100s triangular on
[−99, 99].

### 4.1 The instrument's own check

Two independently measured numbers are reproduced from arithmetic alone:

- `break_tackle` at even ratings clears `minMargin: 15` **36.6%** of the time. Backlog entry 13
  measured **36.70%** on the corpus.
- `breakaway`'s `TOUCHDOWN_POTENTIAL` at even ratings: **36.6%**. Backlog entry 11 measured *"flat at
  ~37% throughout"*.

### 4.2 What the table says

**Ranked by how little the RATING scale owns** — `ratingSpan` = p(actor 99 vs opponent 0) − p(actor 0
vs opponent 99), flats excluded. *Named, per §22a: the opponent MOVES OPPOSITELY and is not held at
the league mean; holding it would halve every span.*

| finding | check | ratingSpan | totalSpan | reading |
|---|---|---|---|---|
| **`RATING_INERT`** | `deflection_quality` | **0.000** | 0.300 | §12.2's roll is a **bare d100** — no attribute term exists. Combined with entry 6 (recovery: 1,474 attempts, zero failures), **no player rating decides anything in the whole tipped-ball subsystem**; who gets the ball is a d100 and a deterministic Reaction sort. |
| | `qb_decision` | **0.200** | 0.200 | One term against a flat 50, and it is the check that chooses **who gets the ball**. |
| | `catch` | 0.200 | 0.740 | Situation owns 3.7× what rating owns. |
| | `accuracy` | **0.200** | **0.750** | **Backlog entry 1 quantified.** One `Accuracy÷5` term against a flat range dominated by the pocket (0 to −30) and depth (+10 to −10). **Situation owns 3.75× what the quarterback's accuracy owns.** |
| **`BOUNDARY_ON_FAT`** | `pass_rush_tick` | 0.819 | 0.819 | `RUSHER_WINS_REP` at 15 is a **36.6%** event on an even rep. This is backlog entry 40's `startsThreat` at 31.85% — **the supply of threats, seen from the arithmetic.** |
| | `break_tackle` | 0.619 | 0.619 | Entry 13. |
| | `breakaway` | 0.619 | 0.619 | Entry 11's gate. |
| **`DIE_CANNOT_LOSE`** | `deflection_recovery` | 0.890 | 0.990 | **Entry 6 from arithmetic.** Six ÷5 terms + proximity against the *hardest* row in §12.2 (90): at even ratings with same-zone proximity, p = 1.000. |
| | `anticipation` | 0.400 | 0.940 | Entry 24. CONCEPT's first read passes at ~1.000 with its +30. |
| **`DIE_CANNOT_LOSE` + `DIE_CANNOT_WIN`** | `pursuit_angle` | 0.400 | **1.000** | **Entry 14 quantified.** At *even ratings* the check goes from certain-pass to certain-fail on the raw speed difference alone, with the die deciding nothing at either end. On a flat league that term is **identically zero**, so nothing measured on flat-60 bears on it. |

**Two structural asymmetries the sweep surfaces without a corpus:**

- `downfield_block` — **one** blocker term against **two** defender terms (§13.3's stack), p 0.392 at
  even ratings. Backlog entry 10, reproduced from arithmetic.
- `contested_catch` — **three** receiver terms against **two** defender terms, a 12-point structural
  receiver edge at rating 60. Paired with SA-14 (the contested population is 6.3% of catches), the
  interception channel is narrowed twice over.

**`levelInvariant`, reported and never flagged.** Eleven checks are invariant to the league's *level*
and sensitive only to the *gap* — correct football, and a hard constraint on the corpus: **on a flat
league, a symmetric check measures its band boundary and nothing else.**

### 4.3 What could not be seen

- **A declared term list can drift.** Where the engine holds a stack as a divisor plus resolver code
  rather than as a `{attr, divisor}` array, `SURFACE` *declares* it with the doc's formula beside it.
  A term added to a resolver tomorrow reddens nothing. Derived rows cannot drift; declared rows are
  **bounded, not eliminated**. The mitigation exists and is not wired: the engine publishes
  `CHECK.testsAttrs` and `knownTruth/attributeUsage.ts` already folds it.
- **Situational tables are not folded into the even case.** A disguise the defence chose and a pocket
  status the play happened to reach are the *sweep's* subject, not the scale's.
- **Four findings are unpriced and say so** (§2, SA-03/04/07/18).

---

## 5. WHAT THE TABLE CANNOT CONTAIN — seven doc rules with no cell at all

**A third failure direction, and one this project had not named.** ADR-036 is *the doc said nothing
and a number appeared*; §7.2's amendment is *the doc said something wrong and the engine was
faithful*. These are **the doc said something and there is no cell to walk**. A register that walks a
tree is structurally blind to them; they were found by reading the document forwards.

`MISSING_CELLS` in `docConformance.ts`, all seven pinned by test:

| id | doc | quote |
|---|---|---|
| **MC-01** | §7.1 | *"Tie: Slight pressure, **−5 to QB accuracy if all matchups are ties**"* — the one §7.1 result row with a stated consequence the engine does not produce. |
| **MC-02** | §10.2 | *"BULLET: **−5 to catch** / TOUCH: **+10 to catch**"* — the lane halves exist; the catch halves exist nowhere. |
| **MC-03** | §10.4 | *"**Off platform (moving): −15**"* — and the population is LIVE, because a scrambling quarterback throws off platform by construction. |
| **MC-04** | §11.1 | *"DIFFICULT CATCH: −20 to catch roll, **Spectacular Catch attribute applies**"* — one of §11.1's four catch types; `catchTypeFor` returns only CONTESTED or ROUTINE. |
| **MC-05** | §11.2 | *"One-handed +25"* has no cell; "diving" and "behind/high" were re-keyed from catch type to accuracy band, undeclared. |
| **MC-06** | §3.3 | *"Adjacent Zone: −10 to interaction rolls / Two Zones Away: −25"* — a general adjacency rule with no implementation anywhere. |
| **MC-07** | §15 | Six situational modifiers (red zone, two-minute, short yardage) with no cells **and no declared absence** — unlike §16, which `tippedBall.weatherModifier` declares with zeroed keys. Red-zone TD% is a Tier 1 metric. |

**MC-04 carries a Mandate-2 consequence that arrives without a sweep.** `spectacularCatch` is `active`
in `ATTRIBUTE_REGISTRY_V1`, is read by **no engine resolver**, and appears **nowhere in `TUNABLES`** —
checked both ways, per backlog entry 31's methodology correction (a grep for `ATTR.x` cannot see a
tunables string). It survives only as a `defaultFrom` source for `jumping`. **This is `anchor` before
ADR-028**: a kill/merge candidate found by reading rather than by sweeping, and for the same reason —
the doc names it as the answer to a mechanic the engine never built.

**SA-15, the same family in miniature.** `tippedBall.weatherModifier`'s comment claims that wiring §16
will be *"a value change, not a code change"*. §16.1 carries a **COLD (20-39°F)** row and **two** wind
rows (Strong +5, Severe +10) that the six-key set cannot express. The claim is false as written.

### 5.1 Fifteen of 44 `CheckKind`s have no producer

`coverage_read` §5.1 · `audible` §5.4 · `route_break` §9.2 · `option_route` §9.5 · `qb_read` §8.3 ·
`unseen_defender` §8.6 · `hold_decision` §8.7 · `dline_tip` §10.3 · `communication` App. C/§16.3 ·
`snap_jump` §16.3 · `fumble` §16.1 · `penalty_check` — plus four game-loop kinds.

Three of these are fully specified by the doc and simply absent (§5.1, §5.4, §9.5); §8.6's absence
already has a logged consequence (entry 4a: a passed anticipation carries **no interception risk**);
`fumble` has an attribute (`ballSecurity`) and §16.1 modifiers but **no base rate anywhere in the
doc**, so there is nothing to implement.

---

## 6. WHAT IS ASKED OF THE OWNER

**Nothing is proposed as a value.** Six rulings are requested, in the order the evidence supports:

1. **SA-01 and SA-16 — remove the cells** (the ADR-036 treatment: make the absence unrepresentable
   rather than valued). Exclusive reach is **provably 0**; nothing downstream can move. Five plus one
   cells across four tables, raw reach 2,319 and 699 selections.
2. **SA-12 — rule on §10.1.** Either the doc's throw-type table is restored to the engine (which needs
   a key it does not have) or §10.1 is amended to say what the engine implements. Today the doc's
   strictest gate exists in neither.
3. **SA-02, SA-13, SA-17, SA-08 — four doc reconciliations.** Entry 9's class: one of each pair of
   numbers is simply wrong, and it is a football/authoring call rather than a tuning one.
4. **SA-R2 — the two `maxYards` ceilings.** Reported and not ruled, as required. **Decide once, with
   entry 23's residual visible** (backlog 44's coupling).
5. **SA-14 — priced at +34.8% contested resolutions and +20.1% interceptions.** Directionally
   required by §11.1's own words; *not free*, and the price lands on the one Tier 1 row currently
   passing.
6. **SA-09 and SA-06 — two doc amendments**, neither of which changes a number today: §8.3's
   "reduces variance range" describes a mechanic its own arithmetic does not implement, and the
   tick/second resolution has been made five times and recorded once.

**SA-18, SA-03, SA-04, SA-07 are stated and left open**, because pricing them honestly needs an
instrument this dispatch does not have (§2), and SA-18's price already exists at a better sample.

---

## 7. WHAT THIS DISPATCH LEAVES BEHIND

| artefact | tier | what it eliminates |
|---|---|---|
| `src/knownTruth/docConformance.ts` + its test | **Tier 1 for coverage** | An unclassified numeric leaf, and a stale rule. Both directions, on the committed tree. **Not** the correctness of any reading. |
| `src/knownTruth/scaleSurface.ts` + its test | **Tier 1 for `CheckKind` coverage** (a `Record<CheckKind, …>` — the compiler proves it); **Tier 2** for declared term lists | A check kind entering the vocabulary undescribed. **Not** a term added to a resolver. |
| `test/scaleAudit.measure.test.ts` | **Tier 3** — env-gated (`FF_SCALE_AUDIT=1`), ~110 s | Nothing, from inside. A machine cannot tell whether a human typed the variable. |

**The register found its own over-reach on its first run**: a rule written for `zoneModel`'s spatial
fakes matched no numeric leaf (they are string-valued), and the totality gate reported it dead. That
is the derivation corollary working on the instrument that implements it.

---

## Decision

*Owner + Orchestrator. Pending.*
