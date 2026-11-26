import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { POSITION_PROFILES, positionOverall, teamId, type PlayerState, type Position, type Team } from "@ff/contracts";
import { generateLeagueRosters } from "../src/fictional/generate.js";
import { generateDraftClass } from "../src/fictional/draftClass.js";
import { DRAWN_AT_CORE, TIERS } from "../src/fictional/profiles.js";

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

/**
 * sha256 over every player's name, position and attribute values only: no id (a made-up league's ids
 * follow the chart order, which is what AB-L moves), no chart order, no overall. Rows sorted.
 */
function ratingsHash(players: readonly PlayerState[]): string {
  const rows = players
    .map((p) => [p.bio.displayName, p.bio.position, Object.entries(p.attributes.values).sort(([a], [b]) => (a < b ? -1 : 1))] as const)
    .map((r) => JSON.stringify(r))
    .sort();
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

const json = (x: unknown) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
const hash = (x: unknown) => createHash("sha256").update(json(x)).digest("hex");
const INSIDE: readonly Position[] = ["MLB", "ILB"];
/** sha256 over the whole state (Sets as arrays) of every man not listed MLB or ILB. Rows sorted. */
function othersHash(players: readonly PlayerState[]): string {
  const rows = players.filter((p) => !INSIDE.includes(p.bio.position)).map(json).sort();
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
/**
 * sha256 over the whole state of every man listed MLB or ILB, with what follows his slot taken off: his
 * id, his growth, career snaps and fade shift (from his development record, whose body and carry follow
 * the man and stay in), his patience and, when `dropAge`, his age. Rows sorted, so men are matched as a
 * set, not by slot.
 */
function insideRestHash(players: readonly PlayerState[], dropAge: boolean): string {
  const rows = players.filter((p) => INSIDE.includes(p.bio.position)).map((p) => {
    const { id: _i, age, ...bio } = p.bio;
    const { development, ...attributes } = p.attributes;
    const { patience: _p, ...personality } = p.personality;
    const kept = development && (({ growth: _g, snaps: _s, fadeShift: _f, ...rest }) => rest)(development);
    return json({ ...p, bio: dropAge ? bio : { ...bio, age }, attributes: { ...attributes, development: kept }, personality });
  }).sort();
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

const league = generateLeagueRosters({ seed: "rosters-1", season: 2027, teams });
const klass = generateDraftClass({ seed: "w", draft: 2027 });

/**
 * MEASURED on the base tree (aging-m8 at fa9f181), the same functions. The league's ratings hash is the
 * same with growth off, with growth on and with growth on under aging "ability". The class pin is growth
 * off only (a growth-on class draws from PROSPECT_TALENT_WITH_GROWTH; the class checks below cover it).
 */
const BASE_RATINGS = {
  league: "8f81e54de49979434c49fae5899e489a2c591af18d795b2bbb8484465dd4ce6e",
  draftClass: "f96b73222ede639d509c6ae9ba4e856200fd7b4c8cecb9d2a7001b3eb8244e0c",
} as const;

/** `othersHash` of the same league on the base tree (MEASURED at fa9f181), by option. */
const BASE_OTHERS = {
  off: "ab3828795d1eff2ce4611e311dab6bf202974f0ae77784b5eab5ae5dc987989a",
  growth: "6403f7e11c35d0a150c6d9a42a5dc6c68dff5294d48b58a569bab4575498c3fe",
  ability: "e7dae46d134a6e65983d8d0301850f45b584e16ac33a22ff6abc7b5be371b55e",
} as const;

/** `insideRestHash` of the same league on the base tree (MEASURED at fa9f181), by option. */
const BASE_INSIDE_REST = {
  off: "d756d30e2f892e2a0db0fa0fd186ed122bc26821a13ce67d452eaff6327e1e91",
  growth: "3614516ca34c4a5591a840e2c38c2c465f98511f80142773732bf8b94c71bab6",
  ability: "fcf37840d3953249ebbacb2e089864b76e0ab2f88eb62c9cf1f784f9c8f4ac1f",
} as const;

/** The draft class `w` (2027) with its stored `overall` taken off, on the base tree (MEASURED at fa9f181). */
const BASE_CLASS_BUT_OVERALL = {
  off: "776bcaa1e533d1567d11f53704f0095642e329c0b902b5d4279a0ca02d8fe708",
  growth: "81b1da6b6392df320c67fcc324705b265bf8f7cab3c5075dd64b4a1abd2d38c0",
  ability: "7cfa8f03142cc8e2135359b7d65ae5d64dfcbb31b6b0641cb999c0c1aeb36459",
} as const;

const OPTIONS = [
  ["off", {}],
  ["growth", { development: true }],
  ["ability", { development: true, aging: "ability" }],
] as const;

// The inside linebackers' overall reads acceleration, not gap discipline. These live here, not in
// contracts' own tests, so the step's one contracts edit stays the profile line itself.
describe("ADR-087 AB-L (NEW-2): the inside linebacker overall", () => {
  for (const pos of ["MLB", "ILB"] as const) {
    const base = Object.fromEntries(
      [...POSITION_PROFILES[pos].core, ...POSITION_PROFILES[pos].secondary, ...POSITION_PROFILES[pos].keyPhysical, "gapDiscipline"].map((id) => [id, 50]),
    );
    it(`${pos}: gap discipline alone does not move it; acceleration +10 moves it by 0.7 / 8 x 10`, () => {
      const o = positionOverall(pos, base);
      expect(POSITION_PROFILES[pos].core).toContain("acceleration");
      expect(POSITION_PROFILES[pos].core).not.toContain("gapDiscipline");
      expect(positionOverall(pos, { ...base, gapDiscipline: 90 })).toBeCloseTo(o, 10);
      expect(positionOverall(pos, { ...base, acceleration: 60 }) - o).toBeCloseTo((0.7 / 8) * 10, 10);
    });
  }
});

describe("ADR-087 AB-L (NEW-2): made-up ratings are unchanged; only chart order and what follows it move", () => {
  it("the made-up league's ratings equal the base generator's", () => {
    expect(ratingsHash(league.players)).toBe(BASE_RATINGS.league);
  });
  it("the made-up draft class's ratings equal the base generator's", () => {
    expect(ratingsHash(klass.players)).toBe(BASE_RATINGS.draftClass);
  });
  // A draft class's ids do not follow its overall, so the whole class but its stored overall is as on the base.
  for (const [name, opts] of OPTIONS) {
    it(`${name}: the draft class is the base's in everything but its stored overall`, () => {
      const c = name === "off" ? klass : generateDraftClass({ seed: "w", draft: 2027, ...opts });
      const { overall: _o, ...rest } = c;
      expect(hash(rest)).toBe(BASE_CLASS_BUT_OVERALL[name]);
    });
  }
  // A made-up league's slot ids follow chart order, and growth, career snaps, patience and (under aging
  // "ability") fade shift and rookie age are drawn on forks keyed by id. So when two inside linebackers
  // swap slots, each takes the other slot's id and those draws. Every man not listed MLB or ILB must come
  // out exactly as on the base, and the inside linebackers too once what follows the slot is taken off
  // (their bodies and carry, which follow the man, stay in).
  for (const [name, opts] of OPTIONS) {
    it(`${name}: ratings as on the base; every other man as on the base; inside linebackers too but for the slot's draws`, () => {
      const l = name === "off" ? league : generateLeagueRosters({ seed: "rosters-1", season: 2027, teams, ...opts });
      expect(ratingsHash(l.players)).toBe(BASE_RATINGS.league);
      expect(othersHash(l.players)).toBe(BASE_OTHERS[name]);
      expect(insideRestHash(l.players, name === "ability")).toBe(BASE_INSIDE_REST[name]);
    });
  }
});

describe("the generator draws gap discipline at the core tier for inside linebackers", () => {
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const gd = (ps: readonly PlayerState[], pos: Position[]) =>
    ps.filter((p) => pos.includes(p.bio.position)).map((p) => p.attributes.values["gapDiscipline"]!);

  it("MLB and ILB gapDiscipline sits near the core tier, far above the rest tier", () => {
    for (const ps of [league.players, klass.players]) {
      const xs = gd(ps, ["MLB", "ILB"]);
      expect(xs.length).toBeGreaterThan(30);
      // league 63.7 and prospects 54.5 (MEASURED; prospects carry less talent). The rest tier gave 23.40 on the
      // homie-1 league in the as-typed probe (MEASURED, ADR-087's AB-L note).
      expect(mean(xs)).toBeGreaterThan(TIERS.core.mean - 10);
      expect(mean(xs)).toBeLessThan(TIERS.core.mean + 10);
      expect(mean(xs)).toBeGreaterThan(TIERS.rest.mean + 25);
    }
  });
  it("DRAWN_AT_CORE holds only ratings not already in that position's core", () => {
    for (const [pos, ids] of Object.entries(DRAWN_AT_CORE)) {
      expect(ids!.length).toBeGreaterThan(0);
      for (const id of ids!) expect(POSITION_PROFILES[pos as Position].core).not.toContain(id);
    }
    expect(Object.keys(DRAWN_AT_CORE).sort()).toEqual(["ILB", "MLB"]);
  });
});
