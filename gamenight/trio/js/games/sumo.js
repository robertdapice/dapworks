// BUMPER SUMO (three-player edition) — three bots, one shrinking ice floe; last one on the ice scores.
(function () {
  'use strict';
  const CX = 640, CY = 398, R0 = 300, RMIN = 66, BR = 36, WIN = 4, NJ = 44;
  const SONG = { bpm: 98, root: 50, minor: true, prog: [0, 0, 5, 6],
    kick: 'x--x--x-x--x--x-', snare: '----x-------x-xx', hat: '--x---x---x---x-', bass: 'x--x--o-x--x--o-', arp: '0---2---1---3-2-', arpWave: 'triangle' };
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); };

  // Draws a bot centred on the origin. (lx, ly) is the direction the pupils look.
  function drawBot(g, i, r, ang, lx, ly, mood) {
    const a0 = g.globalAlpha >= 0 ? g.globalAlpha : 1;
    g.fillStyle = COLD[i]; circ(g, 0, 0, r); g.fill();
    g.fillStyle = COL[i]; circ(g, 0, 0, r * 0.8); g.fill();
    g.globalAlpha = a0 * 0.5; g.fillStyle = COLL[i]; circ(g, -r * 0.28, -r * 0.32, r * 0.27); g.fill(); g.globalAlpha = a0;
    g.save(); g.rotate(ang);
    g.fillStyle = '#1b2233'; circ(g, -r * 0.5, 0, r * 0.17); g.fill();           // top-knot at the back
    g.strokeStyle = COLD[i]; g.lineWidth = r * 0.12; g.beginPath(); g.arc(0, 0, r * 0.58, Math.PI * 0.62, Math.PI * 1.38); g.stroke(); // belt
    const c = Math.cos(ang), s = Math.sin(ang), px = (lx * c + ly * s) * r * 0.08, py = (-lx * s + ly * c) * r * 0.08;
    g.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const ex = r * 0.36, ey = sd * r * 0.31;
      if (mood === 'hurt') {
        g.strokeStyle = '#1b2233'; g.lineWidth = r * 0.1; const k = r * 0.14;
        g.beginPath(); g.moveTo(ex - k, ey - k); g.lineTo(ex + k, ey + k); g.moveTo(ex + k, ey - k); g.lineTo(ex - k, ey + k); g.stroke();
      } else if (mood === 'brace') {
        g.strokeStyle = '#1b2233'; g.lineWidth = r * 0.11;
        g.beginPath(); g.moveTo(ex, ey - r * 0.16); g.lineTo(ex, ey + r * 0.16); g.stroke();
      } else if (mood === 'happy') {
        g.strokeStyle = '#1b2233'; g.lineWidth = r * 0.1;
        g.beginPath(); g.arc(ex - r * 0.08, ey, r * 0.16, -1.2, 1.2); g.stroke();
      } else {
        g.fillStyle = '#fff'; circ(g, ex, ey, r * 0.21); g.fill();
        g.fillStyle = '#1b2233'; circ(g, ex + px, ey + py, r * (mood === 'charge' ? 0.08 : 0.11)); g.fill();
        if (mood === 'charge') {
          g.strokeStyle = '#1b2233'; g.lineWidth = r * 0.11;
          g.beginPath(); g.moveTo(ex + r * 0.3, ey - sd * r * 0.16); g.lineTo(ex + r * 0.12, ey + sd * r * 0.26); g.stroke();
        }
      }
    }
    g.restore();
  }

  function paintSea(c) {
    const gr = c.createRadialGradient(CX, CY, 80, CX, CY, 800);
    gr.addColorStop(0, '#15507A'); gr.addColorStop(0.6, '#0B2E52'); gr.addColorStop(1, '#061730');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#8FD3FF'; c.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = rand(W), y = rand(H), w = rand(10, 46);
      c.globalAlpha = rand(0.02, 0.07); c.lineWidth = rand(1, 3);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - rand(2, 6), x + w, y); c.stroke();
    }
    c.globalAlpha = 1;
  }

  function create() {
    const P = E.players;
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H; paintSea(bg.getContext('2d'));
    const decal = document.createElement('canvas'); decal.width = W; decal.height = H; const dg = decal.getContext('2d');
    const waves = []; for (let i = 0; i < 22; i++) waves.push({ x: rand(W), y: rand(H), w: rand(30, 80), p: rand(TAU), s: rand(0.5, 1.3) });
    const st = { t: 0, phase: 'ready', pt: 1.5, round: 0, score: [0, 0, 0], R: R0, Rv: R0, rt: 0, nextCrack: 4, warned: false,
      jag: [], bots: [], posts: [], chunks: [], pick: null, pickT: 6, judged: false, pip: [0, 0, 0], bumpCd: 0, done: false };

    function mk(i) {
      const sa = Math.PI + i * TAU / 3;   // 120 degrees apart, facing the middle
      return { i, x: CX + Math.cos(sa) * 165, y: CY + Math.sin(sa) * 165, vx: 0, vy: 0, ang: sa + Math.PI, charge: 0, hold: 0, charging: false, chT: 0,
        ramT: 0, ramP: 0, ramCd: 0, stam: 1, exhausted: false, bracing: false, state: 'on', ft: 0, splashed: false, spin: 0, sq: 0, sqAng: 0,
        hurtT: 0, bigT: 0, r: BR, drop: 1, happy: false, px: 0, py: 0 };
    }
    function regenJag() { st.jag = []; for (let i = 0; i < NJ; i++) st.jag.push(rand(-6, 6)); }
    function newRound() {
      st.round++; st.R = st.Rv = R0; st.rt = 0; st.nextCrack = 4; st.warned = false; regenJag();
      st.bots = [mk(0), mk(1), mk(2)]; st.chunks = []; st.pick = null; st.pickT = rand(5, 8); st.judged = false;
      const a = rand(-0.2, 0.2);            // one bumper post in each gap between the starting spots
      st.posts = [0, 1, 2].map(k => ({ x: CX + Math.cos(a + k * TAU / 3) * 105, y: CY + Math.sin(a + k * TAU / 3) * 105, fl: 0 }));
      dg.clearRect(0, 0, W, H);
      st.phase = 'ready'; st.pt = 1.5;
      const mp = st.score.some(v => v === WIN - 1);
      FX.banner('ROUND ' + st.round, { size: 90, life: 1.15, sub: mp ? 'MATCH POINT' : '' });
      S.count();
    }
    const mass = b => (b.bracing ? 3.3 : 1) * (b.bigT > 0 ? 1.7 : 1);

    function splash(x, y, big) {
      S.splash(x);
      FX.burst(x, y, { n: big ? 46 : 14, color: ['#BFEFFF', '#ffffff', '#6FC8FF'], speed: [60, big ? 460 : 240], life: 0.8, size: big ? 6 : 4, grav: 320, add: false });
      FX.ring(x, y, { r1: big ? 120 : 50, color: '#CFF2FF', w: 6, life: 0.6 });
      if (big) FX.ring(x, y, { r1: 190, color: '#8FD3FF', w: 4, life: 0.9 });
    }
    function fallOff(b) {
      if (b.state !== 'on') return;
      b.state = 'fall'; b.ft = 0; b.charging = false; b.bracing = false; b.ramT = 0;
      S.fall(); E.shake(8); E.buzz(b.i, 220);
      if (st.phase !== 'play') return;
      const left = st.bots.filter(o => o.state === 'on').length;
      if (left <= 1) { st.phase = 'out'; st.pt = 1.7; st.judged = false; E.slow(0.3, 0.55); }   // the round is decided
      else { FX.text(b.x, b.y - 50, P[b.i].name + ' IS OUT!', { color: COL[b.i], size: 30, life: 1.2 }); E.slow(0.45, 0.3); }
    }
    function release(b, p) {
      const c = clamp(b.charge, 0.15, 1);
      let dx = Math.cos(b.ang), dy = Math.sin(b.ang);
      if (p.mag > 0.25) { dx = p.x / p.mag; dy = p.y / p.mag; }
      const imp = 300 + 520 * c;
      b.vx = b.vx * 0.3 + dx * imp; b.vy = b.vy * 0.3 + dy * imp;
      b.ang = Math.atan2(dy, dx); b.ramT = 0.22 + 0.25 * c; b.ramP = c; b.ramCd = 0.5; b.charging = false; b.charge = 0; b.hold = 0;
      S.dash(b.x); if (c > 0.6) S.whoosh(b.x);
      FX.burst(b.x - dx * b.r, b.y - dy * b.r, { n: 8 + c * 14 | 0, color: ['#fff', COLL[b.i]], ang: Math.atan2(-dy, -dx), spread: 0.7, speed: [60, 260 + 200 * c], life: 0.45, size: 4 });
      FX.ring(b.x, b.y, { r1: 40 + 50 * c, color: COLL[b.i], w: 4, life: 0.3 });
    }

    function updBot(b, p, dt, active) {
      if (b.state === 'gone') return;
      if (b.state === 'fall') {
        b.ft += dt; b.x += b.vx * dt; b.y += b.vy * dt; const k = Math.exp(-6 * dt); b.vx *= k; b.vy *= k; b.spin += dt * 10;
        if (!b.splashed && b.ft > 0.4) { b.splashed = true; splash(b.x, b.y, true); E.shake(6); }
        if (b.splashed && Math.random() < dt * 14) FX.burst(b.x + rand(-14, 14), b.y + rand(-14, 14), { n: 1, color: '#CFF2FF', speed: 20, life: 0.6, size: 4, grav: -60, add: false });
        if (b.ft > 1.15) b.state = 'gone';
        return;
      }
      if (b.drop > 0) return;
      b.hurtT -= dt; b.sq = Math.max(0, b.sq - dt * 5); b.ramT -= dt; b.ramCd -= dt; b.bigT -= dt;
      b.r += ((b.bigT > 0 ? 50 : BR) - b.r) * Math.min(1, dt * 8);
      b.px = b.x; b.py = b.y;
      // brace
      const want = active && p.b && !b.exhausted && b.ramT <= 0;
      if (want && !b.bracing) { S.thud(b.x); FX.ring(b.x, b.y, { r0: b.r + 16, r1: b.r, color: '#fff', w: 4, life: 0.18 }); FX.burst(b.x, b.y, { n: 8, color: '#E8F8FF', speed: [60, 160], life: 0.3, size: 3, add: false }); }
      b.bracing = want;
      if (b.bracing) {
        b.charging = false; b.charge = 0; b.hold = 0;
        b.stam -= 0.7 * dt;
        if (b.stam <= 0) { b.stam = 0; b.exhausted = true; b.bracing = false; FX.text(b.x, b.y - b.r - 20, 'PHEW!', { color: '#BFEFFF', size: 22 }); FX.burst(b.x, b.y - b.r, { n: 8, color: '#BFEFFF', speed: 120, life: 0.5, size: 3, grav: 200, add: false }); }
      } else {
        b.stam = Math.min(1, b.stam + 0.33 * dt);
        if (b.exhausted && b.stam > 0.35) b.exhausted = false;
      }
      // charge + ram
      if (active && !b.bracing) {
        if (p.a && (b.charging || b.ramCd <= 0)) {
          if (!b.charging) { b.charging = true; b.charge = 0; b.hold = 0; }
          const was = b.charge; b.charge = Math.min(1, b.charge + dt); b.hold += dt;
          if (was < 1 && b.charge >= 1) { S.tink(b.x); FX.ring(b.x, b.y, { r1: b.r + 34, color: '#FFD23F', w: 5, life: 0.3 }); }
          b.chT -= dt; if (b.chT <= 0) { b.chT = 0.09; S.charge(b.charge); }
          if (b.hold > 2) release(b, p);          // can't sit on a full charge forever
        } else if (b.charging) release(b, p);
      } else if (!active) { b.charging = false; b.charge = 0; }
      // thrust (slippery)
      if (!b.bracing) {
        const acc = 720 * (b.charging ? 0.35 : 1) * (b.ramT > 0 ? 0.3 : 1) * (b.hurtT > 0 ? 0.3 : 1) * (active ? 1 : 0);
        b.vx += p.x * acc * dt; b.vy += p.y * acc * dt;
        if (active && p.mag > 0.25 && b.ramT <= 0) b.ang = angLerp(b.ang, Math.atan2(p.y, p.x), 1 - Math.exp(-12 * dt));
      }
      const k = Math.exp(-(b.bracing ? 9 : 1.8) * dt); b.vx *= k; b.vy *= k;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.ramT > 0) {
        FX.burst(b.x, b.y, { n: 1, color: COL[b.i], speed: 20, life: 0.28, size: b.r * 0.55 });
        dg.strokeStyle = 'rgba(120,190,230,0.35)'; dg.lineWidth = 7; dg.lineCap = 'round';
        dg.beginPath(); dg.moveTo(b.px, b.py); dg.lineTo(b.x, b.y); dg.stroke();
      }
      if (dist(b.x, b.y, CX, CY) > st.Rv + 2) fallOff(b);
    }

    function impact(a, b, nx, ny, power, quiet) {
      const px = a.x + nx * a.r, py = a.y + ny * a.r;
      a.sq = b.sq = Math.min(1, power / 650); a.sqAng = b.sqAng = Math.atan2(ny, nx);
      if (power < 150) { if (st.bumpCd <= 0) { S.thud(px); st.bumpCd = 0.15; } return; }
      const k = clamp(power / 1300, 0.15, 1);
      FX.burst(px, py, { n: 6 + k * 26 | 0, color: ['#fff', '#FFD23F', COLL[a.i], COLL[b.i]], speed: [80, 250 + 500 * k], life: 0.5, size: 3 + 3 * k });
      FX.ring(px, py, { r1: 40 + 120 * k, color: '#fff', w: 4 + 6 * k, life: 0.35 });
      S.hit(px); E.shake(4 + 14 * k);
      if (power > 650) {
        E.freeze(0.05 + 0.07 * k);
        FX.burst(px, py, { n: 9, color: '#FFD23F', speed: [200, 440], life: 0.9, size: 7, sq: true, add: false, grav: 320 });
        if (!quiet) FX.text(px, py - 46, pick(['WHAM!', 'BONK!', 'POW!', 'SMACK!']), { color: '#FFD23F', size: 30 + 22 * k });
        tone({ f: 150, f2: 40, d: 0.3, v: 0.4, type: 'sine', pan: panX(px) });
      }
    }
    function ram(a, b, nx, ny) {   // a rams b along (nx, ny); returns bonus power
      const bonus = 120 + 380 * a.ramP, mb = mass(b);
      b.vx += nx * bonus / mb; b.vy += ny * bonus / mb;
      a.ramT = 0;
      if (b.bracing) {
        S.clang(b.x); FX.text(b.x, b.y - b.r - 26, 'BLOCKED!', { color: '#fff', size: 26 }); a.hurtT = 0.45; E.buzz(a.i, 80);
        return bonus * 0.3;
      }
      b.hurtT = clamp((bonus + 200) / 1800, 0.1, 0.45); E.buzz(b.i, 60 + 150 * a.ramP);
      return bonus;
    }
    function collidePair(a, b) {
      if (a.state === 'on' && b.state === 'on' && a.drop <= 0 && b.drop <= 0) {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d < min && d > 0.01) {
          const nx = dx / d, ny = dy / d, ma = mass(a), mb = mass(b), ov = min - d;
          a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb); b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
          const rvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rvn > 0) {
            const ra = a.ramT > 0 && a.vx * nx + a.vy * ny > 50, rb = b.ramT > 0 && b.vx * nx + b.vy * ny < -50;
            const j = 1.9 * rvn / (1 / ma + 1 / mb);
            a.vx -= j / ma * nx; a.vy -= j / ma * ny; b.vx += j / mb * nx; b.vy += j / mb * ny;
            let power = rvn;
            if (ra) power += ram(a, b, nx, ny);
            if (rb) power += ram(b, a, -nx, -ny);
            impact(a, b, nx, ny, power, ra && rb);
            if (ra && rb) { FX.text((a.x + b.x) / 2, (a.y + b.y) / 2 - 50, 'CLASH!', { color: '#fff', size: 44 }); S.clang(a.x); }
          }
        }
      }
    }
    function collide() {
      for (let i = 0; i < st.bots.length; i++) for (let j = i + 1; j < st.bots.length; j++) collidePair(st.bots[i], st.bots[j]);
      for (const b of st.bots) {
        if (b.state !== 'on' || b.drop > 0) continue;
        for (const q of st.posts) {
          const dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy), min = b.r + 18;
          if (d < min && d > 0.01) {
            const nx = dx / d, ny = dy / d; b.x = q.x + nx * min; b.y = q.y + ny * min;
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) {
              const out = Math.max(260, -vn * 1.3) / (b.bracing ? 3 : 1);
              b.vx += nx * (out - vn); b.vy += ny * (out - vn);
              q.fl = 1; b.sq = 0.7; b.sqAng = Math.atan2(ny, nx);
              tone({ f: 320, f2: 720, d: 0.14, v: 0.16, type: 'triangle', pan: panX(q.x) });
              FX.burst(q.x + nx * 16, q.y + ny * 16, { n: 8, color: ['#FFD23F', '#fff'], speed: 220, life: 0.35, size: 4 });
              FX.ring(q.x, q.y, { r1: 46, color: '#FFD23F', w: 4, life: 0.25 });
            }
          }
        }
        const pk = st.pick;
        if (pk && dist(b.x, b.y, pk.x, pk.y) < b.r + 18) {
          st.pick = null; b.bigT = 6; S.power(); E.buzz(b.i, 80);
          FX.text(b.x, b.y - 54, 'MEGA!', { color: '#FFD23F', size: 34 }); FX.ring(b.x, b.y, { r1: 90, color: '#FFD23F', w: 6 });
          FX.burst(b.x, b.y, { n: 20, color: ['#FFD23F', '#fff'], speed: 260, life: 0.6, size: 4 });
        }
      }
    }
    function crack() {
      const old = st.R; st.R = Math.max(RMIN, st.R - 24); regenJag();
      for (let i = 0; i < NJ; i += 2) {
        const a = i / NJ * TAU + rand(-0.05, 0.05), x = CX + Math.cos(a) * old, y = CY + Math.sin(a) * old;
        FX.burst(x, y, { n: 3, color: ['#fff', '#CFEFFF'], speed: 130, life: 0.6, size: 5, sq: true, add: false });
        st.chunks.push({ x, y, vx: Math.cos(a) * rand(18, 46), vy: Math.sin(a) * rand(18, 46), r: rand(7, 15), life: 2.4, rot: rand(TAU), vr: rand(-1, 1) });
      }
      S.crate(CX); noise({ d: 0.35, v: 0.3, f: 600, f2: 120 }); E.shake(5);
    }

    function update(dt) {
      st.t += dt; st.bumpCd -= dt; for (let i = 0; i < 3; i++) st.pip[i] = Math.max(0, st.pip[i] - dt * 2);
      for (const w of waves) { w.x += w.s * 14 * dt; if (w.x > W + 80) w.x = -80; }
      if (st.phase === 'ready') {
        st.pt -= dt;
        for (const b of st.bots) {
          if (b.drop > 0 && st.pt < 1.05 - b.i * 0.22) {
            b.drop -= dt / 0.32;
            if (b.drop <= 0) { b.drop = 0; b.sq = 1; b.sqAng = Math.PI / 2; S.thud(b.x); E.shake(5); FX.ring(b.x, b.y, { r1: 70, color: '#fff', w: 5, life: 0.3 }); FX.burst(b.x, b.y, { n: 12, color: '#E8F8FF', speed: 200, life: 0.4, size: 4, add: false }); }
          }
        }
        if (st.pt <= 0) { st.phase = 'play'; FX.banner('GO!', { color: '#FFD23F', life: 0.6 }); S.go(); }
      }
      const active = st.phase === 'play' || st.phase === 'out' || st.phase === 'over';
      for (const b of st.bots) updBot(b, P[b.i], dt, active);
      if (active) collide();
      // the floe shrinks
      if (st.phase === 'play') {
        st.rt += dt;
        if (st.R > RMIN) {
          if (!st.warned && st.nextCrack - st.rt < 0.9) { st.warned = true; tone({ f: 880, d: 0.07, v: 0.1, type: 'triangle' }); tone({ f: 880, d: 0.07, v: 0.1, type: 'triangle', t: 0.16 }); }
          if (st.rt >= st.nextCrack) { crack(); st.warned = false; st.nextCrack = st.rt + (st.rt < 20 ? 3.2 : 1.5); }
        }
        st.pickT -= dt;
        if (st.pickT <= 0 && !st.pick) { st.pickT = rand(9, 13); const a = rand(TAU), d = rand(0, st.R * 0.5); st.pick = { x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, age: 0 }; S.pickup(); }
      }
      st.Rv += clamp(st.R - st.Rv, -140 * dt, 140 * dt);
      for (let i = st.posts.length - 1; i >= 0; i--) {
        const q = st.posts[i]; q.fl = Math.max(0, q.fl - dt * 5);
        if (dist(q.x, q.y, CX, CY) + 12 > st.Rv) { splash(q.x, q.y, false); st.posts.splice(i, 1); }
      }
      if (st.pick) { st.pick.age += dt; if (dist(st.pick.x, st.pick.y, CX, CY) + 16 > st.Rv) { splash(st.pick.x, st.pick.y, false); st.pick = null; } }
      for (let i = st.chunks.length - 1; i >= 0; i--) { const c = st.chunks[i]; c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; if (c.life <= 0) st.chunks.splice(i, 1); }
      // judging a ring-out
      if (st.phase === 'out') {
        st.pt -= dt;
        if (!st.judged && st.pt <= 1.1) {
          st.judged = true;
          const up = st.bots.filter(b => b.state === 'on');
          if (up.length === 1) {
            const w = up[0]; st.score[w.i]++; st.pip[w.i] = 1; w.happy = true; S.point(); E.buzz(w.i, 60);
            FX.confetti(w.x, w.y, 50);
            if (st.score[w.i] < WIN) FX.banner(P[w.i].name + ' SCORES!', { color: COL[w.i], size: 76, life: 1.0, y: 200 });
          } else { FX.banner('EVERYBODY SPLASH!', { color: '#BFEFFF', size: 80, life: 1.0, y: 200, sub: 'no point' }); S.back(); }
        }
        if (st.pt <= 0) {
          const w = st.score.findIndex(v => v >= WIN);
          if (w >= 0) {
            st.phase = 'over'; FX.confetti(W / 2, 200, 140);
            E.endMatch({ winner: w, title: P[w].name + ' WINS!', sub: st.score.join(' – ') });
          } else newRound();
        }
      }
      FX.update(dt);
    }

    function floePath(g, R, oy) {
      g.beginPath();
      for (let i = 0; i < NJ; i++) {
        const a = i / NJ * TAU, r = R + st.jag[i] * (R > 100 ? 1 : 0.5);
        const x = CX + Math.cos(a) * r, y = CY + oy + Math.sin(a) * r;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
    }
    function drawBotFull(g, b) {
      if (b.state === 'gone' || b.drop >= 1) return;
      let o = b, od = 1e9;   // look at the nearest bot still on the ice
      for (const q of st.bots) { if (q === b || q.state !== 'on') continue; const d = dist(q.x, q.y, b.x, b.y); if (d < od) { od = d; o = q; } }
      if (o === b) o = { x: CX, y: CY };
      let sc = 1, al = 1, oy = 0, jx = 0, jy = 0;
      if (b.drop > 0) { sc = 1 + b.drop * 1.5; al = 1 - b.drop * 0.6; oy = -b.drop * 240; }
      if (b.state === 'fall') { sc = 1 - 0.45 * ease.out(Math.min(1, b.ft / 0.4)); if (b.ft > 0.4) al = Math.max(0, 1 - (b.ft - 0.4) / 0.7) * 0.55; }
      if (b.charging) { jx = rand(-1, 1) * b.charge * 2.5; jy = rand(-1, 1) * b.charge * 2.5; }
      else if (b.state === 'on' && dist(b.x, b.y, CX, CY) > st.Rv - b.r * 0.6) jx = Math.sin(st.t * 34) * 2.5;
      if (b.state === 'on') { g.fillStyle = 'rgba(20,70,110,0.28)'; g.beginPath(); g.ellipse(b.x + 5, b.y + 10, b.r * (1 - b.drop * 0.5), b.r * 0.9 * (1 - b.drop * 0.5), 0, 0, TAU); g.fill(); }
      g.save(); g.translate(b.x + jx, b.y + oy + jy); g.globalAlpha = al;
      if (b.state === 'fall') g.rotate(b.spin);
      g.scale(sc, sc);
      if (b.sq > 0) { g.rotate(b.sqAng); g.scale(1 - 0.26 * b.sq, 1 + 0.2 * b.sq); g.rotate(-b.sqAng); }
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 250 && b.state === 'on') { const va = Math.atan2(b.vy, b.vx), s = Math.min(0.22, (sp - 250) / 2500); g.rotate(va); g.scale(1 + s, 1 - s * 0.7); g.rotate(-va); }
      if (b.charging) {
        g.globalAlpha = al * (0.22 + 0.33 * b.charge); g.fillStyle = b.charge >= 1 ? '#FFD23F' : '#fff';
        circ(g, 0, 0, b.r + 5 + b.charge * 9 + Math.sin(st.t * 30) * 2); g.fill(); g.globalAlpha = al;
      }
      if (b.bigT > 0) { g.strokeStyle = '#FFD23F'; g.lineWidth = 4; g.globalAlpha = al * (b.bigT < 1.5 ? 0.5 + 0.5 * Math.sin(st.t * 24) : 1); circ(g, 0, 0, b.r + 4); g.stroke(); g.globalAlpha = al; }
      if (b.bracing) {
        g.fillStyle = '#44506b';
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.39; g.save(); g.rotate(a); g.beginPath(); g.moveTo(b.r - 4, -7); g.lineTo(b.r + 11, 0); g.lineTo(b.r - 4, 7); g.fill(); g.restore(); }
      }
      const mood = b.state === 'fall' || b.hurtT > 0 ? 'hurt' : b.bracing ? 'brace' : b.charging ? 'charge' : b.happy ? 'happy' : 'normal';
      let lx = o.x - b.x, ly = o.y - b.y; const ll = Math.hypot(lx, ly) || 1;
      drawBot(g, b.i, b.r, b.ang, lx / ll, ly / ll, mood);
      if (b.bracing) { g.strokeStyle = '#fff'; g.lineWidth = 3; circ(g, 0, 0, b.r + 1); g.stroke(); }
      g.restore();
      if (b.state !== 'on' || b.drop > 0) return;
      g.lineCap = 'round';
      if (b.charging) {
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 7; circ(g, b.x, b.y, b.r + 13); g.stroke();
        g.strokeStyle = b.charge >= 1 ? (Math.sin(st.t * 40) > 0 ? '#fff' : '#FFD23F') : '#FFD23F'; g.lineWidth = 5;
        g.beginPath(); g.arc(b.x, b.y, b.r + 13, -Math.PI / 2, -Math.PI / 2 + b.charge * TAU); g.stroke();
      }
      if (b.stam < 0.99) {
        const a0 = Math.PI * 0.2, a1 = Math.PI * 0.8, rr2 = b.r + 22;
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 8; g.beginPath(); g.arc(b.x, b.y, rr2, a0, a1); g.stroke();
        g.strokeStyle = b.exhausted ? '#FF9F1C' : '#FFFFFF'; g.lineWidth = 5;   // not a player colour
        g.beginPath(); g.arc(b.x, b.y, rr2, a1 - (a1 - a0) * b.stam, a1); g.stroke();
      }
    }

    function draw(g) {
      const P = E.players, Rv = st.Rv;
      g.drawImage(bg, 0, 0);
      g.strokeStyle = '#BFEFFF'; g.lineWidth = 2; g.lineCap = 'round';
      for (const w of waves) {
        g.globalAlpha = 0.07 + 0.06 * Math.sin(st.t * w.s + w.p);
        g.beginPath(); g.moveTo(w.x, w.y); g.quadraticCurveTo(w.x + w.w / 2, w.y - 6 - 3 * Math.sin(st.t * 2 + w.p), w.x + w.w, w.y); g.stroke();
      }
      g.globalAlpha = 1;
      for (const c of st.chunks) {
        g.globalAlpha = Math.min(1, c.life / 1.2) * 0.9; g.save(); g.translate(c.x, c.y); g.rotate(c.rot);
        g.fillStyle = '#7FBFE0'; g.fillRect(-c.r, -c.r * 0.7 + 4, c.r * 2, c.r * 1.4);
        g.fillStyle = '#E4F6FF'; g.fillRect(-c.r, -c.r * 0.7, c.r * 2, c.r * 1.4); g.restore();
      }
      g.globalAlpha = 1;
      for (const b of st.bots) if (b.state === 'fall' && b.ft > 0.12) drawBotFull(g, b);
      // the floe: water shadow, icy side, top
      g.fillStyle = 'rgba(0,10,30,0.35)'; floePath(g, Rv + 8, 24); g.fill();
      g.fillStyle = '#5FA6CF'; floePath(g, Rv, 14); g.fill();
      const gr = g.createRadialGradient(CX - 60, CY - 80, 20, CX, CY, Rv + 20);
      gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#BFE5F8');
      floePath(g, Rv, 0); g.fillStyle = gr; g.fill();
      g.save(); g.clip();
      g.drawImage(decal, 0, 0);
      g.strokeStyle = 'rgba(60,140,200,0.25)'; g.lineWidth = 8; circ(g, CX, CY, Rv * 0.62); g.stroke();
      if (Rv > 130) { g.lineWidth = 6; g.beginPath(); g.moveTo(CX - 40, CY - 24); g.lineTo(CX - 40, CY + 24); g.moveTo(CX + 40, CY - 24); g.lineTo(CX + 40, CY + 24); g.stroke(); }
      if (st.warned && st.phase === 'play') {
        g.strokeStyle = 'rgba(255,70,90,' + (Math.sin(st.t * 26) > 0 ? 0.5 : 0.18) + ')'; g.lineWidth = 30; circ(g, CX, CY, Rv - 9); g.stroke();
      }
      g.restore();
      g.lineWidth = 4; g.strokeStyle = '#fff'; floePath(g, Rv, 0); g.stroke();
      for (const q of st.posts) {
        g.fillStyle = 'rgba(20,70,110,0.28)'; circ(g, q.x + 4, q.y + 7, 16); g.fill();
        const s = 1 + q.fl * 0.35;
        g.fillStyle = '#B8243C'; circ(g, q.x, q.y, 16 * s); g.fill();
        g.fillStyle = q.fl > 0.3 ? '#fff' : '#FFD23F'; circ(g, q.x, q.y, 11 * s); g.fill();
        g.fillStyle = '#B8243C'; circ(g, q.x, q.y, 5 * s); g.fill();
      }
      if (st.pick) {
        const pk = st.pick, bob = Math.sin(st.t * 5) * 3, s = Math.min(1, pk.age * 4);
        g.fillStyle = 'rgba(20,70,110,0.25)'; circ(g, pk.x + 3, pk.y + 9, 14 * s); g.fill();
        g.globalAlpha = 0.35; g.fillStyle = '#FFD23F'; circ(g, pk.x, pk.y + bob, (22 + Math.sin(st.t * 8) * 3) * s); g.fill(); g.globalAlpha = 1;
        g.fillStyle = '#FFD23F'; circ(g, pk.x, pk.y + bob, 15 * s); g.fill();
        g.strokeStyle = '#7A4B00'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
        g.moveTo(pk.x, pk.y + bob + 7 * s); g.lineTo(pk.x, pk.y + bob - 7 * s); g.moveTo(pk.x - 5 * s, pk.y + bob - 2 * s); g.lineTo(pk.x, pk.y + bob - 7 * s); g.lineTo(pk.x + 5 * s, pk.y + bob - 2 * s); g.stroke();
      }
      const order = st.bots.slice().sort((a, b) => a.y - b.y);
      for (const b of order) if (!(b.state === 'fall' && b.ft > 0.12)) drawBotFull(g, b);
      FX.draw(g);
      // HUD: P1 left, P3 centre, P2 right
      for (let i = 0; i < 3; i++) {
        const x = i === 0 ? 50 : i === 1 ? W - 50 : W / 2, al = i === 0 ? 'left' : i === 1 ? 'right' : 'center';
        txt(P[i].name, x, 40, 30, COL[i], { align: al, stroke: '#061730' });
        for (let k = 0; k < WIN; k++) {
          const on = k < st.score[i], pop = on && k === st.score[i] - 1 ? st.pip[i] : 0;
          const px = i === 0 ? x + 12 + k * 30 : i === 1 ? x - 12 - k * 30 : x + (k - (WIN - 1) / 2) * 30;
          g.fillStyle = on ? COL[i] : 'rgba(255,255,255,0.16)'; circ(g, px, 76, 10 + pop * 8); g.fill();
          g.strokeStyle = '#061730'; g.lineWidth = 3; g.stroke();
        }
      }
      txt('FIRST TO ' + WIN, 50, H - 52, 18, 'rgba(255,255,255,0.6)', { align: 'left' });
      txt('ROUND ' + st.round, 50, H - 28, 14, 'rgba(255,255,255,0.4)', { align: 'left' });
      FX.drawText(g);
    }

    newRound();
    return { update, draw };
  }

  GAMES.push({
    id: 'sumo', name: 'BUMPER SUMO', tag: 'VERSUS', color: '#6FC8FF',
    tagline: 'Three bots, one floe. Last one standing wins.',
    pad: { a: 'RAM', b: 'BRACE', stick: 'SLIDE' },
    how: { goal: 'Last bot on the ice scores — first to ' + WIN,
      rows: [['STICK', 'Slide around — the ice is slippery'], ['A', 'Hold to charge, release to ram'], ['B', 'Brace: dig in and shrug off hits']],
      tips: ['Let the other two fight, then shove the survivor — or get ganged up on', 'The floe keeps cracking smaller. A braced bot blocks a ram, but bracing drains stamina'] },
    song: SONG,
    icon(g, t) {
      g.fillStyle = '#5FA6CF'; circ(g, 0, 12, 62); g.fill();
      g.fillStyle = '#E8F8FF'; circ(g, 0, 4, 62); g.fill();
      g.strokeStyle = 'rgba(60,140,200,0.3)'; g.lineWidth = 4; circ(g, 0, 4, 38); g.stroke();
      const k = Math.abs(Math.sin(t * 3.2)), gap = 19 + k * 20, hit = k < 0.25;
      for (let i = 0; i < 3; i++) {
        const a = Math.PI + i * TAU / 3;
        g.save(); g.translate(Math.cos(a) * gap, 4 + Math.sin(a) * gap);
        if (hit) g.scale(0.88, 1.1);
        drawBot(g, i, 16, a + Math.PI, -Math.cos(a), -Math.sin(a), hit ? 'hurt' : 'charge'); g.restore();
      }
      if (hit) {
        g.fillStyle = '#FFD23F';
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 3, d = 16 + (0.25 - k) * 90; g.save(); g.translate(Math.cos(a) * d, 4 + Math.sin(a) * d); g.rotate(a); g.fillRect(-4, -2, 8, 4); g.restore(); }
      }
    },
    create,
  });
})();
