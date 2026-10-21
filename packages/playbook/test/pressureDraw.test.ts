/**
 * ADR-073 step 3.4 — THE v6 DRAWS AND THEIR RATES, HELD TO THE BOOK.
 *
 * `pressureDraw.ts` throws caller v6's coverage, pressure, creeper and line-game dice. This file
 * holds them to ADR-073 §2.6:
 *
 *   - **the construction** ("rates held by construction"): over a sweep of 23,760 situations,
 *     each host coverage's share and P(five or more) equal v5's card-weight shares to 1e-12,
 *     computed here from the book's own weights; every r_s and every r_line is at most 1; and
 *     the line-game share is v5's;
 *   - **the caller-rate marginals** (§3.4): `pressure.test.ts`'s three marginals, on v6's draw
 *     over the open field, beside the originals, which stay on `DEFENSIVE_CARDS`;
 *   - **the dice ledger**: the dice §2.6 names, each thrown once on its own child fork, and none
 *     that would turn nothing (ADR-005);
 *   - **the sampler realises the law**: with a scripted Rng that answers each die at its
 *     breakpoints ± 1e-9, every outcome's measure equals the analytic law to 1e-12, so a die
 *     compared the wrong way, weighed uniformly or cut at the wrong rate cannot pass;
 *   - **determinism** (Iron Rule 4): the same Rng address gives the same composed call.
 */
