/**
 * ADR-089 step 6: THE SMOKE (step-6 plan 10.1 item 8; check.md S-2 and the Orchestrator's ruling 3).
 *
 * The smoke runs before the bundle is recorded (item 9), and until then the gate's item 5 refuses
 * `pocket -- --step 6`, so the smoke is this test and not a flag of the command (a flag would need a
 * gate bypass). It plays H0, built under AM-13's answers, on the generated league's weeks 1 and 2 of
 * seed set 1 through the harness's own per-arm play-and-fold path (`playStep6Arm`: step 4's record
 * through step 5's play, with step 5's folds and step 6's on every game: the rows, the counts, the
 * proofs S-11 to S-20, S-14 on its agreement arm, M5's games and the movement cross-check). The
 * harness plays both leagues, so the flat league's first 32 games (weeks 1 and 2 of its round robin)
 * come with them. Nothing is written: no cache (`runStep6` takes no corpus, and refuses one) and no
 * record; the record stays in memory.
 *
 * It holds that no fold threw, that every proof read on both leagues has no fault, that the grade's
 * proofs and fold checks over H0 alone fail nothing (the grade of a partial run, every clause H0 does
 * not play alone NOT PLAYED), and that every structural counter of steps 1 to 5 the record carries
 * counts 0 but step 2's arrival and witness folds (check-fix.md CF-2; `UNASSERTED` says why); it prints
 * what it read: the games, the pass plays, the dropbacks, the plays the step-6 reading read, the escape
 * rolls and the escapes won, the deadline picks, the throwaways by cause, the sacks, the plays each
 * proof read and the two unasserted counters.
 *
 * Seed set 1 only (CHOSEN by fix-1's rule, set 2 too only if the whole test stays under about a
 * minute): set 1 alone played in about 33 to 34 s and the whole test took about 39 to 40 s in the
 * scratch copy (MEASURED, two runs, fix-1's stage note), so set 2 would take it past a minute.
 *
 * The answers: the committed AM-13's once AM-13 is filed (the committed amendments file, read at its
 * pin), and until then the stand-in AM-13 (`s6StandIn.ts`) with the recommended answers, on a scratch
 * copy; it prints which it used. Like `pocketStep6Lifted.test.ts` it is skipped while a petition its
 * arm waits on is out of contracts (`step6PetitionsOut`: P9 to P12 and P20, in since the lift, and P21
 * on an UNSEEN answer). Before the lift it was run in a scratch copy of the tree with the petition
 * flags set true (fix-1's stage note: its first runs found three harness faults, each fixed with its
 * own test, and then it passed); since the lift it plays on the build's own flags.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEAGUES, type League } from "../src/pocket/report.js";
import { POCKET_1_S5A_DIGEST, POCKET_1_S6_DIGEST, RECOMMENDED_OUTS_OPTIONS } from "../src/pocket/rules.js";
import { S6_PROOF_IDS, thirdsOf } from "../src/pocket/s6Checks.js";
import { gradeStep6, type Step6Record } from "../src/pocket/s6Grade.js";
import type { Step1Corpus, Step1Env } from "../src/pocket/step1.js";
import { buildStep6Arms, playStep6Arm, preflightStep6, STEP6_RECORDS, step6GateState, step6PetitionsOut } from "../src/pocket/step6.js";
import { AMEND, FILED, PKG, standInFile } from "./s6StandIn.js";

/** The smoke's corpus (CHOSEN): the generated league through week 2, and the flat league's first 32 games. */
const SMOKE_CORPUS: Step1Corpus = Object.freeze({ flatFirst: 32, genThroughWeek: 2 });
/** No record is made, so the build's fingerprint is not read: the stamp says smoke, on a dirty tree. */
const SMOKE_ENV: Step1Env = Object.freeze({ fingerprint: "smoke", commit: "smoke", dirty: true, node: process.version });

const gate = step6GateState();
/** AM-13 is filed once the committed amendments file's step-6 view carries its readings. */
const filed = gate.readings !== undefined;
const seen = filed ? (gate.readings?.answers as { readonly seen?: unknown } | undefined)?.seen : RECOMMENDED_OUTS_OPTIONS.seen;
const waiting = step6PetitionsOut(seen);

