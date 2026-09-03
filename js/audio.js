/* =========================================================================
   audio.js — prozedurale Musik, Soundeffekte und Sprachausgabe.
   Alles entsteht zur Laufzeit: keine Audiodateien, kein Download.

   Jedes Stück besteht aus Sektionen (A/B/C), die in einer Reihenfolge
   gespielt werden — dadurch wiederholt sich nichts alle vier Takte.
   ========================================================================= */
(function(global){
'use strict';

/* --------------------------------------------------------------------- */
/* Noten: "A4" -> 440 Hz.  In den Sequenzen ist "." eine Pause.           */
/* --------------------------------------------------------------------- */
var SEMI = {C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
function hz(note){
  if(!note || note === '.') return 0;
  var m = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if(!m) return 0;
  return 440 * Math.pow(2, (SEMI[m[1]] + (parseInt(m[2],10)+1)*12 - 69) / 12);
}
function S(str){ return str.trim().split(/\s+/); }

/* --------------------------------------------------------------------- */
/* Musikstücke                                                            */
/* --------------------------------------------------------------------- */
var TRACKS = {

  /* ---------- Titelbildschirm: geheimnisvoll, etwas feierlich ---------- */
  title: {
    bpm:84, order:[0,1],
    sections:[
      { voices:[
        {type:'triangle', gain:0.13, dur:0.9, cut:2400, seq:S(
          "D4 . . .  A4 . . .  F4 . . .  C5 . . . " +
          "A#3 . . . F4 . . .  G4 . . .  D4 . . . ")},
        {type:'sine', gain:0.09, dur:1.6, cut:700, seq:S(
          "D2 . . .  . . . .   F2 . . .  . . . . " +
          "A#1 . . . . . . .   G2 . . .  . . . . ")},
        {type:'sine', gain:0.035, dur:2.6, cut:1400, seq:S(
          "A4 . . .  . . . .   . . . .   . . . . " +
          ". . . .   . . . .   . . . .   . . . . ")}
      ]},
      { voices:[
        {type:'triangle', gain:0.12, dur:0.55, cut:2600, seq:S(
          "D5 . C5 . A#4 . A4 . G4 . F4 . D4 . . . " +
          "F4 . G4 . A4 . C5 .  D5 . . .  . . . . ")},
        {type:'sine', gain:0.09, dur:1.6, cut:700, seq:S(
          "A#1 . . . . . . .   F2 . . .  . . . . " +
          "G2 . . .  . . . .   D2 . . .  . . . . ")}
      ]}
    ]
  },

  /* ---------- Abspann: das Titelthema, aber in Dur und zufrieden ---------- */
  win: {
    bpm:92, order:[0,1],
    sections:[
      { drums:S("K . . . . . H . S . . . . . H . K . . . . . H . S . . H . . H ."),
        voices:[
        {type:'triangle', gain:0.14, dur:0.7, cut:3200, seq:S(
          "C5 . . .  E5 . . .  G5 . . .  E5 . . . " +
          "F5 . . .  E5 . . .  D5 . . .  C5 . . . ")},
        {type:'sine', gain:0.10, dur:1.5, cut:800, seq:S(
          "C2 . . .  . . . .   G2 . . .  . . . . " +
          "F2 . . .  . . . .   C2 . . .  G2 . . . ")},
        {type:'sine', gain:0.05, dur:1.2, cut:2000, seq:S(
          "E4 . . .  G4 . . .  C5 . . .  G4 . . . " +
          "A4 . . .  G4 . . .  F4 . . .  E4 . . . ")}
      ]},
      { drums:S("K . H . . . S . K . H . . . S . K . H . . . S . K . H . S . S ."),
        voices:[
        {type:'triangle', gain:0.13, dur:0.34, cut:3400, seq:S(
          "G5 . F5 . E5 . D5 .  C5 . D5 . E5 . G5 . " +
          "A5 . G5 . E5 . D5 .  C5 . . .  . . . . ")},
        {type:'sine', gain:0.10, dur:1.5, cut:800, seq:S(
          "A1 . . .  . . . .   F2 . . .  . . . . " +
          "G2 . . .  . . . .   C2 . . .  . . . . ")}
      ]}
    ]
  },

  /* ---------- 1776: Cembalo-Menuett mit Basso continuo ---------- */
  past: {
    bpm:126, order:[0,0,1,3,2,0,4],
    sections:[
      { voices:[
        {type:'triangle', gain:0.15, dur:0.20, cut:3000, seq:S(
          "D4 . F#4 . A4 . F#4 . D4 . A4 . D5 . A4 . " +
          "G4 . B4 . D5 . B4 .  A4 . F#4 . D4 . . . ")},
        {type:'square', gain:0.042, dur:0.14, cut:2000, seq:S(
          "A4 . . .  D5 . . .  A4 . . .  F#5 . . . " +
          "B4 . . .  G4 . . .  C#5 . . . D5 . . . ")},
        {type:'triangle', gain:0.055, dur:0.42, cut:1100, seq:S(
          "D2 . A2 . D3 . A2 .  D2 . A2 . D3 . A2 . " +
          "G2 . D3 . G3 . D3 .  A2 . E3 . A2 . . . ")}
      ]},
      { voices:[
        {type:'triangle', gain:0.15, dur:0.20, cut:3000, seq:S(
          "B4 . D5 . F#5 . D5 . B4 . F#4 . B4 . D5 . " +
          "E5 . C#5 . A4 . C#5 . B4 . . .  . . . . ")},
        {type:'square', gain:0.042, dur:0.14, cut:2000, seq:S(
          "F#4 . . . B4 . . .  D5 . . .  B4 . . . " +
          "A4 . . .  E4 . . .  F#4 . . . B4 . . . ")},
        {type:'triangle', gain:0.055, dur:0.42, cut:1100, seq:S(
          "B1 . F#2 . B2 . F#2 . B1 . F#2 . B2 . F#2 . " +
          "E2 . B2 . E3 . B2 .   F#2 . C#3 . F#2 . . . ")}
      ]},
      { voices:[
        {type:'triangle', gain:0.13, dur:0.30, cut:2400, seq:S(
          "G4 . . A4 . . B4 . . . D5 . . . . . " +
          "C#5 . . . D5 . . .  A4 . . . D4 . . . ")},
        {type:'triangle', gain:0.05, dur:0.5, cut:1000, seq:S(
          "G2 . . .  . . . .   D3 . . .  . . . . " +
          "A2 . . .  . . . .   D2 . . .  . . . . ")}
      ]},
      { voices:[                                   /* Leitmotiv, cembalistisch verziert */
        {type:'triangle', gain:0.145, dur:0.26, cut:3000, seq:S(
          "D5 E5 D5 . A4 . . .  F4 G4 F4 . C5 . . . " +
          "A#4 . . . F4 . . .   G4 A4 G4 . D4 . . . ")},
        {type:'square', gain:0.035, dur:0.16, cut:1900, seq:S(
          "D4 . . .  A3 . . .  F4 . . .  C4 . . . " +
          "A#3 . . . F3 . . .  G3 . . .  D3 . . . ")},
        {type:'triangle', gain:0.05, dur:0.44, cut:1000, seq:S(
          "D2 . A2 . D3 . A2 .  F2 . C3 . F3 . C3 . " +
          "A#1 . F2 . A#2 . F2 . G2 . D3 . G2 . D2 . ")}
      ]},
      { voices:[                                   /* Kanon: zwei Stimmen versetzt */
        {type:'triangle', gain:0.13, dur:0.18, cut:3200, seq:S(
          "D5 . C#5 . B4 . A4 .  G4 . F#4 . E4 . D4 . " +
          "A4 . B4 . C#5 . D5 .  E5 . D5 . C#5 . A4 . ")},
        {type:'square', gain:0.038, dur:0.18, cut:2200, seq:S(
          ". . . .   D4 . C#4 . B3 . A3 .  G3 . F#3 . " +
          "E3 . D3 . A3 . B3 .   C#4 . D4 . E4 . D4 . ")},
        {type:'triangle', gain:0.05, dur:0.46, cut:1000, seq:S(
          "D2 . . .  A2 . . .  D2 . . .  G2 . . . " +
          "A2 . . .  D3 . . .  A2 . . .  D2 . . . ")}
      ]}
    ]
  },

  /* ---------- Gegenwart: Lounge-Groove, Em–C–G–D ---------- */
  present: {
    bpm:94, order:[0,0,1,2,0,3,1],
    sections:[
      { drums:S("K . . . . . H . S . . . . . H . K . . K . . H . S . . . . H . H"),
        voices:[
        {type:'sine', gain:0.115, dur:0.62, cut:2000, seq:S(
          "E4 . . .  G4 . . B4 . . A4 . . . . . " +
          "D4 . . .  F#4 . . A4 . . G4 . . . . . ")},
        {type:'triangle', gain:0.10, dur:0.34, cut:800, seq:S(
          "E2 . . E2 . . B2 . . . C2 . . . G2 . " +
          "G2 . . G2 . . D3 . . . D2 . . . A2 . ")},
        {type:'sine', gain:0.038, dur:1.4, cut:1500, seq:S(
          "B3 . . .  . . . .  E4 . . .  . . . . " +
          "D4 . . .  . . . .  A3 . . .  . . . . ")}
      ]},
      { drums:S("K . . H . . S . K . H . . . S H K . . H . . S . K . H . S . S ."),
        voices:[
        {type:'triangle', gain:0.10, dur:0.30, cut:2600, seq:S(
          "B4 . A4 . G4 . E4 .  G4 . A4 . B4 . . . " +
          "D5 . B4 . A4 . G4 .  F#4 . E4 . . . . . ")},
        {type:'triangle', gain:0.10, dur:0.34, cut:800, seq:S(
          "C2 . . C2 . . G2 . . . G2 . . . D3 . " +
          "D2 . . D2 . . A2 . . . E2 . . . B2 . ")},
        {type:'sine', gain:0.05, dur:0.9, cut:1800, seq:S(
          "E5 . . .  . . D5 . . . . .  B4 . . . " +
          ". . . .   A4 . . . . . . .  . . . . ")}
      ]},
      { drums:S("K . . . . . H . S . . . . . H . K . . . . . H . S . . . . H . ."),
        voices:[                                   /* Leitmotiv, ganz entspannt */
        {type:'sine', gain:0.115, dur:1.1, cut:2100, seq:S(
          "D5 . . .  . . A4 .  . . . .  F4 . . . " +
          "C5 . . .  . . A#4 . . . . .  D4 . . . ")},
        {type:'triangle', gain:0.09, dur:0.36, cut:820, seq:S(
          "D2 . . .  A2 . . .  F2 . . .  C2 . . . " +
          "A#1 . . . F2 . . .  G2 . . .  D2 . . . ")},
        {type:'sine', gain:0.042, dur:1.8, cut:1500, seq:S(
          "F#4 . . . . . . .  A4 . . .  . . . . " +
          "D4 . . .  . . . .  A4 . . .  . . . . ")}
      ]},
      { drums:S("K . . . H . S . . H K . . . S . K . . H . . S . . . K . S . H ."),
        voices:[                                   /* Zwischenspiel, luftiger */
        {type:'sine', gain:0.10, dur:0.9, cut:2200, seq:S(
          "G4 . . .  . . . .  A4 . . .  B4 . . . " +
          "C5 . . .  . . B4 .  A4 . . .  G4 . . . ")},
        {type:'triangle', gain:0.085, dur:0.34, cut:820, seq:S(
          "C2 . . .  G2 . . .  C2 . . .  G2 . . . " +
          "A2 . . .  E2 . . .  D2 . . .  G2 . . . ")},
        {type:'sine', gain:0.04, dur:1.6, cut:1600, seq:S(
          "E5 . . .  . . . .  . . . .  . . . . " +
          ". . . .   . . . .  D5 . . .  . . . . ")}
      ]}
    ]
  },

  /* ---------- 2200: dunkler Tentakel-Synth in c-moll ---------- */
  future: {
    bpm:112, order:[0,1,0,2],
    sections:[
      { drums:S("K . . . . . . . S . . . . . K . K . . . . . . . S . . K . S . S"),
        voices:[
        {type:'sawtooth', gain:0.060, dur:0.14, cut:1400, seq:S(
          "C4 G4 D#4 G4 C4 G4 D#4 A#4 C4 G4 D#4 G4 A#3 F4 D4 F4 " +
          "C4 G4 D#4 G4 C4 G4 D#4 A#4 G#3 D#4 C4 D#4 A#3 F4 D4 F4")},
        {type:'sawtooth', gain:0.105, dur:0.40, cut:480, seq:S(
          "C2 . . .  . . . .  C2 . . .  A#1 . . . " +
          "C2 . . .  . . . .  G#1 . . . A#1 . . . ")},
        {type:'sine', gain:0.045, dur:2.6, cut:900, seq:S(
          "C3 . . .  . . . .  . . . .  . . . . " +
          ". . . .   . . . .  . . . .  . . . . ")}
      ]},
      { drums:S("K . H . . . S . . . K . H . S . K . H . . . S . . H K . S . S H"),
        voices:[
        {type:'square', gain:0.072, dur:0.42, cut:2200, seq:S(
          "G4 . . .  G#4 . . .  A#4 . . . G4 . . . " +
          "F4 . . .  D#4 . . .  D4 . . .  C4 . . . ")},
        {type:'sawtooth', gain:0.048, dur:0.14, cut:1200, seq:S(
          "C4 G4 D#4 G4 C4 G4 D#4 A#4 C4 G4 D#4 G4 A#3 F4 D4 F4 " +
          "C4 G4 D#4 G4 C4 G4 D#4 A#4 G#3 D#4 C4 D#4 A#3 F4 D4 F4")},
        {type:'sawtooth', gain:0.105, dur:0.40, cut:480, seq:S(
          "C2 . . .  . . . .  C2 . . .  A#1 . . . " +
          "G#1 . . . . . . .  A#1 . . . C2 . . . ")}
      ]},
      { drums:S(". . . . . . . . . . . . . . . . K . . . . . . . . . . . S . . ."),
        voices:[
        {type:'sine', gain:0.08, dur:1.8, cut:1000, seq:S(
          "C4 . . .  . . . .  D#4 . . . . . . . " +
          "G4 . . .  . . . .  A#3 . . . . . . . ")},
        {type:'sawtooth', gain:0.07, dur:0.9, cut:400, seq:S(
          "C2 . . .  . . . .  . . . .  . . . . " +
          "G#1 . . . . . . .  . . . .  . . . . ")}
      ]},
      { drums:S("K . . . . . . . S . . . . . K . K . . . . . . . S . . . . S . ."),
        voices:[                                   /* Leitmotiv, bedrohlich verzerrt */
        {type:'sawtooth', gain:0.085, dur:0.5, cut:1600, seq:S(
          "D5 . . .  . . A4 .  . . . .  F4 . . . " +
          "A#4 . . . . . F4 .  . . . .  D4 . . . ")},
        {type:'sawtooth', gain:0.10, dur:0.40, cut:460, seq:S(
          "D2 . . .  . . . .  D2 . . .  F2 . . . " +
          "A#1 . . . . . . .  A#1 . . . D2 . . . ")},
        {type:'square', gain:0.030, dur:0.13, cut:1100, seq:S(
          "D4 A4 F4 A4 D4 A4 F4 C5 D4 A4 F4 A4 A#3 F4 D4 F4 " +
          "D4 A4 F4 A4 D4 A4 F4 C5 A#3 F4 D4 F4 A#3 F4 D4 F4")}
      ]}
    ]
  },

  /* ---------- 2200, nachdem das Ventil zu ist: dieselbe Welt in Dur ---------- */
  future_free: {
    bpm:104, order:[0,1,0],
    sections:[
      { drums:S("K . . . . . H . S . . . . . H . K . . . . . H . S . . H . . H ."),
        voices:[
        {type:'triangle', gain:0.105, dur:0.55, cut:3000, seq:S(
          "C5 . . .  E5 . . .  G5 . . .  E5 . . . " +
          "A4 . . .  C5 . . .  E5 . . .  C5 . . . ")},
        {type:'sine', gain:0.085, dur:0.44, cut:900, seq:S(
          "C2 . . .  G2 . . .  C2 . . .  G2 . . . " +
          "A1 . . .  E2 . . .  F2 . . .  C2 . . . ")},
        {type:'sine', gain:0.040, dur:1.6, cut:1800, seq:S(
          "G4 . . .  . . . .  E4 . . .  . . . . " +
          "C5 . . .  . . . .  G4 . . .  . . . . ")}
      ]},
      { drums:S("K . H . . . S . K . H . . . S . K . H . . . S . K . H . S . S ."),
        voices:[                                   /* Leitmotiv, endlich erleichtert */
        {type:'triangle', gain:0.115, dur:0.9, cut:3200, seq:S(
          "D5 . . .  . . A4 .  . . . .  F5 . . . " +
          "C5 . . .  . . A4 .  . . . .  D5 . . . ")},
        {type:'sine', gain:0.085, dur:0.44, cut:900, seq:S(
          "D2 . . .  A2 . . .  F2 . . .  C2 . . . " +
          "A2 . . .  F2 . . .  G2 . . .  D2 . . . ")}
      ]}
    ]
  }
};

/* --------------------------------------------------------------------- */
/* Sound-Engine                                                           */
/* --------------------------------------------------------------------- */
var Snd = {
  ctx:null, master:null, musicBus:null, musicGain:null, sfxBus:null,
  on:true, ready:false, ducked:false,
  _track:null, _era:null, _sec:0, _step:0, _next:0, _timer:null,

  init:function(){
    if(this.ready) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if(!AC) return false;
    try{ this.ctx = new AC(); }catch(e){ return false; }
    var c = this.ctx;

    this.master = c.createGain();
    this.master.gain.value = 0.85;

    var conv = null;                                  // kurze künstliche Hallfahne
    try{
      conv = c.createConvolver();
      var len = Math.floor(c.sampleRate * 1.8), buf = c.createBuffer(2, len, c.sampleRate);
      for(var ch=0; ch<2; ch++){
        var d = buf.getChannelData(ch);
        for(var i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.8) * 0.5;
      }
      conv.buffer = buf;
    }catch(e){ conv = null; }

    this.spaceFilter = c.createBiquadFilter();     // Raumcharakter je Schauplatz
    this.spaceFilter.type = 'lowpass';
    this.spaceFilter.frequency.value = 18000;
    this.spaceFilter.Q.value = 0.4;

    this.musicGain = c.createGain(); this.musicGain.gain.value = 1.0;   // fürs Ducking
    this.musicBus  = c.createGain(); this.musicBus.gain.value  = 0.52;
    this.sfxBus    = c.createGain(); this.sfxBus.gain.value    = 0.85;

    this.musicBus.connect(this.spaceFilter);
    this.spaceFilter.connect(this.musicGain);
    if(conv){
      var wet = c.createGain(); wet.gain.value = 0.24;
      conv.connect(wet); wet.connect(this.master);
      this.musicGain.connect(conv); this.sfxBus.connect(conv);
    }
    this.musicGain.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(c.destination);

    this.ready = true;
    return true;
  },

  resume:function(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  /* Wie klingt der Raum? Keller dumpf, Hof offen, Dachboden gedämpft. */
  setSpace:function(room){
    if(!this.ready || !this.spaceFilter) return;
    var cut = 18000;
    if(room === 'cellar')      cut = 850;
    else if(room === 'attic')  cut = 3600;
    else if(room === 'yard')   cut = 16000;
    else                       cut = 9000;
    var f = this.spaceFilter.frequency, t = this.ctx.currentTime;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.linearRampToValueAtTime(cut, t + 0.6);
  },

  /* Musik zurücknehmen, solange gesprochen wird */
  duck:function(on){
    if(!this.ready) return;
    this.ducked = !!on;
    var g = this.musicGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(on ? 0.30 : 1.0, t + (on ? 0.18 : 0.55));
  },

  note:function(freq, when, dur, opts){
    if(!this.ready || !freq) return;
    var o = opts || {}, c = this.ctx;
    var osc = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    if(o.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq*o.glide), when+dur);
    if(o.detune) osc.detune.setValueAtTime(o.detune, when);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.cut || 3000, when);
    f.Q.value = o.q || 0.6;

    var peak = (o.gain === undefined ? 0.1 : o.gain);
    var atk  = (o.atk  === undefined ? 0.012 : o.atk);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    osc.connect(f); f.connect(g); g.connect(o.bus || this.musicBus);
    osc.start(when); osc.stop(when + dur + 0.06);
  },

  noise:function(when, dur, opts){
    if(!this.ready) return;
    var o = opts || {}, c = this.ctx;
    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for(var i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, o.shape || 2);
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1200, when);
    if(o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(o.sweep, 40), when + dur);
    f.Q.value = o.q || 1.0;
    var g = c.createGain();
    g.gain.setValueAtTime(o.gain === undefined ? 0.2 : o.gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
    src.start(when); src.stop(when + dur + 0.02);
  },

  /* ------------------------- Sequencer ------------------------------- */
  play:function(id){
    if(!this.ready || this._era === id) return;
    var wasPlaying = !!this._track;
    this._era = id;
    this._track = TRACKS[id] || null;
    this._sec = 0; this._step = 0;
    this._next = this.ctx.currentTime + 0.1;
    if(wasPlaying){                                   // weicher Übergang
      var g = this.musicBus.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.06, t);
      g.linearRampToValueAtTime(0.52, t + 1.2);
    }
    if(!this._timer) this._timer = setInterval(this._tick.bind(this), 40);
  },
  playEra:function(id){ this.play(id); },

  stopMusic:function(){
    if(this._timer){ clearInterval(this._timer); this._timer = null; }
    this._era = null; this._track = null;
  },

  _tick:function(){
    if(!this._track || !this.on) return;
    var T = this._track, spb = 60 / T.bpm / 4;
    while(this._next < this.ctx.currentTime + 0.28){
      var sec = T.sections[T.order[this._sec % T.order.length]];
      var len = sec.voices[0].seq.length;
      var s = this._step % len, when = this._next;

      for(var v=0; v<sec.voices.length; v++){
        var voice = sec.voices[v], n = voice.seq[s];
        if(n && n !== '.') this.note(hz(n), when, voice.dur,
          {type:voice.type, gain:voice.gain, cut:voice.cut, atk:voice.atk});
      }
      if(sec.drums){
        var hit = sec.drums[s % sec.drums.length];
        if(hit === 'K')      this.noise(when, 0.15, {filter:'lowpass', freq:200, sweep:48, gain:0.24, bus:this.musicBus});
        else if(hit === 'S') this.noise(when, 0.13, {filter:'bandpass', freq:1900, q:0.9, gain:0.11, bus:this.musicBus});
        else if(hit === 'H') this.noise(when, 0.05, {filter:'highpass', freq:6200, gain:0.048, bus:this.musicBus});
      }

      this._next += spb;
      this._step++;
      if(this._step % len === 0){ this._sec++; this._step = 0; }
    }
  },

  /* ---------------------------- Effekte ------------------------------ */
  sfx:function(name){
    if(!this.ready || !this.on) return;
    this.resume();
    var t = this.ctx.currentTime, B = this.sfxBus, self = this;
    switch(name){
      case 'pick':
        this.note(880, t,       0.09, {type:'square', gain:0.10, cut:4200, bus:B});
        this.note(1320, t+0.07, 0.14, {type:'square', gain:0.09, cut:5200, bus:B});
        break;
      case 'flush':
        this.noise(t, 0.95, {filter:'bandpass', freq:950, sweep:170, q:1.4, gain:0.26, shape:1.1, bus:B});
        this.note(220, t,      0.55, {type:'sine', gain:0.09, glide:2.8, cut:1400, bus:B});
        this.note(660, t+0.45, 0.50, {type:'sine', gain:0.07, glide:0.32, cut:2000, bus:B});
        this.note(140, t+0.70, 0.45, {type:'sawtooth', gain:0.05, glide:3.2, cut:900, bus:B});
        break;
      case 'door':
        this.noise(t, 0.32, {filter:'lowpass', freq:900, sweep:210, gain:0.16, bus:B});
        break;
      case 'no':
        this.note(180, t,      0.13, {type:'square', gain:0.07, cut:1000, bus:B});
        this.note(140, t+0.11, 0.18, {type:'square', gain:0.07, cut:900,  bus:B});
        break;
      case 'solve':
        ['C5','E5','G5','C6'].forEach(function(n,i){
          self.note(hz(n), t + i*0.085, 0.34, {type:'triangle', gain:0.13, cut:5400, bus:B});
        });
        this.noise(t+0.02, 0.25, {filter:'highpass', freq:3800, gain:0.05, bus:B});
        break;
      case 'egg':
        ['G5','B5','D6','G6'].forEach(function(n,i){
          self.note(hz(n), t + i*0.06, 0.28, {type:'sine', gain:0.10, cut:6500, bus:B});
        });
        break;
      case 'win':
        ['C4','E4','G4','C5','E5','G5','C6'].forEach(function(n,i){
          self.note(hz(n), t + i*0.13, 0.75, {type:'triangle', gain:0.15, cut:6000, bus:B});
        });
        ['C3','C3','G3','C4'].forEach(function(n,i){
          self.note(hz(n), t + i*0.26, 0.9, {type:'sine', gain:0.10, cut:900, bus:B});
        });
        break;
      case 'zap':
        this.note(1400, t, 0.24, {type:'sawtooth', gain:0.10, glide:0.16, cut:3000, bus:B});
        this.noise(t, 0.24, {filter:'highpass', freq:2400, gain:0.10, bus:B});
        break;
      case 'squeak':
        this.note(1500, t,      0.07, {type:'square', gain:0.06, cut:6000, bus:B});
        this.note(1900, t+0.06, 0.07, {type:'square', gain:0.06, cut:6000, bus:B});
        break;
      case 'step':
        this.noise(t, 0.05, {filter:'lowpass', freq:360, gain:0.032, bus:B});
        break;
      case 'chicken':
        [900,1150,760,1320].forEach(function(f,i){
          self.note(f, t + i*0.09, 0.10, {type:'square', gain:0.075, glide:0.8, cut:3000, bus:B});
        });
        break;
      case 'warp':                                    /* Sprung durch die Zeit */
        for(var w=0; w<5; w++){
          this.note(180 * Math.pow(1.5, w), t + w*0.055, 0.5,
            {type:'triangle', gain:0.075, glide:2.2, cut:5200, bus:B});
        }
        this.noise(t, 0.7, {filter:'bandpass', freq:300, sweep:5200, q:2.2, gain:0.13, shape:0.9, bus:B});
        this.note(1200, t+0.4, 0.5, {type:'sine', gain:0.05, glide:0.25, cut:4000, bus:B});
        break;
      case 'saber':
        this.note(110, t, 0.9, {type:'sawtooth', gain:0.07, glide:1.6, cut:700, q:6, bus:B});
        this.noise(t, 0.9, {filter:'bandpass', freq:420, sweep:900, q:3, gain:0.09, shape:1, bus:B});
        break;
    }
  },

  /* Die vier Töne eines gewissen Webstuhls */
  loomTune:function(){
    if(!this.ready || !this.on) return;
    var t = this.ctx.currentTime, B = this.sfxBus, self = this;
    ['E5','D5','F#5','B4'].forEach(function(n,i){
      self.note(hz(n),   t + i*0.30, 0.85, {type:'sine', gain:0.13, cut:5000, atk:0.05, bus:B});
      self.note(hz(n)*2, t + i*0.30, 0.55, {type:'sine', gain:0.04, cut:7000, atk:0.05, bus:B});
    });
  },

  /* ---------------------- Hintergrundkulisse ------------------------- */
  _amb:null, _ambKind:null,

  ambience:function(kind){
    if(this._ambKind === kind) return;
    this._ambKind = kind;
    if(this._amb){ clearInterval(this._amb); this._amb = null; }
    if(!kind || !this.ready) return;
    var self = this;
    this._amb = setInterval(function(){ self._ambTick(kind); }, 1900);
  },

  _ambTick:function(kind){
    if(!this.on || !this.ready) return;
    if(Math.random() > 0.5) return;                 // nicht bei jedem Takt
    var t = this.ctx.currentTime + Math.random()*0.9, B = this.sfxBus, self = this;

    switch(kind){
      case 'birds':                                  // Hof, 1776 und Gegenwart
        var n = 2 + (Math.random()*2|0), f0 = 1900 + Math.random()*900;
        for(var i=0;i<n;i++)
          this.note(f0 + i*160, t + i*0.11, 0.09,
            {type:'sine', gain:0.030, glide:1.35, cut:6000, bus:B});
        break;

      case 'drip':                                   // Keller
        this.note(1250, t, 0.10, {type:'sine', gain:0.045, glide:0.35, cut:4000, bus:B});
        this.noise(t, 0.06, {filter:'bandpass', freq:2600, q:3, gain:0.022, bus:B});
        break;

      case 'hum':                                    // Labor der Gegenwart
        this.note(72, t, 1.5, {type:'sawtooth', gain:0.022, cut:180, atk:0.5, bus:B});
        this.note(144, t, 1.4, {type:'sine', gain:0.012, cut:400, atk:0.5, bus:B});
        break;

      case 'buzz':                                   // Zukunft
        this.note(2400 + Math.random()*900, t, 0.07,
          {type:'square', gain:0.016, glide:0.55, cut:7000, bus:B});
        this.noise(t + 0.1, 0.05, {filter:'highpass', freq:5200, gain:0.014, bus:B});
        break;

      case 'creak':                                  // Dachboden
        this.note(150 + Math.random()*90, t, 0.55,
          {type:'sawtooth', gain:0.020, glide:0.72, cut:520, atk:0.14, bus:B});
        break;

      case 'crackle':                                // Feuerstelle, 1776
        for(var k=0;k<3;k++)
          this.noise(t + Math.random()*1.2, 0.045,
            {filter:'bandpass', freq:1400 + Math.random()*1800, q:2, gain:0.020, bus:B});
        break;
    }
  },

  toggle:function(){
    this.on = !this.on;
    if(this.master) this.master.gain.value = this.on ? 0.85 : 0.0;
    return this.on;
  }
};

/* --------------------------------------------------------------------- */
/* Sprachausgabe                                                          */
/* --------------------------------------------------------------------- */
var VOICE_STYLE = {
  bernard:{pitch:1.35, rate:1.08},
  hoagie: {pitch:0.62, rate:0.92},
  laverne:{pitch:1.52, rate:1.16},
  tent:   {pitch:0.42, rate:0.86},
  npc:    {pitch:0.95, rate:0.98},
  sys:    {pitch:1.00, rate:1.04}
};
var SPEAKER_ORDER = ['bernard','hoagie','laverne','npc','tent','sys'];

var Voice = {
  on:true, supported:false, _voice:null, _byWho:{}, _picked:false, _gen:0,

  init:function(){
    this.supported = !!(global.speechSynthesis && global.SpeechSynthesisUtterance);
    if(this.supported){
      this._pick();
      if(global.speechSynthesis.addEventListener)
        global.speechSynthesis.addEventListener('voiceschanged', this._pick.bind(this));
    }
    return this.supported;
  },

  _pick:function(){
    if(!this.supported) return;
    var vs = global.speechSynthesis.getVoices() || [];
    if(!vs.length) return;
    var pool = vs.filter(function(v){ return /^de(-|_|$)/i.test(v.lang || ''); });
    if(!pool.length) pool = vs;
    this._voice = pool[0];
    this._byWho = {};
    for(var i=0;i<SPEAKER_ORDER.length;i++)
      this._byWho[SPEAKER_ORDER[i]] = pool[i % pool.length];
    this._picked = true;
  },

  speak:function(text, who, onEnd){
    if(!this.supported || !this.on) return false;
    try{
      var self = this, myGen = ++this._gen;
      global.speechSynthesis.cancel();   // löst onend der alten Äußerung aus
      var u = new global.SpeechSynthesisUtterance(
        String(text).replace(/[\[\]]/g,'').replace(/&mdash;|—/g,',')
      );
      var st = VOICE_STYLE[who] || VOICE_STYLE.sys;
      u.pitch = st.pitch; u.rate = st.rate; u.volume = 1; u.lang = 'de-DE';
      var v = this._byWho[who] || this._voice;
      if(v) u.voice = v;
      var done = false, finish = function(){
        if(done) return;
        done = true;
        if(myGen !== self._gen) return;  // längst überholt — nicht weiterschalten
        Snd.duck(false);
        if(onEnd) onEnd();
      };
      u.onend = finish; u.onerror = finish;
      Snd.duck(true);
      global.speechSynthesis.speak(u);
      return true;
    }catch(e){ Snd.duck(false); return false; }
  },

  shutUp:function(){
    this._gen++;                          // alle laufenden Rückrufe entwerten
    if(this.supported){ try{ global.speechSynthesis.cancel(); }catch(e){} }
    Snd.duck(false);
  },

  toggle:function(){
    this.on = !this.on;
    if(!this.on) this.shutUp();
    return this.on;
  }
};

global.Snd = Snd;
global.Voice = Voice;
})(window);
