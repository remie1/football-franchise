# Visual Style Guide — v1

Owned by the art-director agent. This fills the structure in Spec #9 §4 (`docs/design/art-style.md`) and is binding on `apps/game`.
The owner approved it on 2026-10-31 after several rounds on a mockup page. That page is saved next to this file as
[`style-sheet-v1.html`](style-sheet-v1.html) and is the visual reference. Open it in a browser.
Chosen process for art: AI-generated under strict guideline (Spec #9 §7).

## 1. Two looks, one skeleton

The game has two looks (Spec #9 §3). Never mix them on one screen.

| Look | Where | Feel |
|---|---|---|
| **The office** (register A) | hub, calendar, advance, staff, scouting, contracts, draft room, conversations, post-game staff debrief | quiet, matte, paper, painted block |
| **The broadcast** (register B) | gameday, score, box score, play-by-play, standings, news, rankings, awards | near-black, high contrast, loud |

Rule of thumb: if the public can see it, it's the broadcast. If only the organization can, it's the office.

Both looks share one type scale and one spacing scale (§4). Only the surface treatment changes.

## 2. Colors

### The office

| Name | Hex | Use |
|---|---|---|
| Oatmeal | `#ede5d3` | page ground (paper) |
| Legal pad | `#f6f1e5` | cards and pads |
| Ink | `#2b2723` | text, the advance button |
| Oxidized green | `#3e5c4a` | good news, "staff handled it", rating ranges |
| Oxblood | `#6e2a2a` | "needs you" |
| Warm grey | `#8a8278` | secondary text |
| Rule | `#cfc5b0` | lines |

### The broadcast

| Name | Hex | Use |
|---|---|---|
| Broadcast black | `#0b0e0d` | ground |
| Panel | `#141a18` | boxes |
| Line | `#26302c` | dividers |
| Studio white | `#f2f5f3` | text |
| Muted | `#8c9893` | labels, secondary text |
| Signal green | `#22e584` | a score or a win (the winner's final score) |
| Hot red | `#ff4040` | a turnover or an alert |

The broadcast's green and red are the office's green and oxblood pushed to full strength (Spec #9 §3.2). The owner ruled
on 2026-10-31 to keep green for a score or a win and red for a turnover.

### Team colors

- Each team has two colors and a simple mark (a shield, a badge, a star). The **brighter** of the two draws the team's
  stripes and bars on the broadcast, so it reads on near-black.
- On the broadcast, the away team's bars are **striped** and the home team's are **solid**, so the teams never rely on
  color alone.
- Team colors never replace the page's own meaning colors: a score is always signal green and a turnover always hot red,
  whoever is playing.
- **Teams sit in the real NFL cities with our own names, colors and marks** (owner, 2026-10-31). Nothing may copy or
  come close to a real team's name, colors, logo, uniform or wordmark (Spec #9 §8).
- Samples on the reference page: Denver Prospectors (pine `#2f5d4e`, sand `#d9c08c`, a peak on a shield), Kansas City
  Marshals (slate `#3d4a5c`, copper `#c07a3e`, a marshal's star). The full 32-team set is still to be drafted for the
  owner's review.

## 3. Fonts

All from Google Fonts, each with a fallback.

| Role | Face | Fallback |
|---|---|---|
| Office headings | **Courier Prime** (typewriter), owner's pick | Courier New, monospace |
| Office memos and scout's notes | Courier Prime | Courier New, monospace |
| Broadcast headings, team names, big numbers | **Barlow Condensed** 600/700/800, owner's pick | Arial Narrow, sans-serif |
| Body text (both looks) | Public Sans 400-700 | system-ui, sans-serif |
| Data: clock, drive lines, stat details | IBM Plex Mono 400-600 | ui-monospace, monospace |

Broadcast headings are uppercase with a little letter-spacing. Digits that line up in columns use tabular figures.

## 4. Scale and spacing

- Type scale: 0.8125, 1, 1.25, 1.6, 2.25, 3.5 rem.
- Spacing: 4, 8, 12, 16, 24, 40 px.
- Text-heavy screens keep running text near 65 characters wide.
- Every screen works down to phone width with no sideways scrolling.

## 5. The office: rules

- The **advance button** is the one bold thing on its screen (Spec #8 §2). Everything else stays quiet.
- "Waiting on you" items carry a stamp: oxblood **YOU** or green **STAFF**.
- Ratings show as ranges, never one number (Spec #8 §6). A short solid bar means the staff is sure, and a long faded bar
  means they're guessing.
- Scouts' notes are typed and signed by the scout who wrote them.

## 6. The broadcast: the box score

The order from top to bottom is the score box, then Team totals and Leaders side by side, then Play-by-play.

### Score box

- The away team is on the left and the home team on the right. Each side has the mark, the city and record (small), the
  team name, and the score as a big number. The winner's score is signal green.
- **FINAL** sits in the middle, with the **quarter line directly under it**. There is no separate quarter-score box.
- The quarter line has columns 1 to 4 (plus OT when played) and **no total column**, because the big numbers show the
  total. Leave a little room between the numbers, and draw a thin line between the quarter numbers and the scores.

### Team totals

- The header has each team's mark and abbreviation on its own side (away left, home right).
- Each row reads: away value | category | home value. A split bar runs underneath in the two teams' colors.
- **The bar splits by the first number as it stands, not by who did better.** If Denver had 1 turnover and Kansas City
  had 0, the bar is all Denver. A red zone line of 2/2 against 2/4 splits evenly. If both teams are 0, the bar splits
  evenly.
- Rows, in order: Total yards, Turnovers, 1st downs, Penalties (`flags-yards`, for example `5-41`; the bar splits by
  flags), 3rd down, 4th down, Red zone, Possession (the bar splits by seconds).
- No Sacked row. No caption under the box.
- Until the engine calls penalties (ADR-093), Penalties shows `0-0` for both teams.

### Leaders

- The header has the marks and abbreviations, as in Team totals.
- Each row reads: away leader's name and detail | **big number** | category | **big number** | home leader's name and
  detail.
- Categories, in order: **Passing yards, Rushing yards, Receiving yards, Sacks, Tackles.**
- The category's own stat appears only as the big number, never again in the detail line.
- Details are separated by commas, not bullets (`21/33, 1 TD`). Any stat that is 0 is left out (`6 rec`, not
  `6 rec, 0 TD`).
- Tackles show solo tackles only in the detail (`6 solo`). The assisted count is never shown, because total minus solo
  gives it.

### Play-by-play (scoring summary)

- It covers **all quarters**, each starting with a small quarter row (1st quarter, 2nd quarter, ..., Overtime). A
  quarter with no score is skipped.
- Each score is one row: the game clock (no down and distance) | the scoring team's mark | the score type spelled out in
  **bold white** (`Touchdown`, `Field Goal`, `Safety`) followed by the play, with the kick or try in parentheses |
  the score after the play on the right.
- Under the play is the drive line in the data face: `13 plays, 75 yards, 6:49`, where the time is the drive's length.
- The score on the right includes the extra point or two-point try. Each number has a small team abbreviation under it,
  and the scoring team's number is the brighter one. There are no column heads or marks at the top of the box.

## 7. Out of bounds

- Real NFL team names, marks, colors, uniforms and wordmarks, or anything close to them (Spec #9 §8).
- Real people's names or likenesses anywhere in art. Stand-in builds generate no portraits (Spec #9 §8).
- Emoji as icons. Color as the only signal (use stripes, stamps, words or position as well).
