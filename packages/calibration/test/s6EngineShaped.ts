/**
 * ADR-089 step 6: CONSTRUCTED PLAYS IN THE ENGINE'S STEP-6 SHAPE where a structural proof reads more
 * than the readers' fixtures carry (step-6 plan §8.2 R-3; `s6Fixtures.ts` holds the readers' plays).
 *
 * The readers' fixtures are shaped for the readers: their failed scramble runs to -2 yards and their
 * drill's CHECK carries no ratings, which the proofs fault (S-13 reads the start rule's yards, S-16 the
 * coverage rep's ratings). The plays here carry what the engine writes at step 6
 * (`engine/src/sim/passPlay.ts`, `sim/outs.ts`): a failed scramble at minus the card's drop under
 * `ZERO_GAIN_ONLY` with its zone events the run as played (2.2), the drill's CHECK with the rep's
 * ratings as registry ids (2.9), the deadline pick at the pursuit's deadline with its two options
 * (2.11), and in-pocket throwaways on the forced pick (2.1).
 */
import type { Tunables } from "@ff/engine";
import { registryAttr } from "../src/pocket/freeRun.js";
import { movementBandOf } from "../src/pocket/m6Contact.js";
import { caughtBall, check, decision, ev, pursuit, qbHit, roll, route, scrambleRun, status, threat, throwaway, thrown, tick, type Body, type PlaySpec } from "./s6Fixtures.js";

/** The coverage rep's ratings a drill's CHECK carries (2.9: the receiver's route against his defender's coverage), as registry ids. */
export const COVER_REP: readonly string[] = ["routeRunning", "speed", "manCoverage"].map((a) => String(registryAttr(a)));

/** The drill's `scramble_drill` CHECK (2.9) on the escape at 1.5 s. */
export function drill(o: { readonly receiver?: string; readonly defender?: string; readonly band?: string; readonly rollRef?: string; readonly label?: string; readonly attrs?: readonly string[] } = {}): Body {
  const receiver = o.receiver ?? "wr1";
  return ev("CHECK", {
    checkKind: "scramble_drill",
    actors: [receiver, o.defender ?? "cb1"],
    roll: roll(o.label ?? `g:play:1/movement/t1.5:drill:${receiver}`),
    tier: "TIE",
    band: o.band ?? "EVEN",
    margin: 0,
    testsAttrs: [...(o.attrs ?? COVER_REP)],
    rollRef: o.rollRef ?? "g:play:1/scramble/t1.5",
  });
}

/** A scramble's RUSH_ZONE (the carry's zone event, `events.ts`'s `rushZone`). */
export const rushZone = (yardsInZone: number, carrier = "qb"): Body => ev("RUSH_ZONE", { carrier, zone: 1, yardsInZone });

/**
 * A forced escape won at 1.5 s (deadline 3.0 s), the drill on wr1, SCRAMBLE to the LEFT, run down at
 * `yards` (the marker scores a run of 0 or less a sack); its zone events the run as played (one zone
 * of 0 yards on a run of 0 or less, else one of its yards) unless given.
 */
export function scramblePlay(yards: number, o: { readonly zones?: readonly number[]; readonly drills?: readonly Body[]; readonly marker?: boolean; readonly direction?: string | null; readonly band?: string; readonly quarterback?: string } = {}): PlaySpec {
  const qb = o.quarterback ?? "qb";
  return {
    marker: o.marker ?? true,
    yards,
    quarterback: qb,
    body: [
      tick(0.5),
      status("CLEAN"),
      route("wr1", "DEVELOPING"),
      tick(1.5),
      threat("de1", "TRAVELLING", { etaTick: 1.5 }),
      status("COLLAPSING"),
      check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
      check("scramble", "g:play:1/scramble/t1.5", { band: o.band ?? "ESCAPED", margin: 4 }),
      pursuit(1.5, 3, "g:play:1/scramble/t1.5"),
      threat("de1", "RESET"),
      ...(o.drills ?? [drill()]),
      decision("SCRAMBLE", o.direction === null ? {} : { direction: o.direction ?? "LEFT" }),
      tick(2),
      check("tackle", "g:play:1/tackle/t2", { actors: [qb, "lb1"], margin: -3 }),
      ...(o.zones ?? (yards <= 0 ? [0] : [yards])).map((z) => rushZone(z, qb)),
      scrambleRun(yards, qb),
    ],
  };
}

/**
 * An escape at 1.5 s run to the deadline at 3.0 s (or `at`), where the deadline pick (its band the
 * margin's under `tunables` unless given) throws it away out of the pocket or runs (2.11).
 */
export function deadlinePlay(
  choice: "THROWAWAY" | "RUN",
  margin: number,
  o: { readonly tunables: Tunables; readonly band?: string; readonly at?: number; readonly also?: readonly Body[]; readonly tail?: readonly Body[]; readonly quarterback?: string },
): PlaySpec {
  const at = o.at ?? 3;
  const qb = o.quarterback ?? "qb";
  const label = `g:play:1/movement/t${String(at)}:deadline`;
  const tail =
    o.tail ??
    (choice === "THROWAWAY"
      ? [decision("THROWAWAY"), throwaway("OUT_OF_POCKET", { rollRef: label, outsideTackleBox: true })]
      : [decision("SCRAMBLE"), check("tackle", `g:play:1/tackle/t${String(at)}`, { actors: [qb, "lb1"], margin: -3 }), rushZone(4, qb), scrambleRun(4, qb)]);
  return {
    yards: choice === "RUN" ? 4 : 0,
    quarterback: qb,
    body: [
      tick(0.5),
      status("CLEAN"),
      tick(1.5),
      threat("de1", "TRAVELLING", { etaTick: 1.5 }),
      status("COLLAPSING"),
      check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
      check("scramble", "g:play:1/scramble/t1.5", { band: "ESCAPED", margin: 4 }),
      pursuit(1.5, 3, "g:play:1/scramble/t1.5"),
      threat("de1", "RESET"),
      decision("SCRAMBLE", { direction: "RIGHT" }),
      tick(at),
      check("pocket_movement", label, { band: o.band ?? movementBandOf(o.tunables, margin).label, margin }),
      ...(o.also ?? []),
      ...tail,
    ],
  };
}

