/**
 * `pnpm --filter @ff/calibration pocket -- --step 6 [--shard i/3] --report reports/adr-089-step6.md --out reports/adr-089-step6.json`
 * `pnpm --filter @ff/calibration pocket -- --step 6 --fresh-base <set> --out <file>`
 * `pnpm --filter @ff/calibration pocket -- --step 6 --digests --out <file>`
 *
 * ADR-089 STEP 6: THE GATE (step-6 plan §10.3; K0, plan §3.1 item 5) AND THE HARNESS (plan §3.2, K2;
 * §5 to §8): the step-6 arms (H0 to H15, H2L and H0M on the league, HB0 to HB2L and the funnel's HF1
 * to HF5 on the clean bench) and D1, F5 and E9, each on both leagues and both seed sets, graded
 * against the step-0 filing as AM-12 maps the guard and AM-13 reads the clauses (`s6Grade.ts`).
 *
 *  - **The gate first**, refusing before anything plays, by a refusal that names every condition it
 *    still waits for. It opens only when all of these hold:
 *     1. step 5a's records are final (`STEP5A_RECORDS_FINAL`) and their outcome
 *        (`reports/adr-089-step5a.json`, a two-set grade) holds no build fault and no AM-8 breach;
 *     2. every graded 5a miss is answered by the owner's words on file: AM-11's `rule.gate.step6`
 *        names the miss (`s5aMiss`) and the time of the owner's words (`answeredAt`), and the gate
 *        reads that, never a flag (step 6 takes no `--after-owner`, `STEP6_AFTER_OWNER_REFUSAL`);
 *     3. the step-6 view of the amendments file (`amendmentsAtStep(file, "6")`) equals
 *        `STEP6_AMENDMENTS_PIN`, its guard (`guardFor(view, "6")`) is AM-12's, and AM-13, step 6's
 *        readings, is filed with the owner's three answers in its `ownersWord.answers` (`filing.md`
 *        §4.3), each one of the options the engine builds behind a leaf (`STEP6_ANSWER_OPTIONS`);
 *     4. the contract petitions step 6 waits on are in contracts: P9 to P12 and P20, and P21 when the
 *        owner answers "unseen" (`step6PetitionsOut`). P20 and P21 are a named addition to the plan's
 *        item 4: contracts-guardian's second reading (`guardian-2.md`) ruled P20 needed and P21
 *        needed only for "unseen";
 *     5. `pocket-1.s6` is recorded (`POCKET_1_S6_DIGEST`).
 *    In this build it always refuses: AM-13 waits on the owner's three answers and typed yeses, no
 *    step-6 petition is in contracts, and `pocket-1.s6` is not recorded. The gate reads the package
 *    and plays nothing; no cache is made, no record is written and no clock is read.
 *  - **The preflight** (`preflightStep6`), once the gate is open: the filing digests to
 *    `STEP0_FILED_DIGEST`; the amendments file loads whole, its step-3, step-4 and step-5a views
 *    unchanged and its step-6 view pinned; AM-12 maps step 6's guard on the S5 class view with every
 *    base this build's arm reads; AM-13 holds the owner's three answers; no choice is left unmade.
 *    Then every step-6 arm is built under those answers (`buildStep6Arms`), all distinct, before
 *    anything plays.
 *  - **Each arm** is step 5's play (`playStep4Arm` through `playStep3Arm`, so every step-1 to step-5
 *    fold runs on every game) with step 6's folds beside (`s6Checks.ts`: the rows, the structural
 *    proofs S-11 to S-20 bound to the arms that carry each part, S-14 on the agreement arms, the
 *    counts, M5's games on H0 and H0M, the stripped digests, the probes' ratings and the movement
 *    cross-check's deadline picks on H0 and HB0). A step-6 arm plays its built tree, its probes'
 *    overrides patched on both leagues' rosters (every fold reads the rosters as played) and its
 *    mirror; D1, F5 and E9 play as step 5 played them. Every record carries AM-11's clock label beside
 *    its stamp.
 *  - **The cache** is `data-cache/pocket-step6/<fingerprint>/<arm>.set<n>.json`, made only from a
 *    clean tree; F5's second fresh play (AM-12 `freshBases`) is `F5.set<n>.fresh.json`, written by a
 *    second process the operator runs when the harness prints its command (`--fresh-base`; library
 *    code never starts a process).
 *  - **R-1** (`--digests`): the golden 50 games a league under the arms R-1 names (`S6_PIN_ARM_IDS`),
 *    with the first-10 folds the suite reads, no cache; R-2's pins (`s6Pins.ts`) are filled from two
 *    processes' byte-identical outputs after the lift.
 *  - **No wall-clock, host or path field** in any record or file, and no clock is read here.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GameSnapshot } from "@ff/engine";
import { canonicalise } from "../harness/digest.js";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, entryOf, guardFor, loadAmendments, STEP3_AMENDMENTS_DIGEST, type AmendmentEntry, type AmendmentsFile } from "./amendments.js";
import { armById, isAnyArmId, isStep6ArmId, step5ArmDef, step6ArmDef, step6ArmsWith, STEP6_RUN_IDS, type ArmId, type Step6Arm, type Step6ArmId } from "./arms.js";
import { FILED_PATH } from "./bands.js";
import { goldenGames, type SeedSet } from "./corpus.js";
import { filedDigest, STEP0_FILED_DIGEST, type FiledFile, type JsonValue } from "./filed.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES } from "./golden.js";
import { guardWithView, SEED_SETS } from "./guardAm1.js";
import { playersOfSnapshot } from "./m6Contact.js";
import type { League } from "./report.js";
import { CAUGHT_SEEN, POCKET_1_S5A_DIGEST, POCKET_1_S6_DIGEST, readsStep3Facts, SCRAMBLE_STARTS, SPENT_CHECKLISTS, step6PetitionsUnder, type OutsOptions, type StampPetitions, type Step6Petition, type Step6Petitions } from "./rules.js";
import { s2ContextOf } from "./s2Stream.js";
import { s5DropbacksOf } from "./s5Stream.js";
import { emptyStep6LeagueFolds, finishStep6League, foldRatingsGame, foldStep6Game, thirdsOf, type Step6LeagueFolds } from "./s6Checks.js";
import {
  gradeStep6,
  renderStep6Report,
  S6_AGREE_ARMS,
  S6_CROSS_CHECK_ARMS,
  S6_DIGEST_ARMS,
  S6_M5_ARMS,
  step6SummaryLines,
  STEP6_ARM_FORMAT,
  STEP6_CLOCK_LABEL,
  STEP6_DIGESTS_FORMAT,
  STEP6_MEASURES_FORMAT,
  type Step6Grade,
  type Step6Guard,
  type Step6Record,
  type Step6RecordRecipe,
  type Step6RecordsBySet,
} from "./s6Grade.js";
import { S6_PIN_ARM_IDS, type S6PinArmId, type S6PinStamp } from "./s6Pins.js";
import type { ThirdOf } from "./s6Rows.js";
import { AFTER_OWNER_FORM, openFiling, PR33_STATE, sanitize, type Step6Args } from "./step0.js";
import { armFileOf, FULL_CORPUS, isUnder, jsonText, realOf, STEP1_CALLER, step1Env, stampProblems, writeAtomic, type Step1Corpus, type Step1Env } from "./step1.js";
import { step3StampOf, unmadeChoicesOf, type Step3Stamp } from "./step3.js";
import { playStep4Arm, STEP4_AMENDMENTS_PIN, type PlayStep4Options, type Step4Record } from "./step4.js";
import {
  closedStep5Writes,
  emptyStep5LeagueFolds,
  foldStep5Game,
  loadStep4References,
  s5aRecordProblemOf,
  STEP5A_AMENDMENTS_PIN,
  STEP5A_RECORDS,
  STEP5A_RECORDS_FINAL,
  STEP5B_RECORDS_FINAL,
  step5FoldsOf,
  type Step5LeagueFolds,
} from "./step5.js";
import type { ThrowClassifier } from "./throwClass.js";

const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * The step-6 view of the amendments file, pinned once AM-13, step 6's readings, is filed (step-6 plan
 * §4.2: then the whole file, AM-1 to AM-13). Unset (null) until then, and the gate refuses while it is.
 */
