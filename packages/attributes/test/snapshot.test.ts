import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchSnapshot, latestSnapshot, NFLVERSE, readManifest, snapshotFiles } from "../src/importer/real/index.js";

describe("snapshot (ADR-088 R1)", () => {
  it("names the season's files, stats from the season before", () => {
    const f = snapshotFiles(2026);
    expect(f.rosters).toBe("weekly_rosters/roster_weekly_2026.parquet");
    expect(f.snaps2012).toBe("snap_counts/snap_counts_2012.parquet");
    expect(f.snaps2026).toBe("snap_counts/snap_counts_2026.parquet");
  });

  it("writes every file into a dated folder with a manifest, without touching the network", async () => {
    const root = await mkdtemp(join(tmpdir(), "ff-real-"));
    const asked: string[] = [];
    const download = async (url: string) => { asked.push(url); return new TextEncoder().encode(url); };
    const { dir, manifest } = await fetchSnapshot({ root, season: 2026, now: new Date("2026-10-23T12:00:00Z"), download });
    expect(dir).toBe(join(root, "2026-10-23"));
    expect(asked).toEqual(Object.values(snapshotFiles(2026)).map((p) => `${NFLVERSE}/${p}`));
    expect(await readManifest(dir)).toEqual(manifest);
    expect(manifest.files.rosters!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await readFile(join(dir, "rosters.parquet"), "utf8")).toBe(manifest.files.rosters!.url);
    expect(await latestSnapshot(root)).toBe(dir);
    expect(await latestSnapshot(join(root, "missing"))).toBeNull();
  });
});
