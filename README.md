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
    season-goals.js          One goal per game-year, tracked and evaluated on year turnover
    studio-challenges.js     Shorter 8-week goal, alongside the yearly Season Goal
    rival-personalities.js   Fixed archetypes biasing each rival's genre/budget/quality choices
    season-finale.js         Year-end recap data, chained after Awards
  ui/
    dom-refs.js              Every DOM element lookup, in one place
    render.js                 All renderX() functions that paint state to the DOM
    talent-tab.js             The Talent Roster tab: filter/sort over the existing rosters
    movie-detail.js           Complete per-movie production record, opened from History
    objective.js               Derives current phase from existing state, renders the Objective Card
    decision-card.js           Shared renderer for every event/choice modal in the game
    reveal.js                    Animated counters and the causal-explanation generator for settlement results
    wizard.js                   Greenlight wizard step navigation and live movie-card preview
  flow/
    production-flow.js       Green-light → production event → quality/reviews computation
    release-flow.js           Theatrical run conclusion → international → streaming → receipt
    turn-flow.js               advanceWeek() — the single dispatcher every phase's "next week" goes through
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

## What's new in this revision: Rival Personalities, Challenges & Season Finale (Priority 5 — complete)

The last of the five original priorities. Three pieces:

### Rival Studio Personalities
Each of the three named rivals now has a fixed, recognizable archetype — Silverlight
Pictures chases Action/Sci-Fi blockbusters on bigger budgets, Nova Horizon Studios
plays for prestige with Drama and a real quality bonus, Ironclad Films ignores demand
entirely and opportunistically picks whichever genre is currently least saturated.
Personality is tied to the studio's numeric slot rather than its current name, so it
survives a bankruptcy reorganization even though the name changes — the "house style"
reads as a trait of the lot, not of whoever's currently running it. Shows on the
Competitors tab, and flavors the news wire ("Silverlight Pictures bets big on..." vs.
"Nova Horizon Studios quietly assembles...").

### Studio Challenges
A second, shorter-cycle goal alongside the yearly Season Goal — one active at a time,
an 8-week window, a real cash reward (release a picture, land a Certified Fresh review,
out-earn a named rival, or survive without a Bomb). Shows just under the Season Goal bar
on the always-visible Objective Card area. Built on the exact same pattern as Season
Goals: generate, track progress, resolve on the shared weekly tick, replace with a new
one.

### Season Finale
Fires automatically after Awards at year-end: releases and net profit for the year,
biggest hit and flop, Prestige and Rank movement (before → after, not just current
values), a rival highlight (whoever had the single best release that year), anything
newly unlocked (crossing the International/Legal/Going-Public thresholds), and next
year's Season Goal — genuinely gathered from data that already exists elsewhere,
not duplicated.

**Two real bugs caught while building this, both from the same root cause** — a
year-turnover system needs its counter initialized at the *moment a studio is founded*
(when `processedWeek` is still 0), not lazily on the first weekly tick (when it's
already 1). Miss that and the first year-end fires a full year late. Season Goals and
Awards already got this right; the new Season Finale code didn't, at first — caught by
literally counting the year number on screen after a "Skip to Year End" test rather than
just checking that a modal opened. A modal appearing proves the code ran, not that it
ran with the right number in it. Second bug, same family: whether you capture "which
year just completed" *before* or *after* incrementing the year counter matters — get it
backwards and everything is labeled one year behind. Both fixed to match the exact
pattern `checkAwards()` already used correctly.

Verified: personalities showing correctly per studio and surviving a reorg-eligible
long run, the challenge lifecycle, two consecutive year-turnovers each showing the
correct year number, the full Awards → Finale chain, state surviving save/load, the
full stress suite (now also dismissing the Finale modal, which didn't exist when that
script was first written), and the balance test at 30 trials — zero Bombs.

**All five priorities from the original brief are now complete.**

## What's new in this revision: Left-Aligned Layout on Wide Screens

A small, targeted fix reported directly from a very wide monitor: `#app` was capped at
1800px and centered (`margin:0 auto`) — reasonable on a normal display, but on a wide
enough screen the leftover space gets split evenly on both sides, leaving a genuinely
large dead zone on the left that pushes the whole layout (including the new right-column
Rival Tracker) further right than it needs to be. Changed to `margin:0`, so the layout
now hugs the left edge (just the existing 20px body padding) and every bit of leftover
width on a wide screen accumulates on the right instead.

