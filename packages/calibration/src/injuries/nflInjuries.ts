/**
 * THE REAL INJURY NUMBERS THE AGING REDESIGN'S MEASURE-ONLY ROWS ARE SET AGAINST (ADR-087 §12, AB1).
 *
 * REAL (counted), MEASURED by `pnpm --filter @ff/calibration injury-rates` from nflverse's public
 * injury reports, weekly rosters and PFR snap counts, regular seasons 2019-2024 pooled (2025 held out
 * and never read, calibration.md §7). Aggregates only. Copied from `reports/injury-rates.json`, whose
 * Markdown twin (`reports/injury-rates.md`, "By age, body-part class and depth-chart spot") defines
 * each number; a test keeps the constant and the JSON equal. Nothing here is read by the walk: the
 * grader alone reads it (`careerGrade.ts`), so the career check's fingerprint leaves this file out.
 *
 * - `byAge` (the report's `byAge.bands`, keyed by `EXIT_AGE_BANDS`' keys; whole years on 23 October;
 *   listed K/P left out): new in-season football time-loss injuries after a game he played, his snaps
 *   in those games (offense, defense, special teams), the rate per 1,000 snaps and the observed /
 *   expected ratio against each listed group's all-age rate (± one Poisson SE, √observed / expected);
 *   availability's game weeks (played, healthy on the 53 and not played, or missed for injury of any
 *   cause) and the weeks missed for injury; and the concussion class's count and Kaplan-Meier share
 *   out 4+ weeks (`byAgeClass`, class concussion).
 * - `bySpot` (`byDepthChartGroup.fine`): the same rate by fine listed position (nflverse
 *   `depth_chart_position`, not the game-day chart: men moved on game day are not seen). The generic
 *   rows (DL, LB, S, DB) are left out: the sim's chart has no such key. `bySpotGroup` is the group
 *   rate by spot (`byDepthChartGroup.groups[].spot`), and `all` every spot together.
 * - `concussion` (`repeatConcussion`, every football concussion/head spell, any onset, any group):
 *   Kaplan-Meier share out 4+ weeks of the first seen in the window, of every later one, of the later
 *   ones with quick relapses set apart (`laterApart`), and of the quick relapses.
 */
