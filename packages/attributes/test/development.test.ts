import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  agilityFromCone, attrId, createRng, getAttr, jumpingFromVertical, playerId, speedFromForty, strengthFrom, teamId,
  type PlayerBio, type PlayerState, type Team,
} from "@ff/contracts";
import { generateLeagueRosters, type FictionalProvenance, type GenerateLeagueInput } from "../src/fictional/generate.js";
import { generateDraftClass, type GenerateDraftClassInput } from "../src/fictional/draftClass.js";
import {
  CAREER_SNAPS, GROWTH, PATIENCE_SEASONS, careerSnaps, drawGrowth, drawPatience, seasonsPlayed, withDevelopment,
} from "../src/fictional/development.js";

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

const json = (x: unknown) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
const hash = (x: unknown) => createHash("sha256").update(json(x)).digest("hex");

const LEAGUE: GenerateLeagueInput = { seed: "rosters-1", season: 2027, teams };
const LEAGUE_2: GenerateLeagueInput = { seed: "dev-hash-2", season: 2031, teams: teams.slice(0, 4), teamStrengthSd: 0.3 };
const CLASS: GenerateDraftClassInput = { seed: "w", draft: 2027 };
const CLASS_2: GenerateDraftClassInput = { seed: "dev-hash-2", draft: 2031, size: 300, usedNames: new Set(["A B"]) };

/**
 * sha256 of each input's whole output (Sets as arrays), computed from the code BEFORE the development
 * option was added (generate.ts and draftClass.ts as of 1ec3e9a). With the option off they must not move.
 * The two draft-class pins were moved once, on purpose, by ADR-086 D7's prospect retune (PROSPECT_TALENT).
 */
const BEFORE = {
  league: "faed695b63eb7a2a4f7cc6b48f09849006450adef030b4b7178c0a81de9d2b5c",
  league2: "b1f29101c82b5584806eb4db77038c5bf5e72ba3c312959f53d4a5b684cfd0e0",
  draftClass: "1c308980e9b7de987fe57ee23065525acf9157ce716e9b95f0518f0effdbd7f5",
  draftClass2: "05931e4f055edca36ad25118c485e05ecef54de6fa9322c368bdef328169ec25",
} as const;

/** A player with ADR-087's new fields taken off: what the development option adds, removed. */
function strip(p: PlayerState): PlayerState {
  const { development: _d, ...attributes } = p.attributes;
  const { patience: _p, ...personality } = p.personality;
  const { combine: _c, ...bio } = p.bio;
  return { ...p, bio, attributes, personality };
}

const off = generateLeagueRosters(LEAGUE);
const on = generateLeagueRosters({ ...LEAGUE, development: true });
const classOff = generateDraftClass(CLASS);
const classOn = generateDraftClass({ ...CLASS, development: true });

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: readonly number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

describe("development off: the league and the draft class are byte-identical to before (ADR-087 inertness)", () => {
  it("hashes the generated league the same as before the change", () => {
    expect(hash(off)).toBe(BEFORE.league);
    expect(hash(generateLeagueRosters({ ...LEAGUE, development: false }))).toBe(BEFORE.league);
    expect(hash(generateLeagueRosters(LEAGUE_2))).toBe(BEFORE.league2);
  });

  it("hashes the draft class the same as before the change", () => {
    expect(hash(classOff)).toBe(BEFORE.draftClass);
    expect(hash(generateDraftClass({ ...CLASS, development: false }))).toBe(BEFORE.draftClass);
    expect(hash(generateDraftClass(CLASS_2))).toBe(BEFORE.draftClass2);
  });

  it("adds none of the new fields", () => {
    for (const p of [...off.players, ...classOff.players]) {
      expect(p.attributes.development).toBeUndefined();
      expect(p.personality.patience).toBeUndefined();
      expect(p.bio.combine).toBeUndefined();
    }
  });
});

