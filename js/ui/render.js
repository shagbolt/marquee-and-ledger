import { DEMOGRAPHIC_GENRE_FIT, FESTIVALS, GENRES, GENRE_GRADIENTS, LIBRARY_MUSIC, PRACTICAL_EFFECTS, RATING_GENRE_FIT, SELF_PRODUCED, clamp, composerFee, composers, directorFee, directors, escapeHtml, formatMoney, getComposerById, getProducerById, getSfxHouseById, producerFee, producerFeeDiscount, producers, runtimeFitScore, sfxHouseFee, sfxHouses, starFee, stars, writerFee, writers } from '../data/constants.js';
import { PLATFORM_LABELS } from '../flow/release-flow.js';
import { aiStudios, currentTier, finance, game, newsLog, player, prestigeHistory } from '../state/game-state.js';
import { FRANCHISE_EXTENSIONS, computeFranchiseValue, developFranchiseProduction, extensionCost, extensionEligible, extensionLumpPayout, extensionQuarterlyPayout, franchiseEligibleMovies, launchLumpExtension, launchPassiveExtension } from '../systems/franchise.js';
import { buildYearInReviewText, computeIndustryReport, genreDemand, genreRecommendation, getSaturation, investorTerms, ipoEligible, loanInterestRate, maxLoanAmount, prevGenreDemand, studioRecentFocus, weekInYearOf, yearOf } from '../systems/market.js';
import { RELEASE_STRATEGIES, REWRITE_OPTIONS, checkTimingMatch, holidayName, isAwardsSeasonWeek, isSummerWeek, scaledCost } from '../systems/release-strategy.js';
import { DEPARTMENTS, awardsCampaignEligibleMovies, awardsCampaignUnlocked, launchAwardsCampaign } from '../systems/studio-management.js';
import { ensureLegalState, legalDeptUnlocked, legalRiskTierLabel } from '../systems/legal.js';
import { genreBadgeSVG } from './genre-badges.js';
import { studioLogoSVG } from './studio-logo.js';
import { computeHype, computeQuality, prestigeTier } from '../systems/talent-quality.js';
import { renderTalentTab } from './talent-tab.js';
import { renderObjectiveCard } from './objective.js';
import { getPersonality } from '../systems/rival-personalities.js';
import { getNegotiatedDiscount } from './wizard.js';
import { showMovieDetail } from './movie-detail.js';
import { legalCaseLog, legalDeptPanel, legalRiskBar, legalRiskLabel, activeLoansList, awardsCampaignGateHint, awardsCampaignList, awardsHistoryTableBody, boxOfficeIndustryList, boxOfficeYourRelease, budgetSummaryBody, calendarPreview, cashDisplay, competitorsTableBody, composerSelect, demographicSelect, departmentsGrid, directorSelect, genreTrackerList, greenlightBody, greenlightModal, distributionTableBody, internationalTabLock, researchTabLock, rivalTrackerList, recentReleasesList, equityGateHint, festivalDescText, festivalSelect, formWarning, franchiseList, genreDemandTableBody, genreSelect, goPublicBtn, historyTableBody, industryReportBody, internationalLockedBanner, investorConfidenceDisplay, investorTermsDisplay, ipoGateHint, ipoYearDisplay, loanAmountRange, loanAmountValue, loanMaxDisplay, loanRateDisplay, marketingCurrentStats, marketingRange, marketingValue, movieTitleInput, newsFeedList, passiveIncomeBody, preprodPanel, prestigeBarFill, producerSelect, prestigeDisplay, prestigeHistoryList, prestigeMeterPointer, prestigeMeterValue, prestigeTierLabel, profitShareDealsList, propertyFitText, publicCompanyStatus, rankDisplay, ratingSelect, releaseBtn, researchContent, researchLockedBanner, researchLockedHint, revoltCountDisplay, rewriteOptionsList, runtimeRange, runtimeValueText, scheduleRange, scheduleValueText, scriptDevPanel, scriptReportBlock, scriptReportBody, sfxHouseDescText, sfxHouseSelect, sfxRange, sfxValue, slotReportBody, star1Select, star2Select, strategyDescText, strategySelect, studioBioBody, studioDataPanel, studioLogoDisplay, studioNameInput, studioRumorsBody, studioTierLine, takeEquityBtn, takeInvestorBtn, takeLoanBtn, theaterRange, theaterValue, timeControls, weekYearDisplay, writerSelect, yearInReviewText } from './dom-refs.js';

export function computePlayerRank(){
    var ranked = [{name:player.name, prestige:player.prestige, isPlayer:true}];
    aiStudios.forEach(function(s){ ranked.push({name:s.name, prestige:s.prestige}); });
    ranked.sort(function(a,b){ return b.prestige-a.prestige; });
    var rank = 1;
    for(var i=0;i<ranked.length;i++){ if(ranked[i].isPlayer){ rank=i+1; break; } }
    return { rank:rank, total:ranked.length };
  }

export function renderHeader(){
    studioNameInput.value = player.name;
    if(studioLogoDisplay){ studioLogoDisplay.innerHTML = studioLogoSVG(player.logoKind||'star', 40); }
    cashDisplay.textContent = formatMoney(player.cash);
    cashDisplay.className = player.cash<0 ? 'value neg' : 'value';
    prestigeDisplay.textContent = Math.round(player.prestige);
    prestigeBarFill.style.width = player.prestige+'%';
    var wk = weekInYearOf(game.processedWeek+1);
    var yr = yearOf(game.processedWeek+1);
    weekYearDisplay.textContent = 'Week '+wk+' • Year '+yr;
    var rankInfo = computePlayerRank();
    rankDisplay.textContent = '#'+rankInfo.rank+' of '+rankInfo.total;
  }

export function renderPrestigeMeter(){
    var p = clamp(player.prestige, 0, 100);
    prestigeMeterValue.textContent = Math.round(p);
    prestigeMeterPointer.style.left = p+'%';
    var tier = prestigeTier(p);
    prestigeTierLabel.textContent = tier.label;
    if(prestigeHistory.length===0){
      prestigeHistoryList.innerHTML = '<li class="empty" style="border-bottom:none;">No prestige changes yet.</li>';
    } else {
      prestigeHistoryList.innerHTML = prestigeHistory.slice(0,6).map(function(h){
        var sign = h.delta>=0 ? '+' : '';
        return '<li><span>'+escapeHtml(h.label)+'</span><span class="'+(h.delta>=0?'pos':'neg')+'">'+sign+h.delta+'</span></li>';
      }).join('');
    }
  }

