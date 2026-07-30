/**
 * ============================================================================
 * PLAY SCOPE — pricing a per-play subject where its causality actually lives.
 * ============================================================================
 *
 * `docs/design/calibration.md` §5.3, standing rule (backlog entry 53, promoted from `match-engine`'s
 * recommendation in ADR-045 §3a.5):
 *
 *   > **Price a per-play subject at PLAY scope first. A corpus arm cannot distinguish "no effect"
 *   > from "effect swamped."**
 *
 * ================== THE EVIDENCE THAT PRODUCED THE RULE ==================
 *
 * ADR-045 §2.3a moved `manCoverage.bands.5.openness` **DOWN**, 25 → 22. A 12-game corpus arm
 * reported mean actual openness per read moving **+0.03 — the wrong sign** — because the corpus
 * COMPOSITION shifted underneath the measurement: the population of `CB_IN_PHASE` reps was itself
 * 105 in one arm and 99 in the other. Every behavioural row sat inside a quarter of its standard
 * error, and *"no effect"* and *"effect swamped"* were **indistinguishable at that instrument**.
 *
 * At PLAY scope the same change priced cleanly: **raw 453, exclusive 26.** The raw count over-stated
 * the change's reach by **17×**, and the exclusive one came with a proof — a digest-identical
 * complement of 3,974 plays, which is not a sample but the statement that the change has no
 * behavioural surface on any of them.
 *
 * ================== WHY IT WORKS, STATED SO IT CAN BE DISPUTED ==================
 *
 * **Plays are causally independent GIVEN their entering state and the seed.** `simulatePassPlay`
 * derives its whole PRNG tree from `createRng(seed, "game:<gameId>").fork("play:<playNumber>")` and
 * reads nothing about the game except the `MatchGameState` it is handed. So two arms that are handed
 * the SAME entering state, the SAME calls and the SAME seed differ only where the subject reaches —
 * and the plays where they do not differ are provably untouched, not merely observed to agree.
 *
 * That is exactly what a corpus arm cannot give. Once a play's outcome moves, the down moves, the
 * drive moves, and every later play in that game is a different play in a different situation.
 * "Plays that differ" then over-counts without bound and "games that differ" under-counts, which is
 * why four of `scaleAudit.measure.test.ts`'s findings are reported RAW-only with EXCLUSIVE declined.
 *
 * ================== WHAT THIS MODULE DOES AND DOES NOT CLAIM ==================
 *
 * **It does NOT re-run the season under the treatment.** The population it prices over is the
 * CONTROL arm's plays. That is the point — holding the population fixed is what removes composition
 * from the measurement — and it is also the limit: a per-play exclusive count says how often the
 * change DECIDES anything on the plays the game actually reached. It says nothing about how the
 * season would have unfolded afterwards, and a reader who wants that wants the corpus arm, with all
 * the composition it carries.
 *
 * **The two counts answer different questions and both are reported** (§5.3, and ADR-032's raw count
 * over-stating its subject by 40×):
 *
 *   RAW        — plays on which the subject's population was PRESENT.
 *   EXCLUSIVE  — plays on which the subject DECIDED anything, proved by a per-play stream digest.
 *
 * **One deliberate substitution, declared:** the replayed state carries a constant `nextEventSeq`
 * rather than the game's. That field sets event SEQUENCE NUMBERS and nothing else — no resolver
 * reads it — and both arms replay with the same value, so a digest difference is a difference in
 * the play, never in its numbering. Stated rather than assumed, because a silent substitution in a
 * replay harness is exactly how a measurement of the harness gets published as a measurement of the
 * engine.
 */
import type { CalendarStamp, MatchEventEnvelope } from "@ff/contracts";
import {
  deriveGameId,
  simulatePlay,
  type AnyPlayCalls,
  type DefensiveCallRequest,
  type DefensivePlayCall,
  type GameCoordinates,
  type MatchGameState,
  type OffensiveCallRequest,
  type OffensivePlayCall,
  type PlayCaller,
  type PlayCalls,
  type RunPlayCall,
  type RunPlayCalls,
  type Tunables,
} from "@ff/engine";
import { stableDigest } from "./digest.js";

/**
 * The sequence number every replayed play starts from. Any constant works; it must be the SAME
 * constant in both arms, which is why it is a module constant rather than a parameter.
 */
const REPLAY_EVENT_SEQ = 1;

export class PlayCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayCaptureError";
  }
}

/** One scrimmage play, reduced to everything `simulatePlay` needs to reproduce it exactly. */
export interface CapturedPlay {
  /** Order within the game, 0-based. The join key against the stream. */
  readonly ordinal: number;
  readonly playNumber: number;
  readonly state: MatchGameState;
  readonly calls: AnyPlayCalls;
}

interface Pending {
  readonly request: OffensiveCallRequest;
  readonly offenseCall: OffensivePlayCall | RunPlayCall;
  defenseCall?: DefensivePlayCall;
}

