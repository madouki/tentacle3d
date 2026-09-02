/* =========================================================================
   game.js — Spielzustand, Steuerung, Darstellung, Ablauf.
   ========================================================================= */
(function(global){
'use strict';

if(typeof THREE === 'undefined'){
  document.body.insertAdjacentHTML('afterbegin',
    '<div id="err">three.js konnte nicht geladen werden.\n' +
    'Die Bibliothek kommt vom CDN jsdelivr — bitte mit Internetverbindung öffnen.</div>');
  return;
}

var W = World, CH = W.CHARS, ITEMS = W.ITEMS;

/* ======================================================================
   1. Zustand
   ====================================================================== */
var S = null;
function newState(){
  return {
    who:'bernard', sel:null, f:{}, eggs:{}, hintStep:null, hintLevel:0,
    chars:{
      bernard:{room:'lab', x:2.4, z:1.8, inv:[]},
      hoagie: {room:'lab', x:2.4, z:1.8, inv:[]},
      laverne:{room:'lab', x:2.4, z:1.8, inv:[]}
    }
  };
}
function me(){ return S.chars[S.who]; }
function era(){ return CH[S.who].era; }
function has(who,item){ return S.chars[who].inv.indexOf(item) >= 0; }
function anyHas(item){
  return W.CHAR_IDS.some(function(id){ return has(id,item); });
}

/* ======================================================================
   2. Renderer, Kamera, Licht
   ====================================================================== */
var canvas = document.getElementById('c');
var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true});
renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
if('toneMapping' in renderer){
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
}

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(42, 16/9, 0.1, 400);
var CAM_DEFAULT = {x:0, y:8.4, z:17.2, tx:0, ty:2.6, tz:-1};
var CAM_ROOM = {
  cellar:{x:0, y:9.0,  z:15.5, tx:0, ty:1.8, tz:-1},
  attic: {x:0, y:7.6,  z:15.0, tx:0, ty:2.0, tz:-0.6}
};
var CAM = CAM_DEFAULT;
var camShake = 0;

var ambient = new THREE.AmbientLight(0xffffff, 0.34);
var hemi    = new THREE.HemisphereLight(0xffffff, 0x444455, 0.30);
var key     = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(8, 16, 11);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -20; key.shadow.camera.right = 20;
key.shadow.camera.top  =  20; key.shadow.camera.bottom = -20;
key.shadow.camera.near = 1;   key.shadow.camera.far = 60;
key.shadow.bias = -0.0016;
key.shadow.normalBias = 0.03;
var fill = new THREE.DirectionalLight(0xffffff, 0.16); fill.position.set(-9, 7, 8);
var rim  = new THREE.DirectionalLight(0xffffff, 0.24); rim.position.set(-3, 8, -12);
scene.add(ambient, hemi, key, fill, rim);

var roomGroup = new THREE.Group();
scene.add(roomGroup);

var ray = new THREE.Raycaster();
var ndc = new THREE.Vector2();

/* ======================================================================
   3. Raumaufbau
   ====================================================================== */
var hotspots = [];
var actor = null, actorShadow = null;
var walk = {active:false, tx:0, tz:0, phase:0, then:null, stepAcc:0};
var bounds = W.BOUND;

function clearGroup(g){
  for(var i=g.children.length-1; i>=0; i--){
    var c = g.children[i];
    c.traverse(function(o){
      if(o.isMesh || o.isPoints){
        if(o.geometry && !o.userData.outline) o.geometry.dispose();
        if(o.material){
          if(Array.isArray(o.material)) o.material.forEach(function(m){ m.dispose(); });
          else o.material.dispose();
        }
      }
    });
    g.remove(c);
  }
}

function registerHotspot(name, obj, wx, wz, actions){
  var rec = {name:name, obj:obj, wx:wx, wz:wz, actions:actions || {}};
  rec.primary = actions && actions.primary ? actions.primary
    : (actions && actions.door ? 'door'
    : (actions && actions.take ? 'take'
    : (actions && actions.talk ? 'talk' : 'use')));
  obj.traverse(function(o){ if(!o.userData.outline) o.userData.hs = rec; });
  roomGroup.add(obj);
  hotspots.push(rec);
  return rec;
}

function buildRoom(){
  clearGroup(roomGroup);
  hotspots = [];

  var e = era(), r = me().room, E = W.ERAS[e];

  var dim = (r === 'cellar') ? 0.45 : 1.0;          // Keller lebt von seiner Lampe
  ambient.intensity = E.ambI * 0.62 * dim;
  hemi.color.set(E.hemiSky); hemi.groundColor.set(E.hemiGnd);
  hemi.intensity = 0.30 * dim;
  key.color.set(E.key);
  key.intensity = (r === 'yard' ? E.keyI * 1.05 : E.keyI * 0.85) * (r === 'cellar' ? 0.30 : 1.0);
  fill.color.set(E.hemiSky);
  rim.color.set(e === 'future' ? 0x8ad8ff : 0xffe6c0);
  scene.fog = (r === 'yard')
    ? new THREE.Fog(new THREE.Color(E.fog).getHex(), E.fogNear, E.fogFar)
    : null;
  scene.background = new THREE.Color(r === 'yard' ? E.fog : E.wallB);

  CAM = CAM_ROOM[r] || CAM_DEFAULT;
  bounds = (r === 'attic')  ? W.ATTIC_BOUND
         : (r === 'cellar') ? W.CELLAR_BOUND
         : W.BOUND;

  W.BUILDERS[r](e, S, roomGroup, registerHotspot, API);

  actor = M.actor(CH[S.who]);
  actor.position.set(me().x, 0, me().z);
  actor.traverse(function(o){ o.userData.isActor = true; });
  roomGroup.add(actor);

  actorShadow = M.blob(0.85, 0.7);
  actorShadow.userData.isActor = true;
  roomGroup.add(actorShadow);

  walk.active = false; walk.then = null;
  hovered = null; setStatus('');
  drawInv();
  if(Snd.ready) Snd.play(e);
}

