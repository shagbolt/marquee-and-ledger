import { FESTIVALS, clamp, escapeHtml, formatMoney, rand, randInt } from '../data/constants.js';
import { currentTier, finance, game, player } from '../state/game-state.js';
import { markPlayerHeat } from '../systems/ai-studios.js';
import { checkAwards } from '../systems/awards.js';
import { addLongTailLicensing } from '../systems/franchise.js';
import { applyProfitShareDeductions, weekInYearOf, yearOf } from '../systems/market.js';
import { INTL_MARKETS, computeApprovalChance, estimateMarketRevenue, marketCost } from '../systems/release-strategy.js';
import { computeStreamingRevenue, cultStreamEligible } from '../systems/streaming.js';
import { applyPrestigeDelta, commercialPrestigeComponent, logPrestigeChange, reviewPrestigeComponent, verdictInfo } from '../systems/talent-quality.js';
import { awardsBody, awardsModal, awardsYearLabel, finaleBody, finaleModal, finaleTitle, finalizeStreamingBtn, internationalMarketsList, internationalModal, internationalSummaryLine, intlTotalCostDisplay, platformDescription, streamingModal, streamingPlatformSelect, streamingPreviewAmount, streamingTheatricalSummary, streamingWindowSelect, summaryBody, summaryModal, $ } from '../ui/dom-refs.js';
import { computePlayerRank } from '../ui/render.js';
import { getSeasonGoalLabel } from '../systems/season-goals.js';
import { animateMoneyCounter, generateCausalExplanation } from '../ui/reveal.js';
import { addNews, populateTalentSelects, renderAll, setFormDisabled } from '../ui/render.js';

export function finishRun(){
    var run = game.currentRun;
    var movie = run.movie;
    movie.totalBoxOffice = run.cumulative;
    movie.theatricalRevenue = run.cumulative*0.5;
    game.currentRun = null;
    openInternationalModal(movie);
  }

export function openInternationalModal(movie){
    if(player.prestige<40){
      // International department not yet unlocked — skip straight to Streaming.
      movie.internationalCost = 0;
      movie.internationalRevenue = 0;
      movie.internationalResults = [];
      openStreamingWindow(movie);
      return;
    }
    game.pendingIntlMovie = movie;
    game.pendingIntlSelections = {};
    renderInternationalModal(movie);
    internationalModal.classList.remove('hidden');
  }

export function renderInternationalModal(movie){
    internationalSummaryLine.textContent = 'Domestic Box Office: '+formatMoney(movie.totalBoxOffice)+' • Select the markets to release in.';
    internationalMarketsList.innerHTML = INTL_MARKETS.map(function(m){
      var cost = marketCost(m, movie);
      var approval = computeApprovalChance(m, movie);
      var est = estimateMarketRevenue(m, movie);
      var checked = game.pendingIntlSelections[m.id] ? 'checked' : '';
      return '<label class="tier-card" style="cursor:pointer;">'+
        '<input type="checkbox" class="intl-market-check" data-market="'+m.id+'" '+checked+'>'+
        '<div class="tier-card-body">'+
          '<div class="tier-card-title">'+m.icon+' '+m.name+' <span class="tier-card-cash">'+formatMoney(cost)+'</span></div>'+
          '<div class="tier-card-stats">Approval '+Math.round(approval*100)+'% • Est. Revenue '+formatMoney(est*0.7)+'–'+formatMoney(est*1.3)+' • Censorship: '+m.censorship+'</div>'+
        '</div>'+
      '</label>';
    }).join('');
    internationalMarketsList.querySelectorAll('.intl-market-check').forEach(function(cb){
      cb.addEventListener('change', function(){
        game.pendingIntlSelections[cb.getAttribute('data-market')] = cb.checked;
        updateIntlTotalCost();
      });
    });
    updateIntlTotalCost();
  }

export function updateIntlTotalCost(){
    var movie = game.pendingIntlMovie;
    var total = 0;
    INTL_MARKETS.forEach(function(m){
      if(game.pendingIntlSelections[m.id]){ total += marketCost(m, movie); }
    });
    intlTotalCostDisplay.textContent = 'Total Localization Cost: '+formatMoney(total);
  }

