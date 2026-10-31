/**
 * THE NAMED AMENDMENTS OF THE STEP-0 FILING, `adr-089-amendments/v1` (ADR-089 Appendix E's header,
 * ADR-089:2022: "Amendments go in `reports/adr-089-amendments.filed.json`, never in the step-0
 * file"; `filed.ts:16`; step 0's plan §8.1; AM-1, Appendix F, F.11; step-2 plan §4.6, §6 K3; AM-2,
 * Appendix G, G.8; step-3 plan §4.1, §4.2, §4.3; AM-3, G.9).
 *
 * The step-0 filing is append-only and pinned (`STEP0_FILED_DIGEST`, `fnv1a:9a1c90e9`) for ever, so a
 * filed clause is amended by a named entry here, never by an edit there. Each entry carries what it
 * supersedes and what it leaves untouched (clause ids of the step-0 file), the step it is filed
 * before, the design lines it reads, its human record, its reason, the owner's word where one is
 * needed (`null` when the amended rule is an Orchestrator default, §15.3, which is shown, not asked)
 * and its rule. AM-1 is the first entry: the interception guard from step 2 (`guard.mix` and
 * `guard.byClass`), with an explicit base map per step (`rule.bases`). AM-2, filed before step 3
 * (Appendix G, G.8), supersedes `s3.part1.m8` and `s3.part1.monotone` and files the late block's
 * dials and step 3's readings; it carries no guard rule. AM-3, filed before step 3 (G.9), is step 3's
 * guard base map: AM-1's rule word for word but for `bases` (C1 on B3, C2 on B6, C11 on B3).
 *
 * **The pin.** `AMENDMENTS_DIGEST` is `stableDigest` of the parsed file (as `filedDigest` is of the
 * step-0 file), a literal here. The harness refuses a file that does not equal it, so a changed
 * file is refused unless the pin changes with it, and the pin, being in `src`, moves the arm cache's
 * source fingerprint (step-2 plan §4.6, C2-F20). `adr089Amendments.test.ts` also pins each entry's
 * own digest, so editing a filed entry fails while appending one adds a pin.
 *
 * **A step's view** (step-3 plan §4.3, critique 2 B2). Appending an entry moves the whole file's
 * pin, but a step already played was graded under the entries filed before it. So a step's harness
 * may read the file at its step (`amendmentsAtStep`: the entries whose `filedBeforeStep` is that step
 * or an earlier one, every other key as filed) and pin that view's digest instead: step 2's harness
 * pins `STEP2_AMENDMENTS_DIGEST` (AM-1 alone), so its committed records keep grading after AM-2 and
 * every later entry is filed. The whole file is still loaded and validated first.
 *
 * **What `validateAmendments` refuses** (AM-1 §3.4 item 3): a format other than this one; a `filing`
 * other than `STEP0_FILED_DIGEST`; ids that do not run AM-1, AM-2, ... in order; a `supersedes` or
 * `untouched` id that is not a clause of the step-0 file (or one named in both lists); a superseded
 * clause whose step is `acceptance` (§6.10: an acceptance falsifier is tightened, never widened);
 * an `adrLines` or `cites` entry that is not a line of the design as C0 landed it (1 to
 * `ADR_089_LINES`); a `filedBeforeStep` or `steps` entry that is not a step of ADR-089; and an arm
 * of a base map that is not an arm of this build. An entry that supersedes a guard clause must also
 * carry a guard rule `guardRuleOf` reads (the statistic, the lines and the base maps).
 */
import { readFileSync } from "node:fs";
import { stableDigest } from "../harness/digest.js";
import { isAnyArmId, type ArmId } from "./arms.js";
import { ADR_089_LINES, STEP0_FILED_DIGEST, type FiledFile, type JsonValue } from "./filed.js";

export const AMENDMENTS_FORMAT = "adr-089-amendments/v1";

/** The file, relative to the package (as `FILED_PATH` is). */
export const AMENDMENTS_PATH = "reports/adr-089-amendments.filed.json";

/**
 * The committed amendments file's digest (`amendmentsDigest`, a `stableDigest` of the parsed file):
 * AM-1 as filed by the Orchestrator (commit `b65ab25`, shown to the owner at `200b18b`), then AM-2,
 * filed before step 3 (ADR-089 Appendix G, G.8), then AM-3, step 3's guard base map (G.9). A reader of
 * the whole file refuses any other file. Step 2's harness reads the file as it stood at step 2 instead
 * (`STEP2_AMENDMENTS_DIGEST`).
 */
