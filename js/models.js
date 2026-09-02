/* =========================================================================
   models.js — Bausteine: prozedurale Texturen, Geometrie-Helfer,
   Figuren, Tentakel und wiederkehrende Requisiten.
   ========================================================================= */
(function(global){
'use strict';

var M = {};

/* ======================================================================
   1. Prozedurale Texturen (Canvas -> THREE.CanvasTexture)
   ====================================================================== */
var texCache = {};
function makeTex(key, w, h, draw, repX, repY){
  if(texCache[key]) return texCache[key];
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  var t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX || 1, repY || 1);
  t.anisotropy = 4;
  texCache[key] = t;
  return t;
}
function noiseOverlay(c, w, h, amount, alpha){
  for(var i=0;i<amount;i++){
    c.fillStyle = 'rgba(0,0,0,'+(Math.random()*alpha).toFixed(3)+')';
    c.fillRect(Math.random()*w, Math.random()*h, Math.random()*3+1, Math.random()*3+1);
  }
}

M.tex = {
  planks:function(base, dark, rep){
    return makeTex('planks'+base+dark+rep, 256, 256, function(c,w,h){
      c.fillStyle = base; c.fillRect(0,0,w,h);
      for(var y=0;y<h;y+=32){
        c.fillStyle = dark; c.fillRect(0, y, w, 2);
        for(var i=0;i<26;i++){                       // Maserung
          c.strokeStyle = 'rgba(0,0,0,'+(0.02+Math.random()*0.05).toFixed(3)+')';
          c.lineWidth = 1;
          c.beginPath();
          var yy = y + 4 + Math.random()*26;
          c.moveTo(0, yy);
          c.bezierCurveTo(w*0.3, yy+(Math.random()*5-2.5), w*0.7, yy+(Math.random()*5-2.5), w, yy);
          c.stroke();
        }
      }
      noiseOverlay(c,w,h,900,0.05);
    }, rep||6, rep||6);
  },
  grass:function(base, alt, rep){
    return makeTex('grass'+base+alt+rep, 256, 256, function(c,w,h){
      c.fillStyle = base; c.fillRect(0,0,w,h);
      for(var i=0;i<1700;i++){
        c.fillStyle = Math.random()>0.45 ? alt : 'rgba(0,0,0,0.10)';
        var x = Math.random()*w, y = Math.random()*h;
        c.fillRect(x, y, 1.6, 3 + Math.random()*4);
      }
      noiseOverlay(c,w,h,1400,0.11);
    }, rep||10, rep||10);
  },
  bricks:function(base, mortar, rep){
    return makeTex('bricks'+base+mortar+rep, 256, 256, function(c,w,h){
      c.fillStyle = mortar; c.fillRect(0,0,w,h);
      var bh = 32, bw = 64;
      for(var r=0, y=0; y<h; y+=bh, r++){
        for(var x = (r%2 ? -bw/2 : 0); x<w; x+=bw){
          c.fillStyle = base;
          c.globalAlpha = 0.78 + Math.random()*0.22;
          c.fillRect(x+3, y+3, bw-6, bh-6);
          c.globalAlpha = 1;
        }
      }
      noiseOverlay(c,w,h,1100,0.08);
    }, rep||4, rep||3);
  },
  concrete:function(base, rep){
    return makeTex('conc'+base+rep, 256, 256, function(c,w,h){
      c.fillStyle = base; c.fillRect(0,0,w,h);
      for(var i=0;i<1800;i++){
        c.fillStyle = 'rgba(255,255,255,'+(Math.random()*0.05).toFixed(3)+')';
        c.fillRect(Math.random()*w, Math.random()*h, 2, 2);
      }
      noiseOverlay(c,w,h,1500,0.09);
    }, rep||3, rep||3);
  },
  panel:function(base, glow, rep){                    // Zukunfts-Wandpaneele
    return makeTex('panel'+base+glow+rep, 256, 256, function(c,w,h){
      c.fillStyle = base; c.fillRect(0,0,w,h);
      c.strokeStyle = glow; c.lineWidth = 2; c.globalAlpha = 0.5;
      for(var y=0;y<h;y+=64){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
      for(var x=0;x<w;x+=64){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
      c.globalAlpha = 0.16;
      for(var i=0;i<40;i++){
        c.fillStyle = glow;
        c.fillRect(Math.random()*w, Math.random()*h, 10+Math.random()*30, 3);
      }
      c.globalAlpha = 1;
      noiseOverlay(c,w,h,600,0.10);
    }, rep||3, rep||2);
  },
  sky:function(top, mid, bottom){
    return makeTex('sky'+top+mid+bottom, 64, 256, function(c,w,h){
      var g = c.createLinearGradient(0,0,0,h);
      g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bottom);
      c.fillStyle = g; c.fillRect(0,0,w,h);
    }, 1, 1);
  }
};

/* ======================================================================
   2. Geometrie-Helfer
   ====================================================================== */
M.mat = function(color, o){
  o = o || {};
  var def = {color:color};
  if(o.map) def.map = o.map;
  if(o.flat) def.flatShading = true;
  var m = new THREE.MeshLambertMaterial(def);
  if(o.emissive !== undefined) m.emissive = new THREE.Color(o.emissive);
  if(o.opacity  !== undefined){ m.transparent = true; m.opacity = o.opacity; }
  if(o.side) m.side = o.side;
  return m;
};
M.box = function(w,h,d,color,x,y,z,o){
  var m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M.mat(color,o));
  m.position.set(x||0,y||0,z||0);
  m.castShadow = !(o && o.noShadow); m.receiveShadow = true;
  return m;
};
M.cyl = function(rt,rb,h,color,x,y,z,seg,o){
  var m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||16), M.mat(color,o));
  m.position.set(x||0,y||0,z||0);
  m.castShadow = !(o && o.noShadow); m.receiveShadow = true;
  return m;
};
M.ball = function(r,color,x,y,z,o){
  var m = new THREE.Mesh(new THREE.SphereGeometry(r,16,12), M.mat(color,o));
  m.position.set(x||0,y||0,z||0);
  m.castShadow = !(o && o.noShadow); m.receiveShadow = true;
  return m;
};
M.cone = function(r,h,color,x,y,z,seg,o){
  var m = new THREE.Mesh(new THREE.ConeGeometry(r,h,seg||16), M.mat(color,o));
  m.position.set(x||0,y||0,z||0);
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
M.grp = function(x,y,z){ var g = new THREE.Group(); g.position.set(x||0,y||0,z||0); return g; };

/* Cartoon-Kontur: gespiegelte Rückseiten-Hülle um jedes Mesh einer Gruppe */
M.outline = function(root, thickness, color){
  var add = [];
  root.traverse(function(o){
    if(o.isMesh && o.geometry && !o.userData.noOutline) add.push(o);
  });
  add.forEach(function(m){
    var o = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({
      color: color === undefined ? 0x140c1e : color,
      side: THREE.BackSide
    }));
    o.position.copy(m.position);
    o.rotation.copy(m.rotation);
    o.scale.copy(m.scale).multiplyScalar(1 + (thickness || 0.045));
    o.castShadow = false; o.receiveShadow = false;
    o.userData.outline = true;
    o.renderOrder = -1;
    if(m.parent) m.parent.add(o);
  });
  return root;
};

