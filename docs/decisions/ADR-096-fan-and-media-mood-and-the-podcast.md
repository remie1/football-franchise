# ADR-096: Fans and media have a mood, and a weekly team podcast reads it

- **Date:** 2026-11-07
- **Proposed by:** Orchestrator, for `franchise` (mood, the perception system's public side, and its
  small push on the president's firing chances), `narrative` (the weekly rundown, hot takes and the
  podcast script) and `apps/game` (a Listen button). Thread "Improve the post-game podcast".
- **Status:** design questions Q1-Q7 ruled by the owner 2026-11-07 13:58Z
  ("1. A 2. A 3. B 4. B 5. A 6. B 7. A"). Contracts edits M1 and M2 approved by the owner's typed
  yes 2026-11-07 14:09Z ("Yes, make contracts edits M1 and M2") and made (§8). The script writer
  ruled 2026-11-07 14:10Z on the thread's card: **templates now, an AI writer as an option later**
  (§7). Step 2 (mood) built 2026-11-07, off by default (§11); merging waits for the owner.
- **Plan doc (plain words, the questions as put to the owner):**
  https://claude.ai/artifact/7MtH3yZVLokYE8qhEWEfh6
- **Origin:** the owner's post-game podcast idea (2026-10-22, thread "Coaching staff"), the test
  episodes in `/mnt/project-files/podcast/` (Dia dropped for Kokoro 2026-10-23), and the owner's
  note of 2026-11-07 13:40Z: the podcast is *"less of simply a game summary and more of a 'the state
  of things now' summary"*. The hosts *"should be a direct reflection of how the fans and media feel
  about the team and the coaching. Fans are always going to extremes on things."* The show can look
  back over a trend and ahead to next week and the offseason. Ongoing storylines wait.

> Phase note: like ADR-081, ADR-084 and ADR-094, this is franchise and story work started before
> Charter §6 reaches it, on the owner's direction. Nothing here touches the engine, playbook,
> play-caller or calibration measurement code, or moves any sim number or seed. Part 6 changes who
> gets fired, so it sits behind its own switch, off by default (see §6).

## Provenance of factual claims