Verified with a direct measurement at a 2560px viewport (simulating the reported 32"
monitor scenario): left gap dropped to exactly the 20px body padding, with all 740px of
slack correctly landing on the right instead of splitting 370/370 down the middle. Also
confirmed no regression at narrow viewports — the left gap there is unchanged.

## What's new in this revision: Producer Negotiation

Gives a hired Producer's existing skill stat a real, visible moment instead of just a
silent background discount. Deliberately the lean version, after weighing a heavier
slider-and-walkout design against whether it was solving a real problem or just adding
a fourth way to save money alongside three that already existed (Producer's passive
discount, Multi-Picture Deals, and the SFX budget ceiling) — see the design discussion
in this session's history if you want the full reasoning.

- **One click, one moment, never a downside.** "🤝 Ask \[Producer] to Work the Deal"
  appears in the wizard's Team step once a real Producer is hired (hidden entirely for
  Self-Produced — there's no one to send into the room). Click it and each of Writer,
  Director, Composer (unless it's Library Music — nothing to negotiate on a flat
  licensing fee), and both Stars gets an independent roll: succeed and that person's
  fee drops 5–20%, fail and nothing changes. Worst case is exactly where the passive
  discount already had you.
- **The odds are genuinely about leverage.** Producer skill helps you; the *other
  person's* prestige helps them — a scrappy unproven writer folds easily, someone with
  real standing pushes back hard. A skilled Producer against a modest talent succeeds
  most of the time; a weak Producer against a big name rarely moves them at all.
- **Negotiation is keyed to the exact cast it was rolled for**, not tracked with a
  separate reset flag — change any one of the five people afterward and the old result
  simply stops matching, the button re-enables, and the result panel clears. One
  invalidation check, no listener to remember to wire up separately.

**A real bug caught immediately by testing the actual charge, not just the preview**:
the button's own click handler only refreshed its own little result panel — it never
told the budget summary or the Greenlight review to update, both of which live on a
*different* wizard step. Navigate forward after negotiating and you'd see stale,
pre-discount numbers right up until some unrelated field happened to change first. Fixed
by having the click handler explicitly trigger the same two render functions every other
field change already does. Confirmed by walking all the way through to the actual
cash charged at Greenlight and checking it matched the preview to the dollar, not just
checking that a number changed somewhere.

Verified: the button's visibility gated correctly on Self-Produced, a real negotiation
roll with a genuine mix of successes and failures, the budget summary and Greenlight
review updating immediately after negotiating, the actual charge at confirmation
matching the preview exactly, cast changes correctly invalidating a stale result, the
stress suite, and the balance test at 30 trials — zero Bombs.

## What's new in this revision: SFX Houses — Vendor Companies

The first "company" role in the game rather than an individual — special effects are no
longer just a budget slider, they're a real vendor negotiation. Writer, Director,
Composer, Producer, and Stars all stay exactly as they are (this was deliberately scoped
to SFX only, not a blanket change).

- **You propose a ceiling, the market responds** — the SFX slider is now "the most
  you're willing to pay," not a straight spend. Nine options respond live as you move
  it: eight real houses plus Practical Effects (In-House), the always-available
  fallback mirroring how Self-Produced and Library Music already work. A house whose
  real fee exceeds your ceiling doesn't just disappear — it shows disabled, stating
  exactly what it would need, so you're learning the market, not guessing at it.
- **Fees work exactly like every other role** — built from skill and prestige, no flat
  baseline, ranging from Practical Effects' $150K to Zenith Frame Works' $51.9M at
  their starting stats. Multi-picture deals and the fee-discount mechanic both apply to
  SFX houses automatically, since the discount already lives inside the fee function
  itself rather than being wired per-role.
- **A real Quality formula change** — SFX house skill is now a genuine 15% factor in
  Quality, not just the existing budget-to-genre balance score. Writer and Director
  dropped from 35%/35% to 30%/30% and the balance score from 20% to 15% to make room,
  without displacing them as the dominant factors. Re-verified at 30 trials post-change
  — still zero Bombs, though the mix shifted a little toward Break-Even, which tracks:
  the *default* path (no house explicitly chosen) now runs through Practical Effects'
  modest skill of 15 rather than getting a quality contribution from raw budget alone.
  That's the "you get what you pay for" tradeoff working as intended, not a regression.
