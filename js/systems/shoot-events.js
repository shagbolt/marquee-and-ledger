import { player } from '../state/game-state.js';

// Fires probabilistically during the week-by-week Production shoot (distinct from
// PRODUCTION_EVENTS, which is the single "surprise before cameras roll" that already
// fires right after Greenlight). Each choice's apply() mutates the same movie fields
// the rest of the game already reads: player.cash + movie.eventCost for money,
// movie.qualityDelta/hypeDelta for stat effects, and the shoot-specific ctx for morale
// and schedule extension, since those aren't meaningful outside an active shoot.
export var SHOOT_EVENTS = [
  {
    id:'weather', title:'🌧️ Weather Delay',
    flavor:function(movie){ return 'Days of rain have shut down exterior shooting on "'+movie.title+'."'; },
    choices:[
      { key:'A', label:'Pay for a Sound Stage', description:'Pay $400,000 to move interiors up. No schedule impact.',
        apply:function(movie, ctx){
          player.cash -= 400000; movie.eventCost += 400000;
          return 'You rented an indoor stage to keep shooting. No schedule impact.';
        } },
      { key:'B', label:'Wait It Out', description:'Free, but the shoot falls a week behind schedule.',
        apply:function(movie, ctx){
          ctx.extraWeeks += 1;
          return 'Production waits out the weather. The schedule slips by a week.';
        } }
    ]
  },
  {
    id:'illness', title:'🤒 Star Falls Ill',
    flavor:function(movie){ return movie.star1.name+' has come down with the flu and can\u2019t shoot this week.'; },
    choices:[
      { key:'A', label:'Shoot Around Them', description:'Free. Reschedule scenes without them — Quality -3.',
        apply:function(movie, ctx){
          movie.qualityDelta -= 3;
          return 'The crew improvises, shooting scenes without '+movie.star1.name+'. The workaround shows a little (-3 Quality).';
        } },
      { key:'B', label:'Wait for Recovery', description:'Free, but the shoot falls a week behind schedule.',
        apply:function(movie, ctx){
          ctx.extraWeeks += 1;
          return movie.star1.name+' rests up. The schedule slips by a week.';
        } }
    ]
  },
  {
    id:'equipment', title:'🎥 Equipment Failure',
    flavor:function(){ return 'A key camera rig goes down mid-shoot, along with a chunk of unsaved footage.'; },
    choices:[
      { key:'A', label:'Rent a Replacement', description:'Pay $250,000 for an emergency rental. No impact.',
        apply:function(movie, ctx){
          player.cash -= 250000; movie.eventCost += 250000;
          return 'A rented replacement keeps the cameras rolling. No real impact.';
        } },
      { key:'B', label:'Reshoot with What You Have', description:'Free, but Quality -4 from the compromised footage.',
        apply:function(movie, ctx){
          movie.qualityDelta -= 4;
          return 'The crew makes do with older equipment. It shows on screen (-4 Quality).';
        } }
    ]
  },
  {
    id:'standout', title:'✨ A Scene Comes Together Perfectly',
    flavor:function(){ return 'An unscripted moment on set turns into one of the best scenes in the picture.'; },
    choices:[
      { key:'A', label:'Keep It In', description:'Free. Quality +5, and the crew\u2019s spirits lift.',
        apply:function(movie, ctx){
          movie.qualityDelta += 5; ctx.moraleDelta += 8;
          return 'The scene stays in the cut. Quality +5, and morale gets a real boost.';
        } }
    ]
  },
  {
    id:'conflict', title:'😤 On-Set Clash',
    flavor:function(movie){ return 'Tempers flare between '+movie.director.name+' and the crew over a scheduling dispute.'; },
    choices:[
      { key:'A', label:'Bring In a Mediator', description:'Pay $180,000. Morale fully recovers.',
        apply:function(movie, ctx){
          player.cash -= 180000; movie.eventCost += 180000; ctx.moraleDelta += 15;
          return 'A mediator smooths things over. Morale recovers.';
        } },
      { key:'B', label:'Let It Blow Over', description:'Free, but Morale takes a real hit.',
        apply:function(movie, ctx){
          ctx.moraleDelta -= 12;
          return 'Nobody steps in. The tension lingers on set.';
        } }
    ]
  },
  {
    id:'extrascenes', title:'🎬 Director Wants More',
    flavor:function(movie){ return movie.director.name+' wants to shoot an extra scene that wasn\u2019t in the original plan.'; },
    choices:[
      { key:'A', label:'Approve It', description:'Pay $320,000. Quality +6.',
        apply:function(movie, ctx){
          player.cash -= 320000; movie.eventCost += 320000; movie.qualityDelta += 6;
          return 'The extra scene gets shot. Quality +6.';
        } },
      { key:'B', label:'Stick to the Plan', description:'Free, no changes.',
        apply:function(movie, ctx){
          return 'You keep the production on its original plan. No changes.';
        } }
    ]
  }
];
