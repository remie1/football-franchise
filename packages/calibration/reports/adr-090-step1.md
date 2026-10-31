# ADR-090 step 1: the snap picture on every play

_Written by `pnpm --filter @ff/calibration snap-spots -- --step 1`. The golden games (50 in the flat league and 50 in the generated one, ADR-089 plan §0), played with the default caller (v7), read back from their event streams alone._

Step 1 draws where every man stands at the snap on every play and publishes it on the play's start record (`PLAY_START`, field `snap`). The play-caller draws it with the playbook, the calls carry it into the simulation and the simulation copies it out; nothing in play reads it yet. This report checks three things: nothing moved; every play carries a whole picture; and where each man starts against the square the engine plays him in today, with every difference listed (ADR-090 §3, §7).

## 1. Nothing moved

With the picture taken off the start record, every game is the game it was: the same events, every number the same. The pins were measured at e23bf69, before any picture existed (ADR-089 plan §0), and the picture is taken off by ADR-089's strip list, whose one entry is this step's (`PLAY_START.payload.snap`, risk K11).

| league | games | events | pinned before any picture existed | canonical digest the same | byte digest the same |
|---|---|---|---|---|---|
| flat | 50 | 288,693 | 288,693 events | ✅ yes | ✅ yes |
| gen | 50 | 304,621 | 304,621 events | ✅ yes | ✅ yes |

The test suite checks the same pins for all seven callers and both leagues, and the real season's pinned path (`goldenDigests.*.test.ts`, `realSeasonSeam.test.ts`).

## 2. Every play carries a whole picture

| | |
|---|---|
| games | 100 |
| plays | 14,587 (9,170 passes, 5,417 runs) |
| plays with a picture | 14,587 (100.0%) |
| pictures not whole | 0 |

Whole means eleven different men on each side, each on his own team and on his own side of the ball (nobody lines up offside), with every man the call names in it: the quarterback, the route runners and the blockers, the rushers and the coverage men.

## 3. Where each man starts, against the square the engine plays him in today

The engine's field is a grid, five lanes across by five bands deep (match-engine §3). Today it puts every man in one square for the whole play: the quarterback, the men in protection and the rushers in the backfield square (the middle lane, behind the line), a route runner where his route breaks, a man defender where his man's route breaks, and a zone defender on his zone's landmark. A snap spot falls in a square by table D2: the middle lane under 3.5 yards across, the half lanes to 13, the wide lanes beyond; the bands by depth, as routes are banded.

So most differences are by design: the engine's square is where a man plays, and the snap spot is where he starts. **Nothing reads the picture at step 1, so none of them moves a number.** They are what a later step changes when it reads a man's spot instead of his square: step 2 reads the rushers' spots (the pocket fix's free runners).

Pass plays only: on a run the engine puts nobody in a square (it plays gaps), so a run has no square to compare.

| who | the engine's square today | men | same square | same lane | same band |
|---|---|---|---|---|---|
| the quarterback | the backfield | 9,170 | 9,170 (100.0%) | 9,170 (100.0%) | 9,170 (100.0%) |
| men in protection (the line, and a back or tight end kept in) | the backfield (everyone in protection) | 51,813 | 51,598 (99.6%) | 51,598 (99.6%) | 51,813 (100.0%) |
| route runners | where his route breaks | 39,887 | 0 (0.0%) | 19,240 (48.2%) | 2,515 (6.3%) |
| rushers | the backfield (everyone in protection, the rushers too) | 39,654 | 0 (0.0%) | 21,424 (54.0%) | 0 (0.0%) |
| man defenders | where his man's route breaks | 9,449 | 1,619 (17.1%) | 4,932 (52.2%) | 3,536 (37.4%) |
| zone defenders | his zone's landmark | 50,703 | 10,464 (20.6%) | 36,223 (71.4%) | 19,574 (38.6%) |

Not compared: 1,064 man defenders whose man stayed in to block (he runs no route, so he breaks to no square), and nobody else. Every route stated where it breaks.

### Why they differ

- **The quarterback.** The engine's backfield square is the middle lane behind the line; he stands there under center or in the gun.
- **Men in protection (the line, and a back or tight end kept in).** The line stands in the middle lane, behind the ball. A tight end or back kept in to block who lines up more than 3.5 yards across stands in a half lane (table D2), where the engine still puts him in the middle.
- **Route runners.** He starts on or behind the line, which §3.2's bands count as the backfield (it ends at the line), and the engine puts him where his route breaks. So the band matches only on a route that breaks behind the line (a swing or a flat), and the lane matches when the route breaks in the lane he lines up in.
- **Rushers.** The engine puts every rusher in the backfield square for the whole play, where he is going. He starts a yard downfield of the ball, the defense's side of the line (the short band), inside in the middle lane or outside in a half lane.
- **Man defenders.** The engine puts him on his man's break square. He starts across from his man (press 1 yard, off 5 to 7), short of where the route takes them both.
- **Zone defenders.** The engine puts him on his zone's landmark. He starts short of it (a deep third at 7 yards, a deep half at 12, an underneath zone at 4.5 to 8), and a man who shows one look and plays another starts where the look puts him.

