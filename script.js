(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const startEl = document.getElementById('start');
  const audio = document.getElementById('music');

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ====== Cấu hình gốc (giống bản Python) ======
  const BASE_W = 1000, BASE_H = 680;
  const MATRIX_WORDS = [
    "YÊU MẸ", "20/10", "LOVE", "CƯỜNG", "MUM",
    "♥ MẸ ♥", "CHÚC MẸ", "MOTHER", "Ý NGHĨA", "TUYỆT VỜI"
  ];
  const MESSAGES = [
    "3", "2", "1",
    "CHÚC MỪNG NGÀY CỦA MẸ",
    "NGƯỜI PHỤ NỮ TUYỆT VỜI NHẤT ĐỜI CON",
    "CHÚC MẸ CÓ MỘT NGÀY 20/10 THẬT LÀ Ý NGHĨA",
    "YÊU MẸ",
    "NGƯỜI TUYỆT VỜI NHẤT ĐỜI CON ❤️"
  ];
  const FONT_SIZE_BG = 13;
  const COL_STEP = 55;
  const ROW_HEIGHT_BASE = FONT_SIZE_BG + 18;

  const fontStr = (px) => `bold ${px}px "Segoe UI", Arial, Tahoma, sans-serif`;

  // ====== Kích thước & tỉ lệ (tự thích ứng điện thoại / máy tính) ======
  let W = 0, H = 0, DPR = 1;
  let S = 1;          // tỉ lệ hạt, tốc độ
  let M = 1;          // tỉ lệ nền ma trận
  let FS = 38;        // cỡ chữ chính
  let FSC = 110;      // cỡ chữ đếm ngược
  let DS = 1;         // tỉ lệ chấm LED
  let heartScale = 13.5;
  let K = 1;          // tỉ lệ độ dày chấm trái tim
  let CY = 0;         // tâm dọc

  // ====== Nền ma trận ======
  class MatrixColumn {
    constructor(x) {
      this.x = x;
      this.speed = rand(1.8, 3.2) * M;
      this.rh = ROW_HEIGHT_BASE * M;
      this.rowsCount = Math.floor(H / this.rh) + 3;
      this.words = Array.from({ length: this.rowsCount }, () => choice(MATRIX_WORDS));
      this.baseAlpha = randInt(50, 100);
      this.offsetY = rand(0, H);
    }
    update() {
      this.offsetY += this.speed;
      if (this.offsetY >= this.rh) {
        this.offsetY -= this.rh;
        this.words.pop();
        this.words.unshift(choice(MATRIX_WORDS));
      }
    }
    draw() {
      const fb = FONT_SIZE_BG * M;
      for (let idx = 0; idx < this.rowsCount; idx++) {
        const y = idx * this.rh + this.offsetY - this.rh;
        if (y >= -fb && y <= H) {
          const fade = Math.max(0.2, 1.0 - idx * 0.04);
          const b = Math.floor(this.baseAlpha * fade);
          ctx.fillStyle = `rgb(${b},${b},${b})`;
          ctx.fillText(this.words[idx], this.x, y);
        }
      }
    }
  }
  let matrixColumns = [];
  function buildMatrix() {
    const step = COL_STEP * M;
    const count = Math.floor(W / step) + 1;
    matrixColumns = [];
    for (let i = 0; i < count; i++) matrixColumns.push(new MatrixColumn(i * step + 15 * M));
  }

  // ====== Các lớp hạt ======
  class Particle {
    constructor(x, y, color, speedMult = 1.0, gravity = 0.0) {
      this.x = x; this.y = y;
      this.vx = rand(-4, 4) * speedMult * S;
      this.vy = rand(-4, 4) * speedMult * S;
      this.gravity = gravity;
      this.alpha = 255;
      this.size = randInt(2, 4) * S;
      this.color = color;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy + this.gravity;
      this.alpha -= 5;
    }
    draw() {
      if (this.alpha > 0) {
        ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${Math.max(0, this.alpha) / 255})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }
  }

  class FireworkParticle {
    constructor(x, y, color) {
      this.x = x; this.y = y;
      const angle = rand(0, TAU);
      const speed = rand(2, 8) * S;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.gravity = 0.12 * S;
      this.alpha = 255;
      this.size = randInt(2, 4) * S;
      this.color = color;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.alpha -= 4;
    }
    draw() {
      if (this.alpha > 0) {
        ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${Math.max(0, this.alpha) / 255})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }
  }

  class HeartAssembleParticle {
    constructor(tx, ty, color) {
      const angle = rand(0, TAU);
      const dist = rand(300, 500) * Math.max(S, 0.8);
      this.x = tx + Math.cos(angle) * dist;
      this.y = ty + Math.sin(angle) * dist;
      this.tx = tx; this.ty = ty;
      this.color = color;
      this.speed = rand(0.06, 0.1);
      this.arrived = false;
    }
    update() {
      this.x += (this.tx - this.x) * this.speed;
      this.y += (this.ty - this.y) * this.speed;
      if (Math.hypot(this.tx - this.x, this.ty - this.y) < 3) this.arrived = true;
    }
    draw() {
      ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, choice([2, 3]) * K, 0, TAU);
      ctx.fill();
    }
  }

  // ====== Trái tim ======
  function getHeartPoints(cx, cy, scale, count = 260) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * TAU;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([cx + Math.trunc(x * scale), cy + Math.trunc(y * scale)]);
    }
    return pts;
  }

  // Vẽ nhiều chấm lấp lánh: chia 9 mức sáng để gộp nét vẽ cho nhanh
  function makePaths() { return Array.from({ length: 9 }, () => new Path2D()); }
  function addDot(paths, x, y, r) {
    const p = paths[(Math.random() * 9) | 0];
    p.moveTo(x + r, y);
    p.arc(x, y, r, 0, TAU);
  }
  function fillPaths(paths, c) {
    for (let b = 0; b < 9; b++) {
      const sp = (b - 4) * 10;
      const r = clamp(c[0] + sp, 0, 255), g = clamp(c[1] + sp, 0, 255), bl = clamp(c[2] + sp, 0, 255);
      ctx.fillStyle = `rgb(${r},${g},${bl})`;
      ctx.fill(paths[b]);
    }
  }

  function drawMagnificentHeart(cx, cy, pulseScale, mainColor) {
    const layers = 22;
    for (let layer = 0; layer < layers; layer++) {
      const layerScale = pulseScale * (1.0 - layer * 0.03);
      const offsetY = Math.trunc(layer * 1.3 * K);
      const shade = Math.max(0.25, 1.0 - layer * 0.035);
      const c = [
        Math.trunc(mainColor[0] * shade),
        Math.trunc(mainColor[1] * shade),
        Math.trunc(mainColor[2] * shade)
      ];
      const pts = getHeartPoints(cx, cy + offsetY, layerScale);
      const paths = makePaths();
      for (const [px, py] of pts) {
        const radius = (layer < 3 && Math.random() > 0.6 ? 3 : 2) * K;
        addDot(paths, px, py, radius);
      }
      fillPaths(paths, c);
    }
  }

  // ====== Chữ chấm LED (tự xuống dòng khi màn hình hẹp) ======
  const off = document.createElement('canvas');
  const octx = off.getContext('2d', { willReadFrequently: true });
  const dotCache = new Map();
  const wrapCache = new Map();

  function measure(str, px) {
    octx.font = fontStr(px);
    return octx.measureText(str).width;
  }

  function wrapLines(text, px, maxW) {
    const key = text + '|' + px.toFixed(1) + '|' + Math.round(maxW);
    if (wrapCache.has(key)) return wrapCache.get(key);
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (cur && measure(test, px) > maxW) { lines.push(cur); cur = w; }
      else cur = test;
    }
    lines.push(cur);
    wrapCache.set(key, lines);
    return lines;
  }

  function getLayout(text, isCountdown) {
    const px = isCountdown ? FSC : FS;
    const lines = isCountdown ? [text] : wrapLines(text, px, W * 0.94);
    return { lines, px, lineH: px * 1.35 };
  }

  // Lấy các điểm chấm của 1 dòng chữ (giống get_pixel_positions: bước 3, alpha > 100)
  function getDotEntry(str, px) {
    const key = str + '|' + px.toFixed(1) + '|' + DS.toFixed(3);
    if (dotCache.has(key)) return dotCache.get(key);
    const w = Math.ceil(measure(str, px)) + 2;
    const h = Math.ceil(px * 1.7);
    off.width = w; off.height = h;
    octx.clearRect(0, 0, w, h);
    octx.font = fontStr(px);
    octx.fillStyle = '#fff';
    octx.textBaseline = 'alphabetic';
    octx.fillText(str, 1, px * 1.25);
    const data = octx.getImageData(0, 0, w, h).data;
    const step = Math.max(2, Math.round(3 * DS));
    const r = step * 2 / 3;
    const pts = [];
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        if (data[(y * w + x) * 4 + 3] > 100) pts.push(x - w / 2, y - h / 2);
      }
    }
    const entry = { pts, r };
    dotCache.set(key, entry);
    return entry;
  }

  function forEachDot(partialLines, layout, cx, cy, fn) {
    const n = layout.lines.length;
    for (let i = 0; i < n; i++) {
      const s = partialLines[i];
      if (!s) continue;
      const e = getDotEntry(s, layout.px);
      const lcy = cy + (i - (n - 1) / 2) * layout.lineH;
      const pts = e.pts;
      for (let k = 0; k < pts.length; k += 2) fn(cx + pts[k], lcy + pts[k + 1], e.r);
    }
  }

  function drawPixelText(partialLines, layout, cx, cy, color) {
    const paths = makePaths();
    forEachDot(partialLines, layout, cx, cy, (x, y, r) => addDot(paths, x, y, r));
    fillPaths(paths, color);
  }

  function partialOf(layout, ci) {
    let start = 0;
    return layout.lines.map((l) => {
      const n = Math.max(0, Math.min(l.length, ci - start));
      start += l.length + 1;
      return l.slice(0, n);
    });
  }

  function hsvToRgb(h) {
    const i = Math.floor(h * 6), f = h * 6 - i, q = 1 - f, t = f;
    let r, g, b;
    switch (i % 6) {
      case 0: r = 1; g = t; b = 0; break;
      case 1: r = q; g = 1; b = 0; break;
      case 2: r = 0; g = 1; b = t; break;
      case 3: r = 0; g = q; b = 1; break;
      case 4: r = t; g = 0; b = 1; break;
      default: r = 1; g = 0; b = q;
    }
    return [Math.trunc(r * 255), Math.trunc(g * 255), Math.trunc(b * 255)];
  }

  // ====== Trạng thái ======
  let started = false;
  let currentMsgIndex = 0;
  let charIndex = 0;
  let lastCharTime = 0, lastMsgTime = 0, lastFireworkTime = 0;
  let hueText = 0.5;
  let particles = [];
  let fireworks = [];
  let heartAsm = [];
  let heartReady = false;
  let state = 'TYPING';

  // ====== Thay đổi kích thước ======
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const portrait = H > W;
    const base = Math.min(W / BASE_W, H / BASE_H);
    S = portrait ? clamp(W / 650, 0.6, 1.2) : clamp(base, 0.7, 1.8);
    M = Math.max(0.9, S);
    FS = Math.max(20, portrait ? W * 0.075 : 38 * base);
    FSC = FS * 110 / 38;
    DS = FS / 38;
    heartScale = Math.min(W * 0.8 / 32, H * 0.6 / 30);
    K = Math.max(0.7, heartScale / 13.5);
    CY = H / 2 - 10 * S;

    dotCache.clear();
    wrapCache.clear();
    buildMatrix();
    if (!heartReady) heartAsm.length = 0;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));

  // ====== Vòng lặp chính (60 khung/giây, giống clock.tick(60)) ======
  const FRAME_MS = 1000 / 60;
  let acc = 0, lastT = performance.now();

  function frame() {
    const now = performance.now();

    // Nền đen vệt bóng
    ctx.fillStyle = 'rgba(0,0,0,0.431)';
    ctx.fillRect(0, 0, W, H);

    // Đổi màu Rainbow
    hueText = (hueText + 0.005) % 1.0;
    const textColor = hsvToRgb(hueText);

    // 1. Ma trận chữ nền
    ctx.font = `bold ${FONT_SIZE_BG * M}px Arial, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (const col of matrixColumns) { col.update(); col.draw(); }

    if (started) {
      // 2. Xử lý câu chúc
      const fullText = MESSAGES[currentMsgIndex];
      const isCountdown = fullText === '3' || fullText === '2' || fullText === '1';
      const layout = getLayout(fullText, isCountdown);

      if (fullText === 'YÊU MẸ' && heartAsm.length === 0 && !heartReady) {
        const pts = getHeartPoints(Math.trunc(W / 2), Math.trunc(CY), heartScale);
        for (let i = 0; i < pts.length; i += 2) {
          heartAsm.push(new HeartAssembleParticle(
            pts[i][0], pts[i][1], [255, randInt(100, 200), randInt(150, 255)]));
        }
      }

      if (state === 'TYPING') {
        if (now - lastCharTime > (isCountdown ? 10 : 40)) {
          charIndex++;
          lastCharTime = now;
          if (charIndex >= fullText.length) { state = 'HOLD'; lastMsgTime = now; }
        }
      } else if (state === 'HOLD') {
        let holdTime = isCountdown ? 800 : 3800;
        if (currentMsgIndex === MESSAGES.length - 1) holdTime = 9999999;
        if (now - lastMsgTime > holdTime) {
          state = 'DISPERSING';
          let idx = 0;
          forEachDot(layout.lines, layout, W / 2, CY, (x, y) => {
            if (idx % 2 === 0) particles.push(new Particle(x, y, textColor, 1.2));
            idx++;
          });
        }
      } else if (state === 'DISPERSING') {
        if (particles.length === 0 || particles.every((p) => p.alpha <= 0)) {
          particles = [];
          heartAsm = [];
          heartReady = false;
          if (currentMsgIndex < MESSAGES.length - 1) {
            currentMsgIndex++;
            charIndex = 0;
            state = 'TYPING';
          }
        }
      }

      // 3. Trái tim hoành tráng (câu "YÊU MẸ")
      if (fullText === 'YÊU MẸ' && (state === 'TYPING' || state === 'HOLD')) {
        if (!heartReady) {
          let allArrived = true;
          for (const hp of heartAsm) {
            hp.update(); hp.draw();
            if (!hp.arrived) allArrived = false;
          }
          if (allArrived && heartAsm.length > 0) {
            heartReady = true;
            for (let i = 0; i < 80; i++) particles.push(new Particle(W / 2, CY, [255, 120, 180], 2.0));
          }
        } else {
          const t = now % 1200;
          const pulse = t < 180
            ? Math.sin((t / 180) * Math.PI) * 1.8
            : (t > 220 && t < 380 ? Math.sin(((t - 220) / 160) * Math.PI) * 1.2 : 0.0);
          const scaleSize = heartScale + pulse * K;
          const heartColor = [255, 100 + Math.trunc(Math.sin(now * 0.008) * 80), 160];
          drawMagnificentHeart(W / 2, CY, scaleSize, heartColor);

          if (Math.random() < 0.3) {
            const rx = W / 2 + randInt(-180, 180) * S;
            const ry = H / 2 + randInt(-150, 150) * S;
            particles.push(new Particle(rx, ry, [255, 200, 220], 0.4));
          }
        }
      }

      // 4. Pháo hoa kim tuyến ở câu cuối
      if (currentMsgIndex === MESSAGES.length - 1) {
        if (now - lastFireworkTime > 450) {
          lastFireworkTime = now;
          const fx = rand(W * 0.15, W * 0.85);
          const fy = rand(H * 0.15, H / 2);
          const fc = [randInt(150, 255), randInt(150, 255), randInt(150, 255)];
          for (let i = 0; i < 60; i++) fireworks.push(new FireworkParticle(fx, fy, fc));
        }
      }

      // 5. Chữ LED chấm ở giữa (chữ hiện từ giữa mở rộng ra hai bên)
      if (state === 'TYPING' || state === 'HOLD') {
        if (charIndex > 0) {
          drawPixelText(partialOf(layout, charIndex), layout, W / 2, CY, textColor);
        }
      }
    }

    // 6. Cập nhật & vẽ hạt
    for (const p of particles) { p.update(); p.draw(); }
    particles = particles.filter((p) => p.alpha > 0);
    for (const f of fireworks) { f.update(); f.draw(); }
    fireworks = fireworks.filter((f) => f.alpha > 0);
  }

  function loop(t) {
    requestAnimationFrame(loop);
    acc += Math.min(t - lastT, 100);
    lastT = t;
    if (acc < FRAME_MS - 0.5) return;
    acc = Math.min(acc - FRAME_MS, FRAME_MS);
    frame();
  }

  // ====== Nhạc nền: phát từ giây 25, lặp vô tận ======
  const MUSIC_START = 25;
  function startMusic() {
    audio.volume = 0.8;
    const seek = () => { try { audio.currentTime = MUSIC_START; } catch (e) {} };
    audio.play().catch(() => {});
    if (audio.readyState >= 1) seek();
    else audio.addEventListener('loadedmetadata', seek, { once: true });
  }
  audio.addEventListener('ended', () => {
    audio.currentTime = MUSIC_START;
    audio.play().catch(() => {});
  });

  // ====== Bắt đầu khi người dùng chạm ======
  function begin() {
    if (started) return;
    started = true;
    startEl.classList.add('hide');
    setTimeout(() => startEl.remove(), 700);
    const n = performance.now();
    lastCharTime = lastMsgTime = lastFireworkTime = n;
    startMusic();
  }
  startEl.addEventListener('click', begin);
  startEl.addEventListener('touchend', (e) => { e.preventDefault(); begin(); });

  resize();
  requestAnimationFrame(loop);
})();