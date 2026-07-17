import { STUDIO_TIERS, escapeHtml, findTier, formatMoney } from './data/constants.js';
import { confirmGreenlight, fastForwardShoot, greenlightCancel, greenlightDelay, greenlightIncreaseBudget, greenlightReduceScope, openGreenlightReview, processNextWeek } from './flow/production-flow.js';
import { advanceWeek } from './flow/turn-flow.js';
import { finalizeInternational, finalizeStreamingDeal, skipInternational, updateStreamingPreview } from './flow/release-flow.js';
import { SAVE_KEY, exportSaveFile, foundNewStudio, game, importSaveFile, loadGameFromLocalStorage, player, saveGameToLocalStorage } from './state/game-state.js';
import { advanceBackgroundSim } from './systems/ai-studios.js';
import { maybeShowNextAward } from './systems/awards.js';
import { checkSeasonGoalYearEnd } from './systems/season-goals.js';
import { goPublic, investorTerms, loanInterestRate, takeLoan, takeProfitShareDeal, yearOf } from './systems/market.js';
import { REWRITE_OPTIONS, analyzeSynopsis, scaledCost } from './systems/release-strategy.js';
import { analyzeScriptBtn, awardsCloseBtn, awardsModal, backToLaunchChoiceBtn, chBillboards, chOnline, chTV, chTrailers, clearScriptBtn, composerSelect, confirmInternationalBtn, continueSavedGameBtn, demographicSelect, directorSelect, exportSaveBtn, fastForwardBtn, festivalSelect, filmingFastForwardBtn, finalizeStreamingBtn, foundStudioBtn, genreSelect, goPublicBtn, greenlightCancelBtn, greenlightConfirmBtn, greenlightDelayBtn, greenlightIncreaseBudgetBtn, greenlightModal, greenlightReduceScopeBtn, greenlightRewriteBtn, importFileInput, importSaveBtn, launchChoicePanel, loadGameBtn, loanAmountRange, loanAmountValue, marketingRange, movieTaglineInput, movieTitleInput, newStudioFormPanel, newStudioNameInput, nowShowingContent, nowShowingPlaceholder, objectivePrimaryBtn, outcomeSummary, outcomeSummaryCloseBtn, producerSelect, ratingSelect, releaseBtn, resetBtn, rewriteOptionsList, runtimeRange, saveGameBtn, scheduleRange, sfxRange, showNewStudioFormBtn, skipInternationalBtn, skipWeeksBtn, skipWeeksSelect, skipYearBtn, star1Select, star2Select, strategySelect, streamingPlatformSelect, streamingWindowSelect, studioCreationModal, studioNameInput, summaryCloseBtn, summaryModal, synopsisInput, synopsisWordCount, tabBtns, tabPanels, takeEquityBtn, takeInvestorBtn, takeLoanBtn, talentRoleFilter, talentSortBy, theaterRange, themeToggleBtn, tierOptionsList, wizardBackBtns, wizardNextBtns, writerSelect } from './ui/dom-refs.js';
import { addNews, populateTalentSelects, renderAll, renderBudgetSummary, renderScriptReport } from './ui/render.js';
import { renderTalentTab } from './ui/talent-tab.js';
import { goToStep, renderMovieCard } from './ui/wizard.js';

tabBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var tabId = btn.getAttribute('data-tab');
      tabBtns.forEach(function(b){ b.classList.toggle('active', b===btn); });
      tabPanels.forEach(function(p){ p.classList.toggle('active', p.id==='tab-'+tabId); });
      renderAll();
    });
  });

objectivePrimaryBtn.addEventListener('click', function(){
    var action = objectivePrimaryBtn.getAttribute('data-action');
    if(action==='advance'){
      advanceWeek();
    } else {
      var devTab = document.querySelector('.tab-btn[data-tab="development"]');
      if(devTab) devTab.click();
    }
  });

outcomeSummaryCloseBtn.addEventListener('click', function(){
    outcomeSummary.classList.add('hidden');
  });

synopsisInput.addEventListener('input', function(){
    var wc = synopsisInput.value.trim().split(/\s+/).filter(Boolean).length;
    var label = wc+' words';
    if(wc>0 && wc<50) label += ' (min 50)';
    else if(wc>500) label += ' (max 500)';
    synopsisWordCount.textContent = label;
  });

