'use strict';
// STAR HOPPERS — co-op rogue-lite. Hop across a branching star map, fight in arenas,
// stack modules during the run, and spend stardust on permanent hangar upgrades between runs.
(function () {
  const KEY = 'hop';
  const DEFAULTS = { dust: 0, runs: 0, wins: 0, bestSector: 0, bestNodes: 0, up: {}, abil: [] };
  // Permanent hangar upgrades (bought with stardust).
  const UPG = [
    { id: 'hull', name: 'HULL PLATING', desc: '+20 hull for every ship', cost: [25, 55, 100, 170, 260] },
    { id: 'power', name: 'WEAPON POWER', desc: '+12% shot damage', cost: [30, 70, 120, 200, 300] },
    { id: 'engine', name: 'ENGINES', desc: '+8% flying speed', cost: [20, 50, 100, 170] },
    { id: 'cool', name: 'ABILITY COOLANT', desc: 'Abilities recharge 12% faster', cost: [30, 65, 120, 200] },
    { id: 'scrap', name: 'STARTING SCRAP', desc: 'Begin each run with +30 scrap', cost: [15, 40, 90, 150] },
    { id: 'nano', name: 'NANOBOTS', desc: 'Repair 6% hull after every node', cost: [40, 90, 160] },
    { id: 'head', name: 'HEAD START', desc: 'Begin with a random module', cost: [80, 200] },
    { id: 'choice', name: 'FOURTH CHOICE', desc: 'Pick from 4 modules, not 3', cost: [140] },
    { id: 'shield', name: 'UNLOCK: SHIELD BUBBLE', desc: 'New ability. Press B here to equip', cost: [110] },
    { id: 'burst', name: 'UNLOCK: OVERCHARGE', desc: 'New ability. Press B here to equip', cost: [150] },
  ];
  // Modules found during a run.
  const MODS = {
    spread: { name: 'SPREAD SHOT', desc: '+2 angled shots', max: 3, c: '#FFD23F' },
    pierce: { name: 'PIERCING', desc: 'Shots pass through +1 enemy', max: 3, c: '#9BE8FF' },
    missile: { name: 'HOMING MISSILES', desc: 'Auto-launch seeking missiles', max: 3, c: '#FF8A3D' },
    drone: { name: 'ORBIT DRONE', desc: 'A drone that shoots for you', max: 3, c: '#C77DFF' },
    rear: { name: 'REAR GUN', desc: 'Also fire backwards', max: 2, c: '#FF7AF0' },
    rapid: { name: 'RAPID FIRE', desc: '+20% fire rate', max: 4, c: '#FFF275' },
    regen: { name: 'AUTO-REPAIR', desc: 'Slowly repair when not hit', max: 3, c: '#4DE2C5' },
    hull: { name: 'BIGGER HULL', desc: '+30 hull, repaired now', max: 5, c: '#FF5D73' },
    engine: { name: 'ENGINE BOOST', desc: '+12% speed', max: 3, c: '#35C2FF' },
    magnet: { name: 'SCRAP MAGNET', desc: 'Pulls scrap in, +25% scrap', max: 2, c: '#B0B7C3' },
    damage: { name: 'OVERCLOCK', desc: '+20% shot damage', max: 5, c: '#FF3860' },
    cooler: { name: 'QUICK CHARGE', desc: 'Ability recharges 20% faster', max: 3, c: '#D0A6FF' },
    blast: { name: 'BLAST ROUNDS', desc: 'Shots explode on impact', max: 2, c: '#FFB15E' },
  };
  const MOD_IDS = Object.keys(MODS);
  const ABIL = {
    blink: { name: 'BLINK', cd: 2.6, desc: 'Dash through shots' },
    shield: { name: 'SHIELD', cd: 9, desc: 'Bubble blocks shots' },
    burst: { name: 'BURST', cd: 7, desc: 'Ring of fire, clears shots' },
  };
  const SECT = [
    { name: 'RUST BELT', c1: '#1a1030', c2: '#3a1c2e', neb: ['#FF8A3D', '#FF5D73'], mix: { drone: 5, kami: 3, sniper: 2, miner: 1.2, carrier: 0.5 }, boss: 'THE WARDEN', hp: 1, dmg: 1 },
    { name: 'THE HIVE', c1: '#07201f', c2: '#123a3a', neb: ['#35C2FF', '#4DE2C5'], mix: { drone: 3, kami: 4, sniper: 2, miner: 2, weaver: 3, carrier: 1.5 }, boss: 'HIVE QUEEN', hp: 1.9, dmg: 1.45 },
    { name: 'ECLIPSE REACH', c1: '#0b0b24', c2: '#2a1048', neb: ['#C77DFF', '#FF7AF0'], mix: { drone: 2, kami: 3, sniper: 3, miner: 2, weaver: 3, carrier: 2, orb: 3 }, boss: 'THE ECLIPSE', hp: 3.0, dmg: 1.9 },
  ];
  const EN = {
    drone: { r: 17, hp: 30, cost: 2, c: '#FF8A3D', scrap: 2 },
    kami: { r: 14, hp: 16, cost: 1.5, c: '#FF3860', scrap: 1 },
    sniper: { r: 17, hp: 36, cost: 3, c: '#FFD23F', scrap: 3 },
    miner: { r: 18, hp: 55, cost: 3.5, c: '#B0B7C3', scrap: 3 },
    carrier: { r: 30, hp: 140, cost: 6.5, c: '#C77DFF', scrap: 8 },
    weaver: { r: 17, hp: 44, cost: 3.5, c: '#4DE2C5', scrap: 3 },
    orb: { r: 22, hp: 100, cost: 5, c: '#FF7AF0', scrap: 5 },
  };
  const BOSS_ATK = [
    [['aimed', 'ring'], ['aimed', 'spiral', 'spawn'], ['charge', 'ring', 'spiral', 'aimed']],
    [['spawn', 'fan'], ['mines', 'fan', 'spawn', 'ring'], ['spawn', 'spiral', 'charge', 'mines', 'fan']],
    [['beam', 'aimed', 'ring'], ['teleport', 'spiral', 'beam', 'spawn'], ['teleport', 'beam', 'ring', 'fan', 'charge']],
  ];
  const NODE = {
    fight: { name: 'FIGHT', desc: 'Clear the waves, pick a module', c: '#FF8A3D' },
    elite: { name: 'ELITE', desc: 'A tougher fight with more loot', c: '#FF3860' },
    shop: { name: 'SHOP', desc: 'Spend scrap on repairs and modules', c: '#FFD23F' },
    repair: { name: 'REPAIR BAY', desc: 'Free repairs for every ship', c: '#4DE2C5' },
    mystery: { name: 'UNKNOWN SIGNAL', desc: 'Something is out there', c: '#C77DFF' },
    boss: { name: 'SECTOR BOSS', desc: 'Beat it to reach the next sector', c: '#FF3860' },
    start: { name: 'START', desc: '', c: '#ffffff' },
  };
  const AX0 = 28, AX1 = W - 28, AY0 = 70, AY1 = H - 70;   // arena bounds

  function mkBg(sc, hub) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const b = c.getContext('2d');
    const gr = b.createLinearGradient(0, 0, W, H); gr.addColorStop(0, sc.c1); gr.addColorStop(1, sc.c2); b.fillStyle = gr; b.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) {
      const x = rand(W), y = rand(H), r = rand(220, 430), n = b.createRadialGradient(x, y, 0, x, y, r);
      n.addColorStop(0, sc.neb[i % 2]); n.addColorStop(1, 'rgba(0,0,0,0)'); b.globalAlpha = 0.13; b.fillStyle = n; b.fillRect(0, 0, W, H);
    }
    b.globalAlpha = 1; b.fillStyle = '#fff';
    for (let i = 0; i < 170; i++) { b.globalAlpha = rand(0.2, 0.9); b.beginPath(); b.arc(rand(W), rand(H), rand(0.5, 1.9), 0, TAU); b.fill(); }
    b.globalAlpha = 1;
    if (hub) {
      b.fillStyle = 'rgba(8,10,24,0.55)'; b.fillRect(0, 0, W, H);
      b.strokeStyle = 'rgba(120,150,255,0.08)'; b.lineWidth = 2;
      for (let x = -400; x < W + 400; x += 90) { b.beginPath(); b.moveTo(W / 2 + (x - W / 2) * 0.25, 110); b.lineTo(x, H); b.stroke(); }
      for (let k = 0; k < 9; k++) { const y = 110 + Math.pow(k / 8, 1.8) * (H - 110); b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
    }
    return c;
  }

  function modIcon(g, id, x, y, s) {
    const c = MODS[id].c;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#10131f'; g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = c; g.lineWidth = 2.5; g.lineCap = 'round'; g.lineJoin = 'round';
    const L = (a, b, c2, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); };
    const D = (a, b, r) => { g.beginPath(); g.arc(a, b, r, 0, TAU); g.fill(); };
    switch (id) {
      case 'spread': L(0, 8, 0, -9); L(0, 8, -7, -5); L(0, 8, 7, -5); break;
      case 'pierce': L(-9, 0, 9, 0); L(4, -5, 9, 0); L(4, 5, 9, 0); break;
      case 'missile': g.beginPath(); g.moveTo(0, -9); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill(); L(0, 5, 0, 9); break;
      case 'drone': D(0, 0, 4); g.beginPath(); g.arc(0, 0, 9, 0.4, 2.2); g.stroke(); g.beginPath(); g.arc(0, 0, 9, 3.5, 5.3); g.stroke(); break;
      case 'rear': L(0, -8, 0, 8); L(-4, 4, 0, 8); L(4, 4, 0, 8); break;
      case 'rapid': L(-6, -7, -6, 7); L(0, -7, 0, 7); L(6, -7, 6, 7); break;
      case 'regen': L(0, -7, 0, 7); L(-7, 0, 7, 0); break;
      case 'hull': g.beginPath(); g.moveTo(0, -9); g.lineTo(8, -4); g.lineTo(6, 6); g.lineTo(0, 10); g.lineTo(-6, 6); g.lineTo(-8, -4); g.closePath(); g.stroke(); break;
      case 'engine': g.beginPath(); g.moveTo(-7, -7); g.lineTo(0, 0); g.lineTo(-7, 7); g.stroke(); g.beginPath(); g.moveTo(1, -7); g.lineTo(8, 0); g.lineTo(1, 7); g.stroke(); break;
      case 'magnet': g.beginPath(); g.arc(0, -1, 7, Math.PI, 0); g.stroke(); L(-7, -1, -7, 7); L(7, -1, 7, 7); break;
      case 'damage': g.beginPath(); g.moveTo(2, -10); g.lineTo(-6, 1); g.lineTo(0, 1); g.lineTo(-2, 10); g.lineTo(6, -2); g.lineTo(0, -2); g.closePath(); g.fill(); break;
      case 'cooler': g.beginPath(); g.arc(0, 0, 8, -1.2, 3.6); g.stroke(); L(0, 0, 0, -6); L(0, 0, 4, 2); break;
      case 'blast': D(0, 0, 4); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; L(Math.cos(a) * 7, Math.sin(a) * 7, Math.cos(a) * 11, Math.sin(a) * 11); } break;
    }
    g.restore();
  }

  function drawShip(g, x, y, ang, i, o) {
    o = o || {}; const m = o.mods || {}, sc = o.scale || 1;
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(sc, sc);
    if (o.flame) { g.fillStyle = '#FFD23F'; g.beginPath(); g.moveTo(-13, -6); g.lineTo(-16 - 16 * o.flame - Math.random() * 7, 0); g.lineTo(-13, 6); g.closePath(); g.fill(); }
    const body = () => { g.beginPath(); g.moveTo(24, 0); g.lineTo(-6, -17); g.lineTo(-16, -15); g.lineTo(-10, 0); g.lineTo(-16, 15); g.lineTo(-6, 17); g.closePath(); };
    g.fillStyle = o.wreck ? '#3b4256' : COLD[i]; body(); g.fill();
    if (m.hull) { g.strokeStyle = COLL[i]; g.lineWidth = Math.min(4, 1 + m.hull * 0.7); body(); g.stroke(); }
    g.fillStyle = o.wreck ? '#596079' : COL[i]; g.beginPath(); g.moveTo(21, 0); g.lineTo(-5, -12); g.lineTo(-9, 0); g.lineTo(-5, 12); g.closePath(); g.fill();
    g.fillStyle = '#e8eefc';
    for (let k = 1; k <= (m.spread | 0); k++) { g.fillRect(0, -7 - k * 4, 13, 2.5); g.fillRect(0, 4.5 + k * 4, 13, 2.5); }
    if (m.rear) { g.fillRect(-22, -1.5, 11, 3); if (m.rear > 1) { g.fillRect(-21, -6, 9, 2.5); g.fillRect(-21, 3.5, 9, 2.5); } }
    if (m.missile) { g.fillStyle = '#FF8A3D'; g.fillRect(-9, -20, 10, 4); g.fillRect(-9, 16, 10, 4); }
    if (m.blast) { g.fillStyle = '#FFB15E'; g.beginPath(); g.arc(22, 0, 3, 0, TAU); g.fill(); }
    g.fillStyle = o.wreck ? '#8a90a3' : '#fff'; g.beginPath(); g.arc(5, 0, 4.5, 0, TAU); g.fill();
    g.restore();
  }

  function drawEnemy(g, e, t) {
    const d = EN[e.type], r = e.r * Math.min(1, e.age * 6 + 0.1), col = e.flash > 0 ? '#fff' : d.c;
    g.save(); g.translate(e.x, e.y);
    if (e.champ) { g.strokeStyle = '#FFD23F'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r + 8 + Math.sin(t * 6) * 2, 0, TAU); g.stroke(); }
    g.fillStyle = col;
    switch (e.type) {
      case 'drone': g.rotate(e.ang); g.beginPath(); g.moveTo(r * 1.15, 0); g.lineTo(0, -r * 0.85); g.lineTo(-r * 0.9, 0); g.lineTo(0, r * 0.85); g.closePath(); g.fill();
        g.fillStyle = '#10131f'; g.beginPath(); g.arc(r * 0.2, 0, r * 0.36, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(r * 0.32, 0, r * 0.14, 0, TAU); g.fill(); break;
      case 'kami': g.rotate(e.ang); if (Math.sin(t * 26) > 0.2) g.fillStyle = e.flash > 0 ? '#fff' : '#FFB3C0';
        g.beginPath(); g.moveTo(r * 1.5, 0); g.lineTo(-r, -r); g.lineTo(-r * 0.4, 0); g.lineTo(-r, r); g.closePath(); g.fill();
        g.fillStyle = '#10131f'; g.beginPath(); g.arc(r * 0.25, 0, r * 0.28, 0, TAU); g.fill(); break;
      case 'sniper': g.rotate(e.ang); g.fillRect(-r, -r * 0.45, r * 2, r * 0.9); g.fillRect(r, -2.5, r * 1.1, 5); g.fillRect(-r * 0.9, -r * 0.9, r * 0.5, r * 1.8);
        g.fillStyle = '#10131f'; g.beginPath(); g.arc(r * 0.3, 0, r * 0.3, 0, TAU); g.fill(); break;
      case 'miner': g.strokeStyle = col; g.lineWidth = 4; for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + t * 1.5; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); g.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); g.stroke(); }
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.fillStyle = '#10131f'; g.beginPath(); g.arc(0, 0, r * 0.45, 0, TAU); g.fill();
        g.fillStyle = '#FF3860'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill(); break;
      case 'carrier': g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + t * 0.3; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
        g.fillStyle = '#10131f'; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6 - t * 0.5; g.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); } g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fill();
        if (e.sh > 0) { g.strokeStyle = '#9BE8FF'; g.lineWidth = 4; g.globalAlpha = 0.35 + 0.5 * (e.sh / e.shMax); g.beginPath(); g.arc(0, 0, r + 9, 0, TAU); g.stroke(); g.globalAlpha = 1; } break;
      case 'weaver': g.rotate(e.ang); g.beginPath(); g.moveTo(r * 1.2, 0); g.lineTo(-r, -r * 1.1); g.lineTo(-r * 0.25, 0); g.lineTo(-r, r * 1.1); g.closePath(); g.fill();
        g.fillStyle = '#10131f'; g.beginPath(); g.moveTo(r * 0.6, 0); g.lineTo(-r * 0.3, -r * 0.45); g.lineTo(-r * 0.05, 0); g.lineTo(-r * 0.3, r * 0.45); g.closePath(); g.fill(); break;
      case 'orb': g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.arc(0, 0, r + 7, t * 2, t * 2 + TAU); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#10131f'; g.beginPath(); g.arc(0, 0, r * (0.45 + 0.1 * Math.sin(t * 5)), 0, TAU); g.fill();
        if (e.cd < 0.5) { g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); } break;
    }
    g.restore();
  }

  function drawBoss(g, b, t, look) {
    const r = b.r, fl = b.flash > 0;
    g.save(); g.translate(b.x, b.y);
    if (b.inv > 0 && b.intro <= 0) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 30); g.beginPath(); g.arc(0, 0, r + 16, 0, TAU); g.stroke(); }
    g.globalAlpha = b.alpha;
    if (b.sec === 0) {
      g.fillStyle = fl ? '#fff' : '#8a3b22';
      for (let k = 0; k < 12; k++) { g.save(); g.rotate(k * TAU / 12 + t * 0.5); g.fillRect(r * 0.8, -9, r * 0.38, 18); g.restore(); }
      g.fillStyle = fl ? '#fff' : '#FF8A3D'; g.beginPath(); g.arc(0, 0, r * 0.92, 0, TAU); g.fill();
      g.fillStyle = '#3a1c2e'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8 - t * 0.8; g.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); } g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.36, 0, TAU); g.fill();
      g.fillStyle = '#FF3860'; g.beginPath(); g.arc(look.x * r * 0.14, look.y * r * 0.14, r * 0.18, 0, TAU); g.fill();
    } else if (b.sec === 1) {
      g.strokeStyle = fl ? '#fff' : '#8a6a12'; g.lineWidth = 6; g.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const s = k < 3 ? -1 : 1, q = k % 3, w = Math.sin(t * 6 + k) * 8; g.beginPath(); g.moveTo(s * r * 0.5, (q - 1) * r * 0.5); g.lineTo(s * (r * 1.25 + w), (q - 1) * r * 0.8 - 10); g.stroke(); }
      g.fillStyle = fl ? '#fff' : '#E8C547'; g.beginPath(); g.ellipse(0, -r * 0.25, r * 0.85, r * 1.05, 0, 0, TAU); g.fill();
      g.fillStyle = '#2a2208'; for (let k = 0; k < 3; k++) g.fillRect(-r * 0.8, -r * 1.05 + k * r * 0.34, r * 1.6, r * 0.13);
      g.fillStyle = fl ? '#fff' : '#c79a1e'; g.beginPath(); g.arc(0, r * 0.55, r * 0.55, 0, TAU); g.fill();
      g.strokeStyle = '#2a2208'; g.lineWidth = 6; const mo = 0.25 + 0.2 * Math.sin(t * 5);
      g.beginPath(); g.arc(-r * 0.2, r * 0.95, r * 0.3, 0.6 - mo, 2.2); g.stroke(); g.beginPath(); g.arc(r * 0.2, r * 0.95, r * 0.3, 0.94, 2.54 + mo); g.stroke();
      for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * r * 0.24, r * 0.48, r * 0.15, 0, TAU); g.fill(); g.fillStyle = '#FF3860'; g.beginPath(); g.arc(s * r * 0.24 + look.x * 4, r * 0.48 + look.y * 4, r * 0.08, 0, TAU); g.fill(); }
    } else {
      const cg = g.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.5); cg.addColorStop(0, fl ? '#fff' : '#FF7AF0'); cg.addColorStop(0.5, 'rgba(199,125,255,0.5)'); cg.addColorStop(1, 'rgba(199,125,255,0)');
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, r * 1.5, 0, TAU); g.fill();
      g.fillStyle = fl ? '#fff' : '#07060f'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.strokeStyle = '#C77DFF'; g.lineWidth = 5; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, r * (0.55 + k * 0.17), t * (1 + k * 0.4) + k * 2, t * (1 + k * 0.4) + k * 2 + 2.2); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(look.x * 6, look.y * 6, r * 0.3, r * (0.1 + 0.05 * Math.sin(t * 3)), Math.atan2(look.y, look.x) + Math.PI / 2, 0, TAU); g.fill();
    }
    g.restore();
  }

  function create() {
    const P = E.players, N = P.length, nScale = 1 + 0.3 * (N - 2);
    let save = Save.load(KEY, DEFAULTS);
    if (!save.up || typeof save.up !== 'object') save.up = {};
    if (!Array.isArray(save.abil)) save.abil = [];
    for (const k of ['dust', 'runs', 'wins', 'bestSector', 'bestNodes']) save[k] = +save[k] || 0;
    const lv = id => save.up[id] | 0;
    const store = () => Save.store(KEY, save);
    const anyP = k => { for (const p of P) if (p[k]) return true; return false; };
    const whoP = k => { for (const p of P) if (p[k]) return p.i; return -1; };
    const bgs = SECT.map(s => mkBg(s)), hubBg = mkBg({ c1: '#0c1024', c2: '#1a1f3d', neb: ['#35C2FF', '#C77DFF'] }, true);
    const st = { mode: 'hub', t: 0, lock: 0.6, cur: UPG.length, run: null, padMode: '', f: null, rw: null, shop: null, ev: null, sum: null, hop: 0, hopNode: null, note: '', noteT: 0, shotT: 0, popT: 0, bought: -1, boughtT: 0, repT: 0 };
    const note = s => { st.note = s; st.noteT = 1.8; };
    const abilOf = i => { const a = save.abil[i]; return (a === 'shield' && lv('shield')) || (a === 'burst' && lv('burst')) ? a : 'blink'; };

    function pads() {
      const m = st.mode;
      if (m === 'fight') E.setPads(P.map((p, i) => ({ a: 'FIRE', b: ABIL[st.run ? st.run.ships[i].abil : 'blink'].name, stick: 'FLY' })), 'STAR HOPPERS');
      else if (m === 'hub') E.setPads({ a: 'BUY / GO', b: 'ABILITY', stick: 'CHOOSE' }, 'HANGAR');
      else if (m === 'map') E.setPads({ a: 'HOP', b: '-', stick: 'ROUTE' }, 'STAR MAP');
      else if (m === 'reward') E.setPads({ a: 'TAKE', b: '-', stick: 'PICK' }, 'MODULES');
      else E.setPads({ a: 'OK', b: '-', stick: 'CHOOSE' }, 'STAR HOPPERS');
    }

    // ------------------------------------------------------------ run setup
    const maxHull = s => 100 + 20 * lv('hull') + 30 * (s.mods.hull | 0);
    const freeMods = s => MOD_IDS.filter(id => (s.mods[id] | 0) < MODS[id].max);
    function addMod(s, id) {
      if (!id) return;
      s.mods[id] = (s.mods[id] | 0) + 1; st.run.mods++;
      if (id === 'hull') { s.max = maxHull(s); s.hull = Math.min(s.max, s.hull + 30); }
    }
    function gainDust(d) { st.run.dust += d; save.dust += d; }
    function startRun() {
      const run = st.run = { sector: 0, scrap: 30 * lv('scrap'), dust: 0, nodes: 0, mods: 0, kills: 0, time: 0, ships: [], map: null, pos: null };
      for (let i = 0; i < N; i++) {
        const s = { i, mods: {}, hull: 0, max: 0, down: false, abil: abilOf(i), x: W / 2, y: H / 2, vx: 0, vy: 0, ang: -Math.PI / 2, fl: 0, revT: 0, inv: 0, hitT: 9, blinkT: 0, shieldT: 0, abCd: 0, abMax: 1, fireCd: 0, misCd: 1, drCd: 0.5, drA: i * 2 };
        run.ships.push(s);
        for (let k = 0; k < lv('head'); k++) addMod(s, pick(freeMods(s)));
        s.max = maxHull(s); s.hull = s.max;
      }
      run.mods = 0;
      newSector(0);
    }
    function genMap() {
      const cols = [];
      for (let c = 0; c <= 6; c++) {
        const k = c === 0 || c === 6 ? 1 : (c === 1 ? 2 : 2 + (Math.random() < 0.6 ? 1 : 0)), col = [];
        for (let r = 0; r < k; r++) col.push({ c, r, type: c === 0 ? 'start' : 'fight', next: [], done: c === 0, x: 150 + c * 165, y: k === 1 ? 350 : lerp(210, 490, r / (k - 1)) });
        cols.push(col);
      }
      for (let c = 2; c <= 5; c++) for (const n of cols[c]) {
        const r = Math.random();
        n.type = r < 0.42 ? 'fight' : r < 0.58 ? (c >= 3 ? 'elite' : 'fight') : r < 0.72 ? 'shop' : r < 0.84 ? 'repair' : 'mystery';
      }
      if (!cols[5].some(n => n.type === 'repair' || n.type === 'shop')) pick(cols[5]).type = 'repair';
      if (!cols[3].some(n => n.type === 'fight' || n.type === 'elite')) cols[3][0].type = 'fight';
      cols[6][0].type = 'boss';
      for (let c = 0; c < 6; c++) {
        const a = cols[c], b = cols[c + 1];
        for (const n of a) {
          if (a.length === 1) { for (let q = 0; q < b.length; q++) n.next.push(q); continue; }
          const j = Math.round(n.r * (b.length - 1) / (a.length - 1)); n.next.push(j);
          const alt = j + (Math.random() < 0.5 ? 1 : -1);
          if (alt >= 0 && alt < b.length && Math.random() < 0.55) n.next.push(alt);
        }
        for (let q = 0; q < b.length; q++) if (!a.some(n => n.next.includes(q))) {
          let best = a[0]; for (const n of a) if (Math.abs(n.y - b[q].y) < Math.abs(best.y - b[q].y)) best = n;
          best.next.push(q);
        }
        for (const n of a) n.next.sort((x, y) => x - y);
      }
      return { cols };
    }
    function newSector(n) {
      const run = st.run; run.sector = n; run.map = genMap(); run.pos = run.map.cols[0][0];
      st.cur = 0; st.mode = 'map'; st.lock = 0.5; st.hop = 0;
      FX.banner('SECTOR ' + (n + 1), { size: 110, life: 1.6, sub: SECT[n].name }); S.wave();
    }
    function enterNode(n) {
      st.run.pos = n; st.cur = 0;
      if (n.type === 'fight' || n.type === 'elite' || n.type === 'boss') startFight(n.type);
      else if (n.type === 'shop') openShop();
      else if (n.type === 'repair') { for (const s of st.run.ships) { s.down = false; s.hull = Math.min(s.max, s.hull + s.max * 0.5); } st.mode = 'repair'; st.repT = 0; S.power(); }
      else openEvent();
    }
    function nodeDone(dust) {
      const run = st.run, n = run.pos; n.done = true; run.nodes++; gainDust(dust);
      for (const s of run.ships) { s.down = false; s.hull = Math.min(s.max, Math.max(1, s.hull) + s.max * 0.06 * lv('nano')); }
      store();
      if (n.type === 'boss') {
        if (run.sector >= SECT.length - 1) { endRun(true); return; }
        for (const s of run.ships) s.hull = Math.min(s.max, s.hull + s.max * 0.3);
        newSector(run.sector + 1); return;
      }
      st.mode = 'map'; st.lock = 0.45; st.cur = 0;
    }
    function endRun(win) {
      const run = st.run, sec = run.sector + 1;
      const best = sec > save.bestSector || (sec === save.bestSector && run.nodes > save.bestNodes);
      if (best) { save.bestSector = sec; save.bestNodes = run.nodes; }
      save.runs++; if (win) save.wins++;
      store();
      st.sum = { win, sector: sec, nodes: run.nodes, mods: run.mods, kills: run.kills, dust: run.dust, time: run.time, best };
      st.mode = 'summary'; st.lock = 1.5; st.f = null;
      if (win) { S.win(); FX.confetti(W / 2, 200, 160); } else S.lose();
    }

    // ------------------------------------------------------------ fights
    function buildWave(budget, sec, champ) {
      const mix = SECT[sec].mix, keys = Object.keys(mix), list = []; let tot = 0, guard = 0;
      for (const k of keys) tot += mix[k];
      while (budget > 1.4 && list.length < 14 && guard++ < 80) {
        let r = Math.random() * tot, t = keys[0];
        for (const k of keys) { r -= mix[k]; if (r <= 0) { t = k; break; } }
        if (EN[t].cost <= budget + 0.6) { list.push({ type: t }); budget -= EN[t].cost; }
      }
      if (!list.length) list.push({ type: 'drone' });
      if (champ) list.push({ type: sec === 0 ? pick(['carrier', 'miner', 'sniper']) : pick(['carrier', 'weaver', 'orb']), champ: true });
      return list;
    }
    function mkBoss(sec) {
      const max = [3000, 6500, 10500][sec] * (1 + 0.35 * (N - 2));
      return { sec, name: SECT[sec].boss, x: W / 2, y: -110, vx: 0, vy: 0, r: sec === 1 ? 60 : 68, hp: max, max, ph: 0, cd: 1.6, atk: null, ai: 0, flash: 0, inv: 2, tx: W / 2, ty: 190, mt: 0, alpha: 1, intro: 1.7, dead: false, beam: null };
    }
    function startFight(kind) {
      const run = st.run, sec = run.sector, c = run.pos.c;
      const f = st.f = { kind, waves: [], wi: -1, en: [], eb: [], pb: [], mis: [], mines: [], drops: [], warps: [], boss: null, t: 0, waveT: 0, gap: 0.9, done: false, doneT: 0, failT: 0 };
      if (kind === 'boss') { f.boss = mkBoss(sec); FX.banner(SECT[sec].boss, { color: '#FF3860', size: 110, life: 1.9, sub: 'SECTOR BOSS' }); S.boom(W / 2, true); E.shake(10); }
      else {
        const nw = kind === 'elite' ? 3 : (c <= 2 ? 2 : 3);
        for (let w = 0; w < nw; w++) f.waves.push(buildWave((7 + 2.2 * c + 9 * sec + 2 * w) * nScale * (kind === 'elite' ? 1.25 : 1), sec, kind === 'elite' && w === nw - 1));
        if (kind === 'elite') FX.banner('ELITE PATROL', { color: '#FF3860', size: 90, life: 1.3 });
      }
      run.ships.forEach((s, i) => {
        s.x = W / 2 + (i - (N - 1) / 2) * 130; s.y = H - 160; s.vx = s.vy = 0; s.ang = -Math.PI / 2; s.fireCd = 0.3; s.abCd = 0; s.abMax = 1; s.inv = 1; s.hitT = 9;
        s.blinkT = 0; s.shieldT = 0; s.misCd = 1; s.drCd = 0.5; s.revT = 0; s.down = false; s.abil = abilOf(i); if (s.hull < 1) s.hull = Math.max(1, s.max * 0.25);
      });
      st.mode = 'fight'; st.lock = 0; st.padMode = '';
    }
    const nearestShip = (x, y) => { let b = null, bd = 1e9; for (const s of st.run.ships) { if (s.down) continue; const d = dist(x, y, s.x, s.y); if (d < bd) { bd = d; b = s; } } return b; };
    function nearestFoe(x, y, maxD) {
      const f = st.f; let b = null, bd = maxD || 1e9;
      for (const e of f.en) { if (e.dead || e.age < 0.25) continue; const d = dist(x, y, e.x, e.y); if (d < bd) { bd = d; b = e; } }
      if (f.boss && !f.boss.dead && f.boss.intro <= 0) { const d = dist(x, y, f.boss.x, f.boss.y) - f.boss.r; if (d < bd) b = f.boss; }
      return b;
    }
    function spawnPos() {
      for (let k = 0; k < 30; k++) { const x = rand(70, W - 70), y = rand(100, H - 230); if (st.run.ships.every(s => dist(s.x, s.y, x, y) > 250)) return [x, y]; }
      return [rand(70, W - 70), 110];
    }
    function mkEnemy(type, x, y, champ) {
      const d = EN[type], sc = SECT[st.run.sector], hp = d.hp * sc.hp * (champ ? 3.2 : 1), sh = type === 'carrier' ? 40 * sc.hp : 0;
      return { type, x, y, vx: 0, vy: 0, r: d.r * (champ ? 1.35 : 1), hp, ang: Math.PI / 2, age: 0, flash: 0, cd: rand(0.9, 2.2), champ: !!champ, sh, shMax: sh || 1, shT: 0, st: 'idle', dir: Math.random() < 0.5 ? -1 : 1, seed: rand(TAU), wx: x, wy: y, dead: false };
    }
    function nextWave() {
      const f = st.f; f.wi++; f.waveT = 0; f.gap = 0.8;
      for (const it of f.waves[f.wi]) { const [x, y] = spawnPos(); f.warps.push({ x, y, type: it.type, champ: it.champ, t: 0.9, max: 0.9 }); }
      FX.text(W / 2, 120, 'WAVE ' + (f.wi + 1) + ' / ' + f.waves.length, { size: 34, life: 1.3, vy: -10 }); S.whoosh(W / 2);
    }
    function shoot(e, ang, speed, dmg, r) {
      const f = st.f; if (f.eb.length >= 260) return;
      f.eb.push({ x: e.x + Math.cos(ang) * e.r * 0.8, y: e.y + Math.sin(ang) * e.r * 0.8, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: r || 6, dmg: dmg * SECT[st.run.sector].dmg, life: 6, dead: false });
    }
    function dropScrap(x, y, val) {
      const f = st.f, n = Math.min(8, Math.max(1, Math.round(val)));
      for (let k = 0; k < n; k++) { const a = rand(TAU), sp = rand(40, 170); f.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, val: val / n, dead: false }); }
    }
    function kill(e, silent) {
      if (e.dead) return; e.dead = true; st.run.kills++;
      const d = EN[e.type], big = e.type === 'carrier' || e.type === 'orb' || e.champ;
      FX.burst(e.x, e.y, { n: big ? 34 : 14, color: [d.c, '#fff', '#FFD23F'], speed: big ? 420 : 280, life: big ? 0.8 : 0.45, size: big ? 7 : 5 });
      FX.ring(e.x, e.y, { r1: e.r * (big ? 4 : 2.6), color: d.c, w: 5, life: 0.35 });
      dropScrap(e.x, e.y, d.scrap * (e.champ ? 5 : 1));
      if (big) { S.boom(e.x, false); E.shake(9); }
      else if (!silent && E.rt - st.popT > 0.05) { st.popT = E.rt; noise({ d: 0.14, v: 0.16, f: 1400, f2: 200, pan: panX(e.x) }); tone({ f: 300, f2: 90, d: 0.1, v: 0.08, type: 'triangle', pan: panX(e.x) }); E.shake(2.5); }
    }
    function bossDie(b) {
      const f = st.f; b.dead = true; b.atk = null; b.beam = null; f.done = true; f.doneT = -1.6;
      for (const e of f.en) kill(e, true); f.eb.length = 0; f.mines.length = 0; f.warps.length = 0;
      for (let k = 0; k < 6; k++) FX.burst(b.x + rand(-50, 50), b.y + rand(-50, 50), { n: 30, color: ['#FFD23F', '#FF8A3D', '#fff', '#FF3860'], speed: 620, life: 1.3, size: 9 });
      for (let k = 0; k < 3; k++) FX.ring(b.x, b.y, { r0: 20, r1: 500 + k * 200, color: k ? '#FFD23F' : '#fff', w: 20 - k * 5, life: 0.7 + k * 0.25 });
      FX.confetti(b.x, b.y, 120); dropScrap(b.x, b.y, 8); dropScrap(b.x + 30, b.y, 8); dropScrap(b.x - 30, b.y, 8);
      FX.banner('BOSS DOWN!', { color: '#FFD23F', size: 130, life: 1.9, sub: 'SECTOR ' + (st.run.sector + 1) + ' CLEAR' });
      S.boom(b.x, true); S.nova(); E.shake(26); E.flash('#fff', 0.7); E.slow(0.25, 1.4); E.buzz(-1, 400);
      for (const s of st.run.ships) if (s.down) revive(s, 0.25);
    }
    function hurt(e, dmg, x, y) {
      const f = st.f;
      if (e === f.boss) {
        if (e.dead) return;
        FX.burst(x, y, { n: 2, color: ['#fff', '#FFD23F'], speed: 180, life: 0.2, size: 3 });
        if (e.inv > 0) return;
        e.hp -= dmg; e.flash = 0.06; if (e.hp <= 0) { e.hp = 0; bossDie(e); }
        return;
      }
      if (e.dead) return;
      if (e.sh > 0) { e.sh -= dmg; e.shT = 0; FX.burst(x, y, { n: 3, color: '#9BE8FF', speed: 170, life: 0.2, size: 3 }); if (e.sh <= 0) { FX.ring(e.x, e.y, { r0: e.r, r1: e.r + 50, color: '#9BE8FF', w: 6 }); S.shield(); } return; }
      e.hp -= dmg; e.flash = 0.08; FX.burst(x, y, { n: 3, color: ['#fff', EN[e.type].c], speed: 170, life: 0.2, size: 3 });
      if (e.hp <= 0) kill(e);
    }
    function blastAt(x, y, dmg, r, except) {
      const f = st.f; FX.ring(x, y, { r0: 6, r1: r, color: '#FFB15E', w: 4, life: 0.22 });
      for (const e of f.en) if (e !== except && !e.dead && dist(x, y, e.x, e.y) < r + e.r) hurt(e, dmg, e.x, e.y);
      if (f.boss && f.boss !== except && !f.boss.dead && dist(x, y, f.boss.x, f.boss.y) < r + f.boss.r) hurt(f.boss, dmg, x, y);
    }
    function revive(s, frac) {
      s.down = false; s.hull = Math.max(1, s.max * frac); s.inv = 1.6; s.revT = 0;
      FX.ring(s.x, s.y, { r1: 90, color: COL[s.i], w: 8 }); FX.burst(s.x, s.y, { n: 20, color: [COL[s.i], '#fff'], speed: 260 });
      FX.text(s.x, s.y - 42, 'BACK IN!', { color: COL[s.i], size: 26 }); S.pickup(); E.buzz(s.i, 90);
    }
    function damage(s, d) {
      const f = st.f;
      if (s.down || s.inv > 0 || s.blinkT > 0 || f.done) return false;
      for (const o of st.run.ships) if (o.shieldT > 0 && !o.down && dist(o.x, o.y, s.x, s.y) < 95) return false;
      s.hull -= d; s.hitT = 0; s.inv = 0.4;
      FX.burst(s.x, s.y, { n: 10, color: [COL[s.i], '#fff', '#FF3860'], speed: 260, life: 0.35, size: 4 });
      E.shake(5); E.buzz(s.i, 70); S.hit(s.x);
      if (s.hull <= 0) {
        s.hull = 0; s.down = true; s.revT = 0;
        FX.burst(s.x, s.y, { n: 36, color: [COL[s.i], '#fff', '#FFD23F'], speed: 460, life: 0.9, size: 7 }); FX.ring(s.x, s.y, { r1: 150, color: '#fff', w: 9 });
        FX.text(s.x, s.y - 44, P[s.i].name + ' DOWN!', { color: COL[s.i], size: 30, life: 1.6 });
        E.buzz(s.i, 350); E.slow(0.4, 0.4); S.boom(s.x, true); E.shake(14);
      }
      return true;
    }
    function fire(s) {
      const f = st.f, m = s.mods, dmg = 9 * (1 + 0.12 * lv('power')) * (1 + 0.2 * (m.damage | 0));
      s.fireCd = 0.23 / (1 + 0.2 * (m.rapid | 0));
      let aim = s.ang, best = 0.42;
      const consider = (x, y) => {
        if (dist(x, y, s.x, s.y) > 680) return;
        const a = Math.atan2(y - s.y, x - s.x), df = Math.abs(((a - s.ang + Math.PI) % TAU + TAU) % TAU - Math.PI);
        if (df < best) { best = df; aim = a; }
      };
      for (const e of f.en) if (!e.dead) consider(e.x, e.y);
      if (f.boss && !f.boss.dead) consider(f.boss.x, f.boss.y);
      const mk = (a, mult) => { if (f.pb.length < 190) f.pb.push({ x: s.x + Math.cos(a) * 20, y: s.y + Math.sin(a) * 20, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, dmg: dmg * mult, life: 0.85, pierce: m.pierce | 0, blast: m.blast | 0, own: s.i, last: null, dead: false }); };
      mk(aim, 1);
      for (let q = 1; q <= (m.spread | 0); q++) { mk(aim + q * 0.15, 0.65); mk(aim - q * 0.15, 0.65); }
      for (let q = 0; q < (m.rear | 0); q++) mk(aim + Math.PI + (q ? 0.16 : 0), 0.8);
      FX.burst(s.x + Math.cos(aim) * 24, s.y + Math.sin(aim) * 24, { n: 2, color: ['#fff', COL[s.i]], ang: aim, spread: 0.5, speed: 220, life: 0.12, size: 3 });
      if (E.rt - st.shotT > 0.085) { st.shotT = E.rt; tone({ f: 780 + s.i * 90, f2: 280, d: 0.06, v: 0.05, type: 'square', pan: panX(s.x) }); }
    }
    function useAbility(s, p) {
      const f = st.f, cd = ABIL[s.abil].cd * (1 - 0.12 * lv('cool')) * Math.pow(0.8, s.mods.cooler | 0);
      s.abCd = cd; s.abMax = cd;
      if (s.abil === 'blink') {
        const an = p.mag > 0.25 ? Math.atan2(p.y, p.x) : s.ang, ox = s.x, oy = s.y;
        s.x = clamp(s.x + Math.cos(an) * 230, AX0, AX1); s.y = clamp(s.y + Math.sin(an) * 230, AY0, AY1);
        for (let k = 0; k <= 6; k++) FX.burst(lerp(ox, s.x, k / 6), lerp(oy, s.y, k / 6), { n: 2, color: [COL[s.i], '#fff'], speed: 40, life: 0.35, size: 6 });
        FX.ring(ox, oy, { r1: 46, color: COL[s.i], w: 4, life: 0.25 }); FX.ring(s.x, s.y, { r0: 46, r1: 8, color: '#fff', w: 4, life: 0.25 });
        s.blinkT = 0.3; s.vx = Math.cos(an) * 420; s.vy = Math.sin(an) * 420; S.dash(s.x);
      } else if (s.abil === 'shield') { s.shieldT = 2.5; S.shield(); FX.ring(s.x, s.y, { r1: 95, color: COL[s.i], w: 6 }); }
      else {
        const dmg = 16 * (1 + 0.12 * lv('power')) * (1 + 0.2 * (s.mods.damage | 0));
        for (let k = 0; k < 18; k++) { const a = k * TAU / 18; if (f.pb.length < 220) f.pb.push({ x: s.x, y: s.y, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, dmg, life: 0.6, pierce: 1, blast: 0, own: s.i, last: null, dead: false }); }
        for (const b of f.eb) if (dist(b.x, b.y, s.x, s.y) < 160) b.dead = true;
        FX.ring(s.x, s.y, { r1: 170, color: '#FFD23F', w: 10, life: 0.35 }); S.zap(s.x); S.boom(s.x, false); E.shake(7);
      }
      E.buzz(s.i, 30);
    }
    function updShip(s, p, dt) {
      const f = st.f, run = st.run, m = s.mods;
      if (s.down) {
        let near = false; for (const o of run.ships) if (!o.down && dist(o.x, o.y, s.x, s.y) < 78) near = true;
        s.revT = near ? s.revT + dt : Math.max(0, s.revT - dt * 0.6);
        if (near && Math.random() < 0.3) FX.burst(s.x + rand(-20, 20), s.y + rand(-20, 20), { n: 1, color: COL[s.i], speed: 60, life: 0.4, size: 3 });
        if (s.revT >= 2) revive(s, 0.35);
        return;
      }
      s.inv -= dt; s.hitT += dt; s.blinkT -= dt; s.shieldT -= dt; s.abCd -= dt; s.fireCd -= dt;
      const sp = 330 * (1 + 0.08 * lv('engine')) * (1 + 0.12 * (m.engine | 0)), k = 1 - Math.exp(-5.5 * dt);
      s.vx += (p.x * sp - s.vx) * k; s.vy += (p.y * sp - s.vy) * k;
      s.x = clamp(s.x + s.vx * dt, AX0, AX1); s.y = clamp(s.y + s.vy * dt, AY0, AY1);
      // While firing, the nose locks on to a foe roughly ahead, so you can strafe and back off while shooting it.
      let lock = null;
      if (p.a) {
        let best = 1.0;
        const see = o => { if (dist(o.x, o.y, s.x, s.y) > 700) return; const df = Math.abs(((Math.atan2(o.y - s.y, o.x - s.x) - s.ang + Math.PI) % TAU + TAU) % TAU - Math.PI); if (df < best) { best = df; lock = o; } };
        for (const e of f.en) if (!e.dead && e.age > 0.25) see(e);
        if (f.boss && !f.boss.dead && f.boss.intro <= 0) see(f.boss);
      }
      if (lock) s.ang = angLerp(s.ang, Math.atan2(lock.y - s.y, lock.x - s.x), 1 - Math.exp(-9 * dt));
      else if (p.mag > 0.25) s.ang = angLerp(s.ang, Math.atan2(p.y, p.x), 1 - Math.exp(-(p.a ? 6 : 14) * dt));
      s.lock = lock; s.fl = p.mag;
      if (p.mag > 0.3 && Math.random() < 0.5) FX.burst(s.x - Math.cos(s.ang) * 16, s.y - Math.sin(s.ang) * 16, { n: 1, color: [COL[s.i], '#fff'], ang: s.ang + Math.PI, spread: 0.4, speed: 150, life: 0.28, size: 3 });
      if (p.a && s.fireCd <= 0) fire(s);
      if (p.bp && s.abCd <= 0) useAbility(s, p);
      if (m.missile) {
        s.misCd -= dt;
        if (s.misCd <= 0 && nearestFoe(s.x, s.y, 900)) {
          s.misCd = 2.4 / m.missile;
          if (f.mis.length < 24) f.mis.push({ x: s.x, y: s.y, ang: s.ang + (Math.random() < 0.5 ? 0.9 : -0.9), life: 3, dmg: 24 * (1 + 0.12 * lv('power')), own: s.i, dead: false });
          S.whoosh(s.x);
        }
      }
      if (m.drone) {
        s.drA += dt * 2.4; s.drCd -= dt;
        if (s.drCd <= 0) {
          s.drCd = 0.75;
          for (let q = 0; q < m.drone; q++) {
            const a = s.drA + q * TAU / m.drone, dx = s.x + Math.cos(a) * 36, dy = s.y + Math.sin(a) * 36, e = nearestFoe(dx, dy, 520);
            if (!e || f.pb.length >= 200) continue;
            const an = Math.atan2(e.y - dy, e.x - dx);
            f.pb.push({ x: dx, y: dy, vx: Math.cos(an) * 700, vy: Math.sin(an) * 700, dmg: 4.5 * (1 + 0.12 * lv('power')), life: 0.8, pierce: 0, blast: 0, own: s.i, last: null, dead: false });
          }
        }
      }
      if (m.regen && s.hitT > 3 && s.hull < s.max) s.hull = Math.min(s.max, s.hull + 2.5 * m.regen * dt);
    }
    function mineBoom(mn, harm) {
      mn.dead = true;
      FX.burst(mn.x, mn.y, { n: 16, color: ['#FF3860', '#FFD23F', '#fff'], speed: 300, life: 0.4, size: 5 }); FX.ring(mn.x, mn.y, { r1: harm ? 95 : 50, color: '#FF3860', w: 6, life: 0.3 });
      S.boom(mn.x, false);
      if (harm) { E.shake(8); for (const s of st.run.ships) if (!s.down && dist(s.x, s.y, mn.x, mn.y) < 95) damage(s, 16 * SECT[st.run.sector].dmg); }
    }
    function updEnemy(e, dt) {
      const f = st.f, sec = SECT[st.run.sector];
      e.age += dt; e.flash -= dt; if (e.age < 0.25) return;
      const tg = nearestShip(e.x, e.y);
      let tx = tg ? tg.x - e.x : 0, ty = tg ? tg.y - e.y : 1; const td = Math.hypot(tx, ty) || 1; tx /= td; ty /= td;
      let ax = 0, ay = 0, sp = 100, k = 3; const toT = Math.atan2(ty, tx), lead = tg ? Math.atan2(tg.y + tg.vy * td / 270 * 0.6 - e.y, tg.x + tg.vx * td / 270 * 0.6 - e.x) : toT;
      switch (e.type) {
        case 'drone': { const w = td > 300 ? 1 : td < 190 ? -1 : 0; ax = tx * w - ty * 0.6 * e.dir; ay = ty * w + tx * 0.6 * e.dir; sp = 125; e.ang = angLerp(e.ang, toT, 1 - Math.exp(-6 * dt));
          e.cd -= dt; if (e.cd <= 0 && tg) { e.cd = rand(1.3, 2.0); shoot(e, lead, 270, 10); } break; }
        case 'kami': { ax = tx; ay = ty; sp = 300; k = 2.4; if (Math.abs(e.vx) + Math.abs(e.vy) > 5) e.ang = Math.atan2(e.vy, e.vx);
          if (tg && td < e.r + 18) { FX.ring(e.x, e.y, { r1: 70, color: '#FF3860', w: 6 }); damage(tg, 18 * sec.dmg); kill(e); return; } break; }
        case 'sniper': { const w = td < 380 ? -1 : td > 560 ? 0.6 : 0; ax = tx * w; ay = ty * w; sp = 95;
          if (e.st === 'idle') { e.ang = angLerp(e.ang, toT, 1 - Math.exp(-5 * dt)); e.cd -= dt; if (e.cd <= 0 && tg) { e.st = 'aim'; e.cd = 1.15; } }
          else { ax = ay = 0; if (e.cd > 0.3) e.ang = angLerp(e.ang, toT, 1 - Math.exp(-8 * dt)); e.cd -= dt; if (e.cd <= 0) { shoot(e, e.ang, 760, 20, 5); e.st = 'idle'; e.cd = rand(1.3, 2.2); S.zap(e.x); } }
          break; }
        case 'miner': { if (dist(e.x, e.y, e.wx, e.wy) < 40) { e.wx = rand(120, W - 120); e.wy = rand(120, H - 160); } const a = Math.atan2(e.wy - e.y, e.wx - e.x); ax = Math.cos(a); ay = Math.sin(a); sp = 85;
          e.cd -= dt; if (e.cd <= 0) { e.cd = 2.8; if (f.mines.length < 16) { f.mines.push({ x: e.x, y: e.y, age: 0, dead: false }); S.thud(e.x); } } break; }
        case 'carrier': { const a = Math.atan2(210 - e.y, W / 2 + Math.sin(e.age * 0.4 + e.seed) * 380 - e.x); ax = Math.cos(a); ay = Math.sin(a); sp = 45;
          e.shT += dt; if (e.shT > 3.5 && e.sh < e.shMax) e.sh = Math.min(e.shMax, Math.max(0, e.sh) + 20 * dt);
          e.cd -= dt; if (e.cd <= 0) { e.cd = 5.5; if (f.en.length + f.warps.length < 24) for (let q = 0; q < 2; q++) f.warps.push({ x: clamp(e.x + rand(-70, 70), 60, W - 60), y: clamp(e.y + rand(-70, 70), 90, H - 120), type: 'drone', t: 0.6, max: 0.6 }); } break; }
        case 'weaver': { const wv = Math.sin(e.age * 2.2 + e.seed), w = td < 210 ? -0.6 : 0.5; ax = tx * w - ty * wv; ay = ty * w + tx * wv; sp = 150; e.ang = angLerp(e.ang, toT, 1 - Math.exp(-6 * dt));
          e.cd -= dt; if (e.cd <= 0 && tg) { e.cd = 1.9; for (const o of [-0.22, 0, 0.22]) shoot(e, lead + o, 270, 10); } break; }
        case 'orb': { ax = tx; ay = ty; sp = 48; e.cd -= dt; if (e.cd <= 0) { e.cd = 2.8; const o = rand(TAU); for (let q = 0; q < 12; q++) shoot(e, o + q * TAU / 12, 175, 10); FX.ring(e.x, e.y, { r1: 60, color: '#FF7AF0', w: 4 }); } break; }
      }
      const kk = 1 - Math.exp(-k * dt); e.vx += (ax * sp - e.vx) * kk; e.vy += (ay * sp - e.vy) * kk;
      e.x = clamp(e.x + e.vx * dt, 30, W - 30); e.y = clamp(e.y + e.vy * dt, 76, H - 76);
      if (e.type !== 'kami') for (const s of st.run.ships) if (!s.down && dist(s.x, s.y, e.x, e.y) < e.r + 13) { if (damage(s, 12 * sec.dmg)) { const d = dist(s.x, s.y, e.x, e.y) || 1; s.vx += (s.x - e.x) / d * 320; s.vy += (s.y - e.y) / d * 320; } }
    }
    function updBoss(b, dt) {
      const f = st.f; b.flash -= dt; b.inv -= dt;
      if (b.dead) { b.alpha = Math.max(0, b.alpha - dt * 1.2); return; }
      if (b.intro > 0) { b.intro -= dt; b.y = lerp(b.y, 190, 1 - Math.exp(-3 * dt)); return; }
      const ph = b.hp < b.max * 0.33 ? 2 : b.hp < b.max * 0.66 ? 1 : 0;
      if (ph !== b.ph) {
        b.ph = ph; b.inv = 1; b.atk = null; b.beam = null; b.alpha = 1; b.cd = 1.2; f.eb.length = 0;
        FX.banner('PHASE ' + (ph + 1), { color: '#FF3860', size: 90, life: 1 }); FX.ring(b.x, b.y, { r1: 420, color: '#fff', w: 14, life: 0.6 }); E.shake(14); S.boom(b.x, true);
      }
      const tg = nearestShip(b.x, b.y), ta = tg ? Math.atan2(tg.y - b.y, tg.x - b.x) : Math.PI / 2;
      const charging = b.atk && b.atk.type === 'charge';
      if (!charging) {
        b.mt -= dt; if (b.mt <= 0) { b.mt = rand(2, 3.5); b.tx = rand(260, W - 260); b.ty = rand(150, 300); }
        const k = 1 - Math.exp(-1.2 * dt); b.vx += ((b.tx - b.x) * 0.8 - b.vx) * k; b.vy += ((b.ty - b.y) * 0.8 - b.vy) * k; b.x += b.vx * dt; b.y += b.vy * dt;
      }
      for (const s of st.run.ships) if (!s.down && dist(s.x, s.y, b.x, b.y) < b.r + 12 && b.alpha > 0.5) { const d = dist(s.x, s.y, b.x, b.y) || 1; damage(s, (charging ? 22 : 14) * SECT[b.sec].dmg); s.vx += (s.x - b.x) / d * 500; s.vy += (s.y - b.y) / d * 500; }
      if (!b.atk) { b.cd -= dt; if (b.cd <= 0) { const list = BOSS_ATK[b.sec][b.ph]; b.atk = { type: list[b.ai++ % list.length], t: 0, n: 0, a: ta }; } return; }
      const a = b.atk; a.t += dt; let end = false;
      switch (a.type) {
        case 'aimed': if (a.t >= a.n * 0.38) { a.n++; const c = 3 + b.ph * 2; for (let j = 0; j < c; j++) shoot(b, ta + (j - (c - 1) / 2) * 0.16, 320, 11); S.shoot(b.x); } if (a.n >= 3 + b.ph) end = true; break;
        case 'spiral': { const arms = 2 + (b.ph > 0 ? 1 : 0); while (a.n * 0.08 < a.t && a.n < 40) { a.n++; for (let j = 0; j < arms; j++) shoot(b, a.a + a.n * 0.19 + j * TAU / arms, 215, 11); } if (a.t > 2.6) end = true; break; }
        case 'ring': if (a.t >= 0.55 && a.n === 0) { a.n = 1; const c = 16 + 4 * b.ph; for (let j = 0; j < c; j++) shoot(b, j * TAU / c, 195, 11); S.boom(b.x, false); FX.ring(b.x, b.y, { r1: 140, color: '#FF5DA2', w: 6 }); }
          if (b.ph === 2 && a.t >= 1.0 && a.n === 1) { a.n = 2; for (let j = 0; j < 24; j++) shoot(b, (j + 0.5) * TAU / 24, 160, 11); } if (a.t > 1.3) end = true; break;
        case 'charge': if (a.t < 0.6) a.a = ta;
          if (a.t >= 0.9 && a.t < 1.4) { if (a.n === 0) { a.n = 1; S.whoosh(b.x); } b.x = clamp(b.x + Math.cos(a.a) * 880 * dt, 80, W - 80); b.y = clamp(b.y + Math.sin(a.a) * 880 * dt, 110, H - 110); FX.burst(b.x, b.y, { n: 2, color: ['#FF3860', '#FFD23F'], speed: 120, life: 0.4, size: 9 }); }
          if (a.t >= 1.4) { for (let j = 0; j < 12; j++) shoot(b, j * TAU / 12, 210, 11); b.tx = b.x; b.ty = Math.min(b.y, 320); b.vx = b.vy = 0; b.mt = 1.2; E.shake(9); S.thud(b.x); end = true; } break;
        case 'spawn': if (a.n === 0) { a.n = 1; const c = b.sec === 1 ? 4 + b.ph : 3; for (let j = 0; j < c; j++) { const an = rand(TAU); f.warps.push({ x: clamp(b.x + Math.cos(an) * 130, 60, W - 60), y: clamp(b.y + Math.sin(an) * 130, 90, H - 120), type: b.sec === 2 && j === 0 ? 'drone' : 'kami', t: 0.7, max: 0.7 }); } S.whoosh(b.x); } if (a.t > 0.8) end = true; break;
        case 'fan': while (a.n * 0.055 < a.t && a.n < 40) { a.n++; shoot(b, a.a + Math.sin(a.n * 0.055 * 3.5) * 0.9, 290, 11); } if (a.t > 1.8) end = true; break;
        case 'mines': if (a.n === 0) { a.n = 1; for (let j = 0; j < 5 + b.ph; j++) { const s = pick(st.run.ships), an = rand(TAU), d = rand(100, 210); if (f.mines.length < 20) f.mines.push({ x: clamp(s.x + Math.cos(an) * d, 50, W - 50), y: clamp(s.y + Math.sin(an) * d, 90, H - 90), age: 0, dead: false }); } S.thud(b.x); } if (a.t > 0.6) end = true; break;
        case 'beam': { let df = ((ta - a.a + Math.PI) % TAU + TAU) % TAU - Math.PI; a.a += clamp(df, -1, 1) * (a.t < 1 ? 1.4 : 0.42) * dt; b.beam = { ang: a.a, on: a.t >= 1, k: Math.min(1, a.t) };
          if (a.t >= 1) { if (a.n === 0) { a.n = 1; S.zap(b.x); S.nova(); E.shake(8); }
            const cx = Math.cos(a.a), cy = Math.sin(a.a);
            for (const s of st.run.ships) { if (s.down) continue; const px = s.x - b.x, py = s.y - b.y, along = px * cx + py * cy; if (along > 0 && Math.abs(px * cy - py * cx) < 22) damage(s, 18 * SECT[b.sec].dmg); } }
          if (a.t > 2.8) { b.beam = null; end = true; } break; }
        case 'teleport': if (a.t < 0.4) { b.alpha = 1 - a.t / 0.4; b.inv = 0.2; }
          else { if (a.n === 0) { a.n = 1; for (let q = 0; q < 20; q++) { b.x = rand(200, W - 200); b.y = rand(140, 330); if (st.run.ships.every(s => dist(s.x, s.y, b.x, b.y) > 280)) break; } b.tx = b.x; b.ty = b.y; b.vx = b.vy = 0; for (let j = 0; j < 14; j++) shoot(b, j * TAU / 14, 200, 11); FX.ring(b.x, b.y, { r1: 160, color: '#C77DFF', w: 8 }); S.zap(b.x); }
            b.alpha = Math.min(1, (a.t - 0.4) / 0.4); }
          if (a.t > 0.8) { b.alpha = 1; end = true; } break;
      }
      if (end) { b.atk = null; b.cd = [1.0, 0.75, 0.5][b.ph]; }
    }
    function updFight(dt) {
      const f = st.f, run = st.run, ships = run.ships; f.t += dt; run.time += dt;
      for (const s of ships) updShip(s, P[s.i], dt);
      if (!f.boss && !f.done) {
        f.waveT += dt;
        const clear = !f.en.length && !f.warps.length;
        if (f.wi < f.waves.length - 1) { if (clear) f.gap -= dt; if ((clear && f.gap <= 0) || f.waveT > 18) nextWave(); }
        else if (clear) { f.done = true; f.doneT = 0; f.eb.length = 0; f.mines.length = 0; FX.banner('CLEAR!', { color: '#FFD23F', size: 120, life: 1.1 }); S.power(); for (const s of ships) if (s.down) revive(s, 0.25); }
      }
      for (const w of f.warps) { w.t -= dt; if (w.t <= 0) { w.dead = true; if (!f.done) { f.en.push(mkEnemy(w.type, w.x, w.y, w.champ)); FX.ring(w.x, w.y, { r0: 40, r1: 6, color: EN[w.type].c, w: 4, life: 0.2 }); } } }
      f.warps = f.warps.filter(w => !w.dead);
      for (const e of f.en) if (!e.dead) updEnemy(e, dt);
      // gentle separation so enemies do not stack
      for (let i = 0; i < f.en.length; i++) for (let j = i + 1; j < f.en.length; j++) {
        const a = f.en[i], b = f.en[j], d = dist(a.x, a.y, b.x, b.y), md = a.r + b.r + 4;
        if (d < md && d > 0.01) { const o = (md - d) * 0.5, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; }
      }
      if (f.boss) updBoss(f.boss, dt);
      // player shots
      for (const b of f.pb) {
        if (b.dead) continue;
        b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { b.dead = true; continue; }
        let hit = null;
        for (const e of f.en) { if (e === b.last || e.dead || e.age < 0.25) continue; if (dist(b.x, b.y, e.x, e.y) < e.r + 6) { hit = e; break; } }
        if (!hit && f.boss && !f.boss.dead && f.boss !== b.last && f.boss.intro <= 0 && f.boss.alpha > 0.5 && dist(b.x, b.y, f.boss.x, f.boss.y) < f.boss.r + 4) hit = f.boss;
        if (!hit) { for (const mn of f.mines) if (!mn.dead && dist(b.x, b.y, mn.x, mn.y) < 17) { mineBoom(mn, false); b.dead = true; break; } continue; }
        hurt(hit, b.dmg, b.x, b.y);
        if (b.blast) blastAt(b.x, b.y, b.dmg * 0.4, 40 + b.blast * 16, hit);
        b.last = hit; if (b.pierce-- <= 0) b.dead = true;
      }
      f.pb = f.pb.filter(b => !b.dead);
      // missiles
      for (const m of f.mis) {
        m.life -= dt; const e = nearestFoe(m.x, m.y, 900);
        if (e) m.ang = angLerp(m.ang, Math.atan2(e.y - m.y, e.x - m.x), Math.min(1, 6 * dt));
        m.x += Math.cos(m.ang) * 430 * dt; m.y += Math.sin(m.ang) * 430 * dt;
        if (Math.random() < 0.6) FX.burst(m.x, m.y, { n: 1, color: ['#FF8A3D', '#fff'], speed: 20, life: 0.3, size: 4 });
        if (m.life <= 0) m.dead = true;
        else if (e && dist(m.x, m.y, e.x, e.y) < e.r + 9) { m.dead = true; hurt(e, m.dmg, m.x, m.y); blastAt(m.x, m.y, m.dmg * 0.4, 50, e); }
      }
      f.mis = f.mis.filter(m => !m.dead);
      // enemy shots
      for (const b of f.eb) {
        if (b.dead) continue;
        b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) { b.dead = true; continue; }
        for (const s of ships) {
          if (s.down) continue; const d = dist(b.x, b.y, s.x, s.y);
          if (s.shieldT > 0 && d < 95) { b.dead = true; FX.burst(b.x, b.y, { n: 3, color: COL[s.i], speed: 120, life: 0.2, size: 3 }); break; }
          if (d < b.r + 12 && damage(s, b.dmg)) { b.dead = true; break; }
        }
      }
      f.eb = f.eb.filter(b => !b.dead);
      // mines
      for (const mn of f.mines) {
        if (mn.dead) continue; mn.age += dt;
        if (mn.age > 14) { mn.dead = true; FX.burst(mn.x, mn.y, { n: 5, color: '#666f85', speed: 80, life: 0.3 }); continue; }
        if (mn.age > 0.9) for (const s of ships) if (!s.down && s.blinkT <= 0 && dist(s.x, s.y, mn.x, mn.y) < 62) { mineBoom(mn, true); break; }
      }
      f.mines = f.mines.filter(m => !m.dead);
      // scrap
      for (const d of f.drops) {
        d.age += dt; const k = Math.exp(-2.2 * dt); d.vx *= k; d.vy *= k;
        const s = nearestShip(d.x, d.y);
        if (s) {
          const dd = dist(d.x, d.y, s.x, s.y) || 1, R = f.done ? 2000 : 70 + 120 * (s.mods.magnet | 0);
          if (dd < R) { const pull = f.done ? 2600 : 1500; d.vx += (s.x - d.x) / dd * pull * dt; d.vy += (s.y - d.y) / dd * pull * dt; }
          if (dd < 28) { d.dead = true; run.scrap += d.val * (1 + 0.25 * (s.mods.magnet | 0)); if (E.rt - st.shotT > 0.04) tone({ f: 1300, f2: 1900, d: 0.04, v: 0.04, type: 'triangle', pan: panX(d.x) }); }
        }
        d.x = clamp(d.x + d.vx * dt, 20, W - 20); d.y = clamp(d.y + d.vy * dt, 66, H - 66);
        if (d.age > 25) d.dead = true;
      }
      f.drops = f.drops.filter(d => !d.dead);
      f.en = f.en.filter(e => !e.dead);
      if (f.done) {
        f.doneT += dt;
        if (f.doneT > 1.3) {
          for (const d of f.drops) run.scrap += d.val;
          const k = f.kind; run.scrap += k === 'boss' ? 70 : k === 'elite' ? 35 : 15;
          openReward(k === 'boss' ? 40 : k === 'elite' ? 16 : 8);
        }
      } else if (ships.every(s => s.down)) { f.failT += dt; if (f.failT > 1.5) endRun(false); }
    }

    // ------------------------------------------------------------ rewards, shop, events
    function openReward(dust) {
      const ships = st.run.ships, n = 3 + lv('choice');
      st.rw = { ch: ships.map(s => shuffle(freeMods(s)).slice(0, n)), cur: ships.map(() => 0), lock: ships.map(() => -1), doneT: 0, dust };
      st.rw.ch.forEach((c, i) => { if (!c.length) st.rw.lock[i] = -2; });
      st.mode = 'reward'; st.lock = 0.8;
    }
    function updReward(dt) {
      const rw = st.rw, ships = st.run.ships; let all = true;
      for (let i = 0; i < N; i++) {
        if (rw.lock[i] !== -1) continue; all = false;
        const p = P[i], n = rw.ch[i].length;
        if (p.nr) { rw.cur[i] = (rw.cur[i] + 1) % n; S.ui(); }
        if (p.nl) { rw.cur[i] = (rw.cur[i] + n - 1) % n; S.ui(); }
        if (p.ap && st.lock <= 0) { rw.lock[i] = rw.cur[i]; addMod(ships[i], rw.ch[i][rw.cur[i]]); S.pickup(); E.buzz(i, 50); }
      }
      if (all) { rw.doneT += dt; if (rw.doneT > 0.7) nodeDone(rw.dust); }
    }
    function openShop() {
      const sec = st.run.sector, ids = shuffle(MOD_IDS.slice()).slice(0, 3);
      st.shop = { items: [{ k: 'repair', price: 25 + 10 * sec }].concat(ids.map(id => ({ k: 'mod', id, price: 45 + 15 * sec + (Math.random() * 3 | 0) * 5, sold: -1 })), [{ k: 'leave' }]) };
      st.mode = 'shop'; st.cur = 0; st.lock = 0.5;
    }
    function updShop() {
      const sh = st.shop, run = st.run, n = sh.items.length;
      if (anyP('nd')) { st.cur = (st.cur + 1) % n; S.ui(); }
      if (anyP('nu')) { st.cur = (st.cur + n - 1) % n; S.ui(); }
      if (st.lock > 0) return;
      const who = whoP('ap'); if (who < 0) return;
      const it = sh.items[st.cur], s = run.ships[who];
      if (it.k === 'leave') { S.ok(); nodeDone(3); return; }
      if (it.k === 'mod' && it.sold >= 0) { note('SOLD OUT'); S.back(); return; }
      if (it.k === 'mod' && (s.mods[it.id] | 0) >= MODS[it.id].max) { note(P[who].name + ' ALREADY HAS IT MAXED'); S.back(); return; }
      if (it.k === 'repair' && run.ships.every(q => q.hull >= q.max)) { note('ALL SHIPS ARE AT FULL HULL'); S.back(); return; }
      if (run.scrap < it.price) { note('NOT ENOUGH SCRAP'); S.back(); E.shake(3); return; }
      run.scrap -= it.price; S.pickup(); E.buzz(who, 50);
      if (it.k === 'repair') { for (const q of run.ships) q.hull = Math.min(q.max, q.hull + 45); it.price += 10; note('REPAIRED +45 HULL'); }
      else { addMod(s, it.id); it.sold = who; note(P[who].name + ' FITS ' + MODS[it.id].name); }
    }
    const EVENTS = [
      { title: 'DERELICT FREIGHTER', text: 'A dead hauler drifts ahead, its holds still sealed.', opts: [['SALVAGE IT', 'Scrap inside. Maybe guards too'], ['FLY PAST', 'Grab a little loose scrap']],
        go(o) { const run = st.run; if (o === 0) { if (Math.random() < 0.65) { run.scrap += 60; return ['Jackpot. +60 scrap.']; } return ['It was a trap! Raiders warp in.', true]; } run.scrap += 12; return ['You scoop up 12 scrap and move on.']; } },
      { title: 'DISTRESS BEACON', text: 'A stranded engineer begs for a tow through the debris.', opts: [['HELP', 'Each ship: -15 hull, +1 module'], ['IGNORE', 'Nothing happens']],
        go(o) { if (o === 0) { for (const s of st.run.ships) { s.hull = Math.max(1, s.hull - 15); addMod(s, pick(freeMods(s))); } return ['The engineer bolts a module onto every ship.']; } return ['You fly on in silence.']; } },
      { title: 'ION STORM', text: 'A glittering storm blocks the lane. Stardust swirls inside.', opts: [['FLY THROUGH', 'Each ship: -20 hull. +10 stardust'], ['GO AROUND', 'Safe and slow']],
        go(o) { if (o === 0) { for (const s of st.run.ships) s.hull = Math.max(1, s.hull - 20); gainDust(10); return ['Rattled, but glittering. +10 stardust.']; } return ['The long way round. Nothing gained.']; } },
      { title: 'REPAIR SWARM', text: 'A cloud of friendly repair bots pings you.', opts: [['ACCEPT REPAIRS', '+35 hull for every ship'], ['SCRAP THEM', '+45 scrap']],
        go(o) { if (o === 0) { for (const s of st.run.ships) s.hull = Math.min(s.max, s.hull + 35); return ['Good as nearly new. +35 hull.']; } st.run.scrap += 45; return ['Harsh, but profitable. +45 scrap.']; } },
      { title: 'BLACK MARKET', text: 'A shady dealer offers unmarked crates.', opts: [['BUY (40 SCRAP)', 'A random module for every ship'], ['DECLINE', 'Keep your scrap']],
        go(o) { const run = st.run; if (o === 0) { if (run.scrap < 40) return ['Not enough scrap. The dealer laughs.']; run.scrap -= 40; for (const s of run.ships) addMod(s, pick(freeMods(s))); return ['Crates cracked open: a module each.']; } return ['Wise. Probably.']; } },
    ];
    function openEvent() { st.ev = { e: pick(EVENTS), res: null, amb: false, t: 0 }; st.mode = 'event'; st.cur = 0; st.lock = 0.6; }
    function updEvent(dt) {
      const ev = st.ev;
      if (ev.res) { ev.t += dt; if (ev.t > 2.2 || (ev.t > 0.6 && anyP('ap'))) { if (ev.amb) startFight('fight'); else nodeDone(3); } return; }
      if (anyP('nl') || anyP('nr') || anyP('nu') || anyP('nd')) { st.cur = 1 - st.cur; S.ui(); }
      if (st.lock <= 0 && anyP('ap')) { const r = ev.e.go(st.cur); ev.res = r[0]; ev.amb = !!r[1]; ev.t = 0; if (ev.amb) S.hurt(); else S.ok(); }
    }

    // ------------------------------------------------------------ hub and map input
    function updHub() {
      const n = UPG.length; let c = st.cur;
      if (anyP('nd')) c = c >= n ? c : (c + 2 < n ? c + 2 : n);
      if (anyP('nu')) c = c >= n ? n - 2 : (c - 2 >= 0 ? c - 2 : c);
      if (anyP('nl') && c < n && c % 2 === 1) c--;
      if (anyP('nr') && c < n && c % 2 === 0 && c + 1 < n) c++;
      if (c !== st.cur) { st.cur = c; S.ui(); }
      for (const p of P) if (p.bp) {
        const list = ['blink'].concat(lv('shield') ? ['shield'] : [], lv('burst') ? ['burst'] : []);
        if (list.length < 2) { note('UNLOCK MORE ABILITIES IN THE LIST'); S.back(); continue; }
        save.abil[p.i] = list[(list.indexOf(abilOf(p.i)) + 1) % list.length]; store(); S.ui();
      }
      if (st.lock > 0) return;
      const who = whoP('ap'); if (who < 0) return;
      if (st.cur >= n) { S.go(); startRun(); return; }
      const u = UPG[st.cur], l = lv(u.id);
      if (l >= u.cost.length) { note('ALREADY MAXED'); S.back(); }
      else if (save.dust < u.cost[l]) { note('NEED ' + (u.cost[l] - save.dust) + ' MORE STARDUST'); S.back(); E.shake(3); }
      else { save.dust -= u.cost[l]; save.up[u.id] = l + 1; store(); S.power(); E.buzz(who, 60); note(u.name + ' UPGRADED'); st.bought = st.cur; st.boughtT = 0.6; const r = cardRect(st.cur); FX.burst(r.x + r.w / 2, r.y + r.h / 2, { n: 26, color: ['#FFD23F', '#fff'], speed: 320, life: 0.6 }); }
    }
    function updMap(dt) {
      const run = st.run, opts = run.pos.next, nextCol = run.map.cols[run.pos.c + 1];
      if (st.hop > 0) { st.hop -= dt; if (st.hop <= 0) enterNode(st.hopNode); return; }
      if (st.lock > 0 || !nextCol) return;
      if (st.cur >= opts.length) st.cur = 0;
      if (anyP('nd') || anyP('nr')) { st.cur = (st.cur + 1) % opts.length; S.ui(); }
      else if (anyP('nu') || anyP('nl')) { st.cur = (st.cur + opts.length - 1) % opts.length; S.ui(); }
      if (anyP('ap')) { st.hopNode = nextCol[opts[st.cur]]; st.hop = 0.55; S.whoosh(W / 2); S.ok(); }
    }

    // ------------------------------------------------------------ drawing
    const cardRect = i => i >= UPG.length ? { x: 50, y: 566, w: 946, h: 76 } : { x: 50 + (i % 2) * 480, y: 126 + (i >> 1) * 86, w: 466, h: 76 };
    function panel(g, x, y, w, h, col, on) { rr(x, y, w, h, 16); g.fillStyle = on ? '#1b2444' : '#111730'; g.fill(); g.lineWidth = on ? 5 : 2; g.strokeStyle = on ? col : 'rgba(255,255,255,0.14)'; g.stroke(); }
    function shipHud(g, y) {
      const run = st.run, pw = N > 2 ? 380 : 420;
      for (let i = 0; i < N; i++) {
        const s = run.ships[i], x = N === 1 ? 24 : 24 + i * ((W - 48 - pw) / (N - 1));
        rr(x, y, pw, 48, 14); g.fillStyle = 'rgba(8,10,22,0.78)'; g.fill(); g.lineWidth = 2; g.strokeStyle = COL[i]; g.stroke();
        g.font = 'bold 15px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = COL[i]; g.fillText(P[i].name, x + 12, y + 14, 84);
        rr(x + 12, y + 26, 150, 13, 6); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill();
        const fr = clamp(s.hull / s.max, 0, 1);
        if (fr > 0) { rr(x + 12, y + 26, Math.max(10, 150 * fr), 13, 6); g.fillStyle = s.down ? '#666f85' : fr < 0.3 ? '#FF3860' : COL[i]; g.fill(); }
        txt(s.down ? 'DOWN' : Math.ceil(s.hull) + ' / ' + s.max, x + 162, y + 13, 12, s.down ? '#FF3860' : 'rgba(255,255,255,0.75)', { align: 'right' });
        // ability dial
        const ax = x + 196, ay = y + 24, rdy = s.abCd <= 0;
        g.fillStyle = rdy ? '#FFD23F' : 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(ax, ay, 16, 0, TAU); g.fill();
        if (!rdy) { g.fillStyle = 'rgba(255,210,63,0.55)'; g.beginPath(); g.moveTo(ax, ay); g.arc(ax, ay, 16, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - clamp(s.abCd / (s.abMax || 1), 0, 1))); g.closePath(); g.fill(); }
        txt('B', ax, ay + 1, 15, '#10131f');
        txt(ABIL[s.abil].name, ax + 22, ay + 1, 11, rdy ? '#FFD23F' : 'rgba(255,255,255,0.5)', { align: 'left' });
        let q = 0; const mx = x + 272, per = Math.floor((pw - 284) / 13);
        for (const id of MOD_IDS) for (let l = 0; l < (s.mods[id] | 0) && q < per * 3; l++, q++) { g.fillStyle = MODS[id].c; g.beginPath(); g.arc(mx + (q % per) * 13, y + 11 + Math.floor(q / per) * 13, 5, 0, TAU); g.fill(); }
      }
    }
    function topHud(g, mid) {
      const run = st.run;
      txt('SECTOR ' + (run.sector + 1) + '  ·  ' + SECT[run.sector].name, 24, 26, 18, 'rgba(255,255,255,0.8)', { align: 'left', stroke: 'rgba(8,10,22,0.8)' });
      if (mid) txt(mid, W / 2, 26, 18, 'rgba(255,255,255,0.8)', { stroke: 'rgba(8,10,22,0.8)' });
      txt('SCRAP ' + Math.floor(run.scrap), W - 150, 26, 20, '#B0B7C3', { align: 'right', stroke: 'rgba(8,10,22,0.8)' });
      txt('✦ ' + run.dust, W - 24, 26, 20, '#FFD23F', { align: 'right', stroke: 'rgba(8,10,22,0.8)' });
    }
    function drawHub(g) {
      const t = E.rt;
      g.drawImage(hubBg, 0, 0);
      txt('HANGAR', 50, 58, 52, '#fff', { align: 'left', stroke: '#0a0d18' });
      txt('STAR HOPPERS  ·  upgrades here are permanent', 52, 100, 15, 'rgba(255,255,255,0.55)', { align: 'left' });
      txt('Runs ' + save.runs + (save.wins ? '  ·  Wins ' + save.wins : ''), 690, 44, 16, 'rgba(255,255,255,0.7)', { align: 'right' });
      txt('Best: ' + (save.bestSector ? 'sector ' + save.bestSector + ', ' + save.bestNodes + ' nodes' : 'no runs yet'), 690, 70, 16, 'rgba(255,255,255,0.7)', { align: 'right' });
      rr(710, 26, 286, 66, 18); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#FFD23F'; g.stroke();
      txt('✦ ' + save.dust, 728, 60, 38, '#FFD23F', { align: 'left' }); txt('STARDUST', 982, 60, 14, 'rgba(255,255,255,0.6)', { align: 'right' });
      UPG.forEach((u, i) => {
        const r = cardRect(i), on = st.cur === i, l = lv(u.id), maxed = l >= u.cost.length, can = !maxed && save.dust >= u.cost[l], pop = st.bought === i && st.boughtT > 0 ? st.boughtT * 10 : 0;
        panel(g, r.x - pop, r.y - pop, r.w + pop * 2, r.h + pop * 2, '#FFD23F', on);
        txt(u.name, r.x + 16, r.y + 24, 19, on ? '#fff' : 'rgba(255,255,255,0.85)', { align: 'left' });
        txt(u.desc, r.x + 16, r.y + 52, 14, 'rgba(255,255,255,0.6)', { align: 'left' });
        for (let k = 0; k < u.cost.length; k++) { g.fillStyle = k < l ? '#FFD23F' : 'rgba(255,255,255,0.16)'; rr(r.x + r.w - 16 - (u.cost.length - k) * 17, r.y + 12, 13, 13, 3); g.fill(); }
        txt(maxed ? 'MAX' : '✦ ' + u.cost[l], r.x + r.w - 16, r.y + 52, 22, maxed ? '#4DE2C5' : can ? '#FFD23F' : '#FF7A8C', { align: 'right' });
      });
      const lr = cardRect(UPG.length), lon = st.cur >= UPG.length, pulse = lon ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
      rr(lr.x, lr.y, lr.w, lr.h, 22); g.fillStyle = lon ? '#FFD23F' : '#111730'; g.fill(); g.lineWidth = 4 + pulse * 3; g.strokeStyle = lon ? '#fff' : '#FFD23F'; g.stroke();
      txt('LAUNCH RUN ' + (save.runs + 1) + '  ▶', lr.x + lr.w / 2, lr.y + lr.h / 2 + 2, 34, lon ? '#10131f' : '#FFD23F');
      // pilots
      txt('PILOTS', 1128, 44, 18, 'rgba(255,255,255,0.7)');
      const ph = N > 2 ? 176 : 200;
      for (let i = 0; i < N; i++) {
        const y = 70 + i * (ph + 10), a = abilOf(i);
        panel(g, 1016, y, 224, ph, COL[i], false); g.strokeStyle = COL[i]; g.lineWidth = 3; rr(1016, y, 224, ph, 16); g.stroke();
        drawShip(g, 1128, y + 54 + Math.sin(t * 2 + i) * 4, -Math.PI / 2, i, { scale: 1.5, flame: 0.6 });
        g.font = 'bold 18px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = COL[i]; g.fillText(P[i].name, 1128, y + 104, 200);
        txt('ABILITY: ' + ABIL[a].name, 1128, y + 130, 15, '#FFD23F'); txt(ABIL[a].desc, 1128, y + 150, 12, 'rgba(255,255,255,0.55)');
        if (lv('shield') || lv('burst')) txt('B to swap', 1128, y + ph - 14, 12, 'rgba(255,255,255,0.45)');
      }
      if (st.noteT > 0) txt(st.note, W / 2 - 110, 678, 22, '#FFD23F', { stroke: '#0a0d18' });
      else txt('Stick: choose   ·   A: buy or launch   ·   B: swap your ability   ·   Stardust is kept when a run fails', W / 2 - 110, 678, 15, 'rgba(255,255,255,0.5)');
    }
    function nodeGlyph(g, n, x, y, r, col) {
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 4; g.lineCap = 'round';
      const L = (a, b, c, d) => { g.beginPath(); g.moveTo(x + a * r, y + b * r); g.lineTo(x + c * r, y + d * r); g.stroke(); };
      if (n.type === 'fight') { L(-0.45, -0.45, 0.45, 0.45); L(0.45, -0.45, -0.45, 0.45); }
      else if (n.type === 'elite') { L(-0.45, -0.3, 0.45, 0.5); L(0.45, -0.3, -0.45, 0.5); L(-0.5, -0.55, -0.2, -0.2); L(0.5, -0.55, 0.2, -0.2); }
      else if (n.type === 'shop') txt('$', x, y + 2, r * 1.2, col);
      else if (n.type === 'repair') { L(0, -0.5, 0, 0.5); L(-0.5, 0, 0.5, 0); }
      else if (n.type === 'mystery') txt('?', x, y + 2, r * 1.2, col);
      else if (n.type === 'boss') { g.beginPath(); g.moveTo(x - r * 0.6, y + r * 0.4); g.lineTo(x - r * 0.6, y - r * 0.35); g.lineTo(x - r * 0.25, y); g.lineTo(x, y - r * 0.5); g.lineTo(x + r * 0.25, y); g.lineTo(x + r * 0.6, y - r * 0.35); g.lineTo(x + r * 0.6, y + r * 0.4); g.closePath(); g.fill(); }
      else { g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill(); }
    }
    function drawMap(g) {
      const run = st.run, t = E.rt, cols = run.map.cols, pos = run.pos, opts = pos.next, nextCol = cols[pos.c + 1] || [];
      g.drawImage(bgs[run.sector], 0, 0); g.fillStyle = 'rgba(6,8,18,0.45)'; g.fillRect(0, 0, W, H);
      topHud(g, 'STAR MAP');
      txt('CHOOSE YOUR NEXT HOP', W / 2, 96, 34, '#fff', { stroke: '#0a0d18' });
      // edges
      for (let c = 0; c < cols.length - 1; c++) for (const n of cols[c]) for (const q of n.next) {
        const m = cols[c + 1][q], live = n === pos, sel = live && opts[st.cur] === q;
        g.strokeStyle = sel ? '#FFD23F' : live ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.13)'; g.lineWidth = sel ? 6 : live ? 3 : 2;
        g.setLineDash(sel ? [14, 10] : []); g.lineDashOffset = -t * 40; g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(m.x, m.y); g.stroke(); g.setLineDash([]);
      }
      for (const col of cols) for (const n of col) {
        const d = NODE[n.type], isNext = n.c === pos.c + 1 && opts.includes(n.r), sel = isNext && opts[st.cur] === n.r, r = (n.type === 'boss' ? 38 : 28) * (sel ? 1.15 + 0.06 * Math.sin(t * 8) : 1);
        const passed = n.c < pos.c || (n.c === pos.c && n !== pos);
        g.globalAlpha = passed ? 0.3 : isNext || n === pos ? 1 : 0.7;
        g.fillStyle = '#10131f'; g.beginPath(); g.arc(n.x, n.y, r, 0, TAU); g.fill(); g.lineWidth = sel ? 6 : 3; g.strokeStyle = sel ? '#fff' : d.c; g.stroke();
        nodeGlyph(g, n, n.x, n.y, r, d.c);
        if (n.type !== 'start') txt(d.name, n.x, n.y + r + 16, 12, sel ? '#fff' : 'rgba(255,255,255,0.6)');
        g.globalAlpha = 1;
      }
      // the fleet marker
      const hx = st.hop > 0 && st.hopNode ? lerp(st.hopNode.x, pos.x, st.hop / 0.55) : pos.x, hy = st.hop > 0 && st.hopNode ? lerp(st.hopNode.y, pos.y, st.hop / 0.55) : pos.y;
      for (let i = 0; i < N; i++) drawShip(g, hx - 6 + (i - (N - 1) / 2) * 4, hy - 44 + (i - (N - 1) / 2) * 16 + Math.sin(t * 3 + i) * 3, st.hop > 0 && st.hopNode ? Math.atan2(st.hopNode.y - pos.y, st.hopNode.x - pos.x) : 0, i, { scale: 0.75, flame: st.hop > 0 ? 1 : 0.4, mods: run.ships[i].mods });
      const sn = nextCol[opts[st.cur]];
      if (sn && st.hop <= 0) { const d = NODE[sn.type]; rr(W / 2 - 330, 566, 660, 60, 18); g.fillStyle = 'rgba(8,10,22,0.85)'; g.fill(); g.lineWidth = 3; g.strokeStyle = d.c; g.stroke();
        txt(d.name, W / 2 - 310, 596, 24, d.c, { align: 'left' }); txt(d.desc, W / 2 + 312, 596, 17, 'rgba(255,255,255,0.8)', { align: 'right' }); }
      txt('Stick: pick a route   ·   A: hop', W / 2, 134, 16, 'rgba(255,255,255,0.55)');
      shipHud(g, H - 62);
    }
    function drawFight(g) {
      const f = st.f, run = st.run, t = E.t, ships = run.ships;
      g.drawImage(bgs[run.sector], 0, 0);
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2; rr(AX0 - 16, AY0 - 16, AX1 - AX0 + 32, AY1 - AY0 + 32, 20); g.stroke();
      // scrap
      g.fillStyle = '#B0B7C3'; for (const d of f.drops) { g.save(); g.translate(d.x, d.y); g.rotate(d.age * 5); g.fillRect(-4, -4, 8, 8); g.restore(); }
      // mines
      for (const mn of f.mines) { const armed = mn.age > 0.9; g.fillStyle = '#39424f'; g.beginPath(); g.arc(mn.x, mn.y, 12, 0, TAU); g.fill(); g.fillStyle = armed ? (Math.sin(t * 14) > 0 ? '#FF3860' : '#7a1c2c') : '#FFD23F'; g.beginPath(); g.arc(mn.x, mn.y, 5, 0, TAU); g.fill();
        if (armed) { g.strokeStyle = 'rgba(255,56,96,0.22)'; g.lineWidth = 2; g.beginPath(); g.arc(mn.x, mn.y, 62, 0, TAU); g.stroke(); } }
      // warp-ins
      for (const w of f.warps) { const k = w.t / w.max, c = EN[w.type].c; g.strokeStyle = c; g.lineWidth = 3; g.globalAlpha = 0.4 + 0.6 * (1 - k); g.beginPath(); g.arc(w.x, w.y, 10 + k * 46, 0, TAU); g.stroke();
        g.beginPath(); g.arc(w.x, w.y, 6 + (1 - k) * EN[w.type].r, t * 9, t * 9 + 4); g.stroke(); g.globalAlpha = 1; }
      // sniper aim lines
      for (const e of f.en) if (e.type === 'sniper' && e.st === 'aim') { const hot = e.cd < 0.3; g.strokeStyle = hot ? '#FF3860' : '#FFD23F'; g.lineWidth = hot ? 4 : 2; g.globalAlpha = hot ? 0.9 : 0.25 + 0.4 * (1 - e.cd / 1.15);
        g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.ang) * 1500, e.y + Math.sin(e.ang) * 1500); g.stroke(); g.globalAlpha = 1; }
      // boss telegraphs
      const b = f.boss;
      if (b && !b.dead && b.atk) {
        const a = b.atk;
        if (a.type === 'charge' && a.t < 0.9) { g.save(); g.translate(b.x, b.y); g.rotate(a.a); g.fillStyle = '#FF3860'; g.globalAlpha = 0.12 + 0.3 * (a.t / 0.9); g.fillRect(0, -b.r * 0.8, 1500, b.r * 1.6); g.restore(); g.globalAlpha = 1; }
        if (a.type === 'ring' && a.t < 0.55) { g.strokeStyle = '#FF5DA2'; g.lineWidth = 5; g.globalAlpha = 0.7; g.beginPath(); g.arc(b.x, b.y, b.r + 10 + (a.t / 0.55) * 40, 0, TAU); g.stroke(); g.globalAlpha = 1; }
      }
      if (b && b.beam && !b.dead) {
        g.save(); g.translate(b.x, b.y); g.rotate(b.beam.ang);
        if (b.beam.on) { g.globalCompositeOperation = 'lighter'; g.fillStyle = '#C77DFF'; g.globalAlpha = 0.5; g.fillRect(0, -24 - Math.sin(t * 40) * 3, 1600, 48 + Math.sin(t * 40) * 6); g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillRect(0, -8, 1600, 16); }
        else { g.fillStyle = '#FF7AF0'; g.globalAlpha = 0.2 + 0.5 * b.beam.k; g.fillRect(0, -2, 1600, 4); }
        g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      for (const e of f.en) drawEnemy(g, e, t);
      if (b && b.alpha > 0.01) { const tg = nearestShip(b.x, b.y), dd = tg ? dist(tg.x, tg.y, b.x, b.y) || 1 : 1; drawBoss(g, b, t, tg ? { x: (tg.x - b.x) / dd, y: (tg.y - b.y) / dd } : { x: 0, y: 1 }); g.globalAlpha = 1; }
      // ships
      for (const s of ships) {
        if (s.down) {
          g.globalAlpha = 0.7; drawShip(g, s.x, s.y, s.ang + 0.6, s.i, { wreck: true, mods: s.mods, scale: 1.3 }); g.globalAlpha = 1;
          g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 4; g.beginPath(); g.arc(s.x, s.y, 40, 0, TAU); g.stroke();
          g.strokeStyle = COL[s.i]; g.lineWidth = 6; g.beginPath(); g.arc(s.x, s.y, 40, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(s.revT / 2, 0, 1)); g.stroke();
          txt('REVIVE', s.x, s.y - 54, 14, COL[s.i], { stroke: '#0a0d18' });
          continue;
        }
        const hurtFlick = s.inv > 0 && s.blinkT <= 0 && !f.done && Math.sin(E.rt * 40) > 0;
        for (let q = 0; q < (s.mods.drone | 0); q++) { const a = s.drA + q * TAU / s.mods.drone; g.fillStyle = '#C77DFF'; g.beginPath(); g.arc(s.x + Math.cos(a) * 36, s.y + Math.sin(a) * 36, 6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x + Math.cos(a) * 36, s.y + Math.sin(a) * 36, 2.5, 0, TAU); g.fill(); }
        if (s.blinkT > 0) g.globalAlpha = 0.5; else if (hurtFlick) g.globalAlpha = 0.35;
        drawShip(g, s.x, s.y, s.ang, s.i, { mods: s.mods, flame: s.fl, scale: 1.3 }); g.globalAlpha = 1;
        if (s.shieldT > 0) { g.strokeStyle = COL[s.i]; g.lineWidth = 4; g.globalAlpha = s.shieldT < 0.6 ? 0.4 + 0.4 * Math.sin(t * 30) : 0.8; g.beginPath(); g.arc(s.x, s.y, 95, 0, TAU); g.stroke(); g.globalAlpha = 0.1; g.fillStyle = COL[s.i]; g.fill(); g.globalAlpha = 1; }
        if (s.hull < s.max * 0.3 && Math.sin(t * 10) > 0) { g.strokeStyle = '#FF3860'; g.lineWidth = 2; g.beginPath(); g.arc(s.x, s.y, 28, 0, TAU); g.stroke(); }
        txt(P[s.i].name, s.x, s.y - 40, 12, COL[s.i], { stroke: '#0a0d18' });
        if (s.lock && !s.lock.dead) { const o = s.lock, rr2 = o.r + 9; g.strokeStyle = COL[s.i]; g.lineWidth = 2.5; g.globalAlpha = 0.8; for (let q = 0; q < 4; q++) { const a = t * 2 + q * TAU / 4 + s.i; g.beginPath(); g.arc(o.x, o.y, rr2, a, a + 0.7); g.stroke(); } g.globalAlpha = 1; }
      }
      // shots: batched per colour
      g.lineCap = 'round';
      for (let i = 0; i < N; i++) { g.strokeStyle = COL[i]; g.lineWidth = 5; g.beginPath(); for (const p of f.pb) if (p.own === i) { g.moveTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); g.lineTo(p.x, p.y); } g.stroke(); }
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); for (const p of f.pb) { g.moveTo(p.x - p.vx * 0.012, p.y - p.vy * 0.012); g.lineTo(p.x, p.y); } g.stroke();
      for (const m of f.mis) { g.save(); g.translate(m.x, m.y); g.rotate(m.ang); g.fillStyle = '#FF8A3D'; g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, -5); g.lineTo(-6, 5); g.closePath(); g.fill(); g.restore(); }
      g.fillStyle = '#FF5DA2'; g.beginPath(); for (const p of f.eb) { g.moveTo(p.x + p.r + 2, p.y); g.arc(p.x, p.y, p.r + 2, 0, TAU); } g.fill();
      g.fillStyle = '#fff'; g.beginPath(); for (const p of f.eb) { g.moveTo(p.x + p.r * 0.55, p.y); g.arc(p.x, p.y, p.r * 0.55, 0, TAU); } g.fill();
      FX.draw(g);
      // HUD
      topHud(g, b ? '' : f.wi >= 0 ? 'WAVE ' + (f.wi + 1) + ' / ' + f.waves.length : '');
      if (b && b.intro <= 0) {
        rr(W / 2 - 300, 44, 600, 20, 10); g.fillStyle = 'rgba(8,10,22,0.8)'; g.fill();
        const fr = clamp(b.hp / b.max, 0, 1); if (fr > 0) { rr(W / 2 - 300, 44, Math.max(20, 600 * fr), 20, 10); g.fillStyle = b.flash > 0 ? '#fff' : '#FF3860'; g.fill(); }
        g.fillStyle = 'rgba(8,10,22,0.9)'; g.fillRect(W / 2 - 300 + 198, 44, 3, 20); g.fillRect(W / 2 - 300 + 396, 44, 3, 20);
        txt(b.name, W / 2, 26, 20, '#fff', { stroke: 'rgba(8,10,22,0.8)' });
      }
      shipHud(g, H - 58);
    }
    function dimBg(g) { g.drawImage(bgs[st.run.sector], 0, 0); g.fillStyle = 'rgba(6,8,18,0.72)'; g.fillRect(0, 0, W, H); }
    function drawReward(g) {
      const rw = st.rw, ships = st.run.ships, t = E.rt;
      dimBg(g); topHud(g, '');
      txt('CHOOSE A MODULE EACH', W / 2, 78, 40, '#FFD23F', { stroke: '#0a0d18' });
      const rowH = N > 2 ? 158 : 210, y0 = 118; const waiting = [];
      for (let i = 0; i < N; i++) {
        const y = y0 + i * (rowH + 14), ch = rw.ch[i], n = ch.length || 1, cw = (1000 - (n - 1) * 14) / n, locked = rw.lock[i] !== -1;
        if (!locked) waiting.push(P[i].name);
        drawShip(g, 110, y + rowH / 2 - 18, -Math.PI / 2, i, { scale: 1.4, mods: ships[i].mods, flame: 0.5 });
        g.font = 'bold 18px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = COL[i]; g.fillText(P[i].name, 110, y + rowH / 2 + 34, 170);
        txt(locked ? 'READY' : 'stick + A', 110, y + rowH / 2 + 58, 13, locked ? '#FFD23F' : 'rgba(255,255,255,0.5)');
        if (!ch.length) { txt('Every module is already maxed!', 740, y + rowH / 2, 22, 'rgba(255,255,255,0.6)'); continue; }
        ch.forEach((id, q) => {
          const d = MODS[id], x = 230 + q * (cw + 14), sel = locked ? rw.lock[i] === q : rw.cur[i] === q, l = ships[i].mods[id] | 0, was = locked && sel ? l - 1 : l;
          g.globalAlpha = locked && !sel ? 0.25 : 1;
          const bob = sel && !locked ? Math.sin(t * 8) * 3 : 0;
          rr(x, y + bob, cw, rowH, 16); g.fillStyle = sel ? '#1b2444' : '#111730'; g.fill(); g.lineWidth = sel ? 6 : 2; g.strokeStyle = sel ? COL[i] : 'rgba(255,255,255,0.14)'; g.stroke();
          modIcon(g, id, x + 44, y + bob + (N > 2 ? 46 : 56), N > 2 ? 1.7 : 2.1);
          g.font = 'bold ' + (N > 2 ? 19 : 22) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = d.c; g.fillText(d.name, x + 86, y + bob + (N > 2 ? 36 : 44), cw - 98);
          txt('Lv ' + was + '  →  ' + (was + 1), x + 86, y + bob + (N > 2 ? 62 : 74), 14, 'rgba(255,255,255,0.6)', { align: 'left' });
          g.font = (N > 2 ? 15 : 17) + 'px ' + FONT; g.fillStyle = 'rgba(255,255,255,0.88)'; g.textAlign = 'left'; g.fillText(d.desc, x + 18, y + bob + rowH - (N > 2 ? 44 : 64), cw - 32);
          if (locked && sel) txt('TAKEN', x + cw - 16, y + bob + rowH - 20, 16, '#FFD23F', { align: 'right' });
          g.globalAlpha = 1;
        });
      }
      txt(waiting.length ? 'Waiting for ' + waiting.join(' and ') + '…' : 'Locked in!', W / 2, H - 82, 20, 'rgba(255,255,255,0.75)');
      shipHud(g, H - 58);
    }
    function drawShop(g) {
      const sh = st.shop, run = st.run;
      dimBg(g); topHud(g, '');
      txt('SCRAPYARD SHOP', W / 2, 84, 44, '#FFD23F', { stroke: '#0a0d18' });
      txt('Whoever presses A buys the module for their own ship', W / 2, 124, 17, 'rgba(255,255,255,0.65)');
      sh.items.forEach((it, i) => {
        const y = 152 + i * 86, on = st.cur === i, x = 240, w = 800;
        panel(g, x, y, w, 74, '#FFD23F', on);
        if (it.k === 'leave') { txt('LEAVE THE SHOP  ▶', x + w / 2, y + 38, 26, on ? '#fff' : 'rgba(255,255,255,0.7)'); return; }
        if (it.k === 'repair') { g.strokeStyle = '#4DE2C5'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 46, y + 22); g.lineTo(x + 46, y + 52); g.moveTo(x + 31, y + 37); g.lineTo(x + 61, y + 37); g.stroke();
          txt('REPAIR ALL SHIPS', x + 92, y + 26, 22, '#4DE2C5', { align: 'left' }); txt('+45 hull for everyone', x + 92, y + 52, 15, 'rgba(255,255,255,0.7)', { align: 'left' }); }
        else { const d = MODS[it.id]; g.globalAlpha = it.sold >= 0 ? 0.35 : 1; modIcon(g, it.id, x + 46, y + 37, 1.6); txt(d.name, x + 92, y + 26, 22, d.c, { align: 'left' }); txt(d.desc, x + 92, y + 52, 15, 'rgba(255,255,255,0.7)', { align: 'left' }); g.globalAlpha = 1; }
        if (it.sold >= 0) txt('SOLD TO ' + P[it.sold].name, x + w - 20, y + 38, 18, COL[it.sold], { align: 'right' });
        else txt(it.price + ' SCRAP', x + w - 20, y + 38, 24, run.scrap >= it.price ? '#FFD23F' : '#FF7A8C', { align: 'right' });
      });
      if (st.noteT > 0) txt(st.note, W / 2, H - 82, 22, '#FFD23F', { stroke: '#0a0d18' });
      shipHud(g, H - 58);
    }
    function drawEvent(g) {
      const ev = st.ev, e = ev.e;
      dimBg(g); topHud(g, '');
      panel(g, 190, 110, 900, 470, '#C77DFF', true);
      txt('UNKNOWN SIGNAL', W / 2, 150, 16, '#C77DFF'); txt(e.title, W / 2, 198, 46, '#fff', { stroke: '#0a0d18' });
      txt(e.text, W / 2, 258, 22, 'rgba(255,255,255,0.85)');
      if (ev.res) { txt(ev.res, W / 2, 380, 30, ev.amb ? '#FF3860' : '#FFD23F', { stroke: '#0a0d18' }); txt(ev.amb ? 'Battle stations!' : 'A to continue', W / 2, 520, 18, 'rgba(255,255,255,0.6)'); }
      else {
        e.opts.forEach((o, i) => { const x = 230 + i * 420, on = st.cur === i; panel(g, x, 320, 400, 170, '#FFD23F', on); txt(o[0], x + 200, 380, 28, on ? '#FFD23F' : '#fff'); txt(o[1], x + 200, 430, 16, 'rgba(255,255,255,0.7)'); });
        txt('Stick: choose   ·   A: confirm', W / 2, 540, 16, 'rgba(255,255,255,0.5)');
      }
      shipHud(g, H - 58);
    }
    function drawRepair(g) {
      dimBg(g); topHud(g, '');
      txt('REPAIR BAY', W / 2, 220, 70, '#4DE2C5', { stroke: '#0a0d18' }); txt('Every ship patched up: +50% hull', W / 2, 290, 24, '#fff');
      for (let i = 0; i < N; i++) drawShip(g, W / 2 + (i - (N - 1) / 2) * 180, 420 + Math.sin(E.rt * 3 + i) * 6, -Math.PI / 2, i, { scale: 2.2, mods: st.run.ships[i].mods, flame: 0.4 });
      shipHud(g, H - 58);
    }
    function drawSummary(g) {
      const s = st.sum, t = E.rt;
      g.drawImage(hubBg, 0, 0); g.fillStyle = 'rgba(6,8,18,0.5)'; g.fillRect(0, 0, W, H);
      panel(g, 240, 70, 800, 580, s.win ? '#FFD23F' : '#FF5D73', true);
      txt(s.win ? 'GALAXY SAVED!' : 'RUN OVER', W / 2, 136, 72, s.win ? '#FFD23F' : '#FF5D73', { stroke: '#0a0d18' });
      if (s.best) txt('NEW BEST RUN', W / 2, 190, 22, '#4DE2C5');
      const rows = [['Reached', 'Sector ' + s.sector + ' of ' + SECT.length], ['Nodes cleared', s.nodes], ['Enemies destroyed', s.kills], ['Modules collected', s.mods], ['Flight time', Math.floor(s.time / 60) + ':' + ('0' + Math.floor(s.time % 60)).slice(-2)]];
      rows.forEach((r, i) => { txt(r[0], 360, 244 + i * 44, 24, 'rgba(255,255,255,0.7)', { align: 'left' }); txt(String(r[1]), 920, 244 + i * 44, 26, '#fff', { align: 'right' }); });
      txt('+ ' + s.dust + ' STARDUST  ✦', W / 2, 500, 50 + Math.sin(t * 5) * 2, '#FFD23F', { stroke: '#0a0d18' });
      txt('You keep it. Total: ✦ ' + save.dust, W / 2, 548, 20, 'rgba(255,255,255,0.75)');
      if (st.lock <= 0) { g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); txt('PRESS  A  FOR THE HANGAR', W / 2, 606, 28, '#fff', { stroke: '#0a0d18' }); g.globalAlpha = 1; }
    }

    return {
      // test handle: state, save, and shortcuts to a boss or node type
      _dbg: { st, save: () => save, startRun, startFight, enterNode, boss(sec) { if (!st.run) startRun(); st.run.sector = sec; st.run.map = genMap(); st.run.pos = st.run.map.cols[6][0]; FX.clear(); startFight('boss'); },
        node(type) { if (!st.run) startRun(); const n = st.run.map.cols[2][0]; n.type = type; enterNode(n); }, give(i, id) { addMod(st.run.ships[i], id); } },
      update(dt) {
        st.t += dt; st.lock -= dt; st.noteT -= dt; st.boughtT -= dt;
        if (st.padMode !== st.mode) { st.padMode = st.mode; pads(); }
        switch (st.mode) {
          case 'hub': updHub(); break;
          case 'map': updMap(dt); break;
          case 'fight': updFight(dt); break;
          case 'reward': updReward(dt); break;
          case 'shop': updShop(); break;
          case 'event': updEvent(dt); break;
          case 'repair': st.repT += dt; if (st.repT > 1.7 || (st.repT > 0.5 && anyP('ap'))) nodeDone(3); break;
          case 'summary': if (st.lock <= 0 && anyP('ap')) { st.mode = 'hub'; st.run = null; st.cur = UPG.length; st.lock = 0.4; FX.clear(); S.ok(); } break;
        }
        FX.update(dt);
      },
      draw(g) {
        switch (st.mode) {
          case 'hub': drawHub(g); break;
          case 'map': drawMap(g); break;
          case 'fight': drawFight(g); break;
          case 'reward': drawReward(g); break;
          case 'shop': drawShop(g); break;
          case 'event': drawEvent(g); break;
          case 'repair': drawRepair(g); break;
          case 'summary': drawSummary(g); break;
        }
        if (st.mode !== 'fight') FX.draw(g);
        FX.drawText(g);
      },
    };
  }

  GAMES.push({
    id: 'hop', name: 'STAR HOPPERS', tag: 'CO-OP', rogue: true, color: '#C77DFF',
    tagline: 'Hop the star map. Upgrade. Go further.',
    pad: { a: 'FIRE', b: 'ABILITY', stick: 'FLY' },
    how: { goal: 'Beat 3 sector bosses. Stardust buys permanent upgrades',
      rows: [['STICK', 'Fly, and pick routes and upgrades'], ['A', 'Hold to fire ahead. Your nose locks on'], ['B', 'Ship ability: blink through shots']],
      tips: ['Hover over a downed partner for 2 seconds to revive them', 'Stardust is kept even when a run fails. Spend it in the hangar'] },
    song: { bpm: 128, root: 45, minor: true, prog: [0, 5, 3, 6], kick: 'x---x---x---x---', snare: '----x-------x---', hat: 'x-xxx-xxx-xxx-xx', bass: 'x-x-x-o-x-x-x-o-', arp: '0-23-1-30-21-3-2', arpWave: 'sawtooth' },
    icon(g, t) {
      const pts = [[-96, 22], [-40, -22], [-40, 34], [22, -4], [84, -4]];
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
      for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]) { g.beginPath(); g.moveTo(pts[a][0], pts[a][1]); g.lineTo(pts[b][0], pts[b][1]); g.stroke(); }
      pts.forEach((p, i) => { g.fillStyle = '#10131f'; g.strokeStyle = i === 4 ? '#FF3860' : i === 3 ? '#FFD23F' : '#C77DFF'; g.lineWidth = 3; g.beginPath(); g.arc(p[0], p[1], i === 4 ? 15 : 10, 0, TAU); g.fill(); g.stroke(); });
      const k = (t * 0.5) % 1, ax = lerp(pts[0][0], pts[1][0], k), ay = lerp(pts[0][1], pts[1][1], k);
      for (let i = 0; i < E.players.length; i++) drawShip(g, ax + 4 - i * 20, ay - 22 + i * 14 + Math.sin(t * 4 + i) * 2, -0.65, i, { scale: 0.62, flame: 0.8 });
    },
    create,
  });
})();
