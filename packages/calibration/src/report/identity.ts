/**
 * WHAT MAKES TWO BASELINE REPORTS COMPARABLE — and the refusal that keeps them so.
 *
 * ============================ THE DEFECT THIS EXISTS FOR ============================
 *
 * `reports/baseline-0002.carry-forward.json` was written correctly by a mechanism that works, and
 * within days it was **silently wrong**: the corpus and the sack-credit dispatches moved the
 * engine, so re-running that batch reproduced neither its scoring nor its sack rate. The file
 * itself recorded nothing that could reveal this. A `baseline-0003` pointed at it would have
 * printed a full trend column of confident arrows measuring the distance between this run and a
 * tree that no longer exists.
 *
 * That is Charter §4.1's sharpest form — *where a wrong answer would look like a right one,
 * encode the constraint*. An arrow reading `sack_rate −4.2pp` looks exactly like progress. It
 * renders green-adjacent. Nothing about it says "half of this number is a dispatch you changed
 * and forgot".
 *
 * ============================ THE IDENTITY OF A COMPARABLE BASELINE ============================
 *
 * The criterion applied throughout this module: **a field belongs to the identity when a change
 * to it means the predecessor's number is no longer an estimate of the same quantity under the
 * same system.** Not "anything that differs" — that would refuse everything and get deleted.
 *
 *   IN the identity                     because
 *   ---------------------------------   ------------------------------------------------------
 *   engineCommit                        the code that produced the numbers. In this monorepo one
 *                                       commit pins the engine, the playbook corpus AND this
 *                                       package's metric library, which is why one field is
 *                                       enough — see THE UNCOVERED DIMENSION below.
 *   tunablesVersion                     §6's audit trail. A trend across a tunables patch has the
 *                                       patch baked into the delta with no control arm.
 *   tunablesDigest                      the same claim, MEASURED rather than asserted. The label
 *                                       can read `DEFAULT_TUNABLES` on both sides while
 *                                       `DEFAULT_TUNABLES` itself moved underneath it.
 *   callerVersion, callerFourthDownVersion
 *                                       the frozen caller sets the play mix that every rate in
 *                                       the library is measured over. A different caller is a
 *                                       different denominator.
 *   leagueId, leagueProvenance          the population being sampled, and what may be claimed of
 *                                       it (ADR-020). A flat league and an archetype league do
 *                                       not measure the same thing.
 *   scheduleKind, season                the fixture population.
 *   availabilityMatched                 a replay with real absences runs weaker rosters than a
 *                                       full-strength one. Same league id, different teams.
 *   eligibility, realSeasons            the sim column trends on its own, but `comfortableStreak`
 *                                       — the counter that RATCHETS A BAND PERMANENTLY — is a
 *                                       verdict against the real side. A streak earned against
 *                                       different real evidence is not the same streak, and a
 *                                       streak earned against 2025 may never move a gate at all
 *                                       (§7, the sacred season).
 *
 *   RECORDED, NOT IDENTITY              because
 *   ---------------------------------   ------------------------------------------------------
 *   seedDigest, batchSeed               two seed lists over the same league and the same tree are
 *                                       two independent samples of ONE population. The estimand
 *                                       is identical; only the noise differs, and the 95% CIs
 *                                       already printed beside every row are how a reader judges
 *                                       that. Refusing here would forbid the one trend that is
 *                                       unambiguously legitimate — the same batch re-run larger.
 *   games                               likewise: more n, same quantity. Backlog 22c forbids
 *                                       buying anything by reducing n; it does not forbid raising
 *                                       it, and identity must not either.
 *   workers, executorName               `harness.test.ts` asserts these cannot move a result.
 *
 * ============================ "BUT THEN THE TREND COLUMN NEVER FIRES" ============================
 *
 * It fires less often than a reader might expect, and the objection is worth answering directly,
 * because the obvious use of a trend column — *"I changed the engine; did yards-per-carry come
 * down?"* — is exactly the use this module refuses.
 *
 * It refuses it because that comparison is a **one-armed A/B**. Two runs that differ in an
 * uncontrolled way are not evidence about either of them; that is the whole reason
 * `test/attribution.test.ts` exists and runs its counterfactual arms through
 * `applyTunablePatch` **in one process on one tree** rather than diffing two reports. A trend
 * arrow across a commit boundary is that same comparison with the control arm quietly missing,
 * dressed as a table cell.
 *
 * So the answer to "how do I see the effect of my change" is one of two honest instruments, both
 * named in the refusal message itself:
 *
 *   - **Re-baseline.** Re-run the predecessor's batch configuration on the current tree and
 *     trend against THAT. It costs one batch run and it buys a real control arm.
 *   - **Counterfactual.** For a change expressible as a tunable, `attribution.test.ts` measures
 *     both arms at once and no trend column is involved.
 *
 * ============================ THE UNCOVERED DIMENSION ============================
 *
 * Stated rather than hidden, in the house style of `metrics/absence.ts`. Identity covers the
 * engine and the batch configuration. It does **not** independently cover the metric library:
 * there is no digest of `computeFromEvents`, because a function body cannot be hashed honestly
 * and hashing the `definition` prose would refuse a trend over a typo fix. The mitigation is
 * structural rather than clever — this is a single-commit monorepo, so `engineCommit` is the
 * whole-tree commit and a metric-library change moves it too. If these packages are ever split,
 * this comment is the notice that a second commit field becomes necessary.
 */
