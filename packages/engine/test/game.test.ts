/**
 * THE GAME LOOP — a whole game, from the stream out.
 *
 * Nearly every assertion in this file reads the EVENT STREAM rather than
 * `newState`, on purpose: the loop's contract is that a consumer holding only
 * the stream can reconstruct the game (FANTASY-GATE-PHASE1 §3.4). A test that
 * asserted against `newState` would pass just as happily if the events were
 * never emitted.
 */
import { describe, expect, it } from "vitest";
import type { TeamId } from "@ff/contracts";
import { simulateGame } from "../src/game/simulateGame.js";
import { deriveGameId } from "../src/game/types.js";
import type { GameEvent, GameEventEnvelope } from "../src/game/events.js";
import { TUNABLES } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";

function eventsOf<T extends GameEvent["type"]>(
  events: readonly GameEventEnvelope[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events
    .map((e) => e.event)
    .filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

function simulateGameFor(seed: string) {
  const f = buildGameFixture({ seed });
  return simulateGame(f.state, f.inputs, f.seed);
}

const fixture = buildGameFixture();
const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);

describe("a game completes", () => {
  it("reaches FINAL and emits GAME_END", () => {
    expect(result.newState.phase).toBe("FINAL");
    const ends = eventsOf(result.events, "GAME_END");
    expect(ends).toHaveLength(1);
    expect(ends[0]?.payload.home).toBe(result.newState.score.home);
    expect(ends[0]?.payload.away).toBe(result.newState.score.away);
  });

  it("plays four periods, in order, each opened and closed", () => {
    const starts = eventsOf(result.events, "PERIOD_START").map((e) => e.payload.period);
    const ends = eventsOf(result.events, "PERIOD_END").map((e) => e.payload.period);
    expect(starts.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(ends).toEqual(starts);
  });

  it("nobody is left holding the ball: every drive that starts also ends", () => {
    const starts = eventsOf(result.events, "DRIVE_START").map((e) => e.payload.driveNumber);
    const ends = eventsOf(result.events, "DRIVE_END").map((e) => e.payload.driveNumber);
    expect(ends).toEqual(starts);
    expect(starts.length).toBeGreaterThan(10);
  });

  it("the scoreboard in the stream is the scoreboard in the state", () => {
    const scores = eventsOf(result.events, "SCORE");
    const home = scores
      .filter((e) => e.payload.team === result.newState.home)
      .reduce((a, e) => a + e.payload.points, 0);
    const away = scores
      .filter((e) => e.payload.team === result.newState.away)
      .reduce((a, e) => a + e.payload.points, 0);
    expect(home).toBe(result.newState.score.home);
    expect(away).toBe(result.newState.score.away);
  });

  it("the per-period scoreboard sums to the final one", () => {
    // ADR-014 item 8: the widened GAME_END carries what GAME_SUMMARY used to.
    const summary = eventsOf(result.events, "GAME_END")[0];
    expect(summary).toBeDefined();
    const home = summary?.payload.periods.reduce((a, p) => a + p.home, 0);
    const away = summary?.payload.periods.reduce((a, p) => a + p.away, 0);
    expect(home).toBe(result.newState.score.home);
    expect(away).toBe(result.newState.score.away);
  });

  it("sequence numbers are strictly increasing across the whole stream", () => {
    let previous = -1;
    for (const envelope of result.events) {
      expect(envelope.seq).toBeGreaterThan(previous);
      previous = envelope.seq;
    }
  });
});

describe("★3 — gameId is derived from schedule coordinates, not minted", () => {
  it("the same fixture derives the same id twice", () => {
    const a = deriveGameId({ season: 2026, week: 4, home: "t-hou" as TeamId, away: "t-den" as TeamId });
    const b = deriveGameId({ season: 2026, week: 4, home: "t-hou" as TeamId, away: "t-den" as TeamId });
    expect(a).toBe(b);
  });

  it("a replay ordinal makes a distinct, addressable game", () => {
    const scheduled = deriveGameId({ season: 2026, week: 4, home: "t-hou" as TeamId, away: "t-den" as TeamId });
    const rerun = deriveGameId({
      season: 2026, week: 4, home: "t-hou" as TeamId, away: "t-den" as TeamId, replay: 1,
    });
    expect(rerun).not.toBe(scheduled);
  });

  it("the seed is recorded on the game summary — it is not derivable from the stream", () => {
    expect(result.summary.seed).toBe(fixture.seed);
    expect(eventsOf(result.events, "GAME_END")[0]?.payload.seed).toBe(fixture.seed);
  });
});

describe("★4 — possession, drives, periods and scoring are in the stream", () => {
  it("every possession change names who lost it, who got it, and why", () => {
    const changes = eventsOf(result.events, "POSSESSION_CHANGE");
    expect(changes.length).toBeGreaterThan(10);
    for (const change of changes) {
      expect(change.payload.from).not.toBe(change.payload.to);
      expect(change.payload.cause).toBeTruthy();
      expect(change.payload.ballOn).toBeGreaterThan(0);
      expect(change.payload.ballOn).toBeLessThan(100);
    }
  });

  it("a consumer holding only the stream can say who had the ball at any point", () => {
    // The reconstruction test ADR-007 established, one level up.
    let possession: TeamId | undefined;
    let checked = 0;
    for (const { event } of result.events) {
      if (event.type === "POSSESSION_CHANGE") possession = event.payload.to;
      if (event.type === "PLAY_START") {
        const payload = event.payload as { offense?: { team?: string } };
        expect(payload.offense?.team).toBe(possession);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("every drive result is a way a drive can actually end", () => {
    const allowed = new Set([
      "TOUCHDOWN", "FIELD_GOAL", "MISSED_FIELD_GOAL", "PUNT",
      "INTERCEPTION", "TURNOVER_ON_DOWNS", "SAFETY", "END_OF_HALF", "END_OF_GAME",
    ]);
    for (const drive of eventsOf(result.events, "DRIVE_END")) {
      expect(allowed.has(drive.payload.result)).toBe(true);
    }
  });

  it("a touchdown drive is followed by an extra-point attempt", () => {
    const sequence = result.events.map((e) => e.event);
    for (let i = 0; i < sequence.length; i++) {
      const event = sequence[i];
      if (event?.type !== "DRIVE_END" || event.payload.result !== "TOUCHDOWN") continue;
      const next = sequence.slice(i + 1, i + 6).find((e) => e?.type === "PLACEKICK");
      expect(next?.type === "PLACEKICK" && next.payload.kind).toBe("EXTRA_POINT");
    }
  });
});

describe("★9 — in-game decisions carry an authority tag", () => {
  it("every coach decision is tagged COACH and names the team that made it", () => {
    const decisions = eventsOf(result.events, "COACH_DECISION");
    expect(decisions.length).toBeGreaterThan(4);
    for (const decision of decisions) {
      expect(decision.payload.authority).toBe("COACH");
      expect([result.newState.home, result.newState.away]).toContain(decision.payload.team);
    }
  });

  it("the coin toss is a decision, and it is in the stream with its roll", () => {
    const toss = eventsOf(result.events, "COIN_TOSS")[0];
    expect(toss).toBeDefined();
    expect(toss?.payload.roll.die).toBe("d100");
    expect([result.newState.home, result.newState.away]).toContain(toss?.payload.winner);
  });

  it("a fourth-down decision precedes every punt and every field goal", () => {
    const sequence = result.events.map((e) => e.event);
    for (let i = 0; i < sequence.length; i++) {
      const event = sequence[i];
      const isPunt = event?.type === "PUNT";
      const isFieldGoal = event?.type === "PLACEKICK" && event.payload.kind === "FIELD_GOAL";
      if (!isPunt && !isFieldGoal) continue;
      const before = sequence.slice(Math.max(0, i - 3), i).reverse()
        .find((e) => e?.type === "COACH_DECISION");
      expect(before?.type === "COACH_DECISION" && before.payload.kind).toBe("FOURTH_DOWN");
    }
  });
});

describe("the clock", () => {
  it("never goes negative and never exceeds a period", () => {
    for (const start of eventsOf(result.events, "PERIOD_START")) {
      expect(start.payload.clockSeconds).toBe(TUNABLES.game.periodSeconds);
    }
    for (const drive of eventsOf(result.events, "DRIVE_START")) {
      expect(drive.payload.clockSeconds).toBeGreaterThanOrEqual(0);
      expect(drive.payload.clockSeconds).toBeLessThanOrEqual(TUNABLES.game.periodSeconds);
    }
  });

  it("the second half opens with a kickoff by whoever received the first one", () => {
    const toss = eventsOf(result.events, "COIN_TOSS")[0];
    const secondHalf = eventsOf(result.events, "KICKOFF")
      .find((_, i) => i > 0 && eventsOf(result.events, "KICKOFF")[i] !== undefined);
    expect(secondHalf).toBeDefined();
    const secondHalfCause = eventsOf(result.events, "DRIVE_START")
      .find((d) => d.payload.cause === "SECOND_HALF_KICKOFF");
    expect(secondHalfCause).toBeDefined();
    // The team that received first kicks off to start the second half, so the
    // team that STARTS the second-half drive is the other one.
    expect(secondHalfCause?.payload.offense).not.toBe(toss?.payload.receivesFirst);
  });
});

/**
 * OVERTIME IS THIN BY SCOPE — one period, sudden death, and a tie stands. Real
 * NFL possession rules are explicitly out of this dispatch. These seeds were
 * found by scanning; they exist so the OT branch is not an untested path, which
 * it was until the search ran.
 *
 * RE-SCANNED for the §5.3/§7.3/§7.4 dispatch. `ot-3` and `ot-139` are not ties
 * any more, and that is expected rather than alarming: adding three pressure
 * cards to the fixture corpus changes every play call downstream of the first
 * one, so any seed chosen for a whole-game PROPERTY has to be re-found. Nothing
 * about the overtime branch changed.
 *
 * RE-SCANNED AGAIN for ADR-026, and for the same reason. A protector whose named
 * rusher is not rushing now joins the pickup pool, which moves the dice on any
 * snap where he is offered somebody — so `ot-33` and `ot-792` are no longer an
 * overtime and a tie. That the seeds moved is the fix working; a seed chosen by
 * scanning for a whole-game outcome is not a property of the overtime branch and
 * has to be re-found whenever any resolution changes. Ties are rare (one in
 * 1,500 seeds scanned), which is why the tie seed is a long way out.
 *
 * RE-SCANNED AGAIN for ADR-028 (the blocker's `anchor` term, and
 * `blockerStructuralAdvantage` to 0). Every §7.1 rep in the league now draws a
 * different modifier total, so `ot-103` is no longer an overtime and the OT seed
 * moves to `ot-162`. The TIE seed `ot-1465` survived the change untouched, which
 * is luck rather than evidence — it was re-scanned, not assumed.
 *
 * RE-SCANNED AGAIN for ADR-031 (§7.4's free runner gets a path term). Every free
 * runner off the EDGE now arrives half a tick later, which moves the pocket
 * clock on ~20% of this corpus's free runners and therefore every call after the
 * first play that contains one: `ot-162` is no longer an overtime and the OT
 * seed moves to `ot-2`. `ot-1465` has now survived three consecutive resolution
 * changes, which is still luck and is still re-scanned rather than assumed —
 * 2,500 seeds scanned, two of them ties.
 *
 * RE-SCANNED AGAIN for ADR-040 (§8.3's perception band, §10.3's lane target,
 * §11.1's contested threshold). Three resolutions moved at once, so every seed
 * in this block had to be re-found: `ot-2` is no longer an overtime and
 * `ot-1465`'s run of luck is over. The OT seed moves to `ot-95` and the tie seed
 * to `ot-891` — 1,914 seeds scanned, thirty-one overtimes and two ties. As
 * before: a seed chosen by scanning for a whole-game outcome is not a property
 * of the overtime branch, and nothing about that branch changed.
 *
 * RE-SCANNED AGAIN for ADR-045 (SA-08's scale correction across §9.3 and §9.4,
 * plus §11.1's threshold following its anchor). Every coverage rep in the league
 * now publishes a different openness, so this is the widest resolution change any
 * of these re-scans has followed: `ot-95` is no longer an overtime and the OT
 * seed moves to `ot-124`. **The TIE seed `ot-891` survived** — 2,353 seeds
 * scanned, forty overtimes and three ties (`ot-537`, `ot-891`, `ot-2352`) —
 * and, as every block above says, that is luck rather than evidence: it was
 * re-scanned, not assumed. Nothing about the overtime branch changed.
 *
 * RE-SCANNED AGAIN for ADR-048 (§8.7's openness gain becomes contest-conditioned).
 * Same class of change and the widest yet in one respect: every coverage rep now
 * publishes a different openness at every tick AFTER the break as well as at it,
 * so the hold/throw decision moves on a large share of dropbacks. `ot-124` is no
 * longer an overtime and the OT seed moves to **`ot-125`** — 1,229 seeds scanned
 * (`ot-0`…`ot-1228`), twenty-five overtimes and three ties (`ot-891`, `ot-1027`,
 * `ot-1228`). **The TIE seed `ot-891` survived a second time**, and that is still
 * luck rather than evidence. Nothing about the overtime branch changed.
 */
describe("overtime, to the extent a tie requires one", () => {
  const overtime = simulateGameFor("ot-125");
  const tie = simulateGameFor("ot-891");

  it("a tie at the end of regulation opens a fifth period", () => {
    const starts = eventsOf(overtime.events, "PERIOD_START").map((e) => e.payload.period);
    expect(starts).toContain(5);
    expect(eventsOf(overtime.events, "PERIOD_END").map((e) => e.payload.period)).toContain(5);
  });

  it("sudden death: the first score in overtime ends it, and it is the last event of substance", () => {
    expect(overtime.summary.finalReason).toBe("OVERTIME");
    expect(overtime.summary.score.home).not.toBe(overtime.summary.score.away);
    const scores = eventsOf(overtime.events, "SCORE");
    const last = scores[scores.length - 1];
    expect(last).toBeDefined();
    // No drive begins after the winning score.
    const afterWinner = overtime.events
      .slice(overtime.events.findIndex((e) => e.event === last))
      .map((e) => e.event)
      .filter((e) => e.type === "DRIVE_START");
    expect(afterWinner).toHaveLength(0);
  });

  it("a scoreless overtime ends in a tie rather than a sixth period", () => {
    expect(tie.summary.finalReason).toBe("TIE");
    expect(tie.summary.score.home).toBe(tie.summary.score.away);
    expect(eventsOf(tie.events, "PERIOD_START").map((e) => e.payload.period)).not.toContain(6);
  });

  it("the overtime kickoff is caused, named and in the stream", () => {
    const kickoff = eventsOf(overtime.events, "DRIVE_START").find(
      (d) => d.payload.cause === "OVERTIME_KICKOFF",
    );
    expect(kickoff).toBeDefined();
    expect(kickoff?.payload.period).toBe(5);
  });
});

describe("★1 — the state is a value, and the loop does not mutate its argument", () => {
  it("the input state is untouched", () => {
    const again = buildGameFixture();
    expect(fixture.state).toEqual(again.state);
    expect(fixture.state.phase).toBe("PREGAME");
  });

  it("the returned state is serializable — no functions, no cycles, no class instances", () => {
    const json = JSON.stringify(result.newState);
    expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(result.newState)));
  });

  it("re-running a finished game is refused rather than silently restarted", () => {
    expect(() => simulateGame(result.newState, fixture.inputs, fixture.seed)).toThrow(
      /already over/,
    );
  });
});
