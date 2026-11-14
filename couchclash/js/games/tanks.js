'use strict';
// RICOCHET TANKS — top-down tank duel. Shells bounce off walls; one hit kills.
(function () {
  const T = 40, GW = 32, GH = 18, R = 17, WIN = 5;
  // Each map lists [col, row, w, h, type] rects (1 = wall, 2 = crate); every rect is
  // also stamped rotated 180 degrees so both sides are fair.
  const MAPS = [
    [[6, 3, 2, 2, 1], [6, 13, 2, 2, 1], [11, 7, 1, 4, 1], [14, 3, 1, 3, 1], [9, 5, 1, 1, 2], [9, 12, 1, 1, 2], [15, 8, 2, 2, 2], [13, 8, 1, 2, 2]],
    [[5, 4, 7, 1, 1], [5, 13, 7, 1, 1], [9, 7, 1, 4, 2], [14, 6, 1, 2, 1], [14, 10, 1, 2, 1], [15, 1, 2, 3, 2], [3, 3, 1, 1, 2]],
    [[15, 5, 2, 3, 1], [10, 8, 3, 2, 2], [7, 3, 1, 4, 1], [7, 11, 1, 4, 1], [4, 8, 1, 2, 2], [12, 2, 1, 2, 2], [12, 14, 1, 2, 2]],
    [[8, 2, 1, 3, 2], [8, 7, 1, 4, 2], [8, 13, 1, 3, 2], [12, 4, 2, 1, 1], [12, 13, 2, 1, 1], [15, 7, 2, 4, 1], [11, 8, 1, 2, 2]],
  ];
  const POW = {
    spread: { c: '#FFD23F', label: 'TRIPLE SHOT!' }, shield: { c: '#7CFF6B', label: 'SHIELD!' },
    rocket: { c: '#FF8A3D', label: 'ROCKET!' }, speed: { c: '#C77DFF', label: 'TURBO!' },
  };

  function drawTank(g, x, y, ang, aim, i, o) {
    o = o || {};
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(3, 6, 22, 18, 0, 0, TAU); g.fill();
    g.rotate(ang);
    g.fillStyle = '#1b2233'; rr(-19, -17, 38, 10, 4); g.fill(); rr(-19, 7, 38, 10, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    const tr = ((o.tread || 0) % 8);
    for (let k = -16 + tr; k < 18; k += 8) { g.fillRect(k, -17, 2, 10); g.fillRect(k, 7, 2, 10); }
    g.fillStyle = COLD[i]; rr(-16, -12, 32, 24, 6); g.fill();
    g.fillStyle = COL[i]; rr(-14, -11, 28, 19, 5); g.fill();
    g.rotate(aim - ang);
    const rc = o.recoil || 0;
    g.fillStyle = '#1b2233'; rr(2 - rc, -4.5, 26, 9, 3); g.fill();
    g.fillStyle = o.rocket ? '#FF8A3D' : COLL[i]; rr(4 - rc, -3, 22, 6, 2); g.fill();
    g.fillStyle = COLD[i]; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
    g.fillStyle = COLL[i]; g.beginPath(); g.arc(-2, -2, 4, 0, TAU); g.fill();
    g.restore();
  }

  function create() {
    const P = E.players;
    const st = { grid: null, tanks: [], bullets: [], pows: [], score: [0, 0], pop: [0, 0], round: 0, phase: 'ready', pt: 0, powT: 4, order: shuffle([0, 1, 2, 3]), over: false };
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H; const lg = layer.getContext('2d');
    const decal = document.createElement('canvas'); decal.width = W; decal.height = H; const dg = decal.getContext('2d');

    const cell = (c, r) => (c < 0 || r < 0 || c >= GW || r >= GH) ? 1 : st.grid[r * GW + c];
    const tileAt = (x, y) => cell(Math.floor(x / T), Math.floor(y / T));

    function buildMap(idx) {
      const gr = new Uint8Array(GW * GH);
      for (let c = 0; c < GW; c++) { gr[c] = 1; gr[(GH - 1) * GW + c] = 1; }
      for (let r = 0; r < GH; r++) { gr[r * GW] = 1; gr[r * GW + GW - 1] = 1; }
      for (const [c, r, w, h, t] of MAPS[idx]) for (let cc = c; cc < c + w; cc++) for (let rr2 = r; rr2 < r + h; rr2++) {
        gr[rr2 * GW + cc] = t; gr[(GH - 1 - rr2) * GW + (GW - 1 - cc)] = t;
      }
      return gr;
    }
    function renderLayer() {
      lg.fillStyle = '#131c2e'; lg.fillRect(0, 0, W, H);
      for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) { if ((c + r) % 2 === 0) { lg.fillStyle = '#16213a'; lg.fillRect(c * T, r * T, T, T); } }
      lg.fillStyle = 'rgba(0,0,0,0.38)';
      for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (st.grid[r * GW + c]) lg.fillRect(c * T + 6, r * T + 9, T, T);
      for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
        const t = st.grid[r * GW + c], x = c * T, y = r * T; if (!t) continue;
        if (t === 1) {
          lg.fillStyle = '#1c6f80'; lg.fillRect(x, y, T, T);
          lg.fillStyle = '#2bb3c7'; lg.fillRect(x, y, T, T - 9);
          lg.fillStyle = '#5fe0ef'; lg.fillRect(x, y, T, 3);
          lg.fillStyle = 'rgba(255,255,255,0.08)'; lg.fillRect(x + 6, y + 8, T - 12, T - 24);
        } else {
          lg.fillStyle = '#7a4a22'; lg.fillRect(x + 2, y + 2, T - 4, T - 4);
          lg.fillStyle = '#c98845'; lg.fillRect(x + 2, y + 2, T - 4, T - 12);
          lg.strokeStyle = '#7a4a22'; lg.lineWidth = 4; lg.strokeRect(x + 5, y + 5, T - 10, T - 18);
          lg.beginPath(); lg.moveTo(x + 6, y + 6); lg.lineTo(x + T - 6, y + T - 14); lg.moveTo(x + T - 6, y + 6); lg.lineTo(x + 6, y + T - 14); lg.stroke();
        }
      }
    }
    function newRound() {
      st.round++;
      st.grid = buildMap(st.order[(st.round - 1) % MAPS.length]);
      renderLayer(); dg.clearRect(0, 0, W, H);
      st.bullets = []; st.pows = []; st.powT = 4;
      st.tanks = [0, 1].map(i => ({ i, x: i ? W - 3 * T : 3 * T, y: H / 2, vx: 0, vy: 0, ang: i ? Math.PI : 0, aim: i ? Math.PI : 0, alive: true,
        cd: 0.3, dashCd: 0, dashT: 0, dx: 1, dy: 0, shield: false, spread: 0, rocket: false, speedT: 0, tread: 0, treadAcc: 0, recoil: 0, inv: 0 }));
      st.phase = 'ready'; st.pt = 1.3;
      const mp = st.score[0] === WIN - 1 || st.score[1] === WIN - 1;
      FX.banner('ROUND ' + st.round, { size: 96, life: 1.2, sub: mp ? 'MATCH POINT' : '' }); S.count();
    }

    function collide(o, rad) {
      const c0 = Math.floor((o.x - rad) / T), c1 = Math.floor((o.x + rad) / T), r0 = Math.floor((o.y - rad) / T), r1 = Math.floor((o.y + rad) / T);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (!cell(c, r)) continue;
        const nx = clamp(o.x, c * T, c * T + T), ny = clamp(o.y, r * T, r * T + T);
        const dx = o.x - nx, dy = o.y - ny, d2 = dx * dx + dy * dy;
        if (d2 < rad * rad && d2 > 1e-6) { const d = Math.sqrt(d2); o.x += dx / d * (rad - d); o.y += dy / d * (rad - d); }
      }
    }
    function boom(x, y, i, big) {
      FX.burst(x, y, { n: big ? 46 : 22, color: ['#FFD23F', '#FF8A3D', '#fff', COL[i]], speed: big ? 520 : 320, life: 0.7, size: big ? 9 : 6 });
      FX.burst(x, y, { n: big ? 18 : 8, color: ['#39424f', '#565f6e'], speed: 140, life: 1.3, size: 15, add: false, drag: 1.5 });
      FX.ring(x, y, { r1: big ? 170 : 100, color: '#fff', w: 9, life: 0.45 }); FX.ring(x, y, { r1: big ? 110 : 60, color: COL[i], w: 6, life: 0.6 });
      const gr = dg.createRadialGradient(x, y, 4, x, y, big ? 62 : 40); gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      dg.fillStyle = gr; dg.beginPath(); dg.arc(x, y, big ? 62 : 40, 0, TAU); dg.fill();
      S.boom(x, big); E.shake(big ? 18 : 9);
    }
    function breakCrate(c, r) {
      if (cell(c, r) !== 2) return;
      st.grid[r * GW + c] = 0; renderLayer();
      FX.burst(c * T + T / 2, r * T + T / 2, { n: 12, color: ['#c98845', '#7a4a22', '#e8b271'], speed: 260, life: 0.6, size: 6, sq: true, add: false });
      S.crate(c * T);
    }
    function kill(tk) {
      if (!tk.alive) return;
      tk.alive = false; boom(tk.x, tk.y, tk.i, true); E.buzz(tk.i, 350); E.flash('#fff', 0.35);
      if (st.phase === 'play') { st.phase = 'dead'; st.pt = 1.7; E.slow(0.25, 0.6); }
    }
    // returns true if the hit was absorbed or lethal (bullet consumed)
    function hitTank(tk) {
      if (!tk.alive || tk.dashT > 0 || tk.inv > 0) return false;
      if (tk.shield) { tk.shield = false; tk.inv = 0.35; FX.ring(tk.x, tk.y, { r0: 22, r1: 70, color: '#7CFF6B', w: 6 }); FX.burst(tk.x, tk.y, { n: 14, color: '#7CFF6B', speed: 260 }); S.shield(); E.buzz(tk.i, 80); return true; }
      if (st.over) return true;
      kill(tk); return true;
    }
    function explode(x, y, owner) {
      boom(x, y, owner, true);
      const c0 = Math.floor((x - 100) / T), c1 = Math.floor((x + 100) / T), r0 = Math.floor((y - 100) / T), r1 = Math.floor((y + 100) / T);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (dist(c * T + T / 2, r * T + T / 2, x, y) < 100) breakCrate(c, r);
      for (const tk of st.tanks) if (dist(tk.x, tk.y, x, y) < 88) hitTank(tk);
    }
    function fire(tk) {
      const ca = Math.cos(tk.aim), sa = Math.sin(tk.aim);
      let mx = tk.x + ca * 27, my = tk.y + sa * 27;
      if (tileAt(mx, my)) { mx = tk.x; my = tk.y; }
      const mk = (a, sp, rocket) => st.bullets.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, owner: tk.i, bounces: rocket ? 0 : 2, grace: 0.14, rocket, dead: false, age: 0 });
      if (tk.rocket) { tk.rocket = false; mk(tk.aim, 560, true); tk.cd = 0.5; S.whoosh(tk.x); S.shoot(tk.x); }
      else if (tk.spread > 0) { tk.spread--; for (const d of [-0.2, 0, 0.2]) mk(tk.aim + d, 410, false); tk.cd = 0.42; S.shoot(tk.x); }
      else { mk(tk.aim, 410, false); tk.cd = 0.36; S.shoot(tk.x); }
      tk.recoil = 7; tk.vx -= ca * 70; tk.vy -= sa * 70;
      FX.burst(mx, my, { n: 7, color: ['#fff', '#FFD23F'], speed: 240, life: 0.2, size: 4, ang: tk.aim, spread: 0.5 });
    }
    function updTank(tk, p, dt) {
      if (!tk.alive) return;
      tk.inv -= dt; tk.speedT -= dt; tk.recoil = Math.max(0, tk.recoil - dt * 50);
      const spd = tk.speedT > 0 ? 300 : 205;
      if (tk.dashT > 0) {
        tk.dashT -= dt; tk.vx = tk.dx * 660; tk.vy = tk.dy * 660;
        FX.burst(tk.x, tk.y, { n: 1, color: COL[tk.i], speed: 20, life: 0.25, size: 13 });
      } else { const k = 1 - Math.exp(-14 * dt); tk.vx += (p.x * spd - tk.vx) * k; tk.vy += (p.y * spd - tk.vy) * k; }
      if (p.mag > 0.25) tk.aim = angLerp(tk.aim, Math.atan2(p.y, p.x), 1 - Math.exp(-18 * dt));
      const sp = Math.hypot(tk.vx, tk.vy);
      if (sp > 25) tk.ang = angLerp(tk.ang, Math.atan2(tk.vy, tk.vx), 1 - Math.exp(-11 * dt));
      tk.x += tk.vx * dt; tk.y += tk.vy * dt; collide(tk, R);
      tk.tread += sp * dt; tk.treadAcc += sp * dt;
      if (tk.treadAcc > 10) {
        tk.treadAcc = 0; dg.save(); dg.translate(tk.x, tk.y); dg.rotate(tk.ang); dg.fillStyle = 'rgba(0,0,0,0.16)';
        dg.fillRect(-3, -16, 5, 8); dg.fillRect(-3, 8, 5, 8); dg.restore();
      }
      if (tk.speedT > 0 && sp > 80 && Math.random() < 0.5) FX.burst(tk.x, tk.y, { n: 1, color: '#C77DFF', speed: 40, life: 0.3, size: 5 });
      tk.cd -= dt; tk.dashCd -= dt;
      if (p.a && tk.cd <= 0 && st.bullets.filter(b => b.owner === tk.i).length < 5) fire(tk);
      if (p.bp && tk.dashCd <= 0 && tk.dashT <= 0) {
        const a = p.mag > 0.25 ? Math.atan2(p.y, p.x) : tk.aim;
        tk.dx = Math.cos(a); tk.dy = Math.sin(a); tk.dashT = 0.17; tk.dashCd = 1.5; S.dash(tk.x);
        FX.ring(tk.x, tk.y, { r1: 46, color: COL[tk.i], w: 4, life: 0.25 });
      }
      for (let i = st.pows.length - 1; i >= 0; i--) {
        const pw = st.pows[i];
        if (dist(pw.x, pw.y, tk.x, tk.y) < 30) {
          st.pows.splice(i, 1);
          if (pw.type === 'spread') tk.spread = 3; else if (pw.type === 'shield') tk.shield = true; else if (pw.type === 'rocket') tk.rocket = true; else tk.speedT = 8;
          FX.text(tk.x, tk.y - 34, POW[pw.type].label, { color: POW[pw.type].c, size: 24 }); FX.ring(pw.x, pw.y, { r1: 60, color: POW[pw.type].c });
          S.pickup(); E.buzz(tk.i, 40);
        }
      }
    }
    function tileHit(b, x, y, t) {   // true = bullet consumed
      if (b.rocket) { explode(b.x, b.y, b.owner); b.dead = true; return true; }
      if (t === 2) { breakCrate(Math.floor(x / T), Math.floor(y / T)); b.dead = true; FX.burst(b.x, b.y, { n: 6, speed: 150, life: 0.25, size: 3 }); return true; }
      if (b.bounces <= 0) { b.dead = true; FX.burst(b.x, b.y, { n: 8, color: ['#fff', COL[b.owner]], speed: 130, life: 0.3, size: 3 }); return true; }
      b.bounces--; b.grace = 0; S.bounce(b.x);
      FX.burst(b.x, b.y, { n: 5, color: '#fff', speed: 150, life: 0.22, size: 3 });
      return false;
    }
    function updBullets(dt) {
      const B = st.bullets;
      for (const b of B) {
        if (b.dead) continue;
        b.grace -= dt; b.age += dt;
        FX.burst(b.x, b.y, { n: 1, color: b.rocket ? '#FF8A3D' : COL[b.owner], speed: 12, life: b.rocket ? 0.45 : 0.28, size: b.rocket ? 7 : 4 });
        const nx = b.x + b.vx * dt, px = nx + Math.sign(b.vx) * 4; let t = tileAt(px, b.y);
        if (t) { if (tileHit(b, px, b.y, t)) continue; b.vx = -b.vx; } else b.x = nx;
        const ny = b.y + b.vy * dt, py = ny + Math.sign(b.vy) * 4; t = tileAt(b.x, py);
        if (t) { if (tileHit(b, b.x, py, t)) continue; b.vy = -b.vy; } else b.y = ny;
        for (const tk of st.tanks) {
          if (!tk.alive || (b.owner === tk.i && b.grace > 0)) continue;
          if (dist(b.x, b.y, tk.x, tk.y) < R + 5) {
            if (b.rocket) { explode(b.x, b.y, b.owner); b.dead = true; break; }
            if (hitTank(tk)) { b.dead = true; break; }
          }
        }
      }
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        if (a.dead || b.dead || a.owner === b.owner) continue;
        if (dist(a.x, a.y, b.x, b.y) < 12) {
          a.dead = b.dead = true; S.tink(a.x); FX.burst(a.x, a.y, { n: 12, color: ['#fff', '#FFD23F'], speed: 220, life: 0.3, size: 3 });
          if (a.rocket) explode(a.x, a.y, a.owner); if (b.rocket) explode(b.x, b.y, b.owner);
        }
      }
      st.bullets = B.filter(b => !b.dead);
    }
    function spawnPow() {
      for (let k = 0; k < 40; k++) {
        const c = 2 + (Math.random() * (GW - 4) | 0), r = 2 + (Math.random() * (GH - 4) | 0), x = c * T + T / 2, y = r * T + T / 2;
        if (cell(c, r) || st.tanks.some(tk => dist(tk.x, tk.y, x, y) < 170) || st.pows.some(p => dist(p.x, p.y, x, y) < 200)) continue;
        st.pows.push({ x, y, type: pick(['spread', 'shield', 'rocket', 'speed']), age: 0 });
        FX.ring(x, y, { r0: 60, r1: 10, color: '#fff', w: 3, life: 0.4 }); return;
      }
    }
    function resolve() {
      const alive = st.tanks.filter(t => t.alive);
      if (alive.length === 1) {
        const w = alive[0].i; st.score[w]++; st.pop[w] = 1; S.point();
        if (st.score[w] >= WIN) {
          st.over = true; st.phase = 'over';
          FX.confetti(W / 2, 200, 120); FX.confetti(alive[0].x, alive[0].y, 60);
          E.endMatch({ winner: w, title: P[w].name + ' WINS!', sub: st.score[0] + ' – ' + st.score[1] });
          return;
        }
      } else if (alive.length === 0) FX.banner('DOUBLE KO!', { color: '#FFD23F', size: 100 });
      newRound();
    }
    function aimLine(g, tk) {
      let x = tk.x + Math.cos(tk.aim) * 27, y = tk.y + Math.sin(tk.aim) * 27, dx = Math.cos(tk.aim) * 8, dy = Math.sin(tk.aim) * 8, b = 1;
      if (tileAt(x, y)) return;
      g.fillStyle = COL[tk.i];
      for (let s = 0; s < 34; s++) {
        if (tileAt(x + dx, y)) { if (tileAt(x + dx, y) === 2 || b-- <= 0) break; dx = -dx; }
        if (tileAt(x, y + dy)) { if (tileAt(x, y + dy) === 2 || b-- <= 0) break; dy = -dy; }
        x += dx; y += dy;
        if (s % 2 === 0) { g.globalAlpha = 0.5 * (1 - s / 34); g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
    }

    newRound();
    return {
      update(dt) {
        if (st.phase === 'ready') { st.pt -= dt; if (st.pt <= 0) { st.phase = 'play'; FX.banner('GO!', { color: '#FFD23F', life: 0.55, size: 130 }); S.go(); } }
        else {
          for (const tk of st.tanks) updTank(tk, P[tk.i], dt);
          const [a, b] = st.tanks;
          if (a.alive && b.alive) { const d = dist(a.x, a.y, b.x, b.y); if (d < R * 2 && d > 0.01) { const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d, o = (R * 2 - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; collide(a, R); collide(b, R); } }
          updBullets(dt);
        }
        if (st.phase === 'play') { st.powT -= dt; if (st.powT <= 0) { st.powT = rand(6, 9); if (st.pows.length < 2) spawnPow(); } }
        if (st.phase === 'dead') { st.pt -= dt; if (st.pt <= 0) resolve(); }
        for (const p of st.pows) p.age += dt;
        st.pop[0] = Math.max(0, st.pop[0] - dt * 2); st.pop[1] = Math.max(0, st.pop[1] - dt * 2);
        FX.update(dt);
      },
      draw(g) {
        g.drawImage(layer, 0, 0); g.drawImage(decal, 0, 0);
        for (const p of st.pows) {
          const c = POW[p.type].c, s = Math.min(1, p.age * 4), bob = Math.sin(p.age * 4) * 3;
          g.save(); g.translate(p.x, p.y + bob); g.scale(s, s);
          g.globalAlpha = 0.25 + 0.1 * Math.sin(p.age * 6); g.fillStyle = c; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); g.globalAlpha = 1;
          g.fillStyle = '#10131f'; g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 3;
          if (p.type === 'spread') { for (const a of [-0.6, 0, 0.6]) { g.beginPath(); g.arc(Math.cos(a - 1.57) * 8, Math.sin(a - 1.57) * 8 + 3, 3, 0, TAU); g.fill(); } }
          else if (p.type === 'shield') { g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.stroke(); }
          else if (p.type === 'rocket') { g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(-6, 6); g.closePath(); g.fill(); }
          else { g.beginPath(); g.moveTo(3, -9); g.lineTo(-5, 1); g.lineTo(1, 1); g.lineTo(-3, 9); g.lineTo(6, -2); g.lineTo(0, -2); g.closePath(); g.fill(); }
          g.restore();
        }
        if (st.phase !== 'over') for (const tk of st.tanks) if (tk.alive) aimLine(g, tk);
        for (const b of st.bullets) {
          g.fillStyle = b.rocket ? '#FF8A3D' : COL[b.owner]; g.beginPath(); g.arc(b.x, b.y, b.rocket ? 9 : 7, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, b.rocket ? 5 : 4, 0, TAU); g.fill();
        }
        for (const tk of st.tanks) {
          if (!tk.alive) continue;
          if (tk.dashT > 0) g.globalAlpha = 0.6;
          drawTank(g, tk.x, tk.y, tk.ang, tk.aim, tk.i, tk); g.globalAlpha = 1;
          if (tk.shield) { g.strokeStyle = '#7CFF6B'; g.lineWidth = 3; g.globalAlpha = 0.6 + 0.3 * Math.sin(E.t * 8); g.beginPath(); g.arc(tk.x, tk.y, 27, 0, TAU); g.stroke(); g.globalAlpha = 1; }
          if (tk.spread > 0) { g.fillStyle = '#FFD23F'; for (let k = 0; k < tk.spread; k++) { g.beginPath(); g.arc(tk.x - 8 + k * 8, tk.y - 30, 3, 0, TAU); g.fill(); } }
          if (tk.dashCd > 0) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(tk.x, tk.y, 25, Math.PI * 0.5 - (1 - tk.dashCd / 1.5) * Math.PI, Math.PI * 0.5 + (1 - tk.dashCd / 1.5) * Math.PI); g.stroke(); }
        }
        FX.draw(g);
        // HUD on the top wall
        for (let i = 0; i < 2; i++) {
          const dir = i ? -1 : 1, x0 = i ? W - 24 : 24;
          txt(P[i].name, x0, 21, 20, COL[i], { align: i ? 'right' : 'left', stroke: '#0a0d18' });
          g.font = 'bold 20px ' + FONT; const nw = g.measureText(P[i].name).width;
          for (let k = 0; k < WIN; k++) {
            const on = k < st.score[i], px = x0 + dir * (nw + 24 + k * 24), pr = on && k === st.score[i] - 1 ? 8 + st.pop[i] * 8 : 8;
            g.fillStyle = on ? COL[i] : 'rgba(10,13,24,0.7)'; g.beginPath(); g.arc(px, 20, pr, 0, TAU); g.fill();
            g.strokeStyle = '#0a0d18'; g.lineWidth = 2; g.stroke();
          }
        }
        txt('FIRST TO ' + WIN, W / 2, 21, 16, 'rgba(10,13,24,0.8)');
        FX.drawText(g);
      },
    };
  }

  GAMES.push({
    id: 'tanks', name: 'RICOCHET TANKS', tag: 'VERSUS', color: '#2bb3c7',
    tagline: 'Bank shots off the walls. One hit and you are scrap.',
    pad: { a: 'FIRE', b: 'DASH', stick: 'DRIVE + AIM' },
    how: { goal: 'First to ' + WIN + ' kills', rows: [['STICK', 'Drive, and aim your turret'], ['A', 'Fire a shell that bounces twice'], ['B', 'Dash — bullets pass through you mid-dash']],
      tips: ['Your own shells can hit you after a bounce', 'Shoot crates open and grab power-ups: triple shot, shield, rocket, turbo'] },
    song: { bpm: 124, root: 52, minor: true, prog: [0, 0, 5, 6], kick: 'x---x---x---x---', snare: '----x-------x--x', hat: '--x---x---x---x-', bass: 'x-xox-xox-xox-xo', arp: '0--1--2-0--1--3-' },
    icon(g, t) {
      const bx = Math.sin(t * 2.4) * 46, by = -Math.abs(Math.sin(t * 3.1)) * 30 + 14;
      g.fillStyle = '#2bb3c7'; rr(-16, -44, 32, 26, 4); g.fill();
      drawTank(g, -84, 12, 0, Math.atan2(by - 12, bx + 84), 0); drawTank(g, 84, 12, Math.PI, Math.atan2(by - 12, bx - 84), 1);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 6, 0, TAU); g.fill();
      g.globalAlpha = 0.4; g.beginPath(); g.arc(bx - Math.cos(t * 2.4) * 8, by, 4, 0, TAU); g.fill(); g.globalAlpha = 1;
    },
    create,
  });
})();
