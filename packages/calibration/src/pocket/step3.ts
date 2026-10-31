/**
 * `pnpm --filter @ff/calibration pocket -- --step 3 [--arms C1,C2] [--shard i/n] [--cache <dir>] [--seed-set 1|2] [--report <file.md>] [--out <file.json>]`
 * `pnpm --filter @ff/calibration pocket -- --step 3 --digests --out <file.json>`
 * `pnpm --filter @ff/calibration pocket -- --step 3 [--arms C1,C2] [--cache <dir>] [--seed-set 1|2] --part1`
 *
 * ADR-089 STEP 3's HARNESS (step-3 plan §2.10, §5.2 to §5.4 and §7; AM-2, ADR-089 Appendix G, G.8;
 * AM-3, G.9): plays the re-played bases (A0, A14, A1, A11, B3, B6, B5) and step 3's arms (C1 to C16
 * less any refused: C14 waits on petition P17) on both seed sets, and grades them against the step-0
 * filing as AM-2 amends its part 1 and AM-3 maps its guard.
 *
 *  - **The refusals first.** Nothing plays unless the filing loads, digests to `STEP0_FILED_DIGEST`
 *    and holds no pending step-3 or guard field, and the amendments file loads and validates whole
 *    under `AMENDMENTS_DIGEST`, its step-3 view (the entries filed before step 3 or an earlier step;
 *    `amendmentsAtStep`) holding AM-1 and AM-2. A run that grades (every run but `--part1` and
 *    `--digests`) also needs a filed guard map at step 3 (AM-3): while none is filed it refuses with a
 *    named message before anything plays and before any cache is made (`guardFor(view, "3")` throws).
 *    `--part1` and `--digests` are previews under AM-2's previews rule: they play without AM-3, and
 *    nothing they print is graded, priced or offered. A step-3 map must name only step 3's playable
 *    arms, each against the base this build's arm reads (`STEP3_ARM_DEFS`).
 *  - **Each arm** plays the flat league's 496 games and the generated league's 272 on each seed set
 *    at caller v7 through step 1's folds (`playArm`), the step-2 stream folds and step 3's own, each
 *    handed the arm's own tunables (K14). On a `pocket-1.s3` arm M2 STREAM's identity rebuild is not
 *    folded (it does not read the late block or the free-run clock, and throws on an s3 stream);
 *    every other step-2 check is, and on the bases and C13 the step-2 folds are `foldS2Game`'s exactly.
 *    Step 3 adds, per league: the late block's stream check and the census (`s3Stream.ts`), part 1
 *    with the touched men's check, the monotone check and its mirror (`part1.ts`), the miss rule's
 *    split both ways (`missSplitFigures`, AM-2's free-runner key with the origin-keyed figures
 *    beside), the literal count against the filed Wait table (M8's WAIT answer on D19's men), the
 *    declared composition print's cells (every guard class by first must-act tick and forcing
 *    source) and each game's first free-runner arrival (for the alone arms' paired gap). C1 also
 *    plays its corpora mirrored (`mirror: true`) for M5, and keeps the exact free-run mirror row.
 *  - **The stamp** is step 1's with `amendments` the digest of the amendments file's step-3 view.
 *    A record stamped with another view (a preview made before AM-3 was filed, say) is refused by
 *    name, never re-used.
 *  - **The cache** is `data-cache/pocket-step3/<fingerprint>/<arm>.set<n>.json` (step 1's
 *    fingerprint rule). `--shard i/n` plays every n-th target from the i-th; an invocation that then
 *    finds every target in the cache grades, deterministically, and writes `--report` and `--out`
 *    through a temporary file and a rename. `--seed-set <n>` plays one set (reported, never graded).
 *    With `--arms` naming one arm, `--out` receives that arm's records. A committed report (under the
 *    package's `reports/`) is refused from a dirty tree or from records stamped dirty, and step 1's
 *    and step 2's committed records (and step 3's, once `STEP3_RECORDS_FINAL`) are never written over.
 *  - **The re-played bases** are checked against step 2's committed records
 *    (`reports/adr-089-step2.json`, both seed sets) on a stamp-free projection (`q3Projection`: the
 *    record less its format, stamp and the fields step 3 adds), never a re-grade. A difference is a
 *    structural failure; a cut corpus is not checked.
 *  - **Grading is fresh from the records** (`gradeStep3`, pure): set 1 graded on each league, set 2
 *    and the two-set mean beside, "not resolved by two seed sets" when set 2 lands on the other side
 *    of a line within 2 SE; part 1, the monotone check (C1, C2) and the mirror (M5 on C1 with each
 *    row's z, the exact free-run mirror) as structural proofs; the miss rule on C1 and C2 on each set
 *    (`classifyMiss`, AM-2's key, the bin's supply reason named only when the bin missed, class (iii)
 *    printed as not applicable) with options A (C15) and C (C11) priced and C12 and C13 never
 *    offered; the stand-in expectations as C2 minus B6 deltas; the alone arms' paired gaps; the guard
 *    under AM-1's reading as AM-3 maps it (graded rows, the cumulative line, the accepted state and
 *    every other arm's reading as information) with the declared composition print.
 *  - **`--digests`** (R-1) plays only the golden 50 a league under every playable C arm and A1, A5,
 *    A11 and B1 to B7 (no cache), each folded stripped (as the pins fold) and unstripped of the
 *    picture, and fails after writing when any s1, base or s2 pin moved.
 *  - **`--part1`** plays or reads the asked step-3 arms (default every playable `pocket-1.s3` arm),
 *    prints part 1's section (and M5 on C1 when C1 is asked), and fails on any build fault.
 *  - **No wall-clock, host or path field** in any record or file, and no clock is read here.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalise } from "../harness/digest.js";
import { positionsFromSnapshot } from "../knownTruth/pocketChannelShares.js";
import { TWO_SECOND_BIN, type SimAccumulator } from "../metrics/collect.js";
import { missSplitFigures, type MissSplitFigures } from "../metrics/pocketRows.js";
import { AMENDMENTS_DIGEST, AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, entryOf, guardFor, openAmendments, type AmendmentsFile, type BaseMap } from "./amendments.js";
import { armById, armRefusal, STEP2_ARM_IDS, STEP3_ARM_DEFS, STEP3_ARM_IDS, STEP3_RUN_IDS, type ArmId } from "./arms.js";
import { FILED_PATH, GUARD_CLASSES, type GuardClock, type IntMix } from "./bands.js";
import type { ThrowClass } from "./constructs.js";
import { flatBaseline, genSeason, goldenGames, type SeedSet } from "./corpus.js";
import { filedDigest, pendingPaths, STEP0_FILED_DIGEST, type BandClause, type FiledFile, type JsonValue } from "./filed.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES } from "./golden.js";
import { am1ArmReading, am1Reading, DESPERATION_HALVES, pairedReading, reweightedBy, reweightedDesperation, SEED_SETS, seZeroWithExcess, type Am1Lines, type GuardSide, type PairedReading } from "./guardAm1.js";
import { m5Compare, m5FreeRunMirror, m5GameOf, m5RowZ, type FreeRunMirrorRow, type M5Game } from "./m5Mirror.js";
import { playersOfSnapshot } from "./m6Contact.js";
import { m8RunnersOf, type M8Context } from "./m8FreeRunClock.js";
import { classifyMiss, MISS_OPTIONS, type MissSplit } from "./missRule.js";
import { emptyPart1Fold, filedM8Of, foldPart1Game, mergePart1Folds, monotoneProblems, part1Problems, type Part1Count, type Part1Fold } from "./part1.js";
import {
  LEAGUES,
  renderStep3M5,
  renderStep3Part1,
  renderStep3Sections,
  renderStepReport,
  type ArmReport,
  type IntGuardRows,
  type League,
  type Step1Figures,
  type Step2ClauseResult,
  type Step2Comparison,
  type Step2GuardHalf,
  type Step2Outcome,
  type Step2Proof,
  type Step2Verdict,
  type Step3AloneRow,
  type Step3ArmCounts,
  type Step3ArmSetCounts,
  type Step3CompositionRow,
  type Step3GuardRow,
  type Step3M5League,
  type Step3M5Section,
  type Step3MissReading,
  type Step3MissSection,
  type Step3OptionPrice,
  type Step3Part1Row,
  type Step3Part1Section,
  type Step3Sections,
  type Step3StandIn,
  type StepReportInput,
} from "./report.js";
import { POCKET_1_S3_RULES } from "./rules.js";
import { POCKET_1_S1_BASE_PINS } from "./s1BasePins.js";
import { POCKET_1_S1_PINS, type S1PinArm } from "./s1Pins.js";
import { s1Problems } from "./s1Stream.js";
import { CHECKDOWN_TRIGGERS, checkdownTriggersOf, emptyS2Folds, mustActPartsOf, s2Checks, s2ContextOf, s2PlaysOf, s2Problems, selfCheckOf, threatPartAt, type GuardGameVector, type MustActSelfCheck, type S2Context, type S2Folds, type S2Play } from "./s2Stream.js";
import { POCKET_1_S2_PINS } from "./s2Pins.js";
import { emptyS3Folds, foldS3Game, s3Problems, type S3Folds } from "./s3Stream.js";
import { openFiling, PR33_STATE, sanitize, type Step3Args } from "./step0.js";
import {
  armFileOf,
  FULL_CORPUS,
  isUnder,
  jsonText,
  playArm,
  realOf,
  stampOf,
  stampProblems,
  STEP1_CALLER,
  STEP1_CLOSED_RECORDS,
  step1Env,
  writeAtomic,
  type ArmRecord,
  type Step1Corpus,
  type Step1Env,
  type Step1Stamp,
} from "./step1.js";
import { packS2Folds, rateDiffSE, STRUCTURAL_GUARD_ROWS, unpackS2Folds, type PackedS2Folds } from "./step2.js";
import { isAimed, throwClassOf, type Dropback } from "./throwClass.js";

export const STEP3_ARM_FORMAT = "adr-089-step3-arm/v1";
export const STEP3_MEASURES_FORMAT = "adr-089-step3-measures/v1";
export const STEP3_RECORDS_FORMAT = "adr-089-step3-records/v1";
export const STEP3_DIGESTS_FORMAT = "adr-089-step3-digests/v1";

const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Step 2's committed records: the re-played bases are checked against them, set 1 and set 2 (plan §5.1). */
export const STEP2_RECORDS_JSON = "reports/adr-089-step2.json";
/** Step 2's committed records, never written over by a step-3 run. */
export const STEP2_CLOSED_RECORDS = ["reports/adr-089-step2.md", "reports/adr-089-step2.json"] as const;
/** Step 3's records, relative to the package; once final they are never written over (plan §2.10). */
export const STEP3_RECORDS = ["reports/adr-089-step3.md", "reports/adr-089-step3.json"] as const;
/** False until the measuring stream commits step 3's records and closes the step; a named commit flips it. */
export const STEP3_RECORDS_FINAL: boolean = false;

/** The graded set (set 1, as steps 1 and 2 graded); set 2 is printed beside it. */
export const GRADED_SEED_SET: SeedSet = 1;

/** Step 3's arms this build plays: C1 to C16 less any refused until its petition is in contracts (C14, P17). */
export const STEP3_PLAYABLE: readonly ArmId[] = Object.freeze(STEP3_ARM_IDS.filter((id) => armRefusal(id) === undefined));
/** The run list: the re-played bases, then the playable C arms. */
export const STEP3_PLAYABLE_RUN_IDS: readonly ArmId[] = Object.freeze(STEP3_RUN_IDS.filter((id) => armRefusal(id) === undefined));
/** The re-played bases (plan §5.1): A0 and A14 (the cumulative line), A1 and A11 (the accepted state), B3, B6 and B5. */
export const STEP3_BASE_IDS: readonly ArmId[] = Object.freeze(STEP3_RUN_IDS.filter((id) => !(STEP3_ARM_IDS as readonly string[]).includes(id)));
/** R-1's arms: the golden 50 a league under every playable C arm and A1, A5, A11, B1 to B7 (plan §2.10, §6.2). */
export const STEP3_DIGEST_ARMS: readonly ArmId[] = Object.freeze([...STEP3_PLAYABLE, "A1", "A5", "A11", ...STEP2_ARM_IDS]);

/** The design arm (C1) and the pricing arm (C2), by their roles in `STEP3_ARM_DEFS`. */
export const STEP3_DESIGN_ARM: ArmId = STEP3_ARM_DEFS.find((d) => d.role === "design")!.id;
export const STEP3_PRICING_ARM: ArmId = STEP3_ARM_DEFS.find((d) => d.pricing)!.id;
/** The arms the monotone clauses are graded on, and the miss rule classes (AM-2; plan §2.8, §7). */
export const STEP3_MONOTONE_ARMS: readonly ArmId[] = Object.freeze([STEP3_DESIGN_ARM, STEP3_PRICING_ARM]);
export const STEP3_MISS_ARMS: readonly ArmId[] = STEP3_MONOTONE_ARMS;
/** M5 is read on the design arm (plan §2.8): it alone plays its corpora mirrored. */
export const STEP3_M5_ARM: ArmId = STEP3_DESIGN_ARM;
/** The arms that price the miss options (plan §7): A by C15, C by C11; B plays nothing. */
export const STEP3_OPTION_ARMS: Readonly<Record<"A" | "C", ArmId>> = Object.freeze({ A: "C15", C: "C11" });
/** Arms never offered on a step-3 miss (AM-2 `neverOffered`; plan §7). */
export const STEP3_NEVER_OFFERED: Readonly<Record<string, string>> = Object.freeze({
  C12: "reading (a): never offered (AM-2; ADR-089 §6.10)",
  C13: "the uniform delay (revision 1's LATE patch): never offered for a man nobody touched (AM-2)",
});
/** The alone arms (plan §5.1): each arm's mean first free-runner arrival and its gap from B3, paired SE beside (critique 4 S4-14). */
export const STEP3_ALONE_ARMS: readonly ArmId[] = Object.freeze(["C3", "C4", "C5", "C7", "C8", "C9", "C10", "C16"]);
/** The declared composition print's pairs (plan §5.4; critique 4 S4-5): C1 against B3, C2 against B6. */
export const STEP3_COMPOSITION_PAIRS: readonly (readonly [ArmId, ArmId])[] = Object.freeze([
  [STEP3_DESIGN_ARM, "B3"],
  [STEP3_PRICING_ARM, "B6"],
] as const);
/** The forcing source on the release tick, in the print's order. */
export const COMPOSITION_SOURCES = ["THREAT", "COUNT", "STATUS", "NONE"] as const;

/** The miss rule's covered rows at step 3 (ADR-089:1028), each with the row it reads and the count its binomial SE stands on. */
export const STEP3_MISS_ROWS = ["s3.bin20.tick", "s3.quick", "s3.unblockedPressures", "s3.unblockedShare"] as const;
type CountKey = "dropbacks" | "bin20Attempts" | "pressuredDropbacks" | "hitOrSackDropbacks";
export const STEP3_CLAUSE_ROWS: Readonly<Record<string, { readonly row: string; readonly n: CountKey }>> = Object.freeze({
  "s3.bin20.tick": { row: "pressured_share_by_release_bin", n: "bin20Attempts" },
  "s3.quick": { row: "quick_pressure_share_by_origin", n: "pressuredDropbacks" },
  "s3.unblockedPressures": { row: "unblocked_pressures_per_100", n: "dropbacks" },
  "s3.unblockedShare": { row: "unblocked_share_of_hit_or_sack", n: "hitOrSackDropbacks" },
  "s3.unblockedMen": { row: "unblocked_men_per_100", n: "dropbacks" },
  "s3.hitOrSack": { row: "hit_or_sack_rate", n: "dropbacks" },
  "s3.expected.pressure": { row: "threat_creation_rate", n: "dropbacks" },
  "s3.expected.sack": { row: "sack_rate", n: "dropbacks" },
  "s3.expected.bin20": { row: "pressured_share_by_release_bin", n: "bin20Attempts" },
  "s3.expected.quick": { row: "quick_pressure_share_by_origin", n: "pressuredDropbacks" },
});
/** The stand-ins' own deltas (plan §5.3; critique 4 S4-9), read beside C2 minus B6. */
export const STAND_IN_DELTAS: Readonly<Record<string, string>> = Object.freeze({
  "s3.hitOrSack": "-3.3 to -3.7",
  "s3.expected.pressure": "-4.2",
  "s3.expected.sack": "-2.34",
  "s3.expected.bin20": "-6.7",
  "s3.expected.quick": "-11.9",
});

