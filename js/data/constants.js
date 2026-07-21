export function rand(min,max){ return Math.random()*(max-min)+min; }

export function randInt(min,max){ return Math.floor(rand(min,max+1)); }

export function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }

export function round10k(n){ return Math.round(n/10000)*10000; }

export function formatMoney(n){
    var neg = n<0;
    var abs = Math.abs(Math.round(n));
    var s = '$'+abs.toLocaleString('en-US');
    return neg ? '-'+s : s;
  }

export function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

export var uidCounter = 1;

export function uid(){ return 'm'+(uidCounter++); }

export var GENRES = ['Action','Animation','Comedy','Drama','Horror','Sci-Fi'];

// Single source of truth for genre color identity — the poster gradient (below),
// the app-icon-style genre badge (js/ui/genre-badges.js), the Genre Tracker, and
// the History thumbnails all draw from these same three stops per genre, so a
// lightening or re-tint only ever needs to happen in one place.
export var GENRE_COLORS = {
  'Action':    { light:'#e8b184', mid:'#c9752f', dark:'#7a3f18' },
  'Animation': { light:'#8fe0c2', mid:'#3f9c78', dark:'#1f4a38' },
  'Comedy':    { light:'#cdb0e8', mid:'#8a5fc2', dark:'#4a2f80' },
  'Drama':     { light:'#e8a8ae', mid:'#b0424a', dark:'#601820' },
  'Horror':    { light:'#4a3540', mid:'#241a26', dark:'#0a060c' },
  'Sci-Fi':    { light:'#a8e4e8', mid:'#4fb8c2', dark:'#1e6b76' }
};

// Brighter, more premium-feeling poster gradients — the old set was a single dark
// tone per genre (near-black for everything) which read as a flat slab, especially
// in light theme where nothing separated it from the page. Same GENRES keys, so
// every existing consumer (wizard preview, movie-detail modal, History thumbnails)
// picks this up automatically.
export var GENRE_GRADIENTS = {};
GENRES.forEach(function(g){
  var c = GENRE_COLORS[g];
  GENRE_GRADIENTS[g] = 'linear-gradient(160deg, '+c.light+', '+c.mid+' 55%, '+c.dark+')';
});

export var GENRE_SFX_IDEAL = { 'Action':0.65, 'Sci-Fi':0.7, 'Horror':0.45, 'Comedy':0.2, 'Drama':0.15, 'Animation':0.6 };

export var GENRE_RUNTIME_SWEET_SPOT = { Action:125, Animation:100, Comedy:100, Drama:130, Horror:100, 'Sci-Fi':130 };

export function runtimeFitScore(runtimeMin, genre){
    var ideal = GENRE_RUNTIME_SWEET_SPOT[genre]||115;
    return clamp(100-Math.abs(runtimeMin-ideal)*1.2, 0, 100);
  }

export var RATING_GENRE_FIT = {
    'G': {Action:0.30, Animation:1.00, Comedy:0.70, Drama:0.50, Horror:0.05, 'Sci-Fi':0.50},
    'PG': {Action:0.60, Animation:0.90, Comedy:0.85, Drama:0.70, Horror:0.20, 'Sci-Fi':0.75},
    'PG-13': {Action:1.00, Animation:0.50, Comedy:0.85, Drama:0.85, Horror:0.60, 'Sci-Fi':1.00},
    'R': {Action:0.75, Animation:0.10, Comedy:0.60, Drama:0.90, Horror:1.00, 'Sci-Fi':0.65}
  };

export var DEMOGRAPHIC_GENRE_FIT = {
    'Kids & Family': {Action:0.30, Animation:1.00, Comedy:0.60, Drama:0.20, Horror:0.00, 'Sci-Fi':0.50},
    'Teens': {Action:0.80, Animation:0.50, Comedy:0.80, Drama:0.50, Horror:0.70, 'Sci-Fi':0.80},
    'Young Adults': {Action:0.90, Animation:0.40, Comedy:0.80, Drama:0.70, Horror:0.90, 'Sci-Fi':0.90},
    'Adults': {Action:0.70, Animation:0.30, Comedy:0.70, Drama:1.00, Horror:0.60, 'Sci-Fi':0.70},
    'General Audience': {Action:0.85, Animation:0.80, Comedy:0.90, Drama:0.75, Horror:0.40, 'Sci-Fi':0.85}
  };

