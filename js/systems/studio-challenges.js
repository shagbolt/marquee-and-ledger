import { aiStudios, game, player } from '../state/game-state.js';
import { formatMoney, randInt } from '../data/constants.js';
import { addNews } from '../ui/render.js';

var CHALLENGE_DURATION_WEEKS = 8;

function generateChallenge(){
  var types = ['releaseCount', 'certifiedFresh', 'beatRivalCash', 'noBomb'];
  var type = types[randInt(0, types.length-1)];
  var startWeek = game.processedWeek;
  var reward = randInt(150000, 400000);
  if(type==='releaseCount'){
    return { type:'releaseCount', startWeek:startWeek, target:1, startCount:player.moviesAll.length, reward:reward };
  }
  if(type==='certifiedFresh'){
    return { type:'certifiedFresh', startWeek:startWeek, startCount:player.moviesAll.filter(function(m){ return m.certifiedFresh; }).length, reward:Math.round(reward*1.3) };
  }
  if(type==='beatRivalCash'){
    var rival = aiStudios[randInt(0, aiStudios.length-1)];
    return { type:'beatRivalCash', startWeek:startWeek, rivalId:rival.id, startCash:player.cash, rivalStartCash:rival.cash, reward:reward };
  }
  // noBomb: survive the window without a Bomb verdict
  return { type:'noBomb', startWeek:startWeek, startCount:player.moviesAll.length, bombsAtStart:player.moviesAll.filter(function(m){ return m.verdictCls==='bomb'; }).length, reward:Math.round(reward*0.8) };
}

export function getChallengeLabel(c){
  if(!c) return '';
  if(c.type==='releaseCount') return 'Release a picture within '+CHALLENGE_DURATION_WEEKS+' weeks';
  if(c.type==='certifiedFresh') return 'Land a Certified Fresh picture within '+CHALLENGE_DURATION_WEEKS+' weeks';
  if(c.type==='beatRivalCash'){
    var rival = aiStudios.filter(function(s){ return s.id===c.rivalId; })[0];
    return 'Out-earn '+(rival?rival.name:'a rival')+' by week\u2019s end';
  }
  if(c.type==='noBomb') return 'Go '+CHALLENGE_DURATION_WEEKS+' weeks without a Bomb';
  return '';
}

export function getChallengeProgress(c){
  if(!c) return null;
  var weeksLeft = Math.max(0, (c.startWeek+CHALLENGE_DURATION_WEEKS)-game.processedWeek);
  if(c.type==='releaseCount'){
    var done = player.moviesAll.length>c.startCount;
    return { complete:done, weeksLeft:weeksLeft };
  }
  if(c.type==='certifiedFresh'){
    var freshNow = player.moviesAll.filter(function(m){ return m.certifiedFresh; }).length;
    return { complete: freshNow>c.startCount, weeksLeft:weeksLeft };
  }
  if(c.type==='beatRivalCash'){
    var rival = aiStudios.filter(function(s){ return s.id===c.rivalId; })[0];
    var rivalCash = rival ? rival.cash : c.rivalStartCash;
    return { complete: player.cash>rivalCash, weeksLeft:weeksLeft };
  }
  if(c.type==='noBomb'){
    var bombsNow = player.moviesAll.filter(function(m){ return m.verdictCls==='bomb'; }).length;
    return { complete: bombsNow===c.bombsAtStart, failed: bombsNow>c.bombsAtStart, weeksLeft:weeksLeft };
  }
  return null;
}

// Same shared weekly tick every other year/quarter-turnover system already uses.
export function checkChallengeExpiry(){
  if(!game.activeChallenge){
    game.activeChallenge = generateChallenge();
    return;
  }
  var c = game.activeChallenge;
  var progress = getChallengeProgress(c);
  if(!progress) return;
  // noBomb fails immediately on a Bomb rather than waiting out the window — no point
  // pretending the challenge is still alive once its one condition is already broken.
  if(progress.failed){
    addNews('🎯 Challenge failed: '+getChallengeLabel(c));
    game.activeChallenge = generateChallenge();
    return;
  }
  if(progress.complete){
    player.cash += c.reward;
    addNews('🎯 Challenge complete: '+getChallengeLabel(c)+' — '+formatMoney(c.reward)+' bonus!');
    game.activeChallenge = generateChallenge();
    return;
  }
  if(progress.weeksLeft<=0){
    addNews('🎯 Challenge expired: '+getChallengeLabel(c));
    game.activeChallenge = generateChallenge();
  }
}
