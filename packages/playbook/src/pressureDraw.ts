/**
 * THE v6 DRAWS — ADR-073 §2.6's dice, and the rates they hold by construction.
 *
 * Caller v6 draws a call in parts (`coverageCatalogue.ts` states the parts): the coverage on the
 * caller's `defense-card` fork, then the pressure over it on `defense-pressure`, then the line
 * game on `defense-line`. This module throws those dice and states their law. Nothing on caller
 * v1–v5's path calls it. Its two tables (`STATED_BY`, `LEGAL_BY_CALL`) are built when the module
 * loads, though, in every process that imports `@ff/playbook`, v1–v5's included: pure, they draw
 * nothing and move no v1–v5 die, but a book card that stunts in none of the five line games
 * throws at load for every caller (the suite fails on it first).
 *
 * ================== THE LAW ==================
 *
 * **The coverage** is v5's card, drawn exactly as v5 draws it, folded onto the coverage that
 * hosts it (`selectCoverage`). So host h's share in situation s is (h's own weight + the weights
 * of the pressure cards it hosts that apply in s) ÷ W, W being v5's total in s (ADR-073 §2.6
 * step 1), and on every snap v6's coverage is the host of the card v5 would have called.
 *
 * **The pressure** (`drawPressure`): on a coverage that hosts a pressure applying in s, a
 * five-or-more pressure with probability r_s = (the decomposed cards' weight in s) ÷ (the hosts'
 * draw weight in s), one r_s shared by every host in s (§2.6, "rates held by construction"), so
 * P(five or more) is v5's card-weight share exactly. Which pressure, in proportion to the hosted
 * cards' own weights. With no five-or-more pressure drawn over a creeper host, the creeper on
 * `CREEPER_RATE` of them. Cover 0 Blitz is a bound coverage and counts on its own.
 *
 * **The line game** (`drawLineGame`): on a call that can wear a legal line game in s, one with
 * probability r_line = (v5's stunting card weight in s) ÷ (the draw weight of the calls in s that
 * can wear one) — so the line-game share is v5's exactly — and which one, in proportion to the
 * summed weight in s of the book's cards that state it (step 3.4's reading of §2.6's "today's
 * complexity weights"). A pattern no card stating it applies in s has no weight there, so it is
 * not drawn and does not count as one a call can wear.
 *
 * ================== THE DICE ==================
 *
 * Each die is one `weightedPick` (a yes/no die is a two-item pick weighing r and 1 − r), so each
 * consumes one `next()` and `distribution.ts` stays the only module that consumes randomness. No
 * die is thrown that would turn nothing (ADR-005): `blitz` only over a coverage hosting a
 * pressure that applies; `which` only between two or more; `creeper` only over a creeper host
 * with no five-or-more pressure drawn, and only when the creeper is on; `wears` only on a call
 * with a line game it can wear; `which` only between two or more. `drawPressure` and
 * `drawLineGame` throw each die on its own child of the Rng they are given, and none on that Rng
 * itself; `selectCoverage` throws v5's one die on the Rng it is given, as v5 does.
 *
 * The analytic exports (`hostShares`, `blitzRate`, `pressureMix`, `lineGameRate`,
 * `lineGameMix`) are the law the dice realise, for the tests and the harness.
 */
import type { Rng } from "@ff/contracts";
import {
  COMPOSED,
  CREEPER_SPECS,
  HOST_OF,
  LINE_GAMES,
  PRESSURE_SPECS,
  V6_COVERAGES,
  composedKey,
  type CreeperSpec,
  type HostedPressure,
  type LineGame,
  type PressureSpec,
} from "./coverageCatalogue.js";
import type { AnyDefensiveCard, StuntSpec } from "./defense.js";
import { DEFENSIVE_CARDS } from "./defensiveCards.js";
import type { PlaySituation, SituationalUsage } from "./distribution.js";
import { CREEPER_RATE, usageApplies, weightedPick } from "./distribution.js";
import { PlaybookError } from "./errors.js";
import type { PressureTagId } from "./tags.js";
import { applicableDefensiveCards, selectDefensiveCard } from "./selection.js";

// --- the pieces the law reads ------------------------------------------------------------------

/** As `selection.ts` reads a card's usage: a positive weight whose limits allow s. */
const appliesIn = (usage: SituationalUsage, situation: PlaySituation): boolean =>
  usage.weight > 0 && usageApplies(usage, situation);

const said = (s: PlaySituation): string =>
  `${s.down} and ${s.distance} at ${s.ballOn}${s.twoMinute ? " (two-minute)" : ""}`;

const COVERAGE_BY_ID: ReadonlyMap<string, AnyDefensiveCard> = new Map(V6_COVERAGES.map((c) => [c.id, c]));

