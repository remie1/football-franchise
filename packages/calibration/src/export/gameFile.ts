/**
 * ONE GAME, SAVED FOR THE VIEWER.
 *
 * `apps/game` may import nothing but `@ff/contracts` (Iron Rule 1) and holds no game logic
 * (Charter D7), so it cannot run a game or add up a box score. This is the other half: it plays
 * one game through the same `runOneGame` every batch uses and writes down what the viewer needs
 * to replay it — the event stream, the names behind the ids, and the engine's own statlines.
 *
 * It only READS the sim. No tunable, caller default or seed path is touched, so nothing a
 * measurement arm reports can move because this file exists.
 *
 * The file's shape is mirrored, by hand, in `apps/game/src/gameFile.ts`. It is not a contract
 * type (yet): if a second consumer appears, it is a petition to move it into `@ff/contracts`.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { StatLine } from "@ff/engine";
import type { CallerVersion } from "../caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFixture, buildFixtures } from "../harness/schedule.js";
import { buildFlatLeague } from "../league/flat.js";
import { indexLeague } from "../league/snapshot.js";

export const GAME_FILE_FORMAT = "ff-game/1";

export interface GameFileTeam {
  readonly id: string;
  readonly city: string;
  readonly name: string;
}

export interface GameFilePlayer {
  readonly name: string;
  readonly position: string;
  readonly team: string;
}

export interface GameFile {
  readonly format: typeof GAME_FILE_FORMAT;
  readonly seed: string;
  /** Which league and caller played it, so a file can be re-made exactly. */
  readonly league: "flat";
  readonly callerVersion: CallerVersion | "default";
  readonly home: GameFileTeam;
  readonly away: GameFileTeam;
  readonly players: Readonly<Record<string, GameFilePlayer>>;
  readonly events: readonly MatchEventEnvelope[];
  readonly statlines: readonly StatLine[];
}

export interface ExportGameInput {
  readonly seed: string;
  readonly callerVersion?: CallerVersion;
}

export function exportGame(input: ExportGameInput): GameFile {
  if (input.seed.trim().length === 0) throw new Error("a game needs a seed");
  const index = indexLeague(buildFlatLeague({ teams: 2 }));
  const [homeId, awayId] = index.teamIds();
  const [fixture] = buildFixtures(index, {
    kind: "SYNTHETIC_PAIR",
    home: homeId!,
    away: awayId!,
    games: 1,
    season: 2024,
  });
  const built = buildFixture(index, fixture!);
  const { observation } = runOneGame({
    built,
    seed: input.seed,
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    ...(input.callerVersion === undefined ? {} : { callerVersion: input.callerVersion }),
  });

  const teamOf = (id: string): GameFileTeam => {
    const team = index.teams.get(id);
    if (team === undefined) throw new Error(`team ${id} is not in the league`);
    return { id, city: team.city, name: team.displayName };
  };
  const players: Record<string, GameFilePlayer> = {};
  for (const id of [String(homeId), String(awayId)]) {
    for (const playerId of index.teams.get(id)!.roster) {
      const bio = index.players.get(String(playerId))!.bio;
      players[String(playerId)] = { name: bio.displayName, position: bio.position, team: id };
    }
  }

  return {
    format: GAME_FILE_FORMAT,
    seed: input.seed,
    league: "flat",
    callerVersion: input.callerVersion ?? "default",
    home: teamOf(String(homeId)),
    away: teamOf(String(awayId)),
    players,
    events: observation.events,
    statlines: observation.statlines,
  };
}
