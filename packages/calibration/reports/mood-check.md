# Fan and media mood over many seasons (ADR-096 step 2, `mood-check`)

League: packages/attributes/leagues/standin-2026-10-23.json, seed `mood-check-1`, `mood-check-2`, `mood-check-3`, 30 seasons, 960 team-seasons, 16320 team-weeks of regular-season games. Build d5b0f79.

No real count exists for how often a fan base is furious; every share here is ours alone, to look at, not a target.

## How the team mood sits after each game

| | -60 or lower (furious) | -40 or lower | +40 or higher | +60 or higher | mean distance from 0 |
|---|---|---|---|---|---|
| Fans | 21.0% | 31.5% | 30.0% | 19.8% | 52.1 |
| Media | 2.2% | 9.6% | 9.0% | 2.2% | 24.1 |

Team-seasons whose fans were furious (-60 or lower) at least one week: 88.6%; four weeks or more: 46.3%.

## Final regular-season mood by wins

| Wins | Teams | Fans | Media |
|---|---|---|---|
| 0-4 | 47 | -49.8 | -54.0 |
| 5-8 | 436 | -21.1 | -20.8 |
| 9-12 | 423 | 18.4 | 18.9 |
| 13+ | 54 | 42.0 | 50.6 |

## How often each hot take's mood side is live

Only the mood part of each take (ADR-096 §4). Step 3 adds the rest: BENCH needs a backup within 6 points, TRADE_AWAY an old or overpaid man, PAY_HIM a contract's last year, GO_GET a player who could really be had (not counted here at all), so the real rates will be lower.

| Take | Mood line | Team-weeks live | Team-seasons live at least once |
|---|---|---|---|
| FIRE | a seat at -60, or -40 in a 3-game losing streak | 36.4% | 97.7% |
| BENCH | a watch-list player at -40 for 2+ games | 70.5% | 100.0% |
| TRADE_AWAY | a watch-list player at -30 | 92.5% | 100.0% |
| PAY_HIM | a watch-list player at +40 | 89.1% | 100.0% |
| TANK | team at -50 and playoff chance under 10% | 11.6% | 49.5% |

FIRE by seat (team-seasons live at least once): head coach 38.8%, GM 75.0%, OC 90.5%, DC 83.2%.

## Other numbers

- Head coaches and GMs fired: 181; with their last fan reading at -40 or lower: 42.5% (mood does not push firings yet; part 6 is later).
- Largest watch list seen: 6 (the cap is 6).
- Our league's home margin: 0.26 points a game over 8160 games (the engine plays no home field; `MOOD.homeEdge` is 0; the real NFL's is about 1.5 to 2).

## Each season

| Season | Team-weeks | Fans furious | Fans -40 or lower | FIRE seasons | TANK seasons |
|---|---|---|---|---|---|
| 2026 | 544 | 20.6% | 31.4% | 93.8% | 43.8% |
| 2027 | 544 | 20.8% | 32.5% | 96.9% | 50.0% |
| 2028 | 544 | 18.8% | 29.6% | 96.9% | 43.8% |
| 2029 | 544 | 22.8% | 32.2% | 100.0% | 46.9% |
| 2030 | 544 | 20.8% | 32.7% | 100.0% | 50.0% |
| 2031 | 544 | 21.7% | 31.8% | 96.9% | 43.8% |
| 2032 | 544 | 20.8% | 30.5% | 100.0% | 56.3% |
| 2033 | 544 | 21.5% | 31.8% | 100.0% | 50.0% |
| 2034 | 544 | 21.0% | 31.1% | 93.8% | 46.9% |
| 2035 | 544 | 20.6% | 31.1% | 96.9% | 56.3% |
| 2026 | 544 | 21.0% | 32.2% | 100.0% | 46.9% |
| 2027 | 544 | 22.1% | 32.9% | 96.9% | 59.4% |
| 2028 | 544 | 20.6% | 30.7% | 100.0% | 53.1% |
| 2029 | 544 | 23.3% | 31.6% | 100.0% | 50.0% |
| 2030 | 544 | 22.6% | 33.8% | 93.8% | 40.6% |
| 2031 | 544 | 22.8% | 32.7% | 100.0% | 62.5% |
| 2032 | 544 | 22.2% | 32.2% | 100.0% | 50.0% |
| 2033 | 544 | 18.8% | 30.9% | 100.0% | 46.9% |
| 2034 | 544 | 19.5% | 29.0% | 96.9% | 43.8% |
| 2035 | 544 | 20.6% | 30.7% | 90.6% | 50.0% |
| 2026 | 544 | 19.9% | 30.1% | 100.0% | 46.9% |
| 2027 | 544 | 21.3% | 31.6% | 96.9% | 59.4% |
| 2028 | 544 | 21.0% | 31.3% | 96.9% | 46.9% |
| 2029 | 544 | 23.2% | 32.2% | 100.0% | 46.9% |
| 2030 | 544 | 22.6% | 31.4% | 100.0% | 53.1% |
| 2031 | 544 | 18.8% | 29.2% | 96.9% | 62.5% |
| 2032 | 544 | 21.1% | 32.2% | 96.9% | 40.6% |
| 2033 | 544 | 21.0% | 32.2% | 100.0% | 50.0% |
| 2034 | 544 | 22.2% | 32.5% | 93.8% | 40.6% |
| 2035 | 544 | 17.5% | 29.4% | 96.9% | 46.9% |
