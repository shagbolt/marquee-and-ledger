import { GENRES, clamp, rand } from '../data/constants.js';
import { currentTier, player } from '../state/game-state.js';
import { weekInYearOf } from './market.js';
import { CLICHE_PHRASES, INTERIORITY_WORDS, SPECTACLE_WORDS, TARGET_AUDIENCE_MAP, THEME_BANK, TONE_BANK, WORLDBUILDING_WORDS, countKeywordHits, uniqueWordRatioOf } from './script-development.js';
import { genreSelect } from '../ui/dom-refs.js';

export var RELEASE_STRATEGIES = [
    { id:'wide', name:'Wide Release', icon:'🎬',
      desc:'Maximum theaters from day one. The reliable default — big opening, ordinary legs.',
      theaterMultiplier:1.0, hypeMultiplier:1.0, perScreenMultiplier:1.0, legsBonus:0, awardsBonus:0, prestigeBonus:0, timing:null, platformExpand:0 },
    { id:'limited', name:'Limited Release', icon:'🎭',
      desc:'A small, curated rollout. Builds word-of-mouth and awards buzz instead of chasing a big opening.',
      theaterMultiplier:0.22, hypeMultiplier:0.85, perScreenMultiplier:1.6, legsBonus:0.12, awardsBonus:12, prestigeBonus:3, timing:null, platformExpand:0 },
    { id:'platform', name:'Platform Release', icon:'📈',
      desc:'Opens small, then expands wide over the first month.',
      theaterMultiplier:0.25, hypeMultiplier:0.9, perScreenMultiplier:1.4, legsBonus:0.08, awardsBonus:8, prestigeBonus:2, timing:null, platformExpand:4 },
    { id:'holiday', name:'Holiday Release', icon:'🎉',
      desc:'Aimed at a major holiday weekend. Huge if the date lines up, wasted if it doesn\u2019t.',
      theaterMultiplier:1.0, hypeMultiplier:1.0, perScreenMultiplier:1.0, legsBonus:0, awardsBonus:0, prestigeBonus:0, timing:'holiday', platformExpand:0 },
    { id:'summer', name:'Summer Blockbuster', icon:'☀️',
      desc:'Aimed at the summer crowd. Rewards spectacle, gets buried if it\u2019s not genuinely big.',
      theaterMultiplier:1.05, hypeMultiplier:1.0, perScreenMultiplier:1.0, legsBonus:-0.04, awardsBonus:-4, prestigeBonus:0, timing:'summer', platformExpand:0 },
    { id:'awardsSeason', name:'Awards Season', icon:'🏆',
      desc:'Positioned for critics and industry voters. Commercially modest, prestige-heavy.',
      theaterMultiplier:0.55, hypeMultiplier:0.8, perScreenMultiplier:1.25, legsBonus:0.1, awardsBonus:15, prestigeBonus:5, timing:'awardsSeason', platformExpand:0 }
  ];

export var HOLIDAY_WEEKS = [
    {week:21, name:'Memorial Day'},
    {week:27, name:'Independence Day'},
    {week:47, name:'Thanksgiving'},
    {week:51, name:'Christmas'},
    {week:52, name:'New Year\u2019s'}
  ];

export var SUMMER_WINDOW = {start:22, end:35};

export var AWARDS_SEASON_WINDOW = {start:44, end:52};

export function holidayName(wInYear){ var h = HOLIDAY_WEEKS.filter(function(x){ return x.week===wInYear; })[0]; return h?h.name:null; }

export function isSummerWeek(wInYear){ return wInYear>=SUMMER_WINDOW.start && wInYear<=SUMMER_WINDOW.end; }

export function isAwardsSeasonWeek(wInYear){ return wInYear>=AWARDS_SEASON_WINDOW.start; }

export function checkTimingMatch(strategy, releaseWeek){
    if(!strategy || !strategy.timing) return null;
    var w = weekInYearOf(releaseWeek);
    if(strategy.timing==='holiday') return !!holidayName(w);
    if(strategy.timing==='summer') return isSummerWeek(w);
    if(strategy.timing==='awardsSeason') return isAwardsSeasonWeek(w);
    return null;
  }