### Every difference

Squares are written lane/band: lanes LW, LH, C, RH, RW from the offense's left; bands BACKFIELD, SHORT, INTERMEDIATE, DEEP, VERY_DEEP.

**The quarterback** (none differ).

**Men in protection (the line, and a back or tight end kept in)** (215 men in 2 pairs).

| the engine's square | his snap square | men |
|---|---|---|
| C/BACKFIELD | RH/BACKFIELD | 201 |
| C/BACKFIELD | LH/BACKFIELD | 14 |

**Route runners** (39,887 men in 40 pairs).

| the engine's square | his snap square | men |
|---|---|---|
| RW/DEEP | RW/BACKFIELD | 2,954 |
| LW/DEEP | LW/BACKFIELD | 2,739 |
| RH/SHORT | RH/BACKFIELD | 2,632 |
| RW/INTERMEDIATE | RW/BACKFIELD | 2,562 |
| RW/SHORT | RH/BACKFIELD | 2,562 |
| LW/INTERMEDIATE | LW/BACKFIELD | 2,486 |
| RW/INTERMEDIATE | RH/BACKFIELD | 1,999 |
| C/INTERMEDIATE | LW/BACKFIELD | 1,715 |
| RH/BACKFIELD | C/BACKFIELD | 1,554 |
| RW/SHORT | RW/BACKFIELD | 1,393 |
| C/SHORT | LH/BACKFIELD | 1,246 |
| LH/SHORT | RH/BACKFIELD | 1,246 |
| LW/SHORT | LW/BACKFIELD | 1,232 |
| C/INTERMEDIATE | LH/BACKFIELD | 1,195 |
| RH/SHORT | LH/BACKFIELD | 1,152 |
| RH/INTERMEDIATE | RH/BACKFIELD | 980 |
| LH/SHORT | LH/BACKFIELD | 849 |
| C/INTERMEDIATE | RH/BACKFIELD | 824 |
| LH/SHORT | C/BACKFIELD | 753 |
| C/SHORT | RH/BACKFIELD | 685 |
| LH/DEEP | LH/BACKFIELD | 667 |
| RH/INTERMEDIATE | RW/BACKFIELD | 641 |
| LH/BACKFIELD | C/BACKFIELD | 631 |
| LH/INTERMEDIATE | RH/BACKFIELD | 537 |
| RH/SHORT | C/BACKFIELD | 460 |
| LW/INTERMEDIATE | LH/BACKFIELD | 453 |
| LH/DEEP | LW/BACKFIELD | 428 |
| LH/SHORT | LW/BACKFIELD | 404 |
| RH/SHORT | RW/BACKFIELD | 374 |
| C/SHORT | C/BACKFIELD | 339 |
| RW/BACKFIELD | RH/BACKFIELD | 330 |
| RW/SHORT | C/BACKFIELD | 304 |
| C/DEEP | RH/BACKFIELD | 270 |
| RH/DEEP | RH/BACKFIELD | 262 |
| RH/DEEP | RW/BACKFIELD | 229 |
| RW/INTERMEDIATE | C/BACKFIELD | 199 |
| C/DEEP | LW/BACKFIELD | 166 |
| RH/INTERMEDIATE | LH/BACKFIELD | 166 |
| LH/INTERMEDIATE | LH/BACKFIELD | 145 |
| LW/SHORT | LH/BACKFIELD | 124 |

**Rushers** (39,654 men in 3 pairs).

| the engine's square | his snap square | men |
|---|---|---|
| C/BACKFIELD | C/SHORT | 21,424 |
| C/BACKFIELD | LH/SHORT | 9,306 |
| C/BACKFIELD | RH/SHORT | 8,924 |

**Man defenders** (7,830 men in 55 pairs).

