/**
 * ADR-089 step 2, Q-2b: STEP 1's GRADING IS UNCHANGED (step-2 plan §4.5 Q-2b and its set-2
 * fixture paragraph, §5 on F.9 item 3, §6's K1 row; C3-9, C3-10, C3-11).
 *
 * Step 2 edits code that step 1's grading runs through (`arms.ts`'s arm lists and `ArmId`,
 * `step1.ts`'s `guardRows`, `report.ts`). So this re-grades step 1's committed records with this
 * build and requires step 1's committed output back. Nothing is played: the records are data.
 *
 *  - **Seed set 1, the committed run.** The 17 records of `reports/adr-089-step1.json` (seed set 1,
 *    and seed set 2 for A15 and A0b, each arm on its own set, as `--step 1` graded them), through
 *    `gradeStep1`, give the committed `grade` and `groups`, and with them the committed `.json` byte
 *    for byte; `renderStep1Report` gives `reports/adr-089-step1.md` byte for byte, except that line
 *    130 must equal `LINE_130`.
 *  - **Seed set 2, the re-plays.** Step 1 graded the other seed set by re-playing each breaching arm
 *    with its base, `--step 1 --arms <arm>,<base> --seed-set 2` (step-1 plan §9.4), which grades the
 *    pair with `replaySeedSet` 2. The six set-2 records step 2 reads (A0, A1, A5, A9, A11, A14) are
 *    committed verbatim from step 1's cache (`test/fixtures/adr089-step1-set2/`, copied from
 *    `data-cache/pocket-step1/7689307642ed08e0/`, which is gitignored), each with its stamp. Re-graded
 *    as step 1 graded them, the pairs A1-A0, A5-A0, A9-A0 and A11-A14 give F.6's committed guard rows
 *    (ADR-089 F.6, "the 14 re-play records"), and grades, groups and reports equal to the re-plays' own
 *    outputs (`measure/replay/<arm>-<base>-set2.{json,md}` in the Orchestrator's step-1 working
 *    folder, not committed; their digests are pinned below, measured from those files).
 *
 * **Line 130** (F.9 item 3, C3-10 option b). The committed step-1 report is never regenerated. Step
 * 2 corrects the guard section's SE note at `report.ts`'s renderer (K3's harness commit); then
 * `LINE_130`, and only it, changes to the corrected text, so the rendered report must equal the
 * committed one everywhere else. The re-plays' reports carry the same note, so their check puts the
 * committed note back on that one line before hashing.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { ARM_IDS, armById, type ArmId } from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { loadFiled, STEP0_FILED_DIGEST, type FiledFile } from "../src/pocket/filed.js";
import type { League, Step1GuardRow } from "../src/pocket/report.js";
import { sanitize } from "../src/pocket/step0.js";
import {
  FULL_CORPUS,
  gradeStep1,
  jsonText,
  renderStep1Report,
  stampOf,
  stampProblems,
  STEP1_ARM_FORMAT,
  STEP1_MEASURES_FORMAT,
  type ArmRecord,
  type ArmRecords,
  type Step1Stamp,
} from "../src/pocket/step1.js";

const PKG = join(import.meta.dirname, "..");
const STEP1_JSON = join(PKG, "reports", "adr-089-step1.json");
const STEP1_MD = join(PKG, "reports", "adr-089-step1.md");
const SET2_DIR = join(PKG, "test", "fixtures", "adr089-step1-set2");
const ADR_PATH = join(PKG, "..", "..", "docs", "decisions", "ADR-089-the-pocket-on-a-real-clock.md");

/** Step 1's source fingerprint: every record, committed or in the fixture, was played on it (`0a2eb41`). */
const STEP1_FINGERPRINT = "7689307642ed08e0";
const STEP1_COMMIT = "0a2eb415d237fe4075e0965a21d945b2f4a66476";

/**
 * Line 130 of the step-1 report as this build must render it: the guard section's SE note. Today it
 * is the committed line. K3's harness commit (F.9 item 3) replaces this constant, and only this, with
 * the corrected wording (step-2 plan §5).
 */
