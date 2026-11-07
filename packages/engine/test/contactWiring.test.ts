/**
 * ADR-089 step 4 — CONTACT AND THE MOTION, WIRED (`sim/passPlay.ts`; plan §2.2, §7 R-4 and R-5).
 *
 * P6, P7 and P8 are not in contracts, so these plays run through the engine's test seam
 * (`simulatePassPlayWith`, the petitions granted, a recorder for what the stream will carry). On
 * corpora of the pass fixtures under the design's shape, shape S, shape L, kind T, contact alone and
 * the motion alone, they hold:
 *  - the gates: no recorder, no record (P6, P7 and P8's named errors, from the log itself);
 *  - the contest (§4.5 items 2 to 5): its full labels, `:contest` first and `:contest2` only after
 *    the play's first shed, the bands against the margins, RUSHER_SACKS as the play's sack, QB_SHEDS
 *    as a `QB_HIT` SHED naming the CHECK and a DELAYED publication by approach; every label unique;
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
import { PetitionNotInContractsError, PlayEventLog } from "../src/events.js";
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

/** Every roll label a play's stream and records carry. */
function labelsOf(p: Step4Play): string[] {
  const out: string[] = [];
  for (const e of p.events) {
    if (typeOf(e) !== "CHECK") continue;
    const pl = payloadOf(e) as { roll?: { rngLabel: string }; opposedRoll?: { rngLabel: string } };
    if (pl.roll !== undefined) out.push(pl.roll.rngLabel);
    if (pl.opposedRoll !== undefined) out.push(pl.opposedRoll.rngLabel);
  }
  for (const c of contests(p)) {
    out.push(c.payload.roll.rngLabel);
    if (c.payload.opposedRoll !== undefined) out.push(c.payload.opposedRoll.rngLabel);
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

describe("ADR-089 step 4 — the gates hold before the lift", () => {
  it("pocketRulesOf refuses every step-4 bundle before the first die", () => {
    const { state, calls } = PASS_FIXTURES[0]![1]();
    for (const [, t] of SETS) expect(() => simulatePassPlay(state, calls, "gate", t)).toThrow(PocketRulesError);
  });

  it("the log refuses each record with no recorder, naming its petition, and writes nothing", () => {
    const log = new PlayEventLog("g" as never, "p" as never, { season: 1, week: 1 } as never, 0);
    expect(() => log.arrivalContest({} as never)).toThrow(PetitionNotInContractsError);
    expect(() => log.arrivalContest({} as never)).toThrow(/petition P6 is not in contracts/);
    expect(() => log.qbHit({} as never)).toThrow(/petition P7 is not in contracts/);
    expect(() => log.throwBall("r" as never, "TOUCH" as never, "TIE" as never, "x", 1.25)).toThrow(/petition P8 is not in contracts/);
    expect(log.drain()).toHaveLength(0);
    // Without `releaseSeconds` the THROW is today's.
    log.throwBall("r" as never, "TOUCH" as never, "TIE" as never, "x");
    expect(log.drain()).toHaveLength(1);
  });

  it("granted petitions without a recorder: the first record throws its petition's error", () => {
    const errors = new Set<string>();
    for (const [, build] of PASS_FIXTURES) {
      for (let i = 0; i < 30; i++) {
        const { state, calls } = build();
        for (const t of [T_TUNABLES, S4M_TUNABLES]) {
          try {
            simulatePassPlayWith(state, calls, `norec-${i}`, t, { petitions: GRANTED });
          } catch (e) {
            expect(e).toBeInstanceOf(PetitionNotInContractsError);
            errors.add(String((e as Error).message).replace(/.*petition (P\d).*/, "$1"));
          }
        }
      }
    }
    expect([...errors].sort()).toEqual(["P6", "P7", "P8"]);
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

  it("RUSHER_SACKS ends the play in a sack, with no hit and no throw after it", () => {
    let sacks = 0;
    for (const name of withContact) {
      for (const p of corpusOf(name)) {
        const cs = contests(p);
        const sackAt = cs.findIndex((c) => c.payload.band === "RUSHER_SACKS");
        if (sackAt < 0) continue;
        sacks += 1;
        const c = cs[sackAt]!;
        expect(sackAt).toBe(cs.length - 1);
        expect(p.records[p.records.length - 1]).toBe(c);
        const after = p.events.filter((e) => e.seq >= c.at.seq);
        expect(after.map(typeOf)).toEqual(["PLAY_RESULT"]);
        expect(payloadOf(after[0]!)["yards"]).toBe(-DEFAULT_TUNABLES.result.sackYardsLost);
      }
    }
    expect(sacks).toBeGreaterThan(0);
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
          expect(hit.at).toEqual(r.at);
          const before = latestThreat(p.events, hit.payload.rusher, hit.at.seq);
          const delayed = p.events.find((e) => e.seq === hit.at.seq);
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

  it("every contest label in a play is its own: unique, and drawn by nothing on the stream", () => {
    let n = 0;
    for (const name of withContact) {
      for (const p of corpusOf(name)) {
        // Every RollDetail a contest writes has its own label (the rusher's face on `:contest`, the
        // quarterback's on `<qb>:contest:<rusher>`); no two rolls of the play share one, records and
        // stream together (ADR-004, as rollAccounting.test.ts holds it on the stream).
        const own = contests(p).flatMap((c) => [c.payload.roll.rngLabel, ...(c.payload.opposedRoll === undefined ? [] : [c.payload.opposedRoll.rngLabel])]);
        n += own.length;
        expect(new Set(own).size).toBe(own.length);
        const onStream = new Set(labelsOf({ ...p, records: [] }));
        for (const l of own) expect(onStream.has(l)).toBe(false);
        const all = labelsOf(p);
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

  it("releaseSeconds: one per aimed THROW under the motion, the decision tick plus rho(release) in whole ms", () => {
    let n = 0;
    for (const name of ["S4", "S4S", "S4L", "S4M"]) {
      for (const p of corpusOf(name)) {
        const throws = p.events.filter((e) => typeOf(e) === "THROW");
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

  it("every hit carries approach, from and seen; rollRef on a SHED only", () => {
    for (const [name] of SETS) {
      for (const p of corpusOf(name)) {
        for (const h of hits(p)) {
          expect(h.payload.qb).toBe(p.state.quarterback);
          expect(h.payload.approach).toBeDefined();
          expect(["FRONT", "SIDE", "BEHIND"]).toContain(h.payload.from);
          expect(h.payload.seen).toBe(true);
          expect(h.payload.rollRef !== undefined).toBe(h.payload.phase === "SHED");
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

  /** A stream with the fields a step-4 bundle adds by construction taken off: the stamp, the approach label. */
  const normalized = (events: readonly MatchEventEnvelope[]): unknown[] =>
    events.map((e) => {
      const p = { ...payloadOf(e) };
      if (typeOf(e) === "PLAY_START") delete p["rules"];
      if (typeOf(e) === "RUSH_THREAT") delete p["approach"];
      return { ...e, event: { ...e.event, payload: p } };
    });

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
        const bn = normalized(b.events);
        if (first === undefined) {
          same += 1;
          expect(bn).toEqual(a);
        } else {
          changed += 1;
          const upTo = (xs: unknown[]) => xs.filter((e) => (e as MatchEventEnvelope).seq < first.at.seq);
          expect(upTo(bn)).toEqual(upTo(a));
          // The new dice are the contests' alone: every label the arm drew before it, the base drew too.
          const baseLabels = new Set(labelsOf({ events: a as MatchEventEnvelope[], records: [] }));
          for (const l of labelsOf({ events: upTo(bn) as MatchEventEnvelope[], records: [] })) expect(baseLabels.has(l)).toBe(true);
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