export function renderCompetitors(){
    var sorted = aiStudios.slice().sort(function(a,b){ return b.cash-a.cash; });
    competitorsTableBody.innerHTML = sorted.map(function(s){
      var marker = (s.reorgCount||0)>0 ? '🔄 ' : '';
      var personality = getPersonality(s);
      return '<tr><td title="'+((s.reorgCount||0)>0 ? 'Reorganized '+s.reorgCount+' time(s)' : '')+'">'+marker+escapeHtml(s.name)+'</td>'+
        '<td title="'+escapeHtml(personality.tagline)+'">'+escapeHtml(personality.label)+'</td>'+
        '<td class="'+(s.cash<0?'neg':'')+'">'+formatMoney(s.cash)+'</td><td>'+Math.round(s.prestige)+'</td><td>'+s.moviesAll.length+'</td></tr>';
    }).join('');
  }

// Wide-viewport right column — reuses exactly the data already computed for the
// Competitors and History tabs, just condensed and always visible rather than a tab
// you have to switch to. Only rendered into DOM that exists (col-right is display:none
// below 1580px), so this is cheap even when the panel isn't shown.
export function renderRivalTracker(){
    if(!rivalTrackerList) return;
    var sorted = aiStudios.slice().sort(function(a,b){ return b.cash-a.cash; });
    rivalTrackerList.innerHTML = sorted.map(function(s){
      var personality = getPersonality(s);
      return '<div class="mini-row"><div class="mini-row-top"><strong>'+escapeHtml(s.name)+'</strong><span class="mini-tag">'+escapeHtml(personality.label)+'</span></div>'+
        '<div class="mini-row-stats"><span class="'+(s.cash<0?'neg':'')+'">'+formatMoney(s.cash)+'</span><span>Prestige '+Math.round(s.prestige)+'</span></div></div>';
    }).join('');
  }

export function renderRecentReleases(){
    if(!recentReleasesList) return;
    var recent = player.moviesAll.slice(-5).reverse();
    if(recent.length===0){
      recentReleasesList.innerHTML = '<p class="hint">Nothing released yet.</p>';
      return;
    }
    recentReleasesList.innerHTML = recent.map(function(m){
      return '<div class="mini-row"><div class="mini-row-top"><strong>'+escapeHtml(m.title)+'</strong><span class="badge badge-'+m.verdictCls+'">'+m.verdict+'</span></div>'+
        '<div class="mini-row-stats"><span>'+m.genre+'</span><span class="'+(m.profit>=0?'pos':'neg')+'">'+formatMoney(m.profit)+'</span></div></div>';
    }).join('');
  }

// Left sidebar, always visible — a compact "who's in theaters" board. Your own run
// is a genuine week-by-week live figure (game.currentRun); rival pictures resolve
// their entire theatrical run in one shot the moment they're greenlit (see
// generateAIMovie), so there's no live weekly number to show for them — instead this
// lists their settled total gross alongside how many weeks it's been since they opened,
// which is an honest read of "recently released and how it did," not a live ticker.
export function renderBoxOfficeBoard(){
    if(!boxOfficeYourRelease) return;
    var run = game.currentRun;
    if(run){
      var movie = run.movie;
      if(run.weekIndex===0){
        boxOfficeYourRelease.innerHTML = '<div class="bo-your-card"><div class="bo-your-top"><strong>'+escapeHtml(movie.title)+'</strong><span class="mini-tag">'+escapeHtml(movie.genre)+'</span></div>'+
          '<div class="bo-your-stats"><span>🎬 Opens this week</span></div></div>';
      } else {
        boxOfficeYourRelease.innerHTML = '<div class="bo-your-card"><div class="bo-your-top"><strong>'+escapeHtml(movie.title)+'</strong><span class="mini-tag">'+escapeHtml(movie.genre)+'</span></div>'+
          '<div class="bo-your-stats"><span>Week '+run.weekIndex+'</span><span>'+run.prevTheaters.toLocaleString()+' screens</span><span class="pos">'+formatMoney(run.cumulative)+'</span></div></div>';
      }
    } else {
      boxOfficeYourRelease.innerHTML = '<p class="hint bo-empty">Nothing currently in your theaters.</p>';
    }

    var openings = [];
    aiStudios.forEach(function(s){
      s.moviesAll.forEach(function(m){
        var weeksOut = game.processedWeek-m.releaseWeek;
        if(weeksOut>=0 && weeksOut<=8){ openings.push({ movie:m, studio:s, weeksOut:weeksOut }); }
      });
    });
    openings.sort(function(a,b){ return a.weeksOut-b.weeksOut; });
    openings = openings.slice(0,5);
    if(!boxOfficeIndustryList) return;
    if(openings.length===0){
      boxOfficeIndustryList.innerHTML = '<p class="hint bo-empty">No rival openings in the past 8 weeks.</p>';
    } else {
      boxOfficeIndustryList.innerHTML = openings.map(function(o){
        var m = o.movie;
        var wkLabel = o.weeksOut===0 ? 'Opening wk' : 'Wk '+o.weeksOut;
        return '<div class="bo-row"><div class="bo-row-top"><strong>'+escapeHtml(m.title)+'</strong><span class="mini-tag">'+escapeHtml(o.studio.name)+'</span></div>'+
          '<div class="bo-row-stats"><span>'+m.genre+'</span><span>'+wkLabel+'</span><span>'+formatMoney(m.totalBoxOffice)+'</span></div></div>';
      }).join('');
    }
  }

// Same demand/saturation numbers the Research tab uses, condensed into a chart the
// player can glance at from any tab — the demand bar shows how hot a genre is, and the
// marker on top of it shows where saturation currently sits on that same 0-100 scale.
export function renderGenreTracker(){
    if(!genreTrackerList) return;
    genreTrackerList.innerHTML = GENRES.map(function(g){
      var demand = genreDemand[g];
      var prev = prevGenreDemand[g]!=null ? prevGenreDemand[g] : demand;
      var trendArrow = demand>prev+3 ? '📈' : demand<prev-3 ? '📉' : '➖';
      var saturation = getSaturation(g);
      var rec = genreRecommendation(demand, saturation);
      return '<div class="genre-track-row"><div class="genre-track-top"><span class="genre-track-name">'+genreBadgeSVG(g,20)+' '+g+'</span><span class="divergence-tag '+rec.cls+'">'+rec.label+'</span></div>'+
        '<div class="genre-track-bar-wrap"><div class="genre-track-bar" style="width:'+demand+'%;"></div><div class="genre-track-sat-marker" style="left:'+saturation+'%;"></div></div>'+
        '<div class="genre-track-meta"><span>Demand '+demand+' '+trendArrow+'</span><span>Saturation '+saturation+'</span></div></div>';
    }).join('');
  }

