# ADR-097: Coaches share the snaps at a spot, so older starters' playing time is trimmed the way real teams trim it

- **Date:** 2026-11-07
- **Proposed by:** Orchestrator, for `franchise` (the weekly snap plan), `engine` (substitution and
  in-game tiredness) and `calibration` (the like-for-like playing-time check). Thread "Make older
  starters lose playing time".
- **Status:** direction ruled by the owner (2026-11-07 16:27Z): Q1 yes (share the snaps), Q2 built
  from the owner's four reasons (§3), Q3 later (filling a spot from anyone who can play it, §9).
  The mechanism below is PROPOSED; one question (§10, Q4) is open. Contracts edits S1-S2 (§7) wait
  for a typed yes at build. Nothing is built.
- **Proposal doc (plain words, the questions as put to the owner):**
  https://claude.ai/artifact/Ms4hgcFWCBJQ6C6p5KJbHC
- **Origin:** the aging thread (ADR-087 §12 draft 2, `curve-model-report.md` "The size does not
  fit") found that from 30 a real corner loses about 13 points of his side's snaps a year and ours
  about 5, and that no aging curve can close it. It named the coaches' head start as the likely
  cause. This ADR measured that and found otherwise (§2).

> Phase note: franchise work plus an engine change. The engine part (§6) is play code, so it is not
> built while the ADR-089 pocket-fix measurements run, and it lands behind a switch that leaves every
> golden game unchanged when off. It is built after the ADR-087 aging redesign, so the two are not
> tuned at once.

## Provenance of factual claims

| Claim | Source | Kind |
|---|---|---|
| Real starters' year-to-year playing time by age, its split into games missed and snaps per game, benchings and trims (§2 table, "Real" columns) | nflverse `snap_counts_2013..2024.csv` + `players.csv`; script `/mnt/project-files/design/playing-time/decomp.py` | COMPUTED |
| Real starters' snaps per game played by group: QB 96%, OL 94%, S 89-91%, CB 86-87%, LB 81-82%, WR 77-78%, TE 72-75%, EDGE 71-72%, IDL 67-70%, RB 65% | same script | COMPUTED |
| Real starters play in 91% of their team's games (2018, 2022, 2023: 0.928, 0.913, 0.912) | same script | COMPUTED |
| Our league's columns (§2): stand-in league, growth and injuries on, tune seeds 1-3 x 6 seasons, main 9cc09d3 | career-check with a local counting patch (`usage-dump.patch`, not committed); rows `usage-*.jsonl`; `simdecomp.py`, `allmen.py` | COMPUTED |
| With every head coach's incumbent leaning at 0 and form at 100 (career-check arm `form`), older starters lose 17.2 points a year, as with the drawn leanings | same, rows `form-*.jsonl` | COMPUTED |
| Real -13 for a corner from 30; ours about -5 (all men with snaps both years) | `reports/nfl-careers.md`; aging thread's `simusage.md` | REPORTED (aging thread) |
| Today a starter is chosen only from men listed at that exact position; `WANTED` lists one RT, one NT, one ILB | `franchise/src/players/depthChart.ts` `byPosition`; `draft/board.ts` | COMPUTED (read) |
| The engine has no substitution or in-game tiredness; a play's personnel is bound from the depth chart's order (`playbook/src/personnel.ts`) | grep of `engine/src` for fatigue/substitution; `personnel.ts` | COMPUTED (read) |
| Stamina fades from 30 on its own curve (`OWN_CURVES.stamina`) | `franchise/src/players/developmentTables.ts` | COMPUTED (read) |
| Why real teams split snaps (fatigue, situational skill sets, matchups, injury prevention and longevity; QB and OL rarely split for continuity) and how often by group | the owner's message, 2026-11-07 16:27Z | REPORTED (owner; no source given) |
| Tiredness thresholds, recovery rates, the continuity cost and every other number in §4-§6 | — | CHOSEN, provenance NONE; tuned against §8 |

## 1. The ask

Make older starters lose playing time as real ones do, by mirroring how real staffs hand out snaps,
with no rule keyed on position or age.

## 2. What was measured

"Starter" = at least half his side's snaps in a season (the real-careers definition). Each starter is
followed to the next season. Points are percentage points of his team's snaps on his side; games he
missed count zero.

| Measure | Real 25-27 | Real 30-32 | Ours 25-27 | Ours 30-32 |
|---|---|---|---|---|
| Starters followed into the next season | 2,280 | 721 | 2,734 | 936 |
| Change in playing time | -14.5 | -18.3 | -17.7 | -17.2 |
| ... from games missed | -9.5 | -10.6 | -13.9 | -14.4 |
| ... from fewer snaps in the games he plays | -5.0 | -7.8 | -3.8 | -2.8 |
| Snaps a starter plays in the games he plays | 83% | 85% | 96% | 98% |
| Healthy both years (75%+ of games) and benched (under half the snaps a game) | 9% | 10% | 7% | 5% |
| Healthy both years and trimmed by 5 to 25 points | 24% | 30% | 6% | 4% |
| Change for backups (under half the snaps) | +6.7 | +3.1 | +22.9 | +23.5 |

Findings:
1. Real teams bench a healthy starter about equally at 26 and 31. What grows with age is the trim.
2. Our playing time is all or nothing: starters play nearly every snap, backups none until a
   starter is hurt, then all. Healthy OL, IDL, LB and S starters were never benched or trimmed.
3. The aging thread's all-men gap is mostly our older backups jumping to full time (+23.5 against
   +3.1), not our older starters falling too slowly (-17.2 against -18.3).
