import { DEMOGRAPHIC_GENRE_FIT, FESTIVALS, RATING_GENRE_FIT, clamp, composerFee, computeProductionWeeks, directorFee, escapeHtml, formatMoney, producerFee, producerFeeDiscount, producerRiskReduction, rand, randInt, runtimeFitScore, starFee, uid, writerFee } from '../data/constants.js';
import { finishRun } from './release-flow.js';
import { aiStudios, chargeOverheadForWeek, game, player } from '../state/game-state.js';
import { advanceBackgroundSim, advanceOneWeek, generateAIMovie, tickPlayerHeat } from '../systems/ai-studios.js';
import { checkAwards } from '../systems/awards.js';
import { tickPassiveIncome } from '../systems/franchise.js';
import { chargeLoanPaymentsForWeek, checkQuarterlyEarnings, genreDemand, getSaturation, recordRelease } from '../systems/market.js';
import { PRODUCTION_EVENTS } from '../systems/production-events.js';
import { SHOOT_EVENTS } from '../systems/shoot-events.js';
import { ADDITIONAL_PHOTOGRAPHY_EVENT, POST_PRODUCTION_TIERS, postProductionCost } from '../systems/post-production.js';
import { RELEASE_STRATEGIES, TEST_SCREENING_CHOICES, applyTestScreeningChoice, checkTimingMatch, generateTestScreeningFeedback, neutralStory, scaledCost } from '../systems/release-strategy.js';
import { buildReviewSummary, checkBreakoutEligibility, computeHype, computeQuality, computeReviews, pickBreakoutTalent } from '../systems/talent-quality.js';
import { $, audienceBlurbText, audienceScoreDisplay, chBillboards, chOnline, chTV, chTrailers, criticsBlurbText, criticsScoreDisplay, cumulativeBig, demographicSelect, divergenceTag, eventBody, eventModal, eventTitle, festivalSelect, filmingMeta, filmingMoraleDisplay, filmingPanel, filmingSpendDisplay, filmingTickerBody, filmingTitle, filmingWeekDisplay, genreSelect, greenlightModal, marketingRange, movieTaglineInput, movieTitleInput, nowShowingContent, nowShowingMeta, nowShowingPlaceholder, nowShowingTitle, postProductionIntro, postProductionModal, postProductionTierList, ratingSelect, runtimeRange, scheduleRange, sfxRange, strategySelect, testScreeningChoices, testScreeningModal, testScreeningScores, testScreeningSuggestion, theaterRange, theatersNowDisplay, tickerTableBody, weeksElapsedDisplay } from '../ui/dom-refs.js';
import { addNews, getSelectedTalent, populateTalentSelects, renderAll, renderCompetitors, renderGreenlightReview, renderHeader, renderNews, renderSlotReport, setFormDisabled } from '../ui/render.js';

export function openGreenlightReview(){
    var sel = getSelectedTalent();
    if(!sel.w || !sel.d || !sel.p || !sel.c || !sel.s1 || !sel.s2) return;
    if(sel.s1.id===sel.s2.id){ alert('Choose two different lead stars.'); return; }
    if(!movieTitleInput.value.trim()){ alert('Give your picture a title before requesting a greenlight review.'); return; }
    renderGreenlightReview();
    greenlightModal.classList.remove('hidden');
  }

