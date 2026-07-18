import { aiStudios, game, player } from '../state/game-state.js';
import { yearOf } from './market.js';
import { computePlayerRank } from '../ui/render.js';

// Snapshots what "before" looks like for the year that's about to start, so the finale
// that fires at ITS end can show real movement rather than just current values.
function snapshotForNextFinale(){
  game.finaleRankSnapshot = computePlayerRank().rank;
  game.finalePrestigeSnapshot = player.prestige;
}

function pickRivalHighlight(year){
  var best = null;
  aiStudios.forEach(function(s){
    s.moviesAll.filter(function(m){ return m.releaseYear===year; }).forEach(function(m){
      if(!best || m.profit>best.movie.profit){ best = { studio:s, movie:m }; }
    });
  });
  return best;
}

function buildFinaleData(year){
  var yearMovies = player.moviesAll.filter(function(m){ return m.releaseYear===year; });
  var totalProfit = yearMovies.reduce(function(s,m){ return s+m.profit; }, 0);
  var biggestHit = yearMovies.length>0 ? yearMovies.reduce(function(a,b){ return b.profit>a.profit?b:a; }) : null;
  var biggestFlop = yearMovies.length>0 ? yearMovies.reduce(function(a,b){ return b.profit<a.profit?b:a; }) : null;
  var rankInfo = computePlayerRank();

  var unlockedThisYear = [];
  var prestigeBefore = game.finalePrestigeSnapshot!=null ? game.finalePrestigeSnapshot : player.prestige;
  if(prestigeBefore<40 && player.prestige>=40){ unlockedThisYear.push('🌍 International Distribution'); }
  if(prestigeBefore<60 && player.prestige>=60){ unlockedThisYear.push('⚖️ Legal Department'); }
  if(prestigeBefore<70 && player.prestige>=70 && player.moviesAll.length>=5){ unlockedThisYear.push('📈 Going Public'); }

  return {
    year:year, releaseCount:yearMovies.length, totalProfit:totalProfit,
    biggestHit:biggestHit, biggestFlop:biggestFlop,
    rankBefore: game.finaleRankSnapshot!=null ? game.finaleRankSnapshot : rankInfo.rank,
    rankNow: rankInfo.rank, rankTotal: rankInfo.total,
    prestigeBefore: prestigeBefore, prestigeNow: player.prestige,
    rivalHighlight: pickRivalHighlight(year),
    unlockedThisYear: unlockedThisYear
  };
}

// Same shared weekly tick every other yearly system already runs on. Only the single
// most recent completed year is ever queued — if several years pass at once (repeated
// Skip to Year End), only the latest gets a finale rather than stacking several.
export function checkSeasonFinale(){
  if(game.lastFinaleYear==null){
    game.lastFinaleYear = yearOf(game.processedWeek);
    snapshotForNextFinale();
    return;
  }
  while(game.processedWeek >= (game.lastFinaleYear+1)*52){
    game.lastFinaleYear++;
    var completedYear = game.lastFinaleYear;
    game.pendingFinale = buildFinaleData(completedYear);
    snapshotForNextFinale();
  }
}