/** What the cache directory and the step-6 records hold, to show the smoke wrote neither. */
function written(): string {
  const cache = join(PKG, "data-cache", "pocket-step6");
  const records = STEP6_RECORDS.map((r) => join(PKG, r)).map((p) => (existsSync(p) ? `${p} ${String(statSync(p).size)} ${String(statSync(p).mtimeMs)}` : `${p} none`));
  return JSON.stringify({ cache: existsSync(cache) ? readdirSync(cache, { recursive: true }).map(String).sort() : null, records });
}

/** The counters a structural fold keeps: its problems, a monotone fold's, and the offered picks' faults. */
const COUNTER_KEYS: ReadonlySet<string> = new Set(["problemCount", "monotoneProblemCount", "offerFaults"]);

/** Every structural counter of steps 1 to 5 in a record (everything but its `s6`), by path. */
function inheritedCounters(r: Step6Record): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  const walk = (x: unknown, path: string): void => {
    if (x === null || typeof x !== "object" || Array.isArray(x)) return;
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
      if (COUNTER_KEYS.has(k) && typeof v === "number") out[`${path}.${k}`] = v;
      else walk(v, `${path}.${k}`);
    }
  };
  const { s6: _s6, ...rest } = r;
  void _s6;
  walk(rest, "record");
  return out;
}

/** The structural counters of steps 1 to 5 a step-6 record carries, on each league (check-fix.md CF-2: 30). */
const INHERITED_COUNTERS: readonly string[] = LEAGUES.flatMap((l) => [
  ...["windowTicks", "lToday", "margins", "beats", "approach"].map((f) => `record.s1.${l}.${f}.problemCount`),
  ...["liveSet", "mustAct", "mustAct.witness", "arrival", "warning"].map((f) => `record.s2.${l}.${f}.problemCount`),
  `record.s3.${l}.lateBlock.problemCount`,
  `record.s3.${l}.part1.problemCount`,
  `record.s3.${l}.part1.monotoneProblemCount`,
  `record.s4.${l}.s4.problemCount`,
  `record.s5.${l}.s5.picks.offerFaults`,
]);

/**
 * The inherited counters the smoke leaves unasserted (check-fix.md CF-2; the Orchestrator's ruling):
 * step 2's arrival and witness folds. They count on the trees before step 6 too, on this corpus
 * (MEASURED, check-fix.md CF-2: arrival flat 27 and gen 27 on F5, flat 26 and gen 28 on D1; witness gen
 * 1 on D1, 0 on F5), and they are stale from step 4 on (INFERRED, check-fix.md CF-2: their first
 * problems are plays that go on after an arrival, through a pocket_movement CHECK or a POCKET_DURESS
 * throwaway, which step 4's and 5's rules allow). Every other inherited counter counts 0 on the base
 * (MEASURED, check-fix.md CF-2) and is held to 0: a reader fault such as N9's would show there.
 */
const UNASSERTED = /^record\.s2\.(flat|gen)\.(arrival|mustAct\.witness)\.problemCount$/;

/** The counts the smoke prints for one league (MEASURED by its folds). */
function countsOf(r: Step6Record, l: League): Readonly<Record<string, unknown>> {
  const c = r.s6[l].counts;
  const sum = (prefix: string): number => Object.entries(c).filter(([k]) => k.startsWith(prefix)).reduce((a, [, v]) => a + v, 0);
  return {
    games: r.measures[l].games,
    passPlays: r.s1[l].margins.plays,
    dropbacks: c["dropbacks"] ?? 0,
    s6Plays: c["s6Plays"] ?? 0,
    escapeRolls: sum("rolls.outcome."),
    escapesWon: r.s6[l].rows.drill.escapesWon,
    deadlinePicks: { THROWAWAY: c["deadline.THROWAWAY"] ?? 0, RUN: c["deadline.RUN"] ?? 0 },
    throwawaysByCause: r.s6[l].pocket?.throwawaysByCause ?? null,
    sacks: c["sacks"] ?? 0,
    failedScrambleSacks: c["sacks.failedScramble"] ?? 0,
    checked: Object.fromEntries(S6_PROOF_IDS.map((p) => [p, r.s6[l].checked[p] ?? 0])),
  };
}

