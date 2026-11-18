# Ассеты
- Музыка (только спокойное фортепиано, сменяется по кругу с плавным перекрёстным затуханием, `src/audio.js`):
  - `assets/audio/piano.mp3` — «JRPG Piano», OpenGameArt (Joth), CC0. https://opengameart.org/content/jrpg-piano
  - `assets/audio/piano2.mp3` — «Sunrise» (Sunrise over Clear Skies), OpenGameArt (Sudocolon), CC0. https://opengameart.org/content/sunrise
  - `assets/audio/piano3.mp3` — «Emotional Piano» (emotional_piano_solo), OpenGameArt (Centurion_of_war), CC0. https://opengameart.org/content/emotional-piano-0
  - громкость выровнена между пьесами, 64 кбит/с моно.
- Щелчки спиц: `assets/audio/needles.wav` — 7 коротких щелчков, вырезанных из «Knitting with Metal Needles», Freesound (HanulSkyGirl), CC0. https://freesound.org/s/505487/
  (отфильтрованы и нормализованы); в игре — случайный щелчок, случайный питч ±10 %, без повтора подряд, мягкий low-pass.
- Шорох, колокольчики, «ошибка» — синтез WebAudio в `src/audio.js` (своё, без файлов).
- Шрифты: Marck Script, Nunito — Google Fonts, SIL Open Font License 1.1.
- Фон (розовый лён на беленом дереве) — сгенерирован для проекта.
- Иконка и заставка (v3.3) — связанное «Сердечко» из уровня 1, нарисованное самим движком петель (`test/iconmake2.js`, `test/launchmake.js`).
- Петли, клубки, корзинка, спицы, нить — процедурная отрисовка Canvas 2D (`src/stitch.js`, `src/scene.js`).
