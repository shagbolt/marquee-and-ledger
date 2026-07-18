import { STUDIO_TIERS, bumpUidCounter, clamp, composers, directors, findTier, producers, rand, setTalentRosters, stars, uidCounter, writers } from '../data/constants.js';
import { freshGenreDemand, genreDemand, prevGenreDemand, recentReleases, resetGenreDemandForNewStudio, setGenreDemandFromSave, yearOf } from '../systems/market.js';
import { PERSONALITY_KEYS } from '../systems/rival-personalities.js';
import { saveStatusLine, synopsisInput, synopsisWordCount } from '../ui/dom-refs.js';
import { addNews, populateTalentSelects, renderAll } from '../ui/render.js';

export function freshPlayer(tier, name){
    return { name:name||'Player Studio', cash:tier.cash, prestige:tier.prestige, moviesAll:[], totalOverheadPaid:0, awardsWon:[], passiveIncomeStreams:[] };
  }

export function freshAIStudios(tier){
    var names = ['Silverlight Pictures','Nova Horizon Studios','Ironclad Films'];
    return names.map(function(name, i){
      return {
        id:i, name:name, personalityKey: PERSONALITY_KEYS[i % PERSONALITY_KEYS.length],
        cash: Math.round(tier.cash*rand(0.7,1.3)),
        prestige: clamp(Math.round(tier.prestige+rand(-10,10)), 5, 95),
        moviesAll: []
      };
    });
  }

export var currentTier = STUDIO_TIERS[1];

export var player = freshPlayer(currentTier, 'Player Studio');

export var aiStudios = freshAIStudios(currentTier);

export var newsLog = [];

export var prestigeHistory = [];

export var awardsQueue = [];

export var game = { processedWeek:0, lastAwardedYear:0, currentRun:null, pendingProductionMovie:null, pendingEvent:null, pendingStreamMovie:null, currentScript:null, playerHeatGenre:null, playerHeatWeeksRemaining:0, pendingFranchiseLink:null, passiveIncomeQuarterStart:0, lastTickPassiveIncome:0 };

export function chargeOverheadForWeek(){
    if(!currentTier) return;
    player.cash -= currentTier.overhead;
    player.totalOverheadPaid = (player.totalOverheadPaid||0) + currentTier.overhead;
  }

export function freshFinance(){
    return {
      loans: [],
      loanHistory: [],
      profitShareDeals: [],
      investorConfidence: 60,
      isPublic: false,
      ipoRaised: 0,
      ipoWeek: 0,
      quarterStartWeek: 0,
      quarterProfitAccum: 0,
      shareholderRevolts: 0
    };
  }

export var finance = freshFinance();

export var SAVE_KEY = 'marqueeLedgerSave_v1';

export function serializeGame(){
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      tierId: currentTier ? currentTier.id : 'indie',
      player: player,
      aiStudios: aiStudios,
      writers: writers,
      directors: directors,
      stars: stars,
      composers: composers,
      producers: producers,
      finance: finance,
      genreDemand: genreDemand,
      prevGenreDemand: prevGenreDemand,
      recentReleases: recentReleases,
      game: { processedWeek: game.processedWeek, lastAwardedYear: game.lastAwardedYear, currentScript: game.currentScript, playerHeatGenre: game.playerHeatGenre, playerHeatWeeksRemaining: game.playerHeatWeeksRemaining, passiveIncomeQuarterStart: game.passiveIncomeQuarterStart, seasonGoal: game.seasonGoal, lastGoalYear: game.lastGoalYear, activeChallenge: game.activeChallenge },
      newsLog: newsLog,
      prestigeHistory: prestigeHistory,
      uidCounter: uidCounter
    };
  }