function rebuild(){
  if(actor){ me().x = actor.position.x; me().z = actor.position.z; }
  buildRoom();
}

/* ======================================================================
   4. Oberfläche
   ====================================================================== */
var elStatus = document.getElementById('status');
var elSub    = document.getElementById('subtitle');
var elInv    = document.getElementById('inv');
var elCast   = document.getElementById('cast');
var elFade   = document.getElementById('fade');
var elLog    = document.getElementById('logList');

function setStatus(txt){
  if(!S){ elStatus.className = ''; return; }
  var t = txt || '';
  if(S.sel && t) t = ITEMS[S.sel].name + '  →  ' + t;
  else if(S.sel && !t) t = ITEMS[S.sel].name + '  →  ...';
  elStatus.textContent = t;
  elStatus.className = t ? 'on' : '';
}

function drawInv(){
  elInv.innerHTML = '';
  var inv = me().inv;
  elInv.className = inv.length ? '' : 'empty';
  inv.forEach(function(id){
    var it = ITEMS[id];
    var b = document.createElement('button');
    b.className = 'slot' + (S.sel === id ? ' on' : '');
    b.textContent = it.ic;
    b.setAttribute('data-name', it.name);
    b.title = it.name;
    b.onclick = function(){
      S.sel = (S.sel === id) ? null : id;
      drawInv(); setStatus('');
    };
    b.oncontextmenu = function(ev){ ev.preventDefault(); clearSay(); say(it.desc, 'sys'); };
    elInv.appendChild(b);
  });
}

function drawCast(){
  elCast.innerHTML = '';
  W.CHAR_IDS.forEach(function(id){
    var c = CH[id];
    var b = document.createElement('button');
    b.className = 'cast-chip' + (S.who === id ? ' on' : '');
    b.textContent = c.initial;
    b.style.background = c.ui;
    b.style.color = '#1a1024';
    b.title = c.name + ' — ' + c.sub;
    b.onclick = function(){ switchTo(id); };
    elCast.appendChild(b);
  });
}

function fadeThen(fn){
  elFade.classList.add('on');
  setTimeout(function(){
    fn();
    setTimeout(function(){ elFade.classList.remove('on'); }, 40);
  }, 180);
}

function switchTo(id){
  if(!S || id === S.who) return;
  me().x = actor.position.x; me().z = actor.position.z;
  clearSay(); Voice.shutUp();
  fadeThen(function(){
    S.who = id; S.sel = null;
    buildRoom(); drawCast();
    say('[' + CH[id].name + ' — ' + W.ROOM_LABEL[me().room][era()] + ']', 'sys');
  });
}

/* ---------------------- Untertitel + Sprachausgabe ------------------- */
var sayQ = [], sayTimer = null, sayActive = false;
var subsOn = true, logLines = [];
var SPEAKER = {sys:'#cbb8e8', npc:'#ffe0a0', tent:'#e0a0ff'};

function say(text, who){
  if(!text) return;
  sayQ.push({t:String(text), w:who || (S ? S.who : 'sys')});
  if(!sayActive) nextSay();
}

function pushLog(who, text){
  var label = CH[who] ? CH[who].name : (who === 'tent' ? 'Lila Tentakel' : (who === 'npc' ? 'Jemand' : ''));
  logLines.push({w:who, l:label, t:text});
  if(logLines.length > 60) logLines.shift();
}

function nextSay(){
  if(sayTimer){ clearTimeout(sayTimer); sayTimer = null; }
  if(!sayQ.length){ elSub.innerHTML = ''; sayActive = false; return; }
  sayActive = true;
  var s = sayQ.shift();
  var color = SPEAKER[s.w] || (CH[s.w] ? CH[s.w].ui : '#ffffff');
  var label = CH[s.w] ? CH[s.w].name : (s.w === 'tent' ? 'LILA TENTAKEL' : '');
  pushLog(s.w, s.t);

  if(subsOn){
    elSub.innerHTML = (label ? '<b>' + label + '</b>' : '') +
                      s.t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    elSub.style.color = color;
  } else {
    elSub.innerHTML = '';
  }

  var fallback = Math.max(1800, Math.min(7000, s.t.length * 55));
  var spoke = Voice.speak(s.t, s.w, function(){
    if(sayTimer){ clearTimeout(sayTimer); sayTimer = null; }
    nextSay();
  });
  sayTimer = setTimeout(nextSay, spoke ? fallback + 3500 : fallback);
}

function clearSay(){
  sayQ = [];
  if(sayTimer){ clearTimeout(sayTimer); sayTimer = null; }
  sayActive = false;
  elSub.innerHTML = '';
  Voice.shutUp();
}

function skipSay(){
  if(sayActive){ Voice.shutUp(); nextSay(); return true; }
  return false;
}

/* --------------------------- Auswahl-Dialog -------------------------- */
var choiceScreen = document.getElementById('choiceScreen');
function showChoice(title, text, opts){
  document.getElementById('choiceTitle').textContent = title;
  document.getElementById('choiceText').textContent = text;
  var bx = document.getElementById('choiceBtns'); bx.innerHTML = '';
  opts.forEach(function(o){
    var b = document.createElement('button');
    b.className = 'big' + (o.alt ? ' alt' : '');
    b.innerHTML = o.label;
    b.onclick = function(){ choiceScreen.classList.add('hidden'); if(o.fn) o.fn(); };
    bx.appendChild(b);
  });
  choiceScreen.classList.remove('hidden');
}

