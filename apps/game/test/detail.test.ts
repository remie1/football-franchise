/**
 * Play detail over the hand-built game (`fixture.ts`): the calls as called, the shown-vs-played
 * disguise, the pre-snap read, the pocket tick by tick and the dice, each worded from its event.
 */
import { describe, expect, it } from "vitest";
import type { RollDetail } from "@ff/contracts";
import { buildPlayDetail, eventsOfPlay, sayAssignment, sayModifiers, sayRoll } from "../src/playDetail.js";
import { FIXTURE } from "./fixture.js";

const roll = (raw: number, total: number, mods: { source: string; value: number }[] = []): RollDetail =>
  ({ die: "d100", raw, total, modifiers: mods, rngLabel: "r" }) as RollDetail;

describe("wording", () => {
  it("states a roll as landed and as totalled, adding nothing up", () => {
    expect(sayRoll(roll(42, 66))).toBe("42 → 66");
    expect(sayRoll(roll(42, 42))).toBe("42");
    expect(sayModifiers(roll(42, 52, [{ source: "QB Awareness", value: 12 }, { source: "Rain", value: -2 }]))).toBe("QB Awareness +12, Rain −2");
  });

  it("says an assignment as a coach would", () => {
    expect(sayAssignment(FIXTURE, { kind: "MAN", covers: "wr", technique: "PRESS" })).toBe("man on Wes Reed (press)");
    expect(sayAssignment(FIXTURE, { kind: "ZONE", zone: { horizontal: "C", vertical: "DEEP" } })).toBe("deep middle zone");
    expect(sayAssignment(FIXTURE, null)).toBe("?");
  });
});

describe("buildPlayDetail", () => {
  const d = buildPlayDetail(FIXTURE, "p1");

  it("lists both calls as called", () => {
    expect(d.offense).toEqual([
      { label: "Call", value: "Spot Option" },
      { label: "Formation", value: "Shotgun Trips Right" },
      { label: "Reads", value: "Concept" },
      { label: "Read order", value: "Wes Reed, Ty Ellis" },
      { label: "Routes", value: "Wes Reed Post, Ty Ellis Seam" },
      { label: "Protection", value: "slide left, pickup Rob Bell, slide check on" },
      { label: "Coach's leash", value: "50" },
    ]);
    expect(d.defense).toEqual([
      { label: "Call", value: "Cover 1" },
      { label: "Personnel", value: "Nickel" },
      { label: "Front", value: "Over" },
      { label: "Coverage", value: "Mixed" },
      { label: "Looks (disguises)", value: "Show 2" },
      { label: "Pressures", value: "Smoke" },
      { label: "Coverage disguise", value: "rotated at the snap" },
      { label: "Blitz disguise", value: "none" },
      { label: "Rushers", value: "Dez Edge (speed)" },
    ]);
  });

  it("shows only the defenders whose look differed from their job", () => {
    expect(d.disguise).toEqual([{ defender: "Finn Shaw", showed: "deep middle zone", played: "deep left half zone" }]);
  });

  it("gives the pre-snap read with its roll, target and band", () => {
    expect(d.reads).toEqual([{ who: "Ada Quinn", read: "Coverage read", roll: "40 → 52 vs 50", modifiers: "QB Awareness +12", result: "Good read" }]);
  });

  it("puts each moment on its tick, in stream order", () => {
    expect(d.timeline).toEqual([
      { tick: "1", text: "Pocket: pressure" },
      { tick: "1", text: "Pocket: collapsing" },
      { tick: "1", text: "Throws to Wes Reed (bullet, success)" },
      { tick: "1", text: "Wes Reed: caught (routine)" },
      { tick: "1", text: "Result: 25 yards" },
    ]);
  });

  it("lists every roll of the dice, opposed or against a target", () => {
    expect(d.dice).toEqual([
      {
        kind: "Pass rush rep",
        who: "Dez Edge vs Lou Tate",
        roll: "70 → 82",
        modifiers: "DE Pass Rush +12; against: LT Pass Block −2",
        against: "vs 30 → 28",
        margin: 54,
        tier: "Dominant success",
        band: "Rusher wins rep",
      },
    ]);
    const kick = buildPlayDetail(FIXTURE, "x1");
    expect(kick.offense).toEqual([]);
    expect(kick.dice.map((r) => [r.kind, r.roll, r.against])).toEqual([["Field goal", "77", "needs 10"]]);
  });

  it("shows the pocket only when it changes", () => {
    const again = FIXTURE.events.flatMap((e) =>
      e.event.type === "POCKET_STATUS" && "playId" in e.event && e.event.playId === "p1" ? [e, e] : [e],
    );
    const pockets = buildPlayDetail({ ...FIXTURE, events: again }, "p1").timeline.filter((t) => t.text.startsWith("Pocket"));
    expect(pockets.map((t) => t.text)).toEqual(["Pocket: pressure", "Pocket: collapsing"]);
  });

  it("reads one play's events and nothing else", () => {
    expect(eventsOfPlay(FIXTURE, "p2").every((e) => "playId" in e && e.playId === "p2")).toBe(true);
    expect(buildPlayDetail(FIXTURE, "no-such-play")).toEqual({ offense: [], defense: [], disguise: [], reads: [], timeline: [], dice: [] });
  });
});