analyzeScriptBtn.addEventListener('click', function(){
    var text = synopsisInput.value.trim();
    var wordCount = text.split(/\s+/).filter(Boolean).length;
    if(wordCount<50){ alert('Write at least 50 words so there\u2019s something to analyze.'); return; }
    if(wordCount>500){ alert('Keep it to 500 words or fewer \u2014 a synopsis, not a screenplay.'); return; }
    game.currentScript = analyzeSynopsis(text, wordCount);
    renderScriptReport();
    addNews('📝 Script analyzed — '+game.currentScript.primaryGenre+', '+game.currentScript.tone+'.');
  });

rewriteOptionsList.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('.rewrite-btn') : null;
    if(!btn || btn.disabled || !game.currentScript) return;
    var rewriteId = btn.getAttribute('data-rewrite');
    var r = REWRITE_OPTIONS.filter(function(x){ return x.id===rewriteId; })[0];
    if(!r) return;
    var cost = scaledCost(r.baseCost);
    if(cost>player.cash){ alert('Not enough cash for this rewrite.'); return; }
    player.cash -= cost;
    r.apply(game.currentScript);
    game.currentScript.appliedRewrites.push(r.id);
    advanceBackgroundSim(game.processedWeek+1);
    addNews('✏️ Rewrite: '+r.label+' ('+formatMoney(cost)+', 1 week).');
    renderAll();
  });

clearScriptBtn.addEventListener('click', function(){
    game.currentScript = null;
    synopsisInput.value = '';
    synopsisWordCount.textContent = '0 words';
    renderScriptReport();
  });

loanAmountRange.addEventListener('input', function(){
    loanAmountValue.textContent = formatMoney(Number(loanAmountRange.value));
  });

takeLoanBtn.addEventListener('click', function(){
    var amt = Number(loanAmountRange.value);
    if(amt<250000) return;
    takeLoan(amt);
    addNews('🏦 Took a '+formatMoney(amt)+' bank loan at '+Math.round(loanInterestRate()*100)+'% APR.');
    renderAll();
  });

takeInvestorBtn.addEventListener('click', function(){
    if(takeInvestorBtn.disabled) return;
    var terms = investorTerms('investor');
    if(confirm('Accept '+formatMoney(terms.maxAmount)+' from private investors in exchange for '+terms.sharePercent.toFixed(1)+'% of future movie profits, indefinitely?')){
      takeProfitShareDeal('investor');
      addNews('🤝 Signed a private investor deal: '+formatMoney(terms.maxAmount)+' for '+terms.sharePercent.toFixed(1)+'% of future profits.');
      renderAll();
    }
  });

takeEquityBtn.addEventListener('click', function(){
    if(takeEquityBtn.disabled) return;
    var terms = investorTerms('equity');
    if(confirm('Accept '+formatMoney(terms.maxAmount)+' from a private equity firm in exchange for '+terms.sharePercent.toFixed(1)+'% of future movie profits, indefinitely?')){
      takeProfitShareDeal('equity');
      addNews('🏛 Signed a private equity deal: '+formatMoney(terms.maxAmount)+' for '+terms.sharePercent.toFixed(1)+'% of future profits.');
      renderAll();
    }
  });

goPublicBtn.addEventListener('click', function(){
    if(goPublicBtn.disabled) return;
    if(confirm('Take '+player.name+' public? This is permanent — quarterly earnings expectations begin immediately, and badly missing them triggers a shareholder revolt.')){
      goPublic();
      renderAll();
    }
  });

['input','change'].forEach(function(evt){
    [genreSelect, writerSelect, directorSelect, producerSelect, composerSelect, star1Select, star2Select,
     sfxRange, marketingRange, theaterRange, chTrailers, chBillboards, chOnline, chTV,
     strategySelect, scheduleRange, runtimeRange, ratingSelect, demographicSelect, festivalSelect,
     movieTitleInput, movieTaglineInput].forEach(function(el){
      el.addEventListener(evt, renderBudgetSummary);
      el.addEventListener(evt, renderMovieCard);
    });
  });

wizardNextBtns.forEach(function(btn){
    btn.addEventListener('click', function(){ goToStep(Number(btn.getAttribute('data-goto'))); });
  });
