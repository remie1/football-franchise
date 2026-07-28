/**
 * THE DEPENDENCY BOUNDARY, CHECKED MECHANICALLY.
 *
 * ADR-017 §Decision 3: `playbook → contracts` only. The engine does not depend on
 * playbook and playbook does not depend on the engine. ADR-017 §Impact lists this
 * as "one more mechanically auditable rule" for the guardian — so it is audited
 * here too, in the package's own suite, where it fails the moment somebody adds the
 * import rather than at the next review.
 *
 * Scanning source text rather than trusting `package.json` is deliberate: a
 * transitive import through a workspace link would satisfy the manifest and violate
 * the rule.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const srcDir = join(here, "..", "src");

function sourceFiles(): readonly string[] {
  return readdirSync(srcDir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(srcDir, name));
}

/** Every `from "..."` and `import("...")` specifier in a file. */
function specifiers(source: string): readonly string[] {
  const found: string[] = [];
  const pattern = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  let match = pattern.exec(source);
  while (match !== null) {
    const specifier = match[1];
    if (specifier !== undefined) found.push(specifier);
    match = pattern.exec(source);
  }
  return found;
}

describe("packages/playbook imports @ff/contracts and nothing else", () => {
  const files = sourceFiles();

  it("finds every source file", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.slice(f.lastIndexOf("src")), f] as const))(
    "%s imports only contracts and its own siblings",
    (_label, file) => {
      const source = readFileSync(file, "utf8");
      for (const specifier of specifiers(source)) {
        const ok = specifier === "@ff/contracts" || specifier.startsWith("./");
        expect(
          ok,
          `${file} imports "${specifier}"; playbook may import @ff/contracts and its own ` +
            "modules only (ADR-017 §Decision 3)",
        ).toBe(true);
      }
    },
  );

  it("declares exactly one dependency in its manifest", () => {
    const manifestText = readFileSync(join(here, "..", "package.json"), "utf8");
    const manifest: unknown = JSON.parse(manifestText);
    expect(manifest).toHaveProperty("dependencies", { "@ff/contracts": "workspace:*" });
  });

  it("never calls Math.random — all randomness goes through createRng", () => {
    for (const file of sourceFiles()) {
      // The call, not the word: `distribution.ts` names the ban in a comment.
      expect(readFileSync(file, "utf8")).not.toMatch(/Math\s*\.\s*random\s*\(/);
    }
  });
});
