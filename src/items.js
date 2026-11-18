/* Вещи: рендер готового изделия (полотно + кромки + косы + шишечки + отделка) и отделка по типу вещи.
   Отделка рисуется тем же штрихом пряжи (P.Stitch.yarnStroke), светом и тенями, что и петли. */
(function () {
  const { rgb, mix, rng, clamp, hex, lerp } = P.U;
  const ST = P.Stitch;
  const Yr = (c) => P.yarn(c);

  function edge(c2, y, Yc, x0, s, cols, keep) {
    for (let i = 0; i < cols * 2; i++) {
      if (keep && !keep(i >> 1)) continue;
      const cx = x0 + (i + 0.5) * s / 2, rx = s * 0.36, ry = s * 0.13;
      c2.save(); c2.translate(cx, y); c2.rotate(-0.42);
      c2.fillStyle = 'rgba(140,70,95,0.16)'; c2.beginPath(); c2.ellipse(1.5, 3, rx, ry, 0, 0, 6.283); c2.fill();
      const g = c2.createLinearGradient(0, -ry, 0, ry); g.addColorStop(0, rgb(Yc.cLight)); g.addColorStop(0.55, rgb(Yc.cBase)); g.addColorStop(1, rgb(Yc.cDark));
      c2.fillStyle = g; c2.beginPath(); c2.ellipse(0, 0, rx, ry, 0, 0, 6.283); c2.fill();
      c2.strokeStyle = rgb(Yc.cDark, 0.8); c2.lineWidth = 1; c2.stroke();
      c2.strokeStyle = rgb(Yc.cDark, 0.22); c2.lineWidth = Math.max(0.7, s * 0.03); c2.beginPath();
      for (let k = -2; k <= 2; k++) { c2.moveTo(k * rx * 0.35 - ry * 0.5, ry * 0.8); c2.lineTo(k * rx * 0.35 + ry * 0.5, -ry * 0.8); }
      c2.stroke(); c2.restore();
    }
  }
  // косы по слою tex: пары «c c»
  function cablePairs(tex, r, W) {
    const out = []; if (!tex || !tex[r]) return out; let c = 0;
    while (c < W - 1) { if (tex[r][c] === 'c' && tex[r][c + 1] === 'c') { out.push(c); c += 2; } else c++; }
    return out;
  }
  function drawCables(ctx, def, tex, getE, colX, originY, s, h, isFlat) {
    if (!tex) return;
    const H = def.height, W = def.width;
    for (let c = 0; c < W - 1; c++) {
      let runStart = -1;
      for (let r = 0; r < H; r++) {
        const isC = tex[r] && tex[r][c] === 'c' && tex[r][c + 1] === 'c' && (c === 0 || tex[r][c - 1] !== 'c' || cablePairs(tex, r, W).includes(c));
        if (!isC || !cablePairs(tex, r, W).includes(c)) { runStart = -1; continue; }
        if (runStart < 0) runStart = r;
        if ((r - runStart) % 2) continue;
        const a = getE(r, c), b = getE(r, c + 1);
        if (!a || !b || !isFlat(r, c) || !isFlat(r, c + 1)) continue;
        const yB = originY(r) + 0.62 * h, cx = colX(c) + s / 2;
        const two = r + 1 < H && cablePairs(tex, r + 1, W).includes(c);
        const a2 = two ? getE(r + 1, c) : null, b2 = two ? getE(r + 1, c + 1) : null;
        const full = two && a2 && b2 && isFlat(r + 1, c) && isFlat(r + 1, c + 1);
        const top = full ? yB - 2 * h : yB - 1.02 * h;
        ST.drawCablePair(ctx, cx, yB, s, h, P.yarn(a.code), P.yarn(b.code), [yB + (r === runStart ? 0.05 * h : 0), top]);
      }
    }
  }

  // пушистый помпон: сотни коротких ворсинок поверх объёмного шара
  function pompom(c2, x, y, r, Yc, seed = 3) {
    const R = rng(seed * 131 + 7);
    c2.save();
    c2.fillStyle = 'rgba(140,70,95,0.2)'; c2.beginPath(); c2.ellipse(x + r * 0.12, y + r * 0.22, r * 1.02, r * 0.95, 0, 0, 6.283); c2.fill();
    const g = c2.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, rgb(mix(Yc.cLight, [255, 255, 255], 0.3))); g.addColorStop(0.55, rgb(Yc.cBase)); g.addColorStop(1, rgb(Yc.cDark));
    c2.fillStyle = g; c2.beginPath(); c2.arc(x, y, r * 0.9, 0, 6.283); c2.fill();
    c2.lineCap = 'round';
    const n = Math.round(90 + r * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * r * 0.85, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const out = d / r, len = r * (0.18 + R() * 0.22), aa = a + (R() - 0.5) * 0.9;
      const lit = clamp(0.5 - (Math.cos(a) * 0.5 + Math.sin(a) * 0.6) * out * 0.8 + (R() - 0.5) * 0.3, 0, 1);
      const col = lit > 0.5 ? mix(Yc.cBase, Yc.cLight, (lit - 0.5) * 2) : mix(Yc.cDark, Yc.cBase, lit * 2);
      c2.strokeStyle = rgb(col, 0.9); c2.lineWidth = Math.max(0.8, r * 0.07);
      c2.beginPath(); c2.moveTo(px, py); c2.quadraticCurveTo(px + Math.cos(aa) * len * 0.6, py + Math.sin(aa) * len * 0.6 - len * 0.1, px + Math.cos(aa) * len, py + Math.sin(aa) * len); c2.stroke();
    }
    for (let i = 0; i < 26; i++) { const a = R() * 6.283, d = r * (0.85 + R() * 0.2); c2.strokeStyle = rgb(Yc.cLight, 0.55); c2.lineWidth = Math.max(0.6, r * 0.04);
      c2.beginPath(); c2.moveTo(x + Math.cos(a) * d * 0.8, y + Math.sin(a) * d * 0.8); c2.lineTo(x + Math.cos(a) * d * 1.08, y + Math.sin(a) * d * 1.08); c2.stroke(); }
    c2.restore();
  }
  // пуговица: перламутр/дерево с двумя дырочками и пришивной ниткой
  function button(c2, x, y, r, tone, Yt) {
    c2.save();
    c2.fillStyle = 'rgba(120,60,80,0.25)'; c2.beginPath(); c2.arc(x + r * 0.12, y + r * 0.2, r, 0, 6.283); c2.fill();
    const g = c2.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, rgb(mix(tone, [255, 255, 255], 0.6))); g.addColorStop(0.6, rgb(tone)); g.addColorStop(1, rgb(mix(tone, [80, 40, 50], 0.35)));
    c2.fillStyle = g; c2.beginPath(); c2.arc(x, y, r, 0, 6.283); c2.fill();
    c2.strokeStyle = rgb(mix(tone, [80, 40, 50], 0.4), 0.7); c2.lineWidth = Math.max(0.8, r * 0.1); c2.stroke();
    c2.strokeStyle = rgb(mix(tone, [80, 40, 50], 0.25), 0.5); c2.lineWidth = Math.max(0.6, r * 0.07); c2.beginPath(); c2.arc(x, y, r * 0.72, 0, 6.283); c2.stroke();
    const hx = r * 0.26;
    c2.fillStyle = rgb(mix(tone, [70, 35, 45], 0.55)); c2.beginPath(); c2.arc(x - hx, y, r * 0.13, 0, 6.283); c2.arc(x + hx, y, r * 0.13, 0, 6.283); c2.fill();
    if (Yt) { c2.strokeStyle = rgb(Yt.cBase); c2.lineWidth = Math.max(0.9, r * 0.16); c2.lineCap = 'round'; c2.beginPath(); c2.moveTo(x - hx, y); c2.lineTo(x + hx, y); c2.stroke(); }
    c2.restore();
  }
  // кисточка: узелок-обмотка и пучок нитей
  function tassel(c2, x, y, len, Yc, s, seed = 5, tilt = 0) {
    const R = rng(seed * 17 + 3); const w = s * 0.13;
    c2.save(); c2.translate(x, y); c2.rotate(tilt);
    for (let i = 0; i < 9; i++) {
      const dx = (i - 4) * s * 0.055, end = dx * 1.9 + (R() - 0.5) * s * 0.08, L = len * (0.92 + R() * 0.12);
      ST.yarnStroke(c2, [[dx * 0.4, 0], [dx * 0.8, L * 0.35], [end * 0.9, L * 0.7], [end, L]], w, Yc, { shadow: i % 3 === 0, dim: i % 2 ? 0.12 : 0 });
    }
    // головка и обмотка
    const g = c2.createRadialGradient(-s * 0.08, -s * 0.12, 1, 0, 0, s * 0.3);
    g.addColorStop(0, rgb(Yc.cLight)); g.addColorStop(0.6, rgb(Yc.cBase)); g.addColorStop(1, rgb(Yc.cDark));
    c2.fillStyle = g; c2.beginPath(); c2.ellipse(0, s * 0.02, s * 0.22, s * 0.2, 0, 0, 6.283); c2.fill();
    ST.yarnStroke(c2, [[-s * 0.21, len * 0.24], [0, len * 0.27], [s * 0.21, len * 0.24]], w * 1.1, Yc, { shadow: false, dim: 0.25 });
    c2.restore();
  }
  function knotDot(c2, x, y, r, col) { // французский узелок (глазки)
    c2.save(); c2.fillStyle = 'rgba(255,255,255,0.35)'; c2.beginPath(); c2.arc(x, y + r * 0.35, r * 1.05, 0, 6.283); c2.fill();
    const g = c2.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, rgb(mix(col, [255, 255, 255], 0.35))); g.addColorStop(1, rgb(col));
    c2.fillStyle = g; c2.beginPath(); c2.arc(x, y, r, 0, 6.283); c2.fill();
    c2.fillStyle = 'rgba(255,255,255,0.85)'; c2.beginPath(); c2.arc(x - r * 0.32, y - r * 0.35, r * 0.28, 0, 6.283); c2.fill(); c2.restore();
  }
  function blush(c2, x, y, r) { const g = c2.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,140,165,0.55)'); g.addColorStop(1, 'rgba(255,140,165,0)'); c2.fillStyle = g; c2.beginPath(); c2.ellipse(x, y, r, r * 0.7, 0, 0, 6.283); c2.fill(); }
  const DARK = [92, 58, 66], MOUTH = { cBase: [120, 72, 82], cLight: [160, 110, 118], cDark: [80, 45, 55] };
  function face(c2, g, kind) {
    const s = g.s, cx = g.cx, yc = g.faceY;
    const ex = s * (kind === 'bear' ? 1.05 : 0.95);
    knotDot(c2, cx - ex, yc, s * 0.17, DARK); knotDot(c2, cx + ex, yc, s * 0.17, DARK);
    const ny = yc + s * 0.62;
    if (kind === 'bear') { c2.save(); const gg = c2.createRadialGradient(cx, ny + s * 0.1, 1, cx, ny + s * 0.12, s * 0.75); gg.addColorStop(0, 'rgba(255,248,240,0.75)'); gg.addColorStop(1, 'rgba(255,248,240,0)'); c2.fillStyle = gg; c2.beginPath(); c2.ellipse(cx, ny + s * 0.15, s * 0.8, s * 0.6, 0, 0, 6.283); c2.fill(); c2.restore(); }
    // носик
    c2.save(); c2.fillStyle = rgb(kind === 'bunny' ? [236, 140, 160] : DARK); c2.beginPath();
    c2.moveTo(cx - s * 0.17, ny - s * 0.06); c2.quadraticCurveTo(cx, ny - s * 0.14, cx + s * 0.17, ny - s * 0.06); c2.quadraticCurveTo(cx + s * 0.05, ny + s * 0.14, cx, ny + s * 0.15); c2.quadraticCurveTo(cx - s * 0.05, ny + s * 0.14, cx - s * 0.17, ny - s * 0.06); c2.fill();
    c2.fillStyle = 'rgba(255,255,255,0.6)'; c2.beginPath(); c2.ellipse(cx - s * 0.05, ny - s * 0.05, s * 0.05, s * 0.03, 0, 0, 6.283); c2.fill(); c2.restore();
    // ротик «ω» вышивкой
    const w = Math.max(1, s * 0.07), my = ny + s * 0.17;
    ST.yarnStroke(c2, [[cx, my - s * 0.02], [cx, my + s * 0.08]], w, MOUTH, { shadow: false });
    ST.yarnStroke(c2, [[cx - s * 0.3, my + s * 0.05], [cx - s * 0.15, my + s * 0.2], [cx, my + s * 0.08]], w, MOUTH, { shadow: false });
    ST.yarnStroke(c2, [[cx, my + s * 0.08], [cx + s * 0.15, my + s * 0.2], [cx + s * 0.3, my + s * 0.05]], w, MOUTH, { shadow: false });
    blush(c2, cx - s * 1.55, ny + s * 0.1, s * 0.42); blush(c2, cx + s * 1.55, ny + s * 0.1, s * 0.42);
    if (kind === 'bunny') for (const d of [-1, 1]) for (const k of [-0.12, 0.12]) ST.yarnStroke(c2, [[cx + d * s * 0.35, ny + s * 0.02], [cx + d * s * 0.75, ny + s * (k - 0.03)], [cx + d * s * 1.05, ny + s * k * 1.6]], Math.max(0.7, s * 0.035), MOUTH, { shadow: false, dim: 0.3 });
  }
  // объёмная светотень только по непрозрачным пикселям ткани
  function volume(c2, g, x0, y0, x1, y1, a = 1, radial = true) {
    c2.save(); c2.globalCompositeOperation = 'source-atop';
    let gr;
    if (radial) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(x1 - x0, y1 - y0) * 0.62; gr = c2.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R); gr.addColorStop(0, `rgba(255,250,248,${0.16 * a})`); gr.addColorStop(0.55, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(120,50,80,${0.26 * a})`); }
    else { gr = c2.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, `rgba(120,50,80,${0.24 * a})`); gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,250,248,${0.1 * a})`); gr.addColorStop(0.7, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(120,50,80,${0.24 * a})`); }
    c2.fillStyle = gr; c2.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8); c2.restore();
  }
  const GOLD = { cBase: [226, 186, 112], cLight: [255, 238, 190], cDark: [168, 124, 60] };

  // сплайн Катмулла-Рома через точки
  function sampleCR(pts, n) {
    const out = [], Q = [pts[0], ...pts, pts[pts.length - 1]];
    for (let i = 1; i < Q.length - 2; i++) { const p0 = Q[i - 1], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2];
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
    out.push(pts[pts.length - 1]); return out;
  }
  // вязаная лента с объёмом: светотень цилиндра поперёк, ряды «ёлочкой» вдоль, кромки и падающая тень
  function ribbon(c2, pts, wf, Yc, s, o = {}) {
    const q = sampleCR(pts, 16), N = q.length, t0 = o.from || 0, t1 = o.to == null ? 1 : o.to;
    const nrm = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; });
    const W = q.map((p, i) => wf(i / (N - 1)));
    const i0 = Math.round(t0 * (N - 1)), i1 = Math.round(t1 * (N - 1));
    const at = (i, u) => [q[i][0] + nrm[i][0] * W[i] * u, q[i][1] + nrm[i][1] * W[i] * u];
    const poly = () => { c2.beginPath(); for (let i = i0; i <= i1; i++) { const p = at(i, -0.5); i === i0 ? c2.moveTo(p[0], p[1]) : c2.lineTo(p[0], p[1]); } for (let i = i1; i >= i0; i--) { const p = at(i, 0.5); c2.lineTo(p[0], p[1]); } c2.closePath(); };
    c2.save();
    if (o.shadow !== false) { c2.save(); c2.translate(s * 0.1, s * 0.18); poly(); c2.fillStyle = 'rgba(110,45,70,0.3)'; c2.filter = 'blur(' + Math.max(1, s * 0.08) + 'px)'; c2.fill(); c2.restore(); }
    poly(); c2.fillStyle = rgb(Yc.cBase); c2.fill();
    c2.save(); poly(); c2.clip(); c2.lineCap = 'round';
    const K = 8;
    for (let i = i0; i < i1; i++) for (let k = 0; k < K; k++) {
      const u = -0.5 + (k + 0.5) / K, up = -(nrm[i][0] * -0.45 + nrm[i][1] * -0.89) * Math.sign(u || 1) * Math.abs(u) * 2;   // сторона к свету — светлее
      let lit = Math.cos(u * Math.PI * 0.92) * 0.75 + up * 0.28 + (o.dim ? -o.dim : 0);
      if (o.shadeEnd) { const tt = i / (N - 1); lit -= Math.max(0, (tt - (1 - o.shadeEnd)) / o.shadeEnd) * 0.55; }
      if (o.shadeStart) { const tt = i / (N - 1); lit -= Math.max(0, (o.shadeStart - tt) / o.shadeStart) * 0.45; }
      const col = lit > 0.62 ? mix(Yc.cBase, Yc.cLight, Math.min(1, (lit - 0.62) / 0.38)) : mix(Yc.cDark, Yc.cBase, clamp(lit / 0.62, 0, 1));
      const a = at(i, u), b = at(i + 1, u); c2.strokeStyle = rgb(col); c2.lineWidth = W[i] / K * 1.6;
      c2.beginPath(); c2.moveTo(a[0], a[1]); c2.lineTo(b[0], b[1]); c2.stroke();
    }
    // петли: «ёлочка» вдоль ленты
    let acc = 0; const step = s * 0.42;
    for (let i = i0 + 1; i <= i1; i++) { acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); if (acc < step) continue; acc = 0;
      const j = Math.min(i1, i + 2), c0 = at(j, 0);
      for (const u of [-0.44, 0.44]) { const e = at(i, u), m = at(i, u * 0.12);
        c2.strokeStyle = rgb(Yc.cDark, 0.7); c2.lineWidth = Math.max(1.2, s * 0.09); c2.beginPath(); c2.moveTo(e[0], e[1]); c2.quadraticCurveTo(m[0], m[1], c0[0], c0[1]); c2.stroke();
        c2.strokeStyle = rgb(Yc.cLight, 0.35); c2.lineWidth = Math.max(0.6, s * 0.035); c2.beginPath(); c2.moveTo(e[0] - nrm[i][0] * s * 0.05, e[1] - s * 0.05); c2.quadraticCurveTo(m[0], m[1] - s * 0.05, c0[0], c0[1] - s * 0.05); c2.stroke(); } }
    c2.restore();
    c2.strokeStyle = rgb(Yc.cDark, 0.55); c2.lineWidth = Math.max(0.8, s * 0.05);
    for (const u of [-0.5, 0.5]) { c2.beginPath(); for (let i = i0; i <= i1; i++) { const p = at(i, u); i === i0 ? c2.moveTo(p[0], p[1]) : c2.lineTo(p[0], p[1]); } c2.stroke(); }
    c2.restore();
  }

  // вязаная лента из настоящих петель: петли ставятся рядами вдоль кривой и поворачиваются по касательной; поверх — светотень цилиндра
  function ribbonKnit(c2, pts, wf, code, s, dpr, o = {}) {
    const q = sampleCR(pts, 18), N = q.length, to = o.to == null ? 1 : o.to;
    const tan = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; });
    const W = q.map((p, i) => wf(i / (N - 1))), i1 = Math.round(to * (N - 1)), i0 = Math.round((o.from || 0) * (N - 1));
    const at = (i, u) => [q[i][0] - tan[i][1] * W[i] * u, q[i][1] + tan[i][0] * W[i] * u];
    const poly = (cx) => { cx.beginPath(); for (let i = i0; i <= i1; i++) { const p = at(i, -0.5); i > i0 ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]); } for (let i = i1; i >= i0; i--) { const p = at(i, 0.5); cx.lineTo(p[0], p[1]); } cx.closePath(); };
    const cw = c2.canvas.width, chh = c2.canvas.height, t = document.createElement('canvas'); t.width = cw; t.height = chh; const x = t.getContext('2d'); x.scale(dpr, dpr);
    const Y = P.yarn(code), n = o.cols || 3, ss = Math.max(4, Math.round((W[Math.floor(N / 2)] / n) * 1.12 * 2) / 2), hs = ss * 0.78;
    poly(x); x.fillStyle = rgb(Y.cBase); x.fill();
    // петли
    let acc = hs * 0.5, row = 0;
    for (let i = 1; i <= i1; i++) { acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); if (acc < hs * 0.92) continue; acc = 0; row++;
      const [tx, ty] = tan[i], th = Math.atan2(-tx, ty) + (o.flip ? Math.PI : 0), m = Math.max(2, Math.round(W[i] / ss));
      for (let k = 0; k < m; k++) { const u = -0.5 + (k + 0.5) / m, p = at(i, u); x.save(); x.translate(p[0], p[1]); x.rotate(th); ST.drawSprite(x, 0, 0, ss, hs, code, 1 + (row * 3 + k) % 4, dpr); x.restore(); } }
    // обрезка по ленте и светотень цилиндра
    x.globalCompositeOperation = 'destination-in'; poly(x); x.fillStyle = '#000'; x.fill();
    x.globalCompositeOperation = 'source-atop'; x.lineCap = 'round';
    x.lineCap = 'butt'; x.lineJoin = 'round';
    for (let k = 0; k < 7; k++) { const u = -0.5 + (k + 0.5) / 7, lit = Math.cos(u * Math.PI) - (o.dim || 0) - (u > 0 ? u * 0.25 : 0);   // цилиндр: светлая середина, нижняя кромка в тени
      x.strokeStyle = lit > 0.75 ? `rgba(255,250,248,${(lit - 0.75) * 0.9})` : `rgba(110,45,70,${Math.min(0.32, (0.75 - lit) * 0.42)})`; x.lineWidth = W[Math.floor((i0 + i1) / 2)] / 7 + 0.6;
      x.beginPath(); for (let i = i0; i <= i1; i++) { const p = at(i, u); i > i0 ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); } x.stroke(); }
    if (o.shadeEnd) { const j0 = Math.max(i0, Math.round((1 - o.shadeEnd) * (N - 1))); if (j0 < i1) { const p0 = q[j0], p1 = q[i1], gr = x.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); gr.addColorStop(0, 'rgba(110,45,70,0)'); gr.addColorStop(1, 'rgba(110,45,70,0.4)');
      x.strokeStyle = gr; x.lineWidth = Math.max(...W) * 1.1; x.beginPath(); for (let i = j0; i <= i1; i++) i > j0 ? x.lineTo(q[i][0], q[i][1]) : x.moveTo(q[i][0], q[i][1]); x.stroke(); } }
    x.globalCompositeOperation = 'source-over'; x.strokeStyle = rgb(Y.cDark, 0.38); x.lineWidth = Math.max(0.8, s * 0.045);
    for (const u of [-0.5, 0.5]) { x.beginPath(); for (let i = i0; i <= i1; i++) { const p = at(i, u); i > i0 ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); } x.stroke(); }
    if (o.shadow !== false) { c2.save(); c2.translate(s * 0.12, s * 0.2); poly(c2); c2.fillStyle = 'rgba(110,45,70,0.3)'; c2.filter = 'blur(' + Math.max(1, s * 0.1) + 'px)'; c2.fill(); c2.restore(); }
    c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.drawImage(t, 0, 0); c2.restore();
  }
  const GREEN = { cBase: [126, 168, 120], cLight: [176, 208, 160], cDark: [84, 122, 86] }, BROWN = { cBase: [150, 108, 84], cLight: [192, 152, 122], cDark: [104, 72, 56] };
  function topCenter(g) { if (g.olTop) return [g.olTop[0], g.olTop[1] + 0.12 * g.s]; let best = -1, cs = []; for (let c = 0; c < g.W; c++) { const r = g.topRow(c); if (r > best) { best = r; cs = [c]; } else if (r === best) cs.push(c); }
    return [cs.reduce((a, c) => a + g.colX(c), 0) / cs.length, g.yOf(best) - 0.45 * g.h]; }
  function holes(g) { const { W, H } = g, m = (r, c) => r >= 0 && r < H && c >= 0 && c < W && !g.none(r, c), out = [];
    for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) { if (m(r, c)) continue; let L = false, R = false; for (let k = c - 1; k >= 0; k--) if (m(r, k)) { L = true; break; } for (let k = c + 1; k < W; k++) if (m(r, k)) { R = true; break; }
      let U = false, D = false; for (let k = r + 1; k < H; k++) if (m(k, c)) { U = true; break; } for (let k = r - 1; k >= 0; k--) if (m(k, c)) { D = true; break; } if (L && R && U && D) out.push([r, c]); }
    return out; }
  function star4(c2, x, y, R, col) { c2.save(); c2.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? R * 0.32 : R; c2.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c2.closePath();
    const gr = c2.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, rgb(col.cLight)); gr.addColorStop(1, rgb(col.cBase)); c2.fillStyle = gr; c2.fill(); c2.strokeStyle = rgb(col.cDark, 0.7); c2.lineWidth = 1; c2.stroke(); c2.restore(); }
  function cherryBall(c2, x, y, r) { const C = { cBase: [206, 70, 92], cLight: [246, 150, 160], cDark: [140, 36, 58] };
    c2.save(); c2.fillStyle = 'rgba(110,45,70,0.25)'; c2.beginPath(); c2.ellipse(x + r * 0.15, y + r * 0.3, r, r * 0.8, 0, 0, 6.283); c2.fill();
    const gr = c2.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, rgb(C.cLight)); gr.addColorStop(0.5, rgb(C.cBase)); gr.addColorStop(1, rgb(C.cDark));
    c2.fillStyle = gr; c2.beginPath(); c2.arc(x, y, r, 0, 6.283); c2.fill(); c2.fillStyle = 'rgba(255,255,255,0.75)'; c2.beginPath(); c2.ellipse(x - r * 0.35, y - r * 0.38, r * 0.22, r * 0.14, -0.6, 0, 6.283); c2.fill(); c2.restore(); }
  function leafShape(c2, x, y, L, ang, Yc) { c2.save(); c2.translate(x, y); c2.rotate(ang);
    c2.beginPath(); c2.moveTo(0, 0); c2.quadraticCurveTo(L * 0.5, -L * 0.42, L, 0); c2.quadraticCurveTo(L * 0.5, L * 0.42, 0, 0); c2.closePath();
    const gr = c2.createLinearGradient(0, -L * 0.3, 0, L * 0.3); gr.addColorStop(0, rgb(Yc.cLight)); gr.addColorStop(1, rgb(Yc.cDark)); c2.fillStyle = gr; c2.fill();
    c2.strokeStyle = rgb(Yc.cDark, 0.8); c2.lineWidth = 1; c2.stroke(); c2.beginPath(); c2.moveTo(L * 0.08, 0); c2.lineTo(L * 0.85, 0); c2.strokeStyle = rgb(Yc.cLight, 0.9); c2.stroke(); c2.restore(); }
  function smallFace(c2, g, x, y) { const s = g.s;
    knotDot(c2, x - s * 0.85, y, s * 0.16, DARK); knotDot(c2, x + s * 0.85, y, s * 0.16, DARK);
    ST.yarnStroke(c2, [[x - s * 0.32, y + s * 0.38], [x, y + s * 0.62], [x + s * 0.32, y + s * 0.38]], Math.max(1, s * 0.08), MOUTH, { shadow: false });
    blush(c2, x - s * 1.45, y + s * 0.42, s * 0.4); blush(c2, x + s * 1.45, y + s * 0.42, s * 0.4); }

  const DECO = {
    fringe: { post(c2, g) { const Yc = g.Ycast, s = g.s; for (let i = 0; i < g.W * 2; i++) { const c = i >> 1; if (g.none(0, c)) continue; const x = g.padX + (i + 0.5) * s / 2, y = g.castEdge + s * 0.05, L = s * (0.95 + ((i * 37) % 7) / 30);
      const sw = ((i * 53) % 5 - 2) * s * 0.03; ST.yarnStroke(c2, [[x, y], [x + sw * 0.5, y + L * 0.5], [x + sw, y + L]], s * 0.15, Yc, { shadow: i % 2 === 0 }); ST.yarnStroke(c2, [[x + s * 0.06, y], [x + s * 0.06 - sw * 0.4, y + L * 0.55], [x + s * 0.05 - sw, y + L * 0.95]], s * 0.13, Yc, { shadow: false, dim: 0.14 }); } } },
    tassels4: { post(c2, g) { const s = g.s, yt = g.yOf(g.H - 1) + g.h * 0.35, yb = g.yOf(0) + g.h * 0.25, xl = g.colX(0) + s * 0.25, xr = g.colX(g.W - 1) - s * 0.25; tassel(c2, xl, yb, s * 1.35, g.Yacc, s * 1.15, 3, 0.7); tassel(c2, xr, yb, s * 1.35, g.Yacc, s * 1.15, 4, -0.7); tassel(c2, xl, yt, s * 1.35, g.Yacc, s * 1.15, 5, 2.45); tassel(c2, xr, yt, s * 1.35, g.Yacc, s * 1.15, 6, -2.45); } },
    tube: { fab: true, post(c2, g) { volume(c2, g, g.padX, g.yTop, g.padX + g.W * g.s, g.castEdge, 1.2, false); } },
    // v3.3: фигурка остаётся ровно такой, как связана петельками — без обрезки по контуру и без обводки;
    // внутренние детали (швы-прожилки, узелки серединки) кладутся только поверх связанного полотна
    outline: { fab: true, post(c2, g) {
      const cat = window.PETELKA_CATALOG, it = cat && cat.items.find(i => i.id === g.def.item), O = it && it.ol; if (!O) return;
      const s = g.s, map = g.olMap; if (!map) return;
      const Y = (c) => c === 'acc' ? g.Yacc : c === 'main' || !c ? g.Ymain : P.yarn(c);
      if (O.seams && O.seams.length) { const [lc, lx] = (() => { const c = document.createElement('canvas'); c.width = c2.canvas.width; c.height = c2.canvas.height; const x = c.getContext('2d'); x.setTransform(c2.getTransform()); return [c, x]; })();
        for (const sm of O.seams) ST.yarnStroke(lx, sm.map(map), s * (O.sw || 0.17), Y(O.scol || O.col), { shadow: false, dim: O.sdim == null ? 0.35 : O.sdim });
        c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalCompositeOperation = 'source-atop'; c2.drawImage(lc, 0, 0); c2.restore(); }   // швы не выходят за петли
      if (O.knots) { const [kx, ky] = map(O.knots), kr = O.knots[2] * s, Yk = Y(O.kcol || 'acc');   // серединка: узелки
        c2.save(); c2.fillStyle = 'rgba(120,60,70,0.22)'; c2.beginPath(); c2.ellipse(kx, ky + kr * 0.12, kr * 1.08, kr * 1.02, 0, 0, 6.283); c2.fill(); c2.restore();
        const ring = [[0, 0, 0.42]]; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + 0.3; ring.push([Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.36]); }
        ring.forEach(([dx, dy, rr], i) => ST.drawBobble(c2, kx + dx * kr, ky + dy * kr, rr * kr, Yk, 1, 1 + i % 4)); }
    } },
    cloud_vol: { fab: true, post(c2, g) { // облачко: светлые «шапки» сверху, голубоватая тень снизу
      const y0 = g.yTop, y1 = g.castEdge; c2.save(); c2.globalCompositeOperation = 'source-atop';
      const gr = c2.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(110,100,160,0.10)'); gr.addColorStop(1, 'rgba(110,90,150,0.34)');
      c2.fillStyle = gr; c2.fillRect(g.padX - 4, y0 - 4, g.W * g.s + 8, y1 - y0 + 8); c2.restore();
      volume(c2, g, g.padX, g.yTop, g.padX + g.W * g.s, g.castEdge, 0.7, true); } },
    puffy: { fab: true, post(c2, g) { volume(c2, g, g.padX, g.yTop, g.padX + g.W * g.s, g.castEdge, 1, true); } },
    heeltoe: { fab: true, post(c2, g) { const s = g.s, y = g.yOf(1); volume(c2, g, g.padX + g.W * s - 2.8 * s, y - 1.6 * g.h, g.padX + g.W * s + 0.6 * s, g.castEdge + s * 0.3, 1.1, true); volume(c2, g, g.padX - 0.8 * s, y - 1.4 * g.h, g.padX + 2.4 * s, g.castEdge + s * 0.3, 1.1, true); } },
    tassel_tip: { post(c2, g) { const c = g.botCenterCol; tassel(c2, g.colX(c) + (g.W % 2 ? 0 : g.s / 2), g.botY(c) + g.s * 0.05, g.s * 1.5, g.Yacc, g.s, 7); } },
    tassel_bottom: { post(c2, g) { const x = g.cx, y = g.castEdge; ST.yarnStroke(c2, [[x, y - g.s * 0.1], [x + g.s * 0.05, y + g.s * 0.35], [x, y + g.s * 0.6]], g.s * 0.16, g.Yacc, {}); tassel(c2, x, y + g.s * 0.6, g.s * 1.7, g.Yacc, g.s * 1.2, 9); } },
    pompom: { post(c2, g) { pompom(c2, g.cx, g.yTop - g.s * 0.55, g.s * 1.1, g.Yacc, 3); } },
    pompom_toe: { post(c2, g) { const c = Math.min(g.W - 3, Math.round(g.W * 0.72)); pompom(c2, g.colX(c), g.topY(c) + g.s * 0.2, g.s * 1.25, g.Yacc, 6); } },
    beret_shade: { fab: true, post(c2, g) { volume(c2, g, g.padX, g.yTop, g.padX + g.W * g.s, g.yOf(1), 1.2, true); } },
    fringe_top: { post(c2, g) { const Yc = g.Ycast, s = g.s; for (let i = 0; i < g.W * 2; i++) { const c = i >> 1; if (g.topRow(c) !== g.H - 1) continue; const x = g.padX + (i + 0.5) * s / 2, y = g.topY(c) + s * 0.2, L = s * (0.95 + ((i * 41) % 7) / 30);
      const sw = ((i * 29) % 5 - 2) * s * 0.03; ST.yarnStroke(c2, [[x, y], [x + sw * 0.5, y - L * 0.5], [x + sw, y - L]], s * 0.15, Yc, { shadow: false }); ST.yarnStroke(c2, [[x + s * 0.06, y], [x + s * 0.06 - sw * 0.4, y - L * 0.55], [x + s * 0.05 - sw, y - L * 0.95]], s * 0.13, Yc, { shadow: false, dim: 0.14 }); } } },
    tassel_corners: { post(c2, g) { const s = g.s, y = g.topY(0) + s * 0.35; tassel(c2, g.colX(0) - s * 0.1, y, s * 1.3, g.Yacc, s, 11, 0.35); tassel(c2, g.colX(g.W - 1) + s * 0.1, y, s * 1.3, g.Yacc, s, 12, -0.35); } },
    bag_flap: { post(c2, g) { const s = g.s, x0 = g.padX + s * 0.05, x1 = g.padX + g.W * s - s * 0.05, y0 = g.yTop + s * 0.15, yt = g.yOf(g.H - 3) + g.h * 0.25, cx = (x0 + x1) / 2, Y2 = g.Yacc;
      c2.save(); c2.fillStyle = 'rgba(110,45,70,0.22)'; c2.beginPath(); c2.moveTo(x0, y0 + s * 0.2); c2.lineTo(x1, y0 + s * 0.2); c2.quadraticCurveTo(x1, yt + s * 0.25, cx, yt + s * 0.45); c2.quadraticCurveTo(x0, yt + s * 0.25, x0, y0 + s * 0.2); c2.fill();
      const gr = c2.createLinearGradient(0, y0, 0, yt); gr.addColorStop(0, rgb(Y2.cLight)); gr.addColorStop(1, rgb(Y2.cBase));
      c2.fillStyle = gr; c2.beginPath(); c2.moveTo(x0, y0); c2.lineTo(x1, y0); c2.quadraticCurveTo(x1, yt, cx, yt + s * 0.2); c2.quadraticCurveTo(x0, yt, x0, y0); c2.closePath(); c2.fill();
      c2.save(); c2.clip(); c2.strokeStyle = rgb(Y2.cDark, 0.3); c2.lineWidth = Math.max(0.8, s * 0.05); c2.lineCap = 'round';
      for (let yy = y0 + g.h * 0.6; yy < yt + s * 0.2; yy += g.h) for (let xx = x0 + s * 0.5; xx < x1; xx += s) { c2.beginPath(); c2.moveTo(xx - s * 0.28, yy - g.h * 0.3); c2.lineTo(xx, yy); c2.lineTo(xx + s * 0.28, yy - g.h * 0.3); c2.stroke(); }
      c2.restore(); c2.restore();
      ST.yarnStroke(c2, [[x0, y0], [x0 + (cx - x0) * 0.25, yt - (yt - y0) * 0.05], [cx, yt + s * 0.2], [x1 - (x1 - cx) * 0.25, yt - (yt - y0) * 0.05], [x1, y0]], s * 0.26, Y2, {});
      button(c2, cx, yt - s * 0.05, s * 0.34, [244, 236, 226], g.Ymain); } },
    phone_in: { pre(c2, g) { const s = g.s, x0 = g.padX + s * 0.3, x1 = g.padX + g.W * s - s * 0.3, y0 = g.yTop - s * 1.45, y1 = g.yTop + s * 2.5, r = s * 0.6;
      c2.save(); const gr = c2.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#5E5866'); gr.addColorStop(0.5, '#8A8494'); gr.addColorStop(1, '#55505C');
      c2.fillStyle = gr; c2.beginPath(); c2.roundRect(x0, y0, x1 - x0, y1 - y0, r); c2.fill();
      c2.fillStyle = '#2E2A34'; c2.beginPath(); c2.roundRect(x0 + s * 0.14, y0 + s * 0.14, x1 - x0 - s * 0.28, y1 - y0, r * 0.75); c2.fill();
      const gl = c2.createLinearGradient(x0, y0, x1, y0 + s); gl.addColorStop(0, 'rgba(255,255,255,0.22)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); c2.fillStyle = gl; c2.beginPath(); c2.roundRect(x0 + s * 0.14, y0 + s * 0.14, x1 - x0 - s * 0.28, y1 - y0, r * 0.75); c2.fill();
      c2.fillStyle = '#111014'; c2.beginPath(); c2.roundRect((x0 + x1) / 2 - s * 0.45, y0 + s * 0.3, s * 0.9, s * 0.22, s * 0.11); c2.fill(); c2.restore(); } },
    book: { post(c2, g) { const s = g.s, x0 = g.padX - s * 1.15, x1 = g.padX + g.W * s + s * 1.15, y0 = g.yTop - s * 0.9, y1 = g.yOf(g.H - 3) + g.h * 0.1;
      c2.save(); c2.fillStyle = 'rgba(110,45,70,0.22)'; c2.beginPath(); c2.roundRect(x0 + s * 0.08, y0 + s * 0.15, x1 - x0, y1 - y0, s * 0.18); c2.fill();
      const cv = c2.createLinearGradient(0, y0, 0, y1); cv.addColorStop(0, '#E8B7C3'); cv.addColorStop(1, '#C98DA0'); c2.fillStyle = cv; c2.beginPath(); c2.roundRect(x0, y0, x1 - x0, y1 - y0, s * 0.18); c2.fill();
      // обрез страниц снизу
      c2.fillStyle = '#FFF8EE'; c2.beginPath(); c2.roundRect(x0 + s * 0.12, y1 - s * 0.42, x1 - x0 - s * 0.24, s * 0.3, s * 0.06); c2.fill();
      c2.strokeStyle = 'rgba(190,150,150,0.55)'; c2.lineWidth = 0.8; for (let k = 1; k < 4; k++) { const yy = y1 - s * 0.42 + k * s * 0.075; c2.beginPath(); c2.moveTo(x0 + s * 0.16, yy); c2.lineTo(x1 - s * 0.16, yy); c2.stroke(); }
      // тиснение на обложке
      c2.strokeStyle = 'rgba(255,240,226,0.75)'; c2.lineWidth = Math.max(1, s * 0.06); c2.beginPath(); c2.roundRect(x0 + s * 0.35, y0 + s * 0.3, x1 - x0 - s * 0.7, y1 - y0 - s * 1.0, s * 0.12); c2.stroke();
      c2.restore(); } },
    buttons_band: { post(c2, g) { for (const [r, c] of (g.def.buttons || [])) button(c2, g.colX(c), g.yOf(r) + g.h * 0.12, g.s * 0.31, [244, 236, 226], g.Yacc); } },
    inner: { pre(c2, g) { // изнанка/спинка в вырезе, разрезе кардигана и в кольце снуда
      const { W, H, s, h } = g, m = (r, c) => r >= 0 && r < H && c >= 0 && c < W && !g.none(r, c);
      const cells = [];
      for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) {
        if (m(r, c)) continue;
        let L = false, R = false; for (let k = c - 1; k >= 0; k--) if (m(r, k)) { L = true; break; } for (let k = c + 1; k < W; k++) if (m(r, k)) { R = true; break; }
        if (!L || !R) continue;
        let up = r; while (up + 1 < H && !m(up + 1, c)) up++; let dn = r; while (dn - 1 >= 0 && !m(dn - 1, c)) dn--;
        const top = up === H - 1, closedUp = up < H - 1, closedDn = dn > 0;
        if (!(top || (closedUp && closedDn))) continue;
        cells.push([r, c, r === up]);
      }
      // спинка изнутри: те же петли основного цвета, приглушённые тенью; у верхнего края — глубже
      const code = g.mainCode;
      for (const [r, c, topCell] of cells) ST.drawSprite(c2, g.colX(c), g.yOf(r) + (topCell && r === H - 1 ? h * 0.3 : 0), s, h, code, 1 + (r * 5 + c) % 4, g.dpr);
      c2.save(); c2.globalCompositeOperation = 'source-atop';
      for (const [r, c, topCell] of cells) { const y0 = g.yOf(r) - h * 0.7, y1 = g.yOf(r) + h * 0.7, gr = c2.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, `rgba(80,35,55,${topCell ? 0.55 : 0.4})`); gr.addColorStop(1, 'rgba(80,35,55,0.32)'); c2.fillStyle = gr; c2.fillRect(g.colX(c) - s * 0.7, y0, s * 1.4, y1 - y0); }
      c2.restore(); } },
    teapot: { pre(c2, g) { const s = g.s, xl = g.padX + s * 0.4, xr = g.padX + g.W * s - s * 0.4, yb = g.castEdge, cer = [250, 244, 240], cerD = [206, 188, 190];
      c2.save(); const gs = c2.createLinearGradient(xl - s * 2, 0, xl, 0); gs.addColorStop(0, rgb(cerD)); gs.addColorStop(0.5, rgb(cer)); gs.addColorStop(1, rgb(cerD));
      c2.fillStyle = gs; c2.beginPath(); c2.moveTo(xl, yb - s * 1.0); c2.quadraticCurveTo(xl - s * 1.2, yb - s * 1.2, xl - s * 1.75, yb - s * 2.9); c2.lineTo(xl - s * 1.3, yb - s * 3.0); c2.quadraticCurveTo(xl - s * 0.9, yb - s * 2.1, xl, yb - s * 2.2); c2.closePath(); c2.fill();
      c2.strokeStyle = rgb(cerD, 0.9); c2.lineWidth = 1; c2.stroke();
      c2.lineWidth = s * 0.44; c2.strokeStyle = rgb(cerD); c2.beginPath(); c2.ellipse(xr + s * 0.2, yb - s * 2.0, s * 0.95, s * 1.05, 0, -1.5, 1.5); c2.stroke();
      c2.lineWidth = s * 0.28; c2.strokeStyle = rgb(cer); c2.stroke();
      c2.fillStyle = 'rgba(130,70,90,0.2)'; c2.beginPath(); c2.ellipse(g.cx, yb + s * 0.55, g.W * s * 0.6, s * 0.3, 0, 0, 6.283); c2.fill();
      const gb = c2.createLinearGradient(0, yb, 0, yb + s * 0.5); gb.addColorStop(0, rgb(cer)); gb.addColorStop(1, rgb(cerD)); c2.fillStyle = gb; c2.beginPath(); c2.ellipse(g.cx, yb + s * 0.35, g.W * s * 0.56, s * 0.28, 0, 0, 6.283); c2.fill(); c2.restore(); } },

    pompom_small: { post(c2, g) { const c = Math.min(g.W - 2, Math.round(g.W * 0.66)); pompom(c2, g.colX(c), g.topY(c) + g.s * 0.15, g.s * 0.55, g.Yacc, 5); } },
    stalk: { post(c2, g) { const x = g.cx, y = g.yTop + g.s * 0.2, s = g.s; ST.yarnStroke(c2, [[x, y], [x + s * 0.05, y - s * 0.35], [x + s * 0.25, y - s * 0.62], [x + s * 0.42, y - s * 0.7]], s * 0.3, g.Ymain, {}); } },
    // v3.1: узел-перекрут — две половины повязки сложены валиками и сцеплены, как звенья: левый валик спереди внизу, правый — спереди вверху
    twist2: { fab: true, post(c2, g, fab) {
      const s = g.s, x = g.cx, y0 = g.yTop + g.h * 0.15, y1 = g.castEdge - g.h * 0.1, ym = (y0 + y1) / 2, Hh = y1 - y0, dpr = g.dpr;
      const T = document.createElement('canvas'); T.width = fab.width; T.height = fab.height; T.getContext('2d').drawImage(fab, 0, 0);
      // полотно стягивается к узлу: талия и складки-«лучи»
      c2.save(); c2.globalCompositeOperation = 'destination-out';
      for (const sg of [-1, 1]) { c2.beginPath(); c2.moveTo(x - s * 3.4, sg < 0 ? y0 - s : y1 + s); c2.quadraticCurveTo(x, sg < 0 ? y0 + Hh * 0.2 : y1 - Hh * 0.2, x + s * 3.4, sg < 0 ? y0 - s : y1 + s); c2.closePath(); c2.fill(); }
      c2.restore();
      c2.save(); c2.globalCompositeOperation = 'source-atop'; c2.lineCap = 'round';
      for (const d of [-1, 1]) for (let k = -2; k <= 2; k++) { const yy = ym + k * Hh * 0.17; c2.strokeStyle = `rgba(110,45,70,${0.22 - Math.abs(k) * 0.03})`; c2.lineWidth = Math.max(1, s * 0.09);
        c2.beginPath(); c2.moveTo(x + d * s * 1.0, ym + k * Hh * 0.06); c2.quadraticCurveTo(x + d * s * 2.1, yy, x + d * s * 3.6, ym + k * Hh * 0.26); c2.stroke(); }
      const gp = c2.createLinearGradient(x - s * 3.6, 0, x + s * 3.6, 0); gp.addColorStop(0, 'rgba(120,50,80,0)'); gp.addColorStop(0.35, 'rgba(120,50,80,0.18)'); gp.addColorStop(0.5, 'rgba(120,50,80,0.3)'); gp.addColorStop(0.65, 'rgba(120,50,80,0.18)'); gp.addColorStop(1, 'rgba(120,50,80,0)');
      c2.fillStyle = gp; c2.fillRect(x - s * 3.6, y0 - s, s * 7.2, Hh + 2 * s); c2.restore();
      // валик: скруглённый прямоугольник под углом, внутри — то же полотно, повёрнутое поперёк
      const rw = s * 1.75, rh = Hh * 1.12;
      const rollPath = (cx, ang) => { const p = new Path2D(), r = rw / 2; const m = new DOMMatrix().translateSelf(cx, ym).rotateSelf(ang * 180 / Math.PI);
        const q = new Path2D(); q.roundRect(-rw / 2, -rh / 2, rw, rh, r); p.addPath(q, m); return p; };
      const roll = (cx, ang, clipTop) => { const P2 = rollPath(cx, ang);
        c2.save(); if (clipTop != null) { c2.beginPath(); c2.rect(cx - rw * 2, clipTop ? ym - rh : ym, rw * 4, rh); c2.clip(); }
        c2.save(); c2.translate(s * 0.08, s * 0.16); c2.fillStyle = 'rgba(110,45,70,0.28)'; c2.filter = `blur(${Math.max(1, s * 0.12)}px)`; c2.fill(P2); c2.restore();
        c2.save(); c2.clip(P2); c2.translate(cx, ym); c2.rotate(ang + Math.PI / 2); c2.drawImage(T, -T.width / dpr * 0.5 + (g.padX + g.W * s * 0.25 - g.w * 0.5) * 0, -ym * 1.0 + (x - g.w / 2) * 0, T.width / dpr, T.height / dpr); c2.restore();
        c2.save(); c2.clip(P2); c2.translate(cx, ym); c2.rotate(ang);
        const gl = c2.createLinearGradient(-rw / 2, 0, rw / 2, 0); gl.addColorStop(0, 'rgba(110,45,70,0.42)'); gl.addColorStop(0.22, 'rgba(110,45,70,0.08)'); gl.addColorStop(0.45, 'rgba(255,250,245,0.22)'); gl.addColorStop(0.7, 'rgba(110,45,70,0.05)'); gl.addColorStop(1, 'rgba(110,45,70,0.45)');
        c2.fillStyle = gl; c2.fillRect(-rw, -rh, rw * 2, rh * 2);
        const ge = c2.createLinearGradient(0, -rh / 2, 0, rh / 2); ge.addColorStop(0, 'rgba(110,45,70,0.25)'); ge.addColorStop(0.18, 'rgba(110,45,70,0)'); ge.addColorStop(0.82, 'rgba(110,45,70,0)'); ge.addColorStop(1, 'rgba(110,45,70,0.3)');
        c2.fillStyle = ge; c2.fillRect(-rw, -rh, rw * 2, rh * 2);
        c2.strokeStyle = 'rgba(110,45,70,0.22)'; c2.lineWidth = Math.max(1, s * 0.07);           // сборки на сгибе
        for (const e of [-1, 1]) { c2.beginPath(); c2.moveTo(e * rw * 0.3, -rh * 0.42); c2.quadraticCurveTo(e * rw * 0.16, 0, e * rw * 0.3, rh * 0.42); c2.stroke(); }
        c2.restore();
        c2.save(); c2.strokeStyle = 'rgba(110,45,70,0.35)'; c2.lineWidth = Math.max(1, s * 0.08); c2.stroke(P2); c2.restore();
        c2.restore(); };
      const a = 0.3, dx = s * 0.62;
      roll(x + dx, a, null);      // правый — целиком
      roll(x - dx, -a, null);     // левый — поверх
      roll(x + dx, a, true);      // правый снова поверх в верхней половине — сцепка
    } },
    // v3.1: повязка с вязаным бантиком — бант (контур как у фигурки «Бантик») связан мелкими петлями основным цветом, узелок — акцентом
    bow_band: { fab: true, post(c2, g) {
      const cat = window.PETELKA_CATALOG, B = cat && cat.items.find(i => i.id === 'bow'), O = B && B.ol; if (!O) return;
      const s = g.s, x = g.cx, y0 = g.yTop + g.h * 0.1, y1 = g.castEdge - g.h * 0.1, ym = (y0 + y1) / 2, Hh = y1 - y0;
      // полотно чуть стянуто под бантом: тень и складки
      c2.save(); c2.globalCompositeOperation = 'source-atop'; c2.lineCap = 'round';
      const gp = c2.createLinearGradient(x - s * 4.5, 0, x + s * 4.5, 0); gp.addColorStop(0, 'rgba(120,50,80,0)'); gp.addColorStop(0.5, 'rgba(120,50,80,0.3)'); gp.addColorStop(1, 'rgba(120,50,80,0)');
      c2.fillStyle = gp; c2.fillRect(x - s * 4.5, y0 - s, s * 9, Hh + 2 * s);
      for (const d of [-1, 1]) for (let k = -2; k <= 2; k++) { c2.strokeStyle = 'rgba(110,45,70,0.16)'; c2.lineWidth = Math.max(1, s * 0.08);
        c2.beginPath(); c2.moveTo(x + d * s * 1.2, ym + k * Hh * 0.08); c2.quadraticCurveTo(x + d * s * 2.6, ym + k * Hh * 0.16, x + d * s * 4.2, ym + k * Hh * 0.24); c2.stroke(); }
      c2.restore();
      const bw = 15, bh = 12, sc = (Hh * 1.08) / (bh * g.h), ss = s * sc, hh = g.h * sc;          // бант: 15×12 «петель» фигурки в масштабе
      const ox = x - bw * ss / 2, oy = ym - 5.0 * hh;
      const map = ([px, py]) => [ox + px * ss, oy + py * hh];
      const path = new Path2D(); O.p.map(map).forEach((p, i) => i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])); path.closePath();
      c2.save(); c2.translate(s * 0.1, s * 0.22); c2.filter = `blur(${Math.max(1, s * 0.15)}px)`; c2.fillStyle = 'rgba(110,45,70,0.35)'; c2.fill(path); c2.restore();
      const knot = (px, py) => Math.abs(px - 7.5) < 1.6 && py > 1.7 && py < 7.0;
      const L = document.createElement('canvas'); L.width = c2.canvas.width; L.height = c2.canvas.height; const l = L.getContext('2d'); l.scale(g.dpr, g.dpr);
      const fs = ss * 0.82, fh = fs * 0.78, band = g.mainCode, main = (g.def.balls.find(b => b.color !== band && !/[GW]/.test(b.color)) || {}).color || band, acc = band;
      l.fillStyle = 'rgb(' + P.yarn(main).cBase.join(',') + ')'; l.fill(path);
      for (let r = -1; r <= Math.ceil(bh * hh / fh) + 1; r++) for (let c = -1; c <= Math.ceil(bw * ss / fs) + 1; c++) {
        const px = ox + (c + 0.5) * fs, py = oy + r * fh; const gx = (px - ox) / ss, gy = (py - oy) / hh;
        ST.drawSprite(l, px, py, fs, fh, knot(gx, gy) ? acc : main, 1 + ((r * 7 + c * 3) & 3), g.dpr); }
      l.globalCompositeOperation = 'destination-in'; l.fillStyle = '#000'; l.fill(path); l.globalCompositeOperation = 'source-atop';
      const rg = l.createRadialGradient(x, ym, ss, x, ym, bw * ss * 0.55); rg.addColorStop(0, 'rgba(255,250,248,0.12)'); rg.addColorStop(0.6, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(120,50,80,0.28)');
      l.fillStyle = rg; l.fillRect(ox - ss, oy - hh, bw * ss + 2 * ss, bh * hh + 2 * hh);
      l.strokeStyle = 'rgba(120,50,80,0.14)'; l.lineWidth = ss * 1.1; l.stroke(path);
      for (const sm of (O.seams || [])) ST.yarnStroke(l, sm.map(map), ss * 0.2, P.yarn(main), { shadow: false, dim: 0.45 });
      ST.yarnStroke(l, (() => { const q = O.p.map(map); return [...q, q[0], q[1]]; })(), ss * 0.34, P.yarn(main), { dim: 0.25 });
      c2.drawImage(L, 0, 0, L.width / g.dpr, L.height / g.dpr);
    } },
    twist: { fab: true, post(c2, g) { // узел-перекрут: две половины повязки огибают друг друга — объёмные вязаные ленты
      const s = g.s, x = g.cx, y0 = g.yTop + g.h * 0.1, y1 = g.castEdge - g.h * 0.05, ym = (y0 + y1) / 2, Hh = y1 - y0, Yc = g.Ymain;
      c2.save(); c2.globalCompositeOperation = 'source-atop';      // полотно стянуто к узлу: складки и тень
      const gp = c2.createLinearGradient(x - s * 3.2, 0, x + s * 3.2, 0); gp.addColorStop(0, 'rgba(120,50,80,0)'); gp.addColorStop(0.3, 'rgba(120,50,80,0.22)'); gp.addColorStop(0.5, 'rgba(120,50,80,0.42)'); gp.addColorStop(0.7, 'rgba(120,50,80,0.22)'); gp.addColorStop(1, 'rgba(120,50,80,0)');
      c2.fillStyle = gp; c2.fillRect(x - s * 3.2, y0 - s, s * 6.4, Hh + 2 * s);
      c2.strokeStyle = 'rgba(110,45,70,0.3)'; c2.lineWidth = Math.max(1, s * 0.07); c2.lineCap = 'round';
      for (const d of [-1, 1]) for (let k = -2; k <= 2; k++) { c2.beginPath(); c2.moveTo(x + d * s * 1.4, ym + k * Hh * 0.1); c2.quadraticCurveTo(x + d * s * 2.2, ym + k * Hh * 0.17, x + d * s * 3.0, ym + k * Hh * 0.24); c2.stroke(); }
      c2.restore();
      // узел-перекрут: две половины перекрещиваются в центре и концами обвивают встречную полосу (обмотка видна по бокам)
      const A = [[x - s * 3.0, ym + Hh * 0.02], [x - s * 1.6, ym - Hh * 0.3], [x + s * 0.0, ym - Hh * 0.12], [x + s * 1.45, ym + Hh * 0.26], [x + s * 2.15, ym + Hh * 0.1]];
      const B = A.map(([px, py]) => [2 * x - px, 2 * ym - py]);
      const wf = (t) => Hh * 0.42 * (0.9 + 0.2 * Math.sin(Math.PI * t)) * (t > 0.86 ? 1 - (t - 0.86) * 1.8 : 1) * (t < 0.16 ? 0.35 + 0.65 * Math.sin(t / 0.16 * Math.PI / 2) : 1);
      ribbon(c2, B, wf, Yc, s, { dim: 0.2, shadeEnd: 0.25, shadeStart: 0.16 });
      ribbon(c2, A, wf, Yc, s, { shadeEnd: 0.25, shadeStart: 0.16 });
      ribbon(c2, B, wf, Yc, s, { dim: 0.2, shadeEnd: 0.25, from: 0.7 });
    } },
    buttons_center: { post(c2, g) { const x = g.padX + g.W * g.s / 2; for (let r = 0; r < g.H - 2; r += 2) button(c2, x, g.yOf(r) + g.h * 0.15, g.s * 0.27, [238, 226, 214], g.Yacc); } },
    buttons_top: { post(c2, g) { const r = g.H - 2; for (const k of [-1, 0, 1]) button(c2, g.cx + k * g.s * 2, g.yOf(r) + g.h * 0.2, g.s * 0.3, [240, 228, 218], g.Yacc); } },
    mug: { pre(c2, g) { const s = g.s, x0 = g.padX - s * 0.22, x1 = g.padX + g.W * s + s * 0.22, yT = g.yTop - s * 0.75, yB = g.castEdge + s * 0.55, cer = [250, 244, 240], cerD = [214, 196, 196];
      // ручка
      c2.save(); c2.lineWidth = s * 0.42; c2.strokeStyle = rgb(cerD); c2.beginPath(); c2.ellipse(x1 + s * 0.15, (yT + yB) / 2, s * 0.75, (yB - yT) * 0.3, 0, -1.45, 1.45); c2.stroke();
      c2.lineWidth = s * 0.26; c2.strokeStyle = rgb(cer); c2.stroke(); c2.restore();
      // корпус
      c2.save(); c2.fillStyle = 'rgba(130,70,90,0.22)'; c2.beginPath(); c2.ellipse((x0 + x1) / 2, yB + s * 0.08, (x1 - x0) * 0.56, s * 0.28, 0, 0, 6.283); c2.fill();
      const gr = c2.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, rgb(cerD)); gr.addColorStop(0.28, rgb(cer)); gr.addColorStop(0.42, 'rgb(255,255,255)'); gr.addColorStop(1, rgb(mix(cerD, cer, 0.3)));
      c2.fillStyle = gr; c2.beginPath(); c2.moveTo(x0, yT); c2.lineTo(x1, yT); c2.lineTo(x1, yB - s * 0.3); c2.quadraticCurveTo(x1, yB, x1 - s * 0.35, yB); c2.lineTo(x0 + s * 0.35, yB); c2.quadraticCurveTo(x0, yB, x0, yB - s * 0.3); c2.closePath(); c2.fill();
      // край, какао и пенка-сердечко
      const rx = (x1 - x0) / 2, cxm = (x0 + x1) / 2;
      c2.fillStyle = rgb(cer); c2.beginPath(); c2.ellipse(cxm, yT, rx, s * 0.3, 0, 0, 6.283); c2.fill(); c2.strokeStyle = rgb(cerD, 0.8); c2.lineWidth = 1; c2.stroke();
      const cg = c2.createLinearGradient(0, yT - s * 0.2, 0, yT + s * 0.2); cg.addColorStop(0, '#8A5A48'); cg.addColorStop(1, '#6E4436');
      c2.fillStyle = cg; c2.beginPath(); c2.ellipse(cxm, yT + s * 0.02, rx - s * 0.12, s * 0.21, 0, 0, 6.283); c2.fill();
      c2.fillStyle = 'rgba(255,240,226,0.92)'; c2.save(); c2.translate(cxm, yT + s * 0.02); c2.scale(1, 0.42); c2.beginPath(); const hs = s * 0.28; c2.moveTo(0, hs * 0.9); c2.bezierCurveTo(-hs * 1.6, -hs * 0.2, -hs * 0.6, -hs * 1.3, 0, -hs * 0.4); c2.bezierCurveTo(hs * 0.6, -hs * 1.3, hs * 1.6, -hs * 0.2, 0, hs * 0.9); c2.fill(); c2.restore();
      c2.restore(); } },
    strap: { post(c2, g) { const s = g.s, x = g.padX + g.W * s - s * 0.55, y = (g.yTop + g.castEdge) / 2; ST.yarnStroke(c2, [[x - s * 0.5, y], [x, y - s * 0.05], [x + s * 0.55, y]], s * 0.34, g.Yacc, {}); button(c2, x + s * 0.05, y, s * 0.26, [236, 222, 208], null); } },
    loop_corner: { post(c2, g) { const s = g.s, x = g.padX + s * 0.25, y = g.yTop + s * 0.1; ST.yarnStroke(c2, [[x + s * 0.3, y + s * 0.05], [x - s * 0.15, y - s * 0.55], [x - s * 0.75, y - s * 0.6], [x - s * 0.7, y - s * 0.05], [x - s * 0.05, y + s * 0.25]], s * 0.2, g.Yacc, {}); } },
    loop_top: { post(c2, g) { const s = g.s, x = g.colX(0), y = g.topY(0) + s * 0.1; ST.yarnStroke(c2, [[x + s * 0.3, y + s * 0.05], [x + s * 0.1, y - s * 0.7], [x - s * 0.4, y - s * 0.8], [x - s * 0.45, y - s * 0.2], [x - s * 0.05, y + s * 0.15]], s * 0.2, g.Yacc, {}); } },
    cord_loop: { post(c2, g) { const s = g.s, x = g.padX + g.W * s - s * 0.3, y = g.yTop + s * 0.15; ST.yarnStroke(c2, [[x - s * 0.25, y], [x + s * 0.35, y - s * 0.9], [x + s * 1.0, y - s * 1.0], [x + s * 1.05, y - s * 0.35], [x + s * 0.2, y + s * 0.15]], s * 0.18, g.Yacc, {});
      const bx = x + s * 1.0, by = y - s * 0.98, gr = c2.createRadialGradient(bx - s * 0.06, by - s * 0.08, 1, bx, by, s * 0.2); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, rgb(g.Yacc.cBase)); c2.fillStyle = gr; c2.beginPath(); c2.arc(bx, by, s * 0.2, 0, 6.283); c2.fill(); } },
    handles: { pre(c2, g) { const s = g.s, y = g.yTop + s * 0.25, W = g.W, Y2 = g.Yacc, hh = Math.min(g.padT - s * 0.2, s * 1.9);
      for (const [a, b] of [[1, 2.6], [W - 2.6, W - 1]]) { const xa = g.padX + a * s, xb = g.padX + b * s; ST.yarnStroke(c2, [[xa, y], [xa - s * 0.05, y - hh * 0.75], [(xa + xb) / 2, y - hh], [xb + s * 0.05, y - hh * 0.75], [xb, y]], s * 0.36, Y2, {}); } } },
    cord_top: { post(c2, g) { const s = g.s, y = g.yTop + s * 0.05, x0 = g.padX - s * 0.9, x1 = g.padX + g.W * s + s * 0.9; const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([x0 + (x1 - x0) * t, y - s * 0.25 + Math.sin(t * Math.PI) * s * 0.12]); }
      ST.yarnStroke(c2, pts, s * 0.2, g.Yacc, {}); for (const x of [x0, x1]) { const gr = c2.createRadialGradient(x - s * 0.05, y - s * 0.3, 1, x, y - s * 0.25, s * 0.2); gr.addColorStop(0, rgb(g.Yacc.cLight)); gr.addColorStop(1, rgb(g.Yacc.cDark)); c2.fillStyle = gr; c2.beginPath(); c2.arc(x, y - s * 0.25, s * 0.2, 0, 6.283); c2.fill(); } } },
    cap: { post(c2, g) { const s = g.s, x = g.cx, y = g.yTop + s * 0.15, w = s * 2.3, hh = s * 0.8;
      c2.save(); c2.strokeStyle = rgb(GOLD.cDark); c2.lineWidth = Math.max(1, s * 0.08); c2.beginPath(); c2.ellipse(x, y - hh - s * 0.3, s * 0.3, s * 0.36, 0, 0, 6.283); c2.stroke();
      c2.beginPath(); c2.moveTo(x, y - hh - s * 0.66); c2.lineTo(x, y - hh - s * 1.6); c2.strokeStyle = 'rgba(150,110,90,0.6)'; c2.lineWidth = 1; c2.stroke();
      const gr = c2.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gr.addColorStop(0, rgb(GOLD.cDark)); gr.addColorStop(0.35, rgb(GOLD.cLight)); gr.addColorStop(0.6, rgb(GOLD.cBase)); gr.addColorStop(1, rgb(GOLD.cDark));
      c2.fillStyle = gr; c2.beginPath(); c2.moveTo(x - w / 2, y); c2.lineTo(x - w * 0.42, y - hh); c2.lineTo(x + w * 0.42, y - hh); c2.lineTo(x + w / 2, y); c2.closePath(); c2.fill();
      c2.strokeStyle = rgb(GOLD.cDark, 0.6); c2.lineWidth = Math.max(0.7, s * 0.04); for (let i = 1; i < 6; i++) { const t = i / 6; c2.beginPath(); c2.moveTo(x - w / 2 + w * t, y - 1); c2.lineTo(x - w * 0.42 + w * 0.84 * t, y - hh + 1); c2.stroke(); }
      c2.restore(); } },
    star_top: { post(c2, g) { const s = g.s, x = g.cx, y = g.yTop - s * 0.25, R = s * 0.62;
      c2.save(); const gl = c2.createRadialGradient(x, y, 0, x, y, R * 2.2); gl.addColorStop(0, 'rgba(255,236,170,0.55)'); gl.addColorStop(1, 'rgba(255,236,170,0)'); c2.fillStyle = gl; c2.beginPath(); c2.arc(x, y, R * 2.2, 0, 6.283); c2.fill();
      c2.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; c2.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c2.closePath();
      const gr = c2.createLinearGradient(x - R, y - R, x + R, y + R); gr.addColorStop(0, rgb(GOLD.cLight)); gr.addColorStop(0.5, rgb(GOLD.cBase)); gr.addColorStop(1, rgb(GOLD.cDark)); c2.fillStyle = gr; c2.fill(); c2.strokeStyle = rgb(GOLD.cDark); c2.lineWidth = 1; c2.stroke(); c2.restore(); } },
    bow_top: { post(c2, g) { const s = g.s, x = g.cx, y = g.yOf(g.H - 2) - g.h * 0.1, Y2 = g.Yacc, w = s * 0.24;
      ST.yarnStroke(c2, [[x, y], [x - s * 0.55, y - s * 0.45], [x - s * 0.85, y - s * 0.1], [x - s * 0.55, y + s * 0.2], [x, y]], w, Y2, {});
      ST.yarnStroke(c2, [[x, y], [x + s * 0.55, y - s * 0.45], [x + s * 0.85, y - s * 0.1], [x + s * 0.55, y + s * 0.2], [x, y]], w, Y2, {});
      ST.yarnStroke(c2, [[x - s * 0.05, y + s * 0.05], [x - s * 0.3, y + s * 0.5], [x - s * 0.45, y + s * 0.75]], w * 0.9, Y2, {}); ST.yarnStroke(c2, [[x + s * 0.05, y + s * 0.05], [x + s * 0.32, y + s * 0.45], [x + s * 0.5, y + s * 0.72]], w * 0.9, Y2, {});
      const gr = c2.createRadialGradient(x - s * 0.05, y - s * 0.06, 1, x, y, s * 0.2); gr.addColorStop(0, rgb(Y2.cLight)); gr.addColorStop(1, rgb(Y2.cDark)); c2.fillStyle = gr; c2.beginPath(); c2.ellipse(x, y, s * 0.2, s * 0.17, 0, 0, 6.283); c2.fill(); } },
    sole: { pre(c2, g) { // толстая войлочная подошва: силуэт тапочек, сдвинутый вниз
      const { W, H, s, h } = g, F = { cBase: [214, 182, 156], cLight: [236, 214, 194], cDark: [168, 132, 108] };
      c2.save(); const dy = s * 0.62;
      for (const [col, off, ex] of [['rgba(110,50,70,0.22)', dy + s * 0.22, 0.12], [null, dy, 0.1]]) {
        c2.fillStyle = col || (() => { const gr = c2.createLinearGradient(0, g.yTop, 0, g.castEdge + dy); gr.addColorStop(0, rgb(F.cLight)); gr.addColorStop(1, rgb(F.cDark)); return gr; })();
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!g.none(r, c)) { c2.beginPath(); c2.ellipse(g.colX(c), g.yOf(r) + off, s * (0.62 + ex), h * (0.72 + ex), 0, 0, 6.283); c2.fill(); } }
      c2.restore(); } },
    lining: { pre(c2, g) { // мягкая подкладка во входе тапочки: плюш, глубже к пятке
      const s = g.s, h = g.h, hs = holes(g); c2.save();
      if (!hs.length) { c2.restore(); return; } const ys = hs.map(([r]) => g.yOf(r)), y0 = Math.min(...ys) - h, y1 = Math.max(...ys) + h, gr = c2.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, rgb(mix(g.Ymain.cDark, [60, 25, 40], 0.5))); gr.addColorStop(1, rgb(mix(g.Ymain.cBase, [150, 80, 100], 0.3))); c2.fillStyle = gr;
      for (const [r, c] of hs) { const x = g.colX(c), y = g.yOf(r); c2.beginPath(); c2.ellipse(x, y, s * 0.75, h * 0.8, 0, 0, 6.283); c2.fill(); }
      const R = rng(41); c2.lineCap = 'round';
      for (const [r, c] of hs) for (let k = 0; k < 10; k++) { const x = g.colX(c) + (R() - 0.5) * s, y = g.yOf(r) + (R() - 0.5) * h; c2.strokeStyle = `rgba(255,240,245,${0.12 + R() * 0.15})`; c2.lineWidth = Math.max(0.7, s * 0.05); c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + (R() - 0.5) * s * 0.3, y - s * 0.2); c2.stroke(); }
      c2.restore(); } },
    pompom_pair: { post(c2, g) { // по большому пушистому помпону на мысок каждой тапочки
      const groups = []; let cur = null;
      for (let c = 0; c < g.W; c++) { const empty = g.topRow(c) < 0; if (empty) { cur = null; continue; } if (!cur) { cur = []; groups.push(cur); } cur.push(c); }
      groups.forEach((cs, k) => { const cx = (g.colX(cs[0]) + g.colX(cs[cs.length - 1])) / 2; let lo = g.H; for (const c of cs) lo = Math.min(lo, g.botRow(c));
        pompom(c2, cx, g.yOf(lo + 5) + g.h * 0.2, g.s * 1.5, g.Yacc, 6 + k); }); } },
    hang_loop: { post(c2, g) { const s = g.s, [x, y] = topCenter(g); ST.yarnStroke(c2, [[x - s * 0.22, y + s * 0.3], [x - s * 0.5, y - s * 0.55], [x, y - s * 1.15], [x + s * 0.5, y - s * 0.55], [x + s * 0.22, y + s * 0.3]], s * 0.17, g.Yacc, {});
      const gr = c2.createRadialGradient(x - s * 0.05, y + s * 0.15, 1, x, y + s * 0.2, s * 0.22); gr.addColorStop(0, rgb(g.Yacc.cLight)); gr.addColorStop(1, rgb(g.Yacc.cDark)); c2.fillStyle = gr; c2.beginPath(); c2.ellipse(x, y + s * 0.22, s * 0.24, s * 0.18, 0, 0, 6.283); c2.fill(); } },
    shine: { fab: true, post(c2, g) { c2.save(); c2.globalCompositeOperation = 'source-atop'; const s = g.s, x = g.colX(2) + s * 0.2, y = g.yOf(Math.round(g.H * 0.45));
      ST.yarnStroke(c2, [[x, y + s * 0.9], [x - s * 0.2, y], [x + s * 0.3, y - s * 1.1]], s * 0.26, { cBase: [255, 255, 255], cLight: [255, 255, 255], cDark: [240, 236, 240] }, { shadow: false }); c2.restore(); } },
    sparkle: { post(c2, g) { const s = g.s, x = g.colX(g.W - 2), y = g.yOf(Math.round(g.H / 2)); star4(c2, x, y - s * 0.4, s * 0.55, GOLD); star4(c2, x + s * 0.7, y + s * 0.9, s * 0.32, GOLD); } },
    face_small: { post(c2, g) { smallFace(c2, g, g.cx, g.faceY - g.s * 0.2); } },
    stem: { pre(c2, g) { const s = g.s, x = g.cx, y = g.castEdge - s * 0.25; ST.yarnStroke(c2, [[x, y], [x + s * 0.1, y + s * 0.7], [x - s * 0.15, y + s * 1.45]], s * 0.24, GREEN, {});
      if (g.def.item !== 'leaf') leafShape(c2, x + s * 0.05, y + s * 0.85, s * 1.2, -0.5, GREEN); } },
    antennae: { post(c2, g) { const s = g.s, [x, y] = topCenter(g); const Yd = { cBase: [120, 80, 96], cLight: [160, 120, 132], cDark: [86, 52, 66] };
      for (const d of [-1, 1]) { ST.yarnStroke(c2, [[x, y + s * 0.3], [x + d * s * 0.3, y - s * 0.5], [x + d * s * 0.9, y - s * 1.0]], s * 0.1, Yd, {}); knotDot(c2, x + d * s * 0.95, y - s * 1.05, s * 0.17, Yd.cBase); } } },
    bow_tails: { post(c2, g) { const s = g.s, x = g.cx, y = g.yOf(Math.floor(g.H / 2)) + g.h * 0.4, Y2 = g.Yacc;
      ribbon(c2, [[x - s * 0.2, y], [x - s * 0.7, y + s * 1.3], [x - s * 1.3, y + s * 2.6]], (t) => s * (0.75 - 0.2 * t), Y2, s, {});
      ribbon(c2, [[x + s * 0.2, y], [x + s * 0.75, y + s * 1.2], [x + s * 1.2, y + s * 2.5]], (t) => s * (0.75 - 0.2 * t), Y2, s, {}); } },
    window_light: { post(c2, g) { const s = g.s, h = g.h, warm = [255, 228, 160];
      for (const [r, c] of holes(g)) { const x = g.colX(c), y = g.yOf(r); c2.save(); const gr = c2.createRadialGradient(x, y, 0, x, y, s * 0.8); gr.addColorStop(0, rgb(mix(warm, [255, 255, 255], 0.4))); gr.addColorStop(1, rgb(mix(warm, [230, 170, 110], 0.4)));
        c2.fillStyle = gr; c2.fillRect(x - s * 0.5, y - h * 0.55, s, h * 1.1); c2.restore(); }
      const hs = holes(g); if (!hs.length) return;
      // переплёт: крестик в каждом окне 2×2
      const seen = new Set(); for (const [r, c] of hs) { const k = (r >> 1) + ':' + (c >> 1); if (seen.has(k)) continue; seen.add(k); }
      const groups = []; for (const [r, c] of hs) { let gg = groups.find(G => G.some(([rr, cc]) => Math.abs(rr - r) + Math.abs(cc - c) === 1)); if (gg) gg.push([r, c]); else groups.push([[r, c]]); }
      for (const G of groups) { const xs = G.map(([r, c]) => g.colX(c)), ys = G.map(([r]) => g.yOf(r)); const x0 = Math.min(...xs) - s * 0.5, x1 = Math.max(...xs) + s * 0.5, y0 = Math.min(...ys) - h * 0.55, y1 = Math.max(...ys) + h * 0.55;
        c2.strokeStyle = rgb(g.Yacc.cDark, 0.9); c2.lineWidth = Math.max(1.2, s * 0.12); c2.lineCap = 'round'; c2.beginPath(); c2.moveTo((x0 + x1) / 2, y0); c2.lineTo((x0 + x1) / 2, y1); c2.moveTo(x0, (y0 + y1) / 2); c2.lineTo(x1, (y0 + y1) / 2); c2.stroke();
        c2.strokeRect(x0, y0, x1 - x0, y1 - y0); } } },
    chimney: { pre(c2, g) { const s = g.s, c = g.W - 3, x = g.colX(c), yb = g.topY(c) + s * 0.9, yt = yb - s * 2.0, Y2 = g.Yacc;
      c2.save(); const gr = c2.createLinearGradient(x - s * 0.55, 0, x + s * 0.55, 0); gr.addColorStop(0, rgb(Y2.cDark)); gr.addColorStop(0.4, rgb(Y2.cLight)); gr.addColorStop(1, rgb(Y2.cDark));
      c2.fillStyle = gr; c2.fillRect(x - s * 0.55, yt, s * 1.1, yb - yt); c2.strokeStyle = rgb(Y2.cDark, 0.5); c2.lineWidth = 1; for (let k = 1; k < 4; k++) { c2.beginPath(); c2.moveTo(x - s * 0.55, yt + k * s * 0.45); c2.lineTo(x + s * 0.55, yt + k * s * 0.45); c2.stroke(); }
      c2.fillStyle = 'rgba(255,255,255,0.75)'; for (const [dx, dy, r] of [[0.2, -0.5, 0.32], [0.6, -1.0, 0.4], [1.1, -1.6, 0.48]]) { c2.beginPath(); c2.arc(x + dx * s, yt + dy * s, r * s, 0, 6.283); c2.fill(); } c2.restore(); } },
    stem_leaf: { post(c2, g) { const s = g.s, [x0, y0] = topCenter(g), x = g.cx, y = Math.max(y0, g.yTop) + s * 0.55; ST.yarnStroke(c2, [[x, y], [x + s * 0.08, y - s * 0.6], [x + s * 0.35, y - s * 1.2]], s * 0.26, BROWN, {}); leafShape(c2, x + s * 0.2, y - s * 0.75, s * 1.4, -0.45, GREEN); } },
    cherry_stems: { post(c2, g) { const s = g.s, xa = g.colX(3), xb = g.colX(g.W - 4), ya = g.topY(3) + s * 0.2, yb = g.topY(g.W - 4) + s * 0.2, xt = g.cx + s * 0.4, yt = g.yTop - s * 2.0;
      ST.yarnStroke(c2, [[xa, ya], [xa + s * 0.6, ya - s * 1.2], [xt, yt]], s * 0.18, GREEN, {}); ST.yarnStroke(c2, [[xb, yb], [xb - s * 0.4, yb - s * 1.1], [xt, yt]], s * 0.18, GREEN, {});
      leafShape(c2, xt, yt + s * 0.05, s * 1.5, -0.25, GREEN); } },
    fish_eye: { post(c2, g) { const s = g.s, y = g.yOf(Math.floor(g.H / 2) + 1), x = g.colX(2) + s * 0.2; knotDot(c2, x, y, s * 0.22, DARK);
      c2.save(); c2.strokeStyle = rgb(g.Ymain.cDark, 0.5); c2.lineWidth = Math.max(1, s * 0.1); c2.lineCap = 'round'; c2.beginPath(); c2.arc(g.colX(4) - s * 0.5, g.yOf(Math.floor(g.H / 2)), s * 1.4, -0.75, 0.75); c2.stroke();
      blush(c2, x + s * 0.4, y + s * 0.9, s * 0.38); c2.restore(); } },
    bubbles: { post(c2, g) { const s = g.s, x = g.padX - s * 0.2, y = g.yOf(Math.floor(g.H / 2) + 2); c2.save(); c2.lineWidth = Math.max(1, s * 0.07);
      for (const [dx, dy, r] of [[-0.2, -0.6, 0.22], [-0.6, -1.4, 0.3], [-0.2, -2.3, 0.38]]) { c2.strokeStyle = 'rgba(150,190,220,0.9)'; c2.fillStyle = 'rgba(235,246,255,0.5)'; c2.beginPath(); c2.arc(x + dx * s, y + dy * s, r * s, 0, 6.283); c2.fill(); c2.stroke();
        c2.fillStyle = 'rgba(255,255,255,0.9)'; c2.beginPath(); c2.arc(x + (dx - r * 0.35) * s, y + (dy - r * 0.35) * s, r * s * 0.25, 0, 6.283); c2.fill(); } c2.restore(); } },
    cherry_top: { post(c2, g) { const s = g.s, [x, y] = topCenter(g); ST.yarnStroke(c2, [[x, y - s * 0.3], [x + s * 0.15, y - s * 0.9], [x + s * 0.45, y - s * 1.25]], s * 0.12, BROWN, { shadow: false }); cherryBall(c2, x, y - s * 0.15, s * 0.58); } },
    waffle: { fab: true, post(c2, g) { const s = g.s; let ra = 0; for (let r = 0; r < g.H; r++) { let full = true; for (let c = 0; c < g.W; c++) {} } 
      const yT = g.yOf(6) - g.h * 0.5; c2.save(); c2.globalCompositeOperation = 'source-atop'; c2.beginPath(); c2.rect(g.padX - s, yT, g.W * s + 2 * s, g.castEdge - yT + s); c2.clip();
      c2.strokeStyle = 'rgba(120,70,40,0.42)'; c2.lineWidth = Math.max(1, s * 0.11); for (let k = -12; k < 12; k++) { c2.beginPath(); c2.moveTo(g.padX + k * s * 1.1, yT); c2.lineTo(g.padX + k * s * 1.1 + s * 6, yT + s * 6); c2.stroke(); c2.beginPath(); c2.moveTo(g.padX + k * s * 1.1, yT); c2.lineTo(g.padX + k * s * 1.1 - s * 6, yT + s * 6); c2.stroke(); }
      c2.restore(); } },
    gems: { post(c2, g) { const s = g.s, tips = [0, Math.floor(g.W / 2), g.W - 1], cols = [[246, 150, 176], [150, 200, 230], [170, 220, 190]];
      for (const c of tips) knotDot(c2, g.colX(c), g.topY(c) - s * 0.05, s * 0.3, [250, 214, 120]);
      [-1, 0, 1].forEach((k, i) => { const x = g.cx + k * s * 3, y = g.yOf(0) - g.h * 0.5; c2.save(); c2.beginPath(); c2.moveTo(x, y - s * 0.45); c2.lineTo(x + s * 0.38, y); c2.lineTo(x, y + s * 0.45); c2.lineTo(x - s * 0.38, y); c2.closePath();
        const gr = c2.createLinearGradient(x - s * 0.4, y - s * 0.4, x + s * 0.4, y + s * 0.4); gr.addColorStop(0, rgb(mix(cols[i], [255, 255, 255], 0.6))); gr.addColorStop(1, rgb(mix(cols[i], [60, 40, 60], 0.25))); c2.fillStyle = gr; c2.fill(); c2.strokeStyle = 'rgba(120,80,60,0.6)'; c2.lineWidth = 1; c2.stroke(); c2.restore(); }); } },
    face_dog: { post(c2, g) { face(c2, g, 'dog'); } },
    face_bunny: { post(c2, g) { face(c2, g, 'bunny'); } },
    face_bear: { post(c2, g) { face(c2, g, 'bear'); } },
  };
  DECO.hang_loop_l = DECO.hang_loop; DECO.tassel_bottom2 = DECO.tassel_bottom;

  /* Готовая вещь целиком: getE(r, c) → {code, kind, seed} | null (вне силуэта); ряды снизу вверх. */
  function render(def, getE0, castCode, s, h, dpr) {
    const getE = (r, c) => (r < 0 || r >= def.height || c < 0 || c >= def.width) ? null : getE0(r, c);
    const W = def.width, H = def.height, padX = 1.3 * s, padT = 2.3 * s, padB = 1.9 * s;
    const w = W * s + padX * 2, hh = padT + 0.4 * h + (H - 1) * h + 0.67 * h + h + padB;
    const tex = def.tex ? def.tex.map(r => r.trim().split(/\s+/)) : null;
    const none = (r, c) => !getE(r, c);
    const colX = (c) => padX + (c + 0.5) * s;
    const yOf = (r) => padT + 0.4 * h + (H - 1 - r) * h;
    const topRow = (c) => { for (let r = H - 1; r >= 0; r--) if (!none(r, c)) return r; return -1; };
    const botRow = (c) => { for (let r = 0; r < H; r++) if (!none(r, c)) return r; return H; };
    const castY = yOf(-1) + 0.67 * h - h * 0.45 + 0.45 * h;
    // частоты цветов: основной и акцент для отделки
    const freq = new Map(); for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const e = getE(r, c); if (e) { const k = e.code.split('@')[0]; freq.set(k, (freq.get(k) || 0) + 1); } }
    const byF = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const main = byF[0] || castCode, acc = byF[1] || main;
    // ряд «лица» у игрушек: середина самой широкой полосы
    const widths = []; for (let r = 0; r < H; r++) { let n = 0; for (let c = 0; c < W; c++) if (!none(r, c)) n++; widths.push(n); }
    const mx = Math.max(...widths); const wide = widths.map((n, r) => [n, r]).filter(([n]) => n >= mx * 0.85).map(x => x[1]);
    const faceR = wide.length ? (Math.min(...wide) + Math.max(...wide)) / 2 + 0.6 : H / 2;
    let botCenterCol = Math.floor(W / 2); { let lo = W, hi = -1; for (let c = 0; c < W; c++) if (!none(0, c)) { lo = Math.min(lo, c); hi = Math.max(hi, c); } if (hi >= 0) botCenterCol = Math.floor((lo + hi) / 2); }
    const g = { W, H, s, h, padX, padT, w, hh, colX, yOf, none, topRow, botRow, def,
      cx: padX + W * s / 2, yTop: Math.min(...[...Array(W).keys()].map(c => yOf(topRow(c)))) - 0.45 * h,
      topY: (c) => yOf(topRow(c)) - 0.45 * h, botY: (c) => yOf(botRow(c) - 1) + h * 0.35, castEdge: castY, botCenterCol,
      faceY: yOf(faceR), mainCode: main, dpr, Ymain: P.yarn(main), Yacc: P.yarn(acc), Ycast: P.yarn(castCode) };
    const deco = (def.deco || []).filter(d => DECO[d]);
    // контур из каталога — только для разметки внутренних деталей (швы, узелки); крепления — к вязаному краю
    if (deco.includes('outline')) { const cat = window.PETELKA_CATALOG, it = cat && cat.items.find(i => i.id === def.item), O = it && it.ol;
      if (O) { const top = yOf(H - 1) + 0.3 * h, bot = castY - 0.32 * h; g.olMap = ([px, py]) => [padX + px * s, top + (bot - top) * py / H]; } }
    const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(hh * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr); return [c, x]; };
    const [fab, x] = mk();
    const [pre, px] = mk(); for (const d of deco) if (DECO[d].pre) DECO[d].pre(px, g);
    for (let c = 0; c < W; c++) if (!none(0, c)) ST.drawSprite(x, colX(c), yOf(-1) - h * 0.45, s, h, castCode, 1 + (c * 13) % 4, dpr);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const e = getE(r, c); if (e) ST.drawSprite(x, colX(c), yOf(r), s, h, e.code, e.seed, dpr, e.kind); }
    drawCables(x, def, tex, getE, colX, yOf, s, h, () => true);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const e = getE(r, c); if (e && e.kind === 'b') ST.drawBobble(x, colX(c), yOf(r) + 0.42 * h, 0.4 * s, P.yarn(e.code), 1, e.seed); }
    edge(x, castY, P.yarn(castCode), padX, s, W, (c) => !none(0, c));
    // закрытые петли: по верхней петле каждой колонки
    for (let c = 0; c < W; c++) { const r = topRow(c); const e = getE(r, c); if (e) edge(x, yOf(r) + h * 0.05, P.yarn(e.code), padX, s, W, (cc) => cc === c); }
    for (const d of deco) if (DECO[d].post && DECO[d].fab) DECO[d].post(x, g, fab);
    const [full, fx] = mk();
    fx.drawImage(pre, 0, 0, w, hh); fx.drawImage(fab, 0, 0, w, hh);
    for (const d of deco) if (DECO[d].post && !DECO[d].fab) DECO[d].post(fx, g, fab);
    const [fabOnly, fo] = mk(); fo.drawImage(fab, 0, 0, w, hh);
    return { fabric: fabOnly, full, w, h: hh, ox: padX, oy: padT };
  }
  P.Items = { render, drawCables, cablePairs, DECO, pompom, button };
})();