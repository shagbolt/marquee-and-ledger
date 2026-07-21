import { GENRE_COLORS } from '../data/constants.js';

// ===== Genre Badges =====
// App-icon-style rounded-square emblems, one per genre: a color-coded tile (from
// the same GENRE_COLORS every poster gradient uses), a soft top-light bevel, and
// the icon rendered as raised gold relief (a dark offset copy under a gold-gradient
// fill) rather than a flat outline. Used on the movie poster corner, the Genre
// Tracker rows, and the History filmography table.
//
// Drama gets the classic paired comedy/tragedy masks — the traditional theatrical
// crest — and Comedy gets a single elongated mask (tapered chin, arched brow,
// carved grin). Deliberately not a circle: an early pass used a round single mask
// and it read as a smiling citrus fruit rather than anything theatrical.
var GENRE_ICON_KIND = {
  Action: 'action',
  Animation: 'animation',
  Comedy: 'comedy_single',
  Drama: 'drama_masks',
  Horror: 'horror',
  'Sci-Fi': 'scifi'
};

var uidCounter = 0;
function nextId(){ uidCounter += 1; return 'gb'+uidCounter; }

function goldDefs(id){
  return '<linearGradient id="gold'+id+'" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0" stop-color="#fbe7a8"/><stop offset="0.35" stop-color="#e8c158"/>'+
      '<stop offset="0.7" stop-color="#c9a227"/><stop offset="1" stop-color="#8a6d1a"/>'+
    '</linearGradient>';
}

function iconMarkup(kind, id){
  var g = 'url(#gold'+id+')', dk = '#4a3a10';
  switch(kind){
    case 'action':
      return '<g transform="rotate(-28)">'+
          '<rect x="-3" y="-24" width="6" height="30" rx="2" fill="'+dk+'" transform="translate(1,1)"/>'+
          '<rect x="-3" y="-24" width="6" height="30" rx="2" fill="'+g+'"/>'+
          '<path d="M-9 4 Q0 -2 9 4 L9 12 Q0 20 -9 12 Z" fill="'+dk+'" transform="translate(1,1)"/>'+
          '<path d="M-9 4 Q0 -2 9 4 L9 12 Q0 20 -9 12 Z" fill="'+g+'"/>'+
        '</g>'+
        '<g transform="translate(13,-11)">'+
          '<path d="M0 -14 Q7 -6 5 2 Q10 -1 9 -9 Q16 2 8 13 Q-4 20 -7 8 Q-9 -2 0 -14 Z" fill="'+dk+'" transform="translate(1,1)"/>'+
          '<path d="M0 -14 Q7 -6 5 2 Q10 -1 9 -9 Q16 2 8 13 Q-4 20 -7 8 Q-9 -2 0 -14 Z" fill="'+g+'"/>'+
        '</g>';
    case 'animation':
      return '<g>'+
          '<path d="M0 -22 L5 -8 L20 -6 L9 4 L12 19 L0 11 L-12 19 L-9 4 L-20 -6 L-5 -8 Z" fill="'+dk+'" transform="translate(1,1)"/>'+
          '<path d="M0 -22 L5 -8 L20 -6 L9 4 L12 19 L0 11 L-12 19 L-9 4 L-20 -6 L-5 -8 Z" fill="'+g+'"/>'+
          '<circle cx="16" cy="-16" r="3.4" fill="'+g+'"/><circle cx="-18" cy="14" r="2.4" fill="'+g+'"/>'+
        '</g>';
    case 'comedy_single':
      // A single elongated theater mask — tapered chin, arched brow, carved grin.
      return '<g>'+
          '<path d="M0 -21 Q13 -19 13 -5 Q13 8 8 15 Q4 22 0 22 Q-4 22 -8 15 Q-13 8 -13 -5 Q-13 -19 0 -21 Z" fill="'+dk+'" transform="translate(1,1)"/>'+
          '<path d="M0 -21 Q13 -19 13 -5 Q13 8 8 15 Q4 22 0 22 Q-4 22 -8 15 Q-13 8 -13 -5 Q-13 -19 0 -21 Z" fill="'+g+'"/>'+
          '<path d="M-9 -7 Q-5 -11 -1 -7.5" stroke="#3a2f0c" stroke-width="1.8" fill="none" stroke-linecap="round"/>'+
          '<path d="M1 -7.5 Q5 -11 9 -7" stroke="#3a2f0c" stroke-width="1.8" fill="none" stroke-linecap="round"/>'+
          '<path d="M-6.5 -3 Q-6.5 -0.5 -4.5 -0.5 Q-2.5 -0.5 -2.5 -3" fill="#2a220a"/>'+
          '<path d="M6.5 -3 Q6.5 -0.5 4.5 -0.5 Q2.5 -0.5 2.5 -3" fill="#2a220a"/>'+
          '<path d="M-8 6 Q0 15 8 6 Q0 12 -8 6 Z" fill="#2a220a"/>'+
          '<path d="M-15 -14 L-19 -17 M15 -14 L19 -17" stroke="'+g+'" stroke-width="1.6" stroke-linecap="round"/>'+
        '</g>';
    case 'drama_masks':
      // The classic paired comedy/tragedy masks — Drama's theatrical crest.
      return '<g transform="translate(-9,0)">'+
          '<path d="M-9 -13 Q0 -18 9 -13 Q11 -2 5 5 Q0 8 -5 5 Q-11 -2 -9 -13 Z" fill="'+dk+'" transform="translate(1,1)"/>'+
          '<path d="M-9 -13 Q0 -18 9 -13 Q11 -2 5 5 Q0 8 -5 5 Q-11 -2 -9 -13 Z" fill="'+g+'"/>'+
          '<circle cx="-4" cy="-9" r="1.6" fill="#3a2f0c"/><circle cx="4" cy="-9" r="1.6" fill="#3a2f0c"/>'+
          '<path d="M-5 -2 Q0 2 5 -2" stroke="#3a2f0c" stroke-width="1.4" fill="none"/>'+
        '</g>'+
        '<g transform="translate(11,6)">'+
          '<path d="M-9 -13 Q0 -18 9 -13 Q11 -2 5 5 Q0 8 -5 5 Q-11 -2 -9 -13 Z" fill="'+dk+'" opacity="0.7" transform="translate(1,1)"/>'+
          '<path d="M-9 -13 Q0 -18 9 -13 Q11 -2 5 5 Q0 8 -5 5 Q-11 -2 -9 -13 Z" fill="'+g+'" opacity="0.92"/>'+
          '<circle cx="-4" cy="-9" r="1.6" fill="#3a2f0c"/><circle cx="4" cy="-9" r="1.6" fill="#3a2f0c"/>'+
          '<path d="M-5 3 Q0 -1 5 3" stroke="#3a2f0c" stroke-width="1.4" fill="none"/>'+
        '</g>';
    case 'horror':
      return '<path d="M0 -20 C13 -20 18 -9 18 0 C18 10 13 20 0 24 C-13 20 -18 10 -18 0 C-18 -9 -13 -20 0 -20 Z" fill="'+dk+'" transform="translate(1,1)"/>'+
        '<path d="M0 -20 C13 -20 18 -9 18 0 C18 10 13 20 0 24 C-13 20 -18 10 -18 0 C-18 -9 -13 -20 0 -20 Z" fill="'+g+'"/>'+
        '<path d="M-8 -3 L-2 3 M-2 -3 L-8 3 M8 -3 L2 3 M2 -3 L8 3" stroke="#3a2f0c" stroke-width="2.2" stroke-linecap="round"/>'+
        '<path d="M-6 12 L-3 8 L0 12 L3 8 L6 12" stroke="#3a2f0c" stroke-width="2" fill="none" stroke-linecap="round"/>';
    case 'scifi':
      return '<ellipse cx="0" cy="2" rx="22" ry="7" fill="none" stroke="'+dk+'" stroke-width="5" transform="translate(1,1) rotate(-16 0 2)"/>'+
        '<ellipse cx="0" cy="2" rx="22" ry="7" fill="none" stroke="'+g+'" stroke-width="4.4" transform="rotate(-16 0 2)"/>'+
        '<circle cx="0" cy="0" r="13" fill="'+dk+'" transform="translate(1,1)"/>'+
        '<circle cx="0" cy="0" r="13" fill="'+g+'"/>'+
        '<ellipse cx="-4" cy="-4" rx="4.5" ry="3" fill="#fbe7a8" opacity="0.6"/>';
    default:
      return '';
  }
}

