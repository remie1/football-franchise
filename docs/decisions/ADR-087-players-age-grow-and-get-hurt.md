# ADR-087: players age, grow and get hurt

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `franchise` (development and injuries) with a small part in `attributes` (starting values for generated players)
- **Status:** proposed: design only, questions Q1-Q8 open for the owner. Nothing is built.
- **Works with:** the "Player draft" thread (it builds the year turnover: same players carried into next season, age +1, rookies in, trim to 53; this ADR plugs into it), ADR-079 (absolute ratings, physical ratings pinned to measurements), ADR-080 (coaches' `development` and `teaching` skills), ADR-078 (calendar).

> Phase note: Charter §6 places franchise at Phase 4. The owner chose on 2026-10-23 to design this
> now, alongside the ADR-073 tuning, on the same condition as the other parallel threads: nothing
> here touches engine, playbook, play-caller or calibration test-league code, or moves a measured
> number. Injuries that happen *during* a game need the engine and are designed here but held
> (§4.5).

## Problem

Today a player is the same player forever. His ratings are minted once by the roster generator
(ADR-079) and never move; he never gets older in a way that matters, never improves, never gets
hurt, never retires. A franchise game needs all four: a 22-year-old corner who becomes a star, a
31-year-old running back who loses a step, a starter who misses six weeks and the backup who
plays well in his place, a veteran who calls it a day.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| `PlayerBio.age`, `PlayerCondition.injury` (`kind`, `weeksRemaining`, `playable`, `inGamePenalty`), `INJURY_OCCURRED` and `PLAYER_RETIRED` events already exist | `packages/contracts/src/players.ts`, `events.ts`, read 2026-10-23 | COMPUTED (read) |
| No package reads `condition.injury` or `condition.stamina` today | `grep` over `packages/*/src`, 2026-10-23 | COMPUTED (read) |
| The registry already has `durability` (physical) and `stamina` ratings | `packages/contracts/src/registry.ts` | COMPUTED (read) |
| Coordinators carry `development` and `teaching` skills (weights .10 and .15 in their overall) | ADR-080 §6 table | COMPUTED (read) |
| The generator builds each player from a hidden `talent` number; each rating shows that talent by its tier's `load` (core .8, secondary .5, rest .2); physical ratings come from measurements (40, 3-cone, vertical, bench, weight) | `packages/attributes/src/fictional/profiles.ts`, `derive.ts`, `generate.ts` | COMPUTED (read) |
| The generator's ages run 21 to 36 (21 + |normal| × 4.5, specialists +2) | `generate.ts` line 161 | COMPUTED (read) |
| Peak ages differ by position: running backs peak and fall earliest (about 25-27), quarterbacks, kickers and punters latest (about 28-33, kickers later still) | public aging-curve studies of NFL production; approximate | REPORTED (approximate, to be checked in step D2 against nflverse snap counts by age) |
| The average NFL career is short, about 3 years, shortest for running backs | NFLPA's commonly quoted figure; approximate | REPORTED (approximate, to be checked in D2) |
| Injury frequency, length and kind by position | to be measured from nflverse weekly injury reports and rosters (free; already planned as a source in `calibration.md` §1) | NOT YET MEASURED: D3 measures it before any number is chosen |
| Every number in this note's examples (how fast a 40 time slows, how much a coach adds, etc.) | chosen here for illustration | CHOSEN — provenance NONE; tuned in D2/D3 |

## 1. The idea in one paragraph

Each player gets a hidden **ceiling** (how good he can become at his best) and a hidden **growth
speed** (how fast he gets there). Once a year, in the offseason, every player has a birthday:
young players grow toward their ceiling, faster if they played and had good coaches; everyone's
body (speed, burst, agility, jumping, strength) follows an age curve set by his position; older
players' skills and smarts hold up longer than their legs; and some players retire. During the
season, after every game, players who played can come out of it hurt: hurt players are taken off
the depth chart until they heal, and the next man up plays. All of this happens in franchise code
between games, so the match engine is untouched.

## 2. Development: getting better

### 2.1 Ceiling and growth speed (Q1)

The roster generator already builds each player from one hidden number, his talent, and shows it
in each rating according to how much the position leans on that rating. Development reuses that:

- **ceiling**: the talent the player would have at his peak.
- **growth**: how quickly he closes the gap, from slow (late bloomer) to fast (ready on day one).
- His **current talent** is below the ceiling while he is young. Each year it moves part of the
  way up. His skill ratings move with it, each by its own `load` (a corner's coverage moves a lot;
  his catching, a rating the position rarely uses, barely moves).

Example: a corner drafted at 22 with ceiling 80 and current talent 66. His man coverage reads 64.
At normal growth he closes about a third of the gap a year: 66 → 71 → 74 → 76, and his man
coverage goes 64 → 68 → 71 → 72. A fast grower would be near 78 by his third year; a slow one
might still be climbing at 27. A small random wobble each year means some players bust and a few
leap past where anyone expected (the ceiling is a likely peak, not a hard wall: Q1 asks how hard).

Where the starting values come from:
- **Generated veterans** (ADR-079's made-up league): the generator draws a ceiling and sets current
  talent from age (a 30-year-old is at or past his peak, a 22-year-old well below). Small change
  inside `attributes`; today's ratings stay exactly as they are, the ceiling is added beside them.
- **Drafted rookies**: the draft thread's prospects carry age and ceiling; this ADR does the rest.
  Scouts see a blurred ceiling (perception), never the true one.

### 2.1a When the league is real players under other names

The owner ruled in the cap thread (2026-10-23, ADR-085) that the league's players and coaches are
to be stand-ins for the real current NFL ones, copied in every way except name and likeness. Then
the starting values come from the real importer (`attributes.md` §5, Iron Rule 7), not the
generator, using free data only:
- **age**: the real player's age;
- **measurements**: his real combine or pro-day numbers (nflverse), aged forward to today by this
  ADR's own curves, so the curve and the starting point agree;
- **current talent**: his ratings as the importer derives them;
- **ceiling**: estimated, since no one knows it: from age, draft slot and the trend of his recent
  seasons (a 23-year-old whose snaps and production rose sharply gets a ceiling well above his
  current level; a 29-year-old's ceiling is about where he is);
- **durability and injury status**: from his real games missed and injury reports over recent
  seasons, and a player hurt in real life when the league starts starts the game hurt.

The generator path stays for made-up leagues and tests. Nothing in the design changes; only
where the first values come from.

### 2.2 What speeds it up or slows it down (Q3, Q4)

- **Playing time** (Q3): a starter grows a little faster than a player who sat all year.
- **Coaches** (Q4): the coordinator on his side of the ball adds through his `development` and
  `teaching` skills (special teams coordinator for kickers, punters, long snappers). Kept small:
  the best coaching staff against the worst might be worth about one rating point a year on a
  young player. Position coaches and a strength coach (ADR-080 left them for "when development
  arrives") are not proposed here; they can come later and plug into the same slot.
- **Age**: growth tapers off through the mid-20s; by about 27 there is little left to gain.

### 2.3 When ratings change (Q2)

Recommended: **once a year**, at the start of the offseason (after the playoffs, before the
draft). Rookies drafted that spring get their first growth a year later, which matches how
rookie years usually go. In-season growth (a rookie who gets better by November) is a later
option.

## 3. Aging: getting older

### 3.1 The body follows the age curve, through the measurements

ADR-079 pins physical ratings to measurements: speed to the 40, agility to the 3-cone, jumping to
the vertical, strength to bench reps and weight. Aging works on the measurements, and the
ratings follow through the same mapping. So "he lost a step" literally means his 40 got slower.

Example: a running back runs a 4.45 at 24 (speed about 82). Past his position's peak his 40
slows by a few hundredths a year, then faster: 4.47 at 28, 4.51 at 29, 4.57 at 30 (speed about
71). A quarterback's 40 slows the same way, but a quarterback's value sits in his arm and his
head, so he loses far less.

Each position gets its own peak age and decline speed, checked against real NFL careers in D2
(how many players of each age are on rosters, average career length by position).

### 3.2 Skills and smarts last longer

Skill ratings (route running, coverage, pass blocking) hold until the early 30s and then fade
slowly. Mental and knowledge ratings (awareness, play recognition, football IQ, decision making)
keep rising a little with experience into the 30s. That is what lets a smart old safety stay on
the field after his speed has gone.

### 3.3 Retirement (Q7)

Each offseason a player may retire. Recommended for now, a simple rule: the chance rises with age
and with how far he has fallen below his peak, and is higher for players nobody would start.
Players who already said so leave at the end of the season (`PLAYER_RETIRED`, timing
`IMMEDIATE`); the calendar's later retirement windows (`franchise-calendar.md`: slow ones near free
agency, late ones near camp) can come with the cap work. Later, personality (`player-personality.md`)
and contracts can drive the choice, for example a player with a big bonus due being pushed to decide.

## 4. Injuries

### 4.1 Where they happen (Q5)

Recommended now: **after each game**, franchise code looks at who played and draws injuries.
The chance for each player depends on:
- how much he played (starters most, backups who came in on special teams less),
- his position (running backs and linebackers more than kickers),
- his `durability` rating,
- his age (a little higher for older players),
- an injury he is just back from (a re-injury bump for a few weeks).

The rates by position and the lengths are measured from real NFL injury reports before any number
is set (D3): how many players miss a game each week, how long they miss, how often it is
season-ending.

### 4.2 How long and how bad

Each injury draws a kind and a length from that position's real spread, roughly in four bands:
- **day to day**: plays next week, a little worse (uses `inGamePenalty`), or sits one game;
- **a few weeks** (1-3);
- **long** (4-8 weeks: the team may place him on injured reserve);
- **season-ending** (some of these, like a torn knee ligament, can run into next season).

### 4.3 What the team does

The injured player comes off the depth chart until healed and the next man up plays. The game
resolver is told who is available that week; the engine just sees a different lineup, which it
already handles. Injured reserve, signing a replacement off the street and the practice squad are
roster moves that belong with the cap and contracts work; until then a team plays short-handed
from its 53.

### 4.4 Lasting damage (Q6)

Recommended: a small share of serious injuries leave a lasting mark: a torn knee ligament might
take a few hundredths off a back's 40 for good, and repeated injuries lower `durability`. Most
injuries heal completely.

### 4.5 Injuries during a game (held for later)

A player leaving mid-game (and the backup finishing it) is real football but needs the match
engine to stop using him partway through. That is an engine change and would move measured
numbers, so it waits until the ADR-073 work and the pocket fix (backlog 100) are done. When it
comes, it replaces §4.1's after-game draw (the same rates, drawn play by play from contact),
so the season numbers should barely change. The event already exists: `INJURY_OCCURRED`.

## 5. Contracts edits this needs (each needs the owner's typed yes before it is made)

| Id | Edit | Why |
|---|---|---|
| **P1** | `TrueAttributes.development?: { ceiling: number; growth: number; talent: number }` (optional; absent = the player never changes, today's behaviour) | the hidden ceiling, growth speed and current talent (§2.1). Shared with the draft thread, which creates prospects with it |
| **P2** | `PlayerBio.measurements?: { forty, cone, vertical, bench, weightLb }` (optional) | aging works on the measurements (§3.1); the generator already draws them but throws them away |
| **E1** | `PLAYER_DEVELOPED { player, season, age, changes: { attr, from, to }[], cause: "GROWTH" \| "AGING" \| "INJURY" }` | the event stream is the record of every rating change (Iron Rule 3); news can write "breakout" and "lost a step" stories from it |
| **E2** | `INJURY_OCCURRED` gains `game?: GameId`, `severity: "DAY_TO_DAY" \| "WEEKS" \| "LONG" \| "SEASON"` | the news desk and the viewer need to know when and how bad |
| **E3** | `INJURY_HEALED { player }` | so availability can be rebuilt from events alone |
| **D1** | `contracts.md` wording for the above | documents |

No change to `GameResult` or the engine's types. Saves already store players (ADR-079), so age,
injuries and the new optional fields ride along.

## 6. Build plan (after the rulings)

| Step | What | Moves sim output? |
|---|---|---|
| D1 | contracts P1, P2, E1-E3, D1 (on typed yes) | no |
| D2 | aging, development, retirement: a pure yearly function in `franchise/src/players/`, plus a `career-check` command like `staff-check`: run a made-up league 20 years with a stand-in draft and compare roster ages, careers and peak ages by position with real NFL numbers. Generator adds ceilings. | no (only runs at the year turnover, which the draft thread builds) |
| D3 | measure real injury rates from nflverse; build the after-game injury draw and availability; check a season's injuries against the NFL's | only season runs, and only with `--injuries` on |
| D4 | hook D2 into the draft thread's year turnover; switch injuries on by default after the owner sees D3's numbers (Q8) | season runs only |
| later | in-game injuries (§4.5); in-season growth; position and strength coaches | engine, held |

## 7. Questions for the owner

| # | Question | Recommendation |
|---|---|---|
| Q1 | Does each player have a hidden ceiling, and how hard is it? | (a) hidden ceiling + growth speed, a soft limit with a small chance to beat it |
| Q2 | When do ratings change? | (a) once a year in the offseason; in-season growth later |
| Q3 | Does playing time help a young player grow? | (a) yes, a little |
| Q4 | Do coaches matter for growth? | (a) yes, small (about a point a year best vs worst) through coordinators' development and teaching |
| Q5 | Injuries: after each game now, during the game later? | (a) yes |
| Q6 | Can a serious injury leave a lasting mark? | (a) yes, a small share |
| Q7 | Retirement rule | (a) simple rule (age, decline, role) now; personality and contracts later |
| Q8 | How does it switch on? | (a) off by default until you've seen the career and injury checks, then on |

Plain-words versions with examples: `/mnt/project-files/design/ADR-087-questions-explained.md`.

## What this does not touch

Engine, playbook, play-callers, calibration's test leagues and arms. No measured number moves.
