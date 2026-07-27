/**
 * PER-PLAYER STATLINES AS A PURE REDUCER OVER THE EVENT STREAM.
 *
 * ================== WHY IT IS A REDUCER ==================
 * `FANTASY-GATE-PHASE1` F1 is about exactly this file. The natural way to
 * produce a box score is an accumulator running alongside the simulation,
 * incrementing counters as outcomes are decided. It is also the wrong way, and
 * the wrongness is invisible:
 *
 *   - The numbers look right, so nothing announces the problem.
 *   - Charter pillar 3 says the event stream is the single source of truth. An
 *     accumulator makes the box score a SECOND source, and the two can disagree.
 *   - Replay stops covering the thing people actually argue about. You can
 *     re-simulate the game and get the same events, and still not be able to
 *     re-derive the score somebody was judged on.
 *
 * So: `(readonly GameEventEnvelope[]) → readonly StatLine[]`, no inputs but the
 * stream, and `simulateGame` produces its `statlines` by calling THIS on the
 * events it is about to return. `test/statline.test.ts` asserts the equality. If
 * the two could ever disagree, one of them would be a side channel.
 *
 * ================== WHAT IS DERIVABLE, AND WHAT IS NOT ==================
 * Everything here comes off events that already existed for other reasons —
 * ADR-010's separation of `RUSH_ZONE` from `YAC_ZONE` and of `carryType` from
 * `gap` did the hard half before this file was written. Three attributions are
 * INFERENCES rather than statements, and are marked at their site:
 *
 *  1. **Who made a tackle.** ADR-010 considered and rejected a `TACKLE` event:
 *     the tackler is the defender in the last `tackle`/`yac_tackle`/
 *     `break_tackle` CHECK the carrier lost. That is what this does.
 *  2. **Who got the sack.** There is no sack event. A dropback with no `THROW`
 *     and no `RUN_RESOLUTION` that lost yards is a sack; the sacker is the last
 *     rusher published as `ARRIVED` on `RUSH_THREAT`. A coverage sack (nobody
 *     arrived) is credited to nobody, which is honest and is why team sacks can
 *     exceed the sum of individual ones.
 *  3. **Throwaways are not attempts.** The engine emits no `THROW` for a
 *     throwaway (correctly — no target, no accuracy roll), so it does not appear
 *     as a pass attempt. Real NFL scoring counts it. Logged, not patched: the
 *     fix is a `THROWAWAY` producer decision, not a reducer decision.
 */
import type { MatchEvent, PlayerId, TeamId } from "@ff/contracts";
import type { GameEvent, GameEventEnvelope } from "../game/events.js";

export interface PassingLine {
  readonly attempts: number;
  readonly completions: number;
  readonly yards: number;
  readonly touchdowns: number;
  readonly interceptions: number;
  readonly sacked: number;
  readonly sackYards: number;
}

export interface RushingLine {
  readonly attempts: number;
  readonly yards: number;
  readonly touchdowns: number;
  readonly longest: number;
}

export interface ReceivingLine {
  readonly targets: number;
  readonly receptions: number;
  readonly yards: number;
  readonly touchdowns: number;
  readonly drops: number;
}

export interface DefensiveLine {
  readonly tackles: number;
  readonly sacks: number;
  readonly interceptions: number;
  readonly passesDefensed: number;
  readonly tacklesForLoss: number;
}

export interface KickingLine {
  readonly fieldGoalAttempts: number;
  readonly fieldGoalsMade: number;
  readonly extraPointAttempts: number;
  readonly extraPointsMade: number;
  readonly punts: number;
  readonly puntGrossYards: number;
}

export interface ReturnLine {
  readonly kickReturns: number;
  readonly kickReturnYards: number;
  readonly puntReturns: number;
  readonly puntReturnYards: number;
}

export interface StatLine {
  readonly player: PlayerId;
  readonly team: TeamId;
  readonly passing: PassingLine;
  readonly rushing: RushingLine;
  readonly receiving: ReceivingLine;
  readonly defense: DefensiveLine;
  readonly kicking: KickingLine;
  readonly returns: ReturnLine;
}

