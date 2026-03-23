# Issue #68: Q-01: Playwright E2E test suite

https://github.com/tlepoid/Refract/issues/68

---

## Context
E2E tests prove the integrated system works.

## Task
Write Playwright tests for:
1. **Canvas basics**: drag node from palette → canvas, connect two nodes, open properties, edit config, verify node updates
2. **AI analysis flow**: build a 3-node ReAct graph, wait for analysis panel, verify it mentions 'ReAct' and 'token cost'
3. **Eval scorecard**: add a node, verify scorecard values change
4. **Collaboration**: open two browser contexts on same canvas, verify cursor sync, simultaneous node creation
5. **Mermaid round-trip**: export current graph as Mermaid, clear canvas, import the Mermaid, verify node count matches
6. **Undo/redo**: create node, delete it, undo, verify node reappears
7. **What-if mode**: fork, edit one side, verify scorecards diverge

## Acceptance criteria
- [ ] All 7 test scenarios pass
- [ ] Tests run in CI (headless Chromium)
- [ ] Average test suite time under 60 seconds
- [ ] Tests are independent (no shared state between tests)

## Dependencies
- Blocked by: ALL integration issues (#28–#33)
