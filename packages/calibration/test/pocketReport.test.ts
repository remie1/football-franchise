/**
 * ADR-089 step 0 — THE STEP REPORT (plan §7.2 `report.ts`; ADR-089:927, :935, :987, :1166).
 *
 * On a constructed report: every hit and sack figure is printed with its time to throw beside it,
 * on its own league, and a report that cannot do so is refused naming ADR-089:935; every row on
 * both leagues; pressuredSacks and the pressured count printed separately; P2S against both
 * references, each named, while PR #33 is open, and against main's only once it is declined; the
 * interception guard rows on both leagues and, on a non-base arm, the guard itself, league-wide and
 * by class; and exclusive affected-play counts per arm (none on the base arm).
 */
import { describe, expect, it } from "vitest";
import type { IntMix } from "../src/pocket/bands.js";
import {
  LEAGUES,
  P2S_MAIN,
  P2S_PR33,
  isHitOrSackFigure,
  p2sReferences,
  renderStepReport,
  reportProblems,
  type ArmReport,
  type IntGuardRows,
  type StepReportInput,
} from "../src/pocket/report.js";

const at = (bin: number, n: number): number[] => Array.from({ length: 7 }, (_, i) => (i === bin ? n : 0));
const mix = (aimedByBin: readonly number[], interceptions: number): IntMix => ({ aimedByBin, interceptions });

function guardRows(intAll: number, progressionInt: number): IntGuardRows {
  return {
    intPerAttempt: 2.1,
    intPerAimed: 2.2,
    forcedThrowShare: 12.5,
    completionPerAttempt: 37.0,
    completionPerAimed: 39.0,
    intSourceMix: { TIPPED: 30, UNDERTHROWN: 70 },
    all: mix(at(0, 1000), intAll),
    byClass: {
      PROGRESSION: { ...mix(at(0, 800), progressionInt), completions: 320 },
      DESPERATION: { ...mix(at(0, 200), intAll - progressionInt), completions: 40 },
    },
    onTheRun: { clean: { aimed: 100, interceptions: 2 }, pressured: { aimed: 50, interceptions: 2 } },
  };
}

function base(): ArmReport {
  return {
    arm: "base",
    isBase: true,
    clock: "TICK",
    timeToThrow: { flat: 1.241, gen: 1.235 },
    sacks: { flat: { dropbacks: 20000, sacks: 3285, pressuredSacks: 3285, pressuredDropbacks: 17370 }, gen: { dropbacks: 18000, sacks: 3010, pressuredSacks: 3010, pressuredDropbacks: 15347 } },
    p2s: { flat: 18.91, gen: 19.62 },
    intGuard: { flat: guardRows(22, 12), gen: guardRows(68, 40) },
    rows: [
      { id: "threat_creation_rate", values: { flat: 86.85, gen: 85.26 }, note: "sim side only" },
      { id: "sack_rate", values: { flat: 16.43, gen: 16.72 }, real: 6.56 },
      { id: "hit_or_sack_rate", values: { flat: 20.05, gen: 24.04 }, real: 14.71 },
      { id: "sack_share_of_hit_or_sack", values: { flat: 81.9, gen: 69.6 }, real: 44.6 },
      { id: "release_distribution", values: { flat: 1.242, gen: 1.235 }, dp: 3, unit: "s" },
      { id: "hit_rate_by_release_bin", values: { flat: null, gen: null }, note: "no THROW.releaseSeconds before step 4" },
      { id: "sacker_mix", values: { flat: 86.9, gen: 82.5 } },
      { id: "contacts_per_100", values: { flat: 20.1, gen: 24.1 }, hitOrSack: true },
    ],
  };
}

function arm(): ArmReport {
  return {
    ...base(),
    arm: "pocket-1.s1",
    isBase: false,
    timeToThrow: { flat: 1.59, gen: 1.651 },
    intGuard: { flat: guardRows(22, 12), gen: guardRows(80, 60) },
    affectedPlays: { flat: 4210, gen: 3987 },
  };
}

const input = (arms: readonly ArmReport[], pr33: StepReportInput["pr33"] = "OPEN"): StepReportInput => ({ step: "0", pr33, arms });