wizardBackBtns.forEach(function(btn){
    btn.addEventListener('click', function(){ goToStep(Number(btn.getAttribute('data-goto'))); });
  });

releaseBtn.addEventListener('click', openGreenlightReview);
greenlightConfirmBtn.addEventListener('click', confirmGreenlight);
greenlightDelayBtn.addEventListener('click', greenlightDelay);
greenlightRewriteBtn.addEventListener('click', function(){
  greenlightModal.classList.add('hidden');
  var devTab = document.querySelector('.tab-btn[data-tab="development"]');
  if(devTab) devTab.click();
});
greenlightReduceScopeBtn.addEventListener('click', greenlightReduceScope);
greenlightIncreaseBudgetBtn.addEventListener('click', greenlightIncreaseBudget);
greenlightCancelBtn.addEventListener('click', greenlightCancel);

fastForwardBtn.addEventListener('click', function(){
    var run = game.currentRun;
    if(!run) return;
    var guard = 0;
    while(game.currentRun && guard<45){ processNextWeek(); guard++; }
  });
filmingFastForwardBtn.addEventListener('click', fastForwardShoot);

confirmInternationalBtn.addEventListener('click', finalizeInternational);

skipInternationalBtn.addEventListener('click', skipInternational);

streamingPlatformSelect.addEventListener('change', updateStreamingPreview);

streamingWindowSelect.addEventListener('change', updateStreamingPreview);

finalizeStreamingBtn.addEventListener('click', finalizeStreamingDeal);

summaryCloseBtn.addEventListener('click', function(){
    summaryModal.classList.add('hidden');
    movieTitleInput.value = '';
    movieTaglineInput.value = '';
    synopsisInput.value = '';
    synopsisWordCount.textContent = '0 words';
    nowShowingPlaceholder.classList.remove('hidden');
    nowShowingContent.classList.add('hidden');
    renderAll();
    maybeShowNextAward();
  });

awardsCloseBtn.addEventListener('click', function(){
    awardsModal.classList.add('hidden');
    renderAll();
    maybeShowNextAward();
  });

skipWeeksBtn.addEventListener('click', function(){
    if(game.currentRun || game.currentShoot) return;
    var n = Number(skipWeeksSelect.value);
    advanceBackgroundSim(game.processedWeek+n);
    addNews('⏭️ '+n+' week(s) passed at the lot.');
    renderAll();
    maybeShowNextAward();
  });

skipYearBtn.addEventListener('click', function(){
    if(game.currentRun || game.currentShoot) return;
    var target = yearOf(game.processedWeek+1)*52;
    var finalTarget = target>game.processedWeek ? target : target+52;
    advanceBackgroundSim(finalTarget);
    addNews('⏭️ Skipped ahead to the end of the year.');
    renderAll();
    maybeShowNextAward();
  });

studioNameInput.addEventListener('input', function(){
    player.name = studioNameInput.value.trim() || 'Player Studio';
  });

resetBtn.addEventListener('click', function(){
    if(confirm('Start a brand new studio? All current progress will be lost.')){
      location.reload();
    }
  });

export function renderTierOptions(){
    tierOptionsList.innerHTML = STUDIO_TIERS.map(function(t){
      return '<label class="tier-card">'+
        '<input type="radio" name="tierChoice" value="'+t.id+'"'+(t.id==='indie'?' checked':'')+'>'+
        '<div class="tier-card-body">'+
          '<div class="tier-card-title">'+escapeHtml(t.name)+' <span class="tier-card-cash">'+formatMoney(t.cash)+'</span></div>'+
          '<div class="tier-card-stats">Starting Prestige '+t.prestige+' • Weekly Overhead '+formatMoney(t.overhead)+' • Investor Expectation '+t.expectation.toFixed(2)+'x</div>'+
          '<div class="tier-card-blurb">'+escapeHtml(t.blurb)+'</div>'+
        '</div>'+
      '</label>';
    }).join('');
  }

export function beginStudioCreationScreen(){
    renderTierOptions();
    var hasSave = false;
    try{ hasSave = !!localStorage.getItem(SAVE_KEY); }catch(e){ hasSave = false; }
    launchChoicePanel.classList.toggle('hidden', !hasSave);
    newStudioFormPanel.classList.toggle('hidden', hasSave);
    backToLaunchChoiceBtn.classList.toggle('hidden', !hasSave);
  }