describe.skipIf(waiting.length > 0)(`ADR-089 step 6: the smoke, H0 on the generated league's weeks 1 and 2 through the harness's own play-and-fold path${waiting.length > 0 ? ` (skipped while ${waiting.join(", ")} wait)` : ""}`, () => {
  it(
    "plays every fold with no exception and no structural failure, writes nothing, and prints what it read",
    () => {
      const scratch = mkdtempSync(join(tmpdir(), "pocket-step6-smoke-"));
      try {
        const before = written();
        const used = filed ? "the committed AM-13" : "the stand-in AM-13 (s6StandIn.ts) with the recommended answers";
        let pre: ReturnType<typeof preflightStep6>;
        if (filed) pre = preflightStep6(FILED, AMEND);
        else {
          const si = standInFile(scratch);
          pre = preflightStep6(FILED, si.path, { pin: si.pin });
          expect(pre.guard.answers).toEqual(RECOMMENDED_OUTS_OPTIONS);
        }
        const { file, guard } = pre;
        const arm = buildStep6Arms(guard.answers).get("H0")!;
        const lines: string[] = [];
        const t0 = Date.now();
        let r: Step6Record | undefined;
        expect(() => {
          r = playStep6Arm("H0", 1, SMOKE_ENV, { corpus: SMOKE_CORPUS, log: (l) => lines.push(l), amendments: guard.digest, classify: guard.classify, arm, thirdOf: thirdsOf(1) });
        }, "a fold threw").not.toThrow();
        const ms = Date.now() - t0;
        const record = r!;
        expect(record.stamp.corpus).toEqual(SMOKE_CORPUS);
        expect(lines).toEqual(["pocket step 6: H0 flat seed set 1, 32 games", "pocket step 6: H0 gen seed set 1, 32 games"]);
        for (const l of LEAGUES) {
          for (const p of S6_PROOF_IDS) expect(record.s6[l].faults[p], `${l} ${p}: ${(record.s6[l].faults[p]?.first ?? []).join(" | ")}`).toEqual({ n: 0, first: [] });
          // Every dropback is a play the step-6 reading read, and S-14 read each of them.
          expect(record.s6[l].counts["s6Plays"], l).toBe(record.s6[l].counts["dropbacks"]);
          expect(record.s6[l].checked["S-14"], l).toBe(record.s6[l].counts["dropbacks"]);
          expect(record.s6[l].rows.wholePlayPocketDisagreements, l).toBe(0);
        }
        // The grade's proofs and fold checks over H0 alone (every other clause reads NOT PLAYED, and is not the smoke's).
        const g = gradeStep6({ records: new Map([["H0", { 1: record }]]), file, guard, oneSet: 1, s5aDigest: POCKET_1_S5A_DIGEST, s6Digest: POCKET_1_S6_DIGEST });
        const failing = g.sections.proofs.filter((p) => p.verdict === "FAIL").map((p) => `${p.id}: ${p.detail}`);
        expect(failing, failing.join(" | ")).toEqual([]);
        // CF-2: every structural counter of steps 1 to 5 the record carries is 0, but the two UNASSERTED.
        const inherited = inheritedCounters(record);
        expect(Object.keys(inherited).sort()).toEqual([...INHERITED_COUNTERS].sort());
        const held = Object.entries(inherited).filter(([path]) => !UNASSERTED.test(path));
        expect(held).toHaveLength(INHERITED_COUNTERS.length - 4);
        expect(held.filter(([, n]) => n !== 0), "an inherited structural counter that counts 0 on the base is not 0").toEqual([]);
        expect(written(), "the smoke wrote a cache or a record").toBe(before);
        const proofs = Object.fromEntries(g.sections.proofs.map((p) => [p.id, `${p.verdict} (${p.detail})`]));
        const unasserted = Object.fromEntries(Object.entries(inherited).filter(([path]) => UNASSERTED.test(path)));
        process.stdout.write(`pocketStep6Smoke H0 set 1 (${used}; answers ${JSON.stringify(guard.answers)}; ${String(ms)} ms): ${JSON.stringify({ flat: countsOf(record, "flat"), gen: countsOf(record, "gen"), proofs })}\n`);
        process.stdout.write(`pocketStep6Smoke H0 set 1, the unasserted inherited counters (CF-2): ${JSON.stringify(unasserted)}\n`);
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    },
    1_800_000,
  );
});