export function renderHistory(){
    if(player.moviesAll.length===0){
      historyTableBody.innerHTML = '<tr><td colspan="13" class="empty">No pictures released yet. Green-light your first film.</td></tr>';
      return;
    }
    var rows = player.moviesAll.slice().reverse().map(function(m){
      var gradient = GENRE_GRADIENTS[m.genre] || GENRE_GRADIENTS.Action;
      return '<tr>'+
        '<td><div class="history-poster-thumb" style="background:'+gradient+';">'+genreBadgeSVG(m.genre,18)+'</div></td>'+
        '<td>'+escapeHtml(m.title)+'</td>'+
        '<td>'+m.genre+'</td>'+
        '<td>Y'+m.releaseYear+' W'+weekInYearOf(m.releaseWeek)+'</td>'+
        '<td>'+m.quality+'</td>'+
        '<td>'+m.criticsScore+'%'+(m.certifiedFresh?' 🍅':'')+'</td>'+
        '<td>'+m.audienceScore+'%'+(m.toxicWOM?' ☠️':'')+'</td>'+
        '<td>'+m.reviewSummary.divergence.icon+' '+m.reviewSummary.divergence.shortLabel+'</td>'+
        '<td>'+formatMoney(m.totalSpent!=null ? m.totalSpent : m.totalBudget)+'</td>'+
        '<td>'+formatMoney(m.studioRevenue)+'</td>'+
        '<td class="'+(m.profit>=0?'pos':'neg')+'">'+formatMoney(m.profit)+'</td>'+
        '<td><span class="badge badge-'+m.verdictCls+'">'+m.verdict+'</span></td>'+
        '<td><button type="button" class="btn-secondary history-detail-btn" data-movie-id="'+m.id+'" style="font-size:0.7rem;padding:5px 9px;">View Details</button></td>'+
      '</tr>';
    }).join('');
    historyTableBody.innerHTML = rows;
    historyTableBody.querySelectorAll('.history-detail-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var movie = player.moviesAll.filter(function(m){ return m.id===btn.getAttribute('data-movie-id'); })[0];
        if(movie) showMovieDetail(movie);
      });
    });
  }

export function renderNews(){
    if(newsLog.length===0){
      newsFeedList.innerHTML = '<li class="empty">No industry chatter yet. The trades are quiet.</li>';
      return;
    }
    newsFeedList.innerHTML = newsLog.map(function(n){ return '<li>'+n+'</li>'; }).join('');
  }

export function addNews(msg){
    newsLog.unshift(msg);
    if(newsLog.length>60) newsLog.pop();
    renderNews();
  }

export function fillSelect(selectEl, list, labelFn){
    var prevVal = selectEl.value;
    selectEl.innerHTML = list.map(function(t){
      return '<option value="'+t.id+'">'+escapeHtml(labelFn(t))+'</option>';
    }).join('');
    var found = list.some(function(t){ return t.id===prevVal; });
    if(found) selectEl.value = prevVal;
  }

export function populateTalentSelects(){
    function dealTag(t){ return t.dealsRemaining>0 ? ' 🤝×'+t.dealsRemaining : ''; }
    fillSelect(writerSelect, writers, function(t){ return t.name+' — Skill '+t.skill+' — '+formatMoney(writerFee(t))+dealTag(t); });
    fillSelect(directorSelect, directors, function(t){ return t.name+' — Skill '+t.skill+' — '+formatMoney(directorFee(t))+dealTag(t); });
    fillSelect(producerSelect, [SELF_PRODUCED].concat(producers), function(t){
      return t.isSelf ? (t.name+' — '+formatMoney(producerFee(t))) : (t.name+' — Skill '+t.skill+' — '+formatMoney(producerFee(t))+dealTag(t));
    });
    fillSelect(composerSelect, [LIBRARY_MUSIC].concat(composers), function(t){
      return t.isLibrary ? (t.name+' — '+formatMoney(composerFee(t))) : (t.name+' — Skill '+t.skill+' — '+formatMoney(composerFee(t))+dealTag(t));
    });
    fillSelect(star1Select, stars, function(t){ return t.name+' — Star Power '+t.starPower+' — '+formatMoney(starFee(t))+dealTag(t); });
    fillSelect(star2Select, stars, function(t){ return t.name+' — Star Power '+t.starPower+' — '+formatMoney(starFee(t))+dealTag(t); });
  }

// Rebuilt every time the SFX budget ceiling changes, not once at studio founding like
// the roster dropdowns above — availability here genuinely depends on the current
// slider value, not a static list.
export function populateSfxHouseSelect(){
    var ceiling = Number(sfxRange.value);
    var prevVal = sfxHouseSelect.value;
    var options = [{ h: PRACTICAL_EFFECTS, qualifies: true }].concat(
      sfxHouses.map(function(h){ return { h: h, qualifies: sfxHouseFee(h) <= ceiling }; })
    );
    sfxHouseSelect.innerHTML = options.map(function(o){
      var fee = sfxHouseFee(o.h);
      var label = o.qualifies ?
        (o.h.name+' — Skill '+o.h.skill+' — '+formatMoney(fee)) :
        (o.h.name+' — Declines (needs '+formatMoney(fee)+')');
      return '<option value="'+o.h.id+'"'+(o.qualifies?'':' disabled')+'>'+escapeHtml(label)+'</option>';
    }).join('');
    var stillQualifies = options.some(function(o){ return o.h.id===prevVal && o.qualifies; });
    sfxHouseSelect.value = stillQualifies ? prevVal : PRACTICAL_EFFECTS.id;
    var chosen = getSfxHouseById(sfxHouseSelect.value);
    sfxHouseDescText.textContent = chosen.isPractical ?
      'No outside house — cheap and always available, but the weakest effects work on the market.' :
      'Fee '+formatMoney(sfxHouseFee(chosen))+' at Skill '+chosen.skill+', Prestige '+Math.round(chosen.prestige)+'.';
  }

export function getSelectedTalent(){
    var w = writers.filter(function(t){ return t.id===writerSelect.value; })[0];
    var d = directors.filter(function(t){ return t.id===directorSelect.value; })[0];
    var p = getProducerById(producerSelect.value);
    var c = getComposerById(composerSelect.value);
    var s1 = stars.filter(function(t){ return t.id===star1Select.value; })[0];
    var s2 = stars.filter(function(t){ return t.id===star2Select.value; })[0];
    var x = getSfxHouseById(sfxHouseSelect.value);
    return {w:w, d:d, p:p, c:c, s1:s1, s2:s2, x:x};
  }

