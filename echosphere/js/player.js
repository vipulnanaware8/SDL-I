/* EchoSphere — playback engine.
 * Two audio "decks" routed through Web Audio allow true equal-power crossfades,
 * click-free pause/skip fades, a 5-band EQ, volume leveling and a live analyser. */
(function () {
  const ES = (window.ES = window.ES || {});
  const store = ES.store;
  const S = store.data.settings;

  const EQ_BANDS = [
    { f: 60, type: 'lowshelf', label: '60' },
    { f: 250, type: 'peaking', label: '250' },
    { f: 1000, type: 'peaking', label: '1K' },
    { f: 4000, type: 'peaking', label: '4K' },
    { f: 12000, type: 'highshelf', label: '12K' },
  ];
  const EQ_PRESETS = {
    Flat: [0, 0, 0, 0, 0],
    'Bass Boost': [7, 4, 0, 0, 1],
    Warm: [3, 2, 0, -2, -3],
    Vocal: [-2, 0, 3, 4, 1],
    Bright: [-1, 0, 1, 4, 6],
    Electronic: [5, 2, -1, 2, 4],
    Night: [2, 1, 0, -3, -6],
  };

  const p = {
    ctx: null, decks: [], active: 0, current: null, loading: false,
    queue: [], qIndex: -1, original: null, manual: [], history: [],
    shuffle: false, repeat: 'off', contextName: '', contextRoute: '',
    sleepAt: null, sleepEndOfTrack: false, autoAdvanced: false, token: 0, muted: false,
  };

  function makeDeck() {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    return { audio, src: null, gain: null, fadeToken: 0 };
  }
  p.decks = [makeDeck(), makeDeck()];

  function ensureCtx() {
    if (p.ctx) {
      if (p.ctx.state === 'suspended') p.ctx.resume();
      return;
    }
    const ctx = (p.ctx = new (window.AudioContext || window.webkitAudioContext)());
    p.eq = EQ_BANDS.map((b, i) => {
      const f = ctx.createBiquadFilter();
      f.type = b.type;
      f.frequency.value = b.f;
      f.Q.value = 1;
      f.gain.value = S.eq[i] || 0;
      return f;
    });
    p.leveler = ctx.createDynamicsCompressor();
    p.bypass = ctx.createGain();
    p.master = ctx.createGain();
    p.master.gain.value = p.muted ? 0 : S.volume * S.volume;
    p.analyser = ctx.createAnalyser();
    p.analyser.fftSize = 2048;
    p.analyser.smoothingTimeConstant = 0.82;
    const input = ctx.createGain();
    p.decks.forEach((d) => {
      d.src = ctx.createMediaElementSource(d.audio);
      d.gain = ctx.createGain();
      d.gain.gain.value = 0;
      d.src.connect(d.gain);
      d.gain.connect(input);
    });
    input.connect(p.eq[0]);
    for (let i = 0; i < p.eq.length - 1; i++) p.eq[i].connect(p.eq[i + 1]);
    p.post = p.eq[p.eq.length - 1];
    p.leveler.threshold.value = -20;
    p.leveler.knee.value = 12;
    p.leveler.ratio.value = 3;
    p.leveler.attack.value = 0.01;
    p.leveler.release.value = 0.3;
    p.leveler.connect(p.master);
    p.bypass.connect(p.master);
    setLeveling(S.normalize);
    p.master.connect(p.analyser);
    p.analyser.connect(ctx.destination);
  }

  function setLeveling(on) {
    S.normalize = on;
    store.save();
    if (!p.ctx) return;
    try { p.post.disconnect(); } catch (e) { /* not connected yet */ }
    p.post.connect(on ? p.leveler : p.bypass);
  }

  const cur = () => p.decks[p.active];
  const curve = (from, to, n = 64) => {
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      // equal-power: keeps perceived loudness constant through the blend
      c[i] = to > from ? from + (to - from) * Math.sin((x * Math.PI) / 2) : to + (from - to) * Math.cos((x * Math.PI) / 2);
    }
    return c;
  };
  function ramp(param, to, secs) {
    const now = p.ctx.currentTime;
    const from = param.value;
    param.cancelScheduledValues(now);
    if (secs <= 0.01) { param.setValueAtTime(to, now); return; }
    param.setValueAtTime(from, now);
    param.setValueCurveAtTime(curve(from, to), now, secs);
  }

  function emit() { store.emit('player', p); }

  async function playId(id, opts = {}) {
    const track = store.get(id);
    if (!track) return;
    ensureCtx();
    const token = ++p.token;
    if (p.current && p.current !== id && opts.history !== false) p.history.push(p.current);
    if (p.history.length > 100) p.history.shift();
    p.current = id;
    p.loading = true;
    p.autoAdvanced = false;
    emit();
    let url;
    try { url = await store.getUrl(track); } catch (e) {
      p.loading = false;
      store.emit('toast', `Couldn't load "${track.title}"`);
      emit();
      return;
    }
    if (token !== p.token) return;

    const outgoing = cur();
    const incomingIdx = 1 - p.active;
    const incoming = p.decks[incomingIdx];
    const wasPlaying = !outgoing.audio.paused;
    const fade = opts.crossfade && wasPlaying ? S.crossfade : wasPlaying && S.smooth ? 0.35 : 0.02;

    incoming.fadeToken++;
    incoming.audio.src = url;
    incoming.audio.playbackRate = S.speed;
    incoming.audio.preservesPitch = true;
    try { incoming.audio.currentTime = opts.at || 0; } catch (e) { /* set after metadata */ }
    try { await incoming.audio.play(); } catch (e) {
      if (token === p.token) { p.loading = false; emit(); }
      return;
    }
    if (token !== p.token) { incoming.audio.pause(); return; }
    if (opts.at && Math.abs(incoming.audio.currentTime - opts.at) > 1) incoming.audio.currentTime = opts.at;

    ramp(incoming.gain.gain, 1, fade);
    const ft = ++outgoing.fadeToken;
    ramp(outgoing.gain.gain, 0, fade);
    setTimeout(() => { if (outgoing.fadeToken === ft) outgoing.audio.pause(); }, fade * 1000 + 80);

    p.active = incomingIdx;
    p.loading = false;
    store.notePlayed(id);
    updateMediaSession(track);
    emit();
    preloadNext();
  }

  function preloadNext() {
    const n = peekNext();
    if (n) setTimeout(() => store.getUrl(store.get(n)).catch(() => {}), 1500);
  }

  /** Start playing a list ("context") from a given index — e.g. a playlist or album. */
  function playList(ids, index = 0, name = '', route = '') {
    if (!ids.length) return;
    p.original = [...ids];
    p.contextName = name;
    p.contextRoute = route;
    if (p.shuffle) {
      const first = ids[index];
      p.queue = [first, ...smartShuffle(ids.filter((_, i) => i !== index))];
      p.qIndex = 0;
    } else {
      p.queue = [...ids];
      p.qIndex = index;
    }
    playId(p.queue[p.qIndex]);
  }

  /** Shuffle that avoids back-to-back songs by the same artist where possible. */
  function smartShuffle(ids) {
    const a = [...ids];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    for (let i = 1; i < a.length; i++) {
      const prev = store.get(a[i - 1]), now = store.get(a[i]);
      if (prev && now && prev.artist === now.artist) {
        const k = a.findIndex((x, idx) => idx > i && store.get(x)?.artist !== prev.artist);
        if (k > 0) [a[i], a[k]] = [a[k], a[i]];
      }
    }
    return a;
  }

  function peekNext() {
    if (p.repeat === 'one') return p.current;
    if (p.manual.length) return p.manual[0];
    if (p.qIndex + 1 < p.queue.length) return p.queue[p.qIndex + 1];
    if (p.repeat === 'all' && p.queue.length) return p.queue[0];
    return null;
  }

  function next(auto = false) {
    if (auto && p.sleepEndOfTrack) { cancelSleep(); pause(true); return; }
    if (auto && p.repeat === 'one') { playId(p.current, { crossfade: true, history: false }); return; }
    if (p.manual.length) { playId(p.manual.shift(), { crossfade: auto }); return; }
    if (p.qIndex + 1 < p.queue.length) p.qIndex++;
    else if (p.repeat === 'all' && p.queue.length) p.qIndex = 0;
    else {
      if (auto) { p.autoAdvanced = true; emit(); }
      return;
    }
    playId(p.queue[p.qIndex], { crossfade: auto });
  }

  function prev() {
    const a = cur().audio;
    if (a.currentTime > 3 || (!p.history.length && p.qIndex <= 0)) { seek(0); return; }
    let id = p.history.pop();
    if (!id && p.qIndex > 0) id = p.queue[p.qIndex - 1];
    const qi = p.queue.lastIndexOf(id);
    if (qi >= 0) p.qIndex = qi;
    playId(id, { history: false });
  }

  function pause(long) {
    const d = cur();
    if (!p.ctx || d.audio.paused) return;
    const ft = ++d.fadeToken;
    const t = long ? 6 : S.smooth ? 0.25 : 0.01;
    ramp(d.gain.gain, 0, t);
    setTimeout(() => {
      if (d.fadeToken === ft) { d.audio.pause(); emit(); }
    }, t * 1000 + 30);
    p.pausing = true;
    emit();
    setTimeout(() => { p.pausing = false; }, t * 1000 + 40);
  }

  function resume() {
    if (!p.current) {
      const all = store.all();
      playList(all.map((t) => t.id), 0, 'All songs', '#/home');
      return;
    }
    ensureCtx();
    const d = cur();
    if (!d.audio.src) { playId(p.current, { at: p.resumeAt || 0, history: false }); return; }
    d.fadeToken++;
    d.audio.play().then(() => {
      ramp(d.gain.gain, 1, S.smooth ? 0.3 : 0.01);
      emit();
    }).catch(() => {});
  }

  const isPlaying = () => !!p.ctx && !cur().audio.paused && !p.pausing;
  const toggle = () => (isPlaying() ? pause() : resume());

  function seek(sec) {
    const a = cur().audio;
    if (!a.src) { p.resumeAt = sec; emit(); return; }
    const d = cur();
    if (S.smooth && !a.paused && p.ctx) {
      // micro-dip so seeking never clicks
      const g = d.gain.gain, now = p.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + 0.04);
      setTimeout(() => { a.currentTime = Math.max(0, Math.min(sec, a.duration || sec)); ramp(g, 1, 0.12); }, 45);
    } else a.currentTime = Math.max(0, Math.min(sec, a.duration || sec));
    p.autoAdvanced = false;
    emit();
  }

  function setVolume(v) {
    S.volume = Math.max(0, Math.min(1, v));
    p.muted = false;
    if (p.ctx) p.master.gain.setTargetAtTime(S.volume * S.volume, p.ctx.currentTime, 0.03);
    store.save();
    emit();
  }
  function toggleMute() {
    p.muted = !p.muted;
    if (p.ctx) p.master.gain.setTargetAtTime(p.muted ? 0 : S.volume * S.volume, p.ctx.currentTime, 0.04);
    emit();
  }
  function setEq(i, db) {
    S.eq[i] = db;
    S.eqPreset = 'Custom';
    if (p.ctx) p.eq[i].gain.setTargetAtTime(db, p.ctx.currentTime, 0.05);
    store.save();
  }
  function setEqPreset(name) {
    const v = EQ_PRESETS[name];
    if (!v) return;
    v.forEach((db, i) => setEq(i, db));
    S.eqPreset = name;
    store.save();
  }
  function setSpeed(s) {
    S.speed = s;
    p.decks.forEach((d) => (d.audio.playbackRate = s));
    store.save();
    emit();
  }

  function toggleShuffle() {
    p.shuffle = !p.shuffle;
    if (p.original && p.current) {
      if (p.shuffle) {
        p.queue = [p.current, ...smartShuffle(p.original.filter((x) => x !== p.current))];
        p.qIndex = 0;
      } else {
        p.queue = [...p.original];
        p.qIndex = Math.max(0, p.queue.indexOf(p.current));
      }
    }
    emit();
  }
  function cycleRepeat() {
    p.repeat = { off: 'all', all: 'one', one: 'off' }[p.repeat];
    emit();
  }
  function addToQueue(ids, front = false) {
    if (front) p.manual.unshift(...ids);
    else p.manual.push(...ids);
    if (!p.current) next();
    emit();
    preloadNext();
  }
  function removeFromQueue(kind, i) {
    if (kind === 'manual') p.manual.splice(i, 1);
    else p.queue.splice(i, 1);
    emit();
  }
  function moveInQueue(kind, from, to) {
    const arr = kind === 'manual' ? p.manual : p.queue;
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x);
    emit();
  }
  function jumpTo(kind, i) {
    if (kind === 'manual') {
      const [id] = p.manual.splice(i, 1);
      playId(id);
    } else {
      p.qIndex = i;
      playId(p.queue[i]);
    }
  }

  // ---- sleep timer ----
  let sleepTimer;
  function setSleep(minutes) {
    cancelSleep();
    if (minutes === 'end') { p.sleepEndOfTrack = true; emit(); return; }
    p.sleepAt = Date.now() + minutes * 60000;
    sleepTimer = setTimeout(() => { pause(true); cancelSleep(); store.emit('toast', 'Sleep timer ended — good night 🌙'); }, minutes * 60000);
    emit();
  }
  function cancelSleep() {
    clearTimeout(sleepTimer);
    p.sleepAt = null;
    p.sleepEndOfTrack = false;
    emit();
  }

  // ---- per-frame driver: auto-advance with crossfade ----
  function tick() {
    const a = cur().audio;
    if (p.current && !a.paused && !p.loading && isFinite(a.duration)) {
      const remaining = (a.duration - a.currentTime) / (S.speed || 1);
      const lead = S.crossfade > 0 ? S.crossfade : 0.05;
      if (remaining <= lead && !p.autoAdvanced) {
        p.autoAdvanced = true;
        next(true);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  p.decks.forEach((d, i) => d.audio.addEventListener('ended', () => {
    if (i === p.active && !p.autoAdvanced) { p.autoAdvanced = true; next(true); }
    if (i === p.active) emit();
  }));

  // ---- OS media controls ----
  function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;
    const art = ES.covers ? ES.covers.urlFor(track, 512) : null;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title, artist: track.artist, album: track.album,
      artwork: art ? [{ src: art, sizes: '512x512', type: 'image/png' }] : [],
    });
  }
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    const h = {
      play: resume, pause: () => pause(), nexttrack: () => next(), previoustrack: prev,
      seekto: (e) => seek(e.seekTime), seekforward: () => seek(cur().audio.currentTime + 10), seekbackward: () => seek(cur().audio.currentTime - 10),
    };
    Object.entries(h).forEach(([k, fn]) => { try { ms.setActionHandler(k, fn); } catch (e) { /* unsupported action */ } });
  }

  // ---- session persistence ----
  function saveSession() {
    const a = cur().audio;
    store.data.session = {
      current: p.current, queue: p.queue, qIndex: p.qIndex, original: p.original, manual: p.manual,
      shuffle: p.shuffle, repeat: p.repeat, at: a.src ? a.currentTime : p.resumeAt || 0, contextName: p.contextName, contextRoute: p.contextRoute,
    };
    store.save();
  }
  setInterval(() => { if (isPlaying()) saveSession(); }, 4000);
  window.addEventListener('pagehide', saveSession);
  function restoreSession() {
    const s = store.data.session;
    if (!s || !s.current || !store.get(s.current)) return;
    Object.assign(p, {
      current: s.current, queue: (s.queue || []).filter(store.get), manual: (s.manual || []).filter(store.get),
      original: s.original, shuffle: !!s.shuffle, repeat: s.repeat || 'off', resumeAt: s.at || 0,
      contextName: s.contextName || '', contextRoute: s.contextRoute || '',
    });
    p.qIndex = Math.max(0, p.queue.indexOf(s.current));
    emit();
  }

  function position() {
    const a = cur().audio;
    const t = store.get(p.current);
    return {
      time: a.src ? a.currentTime : p.resumeAt || 0,
      duration: a.src && isFinite(a.duration) ? a.duration : t ? t.duration : 0,
    };
  }

  ES.player = Object.assign(p, {
    EQ_BANDS, EQ_PRESETS, ensureCtx, playId, playList, next, prev, pause, resume, toggle, isPlaying, seek,
    setVolume, toggleMute, setEq, setEqPreset, setSpeed, toggleShuffle, cycleRepeat, addToQueue,
    removeFromQueue, moveInQueue, jumpTo, setSleep, cancelSleep, setLeveling, restoreSession, position, peekNext, saveSession,
  });
})();
