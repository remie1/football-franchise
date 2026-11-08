/**
 * MADE-UP PLAYERS' STARTING DEVELOPMENT (ADR-087 §2.5 "Made-up players", P1, P2, P6; D2).
 *
 * What the generator (`generate.ts`) and the draft class maker (`draftClass.ts`) add to a player
 * when their `development` option is on:
 *   - `attributes.development` (P1, hidden): his growth rate, drawn (`drawGrowth`); his career
 *     snaps, from his seasons in the league (his draft line, which the generator sets from his
 *     age) and his roster slot (0 for a prospect or a rookie); no unshown progress yet; and his
 *     body now, which is the measurements he was rated from, so his speed and his 40 agree;
 *   - `personality.patience` (P6, hidden): how many seasons, 0 to 2, he waits for a call once he is
 *     unsigned before he retires (§6.1), the placeholder until Spec #14's needs set it;
 *   - for a prospect, `bio.combine` (P2, public): his combine drills, frozen from draft day;
 *   - with the `aging` option at `"ability"` (ADR-087 §12.1, §12.2.3, P7): `development.fadeShift`,
 *     how many years earlier or later than usual each of his 12 ability groups starts to fade
 *     (`drawFadeShift`). At `"position"`, the default, it stays absent;
 *   - with the `aging` option at `"ability"` (ADR-087 §12.5, AB4): a rookie's age (`drawRookieAge`), on
 *     his development stream's `"age"` fork, which the generator and the class maker put on his bio.
 *     At `"position"`, today's ages.
 *
 * Every draw comes from the player's own stream (the caller forks it by player id), split again by
 * what it is for, so switching development on moves no name, rating, age or depth chart, and adding
 * one draw here never moves another. A fork is made by its label alone and takes nothing from the
 * stream it is forked from (contracts' `createRng`), so the `"aging"` and `"age"` forks move none of
 * the `"growth"`, `"snaps"` and `"patience"` draws.
 */
import { ABILITY_GROUPS, type AbilityGroup, type PlayerBio, type PlayerDevelopment, type PlayerState, type Rng } from "@ff/contracts";
import type { Measurements } from "./derive.js";

/**
 * How a man ages (ADR-087 §12.1, the `aging` option): by his listed position's profile (§2.4, the
 * default while the ability path is built), or by the 12 ability groups (§12.2). In attributes it
 * picks whether each player gets his own fade shifts (AB2) and, from AB4, the rookies' ages (§12.5).
 */
export type AgingOption = "position" | "ability";

/**
 * His growth rate (§2.1): lognormal, so it is always positive and a fast learner is as far above
 * typical as a slow one is below it in ratio. 1 = typical. CHOSEN (tuned in D5), provenance NONE.
 */
export const GROWTH = {
  /** The typical player's growth rate. */
  median: 1,
  /** Spread of the rate's logarithm: about two players in three fall between 0.78 and 1.28. */
  sdLog: 0.25,
} as const;

/**
 * Career snaps a generated veteran has already played (§2.5: "from age for generated veterans").
 * CHOSEN (tuned in D5), provenance NONE.
 */
export const CAREER_SNAPS = {
  /**
   * Snaps a season, by the roster slot he was drawn for (`generate.ts`'s `SLOT_TALENT`: a team's
   * first player at a position is drafted to start, its second backs him up, the rest are depth).
   * A starter's 800 is short of an every-down season, to allow for games missed and rotation.
   */
  perSeasonBySlot: [800, 300, 100],
  /**
   * The age an undrafted player came into the league, for his seasons in it. The same 22 the
   * generator's draft line uses (`generate.ts` `draftFor`: drafted in `season - (age - 22)`) and
   * franchise reads back (`draft/cutdown.ts` `seasonsIn`), so his career snaps, his draft year and
   * his learning rate all count the same seasons. Not a tunable: it follows `draftFor`.
   */
  undraftedEntryAge: 22,
  /** Spread of the logarithm of his snaps around his slot's total: careers vary a little. */
  noiseSdLog: 0.2,
} as const;

