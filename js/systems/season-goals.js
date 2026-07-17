import { aiStudios, game, player } from '../state/game-state.js';
import { clamp, formatMoney, rand, randInt } from '../data/constants.js';
import { yearOf } from './market.js';
import { addNews } from '../ui/render.js';

var GOAL_TYPES = ['prestige','profit','releases','beatRival'];

export function generateSeasonGoal(year){
  var type = GOAL_TYPES[randInt(0, GOAL_TYPES.length-1)];
  if(type==='prestige'){
    var target = clamp(Math.round(player.prestige+12+rand(0,10)), 5, 100);
    return { type:'prestige', year:year, target:target };
  }
  if(type==='profit'){
    var target = Math.round((Math.max(player.cash,5000000)*0.15+2000000)/100000)*100000;
    return { type:'profit', year:year, target:target, startCash:player.cash };
  }
  if(type==='releases'){
    return { type:'releases', year:year, target:randInt(2,4), startCount:player.moviesAll.length };
  }
  var rival = aiStudios[randInt(0, aiStudios.length-1)];
  return { type:'beatRival', year:year, rivalId:rival.id, startCash:player.cash, rivalStartCash:rival.cash };
}

// Reads live state rather than a label frozen at generation time — a rival's name is
// still correct here even if they've reorganized under a new one mid-year.
export function getSeasonGoalLabel(goal){
  if(!goal) return '';
  if(goal.type==='prestige') return 'Reach '+goal.target+' Prestige by year end';
  if(goal.type==='profit') return 'Turn a profit of '+formatMoney(goal.target)+' this year';
  if(goal.type==='releases') return 'Release '+goal.target+' pictures this year';
  if(goal.type==='beatRival'){
    var rival = aiStudios.filter(function(s){ return s.id===goal.rivalId; })[0];
    return 'End the year with more cash than '+(rival?rival.name:'your rival');
  }
  return '';
}

export function getSeasonGoalProgress(goal){
  if(!goal) return null;
  if(goal.type==='prestige'){
    return { current:Math.round(player.prestige), target:goal.target, pct:clamp(player.prestige/goal.target*100,0,100), complete:player.prestige>=goal.target };
  }
  if(goal.type==='profit'){
    var earned = player.cash-goal.startCash;
    return { current:earned, target:goal.target, pct:clamp(earned/goal.target*100,0,100), complete:earned>=goal.target, isMoney:true };
  }
  if(goal.type==='releases'){
    var count = player.moviesAll.length-goal.startCount;
    return { current:count, target:goal.target, pct:clamp(count/goal.target*100,0,100), complete:count>=goal.target };
  }
  if(goal.type==='beatRival'){
    var rival = aiStudios.filter(function(s){ return s.id===goal.rivalId; })[0];
    var rivalCash = rival ? rival.cash : goal.rivalStartCash;
    var diff = player.cash-rivalCash;
    return { current:player.cash, target:rivalCash, pct: diff>0?100:clamp(50+diff/(2*Math.max(1,Math.abs(goal.rivalStartCash)))*50,0,99), complete:diff>0, isMoney:true };
  }
  return null;
}

// Called every week (from advanceOneWeek, alongside checkAwards — same shared tick,
// same year-turnover pattern already established there).
export function checkSeasonGoalYearEnd(){
  if(!game.seasonGoal){
    game.seasonGoal = generateSeasonGoal(yearOf(game.processedWeek));
    game.lastGoalYear = yearOf(game.processedWeek);
    return;
  }
  while(game.processedWeek >= (game.lastGoalYear+1)*52){
    game.lastGoalYear++;
    var progress = getSeasonGoalProgress(game.seasonGoal);
    var label = getSeasonGoalLabel(game.seasonGoal);
    if(progress){
      if(progress.complete){
        player.prestige = clamp(player.prestige+3, 0, 100);
        addNews('🎯 Season goal achieved: '+label+' Prestige +3.');
      } else {
        addNews('🎯 Season goal missed: '+label);
      }
    }
    game.seasonGoal = generateSeasonGoal(game.lastGoalYear+1);
  }
}
