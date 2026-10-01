/* EchoSphere — interface: routing, views, queue, palette, menus, gestures and shortcuts. */
(function () {
  const ES = window.ES;
  const { store, player: P, covers, viz } = ES;
  const D = store.data;
  const S = D.settings;
  const STY = ES.synth.STYLES;

  // ---------------- helpers ----------------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const enc = encodeURIComponent;
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), x = Math.floor(s % 60);
    return `${m}:${String(x).padStart(2, '0')}`;
  };
  const fmtLong = (s) => {
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return h ? `${h} hr ${m} min` : `${m} min`;
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const isMobile = () => matchMedia('(max-width: 720px)').matches;

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    library: '<path d="M4 4v16M9 4v16M14 4.5l5 15"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    command: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    heart: '<path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 4.5 6.6 4.5c2 0 3.4 1.1 4.4 2.6 1-1.5 2.4-2.6 4.4-2.6 3.6 0 5.4 3.8 3.8 6.9C19 15.6 12 20 12 20z"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    prev: '<path d="M6 5v14"/><path d="M19 5 9 12l10 7z" fill="currentColor"/>',
    next: '<path d="M18 5v14"/><path d="m5 5 10 7-10 7z" fill="currentColor"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    loading: '<path d="M12 3a9 9 0 1 0 9 9"/>',
    repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    queue: '<path d="M3 6h14M3 12h14M3 18h9"/><path d="m17 15 5 3-5 3z" fill="currentColor"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13"/>',
    'volume-low': '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="m17 9 5 6M22 9l-5 6"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    dots: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
    'list-plus': '<path d="M3 6h12M3 12h12M3 18h7M17 15v6M14 18h6"/>',
    'play-next': '<path d="M3 6h10M3 12h7M3 18h7"/><path d="m15 11 6 4-6 4z" fill="currentColor"/>',
    sparkle: '<path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    wave: '<path d="M2 12h2l2-6 3 12 3-14 3 16 3-10 2 4h2"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h0M10 10h0M14 10h0M18 10h0M7 14h10"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  function hydrateIcons(root = document) {
    $$('i[data-icon]', root).forEach((i) => (i.outerHTML = icon(i.dataset.icon)));
  }
  const setIcon = (btn, n) => {
    if (btn && btn.dataset.ic !== n) { btn.dataset.ic = n; btn.innerHTML = icon(n); }
  };

  // ---------------- collections ----------------
  const albums = () => {
    const m = new Map();
    store.all().forEach((t) => {
      const k = t.album + '\u0000' + t.artist;
      if (!m.has(k)) m.set(k, { album: t.album, artist: t.artist, ids: [], track: t });
      m.get(k).ids.push(t.id);
    });
    return [...m.values()];
  };
  const artists = () => {
    const m = new Map();
    store.all().forEach((t) => {
      if (!m.has(t.artist)) m.set(t.artist, { artist: t.artist, ids: [], track: t });
      m.get(t.artist).ids.push(t.id);
    });
    return [...m.values()];
  };
  function collection(kind, arg) {
    const all = store.all();
    switch (kind) {
      case 'liked': return { ids: D.liked.filter(store.get), name: 'Liked Songs', route: '#/liked' };
      case 'playlist': {
        const p = store.playlist(arg);
        return p ? { ids: p.trackIds.filter(store.get), name: p.name, route: '#/playlist/' + p.id, playlist: p } : null;
      }
      case 'album': return { ids: all.filter((t) => t.album === arg).map((t) => t.id), name: arg, route: '#/album/' + enc(arg) };
      case 'artist': return { ids: all.filter((t) => t.artist === arg).map((t) => t.id), name: arg, route: '#/artist/' + enc(arg) };
      case 'mix': {
        const ids = all.filter((t) => t.style === arg).map((t) => t.id);
        return { ids, name: `${STY[arg]?.label || arg} Mix`, route: '#/mix/' + arg };
      }
      case 'uploads': return { ids: all.filter((t) => t.source === 'local').sort((a, b) => b.added - a.added).map((t) => t.id), name: 'Your uploads', route: '#/uploads' };
      case 'recent': return { ids: D.recent.filter(store.get), name: 'Recently played', route: '#/recent' };
      case 'radio': return radio(arg);
      default: return { ids: all.map((t) => t.id), name: 'All songs', route: '#/home' };
    }
  }
  /** Radio: same mood first, then nearest tempo — an endless-feeling station from one seed song. */
  function radio(id) {
    const seed = store.get(id);
    if (!seed) return null;
    const others = store.all().filter((t) => t.id !== id).map((t) => {
      let s = 0;
      if (seed.style && t.style === seed.style) s += 50;
      if (t.artist === seed.artist) s += 15;
      if (seed.bpm && t.bpm) s += 30 - Math.min(30, Math.abs(t.bpm - seed.bpm));
      if (store.isLiked(t.id)) s += 8;
      return { t, s: s + Math.random() * 10 };
    }).sort((a, b) => b.s - a.s).map((x) => x.t.id);
    return { ids: [id, ...others], name: `${seed.title} Radio`, route: '#/radio/' + id };
  }
  function playCollection(kind, arg, index = 0) {
    const c = collection(kind, arg);
    if (!c || !c.ids.length) { toast('Nothing to play here yet'); return; }
    if (P.contextRoute === c.route && P.current && c.ids.includes(P.current) && index === 0) { P.toggle(); return; }
    P.playList(c.ids, index, c.name, c.route);
  }

  // ---------------- art ----------------
  function thumbFor(kind, arg, size = 300) {
    if (kind === 'liked') return `<div class="thumb liked">${icon('heart')}</div>`;
    const c = collection(kind, arg);
    const ids = c ? c.ids : [];
    if (kind === 'playlist') {
      const uniq = [...new Set(ids.map((id) => covers.urlFor(store.get(id), size)))];
      if (uniq.length >= 4) return `<div class="thumb mosaic">${uniq.slice(0, 4).map((u) => `<img src="${u}" alt="" loading="lazy">`).join('')}</div>`;
      if (uniq.length) return `<div class="thumb"><img src="${uniq[0]}" alt="" loading="lazy"></div>`;
      const h = c ? c.playlist.hue : 260;
      return `<div class="thumb solid" style="background:linear-gradient(135deg,hsl(${h} 50% 30%),hsl(${(h + 40) % 360} 60% 14%))">${icon('music')}</div>`;
    }
    const t = store.get(ids[0]);
    return t ? `<div class="thumb"><img src="${covers.urlFor(t, size)}" alt="" loading="lazy"></div>` : `<div class="thumb solid">${icon('music')}</div>`;
  }

  // ---------------- track list ----------------
  const lists = {};
  let listSeq = 0;
  let selection = new Set();
  let lastSelected = null;

  function hl(text, q) {
    const s = esc(text);
    if (!q) return s;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return s;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function rowHtml(t, i, o) {
    const liked = store.isLiked(t.id);
    return `<div class="row" data-id="${t.id}" data-i="${i}" draggable="true">
      <div class="idx"><span class="num">${i + 1}</span><button class="play-ic" title="Play">${icon('play')}</button></div>
      <div class="title-cell"><img src="${covers.urlFor(t)}" alt="" loading="lazy"><div>
        <span class="t">${hl(t.title, o.q)}</span>
        <span class="a">${t.source === 'local' ? '<span title="Imported file">⬆ </span>' : ''}<a href="#/artist/${enc(t.artist)}">${hl(t.artist, o.q)}</a></span></div></div>
      ${o.hideAlbum ? '<span class="alb"></span>' : `<a class="alb" href="#/album/${enc(t.album)}">${hl(t.album, o.q)}</a>`}
      <button class="icon-btn sm like-btn ${liked ? 'liked' : ''}" title="${liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}">${icon('heart')}</button>
      <span class="dur">${fmt(t.duration)}</span>
      <button class="icon-btn sm more-btn" title="More options">${icon('dots')}</button>
    </div>`;
  }
  function trackList(ids, ctx, o = {}) {
    const key = 'l' + ++listSeq;
    lists[key] = { ids, ...ctx, reorder: !!o.reorder };
    const head = o.noHead ? '' : `<div class="tl-head"><span style="text-align:center">#</span><span>Title</span><span class="alb">${o.hideAlbum ? '' : 'Album'}</span><span></span><span style="justify-self:end">${icon('clock')}</span><span></span></div>`;
    return `<div class="tracklist" data-list="${key}">${head}${ids.map((id, i) => rowHtml(store.get(id), i, o)).join('')}</div>`;
  }

  // ---------------- router ----------------
  const view = $('#view');
  let route = { name: 'home', args: [] };
  let homeFilter = 'all';
  let libTab = 'playlists';

  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, ...args] = h.split('/');
    return { name: name || 'home', args: args.map(decodeURIComponent) };
  }

  function render(opts = {}) {
    route = parse();
    const fn = VIEWS[route.name] || VIEWS.home;
    const keepScroll = opts.keepScroll ? view.scrollTop : 0;
    const paint = () => {
      selection.clear();
      for (const k in lists) delete lists[k];
      view.innerHTML = fn(...route.args);
      hydrateIcons(view);
      view.scrollTop = keepScroll;
      if (!opts.keepScroll) {
        view.classList.remove('view-enter');
        void view.offsetWidth;
        view.classList.add('view-enter');
      }
      afterRender();
      syncPlaying();
    };
    paint();
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === route.name));
    renderSidebar();
    const si = $('#searchInput');
    if (route.name === 'search' && document.activeElement !== si) si.value = route.args[0] || '';
    if (route.name !== 'search' && !opts.keepScroll) si.value = '';
  }
  const rerender = () => render({ keepScroll: true });

  function hero({ type, title, sub, thumb, hue, round, editable }) {
    return `<section class="hero" style="--hero-h:${hue}">
      <div class="cover ${round ? 'round' : ''}">${thumb}</div>
      <div><small>${type}</small><h1 class="${editable ? 'editable' : ''}" ${editable ? 'data-action="rename-playlist" title="Click to rename"' : ''}>${esc(title)}</h1><p>${sub}</p></div>
    </section>`;
  }
  function actionBar(kind, arg, extra = '') {
    return `<div class="action-bar">
      <button class="big-play" data-play="${kind}" data-arg="${esc(arg || '')}" title="Play">${icon('play')}</button>
      <button class="icon-btn" data-action="shuffle-play" data-kind="${kind}" data-arg="${esc(arg || '')}" title="Shuffle play">${icon('shuffle')}</button>
      ${extra}
    </div>`;
  }
  function stats(ids) {
    const total = ids.reduce((s, id) => s + (store.get(id)?.duration || 0), 0);
    return `${plural(ids.length, 'song')}, ${fmtLong(total)}`;
  }
  const accentOf = (ids, fallback = 262) => store.get(ids[0])?.hue ?? fallback;

  function card({ href, title, sub, thumb, play, arg, round }) {
    return `<div class="card" data-href="${href}" data-route="${href}">
      <div class="art ${round ? 'round' : ''}">${thumb}<button class="big-play" data-play="${play}" data-arg="${esc(arg || '')}" title="Play">${icon('play')}</button></div>
      <b>${esc(title)}</b><small>${sub}</small></div>`;
  }
  const mixCard = (style) => {
    const c = collection('mix', style);
    const t = store.get(c.ids[0]);
    const thumb = `<div class="mix-art" style="--mix:hsl(${t.hue} 80% 60%)"><img src="${covers.urlFor(t)}" alt="" loading="lazy"><span>${esc(STY[style].label)}<br>Mix</span></div>`;
    const names = [...new Set(c.ids.map((id) => store.get(id).artist))].join(', ');
    return card({ href: '#/mix/' + style, title: c.name, sub: esc(names), thumb, play: 'mix', arg: style });
  };

  const VIEWS = {
    home() {
      const hr = new Date().getHours();
      const greet = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
      const f = homeFilter;
      const match = (t) => f === 'all' || (f === 'uploads' ? t.source === 'local' : t.style === f);
      const quick = [
        { href: '#/liked', title: 'Liked Songs', thumb: thumbFor('liked'), play: 'liked' },
        ...D.playlists.map((p) => ({ href: '#/playlist/' + p.id, title: p.name, thumb: thumbFor('playlist', p.id), play: 'playlist', arg: p.id })),
        ...Object.keys(STY).map((s) => ({ href: '#/mix/' + s, title: STY[s].label + ' Mix', thumb: thumbFor('mix', s), play: 'mix', arg: s })),
      ].filter((q) => f === 'all' || q.arg === f).slice(0, 8);
      const recent = D.recent.map(store.get).filter((t) => t && match(t)).slice(0, 10);
      const alb = albums().filter((a) => match(a.track));
      const art = artists().filter((a) => match(a.track));
      const uploads = store.all().filter((t) => t.source === 'local');
      const chips = ['all', ...Object.keys(STY), ...(uploads.length ? ['uploads'] : [])]
        .map((k) => `<button class="chip ${f === k ? 'active' : ''}" data-filter="${k}">${k === 'all' ? 'All' : k === 'uploads' ? 'Your uploads' : STY[k].label}</button>`).join('');
      return `
        <div class="chips">${chips}</div>
        <h1 class="greeting">${greet}</h1>
        <div class="quick-grid">${quick.map((q) => `<div class="quick" data-href="${q.href}" data-route="${q.href}">${q.thumb}<span>${esc(q.title)}</span><button class="big-play mini-play" data-play="${q.play}" data-arg="${esc(q.arg || '')}">${icon('play')}</button></div>`).join('')}</div>
        ${recent.length ? `<div class="section-head"><h2>Jump back in</h2></div>
        <div class="shelf">${recent.map((t) => card({ href: '#/album/' + enc(t.album), title: t.title, sub: esc(t.artist), thumb: `<img src="${covers.urlFor(t)}" alt="" loading="lazy">`, play: 'radio', arg: t.id })).join('')}</div>` : ''}
        ${f === 'all' || STY[f] ? `<div class="section-head"><h2>Made for you</h2><a href="#/search">Browse all</a></div>
        <div class="shelf">${Object.keys(STY).filter((s) => f === 'all' || s === f).map(mixCard).join('')}</div>` : ''}
        ${alb.length ? `<div class="section-head"><h2>Albums</h2><a href="#/library/albums">Show all</a></div>
        <div class="shelf">${alb.map((a) => card({ href: '#/album/' + enc(a.album), title: a.album, sub: esc(a.artist), thumb: `<img src="${covers.urlFor(a.track)}" alt="" loading="lazy">`, play: 'album', arg: a.album })).join('')}</div>` : ''}
        ${art.length ? `<div class="section-head"><h2>Artists</h2><a href="#/library/artists">Show all</a></div>
        <div class="shelf">${art.map((a) => card({ href: '#/artist/' + enc(a.artist), title: a.artist, sub: 'Artist', thumb: `<img src="${covers.urlFor(a.track)}" alt="" loading="lazy">`, play: 'artist', arg: a.artist, round: true })).join('')}</div>` : ''}
        ${!uploads.length && f === 'all' ? `<div class="lab-card" style="text-align:center;margin-bottom:30px">${icon('upload')}<h3 style="justify-content:center;margin-top:10px">Bring your own music</h3><p style="margin:0 0 14px">Drag audio files anywhere on this page. Tags and cover art are read automatically and everything stays in your browser.</p><button class="pill-btn accent" data-action="import">Import files</button></div>` : ''}
      `;
    },

    search(q = '') {
      if (!q.trim()) {
        return `<div class="section-head"><h2>Browse all</h2></div>
        <div class="genre-grid">${Object.keys(STY).map((s) => {
          const t = store.get(collection('mix', s).ids[0]);
          return `<a class="genre" href="#/mix/${s}" style="--g:${t.hue}">${STY[s].label}<img src="${covers.urlFor(t)}" alt="" loading="lazy"></a>`;
        }).join('')}
        <a class="genre" href="#/liked" style="--g:255">Liked Songs<div class="thumb liked" style="position:absolute;width:46%;aspect-ratio:1;right:-6%;bottom:-6%;transform:rotate(22deg);border-radius:8px">${icon('heart')}</div></a>
        </div>`;
      }
      const res = store.search(q);
      if (!res.length) return `<div class="empty">${icon('search')}<h3>No results found for "${esc(q)}"</h3><p>Check the spelling, or try fewer or different keywords.</p></div>`;
      const top = res[0];
      const ql = q.toLowerCase();
      const arts = artists().filter((a) => a.artist.toLowerCase().includes(ql));
      const albs = albums().filter((a) => a.album.toLowerCase().includes(ql) || a.artist.toLowerCase().includes(ql));
      const pls = D.playlists.filter((p) => p.name.toLowerCase().includes(ql));
      return `<div class="top-result">
          <div><div class="section-head"><h2>Top result</h2></div>
            <div class="top-card" data-play-track="${top.id}"><img src="${covers.urlFor(top)}" alt=""><h3>${hl(top.title, q)}</h3><p>Song · ${esc(top.artist)}</p><button class="big-play" data-play="radio" data-arg="${top.id}">${icon('play')}</button></div></div>
          <div><div class="section-head"><h2>Songs</h2></div>${trackList(res.slice(0, 5).map((t) => t.id), { name: `Search: ${q}`, route: '#/search/' + enc(q) }, { noHead: true, hideAlbum: true, q })}</div>
        </div>
        ${res.length > 5 ? `<div class="section-head"><h2>More songs</h2></div>${trackList(res.slice(5).map((t) => t.id), { name: `Search: ${q}`, route: '#/search/' + enc(q) }, { q })}<div style="height:24px"></div>` : ''}
        ${arts.length ? `<div class="section-head"><h2>Artists</h2></div><div class="shelf">${arts.map((a) => card({ href: '#/artist/' + enc(a.artist), title: a.artist, sub: 'Artist', thumb: `<img src="${covers.urlFor(a.track)}" alt="">`, play: 'artist', arg: a.artist, round: true })).join('')}</div>` : ''}
        ${albs.length ? `<div class="section-head"><h2>Albums</h2></div><div class="shelf">${albs.map((a) => card({ href: '#/album/' + enc(a.album), title: a.album, sub: esc(a.artist), thumb: `<img src="${covers.urlFor(a.track)}" alt="">`, play: 'album', arg: a.album })).join('')}</div>` : ''}
        ${pls.length ? `<div class="section-head"><h2>Playlists</h2></div><div class="shelf">${pls.map((p) => card({ href: '#/playlist/' + p.id, title: p.name, sub: plural(p.trackIds.length, 'song'), thumb: thumbFor('playlist', p.id), play: 'playlist', arg: p.id })).join('')}</div>` : ''}`;
    },

    library(tab) {
      if (tab) libTab = tab;
      const tabs = { playlists: 'Playlists', albums: 'Albums', artists: 'Artists', uploads: 'Uploads' };
      let body = '';
      if (libTab === 'playlists') {
        body = `<div class="card-grid">
          ${card({ href: '#/liked', title: 'Liked Songs', sub: plural(D.liked.filter(store.get).length, 'song'), thumb: thumbFor('liked'), play: 'liked' })}
          ${D.playlists.map((p) => card({ href: '#/playlist/' + p.id, title: p.name, sub: `Playlist · ${plural(p.trackIds.length, 'song')}`, thumb: thumbFor('playlist', p.id), play: 'playlist', arg: p.id })).join('')}
          <div class="card" data-action="new-playlist"><div class="art"><div class="thumb solid" style="background:rgba(255,255,255,.06)">${icon('plus')}</div></div><b>New playlist</b><small>Build your own mix</small></div>
        </div>`;
      } else if (libTab === 'albums') {
        body = `<div class="card-grid">${albums().map((a) => card({ href: '#/album/' + enc(a.album), title: a.album, sub: esc(a.artist), thumb: `<img src="${covers.urlFor(a.track)}" alt="" loading="lazy">`, play: 'album', arg: a.album })).join('')}</div>`;
      } else if (libTab === 'artists') {
        body = `<div class="card-grid">${artists().map((a) => card({ href: '#/artist/' + enc(a.artist), title: a.artist, sub: plural(a.ids.length, 'song'), thumb: `<img src="${covers.urlFor(a.track)}" alt="" loading="lazy">`, play: 'artist', arg: a.artist, round: true })).join('')}</div>`;
      } else {
        const c = collection('uploads');
        body = c.ids.length ? trackList(c.ids, c) : `<div class="empty">${icon('upload')}<h3>No uploads yet</h3><p>Drop audio files anywhere, or use the button above.</p></div>`;
      }
      return `<div class="lib-tools"><h1>Your Library</h1>
        <div class="seg">${Object.entries(tabs).map(([k, v]) => `<button class="${k === libTab ? 'active' : ''}" data-libtab="${k}">${v}</button>`).join('')}</div>
        <button class="pill-btn outline" data-action="import">${icon('upload')} Import</button></div>${body}`;
    },

    liked() {
      const c = collection('liked');
      return hero({ type: 'Playlist', title: 'Liked Songs', sub: `<b>You</b> · ${stats(c.ids)}`, thumb: thumbFor('liked'), hue: 255 })
        + actionBar('liked') + (c.ids.length ? trackList(c.ids, c) : `<div class="empty">${icon('heart')}<h3>Songs you like will appear here</h3><p>Save songs by tapping the heart icon.</p></div>`);
    },

    playlist(id) {
      const c = collection('playlist', id);
      if (!c) return `<div class="empty"><h3>Playlist not found</h3><p><a href="#/library">Back to your library</a></p></div>`;
      return hero({ type: 'Playlist', title: c.name, sub: `<b>You</b> · ${stats(c.ids)}`, thumb: thumbFor('playlist', id), hue: c.playlist.hue, editable: true })
        + actionBar('playlist', id, `<button class="icon-btn" data-action="playlist-menu" title="More options">${icon('dots')}</button>`)
        + (c.ids.length ? trackList(c.ids, { ...c, playlistId: id }, { reorder: true }) : `<div class="empty">${icon('music')}<h3>Let's find something for your playlist</h3><p>Drag songs onto this playlist in the sidebar, or use “Add to playlist” from any song's menu.</p></div>`);
    },

    album(name) {
      const c = collection('album', name);
      const t = store.get(c.ids[0]);
      if (!t) return `<div class="empty"><h3>Album not found</h3></div>`;
      return hero({ type: 'Album', title: name, sub: `<b><a href="#/artist/${enc(t.artist)}">${esc(t.artist)}</a></b> · ${stats(c.ids)}`, thumb: `<img src="${covers.urlFor(t, 640)}" alt="">`, hue: t.hue })
        + actionBar('album', name, `<button class="icon-btn" data-action="queue-collection" data-kind="album" data-arg="${esc(name)}" title="Add to queue">${icon('list-plus')}</button>`)
        + trackList(c.ids, c, { hideAlbum: true });
    },

    artist(name) {
      const c = collection('artist', name);
      const t = store.get(c.ids[0]);
      if (!t) return `<div class="empty"><h3>Artist not found</h3></div>`;
      const popular = [...c.ids].sort((a, b) => (D.plays[b] || 0) - (D.plays[a] || 0));
      const alb = albums().filter((a) => a.artist === name);
      return hero({ type: 'Artist', title: name, sub: `${plural(c.ids.length, 'song')} · ${plural(alb.length, 'album')}`, thumb: `<img src="${covers.urlFor(t, 640)}" alt="">`, hue: t.hue, round: true })
        + actionBar('artist', name, `<button class="icon-btn" data-action="artist-radio" data-arg="${t.id}" title="Start artist radio">${icon('radio')}</button>`)
        + `<div class="section-head"><h2>Popular</h2></div>` + trackList(popular, c)
        + `<div style="height:28px"></div><div class="section-head"><h2>Discography</h2></div><div class="shelf">${alb.map((a) => card({ href: '#/album/' + enc(a.album), title: a.album, sub: plural(a.ids.length, 'song'), thumb: `<img src="${covers.urlFor(a.track)}" alt="">`, play: 'album', arg: a.album })).join('')}</div>`;
    },

    mix(style) {
      const c = collection('mix', style);
      if (!c.ids.length) return `<div class="empty"><h3>Mix not found</h3></div>`;
      const t = store.get(c.ids[0]);
      const bpms = c.ids.map((id) => store.get(id).bpm).filter(Boolean);
      return hero({ type: 'Made for you', title: c.name, sub: `${esc(STY[style].label)} · ${Math.min(...bpms)}–${Math.max(...bpms)} BPM · ${stats(c.ids)}`, thumb: `<div class="mix-art" style="--mix:hsl(${t.hue} 80% 60%)"><img src="${covers.urlFor(t, 640)}" alt=""><span>${esc(STY[style].label)} Mix</span></div>`, hue: t.hue })
        + actionBar('mix', style) + trackList(c.ids, c);
    },

    radio(id) {
      const c = collection('radio', id);
      if (!c) return `<div class="empty"><h3>Station not found</h3></div>`;
      const t = store.get(id);
      return hero({ type: 'Radio', title: c.name, sub: `Songs that match the mood and tempo of <b>${esc(t.title)}</b>`, thumb: `<img src="${covers.urlFor(t, 640)}" alt="">`, hue: t.hue })
        + actionBar('radio', id) + trackList(c.ids, c);
    },

    uploads() { location.replace('#/library/uploads'); return ''; },

    settings() {
      const seg = (name, items, cur) => `<div class="seg" data-seg="${name}">${items.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'active' : ''}">${l}</button>`).join('')}</div>`;
      const sw = (name, on) => `<span class="switch"><input type="checkbox" data-toggle="${name}" ${on ? 'checked' : ''}><span></span></span>`;
      const sleepState = P.sleepEndOfTrack ? 'Stops after this song' : P.sleepAt ? `Stops at ${new Date(P.sleepAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Off';
      return `<div class="lib-tools"><h1>Sound Lab</h1></div>
      <div class="lab">
        <div class="lab-card wide">
          <h3>${icon('sliders')} Equalizer</h3><p>Real-time 5-band EQ applied to everything you play. The curve shows the actual filter response.</p>
          <div style="margin-bottom:16px">${seg('eqPreset', Object.keys(P.EQ_PRESETS).map((k) => [k, k]), S.eqPreset)}</div>
          <div class="eq"><canvas id="eqCurve"></canvas>
            ${P.EQ_BANDS.map((b, i) => `<div class="eq-band"><output>${S.eq[i] > 0 ? '+' : ''}${S.eq[i]} dB</output><input type="range" min="-12" max="12" step="1" value="${S.eq[i]}" data-eq="${i}" aria-label="${b.label} Hz"><span>${b.label}</span></div>`).join('')}
          </div>
        </div>
        <div class="lab-card">
          <h3>${icon('wave')} Transitions</h3><p>How songs flow into each other.</p>
          <div class="setting"><label>Crossfade<small>Equal-power blend between songs</small></label><input type="range" min="0" max="12" step="1" value="${S.crossfade}" data-range="crossfade"><output>${S.crossfade ? S.crossfade + 's' : 'Off'}</output></div>
          <div class="setting"><label>Smooth controls<small>Click-free fades on pause, skip and seek</small></label>${sw('smooth', S.smooth)}</div>
          <div class="setting"><label>Volume leveling<small>Keeps loud and quiet songs consistent</small></label>${sw('normalize', S.normalize)}</div>
          <div class="setting"><label>Playback speed<small>Pitch is preserved</small></label>${seg('speed', [[0.75, '0.75×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']], S.speed)}</div>
        </div>
        <div class="lab-card">
          <h3>${icon('sparkle')} Visuals</h3><p>Immersive mode and motion.</p>
          <div class="setting"><label>Visualizer<small>Used in immersive mode (F)</small></label>${seg('viz', [['bars', 'Bars'], ['orb', 'Orb'], ['wave', 'Wave']], S.viz)}</div>
          <div class="setting"><label>Reduce motion<small>Turns off animations and transitions</small></label>${sw('reduceMotion', S.reduceMotion)}</div>
          <div class="setting"><label>Sleep timer<small>${sleepState}</small></label><button class="pill-btn ghost" data-action="sleep">${icon('moon')} Set</button></div>
        </div>
        <div class="lab-card wide">
          <h3>${icon('keyboard')} Keyboard shortcuts</h3><p>Everything is reachable without a mouse.</p>
          <div class="shortcuts">${[['Play / pause', 'Space'], ['Seek ±5s', '← →'], ['Previous / next', 'Shift ← →'], ['Volume', '↑ ↓'], ['Like song', 'L'], ['Smart shuffle', 'S'], ['Repeat', 'R'], ['Mute', 'M'], ['Queue', 'Q'], ['Immersive mode', 'F'], ['Search', '/'], ['Command palette', 'Ctrl K']].map(([a, k]) => `<div><span>${a}</span><span>${k.split(' ').map((x) => `<kbd>${x}</kbd>`).join(' ')}</span></div>`).join('')}</div>
        </div>
        <div class="lab-card wide">
          <h3>${icon('trash')} Data</h3><p>Everything is stored locally in this browser — nothing is uploaded.</p>
          <button class="pill-btn outline" data-action="reset">Reset playlists, likes &amp; settings</button>
        </div>
      </div>`;
    },
  };

  function afterRender() {
    if (route.name === 'settings') drawEqCurve();
  }

  // ---------------- EQ response curve ----------------
  let eqCtx, eqNodes;
  function drawEqCurve() {
    const c = $('#eqCurve');
    if (!c) return;
    if (!eqCtx) {
      eqCtx = new OfflineAudioContext(1, 1, 44100);
      eqNodes = P.EQ_BANDS.map((b) => {
        const f = eqCtx.createBiquadFilter();
        f.type = b.type; f.frequency.value = b.f; f.Q.value = 1;
        return f;
      });
    }
    const dpr = devicePixelRatio || 1;
    const W = (c.width = c.clientWidth * dpr), H = (c.height = c.clientHeight * dpr);
    const g = c.getContext('2d');
    const N = 200;
    const fr = new Float32Array(N), mag = new Float32Array(N), ph = new Float32Array(N);
    // map x so each band's frequency sits exactly under its slider (log-interpolated between them)
    const cr = c.getBoundingClientRect();
    const px = $$('.eq-band input').map((el) => { const r = el.getBoundingClientRect(); return ((r.left + r.width / 2 - cr.left) / cr.width) * W; });
    const lf = P.EQ_BANDS.map((b) => Math.log10(b.f));
    for (let k = 0; k < N; k++) {
      const x = (k / (N - 1)) * W;
      let i = 0;
      while (i < px.length - 2 && x > px[i + 1]) i++;
      const l = lf[i] + ((x - px[i]) / (px[i + 1] - px[i])) * (lf[i + 1] - lf[i]);
      fr[k] = Math.min(20000, Math.max(10, Math.pow(10, l)));
    }
    const total = new Float32Array(N).fill(0);
    eqNodes.forEach((f, i) => {
      f.gain.value = S.eq[i];
      f.getFrequencyResponse(fr, mag, ph);
      for (let k = 0; k < N; k++) total[k] += 20 * Math.log10(mag[k]);
    });
    const y = (db) => H / 2 - (db / 15) * (H / 2);
    g.strokeStyle = 'rgba(255,255,255,.08)';
    g.lineWidth = dpr;
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    const hue = getComputedStyle(document.documentElement).getPropertyValue('--accent-h').trim() || 262;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `hsla(${hue},90%,66%,.35)`);
    grad.addColorStop(1, `hsla(${hue},90%,66%,0)`);
    g.beginPath();
    for (let k = 0; k < N; k++) { const x = (k / (N - 1)) * W; k ? g.lineTo(x, y(total[k])) : g.moveTo(x, y(total[k])); }
    g.strokeStyle = `hsl(${hue},90%,66%)`;
    g.lineWidth = 2.5 * dpr;
    g.stroke();
    g.lineTo(W, H); g.lineTo(0, H); g.closePath();
    g.fillStyle = grad;
    g.fill();
  }

  // ---------------- sidebar ----------------
  function renderSidebar() {
    const cur = route.name === 'playlist' ? route.args[0] : route.name === 'liked' ? 'liked' : null;
    const item = (href, id, thumb, name, sub) => `<a class="side-item ${cur === id ? 'active' : ''} ${P.contextRoute === href && P.current ? 'playing' : ''}" href="${href}" data-pl="${id}">${thumb}<span class="meta"><b>${esc(name)}</b><small>${sub}</small></span></a>`;
    $('#sidePlaylists').innerHTML = item('#/liked', 'liked', thumbFor('liked', null, 120), 'Liked Songs', `Playlist · ${plural(D.liked.filter(store.get).length, 'song')}`)
      + D.playlists.map((p) => item('#/playlist/' + p.id, p.id, thumbFor('playlist', p.id, 120), p.name, `Playlist · ${plural(p.trackIds.length, 'song')}`)).join('');
  }

  // ---------------- player bar & sync ----------------
  const rootStyle = document.documentElement.style;
  let lastTrackId = null;
  function syncPlayer() {
    const t = store.get(P.current);
    const playing = P.isPlaying();
    const playIc = P.loading ? 'loading' : playing ? 'pause' : 'play';
    [$('#playBtn'), $('#nowPlaying [data-action=toggle]')].forEach((b) => {
      setIcon(b, playIc);
      b.classList.toggle('loading', P.loading);
      b.title = playing ? 'Pause (Space)' : 'Play (Space)';
    });
    $$('#shuffleBtn, #nowPlaying [data-action=shuffle]').forEach((b) => b.classList.toggle('on', P.shuffle));
    $$('#repeatBtn, #nowPlaying [data-action=repeat]').forEach((b) => {
      b.classList.toggle('on', P.repeat !== 'off');
      b.innerHTML = icon('repeat') + (P.repeat === 'one' ? '<span class="badge">1</span>' : '');
      b.title = `Repeat: ${P.repeat}`;
    });
    const sleepOn = P.sleepAt || P.sleepEndOfTrack;
    $('#sleepBtn').classList.toggle('on', !!sleepOn);
    setIcon($('#muteBtn'), P.muted || S.volume === 0 ? 'mute' : S.volume < 0.5 ? 'volume-low' : 'volume');
    $('#nowPlaying').classList.toggle('paused', !playing);

    if (t) {
      const liked = store.isLiked(t.id);
      $$('#pbLike, #npLike').forEach((b) => { b.classList.toggle('liked', liked); b.title = liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'; });
      if (t.id !== lastTrackId) {
        lastTrackId = t.id;
        $('#pbCover img').src = covers.urlFor(t);
        const meta = $('.pb-meta');
        $('#pbTitle').textContent = t.title;
        $('#pbTitle').href = '#/album/' + enc(t.album);
        $('#pbArtist').textContent = t.artist;
        $('#pbArtist').href = '#/artist/' + enc(t.artist);
        meta.classList.remove('swap'); void meta.offsetWidth; meta.classList.add('swap');
        const big = covers.urlFor(t, 640);
        const art = $('.np-art');
        $('#npArt').src = big;
        art.classList.remove('swap'); void art.offsetWidth; art.classList.add('swap');
        $('.np-bg').style.backgroundImage = `url("${big}")`;
        $('#npTitle').textContent = t.title;
        $('#npArtist').textContent = t.artist;
        rootStyle.setProperty('--accent-h', t.hue);
        document.title = `${t.title} · ${t.artist} — EchoSphere`;
        $('meta[name=theme-color]').content = `hsl(${t.hue} 35% 12%)`;
        if (route.name === 'settings') setTimeout(drawEqCurve, 50);
      }
      $('#npContext').textContent = P.contextName || 'Your library';
      const n = store.get(P.peekNext());
      $('#npNext').innerHTML = n && n.id !== t.id ? `Up next: <b>${esc(n.title)}</b> · ${esc(n.artist)}` : '';
    } else {
      $('#pbTitle').textContent = 'Pick something to play';
      $('#pbArtist').textContent = 'Press Space to start';
    }
    syncPlaying();
    if ($('#app').classList.contains('queue-open')) renderQueue();
  }

  function syncPlaying() {
    const playing = P.isPlaying();
    $$('.row').forEach((r) => {
      const isCur = r.dataset.id === P.current && !r.closest('#queueBody');
      r.classList.toggle('current', isCur);
      const num = r.querySelector('.num');
      if (num) num.innerHTML = isCur ? `<span class="eq-anim ${playing ? '' : 'paused'}"><i></i><i></i><i></i></span>` : String(+r.dataset.i + 1);
      const pi = r.querySelector('.play-ic');
      if (pi) setIcon(pi, isCur && playing ? 'pause' : 'play');
    });
    $$('[data-play]').forEach((b) => {
      const c = collection(b.dataset.play, b.dataset.arg);
      const active = c && P.contextRoute === c.route && playing;
      setIcon(b, active ? 'pause' : 'play');
      b.closest('.card, .quick')?.classList.toggle('current', !!active);
    });
    $$('.side-item').forEach((a) => a.classList.toggle('playing', !!P.current && P.contextRoute === a.getAttribute('href')));
  }

  // ---------------- sliders ----------------
  function makeSlider(el, { onInput, onCommit, tip, step = 0.05 }) {
    let dragging = false;
    const frac = (e) => {
      const r = el.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    };
    const tipEl = el.querySelector('.hover-tip');
    el.addEventListener('pointermove', (e) => {
      if (tipEl && tip) { const f = frac(e); tipEl.textContent = tip(f); tipEl.style.left = f * 100 + '%'; }
      if (dragging) { const f = frac(e); el.style.setProperty('--p', f); onInput && onInput(f); }
    });
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      const f = frac(e);
      el.style.setProperty('--p', f);
      onInput && onInput(f);
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      onCommit && onCommit(frac(e));
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', () => { dragging = false; el.classList.remove('dragging'); });
    el.addEventListener('keydown', (e) => {
      const cur = parseFloat(getComputedStyle(el).getPropertyValue('--p')) || 0;
      let v = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = cur + step;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = cur - step;
      if (v !== null) { e.preventDefault(); e.stopPropagation(); v = Math.max(0, Math.min(1, v)); el.style.setProperty('--p', v); onCommit && onCommit(v); }
    });
    return { get dragging() { return dragging; } };
  }
  const dur = () => P.position().duration || 0;
  const seekTip = (f) => fmt(f * dur());
  const progressSliders = ['#progress', '#npProgress'].map((s) => ({
    el: $(s),
    ctl: makeSlider($(s), {
      tip: seekTip,
      onInput: (f) => { $$('#timeCur, #npCur').forEach((x) => (x.textContent = fmt(f * dur()))); },
      onCommit: (f) => P.seek(f * dur()),
      step: 0.02,
    }),
  }));
  const vol = $('#volume');
  vol.style.setProperty('--p', S.volume);
  makeSlider(vol, { onInput: (f) => P.setVolume(f), onCommit: (f) => P.setVolume(f) });

  // ---------------- frame loop ----------------
  const npViz = $('#npViz');
  const beatEls = [$('#ambient'), $('#nowPlaying'), $('.brand-mark')];
  let lastBeat = -1;
  function frame() {
    const { time, duration } = P.position();
    const f = duration ? time / duration : 0;
    progressSliders.forEach(({ el, ctl }) => { if (!ctl.dragging) el.style.setProperty('--p', f); });
    $('.mini-progress').style.setProperty('--p', f);
    if (!progressSliders.some((s) => s.ctl.dragging)) {
      $('#timeCur').textContent = $('#npCur').textContent = fmt(time);
    }
    $('#timeDur').textContent = $('#npDur').textContent = fmt(duration);
    const a = P.decks[P.active].audio;
    if (a.buffered.length && duration) {
      const b = a.buffered.end(a.buffered.length - 1) / duration;
      progressSliders.forEach(({ el }) => el.style.setProperty('--b', b));
    }
    viz.analyse();
    const beat = S.reduceMotion ? 0 : Math.round(viz.beat * 100) / 100;
    if (beat !== lastBeat) { beatEls.forEach((el) => el.style.setProperty('--beat', beat)); lastBeat = beat; }
    if (npOpen) {
      const hue = +getComputedStyle(document.documentElement).getPropertyValue('--accent-h') || 262;
      ES.viz.drawViz(npViz, S.viz, hue);
    }
    if (!vol.matches('.dragging')) vol.style.setProperty('--p', P.muted ? 0 : S.volume);
    requestAnimationFrame(frame);
  }

  // ---------------- queue panel ----------------
  function qRow(id, kind, i, isNow) {
    const t = store.get(id);
    if (!t) return '';
    return `<div class="row compact ${isNow ? 'current' : ''}" data-id="${id}" data-kind="${kind}" data-qi="${i}" ${isNow ? '' : 'draggable="true"'}>
      <div class="title-cell"><img src="${covers.urlFor(t)}" alt=""><div><span class="t">${esc(t.title)}</span><span class="a">${esc(t.artist)}</span></div></div>
      ${isNow ? `<span class="eq-anim ${P.isPlaying() ? '' : 'paused'}" style="justify-self:center"><i></i><i></i><i></i></span>` : `<button class="icon-btn sm" data-action="q-remove" title="Remove">${icon('x')}</button>`}
    </div>`;
  }
  function renderQueue() {
    const body = $('#queueBody');
    if (!P.current) { body.innerHTML = `<div class="empty">${icon('queue')}<h3>Your queue is empty</h3><p>Play something and it'll show up here.</p></div>`; return; }
    const upcoming = P.queue.slice(P.qIndex + 1, P.qIndex + 51);
    body.innerHTML = `<div class="q-label">Now playing</div>${qRow(P.current, 'now', 0, true)}
      ${P.manual.length ? `<div class="q-label"><span>Next in queue</span><button data-action="q-clear">Clear</button></div>${P.manual.map((id, i) => qRow(id, 'manual', i)).join('')}` : ''}
      ${upcoming.length ? `<div class="q-label"><span>Next from: ${esc(P.contextName || 'your library')}</span></div>${upcoming.map((id, i) => qRow(id, 'context', P.qIndex + 1 + i)).join('')}` : ''}
      ${!P.manual.length && !upcoming.length ? `<div class="empty" style="padding:30px 10px"><p>${P.repeat === 'all' ? 'Repeat is on — the list will start over.' : 'Nothing queued after this song.'}</p></div>` : ''}`;
  }
  function toggleQueue(force) {
    const app = $('#app');
    const open = force ?? !app.classList.contains('queue-open');
    app.classList.toggle('queue-open', open);
    $('#queueBtn').classList.toggle('on', open);
    if (open) renderQueue();
  }

  // ---------------- immersive now playing ----------------
  let npOpen = false;
  function openNP(open = !npOpen) {
    npOpen = open;
    const np = $('#nowPlaying');
    np.classList.toggle('open', open);
    np.setAttribute('aria-hidden', String(!open));
    applyViz();
    if (open && !P.current) toast('Pick a song to start the show');
  }
  function applyViz() {
    const np = $('#nowPlaying');
    ['bars', 'orb', 'wave'].forEach((m) => np.classList.toggle('viz-' + m, S.viz === m));
    npViz.className = 'np-viz ' + S.viz;
    $$('#vizSwitch button').forEach((b) => b.classList.toggle('active', b.dataset.viz === S.viz));
  }
  // swipe gestures on the artwork: left/right = skip, down = close
  (function gestures() {
    const art = $('.np-art');
    let sx = 0, sy = 0, active = false;
    art.addEventListener('pointerdown', (e) => { active = true; sx = e.clientX; sy = e.clientY; art.setPointerCapture(e.pointerId); art.style.transition = 'none'; });
    art.addEventListener('pointermove', (e) => {
      if (!active) return;
      const dx = e.clientX - sx, dy = Math.max(0, e.clientY - sy);
      art.style.translate = `${dx}px ${dy * 0.6}px`;
      art.style.rotate = `${dx / 40}deg`;
      art.style.opacity = 1 - Math.min(0.5, Math.abs(dx) / 600);
    });
    const end = (e) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      art.style.transition = 'translate .45s var(--spring), rotate .45s var(--spring), opacity .3s';
      art.style.translate = art.style.rotate = art.style.opacity = '';
      if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? P.next() : P.prev();
      else if (dy > 120) openNP(false);
      else if (Math.abs(dx) < 6 && Math.abs(dy) < 6) P.toggle();
    };
    art.addEventListener('pointerup', end);
    art.addEventListener('pointercancel', end);
  })();

  // ---------------- toasts ----------------
  function toast(msg, action) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
    if (action) el.querySelector('button').onclick = () => { action.fn(); close(); };
    $('#toasts').appendChild(el);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    setTimeout(close, action ? 5000 : 2600);
  }
  store.on('toast', toast);

  // ---------------- modal ----------------
  function modal(html, mount) {
    const m = $('#modal');
    const box = $('.modal-box', m);
    box.innerHTML = html;
    hydrateIcons(box);
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    const close = () => { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); };
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) close(); };
    mount && mount(box, close);
    return close;
  }
  function promptText(title, value = '', okLabel = 'Save') {
    return new Promise((resolve) => {
      modal(`<h2>${esc(title)}</h2><input class="field" value="${esc(value)}" maxlength="80"><div class="modal-actions"><button class="pill-btn outline" data-close>Cancel</button><button class="pill-btn accent" data-ok>${esc(okLabel)}</button></div>`, (box, close) => {
        const inp = $('input', box);
        setTimeout(() => { inp.focus(); inp.select(); }, 50);
        const ok = () => { close(); resolve(inp.value.trim()); };
        $('[data-ok]', box).onclick = ok;
        inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') { close(); resolve(null); } };
        $('[data-close]', box).addEventListener('click', () => resolve(null));
      });
    });
  }
  function sleepModal() {
    const on = P.sleepAt || P.sleepEndOfTrack;
    modal(`<h2>${icon('moon')} Sleep timer</h2><p style="color:var(--muted);margin-top:-8px">Music gently fades out over a few seconds when time is up.</p>
      <div class="sleep-opts">${[5, 15, 30, 45, 60].map((m) => `<button data-m="${m}">${m} min</button>`).join('')}<button data-m="end">End of song</button></div>
      <div class="modal-actions">${on ? '<button class="pill-btn outline" data-cancel>Turn off timer</button>' : ''}<button class="pill-btn outline" data-close>Close</button></div>`, (box, close) => {
      $$('[data-m]', box).forEach((b) => (b.onclick = () => {
        const v = b.dataset.m === 'end' ? 'end' : +b.dataset.m;
        P.setSleep(v);
        toast(v === 'end' ? 'Music will stop after this song' : `Sleep timer set for ${v} minutes`);
        close();
        if (route.name === 'settings') rerender();
      }));
      const c = $('[data-cancel]', box);
      if (c) c.onclick = () => { P.cancelSleep(); toast('Sleep timer off'); close(); if (route.name === 'settings') rerender(); };
    });
  }

  // ---------------- context menu ----------------
  const menu = $('#menu');
  function openMenu(x, y, items) {
    menu.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : it.sub ? `<div class="sub">${esc(it.sub)}</div>` : `<button data-mi="${i}" class="${it.danger ? 'danger' : ''}">${icon(it.icon || 'music')}<span>${esc(it.label)}</span></button>`).join('');
    menu.classList.add('open');
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
    menu.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
    menu.onclick = (e) => {
      const b = e.target.closest('[data-mi]');
      if (!b) return;
      closeMenu();
      items[+b.dataset.mi].fn();
    };
    setTimeout(() => menu.querySelector('button')?.focus({ preventScroll: true }), 0);
  }
  const closeMenu = () => menu.classList.remove('open');

  function trackMenu(ids, ctx) {
    const one = ids.length === 1 ? store.get(ids[0]) : null;
    const label = one ? '' : ` (${ids.length})`;
    const allLiked = ids.every(store.isLiked);
    const items = [
      { label: 'Play now' + label, icon: 'play', fn: () => P.playList(ids, 0, one ? one.title : `${ids.length} songs`, '') },
      { label: 'Play next' + label, icon: 'play-next', fn: () => { P.addToQueue(ids, true); toast(one ? `“${one.title}” plays next` : `${ids.length} songs play next`); } },
      { label: 'Add to queue' + label, icon: 'list-plus', fn: () => { P.addToQueue(ids); toast(one ? 'Added to queue' : `${ids.length} songs added to queue`); } },
      '-',
      { label: allLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs', icon: 'heart', fn: () => ids.forEach((id) => { if (store.isLiked(id) === allLiked) store.toggleLike(id); }) },
      { sub: 'Add to playlist' },
      { label: 'New playlist…', icon: 'plus', fn: async () => { const n = await promptText('New playlist', one ? one.title + ' mix' : ''); if (n !== null) { const p = store.createPlaylist(n, ids); toast(`Added to ${p.name}`); } } },
      ...D.playlists.filter((p) => p.id !== ctx?.playlistId).slice(0, 6).map((p) => ({ label: p.name, icon: 'music', fn: () => { const k = store.addToPlaylist(p.id, ids); toast(k ? `Added to ${p.name}` : `Already in ${p.name}`); } })),
      '-',
    ];
    if (one) {
      items.push({ label: 'Start radio', icon: 'radio', fn: () => playCollection('radio', one.id) });
      items.push({ label: 'Go to artist', icon: 'user', fn: () => (location.hash = '#/artist/' + enc(one.artist)) });
      items.push({ label: 'Go to album', icon: 'disc', fn: () => (location.hash = '#/album/' + enc(one.album)) });
    }
    if (ctx?.playlistId) {
      items.push('-', { label: 'Remove from this playlist', icon: 'x', danger: true, fn: () => {
        const p = store.playlist(ctx.playlistId);
        const before = [...p.trackIds];
        ids.forEach((id) => store.removeFromPlaylist(ctx.playlistId, id));
        toast(`Removed from ${p.name}`, { label: 'Undo', fn: () => { p.trackIds = before; store.save(); store.emit('playlists'); } });
      } });
    }
    const locals = ids.filter((id) => store.get(id)?.source === 'local');
    if (locals.length) items.push({ label: `Delete from library${locals.length > 1 ? ` (${locals.length})` : ''}`, icon: 'trash', danger: true, fn: async () => { for (const id of locals) await store.removeLocal(id); toast('Removed from your library'); } });
    return items;
  }
  function playlistMenu(pid) {
    const p = store.playlist(pid);
    return [
      { label: 'Play', icon: 'play', fn: () => playCollection('playlist', pid) },
      { label: 'Add to queue', icon: 'list-plus', fn: () => { P.addToQueue(p.trackIds.filter(store.get)); toast('Added to queue'); } },
      '-',
      { label: 'Rename', icon: 'edit', fn: () => renamePlaylist(pid) },
      { label: 'Duplicate', icon: 'copy', fn: () => { const n = store.createPlaylist(p.name + ' (copy)', p.trackIds); location.hash = '#/playlist/' + n.id; } },
      { label: 'Delete', icon: 'trash', danger: true, fn: () => {
        const snapshot = { ...p, trackIds: [...p.trackIds] };
        const idx = D.playlists.indexOf(p);
        store.deletePlaylist(pid);
        if (route.name === 'playlist' && route.args[0] === pid) location.hash = '#/library';
        toast(`Deleted “${p.name}”`, { label: 'Undo', fn: () => { D.playlists.splice(idx, 0, snapshot); store.save(); store.emit('playlists'); } });
      } },
    ];
  }
  async function renamePlaylist(pid) {
    const p = store.playlist(pid);
    const n = await promptText('Rename playlist', p.name);
    if (n) store.renamePlaylist(pid, n);
  }
  async function newPlaylist(ids = []) {
    const n = await promptText('Create playlist', `My Playlist #${D.playlists.length + 1}`, 'Create');
    if (n === null) return;
    const p = store.createPlaylist(n, ids);
    location.hash = '#/playlist/' + p.id;
  }

  // ---------------- command palette ----------------
  const pal = $('#palette');
  const palInput = $('#paletteInput');
  let palItems = [], palIndex = 0;
  function commands() {
    return [
      { g: 'Playback', label: P.isPlaying() ? 'Pause' : 'Play', icon: 'play', run: P.toggle },
      { g: 'Playback', label: 'Next song', icon: 'next', run: () => P.next() },
      { g: 'Playback', label: 'Previous song', icon: 'prev', run: P.prev },
      { g: 'Playback', label: `Smart shuffle: ${P.shuffle ? 'turn off' : 'turn on'}`, icon: 'shuffle', run: P.toggleShuffle },
      { g: 'Playback', label: 'Cycle repeat mode', icon: 'repeat', run: P.cycleRepeat },
      { g: 'Playback', label: 'Immersive mode', icon: 'expand', run: () => openNP(true) },
      { g: 'Playback', label: 'Show queue', icon: 'queue', run: () => toggleQueue(true) },
      { g: 'Playback', label: 'Sleep timer…', icon: 'moon', run: sleepModal },
      ...(P.current ? [{ g: 'Playback', label: 'Start radio from current song', icon: 'radio', run: () => playCollection('radio', P.current) }] : []),
      { g: 'Go to', label: 'Home', icon: 'home', run: () => (location.hash = '#/home') },
      { g: 'Go to', label: 'Search', icon: 'search', run: () => $('#searchInput').focus() },
      { g: 'Go to', label: 'Your Library', icon: 'library', run: () => (location.hash = '#/library') },
      { g: 'Go to', label: 'Liked Songs', icon: 'heart', run: () => (location.hash = '#/liked') },
      { g: 'Go to', label: 'Sound Lab', icon: 'sliders', run: () => (location.hash = '#/settings') },
      { g: 'Library', label: 'Create playlist', icon: 'plus', run: () => newPlaylist() },
      { g: 'Library', label: 'Import music files', icon: 'upload', run: () => $('#fileInput').click() },
      ...Object.keys(P.EQ_PRESETS).map((k) => ({ g: 'Sound', label: `EQ preset: ${k}`, icon: 'sliders', run: () => { P.setEqPreset(k); toast(`EQ: ${k}`); if (route.name === 'settings') rerender(); } })),
      ...[0, 4, 8, 12].map((s) => ({ g: 'Sound', label: `Crossfade: ${s ? s + ' seconds' : 'off'}`, icon: 'wave', run: () => { S.crossfade = s; store.save(); toast(`Crossfade ${s ? s + 's' : 'off'}`); if (route.name === 'settings') rerender(); } })),
    ];
  }
  function renderPalette() {
    const q = palInput.value.trim().toLowerCase();
    const cmds = commands().filter((c) => !q || c.label.toLowerCase().includes(q) || c.g.toLowerCase().includes(q));
    const songs = q ? store.search(q).slice(0, 8).map((t) => ({ g: 'Songs', label: t.title, sub: `${t.artist} · ${t.album}`, img: covers.urlFor(t), run: () => playCollection('radio', t.id), queue: () => { P.addToQueue([t.id]); toast('Added to queue'); } })) : [];
    const pls = D.playlists.filter((p) => q && p.name.toLowerCase().includes(q)).map((p) => ({ g: 'Playlists', label: p.name, icon: 'music', sub: plural(p.trackIds.length, 'song'), run: () => (location.hash = '#/playlist/' + p.id) }));
    const arts = q ? artists().filter((a) => a.artist.toLowerCase().includes(q)).map((a) => ({ g: 'Artists', label: a.artist, icon: 'user', sub: 'Artist', run: () => (location.hash = '#/artist/' + enc(a.artist)) })) : [];
    palItems = [...songs, ...pls, ...arts, ...cmds].slice(0, 40);
    palIndex = Math.min(palIndex, Math.max(0, palItems.length - 1));
    let lastG = '';
    $('#paletteList').innerHTML = palItems.length ? palItems.map((it, i) => {
      const head = it.g !== lastG ? `<div class="p-group">${esc(it.g)}</div>` : '';
      lastG = it.g;
      return `${head}<div class="p-item ${i === palIndex ? 'active' : ''}" data-pi="${i}">${it.img ? `<img src="${it.img}" alt="">` : `<span class="p-ic">${icon(it.icon)}</span>`}<span class="p-text"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.queue ? '<kbd>⇧↵ queue</kbd>' : ''}</div>`;
    }).join('') : `<div class="empty" style="padding:30px">No matches</div>`;
    $('#paletteList .p-item.active')?.scrollIntoView({ block: 'nearest' });
  }
  function openPalette(open = true) {
    pal.classList.toggle('open', open);
    pal.setAttribute('aria-hidden', String(!open));
    if (open) { palInput.value = ''; palIndex = 0; renderPalette(); palInput.focus(); }
  }
  palInput.addEventListener('input', () => { palIndex = 0; renderPalette(); });
  palInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { palIndex = (palIndex + 1) % palItems.length; renderPalette(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { palIndex = (palIndex - 1 + palItems.length) % palItems.length; renderPalette(); e.preventDefault(); }
    else if (e.key === 'Enter') {
      const it = palItems[palIndex];
      if (!it) return;
      openPalette(false);
      if (e.shiftKey && it.queue) it.queue(); else it.run();
    } else if (e.key === 'Escape') openPalette(false);
  });
  $('#paletteList').addEventListener('click', (e) => {
    const it = palItems[+e.target.closest('[data-pi]')?.dataset.pi];
    if (it) { openPalette(false); it.run(); }
  });
  pal.addEventListener('click', (e) => { if (e.target === pal) openPalette(false); });

  // ---------------- event wiring ----------------
  function listOf(row) {
    const tl = row.closest('.tracklist');
    return tl ? lists[tl.dataset.list] : null;
  }
  function selectRow(row, e) {
    const list = row.closest('.tracklist');
    const rowsIn = $$('.row', list);
    const id = row.dataset.id;
    if (e.shiftKey && lastSelected && lastSelected.closest('.tracklist') === list) {
      const a = rowsIn.indexOf(lastSelected), b = rowsIn.indexOf(row);
      selection = new Set(rowsIn.slice(Math.min(a, b), Math.max(a, b) + 1).map((r) => r.dataset.id));
    } else if (e.ctrlKey || e.metaKey) {
      selection.has(id) ? selection.delete(id) : selection.add(id);
      lastSelected = row;
    } else {
      selection = new Set([id]);
      lastSelected = row;
    }
    $$('.row', view).forEach((r) => r.classList.toggle('selected', selection.has(r.dataset.id) && r.closest('.tracklist') === list));
  }
  function playRow(row) {
    const l = listOf(row);
    const i = +row.dataset.i;
    if (row.dataset.id === P.current && P.contextRoute === l.route) { P.toggle(); return; }
    P.playList(l.ids, i, l.name, l.route);
  }

  view.addEventListener('click', (e) => {
    const t = e.target;
    const row = t.closest('.row');
    if (t.closest('a[href]')) return;
    if (row) {
      if (t.closest('.like-btn')) { likeWithPop(t.closest('.like-btn'), row.dataset.id); return; }
      if (t.closest('.more-btn')) {
        const r = t.closest('.more-btn').getBoundingClientRect();
        const ids = selection.has(row.dataset.id) ? [...selection] : [row.dataset.id];
        openMenu(r.left - 200, r.bottom + 4, trackMenu(ids, listOf(row)));
        return;
      }
      if (t.closest('.play-ic') || isMobile()) { playRow(row); return; }
      selectRow(row, e);
      return;
    }
    const playBtn = t.closest('[data-play]');
    if (playBtn) { e.stopPropagation(); playCollection(playBtn.dataset.play, playBtn.dataset.arg || undefined); return; }
    const pt = t.closest('[data-play-track]');
    if (pt) { playCollection('radio', pt.dataset.playTrack); return; }
    const filter = t.closest('[data-filter]');
    if (filter) { homeFilter = filter.dataset.filter; rerender(); return; }
    const lt = t.closest('[data-libtab]');
    if (lt) { history.replaceState(null, '', '#/library/' + lt.dataset.libtab); render(); return; }
    const act = t.closest('[data-action]');
    if (act) { runAction(act.dataset.action, act, e); return; }
    const card = t.closest('[data-href]');
    if (card) location.hash = card.dataset.href;
  });
  view.addEventListener('dblclick', (e) => {
    const row = e.target.closest('.row');
    if (row && !e.target.closest('button, a')) playRow(row);
  });
  view.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.row');
    if (row) {
      e.preventDefault();
      if (!selection.has(row.dataset.id)) selectRow(row, {});
      openMenu(e.clientX, e.clientY, trackMenu([...selection], listOf(row)));
      return;
    }
    const card = e.target.closest('[data-route^="#/playlist/"]');
    if (card) { e.preventDefault(); openMenu(e.clientX, e.clientY, playlistMenu(card.dataset.route.split('/')[2])); }
  });
  view.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', view.scrollTop > 20), { passive: true });

  function likeWithPop(btn, id) {
    const liked = store.toggleLike(id);
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    toast(liked ? 'Saved to Liked Songs' : 'Removed from Liked Songs');
  }

  function runAction(a, el, e) {
    const A = {
      import: () => $('#fileInput').click(),
      'new-playlist': () => newPlaylist(),
      'rename-playlist': () => renamePlaylist(route.args[0]),
      'playlist-menu': () => { const r = el.getBoundingClientRect(); openMenu(r.left, r.bottom + 4, playlistMenu(route.args[0])); },
      'shuffle-play': () => {
        const c = collection(el.dataset.kind, el.dataset.arg || undefined);
        if (!c?.ids.length) return;
        if (!P.shuffle) P.toggleShuffle();
        P.playList(c.ids, Math.floor(Math.random() * c.ids.length), c.name, c.route);
      },
      'queue-collection': () => { const c = collection(el.dataset.kind, el.dataset.arg); P.addToQueue(c.ids); toast(`Added ${plural(c.ids.length, 'song')} to queue`); },
      'artist-radio': () => playCollection('radio', el.dataset.arg),
      sleep: sleepModal,
      reset: () => modal(`<h2>Reset everything?</h2><p style="color:var(--muted)">Playlists, likes, history and settings will be cleared. Imported files stay in your library.</p><div class="modal-actions"><button class="pill-btn outline" data-close>Cancel</button><button class="pill-btn accent" data-ok>Reset</button></div>`, (box) => {
        $('[data-ok]', box).onclick = () => { localStorage.removeItem('echosphere:v1'); location.hash = '#/home'; location.reload(); };
      }),
      'close-queue': () => toggleQueue(false),
      'close-np': () => openNP(false),
      'q-clear': () => { P.manual.length = 0; renderQueue(); },
      toggle: P.toggle, next: () => P.next(), prev: P.prev, shuffle: P.toggleShuffle, repeat: P.cycleRepeat,
    };
    A[a] && A[a](e);
  }

  // settings controls (delegated)
  view.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.eq !== undefined) {
      P.setEq(+t.dataset.eq, +t.value);
      t.parentElement.querySelector('output').textContent = `${t.value > 0 ? '+' : ''}${t.value} dB`;
      $$('[data-seg=eqPreset] button').forEach((b) => b.classList.remove('active'));
      drawEqCurve();
    }
    if (t.dataset.range === 'crossfade') {
      S.crossfade = +t.value;
      store.save();
      t.nextElementSibling.textContent = S.crossfade ? S.crossfade + 's' : 'Off';
    }
  });
  view.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.dataset.toggle) return;
    const k = t.dataset.toggle;
    if (k === 'normalize') P.setLeveling(t.checked);
    else { S[k] = t.checked; store.save(); }
    if (k === 'reduceMotion') document.body.classList.toggle('reduce-motion', S.reduceMotion);
  });
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg] button');
    if (!b) return;
    const seg = b.parentElement.dataset.seg, v = b.dataset.v;
    if (seg === 'eqPreset') { P.setEqPreset(v); rerender(); return; }
    if (seg === 'speed') P.setSpeed(+v);
    if (seg === 'viz') { S.viz = v; store.save(); applyViz(); }
    $$('button', b.parentElement).forEach((x) => x.classList.toggle('active', x === b));
  });

  // queue panel
  $('#queuePanel').addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-action=close-queue]')) return toggleQueue(false);
    if (t.closest('[data-action=q-clear]')) { P.manual.length = 0; renderQueue(); return; }
    const row = t.closest('.row');
    if (!row) return;
    if (t.closest('[data-action=q-remove]')) { row.style.transition = 'opacity .2s, transform .25s'; row.style.opacity = 0; row.style.transform = 'translateX(30px)'; setTimeout(() => P.removeFromQueue(row.dataset.kind, +row.dataset.qi), 200); return; }
    if (row.dataset.kind === 'now') return openNP(true);
    P.jumpTo(row.dataset.kind, +row.dataset.qi);
  });

  // player bar
  $('#playBtn').onclick = P.toggle;
  $('#nextBtn').onclick = () => P.next();
  $('#prevBtn').onclick = P.prev;
  $('#shuffleBtn').onclick = () => { P.toggleShuffle(); toast(P.shuffle ? 'Smart shuffle on — no same-artist repeats' : 'Shuffle off'); };
  $('#repeatBtn').onclick = P.cycleRepeat;
  $('#queueBtn').onclick = () => toggleQueue();
  $('#muteBtn').onclick = P.toggleMute;
  $('#fullBtn').onclick = () => openNP(true);
  $('#pbCover').onclick = () => openNP(true);
  $('#eqBtn').onclick = () => (location.hash = '#/settings');
  $('#sleepBtn').onclick = sleepModal;
  $('#pbLike').onclick = (e) => P.current && likeWithPop(e.currentTarget, P.current);
  $('#npLike').onclick = (e) => P.current && likeWithPop(e.currentTarget, P.current);
  $('#playerBar').addEventListener('click', (e) => {
    if (isMobile() && !e.target.closest('button, a')) openNP(true);
  });
  $('#nowPlaying').addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (a) runAction(a.dataset.action, a, e);
    const v = e.target.closest('[data-viz]');
    if (v) { S.viz = v.dataset.viz; store.save(); applyViz(); }
  });

  // nav
  $('#backBtn').onclick = () => history.back();
  $('#fwdBtn').onclick = () => history.forward();
  $('#newPlaylist').onclick = () => newPlaylist();
  $('#importBtn').onclick = () => $('#fileInput').click();
  $('#paletteBtn').onclick = () => openPalette(true);
  $('#fileInput').onchange = async (e) => { await doImport([...e.target.files]); e.target.value = ''; };
  $('#sidePlaylists').addEventListener('contextmenu', (e) => {
    const it = e.target.closest('[data-pl]');
    if (it && it.dataset.pl !== 'liked') { e.preventDefault(); openMenu(e.clientX, e.clientY, playlistMenu(it.dataset.pl)); }
  });

  const si = $('#searchInput');
  let searchTimer;
  si.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const h = '#/search/' + enc(si.value);
      if (route.name === 'search') { history.replaceState(null, '', h); render({ keepScroll: false }); si.focus(); }
      else location.hash = h;
    }, 120);
  });
  si.addEventListener('focus', () => { if (route.name !== 'search') location.hash = '#/search/' + enc(si.value); });
  si.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const r = store.search(si.value)[0]; if (r) playCollection('radio', r.id); }
    if (e.key === 'Escape') si.blur();
  });

  async function doImport(files) {
    if (!files.length) return;
    toast(`Importing ${plural(files.length, 'file')}…`);
    const added = await store.importFiles(files);
    if (added.length) {
      toast(`Added ${plural(added.length, 'song')} to your library`, { label: 'Play', fn: () => P.playList(added.map((t) => t.id), 0, 'Your uploads', '#/library/uploads') });
    } else toast('No playable audio files found');
  }

  // ---------------- drag & drop ----------------
  let dragDepth = 0;
  let dragRow = null;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  window.addEventListener('dragenter', (e) => { if (hasFiles(e)) { dragDepth++; $('#dropZone').classList.add('on'); } });
  window.addEventListener('dragleave', (e) => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; $('#dropZone').classList.remove('on'); } });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    $('#dropZone').classList.remove('on');
    doImport([...e.dataTransfer.files]);
  });

  document.addEventListener('dragstart', (e) => {
    const row = e.target.closest?.('.row');
    if (!row) return;
    dragRow = row;
    const ids = row.closest('#view') && selection.has(row.dataset.id) ? [...selection] : [row.dataset.id];
    e.dataTransfer.setData('application/x-es-tracks', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'copyMove';
    const t = store.get(row.dataset.id);
    const ghost = document.createElement('div');
    ghost.textContent = ids.length > 1 ? `${ids.length} songs` : t.title;
    ghost.style.cssText = 'position:fixed;top:-100px;padding:8px 14px;border-radius:8px;background:#fff;color:#000;font:700 13px sans-serif';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 10, 10);
    setTimeout(() => ghost.remove(), 0);
    setTimeout(() => row.classList.add('dragging'), 0);
  });
  document.addEventListener('dragend', () => {
    $$('.dragging, .drag-over, .drop-target').forEach((x) => x.classList.remove('dragging', 'drag-over', 'drop-target'));
    dragRow = null;
  });
  const isTrackDrag = (e) => [...(e.dataTransfer?.types || [])].includes('application/x-es-tracks');
  const side = $('#sidePlaylists');
  side.addEventListener('dragover', (e) => {
    const it = e.target.closest('[data-pl]');
    if (!it || !isTrackDrag(e)) return;
    e.preventDefault();
    $$('.drop-target', side).forEach((x) => x !== it && x.classList.remove('drop-target'));
    it.classList.add('drop-target');
  });
  side.addEventListener('dragleave', (e) => e.target.closest('[data-pl]')?.classList.remove('drop-target'));
  side.addEventListener('drop', (e) => {
    const it = e.target.closest('[data-pl]');
    if (!it || !isTrackDrag(e)) return;
    e.preventDefault();
    it.classList.remove('drop-target');
    const ids = JSON.parse(e.dataTransfer.getData('application/x-es-tracks'));
    if (it.dataset.pl === 'liked') {
      ids.forEach((id) => !store.isLiked(id) && store.toggleLike(id));
      toast('Saved to Liked Songs');
    } else {
      const n = store.addToPlaylist(it.dataset.pl, ids);
      toast(n ? `Added to ${store.playlist(it.dataset.pl).name}` : 'Already in that playlist');
    }
  });
  // reorder within a playlist or the queue
  function reorderTarget(e) {
    const row = e.target.closest('.row');
    if (!row || !dragRow || row === dragRow) return null;
    const sameList = row.parentElement === dragRow.parentElement;
    if (!sameList) return null;
    const inQueue = row.closest('#queueBody');
    if (inQueue) return row.dataset.kind === dragRow.dataset.kind && row.dataset.kind !== 'now' ? row : null;
    return listOf(row)?.reorder ? row : null;
  }
  document.addEventListener('dragover', (e) => {
    const row = reorderTarget(e);
    $$('.drag-over').forEach((x) => x !== row && x.classList.remove('drag-over'));
    if (row) { e.preventDefault(); row.classList.add('drag-over'); }
  });
  document.addEventListener('drop', (e) => {
    const row = reorderTarget(e);
    if (!row) return;
    e.preventDefault();
    if (row.closest('#queueBody')) {
      const kind = row.dataset.kind;
      const from = +dragRow.dataset.qi, to = +row.dataset.qi;
      P.moveInQueue(kind, from, from < to ? to - 1 : to);
    } else {
      const from = +dragRow.dataset.i, to = +row.dataset.i;
      store.movePlaylistTrack(route.args[0], from, from < to ? to - 1 : to);
    }
  });

  // ---------------- keyboard ----------------
  document.addEventListener('keydown', (e) => {
    const typing = e.target.matches('input, textarea, [contenteditable]') && e.target.type !== 'range' && e.target.type !== 'checkbox';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(!pal.classList.contains('open')); return; }
    if (e.key === 'Escape') {
      if (menu.classList.contains('open')) return closeMenu();
      if (pal.classList.contains('open')) return openPalette(false);
      if ($('#modal').classList.contains('open')) return $('#modal').click();
      if (npOpen) return openNP(false);
      if ($('#app').classList.contains('queue-open')) return toggleQueue(false);
      if (selection.size) { selection.clear(); $$('.row.selected').forEach((r) => r.classList.remove('selected')); }
      return;
    }
    if (typing || e.altKey) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && route.name !== 'settings' && $('.tracklist', view)) {
      e.preventDefault();
      const list = $('.tracklist', view);
      selection = new Set($$('.row', list).map((r) => r.dataset.id));
      $$('.row', list).forEach((r) => r.classList.add('selected'));
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    const a = P.decks[P.active].audio;
    const k = e.key;
    const handled = {
      ' ': () => P.toggle(),
      ArrowRight: () => (e.shiftKey ? P.next() : P.seek(P.position().time + 5)),
      ArrowLeft: () => (e.shiftKey ? P.prev() : P.seek(Math.max(0, P.position().time - 5))),
      ArrowUp: () => { P.setVolume(S.volume + 0.05); },
      ArrowDown: () => { P.setVolume(S.volume - 0.05); },
      l: () => P.current && likeWithPop($('#pbLike'), P.current),
      s: () => $('#shuffleBtn').click(),
      r: P.cycleRepeat,
      m: P.toggleMute,
      q: () => toggleQueue(),
      f: () => openNP(),
      '/': () => si.focus(),
      Enter: () => { const r = $('.row.selected', view); if (r) playRow(r); else return false; },
    }[k.length === 1 ? k.toLowerCase() : k];
    if (handled) {
      if (e.target.closest('.slider') && k.startsWith('Arrow')) return;
      if (handled() !== false) e.preventDefault();
    }
    void a;
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#menu')) closeMenu(); });
  window.addEventListener('blur', closeMenu);
  view.addEventListener('scroll', closeMenu, { passive: true });

  // ---------------- store subscriptions ----------------
  store.on('player', syncPlayer);
  store.on('likes', () => {
    $$('.row').forEach((r) => {
      const b = r.querySelector('.like-btn');
      if (b) b.classList.toggle('liked', store.isLiked(r.dataset.id));
    });
    syncPlayer();
    renderSidebar();
    if (route.name === 'liked') rerender();
  });
  store.on('playlists', () => {
    renderSidebar();
    if (['playlist', 'library', 'home', 'search'].includes(route.name)) rerender();
  });
  store.on('library', () => rerender());
  window.addEventListener('hashchange', () => { closeMenu(); if (npOpen && !location.hash.includes('settings')) openNP(false); render(); });
  window.addEventListener('resize', () => { if (route.name === 'settings') drawEqCurve(); });

  // ---------------- boot ----------------
  async function boot() {
    hydrateIcons();
    if (!document.documentElement.style.getPropertyValue('--accent-h')) rootStyle.setProperty('--accent-h', 262);
    document.body.classList.toggle('reduce-motion', S.reduceMotion);
    applyViz();
    await store.loadLocal();
    P.restoreSession();
    render();
    syncPlayer();
    requestAnimationFrame(frame);
    // warm up the first demo song so the first press of play is instant
    const first = P.current ? store.get(P.current) : store.all()[0];
    if (first) setTimeout(() => store.getUrl(first).catch(() => {}), 400);
  }
  boot();

  ES.ui = { render, toast, openNP, openPalette, toggleQueue };
})();
