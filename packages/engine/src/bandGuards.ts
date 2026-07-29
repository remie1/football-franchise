/**
 * BAND TABLES, THEIR EFFECT COLUMNS, AND WHICH CELLS ARE ACTUALLY READ.
 *
 * ADR-035. Consumed by `packages/calibration`, which builds the gate; the
 * measured verdicts, the five surviving findings and their prices are recorded
 * there.
 *
 * ============================ WHY THIS EXISTS ============================
 *
 * Charter §4.1's newest corollary: *an ordered enum whose order carries meaning
 * gets a monotonicity gate.* A band table is that shape wearing a different hat.
 * Every one of them is an array ordered by `minMargin` DESCENDING — best result
 * first — with effect columns beside it, and the descent is a CLAIM ABOUT
 * BEHAVIOUR: a strictly worse roll never produces a strictly better effect.
 * Nothing in this package asserts that claim, on any of the tables, today.
 *
 * The obstacle is that a naive column-monotonicity assertion goes red on cells
 * that are not defects. `throwExec.accuracy.bands` ends `catchMod: 0` on the
 * `MISS` row after `−25` on `BAD`, which reads as an inversion and is not one:
 * `MISS` carries `catchable: false`, the play returns before the catch is
 * resolved, and the cell is never consulted. Charter §4.1's counter-corollary
 * says what happens to a gate that fires on such a cell — *a guard that always
 * fires gets deleted.*
 *
 * So the gate needs a set of EXEMPT cells. The only safe way to have one is to
 * DERIVE it. A hand-maintained exemption list is a second source of truth about
 * which resolver reads which column; it goes stale the first time a resolver
 * changes, and **a stale exemption is indistinguishable from a suppressed
 * defect** — the §4.1 failure class exactly, since it renders green.
 *
 * ========================= HOW IT IS DERIVED =========================
 *
 * By COUNTERFACTUAL PERTURBATION against the event stream, which is the
 * project's single source of truth (Charter §1.3 pillar 3):
 *
 *     A cell is LIVE iff changing its value changes what the engine emits.
 *
 * Nothing is declared and nothing is parsed. The relation asks the engine, and
 * the engine answers by running. An engine change that starts reading a
 * previously inert cell moves the stream on the next run and the cell stops
 * being exempt WITHOUT ANYONE EDITING ANYTHING — which is the property the whole
 * design is for.
 *
 * Three further verdicts fall out of the same instrument, and the distinction
 * between them is the point (a dead cell is exempt; dead CODE is not):
 *
 *   LIVE               perturbing the cell moved the stream. Gated.
 *   GUARDED            inert on THIS row, live on at least one sibling row of
 *                      the same column. The read site exists and runs; this
 *                      row's own state is what stops it being reached.
 *                      **The one exemption.**
 *   UNREAD_COLUMN      inert on EVERY reachable row. Nothing consumes the column
 *                      at all. That is dead data wearing an exemption — NOT
 *                      exempt, reported as a finding.
 *   UNREACHED_ROW      the row is never selected by the corpus, so nothing about
 *                      it can be ruled either way. NOT exempt, reported as a
 *                      blind spot.
 *   UNDER_SAMPLED_ROW  selected, but fewer times than the caller's floor. NOT
 *                      exempt. See `DeriveOptions.rowReach` for the case that
 *                      forced this verdict to exist.
 *   UNPERTURBABLE      no perturbation exists (a string cell). NOT exempt, and
 *                      never silently folded in with the inert ones.
 *
 * ===================== WHAT THE RELATION CANNOT SEE =====================
 *
 * 1. **Population, not proof.** Liveness is measured over the caller's corpus.
 *    A cell live only on a play the corpus never produces reads INERT, and if a
 *    sibling is live it reads GUARDED — an OVER-exemption. `rowReach` is
 *    reported per row so the caller can refuse below a floor
 *    (`docs/design/calibration.md` §5.3's live-population precondition, applied
 *    to cells).
 * 2. **Observability is the stream.** A cell that changes only something the
 *    engine never emits reads INERT. Under Charter §1.3 that is a distinction
 *    without a difference — but it is a real one for `newState`, so callers
 *    should fold the resulting state into their digest.
 * 3. **Cancellation.** A perturbation that happens to produce an identical
 *    stream reads INERT. Two independent deltas per numeric cell (§`DELTAS`)
 *    make that require two coincidences rather than one; it is mitigation, not
 *    a proof.
 * 4. **Reachability is measured by collapse, not by counting.** A row whose
 *    selection has no observable consequence AT ALL — every effect column inert
 *    and its label unemitted — is indistinguishable from a row that never
 *    occurs, and is reported `UNREACHED_ROW`. That errs toward NOT exempting.
 * 5. **MUTUAL MASKING, and it is the sharpest limitation here.** Perturbation is
 *    ONE CELL AT A TIME, so two cells that each independently suppress the same
 *    consequence both read inert and both are reported `GUARDED` — including the
 *    one that IS the guard. Live instance: `tippedBall.qualityBands`' `DEAD` row
 *    carries `recoverable: false` AND `maxZoneDistance: -1`, and flipping either
 *    alone changes nothing because the other still empties the candidate list.
 *    The relation therefore cannot tell a guard from the thing it guards when
 *    they are redundant. A pairwise sweep would close it and costs O(n²);
 *    nothing in the current tables needs it, because both masked columns are
 *    monotone anyway.
 * 6. **A string column has no perturbation and no order.** `manCoverage.contest`
 *    and `runGame.pointOfAttack.contact` are reported `UNPERTURBABLE` and are
 *    excluded from ordering. `contest` in particular DOES carry an order —
 *    TRAILING < EVEN < IN_FRONT, ranked by the numeric table that consumes it
 *    (`catching.contested.positionModifier`) — so an ordering for it is
 *    derivable from a sibling tunable rather than declarable. Not built here;
 *    named so it is not mistaken for absent.
 */
