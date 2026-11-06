/**
 * ADR-089 STEP 3 (plan §9 commit 12): the event vocabulary on `pocket-1.s3` streams, read from
 * calibration's side.
 *
 * The engine's own `eventVocabulary` test is stream E's path; this file is the s3 case the
 * calibration readers need, on the golden games through the real caller: a step-3 arm's stream
 * says nothing the design bundle's (`pocket-1.s2`, B3) does not already say, in the same keys,
 * except the stamp. The late block is a `pass_rush_beat` and dieless `pass_rush_tick`s in exactly
 * the shapes an ordinary beat and tick have. The RUSH_THREAT payload gains only petition P5's pair
 * (`distanceYards`, `closingSpeed`, after `approach`), both or neither, on an arm with the free-run
 * block (E6b): on C1 and C12 every threat carries it, and on C3 (no late block) a touched man keeps
 * today's set time and carries neither. Every s3 pass play's PLAY_START names `pocket-1.s3` at the
 * arm's own overlay digest, with the snap picture after the rules.
 *
 * It plays three golden games a league per arm (about ten seconds in all).
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { armById, type ArmId } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { overlayDigestOf, POCKET_1_S2_RULES, POCKET_1_S3_RULES, rulesOnPlayStart } from "../src/pocket/rules.js";
import { DIELESS_TICK_KEYS, isS3Play, lateBeatLabelOf, s1PlaysOf } from "../src/pocket/s1Stream.js";

const FIRST = 3;

/** The RUSH_THREAT payload's keys, in order, under every shipped bundle without P5's pair. */
const THREAT_KEYS = ["rusher", "alignment", "origin", "rollRef", "etaTick", "state", "approach"];
/** The same with P5's pair, as an arm with the free-run block publishes it (E6b). */
const THREAT_KEYS_WITH_PAIR = [...THREAT_KEYS, "distanceYards", "closingSpeed"];
const THREAT_ORIGINS = new Set(["WON_REP", "UNBLOCKED", "PICKUP_LOST", "STUNT_LOOPER"]);
const APPROACHES = new Set(["FREE", "ARC", "THROUGH", "PUSH"]);
const THREAT_STATES = new Set(["TRAVELLING", "ARRIVED", "DELAYED", "RESET"]);
/** A pass play's PLAY_START keys under a `pocket-1` bundle with the v7 caller's snap picture. */
const PASS_PLAY_START_KEYS = ["kind", "offense", "defense", "situation", "rules", "snap"];

interface Vocabulary {
  readonly types: Set<string>;
  readonly checkKinds: Set<string>;
  /** Event type (a CHECK by its kind) → the key lists its payloads were seen with. */
  readonly keyLists: Map<string, Set<string>>;
  readonly threatStates: Set<string>;
  readonly threatOrigins: Set<string>;
  readonly approaches: Set<string>;
  /** Threats with no approach, or one outside the card. */
  offCard: number;
  passPlays: number;
  /** Pass plays whose PLAY_START names no rules, other rules, or another digest. */
  readonly misStamped: string[];
  /** Pass plays whose PLAY_START keys are not `PASS_PLAY_START_KEYS`. */
  readonly misKeyed: string[];
  s3Plays: number;
  lateBlocks: number;
  readonly lateBeatKeyLists: Set<string>;
  readonly lateBeatRollKeyLists: Set<string>;
  readonly lateTickKeyLists: Set<string>;
  lateTicks: number;
  readonly ordinaryBeatKeyLists: Set<string>;
  readonly ordinaryBeatRollKeyLists: Set<string>;
  readonly lateBeatLabels: { readonly label: string; readonly expected: string | undefined }[];
}

function emptyVocabulary(): Vocabulary {
  return {
    types: new Set(),
    checkKinds: new Set(),
    keyLists: new Map(),
    threatStates: new Set(),
    threatOrigins: new Set(),
    approaches: new Set(),
    offCard: 0,
    passPlays: 0,
    misStamped: [],
    misKeyed: [],
    s3Plays: 0,
    lateBlocks: 0,
    lateBeatKeyLists: new Set(),
    lateBeatRollKeyLists: new Set(),
    lateTickKeyLists: new Set(),
    lateTicks: 0,
    ordinaryBeatKeyLists: new Set(),
    ordinaryBeatRollKeyLists: new Set(),
    lateBeatLabels: [],
  };
}

