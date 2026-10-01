/* EchoSphere — procedural music engine.
 * Renders royalty-free demo tracks entirely in the browser with OfflineAudioContext,
 * so the app has a playable library without any server or downloaded files. */
(function () {
  const ES = (window.ES = window.ES || {});

  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
  };

  const STYLES = {
    lofi: { label: 'Lo-fi', bpm: [74, 86], scale: 'dorian', progs: [[1, 4, 0, 3], [0, 5, 3, 4], [1, 4, 2, 5]], swing: 0.2, seventh: true, drums: 'boom', pad: 'keys', lead: 'bell', bass: 'sub', vinyl: true, cutoff: 1700, rev: 0.25 },
    synthwave: { label: 'Synthwave', bpm: [98, 110], scale: 'minor', progs: [[0, 5, 2, 6], [0, 3, 5, 4], [5, 3, 0, 4]], swing: 0, drums: 'gated', pad: 'saw', lead: 'arp', bass: 'eighths', cutoff: 3000, rev: 0.32 },
    house: { label: 'Deep House', bpm: [120, 125], scale: 'minor', progs: [[0, 5, 3, 4], [0, 3, 4, 3], [5, 6, 0, 0]], swing: 0.06, seventh: true, drums: 'four', pad: 'stab', lead: 'pluck', bass: 'offbeat', cutoff: 2400, rev: 0.22 },
    ambient: { label: 'Ambient', bpm: [62, 70], scale: 'major', progs: [[0, 4, 5, 3], [3, 0, 4, 5]], swing: 0, drums: 'none', pad: 'wash', lead: 'bell', bass: 'drone', cutoff: 1300, rev: 0.65 },
    future: { label: 'Future Beats', bpm: [84, 92], scale: 'minor', progs: [[0, 5, 6, 4], [3, 4, 0, 0], [5, 4, 3, 4]], swing: 0.04, seventh: true, drums: 'trap', pad: 'saw', lead: 'pluck', bass: 'sub', cutoff: 2200, rev: 0.3 },
  };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /** Deterministic musical parameters for a track spec {seed, style}. */
  function describe(spec) {
    const st = STYLES[spec.style];
    const r = rng(spec.seed);
    const bpm = Math.round(st.bpm[0] + r() * (st.bpm[1] - st.bpm[0]));
    const root = 45 + Math.floor(r() * 8); // A2..E3
    const prog = st.progs[Math.floor(r() * st.progs.length)];
    const barLen = (60 / bpm) * 4;
    const bars = Math.max(16, Math.round(84 / barLen / 4) * 4);
    return { bpm, root, prog, bars, barLen, duration: bars * barLen + 3 };
  }

  function noiseBuffer(ctx, r) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
    return buf;
  }

  function impulse(ctx, seconds, decay, r) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  async function render(spec) {
    const st = STYLES[spec.style];
    const info = describe(spec);
    const r = rng(spec.seed * 7 + 13);
    const { bpm, root, prog, bars } = info;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const sr = 32000;
    const dur = info.duration;
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const scale = SCALES[st.scale];
    const noise = noiseBuffer(ctx, r);

    const master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    master.connect(comp);
    comp.connect(ctx.destination);
    master.gain.setValueAtTime(0, 0);
    master.gain.linearRampToValueAtTime(0.85, 1.2);
    master.gain.setValueAtTime(0.85, dur - 4.5);
    master.gain.linearRampToValueAtTime(0, dur - 0.3);

    const rev = ctx.createConvolver();
    rev.buffer = impulse(ctx, spec.style === 'ambient' ? 2.6 : 1.8, 2.6, r);
    const revOut = ctx.createGain();
    revOut.gain.value = 1;
    rev.connect(revOut);
    revOut.connect(master);

    function bus(gain, send, pan = 0) {
      const g = ctx.createGain();
      g.gain.value = gain;
      let out = g;
      if (pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p);
        out = p;
      }
      out.connect(master);
      if (send) {
        const s = ctx.createGain();
        s.gain.value = send;
        out.connect(s);
        s.connect(rev);
      }
      return g;
    }

    const drumBus = bus(0.9, st.drums === 'gated' ? 0.25 : 0.06);
    const bassBus = bus(0.55, 0);
    const padBus = bus(0.32, st.rev);
    const leadBus = bus(0.2, st.rev + 0.15, (r() - 0.5) * 0.5);

    // Notes are scheduled one bar ahead (via ctx.suspend) and each bar's voices are
    // disconnected a few bars later, so only a small graph is ever alive.
    let live = [];
    const out = (node, dest) => { node.connect(dest); live.push(node); };

    const deg = (d) => {
      const o = Math.floor(d / 7);
      return scale[((d % 7) + 7) % 7] + 12 * o;
    };
    const chordNotes = (d, n = 3) => {
      const out = [];
      for (let i = 0; i < n; i++) out.push(root + 12 + deg(d + i * 2));
      return out;
    };

    // ---- instruments ----
    function kick(t, v = 1) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.connect(g);
      out(g, drumBus);
      o.start(t);
      o.stop(t + 0.45);
    }
    function noiseHit(t, type, freq, q, v, decay) {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + decay);
      s.connect(f);
      f.connect(g);
      out(g, drumBus);
      s.start(t, r() * 1.5);
      s.stop(t + decay + 0.02);
    }
    function snare(t, v = 0.6) {
      noiseHit(t, 'bandpass', 1900, 0.7, v, 0.2);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 185;
      g.gain.setValueAtTime(v * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g);
      out(g, drumBus);
      o.start(t);
      o.stop(t + 0.12);
    }
    const clap = (t, v = 0.5) => {
      for (let i = 0; i < 3; i++) noiseHit(t + i * 0.011, 'highpass', 1200, 0.5, v * (i === 2 ? 1 : 0.5), i === 2 ? 0.22 : 0.03);
    };
    const hat = (t, v = 0.18, open = false) => noiseHit(t, 'highpass', 7500, 0.6, v, open ? 0.28 : 0.045);

    function voice(t, freq, len, o) {
      const types = o.types || ['sawtooth'];
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = o.q || 0.7;
      const cut = o.cutoff || st.cutoff;
      if (o.filterEnv) {
        f.frequency.setValueAtTime(cut * o.filterEnv, t);
        f.frequency.exponentialRampToValueAtTime(Math.max(120, cut * 0.25), t + Math.min(len, o.filterTime || 0.25));
      } else f.frequency.value = cut;
      const a = o.attack || 0.005;
      const rel = o.release || 0.15;
      const peak = o.gain || 0.3;
      const sus = o.sustain === undefined ? 0.7 : o.sustain;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setTargetAtTime(peak * sus, t + a, o.decay || 0.2);
      g.gain.setValueAtTime(peak * sus, t + Math.max(a, len));
      g.gain.setTargetAtTime(0, t + Math.max(a, len), rel / 3);
      f.connect(g);
      out(g, o.dest);
      types.forEach((type, i) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq * (o.ratio && i ? o.ratio : 1);
        osc.detune.value = (o.detune || 0) * (i % 2 ? 1 : -1) * (types.length > 1 ? 1 : 0);
        osc.connect(f);
        osc.start(t);
        osc.stop(t + Math.max(a, len) + rel + 0.05);
      });
    }

    const swingT = (t, step8) => (step8 % 2 ? t + st.swing * beat * 0.5 : t);
    const pent = [0, 2, 4, 7, 9];

    // ---- arrangement ----
    const breakdown = bars > 20 ? [bars / 2, bars / 2 + 4] : [-1, -1];
    function scheduleBar(b) {
      const t0 = 0.05 + b * bar;
      const chordDeg = prog[b % prog.length];
      const intro = b < 4;
      const outro = b >= bars - 4;
      const brk = b >= breakdown[0] && b < breakdown[1];
      const drumsOn = !intro && !outro && !brk && st.drums !== 'none';
      const notes = chordNotes(chordDeg, st.seventh ? 4 : 3);
      const bassNote = mtof(root + deg(chordDeg) - (root > 48 ? 12 : 0));

      // drums
      if (drumsOn) {
        const fill = b % 8 === 7;
        if (st.drums === 'boom') {
          [0, 1.75, 2.5].forEach((x) => kick(t0 + x * beat, 0.9));
          [1, 3].forEach((x) => snare(t0 + x * beat, 0.45));
          for (let i = 0; i < 8; i++) hat(swingT(t0 + i * beat * 0.5, i), i % 2 ? 0.08 : 0.14);
        } else if (st.drums === 'gated') {
          [0, 2].forEach((x) => kick(t0 + x * beat, 1));
          [1, 3].forEach((x) => snare(t0 + x * beat, 0.6));
          for (let i = 0; i < 8; i++) hat(t0 + i * beat * 0.5, 0.1);
          if (fill) [3.25, 3.5, 3.75].forEach((x) => snare(t0 + x * beat, 0.35));
        } else if (st.drums === 'four') {
          for (let i = 0; i < 4; i++) kick(t0 + i * beat, 1);
          [1, 3].forEach((x) => clap(t0 + x * beat, 0.45));
          for (let i = 0; i < 4; i++) hat(swingT(t0 + (i + 0.5) * beat, 1), 0.13, true);
          for (let i = 0; i < 16; i++) if (i % 4 !== 2) hat(t0 + i * beat * 0.25, 0.045);
        } else if (st.drums === 'trap') {
          [0, 2.75].forEach((x) => kick(t0 + x * beat, 1));
          if (r() > 0.5) kick(t0 + 3.5 * beat, 0.7);
          snare(t0 + 2 * beat, 0.6);
          for (let i = 0; i < 8; i++) {
            const t = t0 + i * beat * 0.5;
            if (r() < 0.18) for (let k = 0; k < 4; k++) hat(t + k * beat * 0.125, 0.06 + k * 0.015);
            else hat(t, i % 2 ? 0.07 : 0.12);
          }
        }
      }

      // bass
      if (!intro || st.bass === 'drone') {
        if (st.bass === 'sub') {
          voice(t0, bassNote, bar * 0.45, { dest: bassBus, types: ['sine', 'triangle'], gain: 0.55, cutoff: 500, release: 0.2 });
          voice(t0 + beat * 2.5, bassNote, bar * 0.3, { dest: bassBus, types: ['sine'], gain: 0.45, cutoff: 500 });
        } else if (st.bass === 'eighths') {
          for (let i = 0; i < 8; i++) voice(t0 + i * beat * 0.5, bassNote, beat * 0.4, { dest: bassBus, types: ['sawtooth'], gain: 0.4, cutoff: 900, filterEnv: 1.6, filterTime: 0.15, sustain: 0.4 });
        } else if (st.bass === 'offbeat') {
          for (let i = 0; i < 4; i++) voice(t0 + (i + 0.5) * beat, bassNote, beat * 0.35, { dest: bassBus, types: ['sawtooth', 'sine'], gain: 0.5, cutoff: 700, filterEnv: 2, filterTime: 0.12, sustain: 0.3 });
        } else if (st.bass === 'drone') {
          voice(t0, bassNote, bar, { dest: bassBus, types: ['sine'], gain: 0.35, attack: 1.2, release: 1.5, cutoff: 400 });
        }
      }

      // pads / chords
      notes.forEach((n, i) => {
        const f = mtof(n);
        if (st.pad === 'keys') {
          [0, 1.5, 2.75].forEach((x, k) => {
            if (k === 2 && r() > 0.5) return;
            voice(swingT(t0 + x * beat, k), f, beat * (k ? 0.9 : 1.4), { dest: padBus, types: ['triangle', 'sine'], ratio: 2.0, gain: 0.2, cutoff: st.cutoff, decay: 0.3, sustain: 0.35, release: 0.4 });
          });
        } else if (st.pad === 'saw') {
          voice(t0, f, bar - 0.1, { dest: padBus, types: ['sawtooth', 'sawtooth'], detune: 9, gain: 0.16, attack: 0.25, release: 0.6, cutoff: st.cutoff * (brk ? 0.5 : 1) });
        } else if (st.pad === 'stab') {
          [0.5, 1.75, 2.5, 3.5].forEach((x) => voice(t0 + x * beat, f, beat * 0.2, { dest: padBus, types: ['sawtooth', 'square'], detune: 7, gain: 0.17, cutoff: st.cutoff, filterEnv: 1.8, filterTime: 0.18, sustain: 0.2, release: 0.12 }));
        } else if (st.pad === 'wash') {
          if (b % 2 === 0 || i === 0) voice(t0, f, bar * 1.6, { dest: padBus, types: ['sawtooth', 'triangle'], detune: 12, gain: 0.13, attack: 1.8, release: 2.4, cutoff: st.cutoff });
        }
      });

      // lead
      const leadOn = b >= 8 && !outro && (!brk || st.lead === 'bell');
      if (leadOn) {
        if (st.lead === 'arp') {
          const arp = [...notes, notes[0] + 12, notes[1] + 12];
          const pattern = [0, 1, 2, 3, 2, 1, 4, 2];
          for (let i = 0; i < 16; i++) {
            voice(t0 + i * beat * 0.25, mtof(arp[pattern[i % 8] % arp.length] + 12), beat * 0.2, { dest: leadBus, types: ['square'], gain: 0.12, cutoff: 2600 + 1200 * Math.sin(b + i / 3), filterEnv: 1.5, filterTime: 0.1, sustain: 0.3 });
          }
        } else if (st.lead === 'bell') {
          for (let i = 0; i < 8; i++) {
            if (r() < (spec.style === 'ambient' ? 0.22 : 0.3)) {
              const n = root + 24 + pent[Math.floor(r() * pent.length)] + (r() > 0.7 ? 12 : 0);
              voice(swingT(t0 + i * beat * 0.5, i), mtof(n), beat * 0.3, { dest: leadBus, types: ['sine', 'sine'], ratio: 3.01, gain: 0.16, decay: 0.25, sustain: 0.05, release: 1.2, cutoff: 6000 });
            }
          }
        } else if (st.lead === 'pluck') {
          const motif = [];
          const mr = rng(spec.seed + 99);
          for (let i = 0; i < 8; i++) motif.push(mr() < 0.55 ? Math.floor(mr() * 5) : -1);
          motif.forEach((m, i) => {
            if (m < 0) return;
            const n = root + 24 + deg(chordDeg + m);
            voice(swingT(t0 + i * beat * 0.5, i), mtof(n), beat * 0.25, { dest: leadBus, types: ['sawtooth', 'triangle'], gain: 0.15, cutoff: 3200, filterEnv: 1.4, filterTime: 0.12, sustain: 0.15, release: 0.25 });
          });
        }
      }
      if (st.vinyl) for (let t = t0; t < t0 + bar; t += 0.05 + r() * 0.4) noiseHit(t, 'highpass', 3000, 0.5, 0.04 * r(), 0.01);
    }

    const bars_ = [];
    for (let b = 0; b <= bars; b++) bars_.push([]);
    const schedule = (b) => {
      live = bars_[b];
      if (b < bars) scheduleBar(b);
      else if (st.vinyl) for (let t = 0.05 + b * bar; t < dur; t += 0.05 + r() * 0.4) noiseHit(t, 'highpass', 3000, 0.5, 0.04 * r(), 0.01);
    };
    schedule(0);
    schedule(1);
    for (let b = 1; b < bars; b++) {
      ctx.suspend(b * bar).then(() => {
        schedule(b + 1);
        const old = bars_[b - 4];
        if (old) { old.forEach((n) => n.disconnect()); bars_[b - 4] = null; }
        ctx.resume();
      });
    }

    if (st.vinyl) {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 4000;
      f.Q.value = 0.4;
      const g = ctx.createGain();
      g.gain.value = 0.012;
      s.connect(f);
      f.connect(g);
      g.connect(master);
      s.start(0);
      s.stop(dur);
    }

    return ctx.startRendering();
  }

  function toWav(buffer) {
    const ch = buffer.numberOfChannels;
    const len = buffer.length;
    const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const w = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF');
    data.setUint32(4, 36 + len * ch * 2, true);
    w(8, 'WAVE');
    w(12, 'fmt ');
    data.setUint32(16, 16, true);
    data.setUint16(20, 1, true);
    data.setUint16(22, ch, true);
    data.setUint32(24, buffer.sampleRate, true);
    data.setUint32(28, buffer.sampleRate * ch * 2, true);
    data.setUint16(32, ch * 2, true);
    data.setUint16(34, 16, true);
    w(36, 'data');
    data.setUint32(40, len * ch * 2, true);
    const chans = [];
    for (let c = 0; c < ch; c++) chans.push(buffer.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < ch; c++) {
        const s = Math.max(-1, Math.min(1, chans[c][i]));
        data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return new Blob([data], { type: 'audio/wav' });
  }

  ES.synth = { rng, STYLES, describe, render, toWav };
})();
