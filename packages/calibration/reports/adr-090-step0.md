# ADR-090 step 0: where every man stands at the snap

*Written by `pnpm --filter @ff/calibration snap-spots`. No seed: the pictures are tables read off the call, and no die is rolled. Step 0 changes no game: nothing in play calls this code yet; step 1 publishes the picture and the viewer draws it.*

## 1. What was drawn

- **4,800 pictures**: 26 calls (the book's cards, v6's coverages, and the composed pressures and creepers), worn 121 ways (bare, and in every set of coverage looks each can wear, early and late where a safety rotates), under no front look, the Mug (1,368 pictures) or the Stem (1,980), against each of the 12 formations.
- **All 22 men in every picture, each once:** ✅ yes.
- **Nobody stands on anybody** (closer than a yard both ways) except the two the calls ask for: the quarterback under center behind his center (2,000), and a Mug linebacker walked up behind his tackle (2,568). Anyone else: none ✅.
- **Mirror symmetry and same call, same picture** are proved by the playbook's tests (`packages/playbook/test/snapSpots.test.ts`), over these pictures and their mirror images; the mirror test names the few men it leaves out, and why.

## 2. Table D4 against the owner's August ranges

| what | August range (`ADR-066:607-610`) | the table | drawn in the book (yards: men) | inside? |
|---|---|---|---|---|
| down lineman | technique 0 to 9 | 1 yard off the ball, hand down; A gap a 1, B a 3, C a 5, D a 9; an edge rusher a step wider (a C-gap end is a 6) | technique 1 (9,528), 3 (96), 6 (9,600) | ✅ yes |
| linebacker, not rushing | 4 to 7 deep | 4.5 (a step back to 5.5 if a man is in his spot) | 4.5 (8,951), 5.5 (1) | ✅ yes |
| press, man to man | 1 to 2 | 1 | outside corners 1 (1,920), slot corners (nickel and dime) 1 (130) | ✅ yes |
| off, man to man | 5 to 8 | outside corner 7, slot corner 5, safety 7 | slot corners (nickel and dime) 5 (516), safeties 7 (554) | ✅ yes |
| leverage | flips with where the help is | a yard outside his man with a safety in the deep middle, a yard inside with nobody there; outside when a linebacker brackets him | with a safety in the middle: outside 2,550 of 2,550; with nobody: inside 480 of 485, head up 5 (a back straight behind the quarterback, who has no inside); bracketed: outside 85 of 85 | ✅ yes |

Today's book presses every outside corner it puts in man, so the table's 7 yards off for an outside corner is drawn only by a test card (it stands at 7, outside his man). Linebackers who rush line up at 2.5 (240), 4.5 (720): 2.5 walked up for a blitz the call shows, 4.5 for one it disguises. A Mug walks them up to 1.5 as a look (section 4).

**The NFL's tracking data (the Big Data Bowl)** could not be checked: its terms of use and its files are on operations.nfl.com and www.kaggle.com, which this environment's network does not reach, and the files need a Kaggle account. So this report checks the table against the August ranges alone, as ADR-090 §9 allows. Allowing those two sites would let a later step compare against real snap-frame spots, if the terms allow it.

## 3. Where the defense lines up across the book (aligned spots, before any look)

| group | depth in yards (men) |
|---|---|
| down linemen | 1 (19,224) |
| linebackers | 2.5 (240), 4.5 (9,671), 5.5 (1) |
| outside corners | 1 (1,920), 5 (2,280), 7 (5,376), 15 (24) |
| slot corners (nickel and dime) | 1 (130), 5 (4,346), 15 (12) |
| safeties | 7 (554), 8 (1,942), 12 (4,608), 13 (2,448), 15 (24) |

## 4. What a look costs in ground

For each man a look moves: how far his shown spot is from the spot his real job would line him up at, and how far he still is from it when the ball is snapped. An early rotation has finished before the snap; a late one, a corner look and the Mug are held until the snap; every Stem ends on time until ADR-091 step S-a. Nothing reads this ground yet: step 4 makes it cost time after the snap.

| look | who it moves | men moved | shown spot from his real spot (average, most) | still to cover at the snap (average, most) |
|---|---|---|---|---|
| Mug | linebackers | 2,568 | 3.4, 9.5 | 3.4, 9.5 |
| Press | outside corners | 2,232 | 6.1, 7.5 | 6.1, 7.5 |
| Show 1 (early) | safeties | 1,344 | 7.1, 9.1 | 0.0, 0.0 |
| Show 1 (late) | safeties | 1,344 | 7.1, 9.1 | 7.1, 9.1 |
| Show 2 (early) | outside corners | 240 | 2.0, 2.0 | 0.0, 0.0 |
| Show 2 (early) | safeties | 1,632 | 7.8, 21.6 | 0.0, 0.0 |
| Show 2 (late) | outside corners | 240 | 2.0, 2.0 | 2.0, 2.0 |
| Show 2 (late) | safeties | 1,632 | 7.8, 21.6 | 7.8, 21.6 |
| Show 4 | outside corners | 1,008 | 2.0, 2.0 | 2.0, 2.0 |
| Split | outside corners | 288 | 4.2, 6.3 | 4.2, 6.3 |
| Stem (on time) | down linemen | 7,920 | 1.8, 2.0 | 0.0, 0.0 |

**Shown more than 12 yards from his real spot:** Show 2 over DEF_BASE_RUN_BLITZ, S_S, up to 21.6. A look picks each safety's half from the card, before it knows the formation (`masks.ts`, `strongSafetySide`): from the side of his man when the card names one, else from his run fit. Nothing reads this ground yet; step 4, which makes it cost time after the snap, should look at these first.

## 5. The offense (beat 1, table D3)