const LINE_130 =
  "Each verdict is the filed rule, the rise at most the mix-predicted rise. Beside it, as context for the owner and never as the verdict: SE is binomial, the two arms read as independent (they share seeds, so it reads high), in points per 100 aimed throws, and z = (rise - allowed) / SE.";
const LINE_130_INDEX = 129;

/** The set-2 records the fixture holds (step-2 plan §4.5: A9 for AM-1's test cases). */
const SET2_ARMS: readonly ArmId[] = ["A0", "A1", "A5", "A9", "A11", "A14"];

/**
 * `stableDigest` of each set-2 record as step 1's re-plays wrote it (`arms.<id>` of
 * `measure/replay/<arm>-<base>-set2.json`; A0's is the same in all three of its re-plays).
 */
const SET2_RECORD_DIGESTS: Readonly<Record<string, string>> = {
  A0: "fnv1a:6d8279c9",
  A1: "fnv1a:92cfc345",
  A5: "fnv1a:75953e23",
  A9: "fnv1a:73d682f4",
  A11: "fnv1a:2a5b72bd",
  A14: "fnv1a:aa56784a",
};

/**
 * The four re-plays the fixture reproduces. `grade` and `groups` are `stableDigest` of the
 * re-play's `--out` file's `grade` and `groups`; `md` is the sha256 of its `--report` file.
 */
const REPLAYS: readonly { readonly arm: ArmId; readonly base: ArmId; readonly grade: string; readonly groups: string; readonly md: string }[] = [
  { arm: "A1", base: "A0", grade: "fnv1a:fe7b8e30", groups: "fnv1a:86cf7e6c", md: "749a8a90857e1c9d23b970130658484c311b4a2945dc3716c29650401094ff21" },
  { arm: "A5", base: "A0", grade: "fnv1a:a5b47c41", groups: "fnv1a:a962e4fe", md: "52b9ab9d33545c43dc4eb77d8be4060ceddfd1fe5a17d252b80fb399a7ba5c33" },
  { arm: "A9", base: "A0", grade: "fnv1a:e686ddb3", groups: "fnv1a:bc4f02f8", md: "25580108553046e5b34ca1ec088dcefccb638e5a6d68c556f55b5584a81c8803" },
  { arm: "A11", base: "A14", grade: "fnv1a:e39e844b", groups: "fnv1a:f1c6f2ca", md: "50cdc7eb9c11354fc900c3c5e116b35366a74bd74f7e001c3c06d572b8b30d92" },
];

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const filing = (): FiledFile => loadFiled(join(PKG, FILED_PATH));

interface Step1Measures {
  readonly format: string;
  readonly filedDigest: string;
  readonly fingerprint: string;
  readonly replaySeedSet?: number;
  readonly arms: Readonly<Record<string, ArmRecord>>;
  readonly grade: unknown;
  readonly groups: unknown;
}

const committedJsonText = (): string => readFileSync(STEP1_JSON, "utf8");
const committedMeasures = (): Step1Measures => JSON.parse(committedJsonText()) as Step1Measures;
const committedLines = (): string[] => readFileSync(STEP1_MD, "utf8").split("\n");
const set2Record = (id: ArmId): ArmRecord => JSON.parse(readFileSync(join(SET2_DIR, `${id}.set2.json`), "utf8")) as ArmRecord;

/** The stamp this build gives the record's arm, on the record's own environment: every field but commit and dirty must agree. */
function stampDrift(record: ArmRecord): readonly string[] {
  const s: Step1Stamp = record.stamp;
  return stampProblems(s, stampOf(s.arm, s.seedSet, { fingerprint: s.fingerprint, commit: s.commit, dirty: s.dirty, node: s.node }, FULL_CORPUS));
}

/** The first line at which two texts differ, for a readable failure; -1 when every line agrees. */
function firstDifference(got: readonly string[], want: readonly string[]): number {
  const n = Math.max(got.length, want.length);
  for (let i = 0; i < n; i += 1) if (got[i] !== want[i]) return i;
  return -1;
}

