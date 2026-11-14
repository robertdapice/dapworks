'use strict';
// TETHERED — co-op. Two ships joined by an energy rope; the rope is the only weapon.
(function () {
  const LMAX = 400, SR = 15, HEARTS = 5;
  const ET = {
    blob: { r: 15, hp: 1, spd: 82, col: '#7CFF6B', pts: 10 },
    dart: { r: 12, hp: 1, spd: 0, col: '#FFD23F', pts: 20 },
    brute: { r: 28, hp: 3, spd: 46, col: '#C77DFF', pts: 50 },
    split: { r: 21, hp: 1, spd: 62, col: '#FF9F1C', pts: 30 },
    mini: { r: 9, hp: 1, spd: 150, col: '#FFBF69', pts: 5 },
    spit: { r: 17, hp: 1, spd: 60, col: '#FF5DA2', pts: 40 },
    boss: { r: 64, hp: 36, spd: 26, col: '#FF3860', pts: 500 },
  };
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    const cx = ax + dx * t, cy = ay + dy * t; return { d: Math.hypot(px - cx, py - cy), cx, cy };
  }
  function drawShip(g, x, y, ang, i, o) {
    o = o || {};
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(1.3, 1.3);
    if (o.flame) { g.fillStyle = '#FFD23F'; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(-12, -6); g.lineTo(-12 - 14 * o.flame - rand(6), 0); g.lineTo(-12, 6); g.fill(); g.globalAlpha = 1; }
    g.fillStyle = COLD[i]; g.beginPath(); g.moveTo(20, 0); g.lineTo(-13, -15); g.lineTo(-7, 0); g.lineTo(-13, 15); g.closePath(); g.fill();
    g.fillStyle = COL[i]; g.beginPath(); g.moveTo(17, 0); g.lineTo(-9, -11); g.lineTo(-4, 0); g.lineTo(-9, 11); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(4, 0, 4.5, 0, TAU); g.fill();
    g.restore();
  }
  function drawRope(g, ax, ay, bx, by, t, gold, alpha) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, amp = lerp(16, 3, clamp(d / LMAX, 0, 1)), N = 22;
    const path = () => { g.beginPath(); for (let i = 0; i <= N; i++) { const u = i / N, w = Math.sin(u * Math.PI) * (Math.sin(u * 9 + t * 11) * amp + Math.sin(u * 23 - t * 17) * amp * 0.35); const x = ax + dx * u + nx * w, y = ay + dy * u + ny * w; if (i) g.lineTo(x, y); else g.moveTo(x, y); } };
    const gr = g.createLinearGradient(ax, ay, bx, by);
    if (gold) { gr.addColorStop(0, '#FFD23F'); gr.addColorStop(0.5, '#fff'); gr.addColorStop(1, '#FFD23F'); } else { gr.addColorStop(0, COL[0]); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, COL[1]); }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = gr;
    g.globalAlpha = 0.16 * alpha; g.lineWidth = gold ? 26 : 18; path(); g.stroke();
    g.globalAlpha = 0.5 * alpha; g.lineWidth = 7; g.stroke();
    g.globalAlpha = alpha; g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
    g.restore();
  }
  function drawEnemy(g, e, t, look) {
    const T2 = ET[e.type], r = e.r * Math.min(1, e.age * 5), wob = Math.sin(t * 6 + e.seed) * 0.08;
    g.save(); g.translate(e.x, e.y);
    if (e.type === 'dart') {
      g.rotate(e.ang); g.fillStyle = e.flash > 0 ? '#fff' : T2.col; g.beginPath(); g.moveTo(r * 1.5, 0); g.lineTo(-r, -r * 0.9); g.lineTo(-r * 0.4, 0); g.lineTo(-r, r * 0.9); g.closePath(); g.fill();
      g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(r * 0.3, 0, r * 0.28, 0, TAU); g.fill(); g.restore(); return;
    }
    g.scale(1 + wob, 1 - wob);
    g.fillStyle = e.flash > 0 ? '#fff' : T2.col; g.beginPath();
    if (e.type === 'boss' || e.type === 'brute') { const n = e.type === 'boss' ? 12 : 8; for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU + t * (e.type === 'boss' ? 0.4 : 0.8), rr2 = i % 2 ? r : r * 0.86; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } }
    else if (e.type === 'split') { g.arc(-r * 0.35, 0, r * 0.75, 0, TAU); g.arc(r * 0.35, 0, r * 0.75, 0, TAU); }
    else g.arc(0, 0, r, 0, TAU);
    g.fill();
    g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.arc(0, r * 0.25, r * 0.8, 0.2, Math.PI - 0.2); g.fill(); g.globalAlpha = 1;
    const er = r * (e.type === 'boss' ? 0.2 : 0.3), ex = r * 0.36;
    for (const s of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex, -r * 0.12, er, 0, TAU); g.fill();
      g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(s * ex + look.x * er * 0.45, -r * 0.12 + look.y * er * 0.45, er * 0.5, 0, TAU); g.fill();
    }
    if (e.type === 'brute' || e.type === 'boss') { g.strokeStyle = '#0a0d18'; g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(-ex - er, -r * 0.5); g.lineTo(-ex + er, -r * 0.3); g.moveTo(ex + er, -r * 0.5); g.lineTo(ex - er, -r * 0.3); g.stroke(); }
    if (e.type === 'spit') { g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(0, r * 0.4, r * 0.22, 0, TAU); g.fill(); }
    g.restore();
  }

  function create() {
    const P = E.players;
    const st = { ships: [], en: [], shots: [], warn: [], drops: [], hearts: HEARTS, score: 0, wave: 0, queue: [], spawnT: 0, phase: 'ready', pt: 1.6,
      combo: 0, comboT: 0, charge: 0, novaT: 0, novaX: 0, novaY: 0, kills: 0, best: +(localStorage.getItem('cc_tether_best') || 0), over: false, hintT: 6, hpPop: 0 };
    st.ships = [0, 1].map(i => ({ i, x: W / 2 + (i ? 110 : -110), y: H / 2, vx: 0, vy: 0, ang: i ? 0 : Math.PI, inv: 0, dashT: 0, dashCd: 0, dead: false }));
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    (function () {
      const b = bg.getContext('2d'), gr = b.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0a0b24'); gr.addColorStop(1, '#1d0f3a'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
      for (const [x, y, r, c] of [[260, 200, 320, '#35C2FF'], [1000, 520, 380, '#FF5D73'], [760, 120, 220, '#C77DFF']]) { const n = b.createRadialGradient(x, y, 0, x, y, r); n.addColorStop(0, c); n.addColorStop(1, 'transparent'); b.globalAlpha = 0.13; b.fillStyle = n; b.fillRect(0, 0, W, H); }
      b.globalAlpha = 1;
    })();
    const stars = []; for (let i = 0; i < 130; i++) stars.push({ x: rand(W), y: rand(H), r: rand(0.6, 2.2), p: rand(TAU), s: rand(1, 4) });

    function makeWave(n) {
      const list = [];
      if (n % 5 === 0) { list.push('boss'); for (let i = 0; i < 4 + n; i++) list.push(i % 3 ? 'blob' : 'dart'); return list; }
      const count = 5 + n * 2;
      for (let i = 0; i < count; i++) {
        const r = Math.random(); let t = 'blob';
        if (n >= 2 && r < 0.22) t = 'dart'; else if (n >= 3 && r < 0.36) t = 'brute'; else if (n >= 4 && r < 0.5) t = 'split'; else if (n >= 6 && r < 0.62) t = 'spit';
        list.push(t);
      }
      return list;
    }
    function nextWave() {
      st.wave++; st.queue = makeWave(st.wave); st.spawnT = 0.8; st.phase = 'play';
      FX.banner(st.wave % 5 === 0 ? 'BOSS WAVE' : 'WAVE ' + st.wave, { size: 100, life: 1.3, color: st.wave % 5 === 0 ? '#FF3860' : '#fff' }); S.wave();
    }
    function spawn(type, x, y) {
      const T2 = ET[type], sc = 1 + st.wave * 0.035;
      st.en.push({ type, x, y, vx: 0, vy: 0, r: T2.r, hp: type === 'boss' ? T2.hp + st.wave * 2 : T2.hp, maxHp: type === 'boss' ? T2.hp + st.wave * 2 : T2.hp, spd: T2.spd * sc, age: 0, seed: rand(TAU), flash: 0, hitCd: 0, ang: 0, mode: 'aim', mt: rand(0.6, 1.2), shootT: rand(1.5, 3), t2: 3 });
    }
    function edgePoint() {
      const s = Math.random() * 4 | 0;
      return s === 0 ? [rand(60, W - 60), 36] : s === 1 ? [rand(60, W - 60), H - 36] : s === 2 ? [36, rand(60, H - 60)] : [W - 36, rand(60, H - 60)];
    }
    function killEnemy(e, silent) {
      if (e.dead) return; e.dead = true;
      const T2 = ET[e.type];
      st.combo++; st.comboT = 1.7; st.kills++;
      const mult = Math.min(10, 1 + Math.floor(st.combo / 3)), pts = T2.pts * mult; st.score += pts;
      st.charge = Math.min(1, st.charge + (e.type === 'boss' ? 0.5 : e.type === 'mini' ? 0.012 : 0.034));
      FX.burst(e.x, e.y, { n: e.type === 'boss' ? 80 : 10 + e.r * 0.6, color: [T2.col, '#fff'], speed: e.type === 'boss' ? 700 : 300, life: e.type === 'boss' ? 1.2 : 0.5, size: e.type === 'boss' ? 10 : 5 });
      FX.ring(e.x, e.y, { r1: e.r * 3, color: T2.col, w: 5, life: 0.35 });
      FX.text(e.x, e.y - e.r - 6, '+' + pts, { color: mult > 1 ? '#FFD23F' : '#fff', size: 18 + Math.min(16, mult * 2) });
      if (!silent) S.pop(e.x, st.combo);
      if (e.type === 'split') for (let k = 0; k < 3; k++) { const a = rand(TAU); spawn('mini', e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14); const m = st.en[st.en.length - 1]; m.vx = Math.cos(a) * 260; m.vy = Math.sin(a) * 260; m.age = 0.2; m.hitCd = 0.35; }
      if (e.type === 'brute' && Math.random() < 0.15 && st.hearts < HEARTS) st.drops.push({ x: e.x, y: e.y, age: 0 });
      if (e.type === 'boss') { S.boom(e.x, true); E.shake(22); E.slow(0.3, 0.9); E.flash('#fff', 0.5); st.drops.push({ x: e.x, y: e.y, age: 0 }); }
      else E.shake(Math.min(6, 1.5 + st.combo * 0.3));
    }
    function hurt(s) {
      if (s.inv > 0 || s.dashT > 0 || st.over) return;
      st.hearts--; st.hpPop = 1; s.inv = 1.7; st.combo = 0;
      FX.burst(s.x, s.y, { n: 30, color: [COL[s.i], '#fff', '#FF3860'], speed: 420, life: 0.6, size: 6 }); FX.ring(s.x, s.y, { r1: 150, color: '#fff', w: 10, life: 0.4 });
      for (const e of st.en) { const d = dist(e.x, e.y, s.x, s.y); if (d < 150) { if (e.hp <= 1 && e.type !== 'boss') killEnemy(e, true); else { e.vx += (e.x - s.x) / (d || 1) * 400; e.vy += (e.y - s.y) / (d || 1) * 400; } } }
      st.shots = st.shots.filter(b => dist(b.x, b.y, s.x, s.y) > 150);
      S.hurt(); E.shake(16); E.flash('#FF3860', 0.3); E.buzz(s.i, 250); E.buzz(1 - s.i, 80); E.freeze(0.06);
      if (st.hearts <= 0) {
        st.over = true; st.phase = 'over';
        for (const sh of st.ships) { sh.dead = true; FX.burst(sh.x, sh.y, { n: 50, color: [COL[sh.i], '#fff', '#FFD23F'], speed: 520, life: 1, size: 8 }); }
        S.boom(W / 2, true); E.slow(0.3, 1.2);
        const nb = st.score > st.best; if (nb) { st.best = st.score; localStorage.setItem('cc_tether_best', String(st.score)); }
        E.endMatch({ winner: -1, lose: !nb, title: nb ? 'NEW BEST!' : 'GAME OVER', color: nb ? '#FFD23F' : '#FF5D73', sub: 'Wave ' + st.wave + '  ·  ' + st.score + ' pts  ·  best ' + st.best });
      }
    }
    function nova() {
      const [a, b] = st.ships; st.charge = 0; st.novaT = 0.9; st.novaX = (a.x + b.x) / 2; st.novaY = (a.y + b.y) / 2;
      for (const e of st.en) { if (e.type === 'boss') { e.hp -= 12; e.flash = 0.3; if (e.hp <= 0) killEnemy(e, true); } else killEnemy(e, true); }
      st.shots = []; S.nova(); E.shake(24); E.flash('#FFD23F', 0.6); E.slow(0.35, 0.8); E.buzz(-1, 400);
      FX.banner('SUPERNOVA!', { color: '#FFD23F', size: 120, life: 1.2 });
      for (let k = 0; k < 3; k++) FX.ring(st.novaX, st.novaY, { r0: 20, r1: 900, color: k ? '#FFD23F' : '#fff', w: 26 - k * 6, life: 0.7 + k * 0.2 });
    }
    function nearest(x, y) { const [a, b] = st.ships; return dist(x, y, a.x, a.y) < dist(x, y, b.x, b.y) ? a : b; }

    return {
      update(dt) {
        const [a, b] = st.ships;
        if (st.phase === 'ready') { st.pt -= dt; if (st.pt <= 0) nextWave(); }
        // ships
        if (!st.over) for (const s of st.ships) {
          const p = P[s.i]; s.inv -= dt; s.dashCd -= dt;
          if (s.dashT > 0) { s.dashT -= dt; FX.burst(s.x, s.y, { n: 1, color: COL[s.i], speed: 20, life: 0.3, size: 11 }); }
          else {
            const k = 1 - Math.exp(-9 * dt); s.vx += (p.x * 400 - s.vx) * k; s.vy += (p.y * 400 - s.vy) * k;
            if (p.ap && s.dashCd <= 0) { const an = p.mag > 0.25 ? Math.atan2(p.y, p.x) : s.ang; s.vx = Math.cos(an) * 980; s.vy = Math.sin(an) * 980; s.dashT = 0.17; s.dashCd = 0.9; S.dash(s.x); FX.ring(s.x, s.y, { r1: 44, color: COL[s.i], w: 4, life: 0.25 }); }
          }
          s.x += s.vx * dt; s.y += s.vy * dt;
          const sp = Math.hypot(s.vx, s.vy); if (sp > 30) s.ang = angLerp(s.ang, Math.atan2(s.vy, s.vx), 1 - Math.exp(-14 * dt));
          if (p.mag > 0.3 && Math.random() < 0.6) FX.burst(s.x - Math.cos(s.ang) * 14, s.y - Math.sin(s.ang) * 14, { n: 1, color: [COL[s.i], '#fff'], ang: s.ang + Math.PI, spread: 0.4, speed: 140, life: 0.3, size: 3 });
        }
        // rope length limit: pull both ships back together
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        if (d > LMAX) {
          const nx = dx / d, ny = dy / d, o = (d - LMAX) / 2; a.x += nx * o; a.y += ny * o; b.x -= nx * o; b.y -= ny * o;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rel > 0) { a.vx += nx * rel * 0.5; a.vy += ny * rel * 0.5; b.vx -= nx * rel * 0.5; b.vy -= ny * rel * 0.5; }
        }
        for (const s of st.ships) { s.x = clamp(s.x, 24, W - 24); s.y = clamp(s.y, 24, H - 24); }
        dx = b.x - a.x; dy = b.y - a.y; d = Math.hypot(dx, dy);
        const ropeOn = d > 34 && !st.over;
        // spawning
        if (st.phase === 'play') {
          st.spawnT -= dt;
          if (st.spawnT <= 0 && st.queue.length && st.en.length < 40) {
            st.spawnT = Math.max(0.22, 0.85 - st.wave * 0.045);
            const type = st.queue.shift(), [x, y] = type === 'boss' ? [W / 2, 90] : edgePoint();
            st.warn.push({ x, y, type, t: type === 'boss' ? 1.4 : 0.7 });
          }
          if (!st.queue.length && !st.en.length && !st.warn.length) {
            st.phase = 'rest'; st.pt = 2.4; FX.banner('WAVE CLEAR!', { color: '#7CFF6B', size: 90, life: 1.2 }); S.power();
            st.score += st.wave * 50; if (st.hearts < HEARTS) st.drops.push({ x: W / 2, y: H / 2, age: 0 });
          }
        } else if (st.phase === 'rest') { st.pt -= dt; if (st.pt <= 0) nextWave(); }
        for (let i = st.warn.length - 1; i >= 0; i--) { const w = st.warn[i]; w.t -= dt; if (w.t <= 0) { spawn(w.type, w.x, w.y); st.warn.splice(i, 1); } }
        // enemies
        for (const e of st.en) {
          e.age += dt; e.flash -= dt; e.hitCd -= dt;
          const tg = nearest(e.x, e.y), tx = tg.x - e.x, ty = tg.y - e.y, td = Math.hypot(tx, ty) || 1;
          if (e.type === 'dart') {
            e.mt -= dt;
            if (e.mode === 'aim') { e.ang = angLerp(e.ang, Math.atan2(ty, tx), 1 - Math.exp(-6 * dt)); e.vx *= 0.9; e.vy *= 0.9; if (e.mt <= 0) { e.mode = 'dash'; e.mt = 0.85; e.vx = Math.cos(e.ang) * 640; e.vy = Math.sin(e.ang) * 640; S.whoosh(e.x); } }
            else if (e.mode === 'dash') { FX.burst(e.x, e.y, { n: 1, color: '#FFD23F', speed: 10, life: 0.25, size: 6 }); if (e.mt <= 0) { e.mode = 'aim'; e.mt = rand(0.9, 1.5); } }
          } else if (e.type === 'spit') {
            const want = td > 360 ? 1 : td < 240 ? -1 : 0, k = 1 - Math.exp(-3 * dt);
            e.vx += (tx / td * e.spd * want - e.vx) * k; e.vy += (ty / td * e.spd * want - e.vy) * k;
            e.shootT -= dt; if (e.shootT <= 0 && e.age > 1) { e.shootT = 2.6; st.shots.push({ x: e.x, y: e.y, vx: tx / td * 180, vy: ty / td * 180, r: 7 }); S.zap(e.x); }
          } else {
            const k = 1 - Math.exp(-(e.type === 'mini' ? 2.5 : 3.5) * dt);
            e.vx += (tx / td * e.spd - e.vx) * k; e.vy += (ty / td * e.spd - e.vy) * k;
            if (e.type === 'boss') {
              e.shootT -= dt; e.t2 -= dt;
              if (e.shootT <= 0) { e.shootT = 4.2; const o = rand(TAU); for (let k2 = 0; k2 < 10; k2++) st.shots.push({ x: e.x, y: e.y, vx: Math.cos(o + k2 * TAU / 10) * 150, vy: Math.sin(o + k2 * TAU / 10) * 150, r: 8 }); S.zap(e.x); FX.ring(e.x, e.y, { r1: 120, color: '#FF3860', w: 6 }); }
              if (e.t2 <= 0 && st.en.length < 30) { e.t2 = 3.2; for (let k2 = 0; k2 < 3; k2++) spawn('blob', e.x + rand(-40, 40), e.y + rand(-40, 40)); }
            }
          }
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx); } if (e.x > W - e.r) { e.x = W - e.r; e.vx = -Math.abs(e.vx); }
          if (e.y < e.r) { e.y = e.r; e.vy = Math.abs(e.vy); } if (e.y > H - e.r) { e.y = H - e.r; e.vy = -Math.abs(e.vy); }
          if (e.age < 0.25) continue;
          if (ropeOn && e.hitCd <= 0) {
            const h = segDist(e.x, e.y, a.x, a.y, b.x, b.y);
            if (h.d < e.r + 7) {
              e.hp--; e.flash = 0.12; e.hitCd = e.type === 'boss' ? 0.16 : 0.4;
              FX.burst(h.cx, h.cy, { n: 6, color: ['#fff', ET[e.type].col], speed: 220, life: 0.3, size: 4 });
              if (e.hp <= 0) killEnemy(e);
              else { const n = Math.hypot(e.x - h.cx, e.y - h.cy) || 1, kb = e.type === 'boss' ? 90 : 300; e.vx += (e.x - h.cx) / n * kb; e.vy += (e.y - h.cy) / n * kb; S.tink(e.x); E.shake(3); }
            }
          }
          if (!e.dead) for (const s of st.ships) if (dist(e.x, e.y, s.x, s.y) < e.r + SR - 4) hurt(s);
        }
        st.en = st.en.filter(e => !e.dead);
        // enemy shots: the rope blocks them
        for (const sh of st.shots) {
          sh.x += sh.vx * dt; sh.y += sh.vy * dt;
          if (sh.x < -20 || sh.x > W + 20 || sh.y < -20 || sh.y > H + 20) sh.dead = true;
          else if (ropeOn && segDist(sh.x, sh.y, a.x, a.y, b.x, b.y).d < sh.r + 6) { sh.dead = true; st.score += 2; FX.burst(sh.x, sh.y, { n: 6, color: ['#FF5DA2', '#fff'], speed: 180, life: 0.25, size: 3 }); S.tink(sh.x); }
          else for (const s of st.ships) if (dist(sh.x, sh.y, s.x, s.y) < sh.r + SR - 3 && s.inv <= 0 && s.dashT <= 0) { sh.dead = true; hurt(s); }
        }
        st.shots = st.shots.filter(s => !s.dead);
        // heart drops
        for (let i = st.drops.length - 1; i >= 0; i--) {
          const h = st.drops[i]; h.age += dt;
          if (st.ships.some(s => dist(s.x, s.y, h.x, h.y) < 34) && !st.over) { st.drops.splice(i, 1); st.hearts = Math.min(HEARTS, st.hearts + 1); st.hpPop = 1; S.pickup(); FX.text(h.x, h.y - 20, '+1 HEART', { color: '#FF5D73', size: 26 }); FX.burst(h.x, h.y, { n: 16, color: ['#FF5D73', '#fff'], speed: 240 }); }
          else if (h.age > 12) st.drops.splice(i, 1);
        }
        // supernova: both hold B when charged
        if (st.charge >= 1 && !st.over && P[0].b && P[1].b) nova();
        st.comboT -= dt; if (st.comboT <= 0) st.combo = 0;
        st.novaT -= dt; st.hpPop = Math.max(0, st.hpPop - dt * 2); st.hintT -= dt;
        FX.update(dt);
      },
      draw(g) {
        const t = E.t, [a, b] = st.ships;
        g.drawImage(bg, 0, 0);
        g.fillStyle = '#fff'; for (const s of stars) { g.globalAlpha = 0.35 + 0.35 * Math.sin(t * s.s + s.p); g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); } g.globalAlpha = 1;
        for (const w of st.warn) { const c = ET[w.type].col; g.strokeStyle = c; g.lineWidth = 3; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 24); g.beginPath(); g.arc(w.x, w.y, ET[w.type].r + 8 + w.t * 30, 0, TAU); g.stroke(); txt('!', w.x, w.y + 1, 22, c); g.globalAlpha = 1; }
        for (const h of st.drops) { const s = 1 + Math.sin(h.age * 6) * 0.12; g.save(); g.translate(h.x, h.y); g.scale(s, s); g.globalAlpha = h.age > 9 ? 0.5 + 0.5 * Math.sin(h.age * 20) : 1; txt('♥', 0, 2, 38, '#FF5D73', { stroke: '#fff', sw: 5 }); g.restore(); g.globalAlpha = 1; }
        // dart telegraphs
        for (const e of st.en) if (e.type === 'dart' && e.mode === 'aim' && e.mt < 0.7) { g.strokeStyle = '#FFD23F'; g.globalAlpha = 0.35; g.lineWidth = 2; g.setLineDash([8, 10]); g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.ang) * 520, e.y + Math.sin(e.ang) * 520); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
        if (!st.over) {
          const d = dist(a.x, a.y, b.x, b.y), full = st.charge >= 1;
          drawRope(g, a.x, a.y, b.x, b.y, t, full, d > 34 ? 1 : 0.25);
          if (d > LMAX - 14) { g.globalAlpha = 0.5; txt('MAX', (a.x + b.x) / 2, (a.y + b.y) / 2 - 22, 13, '#fff'); g.globalAlpha = 1; }
        }
        for (const e of st.en) { const tg = nearest(e.x, e.y), dd = dist(tg.x, tg.y, e.x, e.y) || 1; drawEnemy(g, e, t, { x: (tg.x - e.x) / dd, y: (tg.y - e.y) / dd }); }
        for (const s of st.shots) { g.fillStyle = '#FF5DA2'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, s.r * 0.5, 0, TAU); g.fill(); }
        if (!st.over) for (const s of st.ships) {
          if (s.inv > 0 && Math.sin(t * 40) > 0) continue;
          drawShip(g, s.x, s.y, s.ang, s.i, { flame: P[s.i].mag });
          if (st.charge >= 1) { g.strokeStyle = P[s.i].b ? '#FFD23F' : 'rgba(255,210,63,0.4)'; g.lineWidth = P[s.i].b ? 5 : 2; g.beginPath(); g.arc(s.x, s.y, 28 + Math.sin(t * 10) * 3, 0, TAU); g.stroke(); }
          txt(P[s.i].name, s.x, s.y - 30, 12, COL[s.i], { stroke: '#0a0d18' });
        }
        FX.draw(g);
        // boss bar
        const boss = st.en.find(e => e.type === 'boss');
        if (boss) { rr(W / 2 - 220, 64, 440, 16, 8); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill(); rr(W / 2 - 220, 64, Math.max(16, 440 * boss.hp / boss.maxHp), 16, 8); g.fillStyle = '#FF3860'; g.fill(); }
        // HUD
        for (let i = 0; i < HEARTS; i++) { const on = i < st.hearts, s = on && i === st.hearts - 1 ? 1 + st.hpPop * 0.5 : 1; txt('♥', 40 + i * 38, 36, 34 * s, on ? '#FF5D73' : 'rgba(255,255,255,0.15)', { stroke: on ? '#0a0d18' : undefined }); }
        txt('WAVE ' + Math.max(1, st.wave), W / 2, 28, 22, 'rgba(255,255,255,0.7)');
        txt(String(st.score), W - 30, 34, 40, '#fff', { align: 'right', stroke: '#0a0d18' });
        txt('BEST ' + Math.max(st.best, st.score), W - 30, 66, 14, 'rgba(255,255,255,0.5)', { align: 'right' });
        const mult = Math.min(10, 1 + Math.floor(st.combo / 3));
        if (mult > 1) txt('x' + mult, W - 30, 100, 34 + Math.sin(t * 14) * 3, '#FFD23F', { align: 'right', stroke: '#0a0d18' });
        const bw = 360, bx = W / 2 - bw / 2, by = H - 34, full = st.charge >= 1;
        rr(bx, by, bw, 16, 8); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
        rr(bx, by, Math.max(16, bw * st.charge), 16, 8); g.fillStyle = full ? (Math.sin(t * 12) > 0 ? '#FFD23F' : '#fff') : '#C77DFF'; g.fill();
        txt(full ? 'BOTH HOLD  B  —  SUPERNOVA!' : 'SUPERNOVA', W / 2, by - 16, full ? 22 : 13, full ? '#FFD23F' : 'rgba(255,255,255,0.5)', { stroke: full ? '#0a0d18' : undefined });
        if (st.hintT > 0 && st.wave <= 1) { g.globalAlpha = Math.min(1, st.hintT); txt('Sweep the rope through them — do not let them touch your ships', W / 2, H - 90, 22, '#fff', { stroke: '#0a0d18' }); g.globalAlpha = 1; }
        FX.drawText(g);
      },
    };
  }

  GAMES.push({
    id: 'tether', name: 'TETHERED', tag: 'CO-OP', color: '#C77DFF',
    tagline: 'Two ships, one rope. The rope is your weapon.',
    pad: { a: 'BOOST', b: 'NOVA', stick: 'FLY' },
    how: { goal: 'Survive the waves together and beat your best score', rows: [['STICK', 'Fly your ship'], ['A', 'Boost — you are untouchable mid-boost'], ['B', 'Both hold B when the bar is full: SUPERNOVA']],
      tips: ['Enemies die when the rope touches them — ships do not hurt them', 'The rope also blocks enemy shots. Chain kills for a multiplier'] },
    song: { bpm: 116, root: 50, minor: true, prog: [0, 5, 3, 4], kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x-x-x-', bass: 'x---x--xx---x-o-', arp: '0-2-1-3-0-2-1-3-', arpWave: 'triangle' },
    icon(g, t) {
      const ax = -70 + Math.sin(t * 1.7) * 16, ay = Math.cos(t * 1.3) * 26, bx = 70 + Math.sin(t * 1.1) * 16, by = -Math.cos(t * 1.9) * 26;
      drawRope(g, ax, ay, bx, by, t, false, 1);
      drawShip(g, ax, ay, Math.PI + Math.sin(t) * 0.4, 0); drawShip(g, bx, by, Math.sin(t * 1.2) * 0.4, 1);
      const ey = ((t * 40) % 90) - 45;
      drawEnemy(g, { type: 'blob', x: 0, y: ey, r: 13, age: 1, seed: 0, flash: 0 }, t, { x: 0, y: 1 });
    },
    create,
  });
})();
