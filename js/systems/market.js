import { GENRES, clamp, escapeHtml, formatMoney, rand, randInt, uid } from '../data/constants.js';
import { aiStudios, currentTier, finance, game, player } from '../state/game-state.js';
import { applyPrestigeDelta } from './talent-quality.js';
import { addNews } from '../ui/render.js';

export function freshGenreDemand(){
    var d = {};
    GENRES.forEach(function(g){ d[g] = clamp(Math.round(rand(30,90)), 10, 95); });
    return d;
  }

export var genreDemand = freshGenreDemand();

export var prevGenreDemand = {};

export var recentReleases = [];

export function evolveGenreDemand(){
    prevGenreDemand = {};
    GENRES.forEach(function(g){ prevGenreDemand[g] = genreDemand[g]; });
    GENRES.forEach(function(g){
      var current = genreDemand[g];
      var meanReversion = (60-current)*0.08;
      var shock = rand(-14,14);
      genreDemand[g] = clamp(Math.round(current+meanReversion+shock), 5, 98);
    });
  }

export function recordRelease(genre, week){
    recentReleases.push({ genre:genre, week:week });
    if(recentReleases.length>400){
      recentReleases = recentReleases.filter(function(r){ return week-r.week<=52; });
    }
  }

export function getSaturation(genre){
    // A 26-week (half-year) window: a single movie's own theatrical run can span
    // 10-20+ weeks in this game's time scale, so anything narrower would have "recent"
    // releases aging out of the count while they're still literally in theaters.
    var windowStart = game.processedWeek-26;
    var count = recentReleases.filter(function(r){ return r.genre===genre && r.week>=windowStart; }).length;
    return clamp(count*12, 0, 100);
  }

export function pickWeightedGenre(boostGenres){
    boostGenres = boostGenres || [];
    var weights = GENRES.map(function(g){
      var w = Math.max(5, genreDemand[g]);
      boostGenres.forEach(function(b){ if(b && b.genre===g){ w *= b.factor; } });
      return w;
    });
    var totalWeight = weights.reduce(function(sum,w){ return sum+w; }, 0);
    var roll = rand(0, totalWeight);
    var acc = 0;
    for(var i=0;i<GENRES.length;i++){
      acc += weights[i];
      if(roll<=acc) return GENRES[i];
    }
    return GENRES[GENRES.length-1];
  }

export function genreRecommendation(demand, saturation){
    if(demand>=70 && saturation<40) return { label:'🔥 Hot & Undersaturated', cls:'acclaimed' };
    if(demand>=70) return { label:'⚠️ Hot but Crowded', cls:'crowd-pleaser' };
    if(demand<40 && saturation<30) return { label:'💎 Underserved Niche', cls:'critical-darling' };
    if(demand<40) return { label:'❄️ Cold', cls:'panned' };
    return { label:'➖ Steady', cls:'mixed' };
  }

export function studioRecentFocus(studio){
    var recent = studio.moviesAll.slice(-3);
    if(recent.length===0) return 'No releases yet';
    var counts = {};
    recent.forEach(function(m){ counts[m.genre] = (counts[m.genre]||0)+1; });
    return Object.keys(counts).reduce(function(a,b){ return counts[b]>counts[a] ? b : a; });
  }

export function generateStudioRumor(studio){
    var focus = studioRecentFocus(studio);
    var weighted = GENRES.map(function(g){ return { genre:g, w: genreDemand[g]+(g===focus?20:0) }; });
    weighted.sort(function(a,b){ return b.w-a.w; });
    var pick = weighted[randInt(0,2)];
    studio.rumor = { genre: pick.genre, text: escapeHtml(studio.name)+' is said to be developing a new '+pick.genre+' picture.' };
  }

export function computeIndustryReport(){
    var currentYear = yearOf(game.processedWeek+1);
    var pool = player.moviesAll.filter(function(m){ return m.releaseYear>=currentYear-1; });
    aiStudios.forEach(function(s){ pool = pool.concat(s.moviesAll.filter(function(m){ return m.releaseYear>=currentYear-1; })); });
    var byGenreGross = {};
    GENRES.forEach(function(g){ byGenreGross[g] = 0; });
    var totalBudget = 0;
    pool.forEach(function(m){
      byGenreGross[m.genre] = (byGenreGross[m.genre]||0)+(m.totalBoxOffice||0);
      totalBudget += (m.totalBudget!=null ? m.totalBudget : (m.budget||0));
    });
    var topGenre = GENRES.reduce(function(a,b){ return byGenreGross[b]>byGenreGross[a] ? b : a; }, GENRES[0]);
    return { topGenre:topGenre, avgBudget: pool.length>0 ? totalBudget/pool.length : 0, sampleSize: pool.length };
  }

export function buildYearInReviewText(){
    var deltas = GENRES.map(function(g){ return { genre:g, delta: genreDemand[g]-(prevGenreDemand[g]!=null?prevGenreDemand[g]:genreDemand[g]) }; });
    deltas.sort(function(a,b){ return b.delta-a.delta; });
    var riser = deltas[0], faller = deltas[deltas.length-1];
    var text = '';
    if(riser.delta>3){ text += riser.genre+' demand is surging (+'+riser.delta+' this year). '; }
    if(faller.delta<-3){ text += faller.genre+' is cooling off ('+faller.delta+'). '; }
    if(!text){ text = 'The industry is holding steady this year — no major swings.'; }
    return text;
  }

