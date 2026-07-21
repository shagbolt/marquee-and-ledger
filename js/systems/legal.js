import { clamp, formatMoney, randInt } from '../data/constants.js';
import { player } from '../state/game-state.js';
import { scaledCost } from './release-strategy.js';
import { applyPrestigeDelta, logPrestigeChange } from './talent-quality.js';
import { addNews } from '../ui/render.js';

// ===== Legal Department =====
// In-house counsel is always on staff the moment the department unlocks — no hire,
// no standing weekly cost. The only real decision is per case: handle it in-house,
// settle it outright, or pay to bring in a specialist firm for that case alone.
// Structurally this mirrors a Festival Premiere or an SFX House bid — a one-time,
// case-specific spend — rather than a recurring staffing commitment like a Producer.

export var LEGAL_FIRMS = [
  { id:'cole', name:'Cole & Bright', category:'general', specialty:'General litigation — the safe, broad-competency choice for any case type.', feeMult:1.0, oddsBonus:0.20 },
  { id:'delacroix', name:'Delacroix Rights Group', category:'ip', specialty:'IP and copyright specialists — sharpest odds boost on rights disputes.', feeMult:1.15, oddsBonus:0.32 },
  { id:'marchetti', name:'Marchetti Crisis Partners', category:'scandal', specialty:'Scandal and defamation specialists — best at capping prestige loss on tabloid cases.', feeMult:1.3, oddsBonus:0.30 },
  { id:'whitfield', name:'Whitfield & Associates', category:'contract', specialty:'Labor and vendor contracts — strongest on talent and vendor breach cases.', feeMult:1.1, oddsBonus:0.28 }
];

export function getFirmById(id){
  return LEGAL_FIRMS.filter(function(f){ return f.id===id; })[0];
}

export function recommendedFirmFor(category){
  return LEGAL_FIRMS.filter(function(f){ return f.category===category; })[0] || LEGAL_FIRMS[0];
}

// Ensures older saves (and a freshly founded studio) always have valid Legal fields,
// without needing a save-format version bump.
export function ensureLegalState(){
  if(player.legalRisk==null) player.legalRisk = 0;
  if(!player.legalCaseLog) player.legalCaseLog = [];
}

export function legalRiskAdjust(delta){
  ensureLegalState();
  player.legalRisk = clamp(Math.round(player.legalRisk+delta), 0, 100);
}

export function legalRiskTierLabel(risk){
  if(risk>=70) return { label:'Severe', cls:'risk-severe' };
  if(risk>=40) return { label:'Moderate', cls:'risk-moderate' };
  if(risk>=15) return { label:'Low', cls:'risk-low' };
  return { label:'Minimal', cls:'risk-minimal' };
}

function buildCaseContext(caseDef){
  var movie = player.moviesAll.length>0 ? player.moviesAll[randInt(0, player.moviesAll.length-1)] : null;
  var talentPool = movie ? [movie.writer, movie.director, movie.star1, movie.star2].filter(Boolean) : [];
  var talent = talentPool.length>0 ? talentPool[randInt(0, talentPool.length-1)] : null;
  return {
    movieTitle: movie ? movie.title : 'one of your recent pictures',
    talentName: talent ? talent.name : 'A talent representative',
    firm: recommendedFirmFor(caseDef.category)
  };
}

// Each case's choices are generated at pick-time (not stored statically) so the
// dollar amounts scale to studio tier and the recommended firm's name/fee show up
// directly in the button the same way a Festival or SFX House choice would.
export var LEGAL_CASE_DEFS = [
  {
    id:'talent_dispute', category:'contract', title:'\u2696\ufe0f Talent Contract Dispute',
    flavor:function(ctx){ return ctx.talentName+'\u2019s agent claims their deal terms were breached during "'+ctx.movieTitle+'". They\u2019re threatening to go public.'; },
    settleBase:180000, inHouseChance:0.55, prestigeWin:3, prestigeLoseSettle:2, prestigeLoseFail:6, failCostMult:1.4
  },
  {
    id:'ip_claim', category:'ip', title:'\ud83d\udcc4 Copyright Claim',
    flavor:function(ctx){ return 'A rival studio claims "'+ctx.movieTitle+'" borrows too closely from one of their properties.'; },
    settleBase:220000, inHouseChance:0.5, prestigeWin:4, prestigeLoseSettle:2, prestigeLoseFail:7, failCostMult:1.5
  },
  {
    id:'defamation', category:'scandal', title:'\ud83d\udcf0 Tabloid Defamation Suit',
    flavor:function(ctx){ return 'A tabloid ran a story naming '+ctx.talentName+' in connection with "'+ctx.movieTitle+'" that your studio says is fabricated.'; },
    settleBase:260000, inHouseChance:0.45, prestigeWin:4, prestigeLoseSettle:3, prestigeLoseFail:8, failCostMult:1.6
  },
  {
    id:'vendor_breach', category:'contract', title:'\ud83d\udee0\ufe0f Vendor Breach Claim',
    flavor:function(ctx){ return 'An SFX vendor on "'+ctx.movieTitle+'" claims your studio breached the terms of their contract mid-shoot.'; },
    settleBase:150000, inHouseChance:0.6, prestigeWin:2, prestigeLoseSettle:1, prestigeLoseFail:5, failCostMult:1.3
  }
];