Across from the ball (negative is the offense's left) and back from the line of scrimmage, in yards. The line is the same in every formation: tackles at -3 and 3, guards at -1.5 and 1.5, the center at 0, all half a yard off the ball, hands down.

| formation | quarterback | backs and receivers |
|---|---|---|
| GUN_TRIPS_RT | 0, -5 | X -18, -0.5; Z 18, -0.5; SLOT 11, -1.5; TE_Y 8.5, -1.5; RB -1.5, -5 |
| GUN_DOUBLES_RT | 0, -5 | X -18, -0.5; SLOT -11, -1.5; Z 18, -0.5; TE_Y 11, -1.5; RB -1.5, -5 |
| GUN_BUNCH_RT | 0, -5 | X -18, -0.5; Z 11, -0.5; SLOT 8.5, -1.5; TE_Y 6, -1.5; RB -1.5, -5 |
| SINGLEBACK_ACE_RT | 0, -1 | X -18, -0.5; SLOT -11, -1.5; Z 18, -1.5; TE_Y 4.5, -0.5 (hand down); RB 0, -7 |
| GUN_SPREAD_RT | 0, -5 | X -18, -0.5; SLOT -11, -1.5; Z 18, -0.5; SLOT2 11, -1.5; RB -1.5, -5 |
| GUN_EMPTY_RT | 0, -5 | X -18, -0.5; SLOT2 -11, -1.5; Z 18, -0.5; SLOT 11, -1.5; SLOT3 8.5, -1.5 |
| SINGLEBACK_TWINS_RT | 0, -1 | X -18, -0.5; TE_U -11, -1.5; Z 18, -1.5; TE_Y 4.5, -0.5 (hand down); RB 0, -7 |
| GUN_DOUBLES_12_RT | 0, -5 | X -18, -0.5; TE_U -11, -1.5; Z 18, -0.5; TE_Y 11, -1.5; RB -1.5, -5 |
| I_FORM_PRO_RT | 0, -1 | X -18, -0.5; Z 18, -1.5; TE_Y 4.5, -0.5 (hand down); RB 0, -7; FB 0, -4.5 |
| GUN_SPLIT_BACKS_RT | 0, -5 | X -18, -0.5; SLOT -11, -1.5; Z 18, -0.5; RB -1.5, -5; FB 1.5, -5 |
| SINGLEBACK_HEAVY_RT | 0, -1 | X -18, -1.5; TE_U -4.5, -0.5 (hand down); TE_H 18, -1.5; TE_Y 4.5, -0.5 (hand down); RB 0, -7 |
| GOAL_LINE_RT | 0, -1 | X -18, -1.5; TE_U -4.5, -0.5 (hand down); TE_Y 4.5, -0.5 (hand down); RB 0, -7; FB 0, -4.5 |

**The grid (D2).** 60 backs and receivers mapped from their spots to the engine's lanes; 2 differ from the lane their formation names: GUN_SPLIT_BACKS_RT RB: LH to C; GUN_SPLIT_BACKS_RT FB: RH to C. Step 1 lists every such difference before anything reads the picture (ADR-090 §7).

## 6. Rules step 0 had to choose

The design's tables (D3, D4, D5) are used value for value. The book asked for some jobs they do not name; each rule below is `CHOSEN`, a placeholder like the tables, until formations author their own splits and ratings move men.

- **A lineman who drops into coverage lines up where he would rush from** (his run-fit gap, hand down), so the drop does not show before the snap.
- **A linebacker with no run fit stands over the inside receiver** on his zone's side, 4.5 deep.
- **A linebacker in man stays at 4.5 deep**, a yard inside his man, whatever the technique says.
- **A quarters safety stands where a deep-half safety does**: 12 deep, 9 across.
- **An underneath safety (hook, curl or flat) stands over the inside receiver on his zone's side**, 8 deep; on a side with one receiver, halfway between that receiver and the tackle. The design's table said "over the strong side's inside receiver", which put Cover 3 Sky's strong safety against Trips over the trips while his flat was on the other side. **One who plays the hole or robs the middle stands in the middle**, 8 deep.
- **A prevent deep man stands 15 deep in his lane**: -18, -9, 0, 9 or 18 across.
- **A corner with no receiver split out on his side stands 8 yards out from the ball.**
- **A slot corner with no slot receiver to his side stands halfway between the outside receiver and the tackle**, or 7 yards out if there is no receiver at all; in a deep zone he stands 7 deep.
- **A man covered by a linebacker and a defensive back at once is bracketed**: the linebacker a yard inside him, the back a yard outside.
- **Nobody stands on anybody**: when two men would be closer than a yard, a pass rusher keeps his gap, then a man-to-man defender keeps his man, and a zone player steps back a yard until he is clear. The one exception is the one the call asks for: a Mug linebacker walked up behind his tackle.
- **A safety or corner who blitzes lines up 5 deep**, over his gap (a safety) or outside the outside receiver (a corner).
- **Only a tight end is an inline end** (4.5 out, hand down): a wide receiver next to the tackle uses the slot spot.
- **A lone back in the shotgun stands on the weak side**, beside the quarterback; **split backs stand 1.5 yards either side of him**, which the grid counts as the middle lane, not the half lanes the formation names (step 1 lists this difference with every other one).
- **A back the formation sets off the middle stands 1.5 yards to that side**: under center at his depth, in the pistol beside the quarterback at 4.
- **Stance**: the offensive line, an inline end and every defensive lineman have a hand down; everyone else is up.
- **Every Stem ends on time until ADR-091's step S-a** builds its four endings: the line is set in the front it shifted to.
- **A creeper the Mug walked up is already up**: he is set at his Mug spot at the snap and does not creep again.
