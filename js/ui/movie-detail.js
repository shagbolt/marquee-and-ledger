import { GENRE_GRADIENTS, escapeHtml, formatMoney } from '../data/constants.js';
import { weekInYearOf } from '../systems/market.js';
import { movieDetailBody, movieDetailModal } from './dom-refs.js';
import { genreBadgeSVG } from './genre-badges.js';

function prestigeOf(movie, key, liveEntity){
  if(movie.prestigeAtRelease && movie.prestigeAtRelease[key]!=null) return movie.prestigeAtRelease[key];
  return liveEntity ? Math.round(liveEntity.prestige) : null; // older saves predate the snapshot — best available fallback
}

export function showMovieDetail(movie){
  var gradient = GENRE_GRADIENTS[movie.genre] || GENRE_GRADIENTS.Action;

  var castRows = [
    { role:'Writer', name:movie.writer.name, prestige:prestigeOf(movie,'writer',movie.writer) },
    { role:'Director', name:movie.director.name, prestige:prestigeOf(movie,'director',movie.director) },
    { role:'Producer', name:movie.producerName, prestige:movie.producerIsSelf?null:prestigeOf(movie,'producer',movie.producerRef) },
    { role:'Composer', name:movie.composerName, prestige:movie.composerIsLibrary?null:prestigeOf(movie,'composer',movie.composerRef) },
    { role:'SFX House', name:movie.sfxHouseName, prestige:movie.sfxHouseIsPractical?null:prestigeOf(movie,'sfxHouse',movie.sfxHouseRef) },
    { role:'Lead', name:movie.star1.name, prestige:prestigeOf(movie,'star1',movie.star1) },
    { role:'Lead', name:movie.star2.name, prestige:prestigeOf(movie,'star2',movie.star2) }
  ].map(function(c){
    return '<div class="receipt-line"><span>'+c.role+' — '+escapeHtml(c.name)+'</span><span>'+(c.prestige!=null?'Prestige '+c.prestige+' at release':'—')+'</span></div>';
  }).join('');

  var eventLogHtml;
  if(movie.eventLog && movie.eventLog.length>0){
    eventLogHtml = movie.eventLog.map(function(e){
      return '<div class="event-log-entry">'+
        '<div class="event-log-phase">'+escapeHtml(e.phase)+'</div>'+
        '<div class="event-log-title">'+escapeHtml(e.title)+' — '+escapeHtml(e.choice)+'</div>'+
        '<div class="event-log-outcome">'+e.outcome+'</div>'+
      '</div>';
    }).join('');
  } else {
    eventLogHtml = '<p class="hint">No event details recorded for this picture (released before this feature was added, or nothing eventful happened during production).</p>';
  }

  var intlHtml = '';
  if(movie.internationalResults && movie.internationalResults.length>0){
    intlHtml = '<h4>🌍 International</h4>'+movie.internationalResults.map(function(r){
      return '<div class="receipt-line"><span>'+r.icon+' '+r.market+(r.approved?'':' (rejected)')+'</span><span>'+(r.approved?'+'+formatMoney(r.revenue):'—')+'</span></div>';
    }).join('');
  }

  movieDetailBody.innerHTML =
    '<div class="movie-detail-hero">'+
      '<div class="movie-poster" style="background:'+gradient+';"><div class="poster-genre-badge">'+genreBadgeSVG(movie.genre, 30)+'</div><span>'+escapeHtml(movie.title.toUpperCase()).replace(/ /g,'<br>')+'</span></div>'+
      '<div>'+
        '<div class="reveal-title" style="text-align:left;margin:0;">'+escapeHtml(movie.title)+'</div>'+
        '<div class="receipt-sub" style="margin:2px 0 8px;">'+movie.genre+' • '+movie.rating+' • Released Year '+movie.releaseYear+', Week '+weekInYearOf(movie.releaseWeek)+'</div>'+
        '<span class="verdict-badge badge-'+movie.verdictCls+'" style="display:inline-block;margin:0;">'+movie.verdict+'</span>'+
      '</div>'+
    '</div>'+

    '<h4>Reviews</h4>'+
    '<div class="review-line"><span>🍅 Tomatometer</span><span>'+movie.criticsScore+'%'+(movie.certifiedFresh?' <span class="review-tag fresh">Certified Fresh</span>':'')+'</span></div>'+
    '<div class="review-line"><span>🍿 Popcornmeter</span><span>'+movie.audienceScore+'%'+(movie.toxicWOM?' <span class="review-tag toxic">Toxic Word of Mouth</span>':'')+'</span></div>'+
    '<p class="review-quote">🍅 "'+escapeHtml(movie.reviewSummary.criticsBlurb.quote)+'" — '+escapeHtml(movie.reviewSummary.criticsBlurb.source)+'</p>'+
    '<p class="review-quote">🍿 "'+escapeHtml(movie.reviewSummary.audienceBlurb.quote)+'" — '+escapeHtml(movie.reviewSummary.audienceBlurb.source)+'</p>'+

    '<h4>Cast &amp; Crew</h4>'+
    castRows+

    '<h4>Income</h4>'+
    '<div class="receipt-line"><span>Theatrical Revenue</span><span>'+formatMoney(movie.theatricalRevenue)+'</span></div>'+
    '<div class="receipt-line"><span>Streaming Revenue</span><span>'+formatMoney(movie.streamingRevenue||0)+'</span></div>'+
    intlHtml+
    '<div class="receipt-line total"><span>Total Studio Revenue</span><span>'+formatMoney(movie.studioRevenue)+'</span></div>'+
    '<div class="receipt-line"><span>Total Spent</span><span>'+formatMoney(movie.totalSpent)+'</span></div>'+
    '<div class="receipt-line total '+(movie.profit>=0?'profit':'loss')+'"><span>NET '+(movie.profit>=0?'PROFIT':'LOSS')+'</span><span>'+formatMoney(movie.profit)+'</span></div>'+

    '<h4>Production Timeline</h4>'+
    eventLogHtml;

  movieDetailModal.classList.remove('hidden');
}