| the engine's square | his snap square | men |
|---|---|---|
| RW/DEEP | RW/SHORT | 736 |
| LW/DEEP | LW/SHORT | 734 |
| RW/INTERMEDIATE | RW/SHORT | 682 |
| LW/INTERMEDIATE | LW/SHORT | 642 |
| RW/SHORT | RH/SHORT | 509 |
| RW/INTERMEDIATE | RH/SHORT | 448 |
| C/INTERMEDIATE | LW/SHORT | 429 |
| LH/SHORT | RH/SHORT | 308 |
| RH/BACKFIELD | C/SHORT | 294 |
| C/SHORT | LH/SHORT | 293 |
| C/INTERMEDIATE | LH/SHORT | 267 |
| RH/SHORT | LH/SHORT | 258 |
| RH/INTERMEDIATE | RH/SHORT | 245 |
| C/INTERMEDIATE | RH/SHORT | 209 |
| RH/INTERMEDIATE | RW/SHORT | 161 |
| LH/SHORT | C/SHORT | 156 |
| LH/DEEP | LH/SHORT | 155 |
| LH/BACKFIELD | C/SHORT | 137 |
| LH/DEEP | LW/SHORT | 110 |
| LW/INTERMEDIATE | LH/SHORT | 95 |
| LH/SHORT | LW/SHORT | 93 |
| RH/SHORT | RW/SHORT | 93 |
| C/DEEP | RH/SHORT | 91 |
| RH/SHORT | C/SHORT | 89 |
| RW/BACKFIELD | RH/SHORT | 78 |
| RH/DEEP | RH/SHORT | 72 |
| C/SHORT | RH/SHORT | 67 |
| RH/DEEP | RW/SHORT | 54 |
| LH/INTERMEDIATE | RH/SHORT | 48 |
| RW/INTERMEDIATE | C/SHORT | 48 |
| C/DEEP | LW/SHORT | 39 |
| RH/INTERMEDIATE | LH/SHORT | 34 |
| LW/SHORT | LH/SHORT | 33 |
| LH/INTERMEDIATE | LH/SHORT | 29 |
| RW/SHORT | RH/INTERMEDIATE | 14 |
| RH/SHORT | LH/INTERMEDIATE | 12 |
| C/SHORT | LH/INTERMEDIATE | 11 |
| LH/SHORT | LH/INTERMEDIATE | 10 |
| C/INTERMEDIATE | LH/INTERMEDIATE | 8 |
| C/INTERMEDIATE | C/SHORT | 5 |
| LH/DEEP | C/SHORT | 5 |
| LH/INTERMEDIATE | C/SHORT | 4 |
| RH/INTERMEDIATE | LH/INTERMEDIATE | 4 |
| C/SHORT | RH/INTERMEDIATE | 3 |
| LH/DEEP | LH/INTERMEDIATE | 3 |
| LW/INTERMEDIATE | C/SHORT | 3 |
| LH/INTERMEDIATE | RH/INTERMEDIATE | 2 |
| LH/SHORT | RH/INTERMEDIATE | 2 |
| LW/INTERMEDIATE | LH/INTERMEDIATE | 2 |
| C/DEEP | RH/INTERMEDIATE | 1 |
| C/INTERMEDIATE | RH/INTERMEDIATE | 1 |
| RH/INTERMEDIATE | C/SHORT | 1 |
| RW/BACKFIELD | RH/INTERMEDIATE | 1 |
| RW/INTERMEDIATE | RH/INTERMEDIATE | 1 |
| RW/SHORT | LH/INTERMEDIATE | 1 |

**Zone defenders** (40,239 men in 29 pairs).

| the engine's square | his snap square | men |
|---|---|---|
| LW/DEEP | LW/SHORT | 5,763 |
| LH/SHORT | C/SHORT | 5,431 |
| C/DEEP | C/INTERMEDIATE | 4,922 |
| RW/DEEP | RW/SHORT | 4,441 |
| LH/DEEP | LH/INTERMEDIATE | 3,549 |
| RH/DEEP | RH/INTERMEDIATE | 3,549 |
| LW/BACKFIELD | LH/SHORT | 2,107 |
| RW/BACKFIELD | RH/SHORT | 1,976 |
| RH/SHORT | C/SHORT | 1,946 |
| RW/BACKFIELD | RW/SHORT | 1,623 |
| RW/SHORT | RH/SHORT | 1,103 |
| LW/BACKFIELD | LW/SHORT | 1,052 |
| LW/SHORT | C/SHORT | 583 |
| RW/DEEP | RH/SHORT | 544 |
| C/INTERMEDIATE | C/SHORT | 527 |
| C/DEEP | RH/INTERMEDIATE | 274 |
| LH/DEEP | C/INTERMEDIATE | 171 |
| RH/DEEP | RH/SHORT | 171 |
| LW/BACKFIELD | LH/INTERMEDIATE | 115 |
| C/INTERMEDIATE | LH/SHORT | 86 |
| LH/INTERMEDIATE | LH/SHORT | 78 |
| LH/SHORT | LH/INTERMEDIATE | 72 |
| C/DEEP | LH/INTERMEDIATE | 68 |
| C/INTERMEDIATE | RH/INTERMEDIATE | 42 |
| C/SHORT | LH/INTERMEDIATE | 29 |
| LW/DEEP | LW/INTERMEDIATE | 6 |
| RW/DEEP | RW/INTERMEDIATE | 6 |
| LH/SHORT | RH/SHORT | 3 |
| C/SHORT | LH/SHORT | 2 |
