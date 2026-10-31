/**
 * ADR-081 M1: what each position group is worth, measured through the engine.
 *
 * The flat league (every rating 60) is the control. For each group, one team's players at the
 * group's positions get every active rating raised by `BOOST` (their position overall rises by the
 * same amount) and that team plays flat opponents, home and away alternately. The same seeds are
 * played with no boost, so each pair shares its dice (common random numbers) and the difference in
 * margin is mostly the boost.
 *
 *   group weight = (mean boosted margin − mean control margin) / BOOST
 *
 * in points of margin a game per point of the group's overall. The control games' margin spread
 * (its standard deviation) turns a strength gap into a win chance. Franchise's meeting reads both.
 *
 * The group table repeats franchise's `GROUP_OF` (meeting/strength.ts): calibration may not import
 * it (Iron Rule 1). Groups move together; the meeting's strength rates the group's starters.
 */
import { DEFAULT_LEAGUE_RULES, type PlayerState, type Position, type TeamId } from "@ff/contracts";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { buildFixture } from "../harness/schedule.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFlatLeague, FLAT_RATING } from "../league/flat.js";
import { fullStrength, indexLeague, type LeagueIndex } from "../league/snapshot.js";

export type Group = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "CB" | "S" | "ST";
export const GROUPS: readonly Group[] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "ST"];
const GROUP_OF: Readonly<Record<Position, Group>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE", LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL",
  DE: "DL", DT: "DL", NT: "DL", OLB: "LB", MLB: "LB", ILB: "LB", CB: "CB", FS: "S", SS: "S", K: "ST", P: "ST", LS: "ST",
};

/** Rating points added to the boosted group (CHOSEN: big enough to read, small enough to stay linear). */
export const BOOST = 10;

export interface GroupWeightsInput {
  /** Games per group (and for the control). Even, so home and away split. */
  readonly games: number;
  readonly seed?: string;
  readonly groups?: readonly Group[];
  readonly onGame?: (label: string, i: number) => void;
}

export interface GroupMeasure {
  group: Group;
  games: number;
  /** Mean margin of the boosted team (its points minus the opponent's). */
  meanMargin: number;
  /** Δmargin per rating point, with its standard error from the paired differences. */
  weight: number;
  se: number;
}

export interface GroupWeightsReport {
  games: number;
  seed: string;
  boost: number;
  /** The control: mean margin of the same seat (≈ 0) and the spread of single-game margins. */
  control: { meanMargin: number; marginSd: number };
  groups: GroupMeasure[];
}

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = (xs: readonly number[]) => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };

export function measureGroupWeights(input: GroupWeightsInput): GroupWeightsReport {
  const seed = input.seed ?? "group-weights";
  const flat = buildFlatLeague({ teams: 2, variant: "group-weights" });
  const base = indexLeague(flat);
  const [seat, other] = base.teamIds() as [TeamId, TeamId];

  const boosted = (group: Group): LeagueIndex => {
    const players = new Map(base.players);
    const team = base.teams.get(String(seat))!;
    for (const id of team.roster) {
      const p = players.get(String(id))!;
      if (GROUP_OF[p.bio.position] !== group) continue;
      const values = Object.fromEntries(Object.entries(p.attributes.values).map(([k, v]) => [k, Math.min(99, (v ?? FLAT_RATING) + BOOST)]));
      players.set(String(id), { ...p, attributes: { ...p.attributes, values } } satisfies PlayerState);
    }
    return { ...base, players };
  };

  /** The seat team's margin in game i (home in even games). */
  const play = (index: LeagueIndex, i: number): number => {
    const home = i % 2 === 0 ? seat : other;
    const away = home === seat ? other : seat;
    const week = 1 + (i % DEFAULT_LEAGUE_RULES.weeksPerSeason);
    const built = buildFixture(index, {
      season: 2027, week, home, away,
      homeRoster: fullStrength(index.teams.get(String(home))!, 2027, week),
      awayRoster: fullStrength(index.teams.get(String(away))!, 2027, week),
      replay: 0,
    });
    const { observation } = runOneGame({ built, seed: `${seed}/${i}`, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN });
    const s = observation.summary.score;
    return home === seat ? s.home - s.away : s.away - s.home;
  };

  const control: number[] = [];
  for (let i = 0; i < input.games; i++) { control.push(play(base, i)); input.onGame?.("control", i); }

  const groups: GroupMeasure[] = [];
  for (const group of input.groups ?? GROUPS) {
    const index = boosted(group);
    const diffs: number[] = [];
    const margins: number[] = [];
    for (let i = 0; i < input.games; i++) {
      const m = play(index, i);
      margins.push(m);
      diffs.push(m - control[i]!);
      input.onGame?.(group, i);
    }
    groups.push({ group, games: input.games, meanMargin: mean(margins), weight: mean(diffs) / BOOST, se: sd(diffs) / Math.sqrt(diffs.length) / BOOST });
  }
  return { games: input.games, seed, boost: BOOST, control: { meanMargin: mean(control), marginSd: sd(control) }, groups };
}

export function groupWeightsMarkdown(r: GroupWeightsReport): string {
  const lines = [
    "# ADR-081 M1: what each position group is worth",
    "",
    `Flat league (every rating ${FLAT_RATING}), two teams. One team's group raised by ${r.boost} rating points, ${r.games} games a group, ` +
      `home and away alternately, on the control's seeds (\`${r.seed}/i\`). Engine rules: the default (\`legacy\`).`,
    "",
    `Control: mean margin ${r.control.meanMargin.toFixed(2)}, single-game margin spread (SD) ${r.control.marginSd.toFixed(2)} points.`,
    "",
    "| Group | Mean margin when boosted | Points a game per rating point | ± (1 SE) |",
    "|---|---:|---:|---:|",
    ...r.groups.map((g) => `| ${g.group} | ${g.meanMargin.toFixed(2)} | ${g.weight.toFixed(3)} | ${g.se.toFixed(3)} |`),
    "",
    "Measured on today's engine, before the pocket fix (ADR-089) lands; re-measure after it.",
  ];
  return lines.join("\n") + "\n";
}
