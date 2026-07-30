/**
 * ENGINE-SIDE PLAY-SCOPE PRICING. Two tunables trees, the same plays, one count.
 *
 * ============================== WHY THIS EXISTS ==============================
 *
 * `docs/design/calibration.md` §5.3 carries a STANDING RULE (ADR-045 §3a.5):
 *
 *   > **PRICE A PER-PLAY SUBJECT AT PLAY SCOPE FIRST. A CORPUS ARM CANNOT
 *   > DISTINGUISH "NO EFFECT" FROM "EFFECT SWAMPED."**
 *
 * and its closing sentence is the reason this file is written BEFORE the change
 * it prices, not after: *a null produced by the wrong instrument is
 * indistinguishable from a null.* The case that bought the rule moved a cell
 * DOWN and a 12-game corpus arm reported the metric moving UP — it could not
 * recover the SIGN, because composition shifted underneath it.
 *
 * `packages/calibration/src/harness/playScope.ts` exists and is proved event for
 * event against the game's own stream. **It is calibration's.** This is the
 * engine's own, and it is a much smaller thing, because at this scope the engine
 * needs no reconstruction at all: `simulatePassPlay(state, calls, seed, tunables)`
 * is a pure function of its four arguments, so a "paired arm" is just calling it
 * twice with two trees. Nothing propagates between plays because nothing is
 * carried between plays.
 *
 * ========================= WHAT WOULD MAKE THIS GO RED? =========================
 * (`CALIBRATION-BACKLOG.md` entry 55 — recorded ALONGSIDE the instrument, at the
 * time it is built, not after something is found.)
 *
 * **NOTHING. THIS FILE IS A MEASUREMENT, NOT A GATE.** It returns counts; a count
 * cannot be wrong in the way an assertion can. Saying that plainly is the point
 * of the field: the honest answer for a pricing harness is *"it never reddens"*,
 * and anybody reading a number out of it is relying on the harness's OWN tests,
 * not on the harness.
 *
 * So the question is asked of those tests instead, in
 * `test/opennessGainPlayScope.test.ts`, and each has a stated subject:
 *
 *  1. **NULL CONTROL** — treatment tree === control tree. Reddens if `exclusive`
 *     or `streamDiffers` is non-zero. Subject: *the pairing is genuinely paired*
 *     (same seeds, same entering states, same order). This is the arm that
 *     catches a harness that accidentally advances a shared RNG.
 *  2. **POSITIVE CONTROL** — a cell known to be live is perturbed. Reddens if
 *     `exclusive` is zero. Subject: *the differ can see a difference at all.*
 *     Without it, `exclusive: 0` is what a correct null AND a broken comparator
 *     both return, which is exactly the failure ADR-047 §4.4 names.
 *  3. **DIGEST DISCRIMINATION** — the football digest must ignore a pure openness
 *     move and must NOT ignore a play-result move. Reddens if either half fails.
 *     Subject: *the stream/football split is real and not a relabelling.*
 *
 * ⚠ WHAT NONE OF THEM CAN SEE: whether `carriesSubject` names the right
 *   population. That is a reading of the mechanic, and it is stated at each call
 *   site rather than hidden here.
 *
 * ======================== WHAT A COUNT FROM HERE MEANS ========================
 *
 * `raw` bounds where the subject is PRESENT. `exclusive` bounds where it
 * DECIDES. §5.3 requires both, requires naming which one bounds the result, and
 * requires the co-deriving mechanism to be named rather than the percentage.
 * The gap between the two has run 17× (ADR-045), 40× (ADR-032) and 39.8×
 * (ADR-047 §6.2) on this project; quoting `raw` as reach is the mistake §5.3
 * forbids.
 *
 * An exclusive count is a bound on WHERE, never a magnitude of HOW MUCH.
 */
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { simulatePassPlay } from "../../src/sim/passPlay.js";
import type { Tunables } from "../../src/tunables.js";
import type { MatchGameState, PlayCalls } from "../../src/types.js";

/** One play, fully determined: entering state, calls, seed. Nothing else exists. */
export interface PlayCase {
  readonly label: string;
  readonly seed: string;
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
}

export interface PlayScopeOptions {
  readonly control: Tunables;
  readonly treatment: Tunables;
  readonly cases: readonly PlayCase[];
  /**
   * Is the subject PRESENT on this play? Answered from a stream, per arm, so a
   * play that carries it in only one arm still counts as raw — the same
   * convention ADR-045 §3a.2 used ("subject present, either arm").
   */
  readonly carriesSubject: (events: readonly MatchEventEnvelope[]) => boolean;
}