export function confirmGreenlight(){
    var sel = getSelectedTalent();
    greenlightModal.classList.add('hidden');

    var title = movieTitleInput.value.trim() || 'Untitled Picture';
    var tagline = movieTaglineInput.value.trim();
    var genre = genreSelect.value;
    var sfx = Number(sfxRange.value);
    var mkt = Number(marketingRange.value);
    var theaterCount = Number(theaterRange.value);
    var channels = [chTrailers, chBillboards, chOnline, chTV].filter(function(c){ return c.checked; }).length;

    var wCost = writerFee(sel.w), dCost = directorFee(sel.d), pCost = producerFee(sel.p), cCost = composerFee(sel.c), s1Cost = starFee(sel.s1), s2Cost = starFee(sel.s2);
    // A skilled producer negotiates the OTHER four fees down; their own fee is paid in full.
    var talentSubtotal = wCost+dCost+cCost+s1Cost+s2Cost;
    var producerDiscountRate = sel.p.isSelf ? 0 : producerFeeDiscount(sel.p);
    var producerDiscountAmt = Math.round(talentSubtotal*producerDiscountRate);
    var runtime = Number(runtimeRange.value);
    var rating = ratingSelect.value;
    var demographic = demographicSelect.value;
    var festival = FESTIVALS.filter(function(f){ return f.id===festivalSelect.value; })[0] || FESTIVALS[0];
    var festivalCost = scaledCost(festival.costBase);
    var totalBudget = talentSubtotal-producerDiscountAmt+pCost+sfx+mkt+festivalCost;
    if(totalBudget>player.cash){
      var overBy = totalBudget-player.cash;
      var proceed = confirm('This production runs '+formatMoney(overBy)+' over your available cash. '+player.name+' would go into debt (cash after: '+formatMoney(player.cash-totalBudget)+'). Proceed anyway?');
      if(!proceed) return;
    }

    player.cash -= totalBudget;

    var movie = {
      id: uid(), ownerType:'player', studioName: player.name, title: title, tagline: tagline, genre: genre,
      writer: sel.w, director: sel.d, star1: sel.s1, star2: sel.s2,
      // A hired producer/composer gets a live roster reference (so prestige/fee evolve
      // like every other crew role); Self-Produced/Library Music have no persistent
      // person behind them, so the *Ref stays null and the *Name/*IsX fields carry the
      // display info instead.
      producerRef: sel.p.isSelf ? null : sel.p,
      producerName: sel.p.name, producerIsSelf: !!sel.p.isSelf, producerSkill: sel.p.skill, producerPrestige: sel.p.prestige,
      composerRef: sel.c.isLibrary ? null : sel.c,
      composerName: sel.c.name, composerIsLibrary: !!sel.c.isLibrary, composerSkill: sel.c.skill, composerPrestige: sel.c.prestige,
      writerCost: wCost, directorCost: dCost, producerCost: pCost, composerCost: cCost, star1Cost: s1Cost, star2Cost: s2Cost,
      producerDiscountAmt: producerDiscountAmt,
      sfxBudget: sfx, marketingBudget: mkt, theaterCount: theaterCount, channels: channels,
      totalBudget: totalBudget,
      runtime: runtime, rating: rating, demographic: demographic, festival: festival.id, festivalCost: festivalCost,
      productionStartWeek: game.processedWeek,
      // "Effective" stats for THIS movie only — Production Events modify these without
      // touching the persistent talent roster (except where an event explicitly says so).
      effWriterSkill: sel.w.skill, effDirectorSkill: sel.d.skill, effStar1Power: sel.s1.starPower,
      qualityDelta: 0, hypeDelta: 0, eventCost: 0, eventLabel: null,
      testScreeningCost: 0,
      strategy: strategySelect.value,
      targetReleaseWeek: game.processedWeek+1+Number(scheduleRange.value),
      // A script consumed here is a JSON clone so mutating movie.story later never
      // reaches back into whatever the player is now typing for their next picture.
      story: game.currentScript ? JSON.parse(JSON.stringify(game.currentScript)) : neutralStory(genre),
      franchiseLink: game.pendingFranchiseLink || null
    };
    game.currentScript = null;
    game.pendingFranchiseLink = null;

    renderAll();
    setFormDisabled(true);
    game.pendingProductionMovie = movie;
    openProductionEvent(movie);
  }

// The Greenlight modal's non-committing options — each just adjusts the form and closes
// back to it so the player can review before requesting another greenlight.
export function greenlightDelay(){
    greenlightModal.classList.add('hidden');
    scheduleRange.value = Math.min(52, Number(scheduleRange.value)+4);
    scheduleRange.dispatchEvent(new Event('input', {bubbles:true}));
  }
export function greenlightReduceScope(){
    greenlightModal.classList.add('hidden');
    sfxRange.value = Math.round(Number(sfxRange.value)*0.8/250000)*250000;
    marketingRange.value = Math.round(Number(marketingRange.value)*0.8/250000)*250000;
    sfxRange.dispatchEvent(new Event('input', {bubbles:true}));
    marketingRange.dispatchEvent(new Event('input', {bubbles:true}));
  }
export function greenlightIncreaseBudget(){
    greenlightModal.classList.add('hidden');
    sfxRange.value = Math.min(60000000, Math.round(Number(sfxRange.value)*1.2/250000)*250000);
    marketingRange.value = Math.min(60000000, Math.round(Number(marketingRange.value)*1.2/250000)*250000);
    sfxRange.dispatchEvent(new Event('input', {bubbles:true}));
    marketingRange.dispatchEvent(new Event('input', {bubbles:true}));
  }
export function greenlightCancel(){
    greenlightModal.classList.add('hidden');
  }

export function openProductionEvent(movie){
    var evt = PRODUCTION_EVENTS[randInt(0, PRODUCTION_EVENTS.length-1)];
    game.pendingEvent = evt;
    eventTitle.textContent = evt.title;
    eventBody.innerHTML = '<p style="color:var(--ink);font-size:0.9rem;">'+escapeHtml(evt.flavor(movie))+'</p>'+
      evt.choices.map(function(c){
        return '<button type="button" class="btn-secondary event-choice-btn" data-key="'+c.key+'">'+
          '<strong>'+escapeHtml(c.label)+'</strong><br><span style="font-weight:400;font-size:0.8rem;color:var(--ink-dim);">'+escapeHtml(c.description)+'</span></button>';
      }).join('');
    var btns = eventBody.querySelectorAll('.event-choice-btn');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var key = btn.getAttribute('data-key');
        var choice = evt.choices.filter(function(c){ return c.key===key; })[0];
        // A skilled producer softens the dollar cost of whatever this event ends up
        // costing — the random outcome itself (and any non-dollar stat changes) are
        // untouched; risk management buys you a smaller bill, not better luck.
        var costBefore = movie.eventCost;
        var outcome = choice.apply(movie);
        var costIncurred = movie.eventCost-costBefore;
        if(costIncurred>0 && movie.producerRef){
          var reduction = producerRiskReduction(movie.producerRef);
          var refund = Math.round(costIncurred*reduction);
          if(refund>0){
            player.cash += refund;
            movie.eventCost -= refund;
            outcome += ' '+escapeHtml(movie.producerRef.name)+'\u2019s experience keeps costs down \u2014 '+formatMoney(refund)+' saved.';
          }
        }
        addNews('⚡ '+evt.title+' — '+escapeHtml(choice.label)+' ('+escapeHtml(movie.title)+')');
        renderHeader();
        showEventOutcome(outcome, movie);
      });
    });
    eventModal.classList.remove('hidden');
  }

