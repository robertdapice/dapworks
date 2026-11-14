'use strict';
// TURBO PUCK (three-player edition) — three goals, five lives each, last one standing.
// P1 defends the left goal, P2 the right goal, P3 the goal in the bottom wall.
(function () {
  const L = 60, Rt = 1220, Tp = 90, Bt = 650, CX = 640, CY = 370, GY0 = 260, GY1 = 480, GX0 = 530, GX1 = 750, LIVES = 5, PR = 16, BASE_R = 36;
  const POWS = { giant: { c: '#FF7AD9', label: 'GIANT!' }, multi: { c: '#FFD23F', label: 'MULTI-PUCK!' }, freeze: { c: '#8fe9ff', label: 'FREEZE!' }, wall: { c: '#C77DFF', label: 'GOAL SHIELD!' } };
  const START = [[CX - 240, CY], [CX + 240, CY], [CX, CY + 240]];   // all the same distance from the face-off spot
  const HX = [230, 1050, 640];

  function drawMallet(g, x, y, r, i, o) {
    o = o || {};
    const lx = o.lx || 0, ly = o.ly || 0, sq = o.squash || 0, ang = o.ang || 0;
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(20,40,80,0.25)'; g.beginPath(); g.ellipse(4, 8, r, r * 0.92, 0, 0, TAU); g.fill();
    g.rotate(ang); g.scale(1 + sq, 1 - sq); g.rotate(-ang);
    if (o.spin) g.rotate(o.spin);
    g.fillStyle = COLD[i]; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = COL[i]; g.beginPath(); g.arc(0, -r * 0.08, r * 0.9, 0, TAU); g.fill();
    g.fillStyle = COLL[i]; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(-r * 0.3, -r * 0.45, r * 0.35, r * 0.18, -0.5, 0, TAU); g.fill(); g.globalAlpha = 1;
    // face
    const ex = r * 0.34, ey = -r * 0.08, er = r * 0.25;
    for (const s of [-1, 1]) {
      if (o.dizzy) {
        g.strokeStyle = '#0a0d18'; g.lineWidth = r * 0.09; g.beginPath();
        g.moveTo(s * ex - er * 0.6, ey - er * 0.6); g.lineTo(s * ex + er * 0.6, ey + er * 0.6); g.moveTo(s * ex + er * 0.6, ey - er * 0.6); g.lineTo(s * ex - er * 0.6, ey + er * 0.6); g.stroke();
      } else {
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * ex, ey, er, o.blink ? er * 0.15 : er * (o.dash ? 0.6 : 1), 0, 0, TAU); g.fill();
        if (!o.blink) { g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(s * ex + lx * er * 0.45, ey + ly * er * 0.45, er * 0.5, 0, TAU); g.fill(); }
      }
    }
    g.strokeStyle = '#0a0d18'; g.lineWidth = r * 0.08; g.lineCap = 'round'; g.beginPath();
    if (o.dizzy) g.arc(0, r * 0.48, r * 0.16, 0, TAU); else if (o.happy) g.arc(0, r * 0.28, r * 0.3, 0.15, Math.PI - 0.15); else g.arc(0, r * 0.3, r * 0.2, 0.2, Math.PI - 0.2);
    g.stroke();
    g.restore();
  }

  function create() {
    const P = E.players;
    const st = { lives: [LIVES, LIVES, LIVES], pop: [0, 0, 0], pucks: [], pows: [], phase: 'ready', pt: 1.2, powT: 6, rally: 0, wallT: [0, 0, 0], happy: [0, 0, 0], over: false };
    const M = [0, 1, 2].map(i => ({ i, x: 0, y: 0, vx: 0, vy: 0, r: BASE_R, tr: BASE_R, dashT: 0, dashCd: 0, stun: 0, frozen: 0, giantT: 0, energy: 1, lock: false, mag: false, squash: 0, hitAng: 0, blink: rand(1, 4), spin: 0, out: false }));
    const mkPuck = (x, y, vx, vy) => ({ x, y, vx: vx || 0, vy: vy || 0, heat: 0, trail: [], last: -1, spin: 0 });
    // prerendered rink
    const rink = document.createElement('canvas'); rink.width = W; rink.height = H; const rg = rink.getContext('2d');
    const marks = document.createElement('canvas'); marks.width = W; marks.height = H; const mg = marks.getContext('2d');
    (function () {
      const bg = rg.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0c1230'); bg.addColorStop(1, '#17214d'); rg.fillStyle = bg; rg.fillRect(0, 0, W, H);
      for (let i = 0; i < 300; i++) { rg.fillStyle = pick(['#35C2FF', '#FF5D73', '#FFD23F', '#ffffff', '#6EE06A']); rg.globalAlpha = rand(0.15, 0.5); rg.beginPath(); rg.arc(rand(W), pick([rand(674, 716), rand(674, 716), rand(4, 10)]), rand(2, 5), 0, TAU); rg.fill(); }
      rg.globalAlpha = 1;
      // side nets (P1 left, P2 right)
      for (let i = 0; i < 2; i++) { const x = i ? Rt : L - 46; rg.fillStyle = COLD[i]; rg.beginPath(); rg.roundRect(x, GY0 - 8, 46, GY1 - GY0 + 16, 10); rg.fill(); rg.fillStyle = '#0a0d18'; rg.fillRect(i ? Rt : L - 38, GY0, 38, GY1 - GY0);
        rg.strokeStyle = 'rgba(255,255,255,0.22)'; rg.lineWidth = 1; for (let k = 0; k < 7; k++) { rg.beginPath(); rg.moveTo(x + k * 7, GY0); rg.lineTo(x + k * 7, GY1); rg.stroke(); } for (let k = 0; k < 16; k++) { rg.beginPath(); rg.moveTo(x, GY0 + k * 14); rg.lineTo(x + 46, GY0 + k * 14); rg.stroke(); } }
      // bottom net (P3)
      rg.fillStyle = COLD[2]; rg.beginPath(); rg.roundRect(GX0 - 8, Bt, GX1 - GX0 + 16, 46, 10); rg.fill(); rg.fillStyle = '#0a0d18'; rg.fillRect(GX0, Bt, GX1 - GX0, 38);
      rg.strokeStyle = 'rgba(255,255,255,0.22)'; rg.lineWidth = 1;
      for (let k = 0; k < 7; k++) { rg.beginPath(); rg.moveTo(GX0, Bt + k * 7); rg.lineTo(GX1, Bt + k * 7); rg.stroke(); }
      for (let k = 0; k < 16; k++) { rg.beginPath(); rg.moveTo(GX0 + k * 14, Bt); rg.lineTo(GX0 + k * 14, Bt + 46); rg.stroke(); }
      // boards
      rg.fillStyle = '#31406e'; rg.beginPath(); rg.roundRect(L - 12, Tp - 12, Rt - L + 24, Bt - Tp + 24, 46); rg.fill();
      rg.fillStyle = '#0a0d18'; rg.fillRect(L - 14, GY0, 16, GY1 - GY0); rg.fillRect(Rt - 2, GY0, 16, GY1 - GY0); rg.fillRect(GX0, Bt - 2, GX1 - GX0, 16);
      const ice = rg.createLinearGradient(0, Tp, 0, Bt); ice.addColorStop(0, '#eef8ff'); ice.addColorStop(1, '#cfe6f6');
      rg.fillStyle = ice; rg.beginPath(); rg.roundRect(L, Tp, Rt - L, Bt - Tp, 36); rg.fill();
      rg.save(); rg.beginPath(); rg.roundRect(L, Tp, Rt - L, Bt - Tp, 36); rg.clip();
      // creases, one per goal in its owner's colour
      for (const [i, x, y] of [[0, L, CY], [1, Rt, CY], [2, CX, Bt]]) { rg.fillStyle = COL[i]; rg.globalAlpha = 0.18; rg.beginPath(); rg.arc(x, y, 160, 0, TAU); rg.fill(); rg.globalAlpha = 0.55; rg.strokeStyle = COL[i]; rg.lineWidth = 5; rg.beginPath(); rg.arc(x, y, 160, 0, TAU); rg.stroke(); }
      rg.globalAlpha = 0.4; rg.strokeStyle = '#ff5d73'; rg.lineWidth = 6; rg.beginPath(); rg.moveTo(CX, Tp); rg.lineTo(CX, CY - 96); rg.stroke();
      rg.strokeStyle = '#35a0ff'; rg.lineWidth = 6; for (const x of [CX - 300, CX + 300]) { rg.beginPath(); rg.moveTo(x, Tp); rg.lineTo(x, Bt); rg.stroke(); }
      rg.globalAlpha = 0.5; rg.strokeStyle = '#ff5d73'; rg.lineWidth = 6; rg.beginPath(); rg.arc(CX, CY, 96, 0, TAU); rg.stroke();
      rg.fillStyle = '#ff5d73'; rg.beginPath(); rg.arc(CX, CY, 10, 0, TAU); rg.fill();
      rg.globalAlpha = 0.5; rg.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { rg.beginPath(); rg.ellipse(rand(L, Rt), rand(Tp, Bt), rand(20, 90), 2, rand(-0.4, 0.4), 0, TAU); rg.fill(); }
      rg.restore(); rg.globalAlpha = 1;
      rg.strokeStyle = '#ffffff'; rg.lineWidth = 4; rg.beginPath(); rg.roundRect(L, Tp, Rt - L, Bt - Tp, 36); rg.stroke();
      rg.fillStyle = '#0a0d18'; rg.fillRect(L - 3, GY0 + 2, 6, GY1 - GY0 - 4); rg.fillRect(Rt - 3, GY0 + 2, 6, GY1 - GY0 - 4); rg.fillRect(GX0 + 2, Bt - 3, GX1 - GX0 - 4, 6);
    })();

    const alive = () => M.filter(m => !m.out);
    const goalOpen = i => st.lives[i] > 0 && st.wallT[i] <= 0;
    function kickoff() {
      st.pucks = [mkPuck(CX, CY)];
      st.pows = []; st.powT = rand(5, 8); st.rally = 0; st.wallT = [0, 0, 0];
      M.forEach(m => { m.x = START[m.i][0]; m.y = START[m.i][1]; m.vx = m.vy = 0; m.dashT = 0; m.stun = 0; m.frozen = 0; m.giantT = 0; m.tr = BASE_R; m.energy = 1; m.lock = false; });
      st.phase = 'ready'; st.pt = 1.1;
      const left = alive();
      FX.banner('FACE OFF', { size: 84, life: 1.0, sub: left.length === 2 ? 'FINAL TWO' : '' }); S.count();
    }
    // the puck went into `owner`'s goal
    function concede(owner, k) {
      st.pucks = st.pucks.filter(p => p !== k);
      if (st.phase !== 'play') return;
      st.lives[owner]--; st.pop[owner] = 1; st.phase = 'goal'; st.pt = 2.1;
      const out = st.lives[owner] <= 0, by = k.last >= 0 && k.last !== owner && !M[k.last].out ? k.last : -1;
      const gx = owner === 0 ? L : owner === 1 ? Rt : k.x, gy = owner === 2 ? Bt : k.y, ang = owner === 0 ? 0 : owner === 1 ? Math.PI : -Math.PI / 2;
      FX.confetti(gx, gy, 80, { ang, spread: 1.1, speed: [250, 800] });
      FX.burst(gx, gy, { n: 30, color: [COL[owner], '#fff'], speed: 500, life: 0.7, size: 7 });
      FX.ring(gx, gy, { r1: 220, color: COL[owner], w: 10, life: 0.6 });
      FX.banner(out ? 'KNOCKED OUT!' : 'OUCH!', { color: COL[owner], size: out ? 120 : 170, life: 1.7, sub: P[owner].name + (out ? ' IS OUT' : ' LOSES A LIFE') });
      if (by >= 0) { st.happy[by] = 2.4; FX.text(M[by].x, M[by].y - M[by].r - 28, 'NICE SHOT!', { color: COL[by], size: 32, life: 1.5, vy: -30 }); FX.ring(M[by].x, M[by].y, { r1: 90, color: COL[by], w: 6 }); E.buzz(by, 60); }
      else if (k.last === owner) FX.text(clamp(gx, 200, W - 200), clamp(gy, 160, Bt - 80), 'OWN GOAL!', { color: '#fff', size: 34, life: 1.5, vy: -30 });
      S.goal(); E.shake(16); E.flash(COL[owner], 0.45); E.slow(0.3, 0.7); E.buzz(owner, 350);
      if (out) {
        const m = M[owner]; m.out = true; m.mag = false;
        FX.burst(m.x, m.y, { n: 40, color: [COL[owner], '#fff', '#c9d6ee'], speed: 420, life: 0.9, size: 9 });
        FX.burst(m.x, m.y, { n: 14, color: ['#c9d6ee', '#fff'], speed: 120, life: 1.2, size: 16, add: false, drag: 1.5 });
        FX.ring(m.x, m.y, { r1: 150, color: COL[owner], w: 9, life: 0.5 }); S.boom(m.x, false);
      }
    }
    function wallFx(k, x, y) {
      const sp = Math.hypot(k.vx, k.vy);
      if (sp > 160) { S.bounce(x); FX.burst(x, y, { n: 4 + sp / 200 | 0, color: '#fff', speed: sp * 0.25, life: 0.25, size: 3, add: false }); }
    }
    function blocked(k, i) {   // puck hit goal i while it was shielded or sealed
      if (st.lives[i] > 0) { S.zap(k.x); FX.burst(k.x, k.y, { n: 12, color: ['#C77DFF', '#fff'], speed: 300, life: 0.35 }); } else wallFx(k, k.x, k.y);
    }
    function updMallet(m, p, dt) {
      m.dashCd -= dt; m.giantT -= dt; m.squash *= Math.exp(-10 * dt);
      m.tr = m.giantT > 0 ? 58 : BASE_R; m.r = lerp(m.r, m.tr, 1 - Math.exp(-10 * dt));
      m.blink -= dt; if (m.blink < -0.12) m.blink = rand(1.5, 4);
      m.mag = false;
      if (m.frozen > 0) { m.frozen -= dt; m.vx *= Math.exp(-6 * dt); m.vy *= Math.exp(-6 * dt); if (m.frozen <= 0) { FX.burst(m.x, m.y, { n: 16, color: ['#8fe9ff', '#fff'], speed: 260, life: 0.5, size: 5, sq: true, add: false }); S.crate(m.x); } }
      else if (m.stun > 0) { m.stun -= dt; m.spin += dt * 14; m.vx *= Math.exp(-3 * dt); m.vy *= Math.exp(-3 * dt); }
      else if (m.dashT > 0) { m.dashT -= dt; FX.burst(m.x, m.y, { n: 1, color: COL[m.i], speed: 30, life: 0.3, size: m.r * 0.7 }); }
      else {
        m.spin = 0;
        const k = 1 - Math.exp(-13 * dt); m.vx += (p.x * 560 - m.vx) * k; m.vy += (p.y * 560 - m.vy) * k;
        if (p.ap && m.dashCd <= 0 && st.phase !== 'ready') {
          let dx = p.x, dy = p.y;
          if (p.mag < 0.25) { const t = st.pucks[0]; if (t) { dx = t.x - m.x; dy = t.y - m.y; } else { dx = CX - m.x; dy = CY - m.y; } }
          const d = Math.hypot(dx, dy) || 1; m.vx = dx / d * 1180; m.vy = dy / d * 1180; m.dashT = 0.15; m.dashCd = 0.8;
          S.dash(m.x); FX.ring(m.x, m.y, { r1: m.r * 1.7, color: COL[m.i], w: 5, life: 0.25 });
        }
        if (m.energy <= 0) m.lock = true; if (m.energy > 0.3) m.lock = false;
        if (p.b && !m.lock && st.phase === 'play') {
          m.mag = true; m.energy = Math.max(0, m.energy - 0.6 * dt);
          for (const k2 of st.pucks) {
            const dx = m.x - k2.x, dy = m.y - k2.y, d = Math.hypot(dx, dy);
            if (d < 320 && d > 1) { const f = 2600 * (1 - d / 320) + 500; k2.vx += dx / d * f * dt; k2.vy += dy / d * f * dt; k2.vx *= Math.exp(-1.4 * dt); k2.vy *= Math.exp(-1.4 * dt); }
          }
          if (Math.random() < 0.5) { const a = rand(TAU), rd = rand(120, 240); FX.burst(m.x + Math.cos(a) * rd, m.y + Math.sin(a) * rd, { n: 1, color: COL[m.i], ang: a + Math.PI, spread: 0.1, speed: [300, 420], life: 0.35, size: 3, drag: 0 }); }
        } else m.energy = Math.min(1, m.energy + 0.28 * dt);
      }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.x < L + m.r) { m.x = L + m.r; m.vx = Math.max(0, m.vx); } if (m.x > Rt - m.r) { m.x = Rt - m.r; m.vx = Math.min(0, m.vx); }
      if (m.y < Tp + m.r) { m.y = Tp + m.r; m.vy = Math.max(0, m.vy); } if (m.y > Bt - m.r) { m.y = Bt - m.r; m.vy = Math.min(0, m.vy); }
      const sp = Math.hypot(m.vx, m.vy);
      if (sp > 200 && Math.random() < 0.3) { mg.strokeStyle = 'rgba(120,160,200,0.12)'; mg.lineWidth = 2; mg.beginPath(); mg.moveTo(m.x, m.y + m.r * 0.6); mg.lineTo(m.x - m.vx * 0.04, m.y + m.r * 0.6 - m.vy * 0.04); mg.stroke(); }
      for (let i = st.pows.length - 1; i >= 0; i--) {
        const pw = st.pows[i]; if (dist(pw.x, pw.y, m.x, m.y) > m.r + 24) continue;
        st.pows.splice(i, 1);
        if (pw.type === 'giant') m.giantT = 8;
        else if (pw.type === 'multi') { for (let k = 0; k < 2; k++) { const a = rand(TAU); st.pucks.push(mkPuck(pw.x, pw.y, Math.cos(a) * 420, Math.sin(a) * 420)); } }
        else if (pw.type === 'freeze') { for (const o of M) if (o !== m && !o.out) { o.frozen = 1.8; o.dashT = 0; S.zap(o.x); FX.ring(o.x, o.y, { r1: 90, color: '#8fe9ff', w: 8 }); E.buzz(o.i, 200); } }
        else st.wallT[m.i] = 7;
        FX.text(m.x, m.y - m.r - 20, POWS[pw.type].label, { color: POWS[pw.type].c, size: 28 }); FX.ring(pw.x, pw.y, { r1: 80, color: POWS[pw.type].c, w: 6 });
        FX.burst(pw.x, pw.y, { n: 18, color: [POWS[pw.type].c, '#fff'], speed: 300, life: 0.5 }); S.power(); E.buzz(m.i, 50);
      }
    }
    function bonk(a, b) {   // mallet vs mallet
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = a.r + b.r;
      if (d >= md || d < 0.01) return;
      const nx = dx / d, ny = dy / d, o = (md - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel >= 0) return;
      const j = 0.9 * rel; a.vx += j * nx; a.vy += j * ny; b.vx -= j * nx; b.vy -= j * ny;
      const ad = a.dashT > 0, bd = b.dashT > 0;
      if (ad || bd) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (ad && b.frozen <= 0) { b.stun = bd ? 0.35 : 0.7; b.vx += nx * 520; b.vy += ny * 520; b.dashT = 0; E.buzz(b.i, 120); }
        if (bd && a.frozen <= 0) { a.stun = ad ? 0.35 : 0.7; a.vx -= nx * 520; a.vy -= ny * 520; a.dashT = 0; E.buzz(a.i, 120); }
        S.hit(mx); E.shake(9); E.freeze(0.05); FX.burst(mx, my, { n: 18, color: ['#FFD23F', '#fff'], speed: 380, life: 0.45, size: 5 }); FX.ring(mx, my, { r1: 90, color: '#fff', w: 7, life: 0.3 });
        FX.text(mx, my - 50, ad && bd ? 'CLASH!' : 'BONK!', { color: '#FFD23F', size: 30 });
      } else if (rel < -200) S.thud((a.x + b.x) / 2);
    }
    function updPuck(k, dt) {
      const f = Math.exp(-0.2 * dt); k.vx *= f; k.vy *= f;
      const maxSp = 1250 + Math.min(st.rally, 12) * 40; let sp = Math.hypot(k.vx, k.vy);
      if (sp > maxSp) { k.vx *= maxSp / sp; k.vy *= maxSp / sp; sp = maxSp; }
      k.heat = Math.max(0, k.heat - dt * 0.5); k.spin += sp * dt * 0.02;
      const steps = sp * dt > 12 ? 2 : 1, h = dt / steps;
      for (let s = 0; s < steps; s++) {
        k.x += k.vx * h; k.y += k.vy * h;
        // mallets
        for (const m of M) {
          if (m.out) continue;
          const dx = k.x - m.x, dy = k.y - m.y, d = Math.hypot(dx, dy), md = m.r + PR;
          if (d >= md || d < 0.01) continue;
          const nx = dx / d, ny = dy / d; k.x = m.x + nx * md; k.y = m.y + ny * md;
          const rel = (k.vx - m.vx) * nx + (k.vy - m.vy) * ny;
          if (rel < 0) {
            const e = m.frozen > 0 ? 0.6 : 1.05; k.vx -= (1 + e) * rel * nx; k.vy -= (1 + e) * rel * ny;
            const power = m.dashT > 0;
            if (power) { k.vx += nx * 420; k.vy += ny * 420; k.heat = 1; E.freeze(0.035); E.shake(7); FX.ring(k.x, k.y, { r1: 80, color: '#FFD23F', w: 7, life: 0.3 }); FX.burst(k.x, k.y, { n: 16, color: ['#FFD23F', '#FF8A3D', '#fff'], speed: 420, life: 0.4, size: 5, ang: Math.atan2(ny, nx), spread: 0.9 }); S.hit(k.x); E.buzz(m.i, 40); }
            else { const imp = Math.min(1, -rel / 900); S.thud(k.x); tone({ f: 500 + imp * 500, f2: 300, d: 0.06, v: 0.06 + imp * 0.1, type: 'triangle', pan: panX(k.x) }); FX.burst(k.x - nx * PR, k.y - ny * PR, { n: 5, color: '#fff', speed: 160, life: 0.22, size: 3, add: false }); }
            m.squash = Math.min(0.28, -rel / 3000 + 0.08); m.hitAng = Math.atan2(ny, nx);
            if (k.last !== m.i) st.rally++; k.last = m.i;
          }
        }
        // goal posts
        for (const [px, py] of [[L, GY0], [L, GY1], [Rt, GY0], [Rt, GY1], [GX0, Bt], [GX1, Bt]]) {
          const dx = k.x - px, dy = k.y - py, d = Math.hypot(dx, dy);
          if (d < PR + 8 && d > 0.01) { const nx = dx / d, ny = dy / d, dot = k.vx * nx + k.vy * ny; k.x = px + nx * (PR + 8); k.y = py + ny * (PR + 8); if (dot < 0) { k.vx -= 1.9 * dot * nx; k.vy -= 1.9 * dot * ny; S.clang(px); FX.burst(px, py, { n: 8, color: '#fff', speed: 200, life: 0.3, size: 3 }); E.shake(4); } }
        }
        // left (P1) and right (P2) walls and goals
        const inMouthY = k.y > GY0 && k.y < GY1;
        for (const side of [0, 1]) {
          const outside = side ? k.x + PR > Rt : k.x - PR < L; if (!outside) continue;
          if (inMouthY && goalOpen(side)) {
            if (side ? k.x > Rt + PR + 6 : k.x < L - PR - 6) { concede(side, k); return; }
            if (side ? k.x > Rt : k.x < L) { if (k.y - PR < GY0) { k.y = GY0 + PR; k.vy = Math.abs(k.vy); } if (k.y + PR > GY1) { k.y = GY1 - PR; k.vy = -Math.abs(k.vy); } }
          } else {
            if (inMouthY) blocked(k, side); else wallFx(k, side ? Rt : L, k.y);
            k.x = side ? Rt - PR : L + PR; k.vx = (side ? -1 : 1) * Math.abs(k.vx) * 0.97;
          }
        }
        if (k.y - PR < Tp) { wallFx(k, k.x, Tp); k.y = Tp + PR; k.vy = Math.abs(k.vy) * 0.97; }
        // bottom wall and P3's goal
        if (k.y + PR > Bt) {
          const inMouthX = k.x > GX0 && k.x < GX1;
          if (inMouthX && goalOpen(2)) {
            if (k.y > Bt + PR + 6) { concede(2, k); return; }
            if (k.y > Bt) { if (k.x - PR < GX0) { k.x = GX0 + PR; k.vx = Math.abs(k.vx); } if (k.x + PR > GX1) { k.x = GX1 - PR; k.vx = -Math.abs(k.vx); } }
          } else {
            if (inMouthX) blocked(k, 2); else wallFx(k, k.x, Bt);
            k.y = Bt - PR; k.vy = -Math.abs(k.vy) * 0.97;
          }
        }
      }
      k.trail.push(k.x, k.y); if (k.trail.length > 28) k.trail.splice(0, 2);
    }

    kickoff();
    return {
      _dbg: { st, M },   // test handle only
      update(dt) {
        if (st.phase === 'ready') { st.pt -= dt; if (st.pt <= 0) { st.phase = 'play'; S.go(); FX.ring(CX, CY, { r1: 130, color: '#fff', w: 8 }); } }
        for (const m of M) if (!m.out) updMallet(m, P[m.i], dt);
        for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (!M[i].out && !M[j].out) bonk(M[i], M[j]);
        if (st.phase !== 'ready') for (const k of st.pucks.slice()) updPuck(k, dt);
        if (st.phase === 'play') {
          st.powT -= dt;
          if (st.powT <= 0) { st.powT = rand(7, 11); if (st.pows.length < 1) { const p = { x: rand(330, 950), y: rand(170, 540), type: pick(Object.keys(POWS)), age: 0 }; st.pows.push(p); FX.ring(p.x, p.y, { r0: 70, r1: 10, color: POWS[p.type].c, w: 4 }); S.ui(); } }
          if (!st.pucks.length) st.pucks.push(mkPuck(CX, CY));
        }
        if (st.phase === 'goal') {
          st.pt -= dt;
          if (st.pt <= 0) {
            const left = alive();
            if (left.length <= 1) {
              const w = left.length ? left[0].i : -1; st.phase = 'over'; st.over = true; if (w >= 0) st.happy[w] = 999;
              FX.confetti(W / 2, 220, 140);
              E.endMatch({ winner: w, title: w >= 0 ? P[w].name + ' WINS!' : 'DRAW', sub: 'Last one standing' + (w >= 0 ? '  ·  ' + st.lives[w] + (st.lives[w] === 1 ? ' life left' : ' lives left') : '') });
            } else kickoff();
          }
        }
        for (const p of st.pows) p.age += dt;
        for (let i = 0; i < 3; i++) { st.wallT[i] -= dt; st.pop[i] = Math.max(0, st.pop[i] - dt * 1.5); st.happy[i] -= dt; }
        FX.update(dt);
      },
      draw(g) {
        g.drawImage(rink, 0, 0); g.drawImage(marks, 0, 0);
        // sealed goals (owner is out) and goal shields
        for (let i = 0; i < 3; i++) {
          if (st.lives[i] <= 0) {
            g.fillStyle = '#31406e'; g.strokeStyle = '#fff'; g.lineWidth = 4;
            if (i < 2) { const x = i ? Rt - 2 : L - 14; g.fillRect(x, GY0 - 4, 16, GY1 - GY0 + 8); g.beginPath(); g.moveTo(i ? Rt : L, GY0 - 4); g.lineTo(i ? Rt : L, GY1 + 4); g.stroke(); }
            else { g.fillRect(GX0 - 4, Bt - 2, GX1 - GX0 + 8, 16); g.beginPath(); g.moveTo(GX0 - 4, Bt); g.lineTo(GX1 + 4, Bt); g.stroke(); }
            g.globalAlpha = 0.55; g.fillStyle = '#0a0d18';
            if (i < 2) g.fillRect(i ? Rt + 14 : L - 46, GY0 - 8, 32, GY1 - GY0 + 16); else g.fillRect(GX0 - 8, Bt + 14, GX1 - GX0 + 16, 32);
            g.globalAlpha = 1;
          } else if (st.wallT[i] > 0) {
            g.globalAlpha = (st.wallT[i] < 1.5 ? 0.4 + 0.4 * Math.sin(E.t * 30) : 0.8); g.strokeStyle = '#C77DFF'; g.lineWidth = 8; g.beginPath();
            if (i < 2) { const x = i ? Rt : L; for (let y = GY0; y <= GY1; y += 10) g.lineTo(x + Math.sin(y * 0.2 + E.t * 20) * 4, y); }
            else for (let x = GX0; x <= GX1; x += 10) g.lineTo(x, Bt + Math.sin(x * 0.2 + E.t * 20) * 4);
            g.stroke(); g.globalAlpha = 1;
          }
        }
        for (const p of st.pows) {
          const c = POWS[p.type].c, s = Math.min(1, p.age * 4) * (1 + Math.sin(p.age * 5) * 0.06);
          g.save(); g.translate(p.x, p.y); g.scale(s, s);
          g.fillStyle = 'rgba(20,40,80,0.2)'; g.beginPath(); g.ellipse(3, 8, 24, 22, 0, 0, TAU); g.fill();
          g.fillStyle = c; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill(); g.fillStyle = '#10131f'; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
          txt(p.type === 'giant' ? '+' : p.type === 'multi' ? '3' : p.type === 'freeze' ? '*' : '#', 0, 2, 24, c);
          g.restore();
        }
        // magnet fields
        for (const m of M) if (m.mag && !m.out) { g.strokeStyle = COL[m.i]; g.lineWidth = 3; for (let k = 0; k < 3; k++) { const rr2 = 320 - ((E.t * 260 + k * 107) % 320); g.globalAlpha = 0.35 * (rr2 / 320); g.beginPath(); g.arc(m.x, m.y, rr2 + m.r, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
        // pucks
        for (const k of st.pucks) {
          const sp = Math.hypot(k.vx, k.vy), hot = Math.max(k.heat, clamp((sp - 700) / 600, 0, 1)), n = k.trail.length / 2;
          for (let i = 0; i < n; i++) { const t = i / n; g.globalAlpha = t * 0.5; g.fillStyle = hot > 0.5 ? (t > 0.6 ? '#FFD23F' : '#FF8A3D') : '#6f89b8'; g.beginPath(); g.arc(k.trail[i * 2], k.trail[i * 2 + 1], PR * (0.3 + 0.7 * t), 0, TAU); g.fill(); }
          g.globalAlpha = 1;
          g.fillStyle = 'rgba(20,40,80,0.3)'; g.beginPath(); g.arc(k.x + 3, k.y + 6, PR, 0, TAU); g.fill();
          g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(k.x, k.y, PR, 0, TAU); g.fill();
          g.fillStyle = hot > 0.5 ? '#FF8A3D' : (k.last >= 0 ? COLD[k.last] : '#39466e'); g.beginPath(); g.arc(k.x, k.y, PR - 4, 0, TAU); g.fill();
          g.strokeStyle = hot > 0.5 ? '#FFD23F' : (k.last >= 0 ? COLL[k.last] : '#93a6d6'); g.lineWidth = 3; g.beginPath(); g.arc(k.x, k.y, PR - 8, k.spin, k.spin + 2.2); g.stroke();
        }
        // mallets
        for (const m of M) {
          if (m.out) continue;
          const t = st.pucks[0], lx = t ? t.x - m.x : 0, ly = t ? t.y - m.y : 0, ld = Math.hypot(lx, ly) || 1;
          drawMallet(g, m.x, m.y, m.r, m.i, { lx: lx / ld, ly: ly / ld, squash: m.squash, ang: m.hitAng, dizzy: m.stun > 0, dash: m.dashT > 0, blink: m.blink < 0, happy: st.happy[m.i] > 0, spin: m.stun > 0 ? Math.sin(m.spin) * 0.5 : 0 });
          if (m.frozen > 0) { g.globalAlpha = 0.65; g.fillStyle = '#bff4ff'; rr(m.x - m.r - 6, m.y - m.r - 6, m.r * 2 + 12, m.r * 2 + 12, 10); g.fill(); g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
          if (m.stun > 0) for (let k = 0; k < 3; k++) { const a = E.t * 8 + k * 2.1; txt('★', m.x + Math.cos(a) * m.r, m.y - m.r - 8 + Math.sin(a) * 6, 18, '#FFD23F'); }
          if (m.dashCd > 0 && m.dashT <= 0) { g.strokeStyle = 'rgba(10,13,24,0.35)'; g.lineWidth = 4; g.beginPath(); g.arc(m.x, m.y, m.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - m.dashCd / 0.8)); g.stroke(); }
        }
        FX.draw(g);
        // HUD: one block per player (P1 left, P3 middle, P2 right — same sides as their goals)
        for (let i = 0; i < 3; i++) {
          const bx = HX[i], m = M[i];
          rr(bx - 140, 5, 280, 68, 16); g.fillStyle = 'rgba(10,13,24,0.9)'; g.fill();
          if (!m.out) { g.lineWidth = 2; g.strokeStyle = COL[i]; g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1; }
          g.globalAlpha = m.out ? 0.35 : 1;
          g.font = 'bold 20px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = COL[i]; g.fillText(P[i].name, bx - 126, 25, 132);
          for (let k = 0; k < LIVES; k++) {
            const on = k < st.lives[i], px = bx + 28 + k * 24;
            g.fillStyle = on ? COL[i] : 'rgba(255,255,255,0.13)'; g.beginPath(); g.arc(px, 25, on && st.lives[i] === 1 ? 8 + Math.sin(E.t * 10) * 1.5 : 8, 0, TAU); g.fill();
            if (k === st.lives[i] && st.pop[i] > 0) { g.globalAlpha = st.pop[i]; g.fillStyle = '#fff'; g.beginPath(); g.arc(px, 25, 8 + (1 - st.pop[i]) * 22, 0, TAU); g.fill(); g.globalAlpha = m.out ? 0.35 : 1; }
          }
          rr(bx - 126, 44, 252, 10, 5); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill();
          if (!m.out) { rr(bx - 126, 44, Math.max(10, 252 * m.energy), 10, 5); g.fillStyle = m.lock ? '#666f85' : COL[i]; g.fill(); }
          txt(m.out ? 'OUT' : 'MAGNET', bx - 126, 63, 9, 'rgba(255,255,255,0.5)', { align: 'left' });
          txt(i === 0 ? '◀ LEFT GOAL' : i === 1 ? 'RIGHT GOAL ▶' : '▼ BOTTOM GOAL', bx + 126, 63, 9, 'rgba(255,255,255,0.5)', { align: 'right' });
          g.globalAlpha = 1;
        }
        FX.drawText(g);
      },
    };
  }

  GAMES.push({
    id: 'puck', name: 'TURBO PUCK', tag: 'VERSUS', color: '#8fd3ff',
    tagline: 'Three goals, five lives. Last one standing.',
    pad: { a: 'DASH', b: 'MAGNET', stick: 'SKATE' },
    how: { goal: 'Guard your goal — last player with lives wins', rows: [['STICK', 'Skate anywhere on the rink'], ['A', 'Dash — smash the puck or bonk a rival'], ['B', 'Hold: magnet pulls the puck to you']],
      tips: ['P1 guards the left goal, P2 the right, P3 the bottom. Lose 5 lives and you are out', 'Grab orbs: giant, multi-puck, freeze (both rivals), goal shield'] },
    song: { bpm: 138, root: 55, minor: false, prog: [0, 3, 4, 3], kick: 'x---x---x---x---', snare: '----x-------x---', hat: 'xxxxxxxxxxxxxxxx', bass: 'x-x-o-x-x-x-o-xo', arp: '0-2-1-3-0-2-3-1-' },
    icon(g, t) {
      const px = Math.sin(t * 3) * 48, py = Math.sin(t * 4.3) * 18 - 8;
      g.fillStyle = '#dff1ff'; rr(-112, -52, 224, 104, 16); g.fill();
      for (const [i, x, y] of [[0, -112, 0], [1, 112, 0], [2, 0, 52]]) { g.save(); rr(-112, -52, 224, 104, 16); g.clip(); g.globalAlpha = 0.3; g.fillStyle = COL[i]; g.beginPath(); g.arc(x, y, 34, 0, TAU); g.fill(); g.restore(); }
      g.globalAlpha = 1;
      drawMallet(g, -80, Math.sin(t * 2) * 12 - 6, 21, 0, { lx: 1, ly: 0 }); drawMallet(g, 80, -Math.sin(t * 2.2) * 12 - 6, 21, 1, { lx: -1, ly: 0 });
      drawMallet(g, Math.sin(t * 1.7) * 20, 28, 21, 2, { lx: 0, ly: -1 });
      g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(px, py, 10, 0, TAU); g.fill(); g.fillStyle = '#39466e'; g.beginPath(); g.arc(px, py, 6, 0, TAU); g.fill();
    },
    create,
  });
})();