const signed = (v: number | null): string => (v === null ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}`);

/** One league's cell of F.6's re-play table: rise / allowed / SE / z, the league-wide verdict, the classes that breach. */
const f6Cell = (g: Step1GuardRow): string =>
  `${g.mix.rise.toFixed(2)} / ${g.mix.allowed.toFixed(2)} / ${g.mixNoise.se.toFixed(2)} / ${signed(g.mixNoise.z)}, ${g.mix.passes ? "passes" : "BREACH"}; ${g.byClass.breaches.join(", ")}`;

describe("ADR-089 step 2, Q-2b: step 1's committed grading, re-graded by this build", () => {
  describe("seed set 1: the committed run (reports/adr-089-step1.json and .md)", () => {
    it("holds the 17 step-1 records, each on its arm's own seed set, each stamped as this build stamps that arm", () => {
      const m = committedMeasures();
      expect(m.format).toBe(STEP1_MEASURES_FORMAT);
      expect(m.filedDigest).toBe(STEP0_FILED_DIGEST);
      expect(m.fingerprint).toBe(STEP1_FINGERPRINT);
      expect("replaySeedSet" in m).toBe(false);
      expect(Object.keys(m.arms)).toEqual([...ARM_IDS]);
      for (const id of ARM_IDS) {
        const r = m.arms[id]!;
        expect(r.format, id).toBe(STEP1_ARM_FORMAT);
        expect(r.stamp.arm, id).toBe(id);
        expect(r.stamp.seedSet, id).toBe(armById(id).seedSet);
        expect(r.stamp.fingerprint, id).toBe(STEP1_FINGERPRINT);
        expect(stampDrift(r), `${id}: the committed record is not this build's arm`).toEqual([]);
      }
    });

    it("gradeStep1 reproduces the committed grade and groups, and the committed .json byte for byte", () => {
      const m = committedMeasures();
      const records: ArmRecords = new Map(Object.entries(m.arms) as [ArmId, ArmRecord][]);
      const grade = gradeStep1(records, filing());
      expect(sanitize(grade.sections)).toEqual(m.grade);
      expect(sanitize(grade.groups)).toEqual(m.groups);
      // Key order too: the measures file as `runStep1` writes it (`--out`), byte for byte.
      const measures = { format: STEP1_MEASURES_FORMAT, filedDigest: STEP0_FILED_DIGEST, fingerprint: STEP1_FINGERPRINT, arms: Object.fromEntries(records), grade: grade.sections, groups: grade.groups };
      const text = jsonText(sanitize(measures));
      expect(text === committedJsonText(), "the re-graded measures file differs from reports/adr-089-step1.json").toBe(true);
      // The committed grade is step 1's verdict (F.6): no structural failure, and on the first set
      // 28 of 28 arm-league guard verdicts breach.
      expect(grade.sections.outcome.structuralFailures).toEqual([]);
      expect(grade.sections.outcome.guardBreaches).toHaveLength(28);
      expect(grade.sections.outcome.mergeCard).toBe(false);
    });

    it("renderStep1Report reproduces reports/adr-089-step1.md byte for byte, with line 130 equal to LINE_130", () => {
      const m = committedMeasures();
      const records: ArmRecords = new Map(Object.entries(m.arms) as [ArmId, ArmRecord][]);
      const committed = committedLines();
      // The committed report is never regenerated: its line 130 is step 1's SE note.
      expect(committed[LINE_130_INDEX]).toMatch(/^Each verdict is the filed rule, the rise at most the mix-predicted rise\. .*SE is binomial, the two arms read as independent/);
      const want = [...committed];
      want[LINE_130_INDEX] = LINE_130;
      const got = renderStep1Report(gradeStep1(records, filing()), records).split("\n");
      const at = firstDifference(got, want);
      expect(at, at < 0 ? "" : `first difference at line ${String(at + 1)}:\n  rendered:  ${got[at] ?? "(none)"}\n  committed: ${want[at] ?? "(none)"}`).toBe(-1);
      expect(got.join("\n")).toBe(want.join("\n"));
    });
  });

  describe("seed set 2: the re-plays, from the committed set-2 fixture", () => {
    it("the fixture holds exactly the six set-2 records, each step 1's own, stamped as this build stamps that arm", () => {
      expect(readdirSync(SET2_DIR).sort()).toEqual(SET2_ARMS.map((id) => `${id}.set2.json`).sort());
      for (const id of SET2_ARMS) {
        const r = set2Record(id);
        expect(r.format, id).toBe(STEP1_ARM_FORMAT);
        expect(r.stamp.arm, id).toBe(id);
        expect(r.stamp.seedSet, id).toBe(2);
        expect(r.stamp.fingerprint, id).toBe(STEP1_FINGERPRINT);
        expect(r.stamp.commit, id).toBe(STEP1_COMMIT);
        expect(r.stamp.dirty, id).toBe(false);
        expect(r.stamp.corpus, id).toEqual({ flatFirst: null, genThroughWeek: null });
        expect(stableDigest(r), `${id}: not the record step 1's re-plays graded`).toBe(SET2_RECORD_DIGESTS[id]);
        expect(stampDrift(r), `${id}: the set-2 record is not this build's arm`).toEqual([]);
      }
    });

    const adrF6 = (): readonly string[] => {
      const lines = readFileSync(ADR_PATH, "utf8").split("\n");
      const from = lines.indexOf("### F.6 Every arm against its clause");
      const to = lines.indexOf("### F.7 The proofs, with times");
      expect(from, "ADR-089 holds F.6").toBeGreaterThan(0);
      expect(to, "F.7 follows F.6").toBeGreaterThan(from);
      return lines.slice(from, to).map((l) => l.trim());
    };

    it.each(REPLAYS.map((r) => [`${r.arm} against ${r.base}`, r] as const))(
      "%s on seed set 2, graded as step 1 graded it, gives F.6's row and the re-play's own grade, groups and report",
      (_label, replay) => {
        // `--arms <arm>,<base> --seed-set 2`: the pair, in the arm table's order, graded with replaySeedSet 2.
        const ids = ARM_IDS.filter((id) => id === replay.arm || id === replay.base);
        const records: ArmRecords = new Map(ids.map((id) => [id, set2Record(id)] as const));
        const grade = gradeStep1(records, filing(), 2);
        expect(grade.sections.replaySeedSet).toBe(2);
        expect(grade.sections.clauses.every((c) => c.id.startsWith("guard."))).toBe(true);
        expect(grade.sections.outcome.structuralFailures).toEqual([]);
        expect(grade.sections.outcome.mergeCard).toBe(false);

        // F.6's committed row for this re-play, cell for cell.
        const rows = grade.sections.guard.filter((g) => g.arm === replay.arm && g.base === replay.base);
        const cell = (league: League): string => f6Cell(rows.find((g) => g.league === league)!);
        expect(rows.map((g) => g.league).sort()).toEqual(["flat", "gen"]);
        const row = `| ${replay.arm} | ${replay.base}, set 2 | ${cell("flat")} | ${cell("gen")} |`;
        expect(adrF6(), `F.6 has no row ${row}`).toContain(row);

        // The re-play's own outputs: its --out file's grade and groups, its --report file.
        expect(stableDigest(sanitize(grade.sections))).toBe(replay.grade);
        expect(stableDigest(sanitize(grade.groups))).toBe(replay.groups);
        const lines = renderStep1Report(grade, records).split("\n");
        const noteAt = lines.flatMap((l, i) => (l === LINE_130 ? [i] : []));
        expect(noteAt, "the re-play's report prints the guard section's SE note once").toHaveLength(1);
        lines[noteAt[0]!] = committedLines()[LINE_130_INDEX]!;
        expect(sha256(lines.join("\n"))).toBe(replay.md);
      },
    );
  });
});
