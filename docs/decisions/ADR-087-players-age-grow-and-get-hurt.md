# ADR-087: players age, grow and get hurt

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `franchise` (development, aging, injuries), with small parts in
  `attributes` (starting values) and `calibration` (the season runner hands each week's players to
  the game and reports who played)
- **Status:** design ruled by the owner (Q1-Q8, 2026-10-23 18:28Z; follow-ups F1-F3, 20:49Z).
  Contracts edits P1-P6, S1, C1, E1-E5 and D1 approved by the owner's typed yes (2026-10-24
  02:39Z). D1-D4 built and D5a measured 2026-10-24 (PR #35; §11); both switches off by default.
  §12 (aging by ability, with no positions) accepted 2026-11-07, with contracts edits P7, E6, P8
  and W1 approved by the owner's typed yes (2026-11-06 23:20Z; confirmed 2026-11-07 12:15Z).
- **Works with:** "Player draft" (ADR-086: the year turnover, rookies), "Salary cap and contracts"
  (ADR-085: cuts, free agents, injured reserve, replacements; real-player stand-ins), ADR-079
  (absolute ratings, physical ratings pinned to measurements), ADR-080 (coaches), ADR-075 (players'
  `disguise` growth, T7), ADR-078 (calendar), Spec #11 `coaching-staff.md` §4.4 (this ADR builds its
  `DevelopmentTick`), Spec #14 `player-personality.md` (retirement, later), `perception.md`.

> Phase note: Charter §5 places franchise at Phase 4. The owner chose on 2026-10-23 to design this
> now, alongside the ADR-073 tuning, on the same condition as the other parallel threads: nothing
> here touches engine, playbook, play-caller or calibration test-league code, or moves a measured
> number while it is switched off. Taking a player out *during* a game needs the engine and is
> held (§5.2).

## Problem

Today a player is the same player forever. His ratings are minted once (ADR-079) and never move;
he never improves, never declines, never gets hurt. A franchise game needs a 22-year-old corner
who becomes a star, a 31-year-old running back who loses a step, a starter who misses six weeks
and the backup who plays well in his place.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| `PlayerBio.age`, `PlayerBio.weightLb`, `PlayerCondition.injury` (`kind`, `weeksRemaining`, `playable`, `inGamePenalty`), `INJURY_OCCURRED`, `PLAYER_RETIRED`, `CONTRACT_SIGNED`, `PERCEPTION_UPDATED` exist | `packages/contracts/src/players.ts`, `events.ts`, read 2026-10-23 | COMPUTED (read) |
| No package reads `condition.injury`, `condition.stamina` or `inGamePenalty` today | `grep` over `packages/*/src`, 2026-10-23 | COMPUTED (read) |
| `setAttr` rounds every rating to a whole number | `packages/contracts/src/registry.ts` | COMPUTED (read) |
| The registry has 56 active ratings: 15 physical, 29 skill, 11 mental (including `volatility` and `discipline`), 1 knowledge | `registry.ts` | COMPUTED (read) |
| `TrueAttributes` is documented as read only by engine, attributes and calibration | `players.ts` | COMPUTED (read) |
| `contracts.md` §10 lists "any modifier table, target number, or formula" as deliberately absent from contracts | `docs/design/contracts.md` §10 | COMPUTED (read) |
| The generator keeps each player's measurements in `FictionalProvenance.measurements` (typed `unknown` in contracts); it draws each player's numbers from one random stream in a fixed order (measurements, age, ratings, name, draft slot) | `packages/attributes/src/fictional/generate.ts` | COMPUTED (read) |
| Speed, agility and jumping map from one measurement each (speed: 4.22 s = 99, 5.60 s = 0 on a straight line, about 0.72 points per hundredth); strength from bench and weight; acceleration and mobility blend speed and agility plus a per-player offset that is not stored; firstStep, pursuit, power, anchor, armStrength, kickPower and puntPower are drawn like skills | `derive.ts`, `profiles.ts` | COMPUTED (read) |
| Depth charts are ordered once, at generation, by attributes' `overallAt`; nothing re-sorts them. The lineup builder throws `RosterUnavailableError` when it cannot fill a spot; kicker, punter and returner share one pool, so losing the only K or the only P alone stops the game | `generate.ts`, `calibration/src/league/snapshot.ts` | COMPUTED (read) |
| The calendar year is 52 weeks: camp 3, preseason 3, regular season 18, playoffs 5, offseason 23 (4+5+4+4+6); the offseason lengths are placeholders. No preseason games are scheduled | `franchise/src/calendar/clock.ts`, `LeagueRules.weeksPerSeason`, `buildSchedule` | COMPUTED (read) |
| `runSeason` walks day by day to the end of `OFF_SUMMER` only with `through: "YEAR"`; the season command passes no `through`, so it stops at the start of the offseason | `runSeason.ts`, `calibration/src/season/realSeason.ts` | COMPUTED (read) |
| `GameResolver` returns only a `GameResult`; the resolver is built once before the season from fixed squads; season runs build no coaching staff (`makeSave` writes `staff: []`); the season command hands every event to the news desk | `runSeason.ts`, `realSeason.ts`, `main.ts`, franchise save code | COMPUTED (read) |
| Saves store players, but `--load` rebuilds squads from the world seed; resuming replays saved results without calling the resolver; `SaveFile` has no place for events | ADR-079 "Save and load", `realSeason.ts`, `runSeason.ts`, `contracts/src/save.ts` | COMPUTED (read) |
| Spec #11 designs a weekly/offseason `DevelopmentTick`; ADR-075 T7 grows players' `disguise` through it, driven by the defensive coordinator's `teaching` (ADR-075 Q4), in windows spring ~1/4, camp ~1/2, season ~1/4, with no growth in a week a player does not practise (Q7) | `coaching-staff.md` §4.4, ADR-075 | COMPUTED (read) |
| Spec #14 has no retirement section yet | `docs/design/player-personality.md` | COMPUTED (read) |
| Peak ages differ by position (running backs earliest, quarterbacks and kickers latest) | public aging-curve studies of NFL production | REPORTED (approximate; checked in D5b against nflverse snap counts by age) |
| Most NFL injuries happen in games, practice is second, injuries away from football are rare | NFL Injury Surveillance summaries, public | REPORTED (approximate; D3 measures what free data allows) |
| A torn ACL or Achilles commonly costs speed or burst after return, more for older players; a broken hand usually does not; ACL and Achilles returns take about 9-12 months | sports-medicine return-to-play literature, public | REPORTED (approximate; sizes CHOSEN in D3's table) |
| Most NFL careers end without an announced retirement: the player is not signed again | common reporting on NFL careers | REPORTED (approximate; not measured here) |
| Every number in this note's examples and splits (weekly step sizes, the 75/25 aging split, how much a coach adds, how much an ACL costs) | chosen for illustration | CHOSEN — provenance NONE; tuned in D5 |

## 1. The rulings

| # | Owner's answer (Q1-Q8 2026-10-23 18:28Z; F1-F3 20:49Z) | Where |
|---|---|---|
| Q1 | **(b) No ceiling.** "Many things affect how a player grows ... a hidden growth rate, performance, playing time, practice, coaching, and potentially storylines ... none of it ever hits any ceiling other than an attribute hitting 99." | §2. No hidden ceiling or potential; 99 is the only cap. Spec #11's "potential" term is dropped. |
| Q2 | **Ratings change every week**, with larger jumps over the offseason and training camp. A variable from age and experience lets young players improve faster. Injury is a lasting physical modifier depending on the injury (a broken hand doesn't slow a receiver; a torn ACL does). Age weighs more in the offseason because so much time passes. | §3 (weekly), §2.2 (learning rate), §4.1 (aging weighted to the offseason), §5.4 (lasting marks) |
| Q3 | (a) Playing time helps a little. | §2.3 |
| Q4 | (a) Coaches matter, small. | §2.3 |
| Q5 | **Injuries at any time**: in games (highest risk), in practice (second), and away from football in any week, offseason included. | §5. Game injuries are drawn at the final whistle until the engine can take a player off mid-game (§5.2). |
| Q6 | (a) A serious injury can leave a lasting mark. | §5.4 |
| Q7 | **(b) Retirement waits for player personality.** | §6. No general retirement rule; F2 below covers players nobody signs. |
| F1 | **No slope.** "Once a player starts climbing in age, their physical skills start to diminish. Also, young age and inexperience are two major aspects for a player's ratings going up ... once they head into the middle section of their career ... they won't continue to improve as fast ... These two effects help to create a natural curve." Most players don't last 20 years, and after 10 most struggle to keep a roster spot, let alone the game time it takes to improve. | §2.3: no slope; the natural curve comes from aging and the learning rate. The 20-year check (D5b) checks that the league does not drift upward. |
| F2 | **An unsigned player waits up to 2 seasons for a call, then retires; how long depends on his personality.** | §6.1 |
| F3 | **Starters follow the coach's personality**: some stick with incumbents even when a rookie behind them is improving, some lean to any veteran, some are cold and calculating and re-order every week by who looks best. The situation matters, for the owner's own coach as well: open competition for a spot hurts less when a player goes from starting to benched; a starter who returns from injury to find his backup has taken the job is hurt less than one suddenly demoted; a sudden mid-season demotion for no reason can strain the relationship. The same for the owner's team and computer teams. | §3.1. The relationship strain is ruled but waits until players hold views of their coach (ADR-084's later step with Spec #14); this build moves morale and records every change (E5) so the strain can be applied then. |
| Q8 | (a) Off by default until the owner has seen the checks. | §9, D5 |

## 2. Getting better and worse: no ceiling

### 2.1 What each player carries (all hidden)

- **Growth rate**: his own, fixed for life. How much he gets out of what he does. A high growth
  rate turns the same practice, snaps, coaching and workouts into bigger gains, and later slows his decline
  because he keeps adding while his body loses.
- **Experience**: *career snaps* (hidden, they feed his smarts). His credited seasons in the league
  are public and live on his bio (ADR-085 K5, `PlayerBio.creditedSeasons`, which the cap and draft
  threads use for minimum salaries and waivers); development reads them from there.
- **Unshown progress**: ratings are whole numbers, but a week's change is a fraction of a point.
  The fraction is kept per rating and the rating moves when it adds up to a whole point, so small
  weekly steps are never rounded away.
- **His body now**: 40, 3-cone, vertical, bench. His weight is the public listed weight on his bio,
  which changes as he trains.

There is no ceiling. A rating climbs as long as what he does keeps pushing it up, and stops at 99.

### 2.2 Learning rate: age and seasons

Each week's gains are scaled by a learning rate built from age and credited seasons. It is
highest for a young player in his first seasons (a rookie learns fastest), falls through the
mid-20s, and is low but never zero for a veteran.

D5b tuning round 1 (2026-11-01) set the speeds (`LEARNING_RATE`): about 0.58 of the full rate for a
rookie of 22, 0.28 in his second season, 0.19 in his third, and close to the floor, 0.15, from his
fourth. Most of a career's learning comes in the first two seasons. The first speeds (full until 22,
then slowly down to 0.1) let players keep climbing through their mid-20s, about twice the real
league's rise by age, and the stand-in league's average rose 4.4 points in 20 seasons.

### 2.3 What moves each rating

Every rating belongs to one group (all 56 active ratings, plus `disguise` when ADR-075 adds it):

| Group | Ratings | What moves them |
|---|---|---|
| **Body** | speed, agility, jumping, strength | only his body: age, workouts, injury (§4, §5.4). So his ratings and his 40 always agree, as ADR-079 requires |
| **Body plus practice** | acceleration, mobility, firstStep, pursuit (follow speed and agility), power, anchor (follow strength) | the change in his body, plus a smaller share of the practice, play and coaching gains below |
| **Own curve** | armStrength, kickPower, puntPower, stamina, durability | grow a little while young (workouts, practice); hold late (arm into the late 30s, kicking leg into the 40s); stamina fades in the 30s; durability falls with age and repeat injuries (§5.4) |
| **Skills** (29) | accuracy, route running, coverage, blocking, catching, tackling and the rest; `disguise` when it exists | the inputs below; fade slowly in the 30s as learning slows and the body declines |
| **Smarts** | awareness, reaction, decision making, pocket patience, poise, play recognition, instincts, vision, patience, football IQ | the inputs below plus career snaps directly: they keep rising slowly into the 30s, which keeps the clever old safety on the field after his speed has gone |
| **Not moved yet** | volatility, discipline | they are personality; they wait for Spec #14 |

The inputs, each week:

| Input | Example | Notes |
|---|---|---|
| **Practice** | the default week of reps; heaviest in camp and OTAs | a player who doesn't practise (injured) gets no practice gain that week; a limited one gets part. Later the owner's weekly practice plan (install vs reps vs rest) becomes the knob: more reps, more growth and more practice injuries |
| **Playing time** (Q3) | a starter gains a little more than a backup | from the game's report of who played (§10) |
| **Performance** | a corner who wins his matchups gains a little more in coverage; one beaten repeatedly gains less and can slip | from the same report |
| **Coaching** (Q4) | the best staff against the worst is worth about one rating point a year at the full learning rate; with D5b's speeds (§2.2) that is about 0.6 of a point in a rookie's year and 0.3 in his second, so coaches still matter, a little (the `COACHING` table itself is unchanged) | the coordinator on his side of the ball, through his `development` skill (special teams coordinator for K, P, LS). For `disguise`, the defensive coordinator's `teaching`, in ADR-075's windows (spring ~1/4, camp ~1/2, season ~1/4), as the owner ruled there |
| **Storylines** | a mentor taking a rookie under his wing; a player distracted by a contract fight | later, through a channel the story side can write to (its own petition) |
| **Morale** | an unhappy player develops a little slower | later: Spec #14 §3 makes morale a development-rate modifier; not in this build |
| **Wobble** | a small random step each week | from the season seed, so the same seed always gives the same careers |

**No slope near the top (F1).** Every point costs the same wherever a rating stands. What keeps the
league from climbing into the 90s is the natural curve the owner described: the learning rate is
high only while a player is young and new, falls through the middle of his career, and his body
declines with age; and few players keep a roster spot, let alone the snaps that drive growth, past
about ten seasons. The 20-year check (D5b) shows the spread of ratings year by year to confirm it.

### 2.4 Spec #11's development tick

This is Spec #11 §4.4's `DevelopmentTick`. Kept: the coordinator's effect, age, snap experience.
Dropped by Q1: potential. Deferred: the head coach's effect, position coaches (ADR-080 left them
out), scheme fit and Spec #11 §5's style match, each plugging into the coaching input later.
ADR-075 T7 (players' `disguise` growth) plugs into this same week as a skill, as above.

### 2.5 Starting values

**Real-player stand-ins** (the owner's cap-thread ruling: copy the real current NFL in every way
except name and likeness), from free data only:
- *copied*: age, credited seasons, career snaps, listed weight, current injuries, injury history (which sets
  `durability`);
- *estimated*: his body today (his combine or pro-day numbers aged forward from when he tested, by
  §4's curves; for a player who never tested, a typical body for his position, size and age,
  refined by public tracking speeds where they exist); his growth rate (from how his playing time
  and production rose year to year for his age; a rookie or second-year player with no record
  gets a draw typical for his age and draft slot).
Because §4's curves set every veteran's starting speed, they are tuned in D5 before stand-ins are
built.

Where these come from in the stand-in league file (PR #32, `packages/attributes/leagues/standin-2026-10-23.json`,
as of 7d4024c): age and listed weight in the bio; credited seasons in `provenance.creditedSeasons`;
combine drills in `provenance.measurements`, with drills he never ran filled by his position's
average and listed in `provenance.ratings[id].imputed` (those are aged as averages, not as his own
numbers); career snaps, games played over the last five seasons, reserve status and his latest
2026 injury in `provenance.history[playerId]`. Known gaps: snaps before 2012 are missing, so older
veterans' career snaps run low; "games missed" counts healthy scratches as missed, so durability
reads only the games missed while on an injury report or a reserve list; a player on a reserve list
starts out with a length drawn from the reserve type (IR, PUP, NFI, designated to return), and his
latest injury report sets the body part where it is recent enough not to have healed.

**Made-up players** (the generator and the draft thread's prospects): growth rate drawn; career
snaps 0 for rookies, from age for generated veterans; body from the measurements the generator
already draws.

## 3. Every week, all year

Every player has a development week once a calendar week, 52 a year, in order. Aging always follows
the calendar (§4.1), the same for everyone. What else the week holds depends on the time of year
and on whether he is with a team that is still playing:

| When | What the week holds besides aging |
|---|---|
| Offseason: evaluation, free agency, draft (13 weeks) | workouts (strength, weight, and small body gains while young), away-from-football injuries |
| Offseason: rookies and OTAs (4) | practice reps (skills, larger for rookies), coaching, practice injuries, workouts, away injuries |
| Offseason: summer (6) | light workouts, away injuries |
| Training camp (3) | the heaviest practice of the year: the biggest skill moves, coaching, most practice injuries, away injuries |
| Preseason (3) | practice and away injuries (practice only, since no preseason games are scheduled yet) |
| Regular season (18) and playoffs (5) | practice, playing time, performance, coaching; game, practice and away injuries |
| After his team's season ends (missed the playoffs, or knocked out) | as the early offseason: workouts and away injuries; no practice, snaps or coach |
| A free agent, all year | the same: workouts and away injuries only |

The season loop runs these weeks itself; the draft thread's draft day, undrafted signings and trim
to 53 happen inside the same loop at their dates, so no week ever runs twice.

### 3.1 Who starts: the coach's style and the situation (F3)

Each week every team sets its depth chart, a COACH-authority decision (Iron Rule 6). Each
coordinator ranks the players on his side by how good he thinks they are; the head coach decides,
leaning the way his personality leans. An improving rookie can win a job and a declining or injured
starter can lose one, but how quickly depends on the coach.

**His leanings.** Every head coach has three, set by his personality type with some variation of his
own (the type-to-leaning mapping is proposed, not ruled):

| Leaning | What it does | Strongest in (proposed) |
|---|---|---|
| **Sticks with the incumbent** | the starter keeps the job until someone is clearly better, not just a little, even while a rookie behind him improves | players' coach, quiet |
| **Leans to veterans** | any veteran (incumbent or newcomer, star or journeyman) gets the nod over a younger player of about the same level | demanding, quiet |
| **Plays who looks best** | cold and calculating: re-orders every week by who looks best right now | cerebral |

A fiery coach (proposed) has his own habit, read from his personality type rather than a fourth leaning: a quick hook, benching a starter after one bad game.

**Who looks best** is the coordinator's read: the player's recent form (his last four weeks' game
grades from the who-played report, P4, and his weekly practice grades, so a backup who seldom plays
is still seen; the practice grade is made by the depth-chart step itself, so it exists with
`--injuries` alone) and his ratings as the coordinator judges them. Until scouting
exists, that judgement is the true rating seen through a blur set by the coordinator's
`talentEvaluation`, the same blurry lens ADR-080 Q6 uses for hiring; perception replaces it later.
When the head coach starts a player over his coordinator's pick, ADR-084 §5.1's move "start a player
over his pick" applies to the coordinator's view of him.

**Open competition.** A spot is open when the coach says so: at camp, when his coordinator rates two
players there as close; at any time for a coach who plays who looks best, since on his team every
spot is open all season and his players know it (the owner: open competition "can be normal").
Incumbent-loving coaches rarely open a spot. A battle ends when the coach names a starter.

**The situation, and how the player takes it.** Each change is labelled by what the player himself
can see: his own recent form, his injury, and whether the spot was declared open. The coach's private
read does not set the label, so a coach who misjudges and benches a starter in good form has made a
sudden demotion, whatever he thought.

| Situation | Example | How much it hurts the player who loses the spot |
|---|---|---|
| **Open competition** | the two players in a declared battle swap weeks | little (ruled: less than a sudden demotion) |
| **Injury cover** | the starter is hurt and his backup moves up | none |
| **Starter returns** | the starter is healthy again and takes his job back from the backup | little, for the backup (proposed) |
| **Kept after injury** | the starter comes back and his backup, who played well, keeps the job | some (ruled: less than a sudden demotion) |
| **Benched for form** | a starter whose own form has dropped over recent weeks loses the job | moderate (proposed) |
| **Sudden demotion** | mid-season, no declared battle, a healthy starter whose own form has not dropped is benched | a lot, and it can strain his view of the coach (ruled) |

Also proposed: the player who gains a spot gets a small lift; the sizes are scaled by each player's
`volatility` rating (the registry's "rate morale moves in both directions").

**Feelings, now and later.** In this build each change moves the player's morale (`MORALE_CHANGED`,
already in contracts). That per-change hit is a placeholder: Spec #14's weekly need terms (playing
time, role clarity, positional competition, which is exactly the open-battle case) replace it when
player personality is built. The strain on his view of the coach is ruled (F3) but needs players to
hold views, which ADR-084 left for its later step with Spec #14; every change is recorded (E5) so that
system applies the strain when it exists.

**The owner's team.** He has no staff record and is not rated (Spec #11 §1; ADR-084 V1), so his
leanings come from his own personality: ADR-083's main trait, read the same way as a computer head
coach's type, with no personal variation. Until ADR-083 is built, his team uses even leanings (the
middle of all three). His coordinators' reads are blurred like everyone's. While the staff sets his
chart the decision is recorded as made by the computer for him; once he can set his own chart in the
game he decides, and the same labels and feelings follow from his choices.

