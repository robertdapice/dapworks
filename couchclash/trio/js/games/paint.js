'use strict';
// PAINT WARS (three-player edition) — top-down territory painting, free-for-all.
// Most floor covered when the clock hits zero wins the round.
(function () {
  const TOP = 64, CELL = 16, GW = 80, GH = 41;            // arena is y 64..720, grid of 16px cells
  const ROUND_T = 45, WINS = 2, BR = 20;                   // round seconds, rounds to win, buggy radius
  const SPEED = 270, SPEED_FAST = 390, BRUSH = 22, BRUSH_MEGA = 42;
  const DASH_V = 860, DASH_T = 0.2, DASH_CD = 1.5, DASH_SPLAT = 64;
  const BOMB_RANGE = 260, BOMB_T = 0.62, BOMB_CD = 4, BOMB_SPLAT = 92;
  const POW = {
    mega: { c: '#C77DFF', label: 'MEGA BRUSH!' },
    speed: { c: '#FFD23F', label: 'SPEED!' },
    bucket: { c: '#FF9F1C', label: 'PAINT BUCKET!' },     // orange: green is P3's paint
  };
  // obstacles in grid cells [col, row, w, h]. Left/right symmetric; the long bar sits at the top,
  // far from P3's bottom-centre start, so nobody's spawn is boxed in.
  const OBST = [[38, 18, 4, 5], [18, 8, 3, 3], [59, 8, 3, 3], [18, 30, 3, 3], [59, 30, 3, 3], [28, 13, 2, 6], [50, 22, 2, 6], [34, 6, 12, 2]];
  const WALL = 9;                                          // grid value for an obstacle cell
  const MIDY = TOP + (H - TOP) / 2;
  const SPAWN = [{ x: 120, y: MIDY, ang: 0 }, { x: W - 120, y: MIDY, ang: Math.PI }, { x: W / 2, y: H - 76, ang: -Math.PI / 2 }];

  function create() {
    const P = E.players;
    const grid = new Uint8Array(GW * GH);                  // 0 bare, 1..3 owner (player + 1), WALL obstacle
    const obs = [];
    for (const q of OBST) {
      obs.push({ x: q[0] * CELL, y: TOP + q[1] * CELL, w: q[2] * CELL, h: q[3] * CELL });
      for (let r = q[1]; r < q[1] + q[3]; r++) for (let c = q[0]; c < q[0] + q[2]; c++) grid[r * GW + c] = WALL;
    }
    let total = 0; for (let i = 0; i < grid.length; i++) if (grid[i] !== WALL) total++;

    // static floor + the wet-paint layer
    const floor = document.createElement('canvas'); floor.width = W; floor.height = H;
    const fg = floor.getContext('2d');
    fg.fillStyle = '#ECE6D8'; fg.fillRect(0, 0, W, H);
    for (let i = 0; i < 700; i++) { fg.fillStyle = 'rgba(60,40,20,' + rand(0.02, 0.07) + ')'; fg.beginPath(); fg.arc(rand(W), rand(TOP, H), rand(1, 4), 0, TAU); fg.fill(); }
    fg.strokeStyle = 'rgba(60,40,20,0.07)'; fg.lineWidth = 2;
    for (let x = 80; x < W; x += 80) { fg.beginPath(); fg.moveTo(x, TOP); fg.lineTo(x, H); fg.stroke(); }
    for (let y = TOP + 72; y < H; y += 80) { fg.beginPath(); fg.moveTo(0, y); fg.lineTo(W, y); fg.stroke(); }
    fg.strokeStyle = 'rgba(40,30,20,0.25)'; fg.lineWidth = 10; fg.strokeRect(0, TOP, W, H - TOP);
    const paint = document.createElement('canvas'); paint.width = W; paint.height = H;
    const pg = paint.getContext('2d');

    const st = {
      phase: 'ready', pt: 0, round: 0, wins: [0, 0, 0], time: ROUND_T, counts: [0, 0, 0], lastSec: ROUND_T,
      bugs: [], bombs: [], pows: [], powT: 5, tally: null, pulse: 0, pipPop: [0, 0, 0],
    };

    // ---------- painting ----------
    function paintCells(x, y, r, o) {
      const c0 = Math.max(0, Math.floor((x - r) / CELL)), c1 = Math.min(GW - 1, Math.floor((x + r) / CELL));
      const r0 = Math.max(0, Math.floor((y - TOP - r) / CELL)), r1 = Math.min(GH - 1, Math.floor((y - TOP + r) / CELL));
      const r2 = r * r, me = o + 1;
      for (let rr2 = r0; rr2 <= r1; rr2++) {
        const cy = TOP + rr2 * CELL + 8 - y;
        for (let c = c0; c <= c1; c++) {
          const cx = c * CELL + 8 - x;
          if (cx * cx + cy * cy > r2) continue;
          const i = rr2 * GW + c, v = grid[i];
          if (v === WALL || v === me) continue;
          if (v) st.counts[v - 1]--;
          grid[i] = me; st.counts[o]++;
        }
      }
    }
    // stamp a blob of wet paint: ownership grid + visuals. messy adds splatter lobes and droplets.
    function stamp(x, y, r, o, messy) {
      paintCells(x, y, r, o);
      pg.fillStyle = COL[o];
      pg.beginPath(); pg.arc(x, y, r, 0, TAU); pg.fill();
      if (messy) {
        const n = 8 + Math.floor(r / 10);
        for (let i = 0; i < n; i++) {
          const a = rand(TAU), d = r * rand(0.78, 1.12), q = r * rand(0.1, 0.28);
          pg.beginPath(); pg.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, q, 0, TAU); pg.fill();
        }
        for (let i = 0; i < n; i++) {
          const a = rand(TAU), d = r * rand(1.25, 1.7);
          pg.beginPath(); pg.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rand(2, 4) + r * 0.03, 0, TAU); pg.fill();
        }
      }
      pg.globalAlpha = messy ? 0.14 : 0.09; pg.fillStyle = COLL[o];
      pg.beginPath(); pg.arc(x - r * 0.18, y - r * 0.18, r * 0.5, 0, TAU); pg.fill();
      pg.globalAlpha = 1;
    }
    function splatFx(x, y, o, n, speed) {
      FX.burst(x, y, { n, color: [COL[o], COL[o], COLL[o]], speed: speed || 320, life: 0.55, size: 6, add: false, grav: 0, drag: 3.5 });
    }

    // ---------- round flow ----------
    function newRound() {
      st.round++; st.phase = 'ready'; st.pt = 1.7; st.time = ROUND_T; st.lastSec = ROUND_T; st.tally = null;
      for (let i = 0; i < grid.length; i++) if (grid[i] !== WALL) grid[i] = 0;
      st.counts[0] = st.counts[1] = st.counts[2] = 0;
      pg.clearRect(0, 0, W, H);
      st.bombs.length = 0; st.pows.length = 0; st.powT = 5;
      st.bugs = [0, 1, 2].map(i => ({
        i, x: SPAWN[i].x, y: SPAWN[i].y, vx: 0, vy: 0, ang: SPAWN[i].ang, spin: 0, stretch: 0,
        dashT: 0, dashCd: 0, bombCd: 0, stun: 0, inv: 0, megaT: 0, speedT: 0, dx: 1, dy: 0, lx: -99, ly: -99, drip: 0,
      }));
      for (const b of st.bugs) stamp(b.x, b.y, 46, b.i, true);
      FX.banner('ROUND ' + st.round, { size: 104, life: 1.2, color: '#fff', sub: st.round === 1 ? 'PAINT THE MOST FLOOR!' : '' });
      S.count();
    }

    function stun(b, secs, by) {
      if (b.inv > 0 || b.stun > 0) return false;
      b.stun = secs; b.dashT = 0; b.inv = secs + 0.7;
      E.buzz(b.i, 160); S.hit(b.x); E.shake(7); E.freeze(0.05);
      FX.burst(b.x, b.y, { n: 10, color: ['#FFD23F', '#fff'], speed: 260, life: 0.5, size: 5, add: false });
      FX.text(b.x, b.y - 34, 'SPLAT!', { color: COL[by], size: 30 });
      return true;
    }

    function collide(b) {
      b.x = clamp(b.x, BR, W - BR); b.y = clamp(b.y, TOP + BR, H - BR);
      for (const o of obs) {
        const nx = clamp(b.x, o.x, o.x + o.w), ny = clamp(b.y, o.y, o.y + o.h);
        let dx = b.x - nx, dy = b.y - ny; const d2 = dx * dx + dy * dy;
        if (d2 >= BR * BR) continue;
        if (d2 > 0.0001) { const d = Math.sqrt(d2); b.x += dx / d * (BR - d); b.y += dy / d * (BR - d); }
        else {                                              // centre inside the block: pop out of the nearest side
          const l = b.x - o.x, r = o.x + o.w - b.x, t = b.y - o.y, bt = o.y + o.h - b.y, m = Math.min(l, r, t, bt);
          if (m === l) b.x = o.x - BR; else if (m === r) b.x = o.x + o.w + BR; else if (m === t) b.y = o.y - BR; else b.y = o.y + o.h + BR;
        }
      }
    }

    function updBug(b, p, dt, live) {
      b.dashCd -= dt; b.bombCd -= dt; b.megaT -= dt; b.speedT -= dt; b.inv -= dt;
      b.stretch *= Math.exp(-9 * dt);
      if (b.stun > 0) {
        b.stun -= dt; b.spin += dt * 16;
        const k = Math.exp(-4 * dt); b.vx *= k; b.vy *= k;
        if (b.stun <= 0) b.spin = 0;
      } else if (b.dashT > 0) {
        b.dashT -= dt; b.vx = b.dx * DASH_V; b.vy = b.dy * DASH_V; b.stretch = 0.32;
        if (b.dashT <= 0) {
          b.vx *= 0.25; b.vy *= 0.25; b.stretch = -0.3;
          stamp(b.x, b.y, DASH_SPLAT, b.i, true); splatFx(b.x, b.y, b.i, 22); FX.ring(b.x, b.y, { color: COL[b.i], r1: 90, life: 0.3, w: 6 });
          S.splash(b.x); E.shake(4);
        }
      } else {
        const sp = b.speedT > 0 ? SPEED_FAST : SPEED, k = 1 - Math.exp(-10 * dt);
        b.vx += (p.x * sp - b.vx) * k; b.vy += (p.y * sp - b.vy) * k;
        if (p.mag > 0.2) b.ang = angLerp(b.ang, Math.atan2(p.y, p.x), 1 - Math.exp(-14 * dt));
        if (live && p.ap && b.dashCd <= 0) {
          if (p.mag > 0.3) { const m = Math.hypot(p.x, p.y); b.dx = p.x / m; b.dy = p.y / m; b.ang = Math.atan2(p.y, p.x); }
          else { b.dx = Math.cos(b.ang); b.dy = Math.sin(b.ang); }
          b.dashT = DASH_T; b.dashCd = DASH_CD; S.dash(b.x);
        }
        if (live && p.bp && b.bombCd <= 0) {
          const dx = Math.cos(b.ang), dy = Math.sin(b.ang);
          st.bombs.push({ o: b.i, x0: b.x + dx * 18, y0: b.y + dy * 18, x1: clamp(b.x + dx * BOMB_RANGE, 24, W - 24), y1: clamp(b.y + dy * BOMB_RANGE, TOP + 24, H - 24), t: 0, drip: 0 });
          b.bombCd = BOMB_CD; b.stretch = -0.2; S.whoosh(b.x);
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; collide(b);
      if (b.stun <= 0) {
        const r = Math.max(b.megaT > 0 ? BRUSH_MEGA : BRUSH, b.dashT > 0 ? 30 : 0);
        if (Math.hypot(b.x - b.lx, b.y - b.ly) > 3) {
          stamp(b.x, b.y, r, b.i, false); b.lx = b.x; b.ly = b.y;
          b.drip -= dt;
          if (b.drip <= 0) {
            b.drip = b.megaT > 0 ? 0.03 : 0.07;
            FX.burst(b.x - Math.cos(b.ang) * 14, b.y - Math.sin(b.ang) * 14, { n: 1, color: COL[b.i], speed: 90, life: 0.35, size: 4, add: false });
          }
        }
      }
    }

    function bugsCollide() {
      for (let i = 0; i < st.bugs.length; i++) for (let j = i + 1; j < st.bugs.length; j++) pairCollide(st.bugs[i], st.bugs[j]);
    }
    function pairCollide(a, b) {
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= BR * 2) return;
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      const nx = dx / d, ny = dy / d, push = (BR * 2 - d) / 2;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      const ad = a.dashT > 0, bd = b.dashT > 0;
      const ram = (hit, vic, sx, sy) => {
        if (!stun(vic, 0.8, hit.i)) return;
        vic.vx = sx * 520; vic.vy = sy * 520;
        stamp(vic.x, vic.y, 58, hit.i, true); splatFx(vic.x, vic.y, hit.i, 26, 420);
      };
      if (ad && bd) {
        a.dashT = b.dashT = 0; a.vx = -nx * 420; a.vy = -ny * 420; b.vx = nx * 420; b.vy = ny * 420;
        a.stun = b.stun = 0.35; a.inv = b.inv = 0.9;
        S.clang((a.x + b.x) / 2); E.shake(8); E.buzz(a.i, 90); E.buzz(b.i, 90);
        FX.burst((a.x + b.x) / 2, (a.y + b.y) / 2, { n: 16, color: ['#fff', '#FFD23F'], speed: 380, life: 0.4, size: 5, add: false });
        FX.text((a.x + b.x) / 2, (a.y + b.y) / 2 - 30, 'CLASH!', { color: '#FFD23F', size: 30 });
      } else if (ad) ram(a, b, nx, ny);
      else if (bd) ram(b, a, -nx, -ny);
      else {                                                // plain bump
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) { a.vx += nx * rv * 0.6; a.vy += ny * rv * 0.6; b.vx -= nx * rv * 0.6; b.vy -= ny * rv * 0.6; if (rv < -200) S.thud((a.x + b.x) / 2); }
      }
      collide(a); collide(b);
    }

    function updBombs(dt) {
      for (const m of st.bombs) {
        m.t += dt / BOMB_T; m.drip -= dt;
        const k = Math.min(1, m.t), x = lerp(m.x0, m.x1, k), y = lerp(m.y0, m.y1, k);
        if (m.drip <= 0 && k < 0.95) { m.drip = 0.07; stamp(x + rand(-6, 6), y + rand(-6, 6), rand(4, 7), m.o, false); }
        if (m.t >= 1) {
          m.dead = true;
          stamp(m.x1, m.y1, BOMB_SPLAT, m.o, true); splatFx(m.x1, m.y1, m.o, 44, 520);
          FX.ring(m.x1, m.y1, { color: COL[m.o], r1: 140, life: 0.4, w: 9 }); FX.ring(m.x1, m.y1, { color: '#fff', r1: 90, life: 0.25, w: 5 });
          E.shake(10); S.boom(m.x1); S.splash(m.x1);
          for (const v of st.bugs) {
            if (v.i === m.o) continue;
            if (dist(v.x, v.y, m.x1, m.y1) < 78 && stun(v, 0.6, m.o)) { const a = Math.atan2(v.y - m.y1, v.x - m.x1); v.vx = Math.cos(a) * 380; v.vy = Math.sin(a) * 380; }
          }
        }
      }
      st.bombs = st.bombs.filter(m => !m.dead);
    }

    function updPows(dt) {
      st.powT -= dt;
      if (st.powT <= 0 && st.pows.length < 2) {
        st.powT = rand(6, 9);
        for (let tries = 0; tries < 25; tries++) {
          const x = rand(80, W - 80), y = rand(TOP + 60, H - 60);
          let ok = true;
          for (const o of obs) if (x > o.x - 34 && x < o.x + o.w + 34 && y > o.y - 34 && y < o.y + o.h + 34) ok = false;
          for (const b of st.bugs) if (dist(b.x, b.y, x, y) < 150) ok = false;
          for (const q of st.pows) if (dist(q.x, q.y, x, y) < 120) ok = false;
          if (!ok) continue;
          st.pows.push({ x, y, type: pick(['mega', 'speed', 'bucket']), age: 0 });
          FX.ring(x, y, { color: '#fff', r1: 60, life: 0.4 }); S.ui();
          break;
        }
      }
      for (const q of st.pows) {
        q.age += dt;
        for (const b of st.bugs) {
          if (q.dead || dist(b.x, b.y, q.x, q.y) > BR + 22) continue;
          q.dead = true;
          const inf = POW[q.type];
          FX.text(q.x, q.y - 36, inf.label, { color: inf.c, size: 30, life: 1.1 });
          FX.ring(q.x, q.y, { color: inf.c, r1: 80, life: 0.35, w: 7 }); E.buzz(b.i, 50);
          if (q.type === 'mega') { b.megaT = 8; S.power(); }
          else if (q.type === 'speed') { b.speedT = 6; S.power(); }
          else {
            stamp(q.x, q.y, 150, b.i, true); splatFx(q.x, q.y, b.i, 60, 700);
            FX.ring(q.x, q.y, { color: COL[b.i], r1: 220, life: 0.5, w: 12 }); E.shake(13); S.boom(q.x, true); S.splash(q.x);
          }
        }
      }
      st.pows = st.pows.filter(q => !q.dead);
    }

    // index of the buggy with strictly the most floor, or -1 if first place is shared
    function leader() {
      const c = st.counts, m = Math.max(c[0], c[1], c[2]);
      return c.filter(v => v === m).length === 1 ? c.indexOf(m) : -1;
    }

    function update(dt) {
      st.pulse = Math.max(0, st.pulse - dt * 3);
      for (let i = 0; i < 3; i++) st.pipPop[i] = Math.max(0, st.pipPop[i] - dt * 2);
      if (st.phase === 'ready') {
        st.pt -= dt;
        if (st.pt <= 0) { st.phase = 'play'; FX.banner('GO!', { color: '#FFD23F', life: 0.6, size: 150 }); S.go(); }
      } else if (st.phase === 'play' || st.phase === 'over') {
        const live = true;
        for (const b of st.bugs) updBug(b, P[b.i], dt, live);
        bugsCollide(); updBombs(dt);
        if (st.phase === 'play') {
          updPows(dt);
          st.time -= dt;
          const sec = Math.ceil(st.time);
          if (sec !== st.lastSec) {
            st.lastSec = sec;
            if (sec <= 10 && sec > 0) { st.pulse = 1; tone({ f: sec <= 3 ? 880 : 660, d: 0.09, v: 0.13, type: 'square' }); if (sec === 10) FX.banner('10 SECONDS!', { size: 70, life: 0.9, color: '#FFD23F', y: 200 }); }
          }
          if (st.time <= 0) {
            st.time = 0; st.phase = 'buzzer'; st.pt = 0.9;
            E.slow(0.2, 0.7); E.flash('#fff', 0.55); E.shake(8); E.buzz(-1, 250);
            FX.banner('TIME!', { size: 170, life: 0.9, color: '#fff' });
            tone({ f: 196, d: 0.9, v: 0.22, type: 'sawtooth' }); tone({ f: 147, d: 0.9, v: 0.22, type: 'sawtooth' }); noise({ d: 0.5, v: 0.2, f: 3000, f2: 300 });
          }
        }
      } else if (st.phase === 'buzzer') {
        st.pt -= dt;
        if (st.pt <= 0) {
          st.phase = 'tally';
          st.tally = { t: 0, pct: st.counts.map(c => c / total * 100), tick: 0, shown: false, winner: -1 };
        }
      } else if (st.phase === 'tally') {
        const T = st.tally; T.t += dt; T.tick -= dt;
        if (T.t > 0.4 && T.t < 2.0 && T.tick <= 0) { T.tick = 0.06; tone({ f: 380 + (T.t - 0.4) * 420, d: 0.04, v: 0.07, type: 'square' }); }
        if (T.t >= 2.0 && !T.shown) {
          T.shown = true;
          const w = leader();                                // -1 when first place is tied
          T.winner = w;
          if (w >= 0) {
            st.wins[w]++; st.pipPop[w] = 1;
            FX.banner(P[w].name + ' TAKES IT!', { size: 72, life: 1.7, color: COL[w], y: 640 });
            FX.confetti(W / 2 + (w - 1) * 240, 300, 70, { color: [COL[w], COLL[w], '#fff', '#FFD23F'] });
            S.goal(); E.buzz(w, 200); E.shake(6);
          } else { FX.banner('DEAD HEAT!', { size: 72, life: 1.7, color: '#FFD23F', y: 640 }); S.point(); }
        }
        if (T.t >= 4.0) {
          const w = st.wins.findIndex(n => n >= WINS);
          if (w >= 0) {
            st.phase = 'over'; st.tally = null;
            FX.confetti(W / 2, 260, 120);
            E.endMatch({ winner: w, title: P[w].name + ' WINS!', sub: 'Rounds  ' + st.wins.join(' – ') });
          } else newRound();
        }
      }
      FX.update(dt);
    }

    // ---------- drawing ----------
    function drawBug(g, b) {
      const i = b.i, mega = b.megaT > 0;
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(b.x + 4, b.y + 7, 25, 19, 0, 0, TAU); g.fill();
      if (b.speedT > 0 && Math.hypot(b.vx, b.vy) > 80) {
        g.strokeStyle = 'rgba(255,210,63,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
        for (let k = -1; k <= 1; k++) {
          const ox = -Math.sin(b.ang) * k * 11, oy = Math.cos(b.ang) * k * 11, l = 22 + ((E.t * 90 + k * 13) % 14);
          g.beginPath(); g.moveTo(b.x + ox - Math.cos(b.ang) * 22, b.y + oy - Math.sin(b.ang) * 22);
          g.lineTo(b.x + ox - Math.cos(b.ang) * (22 + l), b.y + oy - Math.sin(b.ang) * (22 + l)); g.stroke();
        }
      }
      g.save(); g.translate(b.x, b.y); g.rotate(b.ang + b.spin);
      const s = 1 + b.stretch; g.scale(s, 1 / s);
      if (b.inv > 0 && b.stun <= 0 && Math.floor(E.t * 16) % 2) g.globalAlpha = 0.55;
      g.fillStyle = '#1b2030';
      rr(-18, -20, 12, 8, 3); g.fill(); rr(-18, 12, 12, 8, 3); g.fill(); rr(3, -20, 12, 8, 3); g.fill(); rr(3, 12, 12, 8, 3); g.fill();
      rr(-19, -14, 33, 28, 9); g.fillStyle = COL[i]; g.fill(); g.lineWidth = 3; g.strokeStyle = COLD[i]; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.3)'; rr(-15, -11, 24, 7, 4); g.fill();
      g.fillStyle = '#2a3044'; g.fillRect(12, -4, 9, 8);
      const rh = mega ? 34 + Math.sin(E.t * 14) * 2 : 21;                  // roller half-width
      rr(19, -rh, 11, rh * 2, 5); g.fillStyle = COLL[i]; g.fill(); g.lineWidth = 3; g.strokeStyle = COLD[i]; g.stroke();
      g.fillStyle = COL[i]; g.fillRect(22, -rh + 4, 5, rh * 2 - 8);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, 0, 9.5, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = '#1b2030'; g.stroke();
      g.fillStyle = '#1b2030'; rr(0, -6, 6, 12, 3); g.fill();
      g.restore(); g.globalAlpha = 1;
      if (b.stun > 0) {
        for (let k = 0; k < 3; k++) {
          const a = E.t * 7 + k * TAU / 3;
          txt('★', b.x + Math.cos(a) * 22, b.y - 30 + Math.sin(a) * 7, 18, '#FFD23F', { stroke: '#1b2030', sw: 4 });
        }
      }
      // cooldown pips: dash (white) and bomb (yellow)
      const bar = (x, v, c) => {
        g.fillStyle = 'rgba(20,26,46,0.75)'; rr(x, b.y + 30, 22, 6, 3); g.fill();
        g.fillStyle = v >= 1 ? c : 'rgba(255,255,255,0.45)'; rr(x + 1, b.y + 31, 20 * clamp(v, 0.05, 1), 4, 2); g.fill();
      };
      bar(b.x - 24, 1 - b.dashCd / DASH_CD, '#fff'); bar(b.x + 2, 1 - b.bombCd / BOMB_CD, '#FFD23F');
    }

    function drawPow(g, q) {
      const inf = POW[q.type], bob = Math.sin(q.age * 4) * 4, s = Math.min(1, q.age / 0.25);
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(q.x, q.y + 20, 20 * s, 7 * s, 0, 0, TAU); g.fill();
      g.save(); g.translate(q.x, q.y + bob); g.scale(ease.back(s), ease.back(s));
      g.strokeStyle = inf.c; g.globalAlpha = 0.5 + 0.4 * Math.sin(q.age * 6); g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, 27 + Math.sin(q.age * 6) * 3, 0, TAU); g.stroke(); g.globalAlpha = 1;
      g.fillStyle = '#1b2030'; g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.fill();
      g.lineWidth = 4; g.strokeStyle = inf.c; g.stroke();
      g.fillStyle = inf.c; g.strokeStyle = inf.c; g.lineCap = 'round'; g.lineJoin = 'round';
      if (q.type === 'mega') { rr(-13, -8, 26, 9, 4); g.fill(); g.fillRect(-2, 1, 4, 11); }
      else if (q.type === 'speed') { g.beginPath(); g.moveTo(4, -13); g.lineTo(-8, 2); g.lineTo(0, 2); g.lineTo(-4, 13); g.lineTo(8, -2); g.lineTo(0, -2); g.closePath(); g.fill(); }
      else { g.beginPath(); g.moveTo(-10, -6); g.lineTo(10, -6); g.lineTo(7, 11); g.lineTo(-7, 11); g.closePath(); g.fill(); g.lineWidth = 3; g.beginPath(); g.arc(0, -6, 10, Math.PI, 0); g.stroke(); }
      g.restore();
    }

    function drawHud(g) {
      g.fillStyle = '#141a2e'; g.fillRect(0, 0, W, TOP);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, TOP, W, 5);
      // timer (left)
      const sec = Math.ceil(st.time), low = sec <= 10 && st.phase === 'play', sc = 1 + st.pulse * 0.28;
      g.save(); g.translate(44, 32); g.scale(sc, sc);
      g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.fillStyle = low ? '#D7263D' : '#141a2e'; g.fill();
      g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke();
      txt(String(Math.max(0, sec)), 0, 2, 26, '#fff');
      g.restore();
      // one panel per player: name, round pips, percentage, coverage bar (all bars share one scale)
      const lead = st.phase === 'play' ? leader() : -1, pw = 376, x0 = 92;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (pw + 20), f = st.counts[i] / total;
        g.font = 'bold 20px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = COL[i]; g.fillText(P[i].name, x, 19, 190);
        const nw = Math.min(190, g.measureText(P[i].name).width);
        for (let k = 0; k < WINS; k++) {
          const px = x + nw + 18 + k * 21, on = k < st.wins[i], pop = on && k === st.wins[i] - 1 ? st.pipPop[i] : 0;
          g.beginPath(); g.arc(px, 19, 7 + pop * 6, 0, TAU);
          g.fillStyle = on ? COL[i] : 'rgba(255,255,255,0.14)'; g.fill();
          g.lineWidth = 2; g.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.25)'; g.stroke();
        }
        txt(Math.round(f * 100) + '%', x + pw, 19, lead === i ? 24 : 21, lead === i ? '#FFD23F' : '#fff', { align: 'right' });
        rr(x, 35, pw, 18, 9); g.fillStyle = '#2b3350'; g.fill();
        rr(x, 35, Math.max(18, Math.min(pw, pw * f / 0.5)), 18, 9); g.fillStyle = COL[i]; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)'; rr(x + 4, 37, Math.max(10, Math.min(pw, pw * f / 0.5) - 8), 5, 3); g.fill();
      }
    }

    function drawTally(g) {
      const T = st.tally, k = ease.back(Math.min(1, T.t / 0.3));
      g.fillStyle = 'rgba(10,13,24,' + (0.45 * Math.min(1, T.t / 0.3)) + ')'; g.fillRect(0, TOP, W, H - TOP);
      g.save(); g.translate(W / 2, 350); g.scale(k, k);
      rr(-380, -205, 760, 410, 26); g.fillStyle = '#141a2e'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
      txt('ROUND ' + st.round + ' — FLOOR COVERED', 0, -168, 26, 'rgba(255,255,255,0.75)');
      const c = ease.inOut(clamp((T.t - 0.4) / 1.6, 0, 1));
      for (let i = 0; i < 3; i++) {
        const y = -88 + i * 100, v = T.pct[i] * c, win = T.shown && T.winner === i, lose = T.shown && T.winner >= 0 && T.winner !== i;
        g.globalAlpha = lose ? 0.45 : 1;
        txt(P[i].name, -350, y - 28, 22, COL[i], { align: 'left' });
        rr(-350, y - 10, 480, 42, 21); g.fillStyle = '#2b3350'; g.fill();
        const bwid = Math.max(42, 480 * v / 100 * 2.2);                  // about 45% fills the bar
        rr(-350, y - 10, Math.min(480, bwid), 42, 21); g.fillStyle = COL[i]; g.fill();
        const pop = win ? 1 + 0.12 * Math.sin(E.rt * 10) : 1;
        txt(v.toFixed(1) + '%', 356, y + 11, 48 * pop, win ? '#FFD23F' : '#fff', { align: 'right', stroke: '#0a0d18', sw: 8 });
        if (win) txt('★', 158, y + 12, 30, '#FFD23F', { stroke: '#0a0d18', sw: 5 });
        g.globalAlpha = 1;
      }
      g.restore();
    }

    function draw(g) {
      g.drawImage(floor, 0, 0); g.drawImage(paint, 0, 0);
      for (const o of obs) { g.fillStyle = 'rgba(0,0,0,0.22)'; rr(o.x + 5, o.y + 8, o.w, o.h, 8); g.fill(); }
      for (const o of obs) {
        rr(o.x, o.y, o.w, o.h, 8); g.fillStyle = '#39415a'; g.fill();
        rr(o.x + 3, o.y + 3, o.w - 6, o.h - 11, 6); g.fillStyle = '#5b678c'; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)'; rr(o.x + 7, o.y + 6, o.w - 14, 5, 3); g.fill();
      }
      for (const q of st.pows) drawPow(g, q);
      for (const m of st.bombs) {                                        // landing marker + shadow
        const k = Math.min(1, m.t), x = lerp(m.x0, m.x1, k), y = lerp(m.y0, m.y1, k);
        g.strokeStyle = COL[m.o]; g.globalAlpha = 0.7; g.lineWidth = 3; g.setLineDash([8, 8]);
        g.beginPath(); g.arc(m.x1, m.y1, 30 + (1 - k) * 40, E.t * 4, E.t * 4 + TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x, y + 6, 13 - Math.sin(k * Math.PI) * 5, 7 - Math.sin(k * Math.PI) * 3, 0, 0, TAU); g.fill();
      }
      // leader crown
      if (st.phase === 'play' && leader() >= 0) {
        const b = st.bugs[leader()], y = b.y - 38 + Math.sin(E.t * 5) * 2;
        g.fillStyle = '#FFD23F'; g.strokeStyle = '#1b2030'; g.lineWidth = 2; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(b.x - 11, y + 7); g.lineTo(b.x - 13, y - 6); g.lineTo(b.x - 5, y); g.lineTo(b.x, y - 9); g.lineTo(b.x + 5, y); g.lineTo(b.x + 13, y - 6); g.lineTo(b.x + 11, y + 7); g.closePath(); g.fill(); g.stroke();
      }
      for (const b of st.bugs) drawBug(g, b);
      for (const m of st.bombs) {
        const k = Math.min(1, m.t), x = lerp(m.x0, m.x1, k), h = Math.sin(k * Math.PI) * 95, y = lerp(m.y0, m.y1, k) - h, s = 1 + h / 160;
        const wob = Math.sin(E.t * 30) * 0.12;
        g.save(); g.translate(x, y); g.scale(s * (1 + wob), s * (1 - wob));
        g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fillStyle = COL[m.o]; g.fill(); g.lineWidth = 3; g.strokeStyle = COLD[m.o]; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.arc(-4, -5, 4, 0, TAU); g.fill();
        g.restore();
      }
      FX.draw(g);
      drawHud(g);
      if (st.tally) drawTally(g);
      FX.drawText(g);
    }

    newRound();
    return { update, draw };
  }

  GAMES.push({
    id: 'paint', name: 'PAINT WARS', tag: 'VERSUS', color: '#C77DFF',
    tagline: 'Three colours, one floor. 45 seconds.',
    pad: { a: 'DASH', b: 'BOMB', stick: 'DRIVE' },
    how: {
      goal: 'Three-way: most floor painted wins the round · first to 2',
      rows: [['STICK', 'Drive — you paint wherever you roll'], ['A', 'Dash-splat: ram another buggy to stun it'], ['B', 'Lob a paint bomb ahead of you']],
      tips: ['Painting over a rival colour takes that floor away from them', 'Grab the badges: mega brush, speed, paint bucket'],
    },
    song: { bpm: 122, root: 53, minor: false, prog: [0, 3, 4, 3],
      kick: 'x--x--x-x--x--x-', snare: '----x-------x--x', hat: 'x-xxx-xxx-xxx-xx', bass: 'x--x-o-x--xo-x-o', arp: '0-2-3-2-1-3-2-0-', arpWave: 'square' },
    icon(g, t) {
      g.save();
      rr(-112, -54, 224, 108, 14); g.fillStyle = '#ECE6D8'; g.fill(); g.clip();
      g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 24;
      const path = (col, k, dir, yo, ph) => {
        const n = 26, m = Math.floor(n * k); let x = dir * -95, y = yo + Math.sin(ph) * 16;
        g.strokeStyle = col; g.beginPath(); g.moveTo(x, y);
        for (let i = 1; i <= m; i++) { const u = i / n; x = dir * (-95 + 190 * u); y = yo + Math.sin(u * 6 + ph) * 16; g.lineTo(x, y); }
        g.stroke(); return [x, y];
      };
      const a = path(COL[0], 0.5 - 0.5 * Math.cos(t * 1.3), 1, -30, 0), b = path(COL[1], 0.5 - 0.5 * Math.cos(t * 1.3 + 1.1), -1, 0, 2), c = path(COL[2], 0.5 - 0.5 * Math.cos(t * 1.3 + 2.2), 1, 30, 4);
      [a, b, c].forEach((p, i) => {
        g.beginPath(); g.arc(p[0], p[1], 10, 0, TAU); g.fillStyle = COLL[i]; g.fill(); g.lineWidth = 4; g.strokeStyle = COLD[i]; g.stroke();
        g.fillStyle = '#1b2030'; g.beginPath(); g.arc(p[0] + (i === 1 ? -3 : 3), p[1], 3.5, 0, TAU); g.fill();
      });
      g.restore();
    },
    create,
  });
})();
