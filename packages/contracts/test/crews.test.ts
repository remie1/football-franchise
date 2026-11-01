/**
 * ADR-093 F5 (step 1): `OfficiatingCrew`, its lean on each family, and the crew on `GAME_START`.
 *
 * Type-level, as the other ADR-093 files are: the `@ts-expect-error` lines and the pins
 * (`typePins.ts`) fail `pnpm --filter @ff/contracts typecheck` if the edit is loosened or lost, and
 * the runtime asserts show the shapes survive JSON. No game carries a crew at step 1, so nothing
 * here can change a stream.
 */
import { describe, expect, it } from "vitest";
import {
  officiatingCrewId,
  type CrewLeanFamily, type MatchEvent, type OfficiatingCrew, type OfficiatingCrewId, type TeamId,
} from "../src/index.js";
import type { Is, OptionalKeys, UndefinedKeys } from "./typePins.js";

type StartPayload = Extract<MatchEvent, { type: "GAME_START" }>["payload"];

const team = "T1" as TeamId;
const away = "T2" as TeamId;

const crew: OfficiatingCrew = {
  id: officiatingCrewId("crew-07"),
  referee: "A. Placeholder",
  leans: { LINE_HOLDING: 62, COVERAGE: 50, PLAYER_SAFETY: 44, TECHNICAL: 58, SNAP: 50 },
};

describe("ADR-093 F5: the crew", () => {
  it("has a lean for each of §6.1's five families, and none for kicks", () => {
    const families: Record<CrewLeanFamily, true> = { LINE_HOLDING: true, COVERAGE: true, PLAYER_SAFETY: true, TECHNICAL: true, SNAP: true };
    expect(Object.keys(crew.leans).sort()).toEqual(Object.keys(families).sort());
    // @ts-expect-error KICKS has no lean
    const kicks: OfficiatingCrew = { ...crew, leans: { ...crew.leans, KICKS: 50 } };
    // @ts-expect-error every one of the five has its lean
    const short: OfficiatingCrew = { ...crew, leans: { LINE_HOLDING: 62, COVERAGE: 50, PLAYER_SAFETY: 44, TECHNICAL: 58 } };
    // @ts-expect-error a crew's id is its own brand, not a team's
    const wrongId: OfficiatingCrewId = team;
    expect([kicks, short, wrongId]).toHaveLength(3);
  });

  it("states every key, and leans on exactly the five", () => {
    const pins: true[] = [
      true as Is<OptionalKeys<OfficiatingCrew>, never>,
      true as Is<UndefinedKeys<OfficiatingCrew["leans"]>, never>,
      true as Is<CrewLeanFamily, "LINE_HOLDING" | "COVERAGE" | "PLAYER_SAFETY" | "TECHNICAL" | "SNAP">,
    ];
    expect(pins).toHaveLength(3);
  });
});

describe("ADR-093 F5: the crew on GAME_START", () => {
  it("carries the whole crew, or no key at all", () => {
    const withCrew: StartPayload = { home: team, away, seed: "s", crew };
    const noCrew: StartPayload = { home: team, away, seed: "s" };
    // @ts-expect-error exactOptionalPropertyTypes: crew: undefined is refused, so a game with no crew writes no key
    const undef: StartPayload = { ...noCrew, crew: undefined };
    // @ts-expect-error the crew rides whole, leans and all, so the record says how it leaned
    const idOnly: StartPayload = { ...noCrew, crew: crew.id };
    const pins: true[] = [
      true as Is<OptionalKeys<StartPayload>, "crew">,
      true as Is<UndefinedKeys<StartPayload>, never>,
      true as Is<NonNullable<StartPayload["crew"]>, OfficiatingCrew>,
    ];
    expect(Object.keys(noCrew)).not.toContain("crew");
    expect(JSON.parse(JSON.stringify(withCrew))).toEqual(withCrew);
    expect([undef, idOnly]).toHaveLength(2);
    expect(pins).toHaveLength(3);
  });
});
