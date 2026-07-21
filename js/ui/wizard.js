import { GENRE_GRADIENTS, escapeHtml, formatMoney, rollProducerNegotiation } from '../data/constants.js';
import { game } from '../state/game-state.js';
import { RELEASE_STRATEGIES } from '../systems/release-strategy.js';
import { weekInYearOf, yearOf } from '../systems/market.js';
import { genreSelect, movieCardCast, movieCardMeta, movieCardQH, movieCardRiskLabel, movieCardRows, movieCardTitle, movieTaglineInput, movieTitleInput, moviePoster, moviePosterBadge, moviePosterTitle, negotiateBtn, negotiateResult, ratingSelect, riskMarker, scheduleRange, strategySelect, wizardStepDots, wizardStepPanels } from './dom-refs.js';
import { genreBadgeSVG } from './genre-badges.js';
import { computeGreenlightPreview, getSelectedTalent } from './render.js';
import { tutorialOnWizardStep } from './tutorial.js';

export function goToStep(n){
  wizardStepDots.forEach(function(d){
    var s = Number(d.getAttribute('data-step'));
    d.classList.toggle('active', s===n);
    d.classList.toggle('done', s<n);
  });
  wizardStepPanels.forEach(function(p){
    p.classList.toggle('active', Number(p.getAttribute('data-step'))===n);
  });
  tutorialOnWizardStep(n);
}

function initials(name){
  return (name||'?').split(' ').map(function(w){ return w.charAt(0); }).join('').slice(0,2).toUpperCase();
}

// The wizard's persistent live preview — reads the same form fields the budget summary
// and Greenlight review already read, via the same shared computeGreenlightPreview(), so
// it can never disagree with what the actual review dialog shows a step later.
export function renderMovieCard(){
  var title = movieTitleInput.value.trim() || 'Untitled Picture';
  var genre = genreSelect.value;
  moviePoster.style.background = GENRE_GRADIENTS[genre] || GENRE_GRADIENTS.Action;
  if(moviePosterBadge){ moviePosterBadge.innerHTML = genreBadgeSVG(genre, 34); }
  moviePosterTitle.innerHTML = escapeHtml(title.toUpperCase()).replace(/ /g, '<br>');
  movieCardTitle.textContent = title;
  movieCardMeta.textContent = genre+' · '+ratingSelect.value+(movieTaglineInput.value.trim() ? ' · "'+movieTaglineInput.value.trim()+'"' : '');

  var sel = getSelectedTalent();
  if(!sel.w || !sel.d || !sel.p || !sel.c || !sel.s1 || !sel.s2){ return; }

  movieCardCast.innerHTML = [
    { p:sel.w, role:'Writer' }, { p:sel.d, role:'Director' }, { p:sel.s1, role:'Star' }, { p:sel.s2, role:'Star' }
  ].map(function(c){
    var isSpecialist = c.p.specialty===genre;
    return '<span class="cast-avatar'+(isSpecialist?' specialist':'')+'" title="'+escapeHtml(c.p.name)+' — '+c.role+(isSpecialist?' (★ '+genre+' specialist)':'')+'">'+initials(c.p.name)+(isSpecialist?'<span class="specialist-star">★</span>':'')+'</span>';
  }).join('');

  var p = computeGreenlightPreview();
  movieCardRiskLabel.textContent = 'BUDGET RISK · '+p.riskCls.replace('risk-','').toUpperCase();
  movieCardRiskLabel.className = 'movie-card-risk-label '+p.riskCls;
  riskMarker.style.left = p.riskPct+'%';
  movieCardQH.textContent = 'Quality '+p.qEst+' · Hype '+p.hEst;

  var weeksOut = Number(scheduleRange.value);
  var targetWeek = game.processedWeek+1+weeksOut;
  var strategy = RELEASE_STRATEGIES.filter(function(s){ return s.id===strategySelect.value; })[0];
  movieCardRows.innerHTML =
    '<div class="movie-card-row"><span>Production budget</span><span>'+formatMoney(p.total)+'</span></div>'+
    '<div class="movie-card-row"><span>Lead</span><span>'+escapeHtml(sel.s1.name)+' — Star power '+sel.s1.starPower+'</span></div>'+
    '<div class="movie-card-row"><span>Release window</span><span>'+(strategy?strategy.name:'')+' · Week '+weekInYearOf(targetWeek)+', Year '+yearOf(targetWeek)+'</span></div>';

  renderNegotiateState();
}

// Negotiation state lives here, keyed to the exact five people it was rolled for —
// changing any one of them naturally invalidates the old result without a separate
// reset listener, since the discount simply stops matching whoever's newly selected.
var negotiationState = null; // { key, results, lines }

function negotiationKey(sel){
  return [sel.w.id, sel.d.id, sel.c.id, sel.s1.id, sel.s2.id].join('|');
}

function negotiationRoles(sel){
  var roles = [
    { key:'writer', person:sel.w }, { key:'director', person:sel.d },
    { key:'star1', person:sel.s1 }, { key:'star2', person:sel.s2 }
  ];
  if(!sel.c.isLibrary){ roles.push({ key:'composer', person:sel.c }); } // nothing to negotiate on a flat licensing fee
  return roles;
}

// Read by computeGreenlightPreview / renderBudgetSummary / confirmGreenlight — returns
// 0 unless there's a still-valid result for exactly this cast.
export function getNegotiatedDiscount(roleKey, sel){
  if(!negotiationState || negotiationState.key!==negotiationKey(sel)) return 0;
  return negotiationState.results[roleKey] || 0;
}

export function renderNegotiateState(){
  if(!negotiateBtn) return;
  var sel = getSelectedTalent();
  if(sel.p.isSelf){
    negotiateBtn.style.display = 'none';
    negotiateResult.innerHTML = '';
    return;
  }
  negotiateBtn.style.display = '';
  var validForCurrentCast = negotiationState && negotiationState.key===negotiationKey(sel);
  negotiateBtn.disabled = validForCurrentCast;
  negotiateBtn.textContent = validForCurrentCast ? '🤝 Deal Already Worked for This Team' : '🤝 Ask '+sel.p.name+' to Work the Deal';
  negotiateResult.innerHTML = validForCurrentCast ? negotiationState.lines.map(function(l){
    return '<div class="mini-row"><div class="mini-row-top"><span>'+(l.succeeded?'✅':'❌')+' '+escapeHtml(l.name)+'</span>'+
      '<span style="color:'+(l.succeeded?'var(--emerald)':'var(--ink-dim)')+';">'+(l.succeeded?'-'+Math.round(l.pct*100)+'%':'Won\u2019t move')+'</span></div></div>';
  }).join('') : '';
}

export function runNegotiation(){
  var sel = getSelectedTalent();
  if(sel.p.isSelf) return;
  var roll = rollProducerNegotiation(sel.p, negotiationRoles(sel));
  negotiationState = { key: negotiationKey(sel), results: roll.results, lines: roll.lines };
  renderNegotiateState();
}

export function resetNegotiation(){
  negotiationState = null;
}
