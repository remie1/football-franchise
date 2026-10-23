# ADR-088: the stand-in league: the real NFL, with made-up names and faces

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `attributes` (thread "Real-player stand-in league"; plan
  `/mnt/project-files/design/standin-league-plan.md`)
- **Status:** approved (Q1-Q10, owner, 2026-10-23); contracts edits S1-S3 proposed, not approved

## Problem

The owner ruled in the salary-cap thread (2026-10-23, ADR-085 Q2/Q3/Q9): the league's players are
stand-ins for the real current NFL players, "copied in every way except name and likeness": real
team, position, age, size, draft slot, years in the league, contracts, and ratings from real free
data (never Madden values). This replaces ADR-079 Q6's "made-up players now" for the league the
owner plays. ADR-085 (cap), ADR-086 (draft: real pick ownership) and ADR-087 (aging: real ages and
combine numbers) all consume it.

## Provenance of factual claims — REQUIRED

| Claim | Source | Kind |
|---|---|---|
| nflverse release files reachable: `contracts/historical_contracts.parquet`, `weekly_rosters/roster_weekly_2026.parquet` (weeks 1-7), `rosters/roster_2026.parquet`, `players/players.parquet`, `combine/combine.parquet`, `draft_picks`, `depth_charts/depth_charts_2026.parquet` (daily ESPN snapshots, latest 2026-10-23), `snap_counts_2025`, `nextgen_stats`, `ftn_charting`, `pfr_advstats`, `stats_player/stats_player_reg_2025` | downloaded 2026-10-23 from this container | COMPUTED |
| The contracts CSV twin (`historical_contracts.csv.gz`) is stale: no `gsis_id`, empty `season_history`; only the parquet is current | same download | COMPUTED |
| Latest weekly roster: 48-53 active per team, 14-19 practice squad, 4-16 reserve (28 teams at week 7, 4 at week 6) | `roster_weekly_2026`, latest week per team | COMPUTED |
| 97.6% of the latest week's active/reserve/practice players match an active contract by `gsis_id`, and 95.9% of those contracts name the same team; at week 1 the figures are 95.0% / 94.4% | join of the two files | COMPUTED |
| Contract file holds per-season `base_salary`, `prorated_bonus`, `option_bonus`, `roster_bonus`, `guaranteed_salary`, `cap_number`, `workout_bonus`, `per_game_roster_bonus`, `other_bonus` (millions) | `season_history` column | COMPUTED (read) |
| About 2,000 inactive contracts signed 2021+ still carry 2026 prorated bonus (the dead-money source) | same file | COMPUTED |
| Of the 2,528 players copied, 1,187 have a combine 40 time (pfr ids filled from `players.parquet` where the roster file lacks them); 1,091 have at least one tracking or charting measure; 868 went undrafted | importer run, snapshot 2026-10-23 | COMPUTED |
| The latest weekly file lists 50-55 players on the 53 (code A01) per team: a few teams show more than 53, which the file records as is | importer run | COMPUTED |
| 47 of the first draw's stand-in names matched a former NFL player; names are now drawn off every name in `players.parquet` | importer run | COMPUTED |
| Traded future picks are in no nflverse file | release listing, 2026-10-23 | COMPUTED |
| The owner's pick source, `football.realgm.com/analysis/3656/NFL-Future-Draft-Picks-By-Team`, is not reachable from the build container (proxy refusal) | fetch attempt 2026-10-23 | COMPUTED |
| Contract data originates at OverTheCap; terms to be checked before anything ships | ADR-085 §3 | REPORTED |
| Stand-in name scheme, cache layout, interim placement of extra bio fields | chosen here | CHOSEN — provenance NONE |

## Rulings (owner, 2026-10-23)

- **Q1 — copy the latest rosters.** The owner asked for the most current reliable source of both
  rosters and contracts, falling back to pre-season only if that were more complete. The contract
  file exists only as of today (no free pre-season copy), and today's rosters match it better than
  week 1's (table above), so the copy is the latest week. A refresh command re-copies later.
- **Q2 — the 53, injured reserve and the practice squad**, all with real contracts; only the 53
  play until the cap thread adds reserve and practice-squad moves.
- **Q3 — ratings, first version, from data that downloads cleanly**: combine numbers for body
  ratings; tracking (NGS), charting (FTN, PFR advanced), playing time, draft slot and pay for the
  rest. ESPN win-rate scraping and the scouting-text extraction (attributes.md §2-F) come later.
- **Q4 — box-score stats check ratings, never set them** (attributes.md §2-D unchanged).
- **Q5 — thin-data players are estimated** from position, size, draft slot, pay and playing time,
  and flagged as guesses (low confidence in provenance).