export var INTL_MARKETS = [
    { id:'europe', name:'Europe', icon:'🇪🇺', costFactor:0.12, sizeFactor:0.85, censorship:'low', approvalBase:0.96,
      genrePop:{Action:1.1,Animation:1.15,Comedy:0.85,Drama:1.2,Horror:1.0,'Sci-Fi':1.1} },
    { id:'latam', name:'Latin America', icon:'🌎', costFactor:0.08, sizeFactor:0.55, censorship:'low', approvalBase:0.96,
      genrePop:{Action:1.2,Animation:1.1,Comedy:1.15,Drama:0.9,Horror:1.05,'Sci-Fi':0.95} },
    { id:'japan', name:'Japan', icon:'🇯🇵', costFactor:0.11, sizeFactor:0.5, censorship:'moderate', approvalBase:0.9,
      genrePop:{Action:1.0,Animation:1.45,Comedy:0.8,Drama:0.95,Horror:1.15,'Sci-Fi':1.1} },
    { id:'china', name:'China', icon:'🇨🇳', costFactor:0.18, sizeFactor:0.9, censorship:'high', approvalBase:0.55,
      genrePop:{Action:1.3,Animation:1.1,Comedy:0.7,Drama:0.75,Horror:0.3,'Sci-Fi':1.25} },
    { id:'india', name:'India', icon:'🇮🇳', costFactor:0.09, sizeFactor:0.6, censorship:'moderate', approvalBase:0.85,
      genrePop:{Action:1.25,Animation:0.9,Comedy:1.2,Drama:1.05,Horror:0.7,'Sci-Fi':0.9} },
    { id:'australia', name:'Australia', icon:'🇦🇺', costFactor:0.06, sizeFactor:0.15, censorship:'low', approvalBase:0.97,
      genrePop:{Action:1.05,Animation:1.0,Comedy:1.05,Drama:1.0,Horror:1.1,'Sci-Fi':1.05} },
    { id:'middleeast', name:'Middle East', icon:'🌙', costFactor:0.09, sizeFactor:0.35, censorship:'high', approvalBase:0.65,
      genrePop:{Action:1.15,Animation:1.05,Comedy:0.7,Drama:0.75,Horror:0.45,'Sci-Fi':1.05} }
  ];

export function computeApprovalChance(market, movie){
    var prestigeBonus = (player.prestige-50)*0.002;
    var genreRisk = (market.censorship==='high' && movie.genre==='Horror') ? -0.2 : 0;
    return clamp(market.approvalBase+prestigeBonus+genreRisk, 0.15, 0.99);
  }

export function estimateMarketRevenue(market, movie){
    var genreFit = market.genrePop[movie.genre]||1.0;
    var qualityFactor = 0.7+movie.audienceScore/100*0.6;
    return movie.totalBoxOffice*market.sizeFactor*genreFit*qualityFactor*0.5;
  }

export function marketCost(market, movie){
    return Math.round(market.costFactor*movie.totalBudget);
  }

export var STORY_GENRE_SIGNALS = {
    'Action': ['fight','fighting','battle','gunfight','explosion','chase','mercenar','soldier','warrior','combat','assassin','heist','showdown','army','weapon','mission','agent','rescue mission','terrorist','firefight'],
    'Sci-Fi': ['space','spaceship','alien','robot','android','future city','planet','galaxy','quantum','artificial intelligence',' ai ','colony','cyborg','dystopia','time travel','starship','laser','clone','interstellar'],
    'Horror': ['haunted','ghost','demon','curse','possessed','monster','slasher','supernatural','evil spirit','nightmare','terror','sinister','creature','exorcism','zombie','vampire','stalked by'],
    'Comedy': ['hilarious','comedic','sitcom','misadventure','wacky','slapstick','farce','mistaken identity','blind date','embarrassing','shenanigans','goofy','prank','bumbling'],
    'Drama': ['struggles','estranged','grief','illness','divorce','custody','addiction','secret past','confronts her past','confronts his past','reconcile','dying of','terminal','recovery from','abandoned her','abandoned him'],
    'Animation': ['talking animal','magical creature','cartoon','fairy tale','kingdom of','enchanted','wizard','fairy','dragon','princess','toy come','imaginary friend','storybook']
  };

