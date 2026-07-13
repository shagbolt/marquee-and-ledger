import { clamp } from '../data/constants.js';
import { showAwardsModal } from '../flow/release-flow.js';
import { aiStudios, awardsQueue, game, player } from '../state/game-state.js';
import { markPlayerHeat, maybeStudioMerger } from './ai-studios.js';
import { evolveGenreDemand, generateStudioRumor } from './market.js';
import { logPrestigeChange } from './talent-quality.js';

export function addStudioPrestige(movie, amt, label){
    if(movie.ownerType==='player'){
      var before = player.prestige;
      player.prestige = clamp(player.prestige+amt, 0, 100);
      logPrestigeChange(label, player.prestige-before);
    } else {
      var s = aiStudios[movie.studioId];
      if(s) s.prestige = clamp(s.prestige+amt, 0, 100);
    }
  }

export function computeAwards(year){
    var allMovies = player.moviesAll.filter(function(m){ return m.releaseYear===year; });
    aiStudios.forEach(function(s){
      allMovies = allMovies.concat(s.moviesAll.filter(function(m){ return m.releaseYear===year; }));
    });
    if(allMovies.length===0) return null;

    var bestPictureMovie = allMovies.reduce(function(a,b){ return b.quality>a.quality ? b : a; });

    var directorCandidates = allMovies.map(function(m){
      return {
        label: m.ownerType==='player' ? m.director.name : m.director,
        quality: m.quality, movie: m,
        talentRef: m.ownerType==='player' ? m.director : null
      };
    });
    var bestDirector = directorCandidates.reduce(function(a,b){ return b.quality>a.quality ? b : a; });

    var actorCandidates = [];
    allMovies.forEach(function(m){
      if(m.ownerType==='player'){
        actorCandidates.push({label:m.star1.name, quality:m.quality, movie:m, talentRef:m.star1});
        actorCandidates.push({label:m.star2.name, quality:m.quality, movie:m, talentRef:m.star2});
      } else {
        actorCandidates.push({label:m.lead, quality:m.quality, movie:m, talentRef:null});
      }
    });
    var bestActor = actorCandidates.reduce(function(a,b){ return b.quality>a.quality ? b : a; });

    addStudioPrestige(bestPictureMovie, 15, '🏆 Best Picture — '+bestPictureMovie.title);
    addStudioPrestige(bestDirector.movie, 8, '🎬 Best Director — '+bestDirector.movie.title);
    addStudioPrestige(bestActor.movie, 8, '⭐ Best Actor — '+bestActor.movie.title);
    if(bestDirector.talentRef) bestDirector.talentRef.prestige = clamp(bestDirector.talentRef.prestige+10, 0, 100);
    if(bestActor.talentRef) bestActor.talentRef.prestige = clamp(bestActor.talentRef.prestige+10, 0, 100);

    player.awardsWon = player.awardsWon || [];
    if(bestPictureMovie.ownerType==='player'){
      player.awardsWon.push({ year:year, category:'Best Picture', movieTitle:bestPictureMovie.title, recipient:null });
      markPlayerHeat(bestPictureMovie.genre);
    }
    if(bestDirector.movie.ownerType==='player'){
      player.awardsWon.push({ year:year, category:'Best Director', movieTitle:bestDirector.movie.title, recipient:bestDirector.label });
    }
    if(bestActor.movie.ownerType==='player'){
      player.awardsWon.push({ year:year, category:'Best Actor', movieTitle:bestActor.movie.title, recipient:bestActor.label });
    }

    return { year:year, bestPictureMovie:bestPictureMovie, bestDirector:bestDirector, bestActor:bestActor };
  }

export function checkAwards(){
    while(game.processedWeek >= (game.lastAwardedYear+1)*52){
      game.lastAwardedYear++;
      var result = computeAwards(game.lastAwardedYear);
      if(result) awardsQueue.push(result);
      evolveGenreDemand();
      aiStudios.forEach(generateStudioRumor);
      maybeStudioMerger();
    }
  }

export function maybeShowNextAward(){
    if(awardsQueue.length>0){
      var a = awardsQueue.shift();
      showAwardsModal(a);
    }
  }