export function maxLoanAmount(){
    if(!currentTier) return 0;
    return Math.round(currentTier.cash*(0.3+player.prestige/200));
  }

export function loanInterestRate(){
    return clamp(0.16-player.prestige*0.001, 0.05, 0.16);
  }

export function takeLoan(amount){
    var rate = loanInterestRate();
    var termWeeks = 52;
    var totalOwed = amount*(1+rate);
    finance.loans.push({
      id: uid(), principal: amount, interestRate: rate, termWeeks: termWeeks,
      weeklyPayment: Math.round(totalOwed/termWeeks), remainingWeeks: termWeeks, remainingBalance: totalOwed
    });
    player.cash += amount;
  }

export function chargeLoanPaymentsForWeek(){
    finance.loans.forEach(function(loan){
      if(loan.remainingWeeks<=0) return;
      var payment = Math.min(loan.weeklyPayment, loan.remainingBalance);
      player.cash -= payment;
      loan.remainingBalance -= payment;
      loan.remainingWeeks -= 1;
      if(loan.remainingWeeks<=0 || loan.remainingBalance<=0.01){
        finance.loanHistory.push({ id:loan.id, principal:loan.principal, paidOffWeek: game.processedWeek });
      }
    });
    finance.loans = finance.loans.filter(function(l){ return l.remainingWeeks>0 && l.remainingBalance>0.01; });
  }

export function investorTerms(kind){
    var confidenceAdj = (finance.investorConfidence-50)*0.05;
    if(kind==='equity'){
      return {
        maxAmount: Math.round(currentTier.cash*(0.8+player.prestige/150)),
        sharePercent: clamp(35-player.prestige*0.15-confidenceAdj, 15, 35)
      };
    }
    return {
      maxAmount: Math.round(currentTier.cash*(0.4+player.prestige/250)),
      sharePercent: clamp(20-player.prestige*0.1-confidenceAdj, 5, 20)
    };
  }

export function takeProfitShareDeal(kind){
    var terms = investorTerms(kind);
    finance.profitShareDeals.push({ id:uid(), kind:kind, investedAmount:terms.maxAmount, sharePercent:terms.sharePercent, active:true });
    player.cash += terms.maxAmount;
  }

export function applyProfitShareDeductions(movie){
    if(movie.profit<=0 || finance.profitShareDeals.length===0) return 0;
    var totalCut = 0;
    finance.profitShareDeals.forEach(function(deal){
      if(deal.active) totalCut += movie.profit*(deal.sharePercent/100);
    });
    player.cash -= totalCut;
    return totalCut;
  }

export function ipoEligible(){
    return !finance.isPublic && player.prestige>=70 && player.moviesAll.length>=5;
  }

export function goPublic(){
    var raise = Math.round(currentTier.cash*rand(2,4)*(0.5+player.prestige/150));
    finance.isPublic = true;
    finance.ipoRaised = raise;
    finance.ipoWeek = game.processedWeek+1;
    finance.quarterStartWeek = game.processedWeek;
    finance.quarterProfitAccum = 0;
    player.cash += raise;
    addNews('📈 '+escapeHtml(player.name)+' goes public! IPO raises '+formatMoney(raise)+'.');
  }

export function checkQuarterlyEarnings(){
    if(!finance.isPublic) return;
    while(game.processedWeek-finance.quarterStartWeek>=13){
      finance.quarterStartWeek += 13;
      var target = currentTier.cash*0.08;
      var actual = finance.quarterProfitAccum;
      finance.quarterProfitAccum = 0;
      if(actual>=target){
        applyPrestigeDelta(player, 3);
        finance.investorConfidence = clamp(finance.investorConfidence+5, 0, 100);
        addNews('📊 Quarterly earnings beat analyst expectations. Stock confidence rises.');
      } else if(actual<target*0.3){
        finance.shareholderRevolts++;
        applyPrestigeDelta(player, -8);
        finance.investorConfidence = clamp(finance.investorConfidence-15, 0, 100);
        var penalty = Math.max(0, Math.round(player.cash*0.05));
        player.cash -= penalty;
        addNews('📉 Shareholder revolt! Earnings badly missed targets — the board is furious and the stock craters ('+formatMoney(penalty)+' wiped out).');
      } else {
        addNews('📊 Quarterly earnings roughly in line with expectations.');
      }
    }
  }

export function yearOf(w){ return Math.floor((w-1)/52)+1; }

export function weekInYearOf(w){ return ((w-1)%52)+1; }


// Setters for cross-module resets/restores — genreDemand/prevGenreDemand/recentReleases
// are owned by this module, so anything outside it (studio founding, save/load) has to
// go through these rather than reassigning the imported bindings directly.
export function resetGenreDemandForNewStudio(){
  genreDemand = freshGenreDemand();
  prevGenreDemand = {};
  recentReleases = [];
}
export function setGenreDemandFromSave(gd, pgd, rr){
  genreDemand = gd;
  prevGenreDemand = pgd;
  recentReleases = rr;
}
