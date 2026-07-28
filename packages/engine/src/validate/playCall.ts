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
import { availableBlockersOf, protectionSchemeOf, stuntsOf } from "../interim/adr022.js";
import type { AnyPlayCalls, MatchGameState, PlayCalls, RunPlayCalls } from "../types.js";

/** Football's own arithmetic, and the only football fact in this file. */
const PLAYERS_ON_THE_FIELD = 11;

export class IncoherentPlayCallError extends Error {
  constructor(message: string) {
    super(`@ff/engine: incoherent play call — ${message}`);
    this.name = "IncoherentPlayCallError";
  }
}

/**
 * A DIFFERENT rejection, and the distinction is the whole reason this class
 * exists (R4). `IncoherentPlayCallError` means the card contradicts itself:
 * twelve men, a progression naming somebody with no route, a carrier blocking
 * for himself. No engine will ever resolve those, and the caller's answer is to
 * fix the card.
 *
 * This one means the card is perfectly coherent football that THIS ENGINE cannot
 * simulate yet.
 *
 * ================== IT HAS NO LIVE INSTANCE AS OF §7.4 ==================
 * The instance was **a rusher with no `ProtectionAssignment`** — an unblocked
 * blitzer, which is real, legal and resolvable football that the engine simply
 * had no mechanic for. §7.4 blitz pickup landed and the engine now answers the
 * question instead of refusing it: he is picked up by whoever stayed in, the
 * slide takes him, or he is a FREE RUNNER with a time of arrival.
 *
 * FOR FRANCHISE (Spec #5), which authors play cards: the constraint this class
 * used to impose — *every rusher must be named by some protection entry* — is
 * **withdrawn**. A card may leave a rusher free; that is what a blitz IS, and it
 * is what a card needs to be able to say for `CALIBRATION-BACKLOG.md` entry 21
 * (perfectly-informed protection) to close.
 *
 * THE CLASS STAYS, and deliberately. It is exported, callers catch it to tell
 * "bad card" from "not yet", and the next scope limit — §9.5 option routes,
 * §15's special situations, a screen — should reuse it rather than reinvent the
 * distinction. A rejection vocabulary with no current member is not dead code;
 * it is a vocabulary that has been fully honoured.
 * =======================================================================
 */