export const AMENDMENTS_DIGEST = "fnv1a:b7557c36";

/**
 * The file's step-2 view (`amendmentsDigestAtStep(file, "2")`): its entries cut to those filed before
 * step 2 or an earlier step, which is AM-1 alone. It is the digest the whole file had when step 2's
 * arms ran, so every step-2 record stamps it (`amendments`) and step 2's harness pins it; an entry
 * filed before a later step (AM-2 on) leaves it where it is, so step 2's records keep grading
 * (step-3 plan §4.3, critique 2 B2).
 */
export const STEP2_AMENDMENTS_DIGEST = "fnv1a:d5f9de6d";

/** ADR-089's steps (§6's table), the ids a `filedBeforeStep`, a `steps` entry or a base map's key may name. */
export const ADR_089_STEP_IDS = ["0", "1", "2", "3", "4", "5a", "5b", "6", "7", "8a", "8b", "9", "10", "11"] as const;
export type AdrStepId = (typeof ADR_089_STEP_IDS)[number];

export const isAdrStepId = (v: unknown): v is AdrStepId => typeof v === "string" && (ADR_089_STEP_IDS as readonly string[]).includes(v);

/** The guard clauses a guard rule supersedes (§8's D9 and D28). */
export const GUARD_CLAUSE_IDS = ["guard.mix", "guard.byClass"] as const;

/** One step's guard base map: graded arm to the arm it is read against (AM-1 §4.3). */
export type BaseMap = Readonly<Record<string, ArmId>>;

export interface AmendmentEntry {
  /** AM-1, AM-2, ... in filing order. */
  readonly id: string;
  readonly name: string;
  readonly filedBeforeStep: AdrStepId;
  /** The steps the entry reads at. */
  readonly steps: readonly AdrStepId[];
  /** Step-0 clause ids this entry supersedes at its steps. */
  readonly supersedes: readonly string[];
  /** Step-0 clause ids it names as untouched. */
  readonly untouched: readonly string[];
  /** The Orchestrator defaults it amends (§15.3), when it amends any. */
  readonly defaults: readonly string[];
  /** The design lines it amends, and the ones it cites (C0's lines, 1 to ADR_089_LINES). */
  readonly adrLines: readonly number[];
  readonly cites: readonly number[];
  /** Its human record ("ADR-089 Appendix F, F.11"). */
  readonly record: string;
  readonly reason: string;
  /** The owner's word, with its time, where one is needed; null when the entry is shown, not asked. */
  readonly ownersWord: null | { readonly ts: string; readonly [key: string]: JsonValue };
  readonly rule: { readonly [key: string]: JsonValue };
}

export interface AmendmentsFile {
  readonly format: typeof AMENDMENTS_FORMAT;
  /** The design the entries amend (its path in the repository). */
  readonly adr: string;
  /** The step-0 filing's digest the entries amend: `STEP0_FILED_DIGEST`. */
  readonly filing: string;
  readonly entries: readonly AmendmentEntry[];
}

export class AmendmentsValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`not an ${AMENDMENTS_FORMAT} file:\n  - ${problems.join("\n  - ")}`);
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isAdrLine = (v: unknown): boolean => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= ADR_089_LINES;

const ENTRY_FIELDS = ["id", "name", "filedBeforeStep", "steps", "supersedes", "untouched", "defaults", "adrLines", "cites", "record", "reason", "ownersWord", "rule"] as const;

// --- the guard rule (AM-1 §4.3 to §4.5, §4.9) ------------------------------------------------------------

/** The guard rule an entry superseding `guard.mix` and `guard.byClass` carries, as the harness reads it. */
export interface GuardRule {
  /** Per step, the graded arms and their bases (AM-1 §4.3; `rule.bases`). */
  readonly bases: Readonly<Partial<Record<AdrStepId, BaseMap>>>;
  /** The binomial SE with the two arms read as independent (`guardNoise`). */
  readonly se: "binomialIndependent";
  /** Z = (z1 + z2) / sqrt 2 over the seed sets. */
  readonly statistic: "pooledZ";
  readonly seedSets: readonly [1, 2];
  /** The league-wide and class lines; a reading breaches when Z is above its line (strict). */
  readonly zLeague: number;
  readonly zClass: number;
  readonly breachIf: "greaterThan";
  /** The z a set scores when its SE is 0 (S4-13). */
  readonly zSetSE0: number;
  readonly classes: "GUARD_CLASSES";
  readonly dirtyPocket: "lastStatusAtOrBeforeRelease";
  /** The cumulative line (reported, never graded before step 10): design and pricing arms against these. */
  readonly cumulative: { readonly design: ArmId; readonly pricing: ArmId; readonly graded: false };
}

