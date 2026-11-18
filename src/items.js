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

  const DECO = {
    fringe: { post(c2, g) { const Yc = g.Ycast, s = g.s; for (let i = 0; i < g.W * 2; i++) { const c = i >> 1; if (g.none(0, c)) continue; const x = g.padX + (i + 0.5) * s / 2, y = g.castEdge + s * 0.05, L = s * (0.95 + ((i * 37) % 7) / 30);
      const sw = ((i * 53) % 5 - 2) * s * 0.03; ST.yarnStroke(c2, [[x, y], [x + sw * 0.5, y + L * 0.5], [x + sw, y + L]], s * 0.15, Yc, { shadow: i % 2 === 0 }); ST.yarnStroke(c2, [[x + s * 0.06, y], [x + s * 0.06 - sw * 0.4, y + L * 0.55], [x + s * 0.05 - sw, y + L * 0.95]], s * 0.13, Yc, { shadow: false, dim: 0.14 }); } } },
    tassels4: { post(c2, g) { const s = g.s; tassel(c2, g.padX + s * 0.3, g.castEdge - s * 0.05, s * 1.2, g.Yacc, s, 3, 0.25); tassel(c2, g.padX + g.W * s - s * 0.3, g.castEdge - s * 0.05, s * 1.2, g.Yacc, s, 4, -0.25); } },
    tube: { fab: true, post(c2, g) { volume(c2, g, g.padX, g.yTop, g.padX + g.W * g.s, g.castEdge, 1.2, false); } },
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
    twist: { fab: true, post(c2, g) { // перекрут по центру: ткань стянута, узел — объёмная обмотка с перекрещенными складками
      const s = g.s, x = g.cx, y0 = g.yTop + g.h * 0.1, y1 = g.castEdge - g.h * 0.05, ym = (y0 + y1) / 2, Hh = y1 - y0, Yc = g.Ymain;
      c2.save(); c2.globalCompositeOperation = 'source-atop';
      const gp = c2.createLinearGradient(x - s * 2.6, 0, x + s * 2.6, 0); gp.addColorStop(0, 'rgba(120,50,80,0)'); gp.addColorStop(0.36, 'rgba(120,50,80,0.28)'); gp.addColorStop(0.5, 'rgba(120,50,80,0.4)'); gp.addColorStop(0.64, 'rgba(120,50,80,0.28)'); gp.addColorStop(1, 'rgba(120,50,80,0)');
      c2.fillStyle = gp; c2.fillRect(x - s * 2.6, y0 - s, s * 5.2, Hh + 2 * s);
      c2.strokeStyle = 'rgba(110,45,70,0.35)'; c2.lineWidth = Math.max(1, s * 0.07); c2.lineCap = 'round';
      for (const d of [-1, 1]) for (let k = -2; k <= 2; k++) { c2.beginPath(); c2.moveTo(x + d * s * 0.7, ym + k * Hh * 0.12); c2.quadraticCurveTo(x + d * s * 1.4, ym + k * Hh * 0.2, x + d * s * 2.1, ym + k * Hh * 0.3); c2.stroke(); }
      c2.restore();
      const kw = s * 0.9, kh = Hh * 0.82;
      c2.save(); c2.fillStyle = 'rgba(110,45,70,0.28)'; c2.beginPath(); c2.ellipse(x + s * 0.08, ym + s * 0.12, kw * 1.05, kh * 0.62, 0, 0, 6.283); c2.fill();
      const gr = c2.createLinearGradient(x - kw, 0, x + kw, 0); gr.addColorStop(0, rgb(Yc.cDark)); gr.addColorStop(0.35, rgb(Yc.cLight)); gr.addColorStop(0.62, rgb(Yc.cBase)); gr.addColorStop(1, rgb(Yc.cDark));
      c2.fillStyle = gr; c2.beginPath(); c2.ellipse(x, ym, kw, kh * 0.6, 0, 0, 6.283); c2.fill(); c2.restore();
      const w = s * 0.42;
      ST.yarnStroke(c2, [[x - kw * 0.85, ym - kh * 0.42], [x - kw * 0.1, ym - kh * 0.05], [x + kw * 0.85, ym + kh * 0.42]], w, Yc, { shadow: true });
      ST.yarnStroke(c2, [[x - kw * 0.85, ym + kh * 0.42], [x + kw * 0.1, ym + kh * 0.05], [x + kw * 0.85, ym - kh * 0.42]], w, Yc, { shadow: true, dim: 0.06 }); } },
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
    face_dog: { post(c2, g) { face(c2, g, 'dog'); } },
    face_bunny: { post(c2, g) { face(c2, g, 'bunny'); } },
    face_bear: { post(c2, g) { face(c2, g, 'bear'); } },
  };

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