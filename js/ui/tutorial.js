// ===== New-Player Tutorial Coachmarks =====
// A queued, one-time-per-step coachmark system that points at real UI as the player
// reaches each moment for the first time. Deliberately NOT part of the save file:
// state lives under its own localStorage key, so exporting/importing a studio never
// carries tutorial progress with it, and wiping a save never re-triggers tips the
// player has already read on this device.
//
// Design rules this module follows:
//  - It imports nothing from render/flow/state modules — triggers are exported
//    functions the flow code calls at existing hook points (goToStep, showTab,
//    foundStudioBtn, openProductionEvent, openTestScreening, processNextWeek,
//    showSummaryModal, and the unlock check after each settlement). No parallel
//    state tracker, no polling.
//  - Every step fires at most once, ever, per device. Dismiss marks it seen.
//  - "Skip tutorial" inside any bubble disables the whole system; the
//    "Show new-player tips" checkbox in the Studio Office panel re-enables it
//    (already-seen steps stay seen either way).
//  - Bubbles sit at z-index 300, above the modal overlays (z-index 50), because
//    steps 7, 8, and 10 point INTO open modals.

export var TUTORIAL_KEY = 'marqueeLedgerTutorial_v1';

var state = loadState();
var queue = [];          // step ids waiting to be shown
var activeStep = null;   // step id currently on screen
var bubbleEl = null;
var highlightedEl = null;
var repositionHandler = null;

function loadState(){
  try{
    var raw = localStorage.getItem(TUTORIAL_KEY);
    if(raw){
      var parsed = JSON.parse(raw);
      if(parsed && typeof parsed==='object'){
        return { enabled: parsed.enabled!==false, seen: parsed.seen||{} };
      }
    }
  }catch(e){ /* private mode / storage denied — tips just won't persist */ }
  return { enabled:true, seen:{} };
}

function saveState(){
  try{ localStorage.setItem(TUTORIAL_KEY, JSON.stringify(state)); }
  catch(e){ /* non-fatal */ }
}

// ---- Step definitions ----
// selectors: tried in order; the first VISIBLE match is the anchor. If none are
// visible the bubble centers itself with no highlight — better an unanchored tip
// than a tip pointing at nothing (matters for the tab-unlock callouts, where the
// newly unlocked tab button may be hidden under a different destination).
var STEPS = {
  found_studio: {
    title: 'Welcome to the lot',
    selectors: ['#objectivePrimaryBtn', '#objectiveCard'],
    text: 'This card always shows your next move. Nothing in this game happens on its own \u2014 time only passes when you advance it, so you can think as long as you like. When in doubt, do what the card says.'
  },
  dev_script_optional: {
    title: 'Script development is optional',
    selectors: ['#synopsisInput'],
    text: 'You can write and analyze a synopsis here for an extra edge \u2014 or skip it entirely. A skipped script is perfectly neutral: it never hurts you. Come back to it once you\u2019re comfortable with the basics.'
  },
  dev_genre: {
    title: 'Genre is a real decision',
    selectors: ['#genreSelect'],
    text: 'Every genre has its own audience demand, its own ideal effects budget, runtime, and rating \u2014 and its own market saturation. The same movie succeeds in one genre and bombs in another. Check the Genre Tracker in the sidebar before you commit.'
  },
  wizard_casting: {
    title: 'How fees work',
    selectors: ['#writerSelect'],
    text: 'A person\u2019s fee is their skill plus their current prestige \u2014 nothing else. Prestige moves after every release, so today\u2019s bargain can become tomorrow\u2019s star (and bill). A \u2605 means they specialize in your chosen genre: same fee, better work.'
  },
  wizard_fit: {
    title: 'Watch the fit line',
    selectors: ['#propertyFitText', '#sfxRange'],
    text: 'Runtime, rating, and demographic each have a genre sweet spot, and this line grades your current picks before you spend a dollar. A bad rating fit doesn\u2019t just cost audience score \u2014 it shrinks how many theaters will book you.'
  },
  wizard_budget: {
    title: 'Read this before you commit',
    selectors: ['#budgetSummaryBody'],
    text: 'This is your whole picture: total spend, projected quality and hype, and a risk read. Money alone never guarantees success here \u2014 a mismatched budget can sink a star-studded picture. If the risk gauge looks ugly, it\u2019s telling you something.'
  },
  production_event: {
    title: 'There are no free answers',
    selectors: ['#eventBody', '#eventModal'],
    text: 'Before cameras roll, something always goes sideways \u2014 and every option costs you something: cash, stats, or a gamble. There\u2019s no secretly correct pick. A skilled producer softens the dollar cost of whatever you choose, but never the luck.'
  },
  test_screening: {
    title: 'Sometimes the audience is wrong',
    selectors: ['#testScreeningChoices', '#testScreeningModal'],
    text: 'The focus group flags your weakest metric, and every fix targets a specific score \u2014 but fixes only land about 65\u201380% of the time. The rest of the time they backfire somewhere else. Releasing as-is is free and often the right call.'
  },
  box_office: {
    title: 'Your first week in theaters',
    selectors: ['#nowShowingContent', '#cumulativeBig', '.tab-btn[data-tab="dashboard"]'],
    text: 'Opening weekend is driven by Hype, theater count, and Quality. After that it\u2019s all legs: strong reviews slow the weekly drop, toxic word of mouth doubles it. Watch the Notes column \u2014 a rival opening in your genre the same week takes a real bite.'
  },
  receipt: {
    title: 'How to read the receipt',
    selectors: ['#summaryTitle'],
    text: 'Everything that matters is on this receipt. Scroll to Talent Prestige & Fee Impact: every person\u2019s reputation \u2014 and future fee \u2014 just moved, split into commercial and review components. Your studio\u2019s own prestige moved too, and prestige is what unlocks the later game.'
  },
  unlock_research: {
    title: 'Market Research unlocked',
    selectors: ['.tab-btn[data-tab="research"]', '.dest-btn[data-dest="studiohq"]'],
    text: 'Three releases in, the Research tab (under Studio HQ) is now open: live demand and saturation for every genre. High demand with low saturation is the read you want \u2014 piling into a crowded genre eats your Hype directly.'
  },
  unlock_international: {
    title: 'International unlocked',
    selectors: ['.tab-btn[data-tab="international"]', '.dest-btn[data-dest="market"]'],
    text: 'At 40 Prestige your pictures can now travel: after each theatrical run you\u2019ll be offered seven overseas markets, each with its own tastes, costs, and censors. Approval is a real dice roll \u2014 a rejected market still keeps your localization fee.'
  }
};