export function neutralStory(genre){
    return {
      synopsis:'', wordCount:0, primaryGenre:genre, secondaryGenre:null, themes:[], tone:'Balanced',
      targetAudience: TARGET_AUDIENCE_MAP[genre]||'General Audiences',
      originality:50, characterDepth:50, commercialAppeal:50, awardsPotential:50,
      franchisePotential:50, internationalAppeal:50, productionComplexity:40,
      budgetCategory:'Unassessed', appliedRewrites:[]
    };
  }

export function analyzeSynopsis(text, wordCount){
    var lower = text.toLowerCase();

    var genreScores = GENRES.map(function(g){ return { genre:g, hits: countKeywordHits(lower, STORY_GENRE_SIGNALS[g]||[]) }; });
    genreScores.sort(function(a,b){ return b.hits-a.hits; });
    var primaryGenre = genreScores[0].hits>0 ? genreScores[0].genre : genreSelect.value;
    var secondaryGenre = (genreScores[1] && genreScores[1].hits>0) ? genreScores[1].genre : null;

    var themeHits = THEME_BANK.map(function(t){ return { label:t.label, hits:countKeywordHits(lower, t.words) }; }).filter(function(t){ return t.hits>0; });
    themeHits.sort(function(a,b){ return b.hits-a.hits; });
    var themes = themeHits.slice(0,3).map(function(t){ return t.label; });

    var toneScores = TONE_BANK.map(function(t){ return { label:t.label, hits:countKeywordHits(lower, t.words) }; });
    toneScores.sort(function(a,b){ return b.hits-a.hits; });
    var tone = toneScores[0].hits>0 ? toneScores[0].label : 'Balanced';

    var clicheHits = countKeywordHits(lower, CLICHE_PHRASES);
    var genresRepresented = genreScores.filter(function(g){ return g.hits>0; }).length;
    var uniqueRatio = uniqueWordRatioOf(text);
    var originality = clamp(Math.round(45+genresRepresented*7+uniqueRatio*35-clicheHits*12+rand(-4,4)), 5, 98);

    var interiorityHits = countKeywordHits(lower, INTERIORITY_WORDS);
    var characterDepth = clamp(Math.round(32+interiorityHits*10+rand(-4,4)), 5, 98);

    var spectacleHits = countKeywordHits(lower, SPECTACLE_WORDS);
    var genreCommercialBonus = {'Action':15,'Animation':15,'Sci-Fi':10,'Comedy':8,'Horror':5,'Drama':0}[primaryGenre]||0;
    var commercialAppeal = clamp(Math.round(38+spectacleHits*7+genreCommercialBonus+rand(-4,4)), 5, 98);

    var genreAwardsBonus = {'Drama':15,'Sci-Fi':5,'Animation':5,'Horror':0,'Action':-5,'Comedy':-5}[primaryGenre]||0;
    var awardsPotential = clamp(Math.round(characterDepth*0.4+originality*0.35+genreAwardsBonus-commercialAppeal*0.1+rand(-4,4)), 5, 98);

    var worldbuildingHits = countKeywordHits(lower, WORLDBUILDING_WORDS);
    var genreFranchiseBonus = {'Action':10,'Sci-Fi':15,'Animation':15,'Horror':8,'Comedy':0,'Drama':-10}[primaryGenre]||0;
    var franchisePotential = clamp(Math.round(28+worldbuildingHits*9+genreFranchiseBonus+commercialAppeal*0.2+rand(-4,4)), 5, 98);

    var genreIntlBonus = {'Action':15,'Sci-Fi':12,'Animation':18,'Horror':8,'Drama':0,'Comedy':-10}[primaryGenre]||0;
    var universalBonus = themes.some(function(t){ return ['Love & Romance','Family','Survival','Justice','Hope'].indexOf(t)>-1; }) ? 8 : 0;
    var internationalAppeal = clamp(Math.round(38+genreIntlBonus+universalBonus+commercialAppeal*0.15+rand(-4,4)), 5, 98);

    var genreComplexityBase = {'Sci-Fi':55,'Action':50,'Animation':60,'Horror':35,'Comedy':25,'Drama':20}[primaryGenre]||35;
    var productionComplexity = clamp(Math.round(genreComplexityBase+spectacleHits*4+worldbuildingHits*5+rand(-4,4)), 10, 98);

    var budgetCategory = productionComplexity>=70 ? 'Blockbuster ($50M+ SFX/Marketing)' : productionComplexity>=45 ? 'Mid-Budget ($10M-$50M SFX/Marketing)' : 'Indie / Lean (Under $10M SFX/Marketing)';
    var targetAudience = TARGET_AUDIENCE_MAP[primaryGenre] || 'General Audiences';

    return {
      synopsis:text, wordCount:wordCount,
      primaryGenre:primaryGenre, secondaryGenre:secondaryGenre, themes:themes, tone:tone,
      targetAudience:targetAudience,
      originality:originality, characterDepth:characterDepth, commercialAppeal:commercialAppeal,
      awardsPotential:awardsPotential, franchisePotential:franchisePotential, internationalAppeal:internationalAppeal,
      productionComplexity:productionComplexity, budgetCategory:budgetCategory,
      appliedRewrites:[]
    };
  }

