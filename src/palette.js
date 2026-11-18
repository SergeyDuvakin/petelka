/* Пряжа: база, свет, тень, пух; lurex — блёстки. Ведущий цвет — розовый (P). */
(function () {
  const { hex } = P.U;
  const Y = {
    P: { name: 'Розовый', base: '#F2A7BB', light: '#FAD0DB', dark: '#C77A90', fuzz: '#FFE6EC' },
    B: { name: 'Пудра', base: '#F6D3DC', light: '#FDEBF0', dark: '#D3A6B2', fuzz: '#FFF5F8' },
    L: { name: 'Лаванда', base: '#C7B5E0', light: '#DFD4F0', dark: '#9A86BA', fuzz: '#F0EAF9' },
    T: { name: 'Мята', base: '#B4DCCB', light: '#D3EDE2', dark: '#84B19D', fuzz: '#EAF7F1' },
    K: { name: 'Крем', base: '#F3EBDD', light: '#FDF9F2', dark: '#CDBFA8', fuzz: '#FFFFFF' },
    G: { name: 'Розовый люрекс', base: '#F6C3D1', light: '#FFE6EE', dark: '#C98DA0', fuzz: '#FFF0F4', lurex: ['#FFF7EC', '#FFD9E4', '#FFFFFF'] },
    W: { name: 'Серебряный люрекс', base: '#DCDDE6', light: '#F3F4F8', dark: '#AAADBC', fuzz: '#FFFFFF', lurex: ['#FFFFFF', '#E8F0FF'] },
    C: { name: 'Клюква', base: '#C9647A', light: '#DE8D9E', dark: '#9C4559', fuzz: '#F1C4CE' },
    H: { name: 'Хвоя', base: '#6F9A8C', light: '#93B7AA', dark: '#4E7366', fuzz: '#C7DCD4' },
    F: { name: 'Мороз', base: '#B5CCDD', light: '#D2E1EC', dark: '#8AA5BA', fuzz: '#EAF2F8' },
    O: { name: 'Карамель', base: '#D9A86C', light: '#EDC897', dark: '#A97A45', fuzz: '#F8E6CC' },
    M: { name: 'Мёд', base: '#F0C987', light: '#F9E2B6', dark: '#C79C5B', fuzz: '#FFF3DD' },
    R: { name: 'Малина', base: '#E07A96', light: '#F0A3B7', dark: '#B4566F', fuzz: '#FAD3DE' },
    S: { name: 'Небо', base: '#A9C8EC', light: '#CCE0F6', dark: '#7C9DC6', fuzz: '#EAF2FC' },
    V: { name: 'Ваниль', base: '#F5E2A8', light: '#FBF0CF', dark: '#CDB774', fuzz: '#FFF9E6' },
    E: { name: 'Персик', base: '#F7BFA0', light: '#FCD9C5', dark: '#CF9273', fuzz: '#FFEDE3' },
    D: { name: 'Слива', base: '#9C7AA8', light: '#BC9FC6', dark: '#735581', fuzz: '#DCCBE2' },
    A: { name: 'Графит', base: '#8C8794', light: '#ADA8B4', dark: '#66616E', fuzz: '#D5D2DA' },
    // фактурная пряжа
    Q: { name: 'Розовый меланж', base: '#EDB2C2', light: '#F8D3DD', dark: '#C5869A', fuzz: '#FFEAF0', fleck: '#FBE6EC' },
    U: { name: 'Лавандовый меланж', base: '#C3B3DD', light: '#DDD2EE', dark: '#9584B5', fuzz: '#F1ECF8', fleck: '#F3D3E0' },
    Z: { name: 'Закат (градиент)', base: '#F2B3B8', light: '#FAD3D3', dark: '#C9878F', fuzz: '#FFEDEE', grad: ['#F5A9BC', '#F7C4A2', '#C9B4E2'] },
    X: { name: 'Мятный рассвет (градиент)', base: '#C9E0D3', light: '#E2F0E8', dark: '#94B4A4', fuzz: '#F1F8F4', grad: ['#B4DCCB', '#F3EBDD', '#F6C3D1'] },
  };
  const finish = (y) => { y.cBase = hex(y.base); y.cLight = hex(y.light); y.cDark = hex(y.dark); y.cFuzz = hex(y.fuzz); if (y.fleck) y.cFleck = hex(y.fleck); return y; };
  for (const k in Y) { Y[k].code = k; finish(Y[k]); }
  P.YARN = Y;
  // градиентная пряжа: цвет меняется по ходу вязания; вариант «Z@k», k = 0…11
  const shade = (c, f) => c.map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));
  const toHex = (c) => '#' + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  P.GRAD_STEPS = 12;
  P.yarn = function (code) {
    if (Y[code]) return Y[code];
    const at = code.indexOf('@'); if (at < 0) return Y.K;
    const b = Y[code.slice(0, at)]; const k = parseInt(code.slice(at + 1), 10) / (P.GRAD_STEPS - 1);
    const g = b.grad.map(hex); const seg = Math.min(g.length - 2, Math.floor(k * (g.length - 1))); const f = k * (g.length - 1) - seg;
    const c = g[seg].map((v, i) => Math.round(v + (g[seg + 1][i] - v) * f));
    const y = finish({ name: b.name, base: toHex(c), light: toHex(shade(c, 0.45)), dark: toHex(shade(c, -0.2)), fuzz: toHex(shade(c, 0.75)) });
    y.code = code; y.parent = b.code; Y[code] = y; return y;
  };
  P.yarnAt = (code, t) => (Y[code] && Y[code].grad ? code + '@' + Math.round(Math.max(0, Math.min(1, t)) * (P.GRAD_STEPS - 1)) : code);
  P.THEME = {
    ui: '#FFF6F8', uiEdge: 'rgba(214,160,178,0.45)', text: '#6E4A57', textSoft: 'rgba(110,74,87,0.62)',
    glow: [255, 201, 216], gold: [255, 226, 196], wood: ['#E7C9A6', '#D4AE86', '#B88E66'],
    basket: ['#C99C73', '#A97B53', '#7F5A3B'],
  };
})();