export function renderPropertyPreview(){
    var runtime = Number(runtimeRange.value);
    runtimeValueText.textContent = runtime+' min';
    var genre = genreSelect.value;
    var rtFit = runtimeFitScore(runtime, genre);
    var rating = ratingSelect.value;
    var demo = demographicSelect.value;
    var ratingFit = (RATING_GENRE_FIT[rating]||{})[genre];
    var demoFit = (DEMOGRAPHIC_GENRE_FIT[demo]||{})[genre];
    var notes = [];
    notes.push((rtFit>=80?'✅':rtFit>=50?'➖':'⚠️')+' Runtime fit for '+genre+': '+Math.round(rtFit)+'%');
    notes.push((ratingFit>=0.8?'✅':ratingFit>=0.5?'➖':'⚠️')+' '+rating+' rating fit for '+genre+': '+Math.round(ratingFit*100)+'%');
    notes.push((demoFit>=0.8?'✅':demoFit>=0.5?'➖':'⚠️')+' '+demo+' fit for '+genre+': '+Math.round(demoFit*100)+'%');
    propertyFitText.innerHTML = notes.join('<br>');

    var festival = FESTIVALS.filter(function(f){ return f.id===festivalSelect.value; })[0] || FESTIVALS[0];
    if(festival.id==='none'){
      festivalDescText.textContent = 'Skip the festival circuit and go straight to a standard release.';
    } else {
      var cost = scaledCost(festival.costBase);
      festivalDescText.textContent = formatMoney(cost)+' submission fee, roughly '+Math.round(festival.acceptanceBase*100)+'% acceptance chance. If accepted: +'+festival.criticsBoost+' Critics, +'+festival.hypeBoost+' Hype'+(festival.awardsBoost?', +'+festival.awardsBoost+' Awards Potential':'')+'. If rejected, the fee is still spent.';
    }
  }

export function renderCalendarPreview(){
    var weeksOut = Number(scheduleRange.value);
    var targetWeek = game.processedWeek+1+weeksOut;
    scheduleValueText.textContent = weeksOut===0 ? 'ASAP (Next Available Week)' : weeksOut+' week(s) from now';
    var wInYear = weekInYearOf(targetWeek);
    var yr = yearOf(targetWeek);
    var lines = ['Target: Week '+wInYear+', Year '+yr];
    var hName = holidayName(wInYear);
    if(hName) lines.push('🎉 '+hName+' weekend — bigger audiences, heavier competition.');
    if(isSummerWeek(wInYear)) lines.push('☀️ Summer season.');
    if(isAwardsSeasonWeek(wInYear)) lines.push('🏆 Awards season.');
    var genre = genreSelect.value;
    var saturation = getSaturation(genre);
    if(saturation>=40) lines.push('⚠️ '+genre+' is running hot right now — '+saturation+'% saturation.');
    if(weeksOut>0){ lines.push('🎲 Rough estimate only: rivals release something most weeks. Treat any single week as a coin flip, not a guarantee.'); }
    var strategy = RELEASE_STRATEGIES.filter(function(s){ return s.id===strategySelect.value; })[0];
    if(strategy && strategy.timing){
      var matches = checkTimingMatch(strategy, targetWeek);
      lines.push(matches ? '✅ This strategy is timed to hit its window.' : '❌ This strategy wants a specific window — this date misses it.');
    }
    calendarPreview.innerHTML = lines.map(function(l){ return '<p class="hint" style="margin:4px 0;">'+l+'</p>'; }).join('');
  }

export function renderBudgetSummary(){
    var sel = getSelectedTalent();
    var sfxCeiling = Number(sfxRange.value);
    var mkt = Number(marketingRange.value);
    sfxValue.textContent = formatMoney(sfxCeiling);
    marketingValue.textContent = formatMoney(mkt);
    theaterValue.textContent = Number(theaterRange.value).toLocaleString()+' screens';
    var strategyForDesc = RELEASE_STRATEGIES.filter(function(s){ return s.id===strategySelect.value; })[0];
    if(strategyForDesc) strategyDescText.textContent = strategyForDesc.desc;
    renderCalendarPreview();
    renderPropertyPreview();
    populateSfxHouseSelect();

    if(!sel.w || !sel.d || !sel.p || !sel.c || !sel.s1 || !sel.s2){ return; }
    var x = getSfxHouseById(sfxHouseSelect.value);
    var sfx = sfxHouseFee(x);

    var wf = writerFee(sel.w), df = directorFee(sel.d), pf = producerFee(sel.p), cf = composerFee(sel.c), s1f = starFee(sel.s1), s2f = starFee(sel.s2);
    wf = Math.round(wf*(1-getNegotiatedDiscount('writer', sel)));
    df = Math.round(df*(1-getNegotiatedDiscount('director', sel)));
    cf = Math.round(cf*(1-getNegotiatedDiscount('composer', sel)));
    s1f = Math.round(s1f*(1-getNegotiatedDiscount('star1', sel)));
    s2f = Math.round(s2f*(1-getNegotiatedDiscount('star2', sel)));
    var talentSubtotal = wf+df+cf+s1f+s2f+sfx;
    var discountRate = sel.p.isSelf ? 0 : producerFeeDiscount(sel.p);
    var discountAmt = Math.round(talentSubtotal*discountRate);
    var total = talentSubtotal-discountAmt+pf+mkt;
    budgetSummaryBody.innerHTML =
      '<div class="budget-line"><span>Writer — '+escapeHtml(sel.w.name)+'</span><span>'+formatMoney(wf)+'</span></div>'+
      '<div class="budget-line"><span>Director — '+escapeHtml(sel.d.name)+'</span><span>'+formatMoney(df)+'</span></div>'+
      '<div class="budget-line"><span>'+(sel.c.isLibrary?'Music':'Composer')+' — '+escapeHtml(sel.c.name)+'</span><span>'+formatMoney(cf)+'</span></div>'+
      '<div class="budget-line"><span>Lead — '+escapeHtml(sel.s1.name)+'</span><span>'+formatMoney(s1f)+'</span></div>'+
      '<div class="budget-line"><span>Lead — '+escapeHtml(sel.s2.name)+'</span><span>'+formatMoney(s2f)+'</span></div>'+
      (discountAmt>0 ? '<div class="budget-line"><span>Producer Efficiency — '+escapeHtml(sel.p.name)+'</span><span style="color:var(--emerald);">-'+formatMoney(discountAmt)+'</span></div>' : '')+
      '<div class="budget-line"><span>'+(sel.p.isSelf?'Producing (Self)':'Producer')+' — '+escapeHtml(sel.p.name)+'</span><span>'+formatMoney(pf)+'</span></div>'+
      '<div class="budget-line"><span>'+(x.isPractical?'Effects (In-House)':'SFX House')+' — '+escapeHtml(x.name)+'</span><span>'+formatMoney(sfx)+'</span></div>'+
      '<div class="budget-line"><span>Marketing</span><span>'+formatMoney(mkt)+'</span></div>'+
      '<div class="budget-line total"><span>TOTAL BUDGET</span><span>'+formatMoney(total)+'</span></div>'+
      '<div class="budget-line remaining"><span>Cash After Release</span><span style="color:'+((player.cash-total)<0?'var(--crimson)':'var(--emerald)')+'">'+formatMoney(player.cash-total)+'</span></div>';

    var warn = '';
    var blocking = false;
    if(sel.s1.id===sel.s2.id){ warn = 'Choose two different lead stars.'; blocking = true; }
    else if(!movieTitleInput.value.trim()){ warn = 'Give your picture a title.'; blocking = true; }
    else if(total>player.cash){ warn = 'Over budget by '+formatMoney(total-player.cash)+' — releasing will put the studio into debt.'; blocking = false; }
    formWarning.textContent = warn;
    formWarning.style.color = blocking ? 'var(--crimson)' : '#d98a2b';
    releaseBtn.disabled = blocking || !!game.currentRun;
  }