const keysOf = (o: unknown): string => Object.keys(o as object).join(",");

function foldVocabulary(v: Vocabulary, events: readonly MatchEventEnvelope[], rulesName: string, digest: string): void {
  for (const { event } of events) {
    v.types.add(event.type);
    const payload = (event as { readonly payload?: unknown }).payload;
    if (typeof payload !== "object" || payload === null) continue;
    const p = payload as Record<string, unknown>;
    const at = event.type === "CHECK" ? `CHECK:${String(p["checkKind"])}` : event.type;
    if (event.type === "CHECK") v.checkKinds.add(String(p["checkKind"]));
    let lists = v.keyLists.get(at);
    if (lists === undefined) v.keyLists.set(at, (lists = new Set()));
    lists.add(keysOf(p));
    if (event.type === "RUSH_THREAT") {
      v.threatStates.add(String(p["state"]));
      v.threatOrigins.add(String(p["origin"]));
      if (typeof p["approach"] === "string" && APPROACHES.has(p["approach"])) v.approaches.add(p["approach"]);
      else v.offCard += 1;
    }
  }
  for (const play of s1PlaysOf(events)) {
    v.passPlays += 1;
    const start = play.events.find(({ event }) => event.type === "PLAY_START");
    const stamp = rulesOnPlayStart((start?.event as { readonly payload?: unknown } | undefined)?.payload);
    if (stamp?.name !== rulesName || stamp.overlayDigest !== digest) v.misStamped.push(`${play.playId}: ${JSON.stringify(stamp)}`);
    const startKeys = keysOf((start?.event as { readonly payload?: unknown }).payload);
    if (startKeys !== PASS_PLAY_START_KEYS.join(",")) v.misKeyed.push(`${play.playId}: ${startKeys}`);
    if (isS3Play(play)) v.s3Plays += 1;
    const late = new Set(play.lateBlocks.flatMap((b) => (b.beat === undefined ? [] : [b.beat.index])));
    for (const k of play.checks) {
      if (k.c.checkKind !== "pass_rush_beat" || late.has(k.index)) continue;
      v.ordinaryBeatKeyLists.add(k.keys.join(","));
      if (k.c.roll !== undefined) v.ordinaryBeatRollKeyLists.add(keysOf(k.c.roll));
    }
    for (const b of play.lateBlocks) {
      v.lateBlocks += 1;
      if (b.beat !== undefined) {
        v.lateBeatKeyLists.add(b.beat.keys.join(","));
        if (b.beat.c.roll !== undefined) {
          v.lateBeatRollKeyLists.add(keysOf(b.beat.c.roll));
          v.lateBeatLabels.push({ label: b.beat.c.roll.rngLabel, expected: b.touching.c.roll === undefined ? undefined : lateBeatLabelOf(b.touching.c.roll.rngLabel) });
        }
      }
      for (const t of b.ticks) {
        v.lateTicks += 1;
        v.lateTickKeyLists.add(t.keys.join(","));
      }
    }
  }
}

function vocabularyOf(id: ArmId): Vocabulary {
  const arm = armById(id);
  const v = emptyVocabulary();
  const rulesName = arm.rules;
  const digest = arm.overlayDigest ?? "";
  if (digest !== overlayDigestOf(arm.tunables)) throw new Error(`${id}: the stamp's digest is not the arm's overlay digest`);
  for (const league of GOLDEN_LEAGUES) {
    goldenGames(league, (o) => foldVocabulary(v, o.events, rulesName, digest), { tunables: arm.tunables, callerVersion: "v7", first: FIRST });
  }
  return v;
}

const subset = (a: ReadonlySet<string>, b: ReadonlySet<string>): string[] => [...a].filter((x) => !b.has(x)).sort();

