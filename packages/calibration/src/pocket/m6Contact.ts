/**
 * M6, CONTACT'S BRANCHES (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M6, §4.5 items 1-3, §4.7).
 *
 * **Contact** (§4.5) is a threat ARRIVED, or the escape roll's CAUGHT, with the ball in his hand.
 * Today, on an arrival tick with no target (no receiver clears the desperation bar), the play is a
 * sack (`sim/passPlay.ts:1177-1180`); that is a **no-target arrival**. A caught escape is counted
 * apart: no throwaway is ever offered on it (§4.5 item 3, CHOSEN).
 *
 * **The upper bound:** no-target arrivals with a **broken receiver**, an eligible receiver whose
 * route has reached its break by that tick: his latest `ROUTE_STATUS` phase at or before the tick
 * is OPEN, SETTLED or DECAYING (`resolve/route.ts:102-114`: the phase leaves DEVELOPING at the
 * route's `readySeconds`), which is question 9's in-pocket rule (§4.7). Only these contacts could
 * ever turn into a contact THROWAWAY.
 *
 * **FIGHT against THROWAWAY:** inside the bound, THROWAWAY is offered unless the contact man is on
 * the free-run clock (D19's three origins: UNBLOCKED, PICKUP_LOST banded BLOWN_UP, STUNT_LOOPER
 * banded LOOPER_FREE; §4.0) or comes from BEHIND (never produced on legacy facts, `approach.ts`).
 * The pick is today's ranked pick (`resolve/pocketMovement.ts:96-160`), restated here from
 * `DEFAULT_TUNABLES`: each response's appeal is `base + sum round((rating - appealBaseline) /
 * divisor) + perUrgencyStep * urgency`, sorted best-first with ties kept in declaration order, and
 * one d100 + poise/5 + awareness/5 against `pocketMovement.target` names the rank through the band
 * table (`takeRank`, clamped to the pool). At contact his nearest threat is on him, so urgency is
 * `urgencySteps(0)` = 3.
 *
 * **Reading (stated in the S3 report):** FIGHT has no appeal of its own until step 4 files one
 * (§4.5 item 3: "base appeal plus strength and agility terms plus an approach term"); step 0 prices
 * it at today's `standIn` appeal, the response FIGHT is published as (QB_DECISION HOLD, §4.5), with
 * no approach term and no situation term (§4.9's term is step 8's). THROWAWAY is today's
 * `throwaway` appeal (25 + decisionMaking/3 + awareness/4, `tunables.ts:1513-1520`). **No die is
 * drawn:** each branch's rate is its exact expectation over the 100 faces of the movement die.
 *
 * **The cross-check (C2-S11):** on every stream `pocket_movement` CHECK, the restated pool (the
 * live threats from M2's TODAY replay, his step-ups so far, the 2.0 s throwaway gate) and the
 * CHECK's own margin give a band and a response; both must equal the stream's (the CHECK's band,
 * and the response the stream shows next on that tick: STEP_UP, a `scramble` CHECK for ESCAPE,
 * THROWAWAY, or HOLD for STAND_IN).
 */
import { getAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState, Position } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { approachesOfPlay, LOOPER_FREE_BAND, PICKUP_FREE_BAND, type ThreatApproach } from "./approach.js";
import { registryAttr } from "./freeRun.js";
import { ARM_TODAY, replayPassPlay, type ArmTick } from "./m2ForcingSource.js";
import { playsOf, readDropback, type Dropback } from "./throwClass.js";

export type PocketResponse = "STAND_IN" | "STEP_UP" | "ESCAPE" | "THROWAWAY";
type AppealKey = keyof Tunables["pocketMovement"]["appeal"];

const RESPONSE_OF: Readonly<Record<AppealKey, PocketResponse>> = {
  standIn: "STAND_IN",
  stepUp: "STEP_UP",
  escape: "ESCAPE",
  throwaway: "THROWAWAY",
};

/** A rating by registry name (`getAttr` through the registry id; Iron Rule 5). */
export type RatingOf = (name: string) => number;

export function ratingReader(player: PlayerState): RatingOf {
  return (name) => getAttr(player.attributes.values, registryAttr(name));
}

/** Every player on the game's snapshot, by id. */
export function playersOfSnapshot(snapshot: GameSnapshot): ReadonlyMap<string, PlayerState> {
  const out = new Map<string, PlayerState>();
  for (const team of [snapshot.home, snapshot.away]) for (const p of Object.values(team.players)) out.set(String(p.bio.id), p);
  return out;
}

