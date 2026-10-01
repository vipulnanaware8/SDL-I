/* EchoSphere — generative cover art and audio-reactive visualizers. */
(function () {
  const ES = (window.ES = window.ES || {});
  const { rng } = ES.synth;
  const hash = ES.store.hash;

  const cache = new Map();
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

  function draw(track, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = rng(hash(track.artist + '|' + track.album));
    const h = track.hue;
    const S = size;
    const bg = g.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, hsl(h, 70, 18));
    bg.addColorStop(1, hsl((h + 40) % 360, 75, 8));
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);

    const style = track.style || 'local';
    if (style === 'synthwave') {
      const sun = g.createLinearGradient(0, S * 0.15, 0, S * 0.6);
      sun.addColorStop(0, hsl(45, 100, 62));
      sun.addColorStop(1, hsl(h, 90, 55));
      g.fillStyle = sun;
      g.beginPath();
      g.arc(S / 2, S * 0.52, S * 0.27, Math.PI, 0);
      g.fill();
      g.fillStyle = hsl((h + 40) % 360, 75, 10);
      for (let i = 0; i < 6; i++) g.fillRect(0, S * (0.36 + i * 0.03), S, S * 0.006 * (i + 1));
      g.fillStyle = hsl((h + 40) % 360, 70, 7);
      g.fillRect(0, S * 0.52, S, S * 0.48);
      g.strokeStyle = hsl(h, 100, 65, 0.75);
      g.lineWidth = S * 0.005;
      for (let i = 0; i < 9; i++) {
        const y = S * 0.52 + Math.pow(i / 8, 2) * S * 0.48;
        g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
      }
      for (let i = -8; i <= 8; i++) {
        g.beginPath(); g.moveTo(S / 2 + i * S * 0.03, S * 0.52); g.lineTo(S / 2 + i * S * 0.2, S); g.stroke();
      }
    } else if (style === 'lofi') {
      for (let i = 0; i < 7; i++) {
        g.fillStyle = hsl((h + r() * 50) % 360, 55, 40 + r() * 25, 0.55);
        g.beginPath();
        g.ellipse(r() * S, r() * S, S * (0.15 + r() * 0.25), S * (0.15 + r() * 0.25), r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(S * 0.2, S * 0.18, S * 0.6, S * 0.5);
      g.strokeStyle = hsl(h, 40, 80, 0.8);
      g.lineWidth = S * 0.02;
      g.strokeRect(S * 0.2, S * 0.18, S * 0.6, S * 0.5);
      g.beginPath(); g.moveTo(S / 2, S * 0.18); g.lineTo(S / 2, S * 0.68); g.moveTo(S * 0.2, S * 0.43); g.lineTo(S * 0.8, S * 0.43); g.stroke();
      g.fillStyle = hsl(h, 30, 70, 0.5);
      for (let i = 0; i < 40; i++) g.fillRect(S * 0.2 + r() * S * 0.6, S * 0.18 + r() * S * 0.5, S * 0.004, S * 0.03);
    } else if (style === 'house') {
      const cx = S * (0.3 + r() * 0.4), cy = S * (0.3 + r() * 0.4);
      for (let i = 14; i > 0; i--) {
        g.fillStyle = hsl((h + i * 9) % 360, 80, 20 + i * 3.5, 0.9);
        g.beginPath(); g.arc(cx, cy, (i / 14) * S * 0.75, 0, Math.PI * 2); g.fill();
      }
    } else if (style === 'ambient') {
      for (let i = 0; i < 5; i++) {
        g.fillStyle = hsl((h + i * 12) % 360, 45, 20 + i * 10, 0.85);
        g.beginPath();
        g.moveTo(0, S);
        const base = S * (0.45 + i * 0.1);
        for (let x = 0; x <= S; x += S / 20) g.lineTo(x, base - Math.abs(Math.sin(x / S * (3 + i) + r() * 6)) * S * 0.18 * r());
        g.lineTo(S, S);
        g.fill();
      }
      const au = g.createLinearGradient(0, 0, S, S * 0.4);
      au.addColorStop(0, hsl(140, 90, 60, 0));
      au.addColorStop(0.5, hsl(150, 90, 65, 0.35));
      au.addColorStop(1, hsl(280, 90, 70, 0));
      g.fillStyle = au;
      g.fillRect(0, 0, S, S * 0.45);
    } else if (style === 'future') {
      g.translate(S / 2, S / 2);
      g.strokeStyle = hsl(h, 90, 75, 0.5);
      g.lineWidth = S * 0.004;
      for (let i = 1; i < 8; i++) {
        g.beginPath(); g.ellipse(0, 0, S * 0.07 * i, S * 0.025 * i, -0.4, 0, Math.PI * 2); g.stroke();
      }
      const pl = g.createRadialGradient(-S * 0.05, -S * 0.05, 0, 0, 0, S * 0.18);
      pl.addColorStop(0, hsl((h + 60) % 360, 90, 75));
      pl.addColorStop(1, hsl(h, 80, 30));
      g.fillStyle = pl;
      g.beginPath(); g.arc(0, 0, S * 0.17, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      for (let i = 0; i < 60; i++) g.fillRect((r() - 0.5) * S, (r() - 0.5) * S, S * 0.004, S * 0.004);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      for (let i = 0; i < 4; i++) {
        const rg = g.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, S * 0.8);
        rg.addColorStop(0, hsl((h + i * 30) % 360, 85, 55, 0.6));
        rg.addColorStop(1, hsl(h, 80, 30, 0));
        g.fillStyle = rg;
        g.fillRect(0, 0, S, S);
      }
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.font = `800 ${S * 0.28}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText((track.title || '?').slice(0, 2).toUpperCase(), S / 2, S / 2);
    }
    // film grain for a premium finish
    const img = g.getImageData(0, 0, S, S);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 14;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.88);
  }

  function urlFor(track, size = 300) {
    if (!track) return '';
    if (track.pictureBlob) {
      const k = 'pic:' + track.id;
      if (!cache.has(k)) cache.set(k, URL.createObjectURL(track.pictureBlob));
      return cache.get(k);
    }
    const bucket = size > 320 ? 640 : 300;
    const k = `${track.artist}|${track.album}|${track.style}|${track.hue}|${bucket}|${track.source === 'local' ? track.id : ''}`;
    if (!cache.has(k)) cache.set(k, draw(track, bucket));
    return cache.get(k);
  }

  ES.covers = { urlFor };

  // ---------------- visualizer ----------------
  const viz = { level: 0, beat: 0, avgLow: 0 };
  let freq, wave;
  function analyse() {
    const pl = ES.player;
    if (!pl.analyser || !pl.isPlaying()) {
      viz.level *= 0.92;
      viz.beat *= 0.9;
      return false;
    }
    if (!freq) {
      freq = new Uint8Array(pl.analyser.frequencyBinCount);
      wave = new Uint8Array(pl.analyser.fftSize);
    }
    pl.analyser.getByteFrequencyData(freq);
    pl.analyser.getByteTimeDomainData(wave);
    let low = 0;
    for (let i = 1; i < 12; i++) low += freq[i];
    low /= 11 * 255;
    viz.avgLow = viz.avgLow * 0.94 + low * 0.06;
    const hit = low - viz.avgLow;
    viz.beat = Math.max(viz.beat * 0.88, hit > 0.06 ? Math.min(1, hit * 5) : 0);
    let sum = 0;
    for (let i = 0; i < 200; i++) sum += freq[i];
    viz.level = viz.level * 0.8 + (sum / (200 * 255)) * 0.2;
    return true;
  }

  function drawViz(canvas, mode, hue) {
    const g = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth * dpr, H = canvas.clientHeight * dpr;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    g.clearRect(0, 0, W, H);
    if (!freq) return;
    const live = ES.player.isPlaying();
    if (mode === 'wave') {
      g.lineWidth = 3 * dpr;
      for (let layer = 0; layer < 3; layer++) {
        g.strokeStyle = hsl((hue + layer * 30) % 360, 90, 65, 0.8 - layer * 0.25);
        g.beginPath();
        for (let i = 0; i < wave.length; i += 4) {
          const x = (i / wave.length) * W;
          const v = live ? (wave[i] - 128) / 128 : 0;
          const y = H / 2 + v * H * 0.35 * (1 + layer * 0.3);
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    } else if (mode === 'orb') {
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.28;
      const n = 120;
      g.lineWidth = 2.5 * dpr;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const v = live ? freq[Math.floor(Math.pow(i / n, 1.6) * 500) + 2] / 255 : 0;
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const len = R * 0.08 + v * R * 0.7;
        g.strokeStyle = hsl((hue + i * 1.5) % 360, 90, 55 + v * 20, 0.9);
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        g.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
        g.stroke();
      }
    } else {
      const n = 72, gap = 3 * dpr, bw = (W - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const v = live ? freq[Math.floor(Math.pow(i / n, 1.8) * 600) + 2] / 255 : 0;
        const h = Math.max(2 * dpr, Math.pow(v, 1.4) * H * 0.95);
        const grd = g.createLinearGradient(0, H, 0, H - h);
        grd.addColorStop(0, hsl(hue, 85, 50, 0.9));
        grd.addColorStop(1, hsl((hue + 50) % 360, 95, 70, 0.95));
        g.fillStyle = grd;
        const x = i * (bw + gap);
        g.beginPath();
        if (g.roundRect) g.roundRect(x, H - h, bw, h, [bw / 2, bw / 2, 0, 0]); else g.rect(x, H - h, bw, h);
        g.fill();
      }
    }
  }

  ES.viz = Object.assign(viz, { analyse, drawViz });
})();
