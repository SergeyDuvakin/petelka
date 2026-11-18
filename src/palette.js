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
  };
  for (const k in Y) { const y = Y[k]; y.code = k; y.cBase = hex(y.base); y.cLight = hex(y.light); y.cDark = hex(y.dark); y.cFuzz = hex(y.fuzz); }
  P.YARN = Y;
  P.THEME = {
    ui: '#FFF6F8', uiEdge: 'rgba(214,160,178,0.45)', text: '#6E4A57', textSoft: 'rgba(110,74,87,0.62)',
    glow: [255, 201, 216], gold: [255, 226, 196], wood: ['#E7C9A6', '#D4AE86', '#B88E66'],
    basket: ['#C99C73', '#A97B53', '#7F5A3B'],
  };
})();
