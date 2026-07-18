import { formatMoney } from '../data/constants.js';

// Respects reduced-motion: jumps straight to the final value rather than counting up,
// since a JS-driven requestAnimationFrame loop doesn't automatically honor the
// prefers-reduced-motion CSS rule the rest of the app already uses.
export function animateCounter(el, toValue, formatFn, duration){
  duration = duration || 900;
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced || !el){
    if(el) el.textContent = formatFn(toValue);
    return;
  }
  var start = null;
  function step(ts){
    if(!start) start = ts;
    var progress = Math.min((ts-start)/duration, 1);
    var eased = 1-Math.pow(1-progress, 3); // ease-out cubic — fast start, settles gently
    var current = Math.round(toValue*eased);
    el.textContent = formatFn(current);
    if(progress<1){ requestAnimationFrame(step); }
    else { el.textContent = formatFn(toValue); }
  }
  requestAnimationFrame(step);
}

export function animateMoneyCounter(el, toValue, duration){
  animateCounter(el, toValue, function(v){ return (v<0?'-':'')+formatMoney(Math.abs(v)); }, duration);
}

// A short, plain-English synthesis of why a picture performed the way it did — picks
// the two most salient factors from what's already computed on the movie object,
// rather than a fixed template, so the same verdict can read differently release to
// release depending on what actually drove it.
export function generateCausalExplanation(movie){
  var reasons = [];
  if(movie.isBreakout) reasons.push('a genuine word-of-mouth breakout nobody saw coming');
  if(movie.toxicWOM && movie.certifiedFresh){
    reasons.push('a real critics/audience split — a certified-fresh picture crowds just didn\u2019t warm to');
  } else if(movie.toxicWOM){
    reasons.push('toxic word of mouth that hurt its legs week to week');
  } else if(movie.certifiedFresh){
    reasons.push('strong reviews that kept it in theaters longer');
  }
  if(movie.genreSaturationAtRelease!=null && movie.genreSaturationAtRelease>=60){
    reasons.push('a heavily saturated '+movie.genre+' market at release');
  } else if(movie.genreDemandAtRelease!=null && movie.genreDemandAtRelease>=70 && movie.genreSaturationAtRelease<40){
    reasons.push('hot, undersaturated demand for '+movie.genre+' right now');
  }
  if(movie.quality>=75) reasons.push('a genuinely well-made picture');
  else if(movie.quality<40) reasons.push('a rough final cut');
  if(movie.hype>=75) reasons.push('a marketing push that really landed');
  else if(movie.hype<30) reasons.push('hype that never caught fire');

  if(reasons.length===0) return 'A fairly ordinary release \u2014 no single factor stood out either way.';
  return 'Driven mainly by '+reasons.slice(0,2).join(' and ')+'.';
}