import type { Tunables, TunablePatch } from "./tunables.js";
import { applyTunablePatch } from "./tunables.js";

// --- discovery ---------------------------------------------------------------

/** A cell's value. Band rows carry nothing else. */
export type BandValue = number | boolean | string;

export interface BandRow {
  readonly index: number;
  readonly label: string;
  readonly minMargin: number;
  readonly cells: Readonly<Record<string, BandValue>>;
}

export interface BandTable {
  /** Dotted path into `Tunables`, e.g. `throwExec.accuracy.bands`. */
  readonly path: string;
  readonly rows: readonly BandRow[];
  /** Every key present on any row except `label` and `minMargin`. */
  readonly columns: readonly string[];
}

/**
 * A band table is recognised STRUCTURALLY, never by name: an array whose every
 * element is an object carrying a numeric `minMargin` and a string `label`.
 * A table added under a new key is discovered on the next run; a table renamed
 * is still discovered. There is no list of tables anywhere in this package.
 */
function isBandRow(node: unknown): node is Record<string, BandValue> {
  if (typeof node !== "object" || node === null || Array.isArray(node)) return false;
  const record = node as Record<string, unknown>;
  return typeof record["minMargin"] === "number" && typeof record["label"] === "string";
}

export function discoverBandTables(tunables: Tunables): BandTable[] {
  const found: BandTable[] = [];

  const walk = (node: unknown, path: string): void => {
    if (typeof node !== "object" || node === null) return;
    if (Array.isArray(node)) {
      if (node.length > 0 && node.every(isBandRow)) {
        found.push(readTable(path, node));
        return;
      }
      node.forEach((child, i) => walk(child, `${path}${path === "" ? "" : "."}${String(i)}`));
      return;
    }
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      walk(child, path === "" ? key : `${path}.${key}`);
    }
  };

  walk(tunables, "");
  found.sort((a, b) => a.path.localeCompare(b.path));
  return found;
}

