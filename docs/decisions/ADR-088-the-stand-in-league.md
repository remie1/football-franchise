# ADR-088: the stand-in league: the real NFL, with made-up names and faces

- **Date:** 2026-10-23
- **Proposed by:** Orchestrator, for `attributes` (thread "Real-player stand-in league"; plan
  `/mnt/project-files/design/standin-league-plan.md`)
- **Status:** approved (Q1-Q8, owner, 2026-10-23); Q9-Q10 open; contracts edits S1-S3 proposed, not approved

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

Open: **Q9** team identity (real city with a made-up nickname, recommended, vs both made up);
**Q10** depth charts (copy each team's real depth chart, recommended, vs best-rated starts).

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

## What this does not touch

Engine, playbook, play-callers, calibration's test leagues and arms. The made-up league stays the
default until the owner switches.