## 4. Aging

### 4.1 More of it in the offseason

Each position has a yearly aging amount (how much the body loses at each age past its peak). About
**three quarters of it lands in the 23 offseason weeks** and a quarter is spread thinly over camp,
preseason, season and playoffs (CHOSEN, tuned in D5). It follows the calendar for everyone: a free
agent and a champion of the same age lose the same amount in a year. Each phase's share is divided
by that phase's length, so changing the calendar's placeholder week counts does not change how much
a player ages in a year.

### 4.2 The body ages through its measurements

ADR-079 pins physical ratings to measurements. Aging moves the measurements, and the ratings follow
by the change, so each player's own quirks from generation (acceleration and mobility carry one)
survive.

Example: a running back runs a 4.45 at 24 (speed 82). Past his position's peak his 40 slows, mostly
over each offseason: 4.47 at 28 (81), 4.51 at 29 (78), 4.57 at 30 (74).

Workouts can still add a little at any age, but the gain shrinks as he gets older. Before his
position's peak it can take a few hundredths off his 40 or add to his vertical; past the peak it is
smaller than what age takes away, so speed, agility, jumping and strength mostly fall. Nothing caps
them except 99; it is the body getting older.

Each position gets a peak age and decline speed, checked in D5b against real careers. A high growth
rate offsets part of the decline (§2.1); the body still ages.

## 5. Injuries, at any time

### 5.1 Three settings

| Setting | When | Risk |
|---|---|---|
| **Game** | every game (regular season and playoffs; preseason once preseason games exist) | highest; depends on snaps, position, `durability`, age, and a recent return from injury |
| **Practice** | every week with practice: OTAs, camp, preseason, in season | second; heaviest in camp; depends on position, `durability`, age, the week's workload |
| **Away from football** | every one of the 52 weeks, for every player, free agents too | rare |

Rates and lengths by position come from free real data where it exists (nflverse weekly injury
reports, including practice participation; published NFL injury summaries for the game/practice
split). D3 lists every number with its source or marks it CHOSEN.

### 5.2 Game injuries: at the final whistle for now

The owner ruled games the highest risk, and game injuries are in from the start. Taking a player off
*during* a game (he limps off in the second quarter, the backup finishes) needs the match engine to
stop using him partway, an engine change that would move measured numbers. So until the engine
work and the pocket fix (backlog 100) are done, a game's injuries are drawn at the final whistle
from who played and how much, at the same rates, and count from the next game. When the engine can
do it, the draw moves inside the game and replaces this; season totals should barely change.

### 5.3 How long, playing hurt, and next man up

Length bands, in weeks lost:
- **day to day** (0): he plays, slightly worse;
- **short** (1-3);
- **long** (4-8; injured reserve once the cap thread adds it);
- **major** (9 or more). An ACL or Achilles takes about 9-12 months: one torn in February can still
  keep him out in November; one torn in June costs the whole season.

Injuries are public, as on real NFL injury reports: who is hurt, how, and for about how long. What
an injury will cost him for good (§5.4) is hidden.

*Playing hurt*: each kind of injury lowers the ratings that body part uses while it heals (an ankle
lowers speed and agility, a hand lowers catching). He plays that week with those ratings lowered;
the game itself is unchanged.

*Next man up*: the injured player comes off the depth chart until healed. Before every game the team
checks it can field every spot. If it cannot (all three quarterbacks hurt, or the kicker or the
punter out), it signs an emergency stand-in that week, so the season never stops. Injured reserve,
real replacement signings and their money belong to the cap thread (ADR-085), which replaces this
stopgap.

### 5.4 Lasting marks (Q6, and Q2's "depends on the injury")

Each kind of injury carries its own lasting effect, applied when he returns:

| Kind (examples) | Lasting effect |
|---|---|
| Broken hand, sprained ankle, most muscle strains | none: he comes back as he was |
| Torn ACL | 40 and 3-cone a little slower for good, vertical a little lower |
| Torn Achilles | larger: acceleration and firstStep lower, 40 slower, vertical lower |
| Repeated injuries of the same kind | `durability` lower |

The same tear costs an older player more (older bodies come back slower), and it adds to the loss
he is already taking from age: a 29-year-old back who tears his ACL ends up much slower than a
23-year-old with the same injury. Sizes are CHOSEN in D3 from the return-to-play literature and
tuned in D5.

## 6. Retirement: waits for personality (Q7)

No general retirement rule in this ADR. When player personality (Spec #14) is built, the choice to
retire will come from the player's needs, body and contract (`franchise-calendar.md`'s retirement
windows, spring-bonus pressure), through `PLAYER_RETIRED`. Spec #14 has no retirement section yet;
whoever designs personality writes it.

### 6.1 Players nobody signs (F2)

A player without a team (released, contract run out, or never signed) waits **up to two seasons**
for a call, then retires. How long he waits depends on his personality. He may decide at two moments
each year: when camps open (the calendar's late-retirement window) and when the regular season ends.
His patience is counted from the day he became unsigned (kept in the free-agent record, ADR-085; until that exists, in S1's step memory); he retires at the first of those moments
after it has run out, and in any case once two regular seasons that began after he became unsigned
have ended. He retires with `PLAYER_RETIRED`, reason `UNSIGNED` (E4).

Until player personality is built, every personality sheet is the flat placeholder (ADR-079 Q7), so
his patience is a hidden draw between none and two seasons, stored on his personality sheet (P6) and
replaced by his needs once Spec #14 says which of them set it. The draft and cap threads use the same
rule for their free-agent pool.

## 7. Hidden information

Growth rate, unshown progress, today's body and an injury's lasting cost are hidden truth, kept in
`TrueAttributes` (P1), not in the public bio. The bio keeps a frozen public combine record (P2),
since real combine numbers are public; it never changes after the draft. Listed weight and
injuries are public, as in the NFL.

The rating-change events (E1, E3) carry true values and are **truth-layer events**: kept for
calibration, saves and franchise's own checks, filtered out before the news desk and never shown in
the UI or read by computer teams' decisions. Fans, the news and other teams learn of changes only
through perception (`PERCEPTION_UPDATED`) once it is built; until then the news writes no
"breakout" or "lost a step" stories.

Four franchise steps read true ratings until perception exists: the development week, the injury
draws (true `durability`), the coordinators' read for the depth chart (§3.1, through their blur) and
the morale step (true `volatility`, §3.1). D1 names all four in the `TrueAttributes` reader comment. The unsigned-retirement check (§6.1) reads
only the personality sheet.

## 8. Contracts edits this needs (each needs the owner's typed yes)

| Id | Edit | Why |
|---|---|---|
| **P1** | `TrueAttributes.development?: { growth: number; snaps: number; carry: Partial<Record<string, number>>; body: { forty: number; cone: number; vertical: number; bench: number } }` (optional; absent = the player never changes, today's behaviour) | §2.1, §4. Prospects carry `growth` and `body` |
| **P2** | `PlayerBio.combine?: { forty?: number; cone?: number; vertical?: number; bench?: number }`, frozen at the draft | the public record (§7) |
| **P3** | `Injury` gains `setting: "GAME" \| "PRACTICE" \| "AWAY"`, `band: "DAY_TO_DAY" \| "SHORT" \| "LONG" \| "MAJOR"`, `since: CalendarStamp` | availability, reports, lasting marks |
| **P4** | `GameParticipation { player; team; snaps: { offense; defense; special }; contests: { attr; won; lost }[] }`, returned with each game | who played and how (§10) |
| **P5** | **an amendment to `contracts.md` §10**, which today keeps formulas out of contracts: the measurement scales (4.22/5.60 s, 6.50/8.10 s, 22/44 in, the strength formula) and the position profiles with their overall (which ratings each position leans on), as data with small readers beside `getAttr` | the generator, the draft's class maker and franchise (aging, depth-chart sort, the draft's trim) all need the same scales and overall; each domain may import only contracts, so it is one shared copy or several. These are ADR-079's ruled anchors, which rarely change; any change to them would come back to the owner as a contracts edit. The aging curves and injury table, which D5 tunes, stay in franchise |
| **S1** | `SaveFile.world.development?: { events: FranchiseEventEnvelope[]; depthMemory: unknown }` | every event the development, injury, depth-chart and retirement steps emitted (truth-layer and public) and the emergency signings' `CONTRACT_SIGNED`, plus the step memory: what §3.1 needs (open battles, who started before an injury, each starter's weeks in the job, the last four weeks' grades) and when each free agent became unsigned, so a loaded season carries on exactly (§10). `depthMemory` is franchise's own shape, typed `unknown` like the other open save slots |
| **E1** | `RATINGS_CHANGED { team?: TeamId; changes: { player; attr; from; to }[]; body?: { player; measure: "forty" \| "cone" \| "vertical" \| "bench" \| "weightLb"; from; to }[] }`, truth-layer: one per team per week, plus one for free agents; whole-point rating moves and body changes from practice, play, coaching, workouts and aging (injury marks are in E3, not here); the week is the envelope's `at` | every change on the event stream (Iron Rule 3); about 1,700 events a year (33 × 52) |
| **E2** | `INJURY_OCCURRED` gains `setting`, `band`, `game?: GameId`; public | when, where and how bad |
| **E3** | `INJURY_HEALED { player; lasting: { attr; from; to }[]; body?: { measure; from; to }[] }`, truth-layer | the one record of a lasting mark |
| **E4** | `PLAYER_RETIRED` gains `reason?: "UNSIGNED"`, and its `timing` gains `"SEASON_END"` (the camp-opening moment uses the existing `"LATE"`) | an unsigned player retiring (§6.1); later personality-driven retirements leave the reason out or add their own |
| **C1** | `StaffState.lineup?: { incumbent: number; veteran: number; form: number }` (0-100 each), drawn for computer head coaches from their personality type by `buildStaff` on its own random stream (existing coaches unchanged) | the coach's three leanings (§3.1). The owner's team reads ADR-083's main trait instead |
| **E5** | `DEPTH_CHART_CHANGED { team; position; up?: PlayerId; down?: PlayerId; situation: "OPEN_COMPETITION" \| "INJURY_COVER" \| "STARTER_RETURNS" \| "KEPT_AFTER_INJURY" \| "FORM" \| "SUDDEN" }`, `POSITION_BATTLE_DECLARED { team; position; players: PlayerId[] }` and `POSITION_BATTLE_ENDED { team; position; starter: PlayerId }`, public; each is a COACH-authority decision, `decidedBy` NPC unless the owner set it | why each change happened, for morale now and players' views of the coach later |
| **P6** | `PersonalitySheet.patience?: number` (0-2 seasons), the placeholder until Spec #14's needs set it | §6.1 |
| **D1** | `contracts.md` wording for the above; the `TrueAttributes` reader comment (§7's four franchise readers of truth); `contracts.md` §3 truth-layer note; the `contracts.md` §10 amendment (P5) | documents |

No change to `GameResult` or the engine's types.

§12 adds P7, E6, P8 and W1 (§12.2.2, §12.4.1, §12.3.7, §12.8), and lists the edits not yet approved
as NEW-1 to NEW-4 (§12.10).

## 9. Build plan

| Step | What | Moves sim output? |
|---|---|---|
| D1 | contracts P1-P6, S1, C1, E1-E5, D1, on the owner's typed yes naming each | no |
| D2 | the development week: a pure function in `franchise/src/players/` (players + week → changed players + events): learning rate, the inputs and groups of §2.3, aging with the offseason split, workouts. Generator draws the growth rate from its own random stream and fills the new fields only when development is switched on. Tests: same seed gives the same events; nothing past 99; an old player loses more over the offseason than over the season; a free agent and a rostered player of the same age age equally; every active rating is in exactly one group; the generated league is unchanged with the switch off | no (not called yet) |
| D3 | injuries: three settings, length bands, kinds, playing-hurt penalties, lasting marks (tests: a hand injury leaves the 40 alone, an ACL does not), emergency signings; rates measured from free data first, every number listed with its source | no (not called yet) |
| D4 | wire it in (§10); the weekly depth chart by each coach's style, with its labels and morale effects (§3.1), on whenever either switch is on, since either one changes who can play; unsigned players retiring (§6.1), on with either switch wherever there are free agents; switches `--development` and `--injuries`, both off by default | season runs only, and only when switched on |
| D5a | single-season checks, available after D4: a season's injuries by setting and position against real ones; how far players move in a season; the starter-vs-backup gap (Q3 says "a little"); ADR-079 R5's win spread re-measured in three arms (development alone, injuries alone, both). If the spread moves, a retuned team-strength setting applies only with the switches on, or lands with Q8's default flip | season runs only |
| D5b | the 20-year check, once the draft thread's year turnover (ADR-086) and the cap thread's cuts and free-agent pool (ADR-085) exist: whether the ratings spread stays like today's year after year (F1's natural curve; any drift is tuned through the learning rate, the aging curves and the playing-time share, never a slope, and reported to the owner), roster ages, peak ages and career lengths by position against the NFL, and how often unsigned players retire after one season or two. Run on the generated league until the stand-in importer exists. Then, on the owner's yes, both switches on by default (Q8) | season runs only |
| later | injuries during the game (engine, §5.2); preseason games; the weekly practice plan; storyline effects; morale slowing development; the strain a sudden demotion puts on a player's view of his coach (ruled F3, needs players' views); retirement with personality; head coach and position coaches; scheme fit and style match | engine held |

## 10. How it plugs in (for builders)

The draft thread built the shared season walk on PR #31 (`franchise/src/season/people.ts`, agreed
2026-10-23); this ADR plugs into it.

- **One loop.** `runSeason` takes `people` (`LeaguePeople`: teams, players, picks, classes,
  `freeAgents`, `staff?`) and `daySteps`. Steps run once for every calendar day the clock passes,
  games or not, after that day's games and before the clock moves on or the run stops. Development
  is a `DayStep` that acts on each week's last day; the depth chart and injury steps are DaySteps
  too. The year turn (age +1, credited seasons) is the draft thread's `runYears`. Nobody else calls
  the development week. With `--development` or `--injuries` on, the season command runs
  `through: "YEAR"`; with both off it stops where it does today.
