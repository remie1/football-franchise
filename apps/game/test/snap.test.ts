/**
 * ADR-090 step 1 in the viewer: where every man stood at the snap, read off PLAY_START and laid
 * out for the drawing. The screen draws the picture's own spots and adds nothing up.
 */
import { describe, expect, it } from "vitest";
import { buildPlayDetail } from "../src/playDetail.js";
import { drawSnap, FIELD_WIDTH_YARDS, readSnapPicture, sayAcross, sayDepth } from "../src/snapPicture.js";
import { FIXTURE, P1_PICTURE } from "./fixture.js";

describe("reading the picture", () => {
  const snap = buildPlayDetail(FIXTURE, "p1").snap;

  it("reads every spot with the roster's name, position and team, and leaves out a spot that does not read", () => {
    expect(snap?.ballX).toBe(0);
    expect(snap?.men.map((m) => `${m.side} ${m.name} ${m.position} ${m.team}`)).toEqual([
      "offense Ada Quinn QB away",
      "offense Lou Tate LT away",
      "offense Wes Reed WR away",
      "offense Ty Ellis TE away",
      "offense Rob Bell RB away",
      "defense Dez Edge DE home",
      "defense Cal Burke CB home",
      "defense Finn Shaw FS home",
      "defense zz  unknown",
    ]);
    expect(snap?.men.find((m) => m.id === "lt")).toMatchObject({ x: -3, y: -1, down: true });
    expect(snap?.men.find((m) => m.id === "fs")?.moving).toEqual({ dx: -0.6, dy: -0.8, yardsPerSecond: 3 });
    expect(snap?.men.some((m) => "moving" in m && m.id !== "fs")).toBe(false);
  });

  it("shows no picture for a play whose start carries none (a file made before step 1)", () => {
    expect(buildPlayDetail(FIXTURE, "p2").snap).toBeUndefined();
    expect("snap" in buildPlayDetail(FIXTURE, "p2")).toBe(false);
    expect(readSnapPicture(FIXTURE, undefined)).toBeUndefined();
    expect(readSnapPicture(FIXTURE, { ballX: 0, offense: [{ player: "qb" }], defense: "no" })).toBeUndefined();
  });

  it("says a spot as a coach would", () => {
    expect([sayAcross(0), sayAcross(-3.5), sayAcross(20)]).toEqual(["on the ball", "3.5 left", "20 right"]);
    expect([sayDepth(0), sayDepth(-5), sayDepth(1)]).toEqual(["on the line", "5 back", "1 downfield"]);
  });
});

describe("laying it out", () => {
  const drawing = drawSnap(readSnapPicture(FIXTURE, P1_PICTURE)!);
  const man = (id: string) => drawing.men.find((m) => m.mark.id === id)!;

  it("spans the field sideline to sideline, and from behind the deepest back to past the deepest defender", () => {
    expect(drawing.width).toBe(FIELD_WIDTH_YARDS);
    expect(drawing.left).toBe(-26.65);
    expect(drawing.top).toBe(-15);
    expect(drawing.height).toBe(23);
    expect(drawing.viewBox).toBe("-26.65 -15 53.3 23");
    expect(drawing.yardLines.map((l) => l.yards)).toEqual([-5, 5, 10, 15]);
    expect(drawing.hashes).toEqual([-3.1, 3.1]);
  });

  it("draws downfield up the screen, the offense at the bottom, and a hand on the ground toward the line", () => {
    expect([man("qb").cx, man("qb").cy]).toEqual([0, 5]);
    expect([man("fs").cx, man("fs").cy]).toEqual([3, -12]);
    expect(man("lt").hand).toEqual({ cx: -3, cy: 0.05 });
    expect(man("de").hand).toEqual({ cx: 5.5, cy: -0.05 });
    expect(man("qb").hand).toBeUndefined();
  });

  it("draws a moving man's arrow to where he is a second after the snap", () => {
    const arrow = man("fs").arrow;
    expect(arrow?.x2).toBeCloseTo(3 - 0.6 * 3);
    expect(arrow?.y2).toBeCloseTo(-12 + 0.8 * 3);
    expect(arrow?.head.split(" ")).toHaveLength(3);
    expect(man("cb").arrow).toBeUndefined();
  });
});

describe("a man stacked behind another", () => {
  it("is drawn first, under the man nearer the line, with his label past him", () => {
    const stacked = readSnapPicture(FIXTURE, {
      ballX: 0,
      offense: [
        { player: "qb", x: 0, y: -1, stance: "UP" },
        { player: "lt", x: 0, y: -0.5, stance: "DOWN" },
        { player: "wr", x: -20, y: -0.5, stance: "UP" },
      ],
      defense: [
        { player: "de", x: 4.5, y: 1, stance: "DOWN" },
        { player: "cb", x: 4.5, y: 1.5, stance: "UP" },
      ],
    })!;
    const drawing = drawSnap(stacked);
    expect(drawing.men.map((m) => m.mark.id)).toEqual(["cb", "qb", "de", "lt", "wr"]);
    const at = (id: string) => drawing.men.find((m) => m.mark.id === id)!;
    // The quarterback under center: past him is further from the line, down the screen.
    expect(at("qb").labelY).toBe(at("qb").cy + 1.35);
    // The backer stacked behind his end: past him is up the screen.
    expect(at("cb").labelY).toBe(at("cb").cy - 1.35);
    for (const id of ["lt", "de", "wr"]) expect(at(id).labelY).toBe(at(id).cy);
  });
});
