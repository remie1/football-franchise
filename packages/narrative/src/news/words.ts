/**
 * Turning a story's facts into a headline (ADR-082).
 *
 * The wording itself is content, in `../content/headlines.json`, so tone can be revised without
 * touching any rule (Spec #7 §2). This file only picks a line and fills it in.
 */
import type { Rng } from "@ff/contracts";
import content from "../content/headlines.json";

export type Tone = "straight" | "punchy";
export type Facts = Readonly<Record<string, string | number>>;

export interface Lines {
  readonly straight: readonly string[];
  readonly punchy: readonly string[];
}

export interface Wording {
  /** How often a headline is written punchy rather than straight (owner's Q6: a mix). */
  readonly punchyShare: number;
  /** Story kind, or "KIND.flavor" for a variant of it → its lines. */
  readonly stories: Readonly<Record<string, Lines>>;
}

export const WORDING: Wording = content as Wording;

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
];
const ORDINALS = [
  "zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth",
  "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth",
  "seventeenth", "eighteenth", "nineteenth", "twentieth",
];

/** 6 → "six"; past twenty, digits. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** 6 → "sixth"; past twenty, "21st", "22nd", "23rd", "24th"... */
export function ordinalWord(n: number): string {
  const word = ORDINALS[n];
  if (word !== undefined) return word;
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

/** The `{name}` placeholders in a line. */
export function placeholders(line: string): string[] {
  return [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}

/** Fill a line from the facts. A placeholder with no fact is a content error and throws. */
export function fill(line: string, facts: Facts): string {
  return line.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = facts[name];
    if (v === undefined) throw new Error(`news: "${line}" needs {${name}}, which this story doesn't have`);
    return String(v);
  });
}

/** The lines for a story: its flavor's when it has its own, otherwise the kind's. */
export function linesFor(kind: string, flavor?: string, wording: Wording = WORDING): Lines {
  const lines = (flavor !== undefined ? wording.stories[`${kind}.${flavor}`] : undefined) ?? wording.stories[kind];
  if (lines === undefined) throw new Error(`news: no headlines are written for ${kind}`);
  return lines;
}

/**
 * Write one headline: the tone first (punchy with `punchyShare`), then a line of that tone not
 * already used in this edition while one is left.
 */
export function writeHeadline(
  kind: string, facts: Facts, rng: Rng, used: Set<string>,
  flavor?: string, wording: Wording = WORDING,
): string {
  const lines = linesFor(kind, flavor, wording);
  const wanted: Tone = rng.next() < wording.punchyShare ? "punchy" : "straight";
  const pool = lines[wanted].length > 0 ? lines[wanted] : lines[wanted === "punchy" ? "straight" : "punchy"];
  const fresh = pool.filter((l) => !used.has(l));
  const line = rng.pick(fresh.length > 0 ? fresh : pool);
  used.add(line);
  return fill(line, facts);
}
