/**
 * THE VIEWER'S GAME FILE (`src/export/`).
 *
 *  1. DETERMINISM (Iron Rule 4). Same seed, byte-identical file; a different seed, a different game.
 *  2. IT ONLY READS. The saved stream is `runOneGame`'s stream for the same fixture and seed,
 *     unchanged — the exporter adds names and statlines beside it and nothing inside it.
 *  3. EVERY ID HAS A NAME. Any player or team the stream mentions is in the file's lookups, so
 *     the viewer never has to show a bare id.
 *  4. THE COMMAND LINE. Arguments parse, bad ones are refused, and a run writes the game and the
 *     folder's index.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { gameFileName, parseExportArgs, runExport } from "../src/export/cli.js";
import { exportGame, GAME_FILE_FORMAT } from "../src/export/gameFile.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const SEED = "viewer:export-test";
const game = exportGame({ seed: SEED });

describe("exportGame", () => {
  it("is deterministic: same seed, same bytes; another seed, another game", () => {
    expect(JSON.stringify(exportGame({ seed: SEED }))).toBe(JSON.stringify(game));
    expect(JSON.stringify(exportGame({ seed: `${SEED}:other` }).events)).not.toBe(JSON.stringify(game.events));
  });

  it("saves runOneGame's stream untouched", () => {
    const index = indexLeague(buildFlatLeague({ teams: 2 }));
    const [home, away] = index.teamIds();
    const [fixture] = buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: 1, season: 2024 });
    const { observation } = runOneGame({
      built: buildFixture(index, fixture!),
      seed: SEED,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
    });
    expect(JSON.stringify(game.events)).toBe(JSON.stringify(observation.events));
    expect(JSON.stringify(game.statlines)).toBe(JSON.stringify(observation.statlines));
  });

  it("is a whole game: starts, ends, and says how it was made", () => {
    expect(game.format).toBe(GAME_FILE_FORMAT);
    expect(game.seed).toBe(SEED);
    expect(game.callerVersion).toBe("default");
    expect(game.events[0]!.event.type).toBe("GAME_START");
    expect(game.events.at(-1)!.event.type).toBe("GAME_END");
  });

  it("names every team and every player the stream or the box score mentions", () => {
    const start = game.events[0]!.event;
    if (start.type !== "GAME_START") throw new Error("unreachable");
    expect([game.home.id, game.away.id]).toEqual([String(start.payload.home), String(start.payload.away)]);
    for (const line of game.statlines) {
      expect(game.players[String(line.player)], String(line.player)).toBeDefined();
      expect([game.home.id, game.away.id]).toContain(String(line.team));
    }
    for (const player of Object.values(game.players)) expect(player.name.length).toBeGreaterThan(0);
  });

  it("refuses an empty seed", () => {
    expect(() => exportGame({ seed: " " })).toThrow(/seed/);
  });
});

describe("export-game command", () => {
  const dir = mkdtempSync(join(tmpdir(), "ff-export-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("parses its arguments and refuses bad ones", () => {
    expect(parseExportArgs(["--", "--seed", "a", "--caller", "v5", "--out", dir])).toEqual({
      seed: "a",
      callerVersion: "v5",
      outDir: dir,
    });
    expect(() => parseExportArgs([])).toThrow(/--seed is required/);
    expect(() => parseExportArgs(["--seed"])).toThrow(/requires a value/);
    expect(() => parseExportArgs(["--seed", "a", "--caller", "v9"])).toThrow(/--caller/);
    expect(() => parseExportArgs(["--seed", "a", "--bogus"])).toThrow(/unknown argument/);
  });

  it("names files safely from the seed", () => {
    expect(gameFileName("week 3: rain/wind")).toBe("week_3_rain_wind.json");
    expect(gameFileName("a", "v5")).toBe("a.v5.json");
  });

  it("writes the game and lists it in the folder's index", () => {
    const path = runExport({ seed: SEED, outDir: dir });
    expect(readFileSync(path, "utf8")).toBe(JSON.stringify(game) + "\n");
    expect(JSON.parse(readFileSync(join(dir, "index.json"), "utf8"))).toEqual({ games: [gameFileName(SEED)] });
  });
});