export function scaledCost(base){
    var mult = currentTier ? (currentTier.cash/25000000) : 1;
    return Math.round(base*Math.max(0.3, mult)/10000)*10000;
  }

export var REWRITE_OPTIONS = [
    { id:'dialogue', label:'Improve Dialogue', baseCost:200000, desc:'Sharper, more memorable lines.',
      apply:function(s){ s.characterDepth=clamp(s.characterDepth+10,0,100); s.commercialAppeal=clamp(s.commercialAppeal-2,0,100); } },
    { id:'ending', label:'Strengthen the Ending', baseCost:250000, desc:'A more satisfying final act.',
      apply:function(s){ s.awardsPotential=clamp(s.awardsPotential+10,0,100); s.originality=clamp(s.originality-3,0,100); } },
    { id:'action', label:'Increase Action', baseCost:300000, desc:'More spectacle, less talk.',
      apply:function(s){ s.commercialAppeal=clamp(s.commercialAppeal+12,0,100); s.characterDepth=clamp(s.characterDepth-6,0,100); s.productionComplexity=clamp(s.productionComplexity+10,0,100); } },
    { id:'comedy', label:'Increase Comedy', baseCost:180000, desc:'Lighten the tone with more laughs.',
      apply:function(s){ s.commercialAppeal=clamp(s.commercialAppeal+8,0,100); s.awardsPotential=clamp(s.awardsPotential-8,0,100); } },
    { id:'simplify', label:'Simplify the Plot', baseCost:150000, desc:'Easier to follow, less ambitious.',
      apply:function(s){ s.internationalAppeal=clamp(s.internationalAppeal+8,0,100); s.originality=clamp(s.originality-10,0,100); } },
    { id:'pacing', label:'Improve Pacing', baseCost:220000, desc:'Tighten scenes, cut the fat.',
      apply:function(s){ s.commercialAppeal=clamp(s.commercialAppeal+6,0,100); s.characterDepth=clamp(s.characterDepth+3,0,100); } },
    { id:'worldbuilding', label:'Expand World-Building', baseCost:280000, desc:'A richer, more immersive setting.',
      apply:function(s){ s.franchisePotential=clamp(s.franchisePotential+15,0,100); s.productionComplexity=clamp(s.productionComplexity+12,0,100); } },
    { id:'emotional', label:'Improve Emotional Impact', baseCost:260000, desc:'Land the feeling, not just the plot.',
      apply:function(s){ s.awardsPotential=clamp(s.awardsPotential+8,0,100); s.characterDepth=clamp(s.characterDepth+8,0,100); s.commercialAppeal=clamp(s.commercialAppeal-3,0,100); } }
  ];

export function generateTestScreeningFeedback(movie){
    var story = movie.story;
    var base = movie.quality;
    return {
      endingSatisfaction: clamp(Math.round(base*0.5+story.awardsPotential*0.3+rand(-10,10)), 0, 100),
      characterLikability: clamp(Math.round(story.characterDepth*0.6+base*0.2+rand(-10,10)), 0, 100),
      pacing: clamp(Math.round(base*0.4+(100-story.productionComplexity)*0.2+rand(-10,10)), 0, 100),
      comedy: clamp(Math.round((movie.genre==='Comedy'?70:35)+story.commercialAppeal*0.2+rand(-10,10)), 0, 100),
      action: clamp(Math.round((movie.genre==='Action'?70:35)+story.commercialAppeal*0.2+rand(-10,10)), 0, 100),
      emotionalImpact: clamp(Math.round(story.characterDepth*0.4+story.awardsPotential*0.3+rand(-10,10)), 0, 100),
      confusion: clamp(Math.round(100-story.originality*0.3-base*0.3+rand(-10,10)), 0, 100)
    };
  }

