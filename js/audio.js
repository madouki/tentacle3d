/* =========================================================================
   audio.js — prozedurale Musik, Soundeffekte und Sprachausgabe.
   Alles wird zur Laufzeit synthetisiert: keine Audiodateien, kein Download.
   ========================================================================= */
(function(global){
'use strict';

/* --------------------------------------------------------------------- */
/* Tonhöhen-Helfer: "A4" -> 440 Hz                                        */
/* --------------------------------------------------------------------- */
var SEMI = {C:0, 'C#':1, D:2, 'D#':3, E:4, F:5, 'F#':6, G:7, 'G#':8, A:9, 'A#':10, B:11};
function hz(note){
  if(note === null || note === undefined || note === '-') return 0;
  var m = /^([A-G]#?)(-?\d)$/.exec(note);
  if(!m) return 0;
  return 440 * Math.pow(2, (SEMI[m[1]] + (parseInt(m[2],10)+1)*12 - 69) / 12);
}

/* --------------------------------------------------------------------- */
/* Musik-Patterns pro Epoche                                              */
/* Jede Spur ist ein Array von Sechzehnteln; null = Pause.                */
/* --------------------------------------------------------------------- */
var TRACKS = {

  /* 1776 — Cembalo-Menuett, hell und zappelig */
  past: {
    bpm: 132, steps: 32,
    voices: [
      { type:'triangle', gain:0.16, dur:0.22, oct:0, cut:2600,
        seq:['D4',null,'F#4',null,'A4',null,'F#4',null,'D4',null,'A4',null,'D5',null,'A4',null,
             'G4',null,'B4',null,'D5',null,'B4',null,'A4',null,'F#4',null,'D4',null,null,null] },
      { type:'square', gain:0.055, dur:0.16, oct:0, cut:1800,
        seq:['D3',null,null,null,'A3',null,null,null,'D3',null,null,null,'A3',null,null,null,
             'G3',null,null,null,'D3',null,null,null,'A3',null,null,null,'D3',null,null,null] },
      { type:'triangle', gain:0.05, dur:0.5, oct:0, cut:1200,
        seq:['D2',null,null,null,null,null,null,null,'D2',null,null,null,null,null,null,null,
             'G2',null,null,null,null,null,null,null,'A2',null,null,null,null,null,null,null] }
    ]
  },

  /* Gegenwart — entspannter Lounge-Groove */
  present: {
    bpm: 96, steps: 32,
    voices: [
      { type:'sine', gain:0.13, dur:0.62, oct:0, cut:1900,
        seq:['E4',null,null,null,'G4',null,null,'B4',null,null,'A4',null,null,null,null,null,
             'D4',null,null,null,'F#4',null,null,'A4',null,null,'G4',null,null,null,null,null] },
      { type:'triangle', gain:0.10, dur:0.30, oct:0, cut:900,
        seq:['E2',null,null,null,null,null,'E2',null,'B2',null,null,null,null,null,null,null,
             'D2',null,null,null,null,null,'D2',null,'A2',null,null,null,null,null,null,null] },
      { type:'sine', gain:0.045, dur:1.1, oct:0, cut:1400,
        seq:['B3',null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
             'A3',null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] }
    ],
    drums: [1,0,0,0, 0,0,2,0, 1,0,0,0, 0,0,2,0, 1,0,0,0, 0,0,2,0, 1,0,2,0, 0,0,2,0]
  },

  /* 2200 — dunkler Tentakel-Synth */
  future: {
    bpm: 108, steps: 32,
    voices: [
      { type:'sawtooth', gain:0.075, dur:0.15, oct:0, cut:1300,
        seq:['C4','G4','D#4','G4','C4','G4','D#4','A#4','C4','G4','D#4','G4','A#3','F4','D4','F4',
             'C4','G4','D#4','G4','C4','G4','D#4','A#4','G#3','D#4','C4','D#4','A#3','F4','D4','F4'] },
      { type:'sawtooth', gain:0.11, dur:0.42, oct:0, cut:520,
        seq:['C2',null,null,null,null,null,null,null,'C2',null,null,null,'A#1',null,null,null,
             'C2',null,null,null,null,null,null,null,'G#1',null,null,null,'A#1',null,null,null] },
      { type:'sine', gain:0.05, dur:2.4, oct:0, cut:800,
        seq:['C3',null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
             null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null] }
    ],
    drums: [1,0,0,0, 0,0,0,0, 2,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0, 2,0,0,0, 0,1,0,1]
  }
};

/* --------------------------------------------------------------------- */
/* Sound-Engine                                                           */
/* --------------------------------------------------------------------- */
var Snd = {
  ctx:null, master:null, musicBus:null, sfxBus:null,
  on:true, ready:false,
  _track:null, _era:null, _step:0, _next:0, _timer:null,

  init:function(){
    if(this.ready) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if(!AC) return false;
    try{ this.ctx = new AC(); }catch(e){ return false; }

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;

    // Sanfter Raumklang über eine kurze, synthetische Hallfahne
    var conv = null;
    try{
      conv = this.ctx.createConvolver();
      var len = Math.floor(this.ctx.sampleRate * 1.6), buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for(var ch=0; ch<2; ch++){
        var d = buf.getChannelData(ch);
        for(var i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.6) * 0.5;
      }
      conv.buffer = buf;
    }catch(e){ conv = null; }

    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.55;
    this.sfxBus   = this.ctx.createGain(); this.sfxBus.gain.value   = 0.85;

    if(conv){
      var wet = this.ctx.createGain(); wet.gain.value = 0.22;
      conv.connect(wet); wet.connect(this.master);
      this.musicBus.connect(conv); this.sfxBus.connect(conv);
    }
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.ready = true;
    return true;
  },

  resume:function(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  /* --- eine Note --- */
  note:function(freq, when, dur, opts){
    if(!this.ready || !freq) return;
    var o = opts || {}, c = this.ctx;
    var osc = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, when);
    if(o.glide) osc.frequency.exponentialRampToValueAtTime(freq*o.glide, when+dur);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.cut || 3000, when);
    f.Q.value = o.q || 0.6;

    var peak = (o.gain === undefined ? 0.1 : o.gain);
    var atk  = o.atk === undefined ? 0.012 : o.atk;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(peak,0.0002), when + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    osc.connect(f); f.connect(g); g.connect(o.bus || this.musicBus);
    osc.start(when); osc.stop(when + dur + 0.05);
  },

  /* --- Rauschimpuls (Percussion / Effekte) --- */
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
    if(o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(o.sweep,40), when + dur);
    f.Q.value = o.q || 1.0;
    var g = c.createGain();
    g.gain.setValueAtTime(o.gain === undefined ? 0.2 : o.gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
    src.start(when); src.stop(when + dur + 0.02);
  },

  /* ------------------------- Musik-Sequencer ------------------------- */
  playEra:function(eraId){
    if(!this.ready || this._era === eraId) return;
    this._era = eraId;
    this._track = TRACKS[eraId] || null;
    this._step = 0;
    this._next = this.ctx.currentTime + 0.08;
    if(!this._timer) this._timer = setInterval(this._tick.bind(this), 40);
  },

  stopMusic:function(){
    if(this._timer){ clearInterval(this._timer); this._timer = null; }
    this._era = null; this._track = null;
  },

  _tick:function(){
    if(!this._track || !this.on) return;
    var t = this._track, spb = 60 / t.bpm / 4;          // Sechzehntel
    while(this._next < this.ctx.currentTime + 0.25){
      var s = this._step % t.steps, when = this._next;
      for(var v=0; v<t.voices.length; v++){
        var voice = t.voices[v], n = voice.seq[s];
        if(n) this.note(hz(n), when, voice.dur, {
          type:voice.type, gain:voice.gain, cut:voice.cut, atk:voice.atk
        });
      }
      if(t.drums && t.drums[s]){
        if(t.drums[s] === 1) this.noise(when, 0.13, {filter:'lowpass', freq:220, sweep:50, gain:0.20, bus:this.musicBus});
        else                 this.noise(when, 0.06, {filter:'highpass', freq:5200, gain:0.055, bus:this.musicBus});
      }
      this._next += spb;
      this._step++;
    }
  },

  /* ---------------------------- Effekte ------------------------------ */
  sfx:function(name){
    if(!this.ready || !this.on) return;
    this.resume();
    var t = this.ctx.currentTime, B = this.sfxBus;
    switch(name){
      case 'pick':                                   // Gegenstand aufgenommen
        this.note(880, t,      0.09, {type:'square', gain:0.10, cut:4000, bus:B});
        this.note(1320,t+0.07, 0.14, {type:'square', gain:0.09, cut:5000, bus:B});
        break;
      case 'flush':                                  // Chron-o-John
        this.noise(t, 0.85, {filter:'bandpass', freq:900, sweep:180, q:1.4, gain:0.26, shape:1.1, bus:B});
        this.note(220, t,     0.5, {type:'sine', gain:0.09, glide:2.6, cut:1400, bus:B});
        this.note(660, t+0.4, 0.45,{type:'sine', gain:0.07, glide:0.35,cut:2000, bus:B});
        break;
      case 'door':
        this.noise(t, 0.30, {filter:'lowpass', freq:900, sweep:220, gain:0.16, bus:B});
        break;
      case 'no':                                     // geht nicht
        this.note(180, t,      0.13, {type:'square', gain:0.07, cut:1000, bus:B});
        this.note(140, t+0.11, 0.17, {type:'square', gain:0.07, cut:900,  bus:B});
        break;
      case 'solve':                                  // Rätsel gelöst
        ['C5','E5','G5','C6'].forEach(function(n,i){
          Snd.note(hz(n), t + i*0.09, 0.30, {type:'triangle', gain:0.13, cut:5200, bus:B});
        });
        break;
      case 'win':
        ['C4','E4','G4','C5','E5','G5','C6'].forEach(function(n,i){
          Snd.note(hz(n), t + i*0.13, 0.7, {type:'triangle', gain:0.15, cut:6000, bus:B});
        });
        break;
      case 'zap':
        this.note(1400, t, 0.22, {type:'sawtooth', gain:0.10, glide:0.18, cut:3000, bus:B});
        this.noise(t, 0.22, {filter:'highpass', freq:2400, gain:0.10, bus:B});
        break;
      case 'squeak':                                 // Hamster
        this.note(1500, t,      0.07, {type:'square', gain:0.06, cut:6000, bus:B});
        this.note(1900, t+0.06, 0.07, {type:'square', gain:0.06, cut:6000, bus:B});
        break;
      case 'step':
        this.noise(t, 0.05, {filter:'lowpass', freq:380, gain:0.035, bus:B});
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
/* Sprachausgabe — Web Speech API, eine Stimmfarbe pro Figur              */
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
  on:true, supported:false, _voice:null, _byWho:{}, _picked:false,

  init:function(){
    this.supported = !!(global.speechSynthesis && global.SpeechSynthesisUtterance);
    if(this.supported){
      this._pick();
      // Stimmen kommen in manchen Browsern erst asynchron
      if(global.speechSynthesis.addEventListener)
        global.speechSynthesis.addEventListener('voiceschanged', this._pick.bind(this));
    }
    return this.supported;
  },

  _pick:function(){
    if(!this.supported) return;
    var vs = global.speechSynthesis.getVoices() || [];
    if(!vs.length) return;
    // Deutsche Stimmen bevorzugen, sonst nehmen was da ist
    var pool = vs.filter(function(v){ return /^de(-|_|$)/i.test(v.lang || ''); });
    if(!pool.length) pool = vs;
    this._voice = pool[0];
    // Jede Figur bekommt eine eigene Stimme, solange der Vorrat reicht
    this._byWho = {};
    for(var i=0;i<SPEAKER_ORDER.length;i++)
      this._byWho[SPEAKER_ORDER[i]] = pool[i % pool.length];
    this._picked = true;
  },

  /* Spricht den Text; ruft onEnd auf (auch im Fehlerfall, damit die
     Untertitel-Warteschlange niemals hängen bleibt).                    */
  speak:function(text, who, onEnd){
    if(!this.supported || !this.on){ return false; }
    try{
      global.speechSynthesis.cancel();
      var u = new global.SpeechSynthesisUtterance(
        String(text).replace(/[\[\]]/g,'').replace(/&mdash;|—/g,',')
      );
      var st = VOICE_STYLE[who] || VOICE_STYLE.sys;
      u.pitch = st.pitch; u.rate = st.rate; u.volume = 1;
      u.lang = 'de-DE';
      var v = this._byWho[who] || this._voice;
      if(v) u.voice = v;
      var done = false, finish = function(){ if(done) return; done = true; if(onEnd) onEnd(); };
      u.onend = finish; u.onerror = finish;
      global.speechSynthesis.speak(u);
      return true;
    }catch(e){ return false; }
  },

  shutUp:function(){ if(this.supported){ try{ global.speechSynthesis.cancel(); }catch(e){} } },

  toggle:function(){
    this.on = !this.on;
    if(!this.on) this.shutUp();
    return this.on;
  }
};

global.Snd = Snd;
global.Voice = Voice;

})(window);