export const STEP6_AMENDMENTS_PIN: string | null = null;

/** The entries the gate reads: AM-11 files the owner's words on the 5a miss (`rule.gate.step6`), AM-12 is step 6's guard, AM-13 step 6's readings with the owner's answers. */
export const STEP6_GATE_ENTRY = "AM-11";
export const STEP6_GUARD_ENTRY = "AM-12";
export const STEP6_READINGS_ENTRY = "AM-13";

/**
 * The owner's three answers AM-13 files in `ownersWord.answers` (`filing.md` §4.3 and §4.4; plan
 * §4.3), each with every option the engine builds behind a leaf: the spent checklist
 * (`pocket.outs.escapeCap.whenSpent`), the scramble start (`pocket.outs.scrambleStart`) and `seen` on
 * a catch by a man still in his block (`pocket.outs.caughtSeen`). The gate takes any one option of
 * each, so no answer is privileged, and refuses a value outside these lists. Since K1 the lists are
 * `rules.ts`'s closed sets of the block's leaves (`SPENT_CHECKLISTS`, `SCRAMBLE_STARTS`,
 * `CAUGHT_SEEN`), so the gate's options and the bundles' options are one list each; the check below
 * stops compiling if the answers and the bundles' `OutsOptions` ever differ.
 */
export const STEP6_ANSWER_OPTIONS = Object.freeze({
  spentChecklist: SPENT_CHECKLISTS,
  scrambleStart: SCRAMBLE_STARTS,
  seen: CAUGHT_SEEN,
});

export type Step6Question = keyof typeof STEP6_ANSWER_OPTIONS;
export type Step6Answers = { readonly [Q in Step6Question]: (typeof STEP6_ANSWER_OPTIONS)[Q][number] };

/** The owner's answers are the bundles' options, key for key and value for value (compile-time). */
const _answersAreOutsOptions: Step6Answers = {} as OutsOptions;
const _outsOptionsAreAnswers: OutsOptions = {} as Step6Answers;
void _answersAreOutsOptions;
void _outsOptionsAreAnswers;

const STEP6_QUESTIONS = Object.keys(STEP6_ANSWER_OPTIONS) as readonly Step6Question[];

/** The `seen` answer that needs petition P21 (`petitions.md` §9; `guardian-2.md`). */
export const STEP6_UNSEEN_ANSWER: Step6Answers["seen"] = "UNSEEN_IF_UNREGISTERED";

/**
 * Why AM-13's `ownersWord.answers` does not hold the owner's three answers, or undefined when it
 * holds one option of `STEP6_ANSWER_OPTIONS` for each question (and nothing else).
 */
export function step6AnswersProblem(answers: unknown): string | undefined {
  const asked = STEP6_QUESTIONS.join(", ");
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return `${STEP6_READINGS_ENTRY}'s ownersWord holds no answers (${asked})`;
  const a = answers as Record<string, unknown>;
  const extra = Object.keys(a).filter((k) => !(STEP6_QUESTIONS as readonly string[]).includes(k));
  if (extra.length > 0) return `${STEP6_READINGS_ENTRY}'s ownersWord.answers names ${extra.join(", ")}, which no question asks (${asked})`;
  for (const q of STEP6_QUESTIONS) {
    const options = STEP6_ANSWER_OPTIONS[q] as readonly string[];
    if (!options.includes(a[q] as string)) return `${STEP6_READINGS_ENTRY}'s ownersWord.answers.${q} is ${JSON.stringify(a[q] ?? null)}, not one of ${options.join(", ")}`;
  }
  return undefined;
}

/**
 * The contract petitions step 6's arms wait on (step-6 plan §1.2, §10.3 item 4; `petitions.md`;
 * `guardian-2.md`): P9 (the out-of-pocket throwaway cause and its `rollRef`), P10 (`outsideTackleBox`),
 * P11 (the direction on the decision), P12 (the drill's CHECK kind) and P20 (`QB_HIT.contactSeconds`
 * on a caught escape). P21 (`QB_HIT.seen` on a catch from a block) is needed only when the owner
 * answers "unseen".
 */
export const STEP6_PETITIONS = Object.freeze(["P9", "P10", "P11", "P12", "P20"] as const satisfies readonly Step6Petition[]);
export const STEP6_UNSEEN_PETITION = "P21" as const satisfies Step6Petition;

/**
 * The step-6 petitions not yet in contracts, given the owner's `seen` answer when there is one, in
 * `STEP6_PETITIONS`' order with P21 last. It reads calibration's restated flags (`rules.ts`:
 * `P9_IN_CONTRACTS` to `P12_IN_CONTRACTS`, `P20_IN_CONTRACTS` and `P21_IN_CONTRACTS`, tied to the
 * engine's by a test), through `step6PetitionsUnder`. None is in contracts in this build: each waits
 * on the owner's typed yes and its contracts commit, then the lift, which sets the engine's flags and
 * these together (plan §10.1 items 3 to 6). `petitions` is a test's own set (default: the flags).
 */
export function step6PetitionsOut(seen?: unknown, petitions: Step6Petitions = {}): readonly Step6Petition[] {
  const under = step6PetitionsUnder(petitions);
  const needed: readonly Step6Petition[] = [...STEP6_PETITIONS, ...(seen === STEP6_UNSEEN_ANSWER ? [STEP6_UNSEEN_PETITION] : [])];
  return needed.filter((name) => !under[name]);
}

/** What step 6's gate reads (plan §10.3), from the package. */
export interface Step6GateState {
  /** `STEP5A_RECORDS_FINAL`. */
  readonly s5aFinal: boolean;
  /** The committed 5a records' outcome, when they are 5a's two-set grade. */
  readonly s5aOutcome?: { readonly faults: readonly string[]; readonly breaches: readonly string[]; readonly misses: readonly string[] };
  /** Why the committed 5a records cannot open step 6 (missing, another half's, one seed set's, a malformed outcome), when so. */
  readonly s5aRecordProblem?: string;
  /** Why the amendments file cannot be read (it does not load or does not validate), when so. */
  readonly amendmentsProblem?: string;
  /** The step-6 view's digest, when the file loads. */
  readonly viewDigest?: string;
  /** `STEP6_AMENDMENTS_PIN`. */
  readonly viewPin: string | null;
  /** AM-11's `rule.gate.step6` in the step-6 view, as filed, when AM-11 is in the view. */
  readonly ownersAnswer?: { readonly s5aMiss: unknown; readonly answeredAt: unknown };
  /** The entry that maps step 6's guard (`guardFor(view, "6")`), when one does. */
  readonly guard?: string;
  /** AM-13's `ownersWord.answers` in the step-6 view, as filed, when AM-13 is in the view. */
  readonly readings?: { readonly answers: unknown };
  /** The step-6 petitions not yet in contracts (`step6PetitionsOut`). */
  readonly petitionsOut: readonly string[];
  /** `POCKET_1_S6_DIGEST`. */
  readonly s6Digest: string | undefined;
}

