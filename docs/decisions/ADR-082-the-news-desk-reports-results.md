# ADR-082: the news desk reports results

- **Date:** 2026-10-22
- **Proposed by:** Orchestrator, for `narrative` (thread "News and storylines";
  plan `/mnt/project-files/design/news-and-storylines-plan.md`)
- **Status:** approved (N1, N2); R2 proposed, awaiting the owner's typed yes

> Phase note: Charter §6 places narrative last. The owner chose on 2026-10-21 to start it early, in
> parallel with the ADR-073 tuning work, on the same condition as the season shell (ADR-078): nothing
> here touches engine, playbook, play-caller or calibration measurement code, or moves any sim number
> or seed.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| `packages/narrative` exports nothing (`export {}`) | `packages/narrative/src/index.ts`, read 2026-10-21 | COMPUTED (read) |
| `PRESS_STORY_PUBLISHED` is `{ headline: string; subjects: (PlayerId \| StaffId)[] }`, and nothing in the tree emits or reads it | `events.ts:552`; `grep -rn PRESS_STORY_PUBLISHED packages apps` (contracts only) | COMPUTED |
| `GameResult` carries teams, scores, `reason` and `seed`, and no period scores | `league.ts:37-45` | COMPUTED (read) |
| The engine already records points per period: `GameSummary.periods` and `GAME_END.payload.periods` | `engine/src/game/types.ts:337`, `simulateGame.ts:740` | COMPUTED (read) |
| The real-sim resolver builds each `GameResult` from `observation.summary` | `calibration/src/season/realSeason.ts:48-73` | COMPUTED (read) |
| `runSeason` emits `GAME_COMPLETED`, `PLAYOFF_FIELD_SET`, `CHAMPION_DECIDED` plus the clock's events; every game of a week is on one day (`GAME_DAY = 7`) | `franchise/src/season/runSeason.ts`, `schedule/buildSchedule.ts:29` | COMPUTED (read) |
| A sample real-sim season averages 85.7 points a game; 80 of 285 games were won by 28 or more; 0 shutouts | `/mnt/project-files/season/season-homie-1.json`, counted 2026-10-21 | COMPUTED |
| Spec #7 §10: calibration ignores narrative; §1: narrative may not manufacture facts | `docs/design/narrative.md` | read (spec) |
| Story lines below (28+ is a rout, 3 or less is close, 14+ is a comeback, 4 is a streak, .400 is an upset gap, 70 is a shootout) | football judgement, fixed in football terms rather than in this league's scoring (owner's Q3) | CHOSEN — provenance NONE |
| Story names (`ROUT`, `WIN_STREAK`, ...) and importance values | named here | CHOSEN — provenance NONE |
| NFL playoff format: 4 division winners and 3 wild cards per conference | NFL rule (2020-), as ADR-078 | REPORTED |
| The race check makes no wrong call on the 2020-2024 NFL regular seasons; by the last week it has called 12-13 of each season's 14 playoff teams in and 16-17 of the 18 others out | `packages/narrative/test/race.nfl.test.ts`, on franchise's fixture of nflverse's public games table; counted 2026-10-22 | COMPUTED |

## Conjoined mechanisms

Three edits (N1, N2, R2) and one new package's behaviour. None is read by the sim, so none has a
rate to price: N1 and N2 are data shapes, R2 is an import permission, and the desk only reads.
They are listed separately so each can be approved or refused on its own.

## Implied scope

