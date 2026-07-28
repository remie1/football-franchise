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
 * More rushers than the card has men to block them.
 *
 * NOT a bad card and NOT a bad defensive call — it is a real football situation
 * (an overloaded blitz) that the engine cannot resolve, because §7.4 blitz pickup
 * is unimplemented and `simulatePassPlay` throws `UnsupportedPlayCallError` on a
 * rusher with no `ProtectionAssignment`. Rather than hand the engine a card it
 * will reject three layers down, the pairing refuses here, where the caller can
 * pick a different card.
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