const recordOf = (v: unknown): Record<string, unknown> | undefined => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

/** The step-6 view's facts the gate reads: AM-11's answer on the 5a miss, the guard's entry, AM-13's answers. */
export function step6ViewFacts(view: AmendmentsFile): Pick<Step6GateState, "ownersAnswer" | "guard" | "readings"> {
  const am11 = view.entries.find((e) => e.id === STEP6_GATE_ENTRY);
  const gate = recordOf(recordOf(am11?.rule["gate"])?.["step6"]);
  let guard: string | undefined;
  try {
    guard = guardFor(view, "6").entry.id;
  } catch {
    guard = undefined;
  }
  const am13 = view.entries.find((e) => e.id === STEP6_READINGS_ENTRY);
  return {
    ...(am11 === undefined ? {} : { ownersAnswer: { s5aMiss: gate?.["s5aMiss"], answeredAt: gate?.["answeredAt"] } }),
    ...(guard === undefined ? {} : { guard }),
    ...(am13 === undefined ? {} : { readings: { answers: recordOf(am13.ownersWord)?.["answers"] } }),
  };
}

/** The gate state of this build, read from the package (nothing plays). */
export function step6GateState(pkgRoot: string = PKG_ROOT): Step6GateState {
  const aPath = join(pkgRoot, STEP5A_RECORDS[1]);
  let s5aOutcome: Step6GateState["s5aOutcome"];
  let s5aRecordProblem: string | undefined;
  if (!existsSync(aPath)) s5aRecordProblem = `the 5a records ${STEP5A_RECORDS[1]} are not committed`;
  else {
    const parsed: unknown = JSON.parse(readFileSync(aPath, "utf8"));
    s5aRecordProblem = s5aRecordProblemOf(parsed, "step 6");
    if (s5aRecordProblem === undefined) s5aOutcome = (parsed as { readonly outcome: NonNullable<Step6GateState["s5aOutcome"]> }).outcome;
  }
  let view: AmendmentsFile | undefined;
  let amendmentsProblem: string | undefined;
  try {
    view = amendmentsAtStep(loadAmendments(join(pkgRoot, AMENDMENTS_PATH), openFiling(join(pkgRoot, FILED_PATH))), "6");
  } catch (e) {
    amendmentsProblem = e instanceof Error ? e.message : String(e);
  }
  const facts = view === undefined ? {} : step6ViewFacts(view);
  return {
    s5aFinal: STEP5A_RECORDS_FINAL,
    ...(s5aOutcome === undefined ? {} : { s5aOutcome }),
    ...(s5aRecordProblem === undefined ? {} : { s5aRecordProblem }),
    ...(amendmentsProblem === undefined ? {} : { amendmentsProblem }),
    ...(view === undefined ? {} : { viewDigest: amendmentsDigest(view) }),
    viewPin: STEP6_AMENDMENTS_PIN,
    ...facts,
    petitionsOut: step6PetitionsOut(recordOf(facts.readings?.answers)?.["seen"]),
    s6Digest: POCKET_1_S6_DIGEST,
  };
}

/** The clause id of a graded miss as the 5a records write it ("s5a.cleanScramble: flat 12.96, ..."). */
const missClauseOf = (miss: string): string => (miss.split(":")[0] ?? miss).trim();

/**
 * Every condition of plan §10.3 the gate still waits for, numbered as the plan numbers them, in order;
 * empty when step 6 may play.
 */
export function step6GateWaits(st: Step6GateState): readonly string[] {
  const waits: string[] = [];
  // 1. The 5a records: final, with no build fault and no AM-8 breach.
  if (st.s5aRecordProblem !== undefined) waits.push(`(1) ${st.s5aRecordProblem}`);
  else if (!st.s5aFinal || st.s5aOutcome === undefined) waits.push("(1) the 5a records are not final (STEP5A_RECORDS_FINAL, reports/adr-089-step5a.json)");
  else {
    const o = st.s5aOutcome;
    if (o.faults.length > 0) waits.push(`(1) the 5a records hold a build fault (${o.faults.join("; ")}); a build fault is fixed, never waived`);
    if (o.breaches.length > 0) waits.push(`(1) the 5a records hold an AM-8 breach (${o.breaches.join("; ")}); it goes to the owner, and step 6 opens only on 5a records with no breach`);
    // 2. Every graded 5a miss answered by the owner's words, filed in AM-11's rule.gate.step6.
    for (const miss of o.misses) {
      const clause = missClauseOf(miss);
      const a = st.ownersAnswer;
      if (a === undefined) waits.push(`(2) the owner's words on the 5a miss ${clause}, filed in ${STEP6_GATE_ENTRY}'s rule.gate.step6 (the step-6 view holds no ${STEP6_GATE_ENTRY})`);
      else if (a.s5aMiss !== clause) waits.push(`(2) the owner's words on the 5a miss ${clause}: ${STEP6_GATE_ENTRY}'s rule.gate.step6 answers ${JSON.stringify(a.s5aMiss ?? null)}, not it`);
      else if (typeof a.answeredAt !== "string" || !AFTER_OWNER_FORM.test(a.answeredAt)) waits.push(`(2) the time of the owner's words on the 5a miss ${clause}: ${STEP6_GATE_ENTRY}'s rule.gate.step6.answeredAt is ${JSON.stringify(a.answeredAt ?? null)}, not an ISO 8601 UTC time`);
    }
  }
  // 3. The step-6 view pinned, AM-12's guard, AM-13 with the owner's three answers.
  if (st.amendmentsProblem !== undefined) waits.push(`(3) an amendments file that loads: ${st.amendmentsProblem}`);
  else {
    if (st.viewPin === null) waits.push(`(3) the step-6 view of the amendments file (${String(st.viewDigest)}) pinned: STEP6_AMENDMENTS_PIN is set when ${STEP6_READINGS_ENTRY}, step 6's readings, is filed`);
    else if (st.viewDigest !== st.viewPin) waits.push(`(3) the step-6 view of the amendments file as pinned: it digests to ${String(st.viewDigest)}, not STEP6_AMENDMENTS_PIN ${st.viewPin}; an amendment is append-only`);
    if (st.guard === undefined) waits.push(`(3) step 6's guard map, filed as ${STEP6_GUARD_ENTRY} (no filed entry maps step 6's guard bases)`);
    else if (st.guard !== STEP6_GUARD_ENTRY) waits.push(`(3) step 6's guard as ${STEP6_GUARD_ENTRY} files it: the view's guard at step 6 is ${st.guard}'s`);
    if (st.readings === undefined) waits.push(`(3) ${STEP6_READINGS_ENTRY}, step 6's readings, filed with the owner's three answers (${STEP6_QUESTIONS.join(", ")}) in its ownersWord`);
    else {
      const problem = step6AnswersProblem(st.readings.answers);
      if (problem !== undefined) waits.push(`(3) the owner's three answers in ${STEP6_READINGS_ENTRY}: ${problem}`);
    }
  }
  // 4. The step-6 petitions in contracts.
  if (st.petitionsOut.length > 0) waits.push(`(4) ${st.petitionsOut.join(", ")} in contracts (each after the owner's typed yes and contracts-guardian's review, then the lift)`);
  // 5. pocket-1.s6 recorded.
  if (st.s6Digest === undefined) waits.push("(5) pocket-1.s6 recorded (POCKET_1_S6_DIGEST is unset)");
  return waits;
}

