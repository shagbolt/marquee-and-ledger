import { composerFee, composers, directorFee, directors, escapeHtml, formatMoney, producerFee, producers, starFee, stars, writerFee, writers } from '../data/constants.js';
import { player } from '../state/game-state.js';
import { talentRoleFilter, talentRosterList, talentSortBy } from './dom-refs.js';

// The Talent tab is a browsable view over the same roster arrays casting already reads
// from — nothing new to keep in sync. Filmography and awards are read live off each
// person object (movie.writer/director/producerRef/composerRef/star1/star2, and the
// awardsWon array Awards pushes onto the winning talentRef) rather than tracked
// separately, so there's no second source of truth to drift out of date.
function buildTalentList(){
  var list = [];
  writers.forEach(function(p){ list.push({ person:p, role:'writer', roleLabel:'Writer', fee:writerFee(p) }); });
  directors.forEach(function(p){ list.push({ person:p, role:'director', roleLabel:'Director', fee:directorFee(p) }); });
  producers.forEach(function(p){ list.push({ person:p, role:'producer', roleLabel:'Producer', fee:producerFee(p) }); });
  composers.forEach(function(p){ list.push({ person:p, role:'composer', roleLabel:'Composer', fee:composerFee(p) }); });
  stars.forEach(function(p){ list.push({ person:p, role:'star', roleLabel:'Star', fee:starFee(p) }); });
  return list;
}

function getFilmography(person, role){
  return player.moviesAll.filter(function(m){
    if(role==='writer') return m.writer===person;
    if(role==='director') return m.director===person;
    if(role==='producer') return m.producerRef===person;
    if(role==='composer') return m.composerRef===person;
    if(role==='star') return m.star1===person || m.star2===person;
    return false;
  }).sort(function(a,b){ return (b.releaseWeek||0)-(a.releaseWeek||0); });
}

export function renderTalentTab(){
  var list = buildTalentList();
  var roleFilter = talentRoleFilter.value;
  if(roleFilter!=='all'){ list = list.filter(function(t){ return t.role===roleFilter; }); }

  list.forEach(function(t){ t.filmography = getFilmography(t.person, t.role); });

  var sortBy = talentSortBy.value;
  if(sortBy==='fee'){ list.sort(function(a,b){ return b.fee-a.fee; }); }
  else if(sortBy==='name'){ list.sort(function(a,b){ return a.person.name.localeCompare(b.person.name); }); }
  else if(sortBy==='credits'){ list.sort(function(a,b){ return b.filmography.length-a.filmography.length; }); }
  else { list.sort(function(a,b){ return b.person.prestige-a.person.prestige; }); } // default: prestige

  if(list.length===0){ talentRosterList.innerHTML = '<p class="empty">No talent match this filter.</p>'; return; }

  talentRosterList.innerHTML = list.map(function(t){
    var p = t.person;
    var awards = p.awardsWon||[];
    var awardsHtml = awards.length>0 ?
      '<div class="talent-awards">🏆 '+awards.map(function(a){ return escapeHtml(a.category)+' ('+a.year+', "'+escapeHtml(a.movieTitle)+'")'; }).join(', ')+'</div>' : '';
    var filmHtml;
    if(t.filmography.length>0){
      var shown = t.filmography.slice(0,5).map(function(m){
        return '<span class="talent-film-chip badge-'+escapeHtml(m.verdictCls||'even')+'">'+escapeHtml(m.title)+'</span>';
      }).join('');
      var more = t.filmography.length>5 ? ' <span class="hint">+'+(t.filmography.length-5)+' more</span>' : '';
      filmHtml = '<div class="talent-films">'+shown+more+'</div>';
    } else {
      filmHtml = '<div class="talent-films"><span class="hint">No credits yet.</span></div>';
    }
    var statLabel = t.role==='star' ? 'Star Power' : 'Skill';
    var statValue = t.role==='star' ? p.starPower : p.skill;
    return '<div class="talent-card">'+
      '<div class="talent-card-head"><strong>'+escapeHtml(p.name)+'</strong><span class="talent-role-tag">'+t.roleLabel+'</span></div>'+
      '<div class="talent-stats-row"><span>'+statLabel+' '+statValue+'</span><span>Prestige '+Math.round(p.prestige)+'</span><span>Fee '+formatMoney(t.fee)+'</span><span>'+t.filmography.length+' credit'+(t.filmography.length===1?'':'s')+'</span></div>'+
      awardsHtml+
      filmHtml+
    '</div>';
  }).join('');
}
