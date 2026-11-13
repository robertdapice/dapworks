'use strict';
// BLADE DASH (three-player edition) — side-on, one-hit sword duel on a crumbling bridge at dusk.
// Winner stays on: two duel while the third waits on the ledge; the loser swaps out.
(function () {
  const GY = 545, SC = 1.5, REACH = 176, X0 = 150, X1 = 1130;
  const WIND = 0.075, ACT = 0.13, REC = 0.3, LSPD = 860;          // lunge: wind-up, active, recovery (s), speed
  const DASH_T = 0.15, DASH_V = 860, DASH_CD = 0.85, STAG = 0.36;
  const WIN = 5, CRUMBLE_AT = 11, MIN_W = 300;
  const LEDGE_X = 66, LEDGE_Y = GY - 150;                           // where the waiting player stands
  const TY = [-88, -58, -30];                                     // thrust heights (local px): high, mid, low
  const GH = [[16, -84, -0.66], [22, -58, -0.06], [20, -36, 0.52]]; // guard poses: hand x, hand y, blade angle
  const INK = '#130c1e', GOLD = '#FFE2A0';

  function mkLayer(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; }
  function ridge(b, w, color, baseY, amp, f, seed) {
    b.fillStyle = color; b.beginPath(); b.moveTo(0, H);
    for (let x = 0; x <= w; x += 8) {
      const y = baseY - amp * (0.55 + 0.45 * Math.sin(x * f + seed)) * (0.55 + 0.45 * Math.sin(x * f * 2.7 + seed * 2.3)) - 6 * Math.sin(x * 0.09 + seed);
      b.lineTo(x, y);
    }
    b.lineTo(w, H); b.closePath(); b.fill();
  }
  function pine(b, x, base, h) {
    for (let i = 0; i < 3; i++) { const w = h * (0.34 - i * 0.07), y = base - h * (0.25 + i * 0.25); b.beginPath(); b.moveTo(x - w, y); b.lineTo(x, y - h * 0.42); b.lineTo(x + w, y); b.closePath(); b.fill(); }
    b.fillRect(x - 3, base - h * 0.3, 6, h * 0.3);
  }
  function tower(b, x, base, s) {
    let y = base;
    for (let i = 0; i < 4; i++) {
      const w = (58 - i * 11) * s, hh = 26 * s;
      b.fillRect(x - w * 0.36, y - hh, w * 0.72, hh);
      b.beginPath(); b.moveTo(x - w * 0.75, y - hh + 3); b.quadraticCurveTo(x - w * 0.4, y - hh - 2, x - w * 0.3, y - hh - 9 * s);
      b.lineTo(x + w * 0.3, y - hh - 9 * s); b.quadraticCurveTo(x + w * 0.4, y - hh - 2, x + w * 0.75, y - hh + 3); b.closePath(); b.fill();
      y -= hh + 8 * s;
    }
    b.fillRect(x - 2, y - 22 * s, 4, 30 * s);
  }
  let sky = null, far = null, near = null;
  function buildBg() {
    sky = mkLayer(W, H, b => {
      const gr = b.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#150d2e'); gr.addColorStop(0.34, '#4b2260'); gr.addColorStop(0.56, '#c9503f'); gr.addColorStop(0.675, '#ff9e58');
      gr.addColorStop(0.705, '#ffc98a'); gr.addColorStop(0.71, '#5a2a55'); gr.addColorStop(1, '#170d24');
      b.fillStyle = gr; b.fillRect(0, 0, W, H);
      b.fillStyle = '#fff';
      for (let i = 0; i < 70; i++) { b.globalAlpha = rand(0.15, 0.7); b.fillRect(rand(W), rand(230), rand(1, 2.4), rand(1, 2.4)); }
      b.globalAlpha = 1;
      const sg = b.createRadialGradient(640, 420, 30, 640, 420, 380);
      sg.addColorStop(0, 'rgba(255,225,160,0.85)'); sg.addColorStop(0.35, 'rgba(255,150,90,0.32)'); sg.addColorStop(1, 'rgba(255,120,80,0)');
      b.fillStyle = sg; b.fillRect(200, 0, 880, 510);
      b.save(); b.beginPath(); b.rect(0, 0, W, 508); b.clip();
      b.fillStyle = '#ffe9b8'; b.beginPath(); b.arc(640, 420, 128, 0, TAU); b.fill();
      b.fillStyle = 'rgba(201,80,63,0.55)';
      for (let i = 0; i < 5; i++) b.fillRect(500, 452 + i * 13, 280, 2 + i * 1.3);
      b.restore();
      // thin clouds
      b.fillStyle = 'rgba(255,190,150,0.16)';
      for (let i = 0; i < 9; i++) { const x = rand(W), y = rand(120, 400), w = rand(160, 420); b.beginPath(); b.ellipse(x, y, w, rand(5, 12), 0, 0, TAU); b.fill(); }
      // mist under the bridge
      const mg = b.createLinearGradient(0, 510, 0, H);
      mg.addColorStop(0, 'rgba(90,42,85,0)'); mg.addColorStop(0.5, 'rgba(120,60,100,0.25)'); mg.addColorStop(1, 'rgba(12,6,20,0.9)');
      b.fillStyle = mg; b.fillRect(0, 510, W, H - 510);
    });
    far = mkLayer(W + 160, H, b => { ridge(b, W + 160, '#7a3460', 512, 150, 0.006, 1.3); ridge(b, W + 160, '#562650', 514, 95, 0.011, 4.1); });
    near = mkLayer(W + 160, H, b => {
      ridge(b, W + 160, '#2b1538', 520, 50, 0.017, 2.2);
      b.fillStyle = '#2b1538';
      tower(b, 250, 500, 1.15); tower(b, 1190, 496, 0.9);
      for (let i = 0; i < 16; i++) { const x = rand(40, W + 120); if (Math.abs(x - 720) < 190) continue; pine(b, x, 512, rand(46, 96)); }
      b.fillRect(0, 512, W + 160, 40);
    });
  }

  // ---- one duellist, drawn facing +x in local space ----
  function drawFighter(g, f, alpha, ox) {
    const col = COL[f.i], t = E.t;
    let lean = 0.08, hipY = -44, ff = 13, bf = -15, fl = 0, bl = 0, rot = 0, sh = 0;
    const gv = clamp(f.gv, 0, 2), a = GH[gv <= 1 ? 0 : 1], b = GH[gv <= 1 ? 1 : 2], k = gv <= 1 ? gv : gv - 1;
    let hx = lerp(a[0], b[0], k), hy = lerp(a[1], b[1], k), ba = lerp(a[2], b[2], k);
    if (f.state === 'idle') {
      const w = Math.sin(f.walk * TAU), m = Math.min(1, Math.abs(f.vx) / 200);
      ff += w * 11 * m; bf -= w * 11 * m; fl = Math.max(0, Math.cos(f.walk * TAU)) * 6 * m; bl = Math.max(0, -Math.cos(f.walk * TAU)) * 6 * m;
      hipY += Math.sin(t * 3 + f.i * 2) * 1.3; hy += Math.sin(t * 3 + f.i * 2 + 1) * 1.5;
    } else if (f.state === 'lunge' || f.state === 'recover') {
      const ext = f.state === 'lunge' ? (f.st < WIND ? -0.3 * (f.st / WIND) : ease.out(Math.min(1, (f.st - WIND) / 0.05))) : 1 - ease.inOut(Math.min(1, f.st / REC));
      const e = Math.max(0, ext);
      hx = lerp(hx, 46, e); hy = lerp(hy, TY[f.lh], e); ba = lerp(ba, 0, e);
      if (ext < 0) { hx += ext * 34; lean = 0.08 + ext * 0.5; }
      else { lean = 0.08 + 0.52 * e; hipY = -44 + 9 * e; ff = 13 + 32 * e; bf = -15 - 16 * e; }
    } else if (f.state === 'stagger') {
      lean = -0.3; hx -= 9; ff = 8; bf = -23; sh = Math.sin(t * 70) * 2; ba += Math.sin(t * 45) * 0.12;
    } else if (f.state === 'dash') {
      lean = 0.34 * f.dd * f.facing; hipY = -39; ff = 21; bf = -23;
    } else if (f.state === 'dead') {
      const q = ease.out(Math.min(1, f.st / 0.45));
      rot = -1.47 * q; hx = lerp(hx, 34, q); hy = lerp(hy, -26, q); ba = lerp(ba, 1.35, q); lean = 0.08 - 0.25 * q;
    } else if (f.state === 'fall') { rot = f.rot; lean = -0.2; hy -= 20; ba -= 0.8; }
    else if (f.state === 'wait') {       // resting on the ledge, blade up; hops when cheering
      const h = f.hop || 0;
      hx = 9; hy = -56 - 30 * h + Math.sin(t * 3 + f.i * 2 + 1) * 1.5; ba = -1.42 - 0.45 * h; hipY += Math.sin(t * 3 + f.i * 2) * 1.3; ff = 10; bf = -12; lean = 0.02;
    } else if (f.state === 'enter') { lean = 0.3; hipY = -40; ff = 22; bf = -20; fl = 8; bl = 14; hy -= 8; ba -= 0.5; }
    const nlx = Math.sin(lean) * 42, nly = hipY - Math.cos(lean) * 42;
    if (alpha === 1 && !ox) {
      const c = Math.cos(rot), s = Math.sin(rot);
      f.ax = f.x + f.facing * SC * (nlx * c - nly * s); f.ay = f.y + SC * (nlx * s + nly * c);
    }
    const hdx = nlx + Math.sin(lean) * 12 + 2, hdy = nly - 13;
    g.save(); g.translate(f.x + (ox || 0) + sh, f.y); g.scale(f.facing * SC, SC); g.rotate(rot); g.globalAlpha = alpha;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.fillStyle = INK;
    // legs + robe
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(-3, hipY); g.quadraticCurveTo(bf / 2 - 7, hipY / 2, bf, -bl - 3); g.stroke();
    g.beginPath(); g.moveTo(3, hipY); g.quadraticCurveTo(ff / 2 + 12, hipY / 2 - 4, ff, -fl - 3); g.stroke();
    g.beginPath(); g.moveTo(-11, hipY - 2); g.lineTo(11, hipY - 2); g.lineTo(ff + 7, -13 - fl); g.lineTo(bf - 7, -13 - bl); g.closePath(); g.fill();
    g.lineWidth = 6; g.beginPath(); g.moveTo(ff - 2, -3 - fl); g.lineTo(ff + 6, -3 - fl); g.moveTo(bf - 2, -3 - bl); g.lineTo(bf + 5, -3 - bl); g.stroke();
    // torso + back arm
    g.lineWidth = 17; g.beginPath(); g.moveTo(0, hipY); g.lineTo(nlx, nly + 7); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.moveTo(nlx - 4, nly + 10); g.quadraticCurveTo(nlx - 17, nly + 27, -13, hipY - 7); g.stroke();
    // sash
    g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(-9, hipY - 3); g.lineTo(9, hipY - 5); g.stroke();
    // head
    g.fillStyle = INK; g.strokeStyle = INK;
    g.beginPath(); g.arc(hdx, hdy, 11, 0, TAU); g.fill();
    if (f.i === 0) {          // wide conical hat
      g.beginPath(); g.moveTo(hdx - 26, hdy - 2); g.lineTo(hdx + 1, hdy - 23); g.lineTo(hdx + 27, hdy - 2); g.closePath(); g.fill();
      g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.moveTo(hdx - 24, hdy - 2); g.lineTo(hdx + 25, hdy - 2); g.stroke();
    } else if (f.i === 1) {   // topknot + ponytail + headband
      g.beginPath(); g.arc(hdx - 3, hdy - 13, 5.5, 0, TAU); g.fill();
      g.lineWidth = 6; g.beginPath(); g.moveTo(hdx - 6, hdy - 13); g.quadraticCurveTo(hdx - 24, hdy - 20, hdx - 27, hdy + 2 + Math.sin(t * 5) * 3); g.stroke();
      g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); g.moveTo(hdx - 10.5, hdy - 3); g.lineTo(hdx + 10.5, hdy - 5); g.stroke();
    } else {                  // eared hood + trailing ribbon
      g.beginPath(); g.moveTo(hdx - 12, hdy - 4); g.lineTo(hdx - 10, hdy - 27); g.lineTo(hdx - 1, hdy - 10); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(hdx + 1, hdy - 10); g.lineTo(hdx + 10, hdy - 28); g.lineTo(hdx + 12, hdy - 4); g.closePath(); g.fill();
      g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); g.moveTo(hdx - 10.5, hdy - 1); g.lineTo(hdx + 10.5, hdy - 3); g.stroke();
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(hdx - 10, hdy - 1); g.quadraticCurveTo(hdx - 22, hdy + 3, hdx - 26, hdy + 13 + Math.sin(t * 5) * 3); g.stroke();
    }
    // sword arm, guard, blade
    g.strokeStyle = INK; g.lineWidth = 7;
    g.beginPath(); g.moveTo(nlx + 3, nly + 9); g.quadraticCurveTo((nlx + hx) / 2, Math.max(nly + 9, hy) + 9, hx, hy); g.stroke();
    const cb = Math.cos(ba), sb = Math.sin(ba), tx = hx + cb * 64, ty = hy + sb * 64;
    g.lineWidth = 4.5; g.beginPath(); g.moveTo(hx + sb * 7, hy - cb * 7); g.lineTo(hx - sb * 7, hy + cb * 7); g.stroke();
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * 0.32; g.strokeStyle = col; g.lineWidth = 11;
    g.beginPath(); g.moveTo(hx + cb * 4, hy + sb * 4); g.lineTo(tx, ty); g.stroke();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha; g.lineWidth = 4.5;
    g.beginPath(); g.moveTo(hx + cb * 4, hy + sb * 4); g.lineTo(tx, ty); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(hx + cb * 8, hy + sb * 8); g.lineTo(tx, ty); g.stroke();
    // guard-height pips behind the fighter
    if (f.pips && (f.state === 'idle' || f.state === 'stagger')) {
      for (let i = 0; i < 3; i++) {
        const on = i === f.guard;
        g.fillStyle = on ? col : 'rgba(255,255,255,0.4)';
        g.beginPath(); g.arc(-34, TY[i], on ? 5.5 : 2.4, 0, TAU); g.fill();
        if (on) { g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
      }
    }
    g.restore();
  }

  function mkF(i) {
    return { i, x: 0, y: GY, vx: 0, vy: 0, facing: i ? -1 : 1, guard: 1, gv: 1, state: 'idle', st: 0, lh: 1, hit: false,
      dashCd: 0, dd: 0, inv: 0, buf: 0, walk: 0, rot: 0, ax: 0, ay: 0, pips: true, scarf: [], hop: 0, cheerCd: 0, ex: 0, ed: 0.6, eh: 130 };
  }

  function create() {
    if (!sky) buildBg();
    const P = E.players;
    const st = { phase: 'ready', pt: 0, round: 0, score: [0, 0, 0], x0: X0, x1: X1, rt: 0, warned: false, pop: -1, popT: 0, slashes: [], rumT: 0, bars: 0,
      seat: [0, 1], wait: 2, since: [1, 1, 0] };   // seat[0|1] = player duelling on the left|right, wait = player on the ledge, since = round they stepped in
    const FT = [mkF(0), mkF(1), mkF(2)];          // one fighter per player
    const F = [FT[0], FT[1]];                     // the two currently duelling (left seat, right seat)
    const FIGHT_PAD = { a: 'LUNGE', b: 'DASH', stick: 'WALK · GUARD' }, WAIT_PAD = { a: 'CHEER', b: 'WAIT', stick: 'NEXT UP' };
    function initScarf(f) { f.ax = f.x; f.ay = f.y - 128; f.scarf = []; for (let k = 0; k < 9; k++) f.scarf.push({ x: f.ax - f.facing * k * 7, y: f.ay + k * 2 }); }
    const petals = [];
    for (let i = 0; i < 40; i++) petals.push({ x: rand(W), y: rand(-20, GY + 60), vx: -rand(20, 70), vy: rand(14, 44), ph: rand(TAU), s: rand(1.8, 4.2), c: pick(['#ffb3c7', '#ffd9a0', '#ff8fa3']) });
    const alive = f => f.state !== 'dead' && f.state !== 'fall';

    function newRound(swapSeat) {     // swapSeat: 0|1 if a newcomer leaps into that seat from the ledge
      st.round++; st.x0 = X0; st.x1 = X1; st.rt = 0; st.warned = false; st.slashes.length = 0;
      F[0] = FT[st.seat[0]]; F[1] = FT[st.seat[1]];
      F.forEach((f, i) => {
        Object.assign(f, { x: 640 + (i ? 215 : -215), y: GY, vx: 0, vy: 0, facing: i ? -1 : 1, guard: 1, gv: 1, state: 'idle', st: 0, hit: false, dashCd: 0, inv: 0, buf: 0, rot: 0, hop: 0 });
        if (i === swapSeat) { f.ex = f.x; f.ed = 0.5 + (f.ex - LEDGE_X) / 2600; f.eh = 80 + (f.ex - LEDGE_X) * 0.07; f.x = LEDGE_X; f.y = LEDGE_Y; f.facing = 1; f.state = 'enter'; }
        initScarf(f);
      });
      const wf = FT[st.wait];
      Object.assign(wf, { x: LEDGE_X, y: LEDGE_Y, vx: 0, vy: 0, facing: 1, guard: 1, gv: 1, state: 'wait', st: 0, hit: false, dashCd: 0, inv: 0, buf: 0, rot: 0, hop: 0, cheerCd: 0.3 });
      initScarf(wf);
      if (st.round > 1) FX.burst(LEDGE_X, LEDGE_Y - 90, { n: 16, color: ['#8a6f84', COL[st.wait]], speed: 170, life: 0.5, size: 6, add: false });
      st.phase = 'ready'; st.pt = st.round === 1 ? 1.3 : swapSeat >= 0 ? 1.05 : 0.8;
      const mp = st.seat.some(p => st.score[p] === WIN - 1);
      const sub = [mp ? 'MATCH POINT' : '', swapSeat >= 0 ? P[st.seat[swapSeat]].name + ' STEPS IN' : ''].filter(Boolean).join('   ·   ');
      FX.banner(st.round === 1 ? 'EN GARDE' : 'ROUND ' + st.round, { size: st.round === 1 ? 104 : 78, life: st.pt, color: GOLD, y: 250, sub });
      S.count();
      const pads = []; pads[st.seat[0]] = FIGHT_PAD; pads[st.seat[1]] = FIGHT_PAD; pads[st.wait] = WAIT_PAD;
      E.setPads(pads, 'BLADE DASH');
    }

    function startLunge(f) {
      f.state = 'lunge'; f.st = 0; f.lh = f.guard; f.hit = false; f.buf = 0;
      S.whoosh(f.x); FX.burst(f.x - f.facing * 14, GY - 2, { n: 5, color: '#8a6f84', speed: 90, life: 0.4, size: 5, add: false, ang: -Math.PI / 2, spread: 1.2 });
    }
    function startDash(f, p) {
      f.dd = Math.abs(p.x) > 0.3 ? Math.sign(p.x) : -f.facing;
      f.state = 'dash'; f.st = 0; f.dashCd = DASH_CD; f.vx = f.dd * DASH_V;
      S.dash(f.x); FX.burst(f.x, GY - 4, { n: 9, color: ['#8a6f84', '#c9a0a8'], speed: 150, life: 0.45, size: 6, add: false, ang: f.dd > 0 ? Math.PI : 0, spread: 0.7 });
    }
    function startFall(f) {
      if (!alive(f)) return;
      f.state = 'fall'; f.vy = -160; f.vr = (f.x < 640 ? -1 : 1) * f.facing * 5; f.st = 0;
      S.fall(); E.buzz(f.i, 160);
      if (st.phase === 'fight') { st.phase = 'ko'; st.pt = 1.25; FX.banner('RING OUT!', { size: 76, life: 0.9, color: '#fff', y: 250 }); }
    }
    function kill(o, by) {
      if (!alive(o)) return;
      o.state = 'dead'; o.st = 0; o.vx = by.facing * 280; o.inv = 0;
      const y = GY + SC * TY[by.lh];
      st.slashes.push({ x: o.x, y: GY - 80, ang: by.facing * rand(-0.75, -0.35), life: 0.32, max: 0.32, col: COL[by.i] });
      FX.burst(o.x, y, { n: 26, color: [COL[o.i], COLL[o.i], '#fff'], speed: [120, 620], life: 0.7, size: 5, ang: by.facing > 0 ? 0 : Math.PI, spread: 1.0 });
      FX.burst(o.x, y, { n: 14, color: '#fff', speed: [300, 900], life: 0.3, size: 2.5 });
      FX.ring(o.x, y, { r1: 170, color: COL[by.i], w: 8, life: 0.45 });
      E.freeze(0.12); E.slow(0.2, 0.85); E.flash('#fff', 0.5); E.shake(17);
      E.buzz(o.i, 240); E.buzz(by.i, 70);
      S.hit(o.x); noise({ d: 0.28, v: 0.32, f: 7000, f2: 900, ft: 'highpass', pan: panX(o.x) }); tone({ f: 95, f2: 38, d: 0.55, v: 0.45, type: 'sine' });
      if (st.phase === 'fight') { st.phase = 'ko'; st.pt = 1.15; }
    }
    function sparks(x, y, big) {
      FX.burst(x, y, { n: big ? 34 : 20, color: ['#fff', GOLD, '#FFD23F'], speed: [140, big ? 720 : 520], life: 0.4, size: 3.2 });
      FX.ring(x, y, { r1: big ? 130 : 80, color: GOLD, w: 5, life: 0.3 });
      S.clang(x); E.shake(big ? 11 : 7); E.freeze(big ? 0.09 : 0.06); E.buzz(-1, big ? 70 : 40);
    }
    function clang(f, o) {          // o parried f's thrust
      const x = (f.x + f.facing * SC * 80 + o.x) / 2, y = GY + SC * TY[f.lh];
      f.state = 'stagger'; f.st = STAG; f.vx = -f.facing * 350; o.vx = f.facing * 200;
      sparks(x, y, false); FX.text(x, y - 46, 'CLANG!', { color: GOLD, size: 30, life: 0.6 });
    }
    function clash(a, b) {          // two thrusts at the same height meet
      const x = (a.x + b.x) / 2, y = GY + SC * TY[a.lh];
      for (const f of [a, b]) { f.state = 'stagger'; f.st = STAG; f.vx = -f.facing * 380; f.hit = true; }
      sparks(x, y, true); FX.text(x, y - 50, 'CLASH!', { color: '#fff', size: 38, life: 0.7 });
    }
    function canHit(f, o) {
      if (f.state !== 'lunge' || f.st < WIND || f.hit || !alive(o)) return false;
      if (o.state === 'dash' || o.inv > 0) return false;
      const dx = (o.x - f.x) * f.facing; return dx > 0 && dx < REACH;
    }
    function strike(f, o) {
      f.hit = true;
      const blocks = (o.state === 'idle' || o.state === 'stagger') && o.guard === f.lh && (f.x - o.x) * o.facing > 0;
      if (blocks) clang(f, o); else kill(o, f);
    }
    function resolveHits() {
      const a = F[0], b = F[1]; if (!alive(a) || !alive(b)) return;
      const ha = canHit(a, b), hb = canHit(b, a);
      if (ha && hb) {
        if (a.lh === b.lh) clash(a, b);
        else { kill(b, a); kill(a, b); FX.banner('DOUBLE KO!', { size: 84, life: 1, color: '#fff', y: 250 }); }
      } else if (ha) strike(a, b); else if (hb) strike(b, a);
    }
    function resolve() {
      const up = F.filter(alive); let out;
      if (up.length === 1) {
        const w = up[0].i; st.score[w]++; st.pop = w; st.popT = 0.6; S.point();
        if (st.score[w] >= WIN) {
          st.phase = 'over'; FX.confetti(up[0].x, GY - 160, 90); FX.confetti(W / 2, 120, 60);
          E.endMatch({ winner: w, title: P[w].name + ' WINS!', sub: st.score.join(' – ') });
          return;
        }
        out = F[0] === up[0] ? 1 : 0;           // winner stays on, loser swaps out
      } else {                                  // nobody left standing: no point, whoever has been on longer swaps out
        S.back();
        const a = st.seat[0], b = st.seat[1];
        out = st.since[a] !== st.since[b] ? (st.since[a] < st.since[b] ? 0 : 1) : st.score[a] !== st.score[b] ? (st.score[a] > st.score[b] ? 0 : 1) : (Math.random() < 0.5 ? 0 : 1);
      }
      const inP = st.wait; st.wait = st.seat[out]; st.seat[out] = inP; st.since[inP] = st.round + 1;
      newRound(out);
    }
    function updScarf(f) {
      const dt = 1 / 60, s = f.scarf; s[0].x = f.ax - f.facing * 5; s[0].y = f.ay + 2;
      for (let k = 1; k < s.length; k++) {
        const q = s[k], pr = s[k - 1];
        q.x += (-26 + Math.sin(E.t * 4 + k * 0.9 + f.i) * 22) * dt; q.y += (34 + Math.cos(E.t * 5 + k) * 16) * dt;
        const dx = q.x - pr.x, dy = q.y - pr.y, d = Math.hypot(dx, dy);
        if (d > 8.5) { q.x = pr.x + dx / d * 8.5; q.y = pr.y + dy / d * 8.5; }
      }
    }
    function updWaiter(f, p, dt) {    // the player on the ledge: A throws confetti
      f.cheerCd -= dt; f.hop = Math.max(0, f.hop - dt * 2.6);
      if (p.ap && f.cheerCd <= 0) {
        f.cheerCd = 0.4; f.hop = 1;
        FX.confetti(LEDGE_X + 24, LEDGE_Y - 175, 12, { speed: [140, 430], life: 1.2, size: 6, ang: -1.0, spread: 0.7, color: [COL[f.i], COLL[f.i], '#fff', GOLD] });
        tone({ f: 740, f2: 1150, d: 0.09, v: 0.07, type: 'triangle', pan: panX(LEDGE_X) });
      }
      f.state = 'wait'; f.facing = 1; f.vx = 0; f.x = LEDGE_X; f.y = LEDGE_Y - Math.sin(f.hop * Math.PI) * 16;
      updScarf(f);
    }

    function updF(f, p, o, dt, act) {
      f.dashCd -= dt; f.buf -= dt; f.inv -= dt;
      const grounded = f.state !== 'fall' && f.state !== 'dead' && f.state !== 'enter';
      if (act && p.ap) f.buf = 0.13;
      if (f.state === 'idle' || f.state === 'stagger') f.guard = p.y < -0.5 ? 0 : p.y > 0.5 ? 2 : 1;
      f.gv += (f.guard - f.gv) * (1 - Math.exp(-30 * dt));
      if (f.state === 'idle') {
        if (alive(o)) f.facing = o.x >= f.x ? 1 : -1;
        let tv = 0;
        if (act && Math.abs(p.x) > 0.25) tv = p.x * (Math.sign(p.x) === f.facing ? 255 : 215);
        f.vx += (tv - f.vx) * (1 - Math.exp(-18 * dt));
        const w0 = Math.floor(f.walk * 2); f.walk += Math.abs(f.vx) * dt / 74;
        if (Math.floor(f.walk * 2) !== w0 && Math.abs(f.vx) > 80) {
          FX.burst(f.x, GY - 2, { n: 2, color: '#8a6f84', speed: 50, life: 0.35, size: 4, add: false, ang: -Math.PI / 2, spread: 1 });
          noise({ d: 0.03, v: 0.035, f: 600, pan: panX(f.x) });
        }
        if (act && p.bp && f.dashCd <= 0) startDash(f, p);
        else if (act && f.buf > 0) startLunge(f);
      } else if (f.state === 'lunge') {
        f.st += dt;
        f.vx = f.st < WIND ? -f.facing * 40 : f.facing * LSPD;
        if (f.st >= WIND + ACT) { f.state = 'recover'; f.st = 0; }
      } else if (f.state === 'recover') {
        f.st += dt; f.vx *= Math.exp(-14 * dt);
        if (f.st >= REC) { f.state = 'idle'; }
      } else if (f.state === 'stagger') {
        f.st -= dt; f.vx *= Math.exp(-7 * dt);
        if (f.st <= 0) f.state = 'idle';
      } else if (f.state === 'dash') {
        f.st += dt; f.vx = f.dd * DASH_V;
        if (Math.random() < 0.7) FX.burst(f.x, GY - rand(20, 110), { n: 1, color: COL[f.i], speed: 30, life: 0.25, size: 3 });
        if (f.st >= DASH_T) { f.state = 'idle'; f.vx *= 0.25; f.inv = 0.05; }
      } else if (f.state === 'dead') {
        f.st += dt; f.vx *= Math.exp(-5 * dt);
        if (f.x < st.x0 - 4 || f.x > st.x1 + 4 || f.y > GY) { f.vy += 1900 * dt; f.y = Math.min(H + 300, f.y + f.vy * dt); }
      } else if (f.state === 'fall') {
        f.st += dt; f.vy += 1900 * dt; f.y = Math.min(H + 300, f.y + f.vy * dt); f.rot += f.vr * dt; f.vx *= Math.exp(-1.5 * dt);
      } else if (f.state === 'enter') {          // newcomer leaps from the ledge to their mark
        f.st += dt; const k = Math.min(1, f.st / f.ed), e = ease.inOut(k);
        f.vx = 0; f.facing = 1; f.x = lerp(LEDGE_X, f.ex, e); f.y = lerp(LEDGE_Y, GY, e) - Math.sin(k * Math.PI) * f.eh;
        if (Math.random() < 0.6) FX.burst(f.x, f.y - rand(20, 110), { n: 1, color: COL[f.i], speed: 30, life: 0.3, size: 3 });
        if (k >= 1) {
          f.state = 'idle'; f.y = GY; S.thud(f.x); E.shake(5);
          FX.burst(f.x, GY - 3, { n: 12, color: ['#8a6f84', '#c9a0a8'], speed: 170, life: 0.45, size: 6, add: false, ang: -Math.PI / 2, spread: 1.4 });
        }
      }
      f.x += f.vx * dt;
      if (grounded && f.state !== 'dash' && (f.x < st.x0 - 6 || f.x > st.x1 + 6)) startFall(f);
      updScarf(f);
    }

    function update(dt) {
      st.popT = Math.max(0, st.popT - dt);
      if (st.phase === 'ready') {
        st.pt -= dt;
        if (st.pt <= 0) { st.phase = 'fight'; FX.banner('FIGHT!', { size: 88, life: 0.5, color: '#fff', y: 250 }); S.go(); }
      }
      const act = st.phase !== 'ready';
      updF(F[0], P[F[0].i], F[1], dt, act); updF(F[1], P[F[1].i], F[0], dt, act);
      updWaiter(FT[st.wait], P[st.wait], dt);
      // bodies do not overlap (dashes pass through)
      const a = F[0], b = F[1];
      if (alive(a) && alive(b) && a.state !== 'dash' && b.state !== 'dash' && a.state !== 'enter' && b.state !== 'enter') {
        const d = b.x - a.x, ad = Math.abs(d);
        if (ad < 54) { const s = (d >= 0 ? 1 : -1) * (54 - ad) / 2; a.x -= s; b.x += s; }
      }
      if (st.phase === 'fight' || st.phase === 'ko') resolveHits();
      if (st.phase === 'fight') {
        st.rt += dt;
        if (st.rt > CRUMBLE_AT && st.x1 - st.x0 > MIN_W) {
          if (!st.warned) { st.warned = true; FX.banner('THE BRIDGE CRUMBLES', { size: 54, life: 1.2, color: GOLD, y: 250 }); }
          st.x0 += 48 * dt; st.x1 -= 48 * dt; E.shake(2.2);
          for (const x of [st.x0, st.x1]) if (Math.random() < 0.5) FX.burst(x, GY + rand(0, 40), { n: 1, color: ['#2a1b38', '#3d2850'], speed: 90, life: 0.9, size: 7, grav: 1100, drag: 0.5, sq: true, add: false, ang: Math.PI / 2, spread: 0.9 });
          st.rumT -= dt; if (st.rumT <= 0) { st.rumT = 0.22; noise({ d: 0.25, v: 0.12, f: 160, f2: 70 }); }
        }
      }
      if (st.phase === 'ko') { st.pt -= dt; if (st.pt <= 0) resolve(); }
      st.bars += ((st.phase === 'ko' ? 1 : 0) - st.bars) * (1 - Math.exp(-12 * Math.max(dt, 0.004)));
      for (let i = st.slashes.length - 1; i >= 0; i--) { st.slashes[i].life -= Math.max(dt, 0.004); if (st.slashes[i].life <= 0) st.slashes.splice(i, 1); }
      for (const p of petals) {
        p.x += (p.vx + Math.sin(E.t * 1.3 + p.ph) * 26) * dt; p.y += p.vy * dt;
        if (p.x < -10) p.x = W + 10; if (p.y > GY + 90) { p.y = -10; p.x = rand(W); }
      }
      FX.update(dt);
    }

    function drawStage(g) {
      const x0 = st.x0, x1 = st.x1;
      g.fillStyle = '#0d0816';
      for (let x = 230; x <= 1060; x += 164) if (x > x0 + 24 && x < x1 - 24) {
        g.beginPath(); g.moveTo(x - 30, GY + 40); g.quadraticCurveTo(x - 16, GY + 56, x - 16, GY + 90); g.lineTo(x - 20, H); g.lineTo(x + 20, H); g.lineTo(x + 16, GY + 90); g.quadraticCurveTo(x + 16, GY + 56, x + 30, GY + 40); g.closePath(); g.fill();
      }
      g.fillStyle = INK; g.beginPath();
      g.moveTo(x0, GY); g.lineTo(x1, GY); g.lineTo(x1 - 15, GY + 17); g.lineTo(x1 - 5, GY + 33); g.lineTo(x1 - 28, GY + 48);
      g.lineTo(x0 + 28, GY + 48); g.lineTo(x0 + 5, GY + 33); g.lineTo(x0 + 15, GY + 17); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,175,105,0.8)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, GY); g.lineTo(x1, GY); g.stroke();
      g.strokeStyle = 'rgba(255,175,105,0.13)'; g.lineWidth = 2; g.beginPath();
      for (let x = 170; x < 1120; x += 40) if (x > x0 + 6 && x < x1 - 6) { g.moveTo(x, GY + 4); g.lineTo(x, GY + 14); }
      g.stroke();
      // the ledge where the third player waits
      g.fillStyle = INK; g.beginPath(); g.moveTo(0, LEDGE_Y); g.lineTo(116, LEDGE_Y); g.lineTo(127, LEDGE_Y + 9); g.lineTo(104, LEDGE_Y + 24); g.lineTo(70, LEDGE_Y + 32); g.lineTo(38, LEDGE_Y + 56); g.lineTo(0, LEDGE_Y + 84); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,175,105,0.8)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, LEDGE_Y); g.lineTo(116, LEDGE_Y); g.stroke();
      // lantern posts mark the edges
      for (const s of [-1, 1]) {
        const x = s < 0 ? x0 + 16 : x1 - 16, fl = 0.8 + 0.2 * Math.sin(E.t * 9 + s);
        g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, GY); g.lineTo(x, GY - 84); g.lineTo(x + s * 16, GY - 84); g.stroke();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * fl; g.fillStyle = '#ffb561'; g.beginPath(); g.arc(x + s * 16, GY - 68, 34, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = '#ffcf8a'; rr(x + s * 16 - 8, GY - 80, 16, 22, 4); g.fill();
        g.fillStyle = INK; g.fillRect(x + s * 16 - 9, GY - 82, 18, 4); g.fillRect(x + s * 16 - 9, GY - 60, 18, 4);
      }
    }

    function draw(g) {
      const mid = clamp((F[0].x + F[1].x) / 2 - 640, -500, 500);
      g.drawImage(sky, 0, 0);
      g.drawImage(far, -80 - mid * 0.04, 0); g.drawImage(near, -80 - mid * 0.09, 0);
      for (const p of petals) { g.globalAlpha = 0.6; g.fillStyle = p.c; g.beginPath(); g.ellipse(p.x, p.y, p.s, p.s * 0.55, p.ph + E.t, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      if (st.bars > 0.01) { g.fillStyle = 'rgba(190,20,50,' + (0.2 * st.bars) + ')'; g.fillRect(0, 0, W, H); }
      drawStage(g);
      // scarves
      for (const f of FT) {
        g.strokeStyle = COL[f.i]; g.lineCap = 'round';
        for (let k = 1; k < f.scarf.length; k++) { g.lineWidth = 7.5 - k * 0.7; g.beginPath(); g.moveTo(f.scarf[k - 1].x, f.scarf[k - 1].y); g.lineTo(f.scarf[k].x, f.scarf[k].y); g.stroke(); }
      }
      for (const f of [FT[st.wait], F[0], F[1]]) {
        if (f.y > H + 200) continue;
        if (f.state === 'dash') for (let k = 3; k >= 1; k--) drawFighter(g, f, 0.16 * (4 - k) / 3 + 0.05, -f.dd * k * 26);
        if (f.state === 'lunge' && f.st >= WIND) for (let k = 2; k >= 1; k--) drawFighter(g, f, 0.14, -f.facing * k * 22);
        drawFighter(g, f, 1, 0);
        // thrust streak
        if (f.state === 'lunge' && f.st >= WIND) {
          const tx = f.x + f.facing * SC * 110, ty = f.y + SC * TY[f.lh], bx = tx - f.facing * 210;
          const gr = g.createLinearGradient(tx, 0, bx, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, COL[f.i]); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.globalCompositeOperation = 'lighter'; g.strokeStyle = gr; g.lineWidth = 7; g.lineCap = 'round';
          g.beginPath(); g.moveTo(tx, ty); g.lineTo(bx, ty); g.stroke(); g.globalCompositeOperation = 'source-over';
        }
        // dash cooldown
        if (f.dashCd > 0 && alive(f)) {
          const k = 1 - f.dashCd / DASH_CD;
          g.fillStyle = 'rgba(0,0,0,0.45)'; rr(f.x - 22, GY + 12, 44, 6, 3); g.fill();
          g.fillStyle = '#FFD23F'; rr(f.x - 22, GY + 12, 44 * k, 6, 3); g.fill();
        }
      }
      // kill slashes
      for (const s of st.slashes) {
        const k = 1 - s.life / s.max, len = 560 * ease.out(Math.min(1, k * 3.5)), th = 18 * (1 - k);
        g.save(); g.translate(s.x, s.y); g.rotate(s.ang); g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (1 - k) * 0.6; g.fillStyle = s.col;
        g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -th * 2.2, len / 2, 0); g.quadraticCurveTo(0, th * 2.2, -len / 2, 0); g.fill();
        g.globalAlpha = 1 - k; g.fillStyle = '#fff';
        g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -th, len / 2, 0); g.quadraticCurveTo(0, th, -len / 2, 0); g.fill();
        g.restore();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      FX.draw(g);
      if (st.bars > 0.01) { g.fillStyle = '#05030a'; g.fillRect(0, 0, W, 46 * st.bars); g.fillRect(0, H - 46 * st.bars, W, 46 * st.bars); }
      // "next up" tag over the waiting player
      {
        const wi = st.wait, wf = FT[wi], y = wf.y - 222 + Math.sin(E.rt * 4) * 3;
        rr(LEDGE_X - 52, y - 15, 104, 30, 15); g.fillStyle = COL[wi]; g.fill();
        txt('NEXT UP', LEDGE_X, y + 1, 17, '#0a0612');
        g.fillStyle = COL[wi]; g.beginPath(); g.moveTo(LEDGE_X - 8, y + 14); g.lineTo(LEDGE_X + 8, y + 14); g.lineTo(LEDGE_X, y + 24); g.closePath(); g.fill();
      }
      // HUD: three names with score pips; the waiting player is dimmed
      for (let i = 0; i < NP; i++) {
        const al = i === 0 ? 'left' : i === 1 ? 'center' : 'right', x = i === 0 ? 44 : i === 1 ? W / 2 : W - 44, waiting = i === st.wait;
        g.globalAlpha = waiting ? 0.55 : 1;
        txt(P[i].name, x, 40, 28, COL[i], { align: al, stroke: '#0a0612' });
        for (let k = 0; k < WIN; k++) {
          const on = k < st.score[i], last = on && k === st.score[i] - 1 && st.pop === i && st.popT > 0;
          const r = 9 * (last ? 1 + ease.out(st.popT / 0.6) * 1.2 : 1);
          const px = i === 0 ? x + 10 + k * 27 : i === 1 ? x + (k - (WIN - 1) / 2) * 27 : x - 10 - k * 27;
          g.beginPath(); g.arc(px, 76, r, 0, TAU);
          g.fillStyle = on ? COL[i] : 'rgba(10,6,18,0.45)'; g.fill();
          g.lineWidth = 2; g.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.35)'; g.stroke();
        }
        g.globalAlpha = 1;
        const tx = i === 0 ? x + 2 : i === 1 ? x : x - 2;
        txt(waiting ? 'WAITING — NEXT UP' : 'DUELLING', tx, 102, 13, waiting ? 'rgba(255,255,255,0.6)' : GOLD, { align: al, stroke: 'rgba(10,6,18,0.6)' });
      }
      const mp = st.seat.some(p => st.score[p] === WIN - 1) && st.phase !== 'over';
      if (mp) { g.globalAlpha = 0.65 + 0.35 * Math.sin(E.rt * 7); txt('MATCH POINT', W / 2, 132, 22, GOLD, { stroke: '#0a0612' }); g.globalAlpha = 1; }
      else txt('WINNER STAYS ON  ·  FIRST TO ' + WIN, W / 2, 130, 15, 'rgba(255,255,255,0.7)', { stroke: 'rgba(10,6,18,0.6)' });
      FX.drawText(g);
    }

    newRound(-1);
    return { update, draw };
  }

  GAMES.push({
    id: 'blade', name: 'BLADE DASH', tag: 'VERSUS', color: '#FF9E58',
    tagline: 'One hit ends it. Winner stays on.',
    pad: [{ a: 'LUNGE', b: 'DASH', stick: 'WALK · GUARD' }, { a: 'LUNGE', b: 'DASH', stick: 'WALK · GUARD' }, { a: 'CHEER', b: 'WAIT', stick: 'NEXT UP' }],
    how: {
      goal: 'Winner stays on, loser swaps out — first to ' + WIN,
      rows: [['STICK', 'Walk left / right — push up or down to guard HIGH or LOW'], ['A', 'Lunge at the height you are guarding'], ['B', 'Dash (untouchable for a moment) — back, or toward the stick']],
      tips: ['Two duel, one waits on the ledge. Lose the round and you swap out.', 'Match their blade height to parry — CLANG! Waiting? Press A to cheer.'],
    },
    song: { bpm: 96, root: 50, minor: true, prog: [0, 0, 5, 4], kick: 'x-----x---x-----', snare: '--------x-----x-', hat: '--x---x---x---x-', bass: 'x-----x---x--o--', arp: '0---2---1---3-2-', arpWave: 'triangle', bassWave: 'sine' },
    icon(g, t) {
      g.fillStyle = '#ffc98a'; g.beginPath(); g.arc(0, 8, 40, Math.PI, TAU); g.fill();
      g.fillStyle = INK; g.fillRect(-120, 44, 240, 10);
      const k = (Math.sin(t * 2.4) + 1) / 2, d = ease.inOut(k) * 12;
      {   // the third duellist waits at the side
        const f = { i: 2, x: -108 / 0.4, y: 44 / 0.4, vx: 0, facing: 1, guard: 1, gv: 1, state: 'wait', st: 0, lh: 1, walk: 0, dd: 0, rot: 0, pips: false, hop: Math.max(0, Math.sin(t * 3)) * 0.5 };
        g.save(); g.scale(0.4, 0.4); drawFighter(g, f, 1, 0); g.restore();
      }
      for (let i = 0; i < 2; i++) {
        const f = { i, x: (10 + (i ? 1 : -1) * (64 - d)) / 0.54, y: 44 / 0.54, vx: 0, facing: i ? -1 : 1, guard: 1, gv: i ? 1 + Math.sin(t * 1.7) : 1 - Math.sin(t * 2.3), state: 'idle', st: 0, lh: 1, walk: 0, dd: 0, rot: 0, pips: false };
        g.save(); g.scale(0.54, 0.54); drawFighter(g, f, 1, 0); g.restore();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      const s = 5 + 5 * Math.abs(Math.sin(t * 6));
      g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath();
      for (let a = 0; a < 4; a++) { const an = a * Math.PI / 4 + t; g.moveTo(10 - Math.cos(an) * s, -6 - Math.sin(an) * s); g.lineTo(10 + Math.cos(an) * s, -6 + Math.sin(an) * s); }
      g.stroke();
    },
    create,
  });
})();
