/* =========================================================================
   world.js — Epochen, Gegenstände und alle Räume mit ihren Hotspots.

   Jeder Raum existiert dreimal: 1776, Gegenwart, 2200. Es ist immer
   dasselbe Haus — was in einer Epoche passiert, steht in der nächsten da.
   ========================================================================= */
(function(global){
'use strict';

var W = {};

/* ======================================================================
   Figuren, Epochen, Räume, Gegenstände
   ====================================================================== */
W.CHARS = {
  bernard:{name:'Bernard', era:'present', ui:'#8fd0ff', initial:'B', sub:'Nerd, Gegenwart',
           skin:0xf2c9a2, shirt:0xf4f4f2, pants:0x39477f, hair:0x7a4a20,
           belt:0x2a2a30, extra:'glasses'},
  hoagie: {name:'Hoagie',  era:'past',    ui:'#ffcf7a', initial:'H', sub:'Roadie, 1776',
           skin:0xe6b489, shirt:0x2c3d63, pants:0x4d6fa5, hair:0x2a1a12,
           vest:0x1d2a45, extra:'beard'},
  laverne:{name:'Laverne', era:'future',  ui:'#a8ff9a', initial:'L', sub:'Studentin, 2200',
           skin:0xf6d2b4, shirt:0x33bfa1, pants:0x8b47c4, hair:0xd4501f, extra:'goggles'}
};
W.CHAR_IDS = ['bernard','hoagie','laverne'];

W.ERAS = {
  past:{
    skyTop:'#4b86c8', skyMid:'#9cc6e8', skyLow:'#e6d8b4',
    fog:0xc8d8e8, fogNear:52, fogFar:150,
    wallA:'#bb9a66', wallB:'#94743f', wallMortar:'#7d6038',
    floorA:'#8b5c33', floorB:'#6d4522', ground:'#4f7a2c', groundAlt:'#639440',
    key:0xfff0d2, keyI:1.05, ambI:0.52, hemiSky:0xffeccb, hemiGnd:0x6a5a44,
    accent:0xa2521f
  },
  present:{
    skyTop:'#2f6fae', skyMid:'#79b0d8', skyLow:'#d6e4ee',
    fog:0xbdd4e4, fogNear:56, fogFar:160,
    wallA:'#b9ab93', wallB:'#9b8f7b', wallMortar:'#83775f',
    floorA:'#7d6a56', floorB:'#5f503f', ground:'#3f7a26', groundAlt:'#569140',
    key:0xfff6e8, keyI:0.95, ambI:0.55, hemiSky:0xfff4e2, hemiGnd:0x5a5a68,
    accent:0x2f7fbf
  },
  future:{
    skyTop:'#180a2c', skyMid:'#3d1f57', skyLow:'#7a3f8f',
    fog:0x2a1440, fogNear:34, fogFar:110,
    wallA:'#4d3470', wallB:'#33224a', wallMortar:'#241634',
    floorA:'#241a38', floorB:'#160f26', ground:'#3a2c4c', groundAlt:'#4a3a60',
    key:0xe4ccff, keyI:0.75, ambI:0.62, hemiSky:0xc9a6ff, hemiGnd:0x201230,
    accent:0x49e6a0
  }
};

W.ROOM_LABEL = {
  yard:   {past:'Vor dem Rohbau, 1776', present:'Vor der Villa',    future:'Vor dem Tentakel-Turm'},
  kitchen:{past:'Küche, 1776',          present:'Küche',            future:'Nährschlamm-Kantine'},
  lab:    {past:'Werkstatt, 1776',      present:'Dr. Freds Labor',  future:'Kommandozentrale'},
  attic:  {past:'Dachstuhl, 1776',      present:'Dachboden',        future:'Museum der Menschheit'},
  cellar: {past:'Weinkeller, 1776',     present:'Keller',           future:'Archivschacht'}
};

W.ITEMS = {
  coal:    {name:'Kohle',        ic:'\u{1FAA8}',
            desc:'Ein schwarzer Klumpen Kohle. Reiner Kohlenstoff — genau wie ein Diamant, nur unentschlossener.'},
  wine:    {name:'Wein 1776',    ic:'\u{1F377}',
            desc:'Rotwein, Jahrgang 1776. Ziemlich sauer. Das wird mit der Zeit nicht besser — und genau darauf kommt es an.'},
  vinegar: {name:'Uralter Essig', ic:'\u{1F9EA}',
            desc:'Zweihundert Jahre gereifter Wein. Also Essig. Ätzend genug, um Beton zu ärgern.'},
  wrench:  {name:'Schraubenschlüssel', ic:'\u{1F527}',
            desc:'Schweres Schmiedeeisen aus der Werkstatt der Gründerväter. Hält vermutlich länger als die Republik.'},
  diamond: {name:'Diamant',      ic:'\u{1F48E}',
            desc:'Ein echter Diamant, gewachsen aus einem Klumpen Kohle. Vierhundert Jahre Geduld in Kristallform.'},
  acorn:   {name:'Eichel',       ic:'\u{1F330}',
            desc:'Eine Eichel. In ihr steckt ein ganzer Baum — er braucht nur ein paar Jahrhunderte Anlauf.'},
  hamster: {name:'Hamster',      ic:'\u{1F439}',
            desc:'Ein flauschiger Hamster. Er heißt laut Käfigschild "Chuck" und ist erstaunlich energiegeladen.'},
  costume: {name:'Tentakelkostüm', ic:'\u{1F991}',
            desc:'Ein lila Tentakelkostüm aus dem Museum. Kratzt entsetzlich, täuscht dafür jede Wache.'},
  chicken: {name:'Gummihuhn',    ic:'\u{1F414}',
            desc:'Ein Gummihuhn mit einer Rolle in der Mitte. Frag besser nicht. Es funktioniert einfach.'}
};

/* ======================================================================
   Raum-Abmessungen
   ====================================================================== */
var RW = 20, RD = 12;
W.BOUND = {x:8.6, zMin:-4.0, zMax:4.8};
W.ATTIC_BOUND  = {x:6.4, zMin:-3.2, zMax:3.4};
W.CELLAR_BOUND = {x:7.4, zMin:-3.6, zMax:4.6};

/* ======================================================================
   Hilfsfunktionen für den Aufbau
   ====================================================================== */
function shellInterior(g, E, opts){
  var o = opts || {};
  var floorTex = M.tex.planks(E.floorA, E.floorB, o.floorRep || 7);
  var wallTex  = o.panel ? M.tex.panel(E.wallA, '#49e6a0', 3)
                         : M.tex.bricks(E.wallA, E.wallMortar, 4);

  var fl = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.4, RD+10), M.mat(0xffffff,{map:floorTex}));
  fl.position.set(0,-0.2,3); fl.receiveShadow = true; fl.castShadow = false;
  fl.userData.floor = true;
  g.add(fl);

  var back = new THREE.Mesh(new THREE.BoxGeometry(RW+1, 14, 0.4), M.mat(0xffffff,{map:wallTex}));
  back.position.set(0,7,-RD/2); back.receiveShadow = true;
  g.add(back);

  var sideTex = o.panel ? M.tex.panel(E.wallB, '#49e6a0', 3) : M.tex.bricks(E.wallB, E.wallMortar, 4);
  var wl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 14, RD+12), M.mat(0xffffff,{map:sideTex}));
  wl.position.set(-RW/2, 7, 4); wl.receiveShadow = true; g.add(wl);
  var wr = wl.clone(); wr.position.x = RW/2; g.add(wr);

  g.add(M.box(RW, 0.4, RD+12, E.wallB, 0, 9.4, 4, {noShadow:true}));

  // Sockelleiste + Zierleiste
  g.add(M.box(RW, 0.34, 0.5, E.wallB, 0, 0.17, -RD/2+0.42, {noShadow:true}));
  g.add(M.box(RW, 0.22, 0.4, E.wallB, 0, 6.2,  -RD/2+0.40, {noShadow:true}));

  g.add(M.dust(160, RW*0.9, o.dust || 0xffffff));

  // Zwei schräge Lichtbahnen von oben — gibt dem Raum Tiefe
  var shaftCol = o.panel ? 0x8affd0 : 0xfff0c0;
  for(var sx=-1; sx<=1; sx+=2){
    var sh = M.lightShaft(0.55, 1.9, 11, shaftCol, o.panel ? 0.030 : 0.040);
    sh.position.set(sx*4.6, 4.6, -2.2);
    sh.rotation.z = sx * 0.19;
    g.add(sh);
  }
  g.add(M.motes(70, RW*0.8, 6, o.panel ? 0x8affd0 : 0xffe08a, 0.10));
  return fl;
}

function shellAttic(g, E){
  var floorTex = M.tex.planks(E.floorA, E.floorB, 5);
  var fl = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 11), M.mat(0xffffff,{map:floorTex}));
  fl.position.set(0,-0.2,0.6); fl.receiveShadow = true; fl.userData.floor = true;
  g.add(fl);

  var wallTex = M.tex.bricks(E.wallB, E.wallMortar, 3);
  var back = new THREE.Mesh(new THREE.BoxGeometry(15, 5, 0.4), M.mat(0xffffff,{map:wallTex}));
  back.position.set(0, 2.5, -4.6); back.receiveShadow = true; g.add(back);

  // Schrägdach
  var roofTex = M.tex.planks(E.floorB, E.floorA, 4);
  for(var s=-1; s<=1; s+=2){
    var r = new THREE.Mesh(new THREE.BoxGeometry(0.35, 8.4, 11), M.mat(0xffffff,{map:roofTex}));
    r.position.set(s*4.6, 3.4, 0.6);
    r.rotation.z = s*0.72;
    r.receiveShadow = true;
    g.add(r);
  }
  // Firstbalken und Querbalken
  g.add(M.box(0.4,0.4,11, E.floorB, 0, 6.5, 0.6, {noShadow:true}));
  for(var b=-1;b<=1;b++) g.add(M.box(9.6,0.28,0.28, E.floorB, 0, 4.2, b*3.4, {noShadow:true}));

  // Rundfenster
  var win = M.cyl(1.05,1.05,0.3, 0xffe8b0, 0, 3.0, -4.55, 18, {emissive:0x6a5220});
  win.rotation.x = Math.PI/2; g.add(win);
  g.add(M.box(2.2,0.14,0.16, 0x3a2a1a, 0, 3.0, -4.35));
  g.add(M.box(0.14,2.2,0.16, 0x3a2a1a, 0, 3.0, -4.35));

  g.add(M.dust(220, 12, 0xfff0d0));

  // Der klassische Dachbodenstrahl aus dem Rundfenster
  var beam = M.lightShaft(0.85, 2.2, 9.5, 0xfff0c0, 0.085);
  beam.position.set(0, 2.4, -1.0);
  beam.rotation.x = 1.02;
  g.add(beam);
  g.add(M.motes(110, 11, 5, 0xffe6a8, 0.12));
  return fl;
}

function outdoorShell(g, E){
  var groundTex = M.tex.grass(E.ground, E.groundAlt, 14);
  var fl = new THREE.Mesh(new THREE.BoxGeometry(RW+22, 0.4, RD+18), M.mat(0xffffff,{map:groundTex}));
  fl.position.set(0,-0.2,2); fl.receiveShadow = true; fl.userData.floor = true;
  g.add(fl);

  var pathTex = M.tex.concrete('#9c8d72', 4);
  var path = new THREE.Mesh(new THREE.BoxGeometry(3.4,0.08,RD+14), M.mat(0xffffff,{map:pathTex}));
  path.position.set(0,0.04,3); path.receiveShadow = true; g.add(path);

  // Himmelskuppel
  var sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16),
    new THREE.MeshBasicMaterial({map:M.tex.sky(E.skyTop, E.skyMid, E.skyLow), side:THREE.BackSide}));
  sky.name = 'skydome';
  g.add(sky);
  return fl;
}

