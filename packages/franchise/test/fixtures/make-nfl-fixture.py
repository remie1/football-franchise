"""Rebuilds nfl-seasons.json from nflverse's public games table (team results only, no player data).

Source: https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv
Usage:  python3 make-nfl-fixture.py games.csv > nfl-seasons.json
Kept:   regular-season games, as [week, away, home, awayScore, homeScore].
"""
import csv, json, sys

SEASONS = ["2020", "2021", "2022", "2023", "2024"]
out = {s: [] for s in SEASONS}
for r in csv.DictReader(open(sys.argv[1])):
    if r["game_type"] == "REG" and r["season"] in out:
        out[r["season"]].append([int(r["week"]), r["away_team"], r["home_team"], int(r["away_score"]), int(r["home_score"])])
print("{")
for i, s in enumerate(SEASONS):
    games = sorted(out[s], key=lambda g: (g[0], g[2]))
    print(f'  "{s}": [')
    print(",\n".join("    " + json.dumps(g) for g in games))
    print("  ]" + ("," if i < len(SEASONS) - 1 else ""))
print("}")