// --- mutable working shape (never escapes this module) ----------------------

interface Acc {
  player: PlayerId;
  team: TeamId;
  passing: { attempts: number; completions: number; yards: number; touchdowns: number; interceptions: number; sacked: number; sackYards: number };
  rushing: { attempts: number; yards: number; touchdowns: number; longest: number };
  receiving: { targets: number; receptions: number; yards: number; touchdowns: number; drops: number };
  defense: { tackles: number; sacks: number; interceptions: number; passesDefensed: number; tacklesForLoss: number };
  kicking: { fieldGoalAttempts: number; fieldGoalsMade: number; extraPointAttempts: number; extraPointsMade: number; punts: number; puntGrossYards: number };
  returns: { kickReturns: number; kickReturnYards: number; puntReturns: number; puntReturnYards: number };
}

function blank(player: PlayerId, team: TeamId): Acc {
  return {
    player,
    team,
    passing: { attempts: 0, completions: 0, yards: 0, touchdowns: 0, interceptions: 0, sacked: 0, sackYards: 0 },
    rushing: { attempts: 0, yards: 0, touchdowns: 0, longest: 0 },
    receiving: { targets: 0, receptions: 0, yards: 0, touchdowns: 0, drops: 0 },
    defense: { tackles: 0, sacks: 0, interceptions: 0, passesDefensed: 0, tacklesForLoss: 0 },
    kicking: { fieldGoalAttempts: 0, fieldGoalsMade: 0, extraPointAttempts: 0, extraPointsMade: 0, punts: 0, puntGrossYards: 0 },
    returns: { kickReturns: 0, kickReturnYards: 0, puntReturns: 0, puntReturnYards: 0 },
  };
}

// --- reading PLAY_START, which contracts types as `unknown` -----------------

interface PlayStartView {
  readonly kind: string;
  readonly offenseTeam: TeamId | undefined;
  readonly defenseTeam: TeamId | undefined;
  readonly quarterback: PlayerId | undefined;
  readonly carrier: PlayerId | undefined;
  readonly offensePlayers: readonly PlayerId[];
  readonly defensePlayers: readonly PlayerId[];
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : undefined;
}

function asId(v: unknown): PlayerId | undefined {
  return typeof v === "string" ? (v as unknown as PlayerId) : undefined;
}

function idsFrom(list: unknown, ...keys: readonly string[]): PlayerId[] {
  if (!Array.isArray(list)) return [];
  const out: PlayerId[] = [];
  for (const entry of list) {
    const record = asRecord(entry);
    if (record === undefined) continue;
    for (const key of keys) {
      const id = asId(record[key]);
      if (id !== undefined) out.push(id);
    }
  }
  return out;
}

function readPlayStart(payload: unknown): PlayStartView | undefined {
  const root = asRecord(payload);
  if (root === undefined) return undefined;
  const offense = asRecord(root["offense"]) ?? {};
  const defense = asRecord(root["defense"]) ?? {};
  const quarterback = asId(offense["quarterback"]);
  const carrier = asId(offense["carrier"]);

  const offensePlayers: PlayerId[] = [
    ...(quarterback === undefined ? [] : [quarterback]),
    ...(carrier === undefined ? [] : [carrier]),
    ...idsFrom(offense["routes"], "receiver"),
    ...idsFrom(offense["protection"], "blocker"),
    ...idsFrom(offense["blocking"], "blocker", "doubleTeamWith"),
    ...idsFrom(offense["perimeter"], "blocker"),
  ];
  const defensePlayers: PlayerId[] = [
    ...idsFrom(defense["assignments"], "defender"),
    ...idsFrom(defense["rush"], "rusher"),
    ...idsFrom(offense["protection"], "rusher"),
    ...idsFrom(offense["blocking"], "defender"),
    ...idsFrom(offense["perimeter"], "defender"),
  ];

  const offenseTeam = typeof offense["team"] === "string" ? (offense["team"] as unknown as TeamId) : undefined;
  const defenseTeam = typeof defense["team"] === "string" ? (defense["team"] as unknown as TeamId) : undefined;

  return {
    kind: typeof root["kind"] === "string" ? root["kind"] : "?",
    offenseTeam,
    defenseTeam,
    quarterback,
    carrier,
    offensePlayers,
    defensePlayers,
  };
}