import type { Eligibility } from "../ingest/seasons.js";
import type { BatchProvenance } from "../harness/batch.js";
import type { ScheduleSpec } from "../harness/schedule.js";
import type { LeagueProvenance } from "../league/provenance.js";

/** Metric id → the scalar a report recorded, plus the streaks it earned. */
export interface PreviousReport {
  readonly id: string;
  /** Metric id → the scalar the previous report recorded, for the trend column. */
  readonly sim: Readonly<Record<string, number>>;
  readonly comfortableStreak: Readonly<Record<string, number>>;
}

/**
 * The tuple two reports must agree on before one may inform the other.
 *
 * Every field is a string or a primitive that prints, because a mismatch has to be readable in a
 * markdown table by somebody who was not there.
 */
export interface BaselineIdentity {
  /** A git object name, 7-40 lowercase hex, optionally `-dirty`. See `assertEngineCommit`. */
  readonly engineCommit: string;
  readonly tunablesVersion: string;
  /** Measured from the tunables the batch actually ran, not asserted by a caller. */
  readonly tunablesDigest: string;
  readonly callerVersion: string;
  readonly callerFourthDownVersion: string;
  readonly leagueId: string;
  readonly leagueProvenance: LeagueProvenance;
  readonly scheduleKind: ScheduleSpec["kind"];
  readonly season: number;
  readonly availabilityMatched: boolean;
  readonly eligibility: Eligibility;
  readonly realSeasons: readonly number[];
}

/** Recorded for the reader and for reproduction; deliberately NOT part of the identity. */
export interface CarryForwardContext {
  readonly seedDigest: string;
  readonly batchSeed: string;
  readonly games: number;
}

/** The format tag. A file without one predates the provenance stamp and is refused by id. */
export const CARRY_FORWARD_FORMAT = "carry-forward/v1";

/** What a report writes for its successor. A `PreviousReport` plus the proof it is comparable. */
export interface CarryForward extends PreviousReport {
  readonly format: typeof CARRY_FORWARD_FORMAT;
  readonly identity: BaselineIdentity;
  readonly context: CarryForwardContext;
}

// --- the engine commit ------------------------------------------------------

/**
 * A git object name, lower-case, 7-40 hex, with an optional `-dirty` suffix.
 *
 * Deliberately NOT permissive. `HEAD`, `main`, `latest` and `""` all name something that moves,
 * and a provenance field that can hold a moving name records nothing. The narrow pattern is the
 * only check available to a library that may not shell out, so it is the one that has to carry
 * weight: it cannot tell you the hash is the RIGHT one, but it can tell you it is a hash.
 */
