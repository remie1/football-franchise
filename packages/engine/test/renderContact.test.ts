/**
 * ADR-089 step 4 — THE RENDERER READS CONTACT (`debug/renderPlay.ts`; plan §2.3).
 *
 * The `arrival_contest` CHECK (P6), `QB_HIT` (P7) and `THROW.releaseSeconds` (P8) are on the stream
 * of every play whose rules carry a step-4 block (`pocket-1` from `pocket-1.s4`). These tests check
 * the printout's CONTACT section and release line on such streams, and that a stream without them
 * (`legacy` to `pocket-1.s3`, or a step-4 stream with them taken off) prints neither.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { renderPlay } from "../src/debug/renderPlay.js";
import { simulatePassPlay } from "../src/index.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { playStep4, T_TUNABLES, S4S_TUNABLES, withoutStep4 } from "./step4Fixtures.js";
import type { Step4Play } from "./step4Fixtures.js";

const names = (id: PlayerId): string => `#${String(id)}`;

/** The play's stream, the records on it. */
const lifted = (p: Step4Play): readonly MatchEventEnvelope[] => p.events;

/** A step-4 stream with its records taken off, `releaseSeconds` included. */
const unlifted = (p: Step4Play): MatchEventEnvelope[] =>
  withoutStep4(p.events).map((e) => {
    if (e.event.type !== "THROW") return e;
    const { releaseSeconds: _dropped, ...payload } = e.event.payload;
    return { ...e, event: { ...e.event, payload } };
  });

function find(t: typeof T_TUNABLES, pred: (p: Step4Play) => boolean): Step4Play {
  for (const [, build] of PASS_FIXTURES) {
    for (let i = 0; i < 60; i++) {
      const { state, calls } = build();
      const p = playStep4(state, calls, `render-${i}`, t);
      if (pred(p)) return p;
    }
  }
  throw new Error("no such play in the corpus");
}

describe("ADR-089 step 4 — the renderer's CONTACT section and release line", () => {
  it("a shed then a sack: both contests and the SHED hit, in order, with their numbers", () => {
    const p = find(T_TUNABLES, (x) => {
      const bands = x.records.flatMap((r) => (r.kind === "CONTEST" ? [r.payload.band] : []));
      return bands.includes("QB_SHEDS") && bands.includes("RUSHER_SACKS");
    });
    const text = renderPlay(lifted(p), names);
    expect(text).toContain("CONTACT (ADR-089 step 4: throw first, then the contest):");
    const contests = p.records.filter((r) => r.kind === "CONTEST");
    for (const c of contests) {
      if (c.kind !== "CONTEST") continue;
      expect(text).toContain(`Result: ${c.payload.band} (${c.payload.margin >= 0 ? "+" : ""}${c.payload.margin})`);
    }
    const shed = p.records.find((r) => r.kind === "QB_HIT" && r.payload.phase === "SHED");
    if (shed?.kind !== "QB_HIT") throw new Error("no shed");
    expect(text).toContain(`QB_HIT SHED by #${String(shed.payload.rusher)} — ${String(shed.payload.approach)} from ${shed.payload.from}, contact at ${shed.payload.contactSeconds} s`);
    const section = text.slice(text.indexOf("CONTACT ("));
    expect(section.indexOf("QB_HIT SHED")).toBeGreaterThan(section.indexOf("arrival contest"));
    // The sack's own QB_HIT (contracts-guardian G-6), after the contest that sacked him.
    const sack = p.records.find((r) => r.kind === "QB_HIT" && r.payload.phase === "SACK");
    if (sack?.kind !== "QB_HIT") throw new Error("no QB_HIT SACK");
    const sackLine = `QB_HIT SACK by #${String(sack.payload.rusher)} — ${String(sack.payload.approach)} from ${sack.payload.from}, contact at ${sack.payload.contactSeconds} s`;
    expect(section).toContain(sackLine);
    expect(section.indexOf(sackLine)).toBeGreaterThan(section.lastIndexOf("Result: RUSHER_SACKS"));
  });

  it("a THROWING hit and the release under the motion", () => {
    const p = find(S4S_TUNABLES, (x) => x.records.some((r) => r.kind === "QB_HIT" && r.payload.phase === "THROWING"));
    const text = renderPlay(lifted(p), names);
    const release = p.records.find((r) => r.kind === "RELEASE");
    if (release?.kind !== "RELEASE") throw new Error("no release");
    expect(text).toContain(`Released at ${release.payload} s`);
    expect(text).toMatch(/QB_HIT THROWING by #\S+ — \w+ from (FRONT|SIDE|BEHIND), contact at [\d.]+ s/);
  });

  it("a stream without them (legacy to s3, or the records taken off) prints neither", () => {
    for (const t of [T_TUNABLES, S4S_TUNABLES]) {
      const p = find(t, (x) => x.records.length > 0);
      const text = renderPlay(unlifted(p), names);
      expect(text).not.toContain("CONTACT (");
      expect(text).not.toContain("Released at");
      expect(text).not.toContain("QB_HIT");
    }
    for (const [, build] of PASS_FIXTURES.slice(0, 4)) {
      const { state, calls } = build();
      const plain = renderPlay(simulatePassPlay(state, calls, "render-plain").events, names);
      expect(plain).not.toContain("CONTACT (");
      expect(plain).not.toContain("Released at");
    }
  });
});
