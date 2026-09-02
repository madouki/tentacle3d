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
    who:'bernard', sel:null, f:{},
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
var CAM_BASE = {x:0, y:8.4, z:17.2, tx:0, ty:2.6, tz:-1};
var camShake = 0;

var ambient = new THREE.AmbientLight(0xffffff, 0.34);
var hemi    = new THREE.HemisphereLight(0xffffff, 0x444455, 0.30);
var key     = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(8, 16, 11);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -18; key.shadow.camera.right = 18;
key.shadow.camera.top  =  18; key.shadow.camera.bottom = -18;
key.shadow.camera.near = 1;   key.shadow.camera.far = 56;
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
var actor = null;
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

  ambient.intensity = E.ambI * 0.62;
  hemi.color.set(E.hemiSky); hemi.groundColor.set(E.hemiGnd);
  key.color.set(E.key);
  key.intensity = (r === 'yard' ? E.keyI * 1.05 : E.keyI * 0.85);
  fill.color.set(E.hemiSky);
  rim.color.set(e === 'future' ? 0x8ad8ff : 0xffe6c0);
  scene.fog = (r === 'yard')
    ? new THREE.Fog(new THREE.Color(E.fog).getHex(), E.fogNear, E.fogFar)
    : null;
  scene.background = new THREE.Color(r === 'yard' ? E.fog : E.wallB);

  bounds = (r === 'attic') ? W.ATTIC_BOUND : W.BOUND;

  W.BUILDERS[r](e, S, roomGroup, registerHotspot, API);

  actor = M.actor(CH[S.who]);
  actor.position.set(me().x, 0, me().z);
  actor.traverse(function(o){ o.userData.isActor = true; });
  roomGroup.add(actor);

  walk.active = false; walk.then = null;
  hovered = null; setStatus('');
  drawInv();
  if(Snd.ready) Snd.playEra(e);
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

function switchTo(id){
  if(!S || id === S.who) return;
  me().x = actor.position.x; me().z = actor.position.z;
  S.who = id; S.sel = null;
  clearSay(); Voice.shutUp();
  buildRoom(); drawCast();
  say('[' + CH[id].name + ' — ' + W.ROOM_LABEL[me().room][era()] + ']', 'sys');
}

/* ---------------------- Untertitel + Sprachausgabe ------------------- */
var sayQ = [], sayTimer = null, sayActive = false;
var SPEAKER = {sys:'#cbb8e8', npc:'#ffe0a0', tent:'#e0a0ff'};

function say(text, who){
  if(!text) return;
  sayQ.push({t:String(text), w:who || (S ? S.who : 'sys')});
  if(!sayActive) nextSay();
}

function nextSay(){
  if(sayTimer){ clearTimeout(sayTimer); sayTimer = null; }
  if(!sayQ.length){ elSub.innerHTML = ''; sayActive = false; return; }
  sayActive = true;
  var s = sayQ.shift();
  var color = SPEAKER[s.w] || (CH[s.w] ? CH[s.w].ui : '#ffffff');
  var label = CH[s.w] ? CH[s.w].name : (s.w === 'tent' ? 'LILA TENTAKEL' : '');
  elSub.innerHTML = (label ? '<b>' + label + '</b>' : '') +
                    s.t.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  elSub.style.color = color;

  var fallback = Math.max(1800, Math.min(7000, s.t.length * 55));
  var spoke = Voice.speak(s.t, s.w, function(){
    if(sayTimer){ clearTimeout(sayTimer); sayTimer = null; }
    nextSay();
  });
  // Auch wenn gesprochen wird: Sicherheitsnetz, falls onend nie feuert.
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
   5. API für die Raumdefinitionen
   ====================================================================== */
var API = {
  say: say,
  sfx: function(n){ Snd.sfx(n); },
  has: has,
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
    setTimeout(rebuild, 0);
  },
  rebuild: rebuild,
  flush: askFlush,
  wear: function(){ return wearCostume(); },
  win: winGame
};

