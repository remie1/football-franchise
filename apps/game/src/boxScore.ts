/**
 * THE BOX SCORE — the engine's own statlines (saved in the game file by `export-game`), sorted
 * into the tables a box score has. Nothing is added up here: a team total would be a computed
 * number, and computed numbers belong in a domain package (Charter D7). If team totals are wanted,
 * the exporter is where to add them.
 */
import { nameOf, type BoxScoreLine, type GameFile, type GameFileTeam } from "./gameFile.js";

export interface BoxTable {
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly { readonly player: string; readonly cells: readonly (number | string)[] }[];
}

export interface TeamBox {
  readonly team: GameFileTeam;
  readonly tables: readonly BoxTable[];
}

interface TableSpec {
  readonly title: string;
  readonly columns: readonly string[];
  readonly include: (l: BoxScoreLine) => boolean;
  readonly cells: (l: BoxScoreLine) => (number | string)[];
  /** Busiest first. A display order, not a stat. */
  readonly order: (l: BoxScoreLine) => number;
}

const TABLES: readonly TableSpec[] = [
  {
    title: "Passing",
    columns: ["C/Att", "Yds", "TD", "Int", "Sk", "Sk yds"],
    include: (l) => l.passing.attempts > 0 || l.passing.sacked > 0,
    cells: (l) => [`${l.passing.completions}/${l.passing.attempts}`, l.passing.yards, l.passing.touchdowns, l.passing.interceptions, l.passing.sacked, l.passing.sackYards],
    order: (l) => l.passing.attempts,
  },
  {
    title: "Rushing",
    columns: ["Att", "Yds", "TD", "Long"],
    include: (l) => l.rushing.attempts > 0,
    cells: (l) => [l.rushing.attempts, l.rushing.yards, l.rushing.touchdowns, l.rushing.longest],
    order: (l) => l.rushing.attempts,
  },
  {
    title: "Receiving",
    columns: ["Rec", "Tgt", "Yds", "TD", "Drops"],
    include: (l) => l.receiving.targets > 0,
    cells: (l) => [l.receiving.receptions, l.receiving.targets, l.receiving.yards, l.receiving.touchdowns, l.receiving.drops],
    order: (l) => l.receiving.targets,
  },
  {
    title: "Defense",
    columns: ["Tkl", "TFL", "Sacks", "Int", "PD"],
    include: (l) => l.defense.tackles + l.defense.sacks + l.defense.interceptions + l.defense.passesDefensed > 0,
    cells: (l) => [l.defense.tackles, l.defense.tacklesForLoss, l.defense.sacks, l.defense.interceptions, l.defense.passesDefensed],
    order: (l) => l.defense.tackles,
  },
  {
    title: "Kicking",
    columns: ["FG", "XP", "Punts", "Punt yds"],
    include: (l) => l.kicking.fieldGoalAttempts + l.kicking.extraPointAttempts + l.kicking.punts > 0,
    cells: (l) => [
      `${l.kicking.fieldGoalsMade}/${l.kicking.fieldGoalAttempts}`,
      `${l.kicking.extraPointsMade}/${l.kicking.extraPointAttempts}`,
      l.kicking.punts,
      l.kicking.puntGrossYards,
    ],
    order: (l) => l.kicking.fieldGoalAttempts + l.kicking.punts,
  },
  {
    title: "Returns",
    columns: ["KR", "KR yds", "PR", "PR yds"],
    include: (l) => l.returns.kickReturns + l.returns.puntReturns > 0,
    cells: (l) => [l.returns.kickReturns, l.returns.kickReturnYards, l.returns.puntReturns, l.returns.puntReturnYards],
    order: (l) => l.returns.kickReturns + l.returns.puntReturns,
  },
];

export function readBoxScore(file: GameFile): TeamBox[] {
  return [file.away, file.home].map((team) => {
    const lines = file.statlines.filter((l) => l.team === team.id);
    const tables = TABLES.map((spec) => ({
      title: spec.title,
      columns: spec.columns,
      rows: lines
        .filter(spec.include)
        .sort((a, b) => spec.order(b) - spec.order(a))
        .map((l) => ({ player: nameOf(file, l.player), cells: spec.cells(l) })),
    })).filter((t) => t.rows.length > 0);
    return { team, tables };
  });
}
