import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ATTRIBUTE_REGISTRY_V1, createRng, teamId, type PlayerState, type Position, type RatedLeague, type Team } from "@ff/contracts";
import {
  drawRookieAge, generateLeagueRosters, overallAt, ROOKIE_AGE, ROOKIE_YEARS_PAST_DRAFT, ROSTER_SHAPE, ROSTER_SIZE, type FictionalProvenance,
} from "../src/index.js";
import { gauss, measure, SLOT_TALENT } from "../src/fictional/generate.js";

const teams: Team[] = Array.from({ length: 32 }, (_, i) => ({
  id: teamId(`T${String(i + 1).padStart(2, "0")}`),
  displayName: `Team ${i + 1}`,
  city: `City ${i + 1}`,
  roster: [],
  staff: [],
  depthChart: {},
  capState: { capLimit: 255_000_000, committed: 0, deadMoney: 0 },
  staffBudget: { limit: 0, committed: 0 },
}));

const league = generateLeagueRosters({ seed: "rosters-1", season: 2027, teams });
const byId = new Map(league.players.map((p) => [String(p.bio.id), p]));
const active = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((a) => a.status === "active").map((a) => String(a.id));

function starters(position: Position, n = 1): PlayerState[] {
  return league.teams.flatMap((t) => (t.depthChart[position] ?? []).slice(0, n).map((id) => byId.get(String(id))!));
}
const avg = (players: PlayerState[], attr: string) =>
  players.reduce((s, p) => s + p.attributes.values[attr]!, 0) / players.length;

