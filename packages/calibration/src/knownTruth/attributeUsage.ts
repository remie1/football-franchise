/**
 * WHICH ATTRIBUTES A SCENARIO'S MECHANIC ACTUALLY READS — DERIVED, NEVER WRITTEN DOWN.
 *
 * ============================ THE FAILURE THIS EXISTS FOR ============================
 *
 * `ol-passblock-sack-rate`'s `hypothesis` string claimed, in three successive versions, three
 * different wrong things about the attributes it ladders:
 *
 *   - v1 said the ladder moved FOUR attributes. It moved two: `anchor` and `sustain` were both
 *     inert in §7.1 and the ladder set them anyway.
 *   - v2 (backlog entry 30) corrected that to two — and named `anchor` as dead, which ADR-028
 *     then made live.
 *   - v3 would have said three. It would have been right for about a week.
 *
 * Every one of those was true when written and false when read, and each time the cause was the
 * same: **the code moved and the prose sat still.** That is precisely the asymmetry §22a's
 * `recordedSteps`/`recordedStepSE` removed for the NUMBERS — a claim beside a machine-checked
 * figure, itself checked by nobody.
 *
 * So the claim stops being prose. `CHECK.testsAttrs` and `QB_READ.testsAttrs` are the engine's own
 * published statement of which attribute ids a resolution consulted (Spec #1's perception-exposure
 * channel, and Iron Rule 3's "the event stream is the single source of truth"). This module folds
 * them out of a scenario's OWN games, so the answer is always the current engine's answer, and
 * `KnownTruthScenario.mechanismCheckKinds` turns it into an assertion: every attribute a ladder
 * SETS must be read by the mechanic the ladder MEASURES.
 *
 * ============================ WHY THE STREAM AND NOT THE SOURCE ============================
 *
 * The alternative was to read the engine's term lists directly. Two reasons not to:
 *
 *  1. **They are not all readable.** §7.1's blocker terms are literals in `resolve/passRush.ts`
 *     (`ATTR.passBlock`, `ATTR.footwork`, `ATTR.anchor`); the run-block and ball-carrier term
 *     lists live in `TUNABLES` as `{ attr: "sustain", divisor: 5 }` strings. Backlog entry 31 is
 *     the standing record that no static tool sees both. `testsAttrs` is assembled from BOTH
 *     shapes by the engine itself and published in one vocabulary.
 *  2. **A term list is not a usage.** `throwExecution` tests `armStrength` only on an arm
 *     shortfall and `qbRead` tests `touch` only in a tight window. Whether the scenario's games
 *     ever REACH those branches is the question a ladder actually depends on, and only running it
 *     answers that. A conditional term that never fires is exactly as inert as a missing one.
 *
 * The cost is that this is a SAMPLED fact: an attribute read on one play in a thousand needs
 * enough games to appear. `usageProbeGames` is set for that and the shortfall is reported rather
 * than assumed away — a rarely-read attribute that shows up only at high game counts is itself a
 * §5.3 sensitivity finding, not an inconvenience.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { syntheticTeamIds } from "../league/flat.js";
import { indexLeague } from "../league/snapshot.js";
import { buildFixture, buildFixtures } from "../harness/schedule.js";
import { runOneGame } from "../harness/runGame.js";
import { generateSeeds } from "../harness/seeds.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { canonicalBatchSeed, ladderLeagueFor } from "./assertions.js";
import type { KnownTruthScenario } from "./scenarios.js";

/**
 * `QB_READ` carries `testsAttrs` and is not a `CHECK` — ADR-004, because a perception roll is not
 * a contested check. It is still a place an attribute is read, so it is folded under this label
 * rather than dropped, and the label is deliberately shouty so nobody mistakes it for a
 * `CheckKind`.
 */
export const QB_READ_PSEUDO_KIND = "QB_READ(perception)";

export interface AttributeUsage {
  /** Attribute id → every check kind observed reading it. Sorted, so reports are stable. */
  readonly readBy: ReadonlyMap<string, readonly string[]>;
  readonly games: number;
  readonly checksObserved: number;
  /** How many players the design was applied to — the population the fold is restricted to. */
  readonly designedPlayers: number;
}

