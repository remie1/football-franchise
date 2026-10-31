/**
 * M8, THE FREE-RUN CLOCK (ADR-089 step 0; plan §6.2; ADR-089 §6.0 M8, §4.4.3-§4.4.5, D18, D19, D22;
 * question 19 answered Wait).
 *
 * Every free runner the base seasons publish at the snap (`legacyFreeRun.ts`'s
 * `restateFreeRunners`, so today's time is the restated legacy time, equal to the published
 * `etaTick`), by origin, snap row and position:
 *
 *  - **Wait (built, filed):** a man nobody touched (D19's three origins: UNBLOCKED, PICKUP_LOST
 *    banded BLOWN_UP, STUNT_LOOPER banded LOOPER_FREE) who is a down lineman (O8) runs the free-run
 *    clock from his snap spot (`snapSpot.ts`), with his own Speed and Acceleration (D18) and the
 *    call's drop (D22) (`freeRun.ts`); every other man keeps today's time (row TODAY);
 *  - **Table now (information only):** the whole placeholder table, with and without the Mug arm;
 *  - **touched men** (RAN_THROUGH, LATE_EXCHANGE) get the late, weak block at step 3, not this
 *    clock: they are listed as TOUCHED with today's time.
 *
 * **Readings (stated in the S3 report):**
 *  - the O8 key is the man's own position; his gap, side and alignment are those of the assignment
 *    he carries (`restateFreeRunners`' `timedFor`: after a passed-off stunt, his partner's);
 *  - a looper runs from his partner's spot after the crossing leg `|x_partner - x_own| + 0.5`
 *    (§4.4.5), so he needs both men placed and both sides stated; under Wait that means both are
 *    down linemen. A man the rule cannot place (no gap, no side, a partner off the table) is
 *    UNPLACED and keeps today's time, counted apart, never given an invented spot;
 *  - the Mug arm reads the play's MUG look tag and the backer's shown gap (`shownRush`).
 *
 * **Also reported (C1-N8):** how often the down-lineman key disagrees with the snapshot's personnel
 * family (`DefensivePersonnel.edges` and `.interior`) and with the engine's depth class LINE
 * (`legacyDepthFor`), over every free runner.
 *
 * `m8RunnersOf` is the per-play function step 3's check applies (deviation O2).
 */
import type { MatchEventEnvelope, PlayerId, PlayerState, Position } from "@ff/contracts";
import type { GameSnapshot, TeamSnapshot, Tunables } from "@ff/engine";
import { LOOPER_FREE_BAND, PICKUP_FREE_BAND } from "./approach.js";
import { dropOfCall, freeRunTime, loopCrossYards, ratingsOf, type SnapSpot } from "./freeRun.js";
import { legacyDepthFor, restateFreeRunners } from "./legacyFreeRun.js";
import { playersOfSnapshot } from "./m6Contact.js";
import { isDownLineman, signedX, tableNowSnapSpot, waitSnapSpot, type PlacedSpot, type SnapFacts } from "./snapSpot.js";
import { dropbacksOf, type Dropback, type Gap, type RushEntry } from "./throwClass.js";

export type M8Answer = "WAIT" | "TABLE_NOW" | "TABLE_NOW_MUG";
export const M8_ANSWERS: readonly M8Answer[] = ["WAIT", "TABLE_NOW", "TABLE_NOW_MUG"];

export type M8Row = PlacedSpot["row"] | "TODAY" | "TOUCHED" | "UNPLACED";

export interface M8Runner {
  readonly rusher: string;
  readonly origin: string;
  readonly band: string | undefined;
  readonly position: Position;
  readonly alignment: string;
  readonly untouched: boolean;
  readonly published: number;
  readonly today: number;
  readonly row: M8Row;
  readonly eta: number;
}

export interface M8Context {
  readonly tunables: Tunables;
  readonly positions: ReadonlyMap<PlayerId, Position>;
  readonly players: ReadonlyMap<string, PlayerState>;
}

/** D19: the three origins on the free-run clock. */
export function isUntouched(origin: string, band: string | undefined): boolean {
  return origin === "UNBLOCKED" || (origin === "PICKUP_LOST" && band === PICKUP_FREE_BAND) || (origin === "STUNT_LOOPER" && band === LOOPER_FREE_BAND);
}

