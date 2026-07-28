/**
 * DESIGNED ARCHETYPES — the input to `calibration.md` §5.2 instrument 2.
 *
 * A flat league with holes punched in it: "everybody is 60 except this team's offensive line,
 * which is 90". Because the perturbation is the ONLY difference between two runs, the direction
 * of the outcome delta is a statement about the mechanic and nothing else. That is what makes
 * monotonicity assertable — the ground truth is the design.
 *
 * Provenance is `DESIGNED_ARCHETYPE`, which is deliberately NOT `FLAT_SYNTHETIC` even though
 * the construction shares a builder: a report must never compare a designed ladder against real
 * NFL baselines, and the brand is what stops it.
 */
import type { AttributeMap, Position, RatedLeague, Team, TeamId } from "@ff/contracts";
import { ATTRIBUTE_REGISTRY_V1, ATTR_SCALE } from "@ff/contracts";
import { syntheticTeamIds, uniformAttributes } from "./flat.js";
import { makeProvenancedLeague, type ArchetypeLeague } from "./provenance.js";
import { buildPlayer, buildRosterSlots, depthChartFromSlots } from "./roster.js";

/** One designed deviation from the flat base. */
export interface ArchetypeDesign {
  /** 0-based team index within the league this spec builds. */
  readonly teamIndex: number;
  /** Which positions receive the design. Everything else stays at the base rating. */
  readonly positions: readonly Position[];
  /** Attribute id → value. Every id must be active in the registry. */
  readonly attributes: Readonly<Record<string, number>>;
  /** Restrict to depth-chart index 0 (the starter) only. Default: every player at the position. */
  readonly startersOnly?: boolean;
}

export interface ArchetypeSpec {
  readonly id: string;
  readonly description: string;
  /** Two by default — a micro-scenario is one matchup. */
  readonly teams?: number;
  readonly base?: number;
  readonly designs: readonly ArchetypeDesign[];
}

export function buildArchetypeLeague(spec: ArchetypeSpec): ArchetypeLeague {
  const teamCount = spec.teams ?? 2;
  const base = spec.base ?? 60;
  const baseAttributes = uniformAttributes(base);
  const teamIds = syntheticTeamIds(teamCount);

  for (const design of spec.designs) {
    if (design.teamIndex < 0 || design.teamIndex >= teamCount) {
      throw new RangeError(
        `archetype "${spec.id}": design targets team ${design.teamIndex} of ${teamCount}`,
      );
    }
    if (design.positions.length === 0) {
      throw new Error(`archetype "${spec.id}": a design with no positions changes nothing`);
    }
    for (const [id, value] of Object.entries(design.attributes)) {
      if (ATTRIBUTE_REGISTRY_V1.attributes[id]?.status !== "active") {
        throw new Error(
          `archetype "${spec.id}": "${id}" is not an active registry attribute; a design that ` +
            `sets an attribute nothing reads is a scenario that tests nothing`,
        );
      }
      if (value < ATTR_SCALE.min || value > ATTR_SCALE.max) {
        throw new RangeError(`archetype "${spec.id}": ${id}=${value} is outside 0-99`);
      }
    }
  }

  const teams: Team[] = [];
  const players = [];
  for (const [index, team] of teamIds.entries()) {
    const slots = buildRosterSlots(team);
    for (const slot of slots) {
      let attributes: AttributeMap = { ...baseAttributes };
      for (const design of spec.designs) {
        if (design.teamIndex !== index) continue;
        if (!design.positions.includes(slot.position)) continue;
        if (design.startersOnly === true && slot.depthIndex !== 0) continue;
        attributes = { ...attributes, ...design.attributes };
      }
      players.push(buildPlayer(slot, attributes));
    }
    teams.push({
      id: team,
      displayName: `Team ${String(team).slice(2)}`,
      city: `City ${String(team).slice(2)}`,
      roster: slots.map((s) => s.id),
      staff: [],
      depthChart: depthChartFromSlots(slots),
      capState: { capLimit: 0, committed: 0, deadMoney: 0 },
      staffBudget: { limit: 0, committed: 0 },
    });
  }

  return makeProvenancedLeague(
    "DESIGNED_ARCHETYPE",
    spec.id,
    `${spec.description} (base ${base}; ${spec.designs.length} designed deviation(s))`,
    { teams, players, provenance: null, coverage: null } satisfies RatedLeague,
  );
}

/** Convenience for a ladder: the same design at a series of rating values. */
export function ladder(
  idPrefix: string,
  description: string,
  positions: readonly Position[],
  attributes: readonly string[],
  values: readonly number[],
  options: { readonly teamIndex?: number; readonly base?: number; readonly startersOnly?: boolean } = {},
): readonly { readonly value: number; readonly league: ArchetypeLeague }[] {
  if (values.length < 2) throw new Error(`ladder ${idPrefix}: needs at least two rungs`);
  const teamIndex = options.teamIndex ?? 0;
  return values.map((value) => ({
    value,
    league: buildArchetypeLeague({
      id: `${idPrefix}-${value}`,
      description: `${description} at ${value}`,
      base: options.base ?? 60,
      designs: [
        {
          teamIndex,
          positions,
          attributes: Object.fromEntries(attributes.map((a) => [a, value])),
          ...(options.startersOnly === undefined ? {} : { startersOnly: options.startersOnly }),
        },
      ],
    }),
  }));
}

/** Every team id a league of this size will use, for scenario wiring. */
export function archetypeTeamIds(teamCount = 2): readonly TeamId[] {
  return syntheticTeamIds(teamCount);
}