- **Prestige evolves like Composer's** — a craft role judged mainly by critics, same
  formula, same immediate-streaming dampening, same permanent snapshot on the History
  detail view so past prestige doesn't drift with what the house is doing today.
- Browsable on the Talent tab under a new SFX Houses filter, same card layout as every
  other role, same deal-signing button.

**Two real bugs caught in testing, both worth remembering:**
- The dropdown wasn't wired into the shared input-listener list that drives budget
  summary and movie-card refreshes — picking a different house silently changed nothing
  on screen until some *other* field happened to change too. A UI element existing and
  being interactive isn't the same as it actually being connected to anything.
- **`sfxHouses` was never added to the save/load serialization at all** — signing a
  deal worked perfectly, then evaporated on reload. Found by actually testing the
  round-trip rather than assuming a new roster array would be swept up automatically
  the way it might be in a less explicit save system. Fixed in three places: the
  serializer, `setTalentRosters()`, and — easy to miss — `relinkMovieTalent()`, which
  re-links a movie's `sfxHouseRef` to the restored roster after load the same way it
  already did for `composerRef`/`producerRef`.

Verified: budget-gated qualify/decline logic at both a low and a high ceiling, live
selection actually updating the budget summary and Greenlight review, a complete
production cycle through settlement with the chosen house's name and prestige row
appearing correctly on the receipt, Talent tab crediting the right house with the right
film, the History detail view showing the house correctly, a deal surviving a full
save/load round-trip, the stress suite, and the balance test at 30 trials — zero Bombs.

**Next up, by design**: giving the Producer a budget to negotiate Writer, Director,
Composer, and Star fees — discussed and scoped, deliberately held until this shipped
clean rather than building two half-finished systems at once.

## What's new in this revision: UI Formatting & Layout Fixes

A batch of real, specific bugs reported with screenshots, plus a genuine layout gap on
wide screens. Each one verified with a measurement, not a visual guess.

- **Help modal text invisible in dark mode** — turned out to be pure staleness: the
  deployed site was still on `color:var(--ink)` for `.help-body p`, a theme-flipping
  variable, against the Help modal's fixed cream "paper" background — in dark mode
  `--ink` resolves to a light color, nearly invisible on light paper. My local sandbox
  already had the correct fix (`--paper-ink`, a non-theme-dependent color meant
  specifically for paper-styled content); confirmed by diffing the deployed CSS against
  local. **You'll need to push this zip for that fix to actually take effect.**
- **Wizard "Next" button overflowing past its container** — a real bug, not staleness.
  `.btn-primary` sets `width:100%`; inside the wizard's flex nav row with
  `flex:0 0 auto`, that 100% became the flex-basis, and `flex-shrink:0` meant it
  couldn't compress to fit alongside the Back button — pushing it past the panel edge.
  Fixed by giving buttons inside `.wizard-nav` their own `width:auto` override.
- **Light-mode button text contrast** — measured with an actual WCAG contrast-ratio
  script rather than eyeballing it: inactive tab and destination labels were sitting at
  3.9–4.3:1 against their panel backgrounds, below the 4.5:1 small text needs. Gave them
  a dedicated darker color in light mode specifically, rather than darkening the shared
  `--ink-dim` variable used elsewhere (which would have dimmed things — like hint text —
  that were already fine). Same audit caught a second, unreported case — the dark-mode
  Reset button at 3.23:1 — fixed alongside it.
- **Scrollbars crowding text** — the Help modal, Studio Prestige history list, and news
  feed all had little to no right-padding before their scrollbar, so content ran right
  up against it. All three now have real breathing room.
- **Too much unused space on wide screens** — the real structural one. `#app` was
  capped at `max-width:1400px` regardless of how wide the browser actually was, and nothing
  used the space beyond that. Widened the cap to 1800px, and added a genuine third
  column that activates above 1580px: a live Rival Tracker and a Recent Releases panel,
  both reading data that already exists (`aiStudios`, `player.moviesAll`) rather than
  tracking anything new. Below that width the column disappears entirely and the layout
  falls back to exactly what it was.
