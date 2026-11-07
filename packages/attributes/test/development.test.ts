import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  ABILITY_GROUPS, agilityFromCone, attrId, createRng, getAttr, jumpingFromVertical, playerId, speedFromForty, strengthFrom, teamId,
  type AbilityGroup, type PlayerBio, type PlayerState, type Team,
} from "@ff/contracts";
import { generateLeagueRosters, type FictionalProvenance, type GenerateLeagueInput } from "../src/fictional/generate.js";
import { generateDraftClass, type GenerateDraftClassInput } from "../src/fictional/draftClass.js";
import { ROSTER_SHAPE } from "../src/fictional/shape.js";
import {
  CAREER_SNAPS, FADE_SHIFT, GROWTH, PATIENCE_SEASONS, careerSnaps, drawFadeShift, drawGrowth, drawPatience, seasonsPlayed, withDevelopment,
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

/**
 * sha256 of the growth-on draft classes with the new fields taken off: PROSPECT_TALENT_WITH_GROWTH's
 * ratings (ADR-087 D5b). Moves only when that class talent is retuned.
 */
const WITH_GROWTH = {
  draftClass: "ff63aaf6283e0010d0e0c7df5c2975dae3be331d2ddc3a43c22299b45684c161",
  draftClass2: "318b54e46fd31c9cb880fc0984e55afe11983a90fcb24d2182d8ba40c6a7655d",
} as const;

/**
 * sha256 of each input's whole growth-on output, records and all (growth, career snaps, body, patience,
 * combine), MEASURED at a7a6a66 (ADR-087 AB1, before AB2 added the aging option) and unchanged by AB2.
 * The default aging (absent or "position") must not move them (§12.2.7 test 5: "deep-equal to main"),
 * and "ability" with the fade shifts taken off gives them too. They move with WITH_GROWTH, or when a
 * development draw moves on purpose.
 */
const WITH_RECORDS = {
  league: "740c3d6b576b7670e5ccdb9fff9c099dc0da54dc2d706ee8e45af17adddd8ff3",
  league2: "000ffb6dc63675187f6419ce8dc59d8c013f579f1e0623b2d1e181cdbc506baa",
  draftClass: "58b21c0ecc83c6407bfff921cb76fea454619a786e2e0d68bdf4f5303bd934de",
  draftClass2: "a3096636270be64b5f34a1514667c1ac7c022ab951eb66fe7d85ce5e29028d65",
} as const;

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

  it("leaves the draft class's names, positions and ages as they are, and draws talent from the growth-on class", () => {
    // ADR-087 D5b (Rookies card): with growth on, talent comes from PROSPECT_TALENT_WITH_GROWTH, from
    // the same draw, so who is in the class does not move; only the ratings that follow from talent.
    const who = (c: typeof classOn) => c.players.map((p) => [String(p.bio.id), p.bio.displayName, p.bio.position, p.bio.age]);
    expect(who(classOn)).toEqual(who(classOff));
    const on2 = generateDraftClass({ ...CLASS_2, development: true });
    expect(who(on2)).toEqual(who(generateDraftClass(CLASS_2)));
    expect(classOn.draftClass).toEqual(classOff.draftClass);
    // A lower, wider class (PROSPECT_TALENT_WITH_GROWTH against PROSPECT_TALENT).
    const overall = (c: typeof classOn) => Object.values(c.overall);
    expect(mean(overall(classOn))).toBeLessThan(mean(overall(classOff)) - 3);
    expect(sd(overall(classOn))).toBeGreaterThan(sd(overall(classOff)) + 1.5);
    // Pinned, so a change to the growth-on class is a change on purpose (it needs the draft re-check).
    expect(hash({ ...classOn, players: classOn.players.map(strip) })).toBe(WITH_GROWTH.draftClass);
    expect(hash({ ...on2, players: on2.players.map(strip) })).toBe(WITH_GROWTH.draftClass2);
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

describe("each man's own fade shifts (ADR-087 §12.2.3, P7; AB2)", () => {
  /** The player with his fade shifts taken off, and nothing else. */
  const unshifted = (p: PlayerState): PlayerState => {
    const d = p.attributes.development;
    if (d === undefined) return p;
    const { fadeShift: _f, ...development } = d;
    return { ...p, attributes: { ...p.attributes, development } };
  };
  const body = FADE_SHIFT.body as readonly AbilityGroup[];
  /** sd of a standard normal clamped at ±zClamp: √E[min(z², zClamp²)], by numeric integration (≈ 0.9887 at 2.5). */
  const clampedSd = (() => {
    let e2 = 0;
    const h = 1e-4;
    for (let z = -8 + h / 2; z < 8; z += h) {
      const c = Math.max(-FADE_SHIFT.zClamp, Math.min(FADE_SHIFT.zClamp, z));
      e2 += c * c * Math.exp(-(z * z) / 2) / Math.sqrt(2 * Math.PI) * h;
    }
    return Math.sqrt(e2);
  })();
  const corr = (a: readonly number[], b: readonly number[]) => {
    const ma = mean(a), mb = mean(b);
    let ab = 0, aa = 0, bb = 0;
    for (let i = 0; i < a.length; i++) { ab += (a[i]! - ma) * (b[i]! - mb); aa += (a[i]! - ma) ** 2; bb += (b[i]! - mb) ** 2; }
    return ab / Math.sqrt(aa * bb);
  };
  // 20,000 men, each on his own stream, as the generator and the importer draw them.
  const draws = Array.from({ length: 20_000 }, (_, i) => drawFadeShift(createRng("fade-shift-test", "draws").fork(`p${i}`).fork("aging")));
  const column = (g: AbilityGroup) => draws.map((d) => d[g]);

  it("holds the CHOSEN table: the four body groups, ρ 0.5, the clamp at 2.5, the spreads, 2 decimals", () => {
    expect([...FADE_SHIFT.body]).toEqual(["SPEED", "QUICKNESS", "SPRING", "STRENGTH"]);
    expect(FADE_SHIFT.rho).toBe(0.5);
    expect(FADE_SHIFT.zClamp).toBe(2.5);
    expect(FADE_SHIFT.decimals).toBe(2);
    expect(Object.keys(FADE_SHIFT.sd)).toEqual([...ABILITY_GROUPS]);
    expect(FADE_SHIFT.sd).toEqual({
      SPEED: 1.5, QUICKNESS: 1.5, SPRING: 1.5, STRENGTH: 1.5, ARM: 2, LEG: 2,
      STAMINA: 1.5, DURABILITY: 1.5, TECHNIQUE: 1, PASSING: 1.5, KICKING: 1.5, SMARTS: 1.5,
    });
  });

  it("gives all 12 groups, in ABILITY_GROUPS order, each to 2 decimals and never −0", () => {
    const order = ABILITY_GROUPS.join();
    const bad = { order: 0, finite: 0, decimals: 0, negativeZero: 0, json: 0 };
    for (const d of draws) {
      if (Object.keys(d).join() !== order) bad.order++;
      for (const g of ABILITY_GROUPS) {
        const x = d[g];
        if (!Number.isFinite(x)) bad.finite++;
        if (Math.abs(x * 100 - Math.round(x * 100)) >= 1e-9) bad.decimals++;
        if (Object.is(x, -0)) bad.negativeZero++;
        if (!Object.is(JSON.parse(JSON.stringify(x)), x)) bad.json++;
      }
    }
    expect(bad).toEqual({ order: 0, finite: 0, decimals: 0, negativeZero: 0, json: 0 });
    // Zeros happen (a z within ±0.0033 of 0 rounds to 0), and each is +0.
    expect(draws.some((d) => ABILITY_GROUPS.some((g) => d[g] === 0))).toBe(true);
  });

  it("spreads each group by its sd (a little under, from the clamp), centered on 0", () => {
    for (const g of ABILITY_GROUPS) {
      const xs = column(g);
      const want = FADE_SHIFT.sd[g] * clampedSd;
      // One standard error of an sd over 20,000 is sd/√40,000 = 0.5% of it; the band is about 4 of them.
      expect(Math.abs(sd(xs) / want - 1), g).toBeLessThan(0.02);
      expect(Math.abs(mean(xs)), g).toBeLessThan(0.04 * FADE_SHIFT.sd[g]);
    }
    expect(clampedSd).toBeGreaterThan(0.985);
    expect(clampedSd).toBeLessThan(0.992);
  });

  it("shares one clock across the body groups: each pair correlates about 0.5, every other pair about 0", () => {
    for (let i = 0; i < ABILITY_GROUPS.length; i++) {
      for (let j = i + 1; j < ABILITY_GROUPS.length; j++) {
        const [a, b] = [ABILITY_GROUPS[i]!, ABILITY_GROUPS[j]!];
        const r = corr(column(a), column(b));
        if (body.includes(a) && body.includes(b)) expect(Math.abs(r - FADE_SHIFT.rho), `${a}-${b}`).toBeLessThan(0.03);
        else expect(Math.abs(r), `${a}-${b}`).toBeLessThan(0.03);
      }
    }
  });

  it("clamps the combined z at ±2.5: nothing lies past 2.5 sd, and the clamp binds about as often as a normal leaves it", () => {
    for (const g of ABILITY_GROUPS) {
      const bound = Math.round(FADE_SHIFT.zClamp * FADE_SHIFT.sd[g] * 100) / 100;
      const xs = column(g);
      expect(Math.max(...xs.map(Math.abs)), g).toBeLessThanOrEqual(bound);
      // P(|z| > 2.5) = 1.24% of a standard normal: about 248 of 20,000 sit on the bound.
      const at = xs.filter((x) => Math.abs(x) === bound).length / xs.length;
      expect(at, g).toBeGreaterThan(0.008);
      expect(at, g).toBeLessThan(0.017);
    }
  });

  it("is the same for the same seed, and never depends on what was drawn from the stream before", () => {
    const a = createRng("fade-same", "x");
    expect(drawFadeShift(a)).toEqual(drawFadeShift(createRng("fade-same", "x")));
    const used = createRng("fade-same", "x");
    for (let i = 0; i < 7; i++) used.next();
    expect(drawFadeShift(used)).toEqual(drawFadeShift(a));
    expect(drawFadeShift(createRng("fade-same", "y"))).not.toEqual(drawFadeShift(a));
    // Each group from its own fork, the clock from "clock": the layout §12.2.3 names.
    const r = createRng("fade-layout", "aging");
    const n = (x: ReturnType<typeof createRng>) => { const u = 1 - x.next(); const v = x.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const c = n(r.fork("clock"));
    const want = (g: AbilityGroup) => {
      const e = n(r.fork(g));
      const z = body.includes(g) ? Math.sqrt(0.5) * c + Math.sqrt(0.5) * e : e;
      const v = Math.round(FADE_SHIFT.sd[g] * Math.max(-2.5, Math.min(2.5, z)) * 100) / 100;
      return v === 0 ? 0 : v;
    };
    expect(drawFadeShift(r)).toEqual(Object.fromEntries(ABILITY_GROUPS.map((g) => [g, want(g)])));
  });

  it("reads nothing about the man: two men who differ only in their listed position get the same shifts", () => {
    const p = off.players[0]!;
    const measurements = (off.provenance as FictionalProvenance).measurements[String(p.bio.id)]!;
    const start = { measurements, career: { slot: 0, season: LEAGUE.season }, aging: "ability" as const };
    const asQb = withDevelopment({ ...p, bio: { ...p.bio, position: "QB" } }, createRng("no-position", "x"), start);
    const asK = withDevelopment({ ...p, bio: { ...p.bio, position: "K" } }, createRng("no-position", "x"), start);
    expect(asQb.attributes.development!.fadeShift).toBeDefined();
    expect(asQb.attributes.development!.fadeShift).toEqual(asK.attributes.development!.fadeShift);
    expect(asQb.attributes.development).toEqual(asK.attributes.development);
  });

  describe("in the generator and the draft class (the aging option)", () => {
    const ability = generateLeagueRosters({ ...LEAGUE, development: true, aging: "ability" });
    const classAbility = generateDraftClass({ ...CLASS, development: true, aging: "ability" });

    it("are drawn only with aging \"ability\": the default and \"position\" leave the league and the class as they were", () => {
      // As they were at a7a6a66, before the option: the whole growth-on output, pinned.
      expect(hash(on)).toBe(WITH_RECORDS.league);
      expect(hash(classOn)).toBe(WITH_RECORDS.draftClass);
      expect(hash(generateLeagueRosters({ ...LEAGUE_2, development: true }))).toBe(WITH_RECORDS.league2);
      expect(hash(generateDraftClass({ ...CLASS_2, development: true }))).toBe(WITH_RECORDS.draftClass2);
      expect(hash(generateLeagueRosters({ ...LEAGUE, development: true, aging: "position" }))).toBe(WITH_RECORDS.league);
      expect(hash(generateDraftClass({ ...CLASS, development: true, aging: "position" }))).toBe(WITH_RECORDS.draftClass);
      expect(hash(generateLeagueRosters({ ...LEAGUE_2, development: true, aging: "position" }))).toBe(WITH_RECORDS.league2);
      expect(hash(generateDraftClass({ ...CLASS_2, development: true, aging: "position" }))).toBe(WITH_RECORDS.draftClass2);
      expect(json(generateLeagueRosters({ ...LEAGUE, development: true, aging: "position" }))).toBe(json(on));
      expect(json(generateDraftClass({ ...CLASS, development: true, aging: "position" }))).toBe(json(classOn));
      for (const p of [...on.players, ...classOn.players]) expect(p.attributes.development!.fadeShift).toBeUndefined();
      // Development off: aging does nothing, so the league and class are today's to the byte.
      expect(hash(generateLeagueRosters({ ...LEAGUE, aging: "ability" }))).toBe(BEFORE.league);
      expect(hash(generateDraftClass({ ...CLASS, aging: "ability" }))).toBe(BEFORE.draftClass);
      expect(hash(generateDraftClass({ ...CLASS_2, aging: "ability" }))).toBe(BEFORE.draftClass2);
    });

    it("move no other stream: with the shifts taken off, the league and the class are the default's, every field", () => {
      expect(json({ ...ability, players: ability.players.map(unshifted) })).toBe(json(on));
      expect(json({ ...classAbility, players: classAbility.players.map(unshifted) })).toBe(json(classOn));
      const on2 = generateLeagueRosters({ ...LEAGUE_2, development: true });
      const ability2 = generateLeagueRosters({ ...LEAGUE_2, development: true, aging: "ability" });
      expect(json({ ...ability2, players: ability2.players.map(unshifted) })).toBe(json(on2));
      // And so the pinned growth-on output of a7a6a66, every field.
      expect(hash({ ...ability, players: ability.players.map(unshifted) })).toBe(WITH_RECORDS.league);
      expect(hash({ ...classAbility, players: classAbility.players.map(unshifted) })).toBe(WITH_RECORDS.draftClass);
      expect(hash({ ...ability2, players: ability2.players.map(unshifted) })).toBe(WITH_RECORDS.league2);
      const classAbility2 = generateDraftClass({ ...CLASS_2, development: true, aging: "ability" });
      expect(hash({ ...classAbility2, players: classAbility2.players.map(unshifted) })).toBe(WITH_RECORDS.draftClass2);
      // So growth, snaps and patience are the same numbers, whichever option drew them.
      const growthOf = (ps: readonly PlayerState[]) => ps.map((p) => [p.attributes.development!.growth, p.attributes.development!.snaps, p.personality.patience]);
      expect(growthOf(ability.players)).toEqual(growthOf(on.players));
      expect(growthOf(classAbility.players)).toEqual(growthOf(classOn.players));
    });

    it("leave growth, career snaps and patience on their own forks of his development stream, whichever the option", () => {
      // The layout §12.2.3 keeps: "growth", "snaps" and "patience" beside "aging", each made by its label alone.
      const root = createRng(LEAGUE.seed, "attributes:fictional");
      for (const league of [on, ability]) {
        for (const p of league.players) {
          const id = String(p.bio.id);
          const dev = p.attributes.development!;
          const stream = root.fork(`development/${id}`);
          expect(dev.growth, id).toBe(drawGrowth(stream.fork("growth")));
          expect(p.personality.patience, id).toBe(drawPatience(stream.fork("patience")));
          // Career snaps: his roster slot is the generator's, before the depth sort; one slot of his position gives his snaps.
          const seasons = seasonsPlayed(p.bio, LEAGUE.season);
          const slots = Array.from({ length: ROSTER_SHAPE[p.bio.position] }, (_, slot) => careerSnaps(stream.fork("snaps"), seasons, slot));
          expect(slots, id).toContain(dev.snaps);
        }
      }
      const classRoot = createRng(CLASS.seed, `attributes:draft-class/${CLASS.draft}`);
      for (const c of [classOn, classAbility]) {
        for (const p of c.players) {
          const stream = classRoot.fork(`development/${String(p.bio.id)}`);
          expect(p.attributes.development!.growth).toBe(drawGrowth(stream.fork("growth")));
          expect(p.personality.patience).toBe(drawPatience(stream.fork("patience")));
          expect(p.attributes.development!.snaps).toBe(0);
        }
      }
    });

    it("give every league player and prospect all 12, from his development stream's \"aging\" fork", () => {
      const root = createRng(LEAGUE.seed, "attributes:fictional");
      for (const p of ability.players) {
        expect(p.attributes.development!.fadeShift).toEqual(drawFadeShift(root.fork(`development/${String(p.bio.id)}`).fork("aging")));
      }
      const classRoot = createRng(CLASS.seed, `attributes:draft-class/${CLASS.draft}`);
      for (const p of classAbility.players) {
        expect(p.attributes.development!.fadeShift).toEqual(drawFadeShift(classRoot.fork(`development/${String(p.bio.id)}`).fork("aging")));
      }
      expect(new Set(ability.players.map((p) => json(p.attributes.development!.fadeShift))).size).toBe(ability.players.length);
    });

    it("are the same for the same seed, and fewer teams or a smaller class moves no one else's", () => {
      expect(json(generateLeagueRosters({ ...LEAGUE, development: true, aging: "ability" }))).toBe(json(ability));
      expect(json(generateDraftClass({ ...CLASS, development: true, aging: "ability" }))).toBe(json(classAbility));
      const byId = new Map(ability.players.map((p) => [String(p.bio.id), p.attributes.development!.fadeShift]));
      const four = generateLeagueRosters({ ...LEAGUE, teams: teams.slice(0, 4), development: true, aging: "ability" });
      for (const p of four.players) expect(p.attributes.development!.fadeShift).toEqual(byId.get(String(p.bio.id)));
      const small = generateDraftClass({ ...CLASS, size: 120, development: true, aging: "ability" });
      small.players.forEach((p, i) => expect(p.attributes.development!.fadeShift).toEqual(classAbility.players[i]!.attributes.development!.fadeShift));
    });
  });
});
