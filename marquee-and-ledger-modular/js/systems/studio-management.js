import { clamp, formatMoney, randInt } from '../data/constants.js';
import { game, player } from '../state/game-state.js';
import { yearOf } from './market.js';
import { scaledCost } from './release-strategy.js';
import { addNews } from '../ui/render.js';

export var DEPARTMENTS = [
    { id:'finance', name:'Finance', icon:'💰', desc:'Loans, investors, and equity financing.', unlockCheck:function(){ return true; } },
    { id:'casting', name:'Casting', icon:'🎭', desc:'Hire writers, directors, and stars.', unlockCheck:function(){ return true; } },
    { id:'production', name:'Production', icon:'🎬', desc:'Green-light and produce pictures.', unlockCheck:function(){ return true; } },
    { id:'marketing', name:'Marketing', icon:'📣', desc:'Hype, channels, and audience reach.', unlockCheck:function(){ return true; } },
    { id:'streaming', name:'Streaming', icon:'📺', desc:'Post-theatrical distribution deals.', unlockCheck:function(){ return true; } },
    { id:'research', name:'Research', icon:'📈', desc:'Industry trend &amp; genre demand reports.', unlockCheck:function(){ return player.moviesAll.length>=3; }, unlockHint:'Unlocks after 3 releases' },
    { id:'international', name:'International', icon:'🌍', desc:'Worldwide distribution deals.', unlockCheck:function(){ return player.prestige>=40; }, unlockHint:'Unlocks at 40 Prestige' },
    { id:'awardsCampaign', name:'Awards Campaign', icon:'🏆', desc:'Formal awards-season budgeting.', unlockCheck:function(){ return (player.awardsWon||[]).length>=1; }, unlockHint:'Win your first award' },
    { id:'legal', name:'Legal', icon:'⚖️', desc:'Contract disputes &amp; IP defense.', unlockCheck:function(){ return player.prestige>=60; }, unlockHint:'Unlocks at 60 Prestige' }
  ];

export function awardsCampaignUnlocked(){
    return DEPARTMENTS.filter(function(d){ return d.id==='awardsCampaign'; })[0].unlockCheck();
  }

export function awardsCampaignEligibleMovies(){
    if(!awardsCampaignUnlocked()) return [];
    var currentYear = yearOf(game.processedWeek+1);
    return player.moviesAll.filter(function(m){
      return yearOf(m.releaseWeek)===currentYear && !m.awardsCampaignUsed;
    });
  }

export function launchAwardsCampaign(movie){
    var cost = scaledCost(400000);
    player.cash -= cost;
    var boost = randInt(4,8);
    movie.quality = clamp(movie.quality+boost, 0, 100);
    movie.awardsCampaignUsed = true;
    movie.awardsCampaignBoost = boost;
    addNews('🏆 Awards campaign launched for "'+movie.title+'" ('+formatMoney(cost)+'). Quality nudged +'+boost+' for awards consideration.');
    return { cost: cost, boost: boost };
  }