export function finalizeInternational(){
    var movie = game.pendingIntlMovie;
    var selected = INTL_MARKETS.filter(function(m){ return game.pendingIntlSelections[m.id]; });
    var totalCost = selected.reduce(function(sum,m){ return sum+marketCost(m, movie); }, 0);
    if(totalCost>player.cash){
      if(!confirm('International localization costs '+formatMoney(totalCost)+', putting the studio further into debt. Proceed?')) return;
    }
    player.cash -= totalCost;
    var totalRevenue = 0;
    var results = [];
    selected.forEach(function(m){
      var approval = computeApprovalChance(m, movie);
      var approved = Math.random()<approval;
      var revenue = approved ? Math.round(estimateMarketRevenue(m, movie)*rand(0.8,1.2)) : 0;
      totalRevenue += revenue;
      results.push({ market:m.name, icon:m.icon, cost:marketCost(m, movie), approved:approved, revenue:revenue });
    });
    movie.internationalCost = totalCost;
    movie.internationalRevenue = totalRevenue;
    movie.internationalResults = results;
    internationalModal.classList.add('hidden');
    renderAll();
    openStreamingWindow(movie);
  }

export function skipInternational(){
    var movie = game.pendingIntlMovie;
    movie.internationalCost = 0;
    movie.internationalRevenue = 0;
    movie.internationalResults = [];
    internationalModal.classList.add('hidden');
    openStreamingWindow(movie);
  }

export function openStreamingWindow(movie){
    game.pendingStreamMovie = movie;
    streamingTheatricalSummary.textContent =
      'Theatrical run complete — Box Office Gross '+formatMoney(movie.totalBoxOffice)+
      ' • Theatrical Revenue '+formatMoney(movie.theatricalRevenue)+
      ' • Critics '+movie.criticsScore+'% • Audience '+movie.audienceScore+'%';
    streamingPlatformSelect.value = 'netflix';
    streamingWindowSelect.value = 'delayed';
    updateStreamingPreview();
    streamingModal.classList.remove('hidden');
  }

export function updateStreamingPreview(){
    var movie = game.pendingStreamMovie;
    if(!movie) return;
    var platform = streamingPlatformSelect.value;
    var windowing = streamingWindowSelect.value;
    var rev = computeStreamingRevenue(movie, platform);
    var amount = rev.amount * (windowing==='immediate' ? 1.2 : 1.0);

    var desc = '';
    if(platform==='netflix'){
      desc = 'A guaranteed lump-sum buyout based on your box office gross and audience score. Low risk, no surprises.';
    } else if(platform==='prime'){
      desc = 'Pays out over a virtual 4-week cycle. High-quality films compound in popularity — real upside for a well-reviewed picture.';
      if(rev.breakdown){
        desc += ' Projected: ' + rev.breakdown.map(function(w,i){ return 'Wk'+(i+1)+' '+formatMoney(w); }).join(', ') + '.';
      }
    } else if(platform==='cultstream'){
      if(cultStreamEligible(movie)){
        desc = 'Your critically-adored flop qualifies for a Cult Classic deal — a flat bonus regardless of box office.';
      } else {
        desc = 'Unavailable for this film — CultStream only signs pictures with a Critic Score above 80% AND a theatrical gross under $5,000,000.';
      }
    }
    platformDescription.textContent = desc;
    streamingPreviewAmount.textContent = 'Estimated Payout: '+formatMoney(amount) + (windowing==='immediate' ? ' (includes +20% immediate-window bonus)' : '');
    finalizeStreamingBtn.disabled = (platform==='cultstream' && !cultStreamEligible(movie));
  }

