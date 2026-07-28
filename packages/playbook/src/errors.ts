/**
 * Loud failures. Charter §4.1: prefer a loud failure to a silent default.
 *
 * Nothing in this package returns a fallback card, a default lane or a
 * best-effort pairing. A corpus that quietly substitutes something plausible when
 * a card does not fit is how a batch of 3,000 games comes back clean and wrong —
 * `CALIBRATION-BACKLOG.md` entry 3a's exact failure mode.
 */

/** Base class, so a consumer can catch everything this package throws in one clause. */
export class PlaybookError extends Error {
  constructor(message: string) {
    super(`@ff/playbook: ${message}`);
    this.name = "PlaybookError";
  }
}

/** A depth chart could not fill a personnel grouping's roles. */
export class PersonnelUnavailableError extends PlaybookError {
  constructor(message: string) {
    super(message);
    this.name = "PersonnelUnavailableError";
  }
}

/**
 * A protection could not be built at all — a protector role the personnel package
 * did not fill.
 *
 * **THIS USED TO MEAN SOMETHING MUCH BIGGER, AND THAT MEANING IS GONE (ADR-023).**
 * It was raised whenever a front had more rushers than the card had men, on the
 * stated ground that "§7.4 blitz pickup is unimplemented in the engine, so a free
 * rusher cannot be simulated". §7.4 landed with ADR-022; a free rusher now resolves;
 * and the refusal was the playbook half of `CALIBRATION-BACKLOG.md` entry 21 —
 * protection that looked perfectly informed because every front it could not answer
 * was declined rather than played. An unpaired rusher now comes free and is reported
 * in `ProtectionResult.unblocked`.
 *
 * The class stays, with a narrower and still-loud job, because a role with no player
 * behind it is a personnel error and there is no plausible substitute to make up.
 * Consumers that catch it to re-draw a concept (calibration's frozen caller) will
 * simply stop seeing it, which is what closing entry 21 looks like from outside.
 */
export class UnprotectableCallError extends PlaybookError {
  constructor(message: string) {
    super(message);
    this.name = "UnprotectableCallError";
  }
}

/** A card referenced something the opposing card does not contain. */
export class UnresolvableAssignmentError extends PlaybookError {
  constructor(message: string) {
    super(message);
    this.name = "UnresolvableAssignmentError";
  }
}

/** `assertValid*` found diagnostics. Carries them so a caller can print all of them. */
export class InvalidCardError extends PlaybookError {
  readonly diagnostics: readonly { readonly code: string; readonly where: string; readonly message: string }[];
  constructor(
    subject: string,
    diagnostics: readonly { readonly code: string; readonly where: string; readonly message: string }[],
  ) {
    super(
      `${subject} is invalid:\n` +
        diagnostics.map((d) => `  [${d.code}] ${d.where}: ${d.message}`).join("\n"),
    );
    this.name = "InvalidCardError";
    this.diagnostics = diagnostics;
  }
}
