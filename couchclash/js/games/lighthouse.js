// LIGHTHOUSE KEEPERS — asymmetric co-op. One player steers the rescue boat, the other
// aims the searchlight and cannon. The sea is black: you only see what the lamp shows.
(function () {
'use strict';
const ISL = { x: 640, y: 380, r: 56, dock: 122 };
const CONE = 0.38, RANGE = 410, BR = 15;
const SONG = { bpm: 92, root: 50, minor: true, prog: [0, 5, 3, 4],
  kick: 'x-------x--x----', snare: '--------x-------', hat: '--x---x---x---x-', bass: 'x-----x-x-----o-', arp: '0--2--1-3--2--1-', arpWave: 'triangle', bassWave: 'sine' };
const PADS = h => [0, 1].map(i => i === h ? { a: 'BOOST', b: 'SWAP', stick: 'STEER BOAT' } : { a: 'FIRE', b: 'SWAP', stick: 'AIM LAMP' });

function heart(g, x, y, s, fill, stroke) {
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.7, y - s * 1.15, x, y - s * 0.35);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.15, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
}
const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };

function create() {
  const P = E.players;
  const st = { phase: 'ready', pt: 1.9, t: 0, wave: 1, rescued: 0, best: +(localStorage.getItem('cc_lighthouse_best') || 0) || 0,
    hull: 5, helm: 0, aboard: 0, swapT: 0, swapLock: false, eelT: 7, boltT: 0, nextBolt: rand(4, 7), bolt: null,
    dockT: 0, next: 0, fullT: 0, over: false, sink: 0, hullPop: 0, scorePop: 0, rolePop: 0, swell: 8 };
  const boat = { x: ISL.x, y: ISL.y + 160, ang: Math.PI / 2, vx: 0, vy: 0, spd: 0, lamp: Math.PI / 2, boostT: 0, boostCd: 0, cd: 0, inv: 0, recoil: 0, wakeT: 0 };
  const rocks = [], mines = [], mons = [], cast = [], balls = [], wake = [], lights = [], rain = [], swells = [];

  // ---- prerendered layers ----
  const sea = document.createElement('canvas'); sea.width = W; sea.height = H;
  (function () {
    const c = sea.getContext('2d'), gr = c.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#0d2a4d'); gr.addColorStop(0.5, '#0f3558'); gr.addColorStop(1, '#0a2443');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) { c.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '130,190,230' : '5,15,40') + ',' + rand(0.03, 0.09) + ')'; c.fillRect(rand(W), rand(H), rand(8, 60), rand(1.5, 4)); }
  })();
  const DW = W / 2, DH = H / 2;
  const dk = document.createElement('canvas'); dk.width = DW; dk.height = DH; const dg = dk.getContext('2d');
  for (let i = 0; i < 70; i++) swells.push({ x: rand(W), y: rand(H), w: rand(18, 46), p: rand(TAU), s: rand(0.6, 1.4) });
  for (let i = 0; i < 130; i++) rain.push({ x: rand(W), y: rand(H), l: rand(10, 22), s: rand(0.8, 1.3) });

  // ---- world setup ----
  function freeSpot(minIsl, minBoat, margin) {
    for (let k = 0; k < 80; k++) {
      const x = rand(margin, W - margin), y = rand(margin + 46, H - margin - 30);
      if (dist(x, y, ISL.x, ISL.y) < minIsl || dist(x, y, boat.x, boat.y) < minBoat) continue;
      let ok = true;
      for (const r of rocks) if (dist(x, y, r.x, r.y) < r.r + 58) { ok = false; break; }
      if (ok) for (const c of cast) if (dist(x, y, c.ax, c.ay) < 90) { ok = false; break; }
      if (ok) for (const m of mines) if (dist(x, y, m.x, m.y) < 60) { ok = false; break; }
      if (ok) return { x, y };
    }
    return { x: rand(120, W - 120), y: rand(140, H - 120) };
  }
  function edgeSpot() {
    for (let k = 0; k < 30; k++) {
      const e = Math.random() * 4 | 0;
      const x = e === 2 ? 26 : e === 3 ? W - 26 : rand(40, W - 40), y = e === 0 ? 76 : e === 1 ? H - 26 : rand(90, H - 40);
      if (dist(x, y, boat.x, boat.y) > 330) return { x, y };
    }
    return { x: 26, y: 90 };
  }
  function mkRock(x, y, r) { const v = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, q = r * rand(0.78, 1.12); v.push([Math.cos(a) * q, Math.sin(a) * q]); } return { x, y, r, v }; }
  function mkMon(type, x, y) {
    const d = { eel: { r: 14, hp: 1, col: '#35b08c' }, lunger: { r: 18, hp: 1, col: '#8a63d2' }, brute: { r: 26, hp: 3, col: '#c2405a' } }[type];
    return { type, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: d.r, hp: d.hp, col: d.col, ang: rand(TAU), ph: rand(TAU), lit: false, litT: 0, state: 'lurk', stT: 0, stun: 0, flash: 0, dead: false, lx: 0, ly: 0 };
  }
  function setupWave(w) {
    const nR = Math.min(15, 4 + w * 2);
    while (rocks.length < nR) { const p = freeSpot(205, 150, 50); rocks.push(mkRock(p.x, p.y, rand(18, 31))); }
    const nM = Math.min(8, 1 + w);
    while (mines.length < nM) { const p = freeSpot(190, 190, 50); mines.push({ x: p.x, y: p.y, dx: rand(-6, 6), dy: rand(-6, 6), ph: rand(TAU), fuse: -1 }); }
    const nL = w >= 2 ? Math.min(5, 1 + Math.floor(w / 2)) : 0;
    while (mons.filter(m => m.type === 'lunger').length < nL) { const p = freeSpot(230, 240, 60); mons.push(mkMon('lunger', p.x, p.y)); }
    const nB = w >= 4 ? Math.min(3, Math.floor((w - 2) / 2)) : 0;
    while (mons.filter(m => m.type === 'brute').length < nB) { const p = edgeSpot(); mons.push(mkMon('brute', p.x, p.y)); }
    const nC = Math.min(6, 3 + Math.floor((w - 1) / 2));
    for (let i = 0; i < nC; i++) { const p = freeSpot(250, 130, 70); cast.push({ ax: p.x, ay: p.y, x: p.x, y: p.y, ph: rand(TAU), rot: rand(-0.4, 0.4) }); }
    st.eelT = Math.max(2.5, 7 - w * 0.6); st.swell = Math.min(34, 6 + w * 4);
  }
  setupWave(1);
  FX.banner('WAVE 1', { size: 110, life: 1.9, color: '#FFE08A', sub: 'Follow the red flares · bring them to the lighthouse' });

  const isLit = (x, y) => {
    const d = dist(x, y, boat.x, boat.y);
    if (d < 78) return true;
    if (d > RANGE) return false;
    const a = Math.atan2(y - boat.y, x - boat.x), da = Math.abs(((a - boat.lamp + Math.PI) % TAU + TAU) % TAU - Math.PI);
    return da < CONE;
  };

  // ---- events ----
  function hurt(x, y) {
    if (st.over) return false;
    if (boat.inv > 0) return false;
    st.hull--; st.hullPop = 1; boat.inv = 1.6;
    E.shake(16); E.buzz(-1, 180); S.hurt(); S.crate(boat.x);
    FX.burst(boat.x, boat.y, { n: 16, color: ['#c9965a', '#efe7d2', '#7a5230'], speed: 260, life: 0.8, size: 5, sq: true, add: false });
    FX.ring(boat.x, boat.y, { r1: 70, color: '#FF5D73' });
    FX.text(boat.x, boat.y - 34, st.hull > 0 ? 'HULL -1' : 'HULL BREACHED!', { color: '#FF5D73', size: 24 });
    if (st.hull <= 0) wreck();
    return true;
  }
  function wreck() {
    st.over = true; st.phase = 'over';
    if (st.rescued > st.best) { st.best = st.rescued; localStorage.setItem('cc_lighthouse_best', String(st.best)); }
    S.boom(boat.x, true); E.shake(24); E.slow(0.35, 1.2); E.buzz(-1, 400);
    FX.burst(boat.x, boat.y, { n: 50, color: ['#FFD23F', '#FF8A3D', '#fff'], speed: 420, life: 1.1, size: 7 });
    FX.burst(boat.x, boat.y, { n: 30, color: ['#c9965a', '#efe7d2', '#7a5230'], speed: 320, life: 1.5, size: 6, sq: true, add: false });
    lights.push({ x: boat.x, y: boat.y, r: 300, life: 1, max: 1 });
    E.endMatch({ winner: -1, lose: true, title: 'SHIPWRECKED', sub: 'Rescued ' + st.rescued + ' · best ' + st.best });
  }
  function killMon(m) {
    if (m.dead) return; m.dead = true;
    FX.burst(m.x, m.y, { n: 22, color: [m.col, '#fff', '#9be8ff'], speed: 280, life: 0.7, size: 5 });
    FX.ring(m.x, m.y, { r1: 60, color: m.col }); S.pop(m.x, 3); S.splash(m.x);
    FX.text(m.x, m.y - 20, m.type === 'brute' ? 'CRACKED!' : 'SPLAT!', { color: m.col, size: 22 });
    lights.push({ x: m.x, y: m.y, r: 110, life: 0.4, max: 0.4 });
  }
  function explode(x, y) {
    S.boom(x, true); E.shake(12);
    FX.burst(x, y, { n: 34, color: ['#FFD23F', '#FF8A3D', '#fff'], speed: 380, life: 0.7, size: 7 });
    FX.burst(x, y, { n: 14, color: ['#9bd6ff', '#fff'], speed: 220, life: 1, size: 5, grav: 200 });
    FX.ring(x, y, { r1: 110, color: '#FFD23F', w: 8 });
    lights.push({ x, y, r: 240, life: 0.6, max: 0.6 });
    for (const m of mons) if (!m.dead && dist(x, y, m.x, m.y) < 100 + m.r) { if (m.type === 'brute') { m.hp -= 2; m.flash = 1; if (m.hp <= 0) killMon(m); } else killMon(m); }
    for (const o of mines) if (o.fuse < 0 && dist(x, y, o.x, o.y) < 105) o.fuse = 0.14;
    if (dist(x, y, boat.x, boat.y) < 82) hurt(x, y);
  }
  function fire(who) {
    const c = Math.cos(boat.lamp), s = Math.sin(boat.lamp), bx = boat.x + Math.cos(boat.ang) * 12, by = boat.y + Math.sin(boat.ang) * 12;
    balls.push({ x: bx + c * 14, y: by + s * 14, vx: c * 560, vy: s * 560, life: 0.74 });
    boat.cd = 0.5; boat.recoil = 1; boat.vx -= c * 30; boat.vy -= s * 30;
    noise({ d: 0.28, v: 0.45, f: 1100, f2: 90, pan: panX(boat.x) }); tone({ f: 170, f2: 45, d: 0.22, type: 'sine', v: 0.4, pan: panX(boat.x) });
    FX.burst(bx + c * 18, by + s * 18, { n: 8, color: ['#FFD23F', '#fff'], speed: 220, life: 0.25, size: 4, ang: boat.lamp, spread: 0.5 });
    lights.push({ x: bx, y: by, r: 120, life: 0.18, max: 0.18 }); E.shake(3); E.buzz(who, 25);
  }
  function thunder() {
    st.boltT = 0.5; st.nextBolt = rand(6, 12) - Math.min(4, st.wave * 0.4); E.flash('#bcd0ff', 0.28);
    const pts = []; let x = rand(120, W - 120), y = 0; while (y < rand(200, 330)) { pts.push([x, y]); x += rand(-46, 46); y += rand(24, 52); }
    st.bolt = pts;
    noise({ d: 1.8, v: 0.5, f: 420, f2: 50, t: 0.22, a: 0.05 }); tone({ f: 70, f2: 32, d: 1.3, type: 'sine', v: 0.4, t: 0.22 }); noise({ d: 0.12, v: 0.3, f: 5000, ft: 'highpass', t: 0.2 });
  }

  // ---- update ----
  function update(dt) {
    st.t += dt;
    const hi = st.helm, li = 1 - hi, helm = P[hi], lamp = P[li];
    if (st.phase === 'ready') { st.pt -= dt; if (st.pt <= 0) { st.phase = 'play'; S.go(); } }
    const live = st.phase === 'play';
    st.hullPop = Math.max(0, st.hullPop - dt * 3); st.scorePop = Math.max(0, st.scorePop - dt * 3); st.rolePop = Math.max(0, st.rolePop - dt * 2);
    st.fullT = Math.max(0, st.fullT - dt); boat.inv = Math.max(0, boat.inv - dt); boat.recoil = Math.max(0, boat.recoil - dt * 6);
    boat.cd -= dt; boat.boostCd -= dt; boat.boostT -= dt;

    // helm + lamp controls
    let thrust = 0;
    if (live) {
      if (helm.mag > 0.2) { boat.ang = angLerp(boat.ang, Math.atan2(helm.y, helm.x), 1 - Math.exp(-(2.4 + boat.spd / 110) * dt)); thrust = helm.mag; }
      if (helm.ap && boat.boostCd <= 0) {
        boat.boostT = 0.55; boat.boostCd = 2.2; boat.spd += 130; S.dash(boat.x); E.buzz(hi, 30);
        for (let i = 0; i < 10; i++) wake.push({ x: boat.x - Math.cos(boat.ang) * 18 + rand(-8, 8), y: boat.y - Math.sin(boat.ang) * 18 + rand(-8, 8), life: 1, r: rand(5, 11) });
      }
      if (lamp.mag > 0.25) boat.lamp = angLerp(boat.lamp, Math.atan2(lamp.y, lamp.x), 1 - Math.exp(-10 * dt));
      if (lamp.a && boat.cd <= 0) fire(li);
      // swap roles: both hold B
      if (P[0].b && P[1].b && !st.swapLock) {
        st.swapT += dt;
        if (st.swapT >= 1) {
          st.helm = li; st.swapT = 0; st.swapLock = true; st.rolePop = 1;
          E.setPads(PADS(st.helm), 'LIGHTHOUSE KEEPERS'); E.buzz(-1, 90); S.power();
          FX.banner('SWAP!', { size: 100, life: 0.9, color: '#FFD23F', sub: P[st.helm].name + ' takes the helm' });
        }
      } else { st.swapT = Math.max(0, st.swapT - dt * 3); if (!P[0].b && !P[1].b) st.swapLock = false; }
    }
    // boat physics
    const top = boat.boostT > 0 ? 345 : 178, target = st.over ? 0 : thrust * top;
    boat.spd += (target - boat.spd) * (1 - Math.exp(-(target > boat.spd ? 2.4 : 1.3) * dt));
    const k = 1 - Math.exp(-3.6 * dt);
    boat.vx += (Math.cos(boat.ang) * boat.spd - boat.vx) * k; boat.vy += (Math.sin(boat.ang) * boat.spd - boat.vy) * k;
    const swx = Math.cos(st.t * 0.5) * st.swell, swy = Math.sin(st.t * 0.37) * st.swell * 0.6;
    if (!st.over) { boat.x += (boat.vx + swx * 0.5) * dt; boat.y += (boat.vy + swy * 0.5) * dt; }
    else st.sink = Math.min(1, st.sink + dt * 0.5);
    boat.x = clamp(boat.x, 22, W - 22); boat.y = clamp(boat.y, 74, H - 22);
    let d = dist(boat.x, boat.y, ISL.x, ISL.y);
    if (d < ISL.r + BR) { const nx = (boat.x - ISL.x) / (d || 1), ny = (boat.y - ISL.y) / (d || 1); boat.x = ISL.x + nx * (ISL.r + BR); boat.y = ISL.y + ny * (ISL.r + BR); boat.spd *= 0.9; }
    for (const r of rocks) {
      d = dist(boat.x, boat.y, r.x, r.y);
      if (d < r.r + BR - 3) {
        const nx = (boat.x - r.x) / (d || 1), ny = (boat.y - r.y) / (d || 1);
        boat.x = r.x + nx * (r.r + BR - 3); boat.y = r.y + ny * (r.r + BR - 3);
        const into = -(boat.vx * nx + boat.vy * ny);
        if (into > 95 && hurt(r.x, r.y)) { boat.vx = nx * 170; boat.vy = ny * 170; boat.spd *= 0.2; S.thud(boat.x); }
        else {
          if (into > 30 && r.bumpT !== Math.floor(st.t * 2)) { r.bumpT = Math.floor(st.t * 2); S.thud(boat.x); E.shake(3); FX.burst(boat.x - nx * BR, boat.y - ny * BR, { n: 6, color: ['#d7ecff', '#fff'], speed: 120, life: 0.4, size: 3 }); }
          if (into > 0) { boat.vx += nx * into; boat.vy += ny * into; } boat.spd *= Math.exp(-3 * dt);
        }
      }
    }
    // wake foam
    boat.wakeT -= dt * (0.4 + boat.spd / 60);
    if (boat.wakeT <= 0 && boat.spd > 20 && !st.over) { boat.wakeT = 0.09; if (wake.length < 140) wake.push({ x: boat.x - Math.cos(boat.ang) * 18 + rand(-4, 4), y: boat.y - Math.sin(boat.ang) * 18 + rand(-4, 4), life: 1, r: rand(3, 6) + boat.spd / 60 }); }
    for (let i = wake.length - 1; i >= 0; i--) { const w = wake[i]; w.life -= dt * 0.8; w.r += dt * 7; if (w.life <= 0) wake.splice(i, 1); }
    for (let i = lights.length - 1; i >= 0; i--) { lights[i].life -= dt; if (lights[i].life <= 0) lights.splice(i, 1); }

    // castaways
    for (let i = cast.length - 1; i >= 0; i--) {
      const c = cast[i];
      c.x = c.ax + Math.sin(st.t * 0.6 + c.ph) * 9; c.y = c.ay + Math.cos(st.t * 0.45 + c.ph) * 6;
      if (live && dist(c.x, c.y, boat.x, boat.y) < 38) {
        if (st.aboard < 3) {
          st.aboard++; cast.splice(i, 1); S.pickup(); E.buzz(-1, 50);
          FX.burst(c.x, c.y, { n: 14, color: ['#FFD23F', '#fff', '#FF8A3D'], speed: 180, life: 0.6 });
          FX.text(c.x, c.y - 26, st.aboard === 3 ? 'BOAT FULL!' : 'ABOARD!', { color: '#FFD23F', size: 24 });
        } else if (st.fullT <= 0) { st.fullT = 1.5; FX.text(c.x, c.y - 26, 'NO ROOM! DOCK FIRST', { color: '#FF8A3D', size: 20 }); S.back(); }
      }
    }
    // delivery
    if (live && st.aboard > 0 && dist(boat.x, boat.y, ISL.x, ISL.y) < ISL.dock) {
      st.dockT -= dt;
      if (st.dockT <= 0) {
        st.dockT = 0.3; st.aboard--; st.rescued++; st.scorePop = 1; S.point(); E.buzz(-1, 40);
        FX.text(ISL.x + rand(-30, 30), ISL.y - 70, '+1 RESCUED', { color: '#7CFF6B', size: 26 });
        FX.confetti(ISL.x, ISL.y - 20, 14, { speed: [100, 320], life: 1.1, size: 5 });
      }
    } else st.dockT = 0.15;
    // next wave
    if (live && cast.length === 0 && st.aboard === 0) {
      if (st.next <= 0) { st.next = 1.5; S.wave(); FX.text(ISL.x, ISL.y - 100, 'ALL SAFE!', { color: '#7CFF6B', size: 34, life: 1.3 }); }
      else {
        st.next -= dt;
        if (st.next <= 0) {
          st.wave++;
          if (st.wave % 2 === 1 && st.hull < 5) { st.hull++; st.hullPop = 1; FX.text(boat.x, boat.y - 36, 'HULL PATCHED +1', { color: '#FF8FA0', size: 22 }); }
          setupWave(st.wave);
          const sub = st.wave === 2 ? 'Something lurks out there… keep the light on it' : st.wave === 4 ? 'Armoured crabs: only the cannon stops them' : 'The storm is getting worse';
          FX.banner('WAVE ' + st.wave, { size: 110, life: 1.7, color: '#FFE08A', sub });
        }
      }
    }
    // eel spawns
    if (live) {
      st.eelT -= dt;
      if (st.eelT <= 0) {
        st.eelT = Math.max(3.2, 9.5 - st.wave * 0.9) * rand(0.8, 1.2);
        if (mons.filter(m => m.type === 'eel').length < Math.min(8, 1 + st.wave)) { const p = edgeSpot(); mons.push(mkMon('eel', p.x, p.y)); }
      }
      st.nextBolt -= dt; if (st.nextBolt <= 0) thunder();
    }
    st.boltT = Math.max(0, st.boltT - dt);

    // mines
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i];
      m.x += (m.dx + swx * 0.6) * dt; m.y += (m.dy + swy * 0.6) * dt;
      if (m.x < 40 || m.x > W - 40) m.dx *= -1; if (m.y < 90 || m.y > H - 40) m.dy *= -1;
      m.x = clamp(m.x, 36, W - 36); m.y = clamp(m.y, 86, H - 36);
      d = dist(m.x, m.y, ISL.x, ISL.y); if (d < ISL.dock + 40) { m.x += (m.x - ISL.x) / (d || 1) * 30 * dt; m.y += (m.y - ISL.y) / (d || 1) * 30 * dt; }
      if (m.fuse >= 0) { m.fuse -= dt; if (m.fuse <= 0) { mines.splice(i, 1); explode(m.x, m.y); continue; } }
      else if (!st.over && dist(m.x, m.y, boat.x, boat.y) < 13 + BR) { mines.splice(i, 1); explode(m.x, m.y); }
    }
    // monsters
    for (const m of mons) {
      if (m.dead) continue;
      const was = m.lit; m.lit = isLit(m.x, m.y); m.flash = Math.max(0, m.flash - dt * 5); m.stun = Math.max(0, m.stun - dt);
      const dx = boat.x - m.x, dy = boat.y - m.y, dd = Math.hypot(dx, dy) || 1, ux = dx / dd, uy = dy / dd;
      let sp = 0, tx = ux, ty = uy;
      if (m.type === 'eel') {
        sp = (74 + st.wave * 6) * (m.lit ? 0.28 : 1);
        if (m.lit && !was) { tone({ f: 950, f2: 480, d: 0.1, v: 0.05, type: 'sawtooth', pan: panX(m.x) }); FX.burst(m.x, m.y, { n: 5, color: '#9be8ff', speed: 90, life: 0.4, size: 3 }); }
      } else if (m.type === 'brute') sp = 40 + st.wave * 3;
      else { // lunger
        m.stT -= dt;
        if (m.state === 'lurk') {
          sp = 10; tx = Math.cos(st.t * 0.3 + m.ph); ty = Math.sin(st.t * 0.4 + m.ph);
          if (m.lit) m.litT += dt; else m.litT = Math.max(0, m.litT - dt * 0.5);
          if (live && (m.litT > 0.55 || dd < 95)) { m.state = 'warn'; m.stT = dd < 95 ? 0.4 : 0.7; tone({ f: 180, f2: 520, d: 0.4, v: 0.14, type: 'sawtooth', pan: panX(m.x) }); FX.text(m.x, m.y - 30, '!', { color: '#FF5D73', size: 40, life: 0.6 }); }
        } else if (m.state === 'warn') { sp = 0; m.lx = ux; m.ly = uy; if (m.stT <= 0) { m.state = 'lunge'; m.stT = 0.8; S.whoosh(m.x); } }
        else if (m.state === 'lunge') { sp = 440; tx = m.lx; ty = m.ly; if (m.stT <= 0) { m.state = 'rest'; m.stT = 2.2; } }
        else { sp = 8; if (m.stT <= 0) { m.state = 'lurk'; m.litT = 0; } }
      }
      if (m.stun > 0 || st.over && m.type !== 'lunger') sp *= st.over ? 0.3 : 0;
      const kk = 1 - Math.exp(-(m.state === 'lunge' ? 14 : 3) * dt);
      m.vx += (tx * sp - m.vx) * kk; m.vy += (ty * sp - m.vy) * kk;
      m.kx *= Math.exp(-4 * dt); m.ky *= Math.exp(-4 * dt);
      m.x = clamp(m.x + (m.vx + m.kx) * dt, 16, W - 16); m.y = clamp(m.y + (m.vy + m.ky) * dt, 70, H - 16);
      if (Math.hypot(m.vx, m.vy) > 6) m.ang = angLerp(m.ang, Math.atan2(m.vy, m.vx), 1 - Math.exp(-8 * dt));
      else if (m.state === 'warn') m.ang = angLerp(m.ang, Math.atan2(uy, ux), 1 - Math.exp(-10 * dt));
      d = dist(m.x, m.y, ISL.x, ISL.y);
      if (d < ISL.r + m.r + 26) { m.x = ISL.x + (m.x - ISL.x) / (d || 1) * (ISL.r + m.r + 26); m.y = ISL.y + (m.y - ISL.y) / (d || 1) * (ISL.r + m.r + 26); }
      if (!st.over && dd < m.r + BR) {
        hurt(m.x, m.y); m.kx = -ux * 300; m.ky = -uy * 300; m.stun = 1.3;
        if (m.type === 'lunger') { m.state = 'rest'; m.stT = 2.4; }
      }
    }
    // cannonballs
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let gone = b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H, hitSolid = false;
      if (b.life <= 0) { S.splash(b.x); FX.burst(b.x, b.y, { n: 8, color: ['#9bd6ff', '#fff'], speed: 120, life: 0.5, size: 4 }); FX.ring(b.x, b.y, { r1: 26, color: '#9bd6ff', w: 3 }); }
      for (const m of mons) if (!gone && !m.dead && dist(b.x, b.y, m.x, m.y) < m.r + 8) {
        gone = true; m.hp--; m.flash = 1; m.kx += b.vx * 0.35; m.ky += b.vy * 0.35; E.shake(4);
        if (m.hp <= 0) killMon(m); else { S.hit(m.x); FX.burst(b.x, b.y, { n: 8, color: ['#fff', m.col], speed: 200, life: 0.4 }); FX.text(m.x, m.y - 30, m.hp + ' TO GO', { color: '#fff', size: 18 }); }
      }
      for (const m of mines) if (!gone && m.fuse < 0 && dist(b.x, b.y, m.x, m.y) < 19) { gone = true; m.fuse = 0.001; }
      for (const r of rocks) if (!gone && dist(b.x, b.y, r.x, r.y) < r.r) { gone = hitSolid = true; }
      if (!gone && dist(b.x, b.y, ISL.x, ISL.y) < ISL.r) gone = hitSolid = true;
      if (hitSolid) { S.tink(b.x); FX.burst(b.x, b.y, { n: 8, color: ['#fff', '#FFD23F'], speed: 200, life: 0.3, size: 3 }); }
      if (gone) balls.splice(i, 1);
    }
    for (let i = mons.length - 1; i >= 0; i--) if (mons[i].dead) mons.splice(i, 1);
    FX.update(dt);
  }

  // ---- drawing ----
  function drawMon(g, m) {
    const c = m.flash > 0.3 ? '#fff' : m.col;
    if (m.type === 'eel') {
      for (let i = 6; i >= 0; i--) {
        const off = Math.sin(st.t * 9 - i * 0.9 + m.ph) * 4 * (i / 6 + 0.3);
        const px = m.x - Math.cos(m.ang) * i * 8 - Math.sin(m.ang) * off, py = m.y - Math.sin(m.ang) * i * 8 + Math.cos(m.ang) * off;
        g.fillStyle = m.flash > 0.3 ? '#fff' : i % 2 ? '#23806a' : c; circ(g, px, py, 13 - i * 1.3); g.fill();
      }
    } else if (m.type === 'lunger') {
      const open = m.state === 'warn' || m.state === 'lunge' ? 0.7 : 0.15, sh = m.state === 'warn' ? rand(-2, 2) : 0;
      g.save(); g.translate(m.x + sh, m.y + sh); g.rotate(m.ang);
      g.fillStyle = c; g.beginPath(); g.arc(0, 0, m.r, open, TAU - open); g.lineTo(0, 0); g.closePath(); g.fill();
      g.fillStyle = '#4a2f80'; circ(g, -7, -8, 4); g.fill(); circ(g, -9, 6, 3); g.fill();
      g.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const a = s * (open + 0.02), r0 = 5 + i * 5; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * (r0 + 4), Math.sin(a) * (r0 + 4)); g.lineTo(Math.cos(a) * (r0 + 2) + Math.sin(a) * s * 5, Math.sin(a) * (r0 + 2) - Math.cos(a) * s * 5); g.fill(); }
      g.strokeStyle = '#4a2f80'; g.lineWidth = 2; g.beginPath(); g.moveTo(2, -m.r + 3); g.quadraticCurveTo(16, -m.r - 12, 24, -m.r + 2); g.stroke();
      g.fillStyle = '#9be8ff'; circ(g, 24, -m.r + 2, 3.5); g.fill();
      g.restore();
    } else {
      g.save(); g.translate(m.x, m.y); g.rotate(m.ang);
      g.fillStyle = m.flash > 0.3 ? '#fff' : '#8c2b3c';
      for (const s of [-1, 1]) { circ(g, 20, s * 20 + Math.sin(st.t * 5 + m.ph) * s * 2, 10); g.fill(); for (let i = 0; i < 3; i++) g.fillRect(-14 + i * 10, s * 22, 4, s * 12); }
      g.fillStyle = c; circ(g, 0, 0, m.r); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 3; g.beginPath(); g.arc(-4, 0, m.r * 0.62, -1.2, 1.2); g.stroke(); g.beginPath(); g.arc(-14, 0, m.r * 0.5, -1, 1); g.stroke();
      g.restore();
      for (let i = 0; i < 3; i++) { g.fillStyle = i < m.hp ? '#FFD23F' : 'rgba(255,255,255,0.2)'; circ(g, m.x - 12 + i * 12, m.y - m.r - 12, 4); g.fill(); }
    }
  }
  function eyes(g, m, col, r) {
    const fx = Math.cos(m.ang), fy = Math.sin(m.ang), o = m.type === 'brute' ? 9 : 5, f = m.type === 'brute' ? m.r - 4 : m.type === 'lunger' ? 6 : 4;
    g.fillStyle = col;
    for (const s of [-1, 1]) { circ(g, m.x + fx * f - fy * o * s, m.y + fy * f + fx * o * s, r); g.fill(); }
  }
  function hole(x, y, r, a) {
    const gr = dg.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.75 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dg.fillStyle = gr; dg.beginPath(); dg.arc(x, y, r, 0, TAU); dg.fill();
  }
  function cone(c, x, y, ang, half, range, col, a) {
    const gr = c.createRadialGradient(x, y, 0, x, y, range);
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(0.7, 'rgba(' + col + ',' + a * 0.8 + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    c.fillStyle = gr; c.beginPath(); c.moveTo(x, y); c.arc(x, y, range, ang - half, ang + half); c.closePath(); c.fill();
  }

  function draw(g) {
    const t = st.t, hi = st.helm, li = 1 - hi;
    const lx = boat.x + Math.cos(boat.ang) * 12, ly = boat.y + Math.sin(boat.ang) * 12, beam = t * 0.45;
    g.drawImage(sea, 0, 0);
    // swell
    g.lineWidth = 2; g.strokeStyle = 'rgba(150,200,240,0.2)'; g.lineCap = 'round';
    for (const s of swells) {
      const x = ((s.x + t * 14 * s.s) % (W + 80)) - 40, y = s.y + Math.sin(t * 1.3 * s.s + s.p) * 7;
      g.beginPath(); g.moveTo(x - s.w / 2, y); g.quadraticCurveTo(x, y - 7 - Math.sin(t * 2 + s.p) * 3, x + s.w / 2, y); g.stroke();
    }
    // wake
    for (const w of wake) { g.globalAlpha = w.life * 0.45; g.fillStyle = '#d7ecff'; circ(g, w.x, w.y, w.r); g.fill(); }
    g.globalAlpha = 1;
    // dock ring + island
    const carrying = st.aboard > 0;
    g.save(); g.translate(ISL.x, ISL.y);
    g.setLineDash([14, 12]); g.lineDashOffset = -t * 30; g.lineWidth = carrying ? 5 : 3;
    g.strokeStyle = carrying ? 'rgba(124,255,107,' + (0.6 + 0.3 * Math.sin(t * 6)) + ')' : 'rgba(255,255,255,0.18)';
    circ(g, 0, 0, ISL.dock - 6); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(215,236,255,0.35)'; circ(g, 0, 0, ISL.r + 9 + Math.sin(t * 2) * 2); g.fill();
    g.fillStyle = '#6f6a5c'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = ISL.r * (0.9 + 0.12 * Math.sin(i * 2.3)); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.fillStyle = '#8d876f'; circ(g, -4, -4, ISL.r * 0.66); g.fill();
    g.fillStyle = '#7a5230'; g.fillRect(-9, ISL.r - 14, 18, 50); g.fillStyle = '#5c3d22'; for (let i = 0; i < 4; i++) g.fillRect(-9, ISL.r - 8 + i * 12, 18, 2);
    g.fillStyle = '#f4f1e6'; circ(g, 0, 0, 27); g.fill(); g.fillStyle = '#d6483f'; circ(g, 0, 0, 20); g.fill(); g.fillStyle = '#f4f1e6'; circ(g, 0, 0, 13); g.fill();
    g.fillStyle = '#FFE08A'; circ(g, 0, 0, 8); g.fill();
    g.restore();
    // rocks
    for (const r of rocks) {
      g.fillStyle = 'rgba(215,236,255,0.3)'; circ(g, r.x, r.y, r.r + 5 + Math.sin(t * 2.4 + r.x) * 2); g.fill();
      g.fillStyle = '#3a414d'; g.beginPath(); for (const v of r.v) g.lineTo(r.x + v[0], r.y + v[1]); g.closePath(); g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#151922'; g.stroke();
      g.fillStyle = '#8f9aab'; g.beginPath(); for (const v of r.v) g.lineTo(r.x - 3 + v[0] * 0.55, r.y - 4 + v[1] * 0.55); g.closePath(); g.fill();
    }
    // castaways on wreckage
    for (const c of cast) {
      g.save(); g.translate(c.x, c.y); g.rotate(c.rot + Math.sin(t * 1.4 + c.ph) * 0.12);
      g.fillStyle = '#7a5230'; rr(-17, -11, 34, 22, 4); g.fill(); g.fillStyle = '#5c3d22'; g.fillRect(-17, -2, 34, 2); g.fillRect(-6, -11, 2, 22);
      g.fillStyle = '#FF8A3D'; circ(g, 0, 2, 7); g.fill(); g.fillStyle = '#f2c9a0'; circ(g, 0, -3, 5); g.fill();
      g.strokeStyle = '#f2c9a0'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(5, 0); g.lineTo(11, -9 + Math.sin(t * 9 + c.ph) * 4); g.stroke();
      g.restore();
    }
    // mines
    for (const m of mines) {
      g.save(); g.translate(m.x, m.y + Math.sin(t * 2 + m.ph) * 2); g.rotate(t * 0.4 + m.ph);
      g.strokeStyle = '#1b1f2a'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); g.stroke(); }
      g.fillStyle = '#2b3140'; circ(g, 0, 0, 12); g.fill(); g.fillStyle = m.fuse >= 0 || Math.sin(t * 5 + m.ph) > 0.5 ? '#FF3B3B' : '#6b1f1f'; circ(g, 0, 0, 4); g.fill();
      g.restore();
    }
    for (const m of mons) drawMon(g, m);
    for (const b of balls) { g.fillStyle = '#1b1f2a'; circ(g, b.x, b.y, 6); g.fill(); g.fillStyle = '#FFD23F'; circ(g, b.x - b.vx * 0.012, b.y - b.vy * 0.012, 3); g.fill(); }
    // boat
    if (st.sink < 1) {
      g.save(); g.translate(boat.x, boat.y + Math.sin(t * 2.2) * 1.5); g.rotate(boat.ang + Math.sin(t * 1.7) * 0.05);
      const sc = 1.22 * (1 - st.sink * 0.6); g.scale(sc, sc);
      g.globalAlpha = (1 - st.sink) * (boat.inv > 0 && Math.floor(t * 14) % 2 ? 0.4 : 1);
      g.beginPath(); g.moveTo(27, 0); g.quadraticCurveTo(12, -14, -18, -12); g.lineTo(-23, -7); g.lineTo(-23, 7); g.lineTo(-18, 12); g.quadraticCurveTo(12, 14, 27, 0); g.closePath();
      g.fillStyle = '#efe7d2'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#2a2018'; g.stroke();
      g.beginPath(); g.moveTo(17, 0); g.quadraticCurveTo(8, -8, -15, -7); g.lineTo(-17, 7); g.quadraticCurveTo(8, 8, 17, 0); g.closePath(); g.fillStyle = '#c9965a'; g.fill();
      g.fillStyle = COL[hi]; circ(g, -11, 0, 6.5); g.fill(); g.strokeStyle = '#0a0d18'; g.lineWidth = 1.5; g.stroke();
      const seats = [[-1, -4.5], [-1, 4.5], [5, 0]];
      for (let i = 0; i < st.aboard; i++) { g.fillStyle = '#FF8A3D'; circ(g, seats[i][0], seats[i][1], 3.6); g.fill(); }
      g.restore(); g.globalAlpha = 1 - st.sink;
      g.save(); g.translate(lx, ly); g.rotate(boat.lamp); g.scale(1.2, 1.2);
      g.fillStyle = '#2a2018'; g.fillRect(0, -3.5, 17 - boat.recoil * 6, 7);
      g.fillStyle = COL[li]; circ(g, 0, 0, 7.5); g.fill(); g.strokeStyle = '#0a0d18'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#FFE08A'; circ(g, 5, 0, 3); g.fill();
      g.restore(); g.globalAlpha = 1;
    }

    // ---- darkness: paint it, then punch holes where there is light ----
    const glimpse = clamp(st.boltT / 0.5, 0, 1);
    dg.setTransform(1, 0, 0, 1, 0, 0); dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, DW, DH);
    dg.fillStyle = 'rgba(2,5,16,' + (0.9 * (1 - 0.82 * glimpse)) + ')'; dg.fillRect(0, 0, DW, DH);
    dg.setTransform(0.5, 0, 0, 0.5, 0, 0); dg.globalCompositeOperation = 'destination-out';
    hole(ISL.x, ISL.y, 185, 0.95);
    cone(dg, ISL.x, ISL.y, beam, 0.11, 600, '0,0,0', 0.5);
    cone(dg, ISL.x, ISL.y, beam + Math.PI, 0.11, 600, '0,0,0', 0.5);
    if (st.sink < 1) {
      hole(boat.x, boat.y, 96, 0.9 * (1 - st.sink));
      cone(dg, lx, ly, boat.lamp, CONE + 0.1, RANGE + 30, '0,0,0', 0.4 * (1 - st.sink));
      cone(dg, lx, ly, boat.lamp, CONE, RANGE, '0,0,0', 0.95 * (1 - st.sink));
    }
    for (const c of cast) hole(c.x, c.y, 44 + Math.sin(t * 13 + c.ph) * 5, 0.8);
    for (const b of balls) hole(b.x, b.y, 44, 0.7);
    for (const l of lights) hole(l.x, l.y, l.r, Math.min(1, l.life / l.max * 1.3));
    g.drawImage(dk, 0, 0, W, H);

    // ---- light and tells on top of the dark ----
    g.globalCompositeOperation = 'lighter';
    if (st.sink < 1) cone(g, lx, ly, boat.lamp, CONE, RANGE, '255,225,150', 0.17 * (1 - st.sink));
    cone(g, ISL.x, ISL.y, beam, 0.11, 600, '255,240,190', 0.1); cone(g, ISL.x, ISL.y, beam + Math.PI, 0.11, 600, '255,240,190', 0.1);
    let gr = g.createRadialGradient(ISL.x, ISL.y, 0, ISL.x, ISL.y, 70); gr.addColorStop(0, 'rgba(255,230,150,0.55)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = gr; circ(g, ISL.x, ISL.y, 70); g.fill();
    for (const c of cast) {   // flares: the thing to steer for
      const f = 0.7 + 0.3 * Math.sin(t * 17 + c.ph), fy = c.y - 20;
      gr = g.createRadialGradient(c.x, fy, 0, c.x, fy, 30); gr.addColorStop(0, 'rgba(255,90,60,' + 0.75 * f + ')'); gr.addColorStop(1, 'rgba(255,90,60,0)');
      g.fillStyle = gr; circ(g, c.x, fy, 30); g.fill(); g.fillStyle = 'rgba(255,230,200,' + f + ')'; circ(g, c.x, fy, 3.5); g.fill();
    }
    for (const m of mines) { const a = Math.pow(Math.max(0, Math.sin(t * 1.9 + m.ph)), 10) * 0.55; if (a > 0.02) { g.fillStyle = 'rgba(255,50,50,' + a + ')'; circ(g, m.x, m.y, 5); g.fill(); } }
    for (const m of mons) {
      const dd = dist(m.x, m.y, boat.x, boat.y), near = clamp(1 - (dd - 110) / 110, 0, 1), hot = m.state === 'warn' || m.state === 'lunge';
      if (m.type === 'lunger') {
        const a = Math.pow(Math.max(0, Math.sin(t * 1.3 + m.ph)), 8) * 0.5;
        if (a > 0.02 && !hot) { g.fillStyle = 'rgba(120,230,255,' + a + ')'; circ(g, m.x + Math.cos(m.ang) * 24, m.y + Math.sin(m.ang) * 24, 4); g.fill(); }
        if (hot) eyes(g, m, 'rgba(255,60,60,0.95)', 4.5);
      } else if (near > 0) eyes(g, m, m.type === 'brute' ? 'rgba(255,90,60,' + near * 0.9 + ')' : 'rgba(255,230,90,' + near * 0.9 + ')', 3);
    }
    g.globalCompositeOperation = 'source-over';
    for (const r of rocks) { g.strokeStyle = 'rgba(215,236,255,0.06)'; g.lineWidth = 2; circ(g, r.x, r.y, r.r + 6); g.stroke(); }
    // guide arrow to the dock while carrying
    if (carrying && !st.over && dist(boat.x, boat.y, ISL.x, ISL.y) > ISL.dock + 20) {
      const a = Math.atan2(ISL.y - boat.y, ISL.x - boat.x), r = 50 + Math.sin(t * 8) * 5;
      g.save(); g.translate(boat.x + Math.cos(a) * r, boat.y + Math.sin(a) * r); g.rotate(a);
      g.fillStyle = '#7CFF6B'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -9); g.lineTo(-2, 0); g.lineTo(-6, 9); g.closePath(); g.fill(); g.restore();
      txt('DOCK HERE', ISL.x, ISL.y - ISL.dock - 12, 16, 'rgba(124,255,107,' + (0.6 + 0.4 * Math.sin(t * 6)) + ')', { stroke: 'rgba(0,0,0,0.6)' });
    }
    // swap ring
    if (st.swapT > 0.02 || (!st.over && (P[0].b !== P[1].b) && !st.swapLock && st.phase === 'play')) {
      g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,0.2)'; circ(g, boat.x, boat.y, 40); g.stroke();
      g.strokeStyle = '#FFD23F'; g.beginPath(); g.arc(boat.x, boat.y, 40, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(st.swapT, 0, 1)); g.stroke();
      txt(st.swapT > 0.02 ? 'SWAPPING…' : 'BOTH HOLD B TO SWAP', boat.x, boat.y - 56, 15, '#FFD23F', { stroke: 'rgba(0,0,0,0.7)' });
    }
    FX.draw(g);
    // rain + lightning
    const nRain = Math.min(rain.length, 50 + st.wave * 12);
    g.strokeStyle = 'rgba(190,215,255,0.28)'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < nRain; i++) { const r = rain[i], x = ((r.x - t * 170 * r.s) % W + W) % W, y = (r.y + t * 680 * r.s) % H; g.moveTo(x, y); g.lineTo(x - r.l * 0.25, y + r.l); }
    g.stroke();
    if (st.bolt && st.boltT > 0.25) {
      g.strokeStyle = 'rgba(235,242,255,' + clamp((st.boltT - 0.25) * 4, 0, 1) + ')'; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath(); for (const p of st.bolt) g.lineTo(p[0], p[1]); g.stroke();
    }

    // ---- HUD ----
    g.fillStyle = 'rgba(5,8,20,0.6)'; g.fillRect(0, 0, W, 58);
    for (let i = 0; i < 5; i++) { const pop = i === st.hull || i === st.hull - 1 ? st.hullPop : 0; heart(g, 38 + i * 38, 28, 13 + pop * 5, i < st.hull ? '#FF5D73' : null, i < st.hull ? null : 'rgba(255,255,255,0.3)'); }
    txt('ABOARD', 250, 29, 14, 'rgba(255,255,255,0.55)', { align: 'left' });
    for (let i = 0; i < 3; i++) { circ(g, 336 + i * 30, 29, 10); if (i < st.aboard) { g.fillStyle = '#FF8A3D'; g.fill(); } else { g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 2; g.stroke(); } }
    txt('RESCUED', W / 2 - 14, 30, 16, 'rgba(255,255,255,0.6)', { align: 'right' });
    txt(String(st.rescued), W / 2, 30, 38 + st.scorePop * 14, '#7CFF6B', { align: 'left', stroke: '#0a0d18' });
    txt('WAVE ' + st.wave, W - 190, 29, 22, '#FFE08A', { align: 'right' });
    txt('BEST ' + Math.max(st.best, st.rescued), W - 28, 29, 18, 'rgba(255,255,255,0.55)', { align: 'right' });
    if (st.aboard === 3 && !st.over) txt('BOAT FULL — HEAD FOR THE LIGHTHOUSE!', W / 2, 84, 20, 'rgba(124,255,107,' + (0.6 + 0.4 * Math.sin(t * 7)) + ')', { stroke: 'rgba(0,0,0,0.7)' });
    for (let i = 0; i < 2; i++) {   // role plates
      const isHelm = i === hi, x = i ? W - 276 : 16, y = H - 60 - (st.rolePop > 0 ? Math.sin(st.rolePop * Math.PI) * 14 : 0);
      rr(x, y, 260, 46, 14); g.fillStyle = 'rgba(8,12,26,0.78)'; g.fill(); g.lineWidth = 3; g.strokeStyle = COL[i]; g.stroke();
      txt(P[i].name, x + 14, y + 17, 17, COL[i], { align: 'left' });
      txt(isHelm ? 'HELM · steer' : 'LAMP · aim + fire', x + 14, y + 35, 13, 'rgba(255,255,255,0.7)', { align: 'left' });
      const cdv = isHelm ? clamp(1 - boat.boostCd / 2.2, 0, 1) : clamp(1 - boat.cd / 0.5, 0, 1);
      g.fillStyle = 'rgba(255,255,255,0.15)'; rr(x + 168, y + 28, 78, 8, 4); g.fill();
      g.fillStyle = cdv >= 1 ? '#FFD23F' : COL[i]; rr(x + 168, y + 28, Math.max(8, 78 * cdv), 8, 4); g.fill();
      txt(isHelm ? 'A BOOST' : 'A FIRE', x + 207, y + 16, 13, cdv >= 1 ? '#FFD23F' : 'rgba(255,255,255,0.5)');
    }
    FX.drawText(g);
  }
  if (typeof QS !== 'undefined' && QS.has('test')) window.__lh = { st, boat, cast, mons, mines, rocks };
  return { update, draw };
}