/* ======================================================================
   3. Figuren
   ====================================================================== */
M.actor = function(cfg){
  var g = M.grp();

  var legL = M.grp(-0.19,0.78,0), legR = M.grp(0.19,0.78,0);
  legL.add(M.box(0.26,0.78,0.28,cfg.pants,0,-0.39,0));
  legR.add(M.box(0.26,0.78,0.28,cfg.pants,0,-0.39,0));
  legL.add(M.box(0.31,0.17,0.44,0x241c14,0,-0.76,0.07));
  legR.add(M.box(0.31,0.17,0.44,0x241c14,0,-0.76,0.07));
  g.add(legL); g.add(legR);

  var torso = M.box(0.84,0.94,0.46,cfg.shirt,0,1.26,0);
  g.add(torso);
  if(cfg.vest) g.add(M.box(0.90,0.62,0.50,cfg.vest,0,1.36,0));
  if(cfg.belt) g.add(M.box(0.88,0.14,0.50,cfg.belt,0,0.84,0));

  var armL = M.grp(-0.51,1.62,0), armR = M.grp(0.51,1.62,0);
  armL.add(M.box(0.19,0.68,0.22,cfg.shirt,0,-0.34,0));
  armR.add(M.box(0.19,0.68,0.22,cfg.shirt,0,-0.34,0));
  armL.add(M.ball(0.125,cfg.skin,0,-0.72,0));
  armR.add(M.ball(0.125,cfg.skin,0,-0.72,0));
  g.add(armL); g.add(armR);

  g.add(M.box(0.30,0.20,0.30,cfg.skin,0,1.83,0));

  var head = M.grp(0,2.24,0);
  head.add(M.box(0.64,0.60,0.58,cfg.skin,0,0,0));
  head.add(M.box(0.68,0.18,0.62,cfg.hair,0,0.31,0));
  head.add(M.box(0.13,0.14,0.10,cfg.skin,0,-0.05,0.31));            // Nase
  head.add(M.box(0.22,0.04,0.04,0x8a4a44,0,-0.19,0.30));            // Mund
  var eyeL = M.ball(0.085,0xffffff,-0.155,0.045,0.28);
  var eyeR = M.ball(0.085,0xffffff, 0.155,0.045,0.28);
  head.add(eyeL); head.add(eyeR);
  head.add(M.ball(0.042,0x101010,-0.155,0.045,0.345));
  head.add(M.ball(0.042,0x101010, 0.155,0.045,0.345));
  var lidL = M.box(0.20,0.20,0.02,cfg.skin,-0.155,0.045,0.352,{noShadow:true});
  var lidR = M.box(0.20,0.20,0.02,cfg.skin, 0.155,0.045,0.352,{noShadow:true});
  lidL.scale.y = lidR.scale.y = 0.02;
  lidL.userData.noOutline = lidR.userData.noOutline = true;
  head.add(lidL); head.add(lidR);
  head.add(M.box(0.20,0.035,0.05,cfg.hair,-0.155,0.155,0.29));      // Brauen
  head.add(M.box(0.20,0.035,0.05,cfg.hair, 0.155,0.155,0.29));

  if(cfg.extra === 'glasses'){
    head.add(M.box(0.52,0.045,0.03,0x1a1a1a,0,0.045,0.33));
    head.add(M.box(0.23,0.23,0.02,0xbfe8ff,-0.155,0.045,0.345,{opacity:0.42}));
    head.add(M.box(0.23,0.23,0.02,0xbfe8ff, 0.155,0.045,0.345,{opacity:0.42}));
  } else if(cfg.extra === 'beard'){
    head.add(M.box(0.58,0.26,0.12,cfg.hair,0,-0.23,0.27));
    head.add(M.box(0.72,0.12,0.68,cfg.hair,0,0.35,0));
    head.add(M.box(0.66,0.10,0.10,cfg.hair,0,-0.02,0.31));          // Schnauzer
  } else if(cfg.extra === 'goggles'){
    head.add(M.box(0.58,0.15,0.07,0x2c2f38,0,0.17,0.31));
    head.add(M.ball(0.075,0x8ad8ff,-0.155,0.17,0.345,{opacity:0.6}));
    head.add(M.ball(0.075,0x8ad8ff, 0.155,0.17,0.345,{opacity:0.6}));
    head.add(M.box(0.74,0.28,0.68,cfg.hair,0,0.27,-0.02));
    head.add(M.box(0.17,0.46,0.17,cfg.hair,-0.37,0.02,-0.10));
    head.add(M.box(0.17,0.46,0.17,cfg.hair, 0.37,0.02,-0.10));
  } else if(cfg.extra === 'wig'){
    head.add(M.box(0.76,0.30,0.66,0xe8e8e8,0,0.26,0));
    head.add(M.ball(0.17,0xe8e8e8,-0.40,0.06,0));
    head.add(M.ball(0.17,0xe8e8e8, 0.40,0.06,0));
    head.add(M.box(0.86,0.10,0.86,0x2e2a26,0,0.44,0));              // Dreispitz
    head.add(M.box(0.50,0.22,0.50,0x2e2a26,0,0.56,0));
  }
  g.add(head);

  g.userData.parts = {legL:legL, legR:legR, armL:armL, armR:armR, head:head, torso:torso,
                      lidL:lidL, lidR:lidR};
  g.userData.blinkIn = 2 + Math.random()*3;
  M.outline(g, 0.05);
  return g;
};

