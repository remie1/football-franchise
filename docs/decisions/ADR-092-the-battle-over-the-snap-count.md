# ADR-092 (DESIGN): the battle over the snap count, studied in the week and fought during the game

- **Date:** 2026-10-30
- **Proposed by:** Orchestrator (thread "Design snap spots for every player")
- **Status:** **proposed, design only.** Nothing in `packages/` changes with this ADR. It replaces the quarterback term in ADR-091's timing roll (§5.2) with the **count read** designed here. **Revised the same evening (21:27Z)** for the owner's source on how often real defences stem (5 to 15 a game, ADR-091 §7.4): the ceiling's constant moves from 62 to 68 to stay centred, and §7's numbers are recomputed at the new rate. One question goes to the owner (§14), in plain words in [ADR-092-questions-explained.md](ADR-092-questions-explained.md) and on a card in the thread. Each contracts edit in §11 needs the owner's typed yes naming it, asked at the step that needs it. The owner never merges: each step comes with its numbers and needs the owner's word before the Orchestrator merges it.
- **Asked for by:** the owner, 2026-10-30 20:58Z: *"This is starting to include the impact of coaches on both sides of the ball. Both in the week leading up to the game and during the game to make adjustments. So this can flesh out the value of good coordinators even more."* The owner attached notes on how a defence studies a quarterback's cadence and how an offence breaks it (§1.1). At 20:47Z he had asked why ADR-091 timed the Mike against the quarterback's Awareness and Football IQ.
- **Builds on, and does not reopen:** ADR-091 (the stem, its rolls and endings, all its dials); `coaching-staff.md` §3 (the coach sheet's `gamePlanning`, "weekly opponent-prep quality", and `inGameAdjustment`, "halftime/rolling counter-punching") and §4 items 1-2 (the GameplanPacket and the AdjustmentPacket); ADR-080 (each team's four seats: head coach, OC, DC, special teams; position coaches are not modelled in v1); ADR-076 (the DC's weekly plan from film; owner Q4: the offence has no answer to the plan yet); ADR-072 (`discipline`); ADR-005 (a die only when it matters).

## Shorthand used here

| word | what it means |
|---|---|
| **the count read** | one number per defence per game, 0 to 100: how well this defence knows when this offence's ball will be snapped. 50 is what ADR-091 assumed on every snap |
| **the ceiling** | how much of this quarterback's count can be known at all |
| **film read** | where the count read starts at kickoff, from the week's study |
| **live read** | what the Mike adds during the game by hearing the count snap after snap |
| **the live word** | the word in the cadence that really starts the play, among dummy words |
| **on two** | a snap on the second "Hut", a hard count by choice |
| **the fix** | the offensive coordinator's correction once he sees the defence timing his count |

## 1. The need

ADR-091 times the Mike's MOVE against a quarterback term, `(QB Awareness + QB Football IQ − 100) ÷ 10`, which is the same on the first snap and the last. The owner asked why Awareness was in it (20:47Z); the answer was that Awareness shows in snapping on movement, a roll of its own, so it counted twice. His notes then showed what the term was missing: the Mike's timing is **learned**, first from the coaches' film study and then live during the game, and the offence **fights back** with corrections from the sideline.

The game has the two coach ratings his notes describe and has never used them in a game. `gamePlanning` and `inGameAdjustment` are on every coach's sheet (`contracts/src/registry.ts:266-267`, CHECKED), weighted 0.20 and 0.15 when a team hires a coordinator (`franchise/src/staff/tables.ts:54-58`, CHECKED), and "nothing in the sim does yet" read a coach (`contracts/src/staff.ts:3`, CHECKED). The design spec already names their channels: a weekly GameplanPacket and an in-game AdjustmentPacket, where "anticipating the opponent's adjustment is an opposed check against *their* adjustment rating" (`coaching-staff.md` §4, CHECKED). **This ADR is the first design that makes either rating change a play.**

### 1.1 The owner's notes (REPORTED, OWNER, EXTERNAL; the sources he cited are not opened here)

1. **Both matter, the game more.** Film study is the foundation; the rhythm gathered during the game is "the deciding factor".
2. **The homework.** Coaches and the Mike look for the quarterback's **tell** (a heel lift, a nod, a finger flicker before the snap), his **rhythm habits** (a steady 1.5 seconds from "Set" to "Hut") and his **situation tendencies** (hard counts on third and short, quick snaps on first down). It gives the Mike "a baseline expectation so they don't get tricked early in the game".
3. **Better in the second half.** Mikes "almost always time their stems better in the second half than in the first quarter": live sound and movement; human habit (a stressed or tired quarterback falls back on his most comfortable rhythm, and under pressure his cadence speeds up slightly); cracking the code (which words are dummies and which is live, usually by halftime).
4. **Elite quarterbacks fight it.** They change their inflection, their counts, or go to silent counts later in the game to break the rhythm the Mike thinks he has. A pitcher and a hitter: it takes a few innings to time the fastball.
5. **The split is 70% coaching staff, 30% Mike.** The staff isolates the tells, identifies the live words and programs the radio reminder; the Mike memorizes the rhythm and builds the muscle memory.
6. **The staff's cheat sheet**, by Friday: "When he uses 'Green 18', the ball is snapped on the second 'Hut' 85% of the time. When he flashes his fingers, it's a quick count."
7. **The Mike** "doesn't have to discover these patterns; they just have to memorize and apply them". The DC can remind him over the radio before the play: "Watch for the hard count here."
8. **The offence's corrections**, ordered by the offensive coordinator from the press box when the defence keeps timing the snap: (1) **freeze and double counts** ("the next three plays are on two"); (2) **change the live word** on the sideline; (3) **eradicate body habits** ("every time you nod, they shift; stop moving your head").
9. A quarterback who fails to vary his cadence "strips the offensive line of its single greatest advantage".

## 2. The design in brief

1. **A count read per defence per game**, 0 to 100, replaces ADR-091's quarterback term in the Mike's timing roll (§6). It is arithmetic on facts already on the stream; it rolls no die of its own.
2. **The quarterback sets the ceiling**: a quarterback with a high **Football IQ** varies his count, so there is less to know (§4.1).
3. **The week sets the start**: the **DC's Game Planning** does 70 of the study and the **Mike's Discipline** 30 (§4.2).
4. **The game moves it**: every snap the Mike hears raises it (§5.1); at halftime the **DC's In-Game Adjustment** hands the Mike what the booth decoded (§5.2); late in a close game a quarterback with low **Poise** falls back on his habits (§5.3).
5. **The offence fights back**: when a stem works against him, the **OC's In-Game Adjustment** decides whether he sees it; his fix changes the live word, puts three snaps on two and tells the quarterback to drop his habit (the quarterback's **Discipline**); the DC may read the change (In-Game Adjustment against In-Game Adjustment, the spec's opposed check) (§5.4).
6. **Size** (§7): at the league's stem rate (about 9 a game, ADR-091 §7.4), a DC at 90 instead of 20 gives his team about 4 more stems that work and 4 or 5 fewer caught a season, and the OC fixes his count about 2.4 times a game. Question **C1** asks whether the count read should also decide who jumps the count on any snap, where the rest of the real game's pre-snap flags are (§8, §9).

## 3. Who does what

| who | what | ratings read (through the registry) |
|---|---|---|
| **the DC** (for his staff) | studies the quarterback's count all week; hands the Mike the booth's notes at halftime; may read the offence's change | **Game Planning** (the week, 70 of the study); **In-Game Adjustment** (halftime, reading the change) |
| **the Mike** (`LB_M`) | learns the coaches' sheet; hears the count live; calls MOVE | **Discipline** (his 30 of the study); **Awareness, Play Recognition** (the timing itself, ADR-091 question S1) |
| **the quarterback** | his count, how much of it can be known; his habits under stress; dropping a habit when told | **Football IQ** (the ceiling); **Poise** (stress); **Discipline** (dropping the habit) |
| **the OC** | sees the defence timing his count and orders the fix | **In-Game Adjustment** (noticing; and against the DC when the DC tries to read the change) |

**Why these ratings.**
- **Football IQ, not Awareness, for the quarterback's count.** A count is hard to time when the quarterback has no fixed rhythm and sells his dummy words; that is knowledge of the game, which Football IQ is (`registry.ts:72`, QB only, "knowledge"). Awareness stays where it shows: seeing the line move and snapping on it (ADR-091 §5.4). No rating counts twice in one roll, the owner's concern at 20:47Z.
- **Discipline for the Mike's homework.** The notes say the Mike does not discover the patterns, he memorizes and applies the coaches' sheet. Discipline is the game's rating for staying inside the coach's instructions when his own read says otherwise (`registry.ts:130`, every position), so a disciplined Mike trusts the sheet and a loose one guesses. Discipline is not in his timing roll, so his share of the homework is not counted twice. Made-up players already vary in it (mean 60, spread 12, `attributes/src/fictional/profiles.ts:55`, CHECKED).
- **Poise** is the quarterback's rating for staying composed (`registry.ts:78`), the notes' "stressed or tired" rhythm. **Discipline** again for dropping a habit when the coach says so.
- **The DC stands for his staff**, because position coaches are not modelled in v1 (ADR-080 §3, `:112`); ADR-076 does the same for the weekly plan.
- **The offence has no weekly answer.** ADR-076's owner Q4 ruled that the offence gets no answer to the DC's weekly plan yet (`ADR-076:295`), and the owner's notes describe the offence's answers during the game. So the OC's Game Planning does not enter; the OC answers in the game (§5.4).

## 4. Before the game: the film read

### 4.1 The ceiling (default D1, CHOSEN)

`ceiling = 68 + (50 − QB Football IQ) × 0.6`, kept between 20 and 95.

| QB Football IQ | 35 | 50 | 65 | 85 |
|---|---|---|---|---|
| ceiling | 77 | 68 | 59 | 47 |

The 68 is chosen so that, with every rating at 50 and stems at the league's rate (15 in 100 snaps, ADR-091 §7.4), the count read averages 50 over a game's stems (§6; COMPUTED: 50.0). At the old rate of about 4 in 100 it was 62: more stems give the OC more to fix, which pulls the read down. So ADR-091's shares stand as the average game, and this ADR adds the shape within a game and the spread between teams.

### 4.2 The film read (default D2, CHOSEN; the 70 and 30 are the owner's)

`study = 0.7 × DC Game Planning + 0.3 × Mike's Discipline`; `share = ½ + (study − 50) ÷ 200`, kept between 0.2 and 0.8; **film read = ceiling × share.**

An average staff goes into the game knowing half of what can be known (film read 34 against an average quarterback). A DC at 90 knows about two-thirds (share 0.64, film read about 44); a DC at 20 about two-fifths (share 0.395, film read about 27). The slope (÷ 200) is the dial that sets how much a great staff is worth; doubling it would double the DC's effect in §7.

### 4.3 The cheat sheet and the radio

The notes' situation tendencies and the DC's "watch for the hard count here" are how the film read reaches the Mike on each snap: they are inside the film read, not a roll of their own. The cadence mix itself stays league-wide (ADR-091 D1) until offences have their own cadence habits (§13).

### 4.4 Where the week is computed

The week's study belongs to the franchise (the GameplanPacket, `coaching-staff.md` §4.1): it hands the game each defence's **share** (a number from 0.2 to 0.8) and each coordinator's **In-Game Adjustment** (petition R1). The engine never sees a coach, only bounded numbers, as the spec requires. Absent (calibration games, single exported games), the share is ½ and every In-Game Adjustment is 50.

## 5. During the game

### 5.1 The live read (default D3, CHOSEN)

After every snap of this offence, `count read += 5% × (ceiling − count read)`. By the end of the first quarter (14 snaps) the read has closed about half its gap to the ceiling, and by halftime (31 snaps) about four-fifths: the notes' "crack the code by halftime".

### 5.2 Halftime (default D4, CHOSEN)

`count read += (DC In-Game Adjustment ÷ 200) × (ceiling − count read)`: the staff hands the Mike what the booth decoded in the first half. A quarter of the remaining gap at 50; it matters most after the offence has changed its live word (§5.4).

### 5.3 Stress (default D5, CHOSEN)

On fourth-quarter snaps with the score within 8 points, the ceiling rises by `½ × (50 − QB Poise)` when his Poise is below 50: a quarterback at Poise 20 gives away 15 more. The notes say the cadence speeds up "slightly", and the effect is small (§7).

### 5.4 The OC's fix

- **He sees it** (default D6, CHOSEN): after each of his drives in which a stem worked against him (on time, or early and not re-called), `d100 + OC In-Game Adjustment ÷ 5` against 50: 61 times in 100 at 50. A new `CheckKind`, `adjustment_notice`.
- **He fixes it at the start of his next drive**, in the three ways the notes give:
  1. **A new live word.** The count read keeps only a quarter of what it gained live (the part above the film read). **The DC may read the change** (the spec's opposed check, default D7, CHOSEN): `d100 + (DC In-Game Adjustment − OC In-Game Adjustment) ÷ 5` against 51, 50 times in 100 at even ratings, `CheckKind` `adjustment_read`; if he does, the read keeps three-quarters.
  2. **Three snaps on two** (the notes' "next three plays", default D8): at home, the next three snaps are hard counts. If the DC read the change, the Mike knows they are coming and the hard count adds nothing to his target (row 0 instead of ADR-091's +10). On the road there is no hard count (the silent count, ADR-091 D1), so only the word and the habit change.
  3. **Drop the habit**, once a game (default D9, CHOSEN): `d100 + QB Discipline ÷ 5` against 40, 71 times in 100 at 50, `CheckKind` `habit_drop`. If he does, the film read loses a third (the tell's share of the study) and the count read loses the same amount.
- **Its price** (the owner's rule that no move is free): the OC needs a stem to go wrong for him before he sees anything; a DC who reads the change keeps most of his read and turns the three hard counts against the offence; a quarterback who cannot drop his habit keeps giving it away. The offence's own false starts, the real price of long counts and new words, come with question C1.
- **Who decides** (Iron Rule 6): the fix is a coach decision with authority `COACH`, new kind `CADENCE_CHANGE` (petition R5). The OC makes it for teams the computer runs, and for the human's team too until a sideline screen lets the human order it.

### 5.5 A new quarterback mid-game (default D10, CHOSEN)

The ceiling becomes his; the film read is half the starter's share (little tape on a backup); the live read starts again from there.

## 6. The count read in the Mike's roll (amends ADR-091 §5.2)

`d100 + Mike's Awareness ÷ 5 + Mike's Play Recognition ÷ 5 + (count read − 50) ÷ 2.5` against `50 + cadence row + noise` (default D11, CHOSEN). **Removed:** ADR-091's `(QB Awareness + QB Football IQ − 100) ÷ 10`. Every 5 points of count read moves the Mike's roll by 2. ADR-091's bands (D3), rows and every other roll are unchanged.

## 7. What it gives (COMPUTED: §4-§6 laid over ADR-091 §5 and simulated, 100,000 to 150,000 games a case, so about ±0.2 points of noise; 62 snaps a team-game, stems on 15 in 100 snaps with the offence adjusting to them (ADR-091 §7.4, D18) and offside at its D6 of 25, home and road alike; scripts in the project's shared folder, `design/ADR-092-data/`)

**With every rating at 50, by quarter:**

| | 1st quarter | 2nd | 3rd | 4th | whole game | at the old rate, about 4 in 100 |
|---|---|---|---|---|---|---|
| count read | 41 | 50 | 55 | 54 | 50 | 50 |
| stem works | 62.4 | 65.1 | 66.9 | 66.2 | 65.2 | 65.4 |
| stem caught | 22.9 | 19.2 | 17.0 | 17.3 | 19.0 | 20.0 |
| wasted or called off | 14.7 | 15.7 | 16.1 | 16.5 | 15.8 | 14.6 |
| hard counts among the stems | 9.7 | 13.7 | 15.8 | 17.7 | 14.4 | 7.3 |

The OC fixes his count **2.4 times a game**, and the offence's hard counts climb through the game as it adjusts to the stems (ADR-091 D18), which is why the fourth quarter is a little worse for the stem than the third. Offside from stems is about **1.4 per 1,000 snaps** (ADR-091 D14's band is 0.2 to 2.0). A better count read turns late calls into on-time ones and leaves early ones about as they were, so it barely moves offside.

**Who matters, with everything else at 50** (share of stems, whole game):

| case | works | caught | in the 1st quarter: works / caught |
|---|---|---|---|
| everyone at 50 | 65.1 | 19.2 | 62.3 / 23.0 |
| DC Game Planning and In-Game Adjustment 90 | 66.6 | 17.6 | 64.7 / 20.4 |
| DC 20 and 20 | 63.9 | 20.4 | 60.5 / 25.0 |
| DC Game Planning 90 only | 66.2 | 17.9 | 64.7 / 20.3 |
| DC In-Game Adjustment 90 only | 65.5 | 18.7 | 62.4 / 22.9 |
| OC In-Game Adjustment 90 | 64.7 | 19.5 | 62.3 / 22.9 |
| OC 20 | 65.4 | 18.9 | 62.4 / 23.0 |
| DC 90 and 90 against an OC at 20 | 66.9 | 17.3 | 64.9 / 20.1 |
| DC 20 and 20 against an OC at 90 | 63.5 | 20.8 | 60.4 / 25.0 |
| QB Football IQ 85 | 59.8 | 24.8 | 57.7 / 27.9 |
| QB Football IQ 35 | 67.4 | 16.7 | 64.4 / 20.7 |
| QB Poise 20 | 65.4 | 18.9 | (second half: 66.9 / 16.8, against 66.4 / 17.3) |
| Mike Discipline 80 / 40 | 65.5 / 65.0 | 18.8 / 19.3 | |
| Mike Awareness 80 and Play Recognition 75 | 74.5 | 10.0 | 72.1 / 12.6 |
| Mike Awareness 40 and Play Recognition 45 | 62.5 | 21.8 | 59.7 / 25.8 |

**What that is worth.** At the league's rate a team stems about 158 times a season (17 × 9.3). A DC at 90 instead of 20 gives it about **4 more stems that work and 4 or 5 fewer caught a season** (105 against 101 working, 28 against 32 caught), most of it from his week's study and most of that in the first half. Matched against each other, the best DC facing the worst OC gets about 5 more stems that work and 5 fewer caught a season than the worst DC facing the best OC. The OC's In-Game Adjustment is worth about 1 stem a season: he fixes his count 2.7 times a game at 90 and 2.2 at 20, and each fix buys only a few snaps before the Mike relearns the count. The Mike and the quarterback still matter most (a Mike at 80 and 75 is caught 16 times a season instead of 30), and a DC's own stem rate decides how many chances there are (ADR-091 §7.4). The rest of the count battle is fought on every snap (§9).

## 8. Real numbers (COMPUTED, nflverse play-by-play, regular seasons 2022-2024, quarters 1 to 4; per 1,000 run and pass plays in the same group; method and counts in [ADR-091-real-penalty-rates.md](ADR-091-real-penalty-rates.md))

| group | defensive offside, neutral zone and encroachment | false starts |
|---|---|---|
| 1st quarter | 9.50 | 19.13 |
| 2nd quarter | 8.33 | 20.31 |
| 3rd quarter | 6.39 | 17.96 |
| 4th quarter | 7.68 | 16.68 |
| **1st half / 2nd half** | **8.86 / 7.09** | **19.78 / 17.26** |
| third or fourth down with 2 or less to go / other snaps | 12.65 / 7.70 | 26.75 / 18.03 |
| offence at home / on the road | 8.38 / 7.56 | 18.23 / 18.80 |

**Real defences jump the count a fifth less often in the second half than in the first** (z about 3.1; first quarter against third, a third less, z about 3.7), as the owner's notes say. Offences false-start 13% less in the second half, so part of it is both sides settling in, and the defence settles more. Short yardage draws the most jumps on both sides, where hard counts live (ADR-091 D1's 30 in 100), and home offences draw more defensive jumps than road ones (the hard count at home). None of this isolates stems: no public figure counts them (ADR-091 §9.1). The design's stem offside does not follow this shape (§7); **if the count read decides who jumps the count on every snap (question C1), this table is what it must hit.**

## 9. Question C1: where else does the count read count?

Through stems the battle is now worth a few stems a season to a great staff (§7). The owner's notes also name the place it is large: a defensive line that "keeps jumping the snap", hard counts that draw defenders offside, and the offence's own risk when it changes its count. Real defences jump the count about 8 times a team-season and offences false-start about 19 times (§8, ADR-091 §9.1). **Recommended: design it next, after the pocket fix finishes measuring**, as its own ADR: the cadence drawn on every snap; each rusher's jump on a hard count read through his Discipline and the count read (the dead `CheckKind` `snap_jump`, `contracts/src/events.ts:147`); the offence's false starts on long counts and new live words; the OC's fix triggered by the jumps that did not happen; §8's table as its targets. The other choice is **stems only for now**.

## 10. Measuring it (inside ADR-091's arms, on the stem snaps of both test leagues)

| arm | count read |
|---|---|
| **flat** | fixed at 50: ADR-091 as filed |
| **read at 50** | §4-§6 with every coordinator at 50 |
| **read with coaches** | §4-§6 with each team's real coordinators (after petition R1) |

**Predictions, filed now:** (P1) flat and read at 50 give the same whole-game stem endings within 1 point (the centring); (P2) in the read at 50 arm, the caught share in first quarters exceeds the second half's by 3 to 9 points (computed 5.7); (P3) with coaches, stems work more often under DCs with higher Game Planning, in direction only (computed spread about 2.7 points from 20 to 90); (P4) the OC fixes his count 1.5 to 3.5 times a game (computed 2.4); (P5) stem offside stays inside ADR-091's band D14 (computed 1.4). A miss comes to the owner with its numbers, never fitted away.

## 11. Contract petitions (shape only; each needs the owner's typed yes naming it, at its step)

| # | edit | why |
|---|---|---|
| **R1** | the game's input gains, per team, `coaching?: { cadenceFilmShare?: number; offenceAdjustment?: number; defenceAdjustment?: number }`; absent means ½, 50 and 50 | the franchise's weekly packet reaches the game as bounded numbers (`coaching-staff.md` §4) |
| **R2** | ADR-091's `STEM` event (its M4) carries the count read at that snap | the play log, the viewer and calibration read it from the stream (Iron Rule 3) |
| **R3** | a `SIDELINE_ADJUSTMENT` event: kickoff's film read and ceiling, the OC's fix (each part and its roll), and the halftime step, each with the count read before and after | the news can tell the story of a game's count battle from the stream |
| **R4** | new `CheckKind`s `adjustment_notice`, `adjustment_read`, `habit_drop` | every die is a `CHECK` (ADR-004) |
| **R5** | `CoachDecisionKind` gains `CADENCE_CHANGE` (today `FOURTH_DOWN` and `COIN_TOSS`, `contracts/src/events.ts:231`) | every decision carries its authority (Iron Rule 6) |

## 12. Build order (inside ADR-091's steps and ADR-090's plan; each step its own pull request, measured, merged only on the owner's word)

| step | what | changes games? |
|---|---|---|
| with **S-a** | the count read with every coordinator at 50 (no packet yet), the halftime step and the OC's fix rolls, recorded on the stream (R2 to R4); the stem's endings use it, and nothing reads the endings after the snap | no: proved replay for replay, only the stream grows |
| with **S-b** | the count read counts once the stem's effects do; arms flat and read at 50 | yes |
| **S-b2** | real coordinators reach the game (R1, R5): the season runner hands each game both teams' film share and coordinators' In-Game Adjustment; arm read with coaches | yes |
| after C1 | the count on every snap, its own design | yes |

Everything after S-a waits until ADR-089 has finished measuring, the same rule as ADR-090's steps after 2 and ADR-091's after S-a.

## 13. Implied scope (`unruled`)

- **The count read on every snap** (question C1): jumping the count and false starts; later, **the get-off** (a defence that knows the count beats the snap by a step, which is the pocket's clock, so after ADR-089) and **rotations timed to the snap** (ADR-075's on time, late or bust roll for a late rotation).
- **The offence's weekly answer**: an OC whose Game Planning installs new live words and more cadences each week; ADR-076's owner Q4 ruled "nothing yet" for the offence's answer to the weekly plan.
- **Offences with their own cadence habits** (hard counts on third and short for one team, quick snaps on first down for another), which the film would then learn by team.
- **Live words changed every quarter** as an offence's routine rather than a fix.
- **A Mike who remembers a quarterback** from earlier games (division rivals twice a season).
- **The human ordering a cadence change** from a sideline screen.

## 14. Questions for the owner

| # | question | options | recommended |
|---|---|---|---|
| **C1** | Should knowing the snap count also matter on every snap, not just stems? | **Yes, design it next** (after the pocket fix: who jumps the count on a hard count, the offence's false starts, the OC's fixes driven by them; real targets in §8) / **Stems only for now** | **Yes, design it next** |

**Confirmations, not questions** (each stands unless the owner says otherwise): the quarterback's count is his Football IQ, with Awareness only in snapping on movement (the change offered at 20:47Z, now in this shape); the Mike's 30 of the homework is his Discipline; the DC stands for his staff; the offence has no weekly answer (ADR-076 Q4); the OC's fix in the notes' three parts; Poise under stress; the centring that keeps ADR-091's average; every dial D1 to D11 CHOSEN and filed before any test run.

## 15. Provenance of factual claims

| claim | where from | tag |
|---|---|---|
| The owner's cadence notes, the 70/30 split, the three corrections and "three plays on two" | the owner's message, 2026-10-30 20:58Z | REPORTED, OWNER, EXTERNAL |
| `gamePlanning` and `inGameAdjustment` are coach ratings; coordinators are hired on them | `contracts/src/registry.ts:266-267`; `franchise/src/staff/tables.ts:54-58`; ADR-080 `:135` | CHECKED |
| No coach rating is read by the sim today | `contracts/src/staff.ts:3` | CHECKED |
| The GameplanPacket and AdjustmentPacket; the opposed adjustment check | `docs/design/coaching-staff.md` §3 (`:31`), §4 (`:43-44`) | CHECKED |
| Four seats per team; position coaches not modelled in v1 | ADR-080 `:105-116` | CHECKED |
| The offence has no answer to the weekly plan yet | ADR-076 owner Q4 (`:295`) | CHECKED |
| Football IQ (QB, knowledge), Poise (QB), Discipline (every position) and its meaning | `contracts/src/registry.ts:72`, `:78`, `:130` | CHECKED |
| Made-up players' Discipline: mean 60, spread 12 | `attributes/src/fictional/profiles.ts:55` | CHECKED |
| `snap_jump` is a `CheckKind` with no producer; `CoachDecisionKind` is `FOURTH_DOWN` and `COIN_TOSS` | `contracts/src/events.ts:147`, `:231` | CHECKED |
| Real pre-snap flags by quarter, half, short yardage, home and road | nflverse play-by-play 2022-2024, regular season | COMPUTED (this ADR) |
| §7's shares, values and fix rate; the 68 that centres the read | §4-§6 simulated over ADR-091 §5 | COMPUTED (this ADR) |
| Stems on 15 in 100 snaps at the league rate | ADR-091 §7.4, from the owner's source (5 to 15 a game) | REPORTED, OWNER, EXTERNAL; the rate itself CHOSEN |
| 62 run and pass plays a team-game | §8's data | COMPUTED |
| Every dial D1 to D11 | football judgement | CHOSEN, provenance NONE beyond the owner's figures |

## 16. Decision

*Pending the owner's answer to §14.*
