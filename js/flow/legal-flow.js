import { eventBody, eventModal } from '../ui/dom-refs.js';
import { renderDecisionCard, renderDecisionOutcome } from '../ui/decision-card.js';
import { renderAll } from '../ui/render.js';
import { maybeTriggerLegalCase } from '../systems/legal.js';

// A Legal case is a studio-level event, not tied to any single movie in
// production, so it reuses renderDecisionCard/renderDecisionOutcome directly
// rather than going through production-flow.js's movie-shoot wiring. The
// "context" object stands in for the `movie` argument those functions expect —
// they're generic and don't assume any particular shape.
export function openLegalCase(legalCase){
  renderDecisionCard('\u2696\ufe0f LEGAL DEPARTMENT', legalCase, legalCase.ctx);
  var btns = eventBody.querySelectorAll('.decision-choice-btn');
  btns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var key = btn.getAttribute('data-key');
      var choice = legalCase.choices.filter(function(c){ return c.key===key; })[0];
      var outcome = choice.apply();
      renderAll();
      renderDecisionOutcome(outcome, 'Back to the Lot \u2192');
      document.getElementById('eventContinueBtn').addEventListener('click', function(){
        eventModal.classList.add('hidden');
        renderAll();
      });
    });
  });
}

// Call after any settlement receipt closes. Returns true if a case was opened.
export function checkLegalTrigger(){
  var legalCase = maybeTriggerLegalCase();
  if(legalCase){
    openLegalCase(legalCase);
    return true;
  }
  return false;
}
