import { describe, it, expect } from "vitest";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  fetchSnapshot, latestSnapshot, loadOfficialRows, loadPlayerNames, loadPlayRows, loadScheduleRows, NFLVERSE, officialsFiles,
  OFFICIALS_SEASONS, readManifest, snapshotFiles, verifySnapshot,
} from "../src/importer/real/index.js";
import type { ReadRows } from "../src/importer/real/rows.js";

describe("snapshot (ADR-088 R1)", () => {
  it("names the season's files, stats from the season before", () => {
    const f = snapshotFiles(2026);
    expect(f.rosters).toBe("weekly_rosters/roster_weekly_2026.parquet");
    expect(f.snaps2012).toBe("snap_counts/snap_counts_2012.parquet");
    expect(f.snaps2026).toBe("snap_counts/snap_counts_2026.parquet");
  });

  it("writes every file into a dated folder with a manifest, without touching the network", async () => {
    const root = await mkdtemp(join(tmpdir(), "ff-real-"));
    const asked: string[] = [];
    const download = async (url: string) => { asked.push(url); return new TextEncoder().encode(url); };
    const { dir, manifest } = await fetchSnapshot({ root, season: 2026, now: new Date("2026-10-23T12:00:00Z"), download });
    expect(dir).toBe(join(root, "2026-10-23"));
    expect(asked).toEqual(Object.values(snapshotFiles(2026)).map((p) => `${NFLVERSE}/${p}`));
    expect(await readManifest(dir)).toEqual(manifest);
    expect(manifest.files.rosters!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await readFile(join(dir, "rosters.parquet"), "utf8")).toBe(manifest.files.rosters!.url);
    expect(await latestSnapshot(root)).toBe(dir);
    expect(await latestSnapshot(join(root, "missing"))).toBeNull();
  });
});

