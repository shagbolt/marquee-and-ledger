import { GENRE_KEYWORDS, GENRE_SFX_IDEAL, clamp, rand, randInt } from '../data/constants.js';
import { prestigeHistory } from '../state/game-state.js';

export function checkBreakoutEligibility(movie){
    if(movie.quality<55) return false; // has to actually be good to sustain the story
    var budgetFactor = clamp(1-(movie.totalBudget/40000000), 0, 1); // 1.0 near $0, 0 at $40M+
    var qualityFactor = (movie.quality-55)/45; // 0 at quality 55, 1 at quality 100
    var chance = 0.03 + budgetFactor*0.16 + qualityFactor*0.10;
    return Math.random()<chance;
  }

export function pickBreakoutTalent(movie){
    var candidates = [
      { role:'Writer', person:movie.writer },
      { role:'Director', person:movie.director },
      { role:'Star', person:movie.star1 },
      { role:'Star', person:movie.star2 }
    ];
    if(movie.composerRef){ candidates.push({ role:'Composer', person:movie.composerRef }); }
    candidates.sort(function(a,b){ return a.person.prestige-b.person.prestige; });
    return candidates[0];
  }

export function verdictInfo(roi){
    if(roi>=2) return {label:'BLOCKBUSTER', emoji:'🎉', cls:'blockbuster'};
    if(roi>=0.5) return {label:'HIT', emoji:'✅', cls:'hit'};
    if(roi>=0) return {label:'BREAK-EVEN', emoji:'⚖️', cls:'even'};
    if(roi>=-0.5) return {label:'FLOP', emoji:'📉', cls:'flop'};
    return {label:'BOMB', emoji:'💥', cls:'bomb'};
  }

export function commercialPrestigeComponent(roi){
    if(roi>=2) return 5;
    if(roi>=0.5) return 3;
    if(roi>=0) return 1;
    if(roi>=-0.5) return -3;
    return -7;
  }

export function reviewPrestigeComponent(score){
    return Math.round((score-50)/10);
  }

export function applyPrestigeDelta(entity, baseDelta){
    var jitter = randInt(-1,1);
    var d = Math.round(baseDelta+jitter);
    var before = entity.prestige;
    entity.prestige = clamp(entity.prestige+d, 0, 100);
    return entity.prestige - before;
  }

export function logPrestigeChange(label, delta){
    if(!delta) return;
    prestigeHistory.unshift({label:label, delta:delta});
    if(prestigeHistory.length>20) prestigeHistory.pop();
  }

export function prestigeTier(p){
    if(p<20) return {label:'Poverty Row', cls:'t1'};
    if(p<40) return {label:'Scrappy Indie', cls:'t2'};
    if(p<60) return {label:'Mid-Tier Studio', cls:'t3'};
    if(p<80) return {label:'Major Player', cls:'t4'};
    return {label:'Legendary Studio', cls:'t5'};
  }

export function computeQuality(writerSkill, directorSkill, sfx, mkt, genre, star1Power, star2Power, sfxSkill){
    var idealRatio = GENRE_SFX_IDEAL[genre];
    var total = sfx+mkt;
    var actualRatio = total>0 ? sfx/total : idealRatio;
    var balanceScore = clamp(100 - Math.abs(idealRatio-actualRatio)*250, 0, 100);
    var avgStar = (star1Power+star2Power)/2;
    var sfxHouseSkill = sfxSkill!=null ? sfxSkill : 15; // matches Practical Effects' baseline for older call sites
    var q = writerSkill*0.30 + directorSkill*0.30 + balanceScore*0.15 + sfxHouseSkill*0.15 + avgStar*0.10;
    q += rand(-5,5);
    return clamp(Math.round(q), 0, 100);
  }

export function computeHype(mkt, star1Power, star2Power, channels){
    var avgStar = (star1Power+star2Power)/2;
    var marketingScore = Math.min(100, Math.sqrt(mkt/1000000)*14);
    var hype = avgStar*0.4 + marketingScore*0.6;
    var mult = 0.7+0.1*channels;
    hype = hype*mult;
    return clamp(Math.round(hype), 0, 100);
  }

export function computeTaglineAffinity(title, tagline, genre){
    var text = (title+' '+tagline).toLowerCase();
    var score = tagline.trim() ? 45 : 15;
    var len = tagline.trim().length;
    if(len>=15 && len<=70) score += 25;
    else if(len>0) score += 10;
    if(title.trim().length>=3 && title.trim().length<=45) score += 10;
    var keywords = GENRE_KEYWORDS[genre] || [];
    var hit = keywords.some(function(k){ return text.indexOf(k)>-1; });
    if(hit) score += 20;
    return clamp(score, 0, 100);
  }