/** A throwaway in the pocket at 2.0 s on the forced pick, wr1's route OPEN since 1.0 s unless `route` is false. */
export function pocketThrowaway(cause: string, o: { readonly flag?: boolean; readonly route?: boolean; readonly contest?: boolean } = {}): PlaySpec {
  return {
    body: [
      tick(1),
      status("CLEAN"),
      ...(o.route === false ? [route("wr1", "DEVELOPING")] : [route("wr1", "OPEN", 40)]),
      tick(2),
      threat("de1", "TRAVELLING", { etaTick: 2.5 }),
      status("COLLAPSING"),
      ...(o.contest === true ? [check("arrival_contest", "g:play:1/contest/t2:de1", { band: "QB_ESCAPES", actors: ["de1", "qb"], margin: 3 })] : []),
      check("pocket_movement", "g:play:1/movement/t2", { band: "SOUND", margin: 5 }),
      decision("THROWAWAY"),
      throwaway(cause, { rollRef: "g:play:1/movement/t2", ...(o.flag === undefined ? {} : { outsideTackleBox: o.flag }) }),
    ],
  };
}

/** A contained roll at 1.5 s (HOLD with its side), then the rolls given, each with its pick (`:clean` on a clean one) and its HOLD, then a throw at 4.0 s. */
export function containedThen(rolls: readonly { readonly at: number; readonly clean: boolean; readonly band?: string }[]): PlaySpec {
  return {
    yards: 6,
    body: [
      tick(1),
      status("CLEAN"),
      route("wr1", "OPEN", 40),
      tick(1.5),
      threat("de1", "TRAVELLING", { etaTick: 1.5 }),
      status("COLLAPSING"),
      check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
      check("scramble", "g:play:1/scramble/t1.5", { band: "CONTAINED", margin: -10 }),
      decision("HOLD", { direction: "LEFT" }),
      ...rolls.flatMap((r) => [
        tick(r.at),
        status(r.clean ? "CLEAN" : "COLLAPSING"),
        check("pocket_movement", `g:play:1/movement/t${String(r.at)}${r.clean ? ":clean" : ""}`, { band: "SOUND", margin: 5 }),
        check("scramble", `g:play:1/scramble/t${String(r.at)}`, { band: r.band ?? "CONTAINED", margin: -10 }),
        decision("HOLD", { direction: "RIGHT" }),
      ]),
      tick(4),
      status("CLEAN"),
      decision("THROW", { target: "wr1" }),
      thrown("wr1"),
      caughtBall("wr1"),
    ],
  };
}

/** An escape won at 1.5 s, then a throw on the run at 2.0 s, caught for 12 yards. */
export function onTheRunThrow(quarterback = "qb"): PlaySpec {
  return {
    yards: 12,
    quarterback,
    body: [
      tick(0.5),
      status("CLEAN"),
      route("wr1", "OPEN", 40),
      tick(1.5),
      threat("de1", "TRAVELLING", { etaTick: 1.5 }),
      status("COLLAPSING"),
      check("pocket_movement", "g:play:1/movement/t1.5", { band: "SOUND", margin: 5 }),
      check("scramble", "g:play:1/scramble/t1.5", { band: "ESCAPED", margin: 4 }),
      pursuit(1.5, 3, "g:play:1/scramble/t1.5"),
      threat("de1", "RESET"),
      decision("SCRAMBLE", { direction: "LEFT" }),
      tick(2),
      decision("THROW", { target: "wr1" }),
      thrown("wr1"),
      caughtBall("wr1"),
    ],
  };
}

/** `spec` with each event mapped to the events `f` gives (none drops it). */
export const mapBody = (spec: PlaySpec, f: (b: Body) => readonly Body[]): PlaySpec => ({ ...spec, body: spec.body.flatMap((b) => [...f(b)]) });

/** `spec` with the QB_HIT naming `rollRef` patched, or dropped when `patch` is null. */
export function editHit(spec: PlaySpec, rollRef: string, patch: Readonly<Record<string, unknown>> | null): PlaySpec {
  return mapBody(spec, (b) => {
    const p = b.payload as Readonly<Record<string, unknown>>;
    if (b.type !== "QB_HIT" || p["rollRef"] !== rollRef) return [b];
    return patch === null ? [] : [qbHit({ ...p, ...patch })];
  });
}

/** `spec` with each QB_DECISION's payload patched by `f` (its index among the play's decisions given). */
export function editDecisions(spec: PlaySpec, f: (p: Readonly<Record<string, unknown>>, i: number) => Readonly<Record<string, unknown>>): PlaySpec {
  let i = 0;
  return mapBody(spec, (b) => (b.type === "QB_DECISION" ? [ev("QB_DECISION", f(b.payload as Readonly<Record<string, unknown>>, i++))] : [b]));
}
