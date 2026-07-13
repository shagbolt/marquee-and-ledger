import { clamp, escapeHtml, formatMoney } from '../data/constants.js';
import { player } from '../state/game-state.js';

export var PRODUCTION_EVENTS = [
    {
      id:'diva',
      title:'🎭 Diva Antics',
      flavor:function(movie){ return 'Your lead, '+movie.star1.name+', refuses to shoot tomorrow\'s scenes until the script gets a rewrite.'; },
      choices:[
        { key:'A', label:'Agree to the Rewrite', description:'Pay $500,000 in delays. Script Quality +5. The director loses patience (-5 Prestige).',
          apply:function(movie){
            player.cash -= 500000;
            movie.eventCost += 500000;
            movie.qualityDelta += 5;
            var beforeP = movie.director.prestige;
            movie.director.prestige = clamp(movie.director.prestige-5, 0, 100);
            return 'You paid '+formatMoney(500000)+' for the rewrite. Script Quality +5. '+escapeHtml(movie.director.name)+'\u2019s prestige slipped from '+Math.round(beforeP)+' to '+Math.round(movie.director.prestige)+'.';
          }
        },
        { key:'B', label:'Deny the Request', description:'Pay nothing, but lose -10 Star Power from this actor for this film\'s Hype calculation.',
          apply:function(movie){
            movie.effStar1Power = clamp(movie.effStar1Power-10, 0, 100);
            return escapeHtml(movie.star1.name)+' sulks through the shoot. Their on-screen charisma takes a hit for this film only (-10 Star Power for Hype).';
          }
        }
      ]
    },
    {
      id:'stunt',
      title:'💥 Stunt Gone Wrong',
      flavor:function(){ return 'A major set piece explodes early during rehearsal. Nobody\'s hurt, but the crew is rattled.'; },
      choices:[
        { key:'A', label:'Safety First — Rebuild It', description:'Pay $1,000,000 for repairs and a safe delay. No stat changes.',
          apply:function(movie){
            player.cash -= 1000000;
            movie.eventCost += 1000000;
            return 'You paid '+formatMoney(1000000)+' to rebuild the set safely. Production continues on solid footing.';
          }
        },
        { key:'B', label:'Cut Corners — Shoot Anyway', description:'Pay nothing. 50% chance of a PR disaster (-15 Hype) or a viral moment (+10 Hype).',
          apply:function(movie){
            if(Math.random()<0.5){
              movie.hypeDelta -= 15;
              return 'Footage of the near-miss leaks and the press has a field day. PR disaster: Hype -15.';
            } else {
              movie.hypeDelta += 10;
              return 'The explosion clip goes viral for all the right reasons. Accidental marketing win: Hype +10.';
            }
          }
        }
      ]
    },
    {
      id:'leak',
      title:'📱 Leaked Test Footage',
      flavor:function(){ return 'Unfinished VFX clips just leaked onto social media, and they\'re spreading fast.'; },
      choices:[
        { key:'A', label:'Lean Into It', description:'Spend $300,000 on rapid-response PR. Hype +12.',
          apply:function(movie){
            player.cash -= 300000;
            movie.eventCost += 300000;
            movie.hypeDelta += 12;
            return 'You turned the leak into a marketing moment. Hype +12.';
          }
        },
        { key:'B', label:'Issue Takedowns', description:'Spend $100,000 on legal fees. Hype -5.',
          apply:function(movie){
            player.cash -= 100000;
            movie.eventCost += 100000;
            movie.hypeDelta -= 5;
            return 'Lawyers scrub the clips, but the unfinished footage still made a bad first impression. Hype -5.';
          }
        }
      ]
    },
    {
      id:'feud',
      title:'⚔️ Director-Writer Creative Feud',
      flavor:function(){ return 'Your director and writer are at war over how the third act should end.'; },
      choices:[
        { key:'A', label:'Side with the Director', description:'Writer Skill -15 for this film\'s score.',
          apply:function(movie){
            movie.effWriterSkill = clamp(movie.effWriterSkill-15, 0, 100);
            return 'The director\u2019s vision wins out. The script suffers for it, this film only (-15 Writer Skill).';
          }
        },
        { key:'B', label:'Side with the Writer', description:'Director Skill -15 for this film\'s score.',
          apply:function(movie){
            movie.effDirectorSkill = clamp(movie.effDirectorSkill-15, 0, 100);
            return 'The script stays intact, but the director checks out creatively (-15 Director Skill, this film).';
          }
        },
        { key:'C', label:'Mediate — Pay for Counseling', description:'Pay $250,000 in corporate counseling fees. No stat changes.',
          apply:function(movie){
            player.cash -= 250000;
            movie.eventCost += 250000;
            return 'A very expensive therapist talks them both down. '+formatMoney(250000)+' well spent — no stats lost.';
          }
        }
      ]
    }
  ];

