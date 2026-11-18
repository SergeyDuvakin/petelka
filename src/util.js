/* Петелька — утилиты: кривые, пружины, цвет, случайность. Никаких linear-перемещений. */
(function () {
  const P = (window.P = window.P || {});
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outSine: (t) => Math.sin((t * Math.PI) / 2),
    outBack: (t, s = 1.2) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    // затухающая пружина 0→1 (ζ<1 — небольшой перелёт)
    spring: (t, zeta = 0.45, omega = 18) => {
      if (t >= 1) return 1;
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    },
    // затухающее колебание вокруг 0 (для «натяжения» петли)
    wobble: (t, n = 2) => Math.exp(-4.2 * t) * Math.sin(t * Math.PI * 2 * n),
  };
  // простая пружина-«следователь»
  class Spring {
    constructor(v, k = 220, z = 0.62) { this.v = v; this.t = v; this.vel = 0; this.k = k; this.z = z; }
    set(t) { this.t = t; }
    snap(v) { this.v = this.t = v; this.vel = 0; }
    step(dt) {
      const c = 2 * Math.sqrt(this.k) * this.z;
      const a = this.k * (this.t - this.v) - c * this.vel;
      this.vel += a * dt; this.v += this.vel * dt;
      return this.v;
    }
  }
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb(c, a = 1) { return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function cubic(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }
  P.U = { clamp, lerp, E, Spring, rng, hex, rgb, mix, cubic };
})();
