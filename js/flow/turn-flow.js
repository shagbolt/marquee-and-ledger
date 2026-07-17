import { formatMoney } from '../data/constants.js';
import { game, newsLog, player } from '../state/game-state.js';
import { advanceOneWeek } from '../systems/ai-studios.js';
import { maybeShowNextAward } from '../systems/awards.js';
import { outcomeSummary, outcomeSummaryBody } from '../ui/dom-refs.js';
import { isAnyModalBlocking, renderObjectiveCard } from '../ui/objective.js';
import { renderAll } from '../ui/render.js';
import { processNextWeek, processShootWeek } from './production-flow.js';

// The single entry point for time passing, in every phase. Each phase already owns its
// own per-week logic (processShootWeek, processNextWeek, advanceOneWeek for idle weeks)
// — this just decides which one owns the *current* week and runs it once, then shows
// what changed. No phase auto-advances on its own; every week is this function being
// called, once, from an explicit click (or from a Fast Forward loop calling the
// phase-specific function directly, bypassing this dispatcher on purpose).
export function advanceWeek(){
  if(isAnyModalBlocking()) return;

  var cashBefore = player.cash;
  var prestigeBefore = player.prestige;
  var newsCountBefore = newsLog.length;

  if(game.currentShoot){
    processShootWeek();
  } else if(game.currentRun){
    processNextWeek();
  } else {
    advanceOneWeek();
  }

  maybeShowNextAward();
  renderAll();
  renderObjectiveCard();
  showOutcomeSummary(cashBefore, prestigeBefore, newsCountBefore);
}

function showOutcomeSummary(cashBefore, prestigeBefore, newsCountBefore){
  var cashDelta = player.cash-cashBefore;
  var prestigeDelta = Math.round(player.prestige-prestigeBefore);
  var newEntries = newsLog.slice(0, Math.max(0, newsLog.length-newsCountBefore));

  var lines = [];
  lines.push('<div class="outcome-line"><span>Cash</span><span style="color:'+(cashDelta>=0?'var(--emerald)':'var(--crimson)')+'">'+(cashDelta>=0?'+':'')+formatMoney(cashDelta)+'</span></div>');
  if(prestigeDelta!==0){
    lines.push('<div class="outcome-line"><span>Prestige</span><span style="color:'+(prestigeDelta>=0?'var(--emerald)':'var(--crimson)')+'">'+(prestigeDelta>=0?'+':'')+prestigeDelta+'</span></div>');
  }
  if(newEntries.length>0){
    lines.push('<div class="outcome-news">'+newEntries.slice(0,3).map(function(n){ return '<p>'+n+'</p>'; }).join('')+'</div>');
  }
  outcomeSummaryBody.innerHTML = lines.join('');
  outcomeSummary.classList.remove('hidden');
}