/** The pressures each coverage hosts, in the book's order. */
const PRESSURES_OVER: ReadonlyMap<string, readonly PressureSpec[]> = new Map(
  V6_COVERAGES.map((c) => [c.id, PRESSURE_SPECS.filter((spec) => spec.over === c.id)]),
);

const CREEPER_OVER: ReadonlyMap<string, CreeperSpec> = new Map(CREEPER_SPECS.map((spec) => [spec.over, spec]));

function v6Coverage(card: AnyDefensiveCard): AnyDefensiveCard {
  const coverage = COVERAGE_BY_ID.get(card.id);
  if (coverage === undefined) throw new PlaybookError(`${card.id} is no v6 coverage`);
  return coverage;
}

function hostedIn(coverage: AnyDefensiveCard, situation: PlaySituation): readonly PressureSpec[] {
  return (PRESSURES_OVER.get(coverage.id) ?? []).filter((spec) => appliesIn(spec.usage, situation));
}

const weightOf = (pressures: readonly PressureSpec[]): number => pressures.reduce((a, p) => a + p.usage.weight, 0);

function checkedRate(rate: number, name: string, situation: PlaySituation): number {
  if (!(Number.isFinite(rate) && rate >= 0 && rate <= 1)) {
    throw new PlaybookError(`${name} = ${rate} at ${said(situation)} is no rate`);
  }
  return rate;
}

const YES_NO: readonly boolean[] = [true, false];

/** A yes/no die: one two-item pick, yes with weight `rate`, no with `1 − rate`. */
function yes(rng: Rng, rate: number): boolean {
  return weightedPick(rng, YES_NO, (answer) => (answer ? rate : 1 - rate));
}

// --- the coverage ------------------------------------------------------------------------------

/**
 * A coverage's draw weight in s (ADR-073 §2.6 step 1): its own weight where it applies, plus the
 * weights of the pressure cards it hosts that apply. `DIME_COVER_1`'s own weight is 0, so its
 * draw weight is Dime Man Pressure's.
 */
export function coverageDrawWeight(card: AnyDefensiveCard, situation: PlaySituation): number {
  const coverage = v6Coverage(card);
  const own = appliesIn(coverage.usage, situation) ? coverage.usage.weight : 0;
  return own + weightOf(hostedIn(coverage, situation));
}

/**
 * The coverage (ADR-073 §2.6 step 1): v5's card, drawn on the caller's `defense-card` fork with
 * v5's own die, folded onto its host. One die, today's.
 *
 * Its law is §2.6's: every card a host carries folds onto it, so P(h) = (h's own weight + its
 * applicable hosted weights) ÷ W. Drawing v5's card rather than weighing the catalogue keeps
 * `selection.ts`'s guards: no weight-0 card is ever a candidate, and nothing weighs an all-zero
 * pool.
 */
export function selectCoverage(rng: Rng, situation: PlaySituation): AnyDefensiveCard {
  const card = selectDefensiveCard(rng, situation);
  const host = COVERAGE_BY_ID.get(HOST_OF[card.id] ?? "");
  if (host === undefined) throw new PlaybookError(`${card.id} folds onto no v6 coverage`);
  return host;
}

/** A coverage and its share of the calls in s. */
export interface CoverageShare {
  readonly coverage: AnyDefensiveCard;
  readonly share: number;
}

/** Each v6 coverage's share in s, in `V6_COVERAGES`' order; the coverages s cannot draw are left out. */
export function hostShares(situation: PlaySituation): readonly CoverageShare[] {
  const weighed = V6_COVERAGES.map((coverage) => ({ coverage, weight: coverageDrawWeight(coverage, situation) }));
  const total = weighed.reduce((a, x) => a + x.weight, 0);
  if (total <= 0) throw new PlaybookError(`no coverage applies to ${said(situation)}`);
  return weighed.filter((x) => x.weight > 0).map((x) => ({ coverage: x.coverage, share: x.weight / total }));
}

// --- the pressure ------------------------------------------------------------------------------

/**
 * r_s (ADR-073 §2.6, "rates held by construction"): the weight in s of the five decomposed
 * pressure cards, over the draw weight in s of the coverages hosting one that applies. One rate,
 * shared by every host in s. 0 where no pressure applies (no host, so no die). Cover 0 Blitz is
 * a bound coverage and is in neither sum.
 */
export function blitzRate(situation: PlaySituation): number {
  let pressures = 0;
  let hosts = 0;
  for (const coverage of V6_COVERAGES) {
    const hosted = hostedIn(coverage, situation);
    if (hosted.length === 0) continue;
    pressures += weightOf(hosted);
    hosts += coverageDrawWeight(coverage, situation);
  }
  return hosts === 0 ? 0 : pressures / hosts;
}

