#!/usr/bin/env node
/**
 * `pnpm verify` — THE ONE COMMAND.
 *
 * WHY THIS EXISTS. Habit 9 named three commands and was amended twice, and the
 * verification still landed incomplete a third time — each time correct in form and
 * short in a NEW way:
 *
 *   1. ran `pnpm -r build` and called it "the full workspace suite". Build runs no tests.
 *   2. ran `pnpm -r test` piped through `tail`, which takes the PIPE's exit status and
 *      hides every package but the last.
 *   3. ran build and test but not `typecheck`, and shipped a tree where six files failed
 *      to compile (ADR-056 narrowed a union; the dead comparisons only tsc could see).
 *
 * The naming was not the defect. A LIST IS SOMETHING A PERSON EXECUTES FROM MEMORY, and
 * all three misses shared that condition. So this converts the habit into a field:
 * after this, habit 9 names ONE command, and "verify passed" is a claim that cannot be
 * partially true.
 *
 * WHAT IT GUARANTEES
 *   - all three steps, in order, always
 *   - stops at the first non-zero exit — a later step cannot mask an earlier failure
 *   - this process's own exit code IS the verdict; there is no pipe to lose it in
 *   - a summary line per package, so a green claim is legible rather than asserted
 *
 * It deliberately does NOT accept a "skip" or "only" flag. A partial verification that
 * reports through this script would recreate exactly the ambiguity it exists to remove.
 */
import { spawn } from "node:child_process";

const STEPS = [
  { name: "build", script: "build" },
  { name: "test", script: "test" },
  { name: "typecheck", script: "typecheck" },
];

/** Lines worth echoing at the end: per-package verdicts and anything that failed. */
const SUMMARY = /(Test Files\s+\d)|((?:build|test|typecheck):\s+(?:Done|Failed))|(error TS\d+)|(ELIFECYCLE|ERR_PNPM)/;

const strip = (s) => s.replace(/\[[0-9;]*m/g, "");

function run(step) {
  return new Promise((resolve) => {
    const child = spawn(`pnpm run ${step.script}`, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
    const lines = [];
    const take = (buf) => {
      process.stdout.write(buf);
      for (const line of strip(String(buf)).split(/\r?\n/)) {
        if (SUMMARY.test(line)) lines.push(line.trim());
      }
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("close", (code) => resolve({ code: code ?? 1, lines }));
  });
}

const results = [];
let failed = null;

for (const step of STEPS) {
  process.stdout.write(`\n─── verify: ${step.name} ───\n`);
  const { code, lines } = await run(step);
  results.push({ step: step.name, code, lines });
  if (code !== 0) {
    failed = step.name;
    break;
  }
}

process.stdout.write(`\n${"═".repeat(64)}\n  VERIFY SUMMARY\n${"═".repeat(64)}\n`);
for (const r of results) {
  process.stdout.write(`\n  ${r.step}  →  exit ${r.code}\n`);
  for (const line of r.lines) process.stdout.write(`      ${line}\n`);
}

if (failed !== null) {
  const skipped = STEPS.slice(STEPS.findIndex((s) => s.name === failed) + 1).map((s) => s.name);
  process.stdout.write(`\n  ⛔ FAILED at "${failed}".\n`);
  if (skipped.length > 0) {
    // Stated rather than silent: an unrun step is not a passing step.
    process.stdout.write(`  ⛔ NOT RUN: ${skipped.join(", ")} — these are UNKNOWN, not green.\n`);
  }
  process.stdout.write(`${"═".repeat(64)}\n`);
  process.exit(1);
}

process.stdout.write(`\n  ✅ build, test, typecheck — all three, exit 0.\n${"═".repeat(64)}\n`);
