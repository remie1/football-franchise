/**
 * The importer's own rules for the stand-ins' past injuries (ADR-087 AB7, §3.2; tests 12-15): the cut,
 * chains open at the cut, the chain rules both ways, the overlap merge, weeks as calendar weeks out, the
 * stamps, the file's own season dropped, and the join. On a made-up world: seasons 2023-2026 (the file's
 * season 2026, cut 2026-10-23), teams T1-T4, ids g:NN / p:NN / s:NN, names "Made Up Player ...".
 */
import { describe, expect, it } from "vitest";
import { compareStamps, type CalendarStamp } from "@ff/contracts";
import {
  buildPastInjuries, CHAIN_LEFT_WEEKS, KEPT_CLASSES, pastInjuriesMethod, pastInjuriesProblem, realKind, REAL_INJURY_KINDS, seasonSpells,
  SNAPSHOT_SEASON_SPELLS, standInJoin, WEEKS_MEASURE, type SeasonSpells,
} from "../src/importer/real/index.js";
import type { ReportRow, RosterRow, SnapRow } from "../src/importer/real/injuryRules.js";
import type { DatedGameRow } from "../src/importer/real/injuryRows.js";
import { copiedSince } from "../src/importer/real/development.js";
import { shuffled } from "./helpers.js";

const S = 2026;
const CUT = "2026-10-23";
const SEASONS = [2023, 2024, 2025, 2026];
/** Byes: T1 and T2 in 2024's week 9 (one game less, one calendar week more). */
const BYES = new Set(["2024|9|T1", "2024|9|T2"]);
const PAIRS = [["T1", "T2"], ["T3", "T4"]] as const;

/** Thursdays from 10 September: in 2026 week 7 is 22 October (before the cut), week 8 the 29th. T3-T4's week 7 of 2026 is on the cut's own day. */
function gameday(season: number, week: number, home: string): string {
  if (season === S && week === 7 && home === "T3") return CUT;
  return new Date(Date.UTC(season, 8, 10 + 7 * (week - 1))).toISOString().slice(0, 10);
}
function games(): DatedGameRow[] {
  const out: DatedGameRow[] = [];
  for (const season of SEASONS) for (let week = 1; week <= 18; week++) for (const [home, away] of PAIRS) {
    if (BYES.has(`${season}|${week}|${home}`)) continue;
    out.push({ season, week, gameId: `${season}_${week}_${home}`, home, away, gameday: gameday(season, week, home) });
  }
  return out;
}

/**
 * One man's weeks on a team in a season, a letter a week (week 1 first): P played, Q played with a
 * questionable report naming `text`, H on the 53 and healthy without a snap, X out on the report with
 * `text`, I on injured reserve, N on the non-football list, L out ill, - no roster row.
 */
interface Stint { readonly season: number; readonly team: string; readonly weeks: string; readonly text?: string }
interface Man { readonly n: number; readonly copied?: boolean; readonly stints: readonly Stint[] }
const gsis = (n: number) => `g:${String(n).padStart(2, "0")}`;
const pfr = (n: number) => `p:${String(n).padStart(2, "0")}`;
const standIn = (n: number) => `s:${String(n).padStart(2, "0")}`;
const WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen", "Twenty", "TwentyOne",
];
const nameOf = (n: number) => `Made Up Player ${WORDS[n]}`;
const P18 = "P".repeat(18);
/** A season's letters: `at` (1-based week) onward replaced by `s`, the rest played. */
const weeks = (s: string, at = 1, fill = "P") => (fill.repeat(at - 1) + s + fill.repeat(18)).slice(0, 18);