/**
 * Every LABELLED LADDER in the tree: an array of objects whose rows carry a
 * `label`, whether or not they are keyed on `minMargin`.
 *
 * This exists so discovery's one blind spot is LOUD rather than silent. A band
 * table keyed on some other threshold — `pocket.thresholds` is keyed on
 * `minProgress` — is not discovered, and a test that compares this list against
 * `discoverBandTables` fails the moment a new labelled ladder appears, forcing a
 * triage instead of a silent skip. The declaration that survives is therefore
 * "which labelled ladders are NOT margin band tables", which is one line long
 * and breaks when it is wrong — not "which cells are exempt", which would be
 * long and would rot quietly.
 */
export function labelledLadderPaths(tunables: Tunables): string[] {
  const found: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node !== "object" || node === null) return;
    if (Array.isArray(node)) {
      const objects = node.filter((e) => typeof e === "object" && e !== null);
      if (objects.length === node.length && node.length > 0) {
        const labelled = node.every(
          (e) => typeof (e as Record<string, unknown>)["label"] === "string",
        );
        if (labelled) {
          found.push(path);
          return;
        }
      }
      node.forEach((child, i) => walk(child, `${path}${path === "" ? "" : "."}${String(i)}`));
      return;
    }
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      walk(child, path === "" ? key : `${path}.${key}`);
    }
  };
  walk(tunables, "");
  return found.sort();
}

function readTable(path: string, rows: readonly Record<string, BandValue>[]): BandTable {
  const columns: string[] = [];
  const bandRows = rows.map((row, index) => {
    const cells: Record<string, BandValue> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === "label" || key === "minMargin") continue;
      cells[key] = value;
      if (!columns.includes(key)) columns.push(key);
    }
    return {
      index,
      label: String(row["label"]),
      minMargin: Number(row["minMargin"]),
      cells,
    };
  });
  columns.sort();
  return { path, rows: bandRows, columns };
}

// --- ordering ----------------------------------------------------------------

export interface BandCell {
  readonly table: string;
  readonly rowIndex: number;
  readonly rowLabel: string;
  readonly column: string;
  readonly value: BandValue;
}

export function cellId(cell: BandCell): string {
  return `${cell.table}.${String(cell.rowIndex)}.${cell.column}`;
}

/** The dotted path `applyTunablePatch` accepts for this cell. */
export function cellPath(cell: BandCell): string {
  return `${cell.table}.${String(cell.rowIndex)}.${cell.column}`;
}

/**
 * A column is ORDERABLE if every value in it is a number, or every value is a
 * boolean. A string column carries no order and is excluded rather than
 * assumed — `checkKind`-shaped data is identity, not severity.
 */
export function columnIsOrderable(table: BandTable, column: string): boolean {
  const values = table.rows.map((r) => r.cells[column]).filter((v) => v !== undefined);
  if (values.length === 0) return false;
  return values.every((v) => typeof v === "number") || values.every((v) => typeof v === "boolean");
}

function numeric(value: BandValue): number {
  return typeof value === "boolean" ? (value ? 1 : 0) : Number(value);
}

export interface OrderViolation {
  readonly table: string;
  readonly column: string;
  /** Row indices, in table order, whose values were compared. */
  readonly rows: readonly number[];
  readonly values: readonly number[];
  /** Human-readable reason: the sequence rises AND falls. */
  readonly detail: string;
}

/**
 * Monotone in EITHER direction. The gate does not know which way a column should
 * point — `catchMod` descends and `difficulty` ascends, and both are correct —
 * so the assertion is that a column does not do both. That is the whole content
 * of "the order carries meaning": a strictly worse roll must not move an effect
 * back toward better.
 *
 * `exempt` names cells (by `cellId`) to DROP from the sequence before checking.
 * A dropped cell is not compared against either neighbour, so the rows either
 * side are compared to each other — which is what "this cell is never read"
 * means for an ordering claim.
 */