export interface PlayCapture {
  readonly home: PlayCaller;
  readonly away: PlayCaller;
  /**
   * Join the captured calls against the stream that resulted, and return the replayable plays.
   *
   * The join is by ORDER: the loop invokes `callOffense` then `callDefense` exactly once per
   * scrimmage play, and emits exactly one `PLAY_START` per scrimmage play, in the same order. The
   * play NUMBER is read from the stream rather than counted here, because the loop also spends
   * play numbers on kicks and this module must not hold a second model of that.
   */
  finish(events: readonly MatchEventEnvelope[]): readonly CapturedPlay[];
}

/**
 * Wrap a caller pair so every scrimmage play it calls is captured.
 *
 * The wrapper is transparent: it forwards every request to the inner caller with the same `Rng` and
 * returns the inner caller's answer unchanged, so a captured game is byte-identical to an
 * uncaptured one. `harness.test.ts`'s determinism claim survives the wrapping, and
 * `playScope.test.ts` asserts that rather than trusting this paragraph.
 */
export function capturePlays(
  inner: { readonly home: PlayCaller; readonly away: PlayCaller },
  /**
   * `coordinates` derives the game id the play RNG is forked from; `at` is the calendar stamp the
   * game state carries and every emitted envelope is stamped with. Both come from the fixture the
   * batch built, never from a default — a replay under a different stamp is a different stream.
   */
  game: { readonly coordinates: GameCoordinates; readonly at: CalendarStamp },
): PlayCapture {
  const pending: Pending[] = [];
  const { coordinates, at } = game;
  const gameId = deriveGameId(coordinates);

  const wrap = (caller: PlayCaller): PlayCaller => ({
    name: caller.name,
    callOffense(request: OffensiveCallRequest, rng) {
      const call = caller.callOffense(request, rng);
      pending.push({ request, offenseCall: call });
      return call;
    },
    callDefense(request: DefensiveCallRequest, rng) {
      const call = caller.callDefense(request, rng);
      const last = pending[pending.length - 1];
      if (last === undefined) {
        throw new PlayCaptureError(
          "callDefense arrived with no offensive call pending. The capture joins the two by " +
            "ORDER, and that order is the game loop's; if the loop has stopped calling them in " +
            "pairs this module is silently mis-pairing states and calls.",
        );
      }
      if (last.defenseCall !== undefined) {
        throw new PlayCaptureError(
          "two defensive calls for one offensive call. Same failure, opposite direction.",
        );
      }
      last.defenseCall = call;
      return call;
    },
    decideFourthDown(request) {
      return caller.decideFourthDown(request);
    },
    decideCoinToss(request) {
      return caller.decideCoinToss(request);
    },
  });

  return {
    home: wrap(inner.home),
    away: wrap(inner.away),
    finish(events) {
      const numbers = scrimmagePlayNumbers(events, gameId);
      if (numbers.length !== pending.length) {
        throw new PlayCaptureError(
          `captured ${String(pending.length)} play calls and the stream carries ` +
            `${String(numbers.length)} scrimmage PLAY_STARTs. The order join is unsound; refusing ` +
            `to return states paired with the wrong calls.`,
        );
      }
      return pending.map((p, ordinal) => {
        const playNumber = numbers[ordinal] as number;
        const defenseCall = p.defenseCall;
        if (defenseCall === undefined) {
          throw new PlayCaptureError(
            `play ${String(ordinal)} captured an offensive call with no defensive answer.`,
          );
        }
        const offenseSnapshot = p.request.offense;
        const state: MatchGameState = {
          gameId,
          at,
          playNumber,
          nextEventSeq: REPLAY_EVENT_SEQ,
          players: { ...p.request.defense.players, ...offenseSnapshot.players },
          offenseTeam: offenseSnapshot.team,
          defenseTeam: p.request.defense.team,
          quarterback: offenseSnapshot.offense.quarterback,
          down: p.request.situation.down,
          distance: p.request.situation.distance,
          ballOn: p.request.situation.ballOn,
          clockSeconds: p.request.situation.clockSeconds,
          ...(offenseSnapshot.chemistry === undefined
            ? {}
            : { chemistry: offenseSnapshot.chemistry }),
        };
        const calls: AnyPlayCalls =
          p.offenseCall.kind === "RUN"
            ? ({ offense: p.offenseCall, defense: defenseCall } satisfies RunPlayCalls)
            : ({ offense: p.offenseCall as OffensivePlayCall, defense: defenseCall } satisfies PlayCalls);
        return { ordinal, playNumber, state, calls };
      });
    },
  };
}

/**
 * The play numbers of the scrimmage plays, in stream order.
 *
 * `PlayEventLog` addresses a scrimmage play as `<gameId>:play:<n>` and a kick as
 * `<gameId>:<kind>:<n>`, so the discriminator is the literal segment and not a guess about which
 * ordinals are plays. A `PLAY_START` whose id does not parse is a REFUSAL rather than a skip: a
 * silently dropped play would shorten this list and the join above would then reject the whole
 * game, which is the correct direction to fail in.
 */