/* ======================================================================
   4. Tentakel
   ====================================================================== */
M.tentacle = function(color, h, opts){
  var o = opts || {}, g = M.grp();
  h = h || 1.7;
  var body = M.cone(0.56, h, color, 0, h/2, 0, 18);
  body.name = 'tentBody';
  g.add(body);
  g.add(M.box(0.94,0.17,0.74,color,0,0.09,0.05));                  // Fuß

  var eyes = M.grp(0, h*0.72, 0);
  eyes.add(M.ball(0.115,0xffffff,-0.165,0,0.30));
  eyes.add(M.ball(0.115,0xffffff, 0.165,0,0.30));
  eyes.add(M.ball(0.05,0x101010,-0.165,0,0.39));
  eyes.add(M.ball(0.05,0x101010, 0.165,0,0.39));
  eyes.add(M.box(0.20,0.04,0.05, 0x2a1230,-0.165,0.135,0.34));
  eyes.add(M.box(0.20,0.04,0.05, 0x2a1230, 0.165,0.135,0.34));
  g.add(eyes);

  if(o.arms !== false){
    var a1 = M.box(0.58,0.14,0.14,color,-0.44,h*0.46,0.05); a1.rotation.z =  0.55;
    var a2 = M.box(0.58,0.14,0.14,color, 0.44,h*0.46,0.05); a2.rotation.z = -0.55;
    g.add(a1); g.add(a2);
    g.userData.arms = [a1,a2];
  }
  if(o.hat){                                                        // Wachmütze
    g.add(M.cyl(0.34,0.40,0.18, o.hat, 0, h*0.99, 0, 14));
    g.add(M.box(0.72,0.06,0.42, o.hat, 0, h*0.95, 0.22));
  }
  if(o.crown){
    g.add(M.cyl(0.30,0.36,0.22, 0xffd447, 0, h*1.02, 0, 12));
  }
  g.userData.body = body;
  g.userData.eyes = eyes;
  M.outline(g, 0.04);
  return g;
};

