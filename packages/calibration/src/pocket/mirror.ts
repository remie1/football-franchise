/**
 * THE MIRROR SEAM (ADR-089 step 0, M5; plan §3.2).
 *
 * M5's guard asks whether play is symmetric: with LEFT and RIGHT swapped on every card, escape
 * direction and catches (and, from step 7, the slide direction) must mirror within noise. So a
 * mirrored game is the same game with every side the calls state swapped, and nothing else:
 *
 *  - every `RunSide`-typed field: a slide's `slideSide`, `RunBlockAssignment.side`, a run's
 *    `designedSide`, `RunFit.side`, `RushAssignment.side` and `ShownRusher.side`;
 *  - every `HorizontalZone`: LW with RW and LH with RH (C stays), in a route's `breakZone`, a hot
 *    route's `breakZone` and a zone defender's `zone`.
 *
 * PLAYERS KEEP THEIR IDS. The calls are mirrored, not the rosters, so a mirrored game puts each
 * man on the other side of the call; any difference that makes falls inside M5's two-seed-set
 * noise band (plan §5.4).
 *
 * ALIASING IS KEPT. The engine reads `shownAssignments === assignments` as "no coverage look"
 * (`engine/src/sim/passPlay.ts:2129`) and playbook reads `shownRush !== rush` as "a front look"
 * (`playbook/src/frontLooks.ts:376`), so a shown list that IS the played list stays the same
 * array once mirrored, and a separate one stays separate.
 *
 * Absent fields stay absent (a side the card never stated is not given one), so
 * `mirrorCall(mirrorCall(c))` deep-equals `c`.
 *
 * Reached only through `RunGameInput.mirror` (a boolean, so a batch worker can be handed it) and
 * `runRealSeason`'s `game.mirror`. Absent or false, no caller is wrapped.
 */
import type {
  CoverageAssignment,
  DefensivePlayCall,
  FieldZone,
  HorizontalZone,
  OffensiveCall,
  OffensivePlayCall,
  RouteAssignment,
  RunBlockAssignment,
  RunFit,
  RunPlayCall,
  RunSide,
  RushAssignment,
  ShownRusher,
} from "@ff/contracts";
import type { PlayCaller } from "@ff/engine";

export function mirrorSide(side: RunSide): RunSide {
  return side === "LEFT" ? "RIGHT" : "LEFT";
}

export function mirrorHorizontal(zone: HorizontalZone): HorizontalZone {
  switch (zone) {
    case "LW":
      return "RW";
    case "LH":
      return "RH";
    case "C":
      return "C";
    case "RH":
      return "LH";
    case "RW":
      return "LW";
  }
}

function mirrorZone(zone: FieldZone): FieldZone {
  return { ...zone, horizontal: mirrorHorizontal(zone.horizontal) };
}

function mirrorRunFit(fit: RunFit): RunFit {
  return { ...fit, side: mirrorSide(fit.side) };
}

function mirrorRoute(route: RouteAssignment): RouteAssignment {
  return {
    ...route,
    ...(route.breakZone === undefined ? {} : { breakZone: mirrorZone(route.breakZone) }),
    ...(route.hot === undefined
      ? {}
      : {
          hot: {
            ...route.hot,
            ...(route.hot.breakZone === undefined ? {} : { breakZone: mirrorZone(route.hot.breakZone) }),
          },
        }),
  };
}

function mirrorPass(call: OffensivePlayCall): OffensivePlayCall {
  const scheme = call.protectionScheme;
  return {
    ...call,
    routes: call.routes.map(mirrorRoute),
    ...(scheme === undefined
      ? {}
      : { protectionScheme: scheme.kind === "SLIDE" ? { ...scheme, slideSide: mirrorSide(scheme.slideSide) } : scheme }),
  };
}

function mirrorRunBlock(block: RunBlockAssignment): RunBlockAssignment {
  return { ...block, side: mirrorSide(block.side) };
}

function mirrorRun(call: RunPlayCall): RunPlayCall {
  return { ...call, designedSide: mirrorSide(call.designedSide), blocking: call.blocking.map(mirrorRunBlock) };
}

function mirrorCoverage(a: CoverageAssignment): CoverageAssignment {
  if (a.kind === "MAN") return { ...a, ...(a.runFit === undefined ? {} : { runFit: mirrorRunFit(a.runFit) }) };
  return {
    ...a,
    zone: mirrorZone(a.zone),
    ...(a.runFit === undefined ? {} : { runFit: mirrorRunFit(a.runFit) }),
  };
}

function mirrorRusher<T extends ShownRusher>(r: T): T {
  return r.side === undefined ? { ...r } : { ...r, side: mirrorSide(r.side) };
}

function mirrorDefense(call: DefensivePlayCall): DefensivePlayCall {
  const assignments = call.assignments.map(mirrorCoverage);
  const shownAssignments =
    call.shownAssignments === call.assignments ? assignments : call.shownAssignments.map(mirrorCoverage);
  const rush: readonly RushAssignment[] = call.rush.map((r) => mirrorRusher(r));
  // `shownRush` is typed `ShownRusher[]`; with no front look it is the very array `rush` is.
  const shownRush: readonly ShownRusher[] =
    (call.shownRush as unknown) === (call.rush as unknown) ? rush : call.shownRush.map((r) => mirrorRusher(r));
  return { ...call, assignments, shownAssignments, rush, shownRush };
}

/** The call with LEFT and RIGHT swapped in every side-bearing field, and nothing else changed. */
export function mirrorCall(call: OffensiveCall): OffensiveCall;
export function mirrorCall(call: DefensivePlayCall): DefensivePlayCall;
export function mirrorCall(call: OffensiveCall | DefensivePlayCall): OffensiveCall | DefensivePlayCall {
  if ("kind" in call) return call.kind === "PASS" ? mirrorPass(call) : mirrorRun(call);
  return mirrorDefense(call);
}

/**
 * A caller whose offensive and defensive calls pass through `mirrorCall`. Its name, its fourth
 * downs and its coin tosses are the wrapped caller's own; it draws no die of its own, so the
 * game's dice are where they were.
 */
export function mirrorCaller(caller: PlayCaller): PlayCaller {
  return {
    name: caller.name,
    callOffense: (request, rng) => mirrorCall(caller.callOffense(request, rng)),
    callDefense: (request, rng) => mirrorCall(caller.callDefense(request, rng)),
    decideFourthDown: (request) => caller.decideFourthDown(request),
    decideCoinToss: (request) => caller.decideCoinToss(request),
  };
}