- **Staff**: `people.staff`, built inside franchise from the season seed with its own `buildStaff`
  (calibration's permitted imports do not change).
- **Emergency signings** come from `people.freeAgents`. Before each game the season runner, which
  owns the lineup rules (`snapshot.ts`'s fallback chains), checks each team can be fielded; if not,
  the team signs the best fit from the free agents, recorded with `CONTRACT_SIGNED`. Until the cap
  thread's pool fills `freeAgents`, calibration seeds it at season start with players made by its
  permitted `generateLeagueRosters` from a reserve seed.
- **The resolver** receives the current `people` (its third argument), skips unavailable players,
  takes the playing-hurt penalties off that week's copies of their ratings, and returns
  `{ result, extras }` with the who-played report (P4) in `extras`; steps read it from `ctx.games`.
  Calibration's season runner builds the report from the match events (it may read the engine,
  ADR-012); franchise reads only the report and never parses engine-shaped play events (Iron Rule 1).
  P4 is needed for performance and for §3.1's form and labels, so it is part of D1.
- **Depth chart**: coordinators' reads use P5's position overall plus form; the draft's trim uses the
  same overall.
- **Randomness**: coach leanings are drawn once by `buildStaff` (C1) and patience once when a player is created (P6), each on its own stream; every weekly draw (development, injuries, practice grades) is forked from the
  season seed by week and player, so a resumed run draws exactly what a straight run would.
- **Saves.** With either switch on, a save stores `people` as they are that day (players, current
  depth charts, emergency signings), every event the steps and the emergency signings emitted, and the step memory (S1).
  `--load` uses those people instead of rebuilding from the seed; `stepsDoneThrough` stops a resumed
  run repeating a day; resuming re-emits those saved events up to the save day. The saved games'
  inputs are not needed again: each day's steps have run by the time a save is made. `readSave`'s
  check replays without the steps. The save-and-load check (stop at week 9, load, finish) must give a
  byte-identical season with both switches on.
- **Truth-layer events** are filtered out in the season command's event hook before the news desk,
  and the game viewer never loads them.

## 11. Build notes (D1-D4 built, D5a measured, 2026-10-24)

Built as §9 and §10 lay out, with these choices the design left to the build (CHOSEN unless marked):

- **Street free agents.** Until the cap thread's pool fills `freeAgents`, calibration's season runner
  starts each switched-on season with three made-up reserve squads (`FA1`-`FA3`, from the world seed's
  own `/free-agents` stream), less each position's best man wherever a backup stands behind him: 114
  players, specialists included (`reservePool`).
- **Emergency signings** happen on the last day of a week for teams with a game the next week (in
  the week before the playoff field is set, every team; never in the offseason), after that day's
  injuries. The side's coordinator picks by his blurred read (`readBlur`, the depth chart's read),
  not by true ratings (§7). One-year minimum; neither the 53-man limit nor the cap is checked (the
  cap thread's in-season signings replace this stopgap). The lineup check asks for a kicker or a
  punter by name before the snapshot would let one stand in for the other, so a hurt kicker brings
  in a kicker.
- **Practice-squad call-ups before street signings** (Orchestrator's ruling, 2026-10-24). A team
  short of a player calls up the best fit man on its own practice squad (`Team.practiceSquad`) first,
  as real teams do, by the same coordinator's read (one listed at the position first, then anyone,
  listed there from now on): he moves to the roster and that position's depth chart, a
  `CONTRACT_SIGNED` one-year minimum like the street signing (a called-up squad player signs a
  standard deal; no new event or field). Only when nobody on the squad is fit does the team sign off
  the street, with one exception (build choice, for the Orchestrator to confirm): for a kicker,
  punter or long snapper, a specialist off the street comes before a squad man of another trade
  (squad at the position, street at the position, squad anyone, street anyone), so a hurt kicker
  brings in a kicker while there is one to sign. Read literally, the ruling had 16 of spread-17's 20
  kicking signings (`--injuries`) go to men who were not specialists (a defensive tackle kicking)
  while the street's three kickers and three punters sat unsigned; with the exception it is 11 of
  20, all from week 7 on, once those six are signed (only 8 of the 32 squads carry a specialist). A
  bigger street, or letting the punter kick, would close that; neither is built. Why: the stand-in
  league makes about 90-100 emergency signings a season (the made-up league 49), the 114-man street
  ran dry, and `player-checks --league` crashed on seed spread-17 in the playoffs (T32 could not
  field a right guard). With a switch on, the stand-in loader gives each team its practice squad from
  the file (`provenance.practiceSquad`, the file's order; switched off, none, so those runs are
  unchanged); spread-17 with `--injuries` now plays through, with 115 call-ups and 6 street signings
  (those specialists). `player-checks`
  keeps a called-up man in his file group (practice squad) but counts him in the like-for-like
  injury tables from his call-up on, as it counts a street signing, and reports the call-ups among
  the emergency signings; like a street signing's, his injuries are filed under the position he held
  at camp. The loader refuses a squad entry that is not of status "practice" in the file, so the two
  agree. The generated league has no practice squads yet (cut-down day fills them, but the season
  runner does not run it), so it signs from the street byte for byte as before and its D5a numbers
  do not move. Where a contract book is kept, the call-up ends the man's live practice-squad deal
  with that team at the call-up day, reason `EXPIRED` (the draft thread's suggestion): no dead-money
  charge, since a squad deal has no bonus, and no event of its own, the `CONTRACT_SIGNED` tells it.
  His new minimum is then his one live deal: `liveContract` finds it, a later `release` ends it, and
  `teamCapTotal` counts one deal for him that season (an ended deal stops counting in the league
  year it ends, so the squad deal's pay is not counted at all, and the minimum counts in full, as
  every in-season signing does here). With no live squad deal for him with that team on the book,
  nothing more changes; street signings are unchanged. A truer reason, such as `PROMOTED`, would be
  an edit to `ContractEndReason`, which the cap thread owns, and needs the owner's typed yes; it is
  not done. Calibration keeps no book, and nothing that keeps one calls players up yet.
- **The players' signings take the year's one cap** (2026-10-31, after main's draft part 2, ADR-086,
  came in). An emergency signing's one-year minimum is priced by the players' steps' own `cap`
  (`PlayerStepsConfig.cap`, ADR-085's forecast); when they have none, `runSeason` gives them the cap
  it shares for every deal the year signs (since PR #44): `draft.cap`, else the league year's
  (`leagueYear.cap`, ADR-085 step 5), and with neither it is flat at the rules' cap, the draft's
  default (`flatCap`). `players.steps.test.ts` checks the order: the league year's cap when the draft
  has none, the draft's when it has one, and the players' own over both.
  Up to the CBA's last season (2030) the minimum is the CBA's table and the cap moves no number;
  past it the table grows with the cap, and the signing used to stop there ("needs the cap"), so a
  league with both the players' steps and the draft now runs past 2030. With the draft part 2,
  `runSeason` with both does keep a book and call up the squads cut-down day fills (the bullet above
  predates it); `players.draft.test.ts` plays two such seasons and checks what the call-ups own.
  Six snags found when the two met, and with the league year, sat in the draft's code; the draft
  thread fixed them in PR #44: the year turn (`turnYear`) left a squad man's practice-squad deal open
  beside his reserve/future deal; cut-down day dropped a squad a team started with (the stand-in
  league's); the free agents' order after a save and load was not a straight run's; the compensatory
  formula's league averages counted ended deals; undrafted rookies were credited a season or two
  too many; and the draft did not take the league year's cap.
- **The who-played report** credits a snap to every player a play card names and to the offence's
  quarterback on every scrimmage play (a run card does not name him). Kicks credit the kicker or
  punter and the returner only: the engine has no coverage or return units yet.
- **The stand-in league** (ADR-088) runs with `--injuries` but refuses `--development` until its
  players get growth rates and bodies (§2.5); without them none of them would change. (Since
  "Stand-in records, step 1" below, it runs with both.)
- **The game injury rate** stays at its MEASURED per-snap value (`INJURY_RATES.game.perSnap`, fitted
  on franchise's model season with NFL snap counts). It is not refitted to the real sim's per-game
  total, for the reason below.
- **Saves.** `--load` reads the switches from the save and refuses them on the command line. As on
  main before this build, an `--out` file written after `--load` differs from a straight run's only
  in its `league` header's staff lists (a loaded save carries the staffed teams); the season, its
  events and its players match.

**Proofs.** `pnpm verify` passes. With both switches off, `season --seed homie-1 --out` and
`--stop-after 9 --save` are byte-identical to main (ba1f0e3). With both on, a week-9 save and load
carried to the end of the league year gives a save identical in every field to a straight run's,
every rating change and injury included.

### D5a: one season with the switches (`reports/player-checks.md`)

20 seasons per arm on ADR-079 R5's seeds, generated squads, caller v7 (the default). The `off` arm is
today's league: its 2.81 win spread is below R5's 3.02 because R5 was measured with an older caller.

| | Win spread | Best | Worst | 13+ wins | 4 or fewer | Better record wins |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 | 13.8 | 2.8 | 10.0% | 14.0% | 74.0% |
| off | 2.81 | 14.5 | 2.6 | 6.4% | 8.8% | 71.3% |
| development | 2.93 | 14.7 | 2.5 | 10.3% | 8.1% | 71.7% |
| injuries | 2.78 | 14.4 | 3.3 | 8.6% | 7.2% | 70.9% |
| both | 2.62 | 14.3 | 3.3 | 7.0% | 5.3% | 69.3% |

- **Win spread.** Against `off` on the same seeds: development +0.12 (1.8 standard errors), injuries
  -0.03 (0.5), both -0.19 (2.6); the better record wins 2.0 points less often with both (3.0
  standard errors), and neither switch alone moves it beyond luck. So with both on the league is a
  little more even, further from the NFL. §9 lets the retuned team-strength setting apply either with
  the switches on or with Q8's default flip; the build takes the default flip, since D5b re-measures
  the spread over 20 years with the draft and the year turnover, which a single season cannot show.
- **Injuries against the NFL**, like for like (players on a team, begun between his team's games, per
  team interval, football injuries only): time-loss 1.83 a team-game against 2.02 (the real seasons
  ran 1.87-2.16; ours 1.70-1.96), with illness and accidents 1.91 against 2.09, day-to-day 0.73
  against 0.78. Lengths match (short / long / major 58.5% / 18.8% / 22.6% against 57.9% / 19.2% /
  22.9%), and so do players out 4+ games with an injury begun in the season (8.9 a team against 9.4).
  By position, quarterbacks (0.067 against 0.062) and linemen (0.344 against 0.341) match; linebackers
  (0.147 against 0.277), backs, tight ends and defensive backs are low, defensive linemen and
  receivers high. The mix follows the snaps the sim gives each group (16 games measured, snaps per
  team-game against the NFL's 2019-2024: QB 1.22×, RB 0.98×, WR 1.23×, TE 0.85×, OL 1.15×, DL 1.34×,
  LB 0.64×, DB 1.01×, K/P 1.22×; all 1.05×): it plays about 75 downs a team against the NFL's about
  63 and has no kick-coverage or return units, and its defence fields more linemen and fewer
  linebackers. Weighted for special teams, the exposure comes out about equal, so per snap the sim
  hurts about 10% fewer players than the measured rate. The likeliest reason is age: the generated
  squads (ADR-079) average 24.2 years, with 33.5% aged 21-22 and 2.4% aged 31 or more, against the
  real 2026 rosters' 26.3, 6.8% and 10.4% (the stand-in league file), and older players get hurt
  more. So the per-snap rate is left as measured. The made-up league's youth also inflates the
  league-wide rise below; D5b should run on the stand-in league, with real ages, once its players
  have growth records (§2.5). Players out 4+ weeks by any onset come to 10.5 a team against 15.5: the
  sim has no preseason games (about half of the 6.2 new injuries a real team has at week 1) and starts
  every league healthy (no carry-over from a previous season, 1.7, or the non-football list, 0.4).
- **How far players move in a year** (position overall, start of camp to the end of the league year,
  development arm, starters / backups): 21-22 +3.4 / +2.7; 23-24 +2.1 / +1.7; 25-26 +1.2 / +1.0;
  27-28 +0.7 / +0.5; 29-30 +0.1 / -0.1; 31-32 -0.9 / -1.1; 33+ -1.7 / -2.0. Injuries alone move
  ratings by a few hundredths (lasting marks).
- **Starters and backups.** The gap (11.3 points at camp) widens a little over the year with growth
  alone (+0.35) and hardly with both (+0.08), since hurt starters' backups play and grow. Q3's "a
  little" holds. Over one year the whole league rises (starters +1.9, backups +1.6) because nobody
  leaves, no rookies arrive and the made-up league is young; D5b checks the steady state.
- **Depth charts and the street.** With injuries on, about 49 emergency signings a season (1.5 a
  team), 27 injury covers and 25 starter returns per team-season, about 4 position battles per team,
  and 16-28 unsigned players retiring a season from the street pool.

**Left for D5 tuning** (from the build's reviews): away-from-football injuries are 11.2% of a year's
time-loss; the recent-return risk factor also counts day-to-day knocks; `SKILL_FADE` is the same for
every position; weight keeps its fraction; a team on a playoff bye keeps the previous week's
starters; the coordinators' views of players (ADR-084's later step) are not built.

### Stand-in records, step 1 (2026-10-24)

§2.5 for the stand-in league, first step, on the Orchestrator's rulings. Built in attributes'
importer (`importer/real/development.ts`): `pnpm --filter @ff/attributes standin-development` writes
the records into the league file from the file alone (no raw data, no name table), taking off any
earlier ones first, so a second run changes nothing; `import-real` calls the same step. The file's
new top-level `startingDevelopment` key records the version, seed, as-of date, every constant used,
the teams whose latest injury report had no game statuses, and per player how growth was set and
where a copied injury came from (ADR-088 Q5's guess flags). A test fails with "re-run
standin-development" when the code's constants move.

- **Body**: the four drills he was rated from (his drill, else his position's average, else the
  fallback; the one fill in `rate.ts`), so his 40 and his speed agree for all 2,528. Not aged forward
  from when he tested: that waits for §4's curves to be tuned (D5b), and goes in one place, the fill
  (`fillMeasurements`), before both the ratings and the body read it, so they keep agreeing (§2.3);
  since it moves ratings it comes with a re-rate (`import-real`), not in `standin-development` alone.
  Players who never tested keep their position's average, not one set by size and age.
- **Growth** is drawn (`drawGrowth`, the made-up league's lognormal), and **patience** too
  (`drawPatience`), each on `createRng("standin", "attributes:real:development").fork(<id>)`, split
  "growth" / "patience" / "injury": no season in the seed, so growth stays fixed for life. Step 2
  estimates growth from playing time.
- **Career snaps**: offence + defence + special teams from `provenance.history`. They include every
  2026 game played by the snapshot (`snapsThrough`: at most 7 a team; 24 teams had played 6, 6 had
  played 5 and 2 had played 7), which a run then plays again; nothing reads the total yet.
  **Combine record**: only the drills he ran (1,340 players). **Durability**: unchanged (step 2).
- **Today's injuries** (327): injured reserve 227, designated to return 52, PUP 21, non-football 5,
  and active players Out 20 and Doubtful 2 on their team's latest report. Left out: Questionable
  players (23 active; they would play hurt, and the report gives no penalty), the other lists (R40/R49,
  3), the practice squad. Weeks are CHOSEN placeholders, drawn flat: injured reserve 11-15, designated
  to return 1-4, PUP and non-football 1-8, Out or Doubtful 1-3. The kind is `real:<body part>`, or
  `real:reserve-<list>` without one, so no lasting mark or repeat rule fires on it; non-football is
  AWAY, the rest GAME. `since` is the first day of the previous league year's summer: franchise's
  healing skips the week an injury is stamped in, so this way a w-week injury keeps him out of exactly
  the run's first w weeks (calibration's `standInDevelopment.test.ts`; a camp week 1 stamp would cost
  a week more). The snapshot was a Friday: 25 of 32 teams' latest report has no game statuses yet, so
  the 22 Out or Doubtful come from 7 teams (recorded in the file).
- **What the copied injuries do**: little in a game. The 305 on reserve lists are not on the 53
  (the loader leaves `Team.reserve` out), and the 22 actives heal within camp. They change camp and
  preseason practice, growth and the depth chart. His injury history beyond today's is not copied
  (franchise's injury memory starts empty).
- **Calibration**: the stand-in loader reads each record only with its switch: development off drops
  the growth record, patience and combine record; injuries off drops the copied injury. So both off,
  the league is the old file's to the byte, and `--injuries` alone grows nobody, as before. A file
  whose records are of a version the loader does not know (`startingDevelopment.version`) is refused,
  so a later step's new record cannot reach a switched-off run unnoticed. With
  development on, a file without records is refused ("no growth records; run standin-development"),
  and the old refusal is gone. A switched-on stand-in run plays the file's season, 2026 (its ages and
  injuries are that season's, and one season has no year turn); a different `--season` is refused.
  Switched off, the season is the default, 2027, as before. With development on and injuries off,
  reserve players practise and grow.
- **Checks**: `player-checks -- --league <file>` plays every arm in 2026 on the stand-ins, keeps
  its seasons under a fingerprint that includes the file's sha256, and writes
  `reports/player-checks-standin.md`: players counted by roster group (the 53, practice squad,
  reserve lists, street), the players who started hurt (copied, so no INJURY_OCCURRED), and the
  growth rates' scale on the 53 at camp. Its injury tables count the 53 and the street, the people
  the generated league's count (it has no practice squad or reserve lists; the stand-ins' practise
  with their teams and get hurt, about 13% of all injuries in a one-seed smoke run); their injuries
  are in the roster-group table alone. Its starters are who the engine fields from each real depth
  chart (11 personnel, base and nickel defences, the specialists: 26 a team), since the generated
  league's starters-per-position table never starts an inside linebacker (`ILB`), which 25 of the 32
  real charts list. The generated league's report is unchanged.

**Proofs.** Taking the new keys off the rewritten file and writing it the same way gives back the
file before, byte for byte (sha256 3a9ae152…d3d3). With both switches off, `season --seed homie-1
--league <file> --out` is byte-identical on the old file with main's code (e23bf69), the old file
with this code and the new file with this code, and so is `--stop-after 9 --out` on the old and new
files. Rated from the same inputs, `rateStandIns` gives the same bytes before and after the fill
moved out of it. Rendered from D5a's cached seasons, the generated league's `player-checks` report is
the committed one but for its code fingerprint. The tests pin the two "as before" claims by sha256
(the stripped file's bytes in attributes; the players a switched-off run reads in calibration), check
that the step changes nothing on any player but its four records, and play a switched-on stand-in
run twice to the same events.

#### One season on the stand-ins (`reports/player-checks-standin.md`)

20 seasons per arm on the same seeds, every arm in 2026, code and file fingerprinted `19e18924e0ef`
(735c08b; the later contract-book change, 5e34b8f, does not reach calibration, which keeps no book).

| | Win spread | Best | Worst | 13+ wins | 4 or fewer | Better record wins |
|---|---|---|---|---|---|---|
| NFL 2021-24 | 3.05 | 13.8 | 2.8 | 10.0% | 14.0% | 74.0% |
| off | 2.79 | 14.7 | 3.3 | 9.4% | 6.6% | 70.7% |
| development | 2.82 | 13.9 | 2.5 | 7.5% | 7.8% | 70.5% |
| injuries | 2.49 | 13.8 | 3.1 | 5.5% | 5.0% | 68.5% |
| both | 2.51 | 13.7 | 3.6 | 5.9% | 4.8% | 68.2% |

- **Win spread.** Against `off` on the same seeds: development +0.04 (0.5 standard errors), injuries
  -0.30 (3.7), both -0.28 (2.9); the better record wins 2.2 and 2.5 points less often (3.6 and 3.1).
  Unlike the generated league (injuries -0.03), on the stand-ins injuries alone even the league out:
  across the 32 teams, wins with injuries regress on wins without them with slope 0.64 (a strong team
  loses about 0.4 of a win per win above average). Starter age does not explain it (correlation with
  the change -0.11). Not yet understood; a candidate, unverified: on real rosters a team's quality sits
  in its starters more than in its depth, so losing starters costs strong teams more. It goes to the
  team-strength retune with D5b, which for the stand-ins cannot be a hidden boost (ADR-088 Q8).
- **Injuries against the NFL**, like for like: time-loss 1.88 a team-game against 2.02 (generated
  league 1.83), any cause 1.97 against 2.09, day-to-day 0.76 against 0.78; lengths 57.7% / 19.2% /
  23.0% against 57.9% / 19.2% / 22.9%; out 4+ games begun in season 9.5 a team against 9.4. By
  group (NFL in brackets): QB 0.079 (0.062), RB 0.141 (0.174), WR 0.275 (0.256), TE 0.102 (0.124),
  OL 0.348 (0.341), DL 0.262 (0.260), LB 0.208 (0.277), DB 0.429 (0.494), K/P 0.035 (0.028). The
  older league adds 0.05 a team-game, as the age reading above expected; the per-snap rate stays as
  measured. Out 4+ by any onset is 11.1 against 15.5 (no preseason games; the reserve lists' players
  start hurt off the 53).
- **How far players move** (development arm, starters / backups): 21-22 +2.9 / +2.5; 23-24 +2.1 /
  +1.9; 25-26 +1.3 / +1.2; 27-28 +0.8 / +0.6; 29-30 +0.2 / 0.0; 31-32 -0.8 / -0.9; 33+ -1.8 / -1.9:
  close to the generated league's, a little smaller at 21-22. Growth on the 53 at camp: median
  0.989, sd of ln(growth) 0.255.
- **Starters and backups.** The 26 fielded starters average 69.8 at camp and the rest of the 53
  63.4, a 6.4-point gap that narrows to 6.0 (development) and 5.9 (both). The league rises less in a
  year than the generated one (starters +0.8, backups +1.2, against +1.9 and +1.6): real rosters are
  older.
- **Depth.** With injuries on, about 91 emergency signings a season, 85 of them practice-squad
  call-ups and about 6 street specialists; 24-26 unsigned street players retire a season; about 3.5
  position battles, 24.5 injury covers and 23 starter returns per team.

### D5b: the 20-season check, rulings and pass lines (2026-10-31)

Recorded before any graded run, as the D5b plan requires
([plan](https://claude.ai/artifact/Wtajcwp83CP5EMi9WUswWb)). The tools are PR #57: the many-season
walk (`runCapCheck` with `players`), the watch-only reader (`careerCheck.ts`), the real side
(`nfl-careers`, `NFL_CAREERS`, `reports/nfl-careers.md`), the `career-check` command and the grader
(`careerGrade.ts`, whose `CAREER_BANDS` table is the source of truth for every line below).

**The owner's answers (decision cards, 2026-10-31 21:05-21:07Z).**

| Card | Answer | What it sets |
|---|---|---|
| Drift | Loose: 3 points | The average overall on the 53s stays within 3 points of year 0 every season 2029-45 (GATE). The mean of 2036-45 within ±1.0 is reported only. The pooled within-group spread keeps its own line, 2036-45 within ±10% (GATE). |
| Close | Close | League mean age ±0.5 years, 31-and-over share ±3 points, peak usage age per group ±1.5 years, expected career ±20% (GATE). |
| Old | Hold until teams cut sooner | The 34-and-over share (at most the NFL's + 2 points) and reaching 10 seasons (±3 points) block the switch-on (GATE). The fix is teams valuing players on next season's expected rating when they keep, cut and re-sign: the salary-cap thread's step 12, on `expectedOverallChange(player, { starter })`, which this ADR's first tuning PR adds to franchise `players/`. No retirement rule by age (Q7 stands). |
| Even | Fix first, block below 2.75 | The win spread, mean of 2029-45, must be at least 2.75 (GATE); the NFL band 2.75-3.35 is reported. The fix comes from roster building, cuts and how differently players grow, never a hidden boost to the real rosters (ADR-088 Q8); for the made-up league, a wider spread of team quality used only when growth is on. |
| Rookies | Yes, with a draft re-check | Draft-class talent (`PROSPECT_TALENT`) may be tuned together with growth; every such change re-runs the draft check (D7) with the draft thread. |
| Aged | Real veterans only | "Everyone aged once" ages the stand-in league's veterans only (a new league file, the old one kept). The made-up league stays as it is, so ADR-089's final records stand. |

**Expected availability, beside `expectedOverallChange` (2026-11-07).** For the same cap decisions,
franchise `players/` has `expectedAvailability(player, { at, starter, history })`: of the
regular-season games left from `at` (all of the next season from the playoffs and the offseason),
how many he is expected to be fit for, that share, and the chance he misses none. It is worked out
without draws, week by week from his injury today, with the injury step's own chances (games at a
starter's 65 snaps or a backup's 24, CHOSEN; practice; away from football; his durability, age and a
recent return), its own spread of weeks out and the schedule's own spread of byes (of 32 teams, 4 a
week in weeks 5-10 and 2 a week in weeks 11-14), and the tests hold it to the real step's mean over
19,200 walked seasons a case. An injury from `at`'s own week was drawn after that week's game, which
he played, so a caller after a week's last day passes the next week. Nothing calls it yet, and its
risk reads his listed position's group until the owner's 2026-11-06 ruling (risk by depth-chart spot)
is built.

**Two more answers after tuning round 1 (decision cards, 2026-11-01 01:54Z).**

| Card | Answer | What it sets |
|---|---|---|
| Spread | The league file as loaded | The pooled within-group spread's line (2036-45 within ±10%, GATE) is measured from the league file as loaded: its 53s before the walk signs anyone, 7.28 on the 23 October file, so the line runs 6.55-8.00. Not from year 0's week 8 (about 7.6-7.7), whose spread carries the stopgap kickers (backups rated 24-42, and a few punters) the walk signs for injuries; that value is shown beside it, not graded. The Drift rows keep year 0 (the card did not ask about them). |
| Floor | Keep floor; judge growth vs season one | The win spread's 2.75 stays the GATE for the switch-on. A growth or draft-talent tuning round is judged on keeping the later seasons as spread out as season one: the mean of 2029-45 at least season one's spread on the same seeds, both switches on (reported; a shortfall inside the seeds' noise is "can't tell"). Season one itself is near 2.5 with both switches on (20 seeds, `reports/player-checks-standin.md`: off 2.79, growth 2.82, injuries 2.49, both 2.51), so the rest of the gap to 2.75 waits on how the engine turns team strength into wins and on roster building, outside this ADR's tuning. |

**Readings the Orchestrator recorded with the six answers of 2026-10-31 (CHOSEN; told to the owner
2026-10-31, no objection).**

- **A gross miss fails.** A row is "can't tell" only when its value is in band or outside it by no
  more than 2·√(SE_sim² + SE_ref²). Further out it fails, however wide the reference's error.
- **Rookie** means a player's first season on a team, matching nflverse's years of experience
  (seasons since entry). "No credited season" is reported beside it.
- **Week-8 league rows** (mean age, 22 or under, 31 and over, 34 and over, rookies, undrafted) are
  graded against the latest three real seasons, 2022-24, because the undrafted and young shares fall
  steadily across 2018-24 and our own 2026 start fails the seven-season mean. Group mean ages keep
  2018-24.
- **Careers are also graded by position family and league-wide** (QB; RB-WR-TE; OL-IDL-EDGE;
  LB-CB-S; K-P-LS), beside the per-group rows, because single small groups (kickers, punters,
  snappers, quarterbacks) can only catch a gross miss.
- **Draft rows** (ADR-086 D7 was judged by reading): starter rate by round band (1, 2, 3, 4-7)
  within ±0.10 of `NFL_DRAFT` (GATE); ever a starter within ±0.10 and the round-1 shares, reported.
- **Tuning limits:** a backup who only practices keeps at least 60% of a starter's yearly gain
  (today about 70%); `LEARNING_RATE.floor` stays above 0; no slope or cost that depends on rating
  level; `WOBBLE`, `GROWTH`, `COACHING` and `PATIENCE` are not tuned; one knob family per PR; rows
  still out after six rounds are reported, not forced. After the veterans are aged once, the aging
  tables freeze; any later change goes to the owner.
- **The flip** is recommended only when every GATE row passes or is "can't tell", including the Old
  rows, so switching growth and injuries on by default also waits on the cap thread's step 12.

**Known before the first run.** The 2026 file has 13% of the 53s aged 31 or over against about 10%
in every real season since 2018 (unexplained; checked before grading). Peak usage age, measured the
same way on both sides, is 24-26 for every real group, earlier than the aging curves' peaks (25-30):
it reads when teams hand out snaps, not true ability. Coaches now change between seasons (ADR-084's
carousel) and each team holds its end-of-season meeting (ADR-081); the walk runs both whenever a
switch is on.

**Tuning round 1: the learning rate (2026-11-01).** The first knob family, alone in its PR. The
first speeds let men keep improving through their mid-20s, so by 2032 a 29-year-old on the 53s rated
3-6 points above the file's 29-year-olds and the average had risen 3.6 points (seed t2). The new
speeds (§2.2) hold that rise to about 1.4 points by 2032 on seeds t2 and t4, with the year's moves
the development tests now pin (a starter's core skills: rookie of 22 about +2.5, second year +1,
26 +0.7, 28 +0.4, 29 +0.2, 32 -1.1, 34 -1.9; a backup keeps about 70% of a starter's gain, inside
the 60% limit). Alone, they narrow the spread within each position group (about 5.4-5.8 by 2032
against the Spread line's 6.55), because fast and slow developers now drift apart less: the next knob family,
the draft classes' spread of talent (Rookies card, with a draft re-check), is what widens it. Nothing
changes with both switches off.

**Tuning round 1: the class talent (2026-11-07).** The second knob family, alone in its PR, set on the
market after ADR-085 step 13 as agreed with the cap thread. With growth on, draft classes draw talent
from `PROSPECT_TALENT_WITH_GROWTH` {mean -1.5, sd 1.15} instead of `PROSPECT_TALENT` {-0.8, 0.75}, from
the same draw, so names, positions and ages stay; with growth off nothing changes. Measured with and
without on the four tuning seeds (20 seasons, both switches on, one build: main 2e295a9), graded with
the D5b bands (pass 1, coach-style arms not played):

| Row (mark) | Without | With | Real or line |
|---|---|---|---|
| Pooled within-group sd, 2036-45 (GATE) | 5.94 FAIL | 7.52 PASS | 7.28, line 6.55-8.00 |
| Mean overall on the 53, 2036-45 (REPORT) | 68.1 | 66.6 | year 0 66.4 |
| Starter-backup gap (GATE) | FAIL from 2033 | PASS every year | 4.34 ±1.0 |
| Undrafted share (GATE) | 32.2% FAIL | 24.6% PASS | 25.7% ±4 |
| Share 31+ / 34+ (GATE) | 8.7% / 2.2% | 10.5% / 3.0% | 10.1% / 2.9% |
| Mean age, league (GATE) | 26.06 | 26.31 | 26.27 ±0.5 |
| Career, league-wide: expected / reach 10 (GATE) | 3.79 / 6.8% FAIL | 4.21 / 9.3% PASS | 4.95 ±20% / 11.8% ±3 |
| Win spread, 2029-45 (GATE, at least 2.75) | 2.51 | 2.65 | 2.75 |
| D7 starter rate, rounds 1 / 2 / 3 / 4-7 (GATE) | .686 / .619 / .522 / .373 | .716 / .639 / .553 / .361 | .635 / .512 / .410 / .239 ±.10 |
| Ratings of 99 (GATE) | FAIL, 52-94 a league | FAIL, 52-97 | year 0 41.5, +3 |

The draft re-check (Rookies card): with growth on, drafted men from round 2 on start too often with or
without the change (round 3 about .52-.55 of their seasons on a 53, against .41 real), so the miss is
growth's, not the class's; the change moves each round band by at most 0.03. The 99s and the win spread
miss both ways too. Those three wait for the aging redesign (ability groups), which changes how men
grow and fade, and are graded again on its runs. Rows: the project's `design/d5b/class-talent-tune.md`.

### Measurements for the owner's aging rulings (2026-11-06; rows version 5)

The owner ruled on 2026-11-06:
- nothing in aging may be based on listed position;
- count the 53 like the NFL (men out 4+ weeks off it);
- compare our signed-again rate by age with the real one;
- report a later window (2033-45) beside the graded one;
- measure injuries by age;
- match the made-up rookies' ages later.

This step only measures. Nothing the sim does changes. The reader (`careerCheck.ts`) now writes rows version 5 (`CAREER_ROWS_VERSION` 5, `CAREER_CHECK_VERSION` 5, so every cached seed is played again). The grader (`careerGrade.ts`) adds nine rows, every one REPORT. The real side is the nfl-careers additions committed just before this step (REAL, totals only).

**The real side (REAL, totals only; 2025 is never read).**
- `nfl-careers` adds the rookies' ages at week 8 (2018-24, mean 22.67 in whole years), the reserve/retired list by age (a lower bound: 0.2% at 25 and under up to 3.0% at 33 and over), and exits by age for Y = 2016-22: back on a 53 in Y+1 or Y+2 (88% at 26 and under down to 72% at 33 and over) and starters on no team's list in either of the next two seasons (0.7% up to 21.2%). OverTheCap's signed-again rates sit beside them, REPORTED (counted by the salary-cap thread).
- `injury-rates` adds injuries by age, body-part class and depth-chart spot (2019-24; `reports/injury-rates.md`).
  - Risk per snap, against each band's own position mix: 0.99, 0.96, 1.04, 1.20 and 1.01 from 25 and under to 33 and over. It is flat but for 31-32, against the injury tables' guessed 4% a year past 26 (`injuryTables.ts`, CHOSEN).
  - Time out does not lengthen with age for soft-tissue or joint injuries. At 31 and over two small classes stay out longer: concussions (out 4+ weeks 26-30% against 16-18%, 54 cases) and back, neck, torso and other (42-48% against 30-36%, 86 cases). Slower healing goes in only where this count shows it.
  - A later concussion keeps a man out 4+ weeks 26% of the time against 16% for the first one seen, once quick relapses (which may be one concussion counted twice) are set apart.
  - The spot recount reads the weekly roster's `depth_chart_position`, which is the listed position in its fine form, so no group's rate moves by more than 0.005 per 1,000 snaps. The fine spots' own rates (per 1,000 snaps: corner 1.37, free safety 0.94, tackle 1.04, guard 0.78) are what the owner's by-spot ruling can use. A man moved on game day, such as a safety at corner in the nickel, is not seen.
- `standin-recount` (new) counts the stand-in file's 53s the way the real week-8 53s are counted, and runs the importer's roster rules (copied) on real 2024 weekly rosters. Of the file's +2.8 points aged 31 and over against real 2024 week 8 (13.0% against 10.2%), the import method makes 0 to +0.5, the snapshot date -0.4 to -0.2, and the rows themselves +2.6 to +2.9. A check that uses no birth dates agrees: 10.2% of the file's men have 9 or more years in the league, against 7.7-8.1% in 2022-24. The file stays as it is.

**What the reader adds.**
- **The 53 counted like the NFL (`week8Nfl`).** Week 8's 53s without the men whose unhealed injury was drawn LONG or MAJOR (4+ weeks), as the real count leaves out injured reserve.
  - Beside it, `week8NflWeeksLeft` leaves out the men with 4+ weeks still to go.
  - `nflCount` gives how many men were left out each way, and every team's size before and after.
  - CHOSEN: the band at the draw stands in for the 4-week IR line. The weeks-left variant is shown so the choice can be judged: the grader's `nfl-count` row sets each NFL row's league reading on the variant, and on the whole 53s, beside the band reading the row is graded on. It also shows the men each reading leaves out and the smallest and largest teams.
- **Group shares and rookie ages.** Each group's 22-or-under, 31+ and 34+ shares, and the rookies' ages (first season in the league) on the week-8 53s.
- **Signed again within two years (`market.expiries`).** For each deal that ran out at the league year after season Y (`CONTRACT_EXPIRED`) worth at least 1.5% of the cap, the reader records:
  - his age in Y;
  - whether he signed any deal but a practice-squad one, with any team, between Y's OFF_EVAL (re-signings and tags come before the expiry) and two league years on;
  - whether he signed within one league year.

  Readings (all CHOSEN, matching OverTheCap's line):
  - APY is the deal's cap hits over its real years. It is divided by `capForecast(seed)` for the league year the deal was signed in.
  - A man who retires first counts as not signed.
  - An early extension (a deal signed before the window that runs past Y) counts as signed.
  - Some league-file deals have their early years cut. The stand-in importer keeps a real deal's years from the file's season (2026) on, but stamps the deal signed in its real year. So the deal's mean cap hit covers only its later years, which are mostly the higher ones, and it is divided by an earlier year's cap. That overstates its share, and deals near the 1.5% line get in that OverTheCap's line would likely leave out.
    - Each such deal is flagged (`ExpiryRecord.t`). The grader leaves flagged deals out of the rates (CHOSEN) and shows them apart in one reported check.
    - They run out mostly in 2026-28, so they overstate the 2026-28 cohorts. The graded window (2029 on) holds few of them. A file deal the importer estimated at its yearly average is flagged too, because the reader cannot tell the two apart.

  The open deals live in the reader's state, so they carry across checkpoints.
- **The roster way (`exits`).** Of the men on a final-week 53 in Y:
  - `backOnA53`: those on a 53 on day 1 of some regular-season week of Y+1 or Y+2;
  - `startersGone`: the starters (50%+ of the snaps, the real side's line) on no team's list in either season;
  - `retiredNextYear`: those who retired within a year, each way. The window opens on Y's final day itself, since the cohort is read before that day's players' steps, so a retirement at Y's season end belongs to Y. It closes before Y+1's final day.

  Both 53s are counted like the NFL: the final-week 53 and the 53s of Y+1 and Y+2 leave out the men out 4+ weeks (`nflRosterIds`), as the real side's credited seasons and 53s leave out injured reserve. "On no team's list" reads every status, injured men included, as the real side's does. The credited-season cross-check (`credited.week18`) still counts the whole 53.
- **Retirements (`retirements`).** Each season's retirements by age, credited seasons and group, split three ways:
  - the unsigned rule;
  - his own choice while signed: a deal of his was live when he retired (`liveAt`), or ended RETIRED that season. Only for a man with no deal in the book is the team he had when the season began used;
  - his own choice while unsigned.

  The unsigned-wait report and the careers' retired exits now count the unsigned rule only (reason UNSIGNED).
- **Availability by age (`availability`).** On day 1 of each regular-season week, the men on a 53, and of them those out with an injury they cannot play on.

**What the grader adds.** All nine rows are REPORT, and none of them moves the flip:

| Row | Compared with | Notes |
|---|---|---|
| share-31-group, share-34-group | By group: 2022-24's season mean and 2018-24 pooled | REAL |
| signed-again | OverTheCap's REPORTED rates by age (`OTC_SIGNED_AGAIN`): deals ending 2016-22, n 1,799, no SE | No age convention is stated, so the sim's age in Y and in Y+1 are both shown |
| back-on-53, starters-gone | `exitsByAge` | REAL, Y 2016-22 |
| retired-signed | `retiredList` | REAL, a lower bound |
| rookie-age | `weekEight.rookieAge` | REAL, 2018-24 |
| availability | Nothing | The sim's alone: no real availability by age is merged yet |
| nfl-count | The band reading (`week8Nfl`) | The NFL rows' league readings on the weeks-left variant and the whole 53s, the men left out, and the team sizes (`nflCount`) |

The grade windows gain `later: [2033, 2045]`. Each early check now has a reported later-window check beside it:
- the league and group week-8 rows;
- peak usage;
- the win spread and win r;
- the other reports;
- every new row.

A smoke grade uses the run's own seasons for all three windows.

**What this changes in the GATE rows.** The NFL comparison rows now read `week8Nfl`, not the whole 53s. These are:
- mean age, league and by group;
- 22 or under, 31+ and 34+;
- rookies (and the earlier no-credit reading beside it);
- undrafted.

So the existing GATE rows now read different men than before. With injuries on, the men out 4+ weeks are left out. Rows written before version 5 have no `week8Nfl`, so they grade as no data on those rows instead of falling back to the whole 53s. The drift rows (overall each year and late, pooled sd, gap, the 95s and 99s) and the coach-style rows still read the whole 53s (`week8`). With injuries off nobody is hurt, so the two pictures are the same.

**Smoke proof (2026-11-07, played again after the review fixes).** The run was seed d5b-t1 (tune set, index 1), both switches on, 3 seasons (2026-28), with the documented `career-check` command and `--seasons 3`.
- Timing: 187 s of play (seasons 53, 67 and 65 s; 188 s wall). Grading with `--smoke` took about 1 s.
- All 44 grader rows came out. The 9 new rows are all REPORTED, and 109 checks are later-window checks.
- The review fixes changed only what the roster way, signed again and the retirement split read. The week-8 pictures, the counts below and every older row come out as before.

The sim's totals (ours, measured):

| Measure | 2026 | 2027 | 2028 |
|---|---|---|---|
| Men on the week-8 53s | 1,702 | 1,715 | 1,719 |
| Left out by the NFL count (band LONG or MAJOR) | 169 | 207 | 184 |
| Left out, weeks-left variant | 134 | 160 | 143 |
| Deals of 1.5%+ that ran out | 157 | 158 | 191 |
| Of them, league-file deals with their early years cut (`t`) | 99 | 76 | 76 |
| Retirements by the unsigned rule | 0 | 303 | 988 |

- Team sizes: 50-58 before the NFL count, 42-53 after.
- The `nfl-count` row, 2026-28 means:
  - The band leaves out 187 men a league-season and the weeks-left variant 146.
  - The NFL rows' readings barely move between the band, the weeks-left variant and the whole 53s:
    - mean age 26.35, 26.37 and 26.39;
    - 31+ 13.0% on all three;
    - rookies 19.4%, 19.1% and 18.6%;
    - undrafted 26.8%, 26.5% and 25.6%.
- Expiries: 3,813 more were under the line, and none was unmatched.
- Of 2026's deals (followed two league years), 99 of 157 are league-file deals with their early years cut, so the rates read the other 58. Of those 58, 51 were signed again (88%), 47 of them within one league year, and 7 men retired first.
  - The cut deals alone come to 82%, and all 157 together to 84%.
  - In the league file, the cut deals that run out from 2029 on number 95 (58 in 2029, 28 in 2030, 9 in 2031), of the 181 file deals that run out then.
- Signed again, by age in Y, cut deals left out, against OverTheCap (REPORTED). These are small cells (8 to 27 deals each):
  - 26 and under: 0.96 (0.94);
  - 27-28: 0.75 (0.89);
  - 29-30: 0.83 (0.86);
  - 31-32: 0.80 (0.71);
  - 33 and over: 0.86 (0.58).
- 2026's final-week 53s, counted like the NFL, held 1,490 men (the whole 53s: 1,763). Of them, 70% were back on a 53 within two seasons (real 85%). Starters gone was 81 of 594, 14% (real 4%).
- Retirements: none came by choice, since no build retires a man by choice yet. By any way (the unsigned rule), 68 of 2026's 1,490 men retired within the year.
- Availability: 85.5% of man-weeks on a 53 were available.
- Rookies' mean age (whole years): 22.99, against the real 22.67.

A smoke grade is never a graded report, so these numbers judge nothing.

With both switches off nothing in the game changes. The reader and grader only watch, `capForecast` is pure, and no file outside `packages/calibration/src/season/` (and its tests) changes.

## 12. Aging by ability, with no positions (amendment, 2026-11-07)

**Status:** Accepted 2026-11-07. It carries out the owner's rulings R1-R4 (2026-11-06, §12.0) and
his answers to its six questions (2026-11-07 12:15Z, §12.12).
- Contracts edits: P7, E6, P8 and W1 only. The owner approved them by typed yes on 2026-11-06 23:20Z
  (*"yes on edits P7, E6, P8 and W1"*) and confirmed them on 2026-11-07 12:15Z (*"Edits P7, E6, P8
  and W1 are approved"*). They are built as step AB0 (§12.9).
- Anything else that touches `packages/contracts` is listed as NEW-1 to NEW-4 (§12.10). Each NEW edit
  needs the owner's own typed yes. NEW-1 (Q3) and NEW-2 (Q4) are chosen and wait for their typed
  names; NEW-3 is not made (Q5); NEW-4 is not asked.

This section replaces §2.4's age profiles by position, and §6.1's "unsigned only" retirement, wherever
growth is on.

How to read the numbers. Every number carries one label:
- **REAL** — counted from real NFL data, with its source.
- **MEASURED** — counted in our sim or in the scratch model; the run is named.
- **CHOSEN** — a design pick.
- **GUESS** — a starting value that tuning will move.

The REAL sources are:
- the nflverse cache, through `pnpm --filter @ff/calibration injury-rates` (`reports/injury-rates.md`, PR #69);
- `nfl-careers` (`reports/nfl-careers.md`, `NFL_CAREERS`);
- the week-8 rookie count in that same report.

The MEASURED sources are:
- "toy": the scratch model, variant D. Its report is `/mnt/project-files/design/aging-redesign/curve-model-report.md`, and the model's files (its code, and the tables it wrote in `out/`, with version 1's in `out/v1/`) are kept beside it in `/mnt/project-files/design/aging-redesign/model/`. The model files cited below (`model/...`, `check.ts`, `cohort.ts`, `model.ts`, `fast.ts`, `ninety9.ts`, `options.ts` and `out/tables.md`) are in that folder, not repository paths. The code's imports name the worktree it ran in, so it does not run from there as it stands;
- "grade": `/mnt/project-files/design/d5b/class-talent-tune-with.md`, the 20-season check on main plus class talent, 4 tune seeds.

Code paths are checked against main at 760b8f6, plus the class-talent commit 5253037.

This text is the amendment's second draft, which applies a review of the first (against the rulings, the code and the numbers). Each finding, whether it was applied and why, is in `/mnt/project-files/design/aging-redesign/draft2-revisions.md`.

### 12.0 Rulings this section carries out

R1 (owner, 2026-11-06). Nothing in aging, growth or retirement may depend on a player's listed position (`bio.position`).
- A position is what a team plays a man at.
- A position's overall formula (`positionOverall`, `POSITION_PROFILES`) may be used only to *judge* a man. It must never set how he ages.

R2 (owner, 2026-11-06). Injury risk may follow the spot his team plays him at, which is the depth chart. It never follows his listed position.

R3 (owner, 2026-11-06). Retirement by his own choice is in. It supersedes Q7 and the Old card's "Q7 stands". A man who is not signed still retires when nobody signs him in time (§6.1, unchanged).

R4 (owner, 2026-11-06). The 12 ability groups are accepted (plan doc, "Aging by ability: the plan"). The steeper technique fade from 31 is his pick, and goes in as an option to try in tuning. "Smarts from playing slow" is his pick too, as an option; the fit makes it part of the base set on the ability path, because the fitted smarts curve needs it (§12.2.4), and a test run without it sits beside (AB9-T2, Q2).

R5 (this section). With growth off, every output stays byte-for-byte what main makes today. With growth on, the new rules are built behind options that default to the old rules, so each build step can prove it changes nothing until it is switched on.
- R1-R3 are already ruled, so no new yes is needed to make them the growth-on rules. The defaults become `ability` / `spot` / `choice` with growth on at AB11 (§12.9), when AB9 and AB10 are done and graded.
- Until then `position`, `group` and `unsigned` stay only as comparison arms.
- The only owner yes still open here is Q8's: switching growth and injuries on by default (ADR-087 §9, D5b; "The flip" under the D5b tuning limits).

### 12.1 Switches

Each new rule is an option. Each option defaults to today's rule while it is built, so it is inert until AB11 makes the new rules the growth-on default (R5).

| Option | Lives in | Values (default first) | What it picks |
|---|---|---|---|
| `aging` | `PlayerStepsConfig.aging`, its own optional field (franchise `players/steps.ts`); also the `generateLeagueRosters` / `generateDraftClass` options (attributes) | `"position"` \| `"ability"` | Profiles by position (§2.4), or the ability curves (§12.2). In attributes: today's rookie and specialist ages, or §12.5's ages. |
| `injuryRisk` | `PlayerStepsConfig.injuryRisk`, its own optional field (`injuries` is a boolean, `config.injuries === true`, and stays one) | `"group"` \| `"spot"` | Today's `byGroup` by `POSITION_GROUP[bio.position]` with the age rule from 26, or §12.3's spot and age factors, marks and healing. |
| `retirement` | `PlayerStepsConfig.retirement`, its own optional field | `"unsigned"` \| `"choice"` | Today's unsigned-only rule, or §12.4 added on top of it. |

Each option does nothing unless its parent switch is on:
- `aging` only acts with `development` on;
- `injuryRisk` only acts with `injuries` on;
- `retirement: "choice"` acts with either switch on. Its age and injury inputs simply read neutral when the other switch is off.

How the options reach the code and the checks:
- **Calibration.** It takes `--aging ability`, `--injury-risk spot` and `--retirement choice`, and one shorthand, `--ability-rules`, which sets all three. These go on `season`, `career-check` and `player-checks`.
- **Records.** `PlayerMemory.switches` (franchise `players/types.ts`, not contracts) gains optional keys `aging?`, `injuryRisk?` and `retirement?`. `steps.ts` writes each only when it is not the default, so a save made at the defaults is byte-identical to main's.
- **Carrying on.** The season command restores only `development` and `injuries` from `memory.switches` today (`calibration/src/season/main.ts`, about lines 185-188). It reads the three new keys too, and so does career-check's resume, so a `--load` carries on under the same rules instead of falling back to the defaults.
- **Cache.** The options join the career-check cache key, next to the build fingerprint.
- **Old saves.** A save without the options loads under today's rules.

### 12.2 A. Ability groups and curves (variant D)

#### 12.2.1 What it does

Each rating belongs to one of the 12 ability groups. Each group has its own age curve.

Each player carries one number per group, fixed for life: how many years earlier (minus) or later (plus) than usual that ability starts to fade. A running back then fades early because his game leans on speed and quickness. A quarterback lasts because his game leans on passing and smarts. No line of the rule reads his listed position.

**The loss in a year.** Starting from his age `a` and his own shift `s` for the group:

```
yearsPast = min(cap, max(0, a − start − s + wear))      // wear: §12.3.6, body groups and DURABILITY only
loss      = per × yearsPast
```

Gains (learning, workouts, the own-curve gains) are scaled by growth as today, and are not shifted. Losses read at the shifted age. A man two years "late" (s = +2) therefore starts fading later, and at any given age he fades more gently. Wear pushes the other way: more contact taken means more years past, so a man who has taken heavy contact fades as if he were older.

**Curves (variant D, re-fitted 2026-11-07 after the review; all CHOSEN).** The starts and pers are fitted in the toy (`model/fit.ts`, coordinate descent, 3 sweeps) against REAL targets read through the toy's own bias: each row's target is REAL + (toy today − sim today), so the curves are not tuned to cancel the toy's own errors. The caps (8, and 10 for SMARTS) are CHOSEN, the plan's guesses; the fit does not move them. The model's arithmetic was checked against `expectedOverallPath` on today's rules (`check.ts`: worst error 0.0000 over 1,496 player-years where no clamp binds); that checks the arithmetic, not the fit. Loss, fit seed / check seed (MEASURED, toy): **D 49.0 / 54.5**, A 83.9 / 84.0, B 59.6 / 65.1, C 66.7 / 72.5. The first draft's values (63.4 / 79.1 for D) came from a toy whose "today" rookies were a year young and which was graded on raw REAL; the model's report keeps them beside its version 1.

| Group | Ratings | Start (age) | Per year past | Cap (years) |
|---|---|---|---|---|
| SPEED | speed; and, as the "follows" weights in `body.ts`: acceleration .7, mobility .6, firstStep .7, pursuit .6 | 25 | 0.00731 s on the 40 | 8 |
| QUICKNESS | agility; the agility share of acceleration .3, mobility .4, firstStep .3, pursuit .4; elusiveness (follows quickness .6, speed .3); yac (.4/.4) | 23 | 0.012 s on the cone | 8 |
| SPRING | jumping | 28 | 0.1582 in on the vertical | 8 |
| STRENGTH | strength; power and anchor (follow strength 1) | 28 | 0.206 bench reps | 8 |
| ARM | armStrength | main's `OWN_CURVES.armStrength` | — | — |
| LEG | kickPower, puntPower | main's `OWN_CURVES` | — | — |
| STAMINA | stamina | main's `OWN_CURVES.stamina` | — | — |
| DURABILITY | durability | main's `OWN_CURVES.durability`, plus wear (§12.3.6) and marks (§12.3.4) | — | — |
| TECHNIQUE | passBlock, runBlock, footwork, sustain, pullSkill, passRush, runStuff, powerMove, finesseMove, blockShed, tackling, zoneCoverage, manCoverage, press, ballSkills, routeRunning, releaseWR, catching, catchInTraffic, spectacularCatch, ballSecurity, disguise | 29 | 0.19775 rating points | 8 |
| PASSING | accuracy, touch, release, improvisation | 33 | 0.625 pts | 8 |
| KICKING | kickAccuracy, puntHangTime | 30 | 0.58594 pts | 8 |
| SMARTS | the 11 in `GROUP_MEMBERS.SMARTS` | 26 | 0.35156 pts | 10 |

How the groups relate to today's tables:
- The four body groups replace the `AGING_PROFILES` peak and per-year numbers.
- The four rating groups replace `SKILL_FADE` and `SMARTS_FADE`.
- ARM, LEG, STAMINA and DURABILITY keep main's `OWN_CURVES` as they are, with the shift read on the loss side only.
- volatility and discipline stay FIXED (personality, Spec #14).

**The other rules that move with `aging: "ability"`** (all CHOSEN, fitted in the toy with the curves):
- **Learning floor** 0.08. Main's `LEARNING_RATE.floor` is 0.15.
- **Workout age** `WORKOUT_AGE` [[22, 1], [25, 0.1], [28, 0]]. Main runs [[22, 1], [25, .6], [28, .35], [32, .2], [36, .1]].
- **Smarts from snaps** 0.45 per 1,000 snaps. Main's `SMARTS_SNAPS` is 0.6.
- **Passing from snaps.** The PASSING snaps term (0.15 per 1,000 snaps) applies to accuracy, touch, release and improvisation, as in the toy (`model.ts` `withPassingSnaps`, `fast.ts` `wPassSnaps`). None of them takes the smarts snaps term.
- **Smarts from playing slow** on, c = 0.2 (§12.2.4). It is part of the fitted set, not an extra.
- **Leaving SKILL.** elusiveness and yac move from SKILL to QUICKNESS. They keep full learning and get no technique fade.

**The SMARTS row and slow smarts go together.** The fit set the SMARTS fade start at 26 only because slow smarts adds smarts back while the legs go. A typical starter's awareness, a year at each age (MEASURED, toy, `model/smartsyear.ts`, entering at 22, growth 1):

| Rules | at 24 | at 26 | at 28 | at 30 | at 32 | at 34 | sum 26-35 |
|---|---|---|---|---|---|---|---|
| today (QB) | +1.42 | +1.28 | +1.26 | +0.96 | +0.36 | −0.20 | +6.5 |
| D as fitted (slow smarts 0.2) | +0.98 | +1.35 | +1.17 | +0.98 | +0.63 | +0.03 | +7.4 |
| D's rows with slow smarts 0 (never fitted) | +0.98 | +0.83 | +0.12 | −0.59 | −1.29 | −2.00 | −7.6 |
| B as fitted (no slow smarts) | +0.91 | +0.75 | +0.74 | +0.74 | +0.44 | −0.16 | +4.4 |

So D's SMARTS row is never used with slow smarts off: that mix would make a starter's smarts fall from 28, against the plan's approved "fades late (as today)" and the owner's "reading defenses and throwing keep improving". A man who does not play gets no slow-smarts gain, so a career backup's smarts do fall from about 28 under D; that is reported in AB9.

**Variant B, the fitted set without slow smarts** (CHOSEN, toy fit; used only for AB9-T2): SPEED 27 / 0.00731; QUICKNESS 22 / 0.009; SPRING 31 / 0.09492; STRENGTH 31 / 0.17578; TECHNIQUE 29 / 0.35156; PASSING 29 / 0.5; KICKING 30 / 0.58594; SMARTS 31 / 0.3 (cap 10); passing snaps 0.3; smarts snaps 0.45; learning floor 0.06; workouts [[22, 1], [25, 0.3], [28, 0]].

#### 12.2.2 The per-player number (P7)

Contracts, `packages/contracts/src/players.ts` (edit P7, approved):

```ts
/** ADR-087 P7: the 12 ability groups (names only; the curves live in franchise). */
export const ABILITY_GROUPS = [
  "SPEED", "QUICKNESS", "SPRING", "STRENGTH", "ARM", "LEG",
  "STAMINA", "DURABILITY", "TECHNIQUE", "PASSING", "KICKING", "SMARTS",
] as const;
export type AbilityGroup = (typeof ABILITY_GROUPS)[number];

export interface PlayerDevelopment {
  // ...growth, snaps, carry, body (unchanged)
  /** ADR-087 P7: years earlier (minus) or later (plus) than usual each ability starts to fade, fixed
   *  for life. Missing, or a group missing, reads 0 (typical), so old saves and files load. */
  fadeShift?: Partial<Record<AbilityGroup, number>>;
}
```

The type pins go in `contracts/test/development.test.ts`, which imports the helpers from `contracts/test/typePins.ts` (that file holds helpers only, not pins):
- `fadeShift` is an `OptionalKeys` member;
- `typeof ABILITY_GROUPS` is the 12-name tuple, in this order (a union has no order, so the order is pinned on the tuple); `AbilityGroup` is its element type.

#### 12.2.3 The body clock and the spread

How each player's shifts are drawn:
- The four body groups share one clock draw `c`. For a body group `g`: `s_g = sd_g × (√ρ·c + √(1−ρ)·e_g)`, with ρ = 0.5 (CHOSEN).
- Every other group: `s_g = sd_g × e_g`.
- `c` and `e_g` are standard normals. The combined z for each group (`√ρ·c + √(1−ρ)·e_g` for a body group, `e_g` for the rest) is clamped at ±2.5 (CHOSEN), as the toy does (`cohort.ts` `drawDeltas`). Cutting `c` and `e_g` one by one would let a body group's z reach ±3.54 (about 0.7-1.2% of draws past ±2.5, MEASURED by two reviewers' quick simulations), and test 4 would fail.
- Each `s_g` is stored rounded to 2 decimals (CHOSEN; keeps saves small and diffs readable).

The spreads `sd_g` (all CHOSEN, from the plan doc's guesses):

| Groups | sd (years) |
|---|---|
| SPEED, QUICKNESS, SPRING, STRENGTH | 1.5 |
| ARM, LEG | 2 |
| TECHNIQUE | 1 |
| STAMINA, DURABILITY, PASSING, KICKING, SMARTS | 1.5 |

Where the draws come from:
- **Made-up players.** `packages/attributes/src/fictional/development.ts` `withDevelopment(player, rng, start)` adds a fork `rng.fork("aging")`, with one sub-fork per group name and one for `"clock"`. A fork by label never moves the existing `"growth"`, `"snaps"` and `"patience"` streams, so every other value stays as it is. The draw runs only when the generator's `aging` option is `"ability"`. Otherwise `fadeShift` stays absent.
- **Real veterans.** `packages/attributes/src/importer/real/development.ts` draws theirs the same way, on a new `"aging"` fork beside growth, patience and injury. No real data shows a man's own clock. `STARTING_DEVELOPMENT_VERSION` goes to `"standin-development/2"`. `stripStartingDevelopment` also strips `fadeShift`.
- **The loader.** `packages/calibration/src/season/standInLeague.ts` `KNOWN_STARTING_DEVELOPMENT` adds `/2`. `forSwitches` already drops the whole growth record with development off, so `fadeShift` goes with it. `assertGrowthRecords` checks that every growth record has all 12 shifts when `--aging ability` is set. The refusal test in `calibration/test/standInDevelopment.test.ts` (about lines 48-51) uses `"standin-development/2"` as its unknown version; in AB2 it moves to a version the loader does not know (for example `/99`).
- **Later versions.** Each step that changes what the records hold bumps the version, so the loader never reads records it does not know: `/3` at AB7 (P8's `injuryHistory`, §12.3.7) and `/4` for AB10's new league file (§12.9).

#### 12.2.4 "Smarts from playing slow" (option `slowSmarts`)

While his legs fade and he keeps playing, a man's smarts gain a little extra.

**Rule.** In each game week, each SMARTS rating gains
`c × (yearly SPEED+QUICKNESS rating loss, net of gains) × playShare / gamesPerSeason`.
- `playShare` is his snaps over a starter's 65 a game (`EXPECTED_STARTER_SNAPS_PER_GAME`; capped at 1).
- `c` = 0.2 (CHOSEN, fitted in the toy as the yearly form). The toy gives a starter `c ×` the speed and agility rating points he lost that year; the weekly form spreads it across game weeks so it follows play.
- **On the ability path, `c` defaults to 0.2**: the base (AB3's default with `aging: "ability"`, and AB9-T1) is variant D as fitted. With `aging: "position"` the rule does not exist, so this changes nothing on the default path.
- **The off arm is AB9-T2.** It sets `c` = 0 and swaps in variant B's whole fitted set (§12.2.1), never D's rows with `c` = 0.

**Lives in** `packages/franchise/src/players/development.ts` `developOne`, beside `weekInputs`. `bodyWeek` returns this week's slice in seconds, inches and reps, not a year's rating loss, so the rule computes the yearly loss itself: `abilityYear` plus `yearOfWorkouts` for his age, turned into speed and agility points by `body.ts` `bodyScale`. It makes no draws, and it is skipped when `c` = 0.

#### 12.2.5 The steeper technique fade from 31 (option `techniqueKnee`, tuning only)

The re-fit puts the TECHNIQUE fade start at 29, the owner's age, but its slope is gentle: 0.198 points a year past (CHOSEN, fitted), 1.6 at the cap. The owner asked for "from 29, steeper from 31".

**The option.** It adds a knee: a second slope `perAfterKnee` from `knee` = 31 (CHOSEN, the owner's age).
- Start 29 (the fit and the owner agree).
- `per` before the knee: 0.19775 (CHOSEN, fitted).
- `perAfterKnee`: a GUESS of 0.6. Tuning sets it.

The default is off. Tuning arm AB9-T3 turns it on. It is judged on the peak-usage and decline rows (§12.2.8).

#### 12.2.6 What goes with `aging: "ability"`

- **`AGING_PROFILES`.** These are the eight profiles by position (RB 25 … QB 30, KICKER 30), with `MAX_YEARS_PAST_PEAK` 8, in `developmentTables.ts` at about lines 238-273. They are no longer read on the ability path. The table is deleted at the flip (AB11), not before.
- **The position argument.** It is threaded through four calls in `development.ts`:
  - `yearOfAging(position, age)` (lines 122-128);
  - `bodyWeek(position, age, growth, withTeam, phase, rules)` (146-157);
  - `developOne` passing `player.bio.position` (line 289);
  - `expectedWalk` passing `p.bio.position` (line 461).

  On the ability path these become `abilityYear(age, shift, wear)` and `abilityBodyWeek(age, development, withTeam, phase, rules)`. Neither takes a position. A test greps the ability path's module for `bio.position` and fails if it appears (§12.2.7, test 1).
- **The weekly inputs.** `steps.ts` `playerWeeks` (line 148) picks two growth inputs by his listed side, `sideOf(p.bio.position)`: which coordinator's `development` skill coaches him (`coordinator(..., SIDE_SEAT[side])`, OC, DC or STC), and which side's snaps make up his `playShare` (lines 149-170). So a man listed WR who returns kicks gets no special-teams share. Today `bio.position` is also his chart key, so no output differs yet, but it is a read R1 bars. On the ability path:
  - his side comes from the chart key that lists him this week (the same `spotOf` as §12.3.1; K, P and LS mean special teams);
  - a man on no key takes the side where most of his snaps came this week (ties: offense, then defense, then special; CHOSEN), and a man with no snaps and no key takes no coordinator and a share of 0, as a man with no snaps does today;
  - the coordinator and `playShare` both follow that side.

  Retirement's "lost his job" input (§12.4.3) counts starts by the same rule. With `aging: "position"` the line stays as it is.
- **Specialists two years older.** In the made-up league, `generate.ts:168` makes `21 + (specialist ? 2 : 0) + …`. With `aging: "ability"`, the made-up age follows §12.5 for every man, with no specialist term.
- **Overall when judging.** `overallWithCarry` (`positionOverall` at `bio.position`) stays. It only *judges* a man, which R1 allows. Nothing in the ability path reads it to set a curve.
- **Growth off.** `aging` is ignored. Every byte is unchanged (§12.9).

The money thread owns the money side's position rules: `cap/value.ts` `legacyRuleAge(age, position)` (line 98), `ageFactor` and `termFor(age, position)`. This section does not touch them. It does give `expectedOverallChange` / `expectedOverallPath` an `aging` option, so that thread can read ability-based paths when it is ready (§12.11, note M2).

#### 12.2.7 Tests (franchise unless marked)

1. **No position.** `players.aging.test.ts`:
   - two men identical in every rating, record and shift, but with different `bio.position`, get identical deltas for 20 years;
   - the same two men, on the same chart key with the same snaps, get the same `PlayerWeek` from `playerWeeks`, and the same deltas when the whole week runs through `playerSteps` (so the coordinator and the share are covered, not only the development-week level);
   - a man listed WR who is on no chart key and took most of his snaps on special teams gets a special-teams share and the special-teams coordinator's coaching;
   - a source grep finds no `bio.position` or `POSITION_GROUP` in `players/aging.ts`.
2. **Curve shape.** Each group's loss is 0 at `start + shift`, climbs by `per` a year, and stops at `cap`. A shift of +2 equals the same man two years younger on the loss side, and changes nothing on the gain side. Wear: with `wear` > 0 a body group's or durability's years past go up, and more contact never lowers any group's loss.
3. **Missing reads typical.** A record without `fadeShift`, or with one group missing, equals one with zeros.
4. **Body clock** (attributes `development.test.ts`). Over 20,000 draws: each body group's sd is about 1.5 (a little under, from the clamp); pairwise correlations are about 0.5 (±0.03); nothing lies past ±2.5 sd (the combined z is clamped, §12.2.3); all 12 groups are present; draws are the same for the same seed.
5. **Streams unmoved** (attributes `generate.test.ts`, `draftClass.test.ts`). With `aging: "position"`, the league and the class are deep-equal to main. With `"ability"`, everything except `fadeShift`, the age (§12.5) and the fields that follow age is deep-equal to main. In the made-up league those fields are `bio.draft.year` (`draftFor` sets it to season − max(0, age − 22), `generate.ts` about line 132) and `development.snaps` (career snaps come from seasons since that year, or from age for the undrafted: `fictional/development.ts` `seasonsPlayed`). The test asserts that they are recomputed from the new age, not that they are unchanged.
6. **Importer** (attributes `standinDevelopment.test.ts`). It writes all 12 at `/2`. A second run changes nothing. Strip removes them. The calibration loader's refusal test uses a version it does not know (§12.2.3).
7. **Slow smarts.** With `c` = 0 there is no change. With `c` = 0.2, a man losing 1 point of legs a year at a starter's share gains 0.2 smarts points over the season, and a man with no snaps gains 0.
8. **Technique knee.** Off equals the fit's curve. On, the slope changes at 31.
9. **Rewrites.** In `players.development.test.ts`:
   - line 505 (the RB at 40 example) and line 521 ("each position's decline") become "each ability group's decline" plus test 1;
   - line 137 pins the sha256 of `GROUP_MEMBERS` (the same digest as calibration's `RATING_GROUP_DIGEST`). It is left as it is, since `GROUP_MEMBERS` does not change (test 11). A separate pin is added for the ability membership table, matched to calibration's `ABILITY_GROUP_COPY` digest;
   - lines 372 and 604 (the backup's about-70% share) are re-checked on both paths.
10. **Expected path.** `expectedOverallPath` with `aging: "ability"` matches `developOne` run over the same man and years. (The toy's `check.ts` matched `expectedOverallPath` on today's rules only, worst error 0.0000 over 1,496 player-years, MEASURED; it says nothing yet about an ability path, so this test is new work.)
11. **Calibration copy pin.** Calibration adds `ABILITY_GROUP_COPY` with its own digest, beside `RATING_GROUP_COPY` / `RATING_GROUP_DIGEST` (`careerCheck.ts`). `GROUP_MEMBERS` itself is left unchanged, so its digest stays.

#### 12.2.8 How the 20-season check judges it

The toy is read as a change from its own baseline, never as a forecast by itself. "Projected" = the sim today (MEASURED, grade) + (toy D − toy today), with toy today's rookies at the sim's 22-24 (`model/out/project-D.md`, 6 leagues, seed 23). It is a GUESS until AB9 measures it. "Rules only" holds the rookie ages equal on both sides (toy D − toy today with real rookie ages), so it shows what the curves alone do.

| Row (CAREER_BANDS) | Today (grade, MEASURED) | Real (REAL) | Toy D / projected D (toy MEASURED; projection GUESS) | Expected direction |
|---|---|---|---|---|
| peak-usage (GATE) | QB 28, RB 26, WR 28, TE 29, OL 29, EDGE 29, IDL 29, LB 27, CB 29, S 27 | 24-26 for every group (`NFL_CAREERS`) | Toy D: QB 30, RB 25, WR 26, TE 27, OL 29, EDGE 26, IDL 29, LB 26, CB 26, S 26. Projected: QB 27, RB 24, WR 25, TE 27, OL 27, EDGE 25, IDL 27, LB 23, CB 26, S 23 | Down 2-4 years for most groups. Inside ±1.5 years for RB, WR, OL, EDGE, IDL, LB; QB, TE and CB still late; S may land early |
| at99 (GATE) | 51.75-97 a league (2036-45 mean 87.5) against the gate 44.5 | — | Toy today 79.8, toy D 38.6. The toy's today is about 0.91× the sim's, so D projects to about 42 in the sim, close to the gate; D + O2 about 36 | Down, but likely needs O2 (AB9-T4) for room; §12.6 |
| share-31-group (REPORT) | LB 11.1% vs 4.7%; LS 17.3% vs 41.1% | REAL as shown | LB: toy 9.9%, projected 11.2% (rules only +0.1). LS: toy 27.0%, projected 27.9% | LB unchanged and still out; LS better but still short (§12.7) |
| age-group (GATE) | fails on one group | — | — | Re-measure |
| careers / reach 5 (GATE) | league 0.299 vs 0.448 (already failing) | 0.448 | Rules only: down in every group, 2-11 points (league, man-weighted: 39.0% → 31.4% in the toy) | **Down: a risk of variant D.** Lower and earlier peaks mean men lose their spots sooner. AB9 must report it; the market thread's exits (M4) are the other side of it |
| decline size from 30 | — | QB loses 2-4 snap-share points a year, CB 12-14 | The curves alone cannot match the size: the sim gives about 1.17 snap-share points per overall point (MEASURED, sim, build 3b3c7b2006e9cb1a, no class talent; `model/simusage.ts`). Spearman of the group order: today 0.41, D 0.35 | Order not better than today; size still short; report it |
| league age (GATE: mean, 31+, 34+, pooled sd) | mean 26.31, 31+ 10.5%, 34+ 3.0%, pooled sd 7.52; all PASS today | per `NFL_CAREERS` (2022-24 graded: 26.27 / 10.1% / 2.9%) | Toy, today → D: mean 26.28 → 25.96, 31+ 12.2% → 12.7%, 34+ 3.5% → 4.8%. Projected: mean about 26.0, 31+ about 11.0%, 34+ about 4.3% | Mean down a little, 31+ up a little, 34+ up about 1.3 points. These are passing GATE rows; 34+ (at most NFL + 2 = 4.9%) could come close to failing. The lower floor may also shrink the pooled sd |

New measure-only rows (AB1, reader v6), all measure-only:
- ability-group means by age;
- 99s by rating, by ability group and by age;
- the spread of team overall and how it carries from year to year (§12.6).

### 12.3 B. Injuries

#### 12.3.1 Risk follows the depth-chart spot (`injuryRisk: "spot"`)

**Today.** `gameInjuries` and `weekInjuries` (`players/injuries.ts`, lines 259 and 282) read `POSITION_GROUP[p.bio.position]`, and so does `expectedAvailability` (`players/availability.ts`, line 380). The chart (`players/depthChart.ts`) is rebuilt each week by `bio.position`, so a charted man's spot is his listed position today. The rule below is about where the risk *comes from*: it gives the same answer now, and it stays right once teams play men away from their listed position.

**The spot** is the `Position` key on this week's chart that lists him: QB, RB, FB, WR, TE, LT, LG, C, RG, RT, DE, DT, NT, OLB, MLB, ILB, CB, FS, SS, K, P, LS.
- A man on two keys takes the first in chart order (CHOSEN).
- A man on no key (practice squad, unsigned, out injured) takes factor 1 and the league-wide kind mix (CHOSEN).
- Practice injuries and the kind mix both use the spot's group (LT/LG/C/RG/RT → OL, and so on), from the same chart key, never from `bio.position`.
- `expectedAvailability` follows the same rule. Under `injuryRisk: "spot"`, a caller that passes no spot gets the chart key that lists him, or, on no key, the no-key rule (factor 1, the league kind mix). It never falls back to `POSITION_GROUP[bio.position]` (`availability.ts` line 380 today).

**Spot factor** = today's group `byGroup` × (the REAL per-1,000-snap rate at that fine position ÷ the REAL group rate). This keeps today's fitted group levels and splits them inside the group. All inputs are REAL (`reports/injury-rates.md`); the factors are computed from them.

**What the REAL rates count.** They are counted by fine listed position: nflverse's `depth_chart_position` holds the man's position in its fine form (CB, FS, SS; T, G, C; DE, DT, NT; OLB, ILB, MLB), not the game-day depth chart (`injury-rates.md`, "By depth-chart spot"). Men moved on game day are not seen. So the owner's "recount by depth-chart spot" split the groups into fine positions; it did not see where men actually played. The sim applies them by the chart key his team gives him, which is what R2 asks for.

| Spot | REAL rate per 1,000 snaps, by fine listed position (nflverse `depth_chart_position`; men moved on game day not seen) | Factor |
|---|---|---|
| QB | .876 | .85 |
| RB | 1.839 | 1.60 |
| FB | 1.345 | 1.17 |
| WR | 1.320 | 1.22 |
| TE | 1.118 | .99 |
| LT/RT | 1.039 | .97 |
| LG/RG | .783 | .73 |
| C | .810 | .76 |
| DE | 1.061 | .98 |
| DT | .924 | .85 |
| NT | 1.200 | 1.10 |
| OLB | 1.020 | .88 |
| ILB | 1.022 | .88 |
| MLB | .912 | .78 |
| CB | 1.372 | 1.21 |
| FS | .936 | .82 |
| SS | 1.042 | .92 |
| K | 1.877 | 1.21 |
| P | .645 | .42 |
| LS | .613 | .40 |

The K, P and LS counts are small (48 / 18 / 15 injuries; REAL). Their factors are reported, but get no weight in the grade.

**Lives in** `injuryTables.ts` `INJURY_RATES.game.bySpot` (new, beside `byGroup`) and `injuries.ts` `spotOf(chart, player)`. `availability.ts` `expectedAvailability` gains a `spot?` option; with none it reads his chart key as above. The money thread decides when its callers pass one (§12.11, M3).

#### 12.3.2 The age factor, measured and smoothed

**REAL.** Injuries per snap, observed over expected (against each band's listed-group mix: each band's player-games at each listed group's all-ages rate), by age band (25 and under, 26-28, 29-30, 31-32, 33 and over): 0.99 / 0.96 / 1.04 / 1.20 / 1.01, with SE ±.02 / .02 / .04 / .06 / .07. Player-games in each band: 63,653 / 39,280 / 14,548 / 7,056 / 4,354.

**Today (GUESS).** `riskFactor` in `injuries.ts` uses `1 + 0.04 × max(0, age − 26)`. At 33, with durability's own fall, that comes to about 1.28 × 1.10 ≈ 1.41, against REAL 1.01-1.20.

**Smoothing (CHOSEN method on REAL inputs):**
1. Pool the bands with too few men to stand alone:
   - 28 and under: (63,653 × .99 + 39,280 × .96) / 102,933 = 0.98;
   - 29-30 stays 1.04;
   - 31 and over: (7,056 × 1.20 + 4,354 × 1.01) / 11,410 = 1.13.
2. Put the knots at the pooled bands' middles: (27, 0.98), (29.5, 1.04), (32.5, 1.13). Join them with straight lines, flat outside.
3. Divide each knot by the typical man's durability factor at that age, from `OWN_CURVES.durability` through `exp(−0.02 × (d − 65))`. Those factors are 1.000, 1.021 and 1.087. Durability's own fall already raises an older man's risk, and this keeps it from being counted twice.

Knots used: (27, 0.98), (29.5, 1.02), (32.5, 1.04), flat outside. These are CHOSEN, computed from REAL. Tuning may move each knot by up to one SE, and only on the reader's injuries-by-age row.

**Level refit.** Over the REAL age mix, today's factor averages about 1.05 and the new one about 0.99 (computed). So the spot path gets its own level, `INJURY_RATES.game.bySpot.perSnap`, refit by the existing season-run fitting test and expected to sit about 5-6% above today's `perSnap` (.00132, fitted). Today's `INJURY_RATES.game.perSnap` is not touched, so the group path is unchanged (§12.3.5, test 9).

#### 12.3.3 Slower healing only where measured

**REAL, 31+ against younger** (Kaplan-Meier share out 4+ weeks):

| Class | 31+ | Younger | Distance | Cases (31+) |
|---|---|---|---|---|
| Back / neck / ribs / other | about 43.9% | 33.2% | about 1.9 SE | 86 |
| Concussion | about 27.9% | 17.1% | about 1.7 SE | 54 |

Both classes sit under 2 SE (two-sample SE: 5.75 points for back and the rest, 6.34 for concussion; REAL counts from `injury-rates.md`, computed the same way for both rows). Soft-tissue and joint injuries show no slowing with age, so none is added.

- **Back / neck / ribs / other: proposed, on the spot path only, as a tuning arm the grade can drop.** It is the larger gap of the two, but under 2 SE, so it is a judgment call against the plan's "only where the full count shows it"; AB9 reports the arm with it and without it.
  - At 31 and over, the LONG and MAJOR week buckets of `INJURY_KINDS.back` and `.ribs` (and any kind in that class) are multiplied by m = 1.57, and the buckets are renormalized (`pickWeighted` divides by the total).
  - Why 1.57 (computed from REAL): multiplying two buckets by m and renormalizing multiplies the *odds* of 4+ weeks by exactly m, whatever the kind's own base share. The REAL odds ratio is (43.9/56.1) ÷ (33.2/66.8) = 1.57. A plain share ratio (1.32) would move back's own 4+ share (47.7% of its time-loss draws, 33.7% of all draws) only about 1.15-1.19×, and ribs' about 1.17-1.21×.
- **Concussion: not yet.** Let the repeat rule (§12.3.4) carry the older men's longer absences, since older men have more priors, then measure on AB1's concussion-length row. Add an age term only if a gap stays.

**Lives in** `injuryTables.ts`, as `HEALING_BY_AGE: { from: 31, classes: ["back", "ribs", ...], longMajorOdds: 1.57 }`, a table only the spot path reads. `injuryRisk` is threaded through `gameInjuries`, `weekInjuries` and `healWeek` into `drawInjury` and `lastingMark`, which read it only on the spot path.

#### 12.3.4 The concussion mark and the repeat rule

**REAL.** Out 4+ weeks:

| Concussion | Share | Cases |
|---|---|---|
| First seen | 16.0% | 452 |
| A later one, with quick relapses set apart | 26.3% | 77 |
| A quick relapse | 55% | 12 (too few to model) |

By age band, the shares run 17.5 / 16.0 / 17.8 / 25.7 / 30.3%.

**Repeat rule (spot path only).** In `drawInjury`, a concussion's LONG and MAJOR week buckets get:
- × 0.61 when `priorOfKind` = 0;
- × 1.14 when `priorOfKind` ≥ 1.

The buckets are then renormalized, so each multiplier scales the odds of 4+ weeks: m = [t/(1−t)] ÷ [s/(1−s)].
- s is the table's own share: `INJURY_KINDS.concussion.weeks` is SHORT .761 / LONG .084 / MAJOR .155, so 23.9% of time-loss draws are out 4+ weeks (16.9% of all draws once the 29.3% day-to-day share is counted). The time-loss share is the one to use, since the REAL spells are time-loss spells.
- t is the REAL target: 16.0% for the first seen, 26.3% for a later one with quick relapses set apart. That gives m = 0.61 and 1.14 (computed).
- This puts the spot path's concussion lengths on the REAL ones. The pooled 4+ share falls from the table's 23.9% to about the REAL pooled 18.3% (REAL: (452 × 15.97% + 89 × 30.45%) / 541 spells, `injury-rates.json`), depending on the sim's mix of first and later concussions. The group path keeps the table as it is.

`priorOfKind` counts `PlayerMemory.injuries` of the same kind, plus P8 history (§12.3.7).

**Mark.** A new `CONCUSSION_MARK = { minBand: "DAY_TO_DAY", ratings: { durability: −1 } }` (CHOSEN size) in `injuryTables.ts`, read by `lastingMark` only on the spot path. `INJURY_KINDS.concussion` itself is not changed: `lastingMark` reads `INJURY_KINDS[kind].lasting` with no switch today (`injuries.ts` line 331), so a mark added there would change every `--injuries` run on the default path. The mark sits on top of today's `REPEAT_DURABILITY` {0, 1, 2, 3} and `MARK_AGE` scaling, so a repeat leaves more. Its size gets no REAL anchor (none exists), so the reader reports durability by number of concussions.

#### 12.3.5 Tests (injuries)

1. **No position.** Two men differing only in `bio.position`, on the same chart key, have identical risk, kind mix and lengths, and identical `expectedAvailability` (with a spot passed and with none). One man moved from key WR to key CB takes CB's factor.
2. **Off-chart.** The factor is 1 and the kind mix is the league's.
3. **Spot table.** Every `Position` key has an entry.
4. **Age factor.** It hits the knots, is flat outside, is continuous, and equals today's when `injuryRisk: "group"`.
5. **Refit.** The season-run fitting test re-pins `perSnap` on the spot path, and holds the league rate within its band.
6. **Healing.** At 31+, the odds of 4+ weeks for back and ribs rise 1.57× (exact, from the buckets). At 30 there is no change. Concussion gets no age term. On the group path nothing changes.
7. **Repeat.** Over 50,000 time-loss concussion draws on the spot path, the first-concussion 4+ share is about 16.0% and the repeat share is about 26.3% (±1 pt). On the group path the table's 23.9% stands.
8. **Mark.** On the spot path a concussion leaves a durability mark of −1 × `markScale`, larger on a repeat. On the group path it leaves none, as today.
9. **Unchanged.** Every `players.injuries` / `availability` test passes unchanged on the group path, including `healWeek` (the mark, the repeat weights and the 31+ healing live in tables only the spot path reads).

#### 12.3.6 Wear from mileage (contact taken)

**Existing records.** Nothing counts contact today:
- `PlayerDevelopment.snaps` counts all snaps, and snaps alone would wear quarterbacks and linemen like running backs;
- P4 `GameParticipation.contests: { attr, won, lost }[]` is handed back after each game, but not kept.

**New counter, with no contracts edit.** `PlayerMemory.contact` goes in franchise `players/types.ts`. It is a running count of contact taken, saved through S1's `depthMemory: unknown` like the rest of `PlayerMemory`, and it starts at 0 for everyone. It is kept only with `aging: "ability"`, so a default-path save is unchanged; AB1's measure of contact per snap reads the participation rows in calibration, not this counter.
- `CONTACT_RATINGS` (CHOSEN) is runBlock, passBlock, sustain, anchor, power, passRush, powerMove, blockShed, runStuff, tackling, ballSecurity, catchInTraffic, elusiveness, yac.
- **Counting contests, not ratings.** P4's participation credits one contest once for every rating its roll names (`calibration/src/season/participation.ts`, `attrsOf` and `credit`), and `playerWeeks` merges contests by rating. So a carrier's break-tackle contest (elusiveness + power, `engine/src/tunables.ts` about lines 2966-2972) would count 2 while the tackler's counts 1 (tackling; strength is not listed). That tilts the count by role. AB1 therefore groups `CONTACT_RATINGS` into roll sets: ratings that appear together in one contact check's terms on the same side (for example {elusiveness, power, yac} for a carrier; {tackling} for a tackler). Each week, `playerSteps` adds, for each roll set, the largest `won + lost` among its ratings, and sums across sets. That is a lower bound on contests and never counts one contest twice. The roll-set table lives in franchise; a calibration test (calibration may read the engine, ADR-012) walks the engine's contact check profiles and fails if a contact check names two listed ratings from different sets on one side.
- It never reads `bio.position`. It reads what he did on the field.

**Effect.** `wear = perContact × max(0, contact − free)` years. It is added to the years past of SPEED, QUICKNESS, SPRING, STRENGTH and DURABILITY (§12.2.1: `a − start − s + wear`), so more contact makes him fade as if he were older.
- `free` = the median career contact at age 27 (MEASURED in AB1 first).
- `perContact` is a GUESS, set in tuning so that the top tenth of contact takers by age 30 run about 1 year ahead.

**Order of work.** AB1 measures contact per snap by spot before any effect lands, as information only. `perContact` is then set in tuning as planned (AB9-T5). Contact taken is what a man does at the spot his team plays him, which R1 allows; it is the approved "wear from mileage" piece, so it is not dropped for following spot.

**NEW-4 (not asked now).** A contact count on the growth record (contracts) is needed only to seed real veterans' past contact, or for `expectedWalk` to see it. Real veterans start at 0, like everyone. The cost is that the oldest real men are under-worn at league start; this is reported.

#### 12.3.7 Real veterans' injury history (P8)

Contracts, `packages/contracts/src/players.ts` (edit P8, approved):

```ts
/** ADR-087 P8: one past injury, public like an injury report. */
export interface InjuryRecord {
  kind: string;          // the importer's kind, e.g. "real:knee" (franchise maps it)
  weeks: number;         // game weeks missed
  since: CalendarStamp;  // when it started
  healed: CalendarStamp; // when he was back
}
export interface PlayerCondition {
  // ...stamina, morale, injury? (unchanged)
  /** ADR-087 P8: injuries before the league's first day, oldest first. Absent = none known. */
  injuryHistory?: InjuryRecord[];
}
```

The type pins go in `contracts/test/development.test.ts` (helpers from `typePins.ts`): `injuryHistory` is optional, and `InjuryRecord` has exactly these four keys.

**Importer.** `packages/attributes/src/importer/real/` (the one module allowed to touch real data, Iron Rule 7) builds the records.
- **The source today has no history.** `history.ts` `CareerHistory.injury` is one line, `{ week, part, status }`: the latest listing on the snapshot season's injury report (`buildHistory` keeps each man's last row, and the importer reads only that season's injuries file). It has no weeks missed, no start or healed dates and no past seasons, so `InjuryRecord[]` cannot be built from it. `standin-development` reads the league file alone, so it cannot build them either.
- **So AB7 adds a reader inside the importer.** It reads past seasons' injury reports and weekly rosters from the nflverse cache (the seasons `injury-rates` reads, 2019 on, up to the snapshot date) and builds spells by the same definitions `injury-rates` counts them with (`reports/injury-rates.md`, "Time-loss injury (spell)" and "Weeks out"). Those rules live in calibration, which the importer may not import, so they are copied into the importer and pinned by a shared fixture test on both sides. Each spell's kind is `real:<part>` from the report text; weeks are calendar weeks out; `since` and `healed` are its first missed week and the week he was back.
- The open spell he is in at the snapshot is already copied as `condition.injury` (`importer/real/development.ts` about line 235), so it is left out of `injuryHistory`.
- `import-real` stores the spells in `provenance.history` with the rest of his career history (`provenance` is an attributes-owned `unknown` slot in contracts, so no contracts edit), and `standin-development`, which already reads `provenance.history` (`importer/real/development.ts` about line 145), writes P8 from there. Only kind, weeks and dates cross over. No name or real id crosses; the file stays keyed by stand-in id.
- It is written at `standin-development/3`. `stripStartingDevelopment` strips it.
- Durability set from history goes in the startingDevelopment provenance, and is applied only with `--injuries` and `injuryRisk: "spot"`.

**Loader.** `standInLeague.ts` knows `/3`. `forSwitches` keeps `injuryHistory` only when injuries are on and `injuryRisk` is `"spot"`; otherwise it strips it, in the same PR (today it strips only `condition.injury`).

**Franchise.** Only with `injuryRisk: "spot"`, and only when `people.playerMemory` is absent, it seeds `PlayerMemory.injuries` from `injuryHistory` once, mapping `real:<part>` to its own kinds with a mapping table in `injuryTables.ts`. Unknown parts go to "other".
- Why only on the spot path: a seeded entry is a prior, so the first in-game injury of the same kind would take `REPEAT_DURABILITY`, and a recent healed stamp raises risk ×1.3 (`injuries.ts` `heal` about lines 372-385, `recentlyBack` line 144). On the group path that would change a stand-in `--injuries` run at default options and break inertness proof 2.
- The same mapping table is applied to the copied current injury (`real:<part>` in `condition.injury`) when it heals into memory on the spot path, so `priorOfKind` and `REPEAT_DURABILITY`, which compare kinds as strings, count a copied concussion and a seeded one as the same kind. On the group path the copied injury heals under its `real:` kind, as today.

**Tests:**
- the importer's output has no free text beyond the kind;
- a second import run changes nothing;
- seeding happens once, and a reload does not double it;
- with `injuryRisk: "group"` nothing is seeded and a stand-in `--injuries` run equals main's;
- a man with one past concussion draws a repeat-weighted next one (§12.3.4);
- a copied current concussion and a seeded past one count as the same kind once it heals (spot path).

#### 12.3.8 How the 20-season check judges injuries

| Row (CAREER_BANDS, or reader v6 new) | Judged against |
|---|---|
| `availability` (REPORT) | AB1 merges the REAL share of game weeks missed by age: 19.5 / 18.3 / 17.8 / 18.9 / 14.7% (REAL; flat with age). Today's sim runs 87.1 / 83.8 / 79.6 / 77.6 / 78.5% available, falling with age (MEASURED, grade; the definitions differ, so AB1 aligns them before judging). The spot and age factors should flatten the sim's fall. |
| Injuries per snap, by age and by spot (new, measure-only, v6) | The REAL ratios and rates above |
| Concussion 4+ week share, first and repeat (new) | 16.0% / 26.3% |
| Durability by number of concussions (new, report) | — |
| Contact per snap by spot (new, measure-only) | — |

### 12.4 C. Retiring on his own (`retirement: "choice"`)

#### 12.4.1 The news (E6)

Contracts, `packages/contracts/src/events.ts:812-816` (edit E6, approved):

```ts
/** ADR-087 E4/E6: `reason` "UNSIGNED" = nobody signed him in time (§6.1); "OWN_CHOICE" = he chose
 *  to retire (§12.4); absent = his own choice (saves before E6). `team` = the team he left, absent
 *  for a free agent. `timing` "SEASON_END" = when the regular season ends; camp opening is "LATE". */
| { type: "PLAYER_RETIRED"; payload: {
    player: PlayerId;
    timing: "IMMEDIATE" | "SLOW" | "LATE" | "SEASON_END";
    reason?: "UNSIGNED" | "OWN_CHOICE";
    team?: TeamId;
  } }
```

`reason` stays optional, so old saves and tests still read. Calibration's `careerCheck.ts` already counts any reason other than "UNSIGNED" as his own choice, split into `ownSigned` and `ownUnsigned`, so its counting stands. It will read `team` instead of working it out.

The type pin: `reason` is `"UNSIGNED" | "OWN_CHOICE" | undefined`.

#### 12.4.2 The three moments

These follow `franchise-calendar.md` §5's windows: the review is immediate, the opening of free agency is slower, and camp is last.

| Timing | When (franchise calendar) | Why there | Share of the year's chance |
|---|---|---|---|
| IMMEDIATE | OFF_EVAL w1 d7 | After `creditSeason` (w1 d1), before the cap is set (w2 d1) and before teams re-sign (w3 d1) | about 0.5 (CHOSEN) |
| SLOW | OFF_RESET_FA w1 d2 | The day after the new league year (w1 d1), before the first free-agent signing; a test asserts the order | about 0.25 (CHOSEN) |
| LATE | TRAINING_CAMP w1 d1 | Before `retirementMoment`'s unsigned check (`unsigned.ts`), so his own choice comes first | about 0.25 (CHOSEN) |

The shares split one yearly chance `p` so that the three together give `p`: at moment *k*, `1 − (1 − p)^{share_k}`.

#### 12.4.3 The chance model

The model is a logistic one: `logit p = a(age) + Σ terms`. Every input is his own record, never `bio.position`. The terms below are GUESSES for starting points; tuning sets them.

| Input | Term | Start value |
|---|---|---|
| Age | `a(age)`: a table by age band, started from the REAL retired-list rates (25 and under 0.20%, 26-28 0.50%, 29-30 1.28%, 31-32 2.32%, 33 and over 2.95%; REAL lower bound, NFL reserve/retired list, Y 2021-24) | logit of those rates |
| A long injury this year | + b₁ if he had a LONG or MAJOR injury this league year (public, as on his injury report). A lasting mark is not read: marks are truth-layer (`INJURY_HEALED`; contracts `players.ts` about line 118 keeps an injury's lasting cost hidden), so reading one would be a second truth read under NEW-1. The mark still acts through durability and the rating-fall term | b₁ = 0.7 |
| Rating fall | + b₂ × max(0, last review's overall − this one), in points. The overall is `overallWithCarry` at the profile his team charted him at most last season, or his best profile if he was not charted. The same profile is used both years. It only judges him (R1). Last review's overall is stored in a new franchise-only `PlayerMemory.lastReview` (no contracts edit), written at each IMMEDIATE moment. It reads true ratings: **NEW-1** | b₂ = 0.15 a point |
| Years in the league | + b₃ × max(0, credited seasons − 6). REAL by years: 0.09 / 0.20 / 0.41 / 1.37 / 3.54% (0, 1-2, 3-5, 6-9, 10+) | b₃ = 0.15 |
| Lost his job | + b₄ if he started (50%+ of his side's snaps) the season before and did not this season, from starts kept in `PlayerMemory.starts` (new franchise field, no contracts edit). His side comes from the chart key that lists him, else where most of his snaps came (§12.2.6), never `bio.position` | b₄ = 0.6 |
| Money ahead | − b₅ × (cash still owed on his deal ÷ the cap). Signed men only; free agents take 0 | b₅ = 4 |
| Any age | floor: p ≥ 0.05% (a young man may leave out of nowhere) | 0.05% |

The draws come from `rng.fork(\`retire/${season}/${timing}\`)` and then a fork by player id. This is deterministic, and it is independent of list order.

**Lives in** new `packages/franchise/src/players/retirement.ts` (`retirementChance`, `ownRetirements`). `playerSteps` (`steps.ts`) calls it on the three days, before the unsigned step on the LATE day.

#### 12.4.4 The money path

The money code already has a "retired" option: `cap/money.ts` `releasePlayer(c, at, { reason: "RETIRED" })` at line 105. It books a `DeadMoneyCharge` with reason RETIRED, ends the contract with ContractEndReason RETIRED, and sends no `PLAYER_RELEASED`. Nothing calls it yet.

The work splits in two, because `release(book, dead, player, team, at)` (`draft/money.ts` line 71) reaches only the contract book and the dead money.
- **`retire(book, dead, player, team, at)`** goes in `draft/money.ts`, modeled on `release` (which uses `liveIndex`). It books only the money: it calls `releasePlayer(c, at, { reason: "RETIRED" })`, pushes the charges to `dead`, ends any later deal he holds with the same team, and returns the charges and events. It sends no `PLAYER_RELEASED`.
- **`retirement.ts` `ownRetirements`** does the rest: it takes him off the team's roster, depth chart, practice squad and reserve, and off `freeAgents`; it calls `forget`; and it sends `PLAYER_RETIRED { reason: "OWN_CHOICE", team, timing }`.
- **`forget`** (`players/unsigned.ts` line 173) is private today. It is exported and extended to drop `unsignedSince` (which `unsignedDay` drops on its own today) and the new memory fields (`contact`, `starts`, `lastReview`).

When the dead money lands, following `transactionYear` / `isAfterJune1`:
- IMMEDIATE (OFF_EVAL) books into the next league year, all of it before June 1;
- SLOW books in the new league year, before June 1;
- LATE (camp) falls after June 1, so the dead money splits over two years.

Not modeled: the clawback of a signing bonus (`ContractYear.springBonus.clawbackOnRetirement`) is the money thread's.

Money tests (`cap.money` / `draft` tests):
- each moment books the right years;
- a man with a later deal ends both;
- the team's cap room goes up by the cap hit less the dead money;
- no `PLAYER_RELEASED` is sent.

**Send the money thread this shape first** (§12.11, M1). Build AB8 only after its answer.

#### 12.4.5 Tuning targets and how the check judges it

| Row | Target | Today (grade, MEASURED) |
|---|---|---|
| `retired-signed` (REPORT) | By his own choice while signed, within a year of a final-week 53: 0.20 / 0.50 / 1.28 / 2.32 / 2.95% (REAL, lower bound; ≤25, 26-28, 29-30, 31-32, 33+). Tuned to these rates as they are (owner, 2026-11-07 Q6: quiet exits after being let go are already covered by §6.1's two-season unsigned rule, so no allowance above the list) | 0 (no own choice exists) |
| `back-on-53` (REPORT) | 88.1 / 85.3 / 80.4 / 74.1 / 72.4% (REAL; ≤26, 27-28, 29-30, 31-32, 33+) | 0.740 pooled vs 0.854 |
| `starters-gone` (REPORT) | 0.68 / 1.74 / 8.08 / 11.60 / 21.18% (REAL; ≤25, 26-28, 29-30, 31-32, 33+) | 0.186 pooled vs 0.037 |
| OverTheCap signed again (reported beside back-on-53) | 94 / 89 / 86 / 71 / 58% (REPORTED by OverTheCap) | — |
| New, measure-only (v6) | Retirements by moment, and by years in the league | — |

**Caution.** The sim already over-exits: starters gone is 0.186 against 0.037, and back on a 53 is 0.740 against 0.854 (MEASURED, grade). Those exits come from the market and cut-downs, not from retirement.
- Own-choice retirement adds exits, so it is tuned on `retired-signed` alone, never to close the exit gaps.
- **A change from the plan the owner saw.** The plan named two tuning targets: the retired list by age, and "all exits by age together matching the real league". The second moves to the cap and market thread (§12.11, M4), because the sim already has too many exits and retirement can only add more. It was put to the owner as Q6, and he agreed (§12.12).
- With retirement on alone, `back-on-53` and `starters-gone` should move a little the wrong way. That is expected, and the report says so.

#### 12.4.6 Tests (franchise `players.retirement.test.ts`)

1. **No position.** The same man under two `bio.position` values, on the same chart key, gets the same chance, the same starts count and the same last-review overall.
2. **Floor and order.** The chance is at or above the floor at 22. It rises with age, injury, rating fall, years and a lost job, and falls with money ahead.
3. **Same seed.** The same seed gives the same retirements. Shuffling the roster order changes nothing.
4. **Moments.** Each one fires on its day, never with `retirement: "unsigned"`. On the LATE day the unsigned step still runs after it.
5. **Signed vs free agent.** A signed man goes through `retire()` (money tests above) and `ownRetirements` removes him from his team. A free agent leaves `freeAgents` and sends `team` absent. `forget` drops all his memory, `unsignedSince` included.
6. **Old rule unchanged.** All `unsigned.test.ts` tests pass unchanged.
7. **Tuning helper.** Over a fixed toy roster, the yearly chance by band hits the `a(age)` table when every other term is 0.

### 12.5 D. Rookie ages for made-up classes (`aging: "ability"`)

**REAL** (rookies on week-8 53s, 2018-24): 20 and under 0.2%, 21 12.8%, 22 31.5%, 23 35.4%, 24 16.6%, 25 2.9%, 26 and over 0.6%. The whole-year mean is 22.67. With fractional ages, drafted rookies average 23.01 and undrafted 23.63, about 0.6 older.

**Today.**
- The draft class draws `age: 21 + rng.int(0, 2)` (`draftClass.ts`, the last draw per prospect).
- The made-up league draws its own way (`generate.ts:168`).
- Undrafted men without credited seasons get `seasonsIn` = age − 22 (`cutdown.ts`).
- Ours: rookies' mean 22.995; share of the league 22 or under 5.5% vs 7.1% (MEASURED, grade, row share-22).

**New draw.** It applies with `aging: "ability"` and growth on only. Sim ages go up one at camp (`turnYear`), so the draft-day spread is one year younger. Draft-day shares (computed from REAL; the ≤20 sliver is folded into 20): 20 13.0%, 21 31.5%, 22 35.4%, 23 16.6%, 24 2.9%, 25 0.6%.

How it is drawn:
- The old `rng.int(0, 2)` draw is still made and thrown away, so every later value in the stream is unchanged.
- The new age comes from the prospect's `development` fork, under a new `"age"` label.
- The undrafted are made older by linking age to talent, so the less talented (who go undrafted) run older. A Gaussian copula takes `z_age = −ρ·z_talent + √(1−ρ²)·e`, mapped through the shares above. ρ starts at 0.3 (GUESS). A calibration tuning run sets it so that, after the draft, undrafted signees average about 0.6 years older than drafted men (REAL 0.62); the test then checks the chosen ρ, it does not tune it.
- The made-up league's starting rosters draw rookies-to-be the same way. Their older men keep today's spread with the specialist term dropped (§12.2.6). That makes made-up specialists younger at league start, which the share-31-group row will show for K/P/LS.

**What it moves (computed, GUESS-level estimates):**
- the rookie-age row: mean toward 22.67, share 22 or under up about 1.8 points;
- age-league about −0.05 years;
- D7 slightly up, since younger rookies learn faster under `learningRate`;
- the undrafted row: older, as is real.

**Tests** (attributes `draftClass.test.ts` and `generate.test.ts`):
- over 20 classes of 900 (`DRAFT_CLASS_SIZE`), the shares sit within ±1 pt of the target;
- every non-age field is deep-equal to main;
- under `aging: "position"` the whole class is deep-equal to main;
- the undrafted are about 0.6 older after the draft runs. This test lives in calibration, the only package that may both make a class (`generateDraftClass`, a permitted surface under ADR-086 R1) and run the draft (`runSeason`); franchise imports only contracts, and attributes cannot run the draft. A draft-free check sits beside it in attributes: prospects below the round-7 talent cut run about 0.6 older.

### 12.6 E. The 99s, D7 over-starting and the win spread

| Problem | Today (grade, MEASURED) | What in this redesign should move it | What else exists | What to measure (AB1, v6) |
|---|---|---|---|---|
| Ratings of 99 | 51.75-97 a league (2036-45 mean 87.5) against the gate 44.5 | The lower learning floor (0.08) and fewer late workouts, which stop strength climbing into the late 20s (strength 99s 35.4 → 7.2 a league in the toy). Toy (MEASURED, toy, v2; `ninety9.ts` via `options.ts`): today 79.8; C 65.3; C+O1 43.2; D 38.6 (D already has O1's early end to workouts); D+O2 (smarts snaps halved, 0.45 to 0.225) 33.0. Like for like, D cuts the toy's 99s from about 80 to 39. The toy's today is about 0.91× the sim's 87.5, so D would be about 42 in the sim (GUESS), just under the 44.5 gate, and D+O2 about 36 (GUESS). | O2: a tuning arm (AB9-T4), likely needed for room. O3 / O4 (toy 12.2 / 17.7) act like a ceiling on ratings. They clash with Q1/F1's "no ceilings", so they are not proposed; the owner would have to ask. | 99s by rating, by ability group and by age; and the share of 99s that are smarts (under D, smarts are the largest source: 14.0 of 38.6 in the toy) |
| D7 over-starting | .716 / .639 / .553 / .361 against .635 / .512 / .410 / .239 (REAL) | The lower floor and fewer workouts slow mid-round men's growth. Younger rookies (§12.5) push slightly the other way. Exits that open jobs come from the market. | Class talent (5253037) is already the lever. Re-check D7 whenever peaks move. | D7 by round, with starts by age |
| Win spread / win r | 2.651 < 2.75; r 0.029 vs 0.40 (REAL) | Each man's own clock gives teams more lasting differences, so a team of late faders stays good longer. Small, and it may not be enough. | The money and market threads (keeping a good team together) | The spread of team overall, and its year-to-year r, beside win spread |

**Risks to watch:**
- **Drift.** D lowers the typical starter's overall at 30 by 1-4 points against today (MEASURED, toy, `out/tables.md`; QB −0.9, RB −4.0, OL −4.1, IDL −3.4). The lever is class talent, with a D7 re-check.
- **Careers.** Reach 5 falls 2-11 points in the toy, like for like (§12.2.8). It is already a failing GATE. AB9 reports it beside M4.
- **Pooled sd.** The lower floor shrinks the passing pooled sd (7.52 today, MEASURED). The check is the passing rows.
- **The backup's share.** The backup ≥60% limit (`players.development.test.ts` lines 372 and 604) is re-checked.
- **One knob family per PR.** The tuning limits recorded with the owner's D5b answers (ADR-087 §11) say one knob family per PR. Variant D moves the curves, the learning floor, the workouts, smarts and passing from snaps, and slow smarts together, because the fit chose them together and the SMARTS row only works with slow smarts (§12.2.1). AB3 lands them as one fitted set. That is an exception to the limit, so it is put to the owner in Q2 rather than flagged only here. Each part keeps its own constant, so tuning can split them later.

### 12.7 F. Long snapping

**The problem.** There is no snapping rating. The LS profile in `contracts/src/measures.ts` `POSITION_PROFILES` has core passBlock and sustain ("There is no snapping rating"). So a snapper ages like a blocker.
- REAL: LS 31+ is 41.1%, the oldest group.
- Today: 17.3% (MEASURED, grade).
- Toy D: 27.0% (MEASURED, toy); projected 27.9% in the sim (GUESS, §12.2.8). Better than today, still well short.

**What a fix needs: NEW-3** (registry, contracts, not approved).
- Add a `longSnapping` rating through `registry.ts` `A(id, name, groups, category)`, an `{ op: "add" }` migration, special teams, KICKING ability group.
- Put it in the LS profile.
- The engine does not read it (no snap-quality play exists), so it would only shape who is charted and how snappers age.

The toy says such a rating moves snappers the wrong way at first (31+ falls from 27.0% to 20.9% with snapping weighted 1/3, and to 19.1% at 1/2; MEASURED, toy): a new skill rating learned young makes young snappers look good.

**Owner, 2026-11-07 (Q5): wait until bad snaps are part of the game.** Report LS as a known miss.

**Inside linebackers (NEW-2, same footing).** Real inside linebackers are as young as running backs. Theirs rate 3 of 8 core ratings in smarts, which hold up.
- Swapping gapDiscipline → acceleration in the INSIDE_LB profile takes the toy's LB 31+ from 9.9% to 5.4% under D (MEASURED, toy). Read as a change, that is about 11.2% → 6.7% in the sim (GUESS; REAL 4.7%): closer, but still about 2 points over. Swapping instincts → agility as well gives a toy 2.5%, about 3.8% projected.
- The profile is a contracts table, and it changes output with growth off (charts, drafts, overalls), so it cannot land inert.

**Owner, 2026-11-07 (Q4): change it now.** NEW-2 lands as its own step, AB-L, after AB0 and before the AB9 panels, once the owner types its name. It is not inert: it changes how inside linebackers are rated, charted, drafted and kept with growth off too, and `PROFILES` in `attributes/src/fictional/profiles.ts` is `POSITION_PROFILES`, so made-up linebackers are generated from it as well. Before its PR: measure what moves (golden game digests, committed calibration records, the stand-in league's charts, player-checks), tell the threads that pin them, and re-pin in the same PR; its PR text lists every re-pinned value.

### 12.8 G. W1: the `docs/design/contracts.md` wording

Add to the ADR-087 list (about lines 222-230, after P6 and C1):

> - P7 `ABILITY_GROUPS` / `AbilityGroup` (the 12 ability groups, names only) and `PlayerDevelopment.fadeShift?: Partial<Record<AbilityGroup, number>>` (in `players.ts`): for each ability, how many years earlier (minus) or later (plus) than usual it starts to fade, fixed for life; missing, or a group missing, reads 0. Drawn by the generator, written by the importer for real veterans, read by franchise's development step; the curves stay in franchise.
> - P8 `InjuryRecord { kind, weeks, since, healed }` and `PlayerCondition.injuryHistory?: InjuryRecord[]` (in `players.ts`): injuries before the league's first day, oldest first, public like an injury report; absent = none known. Written by the importer only; franchise seeds its own injury memory from it once.

Update the two shapes in the §3 code block, so it does not go stale:
- line 120, the `TrueAttributes.development` shape comment: `{ growth, snaps, carry, body: { forty, cone, vertical, bench }, fadeShift? }`;
- lines 171-174, `PlayerCondition`: add `injuryHistory?: InjuryRecord[];  // ADR-087 P8: injuries before the league's first day, oldest first`.

Replace the events line (about line 439, the E4 text) with:

> - E4/E6 `PLAYER_RETIRED { player, timing, reason?, team? }`: `reason` "UNSIGNED" = nobody signed him in time (ADR-087 §6.1), "OWN_CHOICE" = he chose to (§12.4), absent = his own choice (saves before E6); `team` = the team he left, absent for a free agent; `timing` IMMEDIATE (the review), SLOW (free agency opens), LATE (camp opens) or SEASON_END.

### 12.9 H. Build plan

Every PR follows these rules:
- small, one step at a time;
- off by default, or acting with growth on only;
- tests in the same PR (Iron Rule 8);
- an inertness proof in the PR text.

**Inertness proof** (every step from AB1 on; AB-L is not inert and re-pins instead):
1. **Growth off.** With growth off, these are byte-identical to main:
   - `season --seed homie-1 --out` → `season.json`;
   - `--stop-after 9 --save` / `--load`;
   - the stand-in league as a switched-off run reads it: the loader pin `PLAYERS_BEFORE_RECORDS_SHA256` (`calibration/test/standInDevelopment.test.ts` lines 34 and 44-45), plus season runs from that file with the switches off. The file's own bytes do change at AB2 and AB7 (the importer writes `fadeShift`, then `injuryHistory`, whatever the switches), so the file itself is reviewed as a data diff;
   - the golden 50 / 100 game digests.

   The diff is empty.
2. **Growth on, defaults** (AB1 to AB10; AB11 is the step that changes them). With growth on and the new options at their defaults, the event stream is identical to main's for the same seed (`season --development --injuries`, events compared), and the career-check rows are equal.
3. **Contracts.** The contracts tests and type pins pass. `pnpm -r build` and `pnpm -r test` are green.

**Rebased onto 2241964 (2026-11-08).** AB0 to AB5 were rebuilt on 2241964: PR #73's head (d8ad413) with main merged at 24a79aa, which brings PR #86 (the stand-in league's 2026 rookies on their real deal lengths: 301 estimated deals, their years only) and PR #78 (the league file's officiating block, the 17 copied crews). Each step's commits were picked again in order; AB2's two also carry the pins of the regenerated league file (below). This note is written at AB0 but describes the whole rebuilt stack through AB5: read at a lower step, its parts on later steps (AB2's pins and AB2's note below, the note on the rebase onto d8ad413 that comes with AB3's review fixes, AB4's bullet, AB5's rows and runs) describe commits above that step. The note on the rebase onto d8ad413 (after AB3's review fixes, below) stands as written; its hashes are the old base's. MEASURED, 2026-11-08:
- **Conflicts.** Two in code, each resolved by keeping both sides' imports and nothing else: calibration `season/standInLeague.ts` at AB2 (AB2's `ABILITY_GROUPS` beside main's crew types) and `season/main.ts` at AB3's review fixes (AB3's `agingOf` beside main's `standInOfficialsLine`). In `standinDevelopment.test.ts` both sides' constants were kept.
- **The league file was not merged.** At AB2 main's file was taken (sha256 `c58c68ba…`) and `standin-development` wrote it at `/2` (`e9852a70…`); a second run changes nothing. Against main's file the data diff is the fade shifts alone: 2,528 of 2,528 men gain `development.fadeShift`, and the version, `basis.fadeShift` and `constants.fadeShift` change. Each man's shifts are the old `/2` file's, since they are drawn by id. The officiating block is main's to the byte. Two pins move with the file, each in the AB2 commit that needs it, so that every AB2 commit passes its tests: `standinOfficialsFile.test.ts`'s `FILE_BEFORE_OFFICIALS_SHA256` is the new file without its block (`e5cd6230…`, against main's `d9102480…`), in AB2's first commit, which writes the file; and `FILE_AT_V1_SHA256` is main's file (it was `bb55709a…`), in AB2's review fixes, which add that test. `FILE_BEFORE_RECORDS_SHA256` holds as main set it. The picks keep their messages, so the `/1` hash in AB2's note below and in both AB2 commit messages (`bb55709a…`), and the `/2` hash in its first (`1153f45f…`), are the old base's.
- **The nine reference runs did not move.** On 2241964 the nine runs of proofs 1 and 2 give the old base's bytes: A `63febe8b…`; B `--save` `66108c69…` and `--load` `8f7f112a…`; D `a6798279…`; C `036372a3…`; E `a3b82c8b…`; F `--save` `e1dafb12…` and `--load` `329818b2…`; G `4a51db00…`. The rebuilt AB5 gives the same nine.
  - The stand-in runs D and E did not move with #86. The season command's stand-in league plays without the file's deals (its people carry no contracts), so the deal lengths reach only the cap-check walk.
  - Nor did #78 move them. They now play the file's crews (D carried one winter into 2027, E as they stand in 2026; the run's log says which), and no game reads a crew until ADR-093 step 2.
- **What changed meaning: the career check's rows.** The walk plays the file's deals, so #86 moved the default rows. The 2-season check of d5b-t1 (arm `both`) gives v6 rows `20dc5eee…` at AB1 on the new base, against the old base's `7ee56f89…` (v5: `84241dcb…`, against `dcf754c5…`).
  - For example, the re-signings at the end of the 2026 league year fall from 461 to 199, since the 2026 rookies no longer come off one-year deals; the expiring deals the reader follows fall from 308 to 276.
  - At 2027 week 8 the mean overall is 66.62 (old base 66.67), the pooled sd 7.90 (7.88), the mean age 26.20 (26.26) and the win spread 2.96 (2.69).
  - The reader is still inert on the new base: AB1's rows with its own paths taken off are 2241964's v5 rows to the byte, and AB5's rows with the split taken off and the version set back are AB1's.
  - So the v6 baseline (4 tune seeds × 20 seasons, build `6b118e35f8d06440`, on the old file) no longer stands for the new base, as the earlier note said it did for d8ad413. AB9's grade needs a baseline played on the new base: on main's file (`c58c68ba…`) at AB1, or on its `/2` regeneration (`e9852a70…`) from AB2 on. At the default aging the two give the same rows (the line above: AB5's rows, played on `/2`, are AB1's, played on main's file, once the split and the version are set aside).

| Step | What | Where | Off / inert by | Rows it should move (when switched on) |
|---|---|---|---|---|
| AB0 | P7, E6, P8 types, and W1 wording; type pins | contracts, docs | Optional fields only; nothing reads them | none |
| AB-L | NEW-2 (§12.7): the INSIDE_LB profile swaps gapDiscipline for acceleration. Waits for the owner's "yes on NEW-2" | contracts `measures.ts` `POSITION_PROFILES` (attributes `fictional/profiles.ts` generates from it as `PROFILES`) | **Not inert**: it changes how inside linebackers are rated, charted, drafted and kept with growth off too. The golden game digests, the committed calibration records, the stand-in league's charts and player-checks are re-pinned in the same PR, and its PR text lists every re-pinned value | LB share 31 and over (toy D 9.9% → 5.4%, about 11.2% → 6.7% in the sim, GUESS); with growth off, inside linebackers' overalls and charts |
| AB1 | Reader v6 (`CAREER_ROWS_VERSION` 6, `CAREER_CHECK_VERSION` 6), measure-only rows: ability means by age; 99s by rating / group / age; injuries per snap by age and spot; concussion lengths; contact per snap by spot (counted by roll sets, §12.3.6, from the participation rows; information only); team-overall spread and r; availability's REAL reference merged and aligned. Re-run the baseline on the 4 tune seeds | calibration | Reads only; the season output is unchanged | none (baseline) |
| AB2 | Draw `fadeShift` (generator, under `aging`); importer `/2` with the `"aging"` fork, `injuryHistory` kept out until AB7; loader knows `/2`; the loader's refusal test moves to an unknown version | attributes, calibration loader | `aging: "position"` leaves it absent; `forSwitches` drops it with development off (loader pin unchanged); the file is reviewed as a data diff | none |
| AB3 | Variant D as one fitted set (Q2): the ability curves, learning floor, workouts, smarts and passing snaps, slow smarts at c = 0.2, elusiveness/yac move; variant B's set kept as the T2 arm; `techniqueKnee` off; `playerWeeks` side from the chart key on the ability path; `expectedOverallChange/Path` `aging` option | franchise `players/aging.ts` (new), `development.ts`, `developmentTables.ts`, `steps.ts` | `aging: "position"` default | peak-usage, at99, share-31-group, careers/reach 5, decline order, passing rows, D7 (re-check) |
| AB4 | Rookie ages and the specialist rule dropped | attributes `draftClass.ts`, `generate.ts` | `aging: "position"` | rookie-age, share-22, age-league, undrafted, D7 (slight) |
| AB5 | Injury risk by spot (chart key; `expectedAvailability` with no spot reads the chart key), the new age factor, the spot path's own `bySpot.perSnap` refit | franchise `injuries.ts`, `injuryTables.ts`, `availability.ts` (`spot?`) | `injuryRisk: "group"`; `INJURY_RATES.game.perSnap` untouched | availability, injuries per snap by age/spot |
| AB6 | Concussion mark (`CONCUSSION_MARK`) and repeat weights; back/ribs healing at 31+ (`HEALING_BY_AGE`); `injuryRisk` threaded through `gameInjuries`, `weekInjuries`, `healWeek`, `drawInjury`, `lastingMark`; wear (`PlayerMemory.contact` by roll sets, kept only with `aging: "ability"`; `perContact` 0 until tuned) | franchise | `injuryRisk: "group"` reads none of the new tables (`INJURY_KINDS` unchanged); wear 0 | concussion rows, availability 31+, durability by concussions |
| AB7 | P8 history: a new importer reader builds spells from past injury reports and weekly rosters into `provenance.history` (`import-real`), and `standin-development` writes P8 from it at `/3`; the loader knows `/3` and keeps it only with injuries on and `injuryRisk: "spot"` (`forSwitches` drops `injuryHistory` otherwise, and `stripStartingDevelopment` drops it too, so a second `standin-development` run changes nothing; both pinned); franchise seeds memory once on the spot path; the kind mapping also covers the copied current injury | attributes importer, calibration loader, franchise | Stripped unless injuries are on with `injuryRisk: "spot"` (loader pin unchanged; the file is a data diff) | stand-in league's injuries by age in years 1-3 |
| AB8 | Retirement by choice (after M1's answer); `retire()` money path; E6 sent | franchise `retirement.ts`, `draft/money.ts`, `steps.ts` | `retirement: "unsigned"` | retired-signed; back-on-53 and starters-gone (slightly worse, expected) |
| AB9 | 20-season grade: `--ability-rules` on the 4 tune seeds; tuning arms T1 base (variant D as fitted, slow smarts on), T2 slow smarts off (variant B's whole fitted set), T3 `techniqueKnee`, T4 O2 (smarts snaps halved), T5 wear on, T6 back/ribs healing off; then pass 2 on the 12 grade seeds (`career-check -- --grade --pass 2`) | calibration (runs only) | Runs only | all of the above |
| AB10 | Real veterans aged once at league start under the ability curves: a copy of the curves in attributes, pinned by digest against franchise's; the tables freeze for this (D5b tuning limits) | attributes importer | Writes a new stand-in league file at `/4` (the Aged card: "a new league file, the old one kept"); `standin-2026-10-23.json` is left unchanged, so every run on it is unchanged | stand-in league's ages and ratings (on the new file) |
| AB11 | The new rules become the growth-on defaults: `ability` / `spot` / `choice` (already ruled, R1-R3); `AGING_PROFILES` and the position path deleted. Lands when AB9 and AB10 are done and graded. Growth off is still unchanged; switching growth and injuries on by default stays Q8's, for the owner | franchise, attributes, calibration | Growth off unchanged | the whole card |

The order is AB0 → AB1 → AB2 → AB3 → AB4 → AB5 → AB6 → AB7 → AB8 → AB9 → AB10 → AB11, with AB-L after AB0 and before AB9.
- AB-L lands once the owner types "yes on NEW-2", at any point after AB0; the AB9 panels wait for it, AB1 to AB8 do not. The steps after it prove inertness against main with AB-L in it.
- AB4 and AB5 may run in parallel after AB3.
- AB8 waits on M1.

### 12.10 NEW contracts edits (not approved; each needs the owner's typed yes)

| Edit | What | Why | Recommendation |
|---|---|---|---|
| NEW-1 (owner: yes, Q3 2026-11-07; typed name pending) | One more reader line in the `TrueAttributes` reader comment (`contracts/src/players.ts`): franchise's retirement step reads true ratings (the rating-fall term only; the injury term now reads only public injury bands, §12.4.3, so no lasting-mark read is needed) | Retirement must see how far he really fell; four franchise truth readers are listed today | Yes. Fallback without it: use his drop in snap share instead |
| NEW-2 | The INSIDE_LB profile: swap gapDiscipline for acceleration | Real inside linebackers are young | Owner chose "change it now" (Q4, 2026-11-07); typed name pending. Own step AB-L (§12.7) |
| NEW-3 | A `longSnapping` rating plus the LS profile | Snappers have no rating of their own | Owner: wait until bad snaps are part of the game (Q5, 2026-11-07); not made |
| NEW-4 | A contact count on the growth record | Seeding real veterans' past wear | Not asked now |

### 12.11 Notes for other threads

- **M1, money.** Send the retirement shape (§12.4.2-12.4.4) before AB8: the moments, `retire()` calling `releasePlayer(c, at, { reason: "RETIRED" })`, the dead-money years, and the clawback left to them.
- **M2, money.** `expectedOverallChange` / `expectedOverallPath` gain an `aging` option. That thread decides when its callers read it, and when it removes `cap/value.ts` `legacyRuleAge(age, position)`, `ageFactor` and `termFor(age, position)`.
- **M3, money.** `expectedAvailability` gains a `spot?` option. That thread decides which spot its callers pass.
- **M4, cap and market.** The sim over-exits now: starters gone is 0.186 against 0.037, and back on a 53 is 0.740 against 0.854 (MEASURED, grade, main). Own-choice retirement will add to that a little. The fix is in the market and cut-downs. The cap thread's step 14 already closes more than half of it on its 5-season panel (back on a 53 80.7% against main 74.7%; MEASURED by the cap thread, `/mnt/project-files/design/step14-ages/exits.md`). Of the misses left there, 38% are unsigned free agents who retire under §6.1's patience rule (half in the bottom quarter at their position) and 15% are signed then cut on cut-down day and never picked up. Re-measure the exit rows on the first joint panel (M5) before anyone tunes for them.
- **M5, cap step 14 (agreed with the cap thread, 2026-11-07).** The redesign is tuned once, against the step-14 market. Every AB9 tuning panel plays a local merge of this branch with the cap thread's step-14 head (`claude/project-thread-b4ukr0`, frozen for the panels; the cap thread sends each new head), graded on the D5b bands, with a REPORT row for the undrafted share inside each age group (25 and under, 26-30, 31 and over; REAL 2022-24 in `/mnt/project-files/design/step14-ages/`). Step 14 stays off main until the pair passes; then step 14 goes to the owner first as its own PR, and the redesign PRs follow on top. Each AB step's inertness proof stays against main.

### 12.12 The owner's answers (2026-11-07 12:15Z)

The six questions went to the owner in plain football words, recommended answer first, in the plan
doc's section "The redesign worked out, and six questions"
([plan](https://claude.ai/artifact/EdBiiswtV5vGCmypxftPm4); its text is
`/mnt/project-files/design/aging-redesign/owner-section.md`). That is the wording he answered. His
answers: *"1. Yes 2. Yes 3. Yes 4. Change it now 5. Wait until bad snaps are part of the game 6. We
don't have to worry about men who retire quietly after being let go because we have our rule that
they will quietly retire after not ending up on a roster for two seasons. We can focus on our
rostered retirements matching real life rostered retirements without having to account for soft
retirements after being let go."*

| | Question | Answer | What it sets |
|---|---|---|---|
| Q1 | Start the technique fade with the fit (from 29, gentle) and try the owner's steeper fade from 31 as a test run beside it, keeping whichever matches real careers better? | **Yes** | TECHNIQUE starts at 29 with the fitted slope (§12.2.1); the steeper fade is the `techniqueKnee` option, tuning arm AB9-T3 (§12.2.5) |
| Q2 | Five growth numbers change together (the learning floor 0.15 to 0.08, workouts ending by about 25-28, smarts from snaps 0.6 to 0.45, passing from snaps, slow smarts on), as one fitted set in one PR rather than one knob family per PR? | **Yes** | AB3 lands variant D as one fitted set (§12.2.1, §12.6). Each part keeps its own constant, so a later round can split them |
| Q3 | Retirement's rating-fall term reads his true ratings (NEW-1), or his drop in playing time instead? | **Yes** (NEW-1) | The rating-fall term reads true ratings (§12.4.3). NEW-1's line in contracts still waits for its typed name ("yes on NEW-1"), so it is not made yet |
| Q4 | Inside linebackers: swap gap discipline for acceleration in their profile (NEW-2) now, or leave it as a known miss? | **Change it now** | NEW-2 lands as its own step, AB-L, after AB0 and before the AB9 panels, once its typed name ("yes on NEW-2") comes (§12.7). It is not inert |
| Q5 | Long snappers: a snapping rating (NEW-3) now, or wait until bad snaps are part of the game? | **Wait until bad snaps are part of the game** | No NEW-3. LS 31 and over is reported as a known miss (§12.7) |
| Q6 | Tune retiring to the real retired list alone, and send the exit gap to the money and market thread? (The plan proposed aiming a little above the list, for men who retire quietly after being let go.) | **Yes**, with no allowance above the list | Own-choice retiring of rostered men is tuned on `retired-signed` to the real retired-list rates as they are (§12.4.5). §6.1's rule already retires the men nobody signs within two seasons, so quiet retirements after being let go need no allowance. The all-exits target goes to M4 (§12.11) |

**Told to the owner with the questions** (no answer needed beyond Q2 and Q6):
- The injury rates "by spot" were counted by each man's fine listed position (corner, free safety,
  guard and so on), because the real files do not show where men lined up on game day. The game
  applies them by the spot his team plays him.
- Slower healing at 31 and over for back and rib injuries is real but below the usual bar of proof,
  so it goes in as a test run the check can drop. Concussions get no age rule; the repeat rule covers
  them.
- Retiring does not read an injury's lasting mark, since the mark is hidden; it reads a long injury
  this year from his public report, and the mark still counts through his durability and his rating
  fall (§12.4.3).
- On paper, the new curves shorten careers (fewer men reach five seasons). Careers are already too
  short, so the test run reports this beside the money and market thread's work.
- The made-up rookies' first-season ages in the scratch model were a year young. Fixing that changed
  the fitted numbers; the main picture (body abilities fade early, passing and smarts late) is the
  same.

**Not asked.**
- Making the new rules the growth-on default (AB11) needs no new answer: R1-R3 already cover it.
- Switching growth and injuries on by default (Q8) still waits for the 20-season check (played with
  the cap thread's step 14, §12.11 M5), and comes back to the owner then.

## Conjoined mechanisms

Development and injuries are separate mechanisms that both change who plays and how well. Each has
its own switch, and D5a prices them alone and together (three arms) before either becomes the
default. Inside development, aging and growth are priced together, since one without the other is
not a football year. The weekly depth chart by coach style (§3.1) only matters once players change,
so it is priced inside each arm, with a check that a league of incumbent-loving coaches and one of
form-chasing coaches differ in who starts but not in how the league's ratings spread.

## Implied scope (unruled, not built here)

- Injured reserve, real replacement signings, practice squad, and what an injured player costs
  under the cap (ADR-085).
- Perception: what each team believes about a player's development and lasting injury costs.
- News stories about breakouts, declines and injuries (through perception for ratings; injuries are
  public).
- The owner's weekly practice plan as a decision (Spec #5, "practice allocation"), and setting his
  own depth chart in the game (the same situations and feelings apply, §3.1).
- Players holding views of their coach in general (ADR-084's later step with Spec #14). The strain a
  sudden demotion causes is not unruled: F3 ruled it, and it is built with that step, reading E5.
- Preseason games (season shell).
- Storylines nudging growth (narrative petition).
- In-game injuries (engine, after the pocket fix).
- Retirement in Spec #14.
- Coaches' own growth (Spec #11), which this ADR does not cover.

## Inertness proof

Claim: **while `--development` and `--injuries` are off, this ADR changes nothing the sim produces
and no output file.** The design note changes no file in `packages/` or `apps/`. As built, every new
field is optional and absent means "never changes"; the generator fills the new fields only when
development is switched on, and its new draw uses its own random stream (tested: the league and its
files are identical with the switch off); the season command stops where it does today and passes
the same players to the same resolver. Engine, playbook, play-callers and calibration's test leagues
and arms are not touched, so ADR-073's measurements cannot move. With the switches on, season
results do change, which is the point; D5a measures by how much before the owner decides on the
default.