function placeFor(answer: M8Answer, f: SnapFacts): PlacedSpot | { readonly row: "TODAY" } | undefined {
  if (answer === "WAIT") return waitSnapSpot(f);
  return tableNowSnapSpot(f, answer === "TABLE_NOW_MUG");
}

/** Every free runner of one dropback under one answer. */
export function m8RunnersOf(d: Dropback, ctx: M8Context, answer: M8Answer): readonly M8Runner[] {
  const rushBy = new Map<string, RushEntry>(d.start.rush.map((r) => [r.rusher, r]));
  const mugShown = new Map<string, Gap>();
  if (d.start.lookTagIds.includes("MUG")) for (const s of d.start.shownRush) if (s.gap !== undefined) mugShown.set(s.rusher, s.gap);
  const drop = dropOfCall(d.start.call);
  const positionOf = (id: string): Position => {
    const p = ctx.positions.get(id as PlayerId);
    if (p === undefined) throw new Error(`m8: ${d.playId}: ${id} is not on the snapshot`);
    return p;
  };
  const factsOf = (man: string, assignment: RushEntry): SnapFacts => {
    const gap = assignment.gap;
    const mug = mugShown.get(man);
    return {
      position: positionOf(man),
      alignment: assignment.alignment,
      ...(gap === undefined ? {} : { gap }),
      disguise: d.start.blitzDisguise,
      ...(mug === undefined ? {} : { mugShownGap: mug }),
    };
  };
  const out: M8Runner[] = [];
  for (const r of restateFreeRunners(d, ctx.positions, ctx.tunables)) {
    const position = positionOf(r.rusher);
    const untouched = isUntouched(r.origin, r.band);
    const base = { rusher: r.rusher, origin: r.origin, band: r.band, position, alignment: r.alignment, untouched, published: r.published, today: r.restated };
    if (!untouched) {
      out.push({ ...base, row: "TOUCHED", eta: r.restated });
      continue;
    }
    const assignment = rushBy.get(r.timedFor);
    if (assignment === undefined) throw new Error(`m8: ${d.playId}: ${r.timedFor} is not on the rush`);
    const own = placeFor(answer, factsOf(r.rusher, assignment));
    if (own === undefined) {
      out.push({ ...base, row: "UNPLACED", eta: r.restated });
      continue;
    }
    if (own.row === "TODAY") {
      out.push({ ...base, row: "TODAY", eta: r.restated });
      continue;
    }
    const player = ctx.players.get(r.rusher);
    if (player === undefined) throw new Error(`m8: ${d.playId}: ${r.rusher} has no player on the snapshot`);
    let spot: SnapSpot = own.spot;
    let cross: number | undefined;
    if (r.origin === "STUNT_LOOPER") {
      const stunt = d.start.stunts.find((s) => s.looper === r.rusher);
      const partner = stunt === undefined ? undefined : rushBy.get(stunt.penetrator);
      const partnerPlace = stunt === undefined || partner === undefined ? undefined : placeFor(answer, factsOf(stunt.penetrator, partner));
      if (partner === undefined || partnerPlace === undefined || partnerPlace.row === "TODAY" || assignment.side === undefined || partner.side === undefined) {
        out.push({ ...base, row: "UNPLACED", eta: r.restated });
        continue;
      }
      cross = loopCrossYards(signedX(own.spot, assignment.side), signedX(partnerPlace.spot, partner.side));
      spot = partnerPlace.spot;
    }
    const t = freeRunTime({
      spot,
      drop,
      edge: assignment.alignment === "EDGE",
      ...(cross === undefined ? {} : { loopCrossYards: cross }),
      ratings: ratingsOf(player),
      delayed: own.delayed,
      moving: own.moving,
    });
    out.push({ ...base, row: own.row, eta: t.eta });
  }
  return out;
}

interface Cell {
  n: number;
  eta: number;
  today: number;
  sooner: number;
  later: number;
  etaHistogram: Record<string, number>;
}

const emptyCell = (): Cell => ({ n: 0, eta: 0, today: 0, sooner: 0, later: 0, etaHistogram: {} });

export interface M8Fold {
  runners: number;
  publishedMismatches: number;
  byAnswer: Record<M8Answer, Record<string, Cell>>;
  keys: {
    runners: number;
    dlVsPersonnel: number;
    dlVsDepthLine: number;
    dlVsPersonnelByPosition: Record<string, number>;
    dlVsDepthLineByPosition: Record<string, number>;
  };
}