4. The head start is not the cause: the `form` arm (no head start for the man in the job) gives
   -17.2, the same.
5. Our starters miss more games at every age (85% of games played against 91%): handed to the aging
   thread's injury steps (ADR-087 §12 AB1, AB5, AB6).

## 3. The owner's four reasons (ruled Q2)

The owner, 2026-11-07: real teams split snaps for (1) **fatigue and conditioning** (linemen and backs
take the heaviest pounding; four- or five-man line rotations keep rushers fresh for the fourth
quarter), (2) **specialized skill sets by situation** (a power back on first down, a third-down back
who catches and picks up blitzes), (3) **matchups** (a quicker slot corner against an agile receiver;
a third tight end against a light front), and (4) **injury prevention and longevity** (a committee
preserves backs over 17 games). Quarterbacks and offensive linemen rarely split: continuity and
chemistry come first.

His table is by position group. Under his ruling that nothing is based on a player's position
(2026-11-06), each reason below is built from what a job asks of a man on the field and what the man
has, so the group pattern comes out of play rather than being written in.

## 4. The design: four reasons, each a mechanism

### 4.1 Fatigue (engine, in-game)
- Every man on the field carries a tiredness level during a game. Each snap adds to it by the effort
  of that snap as the engine played it: blocks taken and given, tackles, hits, sprint distance.
  His `stamina` sets how fast it rises and how fast it falls on the sideline and between series.
- Tiredness costs a little of his speed, quickness and strength while it lasts (CHOSEN sizes).
- The coaches pull a tired man at the next dead ball when the next man on the chart is close enough
  in their read (§4.5) and the man is past the staff's line; he returns when rested.
- A job with heavy contact every snap tires men fastest, so line rotations come from what linemen
  do. An older man's stamina has faded (its curve already falls from 30), so he tires sooner and is
  rested more: his snaps are trimmed while he keeps the job.

### 4.2 Situational skill sets (franchise, weekly)
- For each spot the staff may name a situational man for passing downs (third and long, two-minute)
  and short yardage, when another man on the roster rates clearly better at what that situation asks
  (catching and blitz pickup for a back on passing downs; run blocking at the goal line). The
  ratings are the job's rating weights for that situation, read from abilities, never his label.
- The engine plays the situational man when the situation comes up. This is the first-down back
  and third-down back split.

### 4.3 Matchups (franchise, weekly game plan)
- The weekly game plan (ADR-076) already picks packages against the opponent. It gains a choice of
  which man fills a package slot against the opponent's likely personnel (the quicker corner in the
  slot against a quick slot receiver). Built last (step 5), since the package calls already carry
  most of it.

### 4.4 Injury prevention and longevity (franchise, weekly)
- Each week the staff sets a planned share of snaps for each man at a spot: a "snap count". It
  falls with his season's wear so far (the aging thread's contact count), his injury history and his
  stamina, and rises with how much better he is than the next man.
- Because injury risk is per snap, a trimmed man is hurt less, which is the real point of a
  committee. Nothing extra is added for that.

### 4.5 Continuity, and how close the next man must be
- Swapping a man in costs something on jobs that work in step with teammates: a line's blocking
  calls passed down the line, a passer's timing with his receivers. The coaches weigh that cost
  before they rotate, so quarterbacks and linemen rotate rarely (Q4, §10).
- Every rotation choice reads the coaches' existing read of each man (blurred ratings plus form,
  `depthChart.ts`), so a backup who is close earns snaps and one who is far worse does not. This
  turns a lost rating point into lost snaps smoothly instead of today's all-or-nothing switch.
