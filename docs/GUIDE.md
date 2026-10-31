# The project in plain words

A short tour of what this game is, what each part does, what is built, and what is waiting.
It is written for someone who knows football but has not read every design note. The formal
rules live in `ARCHITECTURE_CHARTER.md`, and the full working history lives in `HANDOFF.md`.
This page points into both and should stay short. Update the "Where things stand" section when
a big piece lands.

_Last updated: 31 October 2026._

## What the game is

A single-player American football management game that runs in the browser. You coach and run
the front office of one team: you call or set the plays, build the roster, manage the salary
cap, draft and sign players, and live through seasons. Every play is simulated, not scripted:
players' ratings and the two play calls meet, the dice roll, and the result comes out as a
stream of events (snap, rush, throw, catch, tackle, and so on).

Three ideas run through everything:

- **One record of what happened.** Each simulated play writes a list of events. The play log,
  the stats, the realism checks and (later) the storylines are all built by reading that list.
  Nothing keeps its own private notes about what happened.
- **Same seed, same game.** All the dice come from one seeded random number generator. Run a
  game twice with the same seed and you get exactly the same game, down to every event. That is
  what lets us change one thing and measure what it did.
- **Real football as the yardstick.** We simulate whole leagues and compare the numbers
  (completion rate, sacks, interceptions, yards per carry and so on) against real NFL seasons.

## The parts

The code is split into packages. Each has one job, and they may only talk to each other through
the shared types in `contracts` (with one approved exception: the realism checker is allowed to
run the play simulator).

| Part | Folder | What it does | Built? |
|---|---|---|---|
| Shared types | `packages/contracts` | The agreed shapes everything uses: players, ratings list, play calls, events, the dice, save files. Changing it needs a written proposal and your yes. | Yes |
| Play simulator | `packages/engine` | Simulates one play at a time, and whole games: pre-snap reads, the pass rush and the pocket, routes and coverage, the throw and catch, runs, special teams. | Yes, being tuned |
| Playbook | `packages/playbook` | The play cards: formations, pass and run concepts, protections, defensive calls with their fronts, coverages, pressures and disguises. | Yes |
| Realism checker | `packages/calibration` | Runs thousands of games and compares the results with real NFL numbers. Also holds the computer play-callers used for testing, and the "ladder" checks (described below). | Yes |
| Player ratings | `packages/attributes` | Makes the made-up league's players and their ratings (ADR-079); will later turn real data into ratings for real rosters. | Made-up rosters: yes. Real data: not started |
| Front office | `packages/franchise` | Runs the calendar, schedule, standings and playoffs (the season shell), the coaching staffs: hiring and firing (ADR-080), and how the staff get on (ADR-084), and players growing, aging and getting hurt week by week (ADR-087, switched off by default). Will add the cap, player contracts, free agency and the draft. | Yes: the season shell, coaching staffs and their relationships (none of it affects games); player growth and injuries (off by default) |
| Storylines | `packages/narrative` | Writes the news from what happens in games: each week's headlines, the playoff race, the playoffs and a season review today (ADR-082); storylines, press and reputation later. | Started: the season's news |
| Game screen | `apps/game` | The browser app: menus, dashboards, the play log. It only displays; it decides nothing. | Not started (a game viewer has its own thread now) |

The order the parts are meant to be built in is in the Charter, section 6. Play simulator and
realism checker came first. Front office and the game screen were started early on 21 October
2026, by your choice, in work that does not touch the simulator.

## How a play works, in short

