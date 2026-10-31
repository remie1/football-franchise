/**
 * ADR-090 step 1's numbers, read off `PLAY_START` alone (Iron Rule 3): is the published picture
 * whole on every snap, and where does each man's snap spot fall on the engine's grid against the
 * one cell the engine plays him in today (ADR-090 §3, §7)?
 *
 * THE ENGINE'S CELL. `engine/src/resolve/zone.ts` puts every man in ONE cell for the whole play:
 * "receivers their break cell, man defenders their receiver's cell, zone defenders their ANCHOR
 * cell, everyone in protection the backfield". So the passer, every man in protection and every
 * rusher is in the backfield cell; a route runner is in his route's break cell; a man defender is
 * in his man's; a zone defender is on his zone's anchor. A route that states no break cell gets the
 * engine's default lane and the band its air yards reach (the same §3.2 table the playbook keeps).
 *
 * THE SNAP CELL. Table D2 (`cellOf`): the lane by how far across he stands, the band by his depth.
 *
 * Most differences are by design. The engine's cell is where a man PLAYS for the whole snap (a
 * route's break, a zone's landmark, the pocket); the snap spot is where he STARTS. Nothing reads the
 * picture at step 1, so none of them moves a number: they are what a reader that swaps a cell for a
 * spot will change, and every one is listed.
 *
 * Pass plays only: the run simulation puts nobody in a cell (it resolves gaps), so a run has no
 * engine cell to compare. Its picture is still checked for completeness.
 */
import type {
  CoverageAssignment,
  FieldZone,
  MatchEventEnvelope,
  PlayerId,
  ProtectionAssignment,
  RouteAssignment,
  SnapPicture,
} from "@ff/contracts";
import { DEFAULT_TUNABLES, type GameSnapshot } from "@ff/engine";
import { cellOf, verticalZoneForAirYards } from "@ff/playbook";

/** Who a man is on a pass play, by the engine's rule for his cell. */
export type CellJob = "PASSER" | "PROTECTION" | "ROUTE" | "RUSH" | "MAN" | "ZONE";

export const CELL_JOBS: readonly CellJob[] = ["PASSER", "PROTECTION", "ROUTE", "RUSH", "MAN", "ZONE"];

/** The engine's rule for each job, in its own words (`resolve/zone.ts`). */
export const ENGINE_CELL_RULE: Readonly<Record<CellJob, string>> = Object.freeze({
  PASSER: "the backfield",
  PROTECTION: "the backfield (everyone in protection)",
  ROUTE: "where his route breaks",
  RUSH: "the backfield (everyone in protection, the rushers too)",
  MAN: "where his man's route breaks",
  ZONE: "his zone's landmark",
});

/** One kind of difference: who, the engine's cell, his snap cell, and how many men. */
export interface CellDifference {
  readonly job: CellJob;
  readonly engine: string;
  readonly snap: string;
  readonly men: number;
}

export interface JobCells {
  readonly men: number;
  readonly sameCell: number;
  readonly sameLane: number;
  readonly sameBand: number;
}

export interface SnapCellCheck {
  readonly games: number;
  readonly plays: number;
  readonly passPlays: number;
  readonly runPlays: number;
  /** PLAY_STARTs carrying a picture. */
  readonly pictures: number;
  /**
   * Plays, by id, whose picture is missing, is not 11 and 11 different men, puts a man on the wrong
   * team or the wrong side of the ball, or leaves out a man the payload names. Empty when every
   * picture is whole.
   */
  readonly broken: readonly string[];
  readonly byJob: Readonly<Record<CellJob, JobCells>>;
  /** Every pair that differs, most men first. */
  readonly differences: readonly CellDifference[];
  /** Routes the payload states no break cell for (the engine's default lane plays them). */
  readonly routesWithNoBreakCell: number;
  /** Man defenders whose man runs no route (he stays in to block): no break cell to be in, so not compared. */
  readonly manWithNoRoute: number;
}