export class UnsupportedPlayCallError extends Error {
  constructor(message: string) {
    super(`@ff/engine: play call is out of scope — ${message}`);
    this.name = "UnsupportedPlayCallError";
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
  // ⚠ ADR-022 INTERIM vocabulary. Read through the one module that names these
  // fields; validated here for exactly the same reasons the ratified fields are.
  const scheme = protectionSchemeOf(offense);
  const availableBlockers = availableBlockersOf(offense);
  const stunts = stuntsOf(defense);

  // 1. Every name has to resolve to somebody who is actually here.
  const named: { readonly role: string; readonly id: PlayerId }[] = [
    { role: "quarterback", id: state.quarterback },
    ...offense.routes.map((r) => ({ role: `route "${r.routeName}" receiver`, id: r.receiver })),
    ...offense.protection.flatMap((p) => [
      { role: "blocker", id: p.blocker },
      { role: "protection's named rusher", id: p.rusher },
    ]),
    ...offense.readOrder.map((id) => ({ role: "readOrder entry", id })),
    ...availableBlockers.map((id) => ({ role: "available blocker", id })),
    ...(scheme?.center === undefined ? [] : [{ role: "protection's centre", id: scheme.center }]),
    ...defense.assignments.map((a) => ({ role: "coverage defender", id: a.defender })),
    ...defense.assignments.flatMap((a) => (a.kind === "MAN" ? [{ role: "covered receiver", id: a.covers }] : [])),
    ...defense.rush.map((r) => ({ role: "rusher", id: r.rusher })),
    ...stunts.flatMap((s) => [
      { role: "stunt penetrator", id: s.penetrator },
      { role: "stunt looper", id: s.looper },
    ]),
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
  //
  // ALSO NOT REJECTED, AS OF §7.4: a rusher no protection names. That is a free
  // runner, and it is now the mechanic rather than the refusal.

  // 3b. ⚠ ADR-022 INTERIM — the same "nobody does two jobs" rule, applied to the
  //     petitioned fields. The available-blocker rule is the load-bearing one:
  //     a man who is running a route cannot materialise as a blocker the moment
  //     a blitz shows, because that is exactly the perfectly-informed protection
  //     §7.4 exists to remove (CALIBRATION-BACKLOG 21). Keeping a man in is a
  //     PRE-SNAP decision and the card has to have made it.
  assertNoDuplicates(availableBlockers.map(String), (id) => `${id} is listed twice as an available blocker`);
  const preAssigned = new Set(offense.protection.map((p) => String(p.blocker)));
  for (const id of availableBlockers) {
    if (routeRunners.has(String(id))) {
      fail(`${String(id)} is both available in protection and running a route`);
    }
    if (preAssigned.has(String(id))) {
      fail(`${String(id)} is both assigned a blocking assignment and listed as available`);
    }
  }
  const rushers = new Set(defense.rush.map((r) => String(r.rusher)));
  for (const stunt of stunts) {
    if (String(stunt.penetrator) === String(stunt.looper)) {
      fail(`${String(stunt.looper)} stunts with himself`);
    }
    if (!rushers.has(String(stunt.penetrator))) {
      fail(`stunt penetrator ${String(stunt.penetrator)} is not rushing`);
    }
    if (!rushers.has(String(stunt.looper))) {
      fail(`stunt looper ${String(stunt.looper)} is not rushing`);
    }
  }
  assertNoDuplicates(
    stunts.flatMap((s) => [String(s.penetrator), String(s.looper)]),
    (id) => `${id} is in two stunts`,
  );
  if (scheme?.kind === "SLIDE" && scheme.slideSide === undefined) {
    fail("a SLIDE protection does not say which way it slides");
  }

  // 4. Arithmetic. The quarterback is on the field too.
  const offensePlayers = new Set<string>([
    String(state.quarterback),
    ...routeRunners,
    ...offense.protection.map((p) => String(p.blocker)),
    ...availableBlockers.map(String),
  ]);
  if (offensePlayers.size > PLAYERS_ON_THE_FIELD) {
    fail(
      `${offensePlayers.size} offensive players on the field ` +
        `(quarterback + ${routeRunners.size} route-runners + ${offense.protection.length} blockers` +
        ` + ${availableBlockers.length} available in protection); ` +
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

/**
 * The same four ADR-006 rejections, stated for a designed run. Nothing here is
 * football either: a blocker who is not on the field, a gap assigned twice, the
 * ball carrier blocking for himself, twelve men. The scheme, the gap and whether
 * the concept makes sense against this front are franchise's, exactly as
 * `formation` is.
 */
export function assertCoherentRunCall(state: MatchGameState, calls: RunPlayCalls): void {
  const { offense, defense } = calls;

  // 1. Every name has to resolve to somebody who is actually here.
  const named: { readonly role: string; readonly id: PlayerId }[] = [
    { role: "ball carrier", id: offense.carrier },
    ...offense.blocking.flatMap((b) => [
      { role: `${b.side} ${b.gap}-gap blocker`, id: b.blocker },
      { role: `${b.side} ${b.gap}-gap defender`, id: b.defender },
      ...(b.doubleTeamWith === undefined
        ? []
        : [{ role: `${b.side} ${b.gap}-gap double-team partner`, id: b.doubleTeamWith }]),
    ]),
    ...(offense.perimeter ?? []).flatMap((p) => [
      { role: "perimeter blocker", id: p.blocker },
      { role: "perimeter block target", id: p.defender },
    ]),
    ...defense.assignments.map((a) => ({ role: "coverage defender", id: a.defender })),
    ...defense.assignments.flatMap((a) =>
      a.kind === "MAN" ? [{ role: "covered receiver", id: a.covers }] : [],
    ),
    ...defense.rush.map((r) => ({ role: "front defender", id: r.rusher })),
  ];
  for (const { role, id } of named) {
    if (!known(state, id)) fail(`${role} ${String(id)} is not in state.players`);
  }

  // 2. An ORPHANED REFERENCE, and that is the class it belongs to (R5): this is
  //    the run's analogue of "readOrder names a player who has no route".
  //    `designedGap`/`designedSide` point at a gap, and §14.3 resolves the carry
  //    from the ENGAGEMENT MARGIN in the gap the ball goes through — so a
  //    designed gap with no `RunBlockAssignment` names a battle that was never
  //    fought, and `selectGap` would silently fall through to some other gap.
  //    It is rejected for the same reason as the readOrder case: the reference
  //    does not resolve, not that the football is wrong.
  //
  //    ⚠ REVISIT WHEN FRANCHISE AUTHORS OPTION PLAYS. A zone-read keep leaves
  //    the end deliberately UNBLOCKED — that is the read — so an option card
  //    would name a designed gap whose defender has no blocker on purpose, and
  //    this check would reject legal football. The fix then is a way to state
  //    "unblocked by design" on the assignment, not the deletion of this check.
  const designed = `${offense.designedSide}-${offense.designedGap}`;
  if (!offense.blocking.some((b) => `${b.side}-${b.gap}` === designed)) {
    fail(`the designed gap ${designed} has no blocking assignment`);
  }

  // 3. Nobody does two jobs.
  assertNoDuplicates(offense.blocking.map((b) => `${b.side}-${b.gap}`), (gap) =>
    `gap ${gap} is assigned twice`,
  );
  const blockers = offense.blocking.flatMap((b) =>
    b.doubleTeamWith === undefined ? [String(b.blocker)] : [String(b.blocker), String(b.doubleTeamWith)],
  );
  assertNoDuplicates(blockers, (id) => `${id} is assigned two blocks at the line`);
  assertNoDuplicates(offense.blocking.map((b) => String(b.defender)), (id) =>
    `${id} is engaged in two gaps`,
  );
  assertNoDuplicates((offense.perimeter ?? []).map((p) => String(p.blocker)), (id) =>
    `${id} is assigned two blocks in space`,
  );
  assertNoDuplicates((offense.perimeter ?? []).map((p) => String(p.defender)), (id) =>
    `${id} is blocked by two men in space`,
  );
  const allBlockers = new Set<string>([
    ...blockers,
    ...(offense.perimeter ?? []).map((p) => String(p.blocker)),
  ]);
  if (allBlockers.has(String(offense.carrier))) {
    fail(`${String(offense.carrier)} is both carrying the ball and blocking`);
  }
  for (const p of offense.perimeter ?? []) {
    if (offense.blocking.some((b) => b.defender === p.defender)) {
      fail(`${String(p.defender)} is both engaged at the line and blocked in space`);
    }
  }
  assertNoDuplicates(defense.rush.map((r) => String(r.rusher)), (id) => `${id} is in the front twice`);
  assertNoDuplicates(defense.assignments.map((a) => String(a.defender)), (id) =>
    `${id} has two coverage assignments`,
  );
  for (const rusher of defense.rush) {
    if (defense.assignments.some((a) => a.defender === rusher.rusher)) {
      fail(`${String(rusher.rusher)} is both in the front and in coverage`);
    }
  }

  // 4. Arithmetic. The quarterback handed it off; he is still on the field.
  const offensePlayers = new Set<string>([
    String(state.quarterback),
    String(offense.carrier),
    ...allBlockers,
  ]);
  if (offensePlayers.size > PLAYERS_ON_THE_FIELD) {
    fail(
      `${offensePlayers.size} offensive players on the field ` +
        `(quarterback + carrier + ${allBlockers.size} blockers); the limit is ${PLAYERS_ON_THE_FIELD}`,
    );
  }
  const defensePlayers = new Set<string>([
    ...defense.assignments.map((a) => String(a.defender)),
    ...defense.rush.map((r) => String(r.rusher)),
    ...offense.blocking.map((b) => String(b.defender)),
    ...(offense.perimeter ?? []).map((p) => String(p.defender)),
  ]);
  if (defensePlayers.size > PLAYERS_ON_THE_FIELD) {
    fail(
      `${defensePlayers.size} defensive players on the field; the limit is ${PLAYERS_ON_THE_FIELD}`,
    );
  }
}

/** Dispatches on the call's own discriminant. */
export function assertCoherentCall(state: MatchGameState, calls: AnyPlayCalls): void {
  if (calls.offense.kind === "RUN") {
    assertCoherentRunCall(state, calls as RunPlayCalls);
    return;
  }
  assertCoherentPlayCall(state, calls as PlayCalls);
}

function assertNoDuplicates(ids: readonly string[], message: (id: string) => string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(message(id));
    seen.add(id);
  }
}