import { createRng, type Rng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import {
  COMPOSED,
  CREEPER_SPECS,
  LINE_GAMES,
  V6_COVERAGES,
  composedKey,
  legalLineGames,
  type HostedPressure,
  type LineGame,
  type LineGameId,
} from "../src/coverageCatalogue.js";
import { rusherCount, type AnyDefensiveCard, type CoverageFamily } from "../src/defense.js";
import { DEFENSIVE_CARDS, NICKEL_COVER_3_SKY, NICKEL_FIRE_ZONE } from "../src/defensiveCards.js";
import {
  BLITZ_DISGUISE_MIX,
  BLITZ_RATE_PRIOR,
  CREEPER_RATE,
  STUNT_COMPLEXITY_MIX,
  STUNT_RATE_PRIOR,
  usageApplies,
  type PlaySituation,
  type SituationalUsage,
} from "../src/distribution.js";
import { PlaybookError } from "../src/errors.js";
import {
  blitzRate,
  coverageDrawWeight,
  drawLineGame,
  drawPressure,
  hostShares,
  lineGameMix,
  lineGameRate,
  pressureMix,
  selectCoverage,
  type DrawPlan,
} from "../src/pressureDraw.js";
import { selectDefensiveCard } from "../src/selection.js";

// --- the sweep and the book's side, computed here from the book's own weights -------------------

/** Q32's sweep: four downs, distances 1-30, ballOn 1-99, two-minute both ways. */
const SWEEP: readonly PlaySituation[] = (() => {
  const out: PlaySituation[] = [];
  for (const down of [1, 2, 3, 4] as const) {
    for (let distance = 1; distance <= 30; distance += 1) {
      for (let ballOn = 1; ballOn <= 99; ballOn += 1) {
        for (const twoMinute of [false, true]) out.push({ down, distance, ballOn, twoMinute });
      }
    }
  }
  return out;
})();

const said = (s: PlaySituation): string =>
  `${s.down} and ${s.distance} at ${s.ballOn}${s.twoMinute ? ", two-minute" : ""}`;

/** The fold, written out (ADR-071 §5's second table; ADR-073 §3.4): each decomposed card to its host. */
const FOLD: Readonly<Record<string, string>> = {
  DEF_NICKEL_COVER_3_PRESSURE: "DEF_NICKEL_COVER_3_SKY",
  DEF_NICKEL_FIRE_ZONE: "DEF_NICKEL_COVER_3_SKY",
  DEF_NICKEL_DOUBLE_A_BLITZ: "DEF_NICKEL_COVER_1",
  DEF_BASE_RUN_BLITZ: "DEF_BASE_COVER_1",
  DEF_DIME_MAN_BLITZ: "DEF_DIME_COVER_1",
};
const hostOf = (id: string): string => FOLD[id] ?? id;

/** Decision 5's "four-man Cover 3 calls" (ADR-073 §2.6). */
const CREEPER_HOSTS: readonly string[] = [
  "DEF_NICKEL_COVER_3_SKY",
  "DEF_NICKEL_COVER_3_BUZZ",
  "DEF_BASE_COVER_3",
];

const v5Pool = (s: PlaySituation): readonly AnyDefensiveCard[] =>
  DEFENSIVE_CARDS.filter((c) => c.usage.weight > 0 && usageApplies(c.usage, s));

/** Which of the five line games a book card states, read off its stunts. */
function gameOf(card: AnyDefensiveCard): LineGameId | undefined {
  const stunts = card.stunts ?? [];
  if (stunts.length === 0) return undefined;
  const game = LINE_GAMES.find((g) => JSON.stringify(g.stunts) === JSON.stringify(stunts));
  if (game === undefined) throw new Error(`${card.id} states no book line game`);
  return game.id;
}

/** v5's side in s, from `DEFENSIVE_CARDS`' weights and the written-out fold alone. */
interface BookSide {
  readonly total: number;
  /** Each host's folded weight: its own card's weight plus the decomposed cards that fold onto it. */
  readonly hostWeight: ReadonlyMap<string, number>;
  readonly five: number;
  readonly rs: number;
  readonly stunting: number;
  /** The decomposed cards that apply, by host, in the book's order. */
  readonly hosted: ReadonlyMap<string, readonly AnyDefensiveCard[]>;
  readonly gameWeight: ReadonlyMap<LineGameId, number>;
}

function bookSide(s: PlaySituation): BookSide {
  const pool = v5Pool(s);
  const total = pool.reduce((a, c) => a + c.usage.weight, 0);
  const hostWeight = new Map<string, number>();
  const hosted = new Map<string, AnyDefensiveCard[]>();
  const gameWeight = new Map<LineGameId, number>();
  let five = 0;
  let stunting = 0;
  let decomposed = 0;
  for (const card of pool) {
    const host = hostOf(card.id);
    hostWeight.set(host, (hostWeight.get(host) ?? 0) + card.usage.weight);
    if (rusherCount(card) >= 5) five += card.usage.weight;
    const game = gameOf(card);
    if (game !== undefined) {
      stunting += card.usage.weight;
      gameWeight.set(game, (gameWeight.get(game) ?? 0) + card.usage.weight);
    }
    if (FOLD[card.id] !== undefined) {
      decomposed += card.usage.weight;
      hosted.set(host, [...(hosted.get(host) ?? []), card]);
    }
  }
  const hostsW = [...hosted.keys()].reduce((a, h) => a + (hostWeight.get(h) ?? 0), 0);
  return {
    total,
    hostWeight,
    five: five / total,
    rs: hostsW === 0 ? 0 : decomposed / hostsW,
    stunting: stunting / total,
    hosted,
    gameWeight,
  };
}

/** One situation for each distinct pool of book cards in the sweep: the classes the law can tell apart. */
const CLASSES: readonly PlaySituation[] = (() => {
  const seen = new Map<string, PlaySituation>();
  for (const s of SWEEP) {
    const key = v5Pool(s)
      .map((c) => c.id)
      .join(",");
    if (!seen.has(key)) seen.set(key, s);
  }
  return [...seen.values()];
})();

const PLANS: readonly DrawPlan[] = [
  { pressures: "BOUND" },
  { pressures: "DRAWN", creeper: false },
  { pressures: "DRAWN", creeper: true },
];
const planName = (p: DrawPlan): string =>
  p.pressures === "BOUND" ? "front (pressures bound)" : p.creeper ? "joint (v6)" : "joint, no creeper";

const none = (coverage: string, pressure: HostedPressure["pressure"] | undefined): AnyDefensiveCard => {
  const entry = COMPOSED[composedKey(coverage, pressure, "NONE")];
  if (entry === undefined) throw new Error(`no composition ${composedKey(coverage, pressure, "NONE")}`);
  return entry.call;
};

const RUSHERS = new Map<AnyDefensiveCard, number>();
const rushers = (call: AnyDefensiveCard): number => {
  const known = RUSHERS.get(call);
  if (known !== undefined) return known;
  const n = rusherCount(call);
  RUSHERS.set(call, n);
  return n;
};

const LEGAL = new Map<AnyDefensiveCard, readonly LineGame[]>();
const legal = (call: AnyDefensiveCard): readonly LineGame[] => {
  const known = LEGAL.get(call);
  if (known !== undefined) return known;
  const games = legalLineGames(call);
  LEGAL.set(call, games);
  return games;
};

/** A plan's calls in s, before the line game, with their shares, read from the module's exports. */
function planCalls(s: PlaySituation, plan: DrawPlan): readonly { call: AnyDefensiveCard; share: number }[] {
  if (plan.pressures === "BOUND") {
    const pool = v5Pool(s);
    const total = pool.reduce((a, c) => a + c.usage.weight, 0);
    return pool.map((call) => ({ call, share: call.usage.weight / total }));
  }
  const r = blitzRate(s);
  return hostShares(s).flatMap(({ coverage, share }) => {
    const mix = pressureMix(coverage, s);
    const left = mix.length > 0 ? share * (1 - r) : share;
    const creeps = plan.creeper && CREEPER_HOSTS.includes(coverage.id);
    return [
      ...mix.map((m) => ({ call: none(coverage.id, m.pressure.pressure), share: share * r * m.share })),
      ...(creeps ? [{ call: none(coverage.id, "CREEPER"), share: left * CREEPER_RATE }] : []),
      { call: none(coverage.id, undefined), share: creeps ? left * (1 - CREEPER_RATE) : left },
    ];
  });
}

// --- the construction --------------------------------------------------------------------------

describe("ADR-073 §2.6 — the construction holds to 1e-12 over the sweep", () => {
  it("sweeps 23,760 situations: four downs, distances 1-30, ballOn 1-99, two-minute both ways", () => {
    expect(SWEEP).toHaveLength(23_760);
  });

  it("holds every host's share, P(five or more) and the line-game share, with every r_s and r_line at most 1", () => {
    // The first 40 failures are named; the rest are counted, so a broken law fails readably.
    const failures: string[] = [];
    let failed = 0;
    const fail = (message: string): void => {
      failed += 1;
      if (failures.length < 40) failures.push(message);
    };
    let worst = 0;
    const close = (s: PlaySituation, what: string, got: number, want: number): void => {
      const d = Math.abs(got - want);
      worst = Math.max(worst, d);
      if (!(d <= 1e-12)) fail(`${said(s)}: ${what} is ${got}, v5's is ${want}`);
    };
    for (const s of SWEEP) {
      const book = bookSide(s);
      // Each host's share: its folded weight over W.
      const shares = hostShares(s);
      const got = shares.map((x) => x.coverage.id);
      const want = V6_COVERAGES.map((c) => c.id).filter((id) => (book.hostWeight.get(id) ?? 0) > 0);
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        fail(`${said(s)}: v6 draws ${got.join(" ")}, v5's cards fold onto ${want.join(" ")}`);
      }
      for (const { coverage, share } of shares) {
        const folded = book.hostWeight.get(coverage.id) ?? 0;
        close(s, `${coverage.id}'s share`, share, folded / book.total);
        if (coverageDrawWeight(coverage, s) !== folded) {
          fail(`${said(s)}: ${coverage.id} weighs ${coverageDrawWeight(coverage, s)}, folded ${folded}`);
        }
      }
      close(s, "the shares' sum", shares.reduce((a, x) => a + x.share, 0), 1);
      // r_s: one rate, at most 1, and the book's own ratio.
      const rs = blitzRate(s);
      if (!(rs <= 1)) fail(`${said(s)}: r_s = ${rs} > 1`);
      close(s, "r_s", rs, book.rs);
      // P(five or more), with the creeper on and off.
      for (const creeper of [false, true]) {
        const five = planCalls(s, { pressures: "DRAWN", creeper })
          .filter((x) => rushers(x.call) >= 5)
          .reduce((a, x) => a + x.share, 0);
        close(s, `P(five or more)${creeper ? "" : " without the creeper"}`, five, book.five);
      }
      // r_line: at most 1, and the line-game share it gives is v5's, on every plan.
      for (const plan of PLANS) {
        const rLine = lineGameRate(s, plan);
        if (!(rLine <= 1)) fail(`${said(s)}: r_line = ${rLine} > 1 (${planName(plan)})`);
        const wearing = planCalls(s, plan)
          .filter((x) => lineGameMix(x.call, s).length > 0)
          .reduce((a, x) => a + x.share * rLine, 0);
        close(s, `the line-game share (${planName(plan)})`, wearing, book.stunting);
      }
    }
    expect(failures).toEqual([]);
    expect(failed).toBe(0);
    expect(worst).toBeLessThanOrEqual(1e-12);
  });

  it("gives r_s = 1/2 at six yards or less and 21/39 beyond, on today's book", () => {
    for (const s of SWEEP) {
      expect(blitzRate(s), said(s)).toBeCloseTo(s.distance <= 6 ? 20 / 40 : 21 / 39, 15);
    }
  });

  it("tells the sweep's twelve pools apart (down 1 or not, three distance bands, open field or goal line)", () => {
    expect(CLASSES).toHaveLength(12);
  });
});

