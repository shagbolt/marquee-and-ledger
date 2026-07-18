// Tied to a studio's persistent slot (its numeric id, 0/1/2), not its current name —
// a personality survives a bankruptcy reorganization even though the name changes,
// since the "house style" reads more like a trait of the lot than of whoever's
// currently running it. Genuinely changes the code paths that pick genre, budget, and
// quality, not just flavor text layered on top of the same random numbers as everyone
// else.
export var STUDIO_PERSONALITIES = {
  blockbuster: {
    label:'Blockbuster Chaser',
    tagline:'Bigger is the whole strategy.',
    genreBias:{'Action':1.6, 'Sci-Fi':1.4},
    budgetMultiplier:1.25,
    qualityBonus:0,
    opportunistic:false
  },
  awards: {
    label:'Awards Hound',
    tagline:'Chasing prestige over popcorn.',
    genreBias:{'Drama':1.8},
    budgetMultiplier:0.8,
    qualityBonus:8,
    opportunistic:false
  },
  underdog: {
    label:'Scrappy Underdog',
    tagline:'Small budgets, opportunistic bets.',
    genreBias:{},
    budgetMultiplier:0.55,
    qualityBonus:0,
    opportunistic:true // picks the least-saturated genre instead of chasing demand
  }
};
export var PERSONALITY_KEYS = ['blockbuster','awards','underdog'];

export function getPersonality(studio){
  return STUDIO_PERSONALITIES[studio.personalityKey] || STUDIO_PERSONALITIES.blockbuster;
}

// A few different phrasings per personality so the wire doesn't read like a template —
// picked at random each time, not tied 1:1 to any specific event.
var FLAVOR_VERBS = {
  blockbuster:['bets big on', 'goes all-in on', 'swings for the fences with'],
  awards:['quietly assembles', 'stakes its reputation on', 'plays it prestige with'],
  underdog:['scrapes together', 'punches above its budget with', 'takes a scrappy shot with']
};
export function personalityFlavorVerb(studio){
  var verbs = FLAVOR_VERBS[studio.personalityKey] || FLAVOR_VERBS.blockbuster;
  return verbs[Math.floor(Math.random()*verbs.length)];
}