function facade(era, S){
  var f = M.grp(0,0,-6.8);
  var wallCol = era === 'past' ? '#b08b58' : era === 'present' ? '#a4916f' : '#4a3163';
  var tex = M.tex.bricks(wallCol, era === 'future' ? '#241634' : '#8f6f45', 5);
  var body = new THREE.Mesh(new THREE.BoxGeometry(16, 9.5, 1.6), M.mat(0xffffff,{map:tex}));
  body.position.y = 4.75; body.receiveShadow = true; body.castShadow = true;
  f.add(body);
  f.add(M.box(17.4,1.1,2.6, era === 'future' ? 0x2c1c40 : 0x7a4a2a, 0, 9.9, 0.3));

  for(var i=0;i<4;i++){
    var xx = -5.7 + i*3.8;
    for(var r=0;r<2;r++){
      var wy = 3.0 + r*3.1;
      f.add(M.box(1.9,2.2,0.14, 0x4a3220, xx, wy, 0.80));
      f.add(M.box(1.6,1.9,0.22, era === 'future' ? 0x8affd0 : 0x27384a, xx, wy, 0.86,
        {emissive: era === 'future' ? 0x2a6a50 : 0x0a1218}));
      f.add(M.box(1.7,0.07,0.10, 0x4a3220, xx, wy, 0.94));
      f.add(M.box(0.07,2.0,0.10, 0x4a3220, xx, wy, 0.94));
    }
  }
  f.add(M.box(2.8,4.0,0.16, 0x3d2714, 0, 2.0, 0.78));
  f.add(M.box(2.3,3.6,0.32, 0x5a3a1e, 0, 1.8, 0.86));
  f.add(M.box(2.3,0.16,0.42, 0x3d2714, 0, 3.62, 0.88));
  f.add(M.ball(0.11,0xd8b040, 0.80, 1.8, 1.04));

  if(era === 'past'){
    for(var s=0;s<5;s++) f.add(M.cyl(0.11,0.11,10,0x8a6636, -7.6+s*3.8, 5.0, 1.5, 8));
    f.add(M.box(16.4,0.18,0.55,0x8a6636,0,4.7,1.5));
    f.add(M.box(16.4,0.18,0.55,0x8a6636,0,7.6,1.5));
    f.add(M.box(0.18,3.4,0.55,0x8a6636,-3.0,6.2,1.5));
  }
  if(era === 'future'){
    for(var b=0;b<3;b++){
      f.add(M.box(2.4,5.6,0.12, 0x7a2ea8, -5.2+b*5.2, 5.6, 1.0));
      var ic = M.tentacle(0xb555ff, 1.2, {arms:false});
      ic.scale.setScalar(0.72);
      ic.position.set(-5.2+b*5.2, 4.4, 1.1);
      f.add(ic);
    }
    f.add(M.cyl(0.55,0.8,8,0x3a2455, 9.2, 4.0, 0.6, 10));
    var orb = M.ball(1.0, 0x49e6a0, 9.2, 8.4, 0.6, {emissive:0x1f8a5e});
    orb.name = 'towerOrb';
    f.add(orb);
  }
  return f;
}

/* ======================================================================
   Raum-Bauer.  Jeder bekommt (era, S, g, HS, A):
     era  Epochen-Id      S  Spielzustand
     g    Zielgruppe      HS Hotspot-Registrierung
     A    API aus game.js (say, give, drop, has, set, rebuild, win, sfx)
   ====================================================================== */