export function finalizeStreamingDeal(){
    var movie = game.pendingStreamMovie;
    if(!movie) return;
    var platform = streamingPlatformSelect.value;
    var windowing = streamingWindowSelect.value;
    if(platform==='cultstream' && !cultStreamEligible(movie)) return;

    var prestigeBefore = player.prestige;
    var rankBefore = computePlayerRank();

    var rev = computeStreamingRevenue(movie, platform);
    var streamingRevenue = rev.amount * (windowing==='immediate' ? 1.2 : 1.0);
    movie.streamingPlatform = platform;
    movie.streamingWindow = windowing;
    movie.streamingRevenue = streamingRevenue;
    movie.streamingBreakdown = rev.breakdown;

    movie.studioRevenue = movie.theatricalRevenue + movie.streamingRevenue + (movie.internationalRevenue||0);
    var totalSpent = movie.totalBudget + movie.eventCost + (movie.testScreeningCost||0) + (movie.internationalCost||0);
    movie.totalSpent = totalSpent;
    movie.profit = movie.studioRevenue - totalSpent;
    movie.roi = totalSpent>0 ? movie.profit/totalSpent : 0;
    var info = verdictInfo(movie.roi);
    movie.verdict = info.emoji+' '+info.label;
    movie.verdictCls = info.cls;
    movie.releaseYear = yearOf(movie.releaseWeek);
    if(info.cls==='blockbuster'){ markPlayerHeat(movie.genre); }

    player.cash += movie.theatricalRevenue + movie.streamingRevenue + (movie.internationalRevenue||0);
    movie.investorCut = applyProfitShareDeductions(movie);
    if(finance.isPublic){ finance.quarterProfitAccum += movie.profit; }
    if(movie.profit>0){ finance.investorConfidence = clamp(finance.investorConfidence+2, 0, 100); }
    else if(finance.profitShareDeals.length>0){ finance.investorConfidence = clamp(finance.investorConfidence-6, 0, 100); }

    // Prestige (and therefore future fees) move on TWO axes: commercial performance
    // (box office + streaming revenue vs. cost) and reviews. Writers/directors are
    // craft roles judged mainly by critics; stars are audience-facing and judged
    // mainly by the Popcornmeter. The studio itself blends both.
    var commercial = commercialPrestigeComponent(movie.roi);
    var criticsDelta = reviewPrestigeComponent(movie.criticsScore);
    var audienceDelta = reviewPrestigeComponent(movie.audienceScore);
    var avgReview = (movie.criticsScore + movie.audienceScore) / 2;
    var reviewDeltaStudio = reviewPrestigeComponent(avgReview);

    var writerBase = commercial + criticsDelta;
    var directorBase = commercial + criticsDelta;
    var composerBase = commercial + criticsDelta;
    var sfxBase = commercial + criticsDelta;
    // Producers are judged more on delivering the whole production successfully than on
    // critical acclaim specifically — commercial performance counts for more here, and
    // the "reviews" half uses the overall audience+critics blend rather than critics alone.
    var producerBase = commercial*1.2 + reviewDeltaStudio*0.4;
    var starBase = commercial + audienceDelta;
    // Investor expectations: bigger tiers judge a bomb more harshly at the studio level
    // (talent prestige is unaffected by tier — a bad performance is a bad performance
    // for the people involved regardless of who signs their checks).
    var studioCommercial = commercial;
    if(studioCommercial<0 && currentTier){ studioCommercial = studioCommercial*currentTier.expectation; }
    var studioBase = studioCommercial + reviewDeltaStudio + (movie.strategyObj ? movie.strategyObj.prestigeBonus : 0);

    if(windowing==='immediate'){
      // Immediate streaming dampens the *gain* in prestige (stars dislike skipping the exclusive window);
      // losses from a bomb are unaffected.
      if(writerBase>0) writerBase *= 0.5;
      if(directorBase>0) directorBase *= 0.5;
      if(composerBase>0) composerBase *= 0.5;
      if(producerBase>0) producerBase *= 0.5;
      if(sfxBase>0) sfxBase *= 0.5;
      if(starBase>0) starBase *= 0.5;
      if(studioBase>0) studioBase *= 0.5;
    }

    movie.prestigeDeltas = {
      writer: applyPrestigeDelta(movie.writer, writerBase),
      director: applyPrestigeDelta(movie.director, directorBase),
      star1: applyPrestigeDelta(movie.star1, starBase),
      star2: applyPrestigeDelta(movie.star2, starBase)
    };
    if(movie.composerRef){ movie.prestigeDeltas.composer = applyPrestigeDelta(movie.composerRef, composerBase); }
    if(movie.producerRef){ movie.prestigeDeltas.producer = applyPrestigeDelta(movie.producerRef, producerBase); }
    if(movie.sfxHouseRef){ movie.prestigeDeltas.sfxHouse = applyPrestigeDelta(movie.sfxHouseRef, sfxBase); }
    movie.prestigeBreakdown = {
      writer:{commercial:commercial, review:criticsDelta, reviewLabel:'Critics'},
      director:{commercial:commercial, review:criticsDelta, reviewLabel:'Critics'},
      star1:{commercial:commercial, review:audienceDelta, reviewLabel:'Audience'},
      star2:{commercial:commercial, review:audienceDelta, reviewLabel:'Audience'},
      studio:{commercial:commercial, review:reviewDeltaStudio, reviewLabel:'Reviews'}
    };
    if(movie.composerRef){ movie.prestigeBreakdown.composer = {commercial:commercial, review:criticsDelta, reviewLabel:'Critics'}; }
    if(movie.producerRef){ movie.prestigeBreakdown.producer = {commercial:Math.round(commercial*1.2), review:Math.round(reviewDeltaStudio*0.4), reviewLabel:'Overall Reviews'}; }
    if(movie.sfxHouseRef){ movie.prestigeBreakdown.sfxHouse = {commercial:commercial, review:criticsDelta, reviewLabel:'Critics'}; }

    // A permanent snapshot — prestige keeps moving with every picture a person does
    // afterward, so this is the only place "what was their prestige on this film" can
    // still be answered accurately once you're looking back at it later.
    movie.prestigeAtRelease = {
      writer: Math.round(movie.writer.prestige),
      director: Math.round(movie.director.prestige),
      star1: Math.round(movie.star1.prestige),
      star2: Math.round(movie.star2.prestige),
      producer: movie.producerRef ? Math.round(movie.producerRef.prestige) : null,
      composer: movie.composerRef ? Math.round(movie.composerRef.prestige) : null,
      sfxHouse: movie.sfxHouseRef ? Math.round(movie.sfxHouseRef.prestige) : null
    };

    movie.studioPrestigeDelta = applyPrestigeDelta(player, studioBase);
    logPrestigeChange(movie.title, movie.studioPrestigeDelta);

    if(movie.isBreakout && movie.breakoutTalent){
      var breakoutBonus = randInt(22,32);
      movie.breakoutBonusApplied = applyPrestigeDelta(movie.breakoutTalent.person, breakoutBonus);
      logPrestigeChange(movie.breakoutTalent.person.name+' (breakout)', movie.breakoutBonusApplied);
      addNews('🌟 BREAKOUT: '+escapeHtml(movie.breakoutTalent.person.name)+' ('+movie.breakoutTalent.role+') is the name everyone\'s talking about after "'+escapeHtml(movie.title)+'." Prestige +'+movie.breakoutBonusApplied+'.');
    }

    addLongTailLicensing(movie);
    if(movie.franchiseLink){
      var originalMovie = player.moviesAll.filter(function(m){ return m.id===movie.franchiseLink.originalId; })[0];
      if(originalMovie){
        originalMovie.franchiseExtensions = originalMovie.franchiseExtensions||[];
        originalMovie.franchiseExtensions.push({ type:movie.franchiseLink.extensionType, label:movie.title, week:movie.releaseWeek });
      }
    }

    player.moviesAll.push(movie);
    game.pendingStreamMovie = null;
    checkAwards();

    streamingModal.classList.add('hidden');
    setFormDisabled(false);
    populateTalentSelects();
    renderAll();
    showSummaryModal(movie, prestigeBefore, rankBefore);
  }