// ---- Public trigger functions (called from flow code at existing hook points) ----

export function tutorialOnStudioFounded(){ requestCoachmark('found_studio'); }

export function tutorialOnTabShown(tabId){
  if(tabId==='development'){
    requestCoachmark('dev_script_optional');
    requestCoachmark('dev_genre');
  }
}

export function tutorialOnWizardStep(n){
  if(n===2) requestCoachmark('wizard_casting');
  else if(n===3) requestCoachmark('wizard_fit');
  else if(n===5) requestCoachmark('wizard_budget');
}

export function tutorialOnProductionEvent(){ requestCoachmark('production_event'); }

export function tutorialOnTestScreening(){ requestCoachmark('test_screening'); }

export function tutorialOnBoxOfficeFirstWeek(){ requestCoachmark('box_office'); }

export function tutorialOnSettlementReceipt(){ requestCoachmark('receipt'); }

// Called after every settlement (and on load-with-save) with the live player/game
// objects — re-checks the two gated-tab conditions and fires each callout exactly
// once, the first time its condition is true. Passing the objects in keeps this
// module free of state imports.
export function tutorialCheckUnlocks(player){
  if(!player) return;
  if((player.moviesAll||[]).length>=3) requestCoachmark('unlock_research');
  if(player.prestige>=40) requestCoachmark('unlock_international');
}

// ---- Toggle wiring (checkbox in the Studio Office panel) ----
export function initTutorialToggle(){
  var cb = document.getElementById('tutorialToggle');
  if(!cb) return;
  cb.checked = state.enabled;
  cb.addEventListener('change', function(){
    state.enabled = cb.checked;
    saveState();
    if(!state.enabled){ queue = []; dismissActive(false); }
  });
}

// ---- Core queue + display ----

function requestCoachmark(id){
  if(!state.enabled) return;
  if(state.seen[id]) return;
  if(activeStep===id || queue.indexOf(id)!==-1) return;
  if(!STEPS[id]) return;
  queue.push(id);
  if(!activeStep) showNext();
}

function showNext(){
  if(activeStep || queue.length===0) return;
  var id = queue.shift();
  if(state.seen[id] || !state.enabled){ showNext(); return; }
  activeStep = id;
  // Small delay so the UI the step points at (modals, panels) has finished
  // rendering/animating before we measure its position.
  setTimeout(function(){
    if(activeStep!==id) return;
    renderBubble(id, STEPS[id]);
  }, 180);
}

