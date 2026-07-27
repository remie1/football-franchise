import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { main, parseArgs } from "../src/ingest/cli.js";
import { allSourceIds } from "../src/ingest/sources/index.js";

const roots: string[] = [];
const tempRoot = (): string => {
  const r = mkdtempSync(join(tmpdir(), "ff-cal-cli-"));
  roots.push(r);
  return r;
};
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("parseArgs", () => {
  it("defaults to every source and every in-scope season", () => {
    const a = parseArgs([]);
    expect(a.seasons).toEqual([2022, 2023, 2024, 2025]);
    expect(a.sources).toEqual(allSourceIds());
    expect(a.force).toBe(false);
    expect(a.keepRaw).toBe(false);
  });

  it("parses the documented invocation from calibration.md §8", () => {
    const a = parseArgs(["--seasons", "2022-2025"]);
    expect(a.seasons).toEqual([2022, 2023, 2024, 2025]);
  });

  it("parses a source subset", () => {
    expect(parseArgs(["--sources", "pbp,injuries"]).sources).toEqual(["pbp", "injuries"]);
  });

  it("validates source names eagerly, before any I/O", () => {
    expect(() => parseArgs(["--sources", "pbp,not_a_source"])).toThrow(/unknown source/);
  });

  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--turbo"])).toThrow(/unknown argument/);
  });

  it("rejects a flag with no value", () => {
    expect(() => parseArgs(["--seasons"])).toThrow(/requires a value/);
  });

  it("accepts the switches", () => {
    const a = parseArgs(["--force", "--keep-raw", "--cache-dir", "x", "--list", "--status"]);
    expect(a).toMatchObject({ force: true, keepRaw: true, cacheDir: "x", list: true, status: true });
  });
});

describe("main", () => {
  const capture = () => {
    const lines: string[] = [];
    return { lines, log: (l: string) => lines.push(l) };
  };

  it("exits 2 with usage on a bad argument, without touching the network", async () => {
    const { lines, log } = capture();
    expect(await main(["--nope"], log)).toBe(2);
    expect(lines.join("\n")).toMatch(/usage: ingest/);
  });

  it("--list describes every source and performs no I/O", async () => {
    const { lines, log } = capture();
    expect(await main(["--list"], log)).toBe(0);
    expect(lines).toHaveLength(allSourceIds().length);
    for (const id of allSourceIds()) expect(lines.some((l) => l.startsWith(id))).toBe(true);
  });

  it("--status on an empty cache reports empty rather than failing", async () => {
    const { lines, log } = capture();
    expect(await main(["--status", "--cache-dir", tempRoot()], log)).toBe(0);
    expect(lines.join("\n")).toMatch(/is empty/);
  });
});