/**
 * P6's placeholder: his patience, in seasons, is a flat draw between none and two. The range is
 * RULED (ADR-087 F2: "up to two seasons"); the flat shape is CHOSEN until Spec #14's needs set it.
 * `decimals`: places kept, the same 2 as franchise's own patience draw for a free agent who has
 * none (`players/unsigned.ts` `PATIENCE.decimals`), so the two placeholders are the same kind of number.
 */
export const PATIENCE_SEASONS = { min: 0, max: 2, decimals: 2 } as const;

/**
 * Each man's own fade shifts (ADR-087 §12.2.3, P7): years earlier (minus) or later (plus) than usual
 * that each ability group starts to fade, fixed for life. All CHOSEN (the plan doc's guesses), provenance
 * NONE: no real data shows a man's own clock.
 *   - `body`: the four body groups share one clock draw `c`, so a man whose speed goes early tends to
 *     lose his quickness, spring and strength early too. A body group's z is `√ρ·c + √(1−ρ)·e_g`, with
 *     `rho` = 0.5 (so any two body groups correlate about 0.5); every other group's z is its own `e_g`.
 *   - `zClamp`: the combined z is clamped at ±2.5, as the toy does (`cohort.ts` `drawDeltas`). Clamping
 *     `c` and `e_g` one by one would let a body group's z reach ±3.54.
 *   - `sd`: the spread in years, by group: 1.5 for the body groups, 2 for ARM and LEG, 1 for TECHNIQUE,
 *     1.5 for STAMINA, DURABILITY, PASSING, KICKING and SMARTS.
 *   - `decimals`: each shift is stored rounded to 2 places (keeps saves small and diffs readable).
 */
export const FADE_SHIFT = {
  body: ["SPEED", "QUICKNESS", "SPRING", "STRENGTH"],
  rho: 0.5,
  zClamp: 2.5,
  sd: {
    SPEED: 1.5, QUICKNESS: 1.5, SPRING: 1.5, STRENGTH: 1.5, ARM: 2, LEG: 2,
    STAMINA: 1.5, DURABILITY: 1.5, TECHNIQUE: 1, PASSING: 1.5, KICKING: 1.5, SMARTS: 1.5,
  },
  decimals: 2,
} as const satisfies {
  body: readonly AbilityGroup[]; rho: number; zClamp: number; sd: Readonly<Record<AbilityGroup, number>>; decimals: number;
};

/**
 * Standard normal draw (Box-Muller): the same draw as `generate.ts`'s `gauss`, kept here so the two
 * modules do not import each other.
 */