function findAnchor(step){
  for(var i=0;i<step.selectors.length;i++){
    var el = document.querySelector(step.selectors[i]);
    if(el && isVisible(el)) return el;
  }
  return null;
}

function isVisible(el){
  if(!el) return false;
  var r = el.getBoundingClientRect();
  if(r.width===0 && r.height===0) return false;
  var style = window.getComputedStyle(el);
  if(style.display==='none' || style.visibility==='hidden') return false;
  // Walk up for hidden ancestors (tab panels use .hidden / display toggling)
  var p = el.parentElement;
  while(p && p!==document.body){
    var ps = window.getComputedStyle(p);
    if(ps.display==='none' || ps.visibility==='hidden') return false;
    p = p.parentElement;
  }
  return true;
}

function renderBubble(id, step){
  removeBubble();
  var anchor = findAnchor(step);

  if(anchor){
    anchor.classList.add('coachmark-highlight');
    highlightedEl = anchor;
  }

  bubbleEl = document.createElement('div');
  bubbleEl.className = 'coachmark-bubble';
  bubbleEl.setAttribute('role', 'dialog');
  bubbleEl.setAttribute('aria-label', step.title);
  bubbleEl.innerHTML =
    '<div class="coachmark-title">💡 '+step.title+'</div>'+
    '<div class="coachmark-text">'+step.text+'</div>'+
    '<div class="coachmark-actions">'+
      '<button type="button" class="coachmark-dismiss">Got it</button>'+
      '<button type="button" class="coachmark-skip">Skip all tips</button>'+
    '</div>';
  document.body.appendChild(bubbleEl);

  bubbleEl.querySelector('.coachmark-dismiss').addEventListener('click', function(){
    dismissActive(true);
  });
  bubbleEl.querySelector('.coachmark-skip').addEventListener('click', function(){
    state.enabled = false;
    queue = [];
    var cb = document.getElementById('tutorialToggle');
    if(cb) cb.checked = false;
    dismissActive(true); // still mark this one seen — they read it
  });

  positionBubble(anchor);
  repositionHandler = function(){ positionBubble(highlightedEl); };
  window.addEventListener('resize', repositionHandler);
  window.addEventListener('scroll', repositionHandler, true);
}

function positionBubble(anchor){
  if(!bubbleEl) return;
  var bw = bubbleEl.offsetWidth;
  var bh = bubbleEl.offsetHeight;
  var vw = window.innerWidth;
  var vh = window.innerHeight;

  if(!anchor || !isVisible(anchor)){
    // Centered fallback — no arrow, no highlight target
    bubbleEl.style.left = Math.max(12, (vw-bw)/2)+'px';
    bubbleEl.style.top = Math.max(12, (vh-bh)/2)+'px';
    bubbleEl.classList.remove('arrow-top','arrow-bottom');
    return;
  }

  var r = anchor.getBoundingClientRect();
  var top, left;
  // Prefer below the anchor; flip above if there's no room.
  if(r.bottom+bh+16 <= vh){
    top = r.bottom+10;
    bubbleEl.classList.add('arrow-top');
    bubbleEl.classList.remove('arrow-bottom');
  } else {
    top = Math.max(12, r.top-bh-10);
    bubbleEl.classList.add('arrow-bottom');
    bubbleEl.classList.remove('arrow-top');
  }
  left = r.left + r.width/2 - bw/2;
  left = Math.min(Math.max(12, left), vw-bw-12);
  top = Math.min(Math.max(12, top), vh-bh-12);
  bubbleEl.style.left = left+'px';
  bubbleEl.style.top = top+'px';
}

function dismissActive(markSeen){
  if(activeStep && markSeen){
    state.seen[activeStep] = true;
    saveState();
  }
  activeStep = null;
  removeBubble();
  showNext();
}

function removeBubble(){
  if(highlightedEl){
    highlightedEl.classList.remove('coachmark-highlight');
    highlightedEl = null;
  }
  if(repositionHandler){
    window.removeEventListener('resize', repositionHandler);
    window.removeEventListener('scroll', repositionHandler, true);
    repositionHandler = null;
  }
  if(bubbleEl && bubbleEl.parentNode){
    bubbleEl.parentNode.removeChild(bubbleEl);
  }
  bubbleEl = null;
}