// --- per-play scratch --------------------------------------------------------

interface PlayScratch {
  view: PlayStartView;
  side: Map<string, TeamId>;
  throwTarget: PlayerId | undefined;
  caughtBy: PlayerId | undefined;
  dropBy: PlayerId | undefined;
  passesDefensedBy: PlayerId | undefined;
  interceptedBy: PlayerId | undefined;
  tipRecoveredBy: PlayerId | undefined;
  lastTackler: PlayerId | undefined;
  lastArrivedRusher: PlayerId | undefined;
  runCarrier: PlayerId | undefined;
  runCarryType: string | undefined;
  hadThrow: boolean;
}

const TACKLE_KINDS = new Set(["tackle", "yac_tackle", "break_tackle"]);

/** Deflection bands that mean the defender knocked the ball down (§11.3). */
const PBU_BANDS = new Set(["PBU_TIP", "CLEAN_PBU", "TIP_BALL"]);

/**
 * The whole box score, from nothing but the stream.
 *
 * Deterministic in output ORDER as well as in content: entries are sorted by
 * team then player id, so two runs of the same seed produce byte-identical
 * statlines and a diff of two games is a diff and not a shuffle.
 */
export function reduceStatlines(events: readonly GameEventEnvelope[]): readonly StatLine[] {
  const lines = new Map<string, Acc>();
  const teamOf = new Map<string, TeamId>();

  const touch = (player: PlayerId, team: TeamId | undefined): Acc | undefined => {
    const key = String(player);
    const resolved = team ?? teamOf.get(key);
    if (resolved === undefined) return undefined;
    teamOf.set(key, resolved);
    const existing = lines.get(key);
    if (existing !== undefined) return existing;
    const created = blank(player, resolved);
    lines.set(key, created);
    return created;
  };

  let play: PlayScratch | undefined;

  for (const { event } of events) {
    if (isMatchEvent(event)) {
      play = applyPlayEvent(event, play, touch);
      continue;
    }
    applyGameEvent(event, touch);
  }

  return [...lines.values()]
    .sort((a, b) => String(a.team).localeCompare(String(b.team)) || String(a.player).localeCompare(String(b.player)))
    .map(freeze);
}

function freeze(a: Acc): StatLine {
  return {
    player: a.player,
    team: a.team,
    passing: { ...a.passing },
    rushing: { ...a.rushing },
    receiving: { ...a.receiving },
    defense: { ...a.defense },
    kicking: { ...a.kicking },
    returns: { ...a.returns },
  };
}

/** The interim game events are the only ones contracts does not declare. */
function isMatchEvent(event: GameEvent): event is MatchEvent {
  switch (event.type) {
    case "GAME_START":
    case "COIN_TOSS":
    case "PERIOD_START":
    case "PERIOD_END":
    case "POSSESSION_CHANGE":
    case "DRIVE_START":
    case "DRIVE_END":
    case "SCORE":
    case "PLACEKICK":
    case "PUNT":
    case "KICKOFF":
    case "COACH_DECISION":
    case "GAME_SUMMARY":
      return false;
    default:
      return true;
  }
}

type Touch = (player: PlayerId, team: TeamId | undefined) => Acc | undefined;

