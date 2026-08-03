/**
 * WHO GOT THE SACK — the invariant, not the instance.
 *
 * ================== WHAT WENT WRONG ==================
 * `reduceStatlines` credits `defense.sacks` to the last rusher the stream
 * published as `ARRIVED`. Over the 496-game baseline the offence was charged
 * 5,921 sacks and the defensive ledger named a man on 2,891 of them — 48.83%.
 * Calibration decomposed the remainder and 89.74% of it was ONE site: §8.8's
 * failed escape ended the play in a sack while publishing no `RUSH_THREAT`
 * transition at all. The men were in the stream the whole time — `resolveScramble`
 * names every threat among the escape check's actors — but nothing said which of
 * them got there, so there was nothing to credit.
 *
 * ================== WHY THESE TESTS ARE SHAPED LIKE THIS ==================
 * A test that asserted "a failed escape publishes an ARRIVED" would assert the
 * instance: it goes green on the day of the fix and says nothing about the next
 * sack site somebody adds. The shape that would have CAUGHT this is a property of
 * every sack in a game:
 *
 *   IF a rusher had got to the quarterback when the play ended in a sack —
 *   whether he ran the passer down on his own clock (§7.2) or the passer bailed
 *   into him (§8.8) — THEN the stream names him.
 *
 * and its other half, which matters just as much:
 *
 *   IF nobody was coming, nobody is credited. A coverage sack has no sacker, in
 *   this engine and in the NFL, and "close the attribution gap" must never be
 *   satisfied by inventing one.
 *
 * Both are asserted below over whole games, folded from the event stream alone
 * and then reconciled against the statlines the game actually produced — so a
 * fold that drifts from the reducer it is describing is itself a failure.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayId } from "@ff/contracts";
import { simulateGame } from "../src/game/simulateGame.js";
import { simulatePassPlay } from "../src/index.js";
import { arrivedAt, nearestThreat } from "../src/resolve/rushThreat.js";
import type { RushThreat } from "../src/resolve/rushThreat.js";
import { TUNABLES } from "../src/tunables.js";
import { buildScramblerScenario } from "./fixtures.js";
import { buildGameFixture } from "./gameFixtures.js";

const GAMES = 12;

/** ADR-011 — the escape band that ends in a sack, read from the table, not typed twice. */
const CAUGHT_BANDS: readonly string[] = TUNABLES.scramble.bands
  .filter((b) => b.sacked)
  .map((b) => b.label);

// ---------------------------------------------------------------------------
// The fold. `PLAY_START.payload` is `unknown` in contracts, so it is read
// structurally, exactly as `pressureMetrics.test.ts` and the §17 renderer do.
// ---------------------------------------------------------------------------

function isPassStart(payload: unknown): boolean {
  return (payload as { kind?: unknown } | null)?.kind === "PASS_PLAY_V1";
}

interface ThreatRecord {
  /** TRAVELLING / DELAYED / RESET / ARRIVED — the last state published for him. */
  state: string;
  etaTick: number;
  everArrived: boolean;
}

interface SackRecord {
  readonly play: string;
  /** The man `reduceStatlines` credits: the LAST rusher published as ARRIVED. */
  readonly credited: string | undefined;
  /** Threats whose last published state is not RESET — still on their way. */
  readonly live: readonly ThreatRecord[];
  /** Every threat the play published, live or reset. */
  readonly all: readonly ThreatRecord[];
  readonly published: number;
  /** The play's last tick, i.e. the tick the sack was recorded on. */
  readonly endTick: number;
  /** A §8.8 escape check came back in a `sacked` band: he bailed and was caught. */
  readonly caughtEscaping: boolean;
  /**
   * ...and at least one of the rushers THAT CHECK NAMED was still on his way at
   * the moment it was rolled. `CHECK.actors` is where the escape roll states the
   * men it was rolled against, so this is the whole antecedent read off the
   * stream — no engine internals, no ARRIVED.
   */
  readonly caughtByANamedRusher: boolean;
}

interface PlayScratch {
  tick: number;
  hadThrow: boolean;
  hadCarrier: boolean;
  caughtEscaping: boolean;
  caughtByANamedRusher: boolean;
  threats: Map<string, ThreatRecord>;
  lastArrived: string | undefined;
  yards: number | undefined;
}

/**
 * Every sack in the stream, with everything needed to say whether anybody got to
 * the quarterback. The sack predicate is `reduceStatlines`' own, verbatim: a
 * dropback with no THROW, no carry, and a loss.
 */