function rows(men: readonly Man[]) {
  const rosters: RosterRow[] = [];
  const reports: ReportRow[] = [];
  const snaps: SnapRow[] = [];
  for (const m of men) for (const st of m.stints) {
    [...st.weeks].forEach((c, i) => {
      const week = i + 1;
      if (c === "-" || BYES.has(`${st.season}|${week}|${st.team}`)) return;
      const base = { season: st.season, week, team: st.team };
      const status = c === "I" || c === "N" ? "RES" : "ACT";
      const code = c === "I" ? "R01" : c === "N" ? "R05" : null;
      rosters.push({ ...base, gsisId: gsis(m.n), name: nameOf(m.n), status, code, pfrId: pfr(m.n) });
      if (c === "P" || c === "Q") snaps.push({ ...base, pfrId: pfr(m.n), name: nameOf(m.n), snaps: 40 });
      const text = c === "L" ? "Illness" : st.text ?? "Knee";
      if (c === "X" || c === "L" || c === "Q") {
        reports.push({ ...base, gsisId: gsis(m.n), reportInjury: text, gameStatus: c === "Q" ? "QUESTIONABLE" : "OUT", practiceInjury: null, practiceStatus: c === "Q" ? "LIMITED" : "DNP" });
      }
    });
  }
  return { rosters, reports, snaps };
}

