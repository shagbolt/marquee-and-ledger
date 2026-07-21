// ===== Studio Logo =====
// A small set of procedural emblem marks the player picks at Studio Creation —
// a circular medallion (deliberately a different silhouette from the genre
// badges' rounded squares, so studio identity and genre identity never look
// like the same kind of icon) rendered in gold on a dark ring, matching the
// masthead's existing gold/dark palette.

export var STUDIO_LOGOS = [
  { id:'star', label:'The Star' },
  { id:'lion', label:'The Lion' },
  { id:'globe', label:'The Globe' },
  { id:'phoenix', label:'The Phoenix' },
  { id:'quill', label:'The Quill' },
  { id:'reel', label:'The Reel' },
  { id:'comet', label:'The Comet' },
  { id:'crown', label:'The Crown' }
];

var uidCounter = 0;
function nextId(){ uidCounter += 1; return 'sl'+uidCounter; }

function goldDefs(id){
  return '<linearGradient id="slgold'+id+'" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0" stop-color="#fbe7a8"/><stop offset="0.4" stop-color="#e8c158"/>'+
      '<stop offset="1" stop-color="#a3811e"/>'+
    '</linearGradient>';
}

function markPath(kind, g){
  switch(kind){
    case 'star':
      return '<path d="M0 -20 L5.9 -6.2 L21 -6.2 L9 2.4 L13.6 17 L0 8 L-13.6 17 L-9 2.4 L-21 -6.2 L-5.9 -6.2 Z" fill="'+g+'"/>';
    case 'lion':
      return '<circle cx="0" cy="0" r="9" fill="'+g+'"/>'+
        Array.from({length:10}).map(function(_,i){
          var a = (i/10)*Math.PI*2;
          return '<path d="M'+(Math.cos(a)*10)+' '+(Math.sin(a)*10)+' L'+(Math.cos(a)*20)+' '+(Math.sin(a)*20)+' L'+(Math.cos(a+0.28)*13)+' '+(Math.sin(a+0.28)*13)+' Z" fill="'+g+'"/>';
        }).join('')+
        '<circle cx="-3.2" cy="-1.5" r="1.3" fill="#241c08"/><circle cx="3.2" cy="-1.5" r="1.3" fill="#241c08"/>'+
        '<path d="M-2.5 4 Q0 6.5 2.5 4" stroke="#241c08" stroke-width="1.3" fill="none"/>';
    case 'globe':
      return '<circle cx="0" cy="0" r="19" fill="none" stroke="'+g+'" stroke-width="2.4"/>'+
        '<ellipse cx="0" cy="0" rx="8" ry="19" fill="none" stroke="'+g+'" stroke-width="1.6"/>'+
        '<line x1="-19" y1="-6" x2="19" y2="-6" stroke="'+g+'" stroke-width="1.4"/>'+
        '<line x1="-19" y1="6" x2="19" y2="6" stroke="'+g+'" stroke-width="1.4"/>';
    case 'phoenix':
      return '<path d="M0 16 Q-3 4 0 -6 Q3 4 0 16 Z" fill="'+g+'"/>'+
        '<path d="M0 -6 Q-16 -14 -21 4 Q-10 -2 -1 2 Z" fill="'+g+'"/>'+
        '<path d="M0 -6 Q16 -14 21 4 Q10 -2 1 2 Z" fill="'+g+'"/>'+
        '<path d="M0 -6 Q-4 -16 0 -21 Q4 -16 0 -6 Z" fill="'+g+'"/>';
    case 'quill':
      return '<path d="M-14 18 Q4 6 16 -18 Q18 -19 17 -16 Q0 12 -11 21 Z" fill="'+g+'"/>'+
        '<path d="M-14 18 L-19 21" stroke="'+g+'" stroke-width="2.2" stroke-linecap="round"/>'+
        '<path d="M-2 8 Q4 2 9 -6 M-8 13 Q0 6 6 -3" stroke="#241c08" stroke-width="1" fill="none" opacity="0.5"/>';
    case 'reel':
      return '<circle cx="0" cy="0" r="19" fill="none" stroke="'+g+'" stroke-width="3"/>'+
        '<circle cx="0" cy="0" r="6.5" fill="'+g+'"/>'+
        Array.from({length:6}).map(function(_,i){
          var a = (i/6)*Math.PI*2;
          return '<circle cx="'+(Math.cos(a)*12.5)+'" cy="'+(Math.sin(a)*12.5)+'" r="3.6" fill="'+g+'"/>';
        }).join('');
    case 'comet':
      return '<circle cx="6" cy="-6" r="7" fill="'+g+'"/>'+
        '<path d="M2 -2 L-20 20 L-9 8 L-20 20 L-6 5 Z" fill="'+g+'" opacity="0.85"/>';
    case 'crown':
      return '<path d="M-18 10 L-18 -2 L-9 6 L0 -12 L9 6 L18 -2 L18 10 Z" fill="'+g+'"/>'+
        '<rect x="-18" y="10" width="36" height="5" fill="'+g+'"/>'+
        '<circle cx="-9" cy="-3" r="1.6" fill="#241c08"/><circle cx="0" cy="-9" r="1.6" fill="#241c08"/><circle cx="9" cy="-3" r="1.6" fill="#241c08"/>';
    default:
      return '';
  }
}

// Self-contained <svg> string — a dark medallion, gold ring, and the chosen mark.
export function studioLogoSVG(kind, size){
  var id = nextId();
  var g = 'url(#slgold'+id+')';
  var vw = 100;
  var s = '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+vw+' '+vw+'" aria-hidden="true">';
  s += '<defs>'+goldDefs(id)+
      '<radialGradient id="slbg'+id+'" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#2a2f42"/><stop offset="1" stop-color="#14171f"/></radialGradient>'+
    '</defs>';
  s += '<circle cx="50" cy="50" r="47" fill="url(#slbg'+id+')" stroke="'+g+'" stroke-width="3"/>';
  s += '<circle cx="50" cy="50" r="41" fill="none" stroke="'+g+'" stroke-width="0.8" opacity="0.5"/>';
  s += '<g transform="translate(50,50)">'+markPath(kind, g)+'</g>';
  s += '</svg>';
  return s;
}