function foldSacks(events: readonly MatchEventEnvelope[]): SackRecord[] {
  const out: SackRecord[] = [];
  let play: PlayScratch | undefined;
  let playKey = "";

  const flush = (): void => {
    if (play === undefined) return;
    const p = play;
    play = undefined;
    if (p.hadThrow || p.hadCarrier || (p.yards ?? 0) >= 0) return;
    out.push({
      play: playKey,
      credited: p.lastArrived,
      live: [...p.threats.values()].filter((t) => t.state !== "RESET"),
      all: [...p.threats.values()],
      published: p.threats.size,
      endTick: p.tick,
      caughtEscaping: p.caughtEscaping,
      caughtByANamedRusher: p.caughtByANamedRusher,
    });
  };

  for (const { event } of events) {
    switch (event.type) {
      case "PLAY_START":
        flush();
        if (!isPassStart(event.payload)) break;
        playKey = String((event as { playId?: PlayId }).playId ?? "");
        play = {
          tick: 0,
          hadThrow: false,
          hadCarrier: false,
          caughtEscaping: false,
          caughtByANamedRusher: false,
          threats: new Map<string, ThreatRecord>(),
          lastArrived: undefined,
          yards: undefined,
        };
        break;
      case "TICK":
        if (play !== undefined) play.tick = event.payload.tick;
        break;
      case "RUSH_THREAT": {
        if (play === undefined) break;
        const key = String(event.payload.rusher);
        const record: ThreatRecord = play.threats.get(key) ?? {
          state: event.payload.state,
          etaTick: event.payload.etaTick,
          everArrived: false,
        };
        record.state = event.payload.state;
        record.etaTick = event.payload.etaTick;
        if (event.payload.state === "ARRIVED") {
          record.everArrived = true;
          play.lastArrived = key;
        }
        play.threats.set(key, record);
        break;
      }
      case "CHECK":
        if (play === undefined) break;
        if (
          event.payload.checkKind === "scramble" &&
          event.payload.band !== undefined &&
          CAUGHT_BANDS.includes(event.payload.band)
        ) {
          play.caughtEscaping = true;
          // Snapshotted HERE, at the instant of the roll, not at the end of the
          // play: §7.2's line battle runs before §7.2's movement branch, so by
          // the time the escape is rolled a threat the check names may already
          // have been RESET and a threat it does not name may already have been
          // published. The men the roll was rolled against are the ones on it.
          const live = play.threats;
          play.caughtByANamedRusher = event.payload.actors.some(
            (a) => (live.get(String(a))?.state ?? "RESET") !== "RESET",
          );
        }
        break;
      case "THROW":
        if (play !== undefined) play.hadThrow = true;
        break;
      case "RUN_RESOLUTION":
        if (play !== undefined) play.hadCarrier = true;
        break;
      case "PLAY_RESULT":
        if (play !== undefined) play.yards = event.payload.yards;
        break;
      default:
        break;
    }
  }
  flush();
  return out;
}

/**
 * DID ANYBODY GET TO HIM — the antecedent of the invariant, derived from the
 * stream and from nothing else.
 *
 * Three ways, and the whole defect was that the second one was not stated:
 *
 *   1. he ran the passer down on his own clock — still coming, and the play
 *      reached his ETA (§7.2);
 *   2. the passer bailed into him — an escape check came back in a `sacked` band
 *      (§8.8) naming a rusher who was still on his way when it was rolled. His
 *      ETA is still in the FUTURE at that instant, which is exactly why the old
 *      code published nothing: by the arrival model alone he had not arrived, and
 *      by the football he had;
 *   3. he got there earlier in the play and his blocker recovered him afterwards.
 *      §7.2's inputs are all one tick old, so a rusher can be published ARRIVED
 *      at the top of a tick and RESET by the line battle inside the same one; the
 *      sack that arrival caused is still his.
 *
 * Deliberately NOT a way, and each is a real class the measurement found:
 *
 *   - the tick loop hitting its horizon with somebody still travelling. Nobody
 *     reached the quarterback; the engine stopped simulating;
 *   - an escape whose named rushers were ALL reset by their blockers in the same
 *     tick's line battle, leaving only a man who beat his block after the roll
 *     was made and is a full travel time (≥1.0s) away. Nobody the deciding roll
 *     considered was still coming, and the man who was cannot have made the
 *     tackle. THE RULE STILL GOVERNS — this reasoning is why `caught` below can
 *     still be `undefined` and why nobody is credited when it is. ⛔ RETIRED AS
 *     A CLASS, owner ruling August 2026 (ADR-059 landing): it fired 5.9% of
 *     sacks in the 496-game batch and 6/101 on this file's own 12-game corpus,
 *     pre-ADR-059; post-ADR-059 it has not fired once (0/121 here, 0/1,009 on a
 *     96-game diagnostic). The cause was the independent-tick model itself —
 *     "every named rusher reset by his blocker inside a single half-second" was
 *     survivable only because a matchup's rep was redrawn from scratch every
 *     tick. ADR-059's one-rep-per-matchup-per-play, gently jittered, is
 *     precisely the wild swing that made this coincidence possible, removed.
 *     See the retirement note beside `describe("a coverage sack still has no
 *     sacker")` below for the full measurement and the football argument that
 *     the rule is unchanged even though its subject is currently empty.
 */