export function orderViolations(
  table: BandTable,
  options: { readonly exempt?: ReadonlySet<string> } = {},
): OrderViolation[] {
  const exempt = options.exempt ?? new Set<string>();
  const out: OrderViolation[] = [];
  for (const column of table.columns) {
    if (!columnIsOrderable(table, column)) continue;
    const kept = table.rows.filter((row) => {
      if (row.cells[column] === undefined) return false;
      return !exempt.has(
        cellId({ table: table.path, rowIndex: row.index, rowLabel: row.label, column, value: 0 }),
      );
    });
    if (kept.length < 2) continue;
    const values = kept.map((r) => numeric(r.cells[column] as BandValue));
    let rises = false;
    let falls = false;
    for (let i = 1; i < values.length; i++) {
      const a = values[i - 1] as number;
      const b = values[i] as number;
      if (b > a) rises = true;
      if (b < a) falls = true;
    }
    if (rises && falls) {
      out.push({
        table: table.path,
        column,
        rows: kept.map((r) => r.index),
        values,
        detail: `${column} both rises and falls down the table: [${values.join(", ")}]`,
      });
    }
  }
  return out;
}

// --- perturbation ------------------------------------------------------------

/**
 * Two deltas, deliberately odd and coprime-ish, so a cell has to survive two
 * independent nudges to read inert. Applied additively to a numeric cell; a
 * boolean cell is flipped (one perturbation, since a boolean has one).
 */
export const DELTAS: readonly number[] = [7, -13];

export function perturbationsFor(cell: BandCell): TunablePatch[] {
  const base = {
    tunableId: cellPath(cell),
    evidence: "engine/src/bandGuards.ts — liveness derivation",
    expectedEffect: "none, if the cell is never read",
  };
  if (typeof cell.value === "boolean") {
    return [{ ...base, currentValue: cell.value, proposedValue: !cell.value }];
  }
  if (typeof cell.value === "number") {
    if (!Number.isFinite(cell.value)) return [];
    return DELTAS.map((d) => ({ ...base, currentValue: cell.value as number, proposedValue: (cell.value as number) + d }));
  }
  return [];
}

/**
 * Make a row UNREACHABLE without touching any effect column, so that "was this
 * row ever selected?" is answered by the same instrument as "is this cell read?".
 *
 * `bandFor` scans top-down and takes the first row whose `minMargin` is at or
 * below the margin, so a row is starved by widening its PREDECESSOR to cover it.
 * The top row is starved by raising its own `minMargin` out of reach.
 */
export function starvationFor(table: BandTable, rowIndex: number): TunablePatch | undefined {
  const row = table.rows[rowIndex];
  if (row === undefined) return undefined;
  const base = {
    evidence: "engine/src/bandGuards.ts — row-reachability derivation",
    expectedEffect: "none, if the row is never selected",
  };
  if (rowIndex === 0) {
    if (!Number.isFinite(row.minMargin)) return undefined;
    return {
      ...base,
      tunableId: `${table.path}.0.minMargin`,
      currentValue: row.minMargin,
      proposedValue: Number.POSITIVE_INFINITY,
    };
  }
  const previous = table.rows[rowIndex - 1];
  if (previous === undefined) return undefined;
  return {
    ...base,
    tunableId: `${table.path}.${String(rowIndex - 1)}.minMargin`,
    currentValue: previous.minMargin,
    proposedValue: row.minMargin,
  };
}

// --- the relation ------------------------------------------------------------

export type Liveness =
  | "LIVE"
  | "GUARDED"
  | "UNREAD_COLUMN"
  | "UNREACHED_ROW"
  | "UNDER_SAMPLED_ROW"
  | "UNPERTURBABLE";

export interface CellVerdict extends BandCell {
  readonly liveness: Liveness;
  /** How many times the corpus selected this row, when the caller supplied it. */
  readonly rowReach?: number;
  /** Which perturbation moved the stream, if any. */
  readonly movedBy?: string;
  /**
   * For GUARDED: the sibling rows of the same column that ARE live. This is the
   * evidence that the read site exists — the thing a declared exemption cannot
   * produce.
   */
  readonly liveSiblings?: readonly string[];
}

