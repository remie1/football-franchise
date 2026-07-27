# SPEC #11 — COACHING & STAFF

**Status:** Draft for owner review
**Owner agent:** `franchise-engine` (staff are franchise entities; effects cross into engine/development via contract channels)
**Governed by:** ARCHITECTURE_CHARTER.md; Spec #1 types; Spec #6 perception rules (which apply to coaches wholesale)
**Feeds:** Spec #5 (calendar hooks: hiring cycle, evaluation periods, staff budget), Spec #7 (narrative sources)

## 1. PURPOSE & THE GOVERNING PRINCIPLE

Coaches are the second population of rated, perceived, hired, developed, and poached entities in the game. One principle organizes everything:

**Attributes govern NPCs; humans govern themselves.** When the human holds an authority seat (v1: COACH+GM), the *decisions* attached to that seat are made by the human's actual skill — no rating mediates them. Everything a staff seat contributes *passively* (teaching, development, culture, evaluation precision, game-plan quality from subordinate staff) always flows from the employed NPC in that seat. The human never has ratings; the human's coordinators, position coaches, and scouts always do. This is also why staff quality matters to a human coach at all: you make the calls, but your staff determines how well-prepared, well-developed, and well-scouted the team you're calling for is.

## 2. STAFF STRUCTURE (v1 mechanical roster)