/* ======================================================================
   6. Interaktion
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
  me().room = target;
  if(target === 'yard'){
    if(from === 'attic'){ me().x = 5.2; me().z = 3.0; }
    else { me().x = 0; me().z = -1.2; }
  } else if(target === 'kitchen'){
    me().x = (from === 'yard') ? -6.0 : 6.0; me().z = -2.2;
  } else if(target === 'lab'){
    me().x = -6.2; me().z = -2.2;
  } else {                                   // attic
    me().x = 4.0; me().z = 2.0;
  }
  clearSay();
  Snd.sfx('door');
  buildRoom();
  say('[' + W.ROOM_LABEL[target][e] + ']', 'sys');
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
  canvas.style.cursor = p.hs ? 'pointer' : (p.floor ? 'default' : 'default');
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
  if(!S) return;
  var k = (ev.key || '').toLowerCase();
  if(k === 'escape'){ S.sel = null; drawInv(); setStatus(''); }
  else if(k === 'h'){ showHint(); }
  else if(k === '1'){ switchTo('bernard'); }
  else if(k === '2'){ switchTo('hoagie'); }
  else if(k === '3'){ switchTo('laverne'); }
  else if(k === 'm'){ toggleMusic(); }
  else if(k === 'v'){ toggleVoice(); }
  else if(k === ' '){ ev.preventDefault(); skipSay(); }
});

/* ======================================================================
   7. Tipps
   ====================================================================== */
function hintText(){
  var f = S.f;
  if(!f.coalTaken)
    return 'Bernard (Gegenwart): Im Kamin der Küche liegt etwas sehr Schwarzes.';
  if(!has('hoagie','coal') && !f.coalInCement)
    return 'Bernard: Kohle auswählen, dann den Chron-o-John im Labor anklicken — und zu Hoagie ins Jahr 1776 spülen.';
  if(!f.coalInCement)
    return 'Hoagie (1776): Draußen wird gerade der Eckstein gegossen. Der Zement ist noch weich …';
  if(!f.acornTaken && !f.treePlanted)
    return 'Hoagie: Unter dem alten Baum links im Hof liegt eine Eichel.';
  if(!f.treePlanted)
    return 'Hoagie: Neben dem Haus ist ein frisch umgegrabenes Beet. Da gehört die Eichel hinein.';
  if(!f.wineTaken && !f.wineInNiche)
    return 'Hoagie: Auf dem Küchentisch von 1776 steht eine Weinflasche.';
  if(!f.wineInNiche)
    return 'Hoagie: In der Küchenwand sitzt ein loser Ziegel mit einer Nische. Wein hinein — und zweihundert Jahre warten.';
  if(!f.hamsterTaken && !has('laverne','hamster') && !f.hamsterInWheel)
    return 'Bernard: Der Baum im Hof reicht jetzt bis zur Dachluke. Auf dem Dachboden sitzt ein Hamster im Käfig.';
  if(!has('laverne','hamster') && !f.hamsterInWheel)
    return 'Bernard: Den Hamster durch den Chron-o-John zu Laverne schicken.';
  if(!f.hamsterInWheel)
    return 'Laverne (2200): Über den Baum aufs Dach. Dort steht ein Generator mit leerem Laufrad.';
  if(!f.costumeTaken)
    return 'Laverne: Die Vitrine auf dem Dachboden ist jetzt entriegelt. Darin hängt ein Tentakelkostüm.';
  if(!f.disguised)
    return 'Laverne: Das Kostüm im Inventar auswählen und damit das Wach-Tentakel im Hof anklicken.';
  if(!f.vinegarTaken)
    return 'Laverne: Der lose Ziegel in der Kantine. Schau nach, was aus dem Wein geworden ist.';
  if(!f.diamondTaken)
    return 'Laverne: Den uralten Essig auf den Eckstein im Hof kippen. Säure frisst Beton.';
  if(!has('bernard','diamond') && !f.diamondInstalled)
    return 'Laverne: Den Diamanten durch den Chron-o-John zu Bernard schicken.';
  if(!f.diamondInstalled)
    return 'Bernard: Den Diamanten in die Energiekonsole im Labor setzen.';
  if(!f.wrenchTaken && !has('bernard','wrench'))
    return 'Hoagie: In der Werkstatt von 1776 liegt ein schwerer Schraubenschlüssel auf der Werkbank.';
  if(!has('bernard','wrench') && !f.valveClosed)
    return 'Hoagie: Den Schraubenschlüssel durch den Chron-o-John zu Bernard spülen.';
  if(!f.valveClosed)
    return 'Bernard: Den Schraubenschlüssel am verrosteten Ventil des Sludge-o-Matic ansetzen.';
  return 'Alles erledigt! Mit Bernard ins Labor und den Chron-o-John benutzen.';
}
function showHint(){ clearSay(); say(hintText(), 'sys'); }

