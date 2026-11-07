/**
 * ADR-089 step 4 — THE RENDERER READS CONTACT (`debug/renderPlay.ts`; plan §2.3).
 *
 * The `arrival_contest` CHECK (P6), `QB_HIT` (P7) and `THROW.releaseSeconds` (P8) reach no stream
 * before the owner lifts them, so the renderer reads them structurally. These tests build the stream
 * the engine will write once they are lifted, by placing each recorded record at the position the
 * recorder gave it, and check the printout's CONTACT section and release line; a stream without
 * them, every stream today, prints neither.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { renderPlay } from "../src/debug/renderPlay.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { playStep4, T_TUNABLES, S4S_TUNABLES } from "./step4Fixtures.js";
import type { Step4Play } from "./step4Fixtures.js";

const names = (id: PlayerId): string => `#${String(id)}`;

/** The lifted stream: each record placed where the recorder said it would stand. */
function lifted(p: Step4Play): MatchEventEnvelope[] {
  const out: MatchEventEnvelope[] = p.events.map((e) => ({ ...e, event: { ...e.event } }) as MatchEventEnvelope);
  const releases = new Map<number, number>();
  const inserts: { seq: number; env: MatchEventEnvelope }[] = [];
  for (const r of p.records) {
    if (r.kind === "RELEASE") {
      releases.set(r.at.seq, r.payload);
      continue;
    }
    const template = p.events.find((e) => e.seq === r.at.seq) ?? p.events[p.events.length - 1]!;
    const event = {
      ...template.event,
      tick: r.at.tick,
      type: r.kind === "CONTEST" ? "CHECK" : "QB_HIT",
      payload: r.payload,
    };
    inserts.push({ seq: r.at.seq, env: { ...template, event } as unknown as MatchEventEnvelope });
  }
  for (const e of out) {
    const s = releases.get(e.seq);
    if (s !== undefined && e.event.type === "THROW") (e.event as unknown as { payload: object }).payload = { ...e.event.payload, releaseSeconds: s };
  }
  const result: MatchEventEnvelope[] = [];
  for (const e of out) {
    for (const ins of inserts) if (ins.seq === e.seq) result.push(ins.env);
    result.push(e);
  }
  return result;
}

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
  });

  it("a THROWING hit and the release under the motion", () => {
    const p = find(S4S_TUNABLES, (x) => x.records.some((r) => r.kind === "QB_HIT" && r.payload.phase === "THROWING"));
    const text = renderPlay(lifted(p), names);
    const release = p.records.find((r) => r.kind === "RELEASE");
    if (release?.kind !== "RELEASE") throw new Error("no release");
    expect(text).toContain(`Released at ${release.payload} s`);
    expect(text).toMatch(/QB_HIT THROWING by #\S+ — \w+ from (FRONT|SIDE|BEHIND), contact at [\d.]+ s/);
  });

  it("a stream without them (every stream today) prints neither", () => {
    const p = find(T_TUNABLES, (x) => x.records.length > 0);
    const text = renderPlay(p.events, names);
    expect(text).not.toContain("CONTACT (");
    expect(text).not.toContain("Released at");
    for (const [, build] of PASS_FIXTURES.slice(0, 4)) {
      const { state, calls } = build();
      const plain = playStep4(state, calls, "render-plain", S4S_TUNABLES);
      expect(renderPlay(plain.events, names)).not.toContain("QB_HIT");
    }
  });
});
