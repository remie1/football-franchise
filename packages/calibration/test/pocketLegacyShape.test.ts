/**
 * ADR-089 step 1 — THE LEGACY STREAM'S SHAPE (S4; plan §7.2 item 11).
 *
 * The switch is OFF by default, and an OFF stream must be today's to the byte (the golden pins prove
 * the bytes; this test names the shape, so a failure says what moved). Over the golden games at
 * caller v7 with no tunables passed (10 a league in the suite, all 50 under `FF_POCKET_BASE=1`):
 *
 *  - no own property of any event payload, at any depth, holds `undefined` (an optional field the
 *    engine writes as `undefined` would vanish in JSON but still change a canonical digest);
 *  - every `PASS_PLAY_V1` `PLAY_START` payload has exactly today's keys, in order, and no `rules`;
 *  - every `pass_rush_tick` CHECK has exactly today's keys, in order, `roll` and `opposedRoll` present;
 *  - every `RUSH_THREAT` payload has exactly today's keys, in order, and no `approach`;
 *  - no `pass_rush_beat` CHECK and no uniform die.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";

const ALL = process.env["FF_POCKET_BASE"] === "1";
const FIRST = ALL ? 50 : 10;

const PASS_PLAY_START_KEYS = ["kind", "offense", "defense", "situation"];
const TICK_KEYS = ["checkKind", "actors", "roll", "tier", "margin", "testsAttrs", "opposedRoll", "band", "rollRef"];
const THREAT_KEYS = ["rusher", "alignment", "origin", "rollRef", "etaTick", "state"];

/** Paths of own properties holding `undefined`, at any depth. */
function undefinedPaths(value: unknown, path: string, out: string[]): void {
  if (typeof value !== "object" || value === null) return;
  for (const key of Object.keys(value)) {
    const v = (value as Record<string, unknown>)[key];
    if (v === undefined) out.push(`${path}.${key}`);
    else undefinedPaths(v, `${path}.${key}`, out);
  }
}

interface Shape {
  games: number;
  events: number;
  undefinedAt: string[];
  passStarts: number;
  passStartKeys: Set<string>;
  ticks: number;
  tickKeys: Set<string>;
  threats: number;
  threatKeys: Set<string>;
  beats: number;
  uniform: number;
}

function shapeOf(league: (typeof GOLDEN_LEAGUES)[number]): Shape {
  const s: Shape = { games: 0, events: 0, undefinedAt: [], passStarts: 0, passStartKeys: new Set(), ticks: 0, tickKeys: new Set(), threats: 0, threatKeys: new Set(), beats: 0, uniform: 0 };
  goldenGames(
    league,
    (o) => {
      s.games += 1;
      o.events.forEach((envelope: MatchEventEnvelope, i: number) => {
        s.events += 1;
        const { event } = envelope;
        const found: string[] = [];
        undefinedPaths(event, `game ${String(s.games)} event ${String(i)} ${event.type}`, found);
        if (found.length > 0 && s.undefinedAt.length < 20) s.undefinedAt.push(...found.slice(0, 20 - s.undefinedAt.length));
        const payload = (event as { payload?: unknown }).payload as Record<string, unknown> | undefined;
        if (payload === undefined) return;
        if (event.type === "PLAY_START" && payload["kind"] === "PASS_PLAY_V1") {
          s.passStarts += 1;
          s.passStartKeys.add(Object.keys(payload).join(","));
        } else if (event.type === "RUSH_THREAT") {
          s.threats += 1;
          s.threatKeys.add(Object.keys(payload).join(","));
        } else if (event.type === "CHECK") {
          if (payload["checkKind"] === "pass_rush_tick") {
            s.ticks += 1;
            s.tickKeys.add(Object.keys(payload).join(","));
          }
          if (payload["checkKind"] === "pass_rush_beat") s.beats += 1;
          for (const r of [payload["roll"], payload["opposedRoll"]]) if ((r as { die?: unknown } | undefined)?.die === "uniform") s.uniform += 1;
        }
      });
    },
    { callerVersion: "v7", first: FIRST },
  );
  return s;
}

describe(`the legacy stream's shape on ${String(FIRST)} golden games a league (S4)`, () => {
  for (const league of GOLDEN_LEAGUES) {
    it(`${league}: no undefined field, and today's keys on PLAY_START, the tick and the threat`, () => {
      const s = shapeOf(league);
      expect(s.games).toBe(FIRST);
      expect(s.undefinedAt).toEqual([]);
      expect(s.passStarts).toBeGreaterThan(0);
      expect([...s.passStartKeys]).toEqual([PASS_PLAY_START_KEYS.join(",")]);
      expect(s.ticks).toBeGreaterThan(0);
      expect([...s.tickKeys]).toEqual([TICK_KEYS.join(",")]);
      expect(s.threats).toBeGreaterThan(0);
      expect([...s.threatKeys]).toEqual([THREAT_KEYS.join(",")]);
      expect({ beats: s.beats, uniform: s.uniform }).toEqual({ beats: 0, uniform: 0 });
      process.stdout.write(`pocketLegacyShape ${league}: ${String(s.games)} games, ${String(s.events)} events, ${String(s.passStarts)} pass PLAY_STARTs, ${String(s.ticks)} ticks, ${String(s.threats)} threats\n`);
    }, 600_000);
  }
});