| Claim | Source | Kind |
|---|---|---|
| The Charter gives the franchise package the "perception system" (which observer sees what) | `ARCHITECTURE_CHARTER.md` lines 150, 3408, 3427 | COMPUTED (read) |
| Contracts already carry `PERCEPTION_UPDATED` (observer may be `"PUBLIC"`, attribute-shaped) and `PRESSURE_EVENT` (`source` includes `"MEDIA"`); neither is emitted anywhere | `packages/contracts/src/events.ts` lines 828, 871; grep of `packages/*/src` | COMPUTED (read) |
| The president's head-coach and GM firing chances are logistics over performance against the roster's promise, honeymoon, politics and playoffs | `staff/offseason.ts` `headCoachFireChance`, `staff/frontOffice.ts` `gmFireChance` | COMPUTED (read) |
| Midseason firings read the same formulas on the season so far | `staff/midseason.ts` | COMPUTED (read) |
| Our turnover: head coach changes 7.7 a year (2.5 midseason), GM changes 4.2 a year (1.1 midseason), against counted NFL figures of about 7, 2.4, about 4 and 1.1 | ADR-094 build record, step 2 midseason part | REPORTED (other thread's run, not re-run) |
| The weekly playoff chance, job pressure and the GM's stance already exist after each regular-season week | `winNow/stance.ts`, `winNow/pressure.ts` | COMPUTED (read) |
| Injuries carry expected weeks out; players carry age and an expected rating change | `INJURY_OCCURRED` in `events.ts`; `players/development.ts` | COMPUTED (read) |
| The news desk names teams only (ADR-082 Q1) and staff by job (ADR-084 §16) | ADR-082, ADR-084 §16 | COMPUTED (read) |
| Kokoro (Apache 2.0, about 82M parameters) runs on a CPU; a two-host 82-second episode rendered in about 45 s on 4 cloud cores | `/mnt/project-files/podcast/README.md` | REPORTED (earlier thread's run) |
| A JavaScript build of Kokoro runs in Node and in the browser | knowledge as of mid-2026, not checked in this ADR | REPORTED (unchecked; checked at step 5) |
| 90 seconds of two-host talk is about 225 words | the earlier test episodes (242 words, 70-83 s) | COMPUTED (from those files) |
| Every rate, weight, band, threshold and segment below | none | CHOSEN (judgment; tuned at the checks named in §8) |
| Event names `PUBLIC_MOOD_UPDATED`, field names, take names | none | CHOSEN, provenance NONE |

## Conjoined mechanisms

This ADR rules on two separately priceable things: **mood as a reader** (parts 1-5: it feeds the
news and the podcast and changes nothing) and **mood pushing firings** (part 6, Q4 b). They are
separately priceable, so they are built and measured apart. Part 6 runs behind its own switch, and
`staff-check` is run three ways: switch off (must match today exactly), switch on with mood's term
alone, and switch on with the re-tuned firing bases. A joint arm alone would hide whether a change
in turnover came from mood or from the re-tune.

## Implied scope

- `PRESSURE_EVENT` (`source: "MEDIA"`): the same idea as part 6, already in contracts and never
  emitted. Left alone; **unruled** whether part 6 should emit it.
- Coordinators: fans call for them to be fired too, but the head coach fires them, not the
  president (ADR-080 §6). Mood does not touch `coordinatorFireChance`. **Unruled.**
- Player morale (`MORALE_CHANGED`): a player booed by his own fans might sulk. **Unruled**, not built.
- Contract talks: a fan favorite might be harder to let go. **Unruled**, not built.
- The news desk: it could print mood stories ("Fans turn on the coach"). This ADR does not change the
  desk. **Unruled**; the rundown is the podcast's alone.
- Player names in the news desk stay out (ADR-082 Q1). The podcast uses names (Q7 a), and this ADR
  does not reopen the news desk's ruling.
- The user's own GM: the president never judges him (ADR-094 Q10 a), so part 6 never touches him.

## 1. Need

The podcast's hosts are to sound like the team's fans and local media (owner, 13:40Z). Nothing in
the game says how fans and media feel. The president's firing formula is the inside view; fans see
only the scoreboard and the stats, and they are louder and less patient. So the game needs a
public mood, kept apart from the inside view, that the podcast can read and that can disagree with
the front office.

## 2. The owner's rulings (2026-11-07 13:58Z)

| | Question | Ruling |
|---|---|---|
| Q1 | Whose show is it? | **(a)** a local show about the user's team only |
| Q2 | Who are the two hosts? | **(a)** one fan host who overreacts and one analyst host who pushes back with facts |
| Q3 | Do fan bases differ? | **(b)** no: every fan base reacts the same |
| Q4 | Does mood change anything? | **(b)** yes, a little: angry fans add to the president's chance of firing a head coach or GM |
| Q5 | How far can hot takes go? | **(a)** football-possible: a "go get him" names only a player who could really be had |
| Q6 | When are episodes made? | **(b)** after every game, plus offseason episodes for firings and hires, free agency and the draft |
| Q7 | Do the hosts use names? | **(a)** yes, players' and coaches' names |

## 3. Mood

Every team has two audiences, **FANS** and **MEDIA**. Each holds a value from -100 (furious) to
+100 (thrilled) about each of its **subjects**:

- the team;
- the head coach, the GM, the offensive coordinator and the defensive coordinator (by seat, so a
  new man in the seat starts fresh at the team's mood, halved);
- a **watch list** of at most 6 players. A player joins when one of these happens: his play runs
  well above or below what his rating promises for 2 or more games, he signs for one of the team's
  5 biggest cap hits, he is a first-round pick, or he is hurt for 4 or more weeks. He leaves after
  4 quiet weeks. Position never puts a man on the list (owner, 2026-11-06: "Nothing should be based
  on someone's position").

All of it is computed for all 32 teams (part 6 needs every team), but only the user's team gets a
show (Q1 a). Q3 b: one set of rates for every fan base.

### 3.1 What moves it, after each game

1. **Surprise.** `s = tanh((margin - expectedMargin) / 14)`, from -1 to 1, where `expectedMargin`
   comes from the two rosters' ranks and home field (the rank-to-margin slope is fit from our own
   league's games at step 2). A close loss to the best team is near 0; a loss to a bad team is near -1.
2. **How it happened.** `s` gains up to 0.25 toward the result's side for a blowout (21+), a blown
   lead of 14+, a win or loss on the last score, or a home loss.
3. **Streaks.** Each game past the second in a winning or losing streak adds 0.1 toward its side.
4. **Blame and credit.** The team's `s` is split by unit: the offense's share is its points against
   what it was expected to score, the defense's likewise. The OC takes the offense's share, the DC
   the defense's, and the head coach half of the whole plus his **big calls**: fourth-down tries and
   punts, two-point tries and late timeouts, judged against what the league does in that spot
   (counted from our own league's events at step 2). Watch-list players take their own game grade
   against their rating. The GM moves on season-long things only (part 3.2).
5. **Fans and media.** Fans: `F <- 0.55 F + 0.45 x 100 x 1.3 x s'` (s' the subject's share),
   clamped to plus or minus 100, so the last two games carry most of it and it runs past the facts.
   Media: `M <- 0.85 M + 0.15 x 100 x s'`, plus a pull toward the season's record against
   expectation, so it stays closer to the facts.
6. **Drift.** In a week with no game (bye, offseason), both drift 10% toward their **rest point**:
   0 for the team and its men, plus a tenth of last season's final team mood, so a fan base
   remembers a bad year into the next one.

### 3.2 Off the field

- **GM:** after each week, the GM's mood moves by how the roster is holding up: a starter hurt with
  no backup within 8 rating points (blame), a unit whose starters' expected change next year is in
  the league's worst quarter (blame, the "old offensive line"), cap room in the league's worst
  quarter next year (blame), and the record against expectation (a third of the team's move).
- **Offseason events (Q6 b):** a head coach or GM fired lifts fan mood on the team by 15 (fans like
  a change); a hire starts the new man at +10 fans, 0 media; a free-agent signing among the
  league's top 20 new contracts lifts the team by 10; a first-round pick by 5.

### 3.3 Dice

The rates above are fixed. A small weekly wobble (sd 3 points, fans only) comes from its own fork,
`franchise:mood` by team and week, so no existing draw moves and the same season always gives the
same moods (Iron Rule 4).

## 4. Hot takes (Q5 a)

A **take** is a fan demand the rundown may voice when a mood crosses a line. Each live take gets a
**heat** (how far past its line the mood is, plus 10 per week it has been live). Every take names
real men and real numbers from the game; nothing is invented.

| Take | Live when | The analyst host's facts |
|---|---|---|
| BENCH | a watch-list starter's fan mood is -40 or lower over 2+ games, and a backup is within 6 rating points of him | the backup's rating, the starter's record before the slump |
| FIRE | fan mood on the head coach, GM, OC or DC is -60 or lower, or -40 or lower during a 3-game losing streak | his chance of being fired as things stand (§6 of ADR-094's pressure), his contract years left |
| TRADE_AWAY | a watch-list player at -30 or lower who is old (expected decline next year), overpaid (cap hit in his team's top 5 and below his play) or both | dead money if traded, his expected change next year |
| GO_GET | a unit in the league's worst quarter, and a player at least 10 rating points better than its starter who could really be had (Q5 a): on a SELL team, in his contract's last year, or a free agent | cap room, his cap hit or asking price |
| PAY_HIM | a watch-list player at +40 or higher in his contract's last year | a market estimate from the cap thread's contract pricing |
| TANK | playoff chance under 10% and team fan mood -50 or lower | the draft spot the team is on course for, the GM's stance |

No trade system exists yet. Fans may still demand trades; the hosts may not say a trade is "being
discussed". The takes live in `narrative` (they read the season state and the mood events) and
need no contracts edit.

## 5. The rundown and the episode

After each of the user's games, and at the offseason moments of Q6 b, `narrative` builds a
**rundown**: the episode's outline, five or six talking points in show order, each a kind, the
facts it may use, and a tone from mood. In order:

1. **Cold open:** the one moment of the week (the biggest swing in the event stream, a big call, a
   last score).
2. **The game:** score and two or three facts; who was great and who was bad.
3. **The trend:** this game tied to the last few (a streak, a unit getting better or worse over 3+
   games, a record since an injury).
4. **The mood segment:** where fans and media stand on the hottest subject, and the hottest take.
   The fan host (Q2 a) voices the take; the analyst answers with the take's facts.
5. **Next week:** the opponent, who is hurt and who fills in, what the coach has to solve.
6. **The long view:** only when something is building (an aging unit, a big contract coming due,
   next year's cap, draft position).
7. **Storyline slot:** empty until storylines exist.

The **script** is written from the rundown alone, about 225 words for 90 seconds, in the
`host|speed|pause|line` form the test episodes used. With templates (the writer card's recommended
pick), each talking point kind has several wordings per tone in `content/podcast.json`, picked with
the season's dice by game, so the same game gives the same episode. Names are used (Q7 a). Scores,
yard lines and names are written the way Kokoro says them right ("forty-four to forty-two").

The **voice** is Kokoro: two hosts, the per-line pace and pauses of the v2 test, short reactions
from the other host, a self-made sting and a quiet music bed (no licensed audio), and host voices
that may be blends of two stock voices.

Iron Rule 3: the rundown, the script and the audio are renderers of the event stream and the save.
None of them changes game state.

## 6. Mood pushes firings (Q4 b), behind a switch

The president's head-coach and GM firing chances (offseason and midseason) gain one term:

`- MOOD_PUSH x residual / 100`, where `residual` is the fans' end-of-period mood on that man
**minus** the mood his record alone would give (the mood a man with the same performance against
the roster's promise has on average, fit from our own league at step 4). So only the part of the
anger the record doesn't already explain counts, and a bad season isn't counted twice.
`MOOD_PUSH` starts at 0.4 (CHOSEN: at residual -50 the log-odds rise by 0.2).

The firing formulas are tuned to real NFL turnover (ADR-080 C5, ADR-094 §8). Mood should change
**who** is fired, not **how many**. So with the switch on, the offseason and midseason bases are
re-fit until `staff-check --gms` gives the same yearly totals as today within their bands, and the
check also reports how often a fired man had fan mood -40 or lower in his last month (no real
count; a guess to look at, not a target).

The switch is `--mood-firings` on `season` and `staff-check`, off by default, until the owner sees
the check. The user's own GM is never judged by the president (ADR-094 Q10 a), so mood never fires him.

## 7. The writer (ruled: templates now, an AI writer as an option later)

The owner's pick on the thread's card (2026-11-07 14:10Z). The rundown is the same whatever writes the script. If the owner later picks an AI writer, it gets
the rundown and its facts and nothing else, so it cannot invent a fact; the episode is then the
same for a game only if the writer's output is saved with it. Where such a writer would run (the
player's computer or a server) is decided when it is built.

## 8. Contracts edits (approved by the owner's typed yes 2026-11-07 14:09Z; made)

As made: `packages/contracts/src/mood.ts` (`MoodAudience`, `MoodSeat`, `MoodSubject`,
`MoodReading`), the event in `events.ts`, `Team.mood` in `players.ts`; test `test/mood.test.ts`.

**M1: `PUBLIC_MOOD_UPDATED` event** (franchise, public), one per team per week that has a game or a
mood-moving offseason event:

```ts
export type MoodAudience = "FANS" | "MEDIA";
export type MoodSubject =
  | { kind: "TEAM" }
  | { kind: "STAFF"; staff: StaffId; seat: "HEAD_COACH" | "GM" | "OC" | "DC" }
  | { kind: "PLAYER"; player: PlayerId };
export interface MoodReading { audience: MoodAudience; subject: MoodSubject; value: number; change: number; causes: string[] }
| { type: "PUBLIC_MOOD_UPDATED"; payload: { team: TeamId; season: number; week?: number; readings: MoodReading[] } }
```

`causes` are franchise's own short strings ("LOSS_TO_WORSE_TEAM", "LOSING_STREAK_3", "BIG_CALL"),
so new causes need no further edit.

**M2: `Team.mood?: MoodReading[]`** on the saved team (optional; absent reads as everything at 0),
so a stopped and carried-on or saved and loaded season keeps the fans' memory, the way
`Team.stance` keeps the GM's stance. The watch list is the set of PLAYER readings.

No edit is needed for the takes, the rundown, the script or the audio: they are narrative's and the
viewer's own, and an episode file is not a save.

## 9. Build steps (each its own pull request; nothing merges without the owner's yes)

1. **This ADR.**
2. **Mood** in `packages/franchise` (`src/mood/`) on contracts M1 and M2,
   a calendar step after each week's games and at the offseason events. Tests: same seed, same
   moods; save and load keeps them; a blowout loss to a worse team moves fans more than a close loss
   to a better one; fans move further and faster than media; drift fades a bad week. A many-season
   look (`mood-check`) prints how often each take would be live per team-season, so fans aren't
   furious all the time. Switch off: every existing check unchanged.
3. **Rundown and takes** in `packages/narrative` (`src/podcast/`), with a command that prints each
   week's rundown for a saved season, for the owner to read before any audio exists. Tests: every
   fact in a rundown comes from the season; GO_GET names only a player who could be had.
4. **Mood pushes firings** (part 6) behind `--mood-firings`, re-fit and the three-way `staff-check`.
5. **Script and voice:** templates in `content/podcast.json`, Kokoro render from a saved season
   (`pnpm --filter @ff/narrative podcast -- --season season.json --week 9 --out episode.wav`), the
   voice polish of §5. Checks: a speech-to-text pass hears every line; the owner listens.
6. **Listen button** in the game viewer (`apps/game`), Kokoro in the browser.
7. **Later:** storylines in their slot; an AI writer if the owner picks one.

## 10. Decision

Q1-Q7 ruled by the owner, 2026-11-07 13:58Z. Contracts edits M1 and M2 approved by the owner's
typed yes, 2026-11-07 14:09Z, and made. The writer ruled on the card, 2026-11-07 14:10Z. Merging
this ADR waits for the owner.

## 11. Step 2 build record (2026-11-07, thread "Build fan and media mood")

**Built:** `packages/franchise/src/mood/` (`rates.ts`, `game.ts`, `steps.ts`, `memory.ts`), one day
step run after every other step when `runSeason` is given `mood`; `season --mood` (with
`--development` or `--injuries`); the cap check's walk takes `mood: true`; `mood-check` in calibration
(`reports/mood-check.md`). No contracts edit: readings go out as M1 and sit on the teams as M2; what
mood remembers beside them (rest points, the watch list's quiet weeks, recent grade gaps, the grade
fit, each team's record against expectation) sits in the steps' memory (`PlayerMemory.mood`), the
save's franchise-owned `depthMemory`, so a save carries on exactly (tested).

**Where the build reads the ADR one way of several:**

- **Expected margin** comes from ADR-081's `teamStrength` (points of margin, MEASURED through the
  engine), not from rank order, so no rank-to-margin slope is fit. Points a team is expected to score:
  the league's points a game so far, plus its offense's edge over the average offense, less the other
  side's defense's edge over the average defense.
- **Home field** is 0: the engine has none, and the check measured our league's home margin at 0.26
  points a game over 8,160 games (the real NFL's is about 1.5 to 2).
- **Big calls** are left out: franchise sees no play-by-play. The head coach takes half the team's
  share (the ADR's CHOSEN "half of the whole"), labeled a placeholder. Adding his calls needs a
  per-game summary from the season runner, a contracts petition when wanted.
- **How it happened** from period scores: a blown lead is a lead of 14+ at the end of any period but
  the last; "decided late" is overtime, or a margin of 8 or less where the side ahead after three
  periods did not win (an approximation of "on the last score"). Each cause is 0.1 toward the result,
  0.25 at most together.
- **Watch list form** compares a player's game grade (ADR-087's contest grade) with the grade the
  league's own fit of grade on rating promises (least squares over every graded player, 20+ snaps,
  older seasons halved each year); 8 points off the same way two games running puts him on. A new
  man joins at 0; a full list drops the man with the most quiet weeks.
- **Media pull**: toward 100 tanh((wins - expected wins) / 3), a tenth of the gap a game, for the team,
  the head coach and the GM; expected wins add up each game's odds from the two strengths.
- **Preseason games** move nothing. Drift alone sends no event (M1: weeks with a game or a moment).

**The many-season look** (`mood-check`, seeds `mood-check-1` to `-3`, 10 seasons each, the stand-in
league with growth, injuries, the league year, the draft and the coaches' carousel): fans sit at -60
or lower after 21.0% of games and at +60 or higher after 19.8%; media 2.2% and 2.2%. 88.6% of
team-seasons have at least one furious week, 46.3% four or more. Final moods follow wins (0-4 wins:
fans -50, media -54; 13+: fans +42, media +51). The shares hold steady from the first season to the
tenth (19% to 22% furious each year). The takes' mood sides are live often (FIRE in 97.7% of
team-seasons, mostly on the coordinators, whose share is their unit's whole result), before step 3's
other conditions. No real count of fan anger exists in this repo; these are ours to look at.

**Owner's pick, 2026-11-07 17:47Z ("cool down the coordinators"):** each coordinator now takes half of
his unit's result (`MOOD.coordinatorShare` 0.5, as the head coach takes half of the team's; CHOSEN).
Re-run on the same three seeds: FIRE live at least once in 76.7% of team-seasons (was 97.7%); by seat
the OC 29.3% (was 90.5%), the DC 23.0% (was 83.2%), the head coach 38.8% and the GM 75.0% unchanged.
Team moods are unchanged.