/** The gate's refusal, or undefined when step 6 may play. */
export function step6GateRefusal(st: Step6GateState): string | undefined {
  const waits = step6GateWaits(st);
  if (waits.length === 0) return undefined;
  return `ADR-089 step 6: refused before anything plays (the gate, plan §10.3): it waits for ${waits.join("; ")}. Nothing has played and no cache was made`;
}


// --- the preflight (once the gate is open) ---------------------------------------------------------------

export interface PreflightStep6Options {
  /** Tests only: the pin the step-6 view must equal (default `STEP6_AMENDMENTS_PIN`). */
  readonly pin?: string | null;
}

export function step6PinRefusal(digest: string, pin: string | null): string {
  return pin === null
    ? `ADR-089 step 6: refused before anything plays: the step-6 view of the amendments file (${digest}) is not pinned (STEP6_AMENDMENTS_PIN is set when ${STEP6_READINGS_ENTRY}, step 6's readings, is filed)`
    : `ADR-089 step 6: refused before anything plays: the step-6 view of the amendments file digests to ${digest}, not the pin ${pin}: an amendment is append-only, and a step's view never changes once its arms have run`;
}

/**
 * Every refusal a step-6 run makes once the gate is open, before anything plays, in order: the
 * filing; the amendments file whole; its step-3, step-4 and step-5a views unchanged; the step-6 view
 * pinned; AM-12 maps step 6's guard on the S5 class view, every arm against the base this build's arm
 * reads; AM-13 filed with the owner's three answers (`step6AnswersProblem`); no choice left unmade.
 */