describe("the time-to-throw-beside rule (ADR-089:935)", () => {
  const lines = renderStepReport(input([base(), arm()]));

  it("prints every hit and sack figure with its own league's time to throw beside it", () => {
    let checked = 0;
    let armTtt = base().timeToThrow;
    for (const l of lines) {
      if (l.startsWith("== pocket-1.s1")) armTtt = arm().timeToThrow;
      const m = /^ {2}([a-z0-9_]+): /.exec(l);
      const row = m === null ? undefined : base().rows.find((r) => r.id === m[1]);
      if (row === undefined || !isHitOrSackFigure(row)) continue;
      for (const league of LEAGUES) {
        expect(l, l).toMatch(new RegExp(`${league} [^|]*\\[time to throw ${armTtt[league].toFixed(3)} s\\]`));
      }
      expect(l.match(/\[time to throw /g)).toHaveLength(2);
      checked++;
    }
    // sack_rate, hit_or_sack_rate, sack_share_of_hit_or_sack, hit_rate_by_release_bin, sacker_mix, contacts_per_100 on two arms
    expect(checked).toBe(12);
  });

  it("puts it beside the sack counts and P2S, and on no line without a hit or sack figure", () => {
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i]!;
      if (l.endsWith(":") || l.startsWith("==") || !/\d/.test(l)) continue;
      const figure = /sack|hit/i.test(l) || /^ {4}(flat|gen): \d+\.\d+%/.test(l) || l.startsWith("  contacts_per_100: ");
      expect(/\[time to throw \d/.test(l), l).toBe(figure);
    }
    expect(lines.filter((l) => /^ {4}(flat|gen): sacks \d+/.test(l))).toHaveLength(4);
    expect(lines.filter((l) => /^ {4}(flat|gen): \d+\.\d+%.*\[time to throw/.test(l))).toHaveLength(4);
  });

  it("knows a hit or sack figure by its id, or by the row's flag", () => {
    for (const id of ["sack_rate", "hit_or_sack_rate", "sack_share_of_hit_or_sack", "qb_hit_on_scramble", "hit_rate_by_release_bin", "pressure_to_sack", "coverage_sack_rows", "sack_share_of_contacts_in_out", "unblocked_share_of_hit_or_sack", "sacker_mix"]) {
      expect(isHitOrSackFigure({ id }), id).toBe(true);
    }
    for (const id of ["threat_creation_rate", "release_distribution", "time_to_throw", "unblocked_pressures_per_100", "first_arrival_seconds", "throwaway_rate"]) {
      expect(isHitOrSackFigure({ id }), id).toBe(false);
    }
    expect(isHitOrSackFigure({ id: "contacts_per_100", hitOrSack: true })).toBe(true);
  });

  it("refuses a report with no time to throw on a league, naming ADR-089:935", () => {
    const noGen = { ...base(), timeToThrow: { flat: 1.241 } as unknown as ArmReport["timeToThrow"] };
    expect(() => renderStepReport(input([noGen]))).toThrow(/ADR-089:935 every hit and sack figure carries its time to throw beside it, and this arm has no time to throw on gen/);
    const nan = { ...base(), timeToThrow: { flat: Number.NaN, gen: 1.235 } };
    expect(reportProblems(input([nan])).join("\n")).toMatch(/arm base, flat: ADR-089:935/);
  });
});

describe("the rest of the report", () => {
  it("prints every row on both leagues, n/a where a league has no value, and refuses a row missing a league", () => {
    const lines = renderStepReport(input([base()]));
    for (const row of base().rows) {
      const l = lines.find((x) => x.startsWith(`  ${row.id}: `));
      expect(l, row.id).toBeDefined();
      expect(l!).toMatch(/flat .* \| gen /);
    }
    expect(lines.find((x) => x.startsWith("  hit_rate_by_release_bin: "))).toMatch(/flat n\/a .*gen n\/a/);
    const missing = { ...base(), rows: [{ id: "sack_rate", values: { flat: 16.43 } as unknown as { flat: number; gen: number } }] };
    expect(reportProblems(input([missing])).join("\n")).toMatch(/row sack_rate: every row on both leagues, and gen is missing/);
  });

  it("prints pressuredSacks and the pressured count separately (ADR-089:927)", () => {
    const lines = renderStepReport(input([base()]));
    const flat = lines.find((l) => l.startsWith("    flat: sacks "))!;
    expect(flat).toMatch(/sacks 3285 of 20000 dropbacks/);
    expect(flat).toMatch(/pressuredSacks 3285;/);
    expect(flat).toMatch(/pressured dropbacks 17370 \(86\.85 per 100\)/);
    const broken = { ...base(), sacks: { ...base().sacks, gen: { dropbacks: 10, sacks: 2, pressuredSacks: 3, pressuredDropbacks: 5 } } };
    expect(reportProblems(input([broken])).join("\n")).toMatch(/pressuredSacks <= sacks/);
  });

  it("prints P2S against 22.02% (PR #33, FTN only, held) and 15.46% (main), each named, while PR #33 is open", () => {
    expect(p2sReferences("OPEN")).toEqual([P2S_PR33, P2S_MAIN]);
    expect(P2S_PR33).toMatchObject({ value: 22.02, name: "PR #33, FTN only (held)" });
    expect(P2S_MAIN).toMatchObject({ value: 15.46, name: "main" });
    const lines = renderStepReport(input([base()]));
    const flat = lines.find((l) => l.startsWith("    flat: 18.91%"))!;
    expect(flat).toMatch(/-3\.11 against 22\.02% \(PR #33, FTN only \(held\)\)/);
    expect(flat).toMatch(/3\.45 against 15\.46% \(main\)/);
    expect(lines.some((l) => /P2S \(reported, never graded; against 22\.02% PR #33.* and 15\.46% main\)/.test(l))).toBe(true);
  });

  it("prints P2S against 15.46% only once PR #33 is declined", () => {
    expect(p2sReferences("DECLINED")).toEqual([P2S_MAIN]);
    const lines = renderStepReport(input([base()], "DECLINED"));
    expect(lines.join("\n")).not.toMatch(/22\.02/);
    expect(lines.find((l) => l.startsWith("    flat: 18.91%"))).toMatch(/against 15\.46% \(main\)/);
  });

  it("prints the interception guard rows on both leagues, by class and on the run", () => {
    const lines = renderStepReport(input([base()]));
    for (const league of LEAGUES) {
      expect(lines.some((l) => l.startsWith(`    ${league}: INT per attempt 2.10, per aimed throw 2.20; forced-throw share 12.50;`))).toBe(true);
      expect(lines.some((l) => l.startsWith(`      ${league} PROGRESSION: 800 aimed`))).toBe(true);
      expect(lines.some((l) => l.startsWith(`      ${league} on the run: clean INT 2.00 against a real 2.11; pressured INT 4.00 against a real 3.25`))).toBe(true);
    }
    expect(lines.some((l) => /INT-source mix TIPPED 30\.00, UNDERTHROWN 70\.00/.test(l))).toBe(true);
    expect(lines).toContain("    the guard: this is the base every other arm's rise is read against");
  });

  it("scores the guard on a non-base arm against base, league-wide and by class, and names a breach", () => {
    const lines = renderStepReport(input([base(), arm()]));
    // flat: unchanged, passes; gen: PROGRESSION 40 -> 60 of 800 at the same release mix, a breach
    expect(lines.some((l) => /^ {4}flat league-wide: .*PASSES$/.test(l))).toBe(true);
    expect(lines.some((l) => /^ {4}gen league-wide: base 6\.80 -> arm 8\.00, rise 1\.20 against an allowed 0\.00: BREACH/.test(l))).toBe(true);
    expect(lines.some((l) => /^ {4}gen PROGRESSION: base 5\.00 -> arm 7\.50.*BREACH/.test(l))).toBe(true);
    expect(lines).toContain("    gen by class: BREACH: the step stops and comes back to the owner with a second seed set");
    expect(lines).toContain("    flat by class: PASSES");
  });

  it("prints exclusive affected-play counts per arm, none on the base arm, and refuses an arm without them", () => {
    const lines = renderStepReport(input([base(), arm()]));
    expect(lines).toContain("  exclusive affected plays: none (the base arm; counts start at step 1)");
    expect(lines).toContain("  exclusive affected plays against base: flat 4210 | gen 3987");
    const { affectedPlays: _dropped, ...noCounts } = arm();
    expect(reportProblems(input([base(), noCounts])).join("\n")).toMatch(/exclusive affected-play counts are reported per arm/);
    const oneLeague = { ...arm(), affectedPlays: { flat: 4210 } as unknown as NonNullable<ArmReport["affectedPlays"]> };
    expect(reportProblems(input([base(), oneLeague])).join("\n")).toMatch(/affected-play counts are reported per arm, on both leagues/);
  });

  it("needs exactly one base arm and unique arm names", () => {
    expect(reportProblems(input([arm()])).join("\n")).toMatch(/exactly one base arm \(got 0\)/);
    expect(reportProblems(input([base(), base()])).join("\n")).toMatch(/exactly one base arm \(got 2\)[\s\S]*appears twice/);
    expect(reportProblems(input([]))).toContain("a step report has at least one arm");
  });
});