export function showEventOutcome(outcome, movie){
    eventBody.innerHTML = '<p style="color:var(--ink);">'+outcome+'</p>'+
      '<button type="button" class="btn-primary" id="eventContinueBtn">Continue to Production</button>';
    $('eventContinueBtn').addEventListener('click', function(){
      eventModal.classList.add('hidden');
      startProductionShoot(movie);
    });
  }

// ===== Week-by-week Production shoot =====
// Sits between the pre-shoot Production Event (the one-time surprise "before cameras
// roll") and Test Screening (which screens a finished rough cut) — narratively this is
// where the movie actually gets made. Reuses the same weekly-tick plumbing the box
// office ticker uses (advanceOneWeek) so overhead/loans/AI activity/awards all still
// progress normally while a picture is in production.
export function startProductionShoot(movie){
    movie.productionWeeks = computeProductionWeeks(movie.runtime, movie.story);
    movie.shootMorale = 70;
    nowShowingPlaceholder.classList.add('hidden');
    filmingPanel.classList.remove('hidden');
    filmingTitle.textContent = movie.title;
    filmingMeta.textContent = movie.genre+' • Directed by '+movie.director.name+' • Producer: '+movie.producerName;
    filmingTickerBody.innerHTML = '';
    renderFilmingStats(movie, 0, movie.productionWeeks);
    setFormDisabled(true);
    game.currentShoot = { movie: movie, weekIndex: 0, extraWeeks: 0, intervalId: null };
    game.currentShoot.intervalId = setInterval(processShootWeek, 1000);
    processShootWeek();
  }

export function renderFilmingStats(movie, weekIndex, totalWeeks){
    filmingWeekDisplay.textContent = weekIndex+' / '+totalWeeks;
    filmingMoraleDisplay.textContent = Math.round(movie.shootMorale);
    filmingMoraleDisplay.style.color = movie.shootMorale<40 ? 'var(--crimson)' : (movie.shootMorale<70 ? 'var(--gold-bright)' : 'var(--emerald)');
    filmingSpendDisplay.textContent = formatMoney(movie.eventCost||0);
  }

export function appendFilmingRow(weekNum, text){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>Week '+weekNum+'</td><td>'+text+'</td>';
    filmingTickerBody.insertBefore(tr, filmingTickerBody.firstChild);
  }

export function processShootWeek(){
    var shoot = game.currentShoot;
    if(!shoot) return;
    var movie = shoot.movie;
    advanceOneWeek();
    shoot.weekIndex++;
    renderHeader();

    var totalPlanned = movie.productionWeeks+shoot.extraWeeks;
    if(Math.random()<0.32){
      clearInterval(shoot.intervalId);
      openShootEvent(movie, shoot);
      return;
    }
    appendFilmingRow(shoot.weekIndex, 'Production continues on schedule.');
    renderFilmingStats(movie, shoot.weekIndex, totalPlanned);

    if(shoot.weekIndex>=totalPlanned){
      clearInterval(shoot.intervalId);
      finishShoot(movie);
    }
  }

export function openShootEvent(movie, shoot){
    var evt = SHOOT_EVENTS[randInt(0, SHOOT_EVENTS.length-1)];
    eventTitle.textContent = evt.title;
    eventBody.innerHTML = '<p style="color:var(--ink);font-size:0.9rem;">'+escapeHtml(evt.flavor(movie))+'</p>'+
      evt.choices.map(function(c){
        return '<button type="button" class="btn-secondary event-choice-btn" data-key="'+c.key+'">'+
          '<strong>'+escapeHtml(c.label)+'</strong><br><span style="font-weight:400;font-size:0.8rem;color:var(--ink-dim);">'+escapeHtml(c.description)+'</span></button>';
      }).join('');
    var btns = eventBody.querySelectorAll('.event-choice-btn');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var key = btn.getAttribute('data-key');
        var choice = evt.choices.filter(function(c){ return c.key===key; })[0];
        var ctx = { extraWeeks:0, moraleDelta:0 };
        var costBefore = movie.eventCost;
        var outcome = choice.apply(movie, ctx);
        var costIncurred = movie.eventCost-costBefore;
        if(costIncurred>0 && movie.producerRef){
          var reduction = producerRiskReduction(movie.producerRef);
          var refund = Math.round(costIncurred*reduction);
          if(refund>0){
            player.cash += refund;
            movie.eventCost -= refund;
            outcome += ' '+escapeHtml(movie.producerRef.name)+'\u2019s experience keeps costs down \u2014 '+formatMoney(refund)+' saved.';
          }
        }
        shoot.extraWeeks += ctx.extraWeeks;
        movie.shootMorale = clamp(movie.shootMorale+ctx.moraleDelta, 0, 100);
        addNews('🎥 '+evt.title+' — '+escapeHtml(choice.label)+' ('+escapeHtml(movie.title)+')');
        renderHeader();
        appendFilmingRow(shoot.weekIndex, evt.title+' — '+outcome);
        renderFilmingStats(movie, shoot.weekIndex, movie.productionWeeks+shoot.extraWeeks);
        eventModal.classList.add('hidden');

        var totalPlanned = movie.productionWeeks+shoot.extraWeeks;
        if(shoot.weekIndex>=totalPlanned){
          finishShoot(movie);
        } else {
          shoot.intervalId = setInterval(processShootWeek, 1000);
        }
      });
    });
    eventModal.classList.remove('hidden');
  }

