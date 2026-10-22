/**
 * THE WORDING FILE (ADR-082). Content can be edited without touching a rule, so these tests are
 * what catches a typo in it: every story has both tones, and every placeholder is a fact its
 * story actually provides.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import { STORY_FACTS } from "../src/news/stories.js";
import { WORDING, fill, linesFor, numberWord, ordinalWord, placeholders, writeHeadline, type Wording } from "../src/news/words.js";

describe("the wording file", () => {
  it("writes straight and punchy lines for every story kind", () => {
    for (const kind of Object.keys(STORY_FACTS)) {
      const lines = linesFor(kind);
      expect(lines.straight.length, kind).toBeGreaterThan(0);
      expect(lines.punchy.length, kind).toBeGreaterThan(0);
    }
  });

  it("uses only placeholders the story provides, and names only known kinds", () => {
    for (const [key, lines] of Object.entries(WORDING.stories)) {
      const kind = key.split(".")[0]!;
      const facts = STORY_FACTS[kind];
      expect(facts, `${key} is not a story kind`).toBeDefined();
      for (const line of [...lines.straight, ...lines.punchy]) {
        for (const p of placeholders(line)) expect(facts, `${key}: "${line}"`).toContain(p);
      }
    }
  });

  it("puts no \"a\" or \"an\" right before a placeholder, since the right one depends on the value", () => {
    for (const lines of Object.values(WORDING.stories)) {
      for (const line of [...lines.straight, ...lines.punchy]) expect(line).not.toMatch(/\ban? \{/i);
    }
  });

  it("has no line twice within a story", () => {
    for (const [key, lines] of Object.entries(WORDING.stories)) {
      const all = [...lines.straight, ...lines.punchy];
      expect(new Set(all).size, key).toBe(all.length);
    }
  });

  it("mixes the tones (owner's Q6)", () => {
    expect(WORDING.punchyShare).toBeGreaterThan(0);
    expect(WORDING.punchyShare).toBeLessThan(1);
  });
});

describe("filling a line", () => {
  it("fills placeholders and refuses a missing fact", () => {
    expect(fill("{team} win {nth} straight", { team: "Bison", nth: "sixth" })).toBe("Bison win sixth straight");
    expect(() => fill("{team} win", {})).toThrow(/needs \{team\}/);
  });

  it("writes numbers the way a paper does", () => {
    expect([1, 4, 12, 20].map(numberWord)).toEqual(["one", "four", "twelve", "twenty"]);
    expect(numberWord(21)).toBe("21");
    expect([1, 2, 3, 6, 20].map(ordinalWord)).toEqual(["first", "second", "third", "sixth", "twentieth"]);
    expect([21, 22, 23, 24, 111, 112].map(ordinalWord)).toEqual(["21st", "22nd", "23rd", "24th", "111th", "112th"]);
  });

  it("prefers a flavor's own lines, and falls back to the kind's", () => {
    expect(linesFor("SHOWDOWN", "tied")).toBe(WORDING.stories["SHOWDOWN.tied"]);
    expect(linesFor("SHOWDOWN", "no-such-flavor")).toBe(WORDING.stories.SHOWDOWN);
    expect(() => linesFor("NO_SUCH_STORY")).toThrow(/no headlines/);
  });

  it("doesn't repeat a line within an edition while another is left", () => {
    const wording: Wording = { punchyShare: 0, stories: { X: { straight: ["a {t}", "b {t}"], punchy: ["c {t}"] } } };
    const used = new Set<string>();
    const rng = createRng("s", "words");
    const two = [writeHeadline("X", { t: 1 }, rng, used, undefined, wording), writeHeadline("X", { t: 2 }, rng, used, undefined, wording)];
    expect(two.map((h) => h[0]).sort()).toEqual(["a", "b"]);
    // Both straight lines used: a third may repeat one rather than fail.
    expect(["a 3", "b 3"]).toContain(writeHeadline("X", { t: 3 }, rng, used, undefined, wording));
  });

  it("writes punchy at punchyShare 1 and straight at 0", () => {
    const lines = { straight: ["s"], punchy: ["p"] };
    const rng = createRng("s", "tone");
    expect(writeHeadline("X", {}, rng, new Set(), undefined, { punchyShare: 1, stories: { X: lines } })).toBe("p");
    expect(writeHeadline("X", {}, rng, new Set(), undefined, { punchyShare: 0, stories: { X: lines } })).toBe("s");
  });
});