export interface GuardedByRelation {
  readonly verdicts: readonly CellVerdict[];
  /** `cellId`s whose verdict is GUARDED — the exemption set, and nothing else. */
  readonly exempt: ReadonlySet<string>;
  /** Rows the corpus never selected, by `table.rowIndex`. */
  readonly unreachedRows: readonly string[];
  /** Rows the corpus selected too few times to rule on, by `table.rowIndex`. */
  readonly underSampledRows: readonly string[];
  /** Columns nothing reads, by `table.column`. */
  readonly unreadColumns: readonly string[];
  /** How many simulation runs the derivation cost. */
  readonly observations: number;
  /**
   * Whether a population floor was in force. FALSE means every `GUARDED` verdict
   * here is unqualified by reach and may be an over-exemption — say so out loud
   * rather than letting a consumer read an unfloored relation as a floored one.
   */
  readonly reachFloorApplied: boolean;
}

/**
 * The observer the caller supplies: run YOUR corpus under these tunables and
 * return a digest of everything the engine emitted. The engine does not own a
 * corpus — a corpus is a population, and `docs/design/calibration.md` §5.3 makes
 * population the caller's responsibility to state and to size.
 */
export type StreamObserver = (tunables: Tunables) => string;

export interface DeriveOptions {
  readonly tunables: Tunables;
  readonly observe: StreamObserver;
  /** Restrict the derivation to these cells. Omitted derives every cell. */
  readonly cells?: readonly BandCell[];
  /** Restrict to these tables by path. Ignored when `cells` is given. */
  readonly tables?: readonly string[];
  /**
   * How many times each row was SELECTED in the corpus, keyed `table.rowIndex`.
   *
   * NOT OPTIONAL IN SPIRIT, AND HERE IS THE CASE THAT PROVED IT. On the engine's
   * own 24-game corpus `tippedBall.qualityBands` row `GIFT` was selected TWICE
   * and `FLOATER` TWICE. Both rows' `speedCheckFromDistance` read inert and were
   * classified `GUARDED` — and the guard does not exist: those rows carry
   * `maxZoneDistance: 2` and `speedCheckFromDistance: 2`, so the column IS
   * reachable and simply had no candidate two zones away in four samples. That
   * is an OVER-exemption arrived at honestly, which is the one failure mode this
   * whole design has, and the only defence against it is a population floor.
   *
   * `docs/design/calibration.md` §5.3's live-population precondition, applied
   * per ROW. Supply it and set `minRowReach`; a row below the floor is reported
   * `UNDER_SAMPLED_ROW` and is NEVER exempt.
   *
   * Omitting it applies no floor, and `GuardedByRelation.reachFloorApplied` says
   * so, so a consumer cannot mistake "not measured" for "measured and fine".
   */
  readonly rowReach?: ReadonlyMap<string, number>;
  /** Rows selected fewer times than this are never exempted. Default 0 = no floor. */
  readonly minRowReach?: number;
}

export function allCells(tunables: Tunables, tables?: readonly string[]): BandCell[] {
  const out: BandCell[] = [];
  for (const table of discoverBandTables(tunables)) {
    if (tables !== undefined && !tables.includes(table.path)) continue;
    for (const row of table.rows) {
      for (const column of table.columns) {
        const value = row.cells[column];
        if (value === undefined) continue;
        out.push({ table: table.path, rowIndex: row.index, rowLabel: row.label, column, value });
      }
    }
  }
  return out;
}

/**
 * DERIVE `guardedBy`. Nothing here is declared; every verdict is the result of
 * running the caller's corpus against a patched tunables tree and comparing the
 * digest to the baseline.
 */