export var FESTIVALS = [
    { id:'none', name:'No Festival Premiere', costBase:0, acceptanceBase:1.0, criticsBoost:0, hypeBoost:0, awardsBoost:0 },
    { id:'cascade', name:'Cascade Film Festival', costBase:80000, acceptanceBase:0.55, criticsBoost:6, hypeBoost:4, awardsBoost:0 },
    { id:'goldenreel', name:'Golden Reel Festival', costBase:120000, acceptanceBase:0.6, criticsBoost:4, hypeBoost:8, awardsBoost:0 },
    { id:'lakeside', name:'Lakeside Independent Festival', costBase:60000, acceptanceBase:0.5, criticsBoost:8, hypeBoost:2, awardsBoost:2 },
    { id:'autumn', name:'Autumn International Festival', costBase:150000, acceptanceBase:0.4, criticsBoost:10, hypeBoost:3, awardsBoost:6 }
  ];

export function computeProductionWeeks(runtimeMin, story){
    var runtimeWeeks = Math.round(Math.max(0, runtimeMin-90)/25);
    var complexityWeeks = story ? Math.round(story.productionComplexity/25) : 1;
    return clamp(2+runtimeWeeks+complexityWeeks, 2, 12);
  }

export var GENRE_KEYWORDS = {
    'Action':['strike','fury','war','protocol','vendetta','impact','fire','steel','battle','rogue'],
    'Sci-Fi':['space','star','quantum','future','robot','galaxy','horizon','signal','orbit','void'],
    'Horror':['dead','blood','night','fear','haunt','curse','dark','hollow','whisper','shadow'],
    'Comedy':['wedding','disaster','crazy','love','family','trip','awkward','chaos','oops'],
    'Drama':['life','heart','last','silence','goodbye','home','river','season','letter','harbor'],
    'Animation':['adventure','friends','magic','journey','tiny','brave','wonder','critters','kingdom']
  };

export var writers = [
    {id:'w1', name:'Jordan Blake', skill:55, prestige:50, specialty:'Comedy'},
    {id:'w2', name:'Morgan Vale', skill:70, prestige:55, specialty:'Drama'},
    {id:'w3', name:'Priya Anand', skill:85, prestige:65, specialty:'Drama'},
    {id:'w4', name:'Sam Whitfield', skill:45, prestige:40, specialty:'Horror'},
    {id:'w5', name:'Elena Cross', skill:90, prestige:70, specialty:'Sci-Fi'},
    {id:'w6', name:'Devon Osei', skill:60, prestige:50, specialty:'Action'},
    {id:'w7', name:'Casey Lindgren', skill:30, prestige:25, specialty:'Comedy'},
    {id:'w8', name:'Noah Brightwater', skill:22, prestige:18, specialty:'Horror'},
    {id:'w9', name:'Imani Osei', skill:38, prestige:30, specialty:'Animation'},
    {id:'w10', name:'Pip Sorensen', skill:1, prestige:0, specialty:'Action'},
    {id:'w11', name:'Zoe Park', skill:3, prestige:2, specialty:'Sci-Fi'},
    {id:'w12', name:'Eli Fontaine', skill:5, prestige:2, specialty:'Comedy'}
  ];

export var directors = [
    {id:'d1', name:'Frank Castellan', skill:65, prestige:55, specialty:'Action'},
    {id:'d2', name:'Ridley Hoffman', skill:88, prestige:75, specialty:'Drama'},
    {id:'d3', name:'Ava Kwan', skill:72, prestige:60, specialty:'Sci-Fi'},
    {id:'d4', name:'Marcus Feld', skill:50, prestige:45, specialty:'Comedy'},
    {id:'d5', name:'Nina Ostrowski', skill:80, prestige:65, specialty:'Horror'},
    {id:'d6', name:'Terry Boone', skill:58, prestige:48, specialty:'Animation'},
    {id:'d7', name:'Ruth Ambrose', skill:35, prestige:28, specialty:'Drama'},
    {id:'d8', name:'Theo Marsh', skill:24, prestige:20, specialty:'Action'},
    {id:'d9', name:'Greta Solano', skill:40, prestige:32, specialty:'Comedy'},
    {id:'d10', name:'Nadia Colt', skill:1, prestige:0, specialty:'Horror'},
    {id:'d11', name:'Bianca Ortiz', skill:2, prestige:2, specialty:'Sci-Fi'},
    {id:'d12', name:'Sully Vance', skill:3, prestige:3, specialty:'Animation'}
  ];