export function fastForwardShoot(){
    var shoot = game.currentShoot;
    if(!shoot) return;
    if(shoot.intervalId){ clearInterval(shoot.intervalId); }
    var movie = shoot.movie;
    var guard = 0;
    while(game.currentShoot && guard<30){
      advanceOneWeek();
      shoot.weekIndex++;
      if(Math.random()<0.32){
        var evt = SHOOT_EVENTS[randInt(0, SHOOT_EVENTS.length-1)];
        var choice = evt.choices[0]; // fast-forward defaults to the first (typically "pay to stay on track") option
        var ctx = { extraWeeks:0, moraleDelta:0 };
        var costBefore = movie.eventCost;
        var outcome = choice.apply(movie, ctx);
        var costIncurred = movie.eventCost-costBefore;
        if(costIncurred>0 && movie.producerRef){
          var reduction = producerRiskReduction(movie.producerRef);
          var refund = Math.round(costIncurred*reduction);
          if(refund>0){ player.cash += refund; movie.eventCost -= refund; }
        }
        shoot.extraWeeks += ctx.extraWeeks;
        movie.shootMorale = clamp(movie.shootMorale+ctx.moraleDelta, 0, 100);
        appendFilmingRow(shoot.weekIndex, evt.title+' — '+outcome);
      } else {
        appendFilmingRow(shoot.weekIndex, 'Production continues on schedule.');
      }
      var totalPlanned = movie.productionWeeks+shoot.extraWeeks;
      renderFilmingStats(movie, shoot.weekIndex, totalPlanned);
      if(shoot.weekIndex>=totalPlanned){
        finishShoot(movie);
      }
      guard++;
    }
  }

export function finishShoot(movie){
    // A happier set makes a modestly better, modestly better-buzzed picture — folded
    // into the same accumulators computeFilmMetrics already reads, so nothing else
    // downstream needs to know a shoot phase exists at all.
    movie.qualityDelta += (movie.shootMorale-70)*0.12;
    movie.hypeDelta += (movie.shootMorale-70)*0.08;
    filmingPanel.classList.add('hidden');
    game.currentShoot = null;
    openPostProductionReview(movie);
  }

// ===== Post-Production =====
// Deliberately lighter than the Shoot — one real choice (how much to invest in the
// edit/sound/VFX/color pass) and a real chance of one more (whether a flagged scene is
// worth reshooting) stands in for the whole montage without turning it into its own
// multi-week ticker.
export function openPostProductionReview(movie){
    postProductionIntro.textContent = 'The shoot has wrapped on "'+movie.title+'." Choose how much to invest in the edit, sound, VFX, and color pass before it goes in front of an audience.';
    postProductionTierList.innerHTML = POST_PRODUCTION_TIERS.map(function(tier){
      var cost = postProductionCost(tier, movie);
      return '<button type="button" class="btn-secondary post-tier-btn" data-tier="'+tier.id+'" style="display:block;width:100%;text-align:left;margin-bottom:8px;">'+
        '<strong>'+escapeHtml(tier.name)+'</strong> — '+formatMoney(cost)+' • '+tier.weeks+' week(s)<br>'+
        '<span style="font-weight:400;font-size:0.8rem;color:var(--ink-dim);">'+escapeHtml(tier.desc)+'</span></button>';
    }).join('');
    postProductionTierList.querySelectorAll('.post-tier-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var tierId = btn.getAttribute('data-tier');
        var tier = POST_PRODUCTION_TIERS.filter(function(t){ return t.id===tierId; })[0];
        confirmPostProductionTier(movie, tier);
      });
    });
    postProductionModal.classList.remove('hidden');
  }

export function confirmPostProductionTier(movie, tier){
    var cost = postProductionCost(tier, movie);
    if(cost>player.cash){
      if(!confirm('This tier costs '+formatMoney(cost)+', putting the studio further into debt. Proceed?')) return;
    }
    player.cash -= cost;
    movie.eventCost += cost;
    movie.qualityDelta += tier.qualityDelta;
    movie.hypeDelta += tier.hypeDelta;
    movie.postProductionTier = tier.id;
    postProductionModal.classList.add('hidden');
    addNews('🎞 Post-production on "'+escapeHtml(movie.title)+'" wraps: '+escapeHtml(tier.name)+'.');
    renderHeader();

    if(Math.random()<0.35){
      openPostProductionEvent(movie);
    } else {
      computeFilmMetrics(movie);
      openTestScreening(movie);
    }
  }