/** A pressure and its share of the five-or-more pressures drawn over one coverage. */
export interface PressureShare {
  readonly pressure: PressureSpec;
  readonly share: number;
}

/**
 * The `which` law over a coverage in s: each hosted pressure that applies, in the book's order,
 * in proportion to its card's own weight. Conditional on a five-or-more pressure being drawn,
 * which happens with probability `blitzRate(s)`. Empty where the coverage hosts none that applies.
 */
export function pressureMix(coverage: AnyDefensiveCard, situation: PlaySituation): readonly PressureShare[] {
  const hosted = hostedIn(v6Coverage(coverage), situation);
  const total = weightOf(hosted);
  return hosted.map((pressure) => ({ pressure, share: pressure.usage.weight / total }));
}

export interface PressureDrawOptions {
  /** Whether the creeper is drawn (`/creeper-0` turns it off). */
  readonly creeper: boolean;
}

/**
 * The pressure over a drawn coverage (ADR-073 §2.6 step 2), on the Rng it is given (the caller's
 * `defense-pressure` fork, or the huddle's `anticipated-front/pressure`). Its dice are that Rng's
 * children:
 *
 *  - `blitz`, over a coverage hosting a pressure that applies in s: a five-or-more pressure with
 *    probability r_s;
 *  - `which`, when two or more apply (only Cover 3 Sky hosts two): in proportion to their cards'
 *    weights;
 *  - `creeper`, when no five-or-more pressure was drawn, the coverage hosts a creeper and the
 *    creeper is on: a creeper with probability `CREEPER_RATE`.
 *
 * Returns the pressure laid over the coverage, or `undefined` for none: then the call is exactly
 * the coverage (§2.6, "why this beats a carved card").
 */
export function drawPressure(
  rng: Rng,
  coverage: AnyDefensiveCard,
  situation: PlaySituation,
  options: PressureDrawOptions,
): HostedPressure | undefined {
  const host = v6Coverage(coverage);
  const hosted = hostedIn(host, situation);
  if (hosted.length > 0 && yes(rng.fork("blitz"), checkedRate(blitzRate(situation), "r_s", situation))) {
    const [only] = hosted;
    if (hosted.length === 1 && only !== undefined) return only;
    return weightedPick(rng.fork("which"), hosted, (pressure) => pressure.usage.weight);
  }
  const creeper = CREEPER_OVER.get(host.id);
  if (options.creeper && creeper !== undefined && yes(rng.fork("creeper"), CREEPER_RATE)) return creeper;
  return undefined;
}

// --- the line game -----------------------------------------------------------------------------

/** Which composed calls the line-game rate is taken over. */
export type DrawPlan =
  /** The pressures bound: v5's cards, stunts stripped (the front arm). */
  | { readonly pressures: "BOUND" }
  /** The pressures drawn over the coverage, with or without the creeper. */
  | { readonly pressures: "DRAWN"; readonly creeper: boolean };

const sameStunts = (a: readonly StuntSpec[], b: readonly StuntSpec[]): boolean =>
  a.length === b.length &&
  a.every((s, i) => {
    const t = b[i];
    return t !== undefined && s.penetrator === t.penetrator && s.looper === t.looper && s.complexity === t.complexity;
  });

/** Each book card that stunts, to the line game it states. Every one states one of the five. */
const STATED_BY: readonly { readonly card: AnyDefensiveCard; readonly game: LineGame }[] = DEFENSIVE_CARDS.flatMap(
  (card) => {
    const stunts = card.stunts ?? [];
    if (stunts.length === 0) return [];
    const game = LINE_GAMES.find((g) => sameStunts(g.stunts, stunts));
    if (game === undefined) throw new PlaybookError(`${card.id} states a line game that is none of the five`);
    return [{ card, game }];
  },
);

/** A line game's weight in s: the summed weight of the book's cards stating it that apply in s. */
function gameWeight(game: LineGame, situation: PlaySituation): number {
  return STATED_BY.filter((x) => x.game === game && appliesIn(x.card.usage, situation)).reduce(
    (a, x) => a + x.card.usage.weight,
    0,
  );
}

/**
 * Each reachable call's legal line games, read off `COMPOSED`, which holds every legal one under
 * each (coverage, pressure) — so the draw validates nothing per snap. Keyed by the call's id: a
 * composed call's id names its coverage and pressure, and each of the book's 22 cards carries
 * its composition's id.
 */
const LEGAL_BY_CALL: ReadonlyMap<string, readonly LineGame[]> = (() => {
  const legal = new Map<string, LineGame[]>();
  for (const entry of Object.values(COMPOSED)) {
    const games = legal.get(entry.call.id) ?? [];
    legal.set(entry.call.id, games);
    const game = LINE_GAMES.find((g) => g.id === entry.line);
    if (game !== undefined) games.push(game);
  }
  return legal;
})();

