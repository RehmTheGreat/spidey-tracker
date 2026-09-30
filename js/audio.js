/* ============================================================
   SPIDEY TRACKER - js/audio.js
   WebAudio synth: every sfx + chiptune loops. Loads SECOND,
   right after data.js. Zero dependencies. Attaches ST.audio.
   All public calls are wrapped in try/catch and never throw.
   Every sound is synthesized (oscillators + noise buffer):
   no assets, no network, works from file:// offline.

   API (called by app/ui/map):
     ST.audio.init()               lazily create AudioContext
                                   (call from user-gesture handlers;
                                   idempotent; never throws)
     ST.audio.setMuted(bool)       master mute (default: muted)
     ST.audio.isMuted()            -> bool
     ST.audio.setVolumeMaster(v)   0..1
     ST.audio.play(name)           one-shots: move select back
                                   ping geiger spawn toast bootline
                                   powerup powerdown lock jingle
     ST.audio.startLoop(name)      sonar geiger_sweep theme
     ST.audio.stopLoop(name)
   ============================================================ */
(function () {
  "use strict";
  var W = typeof window !== "undefined" ? window : globalThis;
  W.ST = W.ST || {};

  var ctx = null;          // AudioContext, created lazily
  var master = null;       // master GainNode
  var noiseBuf = null;     // 1s white noise buffer
  var muted = true;        // SPEC 9: muted by default until SOUND ON
  var masterVol = 0.55;    // pleasant default, app can retune
  var loops = {};          // name -> { gain, next, step, emit, advance }
  var schedTimer = null;   // lookahead scheduler interval id

  function safe(fn) {
    try { fn(); } catch (e) { /* audio must never break the app */ }
  }

  /* ---------- core ---------- */

  function makeNoise() {
    var len = Math.floor(ctx.sampleRate * 1.0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function init() {
    safe(function () {
      if (!ctx) {
        var AC = W.AudioContext || W.webkitAudioContext;
        if (!AC) return;                 // no WebAudio: stay silent, no throw
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : masterVol;
        master.connect(ctx.destination);
        noiseBuf = makeNoise();
      }
      if (ctx.state === "suspended") ctx.resume();
    });
  }

  function applyMaster() {
    if (!master || !ctx) return;
    var target = muted ? 0 : masterVol;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.05);
  }

  function setMuted(b) {
    safe(function () {
      muted = !!b;
      applyMaster();
    });
  }
  function isMuted() { return muted; }
  function setVolumeMaster(v) {
    safe(function () {
      var f = Number(v);
      if (isNaN(f)) return;
      masterVol = Math.max(0, Math.min(1, f));
      applyMaster();
    });
  }

  /* ---------- synth primitives ---------- */

  /* Oscillator blip with pitch glide + attack/decay envelope.
     o: { type, f0, f1, t, dur, vol, attack, out } */
  function tone(o) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(o.f0, o.t);
    if (o.f1 && o.f1 !== o.f0) {
      osc.frequency.exponentialRampToValueAtTime(o.f1, o.t + o.dur);
    }
    var atk = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, o.t);
    g.gain.linearRampToValueAtTime(o.vol, o.t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
    osc.connect(g);
    g.connect(o.out || master);
    osc.start(o.t);
    osc.stop(o.t + o.dur + 0.05);
  }

  /* Filtered noise burst. o: { t, dur, vol, hp, lp, out } */
  function noise(o) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var node = src;
    if (o.hp) {
      var h = ctx.createBiquadFilter();
      h.type = "highpass"; h.frequency.value = o.hp;
      node.connect(h); node = h;
    }
    if (o.lp) {
      var l = ctx.createBiquadFilter();
      l.type = "lowpass"; l.frequency.value = o.lp;
      node.connect(l); node = l;
    }
    var g = ctx.createGain();
    g.gain.setValueAtTime(o.vol, o.t);
    g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
    node.connect(g);
    g.connect(o.out || master);
    src.start(o.t);
    src.stop(o.t + o.dur + 0.02);
  }

  /* Note name ("C5", "F#4") -> frequency in Hz. */
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return 440;
    var s = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    var midi = (parseInt(m[3], 10) + 1) * 12 + s;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---------- one-shot cue catalogue ----------
     Each cue tuned for 8-bit authenticity: chip-style square /
     triangle envelopes, short decays, nothing harsh. */

  function playCue(name) {
    if (!ctx) init();
    if (!ctx) return;
    var t = ctx.currentTime + 0.001;
    switch (name) {
      /* UI focus move: tiny 660Hz square tick, 30ms, quick decay.
         Quiet on purpose: it fires constantly while navigating. */
      case "move":
        tone({ type: "square", f0: 660, t: t, dur: 0.03, vol: 0.14 });
        break;
      /* Confirm: classic two-tone select chirp 880 -> 1320. */
      case "select":
        tone({ type: "square", f0: 880, t: t, dur: 0.05, vol: 0.18 });
        tone({ type: "square", f0: 1320, t: t + 0.055, dur: 0.08, vol: 0.18 });
        break;
      /* Back/cancel: descending pair 440 -> 220, slightly softer. */
      case "back":
        tone({ type: "square", f0: 440, t: t, dur: 0.06, vol: 0.16 });
        tone({ type: "triangle", f0: 220, t: t + 0.065, dur: 0.1, vol: 0.18 });
        break;
      /* Sonar ping: sine 1200Hz 90ms plus one quiet echo 160ms
         later. Reads as distance, used for new pins. */
      case "ping":
        tone({ type: "sine", f0: 1200, t: t, dur: 0.09, vol: 0.22 });
        tone({ type: "sine", f0: 1200, t: t + 0.16, dur: 0.06, vol: 0.08 });
        break;
      /* Geiger click: 8ms bright noise grain through a 3kHz
         highpass. Radar sweep + geiger_sweep loop share this. */
      case "geiger":
        noise({ t: t, dur: 0.008, vol: 0.22, hp: 3000 });
        break;
      /* Spawn alert: rising square arpeggio C5-E5-G5-C6. */
      case "spawn":
        tone({ type: "square", f0: freq("C5"), t: t, dur: 0.055, vol: 0.16 });
        tone({ type: "square", f0: freq("E5"), t: t + 0.06, dur: 0.055, vol: 0.16 });
        tone({ type: "square", f0: freq("G5"), t: t + 0.12, dur: 0.055, vol: 0.16 });
        tone({ type: "square", f0: freq("C6"), t: t + 0.18, dur: 0.12, vol: 0.18 });
        break;
      /* Toast chime: warm major third (C6 then E6), triangle. */
      case "toast":
        tone({ type: "triangle", f0: freq("C6"), t: t, dur: 0.07, vol: 0.2 });
        tone({ type: "triangle", f0: freq("E6"), t: t + 0.075, dur: 0.12, vol: 0.2 });
        break;
      /* Boot line key-click: 940Hz square, 14ms, very quiet.
         Fires once per POST line, must stay subtle. */
      case "bootline":
        tone({ type: "square", f0: 940, t: t, dur: 0.014, vol: 0.06 });
        break;
      /* Power on: boot hum. Low triangle swelling 82 -> 164Hz
         over 0.6s, plus a soft confirm blip at the end. */
      case "powerup":
        tone({ type: "triangle", f0: 82, f1: 164, t: t, dur: 0.6, vol: 0.22, attack: 0.25 });
        tone({ type: "square", f0: freq("C5"), t: t + 0.62, dur: 0.1, vol: 0.12 });
        break;
      /* Power off: descending triangle 220 -> 55Hz, 0.45s. */
      case "powerdown":
        tone({ type: "triangle", f0: 220, f1: 55, t: t, dur: 0.45, vol: 0.2, attack: 0.02 });
        break;
      /* Tracking lock confirm: double soft 900Hz sonar taps. */
      case "lock":
        tone({ type: "sine", f0: 900, t: t, dur: 0.08, vol: 0.18 });
        tone({ type: "sine", f0: 900, t: t + 0.2, dur: 0.06, vol: 0.1 });
        break;
      /* Boot jingle: ORIGINAL 6-note motif (not the 1967 tune):
         C5 E5 G5 A5 G5 C6, square lead over triangle roots. */
      case "jingle":
        playJingle(t);
        break;
      /* Glitch zap: for signal-lost. Falling square plus a bitcrushed
         noise burst, reads as a broken transmission. */
      case "zap":
        tone({ type: "square", f0: 1400, f1: 90, t: t, dur: 0.5, vol: 0.2 });
        noise({ t: t, dur: 0.4, vol: 0.12, hp: 400, lp: 4000 });
        break;
      /* Deep boom: for the cut-to-black beat. */
      case "boom":
        tone({ type: "triangle", f0: 110, f1: 38, t: t, dur: 0.8, vol: 0.26, attack: 0.01 });
        break;
      default:
        break;
    }
  }

  function playJingle(t) {
    var lead = [
      [0.00, "C5", 0.10],
      [0.11, "E5", 0.10],
      [0.22, "G5", 0.16],
      [0.40, "A5", 0.10],
      [0.51, "G5", 0.10],
      [0.62, "C6", 0.30]
    ];
    for (var i = 0; i < lead.length; i++) {
      tone({ type: "square", f0: freq(lead[i][1]), t: t + lead[i][0], dur: lead[i][2], vol: 0.18 });
    }
    tone({ type: "triangle", f0: freq("C3"), t: t, dur: 0.35, vol: 0.2 });
    tone({ type: "triangle", f0: freq("G2"), t: t + 0.36, dur: 0.24, vol: 0.18 });
    tone({ type: "triangle", f0: freq("C3"), t: t + 0.62, dur: 0.34, vol: 0.2 });
  }

  /* ---------- theme: ORIGINAL 8-bar chiptune ----------
     Upbeat heroic-jaunty loop in C. 132 BPM, 64 eighth-note
     steps (8 bars). Two square voices (lead + 1-step echo),
     walking triangle bass, noise hats + light snare.
     This melody is written for this replica: rising fanfare
     arpeggios, a middle dip and a resolved ending. It is NOT
     the 1967 cartoon theme, by design. */

  var THEME_BPM = 132;
  var STEP = 60 / THEME_BPM / 2;         // eighth note in seconds
  var THEME_STEPS = 64;                  // 8 bars x 8 eighths

  // lead voice: [step, note, lengthInSteps]
  var THEME_LEAD = [
    [0, "E5", 1], [1, "G5", 1], [2, "C6", 2], [4, "G5", 1], [5, "A5", 1], [6, "G5", 2],
    [8, "A5", 1], [9, "G5", 1], [10, "E5", 2], [12, "D5", 1], [13, "E5", 1], [14, "G5", 2],
    [16, "F5", 1], [17, "A5", 1], [18, "C6", 2], [20, "A5", 1], [21, "G5", 1], [22, "F5", 2],
    [24, "G5", 2], [26, "D5", 2], [28, "B4", 2], [30, "D5", 2],
    [32, "E5", 1], [33, "G5", 1], [34, "C6", 3], [38, "A5", 2],
    [40, "F5", 1], [41, "E5", 1], [42, "D5", 2], [44, "E5", 1], [45, "F5", 1], [46, "A5", 2],
    [48, "G5", 2], [50, "C6", 2], [52, "A5", 2], [54, "F5", 2],
    [56, "E5", 2], [58, "D5", 2], [60, "C5", 4]
  ];
  // bass roots, one quarter note per entry: [step, note]
  var THEME_BASS = (function () {
    var bars = [
      ["C3", "G3", "C3", "G3"],
      ["A2", "E3", "A2", "E3"],
      ["F2", "C3", "F2", "C3"],
      ["G2", "D3", "G2", "B2"],
      ["C3", "G3", "C3", "G3"],
      ["F2", "C3", "F2", "C3"],
      ["G2", "G2", "B2", "D3"],
      ["C3", "G2", "C3", "C3"]
    ];
    var out = [];
    for (var b = 0; b < bars.length; b++) {
      for (var i = 0; i < 4; i++) out.push([b * 8 + i * 2, bars[b][i]]);
    }
    return out;
  })();

  // precompute step -> lead note(s) for fast scheduling
  var LEAD_AT = {};
  (function () {
    for (var i = 0; i < THEME_LEAD.length; i++) {
      var n = THEME_LEAD[i];
      (LEAD_AT[n[0]] = LEAD_AT[n[0]] || []).push(n);
    }
  })();
  var BASS_AT = {};
  (function () {
    for (var i = 0; i < THEME_BASS.length; i++) {
      var n = THEME_BASS[i];
      (BASS_AT[n[0]] = BASS_AT[n[0]] || []).push(n);
    }
  })();

  /* Schedule every event that starts on this step, at time t. */
  function themeStepNotes(step, t, out) {
    var bar = Math.floor(step / 8);        // 0..7
    var inBar = step % 8;                  // 0..7
    var leads = LEAD_AT[step];
    if (leads) {
      for (var i = 0; i < leads.length; i++) {
        var dur = leads[i][2] * STEP * 0.92;
        // lead square voice
        tone({ type: "square", f0: freq(leads[i][1]), t: t, dur: dur, vol: 0.15, out: out });
      }
    }
    // echo voice: any lead note that started exactly one step ago
    var echoes = LEAD_AT[step - 1];
    if (echoes) {
      for (var j = 0; j < echoes.length; j++) {
        var edur = echoes[j][2] * STEP * 0.85;
        tone({ type: "square", f0: freq(echoes[j][1]), t: t, dur: edur, vol: 0.055, out: out });
      }
    }
    // bass: quarter-note triangle walk
    var basses = BASS_AT[step];
    if (basses) {
      for (var k = 0; k < basses.length; k++) {
        tone({ type: "triangle", f0: freq(basses[k][1]), t: t, dur: STEP * 1.7, vol: 0.17, out: out });
      }
    }
    // hats: noise on offbeat eighths (steps 1,3,5,7 of each bar)
    if (inBar % 2 === 1) {
      noise({ t: t, dur: 0.03, vol: 0.045, hp: 6000, out: out });
    }
    // snare: light band-limited noise on beats 2 and 4
    if (inBar === 2 || inBar === 6) {
      noise({ t: t, dur: 0.05, vol: 0.07, hp: 1500, lp: 6000, out: out });
    }
    // sparkle: tiny high blip at the top of every 2nd bar
    if (inBar === 0 && bar % 2 === 1) {
      tone({ type: "square", f0: freq("C7"), t: t, dur: 0.03, vol: 0.03, out: out });
    }
  }

  /* ---------- lookahead scheduler ----------
     One 100ms interval while any loop runs; each tick schedules
     every loop event falling within the next 300ms. Loops stop
     cleanly by ramping their private gain node to zero. */

  function schedulerTick() {
    if (!ctx) return;
    var horizon = ctx.currentTime + 0.3;
    var names = Object.keys(loops);
    for (var i = 0; i < names.length; i++) {
      var L = loops[names[i]];
      var guard = 0;
      while (L.next < horizon && guard < 64) {
        safe(function (loop, when) {
          return function () { loop.emit(when); };
        }(L, L.next));
        L.advance();
        guard++;
      }
    }
    if (Object.keys(loops).length === 0) stopScheduler();
  }

  function startScheduler() {
    if (schedTimer !== null) return;
    schedTimer = setInterval(function () { safe(schedulerTick); }, 100);
  }
  function stopScheduler() {
    if (schedTimer !== null) {
      clearInterval(schedTimer);
      schedTimer = null;
    }
  }

  function startLoop(name) {
    safe(function () {
      if (!ctx) init();
      if (!ctx || !master) return;
      if (loops[name]) return;            // idempotent
      var g = ctx.createGain();
      g.gain.value = 1;
      g.connect(master);
      var L = { gain: g, next: ctx.currentTime + 0.06, step: 0, emit: null, advance: null };

      if (name === "theme") {
        /* Full 8-bar chiptune, ~13.7s per pass. */
        L.step = 0;
        L.emit = function (t) { themeStepNotes(L.step, t, g); };
        L.advance = function () { L.step = (L.step + 1) % THEME_STEPS; L.next += STEP; };
      } else if (name === "sonar") {
        /* Tracking lock: soft 900Hz sine ping every 1.2s. */
        L.emit = function (t) {
          tone({ type: "sine", f0: 900, t: t, dur: 0.1, vol: 0.13, out: g });
        };
        L.advance = function () { L.next += 1.2; };
      } else if (name === "geiger_sweep") {
        /* Radar sweep: sparse random geiger clicks, 140-440ms
           apart, sometimes doubled. Densified by the radar widget
           when the sweep nears the target. */
        L.emit = function (t) {
          noise({ t: t, dur: 0.009, vol: 0.12, hp: 3000, out: g });
          if (Math.random() < 0.3) {
            noise({ t: t + 0.045, dur: 0.008, vol: 0.07, hp: 3000, out: g });
          }
        };
        L.advance = function () { L.next += 0.14 + Math.random() * 0.3; };
      } else {
        g.disconnect();                   // unknown loop: drop node
        return;
      }
      loops[name] = L;
      startScheduler();
    });
  }

  function stopLoop(name) {
    safe(function () {
      var L = loops[name];
      if (!L) return;
      delete loops[name];
      if (!ctx) return;
      var t = ctx.currentTime;
      L.gain.gain.cancelScheduledValues(t);
      L.gain.gain.setValueAtTime(L.gain.gain.value, t);
      L.gain.gain.linearRampToValueAtTime(0.0001, t + 0.04);  // no clicks
      setTimeout(function () {
        safe(function () { L.gain.disconnect(); });
      }, 500);
      if (Object.keys(loops).length === 0) stopScheduler();
    });
  }

  function play(name) {
    safe(function () { playCue(name); });
  }

  /* Free-frequency blip for callers that need arbitrary pitches
     (custom UI ticks, easter-egg melody notes). f in Hz. */
  function blip(f, dur, type, vol) {
    safe(function () {
      if (!ctx) init();
      if (!ctx) return;
      tone({ type: type || "square", f0: Number(f) || 660, t: ctx.currentTime + 0.001,
             dur: dur || 0.06, vol: vol === undefined ? 0.16 : vol });
    });
  }

  W.ST.audio = {
    init: init,
    setMuted: setMuted,
    isMuted: isMuted,
    setVolumeMaster: setVolumeMaster,
    play: play,
    blip: blip,
    startLoop: startLoop,
    stopLoop: stopLoop
  };
})();
