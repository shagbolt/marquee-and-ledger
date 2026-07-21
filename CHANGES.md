# Help Mode — Patch Contents

## New files
- `js/ui/helptext.js` — pure-data module: 20 help topics derived from the Studio Manual, keyed by anchor selector
- `js/ui/helpmode.js` — the Help Mode engine: persistent masthead toggle, (i) marker injection via debounced MutationObserver, one-at-a-time popovers at z-index 300 (works inside event/test-screening modals)

## Modified files (full copies included — 3 tiny changes)
- `index.html` — one line: `helpModeToggleBtn` button added to masthead after `helpBtn`
- `js/main.js` — two lines: import `initHelpMode`, call it in `init()` after `initTutorialToggle()`
- `css/theme.css` — Help Mode styles appended at end of file (`.help-i`, `.help-popover`, `#helpModeToggleBtn.helpmode-on`)

## Design notes
- Mirrors tutorial.js conventions: no render/flow/state imports, own localStorage key
  (`marqueeLedgerHelpMode_v1`), never part of the save file
- Complements coachmarks rather than replacing them: coachmarks = "look here next" (once);
  Help Mode = "what does this do" (always, on demand)
- MutationObserver means zero per-flow wiring: markers appear automatically as tabs,
  wizard steps, and modals become visible
- Verified via Playwright: injection, popover open/close, click-away, toggle-off cleanup,
  persistence across reload. No console errors.