export const ENGINE_COMMIT_PATTERN = /^[0-9a-f]{7,40}(-dirty)?$/;

export class EngineCommitError extends Error {
  constructor(value: string) {
    super(
      `"${value}" is not an engine commit. A baseline's carry-forward records the tree its ` +
        `numbers were produced against, so it must be a git object name — 7 to 40 lower-case hex ` +
        `characters, optionally suffixed "-dirty" for an uncommitted working tree. ` +
        `A branch name, "HEAD", or an empty string names something that moves, and a provenance ` +
        `field that can hold a moving name records nothing. ` +
        `Produce one with: git rev-parse HEAD`,
    );
    this.name = "EngineCommitError";
  }
}

export function assertEngineCommit(value: string): string {
  const normalised = value.trim().toLowerCase();
  if (!ENGINE_COMMIT_PATTERN.test(normalised)) throw new EngineCommitError(value);
  return normalised;
}

export function isDirtyCommit(commit: string): boolean {
  return commit.endsWith("-dirty");
}

/**
 * Assemble the identity of a run.
 *
 * Every field except `engineCommit` is lifted from provenance the harness measured; the commit is
 * the one thing a pure function cannot know about itself and so the one thing a caller must
 * supply. `assertEngineCommit` runs here rather than at the call site, so there is exactly one
 * gate and it is on the path every identity takes.
 */
export function baselineIdentity(input: {
  readonly provenance: BatchProvenance;
  readonly engineCommit: string;
  readonly eligibility: Eligibility;
  readonly realSeasons: readonly number[];
}): BaselineIdentity {
  const p = input.provenance;
  return {
    engineCommit: assertEngineCommit(input.engineCommit),
    tunablesVersion: p.tunablesVersion,
    tunablesDigest: p.tunablesDigest,
    callerVersion: p.callerVersion,
    callerFourthDownVersion: p.callerFourthDownVersion,
    leagueId: p.leagueId,
    leagueProvenance: p.leagueProvenance,
    scheduleKind: p.scheduleKind,
    season: p.season,
    availabilityMatched: p.availabilityMatched,
    eligibility: input.eligibility,
    realSeasons: [...input.realSeasons],
  };
}

// --- comparison -------------------------------------------------------------

export interface IdentityMismatch {
  readonly field: string;
  readonly previous: string;
  readonly current: string;
  /** Why this particular difference makes the two reports incomparable. Printed. */
  readonly why: string;
}

const WHY: Readonly<Record<string, string>> = {
  engineCommit:
    "the predecessor's numbers were produced by code that is not the code running now",
  tunablesVersion: "different tunables version (calibration.md §6 — the audit trail)",
  tunablesDigest:
    "the tunables VALUES differ. If the version labels above matched, the label is lying: " +
    "the named version changed underneath both reports",
  callerVersion: "a different frozen caller sets a different play mix — a different denominator",
  callerFourthDownVersion: "a different fourth-down policy changes drive length and scoring",
  leagueId: "a different league is a different population",
  leagueProvenance: "a different provenance changes what the report may claim at all (ADR-020)",
  scheduleKind: "a different fixture population",
  season: "a different season's fixtures",
  availabilityMatched:
    "one run imposed real weekly absences and the other ran full strength — same league id, " +
    "different teams on the field",
  eligibility:
    "calibration.md §7 — a streak earned against the sacred season may never move a gate",
  realSeasons: "the deviation and comfort verdicts were measured against different real evidence",
};

function why(field: string): string {
  return WHY[field] ?? "differs";
}

function push(
  into: IdentityMismatch[],
  field: string,
  previous: string,
  current: string,
): void {
  if (previous !== current) into.push({ field, previous, current, why: why(field) });
}