/* ======================================================================
   8. Kostüm anziehen (Inventar-Sonderfall)
   ====================================================================== */
function wearCostume(){
  if(S.who !== 'laverne' || !has('laverne','costume')) return false;
  if(S.f.disguised) return false;
  S.f.disguised = true;
  Snd.sfx('solve');
  say('Laverne zwängt sich in das Tentakelkostüm.');
  say('"Kratzt wie Stahlwolle. Aber ich sehe aus wie eine sehr überzeugte Verwaltungsangestellte."','laverne');
  say('Das Wach-Tentakel mustert sie kurz und nickt kollegial.','sys');
  setTimeout(rebuild, 0);
  return true;
}

/* ======================================================================
   9. Ende
   ====================================================================== */
function winGame(){
  Snd.sfx('win');
  document.getElementById('endTitle').textContent = 'GESCHAFFT!';
  document.getElementById('endText').innerHTML =
    'Der Sludge-o-Matic steht still. Kein Tropfen Giftschlamm erreicht je den Fluss — und ein ' +
    'gewisses lila Tentakel trinkt an diesem Nachmittag einfach nur Wasser.<br><br>' +
    'Der Diamant aus dem Eckstein treibt den Chron-o-John mit voller Kraft an. Drei Kabinen ' +
    'surren, blitzen — und Bernard, Hoagie und Laverne stehen wieder gemeinsam in Dr. Freds Keller. ' +
    'Über ihnen rauscht eine vierhundert Jahre alte Eiche, in deren Krone ein Hamster wohnt, ' +
    'der noch nicht weiß, dass er die Weltgeschichte gerettet hat.<br><br>' +
    '<i>"Und? Wie war die Zukunft?"</i> fragt Dr. Fred.<br>' +
    '<i>"Langweilig"</i>, sagt Laverne. <i>"Zum Glück."</i><br><br>' +
    '<b>ENDE</b> — ein Fanspiel im Geiste von <i>Day of the Tentacle</i>.';
  document.getElementById('endScreen').classList.remove('hidden');
}

/* ======================================================================
   10. Ton-Schalter
   ====================================================================== */
