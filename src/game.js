/* Петелька M0 — игра: раскладка, очередь анимаций вязания, UI, микропобеды. */
(function () {
  const { clamp, lerp, E, Spring, rgb, mix, hex, cubic } = P.U;
  const S = P.Scene, ST = P.Stitch, A = P.Audio, Y = P.YARN, TH = P.THEME;
  const qs = new URLSearchParams(location.search);
  const SPEED = parseFloat(qs.get('speed') || '1');
  const DBG = qs.has('debug');

  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const G = (window.__G = {
    W: 390, H: 844, dpr: 1, st: 0, sb: 0, now: 0, paused: false, manual: 0,
    levelIdx: 0, level: null, vis: null, queue: [], gate: 0, active: [],
    particles: new S.Particles(), banners: [], fps: [], lastTap: 0, firstTapDone: false,
    wardrobeCount: 0, wardrobeBump: new Spring(0, 260, 0.35), card: null, fade: 0, fadeT: null,
    deadEndAt: 0, deadEnd: false, hintBall: -1, wrongStreak: 0, stats: { taps: 0, wrong: 0 },
  });
  const LEVELS = qs.has('demo') && window.PETELKA_DEMO ? window.PETELKA_DEMO : window.PETELKA_LEVELS;
  const SAVE_KEY = qs.has('demo') ? 'petelka.demo' : 'petelka.m0';
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ level: G.levelIdx, wardrobe: G.wardrobeCount, sound: A.enabled })); } catch (e) {} };
  const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } };

  // ---------- раскладка ----------
  const bgImg = new Image(); bgImg.src = 'assets/img/bg_pastel.webp';
  const bgCv = document.getElementById('bg');
  function paintBg() { // фон на отдельном слое: не перерисовывается каждый кадр
    G.bg = S.makeBackground(bgImg, G.W, G.H, G.dpr);
    bgCv.width = G.bg.width; bgCv.height = G.bg.height; bgCv.style.width = G.W + 'px'; bgCv.style.height = G.H + 'px';
    bgCv.getContext('2d').drawImage(G.bg, 0, 0);
  }
  bgImg.onload = () => paintBg();
  function safeInsets() {
    const d = document.getElementById('safe'); const cs = getComputedStyle(d);
    return { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
  }
  function layout() {
    G.W = window.innerWidth; G.H = window.innerHeight; G.dpr = Math.min(window.devicePixelRatio || 1, G.dprCap || 2);
    cv.width = Math.round(G.W * G.dpr); cv.height = Math.round(G.H * G.dpr);
    cv.style.width = G.W + 'px'; cv.style.height = G.H + 'px';
    const si = safeInsets(); G.st = si.t; G.sb = si.b;
    paintBg();
    const bw = Math.min(G.W - 70, 320), bh = 86;
    G.basket = S.makeBasket(bw, bh, G.dpr);
    // вязание сверху, корзинка с клубками — внизу, в зоне большого пальца
    G.basket.x = (G.W - G.basket.W) / 2; G.basket.y = G.H - G.sb - 112;
    G.rimY = G.basket.y + G.basket.rimY;
    G.ctrlY = G.basket.y - 52; G.hintY = G.ctrlY - 54;
    G.ynTop = G.st + 172; G.fabBottom = G.hintY - 14;
    G.yn = G.ynTop;
    ST.clearAtlas();
    if (G.level) setupLevelGeometry();
  }
  // спицы с полотном держатся у середины свободной области: пока изделие короткое — ниже, потом плавно поднимаются
  function ynTarget(rows) { return G.ynTop + Math.max(0, (G.room - (rows + 2.4) * G.h) * 0.5); }
  function setupLevelGeometry() {
    const L = G.level; const W = L.W;
    const room = G.fabBottom - G.ynTop;
    G.s = Math.min((G.W - 56) / W, 54, room / (L.H + 1.9) / 0.78); G.h = G.s * 0.78;
    G.fx = (G.W - W * G.s) / 2;
    // небольшое изделие опускается к центру свободной области, клубок на ленте — над спицами
    G.room = room;
    G.yn = ynTarget(G.vis && G.vis._L === L ? Math.min(G.vis.row, L.H) : 0);
    if (G.ynS) G.ynS.snap(G.yn); else G.ynS = new Spring(G.yn, 26, 0.9);
    const n = L.balls.length; const bw = G.basket.W - G.basket.pad * 2;
    G.r0 = Math.min(31, bw / n / 2 - 5);
    G.ballPos = L.balls.map((b, i) => [G.basket.x + G.basket.pad + bw * (i + 0.5) / n, G.rimY - G.r0 * 0.28]);
  }

  // ---------- уровень ----------
  function startLevel(idx) {
    G.levelIdx = idx; const def = LEVELS[idx];
    G.level = new P.Level(def); setupLevelGeometry();
    const L = G.level;
    const castCode = L.balls.some(b => b.code === 'K') ? 'K' : L.balls[0].code;
    const seed = (r, c) => 1 + ((r * 7 + c * 13 + idx * 5) % 4);
    G.vis = {
      row: 0, col: L.col, st: [], cast: [], castCode, rowDoneT: [],
      amounts: L.balls.map(b => b.amount), radius: L.balls.map(() => new Spring(G.r0, 160, 0.7)),
      angle: L.balls.map(() => 0), shake: L.balls.map(() => 0), glow: L.balls.map(() => 0),
      seed, activeBall: 0, swap: null, wave: null, bounce: L.balls.map(() => new Spring(0, 320, 0.32)),
      sway: new Spring(0, 90, 0.35),
      Fy: new Spring(G.yn, 90, 0.78), xb: { from: G.fx + L.W * G.s, to: G.fx + L.W * G.s, t0: 0, dur: 0.001 },
      tip: { dx: 0, dy: 0 }, motifDone: false, motifGlow: null, cellPulse: 0, wrongCell: null,
      needlesOut: 0, item: null, _L: L,
    };
    for (let r = 0; r < L.H; r++) G.vis.st.push(new Array(L.W).fill(null));
    for (let c = 0; c < L.W; c++) G.vis.cast.push({ code: castCode, seed: seed(-1, c) });
    G.vis.radius.forEach((s, i) => s.snap(ballR(i)));
    G.tex = def.tex ? def.tex.map(r => r.trim().split(/\s+/)) : null;
    G.motifCells = [];
    if (def.motif) for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) { const cell = L.cells[r][c]; if (!cell.any && cell.opts.length === 1 && cell.opts[0] === def.motif.color) G.motifCells.push([r, c]); }
    G.rope = new S.Rope(18); G.queue = []; G.active = []; G.gate = 0; G.card = null;
    G.lastTap = G.now; G.deadEnd = false; G.deadEndAt = 0; G.wrongStreak = 0; G.stats = { taps: 0, wrong: 0 };
    G.hintBall = G.level.solve().hint;
    save();
  }
  // фактура: def.tex — ряды снизу вверх, по символу на петлю (k p b y / \\); по умолчанию лицевая
  const kindAt = (r, c) => { const t = G.tex; return t && t[r] && t[r][c] && t[r][c] !== '.' ? t[r][c] : 'k'; };
  const gradT = (r, c) => { const L = G.level; return (r * L.W + (L.W - 1 - c)) / Math.max(1, L.W * L.H - 1); };
  const ballR = (i) => { const v = G.vis, L = G.level; const a = v.amounts[i], m = L.balls[i].max; return a <= 0 ? G.r0 * 0.5 : G.r0 * (0.62 + 0.38 * Math.sqrt(a / m)); };
  const colX = (c) => G.fx + (c + 0.5) * G.s;
  const rowNormalY = (r) => G.vis.Fy.v - r * G.h;
  const xbNow = () => { const t = G.vis.xb; const k = clamp((G.now - t.t0) / t.dur, 0, 1); return lerp(t.from, t.to, E.inOutCubic(k)); };
  const setXb = (to, dur, t0 = G.now) => { G.vis.xb = { from: xbNow(), to, t0, dur }; };

  // ---------- ввод ----------
  function onTap(x, y) {
    A.unlock();
    if (!G.musicStarted && A.enabled) { G.musicStarted = true; A.startMusic(); }
    if (G.card) { const b = G.card.btn; if (G.card.shown > 0.6 && x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) nextLevel(); return; }
    if (G.vis.item) return;
    // звук
    if (Math.hypot(x - 32, y - (G.st + 36)) < 24) { A.setEnabled(!A.enabled); if (A.enabled && !G.musicStarted) { G.musicStarted = true; A.startMusic(); } save(); return; }
    // распустить
    const ub = unravelBtn(); if (x > ub.x - 6 && x < ub.x + ub.w + 6 && y > ub.y - 8 && y < ub.y + ub.h + 8) { doUnravel(); return; }
    // клубок
    let best = -1, bd = 1e9;
    G.ballPos.forEach((p, i) => { const d = Math.hypot(x - p[0], y - p[1]); if (d < G.r0 + 16 && d < bd) { bd = d; best = i; } });
    if (best >= 0) tapBall(best);
  }
  function tapBall(i) {
    const L = G.level; if (L.done || G.vis.item) return;
    G.lastTap = G.now; G.firstTapDone = true; G.stats.taps++;
    const res = L.tap(i);
    if (res.type === 'stitch') {
      G.wrongStreak = 0;
      G.queue.push({ type: 'stitch', ...res });
      if (res.rowDone) G.queue.push({ type: 'rowDone', row: res.row, itemDone: res.itemDone });
      if (res.itemDone) G.queue.push({ type: 'item' });
      const sol = L.solve(); G.hintBall = sol.hint;
      if (!sol.ok && !L.done) { G.deadEndAt = G.now + 1.5; } else { G.deadEndAt = 0; G.deadEnd = false; }
    } else if (res.type === 'wrong') {
      G.stats.wrong++; G.wrongStreak++;
      G.queue.push({ type: 'wrong', ...res });
    } else if (res.type === 'empty') {
      G.queue.push({ type: 'empty', ball: i });
    }
  }
  function doUnravel() {
    const L = G.level; const out = L.unravel(); if (!out) return;
    if (out.prevRow) G.queue.push({ type: 'rowUndo', row: out.row });
    for (const s of out.stitches) G.queue.push({ type: 'unknit', ...s });
    G.deadEnd = false; G.deadEndAt = 0; G.hintBall = L.solve().hint; G.lastTap = G.now;
    A.unravel();
  }

  // ---------- очередь ----------
  const durFor = (pending) => (pending <= 0 ? 0.26 : pending === 1 ? 0.16 : pending === 2 ? 0.12 : 0.08);
  function pump() {
    while (G.queue.length && G.now >= G.gate) {
      const it = G.queue.shift(); it.t0 = G.now; const v = G.vis;
      if (it.type === 'stitch') {
        const pending = G.queue.filter(q => q.type === 'stitch' || q.type === 'wrong').length;
        it.D = durFor(pending);
        const entry = { code: P.yarnAt(it.code, gradT(it.row, it.col)), kind: kindAt(it.row, it.col), seed: v.seed(it.row, it.col), t0: it.t0, D: it.D, anim: it };
        v.st[it.row][it.col] = entry; v.row = it.row; v.col = it.col;
        kickBall(it.ball);
        if (v.activeBall !== it.ball) { passColor(v.activeBall, it.ball); v.activeBall = it.ball; }
        G.gate = it.t0 + it.D * 0.79;
        it.flags = {};
      } else if (it.type === 'wrong') {
        it.D = 0.26; it.total = 0.62;
        kickBall(it.ball);
        if (v.activeBall !== it.ball) { passColor(v.activeBall, it.ball); it.prevBall = v.activeBall; v.activeBall = it.ball; }
        v.wrongCell = { c: it.col, t0: G.now }; it.flags = {};
        G.gate = it.t0 + 0.42;
      } else if (it.type === 'empty') {
        v.shake[it.ball] = 1; A.empty(); G.gate = G.now;
        continue;
      } else if (it.type === 'rowDone') {
        v.Fy.set(G.yn + (it.row + 1) * G.h); if (!it.itemDone) G.ynS.set(ynTarget(it.row + 1));
        setXb(G.fx + G.level.W * G.s, 0.42, G.now + 0.12);
        A.rowDone();
        if (!it.itemDone) banner('Ряд готов', 1.3);
        rowSparkle(it.row);
        v.rowDoneT[it.row] = G.now; v.row = it.row + 1; v.col = v.row < G.level.H ? G.level.firstCol(v.row) : -1;
        G.gate = it.t0 + 0.3;
      } else if (it.type === 'item') {
        v.item = { t0: G.now + 0.45 }; G.gate = 1e12;
      } else if (it.type === 'rowUndo') {
        v.Fy.set(G.yn + it.row * G.h); G.ynS.set(ynTarget(it.row));
        setXb(G.fx, 0.38);
        v.row = it.row; v.rowDoneT[it.row] = null; G.gate = it.t0 + 0.4;
      } else if (it.type === 'unknit') {
        const e = v.st[it.row][it.col]; if (e) { e.unknitT0 = G.now; }
        v.amounts[it.ball]++; v.angle[it.ball] -= 0.6;
        setXb(G.fx + (it.col + 1) * G.s, 0.12);
        v.row = it.row; v.col = it.col;
        G.gate = it.t0 + 0.085; A.slide();
      }
      G.active.push(it);
    }
  }
  // нажатый клубок подпрыгивает; если цвет другой — новый цвет бежит по нити от правого края к спице
  function kickBall(i) { G.vis.bounce[i].vel -= 120; }
  function passColor(from, to, quiet) {
    const v = G.vis; const code = G.level.balls[to].code, old = G.level.balls[from].code;
    v.swap = { from: old, to: code, t0: G.now };
    v.wave = { from: old, t0: G.now + (quiet ? 0 : 0.05) };
    v.sway.vel += 40;
  }
  function ballTop(i) { const p = G.ballPos[i]; return [p[0], p[1] - G.vis.radius[i].v * 0.15]; }

  // обновление активных анимаций (фазы A–E)
  function updateActive() {
    const v = G.vis; let tipDx = 0, tipDy = 0, wrap = null;
    for (const it of G.active) {
      const t = G.now - it.t0;
      if (it.type === 'stitch') {
        const p = t / it.D, f = it.flags, s = G.s;
        if (p < 0.15) { const k = E.outCubic(p / 0.15); tipDx = -0.5 * s * k; tipDy = 0.1 * G.h * k; }
        else if (p < 0.36) { tipDx = -0.5 * s; tipDy = 0.1 * G.h; wrap = (p - 0.15) / 0.21; }
        else if (p < 0.61) { const k = E.inOutCubic((p - 0.36) / 0.25); tipDx = lerp(-0.5 * s, -0.22 * s, k); tipDy = lerp(0.1 * G.h, -0.06 * G.h, k); }
        else if (p < 0.79) { const k = E.inOutCubic((p - 0.61) / 0.18); tipDx = lerp(-0.22 * s, 0, k); tipDy = lerp(-0.06 * G.h, 0, k); }
        if (p >= 0.15 && !f.click) { f.click = 1; A.click(1 + (it.col % 3) * 0.03); A.vibrate(6); }
        if (p >= 0.15 && !f.dec) { f.dec = 1; v.amounts[it.ball]--; A.rustle(); }
        if (p >= 0.61 && !f.slide) { f.slide = 1; setXb(G.fx + it.col * G.s, it.D * 0.18); }
        if (p >= 0.15 && p < 0.61) v.angle[it.ball] += 0.016 * (0.26 / it.D);
        if (p >= 1 && !f.fin) { f.fin = 1; onStitchSettled(it); }
        it.done = p >= 1.9;
      } else if (it.type === 'wrong') {
        const s = G.s; const p = t / it.D; const f = it.flags;
        if (p < 0.15) { const k = E.outCubic(p / 0.15); tipDx = -0.5 * s * k; tipDy = 0.1 * G.h * k; }
        else if (p < 0.36) { tipDx = -0.5 * s; tipDy = 0.1 * G.h; wrap = (p - 0.15) / 0.21; }
        else { const k = clamp((t - it.D * 0.5) / 0.3, 0, 1); tipDx = lerp(-0.5 * s, 0, E.inOutCubic(k)); tipDy = lerp(0.1 * G.h, 0, k); }
        if (p >= 0.36 && !f.snd) { f.snd = 1; A.wrong(); v.shake[it.ball] = 0.6; }
        if (t >= it.total && !f.fin) { f.fin = 1; if (it.prevBall != null) { passColor(v.activeBall, it.prevBall, true); v.activeBall = it.prevBall; } }
        it.done = t >= it.total + 0.05;
      } else if (it.type === 'unknit') {
        if (t > 0.2) { if (G.vis.st[it.row][it.col] && G.vis.st[it.row][it.col].unknitT0) G.vis.st[it.row][it.col] = null; it.done = true; }
      } else it.done = t > 1.2;
    }
    G.active = G.active.filter(a => !a.done);
    v.tip.dx = tipDx; v.tip.dy = tipDy; v.wrap = wrap;
  }
  function onStitchSettled(it) {
    const v = G.vis;
    if (G.motifCells.length && !v.motifDone) {
      const all = G.motifCells.every(([r, c]) => { const e = v.st[r][c]; return e && G.now >= e.t0 + e.D * 0.999; });
      if (all) { v.motifDone = true; v.motifGlow = { t0: G.now + 0.12 }; setTimeout(() => A.motif(), 120 / SPEED); setTimeout(() => banner('Узор проявился', 1.5), 160 / SPEED); }
    }
  }

  // ---------- эффекты ----------
  function banner(text, life) { G.banners.push({ text, t0: G.now, life }); }
  function rowSparkle(r) { G.sparkRow = { r, t0: G.now }; }

  // ---------- кадр ----------
  let lastT = performance.now();
  function frame(tms) {
    let dt = (tms - lastT) / 1000; lastT = tms;
    if (G.fpsOn) G.fps.push(dt);
    // адаптивное качество: если кадр стабильно > 22 мс — снижаем плотность пикселей до 1.5 (а потом 1.25)
    G.perf = (G.perf || []); G.perf.push(dt); if (G.perf.length > 120) G.perf.shift();
    if (G.perf.length === 120 && !document.hidden) { const avg = G.perf.reduce((a, b) => a + b, 0) / 120; if (avg > 0.022 && (G.dprCap || 2) > 1.25) { G.dprCap = (G.dprCap || 2) > 1.5 ? 1.5 : 1.25; G.perf = []; layout(); } }
    dt = Math.min(dt, 1 / 20);
    if (G.paused) { dt = G.manual; G.manual = 0; } else dt *= SPEED;
    step(dt);
    render();
    requestAnimationFrame(frame);
  }
  function step(dt) {
    G.now += dt; const v = G.vis; if (!v) return;
    pump(); updateActive();
    { const ny = G.ynS.step(dt); const d = ny - G.yn; G.yn = ny; v.Fy.v += d; v.Fy.t += d; }
    v.Fy.step(dt);
    for (let i = 0; i < G.level.balls.length; i++) {
      v.radius[i].set(ballR(i)); v.radius[i].step(dt);
      v.shake[i] = Math.max(0, v.shake[i] - dt * 2.2);
      const want = (G.hintOn && i === G.hintBall) ? 1 : 0; v.glow[i] += (want - v.glow[i]) * Math.min(1, dt * 5);
    }
    // подсказка по простою
    const idle = G.now - G.lastTap; const busy = G.queue.length || G.active.length;
    G.hintOn = !busy && !G.level.done && G.hintBall >= 0 && (idle > (G.levelIdx === 0 ? 4 : 6) || G.wrongStreak >= 3);
    if (G.deadEndAt && G.now > G.deadEndAt) { G.deadEnd = true; G.deadEndAt = 0; }
    G.particles.step(dt);
    G.wardrobeBump.step(dt);
    G.banners = G.banners.filter(b => G.now - b.t0 < b.life);
    if (v.item) stepItem(dt);
    if (G.card) G.card.shown = Math.min(1, G.card.shown + dt * 3);
    if (G.fadeT != null) { G.fadeT += dt; const k = G.fadeT / 0.5; G.fade = k < 0.5 ? E.inOutSine(k * 2) : 1 - E.inOutSine((k - 0.5) * 2); if (k >= 0.5 && !G.fadeSwapped) { G.fadeSwapped = true; G.fadeSwap(); } if (k >= 1) { G.fadeT = null; G.fade = 0; } }
    // нить
    const end = yarnEnd();
    // нить уходит за правый край экрана; при каждом обороте вокруг спицы — лёгкий рывок (конец подтягивается)
    if (v.wrap != null && !v._tug) { v._tug = 1; v.sway.vel += 55; }
    if (v.wrap == null) v._tug = 0;
    v.sway.step(dt); v.bounce.forEach(b => b.step(dt));
    const start = [G.W + 24 - v.sway.v * 0.6, G.yn - 70 - v.sway.v * 0.3];
    G.rope.step(dt || 0.0001, start, end, 0.045);
  }
  function rightTip() { const v = G.vis; return [xbNow() - 0.1 * G.s + v.tip.dx - v.needlesOut * 260, G.yn + v.tip.dy]; }
  function yarnEnd() {
    const v = G.vis, tip = rightTip(), s = G.s;
    if (v.wrap != null) { const a = -Math.PI / 2 + v.wrap * Math.PI * 2; return [tip[0] + 0.1 * s + Math.cos(a) * 0.2 * s, tip[1] + Math.sin(a) * 0.22 * s]; }
    return [tip[0] + 0.14 * s, tip[1] + 0.22 * G.h];
  }

  // ---------- отрисовка ----------
  function render() {
    const W = G.W, H = G.H; ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!G.vis) return;
    drawTop();
    drawBasket();
    drawHintBar();
    drawControls();
    drawFabricAndNeedles();
    drawYarn();
    G.particles.draw(ctx);
    drawBanners();
    drawGhost();
    if (G.vis.item) drawItem();
    if (G.card) drawCard();
    if (G.fade > 0) { ctx.fillStyle = `rgba(255,244,246,${G.fade})`; ctx.fillRect(0, 0, W, H); }
  }

  function text(t, x, y, size, color, font = 'Nunito', weight = 700, align = 'center') {
    ctx.font = `${weight} ${size}px ${font === 'Marck' ? '"Marck Script", cursive' : 'Nunito, system-ui, sans-serif'}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(t, x, y);
  }
  function pill(x, y, w, h, fill, edge) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2);
    ctx.fillStyle = fill; ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); }
  }
  const panelCache = new Map();
  function panel(x, y, w, h, r = 18) { // мягкая тень дорогая — панель кэшируется по размеру
    const key = Math.round(w) + 'x' + Math.round(h) + 'r' + r + '@' + G.dpr; let c = panelCache.get(key); const m = 24;
    if (!c) {
      c = document.createElement('canvas'); c.width = (w + m * 2) * G.dpr; c.height = (h + m * 2) * G.dpr;
      const x2 = c.getContext('2d'); x2.scale(G.dpr, G.dpr);
      x2.save(); x2.shadowColor = 'rgba(150,90,110,0.18)'; x2.shadowBlur = 14; x2.shadowOffsetY = 4;
      x2.beginPath(); x2.roundRect(m, m, w, h, r); x2.fillStyle = 'rgba(255,247,249,0.86)'; x2.fill(); x2.restore();
      x2.beginPath(); x2.roundRect(m + 0.5, m + 0.5, w - 1, h - 1, r); x2.strokeStyle = 'rgba(232,180,196,0.55)'; x2.lineWidth = 1; x2.stroke();
      panelCache.set(key, c);
    }
    ctx.drawImage(c, x - m, y - m, w + m * 2, h + m * 2);
  }

  function drawTop() {
    const st = G.st, W = G.W;
    ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 10;
    text('Петелька', W / 2, st + 36, 36, '#9A5F73', 'Marck', 400);
    ctx.restore();
    text(`${G.level.def.id}. ${G.level.def.name}`, W / 2, st + 70, 15, TH.textSoft, 'Nunito', 700);
    // звук
    const sx = 32, sy = st + 36;
    ctx.beginPath(); ctx.arc(sx, sy, 19, 0, 6.283); ctx.fillStyle = 'rgba(255,247,249,0.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(232,180,196,0.6)'; ctx.stroke();
    ctx.strokeStyle = '#B07488'; ctx.fillStyle = '#B07488'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx + 4, sy - 8); ctx.lineTo(sx + 4, sy + 4); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(sx, sy + 5, 4.2, 3.2, -0.4, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx + 4, sy - 8); ctx.quadraticCurveTo(sx + 10, sy - 6, sx + 9, sy - 1); ctx.stroke();
    if (!A.enabled) { ctx.strokeStyle = '#B07488'; ctx.beginPath(); ctx.moveTo(sx - 9, sy - 9); ctx.lineTo(sx + 10, sy + 10); ctx.stroke(); }
    // шкаф (вешалка)
    const wx = W - 34, wy = st + 36, bump = G.wardrobeBump.v;
    ctx.save(); ctx.translate(wx, wy); ctx.scale(1 + bump * 0.18, 1 + bump * 0.18);
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, 6.283); ctx.fillStyle = 'rgba(255,247,249,0.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(232,180,196,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#B07488'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -6, 3.2, Math.PI, Math.PI * 2.4); ctx.moveTo(0, -2.5); ctx.lineTo(-11, 6); ctx.lineTo(11, 6); ctx.closePath(); ctx.stroke();
    ctx.restore();
    if (G.wardrobeCount > 0) { ctx.beginPath(); ctx.arc(wx + 15, wy - 14, 9, 0, 6.283); ctx.fillStyle = '#EE9BB2'; ctx.fill(); text(String(G.wardrobeCount), wx + 15, wy - 13.5, 11, '#fff', 'Nunito', 800); }
  }

  // ---------- рабочая нить: от кончика спицы за правый край экрана ----------
  function drawYarn() {
    const v = G.vis, L = G.level; if (!v || v.item) return;
    // новый цвет «бежит» по нити от правого края к спице светлой бусиной
    const ry = P.yarn(P.yarnAt(L.balls[v.activeBall].code, gradT(Math.min(v.row, L.H - 1), Math.max(0, v.col)))), rw = Math.max(2.8, G.s * 0.08), n = G.rope.n;
    if (v.wave) {
      const k = clamp((G.now - v.wave.t0) / 0.2, 0, 1); const m = Math.round(E.outCubic(k) * (n - 1));
      G.rope.draw(ctx, P.yarn(P.yarnAt(v.wave.from, 0.5)), rw);
      if (m >= 1) G.rope.draw(ctx, ry, rw, 0, m, false);
      const p = G.rope.p[Math.min(n - 1, m)];
      if (k < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 10); g.addColorStop(0, 'rgba(255,246,240,0.85)'); g.addColorStop(0.45, rgb(ry.cLight, 0.5)); g.addColorStop(1, 'rgba(255,245,240,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], 10, 0, 6.283); ctx.fill(); ctx.restore(); }
      if (k >= 1) v.wave = null;
    } else G.rope.draw(ctx, ry, rw);
  }

  function drawBasket() {
    const b = G.basket, v = G.vis, L = G.level;
    ctx.drawImage(b.back, b.x, b.y, b.W, b.H);
    for (let i = 0; i < L.balls.length; i++) {
      const [x0, y0] = G.ballPos[i]; const r = v.radius[i].v;
      const sh = v.shake[i] > 0 ? Math.sin(G.now * 50) * 4 * v.shake[i] : 0;
      const bob = Math.sin(G.now * 1.3 + i * 1.7) * 0.6;
      const cy = y0 + (G.r0 - r) * 0.55 + bob + Math.min(0, v.bounce[i].v) * 0.12;
      // свечение подсказки — мягкий ореол за клубком
      if (v.glow[i] > 0.01) {
        const pulse = 0.65 + 0.35 * Math.sin(G.now * 4);
        const g = ctx.createRadialGradient(x0, cy, r * 0.6, x0, cy, r * 1.8);
        g.addColorStop(0, rgb(TH.glow, 0.75 * v.glow[i] * pulse)); g.addColorStop(1, rgb(TH.glow, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x0, cy, r * 1.8, 0, 6.283); ctx.fill();
      }
      const ball = (G.balls || (G.balls = {}))[L.def.id + ':' + i] || (G.balls[L.def.id + ':' + i] = new S.Ball(L.balls[i].code, i + 3 + L.def.id * 7));
      ball.draw(ctx, x0 + sh, cy, r, v.angle[i], v.amounts[i] <= 0 ? 0.55 : 0, G.dpr, G.now);
    }
    ctx.drawImage(b.front, b.x, b.y, b.W, b.H);
    // бирки с количеством
    for (let i = 0; i < L.balls.length; i++) {
      const [x0] = G.ballPos[i]; const y = G.rimY + 30; const a = v.amounts[i];
      const w = 40, h = 22;
      ctx.save(); ctx.shadowColor = 'rgba(90,50,40,0.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1.5;
      pill(x0 - w / 2, y - h / 2, w, h, a > 0 ? 'rgba(255,248,250,0.95)' : 'rgba(240,230,232,0.9)'); ctx.restore();
      ctx.beginPath(); ctx.arc(x0 - w / 2 + 10, y, 5, 0, 6.283); ctx.fillStyle = Y[L.balls[i].code].base; ctx.fill();
      ctx.strokeStyle = Y[L.balls[i].code].dark; ctx.lineWidth = 1; ctx.stroke();
      text(String(a), x0 + 6, y + 0.5, 14, a > 0 ? TH.text : 'rgba(110,74,87,0.4)', 'Nunito', 800);
    }
  }

  function drawHintBar() {
    const L = G.level, v = G.vis; if (v.row >= L.H) return;
    const s = G.s, y = G.hintY, h = 44;
    panel(G.fx - 8, y, L.W * s + 16, h, 16);
    const r = v.row;
    for (let c = 0; c < L.W; c++) {
      const cell = L.cells[r][c]; const x = colX(c), cy = y + h / 2;
      if (cell.none) { ctx.beginPath(); ctx.arc(x, cy, 2, 0, 6.283); ctx.fillStyle = 'rgba(176,116,136,0.25)'; ctx.fill(); continue; }
      const e = v.st[r][c]; const knitted = e && G.now >= e.t0 + e.D * 0.61;
      const isCur = !knitted && c === nextVisCol();
      const k = 0.36;
      if (isCur) {
        const pulse = 0.5 + 0.5 * Math.sin(G.now * 3.2);
        ctx.beginPath(); ctx.roundRect(x - s * 0.44, y + 4, s * 0.88, h - 8, 10);
        ctx.fillStyle = `rgba(255,214,226,${0.45 + pulse * 0.25})`; ctx.fill();
        ctx.strokeStyle = `rgba(236,150,176,${0.55 + pulse * 0.35})`; ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (v.wrongCell && v.wrongCell.c === c && G.now - v.wrongCell.t0 < 0.6) {
        const t = (G.now - v.wrongCell.t0) / 0.6; ctx.save(); ctx.translate(Math.sin(t * 30) * 3 * (1 - t), 0);
        ctx.beginPath(); ctx.roundRect(x - s * 0.44, y + 4, s * 0.88, h - 8, 10); ctx.strokeStyle = `rgba(232,120,140,${1 - t})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = knitted ? 0.28 : 1;
      if (cell.any) {
        ctx.setLineDash([2.5, 3]); ctx.strokeStyle = 'rgba(176,116,136,0.7)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x - s * 0.18, cy - 9); ctx.quadraticCurveTo(x - s * 0.16, cy + 4, x, cy + 10); ctx.quadraticCurveTo(x + s * 0.16, cy + 4, x + s * 0.18, cy - 9); ctx.stroke();
        ctx.setLineDash([]); text('?', x, cy - 1, 13, 'rgba(160,100,120,0.9)', 'Nunito', 800);
      } else if (cell.opts.length > 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(x - s * 0.5, cy - 16, s * 0.5, 34); ctx.clip();
        ST.draw(ctx, x, cy - 6, { s: s * k * 1.6, h: G.h * k * 1.6, yarn: Y[cell.opts[0]], seed: 1, progress: 1, part: 'legs', kind: kindAt(r, c) }); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(x, cy - 16, s * 0.5, 34); ctx.clip();
        ST.draw(ctx, x, cy - 6, { s: s * k * 1.6, h: G.h * k * 1.6, yarn: Y[cell.opts[1]], seed: 1, progress: 1, part: 'legs', kind: kindAt(r, c) }); ctx.restore();
      } else {
        ST.draw(ctx, x, cy - 6, { s: s * k * 1.6, h: G.h * k * 1.6, yarn: Y[cell.opts[0]], seed: 1, progress: 1, part: 'legs', kind: kindAt(r, c) });
      }
      if (knitted) { ctx.restore(); ctx.save(); ctx.strokeStyle = 'rgba(176,116,136,0.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - 5, cy + 1); ctx.lineTo(x - 1, cy + 5); ctx.lineTo(x + 6, cy - 4); ctx.stroke(); }
      ctx.restore();
    }
  }
  function nextVisCol() { const L = G.level, v = G.vis, r = v.row; for (let c = L.W - 1; c >= 0; c--) { if (L.cells[r][c].none) continue; const e = v.st[r] && v.st[r][c]; if (!e || e.unknitT0) return c; } return -1; }

  function unravelBtn() { return { x: 18, y: G.ctrlY, w: 128, h: 34 }; }
  function drawControls() {
    const L = G.level, v = G.vis, b = unravelBtn();
    const can = L.history.length > 0 && !L.done;
    const pulse = G.deadEnd ? 0.5 + 0.5 * Math.sin(G.now * 5) : 0;
    ctx.save();
    if (G.deadEnd) { ctx.shadowColor = `rgba(240,140,170,${0.5 + pulse * 0.5})`; ctx.shadowBlur = 10 + pulse * 10; }
    pill(b.x, b.y, b.w, b.h, can ? 'rgba(255,247,249,0.9)' : 'rgba(255,247,249,0.55)', 'rgba(232,180,196,0.7)');
    ctx.restore();
    const col = can ? TH.text : 'rgba(110,74,87,0.35)';
    // значок ↺
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(b.x + 20, b.y + b.h / 2, 7, -0.3, Math.PI * 1.45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x + 27, b.y + b.h / 2 - 7); ctx.lineTo(b.x + 27.5, b.y + b.h / 2 - 1.5); ctx.lineTo(b.x + 22, b.y + b.h / 2 - 2.5); ctx.stroke();
    text('Распустить', b.x + 36, b.y + b.h / 2 + 0.5, 14, col, 'Nunito', 700, 'left');
    const rr = Math.min(v.row + 1, L.H);
    text(`Ряд ${rr} из ${L.H}`, G.W - 20, b.y + b.h / 2, 14, TH.textSoft, 'Nunito', 700, 'right');
    if (G.deadEnd) {
      const y = b.y - 2; panel(G.W / 2 - 150, G.hintY - 50, 300, 38, 14);
      text('Кажется, пряжи не хватит. Можно распустить ряд', G.W / 2, G.hintY - 31, 12.5, TH.text, 'Nunito', 700);
    }
  }

  // состояние петли (r,c): растяжение (на спице), прогресс прорисовки, сплющивание
  function stitchState(r, c, e) {
    const v = G.vis; const normal = r < 0 ? v.Fy.v + G.h * 0.55 : rowNormalY(r);
    const above = r + 1 < G.level.H ? v.st[r + 1][c] : null;
    let stretch = 0, squash = 1, held = false, live = false;
    const hold = normal - G.yn;
    const capped = r + 1 < G.level.H && G.level.cells[r + 1][c].none; // выше — край силуэта: петля закрывается, когда довязан следующий ряд
    if (capped) {
      const dt0 = v.rowDoneT[r + 1];
      if (dt0 == null) { stretch = hold * (v.item ? 1 - E.outCubic(v.needlesOut) : 1); held = true; }
      else { const k = clamp((G.now - dt0) / 0.3, 0, 1); stretch = hold * (1 - E.outCubic(k)); held = k < 0.35; if (k < 1) live = true; const t2 = (G.now - dt0 - 0.3) / 0.45; if (t2 > 0 && t2 < 1) { squash = 1 + 0.08 * E.wobble(t2, 1.5); live = true; } }
    } else if (!above) { stretch = hold * (v.item ? 1 - E.outCubic(v.needlesOut) : 1); held = true; }
    else if (above.unknitT0) { const f = clamp((G.now - above.unknitT0) / 0.18, 0, 1); stretch = hold * E.outCubic(f); held = f > 0.5; live = true; }
    else {
      const ds = above.t0 + above.D * 0.79; const dd = Math.max(above.D * 0.21, 0.11);
      if (G.now < ds) { stretch = hold; held = true;
        // натяжение, когда спица входит в петлю (фаза A–C)
        const pa = (G.now - above.t0) / above.D; if (pa > 0 && pa < 0.61) stretch += 0.06 * G.h * Math.sin(Math.PI * pa / 0.61);
      } else {
        const k = clamp((G.now - ds) / dd, 0, 1); stretch = hold * (1 - E.outCubic(k));
        const t2 = (G.now - ds) / 0.45; if (t2 < 1) { squash = 1 + 0.08 * E.wobble(t2, 1.5); live = true; }
        if (k < 1) live = true;
      }
    }
    let progress = 1, offY = 0, fuzz = 1;
    if (e && e.t0 != null) {
      const p = (G.now - e.t0) / e.D;
      if (p < 0.36) progress = 0; else if (p < 0.61) { const k = (p - 0.36) / 0.25; progress = E.outCubic(k); offY = (1 - E.outCubic(k)) * 0.28 * G.h; }
      if (p < 1.6) { live = true; fuzz = clamp((p - 0.79) / 0.6, 0, 1); }
    }
    if (e && e.unknitT0) { const f = clamp((G.now - e.unknitT0) / 0.17, 0, 1); progress = 1 - E.inCubic(f); live = true; }
    if (Math.abs(stretch) > 0.4) live = true;
    const animating = (e && e.t0 != null && (G.now - e.t0) / e.D < 1.6) || (e && e.unknitT0) || squash !== 1;
    return { y: normal, stretch, squash, held, live, progress, offY, fuzz, animating };
  }

  function drawFabricAndNeedles() {
    const L = G.level, v = G.vis, s = G.s, h = G.h;
    if (v.item && v.item.snap) return; // ткань уже снята и летит
    const heads = []; const out = v.needlesOut;
    const drawOne = (r, c, e) => {
      const stt = stitchState(r, c, e); const x = colX(c);
      if (stt.progress <= 0) return;
      const Yc = P.yarn(e.code);
      if (!stt.live) ST.drawSprite(ctx, x, stt.y, s, h, e.code, e.seed, G.dpr, e.kind);
      else if (!stt.animating && stt.progress >= 1) ST.drawHeldSprite(ctx, x, stt.y, s, h, e.code, e.seed, stt.stretch, G.dpr, e.kind);
      else ST.draw(ctx, x, stt.y + stt.offY, { s, h, yarn: Yc, seed: e.seed, progress: stt.progress, stretch: stt.stretch, squash: stt.squash, fuzz: stt.fuzz, kind: e.kind });
      if (Yc.lurex && stt.stretch < 1 && G.lurexOn !== false) {
        const ex = ST.extras(s, h, e.seed, true);
        S.drawSparks(ctx, ex.sparks.filter(p => p.t <= stt.progress).map(p => ({ x: x + p.x, y: stt.y + stt.offY + p.y, ph: p.ph, per: p.per, r: p.r })), G.now, Yc.lurex, s / 40);
      }
      if (stt.held && stt.progress >= 1) heads.push({ x, y: stt.y, e, stretch: stt.stretch, c });
    };
    // снизу вверх: новые ряды перекрывают головки старых
    for (let c = 0; c < L.W; c++) if (!L.cells[0][c].none) drawOne(-1, c, v.cast[c]);
    drawEdge(ctx, v.Fy.v + G.h * 0.55 + G.h * 1.12, Y[v.castCode], G.fx, G.s, 1e9, (c) => !L.cells[0][c].none);
    // закрытые петли по краю силуэта — косая кромка над ними
    for (let r = 0; r < L.H - 1; r++) for (let c = 0; c < L.W; c++) if (L.cells[r + 1][c].none && !L.cells[r][c].none && v.st[r][c] && v.rowDoneT[r + 1] != null && G.now - v.rowDoneT[r + 1] > 0.2) capEdge(r, c);
    for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) { const e = v.st[r][c]; if (e) drawOne(r, c, e); }
    // шишечки — отдельным проходом поверх соседних рядов (иначе их прикрывают ножки ряда выше)
    if (G.tex) for (let r = 0; r < L.H; r++) for (let c = 0; c < L.W; c++) {
      const e = v.st[r][c]; if (!e || e.kind !== 'b') continue; const stt = stitchState(r, c, e); if (stt.stretch > 0.5 * h) continue;
      const k = e.t0 != null ? clamp(((G.now - e.t0) / e.D - 0.6) / 0.5, 0, 1) : 1;
      ST.drawBobble(ctx, colX(c), stt.y + stt.offY + 0.42 * h, 0.4 * s, P.yarn(e.code), e.unknitT0 ? stt.progress : E.outBack(k), e.seed);
    }
    // ошибочная петля: вытягивается наполовину и распускается обратно (без исчезновения)
    for (const it of G.active) if (it.type === 'wrong') {
      const t = G.now - it.t0, t1 = it.D * 0.36; if (t < t1) continue;
      let pr; const u = t - t1;
      if (u < 0.13) pr = 0.5 * E.outCubic(u / 0.13); else if (u < 0.19) pr = 0.5; else pr = 0.5 * (1 - E.inOutCubic(clamp((u - 0.19) / 0.22, 0, 1)));
      if (pr > 0.01) ST.draw(ctx, colX(it.col) + Math.sin(u * 40) * 1.2 * (u > 0.13 ? 1 : 0), rowNormalY(it.row) + (0.5 - pr) * 0.3 * G.h, { s, h, yarn: P.yarn(P.yarnAt(it.code || G.level.balls[it.ball].code, gradT(it.row, it.col))), kind: kindAt(it.row, it.col), seed: 2, progress: pr });
    }
    // закрытие петель: кромка «бежит» справа налево, пока спицы выходят
    if (v.item) { const k = clamp((G.now - v.item.t0 - 0.05) / 0.45, 0, 1); if (k > 0) { const top = topCode(L.H - 1); drawEdge(ctx, rowNormalY(L.H - 1) + G.h * 0.05, P.yarn(top), G.fx, G.s, Math.ceil(k * L.W * 2), (c) => !L.cells[L.H - 1][c].none); } }
    // мерцание узора
    if (v.motifGlow) drawMotifGlow();
    if (G.sparkRow) drawRowSparkle();
    // спицы
    const xb = xbNow(), Ln = L.W * s + 170, nw = Math.max(7, s * 0.19);
    const lt = [xb + 0.1 * s - out * 260, G.yn - 1];
    const rt = rightTip();
    if (out < 1) {
      S.drawNeedle(ctx, lt[0] - Ln, G.yn + 16, lt[0], lt[1] + 1, nw);
      // головки на левой спице поверх неё
      for (const hd of heads) if (hd.x > xb) ST.draw(ctx, hd.x, hd.y, { s, h, yarn: P.yarn(hd.e.code), seed: hd.e.seed, stretch: hd.stretch, part: 'headFront' });
      S.drawNeedle(ctx, rt[0] + Ln + out * 520, G.yn + 20, rt[0], rt[1] - 5, nw);
      for (const hd of heads) if (hd.x <= xb) ST.draw(ctx, hd.x, hd.y, { s, h, yarn: P.yarn(hd.e.code), seed: hd.e.seed, stretch: hd.stretch, part: 'headFront' });
    }
  }
  // наборный / закрытый край: косой жгут из наклонных «зёрен»
  function topCode(r) { const row = G.vis.st[r]; for (const e of row) if (e) return e.code; return 'K'; }
  function capEdge(r, c) { const e = G.vis.st[r][c]; const stt = stitchState(r, c, e); drawEdge(ctx, stt.y + G.h * 0.05 - stt.stretch, P.yarn(e.code), G.fx, G.s, 1e9, (cc) => cc === c); }
  function drawEdge(c2, y, Yc, x0 = G.fx, s = G.s, count = 1e9, keep = null) {
    const L = G.level, n = L.W * 2;
    c2.save();
    for (let i = Math.max(0, n - count); i < n; i++) {
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
    c2.restore();
  }

  function drawMotifGlow() {
    const v = G.vis, t = G.now - v.motifGlow.t0; if (t < 0) return; if (t > 1.6) { v.motifGlow = null; return; }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    G.motifCells.forEach(([r, c], i) => {
      const tt = t - i * 0.05; if (tt < 0) return;
      const a = Math.sin(Math.PI * clamp(tt / 1.0, 0, 1));
      const x = colX(c), y = rowNormalY(r) + G.h * 0.45;
      const g = ctx.createRadialGradient(x, y, 1, x, y, G.s * 0.9);
      g.addColorStop(0, rgb(TH.glow, 0.55 * a)); g.addColorStop(1, rgb(TH.glow, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, G.s * 0.9, 0, 6.283); ctx.fill();
      if (tt < 0.02) G.particles.burst(x, y, 3, { col: [255, 230, 238], speed: 30, life: 0.9, r: 1.6, g: -10, star: true });
    });
    ctx.restore();
  }
  function drawRowSparkle() {
    const sp = G.sparkRow, t = (G.now - sp.t0) / 0.7; if (t > 1) { G.sparkRow = null; return; }
    const L = G.level; const x = lerp(G.fx + L.W * G.s, G.fx, E.inOutSine(t)); const y = G.yn + G.h * 0.4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 1, x, y, G.s * 0.8); g.addColorStop(0, 'rgba(255,240,230,0.7)'); g.addColorStop(1, 'rgba(255,240,230,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, G.s * 0.8, 0, 6.283); ctx.fill(); ctx.restore();
    if (Math.random() < 0.7) G.particles.burst(x, y + (Math.random() - 0.5) * G.h, 1, { col: [255, 236, 226], speed: 25, life: 0.8, r: 1.5, g: 20, star: Math.random() < 0.3 });
  }

  function drawBanners() {
    for (const b of G.banners) {
      const t = (G.now - b.t0) / b.life;
      const a = t < 0.15 ? E.outCubic(t / 0.15) : t > 0.75 ? 1 - E.inCubic((t - 0.75) / 0.25) : 1;
      const y = G.hintY - 28 - E.outCubic(Math.min(1, t * 2)) * 8;
      const sc = 0.9 + 0.1 * E.outBack(Math.min(1, t / 0.2));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(G.W / 2, y); ctx.scale(sc, sc);
      ctx.font = '400 26px "Marck Script", cursive'; const w = ctx.measureText(b.text).width + 40;
      panel(-w / 2, -21, w, 42, 21);
      text(b.text, 0, 1, 26, '#A0607A', 'Marck', 400);
      ctx.restore();
    }
  }

  function drawGhost() {
    if (G.levelIdx !== 0 || G.firstTapDone || G.now < 1.2 || G.hintBall < 0) return;
    const [x, y] = G.ballPos[G.hintBall]; const t = (G.now - 1.2) % 1.6 / 1.6;
    const press = t < 0.35 ? E.inOutSine(t / 0.35) : t < 0.55 ? 1 : 1 - E.inOutSine((t - 0.55) / 0.45);
    const fx = x + 18, fy = y + 22 + 14 * (1 - press);
    if (press > 0.8) { const rr = (t - 0.35) * 120; ctx.beginPath(); ctx.arc(x, y, G.r0 * 0.6 + rr * 0.3, 0, 6.283); ctx.strokeStyle = `rgba(255,255,255,${0.6 - rr / 50})`; ctx.lineWidth = 2; ctx.stroke(); }
    // мягкая «точка касания»: опускается и расходится кругами
    ctx.save();
    const dotR = 9 + 3 * (1 - press);
    ctx.shadowColor = 'rgba(160,90,110,0.35)'; ctx.shadowBlur = 8 * (1 - press) + 2; ctx.shadowOffsetY = 5 * (1 - press);
    ctx.beginPath(); ctx.arc(x + 4, y + 4 - 6 * (1 - press), dotR, 0, 6.283); ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.25 * press})`; ctx.fill();
    ctx.restore();
  }

  // ---------- изделие готово ----------
  function snapshotFabric() {
    const L = G.level, s = G.s, h = G.h; const pad = 12;
    const w = L.W * s + pad * 2, hh = (L.H + 1) * h + h + pad * 2;
    const c = document.createElement('canvas'); c.width = w * G.dpr; c.height = hh * G.dpr;
    const x = c.getContext('2d'); x.scale(G.dpr, G.dpr);
    const yOf = (r) => pad + h * 0.4 + (L.H - 1 - r) * h;
    for (let cc = 0; cc < L.W; cc++) ST.drawSprite(x, pad + (cc + 0.5) * s, yOf(-1) - h * 0.45, s, h, G.vis.cast[cc].code, G.vis.cast[cc].seed, G.dpr);
    for (let r = 0; r < L.H; r++) for (let cc = 0; cc < L.W; cc++) { const e = G.vis.st[r][cc]; ST.drawSprite(x, pad + (cc + 0.5) * s, yOf(r), s, h, e.code, e.seed, G.dpr, e.kind); }
    for (let r = 0; r < L.H; r++) for (let cc = 0; cc < L.W; cc++) { const e = G.vis.st[r][cc]; if (e.kind === 'b') ST.drawBobble(x, pad + (cc + 0.5) * s, yOf(r) + 0.42 * h, 0.4 * s, P.yarn(e.code), 1, e.seed); }
    drawEdge(x, yOf(-1) + h * 0.55 + h * 1.12 - h, G.vis.castCode ? Y[G.vis.castCode] : Y.K, pad, s);
    drawEdge(x, yOf(L.H - 1) + h * 0.05, P.yarn(G.vis.st[L.H - 1][0].code), pad, s);
    // бахрома для шарфа
    if (L.def.item === 'scarf') {
      const fr = Y[G.vis.castCode];
      for (let cc = 0; cc < L.W * 2; cc++) {
        const fx = pad + (cc + 0.5) * s / 2, fy = yOf(-1) + h * 0.75;
        x.strokeStyle = rgb(fr.cDark); x.lineWidth = 3.2; x.beginPath(); x.moveTo(fx, fy); x.quadraticCurveTo(fx + 2, fy + 8, fx + (cc % 2 ? 2 : -1), fy + 14); x.stroke();
        x.strokeStyle = rgb(fr.cBase); x.lineWidth = 2; x.stroke();
      }
    }
    c._w = w; c._h = hh; c._fy = yOf(L.H - 1) - h * 0.4 - pad + (G.yn - (G.vis.Fy.v - (L.H - 1) * h));
    return c;
  }
  function stepItem(dt) {
    const it = G.vis.item, v = G.vis; const t = G.now - it.t0; if (t < 0) return;
    if (!it.started) { it.started = true; A.slide(); }
    v.needlesOut = E.inCubic(clamp(t / 0.5, 0, 1));
    if (t > 0.55 && !it.snap) {
      it.snap = snapshotFabric(); A.whoosh();
      it.x0 = G.fx - 12; it.y0 = G.yn - G.h * 0.4 - 12;
    }
    if (t > 1.95 && !it.landed) {
      it.landed = true; G.wardrobeCount++; G.wardrobeBump.vel = 9; A.itemDone();
      G.particles.burst(G.W - 34, G.st + 36, 18, { col: [255, 236, 242], speed: 70, life: 0.9, r: 2, g: 30, star: true });
      save();
    }
    if (t > 2.35 && !G.card) openCard(it.snap);
  }
  function drawItem() {
    const it = G.vis.item; if (!it.snap) { return; }
    const t = G.now - it.t0 - 0.55; const c = it.snap;
    const tx = G.W - 34, ty = G.st + 36;
    let x = it.x0, y = it.y0, sc = 1, rot = 0, fold = 0, lift = 0;
    if (t < 0.3) { lift = E.outCubic(t / 0.3); }
    else if (t < 0.7) { lift = 1; fold = E.inOutCubic((t - 0.3) / 0.4); }
    else if (t < 1.4) {
      lift = 1; fold = 1; const k = E.inOutCubic((t - 0.7) / 0.7);
      const p0 = [it.x0 + c._w / 2, it.y0 + c._h / 4], p3 = [tx, ty];
      const p = cubic(p0, [p0[0] - 40, p0[1] - 160], [tx - 60, ty + 40], p3, k);
      x = p[0] - c._w / 2; y = p[1] - c._h / 4; sc = lerp(1, 0.07, E.outQuad((t - 0.7) / 0.7)); rot = Math.sin(k * Math.PI) * 0.25;
    } else return;
    ctx.save();
    const cx = x + c._w / 2, cy = y + c._h / 4;
    ctx.translate(cx, cy - lift * 14); ctx.rotate(rot); ctx.scale(sc * (1 + lift * 0.03), sc * (1 + lift * 0.03));
    ctx.translate(-c._w / 2, -c._h / 4);
    ctx.shadowColor = 'rgba(120,60,80,0.28)'; ctx.shadowBlur = 8 + lift * 14; ctx.shadowOffsetY = 4 + lift * 10;
    const half = c._h / 2;
    // верхняя половина
    ctx.drawImage(c, 0, 0, c.width, c.height / 2, 0, 0, c._w, half);
    // нижняя половина складывается вверх (сжатие по Y + затемнение)
    const fh = half * Math.cos(fold * Math.PI * 0.98);
    if (fh > 0.5) ctx.drawImage(c, 0, c.height / 2, c.width, c.height / 2, 0, half, c._w, fh);
    else {
      // изнанка сложенной половины — та же ткань, чуть темнее (тонировка только по непрозрачным пикселям)
      if (!c._dark) { const d = document.createElement('canvas'); d.width = c.width; d.height = c.height / 2; const dx = d.getContext('2d'); dx.drawImage(c, 0, c.height / 2, c.width, c.height / 2, 0, 0, d.width, d.height); dx.globalCompositeOperation = 'source-atop'; dx.fillStyle = 'rgba(150,80,105,0.22)'; dx.fillRect(0, 0, d.width, d.height); c._dark = d; }
      ctx.save(); ctx.translate(0, half); ctx.scale(1, -1);
      ctx.drawImage(c._dark, 0, 0, c._w, -fh);
      ctx.restore();
    }
    ctx.restore();
  }
  function openCard(snap) {
    const L = G.level; const last = G.levelIdx >= LEVELS.length - 1;
    const w = G.W - 56, h = 400, x = 28, y = (G.H - h) / 2;
    G.card = { snap, shown: 0, x, y, w, h, last, btn: { x: x + 40, y: y + h - 70, w: w - 80, h: 50 } };
  }
  function drawCard() {
    const c = G.card, k = E.outCubic(c.shown); const L = G.level;
    ctx.fillStyle = `rgba(110,60,80,${0.22 * k})`; ctx.fillRect(0, 0, G.W, G.H);
    ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 30);
    panel(c.x, c.y, c.w, c.h, 26);
    text('Готово!', G.W / 2, c.y + 40, 34, '#A0607A', 'Marck', 400);
    text(L.def.name, G.W / 2, c.y + 74, 17, TH.text, 'Nunito', 800);
    const sn = c.snap; const maxW = c.w - 90, maxH = 180; const sc = Math.min(maxW / sn._w, maxH / sn._h);
    const iw = sn._w * sc, ih = sn._h * sc;
    ctx.save(); ctx.shadowColor = 'rgba(120,60,80,0.22)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
    ctx.drawImage(sn, G.W / 2 - iw / 2, c.y + 96 + (maxH - ih) / 2, iw, ih); ctx.restore();
    text(`${G.stats.taps - G.stats.wrong} петель · ${G.level.history.length >= 0 ? 'на полке «' + (L.def.item === 'mitten' ? 'Варежки' : 'Шарфы') + '»' : ''}`, G.W / 2, c.y + 296, 14, TH.textSoft, 'Nunito', 700);
    const b = c.btn;
    ctx.save(); ctx.shadowColor = 'rgba(220,120,150,0.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, '#F7B9CA'); g.addColorStop(1, '#EC97AE');
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 25); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    text(c.last ? 'Сначала' : 'Дальше', G.W / 2, b.y + b.h / 2 + 1, 19, '#fff', 'Nunito', 800);
    if (c.last) text('Это все уровни прототипа M0', G.W / 2, c.y + 318, 12.5, TH.textSoft, 'Nunito', 700);
    ctx.restore();
  }
  function nextLevel() {
    const nxt = G.card.last ? 0 : G.levelIdx + 1;
    G.fadeT = 0; G.fadeSwapped = false; G.fadeSwap = () => { G.card = null; startLevel(nxt); };
  }

  // ---------- запуск ----------
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(e.clientX, e.clientY); }, { passive: false });
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', layout);
  const saved = load();
  if (saved && saved.sound === false) A.setEnabled(false);
  if (saved) G.wardrobeCount = saved.wardrobe || 0;
  let startIdx = saved ? clamp(saved.level | 0, 0, LEVELS.length - 1) : 0;
  if (qs.get('level')) startIdx = clamp(parseInt(qs.get('level'), 10) - 1, 0, LEVELS.length - 1);
  layout(); startLevel(startIdx);
  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('400 30px "Marck Script"', 'Петелька'), document.fonts.load('700 14px Nunito', 'Ряд')]) : Promise.resolve();
  fontsReady.catch(() => {}).then(() => { G.fontsReady = true; });
  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(frame); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !qs.has('nosw')) navigator.serviceWorker.register('sw.js').catch(() => {});

  // ---------- отладочные хуки ----------
  window.__petelka = {
    G, tap: (i) => tapBall(i), hint: () => G.level.solve().hint, unravel: doUnravel,
    state: () => ({ dpr: G.dpr, level: G.level.def.id, row: G.level.row, col: G.level.col, done: G.level.done, amounts: G.level.balls.map(b => b.amount), vis: G.vis.amounts.slice(), queue: G.queue.length, active: G.active.length, card: !!G.card, wardrobe: G.wardrobeCount }),
    ballPos: () => G.ballPos.map(p => [p[0], p[1]]), next: () => G.card && nextLevel(), cardBtn: () => G.card && G.card.btn,
    pause: (v) => { G.paused = v; }, advance: (ms) => { G.manual = ms / 1000; },
    fpsStart: () => { G.fps = []; G.fpsOn = true; }, fpsStop: () => { G.fpsOn = false; const a = G.fps.slice(2); const avg = a.reduce((x, y) => x + y, 0) / a.length; const sorted = a.slice().sort((x, y) => x - y); return { frames: a.length, avgFps: 1 / avg, p95ms: sorted[Math.floor(a.length * 0.95)] * 1000, worstMs: sorted[a.length - 1] * 1000 }; },
    goto: (n) => startLevel(n - 1),
  };
})();
