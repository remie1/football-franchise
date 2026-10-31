/**
 * ADR-085 §4 with player-personality.md §4 (owner's Q5 b): an offer is judged as need satisfaction,
 * not price alone. Money is weighed against winning, playing time, loyalty and how much is
 * guaranteed, each by the player's own need weights, reweighted by career stage (§2: young players
 * want playing time, prime players money, veterans winning). Players' needs are still placeholders
 * (ADR-079 Q7), so every player starts from the same weights; real personalities make this richer.
 *
 * Constants are CHOSEN (provenance NONE).
 */
import { createRng, type PlayerState } from "@ff/contracts";

export type NegotiationNeed = "money" | "winning" | "playingTime" | "loyalty" | "contractStructure";
const NEEDS: readonly NegotiationNeed[] = ["money", "winning", "playingTime", "loyalty", "contractStructure"];

/** The most an offer's non-money side can move its worth, up or down (0.25 = 25%). */
export const NON_MONEY_REACH = 0.25;

/** A player's weights over what he wants, summing to 1. */
export function needWeights(p: PlayerState): Record<NegotiationNeed, number> {
  const raw: Record<NegotiationNeed, number> = { money: 1, winning: 1, playingTime: 1, loyalty: 0.6, contractStructure: 0.6 };
  for (const k of NEEDS) {
    const w = p.personality.needs[k];
    if (w !== undefined) raw[k] = w;
  }
  const age = p.bio.age;
  if (age <= 25) raw.playingTime *= 1.5;
  else if (age <= 30) raw.money *= 1.3;
  else { raw.winning *= 1.5; raw.loyalty *= 1.2; }
  const sum = NEEDS.reduce((s, k) => s + raw[k], 0);
  return Object.fromEntries(NEEDS.map((k) => [k, raw[k] / sum])) as Record<NegotiationNeed, number>;
}

export interface OfferTerms {
  apy: number;
  /** Share of the deal's money guaranteed at signing, 0..1. */
  guaranteed: number;
  /** The offering team's win share last season, 0..1. */
  winShare: number;
  /** Would he start there? */
  starts: boolean;
  /** Is it his own team? */
  ownTeam: boolean;
}

/** An offer's worth to him, in units of his asking price (1 = exactly what he asked for). */
export function offerWorth(p: PlayerState, offer: OfferTerms, ask: number): number {
  const w = needWeights(p);
  const tilt = w.winning * (offer.winShare - 0.5) * 2
    + w.playingTime * (offer.starts ? 1 : -0.5)
    + w.loyalty * (offer.ownTeam ? 1 : 0)
    + w.contractStructure * Math.max(-1, Math.min(1, (offer.guaranteed - 0.3) * 2));
  // Money's own weight scales how much the rest can matter: a mercenary barely notices it.
  const reach = NON_MONEY_REACH * (1 - w.money);
  return (offer.apy / Math.max(1, ask)) * (1 + reach * Math.max(-1, Math.min(1, tilt / Math.max(1e-9, 1 - w.money))));
}

/** The market windows (franchise-calendar.md §6): the asking price starts high and falls. */
export type MarketWindow = "PREMIUM" | "VALUE" | "BARGAIN";
export const WINDOW_ASK: Readonly<Record<MarketWindow, number>> = { PREMIUM: 1.1, VALUE: 1.0, BARGAIN: 0.85 };
/** In the bargain basement the ask keeps falling each week. */
export const BARGAIN_WEEKLY = 0.97;
/** How far an agent's optimism moves an ask (1 SD), times the weight he puts on money. */
export const AGENT_SPREAD = 0.15;

/** His asking price: his value, his agent's optimism, the window. Never below `floor`. */
export function askingPrice(
  p: PlayerState, value: number, window: MarketWindow, weeksIntoBargain: number, floor: number, seed: string, season: number,
): number {
  const rng = createRng(seed, `ask/${season}/${String(p.bio.id)}`);
  const optimism = 1 + AGENT_SPREAD * needWeights(p).money * (2 * rng.next() - 1);
  const fall = window === "BARGAIN" ? BARGAIN_WEEKLY ** Math.max(0, weeksIntoBargain) : 1;
  return Math.max(floor, Math.round(value * optimism * WINDOW_ASK[window] * fall / 1000) * 1000);
}
