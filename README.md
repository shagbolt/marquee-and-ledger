# Marquee & Ledger — Hollywood Studio Tycoon

A browser-based studio management game. No build step, no dependencies — clone it,
serve the folder over HTTP (or push to GitHub Pages), and it runs.

## Running it locally

Because the game is now split into ES modules, it needs to be served over HTTP —
opening `index.html` directly via `file://` will not load the module scripts (this
is a browser security restriction on `file://` origins, not specific to this game).

Any static file server works, for example:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

or the VS Code "Live Server" extension, or `npx serve`.

## Deploying to GitHub Pages

Push this folder to a repo, then in the repo's Settings → Pages, set the source to
the branch/folder this lives in. No build step required.

## Structure

```
index.html              Page shell: all markup, all modal dialogs, one module script tag
css/theme.css            All styling — dark/light theme variables, layout, components
js/
  main.js                Boot sequence, all DOM event wiring (tabs, buttons, forms)
  data/
    constants.js         Static tables: genres, festivals, talent rosters, studio tiers,
                          fee formulas, and small pure helpers (rand, clamp, formatMoney...)
  state/
    game-state.js         The mutable game/player/aiStudios state, save/load (localStorage
                          + file export/import), and studio founding
  systems/
    market.js              Genre demand, market saturation, background time-advancement
    talent-quality.js      Quality/Hype/Reviews formulas, prestige, breakout hits
    script-development.js  Synopsis analysis, rewrites
    release-strategy.js    Release strategies, calendar, international markets, test screenings
    studio-management.js   Studio departments, awards campaigns
    franchise.js            Franchise extensions, long-term revenue
    production-events.js    Random production events (pre-shoot)
    shoot-events.js          Random events during the week-by-week Production shoot
    post-production.js      Post-production polish tiers and the Additional Photography event
    ai-studios.js            Rival studio behavior: genre picks, bankruptcy, mergers
    awards.js                Annual awards
    streaming.js              Streaming platform payouts
  ui/
    dom-refs.js              Every DOM element lookup, in one place
    render.js                 All renderX() functions that paint state to the DOM
  flow/
    production-flow.js       Green-light → production event → quality/reviews computation
    release-flow.js           Theatrical run conclusion → international → streaming → receipt
```

## What's new in this revision: Post-Production

Sits between the Shoot and Test Screening — deliberately lighter than the Shoot itself,
since the design brief frames editing/sound/VFX/color/ADR as a montage to represent
rather than six separate systems to manage:

- **A real tier choice** — Minimal (cheap, Quality \u22124), Standard (the baseline, no
  effect either way), or Premium (expensive, Quality +7 and Hype +5) — cost scales with
  the picture's own budget, shown in a review dialog before anything's spent.
- **A real chance (35%) of Additional Photography** — an early cut reveals a scene
  that isn't working, and you decide whether it's worth reshooting. Distinct from the
  Shoot's own events, and from Test Screening's reshoot responses, which come later and
  react to actual audience feedback rather than the team's own instincts.
- Producer's risk reduction applies here too, same refund hook as everywhere else a
  Production Event can cost money.

Verified all three tiers against the balance-critical default-path test: Standard (the
neutral middle option) held the same zero-bombs result as before; Minimal — the tier a
new player might reasonably pick as "the cheap one" — comes out meaningfully worse (more
Flops, fewer Blockbusters) but still never bombs outright. That's the intended shape: a
real, visible tradeoff, not a trap.

## What's new in this revision: the Production Shoot

Between the pre-shoot Production Event (the existing one-time surprise) and Test
Screening (which now screens a genuinely *finished* rough cut), there's a real
week-by-week shoot — a "Now Filming" panel on the Dashboard, using the same weekly-tick
and fast-forward pattern as the box office ticker:

