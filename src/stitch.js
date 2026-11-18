/* Процедурная петля: одна непрерывная нить — левая ножка → головка (через спицу) → правая ножка.
   Рисуется ШТРИХОМ по длине пути (progress 0→1). Тело петли всегда непрозрачно (TA-1). */
(function () {
  const { rgb, mix, cubic, rng, clamp, hex } = P.U;
  const SEG = { legL: 14, head: 12, legR: 14 };

  // Геометрия: origin = нормальное положение центра головки; stretch поднимает головку (петля на спице)
  function geometry(s, h, stretch, seed) {
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

  // ворсинки и блёстки (локальные, на нормальную геометрию)
  const extrasCache = new Map();
  function extras(s, h, seed, lurex) {
    const key = s.toFixed(1) + '|' + seed + '|' + (lurex ? 1 : 0);
    if (extrasCache.has(key)) return extrasCache.get(key);
    const g = geometry(s, h, 0, seed); const r = rng(seed * 31 + 7);
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
  const LEGS = [true, false, true, false, false], HEAD = [false, true, false, false, false], TAPER = [false, false, false, true, true];
  /* o: {s,h,yarn,seed,progress,stretch,squash,thick,part:'body'|'headFront', start:0}
     progress — доля длины нити, start — откуда (для распускания тоже 0) */
  function draw(ctx, x, y, o) {
    const s = o.s, h = o.h, Y = o.yarn;
    const g = geometry(s, h, o.stretch || 0, o.seed);
    const p = o.progress == null ? 1 : o.progress;
    if (p <= 0.001) return g;
    const L = g.total * p;
    const thick = (o.thick || 1);
    const wLeg = 0.44 * s * thick, wHead = 0.31 * s * thick;
    ctx.save();
    ctx.translate(x, y);
    if (o.squash && o.squash !== 1) { ctx.translate(0, -(o.stretch || 0)); ctx.scale(1, o.squash); ctx.translate(0, (o.stretch || 0)); }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const headFront = o.part === 'headFront';
    // головка рисуется до ножек: в полотне её прикрывают ножки
    const wTap = (wLeg + wHead) / 2;
    const passes = headFront ? [[HEAD, wHead]] : o.part === 'legs' ? [[TAPER, wTap], [LEGS, wLeg]] : (o.stretch > 0.3 * h ? [[LEGS, wLeg], [TAPER, wTap], [HEAD, wHead]] : [[HEAD, wHead], [TAPER, wTap], [LEGS, wLeg]]);
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
      const e = extras(s, h, o.seed, !!Y.lurex);
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
  function sprite(s, h, code, seed, dpr) {
    const v = seed; const key = code + v + '|' + s.toFixed(2) + '|' + dpr;
    let c = atlas.get(key);
    if (!c) {
      c = document.createElement('canvas');
      const w = Math.ceil(s * 1.5), hh = Math.ceil(h * 2.25);
      c.width = Math.ceil(w * dpr); c.height = Math.ceil(hh * dpr);
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      draw(x, w / 2, h * 0.6, { s, h, yarn: P.YARN[code], seed: v, progress: 1 });
      c._ox = w / 2; c._oy = h * 0.6; c._w = w; c._h = hh;
      atlas.set(key, c);
    }
    return c;
  }
  function drawSprite(ctx, x, y, s, h, code, seed, dpr) {
    const c = sprite(s, h, code, seed, dpr);
    ctx.drawImage(c, x - c._ox, y - c._oy, c._w, c._h);
  }
  // петли, висящие на спице (растянутые), тоже из кэша: растяжение квантуется по 1.5 px
  const held = new Map();
  function drawHeldSprite(ctx, x, y, s, h, code, seed, stretch, dpr) {
    const q = Math.round(stretch / 1.5) * 1.5;
    const key = code + seed + '|' + q + '|' + s.toFixed(2) + '|' + dpr;
    let c = held.get(key);
    if (!c) {
      if (held.size > 600) held.clear();
      c = document.createElement('canvas');
      const w = Math.ceil(s * 1.5), hh = Math.ceil(h * 2.25 + q);
      c.width = Math.ceil(w * dpr); c.height = Math.ceil(hh * dpr);
      const x2 = c.getContext('2d'); x2.scale(dpr, dpr);
      draw(x2, w / 2, h * 0.6 + q, { s, h, yarn: P.YARN[code], seed, progress: 1, stretch: q });
      c._ox = w / 2; c._oy = h * 0.6 + q; c._w = w; c._h = hh;
      held.set(key, c);
    }
    ctx.drawImage(c, x - c._ox, y - c._oy, c._w, c._h);
  }
  function clearAtlas() { atlas.clear(); extrasCache.clear(); held.clear(); }
  P.Stitch = { draw, geometry, extras, drawSprite, drawHeldSprite, clearAtlas };
})();