/** Every problem with an entry's guard rule; empty when `guardRuleOf` can read it. */
function guardRuleProblems(rule: Record<string, unknown>, at: string, steps: readonly unknown[]): string[] {
  const out: string[] = [];
  const want = (key: string, value: unknown): void => {
    if (JSON.stringify(rule[key]) !== JSON.stringify(value)) out.push(`${at}.${key}: must be ${JSON.stringify(value)} (got ${JSON.stringify(rule[key] ?? null)})`);
  };
  want("se", "binomialIndependent");
  want("statistic", "pooledZ");
  want("seedSets", [1, 2]);
  want("breachIf", "greaterThan");
  want("classes", "GUARD_CLASSES");
  want("dirtyPocket", "lastStatusAtOrBeforeRelease");
  for (const key of ["zLeague", "zClass", "zSetSE0"]) {
    const v = rule[key];
    if (typeof v !== "number" || !Number.isFinite(v)) out.push(`${at}.${key}: must be a finite number`);
  }
  const bases = rule["bases"];
  if (!isObject(bases) || Object.keys(bases).length === 0) out.push(`${at}.bases: must map at least one step to its arms' bases`);
  else {
    for (const [step, map] of Object.entries(bases)) {
      if (!isAdrStepId(step)) out.push(`${at}.bases.${step}: not a step of ADR-089`);
      else if (!steps.includes(step)) out.push(`${at}.bases.${step}: a base map for a step the entry does not read at`);
      if (!isObject(map) || Object.keys(map).length === 0) {
        out.push(`${at}.bases.${step}: must map each graded arm to its base`);
        continue;
      }
      for (const [arm, base] of Object.entries(map)) {
        if (!isAnyArmId(arm)) out.push(`${at}.bases.${step}.${arm}: not an arm of this build`);
        if (typeof base !== "string" || !isAnyArmId(base)) out.push(`${at}.bases.${step}.${arm}: its base ${JSON.stringify(base)} is not an arm of this build`);
        else if (base === arm) out.push(`${at}.bases.${step}.${arm}: an arm is not its own base`);
      }
    }
  }
  const cum = rule["cumulative"];
  if (!isObject(cum) || typeof cum["design"] !== "string" || !isAnyArmId(cum["design"]) || typeof cum["pricing"] !== "string" || !isAnyArmId(cum["pricing"]) || cum["graded"] !== false) {
    out.push(`${at}.cumulative: must name a design arm and a pricing arm of this build, with graded false`);
  }
  return out;
}

/** The guard rule of an entry that supersedes the guard clauses; throws on an entry that is not one. */
export function guardRuleOf(entry: AmendmentEntry): GuardRule {
  if (!GUARD_CLAUSE_IDS.every((id) => entry.supersedes.includes(id))) throw new Error(`${entry.id} supersedes ${entry.supersedes.join(", ") || "nothing"}, not the guard (${GUARD_CLAUSE_IDS.join(", ")})`);
  const problems = guardRuleProblems(entry.rule, `${entry.id}.rule`, entry.steps);
  if (problems.length > 0) throw new AmendmentsValidationError(problems);
  return entry.rule as unknown as GuardRule;
}

// --- validation ------------------------------------------------------------------------------------------