/* ---------------------------------------------------------------- HOF */
function buildYard(era, S, g, HS, A){
  var E = W.ERAS[era];
  outdoorShell(g, E);

  HS('Villa', facade(era, S), 0, -2.6, {
    primary:'look',
    look:function(){
      if(era === 'past')    return 'Die Villa ist ein Rohbau. Überall Gerüste, Zement und schwitzende Gründerväter.';
      if(era === 'present') return 'Dr. Freds Villa. Von außen ein schäbiges Motel, von innen eine Katastrophe mit Doktortitel.';
      return S.f.valveClosed
        ? 'Ein ganz normales altes Motel. Kein Banner, kein Tentakel. Herrlich langweilig.'
        : 'Die Villa hängt voller lila Banner. Über der Tür steht: "TENTAKEL-HAUPTQUARTIER — MENSCHEN NUR MIT TERMIN".';
    }
  });

  var doorTrig = M.box(2.6,3.8,0.9, 0x000000, 0, 1.9, -5.4, {opacity:0.0, noShadow:true});
  HS('Eingangstür', doorTrig, 0, -2.5, {
    primary:'door', door:'kitchen',
    look:function(){ return 'Die Haustür. Dahinter liegt die Küche.'; }
  });

  /* --- Beet / Baum: Kette C ------------------------------------------ */
  if(era === 'past'){
    var bed = M.grp(6.2, 0, 1.4);
    var soil = M.tex.concrete('#5a3f28', 2);
    var soilMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.36,2.2), M.mat(0xffffff,{map:soil}));
    soilMesh.position.y = 0.18; soilMesh.receiveShadow = true;
    bed.add(soilMesh);
    bed.add(M.box(2.9,0.24,0.18, 0x6b4a2a, 0, 0.24, 1.1));
    bed.add(M.box(2.9,0.24,0.18, 0x6b4a2a, 0, 0.24,-1.1));
    if(S.f.treePlanted){ var sp = M.sapling(); sp.position.set(0,0.35,0); bed.add(sp); }
    HS(S.f.treePlanted ? 'Setzling' : 'Frisch umgegrabenes Beet', bed, 5.6, 3.0, {
      primary:'use',
      look:function(){
        return S.f.treePlanted
          ? 'Ein winziger Eichen-Setzling. Gib ihm zweihundert Jahre und er wird beeindruckend.'
          : 'Ein frisch umgegrabenes Beet neben dem Haus. Weiche, hungrige Erde.';
      },
      use:function(item){
        if(item === 'acorn'){
          A.drop('hoagie','acorn'); A.set('treePlanted', true); A.sfx('solve');
          A.say('Hoagie drückt die Eichel in die weiche Erde und klopft sie fest.');
          A.say('"Wachs schön. Ich schau in zweihundert Jahren nochmal vorbei."','hoagie');
          return null;
        }
        if(item) return 'Das wächst nicht. Nicht mal in vierhundert Jahren.';
        return S.f.treePlanted ? 'Der Setzling braucht jetzt vor allem eins: Zeit.'
                               : 'Weiche Erde. Hier könnte man etwas einpflanzen.';
      },
      take:function(){ return 'Erde mitnehmen? Hoagie hat schon genug an den Schuhen.'; }
    });
  } else if(S.f.treePlanted){
    var leafCol = era === 'future' ? 0x5f7a4a : 0x3f7a2e;
    var tree = M.bigTree(leafCol);
    tree.position.set(6.2, 0, 1.4);
    HS('Riesige Eiche', tree, 5.2, 2.6, {
      primary:'door', door:'attic',
      look:function(){
        return 'Eine gewaltige Eiche, exakt so alt wie das Haus. Ihre unteren Äste reichen bis zur Dachluke — bequemer als jede Treppe.';
      },
      use:function(item){
        if(item) return 'Der Baum braucht das nicht. Der Baum braucht gar nichts mehr.';
        return null;
      }
    });
  } else {
    var stump = M.grp(6.2, 0, 1.4);
    stump.add(M.cyl(0.9,1.0,0.5, 0x6b5540, 0, 0.25, 0, 12));
    stump.add(M.cyl(0.85,0.85,0.06, 0x8a7358, 0, 0.52, 0, 14));
    HS('Kahle Stelle', stump, 5.6, 3.0, {
      primary:'look',
      look:function(){
        return 'Ein alter Baumstumpf. Hier hat offenbar nie jemand etwas Vernünftiges gepflanzt. Schade — bis zur Dachluke käme man sonst locker.';
      }
    });
  }

  /* --- epochenspezifisches --- */
  if(era === 'past'){
    var wet = !S.f.coalInCement;
    var cs = M.grp(-5.6, 0, 0.8);
    cs.add(M.box(3.0,0.55,2.2, 0x9a9a90, 0, 0.28, 0));
    var cem = M.box(2.7,0.38,1.9, wet ? 0x8f8f86 : 0xa8a89e, 0, 0.68, 0);
    cs.add(cem);
    if(S.f.coalInCement) cs.add(M.box(0.46,0.32,0.46, 0x1a1a1a, 0, 0.86, 0));
    cs.add(M.box(0.16,1.4,0.16, 0x7a5a30, 1.7, 0.7, -0.9));
    cs.add(M.box(0.9,0.05,0.5, 0xe8dcc0, -0.9, 0.9, 0.7));
    HS(wet ? 'Nasser Zement' : 'Eckstein', cs, -5.0, 2.6, {
      primary:'use',
      look:function(){
        return S.f.coalInCement
          ? 'Die Kohle sitzt im Zement und wird gleich für ein paar Jahrhunderte eingemauert.'
          : 'Der Eckstein der Villa. Der Zement ist noch weich — hier drückt man mühelos etwas hinein.';
      },
      take:function(){ return 'Eine halbe Tonne Eckstein. Hoagie ist stark, aber nicht albern.'; },
      use:function(item){
        if(item === 'coal'){
          A.drop('hoagie','coal'); A.set('coalInCement', true); A.sfx('solve');
          A.say('Hoagie drückt die Kohle tief in den weichen Zement.');
          A.say('"Vierhundert Jahre Druck. Meine Physiklehrerin wäre so stolz."','hoagie');
          return null;
        }
        if(item === 'acorn') return 'Im Beton wächst nichts. Nicht mal Eichen.';
        if(item) return 'Das im Zement zu versenken bringt gar nichts.';
        return 'Hoagie patscht in den Zement. Sehr befriedigend, völlig nutzlos.';
      }
    });

    // Eichel unter dem alten Baum
    if(!S.f.acornTaken && !S.f.treePlanted){
      var ac = M.grp(-8.8, 0.22, 3.8);
      ac.add(M.ball(0.22, 0x8a6a3a, 0, 0, 0));
      ac.add(M.cyl(0.17,0.13,0.14, 0x5a4326, 0, 0.18, 0, 10));
      ac.add(M.ball(0.19, 0x8a6a3a, 0.28,-0.02, 0.22));
      HS('Eichel', ac, -7.8, 3.8, {
        primary:'take',
        look:function(){ return 'Eine dicke Eichel, frisch heruntergefallen. In ihr steckt ein kompletter Baum.'; },
        take:function(){
          A.set('acornTaken', true); A.give('hoagie','acorn'); A.sfx('pick');
          A.say('"Eine Eichel. Kleine Dinger, große Pläne."','hoagie');
          return null;
        }
      });
    }

    var fv = M.grp(4.6, 0, 0.4);
    var founder = M.actor({skin:0xe8c49e, shirt:0x9c8b6a, pants:0x6c5c44, hair:0xdedede,
                           vest:0x7a6a4a, extra:'wig'});
    founder.rotation.y = -0.4;
    fv.add(founder);
    HS('Gründervater', fv, 3.2, 1.8, {
      primary:'talk',
      look:function(){ return 'Ein Gründervater mit Perücke, Dreispitz und ungefähr doppelt so viel Meinung wie Haaren.'; },
      talk:function(){
        A.dialog('Gründervater', function(){
          var opts = [
            {q:'Was bauen Sie hier eigentlich?', a:function(){
              A.say('"Ein Haus für die Nachwelt! Solide, würdig, mit einem Keller für … Experimente."','npc');
              A.say('"Fragen Sie nicht. Der Bauherr ist ein sehr eigener Mensch."','npc');
              return true;
            }},
            {q:'Erzählen Sie mir was über Kohle.', a:function(){
              A.say('"Kohle? Schwarz, staubig, brennt. Aber pressen Sie sie lange genug —"','npc');
              A.say('"— und Sie halten einen Diamanten in der Hand. Vierhundert Jahre sollten reichen."','npc');
              A.say('"Das habe ich mir eben ausgedacht. Klingt aber gut, nicht wahr?"','npc');
              return true;
            }},
            {q:'Was passiert mit dem nassen Zement?', a:function(){
              A.say('"Der härtet aus und trägt dann dieses Haus. Für immer."','npc');
              A.say('"Was jetzt hineinkommt, bleibt drin. Also bitte kein Kaugummi."','npc');
              A.say('"Der letzte Lehrling hat seinen Hut verloren. Der ist jetzt Teil der Geschichte."','npc');
              return true;
            }}
          ];
          if(!S.f.treePlanted) opts.push({q:'Warum steht hier kein Baum?', a:function(){
            A.say('"Weil niemand einen pflanzt! Ich will Schatten, keinen Stumpf."','npc');
            A.say('"Da drüben ist frisch umgegraben. Ein Kind könnte das."','npc');
            return true;
          }});
          if(!S.f.eggInsult) opts.push({q:'Sie sehen aus, als könnten Sie fechten.', a:function(){
            A.setQuiet('eggInsult', true);
            A.egg('monkey-insult');
            A.say('"Ha! Ihr kämpft wie ein dummer Bauer."','npc');
            A.say('"Wie passend. Ihr kämpft wie eine Kuh."','hoagie');
            A.say('"...das war unerwartet gut. Guten Tag."','npc');
            return true;
          }});
          opts.push({q:'Schönen Tag noch.', a:null});
          return opts;
        });
        return null;
      },
      take:function(){ return 'Gründerväter nimmt man nicht mit. Steht so in der Verfassung. Vermutlich.'; }
    });

    var wb = M.grp(8.6,0,4.2);
    wb.add(M.box(1.7,0.95,1.1, 0x7a5a34, 0, 0.48, 0));
    wb.add(M.cyl(0.75,0.75,0.42, 0x8a8a8a, 0, 1.10, 0, 14));
    wb.add(M.cyl(0.42,0.42,0.14, 0x4a4a4a, 0, 0.42, 0.72, 12));
    HS('Schubkarre', wb, 7.4, 4.2, {
      primary:'look',
      look:function(){ return 'Eine Schubkarre voll Zement. Der Bauleiter bewacht sie wie sein Erstgeborenes.'; }
    });
  }

  if(era === 'present'){
    var old = M.grp(-5.6, 0, 0.8);
    old.add(M.box(3.0,0.55,2.2, 0x8d8d84, 0, 0.28, 0));
    old.add(M.box(2.7,0.38,1.9, 0x9d9d92, 0, 0.68, 0));
    HS('Eckstein', old, -5.0, 2.6, {
      primary:'look',
      look:function(){
        return S.f.coalInCement
          ? 'Der Eckstein von 1776. Irgendwo da drin liegt ein Klumpen Kohle und wartet seit zweihundert Jahren.'
          : 'Der alte Eckstein der Villa. Verwittert, aber standhaft.';
      }
    });

    var pipe = M.grp(8.4, 0, -1.8);
    pipe.add(M.cyl(0.6,0.6,6.5, 0x7d8288, 0, 3.25, 0, 14));
    var elbow = M.cyl(0.6,0.6,3.6, 0x7d8288, 0, 6.0, 1.8, 14);
    elbow.rotation.x = Math.PI/2; pipe.add(elbow);
    pipe.add(M.cyl(0.72,0.72,0.3, 0x5c6268, 0, 2.4, 0, 14));
    if(!S.f.valveClosed){
      var stream = M.cyl(0.34,0.48,5.0, 0x7ed957, 0, 2.6, 3.5, 12, {opacity:0.85, emissive:0x2a6a20});
      stream.name = 'sludgeStream'; pipe.add(stream);
      var pool = M.ball(1.3, 0x7ed957, 0, 0.2, 3.9, {opacity:0.9, emissive:0x2a6a20});
      pool.name = 'sludgePool'; pipe.add(pool);
      var gl = new THREE.PointLight(0x7ed957, 1.1, 12); gl.position.set(0,1.6,3.6);
      pipe.add(gl);
    }
    HS('Sludge-o-Matic-Rohr', pipe, 6.8, 1.8, {
      primary:'look',
      look:function(){
        return S.f.valveClosed
          ? 'Das Rohr tropft nur noch. Der Fluss riecht schon fast wieder nach Fluss.'
          : 'Aus dem Rohr quillt leuchtend grüner Giftschlamm in den Fluss. Genau davon hat das lila Tentakel getrunken.';
      },
      use:function(item){
        if(item === 'wrench') return 'Am Rohr ist nichts zu drehen. Das Ventil sitzt drinnen im Labor.';
        return 'Da fasst Bernard ganz sicher nicht rein.';
      }
    });

    var rivGeo = new THREE.PlaneGeometry(44, 4.2, 44, 5);
    var riv = new THREE.Mesh(rivGeo, M.mat(S.f.valveClosed ? 0x3f7fbf : 0x5f9f4f,
      {opacity:0.88, emissive: S.f.valveClosed ? 0x0a2438 : 0x1a3a10}));
    riv.rotation.x = -Math.PI/2;
    riv.position.set(0, 0.09, 7.2);
    riv.castShadow = false; riv.receiveShadow = false;
    riv.name = 'river';
    riv.userData.wave = rivGeo.attributes.position.array.slice(0);
    HS('Fluss', riv, 0, 4.6, {
      primary:'look',
      look:function(){
        return S.f.valveClosed
          ? 'Der Fluss ist wieder blau. Ein Fisch springt und wirkt ausgesprochen erleichtert.'
          : 'Der Fluss glitzert grün. Nicht auf die schöne Art.';
      }
    });
  }

  if(era === 'future'){
    var fc = M.grp(-5.6, 0, 0.8);
    fc.add(M.box(3.0,0.55,2.2, 0x6f6f68, 0, 0.28, 0));
    fc.add(M.box(2.7,0.38,1.9, 0x7d7d74, 0, 0.68, 0));
    fc.add(M.box(0.8,0.16,2.0, 0x45453e, 0.35, 0.86, 0));
    HS('Uralter Eckstein', fc, -5.0, 2.6, {
      primary:'use',
      look:function(){
        if(S.f.diamondTaken) return 'Ein ausgefressenes Loch im Eckstein. Der Diamant ist in guten Händen.';
        if(S.f.coalInCement)  return 'Im Riss funkelt etwas. Vierhundert Jahre Druck haben aus Kohle einen Diamanten gemacht — er sitzt bombenfest im Beton.';
        return 'Ein uralter, rissiger Eckstein. Vollkommen leer.';
      },
      take:function(){
        if(S.f.diamondTaken) return 'Da ist nichts mehr.';
        if(S.f.coalInCement) return 'Laverne kratzt am Beton. Der Beton gewinnt haushoch.';
        return 'Nichts zu holen.';
      },
      use:function(item){
        if(item === 'costume'){ A.wear(); return null; }
        if(item === 'vinegar'){
          if(!S.f.disguised && !S.f.valveClosed){
            A.sfx('no');
            A.say('Das Wach-Tentakel starrt herüber. Solange es zusieht, fasst Laverne hier gar nichts an.','sys');
            A.say('"Ich brauche eine Verkleidung. Irgendwas … Schlauchförmiges."','laverne');
            return null;
          }
          if(!S.f.coalInCement) return 'Der Essig zischt und frisst ein Loch in den Stein. Darin: nichts. Wie enttäuschend.';
          A.drop('laverne','vinegar'); A.set('diamondTaken', true); A.give('laverne','diamond'); A.sfx('solve');
          A.say('Der uralte Essig zischt, schäumt und frisst sich in den Beton.');
          A.say('"Ein Diamant! Bernard, deine Kohle hat wirklich funktioniert!"','laverne');
          return null;
        }
        if(item) return 'Gegen vierhundert Jahre Beton hilft das nicht.';
        return 'Laverne klopft gegen den Stein. Stein bleibt Stein.';
      }
    });

    if(S.f.coalInCement && !S.f.diamondTaken){
      var glint = M.ball(0.24, 0xdff6ff, -5.2, 0.94, 1.1, {emissive:0x5fb8e8, noShadow:true});
      glint.name = 'diamondGlint';
      g.add(glint);
      var gl2 = new THREE.PointLight(0x9fe4ff, 0.9, 5); gl2.position.set(-5.2,1.3,1.1); g.add(gl2);
    }

    if(!S.f.valveClosed){
      var guard = M.grp(4.4, 0, 0.6);
      var gt = M.tentacle(0x6ee06e, 2.0, {hat:0x2a4a2a});
      gt.rotation.y = -0.35;
      gt.name = 'guardTent';
      guard.add(gt);
      HS('Wach-Tentakel', guard, 3.0, 1.8, {
        primary:'talk',
        look:function(){
          return S.f.disguised
            ? 'Das Wach-Tentakel nickt Laverne kollegial zu. Die Verkleidung sitzt.'
            : 'Ein grünes Tentakel in Wachuniform. Keine Arme, dafür ein bemerkenswertes Pflichtgefühl — und es lässt den Eckstein nicht aus den Augen.';
        },
        talk:function(){
          A.dialog('Wach-Tentakel', function(){
            if(S.f.disguised) return [
              {q:'Alles ruhig hier, Kollege?', a:function(){
                A.say('"Absolut. Diese Menschen heute, ich sag dir..."','npc');
                A.say('"Guck ruhig beim Eckstein nach dem Rechten. Ich mach Pause."','npc');
                return true;
              }},
              {q:'Schöne Uniform.', a:function(){
                A.say('"Danke! Maßgeschneidert. Zwei Ärmel weniger als bei den anderen."','npc');
                return true;
              }},
              {q:'Bis später.', a:null}
            ];
            return [
              {q:'Warum darf ich hier nicht durch?', a:function(){
                A.say('"Menschen sind ab 14 Uhr verboten. Steht in der Vorschrift."','npc');
                A.say('"Vor 14 Uhr übrigens auch. Die Vorschrift ist knapp gehalten."','npc');
                return true;
              }},
              {q:'Was bewachen Sie eigentlich?', a:function(){
                A.say('"Diesen Eckstein. Frag nicht warum, ich bewache einfach."','npc');
                A.say('"Seit vierhundert Jahren ist da nichts passiert. Vorbildliche Bilanz."','npc');
                return true;
              }},
              {q:'Wen würden Sie denn durchlassen?', a:function(){
                A.say('"Tentakel natürlich. Kollegen erkennt man sofort."','npc');
                A.say('"Woran? Am Schlauch. Und an der aufrechten Haltung."','npc');
                return true;
              }},
              {q:'Dann eben nicht.', a:null}
            ];
          });
          return null;
        },
        use:function(item){
          if(item === 'costume'){ A.wear(); return null; }
          return 'Besser nicht anfassen.';
        },
        take:function(){ return 'Laverne trägt kein Tentakel mit sich herum. Prinzipiell.'; }
      });
    } else {
      var human = M.grp(4.4, 0, 0.6);
      var ha = M.actor({skin:0xe8c49e, shirt:0xdd6644, pants:0x445577, hair:0x332211, extra:''});
      ha.rotation.y = -0.4; human.add(ha);
      HS('Passantin', human, 3.0, 1.8, {
        primary:'talk',
        look:function(){ return 'Ein ganz gewöhnlicher Mensch in einer ganz gewöhnlichen Zukunft.'; },
        talk:function(){
          A.say('"Tentakel? Meinen Sie die Dinger im Aquarium?"','npc');
          return null;
        }
      });
    }
  }

  // Deko-Bäume am Rand
  var deco = era === 'future' ? 0x5f4a7a : (era === 'past' ? 0x3f7a30 : 0x35702c);
  var t1 = M.tree(deco); t1.position.set(-11.5, 0, 3.2); g.add(t1);
  var t2 = M.tree(deco); t2.position.set(12.6, 0, 4.6); g.add(t2);
  g.add(M.motes(era === 'future' ? 130 : 70, 26, 7,
                era === 'future' ? 0x8affd0 : 0xffe08a,
                era === 'future' ? 0.13 : 0.11));
  if(era === 'future'){
    g.add(M.rain(600, 46, 20, 0x9fd8ff));           // die Zukunft ist nass
  } else if(era === 'past'){
    g.add(M.mist(7, 34, 0.5, 0xe4eef6));            // Morgendunst über 1776
  }
  g.add(M.clouds(8, era === 'future' ? 0x6a4a8c : 0xf4f6fa, 10.5, 66));
  g.add(M.birds(era === 'future' ? 2 : 4, era === 'future' ? 0x2a1a3a : 0x2e2e34));

  placeEggs('yard', era, S, g, HS, A);
}