/** `urgencySteps` (`resolve/rushThreat.ts:832-837`), restated. */
export function urgencyOf(tunables: Tunables, minTta: number | undefined): number {
  if (minTta === undefined) return 0;
  return Math.max(0, Math.round((tunables.pocketMovement.urgencyHorizonSeconds - Math.max(0, minTta)) / tunables.clock.tickStepSeconds));
}

interface AppealSpecLike {
  readonly base: number;
  readonly terms: readonly { readonly attr: string; readonly divisor: number }[];
  readonly perUrgencyStep: number;
}

/** `appealFrom` (`resolve/pocketMovement.ts:96-108`), restated. */
export function appealOf(tunables: Tunables, spec: AppealSpecLike, ratingOf: RatingOf, urgency: number): number {
  const baseline = tunables.pocketMovement.appealBaseline;
  const terms = spec.terms.reduce((sum, term) => sum + Math.round((ratingOf(term.attr) - baseline) / term.divisor), 0);
  return spec.base + terms + spec.perUrgencyStep * urgency;
}

export interface RankedResponse {
  readonly response: PocketResponse;
  readonly appeal: number;
}

export interface PoolFacts {
  readonly ratingOf: RatingOf;
  readonly minTta: number | undefined;
  /** The alignments of his live threats. */
  readonly threatAlignments: readonly string[];
  readonly stepUpsUsed: number;
  readonly throwawayAvailable: boolean;
}

/** `rankResponses` (`resolve/pocketMovement.ts:127-160`), restated. */
export function rankedResponsesOf(tunables: Tunables, f: PoolFacts): { readonly ranked: readonly RankedResponse[]; readonly urgency: number } {
  const t = tunables.pocketMovement;
  const urgency = urgencyOf(tunables, f.minTta);
  const canClimb = f.stepUpsUsed < t.stepUp.maxPerPlay && !f.threatAlignments.includes("INTERIOR");
  const scored: RankedResponse[] = [];
  for (const key of Object.keys(t.appeal) as AppealKey[]) {
    const response = RESPONSE_OF[key];
    if (response === "STEP_UP" && !canClimb) continue;
    if (response === "THROWAWAY" && !f.throwawayAvailable) continue;
    let appeal = appealOf(tunables, t.appeal[key], f.ratingOf, urgency);
    if (response === "ESCAPE" && !canClimb) appeal += t.appeal.escape.noClimbLaneBonus;
    scored.push({ response, appeal });
  }
  return { ranked: [...scored].sort((a, b) => b.appeal - a.appeal), urgency };
}

/** The movement band of a margin (`bandFor` over `pocketMovement.bands`, first band cleared). */
export function movementBandOf(tunables: Tunables, margin: number): { readonly label: string; readonly takeRank: number } {
  const bands = tunables.pocketMovement.bands;
  for (const b of bands) if (margin >= b.minMargin) return { label: b.label, takeRank: b.takeRank };
  const last = bands[bands.length - 1];
  if (last === undefined) throw new Error("m6: empty pocketMovement.bands");
  return { label: last.label, takeRank: last.takeRank };
}

/** The pick a band makes from a ranked pool (rank clamped to the pool). */
export function pickOf(ranked: readonly RankedResponse[], takeRank: number): PocketResponse {
  const chosen = ranked[Math.min(takeRank, ranked.length - 1)];
  if (chosen === undefined) throw new Error("m6: an empty pocket-movement pool");
  return chosen.response;
}

/** The movement die's modifier total: poise/5 and awareness/5 (`attrMod` rounding for divisor 5). */
export function movementModifierTotal(tunables: Tunables, ratingOf: RatingOf): number {
  return tunables.pocketMovement.checkTerms.reduce((sum, term) => sum + Math.round(ratingOf(term.attr) / term.divisor), 0);
}

/** The exact chance of each rank over the 100 faces of the movement die. */
export function rankChances(tunables: Tunables, ratingOf: RatingOf): ReadonlyMap<number, number> {
  const mods = movementModifierTotal(tunables, ratingOf);
  const out = new Map<number, number>();
  for (let face = 1; face <= 100; face += 1) {
    const { takeRank } = movementBandOf(tunables, face + mods - tunables.pocketMovement.target);
    out.set(takeRank, (out.get(takeRank) ?? 0) + 0.01);
  }
  return out;
}

/** The chance a pool ends in `response`, over the die. */
export function chanceOfResponse(tunables: Tunables, ranked: readonly RankedResponse[], ratingOf: RatingOf, response: PocketResponse): number {
  let p = 0;
  for (const [rank, chance] of rankChances(tunables, ratingOf)) if (pickOf(ranked, rank) === response) p += chance;
  return p;
}

// --- contact ---------------------------------------------------------------------------------------