function normal(rng: Rng): number {
  const u = 1 - rng.next();
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** His growth rate, fixed for life (§2.1): lognormal with median `GROWTH.median`. */
export function drawGrowth(rng: Rng): number {
  return GROWTH.median * Math.exp(GROWTH.sdLog * normal(rng));
}

/** His patience, in seasons (P6), kept to `PATIENCE_SEASONS.decimals` places. */
export function drawPatience(rng: Rng): number {
  const x = PATIENCE_SEASONS.min + (PATIENCE_SEASONS.max - PATIENCE_SEASONS.min) * rng.next();
  const scale = 10 ** PATIENCE_SEASONS.decimals;
  return Math.round(x * scale) / scale;
}

/**
 * His fade shift for every one of the 12 ability groups (§12.2.3), in `ABILITY_GROUPS` order, drawn
 * from `rng`, his own `"aging"` stream: the body clock from its `"clock"` fork and each group's own
 * draw from a fork named for the group, so the draws never depend on the order they are made in and
 * adding a group never moves another. Reads nothing about him (no position): the same stream gives
 * the same shifts whoever he is.
 */
export function drawFadeShift(rng: Rng): Record<AbilityGroup, number> {
  const clock = normal(rng.fork("clock"));
  const body = FADE_SHIFT.body as readonly AbilityGroup[];
  const scale = 10 ** FADE_SHIFT.decimals;
  const out = {} as Record<AbilityGroup, number>;
  for (const g of ABILITY_GROUPS) {
    const own = normal(rng.fork(g));
    const z = body.includes(g) ? Math.sqrt(FADE_SHIFT.rho) * clock + Math.sqrt(1 - FADE_SHIFT.rho) * own : own;
    const clamped = Math.max(-FADE_SHIFT.zClamp, Math.min(FADE_SHIFT.zClamp, z));
    const shift = Math.round(FADE_SHIFT.sd[g] * clamped * scale) / scale;
    // No −0: a stored shift reads back from JSON as 0, so the record in memory is the record in the file.
    out[g] = shift === 0 ? 0 : shift;
  }
  return out;
}

/**
 * A made-up rookie's age (ADR-087 §12.5, AB4; the `aging` option at `"ability"` with growth on).
 *   - `draftDay`: the share of a class at each whole age on draft day, computed from REAL (rookies on
 *     week-8 53s, 2018-24: 20 and under 0.2%, 21 12.8%, 22 31.5%, 23 35.4%, 24 16.6%, 25 2.9%, 26 and
 *     over 0.6%; mean 22.67). Sim ages go up one at the year turn before his first camp (franchise's
 *     `turnYear`), so draft day is a year younger, and the 20-and-under sliver is folded into 20. The
 *     shares' mean is 21.667, a year under the REAL week-8 mean.
 *   - `rho`: how strongly age runs against talent, so the less talented, who go undrafted, run older
 *     (REAL: with fractional ages, drafted rookies on week-8 53s average 23.01 and undrafted 23.63, 0.62
 *     older). A Gaussian copula: `z_age = −rho·z_talent + √(1−rho²)·e`, read through `draftDay`. CHOSEN
 *     (fitted): from §12.5's starting GUESS 0.3, set once by a calibration run of the walk's first draft
 *     (the stand-in league, 10 seeds, every game a seeded coin) so that the undrafted signees average
 *     0.62 years older than the men drafted: 0.616 expected at 0.57, with each man's own age draw
 *     integrated out (MEASURED; 0.329 at the GUESS). ADR-087 §12.9, the AB4 note.
 */
export const ROOKIE_AGE = {
  draftDay: [
    { age: 20, share: 0.13 }, { age: 21, share: 0.315 }, { age: 22, share: 0.354 },
    { age: 23, share: 0.166 }, { age: 24, share: 0.029 }, { age: 25, share: 0.006 },
  ],
  rho: 0.57,
} as const satisfies { draftDay: readonly { age: number; share: number }[]; rho: number };

/**
 * The standard normal's cumulative distribution, Φ(x), from the complementary error function's
 * Chebyshev fit (Numerical Recipes' `erfcc`: fractional error under 1.2e-7 everywhere). Only places a
 * draw against `ROOKIE_AGE.draftDay`'s cumulative shares, so that error moves no age but at a boundary.
 */
export function normalCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * z);
  const erfc = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418
    + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - 0.5 * erfc : 0.5 * erfc;
}

/**
 * His draft-day age (§12.5): his talent's own standard score `talentZ` (the draw his talent is made
 * from, before his class's year and depth are added, so no position is read) linked to a fresh draw
 * from `rng`, his own `"age"` stream, through `ROOKIE_AGE`. A whole year, 20 to 25. The same stream and
 * talent give the same age whoever he is.
 */
export function drawRookieAge(rng: Rng, talentZ: number, rho: number = ROOKIE_AGE.rho): number {
  const z = -rho * talentZ + Math.sqrt(1 - rho * rho) * normal(rng);
  const u = normalCdf(z);
  let below = 0;
  for (const { age, share } of ROOKIE_AGE.draftDay) {
    below += share;
    if (u < below) return age;
  }
  return ROOKIE_AGE.draftDay[ROOKIE_AGE.draftDay.length - 1]!.age;
}