// Shared by the Greenlight review modal and the wizard's live movie-card preview, so
// both always agree — one calculation, two presentations.
export function computeGreenlightPreview(){
    var sel = getSelectedTalent();
    var sfx = sfxHouseFee(sel.x);
    var mkt = Number(marketingRange.value);
    var genre = genreSelect.value;
    var channels = 2; // a reasonable mid-estimate; exact channel count barely moves this preview

    var wf = writerFee(sel.w), df = directorFee(sel.d), pf = producerFee(sel.p), cf = composerFee(sel.c), s1f = starFee(sel.s1), s2f = starFee(sel.s2);
    wf = Math.round(wf*(1-getNegotiatedDiscount('writer', sel)));
    df = Math.round(df*(1-getNegotiatedDiscount('director', sel)));
    cf = Math.round(cf*(1-getNegotiatedDiscount('composer', sel)));
    s1f = Math.round(s1f*(1-getNegotiatedDiscount('star1', sel)));
    s2f = Math.round(s2f*(1-getNegotiatedDiscount('star2', sel)));
    var talentSubtotal = wf+df+cf+s1f+s2f+sfx;
    var discountRate = sel.p.isSelf ? 0 : producerFeeDiscount(sel.p);
    var discountAmt = Math.round(talentSubtotal*discountRate);
    var total = talentSubtotal-discountAmt+pf+mkt;

    // Deterministic estimate — same formulas the real production uses, minus their small
    // random noise terms, so this reads as "roughly what to expect," not a guarantee.
    var qEst = computeQuality(sel.w.skill, sel.d.skill, sfx, mkt, genre, sel.s1.starPower, sel.s2.starPower, sel.x.skill);
    var hEst = computeHype(mkt, sel.s1.starPower, sel.s2.starPower, channels);
    var theaters = Number(theaterRange.value);
    var perScreen = 5000*(hEst/50);
    var opening = theaters*perScreen*(0.85+qEst/100*0.3);
    var lowGross = Math.round(opening*2.3);
    var highGross = Math.round(opening*5.2);
    var lowRevenue = Math.round(lowGross*0.5);
    var highRevenue = Math.round(highGross*0.5);

    var cashAfter = player.cash-total;
    var cashFraction = player.cash>0 ? total/player.cash : 2;
    var riskPct = clamp(cashFraction*100, 4, 100);
    var risk, riskCls;
    if(cashAfter<0){ risk = 'HIGH RISK — pushes the studio into debt'; riskCls = 'risk-high'; }
    else if(cashFraction>0.8){ risk = 'HIGH RISK — most of your cash on one picture'; riskCls = 'risk-high'; }
    else if(cashFraction>0.4){ risk = 'MODERATE RISK — a meaningful bet'; riskCls = 'risk-moderate'; }
    else { risk = 'LOW RISK — comfortably within budget'; riskCls = 'risk-low'; }

    return { sel:sel, sfx:sfx, mkt:mkt, genre:genre, theaters:theaters, total:total, discountAmt:discountAmt,
      qEst:qEst, hEst:hEst, lowRevenue:lowRevenue, highRevenue:highRevenue,
      cashAfter:cashAfter, risk:risk, riskCls:riskCls, riskPct:riskPct };
  }

export function renderGreenlightReview(){
    var p = computeGreenlightPreview();
    greenlightBody.innerHTML =
      '<div class="greenlight-line"><span>Estimated Quality</span><span>'+p.qEst+' / 100</span></div>'+
      '<div class="greenlight-line"><span>Estimated Hype</span><span>'+p.hEst+' / 100</span></div>'+
      '<div class="greenlight-line"><span>Projected Studio Revenue</span><span>'+formatMoney(p.lowRevenue)+' – '+formatMoney(p.highRevenue)+'</span></div>'+
      '<div class="greenlight-line total"><span>Total Budget</span><span>'+formatMoney(p.total)+'</span></div>'+
      '<div class="greenlight-line"><span>Cash After Greenlight</span><span style="color:'+(p.cashAfter<0?'var(--crimson)':'var(--emerald)')+'">'+formatMoney(p.cashAfter)+'</span></div>'+
      '<div class="greenlight-risk '+p.riskCls+'">'+p.risk+'</div>'+
      '<p class="hint" style="margin-top:8px;">Estimates use the same formulas as the real production, without the randomness a Production Event or Test Screening can still add either way.</p>';
  }

export function renderSlotReport(competitors, playerGenre){
    if(competitors.length===0){
      slotReportBody.innerHTML = '<div class="empty">Clear skies — no major studio releases this week.</div>';
      return;
    }
    slotReportBody.innerHTML = competitors.map(function(c){
      var clash = c.genre===playerGenre;
      return '<div class="slot-item'+(clash?' clash':'')+'"><strong>'+escapeHtml(c.title)+'</strong> — '+c.genre+
        '<span class="tag">'+escapeHtml(c.studioName)+'</span>'+
        (clash ? '<span class="clash-tag">⚔️ Direct Competition</span>' : '')+
        '</div>';
    }).join('');
  }

export function renderStudioOffice(){
    if(!currentTier) return;
    studioTierLine.textContent = currentTier.name+' • Weekly Overhead '+formatMoney(currentTier.overhead)+' • Lifetime Overhead Paid '+formatMoney(player.totalOverheadPaid||0);
  }