/** Every problem with `json` as an `adr-089-amendments/v1` file against the step-0 filing; empty when it is one. */
export function amendmentsProblems(json: unknown, filing: FiledFile): readonly string[] {
  const out: string[] = [];
  if (!isObject(json)) return ["(root): must be an object"];
  for (const key of Object.keys(json)) if (!["format", "adr", "filing", "entries"].includes(key)) out.push(`${key}: not a field of ${AMENDMENTS_FORMAT}`);
  if (json["format"] !== AMENDMENTS_FORMAT) out.push(`format: must be "${AMENDMENTS_FORMAT}"`);
  if (!isString(json["adr"])) out.push("adr: must name the design");
  if (json["filing"] !== STEP0_FILED_DIGEST) out.push(`filing: must be the step-0 filing's digest ${STEP0_FILED_DIGEST} (got ${JSON.stringify(json["filing"] ?? null)})`);
  const entries = json["entries"];
  if (!Array.isArray(entries) || entries.length === 0) return [...out, "entries: must be a non-empty array"];
  const clauses = new Map(filing.bands.clauses.map((c) => [c.id, c]));
  entries.forEach((e: unknown, i: number) => {
    const at = `entries.${String(i)}`;
    if (!isObject(e)) {
      out.push(`${at}: must be an object`);
      return;
    }
    for (const key of ENTRY_FIELDS) if (!(key in e)) out.push(`${at}.${key}: missing`);
    for (const key of Object.keys(e)) if (!(ENTRY_FIELDS as readonly string[]).includes(key)) out.push(`${at}.${key}: not a field of an entry`);
    if (e["id"] !== `AM-${String(i + 1)}`) out.push(`${at}.id: must be AM-${String(i + 1)} (ids run AM-1, AM-2, ... in order; got ${JSON.stringify(e["id"] ?? null)})`);
    for (const key of ["name", "record", "reason"]) if (!isString(e[key])) out.push(`${at}.${key}: must be a non-empty string`);
    if (!isAdrStepId(e["filedBeforeStep"])) out.push(`${at}.filedBeforeStep: ${JSON.stringify(e["filedBeforeStep"] ?? null)} is not a step of ADR-089`);
    const steps = e["steps"];
    if (!Array.isArray(steps) || steps.length === 0) out.push(`${at}.steps: must list the steps it reads at`);
    else steps.forEach((s: unknown, j: number) => {
      if (!isAdrStepId(s)) out.push(`${at}.steps.${String(j)}: ${JSON.stringify(s)} is not a step of ADR-089`);
      // An entry reads only at steps not yet played when it was filed: none before filedBeforeStep (review CT-F8).
      else if (isAdrStepId(e["filedBeforeStep"]) && ADR_089_STEP_IDS.indexOf(s) < ADR_089_STEP_IDS.indexOf(e["filedBeforeStep"])) {
        out.push(`${at}.steps.${String(j)}: step ${s} comes before filedBeforeStep ${e["filedBeforeStep"]}; an entry reads only at the step it was filed before and later ones`);
      }
    });
    const lists: Record<string, readonly unknown[]> = {};
    for (const key of ["supersedes", "untouched", "defaults"]) {
      const v = e[key];
      if (!Array.isArray(v) || !v.every(isString)) out.push(`${at}.${key}: must be an array of strings`);
      else lists[key] = v;
    }
    for (const key of ["supersedes", "untouched"]) {
      for (const id of lists[key] ?? []) {
        const clause = clauses.get(id as string);
        if (clause === undefined) out.push(`${at}.${key}: ${String(id)} is not a clause of the step-0 filing`);
        else if (key === "supersedes" && clause.step === "acceptance") out.push(`${at}.supersedes: ${String(id)} is an acceptance clause, which an amendment never widens (§6.10)`);
      }
    }
    for (const id of lists["supersedes"] ?? []) if ((lists["untouched"] ?? []).includes(id)) out.push(`${at}: ${String(id)} is both superseded and untouched`);
    for (const key of ["adrLines", "cites"]) {
      const v = e[key];
      if (!Array.isArray(v)) out.push(`${at}.${key}: must be an array of design lines`);
      else v.forEach((l: unknown, j: number) => { if (!isAdrLine(l)) out.push(`${at}.${key}.${String(j)}: ${JSON.stringify(l)} is not a line of the design as C0 landed it (1 to ${String(ADR_089_LINES)})`); });
    }
    const word = e["ownersWord"];
    if (word !== null && !(isObject(word) && isString(word["ts"]))) out.push(`${at}.ownersWord: must be null (shown, not asked) or carry the owner's word with its ts`);
    const rule = e["rule"];
    if (!isObject(rule)) out.push(`${at}.rule: must be an object`);
    else if ((lists["supersedes"] ?? []).some((id) => (GUARD_CLAUSE_IDS as readonly unknown[]).includes(id))) {
      out.push(...guardRuleProblems(rule, `${at}.rule`, Array.isArray(steps) ? steps : []));
    } else if (isObject(rule["bases"])) {
      // A base map outside a guard rule still names arms of this build only.
      for (const [step, map] of Object.entries(rule["bases"])) {
        if (!isObject(map)) continue;
        for (const [arm, base] of Object.entries(map)) if (!isAnyArmId(arm) || typeof base !== "string" || !isAnyArmId(base)) out.push(`${at}.rule.bases.${step}.${arm}: not an arm of this build`);
      }
    }
  });
  return out;
}