- **Found and removed an orphaned file** while re-running the static checker —
  `js/ui/confirm-dialog.js`, a `window.confirm()` replacement that was never actually
  wired up (no HTML, no DOM refs, nothing importing it). Harmless, but it was making the
  static-check output noisy for anyone who runs it later.

**A methodology note worth keeping**: my first pass at auditing button contrast used a
script that walked up the DOM for `background-color`, which doesn't see CSS gradients
or alpha-blended `rgba()` overlays — it flagged several buttons that are actually fine
(a solid gold gradient button and a semi-transparent nav background both read as
near-black to a naive check). Caught by computing contrast by hand against the actual
gradient stops and the properly alpha-blended color before trusting the "failures" — a
tool telling you something is broken is a reason to verify, not a reason to fix
something that isn't.

Verified: wide viewport (1900px) shows the new column with live data, narrow viewport
(900px) hides it with no layout break, the wizard button no longer overflows (confirmed
by direct pixel measurement, not eyeballing), contrast ratios recomputed correctly
post-fix, the full stress suite, and the balance test at 30 trials — zero Bombs.

## What's new in this revision: Talent Deals, Specialization, Passive-Income Visibility & Help

Four smaller, independent features, roughly in the order they were built:

### Multi-Picture Talent Deals
Sign any writer, director, producer, composer, or star to a 3-picture deal from the
Talent tab — a retainer (30% of their current fee, paid immediately) buys a 20% discount
on their fee for their next 3 times cast. The discount lives in the fee functions
themselves (`writerFee`, `directorFee`, etc. in `data/constants.js`), so every place a
fee is shown — casting dropdowns, the budget summary, the Greenlight review, the actual
charge — reflects it automatically and consistently, with nothing to keep in sync by
hand. The deal is a genuine bet: use all 3 slots and it's a real discount; sign someone
and only cast them once or twice and it costs more than not signing at all. That
asymmetry is the whole point — it's the "flexibility for savings" tradeoff, not a
strictly-better option.

**A real, slightly embarrassing bug caught while testing this**: after signing a deal,
the casting dropdowns kept showing the old, undiscounted fee — because `populateTalentSelects()`
had never been part of the general re-render cycle, only called once at studio founding
and after loading a save. This means dropdown fees have actually been quietly stale
since prestige-driven fee changes were first added, long before deals existed — just
not obviously wrong enough for anyone to notice until a 20% swing made it impossible to
miss. Fixed by adding it to `renderAll()`; confirmed safe to call every render since
`fillSelect()` already preserves whatever's currently selected.

