/* Звук: синтез в WebAudio (щелчок бамбуковых спиц, шорох шерсти, колокольчики) + спокойное пианино (CC0). */
(function () {
  // музыка — через WebAudio (буфер, петля), а не <audio>: iOS не держит приостановленный AudioContext в фоне.
  let ac = null, master = null, enabled = true, noiseBuf = null, hidden = false;
  let musicWanted = false, musicBuf = null, musicLoading = null, musicSrc = null, musicGain = null, musicT0 = 0, musicOff = 0, fallback = null;
  function ensure() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function noise(t, dur, type, f, q, peak, dec) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ac.createGain(); env(g, t, 0.002, peak, dec);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random() * 0.3); s.stop(t + dur);
    return fl;
  }
  function tone(t, f, type, peak, dec, a = 0.003) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
    const g = ac.createGain(); env(g, t, a, peak, dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05);
  }
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  function loadMusic() {
    if (musicBuf || musicLoading || !ensure()) return musicLoading;
    musicLoading = fetch('assets/audio/piano.mp3').then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
      .then(buf => { musicBuf = buf; musicLoading = null; syncMusic(); })
      .catch(() => { musicLoading = null; fallback = fallback || Object.assign(new Audio('assets/audio/piano.mp3'), { loop: true, volume: 0.32 }); syncMusic(); });
    return musicLoading;
  }
  function stopMusic() {
    if (musicSrc) { try { musicOff = (ac.currentTime - musicT0) % musicBuf.duration; musicSrc.onended = null; musicSrc.stop(); } catch (e) {} try { musicSrc.disconnect(); } catch (e) {} musicSrc = null; }
    if (fallback && !fallback.paused) fallback.pause();
  }
  // играть ли музыку сейчас: только если звук включён, вкладка видна и контекст работает
  function syncMusic() {
    const on = musicWanted && enabled && !hidden;
    if (!on) { stopMusic(); return; }
    if (fallback) { fallback.play().catch(() => {}); return; }
    if (!musicBuf) { loadMusic(); return; }
    if (musicSrc || !ac || ac.state !== 'running') return;
    musicGain = musicGain || (() => { const g = ac.createGain(); g.gain.value = 0.32; g.connect(master); return g; })();
    const src = ac.createBufferSource(); src.buffer = musicBuf; src.loop = true; src.connect(musicGain);
    musicT0 = ac.currentTime - musicOff; src.start(0, musicOff % musicBuf.duration); musicSrc = src;
  }
  function sleep() {   // свернули/ушли со страницы: тишина сразу, контекст на паузу
    hidden = true; stopMusic();
    if (ac) { try { master.gain.cancelScheduledValues(ac.currentTime); master.gain.value = 0; master.gain.setValueAtTime(0, ac.currentTime); } catch (e) {} if (ac.state === 'running') ac.suspend().catch(() => {}); }
  }
  function wake() {    // вернулись: возобновляем, только если звук включён (на iOS может понадобиться тап — см. unlock)
    if (document.visibilityState === 'hidden') return;
    hidden = false;
    if (!enabled || !ac) return;
    master.gain.value = 0.9; master.gain.setValueAtTime(0.9, ac.currentTime);
    const r = ac.state !== 'running' ? ac.resume() : Promise.resolve();
    r.then(syncMusic).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' ? sleep() : wake());
  window.addEventListener('pagehide', sleep);
  window.addEventListener('blur', sleep);
  document.addEventListener('freeze', sleep);
  window.addEventListener('pageshow', wake);
  window.addEventListener('focus', wake);
  const live = () => enabled && !hidden && ensure() && ac.state === 'running';
  const A = {
    unlock() { if (!enabled) return; if (!ensure()) return; if (hidden && document.visibilityState !== 'hidden') hidden = false;
      if (hidden) return;
      master.gain.value = 0.9; master.gain.setValueAtTime(0.9, ac.currentTime);
      if (ac.state !== 'running') ac.resume().then(syncMusic).catch(() => {}); else syncMusic(); },
    setEnabled(v) { enabled = v;
      if (ac) { const gv = v && !hidden ? 0.9 : 0; master.gain.cancelScheduledValues(ac.currentTime); master.gain.value = gv; master.gain.setValueAtTime(gv, ac.currentTime); }
      if (!v) { stopMusic(); if (ac && ac.state === 'running') ac.suspend().catch(() => {}); }
      else if (!hidden && ensure()) { master.gain.value = 0.9; master.gain.setValueAtTime(0.9, ac.currentTime); if (ac.state !== 'running') ac.resume().then(syncMusic).catch(() => {}); else syncMusic(); } },
    get state() { return { enabled, hidden, ctx: ac ? ac.state : 'none', gain: master ? master.gain.value : null, music: !!musicSrc || !!(fallback && !fallback.paused), wanted: musicWanted, loaded: !!musicBuf }; },
    get enabled() { return enabled; },
    click(k = 1) { // спица входит в петлю: сухой «ток»
      if (!live()) return; const t = ac.currentTime + 0.001, p = k * (0.96 + Math.random() * 0.08);
      noise(t, 0.03, 'bandpass', 2600 * p, 4, 0.22, 0.018);
      tone(t, 1150 * p, 'triangle', 0.07, 0.035);
      tone(t + 0.004, 2300 * p, 'sine', 0.025, 0.02);
    },
    rustle() { if (!live()) return; noise(ac.currentTime, 0.14, 'lowpass', 1300, 0.7, 0.05, 0.1); },
    slide() { if (!live()) return; const t = ac.currentTime; noise(t, 0.1, 'bandpass', 1800, 2, 0.04, 0.07); tone(t, 1700, 'sine', 0.012, 0.05); },
    bell(i = 0, vol = 0.09) { if (!live()) return; const t = ac.currentTime + 0.01, f = PENTA[i % PENTA.length];
      tone(t, f, 'sine', vol, 1.2, 0.006); tone(t, f * 2, 'sine', vol * 0.25, 0.6, 0.004); tone(t, f * 3.01, 'sine', vol * 0.08, 0.35, 0.004); },
    rowDone() { this.bell(2, 0.08); setTimeout(() => this.bell(4, 0.07), 110); },
    motif() { [0, 2, 4, 5].forEach((n, i) => setTimeout(() => this.bell(n, 0.06), i * 90)); },
    itemDone() { [0, 2, 4].forEach((n, i) => setTimeout(() => this.bell(n, 0.08), i * 140)); setTimeout(() => this.bell(5, 0.06), 520); },
    wrong() { if (!live()) return; const t = ac.currentTime; tone(t, 330, 'sine', 0.05, 0.18, 0.01); noise(t, 0.18, 'lowpass', 900, 0.7, 0.035, 0.15); },
    empty() { if (!live()) return; tone(ac.currentTime, 180, 'sine', 0.07, 0.14, 0.01); },
    unravel() { if (!live()) return; const t = ac.currentTime; const f = noise(t, 0.35, 'bandpass', 900, 1.2, 0.05, 0.3); f.frequency.exponentialRampToValueAtTime(2600, t + 0.3); },
    whoosh() { if (!live()) return; const t = ac.currentTime; const f = noise(t, 0.5, 'bandpass', 500, 0.9, 0.07, 0.45); f.frequency.exponentialRampToValueAtTime(2200, t + 0.4); },
    startMusic() { musicWanted = true; if (!enabled) return; loadMusic(); syncMusic(); },
    vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} },
  };
  P.Audio = A;
})();