function scrimmagePlayNumbers(
  events: readonly MatchEventEnvelope[],
  gameId: unknown,
): readonly number[] {
  const prefix = `${String(gameId)}:play:`;
  const out: number[] = [];
  for (const envelope of events) {
    if (envelope.event.type !== "PLAY_START") continue;
    // `playId` lives on the EVENT, never on the envelope (contracts `MatchEventBase`). Reading it
    // off the envelope would silently yield `""` for every play, which the length join above then
    // refuses — loud, but for the wrong reason. Named here because that is the bug this line had.
    const id = String(envelope.event.playId);
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (!Number.isInteger(n)) {
      throw new PlayCaptureError(`PLAY_START carries an unparseable play id: "${id}"`);
    }
    out.push(n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE PRICE
// ---------------------------------------------------------------------------

export interface PlayScopePrice {
  /** Plays replayed. The denominator of everything below. */
  readonly plays: number;
  /**
   * RAW — plays on which the subject's population was present, per the caller's own predicate.
   * `null` when no predicate was supplied, which is honest: this module cannot guess a population.
   */
  readonly raw: number | null;
  /** EXCLUSIVE — plays whose stream MOVED. The number that bounds the change. */
  readonly exclusive: number;
  /**
   * ⚠ **THE STRICTER COUNT, AND THE ONE A READER USUALLY MEANS.** `exclusive` counts plays whose
   * STREAM moved, which includes a change visible only in a published diagnostic — a `RUSH_THREAT`
   * carrying a different `etaTick` on a play that ends identically is a stream difference and not a
   * football difference. This counts plays whose OUTCOME moved, per the extractor supplied.
   *
   * `null` when no extractor was given. The two are reported side by side deliberately: quoting
   * only the wider one over-states the change the way ADR-032's raw count did, and quoting only the
   * narrower one hides a mechanism that is live and merely not yet decisive.
   */
  readonly outcomeMoved: number | null;
  /** Ordinals of the plays that moved, so a reader can go and look at one. */
  readonly movedOrdinals: readonly number[];
  /**
   * The digest of the UNMOVED complement, folded in each arm. They are equal by construction when
   * `exclusive` is correct, and the equality is asserted by the caller — it is the proof that the
   * complement is zero rather than unmeasured.
   */
  readonly complementDigestControl: string;
  readonly complementDigestTreatment: string;
  /** Whole-population digests, so two runs of this function can be compared without re-deriving. */
  readonly digestControl: string;
  readonly digestTreatment: string;
}

export interface PlayScopeOptions {
  /**
   * Whether the subject's population is present on this play, judged from the CONTROL arm's own
   * events. Supplying it turns `raw` from `null` into a number; omitting it is not an error, it is
   * a refusal to invent a population.
   */
  readonly population?: (events: readonly MatchEventEnvelope[]) => boolean;
  /**
   * The play's OUTCOME, reduced to a comparable value — normally the `PLAY_RESULT` payload. Supply
   * it to get `outcomeMoved` beside `exclusive`; omit it and `outcomeMoved` is `null`, which is a
   * refusal rather than a zero.
   */
  readonly outcomeOf?: (events: readonly MatchEventEnvelope[]) => unknown;
}

/**
 * Replay every captured play under both trees and count the ones that move.
 *
 * The comparison is a digest of the play's whole event list, not of a chosen outcome field. A
 * change that alters a check's roll without altering the yardage is still a change to the play, and
 * a comparison on the box score would call it zero — which is `calibration.md` §5.3's *"a count that
 * clears the precondition can still be the wrong count"*, one level down.
 */
export function priceAtPlayScope(
  plays: readonly CapturedPlay[],
  seedOf: (play: CapturedPlay) => string,
  control: Tunables,
  treatment: Tunables,
  options: PlayScopeOptions = {},
): PlayScopePrice {
  const moved: number[] = [];
  let raw = options.population === undefined ? null : 0;
  let outcomeMoved = options.outcomeOf === undefined ? null : 0;
  const controlAll: string[] = [];
  const treatmentAll: string[] = [];
  const controlSame: string[] = [];
  const treatmentSame: string[] = [];

  for (const play of plays) {
    const seed = seedOf(play);
    const a = simulatePlay(play.state, play.calls, seed, control);
    const b = simulatePlay(play.state, play.calls, seed, treatment);
    const da = stableDigest(a.events);
    const db = stableDigest(b.events);
    controlAll.push(da);
    treatmentAll.push(db);
    if (options.population !== undefined && options.population(a.events)) {
      raw = (raw ?? 0) + 1;
    }
    if (da === db) {
      controlSame.push(da);
      treatmentSame.push(db);
    } else {
      moved.push(play.ordinal);
      if (options.outcomeOf !== undefined) {
        const oa = stableDigest(options.outcomeOf(a.events));
        const ob = stableDigest(options.outcomeOf(b.events));
        if (oa !== ob) outcomeMoved = (outcomeMoved ?? 0) + 1;
      }
    }
  }

  return {
    plays: plays.length,
    raw,
    exclusive: moved.length,
    outcomeMoved,
    movedOrdinals: moved,
    complementDigestControl: stableDigest(controlSame),
    complementDigestTreatment: stableDigest(treatmentSame),
    digestControl: stableDigest(controlAll),
    digestTreatment: stableDigest(treatmentAll),
  };
}