function somebodyGotThere(sack: SackRecord): boolean {
  if (sack.all.some((t) => t.everArrived)) return true;
  if (sack.caughtByANamedRusher) return true;
  return sack.live.some((t) => t.etaTick <= sack.endTick);
}

const GAME_STREAMS = Array.from({ length: GAMES }, (_, i) => {
  const fixture = buildGameFixture({ seed: `sack-credit-${i}` });
  return simulateGame(fixture.state, fixture.inputs, fixture.seed);
});
const SACKS = GAME_STREAMS.flatMap((g) => foldSacks(g.events as readonly MatchEventEnvelope[]));

const describeSack = (s: SackRecord): string =>
  `${s.play} @${s.endTick} live=${s.live.length} published=${s.published} escape=${s.caughtEscaping}`;

describe("every sack that had a sacker names him", () => {
  it("a rusher who got to the quarterback is credited — however he got there", () => {
    const reached = SACKS.filter(somebodyGotThere);
    const anonymous = reached.filter((s) => s.credited === undefined);
    expect(anonymous.map(describeSack)).toEqual([]);
    expect(reached.length).toBeGreaterThan(0);
  });

  /**
   * THE DEFECT'S OWN SHAPE, stated without reference to the mechanism that fixed
   * it. Nothing here reads `ARRIVED`: the antecedent is a §8.8 escape check that
   * came back in a `sacked` band with at least one rusher still on his way, which
   * is readable off the CHECK and the threat lifecycle alone. Over the 496-game
   * baseline this class is 2,444 sacks, and before this dispatch every one of
   * them was credited to nobody.
   */
  it("caught bailing out with a man still coming — that man is named", () => {
    const bailed = SACKS.filter((s) => s.caughtByANamedRusher);
    expect(bailed.filter((s) => s.credited === undefined).map(describeSack)).toEqual([]);
    expect(bailed.length).toBeGreaterThan(0);
  });

  /** The §7.2 half of the same property: run down on his own clock. */
  it("still coming when his ETA came up — that man is named", () => {
    const ranDown = SACKS.filter((s) => s.live.some((t) => t.etaTick <= s.endTick));
    expect(ranDown.filter((s) => s.credited === undefined).map(describeSack)).toEqual([]);
    expect(ranDown.length).toBeGreaterThan(0);
  });

  it("the credited man is one of the rushers the play published as coming", () => {
    for (const sack of SACKS) {
      if (sack.credited === undefined) continue;
      expect(sack.published).toBeGreaterThan(0);
    }
  });
});