/**
 * Every way in which `previous` fails to be a comparable baseline for `current`.
 *
 * ★ A DIRTY TREE NEVER COMPARES EQUAL — INCLUDING TO ITSELF. ★ `abc1234-dirty` records that the
 * working tree held uncommitted edits, and nothing in the file says WHICH edits. Two runs both
 * stamped `abc1234-dirty` may have been produced by two different pieces of code. Treating them
 * as comparable because the strings match would reintroduce exactly the defect this module
 * exists for, and it would do it in the one situation where a developer is most likely to be
 * mid-change.
 */
export function compareIdentity(
  previous: BaselineIdentity,
  current: BaselineIdentity,
): readonly IdentityMismatch[] {
  const mismatches: IdentityMismatch[] = [];

  if (isDirtyCommit(previous.engineCommit) || isDirtyCommit(current.engineCommit)) {
    mismatches.push({
      field: "engineCommit",
      previous: previous.engineCommit,
      current: current.engineCommit,
      why:
        "a -dirty tree carries uncommitted edits that nothing records, so it is not comparable " +
        "to anything — including another run stamped with the same hash",
    });
  } else {
    push(mismatches, "engineCommit", previous.engineCommit, current.engineCommit);
  }

  push(mismatches, "tunablesVersion", previous.tunablesVersion, current.tunablesVersion);
  push(mismatches, "tunablesDigest", previous.tunablesDigest, current.tunablesDigest);
  push(mismatches, "callerVersion", previous.callerVersion, current.callerVersion);
  push(
    mismatches,
    "callerFourthDownVersion",
    previous.callerFourthDownVersion,
    current.callerFourthDownVersion,
  );
  push(mismatches, "leagueId", previous.leagueId, current.leagueId);
  push(mismatches, "leagueProvenance", previous.leagueProvenance, current.leagueProvenance);
  push(mismatches, "scheduleKind", previous.scheduleKind, current.scheduleKind);
  push(mismatches, "season", String(previous.season), String(current.season));
  push(
    mismatches,
    "availabilityMatched",
    String(previous.availabilityMatched),
    String(current.availabilityMatched),
  );
  push(mismatches, "eligibility", previous.eligibility, current.eligibility);
  push(
    mismatches,
    "realSeasons",
    [...previous.realSeasons].join(", "),
    [...current.realSeasons].join(", "),
  );

  return mismatches;
}

// --- reading a carry-forward file -------------------------------------------

export type CarryForwardRead =
  | { readonly ok: true; readonly value: CarryForward }
  /** Not a refusal to trend — a refusal to even call this a carry-forward. */
  | { readonly ok: false; readonly problem: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberMap(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out[k] = v;
  }
  return out;
}

const IDENTITY_STRING_FIELDS = [
  "engineCommit",
  "tunablesVersion",
  "tunablesDigest",
  "callerVersion",
  "callerFourthDownVersion",
  "leagueId",
  "leagueProvenance",
  "scheduleKind",
  "eligibility",
] as const;

function readIdentity(value: unknown): BaselineIdentity | string {
  if (!isRecord(value)) return "no `identity` object";
  for (const field of IDENTITY_STRING_FIELDS) {
    if (typeof value[field] !== "string" || (value[field] as string).length === 0) {
      return `\`identity.${field}\` is missing or not a non-empty string`;
    }
  }
  if (typeof value["season"] !== "number") return "`identity.season` is missing or not a number";
  if (typeof value["availabilityMatched"] !== "boolean") {
    return "`identity.availabilityMatched` is missing or not a boolean";
  }
  const seasons = value["realSeasons"];
  if (!Array.isArray(seasons) || seasons.some((s) => typeof s !== "number")) {
    return "`identity.realSeasons` is missing or not an array of numbers";
  }
  return {
    engineCommit: value["engineCommit"] as string,
    tunablesVersion: value["tunablesVersion"] as string,
    tunablesDigest: value["tunablesDigest"] as string,
    callerVersion: value["callerVersion"] as string,
    callerFourthDownVersion: value["callerFourthDownVersion"] as string,
    leagueId: value["leagueId"] as string,
    leagueProvenance: value["leagueProvenance"] as LeagueProvenance,
    scheduleKind: value["scheduleKind"] as ScheduleSpec["kind"],
    season: value["season"] as number,
    availabilityMatched: value["availabilityMatched"] as boolean,
    eligibility: value["eligibility"] as Eligibility,
    realSeasons: seasons as readonly number[],
  };
}