export function applyStarterDefaults(){
    populateTalentSelects();
    // A cheap-crew + cheap-star combination looks like the "true indie" choice, but it
    // isn't viable: writer/director skill drives Quality (and, through it, how well a
    // run holds its legs week to week), while star power drives Hype — and Hype weights
    // star power at 40%, a gap marketing spend alone can't close at an indie budget.
    // Cutting both corners at once reliably bombs regardless of how the sliders are set.
    // This combination — solid-but-not-elite crew, real (if modest) star power — was
    // verified empirically to produce a healthy mix of outcomes, not a guaranteed loss.
    setDefaultSelect(writerSelect, 'w3');
    setDefaultSelect(directorSelect, 'd3');
    setDefaultSelect(producerSelect, 'self');
    setDefaultSelect(composerSelect, 'library');
    setDefaultSelect(star1Select, 's7');
    setDefaultSelect(star2Select, 's11');
    goToStep(1);
    renderMovieCard();
  }

talentRoleFilter.addEventListener('change', renderTalentTab);
talentSortBy.addEventListener('change', renderTalentTab);

showNewStudioFormBtn.addEventListener('click', function(){
    launchChoicePanel.classList.add('hidden');
    newStudioFormPanel.classList.remove('hidden');
  });

backToLaunchChoiceBtn.addEventListener('click', function(){
    newStudioFormPanel.classList.add('hidden');
    launchChoicePanel.classList.remove('hidden');
  });

foundStudioBtn.addEventListener('click', function(){
    var chosen = document.querySelector('input[name="tierChoice"]:checked');
    var tier = findTier(chosen ? chosen.value : 'indie');
    var name = newStudioNameInput.value.trim() || 'Player Studio';
    foundNewStudio(tier, name);
    game.currentScript = null;
    game.seasonGoal = null;
    checkSeasonGoalYearEnd();
    synopsisInput.value = '';
    synopsisWordCount.textContent = '0 words';
    studioCreationModal.classList.add('hidden');
    applyStarterDefaults();
    renderAll();
    addNews('🎥 '+escapeHtml(player.name)+' opens its doors as a '+tier.name+'. Good luck, mogul.');
  });

continueSavedGameBtn.addEventListener('click', function(){
    loadGameFromLocalStorage();
    applyStarterDefaults();
    studioCreationModal.classList.add('hidden');
  });

saveGameBtn.addEventListener('click', saveGameToLocalStorage);

loadGameBtn.addEventListener('click', function(){ loadGameFromLocalStorage(); populateTalentSelects(); });

exportSaveBtn.addEventListener('click', exportSaveFile);

importSaveBtn.addEventListener('click', function(){ importFileInput.click(); });

importFileInput.addEventListener('change', function(){
    if(importFileInput.files && importFileInput.files[0]){
      importSaveFile(importFileInput.files[0]);
      importFileInput.value = '';
    }
  });

export var THEME_KEY = 'marqueeLedgerTheme';

export function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    themeToggleBtn.textContent = theme==='light' ? '☀️ Light' : '🌙 Dark';
  }

export function loadSavedTheme(){
    var saved = null;
    try{ saved = localStorage.getItem(THEME_KEY); }catch(e){ saved = null; }
    applyTheme(saved==='light' ? 'light' : 'dark');
  }

themeToggleBtn.addEventListener('click', function(){
    var current = document.documentElement.getAttribute('data-theme');
    var next = current==='light' ? 'dark' : 'light';
    applyTheme(next);
    try{ localStorage.setItem(THEME_KEY, next); }catch(e){ /* theme just won't persist across sessions here */ }
  });

export function setDefaultSelect(selectEl, value){
    for(var i=0;i<selectEl.options.length;i++){
      if(selectEl.options[i].value===value){ selectEl.selectedIndex = i; return; }
    }
  }

export function init(){
    loadSavedTheme();
    try{
      beginStudioCreationScreen();
    }catch(err){
      var banner = document.getElementById('fatalErrorBanner');
      var detail = document.getElementById('fatalErrorDetail');
      if(detail) detail.textContent = (err && err.message) ? err.message : String(err);
      if(banner) banner.style.display = 'block';
      throw err; // still surface to console / the global handler for anyone debugging
    }
  }

init();