export function prestigeRowHtml(talent, role, delta, breakdown){
    var sign = delta>=0 ? '+' : '';
    var bSignC = breakdown.commercial>=0 ? '+' : '';
    var bSignR = breakdown.review>=0 ? '+' : '';
    return '<div class="prestige-row"><span>'+role+': '+escapeHtml(talent.name)+'</span><span class="'+(delta>=0?'pos':'neg')+'">'+sign+delta+' → '+Math.round(talent.prestige)+'</span></div>'+
      '<div class="prestige-row-breakdown">Commercial '+bSignC+breakdown.commercial+' • '+breakdown.reviewLabel+' '+bSignR+breakdown.review+'</div>';
  }

export var PLATFORM_LABELS = { netflix:'NetFlix (Flat Licensing Fee)', prime:'Prime Video (Per-View Royalty)', cultstream:'CultStream (Cult Classic Bonus)' };

export function showSummaryModal(movie, prestigeBefore, rankBefore){
    var d = movie.prestigeDeltas;
    var b = movie.prestigeBreakdown;
    var streamLine = '<div class="receipt-line"><span>Streaming — '+PLATFORM_LABELS[movie.streamingPlatform]+' ('+(movie.streamingWindow==='immediate'?'Immediate':'Delayed')+')</span><span>'+formatMoney(movie.streamingRevenue)+'</span></div>';
    var eventLine = movie.eventCost>0 ? '<div class="receipt-line"><span>Production Event Costs</span><span>'+formatMoney(movie.eventCost)+'</span></div>' : '';
    var festivalFeeLine = movie.festivalCost>0 ? '<div class="receipt-line"><span>Festival Submission Fee</span><span>'+formatMoney(movie.festivalCost)+'</span></div>' : '';
    var testScreeningLine = movie.testScreeningCost>0 ? '<div class="receipt-line"><span>Test Screening Adjustments</span><span>'+formatMoney(movie.testScreeningCost)+'</span></div>' : '';
    var investorLine = movie.investorCut>0 ? '<div class="receipt-line"><span>Investor/Equity Profit Share</span><span>-'+formatMoney(movie.investorCut)+'</span></div>' : '';
    var scriptLine = '';
    if(movie.story && movie.story.wordCount>0){
      scriptLine = '<div class="review-line"><span>📝 Script</span><span>'+movie.story.primaryGenre+' • '+movie.story.tone+'</span></div>';
      if(movie.story.primaryGenre!==movie.genre){
        scriptLine += '<p class="review-quote" style="color:var(--crimson);">⚠️ Written as '+movie.story.primaryGenre+', released as '+movie.genre+' — the mismatch confused critics and audiences alike.</p>';
      }
    }
    var marketLine = movie.genreDemandAtRelease!=null ?
      '<div class="review-line"><span>📈 Market at Release</span><span>'+movie.genre+' Demand '+movie.genreDemandAtRelease+' • Saturation '+movie.genreSaturationAtRelease+'</span></div>' : '';
    var postTierNames = {minimal:'Minimal Post', standard:'Standard Post', premium:'Premium Post'};
    var propertiesLine = '<div class="review-line"><span>🎞 Production</span><span>'+movie.runtime+' min • '+movie.rating+' • '+movie.demographic+' • '+movie.productionWeeks+'-week shoot'+(movie.postProductionTier?' • '+(postTierNames[movie.postProductionTier]||movie.postProductionTier):'')+'</span></div>';
    if(movie.festival && movie.festival!=='none'){
      var festivalObj = FESTIVALS.filter(function(f){ return f.id===movie.festival; })[0];
      propertiesLine += '<div class="review-line"><span>🎪 '+(festivalObj?festivalObj.name:'Festival')+'</span><span>'+(movie.festivalAccepted?'✅ Accepted':'❌ Rejected')+'</span></div>';
    }
    var intlLine = '';
    if(movie.internationalResults && movie.internationalResults.length>0){
      intlLine = '<h4>🌍 International Distribution</h4>'+
        movie.internationalResults.map(function(r){
          return '<div class="receipt-line"><span>'+r.icon+' '+r.market+(r.approved?'':' (rejected)')+'</span><span>'+(r.approved?'+'+formatMoney(r.revenue):'—')+'</span></div>';
        }).join('')+
        '<div class="receipt-line"><span>Total Localization Cost</span><span>-'+formatMoney(movie.internationalCost)+'</span></div>';
    }

    var studioSign = movie.studioPrestigeDelta>=0 ? '+' : '';
    var sbSignC = b.studio.commercial>=0 ? '+' : '';
    var sbSignR = b.studio.review>=0 ? '+' : '';

    var rankAfter = computePlayerRank();
    var rankChanged = rankBefore.rank !== rankAfter.rank;
    var prestigeRounded = Math.round(player.prestige);
    var prestigeBeforeRounded = Math.round(prestigeBefore);

    summaryBody.innerHTML =
      '<div class="reveal-hero">'+
        '<div class="reveal-verdict-badge badge-'+movie.verdictCls+'">'+movie.verdict+'</div>'+
        '<h3 class="reveal-title">'+escapeHtml(movie.title)+'</h3>'+
        '<p class="reveal-cause">'+generateCausalExplanation(movie)+'</p>'+
        '<div class="reveal-movement-row">'+
          '<div class="reveal-movement"><span class="rm-label">Net Result</span><span class="rm-value" id="revealProfitCounter">'+formatMoney(0)+'</span></div>'+
          '<div class="reveal-movement"><span class="rm-label">Studio Prestige</span><span class="rm-value">'+prestigeBeforeRounded+' → '+prestigeRounded+' <span class="rm-delta '+(movie.studioPrestigeDelta>=0?'pos':'neg')+'">('+studioSign+movie.studioPrestigeDelta+')</span></span></div>'+
          '<div class="reveal-movement"><span class="rm-label">Industry Rank</span><span class="rm-value">#'+rankBefore.rank+(rankChanged?' → #'+rankAfter.rank:'')+' of '+rankAfter.total+'</span></div>'+
        '</div>'+
      '</div>'+

      '<div class="receipt-sub">'+movie.genre+' • Released Year '+movie.releaseYear+', Week '+weekInYearOf(movie.releaseWeek)+'</div>'+
      scriptLine+
      marketLine+
      propertiesLine+

      '<div class="review-line"><span>🍅 Tomatometer</span><span>'+movie.criticsScore+'%'+(movie.certifiedFresh?' <span class="review-tag fresh">Certified Fresh</span>':'')+'</span></div>'+
      '<div class="review-line"><span>🍿 Popcornmeter</span><span>'+movie.audienceScore+'%'+(movie.toxicWOM?' <span class="review-tag toxic">Toxic Word of Mouth</span>':'')+'</span></div>'+
      '<div style="text-align:center;margin:10px 0;"><span class="divergence-tag '+movie.reviewSummary.divergence.cls+'">'+movie.reviewSummary.divergence.icon+' '+escapeHtml(movie.reviewSummary.divergence.label)+'</span></div>'+
      '<p class="review-quote">🍅 "'+escapeHtml(movie.reviewSummary.criticsBlurb.quote)+'" — '+escapeHtml(movie.reviewSummary.criticsBlurb.source)+'</p>'+
      '<p class="review-quote">🍿 "'+escapeHtml(movie.reviewSummary.audienceBlurb.quote)+'" — '+escapeHtml(movie.reviewSummary.audienceBlurb.source)+'</p>'+

      '<h4>Production Costs</h4>'+
      '<div class="receipt-line"><span>Writer Fee — '+escapeHtml(movie.writer.name)+'</span><span>'+formatMoney(movie.writerCost)+'</span></div>'+
      '<div class="receipt-line"><span>Director Fee — '+escapeHtml(movie.director.name)+'</span><span>'+formatMoney(movie.directorCost)+'</span></div>'+
      '<div class="receipt-line"><span>'+(movie.composerIsLibrary?'Music Licensing':'Composer Fee')+' — '+escapeHtml(movie.composerName)+'</span><span>'+formatMoney(movie.composerCost)+'</span></div>'+
      (movie.producerDiscountAmt>0 ? '<div class="receipt-line"><span>Producer Efficiency — '+escapeHtml(movie.producerName)+'</span><span style="color:var(--emerald);">-'+formatMoney(movie.producerDiscountAmt)+'</span></div>' : '')+
      '<div class="receipt-line"><span>'+(movie.producerIsSelf?'Producing (Self)':'Producer Fee')+' — '+escapeHtml(movie.producerName)+'</span><span>'+formatMoney(movie.producerCost)+'</span></div>'+
      '<div class="receipt-line"><span>Lead Fee — '+escapeHtml(movie.star1.name)+'</span><span>'+formatMoney(movie.star1Cost)+'</span></div>'+
      '<div class="receipt-line"><span>Lead Fee — '+escapeHtml(movie.star2.name)+'</span><span>'+formatMoney(movie.star2Cost)+'</span></div>'+
      '<div class="receipt-line"><span>'+(movie.sfxHouseIsPractical?'Effects (In-House)':'SFX House')+' — '+escapeHtml(movie.sfxHouseName)+'</span><span>'+formatMoney(movie.sfxBudget)+'</span></div>'+
      '<div class="receipt-line"><span>Marketing Budget</span><span>'+formatMoney(movie.marketingBudget)+'</span></div>'+
      festivalFeeLine+
      eventLine+
      testScreeningLine+
      '<div class="receipt-line total"><span>TOTAL SPENT</span><span>'+formatMoney(movie.totalSpent)+'</span></div>'+

      intlLine+
      '<h4>Revenue</h4>'+
      '<div class="receipt-line"><span>Theatrical Revenue (50% of Gross)</span><span>'+formatMoney(movie.theatricalRevenue)+'</span></div>'+
      streamLine+
      '<div class="receipt-line total '+(movie.profit>=0?'profit':'loss')+'"><span>NET '+(movie.profit>=0?'PROFIT':'LOSS')+'</span><span>'+formatMoney(movie.profit)+'</span></div>'+
      investorLine+
      (movie.breakoutRevealed ? '<div class="breakout-banner">🌟 BREAKOUT HIT — nobody saw this coming.<br><span class="breakout-sub">'+escapeHtml(movie.breakoutTalent.person.name)+' ('+movie.breakoutTalent.role+') is the name everyone\'s talking about now. Prestige +'+movie.breakoutBonusApplied+', on top of the usual review-driven change below.</span></div>' : '')+

      '<h4>Talent Prestige &amp; Fee Impact</h4>'+
      prestigeRowHtml(movie.writer, 'Writer', d.writer, b.writer)+
      prestigeRowHtml(movie.director, 'Director', d.director, b.director)+
      (movie.producerRef ? prestigeRowHtml(movie.producerRef, 'Producer', d.producer, b.producer) : '')+
      (movie.composerRef ? prestigeRowHtml(movie.composerRef, 'Composer', d.composer, b.composer) : '')+
      (movie.sfxHouseRef ? prestigeRowHtml(movie.sfxHouseRef, 'SFX House', d.sfxHouse, b.sfxHouse) : '')+
      prestigeRowHtml(movie.star1, 'Lead', d.star1, b.star1)+
      prestigeRowHtml(movie.star2, 'Lead', d.star2, b.star2)+
      '<p class="studio-prestige-note">Studio Prestige moved '+studioSign+movie.studioPrestigeDelta+' (Commercial '+sbSignC+b.studio.commercial+' • Reviews '+sbSignR+b.studio.review+') → now <strong>'+Math.round(player.prestige)+'</strong>. Cash on hand: <strong>'+formatMoney(player.cash)+'</strong>.</p>';
    summaryModal.classList.remove('hidden');
    animateMoneyCounter($('revealProfitCounter'), movie.profit);
  }