export function openPostProductionEvent(movie){
    var evt = ADDITIONAL_PHOTOGRAPHY_EVENT;
    eventTitle.textContent = evt.title;
    eventBody.innerHTML = '<p style="color:var(--ink);font-size:0.9rem;">'+escapeHtml(evt.flavor(movie))+'</p>'+
      evt.choices.map(function(c){
        return '<button type="button" class="btn-secondary event-choice-btn" data-key="'+c.key+'">'+
          '<strong>'+escapeHtml(c.label)+'</strong><br><span style="font-weight:400;font-size:0.8rem;color:var(--ink-dim);">'+escapeHtml(c.description)+'</span></button>';
      }).join('');
    var btns = eventBody.querySelectorAll('.event-choice-btn');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var key = btn.getAttribute('data-key');
        var choice = evt.choices.filter(function(c){ return c.key===key; })[0];
        var costBefore = movie.eventCost;
        var outcome = choice.apply(movie);
        var costIncurred = movie.eventCost-costBefore;
        if(costIncurred>0 && movie.producerRef){
          var reduction = producerRiskReduction(movie.producerRef);
          var refund = Math.round(costIncurred*reduction);
          if(refund>0){
            player.cash += refund;
            movie.eventCost -= refund;
            outcome += ' '+escapeHtml(movie.producerRef.name)+'\u2019s experience keeps costs down \u2014 '+formatMoney(refund)+' saved.';
          }
        }
        addNews('🎬 '+evt.title+' — '+escapeHtml(choice.label)+' ('+escapeHtml(movie.title)+')');
        renderHeader();
        eventBody.innerHTML = '<p style="color:var(--ink);">'+outcome+'</p>'+
          '<button type="button" class="btn-primary" id="eventContinueBtn">Continue to Test Screening</button>';
        $('eventContinueBtn').addEventListener('click', function(){
          eventModal.classList.add('hidden');
          computeFilmMetrics(movie);
          openTestScreening(movie);
        });
      });
    });
    eventModal.classList.remove('hidden');
  }

export function computeFilmMetrics(movie){
    var quality = computeQuality(movie.effWriterSkill, movie.effDirectorSkill, movie.sfxBudget, movie.marketingBudget, movie.genre, movie.effStar1Power, movie.star2.starPower);
    quality = clamp(quality + movie.qualityDelta, 0, 100);
    var hype = computeHype(movie.marketingBudget, movie.effStar1Power, movie.star2.starPower, movie.channels);
    hype = clamp(hype + movie.hypeDelta, 0, 100);

    // Script Development modifiers. A neutral (unwritten) script has every stat at 50,
    // so every (stat-50) term below is zero — players who skip Script Dev entirely see
    // no behavior change from before this system existed.
    var story = movie.story;
    quality = clamp(quality + (story.characterDepth-50)*0.15 + (story.originality-50)*0.10 + (story.awardsPotential-50)*0.12, 0, 100);
    hype = clamp(hype + (story.commercialAppeal-50)*0.15 - Math.max(0, story.originality-60)*0.15, 0, 100);

    // Genre Demand & Market Saturation: a hot genre gives real hype/audience upside, but
    // if everyone else already flooded it with recent releases, saturation eats that edge —
    // "recognizing trends" beats "following them blindly" only when supply hasn't caught up.
    var demand = genreDemand[movie.genre] || 60;
    var saturation = getSaturation(movie.genre);
    movie.genreDemandAtRelease = demand;
    movie.genreSaturationAtRelease = saturation;
    hype = clamp(hype + (demand-60)*0.25 - saturation*0.15, 0, 100);

    // Release Strategy: theater rollout shape, hype/per-screen multipliers, and legs are
    // locked in here; the timing bonus/penalty (holiday/summer/awards-season match) is
    // applied later in proceedToRelease once the actual release week is finalized.
    var strategy = RELEASE_STRATEGIES.filter(function(s){ return s.id===movie.strategy; })[0] || RELEASE_STRATEGIES[0];
    movie.strategyObj = strategy;
    quality = clamp(quality + strategy.awardsBonus, 0, 100);
    hype = clamp(hype*strategy.hypeMultiplier, 0, 100);
    movie.effectiveTheaterCount = Math.max(20, Math.round(movie.theaterCount*strategy.theaterMultiplier));
    movie.platformFullTarget = movie.theaterCount;
    movie.platformExpandWeeks = strategy.platformExpand||0;
    movie.perScreenMultiplier = strategy.perScreenMultiplier;
    movie.legsBonus = strategy.legsBonus;

    // Expanded Movie Properties: Runtime, MPAA Rating, and Target Demographic each carry
    // a genre-fit score, the same pattern as the SFX-to-genre balance — mismatches cost you,
    // good fits pay off, and none of it is mandatory to engage with beyond the defaults.
    var runtimeFit = runtimeFitScore(movie.runtime, movie.genre);
    var ratingFit = (RATING_GENRE_FIT[movie.rating]||{})[movie.genre];
    if(ratingFit==null) ratingFit = 0.7;
    var demoFit = (DEMOGRAPHIC_GENRE_FIT[movie.demographic]||{})[movie.genre];
    if(demoFit==null) demoFit = 0.7;
    movie.runtimeFit = Math.round(runtimeFit);
    movie.ratingFit = Math.round(ratingFit*100);
    movie.demographicFit = Math.round(demoFit*100);
    quality = clamp(quality + (runtimeFit-50)*0.06, 0, 100);
    movie.effectiveTheaterCount = Math.max(20, Math.round(movie.effectiveTheaterCount*(0.7+ratingFit*0.3)));

    // Festival Premiere: the submission fee was already spent at green-light time; this
    // is the roll for whether it paid off.
    var festival = FESTIVALS.filter(function(f){ return f.id===movie.festival; })[0] || FESTIVALS[0];
    movie.festivalAccepted = null;
    if(festival.id!=='none'){
      movie.festivalAccepted = Math.random()<festival.acceptanceBase;
      if(movie.festivalAccepted){
        hype = clamp(hype+festival.hypeBoost, 0, 100);
        quality = clamp(quality+festival.awardsBoost, 0, 100);
      }
    }

    // Composer: a lighter-weight crew role than Writer/Director — no fit tables, just a
    // skill/prestige nudge to Quality and Critics on top of everything above. Library
    // Music (skill 15, no prestige) sits clearly below even the cheapest hired composer.
    quality = clamp(quality + (movie.composerSkill-50)*0.08 + (movie.composerPrestige-50)*0.03, 0, 100);

    movie.quality = quality;
    movie.hype = hype;

    var reviews = computeReviews(movie);
    var critics = reviews.critics;
    var audience = reviews.audience;
    critics = clamp(critics + (story.originality-50)*0.12 + (story.characterDepth-50)*0.10, 0, 100);
    critics = clamp(critics + (movie.composerSkill-50)*0.06 + (movie.composerPrestige-50)*0.04, 0, 100);
    audience = clamp(audience + (story.commercialAppeal-50)*0.15 + (demand-60)*0.15, 0, 100);
    audience = clamp(audience + (ratingFit-0.6)*20 + (demoFit-0.7)*15 + (runtimeFit-50)*0.08, 0, 100);
    if(festival.id!=='none' && movie.festivalAccepted){ critics = clamp(critics+festival.criticsBoost, 0, 100); }
    if(story.wordCount>0 && story.primaryGenre!==movie.genre){
      // A script written for one genre but shot as another confuses the marketing.
      audience = clamp(audience-8, 0, 100);
      critics = clamp(critics-4, 0, 100);
    }
    if(story.wordCount>0 && story.wordCount<80){
      audience = clamp(audience-5, 0, 100); // thin/underdeveloped synopsis
    }
    movie.criticsScore = Math.round(critics);
    movie.audienceScore = Math.round(audience);
    movie.certifiedFresh = movie.criticsScore > 75;
    movie.toxicWOM = movie.audienceScore < 40;
    movie.reviewSummary = buildReviewSummary(movie);
  }

