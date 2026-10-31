# ADR-090 step 3: the stem at the line, and the count read (ADR-091 step S-a)

_Written by `pnpm --filter @ff/calibration snap-spots -- --step 3`. The golden games (50 in each test league, ADR-089 plan §0) for the proof, and both leagues' base corpora (ADR-089 step 0, seed set 1: the flat league's 496 games and the generated league's 2027 season of 272) for the numbers, all with the default caller (v7) under today's rules (`legacy`), read back from their event streams alone._

On a snap whose defense wears a Stem, the Mike now calls it at the line. The quarterback answers with his count (normal, quick, or a hard count, at home only). The Mike's timing decides how it ends: on time, early, caught, or called off. On an on-time stem each shifting lineman sets, or is caught still moving; on an early one the quarterback may have the ball snapped while the line moves, and on a pass the center may re-call the blocking. Between snaps the sideline's count read moves: the film read at kickoff, a little more every snap, the staff's notes at halftime, and the offensive coordinator's change of count after a drive in which a stem worked against him.

All of it is written into the play's record and drawn on the snap picture, and **nothing after the snap reads any of it at this step** (ADR-091 §10's arm T), so every game is the game it was. The effects come at step S-b, once the pocket fix has finished measuring; under the pocket fix's rules (`pocket-1`) none of this runs, as agreed with that work.

## 1. Nothing moved

With this step's records taken off (the `STEM` and `SIDELINE_ADJUSTMENT` events and the `CHECK`s of the seven new kinds, ADR-089's strip list, risk K11) and step 1's picture as before, every game is the game it was: the same events, every number the same. The offense's count is echoed nowhere else in the stream (the `STEM` carries it), so there is nothing more to take off.

| league | games | events kept | records taken off | pinned before any picture existed | canonical digest the same | byte digest the same |
|---|---|---|---|---|---|---|
| flat | 50 | 288,693 | 2,015 | 288,693 events | ✅ yes | ✅ yes |
| gen | 50 | 304,621 | 2,076 | 304,621 events | ✅ yes | ✅ yes |

The test suite checks the same pins for all seven callers and both leagues (28 folds), the real season's pinned path (`realSeasonSeam.test.ts`), and every `pocket-1` arm's pins byte for byte, with nothing taken off.

## 2. The engine kept every rule

Read back from the streams of both base corpora, every stem snap and every snap's sideline:

| the rule | flat league | generated league |
|---|---|---|
| the Mike's timing is D3's, from his margin and the count | ✅ kept | ✅ kept |
| the ending follows from the timing, the snap on movement and the re-call, as each roll's margin says | ✅ kept | ✅ kept |
| the men still moving at the snap are every mover on a caught stem, each man whose shift missed by 20 or more on an on-time stem, and nobody else | ✅ kept | ✅ kept |
| each roll is thrown only where it decides something: a shift for each mover on an on-time stem, the snap on movement on an early one, the re-call on an early pass not snapped on | ✅ kept | ✅ kept |
| each roll's total is its die plus its modifiers | ✅ kept | ✅ kept |
| the snap picture draws the ending: a mover is moving at the snap if and only if he was caught, at 3 yards a second | ✅ kept | ✅ kept |
| the records at the line come right after their play's PLAY_START, the sideline's first and the STEM last | ✅ kept | ✅ kept |
| a hard count owed at home after a change of count is a hard count | ✅ kept | ✅ kept |
| one film read for each offense, on its first snap | ✅ kept | ✅ kept |
| halftime's step once for each offense at most, on its first snap of the second half | ✅ kept | ✅ kept |

## 3. How often the Mike stems

| league | games | snaps (passes, runs) | snaps a team-game | stem snaps | in 100 snaps | in 100 dropbacks | in 100 runs | a team-game |
|---|---|---|---|---|---|---|---|---|
| flat league | 496 | 69,268 (43,837, 25,431) | 69.8 | 2,880 | 4.2 | 4.1 | 4.2 | 2.90 |
| generated league | 272 | 41,252 (25,758, 15,494) | 75.8 | 1,761 | 4.3 | 4.2 | 4.4 | 3.24 |

