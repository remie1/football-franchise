/**
 * ADR-093 step 1b: the committed stand-in league file's officiating block, the 17 copied crews that
 * `standin-officials` wrote (named here, not "the newest", as `standinDevelopment.test.ts` names it).
 * The raw data are not in the repo, so no test here can show that no referee is named like a real
 * official: the importer's taken set does that when it writes, and the leak check before the PR
 * confirms it on the real data.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIRST_NAMES, LAST_NAMES } from "../src/fictional/names.js";
import {
  CREW_COUNT, CREW_FAMILIES, STANDIN_OFFICIALS_VERSION, STANDIN_SPREAD,
  crewsProblem, officiatingMethod, serializeLeagueFile,
  type LeagueFileLike, type StandInOfficiating,
} from "../src/importer/real/index.js";

const FILE = join(__dirname, "..", "leagues", "standin-2026-10-23.json");
const text = readFileSync(FILE, "utf8");
const file = JSON.parse(text) as LeagueFileLike & { officiating: StandInOfficiating };
const block = file.officiating;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/**
 * The committed league file before `standin-officials` wrote its officiating block (the file at
 * 87681e2, with its growth records, and its estimated deals rebuilt by `standin-contracts` on
 * 2026-11-07), by its sha256: only a new snapshot of the league, a refresh of its contracts, or new
 * growth records (`standin-development`) may change this. ADR-087 AB2's new growth records did: at
 * `standin-development/2` every man has his fade shifts, so the file without its block moved from
 * main's d9102480… to e5cd6230…, and the block itself is main's to the byte.
 */
const FILE_BEFORE_OFFICIALS_SHA256 = "e5cd62309b8186fe6607d25292df3945c081abdc8c2f8d26c234c9cc7474c2d5";

describe("the committed league file's copied crews (ADR-093 step 1b)", () => {
  it("are 17 crews o:01 to o:17 in id order, with 17 made-up referees and five whole leans each, every family averaging 50", () => {
    expect(block.version).toBe(STANDIN_OFFICIALS_VERSION);
    expect(block.season).toBe(file.season);
    expect(file.season).toBe(2026);
    expect(block.crews.map((c) => String(c.id))).toEqual(Array.from({ length: CREW_COUNT }, (_, i) => `o:${String(i + 1).padStart(2, "0")}`));
    expect(new Set(block.crews.map((c) => c.referee)).size).toBe(CREW_COUNT);
    for (const c of block.crews) {
      const words = c.referee.split(" ");
      expect(words, c.id).toHaveLength(2);
      expect(FIRST_NAMES, c.id).toContain(words[0]);
      expect(LAST_NAMES, c.id).toContain(words[1]);
      expect(Object.keys(c.leans), c.id).toEqual([...CREW_FAMILIES]);
      for (const f of CREW_FAMILIES) expect(Number.isInteger(c.leans[f]) && c.leans[f] >= 0 && c.leans[f] <= 100, `${c.id} ${f}`).toBe(true);
    }
    for (const f of CREW_FAMILIES) {
      const mean = block.crews.reduce((a, c) => a + c.leans[f], 0) / block.crews.length;
      expect(Math.abs(mean - 50), f).toBeLessThanOrEqual(0.5);
    }
    expect(crewsProblem(block.crews, { block: block.season, file: file.season })).toBeUndefined();
  });

  it("were made with today's method and the spread STANDIN_SPREAD names (re-run standin-officials if this fails)", () => {
    const msg = "the league file's crews were made with another method or spread: re-run standin-officials";
    expect(block.method.spread, msg).toBe(STANDIN_SPREAD);
    expect(JSON.parse(JSON.stringify(block.method)), msg).toEqual(JSON.parse(JSON.stringify(officiatingMethod(file.season, STANDIN_SPREAD))));
  });

  it("sit in their place: after picksSource and just before startingDevelopment, which stays last", () => {
    expect(Object.keys(file)).toEqual([
      "format", "season", "snapshotDate", "league", "contracts", "deadMoney", "picks", "picksSource", "officiating", "startingDevelopment",
    ]);
  });

  it("are all the step added: taking the block off gives back the file before it, to the byte", () => {
    const { officiating: _o, ...before } = JSON.parse(text) as LeagueFileLike;
    expect(sha256(serializeLeagueFile(before))).toBe(FILE_BEFORE_OFFICIALS_SHA256);
  });

  it("record their numbers consistently: each family's τ RMS is the root of its seasons' mean τ², and the written leans' SD is the one recorded", () => {
    for (const f of CREW_FAMILIES) {
      const m = block.measured[f];
      expect(m.tau, f).toHaveLength(3);
      // Every recorded value is rounded to 3 places, so the two sides can differ by 0.001 at most.
      const rms = Math.sqrt(m.tau.reduce((a, t) => a + t * t, 0) / m.tau.length);
      expect(Math.abs(m.tauRms - rms), f).toBeLessThanOrEqual(0.001);
      const leans = block.crews.map((c) => c.leans[f]);
      const mean = leans.reduce((a, x) => a + x, 0) / leans.length;
      const sd = Math.sqrt(leans.reduce((a, x) => a + (x - mean) ** 2, 0) / leans.length);
      expect(m.sd[block.method.spread], f).toBe(Math.round(sd * 1000) / 1000);
    }
  });

  it("hold no gsis-like or pfr-like id and no key named official_id", () => {
    const json = JSON.stringify(block);
    expect(json).not.toMatch(/\d{2}-\d{7}/); // gsis-like, as in standinDevelopment.test.ts's "holds no real-player ids"
    expect(json).not.toMatch(/[A-Z][A-Za-z.']{3}[A-Z][A-Za-z.']\d{2}/); // pfr-like, as in the same test
    const keys: string[] = [];
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === "object" && v !== null) for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); }
    };
    walk(block);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).not.toContain("official_id");
  });
});
