/**
 * ADR-006 — the engine rejects INTERNAL INCOHERENCE ONLY.
 *
 * The line this module sits on is exact, and it is worth restating because it is
 * easy to drift across: **"eleven men" is arithmetic; "Trips Right implies 11
 * personnel" is football.** Everything here is a statement a pure function can
 * make about its own arguments — a name that resolves to nobody, an ordering
 * that references something that does not exist, the same player doing two jobs,
 * more men than a football team has. None of it requires knowing what a
 * formation is, which receiver is eligible, or whether a concept makes sense.
 *
 * Franchise (Spec #5) owns play-card VALIDITY and checks it at authoring time.
 * `formation` stays free text the engine never interprets. If a card is
 * unrealistic, that is franchise's to catch; if a card is unRESOLVABLE, the
 * engine says so loudly here rather than silently approximating — which is the
 * whole point, because a silent approximation produces clean statistics about a
 * game nobody played (CALIBRATION-BACKLOG 3a).
 */
import type { PlayerId } from "@ff/contracts";
import type { MatchGameState, PlayCalls } from "../types.js";

/** Football's own arithmetic, and the only football fact in this file. */
const PLAYERS_ON_THE_FIELD = 11;

export class IncoherentPlayCallError extends Error {
  constructor(message: string) {
    super(`@ff/engine: incoherent play call — ${message}`);
    this.name = "IncoherentPlayCallError";
  }
}

function fail(message: string): never {
  throw new IncoherentPlayCallError(message);
}

function known(state: MatchGameState, id: PlayerId): boolean {
  return state.players[id as unknown as string] !== undefined;
}

/**
 * Throws `IncoherentPlayCallError` on the four rejections ADR-006 names. Called
 * once per play, before anything is rolled, so a bad card costs a snap and not a
 * corrupted stream.
 */
export function assertCoherentPlayCall(state: MatchGameState, calls: PlayCalls): void {
  const { offense, defense } = calls;

  // 1. Every name has to resolve to somebody who is actually here.
  const named: { readonly role: string; readonly id: PlayerId }[] = [
    { role: "quarterback", id: state.quarterback },
    ...offense.routes.map((r) => ({ role: `route "${r.routeName}" receiver`, id: r.receiver })),
    ...offense.protection.flatMap((p) => [
      { role: "blocker", id: p.blocker },
      { role: "protection's named rusher", id: p.rusher },
    ]),
    ...offense.readOrder.map((id) => ({ role: "readOrder entry", id })),
    ...defense.assignments.map((a) => ({ role: "coverage defender", id: a.defender })),
    ...defense.assignments.flatMap((a) => (a.kind === "MAN" ? [{ role: "covered receiver", id: a.covers }] : [])),
    ...defense.rush.map((r) => ({ role: "rusher", id: r.rusher })),
  ];
  for (const { role, id } of named) {
    if (!known(state, id)) fail(`${role} ${String(id)} is not in state.players`);
  }

  // 2. A progression cannot name somebody with nothing to run.
  const routeRunners = new Set(offense.routes.map((r) => String(r.receiver)));
  for (const id of offense.readOrder) {
    if (!routeRunners.has(String(id))) {
      fail(`readOrder names ${String(id)}, who has no route`);
    }
  }

  // 3. Nobody does two jobs.
  assertNoDuplicates(offense.routes.map((r) => String(r.receiver)), (id) =>
    `${id} is assigned two routes`,
  );
  assertNoDuplicates(offense.protection.map((p) => String(p.blocker)), (id) =>
    `${id} is assigned two blocking assignments`,
  );
  assertNoDuplicates(defense.rush.map((r) => String(r.rusher)), (id) =>
    `${id} rushes twice`,
  );
  assertNoDuplicates(defense.assignments.map((a) => String(a.defender)), (id) =>
    `${id} has two coverage assignments`,
  );
  for (const p of offense.protection) {
    if (routeRunners.has(String(p.blocker))) {
      fail(`${String(p.blocker)} is both blocking and running a route`);
    }
  }
  // Note what is NOT rejected: two defenders on one receiver is a bracket, and
  // a receiver nobody is assigned to is a hole in the zone. Both are football
  // decisions and neither makes the card unresolvable.

  // 4. Arithmetic. The quarterback is on the field too.
  const offensePlayers = new Set<string>([
    String(state.quarterback),
    ...routeRunners,
    ...offense.protection.map((p) => String(p.blocker)),
  ]);
  if (offensePlayers.size > PLAYERS_ON_THE_FIELD) {
    fail(
      `${offensePlayers.size} offensive players on the field ` +
        `(quarterback + ${routeRunners.size} route-runners + ${offense.protection.length} blockers); ` +
        `the limit is ${PLAYERS_ON_THE_FIELD}`,
    );
  }
  const defensePlayers = new Set<string>([
    ...defense.assignments.map((a) => String(a.defender)),
    ...defense.rush.map((r) => String(r.rusher)),
  ]);
  if (defensePlayers.size > PLAYERS_ON_THE_FIELD) {
    fail(
      `${defensePlayers.size} defensive players on the field ` +
        `(${defense.assignments.length} in coverage + ${defense.rush.length} rushing); ` +
        `the limit is ${PLAYERS_ON_THE_FIELD}`,
    );
  }
  for (const rusher of defense.rush) {
    if (defense.assignments.some((a) => a.defender === rusher.rusher)) {
      fail(`${String(rusher.rusher)} is both rushing and in coverage`);
    }
  }
}

function assertNoDuplicates(ids: readonly string[], message: (id: string) => string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(message(id));
    seen.add(id);
  }
}
