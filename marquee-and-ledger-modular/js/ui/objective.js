import { currentTier, game, player } from '../state/game-state.js';
import { formatMoney } from '../data/constants.js';
import { getSeasonGoalLabel, getSeasonGoalProgress } from '../systems/season-goals.js';
import { eventModal, greenlightModal, objectiveCard, objectiveContext, objectiveIcon, objectivePrimaryBtn, objectiveTitle, postProductionModal, seasonGoalFill, seasonGoalLabel, skipWeeksBtn, skipYearBtn, testScreeningModal } from './dom-refs.js';

// True whenever a decision the player must resolve is already on screen — the Advance
// Week button disables rather than silently doing nothing, since a modal blocking the
// view means there's nothing for it to advance past yet.
export function isAnyModalBlocking(){
  return !eventModal.classList.contains('hidden') ||
         !postProductionModal.classList.contains('hidden') ||
         !testScreeningModal.classList.contains('hidden') ||
         !greenlightModal.classList.contains('hidden');
}

// No single "phase" field exists in game state — this reads the same flags the rest of
// the app already uses (game.currentShoot, game.currentRun, cash) rather than tracking
// a second, parallel notion of phase that could drift out of sync.
export function getCurrentObjective(){
  if(game.currentShoot){
    var s = game.currentShoot;
    var total = s.movie.productionWeeks+s.extraWeeks;
    var justStarted = s.weekIndex===0;
    return {
      phase:'filming', icon:'🎥', title:'Filming — '+s.movie.title,
      context: justStarted ? 'Cameras are set. Advance the week to begin shooting.' : 'Week '+s.weekIndex+' of '+total+' — crew morale '+Math.round(s.movie.shootMorale)+'.',
      actionLabel:'⏭ Advance Week', action:'advance'
    };
  }
  if(game.currentRun){
    var r = game.currentRun;
    var notYetOpen = r.weekIndex===0;
    return {
      phase:'theaters', icon:'🎟', title:'In Theaters — '+r.movie.title,
      context: notYetOpen ? 'Ready for opening weekend. Advance the week to open.' : 'Week '+r.weekIndex+' of its run — '+formatMoney(r.cumulative)+' so far.',
      actionLabel:'⏭ Advance Week', action:'advance'
    };
  }
  var weeklyOverhead = currentTier ? currentTier.overhead : 20000;
  var strained = player.cash<0 || player.cash<weeklyOverhead*4;
  if(strained){
    return {
      phase:'recovering', icon:'⚠️', title:'Studio in Trouble',
      context:'Cash is critically low against weekly overhead. Check Finance for a loan or investor deal before it catches up with you.',
      actionLabel:'⏭ Advance Week', action:'advance'
    };
  }
  if(game.currentScript){
    return {
      phase:'developing', icon:'🎬', title:'Ready to Greenlight',
      context:'You have a script in hand. Cast it and send it to production when you\u2019re ready.',
      actionLabel:'🎬 Go to Development', action:'develop'
    };
  }
  return {
    phase:'idle', icon:'✏️', title:'Between Pictures',
    context:'No script, no production. Head to Development to start your next picture — or just advance the week if you\u2019re waiting on something else.',
    actionLabel:'🎬 Go to Development', action:'develop'
  };
}

export function renderObjectiveCard(){
  var obj = getCurrentObjective();
  objectiveIcon.textContent = obj.icon;
  objectiveTitle.textContent = obj.title;
  objectiveContext.textContent = obj.context;
  objectiveCard.className = 'objective-card obj-'+obj.phase;
  objectivePrimaryBtn.textContent = obj.actionLabel;
  objectivePrimaryBtn.setAttribute('data-action', obj.action);
  objectivePrimaryBtn.disabled = obj.action==='advance' && isAnyModalBlocking();

  var goal = game.seasonGoal;
  if(goal){
    var progress = getSeasonGoalProgress(goal);
    seasonGoalLabel.textContent = '🎯 '+getSeasonGoalLabel(goal);
    if(progress){
      seasonGoalFill.style.width = Math.round(progress.pct)+'%';
      seasonGoalFill.style.background = progress.complete ? 'var(--emerald)' : 'var(--gold)';
    }
  }

  var activeProduction = !!(game.currentShoot || game.currentRun);
  skipWeeksBtn.disabled = activeProduction;
  skipYearBtn.disabled = activeProduction;
}
