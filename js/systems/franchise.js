import { clamp, formatMoney, uid } from '../data/constants.js';
import { game, player } from '../state/game-state.js';
import { neutralStory } from './release-strategy.js';
import { applyPrestigeDelta } from './talent-quality.js';
import { genreSelect, movieTitleInput, synopsisInput, synopsisWordCount } from '../ui/dom-refs.js';
import { addNews, renderAll, renderScriptReport } from '../ui/render.js';

export var FRANCHISE_EXTENSIONS = [
    { id:'sequel', label:'Sequel', kind:'production', icon:'➡️',
      desc:'A direct continuation. Built-in audience, less critical novelty.',
      genreLock:null, storyMod:{ commercialAppeal:12, originality:-8, franchisePotential:5 } },
    { id:'prequel', label:'Prequel', kind:'production', icon:'⬅️',
      desc:'Explore the story before the story. More prestige, less guaranteed crowd.',
      genreLock:null, storyMod:{ awardsPotential:10, characterDepth:6, commercialAppeal:-4 } },
    { id:'spinoff', label:'Spin-off', kind:'production', icon:'↗️',
      desc:'A different angle, possibly a different genre. Trades built-in audience for reach.',
      genreLock:null, storyMod:{ franchisePotential:12, originality:4, commercialAppeal:-6 } },
    { id:'animatedAdaptation', label:'Animated Adaptation', kind:'production', icon:'🎨',
      desc:'Reintroduce the franchise to family audiences.',
      genreLock:'Animation', storyMod:{ internationalAppeal:14, commercialAppeal:6 } },
    { id:'tvSeries', label:'Television Series', kind:'passive', icon:'📺',
      desc:'A weekly series keeping the franchise alive between films.',
      costFactor:0.35, quarterlyFactor:0.018, quarters:8, prestige:2 },
    { id:'streamingSeries', label:'Streaming Series', kind:'passive', icon:'💻',
      desc:'A streaming-first series: smaller residuals, bigger upfront licensing fee.',
      costFactor:0.25, quarterlyFactor:0.014, quarters:8, upfrontFactor:0.15, prestige:2 },
    { id:'merchandise', label:'Merchandise Line', kind:'lump', icon:'🧸',
      desc:'Toys, apparel, collectibles. One lump sum, paid immediately.',
      costFactor:0.08, payoutFactor:0.20, prestige:1 },
    { id:'themePark', label:'Theme Park Attraction', kind:'passive', icon:'🎢',
      desc:'A permanent attraction. Enormous cost, decades of returns, real prestige.',
      costFactor:1.8, quarterlyFactor:0.03, quarters:20, prestige:12,
      minFranchiseValue:80, minPrestige:70, oncePerFranchise:true }
  ];

export function franchiseEligibleMovies(){
    return player.moviesAll.filter(function(m){
      return m.roi>=0.5 || (m.story && m.story.franchisePotential>=65);
    });
  }

export function computeFranchiseValue(movie){
    var base = (movie.quality+movie.audienceScore)/2;
    var fpBonus = movie.story ? (movie.story.franchisePotential-50)*0.3 : 0;
    var extBonus = (movie.franchiseExtensions||[]).length*4;
    return clamp(Math.round(base+fpBonus+extBonus), 0, 100);
  }

export function extensionEligible(ext, original){
    if(ext.kind==='production') return true;
    var fv = computeFranchiseValue(original);
    if(ext.minFranchiseValue!=null && fv<ext.minFranchiseValue) return false;
    if(ext.minPrestige!=null && player.prestige<ext.minPrestige) return false;
    if(ext.oncePerFranchise && (original.franchiseExtensions||[]).some(function(e){ return e.type===ext.id; })) return false;
    return true;
  }

export function extensionCost(ext, original){
    var base = original.totalBudget||original.budget||20000000;
    var fv = computeFranchiseValue(original);
    return Math.round(base*(ext.costFactor||0)*(0.6+fv/100));
  }

export function extensionQuarterlyPayout(ext, original){
    var base = original.totalBoxOffice||0;
    var fv = computeFranchiseValue(original);
    return Math.round(base*(ext.quarterlyFactor||0)*(0.5+fv/100));
  }

export function extensionUpfrontPayout(ext, original){
    var base = original.totalBoxOffice||0;
    var fv = computeFranchiseValue(original);
    return Math.round(base*(ext.upfrontFactor||0)*(0.5+fv/100));
  }

export function extensionLumpPayout(ext, original){
    var base = original.totalBoxOffice||0;
    var fv = computeFranchiseValue(original);
    return Math.round(base*(ext.payoutFactor||0)*(0.5+fv/100));
  }