function askFlush(item){
  var opts = W.CHAR_IDS.filter(function(id){ return id !== S.who; }).map(function(id){
    return {
      label:'An ' + CH[id].name + '<br><small style="font-weight:normal;opacity:.65">' + CH[id].sub + '</small>',
      fn:function(){ doFlush(item, id); }
    };
  });
  opts.push({label:'Abbrechen', alt:true});
  showChoice('Chron-o-John', ITEMS[item].name + ' durch die Zeit spülen — an wen?', opts);
}

function doFlush(item, target){
  API.drop(S.who, item); API.give(target, item);
  S.sel = null; drawInv(); setStatus('');
  Snd.sfx('flush');
  say('SCHWUPP. Der Chron-o-John spült den Gegenstand durch die Jahrhunderte.', 'sys');
  say('[' + ITEMS[item].name + ' ist bei ' + CH[target].name + ' angekommen.]', 'sys');
  var b = roomGroup.getObjectByName('cjBulb');
  if(b && b.material && b.material.emissive){
    b.material.emissive.set(0xffffff);
    setTimeout(function(){ if(b.material && b.material.emissive) b.material.emissive.set(0x1e9a68); }, 500);
  }
  camShake = 0.5;
}

/* ======================================================================
   5. Anspielungen
   ====================================================================== */
function eggTotal(){ return W.EGGS.length; }
function eggFound(){ return Object.keys(S.eggs).length; }

function foundEgg(id){
  if(!id || S.eggs[id]) return;
  S.eggs[id] = true;
  Snd.sfx('egg');
  setTimeout(function(){
    say('✦ Anspielung entdeckt — ' + eggFound() + ' von ' + eggTotal() + '.', 'sys');
  }, 30);
}

/* ======================================================================
   6. API für die Raumdefinitionen
   ====================================================================== */
var API = {
  say: say,
  who: function(){ return S.who; },
  sfx: function(n){ if(n === 'loom') Snd.loomTune(); else Snd.sfx(n); },
  has: has,
  egg: foundEgg,
  give: function(who, item){
    if(!has(who, item)) S.chars[who].inv.push(item);
    if(who === S.who) drawInv();
  },
  drop: function(who, item){
    var i = S.chars[who].inv.indexOf(item);
    if(i >= 0) S.chars[who].inv.splice(i, 1);
    if(who === S.who){ if(S.sel === item) S.sel = null; drawInv(); }
  },
  set: function(flag, val){
    S.f[flag] = (val === undefined) ? true : val;
    S.hintStep = null; S.hintLevel = 0;
    setTimeout(rebuild, 0);
  },
  setQuiet: function(flag, val){ S.f[flag] = (val === undefined) ? true : val; },
  rebuild: rebuild,
  rebuildSoon: function(){ setTimeout(rebuild, 0); },
  flush: askFlush,
  wear: function(){ return wearCostume(); },
  win: winGame
};

/* ======================================================================
   7. Interaktion
   ====================================================================== */
var DULL = ['Das bringt nichts.', 'Damit kann {n} nichts anfangen.',
            'Interessant. Und völlig nutzlos.', 'Nein.', 'Das führt zu gar nichts.'];
function dull(){ return DULL[(Math.random()*DULL.length)|0].replace('{n}', CH[S.who].name); }

function walkTo(x, z, then){
  walk.tx = Math.max(-bounds.x, Math.min(bounds.x, x));
  walk.tz = Math.max(bounds.zMin, Math.min(bounds.zMax, z));
  walk.active = true;
  walk.then = then || null;
}

function runAction(hs, verb){
  var item = (verb === 'use') ? S.sel : null;

  if(hs.actions.door && (verb === 'door' || verb === 'use' || verb === 'take')){
    if(item){ say(ITEMS[item].name + ' hilft an einer Tür nicht weiter.'); S.sel = null; drawInv(); return; }
    changeRoom(hs.actions.door);
    return;
  }

  var out, fn = hs.actions[verb];
  if(typeof fn === 'function'){
    out = fn.call(hs.actions, item);
  } else if(verb === 'look'){
    out = 'Ein ganz gewöhnliches Ding: ' + hs.name + '.';
  } else if(verb === 'take'){
    out = CH[S.who].name + ' kann ' + hs.name + ' nicht mitnehmen.';
  } else if(verb === 'talk'){
    out = hs.name + ' antwortet nicht. Ist ja auch kein Mensch.';
  } else {
    out = item ? (ITEMS[item].name + ' hilft hier nicht weiter.') : dull();
  }

  if(verb === 'use' && S.sel){ S.sel = null; drawInv(); }
  setStatus('');
  if(out) say(out);
}

function changeRoom(target){
  var from = me().room, e = era();
  if(!W.canEnter(target, e, S)){
    Snd.sfx('no');
    say('Da kommt hier niemand hinauf.', 'sys');
    return;
  }
  clearSay();
  Snd.sfx('door');
  fadeThen(function(){
    me().room = target;
    if(target === 'yard'){
      if(from === 'attic'){ me().x = 5.2; me().z = 3.0; }
      else { me().x = 0; me().z = -1.2; }
    } else if(target === 'kitchen'){
      me().x = (from === 'yard') ? -6.0 : 6.0; me().z = -2.2;
    } else if(target === 'lab'){
      me().x = (from === 'cellar') ? -6.4 : -6.2; me().z = (from === 'cellar') ? 2.6 : -2.2;
    } else if(target === 'cellar'){
      me().x = 5.4; me().z = 3.2;
    } else {                                   // attic
      me().x = 4.0; me().z = 2.0;
    }
    buildRoom();
    say('[' + W.ROOM_LABEL[target][e] + ']', 'sys');
  });
}

