#!/usr/bin/env node
/**
 * check-workspace-coverage — DECLARED coverage, not discovered coverage.
 *
 * WHY THIS EXISTS (ADR-038, Charter §4.1):
 *   `pnpm -r run <script>` runs the script in every package that HAS it and
 *   SILENTLY SKIPS every package that does not. It errors only when NO package
 *   has the script. So a recursive command reports success over whatever subset
 *   it happened to find, and a package that never declared the script is
 *   indistinguishable from one that passed.
 *
 *   That is not hypothetical. It is the most-repeated defect family in this repo:
 *     1. `pnpm -r exec tsc --noEmit` resolved each package's NEAREST tsconfig.json
 *        — `src` only — so the blocking CI gate never typechecked a test file
 *        outside @ff/playbook. A tautology (`status === "SACK"`, provably false by
 *        type after ADR-034) rendered green for exactly this reason.
 *     2. `pnpm -r run` skipping script-less packages — the naive repair for (1)
 *        would have rebuilt (1) one level up.
 *     3. Statistically, the same shape: a sweep quoting a RAW affected-play count
 *        where only the EXCLUSIVE count bounds the result (calibration.md §5.3).
 *
 *   The fix is never to enumerate better. It is to make the command know what it
 *   is SUPPOSED to cover and fail when it does not.
 *
 * WHY IT CHECKS `test` AND `build` TOO, NOT JUST `typecheck`:
 *   All eight packages happen to declare all three today, so `pnpm -r test` really
 *   does cover everything — right now. Nothing REQUIRES that. Package nine escapes
 *   in silence, which is the same defect latent rather than active. Requiring all
 *   three converts every recursive command from implicit to declared coverage at
 *   once.
 *
 * FAILURE MODE THIS DELIBERATELY ACCEPTS:
 *   It verifies a script is DECLARED, not that it does anything useful. A
 *   `"typecheck": "true"` would pass. That is a knowingly-drawn line: this guard
 *   closes the silent-skip class, and a lying script is a different (and loud,
 *   reviewable) failure. Charter §4.1's counter-corollary — deciding what NOT to
 *   guard is part of designing the guard.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every workspace package must declare these. */
const REQUIRED_SCRIPTS = ["build", "test", "typecheck"];

/**
 * Read the globs from pnpm-workspace.yaml rather than restating them here.
 * A restated constant is a copy that will drift (Charter §4.1) — if someone adds
 * `tools/*` to the workspace, this must follow it without being edited.
 */
function workspaceGlobs() {
  const yaml = readFileSync(join(REPO_ROOT, "pnpm-workspace.yaml"), "utf8");
  const packagesBlock = yaml.match(/^packages:\s*$([\s\S]*?)(?=^\S|\Z)/m);
  if (!packagesBlock) {
    throw new Error(
      "pnpm-workspace.yaml has no `packages:` block, or its shape changed. " +
        "This script reads the globs rather than restating them; fix the reader, " +
        "do not hardcode a list here.",
    );
  }
  const globs = [...packagesBlock[1].matchAll(/^\s*-\s*["']?([^"'\n]+)["']?\s*$/gm)].map(
    (m) => m[1].trim(),
  );
  if (globs.length === 0) {
    throw new Error("pnpm-workspace.yaml declares no package globs — refusing to check nothing.");
  }
  return globs;
}

/** Only the `dir/*` shape is supported; anything else must fail loudly, not silently match zero. */
function resolveGlob(glob) {
  const match = glob.match(/^([^*]+)\/\*$/);
  if (!match) {
    throw new Error(
      `Unsupported workspace glob ${JSON.stringify(glob)}. This checker understands ` +
        `only "dir/*". Extend it deliberately — an unsupported glob matching nothing ` +
        `is exactly the silent under-coverage this script exists to prevent.`,
    );
  }
  const base = join(REPO_ROOT, match[1]);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(base, e.name))
    .filter((dir) => existsSync(join(dir, "package.json")));
}

const packageDirs = workspaceGlobs().flatMap(resolveGlob).sort();

if (packageDirs.length === 0) {
  console.error("No workspace packages found. Refusing to report success over an empty set.");
  process.exit(1);
}

const failures = [];
for (const dir of packageDirs) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const scripts = pkg.scripts ?? {};
  const missing = REQUIRED_SCRIPTS.filter((s) => typeof scripts[s] !== "string");
  if (missing.length > 0) {
    failures.push({ name: pkg.name ?? dir, dir, missing });
  }
}

if (failures.length > 0) {
  console.error("\n  WORKSPACE COVERAGE CHECK FAILED\n");
  console.error(
    "  `pnpm -r run <script>` SILENTLY SKIPS packages that do not declare the script,\n" +
      "  so a recursive command would report success over a set it quietly narrowed.\n" +
      "  Every workspace package must declare: " +
      REQUIRED_SCRIPTS.join(", ") +
      "\n",
  );
  for (const f of failures) {
    console.error(`    ${f.name} — missing: ${f.missing.join(", ")}  (${f.dir})`);
  }
  console.error(
    "\n  Add the missing scripts. If a package genuinely cannot support one, that is a\n" +
      "  deliberate exception and belongs in an ADR plus an explicit allow-list here —\n" +
      "  not in this script's silence.\n",
  );
  process.exit(1);
}

console.log(
  `workspace coverage OK — ${packageDirs.length} packages each declare ${REQUIRED_SCRIPTS.join(", ")}`,
);