describe("the officials snapshot (ADR-093 step 1b)", () => {
  it("names the schedules, the officials table, the players list and four seasons of play-by-play, and fetches exactly those", async () => {
    expect(OFFICIALS_SEASONS).toBe(4);
    expect(officialsFiles(2026)).toEqual({
      schedules: "schedules/games.parquet",
      officials: "officials/officials.parquet",
      players: "players/players.parquet",
      pbp2023: "pbp/play_by_play_2023.parquet",
      pbp2024: "pbp/play_by_play_2024.parquet",
      pbp2025: "pbp/play_by_play_2025.parquet",
      pbp2026: "pbp/play_by_play_2026.parquet",
    });
    const root = join(await mkdtemp(join(tmpdir(), "ff-officials-")), "officials");
    const asked: string[] = [];
    const download = async (url: string) => { asked.push(url); return new TextEncoder().encode(`made-up bytes of ${url}`); };
    const files = officialsFiles(2026);
    const { dir, manifest } = await fetchSnapshot({ root, season: 2026, now: new Date("2026-11-07T01:30:00Z"), download, files });
    expect(dir).toBe(join(root, "2026-11-07"));
    expect(asked).toEqual(Object.values(files).map((p) => `${NFLVERSE}/${p}`));
    expect((await readdir(dir)).sort()).toEqual([...Object.keys(files).map((k) => `${k}.parquet`), "manifest.json"].sort());
    expect(await readManifest(dir)).toEqual(manifest);
    expect(manifest).toMatchObject({ season: 2026, date: "2026-11-07", fetchedAt: "2026-11-07T01:30:00.000Z" });
    expect(Object.keys(manifest.files)).toEqual(Object.keys(files));
    for (const [key, entry] of Object.entries(manifest.files)) {
      const body = await readFile(join(dir, `${key}.parquet`));
      expect(entry.url).toBe(`${NFLVERSE}/${files[key]!}`);
      expect(entry.bytes).toBe(body.byteLength);
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(await latestSnapshot(root)).toBe(dir);
  });

  it("checks a kept folder against its manifest: the manifest when every file is as fetched, else it throws", async () => {
    const root = join(await mkdtemp(join(tmpdir(), "ff-officials-")), "officials");
    const download = async (url: string) => new TextEncoder().encode(`made-up bytes of ${url}`);
    const { dir, manifest } = await fetchSnapshot({ root, season: 2026, now: new Date("2026-11-07T01:30:00Z"), download, files: officialsFiles(2026) });
    expect(await verifySnapshot(dir)).toEqual(manifest);

    // One byte of one file changed: refused, and put back, accepted again.
    const path = join(dir, "pbp2025.parquet");
    const body = await readFile(path);
    const changed = Buffer.from(body);
    changed[3] = changed[3]! ^ 1;
    await writeFile(path, changed);
    await expect(verifySnapshot(dir)).rejects.toThrow(/pbp2025\.parquet is not the file that was fetched/);
    await writeFile(path, body);
    expect(await verifySnapshot(dir)).toEqual(manifest);

    // A file the manifest names is missing: refused.
    await rm(join(dir, "officials.parquet"));
    await expect(verifySnapshot(dir)).rejects.toThrow(/officials\.parquet is missing/);
  });
});

describe("the officials snapshot's loaders (ADR-093 step 1b)", () => {
  // Made-up rows, each file with a column no loader reads.
  const FILES: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>> = {
    schedules: [{
      game_id: "g2025-001", old_game_id: "old-g2025-001", season: 2025, game_type: "REG", week: 1, home_score: 20, away_score: 17,
      referee: "Made Up Referee 01", home_coach: "Made Up Coach 01", away_coach: "Made Up Coach 02", stadium: "Made Up Field",
    }],
    officials: [{ game_id: "old-g2025-001", official_name: "Made Up Referee 01", position: "Referee", season: 2025, official_id: "made-up-id" }],
    players: [
      { display_name: "Made Up Player 01", gsis_id: "made-up-01" }, { display_name: null, gsis_id: "made-up-02" },
      { display_name: 7, gsis_id: "made-up-03" },
    ],
    pbp2025: [{
      game_id: "g2025-001", old_game_id: "old-g2025-001", season: 2025, season_type: "REG", play_type: "pass",
      desc: "(9:12) X.Madeup pass short left.", passer: "X.Madeup",
    }],
  };

  it("each asks for its own columns and keeps every field the copies read: never official_id, and the players' display names alone", async () => {
    // A stand-in for the parquet reader: it keeps only the columns asked for, and throws on one the file lacks, as `readRows` does.
    const asked: string[] = [];
    const read: ReadRows = async <T>(_dir: string, key: string, columns: readonly string[]) => {
      asked.push(`${key}: ${columns.join(" ")}`);
      return FILES[key]!.map((row) => Object.fromEntries(columns.map((c) => {
        if (!Object.hasOwn(row, c)) throw new Error(`${key} has no column ${c}`);
        return [c, row[c]];
      }))) as unknown as T[];
    };
    // The schedules: each game's referee, both coaches (the taken set) and both ids.
    expect(await loadScheduleRows("made-up", read)).toEqual([{
      game_id: "g2025-001", old_game_id: "old-g2025-001", season: 2025, game_type: "REG", week: 1, home_score: 20,
      referee: "Made Up Referee 01", home_coach: "Made Up Coach 01", away_coach: "Made Up Coach 02",
    }]);
    expect(await loadOfficialRows("made-up", read)).toEqual([
      { game_id: "old-g2025-001", official_name: "Made Up Referee 01", position: "Referee", season: 2025 },
    ]);
    expect(await loadPlayerNames("made-up", read)).toEqual(["Made Up Player 01"]); // a null and a number are no names
    // One season's file, with the old-style id the port check counts by.
    expect(await loadPlayRows("made-up", 2025, read)).toEqual([{
      game_id: "g2025-001", old_game_id: "old-g2025-001", season: 2025, season_type: "REG", play_type: "pass", desc: "(9:12) X.Madeup pass short left.",
    }]);
    expect(asked.map((a) => a.split(":")[0])).toEqual(["schedules", "officials", "players", "pbp2025"]);
    expect(asked.find((a) => a.startsWith("players"))).toBe("players: display_name");
    expect(asked.join("; ")).not.toMatch(/official_id|gsis_id|away_score|stadium|passer/);
  });
});