function applyGameEvent(event: Exclude<GameEvent, MatchEvent>, touch: Touch): void {
  if (event.type === "PLACEKICK") {
    const line = touch(event.payload.kicker, event.payload.team);
    if (line === undefined) return;
    if (event.payload.kind === "FIELD_GOAL") {
      line.kicking.fieldGoalAttempts += 1;
      if (event.payload.made) line.kicking.fieldGoalsMade += 1;
    } else {
      line.kicking.extraPointAttempts += 1;
      if (event.payload.made) line.kicking.extraPointsMade += 1;
    }
    return;
  }
  if (event.type === "PUNT") {
    const line = touch(event.payload.punter, event.payload.team);
    if (line !== undefined) {
      line.kicking.punts += 1;
      line.kicking.puntGrossYards += event.payload.grossYards;
    }
    const returner = event.payload.returner;
    if (returner !== undefined) {
      // The returner is on the OTHER team, which the event does not state; his
      // team is learned from the plays he appears in. If he has never appeared
      // in one (impossible in a real game, possible in a fixture) he is skipped.
      const returnLine = touch(returner, undefined);
      if (returnLine !== undefined) {
        returnLine.returns.puntReturns += 1;
        returnLine.returns.puntReturnYards += event.payload.returnYards;
      }
    }
    return;
  }
  if (event.type === "KICKOFF") {
    // The kicker gets a line so he appears in the box score at all; kickoffs
    // themselves are not a counted statistic here (no touchbacks column, no
    // hang time, no coverage) because the resolver behind them is placeholder
    // depth and a column of numbers would imply otherwise.
    touch(event.payload.kicker, event.payload.team);
    const returner = event.payload.returner;
    if (returner !== undefined) {
      const returnLine = touch(returner, undefined);
      if (returnLine !== undefined) {
        returnLine.returns.kickReturns += 1;
        returnLine.returns.kickReturnYards += event.payload.returnYards;
      }
    }
  }
}

