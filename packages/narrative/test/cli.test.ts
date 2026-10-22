/**
 * THE NEWS COMMAND AND ITS FILE (ADR-082 step 3): a saved season in, its news printed, and a news
 * file saved where the game viewer's News page looks, with the index that lists it.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseNewsArgs, runNews, type SavedSeason } from "../src/cli/newsCli.js";
import { writeNews } from "../src/news/desk.js";
import { NEWS_FILE_FORMAT, newsFile, type NewsFile } from "../src/news/file.js";
import { input, LEAGUE, NAMES, schedule, seasonEvents, STRUCTURE } from "./fixtures.js";

const sched = schedule(18);
const events = seasonEvents(sched, "cli-test");
const saved: SavedSeason = {
  seed: "cli-test", league: { structure: STRUCTURE, teams: NAMES }, season: { season: 2027, schedule: sched }, events,
};

function seasonFile(dir: string, body: unknown = saved): string {
  const path = join(dir, "season-cli-test.json");
  writeFileSync(path, JSON.stringify(body));
  return path;
}

describe("parseNewsArgs", () => {
  it("needs a season file and takes an optional --out", () => {
    expect(parseNewsArgs(["--", "--season", "s.json"])).toEqual({ season: "s.json" });
    expect(parseNewsArgs(["--season", "s.json", "--out", "n.json"])).toEqual({ season: "s.json", out: "n.json" });
    expect(() => parseNewsArgs([])).toThrow(/--season/);
    expect(() => parseNewsArgs(["--season"])).toThrow(/requires a value/);
    expect(() => parseNewsArgs(["--season", "s.json", "--seed", "x"])).toThrow(/unknown argument --seed/);
  });
});

describe("the news file", () => {
  const editions = writeNews(input(sched), events);
  const file = newsFile({ seed: "cli-test", season: 2027, league: LEAGUE, events, editions });

  it("carries its format, every team by city and nickname, and the editions as written", () => {
    expect(file.format).toBe("ff-news/1");
    expect(file.teams).toHaveLength(8);
    expect(file.teams).toContainEqual({ id: "A2", city: "Bayport", name: "Bison" });
    expect(file.editions).toBe(editions);
  });

  it("has the result of every game a story names, and no others", () => {
    const named = new Set(editions.flatMap((e) => e.stories.flatMap((s) => s.event.payload.games.map(String))));
    expect(named.size).toBeGreaterThan(0);
    expect(new Set(file.results.map((g) => String(g.gameId)))).toEqual(named);
  });
});

describe("runNews", () => {
  const fresh = () => mkdtempSync(join(tmpdir(), "ff-news-"));

  it("prints the news and saves it for the viewer under the season file's name, with an index", () => {
    const dir = fresh();
    const viewer = join(dir, "public", "news");
    const lines: string[] = [];
    const path = runNews({ season: seasonFile(dir) }, viewer, (l) => lines.push(l));
    expect(path).toBe(join(viewer, "season-cli-test.json"));
    const file = JSON.parse(readFileSync(path, "utf8")) as NewsFile;
    expect(file).toMatchObject({ format: NEWS_FILE_FORMAT, seed: "cli-test", season: 2027 });
    expect(lines[0]).toMatch(/^\nWeek 1\n {2}\S/);
    const total = /^\n(\d+) headlines in (\d+) editions$/.exec(lines.at(-1)!);
    expect(total).not.toBeNull();
    expect(file.editions.reduce((n, e) => n + e.stories.length, 0)).toBe(Number(total![1]));
    expect(file.editions).toHaveLength(Number(total![2]));
    expect(JSON.parse(readFileSync(join(viewer, "index.json"), "utf8"))).toEqual({ news: ["season-cli-test.json"] });
  });

  it("saves the same file twice from the same season (Iron Rule 4)", () => {
    const dir = fresh();
    const viewer = join(dir, "viewer");
    const first = readFileSync(runNews({ season: seasonFile(dir) }, viewer, () => {}), "utf8");
    expect(readFileSync(runNews({ season: seasonFile(dir) }, viewer, () => {}), "utf8")).toBe(first);
  });

  it("saves to --out instead when given, and leaves the viewer's folder alone", () => {
    const dir = fresh();
    const viewer = join(dir, "viewer");
    const out = join(dir, "elsewhere", "news.json");
    expect(runNews({ season: seasonFile(dir), out }, viewer, () => {})).toBe(out);
    expect(existsSync(out)).toBe(true);
    expect(existsSync(viewer)).toBe(false);
  });

  it("says in plain words when the season was saved without its events", () => {
    const dir = fresh();
    const { events: _events, ...old } = saved;
    expect(() => runNews({ season: seasonFile(dir, old) }, join(dir, "viewer"), () => {})).toThrow(/no event list/);
  });
});