/** Whether an arm plays `pocket-1.s3` (every C arm but C13). */
export const isS3Arm = (id: ArmId): boolean => armById(id).rules === POCKET_1_S3_RULES;

/** How the step-3 report names each arm (plan §5.1's roles). */
const BASE_LABELS: Readonly<Record<string, string>> = {
  A0: "A0 (today's game, re-played; the cumulative line's design base)",
  A14: "A14 (today's clock with the hold, re-played; the cumulative line's pricing base)",
  A1: "A1 (step 1's design, re-played; the accepted state's design base)",
  A11: "A11 (A1 with the stand-in hold, re-played; the accepted state's pricing base)",
  B3: "B3 (pocket-1.s2, step 2's design, re-played)",
  B6: "B6 (B3 with the stand-in hold, re-played; pricing arm)",
  B5: "B5 (A5 with the horizons, re-played; C14's base)",
};
const labelOf = (id: ArmId): string => BASE_LABELS[id] ?? `${id} (${STEP3_ARM_DEFS.find((d) => d.id === id)?.role ?? "?"})`;

// --- the refusals ----------------------------------------------------------------------------------------

/** Refuses a filing that leaves a step-3 or guard field pending, then one that is not the committed filing. */
export function checkFilingForStep3(file: FiledFile): void {
  const ours = new Set(file.bands.clauses.flatMap((c, i) => (c.step === "3" || c.step === "guard" ? [String(i)] : [])));
  const pending = pendingPaths(file).filter(({ path }) => {
    const p = path.split(".");
    return p[0] === "bands" && p[1] === "clauses" && ours.has(p[2] ?? "");
  });
  if (pending.length > 0) throw new Error(`ADR-089 step 3: the filing leaves ${pending.map((p) => p.path).join(", ")} pending; every s3 and guard field must be filed first`);
  const digest = filedDigest(file);
  if (digest !== STEP0_FILED_DIGEST) {
    throw new Error(`ADR-089 step 3: the step-0 filing digests to ${digest}, not ${STEP0_FILED_DIGEST}; step 3 grades only against the committed filing, amended only by a named entry`);
  }
}

/** The amendments as step 3 reads them: the step-3 view and its digest (every step-3 record's stamp), and AM-2's name. */
export interface Step3View {
  readonly file: FiledFile;
  readonly view: AmendmentsFile;
  readonly digest: string;
  /** AM-2's id and record, as the report names it. */
  readonly am2: string;
}

/**
 * The refusals every step-3 run makes before anything plays, previews included (`--part1`,
 * `--digests`): the filing, then the amendments file (loads and validates whole under `pin`), whose
 * step-3 view must hold AM-1 and AM-2. The view's digest is what every step-3 record stamps.
 */
