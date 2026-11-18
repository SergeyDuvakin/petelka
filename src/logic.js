/* Логика уровня + решатель (DFS + memo). Вяжем справа налево (правша), строки снизу вверх. */
(function () {
  function parse(level) {
    const H = level.height, W = level.width;
    const rows = level.rows.map(r => r.trim().split(/\s+/)); // снизу вверх
    const cells = rows.map(r => r.map(t => {
      if (t === '-') return { none: true, any: false, opts: [] }; // вне силуэта: петли нет
      if (t === '?') return { any: true, opts: null };
      if (t.includes('/')) return { any: false, opts: t.split('/') };
      return { any: false, opts: [t] };
    }));
    return { W, H, cells };
  }
  class Level {
    constructor(def) {
      this.def = def; const p = parse(def);
      this.W = p.W; this.H = p.H; this.cells = p.cells;
      this.balls = def.balls.map(b => ({ code: b.color, amount: b.amount, max: b.amount }));
      this.row = 0; this.col = this.firstCol(0); // курсор (пропускает клетки вне силуэта)
      this.knit = []; for (let r = 0; r < this.H; r++) this.knit.push(new Array(this.W).fill(null));
      this.done = false; this.moves = 0; this.history = [];
    }
    firstCol(r) { let c = this.W - 1; while (c >= 0 && this.cells[r][c].none) c--; return c; }
    nextCol(r, c) { c--; while (c >= 0 && this.cells[r][c].none) c--; return c; }
    accepts(r, c, code) { const cell = this.cells[r][c]; return cell.any || cell.opts.includes(code); }
    current() { return this.done ? null : this.cells[this.row][this.col]; }
    tap(bi) {
      if (this.done) return { type: 'done' };
      const b = this.balls[bi];
      if (b.amount <= 0) return { type: 'empty', ball: bi };
      if (!this.accepts(this.row, this.col, b.code)) return { type: 'wrong', ball: bi, row: this.row, col: this.col };
      b.amount--; this.moves++;
      const r = this.row, c = this.col;
      this.knit[r][c] = b.code; this.history.push({ r, c, bi });
      const res = { type: 'stitch', ball: bi, row: r, col: c, code: b.code, rowDone: false, itemDone: false };
      this.col = this.nextCol(r, c);
      if (this.col < 0) { res.rowDone = true; this.row++; if (this.row >= this.H) { this.done = true; res.itemDone = true; } else this.col = this.firstCol(this.row); }
      return res;
    }
    // распустить: текущий ряд, а если он пуст — предыдущий
    unravel() {
      if (this.done) return null;
      let r = this.row; const out = { row: r, prevRow: false, stitches: [] };
      const inRow = this.history.length && this.history[this.history.length - 1].r === r;
      if (!inRow) { if (r === 0) return null; r = r - 1; out.prevRow = true; out.row = r; }
      // снимаем в обратном порядке (последняя связанная — первой)
      while (this.history.length && this.history[this.history.length - 1].r === r) {
        const h = this.history.pop(); this.balls[h.bi].amount++; this.knit[h.r][h.c] = null;
        out.stitches.push({ row: h.r, col: h.c, ball: h.bi, code: this.balls[h.bi].code });
      }
      this.row = r; this.col = this.firstCol(r);
      return out;
    }
    // решатель: можно ли довязать из текущего состояния; возвращает индекс клубка для подсказки
    solve() {
      // порядок петель не влияет на расход пряжи, поэтому выполнимость — условие Холла:
      // для любого набора клубков S петель, которые можно связать только из S, не больше, чем пряжи в S (n ≤ 5 → 32 набора)
      const W = this.W, H = this.H, n = this.balls.length, total = W * H, full = (1 << n) - 1;
      const amt = this.balls.map(b => b.amount); const codes = this.balls.map(b => b.code);
      const startIdx = this.row * W + (W - 1 - this.col);
      const cnt = new Array(1 << n).fill(0);
      for (let idx = startIdx; idx < total; idx++) {
        const r = (idx / W) | 0, c = W - 1 - (idx % W); const cell = this.cells[r][c]; if (cell.none) continue;
        let m = 0; for (let i = 0; i < n; i++) if (this.accepts(r, c, codes[i])) m |= 1 << i; cnt[m]++;
      }
      if (cnt[0] > 0) return { ok: false, hint: -1 };
      const feasible = () => { for (let S = 1; S <= full; S++) { let need = 0, have = 0; for (let m = 1; m <= full; m++) if ((m & S) === m) need += cnt[m]; for (let i = 0; i < n; i++) if (S >> i & 1) have += Math.max(0, amt[i]); if (need > have) return false; } return true; };
      if (this.done) return { ok: true, hint: -1 };
      const r = this.row, c = this.col; let m0 = 0; for (let i = 0; i < n; i++) if (this.accepts(r, c, codes[i])) m0 |= 1 << i;
      cnt[m0]--;
      // подсказка «мягкая»: из допустимых — клубок с бОльшим запасом
      const order = [...Array(n).keys()].sort((a, b) => amt[b] - amt[a]);
      for (const i of order) {
        if (amt[i] <= 0 || !(m0 >> i & 1)) continue;
        amt[i]--; const ok = feasible(); amt[i]++;
        if (ok) return { ok: true, hint: i };
      }
      return { ok: false, hint: -1 };
    }
  }
  P.Level = Level;
})();