// Returns a self-contained <svg> string: a rounded-square tile in the genre's
// color, a soft sheen, and the relief icon. size is the rendered pixel size
// (viewBox is fixed at 100 so stroke widths stay consistent regardless of size).
export function genreBadgeSVG(genre, size){
  var colors = GENRE_COLORS[genre] || GENRE_COLORS.Action;
  var kind = GENRE_ICON_KIND[genre] || 'action';
  var id = nextId();
  var vw = 100;
  var s = '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+vw+' '+vw+'" aria-hidden="true">';
  s += '<defs>'+goldDefs(id)+
      '<linearGradient id="bg'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+colors.mid+'"/><stop offset="1" stop-color="'+colors.dark+'"/></linearGradient>'+
      '<radialGradient id="sheen'+id+'" cx="0.3" cy="0.18" r="0.65"><stop offset="0" stop-color="rgba(255,255,255,0.35)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient>'+
    '</defs>';
  s += '<rect x="2" y="2" width="'+(vw-4)+'" height="'+(vw-4)+'" rx="22" fill="url(#bg'+id+')"/>';
  s += '<rect x="2" y="2" width="'+(vw-4)+'" height="'+(vw-4)+'" rx="22" fill="url(#sheen'+id+')"/>';
  s += '<rect x="2.5" y="2.5" width="'+(vw-5)+'" height="'+(vw-5)+'" rx="21" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>';
  s += '<g transform="translate('+(vw/2)+','+(vw/2)+')">'+iconMarkup(kind, id)+'</g>';
  s += '</svg>';
  return s;
}