### Genre Specialization
Every writer, director, and star now has a `specialty` genre, hand-assigned and spread
across all six genres rather than clustered. A specialist working in their own genre
gets a flat +8 to their effective skill/star power *for that picture only* — never a
penalty for working outside it, matching the game's existing pattern of rewarding
matches rather than punishing mismatches. Shows as a small gold star on the wizard's
cast avatars and as a line on the Talent tab. Along the way, fixed a related
inconsistency: the audience-score formula was mixing `movie.effStar1Power` (which
Production Events can modify) with `movie.star2.starPower` (which they couldn't) —
added a matching `movie.effStar2Power` field so both leads are treated the same way.

### Passive Income in the Weekly Summary
Long-tail licensing and franchise royalty payouts already logged to the news feed: now
they also get their own line in the Advance Week outcome summary (📼 Passive Income:
+$X) whenever a payout happens that tick, rather than being folded invisibly into the
overall Cash number or easy to miss in a longer news list.

### Help Section
A "❓ Help" button in the masthead opens a scrollable reference covering the core loop,
making a picture, random events, the shoot, box office, growing the studio, and season
goals — static content, no new rendering logic, just organized enough to actually
answer "what do I do now" for a game that's grown genuinely deep.

Verified: the full deal lifecycle (sign, discount visible everywhere, three uses,
correct expiration, survives save/load), specialization confirmed changing Quality/Hype
between genres and displaying correctly in both the wizard and Talent tab, the help
modal opening and closing cleanly, the full stress suite, and the balance test at 30
trials — zero Bombs.

## What's new in this revision: Movie Detail View

The History tab now shows a small genre-tinted poster thumbnail per row (reusing the
same `GENRE_GRADIENTS` the Greenlight wizard's movie card already uses — extracted into
`data/constants.js` so both share one definition) and a "View Details" button that
opens a complete production record for that picture.

- **Reuses more than it adds**: cast/crew, cost breakdown, revenue by source, and
  review quotes were already sitting on the stored movie object from the Settlement
  Receipt work — the detail modal (`js/ui/movie-detail.js`) mostly just re-renders data
  that already existed, in a permanently-browsable form instead of something you only
  saw once at release time.
- **Two genuinely new pieces of persistence** were needed:
  - **`movie.eventLog`** — every random event across the whole pipeline (the pre-shoot
    Production Event, each Shoot Event, the Post-Production Additional Photography
    event, and the Test Screening choice) now writes a permanent entry — phase, week,
    which choice, what happened — instead of only existing transiently in whichever
    ticker was showing it at the time.
  - **`movie.prestigeAtRelease`** — a snapshot of every credited person's prestige at
    the moment of settlement. Without this, the detail view would show *current*
    prestige for people who've since done other pictures, which isn't "their prestige
    on this film" at all — it's just whatever they're at today.
- Both handle older saves gracefully: a picture released before this update simply has
  no event log (shows a plain "not recorded" note) and falls back to current prestige
  for cast/crew, rather than erroring.

Verified: the full detail view checked end to end (poster, cast/crew with
prestige-at-release, the event log actually containing entries from Pre-Production,
Post-Production, and Test Screening), the same data confirmed surviving a save/load
round-trip, the full stress suite, and the balance test at 30 trials — zero Bombs.

## What's new in this revision: Destination Navigation (Priority 4 — complete)

Consolidates the 13-tab bar into 4 destinations, matching the brief's own grouping
exactly: **🎬 Productions** (Dashboard, Development), **🏛 Studio HQ** (Finance,
Research, Departments), **📈 Market** (Marketing, Distribution, International,
Competitors), **🎭 People** (Talent, Franchises, Awards, History).

- **Deliberately low-risk approach**: every existing tab-panel div and every
  `renderX()` function is completely untouched. This was a navigation-layer change
  only — the 13 old sub-tabs still exist exactly as before, just grouped under 4
  destination buttons that filter which ones are visible and auto-select the first
  one. Nothing about how any individual screen renders needed to change.
- **A real pre-existing gap fixed along the way**: the Objective Card, Season Goal,
  and Outcome Summary — built in Priority 1 as "the persistent command center" — were
  actually sitting *inside* the Dashboard tab-panel this whole time, meaning they
  disappeared the moment you viewed any other tab. They're now siblings of the
  destination nav itself, genuinely visible on every screen. Advance Week now works
  no matter which destination you're looking at, which is what "persistent" was
  always supposed to mean.
- **Locked destinations read as progression, not dead ends**: Research and
  International sub-tabs show a small padlock badge with a tooltip explaining exactly
  what unlocks them, reusing the same unlock checks (`player.moviesAll.length>=3`,
  `player.prestige>=40`) that already drove their in-tab banners — one more read site
  on data that was already being computed, not a second source of truth.

**If you're testing this with automation**: sub-tabs outside the default Productions
destination start with a `hidden` class and won't be clickable until their destination
is selected first. A script that clicks `[data-tab="finance"]` directly, without
clicking `[data-dest="studiohq"]` first, will find it not visible — exactly the bug
this caught in my own stress-test script's tab-cycling logic.

Verified: destination switching (sub-tabs filter correctly, first one auto-selects),
the Objective Card confirmed visible across every destination, both lock indicators
checked in their actual locked state, the full stress suite, and the balance test at
30 trials — zero Bombs.

**Priority 4 is now complete.** Priority 5 (rival personalities, medium-term goals, a
season-finale year-end recap) is the last one from the original brief.

## What's new in this revision: Reveal Moments (Priority 3, part 2 — complete)

Finishes Priority 3. The Settlement Receipt now leads with a hero reveal instead of
burying the verdict in the middle of a wall of line items:

- **Verdict badge moved to the top**, bigger, with a pop-in reveal animation — it's the
  first thing you see, not something you scroll to.
- **A "what caused this" line** (`generateCausalExplanation()` in `js/ui/reveal.js`) —
  picks the two most salient real factors (breakout, toxic word of mouth vs. certified
  fresh — handled as one coherent "critics/audience split" case rather than two
  contradictory bullet points when both are true at once, genre saturation/demand,
  quality, hype) and writes one sentence, so the same verdict can read differently
  release to release depending on what actually drove it.
- **Rank and prestige movement**, before → after, captured at the true start of
  settlement (`finalizeStreamingDeal()` snapshots `player.prestige` and rank before any
  of its own mutations run) — not recomputed after the fact, which would have shown the
  same number twice.
- **An animated Net Result counter** (`animateCounter`/`animateMoneyCounter` in
  `js/ui/reveal.js`) that counts up on an ease-out curve rather than snapping straight
  to its final value — and respects `prefers-reduced-motion`, jumping straight to the
  final number if the browser signals that preference, since a JS-driven
  `requestAnimationFrame` loop doesn't automatically honor the CSS media query the rest
  of the app already relies on for this.
- **Awards get a lighter matching touch** — any row where your own studio won gets a
  gold "🎉 YOUR STUDIO" flag with the same pop-in animation as the verdict badge.

**A bug in my own testing, not the game**: renaming the verdict badge's CSS class from
`.verdict-badge` to `.reveal-verdict-badge` silently broke my balance-verification
script's own verdict-reading selector — it started reporting every single trial as
"UNKNOWN" instead of catching a real regression. Caught immediately because 30/30
unreadable results is impossible to miss, but worth remembering: a rename that makes
sense for the app can just as easily break a test script quietly, and only surfaces if
you're actually watching the test's own output closely rather than just its pass/fail.

Verified: the full reveal sequence checked directly (verdict, causal line, rank/prestige
movement, counter animation actually completing), the 20-release stress suite, and the
balance test at 30 trials — zero Bombs once the test script itself was fixed.

**Priority 3 is now fully complete.** Priority 4 (tab consolidation into four
destinations) and Priority 5 (rival personalities, medium-term goals, a season-finale
year-end recap) remain open.

## What's new in this revision: Cinematic Decision Cards (Priority 3, part 1)

Every random decision in the game — the pre-shoot Production Event, the six Shoot
Events, Post-Production's Additional Photography event, and Test Screening's seven
responses — now renders through one shared visual system instead of four separate
bespoke modals.

- **`js/ui/decision-card.js`** — `renderDecisionCard()` and `renderDecisionOutcome()`,
  the two shared renderers everything above now calls. A kicker label, a big title, the
  flavor line, and choice cards each showing clear effect tags (cost, quality, morale,
  risk) pulled from structured data on the choice itself — not parsed out of
  description text, which would have been fragile.
  One choice per event can be marked `recommended: true` and gets a gold-highlighted
  card; Test Screening computes its own recommendation live, tagging whichever response
  actually targets that screening's weakest-scoring metric.
- **A "trade-headline" outcome moment** after every choice — a flash-icon checkmark and
  a punchy result line before continuing, replacing plain outcome paragraphs. Shoot
  Events didn't have this pause before at all (they used to resolve in one click); they
  do now, matching the other three systems.
- Retrofitting the event data (`production-events.js`, `shoot-events.js`,
  `post-production.js`, and `TEST_SCREENING_CHOICES` in `release-strategy.js`) with
  `tags`/`recommended`/`targets` metadata was most of the actual work here — the
  renderer itself is small precisely because the data now carries real structure
  instead of being reconstructed from prose each time.

**If you're testing this with automation**: the old `.event-choice-btn` class is gone,
replaced by `.decision-choice-btn`. Shoot Events now have an extra "continue" step after
the choice (matching the other three systems), so any script driving them needs to check
for `#eventContinueBtn` after clicking a choice, not just click once and move on.

Verified: every event type's card (kicker, title, tags, recommended highlight, outcome
flash) checked directly in a real browser, the full stress suite, and the balance test
at 30 trials — zero Bombs.

