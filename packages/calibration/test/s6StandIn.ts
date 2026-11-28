/**
 * ADR-089 step 6: STAND-IN AMENDMENTS FILES for the harness's tests (step-6 plan §4.2, §10.3).
 *
 * AM-13, step 6's readings, waits on the owner's three answers, and `STEP6_AMENDMENTS_PIN` waits on
 * AM-13, so no committed file opens step 6's preflight. A test writes a copy of the committed file
 * under its own scratch directory with a stand-in AM-13 (the shape `pocketStep6K0.test.ts` reads,
 * carrying the answers the test gives, never a recorded answer), edits the copy where it reads a
 * refusal, and passes the copy's step-6 view digest as the preflight's pin. The committed file is only
 * read.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, type AmendmentsFile } from "../src/pocket/amendments.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { RECOMMENDED_OUTS_OPTIONS, type OutsOptions } from "../src/pocket/rules.js";

export const PKG = join(import.meta.dirname, "..");
export const FILED = join(PKG, FILED_PATH);
export const AMEND = join(PKG, AMENDMENTS_PATH);

/** The committed amendments file, parsed (a fresh copy each call). */
export type MutableAmendments = { format: string; adr: string; filing: string; entries: Record<string, unknown>[] };
export const committedAmendments = (): MutableAmendments => JSON.parse(readFileSync(AMEND, "utf8")) as MutableAmendments;

/** A stand-in AM-13 carrying `answers` in its `ownersWord` (no recorded answer: a test's own). */
export function standInAm13(answers: unknown = RECOMMENDED_OUTS_OPTIONS, extra: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    supersedes: [],
    untouched: [],
    defaults: [],
    adrLines: [946],
    cites: [],
    reason: "a stand-in for step 6's readings, written by a test",
    id: "AM-13",
    name: "stand-in",
    filedBeforeStep: "6",
    steps: ["6", "5b"],
    record: "J.11",
    ownersWord: { ts: "2026-11-28T00:00:00Z", answers },
    rule: { readings: {} },
    ...extra,
  };
}

let written = 0;

/**
 * Writes the committed file with a stand-in AM-13 (unless `am13` is false) under `dir`, edited by
 * `edit`, and returns its path and its step-6 view's digest (the pin a test passes the preflight).
 */
export function standInFile(dir: string, o: { readonly answers?: OutsOptions | unknown; readonly am13?: boolean; readonly edit?: (j: MutableAmendments) => void; readonly text?: string } = {}): { readonly path: string; readonly pin: string } {
  const j = committedAmendments();
  if (o.am13 !== false) j.entries.push(standInAm13(o.answers === undefined ? RECOMMENDED_OUTS_OPTIONS : o.answers));
  o.edit?.(j);
  written += 1;
  const path = join(dir, `amendments-${String(written)}.json`);
  writeFileSync(path, o.text ?? `${JSON.stringify(j, null, 2)}\n`);
  return { path, pin: amendmentsDigest(amendmentsAtStep(j as unknown as AmendmentsFile, "6")) };
}

/** An entry of a parsed file, by id. */
export function entry(j: MutableAmendments, id: string): Record<string, unknown> {
  const e = j.entries.find((x) => x["id"] === id);
  if (e === undefined) throw new Error(`no ${id}`);
  return e;
}
