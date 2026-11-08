# ADR-093 (DESIGN): penalties by the NFL's rules, called by human officials

- **Date:** 2026-10-31
- **Proposed by:** Orchestrator (thread "Design penalties with human officials")
- **Status:** **approved (design), all eight questions ruled on 2026-10-31 (§15).** Nothing in `packages/` changes with this ADR. Seven questions went to the owner (§13), all answered on 2026-10-31 (§15); Q6's answer brought an eighth, Q8 (§7.2), in plain words in [ADR-093-questions-explained.md](ADR-093-questions-explained.md) and on cards in the thread. Each contracts edit in §10 needs the owner's typed yes naming it, asked at the step that needs it. The owner never merges: each step comes with its numbers and needs the owner's word before the Orchestrator merges it. **Revised 2026-10-31, the same night,** after the owner asked whether the recommendations rest on real NFL statistics ("is Q1 B about 2.2 real holds a game a real statistic?" It was not: it was the real flag rate divided by a guessed seen chance). Two search passes and new counts (the real-numbers page, Tables 5 to 9 and sources P1 to P9) changed **Q1's recommendation from 1 in 2 to 2 in 3** (§5.2, the NFL's own error count) and **Q5's from no lean to a small lean on the defense's judgment calls** (§6.4, the 2020 season without fans); Q2's 1 in 20 and Q4's yes now rest on real bounds (§5.3, §6.4); the crews' carry-over is now measured, 0.35 (§6.1). **Amended 2026-11-01 for step 1:** §16, the step-1 ledger, records how step 1 reads this ADR and what it builds; it changes no ruling but the timing of the stand-in league's copied crews, which come in a step 1b right after step 1, not in step 1 as Q3 says, unless the owner says otherwise (§16 A11); only the near-foul's words in §5.1 and §5.3 change in place. **Ruled 2026-11-06:** step 1's question 1, the crews' carry, is 0.68 (card: "0.68, steady like real crews"), in place of the 0.35 of Q3's ruling, §6.1 and §13's confirmation, which stay as written (§15, §16 A5); and the owner typed the yes for contracts edit E1 (§16 A2). **Step 1b, built 2026-11-07:** the stand-in league's 17 crews are copies of the real crews under made-up referee names, kept as measured, each showing what its real crew's records show beyond chance, on the owner's answer of 2026-11-08 (§15, §16 A11).
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

When a player commits a foul, the officials roll **once**: flagged or not (`official_sees`, new `CheckKind`, §10). When a player **nearly** commits one (his own foul roll only just made its target, §5.3 and §16 A2) (amended 2026-11-01, step 1), they roll once for a wrong flag (`phantom_flag`). A snap with no foul and no near-foul rolls nothing for officials, which is ADR-005's die only when it matters. Both rolls go through the seeded PRNG (Iron Rule 4).

*Step 1's reading: §16 A9 (added 2026-11-01, step 1).*

### 5.2 Visibility

| visibility | fouls | seen chance (middle option of Q1) |
|---|---|---|
| **plain** | false start, offside, encroachment, neutral zone infraction, delay of game, too many men, illegal formation, illegal shift and motion, intentional grounding | 95 in 100 |
| **in the open** | pass interference both ways, roughing the passer, face mask, horse collar, unnecessary roughness, taunting, unsportsmanlike conduct, illegal forward pass | 80 in 100 |
| **in the crowd** | offensive holding, defensive holding, illegal use of hands, illegal contact, blocks in the back, ineligible man downfield, chop block, clipping | **2 in 3** (Q1, ruled by the owner 2026-10-31, §15; the choices were 2 in 3, 1 in 2 and 1 in 3) |

*Step 1's reading: §16 A1 (added 2026-11-01, step 1).*

The plain and open rows are CHOSEN (football judgment: a false start is missed only when the official is screened; an interference behind a play the side judge is not watching can be). The crowd row is the owner's question because it sets how many holds happen that nobody flags, and a hold changes the play (§8).

**What the choice does (COMPUTED from Table 1 and the formula true rate = called rate × (1 − wrong share) ÷ seen chance):** offensive holding is called 15.9 times per 1,000 snaps. With a wrong share of 1 in 20 (Q2's middle), the true rate is **22.7 per 1,000** if officials see 2 in 3, **30.2** if 1 in 2, **45.4** if 1 in 3. A team-game has about 71 scrimmage snaps (116,127 ÷ 1,630), so offensive holding is flagged about 1.1 times a team-game; at 1 in 2 the offense really holds about **2.2 times a team-game** (1.6 at 2 in 3, 3.2 at 1 in 3), and about one of those holds a game saves a sack or springs a run with no flag.

**What the real numbers say (added 2026-10-31; the real-numbers page, Tables 5 and 9, sources P1 to P6).** Nobody has measured the share of real holds that officials flag: the play-by-play holds only flags, and replay has never covered holding (P4). Two real numbers bound it, from opposite sides.

- **The league's own grading counts few misses.** In 2015 the NFL's confidential grading found **4.3 to 4.5 mistakes a game of every kind**, in about 160 plays, and "between 4 and 5" a game over several seasons (P1); in 2014 it found **fewer than one wrong call a game** (P2). So by the league's own standard of what a hold is, missed fouls of every kind come to about 3.5 a game at most. Against that (COMPUTED, the real-numbers page, Table 10: the crowd family is flagged about 4.4 times a game, both teams): under **2 in 3** the missed crowd fouls are about **2.1 a game**, and with the open and plain misses of this table and Q2's wrong flags the design's mistakes come to about **3.5 a game**, inside the league's count; under **1 in 2** the missed crowd fouls alone are about **4.2**, more than the 3.5 missed fouls the league's count allows, and the design's mistakes about **5.6**, more than every mistake the league counted; under **1 in 3**, about **8.4** missed crowd fouls and **9.8** mistakes.
- **A stricter standard finds twice as many.** In the two windows the league pushed crews to call holding strictly (2018 Week 13 and 2019 Weeks 1-2, P6), crews flagged **32 to 34 offensive holds per 1,000 snaps, twice today's 15.9**, while false starts did not move (Table 5), and the next week they fell back. The players did not change in a week; the standard did ("Offensive linemen didn't miraculously stop holding ... It's just a different penalty standard," Blandino on 2020, P6). That is what counts as a hold, not whether the officials saw it, so the game carries it as the crews' leans (§6.1) and, later if wanted, a league point of emphasis; it does not lower the seen chance.

**Ruled (Q1, the owner, 2026-10-31; §15): 2 in 3,** the recommendation as revised from 1 in 2: it is the only choice that fits the league's own count, and the league's standard is the NFL's definition of a hold. 1 in 2 fits only if the league's graders undercount their own misses by a quarter or more, which they may: a close judgment call the supervisor supports is not marked down (P3). At 2 in 3 an offense really holds about **1.6 times a team-game**, and about one hold a game, both teams together, changes a play with no flag.

### 5.3 Wrong flags come from close plays

A wrong flag in a real game is almost never on nothing at all: it is on a block that looked like a hold, a pass break-up that looked early, a lineman whose hand twitched. So the foul roll of each moment (§8) reports its margin: a foul is a foul roll that misses (margin below 0), as in ADR-091 §5.6's "the first miss is defensive offside", and a **near-foul** is one that only just makes its target, by **10 points or less** (margin 0 to 10, 11 faces; §16 A2 and A9) (amended 2026-11-01, step 1). The officials then roll `phantom_flag` against a chance set so that, league-wide, wrong flags are the owner's share of all flags in that family (**Q2, ruled by the owner 2026-10-31 (§15): 1 in 20**; the choices were 1 in 50, 1 in 20 and 1 in 10). Plain fouls take a tenth of that share (a lineman who did not move is rarely flagged for a false start).

**What the real numbers say (added 2026-10-31; sources P2, P4, P5, P9, Table 9).** No NFL source counts wrong flags across all fouls, but four numbers bound the share. The league's grading found **fewer than one wrong call a game in 2014** (P2), under 7% of that season's flags. The league judged **2 of 14 roughing-the-passer flags wrong** on Week 1's Sunday in 2018, a weekend with twice the usual roughing calls, and its Competition Committee found **3 of more than 80** roughing calls from 2022 "questionable" (P5). **Replay took away 3 of 2019's 437 pass interference flags** (0.7%), a floor, since only 27 flags were reviewed and only a clear error could be reversed (Table 9). In the NBA's audited last two minutes, **about 3% of whistled fouls are wrong** (P9). At **1 in 20** judgment flags the game's wrong flags are about 0.4 a game, **about 3% of all flags**, inside every bound; 1 in 50 gives about 1.2%, and 1 in 10 about 6% (Table 10), close to the league's ceiling and twice what the audits find. **The recommendation stayed 1 in 20, now on these numbers, and the owner ruled it.** Every source also finds missed fouls far outnumbering wrong flags: replay added 7 pass interference flags for each one it took away (Table 9), and the NBA's audit finds 6.7 missed fouls per wrong whistle (P9). With Q1 at 2 in 3 and Q2 at 1 in 20, the design's missed fouls outnumber its wrong flags about 8 to 1 (Table 10).

A wrong flag is a real `PENALTY`, enforced like any other. On the stream it points to the near-foul's roll, and no `FOUL` fact stands behind it, so the film shows what really happened (§7).

### 5.4 Missed and wrong flags sum to the real called rate

The seen chance and the wrong share decide the true rate (§5.2), never the called rate: **the called rate is the target, under any answer to Q1 and Q2.** Each family's foul moment (§8) is tuned so that its called rate lands on Table 1. So Q1 and Q2 change how often fouls happen on the field and how many go unflagged, not how many flags a game has.

## 6. Crews and situations

### 6.1 17 crews, each with a lean by family (COMPUTED targets)

Each crew carries a **lean for each of five families**, 50 the league average. The lean multiplies both its seen chance and its wrong-flag chance. Each family's spread is set so the crews' called rates spread as the NFL's 17 referees did (Table 2, crew SD as a share of the league mean). A single season spreads wider than three seasons pooled, because crews change members (Table 6), so the build targets the single-season spread, measured for each family at its step:

*Step 1's reading: §16 A3 and A4 (added 2026-11-01, step 1).*

| family | fouls | crew SD (real) | what it means |
|---|---|---|---|
| **line holding** | offensive holding, illegal use of hands, chop and low blocks | 13% pooled over 2022-2024; **about 17% in a single season** (7% to 29%, Table 6) | the clearest crew difference in the data: 68% of the referee-to-referee spread is real, and it lasts (correlation 0.35 from one season to the next over 158 referee-seasons, 2015-2025, about 4.7 standard errors; Table 6) |
| **coverage** | defensive pass interference, defensive holding, illegal contact, offensive pass interference | DPI 4%, defensive holding 15%, illegal contact 20%, OPI 34% | crews call interference nearly alike (7% real); they differ on the smaller coverage fouls |
| **player safety** | roughing the passer, unnecessary roughness, face mask, horse collar, taunting, unsportsmanlike | 22% to 24% (roughing, roughness) | about half the spread is real |
| **technical** | illegal formation, illegal shift, illegal motion, ineligible man downfield, delay of game | 16% to 36% | the formation and shift calls are a crew's own emphasis |
| **the snap** | false start, offside, neutral zone, encroachment | 0% to 10% | crews call these alike: the jump is plain to see |

*Step 1's reading: §16 A1 (added 2026-11-01, step 1).*

**A crew's lean carries into the next season at 0.35 (COMPUTED, Table 6; revised 2026-10-31 from a CHOSEN 0.45):** the correlation of each referee's offensive-holding rate from one season to the next, 2015 to 2025, over 158 referee-season pairs. The other families use it until their own steps measure theirs. The build reports its crews' year-to-year correlation beside the real one; it does not fit to it.

*Step 1's reading: §16 A5 (added 2026-11-01, step 1).*

**How much it matters (COMPUTED from Table 2's range):** a game with the strictest holding crew has about 1.3 more offensive holds flagged than with the loosest; every crew together, the strictest calls 15.5 flags a game and the loosest 12.4.

### 6.2 Crews are assigned each week (Q3)

The NFL assigns its 17 crews to games each week. **Ruled (Q3, the owner, 2026-10-31; §15):** the league has 17 crews with made-up referee names, the stand-ins for the real crews the way the players and coaches are (the owner's direction of 2026-10-23); each week's schedule assigns one crew to each game, with no crew working the same team twice in four weeks (CHOSEN); and the coaches see the crew's leans in game week, the way real teams get a crew's tendencies. Later, the weekly game plan (ADR-076) may read it ("this crew calls holding, keep your hands inside"). **The other choice (not taken):** no named crews; each game draws its leans fresh, and nobody sees them.

*Step 1's reading: §16 A6 and A11 (added 2026-11-01, step 1).*

### 6.3 Who assigns them

The crews belong to the league, so they are made with the league and saved with it (the franchise package, beside the schedule); the game takes its crew as an input, like its seed (contracts F5, F7). The engine reads the crew's leans and nothing else about it.

### 6.4 The situation (Q4, Q5)

**Late and close, and the playoffs (Q4).** Flags fall 16% late in close games (fourth quarter or overtime, within 8 points) and 17% in the playoffs (Table 4, z 6.2 and 3.7). Part is the officials letting them play; part is the players and the play mix (false starts, not a judgment call, also fall late: 13.1 against 16.8). **Ruled (Q4, the owner, 2026-10-31; §15): yes, officials let them play, on judgment calls only** (the crowd and open families): their seen chance falls late in close games and in the playoffs by what the build measures is needed, after the players' own share is in, to match Table 4. Pre-snap fouls get no officials' lean; their late fall must come from the players (ADR-092's count design). **The other choice (not taken):** officials call every snap alike, and only the players change.

*Step 1's reading: §16 A7 (added 2026-11-01, step 1).*

**What the real numbers say about Q4 (added 2026-10-31; Tables 4 and 8, source P7).** The drop is old and steady: 12.8 flags per regular-season game against 10.7 per playoff game over 2000-2019 (CBS Sports, P7). It is not just the better teams: in the regular season, playoff teams draw only about 2.5% fewer flags than the rest (2015-2025, Table 8), against a playoff drop of 17% or more, and flags on the offense, mostly holding, fall 30% in the playoffs against 17% on the defense. The research names it: officials' calls, "especially judgment calls", go "way down near the end of tight games and the bigger the stage" in four sports, from "omission bias", officials fearing a wrong call more than a missed one (Moskowitz and Wertheim, P7). And holding and pass interference follow an arc over a game, "low at the beginning and ends of the game, but high in the middle" (Snyder and Lopez, 2015, P7), as Table 4's quarters show (offensive holding 14.6, 15.7, 19.9 and 14.2 per 1,000 snaps). **The recommendation stayed yes, and the owner ruled it**; the build fits that arc over the game as part of the same lean.

**Home and road (Q5).** Road teams draw 7% more flags (z 3.4), but not evenly: the clearest road gaps are **neutral zone infractions by the road defense** (1.62 times as many, z 3.8, where the home offense's hard count draws them, ADR-091 §5.3's hard count at home only), **delay of game by the road offense** (1.26, z 2.6, the crowd noise), and **defensive holding by the road defense** (1.34, z 4.0). Offensive holding goes the other way (0.95, not beyond chance). **The 2020 season, played mostly without fans, splits them (added 2026-10-31; Table 7, source P8).** Without crowds the road team's extra neutral zone infractions (1.64 to 0.83) and delays of game (1.33 to 0.98) vanished, as a published study of that season found for the defense's pre-snap fouls (Farnell, 2023, P8): those are the crowd. The road defense's extra **pass interference** (1.14 with crowds, 1.17 without), **defensive holding** (1.11, 1.08) and **illegal contact** (1.29, 1.19) did not shrink, and road teams were still penalized about 3 yards a game more (The Ringer, P8). A peer-reviewed study that adjusts for score, time and teams finds the odds of defensive pass interference 18 to 20% higher when the home team has the ball (Snyder and Lopez, 2015, P8).

**Ruled (Q5, the owner, 2026-10-31; §15): a small lean, on the defense's judgment calls only** (the recommendation as revised from no lean): for pass interference, defensive holding and illegal contact, the road defense's seen chance and wrong-flag chance are raised so its called rates sit 1.1 to 1.3 times the home defense's, as in Table 7. Whether the cause is the officials or something else about playing away, the play-by-play cannot tell; the lean is the simplest way to copy it. The pre-snap gaps stay the crowd's (the hard count at home, and noise for the road offense when crowd noise is built), and offensive holding's reverse gap (0.92) is a **watched check**, brought to the owner with its number if the build misses it. **The other choice (not taken):** no lean, and the game misses the road defense's extra judgment-call flags, which the season without fans showed are not the crowd's noise.

*Step 1's reading: §16 A8 (added 2026-11-01, step 1).*

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

*Step 1's reading: §16 A2 (added 2026-11-01, step 1).*

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

*Step 1 adds referee careers to this list, a referee retiring and a new one arriving: §16 A6. It also names two fixes for step 9: the referees' names kept clear of the staff's (§16 A4), and each week drawn the first time anything in it asks (§16 A6) (added 2026-11-01, step 1).*

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
| Pre-snap penalty rates as Discipline's derivation source | `docs/design/attributes.md:79` | CHECKED |
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
- **Step 1's question 1, 2026-11-06 19:08Z (card): 0.68.** The card asked "Should a crew's habit carry over each winter at 0.68 or 0.35?", and the owner chose "0.68, steady like real crews". A crew's lean carries into the next season at 0.68, so the game's own holding flags show the real link between a referee's seasons, 0.35 (real-numbers Table 6), once one season's luck is in: 0.35 ÷ 0.515 (COMPUTED, §16 A5). This replaces the 0.35 that Q3's ruling, §6.1 and §13's confirmation state, and §6.1's "it does not fit to it", which stay as written. Step 4's crew report tests that model of the luck against holding's real 0.35. The other families use the same dial until their own steps measure theirs (§6.1).
- **Step 1b's question, 2026-11-08 01:18Z (in the thread, in words): keep them as measured.** The card asked "Should the stand-in league's copied crews stay as measured, or be widened?", and the owner answered in the thread, "keep them as measured". Each copy keeps the part of its real crew's habit that last season's and this season's records show beyond chance, and no more: on line holding the copies spread about 10.6% of the league's rate in a 2026 season and about 14.0% after one winter's carry at 0.68, against about 14.4% for 17 real crews in one season, measured the same way (COMPUTED, §16 A11). It answers §16 A11's "How widely: asked at step 1b". Q3's ruling, §6.1 and §13 stay as written.

## 16. The step-1 ledger (added 2026-11-01)

*The Orchestrator wrote this section on 2026-11-01 from plan-v2, the step-1 build plan named below, as the step-1 PR's first commit. It records how step 1 (§11) reads this ADR, and what step 1 builds. It changes no ruling but one timing: Q3's ruling builds the stand-in league's copied crews at step 1, and they come in step 1b, a second small PR right after step 1's (A11). The owner was told so on 2026-11-01, and it stands unless the owner says otherwise. The step-1 build plan is `/mnt/project-files/design/ADR-093-step1/plan-v2.md` (revision 2, after four reviews), with its reader notes, reviews and scripts beside it. The plan cites the tree at `7b06b4e`, PR #62's head, and so does this section. No code or test reads this file, and it is outside ADR-089's source fingerprint. Step 1, this section included, comes to the owner with its tests and its numbers, and merges only on the owner's word (§15, Q7). It then merges only inside the window agreed with ADR-089's thread, because step 1's code voids ADR-089's cached arms.*

### What stays as written, and what changed in place

- **Word for word:** the six ruled paragraphs (Q1's in §5.2, Q3's in §6.2, Q4's and Q5's in §6.4, Q6's in §7 and Q8's in §7.2); §6.1's lean sentence, families table and carry; D1 (§9); §13; and §15.
- **Pointers:** each paragraph an item below reads has a one-line pointer after it, tagged "(added 2026-11-01, step 1)". They follow §5.1's paragraph (A9), §5.2's visibility table (A1), §6.1's opening paragraph (A3, A4), §6.1's families table (A1), §6.1's carry (A5), Q3's ruling (A6, A11), Q4's ruling (A7), Q5's ruling (A8) and §8's foul roll (A2). One more follows §12's list, which A4 and A6 add to.
- **Changed in place:** only A2's two sign errata, one clause in §5.1 and one in §5.3, each tagged "(amended 2026-11-01, step 1)". §5.3's erratum also names A9. Q2's ruling sentence in §5.3 stays as it was.
- **One erratum, recorded here and not edited in place:** §6.1's line-holding row says "over 158 referee-seasons". The count is 158 pairs of back-to-back referee-seasons (REAL), as the carry paragraph under the table and Table 6 say ("consecutive referee-season pairs: 158").
- **Held back:** A10, how D1's crew band reads for a family. No step-1 number tests the band, since step 1 calls no foul (§11). A10 comes to the owner with the first family's called-rate numbers (step 2's snap family or step 4's line holding), as a confirmation or a question. D1 stays as written until then. The items keep the plan's numbering, so there is no A10 below.
- **Later answers** come as new dated §15 entries, each with a new line here: question 1 (A5); the copies' timing, if the owner changes A11's; the copies' spread (A11); and A10's reading. Nothing written here is rewritten.

### The labels

Every number in this section carries one of four labels, as the plan uses them:

- **REAL:** counted from nflverse: read from the real-numbers page (a table, or its totals) or the data file behind it, or from a dated query named where it is used. The sections above label the page's figures COMPUTED, since this ADR counted them.
- **REPORTED:** a published figure the real-numbers page quotes from its sources P1 to P10, not counted from data.
- **COMPUTED:** arithmetic or a simulation on cited numbers, here or in the plan and its notes.
- **CHOSEN:** judgment. "CHOSEN, ruled" marks the owner's own answer in §15.

### A1. The nine fouls placed

**Owner's word: not needed.** §13 confirms the five families, and placing kinds within them is this ADR's text: the contracts record left it to §6.1 (`/mnt/project-files/design/ADR-093-contracts/final.md`, §10 item 7). Step 1's note to the owner lists the placements.

Seven of the kinds in `FoulKind` (`contracts/src/penalties.ts:24-55`) were in none of §6.1's lists, and tripping was in no class of §5.2. Two more could take either of two families. Step 1 places all nine:

| kind | family, visibility | why |
|---|---|---|
| OFFENSIVE_TOO_MANY_MEN_ON_FIELD | TECHNICAL, plain | the lineup as called is the technical family's moment (§8: "a flag the coach's lineup made"); §5.2 lists too many men as plain; it has no Table 2 row, so its weight is 1 (A3); 0.33 per 1,000 snaps (REAL, Table 1) |
| DEFENSIVE_TOO_MANY_MEN_ON_FIELD | TECHNICAL, plain | the same; 1.26 per 1,000 snaps (REAL, Table 1) |
| ILLEGAL_FORWARD_PASS | TECHNICAL, open | a rule of the pass's form, a loss of down like grounding (§4.3); §5.2 lists it in the open; under 30 flags in three seasons (REAL: absent from Table 1) |
| INTENTIONAL_GROUNDING | TECHNICAL, plain | §5.2 lists it as plain; its crew SD is 0% (REAL, Table 2), so its weight is 0, and the family only names its build step |
| CLIPPING | LINE_HOLDING, crowd | a block from behind, one act with the block in the back; §6.1 already puts the chop block, a 15-yard block foul, in line holding; §5.2 lists clipping in the crowd |
| ILLEGAL_BLOCK_ABOVE_THE_WAIST | LINE_HOLDING, crowd | §5.2's blocks in the back are in the crowd; its crew SD is 0% (REAL, Table 2); most of its real flags are on kicks (105 of 175, REAL, Table 1), which are KICKS anyway |
| TRIPPING | PLAYER_SAFETY, **open** | the booth's replay assist lists tripping beside face mask, horse collar and roughing (§7.1; REPORTED, P10), fouls the cameras see plainly; the script behind Table 10 counts it in the open (`families.py:14`). Against: §4.3 enforces it with the block in the back. It is rare either way: under 0.26 per 1,000 snaps (COMPUTED: under 30 flags in 116,127 snaps, REAL) |
| ILLEGAL_USE_OF_HANDS, the defense's | LINE_HOLDING, crowd, for both sides | §6.1 lists it there, and §11's step 4 builds "line holding and illegal hands"; it shows no road gap (1.04, REAL, Table 7), unlike the three coverage fouls of Q5. If step 5 builds a hands-to-the-face moment in coverage, that moment may take COVERAGE under step 5's own amendment. Not found: how the defense's flags split between rushers and defensive backs, which needs a roster join of `penalty_player_id`, a step-4 task |
| DEFENSIVE_DELAY_OF_GAME | **SNAP**, plain | this ADR's header puts it in ADR-092 C1's count battle; its foul before the snap is §4.3's abrupt move that draws a flinch (`contracts/src/penalties.ts:28-33`), the snap family's moment (§8: the cadence); the contract names the offense's DELAY_OF_GAME as TECHNICAL, though step 3 builds it with the snap, and makes no such note for the defense's (`contracts/src/penalties.ts:59-60`); §6.1's technical row counts the offense's flags only (all 495 delay-of-game flags of 2022 to 2024 were the offense's: REAL, Table 1, whose 100% on offense is exactly 1.0 in its data, `/mnt/project-files/design/ADR-093-data/adr093-flags.json`). Its other half, delaying the next snap after a play, waits for its own step, and may take TECHNICAL by its moment then |

**The data already place them.** `families.py`, the script that made Table 10 (`/mnt/project-files/design/ADR-093-data/families.py:8-18`), puts both too-many-men kinds, grounding and the defense's delay of game in the plain class. It puts the illegal forward pass and tripping in the open, and illegal use of hands, the block above the waist, chop blocks and clipping in the crowd. So Q1's ruled numbers already counted these placements.

**Every kind, as step 1 builds it,** on a scrimmage snap (the counts are COMPUTED):

| family | kinds | visibility | count |
|---|---|---|---|
| SNAP | FALSE_START, DEFENSIVE_OFFSIDE, NEUTRAL_ZONE_INFRACTION, ENCROACHMENT, OFFENSIVE_OFFSIDE, DEFENSIVE_DELAY_OF_GAME | all plain | 6 |
| TECHNICAL | DELAY_OF_GAME, ILLEGAL_FORMATION, ILLEGAL_SHIFT, ILLEGAL_MOTION, OFFENSIVE_TOO_MANY_MEN_ON_FIELD, DEFENSIVE_TOO_MANY_MEN_ON_FIELD, INTENTIONAL_GROUNDING (plain); INELIGIBLE_DOWNFIELD_PASS (crowd); ILLEGAL_FORWARD_PASS (open) | mixed | 9 |
| LINE_HOLDING | OFFENSIVE_HOLDING, ILLEGAL_USE_OF_HANDS (both sides), CHOP_BLOCK, CLIPPING, ILLEGAL_BLOCK_ABOVE_THE_WAIST | all crowd | 5 |
| COVERAGE | DEFENSIVE_PASS_INTERFERENCE, OFFENSIVE_PASS_INTERFERENCE (open); DEFENSIVE_HOLDING, ILLEGAL_CONTACT (crowd) | mixed | 4 |
| PLAYER_SAFETY | ROUGHING_THE_PASSER, UNNECESSARY_ROUGHNESS, FACE_MASK, HORSE_COLLAR_TACKLE, UNSPORTSMANLIKE_CONDUCT, TAUNTING, TRIPPING | all open | 7 |
| KICKS | every foul on a kick, whatever its kind | the kind's own | n/a |

- That is 31 kinds: 13 plain, 10 open and 8 crowd (COMPUTED).
- Every foul on a kick is KICKS (`contracts/src/penalties.ts:58-62`). It takes no lean, and it keeps its kind's own visibility.
- **How the placements move the spreads** (COMPUTED): with grounding out of TECHNICAL, that family's lean SD would be 11.4 points, not 10.3. With all of illegal use of hands in COVERAGE, COVERAGE would be 9.0 and LINE_HOLDING 8.2, not 8.8 and 8.6 (A4).

### A2. The near-foul's sign

**Owner's word: not needed for this ADR's words. The contracts comment (E1) needs the owner's typed yes naming it.**

- **The sign.** A foul roll (`penalty_check`, §8) that misses, margin below 0, is the foul, as in ADR-091 §5.6: "the first miss is defensive offside". A near-foul is a foul roll that only just makes its target, by 10 points or less: margin 0 to 10, 11 faces of the d100. The old words, "missed by a small margin" (§5.1) and "a miss by 10 points or less" (§5.3), put near-fouls among the misses, which are the fouls. Both now say, in place, that a near-foul only just makes its target.
- **The 11th face**, margin 0, is CHOSEN. The old words counted 10 faces (margins −1 to −10). The 10 points stay §5.3's CHOSEN margin.
- **The test.** Step 1's engine test pins the sign at its edges (CHOSEN): margins −100 and −1 read as a foul, 0 and 10 as a near-foul, and 11 as clean.
- **Volatility, for step 6.** Under this sign a higher roll is a cleaner play: Discipline raises the roll, so a disciplined player fouls less. So §8's "Personal fouls add the player's Volatility" must lower the roll, not raise it, or a volatile player would foul less, against §3 ("a volatile player's late hits and taunts rise"). §8 stays as written. Step 6's amendment settles how Volatility enters the roll.
- **E1, the contracts comment.** F4's note on `phantom_flag` calls a near-foul "a `penalty_check` that only just missed (§5.3)" (`contracts/src/events.ts:173`). E1 makes it "a `penalty_check` that only just made its target (§5.3)", re-wrapping the note's next two lines and changing no other word. It is a contracts text change, so it needs contracts-guardian's review and the owner's typed yes naming it. The yes is asked with step 1's tests and numbers, and E1 lands in the step-1 PR, beside this item's two errata, so, if the yes comes in time, on main the contract and this ADR change in the same merge (the owner was told on 2026-11-01 that the fix comes for a typed yes with step 1). If the yes has not come when step 1 merges, E1 waits for step 2's PR, which needs it. It is only a comment, but `contracts/src/events.ts` is inside ADR-089's source fingerprint, which hashes comments too (`calibration/src/pocket/step1.ts:130`, `:143-172`), so like any source change it voids ADR-089's cached arms and the player-checks cache: it never lands alone. Until it lands, the note contradicts the build, and after step 1's merge §5.1 and §5.3 too; the engine test holds the sign. The edit, anchored, and its review are filed at `/mnt/project-files/design/ADR-093-step1/E1.md`.
- **E1's typed yes, 2026-11-06 19:09Z:** "Merge #62 and yes, make contracts edit E1". E1 lands in step 1's PR as its own contracts commit, word for word from `E1.md`, so on main the contract and this item's two errata change in the same merge (added 2026-11-06).

### A3. The lean, its weights, the ceiling and the floor

**Owner's word: not needed for the mapping. How a strict crew is held in goes to the owner as a confirmation, with all its costs, in step 1's note.**

§6.1 says "The lean multiplies both its seen chance and its wrong-flag chance." A product cannot stay a chance above 1. Step 1 reads the sentence this way:

```
seen chance       = min(0.99, class × M × Q4 × Q5)
wrong-flag chance = min(1, p × M × Q4 × Q5)        (p: A9; no 0.99 cap)
M                 = 1 on a kick; otherwise max(0.20, 1 + w × (L − 50) ÷ 50)
```

- **class** is §5.2's seen chance: plain 0.95 and open 0.80 (CHOSEN, confirmed in §13); crowd 2/3 (CHOSEN, ruled, Q1). **Q4** and **Q5** are the situation's factors (A7, A8).
- **L** is the crew's lean on the foul's family: 0 to 100, with 50 the league (F5).
- **The scale** (CHOSEN): L ÷ 50 is the crew's called rate of the family over the league's. That is Table 6's own measure ("each referee's offensive-holding rate as a ratio to that season's league rate"), and F5's words: "how much more or less than the league this crew calls each family of fouls".
- **The weight w** (COMPUTED from REAL Tables 1 and 2) is a kind's crew SD in Table 2 over its family's composite. The composite is the mean of the family's Table 2 SDs, weighted by their Table 1 rates. A kind with no Table 2 row takes w = 1 (CHOSEN). So the weights average 1 over the family's rates (but for their three-place rounding), and a lean L moves the family's called rate by L ÷ 50, as a chance, wherever neither the ceiling nor the floor binds. The die rolls each chance in whole hundredths (A9), so the rolled rate comes close to that but not exactly: at lean 51, coverage rolls 1.015 times what lean 50 rolls at a neutral site, and 1.023 at a home field over both defenses, against 1.02 (COMPUTED). The weights are in the table below.
- **Mean-neutral:** M is linear in L, and franchise re-centers each family's leans on 50 every season (A4). So where neither bound binds, the crews' mean M is 1 to within rounding, since the 17 leans are rounded to whole points after re-centering (A4): crews spread each foul's rate, and do not move its league rate.
- **Kicks take no lean** (M = 1): F5 gives a crew no lean on KICKS.
- **The ceiling, 0.99** (CHOSEN): even the strictest crew misses 1 plain foul in 100. It binds once M passes 1.042 on plain kinds, 1.2375 on open ones and 1.485 on crowd ones (COMPUTED: 0.99 over the class).
- **Compress** (CHOSEN): what the ceiling cuts is not moved onto wrong flags.
  - **What it keeps** (COMPUTED): each crew's seen chance below the ceiling, and every wrong-flag chance as filed. Across the league, Q2's 1 in 20 stays within about 1% of itself (5.05% of judgment flags are wrong), and the league's wrong flags within about 0.005 a game (0.388 to 0.393).
  - **What it does not keep** (COMPUTED). The league's seen chance on the kinds where the ceiling binds falls below §5.2's 95 and 80 in 100: on plain kinds from 0.933 (offensive offside and the defense's delay of game, which have no Table 2 row and so take weight 1; false starts 0.932, about 93 in 100) down to 0.734 (illegal motion, about 3 in 4); on open kinds from 0.790 (illegal forward pass, also at weight 1; face mask 0.782) down to 0.738 (offensive pass interference and taunting, about 74 in 100), while unsportsmanlike conduct, at the ceiling in 1 crew in 200, stays at 0.800. The crowd kinds stay at 0.664 to 0.667, so Q1 barely moves. And the wrong-flag chance has no ceiling, so a crew at the ceiling throws more than 1 in 20 of its flags wrong: on offensive pass interference and taunting, 5.8% at one SD above the league and 7.5% at two; on a plain kind, up to about 1.2% against 0.5% (illegal motion at two SD). The league's wrong share on the capped open kinds rises a little, to about 5.4%.
  - **What it costs** (COMPUTED). The families' called-rate spreads land at 0.74 (SNAP), 0.67 (TECHNICAL), 1.00 (LINE_HOLDING), 0.92 (COVERAGE) and 0.86 (PLAYER_SAFETY) of their one-season targets (A4). The officials miss about 0.3 more fouls a game (0.31 to 0.33). So Table 10's 3.49 mistakes a game (COMPUTED) become about 3.8, against the "about 3.5" of Q1's ruling. That is still under the league's own 4.3 to 4.5 (REPORTED, P1), a loose bound, since P1 does not split its count into missed fouls, wrong flags and other errors.
  - **The other way, "spill",** would move what the ceiling cuts onto wrong flags. It keeps every spread, but gives 0.67 wrong flags a game against the 0.39 that the ruled 1 in 20 gives (COMPUTED). That overrides Q2, so step 1 does not take it.
- **The floor, 0.20** (CHOSEN): no crew calls under a fifth of the league's rate of any kind. It binds for illegal motion in 15% of crews, illegal shift in 4.5%, and offensive pass interference and taunting in 3.7% (COMPUTED). The other floor is the lean's own range, 0 to 100: PLAYER_SAFETY's 0 and 100 sit 3.6 SD out (COMPUTED).
- **Why the mapping is the Orchestrator's:** F5 says only "how much more or less than the league", and leaves how a lean moves a chance to the engine (`contracts/src/officials.ts:4-5`, `:16-17`).
- **In plain words, for the owner:** crews differ less on plain calls and on roughing, face mask, taunting and offensive pass interference. Across the league the officials see about 93 in 100 false starts instead of 95, about 3 in 4 illegal motions, and about 74 in 100 offensive pass interference and taunting fouls instead of 80. A strict crew throws more than 1 in 20 of its flags wrong on those open calls (5.8% at one SD). The officials' mistakes go from about 3.5 to 3.8 a game, still under the league's own 4.3 to 4.5 (REPORTED, P1).

**The weights.** Rates are per 1,000 scrimmage snaps (REAL, Table 1). "Under 0.26" marks a kind absent from Table 1: under 30 flags in 116,127 snaps (COMPUTED). Crew SDs are Table 2's (REAL). w is COMPUTED, rounded to three places.

| kind | family | rate | crew SD | w |
|---|---|---|---|---|
| FALSE_START | SNAP | 16.18 | 7% | 1.037 |
| DEFENSIVE_OFFSIDE | SNAP | 5.36 | 10% | 1.481 |
| NEUTRAL_ZONE_INFRACTION | SNAP | 2.30 | 0% | 0 |
| ENCROACHMENT | SNAP | 0.87 | 0% | 0 |
| OFFENSIVE_OFFSIDE | SNAP | 0.43 | no row | 1 |
| DEFENSIVE_DELAY_OF_GAME | SNAP | under 0.26 | no row | 1 |
| DELAY_OF_GAME | TECHNICAL | 4.26 | 16% | 1.019 |
| ILLEGAL_FORMATION | TECHNICAL | 2.27 | 21% | 1.338 |
| ILLEGAL_SHIFT | TECHNICAL | 1.68 | 36% | 2.293 |
| ILLEGAL_MOTION | TECHNICAL | 0.34 | 59% | 3.759 |
| INELIGIBLE_DOWNFIELD_PASS | TECHNICAL | 2.75 | 0% | 0 |
| INTENTIONAL_GROUNDING | TECHNICAL | 1.21 | 0% | 0 |
| DEFENSIVE_TOO_MANY_MEN_ON_FIELD | TECHNICAL | 1.26 | no row | 1 |
| OFFENSIVE_TOO_MANY_MEN_ON_FIELD | TECHNICAL | 0.33 | no row | 1 |
| ILLEGAL_FORWARD_PASS | TECHNICAL | under 0.26 | no row | 1 |
| OFFENSIVE_HOLDING | LINE_HOLDING | 15.92 | 13% | 0.996 |
| ILLEGAL_USE_OF_HANDS | LINE_HOLDING | 2.17 | 17% | 1.303 |
| ILLEGAL_BLOCK_ABOVE_THE_WAIST | LINE_HOLDING | 0.60 | 0% | 0 |
| CHOP_BLOCK | LINE_HOLDING | under 0.26 | no row | 1 |
| CLIPPING | LINE_HOLDING | under 0.26 | no row | 1 |
| DEFENSIVE_PASS_INTERFERENCE | COVERAGE | 7.69 | 4% | 0.299 |
| DEFENSIVE_HOLDING | COVERAGE | 6.52 | 15% | 1.120 |
| ILLEGAL_CONTACT | COVERAGE | 2.62 | 20% | 1.493 |
| OFFENSIVE_PASS_INTERFERENCE | COVERAGE | 2.16 | 34% | 2.538 |
| UNNECESSARY_ROUGHNESS | PLAYER_SAFETY | 4.12 | 22% | 1.033 |
| ROUGHING_THE_PASSER | PLAYER_SAFETY | 2.58 | 24% | 1.127 |
| FACE_MASK | PLAYER_SAFETY | 2.08 | 19% | 0.892 |
| UNSPORTSMANLIKE_CONDUCT | PLAYER_SAFETY | 0.76 | 7% | 0.329 |
| TAUNTING | PLAYER_SAFETY | 0.46 | 34% | 1.596 |
| HORSE_COLLAR_TACKLE | PLAYER_SAFETY | 0.33 | no row | 1 |
| TRIPPING | PLAYER_SAFETY | under 0.26 | no row | 1 |

The composites (COMPUTED): SNAP 0.0675, TECHNICAL 0.1570, LINE_HOLDING 0.1305, COVERAGE 0.1340 and PLAYER_SAFETY 0.2130. For COVERAGE, for example, the rates times the weights sum to 7.69 × 0.299 + 6.52 × 1.120 + 2.62 × 1.493 + 2.16 × 2.538 = 18.995, against the rates' own sum, 18.99 (COMPUTED).

### A4. The spreads, and how the crews are made

**Owner's word: not needed.** §6.1 says each spread is "measured for each family at its step".

| family | composite | one season's crew SD, as a share of the league's rate | lean SD, in points | the 17 crews' range, about |
|---|---|---|---|---|
| SNAP | 0.0675 | 8.9% | 4.4 | leans 42 to 58 |
| TECHNICAL | 0.1570 | 20.6% | 10.3 | 31 to 69 |
| LINE_HOLDING | 0.1305 | 17.2% | 8.6 | 35 to 65 |
| COVERAGE | 0.1340 | 17.6% | 8.8 | 34 to 66 |
| PLAYER_SAFETY | 0.2130 | 28.0% | 14.0 | 25 to 75 |

Every figure in the table is COMPUTED, from REAL Tables 1, 2 and 6.

- **How:** lean SD = 50 × about 1.3 × the family's composite (A3). The factor, 1.3146, is Table 6's mean single-season holding SD over Table 2's pooled 13%: 17.09 ÷ 13, where 17.09% is the mean of Table 6's 11 seasonal SDs, 188 ÷ 11 (COMPUTED from REAL). So offensive holding alone spreads 17.09% of the league's rate in one season, about 8.5 points of lean. Its family's composite, with illegal use of hands in, gives 8.6 (both COMPUTED). Taking the mean of the seasons' SDs is CHOSEN; pooling their variances would give 1.41 (COMPUTED).
- **Provisional, good to whole points** (COMPUTED). The page's rounding alone moves the factor from 1.23 to 1.41, and the unrounded data give 1.34. With Table 2's every-phase counts set against Table 6's scrimmage-only ones, it lies between about 1.09 and 1.31. So the factor is about 1.3, anywhere from 1.1 to 1.4. Step 1 builds from the rounded page.
- **One factor for all** (CHOSEN): holding's factor serves every family, until each family's step measures its own single-season spread over 2015 to 2025, as Table 6 did for holding.
- **Making the 17** (the NFL's 17 crews, REAL; CHOSEN, ruled, Q3). Their ids are `crew-01` to `crew-17` (CHOSEN). Each referee gets a made-up name, drawn from franchise's coach name lists: 113 first names by 134 last names, 15,142 pairs (COMPUTED). Each lean is drawn from a normal curve around 50 at its family's SD, then settled (CHOSEN). A referee may share a full name with someone on the league's staff, a coach or a team president, since the referees' names are drawn without looking at the staff: it happens in 60 of 100 generated leagues (57 with a coach), and in world-1 crew-02's referee has the name of T01's special teams coordinator (COMPUTED). Step 9 keeps the two apart both ways, the referees' names clear of every staff name and new coaches' names clear of the referees' (plan-v2, risk 17). That re-records `officials.crews.test.ts`'s referee check, and in a run with crews it changes the later draws of any new coach whose first drawn name is a referee's. A save keeps its referees, a shared name included.
- **Settling** (CHOSEN), for each family each season: re-center the 17 leans so their mean is exactly 50, clamp them to 0 to 100, and round them to whole points. Without re-centering, the crews' mean would drift by an SD of about 2.1 points a season (8.6 ÷ √17), about 4% of the league's holding rate (COMPUTED).
- **Drawn at the target:** after re-centering, the 17 leans' own SD comes out at about 0.955 of the target (COMPUTED). Step 1's note to the owner prints both.
- **Measured at 1b, news and not a change** (added 2026-11-07, step 1b): on each family's total calls, measured as a copy is, the real crews' single-season spread over 2015 to 2025 is about 15%, 11%, 14%, 9% and 6% (line holding, coverage, player safety, technical, snap; the mean of the 11 seasons' spreads, as this item takes Table 6's mean; their root mean square (RMS: the square root of the mean of the seasons' squared spreads) is 15%, 12%, 15%, 12% and 8%; COMPUTED from REAL data, nflverse's play-by-play and schedules of 2015 to 2025, by the step-1b plan's numbers reader, `/mnt/project-files/design/ADR-093-step1b/numbers/longspread.json`), under this item's 17.2%, 17.6%, 28.0%, 20.6% and 8.9%. Over the copies' own window, 2023 to 2025, the snap's is about level with this item's (9.1% against 8.9%; A11). This item's spreads give each kind its own Table 2 spread under one family lean, so they run above a family's total wherever real crews' kinds do not move together. They stay as written until each family's step measures its own (§6.1); A10's reading takes this in. Each winter's carry draws every league's crews toward these spreads, the stand-in league's copies included (A11).

### A5. The carry, and question 1

**Owner's word: needed. Question 1 was asked of the owner on 2026-11-01, with 0.68 recommended against 0.35 as written. The build uses 0.35 until the owner answers.**

- **As written:** a crew's lean carries into the next season at 0.35 (§6.1; Q3's ruling, "carries it into the next season at 0.35"; confirmed in §13). It is Table 6's correlation of each referee's holding ratio from one season to the next, over 158 pairs of back-to-back referee-seasons, 2015 to 2025 (REAL; CHOSEN, ruled, Q3).
- **The draw:** when a new season starts, each lean is drawn again toward its last, L' = 50 + ρ × (L − 50) + √(1 − ρ²) × σ × z, then settled (A4). ρ is the carry, one dial (franchise's `CREW_RULES.carry`); σ is the family's lean SD (A4); z is a fresh normal draw. At ρ = 0.35, √(1 − ρ²) is 0.9367 (COMPUTED). Ids and referees stay. Last season's assignments are dropped, since the four-week rule starts again (A6).
- **When:** at the start of the next season's run, from last season's crews, never at the end of a season. A save made at a season's end holds that season's crews as they stand (F7).
- **The finding: 0.35 shows as about 0.18 in the game's own records** (COMPUTED). Table 6 correlates observed flag ratios, and luck is part of each season's ratio. A crew works about 16 games a season (272 ÷ 17), with 2.268 scrimmage holds a game (15.92 per 1,000 snaps × 142.49 snaps a game, where 142.49 is 116,127 ÷ 815, REAL counts) and a single-season spread of 17.09% (A4). So one season's flags show only part of a crew's habit: their reliability is R = 0.1709² ÷ (0.1709² + 1 ÷ (2.268 × 16)) = 0.515. A habit carried at 0.35 shows about 0.35 × 0.515 = 0.18 (simulated: 0.178). For the records to show the real 0.35, the habit must carry at about 0.35 ÷ 0.515 = 0.68 (simulated: 0.348).
- **The luck in one run** (COMPUTED, by simulation). Over one run of 170 pairs at 0.35, the 5th to 95th percentile is 0.04 to 0.31. About 99 runs in 100 come out below the real 0.35 (about half do at 0.68). Only about 37 in 100 land inside the real number's own 95% range, 0.21 to 0.48, against about 90 in 100 at 0.68.
- **The real 0.35 is measured with luck too** (COMPUTED). Its 95% range is 0.21 to 0.48 (Fisher, 158 pairs), so the habit that matches it is about 0.68, plausibly 0.40 to 0.93. Table 6's own luck shares put the real crews' habit at 0.65 to 0.74, which supports 0.68 without the game. If the habit were 0.35, the real records would show 0.35 or more only about 1 time in 70 to 150.
- **Question 1, asked on 2026-11-01: how steady should a crew's habits be from one season to the next?** The choices are 0.68, so the game's crews look as steady as real ones, or 0.35 as written, so they change more from year to year than real crews do. **0.68 is recommended.** It comes from the same real data, read before any game is played. And 0.35 is the measured link on flags, so it is a floor for the habit, not an estimate of it.
- **What 0.68 changes on paper:** it sets the habit from the real link through a model of the luck. So it would replace the 0.35 that Q3's ruling and §13's confirmation state, and §6.1's "it does not fit to it". Step 4's check would then test only that model of the luck.
- **How the readers split:** the numbers reader recommends 0.68, and the franchise reader 0.62 (COMPUTED, from a count that included holds on kicks); the calibration reader would keep 0.35, show the 0.18 it gives, and bring step 4's measured number.
- **Until the owner answers,** the build uses 0.35. Nothing changes on the field this season either way. A later change breaks no save: saves keep the crews, and the carry is used only when a new season starts. The answer comes as a new dated §15 entry, with a line here. A franchise test holds the dial at 0.35 and each family's lean SD at A4's numbers (`officials.crews.test.ts`, "holds the carry at 0.35 until the owner answers question 1"), so the dial changes only with that answer, in the same change as its §15 entry.
- **What step 1 shows the owner** (its note): the crews' lean-to-lean correlation, about the dial, and the predicted observed one, the dial × 0.515 by construction, beside the real 0.35. The observed holding correlation waits for step 4's crew report, measured as Table 6 was.
- **Question 1, answered 2026-11-06 19:08Z (card): 0.68** (§15). `CREW_RULES.carry` is 0.68 (COMPUTED; CHOSEN, ruled, question 1), so √(1 − ρ²) is 0.7332 (COMPUTED). The franchise test now holds the dial at 0.68 and each family's lean SD at A4's numbers (`officials.crews.test.ts`, "holds the carry at 0.68, the owner's answer to question 1, and each family's lean SD at §16 A4's numbers"). At the dial, the crews' lean-to-lean correlation comes out at 0.669 to 0.681 across the five families (COMPUTED: 20 seeds, 50 carries each, 17 crews), and the predicted observed holding correlation is 0.68 × 0.515 ≈ 0.35 (COMPUTED), beside the real 0.35 (REAL, Table 6). No game, golden digest, season-path pin or pinned draw moves: no season game is played with a crew until step 2 (A12), world-1's first crews are a fresh draw, and the tests of later seasons compare against a live carry (added 2026-11-06).

### A6. The weekly assignment

**Owner's word: not needed.** These are the details of Q3's ruled rule.

- **The rule** (CHOSEN, ruled, Q3): "no crew working the same team twice in four weeks". Step 1 reads it this way: a crew that works a game with team t in week o may not work t in weeks o + 1 to o + 3. Calendar weeks count, byes included.
- **The weeks** (CHOSEN): the 18 regular-season weeks, then playoff week w as week 18 + w. So the rule runs from week 18 into the wild-card round.
- **One game a week per crew** (CHOSEN).
- **Each season starts clean** (CHOSEN): the save keeps only this season's assignments (F7).
- **It can always be met** (COMPUTED, by Hall's theorem). Each game has at most 6 barred crews, so at least 11 are free. Each crew is barred from at most 6 games. So any 1 to 11 games have at least 11 crews between them, and any 7 to 16 games have all 17. The same count still proves "twice in five weeks". For "twice in six" it leaves sets of 8 to 10 games uncovered, so a six-week rule is not guaranteed.
- **The draw** (CHOSEN). Each week, the crews with the fewest games so far come first, with ties broken by a seeded key. Then the week's games are matched to the crews in that order, by augmenting paths. A first-come pick in the same order fails in 3.9% of weeks; the matching never fails (COMPUTED, by simulation). Each week draws exactly 17 numbers, whatever the matching does, so the draw never depends on its own outcome (Iron Rule 4).
- **The workload** (COMPUTED). 272 regular-season games make 16 a crew. Every week 1 to 3 crews sit (franchise's schedule has 16 games in weeks 1 to 4 and 15 to 18, 14 in weeks 5 to 10, and 15 in weeks 11 to 14): 34 crew-weeks a season, 2 a crew. The real league's referees work 15.98 games a season (COMPUTED: 815 games ÷ 3 seasons ÷ 17 referees, REAL).
- **When a week is drawn** (CHOSEN): on its first game day, before its games. It is also drawn when a run stops inside the week, so a save made in game week holds that week's crews (F7: the coaches see their crew in game week). So on days 1 to 6 a straight run has not drawn the week yet, while a run stopped there has. Nothing reads a crew on those days at step 1. When the first reader on those days comes (step 9's game week, and ADR-076's weekly game plan), a week is drawn the first time anything in it asks, with plan-v2 risk 25's test: a straight run and a run stopped at week 9's day 4 have drawn the same crews by day 4.
- **The playoffs** (CHOSEN): worked by the season's crews, drawn like any other week. Picking the best-graded crews for the playoffs stays in §12's later list.
- **The referees** (CHOSEN): the same 17 every season. Referee careers, a referee retiring and a new one arriving, join §12's later list.
- **No event for the assignments.** The franchise events have none, and none is petitioned. The assignments are state, like the schedule. A game's crew enters the stream as `GAME_START.crew` (F5) from step 2. If step 9's screens or the narrative want an event, that is a petition then.

### A7. Q4's reading: let them play

**Owner's word: not needed. Shown to the owner in step 1's note, not asked.**

- **Both chances.** Q4's ruling names the seen chance. Step 1 reads it with Q2: the same factor also multiplies the wrong-flag chance, so 1 in 20 of the flags stays wrong in every situation. On the seen chance alone, a factor of 0.85 would raise the late wrong share from 5% to 5.8% (COMPUTED).
- **The factor.** For an open or crowd kind on a scrimmage snap, Q4 is the period's factor (the arc's for quarters 1 to 4, overtime's after them), times the late-and-close factor when the game is late and close, times the playoff factor in a playoff game. Each family has its own set of these factors (CHOSEN), since the real arcs differ by family (Table 4).
- **"Late"** is the fourth period or later, overtime included. **"Close"** is a score within 8 points (CHOSEN, ruled, Q4; Table 4's own definition).
- **The playoffs** are the wild-card, divisional, conference and championship games. A preseason game counts as a regular one (CHOSEN); none is scheduled today.
- **Judgment calls only** (ruled): plain kinds take no factor.
- **Kick fouls take no factor at step 1** (CHOSEN). A kick foul keeps its kind's own visibility, so holding or a block in the back on a return is a crowd call. Step 8, the kicks step, decides whether crowd and open fouls on kicks take Q4.
- **Every factor is 1 at step 1** (CHOSEN), until each family's step measures the officials' share "after the players' own share is in" (§15, Q4).
- **The real targets the family steps will meet** (REAL, Table 4, except the two marked COMPUTED): late and close against the rest, all flags 0.840, offensive holding 0.818 and false starts 0.781 (these two COMPUTED from REAL Table 4: 13.43 ÷ 16.41 and 13.11 ÷ 16.78; `notes/notes-numbers.md` §4.1); in the playoffs, all flags 0.829; offensive holding by quarter, 14.60, 15.73, 19.92 and 14.16 per 1,000 snaps.
- **A finding, brought to the owner as news on the ruling, not as a question** (COMPUTED from REAL Table 4). Late in close games flags fall, plain fouls included: false starts and offsides fall to about 77 in 100 of their usual rate. Holding, pass interference and defensive holding fall less than that, not more, and defensive holding hardly at all: to about 82, 91 and 100 in 100, which is 1.07, 1.19 and 1.30 times the plain fouls' level. So a family's fitted late-and-close factor may come out at 1 or above. That family's step shows the owner the number and never forces it below 1 (D1: "never fitted away").

### A8. Q5's reading: home and road

**Owner's word: not needed. Shown to the owner in step 1's note, not asked.**

- **The split** (CHOSEN). On defensive pass interference, defensive holding and illegal contact, the home defense's chances are multiplied by 2 ÷ (1 + r), and the road defense's by 2r ÷ (1 + r). Every other kind takes 1, and so does every kind at a neutral site. r is 1.14, 1.11 and 1.29 (REAL, Table 7, the seasons with crowds).
- **The factors** (COMPUTED): home 0.9346 and road 1.0654 on pass interference; 0.9479 and 1.0521 on defensive holding; 0.8734 and 1.1266 on illegal contact.
- **Why the split.** It keeps Q1, §5.2 and §5.4 as league figures: the league's average seen chance stays at §5.2's 80 in 100 and Q1's 2 in 3. With no crew, the road defense's seen chance is exactly r times the home defense's. The die rolls a chance in whole hundredths (A9): 0.75 and 0.85 on pass interference, 0.63 and 0.70 on defensive holding, 0.58 and 0.75 on illegal contact (COMPUTED). So with no crew the road defense is flagged 1.133, 1.111 and 1.293 times as often (COMPUTED), each inside the ruled 1.1 to 1.3. With crews the rounding averages out, and the ratio stays inside the ruled range: 1.14, 1.11 and about 1.27, since 11.3% of road crews' illegal-contact chances reach the ceiling (COMPUTED). The one-sided reading (home 1, road r) would raise the league's rates by 7.0%, 5.5% and 14.5% (COMPUTED). The split does put the home defense below the class chances, which the ruling's words do not say: at lean 50, 0.748, 0.632 and 0.582 (COMPUTED).
- **Both chances** take it, as ruled: the "seen chance and wrong-flag chance are raised".
- **The neutral site** is only the championship game.
- **Kicks** (CHOSEN): a foul on a kick takes no home-and-road factor at step 1, as it takes no lean (A3) and no let-them-play (A7), so it is seen at its kind's own visibility. Table 7 counts scrimmage snaps only. Step 8, the kicks step, decides.
- **When it is fitted.** Nothing calls these factors until the coverage step, step 5, which fits them (§15, Q5). Table 7's values are counts: flags on the road team over flags on the home team. The road defense faces 1.0121 times the home defense's snaps (0.503 ÷ 0.497, from the home offense's 50.3% of run and pass plays, REAL; COMPUTED). So step 5 compares counts using the game's own snap split, or fits rate ratios: 1.126, 1.097 and 1.275 (COMPUTED). Defensive holding's 1.097 sits just under the ruled 1.1. Step 1's factors stay as above.
- **Offensive holding's reverse gap,** 0.92 (REAL, Table 7), stays a watched check, not a factor (§15, Q5).
- **In plain words:** the home defense is flagged a little less and the road defense a little more, so the league's totals stay as ruled.

### A9. The wrong-flag chance

**Owner's word: not needed now. Step 2 brings the plain wrong-flag miss below with its numbers.**

- **Its shape, per kind** (CHOSEN): p = share ÷ (1 − share) × s × T/N. The share is 1/20 for judgment calls and 1/200 for plain ones (CHOSEN, ruled, Q2). s is the kind's class seen chance (A3). T/N is fouls per near-foul at the kind's moment. A crew's lean and the situation then multiply p, capped only at 1 (A3).
- **Per kind, not per family:** the class differs within a family (TECHNICAL holds plain, crowd and open kinds), and T/N differs by moment.
- **None is filed at step 1.** With no filed chance, judging a near-foul of any kind is refused. That is safe: nothing produces a near-foul yet.
- **Each family's step** measures T/N in its F arm (§9: every foul flagged, no wrong flags), files p rounded to the die, and reports the rolled share against the filed one (CHOSEN band: judgment 4% to 6%, plain 0.25% to 1%). A plain share of 0 is the miss named below, brought to the owner with its numbers, whatever the band says.
- **The officials' die** (CHOSEN; the Orchestrator's reading of §5.1 and F4). It is drawn on every foul and every near-foul, whatever the chance, and never on a clean foul roll. A chance c becomes a d100 target, min(101, round(101 − 100c)), made when the die reaches it, so the chance made is (101 − target) ÷ 100 (COMPUTED). So 0.95 gives 6, 0.80 gives 21, 2/3 gives 34 (made 67 in 100), the 0.99 ceiling gives 2, and any chance under 0.005 gives 101, which no die reaches. At target 101 the die is still drawn: the CHECK is written and fails, and no flag is thrown. A chance above 0.995, which would give target 1 and a certain flag, is refused (CHOSEN); the dials never reach it.
- **Why every foul and near-foul is rolled.** §5.1 has the officials roll once on each foul and once on each near-foul. F4's note reads "each rolled once and only when it matters (ADR-005): a snap with no foul and no near-foul rolls neither" (`contracts/src/events.ts:164-165`). So "only when it matters" is the rule of no foul and no near-foul, not "only when the outcome is uncertain". And a flag must have its officials' roll behind it: a made `official_sees` is the flag, and a wrong flag's `phantom_flag` CHECK is what says it was wrong (`contracts/src/events.ts:172-175`).
- **The cost is stream volume.** Every near-foul writes a `phantom_flag` CHECK, and a plain near-foul's fails every time while its chance rounds to 0. If the volume matters to the viewer or to calibration, the step that meets it brings it with its numbers.
- **In plain words, for the owner** (step 1's note): "Every foul and every near-foul gets its officials' roll, as ADR-093 §5.1 and the approved contracts note say. No roll is skipped because its outcome is certain."
- **Named for step 2, decided then.** A d100 cannot roll a plain foul's tenth of the share at any plain moment with T/N under 1.05, since p stays under 0.005 there (COMPUTED). Step 2's stem offside has T/N = 0.04 ÷ 0.11 = 0.36 (COMPUTED: ADR-091 §5.6's average lineman crosses 4 times in 100, CHOSEN there, against A2's 11 near-foul faces). So its p is 0.0017, target 101: never (COMPUTED). At the ruled 1 in 200 that loses about one wrong flag in 1,000 games for that foul, and about 0.026 a game across every plain foul once all are built, one every 38 games (COMPUTED: 5.23 plain flags a game, REAL, Table 10, × 1/200). Step 2 brings it with its numbers, and the recommendation will be to accept none.

### A11. The stand-in league's crews

**Owner's word: Q3's ruling builds them at step 1; they come in step 1b, a second small PR right after step 1's, so between the two merges both leagues have drawn crews. The owner was told so on 2026-11-01, in the step-1 plan posted to the thread ("What I am doing unless you say otherwise"): it is not asked, and it stands unless the owner says otherwise. How widely they spread is asked at step 1b.**

- **Ruled:** the stand-in league's crews are copies of the real crews under made-up referee names, "the stand-ins for the real crews the way the players and coaches are" (§6.2), built at step 1 (§15, Q3).
- **When: step 1b, a small separate PR right after step 1, not step 1's own PR.** Step 1 itself gives both leagues drawn crews at the real spread (A4). Step 1b puts in the copies before any game uses a crew. The build plan asked this as its question 2. It was stated instead, in the step-1 plan posted to the owner on 2026-11-01, and it stands unless the owner says otherwise. It can be stated because the wait costs the stand-in league nothing: no game reads a crew before step 2 (below). Why step 1b:
  - The copies need step 1's decisions first: A1's placements and A3's scale set their numbers.
  - They use step 1's carried and standing crews, and add no seam of their own.
  - Nothing reads a lean before step 2. Step 2's foul, defensive offside, is in the snap family, where crews hardly differ (10%, REAL, Table 2). A copy first matters at step 4, line holding.
  - The stand-in league cannot be saved today, so step 1's save could not hold its crews either way.
  - This season's referee records cover 65 of the 108 games played so far (REAL: the referee column of nflverse's 2026 schedules file, `schedules/games.csv`, read on 2026-11-01, is filled for 65 of the 108 games played through 29 October; the plan's stand-in notes, `notes/notes-standin.md` §2.2).
  - Step 1 stays small while ADR-089's step 4 is in flight. Step 1b changes attributes and calibration code, so like any code change it voids ADR-089's cached arms, and it takes the same merge window as step 1.
- **How widely: asked at step 1b, with its numbers.** A copy built from a season and a half of records keeps only the part of a crew's habit those records can show: about a third of it: 0.36 if real crews' habits carry at 0.68, and 0.18 to 0.57 if they carry at 0.40 to 0.93 (COMPUTED). So in their first season the copies differ by about 13% of the league's holding rate (12.3% to 13.9%, COMPUTED), against 17% for the real crews in one season (COMPUTED from REAL Table 6, A4) and Q3's "sized to the real spread". After one winter's carry the spread comes back to about 16.7% at a carry of 0.35, or 15.4% at 0.68 (COMPUTED). The choices will be to keep the copies as measured, each one as close to its real crew as the records allow, or to widen them to 17%. Keeping them as measured is recommended: the gap closes after one winter.
- **Who builds step 1b:** attributes-pipeline for the importer, the one module real data touch (Iron Rule 7); calibration for the reader; and the Orchestrator for a CLAUDE.md line and the owner's word.
- **Step 1b, built 2026-11-07** (cites main at `0156b7f`, which differs from step 1's `747cae3` by PRs #57, #65 to #72, #74 to #77 and #79 to #87, sharing no file with step 1b but `CLAUDE.md`, `docs/GUIDE.md`, `docs/decisions/CALIBRATION-BACKLOG.md`, `packages/calibration/src/season/main.ts`, `packages/calibration/src/season/realSeason.ts` and, with #86, `packages/attributes/package.json`, `packages/attributes/src/importer/real/rows.ts`, `packages/attributes/test/standinDevelopment.test.ts` and `packages/attributes/leagues/standin-2026-10-23.json`; step 1b's build plan, which these step-1b lines call the plan, is `/mnt/project-files/design/ADR-093-step1b/plan-v2.md`, with its readers' notes, numbers and scripts beside it). The importer (`packages/attributes/src/importer/real/officials.ts`, with `officialsSnapshot.ts`; the command `standin-officials`, `officialsMain.ts`) counts, for each of the 17 referees who worked a refereed 2026 game, that referee's crew's flags of each family in 2025 and 2026 so far (the window CHOSEN), against what the league's rate in each season gives in its games (REAL counts). It counts on scrimmage downs (CHOSEN): nflverse's pass, run, kneel, spike and no-play rows, so fouls before a punt or field-goal snap and kicks a flag wiped out count too, about 3% of the families' flags (COMPUTED). It pulls each ratio toward the league as far as chance alone could explain in the crew's own games: the ratio keeps B = τ² ÷ (τ² + 1 ÷ E) of its distance from the league, where τ is the root mean square of the family's three one-season spreads beyond chance, 2023 to 2025 (the table's RMS below), each found by Table 2's method but per scrimmage snap, among that season's referees with 10 games or more (the window and the 10 CHOSEN, τ COMPUTED), and E is the flags the league's rate gives in the crew's games. B, the share of its distance from the league that a ratio keeps, averaged over the 17, is the table's mean pull below (on line holding 0.54, so a ratio moves on average 0.46 of the way to the league). It turns the pulled ratio into a lean by A3's scale, 50 × the ratio, and settles each family as A4 settles drawn crews. Families follow A1, by the kind a flag's words name as the book spells it, and flags with no kind count in no family (CHOSEN; about 2% of the flags, COMPUTED, low blocks among them, which §6.1's line-holding row names but `FoulKind` does not have: counted as holding, they would move 4 copies' holding leans by 1 or 2 points, COMPUTED). The one 2026 flag on the defense written as plain "Delay of Game", not "Defensive Delay of Game", counts in TECHNICAL as written, and read as the defense's delay of game (SNAP) it would move one lean by a point (COMPUTED). Each game's referee is the schedules' (CHOSEN; nflverse renumbered its officials' ids in 2023, REAL, so the step-1 plan's id join does not hold). Each referee gets a made-up name and an id, `o:01` to `o:17` (CHOSEN), kept across refreshes by a sealed table in the gitignored cache. That table and the players' `sealed.json` are kept outside the repo in `/mnt/project-files/standin/`, and the officials snapshot the block was made from is kept there too until 1b merges (raw downloads stay in the importer's gitignored cache, ADR-088 Q7); no real name or id is committed. Neither the made-up name nor the id hides the real crew: as each stand-in player's name is drawn on a seed of that player's nflverse id, each referee's name is drawn on a seed of the real referee's name as the schedules spell it (case, punctuation and suffixes ignored), and new ids are numbered in the order of a hash of it, so anyone with the code and nflverse's public records can re-derive every copy's name and id (on the kept snapshot all 17 re-derive with neither sealed table, COMPUTED at 1b's review); a copy's games and leans would also match it to its real crew for anyone who redoes the count. What holds is `docs/design/attributes.md` §5 for what 1b adds: no real name outside `importer/real/` (it commits none at all, and no made-up referee shares a full name with anyone in the snapshot, COMPUTED), and the one stored link from a copy to its real referee, the referees' sealed table, kept outside the repo. Calibration's committed fixtures already name real referees, 15 of these 17 (COMPUTED, counts only, from the 2023 and 2025 rows of `packages/calibration/test/fixtures/nflverse/games_sample.csv`): the standing exception below. The block, `officiating` (version `standin-officials/1`), sits in `leagues/standin-2026-10-23.json` between `picksSource` and `startingDevelopment`. `import-real` writes it too, when the newest cached officials snapshot is of its season, and gives no new stand-in a sealed referee's name; it was not run at 1b. Calibration reads the block as part of the file (no import; ADR-079 R1 unchanged), hands it to `runSeason` as crews standing in a 2026 run (`STANDING`) and as crews carried one winter, at A5's 0.68, in a 2027 run (`CARRY`), and refuses any other season (CHOSEN). 2027 is the default with growth and injuries off; with either on, a stand-in run plays the file's own 2026 and refuses any other (ADR-087 §2.5 step 1). No game reads a crew until step 2 (A12), so no pin moves (added 2026-11-07, step 1b).
- **The copies' numbers** (COMPUTED from REAL counts: the importer's run on nflverse's files of 2026-11-07; the plan's two separate ports on the files of 2026-11-06 gave the same figures, the schedules having changed between the two days only in columns the importer does not read, and a third port, written from the plan alone for 1b's review, matched the committed block exactly) (added 2026-11-07, step 1b):

  | family | spread beyond chance, 2023 / 2024 / 2025 (RMS) | mean pull | the copies' spread, points (share of the league's rate) | the copies' range | 17 real crews in one season, measured the copies' way | widened: factor, spread |
  |---|---|---|---|---|---|---|
  | LINE_HOLDING | 10.9 / 20.1 / 12.5% (15.1%) | 0.54 | 5.30 (10.6%) | 43 to 63 | 14.4% | 1.44, 14.7% |
  | COVERAGE | 16.5 / 12.0 / 7.1% (12.5%) | 0.48 | 3.14 (6.3%) | 46 to 55 | 12.0% | 2.02, 12.4% |
  | PLAYER_SAFETY | 20.9 / 19.8 / 19.9% (20.2%) | 0.56 | 6.23 (12.5%) | 40 to 63 | 19.3% | 1.59, 20.3% |
  | TECHNICAL | 5.7 / 17.3 / 0.0% (10.5%) | 0.34 | 2.59 (5.2%) | 46 to 54 | 10.1% | 2.00, 10.7% |
  | SNAP | 7.0 / 9.0 / 10.9% (9.1%) | 0.39 | 3.07 (6.1%) | 44 to 54 | 8.8% | 1.51, 9.2% |

  "17 real crews" are 17 crews drawn at the family's spread beyond chance and settled as A4 settles: they realize about 0.956 of it (COMPUTED). Each copy rests on 18 to 21 games (2025: 14 to 17; 2026: 3 to 5), since nflverse's schedules name a referee for 65 of 2026's 122 games played (all 64 of weeks 1 to 4 and one of week 5; REAL). The copied line-holding spread, about 10.6%, is under this item's "about 13%", because the line-holding family's own spread beyond chance is about 15%, not offensive holding's 17% alone, and so the mean pull is about 0.54, not the 0.60 to 0.63 that a spread of 17% to 18% gives on the same games (COMPUTED, step 1's `/mnt/project-files/design/ADR-093-step1/notes/notes-standin.md` §3.3). With today's spread, a copy explains about 0.34 of a crew's true habit (a share of its variance, not the 0.54 pull) if real crews' habits carry at 0.68: this item's "about a third" (COMPUTED).
- **"The gap closes after one winter", read at the ruled carry** (added 2026-11-07, step 1b): it was worked from a 13% copy toward 17% (16.7% after one winter at a carry of 0.35, 15.4% at 0.68). At 0.68, with the copies as measured, the line-holding spread is about 14.0% after one winter and 15.4% after two (realized, COMPUTED), against the real crews' 14.4% on the same basis: the gap closes after about one winter, as this item says. Each winter's carry draws every league's crews toward A4's spreads, whichever option is chosen, so after one winter the coverage, player safety and technical copies already spread more than real crews do (A4's news line).
- **"A copy first matters at step 4", read at 1b** (added 2026-11-07, step 1b): step 2's defensive offside is a snap call with weight 1.481 (A3), so the copies' snap leans already move it a little: the loosest copy calls about 18% fewer than a crew at the league's lean as measured (24% widened), and the strictest about 4% more either way, at the 0.99 ceiling (COMPUTED). Each later step adds its family's calls (steps 3 to 7).
- **Caches** (added 2026-11-07, step 1b): like any code change, 1b voids ADR-089's cached arms (main's were already void) and changes the player-checks keys and career-check's build, which also hashes the league file's sha256. 1b moves no row: for the same seed, the season command's saved seasons, cap-check's and draft-check's years, player-checks' seasons and career-check's rows are the same before and after it (checked at 1b's review against main `87681e2`, and for the season command again on the branch rebased onto main `760b8f6`, against that main, and on the branch with main `a936f0a` merged in, against `a936f0a`, and with main `0156b7f` merged in, against `0156b7f`). So 1b merges when neither the pocket fix nor ADR-087's 20-season check has a run in play.
- **The copies' spread, asked 2026-11-07** (card: "Should the stand-in league's copied crews stay as measured, or be widened?"; recommended: keep them as measured; a page set out both options and their numbers; widened meant each family's own spread beyond chance over 2023 to 2025, about 15% on line holding, not the 17% that this item's "How widely" line names, which is offensive holding's alone). **Answered 2026-11-08 01:18Z (in the thread, in words): keep them as measured** (§15). The block records the answer (`method.spread`), and both commands write it (`STANDIN_SPREAD`) (added 2026-11-07, step 1b).
- **Not done at 1b, calibration's real names** (added 2026-11-07, step 1b): calibration's nflverse readers and its committed fixtures hold real names of players, coaches and referees (`packages/calibration/src/ingest/sources/schedules.ts`, `weeklyRosters.ts`, `depthCharts.ts`, `injuries.ts`, `ngs.ts` and `snapCounts.ts`, with the availability join's name fallback in `src/ingest/availability.ts`, and the injury rates' rows in `src/injuries/rows.ts`; 12 of the 13 CSV samples in `packages/calibration/test/fixtures/nflverse/`, COMPUTED from their headers). That is a standing exception to `docs/design/attributes.md` §5 ("`importer/real/` is the only module containing real names"), which needs its own ruling (backlog entry 180). Step 1b builds only from `importer/real/` and adds no real name anywhere else.
- **For later steps** (added 2026-11-07, step 1b): step 4's crew report on the stand-in league sets its first-season spread beside the copies' own, or it reads low by design. Step 5, if it moves the defense's illegal use of hands to COVERAGE, needs more than an edit to `KIND_FAMILY` (attributes' copy of A1's table, in `officials.ts`), which places a flag by its kind alone, for both sides: the importer reads no play's offense or defense, so it must also read each play's defense (nflverse's `defteam`, a new play-by-play column in `rows.ts` and Family H) and match it to the flag's team. Step 5 then edits the tests and re-makes the block from a kept folder, with the new rule in the block's `method`, which `standinOfficialsFile.test.ts` checks against the code's. A family's own step, when it re-measures that family's spread, decides whether a flag written twice in one play's text counts once (72 in four seasons, at most 2% of a family, COMPUTED; 1b counts it twice, as this ADR's real-numbers scripts do). Step 9 keeps the stand-in league's fixed referee names clear of the coaches from the coaches' side. A refresh of the copies (once nflverse fills 2026's missing referees, or at the season's end) is one `standin-officials -- --fetch` run, with both sealed tables first copied from `/mnt/project-files/standin/` into the importer's cache (`data-cache/real/`), so that each copy keeps its id and name and the taken set stays whole (without them every referee is minted afresh, and a changed set of referees would renumber the copies while the test's ids still pass), and the referees' table copied back after if it changed; and its own small data PR. No test can show that a referee is not a real official, so that PR re-runs by hand step 1b's two leak checks, kept outside the repo with how to run them (`/mnt/project-files/design/ADR-093-step1b/scripts/leak-check/`, counts only), and each must give 0: every full name in the snapshot (the officials table, the schedules' referees and coaches, and the players list), searched as a whole name with case ignored, in the PR's diff, the block and the command's printout; every shortened name or name variant in its added lines; full, shortened and variant names in its commit messages; and no referee equal to any of them by `nameKey` (case, punctuation and suffixes ignored). It edits `standinOfficialsFile.test.ts` only if a referee is minted, since the test expects the ids `o:01` to `o:17` (it checks the block's shape, method and recorded numbers and pins the file without the block, not the leans); and it changes the stand-in player-checks key and career-check's build, never ADR-089's fingerprint. If the refreshed schedules name other than 17 referees with a 2026 game, the run stops with counts only (CHOSEN), and the rule for a fill-in comes to the owner with its numbers.

### A12. The build choices

**Owner's word: not needed.** The contracts record left these to the build: "A build choice, brought with step 1's numbers" (final.md, §10 item 3).

- **Crews made, assigned and saved, and handed to each game's resolver, but no season game is played with one until step 2.** Franchise's `runSeason` hands each game's crew to its resolver in a `GameContext`. Neither of calibration's resolvers (`realSimResolver` and `peopleResolver`, in `calibration/src/season/realSeason.ts`) takes that context, so neither passes a crew to the engine before step 2; calibration's season test (`realSeasonOfficials.test.ts`) pins that no `GAME_START` carries one on `realSimResolver`'s path. No golden digest moves, and no `GOLDEN_STRIP` entry lands. A season gets crews only when its caller asks for them. So a season run without them is today's run, byte for byte, and the pinned season path does not move. Until step 2, a season game's `GAME_START` shows no crew, whatever the save holds. Step 1's note says it in plain words: "This season the crews are made, assigned and saved, but no game uses them until step 2, so no pinned number moves."
- **The game's input** gains the crew (F5), written whole on `GAME_START` only when a game has one. It also gains one paired field for what the schedule says of the game: its kind and whether it is at a neutral site, for Q4's playoffs and Q5's neutral site. The field is paired so that a playoff game with no site, or a site with no kind, cannot be written, and it keeps the contract's own names (`contracts/src/league.ts:16-28`). Nothing in a game reads either until step 2. With no such field, a game is a regular-season game at the home team's field (CHOSEN). A batch, export or bench game has no schedule entry, so it is officiated that way, Q5's split included. A season game's kind and site are on its schedule entry, which the season resolver already gets (final.md, §10 item 2), and the season path hands them over with the crew from step 2. Nothing differs until a factor reads them: a fitted playoff factor on a judgment family (step 4 at the earliest) or Q5's split on the coverage fouls (step 5). A playoff game handed no field would be called as a regular-season game, against A7, and the championship also as a home game, against A8.
- **The officials' dials stay outside `DEFAULT_TUNABLES`** until ADR-089's step 11 lifts its census of the tunables (`calibration/test/adr089Filed.test.ts:43-44`; the precedent is the stem's dials, `engine/src/game/stem.ts:17-23`). An amendment then moves the dials into the tunables and re-pins the census.
- **Nothing of the officials' code joins the engine's barrel.** That rule is ADR-012's, not the census's, and step 11 does not lift it: ADR-012's test pins the barrel as an exact set (`engine/test/tunablePatch.test.ts:41-115`). An export there needs its own amendment to ADR-012.
- **Step 1b is its own PR** (A11).
- **The strict save check** (CHOSEN). Loading a save replays its season with the saved crews, and refuses any that are not this season's draw. This replaces the contracts record's words "crews do not enter it" and "gives each game its saved crew" (final.md, §10 item 5). The price: every save with a season and crews stops loading after any later change to the weekly draw, as a save with a season already does when the schedule's builder changes. So two franchise tests pin the draw as recorded, world-1's 2027 season, its 18 weeks and its playoffs (`officials.assign.test.ts` and `runSeason.officials.test.ts`, each "keeps world-1's 2027 ... as recorded"): a change to the draw is deliberate, and re-records them. Saves from before step 1 have no crews; they load and play on without them.
- **The crew report** (`crew-check`) is built at step 4, when called holds exist to set beside the carry dial. At step 1 it could print nothing that step 1's seeded tests do not already pin. Its CLAUDE.md line lands with it.
- **No ADR-078 amendment.** Calibration reaches step 1's crews through the franchise names ADR-078 R1 already permits (Iron Rule 1).

### What goes to the owner with step 1

- **Asked:** question 1, the carry (A5), on 2026-11-01; and E1's typed yes, with step 1's tests and numbers, after contracts-guardian's review (A2).
- **Answered** (2026-11-06): question 1, 0.68 (§15, A5); and E1's typed yes (A2) (added 2026-11-06).
- **Asked later:** the copies' spread, at step 1b (A11); and A10's reading, with the first family's numbers.
- **Stated, not asked** (told to the owner on 2026-11-01; it stands unless the owner says otherwise): the stand-in league's copies come in step 1b, a second small PR right after step 1's, not in step 1's own PR, where Q3's ruling puts them (A11).
- **Shown, not asked** (each stands unless the owner says otherwise): how a strict crew is held in, with every cost (A3); letting them play on both chances, with no factor on kick fouls at step 1 (A7); home and road, with no factor on kick fouls either (A8); the playoffs worked by the season's crews, and the same 17 referees every season (A6); every foul and near-foul rolled (A9).
- **News on a ruling:** the late-and-close finding (A7).
- **Listed:** the nine placements (A1) and the build choices (A12).
- **With them:** step 1's tests and their numbers, with every pin unchanged, before anything merges.
- **Asked at 1b** (2026-11-07): the copies' spread (A11), with a page setting out both options and their numbers, and 1b's tests and numbers before the merge (added 2026-11-07, step 1b).
- **Answered** (2026-11-08): the copies' spread, keep them as measured (§15, A11) (added 2026-11-07, step 1b).
- **News at 1b, not asked:** the copies spread less than A11 foresaw; a copy first matters, a little, at step 2's defensive offside; over 2015 to 2025 the real crews' family totals sit under A4's spreads, and over the copies' own window, 2023 to 2025, the snap's is about level with A4's (A4, A11) (added 2026-11-07, step 1b).
- **Shown at 1b, not asked** (each stands unless the owner says otherwise): which downs count; how a flag's kind is read, with the one defensive flag written as plain Delay of Game, and that a flag with no kind counts in no family; the seasons a block plays, and the default; building now on this season's refereed games, and the refresh; and that the made-up names do not hide which real crew each copy is (A11) (added 2026-11-07, step 1b).
- **Listed at 1b:** the referee source, the windows, the unit, the ids and the sealed tables (A11) (added 2026-11-07, step 1b).