/** The phases at or past a route's break (`resolve/route.ts:102-114`). */
export const BROKEN_PHASES: readonly string[] = ["OPEN", "SETTLED", "DECAYING"];

/** Is some receiver's route at or past its break at `tick` (his latest ROUTE_STATUS at or before it)? */
export function brokenReceiverAt(d: Dropback, tick: number): boolean {
  const latest = new Map<string, string>();
  for (const r of d.routes) if (r.tick <= tick) latest.set(r.receiver, r.phase);
  for (const phase of latest.values()) if (BROKEN_PHASES.includes(phase)) return true;
  return false;
}

/** D19's free-run clock: UNBLOCKED, PICKUP_LOST banded BLOWN_UP, STUNT_LOOPER banded LOOPER_FREE. */
export function onFreeRunClock(a: ThreatApproach | undefined): boolean {
  if (a === undefined) return false;
  const { origin, band } = a.facts;
  return origin === "UNBLOCKED" || (origin === "PICKUP_LOST" && band === PICKUP_FREE_BAND) || (origin === "STUNT_LOOPER" && band === LOOPER_FREE_BAND);
}

export type ContactKind = "NO_TARGET_ARRIVAL" | "CAUGHT_ESCAPE" | "SACK_WITHOUT_ARRIVAL";

export interface Contact {
  readonly kind: ContactKind;
  readonly tick: number;
  /** The credited contact man (the last ARRIVED at the tick, the statline's rule), if any. */
  readonly rusher: string | undefined;
  readonly sameTickArrivals: number;
  readonly brokenReceiver: boolean;
  readonly down: number;
}

/** Was he caught on an escape roll at `tick` (a `scramble` CHECK whose band sacks him)? */
export function caughtEscapeAt(d: Dropback, tick: number, tunables: Tunables): boolean {
  return d.checks.some((c) => c.checkKind === "scramble" && c.tick === tick && tunables.scramble.bands.some((b) => b.label === c.band && b.sacked));
}

/** A sacked dropback's contact (today every sack is one contact, or none). */
export function contactOf(d: Dropback, tunables: Tunables): Contact | undefined {
  if (!d.sacked) return undefined;
  const tick = d.endTick;
  const here = d.threats.filter((t) => t.state === "ARRIVED" && t.tick === tick);
  const last = here[here.length - 1];
  const kind: ContactKind = caughtEscapeAt(d, tick, tunables) ? "CAUGHT_ESCAPE" : last === undefined ? "SACK_WITHOUT_ARRIVAL" : "NO_TARGET_ARRIVAL";
  return { kind, tick, rusher: last?.rusher, sameTickArrivals: here.length, brokenReceiver: brokenReceiverAt(d, tick), down: d.start.down };
}

export interface ContactPrice {
  readonly offered: boolean;
  readonly fightAppeal: number;
  readonly throwawayAppeal: number;
  /** THROWAWAY ranks first (ties go to FIGHT, today's declaration order: standIn before throwaway). */
  readonly prefersThrowaway: boolean;
  /** The exact chance of THROWAWAY over the movement die (0 when not offered). */
  readonly pThrowaway: number;
}

/** The contact pick at today's appeals (FIGHT read as `standIn`), urgency at contact. */
export function priceContact(tunables: Tunables, ratingOf: RatingOf, offered: boolean): ContactPrice {
  const urgency = urgencyOf(tunables, 0);
  const a = tunables.pocketMovement.appeal;
  const fightAppeal = appealOf(tunables, a.standIn, ratingOf, urgency);
  const throwawayAppeal = appealOf(tunables, a.throwaway, ratingOf, urgency);
  const pool: RankedResponse[] = [{ response: "STAND_IN", appeal: fightAppeal }];
  if (offered) pool.push({ response: "THROWAWAY", appeal: throwawayAppeal });
  const ranked = [...pool].sort((x, y) => y.appeal - x.appeal);
  return {
    offered,
    fightAppeal,
    throwawayAppeal,
    prefersThrowaway: offered && ranked[0]?.response === "THROWAWAY",
    pThrowaway: offered ? chanceOfResponse(tunables, ranked, ratingOf, "THROWAWAY") : 0,
  };
}

interface BranchCell {
  contacts: number;
  offered: number;
  prefersThrowaway: number;
  expectedThrowaway: number;
}

const emptyCell = (): BranchCell => ({ contacts: 0, offered: 0, prefersThrowaway: 0, expectedThrowaway: 0 });

