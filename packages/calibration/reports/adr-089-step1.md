# ADR-089 step 1: the arms

Both block clocks, the push window and the approach card are built behind a switch that is OFF; these arms turn it on for measurement only. No graded NFL row is scored here (O31); the step-1 clauses are the filing's predictions about the arms.

- filing: fnv1a:9a1c90e9, amendments: none
- fingerprint (every package's source and the filing): 7689307642ed08e0
- commit: 0a2eb415d237fe4075e0965a21d945b2f4a66476 (read from the repository's files; a change staged and not committed is not seen)
- node: v22.22.0; caller v7; corpora: flat 496 games, gen 272 games
- arms: A0 (set 1, legacy), A1 (set 1, fnv1a:69a7cc48), A2 (set 1, fnv1a:1eb35444), A3 (set 1, fnv1a:de2eb56e), A4 (set 1, fnv1a:8aea8d2f), A5 (set 1, fnv1a:fb652498), A6 (set 1, fnv1a:00e11017), A7 (set 1, fnv1a:33714553), A8 (set 1, fnv1a:f4b01834), A9 (set 1, legacy), A10 (set 1, legacy), A11 (set 1, fnv1a:3cfc4af8), A12 (set 1, fnv1a:75ff8b2b), A13 (set 1, fnv1a:a9cea7fa), A14 (set 1, legacy), A15 (set 2, fnv1a:00125fcd), A0b (set 2, legacy)
- PR #33: OPEN, so P2S prints against both 22.02 and 15.46

## What failed, first

- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A1 against A0, flat: league-wide rise 0.53 > allowed 0.20; by class RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A1 against A0, gen: league-wide rise 0.87 > allowed 0.34; by class PROGRESSION, RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A2 against A0, flat: league-wide rise 0.54 > allowed 0.20; by class RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A2 against A0, gen: league-wide rise 0.88 > allowed 0.34; by class PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A3 against A0, flat: league-wide rise 0.30 > allowed 0.16
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A3 against A0, gen: by class PROGRESSION, RANK_PUSHED
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A4 against A0, flat: league-wide rise 0.58 > allowed 0.22; by class RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A4 against A0, gen: by class RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A5 against A0, flat: league-wide rise 0.65 > allowed 0.20; by class RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A5 against A0, gen: league-wide rise 0.64 > allowed 0.33; by class PROGRESSION, RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A6 against A0, flat: league-wide rise 0.67 > allowed 0.20; by class RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A6 against A0, gen: league-wide rise 0.80 > allowed 0.33; by class PROGRESSION, RANK_PUSHED, DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A7 against A0, flat: league-wide rise 0.40 > allowed 0.16; by class DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A7 against A0, gen: league-wide rise 0.27 > allowed 0.25; by class PROGRESSION, RANK_PUSHED
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A8 against A0, flat: league-wide rise 0.42 > allowed 0.16; by class DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A8 against A0, gen: league-wide rise 0.26 > allowed 0.25; by class PROGRESSION, RANK_PUSHED
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A9 against A0, flat: league-wide rise 0.03 > allowed -0.00; by class PROGRESSION, RANK_PUSHED
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A9 against A0, gen: league-wide rise 0.02 > allowed -0.00; by class DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A10 against A0, flat: league-wide rise 0.04 > allowed -0.00; by class PROGRESSION, RANK_PUSHED
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A10 against A0, gen: league-wide rise 0.00 > allowed -0.00; by class DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A11 against A14, flat: league-wide rise 0.70 > allowed 0.42; by class DESPERATION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A11 against A14, gen: by class PROGRESSION, RANK_PUSHED
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A12 against A14, flat: by class DESPERATION, ON_THE_RUN
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A12 against A14, gen: by class PROGRESSION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A13 against A14, flat: league-wide rise 0.42 > allowed 0.19; by class RANK_PUSHED, ON_THE_RUN
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A13 against A14, gen: by class PROGRESSION
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A15 against A0b, flat: league-wide rise 0.72 > allowed 0.41; by class RANK_PUSHED, DESPERATION, ON_THE_RUN
- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): A15 against A0b, gen: league-wide rise 1.14 > allowed 0.58; by class PROGRESSION, RANK_PUSHED, DESPERATION
- GRADED, reported as filed (no band moves, nothing is retuned; the design question goes to the owner): s1.L8.flat.pressure (33.5 to 39.5): A4 flat 66.42 %
- GRADED, reported as filed (no band moves, nothing is retuned; the design question goes to the owner): s1.L8.gen.pressure (36.71 to 42.71): A4 gen 69.01 %
- GRADED, reported as filed (no band moves, nothing is retuned; the design question goes to the owner): s1.falsifier.pressure45 (at most 45): A1 flat 31.81 %; A1 gen 33.05 %; A2 flat 31.53 %; A2 gen 32.80 %; A3 flat 74.55 %; A3 gen 75.35 %; A4 flat 66.42 %; A4 gen 69.01 %
- GRADED, reported as filed (no band moves, nothing is retuned; the design question goes to the owner): s1.falsifier.floorCounter (at most 10): A3 flat 66.04 % of first dirt; A3 gen 66.94 % of first dirt; A4 flat 62.18 % of first dirt; A4 gen 64.08 % of first dirt
- GRADED, reported as filed (no band moves, nothing is retuned; the design question goes to the owner): s1.window.pressure (-0.263321313735546 to 0.263321313735546): A1 flat 0.28 points (A1 - A2); A1 gen 0.25 points (A1 - A2)

Merge card: NOT to be posted until the items above are settled.
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A1,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A2,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A3,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A4,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A5,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A6,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A7,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A8,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A9,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A10,A0 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A11,A14 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A12,A14 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 2: pnpm --filter @ff/calibration pocket -- --step 1 --arms A13,A14 --seed-set 2; both sets' numbers go to the owner before any merge card
- next: re-play the breaching arm and its base on seed set 1: pnpm --filter @ff/calibration pocket -- --step 1 --arms A15,A0b --seed-set 1; both sets' numbers go to the owner before any merge card

## The headline (§9.5)

Pass or fail is printed for graded clauses only; a reported clause shows its basis or direction. Every hit and sack figure has its time to throw beside it.

| arm | league | pressure % | hit-or-sack % | sacks % | release s | time to throw s |
|---|---|---|---|---|---|---|
| A1 | flat | 31.81 (S.pressure 28 to 40.263321313735545: PASS; falsifier.pressure45 at most 45: PASS) | 3.29 [time to throw 1.589 s] | 2.70 (S.sack 2 to 4: PASS; expected.sack basis 2.4: reported) [time to throw 1.589 s] | 1.589 (S.release 1.5 to 1.7: PASS) | 1.589 |
| A1 | gen | 33.05 (S.pressure 28 to 40.263321313735545: PASS; falsifier.pressure45 at most 45: PASS) | 3.89 [time to throw 1.666 s] | 2.80 (S.sack 2 to 4: PASS; expected.sack basis 2.4: reported) [time to throw 1.666 s] | 1.666 (S.release 1.5 to 1.7: PASS) | 1.666 |
| A2 | flat | 31.53 (falsifier.pressure45 at most 45: PASS) | 3.30 [time to throw 1.589 s] | 2.70 [time to throw 1.589 s] | 1.589 | 1.589 |
| A2 | gen | 32.80 (falsifier.pressure45 at most 45: PASS) | 3.89 [time to throw 1.668 s] | 2.80 [time to throw 1.668 s] | 1.668 | 1.668 |
| A3 | flat | 74.55 (L5.pressure direction UP: reported; falsifier.pressure45 at most 45: FAIL) | 4.82 [time to throw 1.546 s] | 3.83 [time to throw 1.546 s] | 1.546 | 1.546 |
| A3 | gen | 75.35 (L5.pressure direction UP: reported; falsifier.pressure45 at most 45: FAIL) | 5.82 [time to throw 1.586 s] | 3.84 [time to throw 1.586 s] | 1.586 | 1.586 |
| A4 | flat | 66.42 (L8.flat.pressure 33.5 to 39.5: FAIL; falsifier.pressure45 at most 45: FAIL) | 2.94 (L8.flat.hitOrSack basis 2.86: reported) [time to throw 1.603 s] | 2.50 (L8.flat.sack 1.91 to 2.91: PASS) [time to throw 1.603 s] | 1.603 (L8.flat.release 1.54 to 1.64: PASS) | 1.603 |
| A4 | gen | 69.01 (L8.gen.pressure 36.71 to 42.71: FAIL; falsifier.pressure45 at most 45: FAIL) | 3.34 (L8.gen.hitOrSack basis 3.4: reported) [time to throw 1.650 s] | 2.51 (L8.gen.sack 1.94 to 2.94: PASS) [time to throw 1.650 s] | 1.650 (L8.gen.release 1.601 to 1.701: PASS) | 1.650 |

P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
- A1 flat: 8.50% | -13.52 against 22.02% (PR #33, FTN only (held)) | -6.96 against 15.46% (main) [time to throw 1.589 s]
- A1 gen: 8.46% | -13.56 against 22.02% (PR #33, FTN only (held)) | -7.00 against 15.46% (main) [time to throw 1.666 s]
- A2 flat: 8.57% | -13.45 against 22.02% (PR #33, FTN only (held)) | -6.89 against 15.46% (main) [time to throw 1.589 s]
- A2 gen: 8.54% | -13.48 against 22.02% (PR #33, FTN only (held)) | -6.92 against 15.46% (main) [time to throw 1.668 s]
- A3 flat: 5.14% | -16.88 against 22.02% (PR #33, FTN only (held)) | -10.32 against 15.46% (main) [time to throw 1.546 s]
- A3 gen: 5.10% | -16.92 against 22.02% (PR #33, FTN only (held)) | -10.36 against 15.46% (main) [time to throw 1.586 s]
- A4 flat: 3.76% | -18.26 against 22.02% (PR #33, FTN only (held)) | -11.70 against 15.46% (main) [time to throw 1.603 s]
- A4 gen: 3.63% | -18.39 against 22.02% (PR #33, FTN only (held)) | -11.83 against 15.46% (main) [time to throw 1.650 s]

## The clause table

| clause | kind | arms | filed | measured | verdict |
|---|---|---|---|---|---|
| s1.L8.flat.pressure | graded | A4 | 33.5 to 39.5 | A4 flat 66.42 % | FAIL |
| s1.L8.flat.hitOrSack | reported | A4 | basis 2.86 | A4 flat 2.94 % | REPORTED |
| s1.L8.flat.sack | graded | A4 | 1.91 to 2.91 | A4 flat 2.50 % | PASS |
| s1.L8.flat.release | graded | A4 | 1.54 to 1.64 | A4 flat 1.603 s | PASS |
| s1.L8.gen.pressure | graded | A4 | 36.71 to 42.71 | A4 gen 69.01 % | FAIL |
| s1.L8.gen.hitOrSack | reported | A4 | basis 3.4 | A4 gen 3.34 % | REPORTED |
| s1.L8.gen.sack | graded | A4 | 1.94 to 2.94 | A4 gen 2.51 % | PASS |
| s1.L8.gen.release | graded | A4 | 1.601 to 1.701 | A4 gen 1.650 s | PASS |
| s1.L5.pressure | reported | A3 | direction UP | A3 flat 74.55 %; A3 gen 75.35 % | REPORTED (flat: A3 above A4 (66.42); gen: A3 above A4 (69.01)) |
| s1.S.pressure | graded | A1 | 28 to 40.263321313735545 | A1 flat 31.81 %; A1 gen 33.05 % | PASS |
| s1.S.sack | graded | A1 | 2 to 4 | A1 flat 2.70 %; A1 gen 2.80 % | PASS |
| s1.S.release | graded | A1 | 1.5 to 1.7 | A1 flat 1.589 s; A1 gen 1.666 s | PASS |
| s1.falsifier.pressure45 | graded | A1, A2, A3, A4 | at most 45 | A1 flat 31.81 %; A1 gen 33.05 %; A2 flat 31.53 %; A2 gen 32.80 %; A3 flat 74.55 %; A3 gen 75.35 %; A4 flat 66.42 %; A4 gen 69.01 % | FAIL |
| s1.falsifier.floorCounter | graded | A3, A4 | at most 10 | A3 flat 66.04 % of first dirt; A3 gen 66.94 % of first dirt; A4 flat 62.18 % of first dirt; A4 gen 64.08 % of first dirt | FAIL |
| s1.falsifier.lToday | structural |  | its proof | A3, A7, A8, A13: 7498 ticks at t >= R checked field for field; failures none | PASS |
| s1.falsifier.offBytes | structural |  | its proof | 45 of 45 filed base rows equal on both leagues | PASS |
| s1.window.pressure | graded | A1, A2 | -0.263321313735546 to 0.263321313735546 | A1 flat 0.28 points (A1 - A2); A1 gen 0.25 points (A1 - A2) | FAIL (B1 is gen seed set 1's (deviation O1); window-only dirt (A1's dropbacks whose only dirt follows a played window tick): flat 0.264 points (135 of 51165, Poisson SE 0.023), gen 0.250 points (71 of 28361, Poisson SE 0.030); M1 recomputed on A2's streams (K7): flat B1 0.3798 points, gen B1 0.4261 points; flat's own B1 is printed with the window's price) |
| s1.window.sack | graded | A1, A2 | -0.3 to 0.3 | A1 flat 0.00 points (A1 - A2); A1 gen -0.01 points (A1 - A2) | PASS (B1 is gen seed set 1's (deviation O1); window-only dirt (A1's dropbacks whose only dirt follows a played window tick): flat 0.264 points (135 of 51165, Poisson SE 0.023), gen 0.250 points (71 of 28361, Poisson SE 0.030); M1 recomputed on A2's streams (K7): flat B1 0.3798 points, gen B1 0.4261 points; flat's own B1 is printed with the window's price) |
| s1.window.ticks | structural |  | its proof | A1, A11: 40355 reps, cases two 11673, one 294, none 108, window ticks played 3529 gaining and 2820 beaten; A2, A15: 0 window ticks (none allowed); failures none | PASS |
| s1.window.noDie | structural |  | its proof | rolls naming the window: 0 in every arm; jitter rolls under S: 0; uniform rolls 1255559 = beats 1255559 | PASS |
| s1.expected.sack | reported | A1 | basis 2.4 | A1 flat 2.70 %; A1 gen 2.80 % | REPORTED |
| guard.reported.intPerAttempt | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.reported.intPerAimed | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.reported.forced | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.reported.intSource | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.reported.completion | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.reported.completionAimed | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.reported.intByClass | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.reported.completionByClass | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed for every arm on both leagues in the group reports | PASS |
| guard.mix | graded | A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A15 | rise over the mix-predicted rise at most 0 | A1 flat breaches; A1 gen breaches; A2 flat breaches; A2 gen breaches; A3 flat breaches; A4 flat breaches; A5 flat breaches; A5 gen breaches; A6 flat breaches; A6 gen breaches; A7 flat breaches; A7 gen breaches; A8 flat breaches; A8 gen breaches; A9 flat breaches; A9 gen breaches; A10 flat breaches; A10 gen breaches; A11 flat breaches; A13 flat breaches; A15 flat breaches; A15 gen breaches | FAIL |
| guard.byClass | graded | A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A15 | rise over the mix-predicted rise at most 0 | A1 flat breaches; A1 gen breaches; A2 flat breaches; A2 gen breaches; A3 gen breaches; A4 flat breaches; A4 gen breaches; A5 flat breaches; A5 gen breaches; A6 flat breaches; A6 gen breaches; A7 flat breaches; A7 gen breaches; A8 flat breaches; A8 gen breaches; A9 flat breaches; A9 gen breaches; A10 flat breaches; A10 gen breaches; A11 flat breaches; A11 gen breaches; A12 flat breaches; A12 gen breaches; A13 flat breaches; A13 gen breaches; A15 flat breaches; A15 gen breaches | FAIL |
| guard.removedClass | structural | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | its proof | printed with its count and interceptions in each group report (REMOVED lines) | PASS |
| guard.onTheRun.clean | reported | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | basis 2.11 | A0 flat n/a (0 aimed); A0 gen n/a (0 aimed); A1 flat n/a (0 aimed); A1 gen n/a (0 aimed); A2 flat n/a (0 aimed); A2 gen n/a (0 aimed); A3 flat n/a (0 aimed); A3 gen n/a (0 aimed); A4 flat n/a (0 aimed); A4 gen n/a (0 aimed); A5 flat n/a (0 aimed); A5 gen n/a (0 aimed); A6 flat n/a (0 aimed); A6 gen n/a (0 aimed); A7 flat n/a (0 aimed); A7 gen n/a (0 aimed); A8 flat n/a (0 aimed); A8 gen n/a (0 aimed); A9 flat n/a (0 aimed); A9 gen n/a (0 aimed); A10 flat n/a (0 aimed); A10 gen n/a (0 aimed); A11 flat n/a (0 aimed); A11 gen n/a (0 aimed); A12 flat n/a (0 aimed); A12 gen n/a (0 aimed); A13 flat n/a (0 aimed); A13 gen n/a (0 aimed); A14 flat n/a (0 aimed); A14 gen n/a (0 aimed); A15 flat n/a (0 aimed); A15 gen n/a (0 aimed); A0b flat n/a (0 aimed); A0b gen n/a (0 aimed) | REPORTED |
| guard.onTheRun.pressured | reported | A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13, A14, A15, A0b | basis 3.25 | A0 flat 7.61 (355 aimed); A0 gen 17.10 (421 aimed); A1 flat 6.45 (155 aimed); A1 gen 17.04 (135 aimed); A2 flat 6.45 (155 aimed); A2 gen 17.39 (138 aimed); A3 flat 6.56 (305 aimed); A3 gen 14.90 (208 aimed); A4 flat 6.36 (220 aimed); A4 gen 17.02 (141 aimed); A5 flat 5.29 (189 aimed); A5 gen 12.88 (132 aimed); A6 flat 5.59 (179 aimed); A6 gen 14.62 (130 aimed); A7 flat 5.37 (298 aimed); A7 gen 16.75 (203 aimed); A8 flat 5.84 (291 aimed); A8 gen 15.84 (202 aimed); A9 flat 7.20 (347 aimed); A9 gen 16.43 (420 aimed); A10 flat 7.20 (347 aimed); A10 gen 16.43 (420 aimed); A11 flat 5.56 (144 aimed); A11 gen 16.00 (100 aimed); A12 flat 6.97 (201 aimed); A12 gen 14.74 (95 aimed); A13 flat 16.07 (224 aimed); A13 gen 18.78 (181 aimed); A14 flat 5.41 (74 aimed); A14 gen 26.88 (93 aimed); A15 flat 10.24 (166 aimed); A15 gen 14.63 (41 aimed); A0b flat 5.33 (75 aimed); A0b gen 21.43 (56 aimed) | REPORTED |

## The interception guard (graded in every arm with a base, on the decision tick)

Each verdict is the filed rule, the rise at most the mix-predicted rise. Beside it, as context for the owner and never as the verdict: SE is binomial, the two arms read as independent (they share seeds, so it reads high), in points per 100 aimed throws, and z = (rise - allowed) / SE.

- A1 against A0, flat: league-wide rise 0.53 against an allowed 0.20 (SE 0.12, z +2.75): BREACH; by class: BREACH (RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.00 / 0.18 / 0.06 / -2.87 PASSES; RANK_PUSHED 0.42 / 0.24 / 0.68 / +0.27 BREACH; CHECKDOWN -0.06 / 0.17 / 0.07 / -3.51 PASSES; DESPERATION 1.06 / 0.32 / 0.57 / +1.28 BREACH; ON_THE_RUN -1.15 / 0.25 / 2.42 / -0.58 PASSES
- A1 against A0, gen: league-wide rise 0.87 against an allowed 0.34 (SE 0.25, z +2.13): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.54 / 0.25 / 0.21 / +1.40 BREACH; RANK_PUSHED 2.64 / 0.42 / 1.09 / +2.05 BREACH; CHECKDOWN -1.06 / 0.36 / 0.40 / -3.57 PASSES; DESPERATION 0.86 / 0.60 / 1.03 / +0.26 BREACH; ON_THE_RUN -0.07 / 0.11 / 3.72 / -0.05 PASSES
- A2 against A0, flat: league-wide rise 0.54 against an allowed 0.20 (SE 0.12, z +2.84): BREACH; by class: BREACH (RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.01 / 0.18 / 0.06 / -2.70 PASSES; RANK_PUSHED 0.45 / 0.24 / 0.68 / +0.31 BREACH; CHECKDOWN -0.06 / 0.17 / 0.07 / -3.49 PASSES; DESPERATION 1.06 / 0.32 / 0.57 / +1.28 BREACH; ON_THE_RUN -1.15 / 0.25 / 2.42 / -0.58 PASSES
- A2 against A0, gen: league-wide rise 0.88 against an allowed 0.34 (SE 0.25, z +2.19): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED, DESPERATION, ON_THE_RUN)
  - by class (rise / allowed / SE / z): PROGRESSION 0.51 / 0.25 / 0.21 / +1.26 BREACH; RANK_PUSHED 2.77 / 0.42 / 1.09 / +2.16 BREACH; CHECKDOWN -1.00 / 0.37 / 0.40 / -3.40 PASSES; DESPERATION 0.87 / 0.60 / 1.03 / +0.27 BREACH; ON_THE_RUN 0.29 / 0.13 / 3.71 / +0.04 BREACH
- A3 against A0, flat: league-wide rise 0.30 against an allowed 0.16 (SE 0.12, z +1.18): BREACH; by class: PASSES
  - by class (rise / allowed / SE / z): PROGRESSION -0.02 / 0.13 / 0.06 / -2.35 PASSES; RANK_PUSHED -0.03 / 0.17 / 0.69 / -0.29 PASSES; CHECKDOWN -0.09 / 0.18 / 0.06 / -4.11 PASSES; DESPERATION 0.20 / 0.25 / 0.55 / -0.09 PASSES; ON_THE_RUN -1.05 / 0.38 / 2.00 / -0.71 PASSES
- A3 against A0, gen: league-wide rise 0.18 against an allowed 0.25 (SE 0.24, z -0.31): PASSES; by class: BREACH (PROGRESSION, RANK_PUSHED)
  - by class (rise / allowed / SE / z): PROGRESSION 0.18 / 0.17 / 0.20 / +0.08 BREACH; RANK_PUSHED 2.33 / 0.29 / 1.11 / +1.85 BREACH; CHECKDOWN -1.09 / 0.37 / 0.38 / -3.86 PASSES; DESPERATION -1.09 / 0.42 / 1.00 / -1.51 PASSES; ON_THE_RUN -2.20 / 0.29 / 3.08 / -0.81 PASSES
- A4 against A0, flat: league-wide rise 0.58 against an allowed 0.22 (SE 0.12, z +3.04): BREACH; by class: BREACH (RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.05 / 0.18 / 0.07 / -1.98 PASSES; RANK_PUSHED 0.36 / 0.26 / 0.68 / +0.15 BREACH; CHECKDOWN 0.00 / 0.21 / 0.07 / -2.87 PASSES; DESPERATION 0.65 / 0.36 / 0.55 / +0.52 BREACH; ON_THE_RUN -1.24 / 0.51 / 2.17 / -0.81 PASSES
- A4 against A0, gen: league-wide rise 0.21 against an allowed 0.34 (SE 0.24, z -0.52): PASSES; by class: BREACH (RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.17 / 0.23 / 0.20 / -0.28 PASSES; RANK_PUSHED 1.05 / 0.38 / 1.09 / +0.61 BREACH; CHECKDOWN -1.77 / 0.47 / 0.37 / -6.03 PASSES; DESPERATION 1.11 / 0.59 / 1.02 / +0.51 BREACH; ON_THE_RUN -0.08 / 0.22 / 3.66 / -0.08 PASSES
- A5 against A0, flat: league-wide rise 0.65 against an allowed 0.20 (SE 0.12, z +3.71): BREACH; by class: BREACH (RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.07 / 0.18 / 0.07 / -1.66 PASSES; RANK_PUSHED 0.65 / 0.22 / 0.68 / +0.62 BREACH; CHECKDOWN -0.02 / 0.20 / 0.07 / -3.22 PASSES; DESPERATION 1.34 / 0.33 / 0.58 / +1.75 BREACH; ON_THE_RUN -2.31 / 0.35 / 2.15 / -1.24 PASSES
- A5 against A0, gen: league-wide rise 0.64 against an allowed 0.33 (SE 0.25, z +1.28): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.37 / 0.22 / 0.21 / +0.72 BREACH; RANK_PUSHED 1.99 / 0.39 / 1.09 / +1.47 BREACH; CHECKDOWN -1.14 / 0.44 / 0.40 / -3.99 PASSES; DESPERATION 1.12 / 0.57 / 1.02 / +0.54 BREACH; ON_THE_RUN -4.22 / 0.15 / 3.44 / -1.27 PASSES
- A6 against A0, flat: league-wide rise 0.67 against an allowed 0.20 (SE 0.12, z +3.86): BREACH; by class: BREACH (RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.06 / 0.17 / 0.07 / -1.76 PASSES; RANK_PUSHED 0.71 / 0.22 / 0.68 / +0.71 BREACH; CHECKDOWN -0.03 / 0.20 / 0.07 / -3.36 PASSES; DESPERATION 1.37 / 0.34 / 0.58 / +1.78 BREACH; ON_THE_RUN -2.02 / 0.35 / 2.22 / -1.07 PASSES
- A6 against A0, gen: league-wide rise 0.80 against an allowed 0.33 (SE 0.25, z +1.89): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.51 / 0.22 / 0.21 / +1.37 BREACH; RANK_PUSHED 2.26 / 0.39 / 1.09 / +1.71 BREACH; CHECKDOWN -1.18 / 0.44 / 0.39 / -4.09 PASSES; DESPERATION 1.21 / 0.56 / 1.03 / +0.64 BREACH; ON_THE_RUN -2.49 / 0.08 / 3.60 / -0.71 PASSES
- A7 against A0, flat: league-wide rise 0.40 against an allowed 0.16 (SE 0.12, z +2.04): BREACH; by class: BREACH (DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.01 / 0.13 / 0.06 / -1.95 PASSES; RANK_PUSHED -0.19 / 0.15 / 0.68 / -0.49 PASSES; CHECKDOWN 0.01 / 0.18 / 0.07 / -2.37 PASSES; DESPERATION 0.68 / 0.25 / 0.56 / +0.76 BREACH; ON_THE_RUN -2.24 / 0.35 / 1.92 / -1.35 PASSES
- A7 against A0, gen: league-wide rise 0.27 against an allowed 0.25 (SE 0.25, z +0.08): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED)
  - by class (rise / allowed / SE / z): PROGRESSION 0.25 / 0.17 / 0.20 / +0.37 BREACH; RANK_PUSHED 1.68 / 0.25 / 1.10 / +1.30 BREACH; CHECKDOWN -1.26 / 0.34 / 0.38 / -4.25 PASSES; DESPERATION 0.00 / 0.42 / 1.02 / -0.41 PASSES; ON_THE_RUN -0.35 / 0.31 / 3.20 / -0.21 PASSES
- A8 against A0, flat: league-wide rise 0.42 against an allowed 0.16 (SE 0.12, z +2.23): BREACH; by class: BREACH (DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION -0.01 / 0.13 / 0.06 / -2.13 PASSES; RANK_PUSHED -0.00 / 0.15 / 0.68 / -0.22 PASSES; CHECKDOWN -0.00 / 0.18 / 0.07 / -2.56 PASSES; DESPERATION 0.65 / 0.25 / 0.56 / +0.72 BREACH; ON_THE_RUN -1.76 / 0.35 / 1.97 / -1.08 PASSES
- A8 against A0, gen: league-wide rise 0.26 against an allowed 0.25 (SE 0.25, z +0.07): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED)
  - by class (rise / allowed / SE / z): PROGRESSION 0.25 / 0.17 / 0.20 / +0.37 BREACH; RANK_PUSHED 1.50 / 0.26 / 1.10 / +1.13 BREACH; CHECKDOWN -1.41 / 0.33 / 0.37 / -4.66 PASSES; DESPERATION 0.35 / 0.41 / 1.02 / -0.06 PASSES; ON_THE_RUN -1.26 / 0.30 / 3.16 / -0.49 PASSES
- A9 against A0, flat: league-wide rise 0.03 against an allowed -0.00 (SE 0.12, z +0.23): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED)
  - by class (rise / allowed / SE / z): PROGRESSION 0.02 / -0.00 / 0.07 / +0.25 BREACH; RANK_PUSHED 0.26 / -0.00 / 0.78 / +0.34 BREACH; CHECKDOWN 0.00 / 0.00 / 0.07 / -0.00 PASSES; DESPERATION -0.19 / -0.01 / 0.59 / -0.31 PASSES; ON_THE_RUN -0.40 / 0.01 / 1.98 / -0.21 PASSES
- A9 against A0, gen: league-wide rise 0.02 against an allowed -0.00 (SE 0.26, z +0.10): BREACH; by class: BREACH (DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION -0.03 / -0.00 / 0.22 / -0.14 PASSES; RANK_PUSHED -0.11 / -0.00 / 1.23 / -0.09 PASSES; CHECKDOWN -0.04 / -0.00 / 0.37 / -0.10 PASSES; DESPERATION 0.28 / 0.00 / 1.08 / +0.26 BREACH; ON_THE_RUN -0.67 / -0.01 / 2.58 / -0.26 PASSES
- A10 against A0, flat: league-wide rise 0.04 against an allowed -0.00 (SE 0.12, z +0.34): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED)
  - by class (rise / allowed / SE / z): PROGRESSION 0.03 / -0.00 / 0.07 / +0.38 BREACH; RANK_PUSHED 0.25 / -0.00 / 0.78 / +0.32 BREACH; CHECKDOWN 0.00 / 0.00 / 0.07 / -0.00 PASSES; DESPERATION -0.05 / -0.01 / 0.60 / -0.08 PASSES; ON_THE_RUN -0.40 / 0.01 / 1.98 / -0.21 PASSES
- A10 against A0, gen: league-wide rise 0.00 against an allowed -0.00 (SE 0.26, z +0.01): BREACH; by class: BREACH (DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION -0.04 / -0.00 / 0.22 / -0.16 PASSES; RANK_PUSHED -0.06 / -0.00 / 1.23 / -0.05 PASSES; CHECKDOWN -0.05 / -0.00 / 0.37 / -0.13 PASSES; DESPERATION 0.17 / 0.01 / 1.08 / +0.15 BREACH; ON_THE_RUN -0.67 / -0.01 / 2.58 / -0.26 PASSES
- A11 against A14, flat: league-wide rise 0.70 against an allowed 0.42 (SE 0.18, z +1.54): BREACH; by class: BREACH (DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION -0.02 / 0.44 / 0.09 / -5.35 PASSES; RANK_PUSHED -0.20 / 0.14 / 1.02 / -0.34 PASSES; CHECKDOWN 0.13 / 0.46 / 0.08 / -3.89 PASSES; DESPERATION 1.79 / 0.74 / 0.83 / +1.27 BREACH; ON_THE_RUN 0.15 / 0.42 / 3.25 / -0.08 PASSES
- A11 against A14, gen: league-wide rise 0.42 against an allowed 0.55 (SE 0.35, z -0.37): PASSES; by class: BREACH (PROGRESSION, RANK_PUSHED)
  - by class (rise / allowed / SE / z): PROGRESSION 0.64 / 0.55 / 0.23 / +0.36 BREACH; RANK_PUSHED 1.56 / 0.15 / 1.74 / +0.81 BREACH; CHECKDOWN -0.43 / 0.37 / 0.67 / -1.19 PASSES; DESPERATION -1.29 / 1.00 / 1.34 / -1.71 PASSES; ON_THE_RUN -10.88 / 0.15 / 5.88 / -1.88 PASSES
- A12 against A14, flat: league-wide rise 0.35 against an allowed 0.36 (SE 0.17, z -0.07): PASSES; by class: BREACH (DESPERATION, ON_THE_RUN)
  - by class (rise / allowed / SE / z): PROGRESSION -0.00 / 0.32 / 0.09 / -3.80 PASSES; RANK_PUSHED -0.70 / 0.12 / 1.02 / -0.80 PASSES; CHECKDOWN 0.17 / 0.45 / 0.08 / -3.53 PASSES; DESPERATION 0.94 / 0.64 / 0.82 / +0.37 BREACH; ON_THE_RUN 1.56 / 0.43 / 3.18 / +0.35 BREACH
- A12 against A14, gen: league-wide rise -0.37 against an allowed 0.48 (SE 0.35, z -2.44): PASSES; by class: BREACH (PROGRESSION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.49 / 0.42 / 0.23 / +0.31 BREACH; RANK_PUSHED -0.60 / 0.09 / 1.75 / -0.39 PASSES; CHECKDOWN -0.19 / 0.44 / 0.63 / -0.99 PASSES; DESPERATION -2.94 / 0.92 / 1.31 / -2.94 PASSES; ON_THE_RUN -12.14 / 0.29 / 5.86 / -2.12 PASSES
- A13 against A14, flat: league-wide rise 0.42 against an allowed 0.19 (SE 0.18, z +1.26): BREACH; by class: BREACH (RANK_PUSHED, ON_THE_RUN)
  - by class (rise / allowed / SE / z): PROGRESSION 0.03 / 0.17 / 0.09 / -1.61 PASSES; RANK_PUSHED 0.56 / 0.00 / 1.05 / +0.52 BREACH; CHECKDOWN 0.13 / 0.18 / 0.07 / -0.66 PASSES; DESPERATION 0.24 / 0.39 / 0.82 / -0.18 PASSES; ON_THE_RUN 10.67 / 0.19 / 3.60 / +2.91 BREACH
- A13 against A14, gen: league-wide rise -0.09 against an allowed 0.30 (SE 0.36, z -1.08): PASSES; by class: BREACH (PROGRESSION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.51 / 0.26 / 0.24 / +1.00 BREACH; RANK_PUSHED -0.15 / -0.04 / 1.79 / -0.06 PASSES; CHECKDOWN 0.11 / 0.14 / 0.63 / -0.05 PASSES; DESPERATION -1.40 / 0.65 / 1.34 / -1.53 PASSES; ON_THE_RUN -8.10 / 0.13 / 5.44 / -1.51 PASSES
- A15 against A0b, flat: league-wide rise 0.72 against an allowed 0.41 (SE 0.17, z +1.83): BREACH; by class: BREACH (RANK_PUSHED, DESPERATION, ON_THE_RUN)
  - by class (rise / allowed / SE / z): PROGRESSION -0.02 / 0.40 / 0.08 / -5.34 PASSES; RANK_PUSHED 0.14 / 0.11 / 0.91 / +0.04 BREACH; CHECKDOWN -0.04 / 0.59 / 0.14 / -4.53 PASSES; DESPERATION 1.91 / 0.91 / 0.82 / +1.21 BREACH; ON_THE_RUN 4.91 / 0.30 / 3.50 / +1.32 BREACH
- A15 against A0b, gen: league-wide rise 1.14 against an allowed 0.58 (SE 0.34, z +1.69): BREACH; by class: BREACH (PROGRESSION, RANK_PUSHED, DESPERATION)
  - by class (rise / allowed / SE / z): PROGRESSION 0.57 / 0.56 / 0.26 / +0.03 BREACH; RANK_PUSHED 1.42 / 0.10 / 1.55 / +0.86 BREACH; CHECKDOWN -0.05 / 0.59 / 0.75 / -0.84 PASSES; DESPERATION 2.52 / 1.12 / 1.21 / +1.15 BREACH; ON_THE_RUN -6.79 / 0.19 / 7.78 / -0.90 PASSES

## The structural proofs inside the arms (§9.2)

- s1.window.ticks (S-2, the window's ticks on every 1-14 POWER rep): PASSES. A1, A11: 40355 reps, cases two 11673, one 294, none 108, window ticks played 3529 gaining and 2820 beaten; A2, A15: 0 window ticks (none allowed); failures none
- s1.window.noDie (S-3, the window draws no die (the stream half; the paired-run test is the engine's rollAccounting)): PASSES. rolls naming the window: 0 in every arm; jitter rolls under S: 0; uniform rolls 1255559 = beats 1255559
- s1.falsifier.lToday (S-5, L equals today from t >= R (here R = 5, in every L5 arm; R = 4, 5, 6 on the golden 50 is FF_POCKET_ON=1 pocketStep1Stream)): PASSES. A3, A7, A8, A13: 7498 ticks at t >= R checked field for field; failures none
- S-4 (every pass_rush_tick margin, band and tier rebuilt from the stream and its stamp's dials): PASSES. 17865774 cases over 17 arms and both leagues; failures none
- S-7 (roll accounting: one beat per rep under S, dieless ticks naming beats; no beat or uniform die under legacy and L): PASSES. 5110589 cases over 17 arms and both leagues; failures none
- S-8 (the published approach equals the derivation on every threat): PASSES. 847351 cases over 17 arms and both leagues; failures none
- s1.falsifier.offBytes (the OFF arm A0 reproduces step 0's filed base rows (the OFF proof proper is P-1 to P-15, outside this run)): PASSES. 45 of 45 filed base rows equal on both leagues

## The interaction (§9.3): joint minus (clock alone + beaten alone - base), beside pkA's -25.3 points (REPORTED, ADR-089:1333; pkA is flat only, beaten plus horizon on its own clock: clock alone -20.4, beaten plus horizon alone -8.0, joint -53.7. Step 1's formulas take Heels or Past only alone, under shape L at R = 8 and 5, on both leagues, so the two are not like for like)

- A5 - (A4 + A9 - A0), flat: pressure -25.62 points; sacks -0.23 [time to throw 1.590 s]
- A5 - (A4 + A9 - A0), gen: pressure -25.46 points; sacks +0.03 [time to throw 1.651 s]
- A6 - (A4 + A10 - A0), flat: pressure -29.86 points; sacks -0.24 [time to throw 1.588 s]
- A6 - (A4 + A10 - A0), gen: pressure -30.18 points; sacks +0.06 [time to throw 1.651 s]
- A7 - (A3 + A9 - A0), flat: pressure -22.47 points; sacks -0.28 [time to throw 1.538 s]
- A7 - (A3 + A9 - A0), gen: pressure -20.31 points; sacks +0.20 [time to throw 1.581 s]
- A8 - (A3 + A10 - A0), flat: pressure -25.64 points; sacks -0.26 [time to throw 1.537 s]
- A8 - (A3 + A10 - A0), gen: pressure -23.91 points; sacks +0.16 [time to throw 1.579 s]

## The window's price: A1 minus A2 (the window cannot run alone)

- flat: pressure +0.278 points against the filed +-0.2633 (B1, gen seed set 1; this league's own B1 0.2134); sacks +0.002 against +-0.3 [time to throw 1.589 s]; M1 recomputed on A2's streams: B1 0.3798 points (K7); window-only dirt 0.264 points (135 of 51165, Poisson SE 0.023)
- gen: pressure +0.245 points against the filed +-0.2633 (B1, gen seed set 1; this league's own B1 0.2633); sacks -0.006 against +-0.3 [time to throw 1.666 s]; M1 recomputed on A2's streams: B1 0.4261 points (K7); window-only dirt 0.250 points (71 of 28361, Poisson SE 0.030)

## The pricing arms (each a pricing arm, never a design value) and the context arm

- A14 (the stand-in hold's own rows; pricing arm, never a design value) against A0, flat: pressure 96.12 | hit-or-sack 39.18 [time to throw 2.396 s] | sacks 34.84 [time to throw 2.396 s] | release 2.396 s; against pressure 86.85 | hit-or-sack 20.05 | sacks 16.43 | release 1.242 s
- A14 (the stand-in hold's own rows; pricing arm, never a design value) against A0, gen: pressure 95.87 | hit-or-sack 56.45 [time to throw 2.250 s] | sacks 46.18 [time to throw 2.250 s] | release 2.250 s; against pressure 85.26 | hit-or-sack 24.04 | sacks 16.72 | release 1.235 s
- A11 (A1 with the stand-in hold; pricing arm, never a design value) against A1, flat: pressure 44.66 | hit-or-sack 7.57 [time to throw 2.739 s] | sacks 6.18 [time to throw 2.739 s] | release 2.739 s; against pressure 31.81 | hit-or-sack 3.29 | sacks 2.70 | release 1.589 s
- A11 (A1 with the stand-in hold; pricing arm, never a design value) against A1, gen: pressure 44.28 | hit-or-sack 10.57 [time to throw 2.695 s] | sacks 7.55 [time to throw 2.695 s] | release 2.695 s; against pressure 33.05 | hit-or-sack 3.89 | sacks 2.80 | release 1.666 s
- A12 (A4 with the stand-in hold; pricing arm, never a design value) against A4, flat: pressure 89.35 | hit-or-sack 7.47 [time to throw 2.628 s] | sacks 6.19 [time to throw 2.628 s] | release 2.628 s; against pressure 66.42 | hit-or-sack 2.94 | sacks 2.50 | release 1.603 s
- A12 (A4 with the stand-in hold; pricing arm, never a design value) against A4, gen: pressure 89.00 | hit-or-sack 9.91 [time to throw 2.558 s] | sacks 7.27 [time to throw 2.558 s] | release 2.558 s; against pressure 69.01 | hit-or-sack 3.34 | sacks 2.51 | release 1.650 s
- A13 (A3 with the stand-in hold; pricing arm, never a design value) against A3, flat: pressure 91.95 | hit-or-sack 11.30 [time to throw 2.475 s] | sacks 8.91 [time to throw 2.475 s] | release 2.475 s; against pressure 74.55 | hit-or-sack 4.82 | sacks 3.83 | release 1.546 s
- A13 (A3 with the stand-in hold; pricing arm, never a design value) against A3, gen: pressure 91.59 | hit-or-sack 16.50 [time to throw 2.403 s] | sacks 10.98 [time to throw 2.403 s] | release 2.403 s; against pressure 75.35 | hit-or-sack 5.82 | sacks 3.84 | release 1.586 s
- A15 (context only (sLateArm, O27); pricing arm, never a design value) against A0b, flat: pressure 34.49 | hit-or-sack 4.26 [time to throw 2.809 s] | sacks 3.40 [time to throw 2.809 s] | release 2.809 s; against pressure 90.84 | hit-or-sack 40.46 | sacks 35.67 | release 2.471 s
- A15 (context only (sLateArm, O27); pricing arm, never a design value) against A0b, gen: pressure 35.25 | hit-or-sack 6.30 [time to throw 2.799 s] | sacks 4.47 [time to throw 2.799 s] | release 2.799 s; against pressure 90.52 | hit-or-sack 58.93 | sacks 48.06 | release 2.314 s
- A15 (context only (sLateArm, O27), against revision 1's figures) against Appendix B, gen Later (33.85 / 5.69 / 2.47), gen: pressure 35.25 | hit-or-sack 6.30 [time to throw 2.799 s] | sacks 4.47 [time to throw 2.799 s] | release 2.799 s; against pressure 33.85 | hit-or-sack 5.69 | sacks 2.47 | release n/a s

## Each arm: exclusive affected plays, the stream folds' counts and the rows printed apart

### A0, flat (base)

- dropbacks 43837; time to throw 1.242 s
- exclusive affected plays: none (no base)
- quick-pressure share 99.81 %; band floor plus counter 9.41 % of first dirt
- clean_with_live_won_rep: ticks 0.148 %, dropbacks 0.130 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 79.81 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 425367, S 0, L 0, failures 0
- dice: 176479 reps, 0 beats, 0 dieless ticks, 425367 rolled ticks, 850734 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 43837 legacy plays, failures 0

### A0, gen (base)

- dropbacks 25758; time to throw 1.235 s
- exclusive affected plays: none (no base)
- quick-pressure share 99.72 %; band floor plus counter 9.77 % of first dirt
- clean_with_live_won_rep: ticks 0.122 %, dropbacks 0.113 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 77.73 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 255092, S 0, L 0, failures 0
- dice: 103724 reps, 0 beats, 0 dieless ticks, 255092 rolled ticks, 510184 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 25758 legacy plays, failures 0

### A1, flat (design)

- dropbacks 51165; time to throw 1.589 s
- exclusive affected plays against A0: 6735 (S (a beat played) 6278, WINDOW (a window tick played) 880; window-only dirt 135 (0.264 points, Poisson SE 0.023))
- quick-pressure share 94.40 %; band floor plus counter 1.91 % of first dirt
- clean_with_live_won_rep: ticks 0.025 %, dropbacks 0.061 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 8.76 %: the miss rule classes nothing at step 1 (O31)
- window: on, 13370 1-14 POWER reps (9393 with no beat), cases two 3835 / one 103 / none 39, played gaining 782 / beaten 618, 41862 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 642761, L 0, failures 0
- dice: 205923 reps, 205923 beats, 642761 dieless ticks, 0 rolled ticks, 0 jitter rolls, 205923 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): FREE 6306/6306, ARC 5824/5824, THROUGH 9349/9349, PUSH 362/362; 30664 threats checked, 199157 blocked, 0 legacy plays, failures 0

### A1, gen (design)

- dropbacks 28361; time to throw 1.666 s
- exclusive affected plays against A0: 4266 (S (a beat played) 4008, WINDOW (a window tick played) 507; window-only dirt 71 (0.250 points, Poisson SE 0.030))
- quick-pressure share 91.05 %; band floor plus counter 2.01 % of first dirt
- clean_with_live_won_rep: ticks 0.014 %, dropbacks 0.035 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 10.90 %: the miss rule classes nothing at step 1 (O31)
- window: on, 7372 1-14 POWER reps (5173 with no beat), cases two 2129 / one 55 / none 15, played gaining 456 / beaten 352, 24229 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 376389, L 0, failures 0
- dice: 114258 reps, 114258 beats, 376389 dieless ticks, 0 rolled ticks, 0 jitter rolls, 114258 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): FREE 3367/3367, ARC 3398/3398, THROUGH 5612/5612, PUSH 205/205; 16600 threats checked, 109906 blocked, 0 legacy plays, failures 0

### A2, flat (information only)

- dropbacks 51160; time to throw 1.589 s
- exclusive affected plays against A0: 6274 (S (a beat played) 6274; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 94.45 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.026 %, dropbacks 0.063 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 8.30 %: the miss rule classes nothing at step 1 (O31)
- window: off, 13378 1-14 POWER reps (9401 with no beat), cases two 3834 / one 103 / none 40, played gaining 0 / beaten 0, 41905 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 642687, L 0, failures 0
- dice: 205898 reps, 205898 beats, 642687 dieless ticks, 0 rolled ticks, 0 jitter rolls, 205898 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): FREE 6303/6303, ARC 5821/5821, THROUGH 9348/9348, PUSH 362/362; 30654 threats checked, 199138 blocked, 0 legacy plays, failures 0

### A2, gen (information only)

- dropbacks 28332; time to throw 1.668 s
- exclusive affected plays against A0: 4008 (S (a beat played) 4008; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 91.05 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.017 %, dropbacks 0.042 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.02 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 10.52 %: the miss rule classes nothing at step 1 (O31)
- window: off, 7359 1-14 POWER reps (5159 with no beat), cases two 2129 / one 56 / none 15, played gaining 0 / beaten 0, 24219 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 376437, L 0, failures 0
- dice: 114151 reps, 114151 beats, 376437 dieless ticks, 0 rolled ticks, 0 jitter rolls, 114151 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): FREE 3367/3367, ARC 3404/3404, THROUGH 5587/5587, PUSH 204/204; 16581 threats checked, 109800 blocked, 0 legacy plays, failures 0

### A3, flat (design point, provisional)

- dropbacks 51091; time to throw 1.546 s
- exclusive affected plays against A0: 51087 (L (a band changed before R) 51087; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 99.13 %; band floor plus counter 66.04 % of first dirt
- clean_with_live_won_rep: ticks 0.013 %, dropbacks 0.018 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 85.35 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 199 ticks at t >= R (628031 before), failures 0
- margins rebuilt: legacy 0, S 0, L 628230, failures 0
- dice: 205752 reps, 0 beats, 0 dieless ticks, 628230 rolled ticks, 1256460 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 11882/11882, THROUGH 20756/20756, PUSH 120/120, FREE 6321/6321; 51226 threats checked, 181817 blocked, 0 legacy plays, failures 0

### A3, gen (design point, provisional)

- dropbacks 28708; time to throw 1.586 s
- exclusive affected plays against A0: 28707 (L (a band changed before R) 28707; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 98.81 %; band floor plus counter 66.94 % of first dirt
- clean_with_live_won_rep: ticks 0.015 %, dropbacks 0.017 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 86.48 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 158 ticks at t >= R (363434 before), failures 0
- margins rebuilt: legacy 0, S 0, L 363592, failures 0
- dice: 115631 reps, 0 beats, 0 dieless ticks, 363592 rolled ticks, 727184 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 12938/12938, ARC 6662/6662, FREE 3454/3454, PUSH 71/71; 28450 threats checked, 100869 blocked, 0 legacy plays, failures 0

### A4, flat (priced point)

- dropbacks 52259; time to throw 1.603 s
- exclusive affected plays against A0: 52256 (L (a band changed before R) 52256; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 98.64 %; band floor plus counter 62.18 % of first dirt
- clean_with_live_won_rep: ticks 0.015 %, dropbacks 0.025 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 82.56 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (665551 before), failures 0
- margins rebuilt: legacy 0, S 0, L 665551, failures 0
- dice: 210549 reps, 0 beats, 0 dieless ticks, 665551 rolled ticks, 1331102 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 12733/12733, FREE 6411/6411, ARC 6716/6716, PUSH 7/7; 35147 threats checked, 200032 blocked, 0 legacy plays, failures 0

### A4, gen (priced point)

- dropbacks 28910; time to throw 1.650 s
- exclusive affected plays against A0: 28909 (L (a band changed before R) 28909; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 98.21 %; band floor plus counter 64.08 % of first dirt
- clean_with_live_won_rep: ticks 0.004 %, dropbacks 0.007 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 82.85 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (380745 before), failures 0
- margins rebuilt: legacy 0, S 0, L 380745, failures 0
- dice: 116410 reps, 0 beats, 0 dieless ticks, 380745 rolled ticks, 761490 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 3873/3873, FREE 3391/3391, THROUGH 8001/8001, PUSH 13/13; 19420 threats checked, 109514 blocked, 0 legacy plays, failures 0

### A5, flat (information, for the return package)

- dropbacks 51400; time to throw 1.590 s
- exclusive affected plays against A0: 51399 (L (a band changed before R) 51399, HEELS (a beaten or gaining tick) 47288; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 83.89 %; band floor plus counter 18.08 % of first dirt
- clean_with_live_won_rep: ticks 0.002 %, dropbacks 0.004 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 16.44 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (646921 before), failures 0
- margins rebuilt: legacy 0, S 0, L 646921, failures 0
- dice: 206919 reps, 0 beats, 0 dieless ticks, 646921 rolled ticks, 1293842 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 12229/12229, FREE 6278/6278, ARC 6475/6475, PUSH 1/1; 33296 threats checked, 197072 blocked, 0 legacy plays, failures 0

### A5, gen (information, for the return package)

- dropbacks 28548; time to throw 1.651 s
- exclusive affected plays against A0: 28547 (L (a band changed before R) 28547, HEELS (a beaten or gaining tick) 26273; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 79.33 %; band floor plus counter 20.67 % of first dirt
- clean_with_live_won_rep: ticks 0.001 %, dropbacks 0.004 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 20.65 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (375695 before), failures 0
- margins rebuilt: legacy 0, S 0, L 375695, failures 0
- dice: 115038 reps, 0 beats, 0 dieless ticks, 375695 rolled ticks, 751390 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): FREE 3357/3357, THROUGH 7869/7869, ARC 3727/3727, PUSH 7/7; 18798 threats checked, 108305 blocked, 0 legacy plays, failures 0

### A6, flat (information, for the return package)

- dropbacks 51384; time to throw 1.588 s
- exclusive affected plays against A0: 51383 (L (a band changed before R) 51383, PAST_ONLY (a beaten or gaining tick) 47226; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 87.74 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.016 %, dropbacks 0.039 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 9.38 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (646342 before), failures 0
- margins rebuilt: legacy 0, S 0, L 646342, failures 0
- dice: 206848 reps, 0 beats, 0 dieless ticks, 646342 rolled ticks, 1292684 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 12119/12119, FREE 6317/6317, ARC 6462/6462; 33113 threats checked, 197095 blocked, 0 legacy plays, failures 0

### A6, gen (information, for the return package)

- dropbacks 28538; time to throw 1.651 s
- exclusive affected plays against A0: 28537 (L (a band changed before R) 28537, PAST_ONLY (a beaten or gaining tick) 26265; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 83.09 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.017 %, dropbacks 0.042 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 14.25 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (375394 before), failures 0
- margins rebuilt: legacy 0, S 0, L 375394, failures 0
- dice: 114987 reps, 0 beats, 0 dieless ticks, 375394 rolled ticks, 750788 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): FREE 3396/3396, THROUGH 7854/7854, ARC 3744/3744, PUSH 7/7; 18819 threats checked, 108273 blocked, 0 legacy plays, failures 0

### A7, flat (information)

- dropbacks 50573; time to throw 1.538 s
- exclusive affected plays against A0: 50569 (L (a band changed before R) 50569, HEELS (a beaten or gaining tick) 46988; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 92.98 %; band floor plus counter 10.85 % of first dirt
- clean_with_live_won_rep: ticks 0.009 %, dropbacks 0.020 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 46.52 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 4 ticks at t >= R (618432 before), failures 0
- margins rebuilt: legacy 0, S 0, L 618436, failures 0
- dice: 203612 reps, 0 beats, 0 dieless ticks, 618436 rolled ticks, 1236872 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 11509/11509, THROUGH 20439/20439, PUSH 83/83, FREE 6244/6244; 49831 threats checked, 180292 blocked, 0 legacy plays, failures 0

### A7, gen (information)

- dropbacks 28416; time to throw 1.581 s
- exclusive affected plays against A0: 28415 (L (a band changed before R) 28415, HEELS (a beaten or gaining tick) 26366; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 90.90 %; band floor plus counter 12.13 % of first dirt
- clean_with_live_won_rep: ticks 0.002 %, dropbacks 0.004 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 50.05 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 58 ticks at t >= R (358692 before), failures 0
- margins rebuilt: legacy 0, S 0, L 358750, failures 0
- dice: 114475 reps, 0 beats, 0 dieless ticks, 358750 rolled ticks, 717500 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 12721/12721, FREE 3451/3451, ARC 6385/6385, PUSH 66/66; 27779 threats checked, 100123 blocked, 0 legacy plays, failures 0

### A8, flat (information)

- dropbacks 50574; time to throw 1.537 s
- exclusive affected plays against A0: 50570 (L (a band changed before R) 50570, PAST_ONLY (a beaten or gaining tick) 46995; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 92.38 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.051 %, dropbacks 0.111 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 36.63 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 0 ticks at t >= R (618223 before), failures 0
- margins rebuilt: legacy 0, S 0, L 618223, failures 0
- dice: 203591 reps, 0 beats, 0 dieless ticks, 618223 rolled ticks, 1236446 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 11524/11524, THROUGH 20469/20469, PUSH 79/79, FREE 6174/6174; 49673 threats checked, 180300 blocked, 0 legacy plays, failures 0

### A8, gen (information)

- dropbacks 28408; time to throw 1.579 s
- exclusive affected plays against A0: 28407 (L (a band changed before R) 28407, PAST_ONLY (a beaten or gaining tick) 26376; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 90.08 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.047 %, dropbacks 0.106 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 41.58 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 42 ticks at t >= R (358155 before), failures 0
- margins rebuilt: legacy 0, S 0, L 358197, failures 0
- dice: 114398 reps, 0 beats, 0 dieless ticks, 358197 rolled ticks, 716394 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 12680/12680, FREE 3409/3409, ARC 6400/6400, PUSH 63/63; 27633 threats checked, 100088 blocked, 0 legacy plays, failures 0

### A9, flat (information, the joint's alone arm (O23))

- dropbacks 43847; time to throw 1.241 s
- exclusive affected plays against A0: 25873 (HEELS (a beaten or gaining tick) 25873; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 99.65 %; band floor plus counter 0.34 % of first dirt
- clean_with_live_won_rep: ticks 0.240 %, dropbacks 0.239 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 60.93 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 425728, S 0, L 0, failures 0
- dice: 176590 reps, 0 beats, 0 dieless ticks, 425728 rolled ticks, 851456 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 43847 legacy plays, failures 0

### A9, gen (information, the joint's alone arm (O23))

- dropbacks 25757; time to throw 1.234 s
- exclusive affected plays against A0: 15225 (HEELS (a beaten or gaining tick) 15225; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 99.49 %; band floor plus counter 0.45 % of first dirt
- clean_with_live_won_rep: ticks 0.169 %, dropbacks 0.167 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 58.71 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 254981, S 0, L 0, failures 0
- dice: 103691 reps, 0 beats, 0 dieless ticks, 254981 rolled ticks, 509962 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 25757 legacy plays, failures 0

### A10, flat (information, the joint's alone arm (O23))

- dropbacks 43829; time to throw 1.241 s
- exclusive affected plays against A0: 25867 (PAST_ONLY (a beaten or gaining tick) 25867; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 99.74 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.253 %, dropbacks 0.253 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 59.98 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 425434, S 0, L 0, failures 0
- dice: 176533 reps, 0 beats, 0 dieless ticks, 425434 rolled ticks, 850868 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 43829 legacy plays, failures 0

### A10, gen (information, the joint's alone arm (O23))

- dropbacks 25740; time to throw 1.233 s
- exclusive affected plays against A0: 15208 (PAST_ONLY (a beaten or gaining tick) 15208; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 99.55 %; band floor plus counter 0.00 % of first dirt
- clean_with_live_won_rep: ticks 0.172 %, dropbacks 0.171 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 57.26 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 254672, S 0, L 0, failures 0
- dice: 103623 reps, 0 beats, 0 dieless ticks, 254672 rolled ticks, 509344 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 25740 legacy plays, failures 0

### A11 (pricing arm, never a design value), flat (pricing arm, never a design value)

- dropbacks 48297; time to throw 2.739 s
- exclusive affected plays against A14: 14081 (S (a beat played) 13549, WINDOW (a window tick played) 1568; window-only dirt 151 (0.313 points, Poisson SE 0.025))
- quick-pressure share 73.40 %; band floor plus counter 3.58 % of first dirt
- clean_with_live_won_rep: ticks 0.041 %, dropbacks 0.159 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 23.88 %: the miss rule classes nothing at step 1 (O31)
- window: on, 12660 1-14 POWER reps (8807 with no beat), cases two 3730 / one 88 / none 35, played gaining 1487 / beaten 1196, 64622 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 992044, L 0, failures 0
- dice: 194385 reps, 194385 beats, 992044 dieless ticks, 0 rolled ticks, 0 jitter rolls, 194385 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): PUSH 803/803, THROUGH 13776/13776, FREE 5877/5877, ARC 9060/9060; 49216 threats checked, 179168 blocked, 0 legacy plays, failures 0

### A11 (pricing arm, never a design value), gen (pricing arm, never a design value)

- dropbacks 26578; time to throw 2.695 s
- exclusive affected plays against A14: 7777 (S (a beat played) 7486, WINDOW (a window tick played) 846; window-only dirt 85 (0.320 points, Poisson SE 0.035))
- quick-pressure share 73.17 %; band floor plus counter 4.05 % of first dirt
- clean_with_live_won_rep: ticks 0.025 %, dropbacks 0.098 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 26.82 %: the miss rule classes nothing at step 1 (O31)
- window: on, 6953 1-14 POWER reps (4907 with no beat), cases two 1979 / one 48 / none 19, played gaining 804 / beaten 654, 35652 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 547506, L 0, failures 0
- dice: 107029 reps, 107029 beats, 547506 dieless ticks, 0 rolled ticks, 0 jitter rolls, 107029 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): FREE 3131/3131, ARC 4851/4851, PUSH 410/410, THROUGH 7625/7625; 26123 threats checked, 98655 blocked, 0 legacy plays, failures 0

### A12 (pricing arm, never a design value), flat (pricing arm, never a design value)

- dropbacks 49971; time to throw 2.628 s
- exclusive affected plays against A14: 49971 (L (a band changed before R) 49971; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 94.64 %; band floor plus counter 71.52 % of first dirt
- clean_with_live_won_rep: ticks 0.032 %, dropbacks 0.064 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 85.14 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (999963 before), failures 0
- margins rebuilt: legacy 0, S 0, L 999963, failures 0
- dice: 201143 reps, 0 beats, 0 dieless ticks, 999963 rolled ticks, 1999926 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 12256/12256, THROUGH 21927/21927, FREE 6181/6181, PUSH 117/117; 62452 threats checked, 175546 blocked, 0 legacy plays, failures 0

### A12 (pricing arm, never a design value), gen (pricing arm, never a design value)

- dropbacks 27871; time to throw 2.558 s
- exclusive affected plays against A14: 27870 (L (a band changed before R) 27870; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 94.90 %; band floor plus counter 72.16 % of first dirt
- clean_with_live_won_rep: ticks 0.032 %, dropbacks 0.065 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 86.53 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 8, 0 ticks at t >= R (551109 before), failures 0
- margins rebuilt: legacy 0, S 0, L 551109, failures 0
- dice: 112328 reps, 0 beats, 0 dieless ticks, 551109 rolled ticks, 1102218 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 6156/6156, THROUGH 12606/12606, FREE 3301/3301, PUSH 53/53; 32581 threats checked, 98250 blocked, 0 legacy plays, failures 0

### A13 (pricing arm, never a design value), flat (pricing arm, never a design value)

- dropbacks 48477; time to throw 2.475 s
- exclusive affected plays against A14: 48477 (L (a band changed before R) 48477; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 96.27 %; band floor plus counter 72.21 % of first dirt
- clean_with_live_won_rep: ticks 0.044 %, dropbacks 0.070 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 92.46 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 4442 ticks at t >= R (889173 before), failures 0
- margins rebuilt: legacy 0, S 0, L 893615, failures 0
- dice: 195005 reps, 0 beats, 0 dieless ticks, 893615 rolled ticks, 1787230 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 18473/18473, THROUGH 30351/30351, PUSH 646/646, FREE 5901/5901; 82696 threats checked, 154061 blocked, 0 legacy plays, failures 0

### A13 (pricing arm, never a design value), gen (pricing arm, never a design value)

- dropbacks 27121; time to throw 2.403 s
- exclusive affected plays against A14: 27121 (L (a band changed before R) 27121; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 96.30 %; band floor plus counter 72.71 % of first dirt
- clean_with_live_won_rep: ticks 0.039 %, dropbacks 0.063 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 93.28 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R 5, 2595 ticks at t >= R (492678 before), failures 0
- margins rebuilt: legacy 0, S 0, L 495273, failures 0
- dice: 109223 reps, 0 beats, 0 dieless ticks, 495273 rolled ticks, 990546 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 17839/17839, ARC 9420/9420, FREE 3250/3250, PUSH 325/325; 44173 threats checked, 86226 blocked, 0 legacy plays, failures 0

### A14 (pricing arm, never a design value), flat (pricing reference, base of A11-A13)

- dropbacks 36904; time to throw 2.396 s
- exclusive affected plays against A0: 36904 (HOLD (every dropback) 36904; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 99.02 %; band floor plus counter 10.92 % of first dirt
- clean_with_live_won_rep: ticks 0.167 %, dropbacks 0.176 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 91.41 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 470413, S 0, L 0, failures 0
- dice: 148431 reps, 0 beats, 0 dieless ticks, 470413 rolled ticks, 940826 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 36904 legacy plays, failures 0

### A14 (pricing arm, never a design value), gen (pricing reference, base of A11-A13)

- dropbacks 20874; time to throw 2.250 s
- exclusive affected plays against A0: 20874 (HOLD (every dropback) 20874; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 99.01 %; band floor plus counter 10.79 % of first dirt
- clean_with_live_won_rep: ticks 0.121 %, dropbacks 0.125 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 92.56 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 281918, S 0, L 0, failures 0
- dice: 84109 reps, 0 beats, 0 dieless ticks, 281918 rolled ticks, 563836 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 20874 legacy plays, failures 0

### A15 (context only; pricing arm, never a design value), flat (context only (sLateArm, O27))

- dropbacks 50526; time to throw 2.809 s
- exclusive affected plays against A0b: 15617 (S (a beat played) 15617; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 33.30 %; band floor plus counter 0.82 % of first dirt
- clean_with_live_won_rep: ticks 0.791 %, dropbacks 3.840 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 21.04 %: the miss rule classes nothing at step 1 (O31)
- window: off, 13178 1-14 POWER reps (9201 with no beat), cases two 3847 / one 96 / none 34, played gaining 0 / beaten 0, 72469 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 1110297, L 0, failures 0
- dice: 203419 reps, 203419 beats, 1110297 dieless ticks, 0 rolled ticks, 0 jitter rolls, 203419 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): ARC 10001/10001, THROUGH 15410/15410, FREE 6347/6347, PUSH 890/890; 40442 threats checked, 185864 blocked, 0 legacy plays, failures 0

### A15 (context only; pricing arm, never a design value), gen (context only (sLateArm, O27))

- dropbacks 27434; time to throw 2.799 s
- exclusive affected plays against A0b: 8717 (S (a beat played) 8717; window-only dirt 0 (0.000 points, Poisson SE 0.000))
- quick-pressure share 33.12 %; band floor plus counter 1.68 % of first dirt
- clean_with_live_won_rep: ticks 0.818 %, dropbacks 3.988 %, PUSH ticks apart 0.000 %
- pass-rush win rate (pbwr_sim_only, mean over rushers) 0.03 %: a pre-beat tick is a capped margin, not a rep outcome (O30)
- the miss rule's n (pressured_share_2s_no_free_runner) 23.80 %: the miss rule classes nothing at step 1 (O31)
- window: off, 6897 1-14 POWER reps (4852 with no beat), cases two 1985 / one 47 / none 13, played gaining 0 / beaten 0, 38224 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 0, S 607798, L 0, failures 0
- dice: 110496 reps, 110496 beats, 607798 dieless ticks, 0 rolled ticks, 0 jitter rolls, 110496 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): THROUGH 8726/8726, ARC 5458/5458, FREE 3367/3367, PUSH 467/467; 21984 threats checked, 100559 blocked, 0 legacy plays, failures 0

### A0b (pricing arm, never a design value), flat (base of A15)

- dropbacks 37175; time to throw 2.471 s
- exclusive affected plays: none (no base)
- quick-pressure share 95.44 %; band floor plus counter 2.95 % of first dirt
- clean_with_live_won_rep: ticks 4.862 %, dropbacks 7.817 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 81.19 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 494615, S 0, L 0, failures 0
- dice: 149760 reps, 0 beats, 0 dieless ticks, 494615 rolled ticks, 989230 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 37175 legacy plays, failures 0

### A0b (pricing arm, never a design value), gen (base of A15)

- dropbacks 21432; time to throw 2.314 s
- exclusive affected plays: none (no base)
- quick-pressure share 95.36 %; band floor plus counter 2.78 % of first dirt
- clean_with_live_won_rep: ticks 4.865 %, dropbacks 7.904 %, PUSH ticks apart 0.000 %
- the miss rule's n (pressured_share_2s_no_free_runner) 85.17 %: the miss rule classes nothing at step 1 (O31)
- window: not S, 0 1-14 POWER reps (0 with no beat), cases two 0 / one 0 / none 0, played gaining 0 / beaten 0, 0 ticks checked, failures 0
- L equals today: R none, 0 ticks at t >= R (0 before), failures 0
- margins rebuilt: legacy 305599, S 0, L 0, failures 0
- dice: 86181 reps, 0 beats, 0 dieless ticks, 305599 rolled ticks, 611198 jitter rolls, 0 uniform rolls, 0 window labels, failures 0
- approach (published agreeing / threatened rushers): legacy plays only; 0 threats checked, 0 blocked, 21432 legacy plays, failures 0

## The step reports, one per base group

### A0 with A1, A2, A3, A4, A5, A6, A7, A8, A9, A10

```text
ADR-089 step 1: the pocket report (11 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A0 (the base arm): release clock the decision tick ==
  time to throw: flat 1.242 s | gen 1.235 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 7201 of 43837 dropbacks (16.43 per 100); pressuredSacks 7201; pressured dropbacks 38071 (86.85 per 100) [time to throw 1.242 s]
    gen: sacks 4308 of 25758 dropbacks (16.72 per 100); pressuredSacks 4308; pressured dropbacks 21962 (85.26 per 100) [time to throw 1.235 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 18.91% | -3.11 against 22.02% (PR #33, FTN only (held)) | 3.45 against 15.46% (main) [time to throw 1.242 s]
    gen: 19.62% | -2.40 against 22.02% (PR #33, FTN only (held)) | 4.16 against 15.46% (main) [time to throw 1.235 s]
  rows (66, both leagues):
  threat_creation_rate: flat 86.85 % | gen 85.26 %
  hit_or_sack_rate: flat 20.05 % [time to throw 1.242 s] | gen 24.04 % [time to throw 1.235 s]
  sack_rate: flat 16.43 % [time to throw 1.242 s] | gen 16.72 % [time to throw 1.235 s]
  time_to_throw: flat 1.242 seconds | gen 1.235 seconds
  sack_share_of_hit_or_sack: flat 81.94 % [time to throw 1.242 s] | gen 69.57 % [time to throw 1.235 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.242 s] | gen 0.00 % [time to throw 1.235 s]
  release_distribution: flat 1.242 seconds | gen 1.235 seconds
  pressured_share_by_release_bin: flat 83.21 % | gen 81.29 %
  hit_rate_by_release_bin: flat 7.86 % [time to throw 1.242 s] | gen 9.95 % [time to throw 1.235 s]
  hits_on_aimed_throws_per_dropback: flat 3.62 % [time to throw 1.242 s] | gen 7.31 % [time to throw 1.235 s]
  first_pressure_seconds: flat 0.877 seconds | gen 0.883 seconds
  first_forcing_seconds: flat 1.008 seconds | gen 1.015 seconds
  first_arrival_seconds: flat 1.397 seconds | gen 1.485 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 9.41%, FREE_RUNNER 29.03%, WON_REP 61.56%; gen COUNTER 9.77%, FREE_RUNNER 28.35%, WON_REP 61.88%)
  quick_pressure_share_by_origin: flat 99.81 % | gen 99.72 %
  clean_with_live_won_rep_ticks: flat 0.15 % | gen 0.12 %
  clean_with_live_won_rep_dropbacks: flat 0.13 % | gen 0.11 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 5.31 % | gen 2.82 %
  throwaway_rate_clean: flat 6.47 % | gen 3.32 %
  scramble_rate: flat 17.07 % | gen 6.44 %
  scramble_yards: flat 5.07 yards | gen 3.72 yards
  by_down_fixed_calls: flat 19.75 % | gen 18.67 %
  int_per_aimed_throw: flat 2.11 % | gen 6.80 %
  completion_per_aimed_throw: flat 40.32 % | gen 37.84 %
  forced_throw_share: flat 64.34 % | gen 67.98 %
  completion_by_pocket_status: flat 33.99 % | gen 33.02 %
  qb_season_spread: flat 0.00 pp | gen 5.76 pp
  defence_season_spread: flat 0.35 pp | gen 1.36 pp
  unblocked_pressures_per_100: flat 19.34 per 100 dropbacks | gen 18.10 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 7.95 % [time to throw 1.242 s] | gen 7.93 % [time to throw 1.235 s]
  unblocked_men_per_100: flat 19.34 per 100 dropbacks | gen 18.10 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 79.81 % | gen 77.73 %
  quick_share_no_free_runner: flat 99.73 % | gen 99.61 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 5.38 % | gen 2.72 %
  situation_q1q3_last_two: flat 5.20 % | gen 3.28 %
  sack_share_of_contacts_in_out: flat 81.94 % [time to throw 1.242 s] | gen 69.57 % [time to throw 1.235 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.242 s] | gen 0.00 % [time to throw 1.235 s]
  sacker_mix.split.interior: flat 85.04 % [time to throw 1.242 s] | gen 86.90 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 9.91 % [time to throw 1.242 s] | gen 8.64 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.02 % [time to throw 1.242 s] | gen 4.43 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 1.242 s] | gen 0.03 % [time to throw 1.235 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 81.69 % [time to throw 1.242 s] | gen 82.51 % [time to throw 1.235 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.29 % | gen 0.48 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 1.96 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.62 % | gen 18.87 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 4.71 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.07 % | gen 16.29 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.61 % | gen 17.10 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 41.45 % | gen 43.20 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.10 % | gen 15.11 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 35.99 % | gen 33.30 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.14 % | gen 19.43 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 22.54 % | gen 23.99 %
  nobody_open_share: flat 47.94 % of dropbacks | gen 54.44 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 21.13 % of dropbacks | gen 25.79 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 4.93 % of dropbacks | gen 9.03 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 5.46 % of dropbacks | gen 2.90 % of dropbacks
  nobody_open_share.split.SACK: flat 16.43 % of dropbacks [time to throw 1.242 s] | gen 16.72 % of dropbacks [time to throw 1.235 s]
  clean_checkdown_share: flat 7.75 % of clean aimed throws | gen 3.13 % of clean aimed throws
  clean_later_read_share: flat 9.20 % of clean aimed throws | gen 11.85 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.93, per aimed throw 2.11; forced-throw share 64.34; completion per attempt 37.01, per aimed throw 40.32; INT-source mix CONTESTED_CATCH 90.96, TIPPED_RECOVERY 9.04
      flat PROGRESSION: 11599 aimed, INT 0.29, completion 41.45
      flat RANK_PUSHED: 3382 aimed, INT 11.62, completion 14.10
      flat CHECKDOWN: 9261 aimed, INT 0.24, completion 35.99
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2161 aimed, INT 4.07, completion 23.14
      flat ON_THE_RUN: 355 aimed, INT 7.61, completion 22.54
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.61 against a real 3.25
    gen: INT per attempt 6.54, per aimed throw 6.80; forced-throw share 67.98; completion per attempt 36.42, per aimed throw 37.84; INT-source mix CONTESTED_CATCH 49.03, TIPPED_RECOVERY 50.97
      gen PROGRESSION: 7636 aimed, INT 1.96, completion 43.20
      gen RANK_PUSHED: 2019 aimed, INT 18.87, completion 15.11
      gen CHECKDOWN: 6643 aimed, INT 4.71, completion 33.30
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2326 aimed, INT 16.29, completion 19.43
      gen ON_THE_RUN: 421 aimed, INT 17.10, completion 23.99
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.10 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== A1: release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.666 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1383 of 51165 dropbacks (2.70 per 100); pressuredSacks 1383; pressured dropbacks 16276 (31.81 per 100) [time to throw 1.589 s]
    gen: sacks 793 of 28361 dropbacks (2.80 per 100); pressuredSacks 793; pressured dropbacks 9372 (33.05 per 100) [time to throw 1.666 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.50% | -13.52 against 22.02% (PR #33, FTN only (held)) | -6.96 against 15.46% (main) [time to throw 1.589 s]
    gen: 8.46% | -13.56 against 22.02% (PR #33, FTN only (held)) | -7.00 against 15.46% (main) [time to throw 1.666 s]
  rows (66, both leagues):
  threat_creation_rate: flat 31.81 % | gen 33.05 %
  hit_or_sack_rate: flat 3.29 % [time to throw 1.589 s] | gen 3.89 % [time to throw 1.666 s]
  sack_rate: flat 2.70 % [time to throw 1.589 s] | gen 2.80 % [time to throw 1.666 s]
  time_to_throw: flat 1.589 seconds | gen 1.666 seconds
  sack_share_of_hit_or_sack: flat 82.08 % [time to throw 1.589 s] | gen 71.89 % [time to throw 1.666 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.666 s]
  release_distribution: flat 1.589 seconds | gen 1.666 seconds
  pressured_share_by_release_bin: flat 19.82 % | gen 20.65 %
  hit_rate_by_release_bin: flat 2.21 % [time to throw 1.589 s] | gen 2.78 % [time to throw 1.666 s]
  hits_on_aimed_throws_per_dropback: flat 0.59 % [time to throw 1.589 s] | gen 1.09 % [time to throw 1.666 s]
  first_pressure_seconds: flat 0.803 seconds | gen 0.911 seconds
  first_forcing_seconds: flat 1.122 seconds | gen 1.232 seconds
  first_arrival_seconds: flat 1.601 seconds | gen 1.694 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 1.91%, FREE_RUNNER 79.34%, WON_REP 18.75%; gen COUNTER 2.01%, FREE_RUNNER 75.27%, WON_REP 22.73%)
  quick_pressure_share_by_origin: flat 94.40 % | gen 91.05 %
  clean_with_live_won_rep_ticks: flat 0.03 % | gen 0.01 %
  clean_with_live_won_rep_dropbacks: flat 0.06 % | gen 0.04 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.28 % | gen 7.22 %
  throwaway_rate_clean: flat 19.40 % | gen 10.43 %
  scramble_rate: flat 3.93 % | gen 1.97 %
  scramble_yards: flat 6.90 yards | gen 5.51 yards
  by_down_fixed_calls: flat 9.99 % | gen 9.41 %
  int_per_aimed_throw: flat 2.64 % | gen 7.67 %
  completion_per_aimed_throw: flat 45.64 % | gen 42.13 %
  forced_throw_share: flat 20.30 % | gen 23.81 %
  completion_by_pocket_status: flat 30.85 % | gen 30.63 %
  qb_season_spread: flat 0.33 pp | gen 2.96 pp
  defence_season_spread: flat 0.65 pp | gen 0.05 pp
  unblocked_pressures_per_100: flat 19.10 per 100 dropbacks | gen 18.33 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.31 % [time to throw 1.589 s] | gen 62.28 % [time to throw 1.666 s]
  unblocked_men_per_100: flat 19.10 per 100 dropbacks | gen 18.33 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.76 % | gen 10.90 %
  quick_share_no_free_runner: flat 72.89 % | gen 63.81 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.80 % | gen 7.29 %
  situation_q1q3_last_two: flat 11.03 % | gen 7.54 %
  sack_share_of_contacts_in_out: flat 82.08 % [time to throw 1.589 s] | gen 71.89 % [time to throw 1.666 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.666 s]
  sacker_mix.split.interior: flat 30.26 % [time to throw 1.589 s] | gen 30.18 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 36.73 % [time to throw 1.589 s] | gen 38.51 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 32.43 % [time to throw 1.589 s] | gen 30.81 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.58 % [time to throw 1.589 s] | gen 0.51 % [time to throw 1.666 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.51 % [time to throw 1.589 s] | gen 30.56 % [time to throw 1.666 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.01 % | gen 0.00 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.50 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.04 % | gen 21.51 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.65 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.13 % | gen 17.16 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.45 % | gen 17.04 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.29 % | gen 46.33 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.61 % | gen 19.19 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.84 % | gen 39.88 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.97 % | gen 21.36 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.81 % | gen 18.52 %
  nobody_open_share: flat 44.16 % of dropbacks | gen 36.26 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.97 % of dropbacks | gen 13.43 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.36 % of dropbacks | gen 10.67 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.13 % of dropbacks | gen 9.37 % of dropbacks
  nobody_open_share.split.SACK: flat 2.70 % of dropbacks [time to throw 1.589 s] | gen 2.80 % of dropbacks [time to throw 1.666 s]
  clean_checkdown_share: flat 20.37 % of clean aimed throws | gen 9.37 % of clean aimed throws
  clean_later_read_share: flat 15.91 % of clean aimed throws | gen 22.97 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.15, per aimed throw 2.64; forced-throw share 20.30; completion per attempt 37.27, per aimed throw 45.64; INT-source mix CONTESTED_CATCH 90.76, TIPPED_RECOVERY 9.24
      flat PROGRESSION: 19956 aimed, INT 0.30, completion 44.29
      flat RANK_PUSHED: 6445 aimed, INT 12.04, completion 17.61
      flat CHECKDOWN: 9194 aimed, INT 0.17, completion 44.84
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3253 aimed, INT 5.13, completion 27.97
      flat ON_THE_RUN: 155 aimed, INT 6.45, completion 25.81
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.45 against a real 3.25
    gen: INT per attempt 6.91, per aimed throw 7.67; forced-throw share 23.81; completion per attempt 37.98, per aimed throw 42.13; INT-source mix CONTESTED_CATCH 44.67, TIPPED_RECOVERY 55.33
      gen PROGRESSION: 13430 aimed, INT 2.50, completion 46.33
      gen RANK_PUSHED: 3951 aimed, INT 21.51, completion 19.19
      gen CHECKDOWN: 3809 aimed, INT 3.65, completion 39.88
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3025 aimed, INT 17.16, completion 21.36
      gen ON_THE_RUN: 135 aimed, INT 17.04, completion 18.52
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.04 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.64, rise 0.53 against an allowed 0.20: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.30, rise 0.00 against an allowed 0.18: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 12.04, rise 0.42 against an allowed 0.24: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.24 -> arm 0.17, rise -0.06 against an allowed 0.17: PASSES
    flat DESPERATION: base 4.07 -> arm 5.13, rise 1.06 against an allowed 0.32: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 7.61 -> arm 6.45, rise -1.15 against an allowed 0.25: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 7.67, rise 0.87 against an allowed 0.34: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 2.50, rise 0.54 against an allowed 0.25: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 18.87 -> arm 21.51, rise 2.64 against an allowed 0.42: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 3.65, rise -1.06 against an allowed 0.36: PASSES
    gen DESPERATION: base 16.29 -> arm 17.16, rise 0.86 against an allowed 0.60: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 17.10 -> arm 17.04, rise -0.07 against an allowed 0.11: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 6735 | gen 4266

== A2: release clock the decision tick ==
  time to throw: flat 1.589 s | gen 1.668 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1382 of 51160 dropbacks (2.70 per 100); pressuredSacks 1382; pressured dropbacks 16132 (31.53 per 100) [time to throw 1.589 s]
    gen: sacks 794 of 28332 dropbacks (2.80 per 100); pressuredSacks 794; pressured dropbacks 9293 (32.80 per 100) [time to throw 1.668 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.57% | -13.45 against 22.02% (PR #33, FTN only (held)) | -6.89 against 15.46% (main) [time to throw 1.589 s]
    gen: 8.54% | -13.48 against 22.02% (PR #33, FTN only (held)) | -6.92 against 15.46% (main) [time to throw 1.668 s]
  rows (66, both leagues):
  threat_creation_rate: flat 31.53 % | gen 32.80 %
  hit_or_sack_rate: flat 3.30 % [time to throw 1.589 s] | gen 3.89 % [time to throw 1.668 s]
  sack_rate: flat 2.70 % [time to throw 1.589 s] | gen 2.80 % [time to throw 1.668 s]
  time_to_throw: flat 1.589 seconds | gen 1.668 seconds
  sack_share_of_hit_or_sack: flat 81.97 % [time to throw 1.589 s] | gen 72.05 % [time to throw 1.668 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.668 s]
  release_distribution: flat 1.589 seconds | gen 1.668 seconds
  pressured_share_by_release_bin: flat 19.41 % | gen 20.35 %
  hit_rate_by_release_bin: flat 2.23 % [time to throw 1.589 s] | gen 2.73 % [time to throw 1.668 s]
  hits_on_aimed_throws_per_dropback: flat 0.59 % [time to throw 1.589 s] | gen 1.09 % [time to throw 1.668 s]
  first_pressure_seconds: flat 0.798 seconds | gen 0.908 seconds
  first_forcing_seconds: flat 1.121 seconds | gen 1.233 seconds
  first_arrival_seconds: flat 1.602 seconds | gen 1.696 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat FREE_RUNNER 80.06%, WON_REP 19.94%; gen FREE_RUNNER 75.78%, WON_REP 24.22%)
  quick_pressure_share_by_origin: flat 94.45 % | gen 91.05 %
  clean_with_live_won_rep_ticks: flat 0.03 % | gen 0.02 %
  clean_with_live_won_rep_dropbacks: flat 0.06 % | gen 0.04 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 12.17 % | gen 7.27 %
  throwaway_rate_clean: flat 19.42 % | gen 10.40 %
  scramble_rate: flat 3.94 % | gen 1.97 %
  scramble_yards: flat 6.84 yards | gen 5.35 yards
  by_down_fixed_calls: flat 10.18 % | gen 9.43 %
  int_per_aimed_throw: flat 2.65 % | gen 7.68 %
  completion_per_aimed_throw: flat 45.69 % | gen 42.17 %
  forced_throw_share: flat 20.30 % | gen 23.77 %
  completion_by_pocket_status: flat 30.86 % | gen 30.63 %
  qb_season_spread: flat 0.28 pp | gen 3.05 pp
  defence_season_spread: flat 0.64 pp | gen 0.38 pp
  unblocked_pressures_per_100: flat 19.12 per 100 dropbacks | gen 18.31 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.40 % [time to throw 1.589 s] | gen 62.25 % [time to throw 1.668 s]
  unblocked_men_per_100: flat 19.12 per 100 dropbacks | gen 18.31 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 8.30 % | gen 10.52 %
  quick_share_no_free_runner: flat 72.16 % | gen 63.04 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 11.49 % | gen 7.20 %
  situation_q1q3_last_two: flat 11.01 % | gen 8.07 %
  sack_share_of_contacts_in_out: flat 81.97 % [time to throw 1.589 s] | gen 72.05 % [time to throw 1.668 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.589 s] | gen 0.00 % [time to throw 1.668 s]
  sacker_mix.split.interior: flat 30.43 % [time to throw 1.589 s] | gen 30.33 % [time to throw 1.668 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 36.61 % [time to throw 1.589 s] | gen 38.21 % [time to throw 1.668 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 32.38 % [time to throw 1.589 s] | gen 30.83 % [time to throw 1.668 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.58 % [time to throw 1.589 s] | gen 0.63 % [time to throw 1.668 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 30.68 % [time to throw 1.589 s] | gen 30.64 % [time to throw 1.668 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.01 % | gen 0.00 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 2.47 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.07 % | gen 21.64 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.17 % | gen 3.71 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.13 % | gen 17.17 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.45 % | gen 17.39 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.29 % | gen 46.33 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.67 % | gen 19.30 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.84 % | gen 39.87 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 28.09 % | gen 21.47 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.81 % | gen 18.12 %
  nobody_open_share: flat 44.18 % of dropbacks | gen 36.26 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 17.98 % of dropbacks | gen 13.41 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.36 % of dropbacks | gen 10.67 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.13 % of dropbacks | gen 9.37 % of dropbacks
  nobody_open_share.split.SACK: flat 2.70 % of dropbacks [time to throw 1.589 s] | gen 2.80 % of dropbacks [time to throw 1.668 s]
  clean_checkdown_share: flat 20.42 % of clean aimed throws | gen 9.34 % of clean aimed throws
  clean_later_read_share: flat 15.95 % of clean aimed throws | gen 23.10 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.16, per aimed throw 2.65; forced-throw share 20.30; completion per attempt 37.31, per aimed throw 45.69; INT-source mix CONTESTED_CATCH 90.79, TIPPED_RECOVERY 9.21
      flat PROGRESSION: 19940 aimed, INT 0.31, completion 44.29
      flat RANK_PUSHED: 6447 aimed, INT 12.07, completion 17.67
      flat CHECKDOWN: 9200 aimed, INT 0.17, completion 44.84
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3254 aimed, INT 5.13, completion 28.09
      flat ON_THE_RUN: 155 aimed, INT 6.45, completion 25.81
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.45 against a real 3.25
    gen: INT per attempt 6.93, per aimed throw 7.68; forced-throw share 23.77; completion per attempt 38.02, per aimed throw 42.17; INT-source mix CONTESTED_CATCH 44.89, TIPPED_RECOVERY 55.11
      gen PROGRESSION: 13422 aimed, INT 2.47, completion 46.33
      gen RANK_PUSHED: 3942 aimed, INT 21.64, completion 19.30
      gen CHECKDOWN: 3800 aimed, INT 3.71, completion 39.87
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3023 aimed, INT 17.17, completion 21.47
      gen ON_THE_RUN: 138 aimed, INT 17.39, completion 18.12
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.39 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.65, rise 0.54 against an allowed 0.20: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.31, rise 0.01 against an allowed 0.18: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 12.07, rise 0.45 against an allowed 0.24: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.24 -> arm 0.17, rise -0.06 against an allowed 0.17: PASSES
    flat DESPERATION: base 4.07 -> arm 5.13, rise 1.06 against an allowed 0.32: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 7.61 -> arm 6.45, rise -1.15 against an allowed 0.25: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 7.68, rise 0.88 against an allowed 0.34: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 2.47, rise 0.51 against an allowed 0.25: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 18.87 -> arm 21.64, rise 2.77 against an allowed 0.42: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 3.71, rise -1.00 against an allowed 0.37: PASSES
    gen DESPERATION: base 16.29 -> arm 17.17, rise 0.87 against an allowed 0.60: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 17.10 -> arm 17.39, rise 0.29 against an allowed 0.13: BREACH: the step stops and comes back to the owner with a second seed set
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 6274 | gen 4008

== A3: release clock the decision tick ==
  time to throw: flat 1.546 s | gen 1.586 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1958 of 51091 dropbacks (3.83 per 100); pressuredSacks 1958; pressured dropbacks 38088 (74.55 per 100) [time to throw 1.546 s]
    gen: sacks 1103 of 28708 dropbacks (3.84 per 100); pressuredSacks 1103; pressured dropbacks 21631 (75.35 per 100) [time to throw 1.586 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 5.14% | -16.88 against 22.02% (PR #33, FTN only (held)) | -10.32 against 15.46% (main) [time to throw 1.546 s]
    gen: 5.10% | -16.92 against 22.02% (PR #33, FTN only (held)) | -10.36 against 15.46% (main) [time to throw 1.586 s]
  rows (66, both leagues):
  threat_creation_rate: flat 74.55 % | gen 75.35 %
  hit_or_sack_rate: flat 4.82 % [time to throw 1.546 s] | gen 5.82 % [time to throw 1.586 s]
  sack_rate: flat 3.83 % [time to throw 1.546 s] | gen 3.84 % [time to throw 1.586 s]
  time_to_throw: flat 1.546 seconds | gen 1.586 seconds
  sack_share_of_hit_or_sack: flat 79.46 % [time to throw 1.546 s] | gen 66.01 % [time to throw 1.586 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.546 s] | gen 0.00 % [time to throw 1.586 s]
  release_distribution: flat 1.546 seconds | gen 1.586 seconds
  pressured_share_by_release_bin: flat 87.17 % | gen 87.99 %
  hit_rate_by_release_bin: flat 4.31 % [time to throw 1.546 s] | gen 6.25 % [time to throw 1.586 s]
  hits_on_aimed_throws_per_dropback: flat 0.99 % [time to throw 1.546 s] | gen 1.98 % [time to throw 1.586 s]
  first_pressure_seconds: flat 1.011 seconds | gen 1.029 seconds
  first_forcing_seconds: flat 1.440 seconds | gen 1.510 seconds
  first_arrival_seconds: flat 1.798 seconds | gen 1.886 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 66.04%, FREE_RUNNER 33.84%, WON_REP 0.12%; gen COUNTER 66.94%, FREE_RUNNER 32.92%, WON_REP 0.14%)
  quick_pressure_share_by_origin: flat 99.13 % | gen 98.81 %
  clean_with_live_won_rep_ticks: flat 0.01 % | gen 0.02 %
  clean_with_live_won_rep_dropbacks: flat 0.02 % | gen 0.02 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 17.98 % | gen 9.99 %
  throwaway_rate_clean: flat 7.61 % | gen 3.72 %
  scramble_rate: flat 5.04 % | gen 2.45 %
  scramble_yards: flat 6.83 yards | gen 5.29 yards
  by_down_fixed_calls: flat 5.65 % | gen 4.92 %
  int_per_aimed_throw: flat 2.41 % | gen 6.98 %
  completion_per_aimed_throw: flat 42.42 % | gen 39.39 %
  forced_throw_share: flat 30.63 % | gen 38.62 %
  completion_by_pocket_status: flat 30.00 % | gen 31.15 %
  qb_season_spread: flat 0.28 pp | gen 2.07 pp
  defence_season_spread: flat 0.20 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.16 per 100 dropbacks | gen 18.50 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 40.83 % [time to throw 1.546 s] | gen 40.69 % [time to throw 1.586 s]
  unblocked_men_per_100: flat 19.16 per 100 dropbacks | gen 18.50 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 85.35 % | gen 86.48 %
  quick_share_no_free_runner: flat 98.68 % | gen 98.22 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.21 % | gen 9.91 %
  situation_q1q3_last_two: flat 18.20 % | gen 9.88 %
  sack_share_of_contacts_in_out: flat 79.46 % [time to throw 1.546 s] | gen 65.99 % [time to throw 1.586 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.546 s] | gen 0.00 % [time to throw 1.586 s]
  sacker_mix.split.interior: flat 51.23 % [time to throw 1.546 s] | gen 51.77 % [time to throw 1.586 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 26.66 % [time to throw 1.546 s] | gen 27.13 % [time to throw 1.586 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 21.80 % [time to throw 1.546 s] | gen 21.10 % [time to throw 1.586 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.31 % [time to throw 1.546 s] | gen n/a % [time to throw 1.586 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 51.17 % [time to throw 1.546 s] | gen 51.59 % [time to throw 1.586 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 9.21 % | gen 11.15 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.28 % | gen 2.15 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.59 % | gen 21.20 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.15 % | gen 3.62 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.28 % | gen 15.20 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.56 % | gen 14.90 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 41.19 % | gen 43.39 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.36 % | gen 16.33 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 40.43 % | gen 36.40 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 25.14 % | gen 20.80 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.28 % | gen 21.63 %
  nobody_open_share: flat 45.05 % of dropbacks | gen 39.03 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 19.33 % of dropbacks | gen 15.98 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.55 % of dropbacks | gen 10.77 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 15.34 % of dropbacks | gen 8.44 % of dropbacks
  nobody_open_share.split.SACK: flat 3.83 % of dropbacks [time to throw 1.546 s] | gen 3.84 % of dropbacks [time to throw 1.586 s]
  clean_checkdown_share: flat 16.19 % of clean aimed throws | gen 6.22 % of clean aimed throws
  clean_later_read_share: flat 13.22 % of clean aimed throws | gen 17.68 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.00, per aimed throw 2.41; forced-throw share 30.63; completion per attempt 35.28, per aimed throw 42.42; INT-source mix CONTESTED_CATCH 92.50, TIPPED_RECOVERY 7.50
      flat PROGRESSION: 19139 aimed, INT 0.28, completion 41.19
      flat RANK_PUSHED: 6057 aimed, INT 11.59, completion 16.36
      flat CHECKDOWN: 9877 aimed, INT 0.15, completion 40.43
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3345 aimed, INT 4.28, completion 25.14
      flat ON_THE_RUN: 305 aimed, INT 6.56, completion 23.28
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.56 against a real 3.25
    gen: INT per attempt 6.35, per aimed throw 6.98; forced-throw share 38.62; completion per attempt 35.84, per aimed throw 39.39; INT-source mix CONTESTED_CATCH 47.48, TIPPED_RECOVERY 52.52
      gen PROGRESSION: 12996 aimed, INT 2.15, completion 43.39
      gen RANK_PUSHED: 3594 aimed, INT 21.20, completion 16.33
      gen CHECKDOWN: 4588 aimed, INT 3.62, completion 36.40
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3092 aimed, INT 15.20, completion 20.80
      gen ON_THE_RUN: 208 aimed, INT 14.90, completion 21.63
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.90 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.41, rise 0.30 against an allowed 0.16: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.28, rise -0.02 against an allowed 0.13: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 11.59, rise -0.03 against an allowed 0.17: PASSES
    flat CHECKDOWN: base 0.24 -> arm 0.15, rise -0.09 against an allowed 0.18: PASSES
    flat DESPERATION: base 4.07 -> arm 4.28, rise 0.20 against an allowed 0.25: PASSES
    flat ON_THE_RUN: base 7.61 -> arm 6.56, rise -1.05 against an allowed 0.38: PASSES
    flat by class: PASSES
    gen league-wide: base 6.80 -> arm 6.98, rise 0.18 against an allowed 0.25: PASSES
    gen PROGRESSION: base 1.96 -> arm 2.15, rise 0.18 against an allowed 0.17: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 18.87 -> arm 21.20, rise 2.33 against an allowed 0.29: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 3.62, rise -1.09 against an allowed 0.37: PASSES
    gen DESPERATION: base 16.29 -> arm 15.20, rise -1.09 against an allowed 0.42: PASSES
    gen ON_THE_RUN: base 17.10 -> arm 14.90, rise -2.20 against an allowed 0.29: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 51087 | gen 28707

== A4: release clock the decision tick ==
  time to throw: flat 1.603 s | gen 1.650 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1306 of 52259 dropbacks (2.50 per 100); pressuredSacks 1306; pressured dropbacks 34708 (66.42 per 100) [time to throw 1.603 s]
    gen: sacks 725 of 28910 dropbacks (2.51 per 100); pressuredSacks 725; pressured dropbacks 19951 (69.01 per 100) [time to throw 1.650 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 3.76% | -18.26 against 22.02% (PR #33, FTN only (held)) | -11.70 against 15.46% (main) [time to throw 1.603 s]
    gen: 3.63% | -18.39 against 22.02% (PR #33, FTN only (held)) | -11.83 against 15.46% (main) [time to throw 1.650 s]
  rows (66, both leagues):
  threat_creation_rate: flat 66.42 % | gen 69.01 %
  hit_or_sack_rate: flat 2.94 % [time to throw 1.603 s] | gen 3.34 % [time to throw 1.650 s]
  sack_rate: flat 2.50 % [time to throw 1.603 s] | gen 2.51 % [time to throw 1.650 s]
  time_to_throw: flat 1.603 seconds | gen 1.650 seconds
  sack_share_of_hit_or_sack: flat 85.03 % [time to throw 1.603 s] | gen 75.05 % [time to throw 1.650 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.650 s]
  release_distribution: flat 1.603 seconds | gen 1.650 seconds
  pressured_share_by_release_bin: flat 84.61 % | gen 84.79 %
  hit_rate_by_release_bin: flat 1.15 % [time to throw 1.603 s] | gen 1.61 % [time to throw 1.650 s]
  hits_on_aimed_throws_per_dropback: flat 0.44 % [time to throw 1.603 s] | gen 0.83 % [time to throw 1.650 s]
  first_pressure_seconds: flat 1.148 seconds | gen 1.174 seconds
  first_forcing_seconds: flat 1.473 seconds | gen 1.567 seconds
  first_arrival_seconds: flat 1.701 seconds | gen 1.805 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 62.18%, FREE_RUNNER 37.82%; gen COUNTER 64.08%, FREE_RUNNER 35.92%)
  quick_pressure_share_by_origin: flat 98.64 % | gen 98.21 %
  clean_with_live_won_rep_ticks: flat 0.02 % | gen 0.00 %
  clean_with_live_won_rep_dropbacks: flat 0.02 % | gen 0.01 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 21.50 % | gen 11.82 %
  throwaway_rate_clean: flat 7.03 % | gen 3.78 %
  scramble_rate: flat 3.64 % | gen 1.87 %
  scramble_yards: flat 6.95 yards | gen 5.48 yards
  by_down_fixed_calls: flat 4.17 % | gen 4.60 %
  int_per_aimed_throw: flat 2.69 % | gen 7.01 %
  completion_per_aimed_throw: flat 42.91 % | gen 39.68 %
  forced_throw_share: flat 25.21 % | gen 30.24 %
  completion_by_pocket_status: flat 27.52 % | gen 30.30 %
  qb_season_spread: flat 0.30 pp | gen 1.35 pp
  defence_season_spread: flat 0.17 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.05 per 100 dropbacks | gen 18.19 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 68.75 % [time to throw 1.603 s] | gen 67.60 % [time to throw 1.650 s]
  unblocked_men_per_100: flat 19.05 per 100 dropbacks | gen 18.19 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 82.56 % | gen 82.85 %
  quick_share_no_free_runner: flat 97.82 % | gen 97.21 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 20.94 % | gen 12.19 %
  situation_q1q3_last_two: flat 20.71 % | gen 11.47 %
  sack_share_of_contacts_in_out: flat 85.00 % [time to throw 1.603 s] | gen 75.00 % [time to throw 1.650 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.603 s] | gen 0.00 % [time to throw 1.650 s]
  sacker_mix.split.interior: flat 24.68 % [time to throw 1.603 s] | gen 25.49 % [time to throw 1.650 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 39.84 % [time to throw 1.603 s] | gen 38.72 % [time to throw 1.650 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 35.02 % [time to throw 1.603 s] | gen 35.38 % [time to throw 1.650 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.47 % [time to throw 1.603 s] | gen 0.42 % [time to throw 1.650 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 25.16 % [time to throw 1.603 s] | gen 25.63 % [time to throw 1.650 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 10.42 % | gen 12.46 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.13 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.98 % | gen 19.92 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 2.94 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.72 % | gen 17.40 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.36 % | gen 17.02 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 41.57 % | gen 43.08 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.59 % | gen 18.06 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 42.08 % | gen 37.74 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 25.75 % | gen 19.02 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 28.18 % | gen 19.86 %
  nobody_open_share: flat 44.32 % of dropbacks | gen 37.08 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 18.41 % of dropbacks | gen 14.11 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.77 % of dropbacks | gen 11.13 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.64 % of dropbacks | gen 9.33 % of dropbacks
  nobody_open_share.split.SACK: flat 2.50 % of dropbacks [time to throw 1.603 s] | gen 2.51 % of dropbacks [time to throw 1.650 s]
  clean_checkdown_share: flat 18.80 % of clean aimed throws | gen 7.10 % of clean aimed throws
  clean_later_read_share: flat 13.48 % of clean aimed throws | gen 19.26 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.21, per aimed throw 2.69; forced-throw share 25.21; completion per attempt 35.30, per aimed throw 42.91; INT-source mix CONTESTED_CATCH 90.41, TIPPED_RECOVERY 9.59
      flat PROGRESSION: 20203 aimed, INT 0.35, completion 41.57
      flat RANK_PUSHED: 6769 aimed, INT 11.98, completion 16.59
      flat CHECKDOWN: 9623 aimed, INT 0.24, completion 42.08
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3538 aimed, INT 4.72, completion 25.75
      flat ON_THE_RUN: 220 aimed, INT 6.36, completion 28.18
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.36 against a real 3.25
    gen: INT per attempt 6.32, per aimed throw 7.01; forced-throw share 30.24; completion per attempt 35.81, per aimed throw 39.68; INT-source mix CONTESTED_CATCH 48.00, TIPPED_RECOVERY 52.00
      gen PROGRESSION: 13739 aimed, INT 2.13, completion 43.08
      gen RANK_PUSHED: 3770 aimed, INT 19.92, completion 18.06
      gen CHECKDOWN: 4078 aimed, INT 2.94, completion 37.74
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3218 aimed, INT 17.40, completion 19.02
      gen ON_THE_RUN: 141 aimed, INT 17.02, completion 19.86
      gen on the run: clean INT n/a against a real 2.11; pressured INT 17.02 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.69, rise 0.58 against an allowed 0.22: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.35, rise 0.05 against an allowed 0.18: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 11.98, rise 0.36 against an allowed 0.26: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.24 -> arm 0.24, rise 0.00 against an allowed 0.21: PASSES
    flat DESPERATION: base 4.07 -> arm 4.72, rise 0.65 against an allowed 0.36: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 7.61 -> arm 6.36, rise -1.24 against an allowed 0.51: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 7.01, rise 0.21 against an allowed 0.34: PASSES
    gen PROGRESSION: base 1.96 -> arm 2.13, rise 0.17 against an allowed 0.23: PASSES
    gen RANK_PUSHED: base 18.87 -> arm 19.92, rise 1.05 against an allowed 0.38: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 2.94, rise -1.77 against an allowed 0.47: PASSES
    gen DESPERATION: base 16.29 -> arm 17.40, rise 1.11 against an allowed 0.59: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 17.10 -> arm 17.02, rise -0.08 against an allowed 0.22: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 52256 | gen 28909

== A5: release clock the decision tick ==
  time to throw: flat 1.590 s | gen 1.651 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1240 of 51400 dropbacks (2.41 per 100); pressuredSacks 1240; pressured dropbacks 18760 (36.50 per 100) [time to throw 1.590 s]
    gen: sacks 696 of 28548 dropbacks (2.44 per 100); pressuredSacks 696; pressured dropbacks 11336 (39.71 per 100) [time to throw 1.651 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.61% | -15.41 against 22.02% (PR #33, FTN only (held)) | -8.85 against 15.46% (main) [time to throw 1.590 s]
    gen: 6.14% | -15.88 against 22.02% (PR #33, FTN only (held)) | -9.32 against 15.46% (main) [time to throw 1.651 s]
  rows (66, both leagues):
  threat_creation_rate: flat 36.50 % | gen 39.71 %
  hit_or_sack_rate: flat 2.86 % [time to throw 1.590 s] | gen 3.40 % [time to throw 1.651 s]
  sack_rate: flat 2.41 % [time to throw 1.590 s] | gen 2.44 % [time to throw 1.651 s]
  time_to_throw: flat 1.590 seconds | gen 1.651 seconds
  sack_share_of_hit_or_sack: flat 84.47 % [time to throw 1.590 s] | gen 71.60 % [time to throw 1.651 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.651 s]
  release_distribution: flat 1.590 seconds | gen 1.651 seconds
  pressured_share_by_release_bin: flat 26.63 % | gen 29.48 %
  hit_rate_by_release_bin: flat 1.31 % [time to throw 1.590 s] | gen 1.79 % [time to throw 1.651 s]
  hits_on_aimed_throws_per_dropback: flat 0.44 % [time to throw 1.590 s] | gen 0.97 % [time to throw 1.651 s]
  first_pressure_seconds: flat 1.075 seconds | gen 1.214 seconds
  first_forcing_seconds: flat 1.258 seconds | gen 1.423 seconds
  first_arrival_seconds: flat 1.658 seconds | gen 1.757 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 18.08%, FREE_RUNNER 69.09%, WON_REP 12.83%; gen COUNTER 20.67%, FREE_RUNNER 61.98%, WON_REP 17.35%)
  quick_pressure_share_by_origin: flat 83.89 % | gen 79.33 %
  clean_with_live_won_rep_ticks: flat 0.00 % | gen 0.00 %
  clean_with_live_won_rep_dropbacks: flat 0.00 % | gen 0.00 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 17.82 % | gen 10.70 %
  throwaway_rate_clean: flat 17.16 % | gen 8.87 %
  scramble_rate: flat 3.58 % | gen 1.88 %
  scramble_yards: flat 6.93 yards | gen 5.27 yards
  by_down_fixed_calls: flat 7.45 % | gen 5.78 %
  int_per_aimed_throw: flat 2.76 % | gen 7.44 %
  completion_per_aimed_throw: flat 45.48 % | gen 41.77 %
  forced_throw_share: flat 20.98 % | gen 26.32 %
  completion_by_pocket_status: flat 27.78 % | gen 28.53 %
  qb_season_spread: flat 0.75 pp | gen 1.99 pp
  defence_season_spread: flat 0.28 pp | gen 0.47 pp
  unblocked_pressures_per_100: flat 19.00 per 100 dropbacks | gen 18.28 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 70.64 % [time to throw 1.590 s] | gen 70.58 % [time to throw 1.651 s]
  unblocked_men_per_100: flat 19.00 per 100 dropbacks | gen 18.28 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 16.44 % | gen 20.65 %
  quick_share_no_free_runner: flat 47.89 % | gen 45.64 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 17.45 % | gen 10.15 %
  situation_q1q3_last_two: flat 17.00 % | gen 10.45 %
  sack_share_of_contacts_in_out: flat 84.47 % [time to throw 1.590 s] | gen 71.60 % [time to throw 1.651 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.590 s] | gen 0.00 % [time to throw 1.651 s]
  sacker_mix.split.interior: flat 22.42 % [time to throw 1.590 s] | gen 25.14 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 40.89 % [time to throw 1.590 s] | gen 40.52 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 36.37 % [time to throw 1.590 s] | gen 33.84 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.32 % [time to throw 1.590 s] | gen 0.50 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 22.82 % [time to throw 1.590 s] | gen 25.43 % [time to throw 1.651 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 7.56 % | gen 9.59 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.36 % | gen 2.33 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.27 % | gen 20.86 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.21 % | gen 3.58 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.42 % | gen 17.42 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.29 % | gen 12.88 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.17 % | gen 45.71 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 16.92 % | gen 19.71 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.37 % | gen 38.20 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.71 % | gen 21.09 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.51 % | gen 23.48 %
  nobody_open_share: flat 44.45 % of dropbacks | gen 36.53 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 18.17 % of dropbacks | gen 13.62 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.47 % of dropbacks | gen 10.88 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.40 % of dropbacks | gen 9.59 % of dropbacks
  nobody_open_share.split.SACK: flat 2.41 % of dropbacks [time to throw 1.590 s] | gen 2.44 % of dropbacks [time to throw 1.651 s]
  clean_checkdown_share: flat 20.93 % of clean aimed throws | gen 9.40 % of clean aimed throws
  clean_later_read_share: flat 15.34 % of clean aimed throws | gen 21.54 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.25, per aimed throw 2.76; forced-throw share 20.98; completion per attempt 37.06, per aimed throw 45.48; INT-source mix CONTESTED_CATCH 89.78, TIPPED_RECOVERY 10.22
      flat PROGRESSION: 19972 aimed, INT 0.36, completion 44.17
      flat RANK_PUSHED: 6554 aimed, INT 12.27, completion 16.92
      flat CHECKDOWN: 9339 aimed, INT 0.21, completion 44.37
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3324 aimed, INT 5.42, completion 27.71
      flat ON_THE_RUN: 189 aimed, INT 5.29, completion 27.51
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.29 against a real 3.25
    gen: INT per attempt 6.70, per aimed throw 7.44; forced-throw share 26.32; completion per attempt 37.58, per aimed throw 41.77; INT-source mix CONTESTED_CATCH 45.54, TIPPED_RECOVERY 54.46
      gen PROGRESSION: 13538 aimed, INT 2.33, completion 45.71
      gen RANK_PUSHED: 3912 aimed, INT 20.86, completion 19.71
      gen CHECKDOWN: 3887 aimed, INT 3.58, completion 38.20
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3106 aimed, INT 17.42, completion 21.09
      gen ON_THE_RUN: 132 aimed, INT 12.88, completion 23.48
      gen on the run: clean INT n/a against a real 2.11; pressured INT 12.88 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.76, rise 0.65 against an allowed 0.20: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.36, rise 0.07 against an allowed 0.18: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 12.27, rise 0.65 against an allowed 0.22: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.24 -> arm 0.21, rise -0.02 against an allowed 0.20: PASSES
    flat DESPERATION: base 4.07 -> arm 5.42, rise 1.34 against an allowed 0.33: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 7.61 -> arm 5.29, rise -2.31 against an allowed 0.35: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 7.44, rise 0.64 against an allowed 0.33: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 2.33, rise 0.37 against an allowed 0.22: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 18.87 -> arm 20.86, rise 1.99 against an allowed 0.39: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 3.58, rise -1.14 against an allowed 0.44: PASSES
    gen DESPERATION: base 16.29 -> arm 17.42, rise 1.12 against an allowed 0.57: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 17.10 -> arm 12.88, rise -4.22 against an allowed 0.15: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 51399 | gen 28547

== A6: release clock the decision tick ==
  time to throw: flat 1.588 s | gen 1.651 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1248 of 51384 dropbacks (2.43 per 100); pressuredSacks 1248; pressured dropbacks 16455 (32.02 per 100) [time to throw 1.588 s]
    gen: sacks 699 of 28538 dropbacks (2.45 per 100); pressuredSacks 699; pressured dropbacks 9914 (34.74 per 100) [time to throw 1.651 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 7.58% | -14.44 against 22.02% (PR #33, FTN only (held)) | -7.88 against 15.46% (main) [time to throw 1.588 s]
    gen: 7.05% | -14.97 against 22.02% (PR #33, FTN only (held)) | -8.41 against 15.46% (main) [time to throw 1.651 s]
  rows (66, both leagues):
  threat_creation_rate: flat 32.02 % | gen 34.74 %
  hit_or_sack_rate: flat 2.87 % [time to throw 1.588 s] | gen 3.41 % [time to throw 1.651 s]
  sack_rate: flat 2.43 % [time to throw 1.588 s] | gen 2.45 % [time to throw 1.651 s]
  time_to_throw: flat 1.588 seconds | gen 1.651 seconds
  sack_share_of_hit_or_sack: flat 84.67 % [time to throw 1.588 s] | gen 71.91 % [time to throw 1.651 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.588 s] | gen 0.00 % [time to throw 1.651 s]
  release_distribution: flat 1.588 seconds | gen 1.651 seconds
  pressured_share_by_release_bin: flat 20.39 % | gen 23.68 %
  hit_rate_by_release_bin: flat 1.19 % [time to throw 1.588 s] | gen 1.76 % [time to throw 1.651 s]
  hits_on_aimed_throws_per_dropback: flat 0.44 % [time to throw 1.588 s] | gen 0.96 % [time to throw 1.651 s]
  first_pressure_seconds: flat 0.917 seconds | gen 1.077 seconds
  first_forcing_seconds: flat 1.238 seconds | gen 1.389 seconds
  first_arrival_seconds: flat 1.661 seconds | gen 1.755 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat FREE_RUNNER 78.72%, WON_REP 21.28%; gen FREE_RUNNER 71.16%, WON_REP 28.84%)
  quick_pressure_share_by_origin: flat 87.74 % | gen 83.09 %
  clean_with_live_won_rep_ticks: flat 0.02 % | gen 0.02 %
  clean_with_live_won_rep_dropbacks: flat 0.04 % | gen 0.04 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 14.64 % | gen 9.60 %
  throwaway_rate_clean: flat 18.74 % | gen 9.64 %
  scramble_rate: flat 3.57 % | gen 1.93 %
  scramble_yards: flat 6.89 yards | gen 5.36 yards
  by_down_fixed_calls: flat 8.46 % | gen 6.79 %
  int_per_aimed_throw: flat 2.78 % | gen 7.60 %
  completion_per_aimed_throw: flat 45.65 % | gen 42.22 %
  forced_throw_share: flat 20.73 % | gen 25.57 %
  completion_by_pocket_status: flat 29.31 % | gen 28.87 %
  qb_season_spread: flat 0.88 pp | gen 2.36 pp
  defence_season_spread: flat 0.32 pp | gen 0.29 pp
  unblocked_pressures_per_100: flat 19.05 per 100 dropbacks | gen 18.43 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 70.08 % [time to throw 1.588 s] | gen 70.06 % [time to throw 1.651 s]
  unblocked_men_per_100: flat 19.05 per 100 dropbacks | gen 18.43 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 9.38 % | gen 14.25 %
  quick_share_no_free_runner: flat 42.39 % | gen 41.38 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 14.20 % | gen 8.08 %
  situation_q1q3_last_two: flat 13.88 % | gen 9.32 %
  sack_share_of_contacts_in_out: flat 84.67 % [time to throw 1.588 s] | gen 71.91 % [time to throw 1.651 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.588 s] | gen 0.00 % [time to throw 1.651 s]
  sacker_mix.split.interior: flat 23.32 % [time to throw 1.588 s] | gen 24.92 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 40.38 % [time to throw 1.588 s] | gen 39.53 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 35.98 % [time to throw 1.588 s] | gen 34.98 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.32 % [time to throw 1.588 s] | gen 0.57 % [time to throw 1.651 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 23.72 % [time to throw 1.588 s] | gen 25.18 % [time to throw 1.651 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.00 % | gen 0.00 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.35 % | gen 2.47 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.33 % | gen 21.13 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.20 % | gen 3.53 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.44 % | gen 17.51 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.59 % | gen 14.62 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 44.32 % | gen 46.05 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.40 % | gen 19.55 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 44.73 % | gen 39.67 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.50 % | gen 21.78 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 25.70 % | gen 23.85 %
  nobody_open_share: flat 44.50 % of dropbacks | gen 36.49 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 18.14 % of dropbacks | gen 13.59 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.51 % of dropbacks | gen 10.83 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.42 % of dropbacks | gen 9.63 % of dropbacks
  nobody_open_share.split.SACK: flat 2.43 % of dropbacks [time to throw 1.588 s] | gen 2.45 % of dropbacks [time to throw 1.651 s]
  clean_checkdown_share: flat 20.70 % of clean aimed throws | gen 9.56 % of clean aimed throws
  clean_later_read_share: flat 15.54 % of clean aimed throws | gen 22.19 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.26, per aimed throw 2.78; forced-throw share 20.73; completion per attempt 37.18, per aimed throw 45.65; INT-source mix CONTESTED_CATCH 89.84, TIPPED_RECOVERY 10.16
      flat PROGRESSION: 19929 aimed, INT 0.35, completion 44.32
      flat RANK_PUSHED: 6576 aimed, INT 12.33, completion 17.40
      flat CHECKDOWN: 9319 aimed, INT 0.20, completion 44.73
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3346 aimed, INT 5.44, completion 27.50
      flat ON_THE_RUN: 179 aimed, INT 5.59, completion 25.70
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.59 against a real 3.25
    gen: INT per attempt 6.83, per aimed throw 7.60; forced-throw share 25.57; completion per attempt 37.97, per aimed throw 42.22; INT-source mix CONTESTED_CATCH 45.39, TIPPED_RECOVERY 54.61
      gen PROGRESSION: 13501 aimed, INT 2.47, completion 46.05
      gen RANK_PUSHED: 3943 aimed, INT 21.13, completion 19.55
      gen CHECKDOWN: 3877 aimed, INT 3.53, completion 39.67
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3090 aimed, INT 17.51, completion 21.78
      gen ON_THE_RUN: 130 aimed, INT 14.62, completion 23.85
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.62 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.78, rise 0.67 against an allowed 0.20: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.35, rise 0.06 against an allowed 0.17: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 12.33, rise 0.71 against an allowed 0.22: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.24 -> arm 0.20, rise -0.03 against an allowed 0.20: PASSES
    flat DESPERATION: base 4.07 -> arm 5.44, rise 1.37 against an allowed 0.34: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 7.61 -> arm 5.59, rise -2.02 against an allowed 0.35: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 7.60, rise 0.80 against an allowed 0.33: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 2.47, rise 0.51 against an allowed 0.22: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 18.87 -> arm 21.13, rise 2.26 against an allowed 0.39: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 3.53, rise -1.18 against an allowed 0.44: PASSES
    gen DESPERATION: base 16.29 -> arm 17.51, rise 1.21 against an allowed 0.56: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 17.10 -> arm 14.62, rise -2.49 against an allowed 0.08: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 51383 | gen 28537

== A7: release clock the decision tick ==
  time to throw: flat 1.538 s | gen 1.581 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1869 of 50573 dropbacks (3.70 per 100); pressuredSacks 1869; pressured dropbacks 24164 (47.78 per 100) [time to throw 1.538 s]
    gen: sacks 1122 of 28416 dropbacks (3.95 per 100); pressuredSacks 1122; pressured dropbacks 14546 (51.19 per 100) [time to throw 1.581 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 7.73% | -14.29 against 22.02% (PR #33, FTN only (held)) | -7.73 against 15.46% (main) [time to throw 1.538 s]
    gen: 7.71% | -14.31 against 22.02% (PR #33, FTN only (held)) | -7.75 against 15.46% (main) [time to throw 1.581 s]
  rows (66, both leagues):
  threat_creation_rate: flat 47.78 % | gen 51.19 %
  hit_or_sack_rate: flat 4.66 % [time to throw 1.538 s] | gen 5.80 % [time to throw 1.581 s]
  sack_rate: flat 3.70 % [time to throw 1.538 s] | gen 3.95 % [time to throw 1.581 s]
  time_to_throw: flat 1.538 seconds | gen 1.581 seconds
  sack_share_of_hit_or_sack: flat 79.30 % [time to throw 1.538 s] | gen 68.04 % [time to throw 1.581 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.538 s] | gen 0.00 % [time to throw 1.581 s]
  release_distribution: flat 1.538 seconds | gen 1.581 seconds
  pressured_share_by_release_bin: flat 53.18 % | gen 55.70 %
  hit_rate_by_release_bin: flat 4.36 % [time to throw 1.538 s] | gen 5.69 % [time to throw 1.581 s]
  hits_on_aimed_throws_per_dropback: flat 0.96 % [time to throw 1.538 s] | gen 1.85 % [time to throw 1.581 s]
  first_pressure_seconds: flat 1.192 seconds | gen 1.265 seconds
  first_forcing_seconds: flat 1.388 seconds | gen 1.469 seconds
  first_arrival_seconds: flat 1.779 seconds | gen 1.873 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 10.85%, FREE_RUNNER 52.89%, WON_REP 36.26%; gen COUNTER 12.13%, FREE_RUNNER 48.66%, WON_REP 39.21%)
  quick_pressure_share_by_origin: flat 92.98 % | gen 90.90 %
  clean_with_live_won_rep_ticks: flat 0.01 % | gen 0.00 %
  clean_with_live_won_rep_dropbacks: flat 0.02 % | gen 0.00 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 18.57 % | gen 10.12 %
  throwaway_rate_clean: flat 12.74 % | gen 6.99 %
  scramble_rate: flat 5.02 % | gen 2.43 %
  scramble_yards: flat 6.40 yards | gen 4.87 yards
  by_down_fixed_calls: flat 7.53 % | gen 7.78 %
  int_per_aimed_throw: flat 2.51 % | gen 7.07 %
  completion_per_aimed_throw: flat 44.60 % | gen 40.68 %
  forced_throw_share: flat 29.06 % | gen 36.63 %
  completion_by_pocket_status: flat 27.01 % | gen 28.97 %
  qb_season_spread: flat 0.21 pp | gen 2.84 pp
  defence_season_spread: flat 0.00 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.14 per 100 dropbacks | gen 18.59 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 40.94 % [time to throw 1.538 s] | gen 40.45 % [time to throw 1.581 s]
  unblocked_men_per_100: flat 19.14 per 100 dropbacks | gen 18.59 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 46.52 % | gen 50.05 %
  quick_share_no_free_runner: flat 85.09 % | gen 82.27 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 17.50 % | gen 9.47 %
  situation_q1q3_last_two: flat 18.70 % | gen 9.85 %
  sack_share_of_contacts_in_out: flat 79.30 % [time to throw 1.538 s] | gen 68.04 % [time to throw 1.581 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.538 s] | gen 0.00 % [time to throw 1.581 s]
  sacker_mix.split.interior: flat 50.85 % [time to throw 1.538 s] | gen 51.50 % [time to throw 1.581 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 26.24 % [time to throw 1.538 s] | gen 26.43 % [time to throw 1.581 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.81 % [time to throw 1.538 s] | gen 21.94 % [time to throw 1.581 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.11 % [time to throw 1.538 s] | gen 0.13 % [time to throw 1.581 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 50.83 % [time to throw 1.538 s] | gen 51.47 % [time to throw 1.581 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.57 % | gen 8.19 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 2.21 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.43 % | gen 20.55 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 3.45 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.75 % | gen 16.30 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.37 % | gen 16.75 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.16 % | gen 44.76 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.87 % | gen 18.18 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 43.44 % | gen 37.04 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 27.14 % | gen 20.75 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 23.83 % | gen 22.17 %
  nobody_open_share: flat 44.37 % of dropbacks | gen 38.89 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 18.65 % of dropbacks | gen 15.60 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.49 % of dropbacks | gen 10.75 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 15.53 % of dropbacks | gen 8.59 % of dropbacks
  nobody_open_share.split.SACK: flat 3.70 % of dropbacks [time to throw 1.538 s] | gen 3.95 % of dropbacks [time to throw 1.581 s]
  clean_checkdown_share: flat 20.75 % of clean aimed throws | gen 8.86 % of clean aimed throws
  clean_later_read_share: flat 14.55 % of clean aimed throws | gen 20.90 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.08, per aimed throw 2.51; forced-throw share 29.06; completion per attempt 37.01, per aimed throw 44.60; INT-source mix CONTESTED_CATCH 91.36, TIPPED_RECOVERY 8.64
      flat PROGRESSION: 19095 aimed, INT 0.30, completion 43.16
      flat RANK_PUSHED: 6202 aimed, INT 11.43, completion 17.87
      flat CHECKDOWN: 9434 aimed, INT 0.24, completion 43.44
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3283 aimed, INT 4.75, completion 27.14
      flat ON_THE_RUN: 298 aimed, INT 5.37, completion 23.83
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.37 against a real 3.25
    gen: INT per attempt 6.42, per aimed throw 7.07; forced-throw share 36.63; completion per attempt 36.95, per aimed throw 40.68; INT-source mix CONTESTED_CATCH 46.49, TIPPED_RECOVERY 53.51
      gen PROGRESSION: 12879 aimed, INT 2.21, completion 44.76
      gen RANK_PUSHED: 3591 aimed, INT 20.55, completion 18.18
      gen CHECKDOWN: 4433 aimed, INT 3.45, completion 37.04
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3056 aimed, INT 16.30, completion 20.75
      gen ON_THE_RUN: 203 aimed, INT 16.75, completion 22.17
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.75 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.51, rise 0.40 against an allowed 0.16: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.30, rise 0.01 against an allowed 0.13: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 11.43, rise -0.19 against an allowed 0.15: PASSES
    flat CHECKDOWN: base 0.24 -> arm 0.24, rise 0.01 against an allowed 0.18: PASSES
    flat DESPERATION: base 4.07 -> arm 4.75, rise 0.68 against an allowed 0.25: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 7.61 -> arm 5.37, rise -2.24 against an allowed 0.35: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 7.07, rise 0.27 against an allowed 0.25: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 2.21, rise 0.25 against an allowed 0.17: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 18.87 -> arm 20.55, rise 1.68 against an allowed 0.25: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 3.45, rise -1.26 against an allowed 0.34: PASSES
    gen DESPERATION: base 16.29 -> arm 16.30, rise 0.00 against an allowed 0.42: PASSES
    gen ON_THE_RUN: base 17.10 -> arm 16.75, rise -0.35 against an allowed 0.31: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 50569 | gen 28415

== A8: release clock the decision tick ==
  time to throw: flat 1.537 s | gen 1.579 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1896 of 50574 dropbacks (3.75 per 100); pressuredSacks 1896; pressured dropbacks 22445 (44.38 per 100) [time to throw 1.537 s]
    gen: sacks 1104 of 28408 dropbacks (3.89 per 100); pressuredSacks 1104; pressured dropbacks 13451 (47.35 per 100) [time to throw 1.579 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 8.45% | -13.57 against 22.02% (PR #33, FTN only (held)) | -7.01 against 15.46% (main) [time to throw 1.537 s]
    gen: 8.21% | -13.81 against 22.02% (PR #33, FTN only (held)) | -7.25 against 15.46% (main) [time to throw 1.579 s]
  rows (66, both leagues):
  threat_creation_rate: flat 44.38 % | gen 47.35 %
  hit_or_sack_rate: flat 4.71 % [time to throw 1.537 s] | gen 5.77 % [time to throw 1.579 s]
  sack_rate: flat 3.75 % [time to throw 1.537 s] | gen 3.89 % [time to throw 1.579 s]
  time_to_throw: flat 1.537 seconds | gen 1.579 seconds
  sack_share_of_hit_or_sack: flat 79.66 % [time to throw 1.537 s] | gen 67.36 % [time to throw 1.579 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.537 s] | gen 0.00 % [time to throw 1.579 s]
  release_distribution: flat 1.537 seconds | gen 1.579 seconds
  pressured_share_by_release_bin: flat 44.63 % | gen 48.08 %
  hit_rate_by_release_bin: flat 4.32 % [time to throw 1.537 s] | gen 5.83 % [time to throw 1.579 s]
  hits_on_aimed_throws_per_dropback: flat 0.96 % [time to throw 1.537 s] | gen 1.88 % [time to throw 1.579 s]
  first_pressure_seconds: flat 1.135 seconds | gen 1.217 seconds
  first_forcing_seconds: flat 1.382 seconds | gen 1.456 seconds
  first_arrival_seconds: flat 1.782 seconds | gen 1.876 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat FREE_RUNNER 56.97%, WON_REP 43.03%; gen FREE_RUNNER 52.43%, WON_REP 47.57%)
  quick_pressure_share_by_origin: flat 92.38 % | gen 90.08 %
  clean_with_live_won_rep_ticks: flat 0.05 % | gen 0.05 %
  clean_with_live_won_rep_dropbacks: flat 0.11 % | gen 0.11 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 16.54 % | gen 9.23 %
  throwaway_rate_clean: flat 14.73 % | gen 7.79 %
  scramble_rate: flat 4.97 % | gen 2.38 %
  scramble_yards: flat 6.54 yards | gen 4.86 yards
  by_down_fixed_calls: flat 8.63 % | gen 7.99 %
  int_per_aimed_throw: flat 2.53 % | gen 7.06 %
  completion_per_aimed_throw: flat 44.80 % | gen 41.09 %
  forced_throw_share: flat 28.94 % | gen 36.10 %
  completion_by_pocket_status: flat 27.85 % | gen 29.04 %
  qb_season_spread: flat 0.00 pp | gen 3.21 pp
  defence_season_spread: flat 0.52 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.05 per 100 dropbacks | gen 18.47 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 40.38 % [time to throw 1.537 s] | gen 40.57 % [time to throw 1.579 s]
  unblocked_men_per_100: flat 19.05 per 100 dropbacks | gen 18.47 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 36.63 % | gen 41.58 %
  quick_share_no_free_runner: flat 82.29 % | gen 79.15 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 15.67 % | gen 8.83 %
  situation_q1q3_last_two: flat 16.33 % | gen 8.62 %
  sack_share_of_contacts_in_out: flat 79.66 % [time to throw 1.537 s] | gen 67.36 % [time to throw 1.579 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.537 s] | gen 0.00 % [time to throw 1.579 s]
  sacker_mix.split.interior: flat 51.34 % [time to throw 1.537 s] | gen 51.57 % [time to throw 1.579 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 26.30 % [time to throw 1.537 s] | gen 26.47 % [time to throw 1.579 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 22.25 % [time to throw 1.537 s] | gen 21.64 % [time to throw 1.579 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.11 % [time to throw 1.537 s] | gen 0.32 % [time to throw 1.579 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 51.27 % [time to throw 1.537 s] | gen 51.54 % [time to throw 1.579 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.01 % | gen 0.03 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.21 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.62 % | gen 20.38 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.23 % | gen 3.30 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.72 % | gen 16.64 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.84 % | gen 15.84 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.46 % | gen 45.30 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.93 % | gen 18.22 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 43.77 % | gen 37.24 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 26.78 % | gen 21.02 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.74 % | gen 22.77 %
  nobody_open_share: flat 44.33 % of dropbacks | gen 38.69 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 18.60 % of dropbacks | gen 15.56 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.45 % of dropbacks | gen 10.77 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 15.53 % of dropbacks | gen 8.47 % of dropbacks
  nobody_open_share.split.SACK: flat 3.75 % of dropbacks [time to throw 1.537 s] | gen 3.89 % of dropbacks [time to throw 1.579 s]
  clean_checkdown_share: flat 20.49 % of clean aimed throws | gen 8.83 % of clean aimed throws
  clean_later_read_share: flat 14.78 % of clean aimed throws | gen 21.31 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.10, per aimed throw 2.53; forced-throw share 28.94; completion per attempt 37.17, per aimed throw 44.80; INT-source mix CONTESTED_CATCH 91.65, TIPPED_RECOVERY 8.35
      flat PROGRESSION: 19138 aimed, INT 0.29, completion 43.46
      flat RANK_PUSHED: 6214 aimed, INT 11.62, completion 17.93
      flat CHECKDOWN: 9409 aimed, INT 0.23, completion 43.77
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3260 aimed, INT 4.72, completion 26.78
      flat ON_THE_RUN: 291 aimed, INT 5.84, completion 24.74
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.84 against a real 3.25
    gen: INT per attempt 6.43, per aimed throw 7.06; forced-throw share 36.10; completion per attempt 37.38, per aimed throw 41.09; INT-source mix CONTESTED_CATCH 46.17, TIPPED_RECOVERY 53.83
      gen PROGRESSION: 12919 aimed, INT 2.21, completion 45.30
      gen RANK_PUSHED: 3622 aimed, INT 20.38, completion 18.22
      gen CHECKDOWN: 4420 aimed, INT 3.30, completion 37.24
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 3059 aimed, INT 16.64, completion 21.02
      gen ON_THE_RUN: 202 aimed, INT 15.84, completion 22.77
      gen on the run: clean INT n/a against a real 2.11; pressured INT 15.84 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.53, rise 0.42 against an allowed 0.16: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.29, rise -0.01 against an allowed 0.13: PASSES
    flat RANK_PUSHED: base 11.62 -> arm 11.62, rise -0.00 against an allowed 0.15: PASSES
    flat CHECKDOWN: base 0.24 -> arm 0.23, rise -0.00 against an allowed 0.18: PASSES
    flat DESPERATION: base 4.07 -> arm 4.72, rise 0.65 against an allowed 0.25: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 7.61 -> arm 5.84, rise -1.76 against an allowed 0.35: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 7.06, rise 0.26 against an allowed 0.25: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 2.21, rise 0.25 against an allowed 0.17: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 18.87 -> arm 20.38, rise 1.50 against an allowed 0.26: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.71 -> arm 3.30, rise -1.41 against an allowed 0.33: PASSES
    gen DESPERATION: base 16.29 -> arm 16.64, rise 0.35 against an allowed 0.41: PASSES
    gen ON_THE_RUN: base 17.10 -> arm 15.84, rise -1.26 against an allowed 0.30: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 50570 | gen 28407

== A9: release clock the decision tick ==
  time to throw: flat 1.241 s | gen 1.234 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 7265 of 43847 dropbacks (16.57 per 100); pressuredSacks 7265; pressured dropbacks 36195 (82.55 per 100) [time to throw 1.241 s]
    gen: sacks 4283 of 25757 dropbacks (16.63 per 100); pressuredSacks 4283; pressured dropbacks 20971 (81.42 per 100) [time to throw 1.234 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 20.07% | -1.95 against 22.02% (PR #33, FTN only (held)) | 4.61 against 15.46% (main) [time to throw 1.241 s]
    gen: 20.42% | -1.60 against 22.02% (PR #33, FTN only (held)) | 4.96 against 15.46% (main) [time to throw 1.234 s]
  rows (66, both leagues):
  threat_creation_rate: flat 82.55 % | gen 81.42 %
  hit_or_sack_rate: flat 20.25 % [time to throw 1.241 s] | gen 24.13 % [time to throw 1.234 s]
  sack_rate: flat 16.57 % [time to throw 1.241 s] | gen 16.63 % [time to throw 1.234 s]
  time_to_throw: flat 1.241 seconds | gen 1.234 seconds
  sack_share_of_hit_or_sack: flat 81.82 % [time to throw 1.241 s] | gen 68.91 % [time to throw 1.234 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.241 s] | gen 0.00 % [time to throw 1.234 s]
  release_distribution: flat 1.241 seconds | gen 1.234 seconds
  pressured_share_by_release_bin: flat 67.32 % | gen 65.45 %
  hit_rate_by_release_bin: flat 8.18 % [time to throw 1.241 s] | gen 10.44 % [time to throw 1.234 s]
  hits_on_aimed_throws_per_dropback: flat 3.68 % [time to throw 1.241 s] | gen 7.50 % [time to throw 1.234 s]
  first_pressure_seconds: flat 0.884 seconds | gen 0.892 seconds
  first_forcing_seconds: flat 1.007 seconds | gen 1.013 seconds
  first_arrival_seconds: flat 1.397 seconds | gen 1.488 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 0.34%, FREE_RUNNER 30.37%, WON_REP 69.29%; gen COUNTER 0.45%, FREE_RUNNER 29.67%, WON_REP 69.88%)
  quick_pressure_share_by_origin: flat 99.65 % | gen 99.49 %
  clean_with_live_won_rep_ticks: flat 0.24 % | gen 0.17 %
  clean_with_live_won_rep_dropbacks: flat 0.24 % | gen 0.17 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 4.49 % | gen 2.37 %
  throwaway_rate_clean: flat 9.97 % | gen 4.74 %
  scramble_rate: flat 17.02 % | gen 6.48 %
  scramble_yards: flat 5.03 yards | gen 3.78 yards
  by_down_fixed_calls: flat 20.47 % | gen 19.41 %
  int_per_aimed_throw: flat 2.14 % | gen 6.82 %
  completion_per_aimed_throw: flat 40.82 % | gen 38.12 %
  forced_throw_share: flat 64.22 % | gen 68.12 %
  completion_by_pocket_status: flat 34.12 % | gen 32.88 %
  qb_season_spread: flat 0.00 pp | gen 5.89 pp
  defence_season_spread: flat 0.00 pp | gen 1.16 pp
  unblocked_pressures_per_100: flat 19.20 per 100 dropbacks | gen 18.13 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 7.96 % [time to throw 1.241 s] | gen 7.92 % [time to throw 1.234 s]
  unblocked_men_per_100: flat 19.20 per 100 dropbacks | gen 18.13 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 60.93 % | gen 58.71 %
  quick_share_no_free_runner: flat 99.49 % | gen 99.26 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 4.45 % | gen 2.30 %
  situation_q1q3_last_two: flat 4.54 % | gen 2.44 %
  sack_share_of_contacts_in_out: flat 81.82 % [time to throw 1.241 s] | gen 68.91 % [time to throw 1.234 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.241 s] | gen 0.00 % [time to throw 1.234 s]
  sacker_mix.split.interior: flat 84.82 % [time to throw 1.241 s] | gen 87.10 % [time to throw 1.234 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 10.01 % [time to throw 1.241 s] | gen 8.59 % [time to throw 1.234 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.15 % [time to throw 1.241 s] | gen 4.30 % [time to throw 1.234 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 1.241 s] | gen 0.01 % [time to throw 1.234 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 81.41 % [time to throw 1.241 s] | gen 82.81 % [time to throw 1.234 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.22 % | gen 0.38 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 1.93 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.88 % | gen 18.76 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 4.67 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 3.88 % | gen 16.58 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.20 % | gen 16.43 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.07 % | gen 43.56 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.29 % | gen 15.65 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 36.06 % | gen 33.17 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.79 % | gen 19.94 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.21 % | gen 24.29 %
  nobody_open_share: flat 48.01 % of dropbacks | gen 54.68 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 21.06 % of dropbacks | gen 26.01 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 4.94 % of dropbacks | gen 9.23 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 5.45 % of dropbacks | gen 2.81 % of dropbacks
  nobody_open_share.split.SACK: flat 16.57 % of dropbacks [time to throw 1.241 s] | gen 16.63 % of dropbacks [time to throw 1.234 s]
  clean_checkdown_share: flat 11.45 % of clean aimed throws | gen 4.85 % of clean aimed throws
  clean_later_read_share: flat 10.65 % of clean aimed throws | gen 14.92 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.96, per aimed throw 2.14; forced-throw share 64.22; completion per attempt 37.47, per aimed throw 40.82; INT-source mix CONTESTED_CATCH 91.59, TIPPED_RECOVERY 8.41
      flat PROGRESSION: 11586 aimed, INT 0.31, completion 42.07
      flat RANK_PUSHED: 3400 aimed, INT 11.88, completion 14.29
      flat CHECKDOWN: 9234 aimed, INT 0.24, completion 36.06
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2165 aimed, INT 3.88, completion 23.79
      flat ON_THE_RUN: 347 aimed, INT 7.20, completion 24.21
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.20 against a real 3.25
    gen: INT per attempt 6.57, per aimed throw 6.82; forced-throw share 68.12; completion per attempt 36.72, per aimed throw 38.12; INT-source mix CONTESTED_CATCH 48.31, TIPPED_RECOVERY 51.69
      gen PROGRESSION: 7557 aimed, INT 1.93, completion 43.56
      gen RANK_PUSHED: 2026 aimed, INT 18.76, completion 15.65
      gen CHECKDOWN: 6699 aimed, INT 4.67, completion 33.17
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2377 aimed, INT 16.58, completion 19.94
      gen ON_THE_RUN: 420 aimed, INT 16.43, completion 24.29
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.43 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.14, rise 0.03 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.31, rise 0.02 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    flat RANK_PUSHED: base 11.62 -> arm 11.88, rise 0.26 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.24 -> arm 0.24, rise 0.00 against an allowed 0.00: PASSES
    flat DESPERATION: base 4.07 -> arm 3.88, rise -0.19 against an allowed -0.01: PASSES
    flat ON_THE_RUN: base 7.61 -> arm 7.20, rise -0.40 against an allowed 0.01: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 6.82, rise 0.02 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 1.93, rise -0.03 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 18.87 -> arm 18.76, rise -0.11 against an allowed -0.00: PASSES
    gen CHECKDOWN: base 4.71 -> arm 4.67, rise -0.04 against an allowed -0.00: PASSES
    gen DESPERATION: base 16.29 -> arm 16.58, rise 0.28 against an allowed 0.00: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 17.10 -> arm 16.43, rise -0.67 against an allowed -0.01: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 25873 | gen 15225

== A10: release clock the decision tick ==
  time to throw: flat 1.241 s | gen 1.233 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 7276 of 43829 dropbacks (16.60 per 100); pressuredSacks 7276; pressured dropbacks 36079 (82.32 per 100) [time to throw 1.241 s]
    gen: sacks 4274 of 25740 dropbacks (16.60 per 100); pressuredSacks 4274; pressured dropbacks 20894 (81.17 per 100) [time to throw 1.233 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 20.17% | -1.85 against 22.02% (PR #33, FTN only (held)) | 4.71 against 15.46% (main) [time to throw 1.241 s]
    gen: 20.46% | -1.56 against 22.02% (PR #33, FTN only (held)) | 5.00 against 15.46% (main) [time to throw 1.233 s]
  rows (66, both leagues):
  threat_creation_rate: flat 82.32 % | gen 81.17 %
  hit_or_sack_rate: flat 20.28 % [time to throw 1.241 s] | gen 24.09 % [time to throw 1.233 s]
  sack_rate: flat 16.60 % [time to throw 1.241 s] | gen 16.60 % [time to throw 1.233 s]
  time_to_throw: flat 1.241 seconds | gen 1.233 seconds
  sack_share_of_hit_or_sack: flat 81.87 % [time to throw 1.241 s] | gen 68.91 % [time to throw 1.233 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 1.241 s] | gen 0.00 % [time to throw 1.233 s]
  release_distribution: flat 1.241 seconds | gen 1.233 seconds
  pressured_share_by_release_bin: flat 66.58 % | gen 64.28 %
  hit_rate_by_release_bin: flat 8.26 % [time to throw 1.241 s] | gen 10.26 % [time to throw 1.233 s]
  hits_on_aimed_throws_per_dropback: flat 3.68 % [time to throw 1.241 s] | gen 7.49 % [time to throw 1.233 s]
  first_pressure_seconds: flat 0.880 seconds | gen 0.888 seconds
  first_forcing_seconds: flat 1.006 seconds | gen 1.013 seconds
  first_arrival_seconds: flat 1.397 seconds | gen 1.488 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat FREE_RUNNER 30.45%, WON_REP 69.55%; gen FREE_RUNNER 29.76%, WON_REP 70.24%)
  quick_pressure_share_by_origin: flat 99.74 % | gen 99.55 %
  clean_with_live_won_rep_ticks: flat 0.25 % | gen 0.17 %
  clean_with_live_won_rep_dropbacks: flat 0.25 % | gen 0.17 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 4.38 % | gen 2.31 %
  throwaway_rate_clean: flat 10.35 % | gen 4.99 %
  scramble_rate: flat 17.03 % | gen 6.45 %
  scramble_yards: flat 5.05 yards | gen 3.78 yards
  by_down_fixed_calls: flat 20.59 % | gen 19.41 %
  int_per_aimed_throw: flat 2.15 % | gen 6.80 %
  completion_per_aimed_throw: flat 40.82 % | gen 38.07 %
  forced_throw_share: flat 64.16 % | gen 68.04 %
  completion_by_pocket_status: flat 34.14 % | gen 32.86 %
  qb_season_spread: flat 0.00 pp | gen 5.92 pp
  defence_season_spread: flat 0.16 pp | gen 1.35 pp
  unblocked_pressures_per_100: flat 19.22 per 100 dropbacks | gen 18.17 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 7.96 % [time to throw 1.241 s] | gen 7.87 % [time to throw 1.233 s]
  unblocked_men_per_100: flat 19.22 per 100 dropbacks | gen 18.17 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 59.98 % | gen 57.26 %
  quick_share_no_free_runner: flat 99.63 % | gen 99.36 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 4.19 % | gen 2.27 %
  situation_q1q3_last_two: flat 4.39 % | gen 2.41 %
  sack_share_of_contacts_in_out: flat 81.87 % [time to throw 1.241 s] | gen 68.91 % [time to throw 1.233 s]
  coverage_sack_rows: flat 0.00 % [time to throw 1.241 s] | gen 0.00 % [time to throw 1.233 s]
  sacker_mix.split.interior: flat 84.80 % [time to throw 1.241 s] | gen 87.17 % [time to throw 1.233 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 10.03 % [time to throw 1.241 s] | gen 8.56 % [time to throw 1.233 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.15 % [time to throw 1.241 s] | gen 4.27 % [time to throw 1.233 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 1.241 s] | gen 0.01 % [time to throw 1.233 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 81.37 % [time to throw 1.241 s] | gen 82.88 % [time to throw 1.233 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.03 % | gen 0.04 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.32 % | gen 1.93 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.87 % | gen 18.81 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.24 % | gen 4.66 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.02 % | gen 16.46 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 7.20 % | gen 16.43 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.04 % | gen 43.45 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.46 % | gen 15.68 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 36.03 % | gen 33.13 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 23.57 % | gen 20.03 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.50 % | gen 24.29 %
  nobody_open_share: flat 48.01 % of dropbacks | gen 54.66 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 21.04 % of dropbacks | gen 25.99 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 4.94 % of dropbacks | gen 9.25 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 5.44 % of dropbacks | gen 2.81 % of dropbacks
  nobody_open_share.split.SACK: flat 16.60 % of dropbacks [time to throw 1.241 s] | gen 16.60 % of dropbacks [time to throw 1.233 s]
  clean_checkdown_share: flat 11.51 % of clean aimed throws | gen 4.89 % of clean aimed throws
  clean_later_read_share: flat 10.74 % of clean aimed throws | gen 14.97 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.97, per aimed throw 2.15; forced-throw share 64.16; completion per attempt 37.48, per aimed throw 40.82; INT-source mix CONTESTED_CATCH 91.81, TIPPED_RECOVERY 8.19
      flat PROGRESSION: 11581 aimed, INT 0.32, completion 42.04
      flat RANK_PUSHED: 3395 aimed, INT 11.87, completion 14.46
      flat CHECKDOWN: 9220 aimed, INT 0.24, completion 36.03
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2164 aimed, INT 4.02, completion 23.57
      flat ON_THE_RUN: 347 aimed, INT 7.20, completion 24.50
      flat on the run: clean INT n/a against a real 2.11; pressured INT 7.20 against a real 3.25
    gen: INT per attempt 6.55, per aimed throw 6.80; forced-throw share 68.04; completion per attempt 36.68, per aimed throw 38.07; INT-source mix CONTESTED_CATCH 48.23, TIPPED_RECOVERY 51.77
      gen PROGRESSION: 7575 aimed, INT 1.93, completion 43.45
      gen RANK_PUSHED: 2015 aimed, INT 18.81, completion 15.68
      gen CHECKDOWN: 6691 aimed, INT 4.66, completion 33.13
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2381 aimed, INT 16.46, completion 20.03
      gen ON_THE_RUN: 420 aimed, INT 16.43, completion 24.29
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.43 against a real 3.25
    the guard against A0 (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.11 -> arm 2.15, rise 0.04 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.32, rise 0.03 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    flat RANK_PUSHED: base 11.62 -> arm 11.87, rise 0.25 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.24 -> arm 0.24, rise 0.00 against an allowed 0.00: PASSES
    flat DESPERATION: base 4.07 -> arm 4.02, rise -0.05 against an allowed -0.01: PASSES
    flat ON_THE_RUN: base 7.61 -> arm 7.20, rise -0.40 against an allowed 0.01: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.80 -> arm 6.80, rise 0.00 against an allowed -0.00: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 1.96 -> arm 1.93, rise -0.04 against an allowed -0.00: PASSES
    gen RANK_PUSHED: base 18.87 -> arm 18.81, rise -0.06 against an allowed -0.00: PASSES
    gen CHECKDOWN: base 4.71 -> arm 4.66, rise -0.05 against an allowed -0.00: PASSES
    gen DESPERATION: base 16.29 -> arm 16.46, rise 0.17 against an allowed 0.01: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 17.10 -> arm 16.43, rise -0.67 against an allowed -0.01: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0: flat 25867 | gen 15208
```

### A14 (pricing arm, never a design value) with A11 (pricing arm, never a design value), A12 (pricing arm, never a design value), A13 (pricing arm, never a design value)

```text
ADR-089 step 1: the pocket report (4 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A14 (pricing arm, never a design value) (the base arm): release clock the decision tick ==
  time to throw: flat 2.396 s | gen 2.250 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 12859 of 36904 dropbacks (34.84 per 100); pressuredSacks 12859; pressured dropbacks 35471 (96.12 per 100) [time to throw 2.396 s]
    gen: sacks 9639 of 20874 dropbacks (46.18 per 100); pressuredSacks 9639; pressured dropbacks 20011 (95.87 per 100) [time to throw 2.250 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 36.25% | 14.23 against 22.02% (PR #33, FTN only (held)) | 20.79 against 15.46% (main) [time to throw 2.396 s]
    gen: 48.17% | 26.15 against 22.02% (PR #33, FTN only (held)) | 32.71 against 15.46% (main) [time to throw 2.250 s]
  rows (66, both leagues):
  threat_creation_rate: flat 96.12 % | gen 95.87 %
  hit_or_sack_rate: flat 39.18 % [time to throw 2.396 s] | gen 56.45 % [time to throw 2.250 s]
  sack_rate: flat 34.84 % [time to throw 2.396 s] | gen 46.18 % [time to throw 2.250 s]
  time_to_throw: flat 2.396 seconds | gen 2.250 seconds
  sack_share_of_hit_or_sack: flat 88.93 % [time to throw 2.396 s] | gen 81.80 % [time to throw 2.250 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.396 s] | gen 0.00 % [time to throw 2.250 s]
  release_distribution: flat 2.396 seconds | gen 2.250 seconds
  pressured_share_by_release_bin: flat 93.27 % | gen 94.27 %
  hit_rate_by_release_bin: flat 14.18 % [time to throw 2.396 s] | gen 22.82 % [time to throw 2.250 s]
  hits_on_aimed_throws_per_dropback: flat 4.34 % [time to throw 2.396 s] | gen 10.28 % [time to throw 2.250 s]
  first_pressure_seconds: flat 0.914 seconds | gen 0.916 seconds
  first_forcing_seconds: flat 1.069 seconds | gen 1.066 seconds
  first_arrival_seconds: flat 1.411 seconds | gen 1.498 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 10.92%, FREE_RUNNER 26.00%, WON_REP 63.08%; gen COUNTER 10.79%, FREE_RUNNER 25.48%, WON_REP 63.73%)
  quick_pressure_share_by_origin: flat 99.02 % | gen 99.01 %
  clean_with_live_won_rep_ticks: flat 0.17 % | gen 0.12 %
  clean_with_live_won_rep_dropbacks: flat 0.18 % | gen 0.12 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 6.45 % | gen 4.38 %
  throwaway_rate_clean: flat 15.35 % | gen 9.04 %
  scramble_rate: flat 33.21 % | gen 16.50 %
  scramble_yards: flat 5.30 yards | gen 3.66 yards
  by_down_fixed_calls: flat 37.19 % | gen 45.13 %
  int_per_aimed_throw: flat 2.17 % | gen 6.83 %
  completion_per_aimed_throw: flat 37.95 % | gen 35.25 %
  forced_throw_share: flat 63.25 % | gen 70.01 %
  completion_by_pocket_status: flat 28.41 % | gen 29.35 %
  qb_season_spread: flat 0.00 pp | gen 8.98 pp
  defence_season_spread: flat 0.00 pp | gen 2.23 pp
  unblocked_pressures_per_100: flat 19.10 per 100 dropbacks | gen 18.16 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 9.25 % [time to throw 2.396 s] | gen 9.55 % [time to throw 2.250 s]
  unblocked_men_per_100: flat 19.10 per 100 dropbacks | gen 18.16 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 91.41 % | gen 92.56 %
  quick_share_no_free_runner: flat 98.67 % | gen 98.66 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 6.54 % | gen 4.58 %
  situation_q1q3_last_two: flat 6.44 % | gen 4.80 %
  sack_share_of_contacts_in_out: flat 88.93 % [time to throw 2.396 s] | gen 81.80 % [time to throw 2.250 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.396 s] | gen 0.00 % [time to throw 2.250 s]
  sacker_mix.split.interior: flat 84.42 % [time to throw 2.396 s] | gen 86.94 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 9.95 % [time to throw 2.396 s] | gen 8.44 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 5.61 % [time to throw 2.396 s] | gen 4.61 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 2.396 s] | gen 0.01 % [time to throw 2.250 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 80.90 % [time to throw 2.396 s] | gen 82.03 % [time to throw 2.250 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 1.07 % | gen 1.04 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.31 % | gen 1.42 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.61 % | gen 19.55 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.05 % | gen 4.09 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.62 % | gen 18.18 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.41 % | gen 26.88 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 36.94 % | gen 37.72 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 13.20 % | gen 17.31 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.60 % | gen 32.94 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 22.97 % | gen 16.84 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 27.03 % | gen 29.03 %
  nobody_open_share: flat 49.23 % of dropbacks | gen 62.53 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 5.12 % of dropbacks | gen 6.09 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 2.47 % of dropbacks | gen 5.69 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 6.80 % of dropbacks | gen 4.57 % of dropbacks
  nobody_open_share.split.SACK: flat 34.84 % of dropbacks [time to throw 2.396 s] | gen 46.18 % of dropbacks [time to throw 2.250 s]
  clean_checkdown_share: flat 4.04 % of clean aimed throws | gen 3.18 % of clean aimed throws
  clean_later_read_share: flat 20.53 % of clean aimed throws | gen 24.97 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.70, per aimed throw 2.17; forced-throw share 63.25; completion per attempt 29.88, per aimed throw 37.95; INT-source mix CONTESTED_CATCH 92.04, TIPPED_RECOVERY 7.96
      flat PROGRESSION: 5217 aimed, INT 0.31, completion 36.94
      flat RANK_PUSHED: 1189 aimed, INT 11.61, completion 13.20
      flat CHECKDOWN: 1890 aimed, INT 0.05, completion 34.60
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 910 aimed, INT 4.62, completion 22.97
      flat ON_THE_RUN: 74 aimed, INT 5.41, completion 27.03
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.41 against a real 3.25
    gen: INT per attempt 5.99, per aimed throw 6.83; forced-throw share 70.01; completion per attempt 30.94, per aimed throw 35.25; INT-source mix CONTESTED_CATCH 51.61, TIPPED_RECOVERY 48.39
      gen PROGRESSION: 3659 aimed, INT 1.42, completion 37.72
      gen RANK_PUSHED: 624 aimed, INT 19.55, completion 17.31
      gen CHECKDOWN: 1272 aimed, INT 4.09, completion 32.94
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 1188 aimed, INT 18.18, completion 16.84
      gen ON_THE_RUN: 93 aimed, INT 26.88, completion 29.03
      gen on the run: clean INT n/a against a real 2.11; pressured INT 26.88 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== A11 (pricing arm, never a design value): release clock the decision tick ==
  time to throw: flat 2.739 s | gen 2.695 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 2984 of 48297 dropbacks (6.18 per 100); pressuredSacks 2984; pressured dropbacks 21571 (44.66 per 100) [time to throw 2.739 s]
    gen: sacks 2007 of 26578 dropbacks (7.55 per 100); pressuredSacks 1996; pressured dropbacks 11769 (44.28 per 100) [time to throw 2.695 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 13.83% | -8.19 against 22.02% (PR #33, FTN only (held)) | -1.63 against 15.46% (main) [time to throw 2.739 s]
    gen: 16.96% | -5.06 against 22.02% (PR #33, FTN only (held)) | 1.50 against 15.46% (main) [time to throw 2.695 s]
  rows (66, both leagues):
  threat_creation_rate: flat 44.66 % | gen 44.28 %
  hit_or_sack_rate: flat 7.57 % [time to throw 2.739 s] | gen 10.57 % [time to throw 2.695 s]
  sack_rate: flat 6.18 % [time to throw 2.739 s] | gen 7.55 % [time to throw 2.695 s]
  time_to_throw: flat 2.739 seconds | gen 2.695 seconds
  sack_share_of_hit_or_sack: flat 81.66 % [time to throw 2.739 s] | gen 71.47 % [time to throw 2.695 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.739 s] | gen 0.00 % [time to throw 2.695 s]
  release_distribution: flat 2.739 seconds | gen 2.695 seconds
  pressured_share_by_release_bin: flat 45.51 % | gen 48.66 %
  hit_rate_by_release_bin: flat 5.32 % [time to throw 2.739 s] | gen 9.39 % [time to throw 2.695 s]
  hits_on_aimed_throws_per_dropback: flat 1.39 % [time to throw 2.739 s] | gen 3.01 % [time to throw 2.695 s]
  first_pressure_seconds: flat 1.416 seconds | gen 1.451 seconds
  first_forcing_seconds: flat 1.684 seconds | gen 1.714 seconds
  first_arrival_seconds: flat 1.720 seconds | gen 1.780 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 3.58%, FREE_RUNNER 57.02%, WON_REP 39.39%; gen COUNTER 4.05%, FREE_RUNNER 56.08%, WON_REP 39.87%)
  quick_pressure_share_by_origin: flat 73.40 % | gen 73.17 %
  clean_with_live_won_rep_ticks: flat 0.04 % | gen 0.03 %
  clean_with_live_won_rep_dropbacks: flat 0.16 % | gen 0.10 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 19.16 % | gen 13.24 %
  throwaway_rate_clean: flat 15.17 % | gen 7.21 %
  scramble_rate: flat 8.51 % | gen 4.77 %
  scramble_yards: flat 6.88 yards | gen 5.14 yards
  by_down_fixed_calls: flat 15.31 % | gen 16.12 %
  int_per_aimed_throw: flat 2.86 % | gen 7.25 %
  completion_per_aimed_throw: flat 42.97 % | gen 41.36 %
  forced_throw_share: flat 26.50 % | gen 29.57 %
  completion_by_pocket_status: flat 24.15 % | gen 26.55 %
  qb_season_spread: flat 0.00 pp | gen 3.41 pp
  defence_season_spread: flat 0.00 pp | gen 1.33 pp
  unblocked_pressures_per_100: flat 19.00 per 100 dropbacks | gen 18.26 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 60.02 % [time to throw 2.739 s] | gen 61.79 % [time to throw 2.695 s]
  unblocked_men_per_100: flat 19.00 per 100 dropbacks | gen 18.26 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 23.88 % | gen 26.82 %
  quick_share_no_free_runner: flat 38.05 % | gen 38.91 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 19.15 % | gen 11.46 %
  situation_q1q3_last_two: flat 18.41 % | gen 12.38 %
  sack_share_of_contacts_in_out: flat 81.59 % [time to throw 2.739 s] | gen 71.45 % [time to throw 2.695 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.739 s] | gen 0.55 % [time to throw 2.695 s]
  sacker_mix.split.interior: flat 30.85 % [time to throw 2.739 s] | gen 32.35 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 33.15 % [time to throw 2.739 s] | gen 31.80 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 35.44 % [time to throw 2.739 s] | gen 35.59 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.56 % [time to throw 2.739 s] | gen 0.26 % [time to throw 2.695 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 31.13 % [time to throw 2.739 s] | gen 32.57 % [time to throw 2.695 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 0.06 % | gen 0.10 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.06 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.40 % | gen 21.11 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 3.66 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.41 % | gen 16.90 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.56 % | gen 16.00 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 42.43 % | gen 45.19 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.73 % | gen 18.71 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 38.53 % | gen 35.51 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 25.39 % | gen 21.21 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 24.31 % | gen 35.00 %
  nobody_open_share: flat 38.15 % of dropbacks | gen 36.29 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 9.01 % of dropbacks | gen 9.26 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.01 % of dropbacks | gen 9.60 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 16.95 % of dropbacks | gen 9.88 % of dropbacks
  nobody_open_share.split.SACK: flat 6.18 % of dropbacks [time to throw 2.739 s] | gen 7.55 % of dropbacks [time to throw 2.695 s]
  clean_checkdown_share: flat 5.74 % of clean aimed throws | gen 2.94 % of clean aimed throws
  clean_later_read_share: flat 22.53 % of clean aimed throws | gen 26.86 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.29, per aimed throw 2.86; forced-throw share 26.50; completion per attempt 34.43, per aimed throw 42.97; INT-source mix CONTESTED_CATCH 90.48, TIPPED_RECOVERY 9.52
      flat PROGRESSION: 19594 aimed, INT 0.29, completion 42.43
      flat RANK_PUSHED: 6024 aimed, INT 11.40, completion 17.73
      flat CHECKDOWN: 4350 aimed, INT 0.18, completion 38.53
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2903 aimed, INT 6.41, completion 25.39
      flat ON_THE_RUN: 144 aimed, INT 5.56, completion 24.31
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.56 against a real 3.25
    gen: INT per attempt 6.43, per aimed throw 7.25; forced-throw share 29.57; completion per attempt 36.70, per aimed throw 41.36; INT-source mix CONTESTED_CATCH 46.50, TIPPED_RECOVERY 53.50
      gen PROGRESSION: 12197 aimed, INT 2.06, completion 45.19
      gen RANK_PUSHED: 3368 aimed, INT 21.11, completion 18.71
      gen CHECKDOWN: 2461 aimed, INT 3.66, completion 35.51
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2551 aimed, INT 16.90, completion 21.21
      gen ON_THE_RUN: 100 aimed, INT 16.00, completion 35.00
      gen on the run: clean INT n/a against a real 2.11; pressured INT 16.00 against a real 3.25
    the guard against A14 (pricing arm, never a design value) (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.17 -> arm 2.86, rise 0.70 against an allowed 0.42: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.31 -> arm 0.29, rise -0.02 against an allowed 0.44: PASSES
    flat RANK_PUSHED: base 11.61 -> arm 11.40, rise -0.20 against an allowed 0.14: PASSES
    flat CHECKDOWN: base 0.05 -> arm 0.18, rise 0.13 against an allowed 0.46: PASSES
    flat DESPERATION: base 4.62 -> arm 6.41, rise 1.79 against an allowed 0.74: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 5.41 -> arm 5.56, rise 0.15 against an allowed 0.42: PASSES
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.83 -> arm 7.25, rise 0.42 against an allowed 0.55: PASSES
    gen PROGRESSION: base 1.42 -> arm 2.06, rise 0.64 against an allowed 0.55: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 19.55 -> arm 21.11, rise 1.56 against an allowed 0.15: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.09 -> arm 3.66, rise -0.43 against an allowed 0.37: PASSES
    gen DESPERATION: base 18.18 -> arm 16.90, rise -1.29 against an allowed 1.00: PASSES
    gen ON_THE_RUN: base 26.88 -> arm 16.00, rise -10.88 against an allowed 0.15: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A14 (pricing arm, never a design value): flat 14081 | gen 7777

== A12 (pricing arm, never a design value): release clock the decision tick ==
  time to throw: flat 2.628 s | gen 2.558 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 3093 of 49971 dropbacks (6.19 per 100); pressuredSacks 3093; pressured dropbacks 44648 (89.35 per 100) [time to throw 2.628 s]
    gen: sacks 2025 of 27871 dropbacks (7.27 per 100); pressuredSacks 2025; pressured dropbacks 24806 (89.00 per 100) [time to throw 2.558 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 6.93% | -15.09 against 22.02% (PR #33, FTN only (held)) | -8.53 against 15.46% (main) [time to throw 2.628 s]
    gen: 8.16% | -13.86 against 22.02% (PR #33, FTN only (held)) | -7.30 against 15.46% (main) [time to throw 2.558 s]
  rows (66, both leagues):
  threat_creation_rate: flat 89.35 % | gen 89.00 %
  hit_or_sack_rate: flat 7.47 % [time to throw 2.628 s] | gen 9.91 % [time to throw 2.558 s]
  sack_rate: flat 6.19 % [time to throw 2.628 s] | gen 7.27 % [time to throw 2.558 s]
  time_to_throw: flat 2.628 seconds | gen 2.558 seconds
  sack_share_of_hit_or_sack: flat 82.88 % [time to throw 2.628 s] | gen 73.32 % [time to throw 2.558 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.628 s] | gen 0.00 % [time to throw 2.558 s]
  release_distribution: flat 2.628 seconds | gen 2.558 seconds
  pressured_share_by_release_bin: flat 89.63 % | gen 90.52 %
  hit_rate_by_release_bin: flat 3.98 % [time to throw 2.628 s] | gen 6.30 % [time to throw 2.558 s]
  hits_on_aimed_throws_per_dropback: flat 1.28 % [time to throw 2.628 s] | gen 2.64 % [time to throw 2.558 s]
  first_pressure_seconds: flat 1.331 seconds | gen 1.326 seconds
  first_forcing_seconds: flat 2.090 seconds | gen 2.093 seconds
  first_arrival_seconds: flat 1.862 seconds | gen 1.898 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 71.52%, FREE_RUNNER 28.48%, WON_REP 0.00%; gen COUNTER 72.16%, FREE_RUNNER 27.84%)
  quick_pressure_share_by_origin: flat 94.64 % | gen 94.90 %
  clean_with_live_won_rep_ticks: flat 0.03 % | gen 0.03 %
  clean_with_live_won_rep_dropbacks: flat 0.06 % | gen 0.06 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 18.81 % | gen 13.44 %
  throwaway_rate_clean: flat 10.91 % | gen 5.64 %
  scramble_rate: flat 8.25 % | gen 4.70 %
  scramble_yards: flat 7.42 yards | gen 4.76 yards
  by_down_fixed_calls: flat 7.42 % | gen 8.83 %
  int_per_aimed_throw: flat 2.51 % | gen 6.46 %
  completion_per_aimed_throw: flat 37.78 % | gen 36.48 %
  forced_throw_share: flat 53.77 % | gen 55.79 %
  completion_by_pocket_status: flat 27.63 % | gen 29.25 %
  qb_season_spread: flat 0.28 pp | gen 1.61 pp
  defence_season_spread: flat 0.31 pp | gen 0.42 pp
  unblocked_pressures_per_100: flat 19.22 per 100 dropbacks | gen 18.19 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 62.17 % [time to throw 2.628 s] | gen 64.95 % [time to throw 2.558 s]
  unblocked_men_per_100: flat 19.22 per 100 dropbacks | gen 18.19 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 85.14 % | gen 86.53 %
  quick_share_no_free_runner: flat 92.50 % | gen 92.93 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 18.51 % | gen 12.94 %
  situation_q1q3_last_two: flat 18.06 % | gen 13.06 %
  sack_share_of_contacts_in_out: flat 82.71 % [time to throw 2.628 s] | gen 73.22 % [time to throw 2.558 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.628 s] | gen 0.00 % [time to throw 2.558 s]
  sacker_mix.split.interior: flat 28.06 % [time to throw 2.628 s] | gen 27.06 % [time to throw 2.558 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 33.30 % [time to throw 2.628 s] | gen 33.59 % [time to throw 2.558 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 38.09 % [time to throw 2.628 s] | gen 39.07 % [time to throw 2.558 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.55 % [time to throw 2.628 s] | gen 0.27 % [time to throw 2.558 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 28.64 % [time to throw 2.628 s] | gen 27.42 % [time to throw 2.558 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 23.54 % | gen 23.17 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.30 % | gen 1.91 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 10.91 % | gen 18.96 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.22 % | gen 3.90 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 5.56 % | gen 15.25 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 6.97 % | gen 14.74 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 37.67 % | gen 39.87 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 13.72 % | gen 14.91 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.30 % | gen 32.61 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 20.27 % | gen 18.88 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 16.92 % | gen 28.42 %
  nobody_open_share: flat 42.52 % of dropbacks | gen 44.46 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 12.64 % of dropbacks | gen 14.63 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.73 % of dropbacks | gen 9.98 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.97 % of dropbacks | gen 12.58 % of dropbacks
  nobody_open_share.split.SACK: flat 6.19 % of dropbacks [time to throw 2.628 s] | gen 7.27 % of dropbacks [time to throw 2.558 s]
  clean_checkdown_share: flat 3.27 % of clean aimed throws | gen 1.94 % of clean aimed throws
  clean_later_read_share: flat 17.71 % of clean aimed throws | gen 21.09 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.99, per aimed throw 2.51; forced-throw share 53.77; completion per attempt 29.84, per aimed throw 37.78; INT-source mix CONTESTED_CATCH 92.23, TIPPED_RECOVERY 7.77
      flat PROGRESSION: 18854 aimed, INT 0.30, completion 37.67
      flat RANK_PUSHED: 5545 aimed, INT 10.91, completion 13.72
      flat CHECKDOWN: 6314 aimed, INT 0.22, completion 34.30
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2862 aimed, INT 5.56, completion 20.27
      flat ON_THE_RUN: 201 aimed, INT 6.97, completion 16.92
      flat on the run: clean INT n/a against a real 2.11; pressured INT 6.97 against a real 3.25
    gen: INT per attempt 5.54, per aimed throw 6.46; forced-throw share 55.79; completion per attempt 31.26, per aimed throw 36.48; INT-source mix CONTESTED_CATCH 46.43, TIPPED_RECOVERY 53.57
      gen PROGRESSION: 11185 aimed, INT 1.91, completion 39.87
      gen RANK_PUSHED: 2891 aimed, INT 18.96, completion 14.91
      gen CHECKDOWN: 4078 aimed, INT 3.90, completion 32.61
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2781 aimed, INT 15.25, completion 18.88
      gen ON_THE_RUN: 95 aimed, INT 14.74, completion 28.42
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.74 against a real 3.25
    the guard against A14 (pricing arm, never a design value) (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.17 -> arm 2.51, rise 0.35 against an allowed 0.36: PASSES
    flat PROGRESSION: base 0.31 -> arm 0.30, rise -0.00 against an allowed 0.32: PASSES
    flat RANK_PUSHED: base 11.61 -> arm 10.91, rise -0.70 against an allowed 0.12: PASSES
    flat CHECKDOWN: base 0.05 -> arm 0.22, rise 0.17 against an allowed 0.45: PASSES
    flat DESPERATION: base 4.62 -> arm 5.56, rise 0.94 against an allowed 0.64: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 5.41 -> arm 6.97, rise 1.56 against an allowed 0.43: BREACH: the step stops and comes back to the owner with a second seed set
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.83 -> arm 6.46, rise -0.37 against an allowed 0.48: PASSES
    gen PROGRESSION: base 1.42 -> arm 1.91, rise 0.49 against an allowed 0.42: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 19.55 -> arm 18.96, rise -0.60 against an allowed 0.09: PASSES
    gen CHECKDOWN: base 4.09 -> arm 3.90, rise -0.19 against an allowed 0.44: PASSES
    gen DESPERATION: base 18.18 -> arm 15.25, rise -2.94 against an allowed 0.92: PASSES
    gen ON_THE_RUN: base 26.88 -> arm 14.74, rise -12.14 against an allowed 0.29: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A14 (pricing arm, never a design value): flat 49971 | gen 27870

== A13 (pricing arm, never a design value): release clock the decision tick ==
  time to throw: flat 2.475 s | gen 2.403 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 4319 of 48477 dropbacks (8.91 per 100); pressuredSacks 4319; pressured dropbacks 44577 (91.95 per 100) [time to throw 2.475 s]
    gen: sacks 2979 of 27121 dropbacks (10.98 per 100); pressuredSacks 2977; pressured dropbacks 24839 (91.59 per 100) [time to throw 2.403 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 9.69% | -12.33 against 22.02% (PR #33, FTN only (held)) | -5.77 against 15.46% (main) [time to throw 2.475 s]
    gen: 11.99% | -10.03 against 22.02% (PR #33, FTN only (held)) | -3.47 against 15.46% (main) [time to throw 2.403 s]
  rows (66, both leagues):
  threat_creation_rate: flat 91.95 % | gen 91.59 %
  hit_or_sack_rate: flat 11.30 % [time to throw 2.475 s] | gen 16.50 % [time to throw 2.403 s]
  sack_rate: flat 8.91 % [time to throw 2.475 s] | gen 10.98 % [time to throw 2.403 s]
  time_to_throw: flat 2.475 seconds | gen 2.403 seconds
  sack_share_of_hit_or_sack: flat 78.87 % [time to throw 2.475 s] | gen 66.55 % [time to throw 2.403 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.475 s] | gen 0.00 % [time to throw 2.403 s]
  release_distribution: flat 2.475 seconds | gen 2.403 seconds
  pressured_share_by_release_bin: flat 94.16 % | gen 94.77 %
  hit_rate_by_release_bin: flat 9.45 % [time to throw 2.475 s] | gen 18.48 % [time to throw 2.403 s]
  hits_on_aimed_throws_per_dropback: flat 2.39 % [time to throw 2.475 s] | gen 5.52 % [time to throw 2.403 s]
  first_pressure_seconds: flat 1.146 seconds | gen 1.143 seconds
  first_forcing_seconds: flat 1.875 seconds | gen 1.856 seconds
  first_arrival_seconds: flat 1.875 seconds | gen 1.906 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 72.21%, FREE_RUNNER 27.59%, WON_REP 0.19%; gen COUNTER 72.71%, FREE_RUNNER 27.06%, WON_REP 0.23%)
  quick_pressure_share_by_origin: flat 96.27 % | gen 96.30 %
  clean_with_live_won_rep_ticks: flat 0.04 % | gen 0.04 %
  clean_with_live_won_rep_dropbacks: flat 0.07 % | gen 0.06 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 20.72 % | gen 15.03 %
  throwaway_rate_clean: flat 12.33 % | gen 5.21 %
  scramble_rate: flat 11.66 % | gen 6.11 %
  scramble_yards: flat 6.50 yards | gen 4.61 yards
  by_down_fixed_calls: flat 10.17 % | gen 11.72 %
  int_per_aimed_throw: flat 2.58 % | gen 6.75 %
  completion_per_aimed_throw: flat 38.07 % | gen 36.40 %
  forced_throw_share: flat 58.19 % | gen 61.03 %
  completion_by_pocket_status: flat 26.76 % | gen 28.43 %
  qb_season_spread: flat 0.45 pp | gen 2.81 pp
  defence_season_spread: flat 0.20 pp | gen 0.00 pp
  unblocked_pressures_per_100: flat 19.06 per 100 dropbacks | gen 18.26 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 40.36 % [time to throw 2.475 s] | gen 39.75 % [time to throw 2.403 s]
  unblocked_men_per_100: flat 19.06 per 100 dropbacks | gen 18.26 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 92.46 % | gen 93.28 %
  quick_share_no_free_runner: flat 94.84 % | gen 94.92 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 19.99 % | gen 14.41 %
  situation_q1q3_last_two: flat 20.52 % | gen 14.46 %
  sack_share_of_contacts_in_out: flat 78.83 % [time to throw 2.475 s] | gen 66.51 % [time to throw 2.403 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.475 s] | gen 0.13 % [time to throw 2.403 s]
  sacker_mix.split.interior: flat 52.33 % [time to throw 2.475 s] | gen 51.79 % [time to throw 2.403 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 22.62 % [time to throw 2.475 s] | gen 22.97 % [time to throw 2.403 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 24.77 % [time to throw 2.475 s] | gen 25.10 % [time to throw 2.403 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.28 % [time to throw 2.475 s] | gen 0.14 % [time to throw 2.403 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 52.20 % [time to throw 2.475 s] | gen 51.79 % [time to throw 2.403 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 22.25 % | gen 21.04 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.34 % | gen 1.93 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 12.16 % | gen 19.40 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.18 % | gen 4.20 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.86 % | gen 16.78 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 16.07 % | gen 18.78 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 37.65 % | gen 39.95 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 14.06 % | gen 14.70 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.42 % | gen 32.73 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 21.40 % | gen 18.52 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 20.09 % | gen 24.31 %
  nobody_open_share: flat 47.61 % of dropbacks | gen 50.47 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 13.61 % of dropbacks | gen 15.99 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 5.05 % of dropbacks | gen 9.30 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 20.04 % of dropbacks | gen 14.20 % of dropbacks
  nobody_open_share.split.SACK: flat 8.91 % of dropbacks [time to throw 2.475 s] | gen 10.98 % of dropbacks [time to throw 2.403 s]
  clean_checkdown_share: flat 3.39 % of clean aimed throws | gen 2.17 % of clean aimed throws
  clean_later_read_share: flat 19.39 % of clean aimed throws | gen 22.95 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.93, per aimed throw 2.58; forced-throw share 58.19; completion per attempt 28.47, per aimed throw 38.07; INT-source mix CONTESTED_CATCH 91.67, TIPPED_RECOVERY 8.33
      flat PROGRESSION: 15196 aimed, INT 0.34, completion 37.65
      flat RANK_PUSHED: 4325 aimed, INT 12.16, completion 14.06
      flat CHECKDOWN: 6597 aimed, INT 0.18, completion 34.42
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 2449 aimed, INT 4.86, completion 21.40
      flat ON_THE_RUN: 224 aimed, INT 16.07, completion 20.09
      flat on the run: clean INT n/a against a real 2.11; pressured INT 16.07 against a real 3.25
    gen: INT per attempt 5.59, per aimed throw 6.75; forced-throw share 61.03; completion per attempt 30.16, per aimed throw 36.40; INT-source mix CONTESTED_CATCH 46.30, TIPPED_RECOVERY 53.70
      gen PROGRESSION: 9336 aimed, INT 1.93, completion 39.95
      gen RANK_PUSHED: 2258 aimed, INT 19.40, completion 14.70
      gen CHECKDOWN: 4336 aimed, INT 4.20, completion 32.73
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2521 aimed, INT 16.78, completion 18.52
      gen ON_THE_RUN: 181 aimed, INT 18.78, completion 24.31
      gen on the run: clean INT n/a against a real 2.11; pressured INT 18.78 against a real 3.25
    the guard against A14 (pricing arm, never a design value) (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.17 -> arm 2.58, rise 0.42 against an allowed 0.19: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.31 -> arm 0.34, rise 0.03 against an allowed 0.17: PASSES
    flat RANK_PUSHED: base 11.61 -> arm 12.16, rise 0.56 against an allowed 0.00: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.05 -> arm 0.18, rise 0.13 against an allowed 0.18: PASSES
    flat DESPERATION: base 4.62 -> arm 4.86, rise 0.24 against an allowed 0.39: PASSES
    flat ON_THE_RUN: base 5.41 -> arm 16.07, rise 10.67 against an allowed 0.19: BREACH: the step stops and comes back to the owner with a second seed set
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.83 -> arm 6.75, rise -0.09 against an allowed 0.30: PASSES
    gen PROGRESSION: base 1.42 -> arm 1.93, rise 0.51 against an allowed 0.26: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 19.55 -> arm 19.40, rise -0.15 against an allowed -0.04: PASSES
    gen CHECKDOWN: base 4.09 -> arm 4.20, rise 0.11 against an allowed 0.14: PASSES
    gen DESPERATION: base 18.18 -> arm 16.78, rise -1.40 against an allowed 0.65: PASSES
    gen ON_THE_RUN: base 26.88 -> arm 18.78, rise -8.10 against an allowed 0.13: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A14 (pricing arm, never a design value): flat 48477 | gen 27121
```

### A0b (pricing arm, never a design value) with A15 (context only; pricing arm, never a design value)

```text
ADR-089 step 1: the pocket report (2 arms; both leagues; every hit and sack figure with its time to throw beside it)

== A0b (pricing arm, never a design value) (the base arm): release clock the decision tick ==
  time to throw: flat 2.471 s | gen 2.314 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 13262 of 37175 dropbacks (35.67 per 100); pressuredSacks 13262; pressured dropbacks 33770 (90.84 per 100) [time to throw 2.471 s]
    gen: sacks 10301 of 21432 dropbacks (48.06 per 100); pressuredSacks 10290; pressured dropbacks 19400 (90.52 per 100) [time to throw 2.314 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 39.27% | 17.25 against 22.02% (PR #33, FTN only (held)) | 23.81 against 15.46% (main) [time to throw 2.471 s]
    gen: 53.04% | 31.02 against 22.02% (PR #33, FTN only (held)) | 37.58 against 15.46% (main) [time to throw 2.314 s]
  rows (66, both leagues):
  threat_creation_rate: flat 90.84 % | gen 90.52 %
  hit_or_sack_rate: flat 40.46 % [time to throw 2.471 s] | gen 58.93 % [time to throw 2.314 s]
  sack_rate: flat 35.67 % [time to throw 2.471 s] | gen 48.06 % [time to throw 2.314 s]
  time_to_throw: flat 2.471 seconds | gen 2.314 seconds
  sack_share_of_hit_or_sack: flat 88.18 % [time to throw 2.471 s] | gen 81.56 % [time to throw 2.314 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.471 s] | gen 0.00 % [time to throw 2.314 s]
  release_distribution: flat 2.471 seconds | gen 2.314 seconds
  pressured_share_by_release_bin: flat 80.08 % | gen 82.77 %
  hit_rate_by_release_bin: flat 18.47 % [time to throw 2.471 s] | gen 24.96 % [time to throw 2.314 s]
  hits_on_aimed_throws_per_dropback: flat 4.78 % [time to throw 2.471 s] | gen 10.87 % [time to throw 2.314 s]
  first_pressure_seconds: flat 1.164 seconds | gen 1.164 seconds
  first_forcing_seconds: flat 1.252 seconds | gen 1.250 seconds
  first_arrival_seconds: flat 1.441 seconds | gen 1.524 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 2.95%, FREE_RUNNER 5.66%, WON_REP 91.40%; gen COUNTER 2.78%, FREE_RUNNER 5.71%, WON_REP 91.52%)
  quick_pressure_share_by_origin: flat 95.44 % | gen 95.36 %
  clean_with_live_won_rep_ticks: flat 4.86 % | gen 4.87 %
  clean_with_live_won_rep_dropbacks: flat 7.82 % | gen 7.90 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 6.13 % | gen 4.43 %
  throwaway_rate_clean: flat 14.36 % | gen 5.46 %
  scramble_rate: flat 30.28 % | gen 10.83 %
  scramble_yards: flat 5.32 yards | gen 3.63 yards
  by_down_fixed_calls: flat 39.58 % | gen 52.96 %
  int_per_aimed_throw: flat 2.25 % | gen 6.85 %
  completion_per_aimed_throw: flat 38.18 % | gen 36.66 %
  forced_throw_share: flat 55.71 % | gen 64.27 %
  completion_by_pocket_status: flat 26.68 % | gen 28.96 %
  qb_season_spread: flat 0.00 pp | gen 6.69 pp
  defence_season_spread: flat 0.67 pp | gen 1.28 pp
  unblocked_pressures_per_100: flat 5.19 per 100 dropbacks | gen 5.39 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 3.62 % [time to throw 2.471 s] | gen 4.21 % [time to throw 2.314 s]
  unblocked_men_per_100: flat 19.09 per 100 dropbacks | gen 19.24 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 81.19 % | gen 85.17 %
  quick_share_no_free_runner: flat 97.37 % | gen 97.20 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 6.19 % | gen 3.90 %
  situation_q1q3_last_two: flat 5.56 % | gen 4.07 %
  sack_share_of_contacts_in_out: flat 88.18 % [time to throw 2.471 s] | gen 81.56 % [time to throw 2.314 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.471 s] | gen 0.12 % [time to throw 2.314 s]
  sacker_mix.split.interior: flat 84.96 % [time to throw 2.471 s] | gen 87.75 % [time to throw 2.314 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 10.96 % [time to throw 2.471 s] | gen 8.17 % [time to throw 2.314 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 4.05 % [time to throw 2.471 s] | gen 4.06 % [time to throw 2.314 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.03 % [time to throw 2.471 s] | gen 0.02 % [time to throw 2.314 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 81.63 % [time to throw 2.471 s] | gen 83.14 % [time to throw 2.314 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.21 % | gen 6.29 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.29 % | gen 2.09 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.02 % | gen 19.31 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.26 % | gen 4.85 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 4.83 % | gen 15.76 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 5.33 % | gen 21.43 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 37.44 % | gen 39.45 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 15.58 % | gen 17.26 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 34.26 % | gen 32.29 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.79 % | gen 17.62 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 20.00 % | gen 23.21 %
  nobody_open_share: flat 50.22 % of dropbacks | gen 65.36 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 5.10 % of dropbacks | gen 6.26 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 2.56 % of dropbacks | gen 6.51 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 6.88 % of dropbacks | gen 4.53 % of dropbacks
  nobody_open_share.split.SACK: flat 35.67 % of dropbacks [time to throw 2.471 s] | gen 48.06 % of dropbacks [time to throw 2.314 s]
  clean_checkdown_share: flat 4.66 % of clean aimed throws | gen 2.09 % of clean aimed throws
  clean_later_read_share: flat 20.54 % of clean aimed throws | gen 22.88 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 1.79, per aimed throw 2.25; forced-throw share 55.71; completion per attempt 30.46, per aimed throw 38.18; INT-source mix CONTESTED_CATCH 91.19, TIPPED_RECOVERY 8.81
      flat PROGRESSION: 5769 aimed, INT 0.29, completion 37.44
      flat RANK_PUSHED: 1406 aimed, INT 11.02, completion 15.58
      flat CHECKDOWN: 1897 aimed, INT 0.26, completion 34.26
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 952 aimed, INT 4.83, completion 24.79
      flat ON_THE_RUN: 75 aimed, INT 5.33, completion 20.00
      flat on the run: clean INT n/a against a real 2.11; pressured INT 5.33 against a real 3.25
    gen: INT per attempt 6.10, per aimed throw 6.85; forced-throw share 64.27; completion per attempt 32.62, per aimed throw 36.66; INT-source mix CONTESTED_CATCH 51.02, TIPPED_RECOVERY 48.98
      gen PROGRESSION: 4264 aimed, INT 2.09, completion 39.45
      gen RANK_PUSHED: 782 aimed, INT 19.31, completion 17.26
      gen CHECKDOWN: 1341 aimed, INT 4.85, completion 32.29
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 1396 aimed, INT 15.76, completion 17.62
      gen ON_THE_RUN: 56 aimed, INT 21.43, completion 23.21
      gen on the run: clean INT n/a against a real 2.11; pressured INT 21.43 against a real 3.25
    the guard: this is the base every other arm's rise is read against
  exclusive affected plays: none (the base arm; counts start at step 1)

== A15 (context only; pricing arm, never a design value): release clock the decision tick ==
  time to throw: flat 2.809 s | gen 2.799 s
  sacks and the pressured count (separately, ADR-089:927):
    flat: sacks 1720 of 50526 dropbacks (3.40 per 100); pressuredSacks 1720; pressured dropbacks 17426 (34.49 per 100) [time to throw 2.809 s]
    gen: sacks 1226 of 27434 dropbacks (4.47 per 100); pressuredSacks 1185; pressured dropbacks 9671 (35.25 per 100) [time to throw 2.799 s]
  P2S (reported, never graded; against 22.02% PR #33, FTN only (held) and 15.46% main):
    flat: 9.87% | -12.15 against 22.02% (PR #33, FTN only (held)) | -5.59 against 15.46% (main) [time to throw 2.809 s]
    gen: 12.25% | -9.77 against 22.02% (PR #33, FTN only (held)) | -3.21 against 15.46% (main) [time to throw 2.799 s]
  rows (66, both leagues):
  threat_creation_rate: flat 34.49 % | gen 35.25 %
  hit_or_sack_rate: flat 4.26 % [time to throw 2.809 s] | gen 6.30 % [time to throw 2.799 s]
  sack_rate: flat 3.40 % [time to throw 2.809 s] | gen 4.47 % [time to throw 2.799 s]
  time_to_throw: flat 2.809 seconds | gen 2.799 seconds
  sack_share_of_hit_or_sack: flat 79.89 % [time to throw 2.809 s] | gen 70.99 % [time to throw 2.799 s]
  qb_hit_on_scramble: flat 0.00 % [time to throw 2.809 s] | gen 0.00 % [time to throw 2.799 s]
  release_distribution: flat 2.809 seconds | gen 2.799 seconds
  pressured_share_by_release_bin: flat 21.77 % | gen 24.49 %
  hit_rate_by_release_bin: flat 2.26 % [time to throw 2.809 s] | gen 4.22 % [time to throw 2.799 s]
  hits_on_aimed_throws_per_dropback: flat 0.86 % [time to throw 2.809 s] | gen 1.83 % [time to throw 2.799 s]
  first_pressure_seconds: flat 2.526 seconds | gen 2.589 seconds
  first_forcing_seconds: flat 2.661 seconds | gen 2.756 seconds
  first_arrival_seconds: flat 2.120 seconds | gen 2.057 seconds
  first_pressure_origin: flat n/a ticks | gen n/a ticks (flat COUNTER 0.82%, FREE_RUNNER 38.24%, WON_REP 60.94%; gen COUNTER 1.68%, FREE_RUNNER 36.24%, WON_REP 62.08%)
  quick_pressure_share_by_origin: flat 33.30 % | gen 33.12 %
  clean_with_live_won_rep_ticks: flat 0.79 % | gen 0.82 %
  clean_with_live_won_rep_dropbacks: flat 3.84 % | gen 3.99 %
  clean_with_live_won_rep_push_ticks: flat 0.00 % | gen 0.00 %
  throwaway_rate_pressured: flat 23.86 % | gen 16.90 %
  throwaway_rate_clean: flat 13.58 % | gen 5.77 %
  scramble_rate: flat 3.18 % | gen 0.89 %
  scramble_yards: flat 6.89 yards | gen 5.32 yards
  by_down_fixed_calls: flat 9.80 % | gen 11.74 %
  int_per_aimed_throw: flat 2.97 % | gen 7.99 %
  completion_per_aimed_throw: flat 43.33 % | gen 41.92 %
  forced_throw_share: flat 18.19 % | gen 22.03 %
  completion_by_pocket_status: flat 21.95 % | gen 24.77 %
  qb_season_spread: flat 0.66 pp | gen 2.19 pp
  defence_season_spread: flat 0.00 pp | gen 0.66 pp
  unblocked_pressures_per_100: flat 12.11 per 100 dropbacks | gen 11.57 per 100 dropbacks
  unblocked_share_of_hit_or_sack: flat 41.80 % [time to throw 2.809 s] | gen 45.28 % [time to throw 2.799 s]
  unblocked_men_per_100: flat 19.50 per 100 dropbacks | gen 19.02 per 100 dropbacks
  pressured_share_2s_no_free_runner: flat 21.04 % | gen 23.80 %
  quick_share_no_free_runner: flat 35.61 % | gen 34.07 %
  clean_outs_rate: flat 0.00 % | gen 0.00 %
  out_of_pocket_rate: flat n/a % | gen n/a %
  clean_drill_share: flat 0.00 % | gen 0.00 %
  situation_end_of_half: flat 23.81 % | gen 18.23 %
  situation_q1q3_last_two: flat 22.87 % | gen 17.36 %
  sack_share_of_contacts_in_out: flat 79.81 % [time to throw 2.809 s] | gen 70.96 % [time to throw 2.799 s]
  coverage_sack_rows: flat 0.00 % [time to throw 2.809 s] | gen 3.43 % [time to throw 2.799 s]
  sacker_mix.split.interior: flat 45.95 % [time to throw 2.809 s] | gen 43.10 % [time to throw 2.799 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.edge: flat 14.95 % [time to throw 2.809 s] | gen 9.56 % [time to throw 2.799 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.offball: flat 38.54 % [time to throw 2.809 s] | gen 47.16 % [time to throw 2.799 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.split.db: flat 0.56 % [time to throw 2.809 s] | gen 0.17 % [time to throw 2.799 s] (same-tick arrivals split 0.5 (M3))
  sacker_mix.unsplit.interior: flat 45.49 % [time to throw 2.809 s] | gen 42.71 % [time to throw 2.799 s] (last ARRIVED rusher, unsplit)
  multi_channel_share: flat 6.46 % | gen 6.84 %
  int_per_aimed_by_throw_class.PROGRESSION: flat 0.27 % | gen 2.65 %
  int_per_aimed_by_throw_class.RANK_PUSHED: flat 11.17 % | gen 20.73 %
  int_per_aimed_by_throw_class.CHECKDOWN: flat 0.23 % | gen 4.80 %
  int_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  int_per_aimed_by_throw_class.DESPERATION: flat 6.74 % | gen 18.28 %
  int_per_aimed_by_throw_class.ON_THE_RUN: flat 10.24 % | gen 14.63 %
  completion_per_aimed_by_throw_class.PROGRESSION: flat 43.14 % | gen 45.54 %
  completion_per_aimed_by_throw_class.RANK_PUSHED: flat 17.04 % | gen 18.28 %
  completion_per_aimed_by_throw_class.CHECKDOWN: flat 39.55 % | gen 36.99 %
  completion_per_aimed_by_throw_class.CLEAN_EXPIRY: flat n/a % | gen n/a %
  completion_per_aimed_by_throw_class.DESPERATION: flat 24.26 % | gen 20.83 %
  completion_per_aimed_by_throw_class.ON_THE_RUN: flat 21.69 % | gen 14.63 %
  nobody_open_share: flat 34.72 % of dropbacks | gen 32.31 % of dropbacks
  nobody_open_share.split.CHECKDOWN: flat 7.88 % of dropbacks | gen 7.44 % of dropbacks
  nobody_open_share.split.DESPERATION: flat 6.31 % of dropbacks | gen 10.71 % of dropbacks
  nobody_open_share.split.THROWAWAY: flat 17.13 % of dropbacks | gen 9.69 % of dropbacks
  nobody_open_share.split.SACK: flat 3.40 % of dropbacks [time to throw 2.809 s] | gen 4.47 % of dropbacks [time to throw 2.799 s]
  clean_checkdown_share: flat 4.90 % of clean aimed throws | gen 2.63 % of clean aimed throws
  clean_later_read_share: flat 21.83 % of clean aimed throws | gen 24.48 % of clean aimed throws
  the interception guard rows (§8; per 100):
    flat: INT per attempt 2.42, per aimed throw 2.97; forced-throw share 18.19; completion per attempt 35.39, per aimed throw 43.33; INT-source mix CONTESTED_CATCH 90.11, TIPPED_RECOVERY 9.89
      flat PROGRESSION: 23703 aimed, INT 0.27, completion 43.14
      flat RANK_PUSHED: 7505 aimed, INT 11.17, completion 17.04
      flat CHECKDOWN: 3980 aimed, INT 0.23, completion 39.55
      flat CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      flat DESPERATION: 3190 aimed, INT 6.74, completion 24.26
      flat ON_THE_RUN: 166 aimed, INT 10.24, completion 21.69
      flat on the run: clean INT n/a against a real 2.11; pressured INT 10.24 against a real 3.25
    gen: INT per attempt 7.18, per aimed throw 7.99; forced-throw share 22.03; completion per attempt 37.62, per aimed throw 41.92; INT-source mix CONTESTED_CATCH 46.91, TIPPED_RECOVERY 53.09
      gen PROGRESSION: 14208 aimed, INT 2.65, completion 45.54
      gen RANK_PUSHED: 4076 aimed, INT 20.73, completion 18.28
      gen CHECKDOWN: 2041 aimed, INT 4.80, completion 36.99
      gen CLEAN_EXPIRY: 0 aimed, INT n/a, completion n/a
      gen DESPERATION: 2938 aimed, INT 18.28, completion 20.83
      gen ON_THE_RUN: 41 aimed, INT 14.63, completion 14.63
      gen on the run: clean INT n/a against a real 2.11; pressured INT 14.63 against a real 3.25
    the guard against A0b (pricing arm, never a design value) (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):
    flat league-wide: base 2.25 -> arm 2.97, rise 0.72 against an allowed 0.41: BREACH: the step stops and comes back to the owner with a second seed set
    flat PROGRESSION: base 0.29 -> arm 0.27, rise -0.02 against an allowed 0.40: PASSES
    flat RANK_PUSHED: base 11.02 -> arm 11.17, rise 0.14 against an allowed 0.11: BREACH: the step stops and comes back to the owner with a second seed set
    flat CHECKDOWN: base 0.26 -> arm 0.23, rise -0.04 against an allowed 0.59: PASSES
    flat DESPERATION: base 4.83 -> arm 6.74, rise 1.91 against an allowed 0.91: BREACH: the step stops and comes back to the owner with a second seed set
    flat ON_THE_RUN: base 5.33 -> arm 10.24, rise 4.91 against an allowed 0.30: BREACH: the step stops and comes back to the owner with a second seed set
    flat by class: BREACH: the step stops and comes back to the owner with a second seed set
    gen league-wide: base 6.85 -> arm 7.99, rise 1.14 against an allowed 0.58: BREACH: the step stops and comes back to the owner with a second seed set
    gen PROGRESSION: base 2.09 -> arm 2.65, rise 0.57 against an allowed 0.56: BREACH: the step stops and comes back to the owner with a second seed set
    gen RANK_PUSHED: base 19.31 -> arm 20.73, rise 1.42 against an allowed 0.10: BREACH: the step stops and comes back to the owner with a second seed set
    gen CHECKDOWN: base 4.85 -> arm 4.80, rise -0.05 against an allowed 0.59: PASSES
    gen DESPERATION: base 15.76 -> arm 18.28, rise 2.52 against an allowed 1.12: BREACH: the step stops and comes back to the owner with a second seed set
    gen ON_THE_RUN: base 21.43 -> arm 14.63, rise -6.79 against an allowed 0.19: PASSES
    gen by class: BREACH: the step stops and comes back to the owner with a second seed set
  exclusive affected plays against A0b (pricing arm, never a design value): flat 15617 | gen 8717
```
