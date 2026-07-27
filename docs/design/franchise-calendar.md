# SPEC #5 — FRANCHISE CALENDAR

**Status:** Draft for owner review
**Owner agent:** `franchise-engine`
**Governed by:** ARCHITECTURE_CHARTER.md §3-D5; calendar vocabulary fixed in Spec #1 §7
**Hooks consumed by:** Specs #6, #7, #8, #11, #12, #13, #14 (registry in §12)

## 1. PURPOSE & THE TWO DESIGN TARGETS

The calendar is the game's skeleton: an explicit state machine that advances time, fires deadlines, opens and closes decision windows, and tells every other system when to act. It carries two non-negotiable targets:

1. **Low floor, high ceiling.** The minimum a user must do between games is very small (advance the week; everything unhandled resolves through staff). The maximum is very large. Both must be first-class experiences — the lite player is not playing a degraded version, and the deep player is not doing busywork. (Spec #11 §11.1.)
2. **The clock is externally drivable.** Time advances by explicit call, not by hardwired user action. The game proper drives it from user input; the tutorial drives it on an authored schedule; fantasy mode would drive it from the real-world calendar (Spec #10 red line #4). No system may assume "time moves only when the user presses next."

Boundaries: the calendar *schedules* — it never contains cap math, market pricing, perception updates, or sim logic. It fires typed events; owning systems do the work.

## 2. THE CLOCK MODEL

```ts
advance(world, to?: CalendarStamp): { world, events }   // idempotent, deterministic
```

`CalendarStamp = { season, phase, week, day }` (Spec #1 §7). Days matter because real deadlines land on specific days at specific hours (4pm Wednesday cap compliance), and offseason drama is day-scaled. Advancing emits `CALENDAR_PHASE_ENTERED`, `WEEK_ADVANCED`, and `DEADLINE_REACHED` events in order; every deadline is **data**, not a scattered conditional:

```ts
interface Deadline {
  id: string; stamp: CalendarStamp; authority: Authority;
  blocking: boolean;              // must user resolve, or does staff auto-resolve?
  autoResolve: (world) => Decision[];   // the delegation path
}
```

**Blocking rule:** almost nothing is truly blocking. Cap compliance is (the league enforces it), and even then staff auto-resolve produces a legal, possibly ugly, outcome. Everything else advances with staff decisions logged for review — the mechanical expression of target #1.

## 3. IN-SEASON: THE WEEKLY LOOP

Each regular-season week is a **task board** of optional work, each item delegable to a staff seat. Doing nothing is valid; doing everything is a rich week.

| Task | Owner seat if delegated | Feeds |
|---|---|---|
| Opponent prep / film study | OC/DC + advance scouts | GameplanPacket (Spec #11 §4.1) |
| Practice allocation (install vs. reps vs. rest) | position coaches | DevelopmentTick, stamina, PlaybookInstall |
| Injury & load management | S&C + medical | availability, soft-tissue risk |
| Depth chart & package design | coordinators | personnel groupings |
| Roster churn (practice squad, waivers, workouts) | GM seat | roster |
| Scouting assignments (college + pro/advance) | scouting director | perception (Spec #6 §3) |
| Player check-ins | Player Engagement director | personality reads (Spec #14 §5) |
| Media obligations | HC (user) or PR | narrative heat, reputation |
| Contract conversations (in-window) | cap manager | Spec #14 §4 |

The board is generated from league state, so it naturally thickens near deadlines (trade deadline week, waiver runs) and thins in quiet stretches.

**Bye week** is a distinct, richer board: the self-scout summit from the design notes (regional college scouts recalled, preliminary draft board reviewed against the coach's scheme), deep rest allocation, and a lightweight staff evaluation checkpoint.

**Gameday** offers three entry points, all legitimate: play it (full in-game screen), spot-manage (decision moments only — 4th downs, timeouts, challenges, halftime), or simulate from the schedule screen and read the result. The week's prep applies identically in all three.

## 4. THE SEASON ARC

`TRAINING_CAMP` → `PRESEASON` → `REGULAR_SEASON` → `PLAYOFFS` → offseason phases.

- **Training camp:** installs, position battles, cut-downs, the heaviest reveal window for your own rookies (Spec #6 §4). Camp injuries land here — high narrative weight.
- **Preseason:** limited-exposure games; evaluation value vs. injury risk is the real decision.
- **Regular season:** 18 weeks, weekly loop above; **trade deadline** (Tuesday of Week 10 per the design notes) is the season's one hard transaction cliff.
- **Playoffs:** bracket advancement; eliminated teams enter offseason prep early (a real competitive advantage in scouting time — worth modeling, since it rewards bad teams with head starts exactly as reality does).

## 5. THE OFFSEASON: FIVE PHASES

Taken from the owner's original notes, preserved with their real deadline structure.

### Phase 1 — Evaluation & Contract Management (February) `OFF_EVAL`
- Immediate retirements (players who already knew)
- **Spring-bonus pressure:** players without spring bonuses go year-to-year unbothered; players *with* them get pushed by the team to decide before the bonus triggers. Teams may claw back unearned portions (retire in summer → owe it all; half a season → owe half). The Andrew Luck case is the authored exception: a team may waive clawback to avoid a PR and union fight — a real choice with reputation consequences.
- Post-June-1 designations (two per team) usable early for cap spreading
- **Franchise tag window** (2 weeks, late Feb)
- Player evaluations; **staff evaluation period** (Spec #11 §8)
- Coaching carousel resolves here (§8)

### Phase 2 — Roster Resets & Free Agency (March) `OFF_RESET_FA`
Day-precise, because this is the year's most dramatic week:
- Scouting Combine
- Slower retirements (reflection-driven; cluster at FA open)
- Franchise tag lockdown — first Tuesday of March; long-term deals negotiable until mid-July
- **Legal tampering** — 48 hours, from second Monday
- **Cap compliance — 4pm, second Wednesday** (the only hard-blocking deadline)
- *The Madness:* the preceding night and morning of restructures, sudden trades, and releases. Per the notes: trades filed with the league before 4pm earn conditional credit against submitted budgets even though the trade window hasn't opened.
- RFA/ERFA tenders due 4pm second Wednesday; contracts expire; trade window opens; **free agency begins** — all at the same instant
- Annual league meeting (late March/early April, 4 days) — §9

### Phase 3 — `OFF_DRAFT` (April)
Spring workouts phase one; **the NFL Draft**; UDFA scramble

### Phase 4 — `OFF_ROOKIES_OTAS` (May)
Rookie minicamp; spring phase two; OTAs; scouts receive regional assignments and build spring lists

### Phase 5 — Summer `OFF_SUMMER` (June–July)
- **June 1 cuts**; late retirements (loyal players wait until June 2 so the cap hit spreads across two seasons — a mechanic that rewards player-team affection)
- Mandatory minicamp (mid-June); pro cross-scouting begins
- **Franchise tag deadline** (mid-July)
- **Dead period** (4–6 weeks): facilities closed, contact banned — a genuine pause with narrative use (surgeries, private training, life events)
- Last retirements as camp opens and veteran bodies vote

## 6. FREE AGENCY AS A MARKET, NOT A GUESS

The design notes' central complaint — Madden's "guess the number" — is fixed structurally. Each free agent carries a **price expectation** (his and his agent's belief) formed from positional market, his own perceived value, and comparable recent deals. Signings **reset the market**: when a tier-1 player at a position signs, remaining players' expectations recalculate against it.

- **Premium window** (tampering + first 24 hours): blue-chip players set positional prices.
- **Value window** (days 4–14): front offices repriced; mid-tier vets and role players on team-friendly multi-year deals; teams fill holes so they aren't forced to draft out of need.
- **Bargain basement** (post-draft → camp): aging vets, specialists, returning-injured, cheap one-year prove-its.

Phase 3 doesn't need to be scripted — it *emerges* from players whose expectations went unmet in phases 1–2. Offers are evaluated as weighted need satisfaction (Spec #14 §4), not by price alone, so hometown discounts and "he took less to win" fall out naturally.

## 7. SCOUTING CALENDAR

Runs year-round beneath everything (design notes): spring regional lists (May) → pro cross-scouting for free agents and opponents (June) → road grind and advance reports (Aug–Dec, area scouts on college practices and Saturday games; advance scouts on opponent tendencies and the waiver wire) → draft board meetings and all-star games (Dec–Jan) → the funnel (combine interviews and medicals in Feb, pro days in March, top-30 visits and final board of 120–150 in April, with DND grades culling on medical, character, and scheme fit). Each stage is a perception-update source (Spec #6 §3) with its own confidence curve.

## 8. THE COACHING CAROUSEL

Fires in Phase 1: league-wide HC/coordinator vacancies open, candidates interview (fashion-weighted per Spec #12 §4.1, org-weighted per `trendReceptivity`/`schemeOrthodoxy`), and your successful coordinators get poached. Staff contracts, firings with dead money, and the staff budget reset land here (Spec #11 §6). The user's own seat is evaluated too — hot-seat resolution and, if it happens, the head-coaching search that places them elsewhere (Spec #13 decision 2).

## 9. ANNUAL LEAGUE EVENTS

Annual meeting (rule changes needing 24 of 32; stadium requirements forcing capex; broadcast/streaming money; international expansion), the **players' association survey** publishing team grades (Spec #14 §2), awards, **fashion recomputation** (Spec #12 §7 — once per offseason plus light in-season drift), salary cap setting for the new year, and the schedule release.

## 10. THE PRESIDENT LAYER (NPC in v1)

Revenue cycle from the design notes runs on the same calendar — winter sponsorship and suite renewals, ticket/concession pricing, spring stadium bookings, June budget lock, preseason readiness, weekly per-cap audits in the fall. In v1 an NPC president resolves these, and the outputs the user *feels* are: staff budget size, facility quality (feeding the survey and free-agent needs), and owner pressure. All decision types are already `PRESIDENT`-tagged, so making it playable later is a permission change, not a rewrite.

## 11. THE TUTORIAL OVERLAY

The tutorial season (Spec #13) does not fork the calendar. It runs the ordinary calendar with a narrative-driven unlock schedule over the same delegation toggles, which is why §1's target #1 and §2's external drivability both matter structurally rather than cosmetically.

## 12. HOOK REGISTRY (what fires where)

| Hook | Phase/timing | Spec |
|---|---|---|
| Perception reveal curves | camp (heavy), weekly by snaps | #6 §4 |
| Staff evaluation period | Phase 1; light bye-week version | #11 §8 |
| Staff budget reset & salary demands | Phase 1 | #11 §6 |
| Coaching carousel | Phase 1 | #11, #12 |
| Fashion recomputation | post-playoffs, per offseason | #12 §7 |
| Players' survey publication | Phase 2 | #14 §2 |
| Career-stage need reweighting | season rollover | #14 §2 |
| Tutorial unlock schedule | weekly, season 1 | #13 §2 |
| Narrative arc ticks | weekly + phase entry | #7 |
| Weekly availability import (fantasy) | weekly | #10 |

## 13. THE ADVANCE BUTTON (the game's heartbeat)

Advancing time is not plumbing — it is the primary recurring interaction of the whole game, and it should carry **anticipation every single press**.

**Behavior:** one control ("continue" / "done for the day"). Pressing it runs the clock forward, day by day, until *something worth stopping for* happens — then halts and presents it. The user never manually walks through empty days, and never skips past something that mattered.

**What halts the clock (an interrupt queue, not a fixed schedule):**
- Scheduled league events — deadlines, tag windows, the draft, cap compliance, camp opening
- Team-driven events — a signing that resets the market, a coordinator interview request, a completed scouting report
- **Narrative interrupts (the point of the feature)** — a player's hand injury at a Fourth of July gathering, an arrest at 2am surfaced by the security director, an agent calling with a demand, a retirement announcement, a rival's blockbuster trade, a media story breaking about your locker room

Because the narrative engine can inject an interrupt on *any* day, the button is genuinely suspenseful: the dead period stops being a skipped month and becomes a stretch where anything might arrive. This is the mechanism that makes the offseason a second game rather than menu maintenance — the owner's original "two games in one" framing, delivered.

**Rules:** interrupts carry severity, and only meaningful ones halt (low-severity items collect into a digest shown at the next stop, with a user-set sensitivity threshold). Interrupt generation is seeded and deterministic like everything else. Delegation applies: an interrupt whose decision is delegated resolves through staff and appears in the digest rather than halting. Under the hood the clock advances the same way it always does (§2), so the tutorial and any future fantasy mode drive it identically.

## 14. DECISIONS (formerly open questions — resolved)

1. **League structure is data, not constants** — `LeagueRules` holds game count, playoff berths, byes, roster/practice-squad limits, tag rules, cap formula, and deadline placements, defaulting to current reality. **"Configurable" means the values live in data, not that the user edits them in a menu.** Two payoffs: the annual league meeting's rule votes (24 of 32) can actually mutate them, giving that feature real mechanical teeth per the design notes; and calibration can replay historical seasons whose structures differ without hard-coded constants silently corrupting baselines.
1a. **Rule-change tiers — the league may not restructure itself behind the user's back.** `LeagueRules` being data does *not* mean the AI league freely rewrites it. Changes are tiered by blast radius:

   - **Tier A — Competitive/operational** (kickoff and overtime rules, penalty emphases, injured-reserve and practice-squad mechanics, tampering windows, deadline placement, tag formulas): the annual meeting may pass these autonomously on a 24-of-32 vote. They create the texture the design notes wanted — playbook and player-targeting consequences — without destabilizing the world.
   - **Tier B — Structural** (adding or removing a game/week, expanding or contracting the league, changing playoff field size, relocation, major cap-formula rewrites): may be *proposed*, debated, and reported on — the narrative value is in the debate — but **cannot pass without the user's assent.** The user's vote is not formally weighted differently in fiction; mechanically it is decisive.
   
   **Tier B votes carry an in-fiction stakes voice.** Before such a vote resolves, a character with standing — a league veteran, a longtime beat writer, the team historian — plainly states what changes forever: shorten the season and the league stops looking like the one everyone grew up with; records set from that point no longer sit beside the heroes of the past; every stat going forward lives in a different frame. It informs without blocking, and the character remembers how the user voted. (Pattern spec'd in Spec #7 §8.)

   Rationale: the user chose the world they want to run a franchise in, and having it restructure autonomously across a long save feels arbitrary rather than alive. Tier B changes also break comparability for calibration and for the user's own multi-decade sense of their franchise's history.

1b. **The owners' meeting is deferred for granular design** (Spec #15, backlog). It needs its own treatment: proposal generation, bloc formation and vote-trading, which owner personalities favor what, how `trendReceptivity` and revenue interests shape positions, and how outcomes propagate to schemes, stadiums, and money. The tiering above is the interim guardrail, not the finished system.

2. **The trade deadline follows the same rule** — fixed at the notes' default (Tuesday of Week 10), changeable only by league vote, exactly as in reality. Not a user setting.
3. **Time granularity: hybrid, driven by the interrupt queue** (§13). Day-precision inside high-drama windows, automatic multi-day advancement elsewhere, always halting on the next event — scheduled *or* narrative.