function applyPlayEvent(
  event: MatchEvent,
  play: PlayScratch | undefined,
  touch: Touch,
): PlayScratch | undefined {
  if (event.type === "PLAY_START") {
    const view = readPlayStart(event.payload);
    if (view === undefined) return undefined;
    const side = new Map<string, TeamId>();
    if (view.offenseTeam !== undefined) {
      for (const id of view.offensePlayers) side.set(String(id), view.offenseTeam);
    }
    if (view.defenseTeam !== undefined) {
      for (const id of view.defensePlayers) side.set(String(id), view.defenseTeam);
    }
    for (const [id, team] of side) touch(id as unknown as PlayerId, team);
    return {
      view,
      side,
      throwTarget: undefined,
      caughtBy: undefined,
      dropBy: undefined,
      passesDefensedBy: undefined,
      interceptedBy: undefined,
      tipRecoveredBy: undefined,
      lastTackler: undefined,
      lastArrivedRusher: undefined,
      runCarrier: undefined,
      runCarryType: undefined,
      hadThrow: false,
    };
  }
  if (play === undefined) return play;
  const teamFor = (id: PlayerId): TeamId | undefined => play.side.get(String(id));

  switch (event.type) {
    case "THROW":
      play.hadThrow = true;
      play.throwTarget = event.payload.target;
      return play;

    case "CATCH_RESOLUTION":
      if (event.payload.caught) play.caughtBy = event.payload.receiver;
      return play;

    case "RUSH_THREAT":
      if (event.payload.state === "ARRIVED") play.lastArrivedRusher = event.payload.rusher;
      return play;

    case "TIPPED_BALL":
      play.tipRecoveredBy = event.payload.recoveredBy;
      return play;

    case "RUN_RESOLUTION":
      play.runCarrier = event.payload.carrier;
      play.runCarryType = event.payload.carryType;
      return play;

    case "CHECK": {
      const p = event.payload;
      const actor = p.actors[0];
      const opponent = p.actors[1];
      if (TACKLE_KINDS.has(p.checkKind) && p.margin < 0 && opponent !== undefined) {
        // INFERENCE (ADR-010): the tackler is the defender in the last contest
        // the carrier LOST. There is no TACKLE event and ADR-010 declined to add
        // one, on the grounds that this reducer is three lines. This is them.
        play.lastTackler = opponent;
      }
      if (p.checkKind === "catch" && p.band !== undefined && p.band.startsWith("DROPPED")) {
        play.dropBy = actor;
      }
      if (p.checkKind === "contested_catch" && p.band !== undefined) {
        if (p.band === "INTERCEPTION" && opponent !== undefined) play.interceptedBy = opponent;
        else if (PBU_BANDS.has(p.band) && opponent !== undefined) play.passesDefensedBy = opponent;
      }
      return play;
    }

    case "PLAY_RESULT": {
      const yards = event.payload.yards;
      const scored = event.payload.score !== undefined;
      const turnover = event.payload.turnover;
      const passer = play.view.quarterback;
      const isPass = play.view.kind === "PASS_PLAY_V1";

      // Reception: the intended target, or — on a tipped ball the offence came
      // up with — whoever came up with it. Both are completions in real scoring.
      const receiver =
        play.caughtBy ??
        (play.tipRecoveredBy !== undefined && !turnover && teamFor(play.tipRecoveredBy) === play.view.offenseTeam
          ? play.tipRecoveredBy
          : undefined);

      if (isPass && passer !== undefined) {
        const line = touch(passer, play.view.offenseTeam);
        if (line !== undefined) {
          if (play.hadThrow) line.passing.attempts += 1;
          if (receiver !== undefined) {
            line.passing.completions += 1;
            line.passing.yards += yards;
            if (scored) line.passing.touchdowns += 1;
          }
          if (turnover) line.passing.interceptions += 1;
          // A sack: a dropback with no throw and no carry that lost ground.
          if (!play.hadThrow && play.runCarrier === undefined && yards < 0) {
            line.passing.sacked += 1;
            line.passing.sackYards += -yards;
          }
        }
      }

      if (play.throwTarget !== undefined) {
        const line = touch(play.throwTarget, teamFor(play.throwTarget));
        if (line !== undefined) line.receiving.targets += 1;
      }
      if (receiver !== undefined) {
        const line = touch(receiver, teamFor(receiver));
        if (line !== undefined) {
          line.receiving.receptions += 1;
          line.receiving.yards += yards;
          if (scored) line.receiving.touchdowns += 1;
        }
      }
      if (play.dropBy !== undefined) {
        const line = touch(play.dropBy, teamFor(play.dropBy));
        if (line !== undefined) line.receiving.drops += 1;
      }

      if (play.runCarrier !== undefined) {
        const line = touch(play.runCarrier, teamFor(play.runCarrier));
        if (line !== undefined) {
          line.rushing.attempts += 1;
          line.rushing.yards += yards;
          line.rushing.longest = Math.max(line.rushing.longest, yards);
          if (scored) line.rushing.touchdowns += 1;
        }
      }

      // Defence.
      if (play.lastTackler !== undefined) {
        const line = touch(play.lastTackler, teamFor(play.lastTackler));
        if (line !== undefined) {
          line.defense.tackles += 1;
          if (yards < 0) line.defense.tacklesForLoss += 1;
        }
      }
      if (isPass && !play.hadThrow && play.runCarrier === undefined && yards < 0) {
        // INFERENCE: the sacker is the last rusher the stream published as
        // ARRIVED. A coverage sack has none and is credited to nobody.
        const sacker = play.lastArrivedRusher;
        if (sacker !== undefined) {
          const line = touch(sacker, teamFor(sacker));
          if (line !== undefined) line.defense.sacks += 1;
        }
      }
      if (play.passesDefensedBy !== undefined) {
        const line = touch(play.passesDefensedBy, teamFor(play.passesDefensedBy));
        if (line !== undefined) line.defense.passesDefensed += 1;
      }
      if (turnover && isPass) {
        const thief =
          play.interceptedBy ??
          (play.tipRecoveredBy !== undefined && teamFor(play.tipRecoveredBy) === play.view.defenseTeam
            ? play.tipRecoveredBy
            : undefined);
        if (thief !== undefined) {
          const line = touch(thief, teamFor(thief));
          if (line !== undefined) line.defense.interceptions += 1;
        }
      }
      return play;
    }

    default:
      return play;
  }
}