describe("development on: only the new fields differ (ADR-087 P1, P2, P6)", () => {
  it("leaves the league identical once the new fields are taken off: names, ratings, ages, depth charts", () => {
    expect(hash({ ...on, players: on.players.map(strip) })).toBe(BEFORE.league);
    const on2 = generateLeagueRosters({ ...LEAGUE_2, development: true });
    expect(hash({ ...on2, players: on2.players.map(strip) })).toBe(BEFORE.league2);
  });

  it("leaves the draft class identical once the new fields are taken off", () => {
    expect(hash({ ...classOn, players: classOn.players.map(strip) })).toBe(BEFORE.draftClass);
    const on2 = generateDraftClass({ ...CLASS_2, development: true });
    expect(hash({ ...on2, players: on2.players.map(strip) })).toBe(BEFORE.draftClass2);
  });

  it("gives every league player a development record: growth, career snaps, no carry yet, his body; and patience", () => {
    const m = (on.provenance as FictionalProvenance).measurements;
    for (const p of on.players) {
      const dev = p.attributes.development!;
      const drills = m[String(p.bio.id)]!;
      expect(dev.growth).toBeGreaterThan(0);
      expect(Number.isFinite(dev.growth)).toBe(true);
      expect(Number.isInteger(dev.snaps)).toBe(true);
      expect(dev.snaps).toBeGreaterThanOrEqual(0);
      expect(dev.carry).toEqual({});
      expect(dev.body).toEqual({ forty: drills.forty, cone: drills.cone, vertical: drills.vertical, bench: drills.bench });
      expect(p.personality.patience).toBeGreaterThanOrEqual(PATIENCE_SEASONS.min);
      expect(p.personality.patience).toBeLessThanOrEqual(PATIENCE_SEASONS.max);
      // The public combine record is a prospect's (P2); a generated veteran has none.
      expect(p.bio.combine).toBeUndefined();
    }
  });

  it("gives him the body his body ratings were made from, so his ratings and his 40 agree (ADR-079)", () => {
    for (const p of on.players) {
      const body = p.attributes.development!.body;
      const v = p.attributes.values;
      expect(speedFromForty(body.forty)).toBe(getAttr(v, attrId("speed")));
      expect(agilityFromCone(body.cone)).toBe(getAttr(v, attrId("agility")));
      expect(jumpingFromVertical(body.vertical)).toBe(getAttr(v, attrId("jumping")));
      expect(strengthFrom(body.bench, p.bio.weightLb)).toBe(getAttr(v, attrId("strength")));
    }
  });

  it("gives each player his own growth rate", () => {
    const growth = on.players.map((p) => p.attributes.development!.growth);
    expect(new Set(growth).size).toBe(growth.length);
  });

  it("credits snaps by the seasons his own draft line gives him: none for a rookie (§2.5), some for every veteran", () => {
    // Read straight from the bio, not through `seasonsPlayed`: the draft year the generator wrote.
    let rookies = 0;
    let veterans = 0;
    for (const p of on.players) {
      const d = p.bio.draft;
      const snaps = p.attributes.development!.snaps;
      if (typeof d === "object" && d.year === LEAGUE.season) {
        rookies++;
        expect(snaps).toBe(0);
      } else if (typeof d === "object" && d.year < LEAGUE.season) {
        veterans++;
        expect(snaps).toBeGreaterThan(0);
      }
    }
    expect(rookies).toBeGreaterThan(100);
    expect(veterans).toBeGreaterThan(100);
    // A kicker, punter or long snapper the generator says was drafted last year has played a season.
    const specialists = on.players.filter((p) =>
      ["K", "P", "LS"].includes(p.bio.position) && typeof p.bio.draft === "object" && p.bio.draft.year === LEAGUE.season - 1);
    expect(specialists.length).toBeGreaterThan(0);
    for (const p of specialists) expect(p.attributes.development!.snaps).toBeGreaterThan(0);
  });

  it("credits more snaps a season to starters than to depth", () => {
    const byId = new Map(on.players.map((p) => [String(p.bio.id), p]));
    const perSeason = (depth: number) => on.teams.flatMap((t) => {
      const p = byId.get(String(t.depthChart.CB![depth]))!;
      const seasons = seasonsPlayed(p.bio, LEAGUE.season);
      return seasons === 0 ? [] : [p.attributes.development!.snaps / seasons];
    });
    expect(mean(perSeason(0))).toBeGreaterThan(mean(perSeason(5)) + 150);
  });

  it("gives every prospect growth, his body, no snaps, patience and his combine drills on his bio (P2)", () => {
    for (const p of classOn.players) {
      const dev = p.attributes.development!;
      const drills = classOn.combine[String(p.bio.id)]!;
      const four = { forty: drills.forty, cone: drills.cone, vertical: drills.vertical, bench: drills.bench };
      expect(dev.growth).toBeGreaterThan(0);
      expect(dev.snaps).toBe(0);
      expect(dev.carry).toEqual({});
      expect(dev.body).toEqual(four);
      expect(p.bio.combine).toEqual(four);
      // The public record is frozen: aging moves the body, never the combine, so they are separate objects.
      expect(p.bio.combine).not.toBe(dev.body);
      expect(p.personality.patience).toBeGreaterThanOrEqual(PATIENCE_SEASONS.min);
      expect(p.personality.patience).toBeLessThanOrEqual(PATIENCE_SEASONS.max);
    }
  });

  it("is deterministic: same seed, same development", () => {
    expect(json(generateLeagueRosters({ ...LEAGUE, development: true }))).toBe(json(on));
    expect(json(generateDraftClass({ ...CLASS, development: true }))).toBe(json(classOn));
  });

  it("draws each player's development from his own stream: fewer teams or a smaller class moves no one else's", () => {
    const dev = (p: PlayerState) => json({ d: p.attributes.development, patience: p.personality.patience });
    const four = generateLeagueRosters({ ...LEAGUE, teams: teams.slice(0, 4), development: true });
    const full = new Map(on.players.map((p) => [String(p.bio.id), dev(p)]));
    expect(four.players.length).toBeGreaterThan(0);
    for (const p of four.players) expect(dev(p)).toBe(full.get(String(p.bio.id)));

    const small = generateDraftClass({ ...CLASS, size: 120, development: true });
    small.players.forEach((p, i) => expect(dev(p)).toBe(dev(classOn.players[i]!)));
  });
});