export function preflightStep3Previews(filedPath: string, amendmentsPath: string, pin: string = AMENDMENTS_DIGEST): Step3View {
  const refuse = (why: string): never => {
    throw new Error(`ADR-089 step 3: refused before anything plays: ${why}`);
  };
  const file = openFiling(filedPath);
  checkFilingForStep3(file);
  if (!existsSync(amendmentsPath)) refuse(`the amendments file ${amendmentsPath} does not exist (AM-1 and AM-2 are filed in ${AMENDMENTS_PATH} before step 3's arms run)`);
  let whole: AmendmentsFile;
  try {
    whole = openAmendments(amendmentsPath, file, pin);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
  const view = amendmentsAtStep(whole, "3");
  for (const id of ["AM-1", "AM-2"]) {
    try {
      entryOf(view, id);
    } catch {
      refuse(`the amendments file's step-3 view holds no ${id}`);
    }
  }
  const am2 = entryOf(view, "AM-2");
  return { file, view, digest: amendmentsDigest(view), am2: `${am2.id} (${am2.record})` };
}

/** What the grading reads of AM-3: its map, AM-1's lines, the cumulative line and the accepted state. */
export interface Step3Guard {
  readonly digest: string;
  readonly entry: string;
  readonly record: string;
  readonly am2: string;
  readonly bases: BaseMap;
  readonly lines: Am1Lines;
  /** The cumulative line (reported, never graded before step 10): the design arm against `design`, the pricing arm against `pricing`. */
  readonly cumulative: { readonly design: ArmId; readonly pricing: ArmId };
  /** The accepted state (reported, never graded): the design arm against `design`, the pricing arm against `pricing`. */
  readonly accepted: { readonly design: ArmId; readonly pricing: ArmId };
}

/** The named refusal while no guard map is filed at step 3 (plan §4.2; AM-1 §4.3). */
export function am3Refusal(why: string): string {
  return (
    "ADR-089 step 3: refused to grade: AM-3 (the guard's base map at step 3, ADR-089 Appendix G, G.9; step-3 plan §4.2) is not filed in the amendments file's step-3 view: " +
    `${why}. ` +
    "Nothing has played and no cache was made. Runs before AM-3 are previews (AM-2's previews rule): --part1 and --digests play without it; nothing they print is graded, priced or offered"
  );
}

/**
 * Every refusal a grading run makes before anything plays: `preflightStep3Previews`, then a filed
 * guard map at step 3 (AM-3; `guardFor(view, "3")` throws while none is filed), which must name only
 * step 3's playable arms, each against the base this build's arm reads.
 */
export function preflightStep3(filedPath: string, amendmentsPath: string, pin: string = AMENDMENTS_DIGEST): Step3View & { readonly guard: Step3Guard } {
  const v = preflightStep3Previews(filedPath, amendmentsPath, pin);
  let found;
  try {
    found = guardFor(v.view, "3");
  } catch (e) {
    throw new Error(am3Refusal(e instanceof Error ? e.message : String(e)));
  }
  const { entry, rule, bases } = found;
  const refuse = (why: string): never => {
    throw new Error(`ADR-089 step 3: refused before anything plays: ${entry.id}'s step-3 base map ${why}`);
  };
  const ids = Object.keys(bases) as ArmId[];
  const foreign = ids.filter((id) => !(STEP3_ARM_IDS as readonly string[]).includes(id));
  if (foreign.length > 0) refuse(`names ${foreign.join(", ")}, which step 3 does not grade (its arms are C1 to C16)`);
  const refused = ids.filter((id) => armRefusal(id) !== undefined);
  if (refused.length > 0) refuse(`grades ${refused.join(", ")}, which this build does not play: ${refused.map((id) => armRefusal(id)).join("; ")}`);
  const differ = ids.filter((id) => bases[id] !== armById(id).base);
  if (differ.length > 0) refuse(`reads ${differ.map((id) => `${id} against ${String(bases[id])}, and this build's arm against ${String(armById(id).base)}`).join("; ")}`);
  const raw = (rule as unknown as Record<string, unknown>)["acceptedState"] as { readonly design?: unknown; readonly pricing?: unknown } | undefined;
  const accepted = {
    design: (typeof raw?.design === "string" ? raw.design : "A1") as ArmId,
    pricing: (typeof raw?.pricing === "string" ? raw.pricing : "A11") as ArmId,
  };
  return {
    ...v,
    guard: {
      digest: v.digest,
      entry: entry.id,
      record: entry.record,
      am2: v.am2,
      bases,
      lines: { zLeague: rule.zLeague, zClass: rule.zClass, zSetSE0: rule.zSetSE0 },
      cumulative: { design: rule.cumulative.design, pricing: rule.cumulative.pricing },
      accepted,
    },
  };
}

// --- the stamp and the record ------------------------------------------------------------------------------

/** Step 1's stamp with the amendments digest every step-3 record carries: the step-3 view's. */
export type Step3Stamp = Omit<Step1Stamp, "amendments"> & { readonly amendments: string };

export function step3StampOf(id: ArmId, seedSet: SeedSet, env: Step1Env, amendments: string, corpus: Step1Corpus = FULL_CORPUS): Step3Stamp {
  return { ...stampOf(id, seedSet, env, corpus), amendments };
}

/** One guard class's aimed throws and interceptions on one key (`<first must-act tick>|<forcing source>`). */
export interface CompositionCell {
  aimed: number;
  interceptions: number;
}
/** The declared composition print's cells: guard class, then key. */
export type CompositionFold = Record<string, Record<string, CompositionCell>>;

/**
 * One aimed throw's composition key (plan §5.4; critique 4 S4-5): its guard class, the dropback's
 * first must-act tick (the first status tick whose live set holds a threat within the arm's C, as
 * `mustActShare`'s first must act reads it; "none" when there is none) and the forcing source on its
 * release tick (THREAT: the threat part holds; COUNT: the count part and not the threat part; STATUS:
 * neither, and the status forces; NONE: nothing does, or no status on that tick). Undefined for any
 * dropback that is not an aimed throw of a guard class.
 */
export function compositionKeyOf(play: S2Play, ctx: S2Context): { readonly cls: ThrowClass; readonly key: string } | undefined {
  const d = play.dropback;
  if (!isAimed(d) || d.throwTick === undefined) return undefined;
  const cls = throwClassOf(d, ctx.tunables).cls;
  if (!GUARD_CLASSES.includes(cls)) return undefined;
  const first = play.statuses.find((s) => threatPartAt(s, ctx.C));
  const parts = mustActPartsOf(play, ctx);
  const s = parts.statusAt.get(d.throwTick);
  let source: (typeof COMPOSITION_SOURCES)[number] = "NONE";
  if (s !== undefined) {
    const p = parts.at(s, d.throwTick);
    source = p.threat ? "THREAT" : p.count ? "COUNT" : p.status ? "STATUS" : "NONE";
  }
  return { cls, key: `${first === undefined ? "none" : first.tick.toFixed(1)}|${source}` };
}

export function foldComposition(fold: CompositionFold, play: S2Play, ctx: S2Context): void {
  const k = compositionKeyOf(play, ctx);
  if (k === undefined) return;
  const byKey = (fold[k.cls] ??= {});
  const cell = (byKey[k.key] ??= { aimed: 0, interceptions: 0 });
  cell.aimed += 1;
  if (play.dropback.intercepted) cell.interceptions += 1;
}

/** A dropback's first free-runner arrival, in tenths: the earliest first-published `etaTick` of a threat whose origin is not WON_REP. */
export function firstFreeRunnerTenths(d: Dropback): number | undefined {
  const seen = new Set<string>();
  let first: number | undefined;
  for (const t of d.threats) {
    if (t.origin === "WON_REP" || seen.has(t.rusher)) continue;
    seen.add(t.rusher);
    const tenths = Math.round(t.etaTick * 10);
    first = first === undefined ? tenths : Math.min(first, tenths);
  }
  return first;
}

/** The literal count against the filed Wait table: D19's men, and those whose published tenth is not M8's WAIT tenth, by row. */
export interface WaitLiteralFold {
  men: number;
  differ: number;
  byRow: Record<string, number>;
}

export function foldWaitLiteral(fold: WaitLiteralFold, d: Dropback, ctx: M8Context): void {
  for (const r of m8RunnersOf(d, ctx, "WAIT")) {
    if (!r.untouched) continue;
    fold.men += 1;
    if (Math.round(r.published * 10) !== Math.round(r.eta * 10)) {
      fold.differ += 1;
      fold.byRow[r.row] = (fold.byRow[r.row] ?? 0) + 1;
    }
  }
}

/** The miss rule's split on one league (AM-2's key, the origin-keyed figures beside) and the counts its SEs stand on. */
export interface Step3MissSplitRecord {
  readonly quick: number | null;
  readonly byClock: MissSplitFigures;
  readonly byOrigin: MissSplitFigures;
  readonly counts: Readonly<Record<CountKey, number>>;
  /** Every first pressure by origin, and the quick ones (`s3.quickOrigin`). */
  readonly firstPressureOrigin: Readonly<Record<string, number>>;
  readonly quickFirstPressureByOrigin: Readonly<Record<string, number>>;
}

export function missSplitRecordOf(acc: SimAccumulator): Step3MissSplitRecord {
  const pf = acc.play.pocket;
  const f = missSplitFigures(pf);
  return {
    quick: f.quick,
    byClock: f.byClock,
    byOrigin: f.byOrigin,
    counts: {
      dropbacks: acc.play.dropbacks,
      bin20Attempts: pf.releaseBins[TWO_SECOND_BIN]?.attempts ?? 0,
      pressuredDropbacks: pf.firstPressureSeconds.length,
      hitOrSackDropbacks: pf.hitOrSackDropbacks,
    },
    firstPressureOrigin: { ...pf.firstPressureOrigin },
    quickFirstPressureByOrigin: { ...pf.quickFirstPressureByOrigin },
  };
}

/** Step 3's folds of one league. The late block, the census, part 1 and the Wait count are on `pocket-1.s3` arms only (null on the others). */
export interface Step3LeagueFolds {
  readonly lateBlock: S3Folds["lateBlock"] | null;
  readonly census: S3Folds["census"] | null;
  readonly part1: Part1Fold | null;
  readonly waitLiteral: WaitLiteralFold | null;
  readonly missSplit: Step3MissSplitRecord;
  readonly composition: CompositionFold;
  /** Each game's first free-runner arrivals: `<sum of tenths>/<dropbacks with a free runner>`, one string a game, in the fold's order. */
  readonly freeRunnerEta: readonly string[];
}

/** C1's M5 on one league: its games' counts unmirrored and mirrored (the picture's plays left out), and the exact free-run mirror row. */
export interface Step3M5Record {
  readonly unmirrored: readonly M5Game[];
  readonly mirrored: readonly M5Game[];
  readonly freeRunMirror: FreeRunMirrorRow;
}

export interface Step3Record extends Omit<ArmRecord, "format" | "stamp"> {
  readonly format: typeof STEP3_ARM_FORMAT;
  readonly stamp: Step3Stamp;
  readonly s2: Readonly<Record<League, PackedS2Folds>>;
  readonly s3: Readonly<Record<League, Step3LeagueFolds>>;
  readonly m5?: Readonly<Record<League, Step3M5Record>>;
}

/** The fields step 3 adds to a record; `q3Projection` leaves them out with the format and the stamp. */
export const Q3_LEFT_OUT = ["format", "stamp", "s3", "m5"] as const;

export interface PlayStep3Options {
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** The step-3 view's digest the record stamps. */
  readonly amendments: string;
}

const stripFreeRun = (g: M5Game): M5Game => {
  const { freeRun: _drop, ...rest } = g;
  void _drop;
  return rest;
};

/**
 * Plays one arm on both leagues at one seed set: step 1's record, re-stamped, with the step-2 folds
 * (M2 STREAM left out on a `pocket-1.s3` arm) and step 3's; C1 also plays its corpora mirrored.
 */
export function playStep3Arm(id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep3Options): Step3Record {
  const corpus = opts.corpus ?? FULL_CORPUS;
  const s3 = isS3Arm(id);
  const m5 = id === STEP3_M5_ARM;
  interface LeagueState {
    s2: S2Folds;
    s3: S3Folds;
    part1: Part1Fold;
    wait: WaitLiteralFold;
    composition: CompositionFold;
    eta: string[];
    unmirrored: M5Game[];
    missSplit?: Step3MissSplitRecord;
  }
  const fresh = (): LeagueState => ({ s2: emptyS2Folds(), s3: emptyS3Folds(), part1: emptyPart1Fold(), wait: { men: 0, differ: 0, byRow: {} }, composition: {}, eta: [], unmirrored: [] });
  const state: Record<League, LeagueState> = { flat: fresh(), gen: fresh() };
  const base = playArm(id, seedSet, env, {
    corpus,
    label: "pocket step 3",
    ...(opts.log === undefined ? {} : { log: opts.log }),
    visit: (league, o, snapshot, tunables) => {
      const L = state[league];
      const ctx = s2ContextOf(tunables, snapshot);
      const m8: M8Context = { tunables, positions: ctx.positions, players: ctx.players };
      let sum = 0;
      let n = 0;
      for (const play of s2PlaysOf(o.events)) {
        s2Checks.liveSet(L.s2.liveSet, play, ctx);
        s2Checks.mustAct(L.s2.mustAct, play, ctx);
        s2Checks.arrival(L.s2.arrival, play, ctx);
        s2Checks.warning(L.s2.warning, play, ctx);
        s2Checks.share(L.s2.share, play, ctx);
        s2Checks.desperation(L.s2.desperation, play, ctx);
        s2Checks.checkdown(L.s2.checkdown, play, ctx);
        foldComposition(L.composition, play, ctx);
        const first = firstFreeRunnerTenths(play.dropback);
        if (first !== undefined) {
          sum += first;
          n += 1;
        }
        if (s3) foldWaitLiteral(L.wait, play.dropback, m8);
      }
      s2Checks.guardGame(L.s2.guardGames, o.events, ctx);
      if (!s3) s2Checks.m2(L.s2.m2, o.events, ctx);
      L.eta.push(`${String(sum)}/${String(n)}`);
      if (s3) {
        foldS3Game(L.s3, o.events, tunables);
        foldPart1Game(L.part1, o.events, snapshot, tunables);
      }
      if (m5) L.unmirrored.push(m5GameOf(o.events, tunables));
    },
    finish: (league, accumulator) => {
      state[league].missSplit = missSplitRecordOf(accumulator);
    },
  });
  let m5Record: Record<League, Step3M5Record> | undefined;
  if (m5) {
    const tunables = armById(id).tunables;
    m5Record = {} as Record<League, Step3M5Record>;
    for (const league of LEAGUES) {
      const mirrored: M5Game[] = [];
      const visit = (o: { readonly events: Parameters<typeof m5GameOf>[0] }): void => {
        mirrored.push(m5GameOf(o.events, tunables));
      };
      const game = { tunables, callerVersion: STEP1_CALLER, mirror: true };
      if (league === "flat") flatBaseline(seedSet, visit, { ...game, ...(corpus.flatFirst === null ? {} : { first: corpus.flatFirst }) });
      else genSeason(seedSet, visit, { ...game, ...(corpus.genThroughWeek === null ? {} : { throughWeek: corpus.genThroughWeek }) });
      const unmirrored = state[league].unmirrored;
      m5Record[league] = { unmirrored: unmirrored.map(stripFreeRun), mirrored: mirrored.map(stripFreeRun), freeRunMirror: m5FreeRunMirror(unmirrored, mirrored) };
      opts.log?.(`pocket step 3: ${id} ${league} seed set ${String(seedSet)} mirrored (M5), ${String(mirrored.length)} games`);
    }
  }
  const leagueFolds = (league: League): Step3LeagueFolds => {
    const L = state[league];
    if (L.missSplit === undefined) throw new Error(`pocket step 3: ${id} ${league}: the miss split was not read`);
    return {
      lateBlock: s3 ? L.s3.lateBlock : null,
      census: s3 ? L.s3.census : null,
      part1: s3 ? L.part1 : null,
      waitLiteral: s3 ? L.wait : null,
      missSplit: L.missSplit,
      composition: L.composition,
      freeRunnerEta: L.eta,
    };
  };
  const { format: _format, stamp: _stamp, ...rest } = base;
  void _format;
  void _stamp;
  return sanitize({
    format: STEP3_ARM_FORMAT,
    stamp: step3StampOf(id, seedSet, env, opts.amendments, corpus),
    ...rest,
    s2: { flat: packS2Folds(state.flat.s2), gen: packS2Folds(state.gen.s2) },
    s3: { flat: leagueFolds("flat"), gen: leagueFolds("gen") },
    ...(m5Record === undefined ? {} : { m5: m5Record }),
  }) as unknown as Step3Record;
}

// --- the re-played bases against step 2's records ------------------------------------------------------------

/** The stamp-free projection (plan §4.3, §5.1): the record less its format, its stamp and the fields step 3 adds. */
export function q3Projection(r: object): Readonly<Record<string, JsonValue>> {
  const out: Record<string, unknown> = { ...(r as Record<string, unknown>) };
  for (const k of Q3_LEFT_OUT) delete out[k];
  return sanitize(out) as Record<string, JsonValue>;
}

/** The projected top-level fields on which a re-play and step 2's record differ (whole canonical text); empty when equal. */
export function q3Problems(replay: object, step2: object): readonly string[] {
  const a = q3Projection(replay);
  const b = q3Projection(step2);
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => canonicalise(a[k] ?? null) !== canonicalise(b[k] ?? null));
}

/** Step 2's records of the re-played bases, by `<arm>.set<n>`. */
export type Step2References = ReadonlyMap<string, object>;

/** Both seed sets of each re-played base from step 2's committed records (`reports/adr-089-step2.json`). */
export function loadStep2References(pkgRoot: string = PKG_ROOT): Step2References {
  const out = new Map<string, object>();
  const path = join(pkgRoot, STEP2_RECORDS_JSON);
  if (!existsSync(path)) return out;
  const arms = (JSON.parse(readFileSync(path, "utf8")) as { readonly arms?: Readonly<Record<string, object>> }).arms ?? {};
  for (const id of STEP3_BASE_IDS) for (const s of SEED_SETS) {
    const r = arms[`${id}.set${String(s)}`];
    if (r !== undefined) out.set(`${id}.set${String(s)}`, r);
  }
  return out;
}

// --- the plan ----------------------------------------------------------------------------------------------

export interface Step3Target {
  readonly id: ArmId;
  readonly seedSet: SeedSet;
}

export interface Step3Plan {
  readonly targets: readonly Step3Target[];
  readonly complete: readonly Step3Target[];
  readonly mine: readonly Step3Target[];
  readonly oneSet?: SeedSet;
}

export const targetName = (t: Step3Target): string => `${t.id}.set${String(t.seedSet)}`;

/** Every asked arm on each asked set, in `STEP3_RUN_IDS` order; shards take every n-th from the i-th; a refused arm is refused by name. */
export function planStep3(opts: { readonly arms?: readonly ArmId[]; readonly shard?: { readonly index: number; readonly count: number }; readonly seedSet?: SeedSet; readonly runIds?: readonly ArmId[] }): Step3Plan {
  const shard = opts.shard ?? { index: 1, count: 1 };
  if (!Number.isInteger(shard.count) || shard.count < 1 || !Number.isInteger(shard.index) || shard.index < 1 || shard.index > shard.count) {
    throw new RangeError(`--shard takes i/n with 1 <= i <= n (got ${String(shard.index)}/${String(shard.count)})`);
  }
  const runIds = opts.runIds ?? STEP3_PLAYABLE_RUN_IDS;
  const ids = opts.arms ?? runIds;
  if (new Set(ids).size !== ids.length) throw new RangeError(`--arms names an arm twice: ${ids.join(",")}`);
  const refused = ids.filter((id) => armRefusal(id) !== undefined);
  if (refused.length > 0) throw new RangeError(`--arms: ${refused.map((id) => `${id} is not playable: ${armRefusal(id) ?? ""}`).join("; ")}`);
  const foreign = ids.filter((id) => !runIds.includes(id));
  if (foreign.length > 0) throw new RangeError(`--arms: ${foreign.join(", ")} ${foreign.length === 1 ? "is" : "are"} not in this run (${runIds.join(", ")})`);
  const sets: readonly SeedSet[] = opts.seedSet === undefined ? SEED_SETS : [opts.seedSet];
  const targets = runIds.filter((id) => ids.includes(id)).flatMap((id) => sets.map((seedSet) => ({ id, seedSet })));
  const complete = opts.seedSet === undefined ? runIds.flatMap((id) => SEED_SETS.map((seedSet) => ({ id, seedSet }))) : targets;
  return { targets, complete, mine: targets.filter((_, i) => i % shard.count === shard.index - 1), ...(opts.seedSet === undefined ? {} : { oneSet: opts.seedSet }) };
}

/** `--part1`'s run list: the playable `pocket-1.s3` arms (C13 plays pocket-1.s2 and has no part 1). */
export const STEP3_PART1_IDS: readonly ArmId[] = Object.freeze(STEP3_PLAYABLE.filter((id) => isS3Arm(id)));

// --- the readings ------------------------------------------------------------------------------------------------

export type Step3Records = ReadonlyMap<ArmId, Readonly<Partial<Record<SeedSet, Step3Record>>>>;

export interface Step3Grade {
  readonly sections: Step3Sections;
  readonly groups: readonly { readonly seedSet: SeedSet; readonly input: StepReportInput }[];
}

const num = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));
const sgn = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(dp)}`);
const diffOf = (a: number | null | undefined, b: number | null | undefined): number | null => (a === null || a === undefined || b === null || b === undefined ? null : a - b);
const meanOf = (xs: readonly (number | null)[]): number | null => (xs.length === 0 || xs.some((x) => x === null) ? null : (xs as number[]).reduce((a, b) => a + b, 0) / xs.length);
const sumOf = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const aimedOf = (m: IntMix): number => sumOf(m.aimedByBin);

/** A row's value on one league, from the record's report (`null` when the row or its value is absent). */
export function rowValueOf(r: Pick<ArmRecord, "report"> | undefined, rowId: string, league: League): number | null {
  const v = r?.report.rows.find((x) => x.id === rowId)?.values[league];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The binomial SE of a share in percent on `n` trials. */
export function shareSE(p: number | null, n: number): number | null {
  if (p === null || !(n > 0)) return null;
  const q = Math.min(Math.max(p / 100, 0), 1);
  return 100 * Math.sqrt((q * (1 - q)) / n);
}

function bandText(c: BandClause): string {
  const lo = typeof c.lo === "number" ? c.lo : undefined;
  const hi = typeof c.hi === "number" ? c.hi : undefined;
  if (c.direction !== undefined) return `direction ${c.direction}`;
  if (lo !== undefined && hi !== undefined) return lo === hi ? String(lo) : `${String(lo)} to ${String(hi)}`;
  if (hi !== undefined) return `at most ${String(hi)}`;
  if (lo !== undefined) return `at least ${String(lo)}`;
  return c.kind === "structural" ? "its proof" : "filed";
}

const inBand = (v: number | null, c: Pick<BandClause, "lo" | "hi">): boolean => v !== null && Number.isFinite(v) && (typeof c.lo !== "number" || v >= c.lo) && (typeof c.hi !== "number" || v <= c.hi);

/** The band's line nearest `v` (the side it would cross). */
const nearestLine = (v: number, c: Pick<BandClause, "lo" | "hi">): number | null => {
  const lines = [c.lo, c.hi].filter((x): x is number => typeof x === "number");
  if (lines.length === 0) return null;
  return lines.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
};

/**
 * Whether two seed sets leave a graded verdict unresolved (plan §5.2; critique 4 S4-8): the other
 * set lands on the other side of the band from the graded set's verdict, within 2 SE of the line.
 */
export function notResolvedBySets(graded: number | null, other: number | null, otherSE: number | null, c: Pick<BandClause, "lo" | "hi">): boolean {
  if (graded === null || other === null || otherSE === null) return false;
  if (inBand(graded, c) === inBand(other, c)) return false;
  const line = nearestLine(other, c);
  return line !== null && Math.abs(other - line) <= 2 * otherSE;
}

/**
 * The miss rule's class split at step 3 (plan §7; AM-2): `classifyMiss` on the covered rows, the
 * bin's supply reason named only when `s3.bin20.tick` missed (AM-2), and a miss left with no class
 * named unclassed.
 */
export function classifyStep3Miss(split: MissSplit): { readonly missed: readonly string[]; readonly classes: readonly { readonly class: string; readonly because: readonly string[] }[] } {
  const c = classifyMiss(split);
  const binMissed = c.missed.includes("s3.bin20.tick");
  let classes = c.classes
    .map((k) => (k.class === "SUPPLY" && !binMissed ? { class: k.class as string, because: k.because.filter((b) => !b.startsWith("the 2.0 s bin passes without a free runner")) } : { class: k.class as string, because: [...k.because] }))
    .filter((k) => k.because.length > 0);
  if (c.missed.length > 0 && classes.length === 0) classes = [{ class: "UNCLASSED", because: [`${c.missed.join(", ")} missed with none of (i) to (iii) holding`] }];
  return { missed: c.missed, classes };
}

/** One alone arm's paired gap: the ratio means of first free-runner arrival (seconds), the gap and its game-paired SE (delta method). */
export function pairedEtaGap(pairs: readonly { readonly arm: readonly string[]; readonly base: readonly string[] }[]): { readonly armMean: number | null; readonly baseMean: number | null; readonly gap: number | null; readonly se: number | null; readonly games: number } {
  const parse = (s: string): { s: number; n: number } => {
    const [a, b] = s.split("/");
    return { s: Number(a), n: Number(b) };
  };
  const games: { a: { s: number; n: number }; b: { s: number; n: number } }[] = [];
  for (const p of pairs) for (let i = 0; i < Math.min(p.arm.length, p.base.length); i += 1) games.push({ a: parse(p.arm[i]!), b: parse(p.base[i]!) });
  const Na = sumOf(games.map((g) => g.a.n));
  const Nb = sumOf(games.map((g) => g.b.n));
  if (Na === 0 || Nb === 0) return { armMean: null, baseMean: null, gap: null, se: null, games: games.length };
  const Ra = sumOf(games.map((g) => g.a.s)) / Na;
  const Rb = sumOf(games.map((g) => g.b.s)) / Nb;
  const G = games.length;
  const ss = sumOf(games.map((g) => ((g.a.s - Ra * g.a.n) / Na - (g.b.s - Rb * g.b.n) / Nb) ** 2));
  const se = G > 1 ? Math.sqrt((G / (G - 1)) * ss) / 10 : null;
  return { armMean: Ra / 10, baseMean: Rb / 10, gap: (Ra - Rb) / 10, se, games: G };
}

/** Part 1's section (`--part1` prints it; the report prints it in place) from the records present. */
export function part1SectionOf(file: FiledFile, at: (id: ArmId, s: SeedSet) => Step3Record | undefined, ids: readonly ArmId[], sets: readonly SeedSet[]): Step3Part1Section {
  const rows: Step3Part1Row[] = [];
  const byOrigin: Step3Part1Section["byOrigin"][number][] = [];
  for (const id of ids) {
    for (const league of LEAGUES) {
      let merged: Part1Fold | undefined;
      for (const s of sets) {
        const r = at(id, s);
        const L = r?.s3[league];
        if (L === undefined || L.part1 === null) continue;
        const p = L.part1;
        merged = merged === undefined ? p : mergePart1Folds(merged, p);
        rows.push({
          arm: id, league, seedSet: s, plays: p.plays, s3Plays: p.s3Plays, pictures: p.pictures, part1: p.part1, earlier: p.earlier ?? 0,
          touchedOnClock: p.touchedOnClock, offClock: p.offClock, touched: p.touched, held: p.held, carried: p.carried, mirror: p.mirror, monotone: p.monotone,
          monotoneGraded: STEP3_MONOTONE_ARMS.includes(id),
          problemCount: p.problemCount, problems: p.problems, monotoneProblemCount: p.monotoneProblemCount, monotoneProblems: p.monotoneProblems,
          lateBlock: { s3Plays: L.lateBlock?.s3Plays ?? 0, problemCount: L.lateBlock?.problemCount ?? 0, problems: L.lateBlock?.problems ?? [] },
          waitLiteral: L.waitLiteral ?? { men: 0, differ: 0, byRow: {} },
        });
      }
      if (merged !== undefined) byOrigin.push({ arm: id, league, byOrigin: merged.byOrigin as Readonly<Record<string, Part1Count>>, byRow: merged.byRow as Readonly<Record<string, Part1Count>> });
    }
  }
  const m8 = filedM8Of(file) as Readonly<Record<string, unknown>>;
  return {
    rows,
    byOrigin,
    filedM8: [`{"flat":${canonicalise(m8["flat"] ?? null)},`, `"gen":${canonicalise(m8["gen"] ?? null)}}`],
    notes: [
      "part 1 is read on every pocket-1.s3 arm, each against its own picture; an arm that holds an input reads AM-2's filed reference for it and nothing else (C3, C4, C5)",
      `the monotone clauses are graded on ${STEP3_MONOTONE_ARMS.join(" and ")} (AM-2 \`monotone\`) and computed on every arm; Speed alone is reported by count and size`,
      "the literal count against the filed Wait table (M8's WAIT answer on D19's men) is printed beside, never graded: its differences are the table's rounding, slot corners, edge backers, creepers and carriers (AM-2 `timingAgainstAtStep3`)",
    ],
  };
}

