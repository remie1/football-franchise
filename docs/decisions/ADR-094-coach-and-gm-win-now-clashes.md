# ADR-094: GMs and head coaches lean patient or win-now, argue the team's course, and GMs are hired and fired

- **Date:** 2026-11-06
- **Proposed by:** Orchestrator, for `franchise` (leans, pressure, weekly read, meeting, carousel,
  depth chart) and `narrative` (the news beat). Thread "Design coach and GM win-now clashes".
- **Status:** parts 1-7 and Q1-Q6 ruled by the owner (2026-11-06 23:07Z). Parts 8 (GM hiring and
  firing) and 9 (the coach's lineup choices) were added by that ruling and are proposed, with
  questions Q7-Q12 open. Contracts edits W1-W3 wait for the owner's typed yes. Nothing is built.
- **Proposal doc (plain words, the questions as put to the owner):**
  https://claude.ai/artifact/KXX3prGXYBRY2dNph4dfgm
- **Origin:** the owner's question in thread "Salary cap and contracts" (2026-11-06 22:36Z): can a GM
  take the long view at the trade deadline while the computer head coach wants to trade the future
  to compete now, and do GMs have that in their personality? Answer then: not modeled. The owner:
  *"Design it. Also, it should refresh week after week during the season based on their record."*

> Phase note: like ADR-081 and ADR-084, this is franchise and story work started before Charter §6
> reaches it, on the owner's direction. Nothing here touches the engine, playbook, play-caller or
> calibration measurement code, or moves any sim number or seed. Part 9 changes who plays, so it
> sits behind its own switch, off by default (see §9).

## Provenance of factual claims

| Claim | Source | Kind |
|---|---|---|
| GM personality type only tilts the direction of wrong reads (`LEANINGS`, `pushed`, `pushedOrdered`) | `packages/franchise/src/meeting/gm.ts` on main 747cae3 | COMPUTED (read) |
| The GM alone sets `Team.direction`, from his WINDOW take, for computer teams | `meeting/meeting.ts` `holdMeeting`, `meeting/steps.ts` hold step | COMPUTED (read) |
| The head coach is not in the meeting (GM, OC, DC only) | `meeting/meeting.ts` `meetingStaff` | COMPUTED (read) |
| Presidents and GMs are never hired, fired, retired or aged by the carousel | `staff/offseason.ts` `frontOffice` comment and step 10 | COMPUTED (read) |
| The president's leaning is about cap room only | `cap/leaning.ts` | COMPUTED (read) |
| Head-coach firing chance formula (`headCoachFireChance`) | `staff/offseason.ts` | COMPUTED (read) |
| A head coach's three lineup leanings (incumbent, veteran, form) and the fiery quick hook | `players/lineup.ts`, `players/depthChart.ts` | COMPUTED (read) |
| Depth-chart move labels (`DepthChartSituation`) | `packages/contracts/src/events.ts` | COMPUTED (read) |
| Relationship move names are free strings (no contracts edit for a new move) | `packages/contracts/src/relationships.ts` | COMPUTED (read) |
| Clash heat formula (temper, steps apart, job on the line, cold views, dice) | `meeting/clash.ts` | COMPUTED (read) |
| In the NFL the GM usually makes the final roster call; some teams share it | [Jaguars.com](https://www.jaguars.com/news/o-zone-doing-the-job), [NBC Boston](https://www.nbcboston.com/news/sports/nfl/new-england-patriots/eliot-wolf-contract-mike-vrabel-front-office/3644520/?amp=1) | REPORTED (search summaries, not counted) |
| Playoff rates by early record since 2002: 5-3 → 57 of 99; 4-2 → 63 of 103; 3-3 → 39 of 112 | [Blogging The Boys 2019](https://www.bloggingtheboys.com/2019/11/7/20951554/nfl-playoff-tracker-cowboys-remain-on-track-for-playoffs-and-division-title), [2016](https://www.bloggingtheboys.com/2016/10/17/13304032/nfl-playoff-tracker-week-7-dallas-cowboys-odds-looking-good-for-postseason) | REPORTED (search summaries) |
| 23 GM firings over five years (about 4-5 a year; the per-year figure is my arithmetic) | Sportsology, as reported by [Sportico 2023](https://www.sportico.com/leagues/football/2023/nfl-owners-front-office-hiring-1234699871/) | REPORTED |
| Median tenure of active NFL GMs about 3 years | [ESPN](https://africa.espn.com/nfl/story/_/id/40492244/howie-roseman-eagles-influence-nfl-why-evaluating-gms-hard-super-bowl-analytics) | REPORTED |
| Our head-coach changes 7.6 a year | ADR-080 C5 staff-check | COMPUTED (earlier run, not re-run) |
| Our league's win spread 2.4 against about 2.75 real | aging thread's ADR-087 D5b first look | REPORTED (other thread) |
| Every lean center, spread, bar, push and threshold below | none | CHOSEN (judgment, tuned at the many-season check) |

## 1. Leans (ruled: yes; Q1 a)

Every GM and head coach holds a lean from 0 (patient: build through the draft, keep the picks) to
100 (win now: spend the future on this year), drawn once when he is made and kept for his career.
GMs center on 40, head coaches on 60, standard deviation 15 (most within 25 either side), clamped
0-100. Personality nudges it by up to 10: fiery +10, demanding +5, playersCoach 0, cerebral -5,
quiet -10 (CHOSEN). Held as an open key on his ratings, `winNowLean`, the way the president holds
`capLeaning`, so no contracts edit. Drawn on its own fork (`franchise:winNowLean`, by his id), so
no existing draw moves. A man made before this step is read through the same draw.

## 2. Pressure (ruled: yes; Q2 a; GMs added by the owner)

His **working lean** = lean + (100 - lean) x 2/3 x pressure, where pressure (0..1) is his own
chance of being fired as things stand. For a head coach: `headCoachFireChance` fed this season's
win share to date as if played out at the same pace; the last year of his contract adds 0.15
(capped at 1). For a GM: the GM firing chance of §8 the same way. A man the president would surely
fire goes two thirds of the way to all-in; a safe man feels next to nothing.

Owner's addition (23:07Z): *"let's also make GMs hireable and fireable. It's even more important
than computer coaches, because the game player needs to hire and fire his own GM and that means
there needs to be GMs available for hire."* That is §8.

## 3. The weekly read (ruled: yes; Q6 a)

After every regular-season week's games, every computer team's GM and head coach each guess the
team's chance of making the playoffs. The true chance is read from a table by wins, losses and
games left, measured from our own league's many simulated seasons (Q6 a) and shown beside the real
counts above. Each man's guess = truth pushed by a miss whose size follows his forecasting and
performance analysis, on the player outlook's scale (outlook Q2 b: a strong man's typical miss
about 25% smaller than a weak one's), one draw per man, team and week.

Agreed with the cap thread (2026-11-06 22:46Z): this re-reads the team's chances only. The GM's
guesses about players stay on the owner's three stops (new league year, end of camp, after week
9's games); the post-week-9 stop is where the two land together. The meeting's window-read
accuracy (ADR-081 grade odds) is unchanged; the cap thread is told before it ever changes.

## 4. Stance (ruled: yes; Q5 a)

Each man picks BUY, HOLD or SELL: buy when his guess is at or above the buy bar, sell when below
the sell bar, hold between. Bars at working lean 50: buy 50%, sell 20%. Each 10 points of working
lean moves both bars 3 points (lean 100: buy 35%, sell 5%; lean 0: buy 65%, sell 35%). CHOSEN.

Q5 a: the stance is separate from the team's course. `Team.direction` is still set once a year at
the meeting, so the cap thread's look-ahead (contend 1 year, retool 2, rebuild 3) never moves in
midseason. The team's stance is the GM's (after §5). It changes nothing in play until a trade
system reads it at the deadline; it feeds views, news and §9.

## 5. The argument (ruled: yes; Q3 b)

When the two stances differ, they talk, at most once a week. Heat uses `findClashes`' formula
(both temperaments, steps apart: buy against sell is 2, the job on the line when the coach's
pressure is over 0.5, the lower of their two views, dice). Who wins on the day is politics plus
dice, as at the meeting. The GM decides. Q3 b: when the coach wins, the GM meets him one step if
the GM's view of him is good or close (20 and up): sell becomes hold, hold becomes buy; buy against
sell moves one step, never two. When the owner holds the GM seat, the computer coach lobbies him and
the owner decides; when the owner holds only the head coach seat, he argues with the computer GM.

## 6. Souring (ruled: yes; Q4 a)

The ledger's moves apply: polite disagreement -2 each way, open argument -10 each way, a rift a
grudge in the loser. New move `OVERRULED_ON_COURSE`, -3, loser only. Q4 a: the first argument of a
split costs in full; a repeat costs only when it gets hotter, the gap widens, or every fourth week
the split lasts. Every GM and head coach now hold views of each other (start at ADR-084's rest
point), which they do not today.

## 7. The meeting (ruled: yes)

The head coach joins the ADR-081 meeting and speaks to NEXT_WINS and WINDOW, rolling with his own
meeting skills as coordinators do. His WINDOW claim is his read tilted by his working lean (pressure
read from how short his leash is for next season); the GM's WINDOW read is tilted by his own. A
working lean of 70+ moves a borderline read one step toward contend, 30 or under one step toward
rebuild (CHOSEN). They argue as in §5 and the GM's final call sets `Team.direction`, at the same
moment as today. Agreed with the cap thread: the GM's lean reaches contract calls only through
`Team.direction`, never as a second look-ahead input.

## 8. GMs are hired and fired (owner's addition; proposed, Q7-Q10)

Built the way ADR-080 runs the coaching carousel, as its own step before the head-coach step.

- **Judged by the president** once a year after the playoffs, on results against what the president
  expected over the GM's whole tenure (a GM is judged slower than a coach: a longer honeymoon, more
  weight on earlier seasons). Target about 4-5 GM firings a year (reported real figure above), below
  our head-coach changes. A clean sweep, GM and coach out together, happens when both are judged
  short. Pressure (§2) reads this chance in-season.
- **The pool.** A front-office ladder made like the coach pool: scouting directors and cap managers
  (existing roles) on every team, the league's best of them candidates each year, plus fired GMs
  (retreads), plus a few coordinators and head coaches who move upstairs (rare; Q9). Each carries
  the meeting skills (talent evaluation, performance analysis, forecasting, cap management, market
  sense, nuance, politics), a personality type and a lean. The pool is topped up every year so
  there are always GMs to hire.
- **Hiring.** The president ranks candidates through the same blurry lens as ADR-080 (his own talent
  evaluation, the candidate's résumé with recent work weighted most). A new GM gets a contract (years
  and salary, tracked as coaches' are). Who hires and fires the head coach once GMs exist is Q8.
- **The owner's team.** Who hires and fires the owner's GM when the owner does not hold the GM seat
  is Q10. The owner sees the same candidate report as the president does.
- **Views.** Hire +10, firing a friend stings (ADR-084's existing moves).

## 9. The coach's lineup choices (owner's addition; proposed, Q11, Q12)

Owner (23:07Z): *"some behavior that a coach might change based on how he sizes his team's hopes up
is to play younger players if he thinks they won't make it. But that would take into consideration
whether he's on the hot seat or not. A coach that is on the hot seat, even if he feels his chances of
making the playoffs is low, is still probably going to put in the players that give him the best
chance of winning. Another behavior might be to just start a different player regardless of their
ages in hopes of breaking a losing streak because they've grown so desperate."*

Both act through the existing weekly depth chart (`players/depthChart.ts`), by moving the coach's own
three leanings for the week, never by a new rule about positions:

- **A look at the young men.** When his playoff guess (§3) is under a give-up line and his pressure is
  low, his veteran leaning falls (by up to 40 points, more the lower his guess) and spots where a
  younger backup is close are opened to him, labeled `YOUTH_LOOK`. On the hot seat (pressure over
  0.5) none of this happens: he plays his best chance to win.
- **A desperate shake-up.** After a losing streak, a coach whose pressure is high benches one starter
  whose recent play is worst against a challenger who is close, regardless of age, labeled
  `SHAKE_UP`, and his incumbent leaning drops for the week. At most one shake-up per streak.

With growth on, snaps drive how fast young players grow (ADR-087) and injury exposure is per snap,
so this sits behind its own switch (`--lineup-hopes`, off by default), and the aging thread re-runs
its 20-season check before it lands (agreed 2026-11-06 22:46Z).

## 10. Contracts edits (each needs the owner's typed yes)

- **W1** `Team.stance?: "BUY" | "HOLD" | "SELL"` and event `TEAM_STANCE_SET { team, season, week,
  stance, authority: "GM" }`.
- **W2** event `COURSE_ARGUED { team, season, week, gm, coach, gmStance, coachStance, heat, winner?,
  outcome }` (the news reads it; the views move through `RELATIONSHIP_CHANGED` as today).
- **W3** `DepthChartSituation` gains `"YOUTH_LOOK"` and `"SHAKE_UP"`.
- No edit for leans (rating keys), the new move (a free string), the coach's meeting claims (the
  meeting's shape fits), or GM hiring and firing (`STAFF_HIRED` and `STAFF_DEPARTED` carry any role;
  `StaffRole` already has `GM`, `SCOUTING_DIRECTOR` and `CAP_MANAGER`). A saved GM pool rides in the
  staff list saves already carry.

## 11. Build steps

1. Leans and pressure; GM and head coach views of each other. Tests: same seed, same leans; pressure
   reads the firing formula.
2. GM hiring and firing (§8) with the front-office pool. Many-season check against about 4-5 firings
   a year and a median tenure near 3 years (both reported).
3. The weekly read, stance and argument (§3-§6), after each week's games. Measure the playoff-chance
   table from our own seasons first.
4. The head coach in the meeting (§7).
5. News: leaks and a deadline-week headline when a GM and coach split (narrative).
6. The lineup choices (§9), behind their switch; the aging thread's check before default-on.
7. A many-season check: splits at the deadline, rifts per season, how often the meeting's course
   follows the coach. No real count exists for these, so the targets are judgment, labeled so.

## 12. Rulings

- 2026-11-06 23:07Z, the owner on parts 1-7: "1. Yes 2. Yes, but let's also make GMs hireable and
  fireable ... 3. Yes. And some behavior ... 4. Yes 5. Yes 6. Yes 7. Yes"; on Q1-Q6: "1. A 2. A 3. B
  4. A 5. A 6. A".
- Q7-Q12 open (see the proposal doc).