export interface PlayScopeCounts {
  readonly plays: number;
  /** Subject present in either arm. Bounds PRESENCE, never reach. */
  readonly raw: number;
  /** Full stream digests differ — includes plays where only a published number moved. */
  readonly streamDiffers: number;
  /** Digest-identical in both arms. NOT a sample: the statement that reach is zero there. */
  readonly streamIdentical: number;
  /**
   * Football-scope difference: decisions, throw type, catch outcome, play result.
   * Openness numbers stripped. **This is the count that bounds reach.**
   */
  readonly exclusive: number;
  /**
   * ISOLATION CHECK. Plays whose stream differs while NEITHER arm carries the
   * subject. A non-zero value means the two arms differ for a reason that is not
   * the subject, and every other number here is then uninterpretable.
   */
  readonly differsWithoutSubject: number;
  /** The SHAPE of the exclusive set: decision-sequence transitions, by frequency. */
  readonly exclusiveShapes: readonly (readonly [string, number])[];
  /** Every exclusive play's label, so a run is re-derivable rather than merely quoted. */
  readonly exclusiveLabels: readonly string[];
}

/**
 * Serialise one event. Key order is the engine's own construction order and is
 * identical in both arms because the same code builds both — this is a
 * comparator, not a canonical form, and it is only ever compared against itself.
 */
function eventLine(e: MatchEventEnvelope): string {
  return `${e.event.type}|${JSON.stringify(e.event.payload)}`;
}

export function streamDigest(events: readonly MatchEventEnvelope[]): string {
  return events.map(eventLine).join("\n");
}

/**
 * THE FOOTBALL DIGEST — what happened, with the openness numbers taken out.
 *
 * The subject publishes its answer on `ROUTE_STATUS.openness`, on `QB_READ`'s
 * three openness fields and on `CATCH_RESOLUTION.openness` (ADR-042), so a play
 * where those numbers move and the quarterback throws the same ball for the same
 * yards is a STREAM difference and not a FOOTBALL one. Quoting the stream count
 * as "plays the change decided" would be a raw count wearing an exclusive
 * count's name — ADR-047 §6.2's finding, one level finer than the mistake §5.3
 * already forbids.
 *
 * The kept set is ADR-045 §3a.2's, named rather than counted: **decisions, throw
 * type, catch outcome, play result.** It is a PER-TYPE FIELD PROJECTION and not
 * a type filter, because three of the kept payloads carry the subject's own
 * number or a roll label beside the outcome.
 *
 * Deliberately EXCLUDED, and why:
 *   - `ROUTE_STATUS` / `QB_READ` — the subject's own publication surface.
 *   - `TICK` / `POCKET_STATUS` / `RUSH_THREAT` — timing and pressure state. They
 *     move when the ball comes out later, which is a CONSEQUENCE the decision
 *     sequence already records; counting both would double-count one play.
 *   - `CHECK` and every `rollRef` — a roll, not an outcome. The same outcome
 *     reached down a different RNG path is a stream difference.
 */
const FOOTBALL_FIELDS: Readonly<Record<string, readonly string[]>> = {
  QB_DECISION: ["choice", "target", "tier"],
  THROW: ["target", "throwType", "accuracyTier"],
  // `openness` (ADR-042) is the subject's number; `catchType` and `caught` are the football.
  CATCH_RESOLUTION: ["receiver", "catchType", "caught"],
  // `eligible` / `attempts` carry roll labels; who tipped it and who got it is the football.
  TIPPED_BALL: ["deflector", "recoveredBy"],
  YAC_ZONE: ["carrier", "zone", "yardsInZone"],
  RUN_RESOLUTION: ["carrier", "carryType", "gap", "yardsBeforeContact", "yards"],
  RUSH_ZONE: ["carrier", "zone", "yardsInZone"],
  PENALTY: ["kind", "player", "accepted", "yards"],
  PLAY_RESULT: ["yards", "turnover", "score", "clockRunoff"],
};

export function footballDigest(events: readonly MatchEventEnvelope[]): string {
  const out: string[] = [];
  for (const e of events) {
    const fields = FOOTBALL_FIELDS[e.event.type];
    if (fields === undefined) continue;
    const payload = e.event.payload as Record<string, unknown>;
    const projected = fields.map((f) => `${f}=${JSON.stringify(payload[f] ?? null)}`).join(",");
    out.push(`${e.event.type}|${projected}`);
  }
  return out.join("\n");
}