export function pickLegalCase(){
  var def = LEGAL_CASE_DEFS[randInt(0, LEGAL_CASE_DEFS.length-1)];
  var ctx = buildCaseContext(def);
  var settleCost = scaledCost(def.settleBase);
  var firmCost = scaledCost(Math.round(def.settleBase*1.9*ctx.firm.feeMult));
  ctx.def = def;
  ctx.settleCost = settleCost;
  ctx.firmCost = firmCost;
  return {
    id: def.id,
    title: def.title,
    flavor: function(){ return def.flavor(ctx); },
    ctx: ctx,
    choices: [
      {
        key:'inhouse', label:'Handle In-House \u2014 Free',
        description:'Standard odds. Counsel does what they can with the time and staff on hand.',
        tags:['Free', Math.round(def.inHouseChance*100)+'% odds'],
        apply:function(){ return resolveLegalCase(def, ctx, 'inhouse'); }
      },
      {
        key:'settle', label:'Settle Quickly \u2014 '+formatMoney(settleCost),
        description:'Guaranteed resolution, a small prestige hit. No trial, no risk.',
        tags:[formatMoney(settleCost), 'Guaranteed', '-'+def.prestigeLoseSettle+' Prestige'],
        apply:function(){ return resolveLegalCase(def, ctx, 'settle'); }
      },
      {
        key:'firm', label:'Engage Outside Firm \u2014 '+ctx.firm.name+', '+formatMoney(firmCost),
        description:'One-time engagement, this case only. '+ctx.firm.specialty,
        tags:[formatMoney(firmCost), Math.round((def.inHouseChance+ctx.firm.oddsBonus)*100)+'% odds'],
        recommended:true,
        apply:function(){ return resolveLegalCase(def, ctx, 'firm'); }
      }
    ]
  };
}

function resolveLegalCase(def, ctx, choiceKey){
  var outcome, logEntry;
  if(choiceKey==='settle'){
    player.cash -= ctx.settleCost;
    var settleDelta = applyPrestigeDelta(player, -def.prestigeLoseSettle);
    logPrestigeChange('Legal settlement \u2014 '+def.title, settleDelta);
    legalRiskAdjust(-6);
    outcome = 'Settled quietly for '+formatMoney(ctx.settleCost)+'. Prestige '+(settleDelta<0?settleDelta:'+'+settleDelta)+'.';
    logEntry = { title:def.title, result:'Settled', detail:'-'+formatMoney(ctx.settleCost), cls:'neg' };
  } else {
    var chance = def.inHouseChance + (choiceKey==='firm' ? ctx.firm.oddsBonus : 0);
    var won = Math.random()<chance;
    if(choiceKey==='firm'){ player.cash -= ctx.firmCost; }
    if(won){
      var winDelta = applyPrestigeDelta(player, def.prestigeWin);
      logPrestigeChange('Legal win \u2014 '+def.title, winDelta);
      legalRiskAdjust(choiceKey==='firm' ? -14 : -8);
      outcome = (choiceKey==='firm' ? ctx.firm.name+' wins the case outright. ' : 'In-house counsel wins the case outright. ')+
        'Prestige +'+winDelta+(choiceKey==='firm' ? ' after the '+formatMoney(ctx.firmCost)+' engagement.' : '.');
      logEntry = { title:def.title, result: choiceKey==='firm' ? 'Won via '+ctx.firm.name : 'Won in-house', detail:'+'+winDelta+' Prestige', cls:'pos' };
    } else {
      var failCost = Math.round(ctx.settleCost*def.failCostMult);
      player.cash -= failCost;
      var loseDelta = applyPrestigeDelta(player, -def.prestigeLoseFail);
      logPrestigeChange('Legal loss \u2014 '+def.title, loseDelta);
      legalRiskAdjust(choiceKey==='firm' ? 4 : 10);
      outcome = 'Lost the case. '+formatMoney(failCost)+' in damages'+(choiceKey==='firm' ? ' despite '+ctx.firm.name+'\u2019s work' : '')+'. Prestige '+loseDelta+'.';
      logEntry = { title:def.title, result: choiceKey==='firm' ? 'Lost \u2014 '+ctx.firm.name+' engaged' : 'Lost in-house', detail:'-'+formatMoney(failCost), cls:'neg' };
    }
  }
  ensureLegalState();
  player.legalCaseLog.unshift(logEntry);
  if(player.legalCaseLog.length>12) player.legalCaseLog.pop();
  addNews('\u2696\ufe0f '+def.title+' \u2014 '+logEntry.result+' ('+logEntry.detail+').');
  return outcome;
}

// Rolled once after every settlement receipt is closed, same cadence as the
// tutorial's unlock check. Risk climbs from a Bomb verdict or a rejected
// International market (wired at their call sites); it decays on its own here
// so a clean stretch gradually brings the odds back down without a case firing.
export function legalDeptUnlocked(){
  return player.prestige>=60;
}

export function maybeTriggerLegalCase(){
  ensureLegalState();
  if(!legalDeptUnlocked()) return null;
  if(player.legalRisk>0){ legalRiskAdjust(-1.5); }
  var chance = 0.06 + (player.legalRisk/100)*0.35;
  if(Math.random()<chance){
    return pickLegalCase();
  }
  return null;
}
