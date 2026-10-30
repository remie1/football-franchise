# ADR-091 (DESIGN): the stem, called by the Mike and timed against the snap count

- **Date:** 2026-10-30
- **Proposed by:** Orchestrator (thread "Design snap spots for every player")
- **Status:** **proposed, design only.** Nothing in `packages/` changes with this ADR. It takes the Stem out of ADR-090's question 1 and gives it its own timing. Two questions go to the owner (§14), in plain words in [ADR-091-questions-explained.md](ADR-091-questions-explained.md) and on cards in the thread. Each contracts edit in §11 needs the owner's typed yes naming it, asked at the step that needs it. The owner never merges: each step comes with its numbers and needs the owner's word before the Orchestrator merges it.
- **Asked for by:** the owner, 2026-10-30 20:17Z: *"We need to build a more advanced system for stemming. ... It sounds like the middle linebacker calls the stem and a lot of risk is based on his timing and the line's execution. So, the mechanics here need to take into account the linebacker's attributes."* The owner attached notes on how stems are called, timed, countered and punished (§1.1).
- **Builds on, and does not reopen:** ADR-073 (the Stem as a front look: the line shown one position toward the side opposite the played strength, legal only where three or more down linemen rush and none drops; Homie's rate of one front look in ten legal calls); ADR-090 (snap spots; this ADR fills its beat 6 for every stem); ADR-068 step 7 (the hard count, with the dead `CheckKind`s it names) and step 5 (the line re-identifying a moved man); ADR-072 (`discipline`, whose registry note already says "pre-snap penalties later", `contracts/src/registry.ts:128`); `match-engine.md` §16.3 (the communication checks); ADR-005 (a die only when it matters).

## Shorthand used here

| word | what it means |
|---|---|
| **lineup front** | where the line stands when it first sets, before any stem |
| **stem-to front** | where the stem moves it to before the snap |
| **the Mike** | the middle linebacker, `LB_M`, on the field in every personnel group (`playbook/src/roles.ts:180-198`, CHECKED) |
| **cadence** | how the quarterback runs his snap count: **normal**, **quick** (the ball comes on the first sound) or **hard count** (a long count meant to bait the defence) |
| **on time / early / caught / called off** | the four ways a stem ends (§6) |
| **the re-call** | the centre seeing the stem and changing the line's blocking ("Alert! Alert!") |
| **snap on movement** | the quarterback seeing the line start to shift and getting the ball snapped at once |
| **free play** | a play run with the defence offside: the offence keeps the result or takes the 5 yards, whichever is better |

## 1. The need

**Today a Stem has no time in it.** The caller draws it as a front look (ADR-073 §2.5): the offence's line is shown the front one position over, the line's read and its slide check see that picture, and the engine plays the card's front. Nobody calls it, nobody times it, nobody can be caught moving, and its only effect is where a slide thinks the strength is. Measured on the snaps where it could matter, it lowered sacks by 0.41 points a snap against a filed rise (ADR-073 §10, 3.5, `:3087`, REPORTED from that ADR's measurement), so in the game today it barely works and works the wrong way. Under ADR-090's question 1 as first drafted, the line would simply have been at its played gaps at the snap; the owner's objection (2026-10-30 20:03Z, "sounds like cheating to me") was right, because a move that takes no time and can never go wrong is free.

### 1.1 The owner's notes (REPORTED, OWNER, EXTERNAL; the sources he cited are not opened here)