/** M5 on the mirror arm, from its records' M5 games on the sets present; null when it is not in the run. */
export function m5SectionOf(at: (id: ArmId, s: SeedSet) => Step3Record | undefined, sets: readonly SeedSet[]): Step3M5Section | null {
  const present = sets.filter((s) => at(STEP3_M5_ARM, s)?.m5 !== undefined);
  if (present.length === 0) return null;
  const leagues: Step3M5League[] = LEAGUES.map((league) => {
    const runs = present.flatMap((s) => {
      const m = at(STEP3_M5_ARM, s)!.m5![league];
      return [
        { league, set: s, mirrored: false, games: m.unmirrored },
        { league, set: s, mirrored: true, games: m.mirrored },
      ];
    });
    const compared = m5Compare(league, runs) as { readonly rows: Readonly<Record<string, { readonly tolerance: number; readonly withinNoiseOnEverySet: boolean; readonly sets: readonly { readonly set: number; readonly unmirrored: number; readonly mirrored: number; readonly difference: number; readonly seDifference: number; readonly withinNoise: boolean }[] }>> };
    const z = m5RowZ(compared as unknown as Readonly<Record<string, unknown>>);
    return {
      league,
      rows: Object.entries(compared.rows).map(([row, v]) => ({
        row,
        tolerance: v.tolerance,
        withinNoiseOnEverySet: v.withinNoiseOnEverySet,
        sets: v.sets.map((x) => ({ set: x.set, unmirrored: x.unmirrored, mirrored: x.mirrored, difference: x.difference, seDifference: x.seDifference, z: z[row]?.find((y) => y.set === x.set)?.z ?? null, withinNoise: x.withinNoise })),
      })),
      freeRunMirror: present.map((s) => {
        const f = at(STEP3_M5_ARM, s)!.m5![league].freeRunMirror;
        return { set: s, playsPaired: f.playsPaired, menCompared: f.menCompared, menDiffering: f.menDiffering, menInOneOnly: f.menInOneOnly, exact: f.exact, sample: f.sample };
      }),
    };
  });
  return { arm: STEP3_M5_ARM, leagues };
}

// --- grading -----------------------------------------------------------------------------------------------

function figuresOf(r: Step3Record | undefined, league: League): Step1Figures {
  const m = r?.measures[league];
  return { pressure: m?.pressure ?? null, hitOrSack: m?.hitOrSack ?? null, sack: m?.sack ?? null, release: m?.release ?? null };
}

/** The step's groups for `renderStepReport`: each base with the C arms that read it, then the bases no C arm reads. */
export function step3Groups(): readonly { readonly base: ArmId; readonly arms: readonly ArmId[] }[] {
  return STEP3_BASE_IDS.map((base) => ({ base, arms: STEP3_PLAYABLE.filter((id) => armById(id).base === base) }));
}

