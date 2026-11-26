/**
 * ADR-087 §12.1 (steps AB3 and AB5): the new rules' options on the command line, shared by `season`,
 * `career-check` and `player-checks`, and how a run records and restores them: the aging options
 * (AB3) and where injury risk comes from (AB5). They travel as one set (`AgingSwitches`), named by one
 * label, so a run's records, caches and resumes carry both.
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
 *  - `--ability-rules`: the shorthand for the new rules. It sets `--aging ability` and (AB5)
 *    `--injury-risk spot`, so it needs development and injuries on; AB8 adds `--retirement choice`,
 *    as §12.1 has it set all three. For one rule alone, type its own flag.
 *
 * The three tuning flags need the ability path (`--aging ability` or `--ability-rules`). A value the
 * flags do not take is refused, so a misspelling never plays the position path silently. The options
 * are kept only when they are not the default (`--aging position`, `--ability-curves D` and
 * `--injury-risk group` are the defaults and are dropped, and so is a `--smarts-snaps` equal to the
 * chosen set's own value, 0.45 in both sets), so a run at the defaults passes exactly what it passed
 * before AB3, its cache keys are unchanged, and one set of rules has one name (`agingLabel`).
 *
 * Calibration may not import franchise's own type for these (ADR-078 R1's named surface), so the
 * shape is written out here; it is the franchise `AgingOptions` shape, field for field, and
 * `PlayerStepsConfig.injuryRisk`.
 */

/** The new rules' options as the season runner takes them (franchise `AgingOptions` and `PlayerStepsConfig.injuryRisk`). */
export interface AgingSwitches {
  readonly aging?: "position" | "ability";
  readonly abilityCurves?: "D" | "B";
  readonly techniqueKnee?: boolean;
  readonly smartsSnaps?: number;
  /** AB5: `"group"` (the default) or `"spot"`. Acts only with injuries on. */
  readonly injuryRisk?: "group" | "spot";
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Each fitted set's own smarts from snaps, points per 1,000 snaps: a copy of franchise's
 * `ABILITY_CURVES[set].smartsSnaps` (ADR-087 §12.2.1; calibration may not import the table, ADR-078
 * R1), which a test reads from franchise's source. A `--smarts-snaps` equal to it is the set's rules.
 */
export const SET_SMARTS_SNAPS: Readonly<Record<"D" | "B", number>> = { D: 0.45, B: 0.45 };

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
  } else if (arg === "--ability-rules") into.abilityRules = true;
  else return false;
  return true;
}

/**
 * The flags checked and settled: `--ability-rules` read as `--aging ability` and `--injury-risk spot`
 * (refused beside `--aging position` or `--injury-risk group`), the tuning flags refused off the
 * ability path, and the defaults dropped (a smarts-snaps value equal to the chosen set's own,
 * `SET_SMARTS_SNAPS`, among them).
 */
export function settleAging(flags: AgingFlags): AgingSwitches {
  if (flags.abilityRules === true && flags.aging === "position") throw new SyntaxError("--ability-rules sets --aging ability; drop --aging position");
  if (flags.abilityRules === true && flags.injuryRisk === "group") throw new SyntaxError("--ability-rules sets --injury-risk spot; drop --injury-risk group");
  const injuryRisk = flags.abilityRules === true ? "spot" : flags.injuryRisk;
  const spot = injuryRisk === "spot" ? { injuryRisk: "spot" as const } : {};
  const aging = flags.abilityRules === true ? "ability" : flags.aging;
  const tuning = [
    flags.abilityCurves !== undefined ? "--ability-curves" : undefined,
    flags.techniqueKnee === true ? "--technique-knee" : undefined,
    flags.smartsSnaps !== undefined ? "--smarts-snaps" : undefined,
  ].filter((f): f is string => f !== undefined);
  if (aging !== "ability" && tuning.length > 0) throw new SyntaxError(`${tuning.join(", ")} act only on the ability path; add --aging ability (or --ability-rules)`);
  if (aging !== "ability") return spot;
  return {
    aging: "ability",
    ...(flags.abilityCurves === "B" ? { abilityCurves: "B" as const } : {}),
    ...(flags.techniqueKnee === true ? { techniqueKnee: true } : {}),
    ...(flags.smartsSnaps !== undefined && flags.smartsSnaps !== SET_SMARTS_SNAPS[flags.abilityCurves ?? "D"] ? { smartsSnaps: flags.smartsSnaps } : {}),
    ...spot,
  };
}