/* ======================================================================
   5. Wiederkehrende Requisiten
   ====================================================================== */

/* Der Chron-o-John: Klokabine mit Antenne */
M.chronoJohn = function(era){
  var g = M.grp();
  var shell = era === 'past' ? 0x8a6a42 : era === 'present' ? 0xd6e0ea : 0x6a4a8c;
  var trim  = era === 'past' ? 0x5f4426 : era === 'present' ? 0x8fa2b4 : 0x49e6a0;

  g.add(M.box(2.0,0.26,2.0, 0x33333d, 0, 0.13, 0));
  g.add(M.box(0.72,0.72,0.42, 0xf2f2f2, 0, 0.50, -0.55));           // Klobecken
  g.add(M.cyl(0.35,0.35,0.13, 0xffffff, 0, 0.79, -0.55, 14));
  g.add(M.box(1.72,3.2,1.72, shell, 0, 1.76, 0));
  g.add(M.box(1.8,0.12,1.8, trim, 0, 0.30, 0));
  g.add(M.box(1.22,2.0,0.12, 0x1e2c3c, 0, 1.62, 0.87, {emissive:0x08131f}));
  g.add(M.box(1.32,2.1,0.06, 0x9fdcff, 0, 1.62, 0.91, {opacity:0.34, emissive:0x11374d}));
  g.add(M.box(0.14,0.14,0.16, 0xd8b040, 0.50, 1.55, 0.94));         // Klinke
  g.add(M.box(2.0,0.32,2.0, 0x2a2a34, 0, 3.46, 0));
  g.add(M.cyl(0.07,0.07,1.2, 0xa8a8a8, 0, 4.12, 0, 8));
  var bulb = M.ball(0.24, 0x49e6a0, 0, 4.76, 0, {emissive:0x1e9a68});
  bulb.name = 'cjBulb';
  g.add(bulb);
  for(var i=0;i<3;i++){                                             // Energiereifen
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.28,0.05,6,20),
      M.mat(trim, {emissive: era === 'future' ? 0x1f8a5e : 0x000000}));
    ring.rotation.x = Math.PI/2;
    ring.position.y = 0.7 + i*1.1;
    ring.name = 'cjRing'+i;
    g.add(ring);
  }
  return g;
};