/** Grades the records present against the filing as AM-2 amends part 1 and AM-3 maps the guard (pure). */
export function gradeStep3(records: Step3Records, file: FiledFile, guard: Step3Guard, references: Step2References, oneSet?: SeedSet): Step3Grade {
  const sets: readonly SeedSet[] = oneSet === undefined ? SEED_SETS : [oneSet];
  const gradedSet: SeedSet = oneSet ?? GRADED_SEED_SET;
  const at = (id: ArmId, s: SeedSet): Step3Record | undefined => records.get(id)?.[s];
  for (const [id, bySet] of records) {
    for (const s of SEED_SETS) {
      const r = bySet[s];
      if (r === undefined) continue;
      if (r.stamp.amendments !== guard.digest) throw new Error(`ADR-089 step 3: refused to grade: ${id} (set ${String(s)}) is stamped with amendments ${String(r.stamp.amendments)}, not the step-3 view's ${guard.digest}`);
      if (r.stamp.arm !== id || r.stamp.seedSet !== s) throw new Error(`ADR-089 step 3: refused to grade: the record filed as ${id} set ${String(s)} is ${r.stamp.arm} set ${String(r.stamp.seedSet)}`);
    }
  }
  const present = STEP3_PLAYABLE_RUN_IDS.flatMap((id) => sets.flatMap((s) => (at(id, s) === undefined ? [] : [{ id, s, r: at(id, s)! }])));
  const where = (x: { id: ArmId; s: SeedSet }): string => `${x.id} set ${String(x.s)}`;
  const unpacked = new Map<string, S2Folds>();
  const s2Of = (r: Step3Record, league: League): S2Folds => {
    const key = `${r.stamp.arm}.${String(r.stamp.seedSet)}.${league}`;
    let f = unpacked.get(key);
    if (f === undefined) {
      f = unpackS2Folds(r.s2[league]);
      unpacked.set(key, f);
    }
    return f;
  };
  const cut = (r: Step3Record): boolean => r.stamp.corpus.flatFirst !== null || r.stamp.corpus.genThroughWeek !== null;
  const s3Present = present.filter((x) => isS3Arm(x.id));
  const clauseById = new Map(file.bands.clauses.map((c) => [c.id, c]));

  // --- the structural proofs and the fold checks ---
  const proofs: Step2Proof[] = [];

  const part1Fails = s3Present.flatMap((x) => LEAGUES.flatMap((l) => (x.r.s3[l].part1 === null ? [`${where(x)} ${l}: no part-1 fold`] : part1Problems(x.r.s3[l].part1!).map((p) => `${where(x)} ${l}: ${p}`))));
  const part1Checked = sumOf(s3Present.flatMap((x) => LEAGUES.map((l) => x.r.s3[l].part1?.part1.checked ?? 0)));
  proofs.push({
    id: "s3.part1",
    what: "part 1 (AM-2 `part1`, superseding s3.part1.m8): every man nobody touched has his published etaTick equal, to the tenth, to M8's free-run function on his own entry in the published picture; with it the touched men's check, the off-clock men and every picture placed, on every pocket-1.s3 arm, both leagues",
    kind: "structural",
    verdict: s3Present.length === 0 ? "NOT APPLICABLE" : part1Fails.length > 0 || part1Checked === 0 ? "FAIL" : "PASS",
    detail: `${String(part1Checked)} men checked over ${String(s3Present.length)} arm-sets; failures ${part1Fails.length === 0 ? "none" : part1Fails.join("; ")}${part1Checked === 0 && s3Present.length > 0 ? "; no man checked: the proof saw no case" : ""}`,
  });

  const monoPresent = present.filter((x) => STEP3_MONOTONE_ARMS.includes(x.id));
  const monoFails = monoPresent.flatMap((x) => LEAGUES.flatMap((l) => (x.r.s3[l].part1 === null ? [] : monotoneProblems(x.r.s3[l].part1!).map((p) => `${where(x)} ${l}: ${p}`))));
  const monoMen = sumOf(monoPresent.flatMap((x) => LEAGUES.map((l) => x.r.s3[l].part1?.monotone.men ?? 0)));
  const speedAlone = monoPresent.flatMap((x) => LEAGUES.map((l) => {
    const m = x.r.s3[l].part1?.monotone.speedAlone;
    return `${where(x)} ${l} ${String(m?.laterAtTenth ?? 0)} later at the tenth of ${String(m?.pairs ?? 0)} (largest ${num(m?.worstSeconds ?? 0, 6)} s)`;
  }));
  proofs.push({
    id: "s3.monotone",
    what: `the monotone clauses (AM-2 \`monotone\`, superseding s3.part1.monotone): Acceleration +1, Speed and Acceleration +1 together never later, the deeper drop never sooner, at the tenth, on every untouched man of ${STEP3_MONOTONE_ARMS.join(" and ")}`,
    kind: "structural",
    verdict: monoPresent.length === 0 ? "NOT APPLICABLE" : monoFails.length > 0 || monoMen === 0 ? "FAIL" : "PASS",
    detail: `${String(monoMen)} men read; failures ${monoFails.length === 0 ? "none" : monoFails.join("; ")}; Speed alone (reported): ${speedAlone.join("; ") || "n/a"}`,
  });

  const m5 = m5SectionOf(at, sets);
  const m5Fails = m5 === null ? [] : m5.leagues.flatMap((l) => [
    ...l.rows.filter((r) => !r.withinNoiseOnEverySet).map((r) => `${l.league} ${r.row} outside the noise`),
    ...l.freeRunMirror.filter((f) => !f.exact).map((f) => `${l.league} set ${String(f.set)} free-run mirror not exact (${String(f.menDiffering)} of ${String(f.menCompared)} men differ)`),
  ]);
  const mirrorFails = s3Present.flatMap((x) => LEAGUES.flatMap((l) => ((x.r.s3[l].part1?.mirror.failed ?? 0) > 0 ? [`${where(x)} ${l}: ${String(x.r.s3[l].part1!.mirror.failed)} of ${String(x.r.s3[l].part1!.mirror.checked)} men's mirrored times differ`] : [])));
  proofs.push({
    id: "s3.mirror",
    what: `the mirror guard (s3.part1.mirror): M5 on ${STEP3_M5_ARM} within the noise on every row and set, the exact free-run mirror on each league and set, and part 1's mirrored time the same on every arm`,
    kind: "structural",
    verdict: m5 === null ? "NOT APPLICABLE" : m5Fails.length > 0 || mirrorFails.length > 0 ? "FAIL" : "PASS",
    detail: m5 === null ? `${STEP3_M5_ARM} is not in this run` : `failures ${[...m5Fails, ...mirrorFails].join("; ") || "none"}`,
  });

  const lateFails = s3Present.flatMap((x) => LEAGUES.flatMap((l) => {
    const L = x.r.s3[l];
    return L.lateBlock === null || L.census === null ? [] : s3Problems({ lateBlock: L.lateBlock, census: L.census }).map((p) => `${where(x)} ${l}: ${p}`);
  }));
  proofs.push({
    id: "s3.lateBlock",
    what: "the late block's place in the stream (AM-2 `lateBlock`): every expected late block present with its toucher, beat tick and beaten threat, on every pocket-1.s3 arm",
    kind: "structural",
    verdict: s3Present.length === 0 ? "NOT APPLICABLE" : lateFails.length > 0 ? "FAIL" : "PASS",
    detail: `${String(sumOf(s3Present.flatMap((x) => LEAGUES.map((l) => x.r.s3[l].lateBlock?.lateBlocks ?? 0))))} late blocks read; failures ${lateFails.length === 0 ? "none" : lateFails.join("; ")}`,
  });

  const offered = Object.keys(MISS_OPTIONS);
  const priced = Object.values(STEP3_OPTION_ARMS);
  const neverWrong = Object.keys(STEP3_NEVER_OFFERED).filter((id) => priced.includes(id as ArmId));
  proofs.push({
    id: "s3.neverOffered",
    what: "a late block, a uniform delay or a refit of the free-run constants is never offered for a man nobody touched (s3.neverOffered, proof:miss-rule; AM-2)",
    kind: "structural",
    verdict: neverWrong.length > 0 || offered.join(",") !== "A,B,C" ? "FAIL" : "PASS",
    detail: `the options offered are ${offered.join(", ")}, priced by ${Object.entries(STEP3_OPTION_ARMS).map(([o, id]) => `${o} ${id}`).join(" and ")} (B plays nothing); never offered: ${Object.entries(STEP3_NEVER_OFFERED).map(([id, why]) => `${id}, ${why}`).join("; ")}`,
  });

  // The step-2 stream checks, on every arm (M2 STREAM's rebuild on the arms that do not play pocket-1.s3).
  const isPerRusher = (id: ArmId): boolean => armById(id).forcing === "PER_RUSHER";
  const selfExceptions = present.flatMap((x) => LEAGUES.flatMap((l) => {
    const f = x.r.s2[l].mustAct;
    const c = selfCheckOf(f);
    return [
      ...(c.offRule !== null && c.offRule.exceptions > 0 ? [`${where(x)} ${l}: ${String(c.offRule.exceptions)} of ${String(c.offRule.acts)} off-rule acts`] : []),
      ...(c.witness.exceptions > 0 ? [`${where(x)} ${l}: ${String(c.witness.exceptions)} witness exceptions`] : []),
    ];
  }));
  const witnessOf = (x: { r: Step3Record }, l: League): MustActSelfCheck["witness"] => selfCheckOf(x.r.s2[l].mustAct).witness;
  const countHolds = sumOf(present.flatMap((x) => LEAGUES.map((l) => witnessOf(x, l).countHolds)));
  proofs.push({
    id: "s2.selfCheck",
    what: "the count part's restatement, both ways (step-2 plan §1.7 (ii)): not too strict on every arm under step 1's rule, not too generous on every arm",
    kind: "fold",
    verdict: present.length === 0 ? "NOT APPLICABLE" : selfExceptions.length > 0 || countHolds === 0 ? "FAIL" : "PASS",
    detail: `${String(present.length)} arm-sets; closing HOLDs at or past throwawayEarliestSeconds ${String(countHolds)}; exceptions ${selfExceptions.length === 0 ? "none" : selfExceptions.join("; ")}`,
  });
  const selfFault = selfExceptions.length > 0;
  const perRusher = present.filter((x) => isPerRusher(x.id));
  const counterFails = perRusher.flatMap((x) => LEAGUES.flatMap((l) => (x.r.s2[l].mustAct.problemCount > 0 ? [`${where(x)} ${l} (${String(x.r.s2[l].mustAct.problemCount)}; first: ${x.r.s2[l].mustAct.problems[0] ?? ""})`] : [])));
  proofs.push({
    id: "s2.falsifier.counterAlone",
    what: "must act never fires on the counter alone (proof:must-act-counter), on every PER_RUSHER arm",
    kind: "structural",
    verdict: perRusher.length === 0 ? "NOT APPLICABLE" : selfFault ? "NOT JUDGED" : counterFails.length > 0 ? "FAIL" : "PASS",
    detail: `${String(sumOf(perRusher.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].mustAct.acts))))} forced acts on ${String(perRusher.length)} arm-sets; failures ${counterFails.length === 0 ? "none" : counterFails.join("; ")}${selfFault ? "; NOT JUDGED: the count part's self-check failed (a fold fault)" : ""}`,
  });
  const stream = (id: string, what: string, pick: (f: S2Folds | Step3Record["s2"][League]) => { problemCount: number; problems: readonly string[] }, cases: (x: { r: Step3Record }, l: League) => number): void => {
    const fails = present.flatMap((x) => LEAGUES.flatMap((l) => {
      const f = pick(x.r.s2[l]);
      return f.problemCount > 0 ? [`${where(x)} ${l} (${String(f.problemCount)}; first: ${f.problems[0] ?? ""})`] : [];
    }));
    const n = sumOf(present.flatMap((x) => LEAGUES.map((l) => cases(x, l))));
    proofs.push({ id, what, kind: "structural", verdict: present.length === 0 ? "NOT APPLICABLE" : fails.length > 0 ? "FAIL" : "PASS", detail: `${String(n)} cases over ${String(present.length)} arm-sets; failures ${fails.length === 0 ? "none" : fails.join("; ")}` });
  };
  stream("s2.falsifier.everyArrival", "every arrival makes him act (proof:must-act-arrival), on every arm", (f) => f.arrival, (x, l) => x.r.s2[l].arrival.cases);
  stream("s2.warning.clean", "no threat inside the warning coexists with CLEAN, on every arm", (f) => f.warning, (x, l) => x.r.s2[l].warning.statusTicks);
  stream("s2.liveSet", "the live threat set rebuilt from the published RUSH_THREATs, on every arm", (f) => f.liveSet, (x, l) => x.r.s2[l].liveSet.statusTicks);
  const m2Arms = present.filter((x) => !isS3Arm(x.id));
  const m2Fails = m2Arms.flatMap((x) => LEAGUES.flatMap((l) => s2Problems(s2Of(x.r, l)).filter((p) => p.startsWith("m2 STREAM")).map((p) => `${where(x)} ${l}: ${p}`)));
  proofs.push({
    id: "s2.m2.identity",
    what: "M2 STREAM's rebuild on every arm that does not play pocket-1.s3 (the bases and C13); on a pocket-1.s3 arm it is not folded, since it reads neither the late block nor the free-run clock",
    kind: "fold",
    verdict: m2Arms.length === 0 ? "NOT APPLICABLE" : m2Fails.length > 0 ? "FAIL" : "PASS",
    detail: `${String(m2Arms.length)} arm-sets; failures ${m2Fails.length === 0 ? "none" : m2Fails.join("; ")}`,
  });
  const s1Fails = present.flatMap((x) => LEAGUES.flatMap((l) => s1Problems(x.r.s1[l]).map((p) => `${where(x)} ${l}: ${p}`)));
  proofs.push({
    id: "s1.streamChecks",
    what: "step 1's stream checks (window ticks, beat accounting, margins, approach) on every arm of the run",
    kind: "structural",
    verdict: present.length === 0 ? "NOT APPLICABLE" : s1Fails.length > 0 ? "FAIL" : "PASS",
    detail: `${String(present.length)} arm-sets, both leagues; failures ${s1Fails.length === 0 ? "none" : s1Fails.join("; ")}`,
  });
  const q3: string[] = [];
  const q3Unchecked: string[] = [];
  const q3Fails: string[] = [];
  let q3Checked = 0;
  for (const id of STEP3_BASE_IDS) {
    for (const s of sets) {
      const r = at(id, s);
      if (r === undefined) continue;
      const ref = references.get(`${id}.set${String(s)}`);
      if (cut(r)) q3Unchecked.push(`${id} set ${String(s)} NOT CHECKED (a cut corpus, tests only)`);
      else if (ref === undefined) q3Fails.push(`${id} set ${String(s)} has no step-2 record (a missing reference on the full corpus fails)`);
      else {
        q3Checked += 1;
        const differ = q3Problems(r, ref);
        if (differ.length > 0) q3Fails.push(`${id} set ${String(s)} differs on ${differ.join(", ")}`);
        else q3.push(`${id} set ${String(s)} equal`);
      }
    }
  }
  proofs.push({
    id: "q3.replay",
    what: `the re-played bases equal step 2's records (${STEP2_RECORDS_JSON}, both seed sets) on the stamp-free projection (every field but ${Q3_LEFT_OUT.join(", ")}); never a re-grade`,
    kind: "structural",
    verdict: q3Fails.length > 0 ? "FAIL" : q3Unchecked.length > 0 ? "NOT CHECKED" : q3Checked === 0 ? "NOT APPLICABLE" : "PASS",
    detail: [...q3Unchecked, ...q3, ...q3Fails].join("; ") || "no re-played base in this run",
  });
  const proofById = new Map(proofs.map((p) => [p.id, p]));

  // --- the guard under AM-1's reading as AM-3 maps it ---
  const sideOf = (r: Step3Record, league: League): GuardSide => ({ all: r.report.intGuard[league].all, byClass: r.report.intGuard[league].byClass });
  const bySetOf = <T>(id: ArmId, f: (r: Step3Record) => T): Partial<Record<SeedSet, T>> => Object.fromEntries(sets.flatMap((s) => (at(id, s) === undefined ? [] : [[s, f(at(id, s)!)]]))) as Partial<Record<SeedSet, T>>;
  const bothPresent = (a: ArmId, b: ArmId): boolean => sets.some((s) => at(a, s) !== undefined && at(b, s) !== undefined);
  const checkdownOf = (id: ArmId, league: League): Step3GuardRow["checkdown"]["base"][number][] =>
    sets.flatMap((s) => {
      const r = at(id, s);
      if (r === undefined) return [];
      const c = checkdownTriggersOf(r.s2[league].mustAct);
      return [{ seedSet: s, rule: c.rule, acts: c.acts, threatPart: c.threatPart, statusPart: c.statusPart, countPart: c.countPart, ruleOnly: c.ruleOnly, countOnly: c.countOnly, both: c.both, neither: c.neither }];
    });
  const guardRow = (arm: ArmId, base: ArmId, league: League, role: Step3GuardRow["role"]): Step3GuardRow => {
    const clock: GuardClock = (sets.map((s) => at(arm, s)).find((r) => r !== undefined) as Step3Record).report.clock;
    const reading = am1ArmReading(bySetOf(base, (r) => sideOf(r, league)), bySetOf(arm, (r) => sideOf(r, league)), clock, guard.lines);
    const gamesOf = (id: ArmId): Partial<Record<SeedSet, readonly GuardGameVector[]>> => bySetOf(id, (r) => s2Of(r, league).guardGames);
    const baseGames = gamesOf(base);
    const armGames = gamesOf(arm);
    const pairedClasses: Record<string, PairedReading> = {};
    for (const c of reading.classes) pairedClasses[c.cls] = pairedReading(baseGames, armGames, { of: "CLASS", cls: c.cls }, clock);
    const desperation: Step2GuardHalf[] = DESPERATION_HALVES.map((half) => {
      const cellsOf = (id: ArmId): Partial<Record<SeedSet, IntMix>> => bySetOf(id, (r) => r.s2[league].desperation[half]);
      const b = cellsOf(base);
      const a = cellsOf(arm);
      const both = Object.fromEntries(sets.flatMap((s) => (b[s] !== undefined && a[s] !== undefined && aimedOf(b[s]!) > 0 && aimedOf(a[s]!) > 0 ? [[s, true]] : [])));
      const pick = (m: Partial<Record<SeedSet, IntMix>>): Partial<Record<SeedSet, IntMix>> => Object.fromEntries(Object.entries(m).filter(([s]) => s in both));
      return {
        half,
        bySet: sets.flatMap((s) => (b[s] === undefined || a[s] === undefined ? [] : [{ seedSet: s, baseAimed: aimedOf(b[s]!), baseInterceptions: b[s]!.interceptions, armAimed: aimedOf(a[s]!), armInterceptions: a[s]!.interceptions }])),
        reading: Object.keys(both).length === 0 ? null : am1Reading(pick(b), pick(a), clock, "CLASS", guard.lines),
        paired: pairedReading(baseGames, armGames, { of: "HALF", half }, clock),
      };
    });
    const reweighted = sets.flatMap((s) => {
      const b = at(base, s);
      const a = at(arm, s);
      return b === undefined || a === undefined ? [] : [reweightedDesperation(s, b.s2[league].desperation, a.s2[league].desperation)];
    });
    const checkdownReweighted = sets.flatMap((s) => {
      const b = at(base, s);
      const a = at(arm, s);
      return b === undefined || a === undefined ? [] : [reweightedBy(s, CHECKDOWN_TRIGGERS, b.s2[league].checkdown, a.s2[league].checkdown)];
    });
    return {
      arm, base, league, role, cumulative: role === "cumulative", reading,
      pairedLeague: pairedReading(baseGames, armGames, { of: "LEAGUE" }, clock),
      pairedClasses, desperation, reweighted,
      checkdown: { base: checkdownOf(base, league), arm: checkdownOf(arm, league) },
      checkdownReweighted,
      seZeroFlags: [
        ...seZeroWithExcess(reading.league).map((s) => `league-wide set ${String(s)}`),
        ...reading.classes.flatMap((c) => (c.reading === undefined ? [] : seZeroWithExcess(c.reading).map((s) => `${c.cls} set ${String(s)}`))),
      ],
    };
  };
  const guardRows: Step3GuardRow[] = [];
  const mapped = Object.keys(guard.bases) as ArmId[];
  for (const id of STEP3_PLAYABLE.filter((x) => mapped.includes(x))) {
    const base = guard.bases[id]!;
    if (!bothPresent(id, base)) continue;
    for (const league of LEAGUES) guardRows.push(guardRow(id, base, league, "graded"));
  }
  for (const [role, lines] of [["cumulative", guard.cumulative], ["accepted", guard.accepted]] as const) {
    for (const [arm, base] of [[STEP3_DESIGN_ARM, lines.design], [STEP3_PRICING_ARM, lines.pricing]] as const) {
      if (!bothPresent(arm, base)) continue;
      for (const league of LEAGUES) guardRows.push(guardRow(arm, base, league, role));
    }
  }
  for (const id of STEP3_PLAYABLE.filter((x) => !mapped.includes(x))) {
    const base = armById(id).base;
    if (base === undefined || !bothPresent(id, base)) continue;
    for (const league of LEAGUES) guardRows.push(guardRow(id, base, league, "information"));
  }
  const graded = guardRows.filter((g) => g.role === "graded");

  // --- the declared composition print ---
  const composition: Step3CompositionRow[] = [];
  const sourceRank = (k: string): number => COMPOSITION_SOURCES.indexOf(k.split("|")[1] as (typeof COMPOSITION_SOURCES)[number]);
  const tickOf = (k: string): number => (k.startsWith("none") ? Number.POSITIVE_INFINITY : Number(k.split("|")[0]));
  for (const [arm, base] of STEP3_COMPOSITION_PAIRS) {
    if (!bothPresent(arm, base)) continue;
    for (const league of LEAGUES) {
      for (const cls of GUARD_CLASSES) {
        const add = (id: ArmId): Record<string, CompositionCell> => {
          const out: Record<string, CompositionCell> = {};
          for (const s of sets) {
            const cells = at(id, s)?.s3[league].composition[cls] ?? {};
            for (const [k, v] of Object.entries(cells)) {
              const c = (out[k] ??= { aimed: 0, interceptions: 0 });
              c.aimed += v.aimed;
              c.interceptions += v.interceptions;
            }
          }
          return out;
        };
        const b = add(base);
        const a = add(arm);
        const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort((x, y) => tickOf(x) - tickOf(y) || sourceRank(x) - sourceRank(y));
        composition.push({
          arm, base, league, cls,
          cells: keys.map((key) => ({ key, baseAimed: b[key]?.aimed ?? 0, baseInterceptions: b[key]?.interceptions ?? 0, armAimed: a[key]?.aimed ?? 0, armInterceptions: a[key]?.interceptions ?? 0 })),
        });
      }
    }
  }

  // --- the clauses ---
  const clauses: Step2ClauseResult[] = [];
  const ttt = (id: ArmId, s: SeedSet, league: League): number | null => at(id, s)?.measures[league].timeToThrow ?? null;
  const valueOf = (id: ArmId, s: SeedSet, league: League, clause: string): number | null => rowValueOf(at(id, s), STEP3_CLAUSE_ROWS[clause]!.row, league);
  const seOf = (id: ArmId, s: SeedSet, league: League, clause: string): number | null => {
    const r = at(id, s);
    if (r === undefined) return null;
    return shareSE(valueOf(id, s, league, clause), r.s3[league].missSplit.counts[STEP3_CLAUSE_ROWS[clause]!.n]);
  };
  const missingOf = (ids: readonly ArmId[], s: SeedSet = gradedSet): ArmId[] => ids.filter((id) => at(id, s) === undefined);
  const design = STEP3_DESIGN_ARM;
  const designBase = armById(design).base!;
  const fromProof = (p: Step2Proof | undefined): Step2Verdict => (p === undefined ? "NOT PLAYED" : p.verdict);
  const unresolved: string[] = [];

  for (const c of file.bands.clauses) {
    if (c.step !== "3" && c.step !== "guard") continue;
    const filed = bandText(c);
    if (c.id === "s3.part1.m8" || c.id === "s3.part1.monotone" || c.id === "s3.part1.mirror" || c.id === "s3.neverOffered") {
      const p = proofById.get(c.id === "s3.part1.m8" ? "s3.part1" : c.id === "s3.part1.monotone" ? "s3.monotone" : c.id === "s3.part1.mirror" ? "s3.mirror" : "s3.neverOffered");
      const superseded = c.id === "s3.part1.m8" ? `superseded by ${guard.am2}: part 1 on the published picture (filed: Wait, the Mug arm off)` : c.id === "s3.part1.monotone" ? `superseded by ${guard.am2}: graded at the tenth on ${STEP3_MONOTONE_ARMS.join(" and ")}, Speed alone reported` : filed;
      clauses.push({ id: c.id, kind: c.kind, arms: c.id === "s3.part1.monotone" ? [...STEP3_MONOTONE_ARMS] : c.id === "s3.part1.mirror" ? [STEP3_M5_ARM] : c.id === "s3.neverOffered" ? ["C11", "C12", "C13", "C15"] : [...new Set(s3Present.map((x) => x.id))], filed: superseded, values: [p?.detail ?? "not played"], verdict: fromProof(p) });
      continue;
    }
    if (c.id === "s3.part1.determinism") {
      clauses.push({ id: c.id, kind: c.kind, arms: [...STEP3_DIGEST_ARMS], filed, values: ["R-1: pocket -- --step 3 --digests in two processes, the two outputs byte-identical; not played by a graded run"], verdict: "NOT CHECKED", note: "proved outside the run (step-3 plan §6.2 R-1)" });
      continue;
    }
    if ((STEP3_MISS_ROWS as readonly string[]).includes(c.id)) {
      const missing = missingOf([design]);
      const notes: string[] = [];
      const reads = LEAGUES.map((l) => {
        const v = valueOf(design, gradedSet, l, c.id);
        const others = sets.filter((s) => s !== gradedSet).map((s) => {
          const vo = valueOf(design, s, l, c.id);
          if (notResolvedBySets(v, vo, seOf(design, s, l, c.id), c)) {
            notes.push(`${l}: not resolved by two seed sets (set ${String(gradedSet)} ${inBand(v, c) ? "PASS" : "FAIL"}, set ${String(s)} ${inBand(vo, c) ? "PASS" : "FAIL"}, within 2 SE of the line)`);
            unresolved.push(`${c.id} ${l}`);
          } else if (vo !== null && v !== null && inBand(v, c) !== inBand(vo, c)) notes.push(`${l}: the sets differ (set ${String(gradedSet)} ${inBand(v, c) ? "PASS" : "FAIL"}, set ${String(s)} ${inBand(vo, c) ? "PASS" : "FAIL"})`);
          return `set ${String(s)} ${num(vo)}`;
        });
        const mean = sets.length === 2 ? `; two-set mean ${num(meanOf(sets.map((s) => valueOf(design, s, l, c.id))))}` : "";
        const tt = `[time to throw ${design} ${num(ttt(design, gradedSet, l), 3)} s, ${designBase} ${num(ttt(designBase, gradedSet, l), 3)} s]`;
        return { v, text: `${design} ${l} set ${String(gradedSet)} ${num(v)} (binomial SE ${num(seOf(design, gradedSet, l, c.id))}; ${designBase} ${num(valueOf(designBase, gradedSet, l, c.id))})${others.length === 0 ? "" : `; ${others.join("; ")}`}${mean} ${tt}` };
      });
      const ok = reads.every((r) => inBand(r.v, c));
      clauses.push({
        id: c.id, kind: c.kind, arms: [design], filed, values: missing.length > 0 ? [`not played: ${missing.join(", ")}`] : reads.map((r) => r.text),
        verdict: missing.length > 0 ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : ok ? "PASS" : "FAIL",
        note: [`${design} set ${String(gradedSet)} graded on each league, set 2 and the two-set mean beside; a miss goes to the owner under the miss rule`, ...notes].join("; "),
      });
      continue;
    }
    if (c.id === "s3.quickOrigin") {
      const share = (r: Step3Record | undefined, l: League): string => {
        if (r === undefined) return "n/a";
        const m = r.s3[l].missSplit;
        const all = sumOf(Object.values(m.firstPressureOrigin));
        const quick = sumOf(Object.values(m.quickFirstPressureByOrigin));
        const fa = all === 0 ? null : (100 * (m.firstPressureOrigin["FREE_RUNNER"] ?? 0)) / all;
        const fq = quick === 0 ? null : (100 * (m.quickFirstPressureByOrigin["FREE_RUNNER"] ?? 0)) / quick;
        return `free rushers ${num(fq)}% of quick pressures against ${num(fa)}% of all (${sgn(diffOf(fq, fa))})`;
      };
      const values = LEAGUES.flatMap((l) => sets.map((s) => `${l} set ${String(s)}: ${design} ${share(at(design, s), l)}; ${designBase} ${share(at(designBase, s), l)}`));
      clauses.push({ id: c.id, kind: c.kind, arms: [design, designBase], filed, values: missingOf([design]).length > 0 ? ["not played: C1"] : values, verdict: missingOf([design]).length > 0 ? "NOT PLAYED" : "REPORTED", note: "reported; acceptance grades its direction (ADR-089:1144)" });
      continue;
    }
    if (c.id === "s3.unblockedMen") {
      const values = LEAGUES.flatMap((l) => sets.map((s) => `${l} set ${String(s)}: ${STEP3_DESIGN_ARM} ${num(valueOf(STEP3_DESIGN_ARM, s, l, c.id))} (B3 ${num(valueOf("B3", s, l, c.id))}), ${STEP3_PRICING_ARM} ${num(valueOf(STEP3_PRICING_ARM, s, l, c.id))} (B6 ${num(valueOf("B6", s, l, c.id))})`));
      clauses.push({ id: c.id, kind: c.kind, arms: [STEP3_DESIGN_ARM, STEP3_PRICING_ARM], filed, values: missingOf([design]).length > 0 ? ["not played: C1"] : values, verdict: missingOf([design]).length > 0 ? "NOT PLAYED" : "REPORTED", note: "reported beside the unblocked rows" });
      continue;
    }
    if (STAND_IN_DELTAS[c.id] !== undefined) {
      const missing = missingOf([STEP3_PRICING_ARM, "B6"]);
      const values = (["gen", "flat"] as const).flatMap((l) => sets.map((s) => {
        const d = diffOf(valueOf(STEP3_PRICING_ARM, s, l, c.id), valueOf("B6", s, l, c.id));
        const tt = c.id === "s3.hitOrSack" || c.id === "s3.expected.sack" ? ` [time to throw ${STEP3_PRICING_ARM} ${num(ttt(STEP3_PRICING_ARM, s, l), 3)} s, B6 ${num(ttt("B6", s, l), 3)} s]` : "";
        return `${l === "gen" ? "" : "beside, information: "}${l} set ${String(s)}: ${STEP3_PRICING_ARM} - B6 ${sgn(d)}${tt}`;
      }));
      clauses.push({
        id: c.id, kind: c.kind, arms: [STEP3_PRICING_ARM, "B6"], filed: `${filed} (a gen-only level from a B6-like stand-in base; read as a delta)`, values: missing.length > 0 ? [`not played: ${missing.join(", ")}`] : values,
        verdict: missing.length > 0 ? "NOT PLAYED" : "REPORTED", note: `the stand-ins' own delta ${STAND_IN_DELTAS[c.id]!}; ${STEP3_DESIGN_ARM} has no stand-in counterpart (critique 4 S4-9)`,
      });
      continue;
    }
    if (c.id === "guard.mix" || c.id === "guard.byClass") {
      const arms = [...new Set(graded.map((g) => g.arm))];
      const missingArms = mapped.filter((id) => !arms.includes(id));
      const breaching = graded.filter((g) => (c.id === "guard.mix" ? g.reading.league.verdict === "BREACH" : g.reading.classes.some((k) => k.reading?.verdict === "BREACH")));
      const zs = graded.map((g) => (c.id === "guard.mix" ? g.reading.league.Z : Math.max(...g.reading.classes.map((k) => (k.reading?.Z ?? Number.NEGATIVE_INFINITY))))).filter((z): z is number => z !== null && Number.isFinite(z));
      const values = breaching.length === 0
        ? [`${String(graded.length)} arm-league readings, none breaching${zs.length === 0 ? "" : ` (largest Z ${sgn(Math.max(...zs))})`}`]
        : breaching.map((g) => `${g.arm} against ${g.base} ${g.league} breaches: ${c.id === "guard.mix" ? `league-wide Z ${sgn(g.reading.league.Z)}` : g.reading.classes.filter((k) => k.reading?.verdict === "BREACH").map((k) => `${k.cls} Z ${sgn(k.reading!.Z)}`).join(", ")}`);
      clauses.push({
        id: c.id, kind: c.kind, arms, filed: `as AM-1's reading under ${guard.entry} (${guard.record}): pooled Z over both seed sets above ${String(c.id === "guard.mix" ? guard.lines.zLeague : guard.lines.zClass)} breaches (filed: rise over the mix-predicted rise ${filed})`,
        values: [...values, ...(missingArms.length === 0 ? [] : [`not played: ${missingArms.join(", ")}`])],
        verdict: arms.length === 0 ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : breaching.length > 0 ? "FAIL" : missingArms.length > 0 ? "REPORTED" : "PASS",
        note: `graded on ${mapped.map((id) => `${id} against ${guard.bases[id]!}`).join(", ")}; the filed reading, e* and the paired SE are printed beside every reading in the guard section`,
      });
      continue;
    }
    if (c.id === "guard.onTheRun.clean" || c.id === "guard.onTheRun.pressured") {
      const part = c.id.endsWith("clean") ? "clean" : "pressured";
      const values = present.filter((x) => !STEP3_BASE_IDS.includes(x.id) || x.id === designBase).flatMap((x) => LEAGUES.map((l) => {
        const r = x.r.report.intGuard[l].onTheRun?.[part];
        return `${where(x)} ${l} ${r === undefined || r.aimed === 0 ? "n/a" : ((100 * r.interceptions) / r.aimed).toFixed(2)} (${String(r?.aimed ?? 0)} aimed)`;
      }));
      clauses.push({ id: c.id, kind: c.kind, arms: [...new Set(present.map((x) => x.id))], filed, values, verdict: present.length === 0 ? "NOT PLAYED" : "REPORTED" });
      continue;
    }
    if (c.kind === "structural") {
      const every = [...new Set(present.map((x) => x.id))];
      const rowOk = STRUCTURAL_GUARD_ROWS[c.id];
      const missingRows = rowOk === undefined ? [] : present.flatMap((x) => LEAGUES.filter((l) => !rowOk(x.r.report.intGuard[l] as IntGuardRows | undefined)).map((l) => `${where(x)} ${l}`));
      clauses.push({
        id: c.id, kind: c.kind, arms: every, filed,
        values: missingRows.length === 0 ? ["printed for every arm on both leagues and both seed sets in the group reports"] : [`not in the records, or not a number: ${missingRows.join(", ")}`],
        verdict: every.length === 0 ? "NOT PLAYED" : rowOk === undefined ? "REPORTED" : missingRows.length > 0 ? "FAIL" : "PASS",
      });
      continue;
    }
    clauses.push({ id: c.id, kind: c.kind, arms: [], filed, values: ["no reading of this clause at step 3"], verdict: "REPORTED" });
  }

  // --- the miss rule on C1 and C2 ---
  const readings: Step3MissReading[] = [];
  const classOf = new Map<string, string>();
  for (const id of STEP3_MISS_ARMS) {
    for (const league of LEAGUES) {
      for (const s of sets) {
        const r = at(id, s);
        if (r === undefined) continue;
        const L = r.s3[league];
        const ms = L.missSplit;
        const rows = STEP3_MISS_ROWS.map((clause) => {
          const v = valueOf(id, s, league, clause);
          const band = clauseById.get(clause);
          return { clause, value: v, passed: v === null || band === undefined ? null : inBand(v, band) };
        });
        const fig = (f: MissSplitFigures): Step3MissReading["byClock"] => ({ n: f.bin20NoFreeRunner, f: f.freeRunnerShareOf20, p: f.pressuredGivenFreeRunner20, quickNoFreeRunner: f.quickNoFreeRunner, quickByCause: f.quickShareByCause });
        const need = [rows[0]!.value, rows[1]!.value, rows[2]!.value, rows[3]!.value, ms.byClock.bin20NoFreeRunner, ms.byClock.freeRunnerShareOf20, ms.byClock.quickNoFreeRunner];
        const earlier = L.part1?.earlier ?? 0;
        let classes: Step3MissReading["classes"] = null;
        let missed: readonly string[] = rows.filter((x) => x.passed === false).map((x) => x.clause);
        let note: string | undefined;
        if (need.some((x) => x === null)) note = "a figure the split needs has no value (an empty population)";
        else {
          const split: MissSplit = {
            grid: "TICK",
            bin20NoFreeRunner: ms.byClock.bin20NoFreeRunner!,
            freeRunnerShareOf20: ms.byClock.freeRunnerShareOf20!,
            quick: rows[1]!.value!,
            quickNoFreeRunner: ms.byClock.quickNoFreeRunner!,
            unblockedPressuresPer100: rows[2]!.value!,
            unblockedShareOfHitOrSack: rows[3]!.value!,
            freeRunnersEarlierThanM8: earlier,
            // Class (iii) cannot fire at step 3: sacks are not a covered row and hit-or-sack is reported (plan §7).
            hitOrSackInBand: false,
            sacksShort: false,
            shareShort: false,
            rows: rows.map((x) => ({ clause: x.clause, value: x.value!, passed: x.passed! })),
          };
          const k = classifyStep3Miss(split);
          classes = k.classes;
          missed = k.missed;
          note = "class (iii), conversion: n/a at step 3 (sacks are not a covered row and hit-or-sack is reported)";
        }
        classOf.set(`${id}|${league}|${String(s)}`, `missed ${missed.join(", ") || "nothing"}; classed ${classes === null ? "not read" : classes.map((x) => x.class).join(", ") || "nothing"}`);
        readings.push({
          arm: id, league, seedSet: s, rows, byClock: fig(ms.byClock), byOrigin: fig(ms.byOrigin), quick: rows[1]!.value, earlier,
          waitLiteral: L.waitLiteral ?? { men: 0, differ: 0, byRow: {} }, classes, missed, ...(note === undefined ? {} : { note }),
        });
      }
    }
  }
  const setsDiffer: string[] = [];
  if (sets.length === 2) {
    for (const id of STEP3_MISS_ARMS) for (const league of LEAGUES) {
      const a = classOf.get(`${id}|${league}|1`);
      const b = classOf.get(`${id}|${league}|2`);
      if (a !== undefined && b !== undefined && a !== b) setsDiffer.push(`${id} ${league}: set 1 ${a}; set 2 ${b} (both named; critique 4 S4-8)`);
    }
  }
  const optionRows = (pricedBy: ArmId): Step3OptionPrice["rows"][number][] =>
    LEAGUES.flatMap((league) => sets.flatMap((s) => (at(pricedBy, s) === undefined ? [] : STEP3_MISS_ROWS.map((clause) => ({ league, seedSet: s, clause, value: valueOf(pricedBy, s, league, clause), against: valueOf(design, s, league, clause) })))));
  const miss: Step3MissSection = {
    readings,
    setsDiffer,
    options: [
      { option: "A", text: MISS_OPTIONS.A, pricedBy: `${STEP3_OPTION_ARMS.A} (the readers' supply-cut stand-in, a band-edge shift, information; built later as its own design with its own petitions)`, rows: optionRows(STEP3_OPTION_ARMS.A) },
      { option: "B", text: MISS_OPTIONS.B, pricedBy: "nothing to play: the miss stays named in the ledger", rows: [] },
      { option: "C", text: MISS_OPTIONS.C, pricedBy: `${STEP3_OPTION_ARMS.C} (reading (c))`, rows: optionRows(STEP3_OPTION_ARMS.C) },
    ],
    neverOffered: [
      ...Object.entries(STEP3_NEVER_OFFERED).map(([id, why]) => `${id}, ${why}`),
      "a late block, a uniform delay or a refit of the free-run constants for a man nobody touched; ADR-090's tables, t_e, w, the references and the creeper's speed (AM-2)",
    ],
  };

  // --- the stand-ins, read as C2 minus B6 ---
  const standIns: Step3StandIn[] = [];
  for (const c of file.bands.clauses) {
    if (STAND_IN_DELTAS[c.id] === undefined) continue;
    for (const league of ["gen", "flat"] as const) for (const s of sets) {
      if (at(STEP3_PRICING_ARM, s) === undefined || at("B6", s) === undefined) continue;
      standIns.push({ clause: c.id, row: STEP3_CLAUSE_ROWS[c.id]!.row, league, seedSet: s, delta: diffOf(valueOf(STEP3_PRICING_ARM, s, league, c.id), valueOf("B6", s, league, c.id)), standIn: `own delta ${STAND_IN_DELTAS[c.id]!}`, filed: bandText(c) });
    }
  }

  // --- the alone arms ---
  const alone: Step3AloneRow[] = [];
  for (const id of STEP3_ALONE_ARMS) {
    if (!bothPresent(id, "B3")) continue;
    for (const league of LEAGUES) {
      const pairs = sets.flatMap((s) => (at(id, s) === undefined || at("B3", s) === undefined ? [] : [{ arm: at(id, s)!.s3[league].freeRunnerEta, base: at("B3", s)!.s3[league].freeRunnerEta }]));
      const g = pairedEtaGap(pairs);
      alone.push({ arm: id, role: armById(id).role, league, ...g, resolved: g.gap !== null && g.se !== null && g.se > 0 && Math.abs(g.gap) >= 2 * g.se });
    }
  }

  // --- the comparisons ---
  const comparison = (arm: ArmId, against: ArmId, league: League, s: SeedSet, label?: string): Step2Comparison[] =>
    at(arm, s) === undefined || at(against, s) === undefined
      ? []
      : [{ arm, against, league, seedSet: s, figures: figuresOf(at(arm, s), league), againstFigures: figuresOf(at(against, s), league), timeToThrow: ttt(arm, s, league), againstTimeToThrow: ttt(against, s, league), ...(label === undefined ? {} : { label }) }];
  const each = <T>(f: (league: League, s: SeedSet) => T[]): T[] => LEAGUES.flatMap((l) => sets.flatMap((s) => f(l, s)));
  const headline = each((l, s) => [...comparison(design, designBase, l, s, "the design"), ...comparison(STEP3_PRICING_ARM, armById(STEP3_PRICING_ARM).base!, l, s, "pricing arm, never a design value")]);
  const information = each((l, s) => STEP3_PLAYABLE.filter((id) => id !== design && id !== STEP3_PRICING_ARM).flatMap((id) => comparison(id, armById(id).base!, l, s, armById(id).role)));

  // --- each arm ---
  const arms: Step3ArmCounts[] = [];
  for (const id of STEP3_PLAYABLE_RUN_IDS) {
    if (!sets.some((s) => at(id, s) !== undefined)) continue;
    for (const league of LEAGUES) {
      const bySet: Step3ArmSetCounts[] = sets.flatMap((s) => {
        const r = at(id, s);
        if (r === undefined) return [];
        const m = r.measures[league];
        const L = r.s3[league];
        const aff = r.affected;
        return [{
          seedSet: s, dropbacks: m.dropbacks, timeToThrow: m.timeToThrow,
          ...(aff === undefined ? {} : { affected: { against: aff.against, byMechanism: aff[league].byMechanism as Record<string, number>, union: aff[league].union, dropbacks: aff[league].dropbacks } }),
          census: L.census === null ? null : (sanitize(L.census) as Record<string, unknown>),
          s1Problems: s1Problems(r.s1[league]).length,
          s2Problems: s2Problems(s2Of(r, league)),
          s3Problems: L.lateBlock === null || L.census === null ? [] : s3Problems({ lateBlock: L.lateBlock, census: L.census }),
        }];
      });
      arms.push({ arm: labelOf(id), role: STEP3_BASE_IDS.includes(id) ? "re-played base" : armById(id).role, league, bySet });
    }
  }

  // --- the outcome ---
  const structuralFailures = [
    ...proofs.filter((p) => p.kind === "structural" && p.verdict === "FAIL").map((p) => `${p.id}: ${p.detail}`),
    ...clauses.filter((c) => c.kind === "structural" && c.verdict === "FAIL" && STRUCTURAL_GUARD_ROWS[c.id] !== undefined).map((c) => `${c.id}: ${c.values.join("; ")}`),
  ];
  const foldFaults = proofs.filter((p) => p.kind === "fold" && p.verdict === "FAIL").map((p) => `${p.id}: ${p.detail}`);
  const gradedFailures = clauses.filter((c) => c.kind === "graded" && c.verdict === "FAIL" && !c.id.startsWith("guard.")).map((c) => `${c.id} (${c.filed}): ${c.values.join("; ")}`);
  const breachRows = oneSet === undefined ? graded.filter((g) => g.reading.breaches.length > 0) : [];
  const guardBreaches = breachRows.map((g) => `${g.arm} against ${g.base}, ${g.league}: ${g.reading.breaches.map((b) => (b === "league-wide" ? `league-wide Z ${sgn(g.reading.league.Z)}` : `${b} Z ${sgn(g.reading.classes.find((k) => k.cls === b)?.reading?.Z ?? null)}`)).join(", ")}`);
  const missingTargets = STEP3_PLAYABLE_RUN_IDS.flatMap((id) => SEED_SETS.filter((s) => at(id, s) === undefined).map((s) => `${id}.set${String(s)}`));
  const cutRecords = present.filter((x) => cut(x.r)).map(where);
  const complete = oneSet === undefined && missingTargets.length === 0 && cutRecords.length === 0;
  const unproved = proofs.filter((p) => p.kind === "structural" && p.verdict !== "PASS" && p.verdict !== "FAIL" && p.verdict !== "NOT JUDGED").map((p) => `${p.id} ${p.verdict}`);
  const next: string[] = [];
  if (guardBreaches.length > 0) {
    next.push(
      `${guard.entry} breaches: the step stops (ADR-089:1306; D9). The arms have finished playing; nothing merges and step 4 does not start. The owner gets both seed sets' numbers, the AM-1 and the filed readings with e* and the paired SE, ` +
        "the cumulative line and the accepted state, the INT-source mix, the class rows and the declared composition print; nothing is re-run to try again",
    );
  }
  if (structuralFailures.length > 0) next.push("a structural failure is a build fault (R-3): it is fixed before the owner sees anything, and never put to a merge card");
  if (foldFaults.length > 0) next.push("fix the fold: the clauses it feeds print NOT JUDGED until then, and the step cannot close");
  if (oneSet !== undefined) next.push(`this run played seed set ${String(oneSet)} only: it is reported, never graded; the step's verdict needs both seed sets (pocket -- --step 3)`);
  else if (missingTargets.length > 0) next.push(`not every target of the step is in this run (missing ${missingTargets.join(", ")}): the merge card waits for the full run`);
  if (cutRecords.length > 0) next.push(`this run is on a cut corpus (tests only; ${String(cutRecords.length)} arm-sets): the merge card waits for the full corpora`);
  if (unproved.length > 0) next.push(`structural proofs that did not pass: ${unproved.join(", ")}; the merge card waits for every one to PASS`);
  if (gradedFailures.length > 0) next.push("each miss is classed by the miss rule on C1 and C2, on each seed set, and goes to the owner with options A (priced by C15), B and C (priced by C11); no band moves, nothing is tuned to pass or re-run to try again (one pass of the options per step)");
  if (unresolved.length > 0) next.push(`not resolved by two seed sets: ${unresolved.join(", ")}; the grade stays set 1's, and both sets go to the owner`);
  const outcome: Step2Outcome = {
    structuralFailures, foldFaults, gradedFailures, guardBreaches,
    mergeCard: complete && proofs.every((p) => p.kind !== "structural" || p.verdict === "PASS") && structuralFailures.length === 0 && foldFaults.length === 0 && guardBreaches.length === 0,
    next,
  };

  // --- the group reports, one per base and seed set ---
  const groups: { seedSet: SeedSet; input: StepReportInput }[] = [];
  for (const s of sets) {
    for (const g of step3Groups()) {
      const base = at(g.base, s);
      if (base === undefined) continue;
      const { affectedPlays: _drop, ...baseReport } = base.report;
      void _drop;
      const reports: ArmReport[] = [{ ...baseReport, arm: labelOf(g.base), isBase: true }];
      for (const id of g.arms) {
        const r = at(id, s);
        if (r !== undefined) reports.push({ ...r.report, arm: labelOf(id), isBase: false });
      }
      groups.push({ seedSet: s, input: { step: "3", pr33: PR33_STATE, arms: reports, filedGuardSuperseded: `${guard.entry} (${guard.record})` } });
    }
  }

  return {
    sections: {
      pr33: PR33_STATE,
      ...(oneSet === undefined ? {} : { oneSet }),
      amendments: { digest: guard.digest, entry: guard.entry, record: guard.record, zLeague: guard.lines.zLeague, zClass: guard.lines.zClass, zSetSE0: guard.lines.zSetSE0, am2: guard.am2 },
      notPlayable: STEP3_ARM_IDS.flatMap((id) => (armRefusal(id) === undefined ? [] : [{ arm: id, reason: armRefusal(id)! }])),
      headline, clauses,
      part1: part1SectionOf(file, at, STEP3_PART1_IDS, sets),
      m5, miss, standIns, alone, information, guard: guardRows, composition, proofs, arms, outcome,
    },
    groups,
  };
}