/**
 * Parse a carry-forward file's JSON.
 *
 * Returns a problem string rather than throwing: a nightly batch that has already run five
 * hundred games must not lose its report because the file it was pointed at is the wrong shape.
 * The problem becomes a REFUSED trend, which prints loudly and grades nothing.
 */
export function readCarryForward(raw: unknown): CarryForwardRead {
  if (!isRecord(raw)) return { ok: false, problem: "the file did not parse to a JSON object" };
  if (typeof raw["id"] !== "string" || raw["id"].length === 0) {
    return { ok: false, problem: "no `id` — a predecessor that cannot name itself is not citable" };
  }
  const id = raw["id"];
  if (raw["format"] !== CARRY_FORWARD_FORMAT) {
    return {
      ok: false,
      problem:
        `\`format\` is ${JSON.stringify(raw["format"] ?? null)}, not "${CARRY_FORWARD_FORMAT}". ` +
        `"${id}" was written before a carry-forward recorded the tree that produced it, so ` +
        `nothing in it can establish that that tree still exists.`,
    };
  }
  const identity = readIdentity(raw["identity"]);
  if (typeof identity === "string") return { ok: false, problem: `"${id}": ${identity}` };
  const sim = numberMap(raw["sim"]);
  if (sim === null) return { ok: false, problem: `"${id}": \`sim\` is not a map of finite numbers` };
  const comfortableStreak = numberMap(raw["comfortableStreak"]);
  if (comfortableStreak === null) {
    return { ok: false, problem: `"${id}": \`comfortableStreak\` is not a map of finite numbers` };
  }
  const context = raw["context"];
  if (!isRecord(context)) return { ok: false, problem: `"${id}": no \`context\` object` };
  if (
    typeof context["seedDigest"] !== "string" ||
    typeof context["batchSeed"] !== "string" ||
    typeof context["games"] !== "number"
  ) {
    return { ok: false, problem: `"${id}": \`context\` needs seedDigest, batchSeed and games` };
  }

  return {
    ok: true,
    value: {
      format: CARRY_FORWARD_FORMAT,
      id,
      identity,
      context: {
        seedDigest: context["seedDigest"],
        batchSeed: context["batchSeed"],
        games: context["games"],
      },
      sim,
      comfortableStreak,
    },
  };
}

// --- the decision ------------------------------------------------------------

/**
 * Whether, and on what terms, a predecessor may inform this report.
 *
 * This type is the enforcement. `buildBaselineReport` takes a `TrendDecision` and NOT a
 * `PreviousReport`, so there is no way to hand a report a carry-forward that has not been
 * adjudicated — the arrow and the streak are both downstream of this union, and a caller cannot
 * reach either by constructing a plain object it happens to have read off disk.
 *
 * Three of the four kinds carry a predecessor and they differ in exactly what it may do:
 *
 *   ACCEPTED       arrow yes, streak yes.  Same tree, same system, same real evidence.
 *   RECONSTRUCTED  arrow yes, streak NO.   `previous.ts`'s rule, now structural rather than a
 *                                          convention held up by an empty object literal: a
 *                                          figure quoted from prose may inform a trend and may
 *                                          never tighten a band, because `ratchetBand` is
 *                                          one-way and a tightening cannot be undone.
 *   REFUSED        arrow NO, streak NO.    Neither, per the ruling — a mismatched predecessor
 *                                          does not get to do the thing a reconstructed one does.
 *   NONE           nothing to do.
 */
export type TrendDecision =
  | { readonly kind: "NONE"; readonly reason: string }
  | {
      readonly kind: "ACCEPTED";
      readonly previous: PreviousReport;
      readonly identity: BaselineIdentity;
    }
  | { readonly kind: "RECONSTRUCTED"; readonly previous: PreviousReport; readonly reason: string }
  | {
      readonly kind: "REFUSED";
      readonly previousId: string;
      readonly mismatches: readonly IdentityMismatch[];
      readonly message: string;
    };

