# ADR-093 (DESIGN): penalties by the NFL's rules, called by human officials

- **Date:** 2026-10-31
- **Proposed by:** Orchestrator (thread "Design penalties with human officials")
- **Status:** **approved (design), all eight questions ruled on 2026-10-31 (§15).** Nothing in `packages/` changes with this ADR. Seven questions went to the owner (§13), all answered on 2026-10-31 (§15); Q6's answer brought an eighth, Q8 (§7.2), in plain words in [ADR-093-questions-explained.md](ADR-093-questions-explained.md) and on cards in the thread. Each contracts edit in §10 needs the owner's typed yes naming it, asked at the step that needs it. The owner never merges: each step comes with its numbers and needs the owner's word before the Orchestrator merges it. **Revised 2026-10-31, the same night,** after the owner asked whether the recommendations rest on real NFL statistics ("is Q1 B about 2.2 real holds a game a real statistic?" It was not: it was the real flag rate divided by a guessed seen chance). Two search passes and new counts (the real-numbers page, Tables 5 to 9 and sources P1 to P9) changed **Q1's recommendation from 1 in 2 to 2 in 3** (§5.2, the NFL's own error count) and **Q5's from no lean to a small lean on the defense's judgment calls** (§6.4, the 2020 season without fans); Q2's 1 in 20 and Q4's yes now rest on real bounds (§5.3, §6.4); the crews' carry-over is now measured, 0.35 (§6.1).
- **Asked for by:** the owner, 2026-10-30, on ADR-091's question S2: *"For S2 follow the real NFL rules. If you're waiting on another phase for penalties then it's okay to wait, just make a note that a stem drawing offsides will certainly be resulting in whatever penalty the NFL naturally enforces."* (23:42Z) and *"While we're at it, please make a note for whenever we go over penalties that we need to create a system that accounts for imperfect human reffing"* (23:59Z). On 2026-10-31 at 00:57Z the owner picked this design from the list of work that stays out of the play code while the pocket fix (ADR-089) is measured.
- **Builds on, and does not reopen:** ADR-091 §8 (defensive offside from a stem, the game's first penalty: a free play, 5 yards or half the distance, the coach's option, the computer's rule D13); ADR-092 C1 (the count battle on every snap, its own ADR, designed after ADR-089: false starts, jumping the count, neutral zone infraction, encroachment, the defensive delay of game); ADR-072 (`discipline`, every position, whose registry note says "pre-snap penalties later", `contracts/src/registry.ts:128`); `player-personality.md` (unsportsmanlike and taunting rates as a sign of a volatile player); ADR-005 (a die only when it matters); Iron Rules 3, 4 and 6.
- **Real numbers:** [ADR-093-real-penalty-numbers.md](ADR-093-real-penalty-numbers.md) (COMPUTED, nflverse 2022-2024, every flag, every referee).

## Shorthand used here

| word | what it means |
|---|---|
| **foul** | what a player really did: a hold, a jump across the line, a late hit. It is a game fact whether or not anyone saw it |
| **flag** | what the officials called. A flag can be on a real foul, or on nothing (a **wrong flag**) |
| **seen chance** | how likely the officials are to flag a real foul of this kind |
| **visibility** | how plain a foul is to see: a false start is plain, a hold in the pile is not |
| **crew** | the seven officials who work a game together, led by the referee. The NFL has 17 |
| **crew lean** | how much more or less a crew calls one family of fouls than the league |
| **enforce** | mark off the penalty by the rulebook: the yards, the spot, the down |
| **free play** | the offense keeps the play's result or takes the penalty, whichever is better (ADR-091) |
| **called rate** | flags per 1,000 snaps; this is all the real data shows |
| **true rate** | fouls per 1,000 snaps, flagged or not; the data cannot show it |

## 1. The need

Nothing produces a penalty today. `PENALTY` is in the contracts (`contracts/src/events.ts:531`, CHECKED) with a four-field payload, and `penalty_check` is a `CheckKind` (`events.ts:147`, CHECKED) with no producer (`engine/src/game/events.ts:60`, CHECKED). The engine's own comments name penalties as missing (`engine/src/sim/passPlay.ts:9`, `runPlay.ts:22`, `specialTeams.ts:19`, `game/types.ts:311`, CHECKED).

A real NFL game has **12.8 flags on scrimmage snaps** and 1.2 on kicks; each team has **5.3 enforced a game for about 43 yards**, plus 3.6 on kicks (COMPUTED, real-numbers page). That is more yards than most teams' longest drive, and it moves first downs, field goals and touchdowns. The game plays without any of it.

The owner has asked for two things, and they are two layers:

1. **The rules are the NFL's.** Every foul carries the penalty the NFL enforces, at the NFL's spot, with the NFL's down and first-down rules (§4).
2. **The officials are human.** They miss fouls, they sometimes flag what was not there, and crews differ (§5, §6). So the game must hold **what happened** and **what was called** apart, both on the event stream (Iron Rule 3).

## 2. The design in brief

1. **Two layers.** The players commit fouls (a `FOUL` fact, rolled from the moment that causes it, through the player's **Discipline**). The officials decide whether to flag it (a `PENALTY`, rolled from the foul's visibility and the crew). A flag on nothing comes from a play that **nearly** was a foul (§5.3).
2. **The NFL's rulebook enforces every flag** (§4): the yards, the spot (previous spot, spot of the foul, end of the run, after the play), half the distance to the goal line, automatic first downs and loss of down only where the NFL gives them, a safety for an offensive foul in its own end zone, offsetting fouls, the offended team's option, the 10-second runoff, the untimed down.
3. **Three kinds of visibility** (§5.2): **plain** (before the snap and the obvious ones), **in the open** (pass interference, hits on the quarterback), **in the crowd** (holding, hands to the face, contact downfield). How much of the crowd the officials see is the owner's question **Q1**; how often they flag nothing is **Q2**.
4. **17 crews** with their own leans by family of foul, sized to the real spread between the 17 NFL referees (§6.1): crews really do differ on holding (the strictest calls 3.4 offensive holds a game, the loosest 2.1) and hardly at all on pass interference. Whether they are named and known in game week is **Q3**.
5. **The situation** (§6.4): real flags fall about 16% late in close games and 17% in the playoffs. Whether officials "let them play" is **Q4**. The home team's edge is **Q5**.
6. **Fouls nobody flagged are on film** (§7): whether the coach sees them is **Q6**.
7. **The build** (§11): the rulebook and the officials first, inert (nothing calls them), which may be built during the pocket fix's measuring if the owner says so (**Q7**); then each family of fouls with the design that produces it, every step measured against the real called rates.

## 3. Who does what

| who | what | ratings read (through the registry) |
|---|---|---|
| **the player** | commits the foul, or does not, at the moment that tempts him (a lost block, a beaten route, a late hit) | **Discipline** (every foul); **Volatility** (personal fouls); the moment's own ratings decide whether the moment happens at all |
| **the officials** | see the foul or not; flag a near-foul or not | the foul's **visibility** (§5.2); the **crew's lean** for that family (§6.1); the situation (§6.4) |
| **the head coach** (COACH authority, Iron Rule 6) | accepts or declines each flag against the other team; picks between options (a free play, a 10-second runoff) | none: it is a decision. For a team the computer runs, the rule in §4.6 |
| **the referee** | announces; enforces by the rulebook | none: enforcement is the rulebook, not a roll |

**Why Discipline.** It is the game's rating for staying inside the coach's instructions when his own read says otherwise (`registry.ts:130`, every position, CHECKED), and `attributes.md` §3's L3 menu already names "pre-snap penalty rates → awareness/discipline" as where it will be derived from (CHECKED). A player who holds a lot has low Discipline; that is the rating's meaning, not a new one. **Personal fouls also read personality**: `player-personality.md` names unsportsmanlike and taunting rates as a sign of volatility, so personal fouls also read the player's **Volatility** (`registry.ts:127`, every position, CHECKED): a volatile player's late hits and taunts rise (§8, step 6).

## 4. The rulebook

### 4.1 The rule is the NFL's, and the rulebook is opened before the build

Every row below is **REPORTED from the Orchestrator's knowledge of the NFL rulebook**. The rulebook itself (`operations.nfl.com`) and the secondary sources ADR-091 cited could not be opened from this container: the network refused both hosts on 2026-10-31. **Step 0 does not merge until every row has been checked against the current rulebook**, with its rule, section and article written beside it, and any row that differs is corrected to the rulebook, never the other way. The two rows marked **TO CHECK** are ones the Orchestrator is not sure of.

### 4.2 The spots

- **Previous spot:** where the ball was snapped. **Spot of the foul:** where it happened. **Succeeding spot:** where the next play would start (a foul after the play is enforced from there, and the play stands). **End of the run:** where the runner was down.
- **The basic spot and "all but one" (REPORTED):** on a running play, a foul by the defense is enforced from the end of the run when the run ended beyond the line, or from the line when it ended behind it; a foul by the offense behind that basic spot is enforced from the spot of the foul, and beyond it from the basic spot. On a pass play, fouls by the offense before the pass are enforced from the previous spot, and the defense's from the previous spot or the spot the rule names (pass interference, roughing the passer).
- **Half the distance (REPORTED, and already the rule in ADR-091 §8):** when the penalty's yards are more than half the distance from the enforcement spot to the offending team's goal line, the penalty is half that distance.
- **An offensive foul in its own end zone** (holding, illegal use of hands, intentional grounding) is a safety (REPORTED).

### 4.3 The fouls

| foul | yards | spot | first down / down | live or dead ball |
|---|---|---|---|---|
| false start | 5 | previous spot | down replayed | dead ball (no play) |
| defensive offside | 5 | previous spot | replayed; first down only if the yards reach the line to gain | live ball: a free play (ADR-091 §8) |
| neutral zone infraction, encroachment | 5 | previous spot | replayed | dead ball |
| offensive offside | 5 | previous spot | replayed | live ball |
| delay of game (offense) | 5 | previous spot | replayed | dead ball |
| delay of game (defense, an abrupt move that draws a flinch) | 5 | previous spot | replayed | dead ball |
| illegal formation, illegal shift, illegal motion | 5 | previous spot | replayed | live ball |
| too many men on the field | 5 | previous spot | replayed | live ball (dead ball when it is a substitution foul before the snap) |
| offensive holding, illegal use of hands (offense) | 10 | the basic spot rules of §4.2; safety in its own end zone | replayed | live ball |
| defensive holding, illegal use of hands (defense), illegal contact | 5 | previous spot | **automatic first down** | live ball |
| defensive pass interference | the yards to the spot of the foul, no cap; at the 1 when the foul is in the end zone | spot of the foul | **automatic first down** | live ball |
| offensive pass interference | 10 | previous spot | replayed (no loss of down) | live ball |
| ineligible man downfield on a pass | 5 | previous spot | replayed | live ball |
| illegal forward pass (beyond the line, or a second forward pass) | 5 | spot of the pass | **loss of down** | live ball |
| intentional grounding | 10 from the previous spot, or the spot of the pass if that is worse; safety from the end zone | — | **loss of down** | live ball |
| roughing the passer | 15 | previous spot, or the end of the run when a completed pass's run ended beyond the line | **automatic first down** | live ball |
| unnecessary roughness, face mask, horse-collar tackle, clipping, chop block | 15 | by when it happened (live: the basic spot; after the play: succeeding spot) | **automatic first down** when on the defense | live or after the play |
| illegal block in the back, tripping | 10 | spot of the foul (by the basic spot rules) | — | live ball |
| unsportsmanlike conduct, taunting | 15 | succeeding spot, after the play's result | defense: **TO CHECK** whether a dead-ball unsportsmanlike foul gives an automatic first down | after the play; **two in a game ejects the player** |

**TO CHECK (1):** defensive pass interference when the ball was snapped inside the defense's 2 and the foul is in the end zone (the Orchestrator believes half the distance from the previous spot, first down). **TO CHECK (2):** the automatic first down for the defense's dead-ball unsportsmanlike fouls.

### 4.4 More than one flag on a play

- **Two flags on the same team:** the offended team picks one to enforce; the others are declined (real: 16% of offensive holds and 22% of defensive holds are declined, many because a second flag was taken; Table 1).
- **One flag on each team (a double foul):** they offset and the down is replayed, unless the rulebook enforces one over the other (a 15-yard foul against a 5-yard one; a foul after a change of possession; fouls after the play, which are enforced in order). REPORTED; the exact cases are checked at step 0.
- **After the play** (a dead-ball personal foul): enforced from the succeeding spot, and the play stands.

### 4.5 The clock

- **The 10-second runoff (REPORTED):** in the last minute of either half, a foul by the offense that stops the clock (a false start, for instance) gives the defense the option of 10 seconds off the clock; the offense may stop it with a timeout.
- **The untimed down (REPORTED):** a half cannot end on an accepted foul by the defense; the offense gets one untimed down.
- The clock after an enforced penalty follows the rulebook's start-on-the-snap or start-on-the-ready rules; the engine's clock module is built for it at step 0's tests.

### 4.6 The offended team's choice (COACH authority)

Every flag against the other team is a coach's decision (Iron Rule 6): accept or decline; on a free play, the play or the penalty; with a runoff, the runoff or not. For a team the computer runs, **ADR-091's rule D13 widens to every flag (CHOSEN):** take the result that is better on this list, in order: points scored; keeping or gaining the ball; a first down; then more yards. A turnover or a safety on the play is always wiped by accepting a penalty that allows it. This is a confirmation, not a question (§13).

## 5. The officials

### 5.1 One roll per foul, and one per near-foul

When a player commits a foul, the officials roll **once**: flagged or not (`official_sees`, new `CheckKind`, §10). When a player **nearly** commits one (his own foul roll missed by a small margin, §5.3), they roll once for a wrong flag (`phantom_flag`). A snap with no foul and no near-foul rolls nothing for officials, which is ADR-005's die only when it matters. Both rolls go through the seeded PRNG (Iron Rule 4).

### 5.2 Visibility

| visibility | fouls | seen chance (middle option of Q1) |
|---|---|---|
| **plain** | false start, offside, encroachment, neutral zone infraction, delay of game, too many men, illegal formation, illegal shift and motion, intentional grounding | 95 in 100 |
| **in the open** | pass interference both ways, roughing the passer, face mask, horse collar, unnecessary roughness, taunting, unsportsmanlike conduct, illegal forward pass | 80 in 100 |
| **in the crowd** | offensive holding, defensive holding, illegal use of hands, illegal contact, blocks in the back, ineligible man downfield, chop block, clipping | **2 in 3** (Q1, ruled by the owner 2026-10-31, §15; the choices were 2 in 3, 1 in 2 and 1 in 3) |

The plain and open rows are CHOSEN (football judgment: a false start is missed only when the official is screened; an interference behind a play the side judge is not watching can be). The crowd row is the owner's question because it sets how many holds happen that nobody flags, and a hold changes the play (§8).

**What the choice does (COMPUTED from Table 1 and the formula true rate = called rate × (1 − wrong share) ÷ seen chance):** offensive holding is called 15.9 times per 1,000 snaps. With a wrong share of 1 in 20 (Q2's middle), the true rate is **22.7 per 1,000** if officials see 2 in 3, **30.2** if 1 in 2, **45.4** if 1 in 3. A team-game has about 71 scrimmage snaps (116,127 ÷ 1,630), so offensive holding is flagged about 1.1 times a team-game; at 1 in 2 the offense really holds about **2.2 times a team-game** (1.6 at 2 in 3, 3.2 at 1 in 3), and about one of those holds a game saves a sack or springs a run with no flag.

**What the real numbers say (added 2026-10-31; the real-numbers page, Tables 5 and 9, sources P1 to P6).** Nobody has measured the share of real holds that officials flag: the play-by-play holds only flags, and replay has never covered holding (P4). Two real numbers bound it, from opposite sides.

- **The league's own grading counts few misses.** In 2015 the NFL's confidential grading found **4.3 to 4.5 mistakes a game of every kind**, in about 160 plays, and "between 4 and 5" a game over several seasons (P1); in 2014 it found **fewer than one wrong call a game** (P2). So by the league's own standard of what a hold is, missed fouls of every kind come to about 3.5 a game at most. Against that (COMPUTED, the real-numbers page, Table 10: the crowd family is flagged about 4.4 times a game, both teams): under **2 in 3** the missed crowd fouls are about **2.1 a game**, and with the open and plain misses of this table and Q2's wrong flags the design's mistakes come to about **3.5 a game**, inside the league's count; under **1 in 2** the missed crowd fouls alone are about **4.2**, more than the 3.5 missed fouls the league's count allows, and the design's mistakes about **5.6**, more than every mistake the league counted; under **1 in 3**, about **8.4** missed crowd fouls and **9.8** mistakes.
- **A stricter standard finds twice as many.** In the two windows the league pushed crews to call holding strictly (2018 Week 13 and 2019 Weeks 1-2, P6), crews flagged **32 to 34 offensive holds per 1,000 snaps, twice today's 15.9**, while false starts did not move (Table 5), and the next week they fell back. The players did not change in a week; the standard did ("Offensive linemen didn't miraculously stop holding ... It's just a different penalty standard," Blandino on 2020, P6). That is what counts as a hold, not whether the officials saw it, so the game carries it as the crews' leans (§6.1) and, later if wanted, a league point of emphasis; it does not lower the seen chance.

**Ruled (Q1, the owner, 2026-10-31; §15): 2 in 3,** the recommendation as revised from 1 in 2: it is the only choice that fits the league's own count, and the league's standard is the NFL's definition of a hold. 1 in 2 fits only if the league's graders undercount their own misses by a quarter or more, which they may: a close judgment call the supervisor supports is not marked down (P3). At 2 in 3 an offense really holds about **1.6 times a team-game**, and about one hold a game, both teams together, changes a play with no flag.

### 5.3 Wrong flags come from close plays

A wrong flag in a real game is almost never on nothing at all: it is on a block that looked like a hold, a pass break-up that looked early, a lineman whose hand twitched. So the foul roll of each moment (§8) reports its margin, and a miss by **10 points or less** is a **near-foul**. The officials then roll `phantom_flag` against a chance set so that, league-wide, wrong flags are the owner's share of all flags in that family (**Q2, ruled by the owner 2026-10-31 (§15): 1 in 20**; the choices were 1 in 50, 1 in 20 and 1 in 10). Plain fouls take a tenth of that share (a lineman who did not move is rarely flagged for a false start).

**What the real numbers say (added 2026-10-31; sources P2, P4, P5, P9, Table 9).** No NFL source counts wrong flags across all fouls, but four numbers bound the share. The league's grading found **fewer than one wrong call a game in 2014** (P2), under 7% of that season's flags. The league judged **2 of 14 roughing-the-passer flags wrong** on Week 1's Sunday in 2018, a weekend with twice the usual roughing calls, and its Competition Committee found **3 of more than 80** roughing calls from 2022 "questionable" (P5). **Replay took away 3 of 2019's 437 pass interference flags** (0.7%), a floor, since only 27 flags were reviewed and only a clear error could be reversed (Table 9). In the NBA's audited last two minutes, **about 3% of whistled fouls are wrong** (P9). At **1 in 20** judgment flags the game's wrong flags are about 0.4 a game, **about 3% of all flags**, inside every bound; 1 in 50 gives about 1.2%, and 1 in 10 about 6% (Table 10), close to the league's ceiling and twice what the audits find. **The recommendation stayed 1 in 20, now on these numbers, and the owner ruled it.** Every source also finds missed fouls far outnumbering wrong flags: replay added 7 pass interference flags for each one it took away (Table 9), and the NBA's audit finds 6.7 missed fouls per wrong whistle (P9). With Q1 at 2 in 3 and Q2 at 1 in 20, the design's missed fouls outnumber its wrong flags about 8 to 1 (Table 10).

A wrong flag is a real `PENALTY`, enforced like any other. On the stream it points to the near-foul's roll, and no `FOUL` fact stands behind it, so the film shows what really happened (§7).

### 5.4 Missed and wrong flags sum to the real called rate

The seen chance and the wrong share decide the true rate (§5.2), never the called rate: **the called rate is the target, under any answer to Q1 and Q2.** Each family's foul moment (§8) is tuned so that its called rate lands on Table 1. So Q1 and Q2 change how often fouls happen on the field and how many go unflagged, not how many flags a game has.

## 6. Crews and situations

### 6.1 17 crews, each with a lean by family (COMPUTED targets)

Each crew carries a **lean for each of five families**, 50 the league average. The lean multiplies both its seen chance and its wrong-flag chance. Each family's spread is set so the crews' called rates spread as the NFL's 17 referees did (Table 2, crew SD as a share of the league mean). A single season spreads wider than three seasons pooled, because crews change members (Table 6), so the build targets the single-season spread, measured for each family at its step:

| family | fouls | crew SD (real) | what it means |
|---|---|---|---|
| **line holding** | offensive holding, illegal use of hands, chop and low blocks | 13% pooled over 2022-2024; **about 17% in a single season** (7% to 29%, Table 6) | the clearest crew difference in the data: 68% of the referee-to-referee spread is real, and it lasts (correlation 0.35 from one season to the next over 158 referee-seasons, 2015-2025, about 4.7 standard errors; Table 6) |
| **coverage** | defensive pass interference, defensive holding, illegal contact, offensive pass interference | DPI 4%, defensive holding 15%, illegal contact 20%, OPI 34% | crews call interference nearly alike (7% real); they differ on the smaller coverage fouls |
| **player safety** | roughing the passer, unnecessary roughness, face mask, horse collar, taunting, unsportsmanlike | 22% to 24% (roughing, roughness) | about half the spread is real |
| **technical** | illegal formation, illegal shift, illegal motion, ineligible man downfield, delay of game | 16% to 36% | the formation and shift calls are a crew's own emphasis |
| **the snap** | false start, offside, neutral zone, encroachment | 0% to 10% | crews call these alike: the jump is plain to see |

**A crew's lean carries into the next season at 0.35 (COMPUTED, Table 6; revised 2026-10-31 from a CHOSEN 0.45):** the correlation of each referee's offensive-holding rate from one season to the next, 2015 to 2025, over 158 referee-season pairs. The other families use it until their own steps measure theirs. The build reports its crews' year-to-year correlation beside the real one; it does not fit to it.

**How much it matters (COMPUTED from Table 2's range):** a game with the strictest holding crew has about 1.3 more offensive holds flagged than with the loosest; every crew together, the strictest calls 15.5 flags a game and the loosest 12.4.

### 6.2 Crews are assigned each week (Q3)

The NFL assigns its 17 crews to games each week. **Ruled (Q3, the owner, 2026-10-31; §15):** the league has 17 crews with made-up referee names, the stand-ins for the real crews the way the players and coaches are (the owner's direction of 2026-10-23); each week's schedule assigns one crew to each game, with no crew working the same team twice in four weeks (CHOSEN); and the coaches see the crew's leans in game week, the way real teams get a crew's tendencies. Later, the weekly game plan (ADR-076) may read it ("this crew calls holding, keep your hands inside"). **The other choice (not taken):** no named crews; each game draws its leans fresh, and nobody sees them.

### 6.3 Who assigns them

The crews belong to the league, so they are made with the league and saved with it (the franchise package, beside the schedule); the game takes its crew as an input, like its seed (contracts F5, F7). The engine reads the crew's leans and nothing else about it.

### 6.4 The situation (Q4, Q5)

**Late and close, and the playoffs (Q4).** Flags fall 16% late in close games (fourth quarter or overtime, within 8 points) and 17% in the playoffs (Table 4, z 6.2 and 3.7). Part is the officials letting them play; part is the players and the play mix (false starts, not a judgment call, also fall late: 13.1 against 16.8). **Ruled (Q4, the owner, 2026-10-31; §15): yes, officials let them play, on judgment calls only** (the crowd and open families): their seen chance falls late in close games and in the playoffs by what the build measures is needed, after the players' own share is in, to match Table 4. Pre-snap fouls get no officials' lean; their late fall must come from the players (ADR-092's count design). **The other choice (not taken):** officials call every snap alike, and only the players change.

**What the real numbers say about Q4 (added 2026-10-31; Tables 4 and 8, source P7).** The drop is old and steady: 12.8 flags per regular-season game against 10.7 per playoff game over 2000-2019 (CBS Sports, P7). It is not just the better teams: in the regular season, playoff teams draw only about 2.5% fewer flags than the rest (2015-2025, Table 8), against a playoff drop of 17% or more, and flags on the offense, mostly holding, fall 30% in the playoffs against 17% on the defense. The research names it: officials' calls, "especially judgment calls", go "way down near the end of tight games and the bigger the stage" in four sports, from "omission bias", officials fearing a wrong call more than a missed one (Moskowitz and Wertheim, P7). And holding and pass interference follow an arc over a game, "low at the beginning and ends of the game, but high in the middle" (Snyder and Lopez, 2015, P7), as Table 4's quarters show (offensive holding 14.6, 15.7, 19.9 and 14.2 per 1,000 snaps). **The recommendation stayed yes, and the owner ruled it**; the build fits that arc over the game as part of the same lean.

**Home and road (Q5).** Road teams draw 7% more flags (z 3.4), but not evenly: the clearest road gaps are **neutral zone infractions by the road defense** (1.62 times as many, z 3.8, where the home offense's hard count draws them, ADR-091 §5.3's hard count at home only), **delay of game by the road offense** (1.26, z 2.6, the crowd noise), and **defensive holding by the road defense** (1.34, z 4.0). Offensive holding goes the other way (0.95, not beyond chance). **The 2020 season, played mostly without fans, splits them (added 2026-10-31; Table 7, source P8).** Without crowds the road team's extra neutral zone infractions (1.64 to 0.83) and delays of game (1.33 to 0.98) vanished, as a published study of that season found for the defense's pre-snap fouls (Farnell, 2023, P8): those are the crowd. The road defense's extra **pass interference** (1.14 with crowds, 1.17 without), **defensive holding** (1.11, 1.08) and **illegal contact** (1.29, 1.19) did not shrink, and road teams were still penalized about 3 yards a game more (The Ringer, P8). A peer-reviewed study that adjusts for score, time and teams finds the odds of defensive pass interference 18 to 20% higher when the home team has the ball (Snyder and Lopez, 2015, P8).

**Ruled (Q5, the owner, 2026-10-31; §15): a small lean, on the defense's judgment calls only** (the recommendation as revised from no lean): for pass interference, defensive holding and illegal contact, the road defense's seen chance and wrong-flag chance are raised so its called rates sit 1.1 to 1.3 times the home defense's, as in Table 7. Whether the cause is the officials or something else about playing away, the play-by-play cannot tell; the lean is the simplest way to copy it. The pre-snap gaps stay the crowd's (the hard count at home, and noise for the road offense when crowd noise is built), and offensive holding's reverse gap (0.92) is a **watched check**, brought to the owner with its number if the build misses it. **The other choice (not taken):** no lean, and the game misses the road defense's extra judgment-call flags, which the season without fans showed are not the crowd's noise.

## 7. What the coach sees: the assistant head coach, challenges and the film (Q6, Q8)

Every foul is a `FOUL` fact on the stream, flagged or not (Iron Rule 3: a hold that happened is a game fact, and calibration needs it to count the true rate). What the coach sees of it was Q6.

**Ruled (Q6, the owner, 2026-10-31 12:55Z, in words; §15).** Two parts, one now and one later:

1. **Now: the assistant head coach.** A game-day voice, for now a non-player role with no staff seat (not one of ADR-080's four seats), who helps the human coach during the game with anything that is not a coordinator's play call. His first job: when he thinks a ruling was wrong, he **offers the coach a challenge and says how sure he is, as a percentage**. His percentage is **honest** (CHOSEN: calibrated, so of the times he says 70% the ruling really is wrong 7 in 10); it comes from what really happened (the stream's facts) through his own look at the replay, a roll of its own, and never from the review's result. The NFL's 2026 rule lets a head coach name a pregame designee to throw the challenge flag (P10, REPORTED), so he is that designee. **Later:** he may become a staff seat of his own, with skills that set how sharp and how honest he is (§12).
2. **Later: our own video library.** Standard clips for each kind of foul and missed foul, dressed in the two teams' jerseys, the players' looks and the stadium, so the coach watches the replay himself and decides whether to throw the flag. Its own design, with the art director and the viewer (§12).

The play log and the box score show what the officials called, like a broadcast; the game viewer's play detail (the film room) shows every foul, flagged or not, and marks wrong flags. This was the first text's recommendation for Q6, and the owner's answer adds to it rather than replacing it, so it stands as a confirmation (§13).

### 7.1 Challenges and the booth: the NFL's rules (REPORTED; checked against the rulebook with §4)

- A coach has **two challenges** a game and gets a **third if at least one of the first two wins** (since 2024; before, both had to win); never more than three. He needs a timeout to challenge, and a challenge that fails **costs a timeout**. The flag is thrown before the next snap; since 2026 a pregame designee may throw it (P10).
- **Inside the last two minutes of each half and in overtime, coaches cannot challenge:** the replay official in the booth decides what is reviewed. The booth also reviews **every scoring play and every turnover** by itself, even one a foul wipes out. A coach's flag on a play the booth reviews by itself gets no review of its own.
- A ruling is changed only on **clear and obvious** video evidence. A reversal inside the two-minute warning that would not have stopped the clock brings a 10-second runoff (§4.5).
- **What can be challenged:** rulings of fact, such as a catch or an incompletion, the spot and the line to gain, down by contact, in or out of bounds, the goal line, a fumble and its recovery, a kick touched, the number of players on the field. **Most fouls cannot:** pass interference was challengeable only in 2019. Since 2024 and 2025 the booth's **replay assist** may pick up a flag for a few fouls (a hit on a defenseless player, face mask, horse collar, tripping, roughing or running into the kicker, and roughing the passer for a hit to the head or neck only) and **never adds one** (P10).

**The real numbers (COMPUTED, the real-numbers page, Table 11; nflverse 2013-2025, regular season):** coaches challenged **0.48 to 0.56 times a game** in 2021-2025, both teams together (0.62 over 2013-2025), and won **45%** (38% to 52% by season); every lost challenge in the data shows a timeout charged. The booth reviewed **0.54 to 0.71 times a game** in 2021-2025 and changed **66% to 78%** of what it looked at. Coaches challenged catches (pass completion 619 times, incomplete pass 419), the line to gain (first down 291, short of it 164), down by contact (241), the goal line (60), and fouls almost never: pass interference only in 2019 (54 defensive, 27 offensive, 13 changed) and too many players on the field (19, 17 changed).

### 7.2 Q8: what the coach may challenge

The NFL lets a coach challenge almost no penalty, so a challenge on a penalty or a missed one is a house rule unless the game follows the NFL here. **Ruled (Q8, the owner, 2026-10-31 13:08Z; §15): real NFL rules.** The choices were:

- **Real NFL rules (recommended):** challenges cover what the NFL's do (catches, spots and the line to gain, down by contact, the sideline, the goal line, fumbles), so the officials also make mistakes on those rulings, sized so the game's challenges and reviews come out at Table 11's numbers: its own design, built after ADR-089 because it changes plays. On a penalty the assistant head coach still tells the coach what he saw ("I'm 80% sure that hold wasn't one"), and the booth's replay assist picks up a wrong flag among its few fouls by itself.
- **Penalties too (a house rule; not taken):** the coach may also challenge any flag or any missed foul, the way 2019 handled pass interference: changed only on a clear and obvious mistake, a timeout lost when the challenge fails.
- **Real rules plus pass interference (not taken):** the first, plus the NFL's one-season 2019 rule.

**The computer's coaches** challenge on the same honest percentage, with a threshold set so their challenges win as often as real coaches' (45%) (CHOSEN). Every challenge is a `COACH` decision and every review an event on the stream; their contracts petitions come with Q8's build, not with F1 to F7.

## 8. Where fouls come from (outline; each family's design comes at its step)

Each family of fouls has its own moment in a play, and its own step in the build (§11), because each changes the play:

| family | the moment | how the foul changes the play |
|---|---|---|
| **the snap** | the cadence (ADR-092 C1's own ADR) and ADR-091's stem | dead ball, no play; or a free play for offside |
| **technical** | the formation and motion as called (ADR-074 motion) | none on the play; a flag the coach's lineup made |
| **line holding** | a blocker who loses his rep, pass or run, reaches for the man beating him (the rep's own margin, then his Discipline) | the rusher is slowed: the rep counts as held, not lost; on a run, the gap stays shut |
| **coverage** | a receiver winning his route against man coverage; a defender beaten on a deep ball; a contested catch | a held receiver loses his separation; an interference stops a catch; an OPI makes one |
| **player safety** | a hit on the quarterback after he throws; the tackle at the sideline; the hit after the whistle | the play stands; the flag is the cost |
| **kicks** | the return's blocks | as on scrimmage, with the special teams design |

The foul roll is `penalty_check` (the existing `CheckKind`, ADR-091's first producer): `d100 + Discipline ÷ 5` against the family's number, rolled only when the moment happens. Personal fouls add the player's Volatility. Each family's number is fitted so its called rate meets Table 1 under the owner's Q1 and Q2.

**A hold changes the pocket.** At Q1's ruled 2 in 3, about one hold a game, both teams together, changes a play with no flag (§5.2). That is the pocket's own story, so line holding is built **after ADR-089 finishes**, and its effect on pressure and sacks is measured as its own arm (§9).

## 9. Real numbers and checks

**Targets (COMPUTED, Table 1; each per 1,000 scrimmage snaps):** false start 16.2, offensive holding 15.9, defensive pass interference 7.7, defensive holding 6.5, defensive offside 5.4, delay of game 4.3, unnecessary roughness 4.1, ineligible downfield 2.8, illegal contact 2.6, roughing the passer 2.6, neutral zone infraction 2.3, illegal formation 2.3, illegal use of hands 2.2, offensive pass interference 2.2, face mask 2.1; **all scrimmage flags 89.8** (12.8 a game); enforced yards 42.8 a team-game.

**Bands, filed now (D1, CHOSEN):** each foul above inside ±20% of its called rate once its family is built; all scrimmage flags inside ±10%; the declined share of each foul inside ±10 points of Table 1's; enforced yards a team-game inside ±10%; the crews' spread inside half to twice Table 2's crew SD for each family. A miss is brought to the owner with its numbers, never fitted away.

**Conjoined mechanisms.** The players' fouls, the officials' misses, the wrong flags, the crews and the situations are **separately priceable**, so at each family's step they are measured alone and then jointly: **F** (fouls, every one flagged, no wrong flags), **F+S** (with the seen chance), **F+S+W** (with wrong flags), **F+S+W+C** (with crews), **all** (with the situations). Predictions are filed at each step, before its runs.

**What a penalty does to the rest of calibration.** 43 yards a team-game, first downs from defensive fouls, and drives killed by holding will move points per drive, third-down conversions and plays per drive. Each step re-measures calibration's Tier 1 invariants (`calibration.md` §45's list, which already names "penalty rate") and brings every one that moves beyond its band to the owner.

## 10. Contracts (petitions; each needs the owner's typed yes naming it, at its step)

| id | what | step |
|---|---|---|
| **F1** | `FoulKind`, the closed list of §4.3's fouls, and `FoulFamily`, §6.1's five families plus kicks | 0 |
| **F2** | a new `FOUL` event: kind, player, team, when (before the snap, during, after the play), spot, its `penalty_check` roll, and whether it was flagged | 1 |
| **F3** | `PENALTY`'s payload widened: the foul it flags (or the near-foul's roll, for a wrong flag), team, enforcement (spot kind, yards marked off, half the distance or not, automatic first down, loss of down, safety), outcome (enforced, declined, offset), and the coach's decision that chose it. It takes in ADR-091's M5 (the free play) | 0 |
| **F4** | new `CheckKind`s `official_sees` and `phantom_flag` | 1 |
| **F5** | `OfficiatingCrew` (an id, the referee's made-up name, a lean 0 to 100 for each family) and the crew on the game's input and on `GAME_START` | 1 |
| **F6** | the coach's decision kind for accepting a penalty, authority `COACH` (ADR-091's M5 names it; this is the same one) | 0 |
| **F7** | the save format: the league's crews and each week's assignments | 1 |

## 11. The build

| step | what | changes play? | when |
|---|---|---|---|
| **0** | **the rulebook**: enforcement as plain functions (a flag, its spot, the play's result, in; the options and their results, out): spots, half the distance, first downs, loss of down, safeties, offsetting and multiple fouls, the runoff, the untimed down, the computer's choice. A test for each row of §4, each citing its rule. **Checked against the rulebook before merging** (§4.1) | no: nothing calls it | **now** (Q7, ruled 2026-10-31, §15); merges only after the rulebook check |
| **1** | **the officials and crews**: the seen and wrong-flag rolls, the five families, the 17 crews and their weekly assignment, the save | no: no foul is produced yet | **now** (Q7, ruled 2026-10-31, §15) |
| **2** | ADR-091's stem offside, flagged through the officials (plain, 95 in 100) and enforced through step 0 (ADR-090's plan step 6) | yes | after ADR-089 |
| **3** | the snap: false start, neutral zone, encroachment, offside, delay of game, with ADR-092 C1's own ADR | yes | after that ADR |
| **4** | line holding and illegal hands | yes | after ADR-089 |
| **5** | coverage: interference, defensive holding, illegal contact | yes | after step 4 |
| **6** | player safety: roughing, roughness, face mask, horse collar, taunting, unsportsmanlike, ejections | yes | after step 5 |
| **7** | technical: formation, shift, motion (with ADR-074 motion), ineligible man downfield | yes | with motion |
| **8** | kicks | yes | with the special teams design |
| **9** | the human coach's choices on screen; the crews in game week | no | with the UI |

## 12. Later (named, not designed)

- **Our own video library** (Q6, the owner's direction): standard clips of each foul and missed foul, dressed in the teams' jerseys, the players' looks and the stadium, for the coach to watch before he throws the flag. With the art director and the viewer.
- **The assistant head coach as a staff seat** (Q6): skills that set how sharp and how honest his read is, hired and fired with the staff (ADR-080).
- **Officials' rulings of fact** (Q8, ruled): catches, spots, down by contact, the sideline, the goal line and fumbles called wrong at real rates, so challenges and the booth's reviews happen as in Table 11. Its own design, after ADR-089.
- **Officials as people:** each of the seven officials with his own eyes (the umpire sees the line, the back judge the deep ball), grades, and the playoff assignments for the best-graded crews.
- **Reputation:** officials watching a known holder.
- **The game plan reads the crew** (ADR-076): a coordinator who prepares for a strict holding crew lowers his line's holds that week.

## 13. Questions for the owner

| # | question | choices | recommended |
|---|---|---|---|
| **Q1** | How much of the holding and grabbing in the pile do officials see? | **2 in 3** (an offense really holds about 1.6 times a game) / **1 in 2** (about 2.2) / **1 in 3** (about 3.2); flagged about 1.1 times a game under any choice. No source measures it; the NFL's own error count fits 2 in 3 (§5.2) | **2 in 3** (revised from 1 in 2; ruled 2026-10-31, §15) |
| **Q2** | How often is a flag thrown on nothing (a close play that looked like a foul)? | **1 in 50 judgment flags** (one wrong flag every 6 or 7 games) / **1 in 20** (one every 2 or 3 games, about 3% of all flags) / **1 in 10** (close to one a game); plain fouls a tenth as often. Real bounds in §5.3 | **1 in 20** (ruled 2026-10-31, §15) |
| **Q3** | Should the league have 17 named crews, each with its own leans, assigned each week and known to the coaches? | **Named crews** / **Fresh each game, unseen** | **Named crews** (ruled 2026-10-31, §15) |
| **Q4** | Should officials "let them play" late in close games and in the playoffs, on judgment calls? | **Yes, as measured** / **No, the same every snap** | **Yes** (ruled 2026-10-31, §15) |
| **Q5** | Should officials lean toward the home team, beyond what the crowd does? | **No, the crowd only** / **A small lean on the defense's judgment calls** (pass interference, defensive holding, illegal contact: the road gaps that stayed when 2020 had no fans, §6.4) | **A small lean** (revised from No; ruled 2026-10-31, §15) |
| **Q6** | Where does the coach see fouls the officials missed, and flags on nothing? | **On film only** / **In the play log as it happens** / **Nowhere** | **Answered in words** (2026-10-31, §15): the assistant head coach offers challenges with an honest percentage now; our own video library later; the film room stands |
| **Q7** | May steps 0 and 1 (the rulebook and the officials, which change no play) be built now, while the pocket fix is measured? | **Yes, now** / **After the pocket fix** | **Yes, now** (ruled 2026-10-31, §15) |
| **Q8** | What may the coach challenge? (asked 2026-10-31 after Q6's answer; §7.2) | **Real NFL rules** (catches, spots, fumbles, the sideline; officials miss those too, at real rates) / **Penalties too** (a house rule, the 2019 way) / **Real rules plus pass interference** (2019's rule) | **Real NFL rules** (ruled 2026-10-31, §15) |

**Confirmations, not questions** (each stands unless the owner says otherwise): every rule of §4 is the NFL's, checked against the rulebook before step 0 merges; the computer's choice of §4.6; the plain and open seen chances of §5.2; wrong flags only on near-fouls (§5.3); the called rate is the target under any answer (§5.4); the five families and a crew's carry-over of 0.35, measured (§6.1); Discipline for every foul and Volatility for personal fouls (§3, §8); line holding after ADR-089 (§8); the bands D1 (§9); two unsportsmanlike fouls eject (§4.3); the film room shows every foul and marks wrong flags, and the assistant head coach's percentage is honest, with the computer's coaches challenging at a threshold that wins 45% (§7).

## 14. Provenance

| claim | source | status |
|---|---|---|
| `PENALTY` exists with `kind, player, accepted, yards`; `penalty_check` is a `CheckKind` with no producer | `contracts/src/events.ts:147`, `:531`; `engine/src/game/events.ts:60` | CHECKED |
| The engine names penalties as out of scope | `engine/src/sim/passPlay.ts:9`, `runPlay.ts:22`, `game/specialTeams.ts:19`, `game/types.ts:311` | CHECKED |
| Discipline: every position, its meaning; "pre-snap penalties later" | `contracts/src/registry.ts:128-130`, `:240-249` | CHECKED |
| Pre-snap penalty rates as Discipline's derivation source | `docs/design/attributes.md:72` | CHECKED |
| Penalty rate in calibration's Tier 1 | `docs/design/calibration.md:45` | CHECKED |
| Unsportsmanlike and taunting rates as a sign of volatility; `volatility` on every position | `docs/design/player-personality.md:32`; `contracts/src/registry.ts:127` | CHECKED |
| Every flag's called rate, outcome, side, yards; totals | nflverse play-by-play 2022-2024, regular season (Table 1) | COMPUTED (this ADR) |
| Crew spread, real share, year-to-year correlation, crew ranges | nflverse play-by-play + officials table (Table 2) | COMPUTED (this ADR) |
| Home and road gaps | Table 3 | COMPUTED (this ADR) |
| Late and close, playoffs | Table 4 | COMPUTED (this ADR) |
| True rates under Q1 and Q2 | §5.2's formula on Table 1 | COMPUTED (this ADR) |
| Every rule in §4 (yards, spots, first downs, half the distance, safeties, double fouls, runoff, untimed down, ejection) | the Orchestrator's knowledge of the NFL rulebook; `operations.nfl.com` and the secondary sources refused by this container's network on 2026-10-31 | REPORTED (rulebook not opened; checked before step 0 merges, §4.1) |
| The NFL has 17 officiating crews | 17 referees in the officials table, 2022-2024 | COMPUTED (this ADR) |
| Seen chances for plain and open fouls; the near-foul margin of 10; a plain foul's tenth of the wrong share; no crew on a team twice in four weeks; bands D1 | football judgment | CHOSEN (provenance NONE) |
| Event, check and type names (`FOUL`, `official_sees`, `phantom_flag`, `OfficiatingCrew`, the families) | named here | CHOSEN (provenance NONE) |
| How called rates move with the league's standard (2013-2025); crews across seasons (carry-over 0.35, single-season spread); home and road with and without crowds (2020); the playoff drop against team quality; replay and pass interference in 2019 | nflverse play-by-play 2013-2025 and the officials table (real-numbers page, Tables 5 to 9) | COMPUTED (this ADR, 2026-10-31) |
| The design's mistakes a game under each answer to Q1 and Q2; its wrong-flag share of all flags; its ratio of missed fouls to wrong flags | §5.2's formula on Table 1 | COMPUTED (this ADR, 2026-10-31) |
| The NFL's grading: 4.3 to 4.5 mistakes a game in 2015, in about 160 plays; fewer than one wrong call a game in 2014; the headline accuracy figures (95 to 97%, 95.9%, 98.9%); supported close calls not marked down | ESPN, Fox Business, SI from USA Today, AP from NFL spokesman Michael Signora, NFL.com, the NFL Referees Association, NBC stations (real-numbers page, P1 to P3) | REPORTED (search results only; the pages could not be opened; several outlets agree; the league does not publish its grades) |
| Wrong roughing-the-passer flags (2 of 14, 2018 Week 1; 3 of more than 80 "questionable", 2022); the strict-holding windows and Blandino's "a different penalty standard"; Kitchens on the umpire's move | NFL.com, KCTV5, ESPN, Vancouver Sun, Economic Inquiry (P5, P6); the counts reproduce in nflverse (Table 5) | REPORTED (search results only); counts COMPUTED |
| Letting them play (Moskowitz and Wertheim; Snyder and Lopez, 2015; 12.8 against 10.7 flags a game, 2000-2019); home and road (FiveThirtyEight; Farnell, 2023; The Ringer, 2021; Snyder and Lopez) | P7, P8 | REPORTED (search results only) |
| NBA last-two-minute audits: about 3% of whistled fouls wrong; 6.7 missed fouls per wrong whistle | Pelechrinis, Scientific Reports, 2023; the NBA via KTVB; Boston Globe, 2015 (P9) | REPORTED (another sport; search results only) |
| Coaches' challenges and the booth's reviews, 2013-2025: a game, won and changed, what was challenged | nflverse play-by-play (`replay_or_challenge`, `replay_or_challenge_result` and the description), the real-numbers page, Table 11 | COMPUTED (this ADR, 2026-10-31) |
| The challenge rules of §7.1 (two, a third since 2024, a timeout lost, none inside two minutes or in overtime, the booth's automatic reviews, replay assist's fouls, the 2026 designee) | ESPN, CBS Sports, Bleacher Report, NFL.com's replay assistance page, the Rams, Football Zebras, ProFootballTalk (real-numbers page, P10) | REPORTED (search results only; checked against the rulebook with §4) |
| The assistant head coach's honest percentage; the computer's challenge threshold | the owner's Q6 answer and football judgment | CHOSEN |
| No source measures the share of real holds flagged, or wrong flags across all fouls, in the NFL | two search passes, 2026-10-31, about 140 sources looked at (real-numbers page) | REPORTED (absence not proven) |

## 15. Rulings

The owner's answers, as given; each stands for the build. Questions not listed are still open.

- **Q1, 2026-10-31 12:40Z (card): 2 in 3.** Officials see 2 in 3 of the fouls in the crowd (offensive and defensive holding, illegal use of hands, illegal contact, blocks in the back, ineligible man downfield, chop blocks, clipping); with the plain and open classes of §5.2, and Q2's 1 in 20, the design's officials make about 3.5 mistakes a game, inside the NFL's own grading (§5.2, real-numbers Table 10). An offense really holds about 1.6 times a team-game and is flagged about 1.1 times. The called rate stays the target (§5.4).
- **Q2, 2026-10-31 12:42Z (card): 1 in 20.** Wrong flags are 1 in 20 of the judgment-call flags (the crowd and open classes) and a tenth of that for plain fouls, only ever on a near-foul (§5.3): about 0.4 a game, about 3% of all flags, inside every real bound (§5.3). With Q1's 2 in 3 the officials miss about 8 fouls for each wrong flag (real-numbers Table 10).
- **Q3, 2026-10-31 12:29Z (card): named crews.** The league has 17 crews with made-up referee names, stand-ins for the real crews; each carries a lean for each of the five families, sized to the real spread (§6.1), and carries it into the next season at 0.35; each week's schedule assigns one crew to each game, no crew working the same team twice in four weeks; the coaches see the crew's leans in game week (§6.2). The crews are made and saved with the league (§6.3). Built at step 1.
- **Q4, 2026-10-31 12:30Z (card): yes, as measured.** On judgment calls only (the crowd and open families), the officials' seen chance falls late in close games (fourth quarter or overtime, within 8 points) and in the playoffs, by what the build measures is needed, after the players' own share is in, to match Table 4 (about 16% and 17% fewer flags); and it follows the arc through a game, higher in the middle quarters (§6.4). Plain fouls get no officials' lean; their late fall comes from the players (ADR-092's count design). The lean is built with the officials at step 1 and fitted at each family's step.
- **Q5, 2026-10-31 12:44Z (card): a small lean, on the defense's judgment calls.** For defensive pass interference, defensive holding and illegal contact, the road defense's seen chance and wrong-flag chance are raised so its called rates sit 1.1 to 1.3 times the home defense's, as in real-numbers Table 7 (1.14, 1.11 and 1.29 with crowds; the gaps stayed in 2020 without fans). Every other road gap comes from the crowd (the hard count at home, and noise for the road offense when crowd noise is built); offensive holding's reverse gap (0.92) is a watched check, brought to the owner with its number if the build misses it (§6.4). The lean is built with the officials at step 1 and fitted at the coverage family's step.
- **Q6, 2026-10-31 12:55Z (in the thread, in words):** "For Q6 can we eventually build our own video library where it's able to create standards for various penalties (or missed penalties) that can swap out the jersey colors, player looks, and stadium details to fit the teams playing and allow the game player to decide whether or not to throw a challenge flag? In the meantime, let's make a temporary system where the assistant head coach offers the game player an opportunity to challenge and gives a percentage of how certain he is. We may potentially want to make the assistant head coach it's own position on staff with its own skills. But for now let's just make it an NPC-type role that serves as the voice for helping our game players during the game in any capacity that wouldn't be related to a coordinator's playcalling." Written into §7 (the assistant head coach now, the video library later) and §12. Because the NFL lets a coach challenge almost no penalty (§7.1), what may be challenged went back to the owner as Q8.
- **Q8, 2026-10-31 13:08Z (card): real NFL rules.** The coach may challenge what an NFL coach may: rulings of fact (a catch or an incompletion, the spot and the line to gain, down by contact, the sideline, the goal line, a fumble and its recovery, a kick touched, the number of players on the field), under §7.1's rules. So the officials also make mistakes on those rulings, at rates sized so the game's challenges and reviews come out at Table 11's numbers: its own design, after ADR-089, because it changes plays (§12). On a penalty the assistant head coach says what he saw, with his percentage, and there is no flag to throw; the booth's replay assist picks up a wrong flag among its few fouls by itself and never adds one.
- **Q7, 2026-10-31 12:44Z (card): yes, now.** Steps 0 (the rulebook) and 1 (the officials and crews) are built now, while ADR-089 is measured, because neither changes a play: nothing calls the rulebook and nothing produces a foul yet. Each step comes to the owner with its tests before it merges; step 0 merges only after every rule of §4 is checked against the rulebook (§4.1). Their contracts edits (F1, F3 and F6 at step 0; F2, F4, F5 and F7 at step 1) each still need the owner's typed yes naming them (§10).