/* ------------------------------------------------------------- KÜCHE */
function buildKitchen(era, S, g, HS, A){
  var E = W.ERAS[era];
  shellInterior(g, E, {panel: era === 'future', dust: era === 'future' ? 0xa88ad8 : 0xfff0d0});

  HS('Tür nach draußen', M.box(2.2,3.6,0.5, 0x2a1a10, -7.2, 1.8, -5.8), -7.2, -2.9,
    {primary:'door', door:'yard', look:function(){ return 'Die Tür nach draußen.'; }});

  HS(era === 'past' ? 'Tür zur Werkstatt' : (era === 'present' ? 'Tür zum Labor' : 'Tür zur Zentrale'),
     M.box(2.2,3.6,0.5, 0x2a1a10, 7.2, 1.8, -5.8), 7.2, -2.9,
    {primary:'door', door:'lab', look:function(){ return 'Dahinter geht es tiefer ins Haus.'; }});

  /* Loser Ziegel — Kette B */
  var brick = M.grp(-9.4, 2.0, -1.0);
  brick.add(M.box(0.44,1.05,1.7, era === 'future' ? 0x7d5aa4 : 0x9a7a52, 0, 0, 0));
  brick.add(M.box(0.50,0.48,0.70, era === 'future' ? 0xa07cc4 : 0xb08a5c, 0.09, 0, 0));
  var bottleVisible = S.f.wineInNiche && (era === 'past' || (era === 'future' && !S.f.vinegarTaken));
  if(bottleVisible){
    brick.add(M.cyl(0.12,0.14,0.55, era === 'future' ? 0x6a6a5a : 0x2d4a24, 0.30, 0, 0, 10));
    brick.add(M.cyl(0.05,0.05,0.2, era === 'future' ? 0x6a6a5a : 0x2d4a24, 0.30, 0.36, 0, 8));
  }
  HS('Loser Ziegel', brick, -7.6, -0.8, {
    primary: (era === 'future' && S.f.wineInNiche && !S.f.vinegarTaken) ? 'take' : 'use',
    look:function(){
      if(era === 'past')
        return S.f.wineInNiche
          ? 'Hinter dem losen Ziegel steht die Weinflasche, sauber vermauert. Bis dann.'
          : 'Ein loser Ziegel in der Küchenwand. Dahinter: eine kleine, staubige Nische.';
      if(era === 'present')
        return S.f.wineInNiche
          ? 'Der lose Ziegel. Vor zweihundert Jahren hat hier jemand etwas versteckt. Man hört es fast gluckern.'
          : 'Ein loser Ziegel. Die Nische dahinter ist leer und uninteressant.';
      if(S.f.vinegarTaken) return 'Eine leere Nische. Den Inhalt hat Laverne bereits.';
      return S.f.wineInNiche
        ? 'In der Nische steht eine uralte Flasche unter einer Staubschicht wie eine Wolldecke.'
        : 'Eine leere Nische. Seit vierhundert Jahren passiert hier nichts.';
    },
    take:function(){
      if(era === 'future' && S.f.wineInNiche && !S.f.vinegarTaken){
        A.set('vinegarTaken', true); A.give('laverne','vinegar'); A.sfx('solve');
        A.say('Laverne zieht die verstaubte Flasche aus der Nische.');
        A.say('"Wein von 1776. Nach vierhundert Jahren ist das reiner Essig. Perfekt."','laverne');
        return null;
      }
      if(era === 'past' && S.f.wineInNiche) return 'Nein. Der Wein bleibt drin und altert gefälligst.';
      return 'In der Nische ist nichts, was man mitnehmen könnte.';
    },
    use:function(item){
      if(era === 'past' && item === 'wine'){
        if(S.f.wineInNiche) return 'Da steht schon eine Flasche.';
        A.drop('hoagie','wine'); A.set('wineInNiche', true); A.sfx('solve');
        A.say('Hoagie stellt die Flasche in die Nische und schiebt den Ziegel zurück.');
        A.say('"Reift zweihundert Jahre. Wenn das kein Jahrgang wird."','hoagie');
        return null;
      }
      if(item) return 'Das gehört nicht in die Nische.';
      return 'Der Ziegel wackelt. Dahinter ist eine Nische.';
    }
  });

  if(era === 'past'){
    var tbl = M.grp(1.2,0,0.6);
    tbl.add(M.box(4.4,0.24,2.3, 0x8a6236, 0, 1.08, 0));
    [[-2.0,-0.95],[2.0,-0.95],[-2.0,0.95],[2.0,0.95]].forEach(function(p){
      tbl.add(M.box(0.24,1.08,0.24, 0x6d4c28, p[0], 0.54, p[1]));
    });
    tbl.add(M.cyl(0.45,0.42,0.14, 0xdcd2bc, -1.3, 1.24, 0.2, 14));
    tbl.add(M.box(0.55,0.06,0.10, 0xb8a888, -0.6, 1.22, 0.5));
    HS('Küchentisch', tbl, 1.2, 2.6, {
      primary:'look',
      look:function(){ return 'Ein grober Holztisch. Auf dem Blechteller liegt etwas, das einmal Suppe werden wollte.'; }
    });

    if(!S.f.wineTaken){
      var wine = M.grp(2.2, 1.20, 0.2);
      wine.add(M.cyl(0.17,0.21,0.72, 0x2d4a24, 0, 0.36, 0, 12));
      wine.add(M.cyl(0.075,0.075,0.38, 0x2d4a24, 0, 0.88, 0, 10));
      wine.add(M.cyl(0.08,0.08,0.11, 0xb08a4a, 0, 1.09, 0, 10));
      wine.add(M.box(0.22,0.26,0.02, 0xe8dcc0, 0, 0.37, 0.21));
      HS('Weinflasche', wine, 2.2, 2.6, {
        primary:'take',
        look:function(){ return 'Rotwein, Jahrgang 1776. "Ziemlich sauer", sagen die Gründerväter. Sie sagen es oft.'; },
        take:function(){
          A.set('wineTaken', true); A.give('hoagie','wine'); A.sfx('pick');
          A.say('"Wein von 1776. Aus dem wird bestimmt noch was."','hoagie');
          return null;
        },
        use:function(){ return 'Hoagie trinkt im Dienst nicht. Meistens.'; }
      });
    }

    var hearth = M.grp(-3.0,0,-5.2);
    hearth.add(M.box(4.4,3.8,1.3, 0x8a7050, 0, 1.9, 0));
    hearth.add(M.box(2.6,2.2,0.6, 0x120e0a, 0, 1.1, 0.70));
    var fire = M.box(2.1,0.8,0.5, 0xd86a20, 0, 0.5, 0.72, {emissive:0x9a3a08, noShadow:true});
    fire.name = 'fire'; hearth.add(fire);
    var fl = new THREE.PointLight(0xff9040, 1.5, 11); fl.position.set(0,1.2,1.2);
    fl.name = 'fireLight'; hearth.add(fl);
    hearth.add(M.cyl(0.55,0.65,0.75, 0x2e2e36, 0, 1.3, 0.75, 14));
    HS('Feuerstelle', hearth, -3.0, -2.5, {
      primary:'look',
      look:function(){ return 'Über dem Feuer hängt ein Kessel mit etwas Braunem. 1776 war kulinarisch kein Höhepunkt.'; },
      take:function(){ return 'Heiß. Sehr heiß.'; },
      use:function(item){
        if(item === 'wine') return 'Wein verkochen? Der Gründervater würde Hoagie eigenhändig einmauern.';
        return 'Hoagie wärmt sich die Hände. Guter Moment.';
      }
    });
  }

  if(era === 'present'){
    var fp = M.grp(-3.0,0,-5.2);
    fp.add(M.box(4.4,3.8,1.3, 0xa89a86, 0, 1.9, 0));
    fp.add(M.box(2.6,2.2,0.6, 0x151515, 0, 1.1, 0.70));
    fp.add(M.box(3.2,0.34,1.4, 0x6a625a, 0, 0.17, 1.05));      // Kaminvorsprung
    fp.add(M.box(4.8,0.28,1.6, 0x8a8074, 0, 3.95, 0.1));       // Sims
    HS('Kamin', fp, -3.0, -2.5, {
      primary: S.f.coalTaken ? 'look' : 'take',
      look:function(){
        return 'Ein kalter Kamin voller Asche.' +
               (S.f.coalTaken ? ' Die Kohle hat Bernard schon.' : ' Auf dem Vorsprung liegt ein Klumpen Kohle.');
      },
      take:function(){
        if(S.f.coalTaken) return 'Der Kamin gibt nichts mehr her.';
        A.set('coalTaken', true); A.give('bernard','coal'); A.sfx('pick');
        A.say('"Kohle. Reiner Kohlenstoff. Mit genug Druck und genug Zeit..."','bernard');
        A.say('"...und ich kenne da zufällig zweihundert Jahre, die gerade frei sind."','bernard');
        return null;
      },
      use:function(){ return 'Bernard hat kein Feuerzeug. Und keine Lust.'; }
    });

    /* Kohle liegt VOR dem Kamin auf dem Vorsprung — frei anklickbar */
    if(!S.f.coalTaken){
      var lump = M.grp(-3.0, 0.5, -4.15);
      lump.add(M.ball(0.32, 0x1c1c1c, 0, 0, 0));
      lump.add(M.ball(0.22, 0x282828, 0.24, 0.07, 0.10));
      lump.add(M.ball(0.19, 0x141414,-0.22, 0.05,-0.06));
      lump.add(M.ball(0.14, 0x303030, 0.05, 0.20,-0.14));
      HS('Klumpen Kohle', lump, -3.0, -2.5, {
        primary:'take',
        look:function(){ return 'Ein Klumpen Kohle. Kohle ist Kohlenstoff. Diamant übrigens auch — nur besser sortiert.'; },
        take:function(){
          A.set('coalTaken', true); A.give('bernard','coal'); A.sfx('pick');
          A.say('"Kohle. Reiner Kohlenstoff. Mit genug Druck und genug Zeit..."','bernard');
          A.say('"...und ich kenne da zufällig zweihundert Jahre, die gerade frei sind."','bernard');
          return null;
        },
        use:function(item){ return item ? 'Die Kohle will einfach nur mitgenommen werden.' : 'Erst mal einstecken.'; }
      });
    }

    var fridge = M.grp(4.6,0,-5.0);
    fridge.add(M.box(2.0,3.8,1.6, 0xe4e8ea, 0, 1.9, 0));
    fridge.add(M.box(1.94,0.09,1.54, 0xb8bec2, 0, 2.2, 0.02));
    fridge.add(M.box(0.11,1.7,0.11, 0x9aa0a4, 0.80, 2.4, 0.84));
    fridge.add(M.box(0.11,1.0,0.11, 0x9aa0a4, 0.80, 0.9, 0.84));
    fridge.add(M.box(0.45,0.55,0.03, 0xffe066, -0.4, 2.6, 0.82));   // Notizzettel
    HS('Kühlschrank', fridge, 4.6, -2.6, {
      primary:'use',
      look:function(){ return 'Dr. Freds Kühlschrank. Auf den Dosen steht "NICHT ÖFFNEN", "Dienstag" und einmal nur "sorry".'; },
      take:function(){ return 'Bernard fasst nichts an, was Dr. Fred kalt stellt.'; },
      use:function(item){
        if(item) return 'Das gehört nicht in den Kühlschrank. Nichts gehört in diesen Kühlschrank.';
        A.sfx('door');
        A.say('Bernard öffnet den Kühlschrank. Etwas darin öffnet ein Auge.');
        A.say('"Nein danke."','bernard');
        return null;
      }
    });

    var tbl2 = M.grp(1.4,0,0.8);
    tbl2.add(M.box(3.8,0.22,2.1, 0xa08a68, 0, 1.08, 0));
    [[-1.7,-0.85],[1.7,-0.85],[-1.7,0.85],[1.7,0.85]].forEach(function(p){
      tbl2.add(M.box(0.22,1.08,0.22, 0x806a48, p[0], 0.54, p[1]));
    });
    tbl2.add(M.box(0.7,0.02,0.5, 0xf4f0e4, 0.7, 1.20, 0.2));
    HS('Küchentisch', tbl2, 1.4, 2.6, {
      primary:'look',
      look:function(){ return 'Auf dem Tisch liegt ein Zettel: "Bin im Labor. NICHTS ANFASSEN. — Fred"'; }
    });
  }

  if(era === 'future'){
    var disp = M.grp(4.2,0,-4.9);
    disp.add(M.box(2.8,4.2,1.7, 0x59407e, 0, 2.1, 0));
    disp.add(M.box(2.0,1.3,0.22, 0x49e6a0, 0, 2.9, 0.90, {emissive:0x1f8a5e}));
    var noz = M.cyl(0.42,0.42,0.55, 0x7ed957, 0, 0.95, 0.95, 14, {emissive:0x2a6a20});
    noz.name = 'sludgeNozzle'; disp.add(noz);
    disp.add(M.box(2.4,0.22,1.5, 0x2a1c3c, 0, 4.3, 0));
    var dl = new THREE.PointLight(0x49e6a0, 0.8, 8); dl.position.set(0,2.9,1.6); disp.add(dl);
    HS('Nährschlamm-Automat', disp, 4.2, -2.6, {
      primary:'use',
      look:function(){ return 'Ein Automat für grünen Nährschlamm. Drei Sorten: grün, grüner und Dienstag.'; },
      use:function(item){
        if(item) return 'Der Automat nimmt ausschließlich Tentakel-Kreditkarten.';
        A.sfx('zap');
        A.say('Laverne drückt den Knopf. Ein Schwall grüner Schlamm klatscht in einen Becher.');
        A.say('"Ich habe gerade wirklich überhaupt keinen Hunger."','laverne');
        return null;
      }
    });

    var tt = M.grp(1.0,0,1.0);
    tt.add(M.cyl(1.7,1.3,0.28, 0x6a4a94, 0, 1.15, 0, 18));
    tt.add(M.cyl(0.38,0.55,1.15, 0x6a4a94, 0, 0.58, 0, 14));
    tt.add(M.cyl(1.75,1.75,0.06, 0x49e6a0, 0, 0.98, 0, 18, {emissive:0x1f8a5e, noShadow:true}));
    HS('Schwebetisch', tt, 1.0, 2.8, {
      primary:'look',
      look:function(){ return 'Ein Tisch, der einen halben Meter über dem Boden schwebt. Die Zukunft hat ihre Prioritäten.'; }
    });

    var poster = M.box(2.4,1.6,0.08, 0xf0e8d0, -4.0, 3.6, -5.85);
    HS('Aushang', poster, -4.0, -2.6, {
      primary:'look',
      look:function(){ return '"MENSCH DER WOCHE" — darunter ein leerer Rahmen und ein Zettel: "Bewerbungen bitte an die Verwaltung."'; }
    });
  }

  placeEggs('kitchen', era, S, g, HS, A);
}