/* Großer Baum (Gegenwart/Zukunft) mit kletterbaren Ästen */
M.bigTree = function(leafColor, trunkColor){
  var g = M.grp();
  g.add(M.cyl(0.55,0.95,7.5, trunkColor || 0x5a3d22, 0, 3.75, 0, 10));
  var crown = M.grp(0, 7.4, 0);
  crown.name = 'crown';
  crown.add(M.ball(2.6, leafColor, 0, 0.6, 0));
  crown.add(M.ball(1.9, leafColor, 2.0, -0.2, 0.5));
  crown.add(M.ball(1.7, leafColor,-2.0, 0.1,-0.4));
  crown.add(M.ball(1.5, leafColor, 0.4, 1.8, 0.8));
  g.add(crown);
  var b1 = M.cyl(0.16,0.22,3.2, trunkColor || 0x5a3d22, -1.1, 4.6, 0.4, 8);
  b1.rotation.z = 0.9; g.add(b1);
  var b2 = M.cyl(0.14,0.20,2.6, trunkColor || 0x5a3d22, 1.0, 5.8, -0.3, 8);
  b2.rotation.z = -0.8; g.add(b2);
  g.add(M.box(1.6,0.14,0.9, 0x6b4a2a, -0.2, 2.3, 0.9));             // Trittbrett
  g.add(M.box(1.6,0.14,0.9, 0x6b4a2a,  0.3, 3.6, 0.9));
  return g;
};

/* Kleiner Baum / Setzling */
M.sapling = function(){
  var g = M.grp();
  g.add(M.cyl(0.07,0.10,0.9, 0x6b4a2a, 0, 0.45, 0, 6));
  g.add(M.ball(0.34, 0x4e9c3a, 0, 1.0, 0));
  g.add(M.ball(0.22, 0x5cb045, 0.22, 0.85, 0.1));
  return g;
};

/* Deko-Baum im Hintergrund */
M.tree = function(leafColor){
  var g = M.grp();
  g.add(M.cyl(0.35,0.48,3.4, 0x5a3d22, 0, 1.7, 0, 8));
  g.add(M.ball(2.0, leafColor, 0, 4.1, 0));
  g.add(M.ball(1.4, leafColor, 1.1, 3.3, 0.4));
  g.add(M.ball(1.2, leafColor,-1.0, 3.5,-0.3));
  return g;
};

/* Staubpartikel, die im Lichtkegel schweben */
M.dust = function(count, spread, color){
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(count*3);
  for(var i=0;i<count;i++){
    pos[i*3]   = (Math.random()-0.5)*spread;
    pos[i*3+1] = Math.random()*7 + 0.4;
    pos[i*3+2] = (Math.random()-0.5)*spread*0.7;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: color || 0xffffff, size: 0.075, transparent:true, opacity:0.30,
    depthWrite:false, sizeAttenuation:true
  }));
  pts.name = 'dust';
  return pts;
};


