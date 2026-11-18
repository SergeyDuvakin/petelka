/* Процедурная петля: одна непрерывная нить — левая ножка → головка (через спицу) → правая ножка.
   Рисуется ШТРИХОМ по длине пути (progress 0→1). Тело петли всегда непрозрачно (TA-1). */
(function () {
  const { rgb, mix, cubic, rng, clamp, hex } = P.U;
  const SEG = { legL: 14, head: 12, legR: 14 };

  // Геометрия: origin = нормальное положение центра головки; stretch поднимает головку (петля на спице)
  /* Виды петель (визуально; логика уровня от них не зависит):
     k — лицевая «V»; p — изнаночная (поперечный бугорок + «улыбка» снизу: платочная, резинка, путанка);
     b — шишечка (лицевая + объёмный шарик из витков); y — ажурная дырочка (накид: кольцо нити вокруг просвета);
     / и \ — петли косы (наклонённая вытянутая «V» с глубокой тенью). На спице все виды выглядят как петля. */
  const LOOPY = { k: 1, b: 1, '/': 1, '\\': 1 };
  function geometry(s, h, stretch, seed, kind) {
    if ((kind === 'p' || kind === 'c') && stretch < 0.3 * h) return purlGeometry(s, h, stretch, seed);
    if (kind === 'y' && stretch < 0.3 * h) return eyeletGeometry(s, h, stretch, seed);
    const r = rng(seed * 7919 + 13);
    const j = () => (r() - 0.5) * 0.035 * s;
    const yh = -stretch;
    // ножки: от низа (две «капли» почти касаются) вверх-наружу; головка — дуга через спицу
    const BL = [-0.075 * s + j() * 0.3, 1.2 * h];
    const BR = [0.075 * s + j() * 0.3, 1.2 * h];
    const LT = [-0.33 * s + j(), yh + 0.16 * h];
    const RT = [0.33 * s + j(), yh + 0.16 * h];
    const span = BL[1] - LT[1];
    const L1 = [-0.16 * s, BL[1] - span * 0.3];
    const L2 = [-0.4 * s + j(), LT[1] + span * 0.3];
    const R1 = [0.4 * s + j(), RT[1] + span * 0.3];
    const R2 = [0.16 * s, BR[1] - span * 0.3];
    const H1 = [-0.36 * s, yh - 0.3 * h];
    const H2 = [0.36 * s, yh - 0.3 * h];
    const pts = []; const seg = [];
    const push = (a, b, c, d, n, id, skipFirst) => {
      for (let i = skipFirst ? 1 : 0; i <= n; i++) { pts.push(cubic(a, b, c, d, i / n)); seg.push(id); }
    };
    push(BL, L1, L2, LT, SEG.legL, 0, false);
    push(LT, H1, H2, RT, SEG.head, 1, true);
    push(RT, R1, R2, BR, SEG.legR, 2, true);
    // сужение ножки к головке (без «шишек» на концах)
    const nl = SEG.legL, nh = SEG.head;
    for (let i = nl - 3; i <= nl; i++) seg[i] = 3;
    for (let i = nl + nh + 1; i <= nl + nh + 3; i++) seg[i] = 4;
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, seg, len, total: len[len.length - 1], LT, RT };
  }

  function finish(pts, seg) {
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, seg, len, total: len[len.length - 1] };
  }
  // изнаночная: нить идёт «улыбкой» снизу и возвращается поперечным бугорком сверху
  function purlGeometry(s, h, stretch, seed) {
    const r = rng(seed * 4241 + 5); const j = () => (r() - 0.5) * 0.04 * s; const yh = -stretch * 0.5;
    const pts = [], seg = [];
    const push = (a, b, c, d, n, id, skip) => { for (let i = skip ? 1 : 0; i <= n; i++) { pts.push(cubic(a, b, c, d, i / n)); seg.push(id); } };
    // «улыбка» (тоньше, в тени) и широкий пологий бугорок, перекрывающий соседей — ряд читается волной
    const A = [-0.36 * s, 0.7 * h + yh], B = [0.36 * s, 0.7 * h + yh];
    push(A, [-0.2 * s, 1.08 * h + yh], [0.2 * s, 1.08 * h + yh], B, 12, 5, false);
    const C = [0.56 * s + j(), 0.5 * h + yh], D = [-0.56 * s + j(), 0.5 * h + yh];
    push(B, [0.48 * s, 0.66 * h + yh], [0.56 * s, 0.6 * h + yh], C, 3, 4, true);
    push(C, [0.36 * s, 0.02 * h + yh + j()], [-0.36 * s, 0.02 * h + yh + j()], D, 16, 0, true);
    const g = finish(pts, seg); g.purl = true; return g;
  }
  // накид: кольцо нити вокруг просвета
  function eyeletGeometry(s, h, stretch, seed) {
    const pts = [], seg = []; const cy = 0.5 * h - stretch * 0.5, rx = 0.26 * s, ry = 0.36 * h;
    for (let i = 0; i <= 30; i++) { const a = Math.PI / 2 + i / 30 * Math.PI * 2 * 0.96; pts.push([Math.cos(a) * rx, cy + Math.sin(a) * ry]); seg.push(0); }
    const g = finish(pts, seg); g.hole = { cy, rx, ry }; return g;
  }
  // шишечка: объёмный шарик из витков, вырастает вслед за нитью
  function drawBobble(ctx, x, y, R, Y, k, seed) {
    if (k <= 0.01) return; const r = R * (0.35 + 0.65 * k); const q = rng(seed * 97 + 1);
    ctx.save();
    ctx.fillStyle = 'rgba(130,60,85,0.22)'; ctx.beginPath(); ctx.ellipse(x + r * 0.12, y + r * 0.32, r * 1.02, r * 0.86, 0, 0, 6.283); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.38, r * 0.08, x, y, r);
    g.addColorStop(0, rgb(Y.cLight)); g.addColorStop(0.6, rgb(Y.cBase)); g.addColorStop(1, rgb(Y.cDark));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = rgb(Y.cDark, 0.85); ctx.lineWidth = Math.max(0.8, r * 0.07); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * 0.97, 0, 6.283); ctx.clip(); ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = -0.9 + i * 0.36 + (q() - 0.5) * 0.2, ky = 0.35 + q() * 0.4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.98, r * ky, 0, 0.2, Math.PI - 0.2); ctx.strokeStyle = rgb(Y.cDark, 0.4); ctx.lineWidth = r * 0.2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -r * 0.03, r * 0.98, r * ky, 0, 0.35, Math.PI - 0.35); ctx.strokeStyle = rgb(mix(Y.cBase, Y.cLight, 0.55), 0.9); ctx.lineWidth = r * 0.1; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    const g2 = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x - r * 0.3, y - r * 0.4, r * 0.6);
    g2.addColorStop(0, 'rgba(255,255,255,0.35)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.strokeStyle = rgb(Y.cFuzz, 0.5); ctx.lineWidth = 0.7; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = q() * 6.283; const x0 = x + Math.cos(a) * r, y0 = y + Math.sin(a) * r; ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a + 0.4) * r * 0.22, y0 + Math.sin(a + 0.4) * r * 0.22); }
    ctx.stroke(); ctx.restore();
  }

  // нить произвольной формы тем же штрихом, что и петли (отделка, косы, шнуры, кисти)
  function smoothPath(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }
  function yarnStroke(ctx, pts, w, Y, o = {}) {
    if (pts.length < 2) return;
    ctx.save(); ctx.lineCap = o.cap || 'round'; ctx.lineJoin = 'round';
    const P_ = () => { ctx.beginPath(); smoothPath(ctx, pts); };
    if (o.shadow !== false) { ctx.save(); ctx.translate(w * 0.08, w * 0.18); P_(); ctx.strokeStyle = 'rgba(140,70,95,0.18)'; ctx.lineWidth = w * 1.1; ctx.stroke(); ctx.restore(); }
    const dk = o.dim ? mix(Y.cDark, [90, 50, 60], o.dim) : Y.cDark, bs = o.dim ? mix(Y.cBase, Y.cDark, o.dim * 1.4) : Y.cBase;
    P_(); ctx.strokeStyle = rgb(dk); ctx.lineWidth = w; ctx.stroke();
    P_(); ctx.strokeStyle = rgb(bs); ctx.lineWidth = w * 0.82; ctx.stroke();
    ctx.save(); ctx.translate(-w * 0.1, w * 0.08); P_(); ctx.strokeStyle = rgb(mix(bs, dk, 0.55), 0.4); ctx.lineWidth = w * 0.4; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(w * 0.1, -w * 0.08); P_(); ctx.strokeStyle = rgb(mix(bs, Y.cLight, o.dim ? 0.4 : 0.9)); ctx.lineWidth = w * 0.26; ctx.stroke(); ctx.restore();
    // скрутка
    ctx.setLineDash([w * 0.1, w * 0.26]); P_(); ctx.strokeStyle = rgb(dk, 0.3); ctx.lineWidth = w * 0.7; ctx.stroke(); ctx.setLineDash([]);
    if (Y.cFleck) { ctx.setLineDash([w * 0.08, w * 0.6, w * 0.15, w * 0.8]); P_(); ctx.strokeStyle = rgb(Y.cFleck, 0.6); ctx.lineWidth = w * 0.16; ctx.stroke(); ctx.setLineDash([]); }
    if (Y.lurex) { ctx.setLineDash([w * 0.14, w * 0.3]); P_(); ctx.strokeStyle = rgb(hex(Y.lurex[0]), 0.85); ctx.lineWidth = Math.max(0.7, w * 0.1); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }
  /* Коса (жгут): пара колонок «c c» на изнаночном фоне. Каждые 2 ряда — один перекрёст: задняя прядь (в тени)
     и передняя прядь крест-накрест, S-образно; соседние перекрёсты в одну сторону складываются в витой жгут. */
  function drawCablePair(ctx, cx, yB, s, h, Yf, Yb, part) {
    const yT = yB - 2 * h, w = 0.9 * s, dx = 0.47 * s;
    const pt = (x0, x1, t) => { const e = t * t * (3 - 2 * t); return [x0 + (x1 - x0) * e, yB + (yT - yB) * t]; };
    const strand = (x0, x1) => { const pts = []; for (let i = 0; i <= 12; i++) pts.push(pt(x0, x1, i / 12)); return pts; };
    ctx.save(); ctx.beginPath(); ctx.rect(cx - s * 1.1, part[1], s * 2.2, part[0] - part[1]); ctx.clip();
    // углубление по бокам жгута
    const gl = ctx.createLinearGradient(cx - s, 0, cx + s, 0); gl.addColorStop(0, 'rgba(110,50,75,0.22)'); gl.addColorStop(0.12, 'rgba(110,50,75,0)'); gl.addColorStop(0.88, 'rgba(110,50,75,0)'); gl.addColorStop(1, 'rgba(110,50,75,0.22)');
    ctx.fillStyle = gl; ctx.fillRect(cx - s, yT, 2 * s, 2 * h);
    yarnStroke(ctx, strand(cx + dx, cx - dx), w * 0.94, Yb, { dim: 0.3, shadow: false });
    // тень передней пряди на задней
    ctx.save(); ctx.translate(s * 0.06, h * 0.1); ctx.beginPath(); smoothPath(ctx, strand(cx - dx, cx + dx)); ctx.strokeStyle = 'rgba(110,50,75,0.25)'; ctx.lineWidth = w * 1.1; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    yarnStroke(ctx, strand(cx - dx, cx + dx), w, Yf, { shadow: false });
    // лицевые «V» по передней пряди — видно, что это вывязанные петли
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, s * 0.045);
    for (let i = 1; i < 6; i++) {
      const t = i / 6, [px, py] = pt(cx - dx, cx + dx, t), [qx, qy] = pt(cx - dx, cx + dx, t + 0.02);
      const ang = Math.atan2(qy - py, qx - px) + Math.PI / 2; const ux = Math.cos(ang), uy = Math.sin(ang), hw = w * 0.36, dy2 = h * 0.16;
      ctx.strokeStyle = rgb(Yf.cDark, 0.32); ctx.beginPath(); ctx.moveTo(px - ux * hw, py - uy * hw - dy2); ctx.lineTo(px, py); ctx.lineTo(px + ux * hw, py + uy * hw - dy2); ctx.stroke();
      ctx.strokeStyle = rgb(Yf.cLight, 0.5); ctx.beginPath(); ctx.moveTo(px - ux * hw * 0.8, py - uy * hw * 0.8 - dy2 - 1.2); ctx.lineTo(px, py - 1.2); ctx.stroke();
    }
    ctx.restore();
  }

  // ворсинки и блёстки (локальные, на нормальную геометрию)
  const extrasCache = new Map();
  function extras(s, h, seed, lurex, kind) {
    const key = s.toFixed(1) + '|' + seed + '|' + (lurex ? 1 : 0) + (kind || 'k');
    if (extrasCache.has(key)) return extrasCache.get(key);
    const g = geometry(s, h, 0, seed, kind); const r = rng(seed * 31 + 7);
    const hairs = [], fibers = [], sparks = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.04 + r() * 0.9; const idx = Math.floor(t * (g.pts.length - 2));
      if (g.seg[idx] === 1) continue;
      const a = g.pts[idx], b = g.pts[idx + 1];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const side = (g.seg[idx] === 0 || g.seg[idx] === 3) ? -1 : 1; // наружу
      const off = 0.21 * s * side;
      hairs.push({ t, x: a[0] + nx * off, y: a[1] + ny * off, dx: nx * side * (0.06 + r() * 0.07) * s + (r() - 0.5) * 0.05 * s, dy: ny * side * (0.05 + r() * 0.06) * s - r() * 0.03 * s });
    }
    for (let i = 0; i < 10; i++) {
      const t = r(); const idx = Math.floor(t * (g.pts.length - 2));
      if (g.seg[idx] === 1) continue;
      const a = g.pts[idx];
      fibers.push({ t, x: a[0] + (r() - 0.5) * 0.12 * s, y: a[1] + (r() - 0.5) * 0.08 * h, dx: (r() - 0.5) * 0.09 * s, dy: (r() - 0.5) * 0.11 * h });
    }
    if (lurex) for (let i = 0; i < 7; i++) {
      const t = 0.05 + r() * 0.9; const idx = Math.floor(t * (g.pts.length - 2));
      if (g.seg[idx] === 1) continue;
      const a = g.pts[idx];
      sparks.push({ t, x: a[0] + (r() - 0.5) * 0.14 * s, y: a[1] + (r() - 0.5) * 0.06 * h, r: 0.5 + r() * 0.9, ph: r() * 6.28, per: 2.2 + r() * 1.4, c: r() });
    }
    const e = { hairs, fibers, sparks }; extrasCache.set(key, e); return e;
  }

  // путь от длины a до длины b (в px), только сегменты id ∈ segs
  function tracePart(ctx, g, a, b, segs) {
    let started = false;
    for (let i = 0; i < g.pts.length - 1; i++) {
      if (!segs[g.seg[i + 1]]) { started = false; continue; }
      const l0 = g.len[i], l1 = g.len[i + 1];
      if (l1 < a || l0 > b) continue;
      const p0 = g.pts[i], p1 = g.pts[i + 1];
      const t0 = clamp((a - l0) / (l1 - l0 || 1), 0, 1), t1 = clamp((b - l0) / (l1 - l0 || 1), 0, 1);
      const x0 = p0[0] + (p1[0] - p0[0]) * t0, y0 = p0[1] + (p1[1] - p0[1]) * t0;
      const x1 = p0[0] + (p1[0] - p0[0]) * t1, y1 = p0[1] + (p1[1] - p0[1]) * t1;
      if (!started) { ctx.moveTo(x0, y0); started = true; }
      ctx.lineTo(x1, y1);
    }
  }

  // точка на пути по длине d (только внутри сегментов segs) + угол касательной
  function at(g, d, segs) {
    let i = 1; while (i < g.len.length && g.len[i] < d) i++;
    if (i >= g.len.length) return null; if (!segs[g.seg[i]]) return null;
    const p0 = g.pts[i - 1], p1 = g.pts[i]; const t = (d - g.len[i - 1]) / (g.len[i] - g.len[i - 1] || 1);
    return { x: p0[0] + (p1[0] - p0[0]) * t, y: p0[1] + (p1[1] - p0[1]) * t, a: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + Math.PI / 2 };
  }
  const LEGS = [true, false, true, false, false, false], HEAD = [false, true, false, false, false, false], TAPER = [false, false, false, true, true, false], SMILE = [false, false, false, false, false, true];
  /* o: {s,h,yarn,seed,progress,stretch,squash,thick,part:'body'|'headFront', start:0}
     progress — доля длины нити, start — откуда (для распускания тоже 0) */
  function draw(ctx, x, y, o) {
    const s = o.s, h = o.h, Y = o.yarn, kind = o.kind || 'k';
    const g = geometry(s, h, o.stretch || 0, o.seed, kind);
    const p = o.progress == null ? 1 : o.progress;
    if (p <= 0.001) return g;
    const L = g.total * p;
    const thick = (o.thick || 1) * (g.purl ? 0.9 : kind === 'y' && !g.LT ? 0.42 : 1);
    const wLeg = 0.44 * s * thick, wHead = 0.31 * s * thick;
    ctx.save();
    ctx.translate(x, y);
    // коса: петля наклонена и вытянута; на спице наклон уходит
    if ((kind === '/' || kind === '\\') && o.part !== 'headFront') {
      const f = clamp(1 - (o.stretch || 0) / (0.6 * h), 0, 1); const a = (kind === '/' ? -0.36 : 0.36) * f;
      ctx.translate(0, 0.45 * h); ctx.rotate(a); ctx.scale(1 - 0.1 * f, 1 + 0.1 * f); ctx.translate(0, -0.45 * h);
      if (f > 0.5) { ctx.fillStyle = 'rgba(120,55,80,0.16)'; ctx.beginPath(); ctx.ellipse((kind === '/' ? 0.22 : -0.22) * s, 0.55 * h, 0.2 * s, 0.6 * h, 0, 0, 6.283); ctx.fill(); }
    }
    // изнанка: углублённая «подложка» между бугорками (тень внутрь полотна), растёт вместе с нитью
    if (g.purl && o.part !== 'headFront' && o.part !== 'legs') {
      ctx.save(); ctx.globalAlpha = clamp(p * 1.5, 0, 1);
      const gg = ctx.createLinearGradient(0, 0.05 * h, 0, 1.15 * h); gg.addColorStop(0, rgb(mix(Y.cDark, Y.cBase, 0.35))); gg.addColorStop(1, rgb(mix(Y.cDark, [90, 50, 60], 0.18)));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.roundRect(-0.5 * s, 0.12 * h, s, 1.0 * h, 0.12 * s); ctx.fill(); ctx.restore();
    }
    // ажур: сначала просвет (тень в глубину полотна)
    if (g.hole && o.part !== 'headFront') {
      const hl = g.hole; const gg = ctx.createRadialGradient(0, hl.cy, 0, 0, hl.cy, hl.rx * 1.2);
      gg.addColorStop(0, 'rgba(92,40,62,0.55)'); gg.addColorStop(0.7, 'rgba(110,50,75,0.38)'); gg.addColorStop(1, 'rgba(110,50,75,0.05)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, hl.cy, hl.rx * 1.05, hl.ry * 1.05, 0, 0, 6.283); ctx.fill();
    }
    if (o.squash && o.squash !== 1) { ctx.translate(0, -(o.stretch || 0)); ctx.scale(1, o.squash); ctx.translate(0, (o.stretch || 0)); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const headFront = o.part === 'headFront';
    // головка рисуется до ножек: в полотне её прикрывают ножки
    const wTap = (wLeg + wHead) / 2;
    const passes = g.purl ? [[SMILE, wHead * 0.62], [TAPER, wTap * 0.8], [LEGS, wLeg]] : headFront ? [[HEAD, wHead]] : o.part === 'legs' ? [[TAPER, wTap], [LEGS, wLeg]] : (o.stretch > 0.3 * h ? [[LEGS, wLeg], [TAPER, wTap], [HEAD, wHead]] : [[HEAD, wHead], [TAPER, wTap], [LEGS, wLeg]]);
    if (!headFront) {
      ctx.save(); ctx.translate(0.03 * s, 0.075 * s);
      for (const [segs, w] of passes) {
        ctx.beginPath(); tracePart(ctx, g, 0, L, segs);
        ctx.strokeStyle = 'rgba(140,70,95,0.17)'; ctx.lineWidth = w * 1.12; ctx.stroke();
      }
      ctx.restore();
    }
    const layer = (fn) => { for (const [segs, w] of passes) fn(segs, w); };
    // слоями по всем частям: стыки ножка/сужение/головка не видны
    layer((segs, w) => { ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(Y.cDark); ctx.lineWidth = w; ctx.stroke(); });
    layer((segs, w) => { ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(Y.cBase); ctx.lineWidth = w * 0.84; ctx.stroke(); });
    ctx.save(); ctx.translate(-0.05 * s, 0.035 * s);
    layer((segs, w) => { ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(mix(Y.cBase, Y.cDark, 0.55), 0.4); ctx.lineWidth = w * 0.42; ctx.stroke(); });
    ctx.restore();
    ctx.save(); ctx.translate(0.045 * s, -0.035 * s);
    layer((segs, w) => { ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(mix(Y.cBase, Y.cLight, 0.9)); ctx.lineWidth = w * 0.3; ctx.stroke(); });
    ctx.restore();
    // скрутка: косые пряди поперёк нити (появляются вслед за штрихом)
    ctx.strokeStyle = rgb(Y.cDark, 0.22);
    layer((segs, w) => {
      ctx.lineWidth = Math.max(0.7, w * 0.085);
      ctx.beginPath();
      const step = w * 0.36;
      for (let d = step * 0.5; d < L; d += step) {
        const q = at(g, d, segs); if (!q) continue;
        const ca = Math.cos(q.a + 0.75), sa = Math.sin(q.a + 0.75), hw = w * 0.4;
        ctx.moveTo(q.x - ca * hw, q.y - sa * hw); ctx.lineTo(q.x + ca * hw, q.y + sa * hw);
      }
      ctx.stroke();
    });
    // меланж: вкрапления второго цвета в скрутке
    if (Y.cFleck) {
      ctx.save(); ctx.lineCap = 'round';
      layer((segs, w) => {
        // неравномерные короткие крапинки, приглушённые (не «строчка»)
        ctx.setLineDash([w * 0.08, w * 0.55, w * 0.16, w * 0.9, w * 0.05, w * 0.4]); ctx.lineDashOffset = (o.seed % 7) * w * 0.23;
        ctx.translate(0.03 * s, -0.02 * s);
        ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(Y.cFleck, 0.6); ctx.lineWidth = Math.max(0.7, w * 0.16); ctx.stroke();
        ctx.translate(-0.08 * s, 0.05 * s); ctx.lineDashOffset = w * (0.5 + (o.seed % 3) * 0.3);
        ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(mix(Y.cFleck, Y.cDark, 0.35), 0.4); ctx.lineWidth = Math.max(0.6, w * 0.11); ctx.stroke();
        ctx.translate(0.05 * s, -0.03 * s);
      });
      ctx.restore();
    }
    // люрекс: тонкая металлическая нить, вкрученная в пряжу
    if (Y.lurex) {
      ctx.save(); ctx.lineCap = 'round';
      layer((segs, w) => {
        ctx.setLineDash([w * 0.16, w * 0.3]);
        ctx.translate(0.02 * s, -0.01 * s);
        ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(hex(Y.lurex[0]), 0.9); ctx.lineWidth = Math.max(0.8, w * 0.1); ctx.stroke();
        ctx.translate(-0.06 * s, 0.03 * s); ctx.lineDashOffset = w * 0.22;
        ctx.beginPath(); tracePart(ctx, g, 0, L, segs); ctx.strokeStyle = rgb(hex(Y.lurex[1]), 0.8); ctx.lineWidth = Math.max(0.7, w * 0.08); ctx.stroke();
        ctx.translate(0.04 * s, -0.02 * s);
      });
      ctx.restore();
    }
    // 6. волокна и пух — отрастают вслед за нитью
    if (!headFront && o.part !== 'legs') {
      const e = extras(s, h, o.seed, !!Y.lurex, g.LT ? 'k' : kind);
      if (!(o.stretch > 0.5)) {
        ctx.lineWidth = Math.max(0.5, 0.012 * s);
        ctx.strokeStyle = rgb(Y.cLight, 0.55);
        ctx.beginPath();
        for (const f of e.fibers) if (f.t <= p) { ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + f.dx, f.y + f.dy); }
        ctx.stroke();
        const grow = clamp((o.fuzz == null ? 1 : o.fuzz), 0, 1);
        if (grow > 0) {
          ctx.strokeStyle = rgb(Y.cFuzz, 0.45); ctx.lineWidth = Math.max(0.5, 0.014 * s);
          ctx.beginPath();
          for (const hh of e.hairs) if (hh.t <= p) { ctx.moveTo(hh.x, hh.y); ctx.quadraticCurveTo(hh.x + hh.dx * 0.6 * grow, hh.y + hh.dy * 0.2, hh.x + hh.dx * grow, hh.y + hh.dy * grow); }
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    return g;
  }

  // атлас: целая петля (progress 1, stretch 0) на каждый цвет × 4 варианта
  const atlas = new Map();
  function sprite(s, h, code, seed, dpr, kind) {
    const v = seed; const key = code + v + (kind || 'k') + '|' + s.toFixed(2) + '|' + dpr;
    let c = atlas.get(key);
    if (!c) {
      c = document.createElement('canvas');
      const w = Math.ceil(s * 1.5), hh = Math.ceil(h * 2.25);
      c.width = Math.ceil(w * dpr); c.height = Math.ceil(hh * dpr);
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      draw(x, w / 2, h * 0.6, { s, h, yarn: P.yarn(code), seed: v, progress: 1, kind });
      c._ox = w / 2; c._oy = h * 0.6; c._w = w; c._h = hh;
      atlas.set(key, c);
    }
    return c;
  }
  function drawSprite(ctx, x, y, s, h, code, seed, dpr, kind) {
    const c = sprite(s, h, code, seed, dpr, kind);
    ctx.drawImage(c, x - c._ox, y - c._oy, c._w, c._h);
  }
  // петли, висящие на спице (растянутые), тоже из кэша: растяжение квантуется по 1.5 px
  const held = new Map();
  function drawHeldSprite(ctx, x, y, s, h, code, seed, stretch, dpr, kind) {
    const q = Math.round(stretch / 1.5) * 1.5;
    const key = code + seed + (kind || 'k') + '|' + q + '|' + s.toFixed(2) + '|' + dpr;
    let c = held.get(key);
    if (!c) {
      if (held.size > 600) held.clear();
      c = document.createElement('canvas');
      const w = Math.ceil(s * 1.5), hh = Math.ceil(h * 2.25 + q);
      c.width = Math.ceil(w * dpr); c.height = Math.ceil(hh * dpr);
      const x2 = c.getContext('2d'); x2.scale(dpr, dpr);
      draw(x2, w / 2, h * 0.6 + q, { s, h, yarn: P.yarn(code), seed, progress: 1, stretch: q, kind });
      c._ox = w / 2; c._oy = h * 0.6 + q; c._w = w; c._h = hh;
      held.set(key, c);
    }
    ctx.drawImage(c, x - c._ox, y - c._oy, c._w, c._h);
  }
  function clearAtlas() { atlas.clear(); extrasCache.clear(); held.clear(); }
  P.Stitch = { drawBobble, draw, yarnStroke, drawCablePair, smoothPath, geometry, extras, drawSprite, drawHeldSprite, clearAtlas };
})();
