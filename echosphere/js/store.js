/* EchoSphere — library, persistence (localStorage + IndexedDB) and local file import. */
(function () {
  const ES = (window.ES = window.ES || {});
  const { describe } = ES.synth;

  const DEMOS = [
    ['Neon Drift', 'Velvet Static', 'Night Drive', 'synthwave', 11],
    ['Paper Lanterns', 'Mori Haze', 'Quiet Rooms', 'lofi', 22],
    ['Afterglow Avenue', 'Lumen Park', 'Golden Hour', 'house', 33],
    ['Glacier Hymn', 'Aster & Sea', 'Northern Light', 'ambient', 44],
    ['Midnight Metro', 'Velvet Static', 'Night Drive', 'synthwave', 55],
    ['Rainy Window', 'Mori Haze', 'Quiet Rooms', 'lofi', 66],
    ['Satellite Heart', 'Kairo', 'Orbit', 'future', 77],
    ['Sunday Static', 'Lumen Park', 'Golden Hour', 'house', 88],
    ['Tidepool', 'Aster & Sea', 'Northern Light', 'ambient', 99],
    ['Echo Chamber', 'Kairo', 'Orbit', 'future', 110],
    ['Coffee & Cassettes', 'Mori Haze', 'Quiet Rooms', 'lofi', 121],
    ['Chrome Horizon', 'Velvet Static', 'Night Drive', 'synthwave', 132],
    ['Warehouse Bloom', 'Lumen Park', 'Golden Hour', 'house', 143],
    ['Low Orbit', 'Kairo', 'Orbit', 'future', 154],
  ];
  const STYLE_HUE = { synthwave: 300, lofi: 28, house: 190, ambient: 160, future: 250 };

  const hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };

  const tracks = new Map();
  DEMOS.forEach(([title, artist, album, style, seed]) => {
    const info = describe({ seed, style });
    tracks.set('d' + seed, {
      id: 'd' + seed, title, artist, album, style, seed, source: 'demo',
      bpm: info.bpm, duration: info.duration,
      hue: (STYLE_HUE[style] + (hash(album) % 5) * 8) % 360,
    });
  });

  // ---------- persisted state ----------
  const LS_KEY = 'echosphere:v1';
  const defaults = {
    liked: ['d22', 'd11'],
    playlists: [{ id: 'p1', name: 'Late Night Focus', trackIds: ['d22', 'd66', 'd99', 'd121'], hue: 210, created: Date.now() }],
    recent: [],
    plays: {},
    settings: { volume: 0.8, crossfade: 6, smooth: true, speed: 1, eq: [0, 0, 0, 0, 0], eqPreset: 'Flat', viz: 'bars', reduceMotion: false, normalize: true },
    session: null,
  };
  let data;
  try {
    data = Object.assign({}, defaults, JSON.parse(localStorage.getItem(LS_KEY) || '{}'));
    data.settings = Object.assign({}, defaults.settings, data.settings);
  } catch (e) {
    data = JSON.parse(JSON.stringify(defaults));
  }
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ }
    }, 150);
  }

  // ---------- event bus ----------
  const listeners = {};
  const on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  const emit = (ev, payload) => (listeners[ev] || []).forEach((fn) => fn(payload));

  // ---------- IndexedDB for imported audio ----------
  let dbp;
  function db() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open('echosphere', 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore('tracks', { keyPath: 'id' });
          req.result.createObjectStore('renders', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbp;
  }
  async function idb(store, mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadLocal() {
    try {
      const all = await idb('tracks', 'readonly', (s) => s.getAll());
      (all || []).forEach((rec) => {
        const { blob, picture, ...meta } = rec;
        meta.pictureBlob = picture || null;
        tracks.set(meta.id, meta);
      });
    } catch (e) { console.warn('IndexedDB unavailable', e); }
  }

  // ---------- audio URLs ----------
  const urlCache = new Map();
  const pending = new Map();
  function getUrl(track) {
    if (urlCache.has(track.id)) return Promise.resolve(urlCache.get(track.id));
    if (pending.has(track.id)) return pending.get(track.id);
    const p = (async () => {
      let blob;
      if (track.source === 'demo') {
        const cached = await idb('renders', 'readonly', (s) => s.get(track.id)).catch(() => null);
        if (cached && cached.v === 3) blob = cached.blob;
        else {
          const buf = await ES.synth.render({ seed: track.seed, style: track.style });
          blob = ES.synth.toWav(buf);
          idb('renders', 'readwrite', (s) => s.put({ id: track.id, v: 3, blob })).catch(() => {});
        }
      } else {
        const rec = await idb('tracks', 'readonly', (s) => s.get(track.id));
        blob = rec.blob;
      }
      const url = URL.createObjectURL(blob);
      urlCache.set(track.id, url);
      // keep memory bounded: release old songs that neither deck is using
      const inUse = new Set((ES.player ? ES.player.decks : []).map((d) => d.audio.src));
      for (const [id, u] of urlCache) {
        if (urlCache.size <= 6) break;
        if (id !== track.id && !inUse.has(u)) { URL.revokeObjectURL(u); urlCache.delete(id); }
      }
      pending.delete(track.id);
      return url;
    })();
    p.catch(() => pending.delete(track.id));
    pending.set(track.id, p);
    return p;
  }

  // ---------- ID3v2 tag reader (title / artist / album / cover) ----------
  async function readTags(file) {
    const tags = {};
    try {
      const head = new DataView(await file.slice(0, 10).arrayBuffer());
      if (head.getUint8(0) !== 0x49 || head.getUint8(1) !== 0x44 || head.getUint8(2) !== 0x33) return tags;
      const ver = head.getUint8(3);
      const syncsafe = (v) => ((v >> 24) & 0x7f) * 2097152 + ((v >> 16) & 0x7f) * 16384 + ((v >> 8) & 0x7f) * 128 + (v & 0x7f);
      const size = syncsafe(head.getUint32(6));
      const buf = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer());
      const dv = new DataView(buf.buffer);
      const decode = (bytes) => {
        const enc = bytes[0];
        const body = bytes.subarray(1);
        const label = enc === 1 ? 'utf-16' : enc === 2 ? 'utf-16be' : enc === 3 ? 'utf-8' : 'latin1';
        return new TextDecoder(label).decode(body).replace(/\0+$/, '').replace(/^﻿/, '').trim();
      };
      let p = 0;
      while (p + 10 < buf.length) {
        const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
        if (!/^[A-Z0-9]{4}$/.test(id)) break;
        const raw = dv.getUint32(p + 4);
        const len = ver === 4 ? syncsafe(raw) : raw;
        const body = buf.subarray(p + 10, p + 10 + len);
        if (id === 'TIT2') tags.title = decode(body);
        else if (id === 'TPE1') tags.artist = decode(body);
        else if (id === 'TALB') tags.album = decode(body);
        else if (id === 'APIC') {
          const enc = body[0];
          let i = 1;
          while (body[i]) i++;
          const mime = new TextDecoder('latin1').decode(body.subarray(1, i)) || 'image/jpeg';
          i += 2; // terminator + picture type
          if (enc === 1 || enc === 2) { while (i + 1 < body.length && (body[i] || body[i + 1])) i += 2; i += 2; }
          else { while (i < body.length && body[i]) i++; i++; }
          tags.picture = new Blob([body.slice(i)], { type: mime });
        }
        p += 10 + len;
      }
    } catch (e) { /* malformed tags: fall back to filename */ }
    return tags;
  }

  function probeDuration(file) {
    return new Promise((resolve) => {
      const a = new Audio();
      const url = URL.createObjectURL(file);
      const done = (d) => { URL.revokeObjectURL(url); resolve(d); };
      a.preload = 'metadata';
      a.onloadedmetadata = () => done(isFinite(a.duration) ? a.duration : 0);
      a.onerror = () => done(-1);
      a.src = url;
    });
  }

  async function importFiles(files) {
    const added = [];
    for (const file of files) {
      if (!/^audio\//.test(file.type) && !/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i.test(file.name)) continue;
      const duration = await probeDuration(file);
      if (duration < 0) { emit('toast', `Can't play "${file.name}" in this browser`); continue; }
      const tags = await readTags(file);
      const base = file.name.replace(/\.[^.]+$/, '');
      const parts = base.split(/\s+-\s+/);
      const id = 'l' + hash(file.name + file.size).toString(36);
      const meta = {
        id, source: 'local', duration,
        title: tags.title || (parts.length > 1 ? parts.slice(1).join(' - ') : base),
        artist: tags.artist || (parts.length > 1 ? parts[0] : 'Unknown artist'),
        album: tags.album || 'Imported',
        hue: hash(file.name) % 360,
        added: Date.now(),
      };
      try {
        await idb('tracks', 'readwrite', (s) => s.put({ ...meta, blob: file, picture: tags.picture || null }));
      } catch (e) { emit('toast', 'Could not save file — storage may be full'); continue; }
      meta.pictureBlob = tags.picture || null;
      tracks.set(id, meta);
      added.push(meta);
    }
    if (added.length) emit('library');
    return added;
  }

  async function removeLocal(id) {
    await idb('tracks', 'readwrite', (s) => s.delete(id));
    tracks.delete(id);
    data.liked = data.liked.filter((x) => x !== id);
    data.playlists.forEach((p) => (p.trackIds = p.trackIds.filter((x) => x !== id)));
    if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
    save();
    emit('library');
  }

  // ---------- library helpers ----------
  const all = () => [...tracks.values()];
  const get = (id) => tracks.get(id);
  const isLiked = (id) => data.liked.includes(id);
  function toggleLike(id) {
    if (isLiked(id)) data.liked = data.liked.filter((x) => x !== id);
    else data.liked.unshift(id);
    save();
    emit('likes', id);
    return isLiked(id);
  }
  function createPlaylist(name, trackIds = []) {
    const p = { id: 'p' + Date.now().toString(36), name: name || `My Playlist #${data.playlists.length + 1}`, trackIds: [...trackIds], hue: Math.floor(Math.random() * 360), created: Date.now() };
    data.playlists.push(p);
    save();
    emit('playlists');
    return p;
  }
  const playlist = (id) => data.playlists.find((p) => p.id === id);
  function addToPlaylist(pid, ids) {
    const p = playlist(pid);
    if (!p) return 0;
    const fresh = ids.filter((id) => !p.trackIds.includes(id));
    p.trackIds.push(...fresh);
    save();
    emit('playlists');
    return fresh.length;
  }
  function removeFromPlaylist(pid, id) {
    const p = playlist(pid);
    p.trackIds = p.trackIds.filter((x) => x !== id);
    save();
    emit('playlists');
  }
  function renamePlaylist(pid, name) {
    const p = playlist(pid);
    if (p && name) { p.name = name; save(); emit('playlists'); }
  }
  function deletePlaylist(pid) {
    data.playlists = data.playlists.filter((p) => p.id !== pid);
    save();
    emit('playlists');
  }
  function movePlaylistTrack(pid, from, to) {
    const p = playlist(pid);
    const [x] = p.trackIds.splice(from, 1);
    p.trackIds.splice(to, 0, x);
    save();
    emit('playlists');
  }
  function notePlayed(id) {
    data.recent = [id, ...data.recent.filter((x) => x !== id)].slice(0, 30);
    data.plays[id] = (data.plays[id] || 0) + 1;
    save();
  }

  /** Fuzzy search: substring hits rank above in-order character matches. */
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const score = (s) => {
      s = s.toLowerCase();
      const i = s.indexOf(q);
      if (i === 0) return 100;
      if (i > 0) return 80 - Math.min(i, 30);
      let j = 0, gaps = 0, last = -1;
      for (let k = 0; k < s.length && j < q.length; k++) if (s[k] === q[j]) { if (last >= 0) gaps += k - last - 1; last = k; j++; }
      return j === q.length ? Math.max(1, 40 - gaps) : 0;
    };
    return all()
      .map((t) => ({ t, s: Math.max(score(t.title) * 1.2, score(t.artist), score(t.album) * 0.8, score(ES.synth.STYLES[t.style]?.label || '') * 0.7) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.t);
  }

  ES.store = {
    data, save, on, emit, all, get, getUrl, importFiles, removeLocal, loadLocal,
    isLiked, toggleLike, createPlaylist, playlist, addToPlaylist, removeFromPlaylist,
    renamePlaylist, deletePlaylist, movePlaylistTrack, notePlayed, search, hash,
  };
})();
