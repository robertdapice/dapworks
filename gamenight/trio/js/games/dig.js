'use strict';
// DEEP DIG — co-op rogue-lite. Drill down together, haul ore back before the air runs out,
// spend the cash on permanent upgrades, dig deeper next shift. Progress is saved.
(function () {
  const TS = 40, GW = 32, SURF = 6, CORE_D = 300, GH = SURF + CORE_D + 16, PR = 15;
  const EMPTY = 0, DIRT = 1, ROCK = 2, GRANITE = 3, OBSID = 4, DIAM = 5, GAS = 6, LAVA = 7, BOULDER = 8, BED = 9, ORE = 10;
  const TIME = [0, 0.32, 0.95, 1.2, 1.5, 1.8, 0.32, 0, 1.0, 0], HARD = [0, 1, 1, 2, 3, 4, 1, 9, 1, 9];
  const ORES = [
    { name: 'COPPER', col: '#f08a3c', val: 5, hard: 1, time: 0.5 },
    { name: 'SILVER', col: '#e6eef8', val: 12, hard: 1, time: 0.6 },
    { name: 'GOLD', col: '#ffd23f', val: 30, hard: 2, time: 0.8 },
    { name: 'RUBY', col: '#ff4d6d', val: 70, hard: 3, time: 1.0 },
    { name: 'CRYSTAL', col: '#6ff3ff', val: 150, hard: 4, time: 1.2 },
    { name: 'CORE SHARD', col: '#fff3a0', val: 400, hard: 4, time: 1.0 },
  ];
  const BANDS = [
    { from: 0, name: 'TOPSOIL', dirt: '#9b6a3c', dirt2: '#8f6036', rock: '#8f8a86', back: '#3b2616', unk: '#5c3f25', unk2: '#573b22' },
    { from: 40, name: 'SLATE BEDS', dirt: '#6d6f86', dirt2: '#65677d', rock: '#8b93a8', back: '#22253a', unk: '#3f4258', unk2: '#3b3e53' },
    { from: 100, name: 'AMETHYST DEEP', dirt: '#6a4c8c', dirt2: '#624684', rock: '#8a6fae', back: '#221436', unk: '#3c2858', unk2: '#382553' },
    { from: 180, name: 'MAGMA VEINS', dirt: '#7a3a34', dirt2: '#70342f', rock: '#9a5a4a', back: '#2a100e', unk: '#4a221e', unk2: '#451f1b' },
    { from: 260, name: 'CRYSTAL HOLLOWS', dirt: '#2f6f78', dirt2: '#2a6770', rock: '#4a97a0', back: '#0c2a30', unk: '#1d4a52', unk2: '#1a454d' },
  ];
  const bandOf = d => d < 40 ? 0 : d < 100 ? 1 : d < 180 ? 2 : d < 260 ? 3 : 4;
  const STN = [50, 120, 200];
  const UPG = [
    { id: 'drillPow', name: 'DRILL BIT', max: 3, cost: [120, 450, 1200], desc: l => ['Cuts dirt and rock', 'Cuts granite and gold', 'Cuts obsidian and ruby', 'Cuts diamond rock'][l] },
    { id: 'drillSpd', name: 'DRILL MOTOR', max: 5, cost: [50, 100, 190, 330, 520], desc: l => 'Drill speed +' + l * 18 + '%' },
    { id: 'engine', name: 'THRUSTERS', max: 5, cost: [50, 100, 180, 310, 480], desc: l => 'Pod speed +' + l * 12 + '%' },
    { id: 'tank', name: 'AIR TANK', max: 6, cost: [60, 110, 190, 300, 460, 680], desc: l => 'Air ' + (100 + l * 25) },
    { id: 'cargo', name: 'CARGO HOLD', max: 5, cost: [60, 120, 210, 340, 520], desc: l => 'Holds ' + (16 + l * 6) + ' ore' },
    { id: 'hull', name: 'HULL PLATING', max: 4, cost: [70, 160, 300, 520], desc: l => (3 + l) + ' hull points' },
    { id: 'dyn', name: 'DYNAMITE RACK', max: 4, cost: [50, 110, 200, 360], desc: l => (2 + l) + ' sticks each' },
    { id: 'sonar', name: 'SONAR', max: 4, cost: [40, 90, 170, 300], desc: l => 'Range ' + (7 + l * 2) + ' m, ' + (8 - l) + 's recharge' },
    { id: 'winch', name: 'WINCH INSURANCE', max: 2, cost: [150, 400], desc: l => 'Winch saves ' + [50, 65, 80][l] + '% of cargo' },
    { id: 'lift', name: 'LIFT STATION', max: 3, cost: [200, 600, 1500], desc: l => l ? 'Can start at ' + STN[l - 1] + ' m' : 'Start shifts deeper', need: l => STN[l] },
  ];
  const PERKS = [
    { id: 'turbo', name: 'TURBO BIT', desc: 'Drill 35% faster', col: '#FFD23F' },
    { id: 'feather', name: 'FEATHER ALLOY', desc: 'Pods fly 25% faster', col: '#35C2FF' },
    { id: 'rebreather', name: 'REBREATHER', desc: 'Air drains 25% slower', col: '#8fe9ff' },
    { id: 'sack', name: 'BIG SACK', desc: '+8 cargo space', col: '#c98845' },
    { id: 'lucky', name: 'LUCKY PICK', desc: '25% chance of double ore', col: '#ffd23f' },
    { id: 'appraiser', name: 'APPRAISER', desc: 'All ore worth 30% more', col: '#ff4d6d' },
    { id: 'patch', name: 'PATCH KIT', desc: 'Everyone repaired, +1 hull', col: '#FF5D73' },
    { id: 'crate', name: 'DYNAMITE CRATE', desc: '+3 dynamite each', col: '#FF8A3D' },
    { id: 'heat', name: 'HEAT SHIELD', desc: 'Lava cannot hurt you', col: '#ff6a1a' },
    { id: 'echo', name: 'ECHO STONE', desc: 'Free sonar ping every 6s', col: '#C77DFF' },
    { id: 'spray', name: 'PEST SPRAY', desc: 'Critters pop on touch', col: '#c06ad8' },
    { id: 'moss', name: 'AIR MOSS', desc: 'Tank refilled, bubbles give double', col: '#6ff3ff' },
  ];

  function drawPod(g, x, y, fa, i, o) {
    o = o || {};
    g.save(); g.translate(x, y);
    const al = (o.alpha || 1) * (o.wreck ? 0.9 : 1); g.globalAlpha = al;
    if (o.wreck) g.rotate(0.5);
    // drill
    g.save(); g.rotate(fa);
    g.fillStyle = '#c9ccd6'; g.beginPath(); g.moveTo(PR - 3, -9); g.lineTo(PR + 15, 0); g.lineTo(PR - 3, 9); g.closePath(); g.fill();
    g.strokeStyle = '#6b6f80'; g.lineWidth = 2;
    const sp = o.spin || 0;
    for (let k = 0; k < 3; k++) { const u = ((k / 3 + sp) % 1); g.beginPath(); g.moveTo(PR - 3 + u * 16, -9 * (1 - u)); g.lineTo(PR - 3 + u * 16, 9 * (1 - u)); g.stroke(); }
    if (o.thrust) { g.fillStyle = '#FFD23F'; g.globalAlpha = al * 0.8; g.beginPath(); g.moveTo(-PR + 2, -5); g.lineTo(-PR - 8 - Math.random() * 7, 0); g.lineTo(-PR + 2, 5); g.fill(); g.globalAlpha = al; }
    g.restore();
    g.fillStyle = o.wreck ? '#4a4f5e' : COLD[i]; g.beginPath(); g.arc(0, 0, PR, 0, TAU); g.fill();
    g.fillStyle = o.wreck ? '#6a7080' : COL[i]; g.beginPath(); g.arc(0, -1.5, PR - 2.5, 0, TAU); g.fill();
    g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(Math.cos(fa) * 4, Math.sin(fa) * 4 - 1, 7, 0, TAU); g.fill();
    g.fillStyle = o.wreck ? '#7a8090' : '#dff6ff'; g.beginPath(); g.arc(Math.cos(fa) * 4, Math.sin(fa) * 4 - 1, 5, 0, TAU); g.fill();
    g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(Math.cos(fa) * 6, Math.sin(fa) * 6 - 1, 2.2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-5, -8, 5, 2.5, -0.5, 0, TAU); g.fill();
    g.globalAlpha = 1; g.restore();
  }
  function drawOreIcon(g, x, y, o, s) {
    g.fillStyle = ORES[o].col; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.4, y - s * 0.2); g.lineTo(x - s * 0.5, y - s * 0.1); g.closePath(); g.fill();
  }

  function create() {
    const P = E.players, N = P.length;
    const save = Save.load('dig', { cash: 0, deepest: 0, runs: 0, bestHaul: 0, core: 0 });
    save.up = Object.assign({ drillPow: 0, drillSpd: 0, engine: 0, tank: 0, cargo: 0, hull: 0, dyn: 0, sonar: 0, winch: 0, lift: 0 }, save.up || {});
    for (const k of ['cash', 'deepest', 'runs', 'bestHaul', 'core']) save[k] = +save[k] || 0;
    const st = { phase: 'hub', t: 0, cur: UPG.length, startSel: 0, msg: '', msgT: 0, pop: -1, popT: 0, deny: -1, denyT: 0, sum: null, sumT: 0 };
    let grid = new Uint8Array(GW * GH), seen = new Uint8Array(GW * GH), dmg = new Float32Array(GW * GH), hv = new Uint8Array(GW * GH);
    let camY = 0, run = null, seed = 1;

    const tile = (c, r) => (c < 0 || c >= GW || r >= GH) ? BED : r < 0 ? EMPTY : grid[r * GW + c];
    const tileAt = (x, y) => tile(Math.floor(x / TS), Math.floor(y / TS));
    const banner = (txt2, o) => { FX.banners.length = 0; FX.banner(txt2, o); };   // one banner at a time
    const lvl = id => save.up[id] | 0;
    const perk = id => (run && run.perks[id]) | 0;
    const depthOf = y => Math.floor(y / TS) - SURF;
    const padCfg = hub => { E.setPads(hub ? { a: 'BUY / GO', b: '-', stick: 'CHOOSE' } : { a: 'DYNAMITE', b: 'SONAR', stick: 'FLY + DRILL' }, 'DEEP DIG'); };

    // ---------- world generation ----------
    function h2(x, y) { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
    function vnoise(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), sx), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), sx), sy);
    }
    function gen() {
      seed = (Math.random() * 1e9) | 0;
      grid.fill(EMPTY); seen.fill(0); dmg.fill(0);
      const ents = { bubbles: [], chests: [], critters: [] };
      for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
        const i = r * GW + c; hv[i] = (h2(c + 911, r + 77) * 256) | 0;
        if (r < SURF) continue;
        const d = r - SURF, b = bandOf(d);
        if (d > CORE_D) { grid[i] = BED; continue; }
        const n = vnoise(c * 0.24, r * 0.24), n2 = vnoise(c * 0.5 + 50, r * 0.5 + 9);
        let t = n > 0.62 - Math.min(0.14, d * 0.0008) ? ROCK : DIRT;
        if (d < 2) t = DIRT;
        const shelf = (d >= 40 && d <= 41) || (d >= 100 && d <= 101) || (d >= 180 && d <= 181) || (d >= 260 && d <= 261);
        if (b >= 1 && (n2 > 0.68 - b * 0.025 || (shelf && h2(c, r + 5000) < 0.86))) t = b === 1 ? GRANITE : b === 2 ? (n2 > 0.8 ? OBSID : GRANITE) : b === 3 ? OBSID : (n2 > 0.78 ? DIAM : OBSID);
        if ((t === DIRT || t === ROCK) && d > 10 && h2(c + 300, r) < 0.011 + Math.min(0.02, d * 0.0001)) t = GAS;
        else if ((t === DIRT || t === ROCK) && d > 8 && h2(c, r + 300) < 0.014) t = BOULDER;
        grid[i] = t;
      }
      const R = (a, b) => a + Math.random() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1));
      // ore clusters
      for (let k = 0; k < 205; k++) {
        const d = k < 20 ? RI(4, 39) : RI(6, CORE_D - 9), u = Math.random();
        const o = d < 40 ? (u < 0.72 ? 0 : 1) : d < 100 ? (u < 0.3 ? 0 : u < 0.75 ? 1 : 2) : d < 180 ? (u < 0.25 ? 1 : u < 0.75 ? 2 : 3) : d < 260 ? (u < 0.35 ? 2 : u < 0.8 ? 3 : 4) : (u < 0.4 ? 3 : 4);
        let c = RI(0, GW - 1), r = SURF + d;
        for (let s = RI(2, 5); s > 0; s--) {
          const t = tile(c, r); if (t >= DIRT && t <= DIAM) grid[r * GW + c] = ORE + o;
          if (Math.random() < 0.5) c = clamp(c + (Math.random() < 0.5 ? -1 : 1), 0, GW - 1); else r = clamp(r + (Math.random() < 0.5 ? -1 : 1), SURF + 2, SURF + CORE_D - 9);
        }
      }
      // lava pools
      for (let k = 0; k < 46; k++) {
        const d = RI(92, CORE_D - 12) , c0 = RI(1, GW - 6), w = RI(2, 5), hh = RI(1, 2);
        if (k % 3 && d < 180) continue;
        for (let r = SURF + d; r < SURF + d + hh; r++) for (let c = c0; c < c0 + w; c++) grid[r * GW + c] = LAVA;
      }
      // caves with bubbles / critters
      const carve = (cc, cr, rx, ry) => { for (let r = Math.floor(cr - ry); r <= cr + ry; r++) for (let c = Math.floor(cc - rx); c <= cc + rx; c++) { if (c < 0 || c >= GW || r < SURF + 3 || r >= SURF + CORE_D - 9) continue; const dx = (c - cc) / rx, dy = (r - cr) / ry; if (dx * dx + dy * dy <= 1) grid[r * GW + c] = EMPTY; } };
      for (let k = 0; k < 58; k++) {
        const d = k < 7 ? RI(6, 38) : RI(8, CORE_D - 14), cc = R(3, GW - 3), cr = SURF + d, rx = R(1.4, 3.4), ry = R(0.9, 1.9);
        carve(cc, cr, rx, ry);
        const x = (Math.floor(cc) + 0.5) * TS, y = (Math.floor(cr) + 0.5) * TS, u = Math.random();
        if (u < 0.48) ents.bubbles.push({ x, y, got: false, p: R(0, 6) });
        else if (u < 0.9 && d > 9) { const n = 1 + (Math.random() < 0.4 ? 1 : 0) + (d > 120 && Math.random() < 0.5 ? 1 : 0); for (let j = 0; j < n; j++) ents.critters.push({ x: x + R(-20, 20), y: y + R(-8, 8), vx: 0, vy: 0, type: d > 45 && Math.random() < 0.5 ? 1 : 0, awake: false, stun: 0, p: R(0, 6), dead: false }); }
      }
      // relic chests: one every ~24 m, the first early
      for (let d = 13 + RI(0, 4); d < CORE_D - 14; d += 22 + RI(0, 6)) {
        const cc = R(4, GW - 4), cr = SURF + d; carve(cc, cr, 1.5, 0.9);
        ents.chests.push({ x: (Math.floor(cc) + 0.5) * TS, y: (Math.floor(cr) + 0.5) * TS, open: false });
      }
      // lift stations and the core chamber
      for (const sd of STN) for (let r = SURF + sd; r <= SURF + sd + 2; r++) for (let c = 12; c <= 19; c++) grid[r * GW + c] = r === SURF + sd + 2 ? ROCK : (c === 12 || c === 19 ? ROCK : EMPTY);
      for (let r = SURF + CORE_D - 8; r < SURF + CORE_D; r++) for (let c = 5; c <= 26; c++) grid[r * GW + c] = EMPTY;
      for (let c = 0; c < GW; c++) { const r = SURF + CORE_D; grid[r * GW + c] = (c >= 13 && c <= 18) ? BED : (h2(c, 4242) < 0.55 ? ORE + 5 : BED); }
      for (let k = 0; k < 14; k++) { const c = RI(5, 26), r = SURF + CORE_D - RI(1, 2); if (c < 13 || c > 18) grid[r * GW + c] = ORE + 5; }
      // a boulder must start on something solid
      for (let r = SURF; r < GH - 1; r++) for (let c = 0; c < GW; c++) if (grid[r * GW + c] === BOULDER && grid[(r + 1) * GW + c] === EMPTY) grid[r * GW + c] = ROCK;
      ents.bubbles = ents.bubbles.filter(b => tileAt(b.x, b.y) === EMPTY); ents.chests = ents.chests.filter(b => tileAt(b.x, b.y) === EMPTY); ents.critters = ents.critters.filter(b => tileAt(b.x, b.y) === EMPTY);
      return ents;
    }

    // ---------- run ----------
    function startRun() {
      const ents = gen();
      const opts = startOptions(), sd = opts[clamp(st.startSel, 0, opts.length - 1)];
      const maxHp = 3 + lvl('hull');
      run = { pods: [], air: 100 + lvl('tank') * 25, airMax: 100 + lvl('tank') * 25, cargo: [0, 0, 0, 0, 0, 0], banked: [0, 0, 0, 0, 0, 0], perks: {}, bubbles: ents.bubbles, chests: ents.chests, critters: ents.critters,
        bombs: [], boulders: [], glints: [], wob: new Map(), wobT: 0, maxDepth: sd, startDepth: sd, armed: false, liftT: 0, holdT: 0, stnAir: [false, false, false, false], endKind: '', endT: 0, coreDone: false, coreBonus: 0,
        band: bandOf(sd), recordShown: false, prevBest: save.deepest, beepT: 0, pick: null, echoT: 3, t: 0, dug: 0, lost: 0, stnSeen: [false, false, false] };
      const sy = sd > 0 ? (SURF + sd + 1) * TS + 10 : (SURF - 1) * TS + 14;
      for (let i = 0; i < N; i++) run.pods.push({ i, x: W / 2 + (i - (N - 1) / 2) * 56, y: sy, vx: 0, vy: 0, fa: Math.PI / 2, hp: maxHp, maxHp, dyn: 2 + lvl('dyn'), inv: 1, wreck: false, reviveT: 0, sonarCd: 1, drillIdx: -1, drillSnd: 0, spin: 0, drilling: false, hintT: 0, burnT: 0 });
      if (sd > 0) { const k = STN.indexOf(sd); if (k >= 0) run.stnAir[k] = true; run.armed = true; }
      camY = clamp(sy - H * 0.45, 0, GH * TS - H);
      st.phase = 'run'; st.t = 0; FX.clear(); padCfg(false);
      banner(sd > 0 ? sd + ' m STATION' : 'DIG!', { color: '#FFD23F', size: 110, life: 1.0, sub: sd > 0 ? 'shift ' + (save.runs + 1) : 'shift ' + (save.runs + 1) + ' · bring ore back up' }); S.go();
    }
    function startOptions() { const o = [0]; for (let k = 0; k < lvl('lift') && k < 3; k++) o.push(STN[k]); return o; }
    const cap = () => 16 + lvl('cargo') * 6 + perk('sack') * 8;
    const held = () => run.cargo.reduce((a, b) => a + b, 0);
    const oreMult = () => 1 + 0.3 * perk('appraiser');
    const value = arr => Math.round(arr.reduce((a, n, o) => a + n * ORES[o].val, 0) * oreMult());
    function drillTime(t) {
      const ore = t >= ORE, base = ore ? ORES[t - ORE].time : TIME[t], hard = ore ? ORES[t - ORE].hard : HARD[t], pow = 1 + lvl('drillPow');
      if (base <= 0) return Infinity;
      const m = hard > pow ? Math.pow(3.2, hard - pow) : Math.pow(0.82, pow - hard);
      return base * m / ((1 + 0.18 * lvl('drillSpd')) * Math.pow(1.35, perk('turbo')));
    }
    function tileColor(t, r) { if (t >= ORE) return ORES[t - ORE].col; const b = BANDS[bandOf(Math.max(0, r - SURF))]; return t === ROCK || t === BOULDER ? b.rock : t === GRANITE ? '#b7b3c2' : t === OBSID ? '#3a2d66' : t === DIAM ? '#bfe9ee' : t === GAS ? '#c9d94a' : b.dirt; }
    function collect(o, x, y, pod) {
      let n = 1; if (Math.random() < 0.25 * perk('lucky')) n = 2;
      for (let k = 0; k < n; k++) {
        if (held() < cap()) run.cargo[o]++;
        else { let low = -1; for (let j = 0; j < o; j++) if (run.cargo[j] > 0) { low = j; break; }
          if (low >= 0) { run.cargo[low]--; run.cargo[o]++; FX.text(x, y - 46, 'swapped out ' + ORES[low].name, { color: '#fff', size: 15 }); }
          else { run.lost++; FX.text(x, y - 24, 'HOLD FULL!', { color: '#FF5D73', size: 24 }); S.back(); return; } }
      }
      FX.text(x, y - 22, (n > 1 ? 'x2 ' : '+') + ORES[o].name, { color: ORES[o].col, size: 20 + o * 2 });
      FX.burst(x, y, { n: 10 + o * 3, color: [ORES[o].col, '#fff'], speed: 220, life: 0.5, size: 4 });
      const f = [523, 659, 784, 988, 1175, 1568][o]; tone({ f, d: 0.08, v: 0.12, type: 'triangle', pan: panX(x) }); tone({ f: f * 1.5, d: 0.14, v: 0.1, type: 'triangle', t: 0.06, pan: panX(x) });
      if (pod) E.buzz(pod.i, 25);
    }
    function breakTile(c, r, pod) {
      if (c < 0 || c >= GW || r < SURF || r >= GH) return;
      const i = r * GW + c, t = grid[i]; if (t === EMPTY || t === BED || t === LAVA) return;
      grid[i] = EMPTY; dmg[i] = 0; run.dug++;
      const x = c * TS + TS / 2, y = r * TS + TS / 2;
      FX.burst(x, y - camY, { n: 9, color: [tileColor(t, r), BANDS[bandOf(Math.max(0, r - SURF))].dirt2], speed: 190, life: 0.5, size: 5, sq: true, add: false, grav: 500 });
      noise({ d: 0.09, v: 0.16, f: t === DIRT ? 500 : 900, f2: 200, ft: 'bandpass', pan: panX(x) });
      if (t >= ORE) collect(t - ORE, x, y - camY, pod);
      else if (t === GAS) explode(x, y, 82, false);
    }
    function explode(x, y, rad, dynamite) {
      const c0 = Math.floor(x / TS), r0 = Math.floor(y / TS);
      FX.burst(x, y - camY, { n: dynamite ? 40 : 26, color: dynamite ? ['#FFD23F', '#FF8A3D', '#fff'] : ['#c9d94a', '#FFD23F', '#fff'], speed: 420, life: 0.6, size: 8 });
      FX.burst(x, y - camY, { n: 12, color: ['#39424f', '#565f6e'], speed: 130, life: 1.1, size: 14, add: false, drag: 1.5 });
      FX.ring(x, y - camY, { r1: rad * 1.5, color: '#fff', w: 9, life: 0.4 });
      S.boom(x, dynamite); E.shake(dynamite ? 14 : 10);
      for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) {
        const t = tile(c, r); if (t === EMPTY) continue;
        if (dynamite ? (t !== BED && t !== LAVA) : (t === DIRT || t === ROCK || t === GAS || t === BOULDER)) breakTile(c, r, null);
      }
      for (const p of run.pods) if (!p.wreck && dist(p.x, p.y, x, y) < rad) hurt(p, 1);
      for (const k of run.critters) if (!k.dead && dist(k.x, k.y, x, y) < rad + 16) killCritter(k);
    }
    function killCritter(k) { k.dead = true; FX.burst(k.x, k.y - camY, { n: 14, color: ['#c06ad8', '#7d5cff', '#fff'], speed: 240, life: 0.5, size: 5 }); S.pop(k.x, 4); }
    function hurt(p, n) {
      if (p.wreck || p.inv > 0 || run.endKind) return;
      p.hp -= n; p.inv = 1.3;
      FX.burst(p.x, p.y - camY, { n: 16, color: [COL[p.i], '#fff', '#FF5D73'], speed: 300, life: 0.5, size: 5 });
      S.hit(p.x); E.shake(7); E.buzz(p.i, 160); E.flash('#FF3860', 0.14);
      if (p.hp <= 0) {
        p.hp = 0; p.wreck = true; p.reviveT = 0; p.vx = p.vy = 0;
        FX.burst(p.x, p.y - camY, { n: 30, color: ['#FFD23F', '#FF8A3D', '#565f6e'], speed: 380, life: 0.8, size: 7 }); S.boom(p.x, false); E.buzz(p.i, 400);
        if (run.pods.every(q => q.wreck)) endRun('wreck');
        else banner(P[p.i].name + ' IS WRECKED', { color: COL[p.i], size: 70, life: 1.6, sub: 'hover next to them to repair' });
      }
    }
    function bank(x, y) {
      const v = value(run.cargo); if (held() <= 0) return 0;
      for (let o = 0; o < 6; o++) { run.banked[o] += run.cargo[o]; run.cargo[o] = 0; }
      FX.text(x, y - camY - 40, 'BANKED $' + v, { color: '#FFD23F', size: 34, life: 1.6 }); FX.confetti(x, y - camY, 30, { speed: [100, 400] }); S.power(); E.buzz(-1, 60);
      return v;
    }
    function endRun(kind) {
      if (run.endKind) return;
      run.endKind = kind; run.endT = 0; st.phase = 'end';
      if (kind === 'lift') { bank(W / 2, run.pods[0].y); banner('SHIFT OVER', { color: '#FFD23F', size: 110, life: 1.5, sub: 'everything banked' }); S.win(); }
      else { banner(kind === 'air' ? 'OUT OF AIR!' : 'ALL PODS WRECKED', { color: '#FF5D73', size: 96, life: 1.6, sub: 'emergency winch — ' + [50, 65, 80][lvl('winch')] + '% of the cargo saved' }); S.lose(); E.buzz(-1, 500); E.slow(0.4, 0.6); }
    }
    function finalize() {
      const winch = run.endKind !== 'lift', keep = [0.5, 0.65, 0.8][lvl('winch')];
      const oreCash = value(run.banked), winchCash = winch ? Math.floor(value(run.cargo) * keep) : 0, depthCash = Math.max(0, run.maxDepth - run.startDepth);
      const total = oreCash + winchCash + depthCash + run.coreBonus;
      const rec = run.maxDepth > run.prevBest, haulRec = total > save.bestHaul;
      save.cash += total; save.runs++; save.deepest = Math.max(save.deepest, run.maxDepth); save.bestHaul = Math.max(save.bestHaul, total);
      Save.store('dig', save);
      st.sum = { kind: run.endKind, banked: run.banked.slice(), mult: oreMult(), oreCash, winchCash, winchLost: winch ? value(run.cargo) - winchCash : 0, keep, depthCash, core: run.coreBonus, total, depth: run.maxDepth, rec, haulRec, perks: Object.keys(run.perks), lost: run.lost };
      st.sumT = 0; st.phase = 'summary'; FX.clear(); E.setPads({ a: 'CONTINUE', b: '-', stick: '' }, 'DEEP DIG');
      if (total > 0) S.goal();
    }
    function sonar(p, free) {
      const rad = 7 + lvl('sonar') * 2, c0 = Math.floor(p.x / TS), r0 = Math.floor(p.y / TS);
      for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
        if (c < 0 || c >= GW || r < SURF || r >= GH) continue;
        const dd = Math.hypot(c - c0, r - r0); if (dd > rad) continue;
        const i = r * GW + c, t = grid[i]; seen[i] = 1;
        if (t >= ORE) run.glints.push({ x: c * TS + TS / 2, y: r * TS + TS / 2, col: ORES[t - ORE].col, t: 3.5, d: dd * 0.06 });
        else if (t === GAS) run.glints.push({ x: c * TS + TS / 2, y: r * TS + TS / 2, col: '#FF3860', t: 3.5, d: dd * 0.06, haz: true });
      }
      for (const b of run.chests) if (!b.open && dist(b.x, b.y, p.x, p.y) < rad * TS) run.glints.push({ x: b.x, y: b.y, col: '#FFD23F', t: 4, d: 0.2, big: true });
      for (let k = 0; k < 3; k++) FX.ring(p.x, p.y - camY, { r0: 10, r1: rad * TS, color: k ? COL[p.i] : '#fff', w: 5 - k, life: 0.6 + k * 0.18 });
      if (!free) { tone({ f: 1400, f2: 700, d: 0.5, v: 0.12, type: 'sine', pan: panX(p.x) }); tone({ f: 2100, f2: 1050, d: 0.4, v: 0.05, type: 'sine', t: 0.05 }); }
    }
    function openChest(b) {
      b.open = true; FX.confetti(b.x, b.y - camY, 40, { speed: [120, 420] }); S.power(); E.buzz(-1, 120);
      const pool = shuffle(PERKS.slice()).slice(0, 3);
      run.pick = { cards: pool, cur: new Array(N).fill(0).map((_, i) => i % 3), lock: new Array(N).fill(false), t: 0 };
      st.phase = 'pick'; E.setPads({ a: 'CHOOSE', b: '-', stick: 'LEFT / RIGHT' }, 'DEEP DIG');
    }
    function applyPerk(pk) {
      run.perks[pk.id] = (run.perks[pk.id] | 0) + 1;
      if (pk.id === 'patch') for (const p of run.pods) { p.maxHp++; p.hp = p.maxHp; if (p.wreck) { p.wreck = false; p.inv = 2; } }
      if (pk.id === 'crate') for (const p of run.pods) p.dyn += 3;
      if (pk.id === 'moss') run.air = run.airMax;
    }
    function collide(o, rad, cb) {
      const c0 = Math.floor((o.x - rad) / TS), c1 = Math.floor((o.x + rad) / TS), r0 = Math.floor((o.y - rad) / TS), r1 = Math.floor((o.y + rad) / TS);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const t = tile(c, r); if (t === EMPTY) continue;
        const nx = clamp(o.x, c * TS, c * TS + TS), ny = clamp(o.y, r * TS, r * TS + TS), dx = o.x - nx, dy = o.y - ny, d2 = dx * dx + dy * dy;
        if (d2 < rad * rad) { if (cb) cb(t); if (d2 > 1e-6) { const d = Math.sqrt(d2); o.x += dx / d * (rad - d); o.y += dy / d * (rad - d); } else o.y -= rad; }
      }
    }
    function updPod(p, dt) {
      const pl = P[p.i];
      p.inv -= dt; p.sonarCd -= dt; p.hintT -= dt; p.burnT -= dt; p.drilling = false;
      if (p.wreck) {
        const near = run.pods.some(q => !q.wreck && dist(q.x, q.y, p.x, p.y) < 62);
        p.reviveT = near ? p.reviveT + dt : Math.max(0, p.reviveT - dt * 0.5);
        if (near && Math.random() < 0.3) FX.burst(p.x, p.y - camY, { n: 1, color: '#FFD23F', speed: 80, life: 0.4, size: 3 });
        if (p.reviveT >= 2) { p.wreck = false; p.hp = Math.min(2, p.maxHp); p.inv = 2; p.reviveT = 0; S.power(); FX.ring(p.x, p.y - camY, { r1: 80, color: COL[p.i], w: 7 }); FX.text(p.x, p.y - camY - 30, 'REPAIRED!', { color: COL[p.i], size: 26 }); E.buzz(p.i, 150); }
        return;
      }
      const spd = 150 * (1 + 0.12 * lvl('engine')) * Math.pow(1.25, perk('feather')), k = 1 - Math.exp(-10 * dt);
      p.vx += (pl.x * spd - p.vx) * k; p.vy += (pl.y * spd - p.vy) * k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      let lava = false; collide(p, PR, t => { if (t === LAVA) lava = true; });
      p.x = clamp(p.x, PR, W - PR); p.y = clamp(p.y, Math.max(TS * 1.5, camY + 34), camY + H - 34);
      if (lava && !perk('heat') && p.burnT <= 0) { p.burnT = 0.5; hurt(p, 1); FX.text(p.x, p.y - camY - 30, 'LAVA!', { color: '#ff6a1a', size: 24 }); }
      if (pl.mag > 0.35) {
        const dx = pl.x / pl.mag, dy = pl.y / pl.mag;
        p.fa = angLerp(p.fa, Math.atan2(dy, dx), 1 - Math.exp(-16 * dt));
        const ax = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, ay = ax ? 0 : Math.sign(dy);
        for (const [ux, uy] of [[dx, dy], [ax, ay]]) {
          const sx = p.x + ux * (PR + 9), sy = p.y + uy * (PR + 9), c = Math.floor(sx / TS), r = Math.floor(sy / TS), t = tile(c, r);
          if (t === EMPTY) continue;
          const tt = drillTime(t), i = r * GW + c;
          p.drilling = true; p.spin += dt * 4;
          if (tt === Infinity || c < 0 || c >= GW || r >= GH) { if (Math.random() < 0.2) FX.burst(sx, sy - camY, { n: 1, color: '#fff', speed: 160, life: 0.2, size: 2 }); break; }
          dmg[i] += dt / tt;
          if (Math.random() < 0.5) FX.burst(sx, sy - camY, { n: 1, color: tileColor(t, r), speed: 150, life: 0.35, size: 4, sq: true, add: false, grav: 400, ang: Math.atan2(-uy, -ux), spread: 1 });
          p.drillSnd -= dt; if (p.drillSnd <= 0) { p.drillSnd = 0.1; noise({ d: 0.09, v: 0.06, f: t === DIRT || t === GAS ? 320 : 700 + (t >= ORE ? 500 : 0), ft: 'bandpass', q: 3, pan: panX(p.x) }); }
          if (tt > 2.4 && p.hintT <= 0) { p.hintT = 2.5; FX.text(p.x, p.y - camY - 30, 'NEEDS A BETTER DRILL BIT', { color: '#fff', size: 17, life: 1.4 }); S.tink(p.x); }
          if (dmg[i] >= 1) breakTile(c, r, p);
          break;
        }
      }
      if (pl.ap && run.t > 0.4) {
        if (p.dyn > 0) { p.dyn--; run.bombs.push({ x: p.x, y: p.y, t: 1.5 }); S.ui(); FX.text(p.x, p.y - camY - 28, 'FIRE IN THE HOLE!', { color: '#FF8A3D', size: 17 }); }
        else { S.back(); FX.text(p.x, p.y - camY - 28, 'NO DYNAMITE', { color: '#fff', size: 15 }); }
      }
      if (pl.bp && p.sonarCd <= 0) { p.sonarCd = 8 - lvl('sonar'); sonar(p, false); }
      // light: remember what the pod has seen
      const c0 = Math.floor(p.x / TS), r0 = Math.floor(p.y / TS);
      for (let r = r0 - 4; r <= r0 + 4; r++) for (let c = c0 - 4; c <= c0 + 4; c++) if (c >= 0 && c < GW && r >= SURF && r < GH && (c - c0) * (c - c0) + (r - r0) * (r - r0) <= 19) seen[r * GW + c] = 1;
      const d = depthOf(p.y);
      if (d > run.maxDepth) {
        run.maxDepth = d;
        if (d > run.prevBest && run.prevBest > 0 && !run.recordShown) { run.recordShown = true; banner('NEW DEPTH RECORD', { color: '#7CFF6B', size: 70, life: 1.4, sub: d + ' m and counting' }); S.wave(); }
        if (bandOf(d) > run.band) { run.band = bandOf(d); banner(BANDS[run.band].name, { color: '#fff', size: 80, life: 1.6, sub: d + ' m · tougher rock, richer ore' }); S.wave(); }
      }
      if (d >= 3) run.armed = true;
    }
    function updRun(dt) {
      run.t += dt;
      const pods = run.pods, alive = pods.filter(p => !p.wreck);
      for (const p of pods) updPod(p, dt);
      // pods bump apart a little
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const a = pods[i], b = pods[j]; if (a.wreck || b.wreck) continue; const d = dist(a.x, a.y, b.x, b.y); if (d < PR * 2 && d > 0.01) { const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d, o = (PR * 2 - d) / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; } }
      // camera follows the living pods
      if (alive.length) { const ay = alive.reduce((s, p) => s + p.y, 0) / alive.length; camY = lerp(camY, clamp(ay - H * 0.45, 0, GH * TS - H), 1 - Math.exp(-4 * dt)); }
      // air
      const deep = Math.max(0, alive.length ? Math.max.apply(null, alive.map(p => depthOf(p.y))) : 0);
      run.air -= (1.1 + deep * 0.014) * Math.pow(0.75, perk('rebreather')) * dt;
      const af = run.air / run.airMax;
      if (af < 0.3) { run.beepT -= dt; if (run.beepT <= 0) { run.beepT = af < 0.15 ? 0.35 : 0.9; tone({ f: af < 0.15 ? 980 : 760, d: 0.1, v: 0.13, type: 'square' }); if (af < 0.15) E.buzz(-1, 40); } }
      if (run.air <= 0) { run.air = 0; endRun('air'); return; }
      if (perk('echo')) { run.echoT -= dt; if (run.echoT <= 0 && alive.length) { run.echoT = 6; sonar(alive[0], true); } }
      // pickups
      for (const b of run.bubbles) if (!b.got) for (const p of alive) if (dist(p.x, p.y, b.x, b.y) < 30) { b.got = true; const amt = 30 * (1 + perk('moss')); run.air = Math.min(run.airMax, run.air + amt); FX.text(b.x, b.y - camY - 24, '+' + amt + ' AIR', { color: '#8fe9ff', size: 26 }); FX.burst(b.x, b.y - camY, { n: 18, color: ['#8fe9ff', '#fff'], speed: 200, life: 0.6, size: 5 }); S.splash(b.x); S.pickup(); break; }
      for (const b of run.chests) if (!b.open) for (const p of alive) if (dist(p.x, p.y, b.x, b.y) < 32) { openChest(b); return; }
      // dynamite
      for (const b of run.bombs) { b.t -= dt; if (b.t <= 0) { b.dead = true; explode(b.x, b.y, 78, true); } else if (Math.random() < 0.4) FX.burst(b.x + 6, b.y - 12 - camY, { n: 1, color: ['#FFD23F', '#fff'], speed: 90, life: 0.25, size: 3 }); }
      run.bombs = run.bombs.filter(b => !b.dead);
      // loose boulders
      run.wobT -= dt;
      if (run.wobT <= 0) {
        run.wobT = 0.15;
        const r0 = Math.max(SURF, Math.floor(camY / TS) - 1), r1 = Math.min(GH - 2, Math.floor((camY + H) / TS) + 1);
        for (let r = r1; r >= r0; r--) for (let c = 0; c < GW; c++) { const i = r * GW + c; if (grid[i] === BOULDER && grid[i + GW] === EMPTY && !run.wob.has(i)) { run.wob.set(i, 0.65); tone({ f: 90, d: 0.25, v: 0.12, type: 'sawtooth', pan: panX(c * TS) }); } }
      }
      for (const [i, t] of run.wob) {
        if (grid[i] !== BOULDER) { run.wob.delete(i); continue; }
        if (t - dt <= 0) { run.wob.delete(i); grid[i] = EMPTY; dmg[i] = 0; run.boulders.push({ x: (i % GW) * TS + TS / 2, y: Math.floor(i / GW) * TS + TS / 2, vy: 0 }); } else run.wob.set(i, t - dt);
      }
      for (const b of run.boulders) {
        b.vy = Math.min(620, b.vy + 900 * dt); b.y += b.vy * dt;
        for (const p of pods) if (!p.wreck && dist(p.x, p.y, b.x, b.y) < PR + 16 && !b.dead) { b.dead = true; hurt(p, 1); FX.burst(b.x, b.y - camY, { n: 14, color: ['#8f8a86', '#565f6e'], speed: 240, life: 0.5, size: 6, sq: true, add: false, grav: 500 }); S.crate(b.x); }
        for (const k of run.critters) if (!k.dead && dist(k.x, k.y, b.x, b.y) < 26) killCritter(k);
        if (!b.dead && tileAt(b.x, b.y + TS / 2 + 2) !== EMPTY) { b.dead = true; const c = Math.floor(b.x / TS), r = Math.floor(b.y / TS); if (tile(c, r) === EMPTY && r < GH) grid[r * GW + c] = BOULDER; S.thud(b.x); E.shake(4); FX.burst(b.x, b.y + 16 - camY, { n: 8, color: '#8f8a86', speed: 140, life: 0.4, size: 4, add: false }); }
      }
      run.boulders = run.boulders.filter(b => !b.dead);
      // critters
      for (const k of run.critters) {
        if (k.dead) continue;
        let tg = null, td = 1e9; for (const p of alive) { const d = dist(p.x, p.y, k.x, k.y); if (d < td) { td = d; tg = p; } }
        if (!tg || Math.abs(k.y - camY - H / 2) > H) continue;
        if (td < 230) k.awake = true;
        k.stun -= dt; k.p += dt * 6;
        const sp = (k.type ? 96 : 56) + Math.min(40, depthOf(k.y) * 0.12), kk = 1 - Math.exp(-3 * dt);
        if (k.awake && k.stun <= 0) { k.vx += ((tg.x - k.x) / td * sp - k.vx) * kk; k.vy += ((tg.y - k.y) / td * sp - k.vy) * kk; } else { k.vx *= 0.94; k.vy *= 0.94; }
        k.x += k.vx * dt; k.y += k.vy * dt; collide(k, 11);
        if (td < PR + 12) {
          const facing = Math.cos(tg.fa) * (k.x - tg.x) / td + Math.sin(tg.fa) * (k.y - tg.y) / td;
          if (perk('spray') || (facing > 0.45 && P[tg.i].mag > 0.3)) { killCritter(k); FX.text(k.x, k.y - camY - 20, 'SQUISH!', { color: '#c06ad8', size: 20 }); }
          else if (tg.inv <= 0) { hurt(tg, 1); k.stun = 1.1; k.vx = (k.x - tg.x) / td * 220; k.vy = (k.y - tg.y) / td * 220; }
        }
      }
      run.critters = run.critters.filter(k => !k.dead);
      for (const gl of run.glints) gl.t -= dt; run.glints = run.glints.filter(gl => gl.t > 0);
      if (run.endKind) return;
      // lifts
      const inZone = (p, x0, x1, y0, y1) => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1;
      const sy0 = (SURF - 2.6) * TS, sy1 = SURF * TS;
      if (run.armed && alive.length && alive.every(p => inZone(p, W / 2 - 110, W / 2 + 110, sy0, sy1))) { run.liftT += dt; if (run.liftT >= 1.5) return endRun('lift'); } else run.liftT = Math.max(0, run.liftT - dt * 2);
      let onPad = false;
      for (let k = 0; k < 4; k++) {
        const core = k === 3, sd = core ? CORE_D - 3 : STN[k], y0 = (SURF + sd) * TS, y1 = y0 + (core ? 3 : 2) * TS;
        const any = alive.some(p => inZone(p, 12 * TS, 20 * TS, y0, y1));
        if (!any) continue;
        if (!core && !run.stnSeen[k]) { run.stnSeen[k] = true; if (lvl('lift') <= k) banner('LIFT STATION ' + sd + ' m', { color: '#fff', size: 64, life: 2, sub: 'buy it in the workshop to bank and start here' }); }
        if (!core && lvl('lift') <= k) continue;
        if (held() > 0) bank(W / 2, y0 + TS);
        if (!run.stnAir[k]) { run.stnAir[k] = true; run.air = run.airMax; FX.text(W / 2, y0 - camY - 10, 'AIR REFILLED', { color: '#8fe9ff', size: 28, life: 1.5 }); S.splash(W / 2); }
        if (alive.every(p => inZone(p, 12 * TS, 20 * TS, y0, y1))) { onPad = true; if (alive.every(p => P[p.i].b)) { run.holdT += dt; if (run.holdT >= 1.2) return endRun('lift'); } else run.holdT = Math.max(0, run.holdT - dt * 2); }
      }
      run.onPad = onPad; if (!onPad) run.holdT = 0;
      // the core
      if (!run.coreDone && alive.some(p => depthOf(p.y) >= CORE_D - 7)) {
        run.coreDone = true; run.coreBonus = save.core ? 500 : 2000; save.core++; Save.store('dig', save);
        for (let r = SURF + CORE_D - 9; r <= SURF + CORE_D; r++) for (let c = 0; c < GW; c++) seen[r * GW + c] = 1;
        banner('THE CORE!', { color: '#fff3a0', size: 150, life: 3, sub: 'you dug all the way down · +$' + run.coreBonus }); FX.confetti(W / 2, 200, 160); FX.confetti(300, 300, 80); FX.confetti(980, 300, 80);
        S.win(); S.nova(); E.flash('#fff3a0', 0.7); E.shake(20); E.slow(0.4, 1.2); E.buzz(-1, 600);
      }
    }

    // ---------- hub ----------
    function updHub(dt) {
      st.msgT -= dt; st.popT -= dt; st.denyT -= dt;
      const nU = UPG.length, opts = startOptions();
      let nl = false, nr = false, nu = false, nd = false, ap = false;
      for (const p of P) { nl = nl || p.nl; nr = nr || p.nr; nu = nu || p.nu; nd = nd || p.nd; ap = ap || p.ap; }
      let c = st.cur;
      if (c === nU) { if (nu) c = nU - 2; if (opts.length > 1) { if (nr) { st.startSel = (st.startSel + 1) % opts.length; S.ui(); } if (nl) { st.startSel = (st.startSel + opts.length - 1) % opts.length; S.ui(); } } }
      else { if (nd) c = c + 2 < nU ? c + 2 : nU; if (nu && c >= 2) c -= 2; if (nr && c % 2 === 0 && c + 1 < nU) c++; if (nl && c % 2 === 1) c--; }
      if (c !== st.cur) { st.cur = c; S.ui(); }
      st.startSel = clamp(st.startSel, 0, opts.length - 1);
      if (ap && st.t > 0.3) {
        if (st.cur === nU) return startRun();
        const u = UPG[st.cur], l = lvl(u.id);
        if (l >= u.max) { st.msg = u.name + ' is fully upgraded'; st.msgT = 1.8; S.back(); st.deny = st.cur; st.denyT = 0.3; }
        else if (u.need && save.deepest < u.need(l)) { st.msg = 'Reach ' + u.need(l) + ' m first to build that station'; st.msgT = 2.2; S.back(); st.deny = st.cur; st.denyT = 0.3; }
        else if (save.cash < u.cost[l]) { st.msg = 'Not enough cash — $' + (u.cost[l] - save.cash) + ' short'; st.msgT = 1.8; S.back(); st.deny = st.cur; st.denyT = 0.3; }
        else { save.cash -= u.cost[l]; save.up[u.id] = l + 1; Save.store('dig', save); st.pop = st.cur; st.popT = 0.5; st.msg = u.name + ' upgraded: ' + u.desc(l + 1); st.msgT = 2.2; S.power(); E.buzz(-1, 60); const [x, y] = cardPos(st.cur); FX.confetti(x + 170, y + 40, 26, { speed: [80, 360] }); }
      }
    }
    const cardPos = i => [556 + (i % 2) * 348, 66 + Math.floor(i / 2) * 98];

    // ---------- drawing ----------
    function drawSky(g) {
      const top = -camY, gy = SURF * TS - camY;
      const sk = g.createLinearGradient(0, top, 0, gy); sk.addColorStop(0, '#20315e'); sk.addColorStop(1, '#f2a65a'); g.fillStyle = sk; g.fillRect(0, top, W, gy - top);
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(1040, top + 120, 44, 0, TAU); g.fill();
      g.fillStyle = 'rgba(40,30,60,0.45)'; g.beginPath(); g.moveTo(0, gy); for (let x = 0; x <= W; x += 80) g.lineTo(x, gy - 50 - Math.sin(x * 0.011) * 34 - Math.sin(x * 0.027) * 14); g.lineTo(W, gy); g.fill();
      // workshop + lift tower
      g.fillStyle = '#2a2238'; g.fillRect(250, gy - 96, 190, 96); g.beginPath(); g.moveTo(236, gy - 96); g.lineTo(345, gy - 150); g.lineTo(454, gy - 96); g.fill();
      g.fillStyle = '#FFD23F'; g.fillRect(280, gy - 66, 34, 30); g.fillRect(376, gy - 66, 34, 30);
      g.fillStyle = '#2a2238'; g.fillRect(W / 2 - 96, gy - 190, 12, 190); g.fillRect(W / 2 + 84, gy - 190, 12, 190); g.fillRect(W / 2 - 104, gy - 200, 208, 16);
      g.strokeStyle = '#2a2238'; g.lineWidth = 4; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(W / 2 - 90, gy - 20 - k * 44); g.lineTo(W / 2 + 90, gy - 64 - k * 44); g.stroke(); }
      g.fillStyle = run && run.armed ? '#FFD23F' : '#7a7f92'; g.fillRect(W / 2 - 100, gy - 8, 200, 8);
      txt('WORKSHOP', 345, gy - 112, 14, '#f2a65a');
    }
    function drawWorld(g) {
      const t = E.t, r0 = Math.max(0, Math.floor(camY / TS)), r1 = Math.min(GH - 1, Math.floor((camY + H) / TS));
      if (camY < SURF * TS) drawSky(g);
      for (let r = Math.max(r0, SURF); r <= r1; r++) {
        const d = r - SURF, b = BANDS[bandOf(Math.min(d, CORE_D))], y = r * TS - camY;
        for (let c = 0; c < GW; c++) {
          const i = r * GW + c, x = c * TS, tt = grid[i], h = hv[i];
          if (!seen[i]) { g.fillStyle = h & 1 ? b.unk : b.unk2; g.fillRect(x, y, TS, TS); if (h > 200) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x + (h & 15) + 4, y + ((h >> 3) & 15) + 6, 9, 6); } else if (h < 40) { g.fillStyle = 'rgba(255,255,255,0.045)'; g.fillRect(x + (h & 7) * 3, y + 10 + (h >> 3) * 3, 12, 5); } continue; }
          if (tt === EMPTY) { g.fillStyle = b.back; g.fillRect(x, y, TS, TS); if (h > 224) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + (h & 31), y + ((h >> 2) & 31), 5, 4); } continue; }
          let jx = 0; if (tt === BOULDER && run && run.wob.has(i)) jx = Math.sin(t * 60) * 2.5;
          if (tt === LAVA) { g.fillStyle = '#e8480c'; g.fillRect(x, y, TS, TS); g.fillStyle = '#ff9a2a'; g.fillRect(x, y + 4 + Math.sin(t * 3 + c) * 3, TS, 10); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 12 + (h & 15), y + 26 + Math.sin(t * 4 + h) * 4, 4, 0, TAU); g.fill(); continue; }
          if (tt === BED) { if (d >= CORE_D) { g.fillStyle = '#fff3a0'; g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3 + c * 0.7 + r); g.fillRect(x, y, TS, TS); g.globalAlpha = 1; g.fillStyle = '#ffb347'; g.fillRect(x + (h & 15), y + 8 + ((h >> 4) & 15), 10, 6); } else { g.fillStyle = '#15131c'; g.fillRect(x, y, TS, TS); } continue; }
          const host = tt === ROCK ? b.rock : tt === GRANITE ? '#b7b3c2' : tt === OBSID ? '#1d1733' : tt === DIAM ? '#bfe9ee' : (h & 1 ? b.dirt : b.dirt2);
          g.fillStyle = host; g.fillRect(x, y, TS, TS);
          if (tt === DIRT || tt === GAS || tt >= ORE || tt === BOULDER) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x + (h & 15) + 4, y + ((h >> 4) & 15) + 6, 8, 5); if (d === 0) { g.fillStyle = '#9bbf3b'; g.fillRect(x, y, TS, 7); } }
          if (tt === ROCK) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x + 3, y + 3, TS - 6, 5); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + 3, y + TS - 7, TS - 6, 4); }
          else if (tt === GRANITE) { g.fillStyle = '#6d6880'; g.fillRect(x + 6 + (h & 7), y + 7, 5, 5); g.fillRect(x + 22, y + 20 + (h & 7), 6, 5); g.fillRect(x + 9, y + 28, 4, 4); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 2, y + 2, TS - 4, 3); }
          else if (tt === OBSID) { g.strokeStyle = '#6b4fb5'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 6, y + 30); g.lineTo(x + 18 + (h & 7), y + 8); g.lineTo(x + 34, y + 22); g.stroke(); }
          else if (tt === DIAM) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + 8, y + 30); g.lineTo(x + 20, y + 6); g.lineTo(x + 32, y + 30); g.fill(); g.fillStyle = '#7fc8d0'; g.beginPath(); g.moveTo(x + 20, y + 6); g.lineTo(x + 32, y + 30); g.lineTo(x + 20, y + 24); g.fill(); }
          else if (tt === GAS) { g.fillStyle = '#c9d94a'; g.globalAlpha = 0.55 + 0.3 * Math.sin(t * 3 + h); for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 9 + k * 11, y + 14 + ((h >> k) & 7) * 2 + Math.sin(t * 2 + k + h) * 2, 3.2, 0, TAU); g.fill(); } g.globalAlpha = 1; }
          else if (tt === BOULDER) { g.fillStyle = '#6f6a66'; g.beginPath(); g.arc(x + TS / 2 + jx, y + TS / 2, 17, 0, TAU); g.fill(); g.fillStyle = '#a39d98'; g.beginPath(); g.arc(x + TS / 2 - 3 + jx, y + TS / 2 - 4, 12, 0, TAU); g.fill(); }
          else if (tt >= ORE) {
            const o = tt - ORE, oc = ORES[o].col;
            for (let k = 0; k < 3; k++) { const ox = x + 9 + ((h >> k) & 3) * 3 + k * 9, oy = y + 10 + ((h >> (k + 2)) & 7) * 2 + (k & 1) * 8, s = 5 + (k === 1 ? 2 : 0); g.fillStyle = oc; g.beginPath(); g.moveTo(ox, oy - s); g.lineTo(ox + s, oy); g.lineTo(ox, oy + s); g.lineTo(ox - s, oy); g.fill(); }
            if (((t * 1.3 + h * 0.37) % 3) < 0.25) { g.fillStyle = '#fff'; const sx = x + 12 + (h & 15), sy = y + 12 + ((h >> 4) & 15); g.fillRect(sx - 5, sy - 1, 10, 2); g.fillRect(sx - 1, sy - 5, 2, 10); }
          }
          if (r > SURF && grid[i - GW] === EMPTY && seen[i - GW]) { g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x, y, TS, 3); }
          const dm = dmg[i]; if (dm > 0.05) { g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 20, y + 20); g.lineTo(x + 8, y + 8 + (h & 7)); if (dm > 0.35) { g.moveTo(x + 20, y + 20); g.lineTo(x + 34, y + 12); } if (dm > 0.65) { g.moveTo(x + 20, y + 20); g.lineTo(x + 14 + (h & 7), y + 36); g.moveTo(x + 20, y + 20); g.lineTo(x + 36, y + 30); } g.stroke(); }
        }
      }
      // station and core pads
      for (let k = 0; k < 4; k++) {
        const core = k === 3, sd = core ? CORE_D - 1 : STN[k] + 1, py = (SURF + sd + 1) * TS - camY; if (py < -80 || py > H + 80) continue;
        const own = core || lvl('lift') > k;
        g.fillStyle = own ? '#FFD23F' : '#565b6e'; g.fillRect(13 * TS, py - 8, 6 * TS, 8);
        g.fillStyle = own ? '#2a2238' : '#33374a'; g.fillRect(13 * TS, py - TS * (core ? 3 : 2), 8, TS * (core ? 3 : 2)); g.fillRect(19 * TS - 8, py - TS * (core ? 3 : 2), 8, TS * (core ? 3 : 2));
        for (let j = 0; j < 4; j++) { g.fillStyle = own ? (Math.sin(t * 5 + j) > 0 ? '#FFD23F' : '#fff') : '#44485a'; g.beginPath(); g.arc(13 * TS + 30 + j * 60, py - 14, 4, 0, TAU); g.fill(); }
        if (!seen[(SURF + sd) * GW + 16]) continue;
        txt(core ? 'CORE LIFT' : (own ? sd - 1 + ' m LIFT STATION' : 'STATION LOCKED'), W / 2, py - TS * (core ? 3 : 2) + 12, 15, own ? '#FFD23F' : '#9aa0b4', { stroke: '#0a0d18' });
        if (own && run && run.onPad && st.phase === 'run') { g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 8); txt('EVERYONE HOLD  B  TO RIDE THE LIFT HOME', W / 2, py - 34, 18, '#fff', { stroke: '#0a0d18' }); g.globalAlpha = 1; if (run.holdT > 0) { rr(W / 2 - 100, py - 24, 200, 10, 5); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill(); rr(W / 2 - 100, py - 24, Math.max(10, 200 * run.holdT / 1.2), 10, 5); g.fillStyle = '#FFD23F'; g.fill(); } }
      }
      if (!run) return;
      for (const b of run.bubbles) if (!b.got && seen[Math.floor(b.y / TS) * GW + Math.floor(b.x / TS)]) { const y = b.y - camY + Math.sin(t * 2.5 + b.p) * 4; g.fillStyle = 'rgba(143,233,255,0.3)'; g.beginPath(); g.arc(b.x, y, 15, 0, TAU); g.fill(); g.strokeStyle = '#8fe9ff'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x - 5, y - 5, 3.5, 0, TAU); g.fill(); txt('AIR', b.x, y + 1, 10, '#dff6ff'); }
      for (const b of run.chests) if (!b.open && seen[Math.floor(b.y / TS) * GW + Math.floor(b.x / TS)]) { const y = b.y - camY + 4; g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5); g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(b.x, y, 26, 0, TAU); g.fill(); g.globalAlpha = 1; g.fillStyle = '#7a4a22'; rr(b.x - 15, y - 9, 30, 20, 4); g.fill(); g.fillStyle = '#c98845'; rr(b.x - 15, y - 12, 30, 11, 5); g.fill(); g.fillStyle = '#FFD23F'; g.fillRect(b.x - 3, y - 6, 6, 8); }
      for (const b of run.bombs) { const y = b.y - camY; g.strokeStyle = 'rgba(255,80,60,' + (0.5 + 0.4 * Math.sin(b.t * 20)).toFixed(2) + ')'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect((Math.floor(b.x / TS) - 1) * TS, (Math.floor(b.y / TS) - 1) * TS - camY, TS * 3, TS * 3); g.setLineDash([]); g.fillStyle = Math.sin(b.t * 30) > 0 ? '#fff' : '#e8382c'; rr(b.x - 5, y - 11, 10, 22, 3); g.fill(); g.strokeStyle = '#3a2d1d'; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x, y - 11); g.lineTo(b.x + 6, y - 17); g.stroke(); txt(Math.ceil(b.t * 2) + '', b.x, y - 26, 14, '#FFD23F', { stroke: '#0a0d18' }); }
      for (const b of run.boulders) { const y = b.y - camY; g.fillStyle = '#6f6a66'; g.beginPath(); g.arc(b.x, y, 17, 0, TAU); g.fill(); g.fillStyle = '#a39d98'; g.beginPath(); g.arc(b.x - 3, y - 4, 12, 0, TAU); g.fill(); }
      for (const k of run.critters) {
        if (!seen[Math.floor(k.y / TS) * GW + Math.floor(k.x / TS)]) continue;
        const y = k.y - camY, wob = Math.sin(k.p) * 0.12;
        g.save(); g.translate(k.x, y); g.scale(1 + wob, 1 - wob);
        if (k.type) { g.fillStyle = '#7d5cff'; const fl = Math.sin(k.p * 2.5) * 8; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-22, -6 + fl); g.lineTo(-12, 6); g.fill(); g.beginPath(); g.moveTo(6, 0); g.lineTo(22, -6 + fl); g.lineTo(12, 6); g.fill(); g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); }
        else { g.fillStyle = '#9a4fb8'; g.beginPath(); g.arc(-8, 2, 8, 0, TAU); g.fill(); g.fillStyle = '#c06ad8'; g.beginPath(); g.arc(2, 0, 11, 0, TAU); g.fill(); }
        g.fillStyle = k.awake ? '#fff' : '#b9a8c9'; g.beginPath(); g.arc(-2, -3, 3.4, 0, TAU); g.arc(6, -3, 3.4, 0, TAU); g.fill();
        if (k.awake) { g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(-1.4, -3, 1.6, 0, TAU); g.arc(6.6, -3, 1.6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(-1, 3, 3, 4); g.fillRect(4, 3, 3, 4); }
        g.restore();
      }
      // pods and their lamp glow
      g.globalCompositeOperation = 'lighter';
      for (const p of run.pods) if (!p.wreck && p.y > SURF * TS) { const gl = g.createRadialGradient(p.x, p.y - camY, 6, p.x, p.y - camY, 130); gl.addColorStop(0, 'rgba(255,240,200,0.16)'); gl.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gl; g.fillRect(p.x - 130, p.y - camY - 130, 260, 260); }
      g.globalCompositeOperation = 'source-over';
      for (const p of run.pods) {
        const y = p.y - camY;
        if (st.phase === 'end') { g.strokeStyle = '#c9ccd6'; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x, y - PR); g.lineTo(p.x, -20); g.stroke(); }
        drawPod(g, p.x, y, p.fa, p.i, { spin: p.spin, thrust: !p.wreck && P[p.i].mag > 0.3, wreck: p.wreck, alpha: p.inv > 0 && !p.wreck && st.phase === 'run' && Math.sin(t * 40) > 0.2 ? 0.45 : 1 });
        if (p.wreck) {
          if (Math.random() < 0.3) FX.burst(p.x, y - 10, { n: 1, color: '#565f6e', speed: 40, life: 0.8, size: 7, add: false, ang: -1.57, spread: 0.5 });
          txt('HELP!', p.x, y - 34 + Math.sin(t * 6) * 3, 16, COL[p.i], { stroke: '#0a0d18' });
          g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 5; g.beginPath(); g.arc(p.x, y, 26, 0, TAU); g.stroke();
          if (p.reviveT > 0) { g.strokeStyle = '#FFD23F'; g.beginPath(); g.arc(p.x, y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * p.reviveT / 2); g.stroke(); }
        } else txt(P[p.i].name, p.x, y - 27 - (run.pods.some(q => q.i < p.i && !q.wreck && Math.abs(q.x - p.x) < 70 && Math.abs(q.y - p.y) < 14) ? 13 : 0), 11, COL[p.i], { stroke: '#0a0d18' });
      }
      for (const gl of run.glints) {
        const a = Math.min(1, gl.t) * (gl.t < 3.5 - gl.d ? 1 : 0); if (a <= 0) continue;
        const y = gl.y - camY, s = (gl.big ? 15 : 9) * (0.8 + 0.3 * Math.sin(t * 9 + gl.x));
        g.globalAlpha = a; g.strokeStyle = gl.col; g.lineWidth = gl.haz ? 3 : 2.5; g.beginPath();
        if (gl.haz) { g.moveTo(gl.x - s, y - s); g.lineTo(gl.x + s, y + s); g.moveTo(gl.x + s, y - s); g.lineTo(gl.x - s, y + s); } else { g.moveTo(gl.x - s, y); g.lineTo(gl.x + s, y); g.moveTo(gl.x, y - s); g.lineTo(gl.x, y + s); }
        g.stroke(); g.globalAlpha = 1;
      }
    }
    function drawHUD(g) {
      const t = E.t, af = clamp(run.air / run.airMax, 0, 1), low = af < 0.3;
      if (low) { const vg = g.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 760); vg.addColorStop(0, 'rgba(255,40,60,0)'); vg.addColorStop(1, 'rgba(255,40,60,' + ((0.5 - af) * (0.7 + 0.3 * Math.sin(t * (af < 0.15 ? 14 : 7)))).toFixed(3) + ')'); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
      // air
      rr(22, 16, 408, 76, 16); g.fillStyle = 'rgba(10,13,24,0.78)'; g.fill();
      txt('AIR', 38, 36, 17, low ? '#FF5D73' : '#8fe9ff', { align: 'left' });
      rr(84, 24, 330, 24, 12); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
      rr(84, 24, Math.max(24, 330 * af), 24, 12); g.fillStyle = af < 0.15 ? (Math.sin(t * 16) > 0 ? '#FF3860' : '#fff') : low ? '#FFD23F' : '#8fe9ff'; g.fill();
      txt(Math.ceil(run.air) + '', 249, 37, 15, '#0a0d18');
      // cargo
      const cp = cap(), hd = held(), full = hd >= cp;
      txt('HOLD', 38, 70, 15, full ? '#FF5D73' : '#fff', { align: 'left' });
      const sw = Math.min(17, 268 / cp); let k = 0;
      for (let o = 5; o >= 0; o--) for (let j = 0; j < run.cargo[o]; j++) { g.fillStyle = ORES[o].col; rr(88 + k * sw, 62, Math.max(3, sw - 3), 16, 3); g.fill(); k++; }
      for (; k < cp; k++) { g.fillStyle = 'rgba(255,255,255,0.13)'; rr(88 + k * sw, 62, Math.max(3, sw - 3), 16, 3); g.fill(); }
      txt(hd + '/' + cp, 414, 70, 14, full ? '#FF5D73' : 'rgba(255,255,255,0.7)', { align: 'right' });
      if (full && Math.sin(t * 6) > 0) txt('HOLD FULL — head for a lift', 226, 108, 16, '#FF5D73', { stroke: '#0a0d18' });
      // depth
      const alive = run.pods.filter(p => !p.wreck), d = Math.max(0, alive.length ? Math.max.apply(null, alive.map(p => depthOf(p.y))) : run.maxDepth);
      rr(W / 2 - 110, 12, 220, 64, 18); g.fillStyle = 'rgba(10,13,24,0.78)'; g.fill();
      txt(d + ' m', W / 2, 38, 34, '#fff'); txt(BANDS[bandOf(Math.min(d, CORE_D))].name, W / 2, 63, 12, 'rgba(255,255,255,0.6)');
      // money
      rr(W - 292, 16, 240, 76, 16); g.fillStyle = 'rgba(10,13,24,0.78)'; g.fill();
      txt('BANKED', W - 276, 37, 14, 'rgba(255,255,255,0.6)', { align: 'left' }); txt('$' + value(run.banked), W - 68, 37, 22, '#FFD23F', { align: 'right' });
      txt('IN HOLD', W - 276, 70, 14, 'rgba(255,255,255,0.6)', { align: 'left' }); txt('$' + value(run.cargo), W - 68, 70, 22, '#fff', { align: 'right' });
      // depth gauge
      const gx = W - 24, gy0 = 110, gy1 = 610, gyy = dd => gy0 + (gy1 - gy0) * clamp(dd / CORE_D, 0, 1);
      g.fillStyle = 'rgba(10,13,24,0.6)'; rr(gx - 9, gy0 - 10, 18, gy1 - gy0 + 20, 9); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(gx - 1, gy0, 2, gy1 - gy0);
      for (let s = 0; s < 3; s++) { g.fillStyle = lvl('lift') > s ? '#FFD23F' : '#6a7086'; g.fillRect(gx - 6, gyy(STN[s]) - 2, 12, 4); }
      g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(gx, gy1, 6, 0, TAU); g.fill();
      if (run.prevBest > 0) { g.fillStyle = '#7CFF6B'; g.fillRect(gx - 8, gyy(run.prevBest) - 1, 16, 2); txt('BEST', gx - 14, gyy(run.prevBest), 10, '#7CFF6B', { align: 'right', stroke: '#0a0d18' }); }
      for (const p of run.pods) { g.fillStyle = p.wreck ? '#6a7080' : COL[p.i]; g.beginPath(); g.arc(gx, gyy(Math.max(0, depthOf(p.y))), 5, 0, TAU); g.fill(); }
      // surface lift prompt
      if (run.armed && camY < SURF * TS && st.phase === 'run') {
        const py = (SURF - 3.2) * TS - camY;
        g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6); txt(run.liftT > 0 ? 'CLOCKING OFF…' : 'PARK ON THE LIFT TO BANK AND CLOCK OFF', W / 2, py, 19, '#fff', { stroke: '#0a0d18' }); g.globalAlpha = 1;
        if (run.liftT > 0) { rr(W / 2 - 100, py + 16, 200, 10, 5); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill(); rr(W / 2 - 100, py + 16, Math.max(10, 200 * run.liftT / 1.5), 10, 5); g.fillStyle = '#FFD23F'; g.fill(); }
      }
      // player plates
      const pw = N > 2 ? 290 : 330;
      for (const p of run.pods) {
        const x = N === 1 ? 40 : 40 + p.i * ((W - 80 - pw) / (N - 1)), y = H - 62;
        rr(x, y, pw, 48, 14); g.fillStyle = 'rgba(10,13,24,0.78)'; g.fill(); g.strokeStyle = p.wreck ? '#6a7080' : COL[p.i]; g.lineWidth = 3; g.stroke();
        g.font = 'bold 17px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = COL[p.i]; g.fillText(P[p.i].name, x + 14, y + 25, 96);
        for (let h = 0; h < p.maxHp; h++) { g.fillStyle = h < p.hp ? '#FF5D73' : 'rgba(255,255,255,0.16)'; rr(x + 118 + h * 13, y + 15, 10, 18, 3); g.fill(); }
        const dx = x + pw - 108; g.fillStyle = '#e8382c'; rr(dx, y + 13, 8, 22, 3); g.fill(); txt('×' + p.dyn, dx + 14, y + 25, 17, '#fff', { align: 'left' });
        const sx = x + pw - 34, rdy = p.sonarCd <= 0; g.strokeStyle = rdy ? '#C77DFF' : 'rgba(255,255,255,0.2)'; g.lineWidth = 4; g.beginPath(); g.arc(sx, y + 24, 13, 0, TAU); g.stroke();
        if (!rdy) { g.strokeStyle = '#C77DFF'; g.beginPath(); g.arc(sx, y + 24, 13, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.sonarCd / (8 - lvl('sonar')))); g.stroke(); }
        txt('B', sx, y + 25, 13, rdy ? '#C77DFF' : 'rgba(255,255,255,0.4)');
        // off-screen wreck marker
        if (p.wreck && (p.y - camY < 20 || p.y - camY > H - 20)) txt(p.y - camY < 20 ? '▲ ' + P[p.i].name + ' needs repair' : '▼ ' + P[p.i].name + ' needs repair', clamp(p.x, 160, W - 160), p.y - camY < 20 ? 120 : H - 84, 16, COL[p.i], { stroke: '#0a0d18' });
      }
      const pk = Object.keys(run.perks); if (pk.length) { let x = 40; for (const id of pk) { const d2 = PERKS.find(q => q.id === id); const lab = d2.name + (run.perks[id] > 1 ? ' ×' + run.perks[id] : ''); g.font = 'bold 12px ' + FONT; const w = g.measureText(lab).width + 18; rr(x, 126, w, 22, 11); g.fillStyle = 'rgba(10,13,24,0.8)'; g.fill(); g.strokeStyle = d2.col; g.lineWidth = 2; g.stroke(); txt(lab, x + w / 2, 138, 12, d2.col); x += w + 6; } }
      if (save.runs === 0 && run.t < 9 && st.phase === 'run') { g.globalAlpha = Math.min(1, 9 - run.t); txt('Push the stick into the ground to drill.  Bring ore back up before the air runs out.', W / 2, H - 96, 21, '#fff', { stroke: '#0a0d18' }); g.globalAlpha = 1; }
    }
    function drawPick(g) {
      const pk = run.pick, t = E.t;
      g.fillStyle = 'rgba(5,6,12,0.74)'; g.fillRect(0, 0, W, H);
      txt('RELIC FOUND', W / 2, 96, 70, '#FFD23F', { stroke: '#0a0d18', sw: 14 });
      txt('Everyone picks one for this shift  ·  stick left / right, then A', W / 2, 154, 22, '#fff');
      for (let k = 0; k < 3; k++) {
        const c = pk.cards[k], x = W / 2 + (k - 1) * 340, y = 360, sc = ease.back(clamp(pk.t * 3 - k * 0.3, 0, 1));
        g.save(); g.translate(x, y); g.scale(sc, sc);
        rr(-150, -130, 300, 260, 22); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 5; g.strokeStyle = c.col; g.stroke();
        g.globalAlpha = 0.2; g.fillStyle = c.col; rr(-150, -130, 300, 110, 22); g.fill(); g.globalAlpha = 1;
        g.save(); g.translate(0, -76); g.rotate(Math.sin(t * 2 + k) * 0.15); g.fillStyle = c.col; g.beginPath(); for (let j = 0; j < 10; j++) { const a = j / 10 * TAU - Math.PI / 2, rr2 = j % 2 ? 16 : 36; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.fill(); g.restore();
        txt(c.name, 0, 14, 25, '#fff'); g.font = 'bold 18px ' + FONT; g.fillStyle = 'rgba(255,255,255,0.8)'; g.textAlign = 'center'; g.fillText(c.desc, 0, 56, 272);
        g.restore();
        let n = 0; for (let i = 0; i < N; i++) if (pk.cur[i] === k) {
          const cx = x - 100 + n * 100, cy = 532; n++;
          rr(cx - 44, cy - 20, 88, 40, 20); g.fillStyle = pk.lock[i] ? COL[i] : 'rgba(10,13,24,0.9)'; g.fill(); g.lineWidth = 3; g.strokeStyle = COL[i]; g.stroke();
          g.font = 'bold 14px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = pk.lock[i] ? '#0a0d18' : COL[i]; g.fillText(pk.lock[i] ? '✓ ' + P[i].name : P[i].name, cx, cy + 1, 78);
        }
      }
      const wait = []; for (let i = 0; i < N; i++) if (!pk.lock[i]) wait.push(P[i].name);
      if (wait.length) txt('waiting for ' + wait.join(' and '), W / 2, 610, 20, 'rgba(255,255,255,0.7)');
    }
    function drawHub(g) {
      const t = E.t; camY = 0; drawWorld(g);
      for (let i = 0; i < N; i++) drawPod(g, W / 2 + (i - (N - 1) / 2) * 56, (SURF - 1) * TS + 14 + Math.sin(t * 2 + i) * 3, Math.PI / 2, i, {});
      g.fillStyle = 'rgba(8,9,18,0.72)'; g.fillRect(0, 0, W, H);
      // left: title and records
      txt('DEEP DIG', 44, 74, 72, '#FFD23F', { align: 'left', stroke: '#0a0d18', sw: 14 });
      txt('WORKSHOP', 48, 126, 22, '#f2a65a', { align: 'left' });
      rr(40, 160, 480, 132, 22); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#FFD23F'; g.stroke();
      txt('CASH', 66, 196, 20, 'rgba(255,255,255,0.6)', { align: 'left' });
      txt('$' + save.cash, 66, 248, 62, '#FFD23F', { align: 'left' });
      const stats = [['DEEPEST', save.deepest + ' m'], ['SHIFTS WORKED', save.runs + ''], ['BEST HAUL', '$' + save.bestHaul], ['THE CORE (' + CORE_D + ' m)', save.core ? 'REACHED ×' + save.core : 'not yet']];
      stats.forEach((s, i) => { txt(s[0], 60, 334 + i * 44, 18, 'rgba(255,255,255,0.6)', { align: 'left' }); txt(s[1], 500, 334 + i * 44, 24, i === 3 && save.core ? '#fff3a0' : '#fff', { align: 'right' }); });
      // depth progress strip
      const bx = 60, bw = 440, by = 520; rr(bx, by, bw, 14, 7); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
      rr(bx, by, Math.max(14, bw * clamp(save.deepest / CORE_D, 0, 1)), 14, 7); g.fillStyle = '#7CFF6B'; g.fill();
      for (let s = 0; s < 3; s++) { const x = bx + bw * STN[s] / CORE_D; g.fillStyle = lvl('lift') > s ? '#FFD23F' : '#6a7086'; g.fillRect(x - 2, by - 5, 4, 24); txt(STN[s] + '', x, by + 32, 12, 'rgba(255,255,255,0.5)'); }
      txt('CORE', bx + bw, by + 32, 12, '#fff3a0', { align: 'right' }); txt('0', bx, by + 32, 12, 'rgba(255,255,255,0.5)', { align: 'left' });
      if (st.msgT > 0) { g.globalAlpha = Math.min(1, st.msgT * 2); txt(st.msg, 280, 600, 19, '#fff', { stroke: '#0a0d18' }); g.globalAlpha = 1; }
      txt('Stick: choose   ·   A: buy / start   ·   pause to leave', 280, 690, 15, 'rgba(255,255,255,0.5)');
      // right: the shop
      UPG.forEach((u, i) => {
        const [x, y] = cardPos(i), on = st.cur === i, l = lvl(u.id), maxed = l >= u.max, locked = !maxed && u.need && save.deepest < u.need(l), can = !maxed && !locked && save.cash >= u.cost[l];
        const sx = st.deny === i && st.denyT > 0 ? Math.sin(st.denyT * 60) * 6 : 0, sc = st.pop === i && st.popT > 0 ? 1 + st.popT * 0.16 : 1;
        g.save(); g.translate(x + 170 + sx, y + 44); g.scale(sc, sc); g.translate(-170, -44);
        rr(0, 0, 340, 88, 16); g.fillStyle = on ? '#1c2748' : '#111730'; g.fill(); g.lineWidth = on ? 5 : 2; g.strokeStyle = on ? '#FFD23F' : 'rgba(255,255,255,0.14)'; g.stroke();
        txt(u.name, 16, 23, 20, '#fff', { align: 'left' });
        for (let k = 0; k < u.max; k++) { g.fillStyle = k < l ? '#FFD23F' : 'rgba(255,255,255,0.16)'; rr(16 + k * 17, 40, 13, 9, 3); g.fill(); }
        g.font = '15px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,0.8)';
        g.fillText(maxed ? u.desc(l) : (l ? u.desc(l) + '  →  ' : 'Next: ') + u.desc(l + 1), 16, 68, 232);
        if (maxed) txt('MAX', 324, 44, 20, '#7CFF6B', { align: 'right' });
        else if (locked) { txt('reach', 324, 34, 12, 'rgba(255,255,255,0.5)', { align: 'right' }); txt(u.need(l) + ' m', 324, 54, 20, '#9aa0b4', { align: 'right' }); }
        else { rr(246, 26, 82, 36, 18); g.fillStyle = can ? '#FFD23F' : 'rgba(255,255,255,0.1)'; g.fill(); txt('$' + u.cost[l], 287, 45, 19, can ? '#0a0d18' : 'rgba(255,255,255,0.45)'); }
        g.restore();
      });
      const on = st.cur === UPG.length, opts = startOptions(), sd = opts[clamp(st.startSel, 0, opts.length - 1)], sy = 66 + 5 * 98 + 4;
      rr(556, sy, 688, 92, 24); g.fillStyle = on ? '#FFD23F' : 'rgba(255,210,63,0.16)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#FFD23F'; g.stroke();
      txt('START DIG', 900 + (on ? Math.sin(t * 8) * 3 : 0), sy + (opts.length > 1 ? 34 : 47), 40, on ? '#0a0d18' : '#FFD23F');
      if (opts.length > 1) txt((on ? '◀  ' : '') + 'from ' + (sd ? sd + ' m station' : 'the surface') + (on ? '  ▶' : ''), 900, sy + 70, 19, on ? '#0a0d18' : 'rgba(255,255,255,0.7)');
      FX.draw(g); FX.drawText(g);
    }
    function drawSummary(g) {
      const s = st.sum, t = st.sumT; camY = 0; drawWorld(g);
      g.fillStyle = 'rgba(8,9,18,0.8)'; g.fillRect(0, 0, W, H);
      const k = ease.back(Math.min(1, t / 0.3));
      g.save(); g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-W / 2, -H / 2);
      rr(250, 40, 780, 640, 28); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 6; g.strokeStyle = s.kind === 'lift' ? '#FFD23F' : '#FF5D73'; g.stroke();
      txt(s.core ? 'THE CORE!' : s.kind === 'lift' ? 'SHIFT OVER' : s.kind === 'air' ? 'OUT OF AIR' : 'PODS WRECKED', W / 2, 96, 58, s.core ? '#fff3a0' : s.kind === 'lift' ? '#FFD23F' : '#FF5D73', { stroke: '#0a0d18' });
      txt('Reached ' + s.depth + ' m' + (s.rec ? '   ·   NEW DEPTH RECORD' : ''), W / 2, 146, 22, s.rec ? '#7CFF6B' : '#fff');
      let y = 196; const row = (a, b, col, big) => { txt(a, 300, y, big ? 26 : 20, col || 'rgba(255,255,255,0.8)', { align: 'left' }); txt(b, 980, y, big ? 34 : 22, col || '#fff', { align: 'right' }); y += big ? 46 : 34; };
      let any = false;
      for (let o = 0; o < 6; o++) if (s.banked[o] > 0) { any = true; drawOreIcon(g, 312, y, o, 9); txt(s.banked[o] + ' × ' + ORES[o].name, 334, y, 20, ORES[o].col, { align: 'left' }); txt('$' + Math.round(s.banked[o] * ORES[o].val * s.mult), 980, y, 22, '#fff', { align: 'right' }); y += 34; }
      if (!any) row('No ore banked', '$0');
      if (s.kind !== 'lift') row('Winched cargo (' + Math.round(s.keep * 100) + '% saved, $' + s.winchLost + ' lost)', '$' + s.winchCash, '#FF9aa8');
      if (s.depthCash) row('Depth bonus', '$' + s.depthCash);
      if (s.core) row('Core bonus', '$' + s.core, '#fff3a0');
      if (s.lost) row(s.lost + ' ore left behind — hold was full', '', 'rgba(255,255,255,0.5)');
      y = Math.max(y + 8, 470); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(300, y - 22, 680, 2);
      const shown = Math.round(s.total * ease.out(clamp((t - 0.4) / 1.0, 0, 1)));
      row('EARNED' + (s.haulRec && s.total > 0 ? '   ·   BEST HAUL YET' : ''), '$' + shown, '#FFD23F', true);
      txt('Cash in the workshop: $' + save.cash, W / 2, y + 12, 20, 'rgba(255,255,255,0.7)');
      if (t > 1.3) { g.globalAlpha = 0.65 + 0.35 * Math.sin(E.rt * 6); txt('PRESS  A  FOR THE WORKSHOP', W / 2, 640, 28, '#FFD23F', { stroke: '#0a0d18' }); g.globalAlpha = 1; }
      g.restore();
      FX.draw(g); FX.drawText(g);
    }

    gen(); for (let r = SURF; r < SURF + 3; r++) for (let c = 0; c < GW; c++) seen[r * GW + c] = 1;
    padCfg(true);
    return {
      _dbg: { st, save, get run() { return run; }, get camY() { return camY; }, tileAt,
        warp(y) { run.pods.forEach((p, i) => { p.x = W / 2 + (i - (N - 1) / 2) * 56; p.y = y; p.vx = p.vy = 0; }); camY = clamp(y - H * 0.45, 0, GH * TS - H); } },
      update(dt) {
        st.t += dt;
        if (st.phase === 'hub') updHub(dt);
        else if (st.phase === 'run') updRun(dt);
        else if (st.phase === 'pick') {
          const pk = run.pick; pk.t += dt; let all = true;
          for (let i = 0; i < N; i++) {
            if (!pk.lock[i]) {
              if (P[i].nl) { pk.cur[i] = (pk.cur[i] + 2) % 3; S.ui(); } if (P[i].nr) { pk.cur[i] = (pk.cur[i] + 1) % 3; S.ui(); }
              if ((P[i].ap && pk.t > 0.5) || pk.t > 20) { pk.lock[i] = true; S.ok(); E.buzz(i, 40); }
            }
            all = all && pk.lock[i];
          }
          if (all) {
            if (!pk.doneT) pk.doneT = 0.45;
            pk.doneT -= dt;
            if (pk.doneT <= 0) { for (let i = 0; i < N; i++) { const c = pk.cards[pk.cur[i]]; applyPerk(c); FX.text(run.pods[i].x, run.pods[i].y - camY - 34 - i * 22, c.name + '!', { color: c.col, size: 24, life: 1.6 }); } run.pick = null; st.phase = 'run'; padCfg(false); S.power(); }
          }
        } else if (st.phase === 'end') {
          run.endT += dt;
          for (const p of run.pods) { p.vy = Math.max(-700, (p.vy > 0 ? 0 : p.vy) - 900 * dt); p.y += p.vy * dt; if (Math.random() < 0.3) FX.burst(p.x, p.y - camY + 14, { n: 1, color: run.endKind === 'lift' ? '#FFD23F' : '#fff', speed: 60, life: 0.4, size: 3 }); }
          if (run.endT > 1.8) finalize();
        } else if (st.phase === 'summary') {
          st.sumT += dt; let ap = false; for (const p of P) ap = ap || p.ap;
          if (ap && st.sumT > 1.3) { st.phase = 'hub'; st.t = 0; st.cur = UPG.length; run = null; gen(); for (let r = SURF; r < SURF + 3; r++) for (let c = 0; c < GW; c++) seen[r * GW + c] = 1; padCfg(true); S.ok(); }
        }
        FX.update(dt);
      },
      draw(g) {
        if (st.phase === 'hub') return drawHub(g);
        if (st.phase === 'summary') return drawSummary(g);
        g.fillStyle = '#0a0d18'; g.fillRect(0, 0, W, H);
        drawWorld(g); FX.draw(g); drawHUD(g);
        if (st.phase === 'pick') drawPick(g);
        FX.drawText(g);
      },
    };
  }

  GAMES.push({
    id: 'dig', name: 'DEEP DIG', tag: 'CO-OP', rogue: true, color: '#c98845',
    tagline: 'Drill down, haul ore up, upgrade, go deeper.',
    pad: { a: 'DYNAMITE', b: 'SONAR', stick: 'FLY + DRILL' },
    how: { goal: 'Dig for ore, get it home, buy upgrades, reach the core',
      rows: [['STICK', 'Fly your pod — push into the ground to drill'], ['A', 'Drop dynamite (blasts a 3×3, mind your pods)'], ['B', 'Sonar ping — shows hidden ore and gas']],
      tips: ['Park on the lift to bank your ore before the shared air runs out', 'Run dry and the winch saves only half. Cash buys upgrades that stay'] },
    song: { bpm: 96, root: 45, minor: true, prog: [0, 3, 5, 4], kick: 'x-----x---x-----', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-x-', bass: 'x--x--x---x-x---', arp: '0---2---1---3-2-', arpWave: 'triangle' },
    icon(g, t) {
      g.fillStyle = '#9b6a3c'; rr(-112, -30, 224, 84, 10); g.fill(); g.fillStyle = '#9bbf3b'; g.fillRect(-112, -30, 224, 8);
      g.fillStyle = '#3b2616'; g.fillRect(-52, -30, 30, 44 + Math.sin(t * 2) * 6); g.fillRect(24, -30, 30, 30 - Math.sin(t * 2) * 6);
      for (const [x, y, o] of [[-84, 20, 0], [-6, 34, 2], [78, 26, 1], [90, -4, 3], [-96, -6, 1]]) drawOreIcon(g, x, y, o, 7 + Math.sin(t * 4 + x) * 1.2);
      drawPod(g, -37, 2 + Math.sin(t * 2) * 6, Math.PI / 2, 0, { spin: t * 2, thrust: true }); drawPod(g, 39, -12 - Math.sin(t * 2) * 6, Math.PI / 2, 1, { spin: t * 2, thrust: true });
    },
    create,
  });
})();