export function openTestScreening(movie){
    var feedback = generateTestScreeningFeedback(movie);
    movie.testScreening = feedback;
    renderTestScreeningModal(movie, feedback);
    testScreeningModal.classList.remove('hidden');
  }

export function renderTestScreeningModal(movie, feedback){
    var metrics = [
      {key:'endingSatisfaction', label:'Ending Satisfaction'},
      {key:'characterLikability', label:'Character Likability'},
      {key:'pacing', label:'Pacing'},
      {key:'comedy', label:'Comedy'},
      {key:'action', label:'Action'},
      {key:'emotionalImpact', label:'Emotional Impact'},
      {key:'confusion', label:'Confusion'}
    ];
    testScreeningScores.innerHTML = metrics.map(function(m){
      return '<div class="budget-line"><span>'+m.label+'</span><span>'+feedback[m.key]+'%</span></div>';
    }).join('');

    var positive = metrics.filter(function(m){ return m.key!=='confusion'; });
    var weakest = positive.reduce(function(a,b){ return feedback[b.key]<feedback[a.key] ? b : a; });
    var suggestion = 'Audiences signal the weakest link is: <strong>'+weakest.label+'</strong> ('+feedback[weakest.key]+'%).';
    if(feedback.confusion>60){ suggestion += ' Confusion is also high ('+feedback.confusion+'%).'; }
    suggestion += ' Remember: audience notes aren\u2019t always right.';
    testScreeningSuggestion.innerHTML = suggestion;

    testScreeningChoices.innerHTML = TEST_SCREENING_CHOICES.map(function(c){
      var cost = c.costBase ? scaledCost(c.costBase) : 0;
      var costLabel = cost>0 ? formatMoney(cost) : 'Free';
      var delayLabel = c.delayWeeks>0 ? c.delayWeeks+' wk delay' : 'No delay';
      return '<button type="button" class="btn-secondary event-choice-btn" data-choice="'+c.id+'">'+
        '<strong>'+escapeHtml(c.label)+'</strong> — '+costLabel+', '+delayLabel+'<br>'+
        '<span style="font-weight:400;font-size:0.8rem;color:var(--ink-dim);">'+escapeHtml(c.desc)+'</span></button>';
    }).join('');

    var btns = testScreeningChoices.querySelectorAll('.event-choice-btn');
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var choiceId = btn.getAttribute('data-choice');
        var choiceDef = TEST_SCREENING_CHOICES.filter(function(c){ return c.id===choiceId; })[0];
        var result = applyTestScreeningChoice(movie, choiceId);
        addNews('🎦 Test screening — '+choiceDef.label+' ('+escapeHtml(movie.title)+')');
        renderHeader();
        showTestScreeningOutcome(result.outcome, function(){
          testScreeningModal.classList.add('hidden');
          if(choiceDef.delayWeeks>0){ advanceBackgroundSim(game.processedWeek+choiceDef.delayWeeks); }
          renderAll();
          proceedToRelease(movie);
        });
      });
    });
  }

