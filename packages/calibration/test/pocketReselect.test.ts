/**
 * ADR-089 step 5b: R-7, THE SELECTION REPRODUCED BY A SECOND PROCESS (`reselect.ts`; AM-10
 * `secondProcess`, filing §2 item 7).
 *
 * On a hand-built 14-point fixture (no engine): the recomputation reads the committed filing's
 * `selectionRule` and AM-10's committed words, agrees with `selectWith({ curve: "pressured" })` on
 * the winner, every loss on both curves, both separation flags and the stop; one loss is checked by
 * hand; the comparison names a moved loss, a moved winner and a flipped flag; and the module never
 * reaches `selection.ts`, directly or through another import.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { entryOf, loadAmendments, AMENDMENTS_PATH } from "../src/pocket/amendments.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { loadFiled } from "../src/pocket/filed.js";
import { am10WordsProblems, filedBlockOf, reselect, reselectionProblems, RESELECT_TOLERANCE, type RePoint, type Reselection } from "../src/pocket/reselect.js";
import { GRID_POINTS, gridPointId, selectWith, type BinCount, type GridArm } from "../src/pocket/selection.js";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const filedJson: unknown = JSON.parse(readFileSync(join(PKG, FILED_PATH), "utf8"));
const am10: unknown = entryOf(loadAmendments(join(PKG, AMENDMENTS_PATH), loadFiled(join(PKG, FILED_PATH))), "AM-10");

/**
 * The fixture: 14 points, hand-written bin counts. Attempts are the D1 gen set-1 counts scaled down
 * (filing §2); pressured events rise with release, hit events less so; theta 12 is closest to the
 * real pressured shape; L:R=8 has an empty last bin on set 2 (unscorable on both curves).
 */
const ATT = [1438, 852, 199, 181, 72, 57, 43];
function fixture(): { arms: GridArm[]; points: RePoint[] } {
  const arms = GRID_POINTS.map((p, g) => {
    const lean = p.shape === "S" ? Math.abs(p.value - 12) : 3 + (p.value - 4);
    const pr = (set: 1 | 2): BinCount[] =>
      ATT.map((a, i) => ({ attempts: a, events: Math.min(a, Math.round((a * [9, 18, 25, 28, 37, 56, 72][i]!) / 100 / (1 + 0.04 * lean * i) + (set === 2 ? (g % 3) : 0))) }));
    const hit = (set: 1 | 2): BinCount[] => ATT.map((a, i) => ({ attempts: a, events: Math.round((a * (3 + i + 0.3 * lean)) / 100) + (set === 2 ? 1 : 0) }));
    const arm: GridArm = { point: p, hit: { 1: hit(1), 2: hit(2) }, pressured: { 1: pr(1), 2: pr(2) } };
    if (gridPointId(p) !== "L:R=8") return arm;
    const cut = (c: readonly BinCount[]): BinCount[] => c.map((b, i) => (i === 6 ? { events: 0, attempts: 0 } : b));
    return { ...arm, hit: { 1: arm.hit[1], 2: cut(arm.hit[2]) }, pressured: { 1: arm.pressured[1], 2: cut(arm.pressured[2]) } };
  });
  const points = arms.map((a) => ({ point: gridPointId(a.point), hit: { "1": a.hit[1], "2": a.hit[2] }, pressured: { "1": a.pressured[1], "2": a.pressured[2] } }));
  // The second process reads points in record order, not the filed order.
  return { arms, points: [...points].reverse() };
}

function asRecorded(arms: readonly GridArm[]): Reselection {
  const v = selectWith(arms, { curve: "pressured" });
  const curve = (c: typeof v.pressured) => ({
    losses: c.points.map((p) => ({ point: p.point, scorable: p.scorable, set1: p.set1 ?? null, set2: p.set2 ?? null })),
    winner: c.winner ?? null,
    separated: c.separated ?? null,
  });
  return { curve: v.curve, winner: v.winner ?? null, stopped: v.stop !== undefined, pressured: curve(v.pressured), hit: curve(v.hit) };
}