**Not yet built, still under Priority 3**: the results-side half of the brief — reveal
moments for box office, reviews, awards, and financial results (performance labels,
animated counters, rank/prestige movement, a "what caused this" explanation). That's
next, followed by Priority 4 (tab consolidation into four destinations) and Priority 5
(rival personalities, season-goal texture, and a year-end finale summary).

## What's new in this revision: Greenlight Journey Wizard (Priority 2)

The single long Green-Light form is now a guided 5-step flow — Story → Team → Plan →
Release → Review — with a persistent, live-updating movie card alongside it. Every
existing field kept its exact ID and behavior; this was a pure regrouping, not a rebuild.

- **`js/ui/wizard.js`** — step navigation (`goToStep`) and the movie card renderer
  (`renderMovieCard`). The card shows a genre-tinted poster, cast initials for
  writer/director/both leads, a continuous risk gauge (upgrading the old categorical
  Low/Moderate/High badge to a gradient bar with a marker), Quality/Hype, and budget/
  lead/release-window rows — all computed by the same `computeGreenlightPreview()` the
  actual Greenlight review modal uses, extracted out of `renderGreenlightReview()` so
  the two can never disagree.
- **Step 5 doesn't duplicate the Greenlight review** — its button just calls the
  existing `openGreenlightReview()`. The wizard gets you to the decision; the decision
  itself is still the same tested modal from the previous revision.