export var stars = [
    {id:'s1', name:'Blake Sterling', starPower:90, prestige:80, specialty:'Action'},
    {id:'s2', name:'Isla Monroe', starPower:85, prestige:78, specialty:'Drama'},
    {id:'s3', name:'Derek Nova', starPower:60, prestige:55, specialty:'Sci-Fi'},
    {id:'s4', name:'Zara Quinn', starPower:75, prestige:68, specialty:'Comedy'},
    {id:'s5', name:'Owen Marsh', starPower:50, prestige:45, specialty:'Horror'},
    {id:'s6', name:'Talia Frost', starPower:95, prestige:88, specialty:'Drama'},
    {id:'s7', name:'Cole Bishop', starPower:45, prestige:40, specialty:'Action'},
    {id:'s8', name:'Rosa Delgado', starPower:68, prestige:58, specialty:'Animation'},
    {id:'s9', name:'Wren Castillo', starPower:30, prestige:22, specialty:'Comedy'},
    {id:'s10', name:'Milo Finch', starPower:20, prestige:15, specialty:'Sci-Fi'},
    {id:'s11', name:'Priya Deshmukh', starPower:38, prestige:28, specialty:'Horror'},
    {id:'s12', name:'Reggie Voss', starPower:0, prestige:2, specialty:'Action'},
    {id:'s13', name:'Mabel Trent', starPower:1, prestige:1, specialty:'Drama'},
    {id:'s14', name:'Otis Dray', starPower:2, prestige:1, specialty:'Comedy'}
  ];

export var LIBRARY_MUSIC = { id:'library', name:'Library Music (No Composer)', skill:15, prestige:5, isLibrary:true };

export var composers = [
    {id:'c1', name:'Julian Voss', skill:92, prestige:78},
    {id:'c2', name:'Mireille Chevalier', skill:85, prestige:70},
    {id:'c3', name:'Desmond Okafor', skill:78, prestige:62},
    {id:'c4', name:'Priya Ramanathan', skill:62, prestige:48},
    {id:'c5', name:'Lars Eriksson', skill:55, prestige:42},
    {id:'c6', name:'Nadia Ferreira', skill:45, prestige:32},
    {id:'c7', name:'Toby Sharpe', skill:32, prestige:24},
    {id:'c8', name:'Ingrid Sol', skill:20, prestige:14}
  ];

export function composerFee(c){
    if(c.isLibrary) return 25000;
    return dealAdjust(round10k(c.skill*20000 + c.prestige*9000), c);
  }

export function getComposerById(id){
    if(id===LIBRARY_MUSIC.id || !id) return LIBRARY_MUSIC;
    return composers.filter(function(c){ return c.id===id; })[0] || LIBRARY_MUSIC;
  }

// SFX Houses work like every other role — a fee formula built from skill and prestige,
// prestige that evolves after every release. The one real difference: you propose a
// budget ceiling first, and only houses whose fee fits under it are available — a
// house whose fee exceeds your ceiling doesn't show as "too expensive," it declines
// and states what it would actually need, the same information either way.
export var PRACTICAL_EFFECTS = { id:'practical', name:'Practical Effects (In-House)', skill:15, prestige:8, isPractical:true };
export var sfxHouses = [
    {id:'x1', name:'Sparkhouse VFX', skill:18, prestige:12},
    {id:'x2', name:'Backlot Digital', skill:32, prestige:22},
    {id:'x3', name:'Ferrous FX', skill:45, prestige:35},
    {id:'x4', name:'Pixel Foundry', skill:58, prestige:48},
    {id:'x5', name:'Nightshade Visual', skill:68, prestige:58},
    {id:'x6', name:'Aurora Motion Pictures', skill:78, prestige:68},
    {id:'x7', name:'Monolith Digital Arts', skill:88, prestige:78},
    {id:'x8', name:'Zenith Frame Works', skill:96, prestige:90}
  ];

export function sfxHouseFee(h){
    if(h.isPractical) return 150000;
    return dealAdjust(round10k(h.skill*400000 + h.prestige*150000), h);
  }

export function getSfxHouseById(id){
    if(id===PRACTICAL_EFFECTS.id || !id) return PRACTICAL_EFFECTS;
    return sfxHouses.filter(function(h){ return h.id===id; })[0] || PRACTICAL_EFFECTS;
  }