export function renderFinancePanel(){
    if(!currentTier) return;
    loanRateDisplay.textContent = Math.round(loanInterestRate()*100)+'%';
    var maxLoan = maxLoanAmount();
    loanMaxDisplay.textContent = formatMoney(maxLoan);
    loanAmountRange.max = Math.max(250000, maxLoan);
    if(Number(loanAmountRange.value)>maxLoan) loanAmountRange.value = Math.max(0, maxLoan);
    loanAmountValue.textContent = formatMoney(Number(loanAmountRange.value));
    takeLoanBtn.disabled = finance.loans.length>=3 || maxLoan<250000;

    var invTerms = investorTerms('investor');
    investorTermsDisplay.textContent = formatMoney(invTerms.maxAmount)+' for '+invTerms.sharePercent.toFixed(1)+'% of future profits';
    takeInvestorBtn.disabled = finance.profitShareDeals.length>=4;

    var equityEligible = player.prestige>=40 && player.moviesAll.length>=2;
    if(equityEligible){
      var eqTerms = investorTerms('equity');
      equityGateHint.textContent = 'Current offer: '+formatMoney(eqTerms.maxAmount)+' for '+eqTerms.sharePercent.toFixed(1)+'% of future profits.';
    } else {
      equityGateHint.textContent = 'Unlocks at 40 Prestige and 2+ releases. Bigger checks, bigger cuts.';
    }
    takeEquityBtn.disabled = !equityEligible || finance.profitShareDeals.length>=4;

    var elig = ipoEligible();
    goPublicBtn.disabled = !elig;
    if(finance.isPublic){
      ipoGateHint.textContent = 'Already public.';
    } else {
      ipoGateHint.textContent = elig ? 'Ready to go public — a massive one-time capital raise awaits.' : 'Unlocks at 70 Prestige and 5+ releases.';
    }
    publicCompanyStatus.classList.toggle('hidden', !finance.isPublic);
    if(finance.isPublic){
      ipoYearDisplay.textContent = yearOf(finance.ipoWeek||1);
      investorConfidenceDisplay.textContent = Math.round(finance.investorConfidence);
      revoltCountDisplay.textContent = finance.shareholderRevolts;
    }

    activeLoansList.innerHTML = finance.loans.length===0 ? '<p class="empty">No active loans.</p>' :
      finance.loans.map(function(l){
        return '<div class="deal-row"><span>Loan '+formatMoney(l.principal)+' @ '+Math.round(l.interestRate*100)+'%</span><span>'+l.remainingWeeks+' wks left • '+formatMoney(l.weeklyPayment)+'/wk</span></div>';
      }).join('');

    profitShareDealsList.innerHTML = finance.profitShareDeals.length===0 ? '<p class="empty">No investor or equity deals active.</p>' :
      finance.profitShareDeals.map(function(d){
        return '<div class="deal-row"><span>'+(d.kind==='equity'?'🏛 Equity':'🤝 Investor')+' — '+formatMoney(d.investedAmount)+'</span><span>'+d.sharePercent.toFixed(1)+'% of profits</span></div>';
      }).join('');
  }

export function renderMarketingPanel(){
    if(game.currentRun){
      var m = game.currentRun.movie;
      marketingCurrentStats.innerHTML =
        '<div class="budget-line"><span>Now Showing</span><span>'+escapeHtml(m.title)+'</span></div>'+
        '<div class="budget-line"><span>Marketing Budget</span><span>'+formatMoney(m.marketingBudget)+'</span></div>'+
        '<div class="budget-line"><span>Channels Checked</span><span>'+m.channels+' of 4</span></div>'+
        '<div class="budget-line total"><span>Final Hype Score</span><span>'+m.hype+'/100</span></div>';
    } else {
      marketingCurrentStats.innerHTML = '<p class="empty">No picture currently in release. Marketing stats will appear here once you green-light a production.</p>';
    }
  }

export function renderDistributionPanel(){
    if(player.moviesAll.length===0){
      distributionTableBody.innerHTML = '<tr><td colspan="4" class="empty">No distribution deals yet.</td></tr>';
      return;
    }
    distributionTableBody.innerHTML = player.moviesAll.slice().reverse().map(function(m){
      return '<tr><td>'+escapeHtml(m.title)+'</td><td>'+(PLATFORM_LABELS[m.streamingPlatform]||'—')+'</td><td>'+(m.streamingWindow==='immediate'?'Immediate':'Delayed')+'</td><td>'+formatMoney(m.streamingRevenue||0)+'</td></tr>';
    }).join('');
  }

export function renderPassiveIncome(){
    var streams = player.passiveIncomeStreams||[];
    if(streams.length===0){
      passiveIncomeBody.innerHTML = '<p class="empty">No active long-term revenue streams yet.</p>';
      return;
    }
    var totalPerQuarter = streams.reduce(function(sum,s){ return sum+s.quarterlyAmount; }, 0);
    passiveIncomeBody.innerHTML =
      '<div class="budget-line total"><span>Total This Quarter</span><span>'+formatMoney(totalPerQuarter)+'</span></div>'+
      streams.map(function(s){
        return '<div class="deal-row"><span>'+escapeHtml(s.label)+' — '+escapeHtml(s.sourceTitle)+'</span><span>'+formatMoney(s.quarterlyAmount)+'/qtr • '+s.quartersRemaining+' left</span></div>';
      }).join('');
  }

export function renderLockedTabs(){
    var intlUnlocked = player.prestige>=40;
    internationalLockedBanner.textContent = intlUnlocked ? '✅ Unlocked (full feature coming in a future update)' : '🔒 Locked';
    internationalLockedBanner.className = 'locked-banner'+(intlUnlocked?' unlocked':'');
    internationalTabLock.textContent = intlUnlocked ? '' : '🔒';
    internationalTabLock.title = intlUnlocked ? '' : 'Unlocks at 40 Prestige';
  }

export function renderResearchTab(){
    var unlocked = player.moviesAll.length>=3;
    researchLockedBanner.textContent = unlocked ? '✅ Unlocked' : '🔒 Locked';
    researchLockedBanner.className = 'locked-banner'+(unlocked?' unlocked':'');
    researchLockedHint.classList.toggle('hidden', unlocked);
    researchContent.classList.toggle('hidden', !unlocked);
    researchTabLock.textContent = unlocked ? '' : '🔒';
    researchTabLock.title = unlocked ? '' : 'Unlocks after 3 releases';
    if(!unlocked) return;

    genreDemandTableBody.innerHTML = GENRES.map(function(g){
      var demand = genreDemand[g];
      var prev = prevGenreDemand[g]!=null ? prevGenreDemand[g] : demand;
      var trendArrow = demand>prev+3 ? '📈' : demand<prev-3 ? '📉' : '➖';
      var saturation = getSaturation(g);
      var rec = genreRecommendation(demand, saturation);
      return '<tr><td>'+g+'</td><td>'+demand+'</td><td>'+trendArrow+'</td><td>'+saturation+'</td><td><span class="divergence-tag '+rec.cls+'" style="font-size:0.68rem;padding:2px 8px;">'+rec.label+'</span></td></tr>';
    }).join('');

    yearInReviewText.textContent = buildYearInReviewText();
  }