describe("ADR-089 step 3: the s3 stream's vocabulary is the design bundle's (B3, pocket-1.s2), on the same golden games", () => {
  const b3 = vocabularyOf("B3");

  it("B3's own stream is s2: stamped pocket-1.s2 at its digest, the threat keys, no late block", () => {
    expect(armById("B3").rules).toBe(POCKET_1_S2_RULES);
    expect(b3.passPlays).toBeGreaterThan(0);
    expect(b3.misStamped).toEqual([]);
    expect(b3.misKeyed).toEqual([]);
    expect(b3.s3Plays).toBe(0);
    expect(b3.lateBlocks).toBe(0);
    expect([...(b3.keyLists.get("RUSH_THREAT") ?? [])]).toEqual([THREAT_KEYS.join(",")]);
  });

  it.each(["C1", "C12"] as const)("%s: no event type, CHECK kind, threat state or payload key list that B3 lacks; the stamp is pocket-1.s3 at the arm's digest", (id) => {
    const arm = armById(id);
    expect(arm.rules).toBe(POCKET_1_S3_RULES);
    const v = vocabularyOf(id);
    console.log(
      `${id}: ${String(v.passPlays)} pass plays, ${String(v.lateBlocks)} late blocks (${String(v.lateTicks)} late ticks); ` +
        `approaches ${[...v.approaches].sort().join(",")}; origins ${[...v.threatOrigins].sort().join(",")}`,
    );
    expect(subset(v.types, b3.types)).toEqual([]);
    expect(subset(v.checkKinds, b3.checkKinds)).toEqual([]);
    expect(subset(v.threatStates, THREAT_STATES)).toEqual([]);
    for (const [at, lists] of v.keyLists) {
      // RUSH_THREAT is read below: P5's pair is the one key list B3 lacks.
      if (at === "RUSH_THREAT") continue;
      const theirs = b3.keyLists.get(at) ?? new Set<string>();
      expect({ at, extra: subset(lists, theirs) }).toEqual({ at, extra: [] });
    }
    // P5 (E6b): a threat carries the distance and closing speed after approach. On these arms every
    // threat carries the pair: a man nobody touched is timed by the clock, a touched man is a late
    // block, and a won rep or a beaten late block carries the nominal pair. Every threat on the card.
    expect([...(v.keyLists.get("RUSH_THREAT") ?? [])]).toEqual([THREAT_KEYS_WITH_PAIR.join(",")]);
    expect(subset(v.threatOrigins, THREAT_ORIGINS)).toEqual([]);
    expect(v.offCard).toBe(0);
    expect(v.approaches.size).toBeGreaterThan(0);
    // The stamp: every pass play names pocket-1.s3 at the arm's own overlay digest, the snap after it.
    expect(v.passPlays).toBeGreaterThan(0);
    expect(v.s3Plays).toBe(v.passPlays);
    expect(v.misStamped).toEqual([]);
    expect(v.misKeyed).toEqual([]);
  }, 600_000);

  it("C3 (the free-run block without the late block): a threat has the pair or neither, and both kinds are published", () => {
    const v = vocabularyOf("C3");
    expect(v.lateBlocks).toBe(0);
    expect([...(v.keyLists.get("RUSH_THREAT") ?? [])].sort()).toEqual([THREAT_KEYS.join(","), THREAT_KEYS_WITH_PAIR.join(",")].sort());
  }, 600_000);

  it.each(["C1", "C12"] as const)("%s: a late beat has an ordinary beat's keys and roll keys, its label is the touching CHECK's fork, and a late tick has the dieless keys", (id) => {
    const v = vocabularyOf(id);
    expect(v.lateBlocks).toBeGreaterThan(0);
    expect(v.lateTicks).toBeGreaterThan(0);
    expect(v.ordinaryBeatKeyLists.size).toBe(1);
    expect([...v.lateBeatKeyLists]).toEqual([...v.ordinaryBeatKeyLists]);
    expect([...v.lateBeatRollKeyLists]).toEqual([...v.ordinaryBeatRollKeyLists]);
    expect([...v.lateTickKeyLists]).toEqual([DIELESS_TICK_KEYS.join(",")]);
    for (const { label, expected } of v.lateBeatLabels) expect(label).toBe(expected);
  }, 600_000);
});