export var SELF_PRODUCED = { id:'self', name:'Self-Produced (No Producer)', skill:15, prestige:5, isSelf:true };

export var producers = [
    {id:'p1', name:'Grace Okonkwo', skill:92, prestige:80},
    {id:'p2', name:'Victor Aldana', skill:84, prestige:72},
    {id:'p3', name:'Simone Laurent', skill:76, prestige:64},
    {id:'p4', name:'Owen Kaminski', skill:60, prestige:48},
    {id:'p5', name:'Bea Whitfield', skill:52, prestige:40},
    {id:'p6', name:'Marcus Idowu', skill:42, prestige:30},
    {id:'p7', name:'Talia Novak', skill:28, prestige:22},
    {id:'p8', name:'Cole Higgins', skill:16, prestige:12}
  ];

export function producerFee(t){
    if(t.isSelf) return 20000;
    return dealAdjust(round10k(t.skill*22000 + t.prestige*11000), t);
  }

export function getProducerById(id){
    if(id===SELF_PRODUCED.id || !id) return SELF_PRODUCED;
    return producers.filter(function(p){ return p.id===id; })[0] || SELF_PRODUCED;
  }

// A skilled producer's two jobs: negotiate better overall deals (shaves a bit off
// everyone else's combined fee) and manage risk on set (softens the dollar cost of
// Production Events without touching their random outcomes). Both scale with skill and
// both max out well short of "free" — a producer helps, it doesn't replace budgeting.
export function producerFeeDiscount(t){
    return (t.skill/100) * 0.15; // up to 15% off combined writer/director/composer/star fees
  }

// The passive discount above always applies quietly in the background. This is the
// active version — a one-time, no-risk roll per person the Producer works, called once
// when the player clicks "Ask the Producer to Work the Deal." A skilled Producer
// against a low-prestige person succeeds often; a weak Producer against someone with
// real standing rarely moves them. Never a downside — a failed roll just means no
// extra discount on top of what the Producer's passive skill already provides.
export function rollProducerNegotiation(producer, roles){
    var results = {};
    var lines = [];
    roles.forEach(function(r){
      var successChance = clamp(0.35 + producer.skill/100*0.50 - r.person.prestige/100*0.35, 0.05, 0.9);
      var succeeded = Math.random() < successChance;
      var pct = succeeded ? clamp(0.05 + producer.skill/100*0.10 + rand(-0.02,0.02), 0.02, 0.20) : 0;
      results[r.key] = pct;
      lines.push({ key:r.key, name:r.person.name, succeeded:succeeded, pct:pct });
    });
    return { results:results, lines:lines };
  }

export function producerRiskReduction(t){
    return (t.skill/100) * 0.30; // up to 30% off Production Event dollar costs
  }

// A modest, additive nudge for this film only — matches the game's existing pattern
// (Script Development, Runtime/Rating fit, etc.) of never punishing a mismatch, only
// rewarding a genuine match. Type-casting is a real thing; a horror specialist gets no
// worse for shooting a comedy, just no better.
export var SPECIALTY_BONUS = 8;
export function applySpecialtyBonus(baseValue, person, genre){
    return (person && person.specialty===genre) ? baseValue+SPECIALTY_BONUS : baseValue;
  }

export var TITLE_WORDS = {
    'Action': {adj:['Steel','Crimson','Rogue','Blackout','Iron','Fractured','Last'], noun:['Protocol','Strike','Vendetta','Fallout','Reckoning','Impact','Directive']},
    'Sci-Fi': {adj:['Nova','Quantum','Void','Helix','Orbital','Synthetic'], noun:['Horizon','Genesis','Drift','Signal','Continuum','Ascension']},
    'Horror': {adj:['Hollow','Midnight','Withered','Grim','Silent','Unseen'], noun:['House','Hollow','Ritual','Nursery','Descent','Whisper']},
    'Comedy': {adj:['Accidental','Totally','Slightly','Unexpected','Barely'], noun:['Wedding','Roommates','Disaster','Reunion','Road Trip','Internship']},
    'Drama': {adj:['The Last','A Quiet','Beyond the','After the'], noun:['Harbor','Goodbye','Season','River','Silence','Letter']},
    'Animation': {adj:['Wondrous','Tiny','Great','Feather','Sparkle','Runaway'], noun:['Adventure','Kingdom','Journey','Critters','Carnival','Expedition']}
  };