/* ======================================================================
   6. Atmosphäre: Kontaktschatten, Wolken, Vögel, Funken
   ====================================================================== */

/* Weicher Schattenfleck unter Figuren und Möbeln — verankert sie im Boden */
M.blob = function(radius, opacity){
  var cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  var c = cv.getContext('2d');
  var g = c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,   'rgba(0,0,0,0.55)');
  g.addColorStop(0.55,'rgba(0,0,0,0.22)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0,0,64,64);
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius*2, radius*2),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv), transparent:true,
                                 opacity:opacity === undefined ? 0.85 : opacity,
                                 depthWrite:false})
  );
  m.rotation.x = -Math.PI/2;
  m.position.y = 0.03;
  m.userData.noOutline = true;
  m.renderOrder = 1;
  return m;
};

/* Wolkenbank am Himmel */
M.clouds = function(count, color, y, spread){
  var g = M.grp();
  g.name = 'clouds';
  for(var i=0;i<count;i++){
    var c = M.grp((Math.random()-0.5)*spread, y + Math.random()*3.5, -22 - Math.random()*22);
    var n = 3 + (Math.random()*3|0);
    for(var b=0;b<n;b++){
      var puff = M.ball(1.6 + Math.random()*1.8, color,
        (b-n/2)*2.1, Math.random()*0.9, Math.random()*1.4,
        {opacity:0.85, noShadow:true});
      puff.receiveShadow = false;
      c.add(puff);
    }
    c.userData.drift = 0.12 + Math.random()*0.25;
    g.add(c);
  }
  return g;
};

/* Ein paar Vögel, die ihre Bahn ziehen */
M.birds = function(count, color){
  var g = M.grp();
  g.name = 'birds';
  for(var i=0;i<count;i++){
    var b = M.grp();
    var wl = M.box(0.9,0.05,0.22,color,-0.45,0,0,{noShadow:true});
    var wr = M.box(0.9,0.05,0.22,color, 0.45,0,0,{noShadow:true});
    wl.userData.noOutline = wr.userData.noOutline = true;
    b.add(wl); b.add(wr);
    b.userData.wings = [wl,wr];
    b.userData.t  = Math.random()*Math.PI*2;
    b.userData.r  = 13 + Math.random()*7;
    b.userData.h  = 10 + Math.random()*3.5;
    b.userData.sp = 0.10 + Math.random()*0.09;
    g.add(b);
  }
  return g;
};