| Seat | Count | Mechanical role |
|---|---|---|
| Head Coach (HC) | 1 (human in v1) | decision seat + culture/staff-development umbrella |
| Offensive / Defensive Coordinator | 2 | scheme identity, game-planning, unit play-calling (when delegated), unit development multiplier |
| Special Teams Coordinator | 1 | ST unit quality, simplified in v1 |
| Position coaches | ~8 | per-group development, technique, playbook teaching, positional evaluation input |
| Scouting Director + scouts | 1 + pool | perception machinery (Spec #6): assignment capacity, accuracy, bias profile |
| Strength & Conditioning | 1 | stamina recovery rates, soft-tissue injury modifier (simplified v1) |

Narrative-only staff (Director of Player Engagement, team security, PR chief, cap manager voices) remain Spec #7 characters without mechanical attribute sheets in v1.

## 3. THE COACH ATTRIBUTE SHEET (registry pattern, coach namespace)

Same versioned-registry machinery as players (Spec #1 §2, separate namespace `CoachAttrId`) — so calibration's sensitivity/correlation mandates apply to coach attributes too, and kill/merge stays cheap. v0 sheet, grouped by timescale:

**Game-scale:** `gamePlanning` (weekly opponent-prep quality), `inGameAdjustment` (halftime/rolling counter-punching), `situationalJudgment` (4th down, clock, timeouts, challenges — governs NPC decision quality and the *quality of recommendations* surfaced to a human), `playCalling` (tendency discipline, sequencing, disguise), `schemeDesign` (how much juice the scheme adds to its fitting play types).

**Season-scale:** `development` (per position coach: technique growth), `teaching` (playbook install speed — the Greenlaw mechanic's rate constant), `motivation` (week-to-week effort variance damping; letdown-game resistance), `culture` (morale drift anchor, ego management), `talentEvaluation` + bias profile (Spec #6 §5 — the seat-level source of organizational evaluation identity).

**Career-scale:** `staffDevelopment` (HC/coordinators growing assistants — the Bill Walsh tree engine), `mediaHandling` (pressure absorption; narrative heat shielding), `gravity` (free-agent attraction: contract-demand discount for playing here), `politics` (owner/president relationship durability — hot-seat resistance).

Plus non-attribute **profile facts:** scheme identity (offense/defense family + variant), coaching lineage (tree ancestry), age/experience, personality type (interacts with player personality types for the style-match question — see §5), origin (NFL / college / **former player**: retired players enter the coaching pipeline with attributes seeded from their playing-era footballIQ/awareness/experience, per the design notes).

## 4. EFFECT CHANNELS (every attribute names its consumption point)

Charter's mechanic-not-narrative check, applied seat by seat. All engine-touching effects arrive as **bounded modifier packets through contract channels** — the same pattern as weather/stamina; the engine never knows *why* a modifier exists.

1. **GameplanPacket (weekly, opposed):** both staffs run prep checks (`gamePlanning` vs opponent's, informed by film/scouting quality). Output: bounded modifiers on specific play-type/matchup families ("their left-side protection schemes −X this week") plus tendency intel accuracy. This is the design notes' Super-Bowl-anecdote system: prep, counter-prep.
2. **AdjustmentPacket (halftime + rolling):** `inGameAdjustment` checks re-cut the GameplanPacket mid-game — anticipating the opponent's adjustment is an opposed check against *their* adjustment rating (the chess note, made mechanical).
3. **NPC decision quality:** `situationalJudgment` + `playCalling` parameterize the AI play-caller for NPC-coached teams (and are exactly what the frozen calibration caller does NOT use — calibration's caller stays coach-agnostic; coach effects layer only in the game proper). For the human: these attributes gate the *quality of staff recommendations* (suggested plays, 4th-down advice), never override the human's call.
4. **DevelopmentTick (weekly/offseason):** progression checks per player driven by position coach `development` × coordinator/HC multipliers × player age/potential × snap experience × scheme fit × **style match** (§5). Owns the Mac-Jones-elsewhere phenomenon: the same true player develops differently under different staff.
5. **PlaybookInstall:** new arrivals carry an awareness/assignment penalty decaying weekly at a rate set by `teaching`, playbook similarity (scheme-family distance), and the player's footballIQ — the Greenlaw anecdote as shipped math.
6. **Scheme fit:** a player's execution gets a bounded situational modifier from fit between his attribute shape and the scheme's demands. Legal under the iron boundary (Spec #6 §1) because fit is *real physics* — like weather — not belief.
7. **Discipline & communication:** `culture`/`teaching` feed the engine's existing pre-snap penalty and miscommunication checks (crowd-noise system) as small bounded modifiers.
8. **Morale anchor:** `culture` sets the drift target morale returns toward between narrative shocks.
9. **Perception precision:** already specified — Spec #6 §5's per-organization profile is *assembled from these seats* (scouting director dominant, position coaches contributing positional evaluation, HC weighting).
10. **Gravity & staff economics:** `gravity` discounts player contract demands; staff salaries live in §6.

## 5. STYLE MATCH (the intangibles question, scoped)

Personality **types**, not ratings (per the old notes): coaches and players each carry a type tag (e.g., demanding / players-coach / cerebral / fiery). A small compatibility matrix multiplies DevelopmentTick and morale effects — some players respond to aggressive coaches, others wilt (the owner's original question, answered as a mechanic). Matrix values are tunables; types are perceivable facts (learnable through interviews, agents, and staff insight) so acquisition decisions can *use* them.

## 6. THE STAFF ECONOMY (perception decision #1's tradeoffs, formalized)

- **Staff budget** is a real, separate cap funded by franchise revenue (president-level performance — in v1, NPC-president decisions set it, influenced by owner pressure and team success; a future playable president controls it directly).
- **Rising demands:** staff attributes grow (experience, `staffDevelopment` exposure, success); grown staff demand raises — sustaining an elite staff is a treadmill by design. You cannot afford elite everywhere: evaluation excellence vs. development excellence vs. game-planning excellence is a portfolio choice, exactly the specialization tradeoff the owner mandated.
- **Poaching & the tree:** rivals hire your successful coordinators away (HC vacancies league-wide each offseason). The tree working *means* losing people — and Spec #6's staff-insight rule fires in reverse: your departed OC takes high-confidence beliefs about your roster to a rival. Compensation: your `staffDevelopment` reputation attracts better junior applicants (the pipeline replenishes).
- **Contracts:** staff deals have years/salary; firing carries dead money against the staff budget.

## 7. HIRING: DRAFTING WITH A RÉSUMÉ

Coaches get the full Spec #6 treatment — true sheet hidden, per-organization perceived bands, biased evaluation. Source families, with the player-pipeline symmetry made explicit:

| Family | Coach version | Contamination warning |
|---|---|---|
| Track record | unit rankings/win% under their tenure | **Family-D problem verbatim:** a top-5 defense may be talent, not coaching — orgs with production-over-context bias hire the coordinator the roster made look good |
| Lineage | coaching tree ancestry ("worked under X") | pedigree anchoring, coach edition |
| College accomplishments | scheme innovation, development record | translation risk (college→pro) |
| Interviews | scheme articulation, plan quality | small, noisy mental signal |
| Reputation tags | earned through observed behavior over seasons | lagging, media-amplified |
| Former-player career | playing-era profile seeds priors | great player ≠ great teacher (bias trap included) |

## 8. EVALUATION PERIODS (perception decision #2, scheduled)

An offseason calendar step (Spec #5 hook, Phase-1 Feb window): the player reviews staff performance dashboards (development deltas of coached players, prep-check hit rates, penalty trends), hears **primary coaches brief on positional coaches** — filtered through the briefer's own `talentEvaluation` accuracy and politics (coordinators protect their guys) — and may crystallize conclusions ("overrates speed") into recorded profile beliefs that inform future weighting. In-season, a lightweight bye-week version exists. Evaluation of staff is itself perception, subject to the same wrongness rules.

## 9. AI HEAD COACHES

For NPC teams, the HC entity + coordinator sheets ARE the organizational personality: play-calling tendencies, 4th-down aggression, trade/FA appetite, and the evaluation-bias profile all derive from the employed staff. When a rival fires its HC, its organizational behavior *actually changes* — league texture emerges from staff turnover rather than static team personalities.

## 10. CALIBRATION & DERIVATION NOTES

- Effect sizes (packet bounds, dev rates, install curves) are tunables under calibration's sensitivity mandate — a coach attribute that moves nothing dies like any other.
- Real-coach derivation in v1 is deliberately shallow: archetype + market signals (job history, salary) + a few public analytics (4th-down decision quality is publicly modeled; penalty rates; development résumés). Deep coach derivation is a post-v1 luxury; fictional-mode coach generation matters more and uses the same latent-vs-observable split as rookie generation (Spec #4 §6).

## 11. DECISIONS (formerly open questions — resolved)

1. **Delegation: maximal, layered.** Every duty — in-game play-calling, clock/4th-down management, weekly prep tasks, practice allocation, scouting assignments, and *playing the game at all* — is delegable. From the schedule screen a user may simulate a game outright and never open the game screen; what they did during the week still shapes it. Design targets: **minimum weekly effort very low, maximum very high.** Whatever the user doesn't do resolves through employed staff off their attributes (§1's principle doing its work: unheld duties revert to NPC ratings). UX shape: simple "layer 1" involvement toggles that open and close whole mechanic groups; expect heavy playtest tuning. Spec #8 (UI) owns the toggle surface; Spec #5 (calendar) owns which weekly tasks exist to delegate. Note: the same toggle machinery powers the tutorial season's progressive unlocking (Spec #13).
2. **Era drift: emergent, not prescriptive** — see Spec #12. Coaches carry plain aging/growth curves in v1; scheme *fashion* is a retroactive narrative layer over simulated results, never a designer-declared claim about what actually works. "Accomplished but out of style" hiring risk is an explicit intended scenario.
3. **College pipeline: small curated pool in v1**, full pipeline later.