1. **It is part of the call.** The coordinator puts a tag on the call ("Move"): line up in front A, shift to front B before the snap. Linemen never freelance a stem, because every man owns a gap.
2. **The Mike pulls the trigger.** He (or a veteran lineman) watches the quarterback's cadence and yells "MOVE!" on a chosen word, and the whole line jumps together.
3. **Auto-stems** are rules in the game plan: a stem in answer to motion or an unexpected formation, with no call from the sideline.
4. **Late is dangerous.** A call a beat late, or a quick count, catches the line moving: a man caught shuffling sideways at the snap stands up, loses his leverage, gets washed out of his gap and opens a lane for the back.
5. **Offside.** If the quarterback sees the line start to move he snaps at once, and the movers' momentum carries them offside: 5 yards.
6. **Defensive delay of game** for a stem so abrupt it mimics the cadence.
7. **"Earlier is always better than later."** If the quarterback gets deep into a hard count and the line has not moved, it calls the stem off and plays from where it stands.
8. **The offence's answer.** The centre is the brain of the line: if the stem comes early enough he points and yells a new call, and everyone's blocking changes. If he misses it, the quarterback can alert the back's pickup.
9. **The double-cross.** Stem from A to B on purpose, let the centre re-call, then slant back into A's gaps at the snap.
10. **The double stem.** Shift once early to make the centre re-call, then shift again late when there is no time left. Rare: third and long against a team with a long hard count.
11. **A game of chicken.** The defence wants to stem as late as it can; the offence wants to force it early with hard counts.

## 2. The design in brief