1. **The calls.** Each side picks a play card. A defensive call is said the way a call sheet
   says it: personnel, front, coverage, then tags (for example "Nickel Over Tex, Fire, Cover 3,
   Show 2"). Some calls carry a disguise: what the offence is shown before the snap is not what
   is played.
2. **Before the snap.** The quarterback reads the look, may be fooled by a disguise, and may
   change where he goes with the ball. How far he is allowed to stray from the call is the
   coach's **leash**, and whether he stays inside it depends on his **discipline** rating.
3. **After the snap.** Time moves in half-second steps. Blockers and rushers fight, the pocket
   holds or breaks, receivers run routes against coverage, the quarterback reads and throws or
   scrambles or is sacked, and the catch, run after catch and tackle are rolled.
4. **The record.** Every step writes events. The play log you would see in the game is printed
   from those events.

## How we check it is realistic

- **League runs.** We simulate full leagues and compare their numbers with real NFL seasons.
  Each number has a target range. Some are inside it, and several are not yet.
- **Ladder checks.** For each important rating we build test teams that differ only in that
  rating, low to high, and check the better player always does better. These run on every
  change and are most of the test time. They check that ratings matter in the right direction,
  not that the numbers are realistic.
- **Arms.** When we try a change, we run the same games (same seeds) with and without it. Each
  version is called an "arm". Because the seeds match, any difference comes from the change.
- **The backlog.** Every known realism problem has a numbered entry in
  `docs/decisions/CALIBRATION-BACKLOG.md`, with what is known, what was tried and what would
  prove it wrong.

## How decisions get made

- **Design notes (ADRs).** Each real decision gets a numbered note in `docs/decisions/`, from
  ADR-001 up (ADR-089 is the latest in the repo at the time of writing; ADR-077's design note
  is still in the project files). A note states the problem, the
  proposal, the questions for you, and later your rulings and what was measured.
- **Your rulings.** Questions come to you as plain football questions. Nothing that changes the
  shared types is built without your typed yes, and nothing is merged into `main` without your
  yes. Claude does the merge itself once you say yes.
- **Checks before merging.** `pnpm verify` (build, tests, type checks) must pass, and GitHub
  runs the same checks on every pull request.

## Where things stand

**Just finished (the play simulator):**

- **The front and pass rush (ADR-073).** The defence shows a rush before the snap, the
  quarterback grades the pressure he sees, and the line can slide its protection to it. All six
  steps are merged. Step five added play-caller version 6, which draws the blitz and the line
  stunt on their own and adds the Creeper. Step six added disguised fronts (the Mug and the Stem)
  in version 7 and moved the test league to it, so the league now plays with all of it at once:
  the line's slide check, the blitz and the stunt drawn on their own, the Creeper and the
  disguised fronts.

**Biggest known problem:** the pocket collapses too early. About 86% of dropbacks are under
pressure, against about 35% in the NFL (backlog entry 100). This drives too many sacks, too few
completions and odd target shares. The play cards' read orders are already fixed (backlog 171,
merged). Measured with play-caller version 4, on the snaps where the pocket held, the targets
spread nearly as they do in the NFL; the rest of the gap is the pocket. The front work is finished,
so the pocket fix comes next. Its design will take in what a free blitzer really changes (the
quarterback's feel for the rush, his mobility against the rusher's speed, hot and deep routes, and
down and distance), and its questions go to you before anything is built. The pocket fix (ADR-089)
is being built in twelve steps; step 0 added the instruments and filed every prediction; step 1
built a new block clock behind a switch that is off, which with the switch on for measurement
brought pressure down to about a third of dropbacks while interceptions rose, and you chose to
finish the pocket before the interception design and to merge it (numbers in
`packages/calibration/reports/adr-089-step1.md`). Step 2, also behind the switch, makes the
quarterback react to a rusher half a second away, to one who reaches him, or to his count running
out, instead of to the pocket's running tally, and starts the pressure warning at one second
instead of two; default play has still not changed. With the switch on, against step 1's clock on
the same games, pressure fell from 32% to 28% of dropbacks on the flat-rated test league and from
33% to 29% on the made-up league, and sacks rose by 0.2 to 0.4 per 100 dropbacks. Four of the five
graded pocket predictions held; on the made-up league pressure fell 0.02 points further than the
predicted range, which is reported as filed. The interception check, as amended before step 2, did
not trip. Step 2's numbers are in `packages/calibration/reports/adr-089-step2.md`; you chose to merge
it with its switch off (30 October 2026). Step 3 waits on step 2 of the build of where every man stands at
the snap (ADR-090, designed and ruled 31 October 2026).