export function computeReviews(movie){
    var idealRatio = GENRE_SFX_IDEAL[movie.genre];
    var total = movie.sfxBudget+movie.marketingBudget;
    var actualRatio = total>0 ? movie.sfxBudget/total : idealRatio;
    var balanceScore = clamp(100 - Math.abs(idealRatio-actualRatio)*250, 0, 100);

    var critics = movie.effWriterSkill*0.35 + movie.effDirectorSkill*0.35 + balanceScore*0.30 + rand(-4,4);
    critics = clamp(Math.round(critics), 0, 100);

    var affinity = computeTaglineAffinity(movie.title, movie.tagline, movie.genre);
    var avgStar = (movie.effStar1Power + movie.effStar2Power)/2;
    var audience = avgStar*0.40 + movie.hype*0.40 + affinity*0.20 + rand(-4,4);
    audience = clamp(Math.round(audience), 0, 100);

    return { critics: critics, audience: audience, affinity: affinity };
  }

export var CRITIC_QUOTES = [
    ['A masterclass in storytelling.', 'Bold, assured, and unforgettable.', 'Every frame earns its place — a genuine triumph.'],
    ['Smart, confident filmmaking with real ambition.', 'Flawed but frequently brilliant.', 'A satisfying, well-crafted picture.'],
    ['Competent but unremarkable.', 'Has its moments, but never quite comes together.', 'Serviceable, if forgettable.'],
    ['The script can\u2019t support its ambitions.', 'A muddled, uneven effort.', 'Style over substance, and not enough of either.'],
    ['A genuine disaster from script to screen.', 'Incoherent and inert.', 'One of the studio\u2019s worst efforts.']
  ];

export var AUDIENCE_QUOTES = [
    ['I want to see it again immediately!', 'Pure popcorn perfection.', 'The whole theater cheered.'],
    ['Really fun night out.', 'The cast is so likable, I didn\u2019t want it to end.', 'Exactly what I wanted from a night at the movies.'],
    ['It was fine, I guess.', 'Good for a rental, not a must-see.', 'Some fun parts, but it dragged.'],
    ['I checked my phone a lot.', 'Not worth the ticket price.', 'Left the theater confused and unimpressed.'],
    ['Walked out halfway through.', 'Ask for a refund.', 'Worst theater experience in years.']
  ];

export var CRITIC_SOURCES = ['Marquee & Ledger', 'Silver Screen Weekly', 'The Studio Gazette', 'Front Row Daily'];

export var AUDIENCE_SOURCES = ['Opening Night Crowd', 'Verified Ticket Buyer', 'Matinee Crowd', 'Opening Weekend Audience'];

export function pickBlurb(score, kind){
    var banks = kind==='critics' ? CRITIC_QUOTES : AUDIENCE_QUOTES;
    var tierIdx = score>=90 ? 0 : score>=75 ? 1 : score>=55 ? 2 : score>=35 ? 3 : 4;
    var pool = banks[tierIdx];
    var quote = pool[randInt(0, pool.length-1)];
    var sources = kind==='critics' ? CRITIC_SOURCES : AUDIENCE_SOURCES;
    var source = sources[randInt(0, sources.length-1)];
    return { quote: quote, source: source };
  }

export function reviewDivergence(critics, audience){
    var gap = critics - audience;
    if(critics>=70 && audience>=70) return { label:'Universally Acclaimed', shortLabel:'Acclaimed', icon:'🌟', desc:'Both critics and audiences are raving.', cls:'acclaimed' };
    if(critics<=35 && audience<=35) return { label:'Panned Across the Board', shortLabel:'Panned', icon:'🗑️', desc:'Nobody is defending this one.', cls:'panned' };
    if(gap>=25) return { label:'Critical Darling, Audience Skeptics', shortLabel:'Critics\u2019 Pick', icon:'🎭', desc:'Critics are impressed; general audiences are lukewarm.', cls:'critical-darling' };
    if(gap<=-25) return { label:'Crowd-Pleaser, Critics Unmoved', shortLabel:'Crowd-Pleaser', icon:'🍿', desc:'Audiences are having a great time; critics aren\u2019t as charmed.', cls:'crowd-pleaser' };
    return { label:'Mixed Reception', shortLabel:'Mixed', icon:'🤷', desc:'Reactions are all over the map.', cls:'mixed' };
  }

export function buildReviewSummary(movie){
    return {
      criticsBlurb: pickBlurb(movie.criticsScore, 'critics'),
      audienceBlurb: pickBlurb(movie.audienceScore, 'audience'),
      divergence: reviewDivergence(movie.criticsScore, movie.audienceScore)
    };
  }