/** The made-up men, each a case (named by the test that reads him). */
const MEN: readonly Man[] = [
  // 1: out in 2026's weeks 6-7, the last weeks before the cut, with a copied injury: open at the cut. His rows after the cut are ignored.
  { n: 1, copied: true, stints: [{ season: 2025, team: "T1", weeks: P18 }, { season: S, team: "T1", weeks: weeks("XX", 6) }] },
  // 2: on IR at 2025's end and from 2026's week 1 to the cut (T3's week-7 game is on the cut's day, dropped; he plays it): chained into an open chain.
  { n: 2, stints: [{ season: 2025, team: "T3", weeks: weeks("II", 17) }, { season: S, team: "T3", weeks: "IIIIIIP" + "P".repeat(11) }] },
  // 3: out in 2026's week 7, a Thursday game before the cut: kept, and open at it.
  { n: 3, stints: [{ season: S, team: "T1", weeks: weeks("X", 7) }] },
  // 4: an ankle in 2024 (kept), and a 2026 spell he came back from before the cut (the file's season: dropped).
  { n: 4, copied: true, stints: [{ season: 2024, team: "T2", weeks: weeks("XX", 3), text: "Ankle" }, { season: S, team: "T2", weeks: weeks("XX", 2) }] },
  // 5: a hamstring at 2024's end, on IR from 2025's week 1: one record across the season end.
  { n: 5, stints: [{ season: 2024, team: "T1", weeks: weeks("XXX", 16), text: "Hamstring" }, { season: 2025, team: "T1", weeks: weeks("II", 1) }] },
  // 6: a shoulder at 2024's end (back past week 18: the playoffs' first week), healthy at 2025's start, out again in week 3: two records.
  { n: 6, stints: [{ season: 2024, team: "T2", weeks: weeks("XX", 17), text: "Shoulder" }, { season: 2025, team: "T2", weeks: weeks("XX", 3), text: "Shoulder" }] },
  // 7: a knee at 2023's end, nothing in 2024, IR at 2025's start: two seasons apart, two records.
  { n: 7, stints: [{ season: 2023, team: "T3", weeks: weeks("X", 18) }, { season: 2025, team: "T3", weeks: weeks("II", 1) }] },
  // 8: a groin on T1 in 2025's weeks 3-4, gone from T1, on T2's IR from week 6: chained after leaving (2 weeks on).
  { n: 8, stints: [{ season: 2025, team: "T1", weeks: weeks("XX", 3, "P").slice(0, 4) + "-".repeat(14), text: "Groin" }, { season: 2025, team: "T2", weeks: "-----IIPPPPPPPPPPP" }] },
  // 9: a calf on T1 in week 3, gone, out on T2 from week 9 (6 weeks on, past CHAIN_LEFT_WEEKS): two records.
  { n: 9, stints: [{ season: 2025, team: "T1", weeks: "PPX" + "-".repeat(15), text: "Calf" }, { season: 2025, team: "T2", weeks: "--------XPPPPPPPPP", text: "Calf" }] },
  // 10: a quad on T1 in weeks 3-4, gone, played for T2 in week 5, out weeks 6-7: two records (no chain across a game played).
  { n: 10, stints: [{ season: 2025, team: "T1", weeks: "PPXX" + "-".repeat(14), text: "Quad" }, { season: 2025, team: "T2", weeks: "----PXXPPPPPPPPPPP", text: "Quad" }] },
  // 11: the same, healthy without a snap for T2 in week 5: two records (no chain across a healthy week either).
  { n: 11, stints: [{ season: 2025, team: "T1", weeks: "PPXX" + "-".repeat(14), text: "Quad" }, { season: 2025, team: "T2", weeks: "----HXXPPPPPPPPPPP", text: "Quad" }] },
  // 12: a back: T3's IR weeks 5-8 and T4's report weeks 7-8 overlap in time (a trade's rows on both): one, the longer.
  { n: 12, stints: [{ season: 2025, team: "T3", weeks: "PPPQIIII" + "-".repeat(10), text: "Back" }, { season: 2025, team: "T4", weeks: "------XXPPPPPPPPPP", text: "Back" }] },
  // 13: an ankle in 2024's weeks 8 and 10 around T1's bye: 2 games missed, 3 calendar weeks out.
  { n: 13, stints: [{ season: 2024, team: "T1", weeks: weeks("X-X", 8), text: "Ankle" }] },
  // 14: IR with no report at 2024's end, an elbow on 2025's report: one record, kind from the first known link; illness in 2023 kept, the non-football list left out.
  { n: 14, stints: [{ season: 2023, team: "T4", weeks: weeks("L", 5).slice(0, 9) + "NN" + "P".repeat(7) }, { season: 2024, team: "T4", weeks: weeks("II", 17) }, { season: 2025, team: "T4", weeks: weeks("XX", 1), text: "Elbow" }] },
  // 15: never hurt: no records.
  { n: 15, copied: true, stints: [{ season: 2024, team: "T1", weeks: P18 }, { season: S, team: "T1", weeks: P18 }] },
  // 16: a toe at 2024's end, off T3's roster for 2025's first three weeks (nothing well), out weeks 4-5: two records (a season-end link chains only into his first week).
  { n: 16, stints: [{ season: 2024, team: "T3", weeks: weeks("XX", 17), text: "Toe" }, { season: 2025, team: "T3", weeks: "---XX" + "P".repeat(13), text: "Toe" }] },
  // 17: a wrist on T1 in 2025's weeks 3-4, gone, out on T2 from week 8 (4 weeks on, the window's edge): chained after leaving (review finding 14).
  { n: 17, stints: [{ season: 2025, team: "T1", weeks: "PPXX" + "-".repeat(14), text: "Wrist" }, { season: 2025, team: "T2", weeks: "-------XXPPPPPPPPP", text: "Wrist" }] },
  // 18: the same with T2's spell from week 9 (5 weeks on, past the window): two records.
  { n: 18, stints: [{ season: 2025, team: "T1", weeks: "PPXX" + "-".repeat(14), text: "Neck" }, { season: 2025, team: "T2", weeks: "--------XXPPPPPPPP", text: "Neck" }] },
  // 19: a hip on T3 in weeks 3-4, off T3's roster weeks 5-7, out for T3 again from week 8 (4 weeks on): the same team chains too (review finding 11).
  { n: 19, stints: [{ season: 2025, team: "T3", weeks: "PPXX---XXPPPPPPPPP", text: "Hip" }] },
  // 20: the same team with the next spell from week 9 (5 weeks on): two records.
  { n: 20, stints: [{ season: 2025, team: "T3", weeks: "PPXX----XXPPPPPPPP", text: "Thigh" }] },
  // 21: a trade mid-injury (review finding 10): out for T1 weeks 6-8 and gone, out for T2 weeks 8-12 with week-8 rows on both: one, T2's, the longer, kept whole.
  { n: 21, stints: [{ season: 2025, team: "T1", weeks: "PPPPPXXX" + "-".repeat(10), text: "Foot" }, { season: 2025, team: "T2", weeks: "-------XXXXXPPPPPP", text: "Foot" }] },
];
const KEEP = new Set(MEN.map((m) => gsis(m.n)));