- The wizard resets to Step 1 automatically once a picture is actually greenlit, so the
  next picture starts fresh.

**If you're testing this with automation**: `releaseBtn` now lives inside Step 5's
panel, which is hidden until you click through Steps 1–4 (or click the four
`.wizard-next-btn` elements directly). A script that clicks `#releaseBtn` without
navigating the wizard first will find it not visible.

Verified: full navigation (forward, back, live card updates including watching the risk
gauge react to a real budget change), confirmed Step 5's button opens the exact same
Greenlight modal as before, confirmed the wizard resets correctly after a greenlight,
the 20-release stress suite, and the balance-critical test at 30 trials — zero Bombs
this pass.

**Not yet built**: Priorities 3–5 (cinematic event-card redesign, tab consolidation,
rival personalities and season finale) remain open.

## What's new in this revision: Command-Center Dashboard (Priority 1)

The biggest change in this revision: **time no longer advances on its own.** Every week,
in every phase — filming, in theaters, or idle — only moves forward when the player
clicks **Advance Week**, or Fast Forward loops that same click automatically. The old
1-second auto-tick timers on both the Shoot and the Box Office ticker are gone.

- **`js/ui/objective.js`** — derives "what's happening right now" from existing state
  (no new state to keep in sync: reads `game.currentShoot`, `game.currentRun`, cash,
  and whether a decision modal is open) and renders the Objective Card at the top of
  the Dashboard: an icon, a one-line status, and a single primary action button that's
  either Advance Week or "Go to Development," depending on phase.
- **`js/flow/turn-flow.js`** — `advanceWeek()`, the single dispatcher every phase's
  "next week" now goes through. It figures out which system owns the current week
  (shoot, box office, or idle), runs exactly one week of it, and shows an Outcome
  Summary (cash change, prestige change, up to 3 relevant news lines) after.
- **`js/systems/season-goals.js`** — one goal per game-year (a prestige threshold, a
  profit target, a release count, or beating a named rival's cash), tracked in
  `game.seasonGoal`, evaluated and replaced automatically on year turnover via the same
  shared weekly tick Awards already uses. Persists through save/load.
- The Now Filming and Now Showing panels, and Fast Forward on both, are unchanged and
  still there below the Objective Card — nothing was removed, only added on top.

**A real bug worth knowing about if you touch this area:** the Objective Card's Advance
Week button disables itself whenever a decision modal (Production Event, Shoot Event,
Post-Production, Test Screening, Greenlight) is open, since there's nothing to advance
past yet. Getting this right meant putting `renderObjectiveCard()` immediately after
every single place one of those four modals shows or hides — not just "somewhere nearby"
in the surrounding function, which is where the first attempt at this went wrong (the
render landed a few lines before the modal actually closed, and the button stayed
stuck disabled). If you add a new decision modal, follow the same pattern: call
`renderObjectiveCard()` at the exact line the modal's hidden class toggles, not before
or after other logic in the same function.

Verified: a full playthrough clicking Advance Week through every phase (with explicit
checks that waiting after a single click never produces a second, unrequested week), the
full 20-release stress suite, and the balance-critical default-path test (30 trials this
time given the stakes of touching the core loop — 1 Bomb, ~97% Break-even-or-better,
consistent with intentional variance rather than the systemic failure the original
balance fix addressed).

**Not yet built** — Priorities 2 through 5 from the brief (the guided Greenlight wizard,
cinematic event-card redesign, tab consolidation into four destinations, and rival
personalities/season-finale recap) are still open, by design — the brief asked for
Priority 1 only, one phase at a time.

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
