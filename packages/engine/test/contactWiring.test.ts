/**
 * ADR-089 step 4 — CONTACT AND THE MOTION, WIRED (`sim/passPlay.ts`; plan §2.2, §7 R-4 and R-5).
 *
 * P6, P7 and P8 are in contracts, so these plays write their records on the stream (read back by
 * `step4RecordsOf`). On corpora of the pass fixtures under the design's shape, shape S, shape L,
 * kind T, contact alone and the motion alone, they hold:
 *  - the gates are open: `simulatePassPlay` plays every step-4 bundle, and the log writes each record;
 *  - the contest (§4.5 items 2 to 5): its full labels, `:contest` first and `:contest2` only after
 *    the play's first shed, the bands against the margins, RUSHER_SACKS as the play's sack with a
 *    `QB_HIT` SACK naming the CHECK, QB_SHEDS as a `QB_HIT` SHED naming the CHECK and a DELAYED
 *    publication by approach; a sack with no contest writes no `QB_HIT`; every label unique;
 *  - throw first: a throw on a tick with a threat ARRIVED is one `QB_HIT` ARRIVAL, no contest;
 *  - the motion: `releaseSeconds` on every aimed THROW, the race's THROWING hit and its IMMEDIATE row;
 *  - kind T reads the published grid; BEHIND after a STEP_UP; CONTEST_BEFORE_THROW and RATED;
 *  - determinism; R-4's pairing (kind T against today's line, the design against s3), up to the
 *    first record that can change the play.
 */
