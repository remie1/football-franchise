import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRng, type PlayerState } from "@ff/contracts";
import { generateDraftClass, DRAFT_CLASS_SIZE, ROOKIE_AGE, drawRookieAge } from "../src/index.js";
import { normalCdf } from "../src/fictional/development.js";

describe("draft class maker (ADR-086 D2)", () => {
  const c = generateDraftClass({ seed: "w", draft: 2027 });

  it("makes a class of prospects, the same every time for the same seed and year", () => {
    expect(c.players).toHaveLength(DRAFT_CLASS_SIZE);
    expect(c.draftClass).toEqual({ draft: 2027, prospects: c.players.map((p) => p.bio.id) });
    expect(JSON.stringify(generateDraftClass({ seed: "w", draft: 2027 }).players.map((p) => p.attributes.values)))
      .toBe(JSON.stringify(c.players.map((p) => p.attributes.values)));
    expect(generateDraftClass({ seed: "w", draft: 2028 }).players[0]!.attributes.values).not.toEqual(c.players[0]!.attributes.values);
  });

  it("gives every prospect a unique id and name, draft status PROSPECT, no team, age 21-23, combine numbers and an overall", () => {
    expect(new Set(c.players.map((p) => p.bio.id)).size).toBe(c.players.length);
    expect(new Set(c.players.map((p) => p.bio.displayName)).size).toBe(c.players.length);
    for (const p of c.players) {
      expect(p.bio.draft).toBe("PROSPECT");
      expect(p.teamId).toBeUndefined();
      expect(p.bio.age).toBeGreaterThanOrEqual(21);
      expect(p.bio.age).toBeLessThanOrEqual(23);
      expect(c.combine[String(p.bio.id)]!.forty).toBeGreaterThan(4);
      expect(c.overall[String(p.bio.id)]).toBeGreaterThan(0);
    }
  });

  it("never reuses a name already in the league", () => {
    const taken = new Set(c.players.slice(0, 50).map((p) => p.bio.displayName));
    const next = generateDraftClass({ seed: "w", draft: 2027, usedNames: taken, size: 200 });
    expect(next.players.filter((p) => taken.has(p.bio.displayName))).toHaveLength(0);
  });

  it("has every position, roughly in a roster's proportions", () => {
    const n = (pos: string) => c.players.filter((p) => p.bio.position === pos).length;
    expect(n("WR")).toBeGreaterThan(n("FB"));
    expect(n("CB")).toBeGreaterThan(50);
    expect(n("LS")).toBeGreaterThan(0);
  });
});

// --- ADR-087 §12.5 (AB4): rookie ages for made-up classes, with growth on and aging "ability" -------

/** Whole classes' JSON (Sets as arrays) and its sha256, as development.test.ts hashes them. */
const json = (x: unknown) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
const hash = (x: unknown) => createHash("sha256").update(json(x)).digest("hex");
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * The class's whole output before AB4, MEASURED at a7a6a66 (ADR-087 AB1, before the aging option):
 * `development.test.ts`'s `BEFORE.draftClass` (growth off) and `WITH_RECORDS.draftClass` (growth on),
 * the same pins. AB2 and AB4 leave both as they were at the default and at "position".
 */
const MAIN = {
  off: "1c308980e9b7de987fe57ee23065525acf9157ce716e9b95f0518f0effdbd7f5",
  on: "58b21c0ecc83c6407bfff921cb76fea454619a786e2e0d68bdf4f5303bd934de",
} as const;

/** A prospect with what aging "ability" adds or moves taken off: his age and his fade shifts. */
function nonAge(p: PlayerState): unknown {
  const { age: _a, ...bio } = p.bio;
  const d = p.attributes.development;
  const { fadeShift: _f, ...development } = d ?? {};
  return { ...p, bio, attributes: { ...p.attributes, ...(d ? { development } : {}) } };
}