Today's caller wears the Stem as ADR-073 left it: a front look on one legal call in ten, and the Stem one of two looks (ADR-091 §7.4: about 4 snaps in 100, about 2.5 a team-game at the 62 snaps a team-game it assumed; these games have more snaps, so a few more stems a game at the same rate). The league's rate of 15 in 100 (about 9 a game, D15) and each coordinator's own rate (D16) come with step S-b.

## 4. How the stems ended

| how the stem ended | flat league (2,880) | its offense at home (1,450) | on the road (1,430) | generated league (1,761) | its offense at home (870) | on the road (891) | ADR-091 §9.2: every man at 50, the offense at home |
|---|---|---|---|---|---|---|---|
| on time | 68.0% | 67.4% | 68.6% | 64.3% | 64.7% | 64.0% | 62.9% |
| early, then snapped on movement (caught) | 7.5% | 7.9% | 7.0% | 8.3% | 8.4% | 8.2% | 7.1% |
| early, then re-called by the center | 4.9% | 4.2% | 5.5% | 4.0% | 3.3% | 4.6% | 7.7% |
| early, not re-called (works) | 1.2% | 1.2% | 1.3% | 1.0% | 1.1% | 0.9% | 2.4% |
| early, on a run (no re-call to make; works) | 3.5% | 3.9% | 3.1% | 4.2% | 4.1% | 4.3% | (passes only) |
| caught by a late call or a quick count | 8.1% | 7.9% | 8.2% | 11.0% | 9.4% | 12.5% | 12.4% |
| called off | 6.9% | 7.4% | 6.4% | 7.2% | 8.9% | 5.6% | 7.5% |
| **the stem works** | **72.7%** | **72.5%** | **72.9%** | **69.6%** | **70.0%** | **69.1%** | **65.3%** |
| **the stem is caught** | **15.5%** | **15.9%** | **15.2%** | **19.3%** | **17.8%** | **20.7%** | **19.5%** |
| **wasted or called off** | **11.8%** | **11.7%** | **11.9%** | **11.2%** | **12.2%** | **10.2%** | **15.2%** |

ADR-091 §9.2's figures are for every man rated 50 and the count read at 50; neither league is that, so the shares are set against the dice's own odds for these men in §5, which is the test that the formulas are built as filed. What moves the leagues off §9.2:

- **The flat league.** The Mike's own ratings put +24.0 on his timing roll on average (at 50, +20.0); the count read's term −0.1 (at 50, 0), from an average count read of 49.8 at the stem snaps; his average target 52.0 (50, plus 15 on a quick count and 10 on a hard count). The film read starts each game at 31.0 on average, from a ceiling of 62.0 (at 50: 34, from 68).
- **The generated league.** The Mike's own ratings put +24.8 on his timing roll on average (at 50, +20.0); the count read's term −2.4 (at 50, 0), from an average count read of 44.1 at the stem snaps; his average target 52.1 (50, plus 15 on a quick count and 10 on a hard count). The film read starts each game at 26.8 on average, from a ceiling of 53.7 (at 50: 34, from 68).

On a run the center has no re-call to make (ADR-091 §6), so an early stem the quarterback did not snap on works, as on time. §9.2's table is for passes; the groups compare across both.

## 5. The dice against their own odds

Each roll is a d100 plus whole modifiers against a target, and its record carries both, so the chance of each result on each snap is exact (the faces of the die, counted). Summed over the snaps, that is what the dice should give for these men. A measured count within about 2 standard errors of it is the dice behaving; D3's table (the Mike's timing by margin and count) is restated in the report from the ADR, so this also checks the engine's reading of it.

| the Mike's timing | flat league: measured | the dice's odds | apart, in standard errors | generated league: measured | the dice's odds | apart, in standard errors |
|---|---|---|---|---|---|---|
| on time | 1,958 | 1947.9 | +0.5 | 1,133 | 1155.8 | −1.3 |
| early | 491 | 491.3 | −0.0 | 308 | 296.9 | +0.7 |
| caught (a late call, or a quick count) | 232 | 243.9 | −0.9 | 193 | 183.0 | +0.8 |
| called off | 199 | 196.9 | +0.2 | 127 | 125.3 | +0.2 |