export function showFinaleModal(finale){
    finaleTitle.textContent = '🎬 Year '+finale.year+' — Season Finale';
    var rankArrow = finale.rankNow<finale.rankBefore ? '📈' : (finale.rankNow>finale.rankBefore ? '📉' : '➖');
    var prestigeDelta = Math.round(finale.prestigeNow-finale.prestigeBefore);

    var hitHtml = finale.biggestHit ?
      '<div class="receipt-line"><span>🌟 Biggest Hit</span><span>'+escapeHtml(finale.biggestHit.title)+' ('+formatMoney(finale.biggestHit.profit)+')</span></div>' :
      '<div class="receipt-line"><span>🌟 Biggest Hit</span><span>No releases this year</span></div>';
    var flopHtml = (finale.biggestFlop && finale.biggestFlop!==finale.biggestHit) ?
      '<div class="receipt-line"><span>💥 Biggest Flop</span><span>'+escapeHtml(finale.biggestFlop.title)+' ('+formatMoney(finale.biggestFlop.profit)+')</span></div>' : '';

    var rivalHtml = finale.rivalHighlight ?
      '<div class="receipt-line"><span>🏢 Rival Highlight</span><span>'+escapeHtml(finale.rivalHighlight.studio.name)+' — "'+escapeHtml(finale.rivalHighlight.movie.title)+'" ('+formatMoney(finale.rivalHighlight.movie.profit)+')</span></div>' :
      '<div class="receipt-line"><span>🏢 Rival Highlight</span><span>Quiet year for the competition</span></div>';

    var unlockedHtml = finale.unlockedThisYear.length>0 ?
      '<h4>🔓 Unlocked This Year</h4><p class="review-quote">'+finale.unlockedThisYear.join(' • ')+'</p>' : '';

    var goalLabel = game.seasonGoal ? getSeasonGoalLabel(game.seasonGoal) : '';

    finaleBody.innerHTML =
      '<div class="reveal-hero">'+
        '<div class="reveal-title">'+player.name+'</div>'+
        '<p class="reveal-cause">'+finale.releaseCount+' picture'+(finale.releaseCount===1?'':'s')+' released, '+formatMoney(finale.totalProfit)+' net for the year.</p>'+
        '<div class="reveal-movement-row">'+
          '<div class="reveal-movement"><span class="rm-label">Studio Prestige</span><span class="rm-value">'+Math.round(finale.prestigeBefore)+' → '+Math.round(finale.prestigeNow)+' <span class="rm-delta '+(prestigeDelta>=0?'pos':'neg')+'">('+(prestigeDelta>=0?'+':'')+prestigeDelta+')</span></span></div>'+
          '<div class="reveal-movement"><span class="rm-label">Industry Rank</span><span class="rm-value">'+rankArrow+' #'+finale.rankBefore+' → #'+finale.rankNow+' of '+finale.rankTotal+'</span></div>'+
        '</div>'+
      '</div>'+
      hitHtml+flopHtml+rivalHtml+
      unlockedHtml+
      (goalLabel ? '<h4>🎯 Next Year\u2019s Objective</h4><p class="review-quote">'+escapeHtml(goalLabel)+'</p>' : '');

    finaleModal.classList.remove('hidden');
  }