describe("generateLeagueRosters (ADR-079)", () => {
  it("fills every team with a 53-man roster shaped like ROSTER_SHAPE", () => {
    expect(ROSTER_SIZE).toBe(53);
    expect(league.players).toHaveLength(32 * 53);
    for (const t of league.teams) {
      expect(t.roster).toHaveLength(53);
      for (const [pos, n] of Object.entries(ROSTER_SHAPE)) expect(t.depthChart[pos as Position]).toHaveLength(n);
      expect(new Set(Object.values(t.depthChart).flat().map(String))).toEqual(new Set(t.roster.map(String)));
    }
  });

  it("keeps each team's identity and only replaces roster and depth chart", () => {
    league.teams.forEach((t, i) => {
      const { roster: _r, depthChart: _d, ...rest } = t;
      const { roster: _r0, depthChart: _d0, ...rest0 } = teams[i]!;
      expect(rest).toEqual(rest0);
    });
  });

  it("gives every player every active rating, a whole number on 0-99 (absolute ratings, Q3)", () => {
    const bad: string[] = [];
    for (const p of league.players) {
      for (const id of active) {
        const v = p.attributes.values[id];
        if (v === undefined || !Number.isInteger(v) || v < 0 || v > 99) bad.push(`${String(p.bio.id)} ${id}=${v}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("uses one scale for every position: a lineman is slow and cannot catch, a corner is fast", () => {
    expect(avg(starters("LT"), "speed")).toBeLessThan(40);
    expect(avg(starters("CB", 3), "speed")).toBeGreaterThan(75);
    expect(avg(starters("LT"), "catching")).toBeLessThan(35);
    expect(avg(starters("WR", 3), "catching")).toBeGreaterThan(55);
    expect(avg(starters("DT", 2), "strength")).toBeGreaterThan(avg(starters("CB", 3), "strength") + 20);
  });

  it("pins speed to the forty: a faster forty never gives a lower speed", () => {
    const m = (league.provenance as FictionalProvenance).measurements;
    const pairs = league.players.map((p) => [m[String(p.bio.id)]!.forty, p.attributes.values.speed!] as const);
    pairs.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < pairs.length; i++) expect(pairs[i]![1]).toBeLessThanOrEqual(pairs[i - 1]![1]);
  });

  it("makes stars rare: a 90 at a core rating is a top-of-the-league player (Q4)", () => {
    const accuracy = league.players.filter((p) => p.bio.position === "QB").map((p) => p.attributes.values.accuracy!);
    const elite = accuracy.filter((v) => v >= 90).length;
    expect(elite).toBeGreaterThanOrEqual(1);
    expect(elite).toBeLessThanOrEqual(8);
    expect(avg(starters("QB"), "accuracy")).toBeGreaterThan(60);
    expect(avg(starters("QB"), "accuracy")).toBeLessThan(75);
  });

  it("orders each depth chart best first by the position's overall (Q5)", () => {
    for (const t of league.teams) {
      for (const [pos, ids] of Object.entries(t.depthChart) as [Position, typeof t.roster][]) {
        const o = ids.map((id) => overallAt(pos, byId.get(String(id))!.attributes.values));
        for (let i = 1; i < o.length; i++) expect(o[i]).toBeLessThanOrEqual(o[i - 1]!);
      }
    }
  });

  it("gives starters better players than backups on average", () => {
    const first = league.teams.map((t) => overallAt("QB", byId.get(String(t.depthChart.QB![0]))!.attributes.values));
    const second = league.teams.map((t) => overallAt("QB", byId.get(String(t.depthChart.QB![1]))!.attributes.values));
    expect(first.reduce((a, b) => a + b) / 32).toBeGreaterThan(second.reduce((a, b) => a + b) / 32 + 5);
  });

  it("names every player uniquely, with a bio that fits his position", () => {
    expect(new Set(league.players.map((p) => p.bio.displayName)).size).toBe(league.players.length);
    expect(new Set(league.players.map((p) => String(p.bio.id))).size).toBe(league.players.length);
    for (const p of league.players) {
      expect(p.bio.age).toBeGreaterThanOrEqual(21);
      expect(p.bio.age).toBeLessThanOrEqual(36);
      expect(p.attributes.traits.size).toBe(0);
      expect(p.teamId).toBeDefined();
    }
    expect(avg(starters("LT"), "strength")).toBeGreaterThan(60);
    const lt = starters("LT")[0]!.bio;
    expect(lt.weightLb).toBeGreaterThan(270);
  });

  it("records each team's hidden strength, spread by teamStrengthSd (Q2)", () => {
    const p = league.provenance as FictionalProvenance;
    expect(Object.keys(p.teamStrength)).toHaveLength(32);
    const flat = generateLeagueRosters({ seed: "rosters-1", season: 2027, teams, teamStrengthSd: 0 });
    expect(Object.values((flat.provenance as FictionalProvenance).teamStrength).every((s) => s === 0)).toBe(true);
  });

  it("is deterministic: same seed, same league; another seed, other players", () => {
    const strip = (l: RatedLeague) => JSON.stringify(l, (_k, v) => (v instanceof Set ? [...v] : v));
    expect(strip(generateLeagueRosters({ seed: "rosters-1", season: 2027, teams }))).toBe(strip(league));
    const other = generateLeagueRosters({ seed: "rosters-2", season: 2027, teams });
    expect(other.players.map((p) => p.bio.displayName)).not.toEqual(league.players.map((p) => p.bio.displayName));
  });
});

// --- ADR-087 §12.5 and §12.2.6 (AB4): the made-up league's ages with growth on and aging "ability" ---

describe("the made-up league's ages under aging \"ability\" (ADR-087 §12.5, §12.2.6; AB4)", () => {
  const KICKING = new Set<Position>(["K", "P", "LS"]);
  const SEASON = 2027;
  const leagues = Array.from({ length: 20 }, (_, k) => `ages-${k + 1}`).map((seed) => ({
    seed,
    ability: generateLeagueRosters({ seed, season: SEASON, teams, development: true, aging: "ability" }),
    position: generateLeagueRosters({ seed, season: SEASON, teams, development: true, aging: "position" }),
    off: generateLeagueRosters({ seed, season: SEASON, teams }),
  }));
  /** Each man under "ability" beside himself under "position" (the same ids, in the same order). */
  const pairs = leagues.flatMap((l) => l.ability.players.map((a, i) => ({ a, p: l.position.players[i]! })));
  const rookie = (p: PlayerState) => p.bio.creditedSeasons === 0;
  const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  it("pairs each man with himself: the same id, name and position under either option", () => {
    expect(pairs).toHaveLength(20 * 32 * 53);
    for (const { a, p } of pairs) {
      expect(String(a.bio.id)).toBe(String(p.bio.id));
      expect(a.bio.displayName).toBe(p.bio.displayName);
    }
  });

  it("keeps the specialists' two years on the position path (the default and \"position\"): K, P and LS are 23 or older", () => {
    for (const l of leagues) {
      for (const league of [l.position, l.off]) {
        const kicking = league.players.filter((p) => KICKING.has(p.bio.position));
        expect(kicking.every((p) => p.bio.age >= 23)).toBe(true);
        expect(league.players.some((p) => !KICKING.has(p.bio.position) && p.bio.age === 21)).toBe(true);
      }
      // Growth off, the option does nothing: the league is today's to the byte.
      const strip = (x: RatedLeague) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
      expect(strip(generateLeagueRosters({ seed: l.seed, season: SEASON, teams, aging: "ability" }))).toBe(strip(l.off));
    }
    const kickingP = pairs.filter(({ p }) => KICKING.has(p.bio.position)).map(({ p }) => p.bio.age);
    const othersP = pairs.filter(({ p }) => !KICKING.has(p.bio.position)).map(({ p }) => p.bio.age);
    expect(mean(kickingP) - mean(othersP)).toBeGreaterThan(1.5);
  });

  it("drops the specialists' two years under \"ability\": an older man keeps today's draw, a specialist two years younger", () => {
    for (const { a, p } of pairs) {
      if (rookie(a)) continue;
      const id = String(a.bio.id);
      if (KICKING.has(p.bio.position)) {
        // Today's 36 is a cap (min(36, 23 + draw)): without the two years the same draw may give 34 to 36.
        if (p.bio.age < 36) expect(a.bio.age, id).toBe(p.bio.age - 2);
        else expect(a.bio.age >= 34 && a.bio.age <= 36, id).toBe(true);
        // His draft line comes from his age: as many seasons later, the same round and pick.
        if (typeof p.bio.draft === "object") expect(a.bio.draft, id).toEqual({ ...p.bio.draft, year: p.bio.draft.year + (p.bio.age - a.bio.age) });
        else expect(a.bio.draft, id).toBe(p.bio.draft);
      } else {
        expect(a.bio.age, id).toBe(p.bio.age);
        expect(a.bio.draft, id).toEqual(p.bio.draft);
        expect(a.attributes.development!.snaps, id).toBe(p.attributes.development!.snaps);
      }
      expect(a.bio.age, id).toBeGreaterThanOrEqual(23);
      expect(a.bio.creditedSeasons, id).toBeUndefined();
    }
    // So no position shows in the ages: K, P and LS run as old as everyone else.
    const kicking = pairs.filter(({ a }) => KICKING.has(a.bio.position)).map(({ a }) => a.bio.age);
    const others = pairs.filter(({ a }) => !KICKING.has(a.bio.position)).map(({ a }) => a.bio.age);
    expect(kicking.length).toBeGreaterThan(1900);
    expect(Math.abs(mean(kicking) - mean(others))).toBeLessThan(0.3);
  });

  it("makes the rookies-to-be the men today's draw leaves at 22 or under (24 at K, P, LS), with no credited seasons", () => {
    for (const { a, p } of pairs) {
      const id = String(a.bio.id);
      const today = p.bio.age - (KICKING.has(p.bio.position) ? 2 : 0);
      expect(rookie(a), id).toBe(today <= 22);
      if (!rookie(a)) continue;
      // Drafted this season, or undrafted, with the round and pick today's draw gives; no snaps played yet.
      if (typeof p.bio.draft === "object") expect(a.bio.draft, id).toEqual({ ...p.bio.draft, year: SEASON });
      else expect(a.bio.draft, id).toBe("UDFA");
      expect(a.attributes.development!.snaps, id).toBe(0);
      expect(a.bio.age >= 21 && a.bio.age <= 26, id).toBe(true);
    }
  });

  it("gives the rookies-to-be the draft class's ages a year past draft day: within ±1 pt of each share", () => {
    const ages = pairs.filter(({ a }) => rookie(a)).map(({ a }) => a.bio.age);
    expect(ages.length).toBeGreaterThan(10_000);
    for (const { age, share } of ROOKIE_AGE.draftDay) {
      const got = ages.filter((x) => x === age + ROOKIE_YEARS_PAST_DRAFT).length / ages.length;
      expect(Math.abs(got - share), `age ${age + ROOKIE_YEARS_PAST_DRAFT}: ${got}`).toBeLessThan(0.01);
    }
    expect(ROOKIE_YEARS_PAST_DRAFT).toBe(1);
    // Each from his own development stream's "age" fork, against his talent's own draw, exactly. His slot
    // (the generator's, before the depth sort) is recovered: each slot's stream is replayed as the
    // generator draws it (his talent's own draw, then his measurements, which read his talent), and his
    // slot is the one whose measurements are his (the league's provenance), one slot each.
    const l = leagues[0]!.ability;
    const prov = l.provenance as FictionalProvenance;
    const root = createRng("ages-1", "attributes:fictional");
    const byId = new Map(l.players.map((p) => [String(p.bio.id), p]));
    let checked = 0;
    for (const t of l.teams) {
      const key = String(t.id);
      for (const position of Object.keys(ROSTER_SHAPE) as Position[]) {
        const slots = Array.from({ length: ROSTER_SHAPE[position] }, (_, slot) => {
          const rng = root.fork(`${key}/${position}/${slot}`);
          const talentZ = gauss(rng);
          const talent = prov.teamStrength[key]! + (SLOT_TALENT[slot] ?? SLOT_TALENT[SLOT_TALENT.length - 1]!) + talentZ;
          return { talentZ, measurements: JSON.stringify(measure(rng, position, talent)) };
        });
        for (const id of t.depthChart[position]!) {
          const mine = slots.filter((s) => s.measurements === JSON.stringify(prov.measurements[String(id)]));
          expect(mine, String(id)).toHaveLength(1);
          const p = byId.get(String(id))!;
          if (!rookie(p)) continue;
          const e = root.fork(`development/${String(id)}`).fork("age");
          expect(p.bio.age, String(id)).toBe(drawRookieAge(e, mine[0]!.talentZ) + ROOKIE_YEARS_PAST_DRAFT);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  it("runs the less talented rookies-to-be older: the undrafted ones are older than those drafted", () => {
    const rookies = pairs.filter(({ a }) => rookie(a)).map(({ a }) => a);
    const udfa = rookies.filter((p) => p.bio.draft === "UDFA").map((p) => p.bio.age);
    const drafted = rookies.filter((p) => p.bio.draft !== "UDFA").map((p) => p.bio.age);
    expect(udfa.length).toBeGreaterThan(1000);
    expect(mean(udfa) - mean(drafted)).toBeGreaterThan(0.3);
    // On the position path today's rookies do not follow talent this way.
    const todays = pairs.filter(({ a }) => rookie(a)).map(({ p }) => p);
    const nonKicking = (ps: PlayerState[]) => ps.filter((p) => !KICKING.has(p.bio.position));
    const u0 = nonKicking(todays.filter((p) => p.bio.draft === "UDFA")).map((p) => p.bio.age);
    const d0 = nonKicking(todays.filter((p) => p.bio.draft !== "UDFA")).map((p) => p.bio.age);
    expect(Math.abs(mean(u0) - mean(d0))).toBeLessThan(0.1);
  });

  it("reads no position on the ability path (the owner's rule): its age code names none", () => {
    const src = readFileSync(join(__dirname, "..", "src", "fictional", "generate.ts"), "utf8");
    const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    /** A declaration's text: a function to its closing brace, a one-line const to its semicolon. */
    const fn = (name: string) => {
      const at = src.indexOf(name);
      expect(at, name).toBeGreaterThan(0);
      return strip(src.slice(at, name.startsWith("function") ? src.indexOf("\n}\n", at) + 2 : src.indexOf(";\n", at) + 1));
    };
    for (const code of [fn("function abilityAge("), fn("const ageSpread ="), fn("const ENTRY_AGE =")]) {
      expect(code).not.toMatch(/position|POSITION|specialist|bio\b|"K"|"P"|"LS"/);
    }
    // The ability path's own age reads only the unlisted draw: `unlistedAge` is today's draw with no position term.
    expect(src).toMatch(/const unlistedAge = Math\.min\(36, 21 \+ spread\);/);
  });

  it("moves nothing else: with the ages and what follows from them taken off, every field is \"position\"'s", () => {
    const nonAge = (p: PlayerState) => {
      const { age: _a, creditedSeasons: _c, draft, ...bio } = p.bio;
      const { fadeShift: _f, snaps: _s, ...development } = p.attributes.development!;
      return { ...p, bio: { ...bio, draft: typeof draft === "object" ? { round: draft.round, pick: draft.pick } : draft }, attributes: { ...p.attributes, development } };
    };
    const strip = (x: unknown) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
    for (const l of leagues.slice(0, 5)) {
      expect(strip({ ...l.ability, players: l.ability.players.map(nonAge) })).toBe(strip({ ...l.position, players: l.position.players.map(nonAge) }));
    }
    // Same seed, same league; fewer teams moves no one's age.
    const again = generateLeagueRosters({ seed: "ages-1", season: SEASON, teams, development: true, aging: "ability" });
    expect(strip(again)).toBe(strip(leagues[0]!.ability));
    const four = generateLeagueRosters({ seed: "ages-1", season: SEASON, teams: teams.slice(0, 4), development: true, aging: "ability" });
    const ageOf = new Map(leagues[0]!.ability.players.map((p) => [String(p.bio.id), p.bio.age]));
    for (const p of four.players) expect(p.bio.age).toBe(ageOf.get(String(p.bio.id)));
  });
});