**Next after the pocket fix:** the made-up league intercepts about 6.8% of passes against the
NFL's 2.3%, because tipped balls go to the fastest reactor and strong passers throw into covered
windows. Its fix is designed right after the pocket fix, measured on the fixed pocket.

**Designed and ruled, waiting to be built:**

- Pre-snap motion (ADR-074), after the front work.
- Each defensive coordinator disguising in his own way (ADR-075).
- The weekly game plan that baits the quarterback's checks (ADR-076). The offence's answer is
  not designed yet.
- The running back's own blitz read at the snap (ADR-077, ruled but not yet in the repo), after the front work, switched on
  only once the pocket fix works.
- Where every man stands at the snap (ADR-090, ruled 30-31 October 2026): a spot in yards for all
  22 players on every play, drawn in the game viewer. Disguises cost ground (a Mug backer and a late
  rotation really stand there at the snap), and a poor disguiser cheats toward his job. Its first
  steps change no game and can land while the pocket fix is measured; step 2 is the pocket fix's
  free rushers. Step 0 is built (31 October 2026): the spot tables and the pre-snap steps as code
  no game calls yet, checked over every call against every formation and against your August
  alignment ranges (`pnpm --filter @ff/calibration snap-spots`,
  `packages/calibration/reports/adr-090-step0.md`). Step 1 puts the picture on every play and in
  the viewer; it needs your typed yes for three contract changes (S1, S2, S5).
- The stem called by the Mike (ADR-091): he times MOVE against the quarterback's count with his
  Awareness and Play Recognition, the line can be caught moving, and offside is enforced by the
  NFL's own rules. Each defensive coordinator stems at his own rate, about 9 times a game on
  average.
- The battle over the snap count (ADR-092): the defensive coordinator's film study and the Mike's
  ear decide how well the defense knows the count, and the offensive coordinator fixes it during
  the game. You chose to have the count matter on every snap (jumping the count, false starts)
  in a design of its own after the pocket fix, with officials who sometimes miss a call.
- Penalties called by human officials (ADR-093, approved 31 October 2026, all eight questions ruled):
  every foul enforced by the NFL's rulebook, players who foul through their Discipline, and
  officials who miss some fouls, sometimes flag a close play that wasn't one, and work in 17 crews
  with their own leans, all sized to real NFL flags (three seasons in detail, thirteen for how
  crews and the league's standard move). Nobody counts missed calls, so how much the officials
  miss is your call, fenced in by the league's own grading (you chose 2 in 3 of the holding seen
  and 1 in 20 judgment flags wrong). An assistant head coach offers challenges with an honest
  percentage, under the NFL's real challenge rules. Its first two steps (the rulebook and the
  officials) are being built now and change no play; the fouls themselves come after the pocket
  fix.

**Started outside the simulator (21 October 2026):** a game viewer for the browser, a season
shell for the front office, faster CI, and this guide.
Season shell: a made-up 32-team league, its schedule, standings with the full NFL tiebreakers
(checked against the real 2020-2024 playoff seeds), the playoffs and a whole season through the
real sim. **Save and load:** stop a season after any week, save it to a file, and carry on later;
the season comes out exactly as if it had never stopped
(`season -- --seed X --stop-after 9 --save league.json`, then `season -- --load league.json`).
Team rosters (ADR-079, 22 October 2026): every team has its own 53 made-up players, rated on one
absolute scale for every position (a guard's speed and a corner's speed on the same ruler), with
the best player at each spot starting. Seasons play with these squads by default.

