# The project in plain words

A short tour of what this game is, what each part does, what is built, and what is waiting.
It is written for someone who knows football but has not read every design note. The formal
rules live in `ARCHITECTURE_CHARTER.md`, and the full working history lives in `HANDOFF.md`.
This page points into both and should stay short. Update the "Where things stand" section when
a big piece lands.

_Last updated: 21 October 2026._

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
| Front office | `packages/franchise` | Will run the calendar, schedule, standings, cap, contracts, free agency and the draft. | Not started (its own thread now) |
| Storylines | `packages/narrative` | Will write storylines, press and reputation from what happens in games. | Not started |
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
  ADR-001 up (ADR-076 is the latest in the repo at the time of writing; ADR-077's design note
  is still in the project files). A note states the problem, the
  proposal, the questions for you, and later your rulings and what was measured.
- **Your rulings.** Questions come to you as plain football questions. Nothing that changes the
  shared types is built without your typed yes, and nothing is merged into `main` without your
  yes. Claude does the merge itself once you say yes.
- **Checks before merging.** `pnpm verify` (build, tests, type checks) must pass, and GitHub
  runs the same checks on every pull request.

## Where things stand

**Being worked on now (the play simulator):**

- **The front and pass rush (ADR-073).** The defence shows a rush before the snap, the
  quarterback grades the pressure he sees, and the line can slide its protection to it. Steps
  one to five are merged; step five (play-caller version 6, which no team uses yet) draws the
  blitz and the line stunt on their own and adds the Creeper. The last step, six, adds disguised
  fronts (the Mug and the Stem) and moves the test league to the new play-caller.

**Biggest known problem:** the pocket collapses too early. About 86% of dropbacks are under
pressure, against about 35% in the NFL (backlog entry 100). This drives too many sacks, too few
completions and odd target shares. A fix is designed in outline but waits until the front work
finishes.

**Designed and ruled, waiting to be built:**

- Pre-snap motion (ADR-074), after the front work.
- Each defensive coordinator disguising in his own way (ADR-075).
- The weekly game plan that baits the quarterback's checks (ADR-076). The offence's answer is
  not designed yet.
- The running back's own blitz read at the snap (ADR-077, ruled but not yet in the repo), after the front work, switched on
  only once the pocket fix works.
- Fixed read orders on the play cards, so the targets spread more like the NFL (backlog 171).
  It is built on its own branch and waits for the front work to finish.

**Started outside the simulator (21 October 2026):** a game viewer for the browser, a season
shell for the front office, faster CI, and this guide.
Season shell so far: a made-up 32-team league, and standings with the full NFL tiebreakers
(checked against the real 2020-2024 playoff seeds).
Team rosters (ADR-079, 22 October 2026): every team has its own 53 made-up players, rated on one
absolute scale for every position (a guard's speed and a corner's speed on the same ruler), with
the best player at each spot starting. Seasons play with these squads by default.

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