var btnMusic = document.getElementById('btnMusic');
var btnVoice = document.getElementById('btnVoice');
function toggleMusic(){
  Snd.init(); Snd.resume();
  var on = Snd.toggle();
  btnMusic.classList.toggle('off', !on);
  if(on && S) Snd.playEra(era());
}
function toggleVoice(){
  var on = Voice.toggle();
  btnVoice.classList.toggle('off', !on);
  if(!on && sayActive){                   // ohne Stimme wieder auf Timer umstellen
    if(sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(nextSay, 2200);
  }
}
btnMusic.onclick = toggleMusic;
btnVoice.onclick = toggleVoice;
document.getElementById('btnHint').onclick = showHint;
document.getElementById('btnHelp').onclick = function(){
  document.getElementById('titleScreen').classList.remove('hidden');
};

/* ======================================================================
   11. Animationsschleife
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
  if(canvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
     canvas.height !== Math.floor(h * renderer.getPixelRatio())) resize();
}

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
  if((o = roomGroup.getObjectByName('fire'))){
    o.scale.y = 1 + Math.sin(t*11)*0.22 + Math.sin(t*7.3)*0.12;
    o.scale.x = 1 + Math.cos(t*9)*0.10;
  }
  if((o = roomGroup.getObjectByName('fireLight'))) o.intensity = 1.35 + Math.sin(t*13)*0.35;
  if((o = roomGroup.getObjectByName('towerOrb'))){
    o.scale.setScalar(1 + Math.sin(t*1.6)*0.07);
  }
  if((o = roomGroup.getObjectByName('crown'))) o.rotation.y = Math.sin(t*0.4)*0.05;
  if((o = roomGroup.getObjectByName('purpleTent'))){
    o.rotation.z = Math.sin(t*1.3)*0.05;
    o.position.y = 0.70 + Math.abs(Math.sin(t*1.3))*0.06;
  }
  if((o = roomGroup.getObjectByName('guardTent'))) o.rotation.z = Math.sin(t*0.9)*0.035;
  if((o = roomGroup.getObjectByName('hamster'))) o.position.x = Math.sin(t*3)*0.28;
  if((o = roomGroup.getObjectByName('hamsterWheel'))) o.rotation.z -= dt*7;
  if((o = roomGroup.getObjectByName('hamsterRun'))) o.rotation.z = Math.sin(t*14)*0.25;
  for(var mi=0; mi<6; mi++){
    if((o = roomGroup.getObjectByName('monitor'+mi)) && o.material.emissive){
      var v = 0.5 + Math.sin(t*3 + mi*1.7)*0.3;
      o.material.emissive.setRGB(0.05*v, 0.55*v, 0.35*v);
    }
  }
  if((o = roomGroup.getObjectByName('dust'))) o.rotation.y = t*0.03;

  /* --- Kamera: leichtes Atmen + Erschütterung --- */
  var shake = camShake > 0 ? camShake : 0;
  if(camShake > 0) camShake = Math.max(0, camShake - dt*1.4);
  camera.position.set(
    CAM_BASE.x + Math.sin(t*0.31)*0.18 + (Math.random()-0.5)*shake*0.5,
    CAM_BASE.y + Math.sin(t*0.23)*0.10 + (Math.random()-0.5)*shake*0.5,
    CAM_BASE.z
  );
  camera.lookAt(CAM_BASE.tx, CAM_BASE.ty, CAM_BASE.tz);

  renderer.render(scene, camera);
}

/* ======================================================================
   12. Start
   ====================================================================== */
function startGame(){
  S = newState();
  clearSay();
  drawCast();
  buildRoom();
  resize();
  Snd.init(); Snd.resume(); Snd.playEra(era());
  say('Der Chron-o-John ist explodiert. Bernard steckt in der Gegenwart fest.', 'sys');
  say('"Hoagie? Laverne? Hört ihr mich? … Natürlich nicht. Ihr seid zweihundert Jahre weit weg."', 'bernard');
  say('Oben links wechselst du die Figur, unten liegt dein Inventar. H gibt einen Tipp.', 'sys');
}

document.getElementById('btnStart').onclick = function(){
  document.getElementById('titleScreen').classList.add('hidden');
  Snd.init(); Snd.resume();
  Voice.init();
  if(!S) startGame(); else Snd.playEra(era());
};
document.getElementById('btnRestart').onclick = function(){
  document.getElementById('endScreen').classList.add('hidden');
  Snd.stopMusic();
  startGame();
};

/* ---------------------- Debug-API für die Konsole -------------------- */
global.DOTT = {
  help:function(){ return ['DOTT.state()','DOTT.spots()','DOTT.act(name,verb)','DOTT.sel(item)',
                           'DOTT.give(item)','DOTT.who(id)','DOTT.go(room)','DOTT.flag(k,v)']; },
  state:function(){ return {who:S.who, room:me().room, era:era(), flags:S.f,
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
  who:function(id){ switchTo(id); return S.who; },
  go:function(room){ changeRoom(room); return me().room; },
  flag:function(k,v){ S.f[k] = (v === undefined) ? true : v; buildRoom(); return S.f; }
};

document.getElementById('boot').classList.add('hidden');
resize();
animate();

})(window);
