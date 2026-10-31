# ADR-091 (DESIGN): the stem, called by the Mike and timed against the snap count

- **Date:** 2026-10-30
- **Proposed by:** Orchestrator (thread "Design snap spots for every player")
- **Status:** **approved (design), both questions ruled on 2026-10-30 (§16). Step S-a (ADR-090's step 3) planned 2026-10-31 (§17) and built the same day on the owner's typed yes for M1 to M4 with ADR-092's R2 to R4 (§17.1): the stem plays out at the line and is recorded, and no game moved (§17.2).** Nothing in `packages/` changes with this ADR. It takes the Stem out of ADR-090's question 1 and gives it its own timing. Two questions go to the owner (§14), in plain words in [ADR-091-questions-explained.md](ADR-091-questions-explained.md) and on cards in the thread; **both were ruled on 2026-10-30 (§16): S1 at 23:40Z, S2 at 23:42Z (the NFL's own rules for offside).** Each contracts edit in §11 needs the owner's typed yes naming it, asked at the step that needs it. **Revised 2026-10-30, later the same evening:** the quarterback term in the Mike's timing (§5.2) is replaced by [ADR-092](ADR-092-the-battle-over-the-snap-count.md)'s count read, after the owner asked why the quarterback's Awareness was in it and sent notes on film study and in-game adjustments. **Revised again at 21:27Z:** the owner showed that real defenses stem 5 to 15 times a game, set by the coordinator, so each DC now has his own stem rate, about 9 a game on average, with the offense adjusting to it (§7.4), and the offside dial D6 is lowered to keep stem offsides inside D14. The owner never merges: each step comes with its numbers and needs the owner's word before the Orchestrator merges it.
- **Asked for by:** the owner, 2026-10-30 20:17Z: *"We need to build a more advanced system for stemming. ... It sounds like the middle linebacker calls the stem and a lot of risk is based on his timing and the line's execution. So, the mechanics here need to take into account the linebacker's attributes."* The owner attached notes on how stems are called, timed, countered and punished (§1.1).
- **Builds on, and does not reopen:** ADR-073 (the Stem as a front look: the line shown one position toward the side opposite the played strength, legal only where three or more down linemen rush and none drops; the owner's rate of one front look in ten legal calls, which §7.4 replaces for the Stem); ADR-090 (snap spots; this ADR fills its beat 6 for every stem); ADR-068 step 7 (the hard count, with the dead `CheckKind`s it names) and step 5 (the line re-identifying a moved man); ADR-072 (`discipline`, whose registry note already says "pre-snap penalties later", `contracts/src/registry.ts:128`); `match-engine.md` §16.3 (the communication checks); ADR-005 (a die only when it matters).

## Shorthand used here

| word | what it means |
|---|---|
| **lineup front** | where the line stands when it first sets, before any stem |
| **stem-to front** | where the stem moves it to before the snap |
| **the Mike** | the middle linebacker, `LB_M`, on the field in every personnel group (`playbook/src/roles.ts:180-198`, CHECKED) |
| **cadence** | how the quarterback runs his snap count: **normal**, **quick** (the ball comes on the first sound) or **hard count** (a long count meant to bait the defense) |
| **on time / early / caught / called off** | the four ways a stem ends (§6) |
| **the re-call** | the center seeing the stem and changing the line's blocking ("Alert! Alert!") |
| **snap on movement** | the quarterback seeing the line start to shift and getting the ball snapped at once |
| **free play** | a play run with the defense offside: the offense keeps the result or takes the 5 yards, whichever is better |

## 1. The need

**Today a Stem has no time in it.** The caller draws it as a front look (ADR-073 §2.5): the offense's line is shown the front one position over, the line's read and its slide check see that picture, and the engine plays the card's front. Nobody calls it, nobody times it, nobody can be caught moving, and its only effect is where a slide thinks the strength is. Measured on the snaps where it could matter, it lowered sacks by 0.41 points a snap against a filed rise (ADR-073 §10, 3.5, `:3087`, REPORTED from that ADR's measurement), so in the game today it barely works and works the wrong way. Under ADR-090's question 1 as first drafted, the line would simply have been at its played gaps at the snap; the owner's objection (2026-10-30 20:03Z, "sounds like cheating to me") was right, because a move that takes no time and can never go wrong is free.

### 1.1 The owner's notes (REPORTED, OWNER, EXTERNAL; the sources he cited are not opened here)

1. **It is part of the call.** The coordinator puts a tag on the call ("Move"): line up in front A, shift to front B before the snap. Linemen never freelance a stem, because every man owns a gap.
2. **The Mike pulls the trigger.** He (or a veteran lineman) watches the quarterback's cadence and yells "MOVE!" on a chosen word, and the whole line jumps together.
3. **Auto-stems** are rules in the game plan: a stem in answer to motion or an unexpected formation, with no call from the sideline.
4. **Late is dangerous.** A call a beat late, or a quick count, catches the line moving: a man caught shuffling sideways at the snap stands up, loses his leverage, gets washed out of his gap and opens a lane for the back.
5. **Offside.** If the quarterback sees the line start to move he snaps at once, and the movers' momentum carries them offside: 5 yards.
6. **Defensive delay of game** for a stem so abrupt it mimics the cadence.
7. **"Earlier is always better than later."** If the quarterback gets deep into a hard count and the line has not moved, it calls the stem off and plays from where it stands.
8. **The offense's answer.** The center is the brain of the line: if the stem comes early enough he points and yells a new call, and everyone's blocking changes. If he misses it, the quarterback can alert the back's pickup.
9. **The double-cross.** Stem from A to B on purpose, let the center re-call, then slant back into A's gaps at the snap.
10. **The double stem.** Shift once early to make the center re-call, then shift again late when there is no time left. Rare: third and long against a team with a long hard count.
11. **A game of chicken.** The defense wants to stem as late as it can; the offense wants to force it early with hard counts.

## 2. The design in brief

1. **The stem stays a tag the caller draws**, now at **each DC's own rate, about 9 a game on average** (§7.4, from the owner's source; the Mug keeps the 1 in 10), and it now names **who triggers it: the Mike.**
2. **At the line it plays out in time**: the line sets in its lineup front and the offense's line reads it (built today); the quarterback starts his cadence; the Mike calls MOVE; the line shifts; the ball is snapped.
3. **Four rolls decide it, each rolled only when it matters**: the Mike's timing (his Awareness and Play Recognition, against the cadence and how well his defense knows this quarterback's count, ADR-092's count read); the line's shift (each lineman's Reaction and Agility); the quarterback's snap on movement; the center's re-call. A fifth, the offside check (each caught man's Discipline and Agility), is rolled only when the quarterback snapped on movement.
4. **Four endings** (§6): **on time** (the offense blocked the wrong front: each moved man gets a small edge), **early** (the center may re-call; if he does, the stem is wasted), **caught** (the man is between gaps, standing up and moving at the snap: a big disadvantage, and an offside chance if the quarterback snapped on the move), **called off** (the line plays from where it stands).
5. **The double-cross ("Stem Back") and the double stem** are built after the plain stem (§7). The auto-stem is built after motion (§7.3).
6. **Offside is the game's first penalty**: question S2 (§8, §14).

## 3. Who does what

| who | what | attributes read (through the registry) |
|---|---|---|
| defensive coordinator | calls the stem as a tag on the call (unchanged: the caller's front-look draw) | none |
| **the Mike** (`LB_M`) | watches the cadence and calls MOVE | **Awareness, Play Recognition** (question S1) |
| each lineman who moves | shifts on the call; if caught moving after a quick snap, may run offside | **Reaction, Agility**; **Discipline, Agility** for offside |
| the quarterback | runs the cadence; may snap on movement | **Football IQ** (how much of his count can be read, through ADR-092's count read; ADR-092 §3 says why Awareness is left out of it); **Awareness, Reaction** (snap on movement) |
| the center | sees an early stem and re-calls the blocking | **Awareness**, with the line's average Awareness (`match-engine.md` §16.3 item 3) |
| the offensive coordinator | chooses the cadence (§5.1) | none |

ADR-092 adds the coordinators: the defensive staff's film study and halftime notes, and the offensive coordinator's fixes during the game, all through the count read.

All of these attributes exist today for those positions (`contracts/src/registry.ts:63-130`, CHECKED: `awareness` and `reaction` for every position; `playRecognition` for LB and DB; `footballIQ` for QB; `agility` and `discipline` for every position). **No new rating** under question S1's recommended answer.

## 4. The timeline at the line

1. **The line sets in its lineup front.** The offense's line reads it and sets its blocking: the pressure read and the slide check, built today (ADR-073 3.2b, 3.3), on the shown rush.
2. **The quarterback starts his cadence** (§5.1).
3. **The Mike calls MOVE** (§5.2): on time, early, late or not at all.
4. **The line shifts** (§5.3), about half a second for one gap (INFERRED: about 1.5 yards sideways).
5. **If the stem came early**, the quarterback may snap on movement (§5.4); if he does not, the center may re-call (§5.5).
6. **The snap.** ADR-090's snap picture records where each lineman is (§6).

## 5. The rolls

Each is a `CHECK` on the stream with its own fork address, so no existing draw moves (ADR-005; the fork discipline ADR-073 used).

### 5.1 The cadence (the offense's choice)

Drawn **only on a snap whose defense wears a stem** (nothing else reads the cadence yet, so a draw elsewhere would be a die that decides nothing, ADR-005), on the offense's own fork, from the offense's mix (default D1, CHOSEN; no public figure exists for how often teams use each count):

| situation | normal | quick | hard count |
|---|---|---|---|
| the offense at home | 80 | 10 | 10 |
| at home, third or fourth down with 2 yards or less to go | 60 | 10 | 30 |
| the offense on the road | 90 | 10 | 0 |

**A hard count only at home**, because on the road the noise forces a silent count (`match-engine.md` §16.3, "Hard Count (HOME)"; "silent count ... eliminates snap count jump risk"). **Short yardage at home** is where real offenses use the hard count most, to draw the defense offside for the first down (INFERRED, football judgment).

### 5.2 The Mike's timing

`d100 + Mike's Awareness ÷ 5 + Mike's Play Recognition ÷ 5 + (count read − 50) ÷ 2.5` against `50 + cadence row + noise`, where the cadence row is normal +0, quick +15, hard count +10, and noise is 0 until crowd noise is built (`match-engine.md` §16.3 lists +10 to +25). The **count read** (ADR-092) is how well this defense knows this offense's count at that snap, 0 to 100: it starts from the week's film study, grows as the Mike hears the count, and falls when the offense changes its count. It replaces the first draft's quarterback term, `(QB Awareness + QB Football IQ − 100) ÷ 10`, which was the same on every snap and counted the quarterback's Awareness twice (ADR-092 §3). Default D2, CHOSEN, in the engine's usual `rating ÷ 5` form; the count read's weight is ADR-092's D11.

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

`d100 + QB Awareness ÷ 5 + QB Reaction ÷ 5` against 80 (default D5, CHOSEN). **Made: he gets the ball snapped while the line is moving, and every lineman who moved is caught**, with the offside check of §5.6. No leash rung: snapping on movement is a coached rule of the offense, so it is the call's, at rung 0 (ADR-072 §1's reading of what a call already contains).

### 5.5 The center's re-call (an early stem the quarterback did not snap on)

`d100 + Center's Awareness ÷ 5 + the offensive line's average Awareness ÷ 5` against `45 + noise`: `match-engine.md` §16.3 item 3's protection-call roll as written, given its first producer through the dead `CheckKind` `communication` (`contracts/src/events.ts:147`, CHECKED). **Made: the line's read and the slide check run again on the front the line moved to**, so the blocking is right and the stem has bought nothing. **Missed: the blocking stays on the lineup front.** Rolled only when the stem was early and the ball was not snapped on movement.

### 5.6 Offside (a stem caught by a snap on movement only)

Each caught lineman: `d100 + Discipline ÷ 5 + Agility ÷ 5` against 25 (default D6, CHOSEN; an average lineman crosses 4 times in 100). It was 40 until stems went to about 9 a game (§7.4): at 40 they would draw 5.6 offsides per 1,000 snaps, two-thirds of all real defensive offside, neutral zone and encroachment flags, where stems should be a small part of them (D14). It goes through the dead `CheckKind` `penalty_check` (`contracts/src/events.ts:147`). **The first miss is defensive offside** (§8). Rolled only after a snap on movement, because that is the scenario in the owner's notes (point 5): a line caught by a late call or a quick count is moving sideways, not drifting across the ball because the quarterback snapped on its first step.

## 6. What each ending does

| ending | where the moved linemen are at the snap (ADR-090) | whose front the blocking was set on | effect after the snap |
|---|---|---|---|
| **on time** | set in the stem-to front, hand down | the lineup front: **the stem worked** | each moved man: **+5 on his first pass-rush rep and on his run-blocking contest** (his blocker set his feet for a man who is no longer there; dial `stemWrongFoot`, D7, CHOSEN) |
| **early, re-called** | set in the stem-to front | the stem-to front: the center caught it | none |
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
- **Then:** the quarterback may snap on movement (caught, with offside chance); if not, the center may re-call. **The double-cross works when the center is good:** if he re-calls, each man who slants back gets **+10 on his first pass-rush rep and on his run contest** (dial `stemBackBite`, D10, CHOSEN). If he does not, his line is still set on the card's front, which is right, and the slant runs into a ready blocker: **−5** (dial `stemBackReady`, D10).
- **Where they are at the snap:** set in the picture's gaps; the slant is the first thing they do after the snap.

### 7.2 Double Stem (owner's notes, point 10)

- **When:** third down with 7 or more to go only (default D11, CHOSEN, from the notes' "third and long").
- **The call:** line up in the card's front, shift to the Stem's picture early (the bait), shift back to the card's front late.
- **The first shift** is early by design: snap on movement (caught), else the re-call (made: the bait is taken and the blocking moves to the picture; missed: it stays on the card's front).
- **The second shift happens only against a hard count**, because only a quarterback holding the ball at the line leaves time for two moves. Against a normal or quick count the Mike calls the second shift off and the line plays from the picture (the called-off rule). Against a hard count the Mike's timing roll is rolled for the second shift with **+10** (a second move is harder), and its ending is read from the hard-count column, with "early" giving the center a second re-call.
- **The mix among stems** (default D12, CHOSEN): of the stems the caller draws, Stem 80, Stem Back 15, Double Stem 5 where legal (else Stem). How many stems he draws is §7.4's.

### 7.3 Auto-stem (owner's notes, point 3; after motion)

An auto-stem is a stem the Mike calls at the line in answer to what the offense shows: motion across the tackle, or a formation strength the call did not expect. It needs motion (ADR-074, not built) and a rule in the weekly game plan (ADR-076, not built), so it is **designed in outline only**: the same timing, shift, re-call and offside rolls, plus `match-engine.md` §16.3 item 4's adjustment call (`d100 + Mike's Awareness ÷ 5` against `40 + noise`; a miss leaves one lineman unshifted) once crowd noise exists. It is built after motion.

### 7.4 How often, and when (the owner's source, 2026-10-30 21:27Z)

**The source** (REPORTED, OWNER, EXTERNAL; the coaching sites and forums it cites are not opened here): in a standard game a defensive line stems about **5 to 15 times, 10 to 25 in 100 snaps**, "like a change-of-pace pitch". How often is the coordinator's philosophy. **Multiplicity** coordinators (Flores, Spagnuolo, Knowles) stem a lot and pair it with complex blitzes and stunts. **Execution** coordinators (the Fangio tree, Schwartz) rarely do, because they want their linemen set to explode on the snap. Even a high-stem coordinator saves it for situations: against check-with-me offenses, on third and long (to break protection rules for a twist or a blitz), and against a backup or rookie center. Overused, "the offense adjusts, the quarterback starts using hard counts, and the strategy loses its element of surprise".

**The game today wears the Stem far less:** ADR-073's rate of one front look in ten legal calls, which the owner ruled with no real figure on file (`ADR-073:968`), puts it on about 4 snaps in 100, about 2.5 a game.

- **The league rate (D15, CHOSEN from the source):** **15 stems in 100 snaps, about 9 a game**, in the frozen calibration caller, which stays coach-agnostic (ADR-075 §3.4). It replaces the 1 in 10 for the Stem only; the Mug keeps it.
- **Each coordinator's own rate (D16, CHOSEN):** drawn around 15 with a spread of 6 points, kept between 3 and 32, and the league's mean held at exactly 15 (ADR-075 §3.3's re-centering). About two coordinators in three land between 9 and 21 in 100 (5 to 13 a game); about one in six are execution coordinators below 9 (2 to 5 a game), and one in six multiplicity coordinators above 21 (13 to 20 a game). It is a new field on the DC's style (petition M7). When the human calls the defense, he picks his own stems (ADR-075 §3.4).
- **When he stems more (D17, CHOSEN):** on third and 7 or more, at twice his rate, with his other snaps lowered so the game's total holds (ADR-076's rule that a plan moves calls between situations without changing the totals); there the stem goes on a call with a stunt or a blitz when the call has one. For a whole game, at 1.5 times his rate against a rookie or a backup starting at center, and at 1.5 times against an offense in the league's top third for changing its play at the line (seen on film, so built with ADR-076's film).
- **The offense adjusts (D18, CHOSEN):** at home, each stem the offense has seen in the game adds 2 points to its hard-count share (D1), up to 40 in 100; on the road the crowd still forces a silent count. And each stem it has seen takes a quarter of a point off the on-time edge (D7's +5), down to +2: the surprise wears off.

**What the rate does** (COMPUTED: simulated with every rating at 50 and ADR-092's count read; script in the project's shared folder, `design/ADR-092-data/`):

| stems in 100 snaps | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|
| stems a game | 3.1 | 6.2 | 9.3 | 12.4 | 15.5 | 18.6 |
| works / caught, in 100 stems | 66.8 / 18.2 | 65.8 / 18.7 | 65.1 / 19.2 | 64.6 / 19.3 | 64.2 / 19.5 | 63.9 / 19.5 |
| hard counts among them, in 100 | 9 | 12 | 14 | 17 | 18 | 20 |
| on-time edge per stem that works | 4.6 | 4.2 | 3.9 | 3.5 | 3.2 | 3.0 |
| stems caught a game | 0.6 | 1.2 | 1.8 | 2.4 | 3.0 | 3.6 |
| rough tally a game | +14 | +20 | +19 | +15 | +7 | −1 |
| stem offsides per 1,000 snaps | 0.5 | 0.9 | 1.4 | 1.9 | 2.4 | 2.9 |

The rough tally adds each moved man's on-time edge and takes off 10 for each man caught (3.5 movers a stem). It is not yards; it only shows the shape before S-b measures the real effect. **With average players, stemming pays most at about 6 to 9 a game and stops paying near 18**: the source's change-of-pace pitch. A great Mike is caught about half as often (ADR-092 §7), which moves the peak up, so a multiplicity coordinator needs the players for it.

## 8. Defensive offside, the game's first penalty (question S2)

Nothing produces a penalty today: `PENALTY` is in the contracts (`contracts/src/events.ts:531`, CHECKED) and `penalty_check` has no producer (`engine/src/game/events.ts:60`, CHECKED).

**Ruled (S2, 2026-10-30 23:42Z): the NFL's rules.** A stem that leaves a lineman offside at the snap is flagged, and the penalty is the one the NFL enforces for defensive offside, as below. No other phase is waited on: this is the game's first penalty, built at step 6 of ADR-090's plan, after the stem's effects are measured. The fouls a stem can draw before the snap in the NFL (a neutral zone infraction when an offensive lineman reacts to a defender in the neutral zone, encroachment on contact, and the defensive delay of game for an abrupt movement that draws a flinch, the owner's notes, point 6) come with the every-snap count design (ADR-092 C1, ruled yes), and each will carry the penalty the NFL enforces for it.

**Officials are human (the owner's note, 2026-10-30 23:59Z):** "whenever we go over penalties ... we need to create a system that accounts for imperfect human reffing." So the game's penalty design must model officiating the way it really happens: fouls that go unflagged, flags thrown when there was no foul, and crews that call more or fewer than others, each foul by how visible it is (offside at the snap is plain to see, holding in the pile is not), measured against real numbers wherever they exist. Until that design, the stem's offside is flagged every time it happens.

**Under "Enforce" (recommended, and ruled):** offside at the snap is a **free play**. The play runs. Then the offense takes the better of the play's result or **5 yards from the previous spot with the down replayed** (half the distance to the goal line instead when 5 yards is more than half of it, that is, from inside the defense's 10; a first down only when the yards reach the line to gain, never an automatic one; REPORTED, §15). **The choice is the coach's** (authority `COACH`, Iron Rule 6); for a team the computer runs, the rule is (default D13, CHOSEN; revised 2026-10-30 so the computer never declines a better penalty): **keep the play** if it scored, or if it made a first down and gained more yards than the penalty would give; otherwise **take the penalty**, which also wipes out a turnover or a safety. It is its own step (§12), after the stem's own effects are measured.

**Under "Count only":** the offside is recorded on the play (a `PENALTY` event, declined, 0 yards) and calibration counts it; no yards move until a design for penalties.

**Not in this ADR** (each `unruled`): encroachment and neutral zone infraction (dead balls before the snap); the defensive delay of game for an abrupt stem (owner's notes, point 6; real rate 0.18 per 1,000 snaps from every cause, §9.1); offensive false starts on a hard count (the cost the offense pays for it, `match-engine.md` §16.3 item 1); the quarterback taking a free shot downfield on a free play; crowd noise.

## 9. Real numbers, and what the design expects

### 9.1 Real pre-snap penalty rates (COMPUTED, nflverse play-by-play, regular seasons 2022-2024, 815 games, 101,197 run and pass plays)

| flag | per 1,000 snaps | per team-game |
|---|---|---|
| defensive offside | 4.33 | 0.27 |
| neutral zone infraction | 2.63 | 0.16 |
| encroachment | 0.99 | 0.06 |
| **all three** | **7.95** | **0.49** |
| defensive delay of game | 0.18 | 0.01 |
| false start (offense) | 18.51 | 1.15 |

Counted as plays whose play record carries the flag (`penalty = 1`, `penalty_type`, the play record's first penalty), over run and pass plays; method in [ADR-091-real-penalty-rates.md](ADR-091-real-penalty-rates.md). **No public figure says how many of them come from stems**; most come from rushers jumping the count (INFERRED, football judgment).

### 9.2 What the formulas give with every rating at 50 (COMPUTED from §5, with the count read at 50, which is a whole game's average under ADR-092; its §7 gives the shares by quarter)

| stem endings (plain stem, the offense at home) | share of stems |
|---|---|
| on time | 62.9% |
| early, then snapped on movement (caught) | 7.1% |
| early, then re-called | 7.7% |
| early, not re-called (works) | 2.4% |
| caught by a late call or a quick count | 12.4% |
| called off | 7.5% |

So the stem works about **65** times in 100, is **caught about 20** times in 100 and is wasted or called off about **15** times in 100. On the road (no hard count) on time is 63.9 and caught 20.4 (COMPUTED the same way).

**At the league's stem rate (§7.4).** Today stems are worn on about 4.1% of dropbacks (ADR-073 3.5: a front look on 9.22% of dropbacks, 44.4% of them Stems, `ADR-073:3112`, REPORTED from that measurement). At §7.4's 15 in 100 snaps, with the offense adjusting (D18) and ADR-092's count read, a whole game with every rating at 50 averages **works 65, caught 19, wasted or called off 16** (COMPUTED by simulation, ADR-092 §7): the shares above about hold, because the count read is centered there, and the offense's extra hard counts (14 stems in 100 meet one instead of 7) move about a point from caught to called off.

**Offside:** `0.15 × 0.172 (early) × 0.41 (snapped on movement) × 0.133 (at least one of about 3.5 movers offside at 4 in 100 each, D6 at 25)` gives about **1.4 offsides per 1,000 snaps** (COMPUTED; the simulation of ADR-092 §7 agrees, 1.42), a sixth of all real defensive offside, neutral zone and encroachment flags. At the old D6 of 40 it would be 5.6.

**Band, filed now (D14, CHOSEN):** stem offsides between **0.2 and 2.0 per 1,000 snaps**: some, and no more than a quarter of the real total of 7.95. A miss is brought to the owner with its numbers, never fitted away.

## 10. Measuring it

**Conjoined mechanisms.** The timing (who ends where), the on-time edge, the caught cost, the re-call, and offside are **separately priceable**, so each is measured alone and then jointly, on the stem snaps (stems worn) of both test leagues:

| arm | on |
|---|---|
| T | timing only: the endings and the snap spots, no effect after the snap, blocking still on the lineup front |
| T+R | with the re-call (blocking moves to the stem-to front when the center makes it) |
| T+W | with the on-time edge (D7) |
| T+C | with the caught cost (D8, D9) |
| joint | all of the above |
| joint+O | joint with offside (under question S2) |

**Predictions, filed now:** in the joint arm, sacks on stem snaps rise against today's v7 (the Stem's filed rise, which failed as built in ADR-073 3.5, ought now to hold); rushing yards on caught stems exceed those on on-time stems; T moves no sack or yard at all (it changes only spots and the stream); offside per 1,000 snaps inside D14's band (expected 1.4); the calibration caller's stems on 14 to 16 in 100 snaps (§7.4, D15).

## 11. Contract petitions (shape only; each needs the owner's typed yes naming it, at its step)

| # | edit | why |
|---|---|---|
| **M1** | `cadence?: "NORMAL" \| "QUICK" \| "HARD_COUNT"` on `OffensivePlayCall` and `RunPlayCall`; absent means normal | the offense's call carries it, and the stream echoes it (Iron Rule 3) |
| **M2** | `stem?` on `DefensivePlayCall`: which stem (`STEM`, `STEM_BACK`, `DOUBLE_STEM`) and the man who triggers it; for the two new kinds, the picture they stem to | the engine resolves fields, never tag names (`contracts/src/playcalls.ts:486-491`) |
| **M3** | new `CheckKind`s `stem_timing`, `stem_shift`, `snap_on_movement`; first producers for the existing `communication` (the re-call) and `penalty_check` (offside) | every die is a `CHECK` (ADR-004) |
| **M4** | a `STEM` event before the snap: the cadence, the kind, the ending, whether the center re-called, and who was caught | the play log, the viewer and calibration read one record |
| **M5** | `PENALTY`'s payload: `freePlay` and the offense's choice, with a coach decision kind for accepting a penalty | only under question S2's "Enforce" |
| **M6** | doc text: the front `LOOK` tag and `shownRush` ("never what is played", `playcalls.ts:471`, `:573`) gain "except a called-off stem, which plays from where it stands (ADR-091)" | the comment states the rule |
| **M7** | `stemShare?: number` on `DefensiveDisguiseTendency` (`contracts/src/staff.ts`, beside `frontLookShare`): the DC's own stem rate, share of snaps; absent means the league rate, 0.15 | each DC stems at his own rate (§7.4); `frontLookShare` stays the Mug's |

**No new rating** under question S1's recommended answer.

## 12. Build order (inside ADR-090's plan; each step its own pull request, measured, and merged only on the owner's word)

| step | what | changes games? |
|---|---|---|
| **S-a** | the stem plays out at the line and is recorded: the cadence, the Mike's call, the shift, snap on movement, the re-call's roll, and the snap spots of every ending, with ADR-092's count read (every coordinator at 50 until its step S-b2); **nothing reads it after the snap** (arm T as the shipped default) | no: proved replay for replay, only the stream grows |
| **S-b** | the stem's effects: the re-call, the on-time edge, the caught cost, the called-off gaps; switched off until measured, then switched on on the owner's word | yes |
| **S-c** | defensive offside (question S2) | yes |
| **S-d** | Stem Back and Double Stem | yes |
| (after motion) | auto-stem | yes |

S-a can be built while ADR-089 is still being measured, because it changes no outcome. **The new stem rate (§7.4) lands with S-b, not S-a**: wearing the Stem more often changes the line's read and slide check, which are built today, so it changes games and waits for the pocket fix like every such step. S-b and later touch pass-rush reps, so they wait until ADR-089 has finished measuring (the same rule as ADR-090's steps after 2).

## 13. Implied scope (`unruled`)

- **Crowd noise** (`match-engine.md` §16.3): every noise term above reads 0 until it exists.
- **A veteran lineman as the caller** instead of the Mike (owner's notes, point 2): a later coaching option.
- **The re-identification of a moved man in man protection** (ADR-068 step 5): today protection pairs by role, not by where a man stands (`engine/src/game/playbook.ts:55-70`, CHECKED), so the re-call works through the line's read and slide; pairing by alignment comes later and would make the stem's edge bigger.
- **The pre-snap penalties in §8's last paragraph**, and the hard count's cost to the offense (false starts).
- **Imperfect officiating** (the owner's note, 2026-10-30 23:59Z; §8): for whenever penalties are designed, missed fouls, flags on nothing and crew tendencies, by foul type, against real numbers.
- **Disguise skill in the stem** (ADR-075's rating once it exists): a line whose men tip the move before the call.
- **The even-to-odd stem** (the owner's source: line up with four down linemen so the offense sets its protection, then shift to three with backers crowding the line at the last second), the multiplicity coordinators' favorite. It changes the front's shape, not just its side, so it needs its own tables.
- **A coordinator who changes his rate during a game** (stems less once the offense goes to hard counts), and **one who sets his rate from his Mike** (a great Mike makes stems pay at higher rates, §7.4).
- **A DC's stem rate following his pressure rate** once DCs have their own blitz rates (the source: high-stem DCs run complex blitzes and stunts).

## 14. Questions for the owner

| # | question | options | recommended |
|---|---|---|---|
| **S1** | Which of the Mike's ratings time the stem? | **Awareness and Play Recognition** (ratings every linebacker already has) / **A new rating, Line Calls** (for Mikes and centers; 50 for everyone until we can measure it) | **Awareness and Play Recognition** |
| **S2** | When a stem draws the line offside, is it a 5-yard penalty now? | **Enforce** (the game's first penalty: a free play, the offense keeps the better result) / **Count only** (recorded, no yards, until a penalties design) | **Enforce** |

**Confirmations, not questions** (each stands unless the owner says otherwise): the cadence mix and the hard count at home only (D1); the timing bands (D3); snap on movement as a coached rule at rung 0 (§5.4); the center's re-call as `match-engine.md` §16.3 writes it (§5.5); offside only after a snap on movement (§5.6); a called-off stem plays from where it stands (§6, the owner's notes); Stem Back and Double Stem as §7 describes, with Double Stem on third and 7 or more; the auto-stem after motion (§7.3); each DC's stem rate, the situations where he stems more and the offense's adjustment (§7.4, D15 to D18, from the owner's source); offside at D6 25 (§5.6); every dial CHOSEN and filed before any test run.

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
| How often real defenses stem (5 to 15 a game, 10 to 25 in 100 snaps), set by the coordinator; high-stem and low-stem coordinators; third and long, inexperienced centers and check-with-me offenses; overuse brings hard counts and loses surprise | the owner's source, 2026-10-30 21:27Z (coaching sites and forums he cited, not opened here) | REPORTED, OWNER, EXTERNAL |
| ADR-073's 1 in 10 front-look rate had no real figure behind it | ADR-073 `:968` | CHECKED |
| §7.4's shares by stem rate and its rough value tally | the formulas, simulated (ADR-092's script) | COMPUTED |
| Defensive offside: 5 yards; half the distance to the goal line when the penalty is more than half of it (NFL Rule 14, Section 2, Article 1, as summarized); the play continues and the offense takes the play or the penalty | [Offside (American football)](https://en.wikipedia.org/wiki/Offside_(American_football)); [Pro Football Network, half the distance](https://www.profootballnetwork.com/?p=707867); [NFL video rulebook, neutral zone infraction](https://operations.nfl.com/the-rules/nfl-video-rulebook/neutral-zone-infraction) | REPORTED (secondary sources; the rulebook itself not opened here) |
| Every dial D1 to D18 | football judgment | CHOSEN, provenance NONE beyond the cited figures |

## 16. Decision

| # | question | ruling | when |
|---|---|---|---|
| S1 | Which of the Mike's ratings time the stem? | ✅ **Awareness and Play Recognition** (§3, §5.2): Play Recognition reads what the play gives away about the count (a short-yardage hard count, a quick snap on a quick pass, later a snap timed to motion), and Awareness sees the moment itself; no new rating | owner, 2026-10-30 23:40Z (card tap, after asking at 22:30Z whether recognizing the play pre-snap helps the Mike time the count) |
| S2 | Offside from a stem: a 5-yard penalty now, or only counted? | ✅ **Enforce, by the NFL's rules** (§8): flagged (every time until the officiating design the owner asked for at 23:59Z, §8); 5 yards from the previous spot, or half the distance inside the defense's 10; a free play, the offense's option; built at step 6. The owner, in words: "For S2 follow the real NFL rules. If you're waiting on another phase for penalties then it's okay to wait, just make a note that a stem drawing offsides will certainly be resulting in whatever penalty the NFL naturally enforces." | owner, 2026-10-30 23:42Z (in the thread) |

## 17. Step S-a: how it is built (plan, 2026-10-31)

ADR-090's step 3. Written before the build; the record of what was built and measured follows it.

**The contract edits it needs, and only these:** M1, M2, M3 and M4 (§11), with ADR-092's R2, R3 and R4. Asked of the owner on 2026-10-31 at 13:16Z, each needing his typed yes naming it. M5 (the penalty) waits for S-c, M6 (the called-off stem's gaps) and M7 (each DC's rate) for S-b, and ADR-092's R1 and R5 for its S-b2. **No new petition:** the picture keeps its step-1 shape, because the defense's play-caller draws it for the ending the dice decided (below), so the engine never computes a spot.

**Where the stem plays out (amends §6's "one pre-snap function that both the pass and the run simulation call").** In the game loop, once per scrimmage snap, between the two calls and the line-up; one function for passes and runs alike. It has to come before the line-up because the picture the defense's caller draws (ADR-090 S5) shows the ending, and the caller is asked in the loop. In order, on a snap whose defense's call carries a stem (M2):

1. **The cadence (§5.1).** The offense's play-caller is asked for it, after both calls and only on a stem snap (ADR-005), on its own fork (`call:<n>/cadence`), and the call carries it (M1). Its mix is D1, with ADR-092 §5.4's three hard counts after a fix. A caller that names none plays a normal count.
2. **The count read for this snap (ADR-092 §4 to §6).** Arithmetic; no die.
3. **The rolls (§5.2 to §5.5),** each on its own fork under `call:<n>/stem`: the Mike's timing; each lineman's shift on an on-time stem; the quarterback's snap on movement on an early one; the center's re-call on an early one he did not snap on. Offside (§5.6) is S-c's.
4. **The line-up.** The defense's caller is handed the ending (on time, early, caught, called off) and, on an on-time stem, the linemen whose shift missed. The playbook's beat 6 draws it (built: `SnapInput.stem`, ADR-090 §4.6). Under any rules but `legacy` (the pocket fix's switches), the caller is handed no ending, so the picture stays on time: the pocket fix's step 3 reads the picture, and its rules refuse a moving lineman (agreed with that thread).
5. **The record.** The play's stream gets the stem's `CHECK`s and the `STEM` event (M4, R2) right after `PLAY_START`, as the reads at the line follow it. Nothing after the snap reads any of it (arm T).

**Between plays (ADR-092 §4 and §5).** The film read and the ceiling at kickoff, the live read after every snap of the offense, the halftime step, the stress rule, and the OC's notice after a drive in which a stem worked against him, with his fix at the start of his next drive (the DC's read of the change, the three hard counts, the habit). Each is a `SIDELINE_ADJUSTMENT` (R3), its rolls `CHECK`s of R4's kinds. Every coordinator is at 50 until S-b2.

**The proof.** Replay for replay: ADR-089's strip list gains this ADR's entries, in this ADR's own commit (risk K11): the `STEM` and `SIDELINE_ADJUSTMENT` events, the `CHECK`s of the new kinds (and `communication`, which nothing produced before), and the offense's cadence wherever the stream echoes a call. With them stripped, all 28 golden folds and the real season's pinned path are unchanged. The report gives the endings' shares on the stem snaps of both test leagues beside §9.2's, the cadences, the count read through a game beside ADR-092 §7, and the OC's fixes a game.

### 17.1 What was built (2026-10-31)

**The contract edits, as made** (the owner's typed yes, 2026-10-31 14:07Z: *"Yes, make contracts edits M1, M2, M3, M4, R2, R3 and R4"*; types and comments only, in a new `packages/contracts/src/stem.ts` and `events.ts`): **M1** `Cadence` (`NORMAL | QUICK | HARD_COUNT`) and `cadence?` on both offensive calls, absent meaning a normal count. **M2** `StemCall { kind: "STEM", trigger }` and `stem?` on `DefensivePlayCall`, present exactly when the call wears the Stem; the men it moves are the ones `shownRush` shows somewhere `rush` does not play them. **M3** the `CheckKind`s `stem_timing`, `stem_shift` and `snap_on_movement`, and the center's re-call as `communication`'s first producer. **M4 with R2** the play-scoped `STEM` event: the Mike, the movers, the count, the count read at that snap, the timing, the ending, the snap on movement and the re-call where rolled, who was still moving at the snap, and the timing roll's `rollRef`. **R3** the play-scoped `SIDELINE_ADJUSTMENT` event (`FILM_READ`, `HALFTIME`, `CADENCE_CHANGE`). **R4** the `CheckKind`s `adjustment_notice`, `adjustment_read` and `habit_drop`.

**The engine** (`packages/engine/src/game/atTheLine.ts`, with the dials in `stem.ts` and the count read's arithmetic in `countRead.ts`). Once per scrimmage snap, between the two calls and the line-up, the game loop runs the sideline's adjustments (`sidelineBeforeSnap`); when the defense's call wears a stem it asks the offense's caller for its count (`PlayCaller.cadence`, optional: a caller without one plays a normal count), plays the stem out (`resolveStem`: the Mike's timing; each mover's shift on an on-time stem; the quarterback's snap on movement on an early one; the center's re-call on an early pass he did not snap on) and hands the ending to the defense's caller for the picture (`LineUpRequest.stem`). The records ride on the play state into the stream right after `PLAY_START`, the sideline's first and the `STEM` last. After the snap (`sidelineAfterSnap`) the live read closes 5% of its gap to the ceiling (§5.1, with §5.3's stress in a close fourth quarter), an owed hard count is spent, and a stem that worked is remembered to the drive's end. Everything carried from snap to snap lives on `MatchState.countBattles` as plain values (the game loop's first commitment, state is a value). The dials stay module constants until S-b, because ADR-089 pins the tunables' census while it measures. Each roll is its own fork (`call:<n>/stem/timing`, `…/stem/shift:<id>`, `…/stem/snap-on-movement`, `…/stem/re-call`, `call:<n>/sideline/notice`, `…/new-word`, `…/habit`), and the count is `call:<n>/cadence`; forks are made by label, so no other stream moves.

**Two departures from the plan above, both narrower:**

- **Under `pocket-1` nothing at the line runs at all**: no count is asked, no die thrown, no record written, and no `countBattles` kept, where the plan said only that the caller is handed no ending. Agreed with the pocket fix's step 3, so that every `pocket-1` replay is byte for byte what it was with nothing stripped (`playsLegacyRules`, the one gate to today's rules).
- **The offense's count is echoed nowhere else in the stream.** `PLAY_START` echoes chosen fields of a call, never the whole call, so the `STEM` event (stripped whole) is the only place the count appears; the strip list needs no field for it.

**A case the build met and did not guess:** a quarterback who changes during a game (ADR-092 §5.5, D10) has no producer yet, since a game cannot change its quarterback; the engine refuses one with a message naming D10 rather than invent the backup's read.

**The playbook and the calibration caller.** The Stem front look carries its stem, called by the Mike (`frontLooks.ts`); the call validator refuses a stem whose caller is not on the call and a stem that moves nobody. The frozen caller answers the count with D1's mix and ADR-092 D8's owed hard counts (`calibration/src/caller/cadence.ts`), and draws the picture with the ending it is handed. The mirror and the play-scope capture carry both. The golden strip list (`pocket/golden.ts`) now takes off whole events and `CHECK`s by kind as well as fields, each entry naming its ADR (K11): this step's entries are `STEM` and `CHECK`s `stem_timing`, `stem_shift`, `snap_on_movement` and `communication` (ADR-091), and `SIDELINE_ADJUSTMENT` and `CHECK`s `adjustment_notice`, `adjustment_read` and `habit_drop` (ADR-092).

### 17.2 What was measured (2026-10-31)

MEASURED by `pnpm --filter @ff/calibration snap-spots -- --step 3` (about 2 minutes; [`reports/adr-090-step3.md`](../../packages/calibration/reports/adr-090-step3.md)): the golden games for the proof, and both leagues' base corpora (ADR-089 step 0, seed set 1: the flat league's 496 games and the generated league's 2027 season of 272) for the numbers, all under the default caller (v7) and today's rules.

- **Inert (the proof).** With this step's records stripped, all 28 golden folds (seven callers, two leagues, canonical and byte) and the real season's pinned path are unchanged (the test suite), and every `pocket-1` arm's pins hold byte for byte with nothing stripped. The report re-checks v7's 100 golden games: 288,693 and 304,621 events kept, 2,015 and 2,076 records taken off, both digests the same in both leagues. §10's prediction for arm T (no sack or yard moves) holds by this proof.
- **Every rule kept.** Ten rules read back off the streams of all 768 games, none broken: the timing is D3's from the Mike's margin and the count; each ending follows from its rolls' margins; the men still moving are the right ones; each roll is thrown only where it decides something; every total is its die plus its modifiers; the picture draws the ending; the records sit right after `PLAY_START`, the sideline's first and the `STEM` last; an owed hard count is a hard count; one film read per offense and at most one halftime step.
- **How often.** 4,641 stems: 4.2 in 100 snaps in the flat league and 4.3 in the generated league (4.1 and 4.2 in 100 dropbacks, §7.4's "about 4"), 2.9 and 3.2 a team-game (these games have 70 and 76 snaps a team-game, where §7.4 assumed 62).
- **How they ended** (flat / generated, beside §9.2 at 50): **works 72.7% / 69.6%** (65.3), **caught 15.5% / 19.3%** (19.5), **wasted or called off 11.8% / 11.2%** (15.2). Neither league is §9.2's men at 50. In the flat league every man is 60: the Mike's roll carries +24 where §9.2's carries +20, and its quarterbacks' film ceiling is 62, so the count read averages 49.8 at the stem snaps, about §9.2's 50; its stems work more. The generated league's Mikes carry +24.8, but its quarterbacks know more football (an average ceiling of 53.7), so its count read averages 44.1 and costs the Mike 2.4 on the roll; its stems are caught about as often as §9.2's. Wasted or called off is below §9.2 in both mostly because more than a third of stems come on runs, where an early stem has no re-call to waste it (§6).
- **Against the dice's own odds.** Each roll's record carries its modifiers and its target, so its chance on each snap is exact; summed over the snaps, the measured counts sit within 1.96 standard errors of the odds in all 23 comparisons (the Mike's four timings, each roll made, a shift missed by 20). The generated league's weaker linemen were caught shifting 44 times against 53.2 expected; in the flat league no lineman can miss by 20.
- **The count (D1).** At home 80.4 / 8.7 / 11.0 and 80.1 / 9.8 / 10.1 (normal / quick / hard count, filed 80 / 10 / 10); on the road 90.4 / 9.6 / 0 and 89.7 / 10.3 / 0 (filed 90 / 10 / 0). Third or fourth and 2 or less at home met only 29 and 14 stems (17.2 and 21.4 hard counts in 100 against 30, inside a few stems' noise). All 127 owed hard counts after a change of count were hard counts (ADR-092 D8).
- **The count read and the OC's fixes** are ADR-092's (its §17): the read through a game sits on ADR-092 §7's shape, the caught share falls after the first quarter inside ADR-092 P2's range in both leagues, and the OC changes his count 1.18 times a team-game at today's rate (P4, filed at 15 stems in 100, is graded at S-b).

**Nothing here is a miss to bring.** S-a grades no prediction but inertness; §10's and ADR-092 §10's predictions are graded at S-b, at the league's rate, with the effects on.
