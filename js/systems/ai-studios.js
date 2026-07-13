import { clamp, escapeHtml, generateMovieTitle, pickAIName, rand, randInt, uid } from '../data/constants.js';
import { aiStudios, chargeOverheadForWeek, currentTier, game, player } from '../state/game-state.js';
import { checkAwards } from './awards.js';
import { tickPassiveIncome } from './franchise.js';
import { chargeLoanPaymentsForWeek, checkQuarterlyEarnings, computeIndustryReport, genreDemand, getSaturation, pickWeightedGenre, recordRelease, weekInYearOf, yearOf } from './market.js';
import { applyPrestigeDelta, commercialPrestigeComponent, reviewPrestigeComponent, verdictInfo } from './talent-quality.js';
import { addNews } from '../ui/render.js';

export var NEW_STUDIO_NAMES = ['Bluewater Media','Crescent Point Films','Redwood Entertainment','Harbor Light Studios','Vantage Pictures','Northgate Films','Old Compass Studios','Amberline Pictures','Fifth Street Films','Paperclip Media'];

export function pickNewStudioName(){
    var used = aiStudios.map(function(s){ return s.name; }).concat([player.name]);
    var available = NEW_STUDIO_NAMES.filter(function(n){ return used.indexOf(n)===-1; });
    if(available.length===0) return NEW_STUDIO_NAMES[randInt(0,NEW_STUDIO_NAMES.length-1)];
    return available[randInt(0,available.length-1)];
  }

export function spawnNewStudio(studio, isReorg){
    var newName = pickNewStudioName();
    studio.name = newName;
    studio.cash = Math.round((currentTier?currentTier.cash:25000000)*rand(0.5,0.9));
    studio.prestige = clamp(Math.round(rand(30,55)), 10, 60);
    studio.moviesAll = [];
    studio.rumor = null;
    if(isReorg){ studio.reorgCount = (studio.reorgCount||0)+1; }
    else { addNews('🆕 '+escapeHtml(newName)+' enters the industry as a new studio.'); }
  }

export function checkStudioBankruptcy(studio){
    var threshold = -(currentTier ? currentTier.cash*1.5 : 40000000);
    if(studio.cash<threshold){
      var oldName = studio.name;
      spawnNewStudio(studio, true);
      addNews('💥 '+escapeHtml(oldName)+' has gone bankrupt and reorganizes as '+escapeHtml(studio.name)+'.');
    }
  }

export function maybeStudioMerger(){
    if(Math.random()>0.08) return;
    var sorted = aiStudios.slice().sort(function(a,b){ return a.cash-b.cash; });
    var weak = sorted[0];
    var others = aiStudios.filter(function(s){ return s.id!==weak.id; });
    var acquirer = others[randInt(0, others.length-1)];
    var verb = Math.random()<0.5 ? 'acquired' : 'merged with';
    acquirer.cash += Math.max(0, weak.cash*0.5);
    acquirer.prestige = clamp(Math.round((acquirer.prestige+weak.prestige)/2)+3, 0, 100);
    var oldWeakName = weak.name;
    spawnNewStudio(weak, true);
    addNews('🤝 '+escapeHtml(acquirer.name)+' has '+verb+' '+escapeHtml(oldWeakName)+'. The studio reorganizes as '+escapeHtml(weak.name)+'.');
  }

export function markPlayerHeat(genre){
    game.playerHeatGenre = genre;
    game.playerHeatWeeksRemaining = 8;
  }

export function tickPlayerHeat(){
    if(game.playerHeatWeeksRemaining>0){
      game.playerHeatWeeksRemaining--;
      if(game.playerHeatWeeksRemaining<=0){ game.playerHeatGenre = null; game.playerHeatWeeksRemaining = 0; }
    }
  }