export function validateAmendments(json: unknown, filing: FiledFile): AmendmentsFile {
  const problems = amendmentsProblems(json, filing);
  if (problems.length > 0) throw new AmendmentsValidationError(problems);
  return json as AmendmentsFile;
}

/** `stableDigest` of the parsed file: key order does not move it, any value does. */
export function amendmentsDigest(json: unknown): string {
  return stableDigest(json);
}

/** Reads and validates the file (it does not check the pin; `openAmendments` does). */
export function loadAmendments(path: string, filing: FiledFile): AmendmentsFile {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (e) {
    throw new Error(`ADR-089: the amendments file ${path} does not load: ${e instanceof Error ? e.message : String(e)}`);
  }
  return validateAmendments(json, filing);
}

/** Loads, validates and requires the pin: the committed file and no other (`AMENDMENTS_DIGEST`). */
export function openAmendments(path: string, filing: FiledFile, pin: string = AMENDMENTS_DIGEST): AmendmentsFile {
  const file = loadAmendments(path, filing);
  const digest = amendmentsDigest(file);
  if (digest !== pin) {
    throw new Error(`ADR-089: the amendments file ${path} digests to ${digest}, not the pin ${pin}: an amendment is append-only; file a new named entry, and change the pin in amendments.ts with it`);
  }
  return file;
}

/**
 * The file as it stood for `step`: its `entries` cut to those whose `filedBeforeStep` is `step` or an
 * earlier step of ADR-089 (§6's order), in filing order, every other key as filed. An entry filed
 * before a later step is not in it, so appending one never moves the view.
 */
export function amendmentsAtStep(file: AmendmentsFile, step: AdrStepId): AmendmentsFile {
  const at = ADR_089_STEP_IDS.indexOf(step);
  return { ...file, entries: file.entries.filter((e) => ADR_089_STEP_IDS.indexOf(e.filedBeforeStep) <= at) };
}

/** `stableDigest` of the file's view at `step` (`amendmentsAtStep`). */
export function amendmentsDigestAtStep(file: AmendmentsFile, step: AdrStepId): string {
  return amendmentsDigest(amendmentsAtStep(file, step));
}

/**
 * Loads and validates the whole file, requires its view at `step` to equal `pin`, and returns that
 * view: a played step's harness reads the amendments as they stood when its arms ran (step 2's pin
 * is `STEP2_AMENDMENTS_DIGEST`), so an entry filed before a later step never refuses its records,
 * while an edit to an entry it reads, or an entry filed before it after the fact, is refused.
 */
export function openAmendmentsAtStep(path: string, filing: FiledFile, step: AdrStepId, pin: string): AmendmentsFile {
  const view = amendmentsAtStep(loadAmendments(path, filing), step);
  const digest = amendmentsDigest(view);
  if (digest !== pin) {
    throw new Error(`ADR-089: the amendments file ${path}, read at step ${step} (its entries filed before step ${step} or an earlier step), digests to ${digest}, not the pin ${pin}: an amendment is append-only, and a step's view never changes once its arms have run`);
  }
  return view;
}

/** The entry with this id; throws when the file does not hold it. */
export function entryOf(file: AmendmentsFile, id: string): AmendmentEntry {
  const e = file.entries.find((x) => x.id === id);
  if (e === undefined) throw new Error(`ADR-089: the amendments file holds no ${id} (it holds ${file.entries.map((x) => x.id).join(", ")})`);
  return e;
}

/**
 * The guard entry that reads at `step` (the last one filed whose guard rule names that step), with
 * its rule and its base map for the step. Throws when no filed guard rule maps the step: the harness
 * refuses a step with no filed map (AM-1 §4.3, "the harness refuses a step with no filed map").
 */
export function guardFor(file: AmendmentsFile, step: AdrStepId): { readonly entry: AmendmentEntry; readonly rule: GuardRule; readonly bases: BaseMap } {
  for (let i = file.entries.length - 1; i >= 0; i -= 1) {
    const entry = file.entries[i]!;
    if (!entry.steps.includes(step) || !GUARD_CLAUSE_IDS.every((id) => entry.supersedes.includes(id))) continue;
    const rule = guardRuleOf(entry);
    const bases = rule.bases[step];
    if (bases !== undefined) return { entry, rule, bases };
  }
  throw new Error(`ADR-089: no filed amendment maps step ${step}'s guard bases; a step's guard reads only a base map filed before its arms run (AM-1 §4.3)`);
}
