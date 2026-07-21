// ===== Help Mode Content =====
// Detailed, always-available help text for every major control, derived from the
// Studio Manual. Each topic is keyed by an id and carries:
//   selectors: tried in order, first VISIBLE match gets the (i) marker
//   title:     popover heading
//   html:      popover body (small, trusted, hand-written strings only)
//
// This is deliberately a pure data module — no DOM, no imports — so helpmode.js
// stays the only file that touches the page, mirroring the tutorial.js split.

export var HELP_TOPICS = [

  // ---- Masthead / sidebar ----
  {
    id: 'prestige_meter',
    selectors: ['#prestigePanel h2'],
    title: 'Studio Prestige',
    html: 'Your studio\u2019s reputation, 0\u2013100, across five tiers from Poverty Row to Legendary Studio. It moves after every release (a commercial component from ROI plus a reviews component from your scores) and gates the later game: International at 40, Legal at 60, going public at 70. Bombs cost more prestige at bigger tiers \u2014 the board expects better.'
  },
  {
    id: 'calendar_skip',
    selectors: ['#skipWeeksBtn', '#skipWeeksSelect'],
    title: 'Skipping Weeks',
    html: 'The only way to pass time without releasing a picture \u2014 let a scheduled release date arrive, or reach next year\u2019s awards. <b>Overhead and loan payments keep charging every skipped week</b>, so idle time is never free.'
  },

  // ---- Development: script ----
  {
    id: 'script_dev',
    selectors: ['#synopsisInput'],
    title: 'Script Development (Optional)',
    html: 'Write or paste a 50\u2013500 word synopsis and analyze it for a second, independent lever on reception. Skipping is perfectly neutral \u2014 a skipped script never hurts you. The analysis is <i>concept-based, not length-based</i>: it looks for genre-distinctive language, emotional interiority, world-building and spectacle, and it explicitly penalizes stock phrases like \u201cthe chosen one.\u201d One warning: if your written genre and your chosen genre don\u2019t match, both critics and audience take a penalty.'
  },
  {
    id: 'rewrites',
    selectors: ['#rewriteOptionsList'],
    title: 'Rewrites',
    html: 'Each rewrite can be used once per script, costs tier-scaled money, and costs a real week of development time (overhead still ticks). Every one is a tradeoff \u2014 Increase Action buys +12 Commercial Appeal but \u22126 Character Depth and +10 Production Complexity. Only Improve Pacing has no downside.'
  },

  // ---- Wizard step 1 ----
  {
    id: 'genre',
    selectors: ['#genreSelect'],
    title: 'Genre',
    html: 'Every genre has its own audience demand (which drifts year to year), its own ideal SFX-to-budget ratio, runtime sweet spot, and rating fit \u2014 and its own current market saturation. Piling into a genre everyone is flooding eats up to 15 points of Hype. Check the Genre Tracker before committing: <b>high demand + low saturation</b> is the read you want.'
  },
  {
    id: 'tagline',
    selectors: ['#movieTaglineInput'],
    title: 'Title & Tagline',
    html: 'Not just flavor \u2014 the reviews system reads your title and tagline for genre fit, and it feeds the Audience score. A Horror picture with a rom-com tagline reads as confused marketing.'
  },

  // ---- Wizard step 2 ----
  {
    id: 'fees',
    selectors: ['#writerSelect'],
    title: 'How Fees Work',
    html: 'A fee is purely skill/star-power plus current prestige \u2014 no hidden base cost, which is why the walk-on tier bottoms out near $25k. Prestige (and so fees) moves after every release on two axes: commercial ROI, and reception \u2014 <b>craft roles (writer, director, composer) are judged by critics; stars by the audience</b>. A star can gain prestige on a financial bomb the audience loved. A \u2605 marks a genre specialist: same fee, better work.'
  },
  {
    id: 'composer',
    selectors: ['#composerSelect'],
    title: 'Composer vs. Library Music',
    html: 'Library Music is a flat $25,000 licensing fee with a modest virtual skill of 15 \u2014 clearly below even the cheapest hired composer. It\u2019s a real quality tradeoff, not a free lunch: noticeably cheaper, noticeably less polished, and it never gains or loses prestige because there\u2019s no person behind it.'
  },
  {
    id: 'negotiate',
    selectors: ['#negotiateBtn'],
    title: 'Producer Negotiation',
    html: 'One click asks your producer to work the whole deal sheet. A skilled producer also softens the dollar cost of whatever Production Event hits you later \u2014 never the luck, just the bill.'
  },

  // ---- Wizard step 3 ----
  {
    id: 'sfx',
    selectors: ['#sfxRange'],
    title: 'Special Effects Budget',
    html: 'Every genre has an ideal ratio of SFX spend to total production spend \u2014 Sci-Fi and Action want a lot, Drama wants very little. Matching it measurably improves both Quality and Critics score; badly mismatching it (a huge effects budget on a Drama) hurts both. Money alone never guarantees success here.'
  },
  {
    id: 'marketing_budget',
    selectors: ['#marketingRange'],
    title: 'Marketing Budget & Hype',
    html: 'Marketing drives Hype, which drives opening weekend. Channels multiply it: checking all four gives up to 1.1\u00d7, checking none caps you at 0.7\u00d7. Saturation and a badly-timed strategy window subtract from it. The Marketing tab documents the exact formula.'
  },
  {
    id: 'theaters',
    selectors: ['#theaterRange'],
    title: 'Target Theater Count',
    html: '100 to 4,000 screens \u2014 but your Release Strategy can override it (Limited books 22%, Summer Blockbuster 105%), and a badly-fitting MPAA rating for your genre directly shrinks how many screens will book you.'
  },
  {
    id: 'runtime',
    selectors: ['#runtimeRange'],
    title: 'Runtime',
    html: 'Every genre has a sweet spot \u2014 Action and Sci-Fi want roughly two hours, Comedy and Horror closer to 100 minutes, Drama can run longest. Landing near it nudges Quality and Audience score up; missing badly nudges both down. Runtime also feeds your shoot length: 2\u201312 weeks, and a big picture cannot be rushed out next week.'
  },
  {
    id: 'rating',
    selectors: ['#ratingSelect'],
    title: 'MPAA Rating',
    html: 'Fit varies sharply by genre \u2014 R suits Horror almost perfectly (100%) and Animation almost not at all (10%). A poor fit doesn\u2019t just cost Audience score: it directly shrinks your effective theater count.'
  },
  {
    id: 'festival',
    selectors: ['#festivalSelect'],
    title: 'Festival Premiere',
    html: 'The submission fee is paid immediately at green-light, <b>whether or not you\u2019re accepted</b> \u2014 a real risk, not a hidden tax. Acceptance runs roughly 40\u201360% by festival; a win buys Critics, Hype, and (Autumn International) Awards Potential.'
  },

  // ---- Wizard step 4 ----
  {
    id: 'strategy',
    selectors: ['#strategySelect'],
    title: 'Release Strategy',
    html: 'Wide is the baseline. Limited books 22% of theaters at 1.6\u00d7 per-screen with much better legs and +12 awards edge. Platform starts at 25% and expands over four weeks. Holiday, Summer, and Awards Season each want a specific window: hit it for roughly <b>+12 Hype</b>, miss it for roughly <b>\u221215</b> \u2014 no partial credit, and the calendar preview tells you in advance which you\u2019ll get.'
  },
  {
    id: 'schedule',
    selectors: ['#scheduleRange'],
    title: 'Scheduling Ahead',
    html: '0\u201352 weeks out. While you wait, overhead and loans keep charging and rivals keep operating. The preview flags holidays, Summer/Awards windows, your genre\u2019s current saturation, and a genuinely approximate read on rival activity \u2014 rivals decide week to week, so the warning is an estimate, not a guarantee.'
  },

  // ---- Wizard step 5 ----
  {
    id: 'budget_summary',
    selectors: ['#budgetSummaryBody'],
    title: 'The Budget Summary',
    html: 'Your whole picture before you commit: total spend, projected Quality and Hype, and a risk read. If the total exceeds cash on hand, the game will ask you to confirm going into debt rather than refusing \u2014 heavy overhead can never soft-lock you out of producing.'
  },

  // ---- Modals ----
  {
    id: 'production_event',
    selectors: ['#eventBody'],
    title: 'Production Events',
    html: 'Exactly one random event fires before cameras roll, drawn from a pool of four, and every option costs something \u2014 cash, stats, or a gamble. There is no secretly correct answer. Effects marked \u201cthis film only\u201d never touch the persistent roster; only Diva Antics\u2019 rewrite permanently costs the director prestige.'
  },
  {
    id: 'test_screening',
    selectors: ['#testScreeningChoices'],
    title: 'Test Screenings',
    html: 'The focus group flags your weakest metric, and each paid fix targets specific scores \u2014 but lands only 65\u201380% of the time. The rest of the time it backfires on a different metric, and there\u2019s no way to see which before you commit. Sometimes the audience is wrong: Release As-Is is free and often correct.'
  },
  {
    id: 'streaming',
    selectors: ['#streamingPlatformSelect'],
    title: 'Streaming Deals',
    html: 'NetFlix pays a guaranteed lump sum off gross and Audience score. Prime Video pays a 4-week royalty curve that compounds with Quality \u2014 genuinely exponential for a good picture. CultStream pays a flat $2M, only for the critically-adored flop (Critics 80+, gross under $5M). An <b>immediate</b> window adds +20% cash but halves any positive prestige gain.'
  },

  // ---- Dashboard ----
  {
    id: 'now_showing',
    selectors: ['#nowShowingContent'],
    title: 'Reading the Box Office',
    html: 'Opening weekend = Hype \u00d7 theaters \u00d7 Quality; a rival opening in your genre the same week takes 15\u201335% off it. After that it\u2019s legs: Certified Fresh (critics 75+) slows weekly decay ~10%, Toxic Word of Mouth (audience under 40) doubles it. Watch for \ud83d\udcc8 momentum \u2014 an underperforming gem can build instead of fade \u2014 and the \ud83c\udf1f Breakout badge, which guarantees momentum for weeks 2\u20135 and hands the least-known credited person 22\u201332 bonus Prestige at settlement.'
  }
];
