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
 *     resolved the same way: `legacy` by default, with no overlay digest; step 1's design bundle
 *     `pocket-1.s1` with its overlay digest beside the name, played with its own tunables
 *     (`rulesTunables`, O26: an export names rules, never an arm). The seed, caller and rules read
 *     back off the file re-make it byte for byte; rules this build does not have are refused. The
 *     command line takes `--engine-rules`, and a non-legacy file is named after its rules too.
 *  7. STEP 2'S BUNDLE (ADR-089 step 2, plan §1.8). `pocket-1.s2` exports the same way: its own
 *     tunables, its overlay digest beside the name, a file named after it, and another game than
 *     `legacy` and `pocket-1.s1` on the same seed.
 *
 * The engine plays `pocket-1` (stream E-b), so a `pocket-1.s1` game is another game than `legacy` on
 * the same seed, and the stamp is what tells the two files apart.
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
import { POCKET_1_S1_DIGEST, POCKET_1_S2_DIGEST, rulesTunables } from "../src/pocket/rules.js";

const SEED = "viewer:export-test";
const game = exportGame({ seed: SEED });
const pocketGame = exportGame({ seed: SEED, engineRules: "pocket-1.s1" });
const stepTwoGame = exportGame({ seed: SEED, engineRules: "pocket-1.s2" });

/** `runOneGame`'s observation for the exporter's fixture, as the exporter builds it. */
function observedGame(seed: string, tunables?: ReturnType<typeof rulesTunables>) {
  const index = indexLeague(buildFlatLeague({ teams: 2 }));
  const [home, away] = index.teamIds();
  const [fixture] = buildFixtures(index, { kind: "SYNTHETIC_PAIR", home: home!, away: away!, games: 1, season: 2024 });
  return runOneGame({
    built: buildFixture(index, fixture!),
    seed,
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    ...(tunables === undefined ? {} : { tunables }),
  }).observation;
}

