/**
 * ADR-093 F7 (step 1): the save keeps the league's crews and the crew given each game.
 *
 * Type-level, as the other ADR-093 files are: the `@ts-expect-error` lines and the pins
 * (`typePins.ts`) fail `pnpm --filter @ff/contracts typecheck` if the edit is loosened or lost, and
 * the runtime asserts show a save with officials survives its JSON. The edit is types and comments
 * only, so it changes no stream and no save by itself.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, gameId, officiatingCrewId, SAVE_FORMAT_VERSION,
  type GameId, type OfficiatingCrew, type OfficiatingCrewId, type SaveFile,
} from "../src/index.js";
import type { Is, OptionalKeys } from "./typePins.js";

type World = SaveFile["world"];
type Officiating = NonNullable<World["officiating"]>;
type Assignment = Officiating["assignments"][number];

const game: GameId = gameId("g1");
const crew: OfficiatingCrew = {
  id: officiatingCrewId("crew-07"),
  referee: "A. Placeholder",
  leans: { LINE_HOLDING: 62, COVERAGE: 50, PLAYER_SAFETY: 44, TECHNICAL: 58, SNAP: 50 },
};

describe("ADR-093 F7: the save keeps the crews and each game's crew", () => {
  const officiating: Officiating = { crews: [crew], assignments: [{ game, crew: crew.id }] };
  const at = { season: 2027, phase: "REGULAR_SEASON" as const, week: 4, day: 7 };
  const save: SaveFile = {
    formatVersion: SAVE_FORMAT_VERSION, createdBy: "test", registrySchemaVersion: 1, worldSeed: "s", calendar: at,
    leagueRules: DEFAULT_LEAGUE_RULES,
    world: {
      teams: [], players: [], staff: [], contracts: [], perceptions: [],
      league: { conferences: [], divisions: [] }, season: null, officiating, narrativeState: null, fashion: null,
    },
    history: { seasons: [], transactions: [] },
  };

  it("a save with officials survives JSON unchanged, and one without them still type-checks", () => {
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
    const { officiating: _omit, ...older } = save.world;
    const before: SaveFile = { ...save, world: older };
    expect(before.world.officiating).toBeUndefined();
  });

  it("an assignment names its game and its crew by their ids, and the two lists come together", () => {
    // @ts-expect-error a crew is named by its id, not by its referee
    const byName: Officiating = { crews: [crew], assignments: [{ game, crew: "A. Placeholder" }] };
    // @ts-expect-error and an assignment is for a game
    const noGame: Officiating = { crews: [crew], assignments: [{ crew: crew.id }] };
    // @ts-expect-error named by its GameId, not a bare string
    const bareGame: Officiating = { crews: [crew], assignments: [{ game: "g1", crew: crew.id }] };
    // @ts-expect-error both lists are there when officiating is
    const half: Officiating = { crews: [crew] };
    // @ts-expect-error exactOptionalPropertyTypes: officiating: undefined is refused, so a league with no crews writes no key
    const undef: World = { ...save.world, officiating: undefined };
    expect([byName, noGame, bareGame, half, undef]).toHaveLength(5);
  });

  it("states every key, each by its own type, and the slot itself is optional", () => {
    const pins: true[] = [
      true as Is<OptionalKeys<Officiating>, never>,
      true as Is<OptionalKeys<Assignment>, never>,
      true as Is<Assignment["game"], GameId>,
      true as Is<Assignment["crew"], OfficiatingCrewId>,
      true as Is<Officiating["crews"][number], OfficiatingCrew>,
      true as Is<Extract<OptionalKeys<World>, "officiating">, "officiating">,
      true as Is<undefined extends Required<World>["officiating"] ? true : false, false>,
    ];
    expect(pins).toHaveLength(7);
  });
});