| roll | flat league: thrown | made | the dice's odds | apart | generated league: thrown | made | the dice's odds | apart |
|---|---|---|---|---|---|---|---|---|
| the Mike times the count (made: 0 or better) | 2,880 | 2,113 | 2100.6 | +0.5 | 1,761 | 1,229 | 1256.2 | −1.5 |
| a shifting lineman sets (made) | 7,832 | 6,647 | 6657.2 | −0.3 | 4,532 | 3,714 | 3718.5 | −0.2 |
| the quarterback snaps on movement (early stems) | 491 | 215 | 220.9 | −0.5 | 308 | 146 | 140.9 | +0.6 |
| the center re-calls the blocking (early passes not snapped on) | 175 | 140 | 140.0 | +0.0 | 88 | 70 | 71.2 | −0.3 |
| the offensive coordinator sees a stem worked | 1,895 | 1,170 | 1155.9 | +0.7 | 1,108 | 644 | 675.9 | −2.0 |
| the defensive coordinator reads the change | 1,170 | 603 | 585.0 | +1.1 | 644 | 327 | 322.0 | +0.4 |
| the quarterback drops his habit | 790 | 584 | 576.7 | +0.6 | 455 | 340 | 336.2 | +0.4 |
| a shifting lineman misses by 20 or more (caught moving) | 7,832 | 0 | 0.0 | none to weigh | 4,532 | 44 | 53.2 | −1.3 |

23 comparisons; the largest is 1.96 standard errors apart, and none is more than 2 apart. Chance alone puts about one comparison in twenty more than 2 apart and about one in four hundred more than 3, so the dice behave as filed.

## 6. The quarterback's count

Asked only on a stem snap (nothing else reads the count yet, ADR-005), from ADR-091 D1's mix:

| the snap | ADR-091 D1: normal / quick / hard count, in 100 | flat league: stems | normal / quick / hard count | generated league: stems | normal / quick / hard count |
|---|---|---|---|---|---|
| the offense at home | 80 / 10 / 10 | 1,340 | 80.4 / 8.7 / 11.0 | 810 | 80.1 / 9.8 / 10.1 |
| at home, third or fourth down with 2 yards or less to go | 60 / 10 / 30 | 29 | 75.9 / 6.9 / 17.2 | 14 | 71.4 / 7.1 / 21.4 |
| the offense on the road | 90 / 10 / 0 | 1,430 | 90.4 / 9.6 / 0.0 | 891 | 89.7 / 10.3 / 0.0 |
| at home, a hard count owed after a change of count (ADR-092 D8) | 0 / 0 / 100 | 81 | 0.0 / 0.0 / 100.0 | 46 | 0.0 / 0.0 / 100.0 |

Few stems fall in some rows, where each stem moves a share by several points: at home, third or fourth down with 2 yards or less to go in the flat league (29 stems); at home, third or fourth down with 2 yards or less to go in the generated league (14 stems).

## 7. The count read through a game

