'use strict';
// TURBO PUCK — free-roaming air hockey with dashes, a magnet and power-ups.
(function () {
  const L = 60, Rt = 1220, Tp = 90, Bt = 690, CX = 640, CY = 390, GY0 = 280, GY1 = 500, WIN = 7, PR = 16, BASE_R = 36;
  const POWS = { giant: { c: '#7CFF6B', label: 'GIANT!' }, multi: { c: '#FFD23F', label: 'MULTI-PUCK!' }, freeze: { c: '#8fe9ff', label: 'FREEZE!' }, wall: { c: '#C77DFF', label: 'GOAL SHIELD!' } };

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
    const st = { score: [0, 0], pop: [0, 0], pucks: [], pows: [], phase: 'ready', pt: 1.2, powT: 6, rally: 0, wallT: [0, 0], happy: [0, 0], over: false };
    const M = [0, 1].map(i => ({ i, x: 0, y: 0, vx: 0, vy: 0, r: BASE_R, tr: BASE_R, dashT: 0, dashCd: 0, stun: 0, frozen: 0, giantT: 0, energy: 1, lock: false, mag: false, squash: 0, hitAng: 0, blink: rand(1, 4), spin: 0 }));
    // prerendered rink
    const rink = document.createElement('canvas'); rink.width = W; rink.height = H; const rg = rink.getContext('2d');
    const marks = document.createElement('canvas'); marks.width = W; marks.height = H; const mg = marks.getContext('2d');
    (function () {
      const bg = rg.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0c1230'); bg.addColorStop(1, '#17214d'); rg.fillStyle = bg; rg.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) { rg.fillStyle = pick(['#35C2FF', '#FF5D73', '#FFD23F', '#ffffff', '#7CFF6B']); rg.globalAlpha = rand(0.15, 0.5); rg.beginPath(); rg.arc(rand(W), pick([rand(52, 78), rand(700, 716)]), rand(2, 5), 0, TAU); rg.fill(); }
      rg.globalAlpha = 1;
      for (let i = 0; i < 2; i++) { const x = i ? Rt : L - 46; rg.fillStyle = COLD[i]; rg.beginPath(); rg.roundRect(x, GY0 - 8, 46, GY1 - GY0 + 16, 10); rg.fill(); rg.fillStyle = '#0a0d18'; rg.fillRect(i ? Rt : L - 38, GY0, 38, GY1 - GY0);
        rg.strokeStyle = 'rgba(255,255,255,0.22)'; rg.lineWidth = 1; for (let k = 0; k < 7; k++) { rg.beginPath(); rg.moveTo(x + k * 7, GY0); rg.lineTo(x + k * 7, GY1); rg.stroke(); } for (let k = 0; k < 16; k++) { rg.beginPath(); rg.moveTo(x, GY0 + k * 14); rg.lineTo(x + 46, GY0 + k * 14); rg.stroke(); } }
      rg.fillStyle = '#31406e'; rg.beginPath(); rg.roundRect(L - 12, Tp - 12, Rt - L + 24, Bt - Tp + 24, 46); rg.fill();
      rg.fillStyle = '#0a0d18'; rg.fillRect(L - 14, GY0, 16, GY1 - GY0); rg.fillRect(Rt - 2, GY0, 16, GY1 - GY0);
      const ice = rg.createLinearGradient(0, Tp, 0, Bt); ice.addColorStop(0, '#eef8ff'); ice.addColorStop(1, '#cfe6f6');
      rg.fillStyle = ice; rg.beginPath(); rg.roundRect(L, Tp, Rt - L, Bt - Tp, 36); rg.fill();
      rg.save(); rg.beginPath(); rg.roundRect(L, Tp, Rt - L, Bt - Tp, 36); rg.clip();
      for (let i = 0; i < 2; i++) { rg.fillStyle = COL[i]; rg.globalAlpha = 0.16; rg.beginPath(); rg.arc(i ? Rt : L, CY, 170, 0, TAU); rg.fill(); rg.globalAlpha = 0.5; rg.strokeStyle = COL[i]; rg.lineWidth = 5; rg.beginPath(); rg.arc(i ? Rt : L, CY, 170, 0, TAU); rg.stroke(); }
      rg.globalAlpha = 0.5; rg.strokeStyle = '#ff5d73'; rg.lineWidth = 8; rg.beginPath(); rg.moveTo(CX, Tp); rg.lineTo(CX, Bt); rg.stroke();
      rg.strokeStyle = '#35a0ff'; rg.lineWidth = 6; for (const x of [CX - 220, CX + 220]) { rg.beginPath(); rg.moveTo(x, Tp); rg.lineTo(x, Bt); rg.stroke(); }
      rg.strokeStyle = '#ff5d73'; rg.lineWidth = 6; rg.beginPath(); rg.arc(CX, CY, 96, 0, TAU); rg.stroke();
      rg.fillStyle = '#ff5d73'; rg.beginPath(); rg.arc(CX, CY, 10, 0, TAU); rg.fill();
      rg.globalAlpha = 0.5; rg.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { rg.beginPath(); rg.ellipse(rand(L, Rt), rand(Tp, Bt), rand(20, 90), 2, rand(-0.4, 0.4), 0, TAU); rg.fill(); }
      rg.restore(); rg.globalAlpha = 1;
      rg.strokeStyle = '#ffffff'; rg.lineWidth = 4; rg.beginPath(); rg.roundRect(L, Tp, Rt - L, Bt - Tp, 36); rg.stroke();
      rg.fillStyle = '#0a0d18'; rg.fillRect(L - 3, GY0 + 2, 6, GY1 - GY0 - 4); rg.fillRect(Rt - 3, GY0 + 2, 6, GY1 - GY0 - 4);
    })();

    function kickoff() {
      st.pucks = [{ x: CX, y: CY, vx: 0, vy: 0, heat: 0, trail: [], last: -1, spin: 0 }];
      st.pows = []; st.powT = rand(5, 8); st.rally = 0; st.wallT = [0, 0];
      M.forEach(m => { m.x = m.i ? Rt - 200 : L + 200; m.y = CY; m.vx = m.vy = 0; m.dashT = 0; m.stun = 0; m.frozen = 0; m.giantT = 0; m.tr = BASE_R; m.energy = 1; m.lock = false; });
      st.phase = 'ready'; st.pt = 1.1;
      const mp = st.score[0] === WIN - 1 || st.score[1] === WIN - 1;
      FX.banner('FACE OFF', { size: 84, life: 1.0, sub: mp ? 'MATCH POINT' : '' }); S.count();
    }
    function goal(scorer, k) {
      if (st.phase !== 'play') return;
      st.score[scorer]++; st.pop[scorer] = 1; st.happy[scorer] = 2.2; st.phase = 'goal'; st.pt = 2.0;
      const gx = scorer ? L : Rt;
      FX.confetti(gx, CY, 90, { ang: scorer ? 0 : Math.PI, spread: 1.1, speed: [250, 800] });
      FX.burst(gx, k.y, { n: 30, color: [COL[scorer], '#fff'], speed: 500, life: 0.7, size: 7 });
      FX.ring(gx, k.y, { r1: 220, color: COL[scorer], w: 10, life: 0.6 });
      FX.banner('GOAL!', { color: COL[scorer], size: 170, life: 1.6, sub: P[scorer].name + ' SCORES' });
      S.goal(); E.shake(16); E.flash(COL[scorer], 0.45); E.slow(0.3, 0.7); E.buzz(-1, 250);
      st.pucks = st.pucks.filter(p => p !== k);
    }
    function wallFx(k, x, y) {
      const sp = Math.hypot(k.vx, k.vy);
      if (sp > 160) { S.bounce(x); FX.burst(x, y, { n: 4 + sp / 200 | 0, color: '#fff', speed: sp * 0.25, life: 0.25, size: 3, add: false }); }
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
          if (p.mag < 0.25) { const t = st.pucks[0]; if (t) { dx = t.x - m.x; dy = t.y - m.y; } else { dx = m.i ? -1 : 1; dy = 0; } }
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
        st.pows.splice(i, 1); const o = M[1 - m.i];
        if (pw.type === 'giant') m.giantT = 8;
        else if (pw.type === 'multi') { for (let k = 0; k < 2; k++) { const a = rand(TAU); st.pucks.push({ x: pw.x, y: pw.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, heat: 0, trail: [], last: -1, spin: 0 }); } }
        else if (pw.type === 'freeze') { o.frozen = 1.8; o.dashT = 0; S.zap(o.x); FX.ring(o.x, o.y, { r1: 90, color: '#8fe9ff', w: 8 }); E.buzz(o.i, 200); }
        else st.wallT[m.i] = 7;
        FX.text(m.x, m.y - m.r - 20, POWS[pw.type].label, { color: POWS[pw.type].c, size: 28 }); FX.ring(pw.x, pw.y, { r1: 80, color: POWS[pw.type].c, w: 6 });
        FX.burst(pw.x, pw.y, { n: 18, color: [POWS[pw.type].c, '#fff'], speed: 300, life: 0.5 }); S.power(); E.buzz(m.i, 50);
      }
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
        for (const [px, py] of [[L, GY0], [L, GY1], [Rt, GY0], [Rt, GY1]]) {
          const dx = k.x - px, dy = k.y - py, d = Math.hypot(dx, dy);
          if (d < PR + 8 && d > 0.01) { const nx = dx / d, ny = dy / d, dot = k.vx * nx + k.vy * ny; k.x = px + nx * (PR + 8); k.y = py + ny * (PR + 8); if (dot < 0) { k.vx -= 1.9 * dot * nx; k.vy -= 1.9 * dot * ny; S.clang(px); FX.burst(px, py, { n: 8, color: '#fff', speed: 200, life: 0.3, size: 3 }); E.shake(4); } }
        }
        const inMouth = k.y > GY0 && k.y < GY1;
        for (const side of [0, 1]) {
          const out = side ? k.x + PR > Rt : k.x - PR < L; if (!out) continue;
          if (inMouth && st.wallT[side] <= 0) {
            if (side ? k.x > Rt + PR + 6 : k.x < L - PR - 6) { goal(1 - side, k); return; }
            if (side ? k.x > Rt : k.x < L) { if (k.y - PR < GY0) { k.y = GY0 + PR; k.vy = Math.abs(k.vy); } if (k.y + PR > GY1) { k.y = GY1 - PR; k.vy = -Math.abs(k.vy); } }
          } else {
            if (inMouth) { S.zap(k.x); FX.burst(k.x, k.y, { n: 12, color: ['#C77DFF', '#fff'], speed: 300, life: 0.35 }); } else wallFx(k, side ? Rt : L, k.y);
            k.x = side ? Rt - PR : L + PR; k.vx = (side ? -1 : 1) * Math.abs(k.vx) * 0.97;
          }
        }
        if (k.y - PR < Tp) { wallFx(k, k.x, Tp); k.y = Tp + PR; k.vy = Math.abs(k.vy) * 0.97; }
        if (k.y + PR > Bt) { wallFx(k, k.x, Bt); k.y = Bt - PR; k.vy = -Math.abs(k.vy) * 0.97; }
      }
      k.trail.push(k.x, k.y); if (k.trail.length > 28) k.trail.splice(0, 2);
    }

    kickoff();
    return {
      update(dt) {
        if (st.phase === 'ready') { st.pt -= dt; if (st.pt <= 0) { st.phase = 'play'; S.go(); FX.ring(CX, CY, { r1: 130, color: '#fff', w: 8 }); } }
        for (const m of M) updMallet(m, P[m.i], dt);
        // mallet vs mallet
        const a = M[0], b = M[1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = a.r + b.r;
        if (d < md && d > 0.01) {
          const nx = dx / d, ny = dy / d, o = (md - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            const j = 0.9 * rel; a.vx += j * nx; a.vy += j * ny; b.vx -= j * nx; b.vy -= j * ny;
            const ad = a.dashT > 0, bd = b.dashT > 0;
            if (ad || bd) {
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              if (ad && b.frozen <= 0) { b.stun = bd ? 0.35 : 0.7; b.vx += nx * 520; b.vy += ny * 520; b.dashT = 0; E.buzz(1, 120); }
              if (bd && a.frozen <= 0) { a.stun = ad ? 0.35 : 0.7; a.vx -= nx * 520; a.vy -= ny * 520; a.dashT = 0; E.buzz(0, 120); }
              S.hit(mx); E.shake(9); E.freeze(0.05); FX.burst(mx, my, { n: 18, color: ['#FFD23F', '#fff'], speed: 380, life: 0.45, size: 5 }); FX.ring(mx, my, { r1: 90, color: '#fff', w: 7, life: 0.3 });
              FX.text(mx, my - 50, ad && bd ? 'CLASH!' : 'BONK!', { color: '#FFD23F', size: 30 });
            } else if (rel < -200) S.thud((a.x + b.x) / 2);
          }
        }
        if (st.phase !== 'ready') for (const k of st.pucks.slice()) updPuck(k, dt);
        if (st.phase === 'play') {
          st.powT -= dt;
          if (st.powT <= 0) { st.powT = rand(7, 11); if (st.pows.length < 1) { const p = { x: rand(330, 950), y: rand(170, 610), type: pick(Object.keys(POWS)), age: 0 }; st.pows.push(p); FX.ring(p.x, p.y, { r0: 70, r1: 10, color: POWS[p.type].c, w: 4 }); S.ui(); } }
          if (!st.pucks.length) { st.pucks.push({ x: CX, y: CY, vx: 0, vy: 0, heat: 0, trail: [], last: -1, spin: 0 }); }
        }
        if (st.phase === 'goal') {
          st.pt -= dt;
          if (st.pt <= 0) {
            const w = st.score[0] >= WIN ? 0 : st.score[1] >= WIN ? 1 : -1;
            if (w >= 0) { st.phase = 'over'; st.over = true; st.happy[w] = 999; FX.confetti(W / 2, 220, 140); E.endMatch({ winner: w, title: P[w].name + ' WINS!', sub: st.score[0] + ' – ' + st.score[1] }); }
            else kickoff();
          }
        }
        for (const p of st.pows) p.age += dt;
        for (let i = 0; i < 2; i++) { st.wallT[i] -= dt; st.pop[i] = Math.max(0, st.pop[i] - dt * 1.5); st.happy[i] -= dt; }
        FX.update(dt);
      },
      draw(g) {
        g.drawImage(rink, 0, 0); g.drawImage(marks, 0, 0);
        // goal shields
        for (let i = 0; i < 2; i++) if (st.wallT[i] > 0) {
          const x = i ? Rt : L; g.globalAlpha = (st.wallT[i] < 1.5 ? 0.4 + 0.4 * Math.sin(E.t * 30) : 0.8); g.strokeStyle = '#C77DFF'; g.lineWidth = 8;
          g.beginPath(); for (let y = GY0; y <= GY1; y += 10) g.lineTo(x + Math.sin(y * 0.2 + E.t * 20) * 4, y); g.stroke(); g.globalAlpha = 1;
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
        for (const m of M) if (m.mag) { g.strokeStyle = COL[m.i]; g.lineWidth = 3; for (let k = 0; k < 3; k++) { const rr2 = 320 - ((E.t * 260 + k * 107) % 320); g.globalAlpha = 0.35 * (rr2 / 320); g.beginPath(); g.arc(m.x, m.y, rr2 + m.r, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
        // pucks
        for (const k of st.pucks) {
          const sp = Math.hypot(k.vx, k.vy), hot = Math.max(k.heat, clamp((sp - 700) / 600, 0, 1)), n = k.trail.length / 2;
          for (let i = 0; i < n; i++) { const t = i / n; g.globalAlpha = t * 0.5; g.fillStyle = hot > 0.5 ? (t > 0.6 ? '#FFD23F' : '#FF8A3D') : '#6f89b8'; g.beginPath(); g.arc(k.trail[i * 2], k.trail[i * 2 + 1], PR * (0.3 + 0.7 * t), 0, TAU); g.fill(); }
          g.globalAlpha = 1;
          g.fillStyle = 'rgba(20,40,80,0.3)'; g.beginPath(); g.arc(k.x + 3, k.y + 6, PR, 0, TAU); g.fill();
          g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(k.x, k.y, PR, 0, TAU); g.fill();
          g.fillStyle = hot > 0.5 ? '#FF8A3D' : '#39466e'; g.beginPath(); g.arc(k.x, k.y, PR - 4, 0, TAU); g.fill();
          g.strokeStyle = hot > 0.5 ? '#FFD23F' : '#93a6d6'; g.lineWidth = 3; g.beginPath(); g.arc(k.x, k.y, PR - 8, k.spin, k.spin + 2.2); g.stroke();
        }
        // mallets
        for (const m of M) {
          const t = st.pucks[0], lx = t ? t.x - m.x : 0, ly = t ? t.y - m.y : 0, ld = Math.hypot(lx, ly) || 1;
          drawMallet(g, m.x, m.y, m.r, m.i, { lx: lx / ld, ly: ly / ld, squash: m.squash, ang: m.hitAng, dizzy: m.stun > 0, dash: m.dashT > 0, blink: m.blink < 0, happy: st.happy[m.i] > 0, spin: m.stun > 0 ? Math.sin(m.spin) * 0.5 : 0 });
          if (m.frozen > 0) { g.globalAlpha = 0.65; g.fillStyle = '#bff4ff'; rr(m.x - m.r - 6, m.y - m.r - 6, m.r * 2 + 12, m.r * 2 + 12, 10); g.fill(); g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
          if (m.stun > 0) for (let k = 0; k < 3; k++) { const a = E.t * 8 + k * 2.1; txt('★', m.x + Math.cos(a) * m.r, m.y - m.r - 8 + Math.sin(a) * 6, 18, '#FFD23F'); }
          if (m.dashCd > 0 && m.dashT <= 0) { g.strokeStyle = 'rgba(10,13,24,0.35)'; g.lineWidth = 4; g.beginPath(); g.arc(m.x, m.y, m.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - m.dashCd / 0.8)); g.stroke(); }
        }
        FX.draw(g);
        // HUD
        rr(W / 2 - 150, 8, 300, 66, 20); g.fillStyle = '#0a0d18'; g.fill();
        for (let i = 0; i < 2; i++) {
          const s = 50 * (1 + st.pop[i] * 0.6);
          txt(String(st.score[i]), W / 2 + (i ? 70 : -70), 43, s, COL[i]);
          txt(P[i].name, i ? W / 2 + 170 : W / 2 - 170, 30, 24, COL[i], { align: i ? 'left' : 'right', stroke: '#0a0d18' });
          const bx = i ? W / 2 + 170 : W / 2 - 170 - 150, m = M[i];
          rr(bx, 50, 150, 12, 6); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill();
          rr(bx, 50, Math.max(12, 150 * m.energy), 12, 6); g.fillStyle = m.lock ? '#666f85' : COL[i]; g.fill();
          txt('MAGNET', i ? bx + 160 : bx - 10, 57, 11, 'rgba(255,255,255,0.5)', { align: i ? 'left' : 'right' });
        }
        txt(':', W / 2, 40, 40, '#fff'); txt('FIRST TO ' + WIN, W / 2, 84, 11, 'rgba(255,255,255,0.55)');
        FX.drawText(g);
      },
    };
  }

  GAMES.push({
    id: 'puck', name: 'TURBO PUCK', tag: 'VERSUS', color: '#8fd3ff',
    tagline: 'Air hockey with dashes, magnets and mayhem.',
    pad: { a: 'DASH', b: 'MAGNET', stick: 'SKATE' },
    how: { goal: 'First to ' + WIN + ' goals', rows: [['STICK', 'Skate anywhere on the rink'], ['A', 'Dash — smash the puck or bonk your rival'], ['B', 'Hold: magnet pulls the puck to you']],
      tips: ['A dash hit sets the puck on fire', 'Grab orbs: giant, multi-puck, freeze, goal shield'] },
    song: { bpm: 138, root: 55, minor: false, prog: [0, 3, 4, 3], kick: 'x---x---x---x---', snare: '----x-------x---', hat: 'xxxxxxxxxxxxxxxx', bass: 'x-x-o-x-x-x-o-xo', arp: '0-2-1-3-0-2-3-1-' },
    icon(g, t) {
      const px = Math.sin(t * 3) * 52, py = Math.sin(t * 4.3) * 26;
      g.fillStyle = '#dff1ff'; rr(-112, -52, 224, 104, 16); g.fill(); g.strokeStyle = '#ff5d73'; g.lineWidth = 3; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(0, -52); g.lineTo(0, 52); g.stroke(); g.globalAlpha = 1;
      drawMallet(g, -84, Math.sin(t * 2) * 14, 24, 0, { lx: 1, ly: 0 }); drawMallet(g, 84, -Math.sin(t * 2.2) * 14, 24, 1, { lx: -1, ly: 0 });
      g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(px, py, 11, 0, TAU); g.fill(); g.fillStyle = '#39466e'; g.beginPath(); g.arc(px, py, 7, 0, TAU); g.fill();
    },
    create,
  });
})();