GAMES.push({
  id: 'lighthouse', name: 'LIGHTHOUSE KEEPERS', tag: 'CO-OP', color: '#F2B84B',
  tagline: 'One steers, one aims the lamp. Save them all.',
  pad: PADS(0),
  how: { goal: 'Rescue castaways before the storm sinks you',
    rows: [['P1 STICK', 'Steer the rescue boat  (A = boost)'], ['P2 STICK', 'Aim the searchlight  (A = fire the cannon)'], ['A', 'Touch red flares to rescue, then dock at the lighthouse'], ['B', 'Both hold B for a second to swap jobs']],
    tips: ['You only see what the lamp lights up — talk to each other!', 'Light slows the eels. Cannon pops monsters and mines.'] },
  song: SONG,
  icon(g, t) {
    rr(-120, -52, 240, 104, 14); g.fillStyle = '#0b2140'; g.fill();
    g.save(); rr(-120, -52, 240, 104, 14); g.clip();
    g.strokeStyle = 'rgba(150,200,240,0.3)'; g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { g.beginPath(); for (let x = -120; x <= 120; x += 12) g.lineTo(x, -22 + i * 22 + Math.sin(x * 0.06 + t * 2 + i) * 3); g.stroke(); }
    const bx = 34 + Math.sin(t * 0.9) * 16, by = 14 + Math.sin(t * 2) * 3, la = Math.PI + 0.25 + Math.sin(t * 1.4) * 0.5;
    g.globalCompositeOperation = 'lighter';
    let gr = g.createRadialGradient(bx, by, 0, bx, by, 120); gr.addColorStop(0, 'rgba(255,225,150,0.6)'); gr.addColorStop(1, 'rgba(255,225,150,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, 120, la - 0.32, la + 0.32); g.closePath(); g.fill();
    const fl = 0.6 + 0.4 * Math.sin(t * 15);
    gr = g.createRadialGradient(-56, 20, 0, -56, 20, 16); gr.addColorStop(0, 'rgba(255,90,60,' + fl + ')'); gr.addColorStop(1, 'rgba(255,90,60,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(-56, 20, 16, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#7a5230'; g.fillRect(-66, 24, 20, 8); g.fillStyle = '#FF8A3D'; g.beginPath(); g.arc(-56, 22, 4, 0, TAU); g.fill();
    // lighthouse
    g.fillStyle = '#6f6a5c'; g.beginPath(); g.ellipse(-92, -14, 22, 9, 0, 0, TAU); g.fill();
    g.fillStyle = '#f4f1e6'; g.beginPath(); g.moveTo(-100, -16); g.lineTo(-96, -44); g.lineTo(-88, -44); g.lineTo(-84, -16); g.closePath(); g.fill();
    g.fillStyle = '#d6483f'; g.fillRect(-98.5, -30, 13, 6); g.fillStyle = '#FFE08A'; g.fillRect(-96, -50, 8, 6);
    // boat
    g.save(); g.translate(bx, by); g.rotate(Math.sin(t * 2) * 0.08);
    g.fillStyle = '#efe7d2'; g.beginPath(); g.moveTo(-22, -4); g.lineTo(22, -4); g.lineTo(15, 8); g.lineTo(-15, 8); g.closePath(); g.fill();
    g.fillStyle = COL[0]; g.beginPath(); g.arc(8, -8, 5, 0, TAU); g.fill(); g.fillStyle = COL[1]; g.beginPath(); g.arc(-8, -8, 5, 0, TAU); g.fill();
    g.restore(); g.restore();
  },
  create,
});
})();