- **Q6 — traded future picks from RealGM's list** (owner's source), entered once with the source
  and date recorded; a test proves every pick has exactly one owner.
- **Q7 — raw downloads stay local** (gitignored cache inside `packages/attributes`); the finished
  league file, made-up names only, is committed so every device and thread can use it.
- **Q8 — no hidden team-strength boost** in the stand-in league; strength comes from the players.

- **Q9 — real city, made-up nickname** (owner, 2026-10-23 20:56Z): each team shows its real city
  or region with a nickname that is no real NFL team's (`positions.ts`).
- **Q10 — depth charts copied as they are today** (owner, same message): ESPN's latest order within
  each position; players ESPN does not list come after, most experienced first.

## Design

1. **Fetch** (`importer/real/fetch.ts`): downloads a pinned list of nflverse release files into
   `packages/attributes/data-cache/real/<date>/` with a manifest (url, bytes, sha256, fetched-at).
   The only module that reads them is `importer/real/` (Charter rule 7; attributes.md §5).
2. **Stand-ins**: each real player becomes a `PlayerState` whose name and face are drawn from a
   seed keyed by his nflverse id, so the same real player keeps the same stand-in name on every
   refresh without any committed lookup table. Age from birth date at the snapshot date; height,
   weight, position, draft slot, years in the league copied.