export function deriveGuardedBy(options: DeriveOptions): GuardedByRelation {
  const { tunables, observe } = options;
  const tables = discoverBandTables(tunables);
  const byPath = new Map(tables.map((t) => [t.path, t]));
  const cells = options.cells ?? allCells(tunables, options.tables);
  const floor = options.minRowReach ?? 0;
  const baseline = observe(tunables);
  let observations = 1;

  const run = (patch: TunablePatch): boolean => {
    observations += 1;
    return observe(applyTunablePatch(tunables, patch)) !== baseline;
  };

  // 1. Row reachability, once per (table, row) touched by the cell list.
  const rowKeys = new Set(cells.map((c) => `${c.table}.${String(c.rowIndex)}`));
  const reached = new Map<string, boolean>();
  for (const key of [...rowKeys].sort()) {
    const cell = cells.find((c) => `${c.table}.${String(c.rowIndex)}` === key);
    if (cell === undefined) continue;
    const table = byPath.get(cell.table);
    if (table === undefined) continue;
    const starve = starvationFor(table, cell.rowIndex);
    reached.set(key, starve === undefined ? true : run(starve));
  }

  // 2. Cell liveness.
  interface Raw extends BandCell {
    readonly reachedRow: boolean;
    readonly live: boolean;
    /**
     * No perturbation exists for this cell — a string value, or a non-finite
     * number. It is reported as such and NEVER exempted: an unmeasured cell must
     * not be indistinguishable from a measured-inert one, which is exactly the
     * "green because nobody looked" failure §4.1 names.
     */
    readonly perturbable: boolean;
    readonly movedBy?: string;
  }
  const raw: Raw[] = [];
  for (const cell of cells) {
    const rowKey = `${cell.table}.${String(cell.rowIndex)}`;
    const reachedRow = reached.get(rowKey) ?? true;
    const patches = perturbationsFor(cell);
    let live = false;
    let movedBy: string | undefined;
    for (const patch of patches) {
      if (run(patch)) {
        live = true;
        movedBy = `${patch.tunableId} ${String(patch.currentValue)} → ${String(patch.proposedValue)}`;
        break;
      }
    }
    raw.push({
      ...cell,
      reachedRow,
      live,
      perturbable: patches.length > 0,
      ...(movedBy === undefined ? {} : { movedBy }),
    });
  }

  // 3. Classification. A column's read site is proven to exist by ANY live cell
  //    in it; that is what separates a guarded cell from dead data.
  const liveByColumn = new Map<string, string[]>();
  for (const r of raw) {
    if (!r.live) continue;
    const key = `${r.table}.${r.column}`;
    liveByColumn.set(key, [...(liveByColumn.get(key) ?? []), r.rowLabel]);
  }

  const verdicts: CellVerdict[] = raw.map((r) => {
    const siblings = liveByColumn.get(`${r.table}.${r.column}`) ?? [];
    const base: BandCell = {
      table: r.table,
      rowIndex: r.rowIndex,
      rowLabel: r.rowLabel,
      column: r.column,
      value: r.value,
    };
    const rowKey = `${r.table}.${String(r.rowIndex)}`;
    const reach = options.rowReach?.get(rowKey);
    const withReach = reach === undefined ? base : { ...base, rowReach: reach };
    if (r.live) {
      return { ...withReach, liveness: "LIVE", ...(r.movedBy === undefined ? {} : { movedBy: r.movedBy }) };
    }
    if (!r.perturbable) return { ...withReach, liveness: "UNPERTURBABLE" };
    if (!r.reachedRow) return { ...withReach, liveness: "UNREACHED_ROW" };
    if (reach !== undefined && reach < floor) return { ...withReach, liveness: "UNDER_SAMPLED_ROW" };
    if (siblings.length > 0) return { ...withReach, liveness: "GUARDED", liveSiblings: siblings };
    return { ...withReach, liveness: "UNREAD_COLUMN" };
  });

  const exempt = new Set(verdicts.filter((v) => v.liveness === "GUARDED").map(cellId));
  const rowsWith = (liveness: Liveness): string[] =>
    [...new Set(
      verdicts.filter((v) => v.liveness === liveness).map((v) => `${v.table}.${String(v.rowIndex)}`),
    )].sort();
  const unreadColumns = [...new Set(
    verdicts.filter((v) => v.liveness === "UNREAD_COLUMN").map((v) => `${v.table}.${v.column}`),
  )].sort();

  return {
    verdicts,
    exempt,
    unreachedRows: rowsWith("UNREACHED_ROW"),
    underSampledRows: rowsWith("UNDER_SAMPLED_ROW"),
    unreadColumns,
    observations,
    reachFloorApplied: options.rowReach !== undefined && floor > 0,
  };
}