export function showTestScreeningOutcome(outcome, onContinue){
    testScreeningScores.innerHTML = '';
    testScreeningChoices.innerHTML = '';
    testScreeningSuggestion.innerHTML = '<p style="color:var(--ink);text-align:left;">'+outcome+'</p>'+
      '<button type="button" class="btn-primary" id="testScreeningContinueBtn">Continue to Release</button>';
    $('testScreeningContinueBtn').addEventListener('click', onContinue);
  }

export function proceedToRelease(movie){
    movie.productionWeeks = computeProductionWeeks(movie.runtime, movie.story);
    var earliestPossible = (movie.productionStartWeek||game.processedWeek) + movie.productionWeeks;
    var target = Math.max(game.processedWeek+1, movie.targetReleaseWeek||0, earliestPossible);
    if(target>game.processedWeek+1){
      advanceBackgroundSim(target-1); // wait out the scheduled gap; overhead/loans/AI activity all still tick
    }
    var releaseWeek = game.processedWeek+1;
    movie.releaseWeek = releaseWeek;
    recordRelease(movie.genre, releaseWeek);

    var timingMatch = checkTimingMatch(movie.strategyObj, releaseWeek);
    movie.timingMatch = timingMatch;
    if(timingMatch===true){ movie.hype = clamp(movie.hype+12, 0, 100); }
    else if(timingMatch===false){ movie.hype = clamp(movie.hype-15, 0, 100); }

    var slotChance = 0.35 + (game.playerHeatWeeksRemaining>0 ? 0.10 : 0);
    var slotCompetitors = [];
    aiStudios.forEach(function(s){
      if(Math.random()<slotChance){
        var m = generateAIMovie(s, releaseWeek);
        if(m) slotCompetitors.push(m);
      }
    });
    game.processedWeek = releaseWeek;
    checkAwards();

    renderSlotReport(slotCompetitors, movie.genre);
    populateTalentSelects();
    startWeekByWeekRun(movie, slotCompetitors);
    renderAll();
  }

export function renderNowShowingBadges(movie){
    var badges = (movie.certifiedFresh ? ' <span class="review-tag fresh">🍅 Certified Fresh</span>' : '') +
                 (movie.toxicWOM ? ' <span class="review-tag toxic">☠️ Toxic Word of Mouth</span>' : '') +
                 (movie.breakoutRevealed ? ' <span class="review-tag breakout">🌟 Breakout Hit</span>' : '');
    nowShowingMeta.innerHTML = escapeHtml(movie.genre+' • Directed by '+movie.director.name+' • Starring '+movie.star1.name+' & '+movie.star2.name) + badges;
  }

export function startWeekByWeekRun(movie, slotCompetitors){
    tickerTableBody.innerHTML = '';
    nowShowingPlaceholder.classList.add('hidden');
    nowShowingContent.classList.remove('hidden');
    nowShowingTitle.textContent = movie.title + (movie.tagline ? ' — "'+movie.tagline+'"' : '');
    renderNowShowingBadges(movie);
    weeksElapsedDisplay.textContent = 'Week 0';
    theatersNowDisplay.textContent = '0';
    cumulativeBig.textContent = '$0';
    criticsScoreDisplay.textContent = movie.criticsScore+'%';
    audienceScoreDisplay.textContent = movie.audienceScore+'%';
    var rs = movie.reviewSummary;
    divergenceTag.textContent = rs.divergence.icon+' '+rs.divergence.label;
    divergenceTag.className = 'divergence-tag '+rs.divergence.cls;
    criticsBlurbText.textContent = '🍅 "'+rs.criticsBlurb.quote+'" — '+rs.criticsBlurb.source;
    audienceBlurbText.textContent = '🍿 "'+rs.audienceBlurb.quote+'" — '+rs.audienceBlurb.source;

    movie.isBreakout = checkBreakoutEligibility(movie);
    movie.breakoutRevealed = false;
    if(movie.isBreakout){ movie.breakoutTalent = pickBreakoutTalent(movie); }

    game.currentRun = {
      movie: movie, slotCompetitors: slotCompetitors,
      weekIndex: 0, cumulative: 0, prevWeekly: 0, prevTheaters: 0, intervalId: null
    };
    game.currentRun.intervalId = setInterval(processNextWeek, 1000);
    processNextWeek();
  }

export function appendTickerRow(row){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>'+row.week+'</td><td>'+row.theaters.toLocaleString()+'</td><td>'+formatMoney(row.weeklyGross)+'</td><td>'+formatMoney(row.cumulative)+'</td><td>'+(row.note?escapeHtml(row.note):'—')+'</td>';
    tickerTableBody.insertBefore(tr, tickerTableBody.firstChild);
    cumulativeBig.textContent = formatMoney(row.cumulative);
    theatersNowDisplay.textContent = row.theaters.toLocaleString()+' screens';
    weeksElapsedDisplay.textContent = 'Week '+row.week;
  }