3. **Ratings** on ADR-079's absolute scale (`rate.ts`, `tracking.ts`):
   - body ratings from the combine through the made-up league's own conversion
     (`fictional/derive.ts`); a drill he skipped takes his position's average, recorded as imputed;
   - a **standing** within his position group from pay (veterans: contract APY as a share of the
     cap), draft slot (weighing less each year), last season's snap share, today's ESPN depth
     rank, and tracking/charting (NGS: completion over expected, separation, YAC over expected,
     rush yards over expected; PFR: on-target %, drops, broken tackles, pressures, yards per
     target allowed, missed tackles), each pooled over 2025 + 2026 so far and shrunk by sample
     size. A missing signal counts as average, so a rookie is not judged on his slot alone;
   - the standing is read as the made-up generator's talent number, so the same tiers give the
     ratings (a starter mid 60s at his core ratings; 90+ among the league's best), and each
     tracking measure then nudges its own ratings (8 points per standard score);
   - box-score stats do not enter (Q4). Offensive linemen and kickers have no free isolated
     measure yet; theirs rest on the market signals.
   CHOSEN — provenance NONE: the signal weights (pay 1.2, draft 1.0 decaying 0.2 a year, snaps
   1.0, depth 0.8, tracking 1.5), the shrink constants and the nudge size. R6 checks them.
4. **Contracts** in the shape ADR-085 K1-K5 defines; dead money from cut players' older contracts.
5. **League file**: teams, players, depth charts, contracts, picks. The `season` command plays it
   with `--league <file>`, so calibration needs no new import from attributes (no rule change).
6. **Checks** (R6): ratings against production leaders (attributes.md §8), team cap totals against
   real ones, records spread.

### Interim placement, until the contracts edits below are approved

Fields `PlayerBio` does not have yet (years in the league, combine numbers, reserve / practice-squad
status) ride in the league file's `provenance`, the way the made-up league already carries its
measurements there. `Team.roster` holds the active players only, which is what everything
downstream reads today.

### Contracts edits proposed (each needs the owner's typed yes)

- **S1** — `PlayerBio.creditedSeasons?: number`: the same field as ADR-085 K5. One edit, whichever
  thread lands it first.
- **S2** — `PlayerBio.combine?`: the same field as ADR-086/087 P2. One edit, shared.
- **S3** — roster status: `Team.reserve?: PlayerId[]` and `Team.practiceSquad?: PlayerId[]`, so
  injured and practice-squad players live on the team without being in `roster`.

## What is built (2026-10-23, draft PR #32)

- **R1-R3** as above. `pnpm --filter @ff/attributes import-real [-- --fetch]` writes
  `packages/attributes/leagues/standin-<date>.json` and the local sealed table.
- **Must-field elevation**: when a team's copied 53 has no quarterback, kicker, punter or snapper
  (the snapshot caught Miami between cutting its kicker and promoting his replacement), its
  practice-squad player at that position is moved up, as the real team does on game day; listed
  in `provenance.elevated`.
- **R4 part 1, contracts**: OverTheCap's year-by-year history in the contract file belongs to the
  player (every contract row carries the same copy), so each stand-in's contract is his history
  from 2026 on, on his current team, where the cap number is above zero; in dollars, in today's
  `PlayerContract` shape plus ADR-085 K1/K2 fields as optional extras. 2,474 of 2,528 players
  have a deal; 501 (mostly practice squad) have no 2026 row and are estimated at their deal's
  yearly average.
- **Contract details for the cap thread**: how sure each copy is (`copied` / `estimated`) is in
  `provenance.contractSource`, not on the contract; a year after the deal's real end with zero
  base and proration only is marked `voidYear` (K1; 7 such years in the 2026-10-23 copy). The
  total signing bonus is not in the file; the cap code derives it from the proration.
- **Career history for ADR-087** (`history.ts`, `provenance.history`): regular-season career snaps
  by side (snap counts start in 2012), games played in each of the last five seasons, the
  reserve list (nflverse code; R01 injured reserve, R04 PUP, R05 non-football injury, R48 injured
  reserve designated to return named, any other kept raw as OTHER), and the latest injury on this
  season's report with its week and body part.
- **R4 part 2, dead money** (`deadMoney.ts`, league file `deadMoney`): OverTheCap's 32 team
  pages (owner allowed the site, 2026-10-23), kept in the snapshot folder as `otc/<team>.html` with
  a sha256 manifest (gitignored, Q7). Each season's "Dead Money" table becomes ADR-085 K3's
  `DeadMoneyCharge { team, player, season, amount, reason }`: 792 charges from 2026 on, $1,577M in
  2026. A let-go player who is on a roster today is named by his stand-in id (matched by name,
  loosely, inside the importer; a name two players share matches neither); the rest get a
  placeholder (`gone-<team id>-<n>`, the stand-in team id; 254 of them), so no real name leaves the importer.
  REPORTED caveats: OverTheCap does not say why a charge exists, so `reason` is `RELEASED`
  throughout (a traded player's charge looks the same); and every page's TOTAL runs $0.4-1.2M
  above its itemized rows, so the gap is kept as one unnamed charge per team
  (`gone-<team id>-rest`, $34M league-wide over all seasons) so totals match the page.
  COMPUTED check: 2026 cap numbers plus dead money average $307.8M a team against OverTheCap's
  $304.7M "total cap liabilities" (mean gap $4.9M; Green Bay -$12.9M and San Francisco -$11.3M
  are the two biggest, likely contracts the file is missing). Miami goes from $122M to $307M
  (OverTheCap $302M). Refresh with `import-real -- --fetch-otc` (pages only) or `--fetch` (both).
- **R5, the season plays the stand-ins**: `pnpm --filter @ff/calibration season -- --seed <s>
  --league <file>` reads the league file (a file, not an import: calibration's attributes
  surface stays ADR-079 R1's one function). New league provenance `REAL_STAND_IN` (not
  `DERIVED`: first-version ratings are mostly priors). Not with `--save` or `--team-sd` yet.
- **R5, traded picks** (`picks.ts`, league file `picks` + `picksSource`): 12 traded picks
  transcribed from RealGM's page (owner's source, Q6), in ADR-086 C1's shape. Caveats, REPORTED from
  the page itself: it is dated 16 March 2026, so trades since then (the 2026 draft's day-of trades,
  this season's deadline) are not in it; it covers rounds 1-3 only; and it contradicts itself once
  (DAL lists its 2027 3rd "To PIT", PIT lists DAL's 2027 2nd), kept from the giving team's side with
  the conflict in the condition text. The DAL/GB/NYJ 2027 1st-round swap is kept as two entries
  whose condition quotes both lines.

## R6 — first checks (2026-10-23)

| Check | Stand-in league | Real NFL |
|---|---|---|
| Spread of wins in a season (10 seasons, seeds `standin-check-1..10`) | 2.82 | 3.05 (2.70 to 3.65 by year, 2021-24) |
| Teams' average simulated wins vs their real 2025 win % (rank correlation) | 0.38 | 0.31 (real 2025 vs real 2026 so far) |
| Combined points per game | 122 | about 45 (the accepted drift of ADR-079 Q3; the owner's hold on scoring) |

Box-score smell test (attributes.md §8.2): each player's standing against his 2025 production,
rank correlation, production never an input (Q4). QB EPA (200+ attempts) 0.70; WR receiving
yards (40+ targets) 0.64; TE 0.61; RB scrimmage yards (80+ carries) 0.70; edge sacks + half hits
(10+ games) 0.79; interior DL 0.72; CB passes defended + INTs 0.54; inside LB solo tackles 0.50.
COMPUTED (scratch analysis on the committed league file; not a test).

## What this does not touch

Engine, playbook, play-callers, calibration's test leagues and arms. The made-up league stays the
default until the owner switches.