/* Funkenflug, etwa am Chron-o-John */
M.sparks = function(count, color){
  var geo = new THREE.BufferGeometry();
  var pos = new Float32Array(count*3);
  for(var i=0;i<count;i++){
    pos[i*3]   = (Math.random()-0.5)*2.2;
    pos[i*3+1] = Math.random()*4.5;
    pos[i*3+2] = (Math.random()-0.5)*2.2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var p = new THREE.Points(geo, new THREE.PointsMaterial({
    color:color || 0x9fe4ff, size:0.11, transparent:true, opacity:0.85,
    depthWrite:false, sizeAttenuation:true
  }));
  p.name = 'sparks';
  return p;
};

/* ======================================================================
   7. Requisiten für die versteckten Anspielungen
   ====================================================================== */

/* Ein in Karbonit eingefrorener Schmuggler */
M.carbonite = function(){
  var g = M.grp();
  g.add(M.box(1.9,3.4,0.5, 0x4a4f56, 0, 1.7, 0));
  g.add(M.box(1.6,0.5,0.62, 0x5a6068, 0, 2.9, 0.06));
  g.add(M.box(0.5,1.0,0.30, 0x6a7078, 0, 2.05, 0.22));
  g.add(M.box(0.26,0.9,0.24, 0x6a7078, -0.44, 1.55, 0.20));
  g.add(M.box(0.26,0.9,0.24, 0x6a7078,  0.44, 1.55, 0.20));
  g.add(M.box(0.34,0.34,0.26, 0x6a7078, 0, 2.62, 0.20));
  for(var i=0;i<4;i++)
    g.add(M.box(0.16,0.16,0.12, 0xff5533, -0.7+i*0.47, 0.42, 0.30,
      {emissive:0x882211, noShadow:true}));
  return g;
};

/* Gummihuhn mit einer Rolle in der Mitte */
M.rubberChicken = function(){
  var g = M.grp();
  g.add(M.ball(0.26, 0xf2d24a, 0, 0, 0));
  g.add(M.ball(0.15, 0xf2d24a, 0.05, 0.30, 0.10));
  g.add(M.cone(0.07, 0.16, 0xe08a20, 0.05, 0.34, 0.24, 8));
  g.add(M.box(0.30,0.14,0.16, 0xf2d24a, -0.22, -0.06, 0));
  g.add(M.cyl(0.13,0.13,0.09, 0x9aa2a8, 0, 0.02, 0, 12));
  g.add(M.cyl(0.05,0.05,0.16, 0x6a7078, 0, 0.02, 0, 8));
  return g;
};

/* Ein sehr alter Meteorit */
M.meteor = function(){
  var g = M.grp();
  var m = M.ball(0.85, 0x8a3a2a, 0, 0.6, 0, {emissive:0x4a1208});
  m.name = 'meteorBody';
  g.add(m);
  g.add(M.ball(0.45, 0x9a4a30, 0.62, 0.42, 0.2, {emissive:0x3a1006}));
  g.add(M.ball(0.34, 0x7a2e22,-0.55, 0.5,-0.25, {emissive:0x3a1006}));
  g.add(M.box(1.9,0.22,1.7, 0x40342c, 0, 0.11, 0));
  return g;
};

/* Ein Webstuhl mit acht Tönen */
M.loomWheel = function(){
  var g = M.grp();
  g.add(M.box(0.24,1.5,0.24, 0x6b4a2a, 0, 0.75, 0));
  g.add(M.box(1.5,0.22,0.9, 0x6b4a2a, 0, 0.11, 0));
  var w = new THREE.Mesh(new THREE.TorusGeometry(0.72,0.06,8,22), M.mat(0x8a6a3a));
  w.position.set(0.34,1.25,0); w.castShadow = true;
  w.name = 'loomSpin';
  for(var i=0;i<8;i++){
    var sp = M.box(0.05,0.05,1.36, 0x8a6a3a, 0,0,0);
    sp.rotation.y = Math.PI/2; sp.rotation.z = i*Math.PI/8;
    w.add(sp);
  }
  g.add(w);
  g.add(M.cyl(0.06,0.06,0.5, 0xd8c060, -0.42, 1.05, 0, 8));
  return g;
};

/* Hut und Peitsche eines Archäologen */
M.fedoraSet = function(){
  var g = M.grp();
  g.add(M.cyl(0.42,0.46,0.06, 0x6a4a28, 0, 0.03, 0, 18));
  g.add(M.cyl(0.26,0.28,0.28, 0x7a5530, 0, 0.17, 0, 16));
  g.add(M.cyl(0.29,0.29,0.06, 0x4a3018, 0, 0.09, 0, 16));
  var whip = M.grp(0.7, 0.05, 0.1);
  for(var i=0;i<7;i++){
    var seg = M.cyl(0.035,0.03,0.30, 0x5a3a20, Math.sin(i*0.9)*0.22, 0.03, i*0.24, 6);
    seg.rotation.x = Math.PI/2;
    whip.add(seg);
  }
  g.add(whip);
  return g;
};

/* Ein Motorradhelm */
M.helmet = function(){
  var g = M.grp();
  g.add(M.ball(0.42, 0x2a2f38, 0, 0.42, 0));
  g.add(M.box(0.70,0.22,0.14, 0x66d0ff, 0, 0.42, 0.34, {opacity:0.6, emissive:0x113344}));
  g.add(M.box(0.24,0.10,0.86, 0xcc3322, 0, 0.72, 0));
  g.add(M.cyl(0.40,0.44,0.08, 0x1a1e24, 0, 0.10, 0, 16));
  return g;
};

/* Ein Plüschhase und ein Plüschhund mit Hut */
M.plushies = function(){
  var g = M.grp();
  var rab = M.grp(-0.30,0,0);
  rab.add(M.box(0.30,0.42,0.26, 0xf4f4f8, 0, 0.21, 0));
  rab.add(M.ball(0.17, 0xf4f4f8, 0, 0.52, 0.02));
  rab.add(M.box(0.07,0.34,0.06, 0xf4f4f8, -0.08, 0.80, 0));
  rab.add(M.box(0.07,0.34,0.06, 0xf4f4f8,  0.08, 0.80, 0));
  rab.add(M.ball(0.028,0x101010,-0.06,0.55,0.16));
  rab.add(M.ball(0.028,0x101010, 0.06,0.55,0.16));
  g.add(rab);
  var dog = M.grp(0.30,0,0);
  dog.add(M.box(0.34,0.46,0.28, 0xd8c8a8, 0, 0.23, 0));
  dog.add(M.ball(0.19, 0xd8c8a8, 0, 0.56, 0.04));
  dog.add(M.box(0.10,0.24,0.07, 0xb8a888, -0.17, 0.60, 0));
  dog.add(M.box(0.10,0.24,0.07, 0xb8a888,  0.17, 0.60, 0));
  dog.add(M.cyl(0.24,0.26,0.05, 0x8a7a5a, 0, 0.73, 0, 14));
  dog.add(M.cyl(0.15,0.15,0.14, 0x8a7a5a, 0, 0.79, 0, 14));
  dog.add(M.ball(0.045,0x101010, 0, 0.50, 0.22));
  g.add(dog);
  return g;
};

/* Ein zweiköpfiges Eichhörnchen unter Glas */
M.squirrel = function(){
  var g = M.grp();
  g.add(M.cyl(0.42,0.42,0.09, 0x5a4a34, 0, 0.05, 0, 16));
  var body = M.grp(0,0.08,0);
  body.add(M.ball(0.22, 0xa8703a, 0, 0.22, 0));
  body.add(M.ball(0.13, 0xa8703a,-0.13, 0.46, 0.04));
  body.add(M.ball(0.13, 0xa8703a, 0.13, 0.46, 0.04));
  body.add(M.box(0.05,0.11,0.04, 0xa8703a,-0.18,0.60,0.02));
  body.add(M.box(0.05,0.11,0.04, 0xa8703a,-0.07,0.60,0.02));
  body.add(M.box(0.05,0.11,0.04, 0xa8703a, 0.07,0.60,0.02));
  body.add(M.box(0.05,0.11,0.04, 0xa8703a, 0.18,0.60,0.02));
  body.add(M.ball(0.14, 0xc08a4a, 0, 0.28,-0.24));
  g.add(body);
  g.add(M.cyl(0.40,0.40,0.95, 0xaaddff, 0, 0.55, 0, 18,
    {opacity:0.22, emissive:0x113344, noShadow:true}));
  return g;
};

/* Ein Krug mit einem sehr aggressiven Getränk */
M.grogMug = function(){
  var g = M.grp();
  g.add(M.cyl(0.19,0.16,0.40, 0x8a8a92, 0, 0.20, 0, 14));
  var t = new THREE.Mesh(new THREE.TorusGeometry(0.10,0.03,6,12), M.mat(0x8a8a92));
  t.position.set(0.22,0.20,0); g.add(t);
  g.add(M.cyl(0.165,0.165,0.05, 0x6ed94a, 0, 0.38, 0, 14, {emissive:0x2a6a20}));
  return g;
};

global.M = M;
})(window);