export interface M6Fold {
  dropbacks: number;
  sacks: number;
  noTargetArrivals: number;
  caughtEscapes: number;
  sacksWithoutArrival: number;
  multiArrival: number;
  /** The upper bound: no-target arrivals with a broken receiver. */
  upperBound: number;
  upperBoundByApproach: Record<string, number>;
  upperBoundByDown: Record<string, number>;
  /** Inside the bound, the contact man on the free-run clock (no THROWAWAY offered). */
  freeRunClock: number;
  branch: BranchCell;
  byApproach: Record<string, BranchCell>;
  byDown: Record<string, BranchCell>;
  /** THROWAWAY appeal minus FIGHT appeal over the offered contacts, by value. */
  appealGap: Record<string, number>;
  /** The cross-check against the stream's pocket_movement CHECKs. */
  movementChecks: number;
  bandMismatches: number;
  pickMismatches: number;
  unreadChecks: number;
  mismatchExamples: string[];
}

export function emptyM6Fold(): M6Fold {
  return {
    dropbacks: 0,
    sacks: 0,
    noTargetArrivals: 0,
    caughtEscapes: 0,
    sacksWithoutArrival: 0,
    multiArrival: 0,
    upperBound: 0,
    upperBoundByApproach: {},
    upperBoundByDown: {},
    freeRunClock: 0,
    branch: emptyCell(),
    byApproach: {},
    byDown: {},
    appealGap: {},
    movementChecks: 0,
    bandMismatches: 0,
    pickMismatches: 0,
    unreadChecks: 0,
    mismatchExamples: [],
  };
}

const add = (m: Record<string, number>, k: string, v = 1): void => {
  m[k] = (m[k] ?? 0) + v;
};

const cellOf = (m: Record<string, BranchCell>, k: string): BranchCell => {
  let c = m[k];
  if (c === undefined) {
    c = emptyCell();
    m[k] = c;
  }
  return c;
};

function addPrice(cell: BranchCell, p: ContactPrice): void {
  cell.contacts += 1;
  if (!p.offered) return;
  cell.offered += 1;
  if (p.prefersThrowaway) cell.prefersThrowaway += 1;
  cell.expectedThrowaway += p.pThrowaway;
}

/** Fold one dropback's contact. */
export function foldM6Contact(fold: M6Fold, d: Dropback, labels: ReadonlyMap<string, ThreatApproach>, players: ReadonlyMap<string, PlayerState>, tunables: Tunables): void {
  fold.dropbacks += 1;
  const c = contactOf(d, tunables);
  if (c === undefined) return;
  fold.sacks += 1;
  if (c.kind === "CAUGHT_ESCAPE") {
    fold.caughtEscapes += 1;
    return;
  }
  if (c.kind === "SACK_WITHOUT_ARRIVAL") {
    fold.sacksWithoutArrival += 1;
    return;
  }
  fold.noTargetArrivals += 1;
  if (c.sameTickArrivals > 1) fold.multiArrival += 1;
  if (!c.brokenReceiver) return;
  fold.upperBound += 1;
  const label = c.rusher === undefined ? undefined : labels.get(c.rusher);
  const approach = label?.label.approach ?? "UNLABELLED";
  const down = String(c.down);
  add(fold.upperBoundByApproach, approach);
  add(fold.upperBoundByDown, down);
  const qb = players.get(d.start.quarterback);
  if (qb === undefined) throw new Error(`m6: ${d.playId}: quarterback ${d.start.quarterback} is not on the snapshot`);
  const free = onFreeRunClock(label);
  if (free) fold.freeRunClock += 1;
  const price = priceContact(tunables, ratingReader(qb), !free);
  addPrice(fold.branch, price);
  addPrice(cellOf(fold.byApproach, approach), price);
  addPrice(cellOf(fold.byDown, down), price);
  if (price.offered) add(fold.appealGap, String(price.throwawayAppeal - price.fightAppeal));
}

/** The response the stream shows after a pocket_movement CHECK at `tick`. */
export function streamResponseAt(d: Dropback, tick: number): PocketResponse | undefined {
  if (d.checks.some((c) => c.checkKind === "scramble" && c.tick === tick)) return "ESCAPE";
  const decision = d.decisions.find((x) => x.tick === tick);
  switch (decision?.choice) {
    case "STEP_UP":
      return "STEP_UP";
    case "THROWAWAY":
      return "THROWAWAY";
    case "HOLD":
      return "STAND_IN";
    default:
      return undefined;
  }
}