/** The step report as Markdown: the step-3 sections, then `renderStepReport` once per base group and seed set. */
export function renderStep3Report(grade: Step3Grade, records: Step3Records): string {
  const stamps = [...records.values()].flatMap((bySet) => SEED_SETS.flatMap((s) => (bySet[s] === undefined ? [] : [bySet[s]!.stamp])));
  const commits = [...new Set(stamps.map((s) => `${s.commit}${s.dirty ? " (dirty)" : ""}`))].sort();
  const first = stamps[0];
  const s = grade.sections;
  const lines: string[] = [];
  lines.push(`# ADR-089 step 3: the arms${s.oneSet === undefined ? "" : `, seed set ${String(s.oneSet)} only (reported, never graded)`}`);
  lines.push("");
  lines.push(
    "Rushers nobody blocked run on their own clock from the snap picture, touched men take the late block, and the climb lane reads no FRONT threat: built behind the rules name pocket-1.s3, which nothing plays by default; these arms turn it on for measurement only. " +
      "The step-3 clauses are graded on C1 (set 1, set 2 beside), part 1 and its checks are structural, and the guard is read under AM-1's reading as AM-3 maps it, on both seed sets.",
  );
  lines.push("");
  lines.push(`- filing: ${first?.filedDigest ?? STEP0_FILED_DIGEST}; amendments at step 3: ${s.amendments.digest} (${s.amendments.am2}; the guard ${s.amendments.entry}, ${s.amendments.record})`);
  lines.push(`- fingerprint (every package's source, the lockfile, the manifests and the filing): ${first?.fingerprint ?? "n/a"}`);
  lines.push(`- commit: ${commits.join(", ")} (read from the repository's files; a change staged and not committed is not seen)`);
  const all = [...records.values()].flatMap((bySet) => SEED_SETS.flatMap((x) => (bySet[x] === undefined ? [] : [bySet[x]!])));
  const played = (l: League): string => [...new Set(all.map((r) => r.measures[l].games))].sort((a, b) => a - b).join(" or ") || "n/a";
  lines.push(`- node: ${first?.node ?? "n/a"}; caller ${STEP1_CALLER}; corpora played: flat ${played("flat")} games, gen ${played("gen")} games an arm-set (the full corpora are flat 496 and gen 272 on each seed set)${first !== undefined && (first.corpus.flatFirst !== null || first.corpus.genThroughWeek !== null) ? ` (CUT: flat first ${String(first.corpus.flatFirst)}, gen through week ${String(first.corpus.genThroughWeek)}; tests only)` : ""}`);
  lines.push(`- arms: ${[...records.keys()].map((id) => `${id} (sets ${SEED_SETS.filter((x) => records.get(id)?.[x] !== undefined).join(", ")}; ${(SEED_SETS.map((x) => records.get(id)?.[x]).find((r) => r !== undefined)?.stamp.overlayDigest) ?? (SEED_SETS.map((x) => records.get(id)?.[x]).find((r) => r !== undefined)?.stamp.rules ?? "?")})`).join(", ")}`);
  lines.push(`- PR #33: ${PR33_STATE}, so P2S prints against both 22.02 and 15.46`);
  lines.push("");
  lines.push(...renderStep3Sections(s));
  lines.push("## The step reports, one per base group and seed set");
  for (const g of grade.groups) {
    lines.push("");
    lines.push(`### ${g.input.arms.find((a) => a.isBase)?.arm ?? "?"}${g.input.arms.length > 1 ? ` with ${g.input.arms.filter((a) => !a.isBase).map((a) => a.arm.split(" ")[0]).join(", ")}` : " alone"}, seed set ${String(g.seedSet)}`);
    lines.push("");
    lines.push("```text");
    lines.push(...renderStepReport(g.input));
    lines.push("```");
  }
  return `${lines.join("\n")}\n`;
}