describe("exportGame", () => {
  it("is deterministic: same seed, same bytes; another seed, another game", () => {
    expect(JSON.stringify(exportGame({ seed: SEED }))).toBe(JSON.stringify(game));
    expect(JSON.stringify(exportGame({ seed: `${SEED}:other` }).events)).not.toBe(JSON.stringify(game.events));
  });

  it("saves runOneGame's stream untouched", () => {
    const observation = observedGame(SEED);
    expect(JSON.stringify(game.events)).toBe(JSON.stringify(observation.events));
    expect(JSON.stringify(game.statlines)).toBe(JSON.stringify(observation.statlines));
  });

  it("under pocket-1.s1, saves runOneGame's stream for the design bundle untouched (ADR-089 §9, O26)", () => {
    const observation = observedGame(SEED, rulesTunables("pocket-1.s1"));
    expect(JSON.stringify(pocketGame.events)).toBe(JSON.stringify(observation.events));
    expect(JSON.stringify(pocketGame.statlines)).toBe(JSON.stringify(observation.statlines));
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
    // Not a name in this build: refused before anything is played. (`pocket-1.s1` moved out of
    // this list at step 1, into the case below.)
    for (const bad of ["pocket-1", "default", "pocket-1.s9", ""]) {
      expect(() => exportGame({ seed: SEED, engineRules: bad }), bad).toThrow(/^exportGame: engine rules ".*" are not in this build/);
    }
  });

  it("stamps pocket-1.s1 with its overlay digest, and the stamp re-makes the file (ADR-089 §9, step 1)", () => {
    expect(pocketGame.engineRules).toBe("pocket-1.s1");
    expect(pocketGame.engineRulesDigest).toBe(POCKET_1_S1_DIGEST);
    expect(pocketGame.engineRulesDigest).toBe(rulesTunables("pocket-1.s1").engineRules?.overlayDigest);
    expect(Object.keys(pocketGame).slice(0, 6)).toEqual(["format", "seed", "league", "callerVersion", "engineRules", "engineRulesDigest"]);
    const remade = exportGame({ seed: pocketGame.seed, callerVersion: pocketGame.callerVersion, engineRules: pocketGame.engineRules });
    expect(JSON.stringify(remade)).toBe(JSON.stringify(pocketGame));
    // Deterministic under its own rules too (Iron Rule 4).
    expect(JSON.stringify(exportGame({ seed: SEED, engineRules: "pocket-1.s1" }))).toBe(JSON.stringify(pocketGame));
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

// The engine plays the bundle's blocks (E-b), so the stamp is what tells the two files apart.
describe("exportGame under pocket-1.s1 plays another game", () => {
  it("the same seed under pocket-1.s1 gives another stream than under legacy", () => {
    expect(JSON.stringify(pocketGame.events)).not.toBe(JSON.stringify(game.events));
  });
});

describe("exportGame under pocket-1.s2 (ADR-089 step 2)", () => {
  it("saves runOneGame's stream for step 2's bundle untouched (ADR-089 §9, O26)", () => {
    const observation = observedGame(SEED, rulesTunables("pocket-1.s2"));
    expect(JSON.stringify(stepTwoGame.events)).toBe(JSON.stringify(observation.events));
    expect(JSON.stringify(stepTwoGame.statlines)).toBe(JSON.stringify(observation.statlines));
  });

  it("stamps pocket-1.s2 with its overlay digest, and the stamp re-makes the file", () => {
    expect(stepTwoGame.engineRules).toBe("pocket-1.s2");
    expect(stepTwoGame.engineRulesDigest).toBe(POCKET_1_S2_DIGEST);
    expect(stepTwoGame.engineRulesDigest).toBe(rulesTunables("pocket-1.s2").engineRules?.overlayDigest);
    expect(Object.keys(stepTwoGame).slice(0, 6)).toEqual(["format", "seed", "league", "callerVersion", "engineRules", "engineRulesDigest"]);
    const remade = exportGame({ seed: stepTwoGame.seed, callerVersion: stepTwoGame.callerVersion, engineRules: stepTwoGame.engineRules });
    expect(JSON.stringify(remade)).toBe(JSON.stringify(stepTwoGame));
    // Deterministic under its own rules too (Iron Rule 4).
    expect(JSON.stringify(exportGame({ seed: SEED, engineRules: "pocket-1.s2" }))).toBe(JSON.stringify(stepTwoGame));
  });

  it("plays another game than legacy and than pocket-1.s1 on the same seed, and every pass play carries its stamp", () => {
    expect(JSON.stringify(stepTwoGame.events)).not.toBe(JSON.stringify(game.events));
    expect(JSON.stringify(stepTwoGame.events)).not.toBe(JSON.stringify(pocketGame.events));
    const stamps = new Set<string>();
    for (const { event } of stepTwoGame.events) {
      if (event.type !== "PLAY_START") continue;
      const rules = (event.payload as { readonly rules?: { readonly name: string; readonly overlayDigest: string } } | undefined)?.rules;
      if (rules !== undefined) stamps.add(`${rules.name}@${rules.overlayDigest}`);
    }
    expect([...stamps]).toEqual([`pocket-1.s2@${POCKET_1_S2_DIGEST}`]);
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

  it("takes --engine-rules: legacy or a design bundle, and refuses any other name (ADR-089 §9)", () => {
    expect(parseExportArgs(["--seed", "a", "--engine-rules", "pocket-1.s1", "--out", dir])).toEqual({
      seed: "a",
      engineRules: "pocket-1.s1",
      outDir: dir,
    });
    expect(parseExportArgs(["--seed", "a", "--engine-rules", "pocket-1.s2", "--out", dir])).toEqual({
      seed: "a",
      engineRules: "pocket-1.s2",
      outDir: dir,
    });
    expect(parseExportArgs(["--seed", "a", "--caller", "v5", "--engine-rules", "legacy", "--out", dir])).toEqual({
      seed: "a",
      callerVersion: "v5",
      engineRules: "legacy",
      outDir: dir,
    });
    expect("engineRules" in parseExportArgs(["--seed", "a"])).toBe(false);
    for (const bad of ["pocket-1", "default", "pocket-1.s1@fnv1a:69a7cc48", "pocket-1.s2@fnv1a:03754f60", "pocket-1.s3", "B3", "heels"]) {
      expect(() => parseExportArgs(["--seed", "a", "--engine-rules", bad]), bad).toThrow(
        /^--engine-rules must be one of legacy, pocket-1\.s1, pocket-1\.s2$/,
      );
    }
    expect(() => parseExportArgs(["--seed", "a", "--engine-rules"])).toThrow(/requires a value/);
  });

  it("names files safely from the seed", () => {
    expect(gameFileName("week 3: rain/wind")).toBe("week_3_rain_wind.json");
    expect(gameFileName("a", "v5")).toBe("a.v5.json");
    // ADR-089: a legacy file's name is what it always was; other rules add their name.
    expect(gameFileName("a", "v5", "legacy")).toBe("a.v5.json");
    expect(gameFileName("a", undefined, "legacy")).toBe("a.json");
    expect(gameFileName("a", "v5", "pocket-1.s1")).toBe("a.v5.pocket-1.s1.json");
    expect(gameFileName("a", undefined, "pocket-1.s1")).toBe("a.pocket-1.s1.json");
    expect(gameFileName("a", "v7", "pocket-1.s2")).toBe("a.v7.pocket-1.s2.json");
    expect(gameFileName("a", undefined, "pocket-1.s2")).toBe("a.pocket-1.s2.json");
  });

  it("writes the game and lists it in the folder's index", () => {
    const path = runExport({ seed: SEED, outDir: dir });
    expect(readFileSync(path, "utf8")).toBe(JSON.stringify(game) + "\n");
    expect(JSON.parse(readFileSync(join(dir, "index.json"), "utf8"))).toEqual({ games: [gameFileName(SEED)] });
  });

  it("writes a pocket-1.s1 game beside the legacy one, never over it, and lists both", () => {
    const path = runExport({ seed: SEED, engineRules: "pocket-1.s1", outDir: dir });
    expect(path).toBe(join(dir, gameFileName(SEED, undefined, "pocket-1.s1")));
    expect(readFileSync(path, "utf8")).toBe(JSON.stringify(pocketGame) + "\n");
    expect(readFileSync(join(dir, gameFileName(SEED)), "utf8")).toBe(JSON.stringify(game) + "\n");
    expect(JSON.parse(readFileSync(join(dir, "index.json"), "utf8"))).toEqual({
      games: [gameFileName(SEED), gameFileName(SEED, undefined, "pocket-1.s1")].sort(),
    });
  });

  it("writes a pocket-1.s2 game beside the others, never over them, and lists all three", () => {
    const path = runExport({ seed: SEED, engineRules: "pocket-1.s2", outDir: dir });
    expect(path).toBe(join(dir, gameFileName(SEED, undefined, "pocket-1.s2")));
    expect(readFileSync(path, "utf8")).toBe(JSON.stringify(stepTwoGame) + "\n");
    expect(readFileSync(join(dir, gameFileName(SEED)), "utf8")).toBe(JSON.stringify(game) + "\n");
    expect(readFileSync(join(dir, gameFileName(SEED, undefined, "pocket-1.s1")), "utf8")).toBe(JSON.stringify(pocketGame) + "\n");
    expect(JSON.parse(readFileSync(join(dir, "index.json"), "utf8"))).toEqual({
      games: [gameFileName(SEED), gameFileName(SEED, undefined, "pocket-1.s1"), gameFileName(SEED, undefined, "pocket-1.s2")].sort(),
    });
  });
});