1. **The stem stays a tag the caller draws** (Homie's rate of one front look in ten stands), and it now names **who triggers it: the Mike.**
2. **At the line it plays out in time**: the line sets in its lineup front and the offence's line reads it (built today); the quarterback starts his cadence; the Mike calls MOVE; the line shifts; the ball is snapped.
3. **Four rolls decide it, each rolled only when it matters**: the Mike's timing (his Awareness and Play Recognition against the quarterback's Awareness and Football IQ and the cadence); the line's shift (each lineman's Reaction and Agility); the quarterback's snap on movement; the centre's re-call. A fifth, the offside check (each caught man's Discipline and Agility), is rolled only when the quarterback snapped on movement.
4. **Four endings** (§6): **on time** (the offence blocked the wrong front: each moved man gets a small edge), **early** (the centre may re-call; if he does, the stem is wasted), **caught** (the man is between gaps, standing up and moving at the snap: a big disadvantage, and an offside chance if the quarterback snapped on the move), **called off** (the line plays from where it stands).
5. **The double-cross ("Stem Back") and the double stem** are built after the plain stem (§7). The auto-stem is built after motion (§7.3).
6. **Offside is the game's first penalty**: question S2 (§8, §14).

## 3. Who does what

| who | what | attributes read (through the registry) |
|---|---|---|
| defensive coordinator | calls the stem as a tag on the call (unchanged: the caller's front-look draw) | none |
| **the Mike** (`LB_M`) | watches the cadence and calls MOVE | **Awareness, Play Recognition** (question S1) |
| each lineman who moves | shifts on the call; if caught moving after a quick snap, may run offside | **Reaction, Agility**; **Discipline, Agility** for offside |
| the quarterback | runs the cadence; may snap on movement | **Awareness, Football IQ** (the cadence, as `match-engine.md` §16.3's hard count: "QB acting ability (awareness + football IQ)"); **Awareness, Reaction** (snap on movement) |
| the centre | sees an early stem and re-calls the blocking | **Awareness**, with the line's average Awareness (`match-engine.md` §16.3 item 3) |
| the offensive coordinator | chooses the cadence (§5.1) | none |

All of these attributes exist today for those positions (`contracts/src/registry.ts:63-130`, CHECKED: `awareness` and `reaction` for every position; `playRecognition` for LB and DB; `footballIQ` for QB; `agility` and `discipline` for every position). **No new rating** under question S1's recommended answer.

## 4. The timeline at the line

1. **The line sets in its lineup front.** The offence's line reads it and sets its blocking: the pressure read and the slide check, built today (ADR-073 3.2b, 3.3), on the shown rush.
2. **The quarterback starts his cadence** (§5.1).
3. **The Mike calls MOVE** (§5.2): on time, early, late or not at all.
4. **The line shifts** (§5.3), about half a second for one gap (INFERRED: about 1.5 yards sideways).
5. **If the stem came early**, the quarterback may snap on movement (§5.4); if he does not, the centre may re-call (§5.5).
6. **The snap.** ADR-090's snap picture records where each lineman is (§6).

## 5. The rolls

Each is a `CHECK` on the stream with its own fork address, so no existing draw moves (ADR-005; the fork discipline ADR-073 used).

### 5.1 The cadence (the offence's choice)

Drawn **only on a snap whose defence wears a stem** (nothing else reads the cadence yet, so a draw elsewhere would be a die that decides nothing, ADR-005), on the offence's own fork, from the offence's mix (default D1, CHOSEN; no public figure exists for how often teams use each count):

| situation | normal | quick | hard count |
|---|---|---|---|
| the offence at home | 80 | 10 | 10 |
| at home, third or fourth down with 2 yards or less to go | 60 | 10 | 30 |
| the offence on the road | 90 | 10 | 0 |

**A hard count only at home**, because on the road the noise forces a silent count (`match-engine.md` §16.3, "Hard Count (HOME)"; "silent count ... eliminates snap count jump risk"). **Short yardage at home** is where real offences use the hard count most, to draw the defence offside for the first down (INFERRED, football judgement).

### 5.2 The Mike's timing

`d100 + Mike's Awareness ÷ 5 + Mike's Play Recognition ÷ 5` against `50 + cadence row + (QB Awareness + QB Football IQ − 100) ÷ 10 + noise`, where the cadence row is normal +0, quick +15, hard count +10, and noise is 0 until crowd noise is built (`match-engine.md` §16.3 lists +10 to +25). The quarterback term is ±10 at the extremes: a quarterback with a disciplined, varied count is harder to time. Default D2, CHOSEN, in the engine's usual `rating ÷ 5` form.

The margin decides what the Mike did (default D3, CHOSEN):

| margin | normal count | quick count | hard count |
|---|---|---|---|
| **0 or better** | **on time**: the line is set in its new front just before the snap | **called off**: he reads the quick count and kills the stem | **on time**: he waits out the count and moves late |
| **−1 to −19** | **early**: he calls it with time to spare, the coached miss ("earlier is better") | **caught**: the snap comes while the line moves | **called off**: deep into the count with no move made, the golden rule |
| **−20 or worse** | **caught**: he calls it a beat late | **caught** | **early**: baited by the hard count into moving on a fake cue |

The order of the bands follows the owner's notes: the good failure against a hard count is calling it off; the bad one is being baited.

### 5.3 The line's shift (on an on-time stem only)

Each lineman who moves: `d100 + Reaction ÷ 5 + Agility ÷ 5` against 40 (default D4, CHOSEN). **A miss by 20 or more leaves him still moving at the snap: he alone is caught** (§6), and the others are set. Rolled only on an on-time stem: on an early stem there is time to spare; on a caught or called-off stem it decides nothing. An average lineman never misses by 20; a lineman at Reaction 30 and Agility 30 does 8 times in 100 (COMPUTED from the formula).

### 5.4 Snap on movement (on an early stem only)

`d100 + QB Awareness ÷ 5 + QB Reaction ÷ 5` against 80 (default D5, CHOSEN). **Made: he gets the ball snapped while the line is moving, and every lineman who moved is caught**, with the offside check of §5.6. No leash rung: snapping on movement is a coached rule of the offence, so it is the call's, at rung 0 (ADR-072 §1's reading of what a call already contains).

### 5.5 The centre's re-call (an early stem the quarterback did not snap on)

`d100 + Centre's Awareness ÷ 5 + the offensive line's average Awareness ÷ 5` against `45 + noise`: `match-engine.md` §16.3 item 3's protection-call roll as written, given its first producer through the dead `CheckKind` `communication` (`contracts/src/events.ts:147`, CHECKED). **Made: the line's read and the slide check run again on the front the line moved to**, so the blocking is right and the stem has bought nothing. **Missed: the blocking stays on the lineup front.** Rolled only when the stem was early and the ball was not snapped on movement.

### 5.6 Offside (a stem caught by a snap on movement only)

Each caught lineman: `d100 + Discipline ÷ 5 + Agility ÷ 5` against 40 (default D6, CHOSEN), through the dead `CheckKind` `penalty_check` (`contracts/src/events.ts:147`). **The first miss is defensive offside** (§8). Rolled only after a snap on movement, because that is the scenario in the owner's notes (point 5): a line caught by a late call or a quick count is moving sideways, not drifting across the ball because the quarterback snapped on its first step.

## 6. What each ending does

| ending | where the moved linemen are at the snap (ADR-090) | whose front the blocking was set on | effect after the snap |
|---|---|---|---|
| **on time** | set in the stem-to front, hand down | the lineup front: **the stem worked** | each moved man: **+5 on his first pass-rush rep and on his run-blocking contest** (his blocker set his feet for a man who is no longer there; dial `stemWrongFoot`, D7, CHOSEN) |
| **early, re-called** | set in the stem-to front | the stem-to front: the centre caught it | none |
| **early, not re-called** | set in the stem-to front | the lineup front: the stem worked | as on time |
| **caught** | halfway between his two gaps, moving toward the new one at 3 yards a second, standing up (D8, CHOSEN) | the lineup front | **−10 on his first pass-rush rep; on a run his blocker gets +10 and his gap counts as open in the run's gap battle** (he is washed out, dials `stemCaught` and `stemWashOut`, D9, CHOSEN); after a snap on movement, the offside check of §5.6 |
| **called off** | set in the lineup front | the lineup front, which is now right | none; **the line plays the gaps it stands in** (below) |

**A called-off stem plays from where it stands** (the owner's notes, point 7). For the men the stem would have moved, the lineup gaps become their played gaps. This is the one place where a front look changes what is played, an exception to ADR-069's ruling 1 that the owner's own notes make. It changes gaps only: who rushes, who drops and the coverage are untouched. Every lineup front is already a legal front, because the Stem is legal only where no shifted lineman lands on another shown rusher's spot (ADR-073 §2.5).

**Runs too.** The front look is laid over run calls as well (`calibration/src/caller/frozen.ts:869`, CHECKED), but the run simulation has no pre-snap stage (ADR-068 §6). The stem is resolved in one pre-snap function that both the pass and the run simulation call. On a run there is no re-call to make (the blocking scheme is the run's), so an early stem is played like an on-time one.

**Why the edges are small and the cost is big.** An on-time stem buys a blocker a wrong first step; a caught stem costs a lineman his stance, his leverage and his gap (the owner's notes, point 4). With average players the stem works about two times in three and is caught about one time in five (§9.2), so it should help a little on average and hurt badly when it goes wrong. All the dials (D7 to D9) are filed before any test run and never fitted.

## 7. The other stems

### 7.1 Stem Back, the double-cross (owner's notes, point 9)

- **The call:** the line lines up in the card's front, stems to the Stem's picture (one position over) **early on purpose**, and slants back into the card's gaps at the snap. Played gaps: the card's, so nothing is played that was not called.
- **The timing:** early is the plan, so on a normal count or a hard count there is no timing roll (an early call is the easy one). On a quick count the Mike's timing roll decides between called off (made) and caught (missed).
- **Then:** the quarterback may snap on movement (caught, with offside chance); if not, the centre may re-call. **The double-cross works when the centre is good:** if he re-calls, each man who slants back gets **+10 on his first pass-rush rep and on his run contest** (dial `stemBackBite`, D10, CHOSEN). If he does not, his line is still set on the card's front, which is right, and the slant runs into a ready blocker: **−5** (dial `stemBackReady`, D10).
- **Where they are at the snap:** set in the picture's gaps; the slant is the first thing they do after the snap.

### 7.2 Double Stem (owner's notes, point 10)

- **When:** third down with 7 or more to go only (default D11, CHOSEN, from the notes' "third and long").
- **The call:** line up in the card's front, shift to the Stem's picture early (the bait), shift back to the card's front late.
- **The first shift** is early by design: snap on movement (caught), else the re-call (made: the bait is taken and the blocking moves to the picture; missed: it stays on the card's front).
- **The second shift happens only against a hard count**, because only a quarterback holding the ball at the line leaves time for two moves. Against a normal or quick count the Mike calls the second shift off and the line plays from the picture (the called-off rule). Against a hard count the Mike's timing roll is rolled for the second shift with **+10** (a second move is harder), and its ending is read from the hard-count column, with "early" giving the centre a second re-call.
- **The mix among stems** (default D12, CHOSEN): of the stems the caller draws, Stem 80, Stem Back 15, Double Stem 5 where legal (else Stem). The front-look rate itself is unchanged.

### 7.3 Auto-stem (owner's notes, point 3; after motion)

An auto-stem is a stem the Mike calls at the line in answer to what the offence shows: motion across the tackle, or a formation strength the call did not expect. It needs motion (ADR-074, not built) and a rule in the weekly game plan (ADR-076, not built), so it is **designed in outline only**: the same timing, shift, re-call and offside rolls, plus `match-engine.md` §16.3 item 4's adjustment call (`d100 + Mike's Awareness ÷ 5` against `40 + noise`; a miss leaves one lineman unshifted) once crowd noise exists. It is built after motion.

## 8. Defensive offside, the game's first penalty (question S2)

Nothing produces a penalty today: `PENALTY` is in the contracts (`contracts/src/events.ts:531`, CHECKED) and `penalty_check` has no producer (`engine/src/game/events.ts:60`, CHECKED).

**Under "Enforce" (recommended):** offside at the snap is a **free play**. The play runs. Then the offence takes the better of the play's result or **5 yards from the previous spot with the down replayed** (half the distance to the goal when 5 yards would cross it; a first down when the 5 yards reach the line to gain). **The choice is the coach's** (authority `COACH`, Iron Rule 6); for a team the computer runs, the rule is (default D13, CHOSEN): **keep the play** if it scored, gained a first down, or gained more than 5 yards with no turnover; otherwise **take the penalty**. It is its own step (§12), after the stem's own effects are measured.

**Under "Count only":** the offside is recorded on the play (a `PENALTY` event, declined, 0 yards) and calibration counts it; no yards move until a design for penalties.

**Not in this ADR** (each `unruled`): encroachment and neutral zone infraction (dead balls before the snap); the defensive delay of game for an abrupt stem (owner's notes, point 6; real rate 0.18 per 1,000 snaps from every cause, §9.1); offensive false starts on a hard count (the cost the offence pays for it, `match-engine.md` §16.3 item 1); the quarterback taking a free shot downfield on a free play; crowd noise.

## 9. Real numbers, and what the design expects

### 9.1 Real pre-snap penalty rates (COMPUTED, nflverse play-by-play, regular seasons 2022-2024, 815 games, 101,197 run and pass plays)

| flag | per 1,000 snaps | per team-game |
|---|---|---|
| defensive offside | 4.33 | 0.27 |
| neutral zone infraction | 2.63 | 0.16 |
| encroachment | 0.99 | 0.06 |
| **all three** | **7.95** | **0.49** |
| defensive delay of game | 0.18 | 0.01 |
| false start (offence) | 18.51 | 1.15 |

Counted as plays whose play record carries the flag (`penalty = 1`, `penalty_type`, the play record's first penalty), over run and pass plays; method in [ADR-091-real-penalty-rates.md](ADR-091-real-penalty-rates.md). **No public figure says how many of them come from stems**; most come from rushers jumping the count (INFERRED, football judgement).

### 9.2 What the formulas give with every rating at 50 (COMPUTED from §5)

| stem endings (plain stem, the offence at home) | share of stems |
|---|---|
| on time | 62.9% |
| early, then snapped on movement (caught) | 7.1% |
| early, then re-called | 7.7% |
| early, not re-called (works) | 2.4% |
| caught by a late call or a quick count | 12.4% |
| called off | 7.5% |

So the stem works about **65** times in 100, is **caught about 20** times in 100 and is wasted or called off about **15** times in 100. On the road (no hard count) on time is 63.9 and caught 20.4 (COMPUTED the same way).

**Offside:** stems are worn on about 4.1% of dropbacks today (ADR-073 3.5: a front look on 9.22% of dropbacks, 44.4% of them Stems, `ADR-073:3112`, REPORTED from that measurement). Then `0.041 × 0.172 (early) × 0.41 (snapped on movement) × 0.52 (at least one of about 3.5 movers offside at 19 in 100 each)` gives about **1.5 offsides per 1,000 snaps** (COMPUTED, taking the dropback rate of stems for every snap, INFERRED), a fifth of all real defensive offside, neutral zone and encroachment flags.

**Band, filed now (D14, CHOSEN):** stem offsides between **0.2 and 2.0 per 1,000 snaps**: some, and no more than a quarter of the real total of 7.95. A miss is brought to the owner with its numbers, never fitted away.

## 10. Measuring it

**Conjoined mechanisms.** The timing (who ends where), the on-time edge, the caught cost, the re-call, and offside are **separately priceable**, so each is measured alone and then jointly, on the stem snaps (stems worn) of both test leagues:

| arm | on |
|---|---|
| T | timing only: the endings and the snap spots, no effect after the snap, blocking still on the lineup front |
| T+R | with the re-call (blocking moves to the stem-to front when the centre makes it) |
| T+W | with the on-time edge (D7) |
| T+C | with the caught cost (D8, D9) |
| joint | all of the above |
| joint+O | joint with offside (under question S2) |

**Predictions, filed now:** in the joint arm, sacks on stem snaps rise against today's v7 (the Stem's filed rise, which failed as built in ADR-073 3.5, ought now to hold); rushing yards on caught stems exceed those on on-time stems; T moves no sack or yard at all (it changes only spots and the stream); offside per 1,000 snaps inside D14's band.

## 11. Contract petitions (shape only; each needs the owner's typed yes naming it, at its step)

| # | edit | why |
|---|---|---|
| **M1** | `cadence?: "NORMAL" \| "QUICK" \| "HARD_COUNT"` on `OffensivePlayCall` and `RunPlayCall`; absent means normal | the offence's call carries it, and the stream echoes it (Iron Rule 3) |
| **M2** | `stem?` on `DefensivePlayCall`: which stem (`STEM`, `STEM_BACK`, `DOUBLE_STEM`) and the man who triggers it; for the two new kinds, the picture they stem to | the engine resolves fields, never tag names (`contracts/src/playcalls.ts:486-491`) |
| **M3** | new `CheckKind`s `stem_timing`, `stem_shift`, `snap_on_movement`; first producers for the existing `communication` (the re-call) and `penalty_check` (offside) | every die is a `CHECK` (ADR-004) |
| **M4** | a `STEM` event before the snap: the cadence, the kind, the ending, whether the centre re-called, and who was caught | the play log, the viewer and calibration read one record |
| **M5** | `PENALTY`'s payload: `freePlay` and the offence's choice, with a coach decision kind for accepting a penalty | only under question S2's "Enforce" |
| **M6** | doc text: the front `LOOK` tag and `shownRush` ("never what is played", `playcalls.ts:471`, `:573`) gain "except a called-off stem, which plays from where it stands (ADR-091)" | the comment states the rule |

**No new rating** under question S1's recommended answer.

## 12. Build order (inside ADR-090's plan; each step its own pull request, measured, and merged only on the owner's word)

| step | what | changes games? |
|---|---|---|
| **S-a** | the stem plays out at the line and is recorded: the cadence, the Mike's call, the shift, snap on movement, the re-call's roll, and the snap spots of every ending; **nothing reads it after the snap** (arm T as the shipped default) | no: proved replay for replay, only the stream grows |
| **S-b** | the stem's effects: the re-call, the on-time edge, the caught cost, the called-off gaps; switched off until measured, then switched on on the owner's word | yes |
| **S-c** | defensive offside (question S2) | yes |
| **S-d** | Stem Back and Double Stem | yes |
| (after motion) | auto-stem | yes |

S-a can be built while ADR-089 is still being measured, because it changes no outcome. S-b and later touch pass-rush reps, so they wait until ADR-089 has finished measuring (the same rule as ADR-090's steps after 2).

## 13. Implied scope (`unruled`)

- **Crowd noise** (`match-engine.md` §16.3): every noise term above reads 0 until it exists.
- **A veteran lineman as the caller** instead of the Mike (owner's notes, point 2): a later coaching option.
- **The re-identification of a moved man in man protection** (ADR-068 step 5): today protection pairs by role, not by where a man stands (`engine/src/game/playbook.ts:55-70`, CHECKED), so the re-call works through the line's read and slide; pairing by alignment comes later and would make the stem's edge bigger.
- **The pre-snap penalties in §8's last paragraph**, and the hard count's cost to the offence (false starts).
- **Disguise skill in the stem** (ADR-075's rating once it exists): a line whose men tip the move before the call.

## 14. Questions for the owner

| # | question | options | recommended |
|---|---|---|---|
| **S1** | Which of the Mike's ratings time the stem? | **Awareness and Play Recognition** (ratings every linebacker already has) / **A new rating, Line Calls** (for Mikes and centres; 50 for everyone until we can measure it) | **Awareness and Play Recognition** |
| **S2** | When a stem draws the line offside, is it a 5-yard penalty now? | **Enforce** (the game's first penalty: a free play, the offence keeps the better result) / **Count only** (recorded, no yards, until a penalties design) | **Enforce** |

**Confirmations, not questions** (each stands unless the owner says otherwise): the cadence mix and the hard count at home only (D1); the timing bands (D3); snap on movement as a coached rule at rung 0 (§5.4); the centre's re-call as `match-engine.md` §16.3 writes it (§5.5); offside only after a snap on movement (§5.6); a called-off stem plays from where it stands (§6, the owner's notes); Stem Back and Double Stem as §7 describes, with Double Stem on third and 7 or more; the auto-stem after motion (§7.3); every dial CHOSEN and filed before any test run.

## 15. Provenance of factual claims

| claim | where from | tag |
|---|---|---|
| The owner's stem notes and his sources | the owner's message, 2026-10-30 20:17Z | REPORTED, OWNER, EXTERNAL |
| Stem mechanics today: shown one position over, against the played strength; legality; the slide-only effect | ADR-073 §2.5 (`:562-586`) | CHECKED |
| The Stem lowered sacks 0.41 points a snap on its live snaps, against a filed rise | ADR-073 §10, 3.5 (`:3087`) | REPORTED (that ADR's measurement) |
| Front looks worn on 9.22% of dropbacks, 44.4% Stems | ADR-073 §10, 3.5 (`:3112`) | REPORTED (that ADR's measurement) |
| Front looks are laid over run calls too; the run simulation has no pre-snap stage | `calibration/src/caller/frozen.ts:869`; ADR-068 §6 | CHECKED |
| `LB_M` is on the field in every personnel group | `playbook/src/roles.ts:180-198` | CHECKED |
| Ratings that exist and their positions | `contracts/src/registry.ts:63-130` | CHECKED |
| `communication`, `snap_jump` and `penalty_check` are `CheckKind`s; `PENALTY` exists; nothing produces a penalty | `contracts/src/events.ts:147`, `:531`; `engine/src/game/events.ts:60` | CHECKED |
| The communication checks: protection calls 45 + noise, defensive adjustments 40 + noise, the hard count as awareness + football IQ against discipline, at home | `match-engine.md` §16.3 | CHECKED |
| Protection pairs the four down linemen by role, not by alignment | `engine/src/game/playbook.ts:55-70` | CHECKED |
| Real pre-snap penalty rates | nflverse play-by-play 2022-2024, regular season | COMPUTED (this ADR) |
| The endings' shares and the offside estimate with every rating at 50 | §5's formulas | COMPUTED (this ADR) |
| Every dial D1 to D14 | football judgement | CHOSEN, provenance NONE beyond the cited figures |

## 16. Decision

*Pending the owner's answers to §14.*