/** The measures file (`--out` on a graded run): every target's record, the grade and the group inputs. */
export function step3MeasuresOf(records: Step3Records, grade: Step3Grade, guard: Step3Guard, fingerprint: string, targets: readonly Step3Target[], oneSet?: SeedSet): JsonValue {
  return sanitize({
    format: STEP3_MEASURES_FORMAT,
    filedDigest: STEP0_FILED_DIGEST,
    amendments: guard.digest,
    fingerprint,
    ...(oneSet === undefined ? {} : { oneSet }),
    arms: Object.fromEntries(targets.map((t) => [targetName(t), records.get(t.id)![t.seedSet]!])),
    grade: grade.sections,
    groups: grade.groups,
  });
}

// --- the run -----------------------------------------------------------------------------------------------

export interface Step3Options {
  readonly arms?: readonly ArmId[];
  readonly shard?: { readonly index: number; readonly count: number };
  /** The cache's parent; the fingerprint is appended. */
  readonly cacheParent: string;
  readonly seedSet?: SeedSet;
  readonly report?: string;
  readonly out?: string;
  readonly filedPath: string;
  readonly amendmentsPath: string;
  /** Tests only: the whole-file pin the amendments file must equal (default `AMENDMENTS_DIGEST`). */
  readonly amendmentsPin?: string;
  readonly env: Step1Env;
  /** A report or measures file under this directory is a committed report (refused from a dirty tree). */
  readonly committedDir?: string;
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** Tests only: plays an arm (default `playStep3Arm`). */
  readonly play?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep3Options) => Step3Record;
  /** Step 2's records the re-played bases are checked against (default `loadStep2References`). */
  readonly references?: Step2References;
}

export interface Step3RunResult {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly remaining: readonly string[];
  readonly graded: boolean;
  readonly wrote: readonly string[];
  readonly grade?: Step3Grade;
}

function readStep3Record(path: string): Step3Record {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Step3Record;
  if (parsed.format !== STEP3_ARM_FORMAT) throw new Error(`${path}: not a step-3 arm record (format ${String((parsed as { format?: unknown }).format)})`);
  return parsed;
}

/** The cached record's stamp problems against this build's, the amendments digest named first. */
function cachedStampProblems(record: Step3Record, want: Step3Stamp): readonly string[] {
  const amend = record.stamp?.amendments;
  const lead = amend !== want.amendments ? [`stamped with amendments ${String(amend)}, not this build's step-3 view ${want.amendments}`] : [];
  return [...lead, ...stampProblems(record.stamp, want).filter((p) => !p.startsWith("amendments:"))];
}

function playTargets(targets: readonly Step3Target[], cacheDir: string, opts: Step3Options, amendments: string, corpus: Step1Corpus, log: (line: string) => void): { played: string[]; cached: string[] } {
  const play = opts.play ?? playStep3Arm;
  const played: string[] = [];
  const cached: string[] = [];
  for (const t of targets) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const want = step3StampOf(t.id, t.seedSet, opts.env, amendments, corpus);
    if (existsSync(path)) {
      const problems = cachedStampProblems(readStep3Record(path), want);
      if (problems.length > 0) throw new Error(`ADR-089 step 3: the cached ${t.id} (set ${String(t.seedSet)}) at ${path} is not this build's arm: ${problems.join("; ")}. Delete it, or use another --cache`);
      cached.push(targetName(t));
      log(`pocket step 3: ${targetName(t)} is cached`);
      continue;
    }
    log(`pocket step 3: playing ${targetName(t)}`);
    writeAtomic(path, jsonText(play(t.id, t.seedSet, opts.env, { corpus, log, amendments })));
    played.push(targetName(t));
    log(`pocket step 3: ${targetName(t)} played`);
  }
  return { played, cached };
}

function readTargets(targets: readonly Step3Target[], cacheDir: string, opts: Step3Options, amendments: string, corpus: Step1Corpus, committed: boolean): Map<ArmId, Partial<Record<SeedSet, Step3Record>>> {
  const records = new Map<ArmId, Partial<Record<SeedSet, Step3Record>>>();
  for (const t of targets) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const record = readStep3Record(path);
    const problems = cachedStampProblems(record, step3StampOf(t.id, t.seedSet, opts.env, amendments, corpus));
    if (problems.length > 0) throw new Error(`ADR-089 step 3: refused to grade: the cached ${targetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}`);
    if (committed && record.stamp.dirty) throw new Error(`ADR-089 step 3: refused to grade a committed report: ${targetName(t)} was played on a dirty tree (${record.stamp.commit})`);
    records.set(t.id, { ...(records.get(t.id) ?? {}), [t.seedSet]: record });
  }
  return records;
}

