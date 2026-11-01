/**
 * ADR-093 F6 (step 0): `PENALTY_OPTION`, the offended team's decision on a flag, and the
 * `COACH_DECISION` that names its flag.
 *
 * Type-level, as the other ADR-093 files are: the `@ts-expect-error` lines and the pins
 * (`typePins.ts`) fail `pnpm --filter @ff/contracts typecheck` if the edit is loosened or lost.
 * Nothing decides a flag at step 0, so nothing here can change a stream. The whole list of decision
 * kinds is not pinned here, so another petition may add a kind without editing this file.
 */
import { describe, expect, it } from "vitest";
import type { CoachDecisionKind, GameId, MatchEvent, PlayId, TeamId } from "../src/index.js";
import type { Is, OptionalKeys, UndefinedKeys } from "./typePins.js";

type DecisionEvent = Extract<MatchEvent, { type: "COACH_DECISION" }>;
type DecisionPayload = DecisionEvent["payload"];
type PenaltyOption = Extract<DecisionPayload, { kind: "PENALTY_OPTION" }>;

const team = "T1" as TeamId;
const gameId = "g1" as GameId;
const ref = "g1/play:12/penalty:p1";

describe("ADR-093 F6: the offended team's decision on a flag", () => {
  const option: DecisionPayload = { kind: "PENALTY_OPTION", rollRef: ref, authority: "COACH", team, choice: "ACCEPT" };

  it("PENALTY_OPTION is a coach decision kind, and its decision names the flag by rollRef", () => {
    const kind: CoachDecisionKind = "PENALTY_OPTION";
    const fourth: DecisionPayload = { kind: "FOURTH_DOWN", authority: "COACH", team, choice: "PUNT" };
    const event: DecisionEvent = { type: "COACH_DECISION", payload: option, gameId };
    const flagOf = (d: DecisionPayload): string | undefined => (d.kind === "PENALTY_OPTION" ? d.rollRef : undefined);
    expect(kind).toBe(option.kind);
    expect([flagOf(option), flagOf(fourth)]).toEqual([ref, undefined]);
    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
  });

  it("refuses a penalty decision that names no flag, and any other decision that names one", () => {
    // @ts-expect-error a PENALTY_OPTION decision names its flag
    const orphan: DecisionPayload = { kind: "PENALTY_OPTION", authority: "COACH", team, choice: "DECLINE" };
    // @ts-expect-error a fourth-down decision names none
    const stray: DecisionPayload = { kind: "FOURTH_DOWN", rollRef: ref, authority: "COACH", team, choice: "PUNT" };
    // A fourth-down decision built elsewhere, naming a flag: refused too, so `rollRef?: never` does the work.
    const built = { kind: "FOURTH_DOWN" as const, rollRef: ref, authority: "COACH" as const, team, choice: "PUNT" };
    // @ts-expect-error a fourth-down decision names no flag, even one not written as a literal
    const smuggled: DecisionPayload = built;
    // @ts-expect-error the authority stays COACH (Iron Rule 6)
    const gm: DecisionPayload = { ...option, authority: "GM" };
    expect([orphan, stray, smuggled, gm]).toHaveLength(4);
  });

  it("stays a game event: it names its flag in its payload, never by a playId (ADR-014 item 13)", () => {
    // @ts-expect-error a decision carries no playId
    const scoped: DecisionEvent = { type: "COACH_DECISION", payload: option, gameId, playId: "g1:12" as PlayId };
    const pins: true[] = [
      true as Is<OptionalKeys<PenaltyOption>, never>,
      true as Is<Required<Exclude<DecisionPayload, PenaltyOption>>["rollRef"], never>,
      true as Is<UndefinedKeys<DecisionPayload>, never>,
    ];
    expect(scoped.type).toBe("COACH_DECISION");
    expect(pins).toHaveLength(3);
  });
});