/* --------------------------------------------------------------- LABOR */
function buildLab(era, S, g, HS, A){
  var E = W.ERAS[era];
  shellInterior(g, E, {panel: era === 'future', dust: era === 'future' ? 0xa88ad8 : 0xfff0d0});

  HS('Tür zur Küche', M.box(2.2,3.6,0.5, 0x2a1a10, -7.4, 1.8, -5.8), -7.4, -2.9,
    {primary:'door', door:'kitchen', look:function(){ return 'Zurück in die Küche.'; }});

  var hatch = M.grp(-7.0, 0, 3.2);
  hatch.add(M.box(2.4,0.22,2.4, 0x4a3520, 0, 0.11, 0));
  hatch.add(M.box(2.0,0.30,2.0, 0x1a1220, 0, 0.04, 0, {noShadow:true}));
  hatch.add(M.box(2.5,0.16,0.5, 0x6a4a2a, 0, 0.30, 1.2));
  hatch.add(M.cyl(0.14,0.14,0.10, 0xb08a40, 0.8, 0.22, 0, 10));
  HS('Kellerluke', hatch, -6.0, 3.0, {
    primary:'door', door:'cellar',
    look:function(){ return 'Eine offene Luke im Boden. Darunter fuehrt eine Treppe in den Keller.'; }
  });

  var cj = M.chronoJohn(era);
  cj.position.set(5.6, 0, -2.4);
  if(S.f.diamondInstalled){
    var cjl = new THREE.PointLight(0x9fe4ff, 1.2, 9); cjl.position.set(0,2.4,1.4); cj.add(cjl);
  }
  HS('Chron-o-John', cj, 4.6, 0.2, {
    primary:'use',
    look:function(){
      return 'Eine Klokabine mit Antenne — Dr. Freds Zeitmaschine. Kleine Gegenstände lassen sich damit durch die Jahrhunderte spülen. ' +
        (S.f.diamondInstalled ? 'Die Kontrolllampe leuchtet grün: Der Antrieb läuft.'
                              : 'Ohne echten Diamanten im Antrieb bringt sie aber niemanden nach Hause.');
    },
    talk:function(){ return 'Mit einem Klo zu reden ist selbst für diese Familie zu viel.'; },
    take:function(){ return 'Etwas zu groß fürs Inventar.'; },
    use:function(item){
      if(item){ A.flush(item); return null; }
      if(S.f.diamondInstalled && S.f.valveClosed){ A.win(); return null; }
      if(S.f.diamondInstalled)
        return 'Der Antrieb läuft — aber solange der Sludge-o-Matic den Fluss vergiftet, bleibt die Zukunft lila. Erst das Ventil.';
      if(S.f.valveClosed)
        return 'Die Zukunft ist gerettet, aber ohne Diamant im Antrieb fliegt hier gar nichts.';
      return 'Ohne Energie tut die Kabine nur das, wofür Klos gemacht sind. Immerhin: Gegenstände kann man durchspülen.';
    }
  });

  if(era === 'past'){
    var bench = M.grp(-3.4,0,-4.6);
    bench.add(M.box(5.4,0.28,1.7, 0x7a5a34, 0, 1.18, 0));
    bench.add(M.box(0.32,1.18,0.32, 0x5f4426, -2.4, 0.59, 0));
    bench.add(M.box(0.32,1.18,0.32, 0x5f4426,  2.4, 0.59, 0));
    bench.add(M.box(5.4,2.6,0.22, 0x9a7a52, 0, 2.8, -0.76));
    for(var i=0;i<6;i++){
      bench.add(M.box(0.13,0.95,0.13, 0x8a8a8a, -2.1+i*0.85, 2.6, -0.62));
      bench.add(M.box(0.22,0.22,0.10, 0x6a4a2a, -2.1+i*0.85, 3.15, -0.62));
    }
    HS('Werkbank', bench, -3.4, -2.4, {
      primary:'look',
      look:function(){ return 'Die Werkbank der Bauleute: Hämmer, Zangen, Nägel — und Baupläne für ein Haus mit sehr merkwürdigem Keller.'; },
      use:function(){ return 'Hoagie hämmert ein bisschen herum. Es fühlt sich richtig gut an.'; }
    });

    if(!S.f.wrenchTaken){
      var wr = M.grp(-1.2, 1.36, -4.2);
      wr.add(M.box(1.2,0.11,0.24, 0x9aa2a8, 0, 0, 0));
      wr.add(M.box(0.32,0.11,0.46, 0x9aa2a8, -0.60, 0, 0));
      wr.add(M.box(0.32,0.11,0.46, 0x9aa2a8,  0.60, 0, 0.07));
      HS('Schraubenschlüssel', wr, -1.2, -2.4, {
        primary:'take',
        look:function(){ return 'Ein schwerer Schraubenschlüssel. Groß genug für jedes verrostete Ventil der Weltgeschichte.'; },
        take:function(){
          A.set('wrenchTaken', true); A.give('hoagie','wrench'); A.sfx('pick');
          A.say('"Werkzeug! Endlich etwas, womit ich umgehen kann."','hoagie');
          return null;
        }
      });
    }

    var plans = M.box(1.8,0.06,1.2, 0xe8dcbc, 2.6, 1.34, -4.6);
    plans.rotation.y = 0.2;
    HS('Baupläne', plans, 2.6, -2.4, {
      primary:'look',
      look:function(){ return 'Baupläne der Villa. Jemand hat mit Kohle "Geheimlabor" in den Keller gekritzelt und dreimal unterstrichen.'; },
      take:function(){ return 'Der Bauleiter braucht die noch.'; }
    });
  }

  if(era === 'present'){
    var som = M.grp(-3.6,0,-4.4);
    som.add(M.box(5.0,4.8,2.2, 0x6e7a84, 0, 2.4, 0));
    som.add(M.box(4.4,1.1,0.22, 0x0e1216, 0, 3.7, 1.15, {emissive:0x001a10}));
    som.add(M.box(3.7,0.65,0.18, S.f.valveClosed ? 0x49e6a0 : 0x7ed957, 0, 3.7, 1.22,
      {emissive: S.f.valveClosed ? 0x1f8a5e : 0x2a6a20, noShadow:true}));
    som.add(M.cyl(0.6,0.6,3.2, 0x7d8288, 2.9, 1.6, 0.2, 14));
    var tank = M.cyl(1.1,1.1,2.2, 0x8ad95a, 0, 5.9, 0, 16, {opacity:0.72, emissive:0x2a6a20});
    tank.name = 'sludgeTank'; som.add(tank);
    som.add(M.cyl(1.2,1.2,0.34, 0x50565c, 0, 7.1, 0, 16));
    for(var k=0;k<3;k++) som.add(M.box(0.3,0.3,0.12, k===0?0xff5544:0xffcc44, -1.6+k*0.7, 2.2, 1.14,
      {emissive: S.f.valveClosed ? 0x000000 : (k===0?0x882211:0x886611), noShadow:true}));
    HS('Sludge-o-Matic', som, -3.6, -2.0, {
      primary:'look',
      look:function(){
        return S.f.valveClosed
          ? 'Der Sludge-o-Matic steht still. Dr. Fred wird toben. Ausgezeichnet.'
          : 'Dr. Freds Sludge-o-Matic. Er verwandelt Abfall in Giftschlamm und den Fluss in Suppe.';
      }
    });

    var valve = M.grp(-0.6, 3.0, -3.1);
    var wheel = new THREE.Mesh(new THREE.TorusGeometry(0.62,0.14,10,20),
      M.mat(S.f.valveClosed ? 0x49e6a0 : 0xa8503a,
            {emissive: S.f.valveClosed ? 0x186a48 : 0x000000}));
    wheel.castShadow = true;
    if(S.f.valveClosed) wheel.rotation.z = 0.9;
    wheel.name = 'valveWheel';
    valve.add(wheel);
    for(var sp=0; sp<4; sp++){
      var spoke = M.box(1.1,0.09,0.09, S.f.valveClosed ? 0x3aa88a : 0x8a4030, 0,0,0);
      spoke.rotation.z = sp*Math.PI/4 + (S.f.valveClosed ? 0.9 : 0);
      valve.add(spoke);
    }
    valve.add(M.cyl(0.12,0.12,0.8, 0x8a8a8a, 0, 0, -0.4, 10));
    HS(S.f.valveClosed ? 'Ventil (geschlossen)' : 'Verrostetes Ventil', valve, -0.6, -1.8, {
      primary:'use',
      look:function(){
        return S.f.valveClosed
          ? 'Das Ventil ist zu. Der Sludge-o-Matic brummt beleidigt vor sich hin.'
          : 'Das Hauptventil des Sludge-o-Matic, völlig verrostet. Mit bloßen Händen unmöglich.';
      },
      take:function(){ return 'Das Ventil bleibt, wo es ist.'; },
      use:function(item){
        if(S.f.valveClosed) return 'Zu ist zu.';
        if(item === 'wrench'){
          A.set('valveClosed', true); A.sfx('solve');
          A.say('Bernard setzt den zweihundert Jahre alten Schraubenschlüssel an und stemmt sich dagegen.');
          A.say('KNIRSCH. KLONK. Das Ventil dreht sich.');
          A.say('"Kein Schlamm im Fluss. Kein Schlamm — kein mutiertes Tentakel."','bernard');
          return null;
        }
        if(item) return 'Damit bekommt Bernard das verrostete Ding nicht auf.';
        A.sfx('no');
        return 'Bernard zerrt am Ventil und wird nur rot im Gesicht. Er braucht Werkzeug.';
      }
    });

    var con = M.grp(2.8,0,-4.8);
    con.add(M.box(2.8,1.3,1.3, 0x3a4450, 0, 0.65, 0));
    var top = M.box(2.8,0.32,1.3, 0x4a5460, 0, 1.42, -0.1); top.rotation.x = -0.35;
    con.add(top);
    con.add(M.box(0.55,0.55,0.55, 0x161d24, 0, 1.42, 0.36));
    con.add(M.box(0.32,0.32,0.11, 0xff4444, -0.95, 1.50, 0.31,
      {emissive: S.f.diamondInstalled ? 0x000000 : 0x881111, noShadow:true}));
    con.add(M.box(0.32,0.32,0.11, 0x44ff88,  0.95, 1.50, 0.31,
      {emissive: S.f.diamondInstalled ? 0x118844 : 0x000000, noShadow:true}));
    if(S.f.diamondInstalled){
      var gem = M.ball(0.26, 0xdff6ff, 0, 1.70, 0.36, {emissive:0x5fb8e8});
      gem.name = 'powerGem'; con.add(gem);
    }
    HS('Energiekonsole', con, 2.8, -2.4, {
      primary:'use',
      look:function(){
        return S.f.diamondInstalled
          ? 'Der Diamant sitzt in der Fassung, die Anzeige steht im grünen Bereich. Der Chron-o-John hat Saft.'
          : 'Die Antriebskonsole. Hier steckte ein billiger Zirkon — deshalb ist alles explodiert. Es gehört ein ECHTER Diamant hinein.';
      },
      take:function(){
        return S.f.diamondInstalled ? 'Den Diamanten wieder rausnehmen? Ganz sicher nicht.'
                                    : 'Die Konsole ist festgeschraubt.';
      },
      use:function(item){
        if(S.f.diamondInstalled) return 'Der Antrieb läuft bereits.';
        if(item === 'diamond'){
          A.drop('bernard','diamond'); A.set('diamondInstalled', true); A.sfx('solve');
          A.say('Bernard setzt den Diamanten in die Fassung. Die Konsole summt zufrieden.');
          A.say('"Voller Antrieb. Jetzt muss es die Zukunft nur noch geben."','bernard');
          return null;
        }
        if(item) return 'Das passt nicht in eine Diamantfassung.';
        A.sfx('no');
        return 'Die Fassung ist leer. Hier fehlt ein echter Diamant.';
      }
    });
  }

  if(era === 'future'){
    var throne = M.grp(-3.8,0,-4.0);
    throne.add(M.box(3.0,0.7,2.4, 0x241436, 0, 0.35, 0));
    throne.add(M.box(3.2,3.8,0.55, 0x241436, 0, 2.2, -0.92));
    throne.add(M.box(3.3,0.26,0.68, 0x49e6a0, 0, 4.0, -0.92, {emissive:0x1f8a5e, noShadow:true}));
    throne.add(M.ball(0.32, 0x49e6a0, -1.3, 4.2, -0.92, {emissive:0x1f8a5e}));
    throne.add(M.ball(0.32, 0x49e6a0,  1.3, 4.2, -0.92, {emissive:0x1f8a5e}));
    if(!S.f.valveClosed){
      var pt = M.tentacle(0xb555ff, 2.3, {crown:true});
      pt.position.set(0, 0.70, 0.25);
      pt.name = 'purpleTent';
      throne.add(pt);
      var tl = new THREE.PointLight(0xb555ff, 0.9, 10); tl.position.set(0,3,1.5); throne.add(tl);
    }
    HS(S.f.valveClosed ? 'Leerer Thron' : 'Lila Tentakel', throne, -3.2, -1.6, {
      primary:'talk',
      look:function(){
        return S.f.valveClosed
          ? 'Ein leerer, verstaubter Thron. Als hätte hier nie jemand gesessen. Weil auch nie jemand hier saß.'
          : 'Das lila Tentakel: Arme, Krone, Thron und eine bemerkenswert hohe Meinung von sich selbst.';
      },
      talk:function(){
        if(S.f.valveClosed){ A.say('Der Thron antwortet nicht. Ausgesprochen beruhigend.'); return null; }
        A.dialog('Lila Tentakel', function(){
          return [
            {q:'Wie hast du die Welt erobert?', a:function(){
              A.say('"Ha! Ein Mensch! Wie niedlich, dass du fragst."','tent');
              A.say('"Zweihundert Jahre. Mit ARMEN. Und mit sehr vielen Formularen."','tent');
              A.say('"Und das alles nur, weil ich damals diesen herrlichen grünen Schlamm getrunken habe."','tent');
              return true;
            }},
            {q:'Woher kam dieser Schlamm?', a:function(){
              A.say('"Aus dem Fluss! Dr. Fred hat ihn hineingeleitet, der gute Mann."','tent');
              A.say('"Wenn es den Schlamm nicht gegeben hätte, wäre ich heute ein gewöhnliches Tentakel."','tent');
              A.say('"Aber das kann mir ja niemand mehr nehmen. Niemand!"','tent');
              A.say('"...warum lächelst du so?"','tent');
              return true;
            }},
            {q:'Nette Krone.', a:function(){
              A.say('"Nicht wahr? Handgefertigt. Von mir. Mit meinen ARMEN."','tent');
              A.say('"Ich erwähne die Arme gern. Ich hatte lange keine."','tent');
              return true;
            }},
            {q:'Und wenn jemand den Schlamm abstellt?', a:function(){
              A.say('"Abstellen? Das Ventil ist seit zweihundert Jahren verrostet."','tent');
              A.say('"Dafür bräuchte man Werkzeug. Sehr altes, sehr gutes Werkzeug."','tent');
              A.say('"Zum Glück gibt es so etwas nicht mehr. Hahaha!"','tent');
              A.say('"...hahaha?"','tent');
              return true;
            }},
            {q:'Ich lass dich mal weiterplanen.', a:null}
          ];
        });
        return null;
      },
      take:function(){ return 'Laverne fasst kein Tentakel an. Prinzipiell.'; },
      use:function(item){
        if(item === 'vinegar') return 'Essig über ein Tentakel zu kippen wäre unhöflich. Und sehr, sehr laut.';
        return 'Besser nicht.';
      }
    });

    var scr = M.grp(2.6,0,-5.6);
    scr.add(M.box(6.6,3.6,0.12, 0x2a1c3c, 0, 3.1, -0.10));
    for(var r2=0;r2<2;r2++) for(var c2=0;c2<3;c2++){
      var mon = M.box(1.7,1.2,0.16, 0x49e6a0, -2.0+c2*2.0, 2.3+r2*1.5, 0,
        {emissive: S.f.valveClosed ? 0x0a2a1c : 0x1f8a5e, noShadow:true});
      mon.name = 'monitor'+(r2*3+c2);
      scr.add(mon);
    }
    var ml = new THREE.PointLight(0x49e6a0, S.f.valveClosed ? 0.2 : 0.9, 12);
    ml.position.set(0,3,2); scr.add(ml);
    HS('Monitorwand', scr, 2.6, -2.6, {
      primary:'look',
      look:function(){
        return S.f.valveClosed
          ? 'Alle Monitore zeigen Rauschen. Die Tentakel-Weltregierung hat es nie gegeben.'
          : 'Auf den Monitoren: Tentakel beim Marschieren, Tentakel beim Salutieren, Tentakel beim Kaffeetrinken.';
      },
      use:function(){ return 'Laverne drückt wahllos Knöpfe. Ein Monitor zeigt jetzt Katzenvideos aus dem Jahr 2020.'; }
    });
  }

  placeEggs('lab', era, S, g, HS, A);
}