/** Cross-check every pocket_movement CHECK of one dropback against the restated pick. */
export function crossCheckMovement(fold: M6Fold, d: Dropback, ticks: readonly ArmTick[], players: ReadonlyMap<string, PlayerState>, tunables: Tunables): void {
  const qb = players.get(d.start.quarterback);
  if (qb === undefined) throw new Error(`m6: ${d.playId}: quarterback ${d.start.quarterback} is not on the snapshot`);
  const ratingOf = ratingReader(qb);
  for (const check of d.checks) {
    if (check.checkKind !== "pocket_movement") continue;
    fold.movementChecks += 1;
    const at = ticks.find((t) => t.tick === check.tick);
    const shown = streamResponseAt(d, check.tick);
    if (at === undefined || shown === undefined) {
      fold.unreadChecks += 1;
      continue;
    }
    const live = at.rushers.filter((r) => r.tta !== undefined);
    const stepUpsUsed = d.decisions.filter((x) => x.choice === "STEP_UP" && x.tick < check.tick).length;
    const { ranked } = rankedResponsesOf(tunables, {
      ratingOf,
      minTta: at.minTta,
      threatAlignments: live.map((r) => r.alignment),
      stepUpsUsed,
      throwawayAvailable: check.tick >= tunables.qb.throwawayEarliestSeconds,
    });
    const band = movementBandOf(tunables, check.margin);
    const pick = pickOf(ranked, band.takeRank);
    const bandOk = band.label === check.band;
    const pickOk = pick === shown;
    if (!bandOk) fold.bandMismatches += 1;
    if (!pickOk) fold.pickMismatches += 1;
    if ((!bandOk || !pickOk) && fold.mismatchExamples.length < 5) {
      fold.mismatchExamples.push(`${d.playId} t${String(check.tick)}: band ${band.label}/${String(check.band)}, pick ${pick}/${shown}, pool ${ranked.map((r) => `${r.response}:${String(r.appeal)}`).join(",")}`);
    }
  }
}

/** Fold one game: the contacts, and the cross-check over TODAY's replay. */
export function foldM6Game(fold: M6Fold, events: readonly MatchEventEnvelope[], snapshot: GameSnapshot, positions: ReadonlyMap<PlayerId, Position>, tunables: Tunables, gameSeed: string): void {
  const players = playersOfSnapshot(snapshot);
  for (const play of playsOf(events)) {
    const d = readDropback(play);
    if (d === undefined) continue;
    const labels = approachesOfPlay(play.events);
    foldM6Contact(fold, d, labels, players, tunables);
    if (!d.checks.some((c) => c.checkKind === "pocket_movement")) continue;
    const r = replayPassPlay(play.playId, play.events, { tunables, positions, gameSeed, arm: ARM_TODAY });
    if (r === undefined) continue;
    crossCheckMovement(fold, d, r.ticks, players, tunables);
  }
}

export function m6Summary(fold: M6Fold): Readonly<Record<string, unknown>> {
  const pct = (n: number, den: number): number => (den === 0 ? 0 : Number(((100 * n) / den).toFixed(2)));
  const cell = (c: BranchCell): Record<string, number> => ({
    contacts: c.contacts,
    offered: c.offered,
    prefersThrowaway: c.prefersThrowaway,
    expectedThrowaway: Number(c.expectedThrowaway.toFixed(3)),
    throwawayPctOfContacts: pct(c.expectedThrowaway, c.contacts),
    fightPctOfContacts: Number((100 - pct(c.expectedThrowaway, c.contacts)).toFixed(2)),
  });
  const cells = (m: Record<string, BranchCell>): Record<string, Record<string, number>> => Object.fromEntries(Object.entries(m).sort().map(([k, v]) => [k, cell(v)]));
  return {
    dropbacks: fold.dropbacks,
    sacks: fold.sacks,
    noTargetArrivals: fold.noTargetArrivals,
    caughtEscapes: fold.caughtEscapes,
    sacksWithoutArrival: fold.sacksWithoutArrival,
    multiArrival: fold.multiArrival,
    upperBound: fold.upperBound,
    upperBoundPer100Dropbacks: pct(fold.upperBound, fold.dropbacks),
    upperBoundPctOfSacks: pct(fold.upperBound, fold.sacks),
    upperBoundByApproach: fold.upperBoundByApproach,
    upperBoundByDown: fold.upperBoundByDown,
    freeRunClock: fold.freeRunClock,
    branch: cell(fold.branch),
    byApproach: cells(fold.byApproach),
    byDown: cells(fold.byDown),
    appealGap: fold.appealGap,
    reading: "FIGHT priced at today's standIn appeal (no approach or situation term until steps 4 and 8); urgency at contact 3; exact expectation over the movement die",
    crossCheck: { movementChecks: fold.movementChecks, bandMismatches: fold.bandMismatches, pickMismatches: fold.pickMismatches, unreadChecks: fold.unreadChecks, examples: fold.mismatchExamples },
  };
}
