# ADR-002: Reserve `leagueContext` in the save format

- **Date:** July 2026
- **Proposed by:** Orchestrator, acting on a fantasy-advisor watch item (Spec #10 §4)
- **Status:** **RATIFIED** (owner, July 2026)

## Need

Spec #10 §4 flags that `SaveFile` is single-world today, and that fantasy mode would need multiple participants' worlds sharing a league identity and a common real-data feed version. Adding an extension slot before v1 freeze is cheap; adding it after saves exist in the wild is a migration.

## Proposal

`SaveFile.leagueContext?: unknown` — an optional, untyped reserved slot. No behavior, no consumers, no cost. Claimed and typed by a future fantasy-mode spec via petition.

## Impact

None on any current domain. Removes red line #2 from Spec #10 §5.

## Decision

Ratified. Implemented in contracts v0 (`packages/contracts/src/save.ts`).
