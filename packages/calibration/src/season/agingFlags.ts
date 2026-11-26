/**
 * ADR-087 §12.1 (steps AB3, AB5, AB6 and AB8): the new rules' options on the command line, shared by
 * `season`, `career-check` and `player-checks`, and how a run records and restores them: the aging
 * options (AB3), where injury risk comes from (AB5), the spot path's two tuning options (AB6) and how
 * players retire (AB8). They travel as one set (`AgingSwitches`), named by one label, so a run's
 * records, caches and resumes carry them all.
 *
 * The flags:
 *  - `--aging position|ability`: how the players age (franchise `PlayerStepsConfig.aging`, default
 *    `position`). Acts only with development on.
 *  - `--ability-curves D|B`: the fitted set on the ability path (default `D`, variant D as fitted with
 *    slow smarts; `B` is variant B's whole set, AB9-T2).
 *  - `--technique-knee`: TECHNIQUE's steeper slope from 31 (§12.2.5; AB9-T3).
 *  - `--smarts-snaps <n>`: smarts from snaps, points per 1,000 snaps, in place of the set's (AB9-T4, O2: 0.225).
 *  - `--injury-risk group|spot` (AB5): where injury risk comes from (franchise
 *    `PlayerStepsConfig.injuryRisk`, default `group`, by the listed position's group; `spot`, by the
 *    depth-chart key, §12.3.1-12.3.2). Acts only with injuries on.
 *  - `--retirement unsigned|choice` (AB8): how players retire (franchise
 *    `PlayerStepsConfig.retirement`, default `unsigned`, only men nobody signs in time; `choice` adds
 *    retiring by his own choice at three moments a year, §12.4). Acts with development or injuries on.
 *  - `--ability-rules`: the shorthand for the new rules. It sets `--aging ability`, (AB5)
 *    `--injury-risk spot` and (AB8) `--retirement choice`, all three as §12.1 has it, so it needs
 *    development and injuries on. For one rule alone, type its own flag.
 *  - `--no-healing-by-age` (AB6; AB9-T6, "back/ribs healing off"): the spot path without §12.3.3's
 *    slower back and rib healing at 31 and over (franchise `PlayerStepsConfig.healingByAge: false`;
 *    on by default there). Named for the table it turns off (`HEALING_BY_AGE`), with `no-` because the
 *    rule is on unless the switch is typed. Needs `--injury-risk spot` (or `--ability-rules`).
 *  - `--per-contact <n>` (AB6; AB9-T5, "wear on"): years of wear per contest of contact past the free
 *    count (§12.3.6, franchise `PlayerStepsConfig.perContact`, default 0, no wear), a plain decimal
 *    (`0.002`, `2e-3`; no hex or other form `Number` would also read). Named for the
 *    franchise option and the spec's own `perContact`, so the flag, the record and the label say the
 *    same thing. Needs the ability path and the spot path (`--ability-rules`, or both flags), since the
 *    contact count is kept on the one and wear acts on the other.
 *
 * The three aging tuning flags need the ability path (`--aging ability` or `--ability-rules`); AB6's
 * two need the spot path. A value the flags do not take is refused, so a misspelling never plays the
 * position path silently. The options are kept only when they are not the default (`--aging position`,
 * `--ability-curves D`, `--injury-risk group`, `--per-contact 0` and `--retirement unsigned` are the
 * defaults and are dropped, and so is a `--smarts-snaps` equal to the chosen set's own value, 0.45 in
 * both sets), so a run at the defaults passes exactly what it passed before AB3, its cache keys are
 * unchanged, and one set of rules has one name (`agingLabel`).
 *
 * Calibration may not import franchise's own type for these (ADR-078 R1's named surface), so the
 * shape is written out here; it is the franchise `AgingOptions` shape, field for field, and
 * `PlayerStepsConfig.injuryRisk`, `.healingByAge`, `.perContact` and `.retirement`.
 */