export function generateAIMovie(studio, week){
    // "Study market trends" + "copy successful genres": weight toward the industry's
    // current top-grossing genre, and further toward whatever genre just made the player
    // a hit (playerHeat) — smart studios chase what's working, not just raw demand.
    var boosts = [{ genre: computeIndustryReport().topGenre, factor: 1.35 }];
    if(game.playerHeatWeeksRemaining>0){ boosts.push({ genre: game.playerHeatGenre, factor: 1.5 }); }
    var genre = pickWeightedGenre(boosts);

    // "Delay releases": a smart studio sometimes holds off rather than piling into an
    // already-oversaturated genre. Returning null here is a real "no release this week."
    if(getSaturation(genre)>=70 && Math.random()<0.5){ return null; }

    // "Launch franchises": occasionally sequel a past hit instead of an original.
    var sequelBait = studio.moviesAll.filter(function(m){ return m.roi>=0.5; });
    var isSequel = sequelBait.length>0 && Math.random()<0.15;
    var title;
    if(isSequel){
      var original = sequelBait[randInt(0, sequelBait.length-1)];
      var sequelNum = (original.sequelCount||1)+1;
      original.sequelCount = sequelNum;
      title = original.title+' Part '+sequelNum;
      genre = original.genre;
    } else {
      title = generateMovieTitle(genre);
    }

    var quality = clamp(Math.round(rand(35,90) + studio.prestige/12 + rand(-5,5)), 5, 100);
    var demand = genreDemand[genre] || 60;
    var saturation = getSaturation(genre);
    var confidenceScale = 1 + (demand-60)/200; // hot trends -> bigger bets, both directions
    var budget = clamp(studio.cash*rand(0.15,0.45)*confidenceScale, 6000000, 90000000);
    var hype = clamp(Math.round(rand(25,85) + studio.prestige/12 + (demand-60)*0.2 - saturation*0.12), 0, 100);
    if(game.playerHeatWeeksRemaining>0 && genre===game.playerHeatGenre){ hype = clamp(hype+8, 0, 100); }
    if(isSequel){ quality = clamp(quality-3, 0, 100); hype = clamp(hype+10, 0, 100); budget = Math.round(budget*1.15); }

    recordRelease(genre, week);
    var theaterCount = Math.round(rand(400,4000));
    var perScreen = 5000*(hype/50);
    var opening = theaterCount*perScreen*(0.85+quality/100*0.3);
    var legsMultiplier = 2.2 + quality/100*3.3 + rand(-0.3,0.3);
    var totalBoxOffice = Math.max(0, opening*legsMultiplier);
    var studioRevenue = totalBoxOffice*0.5;
    var profit = studioRevenue - budget;
    studio.cash += profit;
    var roi = budget>0 ? profit/budget : 0;
    // AI movies don't run the full Reviews pipeline, so `quality` doubles as a stand-in
    // "critical reception" proxy for their own studio's prestige — same commercial +
    // critical blend the player's studio uses, just without a separate critics score.
    var studioBase = commercialPrestigeComponent(roi) + reviewPrestigeComponent(quality);
    applyPrestigeDelta(studio, studioBase);
    var director = pickAIName();
    var lead = pickAIName();
    var info = verdictInfo(roi);
    var movie = {
      id: uid(), ownerType:'ai', studioId: studio.id, studioName: studio.name,
      title: title, genre: genre, quality: quality, budget: budget,
      totalBoxOffice: totalBoxOffice, studioRevenue: studioRevenue, profit: profit, roi: roi,
      releaseWeek: week, releaseYear: yearOf(week),
      director: director, lead: lead, isSequel: isSequel,
      verdict: info.emoji+' '+info.label, verdictCls: info.cls
    };
    studio.moviesAll.push(movie);
    addNews('🎬 Y'+yearOf(week)+' W'+weekInYearOf(week)+' — '+escapeHtml(studio.name)+' released "'+escapeHtml(title)+'"'+(isSequel?' 🔁':'')+' ('+genre+'). '+movie.verdict);
    checkStudioBankruptcy(studio);
    return movie;
  }

export function advanceOneWeek(){
    var w = game.processedWeek+1;
    aiStudios.forEach(function(s){
      if(Math.random()<0.12){ generateAIMovie(s, w); }
    });
    game.processedWeek = w;
    chargeOverheadForWeek();
    chargeLoanPaymentsForWeek();
    checkQuarterlyEarnings();
    tickPlayerHeat();
    tickPassiveIncome();
    checkAwards();
  }
export function advanceBackgroundSim(targetWeek){
    while(game.processedWeek < targetWeek){
      advanceOneWeek();
    }
  }

