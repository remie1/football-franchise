# Football Franchise

A single-player American football management simulation. Governed by `ARCHITECTURE_CHARTER.md`.

## Start here
**New to this repo? Read `HANDOFF.md`** — repo setup, first Claude Code session, and working habits.

## Getting started (any device)
1. Install Node 20+, pnpm, and Claude Code
2. `git clone <this repo> && cd football-franchise`
3. `pnpm install`
4. `claude` — the orchestrator constitution (`CLAUDE.md`) and nine sub-agents (`.claude/agents/`) load automatically

## Map
- `ARCHITECTURE_CHARTER.md` — the constitution (read first)
- `CLAUDE.md` — orchestrator routing rules
- `docs/design/` — specs (contracts, match-engine, ...)
- `docs/decisions/` — ADRs / contract-change petitions
- `packages/` — domain packages (import only `@ff/contracts`)
- `apps/game` — browser UI (zero game logic)
