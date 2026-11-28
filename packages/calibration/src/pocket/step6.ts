/**
 * `pnpm --filter @ff/calibration pocket -- --step 6 [--shard i/3] --report reports/adr-089-step6.md --out reports/adr-089-step6.json`
 * `pnpm --filter @ff/calibration pocket -- --step 6 --fresh-base <set> --out <file>`
 * `pnpm --filter @ff/calibration pocket -- --step 6 --digests --out <file>`
 *
 * ADR-089 STEP 6's GATE (step-6 plan §10.3; K0, plan §3.1 item 5), refusing before anything plays.
 * Step 6's harness (the arms, the folds, the guard under AM-12, the report) comes later (plan §3.2,
 * K2). In this build `--step 6` is parsed (`parseStep6Args`) and refused here, by a refusal that names
 * every condition the gate still waits for. The gate opens only when all of these hold:
 *
 *  1. step 5a's records are final (`STEP5A_RECORDS_FINAL`) and their outcome
 *     (`reports/adr-089-step5a.json`, a two-set grade) holds no build fault and no AM-8 breach;
 *  2. every graded 5a miss is answered by the owner's words on file: AM-11's `rule.gate.step6` names
 *     the miss (`s5aMiss`) and the time of the owner's words (`answeredAt`), and the gate reads that,
 *     never a flag (step 6 takes no `--after-owner`, `STEP6_AFTER_OWNER_REFUSAL`);
 *  3. the step-6 view of the amendments file (`amendmentsAtStep(file, "6")`) equals
 *     `STEP6_AMENDMENTS_PIN`, its guard (`guardFor(view, "6")`) is AM-12's, and AM-13, step 6's
 *     readings, is filed with the owner's three answers in its `ownersWord.answers` (`filing.md` §4.3),
 *     each one of the options the engine builds behind a leaf (`STEP6_ANSWER_OPTIONS`);
 *  4. the contract petitions step 6 waits on are in contracts: P9 to P12 and P20, and P21 when the
 *     owner answers "unseen" (`step6PetitionsOut`). P20 and P21 are a named addition to the plan's
 *     item 4: contracts-guardian's second reading (`guardian-2.md`) ruled P20 needed and P21 needed
 *     only for "unseen";
 *  5. `pocket-1.s6` is recorded (`POCKET_1_S6_DIGEST`).
 *
 * In this build it always refuses: AM-13 waits on the owner's three answers and typed yeses, no
 * step-6 petition is in contracts, and `pocket-1.s6` is not recorded. The gate reads the package and
 * plays nothing; no cache is made, no record is written and no clock is read.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, guardFor, loadAmendments, type AmendmentsFile } from "./amendments.js";
import { FILED_PATH } from "./bands.js";
import { CAUGHT_SEEN, POCKET_1_S6_DIGEST, SCRAMBLE_STARTS, SPENT_CHECKLISTS, step6PetitionsUnder, type OutsOptions, type Step6Petition, type Step6Petitions } from "./rules.js";
import { AFTER_OWNER_FORM, openFiling, type Step6Args } from "./step0.js";
import { s5aRecordProblemOf, STEP5A_RECORDS, STEP5A_RECORDS_FINAL } from "./step5.js";

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

/** What `--step 6` says once its gate opens in a build without the harness (plan §3.2, K2). */
export const STEP6_HARNESS_REFUSAL = "ADR-089 step 6: the gate is open, but this build has no step-6 harness (plan §3.2, K2): nothing has played and no cache was made";

/**
 * `pocket --step 6`: the gate, then (in a later build) the harness. In this build it refuses before
 * anything plays, whatever the arguments; `gate` is a test's seam (default: this build's state).
 */
export async function step6Command(args: Step6Args, log: (line: string) => void, gate: Step6GateState = step6GateState()): Promise<void> {
  const refusal = step6GateRefusal(gate);
  if (refusal !== undefined) throw new Error(refusal);
  log(`ADR-089 step 6: ${args.digests === true ? "--digests" : args.freshBase !== undefined ? `--fresh-base ${String(args.freshBase)}` : "the arms"}: the gate is open`);
  throw new Error(STEP6_HARNESS_REFUSAL);
}
