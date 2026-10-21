import type { GameFile } from "./gameFile.js";
import { readScoreboard, type ScoreboardRow } from "./scoreboard.js";

function Row({ row, won }: { row: ScoreboardRow; won: boolean }) {
  return (
    <tr className={won ? "won" : undefined}>
      <th scope="row">
        <span className="city">{row.team.city}</span> {row.team.name}
      </th>
      {row.byPeriod.map((points, i) => (
        <td key={i}>{points}</td>
      ))}
      <td className="total">{row.total}</td>
    </tr>
  );
}

export function ScoreboardView({ game }: { game: GameFile }) {
  const board = readScoreboard(game);
  return (
    <section className="scoreboard">
      <table>
        <thead>
          <tr>
            <th scope="col">{board.ending}</th>
            {board.periodLabels.map((label) => (
              <th scope="col" key={label}>
                {label}
              </th>
            ))}
            <th scope="col">T</th>
          </tr>
        </thead>
        <tbody>
          <Row row={board.away} won={board.away.total > board.home.total} />
          <Row row={board.home} won={board.home.total > board.away.total} />
        </tbody>
      </table>
      <p className="meta">
        {board.plays} plays, {board.drives} drives · seed <code>{game.seed}</code> · caller {game.callerVersion}
      </p>
    </section>
  );
}
