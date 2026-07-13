import { player } from '../state/game-state.js';
import { scaledCost } from './release-strategy.js';

// Post-Production is deliberately a lighter, more executive-summary phase than the
// Production shoot — the design brief frames editing/sound/VFX/color/ADR as a montage
// to be represented, not six separate systems to manage. One real choice (how much to
// invest in the polish pass) plus a real chance of one more choice (whether a flagged
// scene is worth reshooting) covers the same ground without the same weight.
export var POST_PRODUCTION_TIERS = [
  { id:'minimal', name:'Minimal Post', costFactor:0.02, qualityDelta:-4, hypeDelta:0, weeks:1,
    desc:'A quick, cheap turnaround. The cut shows it (Quality \u22124).' },
  { id:'standard', name:'Standard Post', costFactor:0.08, qualityDelta:0, hypeDelta:0, weeks:2,
    desc:'A normal, professional post-production pass. No surprises either way.' },
  { id:'premium', name:'Premium Post', costFactor:0.18, qualityDelta:7, hypeDelta:5, weeks:4,
    desc:'Full VFX polish, sound design, ADR, and color grading. A real prestige investment (Quality +7, Hype +5).' }
];

export function postProductionCost(tier, movie){
  return Math.round((movie.totalBudget||0)*tier.costFactor);
}

// Fires with a real (not guaranteed) chance after the polish tier is chosen — a distinct
// moment from the shoot's own events, and from Test Screening's reshoot responses, which
// come later and react to actual audience feedback rather than the team's own instincts.
export var ADDITIONAL_PHOTOGRAPHY_EVENT = {
  id:'addlphotography',
  title:'🎬 Additional Photography',
  flavor:function(movie){ return 'An early cut of "'+movie.title+'" reveals a sequence that just isn\u2019t working. The team floats reshooting it before the film goes any further.'; },
  choices:[
    { key:'A', label:'Commission the Reshoot', description:'Pay a scaled cost. Quality +5.',
      apply:function(movie){
        var cost = scaledCost(280000);
        player.cash -= cost; movie.eventCost += cost; movie.qualityDelta += 5;
        return 'The scene gets reshot and lands the way it should have the first time. Quality +5.';
      } },
    { key:'B', label:'Leave It', description:'Free, no changes.',
      apply:function(movie){
        return 'You leave the cut as-is and move on. No changes.';
      } }
  ]
};