/**
 * The players a scenario's design lands on: the designed team's roster at the designed positions.
 * `buildArchetypeLeague` applies a design to EVERY depth-chart slot at those positions unless
 * `startersOnly`, and no scenario sets it, so this must not restrict to starters either.
 */
export function designedPlayerIds(
  scenario: KnownTruthScenario,
  index: ReturnType<typeof indexLeague>,
): ReadonlySet<string> {
  const teamId = index.teamIds()[scenario.designedTeam];
  if (teamId === undefined) throw new Error(`no team ${scenario.designedTeam} in the league`);
  const team = index.teams.get(String(teamId));
  if (team === undefined) throw new Error(`team ${String(teamId)} is not indexed`);
  const positions = new Set<string>(scenario.positions);
  const ids = new Set<string>();
  for (const playerId of team.roster) {
    const player = index.players.get(String(playerId));
    if (player === undefined) continue;
    if (positions.has(player.bio.position)) ids.add(String(playerId));
  }
  return ids;
}

/**
 * ONLY ROLLS A DESIGNED PLAYER TOOK PART IN COUNT, and this filter is the difference between a
 * useful answer and a wrong one.
 *
 * Measured without it: `db-coverage-net-yards-per-dropback` appeared to have `playRecognition`
 * read by `second_level_climb`. It does — on the LINEBACKER, who is at the league's base rating
 * and is not one of the CB/FS/SS the scenario ladders. The scenario's own `playRecognition` was
 * read by nothing at all, and the unfiltered fold said the opposite.
 *
 * `actors` is per-CHECK and `testsAttrs` is per-CHECK, so this cannot attribute an attribute to a
 * specific SIDE of an opposed roll — a `pass_rush_tick` involving a designed blocker credits
 * `passRush` too. That over-credit is harmless for the question asked, because the question is
 * only ever asked about attributes the scenario SETS, and it sets them on the designed players.
 */
function participates(actors: readonly string[], designed: ReadonlySet<string>): boolean {
  for (const actor of actors) if (designed.has(actor)) return true;
  return false;
}

export function foldAttributeUsage(
  into: Map<string, Set<string>>,
  events: readonly MatchEventEnvelope[],
  designed: ReadonlySet<string>,
): number {
  let observed = 0;
  const record = (attrs: readonly string[], kind: string): void => {
    observed += 1;
    for (const attr of attrs) {
      let kinds = into.get(attr);
      if (kinds === undefined) {
        kinds = new Set<string>();
        into.set(attr, kinds);
      }
      kinds.add(kind);
    }
  };
  for (const envelope of events) {
    const event = envelope.event;
    if (event.type === "CHECK") {
      if (!participates(event.payload.actors.map(String), designed)) continue;
      record(event.payload.testsAttrs, event.payload.checkKind);
    } else if (event.type === "QB_READ") {
      /**
       * NOT FILTERED BY ACTOR, AND THE REASON IS A GAP IN THE STREAM.
       *
       * `QB_READ.testsAttrs` are the QUARTERBACK's (`awareness`, and on a tight window
       * `accuracy`/`armStrength`/`touch`) while its only named player is `target`, the RECEIVER.
       * So the event states which attributes it consulted and not whose — the exact mirror of
       * `CALIBRATION-BACKLOG.md` entry 29's finding that the `anticipation` CHECK carries
       * `actors: [qb]` and names no receiver.
       *
       * Unfiltered can only OVER-credit, never under-credit, so an INERT verdict is never caused
       * by this: it says "somebody's `touch` was read here", which is enough to establish that
       * `touch` is not read by the `accuracy` check. If a scenario ever ladders a QB attribute
       * where WHICH quarterback matters, this needs a contract petition, not a workaround.
       */
      record(event.payload.testsAttrs, QB_READ_PSEUDO_KIND);
    }
  }
  return observed;
}