interface PassStart {
  readonly kind: "PASS_PLAY_V1";
  readonly offense: {
    readonly team: string;
    readonly quarterback: PlayerId;
    readonly routes: readonly RouteAssignment[];
    readonly protection: readonly ProtectionAssignment[];
  };
  readonly defense: {
    readonly team: string;
    readonly assignments: readonly CoverageAssignment[];
    readonly rush: readonly { readonly rusher: PlayerId }[];
  };
  readonly snap?: SnapPicture;
}

interface RunStart {
  readonly kind: "RUN_PLAY_V1";
  readonly offense: { readonly team: string; readonly carrier: PlayerId; readonly blocking: readonly { readonly blocker: PlayerId }[] };
  readonly defense: {
    readonly team: string;
    readonly assignments: readonly CoverageAssignment[];
    readonly rush: readonly { readonly rusher: PlayerId }[];
  };
  readonly snap?: SnapPicture;
}

const key = (cell: FieldZone): string => `${cell.horizontal}/${cell.vertical}`;

const BACKFIELD: FieldZone = {
  horizontal: DEFAULT_TUNABLES.zoneModel.defaultHorizontal,
  vertical: DEFAULT_TUNABLES.zoneModel.backfieldVertical,
};

/** The engine's cell for a route: as stated, or its default lane and the band its air yards reach. */
function breakCell(route: RouteAssignment): FieldZone {
  return route.breakZone ?? { horizontal: DEFAULT_TUNABLES.zoneModel.defaultHorizontal, vertical: verticalZoneForAirYards(route.airYards) };
}

/** Why a picture is not whole, or `undefined` if it is. */
function brokenBy(start: PassStart | RunStart, snapshot: GameSnapshot): string | undefined {
  const picture = start.snap;
  if (picture === undefined) return "no picture";
  const offense = new Set(picture.offense.map((s) => String(s.player)));
  const defense = new Set(picture.defense.map((s) => String(s.player)));
  if (picture.offense.length !== 11 || offense.size !== 11) return "not eleven different men on offense";
  if (picture.defense.length !== 11 || defense.size !== 11) return "not eleven different men on defense";
  const roster = (team: string): Readonly<Record<string, unknown>> =>
    String(snapshot.home.team) === team ? snapshot.home.players : snapshot.away.players;
  const offenseRoster = roster(start.offense.team);
  const defenseRoster = roster(start.defense.team);
  if ([...offense].some((id) => offenseRoster[id] === undefined)) return "an offensive spot names a man not on the offense";
  if ([...defense].some((id) => defenseRoster[id] === undefined)) return "a defensive spot names a man not on the defense";
  // Nobody lines up offside: the offense on or behind the ball, the defense past it (ADR-090 §3's frame).
  if (picture.offense.some((s) => s.y > 0) || picture.defense.some((s) => s.y <= 0)) return "a man lines up on the wrong side of the ball";
  const named =
    start.kind === "PASS_PLAY_V1"
      ? [start.offense.quarterback, ...start.offense.routes.map((r) => r.receiver), ...start.offense.protection.map((p) => p.blocker)]
      : [start.offense.carrier, ...start.offense.blocking.map((b) => b.blocker)];
  if (named.some((id) => !offense.has(String(id)))) return "the call names an offensive man the picture leaves out";
  const defenders = [...start.defense.rush.map((r) => r.rusher), ...start.defense.assignments.map((a) => a.defender)];
  if (defenders.some((id) => !defense.has(String(id)))) return "the call names a defender the picture leaves out";
  return undefined;
}