export var TEST_SCREENING_CHOICES = [
    { id:'asis', label:'Release As-Is', costBase:0, delayWeeks:0, desc:'No changes. Ship it.' },
    { id:'reshootEnding', label:'Reshoot the Ending', costBase:300000, delayWeeks:2, desc:'Targets Ending Satisfaction & Awards Potential.' },
    { id:'trimRuntime', label:'Trim Runtime', costBase:150000, delayWeeks:1, desc:'Targets Pacing.' },
    { id:'addScenes', label:'Add Scenes', costBase:250000, delayWeeks:2, desc:'Targets Character Likability & Emotional Impact.' },
    { id:'removeScenes', label:'Remove Scenes', costBase:150000, delayWeeks:1, desc:'Targets Confusion & Pacing.' },
    { id:'improveVFX', label:'Improve Visual Effects', costBase:400000, delayWeeks:2, desc:'Targets Action & Commercial Appeal.' },
    { id:'delay', label:'Delay Release', costBase:0, delayWeeks:4, desc:'Buys polish time. Modest, unpredictable quality shift.' }
  ];

export function applyTestScreeningChoice(movie, choiceId){
    var cost = 0, outcome = '';
    var roll = Math.random();
    switch(choiceId){
      case 'asis':
        outcome = 'You ship the film exactly as previewed.';
        break;
      case 'reshootEnding':
        cost = scaledCost(300000);
        if(roll<0.70){ movie.quality=clamp(movie.quality+6,0,100); movie.criticsScore=clamp(movie.criticsScore+8,0,100); outcome='The new ending tests far better. Quality +6, Critics +8.'; }
        else { movie.quality=clamp(movie.quality-3,0,100); outcome='The reshot ending feels tacked-on. Quality -3.'; }
        break;
      case 'trimRuntime':
        cost = scaledCost(150000);
        if(roll<0.75){ movie.audienceScore=clamp(movie.audienceScore+7,0,100); outcome='Tighter pacing plays much better. Audience +7.'; }
        else { movie.criticsScore=clamp(movie.criticsScore-4,0,100); outcome='Critics feel something essential got cut. Critics -4.'; }
        break;
      case 'addScenes':
        cost = scaledCost(250000);
        if(roll<0.65){ movie.criticsScore=clamp(movie.criticsScore+6,0,100); outcome='Deeper characters land well. Critics +6.'; }
        else { movie.audienceScore=clamp(movie.audienceScore-6,0,100); outcome='The extra scenes drag. Audience -6.'; }
        break;
      case 'removeScenes':
        cost = scaledCost(150000);
        if(roll<0.70){ movie.audienceScore=clamp(movie.audienceScore+5,0,100); outcome='A leaner cut plays cleaner. Audience +5.'; }
        else { movie.criticsScore=clamp(movie.criticsScore-5,0,100); outcome='Critics feel the story lost something. Critics -5.'; }
        break;
      case 'improveVFX':
        cost = scaledCost(400000);
        if(roll<0.80){ movie.hype=clamp(movie.hype+8,0,100); movie.audienceScore=clamp(movie.audienceScore+6,0,100); outcome='The upgraded effects wow the room. Hype +8, Audience +6.'; }
        else { outcome='The new effects don\u2019t move the needle much.'; }
        break;
      case 'delay':
        if(roll<0.5){ movie.quality=clamp(movie.quality+4,0,100); outcome='The extra polish time pays off. Quality +4.'; }
        else if(roll<0.8){ outcome='The delay doesn\u2019t change much either way.'; }
        else { movie.quality=clamp(movie.quality-3,0,100); outcome='Momentum stalls during the delay. Quality -3.'; }
        break;
    }
    if(cost>0){
      player.cash -= cost;
      movie.testScreeningCost = (movie.testScreeningCost||0)+cost;
    }
    return { cost:cost, outcome:outcome };
  }

