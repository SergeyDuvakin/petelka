/* Звук: щелчки спиц — короткие записи (Freesound, CC0) со случайным питчем, шорох и колокольчики — синтез WebAudio;
   музыка — несколько спокойных пьес для фортепиано (OpenGameArt, CC0), сменяются по кругу с мягким перекрёстным затуханием.
   Правила жизненного цикла (v3.1): в фоне — тишина и suspend; при выключенном звуке/музыке ничего не грузится и не планируется. */
(function () {
  let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, hidden = false;
  let sfxOn = true, musicOn = true, vibOn = true;
  const anyOn = () => sfxOn || musicOn;
  // плейлист: пьеса и сколько раз подряд её играть (короткая петля — дважды), затем следующая
  const BASE = 'assets/audio/';
  const PLAY = [{ u: 'piano.mp3', rep: 2 }, { u: 'piano2.mp3', rep: 1 }, { u: 'piano.mp3', rep: 2 }, { u: 'piano3.mp3', rep: 1 }];
  const XF = 3.5;                                   // перекрёстное затухание между пьесами, с
  const bufs = {}, loading = {};
  let musicWanted = false, pi = 0, pos = 0, cur = null, prev = null, tick = null, fallback = null;
  let clickBuf = null, clickLoading = null, lastClick = -1;
  const SLOT = 0.1, NCLICK = 7;                     // needles.wav: 7 щелчков по 100 мс
  function ensure() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = anyOn() ? 0.9 : 0; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  const decode = (b) => new Promise((ok, no) => ac.decodeAudioData(b, ok, no));
  function loadBuf(u) {
    if (bufs[u] || loading[u] || !ensure()) return loading[u];
    loading[u] = fetch(BASE + u).then(r => r.arrayBuffer()).then(decode)
      .then(b => { bufs[u] = b; loading[u] = null; syncMusic(); })
      .catch(() => { loading[u] = null; if (u === PLAY[0].u && !fallback) { fallback = Object.assign(new Audio(BASE + u), { loop: true, volume: 0.32 }); syncMusic(); } });
    return loading[u];
  }
  function loadClicks() {
    if (clickBuf || clickLoading || !sfxOn || !ensure()) return;
    clickLoading = fetch(BASE + 'needles.wav').then(r => r.arrayBuffer()).then(decode).then(b => { clickBuf = b; clickLoading = null; }).catch(() => { clickLoading = null; });
  }
  const total = (i) => { const it = PLAY[i % PLAY.length], b = bufs[it.u]; return b ? b.duration * it.rep : 0; };
  function killVoice(v, fade) {
    if (!v) return; try { v.src.onended = null; } catch (e) {}
    if (fade && ac) { const t = ac.currentTime; try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + fade); v.src.stop(t + fade + 0.05); } catch (e) {} return; }
    try { v.src.stop(); } catch (e) {} try { v.src.disconnect(); v.g.disconnect(); } catch (e) {}
  }
  function voice(i, offset, fadeIn) {   // запустить пьесу i с позиции offset (с начала её «повторов»)
    const it = PLAY[i % PLAY.length], b = bufs[it.u]; if (!b) return null;
    const g = ac.createGain(), src = ac.createBufferSource(), t = ac.currentTime;
    src.buffer = b; src.loop = it.rep > 1; src.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(fadeIn ? 0 : 1, t); if (fadeIn) g.gain.linearRampToValueAtTime(1, t + fadeIn);
    const T = b.duration * it.rep; src.start(t, offset % b.duration); if (src.loop) src.stop(t + (T - offset)); 
    return { src, g, i, t0: t - offset, T };
  }
  function stopMusic() {
    if (cur && ac) { pos = Math.max(0, Math.min(cur.T - 0.1, ac.currentTime - cur.t0)); pi = cur.i; }
    killVoice(cur); killVoice(prev); cur = prev = null; if (tick) { clearInterval(tick); tick = null; }
    if (fallback && !fallback.paused) fallback.pause();
  }
  function step() {   // раз в полсекунды: подгрузить следующую пьесу и вовремя начать перекрёстное затухание
    if (!cur || !ac) return;
    const nx = (cur.i + 1) % PLAY.length; if (!bufs[PLAY[nx].u]) loadBuf(PLAY[nx].u);
    const left = cur.T - (ac.currentTime - cur.t0);
    if (left <= XF) {
      if (!bufs[PLAY[nx].u]) { if (left <= 0.2) { const i = cur.i; killVoice(cur); cur = voice(i, 0, 0.8); } return; }   // следующая ещё не готова — повторяем текущую
      killVoice(prev); prev = cur; killVoice(prev, Math.max(0.3, left)); cur = voice(nx, 0, XF); pi = nx; pos = 0;
    }
  }
  // играть ли музыку сейчас: только если музыка включена, вкладка видна и контекст работает
  function syncMusic() {
    const on = musicWanted && musicOn && !hidden;
    if (!on) { stopMusic(); return; }
    if (fallback) { fallback.play().catch(() => {}); return; }
    const u = PLAY[pi % PLAY.length].u; if (!bufs[u]) { loadBuf(u); return; }
    if (cur || !ac || ac.state !== 'running') return;
    cur = voice(pi, pos, pos > 0 ? 1.2 : 2.0); if (!tick) tick = setInterval(step, 500);
  }
  function gainTo(v) { if (!ac) return; master.gain.cancelScheduledValues(ac.currentTime); master.gain.value = v; master.gain.setValueAtTime(v, ac.currentTime); }
  function sleep() {   // свернули/ушли со страницы: тишина сразу, контекст на паузу
    hidden = true; stopMusic();
    if (ac) { try { gainTo(0); } catch (e) {} if (ac.state === 'running') ac.suspend().catch(() => {}); }
  }
  function wake() {    // вернулись: возобновляем, только если что-то из звука включено (на iOS может понадобиться тап — см. unlock)
    if (document.visibilityState === 'hidden') return;
    hidden = false;
    if (!anyOn() || !ac) return;
    gainTo(0.9);
    const r = ac.state !== 'running' ? ac.resume() : Promise.resolve();
    r.then(syncMusic).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' ? sleep() : wake());
  window.addEventListener('pagehide', sleep);
  window.addEventListener('blur', sleep);
  document.addEventListener('freeze', sleep);
  window.addEventListener('pageshow', wake);
  window.addEventListener('focus', wake);
  function apply() {   // применить переключатели звука/музыки
    if (!anyOn()) { stopMusic(); if (ac) { gainTo(0); if (ac.state === 'running') ac.suspend().catch(() => {}); } return; }
    if (hidden) return;
    if (!musicOn) stopMusic();
    if (!ensure()) return; gainTo(0.9); if (sfxOn) loadClicks();
    if (ac.state !== 'running') ac.resume().then(syncMusic).catch(() => {}); else syncMusic();
  }
  const live = () => sfxOn && !hidden && ensure() && ac.state === 'running';
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function noise(t, dur, type, f, q, peak, dec) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ac.createGain(); env(g, t, 0.002, peak, dec);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 0.3); s.stop(t + dur);
    return fl;
  }
  function tone(t, f, type, peak, dec, a = 0.003) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
    const g = ac.createGain(); env(g, t, a, peak, dec); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + a + dec + 0.05);
  }
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  const A = {
    unlock() { if (!anyOn()) return; if (!ensure()) return; if (hidden && document.visibilityState !== 'hidden') hidden = false;
      if (hidden) return; apply(); },
    setEnabled(v) { sfxOn = musicOn = !!v; if (v) musicWanted = true; apply(); },          // совместимость: всё сразу
    setSfx(v) { sfxOn = !!v; apply(); },
    setMusic(v) { musicOn = !!v; if (v) musicWanted = true; apply(); },
    setVibrate(v) { vibOn = !!v; },
    configure(o) { if (o) { if ('sfx' in o) sfxOn = !!o.sfx; if ('music' in o) musicOn = !!o.music; if ('vib' in o) vibOn = !!o.vib; } },   // при загрузке, без побочных эффектов
    get sfxOn() { return sfxOn; }, get musicOn() { return musicOn; }, get vibOn() { return vibOn; },
    get canVibrate() { return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'; },
    get state() { return { enabled: anyOn(), sfx: sfxOn, musicOn, hidden, ctx: ac ? ac.state : 'none', gain: master ? master.gain.value : null,
      music: !!cur || !!(fallback && !fallback.paused), wanted: musicWanted, loaded: Object.keys(bufs).length > 0, track: cur ? PLAY[cur.i].u : null, clicks: !!clickBuf }; },
    get enabled() { return anyOn(); },
    click(k = 1) { // спица входит в петлю: настоящий щелчок спиц (запись), каждый раз другой и чуть другой высоты
      if (!live()) return; const t = ac.currentTime + 0.001;
      if (!clickBuf) { loadClicks(); const p = k * (0.96 + Math.random() * 0.08); noise(t, 0.03, 'bandpass', 2600 * p, 4, 0.22, 0.018); tone(t, 1150 * p, 'triangle', 0.07, 0.035); return; }
      let n = Math.floor(Math.random() * NCLICK); if (n === lastClick) n = (n + 1 + Math.floor(Math.random() * (NCLICK - 1))) % NCLICK; lastClick = n;
      const s = ac.createBufferSource(); s.buffer = clickBuf; s.playbackRate.value = k * (0.9 + Math.random() * 0.2);
      const g = ac.createGain(); g.gain.value = 0.42 * (0.8 + Math.random() * 0.3);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200 + Math.random() * 1500;   // мягче, не «звенит»
      s.connect(lp); lp.connect(g); g.connect(sfxBus); s.start(t, n * SLOT, SLOT * 0.95);
      tone(t, 900 * k * (0.97 + Math.random() * 0.06), 'sine', 0.018, 0.03);   // чуть «дерева» под щелчком
    },
    rustle() { if (!live()) return; noise(ac.currentTime, 0.14, 'lowpass', 1300, 0.7, 0.05, 0.1); },
    slide() { if (!live()) return; const t = ac.currentTime; noise(t, 0.1, 'bandpass', 1800, 2, 0.04, 0.07); tone(t, 1700, 'sine', 0.012, 0.05); },
    bell(i = 0, vol = 0.09) { if (!live()) return; const t = ac.currentTime + 0.01, f = PENTA[i % PENTA.length];
      tone(t, f, 'sine', vol, 1.2, 0.006); tone(t, f * 2, 'sine', vol * 0.25, 0.6, 0.004); tone(t, f * 3.01, 'sine', vol * 0.08, 0.35, 0.004); },
    rowDone() { this.bell(2, 0.08); setTimeout(() => this.bell(4, 0.07), 110); },
    motif() { [0, 2, 4, 5].forEach((n, i) => setTimeout(() => this.bell(n, 0.06), i * 90)); },
    itemDone() { [0, 2, 4].forEach((n, i) => setTimeout(() => this.bell(n, 0.08), i * 140)); setTimeout(() => this.bell(5, 0.06), 520); },
    cheer() { [0, 2, 4, 5, 4, 5].forEach((n, i) => setTimeout(() => this.bell(n + (i > 3 ? 1 : 0), 0.055), i * 120)); },   // ленточка/гирлянда
    wrong() { if (!live()) return; const t = ac.currentTime; tone(t, 330, 'sine', 0.05, 0.18, 0.01); noise(t, 0.18, 'lowpass', 900, 0.7, 0.035, 0.15); },
    empty() { if (!live()) return; tone(ac.currentTime, 180, 'sine', 0.07, 0.14, 0.01); },
    unravel() { if (!live()) return; const t = ac.currentTime; const f = noise(t, 0.35, 'bandpass', 900, 1.2, 0.05, 0.3); f.frequency.exponentialRampToValueAtTime(2600, t + 0.3); },
    whoosh() { if (!live()) return; const t = ac.currentTime; const f = noise(t, 0.5, 'bandpass', 500, 0.9, 0.07, 0.45); f.frequency.exponentialRampToValueAtTime(2200, t + 0.4); },
    startMusic() { musicWanted = true; if (!musicOn) return; loadBuf(PLAY[pi % PLAY.length].u); syncMusic(); },
    vibrate(ms) { if (!vibOn || hidden) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} },
    // для тестов: перемотать текущую пьесу почти к концу
    _seekEnd(sec = 1) { if (cur && ac) { const i = cur.i, off = Math.max(0, cur.T - sec); killVoice(cur); cur = voice(i, off, 0); } },
  };
  P.Audio = A;
})();