describe("ADR-073 §2.6 step 1 — the coverage is the host of v5's card, on every snap", () => {
  it("folds v5's own die, on the same fork, onto its host", () => {
    for (const s of CLASSES) {
      for (let i = 0; i < 200; i += 1) {
        const seed = `c3-fold-${String(i)}`;
        const v5 = selectDefensiveCard(createRng(seed, "defense-card"), s);
        const v6 = selectCoverage(createRng(seed, "defense-card"), s);
        expect(v6.id, `${said(s)}, ${seed}`).toBe(hostOf(v5.id));
        expect(V6_COVERAGES).toContain(v6);
      }
    }
  });

  it("draws DIME_COVER_1 only where Dime Man Pressure applies, though its own weight is 0", () => {
    for (const s of CLASSES) {
      const dime = hostShares(s).find((x) => x.coverage.id === "DEF_DIME_COVER_1");
      const dimeSmoke = v5Pool(s).find((c) => c.id === "DEF_DIME_MAN_BLITZ");
      expect(dime?.share, said(s)).toBe(dimeSmoke === undefined ? undefined : 3 / bookSide(s).total);
    }
  });
});

describe("ADR-073 §2.6 step 2 — the pressure laws are the book's", () => {
  it("weighs each host's pressures by their own cards' weights, in the book's order", () => {
    for (const s of CLASSES) {
      const book = bookSide(s);
      for (const coverage of V6_COVERAGES) {
        const cards = book.hosted.get(coverage.id) ?? [];
        const total = cards.reduce((a, c) => a + c.usage.weight, 0);
        expect(
          pressureMix(coverage, s).map((m) => [m.pressure.id, m.share]),
          `${said(s)}, ${coverage.id}`,
        ).toEqual(cards.map((c) => [c.id, c.usage.weight / total]));
      }
    }
  });

  it("hosts two pressures over Cover 3 Sky alone, Smoke and Fire at seven each", () => {
    for (const s of CLASSES) {
      for (const { coverage } of hostShares(s)) {
        const mix = pressureMix(coverage, s);
        if (coverage.id === NICKEL_COVER_3_SKY.id) {
          expect(mix.map((m) => [m.pressure.pressure, m.share])).toEqual([
            ["SMOKE", 0.5],
            ["FIRE", 0.5],
          ]);
        } else {
          expect(mix.length, `${said(s)}, ${coverage.id}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe("ADR-073 §2.6 step 3 — the line-game laws are the book's", () => {
  /** Two situations in which every one of the five line games has weight: the Twist needs seven yards. */
  const EVERY_GAME: readonly PlaySituation[] = [
    { down: 1, distance: 10, ballOn: 50, twoMinute: false },
    { down: 3, distance: 20, ballOn: 97, twoMinute: true },
  ];

  it("reads each reachable call's legal line games off COMPOSED, as legalLineGames reads them", () => {
    const calls = [...Object.values(COMPOSED).map((e) => e.call), ...DEFENSIVE_CARDS];
    for (const s of EVERY_GAME) {
      for (const game of LINE_GAMES) expect(bookSide(s).gameWeight.get(game.id), game.id).toBeGreaterThan(0);
      for (const call of calls) {
        expect(
          lineGameMix(call, s).map((m) => m.game.id),
          call.id,
        ).toEqual(legal(call).map((g) => g.id));
      }
    }
  });

  it("weighs each legal game by the summed weight in s of the book's cards stating it", () => {
    for (const s of CLASSES) {
      const book = bookSide(s);
      for (const plan of PLANS) {
        for (const { call } of planCalls(s, plan)) {
          const games = legal(call).filter((g) => (book.gameWeight.get(g.id) ?? 0) > 0);
          const total = games.reduce((a, g) => a + (book.gameWeight.get(g.id) ?? 0), 0);
          expect(
            lineGameMix(call, s).map((m) => [m.game.id, m.share]),
            `${said(s)}, ${call.id}`,
          ).toEqual(games.map((g) => [g.id, (book.gameWeight.get(g.id) ?? 0) / total]));
        }
      }
    }
  });

  it("does not offer the Twist short of seven yards, where no card stating it applies", () => {
    const short: PlaySituation = { down: 2, distance: 3, ballOn: 40, twoMinute: false };
    expect(bookSide(short).gameWeight.get("TWIST")).toBeUndefined();
    expect(lineGameMix(NICKEL_COVER_3_SKY, short).map((m) => m.game.id)).toEqual([
      "TEX_LEFT",
      "TEX_RIGHT",
      "DELAY",
      "TRIPLE",
    ]);
    expect(lineGameMix(NICKEL_FIRE_ZONE, short).map((m) => m.game.id)).toEqual(["TEX_LEFT", "TRIPLE"]);
  });

  it("takes the same r_line with the creeper on or off: a creeper's call can wear a game where its bare call can", () => {
    for (const s of SWEEP) {
      expect(lineGameRate(s, { pressures: "DRAWN", creeper: true }), said(s)).toBe(
        lineGameRate(s, { pressures: "DRAWN", creeper: false }),
      );
    }
  });
});

// --- the caller-rate marginals -----------------------------------------------------------------

/**
 * v6's law over a pool of usage, computed here from the catalogue's parts and the book's weights:
 * the coverage fold, the shared r_s, the creeper rate, r_line and the line-game weights. Over the
 * pool a situation allows, it is the module's law (the first test below holds the two equal); over
 * the open field it is the pool `pressure.test.ts`'s marginals are taken over — every card but the
 * goal line's, its limits set aside.
 */
interface LawCall {
  readonly call: AnyDefensiveCard;
  readonly share: number;
  readonly games: readonly { readonly game: LineGame; readonly share: number }[];
}
interface Law {
  readonly hostShares: ReadonlyMap<string, number>;
  readonly r: number;
  readonly rLine: number;
  readonly calls: readonly LawCall[];
}

type InPool = (usage: SituationalUsage, family: CoverageFamily) => boolean;

function lawOver(inPool: InPool, creeper: boolean): Law {
  const hostedBy = (coverage: AnyDefensiveCard): readonly AnyDefensiveCard[] =>
    DEFENSIVE_CARDS.filter((c) => FOLD[c.id] === coverage.id && c.usage.weight > 0 && inPool(c.usage, c.family));
  const weighed = V6_COVERAGES.map((coverage) => {
    const hosted = hostedBy(coverage);
    const own = coverage.usage.weight > 0 && inPool(coverage.usage, coverage.family) ? coverage.usage.weight : 0;
    return { coverage, hosted, weight: own + hosted.reduce((a, c) => a + c.usage.weight, 0) };
  }).filter((x) => x.weight > 0);
  const total = weighed.reduce((a, x) => a + x.weight, 0);
  const hosts = weighed.filter((x) => x.hosted.length > 0);
  const pressureW = hosts.reduce((a, x) => a + x.hosted.reduce((b, c) => b + c.usage.weight, 0), 0);
  const hostW = hosts.reduce((a, x) => a + x.weight, 0);
  const r = hostW === 0 ? 0 : pressureW / hostW;
  const calls = weighed.flatMap(({ coverage, hosted, weight }) => {
    const share = weight / total;
    const hostedW = hosted.reduce((a, c) => a + c.usage.weight, 0);
    const pressured = hosted.map((card) => {
      const spec = COMPOSED_SPEC.get(card.id);
      if (spec === undefined) throw new Error(`no spec for ${card.id}`);
      return { call: none(coverage.id, spec), share: share * r * (card.usage.weight / hostedW) };
    });
    const left = hosted.length > 0 ? share * (1 - r) : share;
    const creeps = creeper && CREEPER_HOSTS.includes(coverage.id);
    return [
      ...pressured,
      ...(creeps ? [{ call: none(coverage.id, "CREEPER"), share: left * CREEPER_RATE }] : []),
      { call: none(coverage.id, undefined), share: creeps ? left * (1 - CREEPER_RATE) : left },
    ];
  });
  const book = DEFENSIVE_CARDS.filter((c) => c.usage.weight > 0 && inPool(c.usage, c.family));
  const bookW = book.reduce((a, c) => a + c.usage.weight, 0);
  const gameW = (id: LineGameId): number =>
    book.filter((c) => gameOf(c) === id).reduce((a, c) => a + c.usage.weight, 0);
  const stunting = book.filter((c) => gameOf(c) !== undefined).reduce((a, c) => a + c.usage.weight, 0) / bookW;
  const withGames = calls.map((x) => {
    const games = legal(x.call).filter((g) => gameW(g.id) > 0);
    const gw = games.reduce((a, g) => a + gameW(g.id), 0);
    return { ...x, games: games.map((game) => ({ game, share: gameW(game.id) / gw })) };
  });
  const hostable = withGames.filter((x) => x.games.length > 0).reduce((a, x) => a + x.share, 0);
  return {
    hostShares: new Map(weighed.map((x) => [x.coverage.id, x.weight / total])),
    r,
    rLine: stunting / hostable,
    calls: withGames,
  };
}

/** The pressure word each decomposed card is laid as. */
const COMPOSED_SPEC: ReadonlyMap<string, HostedPressure["pressure"]> = new Map(
  Object.values(COMPOSED)
    .filter((e) => e.pressure !== undefined && e.pressure !== "CREEPER" && e.line === "NONE")
    .map((e) => [e.call.id, e.pressure as HostedPressure["pressure"]]),
);

const OPEN_FIELD: InPool = (usage, family) => usage.weight > 0 && family !== "GOAL_LINE";
const BOOK_OPEN_FIELD = DEFENSIVE_CARDS.filter((c) => c.family !== "GOAL_LINE");
const BOOK_W = BOOK_OPEN_FIELD.reduce((a, c) => a + c.usage.weight, 0);

const fiveShare = (law: Law): number => law.calls.filter((x) => rushers(x.call) >= 5).reduce((a, x) => a + x.share, 0);
const stuntShare = (law: Law): number =>
  law.calls.filter((x) => x.games.length > 0).reduce((a, x) => a + x.share * law.rLine, 0);
function complexityMix(law: Law): ReadonlyMap<string, number> {
  const mix = new Map<string, number>();
  for (const x of law.calls) {
    for (const g of x.games) {
      const row = g.game.stunts[0]?.complexity ?? "";
      mix.set(row, (mix.get(row) ?? 0) + x.share * law.rLine * g.share);
    }
  }
  const total = stuntShare(law);
  return new Map([...mix].map(([row, w]) => [row, w / total]));
}
/** Among the calls that rush five or more only, so the creeper's ZONE_BLITZ row stays out (ADR-073 §2.6). */
function disguiseMix(law: Law): ReadonlyMap<string, number> {
  const mix = new Map<string, number>();
  for (const x of law.calls.filter((c) => rushers(c.call) >= 5)) {
    const row = x.call.blitzDisguise ?? "STANDARD";
    mix.set(row, (mix.get(row) ?? 0) + x.share);
  }
  const total = fiveShare(law);
  return new Map([...mix].map(([row, w]) => [row, w / total]));
}

describe("ADR-073 §3.4 — the caller-rate marginals, on v6's draw over the open field", () => {
  const V6 = lawOver(OPEN_FIELD, true);

  it("takes its law from the module: over each situation class it is hostShares, r_s, r_line and the mixes", () => {
    for (const s of CLASSES) {
      const law = lawOver((usage) => usage.weight > 0 && usageApplies(usage, s), true);
      const shares = hostShares(s);
      expect([...law.hostShares.keys()], said(s)).toEqual(shares.map((x) => x.coverage.id));
      for (const { coverage, share } of shares) {
        expect(Math.abs((law.hostShares.get(coverage.id) ?? 0) - share)).toBeLessThanOrEqual(1e-12);
      }
      expect(Math.abs(law.r - blitzRate(s))).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(law.rLine - lineGameRate(s, { pressures: "DRAWN", creeper: true }))).toBeLessThanOrEqual(1e-12);
      const module = planCalls(s, { pressures: "DRAWN", creeper: true });
      expect(law.calls.map((x) => x.call.id)).toEqual(module.map((x) => x.call.id));
      law.calls.forEach((x, i) => {
        expect(Math.abs(x.share - (module[i]?.share ?? NaN))).toBeLessThanOrEqual(1e-12);
        expect(x.games.map((g) => [g.game.id, g.share])).toEqual(
          lineGameMix(x.call, s).map((m) => [m.game.id, m.share]),
        );
      });
    }
  });

  it("is a law: its calls' shares sum to 1 over the open field", () => {
    expect(Math.abs(V6.calls.reduce((a, x) => a + x.share, 0) - 1)).toBeLessThanOrEqual(1e-12);
  });

  describe("marginal 1 — how often five or more come", () => {
    it("is v5's card-weight share exactly, and so within two points of 26%", () => {
      const v5 = BOOK_OPEN_FIELD.filter((c) => rusherCount(c) >= 5).reduce((a, c) => a + c.usage.weight, 0) / BOOK_W;
      expect(Math.abs(fiveShare(V6) - v5)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(fiveShare(V6) - BLITZ_RATE_PRIOR)).toBeLessThanOrEqual(0.02);
    });

    it("does not count the creeper, which rushes four: without it the share is the same", () => {
      expect(fiveShare(lawOver(OPEN_FIELD, false))).toBe(fiveShare(V6));
      for (const spec of CREEPER_SPECS) expect(rushers(none(spec.over, "CREEPER")), spec.id).toBe(4);
    });
  });

  describe("marginal 2 — how often four exchange", () => {
    it("runs a line game on v5's share exactly, and so within four points of 28%", () => {
      const v5 = BOOK_OPEN_FIELD.filter((c) => gameOf(c) !== undefined).reduce((a, c) => a + c.usage.weight, 0) / BOOK_W;
      expect(Math.abs(stuntShare(V6) - v5)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(stuntShare(V6) - STUNT_RATE_PRIOR)).toBeLessThanOrEqual(0.04);
      expect(V6.rLine).toBeLessThanOrEqual(1);
    });

    it("orders the complexities the way real fronts call them", () => {
      const mix = complexityMix(V6);
      const share = (k: string): number => mix.get(k) ?? 0;
      expect(share("T_E")).toBeGreaterThan(share("T_T"));
      expect(share("T_T")).toBeGreaterThan(share("DELAYED"));
      expect(share("T_E")).toBeGreaterThan(0.5);
      expect(share("DELAYED") + share("TRIPLE")).toBeLessThan(0.2);
      expect([...mix.keys()].sort()).toEqual(Object.keys(STUNT_COMPLEXITY_MIX).sort());
    });

    it("keeps the triple game to one chained pattern", () => {
      const triples = LINE_GAMES.filter((g) => g.stunts[0]?.complexity === "TRIPLE");
      expect(triples).toHaveLength(1);
      expect(triples[0]?.stunts).toHaveLength(2);
      expect(new Set((triples[0]?.stunts ?? []).flatMap((s) => [s.penetrator, s.looper])).size).toBe(3);
    });
  });

  describe("marginal 3 — how well the pressure is hidden", () => {
    it("names a row on every call that sends an extra man, and on the creeper, whose backer rushes", () => {
      for (const x of V6.calls) {
        if (rushers(x.call) >= 5 || x.call.pressure === "CREEPER") expect(x.call.blitzDisguise, x.call.id).toBeDefined();
      }
    });

    it("takes the mix over the calls that rush five or more only, so the creeper's ZONE_BLITZ row stays out", () => {
      const counted = V6.calls.filter((x) => rushers(x.call) >= 5);
      expect(counted.some((x) => x.call.pressure === "CREEPER")).toBe(false);
      expect([...disguiseMix(V6).values()].reduce((a, w) => a + w, 0)).toBeCloseTo(1, 12);
      expect(disguiseMix(lawOver(OPEN_FIELD, false))).toEqual(disguiseMix(V6));
    });

    /**
     * NOT HELD HERE: STANDARD and DELAYED. The one r_s shared by every host (§2.6) moves Dime Man
     * Pressure, the book's only DELAYED pressure, from always on its host to r_s of it, and the mass
     * goes to STANDARD (Double A, Base Run Blitz). On v6's draw over the open field the two rows are
     * .5555 and .0617 against the prior's .50 and .12, so the prior's three points does not hold for
     * them, and no band for them is filed for this test.
     */
    it.each(["ZONE_BLITZ", "ZERO"] as const)("%s is within three points of BLITZ_DISGUISE_MIX", (row) => {
      expect(Math.abs((disguiseMix(V6).get(row) ?? 0) - (BLITZ_DISGUISE_MIX[row] ?? NaN))).toBeLessThanOrEqual(0.03);
    });

    it("leaves the four-man rushes silent but the creeper, which is §5.3's zone blitz row", () => {
      const silent = V6.calls.filter((x) => x.call.blitzDisguise === undefined);
      expect(silent.length).toBeGreaterThan(10);
      for (const x of silent) expect(rushers(x.call), x.call.id).toBeLessThanOrEqual(4);
      for (const x of V6.calls.filter((c) => rushers(c.call) <= 4 && c.call.blitzDisguise !== undefined)) {
        expect([x.call.pressure, x.call.blitzDisguise], x.call.id).toEqual(["CREEPER", "ZONE_BLITZ"]);
      }
    });
  });
});

// --- the dice ----------------------------------------------------------------------------------

const EPS = 1e-9;

class Unscripted extends Error {
  constructor(readonly path: string) {
    super(`no value scripted for the die ${path === "" ? "(root)" : path}`);
  }
}

/**
 * An Rng whose every die is answered by its path (`""` is the Rng given; `"blitz"` its child). It
 * records the dice thrown, in order, and refuses a die thrown twice and every other Rng method.
 */
function scriptedRng(value: (path: string) => number | undefined, thrown: string[]): Rng {
  const refuse = (): never => {
    throw new Error("the draws throw their dice through weightedPick, one next() each");
  };
  const make = (path: string): Rng => ({
    next(): number {
      if (thrown.includes(path)) throw new Error(`the die ${path} is thrown twice`);
      const v = value(path);
      if (v === undefined) throw new Unscripted(path);
      thrown.push(path);
      return v;
    },
    int: refuse,
    d100: refuse,
    d20: refuse,
    pick: refuse,
    fork: (label: string) => make(path === "" ? label : `${path}/${label}`),
    seed: "scripted",
    label: path === "" ? "root" : path,
  });
  return make("");
}

const run = <T>(draw: (rng: Rng) => T, value: (path: string) => number | undefined) => {
  const thrown: string[] = [];
  const outcome = draw(scriptedRng(value, thrown));
  return { outcome, thrown };
};

const idOf = (x: { readonly id: string } | undefined): string => x?.id ?? "none";

describe("ADR-005 — the dice ledger: §2.6's dice, each once, and none that turns nothing", () => {
  it("selectCoverage throws one die, on the Rng it is given — the caller's defense-card fork", () => {
    for (const s of CLASSES) {
      for (const u of [EPS, 0.5, 1 - EPS]) {
        expect(run((rng) => selectCoverage(rng, s), (p) => (p === "" ? u : undefined)).thrown).toEqual([""]);
      }
    }
  });

  it("drawPressure throws blitz over a host, which between two, and creeper only over a creeper host with no five drawn", () => {
    for (const s of CLASSES) {
      const book = bookSide(s);
      for (const { coverage } of hostShares(s)) {
        const hosted = book.hosted.get(coverage.id) ?? [];
        for (const creeper of [false, true]) {
          for (const u of [EPS, 1 - EPS]) {
            const { outcome, thrown } = run((rng) => drawPressure(rng, coverage, s, { creeper }), () => u);
            const five = hosted.length > 0 && u < book.rs;
            const creeps = !five && creeper && CREEPER_HOSTS.includes(coverage.id);
            const label = `${said(s)}, ${coverage.id}, creeper ${String(creeper)}, u ${u}`;
            expect(thrown, label).toEqual([
              ...(hosted.length > 0 ? ["blitz"] : []),
              ...(five && hosted.length >= 2 ? ["which"] : []),
              ...(creeps ? ["creeper"] : []),
            ]);
            const want = five ? hosted[0]?.id : creeps && u < CREEPER_RATE ? `${coverage.id}+CREEPER` : undefined;
            expect(idOf(outcome), label).toBe(want ?? "none");
          }
        }
      }
    }
  });

  it("drawLineGame throws wears on a call that can wear a game in s, and which between two", () => {
    for (const s of CLASSES) {
      const book = bookSide(s);
      for (const plan of PLANS) {
        const rLine = lineGameRate(s, plan);
        for (const { call } of planCalls(s, plan)) {
          const games = legal(call).filter((g) => (book.gameWeight.get(g.id) ?? 0) > 0);
          for (const u of [EPS, 1 - EPS]) {
            const { outcome, thrown } = run((rng) => drawLineGame(rng, call, s, rLine), () => u);
            const wears = games.length > 0 && u < rLine;
            const label = `${said(s)}, ${planName(plan)}, ${call.id}, u ${u}`;
            expect(thrown, label).toEqual([
              ...(games.length > 0 ? ["wears"] : []),
              ...(wears && games.length >= 2 ? ["which"] : []),
            ]);
            expect(idOf(outcome), label).toBe(wears ? (games[0]?.id ?? "none") : "none");
          }
        }
      }
    }
  });

  it("throws no die that turns nothing: each die thrown changes the draw between its two ends", () => {
    const turns = <T>(draw: (rng: Rng) => T, label: string): void => {
      for (const u of [EPS, 1 - EPS]) {
        for (const die of run(draw, () => u).thrown) {
          const low = run(draw, (p) => (p === die ? EPS : u)).outcome;
          const high = run(draw, (p) => (p === die ? 1 - EPS : u)).outcome;
          expect(low, `${label}: ${die}`).not.toBe(high);
        }
      }
    };
    for (const s of CLASSES) {
      for (const { coverage } of hostShares(s)) {
        for (const creeper of [false, true]) {
          turns((rng) => drawPressure(rng, coverage, s, { creeper }), `${said(s)}, ${coverage.id}`);
        }
      }
      for (const plan of PLANS) {
        const rLine = lineGameRate(s, plan);
        for (const { call } of planCalls(s, plan)) {
          turns((rng) => drawLineGame(rng, call, s, rLine), `${said(s)}, ${call.id}`);
        }
      }
    }
  });

  it("forks its dice as children of the Rng given, so the caller's labels are defense-pressure/blitz and defense-line/wears", () => {
    const s: PlaySituation = { down: 1, distance: 10, ballOn: 50, twoMinute: false };
    const pressure = run((rng) => drawPressure(rng.fork("defense-pressure"), NICKEL_COVER_3_SKY, s, { creeper: true }), () => 1 - EPS);
    expect(pressure.thrown).toEqual(["defense-pressure/blitz", "defense-pressure/creeper"]);
    const line = run((rng) => drawLineGame(rng.fork("defense-line"), NICKEL_COVER_3_SKY, s, 0.3), () => EPS);
    expect(line.thrown).toEqual(["defense-line/wears", "defense-line/which"]);
  });
});

// --- the sampler realises the law --------------------------------------------------------------

interface Leaf {
  readonly outcome: string;
  readonly measure: number;
}

/**
 * Every outcome of a draw, with its measure, found by answering each die at its stated breakpoints
 * ± 1e-9. Between two breakpoints the draw must give the same outcomes at both ends; the interval's
 * length is its measure. So a die cut anywhere else, or its outcomes put in the wrong intervals,
 * shows here.
 */
function enumerate(draw: (rng: Rng) => string, cuts: (die: string) => readonly number[] | undefined): readonly Leaf[] {
  const walk = (script: ReadonlyMap<string, number>): Leaf[] => {
    try {
      return [{ outcome: run(draw, (p) => script.get(p)).outcome, measure: 1 }];
    } catch (error) {
      if (!(error instanceof Unscripted)) throw error;
      const inner = cuts(error.path);
      if (inner === undefined) throw new Error(`the draw throws a die its law does not name: ${error.path}`);
      const points = [0, ...inner, 1];
      const leaves: Leaf[] = [];
      for (let i = 1; i < points.length; i += 1) {
        const lo = points[i - 1] ?? NaN;
        const hi = points[i] ?? NaN;
        if (!(hi > lo)) continue;
        expect(hi - lo, `${error.path} on [${lo}, ${hi})`).toBeGreaterThan(2 * EPS);
        const atLow = walk(new Map([...script, [error.path, lo + EPS]]));
        const atHigh = walk(new Map([...script, [error.path, hi - EPS]]));
        expect(atHigh, `${error.path} on [${lo}, ${hi}) gives one answer`).toEqual(atLow);
        for (const leaf of atLow) leaves.push({ outcome: leaf.outcome, measure: leaf.measure * (hi - lo) });
      }
      return leaves;
    }
  };
  return walk(new Map());
}

const cumulative = (shares: readonly number[]): readonly number[] => {
  const out: number[] = [];
  let sum = 0;
  for (const share of shares.slice(0, -1)) {
    sum += share;
    out.push(sum);
  }
  return out;
};

function integrate(leaves: readonly Leaf[]): ReadonlyMap<string, number> {
  const measure = new Map<string, number>();
  for (const leaf of leaves) measure.set(leaf.outcome, (measure.get(leaf.outcome) ?? 0) + leaf.measure);
  return measure;
}

function expectLaw(got: ReadonlyMap<string, number>, want: ReadonlyMap<string, number>, label: string): void {
  const positive = (m: ReadonlyMap<string, number>): string[] => [...m].filter(([, w]) => w > 0).map(([k]) => k).sort();
  expect(positive(got), label).toEqual(positive(want));
  for (const [outcome, w] of want) {
    expect(Math.abs((got.get(outcome) ?? 0) - w), `${label}: ${outcome}`).toBeLessThanOrEqual(1e-12);
  }
}

describe("CC3 — the sampler realises the law, exactly, in every situation class", () => {
  it("selectCoverage's die, at v5's own breakpoints, gives each host its share", () => {
    for (const s of CLASSES) {
      const pool = v5Pool(s);
      const total = pool.reduce((a, c) => a + c.usage.weight, 0);
      const leaves = enumerate(
        (rng) => selectCoverage(rng, s).id,
        (die) => (die === "" ? cumulative(pool.map((c) => c.usage.weight / total)) : undefined),
      );
      expectLaw(integrate(leaves), new Map(hostShares(s).map((x) => [x.coverage.id, x.share])), said(s));
    }
  });

  it("drawPressure gives each pressure r_s × its mix, the creeper CREEPER_RATE of the rest, over every host", () => {
    let checked = 0;
    for (const s of CLASSES) {
      const rs = blitzRate(s);
      for (const { coverage } of hostShares(s)) {
        const mix = pressureMix(coverage, s);
        for (const creeper of [false, true]) {
          const leaves = enumerate(
            (rng) => idOf(drawPressure(rng, coverage, s, { creeper })),
            (die) => {
              if (die === "blitz") return [rs];
              if (die === "which") return cumulative(mix.map((m) => m.share));
              if (die === "creeper") return [CREEPER_RATE];
              return undefined;
            },
          );
          const r = mix.length > 0 ? rs : 0;
          const creeps = creeper && CREEPER_HOSTS.includes(coverage.id);
          const want = new Map<string, number>(mix.map((m) => [m.pressure.id, r * m.share]));
          if (creeps) want.set(`${coverage.id}+CREEPER`, (1 - r) * CREEPER_RATE);
          want.set("none", (1 - r) * (creeps ? 1 - CREEPER_RATE : 1));
          expectLaw(integrate(leaves), want, `${said(s)}, ${coverage.id}, creeper ${String(creeper)}`);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("drawLineGame gives each line game r_line × its mix, on every call of every plan", () => {
    let checked = 0;
    for (const s of CLASSES) {
      for (const plan of PLANS) {
        const rLine = lineGameRate(s, plan);
        for (const { call } of planCalls(s, plan)) {
          const mix = lineGameMix(call, s);
          const leaves = enumerate(
            (rng) => idOf(drawLineGame(rng, call, s, rLine)),
            (die) => {
              if (die === "wears") return [rLine];
              if (die === "which") return cumulative(mix.map((m) => m.share));
              return undefined;
            },
          );
          const r = mix.length > 0 ? rLine : 0;
          const want = new Map<string, number>(mix.map((m) => [m.game.id, r * m.share]));
          want.set("none", 1 - r);
          expectLaw(integrate(leaves), want, `${said(s)}, ${planName(plan)}, ${call.id}`);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(600);
  });
});

// --- loud failures, and determinism ------------------------------------------------------------

describe("Charter §4.1 — the draws refuse loudly what they cannot draw", () => {
  const s: PlaySituation = { down: 1, distance: 10, ballOn: 50, twoMinute: false };

  it("refuses a card that is no v6 coverage as the coverage", () => {
    expect(() => coverageDrawWeight(NICKEL_FIRE_ZONE, s)).toThrow(PlaybookError);
    expect(() => pressureMix(NICKEL_FIRE_ZONE, s)).toThrow(PlaybookError);
    expect(() => drawPressure(createRng("c3", "p"), NICKEL_FIRE_ZONE, s, { creeper: true })).toThrow(PlaybookError);
  });

  it("refuses a call no composition reaches as the call a line game is drawn on", () => {
    const stranger: AnyDefensiveCard = { ...NICKEL_COVER_3_SKY, id: "DEF_NOT_A_CALL" };
    expect(() => lineGameMix(stranger, s)).toThrow(PlaybookError);
    expect(() => drawLineGame(createRng("c3", "l"), stranger, s, 0.3)).toThrow(PlaybookError);
  });

  it.each([1.5, -0.1, Number.NaN])("refuses r_line = %s", (rLine) => {
    expect(() => drawLineGame(createRng("c3", "l"), NICKEL_COVER_3_SKY, s, rLine)).toThrow(PlaybookError);
  });
});

describe("Iron Rule 4 — the same Rng address gives the same composed call", () => {
  /** A snap's defence as caller v6 will draw it: coverage, pressure, line game, each on its own fork. */
  function compose(snap: Rng, s: PlaySituation, plan: DrawPlan): string {
    if (plan.pressures === "BOUND") {
      const card = selectDefensiveCard(snap.fork("defense-card"), s);
      const game = drawLineGame(snap.fork("defense-line"), card, s, lineGameRate(s, plan));
      return `${card.id}|${game?.id ?? "NONE"}`;
    }
    const coverage = selectCoverage(snap.fork("defense-card"), s);
    const pressure = drawPressure(snap.fork("defense-pressure"), coverage, s, { creeper: plan.creeper });
    const call = none(coverage.id, pressure?.pressure);
    const game = drawLineGame(snap.fork("defense-line"), call, s, lineGameRate(s, plan));
    const entry = COMPOSED[composedKey(coverage.id, pressure?.pressure, game?.id ?? "NONE")];
    if (entry === undefined) throw new Error("a draw reached no composition");
    return entry.key;
  }

  it("draws the same call twice from one address, on every plan and class", () => {
    for (const s of CLASSES) {
      for (const plan of PLANS) {
        const seen = new Set<string>();
        for (let i = 0; i < 60; i += 1) {
          const seed = `c3-det-${String(i)}`;
          const once = compose(createRng(seed, "call:1"), s, plan);
          expect(compose(createRng(seed, "call:1"), s, plan), `${said(s)}, ${planName(plan)}, ${seed}`).toBe(once);
          seen.add(once);
        }
        expect(seen.size, `${said(s)}, ${planName(plan)}`).toBeGreaterThan(5);
      }
    }
  });

  it("draws each part on its own fork: throwing the line game first changes neither the coverage nor the pressure", () => {
    const s: PlaySituation = { down: 3, distance: 8, ballOn: 35, twoMinute: false };
    for (let i = 0; i < 100; i += 1) {
      const a = createRng(`c3-order-${String(i)}`, "call:1");
      const b = createRng(`c3-order-${String(i)}`, "call:1");
      const lineFirst = drawLineGame(b.fork("defense-line"), NICKEL_COVER_3_SKY, s, 0.3);
      const coverageA = selectCoverage(a.fork("defense-card"), s);
      const coverageB = selectCoverage(b.fork("defense-card"), s);
      expect(coverageB).toBe(coverageA);
      expect(drawPressure(b.fork("defense-pressure"), coverageB, s, { creeper: true })).toBe(
        drawPressure(a.fork("defense-pressure"), coverageA, s, { creeper: true }),
      );
      expect(drawLineGame(a.fork("defense-line"), NICKEL_COVER_3_SKY, s, 0.3)).toBe(lineFirst);
    }
  });
});