export function developFranchiseProduction(original, ext){
    var base = original.story ? JSON.parse(JSON.stringify(original.story)) : neutralStory(original.genre);
    Object.keys(ext.storyMod||{}).forEach(function(k){
      base[k] = clamp((base[k]||50)+ext.storyMod[k], 0, 100);
    });
    base.wordCount = Math.max(base.wordCount, 50);
    base.appliedRewrites = [];
    game.currentScript = base;
    game.pendingFranchiseLink = { originalId: original.id, extensionType: ext.id, originalTitle: original.title };
    movieTitleInput.value = original.title+' — '+ext.label;
    synopsisInput.value = base.synopsis || ('A '+ext.label.toLowerCase()+' to '+original.title+'.');
    synopsisWordCount.textContent = base.wordCount+' words';
    genreSelect.value = ext.genreLock || original.genre;
    renderScriptReport();
    var devBtn = document.querySelector('.tab-btn[data-tab="development"]');
    if(devBtn) devBtn.click();
    addNews('🎞 Developing a '+ext.label+' to "'+original.title+'." Head to Development to cast and green-light it.');
    renderAll();
  }

export function launchPassiveExtension(original, ext){
    var cost = extensionCost(ext, original);
    if(cost>player.cash){
      if(!confirm('This deal costs '+formatMoney(cost)+', putting the studio further into debt. Proceed?')) return;
    }
    player.cash -= cost;
    var quarterly = extensionQuarterlyPayout(ext, original);
    var upfront = ext.upfrontFactor ? extensionUpfrontPayout(ext, original) : 0;
    if(upfront>0) player.cash += upfront;
    if(quarterly>0){
      player.passiveIncomeStreams.push({ id:uid(), label:ext.label, sourceTitle:original.title, quarterlyAmount:quarterly, quartersRemaining:ext.quarters, totalQuarters:ext.quarters });
    }
    if(ext.prestige) applyPrestigeDelta(player, ext.prestige);
    original.franchiseExtensions = original.franchiseExtensions||[];
    original.franchiseExtensions.push({ type:ext.id, label:ext.label, week:game.processedWeek });
    addNews('🎞 '+ext.label+' launched for "'+original.title+'" — '+formatMoney(cost)+' upfront'+(upfront>0?', '+formatMoney(upfront)+' licensing fee':'')+(quarterly>0?', '+formatMoney(quarterly)+'/quarter for '+ext.quarters+' quarters':'')+'.');
    renderAll();
  }

export function launchLumpExtension(original, ext){
    var cost = extensionCost(ext, original);
    if(cost>player.cash){
      if(!confirm('This deal costs '+formatMoney(cost)+', putting the studio further into debt. Proceed?')) return;
    }
    player.cash -= cost;
    var payout = extensionLumpPayout(ext, original);
    player.cash += payout;
    if(ext.prestige) applyPrestigeDelta(player, ext.prestige);
    original.franchiseExtensions = original.franchiseExtensions||[];
    original.franchiseExtensions.push({ type:ext.id, label:ext.label, week:game.processedWeek });
    addNews('🎞 '+ext.label+' launched for "'+original.title+'" — '+formatMoney(cost)+' spent, '+formatMoney(payout)+' earned.');
    renderAll();
  }

export function addLongTailLicensing(movie){
    if(movie.quality<40) return;
    var qualityFactor = 0.5+movie.quality/100;
    var quarterlyAmt = Math.round((movie.totalBoxOffice||0)*0.006*qualityFactor);
    if(quarterlyAmt>0){
      player.passiveIncomeStreams.push({ id:uid(), label:'Long-Tail Licensing', sourceTitle:movie.title, quarterlyAmount:quarterlyAmt, quartersRemaining:12, totalQuarters:12 });
    }
  }

export function tickPassiveIncome(){
    while(game.processedWeek - game.passiveIncomeQuarterStart >= 13){
      game.passiveIncomeQuarterStart += 13;
      var totalPaid = 0, payCount = 0;
      player.passiveIncomeStreams.forEach(function(s){
        if(s.quartersRemaining>0){
          player.cash += s.quarterlyAmount;
          totalPaid += s.quarterlyAmount;
          payCount++;
          s.quartersRemaining--;
        }
      });
      player.passiveIncomeStreams = player.passiveIncomeStreams.filter(function(s){ return s.quartersRemaining>0; });
      if(totalPaid>0){ addNews('📼 Long-term revenue payout: '+formatMoney(totalPaid)+' across '+payCount+' active deal(s).'); }
    }
  }