export function preflightStep6(filedPath: string, amendmentsPath: string, opts: PreflightStep6Options = {}): { readonly file: FiledFile; readonly guard: Step6Guard } {
  const refuse = (why: string): never => {
    throw new Error(`ADR-089 step 6: refused before anything plays: ${why}`);
  };
  const file = openFiling(filedPath);
  const fd = filedDigest(file);
  if (fd !== STEP0_FILED_DIGEST) refuse(`the step-0 filing digests to ${fd}, not ${STEP0_FILED_DIGEST}`);
  if (!existsSync(amendmentsPath)) refuse(`the amendments file ${amendmentsPath} does not exist`);
  let whole: AmendmentsFile;
  try {
    whole = loadAmendments(amendmentsPath, file);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
  for (const [step, want] of [["3", STEP3_AMENDMENTS_DIGEST], ["4", STEP4_AMENDMENTS_PIN], ["5a", STEP5A_AMENDMENTS_PIN]] as const) {
    const got = amendmentsDigest(amendmentsAtStep(whole, step));
    if (got !== want) refuse(`the step-${step} view digests to ${got}, not ${String(want)}`);
  }
  const view = amendmentsAtStep(whole, "6");
  const digest = amendmentsDigest(view);
  const pin = opts.pin === undefined ? STEP6_AMENDMENTS_PIN : opts.pin;
  if (pin === null || digest !== pin) throw new Error(step6PinRefusal(digest, pin));
  let g: ReturnType<typeof guardWithView>;
  try {
    g = guardWithView(view, "6");
  } catch (e) {
    return refuse(`${STEP6_GUARD_ENTRY} (the guard at step 6) is not filed in the view: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (g.entry.id !== STEP6_GUARD_ENTRY) refuse(`step 6's guard is ${g.entry.id}'s, not ${STEP6_GUARD_ENTRY}'s`);
  if (g.rule.classView !== "S5") refuse(`${g.entry.id} maps step 6's guard on the class view ${String(g.rule.classView)}, not S5`);
  const baseOf = (arm: string): ArmId | undefined => step6ArmDef(arm)?.base ?? (isAnyArmId(arm) ? step5ArmDef(arm)?.base : undefined);
  const differ = Object.entries(g.bases).filter(([arm, base]) => baseOf(arm) !== base);
  if (differ.length > 0) refuse(`${g.entry.id}'s step-6 base map reads ${differ.map(([a, b]) => `${a} against ${String(b)}, and this build's arm against ${String(baseOf(a))}`).join("; ")}`);
  let readings: AmendmentEntry;
  try {
    readings = entryOf(view, STEP6_READINGS_ENTRY);
  } catch (e) {
    return refuse(`${STEP6_READINGS_ENTRY} (step 6's readings) is not filed in the view: ${e instanceof Error ? e.message : String(e)}`);
  }
  const answers = recordOf(readings.ownersWord)?.["answers"];
  const problem = step6AnswersProblem(answers);
  if (problem !== undefined) refuse(problem);
  const choices = unmadeChoicesOf(view);
  if (choices.length > 0) refuse(`the view holds a choice not yet made: ${choices.join("; ")}`);
  const a = answers as Step6Answers;
  return {
    file,
    guard: {
      digest,
      view,
      guardEntry: g.entry.id,
      readingsEntry: readings.id,
      rule: g.rule,
      bases: g.bases,
      lines: { zLeague: g.rule.zLeague, zClass: g.rule.zClass, zSetSE0: g.rule.zSetSE0 },
      classify: g.classify,
      freshBases: Object.keys(g.rule.freshBases ?? {}),
      skipEqualDials: g.rule.skipEqualDials === true,
      answers: Object.freeze({ spentChecklist: a.spentChecklist, scrambleStart: a.scrambleStart, seen: a.seen }),
    },
  };
}

// --- one arm ---------------------------------------------------------------------------------------------

/** The ratings the probes' fold reads (`STEP6_PROBE_RATINGS`: Mobility on H13 and H14, Speed on H15). */
export const STEP6_PROBE_ATTRS = Object.freeze(["mobility", "speed"] as const);

export interface PlayStep6Options {
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** The step-6 view's digest the record stamps. */
  readonly amendments: string;
  /** The guard's class view (AM-12: S5). */
  readonly classify: ThrowClassifier;
  /** The built arm (`buildStep6Arm` under AM-13's answers): given for a step-6 arm, absent on D1, F5 and E9. */
  readonly arm?: Step6Arm;
  /** The passer's Mobility third on the generated league (`thirdsOf`), from the seed set's rosters before any arm plays. */
  readonly thirdOf?: ThirdOf;
  /** Tests only: plays the step-4 part (default `playStep4Arm`). */
  readonly playStep4?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep4Options) => Step4Record;
}

/**
 * Step 3's folds and M2 as step 6 runs them: D1, F5 and E9 exactly as step 5 played them
 * (`step5FoldsOf`); a step-6 arm with step 3's folds when it reads step-3 facts and times free runners
 * from the picture, never M2 (cal-2's handoff: M2 is left out on s6 streams) and never C1's mirror.
 */
export function step6FoldsOf(id: ArmId, arm?: Step6Arm): NonNullable<PlayStep4Options["folds"]> {
  if (arm === undefined) return step5FoldsOf(id);
  return { s3Folds: readsStep3Facts(arm.rules) && arm.tunables.blitzPickup.freeRun !== undefined, m2: false, m5: false };
}

/** The recipe a step-6 arm's record carries: its kind, parts, the options it was built under, its ratings' digest and its mirror. */
export function step6RecipeOf(arm: Step6Arm): Step6RecordRecipe {
  return { kind: arm.step6.kind, parts: [...arm.step6.parts], outsOptions: { ...arm.outsOptions }, ratingOverridesDigest: arm.ratingOverridesDigest, mirror: arm.mirror };
}

/** Why `playStep6Arm` will not play `id` with `arm`, or undefined. */
function playedArmProblem(id: ArmId, arm: Step6Arm | undefined): string | undefined {
  if (isStep6ArmId(id) && arm === undefined) return `${id} is a step-6 arm: it plays only as built (buildStep6Arm, under AM-13's answers)`;
  if (!isStep6ArmId(id) && arm !== undefined) return `${id} is not a step-6 arm: it plays as step 5 played it, with no built arm`;
  if (arm !== undefined && arm.id !== id) return `the built arm is ${arm.id}, not ${id}`;
  if (!(STEP6_RUN_IDS as readonly string[]).includes(id)) return `${id} is not in step 6's run (${STEP6_RUN_IDS.join(", ")})`;
  return undefined;
}

/**
 * Plays one arm on both leagues at one seed set: step 4's record through step 5's play, with step 5's
 * folds (`foldStep5Game`) and step 6's (`foldStep6Game`) on every game, each league's metrics totals
 * at its end (`finishStep6League`), and AM-11's clock label beside the stamp. A step-6 arm plays its
 * built tree (`opts.arm`), its probes' overrides patched on both leagues' rosters and its mirror; D1,
 * F5 and E9 play as step 5 played them. It writes nothing and reads no gate: `runStep6` writes the
 * cache from the full corpus alone, and the smoke (`test/pocketStep6Smoke.test.ts`) plays H0 here on a
 * shortened one (`opts.corpus`), its record kept in memory.
 */
export function playStep6Arm(id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep6Options): Step6Record {
  const arm = opts.arm;
  const problem = playedArmProblem(id, arm);
  if (problem !== undefined) throw new Error(`ADR-089 step 6: ${problem}`);
  const state5: Record<League, Step5LeagueFolds> = { flat: emptyStep5LeagueFolds(), gen: emptyStep5LeagueFolds() };
  const state6: Record<League, Step6LeagueFolds> = { flat: emptyStep6LeagueFolds(), gen: emptyStep6LeagueFolds() };
  const ratings = arm?.step6.ratings;
  const fold = {
    agree: S6_AGREE_ARMS.includes(id),
    m5: S6_M5_ARMS.includes(id),
    digests: S6_DIGEST_ARMS.includes(id),
    crossCheck: S6_CROSS_CHECK_ARMS.includes(id),
  };
  const play = opts.playStep4 ?? playStep4Arm;
  const r = play(id, seedSet, env, {
    ...(opts.corpus === undefined ? {} : { corpus: opts.corpus }),
    ...(opts.log === undefined ? {} : { log: opts.log }),
    amendments: opts.amendments,
    label: "pocket step 6",
    folds: step6FoldsOf(id, arm),
    ...(arm === undefined
      ? {}
      : {
          arm: {
            arm,
            ...(ratings === undefined || ratings.length === 0 ? {} : { ratings, rosters: (league: League, before: GameSnapshot, asPlayed: GameSnapshot) => foldRatingsGame(state6[league], before, asPlayed, STEP6_PROBE_ATTRS) }),
            ...(arm.mirror ? { mirror: true } : {}),
          },
        }),
    finish: (league, accumulator) => finishStep6League(state6[league], accumulator),
    visit: (league, o, snapshot, tunables) => {
      foldStep5Game(state5[league], o.events, tunables, snapshot, opts.classify);
      const x5s = s5DropbacksOf(o.events, s2ContextOf(tunables, snapshot));
      foldStep6Game(state6[league], o, snapshot, tunables, { ...fold, ...(league === "gen" && opts.thirdOf !== undefined ? { thirdOf: opts.thirdOf } : {}), classify: opts.classify, players: playersOfSnapshot(snapshot) }, x5s);
    },
  });
  const { format: _format, ...rest } = r;
  void _format;
  return sanitize({ format: STEP6_ARM_FORMAT, ...rest, clock: STEP6_CLOCK_LABEL, ...(arm === undefined ? {} : { step6: step6RecipeOf(arm) }), s5: state5, s6: state6 }) as unknown as Step6Record;
}

// --- the plan --------------------------------------------------------------------------------------------

export interface Step6Target {
  readonly id: ArmId;
  readonly seedSet: SeedSet;
}

export const step6TargetName = (t: Step6Target): string => `${t.id}.set${String(t.seedSet)}`;

export interface Step6Plan {
  readonly targets: readonly Step6Target[];
  readonly complete: readonly Step6Target[];
  readonly mine: readonly Step6Target[];
  readonly oneSet?: SeedSet;
}

/** Step 6's targets (`STEP6_RUN_IDS` on both seed sets, or `--arms` and `--seed-set`), and this shard's. */
export function planStep6(opts: { readonly arms?: readonly ArmId[]; readonly shard?: { readonly index: number; readonly count: number }; readonly seedSet?: SeedSet } = {}): Step6Plan {
  const shard = opts.shard ?? { index: 1, count: 1 };
  if (!Number.isInteger(shard.count) || shard.count < 1 || !Number.isInteger(shard.index) || shard.index < 1 || shard.index > shard.count) {
    throw new RangeError(`--shard takes i/n with 1 <= i <= n (got ${String(shard.index)}/${String(shard.count)})`);
  }
  const runIds: readonly ArmId[] = STEP6_RUN_IDS;
  const ids = opts.arms ?? runIds;
  if (new Set(ids).size !== ids.length) throw new RangeError(`--arms names an arm twice: ${ids.join(",")}`);
  const foreign = ids.filter((id) => !runIds.includes(id));
  if (foreign.length > 0) throw new RangeError(`--arms: ${foreign.join(", ")} ${foreign.length === 1 ? "is" : "are"} not in step 6's run (${runIds.join(", ")})`);
  const sets: readonly SeedSet[] = opts.seedSet === undefined ? SEED_SETS : [opts.seedSet];
  const targets = runIds.filter((id) => ids.includes(id)).flatMap((id) => sets.map((seedSet) => ({ id, seedSet })));
  const complete = opts.seedSet === undefined ? runIds.flatMap((id) => SEED_SETS.map((seedSet) => ({ id, seedSet }))) : targets;
  return { targets, complete, mine: targets.filter((_, i) => i % shard.count === shard.index - 1), ...(opts.seedSet === undefined ? {} : { oneSet: opts.seedSet }) };
}

// --- the references, the cache and the records -------------------------------------------------------------

/** Step 6's records, relative to the package; never written over once final (not yet: step 6 has not played). */
export const STEP6_RECORDS = ["reports/adr-089-step6.md", "reports/adr-089-step6.json"] as const;
export const STEP6_RECORDS_FINAL: boolean = false;

/**
 * The replays' references (S-7', plan §7.2), keyed `<arm>.set<n>`: D1 from step 4's committed records
 * (`loadStep4References`) and E9 from step 5a's (`reports/adr-089-step5a.json`).
 */
export function loadStep6References(pkgRoot: string = PKG_ROOT): ReadonlyMap<string, object> {
  const out = new Map<string, object>(loadStep4References(pkgRoot));
  const path = join(pkgRoot, STEP5A_RECORDS[1]);
  if (!existsSync(path)) return out;
  const arms = (JSON.parse(readFileSync(path, "utf8")) as { readonly arms?: Readonly<Record<string, object>> }).arms ?? {};
  for (const s of SEED_SETS) {
    const r = arms[`E9.set${String(s)}`];
    if (r !== undefined) out.set(`E9.set${String(s)}`, r);
  }
  return out;
}

export const STEP6_DIRTY_REFUSAL =
  "ADR-089 step 6: refused before anything plays: this tree is dirty, and step 6's cache is made only from a clean tree (its fingerprint must name a commit the records can be re-made from): commit first. Nothing has played and no cache was made";

export function step6CacheDir(cacheParent: string, env: Step1Env): string {
  if (env.dirty) throw new Error(STEP6_DIRTY_REFUSAL);
  const dir = join(cacheParent, env.fingerprint);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** F5's second fresh play at a seed set (AM-12 `freshBases`), beside the cache's records. */
export const step6FreshFileOf = (dir: string, seedSet: SeedSet): string => join(dir, `F5.set${String(seedSet)}.fresh.json`);

/** The command the operator runs in another shell for F5's second fresh play (S-7'; library code never starts a process). */
export function step6FreshCommandOf(seedSet: SeedSet, file: string): string {
  return `pnpm --filter @ff/calibration pocket -- --step 6 --fresh-base ${String(seedSet)} --out ${file}`;
}

export function readStep6Record(path: string): Step6Record {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Step6Record;
  if (parsed.format !== STEP6_ARM_FORMAT) throw new Error(`${path}: not a step-6 arm record (format ${String((parsed as { format?: unknown }).format)})`);
  return parsed;
}

/**
 * Why a cached record does not stand for this build's arm: its stamp (all but commit and dirty), the
 * view it was played under, AM-11's clock label, and on a step-6 arm its recipe (the parts, the
 * owner-question options it was built under, its ratings' digest and its mirror; none on D1, F5, E9).
 */
export function cachedStep6Problems(record: Step6Record, want: Step3Stamp, arm: Step6Arm | undefined): readonly string[] {
  const amend = record.stamp?.amendments;
  const lead = amend !== want.amendments ? [`stamped with amendments ${String(amend)}, not this build's view ${want.amendments}`] : [];
  const clock = record.clock === STEP6_CLOCK_LABEL ? [] : [`clock: cached ${JSON.stringify(record.clock ?? null)}, this build "${STEP6_CLOCK_LABEL}"`];
  const recipe = arm === undefined ? undefined : step6RecipeOf(arm);
  const got = record.step6;
  const recipeProblems =
    recipe === undefined
      ? got === undefined
        ? []
        : ["step6: a recipe on an arm that is not a step-6 arm"]
      : canonicalise((got ?? null) as JsonValue) === canonicalise(recipe as unknown as JsonValue)
        ? []
        : [`step6: cached ${JSON.stringify(got ?? null)}, this build ${JSON.stringify(recipe)}`];
  return [...lead, ...stampProblems(record.stamp, want).filter((p) => !p.startsWith("amendments:")), ...clock, ...recipeProblems];
}

export function step6MeasuresOf(records: Step6RecordsBySet, grade: Step6Grade, guard: Step6Guard, fingerprint: string, targets: readonly Step6Target[]): JsonValue {
  const o = grade.sections.outcome;
  return sanitize({
    format: STEP6_MEASURES_FORMAT,
    filedDigest: STEP0_FILED_DIGEST,
    amendments: guard.digest,
    guard: guard.guardEntry,
    readings: guard.readingsEntry,
    answers: guard.answers,
    fingerprint,
    clock: STEP6_CLOCK_LABEL,
    ...(grade.sections.oneSet === undefined ? {} : { oneSet: grade.sections.oneSet }),
    outcome: { faults: o.faults, breaches: o.breaches, misses: o.misses, d6Misses: o.d6Misses, splits: o.splits },
    arms: Object.fromEntries(targets.map((t) => [step6TargetName(t), records.get(t.id)![t.seedSet]!])),
    grade: grade.sections,
  }) as JsonValue;
}

// --- the run ---------------------------------------------------------------------------------------------

export interface Step6Options {
  readonly arms?: readonly ArmId[];
  readonly shard?: { readonly index: number; readonly count: number };
  readonly cacheParent: string;
  readonly seedSet?: SeedSet;
  readonly report?: string;
  readonly out?: string;
  readonly filedPath: string;
  readonly amendmentsPath: string;
  readonly env: Step1Env;
  readonly committedDir?: string;
  readonly log?: (line: string) => void;
  /** Tests only: the gate's state (default `step6GateState()`), the pin, the petitions the arms are built under (default: the flags), the player, F5's fresh play, the references and the thirds. */
  readonly gate?: Step6GateState;
  readonly preflight?: PreflightStep6Options;
  readonly petitions?: StampPetitions;
  readonly play?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep6Options) => Step6Record;
  /** Tests only: F5's second fresh play, written beside F5's record when F5 plays (default: none; the operator's second process writes it, `step6FreshCommandOf`). */
  readonly fresh?: (seedSet: SeedSet) => Step6Record;
  readonly references?: ReadonlyMap<string, object>;
  readonly thirds?: (seedSet: SeedSet) => ThirdOf;
}

export interface Step6RunResult {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly remaining: readonly string[];
  readonly graded: boolean;
  readonly wrote: readonly string[];
  readonly grade?: Step6Grade;
  /** Commands the operator runs in another shell before step 6 grades (F5's second fresh plays, AM-12 `freshBases`). */
  readonly awaitingFresh?: readonly string[];
}

/**
 * Every step-6 arm built under AM-13's answers, before anything plays (`step6ArmsWith`: each refused
 * while a petition its tree waits on is out of contracts, and all distinct by rules name, dials,
 * ratings and mirror, among themselves and against D1, F5 and E9).
 */
export function buildStep6Arms(answers: OutsOptions, petitions: StampPetitions = {}): ReadonlyMap<Step6ArmId, Step6Arm> {
  return step6ArmsWith(answers, petitions, [armById("D1"), armById("F5"), armById("E9")]);
}

export const STEP6_SHORT_CORPUS_REFUSAL =
  "ADR-089 step 6: refused before anything plays: step 6's cache and records are made from the full corpus only (it takes no corpus); a shortened corpus plays one arm through playStep6Arm, which writes nothing (the smoke, test/pocketStep6Smoke.test.ts). Nothing has played and no cache was made";

/**
 * Plays this shard's targets, then grades once every target is cached. Refused, before anything
 * plays, by a corpus given (step 6's cache and records are the full corpus's alone:
 * `STEP6_SHORT_CORPUS_REFUSAL`), then the gate (plan §10.3), then the preflight, then the arms' build.
 */
export function runStep6(opts: Step6Options): Step6RunResult {
  if ((opts as { readonly corpus?: unknown }).corpus !== undefined) throw new Error(STEP6_SHORT_CORPUS_REFUSAL);
  const log = opts.log ?? ((): void => undefined);
  const gate = step6GateRefusal(opts.gate ?? step6GateState());
  if (gate !== undefined) throw new Error(gate);
  const { file, guard } = preflightStep6(opts.filedPath, opts.amendmentsPath, opts.preflight);
  const plan = planStep6({ ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.shard === undefined ? {} : { shard: opts.shard }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = FULL_CORPUS;
  const built = buildStep6Arms(guard.answers, opts.petitions);
  const armOf = (id: ArmId): Step6Arm | undefined => (isStep6ArmId(id) ? built.get(id) : undefined);
  const committed = opts.committedDir !== undefined && [opts.report, opts.out].some((p) => p !== undefined && isUnder(p, opts.committedDir!));
  const cacheDir = step6CacheDir(opts.cacheParent, opts.env);
  log(`pocket step 6: fingerprint ${opts.env.fingerprint}; amendments at step 6 ${guard.digest} (${guard.guardEntry}, ${guard.readingsEntry}); the owner's answers ${canonicalise(guard.answers as unknown as JsonValue)}; ${STEP6_CLOCK_LABEL}; arms cached in ${cacheDir}`);
  const play = opts.play ?? playStep6Arm;
  // The Mobility thirds from each seed set's rosters, read before any arm plays (cal-2's handoff).
  const thirds = new Map<SeedSet, ThirdOf>();
  const thirdOfSet = (s: SeedSet): ThirdOf => {
    const known = thirds.get(s);
    if (known !== undefined) return known;
    const t = (opts.thirds ?? thirdsOf)(s);
    thirds.set(s, t);
    return t;
  };
  for (const s of new Set(plan.mine.map((t) => t.seedSet))) thirdOfSet(s);
  const played: string[] = [];
  const cached: string[] = [];
  for (const t of plan.mine) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const arm = armOf(t.id);
    const want = step3StampOf(t.id, t.seedSet, opts.env, guard.digest, corpus, arm);
    if (existsSync(path)) {
      const problems = cachedStep6Problems(readStep6Record(path), want, arm);
      if (problems.length > 0) throw new Error(`ADR-089 step 6: the cached ${step6TargetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}. Delete it, or use another --cache`);
      cached.push(step6TargetName(t));
      continue;
    }
    log(`pocket step 6: playing ${step6TargetName(t)}`);
    writeAtomic(path, jsonText(play(t.id, t.seedSet, opts.env, { corpus, log, amendments: guard.digest, classify: guard.classify, ...(arm === undefined ? {} : { arm }), thirdOf: thirdOfSet(t.seedSet) })));
    played.push(step6TargetName(t));
    if (opts.fresh !== undefined && t.id === "F5" && guard.freshBases.includes("F5") && !existsSync(step6FreshFileOf(cacheDir, t.seedSet))) {
      writeAtomic(step6FreshFileOf(cacheDir, t.seedSet), jsonText(opts.fresh(t.seedSet)));
    }
  }
  const remaining = plan.complete.filter((t) => !existsSync(armFileOf(cacheDir, t.id, t.seedSet))).map(step6TargetName);
  const wrote: string[] = [];
  if (remaining.length > 0) {
    log(`pocket step 6: ${String(remaining.length)} target(s) still to play (${remaining.join(", ")}); the report is written once every target is in the cache`);
    return { cacheDir, played, cached, remaining, graded: false, wrote };
  }
  // F5's second fresh plays (AM-12 freshBases, S-7') come from a second process the operator runs.
  const freshSets = guard.freshBases.includes("F5") ? plan.complete.filter((t) => t.id === "F5").map((t) => t.seedSet) : [];
  const awaitingFresh = freshSets.filter((s) => !existsSync(step6FreshFileOf(cacheDir, s))).map((s) => step6FreshCommandOf(s, step6FreshFileOf(cacheDir, s)));
  if (awaitingFresh.length > 0) {
    log(`pocket step 6: every target is cached; F5's second fresh play is not there yet (AM-12, S-7'). In another shell run\n${awaitingFresh.map((c) => `  ${c}`).join("\n")}\nthen run this command again to grade`);
    return { cacheDir, played, cached, remaining, graded: false, wrote, awaitingFresh };
  }
  const records = new Map<string, Partial<Record<SeedSet, Step6Record>>>();
  for (const t of plan.complete) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const record = readStep6Record(path);
    const problems = cachedStep6Problems(record, step3StampOf(t.id, t.seedSet, opts.env, guard.digest, corpus, armOf(t.id)), armOf(t.id));
    if (problems.length > 0) throw new Error(`ADR-089 step 6: refused to grade: the cached ${step6TargetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}`);
    records.set(t.id, { ...(records.get(t.id) ?? {}), [t.seedSet]: record });
  }
  if (committed && [...records.values()].some((b) => SEED_SETS.some((s) => b[s]?.stamp.dirty === true))) throw new Error("ADR-089 step 6: refused to grade a committed report: a record was played on a dirty tree");
  const fresh: Partial<Record<SeedSet, Step6Record>> = {};
  for (const s of freshSets) {
    const path = step6FreshFileOf(cacheDir, s);
    const record = readStep6Record(path);
    const problems = cachedStep6Problems(record, step3StampOf("F5", s, opts.env, guard.digest, corpus), undefined);
    if (problems.length > 0) throw new Error(`ADR-089 step 6: refused to grade: F5 set ${String(s)}'s second fresh play at ${path} is not this build's: ${problems.join("; ")}. Delete it and run the fresh process again`);
    fresh[s] = record;
  }
  const grade = gradeStep6({ records, file, guard, fresh, references: opts.references ?? loadStep6References(), ...(plan.oneSet === undefined ? {} : { oneSet: plan.oneSet }), s5aDigest: POCKET_1_S5A_DIGEST, s6Digest: POCKET_1_S6_DIGEST });
  if (opts.report !== undefined) {
    const commits = [...new Set([...records.values()].flatMap((b) => SEED_SETS.flatMap((s) => (b[s] === undefined ? [] : [b[s]!.stamp.commit]))))].sort();
    writeAtomic(opts.report, renderStep6Report(grade, { filedDigest: STEP0_FILED_DIGEST, fingerprint: opts.env.fingerprint, commits, node: opts.env.node, caller: STEP1_CALLER, pr33: PR33_STATE }));
    wrote.push(opts.report);
  }
  if (opts.out !== undefined) {
    writeAtomic(opts.out, jsonText(step6MeasuresOf(records, grade, guard, opts.env.fingerprint, plan.complete)));
    wrote.push(opts.out);
  }
  return { cacheDir, played, cached, remaining, graded: true, wrote, grade };
}

/** F5's second fresh play (`--fresh-base <set>`, AM-12 `freshBases`): no cache, refused as a run is. */
export function playStep6Fresh(opts: { readonly seedSet: SeedSet; readonly filedPath: string; readonly amendmentsPath: string; readonly env: Step1Env; readonly log?: (line: string) => void; readonly gate?: Step6GateState; readonly preflight?: PreflightStep6Options; readonly play?: Step6Options["play"]; readonly thirds?: (seedSet: SeedSet) => ThirdOf }): Step6Record {
  const gate = step6GateRefusal(opts.gate ?? step6GateState());
  if (gate !== undefined) throw new Error(gate);
  const { guard } = preflightStep6(opts.filedPath, opts.amendmentsPath, opts.preflight);
  if (!guard.freshBases.includes("F5")) throw new Error(`ADR-089 step 6: --fresh-base plays F5's second fresh play, and ${guard.guardEntry} ${guard.freshBases.length === 0 ? "plays no base fresh" : `plays only ${guard.freshBases.join(", ")} fresh`} (its rule.freshBases)`);
  const play = opts.play ?? playStep6Arm;
  return play("F5", opts.seedSet, opts.env, { corpus: FULL_CORPUS, ...(opts.log === undefined ? {} : { log: opts.log }), amendments: guard.digest, classify: guard.classify, thirdOf: (opts.thirds ?? thirdsOf)(opts.seedSet) });
}

// --- R-1 (plan §8.2) ---------------------------------------------------------------------------------------

export interface Step6DigestsLeague {
  readonly games: number;
  readonly events: number;
  readonly canonicalFold: string;
  readonly byteFold: string;
  /** The same folds over the first 10 games, which the suite plays. */
  readonly first10: { readonly events: number; readonly canonicalFold: string; readonly byteFold: string };
}

export interface Step6DigestsResult {
  readonly format: typeof STEP6_DIGESTS_FORMAT;
  readonly amendments: string;
  readonly answers: OutsOptions;
  readonly node: string;
  readonly caller: string;
  readonly clock: typeof STEP6_CLOCK_LABEL;
  readonly gamesPerLeague: number;
  readonly arms: Readonly<Record<string, { readonly stamp: S6PinStamp; readonly leagues: Readonly<Record<string, Step6DigestsLeague>> }>>;
}

/** The pin stamp of a built step-6 arm (R-1): step 1's, with its ratings' digest and its mirror. */
export function s6PinStampOf(arm: Step6Arm): S6PinStamp {
  return {
    arm: arm.id,
    rules: arm.rules,
    overlayDigest: arm.overlayDigest ?? "none",
    tunablesDigest: arm.tunablesDigest,
    patches: arm.patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`),
    ratingOverridesDigest: arm.ratingOverridesDigest,
    mirror: arm.mirror,
  };
}

/**
 * R-1: the golden 50 games a league under the arms R-1 names (`S6_PIN_ARM_IDS`), each with its tree,
 * its probes' overrides and its mirror, folded as the step-5 pins fold them (`foldDigests` of each
 * game's `gameDigest` and `gameBytesDigest`, with the same folds over the first 10), no cache. Refused,
 * before anything plays, by the gate, the preflight and the arms' build; R-2 fills `POCKET_1_S6_PINS`
 * from two processes' byte-identical outputs after the lift.
 */
export function runStep6Digests(opts: { readonly filedPath: string; readonly amendmentsPath: string; readonly node: string; readonly first?: number; readonly arms?: readonly S6PinArmId[]; readonly log?: (line: string) => void; readonly gate?: Step6GateState; readonly preflight?: PreflightStep6Options; readonly petitions?: StampPetitions }): Step6DigestsResult {
  const gate = step6GateRefusal(opts.gate ?? step6GateState());
  if (gate !== undefined) throw new Error(gate);
  const { guard } = preflightStep6(opts.filedPath, opts.amendmentsPath, opts.preflight);
  const built = buildStep6Arms(guard.answers, opts.petitions);
  const ids: readonly S6PinArmId[] = opts.arms ?? S6_PIN_ARM_IDS;
  const arms: Record<string, { stamp: S6PinStamp; leagues: Record<string, Step6DigestsLeague> }> = {};
  for (const id of ids) {
    const arm = built.get(id);
    if (arm === undefined) throw new RangeError(`${id} is not a step-6 arm`);
    const ratings = arm.step6.ratings;
    const leagues: Record<string, Step6DigestsLeague> = {};
    for (const league of GOLDEN_LEAGUES) {
      const canonical: string[] = [];
      const bytes: string[] = [];
      const events: number[] = [];
      goldenGames(league, (o) => {
        canonical.push(gameDigest(o.events));
        bytes.push(gameBytesDigest(o.events));
        events.push(o.events.length);
      }, { tunables: arm.tunables, callerVersion: STEP1_CALLER, ...(ratings === undefined || ratings.length === 0 ? {} : { ratings }), ...(arm.mirror ? { mirror: true } : {}), ...(opts.first === undefined ? {} : { first: opts.first }) });
      const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
      leagues[league] = {
        games: canonical.length,
        events: sum(events),
        canonicalFold: foldDigests(canonical),
        byteFold: foldDigests(bytes),
        first10: { events: sum(events.slice(0, 10)), canonicalFold: foldDigests(canonical.slice(0, 10)), byteFold: foldDigests(bytes.slice(0, 10)) },
      };
      opts.log?.(`pocket step 6 digests: ${id} ${league}, ${String(canonical.length)} games`);
    }
    arms[id] = { stamp: s6PinStampOf(arm), leagues };
  }
  return { format: STEP6_DIGESTS_FORMAT, amendments: guard.digest, answers: guard.answers, node: opts.node, caller: STEP1_CALLER, clock: STEP6_CLOCK_LABEL, gamesPerLeague: opts.first ?? 50, arms };
}

// --- the command ---------------------------------------------------------------------------------------------

/** The `--report` and `--out` that would write over committed records: every closed step's, the filing, the amendments file, and step 6's own once final. */
export function closedStep6Writes(args: Pick<Step6Args, "report" | "out">, cwd: string, pkgRoot: string = PKG_ROOT, final: boolean = STEP6_RECORDS_FINAL): readonly string[] {
  const own = new Set([FILED_PATH, AMENDMENTS_PATH, ...(final ? STEP6_RECORDS : [])].map((r) => realOf(join(pkgRoot, r))));
  const mine = (["report", "out"] as const).flatMap((flag) => {
    const value = args[flag];
    return value !== undefined && own.has(realOf(resolve(cwd, value))) ? [`--${flag} ${value}`] : [];
  });
  return [...new Set([...closedStep5Writes(args, cwd, pkgRoot, { a: STEP5A_RECORDS_FINAL, b: STEP5B_RECORDS_FINAL }), ...mine])];
}

/**
 * `pocket --step 6`: the gate first, refusing before anything plays (in this build it always refuses,
 * by a refusal naming every condition it waits for); then the writes over committed records and the
 * preflight; then F5's second fresh play (`--fresh-base`), R-1 (`--digests`) or the arms. `gate` is a
 * test's seam (default: this build's state).
 */
export async function step6Command(args: Step6Args, log: (line: string) => void, gate: Step6GateState = step6GateState()): Promise<void> {
  const refusal = step6GateRefusal(gate);
  if (refusal !== undefined) throw new Error(refusal);
  log(`ADR-089 step 6: ${args.digests === true ? "--digests" : args.freshBase !== undefined ? `--fresh-base ${String(args.freshBase)}` : "the arms"}: the gate is open`);
  const closed = closedStep6Writes(args, process.cwd());
  if (closed.length > 0) throw new Error(`ADR-089 step 6: ${closed.join(" and ")} would write over committed records, which are never edited. Write elsewhere`);
  const filedPath = join(PKG_ROOT, FILED_PATH);
  const amendmentsPath = join(PKG_ROOT, AMENDMENTS_PATH);
  preflightStep6(filedPath, amendmentsPath);
  const full = step1Env(resolve(PKG_ROOT, "..", ".."), filedPath);
  const env: Step1Env = { fingerprint: full.fingerprint, commit: full.commit, dirty: full.dirty, node: full.node };
  log(`pocket step 6: fingerprint ${env.fingerprint}; commit ${env.commit}${env.dirty ? ` (dirty: ${full.reason ?? "?"})` : ""}; node ${env.node}`);
  if (args.freshBase !== undefined) {
    writeAtomic(args.out!, jsonText(playStep6Fresh({ seedSet: args.freshBase, filedPath, amendmentsPath, env, log, gate })));
    log(`pocket step 6: F5 set ${String(args.freshBase)}'s second fresh play is written to ${args.out!}`);
    return;
  }
  if (args.digests === true) {
    writeAtomic(args.out!, jsonText(runStep6Digests({ filedPath, amendmentsPath, node: process.version, log, gate })));
    log(`pocket step 6: wrote the digests to ${args.out!}`);
    return;
  }
  const result = runStep6({
    ...(args.arms === undefined ? {} : { arms: args.arms }),
    ...(args.shard === undefined ? {} : { shard: args.shard }),
    ...(args.seedSet === undefined ? {} : { seedSet: args.seedSet }),
    ...(args.report === undefined ? {} : { report: args.report }),
    ...(args.out === undefined ? {} : { out: args.out }),
    cacheParent: args.cache ?? join(PKG_ROOT, "data-cache", "pocket-step6"),
    filedPath,
    amendmentsPath,
    env,
    log,
    committedDir: join(PKG_ROOT, "reports"),
    gate,
  });
  if (result.graded && result.grade !== undefined) process.stdout.write(`${step6SummaryLines(result.grade.sections).join("\n")}\n`);
}