- **Player stories** (a four-interception day, a 200-yard game): the box score is in every game's
  stream, but every player is rated the same until rosters exist; **unruled** (owner's Q1: teams only).
- **Clinch markers on the standings page**: the race check below lives in narrative because only
  stories need it today. If the viewer wants "x - clinched" beside a team, the check moves to
  franchise behind a petitioned event; **unruled**.
- **`narrativeState` in `SaveFile`** stays `unknown`: the desk rebuilds its memory from the season's
  events, so there is nothing to save yet. Arcs that outlive a season will claim it; **unruled**.
- **`NarrativeEffect`**: the desk writes no effects (no morale, reputation or pressure). The owner's
  coach-personality idea will add one; that is **ADR-083**, not this.
- **Interrupts and the advance button** (Spec #7 §3): not built; **unruled**.

## Inertness proof

Claim: **this changes nothing the sim produces.**
- **Algebraic:** N1 and N2 are types; N1 widens an event nothing emits; N2 adds an optional field
  the resolver fills from numbers the engine already computed. The desk reads events and writes
  stories; it holds no reference to anything that plays a game. No engine, playbook or play-caller
  file is edited.
- **Empirical:** `pnpm verify` green; the real-sim resolver's existing determinism test still passes,
  and a new test asserts the period scores add up to the final score. A whole real-sim season
  (seed `news-1`, 285 games) played on main and on this branch: **0 of 285 results differ** apart
  from the added period scores, and the schedule, standings and bracket are identical.

## Need

Spec #7 wants a story machine that reacts to what the simulation actually did. The first useful
slice, now that a whole season can be played, is a sports page: each week's headlines, the playoff
race and the season's story, built only from results. Two shapes are missing for it: a news story
that can name the teams it is about (N1), and a result that knows how the game unfolded, so
"rallied from 17 down" is a fact and not a guess (N2). The owner also wants the season command to
print the headlines as it runs, which needs one import permission (R2).

## Proposal

### N1 — a news story names its teams, kind and importance (`events.ts`)

```ts
| { type: "PRESS_STORY_PUBLISHED"; payload: {
      kind: string;                  // the story rule that wrote it, e.g. "WIN_STREAK"
      headline: string;
      importance: 1 | 2 | 3 | 4 | 5; // ranks stories as Interrupt.severity ranks beats
      teams: TeamId[];
      games: GameId[];
      subjects: (PlayerId | StaffId)[];
    } }
```

`kind` is a plain string because the story rules are narrative's content and will grow; a closed
union here would make every new story a contracts edit.

### N2 — a result can carry its period scores (`league.ts`)

```ts
export interface GameResult {
  // ...as ADR-078 C4, plus:
  periods?: readonly { period: number; home: number; away: number }[]; // as GAME_END.payload.periods
}
```

Optional: a resolver that doesn't know them (the franchise tests' fake) leaves it out, and stories
that need them don't fire.

### R2 — the season command may use the news desk (Charter §4 rule 1 exception)

**Proposed, not yet approved.** `calibration` → `narrative`, one-directional, surface named:
`createNewsDesk` and `formatEdition`, imported only by `calibration/src/season/main.ts`. The
season command is calibration's (ADR-078 R1); printing its headlines as it runs means calibration
calls the desk. Spec #7 §10's "calibration ignores narrative" is about measurement: no harness,
metric or caller file may import narrative, and a surface test holds calibration to that one file
and those two names. Until R2 is ratified, `pnpm --filter @ff/narrative news` prints the same
headlines from a saved season.

## The desk (narrative's own design; no contracts change)

**Input:** the league's structure and team names, the season's schedule, its seed, and the
franchise event stream, one event at a time. **Output:** `PRESS_STORY_PUBLISHED` events in
editions, one edition per calendar week.

1. **Story rules are data.** Each rule says what has to happen, who it is about, and how important
   it is. Headline wording lives in `packages/narrative/src/content/headlines.json`, several lines per
   story in two tones, `straight` and `punchy`; the owner asked for a mix (Q6), so each headline
   picks the tone with the seeded dice (`punchyShare`, 0.5) and then a line.
2. **One story per game, one story per team.** Each game offers its most important game story;
   each team its team stories. The edition ranks all of them by importance (ties broken by the
   seeded dice, so no team is favoured by its id), then keeps them greedily: no team in two kept
   stories, at most two of a kind, **at most 4** (Q4). In a playoff week **every playoff game gets
   its headline** on top of that.
3. **Seeded and deterministic.** The dice are `createRng(seed, "narrative:news")`, forked per
   edition, so the same season always gives the same news and one week's wording never depends on
   another's.
4. **Read only.** The desk writes stories and nothing else.

### Weekly stories (regular-season games; step 1)

| Story | Fires when | Importance |
|---|---|---|
| `TIE` | a game ends level | 3 |
| `SHUTOUT` | the loser scores nothing | 3 |
| `COMEBACK` | the winner trailed by 14+ after some quarter (needs N2) | 3; 4 at 21+ |
| `UPSET` | both teams have played 4+ games and the loser's win share before kickoff was .400+ higher | 3 |
| `OVERTIME` | won in overtime | 2 |
| `LATE_RALLY` | the winner was behind after three quarters (needs N2) | 2 |
| `ROUT` | won by 28+ | 2 |
| `NAIL_BITER` | won by 3 or less in regulation | 1 |
| `SHOOTOUT` | 70+ points between them | 1 |
| `WIN_STREAK` | a win streak reaches 4+ | 2; 3 at 6+; 4 at 9+ |
| `LOSING_STREAK` | a losing streak reaches 4+ | 2; 3 at 6+; 4 at 9+ |
| `STREAK_SNAPPED` | a win streak of 5+ ends | 3 |
| `LAST_UNBEATEN` | from week 3, one team without a loss is left | 3 |
| `UNBEATEN_FALLS` | the last team without a loss loses | 3; 4 if it had won 6+ |
| `LAST_WINLESS` | from week 4, one team without a win is left | 2 |
| `FIRST_WIN` | the last team without a win wins | 3 |
| `NEW_LEADER` | from week 4, a team is alone in first in its division and wasn't in first a week ago | 2 |
| `SHOWDOWN` | from week 8, next week's game between a division leader (at .500 or better) and a rival within one game of it | 2 |

A game offers only its most important game story (an upset rout is an `UPSET`). Win share counts a
tie as half a win. A bye week breaks no streak; a tie ends one. At equal importance a story that can
only happen once a season (`LAST_UNBEATEN`, `UNBEATEN_FALLS`, `LAST_WINLESS`, `FIRST_WIN`) runs ahead
of the weekly kinds.

### Season stories (step 2)

| Story | Fires when | Importance |
|---|---|---|
| `CLINCHED_DIVISION` | certain on wins alone (Q5) | 3 |
| `CLINCHED_PLAYOFFS` | certain on wins alone, and not the division the same week | 3 |
| `ELIMINATED` | can no longer make the playoffs on wins alone | 2 |
| `PLAYOFF_FIELD` | the field is set: one per conference, naming its top seed | 4 |
| `PLAYOFF_WIN` | each wild-card and divisional game | 3 |
| `CONFERENCE_TITLE` | each conference final | 4 |
| `CHAMPIONSHIP` | the final | 5 |

Each team's clinch and elimination is reported once a season, and at equal importance runs ahead of
the weekly kinds, as the other once-a-season stories do. The field stories and every playoff game
always run, outside the cap of 4 (Q4). A playoff headline takes the first of these that fits: won in
overtime, came back from 14+ down, an upset by seed (never in the final, whose seeds come from
different conferences), a rout.

**"Certain on wins alone"** (Q5, the simple version): a team's worst case is losing every game left;
a rival's best case is winning every game left. A rival who could finish level or ahead is a threat
(a tie might break either way). A team has clinched its division when no division rival is a threat,
and a playoff spot when the threats couldn't fill the places above it (its division's crown, and
the wild cards, each of which needs its own division's winner above it too). The wild cards are the
league's playoff teams per conference (`LeagueRules.playoffTeamsPerConference`, 7) less its division
winners. Treating every rival as able to win out, even rivals who still play each other, only ever
makes the check late, never wrong. Elimination is the mirror image. The real NFL, with full
tiebreaks, sometimes announces a week sooner.

**Checked against real seasons.** The check replayed the 2020-2024 NFL regular seasons week by week
(`test/race.nfl.test.ts`). It made no wrong call: every division it called was won by that team,
every team it called in made the field, and every team it called out missed it. By the last week it
had called 12-13 of each season's 14 playoff teams in and 16-17 of the 18 others out; the rest were
settled by tiebreaks, which the simple version leaves to the field story.

**The season review** is its own edition, "Season review", when the offseason starts (or when the
events end, once a champion is crowned). Every review story runs; when more than two teams share a
mark, the headline lists them in a line written for a crowd.

| Story | Reports | Importance |
|---|---|---|
| `BEST_RECORD` | the best record and who holds it | 3 |
| `WORST_RECORD` | the worst record | 2 |
| `LONGEST_WIN_STREAK` | the season's longest win streak | 2 |
| `LONGEST_LOSING_STREAK` | the season's longest losing streak | 2 |
| `TOP_OFFENSE` | the most points scored | 2 |
| `TOP_DEFENSE` | the fewest points allowed | 2 |
| `CHAMPION_PATH` | the champion's road: whom it beat in the playoffs | 4 |

## Impact

- `contracts`: N1 (`events.ts`), N2 (`league.ts`), `docs/design/contracts.md` §6.2; tests in
  `test/league.test.ts`. `CONTRACTS_SCHEMA_VERSION` unchanged (N1 reshapes an event nothing emits,
  N2 is optional).
- `narrative`: the desk, the stories, the wording file, the `news` command, tests (with a copy of
  franchise's real 2020-2024 results for the race check).
- `calibration`: `season/realSeason.ts` copies period scores (N2); `season/main.ts` saves the
  season's event stream with the season so the news command can read it; under R2 only, the
  command prints the headlines. No harness, metric or caller file is edited.
- `apps/game`: a News page (step 3), reading the saved news.
- `engine`, `playbook`, play-callers, franchise logic: **no change.**

## Decision

**Owner's rulings, 2026-10-22 14:50Z** (thread "News and storylines"), on the plan's Q1-Q8:

1. Teams only for v0.
2. **N1** — *"N1, so the viewer and later systems read news the same way as everything else."*
3. Real-football lines.
4. **Up to 4 headlines a week** across the league; playoff weeks have few games, so every game gets one.
5. The simple, always-correct version of clinched and knocked-out.
6. **A mix** of straight and punchy wording.
7. **N2** — *"yes to N2."*
8. A News page in the game viewer, plus the season command printing the week's top headlines as it runs.

N1 and N2 approved by those typed answers. R2 (needed by ruling 8) awaits its own typed yes.