/**
 * Run a scenario's own league, at its TOP rung, and fold what the engine says it read.
 *
 * The top rung, deliberately: an attribute whose effect is gated behind a threshold is likeliest
 * to be exercised where the design is strongest, so a "not read" verdict from here is the
 * strongest available. It uses the scenario's canonical seeds, so this probe is as deterministic
 * as the gate beside it.
 */
export function deriveAttributeUsage(
  scenario: KnownTruthScenario,
  games: number,
): AttributeUsage {
  const teams = syntheticTeamIds(2);
  const home = teams[0];
  const away = teams[1];
  if (home === undefined || away === undefined) throw new Error("two teams required");

  const top = scenario.rungs[scenario.rungs.length - 1];
  if (top === undefined) throw new Error(`scenario "${scenario.id}" has no rungs`);

  const index = indexLeague(ladderLeagueFor(scenario, top));
  const designed = designedPlayerIds(scenario, index);
  const fixtures = buildFixtures(index, {
    kind: "SYNTHETIC_PAIR",
    home,
    away,
    games,
    season: 2024,
  });
  const seeds = generateSeeds(canonicalBatchSeed(scenario), games);

  const into = new Map<string, Set<string>>();
  let checksObserved = 0;
  for (const [i, fixture] of fixtures.entries()) {
    const seed = seeds.seeds[i];
    if (seed === undefined) continue;
    const output = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
    });
    checksObserved += foldAttributeUsage(into, output.observation.events, designed);
  }

  const readBy = new Map<string, readonly string[]>();
  for (const [attr, kinds] of into) readBy.set(attr, [...kinds].sort());
  return { readBy, games, checksObserved, designedPlayers: designed.size };
}

export interface MechanismVerdict {
  readonly attribute: string;
  /** Every check kind seen reading it, anywhere in the scenario's games. */
  readonly readBy: readonly string[];
  /** The subset of `readBy` that is the scenario's declared mechanism. */
  readonly readByMechanism: readonly string[];
  readonly inert: boolean;
}

/**
 * The judgement the gate asserts: for each attribute the ladder SETS, was it read by the mechanic
 * the ladder MEASURES?
 *
 * `inert` means "set by this scenario and read by none of its mechanism's check kinds". It does
 * NOT mean dead: `sustain` is read by `second_level_climb` and is inert HERE, which is a different
 * and much more useful statement than "unused".
 */
export function mechanismVerdicts(
  scenario: KnownTruthScenario,
  usage: AttributeUsage,
): readonly MechanismVerdict[] {
  const mechanism = new Set<string>(scenario.mechanismCheckKinds);
  return scenario.attributes.map((attribute) => {
    const readBy = usage.readBy.get(attribute) ?? [];
    const readByMechanism = readBy.filter((kind) => mechanism.has(kind));
    return { attribute, readBy, readByMechanism, inert: readByMechanism.length === 0 };
  });
}

/** The derived attribute claim, as report lines. Printed by every ladder report. */
export function renderAttributeUsage(
  scenario: KnownTruthScenario,
  usage: AttributeUsage,
): readonly string[] {
  const verdicts = mechanismVerdicts(scenario, usage);
  const lines = [
    `  attributes READ (derived from CHECK/QB_READ \`testsAttrs\` over ${usage.games} games of ` +
      `this scenario's own league at rung ${scenario.rungs[scenario.rungs.length - 1]}, ` +
      `${usage.checksObserved} rolls involving one of its ${usage.designedPlayers} designed ` +
      `players) — never written down, see attributeUsage.ts:`,
    `    mechanism: ${scenario.mechanismCheckKinds.join(", ")}`,
  ];
  for (const v of verdicts) {
    lines.push(
      `    ${v.attribute.padEnd(16)} ${
        v.inert
          ? `INERT IN THIS MECHANISM — read by ${v.readBy.length === 0 ? "no check at all" : v.readBy.join(", ")}`
          : `read by ${v.readByMechanism.join(", ")}${
              v.readBy.length > v.readByMechanism.length
                ? ` (also ${v.readBy.filter((k) => !v.readByMechanism.includes(k)).join(", ")})`
                : ""
            }`
      }`,
    );
  }
  return lines;
}
