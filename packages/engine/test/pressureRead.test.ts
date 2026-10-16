/**
 * ADR-073 step 3.2b — THE PRESSURE READ.
 *
 * ============================ THE TABLE (§2.2) ============================
 *
 * The blitz read's bands are §5.1's six, at the coverage read's own cuts (ADR-068 §2), and each
 * names the picture it makes of the front. §5.3's two outcomes split where the six do, at margin 0,
 * so `recognized` (the point-out) is the TRUE and COUNT pictures and nothing else.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import { resolveBlitzRecognition } from "../src/resolve/blitz.js";
import { TUNABLES } from "../src/tunables.js";
import { buildScenario } from "./fixtures.js";

const RECOGNITION = TUNABLES.presnap.blitzRecognition.bands;

describe("ADR-073 §2.2: the pressure read's six bands", () => {
  it("cuts where the coverage read cuts: §5.1's six rows", () => {
    expect(RECOGNITION.map((b) => b.minMargin)).toEqual(TUNABLES.presnap.coverageRead.bands.map((b) => b.minMargin));
    expect(RECOGNITION.map((b) => b.label)).toEqual([
      "DIAGNOSED",
      "IDENTIFIED",
      "COUNTED",
      "UNSURE",
      "MISIDENTIFIED",
      "BUSTED",
    ]);
  });

  it("names each band's picture: true, true, count, call, look, look", () => {
    expect(RECOGNITION.map((b) => b.picture)).toEqual(["TRUE", "TRUE", "COUNT", "CALL", "LOOK", "LOOK"]);
  });

  it("is §5.3's success exactly on the TRUE and COUNT pictures, which is margin 0", () => {
    for (const band of RECOGNITION) {
      expect(band.recognized, band.label).toBe(band.picture === "TRUE" || band.picture === "COUNT");
      expect(band.recognized, band.label).toBe(band.minMargin >= 0);
    }
  });

  it("the outcome carries its band's picture and its band's success, on every band", () => {
    const { state } = buildScenario();
    const quarterback = state.players[state.quarterback as unknown as string];
    if (quarterback === undefined) throw new Error("bad fixture: no quarterback");
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const outcome = resolveBlitzRecognition({
        tunables: TUNABLES,
        quarterback,
        center: undefined,
        disguise: "ZERO",
        presnapRng: createRng(`pressure-read-${String(i)}`, "presnap"),
      });
      const band = RECOGNITION.find((b) => b.label === outcome.band);
      expect(band, outcome.band).toBeDefined();
      expect(outcome.picture).toBe(band?.picture);
      expect(outcome.recognized).toBe(band?.recognized);
      expect(outcome.presnap.band).toBe(outcome.band);
      seen.add(outcome.band);
    }
    expect(seen.size).toBe(RECOGNITION.length);
  });
});