/** Each man's job on a pass play and the engine's cell for it; `undefined` for a man the engine places nowhere. */
function engineCells(start: PassStart): {
  readonly cells: ReadonlyMap<string, { readonly job: CellJob; readonly cell: FieldZone }>;
  readonly noBreak: number;
  readonly manNoRoute: number;
} {
  const cells = new Map<string, { job: CellJob; cell: FieldZone }>();
  const routes = new Map(start.offense.routes.map((r) => [String(r.receiver), r]));
  let noBreak = 0;
  let manNoRoute = 0;
  for (const spot of start.snap?.offense ?? []) {
    const id = String(spot.player);
    const route = routes.get(id);
    if (id === String(start.offense.quarterback) && route === undefined) cells.set(id, { job: "PASSER", cell: BACKFIELD });
    else if (route !== undefined) {
      if (route.breakZone === undefined) noBreak++;
      cells.set(id, { job: "ROUTE", cell: breakCell(route) });
    } else cells.set(id, { job: "PROTECTION", cell: BACKFIELD });
  }
  const rushers = new Set(start.defense.rush.map((r) => String(r.rusher)));
  const coverage = new Map(start.defense.assignments.map((a) => [String(a.defender), a]));
  for (const spot of start.snap?.defense ?? []) {
    const id = String(spot.player);
    const job = coverage.get(id);
    if (rushers.has(id)) cells.set(id, { job: "RUSH", cell: BACKFIELD });
    else if (job?.kind === "ZONE") cells.set(id, { job: "ZONE", cell: job.zone });
    else if (job?.kind === "MAN") {
      const route = routes.get(String(job.covers));
      if (route === undefined) manNoRoute++;
      else cells.set(id, { job: "MAN", cell: breakCell(route) });
    }
  }
  return { cells, noBreak, manNoRoute };
}

/** Folds games into the check, one at a time, so a batch never holds every stream. */
export function snapCellCheck(): {
  readonly add: (events: readonly MatchEventEnvelope[], snapshot: GameSnapshot) => void;
  readonly result: () => SnapCellCheck;
} {
  let games = 0;
  let plays = 0;
  let passPlays = 0;
  let runPlays = 0;
  let pictures = 0;
  let routesWithNoBreakCell = 0;
  let manWithNoRoute = 0;
  const broken: string[] = [];
  const byJob = new Map<CellJob, { men: number; sameCell: number; sameLane: number; sameBand: number }>(
    CELL_JOBS.map((job) => [job, { men: 0, sameCell: 0, sameLane: 0, sameBand: 0 }]),
  );
  const differences = new Map<string, CellDifference>();

  const add = (events: readonly MatchEventEnvelope[], snapshot: GameSnapshot): void => {
    games++;
    for (const { event } of events) {
      if (event.type !== "PLAY_START") continue;
      const start = event.payload as PassStart | RunStart;
      plays++;
      if (start.snap !== undefined) pictures++;
      const why = brokenBy(start, snapshot);
      if (why !== undefined) broken.push(`${String(event.playId)}: ${why}`);
      if (start.kind === "RUN_PLAY_V1") {
        runPlays++;
        continue;
      }
      passPlays++;
      if (start.snap === undefined) continue;
      const { cells, noBreak, manNoRoute } = engineCells(start);
      routesWithNoBreakCell += noBreak;
      manWithNoRoute += manNoRoute;
      for (const spot of [...start.snap.offense, ...start.snap.defense]) {
        const engine = cells.get(String(spot.player));
        if (engine === undefined) continue;
        const snap = cellOf(spot);
        const row = byJob.get(engine.job)!;
        row.men++;
        const sameLane = snap.horizontal === engine.cell.horizontal;
        const sameBand = snap.vertical === engine.cell.vertical;
        if (sameLane) row.sameLane++;
        if (sameBand) row.sameBand++;
        if (sameLane && sameBand) {
          row.sameCell++;
          continue;
        }
        const id = `${engine.job} ${key(engine.cell)} ${key(snap)}`;
        const was = differences.get(id);
        differences.set(id, { job: engine.job, engine: key(engine.cell), snap: key(snap), men: (was?.men ?? 0) + 1 });
      }
    }
  };

  const result = (): SnapCellCheck => ({
    games,
    plays,
    passPlays,
    runPlays,
    pictures,
    broken,
    byJob: Object.fromEntries(CELL_JOBS.map((job) => [job, { ...byJob.get(job)! }])) as Record<CellJob, JobCells>,
    differences: [...differences.values()].sort(
      (a, b) =>
        CELL_JOBS.indexOf(a.job) - CELL_JOBS.indexOf(b.job) ||
        b.men - a.men ||
        a.engine.localeCompare(b.engine) ||
        a.snap.localeCompare(b.snap),
    ),
    routesWithNoBreakCell,
    manWithNoRoute,
  });

  return { add, result };
}
