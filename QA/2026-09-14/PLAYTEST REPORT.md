# Jeopardy full-game playtest

**September 14, 2026 · Completed · Ordinary archive mode · No paid AI calls**

I played a complete four-player game: **all 30 board clues, both Daily Doubles and Final Jeopardy**. The game reached the winner screen and calculated the final scores correctly. I prepared two small fixes for missing-media clues and the final-results reveal in an isolated copy; the original game files remain unchanged.

## Review first

**The game works end to end, but two things can spoil a fair answer:** some clues require media the app cannot show, and a correct multi-part answer can be rejected when its order differs from the stored response.

| Finding | What happened | Status |
|---|---|---|
| Missing audio | FOLK MUSIC, $600: a king supposedly wrote music “over 450 years ago,” followed by `[Instrumental music plays]`. There was no music to identify. | **Small isolated fix prepared.** |
| Correct ingredients rejected | ODDS & ENDS, $600: “vodka and cranberry juice” was marked incorrect; the stored answer was “cranberry juice and vodka.” The player lost $600 and control. | **Open.** Needs careful multi-part matching or a host correction option. |
| Final reveal ends too soon | Four-player play reached the final-results screen and then quickly switched to the winner. Source inspection confirms the parent switches after 3 seconds, while player reveals are scheduled at 0.5, 2.5, 4.5 and 6.5 seconds. Players three/four and the final correct response cannot finish revealing. | **Isolated fix prepared and verified.** Results stay visible until the player continues. |

## The two prepared fixes

[Review the patch](</Users/kellylucas/Jeopardy/QA/2026-09-14/missing-media-filter.patch>) · [Isolated candidate](</Users/kellylucas/Jeopardy/QA/2026-09-14/_build/client/src/utils/dataLoader.js>)

The candidate filters explicit bracketed music/audio/video stage directions before choosing archive clues, for both the main board and Final Jeopardy. It excludes **37 existing archive entries**, including the broken clue encountered in this game. It leaves the source dataset untouched and reuses the existing app dependencies.

This is a narrow fix for identifiable media directions. It does not guarantee that every ambiguous archive clue is solvable, and it does not change answer matching. The patch has **not** been applied to the original game or published.

**Final-results fix:** [Review the separate patch](</Users/kellylucas/Jeopardy/QA/2026-09-14/final-results-continue.patch>). The isolated app no longer jumps to the winner after three seconds. After all player cards and the correct response appear, a native **SEE FINAL SCORES** button allows the user to continue. This keeps the reveal readable and supports keyboard activation. Original app files are untouched.

## What passed

- Four named players; six categories with five values each; all 30 clues completed without using Skip to Final.
- Correct answers increased scores and retained control. An intentionally wrong answer deducted $400 and passed control to the next player.
- Two Daily Doubles in different categories: FOLK MUSIC $800 and ODDS & ENDS $1,000. A typed $0 wager and a $100 quick wager both worked.
- Final Jeopardy began automatically after the last clue. Three players could wager; the $0 player was correctly limited to $0.
- Final answers and wagers produced the expected ranking: **QA Three $9,000; QA Two $4,500; QA One $900; QA Four $0**.
- Browser console showed no errors or warnings in this run. The Vite terminal logged expected `/api/health` connection failures because the AI server was deliberately not started; archive play was unaffected.

## Question quality and game-night friction

**No repeated clue appeared in this 31-clue sample.** The six board categories were FOLK MUSIC, CHINA, TREES, MEN OF SCIENCE, BEASTLY EXPRESSIONS and ODDS & ENDS; Final Jeopardy was CENTRAL AMERICA.

The $200 row was generally accessible. Difficulty and theme were less consistent across the board: CHINA opened with a porcelain-brand clue, then switched to Chinese political history. Randomly combining archive clues under a repeated category name can produce a less coherent category than an original episode.

Ordinary answers disappear after about 2.5 seconds, leaving little time to discuss or correct a ruling. There is no visible pass or host correction control on the clue screen. Final wagers and answers are entered together on one screen, so players can see one another’s entries; that is awkward for a shared-screen game intended to keep wagers secret. The $100 Daily Double shortcut immediately locks the wager and reveals the clue, rather than merely filling the wager box.

## Fix validation and preserved state

**Candidate checks:** generated 500 complete boards (**15,000 board clues**) and 500 Final Jeopardy clues; verified six distinct categories, 30 clues, two Daily Doubles in different categories, none on $200, and no recognized missing-media directions. The observed broken clue was confirmed inside the excluded set. All assertions passed. [Repeatable check script](</Users/kellylucas/Jeopardy/QA/2026-09-14/_build/validate-candidate.mjs>)

**Build:** Vite production build with both candidate fixes passed in 3.42 seconds. It reports an existing large-bundle concern: the archive produces approximately 27.4 MB of JavaScript before gzip. No bundle redesign was attempted.

**Browser smoke check after the fix:** reloaded the isolated app, entered a test player, and generated a new complete 30-clue archive board successfully. The full four-player run was on the unmodified snapshot; the candidates received the focused checks above.

**Final-results fixture:** ran the actual modified FinalJeopardy component with four test players, through wager entry and answer locking. The Continue button was absent at the start of results. All four player cards, the correct response and Continue then appeared and remained visible. Pressing Enter on Continue reached the winner-transition confirmation. No browser errors or warnings occurred. This fixture tests reveal/transition behavior; score calculation was verified in the original full game. Original source checksums were rechecked and unchanged.

Original workspace: `/Users/kellylucas/Jeopardy`, branch `main`, 16 commits behind its remote, with pre-existing modified/untracked work. It was not pulled, reset, committed or pushed. The only new top-level item is `QA/`; the test server used loopback port 4317 and was stopped afterward. [Validation results](</Users/kellylucas/Jeopardy/QA/2026-09-14/_build/validation-results.json>) · [Original source checksums](</Users/kellylucas/Jeopardy/QA/2026-09-14/_build/source-sha256.json>)

**Not covered:** real group fun/pacing, mobile controls, timer-expiration edge cases, paid AI generation, multiplayer networking, or a full replay after the candidate fix.

**Next useful step:** review/apply the two isolated patches, then add a deliberate host ruling correction before the next game night.