export function emptyM8Fold(): M8Fold {
  return {
    runners: 0,
    publishedMismatches: 0,
    byAnswer: { WAIT: {}, TABLE_NOW: {}, TABLE_NOW_MUG: {} },
    keys: { runners: 0, dlVsPersonnel: 0, dlVsDepthLine: 0, dlVsPersonnelByPosition: {}, dlVsDepthLineByPosition: {} },
  };
}

function addRunner(cells: Record<string, Cell>, r: M8Runner): void {
  const key = `${r.origin}${r.band === undefined ? "" : `/${r.band}`}|${r.row}|${r.position}`;
  let c = cells[key];
  if (c === undefined) {
    c = emptyCell();
    cells[key] = c;
  }
  c.n += 1;
  c.eta += r.eta;
  c.today += r.today;
  if (r.eta < r.today) c.sooner += 1;
  if (r.eta > r.today) c.later += 1;
  const bin = r.eta.toFixed(1);
  c.etaHistogram[bin] = (c.etaHistogram[bin] ?? 0) + 1;
}

function defenseTeamOf(snapshot: GameSnapshot, team: string): TeamSnapshot {
  if (String(snapshot.home.team) === team) return snapshot.home;
  if (String(snapshot.away.team) === team) return snapshot.away;
  throw new Error(`m8: defence ${team} is on neither side of the snapshot`);
}

export function foldM8Game(fold: M8Fold, events: readonly MatchEventEnvelope[], snapshot: GameSnapshot, positions: ReadonlyMap<PlayerId, Position>, tunables: Tunables): void {
  const ctx: M8Context = { tunables, positions, players: playersOfSnapshot(snapshot) };
  for (const d of dropbacksOf(events)) {
    const defense = defenseTeamOf(snapshot, d.start.defenseTeam).defense;
    const line = new Set([...defense.edges, ...defense.interior].map(String));
    let counted = false;
    for (const answer of M8_ANSWERS) {
      for (const r of m8RunnersOf(d, ctx, answer)) {
        addRunner(fold.byAnswer[answer], r);
        if (counted) continue;
        fold.runners += 1;
        if (r.today !== r.published) fold.publishedMismatches += 1;
        fold.keys.runners += 1;
        const dl = isDownLineman(r.position);
        if (dl !== line.has(r.rusher)) {
          fold.keys.dlVsPersonnel += 1;
          fold.keys.dlVsPersonnelByPosition[r.position] = (fold.keys.dlVsPersonnelByPosition[r.position] ?? 0) + 1;
        }
        if (dl !== (legacyDepthFor(tunables, r.position) === "LINE")) {
          fold.keys.dlVsDepthLine += 1;
          fold.keys.dlVsDepthLineByPosition[r.position] = (fold.keys.dlVsDepthLineByPosition[r.position] ?? 0) + 1;
        }
      }
      counted = true;
    }
  }
}

export function m8Summary(fold: M8Fold): Readonly<Record<string, unknown>> {
  const table = (cells: Record<string, Cell>): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(cells)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, c]) => [k, { n: c.n, meanEta: Number((c.eta / c.n).toFixed(3)), meanToday: Number((c.today / c.n).toFixed(3)), sooner: c.sooner, later: c.later, etaHistogram: c.etaHistogram }]),
    );
  const rows = (cells: Record<string, Cell>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, c] of Object.entries(cells)) {
      const row = k.split("|")[1] as string;
      out[row] = (out[row] ?? 0) + c.n;
    }
    return out;
  };
  return {
    runners: fold.runners,
    publishedMismatches: fold.publishedMismatches,
    answer: "WAIT (question 19); Table now and its Mug arm are information only",
    wait: { rows: rows(fold.byAnswer.WAIT), table: table(fold.byAnswer.WAIT) },
    tableNow: { rows: rows(fold.byAnswer.TABLE_NOW), table: table(fold.byAnswer.TABLE_NOW) },
    tableNowMug: { rows: rows(fold.byAnswer.TABLE_NOW_MUG), table: table(fold.byAnswer.TABLE_NOW_MUG) },
    keyDisagreements: fold.keys,
  };
}