/** His talent's own standard score, replayed from his class stream (`generateDraftClass`: his position, then this draw). */
function talentZ(seed: string, draft: number, i: number): number {
  const rng = createRng(seed, `attributes:draft-class/${draft}`).fork(`prospect/${i}`);
  rng.next();
  const u = 1 - rng.next();
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** 20 classes of `DRAFT_CLASS_SIZE`, growth on, aging "ability" (and the same at "position" beside them). */
const SEEDS = Array.from({ length: 20 }, (_, k) => ({ seed: `rookie-age-${k + 1}`, draft: 2027 + (k % 5) }));
const abilityClasses = SEEDS.map((s) => generateDraftClass({ ...s, development: true, aging: "ability" }));
const positionClasses = SEEDS.map((s) => generateDraftClass({ ...s, development: true, aging: "position" }));

describe("rookie ages for made-up classes (ADR-087 §12.5, AB4)", () => {
  it("hold the CHOSEN table: the draft-day shares and ρ fitted together to REAL's week-8 53s (AB4b)", () => {
    // CHOSEN (fitted, ADR-087 §12.9's AB4b note): the walk's first made-up class on the week-8 53s counted
    // like the NFL lands on REAL's whole-year shares and its 0.62 gap. A latent the fit sets, not REAL's own.
    expect(ROOKIE_AGE.draftDay).toEqual([
      { age: 20, share: 0.049 }, { age: 21, share: 0.161 }, { age: 22, share: 0.3 },
      { age: 23, share: 0.292 }, { age: 24, share: 0.121 }, { age: 25, share: 0.077 },
    ]);
    expect(ROOKIE_AGE.draftDay.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 12);
    // The class's draft-day mean, 22.506 (COMPUTED): older than the 53's rookies a year on less one (REAL 22.67 - 1).
    expect(ROOKIE_AGE.draftDay.reduce((s, x) => s + x.age * x.share, 0)).toBeCloseTo(22.506, 12);
    expect(ROOKIE_AGE.rho).toBe(0.7);
  });

  it("over 20 classes of DRAFT_CLASS_SIZE, sit within ±1 pt of each draft-day share", () => {
    const ages = abilityClasses.flatMap((c) => c.players.map((p) => p.bio.age));
    expect(ages).toHaveLength(20 * DRAFT_CLASS_SIZE);
    for (const { age, share } of ROOKIE_AGE.draftDay) {
      const got = ages.filter((a) => a === age).length / ages.length;
      expect(Math.abs(got - share), `age ${age}: ${got}`).toBeLessThan(0.01);
    }
    expect(ages.every((a) => a >= 20 && a <= 25)).toBe(true);
  });

  it("move nothing but the age: every other field is deep-equal to aging \"position\"", () => {
    abilityClasses.forEach((c, k) => {
      const p = positionClasses[k]!;
      expect(json({ ...c, players: c.players.map(nonAge) })).toBe(json({ ...p, players: p.players.map(nonAge) }));
    });
    // A class with a size and names already taken, too.
    const input = { seed: "rookie-age-x", draft: 2031, size: 300, usedNames: new Set(["A B"]), development: true };
    const a = generateDraftClass({ ...input, aging: "ability" }), p = generateDraftClass({ ...input, aging: "position" });
    expect(json({ ...a, players: a.players.map(nonAge) })).toBe(json({ ...p, players: p.players.map(nonAge) }));
    expect(a.players.filter((x, i) => x.bio.age !== p.players[i]!.bio.age).length).toBeGreaterThan(150);
  });

  it("leave the class as main makes it under \"position\", the default, and with growth off", () => {
    const CLASS = { seed: "w", draft: 2027 };
    expect(hash(generateDraftClass({ ...CLASS, development: true }))).toBe(MAIN.on);
    expect(hash(generateDraftClass({ ...CLASS, development: true, aging: "position" }))).toBe(MAIN.on);
    expect(hash(generateDraftClass(CLASS))).toBe(MAIN.off);
    expect(hash(generateDraftClass({ ...CLASS, aging: "ability" }))).toBe(MAIN.off);
    for (const c of positionClasses) for (const p of c.players) expect(p.bio.age >= 21 && p.bio.age <= 23).toBe(true);
  });

  it("draw each age from his development stream's \"age\" fork against his talent's own draw, so it is his alone", () => {
    abilityClasses.slice(0, 4).forEach((c, k) => {
      const { seed, draft } = SEEDS[k]!;
      const root = createRng(seed, `attributes:draft-class/${draft}`);
      c.players.forEach((p, i) => {
        expect(p.bio.age, String(p.bio.id)).toBe(drawRookieAge(root.fork(`development/${String(p.bio.id)}`).fork("age"), talentZ(seed, draft, i)));
      });
    });
    // Same seed, same ages; a smaller class moves no one's.
    const again = generateDraftClass({ ...SEEDS[0]!, development: true, aging: "ability" });
    expect(json(again)).toBe(json(abilityClasses[0]));
    const small = generateDraftClass({ ...SEEDS[0]!, size: 120, development: true, aging: "ability" });
    expect(small.players.map((p) => p.bio.age)).toEqual(abilityClasses[0]!.players.slice(0, 120).map((p) => p.bio.age));
  });

  it("run the less talented older, with no draft: below the round-7 talent cut, the gap the fitted table gives (1.43 years)", () => {
    // The cut: the class's top 7 × 32 by talent, as the draft's regular rounds take that many. Below it are
    // the undrafted, both those a team signs and those who go home. No REAL number stands here (AM-AB4-1 is
    // superseded, ADR-087 §12.5): the check pins what the fitted shares and ρ give, 1.430 (COMPUTED, by
    // numerical integration of the copula at ρ 0.7 against the shares, the cut at the top 224/900 of a
    // standard normal), and 1.440 (MEASURED over these 20 classes). The band (CHOSEN) is ±0.06, about 2.8
    // standard errors of the 20 classes' mean gap (0.022, MEASURED). AB4's table read 0.933 here. At "position", ages do
    // not follow talent.
    const gapBelowCut = (classes: typeof abilityClasses) => {
      const gaps = classes.map((c, k) => {
        const { seed, draft } = SEEDS[k]!;
        const ranked = c.players.map((p, i) => ({ age: p.bio.age, z: talentZ(seed, draft, i) })).sort((x, y) => y.z - x.z);
        return mean(ranked.slice(7 * 32).map((x) => x.age)) - mean(ranked.slice(0, 7 * 32).map((x) => x.age));
      });
      return mean(gaps);
    };
    const ability = gapBelowCut(abilityClasses);
    expect(ability).toBeGreaterThan(1.43 - 0.06);
    expect(ability).toBeLessThan(1.43 + 0.06);
    expect(Math.abs(gapBelowCut(positionClasses))).toBeLessThan(0.06);
  });

  it("drawRookieAge: whole years 20-25; at ρ 0 talent does not move it, and the more talented are younger at ρ > 0", () => {
    const draws = (z: number, rho?: number) => Array.from({ length: 4000 }, (_, i) => drawRookieAge(createRng("rookie-age-unit", "x").fork(`m${i}`), z, rho));
    expect(draws(0).every((a) => Number.isInteger(a) && a >= 20 && a <= 25)).toBe(true);
    // ρ 0: the same e gives the same age whatever his talent.
    expect(draws(2, 0)).toEqual(draws(-2, 0));
    // The default ρ is ROOKIE_AGE.rho; a man two sd above runs younger than one two below, by 3.37 years at the
    // fitted table (COMPUTED, his age draw integrated out; 3.364 over these 4,000 draws each, MEASURED).
    expect(draws(1)).toEqual(draws(1, ROOKIE_AGE.rho));
    expect(mean(draws(-2)) - mean(draws(2))).toBeGreaterThan(3.37 - 0.2);
    expect(mean(draws(-2)) - mean(draws(2))).toBeLessThan(3.37 + 0.2);
    expect(mean(draws(1))).toBeLessThan(mean(draws(0)));
  });

  it("normalCdf: the standard normal's distribution to better than 1e-6", () => {
    for (const [x, p] of [[0, 0.5], [1, 0.8413447460685429], [-1, 0.15865525393145707], [1.96, 0.9750021048517795], [-2.5121, 0.006]] as const) {
      expect(Math.abs(normalCdf(x) - p), String(x)).toBeLessThan(x === -2.5121 ? 1e-4 : 1e-6);
    }
    for (let x = -6; x <= 6; x += 0.25) expect(normalCdf(x) + normalCdf(-x)).toBeCloseTo(1, 7);
  });

  it("read no position (the owner's rule): the age draw's source names none, and the class's ages ignore it", () => {
    const src = readFileSync(join(__dirname, "..", "src", "fictional", "development.ts"), "utf8");
    const start = src.indexOf("export const ROOKIE_AGE");
    const end = src.indexOf("export function seasonsPlayed");
    expect(start).toBeGreaterThan(0);
    const code = src.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/position|POSITION|specialist|bio\b|"K"|"P"|"LS"/);
    expect(code).toMatch(/export function drawRookieAge\(rng: Rng, talentZ: number, rho: number = ROOKIE_AGE\.rho\): number/);
    // A specialist's draft-day ages are the class's: K, P and LS draw the same shares as everyone else.
    const all = abilityClasses.flatMap((c) => c.players);
    const kicking = all.filter((p) => ["K", "P", "LS"].includes(p.bio.position)).map((p) => p.bio.age);
    expect(kicking.length).toBeGreaterThan(600);
    expect(Math.abs(mean(kicking) - mean(all.map((p) => p.bio.age)))).toBeLessThan(0.15);
  });
});