export function renderIndustryReport(){
    var report = computeIndustryReport();
    industryReportBody.innerHTML =
      '<div class="budget-line"><span>Highest-Grossing Genre (recent)</span><span>'+report.topGenre+'</span></div>'+
      '<div class="budget-line"><span>Average Production Budget</span><span>'+formatMoney(report.avgBudget)+'</span></div>'+
      '<div class="budget-line"><span>Pictures Tracked</span><span>'+report.sampleSize+'</span></div>';

    studioRumorsBody.innerHTML = aiStudios.map(function(s){
      var focus = studioRecentFocus(s);
      var rumorText = s.rumor ? s.rumor.text : 'No word yet on their next project.';
      return '<div class="deal-row"><span>'+escapeHtml(s.name)+' — recent focus: '+focus+'</span><span style="font-style:italic;">'+rumorText+'</span></div>';
    }).join('');
  }

export function renderAwardsCampaign(){
    var unlocked = awardsCampaignUnlocked();
    awardsCampaignGateHint.classList.toggle('hidden', unlocked);
    awardsCampaignList.classList.toggle('hidden', !unlocked);
    if(!unlocked) return;
    var eligible = awardsCampaignEligibleMovies();
    if(eligible.length===0){
      awardsCampaignList.innerHTML = '<p class="empty">No campaignable releases this year yet.</p>';
      return;
    }
    var cost = scaledCost(400000);
    awardsCampaignList.innerHTML = eligible.map(function(m){
      return '<div class="deal-row"><span>'+escapeHtml(m.title)+' — Quality '+m.quality+'</span>'+
        '<span><button type="button" class="btn-secondary campaign-btn" data-movie="'+m.id+'" style="padding:4px 10px;font-size:0.72rem;">Launch Campaign ('+formatMoney(cost)+')</button></span></div>';
    }).join('');
    awardsCampaignList.querySelectorAll('.campaign-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var movieId = btn.getAttribute('data-movie');
        var movie = player.moviesAll.filter(function(m){ return m.id===movieId; })[0];
        if(!movie) return;
        if(scaledCost(400000)>player.cash){
          if(!confirm('This campaign costs '+formatMoney(scaledCost(400000))+', putting the studio further into debt. Proceed?')) return;
        }
        launchAwardsCampaign(movie);
        renderAll();
      });
    });
  }

export function renderAwardsHistory(){
    var wins = player.awardsWon||[];
    if(wins.length===0){
      awardsHistoryTableBody.innerHTML = '<tr><td colspan="4" class="empty">No awards yet. Keep making pictures.</td></tr>';
      return;
    }
    awardsHistoryTableBody.innerHTML = wins.slice().reverse().map(function(w){
      return '<tr><td>Y'+w.year+'</td><td>'+escapeHtml(w.category)+'</td><td>'+escapeHtml(w.movieTitle)+'</td><td>'+(w.recipient?escapeHtml(w.recipient):'—')+'</td></tr>';
    }).join('');
  }

export function renderDepartmentsGrid(){
    departmentsGrid.innerHTML = DEPARTMENTS.map(function(d){
      var unlocked = d.unlockCheck();
      return '<div class="dept-card '+(unlocked?'unlocked':'locked')+'">'+
        '<div class="dept-card-icon">'+d.icon+'</div>'+
        '<div class="dept-card-name">'+escapeHtml(d.name)+'</div>'+
        '<div class="dept-card-desc">'+d.desc+'</div>'+
        (unlocked ? '<div class="dept-card-status open">✅ Open</div>' : '<div class="dept-card-status">🔒 '+escapeHtml(d.unlockHint||'Locked')+'</div>')+
      '</div>';
    }).join('');
    renderLegalPanel();
  }

// The Legal Department's own panel — separate from the generic Departments grid
// above because, once unlocked, it has actual live state to show: the Legal Risk
// meter and the Case Log. Hidden entirely below 60 Prestige, same threshold the
// Departments grid already checks for the "Legal" card.
export function renderLegalPanel(){
    if(!legalDeptPanel) return;
    var unlocked = legalDeptUnlocked();
    legalDeptPanel.classList.toggle('hidden', !unlocked);
    if(!unlocked) return;
    ensureLegalState();
    var risk = player.legalRisk||0;
    var tier = legalRiskTierLabel(risk);
    legalRiskLabel.textContent = tier.label+' · '+Math.round(risk)+'/100';
    legalRiskLabel.className = tier.cls;
    legalRiskBar.style.width = risk+'%';
    var log = player.legalCaseLog||[];
    if(log.length===0){
      legalCaseLog.innerHTML = '<p class="hint">No cases yet. Nothing\u2019s crossed counsel\u2019s desk.</p>';
    } else {
      legalCaseLog.innerHTML = log.map(function(l){
        return '<div class="legal-log-row"><span>'+escapeHtml(l.title)+' \u2014 '+escapeHtml(l.result)+'</span><span class="'+(l.cls==='pos'?'pos':'neg')+'">'+escapeHtml(l.detail)+'</span></div>';
      }).join('');
    }
  }

export function renderStudioBio(){
    if(!currentTier) return;
    studioBioBody.innerHTML =
      '<div class="budget-line"><span>Tier</span><span>'+currentTier.name+'</span></div>'+
      '<div class="budget-line"><span>Pictures Released</span><span>'+player.moviesAll.length+'</span></div>'+
      '<div class="budget-line"><span>Awards Won</span><span>'+(player.awardsWon||[]).length+'</span></div>'+
      '<div class="budget-line"><span>Lifetime Overhead Paid</span><span>'+formatMoney(player.totalOverheadPaid||0)+'</span></div>'+
      '<div class="budget-line"><span>Public Company</span><span>'+(finance.isPublic?'Yes — since Year '+yearOf(finance.ipoWeek||1):'No')+'</span></div>'+
      '<div class="budget-line"><span>Active Loans</span><span>'+finance.loans.length+'</span></div>'+
      '<div class="budget-line"><span>Investor / Equity Deals</span><span>'+finance.profitShareDeals.length+'</span></div>';
  }