/* ----------------------------------------------------------- DACHBODEN */
function buildAttic(era, S, g, HS, A){
  var E = W.ERAS[era];
  shellAttic(g, E);

  HS('Dachluke', M.box(1.8,0.4,1.8, 0x4a3520, 5.2, 0.05, 2.4), 4.2, 2.2, {
    primary:'door', door:'yard',
    look:function(){ return 'Die offene Dachluke. Von hier geht es über die Äste wieder nach unten.'; }
  });

  // Gerümpel, in jeder Epoche
  var crate = M.grp(-5.0, 0, 1.6);
  crate.add(M.box(1.5,1.5,1.5, 0x7a5a34, 0, 0.75, 0));
  crate.add(M.box(1.6,0.14,1.6, 0x5f4426, 0, 1.5, 0));
  crate.add(M.box(1.2,1.2,1.2, 0x6d4c28, 0.3, 2.2, 0.2));
  HS('Kisten', crate, -4.2, 2.4, {
    primary:'look',
    look:function(){
      if(era === 'present') return 'Kisten voller Dinge, die Dr. Fred nie wieder braucht und trotzdem nie wegwirft.';
      if(era === 'future')  return 'Museumskisten, sauber beschriftet: "Menschen — Alltagsgegenstände, unerheblich".';
      return 'Ein paar leere Kisten. Der Dachstuhl ist noch gar nicht fertig.';
    },
    use:function(){ return 'Umsonst gewühlt. Nur Staub und alte Rechnungen.'; }
  });

  if(era === 'present'){
    /* Hamster im Käfig — Kette D */
    var stand = M.grp(1.6, 0, -2.2);
    stand.add(M.box(1.8,1.1,1.4, 0x6a5540, 0, 0.55, 0));
    if(!S.f.hamsterTaken){
      var cage = M.grp(0, 1.1, 0);
      cage.add(M.box(1.6,0.12,1.2, 0x9aa0a4, 0, 0.06, 0));
      for(var b=0;b<9;b++) cage.add(M.cyl(0.03,0.03,1.1, 0xc8ccd0, -0.7+b*0.175, 0.66, 0.55, 6));
      for(var b2=0;b2<9;b2++) cage.add(M.cyl(0.03,0.03,1.1, 0xc8ccd0, -0.7+b2*0.175, 0.66, -0.55, 6));
      cage.add(M.box(1.65,0.1,1.25, 0x9aa0a4, 0, 1.26, 0));
      var ham = M.grp(0, 0.35, 0);
      ham.add(M.ball(0.26, 0xd8a860, 0, 0, 0));
      ham.add(M.ball(0.17, 0xe8c088, 0, 0.05, 0.22));
      ham.add(M.ball(0.06, 0xe8c088,-0.13, 0.20, 0.02));
      ham.add(M.ball(0.06, 0xe8c088, 0.13, 0.20, 0.02));
      ham.add(M.ball(0.03, 0x101010,-0.07, 0.08, 0.34));
      ham.add(M.ball(0.03, 0x101010, 0.07, 0.08, 0.34));
      ham.name = 'hamster';
      cage.add(ham);
      stand.add(cage);
      HS('Hamsterkäfig', stand, 1.6, -1.2, {
        primary:'take',
        look:function(){ return 'Ein Hamsterkäfig. Auf dem Schild steht "CHUCK". Chuck rennt seit Jahren gegen ein Rad, das gar nicht da ist.'; },
        take:function(){
          A.set('hamsterTaken', true); A.give('bernard','hamster'); A.sfx('squeak');
          A.say('Bernard hebt Chuck aus dem Käfig. Chuck strampelt begeistert weiter.');
          A.say('"Du hast mehr Energie als dieses ganze Haus. Das könnte nützlich sein."','bernard');
          return null;
        },
        use:function(item){ return item ? 'Chuck interessiert sich nicht dafür.' : 'Chuck quiekt zur Begrüßung.'; }
      });
    } else {
      stand.add(M.box(1.6,0.12,1.2, 0x9aa0a4, 0, 1.16, 0));
      HS('Leerer Käfig', stand, 1.6, -1.2, {
        primary:'look',
        look:function(){ return 'Ein leerer Hamsterkäfig. Chuck ist unterwegs — in einer sehr fernen Zukunft.'; }
      });
    }

    var diary = M.box(0.9,0.16,1.2, 0x7a2a2a, -1.6, 1.3, -3.4);
    diary.rotation.y = -0.3;
    var deskD = M.grp(-1.6,0,-3.4);
    deskD.add(M.box(2.2,1.2,1.4, 0x6a5540, 0, 0.6, 0));
    g.add(deskD);
    HS('Dr. Freds Tagebuch', diary, -1.6, -1.4, {
      primary:'look',
      look:function(){
        A.say('"Tag 412: Der Sludge-o-Matic läuft. Der Fluss ist grün. Die Nachbarn schweigen."','sys');
        A.say('"Tag 413: Purpurnes Tentakel hat vom Fluss getrunken. Es wirkt... ehrgeizig."','sys');
        A.say('"Tag 414: Ich sollte das Ventil zudrehen. Morgen. Ganz bestimmt morgen."','sys');
        return null;
      },
      take:function(){ return 'Das Tagebuch bleibt hier. Manches will man nicht dabeihaben.'; }
    });
  }

  if(era === 'future'){
    /* Hamsterrad-Generator + Vitrine — Kette D */
    var gen = M.grp(1.8, 0, -2.4);
    gen.add(M.box(2.2,1.0,1.8, 0x3d2a58, 0, 0.5, 0));
    var wheel = new THREE.Mesh(new THREE.TorusGeometry(0.85,0.11,10,22),
      M.mat(S.f.hamsterInWheel ? 0x49e6a0 : 0x8a7ab0,
            {emissive: S.f.hamsterInWheel ? 0x1f8a5e : 0x000000}));
    wheel.position.set(0,1.75,0); wheel.castShadow = true;
    wheel.name = 'hamsterWheel';
    gen.add(wheel);
    for(var r3=0;r3<8;r3++){
      wheel.add(M.box(0.06,0.06,0.62, 0x8a7ab0,
        Math.cos(r3*0.785)*0.85, Math.sin(r3*0.785)*0.85, 0));
    }
    var axle = M.cyl(0.09,0.09,1.0, 0x6a5a8a, 0, 1.75, 0, 8);
    axle.rotation.x = Math.PI/2;
    gen.add(axle);
    if(S.f.hamsterInWheel){
      var ham2 = M.grp(0, 1.05, 0);
      ham2.add(M.ball(0.26, 0xd8a860, 0, 0, 0));
      ham2.add(M.ball(0.17, 0xe8c088, 0, 0.05, 0.22));
      ham2.add(M.ball(0.06, 0xe8c088,-0.13, 0.20, 0.02));
      ham2.add(M.ball(0.06, 0xe8c088, 0.13, 0.20, 0.02));
      ham2.name = 'hamsterRun';
      gen.add(ham2);
      var genL = new THREE.PointLight(0x49e6a0, 1.0, 8); genL.position.set(0,2.2,0.8); gen.add(genL);
    }
    HS(S.f.hamsterInWheel ? 'Laufender Generator' : 'Hamsterrad-Generator', gen, 1.8, -1.2, {
      primary:'use',
      look:function(){
        return S.f.hamsterInWheel
          ? 'Chuck rennt. Der Generator summt. Die Vitrine daneben ist entriegelt. Alles hat seinen Sinn.'
          : 'Ein Notstromgenerator mit Laufrad — Museumstechnik, "betrieben durch ein Kleinsäugetier". Das Laufrad steht still, es fehlt das Kleinsäugetier.';
      },
      use:function(item){
        if(S.f.hamsterInWheel) return 'Chuck rennt bereits mit vollem Einsatz.';
        if(item === 'hamster'){
          A.drop('laverne','hamster'); A.set('hamsterInWheel', true); A.sfx('solve');
          A.say('Laverne setzt Chuck ins Laufrad. Chuck begreift die Aufgabe sofort.');
          A.say('Der Generator surrt an. In der Vitrine klackt ein Schloss.');
          A.say('"Vierhundert Jahre Technik — und am Ende hängt alles an einem Hamster."','laverne');
          return null;
        }
        if(item) return 'Das passt nicht ins Laufrad.';
        A.sfx('no');
        return 'Das Laufrad dreht sich nicht von allein. Es fehlt jemand, der rennt.';
      },
      take:function(){ return 'Der Generator ist festgeschraubt.'; }
    });

    var vit = M.grp(-2.0, 0, -3.2);
    vit.add(M.box(2.4,0.35,1.6, 0x3d2a58, 0, 0.18, 0));
    var glass = M.box(2.2,2.6,1.4, 0xaaddff, 0, 1.65, 0,
      {opacity: S.f.hamsterInWheel ? 0.10 : 0.30, emissive:0x113344, noShadow:true});
    glass.name = 'vitrineGlass';
    vit.add(glass);
    for(var e2=0;e2<4;e2++){
      vit.add(M.cyl(0.05,0.05,2.6, 0x8a7ab0, (e2<2?-1:1)*1.05, 1.65, (e2%2?-1:1)*0.68, 6));
    }
    vit.add(M.box(2.5,0.2,1.7, 0x3d2a58, 0, 3.05, 0));
    if(!S.f.costumeTaken){
      var cos = M.tentacle(0x9b45d8, 1.5, {arms:false});
      cos.position.set(0, 0.35, 0);
      cos.scale.setScalar(0.95);
      vit.add(cos);
    }
    vit.add(M.box(0.9,0.5,0.05, 0xe8e0d0, 0, 0.55, 0.74));
    HS('Museumsvitrine', vit, -2.0, -1.4, {
      primary: (S.f.hamsterInWheel && !S.f.costumeTaken) ? 'take' : 'look',
      look:function(){
        if(S.f.costumeTaken) return 'Eine leere Vitrine. Das Schild darunter: "Tentakelkostüm, Nachbau, Leihgabe".';
        return S.f.hamsterInWheel
          ? 'Die Vitrine ist entriegelt. Darin hängt ein lila Tentakelkostüm.'
          : 'Eine Vitrine mit einem lila Tentakelkostüm. Das Schloss ist elektrisch — und der Strom ist seit Jahrhunderten weg.';
      },
      take:function(){
        if(S.f.costumeTaken) return 'Die Vitrine ist leer.';
        if(!S.f.hamsterInWheel){
          A.sfx('no');
          return 'Verriegelt. Ohne Strom bleibt das Schloss zu.';
        }
        A.set('costumeTaken', true); A.give('laverne','costume'); A.sfx('pick');
        A.say('Laverne nimmt das Kostüm aus der Vitrine.');
        A.say('"Lila, schlauchförmig, kratzt wie Hölle. Genau mein Stil."','laverne');
        return null;
      },
      use:function(item){
        if(item === 'costume'){ A.wear(); return null; }
        if(item) return 'Das gehört nicht in die Vitrine.';
        return this.take.call(this);
      }
    });

    var plaque = M.box(3.0,1.4,0.1, 0xe8e0d0, 3.6, 2.6, -4.45);
    HS('Museumstafel', plaque, 3.6, -2.0, {
      primary:'look',
      look:function(){
        return S.f.valveClosed
          ? '"MUSEUM DER MENSCHHEIT — geschlossen wegen anhaltender Existenz der Menschheit."'
          : '"MUSEUM DER MENSCHHEIT. Die Menschen waren eine possierliche Übergangsform. Bitte nichts anfassen."';
      }
    });
  }

  if(era === 'past'){
    HS('Offener Dachstuhl', M.box(9,0.3,9, 0x000000, 0, 4.0, 0.6, {opacity:0.0, noShadow:true}), 0, 1.0, {
      primary:'look',
      look:function(){ return 'Hier oben ist noch gar nichts. Nur Balken, Himmel und ein sehr weiter Blick nach unten.'; }
    });
  }

  placeEggs('attic', era, S, g, HS, A);
}