import { describe, expect, it } from "vitest";
import { getAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { ATTR } from "../src/attrs.js";
import { PlayEventLog } from "../src/events.js";
import { rho, toMilliseconds } from "../src/resolve/motion.js";
import { simulatePassPlayWith } from "../src/sim/passPlay.js";
import { PocketRulesError } from "../src/sim/pocketRules.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import { buildLopsidedRushScenario } from "./fixtures.js";
import { PASS_FIXTURES, S3_TUNABLES, tickOf } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import {
  CONTACT_FILED,
  GRANTED,
  MOTION_FILED,
  S4C_TUNABLES,
  S4L_TUNABLES,
  S4M_TUNABLES,
  S4S_TUNABLES,
  S4_TUNABLES,
  T_TUNABLES,
  playStep4,
  withStep4,
  withoutStep4,
} from "./step4Fixtures.js";
import type { Step4Play, Step4Record } from "./step4Fixtures.js";

type Payload = Record<string, unknown>;
const payloadOf = (e: MatchEventEnvelope): Payload => e.event.payload as unknown as Payload;
const typeOf = (e: MatchEventEnvelope): string => e.event.type;
const tickOfEnv = (e: MatchEventEnvelope): number | undefined => tickOf(e);

interface Played extends Step4Play {
  readonly fixture: string;
  readonly seed: string;
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
}

/** Every pass fixture, `n` seeds each, under `tunables` (with the snap picture when `pictured`). */
function corpus(tunables: Tunables, n: number, pictured = false, prefix = "wire"): Played[] {
  const out: Played[] = [];
  for (const [fixture, build] of PASS_FIXTURES) {
    for (let i = 0; i < n; i++) {
      const { state, calls: raw } = build();
      const calls = pictured ? withPicture(state, raw) : raw;
      const seed = `${prefix}-${i}`;
      out.push({ fixture, seed, state, calls, ...playStep4(state, calls, seed, tunables) });
    }
  }
  return out;
}

const contests = (p: Step4Play) => p.records.filter((r): r is Extract<Step4Record, { kind: "CONTEST" }> => r.kind === "CONTEST");
const hits = (p: Step4Play) => p.records.filter((r): r is Extract<Step4Record, { kind: "QB_HIT" }> => r.kind === "QB_HIT");
const releases = (p: Step4Play) => p.records.filter((r): r is Extract<Step4Record, { kind: "RELEASE" }> => r.kind === "RELEASE");

/** His latest published `RUSH_THREAT` before stream position `seq`. */
function latestThreat(events: readonly MatchEventEnvelope[], rusher: PlayerId, seq: number): Payload | undefined {
  let found: Payload | undefined;
  for (const e of events) {
    if (e.seq >= seq) break;
    if (typeOf(e) === "RUSH_THREAT" && payloadOf(e)["rusher"] === rusher) found = payloadOf(e);
  }
  return found;
}

const LABEL = /\/rush\/t(\d+\.\d)\/([^/]+):(contest2?)$/;

/** Every roll label a play's stream carries (its contests included, since the lift). */
function labelsOf(p: Step4Play): string[] {
  const out: string[] = [];
  for (const e of p.events) {
    if (typeOf(e) !== "CHECK") continue;
    const pl = payloadOf(e) as { roll?: { rngLabel: string }; opposedRoll?: { rngLabel: string } };
    if (pl.roll !== undefined) out.push(pl.roll.rngLabel);
    if (pl.opposedRoll !== undefined) out.push(pl.opposedRoll.rngLabel);
  }
  return out;
}

const SETS: readonly (readonly [string, Tunables, boolean])[] = [
  ["S4", S4_TUNABLES, true],
  ["S4S", S4S_TUNABLES, false],
  ["S4L", S4L_TUNABLES, false],
  ["S4C", S4C_TUNABLES, false],
  ["S4M", S4M_TUNABLES, false],
  ["T", T_TUNABLES, false],
];
const CORPORA = new Map(SETS.map(([name, t, pictured]) => [name, corpus(t, 30, pictured)]));
const corpusOf = (name: string): Played[] => {
  const c = CORPORA.get(name);
  if (c === undefined) throw new Error(name);
  return c;
};

describe("ADR-089 step 4: the gates are open (P6, P7 and P8 in contracts)", () => {
  it("simulatePassPlay plays every step-4 bundle, and its stream is the seam's", () => {
    for (const [, build] of PASS_FIXTURES) {
      for (const [name, t, pictured] of SETS) {
        const { state, calls: raw } = build();
        const calls = pictured ? withPicture(state, raw) : raw;
        const barrel = simulatePassPlay(state, calls, `open-${name}`, t);
        const seam = simulatePassPlayWith(state, calls, `open-${name}`, t, { petitions: GRANTED });
        expect(JSON.stringify(barrel.events)).toBe(JSON.stringify(seam.events));
      }
    }
  });

  it("the log writes each record: the CHECK, the QB_HIT, and releaseSeconds last on its THROW", () => {
    const log = new PlayEventLog("g" as never, "p" as never, { season: 1, week: 1 } as never, 0);
    const roll = { die: "d100" as const, raw: 50, modifiers: [], total: 50, rngLabel: "g/rush/t2.0/r:contest2" };
    log.arrivalContest({ checkKind: "arrival_contest", actors: ["r" as PlayerId, "q" as PlayerId], roll, target: 15, tier: "TIE", band: "QB_SHEDS", margin: 35, testsAttrs: [] });
    log.qbHit({ qb: "q" as PlayerId, rusher: "r" as PlayerId, phase: "SHED", contactSeconds: 2, rollRef: roll.rngLabel, approach: "FREE", from: "FRONT", seen: true });
    log.throwBall("w" as never, "TOUCH" as never, "TIE" as never, "x", 2.31);
    log.throwBall("w" as never, "TOUCH" as never, "TIE" as never, "x");
    const out = log.drain().map((e) => e.event);
    expect(out.map((e) => e.type)).toEqual(["CHECK", "QB_HIT", "THROW", "THROW"]);
    expect(Object.keys(out[0]!.payload as object)).toEqual(["checkKind", "actors", "roll", "tier", "margin", "testsAttrs", "target", "band"]);
    expect(Object.keys(out[1]!.payload as object)).toEqual(["qb", "rusher", "phase", "contactSeconds", "rollRef", "approach", "from", "seen"]);
    expect(Object.keys(out[2]!.payload as object)).toEqual(["target", "throwType", "accuracyTier", "rollRef", "releaseSeconds"]);
    // Without `releaseSeconds` the THROW is today's, key for key.
    expect(Object.keys(out[3]!.payload as object)).toEqual(["target", "throwType", "accuracyTier", "rollRef"]);
  });

  it("a test that withholds a petition still sees the joint gate refuse", () => {
    const { state, calls } = PASS_FIXTURES[0]![1]();
    for (const petition of ["P6", "P7", "P8"] as const) {
      expect(() => simulatePassPlayWith(state, calls, "gate", T_TUNABLES, { petitions: { ...GRANTED, [petition]: false } })).toThrow(PocketRulesError);
    }
  });
});

describe("ADR-089 step 4 — the contest (§4.5 items 2 to 5)", () => {
  const withContact = ["S4", "S4S", "S4L", "S4C", "T"];

  it("every contest happens somewhere, and none without the contact block", () => {
    for (const name of withContact) expect(corpusOf(name).some((p) => contests(p).length > 0), name).toBe(true);
    expect(corpusOf("S4M").every((p) => contests(p).length === 0)).toBe(true);
    expect(corpusOf("S4M").every((p) => hits(p).every((h) => h.payload.phase !== "SHED"))).toBe(true);
  });

  it("labels, order, bands: :contest first, :contest2 only after the play's first shed", () => {
    let seconds = 0;
    for (const name of withContact) {
      for (const p of corpusOf(name)) {
        let shed = false;
        for (const c of contests(p)) {
          const m = LABEL.exec(c.payload.roll.rngLabel);
          expect(m, c.payload.roll.rngLabel).not.toBeNull();
          expect(c.payload.roll.rngLabel.startsWith(`game:`) || c.payload.roll.rngLabel.includes("/play:")).toBe(true);
          expect(Number(m![1])).toBe(c.at.tick);
          expect(m![2]).toBe(String(c.payload.actors[0]));
          expect(c.payload.actors[1]).toBe(p.state.quarterback);
          expect(c.payload.checkKind).toBe("arrival_contest");
          if (m![3] === "contest") {
            expect(shed, `${name} ${p.fixture} ${p.seed}`).toBe(false);
            expect(c.payload.opposedRoll).toBeDefined();
            expect(c.payload.target).toBe(CONTACT_FILED.boundary);
            expect(c.payload.margin).toBe(c.payload.roll.total - c.payload.opposedRoll!.total);
            // The quarterback's face is drawn on its own fork (ADR-004's audit key: one label a roll).
            expect(c.payload.opposedRoll!.rngLabel).toBe(
              c.payload.roll.rngLabel.replace(/\/([^/]+):contest$/, `/${String(p.state.quarterback)}:contest:$1`),
            );
          } else {
            seconds += 1;
            expect(shed).toBe(true);
            expect(c.payload.opposedRoll).toBeUndefined();
            expect(c.payload.target).toBe(15);
            expect(c.payload.testsAttrs).toEqual([]);
            expect(c.payload.margin).toBe(c.payload.roll.total - 15);
          }
          expect(c.payload.band).toBe(c.payload.margin >= (m![3] === "contest" ? CONTACT_FILED.boundary : 1) ? "RUSHER_SACKS" : "QB_SHEDS");
          if (c.payload.band === "QB_SHEDS") shed = true;
        }
      }
    }
    expect(seconds).toBeGreaterThan(0);
  });

  it("RUSHER_SACKS ends the play in a sack: one QB_HIT SACK naming the CHECK right after it, then nothing but the result", () => {
    let sacks = 0;
    for (const name of withContact) {
      for (const p of corpusOf(name)) {
        const cs = contests(p);
        const sackAt = cs.findIndex((c) => c.payload.band === "RUSHER_SACKS");
        if (sackAt < 0) continue;
        sacks += 1;
        const c = cs[sackAt]!;
        expect(sackAt).toBe(cs.length - 1);
        // contracts-guardian G-6: the sack's QB_HIT stands right after its CHECK and is the last record.
        const n = p.records.indexOf(c);
        expect(n).toBe(p.records.length - 2);
        const hit = p.records[n + 1];
        expect(hit?.kind).toBe("QB_HIT");
        if (hit?.kind !== "QB_HIT") continue;
        expect(hit.payload.phase).toBe("SACK");
        expect(hit.payload.rusher).toBe(c.payload.actors[0]);
        expect(hit.payload.qb).toBe(c.payload.actors[1]);
        expect(hit.payload.rollRef).toBe(c.payload.roll.rngLabel);
        expect(hit.at).toEqual({ seq: c.at.seq + 1, tick: c.at.tick });
        const after = p.events.filter((e) => e.seq > hit.at.seq);
        expect(after.map(typeOf)).toEqual(["PLAY_RESULT"]);
        expect(payloadOf(after[0]!)["yards"]).toBe(-DEFAULT_TUNABLES.result.sackYardsLost);
      }
    }
    expect(sacks).toBeGreaterThan(0);
  });

  it("a QB_HIT SACK only after a RUSHER_SACKS contest: one a sacking contest, none on a sack with no contest", () => {
    let contactless = 0;
    for (const [name] of SETS) {
      for (const p of corpusOf(name)) {
        const sackHits = hits(p).filter((h) => h.payload.phase === "SACK");
        const sacking = contests(p).filter((c) => c.payload.band === "RUSHER_SACKS");
        expect(sackHits.map((h) => h.payload.rollRef), `${name} ${p.fixture} ${p.seed}`).toEqual(sacking.map((c) => c.payload.roll.rngLabel));
        const result = p.events.find((e) => typeOf(e) === "PLAY_RESULT");
        const sacked =
          result !== undefined &&
          payloadOf(result)["yards"] === -DEFAULT_TUNABLES.result.sackYardsLost &&
          !p.events.some((e) => typeOf(e) === "THROW" || typeOf(e) === "THROWAWAY");
        if (sacked && sacking.length === 0) {
          contactless += 1;
          expect(sackHits).toHaveLength(0);
        }
      }
    }
    // The motion alone (no contact block) keeps today's automatic sack, with no contest and no hit.
    expect(contactless).toBeGreaterThan(0);
  });

  it("QB_SHEDS: a QB_HIT SHED naming the CHECK, then his threat DELAYED by approach (PUSH 1.0 s, else 0.5 s)", () => {
    let sheds = 0;
    let pushes = 0;
    for (const name of withContact) {
      for (const p of corpusOf(name)) {
        p.records.forEach((r, n) => {
          if (r.kind !== "CONTEST" || r.payload.band !== "QB_SHEDS") return;
          sheds += 1;
          const hit = p.records[n + 1];
          expect(hit?.kind).toBe("QB_HIT");
          if (hit?.kind !== "QB_HIT") return;
          expect(hit.payload.phase).toBe("SHED");
          expect(hit.payload.rusher).toBe(r.payload.actors[0]);
          expect(hit.payload.rollRef).toBe(r.payload.roll.rngLabel);
          expect(hit.at).toEqual({ seq: r.at.seq + 1, tick: r.at.tick });
          const before = latestThreat(p.events, hit.payload.rusher, hit.at.seq);
          const delayed = p.events.find((e) => e.seq === hit.at.seq + 1);
          expect(delayed && typeOf(delayed)).toBe("RUSH_THREAT");
          const d = payloadOf(delayed!);
          expect(d["rusher"]).toBe(hit.payload.rusher);
          expect(d["state"]).toBe("DELAYED");
          const wait = hit.payload.approach === "PUSH" ? 1.0 : 0.5;
          if (hit.payload.approach === "PUSH") pushes += 1;
          expect(Number(((d["etaTick"] as number) - (before!["etaTick"] as number)).toFixed(1))).toBe(wait);
        });
      }
    }
    expect(sheds).toBeGreaterThan(0);
    expect(pushes).toBeGreaterThan(0);
  });

  it("every contest label in a play is its own: unique, and on the stream once, in its own CHECK", () => {
    let n = 0;
    for (const name of withContact) {
      for (const p of corpusOf(name)) {
        // Every RollDetail a contest writes has its own label (the rusher's face on `:contest`, the
        // quarterback's on `<qb>:contest:<rusher>`); no two rolls of the play share one (ADR-004, as
        // rollAccounting.test.ts holds it on the stream), and nothing but its CHECK carries one.
        const own = contests(p).flatMap((c) => [c.payload.roll.rngLabel, ...(c.payload.opposedRoll === undefined ? [] : [c.payload.opposedRoll.rngLabel])]);
        n += own.length;
        expect(new Set(own).size).toBe(own.length);
        const others = new Set(labelsOf({ events: withoutStep4(p.events), records: [] }));
        for (const l of own) expect(others.has(l)).toBe(false);
        const all = labelsOf(p);
        for (const l of own) expect(all.filter((x) => x === l)).toHaveLength(1);
        expect(new Set(all).size, `${name} ${p.fixture} ${p.seed}`).toBe(all.length);
      }
    }
    expect(n).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 4 — throw first, and the motion", () => {
  it("a throw on a tick with a threat ARRIVED is one QB_HIT ARRIVAL for an arrived man, before the THROW", () => {
    let arrivals = 0;
    for (const [name] of SETS) {
      for (const p of corpusOf(name)) {
        const as = hits(p).filter((h) => h.payload.phase === "ARRIVAL");
        expect(as.length).toBeLessThanOrEqual(1);
        for (const h of as) {
          arrivals += 1;
          const t = latestThreat(p.events, h.payload.rusher, h.at.seq);
          expect(t!["etaTick"] as number).toBeLessThanOrEqual(h.at.tick as number);
          const throwEvent = p.events.find((e) => typeOf(e) === "THROW");
          expect(throwEvent).toBeDefined();
          expect(throwEvent!.seq).toBeGreaterThanOrEqual(h.at.seq);
          expect(tickOfEnv(throwEvent!)).toBe(h.at.tick);
          expect(h.payload.rollRef).toBeUndefined();
        }
      }
    }
    expect(arrivals).toBeGreaterThan(0);
  });

  it("releaseSeconds: one per aimed THROW under the motion, the decision tick plus rho(release) in whole ms; none after an escape", () => {
    let n = 0;
    let afterEscape = 0;
    for (const name of ["S4", "S4S", "S4L", "S4M"]) {
      for (const p of corpusOf(name)) {
        // AM-7 item 6 (plan §3.2 item 10): no motion after an escape. A throw on the run (a
        // QB_PURSUIT before it) leaves at its tick, with no releaseSeconds and no THROWING race.
        const pursuit = p.events.find((e) => typeOf(e) === "QB_PURSUIT");
        const allThrows = p.events.filter((e) => typeOf(e) === "THROW");
        const throws = allThrows.filter((e) => pursuit === undefined || e.seq < pursuit.seq);
        afterEscape += allThrows.length - throws.length;
        if (pursuit !== undefined) expect(hits(p).filter((h) => h.at.seq > pursuit.seq && h.payload.phase === "THROWING")).toHaveLength(0);
        const rs = releases(p);
        expect(rs.length).toBe(throws.length);
        const qb = p.state.players[String(p.state.quarterback)]!;
        const r = rho(getAttr(qb.attributes.values, ATTR.release), MOTION_FILED);
        rs.forEach((rec, i) => {
          n += 1;
          expect(rec.at.seq).toBe(throws[i]!.seq);
          expect(rec.at.tick).toBe(tickOfEnv(throws[i]!));
          expect(rec.payload).toBe(toMilliseconds((rec.at.tick as number) + r) / 1000);
        });
        if (p.events.some((e) => typeOf(e) === "THROWAWAY")) expect(rs).toHaveLength(0);
      }
    }
    expect(n).toBeGreaterThan(0);
    expect(afterEscape).toBeGreaterThan(0);
    for (const name of ["S4C", "T"]) {
      for (const p of corpusOf(name)) {
        expect(releases(p)).toHaveLength(0);
        expect(hits(p).some((h) => h.payload.phase === "THROWING")).toBe(false);
      }
    }
  });

  it("THROWING: at most one a throw, a man not ARRIVED whose contact is inside the release; the throw on the IMMEDIATE row", () => {
    let throwing = 0;
    for (const name of ["S4", "S4S", "S4L", "S4M"]) {
      for (const p of corpusOf(name)) {
        const ths = hits(p).filter((h) => h.payload.phase === "THROWING");
        expect(ths.length).toBeLessThanOrEqual(1);
        for (const h of ths) {
          throwing += 1;
          const release = releases(p)[0]!;
          expect(toMilliseconds(h.payload.contactSeconds)).toBeLessThanOrEqual(toMilliseconds(release.payload));
          const t = latestThreat(p.events, h.payload.rusher, h.at.seq);
          expect(t!["etaTick"] as number).toBeGreaterThan(h.at.tick as number);
          const accuracy = p.events.find(
            (e) => e.seq >= h.at.seq && typeOf(e) === "CHECK" && payloadOf(e)["checkKind"] === "accuracy",
          );
          const mods = (payloadOf(accuracy!)["roll"] as { modifiers: { source: string; value: number }[] }).modifiers;
          expect(mods.find((m) => m.source.startsWith("Pocket:"))).toEqual({
            source: "Pocket: IMMEDIATE",
            value: DEFAULT_TUNABLES.pocket.accuracyModifier.IMMEDIATE,
          });
        }
      }
    }
    expect(throwing).toBeGreaterThan(0);
  });

  it("kind T reads the published grid: every hit's contact time is his etaTick as published", () => {
    for (const p of corpusOf("T")) {
      for (const h of hits(p)) {
        const t = latestThreat(p.events, h.payload.rusher, h.at.seq);
        expect(h.payload.contactSeconds).toBe(t!["etaTick"]);
      }
    }
  });

  it("every hit carries approach, from and seen; rollRef on a SHED or a SACK only", () => {
    for (const [name] of SETS) {
      for (const p of corpusOf(name)) {
        for (const h of hits(p)) {
          expect(h.payload.qb).toBe(p.state.quarterback);
          expect(h.payload.approach).toBeDefined();
          expect(["FRONT", "SIDE", "BEHIND"]).toContain(h.payload.from);
          expect(h.payload.seen).toBe(true);
          expect(h.payload.rollRef !== undefined).toBe(h.payload.phase === "SHED" || h.payload.phase === "SACK");
        }
      }
    }
  });
});

describe("ADR-089 step 4 — BEHIND after a STEP_UP, the contest's order, the second arrival off", () => {
  it("an ARC man live at a STEP_UP comes from BEHIND from it on; with no STEP_UP before, from the SIDE", () => {
    let behind = 0;
    let side = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildLopsidedRushScenario();
      const p = playStep4(state, calls, `arc-${i}`, T_TUNABLES);
      for (const h of hits(p)) {
        if (h.payload.approach !== "ARC") continue;
        const stepUps = p.events.filter(
          (e) => e.seq < h.at.seq && typeOf(e) === "QB_DECISION" && payloadOf(e)["choice"] === "STEP_UP",
        );
        if (h.payload.from === "BEHIND") {
          behind += 1;
          expect(stepUps.length).toBeGreaterThan(0);
          // He was live (not ARRIVED) at one of them: his threat before it was due after its tick.
          const live = stepUps.some((s) => {
            const t = latestThreat(p.events, h.payload.rusher, s.seq);
            return t !== undefined && (t["etaTick"] as number) > (tickOfEnv(s) as number);
          });
          expect(live).toBe(true);
        } else {
          side += 1;
          expect(h.payload.from).toBe("SIDE");
        }
      }
    }
    expect(behind).toBeGreaterThan(0);
    expect(side).toBeGreaterThan(0);
  });

  it("CONTEST_AFTER_THROW (the design): no THROW on a contest's tick; CONTEST_BEFORE_THROW: no decision before it", () => {
    for (const name of ["S4", "S4S", "S4L", "S4C", "T"]) {
      for (const p of corpusOf(name)) {
        for (const c of contests(p)) {
          expect(p.events.some((e) => typeOf(e) === "THROW" && tickOfEnv(e) === c.at.tick)).toBe(false);
        }
      }
    }
    const before = withStep4(S4C_TUNABLES, { contact: { ...CONTACT_FILED, order: "CONTEST_BEFORE_THROW" } });
    let throwsAfterShed = 0;
    let n = 0;
    for (const p of corpus(before, 30, false, "before")) {
      for (const c of contests(p)) {
        n += 1;
        const decided = p.events.some(
          (e) => e.seq < c.at.seq && tickOfEnv(e) === c.at.tick && typeOf(e) === "QB_DECISION",
        );
        expect(decided).toBe(false);
        if (p.events.some((e) => e.seq >= c.at.seq && typeOf(e) === "THROW" && tickOfEnv(e) === c.at.tick)) throwsAfterShed += 1;
      }
    }
    expect(n).toBeGreaterThan(0);
    expect(throwsAfterShed).toBeGreaterThan(0);
  });

  it("the second arrival off (RATED): every contact is a rated :contest", () => {
    const rated = withStep4(S4C_TUNABLES, { contact: { ...CONTACT_FILED, secondArrival: "RATED" } });
    let n = 0;
    for (const p of corpus(rated, 30, false, "rated")) {
      for (const c of contests(p)) {
        n += 1;
        expect(c.payload.roll.rngLabel.endsWith(":contest")).toBe(true);
      }
    }
    expect(n).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 4 — determinism and R-4's pairing", () => {
  it("the same seed gives the same stream and the same records", () => {
    for (const [, t, pictured] of SETS) {
      for (const [, build] of PASS_FIXTURES.slice(0, 6)) {
        for (let i = 0; i < 5; i++) {
          const { state, calls: raw } = build();
          const calls = pictured ? withPicture(state, raw) : raw;
          expect(playStep4(state, calls, `det-${i}`, t)).toEqual(playStep4(state, calls, `det-${i}`, t));
        }
      }
    }
  });

  /**
   * A stream with what a step-4 bundle adds by construction taken off: the stamp, the approach label,
   * the step-4 records themselves (`arrival_contest` CHECKs, `QB_HIT`s, `THROW.releaseSeconds`), with
   * the events that stay numbered as they were before the lift put the records on the stream.
   */
  const normalized = (events: readonly MatchEventEnvelope[]): MatchEventEnvelope[] => {
    const kept = withoutStep4(events);
    const first = events[0]?.seq ?? 0;
    return kept.map((e, i) => {
      const p = { ...payloadOf(e) };
      if (typeOf(e) === "PLAY_START") delete p["rules"];
      if (typeOf(e) === "RUSH_THREAT") delete p["approach"];
      if (typeOf(e) === "THROW") delete p["releaseSeconds"];
      return { ...e, seq: first + i, event: { ...e.event, payload: p } } as unknown as MatchEventEnvelope;
    });
  };

  const pair = (base: Tunables, arm: Tunables, pictured: boolean, changes: (r: Step4Record) => boolean): { changed: number; same: number } => {
    let changed = 0;
    let same = 0;
    for (const [, build] of PASS_FIXTURES) {
      for (let i = 0; i < 30; i++) {
        const { state, calls: raw } = build();
        const calls = pictured ? withPicture(state, raw) : raw;
        const seed = `pair-${i}`;
        const a = normalized(simulatePassPlay(state, calls, seed, base).events);
        const b = playStep4(state, calls, seed, arm);
        const first = b.records.find(changes);
        if (first === undefined) {
          same += 1;
          expect(normalized(b.events)).toEqual(a);
        } else {
          changed += 1;
          const prefix = normalized(b.events.filter((e) => e.seq < first.at.seq));
          expect(prefix).toEqual(a.slice(0, prefix.length));
          // The new dice are the contests' alone: every label the arm drew before it, the base drew too.
          const baseLabels = new Set(labelsOf({ events: a, records: [] }));
          for (const l of labelsOf({ events: prefix, records: [] })) expect(baseLabels.has(l)).toBe(true);
        }
      }
    }
    return { changed, same };
  };

  it("kind T against today's line: identical up to the first arrival_contest, and a play with none is today's", () => {
    const r = pair(DEFAULT_TUNABLES, T_TUNABLES, false, (rec) => rec.kind === "CONTEST");
    expect(r.changed).toBeGreaterThan(0);
    expect(r.same).toBeGreaterThan(0);
  });

  it("the design against s3: identical up to the first contest or THROWING hit; a play with neither is s3's", () => {
    const r = pair(S3_TUNABLES, S4_TUNABLES, true, (rec) => rec.kind === "CONTEST" || (rec.kind === "QB_HIT" && rec.payload.phase === "THROWING"));
    expect(r.changed).toBeGreaterThan(0);
    expect(r.same).toBeGreaterThan(0);
  });
});