export function generateMovieTitle(genre){
    var bank = TITLE_WORDS[genre];
    var a = bank.adj[randInt(0,bank.adj.length-1)];
    var n = bank.noun[randInt(0,bank.noun.length-1)];
    return a+' '+n;
  }

export var AI_FIRST = ['Alex','Jamie','Taylor','Morgan','Riley','Casey','Drew','Reese','Skyler','Rowan','Quinn','Harper','Devon','Sasha'];

export var AI_LAST = ['Reyes','Chen','Okafor','Novak','Bianchi','Larsen','Petrov','Silva','Nakamura','Callahan','Voss','Marsh','Ibarra','Kowalski'];

export function pickAIName(){
    return AI_FIRST[randInt(0,AI_FIRST.length-1)]+' '+AI_LAST[randInt(0,AI_LAST.length-1)];
  }

export var DEAL_DISCOUNT = 0.20;
export var DEAL_RETAINER_RATE = 0.30;
export var DEAL_PICTURE_COUNT = 3;
// A signed deal discounts every fee lookup automatically — dropdown labels, budget
// summary, the Greenlight review, and the actual commitment all read the same
// discounted number, since they all call these same functions. Nothing needed to
// change at each of those call sites individually.
function dealAdjust(base, t){
  return (t && t.dealsRemaining>0) ? round10k(base*(1-DEAL_DISCOUNT)) : base;
}
// The retainer is priced off the person's CURRENT fee at signing time — a flat cost,
// paid once, regardless of how their price moves afterward. Whether that turns out to
// be a bargain or a waste depends entirely on whether you actually use all three slots.
export function dealRetainerCost(person, currentFee){
  return round10k(currentFee*DEAL_RETAINER_RATE);
}
export function signTalentDeal(person){
  person.dealsRemaining = DEAL_PICTURE_COUNT;
}
// Called once a person is actually cast on a greenlit picture — consumes one slot of
// an active deal, if they have one. The discount was already reflected in the fee they
// were cast at; this just counts down toward the deal running out.
export function consumeDealSlot(person){
  if(person && person.dealsRemaining>0){ person.dealsRemaining--; }
}
export function writerFee(t){ return dealAdjust(round10k(t.skill*25000 + t.prestige*10000), t); }

export function directorFee(t){ return dealAdjust(round10k(t.skill*30000 + t.prestige*12000), t); }

export function starFee(t){ return dealAdjust(round10k(t.starPower*45000 + t.prestige*16000), t); }

export var STUDIO_TIERS = [
    { id:'tiny', name:'Tiny Independent', cash:5000000, prestige:15, overhead:15000, expectation:0.6,
      blurb:'A shoestring outfit chasing festival buzz. Nobody expects much \u2014 which means nobody\u2019s watching too closely either.' },
    { id:'indie', name:'Independent', cash:25000000, prestige:35, overhead:45000, expectation:0.8,
      blurb:'A real production slate and a real office. Modest expectations, modest overhead.' },
    { id:'regional', name:'Regional Studio', cash:75000000, prestige:50, overhead:120000, expectation:1.0,
      blurb:'An established name with a real payroll to meet every week, rain or shine.' },
    { id:'growing', name:'Growing Studio', cash:150000000, prestige:60, overhead:260000, expectation:1.2,
      blurb:'Investors are paying attention now. A flop stings more than it used to.' },
    { id:'major', name:'Major Studio', cash:300000000, prestige:72, overhead:520000, expectation:1.45,
      blurb:'A household name. Massive resources, massive payroll, and a board that expects hits, not swings.' },
    { id:'legacy', name:'Legacy Studio', cash:500000000, prestige:85, overhead:900000, expectation:1.75,
      blurb:'A century of prestige to protect. The overhead alone could fund an indie studio\u2019s whole slate \u2014 and the board has zero patience for bombs.' }
  ];

export function findTier(id){
    var t = STUDIO_TIERS.filter(function(x){ return x.id===id; })[0];
    return t || STUDIO_TIERS[1];
  }


// Setters for cross-module restore — writers/directors/stars/composers/uidCounter are
// owned by this module; save/load has to go through these rather than reassigning the
// imported bindings directly.
export function setTalentRosters(w, d, s, c, p, x){
  writers = w;
  directors = d;
  stars = s;
  if(c) composers = c;
  if(p) producers = p;
  if(x) sfxHouses = x;
}
export function bumpUidCounter(n){
  uidCounter = Math.max(uidCounter, n || 1);
}