/** The new rules' options as the season runner takes them (franchise `AgingOptions` and `PlayerStepsConfig.injuryRisk`). */
export interface AgingSwitches {
  readonly aging?: "position" | "ability";
  readonly abilityCurves?: "D" | "B";
  readonly techniqueKnee?: boolean;
  readonly smartsSnaps?: number;
  /** AB5: `"group"` (the default) or `"spot"`. Acts only with injuries on. */
  readonly injuryRisk?: "group" | "spot";
  /** AB6 (AB9-T6): `false` turns the spot path's slower back and rib healing at 31+ off; kept only as `false`. Acts only with injuries on. */
  readonly healingByAge?: boolean;
  /** AB6 (AB9-T5): years of wear per contest past the free count; kept only above 0. Acts only with development and injuries on. */
  readonly perContact?: number;
  /** AB8: `"unsigned"` (the default) or `"choice"`. Acts with development or injuries on. */
  readonly retirement?: "unsigned" | "choice";
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Each fitted set's own smarts from snaps, points per 1,000 snaps: a copy of franchise's
 * `ABILITY_CURVES[set].smartsSnaps` (ADR-087 §12.2.1; calibration may not import the table, ADR-078
 * R1), which a test reads from franchise's source. A `--smarts-snaps` equal to it is the set's rules.
 */
export const SET_SMARTS_SNAPS: Readonly<Record<"D" | "B", number>> = { D: 0.45, B: 0.45 };

/** A plain decimal number, no sign, with an optional exponent (`--per-contact`'s value). */
const PLAIN_DECIMAL = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** The flags as typed, before `settleAging` checks them. */
export interface AgingFlags extends Mutable<AgingSwitches> {
  /** `--ability-rules` was given. */
  abilityRules?: boolean;
}

/**
 * Reads one aging flag at `arg` into `into`, taking its value from `next`; false when `arg` is not
 * one of them. Values are checked here.
 */
export function readAgingFlag(arg: string, next: () => string, into: AgingFlags): boolean {
  if (arg === "--aging") {
    const v = next();
    if (v !== "position" && v !== "ability") throw new SyntaxError(`--aging is position or ability, not ${JSON.stringify(v)}`);
    into.aging = v;
  } else if (arg === "--ability-curves") {
    const v = next();
    if (v !== "D" && v !== "B") throw new SyntaxError(`--ability-curves is D or B, not ${JSON.stringify(v)}`);
    into.abilityCurves = v;
  } else if (arg === "--technique-knee") into.techniqueKnee = true;
  else if (arg === "--smarts-snaps") {
    const text = next();
    const v = Number(text);
    if (text.trim() === "" || !Number.isFinite(v) || v < 0) throw new SyntaxError(`--smarts-snaps is points per 1,000 snaps, 0 or more, not ${JSON.stringify(text)}`);
    into.smartsSnaps = v;
  } else if (arg === "--injury-risk") {
    const v = next();
    if (v !== "group" && v !== "spot") throw new SyntaxError(`--injury-risk is group or spot, not ${JSON.stringify(v)}`);
    into.injuryRisk = v;
  } else if (arg === "--retirement") {
    const v = next();
    if (v !== "unsigned" && v !== "choice") throw new SyntaxError(`--retirement is unsigned or choice, not ${JSON.stringify(v)}`);
    into.retirement = v;
  } else if (arg === "--ability-rules") into.abilityRules = true;
  else if (arg === "--no-healing-by-age") into.healingByAge = false;
  else if (arg === "--per-contact") {
    const text = next();
    // A plain decimal, with an exponent if wanted (`0.002`, `2e-3`): `Number` alone would also take
    // `0x10` (16), `0b1` or padded text, and a tuning value should read as it is typed.
    const v = PLAIN_DECIMAL.test(text) ? Number(text) : NaN;
    if (!Number.isFinite(v) || v < 0) throw new SyntaxError(`--per-contact is years of wear per contest, a plain decimal 0 or more, not ${JSON.stringify(text)}`);
    into.perContact = v;
  } else return false;
  return true;
}

/**
 * The flags checked and settled: `--ability-rules` read as `--aging ability`, `--injury-risk spot`
 * and `--retirement choice` (refused beside `--aging position`, `--injury-risk group` or
 * `--retirement unsigned`), the aging tuning flags refused off the ability path and AB6's off the spot
 * path (`--per-contact` off the ability path too), and the defaults dropped (a smarts-snaps value equal
 * to the chosen set's own, `SET_SMARTS_SNAPS`, among them, and `--per-contact 0`).
 */
export function settleAging(flags: AgingFlags): AgingSwitches {
  if (flags.abilityRules === true && flags.aging === "position") throw new SyntaxError("--ability-rules sets --aging ability; drop --aging position");
  if (flags.abilityRules === true && flags.injuryRisk === "group") throw new SyntaxError("--ability-rules sets --injury-risk spot; drop --injury-risk group");
  if (flags.abilityRules === true && flags.retirement === "unsigned") throw new SyntaxError("--ability-rules sets --retirement choice; drop --retirement unsigned");
  const injuryRisk = flags.abilityRules === true ? "spot" : flags.injuryRisk;
  const retirement = flags.abilityRules === true ? "choice" : flags.retirement;
  const aging = flags.abilityRules === true ? "ability" : flags.aging;
  const tuning = [
    flags.abilityCurves !== undefined ? "--ability-curves" : undefined,
    flags.techniqueKnee === true ? "--technique-knee" : undefined,
    flags.smartsSnaps !== undefined ? "--smarts-snaps" : undefined,
  ].filter((f): f is string => f !== undefined);
  if (aging !== "ability" && tuning.length > 0) throw new SyntaxError(`${tuning.join(", ")} act only on the ability path; add --aging ability (or --ability-rules)`);
  // AB6: the spot path's two tuning flags.
  const spotTuning = [
    flags.healingByAge !== undefined ? "--no-healing-by-age" : undefined,
    flags.perContact !== undefined ? "--per-contact" : undefined,
  ].filter((f): f is string => f !== undefined);
  if (injuryRisk !== "spot" && spotTuning.length > 0) throw new SyntaxError(`${spotTuning.join(", ")} act only on the spot path; add --injury-risk spot (or --ability-rules)`);
  if (flags.perContact !== undefined && aging !== "ability") {
    throw new SyntaxError("--per-contact wears the ability path's curves, whose contact count is kept only there; add --aging ability (or --ability-rules)");
  }
  // The rules beside aging, kept only when not the default, in this order (AB5's with AB6's tuning, then AB8's).
  const others = {
    ...(injuryRisk === "spot" ? {
      injuryRisk: "spot" as const,
      ...(flags.healingByAge === false ? { healingByAge: false } : {}),
      ...(flags.perContact !== undefined && flags.perContact > 0 ? { perContact: flags.perContact } : {}),
    } : {}),
    ...(retirement === "choice" ? { retirement: "choice" as const } : {}),
  };
  if (aging !== "ability") return others;
  return {
    aging: "ability",
    ...(flags.abilityCurves === "B" ? { abilityCurves: "B" as const } : {}),
    ...(flags.techniqueKnee === true ? { techniqueKnee: true } : {}),
    ...(flags.smartsSnaps !== undefined && flags.smartsSnaps !== SET_SMARTS_SNAPS[flags.abilityCurves ?? "D"] ? { smartsSnaps: flags.smartsSnaps } : {}),
    ...others,
  };
}

/**
 * The options that act under these switches (§12.1: the aging options only with development on,
 * `injuryRisk` only with injuries on, `retirement` with either; AB6: `healingByAge` with injuries on,
 * `perContact` with both), the rest dropped: what the players' steps play and record in
 * `PlayerMemory.switches`.
 */
export function actingRules(o: AgingSwitches, on: { readonly development: boolean; readonly injuries: boolean }): AgingSwitches {
  const { injuryRisk, healingByAge, perContact, retirement, ...aging } = o;
  return {
    ...(on.development ? aging : {}),
    ...(on.injuries && injuryRisk !== undefined ? { injuryRisk } : {}),
    ...(on.injuries && healingByAge !== undefined ? { healingByAge } : {}),
    ...(on.development && on.injuries && perContact !== undefined ? { perContact } : {}),
    ...((on.development || on.injuries) && retirement !== undefined ? { retirement } : {}),
  };
}

/**
 * Refuses options that would not act under these switches (`actingRules` would drop them): a run
 * would carry their name in its records and caches but play without them. `what` names the run.
 */
export function assertRulesAct(o: AgingSwitches, on: { readonly development: boolean; readonly injuries: boolean }, what: string): void {
  if (o.aging === "ability" && !on.development) throw new SyntaxError(`--aging ability acts on the players' growth and aging, which ${what} has off; add --development (or drop it)`);
  if (o.injuryRisk === "spot" && !on.injuries) throw new SyntaxError(`--injury-risk spot acts on injuries, which ${what} has off; add --injuries (or drop it)`);
  if (o.healingByAge === false && !on.injuries) throw new SyntaxError(`--no-healing-by-age acts on injuries, which ${what} has off; add --injuries (or drop it)`);
  if (o.perContact !== undefined && !(on.development && on.injuries)) {
    throw new SyntaxError(`--per-contact acts with growth and injuries both on, which ${what} does not have; switch both on (or drop it)`);
  }
  if (o.retirement === "choice" && !on.development && !on.injuries) {
    throw new SyntaxError(`--retirement choice acts in the players' steps, which ${what} has off; add --development or --injuries (or drop it)`);
  }
}

/**
 * The season command's aging options (`main.ts`): the flags settled, refused with `--load` (a save
 * carries on under its own, `seasonPlayers`), `--aging ability` refused without `--development`,
 * `--injury-risk spot` without `--injuries` (`--ability-rules` sets both, so it needs both), and
 * `--retirement choice` without either (AB8).
 */
export function seasonAging(flags: AgingFlags, o: { readonly load: boolean; readonly development: boolean; readonly injuries?: boolean }): AgingSwitches {
  const typed = Object.keys(flags).length > 0;
  const aging = settleAging(flags);
  if (typed && o.load) throw new SyntaxError("--load carries on with the save's own aging options; drop them");
  if (aging.aging === "ability" && !o.development) throw new SyntaxError("--aging ability acts on the players' growth and aging; add --development");
  if (aging.injuryRisk === "spot" && o.injuries !== true) {
    throw new SyntaxError(flags.abilityRules === true
      ? "--ability-rules sets --injury-risk spot too, which acts on injuries; add --injuries (or type --aging ability alone)"
      : "--injury-risk spot acts on injuries; add --injuries");
  }
  if (aging.retirement === "choice" && !o.development && o.injuries !== true) {
    throw new SyntaxError("--retirement choice acts in the players' steps; add --development or --injuries");
  }
  return aging;
}

/**
 * The season command's players' switches (ADR-087 §9, §12.1): carrying on (`loaded`), the save's own
 * (`PlayerMemory.switches`, `saved`; none when it has none), aging options and all (`agingFromRecord`);
 * a new league, the flags' (`aging` settled by `seasonAging`), only with development or injuries on.
 * The aging options join only when not the default, so a default run passes what it did before AB3.
 */
export function seasonPlayers(o: {
  readonly loaded: boolean; readonly saved?: Readonly<Record<string, unknown>> & { readonly development: boolean; readonly injuries: boolean };
  readonly development: boolean; readonly injuries: boolean; readonly aging: AgingSwitches;
}): ({ readonly development: boolean; readonly injuries: boolean } & AgingSwitches) | undefined {
  if (o.loaded) return o.saved ? { development: o.saved.development, injuries: o.saved.injuries, ...agingFromRecord(o.saved) } : undefined;
  return o.development || o.injuries ? { development: o.development, injuries: o.injuries, ...o.aging } : undefined;
}

/**
 * A short name for the options, for cache keys and file names: `ability`, `ability-B`,
 * `ability-knee`, `ability-smarts0.225` and their joins, then `spot` for `injuryRisk: "spot"` (AB5:
 * `spot` alone, `ability-spot`, `ability-B-spot`), then on the spot path AB6's `healflat` (back and
 * rib healing flat with age, `healingByAge: false`) and `wear<n>` (`perContact` n): `spot-healflat`,
 * `ability-spot-wear0.002`; then `choice` for `retirement: "choice"` (AB8: `choice` alone,
 * `spot-choice`, `ability-spot-choice`, `ability-spot-healflat-wear0.002-choice`); undefined at the
 * defaults. It names the rules, not the flags typed: a smarts-snaps value equal to the set's own
 * (`SET_SMARTS_SNAPS`) adds nothing, nor does a `perContact` of 0.
 */
export function agingLabel(o: AgingSwitches): string | undefined {
  const spot = o.injuryRisk === "spot"
    ? ["spot", o.healingByAge === false ? "healflat" : "", o.perContact !== undefined && o.perContact > 0 ? `wear${o.perContact}` : ""].filter(Boolean).join("-")
    : "";
  const rest = [spot, o.retirement === "choice" ? "choice" : ""].filter(Boolean);
  if (o.aging !== "ability") return rest.length === 0 ? undefined : rest.join("-");
  const smarts = o.smartsSnaps !== undefined && o.smartsSnaps !== SET_SMARTS_SNAPS[o.abilityCurves ?? "D"];
  return ["ability", o.abilityCurves === "B" ? "B" : "", o.techniqueKnee === true ? "knee" : "", smarts ? `smarts${o.smartsSnaps}` : "", ...rest]
    .filter(Boolean).join("-");
}

/**
 * The aging options a save or a checkpoint recorded (franchise `PlayerMemory.switches`, which the
 * players' steps write only when not the default), so a run that carries on plays under the same
 * rules. A record without them (a save from before AB3, or one made at the defaults) carries on at the
 * defaults. A value the options do not take is refused.
 */
export function agingFromRecord(switches: Readonly<Record<string, unknown>> | undefined): AgingSwitches {
  if (switches === undefined) return {};
  const { aging, abilityCurves, techniqueKnee, smartsSnaps, injuryRisk, healingByAge, perContact, retirement } = switches;
  if (injuryRisk !== undefined && injuryRisk !== "group" && injuryRisk !== "spot") throw new Error(`the save's injuryRisk is ${JSON.stringify(injuryRisk)}, which this version does not know`);
  if (retirement !== undefined && retirement !== "unsigned" && retirement !== "choice") throw new Error(`the save's retirement is ${JSON.stringify(retirement)}, which this version does not know`);
  if (aging !== undefined && aging !== "position" && aging !== "ability") throw new Error(`the save's aging is ${JSON.stringify(aging)}, which this version does not know`);
  if (abilityCurves !== undefined && abilityCurves !== "D" && abilityCurves !== "B") throw new Error(`the save's abilityCurves is ${JSON.stringify(abilityCurves)}, which this version does not know`);
  if (techniqueKnee !== undefined && typeof techniqueKnee !== "boolean") throw new Error(`the save's techniqueKnee is ${JSON.stringify(techniqueKnee)}, not true or false`);
  if (smartsSnaps !== undefined && !(typeof smartsSnaps === "number" && Number.isFinite(smartsSnaps) && smartsSnaps >= 0)) {
    throw new Error(`the save's smartsSnaps is ${JSON.stringify(smartsSnaps)}, not a number of points 0 or more`);
  }
  if (healingByAge !== undefined && typeof healingByAge !== "boolean") throw new Error(`the save's healingByAge is ${JSON.stringify(healingByAge)}, not true or false`);
  if (perContact !== undefined && !(typeof perContact === "number" && Number.isFinite(perContact) && perContact >= 0)) {
    throw new Error(`the save's perContact is ${JSON.stringify(perContact)}, not a number of years 0 or more`);
  }
  return settleAging({
    ...(aging === undefined ? {} : { aging }),
    ...(abilityCurves === undefined ? {} : { abilityCurves }),
    ...(techniqueKnee === true ? { techniqueKnee: true } : {}),
    ...(smartsSnaps === undefined ? {} : { smartsSnaps }),
    ...(injuryRisk === undefined ? {} : { injuryRisk }),
    ...(healingByAge === false ? { healingByAge: false } : {}),
    ...(perContact === undefined ? {} : { perContact }),
    ...(retirement === undefined ? {} : { retirement }),
  });
}

/** Do two sets of options play the same rules (both settled)? */
export function sameAging(a: AgingSwitches, b: AgingSwitches): boolean {
  return agingLabel(a) === agingLabel(b);
}