function wearable(call: AnyDefensiveCard, situation: PlaySituation): readonly { game: LineGame; weight: number }[] {
  const legal = LEGAL_BY_CALL.get(call.id);
  if (legal === undefined) throw new PlaybookError(`${call.id} is no reachable call; its line games are unknown`);
  return legal.map((game) => ({ game, weight: gameWeight(game, situation) })).filter((x) => x.weight > 0);
}

function composedCall(coverage: AnyDefensiveCard, pressure: PressureTagId | undefined): AnyDefensiveCard {
  const entry = COMPOSED[composedKey(coverage.id, pressure, "NONE")];
  if (entry === undefined) throw new PlaybookError(`no composition ${composedKey(coverage.id, pressure, "NONE")}`);
  return entry.call;
}

/**
 * The share of a plan's calls in s that can wear a line game. Summed coverage by coverage, the
 * creeper's part and its bare call's part weighed together inside each, so that where both can
 * wear one (every creeper host in the book) the sum is the same number with the creeper on or
 * off, and joint and joint-no-creeper share one r_line to the last bit.
 */
function hostableShare(situation: PlaySituation, plan: DrawPlan): number {
  const can = (call: AnyDefensiveCard): number => (wearable(call, situation).length > 0 ? 1 : 0);
  if (plan.pressures === "BOUND") {
    const cards = applicableDefensiveCards(situation);
    const total = cards.reduce((a, c) => a + c.usage.weight, 0);
    return cards.reduce((a, card) => a + (card.usage.weight / total) * can(card), 0);
  }
  const r = blitzRate(situation);
  return hostShares(situation).reduce((sum, { coverage, share }) => {
    const mix = pressureMix(coverage, situation);
    const pressured = mix.reduce((a, m) => a + r * m.share * can(composedCall(coverage, m.pressure.pressure)), 0);
    const bare = can(composedCall(coverage, undefined));
    const unpressured =
      plan.creeper && CREEPER_OVER.has(coverage.id)
        ? CREEPER_RATE * can(composedCall(coverage, "CREEPER")) + (1 - CREEPER_RATE) * bare
        : bare;
    return sum + share * (pressured + (mix.length > 0 ? 1 - r : 1) * unpressured);
  }, 0);
}

/**
 * r_line (ADR-073 §2.6, "rates held by construction"): v5's stunting card share in s, over the
 * share of the plan's calls in s that can wear a line game. So the line-game share in s is v5's
 * exactly. In the front arm the calls are v5's cards stripped (pressures BOUND).
 */
export function lineGameRate(situation: PlaySituation, plan: DrawPlan): number {
  const cards = applicableDefensiveCards(situation);
  const total = cards.reduce((a, c) => a + c.usage.weight, 0);
  const stunting = cards.filter((c) => (c.stunts ?? []).length > 0).reduce((a, c) => a + c.usage.weight, 0) / total;
  const hostable = hostableShare(situation, plan);
  if (hostable === 0) {
    if (stunting === 0) return 0;
    throw new PlaybookError(`at ${said(situation)} v5 stunts and no call can wear a line game`);
  }
  return stunting / hostable;
}

/** A line game and its share of the line games worn on one call. */
export interface LineGameShare {
  readonly game: LineGame;
  readonly share: number;
}

/**
 * The `which` law on a call in s: each line game the call can wear, in `LINE_GAMES`' order, in
 * proportion to its weight in s. Conditional on a line game being worn, which happens with
 * probability r_line. Empty on a call that can wear none in s.
 */
export function lineGameMix(call: AnyDefensiveCard, situation: PlaySituation): readonly LineGameShare[] {
  const games = wearable(call, situation);
  const total = games.reduce((a, x) => a + x.weight, 0);
  return games.map((x) => ({ game: x.game, share: x.weight / total }));
}

/**
 * The line game on a composed call (ADR-073 §2.6 step 3), on the Rng it is given (the caller's
 * `defense-line` fork), with r_line from `lineGameRate`. Its dice are that Rng's children:
 *
 *  - `wears`, on a call that can wear a line game in s: one with probability `rLine`;
 *  - `which`, when it can wear two or more: in proportion to their weights in s.
 *
 * The call is read with or without its own stunts: the game drawn replaces them. Returns the line
 * game, or `undefined` for none.
 */
export function drawLineGame(
  rng: Rng,
  call: AnyDefensiveCard,
  situation: PlaySituation,
  rLine: number,
): LineGame | undefined {
  const games = wearable(call, situation);
  if (games.length === 0 || !yes(rng.fork("wears"), checkedRate(rLine, "r_line", situation))) return undefined;
  const [only] = games;
  if (games.length === 1 && only !== undefined) return only.game;
  return weightedPick(rng.fork("which"), games, (x) => x.weight).game;
}
