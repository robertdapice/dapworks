'use strict';
// HORDE NIGHT — co-op survivor rogue-lite. Heroes auto-attack; you move, roll and
// shockwave. Level up together, each pick a card, die, spend gold at camp, go again.
(function () {
  const MAXL = 5, HR = 18, TOP = 84, BOT = H - 80;
  // Permanent camp upgrades (bought with gold, kept between runs).
  const UP = [
    { id: 'vit', name: 'VITALITY', desc: '+20 max health for every hero, per level', costs: [30, 60, 110, 180, 280] },
    { id: 'pow', name: 'POWER', desc: '+12% damage from everything, per level', costs: [40, 80, 140, 220, 320] },
    { id: 'swift', name: 'SWIFTNESS', desc: '+6% move speed, per level', costs: [30, 70, 130, 210] },
    { id: 'mag', name: 'MAGNET', desc: '+30% pickup range for gems and gold, per level', costs: [25, 55, 100, 170] },
    { id: 'greed', name: 'GREED', desc: '+20% gold from every source, per level', costs: [50, 100, 180, 280] },
    { id: 'medic', name: 'FIELD MEDIC', desc: 'Revive friends 25% faster and with more health', costs: [40, 90, 160] },
    { id: 'head', name: 'HEAD START', desc: 'Everyone picks a free card as the run begins', costs: [80, 180, 320] },
    { id: 'reroll', name: 'REROLLS', desc: '+1 card reroll each per run (press B while picking)', costs: [45, 100, 180] },
    { id: 'wblades', name: 'MOON BLADES', desc: 'Unlock: every hero starts with orbiting blades', costs: [150] },
    { id: 'wchain', name: 'STORM ROD', desc: 'Unlock: every hero starts with chain lightning', costs: [250] },
  ];
  const WEAP = {
    bolt: { name: 'MOONBOLT', col: '#BFE3FF', what: 'Auto-fires at the nearest monster', up: 'More bolts, more damage' },
    blades: { name: 'MOON BLADES', col: '#E6E9FF', what: 'Blades orbit you and slice', up: '+1 blade, more damage' },
    chain: { name: 'STORM ROD', col: '#FFE66D', what: 'Lightning that jumps between monsters', up: '+1 jump, more damage' },
    boom: { name: 'BOOMERANG', col: '#FFA94D', what: 'Flies out and back, cutting through all', up: 'Stronger, faster, later a second one' },
    flame: { name: 'EMBER BOOTS', col: '#FF7A45', what: 'Leave a burning trail as you run', up: 'Hotter, longer trail' },
    frost: { name: 'FROST NOVA', col: '#9BE8FF', what: 'Icy pulse that hurts and slows', up: 'Bigger, stronger, more often' },
    turret: { name: 'SPROUT TURRET', col: '#C9F27A', what: 'Plants a little turret that shoots', up: 'Stronger, later more turrets' },
  };
  const PASS = {
    maxhp: { name: 'TOUGH HIDE', col: '#FF8FA3', what: '+25 max health, and heal 25' },
    speed: { name: 'QUICK FEET', col: '#A5E8B0', what: '+8% move speed' },
    magnet: { name: 'LODESTONE', col: '#74C0FC', what: '+35% pickup range' },
    haste: { name: 'HASTE', col: '#E599F7', what: 'Everything recharges 8% faster' },
    crit: { name: 'KEEN EYE', col: '#FFD43B', what: '+8% chance of double damage' },
    regen: { name: 'MOSS HEART', col: '#B2F2BB', what: 'Slowly regain health' },
  };
  const ET = {
    sham: { r: 16, hp: 18, spd: 52, dmg: 8, xp: 1, col: '#7FA58A' },
    swarm: { r: 11, hp: 7, spd: 118, dmg: 5, xp: 1, col: '#A77BFF' },
    charger: { r: 19, hp: 42, spd: 62, dmg: 14, xp: 3, col: '#E08A4A' },
    spit: { r: 16, hp: 30, spd: 58, dmg: 6, xp: 3, col: '#4FD1C5' },
    brute: { r: 30, hp: 170, spd: 40, dmg: 20, xp: 8, col: '#C2506A' },
    elite: { r: 38, hp: 420, spd: 58, dmg: 18, xp: 20, col: '#8E5BD9' },
    boss: { r: 70, hp: 1500, spd: 44, dmg: 26, xp: 60, col: '#FF4D6D' },
  };
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function drawHero(g, x, y, i, o) {
    o = o || {};
    const fa = o.face || 0, lx = Math.cos(fa) * 3, ly = Math.sin(fa) * 2;
    g.save(); g.translate(x, y); g.scale(1.4, 1.4);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 13, 15, 6, 0, 0, TAU); g.fill();
    if (o.ring) { g.strokeStyle = COL[i]; g.globalAlpha = 0.75; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 13, 19, 8, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    if (o.down) {
      g.fillStyle = '#5b6377'; g.beginPath(); g.ellipse(0, 6, 18, 9, 0, 0, TAU); g.fill();
      g.fillStyle = COLD[i]; g.beginPath(); g.ellipse(-3, 4, 12, 7, 0, 0, TAU); g.fill();
      g.strokeStyle = '#0a0d18'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 0); g.lineTo(10, 4); g.moveTo(10, 0); g.lineTo(6, 4); g.stroke();
      g.restore(); return;
    }
    if (o.roll) { g.rotate(o.roll * 14); g.scale(1.15, 0.8); }
    g.fillStyle = COLD[i]; g.beginPath(); g.moveTo(-15, 12); g.quadraticCurveTo(-17, -8, 0, -17); g.quadraticCurveTo(17, -8, 15, 12); g.closePath(); g.fill();
    g.fillStyle = o.flash ? '#fff' : COL[i]; g.beginPath(); g.moveTo(-12, 11); g.quadraticCurveTo(-14, -6, 0, -14); g.quadraticCurveTo(14, -6, 12, 11); g.closePath(); g.fill();
    g.fillStyle = '#1a1f33'; g.beginPath(); g.ellipse(lx * 0.6, -3 + ly * 0.5, 8, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-4 + lx, -5 + ly, 3, 4); g.fillRect(2 + lx, -5 + ly, 3, 4);
    g.restore();
  }
  function drawMonster(g, e, t) {
    const T = ET[e.type], r = e.r, x = e.x, y = e.y;
    g.fillStyle = e.flash > 0 ? '#fff' : (e.slowT > 0 ? '#9BD8F0' : T.col);
    g.beginPath();
    if (e.type === 'swarm') {
      const f = Math.sin(t * 22 + e.seed) * 5;
      g.moveTo(x - r - 6, y - f); g.lineTo(x, y + 3); g.lineTo(x + r + 6, y - f); g.lineTo(x + 3, y - 5); g.lineTo(x - 3, y - 5); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, y, r * 0.7, 0, TAU);
    } else if (e.type === 'charger') {
      const a = Math.atan2(e.dy, e.dx), c = Math.cos(a), s = Math.sin(a);
      g.moveTo(x + c * (r + 7), y + s * (r + 7)); g.lineTo(x - c * r - s * r, y - s * r + c * r); g.lineTo(x - c * r + s * r, y - s * r - c * r); g.closePath();
    } else if (e.type === 'brute' || e.type === 'elite' || e.type === 'boss') {
      const n = e.type === 'boss' ? 14 : 9;
      for (let k = 0; k < n * 2; k++) { const a = k / (n * 2) * TAU + (e.type === 'boss' ? t * 0.5 : e.seed), rr2 = k % 2 ? r : r * 0.84; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
      g.closePath();
    } else if (e.type === 'spit') {
      g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(x, y + 4, 4, 0, TAU);
    } else {
      const w = Math.sin(t * 6 + e.seed) * 1.5;
      g.ellipse(x, y, r + w, r - w, 0, 0, TAU);
    }
    g.fill();
    g.fillStyle = e.type === 'boss' || e.type === 'elite' ? '#FFD23F' : '#FFF3B0';
    const es = Math.max(2, r * 0.2), ex = r * 0.36;
    g.fillRect(x - ex - es / 2, y - r * 0.25, es, es); g.fillRect(x + ex - es / 2, y - r * 0.25, es, es);
    if (e.type === 'elite') { g.strokeStyle = '#FFD23F'; g.lineWidth = 3; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8); g.beginPath(); g.arc(x, y, r + 6, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    if (e.type === 'charger' && e.mode === 1) { g.strokeStyle = '#FF5D73'; g.lineWidth = 3; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + e.dx * 150, y + e.dy * 150); g.stroke(); g.globalAlpha = 1; }
    if (e.type === 'boss') { g.fillStyle = '#FFD23F'; g.beginPath(); g.moveTo(x - 24, y - r + 6); g.lineTo(x - 26, y - r - 16); g.lineTo(x - 12, y - r - 4); g.lineTo(x, y - r - 20); g.lineTo(x + 12, y - r - 4); g.lineTo(x + 26, y - r - 16); g.lineTo(x + 24, y - r + 6); g.closePath(); g.fill(); }
  }
  function mkRunBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const b = c.getContext('2d');
    const gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#10202e'); gr.addColorStop(1, '#16302c'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
    const moon = b.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 620); moon.addColorStop(0, 'rgba(160,200,255,0.16)'); moon.addColorStop(1, 'rgba(160,200,255,0)'); b.fillStyle = moon; b.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { const x = rand(W), y = rand(H); b.strokeStyle = pick(['#1f4038', '#24493d', '#1a3832', '#2c5646']); b.lineWidth = 2; b.beginPath(); b.moveTo(x, y); b.lineTo(x + rand(-3, 3), y - rand(4, 9)); b.stroke(); }
    for (let i = 0; i < 70; i++) { b.fillStyle = pick(['#d9e8ff', '#ffe9a8', '#c9b6ff']); b.globalAlpha = 0.5; b.beginPath(); b.arc(rand(W), rand(H), rand(1.5, 2.6), 0, TAU); b.fill(); }
    b.globalAlpha = 1;
    for (let i = 0; i < 16; i++) {
      const x = rand(40, W - 40), y = pick([rand(96, 150), rand(H - 150, H - 96), rand(120, H - 120)]), s = rand(0.8, 1.3);
      b.fillStyle = 'rgba(0,0,0,0.3)'; b.beginPath(); b.ellipse(x + 3, y + 14 * s, 16 * s, 5 * s, 0, 0, TAU); b.fill();
      b.fillStyle = '#3c4a5e'; b.beginPath(); b.roundRect(x - 11 * s, y - 16 * s, 22 * s, 30 * s, [10 * s, 10 * s, 2, 2]); b.fill();
      b.fillStyle = '#56667d'; b.fillRect(x - 6 * s, y - 6 * s, 12 * s, 2.5); b.fillRect(x - 1.2, y - 11 * s, 2.5, 12 * s);
    }
    const v = b.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 800); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,10,0.6)'); b.fillStyle = v; b.fillRect(0, 0, W, H);
    return c;
  }
  function mkHubBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const b = c.getContext('2d');
    const gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0a0f26'); gr.addColorStop(0.6, '#1c2452'); gr.addColorStop(1, '#2a2756'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
    for (let i = 0; i < 140; i++) { b.fillStyle = '#fff'; b.globalAlpha = rand(0.2, 0.9); b.beginPath(); b.arc(rand(W), rand(H * 0.6), rand(0.6, 1.8), 0, TAU); b.fill(); }
    b.globalAlpha = 1; b.fillStyle = '#f4f1d0'; b.beginPath(); b.arc(530, 96, 40, 0, TAU); b.fill(); b.fillStyle = '#0a0f26'; b.globalAlpha = 0.18; b.beginPath(); b.arc(544, 88, 35, 0, TAU); b.fill(); b.globalAlpha = 1;
    b.fillStyle = '#141a3d'; b.beginPath(); b.moveTo(0, 470); for (let x = 0; x <= W; x += 40) b.lineTo(x, 440 + Math.sin(x * 0.011) * 40 + Math.sin(x * 0.03) * 12); b.lineTo(W, H); b.lineTo(0, H); b.fill();
    b.fillStyle = '#0e1330'; for (let i = 0; i < 16; i++) { const x = i * 36 + rand(-8, 8), h = rand(70, 150), y = 470 + rand(-10, 10); b.beginPath(); b.moveTo(x, y); b.lineTo(x + 22, y - h); b.lineTo(x + 44, y); b.fill(); }
    b.fillStyle = '#1b2a2f'; b.fillRect(0, 520, W, 200);
    const gl = b.createRadialGradient(290, 560, 10, 290, 560, 330); gl.addColorStop(0, 'rgba(255,150,60,0.34)'); gl.addColorStop(1, 'rgba(255,150,60,0)'); b.fillStyle = gl; b.fillRect(0, 300, 700, 420);
    b.fillStyle = '#39507a'; b.beginPath(); b.moveTo(40, 560); b.lineTo(110, 450); b.lineTo(180, 560); b.fill(); b.fillStyle = '#0e1330'; b.beginPath(); b.moveTo(96, 560); b.lineTo(110, 500); b.lineTo(124, 560); b.fill();
    b.fillStyle = '#6b3f55'; b.beginPath(); b.moveTo(400, 548); b.lineTo(462, 452); b.lineTo(524, 548); b.fill(); b.fillStyle = '#0e1330'; b.beginPath(); b.moveTo(450, 548); b.lineTo(462, 496); b.lineTo(474, 548); b.fill();
    b.fillStyle = '#4a2f22'; b.save(); b.translate(290, 566); b.rotate(0.3); b.fillRect(-34, -5, 68, 10); b.rotate(-0.6); b.fillRect(-34, -5, 68, 10); b.restore();
    return c;
  }

  function create() {
    const P = E.players, N = P.length;
    const save = Save.load('horde', { gold: 0, best: 0, runs: 0, bestKills: 0, bestLvl: 0, up: {} });
    save.up = Object.assign({}, save.up || {});
    for (const k of ['gold', 'best', 'runs', 'bestKills', 'bestLvl']) save[k] = +save[k] || 0;
    const lv = id => save.up[id] | 0;
    const bgRun = mkRunBg(), bgHub = mkHubBg();
    let mode = 'hub', mt = 0, cur = UP.length, deny = 0, st = null, sum = null;
    const sndT = {};
    const snd = (k, fn, gap) => { if (E.rt - (sndT[k] === undefined ? -9 : sndT[k]) > (gap || 0.085)) { sndT[k] = E.rt; fn(); } };
    const any = k => { for (const p of P) if (p[k]) return true; return false; };
    const PAD_HUB = { a: 'BUY / GO', b: 'TO START', stick: 'CHOOSE' }, PAD_RUN = { a: 'ROLL', b: 'SHOCKWAVE', stick: 'MOVE' }, PAD_PICK = { a: 'PICK', b: 'REROLL', stick: 'CHOOSE' };
    const pads = cfg => { if (E.setPads) E.setPads(cfg, 'HORDE NIGHT'); };

    // ------------------------------------------------------------ run setup
    function recalc(h) {
      h.maxHp = 100 + 20 * lv('vit') + 25 * (h.p.maxhp | 0);
      h.spd = 215 * (1 + 0.06 * lv('swift')) * (1 + 0.08 * (h.p.speed | 0));
      h.mag = 90 * (1 + 0.3 * lv('mag')) * (1 + 0.35 * (h.p.magnet | 0));
      h.haste = Math.pow(0.92, h.p.haste | 0);
      h.crit = 0.05 + 0.08 * (h.p.crit | 0);
      h.regen = 0.7 * (h.p.regen | 0);
      h.dmg = 1 + 0.12 * lv('pow');
    }
    function newRun() {
      FX.clear();
      st = { t: 0, phase: 'ready', pt: 1.2, heroes: [], en: [], shots: [], eshots: [], drops: [], fires: [], turrets: [], chests: [], nums: [], zaps: [], slams: [],
        xp: 0, lvl: 1, need: 18, pending: lv('head'), gold: 0, banked: 0, kills: 0, acc: 0, nextElite: 60, nextBoss: 180, nextPay: 30, bossN: 0, eid: 1,
        picks: null, pickLock: 0, pickT: 0, doneT: 0, pickTitle: '', overT: 0, frame: 0 };
      for (let i = 0; i < N; i++) {
        const h = { i, x: W / 2 + (i - (N - 1) / 2) * 90, y: H / 2 + 10, vx: 0, vy: 0, hp: 1, maxHp: 1, down: false, rev: 0, rollT: 0, rollCd: 0, rdx: 1, rdy: 0, inv: 1.5, waveCd: 4, face: 0, hurt: 0,
          w: { bolt: 1 }, p: {}, wt: { bolt: 0.4, chain: 1, boom: 0.8, flame: 0, frost: 1.5, turret: 1 }, rerolls: lv('reroll'), bl: [] };
        if (lv('wblades')) h.w.blades = 1; if (lv('wchain')) h.w.chain = 1;
        recalc(h); h.hp = h.maxHp; st.heroes.push(h);
      }
      save.runs++; mode = 'run'; mt = 0; pads(PAD_RUN);
      FX.banner('SURVIVE!', { color: '#FFD23F', size: 120, life: 1.2, sub: 'run ' + save.runs }); S.go();
    }
    function bank() {
      const d = Math.floor(st.gold) - st.banked;
      if (d > 0) { save.gold += d; st.banked += d; }
    }
    function gain(v, x, y) {
      const gq = v * (1 + 0.2 * lv('greed')); st.gold += gq;
      if (x !== undefined && gq >= 3) FX.text(x, y, '+' + Math.round(gq) + ' gold', { color: '#FFD23F', size: 22 });
    }

    // ------------------------------------------------------------ cards
    function rollCards(h) {
      const pool = [];
      for (const k in WEAP) if ((h.w[k] | 0) < MAXL) pool.push({ kind: 'w', k });
      const nw = pool.length;
      for (const k in PASS) if ((h.p[k] | 0) < MAXL) pool.push({ kind: 'p', k });
      shuffle(pool);
      const out = pool.slice(0, 3);
      if (nw && !out.some(c => c.kind === 'w')) out[0] = pool.find(c => c.kind === 'w');
      while (out.length < 3) out.push({ kind: 'heal', k: 'heal' });
      return out;
    }
    function cardInfo(h, c) {
      if (c.kind === 'w') { const L = h.w[c.k] | 0, T = WEAP[c.k]; return { name: T.name, col: T.col, lvl: L, line: L ? T.up : T.what, tag: L ? 'LEVEL ' + L + '  >  ' + (L + 1) : 'NEW WEAPON' }; }
      if (c.kind === 'p') { const L = h.p[c.k] | 0, T = PASS[c.k]; return { name: T.name, col: T.col, lvl: L, line: T.what, tag: L ? 'LEVEL ' + L + '  >  ' + (L + 1) : 'NEW PERK' }; }
      return { name: 'FIELD RATIONS', col: '#FF8FA3', lvl: 0, line: 'Heal 40% of your health', tag: 'SNACK' };
    }
    function applyCard(h, c) {
      if (c.kind === 'w') h.w[c.k] = (h.w[c.k] | 0) + 1;
      else if (c.kind === 'p') { h.p[c.k] = (h.p[c.k] | 0) + 1; recalc(h); if (c.k === 'maxhp' && !h.down) h.hp = Math.min(h.maxHp, h.hp + 25); }
      else if (!h.down) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.4);
    }
    function startPick(title) {
      st.phase = 'pick'; st.pickTitle = title; st.pickLock = 0.55; st.pickT = 0; st.doneT = 0;
      st.picks = st.heroes.map(h => ({ cards: rollCards(h), sel: 1, done: false }));
      pads(PAD_PICK); S.power(); E.buzz(-1, 70);
    }
    function updPick(dt) {
      const rd = dt > 0 ? dt : 1 / 60;
      st.pickLock -= rd; st.pickT += rd;
      let all = true;
      for (const h of st.heroes) {
        const pk = st.picks[h.i], p = P[h.i];
        if (pk.done) continue;
        if (p.nl) { pk.sel = (pk.sel + 2) % 3; S.ui(); } if (p.nr) { pk.sel = (pk.sel + 1) % 3; S.ui(); }
        if (st.pickLock <= 0 && (p.ap || st.pickT > 25)) { applyCard(h, pk.cards[pk.sel]); pk.done = true; S.ok(); E.buzz(h.i, 40); }
        else if (st.pickLock <= 0 && p.bp && h.rerolls > 0) { h.rerolls--; pk.cards = rollCards(h); pk.sel = 1; S.whoosh(W / 2); }
        if (!pk.done) all = false;
      }
      if (all) {
        st.doneT += rd;
        if (st.doneT > 0.45) {
          st.pending--;
          if (st.pending > 0) startPick(st.pickTitle);
          else { st.phase = 'play'; st.picks = null; pads(PAD_RUN); for (const h of st.heroes) h.inv = Math.max(h.inv, 1); }
        }
      }
    }

    // ------------------------------------------------------------ monsters
    function spawn(type, x, y) {
      const T = ET[type];
      const hm = type === 'boss' ? (0.6 + 0.2 * N) * (1 + st.bossN * 1.4) : (1 + st.t / 60 * 0.55) * (type === 'elite' ? 0.7 + 0.15 * N : 1);
      const e = { id: st.eid++, type, x, y, kx: 0, ky: 0, r: T.r, hp: T.hp * hm, maxHp: T.hp * hm, spd: T.spd * rand(0.9, 1.1) * (1 + Math.min(0.4, st.t / 60 * 0.035)), dmg: T.dmg, flash: 0, slowT: 0, stun: 0,
        cd: rand(1, 2.5), mode: 0, mt: 6, dx: 1, dy: 0, bcd: 0, ccd: 0, tg: 0, tgT: 0, seed: rand(TAU), dead: false };
      st.en.push(e); return e;
    }
    const edge = () => { const s = Math.random() * 4 | 0; return s === 0 ? [rand(W), -30] : s === 1 ? [rand(W), H + 30] : s === 2 ? [-30, rand(TOP, BOT)] : [W + 30, rand(TOP, BOT)]; };
    function spawnRandom() {
      const t = st.t, opts = [['sham', 10]];
      if (t > 30) opts.push(['swarm', 4]); if (t > 60) opts.push(['charger', 3]); if (t > 90) opts.push(['spit', 3]); if (t > 120) opts.push(['brute', t > 300 ? 3 : 1.5]);
      let tot = 0; for (const o of opts) tot += o[1];
      let r = Math.random() * tot, type = 'sham'; for (const o of opts) { r -= o[1]; if (r <= 0) { type = o[0]; break; } }
      const [x, y] = edge();
      if (type === 'swarm') { for (let k = 0; k < 5; k++) spawn('swarm', x + rand(-40, 40), y + rand(-40, 40)); st.acc -= 1.5; }
      else spawn(type, x, y);
    }
    function nearest(x, y, maxD, skip) {
      let best = null, bd = maxD * maxD;
      for (const e of st.en) { if (e.dead || (skip && skip.indexOf(e) >= 0)) continue; const dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = e; } }
      return best;
    }
    function hurt(e, base, h, quiet) {
      if (e.dead) return;
      let d = base * h.dmg; const crit = Math.random() < h.crit; if (crit) d *= 2;
      e.hp -= d; e.flash = 0.09;
      if ((crit || !quiet) && st.nums.length < 70) st.nums.push({ x: e.x + rand(-6, 6), y: e.y - e.r, s: String(Math.round(d)), life: 0.55, crit });
      if (e.hp <= 0) kill(e);
    }
    function kill(e) {
      e.dead = true; st.kills++;
      const T = ET[e.type];
      if (st.drops.length < 320) st.drops.push({ k: 'xp', x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), v: T.xp, t: 0 });
      else st.xp += T.xp;
      if (Math.random() < 0.012) st.drops.push({ k: 'gold', x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-80, 80), v: 1, t: 0 });
      if (Math.random() < 0.008) st.drops.push({ k: 'heart', x: e.x, y: e.y, vx: 0, vy: 0, v: 20, t: 0 });
      if (FX.ps.length < 600) FX.burst(e.x, e.y, { n: e.r > 20 ? 14 : 5, color: [T.col, '#fff'], speed: 180, life: 0.35, size: e.r > 20 ? 6 : 4 });
      snd('pop', () => S.pop(e.x, st.kills % 12), 0.07);
      if (e.type === 'elite') { st.chests.push({ x: e.x, y: e.y, big: false, age: 0 }); FX.ring(e.x, e.y, { r1: 120, color: '#FFD23F', w: 8 }); FX.text(e.x, e.y - 40, 'ELITE DOWN!', { color: '#FFD23F', size: 30 }); E.shake(8); S.boom(e.x, false); }
      if (e.type === 'boss') {
        st.bossN++; st.chests.push({ x: e.x, y: e.y, big: true, age: 0 });
        for (let k = 0; k < 6; k++) st.drops.push({ k: 'gold', x: e.x, y: e.y, vx: rand(-260, 260), vy: rand(-260, 260), v: 3, t: 0 });
        for (let k = 0; k < 20; k++) st.drops.push({ k: 'xp', x: e.x, y: e.y, vx: rand(-300, 300), vy: rand(-300, 300), v: 3, t: 0 });
        FX.burst(e.x, e.y, { n: 80, color: ['#FF4D6D', '#FFD23F', '#fff'], speed: 700, life: 1.1, size: 10 }); FX.confetti(e.x, e.y, 80);
        FX.banner('BOSS DOWN!', { color: '#FFD23F', size: 130, life: 1.6 }); E.slow(0.3, 1.0); E.shake(22); E.flash('#fff', 0.5); S.boom(e.x, true); S.win(); E.buzz(-1, 300);
      }
    }
    function hitHero(h, dmg) {
      if (h.down || h.inv > 0 || h.rollT > 0 || st.phase !== 'play') return;
      h.hp -= dmg; h.inv = 0.55; h.hurt = 0.25;
      E.shake(5); E.buzz(h.i, 60); snd('hurt', () => S.hit(h.x), 0.12);
      FX.burst(h.x, h.y, { n: 8, color: [COL[h.i], '#FF5D73'], speed: 220, life: 0.35, size: 4 });
      if (h.hp <= 0) {
        h.hp = 0; h.down = true; h.rev = 0; h.rollT = 0;
        FX.text(h.x, h.y - 40, P[h.i].name + ' IS DOWN!', { color: COL[h.i], size: 30, life: 1.5 }); FX.ring(h.x, h.y, { r1: 110, color: COL[h.i], w: 8 });
        S.fall(); E.buzz(h.i, 300); E.shake(12);
        if (st.heroes.every(q => q.down)) { st.phase = 'over'; st.overT = 1.9; E.slow(0.3, 1.3); FX.banner('OVERRUN!', { color: '#FF5D73', size: 140, life: 1.8 }); S.lose(); E.buzz(-1, 400); }
        else FX.banner('STAND ON ' + P[h.i].name + ' TO REVIVE', { color: '#fff', size: 44, life: 2.2, y: 150 });
      }
    }
    function shockwave(h) {
      const R = 240; h.waveCd = 14 * h.haste;
      for (const e of st.en) {
        const dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy) || 1; if (d > R + e.r) continue;
        const big = e.type === 'boss'; e.kx += dx / d * (big ? 120 : 560); e.ky += dy / d * (big ? 120 : 560); e.stun = big ? 0.3 : 0.9;
        hurt(e, 55, h);
      }
      st.eshots = st.eshots.filter(s => dist(s.x, s.y, h.x, h.y) > R);
      FX.ring(h.x, h.y, { r0: 20, r1: R, color: '#fff', w: 14, life: 0.4 }); FX.ring(h.x, h.y, { r0: 10, r1: R * 0.8, color: COL[h.i], w: 10, life: 0.55 });
      FX.burst(h.x, h.y, { n: 30, color: [COL[h.i], '#fff'], speed: 520, life: 0.5, size: 6 });
      E.shake(12); S.boom(h.x, false); S.dash(h.x); E.buzz(h.i, 120);
    }

    // ------------------------------------------------------------ weapons
    function weapons(h, dt) {
      const w = h.w, wt = h.wt, hs = h.haste, sh = st.shots;
      let L = w.bolt | 0;
      wt.bolt -= dt;
      if (L && wt.bolt <= 0) {
        const tg = nearest(h.x, h.y, 540);
        if (tg) {
          wt.bolt = 0.62 * Math.pow(0.93, L) * hs; const n = 1 + (L >= 2) + (L >= 5), a0 = Math.atan2(tg.y - h.y, tg.x - h.x);
          for (let k = 0; k < n; k++) { const a = a0 + (k - (n - 1) / 2) * 0.17; sh.push({ k: 'bolt', x: h.x, y: h.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, dmg: 10 + 4 * L, pierce: L >= 4 ? 2 : 0, life: 1.0, r: 6, o: h.i, hit: null }); }
          snd('bolt', () => tone({ f: 880, f2: 420, d: 0.06, v: 0.05, type: 'triangle', pan: panX(h.x) }), 0.1);
        } else wt.bolt = 0.12;
      }
      L = w.blades | 0; h.bl.length = 0;
      if (L) {
        const n = 1 + L, R = 78 + 4 * L, a0 = st.t * 3.3 + h.i * 1.3, dmg = 9 + 3 * L;
        for (let k = 0; k < n; k++) { const a = a0 + k * TAU / n; h.bl.push(h.x + Math.cos(a) * R, h.y + Math.sin(a) * R); }
        for (const e of st.en) {
          if (e.bcd > 0 || e.dead) continue; const dx = e.x - h.x, dy = e.y - h.y, lim = R + e.r + 16; if (dx > lim || dx < -lim || dy > lim || dy < -lim) continue;
          for (let k = 0; k < n; k++) { const bx = h.bl[k * 2] - e.x, by = h.bl[k * 2 + 1] - e.y, rr2 = e.r + 13; if (bx * bx + by * by < rr2 * rr2) { e.bcd = 0.35; e.kx += dx * 1.2; e.ky += dy * 1.2; hurt(e, dmg, h); snd('slice', () => S.tink(e.x), 0.1); break; } }
        }
      }
      L = w.chain | 0; wt.chain -= dt;
      if (L && wt.chain <= 0) {
        let cur2 = nearest(h.x, h.y, 420);
        if (cur2) {
          wt.chain = 2.3 * Math.pow(0.9, L) * hs; const seen = []; let fx = h.x, fy = h.y;
          for (let j = 0; j < 3 + L && cur2; j++) { st.zaps.push({ x1: fx, y1: fy, x2: cur2.x, y2: cur2.y, life: 0.18 }); seen.push(cur2); fx = cur2.x; fy = cur2.y; hurt(cur2, 14 + 6 * L, h); cur2 = nearest(fx, fy, 190, seen); }
          snd('zap', () => S.zap(h.x), 0.12);
        } else wt.chain = 0.2;
      }
      L = w.boom | 0; wt.boom -= dt;
      if (L && wt.boom <= 0) {
        const tg = nearest(h.x, h.y, 620), a0 = tg ? Math.atan2(tg.y - h.y, tg.x - h.x) : h.face, n = 1 + (L >= 3);
        wt.boom = 1.9 * Math.pow(0.92, L) * hs;
        for (let k = 0; k < n; k++) { const a = a0 + (k - (n - 1) / 2) * 0.7; sh.push({ k: 'boom', x: h.x, y: h.y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, dmg: 12 + 5 * L, life: 0, r: 15, o: h.i, ret: false }); }
        snd('boom', () => S.whoosh(h.x), 0.15);
      }
      L = w.flame | 0; wt.flame -= dt;
      if (L && wt.flame <= 0 && Math.hypot(h.vx, h.vy) > 70) {
        wt.flame = 0.15; const life = 1.5 + 0.3 * L;
        st.fires.push({ x: h.x, y: h.y + 6, life, max: life, r: 24 + 3 * L, dps: 16 + 8 * L, o: h.i, tk: rand(0.25) }); if (st.fires.length > 90) st.fires.shift();
      }
      L = w.frost | 0; wt.frost -= dt;
      if (L && wt.frost <= 0) {
        const R = 130 + 16 * L;
        if (nearest(h.x, h.y, R)) {
          wt.frost = 4.2 * Math.pow(0.92, L) * hs;
          for (const e of st.en) { if (dist(e.x, e.y, h.x, h.y) < R + e.r) { e.slowT = 2.2; hurt(e, 10 + 6 * L, h); } }
          FX.ring(h.x, h.y, { r0: 20, r1: R, color: '#9BE8FF', w: 10, life: 0.45 }); FX.burst(h.x, h.y, { n: 16, color: ['#9BE8FF', '#fff'], speed: R * 2.2, life: 0.4, size: 4, drag: 3 });
          snd('frost', () => { S.shield(); }, 0.2);
        } else wt.frost = 0.25;
      }
      L = w.turret | 0; wt.turret -= dt;
      if (L && wt.turret <= 0) {
        wt.turret = 7 * hs; st.turrets.push({ x: h.x, y: h.y, life: 7 + L, cd: 0.3, o: h.i, dmg: 7 + 3 * L, ang: 0, age: 0 });
        const mine = st.turrets.filter(t => t.o === h.i); if (mine.length > 1 + (L >> 1)) st.turrets.splice(st.turrets.indexOf(mine[0]), 1);
        snd('plant', () => S.thud(h.x), 0.1);
      }
    }

    // ------------------------------------------------------------ run update
    function updRun(dt) {
      const en = st.en, heroes = st.heroes;
      st.frame++;
      if (st.phase === 'ready') { st.pt -= dt; if (st.pt <= 0) { if (st.pending > 0) startPick('HEAD START'); else st.phase = 'play'; } }
      if (st.phase === 'pick') { updPick(dt); FX.update(dt); return; }
      if (st.phase === 'over') { st.overT -= (dt > 0 ? dt / (E.slowT > 0 ? E.slowScale : 1) : 1 / 60); if (st.overT <= 0) { finishRun(); return; } }
      const playing = st.phase === 'play';
      if (playing) {
        st.t += dt;
        const cap = 150 + 15 * N, rate = (1.0 + st.t / 60 * 1.25) * (0.7 + 0.15 * N);
        st.acc += rate * dt; let guard = 0;
        while (st.acc >= 1 && en.length < cap && guard++ < 12) { st.acc -= 1; spawnRandom(); }
        if (st.acc > 3) st.acc = 3;
        if (st.t >= st.nextElite) { st.nextElite += 60; const [x, y] = edge(); spawn('elite', x, y); FX.banner('ELITE!', { color: '#C9A0FF', size: 70, life: 1.0, y: 170 }); snd('el', () => S.wave(), 0.3); }
        if (st.t >= st.nextBoss) { st.nextBoss += 180; spawn('boss', W / 2, -50); FX.banner('THE GRAVE KING', { color: '#FF4D6D', size: 110, life: 1.8, sub: 'boss' }); E.shake(14); S.nova(); E.buzz(-1, 250); }
        if (st.t >= st.nextPay) { st.nextPay += 30; const pay = 4 + Math.floor(st.t / 60); gain(pay); bank(); Save.store('horde', save); FX.text(W / 2, 116, '+' + Math.round(pay * (1 + 0.2 * lv('greed'))) + ' GOLD  ·  survived ' + mmss(st.t), { color: '#FFD23F', size: 26, life: 1.6, vy: -14 }); snd('pay', () => S.pickup(), 0.2); }
      }
      // heroes
      for (const h of heroes) {
        const p = P[h.i];
        if (h.down) {
          let near = false; for (const q of heroes) if (!q.down && dist(q.x, q.y, h.x, h.y) < 60) near = true;
          if (near && playing) { h.rev += dt * (1 + 0.25 * lv('medic')); if (st.frame % 8 === 0) FX.burst(h.x, h.y, { n: 2, color: ['#fff', COL[h.i]], speed: 90, life: 0.5, size: 3, grav: -200 }); }
          else h.rev = Math.max(0, h.rev - dt * 0.6);
          if (h.rev >= 2) { h.down = false; h.rev = 0; h.hp = h.maxHp * (0.4 + 0.1 * lv('medic')); h.inv = 2; FX.ring(h.x, h.y, { r1: 120, color: COL[h.i], w: 10 }); FX.text(h.x, h.y - 40, 'BACK UP!', { color: COL[h.i], size: 30 }); S.power(); E.buzz(h.i, 150); }
          continue;
        }
        h.inv -= dt; h.rollCd -= dt; h.waveCd -= dt; h.hurt -= dt;
        if (h.regen) h.hp = Math.min(h.maxHp, h.hp + h.regen * dt);
        if (!playing) { h.vx *= 0.9; h.vy *= 0.9; continue; }
        if (h.rollT > 0) { h.rollT -= dt; h.vx = h.rdx * 640; h.vy = h.rdy * 640; if (st.frame % 2 === 0) FX.burst(h.x, h.y, { n: 1, color: COL[h.i], speed: 20, life: 0.25, size: 10 }); }
        else {
          const k = 1 - Math.exp(-14 * dt); h.vx += (p.x * h.spd - h.vx) * k; h.vy += (p.y * h.spd - h.vy) * k;
          if (p.mag > 0.2) h.face = Math.atan2(p.y, p.x);
          if (p.ap && h.rollCd <= 0) { h.rdx = Math.cos(h.face); h.rdy = Math.sin(h.face); h.rollT = 0.22; h.rollCd = 0.9; snd('roll' + h.i, () => S.dash(h.x), 0.1); }
        }
        if (p.bp && h.waveCd <= 0) shockwave(h);
        h.x = clamp(h.x + h.vx * dt, 24, W - 24); h.y = clamp(h.y + h.vy * dt, TOP, BOT);
        weapons(h, dt);
      }
      // monsters
      const dm = 1 + st.t / 60 * 0.15, kd = Math.exp(-6 * dt);
      for (const e of en) {
        if (e.dead) continue;
        e.flash -= dt; e.slowT -= dt; e.bcd -= dt; e.ccd -= dt; e.cd -= dt; e.tgT -= dt;
        if (e.tgT <= 0 || heroes[e.tg].down) { e.tgT = 0.4; let bd = 1e12; for (const h of heroes) { if (h.down) continue; const d2 = (h.x - e.x) * (h.x - e.x) + (h.y - e.y) * (h.y - e.y); if (d2 < bd) { bd = d2; e.tg = h.i; } } }
        const h = heroes[e.tg]; let dx = h.x - e.x, dy = h.y - e.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const sp = e.spd * (e.slowT > 0 ? 0.5 : 1); let mx = dx * sp, my = dy * sp;
        if (e.stun > 0) { e.stun -= dt; mx = my = 0; }
        else if (e.type === 'charger') {
          if (e.mode === 0) { e.dx = dx; e.dy = dy; if (d < 300 && e.cd <= 0) { e.mode = 1; e.mt = 0.55; } }
          else if (e.mode === 1) { mx = my = 0; e.mt -= dt; if (e.mt <= 0) { e.mode = 2; e.mt = 0.65; snd('chg', () => S.whoosh(e.x), 0.15); } }
          else { mx = e.dx * 350; my = e.dy * 350; e.mt -= dt; if (e.mt <= 0) { e.mode = 0; e.cd = 2.6; } }
        } else if (e.type === 'spit') {
          const want = d > 320 ? 1 : d < 220 ? -1 : 0; mx *= want; my *= want;
          if (e.cd <= 0 && d < 520 && e.x > 0 && e.x < W && e.y > 0 && e.y < H) { e.cd = 2.6; st.eshots.push({ x: e.x, y: e.y, vx: dx * 190, vy: dy * 190, r: 7, dmg: 9 * dm, life: 4 }); snd('spit', () => S.zap(e.x), 0.15); }
        } else if (e.type === 'swarm') { const wv = Math.sin(st.t * 5 + e.seed) * 60; mx += -dy * wv; my += dx * wv; }
        else if (e.type === 'boss') {
          if (e.cd <= 0) { e.cd = 3.4; st.slams.push({ x: h.x, y: h.y, r: 125, t: 1.0, max: 1.0, dmg: 28 * dm }); snd('tel', () => S.count(), 0.2); }
          e.mt -= dt; if (e.mt <= 0 && en.length < 170) { e.mt = 6; for (let k = 0; k < 5; k++) { const a = rand(TAU); spawn('swarm', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70); } }
        }
        e.kx *= kd; e.ky *= kd;
        e.x += (mx + e.kx) * dt; e.y += (my + e.ky) * dt;
        if (playing) for (const q of heroes) { if (q.down || q.inv > 0 || q.rollT > 0) continue; const ddx = q.x - e.x, ddy = q.y - e.y, rr2 = e.r + HR - 9; if (ddx * ddx + ddy * ddy < rr2 * rr2) hitHero(q, e.dmg * dm); }
      }
      // crowd separation (every other frame, cheap box reject first)
      if (st.frame & 1) for (let i = 0; i < en.length; i++) {
        const a = en[i]; if (a.dead) continue;
        for (let j = i + 1; j < en.length; j++) {
          const b = en[j], rr2 = a.r + b.r, dx = b.x - a.x; if (dx > rr2 || dx < -rr2) continue; const dy = b.y - a.y; if (dy > rr2 || dy < -rr2) continue;
          const d2 = dx * dx + dy * dy; if (d2 >= rr2 * rr2 || d2 < 0.01) continue;
          const d = Math.sqrt(d2), o = (rr2 - d) * 0.5 / d, wa = b.r / rr2, wb = a.r / rr2;
          a.x -= dx * o * wa; a.y -= dy * o * wa; b.x += dx * o * wb; b.y += dy * o * wb;
        }
      }
      // hero shots
      for (const s of st.shots) {
        const o = heroes[s.o];
        if (s.k === 'boom') {
          s.life += dt;
          if (!s.ret) { const f = Math.exp(-2.6 * dt); s.vx *= f; s.vy *= f; if (s.life > 0.5) s.ret = true; }
          else { const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy) || 1, k = 1 - Math.exp(-6 * dt); s.vx += (dx / d * 680 - s.vx) * k; s.vy += (dy / d * 680 - s.vy) * k; if (d < 28 || s.life > 3) s.dead = true; }
          s.x += s.vx * dt; s.y += s.vy * dt;
          for (const e of en) { if (e.dead || e.ccd > 0) continue; const dx = e.x - s.x, dy = e.y - s.y, rr2 = e.r + s.r; if (dx * dx + dy * dy < rr2 * rr2) { e.ccd = 0.3; hurt(e, s.dmg, o); } }
        } else {
          s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
          if (s.life <= 0 || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) { s.dead = true; continue; }
          for (const e of en) {
            if (e.dead) continue; const dx = e.x - s.x, dy = e.y - s.y, rr2 = e.r + s.r; if (dx * dx + dy * dy >= rr2 * rr2) continue;
            if (s.hit && s.hit.indexOf(e.id) >= 0) continue;
            hurt(e, s.dmg, o); e.kx += s.vx * 0.12; e.ky += s.vy * 0.12;
            if (s.pierce > 0) { s.pierce--; (s.hit || (s.hit = [])).push(e.id); } else { s.dead = true; break; }
          }
        }
      }
      st.shots = st.shots.filter(s => !s.dead);
      for (const s of st.eshots) {
        s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.life <= 0) { s.dead = true; continue; }
        for (const q of heroes) if (!q.down && dist(q.x, q.y, s.x, s.y) < s.r + HR - 7 && q.inv <= 0 && q.rollT <= 0) { hitHero(q, s.dmg); s.dead = true; break; }
      }
      st.eshots = st.eshots.filter(s => !s.dead);
      for (const f of st.fires) {
        f.life -= dt; f.tk -= dt;
        if (f.tk <= 0) { f.tk = 0.25; const o = heroes[f.o]; for (const e of en) { if (e.dead) continue; const dx = e.x - f.x, dy = e.y - f.y, rr2 = e.r + f.r; if (dx * dx + dy * dy < rr2 * rr2) hurt(e, f.dps * 0.25, o, true); } }
      }
      st.fires = st.fires.filter(f => f.life > 0);
      for (const t of st.turrets) {
        t.life -= dt; t.cd -= dt; t.age += dt;
        if (t.cd <= 0) { const tg = nearest(t.x, t.y, 340); if (tg) { t.cd = 0.42; t.ang = Math.atan2(tg.y - t.y, tg.x - t.x); st.shots.push({ k: 'tur', x: t.x, y: t.y - 8, vx: Math.cos(t.ang) * 520, vy: Math.sin(t.ang) * 520, dmg: t.dmg, pierce: 0, life: 0.8, r: 5, o: t.o, hit: null }); } else t.cd = 0.15; }
      }
      st.turrets = st.turrets.filter(t => t.life > 0);
      for (const s of st.slams) {
        s.t -= dt;
        if (s.t <= 0) { for (const q of heroes) if (dist(q.x, q.y, s.x, s.y) < s.r) hitHero(q, s.dmg); FX.ring(s.x, s.y, { r0: 10, r1: s.r, color: '#FF4D6D', w: 14, life: 0.35 }); FX.burst(s.x, s.y, { n: 24, color: ['#FF4D6D', '#fff'], speed: 420, life: 0.5, size: 6 }); E.shake(11); S.boom(s.x, false); }
      }
      st.slams = st.slams.filter(s => s.t > 0);
      st.en = en.filter(e => !e.dead);
      // drops
      for (const d of st.drops) {
        d.t += dt; const f = Math.exp(-4 * dt); d.vx *= f; d.vy *= f;
        let bh = null, bd = 1e9; for (const h of heroes) { if (h.down) continue; const dd = dist(h.x, h.y, d.x, d.y); if (dd < h.mag && dd < bd) { bd = dd; bh = h; } }
        if (bh && d.t > 0.2) {
          const a = Math.atan2(bh.y - d.y, bh.x - d.x); d.vx += Math.cos(a) * 2600 * dt; d.vy += Math.sin(a) * 2600 * dt;
          if (bd < 20) {
            d.dead = true;
            if (d.k === 'xp') { st.xp += d.v; snd('gem', () => tone({ f: 1200 + (st.xp / st.need) * 700, d: 0.04, v: 0.04, type: 'triangle', pan: panX(d.x) }), 0.05); }
            else if (d.k === 'gold') { gain(d.v); snd('coin', () => S.tink(d.x), 0.07); }
            else { bh.hp = Math.min(bh.maxHp, bh.hp + d.v); FX.text(bh.x, bh.y - 34, '+' + d.v, { color: '#FF8FA3', size: 22 }); S.pickup(); }
          }
        }
        d.x = clamp(d.x + d.vx * dt, 10, W - 10); d.y = clamp(d.y + d.vy * dt, TOP - 20, BOT + 20);
      }
      st.drops = st.drops.filter(d => !d.dead);
      for (let i = st.chests.length - 1; i >= 0; i--) {
        const c = st.chests[i]; c.age += dt;
        for (const h of heroes) {
          if (h.down || dist(h.x, h.y, c.x, c.y) > 36 || c.age < 0.4) continue;
          st.chests.splice(i, 1);
          gain(c.big ? 30 + 10 * st.bossN : 8 + 2 * Math.floor(st.t / 60), c.x, c.y - 30);
          const own = Object.keys(h.w).filter(k => h.w[k] < MAXL);
          if (own.length) { const k = pick(own); h.w[k]++; FX.text(c.x, c.y - 62, WEAP[k].name + ' +1', { color: WEAP[k].col, size: 26, life: 1.4 }); }
          for (const q of heroes) if (!q.down) q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.25);
          FX.confetti(c.x, c.y, c.big ? 70 : 30); FX.ring(c.x, c.y, { r1: 110, color: '#FFD23F', w: 8 }); S.power(); E.buzz(h.i, 120); break;
        }
      }
      for (const z of st.zaps) z.life -= dt; st.zaps = st.zaps.filter(z => z.life > 0);
      for (const n of st.nums) { n.life -= dt; n.y -= 40 * dt; } st.nums = st.nums.filter(n => n.life > 0);
      // team level
      if (playing && st.xp >= st.need) {
        st.xp -= st.need; st.lvl++; st.need = Math.round(18 + (st.lvl - 1) * 14 + Math.pow(st.lvl - 1, 2) * 1.0); st.pending = 1;
        for (const h of heroes) if (!h.down) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.08);
        startPick('LEVEL ' + st.lvl + '!');
      }
      FX.update(dt);
    }
    function finishRun() {
      bank();
      const t = st.t, nb = t > save.best + 0.5;
      sum = { t, kills: st.kills, lvl: st.lvl, gold: Math.floor(st.gold), best: nb, bestK: st.kills > save.bestKills, shown: 0 };
      if (nb) save.best = t; if (sum.bestK) save.bestKills = st.kills; if (st.lvl > save.bestLvl) save.bestLvl = st.lvl;
      Save.store('horde', save);
      mode = 'summary'; mt = 0; pads({ a: 'CONTINUE', b: 'B', stick: '' });
      if (nb) { FX.confetti(W / 2, 200, 120); S.win(); }
    }

    // ------------------------------------------------------------ drawing
    function drawRun(g) {
      const t = E.t, heroes = st.heroes;
      g.drawImage(bgRun, 0, 0);
      g.globalCompositeOperation = 'lighter';
      for (const f of st.fires) { const k = f.life / f.max; g.globalAlpha = 0.35 * k; g.fillStyle = '#FF7A45'; g.beginPath(); g.arc(f.x, f.y, f.r * (0.7 + 0.3 * Math.sin(t * 14 + f.x)), 0, TAU); g.fill(); g.globalAlpha = 0.5 * k; g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(f.x, f.y, f.r * 0.4, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      for (const s of st.slams) { const k = 1 - s.t / s.max; g.fillStyle = 'rgba(255,77,109,0.18)'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); g.strokeStyle = '#FF4D6D'; g.lineWidth = 4; g.stroke(); g.fillStyle = 'rgba(255,77,109,0.4)'; g.beginPath(); g.arc(s.x, s.y, s.r * k, 0, TAU); g.fill(); }
      for (const c of st.chests) { const b = Math.sin(c.age * 5) * 3, s = c.big ? 1.4 : 1; g.save(); g.translate(c.x, c.y + b); g.scale(s, s); g.fillStyle = 'rgba(255,210,63,0.25)'; g.beginPath(); g.arc(0, 0, 26 + Math.sin(c.age * 8) * 3, 0, TAU); g.fill(); g.fillStyle = '#7a4a22'; rr(-15, -10, 30, 22, 4); g.fill(); g.fillStyle = '#c98845'; rr(-15, -12, 30, 11, 4); g.fill(); g.fillStyle = '#FFD23F'; g.fillRect(-3, -4, 6, 8); g.restore(); }
      for (const d of st.drops) {
        if (d.k === 'xp') { g.fillStyle = d.v > 2 ? '#B197FC' : '#5CF2C8'; const s = d.v > 2 ? 7 : 5; g.beginPath(); g.moveTo(d.x, d.y - s - 1); g.lineTo(d.x + s, d.y); g.lineTo(d.x, d.y + s + 1); g.lineTo(d.x - s, d.y); g.fill(); }
        else if (d.k === 'gold') { g.fillStyle = '#B8860B'; g.beginPath(); g.arc(d.x, d.y, 6, 0, TAU); g.fill(); g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(d.x, d.y - 1, 5, 0, TAU); g.fill(); }
        else txt('♥', d.x, d.y, 22, '#FF5D73', { stroke: '#fff', sw: 3 });
      }
      for (const tr of st.turrets) { const s = Math.min(1, tr.age * 6); g.save(); g.translate(tr.x, tr.y); g.scale(s, s); if (tr.life < 1.5 && Math.sin(t * 30) > 0) g.globalAlpha = 0.5; g.fillStyle = '#2f5d2a'; g.beginPath(); g.ellipse(0, 6, 13, 6, 0, 0, TAU); g.fill(); g.fillStyle = COL[tr.o]; g.beginPath(); g.arc(0, -4, 9, 0, TAU); g.fill(); g.strokeStyle = '#1a1f33'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -4); g.lineTo(Math.cos(tr.ang) * 15, -4 + Math.sin(tr.ang) * 15); g.stroke(); g.restore(); g.globalAlpha = 1; }
      for (const e of st.en) drawMonster(g, e, t);
      for (const s of st.eshots) { g.fillStyle = '#4FD1C5'; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, s.r * 0.45, 0, TAU); g.fill(); }
      for (const h of heroes) {
        if (h.down) {
          drawHero(g, h.x, h.y, h.i, { down: true });
          g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 5; g.beginPath(); g.arc(h.x, h.y, 42, 0, TAU); g.stroke();
          g.strokeStyle = COL[h.i]; g.beginPath(); g.arc(h.x, h.y, 42, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(h.rev / 2, 0, 1)); g.stroke();
          txt(h.rev > 0 ? 'REVIVING' : 'HELP!', h.x, h.y - 58 + Math.sin(E.rt * 6) * 3, 16, COL[h.i], { stroke: '#0a0d18' });
          continue;
        }
        if (h.inv > 0 && h.rollT <= 0 && Math.sin(E.rt * 40) > 0.2) g.globalAlpha = 0.45;
        drawHero(g, h.x, h.y, h.i, { face: h.face, roll: h.rollT > 0 ? h.rollT : 0, flash: h.hurt > 0, ring: true }); g.globalAlpha = 1;
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(h.x - 23, h.y - 38, 46, 7); g.fillStyle = h.hp / h.maxHp < 0.3 ? '#FF5D73' : '#7CFF6B'; g.fillRect(h.x - 22, h.y - 37, 44 * clamp(h.hp / h.maxHp, 0, 1), 5);
        for (let k = 0; k < h.bl.length; k += 2) { const bx = h.bl[k], by = h.bl[k + 1]; g.fillStyle = COLL[h.i]; g.beginPath(); g.moveTo(bx, by - 12); g.lineTo(bx + 6, by); g.lineTo(bx, by + 12); g.lineTo(bx - 6, by); g.fill(); g.fillStyle = '#fff'; g.fillRect(bx - 1.5, by - 6, 3, 12); }
      }
      for (const s of st.shots) {
        if (s.k === 'boom') { g.save(); g.translate(s.x, s.y); g.rotate(s.life * 22); g.strokeStyle = '#FFA94D'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-12, 8); g.lineTo(0, -8); g.lineTo(12, 8); g.stroke(); g.restore(); }
        else { g.fillStyle = COL[s.o]; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, s.r * 0.5, 0, TAU); g.fill(); g.globalAlpha = 0.4; g.fillStyle = COL[s.o]; g.beginPath(); g.arc(s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.r * 0.8, 0, TAU); g.fill(); g.globalAlpha = 1; }
      }
      if (st.zaps.length) {
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for (const z of st.zaps) { g.globalAlpha = z.life / 0.18; g.strokeStyle = '#FFE66D'; g.lineWidth = 5; g.beginPath(); g.moveTo(z.x1, z.y1); const mx = (z.x1 + z.x2) / 2 + rand(-14, 14), my = (z.y1 + z.y2) / 2 + rand(-14, 14); g.lineTo(mx, my); g.lineTo(z.x2, z.y2); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      FX.draw(g);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const n of st.nums) { g.globalAlpha = Math.min(1, n.life * 4); g.font = 'bold ' + (n.crit ? 22 : 14) + 'px ' + FONT; g.fillStyle = n.crit ? '#FFD23F' : '#fff'; g.fillText(n.s, n.x, n.y); }
      g.globalAlpha = 1;
      // boss bar
      const boss = st.en.find(e => e.type === 'boss');
      if (boss) { rr(W / 2 - 260, 92, 520, 16, 8); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fill(); rr(W / 2 - 260, 92, Math.max(16, 520 * clamp(boss.hp / boss.maxHp, 0, 1)), 16, 8); g.fillStyle = '#FF4D6D'; g.fill(); txt('THE GRAVE KING', W / 2, 100, 11, '#fff'); }
      // top HUD
      g.fillStyle = 'rgba(8,10,22,0.7)'; g.fillRect(0, 0, W, 30);
      g.fillStyle = '#1d2a4a'; g.fillRect(96, 8, W - 300, 14); g.fillStyle = '#5CF2C8'; g.fillRect(96, 8, (W - 300) * clamp(st.xp / st.need, 0, 1), 14);
      txt('LV ' + st.lvl, 50, 16, 20, '#5CF2C8');
      g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(W - 176, 15, 9, 0, TAU); g.fill(); txt(String(Math.floor(st.gold)), W - 160, 16, 20, '#FFD23F', { align: 'left' });
      txt(st.kills + ' KO', W - 20, 16, 16, 'rgba(255,255,255,0.7)', { align: 'right' });
      txt(mmss(st.t), W / 2, 58, 40, '#fff', { stroke: '#0a0d18' });
      // hero plates
      const pw = Math.min(360, (W - 40 - (N - 1) * 14) / N);
      for (const h of heroes) {
        const x = W / 2 - (N * pw + (N - 1) * 14) / 2 + h.i * (pw + 14), y = H - 66;
        rr(x, y, pw, 56, 12); g.fillStyle = 'rgba(8,10,22,0.78)'; g.fill(); g.lineWidth = 2; g.strokeStyle = COL[h.i]; g.stroke();
        g.font = 'bold 16px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = COL[h.i]; g.fillText(P[h.i].name, x + 12, y + 15, 110);
        rr(x + 128, y + 8, pw - 214, 14, 7); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill();
        if (h.hp > 0) { rr(x + 128, y + 8, Math.max(14, (pw - 214) * clamp(h.hp / h.maxHp, 0, 1)), 14, 7); g.fillStyle = h.down ? '#666' : h.hp / h.maxHp < 0.3 ? '#FF5D73' : '#7CFF6B'; g.fill(); }
        txt(h.down ? 'DOWN' : Math.ceil(h.hp) + '/' + h.maxHp, x + 128 + (pw - 214) / 2, y + 16, 11, '#0a0d18');
        const rdy = h.waveCd <= 0;
        rr(x + pw - 76, y + 6, 66, 20, 10); g.fillStyle = rdy ? '#FFD23F' : 'rgba(255,255,255,0.14)'; g.fill();
        if (!rdy) { rr(x + pw - 76, y + 6, 66 * clamp(1 - h.waveCd / (14 * h.haste), 0.15, 1), 20, 10); g.fillStyle = 'rgba(255,210,63,0.45)'; g.fill(); }
        txt(rdy ? 'B  WAVE!' : 'B', x + pw - 43, y + 17, 11, rdy ? '#0a0d18' : '#fff');
        let ix = x + 14;
        for (const k in h.w) { g.fillStyle = WEAP[k].col; g.beginPath(); g.arc(ix + 7, y + 40, 7, 0, TAU); g.fill(); txt(String(h.w[k]), ix + 7, y + 41, 10, '#0a0d18'); ix += 19; }
        ix += 6;
        for (const k in h.p) { g.fillStyle = PASS[k].col; rr(ix, y + 33, 14, 14, 3); g.fill(); txt(String(h.p[k]), ix + 7, y + 41, 10, '#0a0d18'); ix += 18; }
      }
      FX.drawText(g);
      if (st.phase === 'pick') drawPick(g);
    }
    function drawPick(g) {
      g.fillStyle = 'rgba(6,8,20,0.82)'; g.fillRect(0, 0, W, H);
      txt(st.pickTitle, W / 2, 46, 54, '#FFD23F', { stroke: '#0a0d18' });
      txt('Everyone picks one card:  stick left / right, then A', W / 2, 88, 18, 'rgba(255,255,255,0.7)');
      const rowH = (H - 120) / N, cw = 320, chh = Math.min(190, rowH - 44);
      for (const h of st.heroes) {
        const pk = st.picks[h.i], y0 = 108 + h.i * rowH;
        txt(P[h.i].name, 40, y0 + 12, 22, COL[h.i], { align: 'left' });
        txt(pk.done ? 'PICKED' : 'choosing…' + (h.rerolls > 0 ? '   B = reroll (' + h.rerolls + ')' : ''), 40 + 210, y0 + 13, 15, pk.done ? '#7CFF6B' : 'rgba(255,255,255,0.6)', { align: 'left' });
        for (let c = 0; c < 3; c++) {
          const info = cardInfo(h, pk.cards[c]), on = pk.sel === c, x = W / 2 + (c - 1) * (cw + 18) - cw / 2, y = y0 + 30 - (on && !pk.done ? 4 + Math.sin(E.rt * 7) * 2 : 0);
          if (pk.done && !on) g.globalAlpha = 0.25;
          rr(x, y, cw, chh, 14); g.fillStyle = on ? '#1c2748' : '#121831'; g.fill(); g.lineWidth = on ? 5 : 2; g.strokeStyle = on ? COL[h.i] : 'rgba(255,255,255,0.15)'; g.stroke();
          g.fillStyle = info.col; g.beginPath(); g.arc(x + 34, y + 36, 18, 0, TAU); g.fill();
          g.font = 'bold 22px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(info.name, x + 62, y + 28, cw - 74);
          txt(info.tag, x + 62, y + 52, 13, info.col, { align: 'left' });
          g.font = '19px ' + FONT; g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(info.line, x + 16, y + Math.min(chh - 44, 92), cw - 30);
          for (let k = 0; k < MAXL; k++) { g.fillStyle = k < info.lvl ? info.col : k === info.lvl ? '#fff' : 'rgba(255,255,255,0.15)'; rr(x + 16 + k * 26, y + chh - 24, 20, 8, 4); g.fill(); }
          if (pk.done && on) txt('✓', x + cw - 30, y + 30, 34, '#7CFF6B');
          g.globalAlpha = 1;
        }
      }
      const waiting = st.heroes.filter(h => !st.picks[h.i].done).map(h => P[h.i].name);
      if (waiting.length && waiting.length < N) txt('waiting for ' + waiting.join(' and '), W / 2, H - 16, 18, '#fff');
    }
    function drawHub(g) {
      const t = E.rt; g.drawImage(bgHub, 0, 0);
      const fx = 290, fy = 566;
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { g.globalAlpha = 0.09 + k * 0.05; g.fillStyle = k === 2 ? '#FFD23F' : '#FF8A3D'; g.beginPath(); g.arc(fx, fy - 14, 150 - k * 42 + Math.sin(t * (7 + k)) * 8, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      for (let k = 0; k < 5; k++) { const x = fx - 26 + k * 13, w = Math.sin(t * 9 + k * 1.7) * 6, hh = 34 + Math.sin(t * 6 + k) * 10 + (k === 2 ? 18 : 0); g.fillStyle = k % 2 ? '#FFD23F' : '#FF7A45'; g.beginPath(); g.moveTo(x - 10, fy); g.quadraticCurveTo(x + w, fy - hh * 1.7, x + 10, fy); g.fill(); }
      for (let i = 0; i < N; i++) {
        const off = i - (N - 1) / 2, x = fx + off * (N > 2 ? 105 : 150), y = fy + 52 - Math.abs(off) * 14 + Math.sin(t * 2 + i) * 2;
        g.save(); g.translate(x, y); g.scale(1.3, 1.3); drawHero(g, 0, 0, i, { face: Math.atan2(fy - y, fx - x) + (P[i].mag > 0.2 ? Math.atan2(P[i].y, P[i].x) * 0.3 : 0) }); g.restore();
        txt(P[i].name, x, y + 40, 15, COL[i], { stroke: '#0a0d18' });
      }
      txt('HORDE NIGHT', 44, 62, 52, '#fff', { align: 'left', stroke: '#0a0d18', sw: 11 });
      txt('the camp', 48, 104, 20, 'rgba(255,255,255,0.6)', { align: 'left' });
      g.fillStyle = '#B8860B'; g.beginPath(); g.arc(250, 200, 24, 0, TAU); g.fill(); g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(250, 197, 21, 0, TAU); g.fill();
      txt(String(Math.floor(save.gold)), 286, 200, 56, '#FFD23F', { align: 'left', stroke: '#0a0d18' });
      txt('BEST TIME', 250, 262, 14, 'rgba(255,255,255,0.55)', { align: 'left' }); txt(save.best > 0 ? mmss(save.best) : '—', 250, 288, 30, '#fff', { align: 'left' });
      txt('RUNS', 380, 262, 14, 'rgba(255,255,255,0.55)', { align: 'left' }); txt(String(save.runs), 380, 288, 30, '#fff', { align: 'left' });
      txt('MOST KOs', 460, 262, 14, 'rgba(255,255,255,0.55)', { align: 'left' }); txt(String(save.bestKills), 460, 288, 30, '#fff', { align: 'left' });
      // shop
      const px = 610, pw = 630, rh = 46, py = 34;
      rr(px - 14, py - 14, pw + 28, 652, 20); g.fillStyle = 'rgba(8,10,24,0.82)'; g.fill();
      txt('CAMP UPGRADES  ·  kept forever', px, py + 10, 17, '#FFD23F', { align: 'left' });
      for (let i = 0; i < UP.length; i++) {
        const u = UP[i], L = lv(u.id), max = L >= u.costs.length, cost = max ? 0 : u.costs[L], on = cur === i, can = !max && save.gold >= cost, y = py + 30 + i * rh;
        const sx = on && deny > 0 ? Math.sin(deny * 50) * 6 : 0;
        rr(px + sx, y, pw, rh - 6, 10); g.fillStyle = on ? '#22305c' : 'rgba(255,255,255,0.05)'; g.fill();
        if (on) { g.lineWidth = 3; g.strokeStyle = '#FFD23F'; g.stroke(); }
        txt(u.name, px + 16 + sx, y + 21, 20, max ? '#7CFF6B' : can ? '#fff' : 'rgba(255,255,255,0.55)', { align: 'left' });
        for (let k = 0; k < u.costs.length; k++) { g.fillStyle = k < L ? '#7CFF6B' : 'rgba(255,255,255,0.18)'; rr(px + 250 + k * 24 + sx, y + 15, 18, 10, 5); g.fill(); }
        if (max) txt(u.costs.length === 1 ? 'UNLOCKED' : 'MAX', px + pw - 16 + sx, y + 21, 17, '#7CFF6B', { align: 'right' });
        else { g.fillStyle = can ? '#FFD23F' : '#6b6240'; g.beginPath(); g.arc(px + pw - 86 + sx, y + 20, 9, 0, TAU); g.fill(); txt(String(cost), px + pw - 70 + sx, y + 21, 20, can ? '#FFD23F' : '#8a8366', { align: 'left' }); }
      }
      const sy = py + 30 + UP.length * rh + 8, son = cur === UP.length;
      rr(px, sy, pw, 70, 18); g.fillStyle = son ? '#FFD23F' : 'rgba(255,210,63,0.2)'; g.fill();
      txt('START RUN  ▶', px + pw / 2 + (son ? Math.sin(t * 8) * 3 : 0), sy + 36, 34, son ? '#0a0d18' : '#FFD23F');
      // description of the selection
      rr(40, 328, 520, 84, 14); g.fillStyle = 'rgba(8,10,24,0.82)'; g.fill();
      if (cur < UP.length) {
        const u = UP[cur], L = lv(u.id), max = L >= u.costs.length;
        txt(u.name + (u.costs.length > 1 ? '   level ' + L + ' / ' + u.costs.length : ''), 58, 354, 20, '#FFD23F', { align: 'left' });
        g.font = '17px ' + FONT; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(u.desc, 58, 384, 488);
        if (!max && save.gold < u.costs[L]) txt('need ' + (u.costs[L] - Math.floor(save.gold)) + ' more gold', 546, 354, 14, '#FF8FA3', { align: 'right' });
      } else {
        txt('Head out into the night', 58, 354, 20, '#FFD23F', { align: 'left' });
        txt('Survive as long as you can. Gold you earn comes back to camp.', 58, 384, 17, '#fff', { align: 'left' });
      }
      txt('stick: choose     A: buy / go     B: jump to START RUN', 300, 436, 14, 'rgba(255,255,255,0.5)');
      FX.draw(g); FX.drawText(g);
    }
    function drawSummary(g) {
      drawRun(g);
      g.fillStyle = 'rgba(6,8,20,0.8)'; g.fillRect(0, 0, W, H);
      const k = ease.back(Math.min(1, mt / 0.35));
      g.save(); g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-W / 2, -H / 2);
      rr(300, 96, 680, 528, 26); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#FFD23F'; g.stroke();
      txt('THE NIGHT IS OVER', W / 2, 148, 46, '#fff', { stroke: '#0a0d18' });
      const rows = [['SURVIVED', mmss(sum.t), sum.best ? 'NEW BEST!' : 'best ' + mmss(save.best)], ['MONSTERS KO', String(sum.kills), sum.bestK ? 'NEW BEST!' : ''], ['TEAM LEVEL', String(sum.lvl), '']];
      rows.forEach((r, i) => { const y = 226 + i * 64; txt(r[0], 350, y, 20, 'rgba(255,255,255,0.6)', { align: 'left' }); txt(r[1], 700, y, 40, '#fff', { align: 'right' }); if (r[2]) txt(r[2], 724, y, 18, r[2] === 'NEW BEST!' ? '#7CFF6B' : 'rgba(255,255,255,0.45)', { align: 'left' }); });
      const shown = Math.floor(sum.gold * clamp((mt - 0.5) / 1.0, 0, 1));
      g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(520, 446, 22, 0, TAU); g.fill();
      txt('+' + shown, 556, 448, 64, '#FFD23F', { align: 'left', stroke: '#0a0d18' });
      txt('gold to spend at camp  ·  you now have ' + Math.floor(save.gold), W / 2, 506, 18, 'rgba(255,255,255,0.7)');
      if (mt > 1.3) { g.globalAlpha = 0.6 + 0.4 * Math.sin(E.rt * 6); txt('PRESS  A  FOR CAMP', W / 2, 572, 28, '#FFD23F', { stroke: '#0a0d18' }); g.globalAlpha = 1; }
      g.restore(); FX.draw(g); FX.drawText(g);
    }

    return {
      _dbg: { get st() { return st; }, get mode() { return mode; }, save },   // test handle only
      update(dt) {
        mt += dt > 0 ? dt : 1 / 60;
        if (mode === 'hub') {
          const n = UP.length + 1; deny = Math.max(0, deny - (dt || 1 / 60));
          if (any('nd')) { cur = (cur + 1) % n; S.ui(); } if (any('nu')) { cur = (cur + n - 1) % n; S.ui(); }
          if (mt > 0.4 && any('bp') && cur !== UP.length) { cur = UP.length; S.ui(); }
          else if (mt > 0.4 && any('ap')) {
            if (cur === UP.length) { newRun(); return; }
            const u = UP[cur], L = lv(u.id);
            if (L < u.costs.length && save.gold >= u.costs[L]) {
              save.gold -= u.costs[L]; save.up[u.id] = L + 1; Save.store('horde', save);
              S.power(); E.buzz(-1, 60); FX.confetti(925, 64 + cur * 46 + 20, 24, { speed: [100, 380], life: 1 }); FX.text(925, 64 + cur * 46, u.name + ' UP!', { color: '#7CFF6B', size: 26 });
            } else { deny = 0.3; S.back(); }
          }
          FX.update(dt);
        } else if (mode === 'run') updRun(dt);
        else if (mode === 'summary') {
          FX.update(dt);
          if (mt > 1.3 && any('ap')) { mode = 'hub'; mt = 0; cur = UP.length; FX.clear(); pads(PAD_HUB); S.ok(); }
        }
      },
      draw(g) {
        if (mode === 'hub') drawHub(g); else if (mode === 'run') drawRun(g); else drawSummary(g);
      },
    };
  }

  GAMES.push({
    id: 'horde', name: 'HORDE NIGHT', tag: 'CO-OP', rogue: true, color: '#7B5CD6',
    tagline: 'Survive the horde. Level up. Come back stronger.',
    pad: { a: 'BUY / GO', b: 'TO START', stick: 'CHOOSE' },
    how: { goal: 'Survive as long as you can, then spend gold at camp',
      rows: [['STICK', 'Move — your hero attacks on its own'], ['A', 'Dodge-roll through danger'], ['B', 'Shockwave: blasts everything back (slow recharge)']],
      tips: ['On each level-up everyone picks a card', 'Stand on a fallen friend to revive them'] },
    song: { bpm: 132, root: 45, minor: true, prog: [0, 5, 3, 6], kick: 'x---x---x---x-x-', snare: '----x-------x---', hat: 'x-xxx-xxx-xxx-xx', bass: 'x--x--x-x--x-xo-', arp: '0-3-2-3-1-3-2-3-', arpWave: 'square' },
    icon(g, t) {
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.4, d = 78 - ((t * 14 + k * 9) % 34), x = Math.cos(a) * d * 1.35, y = Math.sin(a) * d * 0.62; drawMonster(g, { type: k % 3 === 0 ? 'swarm' : 'sham', x, y, r: k % 3 === 0 ? 8 : 11, flash: 0, slowT: 0, seed: k, dx: 1, dy: 0, mode: 0 }, t); }
      for (let k = 0; k < 3; k++) { const a = t * 3.3 + k * TAU / 3, bx = Math.cos(a) * 34, by = Math.sin(a) * 24; g.fillStyle = '#E6E9FF'; g.beginPath(); g.moveTo(bx, by - 9); g.lineTo(bx + 5, by); g.lineTo(bx, by + 9); g.lineTo(bx - 5, by); g.fill(); }
      g.save(); g.scale(0.75, 0.75); drawHero(g, -18, 2, 0, { face: t }); drawHero(g, 20, 4, 1, { face: -t }); g.restore();
    },
    create,
  });
})();
