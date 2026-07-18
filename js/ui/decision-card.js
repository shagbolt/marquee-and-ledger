import { escapeHtml } from '../data/constants.js';
import { eventBody, eventModal, eventTitle } from './dom-refs.js';

// One shared "decision card" look for every random event in the game — the pre-shoot
// Production Event, Shoot Events, and the Post-Production Additional Photography
// event all render through this rather than each building their own modal markup.
// Test Screening keeps its own layout (its shape — 7 scored metrics plus 7 responses —
// doesn't fit this card format), but borrows the same visual language via shared CSS
// classes so it still reads as part of the same system.
export function renderDecisionCard(kicker, evt, movie){
  eventTitle.textContent = kicker;
  eventBody.innerHTML =
    '<div class="decision-title">'+escapeHtml(evt.title)+'</div>'+
    '<p class="decision-flavor">'+escapeHtml(evt.flavor(movie))+'</p>'+
    '<div class="decision-choices">'+
      evt.choices.map(function(c){
        var recTag = c.recommended ? '<span class="choice-tag choice-tag-rec">★ Recommended</span>' : '';
        var tagsHtml = (c.tags||[]).map(function(t){ return '<span class="choice-tag">'+escapeHtml(t)+'</span>'; }).join('');
        return '<button type="button" class="decision-choice-btn'+(c.recommended?' recommended':'')+'" data-key="'+c.key+'">'+
          '<div class="choice-label">'+escapeHtml(c.label)+'</div>'+
          '<div class="choice-desc">'+escapeHtml(c.description)+'</div>'+
          '<div class="choice-tags">'+recTag+tagsHtml+'</div>'+
          '</button>';
      }).join('')+
      '</div>';
  eventModal.classList.remove('hidden');
}

// The "trade-headline" moment after a choice resolves — a short, punchy result line
// instead of the same plain paragraph the choice description already implied.
export function renderDecisionOutcome(outcomeText, continueLabel){
  eventBody.innerHTML =
    '<div class="decision-outcome"><span class="outcome-flash">✓</span><p>'+outcomeText+'</p></div>'+
    '<button type="button" class="btn-primary" id="eventContinueBtn" style="width:100%;margin-top:6px;">'+escapeHtml(continueLabel)+'</button>';
}