/* --------------------------- Maus ------------------------------------ */
var hovered = null;
function pick(ev){
  var r = canvas.getBoundingClientRect();
  if(!r.width || !r.height) return {hs:null, floor:null};
  ndc.x =  ((ev.clientX - r.left) / r.width ) * 2 - 1;
  ndc.y = -((ev.clientY - r.top ) / r.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  var hits = ray.intersectObjects(roomGroup.children, true);
  var hs = null, floor = null;
  for(var i=0;i<hits.length;i++){
    var o = hits[i].object;
    if(o.userData.isActor || o.userData.outline) continue;
    if(!hs && o.userData.hs) hs = o.userData.hs;
    if(!floor && o.userData.floor) floor = hits[i].point;
    if(hs && floor) break;
  }
  return {hs:hs, floor:floor};
}

canvas.addEventListener('mousemove', function(ev){
  if(!S) return;
  var p = pick(ev);
  var n = p.hs ? p.hs.name : '';
  if(n !== hovered){ hovered = n; setStatus(n); }
  canvas.style.cursor = p.hs ? 'pointer' : 'default';
});

canvas.addEventListener('contextmenu', function(ev){
  ev.preventDefault();
  if(!S) return;
  if(skipSay()) return;
  var p = pick(ev);
  if(p.hs){
    var rec = p.hs;
    walkTo(rec.wx, rec.wz, function(){ runAction(rec, 'look'); });
  }
});

canvas.addEventListener('click', function(ev){
  if(!S) return;
  Snd.resume();
  if(skipSay()) return;
  var p = pick(ev);
  if(p.hs){
    var rec = p.hs;
    var verb = S.sel ? 'use' : rec.primary;
    walkTo(rec.wx, rec.wz, function(){ runAction(rec, verb); });
  } else if(p.floor){
    walkTo(p.floor.x, p.floor.z);
    if(S.sel){ S.sel = null; drawInv(); setStatus(''); }
  }
});

document.addEventListener('keydown', function(ev){
  var k = (ev.key || '').toLowerCase();
  if(k === 'f'){ ev.preventDefault(); toggleFullscreen(); return; }
  if(!S) return;
  if(k === 'escape'){ S.sel = null; drawInv(); setStatus(''); closeLog(); }
  else if(k === 'h'){ showHint(); }
  else if(k === '1'){ switchTo('bernard'); }
  else if(k === '2'){ switchTo('hoagie'); }
  else if(k === '3'){ switchTo('laverne'); }
  else if(k === 'm'){ toggleMusic(); }
  else if(k === 'v'){ toggleVoice(); }
  else if(k === 'u'){ toggleSubs(); }
  else if(k === 'l'){ toggleLog(); }
  else if(k === ' '){ ev.preventDefault(); skipSay(); }
});

/* ======================================================================
   8. Tipps — zielbasiert statt starre Reihenfolge
   ====================================================================== */
var STEPS = [
  { id:'coal', who:'bernard',
    done:function(f){ return f.coalTaken; },
    vague:'Bernard: In der Küche liegt etwas herum, das mit genug Zeit sehr wertvoll wird.',
    exact:'Bernard: Im Kamin der Küche liegt ein Klumpen Kohle. Nimm ihn mit.' },

  { id:'coal-flush', who:'bernard',
    needs:function(f){ return has('bernard','coal'); },
    done:function(f){ return f.coalInCement || has('hoagie','coal'); },
    vague:'Bernard: Die Kohle nützt in der Gegenwart nichts. Sie muss viel weiter zurück.',
    exact:'Bernard: Kohle im Inventar auswählen, dann den Chron-o-John anklicken und zu Hoagie schicken.' },

  { id:'cement', who:'hoagie',
    needs:function(f){ return has('hoagie','coal'); },
    done:function(f){ return f.coalInCement; },
    vague:'Hoagie: Draußen wird gerade etwas gegossen, das sehr lange hält.',
    exact:'Hoagie: Die Kohle in den nassen Zement des Ecksteins im Hof drücken.' },

  { id:'acorn', who:'hoagie',
    done:function(f){ return f.acornTaken || f.treePlanted; },
    vague:'Hoagie: Unter den alten Bäumen im Hof liegt etwas, aus dem einmal viel wird.',
    exact:'Hoagie: Links im Hof von 1776 liegt eine Eichel. Aufheben.' },

  { id:'plant', who:'hoagie',
    needs:function(f){ return has('hoagie','acorn'); },
    done:function(f){ return f.treePlanted; },
    vague:'Hoagie: Die Eichel gehört in die Erde — und zwar dort, wo später jemand hochklettern will.',
    exact:'Hoagie: Die Eichel in das umgegrabene Beet neben dem Haus pflanzen.' },

  { id:'wine', who:'hoagie',
    done:function(f){ return f.wineTaken || f.wineInNiche; },
    vague:'Hoagie: In der Küche steht etwas, das mit den Jahren deutlich saurer wird.',
    exact:'Hoagie: Die Weinflasche vom Küchentisch von 1776 nehmen.' },

  { id:'niche', who:'hoagie',
    needs:function(f){ return has('hoagie','wine'); },
    done:function(f){ return f.wineInNiche; },
    vague:'Hoagie: Der Wein muss an einen Ort, an den vierhundert Jahre lang niemand geht.',
    exact:'Hoagie: Die Weinflasche in die Nische hinter dem losen Ziegel in der Küche stellen.' },

  { id:'hamster', who:'bernard',
    needs:function(f){ return f.treePlanted; },
    done:function(f){ return f.hamsterTaken || f.hamsterInWheel || anyHas('hamster'); },
    vague:'Bernard: Der Baum im Hof reicht inzwischen bis zum Dach. Da oben war lange niemand.',
    exact:'Bernard: Über die Eiche auf den Dachboden. Dort sitzt ein Hamster im Käfig.' },

  { id:'hamster-flush', who:'bernard',
    needs:function(f){ return has('bernard','hamster'); },
    done:function(f){ return f.hamsterInWheel || has('laverne','hamster'); },
    vague:'Bernard: Der Hamster wird woanders dringender gebraucht.',
    exact:'Bernard: Den Hamster über den Chron-o-John zu Laverne schicken.' },

  { id:'wheel', who:'laverne',
    needs:function(f){ return has('laverne','hamster'); },
    done:function(f){ return f.hamsterInWheel; },
    vague:'Laverne: Auf dem Dachboden fehlt einer Maschine der Antrieb.',
    exact:'Laverne: Über die Eiche aufs Dach. Den Hamster in das Laufrad des Generators setzen.' },

  { id:'costume', who:'laverne',
    needs:function(f){ return f.hamsterInWheel; },
    done:function(f){ return f.costumeTaken; },
    vague:'Laverne: Mit Strom lässt sich jetzt etwas öffnen, das vorher zu war.',
    exact:'Laverne: Die Museumsvitrine ist entriegelt. Das Tentakelkostüm herausnehmen.' },

  /* Nur nötig, solange es überhaupt noch eine Wache gibt. */
  { id:'disguise', who:'laverne',
    needs:function(f){ return has('laverne','costume') && !f.valveClosed; },
    done:function(f){ return f.disguised || f.valveClosed; },
    vague:'Laverne: Die Wache lässt keinen Menschen an den Eckstein. Ein Tentakel schon.',
    exact:'Laverne: Das Kostüm auswählen und damit das Wach-Tentakel im Hof anklicken.' },

  { id:'vinegar', who:'laverne',
    needs:function(f){ return f.wineInNiche; },
    done:function(f){ return f.vinegarTaken || anyHas('vinegar') || f.diamondTaken; },
    vague:'Laverne: In der Kantine wartet seit vierhundert Jahren etwas in der Wand.',
    exact:'Laverne: Den losen Ziegel in der Kantine öffnen und die alte Flasche nehmen.' },

  { id:'cornerstone', who:'laverne',
    needs:function(f){ return has('laverne','vinegar') && f.coalInCement && (f.disguised || f.valveClosed); },
    done:function(f){ return f.diamondTaken; },
    vague:'Laverne: Der Eckstein gibt seinen Inhalt nicht freiwillig her. Säure schon eher.',
    exact:'Laverne: Den uralten Essig auf den Eckstein im Hof kippen.' },

  { id:'diamond-flush', who:'laverne',
    needs:function(f){ return has('laverne','diamond'); },
    done:function(f){ return f.diamondInstalled || has('bernard','diamond'); },
    vague:'Laverne: Der Diamant nützt in der Zukunft niemandem.',
    exact:'Laverne: Den Diamanten über den Chron-o-John zu Bernard schicken.' },

  { id:'install', who:'bernard',
    needs:function(f){ return has('bernard','diamond'); },
    done:function(f){ return f.diamondInstalled; },
    vague:'Bernard: Der Antrieb der Zeitmaschine wartet noch auf seinen Kristall.',
    exact:'Bernard: Den Diamanten in die Energiekonsole im Labor einsetzen.' },

  { id:'wrench', who:'hoagie',
    done:function(f){ return f.wrenchTaken || anyHas('wrench') || f.valveClosed; },
    vague:'Hoagie: In der Werkstatt liegt schweres Werkzeug herum.',
    exact:'Hoagie: Den Schraubenschlüssel von der Werkbank in der Werkstatt nehmen.' },

  { id:'wrench-flush', who:'hoagie',
    needs:function(f){ return has('hoagie','wrench'); },
    done:function(f){ return f.valveClosed || has('bernard','wrench'); },
    vague:'Hoagie: Das Werkzeug wird zweihundert Jahre später gebraucht.',
    exact:'Hoagie: Den Schraubenschlüssel über den Chron-o-John zu Bernard schicken.' },

  { id:'valve', who:'bernard',
    needs:function(f){ return has('bernard','wrench'); },
    done:function(f){ return f.valveClosed; },
    vague:'Bernard: Solange Schlamm in den Fluss läuft, bleibt die Zukunft lila.',
    exact:'Bernard: Mit dem Schraubenschlüssel das verrostete Ventil am Sludge-o-Matic zudrehen.' },

  { id:'finale', who:'bernard',
    needs:function(f){ return f.diamondInstalled && f.valveClosed; },
    done:function(f){ return false; },
    vague:'Alles ist vorbereitet. Zeit, nach Hause zu fahren.',
    exact:'Bernard: Ins Labor gehen und den Chron-o-John benutzen — ohne etwas ausgewählt zu haben.' }
];

function openSteps(){
  return STEPS.filter(function(st){
    if(st.done(S.f)) return false;
    if(st.needs && !st.needs(S.f)) return false;
    return true;
  });
}

function showHint(){
  clearSay();
  var open = openSteps();

  if(!open.length){
    say('Gerade ist nichts offen, was ich empfehlen könnte. Sieh dich um — oder wechsle die Figur.', 'sys');
    return;
  }

  // Schritte der aktuellen Figur haben Vorrang
  var mine = open.filter(function(st){ return st.who === S.who; });
  var step = mine.length ? mine[0] : open[0];

  // Zweimal drücken = konkreter Hinweis
  if(S.hintStep === step.id){ S.hintLevel = Math.min(1, S.hintLevel + 1); }
  else { S.hintStep = step.id; S.hintLevel = 0; }

  if(step.who !== S.who && !mine.length)
    say('Für ' + CH[S.who].name + ' ist hier gerade nichts zu tun. Wechsle zu ' +
        CH[step.who].name + ' (' + CH[step.who].sub + ').', 'sys');

  say(S.hintLevel === 0 ? step.vague : step.exact, 'sys');
  if(S.hintLevel === 0)
    say('(Nochmal auf Tipp drücken, wenn es deutlicher sein soll.)', 'sys');
}

/* ======================================================================
   9. Kostüm
   ====================================================================== */
function wearCostume(){
  if(S.who !== 'laverne' || !has('laverne','costume')) return false;
  if(S.f.disguised) return false;
  S.f.disguised = true;
  S.hintStep = null; S.hintLevel = 0;
  Snd.sfx('solve');
  say('Laverne zwängt sich in das Tentakelkostüm.');
  say('"Kratzt wie Stahlwolle. Aber ich sehe aus wie eine sehr überzeugte Verwaltungsangestellte."','laverne');
  say('Das Wach-Tentakel mustert sie kurz und nickt kollegial.','sys');
  setTimeout(rebuild, 0);
  return true;
}

/* ======================================================================
   10. Ende
   ====================================================================== */
function winGame(){
  Snd.sfx('win');
  var eggs = eggFound(), total = eggTotal();
  var eggLine = eggs >= total
    ? '<b>Alle ' + total + ' Anspielungen gefunden.</b> Respekt — du hast in jede Ecke geschaut.'
    : 'Gefundene Anspielungen: <b>' + eggs + ' von ' + total + '</b>. Da liegt noch was herum.';

  document.getElementById('endTitle').textContent = 'GESCHAFFT!';
  document.getElementById('endText').innerHTML =
    'Der Sludge-o-Matic steht still. Kein Tropfen Giftschlamm erreicht je den Fluss — und ein ' +
    'gewisses lila Tentakel trinkt an diesem Nachmittag einfach nur Wasser.<br><br>' +
    'Der Diamant aus dem Eckstein treibt den Chron-o-John mit voller Kraft an. Drei Kabinen ' +
    'surren, blitzen — und Bernard, Hoagie und Laverne stehen wieder gemeinsam in Dr. Freds ' +
    'Keller. Über ihnen rauscht eine vierhundert Jahre alte Eiche, in deren Krone ein Hamster ' +
    'wohnt, der noch nicht weiß, dass er die Weltgeschichte gerettet hat.<br><br>' +
    '<i>"Und? Wie war die Zukunft?"</i> fragt Dr. Fred.<br>' +
    '<i>"Langweilig"</i>, sagt Laverne. <i>"Zum Glück."</i><br><br>' +
    eggLine + '<br><br>' +
    '<b>ENDE</b> — ein Fanspiel im Geiste von <i>Day of the Tentacle</i>.';
  document.getElementById('endScreen').classList.remove('hidden');
}

/* ======================================================================
   11. Schalter: Ton, Untertitel, Protokoll, Vollbild
   ====================================================================== */
var btnMusic = document.getElementById('btnMusic');
var btnVoice = document.getElementById('btnVoice');
var btnSubs  = document.getElementById('btnSubs');
var logScreen = document.getElementById('logScreen');

function toggleMusic(){
  Snd.init(); Snd.resume();
  var on = Snd.toggle();
  btnMusic.classList.toggle('off', !on);
  if(on) Snd.play(S ? era() : 'title');
}
function toggleVoice(){
  var on = Voice.toggle();
  btnVoice.classList.toggle('off', !on);
  if(!on && sayActive){
    if(sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(nextSay, 2200);
  }
}
function toggleSubs(){
  subsOn = !subsOn;
  btnSubs.classList.toggle('off', !subsOn);
  if(!subsOn) elSub.innerHTML = '';
  say(subsOn ? 'Untertitel an.' : '', 'sys');
}

function openLog(){
  elLog.innerHTML = '';
  if(!logLines.length){
    elLog.innerHTML = '<p style="opacity:.6">Noch nichts gesagt.</p>';
  } else {
    logLines.slice().reverse().forEach(function(l){
      var d = document.createElement('div');
      d.className = 'logline';
      var c = SPEAKER[l.w] || (CH[l.w] ? CH[l.w].ui : '#ffffff');
      d.innerHTML = (l.l ? '<span style="color:' + c + '">' + l.l + ':</span> ' : '') +
                    l.t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
      elLog.appendChild(d);
    });
  }
  logScreen.classList.remove('hidden');
}
function closeLog(){ logScreen.classList.add('hidden'); }
function toggleLog(){ logScreen.classList.contains('hidden') ? openLog() : closeLog(); }

function isFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}
function goFullscreen(){
  var el = document.documentElement;
  var fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if(fn){ try{ var r = fn.call(el); if(r && r.catch) r.catch(function(){}); }catch(e){} }
}
function leaveFullscreen(){
  var fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if(fn){ try{ var r = fn.call(document); if(r && r.catch) r.catch(function(){}); }catch(e){} }
}
function toggleFullscreen(){ isFullscreen() ? leaveFullscreen() : goFullscreen(); }

btnMusic.onclick = toggleMusic;
btnVoice.onclick = toggleVoice;
btnSubs.onclick  = toggleSubs;
document.getElementById('btnLog').onclick  = toggleLog;
document.getElementById('btnFull').onclick = toggleFullscreen;
document.getElementById('btnHint').onclick = showHint;
document.getElementById('btnHelp').onclick = function(){
  document.getElementById('titleScreen').classList.remove('hidden');
};
document.getElementById('btnCloseLog').onclick = closeLog;

/* ======================================================================
   12. Animationsschleife
   ====================================================================== */
var clock = new THREE.Clock();
function resize(){
  var w = Math.max(1, canvas.clientWidth  || global.innerWidth);
  var h = Math.max(1, canvas.clientHeight || global.innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
global.addEventListener('resize', resize);

/* Manche Umgebungen ändern die Größe ohne resize-Ereignis. */
function autoResize(){
  var w = canvas.clientWidth, h = canvas.clientHeight;
  if(!w || !h) return;
  var pr = renderer.getPixelRatio();
  if(canvas.width !== Math.floor(w*pr) || canvas.height !== Math.floor(h*pr)) resize();
}

var blinkTimer = 0, blinkPhase = 0;

function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  var t  = clock.elapsedTime;
  autoResize();

  /* --- Figur --- */
  if(actor && S){
    if(walk.active){
      var dx = walk.tx - actor.position.x, dz = walk.tz - actor.position.z;
      var dist = Math.sqrt(dx*dx + dz*dz);
      if(dist < 0.12){
        actor.position.x = walk.tx; actor.position.z = walk.tz;
        walk.active = false;
        me().x = walk.tx; me().z = walk.tz;
        var cb = walk.then; walk.then = null;
        if(cb) cb();
      } else {
        var step = Math.min(5.6*dt, dist);
        actor.position.x += dx/dist*step;
        actor.position.z += dz/dist*step;
        var want = Math.atan2(dx, dz);
        var d = ((want - actor.rotation.y + Math.PI*3) % (Math.PI*2)) - Math.PI;
        actor.rotation.y += d * Math.min(1, dt*10);
        walk.phase += dt*10;
        walk.stepAcc += dt;
        if(walk.stepAcc > 0.31){ walk.stepAcc = 0; Snd.sfx('step'); }
      }
    } else {
      walk.phase += dt*1.5;
      var d2 = ((0 - actor.rotation.y + Math.PI*3) % (Math.PI*2)) - Math.PI;
      actor.rotation.y += d2 * Math.min(1, dt*4);
    }

    var p = actor.userData.parts;
    if(p){
      if(walk.active){
        var s = Math.sin(walk.phase);
        p.legL.rotation.x =  s*0.72; p.legR.rotation.x = -s*0.72;
        p.armL.rotation.x = -s*0.58; p.armR.rotation.x =  s*0.58;
        p.head.rotation.z = 0;
        p.torso.rotation.z = Math.sin(walk.phase*2)*0.02;
        actor.position.y = Math.abs(Math.sin(walk.phase))*0.065;
      } else {
        p.legL.rotation.x *= 0.85; p.legR.rotation.x *= 0.85;
        p.armL.rotation.x *= 0.85; p.armR.rotation.x *= 0.85;
        p.head.rotation.z = Math.sin(walk.phase*0.7)*0.045;
        p.torso.rotation.z = 0;
        actor.position.y = (Math.sin(walk.phase)*0.5+0.5)*0.04;
      }
      /* Blinzeln */
      blinkTimer -= dt;
      if(blinkTimer <= 0){ blinkPhase = 0.16; blinkTimer = 2.4 + Math.random()*4.0; }
      if(blinkPhase > 0){
        blinkPhase -= dt;
        p.lidL.scale.y = p.lidR.scale.y = 1;
      } else {
        p.lidL.scale.y = p.lidR.scale.y = 0.02;
      }
    }

    if(actorShadow){
      actorShadow.position.set(actor.position.x, 0.035, actor.position.z);
      var sc = walk.active ? 1.0 : 1.05;
      actorShadow.scale.set(sc, sc, sc);
    }
  }

  /* --- Umgebungsdetails --- */
  var o;
  if((o = roomGroup.getObjectByName('diamondGlint'))){
    o.rotation.y = t*2.2;
    if(o.material.emissive) o.material.emissive.setScalar(0.35 + Math.sin(t*4)*0.28);
  }
  if((o = roomGroup.getObjectByName('powerGem'))) o.rotation.y = t*1.6;
  if((o = roomGroup.getObjectByName('sludgeStream'))){
    o.scale.x = 1 + Math.sin(t*6)*0.09; o.scale.z = 1 + Math.cos(t*5)*0.09;
  }
  if((o = roomGroup.getObjectByName('sludgePool'))) o.scale.y = 1 + Math.sin(t*3)*0.14;
  if((o = roomGroup.getObjectByName('river'))){
    o.position.y = 0.07 + Math.sin(t*1.4)*0.025;
    o.scale.z = 1 + Math.sin(t*0.9)*0.02;
  }
  if((o = roomGroup.getObjectByName('fire'))){
    o.scale.y = 1 + Math.sin(t*11)*0.22 + Math.sin(t*7.3)*0.12;
    o.scale.x = 1 + Math.cos(t*9)*0.10;
  }
  if((o = roomGroup.getObjectByName('fireLight'))) o.intensity = 1.35 + Math.sin(t*13)*0.35;
  if((o = roomGroup.getObjectByName('cellarLamp'))) o.intensity = 1.45 + Math.sin(t*2.3)*0.12;
  if((o = roomGroup.getObjectByName('towerOrb'))) o.scale.setScalar(1 + Math.sin(t*1.6)*0.07);
  if((o = roomGroup.getObjectByName('purpleTent'))){
    o.rotation.z = Math.sin(t*1.3)*0.05;
    o.position.y = 0.70 + Math.abs(Math.sin(t*1.3))*0.06;
  }
  if((o = roomGroup.getObjectByName('guardTent'))) o.rotation.z = Math.sin(t*0.9)*0.035;
  if((o = roomGroup.getObjectByName('hamster'))) o.position.x = Math.sin(t*3)*0.28;
  if((o = roomGroup.getObjectByName('hamsterWheel'))) o.rotation.z -= dt*7;
  if((o = roomGroup.getObjectByName('hamsterRun'))) o.rotation.z = Math.sin(t*14)*0.25;
  if((o = roomGroup.getObjectByName('loomSpin'))) o.rotation.z += dt*0.35;
  if((o = roomGroup.getObjectByName('meteorBody'))){
    if(o.material.emissive) o.material.emissive.setRGB(0.30+Math.sin(t*1.7)*0.12, 0.05, 0.02);
  }
  if((o = roomGroup.getObjectByName('threeHeaded'))) o.rotation.y = Math.sin(t*0.8)*0.25;
  for(var mi=0; mi<6; mi++){
    if((o = roomGroup.getObjectByName('monitor'+mi)) && o.material.emissive){
      var v = 0.5 + Math.sin(t*3 + mi*1.7)*0.3;
      o.material.emissive.setRGB(0.05*v, 0.55*v, 0.35*v);
    }
  }
  if((o = roomGroup.getObjectByName('dust'))) o.rotation.y = t*0.03;

  /* Wolken ziehen, Vögel kreisen */
  if((o = roomGroup.getObjectByName('clouds'))){
    for(var ci=0; ci<o.children.length; ci++){
      var cl = o.children[ci];
      cl.position.x += cl.userData.drift * dt;
      if(cl.position.x > 46) cl.position.x = -46;
    }
  }
  if((o = roomGroup.getObjectByName('birds'))){
    for(var bi=0; bi<o.children.length; bi++){
      var bd = o.children[bi], u = bd.userData;
      u.t += dt * u.sp;
      bd.position.set(Math.cos(u.t)*u.r, u.h + Math.sin(u.t*1.7)*1.2, Math.sin(u.t)*u.r - 12);
      bd.rotation.y = -u.t;
      var flap = Math.sin(t*9 + bi) * 0.6;
      u.wings[0].rotation.z =  flap;
      u.wings[1].rotation.z = -flap;
    }
  }

  /* --- Kamera: leichtes Atmen und Erschütterung --- */
  var shake = camShake > 0 ? camShake : 0;
  if(camShake > 0) camShake = Math.max(0, camShake - dt*1.4);
  camera.position.set(
    CAM.x + Math.sin(t*0.31)*0.18 + (Math.random()-0.5)*shake*0.5,
    CAM.y + Math.sin(t*0.23)*0.10 + (Math.random()-0.5)*shake*0.5,
    CAM.z
  );
  camera.lookAt(CAM.tx, CAM.ty, CAM.tz);

  renderer.render(scene, camera);
}

/* ======================================================================
   13. Start
   ====================================================================== */
function startGame(){
  S = newState();
  clearSay();
  logLines = [];
  drawCast();
  buildRoom();
  resize();
  Snd.init(); Snd.resume(); Snd.play(era());
  say('Der Chron-o-John ist explodiert. Bernard steckt in der Gegenwart fest.', 'sys');
  say('"Hoagie? Laverne? Hört ihr mich? … Natürlich nicht. Ihr seid zweihundert Jahre weit weg."', 'bernard');
  say('Oben links wechselst du die Figur, unten liegt dein Inventar. H gibt einen Tipp.', 'sys');
}

document.getElementById('btnStart').onclick = function(){
  document.getElementById('titleScreen').classList.add('hidden');
  goFullscreen();
  Snd.init(); Snd.resume();
  Voice.init();
  if(!S) startGame(); else Snd.play(era());
};
document.getElementById('btnRestart').onclick = function(){
  document.getElementById('endScreen').classList.add('hidden');
  Snd.stopMusic();
  startGame();
};

/* Titelmusik, sobald der Ton freigeschaltet werden darf */
function primeTitleMusic(){
  if(Snd.init()){ Snd.resume(); if(!S) Snd.play('title'); }
  document.removeEventListener('pointerdown', primeTitleMusic);
  document.removeEventListener('keydown', primeTitleMusic);
}
document.addEventListener('pointerdown', primeTitleMusic);
document.addEventListener('keydown', primeTitleMusic);

/* ---------------------- Debug-API für die Konsole -------------------- */
global.DOTT = {
  help:function(){ return ['DOTT.state()','DOTT.spots()','DOTT.act(name,verb)','DOTT.sel(item)',
                           'DOTT.give(item)','DOTT.who(id)','DOTT.go(room)','DOTT.flag(k,v)',
                           'DOTT.hint()','DOTT.eggs()']; },
  state:function(){ return {who:S.who, room:me().room, era:era(), flags:S.f, eggs:S.eggs,
    inv:{bernard:S.chars.bernard.inv.slice(), hoagie:S.chars.hoagie.inv.slice(),
         laverne:S.chars.laverne.inv.slice()}}; },
  spots:function(){ return hotspots.map(function(h){ return h.name; }); },
  act:function(name, verb){
    var h = hotspots.filter(function(x){ return x.name.indexOf(name) >= 0; })[0];
    if(!h) return 'Hotspot nicht gefunden: ' + name;
    actor.position.set(h.wx, 0, h.wz); me().x = h.wx; me().z = h.wz;
    walk.active = false; walk.then = null;
    runAction(h, verb || h.primary);
    return 'ok';
  },
  sel:function(item){ S.sel = item || null; drawInv(); return S.sel; },
  give:function(item){ API.give(S.who, item); return S.chars[S.who].inv.slice(); },
  wear:wearCostume,
  who:function(id){
    if(!id || id === S.who) return S.who;
    me().x = actor.position.x; me().z = actor.position.z;
    S.who = id; S.sel = null; clearSay(); buildRoom(); drawCast();
    return S.who;
  },
  go:function(room){
    var from = me().room, e = era();
    if(!W.canEnter(room, e, S)) return 'nicht erreichbar: ' + room;
    me().room = room;
    if(room === 'yard'){ me().x = 0; me().z = -1.2; }
    else if(room === 'kitchen'){ me().x = (from === 'yard') ? -6.0 : 6.0; me().z = -2.2; }
    else if(room === 'lab'){ me().x = -6.2; me().z = -2.2; }
    else if(room === 'cellar'){ me().x = 5.4; me().z = 3.2; }
    else { me().x = 4.0; me().z = 2.0; }
    clearSay(); buildRoom();
    return me().room;
  },
  flag:function(k,v){ S.f[k] = (v === undefined) ? true : v; buildRoom(); return S.f; },
  hint:function(){ showHint(); return openSteps().map(function(s){ return s.id; }); },
  eggs:function(){ return {found:eggFound(), total:eggTotal(), list:Object.keys(S.eggs)}; }
};

document.getElementById('boot').classList.add('hidden');
resize();
animate();

})(window);