function seasonsOf(men: readonly Man[], o: { cut?: boolean; shuffle?: string } = {}): SeasonSpells[] {
  const { rosters, reports, snaps } = rows(men);
  const g = games();
  const mix = <T,>(xs: T[], label: string) => (o.shuffle === undefined ? xs : shuffled(xs, `${o.shuffle}-${label}`));
  return SEASONS.map((season) => seasonSpells({
    season, games: mix(g, `g${season}`), keep: KEEP,
    rosters: mix(rosters.filter((r) => r.season === season), `r${season}`),
    reports: mix(reports.filter((r) => r.season === season), `p${season}`),
    snaps: mix(snaps.filter((r) => r.season === season), `s${season}`),
    ...(season === S && o.cut !== false ? { cutBefore: CUT } : {}),
  }));
}
function build(seasons: readonly SeasonSpells[] = seasonsOf(MEN)) {
  return buildPastInjuries({
    season: S, snapshotDate: CUT,
    players: MEN.map((m) => ({ id: standIn(m.n), copiedInjury: m.copied === true })),
    realOf: new Map(MEN.map((m) => [standIn(m.n), gsis(m.n)])),
    seasons, manifest: { date: "2026-10-24", fetchedAt: "2026-10-24T12:00:00.000Z" }, manifestSha256: "0".repeat(64),
  });
}
const rs = (season: number, week: number): CalendarStamp => ({ season, phase: "REGULAR_SEASON", week, day: 1 });
const PLAYOFFS_1 = (season: number): CalendarStamp => ({ season, phase: "PLAYOFFS", week: 1, day: 1 });

describe("test 12: the cut (gameday strictly before the file's snapshotDate)", () => {
  const s26 = seasonsOf(MEN)[3]!;
  const startsOf = (n: number, ss: SeasonSpells) => ss.spells.filter((sp) => sp.gsisId === gsis(n)).map((sp) => sp.startWeek);

  it("reads the file's season's games before the cut only: a game on the cut's day is dropped, the Thursday before kept", () => {
    // T1-T2: weeks 1-7 kept (week 7 on 22 October); T3-T4: weeks 1-6 (week 7 is on the 23rd).
    expect(s26.counts.teamGames).toBe(2 * 7 + 2 * 6);
    expect(s26.counts.gamesCut).toBe(11 + 12);
    expect(startsOf(3, s26)).toEqual([7]);
    // A team's rows after the cut are ignored: man 1's timeline ends at week 7, out at its end.
    const t1 = s26.timelines.get(gsis(1))!;
    expect(t1).toHaveLength(1);
    expect(t1[0]!.weeks).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s26.spells.find((sp) => sp.gsisId === gsis(1))!.end).toBe("SEASON_END");
    // Man 2 plays T3's week 7, on the cut's day: not read, so his IR runs to the end of what is read.
    expect(s26.timelines.get(gsis(2))![0]!.weeks).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s26.spells.find((sp) => sp.gsisId === gsis(2))!.end).toBe("SEASON_END");
  });

  it("is what changes the file's season: without it, both run on and come back", () => {
    const uncut = seasonsOf(MEN, { cut: false })[3]!;
    expect(uncut.counts.gamesCut).toBe(0);
    expect(uncut.spells.find((sp) => sp.gsisId === gsis(1))!.end).toBe("RETURNED");
    expect(uncut.spells.find((sp) => sp.gsisId === gsis(2))!.end).toBe("RETURNED");
    // Earlier seasons have no cut.
    expect(seasonsOf(MEN)[2]!.counts.gamesCut).toBe(0);
    // A game with no date in the file's season is left out too.
    const undated = seasonSpells({ season: S, games: games().map((g) => (g.season === S ? { ...g, gameday: null } : g)), rosters: [], reports: [], snaps: [], keep: KEEP, cutBefore: CUT });
    expect(undated.counts.teamGames).toBe(0);
  });

  it("keeps only the file's men, after running the rules on every row", () => {
    const all = rows(MEN);
    const in25 = <T extends { season: number }>(xs: T[]) => xs.filter((r) => r.season === 2025);
    const only = seasonSpells({ season: 2025, games: games(), rosters: in25(all.rosters), reports: in25(all.reports), snaps: in25(all.snaps), keep: new Set([gsis(5)]) });
    expect([...only.timelines.keys()]).toEqual([gsis(5)]);
    expect(only.spells.length).toBeGreaterThan(0);
    expect(only.spells.every((sp) => sp.gsisId === gsis(5))).toBe(true);
    expect(only.counts.rosterRows).toBe(in25(all.rosters).length);
    // Everyone's rows were read: the coverage counts every snap row of the season, the kept man's and the rest.
    expect(only.counts.snapRows).toBe(in25(all.snaps).length);
  });
});