describe("a coverage sack still has no sacker", () => {
  /**
   * THE HALF THAT MUST NOT BE "FIXED". Closing an attribution gap by crediting
   * somebody on every sack would look like success in exactly one number and be
   * a lie in the ledger — the NFL has this category too, and a pass rush that is
   * credited when nobody rushed is a rating derived from fiction.
   */
  /**
   * ⛔ THE ENGINE SHOULD NOT PRODUCE UNCREDITED SACKS — owner ruling, August
   * 2026. Real NFL credits a sacker on every sack; "coverage sack" describes
   * WHY pressure arrived, never a play where nobody made the tackle. The
   * crediting RULE that produces an uncredited sack is football-sound (a §8.8
   * escape whose named rushers were ALL reset in the same tick genuinely has
   * nobody the deciding roll considered still coming, and cannot invent a
   * sacker). What is retired here is not the rule — it is SPLIT below into two
   * pieces, per the ruling: the class the rule used to catch is gone, and that
   * is ADR-059 working, not the logic breaking.
   *
   * ============ THE OLD EXPECTATION, VERBATIM (kept for the record) ============
   *
   *   it("nobody was coming, so nobody is credited", () => {
   *     const nobodyComing = SACKS.filter((s) => !somebodyGotThere(s));
   *     expect(nobodyComing.length).toBeGreaterThan(0);
   *     for (const sack of nobodyComing) {
   *       expect(sack.credited).toBeUndefined();
   *     }
   *   });
   *
   * ============ ITS MEASUREMENT, BOTH ARMS ============
   *
   * `5.9%` of sacks in the 496-game batch (this file's own module comment,
   * unchanged above) is the ALL-SACKS arm. On THIS file's 12-game corpus,
   * pre-ADR-059, that was `6/101 = 5.9%` of every sack — the same rate,
   * because the corpus and the batch are measuring the same thing at two
   * sizes. Read a second way, AGAINST THE ESCAPE-PATH ARM ONLY (the one path
   * that can ever produce this class — the §7.2 arrival path structurally
   * cannot, `hasArrived` is its own precondition): 48 of the 101 pre-ADR-059
   * sacks took the §8.8 escape path, and the same 6 were `6/48 = 12.5%` of
   * THAT population specifically. Post-ADR-059: 0/121 on this corpus, 0/1,009
   * on a 96-game (8,556-play) diagnostic — zero on both arms, not a rounding
   * artifact of a small sample.
   *
   * ============ THE REASON ============
   *
   * This class existed ONLY because ticks were independent. Under the old
   * per-tick iid model, a matchup's band was redrawn from scratch every tick,
   * so "every rusher an escape check named got reset by his blocker in the
   * same half-second" was a real, if uncommon, coincidence — full-magnitude
   * die variance landing on `BLOCKER_RESETS` for every named man at once.
   * ADR-059 replaced that with one correlated rep per matchup per play,
   * jittered gently tick to tick: the exact "wild swing" the ADR exists to
   * eliminate. A matchup that is live stays live; simultaneous full resets
   * across every named rusher stopped happening. Its disappearance is ADR-059
   * WORKING, not the crediting logic failing at the thing it was built to
   * handle.
   */
  it("the class an all-reset escape used to leave uncredited is empty — ADR-059 working, not the rule failing", () => {
    const nobodyComing = SACKS.filter((s) => !somebodyGotThere(s));
    // THE POSITIVE CONTROL (Charter §4.1): asserting empty, for a stated
    // reason, is evidence the artifact is gone, not evidence it never existed.
    // Deleting this test instead of inverting it would discard that evidence.
    expect(nobodyComing.map(describeSack)).toEqual([]);
    // Left in place, vacuously true today: if this class is ever produced
    // again, the football rule above still says nobody named is credited.
    for (const sack of nobodyComing) {
      expect(sack.credited).toBeUndefined();
    }
  });

  it("the two categories still partition every sack, even though one is empty right now", () => {
    // NARROWED FROM "and both are non-empty": that was the same artifact as
    // the test above, stated a second way, and is retired for the same reason
    // and by the same ruling — see the comment beside it. The PARTITION
    // property (every sack is in exactly one bucket) is unaffected by which
    // bucket is empty and still holds unconditionally.
    const reached = SACKS.filter(somebodyGotThere).length;
    const coverage = SACKS.filter((s) => !somebodyGotThere(s)).length;
    expect(reached + coverage).toBe(SACKS.length);
    expect(reached).toBeGreaterThan(0);
    // An escape that failed with every rusher it named already RESET is a
    // coverage sack and is on the correct side of the line: nobody the roll was
    // rolled against was still coming, so the roll cannot name a sacker.
    for (const sack of SACKS) {
      if (!sack.caughtEscaping || sack.caughtByANamedRusher) continue;
      if (sack.all.some((t) => t.everArrived)) continue;
      expect(sack.credited).toBeUndefined();
    }
  });
});

describe("the fold agrees with the box score it is describing", () => {
  it("credited sacks in the stream equal defence sacks in the statlines", () => {
    let charged = 0;
    let credited = 0;
    for (const game of GAME_STREAMS) {
      for (const line of game.statlines) {
        charged += line.passing.sacked;
        credited += line.defense.sacks;
      }
    }
    expect(charged).toBe(SACKS.length);
    expect(credited).toBe(SACKS.filter((s) => s.credited !== undefined).length);
    // The gap this dispatch closed. Not a bound — a floor of zero would be met
    // by the defect itself; this asserts the ledger names a man on most sacks.
    expect(credited).toBeGreaterThan(charged / 2);
  });
});