/* ======================================================================
   Gegenstand auf Gegenstand — meist nur ein guter Spruch
   ====================================================================== */
W.COMBOS = {
  'coal|wine':      'Kohle in den Wein? Das ergäbe den mit Abstand schlechtesten Jahrgang der Geschichte.',
  'chicken|hamster':'Chuck beschnuppert das Gummihuhn ausgiebig und wirkt danach zutiefst beleidigt.',
  'costume|hamster':'Ein Hamster im Tentakelkostüm. Verlockend. Aber nein.',
  'diamond|wrench': 'Kurz zuckt die Hand. Nein — Diamanten schlägt man nicht mit Werkzeug.',
  'chicken|vinegar':'Der Essig zischt am Gummi. Das Huhn quietscht vorwurfsvoll.',
  'acorn|hamster':  'Chuck nimmt die Eichel, dreht sie einmal und gibt sie zurück. Zu groß für seine Backen.',
  'acorn|coal':     'Eine Eichel und ein Klumpen Kohle. Beide brauchen vor allem eines: sehr viel Zeit.',
  'diamond|vinegar':'Der Essig perlt am Diamanten ab. Kohlenstoff lässt sich nicht beeindrucken.',
  'coal|wrench':    'Man könnte die Kohle zerschlagen. Man hätte dann sehr kleine Kohle.',
  'costume|chicken':'Ein Gummihuhn im Tentakelkostüm wäre die perfekte Tarnung — für ein Gummihuhn.',
  'diamond|hamster':'Chuck begutachtet den Diamanten fachmännisch und findet ihn ungenießbar.',
  'vinegar|wine':   'Alt und jung im selben Griff. Der eine wird noch, der andere war mal.',
  'costume|diamond':'Ein Tentakel mit Diamant. Ziemlich protzig, selbst für die Zukunft.',
  'chicken|wrench': 'Werkzeug trifft Gummihuhn. Das Huhn gewinnt nach Punkten.',
  'acorn|wine':     'Eiche und Wein. In zweihundert Jahren stehen beide gut da.'
};

W.combo = function(a, b){
  var k = [a, b].sort().join('|');
  return W.COMBOS[k] || null;
};

/* ---------------------------------------------------------------------- */
W.BUILDERS = {yard:buildYard, kitchen:buildKitchen, lab:buildLab,
              attic:buildAttic, cellar:buildCellar};

/* Erreichbarkeit: Der Dachboden hängt am Baum. */
/* Reihenfolge und Kurznamen für die Übersichtskarte */
W.ROOM_ORDER = ['yard','kitchen','lab','cellar','attic'];
W.ROOM_SHORT = {yard:'Hof', kitchen:'Küche', lab:'Labor', cellar:'Keller', attic:'Dachboden'};
W.ERA_SHORT  = {past:'1776', present:'Gegenwart', future:'2200'};

W.canEnter = function(room, era, S){
  if(room !== 'attic') return true;
  if(!S.f.treePlanted) return false;
  if(era === 'past')   return false;
  return true;
};


/* ======================================================================
   KELLER — der fünfte Raum, erreichbar über eine Luke im Labor
   ====================================================================== */
function shellCellar(g, E, era){
  var floorTex = M.tex.concrete(era === 'future' ? '#1a1226' : '#4a3524', 5);
  var fl = new THREE.Mesh(new THREE.BoxGeometry(17, 0.4, 20), M.mat(0xffffff,{map:floorTex}));
  fl.position.set(0,-0.2,2); fl.receiveShadow = true; fl.userData.floor = true;
  g.add(fl);

  var wallTex = M.tex.bricks(era === 'future' ? '#2e1f44' : '#6b5236',
                             era === 'future' ? '#180f28' : '#4a3826', 5);
  var back = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 0.4), M.mat(0xffffff,{map:wallTex}));
  back.position.set(0, 6.0, -5.6); back.receiveShadow = true; g.add(back);

  var side = new THREE.Mesh(new THREE.BoxGeometry(0.4, 12, 22), M.mat(0xffffff,{map:wallTex}));
  side.position.set(-8.5, 6.0, 4); side.receiveShadow = true; g.add(side);
  var side2 = side.clone(); side2.position.x = 8.5; g.add(side2);

  // Keine geschlossene Decke: die Kamera blickt von schräg oben in den Keller.
  // Stattdessen ein dunkler Deckenstreifen weit hinten, damit oben nichts durchscheint.
  g.add(M.box(17, 0.4, 8, E.wallMortar, 0, 8.6, -3.0, {noShadow:true}));

  // Gewölbebögen
  for(var a=-1;a<=1;a++){
    var arc = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.34, 8, 18, Math.PI),
      M.mat(E.wallA));
    arc.position.set(a*5.4, 3.6, -5.2);
    arc.material.color.set(era === 'future' ? '#3d2b58' : '#8a6f4a');
    arc.castShadow = true;
    g.add(arc);
    g.add(M.box(0.7,3.7,0.7, E.wallA, a*5.4-2.5, 1.85, -5.2));
    g.add(M.box(0.7,3.7,0.7, E.wallA, a*5.4+2.5, 1.85, -5.2));
  }

  g.add(M.dust(200, 15, 0xcfc0a0));

  var cone = M.lightShaft(0.4, 4.6, 5.4, era === 'future' ? 0x49e6a0 : 0xffcc88, 0.075);
  cone.position.set(0, 2.9, 0);
  g.add(cone);
  g.add(M.motes(80, 13, 4, era === 'future' ? 0x49e6a0 : 0xffcc88, 0.11));
  return fl;
}