/** The decision sequence, which is the shape every exclusive difference has taken so far. */
export function decisionSequence(events: readonly MatchEventEnvelope[]): string {
  return events
    .filter((e) => e.event.type === "QB_DECISION")
    .map((e) => String((e.event.payload as { choice?: unknown }).choice))
    .join(">");
}

/**
 * A route has BROKEN and the play went on. This is the openness-gain term's
 * population: the gain applies to receiver `r` at every tick after his break, so
 * a play on which nobody's route breaks before the play ends cannot be touched
 * by any change to the gain, whatever its shape.
 */
export function carriesBrokenRoute(events: readonly MatchEventEnvelope[]): boolean {
  const brokenAt: number[] = [];
  let lastTick = Number.NEGATIVE_INFINITY;
  for (const e of events) {
    if (e.event.type === "TICK") {
      lastTick = Math.max(lastTick, (e.event.payload as { tick: number }).tick);
      continue;
    }
    if (e.event.type !== "ROUTE_STATUS") continue;
    const phase = (e.event.payload as { phase: string }).phase;
    if (phase === "OPEN" || phase === "DECAYING" || phase === "SETTLED") {
      brokenAt.push((e.event as { tick?: number }).tick ?? lastTick);
    }
  }
  return brokenAt.some((t) => t < lastTick);
}

/**
 * A §9.3 / §9.4 coverage rep resolved. This is a DIFFERENT population from
 * `carriesBrokenRoute` and the difference is the whole reason `carriesSubject`
 * is a parameter: the band tables' `openness` column acts the instant the rep
 * resolves, while §8.7's GAIN acts only on the ticks after it. A play whose ball
 * comes out at the break carries the first subject and not the second.
 */
export function carriesCoverageRep(events: readonly MatchEventEnvelope[]): boolean {
  return events.some(
    (e) =>
      e.event.type === "CHECK" &&
      ["man_coverage", "zone_coverage"].includes(
        String((e.event.payload as { checkKind: string }).checkKind),
      ),
  );
}

/** Receivers whose route broke, for a call site that needs the population by player. */
export function brokenReceivers(events: readonly MatchEventEnvelope[]): readonly PlayerId[] {
  const out: PlayerId[] = [];
  for (const e of events) {
    if (e.event.type !== "ROUTE_STATUS") continue;
    const p = e.event.payload as { receiver: PlayerId; phase: string };
    if (p.phase === "OPEN" || p.phase === "DECAYING" || p.phase === "SETTLED") {
      if (!out.includes(p.receiver)) out.push(p.receiver);
    }
  }
  return out;
}

export function pricePlayScope(options: PlayScopeOptions): PlayScopeCounts {
  const { control, treatment, cases, carriesSubject } = options;
  let raw = 0;
  let streamDiffers = 0;
  let exclusive = 0;
  let differsWithoutSubject = 0;
  const shapes = new Map<string, number>();
  const exclusiveLabels: string[] = [];

  for (const c of cases) {
    const a = simulatePassPlay(c.state, c.calls, c.seed, control).events;
    const b = simulatePassPlay(c.state, c.calls, c.seed, treatment).events;

    const present = carriesSubject(a) || carriesSubject(b);
    if (present) raw += 1;

    const streamDiff = streamDigest(a) !== streamDigest(b);
    if (streamDiff) {
      streamDiffers += 1;
      if (!present) differsWithoutSubject += 1;
    }

    if (footballDigest(a) !== footballDigest(b)) {
      exclusive += 1;
      exclusiveLabels.push(c.label);
      const shape = `${decisionSequence(a)} ⇒ ${decisionSequence(b)}`;
      shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
    }
  }

  return {
    plays: cases.length,
    raw,
    streamDiffers,
    streamIdentical: cases.length - streamDiffers,
    exclusive,
    differsWithoutSubject,
    exclusiveShapes: [...shapes.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])),
    exclusiveLabels,
  };
}

/** A one-line report in the shape §5.3 asks for: both counts, and which one bounds. */
export function formatCounts(counts: PlayScopeCounts): string {
  const pct = (n: number): string => `${((n / counts.plays) * 100).toFixed(3)}%`;
  return [
    `plays ${String(counts.plays)}`,
    `RAW (subject present) ${String(counts.raw)} (${pct(counts.raw)})`,
    `stream differs ${String(counts.streamDiffers)} (${pct(counts.streamDiffers)})`,
    `stream identical ${String(counts.streamIdentical)}`,
    `EXCLUSIVE (football) ${String(counts.exclusive)} (${pct(counts.exclusive)}) — this is the bound`,
    `isolation: differs without subject ${String(counts.differsWithoutSubject)} (must be 0)`,
  ].join("\n");
}