describe("R-7: the recomputation from the filed words", () => {
  it("reads the committed filing's block and AM-10's committed words", () => {
    const f = filedBlockOf(filedJson);
    expect(f.bins).toEqual(["<2.0", "2.0-2.5", "2.5-3.0", "3.0-3.5", "3.5-4.0", "4-5", ">=5"]);
    expect(f.order.map((o) => o.id)).toEqual(GRID_POINTS.map(gridPointId));
    expect(am10WordsProblems(am10)).toEqual([]);
    expect(am10WordsProblems({ id: "AM-9", rule: { readings: {} } }).length).toBe(6);
  });

  it("agrees with selectWith on the hand-built fixture: winner, every loss on both curves, both flags, the stop", () => {
    const { arms, points } = fixture();
    const again = reselect(filedJson, am10, points);
    const recorded = asRecorded(arms);
    expect(reselectionProblems(recorded, again)).toEqual([]);
    expect(again.winner).toBe("S:theta=12");
    expect(again.stopped).toBe(false);
    expect(again.pressured.losses.find((l) => l.point === "L:R=8")!.scorable).toBe(false);
    expect(again.hit.losses.find((l) => l.point === "L:R=8")!.scorable).toBe(false);
    expect(again.pressured.losses.filter((l) => l.scorable)).toHaveLength(13);
  });

  it("one loss by hand: S:theta=12 on set 1 of the pressured curve", () => {
    const { points } = fixture();
    const p = points.find((x) => x.point === "S:theta=12")!;
    const s = p.pressured["1"].map((b) => (100 * b.events) / b.attempts);
    const r = [9.0, 18.1, 24.6, 27.9, 36.9, 56.0, 72.6];
    const w = [26.1, 24.3, 20.6, 12.9, 6.7, 5.2, 4.2];
    const ms = s.reduce((a, b) => a + b, 0) / 7;
    const mr = r.reduce((a, b) => a + b, 0) / 7;
    let acc = 0;
    for (let i = 0; i < 7; i += 1) acc += w[i]! * (s[i]! / ms - r[i]! / mr) ** 2;
    const hand = acc / w.reduce((a, b) => a + b, 0);
    const again = reselect(filedJson, am10, points);
    expect(Math.abs(again.pressured.losses.find((l) => l.point === "S:theta=12")!.set1! - hand)).toBeLessThanOrEqual(RESELECT_TOLERANCE);
  });

  it("an L winner stops; no scorable point stops", () => {
    const { points } = fixture();
    const lWins = points.map((p) => (p.point === "L:R=6" ? { ...p, pressured: points.find((x) => x.point === "S:theta=12")!.pressured } : p.point === "S:theta=12" ? { ...p, pressured: points.find((x) => x.point === "S:theta=7")!.pressured } : p));
    const a = reselect(filedJson, am10, lWins);
    expect(a.winner).toBe("L:R=6");
    expect(a.stopped).toBe(true);
    const none = points.map((p) => ({ ...p, pressured: { "1": p.pressured["1"].map((b, i) => (i === 0 ? { events: 0, attempts: 0 } : b)), "2": p.pressured["2"] } }));
    const b = reselect(filedJson, am10, none);
    expect(b.winner).toBeNull();
    expect(b.stopped).toBe(true);
    expect(b.pressured.separated).toBeNull();
  });

  it("names a moved loss, a moved winner, a flipped flag and a changed curve", () => {
    const { arms, points } = fixture();
    const again = reselect(filedJson, am10, points);
    const rec = asRecorded(arms);
    const moved: Reselection = { ...rec, pressured: { ...rec.pressured, losses: rec.pressured.losses.map((l, i) => (i === 3 ? { ...l, set2: l.set2! + 1e-9 } : l)) } };
    expect(reselectionProblems(moved, again)).toEqual([expect.stringMatching(/the pressured curve's S:theta=10 set2/)]);
    const within: Reselection = { ...rec, pressured: { ...rec.pressured, losses: rec.pressured.losses.map((l, i) => (i === 3 ? { ...l, set2: l.set2! + 1e-14 } : l)) } };
    expect(reselectionProblems(within, again)).toEqual([]);
    expect(reselectionProblems({ ...rec, winner: "S:theta=11" }, again)).toEqual([expect.stringMatching(/the winner: S:theta=11 recorded, S:theta=12 recomputed/)]);
    expect(reselectionProblems({ ...rec, hit: { ...rec.hit, separated: !rec.hit.separated } }, again)[0]).toMatch(/the hit curve's separation/);
    expect(reselectionProblems({ ...rec, curve: "hit_rate_by_release_bin" as "pressured_share_by_release_bin" }, again)[0]).toMatch(/the curve used/);
  });

  it("breaks an exact tie to the earlier filed point, in selectWith and in the recomputation (code-tests F12 a)", () => {
    const { arms } = fixture();
    const byId = new Map(arms.map((a) => [gridPointId(a.point), a]));
    const best = byId.get("S:theta=12")!.pressured;
    const worse = byId.get("S:theta=7")!.pressured;
    const tied = arms.map((a) => {
      const id = gridPointId(a.point);
      return id === "S:theta=11" || id === "S:theta=13" ? { ...a, pressured: best } : id === "S:theta=12" ? { ...a, pressured: worse } : a;
    });
    const v = selectWith(tied, { curve: "pressured" });
    const l11 = v.pressured.points.find((x) => x.point === "S:theta=11")!.set1;
    expect(v.pressured.points.find((x) => x.point === "S:theta=13")!.set1).toBe(l11);
    expect(v.winner).toBe("S:theta=11");
    const again = reselect(filedJson, am10, tied.map((a) => ({ point: gridPointId(a.point), hit: { "1": a.hit[1], "2": a.hit[2] }, pressured: { "1": a.pressured[1], "2": a.pressured[2] } })));
    expect(again.winner).toBe("S:theta=11");
    expect(reselectionProblems(asRecorded(tied), again)).toEqual([]);
  });

  it("is not separated when the worst minus the best is exactly twice the largest spread (code-tests F12 b)", () => {
    // Every point the same curve on both sets: every loss equal, every spread 0, so worst minus best
    // (0) equals twice the largest spread (0). The filed test is "more than", so no separation, and
    // the tie goes to the first filed point.
    const { arms } = fixture();
    const one = arms.find((a) => gridPointId(a.point) === "S:theta=12")!;
    const flat = arms.map((a) => ({ ...a, hit: { 1: one.hit[1], 2: one.hit[1] }, pressured: { 1: one.pressured[1], 2: one.pressured[1] } }));
    const v = selectWith(flat, { curve: "pressured" });
    expect(v.pressured.worst! - v.pressured.best!).toBe(2 * v.pressured.maxSpread!);
    expect(v.pressured.separated).toBe(false);
    expect(v.hit.separated).toBe(false);
    expect(v.winner).toBe(gridPointId(GRID_POINTS[0]!));
    const again = reselect(filedJson, am10, flat.map((a) => ({ point: gridPointId(a.point), hit: { "1": a.hit[1], "2": a.hit[2] }, pressured: { "1": a.pressured[1], "2": a.pressured[2] } })));
    expect(again.pressured.separated).toBe(false);
    expect(again.hit.separated).toBe(false);
    expect(again.winner).toBe(gridPointId(GRID_POINTS[0]!));
  });

  it("refuses a grid that is not the filed one and a filing without the block", () => {
    const { points } = fixture();
    expect(() => reselect(filedJson, am10, points.slice(1))).toThrow(/exactly the filed grid/);
    expect(() => filedBlockOf({})).toThrow(/no selectionRule/);
  });
});

describe("R-7: the recomputation does not reach selection.ts", () => {
  it("no module reselect.ts imports, directly or through another, is selection.ts", () => {
    const seen = new Set<string>();
    const walk = (file: string): void => {
      if (seen.has(file)) return;
      seen.add(file);
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/^import[^;]*?from\s+"(\.[^"]+)"/gms)) {
        const rel = m[1]!.replace(/\.js$/, ".ts");
        walk(resolve(dirname(file), rel));
      }
    };
    walk(join(PKG, "src/pocket/reselect.ts"));
    const names = [...seen].map((f) => f.slice(join(PKG, "src").length + 1));
    expect(names).not.toContain("pocket/selection.ts");
    expect(names).toEqual(["pocket/reselect.ts", "harness/digest.ts"]);
  });
});
