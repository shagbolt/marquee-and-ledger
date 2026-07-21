# Marquee & Ledger — Patch: Genre Badges, Legal Department, Studio Logo

This is a full copy of js/, css/, and index.html with three features added on
top of the live main branch. Diff against your real clone rather than
overwriting, in case you've made local changes since this was forked.

## 1. Genre Badges (app-icon style)
- NEW: js/ui/genre-badges.js — procedural rounded-square badge generator
- constants.js — GENRE_COLORS added (shared palette), GENRE_GRADIENTS now
  generated from it (lighter, more premium poster gradients)
- Comedy gets a rebuilt single mask; Drama gets the classic paired
  comedy/tragedy masks (swapped from the original assignment per feedback)
- Wired into: wizard poster preview, movie detail modal, Genre Tracker rows,
  History table thumbnails
- CSS: .poster-genre-badge, .genre-track-name svg, .history-poster-thumb

## 2. Legal Department
- NEW: js/systems/legal.js — risk meter, case pool (4 case types), firm
  roster (4 named firms), resolution logic, case log
- NEW: js/flow/legal-flow.js — opens/resolves cases via the existing
  decision-card.js renderer
- In-house counsel is always staffed (no hire, no weekly cost) — the only
  choice is per-case: Handle In-House / Settle Quickly / Engage Outside Firm
- Risk hooks added at two call sites: a Bomb verdict (release-flow.js) and
  a rejected International market (release-flow.js)
- Trigger rolled once per settlement close (main.js, summaryCloseBtn handler)
- New Legal Department panel on the Studio tab (index.html, render.js, CSS),
  shown/hidden at the same 60-Prestige threshold the Departments grid uses
- player.legalRisk / player.legalCaseLog persist automatically (player object
  is serialized wholesale) — restoreGame() defaults them for older saves

## 3. Studio Logo
- NEW: js/ui/studio-logo.js — 8 procedural medallion emblems (Star, Lion,
  Globe, Phoenix, Quill, Reel, Comet, Crown)
- Logo picker grid added to the Studio Creation screen (index.html, main.js)
- player.logoKind threaded through freshPlayer/foundNewStudio, defaulted on
  restore for older saves
- Rendered in the masthead next to the studio name (render.js renderHeader)

## Testing performed
All three features verified end-to-end via Playwright against a local
server: studio creation with a chosen logo + masthead render, genre badges
across all six genres in the wizard/History/Genre Tracker, and a
force-triggered Legal case through full choice → outcome → case-log-update
resolution. No console errors in any pass.

## Known follow-ups (not built, flagged for later)
- Legal Risk currently only rises from two hook points (Bomb verdict,
  International rejection) plus passive decay. Siding against talent in a
  Production Event (e.g. Diva Antics) or a future scandal event would be
  natural additions to the same legalRiskAdjust() call.
- Studio logo isn't yet shown anywhere besides the masthead (e.g. Studio
  Office panel, save file name) — easy follow-up using the same
  studioLogoSVG() call.