describe("§8.8 — the arrival a failed escape publishes", () => {
  const streams = Array.from({ length: 400 }, (_, i) => {
    const { state, calls } = buildScramblerScenario();
    return [...simulatePassPlay(state, calls, `escape-sack-${i}`).events];
  });

  it("the ARRIVED follows the escape check it was caused by — cause, then effect", () => {
    let published = 0;
    for (const events of streams) {
      for (let i = 0; i < events.length; i++) {
        const event = events[i]?.event;
        if (event?.type !== "CHECK") continue;
        if (event.payload.checkKind !== "scramble") continue;
        if (event.payload.band === undefined || !CAUGHT_BANDS.includes(event.payload.band)) continue;
        const next = events[i + 1]?.event;
        if (next?.type !== "RUSH_THREAT") continue;
        published += 1;
        expect(next.payload.state).toBe("ARRIVED");
        // He is named among the actors of the roll that caught him, so the
        // stream justifies the attribution without any consumer re-deriving it.
        expect(event.payload.actors.map(String)).toContain(String(next.payload.rusher));
        // The arrival is dated at the sack, never at a projection that never
        // happened: the quarterback closed the last of the distance himself.
        expect(next.payload.etaTick).toBeLessThanOrEqual(next.tick ?? 0);
      }
    }
    expect(published).toBeGreaterThan(0);
  });

  it("it carries no roll and no tier — no die produced the arrival (ADR-005)", () => {
    for (const events of streams) {
      for (const { event } of events) {
        if (event.type !== "RUSH_THREAT") continue;
        expect(Object.keys(event.payload).sort()).toEqual([
          "alignment",
          "etaTick",
          "origin",
          "rollRef",
          "rusher",
          "state",
        ]);
      }
    }
  });

  it("is reproducible: the same seed publishes the same arrivals", () => {
    for (let i = 0; i < 40; i++) {
      const a = buildScramblerScenario();
      const b = buildScramblerScenario();
      const left = simulatePassPlay(a.state, a.calls, `escape-det-${i}`).events;
      const right = simulatePassPlay(b.state, b.calls, `escape-det-${i}`).events;
      expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    }
  });
});

// ---------------------------------------------------------------------------
// The two resolvers the site is built out of.
// ---------------------------------------------------------------------------

function threat(id: string, alignment: "EDGE" | "INTERIOR", etaTick: number): RushThreat {
  return {
    rusher: id as unknown as RushThreat["rusher"],
    alignment,
    origin: "WON_REP",
    wonAtTick: 1.0,
    etaTick,
    rollRef: `test/${id}`,
  };
}

describe("nearestThreat — who the quarterback ran into", () => {
  const priority = TUNABLES.arrival.simultaneousArrivalPriority;

  it("is the man closest to arriving", () => {
    const list = [threat("a", "EDGE", 3.0), threat("b", "INTERIOR", 2.0), threat("c", "EDGE", 2.5)];
    expect(nearestThreat(list, priority)?.rusher).toBe("b");
  });

  it("nobody coming is nobody named", () => {
    expect(nearestThreat([], priority)).toBeUndefined();
  });

  it("a dead heat goes to the contain player, which is the tunable's claim", () => {
    const list = [threat("inside", "INTERIOR", 2.0), threat("outside", "EDGE", 2.0)];
    expect(nearestThreat(list, "EDGE")?.rusher).toBe("outside");
    // The claim is named, so it can be reversed without touching the comparator.
    expect(nearestThreat(list, "INTERIOR")?.rusher).toBe("inside");
    expect(priority).toBe("EDGE");
  });

  it("a dead heat between two of the same kind never depends on card order", () => {
    const forward = [threat("zeb", "EDGE", 2.0), threat("abe", "EDGE", 2.0)];
    const reversed = [...forward].reverse();
    expect(nearestThreat(forward, priority)?.rusher).toBe("abe");
    expect(nearestThreat(reversed, priority)?.rusher).toBe("abe");
  });
});

describe("arrivedAt — the arrival the quarterback caused", () => {
  it("brings a future arrival forward to the tick the meeting happened on", () => {
    const brought = arrivedAt(threat("a", "EDGE", 3.0), 2.5);
    expect(brought.etaTick).toBe(2.5);
    // Everything else about him is untouched: same man, same origin, same roll.
    expect({ ...brought, etaTick: 3.0 }).toEqual(threat("a", "EDGE", 3.0));
  });

  it("leaves a rusher who got there on his own clock alone", () => {
    const own = threat("a", "INTERIOR", 2.0);
    expect(arrivedAt(own, 2.0)).toBe(own);
    expect(arrivedAt(own, 2.5)).toBe(own);
  });

  it("is the mirror of a step-up, and never invents a delay", () => {
    expect(arrivedAt(threat("a", "EDGE", 2.0), 3.0).etaTick).toBe(2.0);
  });
});
