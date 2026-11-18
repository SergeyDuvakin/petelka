/* Логика уровня + решатель (DFS + memo). Вяжем справа налево (правша), строки снизу вверх. */
(function () {
  function parse(level) {
    const H = level.height, W = level.width;
    const rows = level.rows.map(r => r.trim().split(/\s+/)); // снизу вверх
    const cells = rows.map(r => r.map(t => {
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
      this.row = 0; this.col = this.W - 1; // курсор
      this.knit = []; for (let r = 0; r < this.H; r++) this.knit.push(new Array(this.W).fill(null));
      this.done = false; this.moves = 0; this.history = [];
    }
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
      this.col--;
      if (this.col < 0) { res.rowDone = true; this.row++; this.col = this.W - 1; if (this.row >= this.H) { this.done = true; res.itemDone = true; } }
      return res;
    }
    // распустить: текущий ряд, а если он пуст — предыдущий
    unravel() {
      if (this.done) return null;
      let r = this.row; const out = { row: r, prevRow: false, stitches: [] };
      if (this.col === this.W - 1) { if (r === 0) return null; r = r - 1; out.prevRow = true; out.row = r; }
      // снимаем в обратном порядке (последняя связанная — первой)
      while (this.history.length && this.history[this.history.length - 1].r === r) {
        const h = this.history.pop(); this.balls[h.bi].amount++; this.knit[h.r][h.c] = null;
        out.stitches.push({ row: h.r, col: h.c, ball: h.bi, code: this.balls[h.bi].code });
      }
      this.row = r; this.col = this.W - 1;
      return out;
    }
    // решатель: можно ли довязать из текущего состояния; возвращает индекс клубка для подсказки
    solve() {
      const memo = new Map(); const W = this.W, H = this.H, n = this.balls.length;
      const amt = this.balls.map(b => b.amount); const codes = this.balls.map(b => b.code);
      const startIdx = this.row * W + (W - 1 - this.col);
      const total = W * H;
      let steps = 0;
      const rec = (idx) => {
        if (idx >= total) return true;
        if (++steps > 200000) return true; // страховка: не блокируем кадр
        const key = idx + ':' + amt.join(',');
        if (memo.has(key)) return memo.get(key);
        const r = (idx / W) | 0, c = W - 1 - (idx % W);
        let ok = false;
        for (let i = 0; i < n && !ok; i++) {
          if (amt[i] <= 0 || !this.accepts(r, c, codes[i])) continue;
          amt[i]--; ok = rec(idx + 1); amt[i]++;
        }
        memo.set(key, ok); return ok;
      };
      if (this.done) return { ok: true, hint: -1 };
      const r = this.row, c = this.col;
      // перебор с предпочтением клубка с бОльшим запасом — подсказка «мягкая»
      const order = [...Array(n).keys()].sort((a, b) => amt[b] - amt[a]);
      for (const i of order) {
        if (amt[i] <= 0 || !this.accepts(r, c, codes[i])) continue;
        amt[i]--; const ok = rec(startIdx + 1); amt[i]++;
        if (ok) return { ok: true, hint: i };
      }
      return { ok: false, hint: -1 };
    }
  }
  P.Level = Level;
})();