/** Plays this shard's targets, then grades if every target of the step is in the cache. Refused, before anything plays, while AM-3 is not filed. */
export function runStep3(opts: Step3Options): Step3RunResult {
  const log = opts.log ?? ((): void => undefined);
  const { file, guard } = preflightStep3(opts.filedPath, opts.amendmentsPath, opts.amendmentsPin);
  const plan = planStep3({ ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.shard === undefined ? {} : { shard: opts.shard }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const committed = opts.committedDir !== undefined && [opts.report, opts.out].some((p) => p !== undefined && isUnder(p, opts.committedDir!));
  if (committed && opts.env.dirty) throw new Error("ADR-089 step 3: a committed report (under reports/) is made from a clean tree, and this tree is dirty: commit first, or write the report elsewhere");
  const cacheDir = join(opts.cacheParent, opts.env.fingerprint);
  mkdirSync(cacheDir, { recursive: true });
  log(`pocket step 3: fingerprint ${opts.env.fingerprint}; amendments at step 3 ${guard.digest} (${guard.am2}; the guard ${guard.entry}); arms cached in ${cacheDir}`);
  const { played, cached } = playTargets(plan.mine, cacheDir, opts, guard.digest, corpus, log);
  const remaining = plan.complete.filter((t) => !existsSync(armFileOf(cacheDir, t.id, t.seedSet))).map(targetName);
  const wrote: string[] = [];
  const recordsOut = opts.arms !== undefined && opts.arms.length === 1 ? opts.out : undefined;
  if (recordsOut !== undefined) {
    const own = plan.targets.filter((t) => existsSync(armFileOf(cacheDir, t.id, t.seedSet)));
    const body = { format: STEP3_RECORDS_FORMAT, amendments: guard.digest, fingerprint: opts.env.fingerprint, records: Object.fromEntries(own.map((t) => [targetName(t), JSON.parse(readFileSync(armFileOf(cacheDir, t.id, t.seedSet), "utf8")) as unknown])) };
    writeAtomic(recordsOut, jsonText(body));
    wrote.push(recordsOut);
    log(`pocket step 3: wrote ${own.map(targetName).join(", ")} to ${recordsOut}`);
  }
  if (remaining.length > 0) {
    log(`pocket step 3: ${String(remaining.length)} target(s) still to play (${remaining.join(", ")}); the report is written once every target is in the cache`);
    return { cacheDir, played, cached, remaining, graded: false, wrote };
  }
  const records = readTargets(plan.complete, cacheDir, opts, guard.digest, corpus, committed);
  const grade = gradeStep3(records, file, guard, opts.references ?? loadStep2References(), plan.oneSet);
  if (opts.report !== undefined) {
    writeAtomic(opts.report, renderStep3Report(grade, records));
    wrote.push(opts.report);
  }
  if (opts.out !== undefined && recordsOut === undefined) {
    writeAtomic(opts.out, jsonText(step3MeasuresOf(records, grade, guard, opts.env.fingerprint, plan.complete, plan.oneSet)));
    wrote.push(opts.out);
  }
  log(`pocket step 3: graded ${String(plan.complete.length)} arm-sets${wrote.length === 0 ? "" : `; wrote ${wrote.join(", ")}`}`);
  return { cacheDir, played, cached, remaining, graded: true, wrote, grade };
}

export interface Step3Part1Result {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly part1: Step3Part1Section;
  readonly m5: Step3M5Section | null;
  /** Every build fault part 1, the touched men's check, the late block, the monotone check (C1, C2) or the mirror found; empty when none. */
  readonly problems: readonly string[];
}

/**
 * `--part1` (a preview under AM-2's previews rule; AM-3 is not needed): plays or reads the asked
 * `pocket-1.s3` arms (default every playable one) on the asked sets, and returns part 1's section,
 * M5 on C1 when C1 is asked, and every build fault found. Nothing in it is graded.
 */
export function runStep3Part1(opts: Omit<Step3Options, "shard" | "report" | "out" | "committedDir" | "references">): Step3Part1Result {
  const log = opts.log ?? ((): void => undefined);
  const v = preflightStep3Previews(opts.filedPath, opts.amendmentsPath, opts.amendmentsPin);
  const notS3 = (opts.arms ?? []).filter((id) => armRefusal(id) === undefined && !STEP3_PART1_IDS.includes(id));
  if (notS3.length > 0) throw new RangeError(`--part1 reads the pocket-1.s3 arms only (${STEP3_PART1_IDS.join(", ")}); ${notS3.join(", ")} ${notS3.length === 1 ? "is" : "are"} not one`);
  const plan = planStep3({ runIds: STEP3_PART1_IDS, ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const cacheDir = join(opts.cacheParent, opts.env.fingerprint);
  mkdirSync(cacheDir, { recursive: true });
  log(`pocket step 3 --part1 (a preview, never graded): fingerprint ${opts.env.fingerprint}; amendments at step 3 ${v.digest} (${v.am2}); arms cached in ${cacheDir}`);
  const { played, cached } = playTargets(plan.targets, cacheDir, opts, v.digest, corpus, log);
  const records = readTargets(plan.targets, cacheDir, opts, v.digest, corpus, false);
  const sets = [...new Set(plan.targets.map((t) => t.seedSet))].sort();
  const ids = [...new Set(plan.targets.map((t) => t.id))];
  const at = (id: ArmId, s: SeedSet): Step3Record | undefined => records.get(id)?.[s];
  const part1 = part1SectionOf(v.file, at, ids, sets);
  const m5 = ids.includes(STEP3_M5_ARM) ? m5SectionOf(at, sets) : null;
  const problems = [
    ...part1.rows.flatMap((r) => [
      ...(r.problemCount > 0 ? [`${r.arm} set ${String(r.seedSet)} ${r.league}: part 1, ${String(r.problemCount)} failure(s), first: ${r.problems[0] ?? ""}`] : []),
      ...(r.monotoneGraded && r.monotoneProblemCount > 0 ? [`${r.arm} set ${String(r.seedSet)} ${r.league}: monotone, ${String(r.monotoneProblemCount)} failure(s), first: ${r.monotoneProblems[0] ?? ""}`] : []),
      ...(r.lateBlock.problemCount > 0 ? [`${r.arm} set ${String(r.seedSet)} ${r.league}: the late block, ${String(r.lateBlock.problemCount)} failure(s), first: ${r.lateBlock.problems[0] ?? ""}`] : []),
      ...(r.mirror.failed > 0 ? [`${r.arm} set ${String(r.seedSet)} ${r.league}: ${String(r.mirror.failed)} men's mirrored times differ`] : []),
    ]),
    ...(m5 === null ? [] : m5.leagues.flatMap((l) => l.freeRunMirror.filter((f) => !f.exact).map((f) => `${STEP3_M5_ARM} ${l.league} set ${String(f.set)}: the free-run mirror is not exact (${String(f.menDiffering)} of ${String(f.menCompared)} men differ)`))),
  ];
  return { cacheDir, played, cached, part1, m5, problems };
}

// --- R-1: the digests ------------------------------------------------------------------------------------------

export interface Step3DigestFolds {
  readonly games: number;
  readonly events: number;
  /** Folded as the pins fold: the picture stripped (`GOLDEN_STRIP`). */
  readonly canonicalFold: string;
  readonly byteFold: string;
  /** Folded with nothing stripped: the picture held (plan §6.2 R-1). */
  readonly unstrippedCanonicalFold: string;
  readonly unstrippedByteFold: string;
}

export interface Step3DigestsResult {
  readonly format: typeof STEP3_DIGESTS_FORMAT;
  readonly amendments: string;
  readonly node: string;
  readonly caller: string;
  readonly gamesPerLeague: number;
  readonly arms: Readonly<Record<string, {
    readonly stamp: { readonly arm: ArmId; readonly rules: string; readonly overlayDigest?: string; readonly tunablesDigest: string; readonly patches: readonly string[] };
    readonly leagues: Readonly<Record<string, Step3DigestFolds>>;
  }>>;
}

/** R-1: the golden 50 a league under `STEP3_DIGEST_ARMS` (or the named ones), each folded stripped and unstripped; a preview (AM-3 not needed). */
export function runStep3Digests(opts: { readonly filedPath: string; readonly amendmentsPath: string; readonly amendmentsPin?: string; readonly node: string; readonly first?: number; readonly arms?: readonly ArmId[]; readonly log?: (line: string) => void }): Step3DigestsResult {
  const v = preflightStep3Previews(opts.filedPath, opts.amendmentsPath, opts.amendmentsPin);
  const arms: Record<string, Step3DigestsResult["arms"][string]> = {};
  for (const id of opts.arms ?? STEP3_DIGEST_ARMS) {
    const refusal = armRefusal(id);
    if (refusal !== undefined) throw new RangeError(`${id} is not playable: ${refusal}`);
    const arm = armById(id);
    const leagues: Record<string, Step3DigestFolds> = {};
    for (const league of GOLDEN_LEAGUES) {
      const canonical: string[] = [];
      const bytes: string[] = [];
      const canonicalAll: string[] = [];
      const bytesAll: string[] = [];
      let events = 0;
      goldenGames(league, (o) => {
        canonical.push(gameDigest(o.events));
        bytes.push(gameBytesDigest(o.events));
        canonicalAll.push(gameDigest(o.events, []));
        bytesAll.push(gameBytesDigest(o.events, []));
        events += o.events.length;
      }, { tunables: arm.tunables, callerVersion: STEP1_CALLER, ...(opts.first === undefined ? {} : { first: opts.first }) });
      leagues[league] = { games: canonical.length, events, canonicalFold: foldDigests(canonical), byteFold: foldDigests(bytes), unstrippedCanonicalFold: foldDigests(canonicalAll), unstrippedByteFold: foldDigests(bytesAll) };
      opts.log?.(`pocket step 3 digests: ${id} ${league}, ${String(canonical.length)} games`);
    }
    arms[id] = {
      stamp: { arm: id, rules: arm.rules, ...(arm.overlayDigest === undefined ? {} : { overlayDigest: arm.overlayDigest }), tunablesDigest: arm.tunablesDigest, patches: arm.patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`) },
      leagues,
    };
  }
  return { format: STEP3_DIGESTS_FORMAT, amendments: v.digest, node: opts.node, caller: STEP1_CALLER, gamesPerLeague: opts.first ?? 50, arms };
}

/**
 * R-1's pin check (plan §2.10; critique 3 N7): A1's folds equal S-9's (`POCKET_1_S1_PINS`), A5's and
 * A11's the base pins (`POCKET_1_S1_BASE_PINS`) and B1 to B7's the s2 pins (`POCKET_1_S2_PINS`),
 * with their stamps, on 50 games a league (or the first 10, on a 10-game run), folded as the pins
 * fold (the picture stripped). Empty when they hold, or when the run played neither 50 nor 10.
 */
export function step3DigestPinProblems(d: Step3DigestsResult): readonly string[] {
  const pins: Record<string, S1PinArm> = { A1: POCKET_1_S1_PINS.arms.A1, A5: POCKET_1_S1_BASE_PINS.arms.A5, A11: POCKET_1_S1_BASE_PINS.arms.A11 };
  for (const id of STEP2_ARM_IDS) pins[id] = POCKET_1_S2_PINS.arms[id];
  if (d.gamesPerLeague !== 50 && d.gamesPerLeague !== 10) return [];
  const out: string[] = [];
  for (const [id, pin] of Object.entries(pins)) {
    const got = d.arms[id];
    if (got === undefined) continue;
    if (canonicalise(got.stamp as unknown as JsonValue) !== canonicalise(pin.stamp as unknown as JsonValue)) out.push(`${id}: stamp ${JSON.stringify(got.stamp)}, pinned ${JSON.stringify(pin.stamp)}`);
    for (const league of GOLDEN_LEAGUES) {
      const g = got.leagues[league];
      const p = d.gamesPerLeague === 50 ? pin.leagues[league] : pin.leagues[league].first10;
      if (g === undefined) continue;
      for (const k of ["canonicalFold", "byteFold", "events"] as const) if (g[k] !== p[k]) out.push(`${id} ${league} ${k}: ${String(g[k])}, pinned ${String(p[k])}`);
    }
  }
  return out;
}

// --- the command -----------------------------------------------------------------------------------------

/**
 * The `--report` and `--out` of a step-3 command that would write over a closed step's committed
 * records (step 1's and step 2's, and step 3's once `STEP3_RECORDS_FINAL`), compared on real paths
 * from `cwd`; empty when none does.
 */
export function closedStep3Writes(args: Pick<Step3Args, "report" | "out">, cwd: string, pkgRoot: string = PKG_ROOT, final: boolean = STEP3_RECORDS_FINAL): readonly string[] {
  const closed = new Set([...STEP1_CLOSED_RECORDS, ...STEP2_CLOSED_RECORDS, ...(final ? STEP3_RECORDS : [])].map((r) => realOf(join(pkgRoot, r))));
  return (["report", "out"] as const).flatMap((flag) => {
    const value = args[flag];
    return value !== undefined && closed.has(realOf(resolve(cwd, value))) ? [`--${flag} ${value}`] : [];
  });
}

export async function step3Command(args: Step3Args, log: (line: string) => void): Promise<void> {
  const repoRoot = resolve(PKG_ROOT, "..", "..");
  const filedPath = join(PKG_ROOT, FILED_PATH);
  const amendmentsPath = join(PKG_ROOT, AMENDMENTS_PATH);
  const closed = closedStep3Writes(args, process.cwd());
  if (closed.length > 0) {
    throw new Error(`ADR-089 step 3: ${closed.join(" and ")} would write over a closed step's committed records, which are never edited. Write a re-run elsewhere (for example --report /tmp/s3.md --out /tmp/s3.json)`);
  }
  const full = step1Env(repoRoot, filedPath);
  const env: Step1Env = { fingerprint: full.fingerprint, commit: full.commit, dirty: full.dirty, node: full.node };
  log(`pocket step 3: fingerprint ${env.fingerprint}; commit ${env.commit}${env.dirty ? ` (dirty: ${full.reason ?? "?"})` : ""}; node ${env.node}`);
  if (args.digests === true) {
    const out = args.out;
    if (out === undefined) throw new SyntaxError("--digests writes its folds to --out <file>");
    const result = runStep3Digests({ filedPath, amendmentsPath, node: process.version, log });
    writeAtomic(out, jsonText(result));
    log(`pocket step 3: wrote the digests to ${out}`);
    const problems = step3DigestPinProblems(result);
    if (problems.length > 0) throw new Error(`ADR-089 step 3 (R-1): a pin moved: ${problems.join("; ")}`);
    log("pocket step 3: A1's folds equal S-9's pins, A5's and A11's the base pins, and B1 to B7's the s2 pins");
    return;
  }
  const common = {
    ...(args.arms === undefined ? {} : { arms: args.arms }),
    ...(args.seedSet === undefined ? {} : { seedSet: args.seedSet }),
    cacheParent: args.cache ?? join(PKG_ROOT, "data-cache", "pocket-step3"),
    filedPath,
    amendmentsPath,
    env,
    log,
  };
  if (args.part1 === true) {
    const r = runStep3Part1(common);
    process.stdout.write(`${[...renderStep3Part1(r.part1), ...(r.m5 === null ? [] : renderStep3M5(r.m5))].join("\n")}\n`);
    if (r.problems.length > 0) throw new Error(`ADR-089 step 3 --part1: ${String(r.problems.length)} build fault(s) (R-3: fixed before the owner sees anything): ${r.problems.join("; ")}`);
    process.stdout.write("ADR-089 step 3 --part1: no build fault (a preview: nothing here is graded, priced or offered)\n");
    return;
  }
  const result = runStep3({
    ...common,
    ...(args.shard === undefined ? {} : { shard: args.shard }),
    ...(args.report === undefined ? {} : { report: args.report }),
    ...(args.out === undefined ? {} : { out: args.out }),
    committedDir: join(PKG_ROOT, "reports"),
  });
  if (result.graded && result.grade !== undefined) {
    const o = result.grade.sections.outcome;
    process.stdout.write(
      `ADR-089 step 3: ${String(o.structuralFailures.length)} structural failure(s), ${String(o.foldFaults.length)} fold fault(s), ${String(o.gradedFailures.length)} graded clause failure(s) (misses under the miss rule), ` +
        `${String(o.guardBreaches.length)} guard breach(es); merge card ${o.mergeCard ? "may be posted" : "not to be posted"}\n`,
    );
    for (const line of [...o.structuralFailures, ...o.foldFaults, ...o.guardBreaches, ...o.gradedFailures, ...o.next]) process.stdout.write(`  ${line}\n`);
  }
}