/**
 * Seasons he has played before `season`, read from his bio the way franchise reads them
 * (`draft/cutdown.ts` `seasonsIn`): his credited seasons when kept, else the seasons since his
 * draft year, else (undrafted) his age less `CAREER_SNAPS.undraftedEntryAge`. Never below 0. A
 * prospect has played none. So a player drafted this season is a rookie here too (§2.5: "career
 * snaps 0 for rookies"), and a kicker the generator says was drafted last year has played one.
 */
export function seasonsPlayed(bio: Pick<PlayerBio, "age" | "draft" | "creditedSeasons">, season: number): number {
  if (bio.draft === "PROSPECT") return 0;
  if (bio.creditedSeasons !== undefined) return Math.max(0, bio.creditedSeasons);
  if (typeof bio.draft === "object") return Math.max(0, season - bio.draft.year);
  return Math.max(0, bio.age - CAREER_SNAPS.undraftedEntryAge);
}

/** Career snaps for `seasons` played in roster slot `slot`: his slot's snaps a season × his seasons, with a little noise. Whole snaps. */
export function careerSnaps(rng: Rng, seasons: number, slot: number): number {
  if (seasons <= 0) return 0;
  const bySlot = CAREER_SNAPS.perSeasonBySlot;
  const perSeason = bySlot[Math.max(0, Math.min(slot, bySlot.length - 1))]!;
  return Math.round(perSeason * seasons * Math.exp(CAREER_SNAPS.noiseSdLog * normal(rng)));
}

/** His body now (P1): the four drills he was rated from. */
export function bodyFrom(m: Measurements): PlayerDevelopment["body"] {
  return { forty: m.forty, cone: m.cone, vertical: m.vertical, bench: m.bench };
}

/** His public combine record (P2): the same four drills, a separate object that never changes. */
export function combineFrom(m: Measurements): NonNullable<PlayerBio["combine"]> {
  return { forty: m.forty, cone: m.cone, vertical: m.vertical, bench: m.bench };
}

export interface StartingDevelopment {
  /** His measurements: what he was rated from. */
  readonly measurements: Measurements;
  /**
   * A generated league player's career so far, for his career snaps: the roster slot he was drawn
   * for (0 = drafted to start) and the season the league is made for. Absent for a prospect, who
   * has played none.
   */
  readonly career?: { readonly slot: number; readonly season: number };
  /**
   * The generator's `aging` option (§12.1). `"ability"` draws his fade shifts (`drawFadeShift`) on
   * his `"aging"` fork; absent or `"position"`, none are drawn and `fadeShift` stays absent.
   */
  readonly aging?: AgingOption;
}

/**
 * The player with his development record and patience added, drawn from `rng`, his own stream. A
 * prospect (`bio.draft === "PROSPECT"`) has no career snaps and gets his combine record on his bio.
 * With `start.aging` at `"ability"`, the record also carries his fade shifts. Nothing else about him
 * changes. Does not change `player`.
 */
export function withDevelopment(player: PlayerState, rng: Rng, start: StartingDevelopment): PlayerState {
  const prospect = player.bio.draft === "PROSPECT";
  const growth = drawGrowth(rng.fork("growth"));
  const snaps = prospect || start.career === undefined
    ? 0
    : careerSnaps(rng.fork("snaps"), seasonsPlayed(player.bio, start.career.season), start.career.slot);
  const patience = drawPatience(rng.fork("patience"));
  const development: PlayerDevelopment = {
    growth, snaps, carry: {}, body: bodyFrom(start.measurements),
    ...(start.aging === "ability" ? { fadeShift: drawFadeShift(rng.fork("aging")) } : {}),
  };
  return {
    ...player,
    bio: prospect ? { ...player.bio, combine: combineFrom(start.measurements) } : player.bio,
    attributes: { ...player.attributes, development },
    personality: { ...player.personality, patience },
  };
}