export function renderFranchisesTab(){
    var eligible = franchiseEligibleMovies();
    if(eligible.length===0){
      franchiseList.innerHTML = '<p class="empty">No franchise-eligible pictures yet. A Hit (ROI 0.5+) or a script with 65+ Franchise Potential qualifies.</p>';
      return;
    }
    franchiseList.innerHTML = eligible.map(function(m){
      var fv = computeFranchiseValue(m);
      var extCount = (m.franchiseExtensions||[]).length;
      var buttons = FRANCHISE_EXTENSIONS.map(function(ext){
        var eligible2 = extensionEligible(ext, m);
        var costPreview = ext.kind==='production' ? '' : ' — '+formatMoney(extensionCost(ext, m));
        var lockNote = '';
        if(!eligible2){
          if(ext.oncePerFranchise && (m.franchiseExtensions||[]).some(function(e){return e.type===ext.id;})) lockNote = 'Already built';
          else if(ext.minFranchiseValue!=null && fv<ext.minFranchiseValue) lockNote = 'Needs Franchise Value '+ext.minFranchiseValue+'+';
          else if(ext.minPrestige!=null && player.prestige<ext.minPrestige) lockNote = 'Needs '+ext.minPrestige+' Prestige';
        }
        return '<button type="button" class="btn-secondary franchise-ext-btn" data-movie="'+m.id+'" data-ext="'+ext.id+'" '+(eligible2?'':'disabled')+' style="display:block;width:100%;text-align:left;margin-bottom:6px;">'+
          '<strong>'+ext.icon+' '+escapeHtml(ext.label)+'</strong>'+costPreview+(lockNote?' — '+lockNote:'')+'<br>'+
          '<span style="font-weight:400;font-size:0.78rem;color:var(--ink-dim);">'+escapeHtml(ext.desc)+'</span></button>';
      }).join('');
      return '<div class="deal-row" style="display:block;margin-bottom:14px;">'+
        '<div class="budget-line total"><span>'+escapeHtml(m.title)+' ('+m.genre+')</span><span>Franchise Value '+fv+' • '+extCount+' extension(s)</span></div>'+
        buttons+
      '</div>';
    }).join('');

    franchiseList.querySelectorAll('.franchise-ext-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var movieId = btn.getAttribute('data-movie');
        var extId = btn.getAttribute('data-ext');
        var original = player.moviesAll.filter(function(m){ return m.id===movieId; })[0];
        var ext = FRANCHISE_EXTENSIONS.filter(function(e){ return e.id===extId; })[0];
        if(!original || !ext) return;
        if(ext.kind==='production'){
          developFranchiseProduction(original, ext);
        } else if(ext.kind==='passive'){
          var cost = extensionCost(ext, original);
          var q = extensionQuarterlyPayout(ext, original);
          if(confirm(ext.label+': '+formatMoney(cost)+' upfront, then '+formatMoney(q)+' per quarter for '+ext.quarters+' quarters. Proceed?')){
            launchPassiveExtension(original, ext);
          }
        } else if(ext.kind==='lump'){
          var cost2 = extensionCost(ext, original);
          var payout = extensionLumpPayout(ext, original);
          if(confirm(ext.label+': '+formatMoney(cost2)+' upfront, '+formatMoney(payout)+' expected return. Proceed?')){
            launchLumpExtension(original, ext);
          }
        }
      });
    });
  }

export function renderScriptReport(){
    if(!game.currentScript){
      scriptReportBlock.classList.add('hidden');
      return;
    }
    scriptReportBlock.classList.remove('hidden');
    var s = game.currentScript;
    scriptReportBody.innerHTML =
      '<div class="budget-line"><span>Primary Genre</span><span>'+s.primaryGenre+'</span></div>'+
      '<div class="budget-line"><span>Secondary Genre</span><span>'+(s.secondaryGenre||'None')+'</span></div>'+
      '<div class="budget-line"><span>Themes</span><span>'+(s.themes.length?escapeHtml(s.themes.join(', ')):'None detected')+'</span></div>'+
      '<div class="budget-line"><span>Tone</span><span>'+s.tone+'</span></div>'+
      '<div class="budget-line"><span>Target Audience</span><span>'+s.targetAudience+'</span></div>'+
      '<div class="budget-line"><span>Originality</span><span>'+s.originality+'</span></div>'+
      '<div class="budget-line"><span>Character Depth</span><span>'+s.characterDepth+'</span></div>'+
      '<div class="budget-line"><span>Commercial Appeal</span><span>'+s.commercialAppeal+'</span></div>'+
      '<div class="budget-line"><span>Awards Potential</span><span>'+s.awardsPotential+'</span></div>'+
      '<div class="budget-line"><span>Franchise Potential</span><span>'+s.franchisePotential+'</span></div>'+
      '<div class="budget-line"><span>International Appeal</span><span>'+s.internationalAppeal+'</span></div>'+
      '<div class="budget-line"><span>Production Complexity</span><span>'+s.productionComplexity+'</span></div>'+
      '<div class="budget-line total"><span>Estimated Budget Category</span><span>'+s.budgetCategory+'</span></div>';

    rewriteOptionsList.innerHTML = REWRITE_OPTIONS.map(function(r){
      var used = s.appliedRewrites.indexOf(r.id)>-1;
      var cost = scaledCost(r.baseCost);
      return '<button type="button" class="btn-secondary rewrite-btn" data-rewrite="'+r.id+'" '+(used?'disabled':'')+' style="display:block;width:100%;text-align:left;margin-bottom:6px;">'+
        '<strong>'+escapeHtml(r.label)+'</strong> — '+(used?'Used':formatMoney(cost)+', 1 wk')+'<br>'+
        '<span style="font-weight:400;font-size:0.78rem;color:var(--ink-dim);">'+escapeHtml(r.desc)+'</span></button>';
    }).join('');
  }

export function renderAll(){
    renderHeader();
    populateTalentSelects();
    renderPrestigeMeter();
    renderStudioOffice();
    renderCompetitors();
    renderRivalTracker();
    renderRecentReleases();
    renderBoxOfficeBoard();
    renderGenreTracker();
    renderHistory();
    renderBudgetSummary();
    renderNews();
    renderFinancePanel();
    renderMarketingPanel();
    renderDistributionPanel();
    renderPassiveIncome();
    renderLockedTabs();
    renderResearchTab();
    renderIndustryReport();
    renderAwardsCampaign();
    renderAwardsHistory();
    renderDepartmentsGrid();
    renderStudioBio();
    renderFranchisesTab();
    renderTalentTab();
    renderObjectiveCard();
    renderScriptReport();
  }

export function setFormDisabled(disabled){
    var controls = preprodPanel.querySelectorAll('input, select, button, textarea');
    controls.forEach(function(el){ el.disabled = disabled; });
    var scriptControls = scriptDevPanel.querySelectorAll('input, select, button, textarea');
    scriptControls.forEach(function(el){ el.disabled = disabled; });
    var tControls = timeControls.querySelectorAll('input, select, button');
    tControls.forEach(function(el){ el.disabled = disabled; });
    var sControls = studioDataPanel.querySelectorAll('input, select, button');
    sControls.forEach(function(el){ el.disabled = disabled; });
    preprodPanel.classList.toggle('disabled-panel', disabled);
    scriptDevPanel.classList.toggle('disabled-panel', disabled);
    timeControls.classList.toggle('disabled-panel', disabled);
    studioDataPanel.classList.toggle('disabled-panel', disabled);
  }