describe("the development draws (ADR-087 §2.1, §2.5, §6.1)", () => {
  it("drawGrowth: lognormal, median 1, sd(log) about 0.25, always positive", () => {
    const rng = createRng("growth-test", "draws");
    const xs = Array.from({ length: 20_000 }, () => drawGrowth(rng));
    const sorted = [...xs].sort((a, b) => a - b);
    expect(sorted[0]!).toBeGreaterThan(0);
    expect(sorted[xs.length / 2]!).toBeGreaterThan(GROWTH.median * 0.97);
    expect(sorted[xs.length / 2]!).toBeLessThan(GROWTH.median * 1.03);
    const logSd = sd(xs.map(Math.log));
    expect(logSd).toBeGreaterThan(GROWTH.sdLog * 0.95);
    expect(logSd).toBeLessThan(GROWTH.sdLog * 1.05);
    expect(drawGrowth(createRng("g", "x"))).toBe(drawGrowth(createRng("g", "x")));
  });

  it("drawPatience: flat between none and two seasons, to two decimals like franchise's own draw", () => {
    const rng = createRng("patience-test", "draws");
    const xs = Array.from({ length: 20_000 }, () => drawPatience(rng));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(2);
    expect(mean(xs)).toBeGreaterThan(0.97);
    expect(mean(xs)).toBeLessThan(1.03);
    for (const x of xs) expect(Math.abs(x * 100 - Math.round(x * 100))).toBeLessThan(1e-9);
    // Flat: each half of the range holds about half the draws.
    const low = xs.filter((x) => x < 1).length / xs.length;
    expect(low).toBeGreaterThan(0.48);
    expect(low).toBeLessThan(0.52);
  });

  it("seasonsPlayed: read from his bio the way franchise's seasonsIn reads it", () => {
    const bio = (age: number, draft: PlayerBio["draft"], creditedSeasons?: number): PlayerBio => ({
      id: playerId("x"), displayName: "X", position: "QB", age, heightIn: 74, weightLb: 220, draft,
      ...(creditedSeasons === undefined ? {} : { creditedSeasons }),
    });
    const pick = (year: number) => ({ year, round: 1, pick: 1 });
    expect(seasonsPlayed(bio(22, pick(2027)), 2027)).toBe(0); // drafted this season: a rookie
    expect(seasonsPlayed(bio(21, pick(2027)), 2027)).toBe(0);
    expect(seasonsPlayed(bio(26, pick(2023)), 2027)).toBe(4);
    expect(seasonsPlayed(bio(26, pick(2030)), 2027)).toBe(0); // never below 0
    expect(seasonsPlayed(bio(22, "UDFA"), 2027)).toBe(0);
    expect(seasonsPlayed(bio(27, "UDFA"), 2027)).toBe(5);
    expect(seasonsPlayed(bio(30, pick(2020), 3), 2027)).toBe(3); // credited seasons win when kept
    expect(seasonsPlayed(bio(23, "PROSPECT"), 2027)).toBe(0);
    expect(seasonsPlayed(bio(23, "PROSPECT", 2), 2027)).toBe(0);
  });

  it("careerSnaps: about 800 a season in a starter slot, 300 in slot two, 100 deeper, with a little noise", () => {
    const rng = createRng("snaps-test", "draws");
    const perSeason = (slot: number) => mean(Array.from({ length: 4_000 }, () => careerSnaps(rng, 5, slot) / 5));
    const near = (got: number, want: number) => {
      expect(got).toBeGreaterThan(want * 0.93);
      expect(got).toBeLessThan(want * 1.1);
    };
    near(perSeason(0), CAREER_SNAPS.perSeasonBySlot[0]);
    near(perSeason(1), CAREER_SNAPS.perSeasonBySlot[1]);
    near(perSeason(2), CAREER_SNAPS.perSeasonBySlot[2]);
    near(perSeason(5), CAREER_SNAPS.perSeasonBySlot[2]);
    expect(careerSnaps(rng, 0, 0)).toBe(0);
    expect(careerSnaps(rng, -1, 0)).toBe(0);
    // Noise is small: a whole league of five-season starters stays within about ±50% of 800 a season.
    const xs = Array.from({ length: 4_000 }, () => careerSnaps(rng, 5, 0) / 5);
    expect(Math.min(...xs)).toBeGreaterThan(CAREER_SNAPS.perSeasonBySlot[0] * 0.4);
    expect(Math.max(...xs)).toBeLessThan(CAREER_SNAPS.perSeasonBySlot[0] * 2.2);
  });

  it("withDevelopment does not change the player it is given", () => {
    const p = off.players[0]!;
    const before = json(p);
    const measurements = (off.provenance as FictionalProvenance).measurements[String(p.bio.id)]!;
    const drills = json(measurements);
    const out = withDevelopment(p, createRng("w", "x"), { measurements, career: { slot: 0, season: LEAGUE.season } });
    expect(json(p)).toBe(before);
    expect(json(measurements)).toBe(drills);
    expect(out).not.toBe(p);
    expect(out.attributes.values).toBe(p.attributes.values);
    expect(out.attributes.development).toBeDefined();
    // His body is a copy of the drills, never the provenance record itself.
    expect(out.attributes.development!.body).not.toBe(measurements);

    const q = classOff.players[0]!;
    const qBefore = json(q);
    const qOut = withDevelopment(q, createRng("w", "y"), { measurements: classOff.combine[String(q.bio.id)]! });
    expect(json(q)).toBe(qBefore);
    expect(qOut.bio).not.toBe(q.bio);
    expect(qOut.attributes.development!.snaps).toBe(0);
  });
});