**Coaching staffs (ADR-080, 22 October 2026):** every team has a head coach, two coordinators, a
special teams coordinator and a computer-run president, with careers, contracts and 20 seasons of
made-up history. Presidents hire and fire head coaches, head coaches pick their coordinators, and
`pnpm --filter @ff/franchise staff-check` compares the turnover with NFL numbers. Coaches do not
affect games yet; that waits for the front work (ADR-073) and ADR-075. Saves keep the coaches (23 October
2026): every coach, their contracts and each team's staff go into a `--save` file, and `--load`
carries on with them.

**News (22 October 2026, ADR-082):** a news desk writes up to four headlines a week from a
season's results: routs, comebacks, upsets, streaks, the last unbeaten team, division leaders, and
who has clinched or been knocked out. Every playoff game gets a headline, and a season review
closes the year. Save a season with
`pnpm --filter @ff/calibration season -- --seed <seed> --out season.json`, then
`pnpm --filter @ff/narrative news -- --season season.json` prints its news and saves it for the
game viewer: run `pnpm --filter game dev` and open the News page. The season command also prints
each week's headlines as it plays.

**Relationships (ADR-084, 23 October 2026):** each staff member has a view of you and of each
colleague, running both ways (close, good, professional, strained or broken), nudged by everyday
choices, swung by big moments and, now and then, by a storyline about the coaches. Built so far:
the record of every view, how each drifts back to what the two men's personalities make normal,
grudges, and the moves the coaching carousel makes by itself (a hire, a firing, an extension, the
season's results). Next, views will feed who stays, how hot the staff meeting's arguments get, and
what leaks to the press; they never change a game.

**Players grow, age and get hurt (ADR-087, built 24 October 2026, off by default):** with
`--development` and/or `--injuries` on the season command, every player's ratings move a little
each week (young players gain, players past about 30 lose, more of it in the offseason, playing time
and coaching help), injuries happen in games, in practice and away from football with lengths and
kinds measured from six real NFL seasons, hurt players sit out or play hurt, each head coach sets
his depth chart his own way, teams short of a player sign a street free agent, and free agents
nobody signs retire. The season then runs on to the end of the league year, and a save carries all
of it. With both switches off a season is exactly what it was. The single-season checks
(`pnpm --filter @ff/calibration player-checks`, `reports/player-checks.md`) compare it with the NFL;
switching it on by default waits for the 20-season check, after the draft and cap threads' year
turnover.

**Your coach's personality (ADR-083, ruled 23 October 2026, not built):** your type builds up from
how you answer people, shown as five meters on your coach page. Only your main trait counts, and it
changes only when another trait clearly overtakes it. It waits for the first conversation (the
end-of-season staff meeting).

## Words you will see

| Word | Meaning |
|---|---|
| ADR | A numbered design note (Architecture Decision Record) in `docs/decisions/`. |
| Arm | One version of the game in a with-and-without comparison run on the same seeds. |
| Backlog entry | A numbered known problem in the realism backlog. |
| Caller (v3, v4, v5...) | The computer play-caller used in test leagues. A new version is a new set of habits, kept separate so old measurements stay comparable. |
| CI | The automatic checks GitHub runs on every change. |
| Contracts | The shared types every part uses. Not player salary contracts. |
| Disguise / mask / look | What the defence shows before the snap when it is not what it plays. |
| Events / event stream | The record of everything that happened on a play, in order. |
| Inert | A change that is built but switched off, proven to move no numbers. |
| Ladder | A set of test teams that differ only in one rating, low to high. |
| Leash | How far the coach lets the quarterback stray from the called play, 0 to 100. |
| Rung | One step on a ladder or on the leash scale. |
| Seed | The number that starts the dice. Same seed, same game. |
| SE | Standard error: the size of a difference that could just be luck. |
| Tunables | The adjustable numbers inside the simulator. |

## Where to look next

- `ARCHITECTURE_CHARTER.md`: the rules of the project.
- `docs/design/`: the design specs for each part (the play simulator's is `match-engine.md`).
- `docs/decisions/`: the design notes and the realism backlog.
- `HANDOFF.md`: the detailed working history, in our shorthand.
