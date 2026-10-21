import type { GameFile } from "./gameFile.js";
import { readDriveChart } from "./driveChart.js";

export function DriveChartView({ game }: { game: GameFile }) {
  const rows = readDriveChart(game);
  return (
    <section className="panel table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col" className="left">Team</th>
            <th scope="col">Started</th>
            <th scope="col">From</th>
            <th scope="col">Plays</th>
            <th scope="col">Yds</th>
            <th scope="col">Time</th>
            <th scope="col" className="left">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.number} className={`${r.offense === game.home.id ? "home" : "away"}${r.points > 0 ? " scored" : ""}`}>
              <td>{r.number}</td>
              <td className="left">{r.team}</td>
              <td>{r.started}</td>
              <td>{r.from}</td>
              <td>{r.plays}</td>
              <td>{r.yards}</td>
              <td>{r.time}</td>
              <td className="left">
                {r.result}
                {r.points > 0 ? ` (+${r.points})` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