export const NO_TREND: TrendDecision = {
  kind: "NONE",
  reason: "no predecessor was supplied — the trend column prints an em dash, which is true",
};

/** May this decision's predecessor contribute the streak counters that ratchet a band? */
export function mayRatchet(decision: TrendDecision): boolean {
  return decision.kind === "ACCEPTED";
}

/** May this decision's predecessor contribute a trend arrow? */
export function mayInformArrow(decision: TrendDecision): boolean {
  return decision.kind === "ACCEPTED" || decision.kind === "RECONSTRUCTED";
}

export function previousOf(decision: TrendDecision): PreviousReport | undefined {
  return decision.kind === "ACCEPTED" || decision.kind === "RECONSTRUCTED"
    ? decision.previous
    : undefined;
}

const REMEDY = [
  "**How to get a trend anyway, honestly.** Re-run the predecessor's batch configuration on the",
  "current tree and write its carry-forward; trend against that. It costs one batch run and it",
  "buys a control arm. To measure the effect of the change ITSELF, use the counterfactual harness",
  "in `test/attribution.test.ts`, which runs both arms in one process on one tree — a trend arrow",
  "across a boundary is that same comparison with the control arm quietly missing.",
].join("\n");

export function refusalMessage(
  previousId: string,
  mismatches: readonly IdentityMismatch[],
): string {
  const rows = mismatches
    .map(
      (m) =>
        `  ${m.field}\n` +
        `      previous (${previousId}): ${m.previous}\n` +
        `      this run:                ${m.current}\n` +
        `      → ${m.why}`,
    )
    .join("\n");
  return [
    `TREND REFUSED — "${previousId}" is not a comparable baseline for this run.`,
    "",
    rows,
    "",
    "A trend arrow across that boundary compares this run against a tree that no longer exists.",
    "The delta would mix the metric's own movement with the effect of whatever changed, and there",
    "is no control arm to separate them — the arrow would look exactly like progress either way.",
    "",
    "`previous.ts` lets a RECONSTRUCTED predecessor inform an arrow and never ratchet a band. A",
    "MISMATCHED one does neither: no arrow, no streak, no ratchet.",
    "",
    REMEDY,
  ].join("\n");
}

export function malformedMessage(problem: string): string {
  return [
    "TREND REFUSED — the file supplied is not a usable carry-forward.",
    "",
    `  ${problem}`,
    "",
    "A carry-forward that cannot state the tree it was produced against cannot establish that",
    "that tree still exists, so nothing it contains can be compared to this run. This is the",
    "state `reports/baseline-0002.carry-forward.json` was in: written correctly by a mechanism",
    "that works, and silently stale within days of being written.",
    "",
    REMEDY,
  ].join("\n");
}

/**
 * The single funnel. Everything that could become a trend arrow passes through here.
 *
 * `raw` is whatever `JSON.parse` produced, or `undefined` for no predecessor. It is deliberately
 * `unknown`: the caller reads a file, and a file is not a type.
 */
export function decideTrend(raw: unknown, current: BaselineIdentity): TrendDecision {
  if (raw === undefined || raw === null) return NO_TREND;

  const read = readCarryForward(raw);
  if (!read.ok) {
    const id = isRecord(raw) && typeof raw["id"] === "string" ? raw["id"] : "(unnamed file)";
    return {
      kind: "REFUSED",
      previousId: id,
      mismatches: [],
      message: malformedMessage(read.problem),
    };
  }

  const mismatches = compareIdentity(read.value.identity, current);
  if (mismatches.length > 0) {
    return {
      kind: "REFUSED",
      previousId: read.value.id,
      mismatches,
      message: refusalMessage(read.value.id, mismatches),
    };
  }

  return { kind: "ACCEPTED", previous: read.value, identity: read.value.identity };
}