How well the defense knew the offense's count at each stem snap (`STEM.countRead`, 0 to 100), and how the stems ended, by quarter. ADR-092 §7's figures are for every man at 50 and stems on 15 in 100 snaps (its last column, the old rate of about 4 in 100, is today's rate); its ceiling is 68 where a quarterback is rated 50.

**The flat league.**

| | stems | count read | works | caught | wasted or called off | hard counts among them | ADR-092 §7 (stems on 15 in 100): read, works, caught, wasted, hard counts |
|---|---|---|---|---|---|---|---|
| 1st quarter | 747 | 40.4 | 66.5% | 21.7% | 11.8% | 6.7% | 41, 62.4%, 22.9%, 14.7%, 9.7% |
| 2nd | 731 | 49.7 | 77.2% | 13.0% | 9.8% | 7.9% | 50, 65.1%, 19.2%, 15.7%, 13.7% |
| 3rd | 713 | 54.8 | 73.9% | 14.6% | 11.5% | 9.3% | 55, 66.9%, 17.0%, 16.1%, 15.8% |
| 4th | 688 | 55.0 | 73.4% | 12.5% | 14.1% | 8.6% | 54, 66.2%, 17.3%, 16.5%, 17.7% |
| overtime | 1 | 60.4 | 100.0% | 0.0% | 0.0% | 0.0% |  |
| **whole game** | 2,880 | 49.8 | 72.7% | 15.5% | 11.8% | 8.1% | 50, 65.2%, 19.0%, 15.8%, 14.4% |
| at the old rate, about 4 in 100 (ADR-092 §7's last column) | | | | | | | 50, 65.4%, 20.0%, 14.6%, 7.3% |

**The generated league.**

| | stems | count read | works | caught | wasted or called off | hard counts among them | ADR-092 §7 (stems on 15 in 100): read, works, caught, wasted, hard counts |
|---|---|---|---|---|---|---|---|
| 1st quarter | 438 | 35.3 | 67.8% | 22.4% | 9.8% | 7.3% | 41, 62.4%, 22.9%, 14.7%, 9.7% |
| 2nd | 429 | 44.1 | 71.3% | 18.4% | 10.3% | 7.7% | 50, 65.1%, 19.2%, 15.7%, 13.7% |
| 3rd | 434 | 48.2 | 70.0% | 19.1% | 10.8% | 8.8% | 55, 66.9%, 17.0%, 16.1%, 15.8% |
| 4th | 458 | 48.6 | 69.2% | 17.2% | 13.5% | 5.9% | 54, 66.2%, 17.3%, 16.5%, 17.7% |
| overtime | 2 | 38.9 | 50.0% | 0.0% | 50.0% | 50.0% |  |
| **whole game** | 1,761 | 44.1 | 69.6% | 19.3% | 11.2% | 7.4% | 50, 65.2%, 19.0%, 15.8%, 14.4% |
| at the old rate, about 4 in 100 (ADR-092 §7's last column) | | | | | | | 50, 65.4%, 20.0%, 14.6%, 7.3% |

**ADR-092's P2** (filed for its arm with every coordinator at 50, which is this step's): the caught share in first quarters exceeds the second half's by 3 to 9 points (computed 5.7 at 15 stems in 100). It is graded at step S-b, at the league's rate; at today's rate it reads:

- the flat league: caught on 21.7% of first-quarter stems and 13.6% of second-half stems, 8.1 points apart, inside P2's range.
- the generated league: caught on 22.4% of first-quarter stems and 18.2% of second-half stems, 4.2 points apart, inside P2's range.

## 8. The sideline

| | flat league | generated league | filed |
|---|---|---|---|
| film reads (one for each offense, each game) | 992 | 544 |  |
| the film read: ceiling, share, read (averages) | 62.0, 0.50, 31.0 (31.0 to 31.0) | 53.7, 0.50, 26.8 (20.5 to 32.8) | ADR-092 §4: 68, 0.5, 34 for a quarterback at 50 and a staff at 50 |
| halftime: the count read before and after (averages) | 52.5 to 54.9 (992) | 46.4 to 48.2 (544) | §5.2: a quarter of the gap to the ceiling, with every coordinator at 50 |
| stems that worked against the offense, a team-game | 2.11 | 2.25 |  |
| the offensive coordinator looks back at a drive in which one worked, a team-game | 1.91 | 2.04 |  |
| **he sees it and changes his count, a team-game** | **1.18** | **1.18** | §10 P4: 1.5 to 3.5 a game (computed 2.4), at 15 stems in 100 snaps |
| the defensive coordinator reads the change | 603 (51.5%) | 327 (50.8%) | §5.4: 50 in 100 at even ratings |
| hard counts ordered on the next snaps (three at home) | 1,782 | 951 |  |
| the quarterback told to drop his habit: told, dropped | 790, 584 | 455, 340 | §5.4: 71 in 100 at Discipline 50 |
| the count read before and after a change (averages) | 51.7 to 34.6 | 45.6 to 30.4 |  |

Every coordinator is at 50 until the weekly plan reaches the game (ADR-092 R1, step S-b2), and every staff's film share is one half (§4.4). At today's rate a defense stems about 2.5 times a team-game, so the offensive coordinator has fewer stems to answer than §10's P4 assumed (15 in 100 snaps); P4 is graded at step S-b, at the league's rate.