export const NFL_INJURIES = {
  seasons: [2019, 2024] as const,
  byAge: {
    upTo25: { afterPlayed: 2709, snaps: 2406170, per1000Snaps: 1.125856, mixPerSnap: { ratio: 0.9891, se: 0.019 }, gameWeeks: 97816, missed: 19044, missedShare: 0.194692, concussions: 285, concussionOut4: 0.175149 },
    age26To28: { afterPlayed: 1738, snaps: 1618848, per1000Snaps: 1.073603, mixPerSnap: { ratio: 0.9633, se: 0.0231 }, gameWeeks: 55889, missed: 10224, missedShare: 0.182934, concussions: 131, concussionOut4: 0.159698 },
    age29To30: { afterPlayed: 712, snaps: 628520, per1000Snaps: 1.13282, mixPerSnap: { ratio: 1.0412, se: 0.039 }, gameWeeks: 20353, missed: 3630, missedShare: 0.178352, concussions: 62, concussionOut4: 0.177632 },
    age31To32: { afterPlayed: 394, snaps: 307223, per1000Snaps: 1.282456, mixPerSnap: { ratio: 1.2033, se: 0.0606 }, gameWeeks: 10001, missed: 1889, missedShare: 0.188881, concussions: 28, concussionOut4: 0.256667 },
    from33: { afterPlayed: 202, snaps: 195197, per1000Snaps: 1.034852, mixPerSnap: { ratio: 1.0065, se: 0.0708 }, gameWeeks: 6172, missed: 909, missedShare: 0.147278, concussions: 26, concussionOut4: 0.303333 },
  },
  bySpot: {
    QB: { group: "QB", afterPlayed: 176, snaps: 200837, per1000Snaps: 0.876333 },
    RB: { group: "RB", afterPlayed: 473, snaps: 257216, per1000Snaps: 1.838921 },
    FB: { group: "RB", afterPlayed: 42, snaps: 31237, per1000Snaps: 1.344559 },
    WR: { group: "WR", afterPlayed: 753, snaps: 570306, per1000Snaps: 1.320344 },
    TE: { group: "TE", afterPlayed: 362, snaps: 323685, per1000Snaps: 1.118371 },
    T: { group: "OL", afterPlayed: 462, snaps: 444732, per1000Snaps: 1.038828 },
    G: { group: "OL", afterPlayed: 319, snaps: 407630, per1000Snaps: 0.782572 },
    C: { group: "OL", afterPlayed: 166, snaps: 204850, per1000Snaps: 0.810349 },
    DE: { group: "DL", afterPlayed: 374, snaps: 352662, per1000Snaps: 1.060506 },
    DT: { group: "DL", afterPlayed: 276, snaps: 298813, per1000Snaps: 0.923655 },
    NT: { group: "DL", afterPlayed: 91, snaps: 75806, per1000Snaps: 1.200433 },
    OLB: { group: "LB", afterPlayed: 352, snaps: 345057, per1000Snaps: 1.020121 },
    ILB: { group: "LB", afterPlayed: 292, snaps: 285698, per1000Snaps: 1.022058 },
    MLB: { group: "LB", afterPlayed: 72, snaps: 78906, per1000Snaps: 0.912478 },
    CB: { group: "DB", afterPlayed: 839, snaps: 611321, per1000Snaps: 1.372438 },
    FS: { group: "DB", afterPlayed: 259, snaps: 276710, per1000Snaps: 0.935998 },
    SS: { group: "DB", afterPlayed: 253, snaps: 242825, per1000Snaps: 1.041903 },
    K: { group: "K/P", afterPlayed: 48, snaps: 25568, per1000Snaps: 1.877347 },
    P: { group: "K/P", afterPlayed: 18, snaps: 27916, per1000Snaps: 0.644792 },
    LS: { group: "K/P", afterPlayed: 15, snaps: 24453, per1000Snaps: 0.613422 },
  },
  bySpotGroup: {
    QB: { afterPlayed: 176, snaps: 200837, per1000Snaps: 0.876333 },
    RB: { afterPlayed: 515, snaps: 288453, per1000Snaps: 1.785386 },
    WR: { afterPlayed: 753, snaps: 570306, per1000Snaps: 1.320344 },
    TE: { afterPlayed: 362, snaps: 323685, per1000Snaps: 1.118371 },
    OL: { afterPlayed: 947, snaps: 1057212, per1000Snaps: 0.895752 },
    DL: { afterPlayed: 745, snaps: 729699, per1000Snaps: 1.020969 },
    LB: { afterPlayed: 813, snaps: 785486, per1000Snaps: 1.035028 },
    DB: { afterPlayed: 1444, snaps: 1200290, per1000Snaps: 1.203043 },
    "K/P": { afterPlayed: 81, snaps: 77937, per1000Snaps: 1.039301 },
  },
  all: { afterPlayed: 5836, snaps: 5233905 },
  concussion: {
    first: { n: 452, out4: 0.159688 },
    later: { n: 89, out4: 0.304464 },
    laterApart: { n: 77, out4: 0.263436 },
    quickRelapse: { n: 12, out4: 0.55 },
  },
} as const;

export type NflInjuries = typeof NFL_INJURIES;
export type NflInjurySpot = keyof NflInjuries["bySpot"];

/**
 * The real side's fine spot for each of the sim's chart keys (CHOSEN): the real files hold T and G
 * for both sides of the line, so LT and RT read T, LG and RG read G; every other key reads itself.
 */
export const REAL_SPOT_OF: Readonly<Record<string, NflInjurySpot>> = {
  QB: "QB", RB: "RB", FB: "FB", WR: "WR", TE: "TE", LT: "T", RT: "T", LG: "G", RG: "G", C: "C",
  DE: "DE", DT: "DT", NT: "NT", OLB: "OLB", ILB: "ILB", MLB: "MLB", CB: "CB", FS: "FS", SS: "SS", K: "K", P: "P", LS: "LS",
};
