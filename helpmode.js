// ===== Help Mode =====
// A persistent, toggleable layer of (i) markers with detailed help popovers,
// complementing the one-time coachmarks in tutorial.js:
//   coachmarks say "look here next" (once, ever) — Help Mode answers
//   "what does this number actually do" (always, on demand).
//
// Design rules, mirroring tutorial.js:
//  - Imports only the pure-data HELP_TOPICS module. No render/flow/state imports.
//    Integration is one init call from main.js; everything else is self-contained.
//  - State (on/off) lives under its own localStorage key, outside the save file.
//  - Markers are injected next to the first VISIBLE selector match per topic and
//    re-scanned via a debounced MutationObserver, so tab switches, wizard steps,
//    and modals all pick up their markers with zero per-flow wiring.
//  - Popover sits at z-index 300 (same tier as coachmarks) so it works inside
//    the event/test-screening modals at z-index 50. One popover at a time.

import { HELP_TOPICS } from './helptext.js';

export var HELPMODE_KEY = 'marqueeLedgerHelpMode_v1';

var enabled = loadEnabled();
var popoverEl = null;
var popoverTopicId = null;
var observer = null;
var scanTimer = null;
var toggleBtn = null;

function loadEnabled(){
  try{ return localStorage.getItem(HELPMODE_KEY)==='on'; }
  catch(e){ return false; }
}
function saveEnabled(){
  try{ localStorage.setItem(HELPMODE_KEY, enabled ? 'on' : 'off'); }
  catch(e){ /* non-fatal */ }
}

// ---- Public init (call once from main.js after first render) ----
export function initHelpMode(){
  toggleBtn = document.getElementById('helpModeToggleBtn');
  if(toggleBtn){
    toggleBtn.addEventListener('click', function(){
      setEnabled(!enabled);
    });
  }
  document.addEventListener('click', onDocumentClick, true);
  window.addEventListener('resize', repositionPopover);
  window.addEventListener('scroll', repositionPopover, true);
  reflectButton();
  if(enabled) start();
}

function setEnabled(on){
  enabled = on;
  saveEnabled();
  reflectButton();
  if(enabled) start();
  else stop();
}

function reflectButton(){
  if(!toggleBtn) return;
  toggleBtn.classList.toggle('helpmode-on', enabled);
  toggleBtn.textContent = enabled ? '\u24d8 Help Mode: On' : '\u24d8 Help Mode';
  toggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

// ---- Lifecycle ----
function start(){
  scan();
  if(!observer){
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style'] });
  }
}

function stop(){
  if(observer){ observer.disconnect(); observer = null; }
  if(scanTimer){ clearTimeout(scanTimer); scanTimer = null; }
  closePopover();
  var marks = document.querySelectorAll('.help-i');
  for(var i=0;i<marks.length;i++){
    marks[i].parentNode && marks[i].parentNode.removeChild(marks[i]);
  }
}

function scheduleScan(){
  if(scanTimer) return;
  scanTimer = setTimeout(function(){ scanTimer = null; scan(); }, 250);
}

// ---- Marker injection ----
function scan(){
  if(!enabled) return;
  for(var i=0;i<HELP_TOPICS.length;i++){
    var topic = HELP_TOPICS[i];
    var existing = document.querySelector('.help-i[data-topic="'+topic.id+'"]');
    if(existing && isVisible(existing.previousElementSibling || existing.parentElement)) continue;
    if(existing) existing.parentNode.removeChild(existing);
    var anchor = findAnchor(topic);
    if(!anchor) continue;
    injectMarker(anchor, topic);
  }
}

function findAnchor(topic){
  for(var i=0;i<topic.selectors.length;i++){
    var el = document.querySelector(topic.selectors[i]);
    if(el && isVisible(el)) return el;
  }
  return null;
}

function isVisible(el){
  if(!el) return false;
  var r = el.getBoundingClientRect();
  if(r.width===0 && r.height===0) return false;
  var p = el;
  while(p && p!==document.body){
    var s = window.getComputedStyle(p);
    if(s.display==='none' || s.visibility==='hidden') return false;
    p = p.parentElement;
  }
  return true;
}

function injectMarker(anchor, topic){
  var mark = document.createElement('button');
  mark.type = 'button';
  mark.className = 'help-i';
  mark.setAttribute('data-topic', topic.id);
  mark.setAttribute('aria-label', 'Help: '+topic.title);
  mark.textContent = 'i';
  mark.addEventListener('click', function(ev){
    ev.stopPropagation();
    if(popoverTopicId===topic.id){ closePopover(); return; }
    openPopover(mark, topic);
  });

  // Prefer sitting beside the field's <label>; fall back to just before the anchor.
  var label = findLabelFor(anchor);
  if(label){ label.appendChild(mark); }
  else if(anchor.tagName==='H2' || anchor.tagName==='H3'){ anchor.appendChild(mark); }
  else { anchor.parentNode.insertBefore(mark, anchor); }
}

function findLabelFor(el){
  if(!el.id) return null;
  return document.querySelector('label[for="'+el.id+'"]');
}

// ---- Popover ----
function openPopover(mark, topic){
  closePopover();
  popoverTopicId = topic.id;
  popoverEl = document.createElement('div');
  popoverEl.className = 'help-popover';
  popoverEl.setAttribute('role', 'dialog');
  popoverEl.setAttribute('aria-label', topic.title);
  popoverEl.innerHTML =
    '<div class="help-popover-title">\u24d8 '+topic.title+'</div>'+
    '<div class="help-popover-body">'+topic.html+'</div>'+
    '<button type="button" class="help-popover-close" aria-label="Close">\u00d7</button>';
  document.body.appendChild(popoverEl);
  popoverEl.querySelector('.help-popover-close').addEventListener('click', closePopover);
  positionPopover(mark);
}

function positionPopover(mark){
  if(!popoverEl || !mark) return;
  var r = mark.getBoundingClientRect();
  var bw = popoverEl.offsetWidth, bh = popoverEl.offsetHeight;
  var vw = window.innerWidth, vh = window.innerHeight;
  var top = (r.bottom+bh+16<=vh) ? r.bottom+8 : Math.max(12, r.top-bh-8);
  var left = Math.min(Math.max(12, r.left+r.width/2-bw/2), vw-bw-12);
  popoverEl.style.top = Math.min(Math.max(12, top), vh-bh-12)+'px';
  popoverEl.style.left = left+'px';
}

function repositionPopover(){
  if(!popoverEl || !popoverTopicId) return;
  var mark = document.querySelector('.help-i[data-topic="'+popoverTopicId+'"]');
  if(mark && isVisible(mark)) positionPopover(mark);
  else closePopover();
}

function onDocumentClick(ev){
  if(!popoverEl) return;
  if(popoverEl.contains(ev.target)) return;
  if(ev.target.classList && ev.target.classList.contains('help-i')) return;
  closePopover();
}

function closePopover(){
  popoverTopicId = null;
  if(popoverEl && popoverEl.parentNode) popoverEl.parentNode.removeChild(popoverEl);
  popoverEl = null;
}