export function showAwardsModal(a){
    awardsYearLabel.textContent = 'Year '+a.year+' Wrap Party';
    function row(icon, label, winnerName, sub, studioName){
      var isPlayer = studioName===player.name;
      return '<div class="award-row'+(isPlayer?' award-row-win':'')+'">'+
        (isPlayer?'<div class="award-win-flag">🎉 YOUR STUDIO</div>':'')+
        '<div class="award-label">'+icon+' '+label+'</div>'+
        '<div class="award-winner">'+escapeHtml(winnerName)+'</div>'+
        '<div class="award-sub">'+sub+'</div>'+
      '</div>';
    }
    awardsBody.innerHTML =
      row('🏆', 'Best Picture', a.bestPictureMovie.title, escapeHtml(a.bestPictureMovie.studioName)+' • Quality '+a.bestPictureMovie.quality, a.bestPictureMovie.studioName)+
      row('🎬', 'Best Director', a.bestDirector.label, 'for "'+escapeHtml(a.bestDirector.movie.title)+'" ('+escapeHtml(a.bestDirector.movie.studioName)+')', a.bestDirector.movie.studioName)+
      row('⭐', 'Best Actor', a.bestActor.label, 'for "'+escapeHtml(a.bestActor.movie.title)+'" ('+escapeHtml(a.bestActor.movie.studioName)+')', a.bestActor.movie.studioName);
    awardsModal.classList.remove('hidden');
  }