export function processNextWeek(){
    var run = game.currentRun;
    if(!run) return;
    var movie = run.movie;
    var weekNum = movie.releaseWeek + run.weekIndex;
    var theaters, weeklyGross, note = '';

    if(run.weekIndex===0){
      theaters = movie.effectiveTheaterCount || movie.theaterCount;
      var perScreen = 5000*(movie.hype/50)*(movie.perScreenMultiplier||1);
      var gross = theaters*perScreen*(0.85+movie.quality/100*0.3);
      var clash = null;
      for(var i=0;i<run.slotCompetitors.length;i++){
        if(run.slotCompetitors[i].genre===movie.genre){ clash = run.slotCompetitors[i]; break; }
      }
      if(clash){
        var pen = rand(0.15,0.35);
        gross *= (1-pen);
        note = '⚔️ "'+clash.title+'" ('+clash.studioName+') opened opposite you — down '+Math.round(pen*100)+'%';
      }
      weeklyGross = gross;
    } else {
      var weekPenalty = 0, penaltyNote = '';
      var reactiveChance = 0.10 + (game.playerHeatWeeksRemaining>0 ? 0.04 : 0);
      aiStudios.forEach(function(s){
        if(Math.random()<reactiveChance){
          var m = generateAIMovie(s, weekNum);
          if(m && m.genre===movie.genre){
            var p = rand(0.10,0.25);
            if(p>weekPenalty){ weekPenalty = p; penaltyNote = '⚔️ "'+m.title+'" ('+s.name+') opened this week — down '+Math.round(p*100)+'%'; }
          }
        }
      });

      var inPlatformExpansion = movie.platformExpandWeeks>0 && run.weekIndex<=movie.platformExpandWeeks;

      // Word-of-mouth momentum: a genuinely well-liked film that hasn't yet found its
      // full audience can build week over week instead of just fading — the "sleeper
      // hit" story. Breakout-eligible films get a guaranteed run of this early on,
      // REGARDLESS of Toxic WOM — a breakout is precisely the story of overcoming a
      // rough-looking start. The probabilistic path (for non-breakout films) stays
      // gated behind genuinely good reception, since a poorly-received film shouldn't
      // randomly catch fire.
      var momentumActive = false;
      var inBreakoutWindow = movie.isBreakout && !inPlatformExpansion && run.weekIndex>=1 && run.weekIndex<=4;
      if(inBreakoutWindow){
        momentumActive = true;
      } else if(!inPlatformExpansion && !movie.toxicWOM && movie.audienceScore>=58 && run.weekIndex<=9){
        var perScreenNow = run.prevTheaters>0 ? run.prevWeekly/run.prevTheaters : 0;
        var expectedPerScreen = 35*movie.audienceScore;
        if(perScreenNow < expectedPerScreen*0.65){
          var momentumChance = 0.08 + (movie.audienceScore-58)/100*0.22 + (movie.certifiedFresh?0.07:0);
          momentumActive = Math.random()<momentumChance;
        }
      }

      var g;
      if(momentumActive){
        var expandMult = movie.isBreakout ? rand(1.15,1.35) : rand(1.05,1.20);
        var growMult = movie.isBreakout ? rand(1.25,1.55) : rand(1.10,1.35);
        theaters = Math.min(4000, Math.round(run.prevTheaters*expandMult));
        g = run.prevWeekly*growMult*rand(0.95,1.05);
        if(movie.isBreakout && !movie.breakoutRevealed){
          movie.breakoutRevealed = true;
          note = '🌟 Something is happening — word of mouth is exploding on "'+movie.title+'."';
        } else {
          note = '📈 Word of mouth is building — up '+Math.round((growMult-1)*100)+'% this week!';
        }
      } else {
        var baseDecay = clamp(0.55+movie.quality/100*0.3+(movie.legsBonus||0), 0.3, 0.95);
        // Reviews subsystem: Certified Fresh slows decay by 10%; Toxic Word of Mouth doubles the drop-off.
        if(movie.certifiedFresh){ baseDecay = clamp(baseDecay*1.10, 0, 0.95); }
        if(movie.toxicWOM){ baseDecay = clamp(2*baseDecay - 1, 0.05, 1); }

        var perScreenPrev = run.prevTheaters>0 ? run.prevWeekly/run.prevTheaters : 0;
        var theaterMult;
        if(perScreenPrev>3000) theaterMult = 0.97;
        else if(perScreenPrev>1500) theaterMult = 0.90;
        else if(perScreenPrev>600) theaterMult = 0.78;
        else theaterMult = 0.60;

        if(inPlatformExpansion){
          // Platform Release: expand toward the full target instead of shrinking.
          theaters = Math.min(movie.platformFullTarget, Math.round(run.prevTheaters*2.0));
        } else {
          theaters = Math.round(run.prevTheaters*theaterMult);
          if(theaters<20) theaters = 0;
        }
        g = theaters===0 ? 0 : run.prevWeekly*baseDecay*theaterMult*rand(0.9,1.1);
      }
      if(weekPenalty>0 && theaters>0){ g *= (1-weekPenalty); if(!note) note = penaltyNote; }
      weeklyGross = g;
    }

    run.cumulative += weeklyGross;
    run.prevWeekly = weeklyGross;
    run.prevTheaters = theaters;
    run.weekIndex++;
    game.processedWeek = Math.max(game.processedWeek, weekNum);
    chargeOverheadForWeek();
    chargeLoanPaymentsForWeek();
    checkQuarterlyEarnings();
    tickPlayerHeat();
    tickPassiveIncome();
    checkAwards();

    appendTickerRow({week: run.weekIndex, theaters: theaters, weeklyGross: weeklyGross, cumulative: run.cumulative, note: note});
    renderNowShowingBadges(movie);
    renderCompetitors();
    renderNews();
    renderHeader();

    if(theaters===0 || run.weekIndex>=40){
      clearInterval(run.intervalId);
      finishRun();
    }
  }

