import { escapeHtml, formatMoney } from '../data/constants.js';
import { game } from '../state/game-state.js';
import { RELEASE_STRATEGIES } from '../systems/release-strategy.js';
import { weekInYearOf, yearOf } from '../systems/market.js';
import { genreSelect, movieCardCast, movieCardMeta, movieCardQH, movieCardRiskLabel, movieCardRows, movieCardTitle, movieTaglineInput, movieTitleInput, moviePoster, moviePosterTitle, ratingSelect, riskMarker, scheduleRange, strategySelect, wizardStepDots, wizardStepPanels } from './dom-refs.js';
import { computeGreenlightPreview, getSelectedTalent } from './render.js';

var GENRE_GRADIENTS = {
  'Action': 'linear-gradient(160deg, #4a1810, #200a05)',
  'Animation': 'linear-gradient(160deg, #1a4a3a, #0a1f18)',
  'Comedy': 'linear-gradient(160deg, #4a3a10, #201808)',
  'Drama': 'linear-gradient(160deg, #1a2a4a, #0a1220)',
  'Horror': 'linear-gradient(160deg, #2a0a0a, #0a0202)',
  'Sci-Fi': 'linear-gradient(160deg, #10304a, #051220)'
};

export function goToStep(n){
  wizardStepDots.forEach(function(d){
    var s = Number(d.getAttribute('data-step'));
    d.classList.toggle('active', s===n);
    d.classList.toggle('done', s<n);
  });
  wizardStepPanels.forEach(function(p){
    p.classList.toggle('active', Number(p.getAttribute('data-step'))===n);
  });
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
  moviePosterTitle.innerHTML = escapeHtml(title.toUpperCase()).replace(/ /g, '<br>');
  movieCardTitle.textContent = title;
  movieCardMeta.textContent = genre+' · '+ratingSelect.value+(movieTaglineInput.value.trim() ? ' · "'+movieTaglineInput.value.trim()+'"' : '');

  var sel = getSelectedTalent();
  if(!sel.w || !sel.d || !sel.p || !sel.c || !sel.s1 || !sel.s2){ return; }

  movieCardCast.innerHTML = [
    { p:sel.w, role:'Writer' }, { p:sel.d, role:'Director' }, { p:sel.s1, role:'Star' }, { p:sel.s2, role:'Star' }
  ].map(function(c){
    return '<span class="cast-avatar" title="'+escapeHtml(c.p.name)+' — '+c.role+'">'+initials(c.p.name)+'</span>';
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
}
