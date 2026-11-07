/**
 * ADR-089 step 4 — SACK CREDIT AT CONTACT (`stats/statline.ts`; plan §2.3, critique 3 S8).
 *
 * On a stream with contact the sack goes to `actors[0]` of the play's last `arrival_contest` CHECK
 * in band RUSHER_SACKS, never to a man the quarterback shed earlier in the play; with no such CHECK
 * the legacy rule (the last rusher published ARRIVED) credits it, unchanged. No stream carries the
 * CHECK before P6 is in contracts, so these streams are today's legacy games with contests spliced
 * in, in the shape `PlayEventLog.arrivalContest` hands its recorder.
 */
import { describe, expect, it } from "vitest";
import type { PlayerId } from "@ff/contracts";
import { simulateGame } from "../src/game/simulateGame.js";
import type { GameEventEnvelope } from "../src/game/events.js";
import { reduceStatlines } from "../src/stats/statline.js";
import { buildGameFixture } from "./gameFixtures.js";

type Env = GameEventEnvelope;
const kind = (e: Env): string => (e.event as { type: string }).type;
const pl = (e: Env): Record<string, unknown> => (e.event as { payload: Record<string, unknown> }).payload;

const GAMES = Array.from({ length: 4 }, (_, i) => {
  const f = buildGameFixture({ seed: `sack-contact-${i}` });
  return simulateGame(f.state, f.inputs, f.seed);
});

interface SackPlay {
  readonly events: readonly Env[];
  /** Index of the play's PLAY_RESULT. */
  readonly resultAt: number;
  readonly credited: PlayerId;
  /** Another of the play's rushers, not the credited one. */
  readonly other: PlayerId;
  readonly qb: PlayerId;
}

/** Every legacy sack credited to a man, with another of the play's rushers and the passer. */
function creditedSacks(events: readonly Env[]): SackPlay[] {
  const out: SackPlay[] = [];
  let start = -1;
  let lastArrived: PlayerId | undefined;
  let thrown = false;
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (kind(e) === "PLAY_START") {
      start = i;
      lastArrived = undefined;
      thrown = false;
    }
    if (kind(e) === "RUSH_THREAT" && pl(e)["state"] === "ARRIVED") lastArrived = pl(e)["rusher"] as PlayerId;
    if (kind(e) === "THROW" || kind(e) === "THROWAWAY") thrown = true;
    if (kind(e) === "PLAY_RESULT" && start >= 0 && !thrown && lastArrived !== undefined && (pl(e)["yards"] as number) < 0) {
      const startP = pl(events[start]!) as {
        kind?: string;
        offense?: { quarterback?: PlayerId };
        defense?: { rush?: readonly { rusher: PlayerId }[] };
      };
      const qb = startP.offense?.quarterback;
      if (startP.kind !== "PASS_PLAY_V1" || qb === undefined) continue;
      const other = (startP.defense?.rush ?? []).map((r) => r.rusher).find((p) => p !== lastArrived);
      if (other === undefined) continue;
      out.push({ events, resultAt: i, credited: lastArrived, other, qb });
    }
  }
  return out;
}

const contest = (template: Env, rusher: PlayerId, qb: PlayerId, band: string, label: string): Env =>
  ({
    ...template,
    // The play's own gameId, playId and tick come with the template; only the type and payload change.
    event: {
      ...template.event,
      type: "CHECK",
      payload: {
        checkKind: "arrival_contest",
        actors: [rusher, qb],
        roll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: label },
        tier: "TIE",
        margin: band === "RUSHER_SACKS" ? 10 : -10,
        testsAttrs: [],
        target: 5,
        opposedRoll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: label },
        band,
      },
    },
  }) as unknown as Env;

const sacksOf = (events: readonly Env[], who: PlayerId): number =>
  reduceStatlines(events).find((l) => l.player === who)?.defense.sacks ?? 0;

describe("ADR-089 step 4 — sack credit at contact", () => {
  const sacks = GAMES.flatMap((g) => creditedSacks(g.events as readonly Env[]));

  it("the legacy rule is unchanged: today's streams reduce to the games' own statlines", () => {
    expect(sacks.length).toBeGreaterThan(0);
    for (const g of GAMES) expect(reduceStatlines(g.events as readonly Env[])).toEqual(g.statlines);
  });

  it("a RUSHER_SACKS contest credits its rusher; the man shed earlier in the play is not credited", () => {
    for (const s of sacks.slice(0, 10)) {
      const r = s.events[s.resultAt]!;
      const spliced = [
        ...s.events.slice(0, s.resultAt),
        contest(r, s.credited, s.qb, "QB_SHEDS", "x/rush/t2.0/a:contest"),
        contest(r, s.other, s.qb, "RUSHER_SACKS", "x/rush/t2.5/b:contest2"),
        ...s.events.slice(s.resultAt),
      ];
      expect(sacksOf(spliced, s.other)).toBe(sacksOf(s.events, s.other) + 1);
      expect(sacksOf(spliced, s.credited)).toBe(sacksOf(s.events, s.credited) - 1);
    }
  });

  it("a shed with no RUSHER_SACKS leaves the legacy credit; a contest on another play does not carry over", () => {
    for (const s of sacks.slice(0, 10)) {
      const r = s.events[s.resultAt]!;
      const shedOnly = [
        ...s.events.slice(0, s.resultAt),
        contest(r, s.other, s.qb, "QB_SHEDS", "x/rush/t2.0/b:contest"),
        ...s.events.slice(s.resultAt),
      ];
      expect(reduceStatlines(shedOnly)).toEqual(reduceStatlines(s.events));
      // A RUSHER_SACKS contest placed in the play before this one credits nothing here.
      const lastIndex = (pred: (e: Env, i: number) => boolean): number => {
        for (let i = s.events.length - 1; i >= 0; i--) if (pred(s.events[i]!, i)) return i;
        return -1;
      };
      const before = lastIndex((e, i) => i < s.resultAt && kind(e) === "PLAY_START");
      const prior = lastIndex((e, i) => i < before && kind(e) === "PLAY_RESULT");
      if (prior < 0) continue;
      const elsewhere = [
        ...s.events.slice(0, prior),
        contest(r, s.other, s.qb, "RUSHER_SACKS", "x/rush/t1.0/b:contest"),
        ...s.events.slice(prior),
      ];
      expect(sacksOf(elsewhere, s.credited)).toBe(sacksOf(s.events, s.credited));
    }
  });
});
