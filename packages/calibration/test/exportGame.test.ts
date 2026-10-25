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
 *  5. IT NAMES ITS CALLER (ADR-073 step 3.5). The file records the caller version that played,
 *     resolved, never "default", so the seed and the version read back off the file re-make it
 *     byte for byte after the default moves.
 *  6. IT NAMES ITS RULES (ADR-089 §9, O11). The file always records the engine rules that played,
 *     resolved the same way: `legacy` at step 0, with no overlay digest; the seed, caller and rules
 *     read back off the file re-make it byte for byte; rules this build does not have are refused.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DEFAULT_CALLER_VERSION } from "../src/caller/anticipate.js";
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
    expect(game.callerVersion).toBe(DEFAULT_CALLER_VERSION);
    expect(game.events[0]!.event.type).toBe("GAME_START");
    expect(game.events.at(-1)!.event.type).toBe("GAME_END");
  });

  it("stamps the caller that played, and the stamp re-makes the file (ADR-073 step 3.5)", () => {
    // No caller named: the file says the default as it stands, and naming that version makes the
    // same file, byte for byte. So the stamp is the caller that played, not a word for "whatever
    // the default is", and the file can be re-made from its own fields after the default moves.
    expect(game.callerVersion).not.toBe("default");
    expect(JSON.stringify(exportGame({ seed: game.seed, callerVersion: game.callerVersion }))).toBe(
      JSON.stringify(game),
    );
    // Named: stamped as named, re-made from its own fields, and another game than the default's,
    // so the stamp is what tells the two files apart.
    const named = exportGame({ seed: SEED, callerVersion: "v1" });
    expect(named.callerVersion).toBe("v1");
    expect(JSON.stringify(exportGame({ seed: named.seed, callerVersion: named.callerVersion }))).toBe(
      JSON.stringify(named),
    );
    expect(JSON.stringify(named.events)).not.toBe(JSON.stringify(game.events));
  });

  it("stamps the engine rules that played, legacy at step 0, and the stamp re-makes the file (ADR-089 §9)", () => {
    expect(game.engineRules).toBe("legacy");
    expect("engineRulesDigest" in game).toBe(false);
    // Written right after the caller, so the two facts about what played sit together.
    expect(Object.keys(game).slice(0, 5)).toEqual(["format", "seed", "league", "callerVersion", "engineRules"]);
    const remade = exportGame({ seed: game.seed, callerVersion: game.callerVersion, engineRules: game.engineRules });
    expect(JSON.stringify(remade)).toBe(JSON.stringify(game));
    // Naming legacy plays exactly the game naming nothing plays: nothing reaches the engine (K4).
    expect(JSON.stringify(exportGame({ seed: SEED, engineRules: "legacy" }).events)).toBe(JSON.stringify(game.events));
    for (const bad of ["pocket-1.s1", "pocket-1", "default"]) {
      expect(() => exportGame({ seed: SEED, engineRules: bad })).toThrow(/^exportGame: engine rules/);
    }
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