- **Duration** comes from the existing `computeProductionWeeks()` (runtime + Script
  Development's Production Complexity) — this used to be a silent wait; now it's an
  active phase you watch.
- **Crew Morale** starts at 70 and moves with events. At wrap, it folds into the same
  `qualityDelta`/`hypeDelta` accumulators every other system already reads — nothing
  downstream needed to change to know a shoot phase exists.
- **Six shoot events** (`js/systems/shoot-events.js`) can fire on any given week —
  weather delays, illness, equipment failure, a standout scene, on-set conflict, a
  director's request for more scenes — each a real pay-to-avoid-it or take-the-hit
  choice, shown in the same event modal the pre-shoot event already uses.
- **Producer's risk reduction** applies here too, refunding a skill-scaled portion of
  whatever a shoot event ends up costing — same hook as the pre-shoot event.
- **Fast Forward** auto-resolves any remaining weeks, always taking each event's first
  (typically "pay to stay on track") option.

Re-verified the balance-critical default-path test after this integration: 15/15
trials, zero bombs — the shoot's morale effect, if anything, skews slightly positive
overall (paying to solve problems is the fast-forward default), and didn't disturb the
existing tuning.

## What's new in this revision: Producer & Greenlight

**Producer** is a sixth crew hire (alongside Writer, Director, Composer, and the two
leads), in the Green-Light form between Director and Composer. Unlike the creative
roles, a producer's job is budget and risk management:

- **Deal-making**: reduces the combined Writer + Director + Composer + Star fees by
  up to 15% at max skill (their own fee is paid in full — shown as a separate
  "Producer Efficiency" discount line in both the budget summary and the receipt).
- **Risk management**: softens the dollar cost of whatever a Production Event ends up
  costing, by up to 30% at max skill. The event's random outcome itself is untouched —
  a good producer buys a smaller bill, not better luck.
- Prestige evolves like every other crew role, but weighted more toward commercial
  performance than critical reception, since a producer is judged on delivering the
  whole production rather than on artistic reception specifically.
- "Self-Produced (No Producer)" is the default — a flat $20,000, no discount, no risk
  reduction — so the existing tuned economics are unaffected unless you deliberately
  hire one.

**Greenlight review** replaces the old "click Release, money's spent" flow. Clicking
"Review for Greenlight" now opens a dialog showing a deterministic quality/hype
estimate, a rough studio-revenue range, and a Low/Moderate/High risk rating — nothing
is committed yet. From there:

- **Greenlight** — proceeds exactly as the old flow did (deduct cost, create the
  production, roll the random event).
- **Delay** — pushes the schedule slider back 4 weeks, closes back to the form.
- **Rewrite** — closes back to the form on the Development tab.
- **Reduce Scope** / **Increase Budget** — adjusts SFX and Marketing by ~20%, closes
  back to the form.
- **Cancel** — closes the dialog; nothing was ever committed.

## Migration notes (multi-file split, this revision)

This was split from a single ~4,400-line HTML file using the file's own existing
section comments as module boundaries, then verified two ways before being
considered done:

1. **Static checks** — every `import` resolves to a real `export`, and every
   identifier used in every file is either locally declared, imported, or a
   known browser/JS global (no bare "hope this is global" gaps).
2. **Behavioral checks** — a full playthrough (found studio → cast → release →
   test screening → box office → international → streaming → receipt →
   save/load) and a 20-release stress run across all 12 tabs, both run in a
   real headless browser, both clean.

One structural note worth knowing if you extend this: a handful of top-level
variables (`player`, `game`, `aiStudios`, `genreDemand`, `writers`, etc.) are
genuinely mutable and read from many files. Under ES modules, only the file
that declares an export is allowed to *reassign* it — other files can only
*read* it (or mutate properties on it, e.g. `player.cash -= x` is fine from
anywhere). Two spots needed fixing for this during the split (studio founding,
and save/load's restore step) — both now go through small setter functions
(`foundNewStudio()`, `setTalentRosters()`, `setGenreDemandFromSave()`, etc.)
in the file that owns the data, rather than reassigning from outside. If you
add new save/load fields or new "reset to fresh state" logic, follow that
same pattern rather than reassigning an imported binding directly — it'll
throw `Assignment to constant variable` at runtime if you don't, immediately
and loudly (see `fatalErrorBanner` in `index.html`), not silently.