- The head coach's leanings carry over: form leaning shares more, incumbent leaning shares less.
  The head start itself is left as it is (§2 finding 4).

## 5. What stays

The weekly depth chart, its labels and morale (ADR-087 §3.1, F3), the three leanings, ADR-094 §9's
YOUTH_LOOK and SHAKE_UP. With sharing on, YOUTH_LOOK can give the young man a share of the snaps
instead of only a benching (coordinated with the coach-and-GM thread when both are on).

## 6. Engine part (after the pocket fix)

- Substitution at dead balls, honoring the week's plan: planned shares, situational men, tired men.
- In-game tiredness per man (engine-internal; no contract).
- Every substitution is an event in the play stream (Iron Rule 3), so the play log, participation
  report and checks all read the same facts.
- Behind a switch (`--snap-sharing`, off by default). Switch off: same seed, same stream, golden
  games unchanged (tested).

## 7. Contracts edits (each needs the owner's typed yes at build)

- **S1** `Team.snapPlan?: Partial<Record<Position, readonly SnapPlanEntry[]>>`, where
  `SnapPlanEntry = { player: PlayerId; share: number; situations?: readonly SnapSituation[] }` and
  `SnapSituation = "PASSING_DOWN" | "SHORT_YARDAGE"`. A COACH-authority decision (Iron Rule 6).
- **S2** play-stream event `PLAYER_SUBSTITUTED { team, out, in, position, reason }` with
  `reason: "FATIGUE" | "PLAN" | "SITUATION" | "MATCHUP"` (injury substitutions keep their own path).

## 8. Checks (like for like, real counts; none is a stiff rule)

A new calibration command counts §2's table, real and ours, by group and age. Pass marks, set before
tuning:
- Snaps a starter plays in the games he plays: league 83-85% (ours today 96-98%), and each group
  within 6 points of its real share (QB 96, OL 94, S 90, CB 87, LB 82, WR 78, TE 73, EDGE 72,
  IDL 69, RB 65). The groups are read only by the check; nothing in the mechanism reads them.
- Healthy starters trimmed by 5 to 25 points: 24% at 25-27 and 30% at 30-32, within 5 points each.
- Healthy starters benched: 9-10% at both ages, within 4 points.
- Backups' yearly change at 30-32 within 5 points of +3.1.
- Then the aging thread's 20-season check reads the all-men decline by age (a corner about -13 a
  year from 30).

Measured three ways, since the reasons are separately priceable: fatigue alone, the weekly plan
alone (snap counts and situations), then both.

## 9. Later (ruled Q3: later)

Filling a spot from anyone who can play it (a guard moved out to tackle, a corner to safety), judged
by how each man would rate there. Its own step after this one is in and measured.

## 10. Open question

**Q4. What keeps quarterbacks and linemen from rotating?** (a) A continuity cost on jobs that work in
step with teammates, read from what the job does on the field (recommended: it follows the no-position
ruling, and a team could still rotate a lineman who is badly worn); or (b) let fatigue alone decide,
which would rotate linemen far more than real teams do, since they take contact every snap.

## 11. Build steps

0. The like-for-like playing-time command (calibration only; real and ours; §8).
1. The weekly snap plan (§4.2, §4.4, §4.5), computed and reported but not used by the game, behind
   the switch.
2. Contracts S1, S2 on a typed yes.
3. Engine: substitution and in-game tiredness (§4.1, §6), after the pocket fix's measurements, behind
   the switch; golden games unchanged when off.
4. Tune against §8 in three arms; then the aging thread's 20-season check with sharing on.
5. Matchups in the weekly game plan (§4.3).

## Conjoined mechanisms

Fatigue and the weekly plan are separately priceable: three arms (each alone, then joint), §8.
Situational men and matchups ride the plan and are priced with it, then matchups alone at step 5.

## Implied scope

- Injury exposure per snap (ADR-087): sharing lowers starters' exposure; injury rates are not
  re-tuned here. `unruled` until step 4's arms show the size.
- Growth from snaps (ADR-087 learning): backups who get snaps learn more. `unruled`; read in the
  20-season check.
- Player value and pay (ADR-085): a rotation man's snaps feed his market value. `unruled`.
- Special teams units: not covered.

## Rulings

- 2026-11-07 16:27Z, the owner on the proposal doc's three questions: "1. Yes 2. Base your answer off
  of the following information: [the four reasons, §3] 3. Later".
