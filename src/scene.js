/* Сцена: фон, корзинка, клубки, спицы, нить (Verlet), частицы. */
(function () {
  const { rgb, mix, rng, clamp, lerp, hex } = P.U;
  const T = P.THEME;

  // ---------- фон ----------
  function makeBackground(img, W, H, dpr) {
    const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    x.fillStyle = '#F6E3E3'; x.fillRect(0, 0, W, H);
    if (img && img.naturalWidth) {
      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    }
    // пастельная вуаль + мягкий свет справа сверху + виньетка
    x.fillStyle = 'rgba(255,240,244,0.28)'; x.fillRect(0, 0, W, H);
    let g = x.createRadialGradient(W * 0.85, H * 0.05, 10, W * 0.85, H * 0.05, H * 0.6);
    g.addColorStop(0, 'rgba(255,236,222,0.55)'); g.addColorStop(1, 'rgba(255,236,222,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, H * 0.78);
    g.addColorStop(0, 'rgba(120,70,85,0)'); g.addColorStop(1, 'rgba(120,70,85,0.16)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    return c;
  }

  // ---------- корзинка ----------
  function makeBasket(w, h, dpr) {
    // возвращает {back, front, rimY, cx}: back — внутренность, front — плетёный бок + обод
    const pad = 16, W = w + pad * 2, H = h + pad * 2;
    const rimH = h * 0.30; // эллипс обода
    const cx = W / 2, rimY = pad + rimH / 2;
    const mk = () => { const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr); return [c, x]; };
    const [bc, b] = mk();
    // тень корзинки на столе
    let g = b.createRadialGradient(cx, pad + h * 0.98, 4, cx, pad + h * 0.98, w * 0.6);
    g.addColorStop(0, 'rgba(110,60,70,0.30)'); g.addColorStop(1, 'rgba(110,60,70,0)');
    b.save(); b.translate(0, 0); b.scale(1, 0.32); b.fillStyle = g;
    b.beginPath(); b.arc(cx, (pad + h * 0.98) / 0.32, w * 0.62, 0, 6.283); b.fill(); b.restore();
    b.fillStyle = 'rgba(110,60,70,0.22)';
    b.beginPath(); b.ellipse(cx, pad + h * 0.97, w * 0.47, h * 0.07, 0, 0, 6.283); b.fill();
    // внутренность
    g = b.createLinearGradient(0, rimY - rimH / 2, 0, rimY + rimH / 2);
    g.addColorStop(0, '#6E4B33'); g.addColorStop(1, '#A57A55');
    b.fillStyle = g; b.beginPath(); b.ellipse(cx, rimY, w / 2 - 6, rimH / 2 - 4, 0, 0, 6.283); b.fill();
    // плетение внутри (задняя стенка)
    b.save(); b.beginPath(); b.ellipse(cx, rimY, w / 2 - 6, rimH / 2 - 4, 0, 0, 6.283); b.clip();
    b.strokeStyle = 'rgba(60,36,22,0.35)'; b.lineWidth = 1;
    for (let i = -12; i < 12; i++) { b.beginPath(); b.moveTo(cx + i * 14, rimY - rimH); b.lineTo(cx + i * 14 + 6, rimY + rimH); b.stroke(); }
    b.restore();

    const [fc, f] = mk();
    // форма бока: от левого края обода вниз чашей до правого края
    const L = cx - w / 2, R = cx + w / 2, bot = pad + h;
    const side = new Path2D();
    side.moveTo(L, rimY);
    side.bezierCurveTo(L + 2, rimY + h * 0.55, L + w * 0.14, bot, cx, bot);
    side.bezierCurveTo(R - w * 0.14, bot, R - 2, rimY + h * 0.55, R, rimY);
    side.ellipse(cx, rimY, w / 2, rimH / 2, 0, 0, Math.PI, false);
    f.save(); f.clip(side);
    g = f.createLinearGradient(0, rimY, 0, bot); g.addColorStop(0, '#B08158'); g.addColorStop(1, '#7D5638');
    f.fillStyle = g; f.fillRect(0, 0, W, H);
    // горизонтальные ленты плетения
    const bands = 6, bh = (bot - rimY) / bands;
    const r = rng(77);
    for (let i = 0; i < bands + 1; i++) {
      const y0 = rimY + i * bh - 2;
      const seg = 30, off = (i % 2) * seg / 2;
      for (let xx = L - seg + off; xx < R + seg; xx += seg) {
        const yc = y0 + Math.sin((xx - L) / w * Math.PI) * rimH * 0.5 * (1 - i / bands * 0.5);
        const gg = f.createLinearGradient(0, yc, 0, yc + bh);
        const tint = 0.9 + r() * 0.2;
        gg.addColorStop(0, rgb(mix([226, 190, 150], [255, 255, 255], 0.0).map(v => v * tint)));
        gg.addColorStop(0.45, rgb([196 * tint, 152 * tint, 110 * tint]));
        gg.addColorStop(1, rgb([128, 88, 58]));
        f.fillStyle = gg;
        f.beginPath(); f.roundRect(xx + 1.5, yc + 1, seg - 5, bh - 1.5, bh * 0.45); f.fill();
      }
    }
    // вертикальные стойки
    f.globalAlpha = 0.5;
    for (let xx = L + 15; xx < R; xx += 30) {
      const gg = f.createLinearGradient(xx - 3, 0, xx + 3, 0); gg.addColorStop(0, 'rgba(90,60,38,0.0)'); gg.addColorStop(0.5, 'rgba(90,60,38,0.55)'); gg.addColorStop(1, 'rgba(90,60,38,0)');
      f.fillStyle = gg; f.fillRect(xx - 3, rimY, 6, bot - rimY);
    }
    f.globalAlpha = 1;
    // объём: тень по краям, блик справа
    g = f.createLinearGradient(L, 0, R, 0);
    g.addColorStop(0, 'rgba(70,40,25,0.42)'); g.addColorStop(0.3, 'rgba(70,40,25,0)'); g.addColorStop(0.72, 'rgba(255,240,220,0.14)'); g.addColorStop(1, 'rgba(70,40,25,0.36)');
    f.fillStyle = g; f.fillRect(0, 0, W, H);
    f.restore();
    // обод: витой жгут по передней дуге
    const rim = (from, to, front) => {
      for (let a = from; a <= to; a += 0.06) {
        const x0 = cx + Math.cos(a) * w / 2, y0 = rimY + Math.sin(a) * rimH / 2;
        const gg = f.createLinearGradient(x0, y0 - 6, x0, y0 + 6);
        gg.addColorStop(0, front ? '#E7C49A' : '#A57B55'); gg.addColorStop(1, front ? '#8F6442' : '#6B4A31');
        f.fillStyle = gg;
        f.save(); f.translate(x0, y0); f.rotate(a + 0.9);
        f.beginPath(); f.ellipse(0, 0, 8.5, 4.2, 0, 0, 6.283); f.fill(); f.restore();
      }
    };
    const [bc2, b2] = [bc, b];
    // задняя дуга обода — в back
    (function () {
      for (let a = Math.PI; a <= Math.PI * 2; a += 0.06) {
        const x0 = cx + Math.cos(a) * w / 2, y0 = rimY + Math.sin(a) * rimH / 2;
        const gg = b2.createLinearGradient(x0, y0 - 6, x0, y0 + 6);
        gg.addColorStop(0, '#D9B48A'); gg.addColorStop(1, '#8A6040');
        b2.fillStyle = gg; b2.save(); b2.translate(x0, y0); b2.rotate(a + 0.9);
        b2.beginPath(); b2.ellipse(0, 0, 8.5, 4.2, 0, 0, 6.283); b2.fill(); b2.restore();
      }
    })();
    rim(0, Math.PI, true);
    return { back: bc, front: fc, W, H, pad, rimY, cx, rimH };
  }

  // ---------- клубок ----------
  class Ball {
    constructor(code, seed) {
      this.code = code; this.y = P.YARN[code]; this.seed = seed;
      const r = rng(seed * 101 + 3);
      this.wraps = [];
      for (let i = 0; i < 20; i++) this.wraps.push({ th: r() * Math.PI, ky: 0.18 + r() * 0.72, k: 0.6 + r() * 0.8, w: 0.07 + r() * 0.05, l: r() });
      this.hairs = [];
      for (let i = 0; i < 46; i++) this.hairs.push({ a: r() * 6.283, l: 0.05 + r() * 0.09, c: r() * 0.4 - 0.2 });
      this.sparks = [];
      for (let i = 0; i < 16; i++) this.sparks.push({ a: r() * 6.283, d: Math.sqrt(r()) * 0.88, ph: r() * 6.28, per: 2.2 + r() * 1.4 });
      this.cache = null; this.cacheKey = '';
    }
    render(r, angle, dim, dpr) {
      const key = r.toFixed(1) + '|' + (Math.round(angle * 60)) + '|' + dim.toFixed(2);
      if (this.cacheKey === key && this.cache) return this.cache;
      const S = Math.ceil((r * 1.4) * 2);
      const c = this.cache || document.createElement('canvas');
      c.width = S * dpr; c.height = S * dpr;
      const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = S / 2, cy = S / 2;
      const Y = this.y;
      const grey = [190, 178, 182];
      const base = mix(Y.cBase, grey, dim), light = mix(Y.cLight, grey, dim), dark = mix(Y.cDark, grey, dim * 0.8), fz = mix(Y.cFuzz, grey, dim);
      // пух-ореол
      x.lineCap = 'round';
      x.strokeStyle = rgb(fz, 0.55); x.lineWidth = 0.8;
      x.beginPath();
      for (const hh of this.hairs) {
        const a = hh.a + angle * 0.35;
        const x0 = cx + Math.cos(a) * r * 0.94, y0 = cy + Math.sin(a) * r * 0.94;
        x.moveTo(x0, y0); x.quadraticCurveTo(x0 + Math.cos(a + hh.c) * r * hh.l, y0 + Math.sin(a + hh.c) * r * hh.l, x0 + Math.cos(a + hh.c * 2) * r * hh.l * 1.5, y0 + Math.sin(a + hh.c * 2) * r * hh.l * 1.5);
      }
      x.stroke();
      // шар
      let g = x.createRadialGradient(cx + r * 0.32, cy - r * 0.38, r * 0.1, cx, cy, r);
      g.addColorStop(0, rgb(light)); g.addColorStop(0.55, rgb(base)); g.addColorStop(1, rgb(dark));
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fill();
      // витки
      x.save(); x.beginPath(); x.arc(cx, cy, r * 0.985, 0, 6.283); x.clip();
      for (let i = 0; i < this.wraps.length; i++) {
        const wr = this.wraps[i];
        const th = wr.th + angle * wr.k;
        x.save(); x.translate(cx, cy); x.rotate(th);
        x.beginPath(); x.ellipse(0, 0, r * 0.98, r * wr.ky, 0, 0, Math.PI);
        x.strokeStyle = rgb(dark, 0.45); x.lineWidth = r * wr.w; x.stroke();
        x.beginPath(); x.ellipse(0, -r * 0.012, r * 0.98, r * wr.ky, 0, 0.15, Math.PI - 0.15);
        x.strokeStyle = rgb(mix(base, light, 0.4 + wr.l * 0.5), 0.9); x.lineWidth = r * wr.w * 0.55; x.stroke();
        x.restore();
      }
      x.restore();
      // сферический объём поверх витков
      g = x.createRadialGradient(cx + r * 0.3, cy - r * 0.35, r * 0.05, cx, cy, r * 1.02);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(0.8, rgb(dark, 0.18)); g.addColorStop(1, rgb(dark, 0.55));
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fill();
      this.cache = c; this.cacheKey = key; c._S = S;
      return c;
    }
    draw(ctx, cx, cy, r, angle, dim, dpr, time) {
      const c = this.render(r, angle, dim, dpr);
      ctx.drawImage(c, cx - c._S / 2, cy - c._S / 2, c._S, c._S);
      if (this.y.lurex && dim < 0.5) drawSparks(ctx, this.sparks.map(s => ({ x: cx + Math.cos(s.a + angle * 0.6) * r * s.d, y: cy + Math.sin(s.a + angle * 0.6) * r * s.d * 0.9, ph: s.ph, per: s.per, r: 1 })), time, this.y.lurex, r / 26);
    }
  }

  // спокойное мерцание люрекса: синус-яркость, ≤2 «креста» одновременно
  function drawSparks(ctx, pts, time, cols, scale) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let crosses = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const k = 0.5 + 0.5 * Math.sin(time * 6.283 / p.per + p.ph);
      const b = Math.pow(k, 3);
      if (b < 0.08) continue;
      const rr = (0.9 + b * 1.3) * (p.r || 1) * scale;
      ctx.fillStyle = `rgba(255,248,236,${0.22 + b * 0.55})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fill();
      if (b > 0.93 && crosses < 2) {
        crosses++;
        ctx.strokeStyle = `rgba(255,255,255,${(b - 0.93) * 9})`; ctx.lineWidth = 0.8;
        const L = rr * 3.6;
        ctx.beginPath(); ctx.moveTo(p.x - L, p.y); ctx.lineTo(p.x + L, p.y); ctx.moveTo(p.x, p.y - L); ctx.lineTo(p.x, p.y + L); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- спица ----------
  function drawNeedle(ctx, bx, by, tx, ty, w) {
    const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy); if (L < 2) return;
    const a = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(a);
    // тень на ткань/стол
    ctx.fillStyle = 'rgba(120,70,80,0.18)';
    ctx.beginPath(); ctx.moveTo(0, w * 0.9); ctx.lineTo(L - w * 3.2, w * 0.9); ctx.lineTo(L + 1, w * 1.5); ctx.lineTo(L - w * 3.2, w * 2.1); ctx.lineTo(0, w * 2.1); ctx.fill();
    // тело (дерево) с конусом на конце
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, '#F6E2C8'); g.addColorStop(0.35, '#E4C29C'); g.addColorStop(0.8, '#B98B62'); g.addColorStop(1, '#9C724E');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -w / 2); ctx.lineTo(L - w * 3.2, -w / 2);
    ctx.quadraticCurveTo(L - w * 0.6, -w * 0.2, L, 0); ctx.quadraticCurveTo(L - w * 0.6, w * 0.2, L - w * 3.2, w / 2);
    ctx.lineTo(0, w / 2); ctx.closePath(); ctx.fill();
    // волокна дерева
    ctx.strokeStyle = 'rgba(140,96,60,0.25)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(4, -w * 0.12); ctx.lineTo(L - w * 4, -w * 0.08); ctx.moveTo(10, w * 0.2); ctx.lineTo(L - w * 5, w * 0.18); ctx.stroke();
    // блик
    ctx.strokeStyle = 'rgba(255,250,240,0.75)'; ctx.lineWidth = w * 0.16;
    ctx.beginPath(); ctx.moveTo(6, -w * 0.25); ctx.lineTo(L - w * 3.6, -w * 0.22); ctx.stroke();
    // бусина-заглушка
    const bg = ctx.createRadialGradient(-w * 0.3, -w * 0.5, 1, 0, 0, w * 1.3);
    bg.addColorStop(0, '#FFE3EA'); bg.addColorStop(0.6, '#EFA2B6'); bg.addColorStop(1, '#C27088');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, w * 1.15, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  // ---------- нить: Verlet ----------
  class Rope {
    constructor(n) { this.n = n; this.p = []; this.o = []; for (let i = 0; i < n; i++) { this.p.push([0, 0]); this.o.push([0, 0]); } this.init = false; }
    reset(a, b) {
      for (let i = 0; i < this.n; i++) { const t = i / (this.n - 1); const x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t) + Math.sin(t * Math.PI) * 30; this.p[i] = [x, y]; this.o[i] = [x, y]; }
      this.init = true;
    }
    step(dt, a, b, slack) {
      if (!this.init) this.reset(a, b);
      const n = this.n, g = 1400;
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const seg = (d * (1 + slack)) / (n - 1);
      const dt2 = Math.min(dt, 1 / 30);
      for (let i = 1; i < n - 1; i++) {
        const p = this.p[i], o = this.o[i];
        const vx = (p[0] - o[0]) * 0.965, vy = (p[1] - o[1]) * 0.965;
        o[0] = p[0]; o[1] = p[1];
        p[0] += vx; p[1] += vy + g * dt2 * dt2;
      }
      this.p[0][0] = a[0]; this.p[0][1] = a[1]; this.p[n - 1][0] = b[0]; this.p[n - 1][1] = b[1];
      for (let it = 0; it < 6; it++) {
        for (let i = 0; i < n - 1; i++) {
          const p1 = this.p[i], p2 = this.p[i + 1];
          const dx = p2[0] - p1[0], dy = p2[1] - p1[1]; const dd = Math.hypot(dx, dy) || 0.001;
          const diff = (dd - seg) / dd;
          const m1 = i === 0 ? 0 : 1, m2 = i + 1 === n - 1 ? 0 : 1, sum = m1 + m2;
          if (!sum) continue;
          p1[0] += dx * diff * m1 / sum; p1[1] += dy * diff * m1 / sum;
          p2[0] -= dx * diff * m2 / sum; p2[1] -= dy * diff * m2 / sum;
        }
      }
    }
    draw(ctx, yarn, width, from = 0, to = this.n - 1, shadow = true) {
      const pts = this.p.slice(from, to + 1); if (pts.length < 2) return;
      const path = () => {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
        ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      };
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (shadow) { ctx.translate(1.5, 3); path(); ctx.strokeStyle = 'rgba(120,60,80,0.14)'; ctx.lineWidth = width * 1.1; ctx.stroke(); ctx.translate(-1.5, -3); }
      path(); ctx.strokeStyle = rgb(yarn.cDark); ctx.lineWidth = width; ctx.stroke();
      ctx.strokeStyle = rgb(yarn.cBase); ctx.lineWidth = width * 0.7; ctx.stroke();
      ctx.setLineDash([width * 0.9, width * 1.1]); ctx.strokeStyle = rgb(yarn.cLight, 0.7); ctx.lineWidth = width * 0.3; ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- частицы ----------
  class Particles {
    constructor() { this.list = []; }
    burst(x, y, n, opt = {}) {
      for (let i = 0; i < n; i++) {
        const a = (opt.a == null ? Math.random() * 6.283 : opt.a + (Math.random() - 0.5) * (opt.spread || 1));
        const sp = (opt.speed || 60) * (0.4 + Math.random() * 0.8);
        this.list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: (opt.life || 0.8) * (0.6 + Math.random() * 0.6), r: (opt.r || 2) * (0.6 + Math.random() * 0.8), col: opt.col || [255, 240, 230], g: opt.g == null ? 40 : opt.g, star: opt.star });
      }
    }
    step(dt) {
      for (const p of this.list) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + p.g * dt; }
      this.list = this.list.filter(p => p.life < p.max);
    }
    draw(ctx) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of this.list) {
        const t = p.life / p.max; const a = Math.sin(Math.PI * Math.min(1, t * 1.4 + 0.05)) * (1 - t);
        ctx.fillStyle = rgb(p.col, a * 0.85);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - t * 0.4), 0, 6.283); ctx.fill();
        if (p.star) { ctx.strokeStyle = rgb(p.col, a * 0.7); ctx.lineWidth = 0.8; const L = p.r * 3; ctx.beginPath(); ctx.moveTo(p.x - L, p.y); ctx.lineTo(p.x + L, p.y); ctx.moveTo(p.x, p.y - L); ctx.lineTo(p.x, p.y + L); ctx.stroke(); }
      }
      ctx.restore();
    }
  }

  P.Scene = { makeBackground, makeBasket, Ball, drawNeedle, Rope, Particles, drawSparks };
})();