describe("tests 13-15: the records", () => {
  const { block, report } = build();
  const of = (n: number) => block.players[standIn(n)];

  it("drops chains open at the cut, one chained from 2025 among them, and counts them with and without a copied injury (test 13)", () => {
    expect(of(1)).toBeUndefined();
    expect(of(2)).toBeUndefined();
    expect(of(3)).toBeUndefined();
    expect(block.counts.openAtCutDropped).toBe(3);
    expect(block.counts.openAtCutDroppedWithCopiedInjury).toBe(1);
    // Men 4 and 15 have a copied injury and no open chain.
    expect(report.copiedWithoutOpen).toBe(2);
  });

  it("drops the file's season's other spells, and keeps the earlier ones (ruling D1)", () => {
    expect(SNAPSHOT_SEASON_SPELLS).toBe("drop");
    expect(block.counts.snapshotSeasonDropped).toBe(1);
    expect(of(4)).toEqual([{ kind: "real:ankle", weeks: 2, since: rs(2024, 3), healed: rs(2024, 5) }]);
  });

  it("chains across a season end only into his first week of the next season, with nothing well between (test 14)", () => {
    expect(of(5)).toEqual([{ kind: "real:hamstring", weeks: 3 + 2, since: rs(2024, 16), healed: rs(2025, 3) }]);
    expect(of(6)).toEqual([
      { kind: "real:shoulder", weeks: 2, since: rs(2024, 17), healed: PLAYOFFS_1(2024) },
      { kind: "real:shoulder", weeks: 2, since: rs(2025, 3), healed: rs(2025, 5) },
    ]);
    // Off the roster at the next season's start, out from his fourth week: nothing well between, but not his first week, so two records.
    expect(of(16)).toEqual([
      { kind: "real:foot-toe", weeks: 2, since: rs(2024, 17), healed: PLAYOFFS_1(2024) },
      { kind: "real:foot-toe", weeks: 2, since: rs(2025, 4), healed: rs(2025, 6) },
    ]);
    // Two seasons apart: two records.
    expect(of(7)).toEqual([
      { kind: "real:knee", weeks: 1, since: rs(2023, 18), healed: PLAYOFFS_1(2023) },
      { kind: "real:unknown", weeks: 2, since: rs(2025, 1), healed: rs(2025, 3) },
    ]);
  });

  it("chains after leaving a roster only within CHAIN_LEFT_WEEKS, and never across a game played or a healthy week", () => {
    expect(CHAIN_LEFT_WEEKS).toBe(4);
    expect(of(8)).toEqual([{ kind: "real:groin-hip", weeks: 2 + 2, since: rs(2025, 3), healed: rs(2025, 8) }]);
    expect(of(9)).toEqual([
      { kind: "real:calf-shin", weeks: 1, since: rs(2025, 3), healed: rs(2025, 4) },
      { kind: "real:calf-shin", weeks: 1, since: rs(2025, 9), healed: rs(2025, 10) },
    ]);
    for (const n of [10, 11]) {
      expect(of(n), String(n)).toEqual([
        { kind: "real:quad-thigh", weeks: 2, since: rs(2025, 3), healed: rs(2025, 5) },
        { kind: "real:quad-thigh", weeks: 2, since: rs(2025, 6), healed: rs(2025, 8) },
      ]);
    }
    // The window's edge, both ways (review finding 14): 4 calendar weeks on chains, 5 does not.
    expect(of(17)).toEqual([{ kind: "real:hand-wrist", weeks: 2 + 2, since: rs(2025, 3), healed: rs(2025, 10) }]);
    expect(of(18)).toEqual([
      { kind: "real:back-neck", weeks: 2, since: rs(2025, 3), healed: rs(2025, 5) },
      { kind: "real:back-neck", weeks: 2, since: rs(2025, 9), healed: rs(2025, 11) },
    ]);
    // The same team, both ways (review finding 11; CHOSEN: the window holds whatever the team).
    expect(of(19)).toEqual([{ kind: "real:groin-hip", weeks: 2 + 2, since: rs(2025, 3), healed: rs(2025, 10) }]);
    expect(of(20)).toEqual([
      { kind: "real:quad-thigh", weeks: 2, since: rs(2025, 3), healed: rs(2025, 5) },
      { kind: "real:quad-thigh", weeks: 2, since: rs(2025, 9), healed: rs(2025, 11) },
    ]);
    expect(pastInjuriesMethod(S).chain.left).toMatch(/with the same team or another/);
    // Men 2 (into the cut), 5 and 14 across a season end; men 8, 17 and 19 after leaving.
    expect(block.counts.chainedAcrossSeasonEnd).toBe(3);
    expect(block.counts.chainedAfterLeaving).toBe(3);
  });

  it("merges two spells on two teams that overlap in time, keeping the longer whole", () => {
    expect(of(12)).toEqual([{ kind: "real:back-neck", weeks: 4, since: rs(2025, 5), healed: rs(2025, 9) }]);
    // A trade week's rows on both teams (review finding 10): T2's spell is kept, its start and weeks; T1's weeks 6-7 are lost.
    expect(of(21)).toEqual([{ kind: "real:foot-toe", weeks: 5, since: rs(2025, 8), healed: rs(2025, 13) }]);
    expect(pastInjuriesMethod(S).overlap).toMatch(/the shorter's weeks outside it are lost/);
    expect(block.counts.merged).toBe(2);
  });

  it("sums calendar weeks out, byes counted, not games missed (ruling D3)", () => {
    expect(WEEKS_MEASURE).toBe("weeksOut");
    expect(of(13)).toEqual([{ kind: "real:ankle", weeks: 3, since: rs(2024, 8), healed: rs(2024, 11) }]);
  });

  it("names a chain by its first known part, keeps illness and leaves the non-football list out (ruling D2)", () => {
    expect(KEPT_CLASSES).toEqual(["FOOTBALL", "ILLNESS"]);
    expect(of(14)).toEqual([
      { kind: "real:illness", weeks: 1, since: rs(2023, 5), healed: rs(2023, 6) },
      { kind: "real:elbow-arm", weeks: 2 + 2, since: rs(2024, 17), healed: rs(2025, 3) },
    ]);
    expect(report.nonFootball).toBe(1);
    expect(of(15)).toBeUndefined();
  });

  it("stamps every record before the league's first day, none at the copied injury's stamp, since no later than healed (test 15)", () => {
    const first: CalendarStamp = { season: S, phase: "TRAINING_CAMP", week: 1, day: 1 };
    const all = Object.values(block.players).flat();
    expect(all).toHaveLength(block.counts.records);
    expect(Object.keys(block.players)).toHaveLength(block.counts.men);
    for (const r of all) {
      expect(compareStamps(r.healed, first)).toBeLessThan(0);
      expect(compareStamps(r.since, r.healed)).toBeLessThanOrEqual(0);
      expect(compareStamps(r.since, copiedSince(S))).not.toBe(0);
      expect(compareStamps(r.healed, copiedSince(S))).not.toBe(0);
      expect(REAL_INJURY_KINDS as readonly string[]).toContain(r.kind);
      expect(Object.keys(r)).toEqual(["kind", "weeks", "since", "healed"]);
    }
    // The block passes the check standin-development makes, and is keyed in the file's order.
    expect(pastInjuriesProblem(block, { season: S, snapshotDate: CUT, ids: new Set(MEN.map((m) => standIn(m.n))), copiedSince: copiedSince(S) })).toBeNull();
    expect(Object.keys(block.players)).toEqual(MEN.map((m) => standIn(m.n)).filter((id) => block.players[id] !== undefined));
    expect(block.method).toEqual(pastInjuriesMethod(S));
    expect(block.seasons).toEqual(SEASONS);
    expect(block).toMatchObject({ version: "standin-injuries/1", season: S, asOf: "2026-10-24", through: CUT });
    expect(report.byBand).toEqual({ SHORT: all.filter((r) => r.weeks <= 3).length, LONG: all.filter((r) => r.weeks >= 4 && r.weeks <= 8).length, MAJOR: 0 });
    expect(realKind("chest/ribs/abdomen")).toBe("real:chest-ribs-abdomen");
  });

  it("gives the same block for the same rows in any order (test 23)", () => {
    const text = JSON.stringify(block);
    for (const label of ["a", "b", "c"]) expect(JSON.stringify(build(seasonsOf(MEN, { shuffle: label })).block), label).toBe(text);
  });
});

describe("standInJoin: the sealed table against the file", () => {
  const men = [1, 2, 3].map((n) => ({ id: standIn(n), displayName: nameOf(n) }));
  const table = () => Object.fromEntries([1, 2, 3].map((n) => [gsis(n), { id: standIn(n), name: nameOf(n) }]));

  it("inverts it and counts the names that agree", () => {
    const j = standInJoin(men, { ...table(), [gsis(9)]: { id: standIn(9), name: nameOf(9) } });
    expect([...j.realOf]).toEqual([[standIn(1), gsis(1)], [standIn(2), gsis(2)], [standIn(3), gsis(3)]]);
    expect(j.sealedEntries).toBe(4);
    expect(j.namesAgree).toBe(3);
  });

  it("refuses a man with no entry, a stand-in with two real ids, and a table whose names are not the file's, naming ids and counts only", () => {
    const { [gsis(2)]: _gone, ...missing } = table();
    expect(() => standInJoin(men, missing)).toThrow("stand-in s:02 has no entry in the sealed table");
    expect(() => standInJoin(men, { ...table(), [gsis(8)]: { id: standIn(1), name: nameOf(1) } })).toThrow("the sealed table gives stand-in s:01 two real ids");
    let message = "";
    try { standInJoin(men, { ...table(), [gsis(3)]: { id: standIn(3), name: "Made Up Player Other" } }); } catch (e) { message = (e as Error).message; }
    expect(message).toBe("the sealed table's names agree with the file's for 2 of 3 men: it is not the table this file was built with");
    // No real id and no name in any refusal.
    for (const m of [message]) expect((m.match(/g:\d\d|Made Up/g) ?? []).length).toBe(0);
  });
});