export function relinkMovieTalent(movies){
    (movies||[]).forEach(function(m){
      if(m.ownerType==='player'){
        m.writer = writers.filter(function(w){ return w.id===m.writer.id; })[0] || m.writer;
        m.director = directors.filter(function(d){ return d.id===m.director.id; })[0] || m.director;
        m.star1 = stars.filter(function(s){ return s.id===m.star1.id; })[0] || m.star1;
        m.star2 = stars.filter(function(s){ return s.id===m.star2.id; })[0] || m.star2;
        if(m.composerRef){ m.composerRef = composers.filter(function(c){ return c.id===m.composerRef.id; })[0] || m.composerRef; }
        if(m.producerRef){ m.producerRef = producers.filter(function(p){ return p.id===m.producerRef.id; })[0] || m.producerRef; }
      }
    });
  }

export function restoreGame(data){
    currentTier = findTier(data.tierId);
    player = data.player;
    player.awardsWon = player.awardsWon || [];
    aiStudios = data.aiStudios;
    setTalentRosters(data.writers, data.directors, data.stars, data.composers, data.producers);
    finance = data.finance || freshFinance();
    setGenreDemandFromSave(data.genreDemand || freshGenreDemand(), data.prevGenreDemand || {}, data.recentReleases || []);
    game.processedWeek = data.game.processedWeek;
    game.lastAwardedYear = data.game.lastAwardedYear;
    game.seasonGoal = data.game.seasonGoal || null;
    game.lastGoalYear = data.game.lastGoalYear!=null ? data.game.lastGoalYear : yearOf(game.processedWeek);
    game.activeChallenge = data.game.activeChallenge || null;
    game.currentRun = null;
    game.currentScript = data.game.currentScript || null;
    game.playerHeatGenre = data.game.playerHeatGenre || null;
    game.playerHeatWeeksRemaining = data.game.playerHeatWeeksRemaining || 0;
    game.passiveIncomeQuarterStart = data.game.passiveIncomeQuarterStart || 0;
    player.passiveIncomeStreams = player.passiveIncomeStreams || [];
    newsLog = data.newsLog || [];
    prestigeHistory = data.prestigeHistory || [];
    bumpUidCounter(data.uidCounter);
    relinkMovieTalent(player.moviesAll || []);
    awardsQueue = [];
    synopsisInput.value = game.currentScript ? game.currentScript.synopsis : '';
    if(game.currentScript){ synopsisWordCount.textContent = game.currentScript.wordCount+' words'; }
  }

export function saveGameToLocalStorage(){
    try{
      localStorage.setItem(SAVE_KEY, JSON.stringify(serializeGame()));
      saveStatusLine.textContent = '✅ Saved '+new Date().toLocaleTimeString();
    }catch(e){
      saveStatusLine.textContent = '⚠️ Save failed: '+e.message;
    }
  }

export function loadGameFromLocalStorage(){
    try{
      var raw = localStorage.getItem(SAVE_KEY);
      if(!raw){ saveStatusLine.textContent = '⚠️ No saved game found on this device.'; return; }
      var data = JSON.parse(raw);
      restoreGame(data);
      populateTalentSelects();
      renderAll();
      addNews('📂 Studio loaded from save.');
      saveStatusLine.textContent = '✅ Loaded save from '+new Date(data.savedAt).toLocaleString();
    }catch(e){
      saveStatusLine.textContent = '⚠️ Load failed: '+e.message;
    }
  }

export function exportSaveFile(){
    var blob = new Blob([JSON.stringify(serializeGame(), null, 2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (player.name||'studio').replace(/[^a-z0-9]+/gi,'_')+'_save.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    saveStatusLine.textContent = '✅ Exported save file.';
  }

export function importSaveFile(file){
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var data = JSON.parse(reader.result);
        restoreGame(data);
        populateTalentSelects();
        renderAll();
        addNews('⬆ Studio imported from file.');
        saveStatusLine.textContent = '✅ Imported save file.';
      }catch(e){
        saveStatusLine.textContent = '⚠️ Import failed: invalid file.';
      }
    };
    reader.readAsText(file);
  }


export function foundNewStudio(tier, name){
  currentTier = tier;
  player = freshPlayer(tier, name);
  aiStudios = freshAIStudios(tier);
  finance = freshFinance();
  resetGenreDemandForNewStudio();
}