function buildCellar(era, S, g, HS, A){
  var E = W.ERAS[era];
  shellCellar(g, E, era);

  HS('Treppe nach oben', M.box(3.0,0.5,2.6, 0x4a3520, 6.4, 0.12, 3.4), 5.4, 3.0, {
    primary:'door', door:'lab',
    look:function(){ return 'Eine steile Treppe zurück nach oben.'; }
  });
  // Stufen als Deko
  for(var st=0; st<5; st++)
    g.add(M.box(3.0,0.28,0.55, 0x5a4530, 6.4, 0.14+st*0.28, 4.4+st*0.55));

  // Kellerlampe
  var lamp = new THREE.PointLight(era === 'future' ? 0x49e6a0 : 0xffcc88, 1.25, 15);
  lamp.position.set(0, 5.6, 0);
  lamp.name = 'cellarLamp';
  g.add(lamp);
  g.add(M.cyl(0.4,0.5,0.3, 0x3a3a40, 0, 5.9, 0, 12, {noShadow:true}));
  g.add(M.ball(0.24, era === 'future' ? 0x49e6a0 : 0xffdd99, 0, 5.6, 0,
    {emissive: era === 'future' ? 0x1f8a5e : 0x8a6a20, noShadow:true}));

  if(era === 'past'){
    var barrels = M.grp(-5.0, 0, -1.6);
    for(var b=0;b<3;b++){
      var br = M.cyl(0.85,0.72,1.7, 0x7a5530, (b%2)*1.9, 0.85, (b>1?1.7:0), 14);
      barrels.add(br);
      barrels.add(M.cyl(0.88,0.88,0.10, 0x4a3520, (b%2)*1.9, 0.45, (b>1?1.7:0), 14));
      barrels.add(M.cyl(0.88,0.88,0.10, 0x4a3520, (b%2)*1.9, 1.25, (b>1?1.7:0), 14));
    }
    HS('Weinfässer', barrels, -4.2, 0.6, {
      primary:'look',
      look:function(){ return 'Drei Fässer. Auf einem steht mit Kreide: "1776 — nicht anfassen, wird noch was."'; },
      use:function(item){
        if(item === 'wine') return 'Eine einzelne Flasche unter drei Fässern verstecken? Da findet sie nie jemand wieder.';
        return 'Hoagie klopft gegen das Holz. Klingt voll. Sehr voll.';
      }
    });

    var shelf = M.grp(3.4, 0, -4.8);
    shelf.add(M.box(4.4,0.2,1.1, 0x6b4a2a, 0, 1.1, 0));
    shelf.add(M.box(4.4,0.2,1.1, 0x6b4a2a, 0, 2.3, 0));
    shelf.add(M.box(0.2,2.5,1.1, 0x6b4a2a, -2.1, 1.25, 0));
    shelf.add(M.box(0.2,2.5,1.1, 0x6b4a2a,  2.1, 1.25, 0));
    HS('Vorratsregal', shelf, 3.4, -2.6, {
      primary:'look',
      look:function(){ return 'Ein Regal voller Einmachgläser. Der Inhalt ist überwiegend braun und überwiegend fragwürdig.'; }
    });
  }

  if(era === 'present'){
    var boiler = M.grp(-4.6, 0, -3.8);
    boiler.add(M.cyl(1.3,1.3,4.0, 0x5a5f66, 0, 2.0, 0, 16));
    boiler.add(M.cyl(1.45,1.45,0.3, 0x44484e, 0, 0.15, 0, 16));
    boiler.add(M.cyl(1.45,1.45,0.3, 0x44484e, 0, 3.9, 0, 16));
    boiler.add(M.cyl(0.3,0.3,2.6, 0x6a7078, 1.5, 3.4, 0, 10));
    boiler.add(M.box(0.7,0.7,0.2, 0x1a1e24, 0, 2.2, 1.32, {emissive:0x331100}));
    boiler.add(M.ball(0.22, 0xff7733, 0, 2.2, 1.40, {emissive:0x992200, noShadow:true}));
    HS('Heizkessel', boiler, -4.0, -1.8, {
      primary:'look',
      look:function(){ return 'Ein Heizkessel, der bedrohlich blubbert. Ein handgeschriebenes Schild warnt: "Nicht über 8 stellen. Nie wieder."'; },
      use:function(item){
        if(item) return 'Da hinein wirft Bernard ganz sicher nichts.';
        A.sfx('no');
        return 'Bernard lässt die Finger davon. Sehr vernünftig.';
      }
    });

    var junk = M.grp(3.0, 0, -1.0);
    junk.add(M.box(2.0,1.0,1.4, 0x7a6a58, 0, 0.5, 0));
    junk.add(M.box(1.4,0.9,1.0, 0x6a5a48, 0.4, 1.45, 0.2));
    junk.add(M.cyl(0.5,0.5,1.2, 0x8a7a68, -1.2, 0.6, 0.6, 12));
    HS('Gerümpelhaufen', junk, 3.0, 1.0, {
      primary:'use',
      look:function(){ return 'Ein Berg aus Dingen, die Dr. Fred "später bestimmt noch braucht". Der Staub sagt etwas anderes.'; },
      use:function(item){
        if(item) return 'Das kommt nicht auf den Haufen, sonst findet es nie wieder jemand.';
        return 'Bernard wühlt kurz. Eine Rechnung von 1987, ein Schuh, ein Kabel ohne Enden.';
      }
    });
  }

  if(era === 'future'){
    /* Bonus: Schacht mit Stromkabel — Gummihuhn öffnet das Geheimfach */
    var pit = M.grp(-3.6, 0, 0.4);
    pit.add(M.box(5.0,0.3,3.4, 0x120c1c, 0, 0.02, 0, {noShadow:true}));
    pit.add(M.box(5.4,0.3,0.4, 0x3a2a52, 0, 0.16, 1.9));
    pit.add(M.box(5.4,0.3,0.4, 0x3a2a52, 0, 0.16,-1.9));
    var cable = M.cyl(0.06,0.06,5.6, 0x49e6a0, 0, 3.2, 0, 8, {emissive:0x1f8a5e});
    cable.rotation.z = Math.PI/2;
    cable.name = 'cellarCable';
    pit.add(cable);
    HS('Wartungsschacht', pit, -3.6, 2.6, {
      primary:'use',
      look:function(){
        return S.f.secretOpen
          ? 'Der Schacht. Auf der anderen Seite steht das Geheimfach offen.'
          : 'Ein tiefer Wartungsschacht. Darüber spannt sich ein Stromkabel zur anderen Seite — dort ist eine Wandnische. Springen wäre unklug.';
      },
      use:function(item){
        if(S.f.secretOpen) return 'Laverne war schon drüben. Einmal reicht.';
        if(item === 'chicken'){
          A.set('secretOpen', true); A.sfx('chicken'); A.sfx('solve');
          A.say('Laverne hängt das Gummihuhn mit der Rolle über das Kabel und rutscht hinüber.');
          A.say('"Ein Gummihuhn mit einer Rolle in der Mitte. Natürlich. Warum auch nicht."','laverne');
          A.say('Drüben öffnet sich eine Wandnische.','sys');
          return null;
        }
        if(item) return 'Damit kommt Laverne nicht über den Schacht.';
        A.sfx('no');
        return 'Zu weit zum Springen. Über dem Schacht hängt aber ein Kabel — man bräuchte etwas zum Darüberrutschen.';
      },
      take:function(){ return 'Der Schacht bleibt, wo er ist.'; }
    });

    if(S.f.secretOpen){
      var niche = M.grp(-7.4, 0, -3.0);
      niche.add(M.box(2.2,2.6,0.6, 0x1a1226, 0, 1.5, 0));
      var ape = M.grp(0, 0.4, 0.3);
      ape.add(M.box(0.7,0.9,0.5, 0x5a4330, 0, 0.45, 0));
      ape.add(M.ball(0.24, 0x6a5340, -0.28, 1.05, 0));
      ape.add(M.ball(0.24, 0x6a5340,  0.00, 1.20, 0));
      ape.add(M.ball(0.24, 0x6a5340,  0.28, 1.05, 0));
      ape.name = 'threeHeaded';
      niche.add(ape);
      HS('Wandnische', niche, -6.4, -1.4, {
        primary:'look', egg:'monkey-ape',
        look:function(){
          return 'In der Nische steht eine kleine Statue: ein Affe mit drei Köpfen. Auf dem Sockel steht "Sieht man selten."';
        }
      });
    }

    var rack = M.grp(3.6, 0, -4.4);
    for(var r=0;r<3;r++){
      rack.add(M.box(4.6,0.18,1.2, 0x3d2a58, 0, 1.0+r*1.3, 0));
      for(var d2=0; d2<6; d2++)
        rack.add(M.box(0.22,0.9,0.9, d2%2 ? 0x49e6a0 : 0x7a5aa8, -1.9+d2*0.76, 1.55+r*1.3, 0,
          {emissive: d2%2 ? 0x14523a : 0x000000}));
    }
    HS('Datenarchiv', rack, 3.6, -2.4, {
      primary:'look',
      look:function(){ return 'Das Archiv der Tentakelverwaltung. Die Beschriftungen reichen von "Akte 1" bis "Akte 9.400.112".'; },
      use:function(){ return 'Laverne zieht eine Akte heraus: "Beschwerden über Nährschlamm, Band 12 von 4000."'; }
    });
  }

  placeEggs('cellar', era, S, g, HS, A);
}

/* ======================================================================
   Versteckte Anspielungen — zentral gepflegt, in den Räumen verteilt
   ====================================================================== */
W.EGGS = [
  { id:'maniac-meteor', room:'cellar', era:'present', name:'Alter Meteorit',
    x:-1.0, z:2.6, wx:-1.0, wz:4.0, make:function(){ return M.meteor(); },
    look:'Ein purpurroter Meteorit im Keller. Er summt leise und wirkt beleidigt. Auf einem Zettel daneben: "Zurück in den Swimmingpool? — F."' },

  { id:'loom-wheel', room:'cellar', era:'past', name:'Spinnrad',
    x:6.6, z:-2.0, wx:5.6, wz:-1.0, make:function(){ return M.loomWheel(); },
    look:'Ein Spinnrad mit acht kleinen Kerben, jede in einem anderen Ton gestimmt. Hoagie schlägt vier davon an — E, D, Fis, H — und irgendwo öffnet sich vermutlich etwas.',
    act:function(A){ A.sfx('loom'); } },

  { id:'monkey-chicken', room:'cellar', era:'past', name:'Gummihuhn',
    x:1.0, z:1.6, wx:1.0, wz:3.0, make:function(){ return M.rubberChicken(); },
    look:'Ein Gummihuhn mit einer Rolle in der Mitte. In einem Keller von 1776. Dafür gibt es keine vernünftige Erklärung — und Hoagie sucht auch keine.',
    take:'chicken' },

  { id:'fullthrottle-helmet', room:'cellar', era:'present', name:'Motorradhelm',
    x:5.4, z:0.6, wx:5.0, wz:2.0, make:function(){ return M.helmet(); },
    look:'Ein zerkratzter Motorradhelm mit rotem Streifen. Innen klebt ein Aufkleber: "Wenn du das lesen kannst, ist deine Maschine kaputt."' },

  { id:'starwars-saber', room:'cellar', era:'future', name:'Metallgriff',
    x:6.8, z:1.4, wx:5.8, wz:2.2, make:function(){
      var g = M.grp();
      g.add(M.cyl(0.11,0.11,0.62, 0x9aa2a8, 0, 0.31, 0, 14));
      g.add(M.cyl(0.13,0.13,0.09, 0x1a1e24, 0, 0.42, 0, 14));
      g.add(M.box(0.06,0.06,0.10, 0xcc2222, 0.11, 0.24, 0, {emissive:0x661111}));
      g.add(M.box(0.9,0.12,0.7, 0x2a1c3c, 0, 0.03, 0));
      return g;
    },
    look:'Ein polierter Metallgriff mit einem roten Knopf. Laverne drückt ihn. Ein tiefes Summen, ein Lichtstreifen — und ein Loch in der Kellerdecke. Sie legt ihn schnell wieder hin.',
    act:function(A){ A.sfx('saber'); } },

  { id:'starwars-carbonite', room:'attic', era:'future', name:'Karbonitblock',
    x:5.0, z:-3.2, wx:4.4, wz:-1.6, make:function(){ return M.carbonite(); },
    look:'Ein Metallblock mit dem Abdruck eines Mannes darin. Das Museumsschild sagt: "Mensch, tiefgekühlt. Fundort unbekannt. Wirkt unzufrieden."' },

  { id:'zak-squirrel', room:'attic', era:'future', name:'Präparat im Glas',
    x:-5.6, z:0.4, wx:-4.8, wz:1.4, make:function(){ return M.squirrel(); },
    look:'Ein ausgestopftes zweiköpfiges Eichhörnchen unter Glas. Schild: "Häufigstes Säugetier des 20. Jahrhunderts. Quelle: ein Boulevardblatt."' },

  { id:'sammax-plushies', room:'attic', era:'present', name:'Zwei Plüschtiere',
    x:-2.4, z:1.8, wx:-2.4, wz:2.8, make:function(){ return M.plushies(); },
    look:'Ein Plüschhase mit sehr wachem Blick und ein Hund mit Detektivhut. Aus dem Hasen fällt ein Zettel: "Wir sind Freelance Police. Anfragen bitte schriftlich."' },

  { id:'indy-fedora', room:'attic', era:'present', name:'Hut und Peitsche',
    x:4.2, z:0.6, wx:3.6, wz:1.8, make:function(){ return M.fedoraSet(); },
    look:'Ein brauner Filzhut und eine aufgerollte Peitsche. Im Hutfutter steht: "Gehört in ein Museum." Jemand hat darunter gekritzelt: "In vierhundert Jahren dann."' },

  { id:'monkey-grog', room:'kitchen', era:'past', name:'Zinnkrug',
    x:-4.6, z:1.4, wx:-4.0, wz:2.4, make:function(){ return M.grogMug(); },
    look:'In dem Krug schwappt etwas Grünes, das langsam den Zinnboden zerfrisst. Hoagie schnuppert. "Das löst Metall auf. Das trinken die hier freiwillig?"' },

  { id:'monkey-insult', room:'yard', era:'past', name:'Fechtender Gründervater', dialogue:true,
    look:'' },

  { id:'grim-flowers', room:'kitchen', era:'future', name:'Vertrockneter Strauß',
    x:-6.2, z:2.2, wx:-5.4, wz:3.0, make:function(){
      var g = M.grp();
      g.add(M.cyl(0.22,0.16,0.42, 0xb08a5c, 0, 0.21, 0, 12));
      for(var i=0;i<5;i++){
        var st = M.cyl(0.03,0.03,0.7, 0x5a6a3a, (i-2)*0.09, 0.72, 0, 6);
        st.rotation.z = (i-2)*0.16; g.add(st);
        g.add(M.ball(0.12, i%2 ? 0xd8a040 : 0xc06a80, (i-2)*0.2, 1.06, 0));
      }
      return g;
    },
    look:'Ein vertrockneter Blumenstrauß in einer Vase. Das Kärtchen: "Für den Tag, an dem wieder etwas wächst." Eine der Blumen sieht aus wie aus Papier gefaltet.' }
];

function placeEggs(room, era, S, g, HS, A){
  W.EGGS.forEach(function(egg){
    if(egg.room !== room || egg.era !== era) return;
    if(egg.dialogue || !egg.make) return;
    if(egg.take && S.f['egg_taken_' + egg.id]) return;
    var obj = egg.make();
    obj.position.set(egg.x, 0, egg.z);
    HS(egg.name, obj, egg.wx, egg.wz, {
      primary: egg.take ? 'take' : 'look',
      egg: egg.id,
      look:function(){
        A.egg(egg.id);
        if(egg.act) egg.act(A);
        return egg.look;
      },
      take:function(){
        A.egg(egg.id);
        if(egg.take){
          S.f['egg_taken_' + egg.id] = true;
          A.give(A.who(), egg.take);
          A.sfx('pick');
          A.say(egg.look);
          A.rebuildSoon();
          return null;
        }
        return 'Das lässt ' + W.CHARS[A.who()].name + ' lieber liegen.';
      },
      use:function(item){
        if(item) return 'Das passt nicht zusammen.';
        A.egg(egg.id);
        if(egg.act) egg.act(A);
        return egg.look;
      }
    });
  });
}

global.World = W;
})(window);