/**
 * The options that act under these switches (§12.1: the aging options only with development on,
 * `injuryRisk` only with injuries on), the rest dropped: what the players' steps play and record in
 * `PlayerMemory.switches`.
 */
export function actingRules(o: AgingSwitches, on: { readonly development: boolean; readonly injuries: boolean }): AgingSwitches {
  const { injuryRisk, ...aging } = o;
  return { ...(on.development ? aging : {}), ...(on.injuries && injuryRisk !== undefined ? { injuryRisk } : {}) };
}

/**
 * Refuses options that would not act under these switches (`actingRules` would drop them): a run
 * would carry their name in its records and caches but play without them. `what` names the run.
 */
export function assertRulesAct(o: AgingSwitches, on: { readonly development: boolean; readonly injuries: boolean }, what: string): void {
  if (o.aging === "ability" && !on.development) throw new SyntaxError(`--aging ability acts on the players' growth and aging, which ${what} has off; add --development (or drop it)`);
  if (o.injuryRisk === "spot" && !on.injuries) throw new SyntaxError(`--injury-risk spot acts on injuries, which ${what} has off; add --injuries (or drop it)`);
}

/**
 * The season command's aging options (`main.ts`): the flags settled, refused with `--load` (a save
 * carries on under its own, `seasonPlayers`), `--aging ability` refused without `--development` and
 * `--injury-risk spot` without `--injuries` (`--ability-rules` sets both, so it needs both).
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
 * `spot` alone, `ability-spot`, `ability-B-spot`); undefined at the defaults. It names the rules, not
 * the flags typed: a smarts-snaps value equal to the set's own (`SET_SMARTS_SNAPS`) adds nothing.
 */
export function agingLabel(o: AgingSwitches): string | undefined {
  const spot = o.injuryRisk === "spot" ? "spot" : "";
  if (o.aging !== "ability") return spot === "" ? undefined : spot;
  const smarts = o.smartsSnaps !== undefined && o.smartsSnaps !== SET_SMARTS_SNAPS[o.abilityCurves ?? "D"];
  return ["ability", o.abilityCurves === "B" ? "B" : "", o.techniqueKnee === true ? "knee" : "", smarts ? `smarts${o.smartsSnaps}` : "", spot]
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
  const { aging, abilityCurves, techniqueKnee, smartsSnaps, injuryRisk } = switches;
  if (injuryRisk !== undefined && injuryRisk !== "group" && injuryRisk !== "spot") throw new Error(`the save's injuryRisk is ${JSON.stringify(injuryRisk)}, which this version does not know`);
  if (aging !== undefined && aging !== "position" && aging !== "ability") throw new Error(`the save's aging is ${JSON.stringify(aging)}, which this version does not know`);
  if (abilityCurves !== undefined && abilityCurves !== "D" && abilityCurves !== "B") throw new Error(`the save's abilityCurves is ${JSON.stringify(abilityCurves)}, which this version does not know`);
  if (techniqueKnee !== undefined && typeof techniqueKnee !== "boolean") throw new Error(`the save's techniqueKnee is ${JSON.stringify(techniqueKnee)}, not true or false`);
  if (smartsSnaps !== undefined && !(typeof smartsSnaps === "number" && Number.isFinite(smartsSnaps) && smartsSnaps >= 0)) {
    throw new Error(`the save's smartsSnaps is ${JSON.stringify(smartsSnaps)}, not a number of points 0 or more`);
  }
  return settleAging({
    ...(aging === undefined ? {} : { aging }),
    ...(abilityCurves === undefined ? {} : { abilityCurves }),
    ...(techniqueKnee === true ? { techniqueKnee: true } : {}),
    ...(smartsSnaps === undefined ? {} : { smartsSnaps }),
    ...(injuryRisk === undefined ? {} : { injuryRisk }),
  });
}

/** Do two sets of options play the same rules (both settled)? */
export function sameAging(a: AgingSwitches, b: AgingSwitches): boolean {
  return agingLabel(a) === agingLabel(b);
}
