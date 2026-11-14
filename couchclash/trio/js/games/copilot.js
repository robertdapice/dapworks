'use strict';
// CO-PILOT — one lander, one engine each. A saved campaign: 24 caverns in four worlds,
// medals, a hangar of permanent upgrades bought with stars, and an endless Deep Run.
// Two players: left engine + right engine, stabiliser shared on B.
// Three players: P3 is the navigator (stick-aimed jet on A, stabiliser on B).
(function () {
  const T = 40, GW = 32, GH = 18, R = 18, FLOOR = 680;
  const GRAV = 150, THR = 235, TORQ = 3.4, ADAMP = 2.4, RIGHTING = 1.0, BUMP = 150, HULL = 3, DEEP_SHIPS = 3;
  const JET = 115, JET_COST = 0.22, STAB_COST = 0.3;
  const GOLD = '#FFD23F', VIOLET = '#C9A0FF';
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const fract = v => v - Math.floor(v);

  const WORLDS = [
    { name: 'CRYSTAL CAVES', glow: '#3DE0C8', tint: [0, 8, 36], bg: ['#0A1030', '#1C1040'], shard: ['#6FA8FF', '#B58CFF', '#3DE0C8'] },
    { name: 'THE FOUNDRY', glow: '#FF9A4D', tint: [24, 10, 2], bg: ['#160C0A', '#2A1510'], shard: ['#FF9A4D', '#FFD23F', '#B5651D'] },
    { name: 'STORM VAULT', glow: '#9FE8FF', tint: [2, 18, 30], bg: ['#06141F', '#12283A'], shard: ['#9FE8FF', '#ffffff', '#6FA8FF'] },
    { name: 'MAGMA CORE', glow: '#FF5D3A', tint: [30, 2, 4], bg: ['#170707', '#2C0C10'], shard: ['#FF5D3A', '#FF9A4D', '#8A1C1C'] },
  ];

  // solids / doors / zones / gates are in tiles [col, row, w, h]; everything else is in pixels.
  // doors move along `axis` ('y' default) by `travel` tiles; wave 'slam' makes a crusher.
  const LEVELS = [
    // ---------------- world 1: crystal caves ----------------
    { name: 'TRAINING BAY', glow: '#3DE0C8', start: 180, pad: [1060, FLOOR], free: true, par: 35, hint: 'bumps are free here',
      solids: [[13, 15, 6, 2], [1, 1, 4, 2], [26, 1, 5, 2]], stars: [[420, 430], [640, 300], [860, 430]], bonus: [1180, 160] },
    { name: 'THE WALL', glow: '#FF8AD8', start: 180, pad: [1100, FLOOR], par: 35, hint: 'up and over',
      solids: [[15, 8, 2, 9], [22, 1, 2, 5], [7, 1, 2, 3]], stars: [[320, 320], [640, 180], [920, 440], [1120, 200]], bonus: [1020, 90] },
    { name: 'THE SQUEEZE', glow: '#FFB347', start: 160, pad: [1100, FLOOR], par: 70, hint: 'under, then over',
      solids: [[10, 1, 2, 10], [20, 7, 2, 10]], stars: [[200, 200], [440, 560], [640, 360], [840, 160], [1100, 300]], bonus: [720, 620] },
    { name: 'UPDRAFT', glow: '#7CFF6B', start: 140, pad: [180, 360], par: 55, hint: 'fans push you around',
      solids: [[1, 9, 22, 1], [14, 1, 2, 3]],
      fans: [{ c: 24, r: 4, w: 6, h: 13, fy: -250, pulse: 6 }, { c: 11, r: 10, w: 5, h: 7, fy: 170 }],
      stars: [[360, 540], [700, 520], [1080, 520], [1080, 160], [500, 230]], bonus: [100, 110] },
    { name: 'THE GATES', glow: '#B58CFF', start: 160, pad: [1060, FLOOR], par: 75, hint: 'sliding doors',
      solids: [[10, 1, 2, 3], [10, 13, 2, 4], [20, 1, 2, 3], [20, 13, 2, 4]],
      doors: [{ c: 10, r: 5, w: 2, h: 3, travel: 4, period: 7, phase: 0 }, { c: 20, r: 5, w: 2, h: 3, travel: 4, period: 7, phase: 0.5 }],
      fans: [{ c: 14, r: 7, w: 4, h: 10, fy: -250, pulse: 5 }],
      stars: [[220, 180], [300, 500], [640, 200], [640, 560], [1040, 200], [1160, 440]], bonus: [640, 400] },
    { name: 'THE LONG WAY', glow: '#6FA8FF', start: [1120, FLOOR], pad: [160, 240], par: 45, hint: 'a long winding flight',
      solids: [[1, 6, 24, 1], [7, 11, 24, 1]],
      fans: [{ c: 1, r: 7, w: 6, h: 10, fy: -230, pulse: 6 }],
      doors: [{ c: 14, r: 7, w: 2, h: 1, travel: 3, period: 6, phase: 0 }],
      stars: [[760, 600], [340, 600], [140, 420], [440, 360], [900, 360], [1120, 180], [640, 130]], bonus: [80, 90] },
    // ---------------- world 2: the foundry ----------------
    { world: 1, name: 'CONVEYOR', start: 160, pad: [1120, FLOOR], par: 50, hint: 'NEW: moving platforms',
      solids: [[12, 1, 2, 4], [20, 13, 2, 4]],
      doors: [{ c: 5, r: 6, w: 3, h: 1, travel: 6, period: 8, axis: 'x' }, { c: 13, r: 11, w: 3, h: 1, travel: 8, period: 9, phase: 0.5, axis: 'x' }],
      stars: [[400, 190], [800, 400], [1040, 180], [300, 500]], bonus: [640, 570] },
    { world: 1, name: 'LASER ALLEY', start: [120, FLOOR], pad: [1160, FLOOR], par: 45, hint: 'NEW: laser gates blink on and off',
      solids: [[5, 1, 22, 5], [5, 12, 22, 5]],
      lasers: [{ a: [400, 240], b: [400, 480], period: 3.2 }, { a: [640, 240], b: [640, 480], period: 3.2, phase: 0.33 }, { a: [880, 240], b: [880, 480], period: 3.2, phase: 0.66 }],
      stars: [[120, 200], [520, 360], [760, 360], [1160, 200]], bonus: [1000, 275] },
    { world: 1, name: 'KEY TO THE CITY', start: 160, pad: [1100, FLOOR], par: 50, hint: 'NEW: a key opens the gate',
      solids: [[15, 1, 2, 6], [15, 10, 2, 7], [1, 5, 6, 1]], gates: [[15, 7, 2, 3]], keys: [[200, 130, 0]],
      stars: [[320, 520], [500, 320], [900, 320], [1100, 520], [1000, 140]], bonus: [1200, 90] },
    { world: 1, name: 'PISTONS', start: 120, pad: [1160, FLOOR], par: 50, hint: 'NEW: crushers. Watch them shake first',
      doors: [{ c: 8, r: -3, w: 3, h: 10, travel: 10, period: 6, wave: 'slam' }, { c: 15, r: -3, w: 3, h: 10, travel: 10, period: 6, wave: 'slam', phase: 0.33 }, { c: 22, r: -3, w: 3, h: 10, travel: 10, period: 6, wave: 'slam', phase: 0.66 }],
      stars: [[240, 300], [520, 600], [800, 300], [1080, 600]], bonus: [660, 610] },
    { world: 1, name: 'SWITCHBACK WORKS', start: 160, pad: [1120, FLOOR], par: 70, hint: 'two keys, two gates',
      solids: [[10, 1, 2, 6], [10, 10, 2, 7], [20, 1, 2, 6], [20, 10, 2, 7]], gates: [[10, 7, 2, 3], [20, 7, 2, 3]], keys: [[200, 130, 0], [640, 590, 1]],
      lasers: [{ a: [480, 440], b: [800, 440], period: 4, duty: 0.5 }],
      doors: [{ c: 23, r: 11, w: 3, h: 1, travel: 4, period: 6, axis: 'x' }],
      stars: [[300, 560], [640, 200], [1000, 200], [1040, 320]], bonus: [760, 620] },
    { world: 1, name: 'THE FOUNDRY LINE', start: [1160, FLOOR], pad: [160, 240], par: 60, hint: 'the whole production line',
      solids: [[1, 6, 24, 1], [7, 11, 24, 1]],
      doors: [{ c: 12, r: 12, w: 3, h: 2, travel: 3, period: 5, wave: 'slam' }, { c: 20, r: 12, w: 3, h: 2, travel: 3, period: 5, wave: 'slam', phase: 0.5 }],
      lasers: [{ a: [520, 280], b: [520, 440], period: 3.6 }, { a: [840, 280], b: [840, 440], period: 3.6, phase: 0.5 }],
      gates: [[22, 7, 2, 4]], keys: [[100, 620, 0]],
      stars: [[950, 620], [660, 620], [140, 430], [400, 360], [700, 360], [1000, 360], [1120, 180], [640, 130]], bonus: [80, 90] },
    // ---------------- world 3: storm vault ----------------
    { world: 2, name: 'FEATHER FALL', grav: 0.5, start: 160, pad: [980, 200], par: 50, hint: 'NEW: low gravity. Gentle taps!',
      solids: [[8, 6, 3, 1], [16, 10, 3, 1], [23, 5, 3, 1]], stars: [[380, 180], [700, 340], [1000, 110], [1150, 500], [500, 560]], bonus: [660, 90] },
    { world: 2, name: 'CROSSWIND', grav: 0.8, start: 140, pad: [1120, FLOOR], par: 60, hint: 'NEW: sideways wind',
      solids: [[14, 7, 4, 4]], zones: [{ c: 8, r: 1, w: 6, h: 16, fx: 110 }, { c: 18, r: 1, w: 6, h: 16, fx: -110, pulse: 6 }],
      stars: [[240, 200], [440, 480], [640, 180], [640, 560], [840, 300], [1100, 200]], bonus: [1200, 90] },
    { world: 2, name: 'SPECIAL DELIVERY', grav: 0.75, start: 220, pad: [520, FLOOR], par: 80, hint: 'NEW: pick up the crate, deliver it gently',
      solids: [[1, 7, 6, 1], [14, 6, 2, 11]], crate: [1100, 656], drop: [150, 240],
      stars: [[400, 500], [640, 140], [900, 400]], bonus: [1200, 100] },
    { world: 2, name: 'GUST GAUNTLET', grav: 0.7, start: 160, pad: [1120, FLOOR], par: 40, hint: 'ride the gusts, wait out the lulls',
      solids: [[8, 5, 2, 12], [15, 1, 2, 12], [22, 5, 2, 12]],
      zones: [{ c: 1, r: 3, w: 7, h: 14, fy: -200, pulse: 5 }, { c: 10, r: 1, w: 5, h: 15, fy: 160 }, { c: 17, r: 3, w: 5, h: 14, fy: -220, pulse: 6 }, { c: 24, r: 1, w: 7, h: 16, fy: 120 }],
      stars: [[160, 160], [500, 520], [780, 160], [1100, 300], [1100, 560]], bonus: [500, 110] },
    { world: 2, name: 'HEAVY WEATHER', grav: 0.8, start: 640, pad: [1000, FLOOR], par: 90, hint: 'a crate, a ledge and a headwind',
      solids: [[24, 6, 7, 1], [8, 10, 2, 7], [20, 1, 2, 7]], crate: [1120, 216], drop: [160, 640],
      zones: [{ c: 10, r: 1, w: 10, h: 16, fx: -100, pulse: 7 }],
      stars: [[300, 200], [640, 300], [900, 560], [1160, 440]], bonus: [80, 90] },
    { world: 2, name: 'EYE OF THE STORM', grav: 0.65, start: [120, FLOOR], pad: [700, 520], par: 100, hint: 'spiral in: key, crate, then the eye',
      solids: [[5, 4, 22, 1], [26, 5, 1, 9], [9, 13, 17, 1], [9, 8, 1, 5]], gates: [[9, 5, 1, 3]], keys: [[1180, 100, 0]],
      crate: [1160, 656], drop: [420, 470],
      zones: [{ c: 5, r: 1, w: 22, h: 3, fx: 110 }, { c: 27, r: 4, w: 4, h: 10, fy: 130, pulse: 6 }],
      stars: [[120, 220], [640, 100], [1160, 380], [640, 610], [320, 610], [640, 330], [940, 420]], bonus: [1000, 250] },
    // ---------------- world 4: magma core ----------------
    { world: 3, name: 'SENTRIES', start: 160, pad: [1120, FLOOR], par: 50, hint: 'NEW: turrets. Keep moving',
      solids: [[9, 9, 2, 8], [19, 9, 2, 8]], turrets: [{ x: 400, y: 56 }, { x: 900, y: 56, period: 3.3 }],
      stars: [[240, 300], [640, 560], [640, 200], [1000, 400], [1160, 160]], bonus: [80, 100] },
    { world: 3, name: 'RISING TIDE', start: 160, pad: [160, 200], par: 45, hint: 'NEW: the lava is rising. Climb!',
      solids: [[1, 13, 22, 1], [9, 9, 22, 1], [1, 5, 22, 1]], lava: { delay: 5, speed: 9 },
      stars: [[600, 620], [1100, 560], [700, 450], [160, 400], [500, 290], [1100, 240], [640, 110]], bonus: [1200, 100] },
    { world: 3, name: 'ZIG-ZAG CHIMNEY', start: 160, pad: [1100, 200], par: 65, hint: 'tight gaps. Slow is smooth',
      solids: [[1, 13, 13, 1], [16, 13, 15, 1], [1, 9, 22, 1], [25, 9, 6, 1], [1, 5, 6, 1], [9, 5, 22, 1]], turrets: [{ x: 640, y: 56, period: 3 }],
      stars: [[900, 620], [300, 460], [1100, 460], [600, 300], [160, 300], [640, 140]], bonus: [1200, 620] },
    { world: 3, name: 'CROSSFIRE', start: 160, pad: [1120, FLOOR], par: 60, hint: 'lasers, turrets and a locked pad',
      solids: [[14, 7, 4, 4], [24, 11, 7, 1]], gates: [[24, 12, 1, 5]], keys: [[100, 620, 0]],
      turrets: [{ x: 640, y: 258, period: 3 }, { x: 640, y: 462, period: 3.4 }],
      lasers: [{ a: [40, 360], b: [560, 360], period: 4.4, duty: 0.45 }, { a: [720, 360], b: [1240, 360], period: 4.4, duty: 0.45, phase: 0.5 }],
      stars: [[200, 200], [640, 150], [1080, 200], [640, 580], [320, 520]], bonus: [1200, 540] },
    { world: 3, name: 'MELTDOWN', start: 160, pad: [1100, 280], par: 60, hint: 'lava below, lasers ahead',
      solids: [[1, 12, 24, 1], [7, 7, 24, 1]], lava: { delay: 6, speed: 8 },
      lasers: [{ a: [500, 320], b: [500, 480], period: 3.4 }, { a: [820, 320], b: [820, 480], period: 3.4, phase: 0.5 }],
      turrets: [{ x: 640, y: 56, period: 3.2 }],
      stars: [[500, 620], [900, 620], [1160, 440], [660, 400], [160, 300], [400, 160], [800, 140]], bonus: [1200, 100] },
    { world: 3, name: 'THE CORE', start: [1160, FLOOR], pad: [160, 240], par: 90, hint: 'everything at once. Good luck, pilots',
      solids: [[1, 6, 24, 1], [7, 11, 24, 1]], lava: { delay: 8, speed: 6 },
      doors: [{ c: 13, r: 12, w: 3, h: 2, travel: 3, period: 5, wave: 'slam' }, { c: 6, r: 2, w: 3, h: 1, travel: 5, period: 7, axis: 'x' }],
      fans: [{ c: 1, r: 7, w: 6, h: 10, fy: -200, pulse: 6 }],
      lasers: [{ a: [520, 280], b: [520, 440], period: 3.6 }, { a: [840, 280], b: [840, 440], period: 3.6, phase: 0.5 }],
      gates: [[22, 7, 2, 4]], keys: [[100, 620, 0]],
      turrets: [{ x: 900, y: 496, period: 3.4 }, { x: 700, y: 56, period: 3 }],
      stars: [[940, 620], [660, 620], [300, 620], [140, 400], [400, 360], [700, 360], [1000, 360], [1120, 180], [700, 170]], bonus: [1200, 400] },
  ];

  const UPS = [
    { k: 'hull', name: 'HULL PLATING', desc: '+1 heart on every attempt', cost: [12, 30] },
    { k: 'engine', name: 'ENGINE TUNE', desc: '+5% thrust from each engine', cost: [10, 22, 40] },
    { k: 'tank', name: 'ENERGY TANK', desc: '+25% stabiliser energy', cost: [8, 18, 32] },
    { k: 'charge', name: 'FAST CHARGE', desc: 'Energy refills 30% faster', cost: [8, 18, 32] },
    { k: 'magnet', name: 'STAR MAGNET', desc: 'Stars drift to the ship from further off', cost: [6, 14, 26] },
    { k: 'gear', name: 'LANDING GEAR', desc: 'Touchdowns forgive more speed and tilt', cost: [10, 24] },
    { k: 'bumper', name: 'BUMPER PLATING', desc: 'Harder scrapes before a heart is lost', cost: [10, 22, 38] },
    { k: 'shield', name: 'EMERGENCY SHIELD', desc: 'Blocks one hit, then recharges', cost: [20, 40, 70] },
  ];
  const SHIELD_CD = [0, 40, 30, 22];
  const PAINTS = [
    { name: 'CLASSIC', cabin: '#EEF2FA', trim: '#C5CEE0', need: 0 }, { name: 'SUNSET', cabin: '#FFB36B', trim: '#E0803A', need: 6 },
    { name: 'MINT', cabin: '#B8F5DC', trim: '#7FD6B4', need: 16 }, { name: 'BUBBLEGUM', cabin: '#FFB3D9', trim: '#E07AB0', need: 30 },
    { name: 'SOLID GOLD', cabin: '#FFD86B', trim: '#D9A520', need: 50 }, { name: 'ROYAL', cabin: '#C9A0FF', trim: '#8B5FD0', need: 72 },
  ];
  const MEDALS = [['c', 'CLEARED', '#7CFF6B'], ['a', 'ALL STARS', VIOLET], ['f', 'NO DAMAGE', '#FF8A5C'], ['p', 'PAR TIME', '#6FD8FF']];

  // ---------- pure helpers shared by the game, the generator and the validator ----------
  function doorOff(d, t) {
    const u = fract(t / d.period + (d.phase || 0));
    if (d.wave === 'slam') return d.travel * T * (u < 0.55 ? 0 : u < 0.62 ? (u - 0.55) / 0.07 : u < 0.8 ? 1 : 1 - (u - 0.8) / 0.2);
    return d.travel * T * (0.5 - 0.5 * Math.cos(TAU * u));
  }
  function doorBox(d, t) { const o = doorOff(d, t), x = d.c * T + (d.axis === 'x' ? o : 0), y = d.r * T + (d.axis === 'x' ? 0 : o); return [x, y, x + d.w * T, y + d.h * T]; }
  const laserU = (l, t) => fract(t / l.period + (l.phase || 0));
  const laserOn = (l, t) => laserU(l, t) < (l.duty || 0.5);
  const laserWarn = (l, t) => laserU(l, t) > 1 - 0.6 / l.period;
  const lavaAt = (L, t) => L.lava ? Math.max(70, FLOOR + 14 - Math.max(0, t - L.lava.delay) * L.lava.speed) : 9999;
  function norm(L) {
    const w = L.world || 0;
    return { name: L.name, world: w, glow: L.glow || WORLDS[w].glow, grav: L.grav || 1, hint: L.hint || '', par: L.par || 60, free: !!L.free,
      start: Array.isArray(L.start) ? L.start : [L.start || 160, FLOOR], pad: L.pad, solids: L.solids || [], stars: L.stars || [], bonus: L.bonus || null,
      doors: L.doors || [], zones: (L.fans || []).concat(L.zones || []), lasers: L.lasers || [], keys: L.keys || [], gates: L.gates || [],
      crate: L.crate || null, drop: L.drop || null, turrets: L.turrets || [], lava: L.lava || null };
  }
  function buildGrid(L) {
    const gr = new Uint8Array(GW * GH);
    for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) if (r === 0 || c === 0 || r === GH - 1 || c === GW - 1) gr[r * GW + c] = 1;
    for (const [c, r, w, h] of L.solids) for (let y = Math.max(0, r); y < Math.min(GH, r + h); y++) for (let x = Math.max(0, c); x < Math.min(GW, c + w); x++) gr[y * GW + x] = 1;
    return gr;
  }

  // ---------- validator: can a (slow, patient) ship reach everything, in a workable order? ----------
  // A time-stepped flood fill over 8px cells, with the free space shrunk by the ship's radius.
  // Doors, crushers, lasers, locked gates and rising lava block cells at the times they are in the way.
  const CS = 8, CW = W / CS, CH = H / CS, CLEAR = R + 4;
  function staticMask(L) {
    const gr = buildGrid(L), m = new Uint8Array(CW * CH);
    for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
      const x = cx * CS + CS / 2, y = cy * CS + CS / 2;
      const c0 = Math.floor((x - CLEAR) / T), c1 = Math.floor((x + CLEAR) / T), r0 = Math.floor((y - CLEAR) / T), r1 = Math.floor((y + CLEAR) / T);
      let hit = false;
      for (let r = r0; r <= r1 && !hit; r++) for (let c = c0; c <= c1; c++) {
        if (!(c < 0 || r < 0 || c >= GW || r >= GH || gr[r * GW + c])) continue;
        const nx = clamp(x, c * T, c * T + T), ny = clamp(y, r * T, r * T + T);
        if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < CLEAR * CLEAR) { hit = true; break; }
      }
      m[cy * CW + cx] = hit ? 1 : 0;
    }
    return m;
  }
  function stamp(m, x0, y0, x1, y1) {
    const a = Math.max(0, Math.floor((x0 - CLEAR) / CS)), b = Math.min(CW - 1, Math.floor((x1 + CLEAR) / CS)), c = Math.max(0, Math.floor((y0 - CLEAR) / CS)), d = Math.min(CH - 1, Math.floor((y1 + CLEAR) / CS));
    for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) m[cy * CW + cx] = 1;
  }
  function nearFree(m, x, y) {
    const cx = clamp(Math.floor(x / CS), 0, CW - 1), cy = clamp(Math.floor(y / CS), 0, CH - 1);
    for (let rad = 0; rad <= 3; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const ax = cx + dx, ay = cy + dy; if (ax < 0 || ay < 0 || ax >= CW || ay >= CH) continue;
      if (!m[ay * CW + ax]) return ay * CW + ax;
    }
    return -1;
  }
  function validate(L0, quick) {
    const L = norm(L0), stat = staticMask(L);
    const objs = [];
    L.stars.forEach((s, i) => objs.push({ n: 'star ' + (i + 1), x: s[0], y: s[1] }));
    if (L.bonus) objs.push({ n: 'bonus star', x: L.bonus[0], y: L.bonus[1] });
    L.keys.forEach((k, i) => objs.push({ n: 'key ' + (i + 1), x: k[0], y: k[1], key: k[2] }));
    if (L.crate) { objs.push({ n: 'crate', x: L.crate[0], y: L.crate[1] - 14, crate: 1 }); objs.push({ n: 'delivery spot', x: L.drop[0], y: L.drop[1], drop: 1 }); }
    objs.push({ n: 'landing pad', x: L.pad[0], y: L.pad[1] - R - 6, pad: 1 });
    for (const o of objs) { o.cell = nearFree(stat, o.x, o.y); if (o.cell < 0) return { ok: false, fail: o.n + ' is inside rock' }; }
    let cur = nearFree(stat, L.start[0], L.start[1] - R - 6);
    if (cur < 0) return { ok: false, fail: 'start is inside rock' };
    const open = {}; let t = 0, haveCrate = false;
    const timed = !quick && (L.doors.length || L.lasers.length || L.lava);
    const STEP = 0.2, SPREAD = 4, MAXLEG = 80;
    const blocked = new Uint8Array(CW * CH);
    const fill = time => {
      blocked.set(stat);
      if (!quick) for (const d of L.doors) { const b = doorBox(d, time); stamp(blocked, b[0], b[1], b[2], b[3]); }
      L.gates.forEach((gt, i) => { if (!open[i]) stamp(blocked, gt[0] * T, gt[1] * T, (gt[0] + gt[2]) * T, (gt[1] + gt[3]) * T); });
      if (!quick) for (const l of L.lasers) if (laserOn(l, time) || laserWarn(l, time)) stamp(blocked, Math.min(l.a[0], l.b[0]), Math.min(l.a[1], l.b[1]), Math.max(l.a[0], l.b[0]), Math.max(l.a[1], l.b[1]));
      if (!quick && L.lava) { const ly = lavaAt(L, time), cy0 = Math.max(0, Math.floor((ly - R) / CS)); for (let cy = cy0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) blocked[cy * CW + cx] = 1; }
    };
    // grow a set of reachable cells by up to `iters` rings, staying out of blocked cells
    const grow = (a, b, iters) => {
      for (let k = 0; k < iters; k++) {
        let grew = 0; b.set(a);
        for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
          const i = cy * CW + cx; if (a[i] || blocked[i]) continue;
          if ((cx > 0 && a[i - 1]) || (cx < CW - 1 && a[i + 1]) || (cy > 0 && a[i - CW]) || (cy < CH - 1 && a[i + CW])) { b[i] = 1; grew++; }
        }
        const sw = a; a = b; b = sw;
        if (!grew) break;
      }
      return [a, b];
    };
    const prune = a => { let alive = 0; for (let i = 0; i < a.length; i++) { if (a[i] && blocked[i]) a[i] = 0; alive += a[i]; } return alive; };
    // would a ship that is exactly here at time t0 survive the next three seconds? (do not grab a star just as a crusher lands)
    const pa = new Uint8Array(CW * CH), pb = new Uint8Array(CW * CH);
    const probe = (cell, t0) => {
      if (!timed) return true;
      let a = pa, b = pb; a.fill(0); a[cell] = 1;
      for (let s = 0; s <= 15; s++) { fill(t0 + s * STEP); if (!prune(a)) return false; [a, b] = grow(a, b, SPREAD); }
      return true;
    };
    let reach = new Uint8Array(CW * CH), next = new Uint8Array(CW * CH);
    let left = objs.length;
    const names = () => objs.filter(o => !o.done).map(o => o.n).join(', ');
    while (left > 0) {
      reach.fill(0); reach[cur] = 1;
      let found = null, legT = 0;
      for (;;) {
        fill(t);
        if (!prune(reach)) return { ok: false, fail: 'ship gets caught at t=' + t.toFixed(1) + 's before reaching ' + names() };
        [reach, next] = grow(reach, next, timed ? SPREAD : 400);
        const others = objs.filter(o => !o.done && !o.pad && !(o.drop && !haveCrate));
        for (const o of (others.length ? others : objs.filter(o => !o.done))) {
          if (o.drop && !haveCrate) continue;
          if (reach[o.cell] && probe(o.cell, t)) { found = o; break; }
        }
        if (found) break;
        if (!timed) return { ok: false, fail: 'cannot reach ' + names() };
        t += STEP; legT += STEP;
        if (legT > MAXLEG) return { ok: false, fail: 'no safe route in time to ' + names() };
      }
      found.done = true; left--; cur = found.cell;
      if (found.key !== undefined) open[found.key] = true;
      if (found.crate) haveCrate = true;
    }
    return { ok: true, time: +t.toFixed(1) };
  }

  // ---------- Deep Run: generated caverns ----------
  function genLevel(d) {
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    for (let tries = 0; tries < 40; tries++) {
      const L = { world: Math.floor(d / 2) % 4, name: 'DEPTH ' + (d + 1), start: 140, pad: [1140, FLOOR], solids: [], stars: [], zones: [], lasers: [], turrets: [], doors: [], par: 45, hint: '' };
      const rects = [], nb = Math.min(8, 2 + Math.floor(d * 0.6) + ri(0, 1));
      const clash = (c, r, w, h, m) => (c - m < 7 && r + h + m > 11) || (c + w + m > 25 && r + h + m > 12) || rects.some(q => c < q[0] + q[2] + m && c + w + m > q[0] && r < q[1] + q[3] + m && r + h + m > q[1]);
      for (let i = 0, guard = 0; i < nb && guard < 60; guard++) {
        let c, r, w, h;
        if (Math.random() < 0.55) { w = Math.random() < 0.35 ? 2 : 1; h = ri(4, 9); c = ri(6, 25); r = Math.random() < 0.5 ? 1 : 17 - h; }
        else { w = ri(3, 6); h = 1; c = ri(3, 27 - w); r = ri(4, 12); }
        if (clash(c, r, w, h, 3)) continue;
        rects.push([c, r, w, h]); i++;
      }
      L.solids = rects;
      if (d >= 5 && Math.random() < 0.3) { L.grav = 0.65; L.hint = 'low gravity'; }
      const slabs = rects.filter(q => q[3] === 1 && q[2] >= 4 && q[0] > 14 && q[1] >= 5);
      if (d >= 2 && slabs.length && Math.random() < 0.5) { const q = pick(slabs); L.pad = [(q[0] + q[2] / 2) * T, q[1] * T]; }
      const stat = staticMask(norm(L));
      const reach = new Uint8Array(CW * CH), q = [nearFree(stat, 140, FLOOR - R - 6)];
      if (q[0] < 0) continue; reach[q[0]] = 1;
      for (let qi = 0; qi < q.length; qi++) { const i = q[qi], cx = i % CW; for (const n of [cx > 0 ? i - 1 : -1, cx < CW - 1 ? i + 1 : -1, i - CW, i + CW]) if (n >= 0 && n < reach.length && !reach[n] && !stat[n]) { reach[n] = 1; q.push(n); } }
      const okAt = (x, y) => { const cx = Math.floor(x / CS), cy = Math.floor(y / CS); return reach[cy * CW + cx] === 1; };
      if (!okAt(L.pad[0], L.pad[1] - R - 8)) continue;
      const ns = Math.min(7, 3 + Math.floor(d / 2)), pts = [];
      for (let guard = 0; pts.length < ns + 1 && guard < 400; guard++) {
        const x = ri(80, 1200), y = ri(90, 640);
        if (!okAt(x, y) || !okAt(x - 14, y) || !okAt(x + 14, y) || !okAt(x, y - 14) || !okAt(x, y + 14)) continue;
        if (Math.hypot(x - 140, y - 660) < 170 || Math.hypot(x - L.pad[0], y - L.pad[1]) < 110 || pts.some(p => Math.hypot(p[0] - x, p[1] - y) < 150)) continue;
        pts.push([x, y]);
      }
      if (pts.length < ns + 1) continue;
      L.bonus = pts.pop(); L.stars = pts;
      // hazards, more of them the deeper you go
      let budget = Math.floor(d * 0.8);
      const pillars = rects.filter(q2 => q2[3] > 1);
      for (let guard = 0; budget > 0 && guard < 30; guard++) {
        const kind = pick(d >= 4 ? ['fan', 'laser', 'laser', 'turret', 'turret'] : d >= 2 ? ['fan', 'laser', 'laser'] : ['fan']);
        if (kind === 'fan' && L.zones.length < 2) {
          const c = ri(7, 22), w = ri(3, 5); if (rects.some(q2 => c < q2[0] + q2[2] + 1 && c + w + 1 > q2[0])) continue;
          L.zones.push(Math.random() < 0.6 ? { c, r: 3, w, h: 14, fy: -(180 + d * 6), pulse: ri(4, 7) } : { c, r: 1, w, h: 16, fy: 110 + d * 4 }); budget--;
        } else if (kind === 'laser' && pillars.length && L.lasers.length < 3) {
          const p = pick(pillars), x = (p[0] + p[2] / 2) * T; if (L.lasers.some(l => l.a[0] === x)) continue;
          const y0 = p[1] === 1 ? (1 + p[3]) * T : 40, y1 = p[1] === 1 ? FLOOR : p[1] * T;
          if (rects.some(q2 => q2 !== p && x > q2[0] * T && x < (q2[0] + q2[2]) * T && q2[1] * T < y1 && (q2[1] + q2[3]) * T > y0)) continue;
          if (L.pad[1] !== FLOOR ? false : Math.abs(x - L.pad[0]) < 100) continue;
          L.lasers.push({ a: [x, y0], b: [x, y1], period: 3 + Math.random() * 1.5, duty: 0.45, phase: Math.random() }); budget--;
        } else if (kind === 'turret' && L.turrets.length < 2) {
          const x = ri(300, 1000); if (rects.some(q2 => q2[1] === 1 && x > q2[0] * T - 30 && x < (q2[0] + q2[2]) * T + 30)) continue;
          L.turrets.push({ x, y: 56, period: Math.max(2.2, 3.6 - d * 0.08) }); budget--;
        }
      }
      L.par = 30 + ns * 6;
      return L;
    }
    return { world: Math.floor(d / 2) % 4, name: 'DEPTH ' + (d + 1), start: 140, pad: [1140, FLOOR], solids: [[14, 9, 4, 8]], stars: [[400, 300], [640, 200], [900, 300]], bonus: [640, 90], par: 40 };
  }

  // ---------- drawing bits ----------
  function starPath(c, x, y, r, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.46 : r;
      if (i) c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); else c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  function heart(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * 0.9);
    c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.3);
    c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9); c.closePath();
  }
  // The lander, drawn around 0,0 (collision circle radius 18). e0 / e1 = engine power 0..1.
  function drawShip(c, e0, e1, t, o) {
    o = o || {};
    const np = E.players.length, paint = PAINTS[o.paint || 0] || PAINTS[0];
    c.globalCompositeOperation = 'lighter';
    for (const [x, e, col] of [[-16.5, e0, COL[0]], [16.5, e1, COL[1]]]) {
      if (e < 0.05) continue;
      const L = (17 + Math.sin(t * 61 + x) * 4 + Math.sin(t * 37) * 3) * e;
      c.fillStyle = col; c.beginPath(); c.moveTo(x - 7, 16); c.lineTo(x + 7, 16); c.lineTo(x, 16 + L * 1.7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x - 3.5, 16); c.lineTo(x + 3.5, 16); c.lineTo(x, 16 + L * 0.95); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    c.lineJoin = 'round'; c.lineWidth = 2.5; c.strokeStyle = '#0a0d18';
    for (const [x, col, lit] of [[-23, COL[0], e0], [10, COL[1], e1]]) {
      c.fillStyle = '#55607A'; c.beginPath(); c.moveTo(x + 2, 13); c.lineTo(x + 11, 13); c.lineTo(x + 14, 18); c.lineTo(x - 1, 18); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = col; c.beginPath(); c.roundRect(x, -5, 13, 19, 4); c.fill(); c.stroke();
      c.fillStyle = lit > 0.3 ? '#ffffff' : 'rgba(255,255,255,0.45)'; c.fillRect(x + 3, -1, 7, 3);
    }
    if (np >= 3) {    // navigator's swivel jet on the belly; o.jetAng = exhaust direction in the ship's frame
      const ja = o.jetAng === undefined ? Math.PI / 2 : o.jetAng, je = o.jet || 0, NAV = COL[2];
      c.save(); c.translate(0, 13); c.rotate(ja);
      if (je > 0.05) {
        const L = (18 + Math.sin(t * 53) * 4) * je;
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = NAV; c.beginPath(); c.moveTo(8, -4.5); c.lineTo(8, 4.5); c.lineTo(8 + L * 1.6, 0); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(8, -2.2); c.lineTo(8, 2.2); c.lineTo(8 + L * 0.8, 0); c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      c.fillStyle = '#55607A'; c.beginPath(); c.moveTo(2, -3); c.lineTo(9, -4.5); c.lineTo(9, 4.5); c.lineTo(2, 3); c.closePath(); c.fill(); c.stroke();
      c.restore();
      c.fillStyle = NAV; c.beginPath(); c.arc(0, 13, 5.5, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = je > 0.3 ? '#ffffff' : 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(0, 13, 2, 0, TAU); c.fill();
    }
    c.beginPath(); c.moveTo(0, -18); c.lineTo(0, -25); c.stroke();
    c.fillStyle = Math.sin(t * 6) > 0 ? GOLD : '#8a6d10'; c.beginPath(); c.arc(0, -26, 3, 0, TAU); c.fill();
    c.fillStyle = paint.cabin; c.beginPath(); c.roundRect(-13, -19, 26, 30, 11); c.fill(); c.stroke();
    c.fillStyle = paint.trim; c.fillRect(-11.5, 3, 23, 4);
    c.fillStyle = '#12203F'; c.beginPath(); c.ellipse(0, -7, 9.5, 7.5, 0, 0, TAU); c.fill();
    const lx = clamp((o.lx || 0), -1, 1) * 1.6, ly = clamp((o.ly || 0), -1, 1) * 1.4, blink = fract(t * 0.31) > 0.95;
    const seats = np >= 3 ? [[-5.9, COL[0]], [0, COL[2]], [5.9, COL[1]]] : [[-4.2, COL[0]], [4.2, COL[1]]], er = np >= 3 ? 2.4 : 2.9;
    for (const [x, col] of seats) {
      if (o.ouch) { c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 2, -9); c.lineTo(x + 2, -5); c.moveTo(x + 2, -9); c.lineTo(x - 2, -5); c.stroke(); }
      else if (blink) { c.fillStyle = col; c.fillRect(x - er, -7.6, er * 2, 1.4); }
      else { c.fillStyle = col; c.beginPath(); c.arc(x + lx * (np >= 3 ? 0.7 : 1), -7 + ly, er, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + lx * (np >= 3 ? 0.7 : 1) + 0.9, -7.9 + ly, er * 0.35, 0, TAU); c.fill(); }
    }
    c.strokeStyle = '#0a0d18'; c.lineWidth = 2.5;
  }
  function drawMedal(g, x, y, r, m, on, t) {
    g.fillStyle = on ? m[2] : 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.lineWidth = Math.max(1.5, r * 0.14); g.strokeStyle = on ? '#0a0d18' : 'rgba(255,255,255,0.18)'; g.stroke();
    if (!on) return;
    g.fillStyle = '#0a0d18'; g.strokeStyle = '#0a0d18'; g.lineWidth = Math.max(1.5, r * 0.16); g.lineCap = 'round'; g.lineJoin = 'round';
    if (m[0] === 'c') { g.beginPath(); g.moveTo(x - r * 0.45, y); g.lineTo(x - r * 0.1, y + r * 0.35); g.lineTo(x + r * 0.5, y - r * 0.35); g.stroke(); }
    else if (m[0] === 'a') { starPath(g, x, y, r * 0.58, 0); g.fill(); }
    else if (m[0] === 'f') { heart(g, x, y - r * 0.05, r * 0.42); g.fill(); }
    else { g.beginPath(); g.arc(x, y, r * 0.5, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - r * 0.32); g.moveTo(x, y); g.lineTo(x + r * 0.24, y + r * 0.1); g.stroke(); }
  }

  function create() {
    const P = E.players, NP = P.length, NAVP = NP >= 3;
    const NAV = NAVP ? COL[2] : '#BFFFE8', PADC = NAVP ? '#FFF2A8' : '#7CFF6B';
    const any = k => P.some(p => p[k]);
    // ----- saved progress -----
    const save = Save.load('copilot', {});
    save.stars = save.stars | 0; save.paint = save.paint | 0; save.deep = save.deep | 0; save.runs = save.runs | 0;
    if (!save.lv || typeof save.lv !== 'object') save.lv = {};
    if (!save.up || typeof save.up !== 'object') save.up = {};
    const up = k => save.up[k] | 0;
    const rec = i => { let r = save.lv['c' + i]; if (!r || typeof r !== 'object') r = save.lv['c' + i] = {}; if (!Array.isArray(r.g)) r.g = []; return r; };
    const cleared = i => !!(save.lv['c' + i] && save.lv['c' + i].c);
    const unlocked = i => i === 0 || cleared(i - 1);
    const medalCount = () => { let n = 0; for (let i = 0; i < LEVELS.length; i++) { const r = save.lv['c' + i]; if (r) for (const m of MEDALS) if (r[m[0]]) n++; } return n; };
    const deepOpen = () => cleared(5);
    const persist = () => Save.store('copilot', save);

    const st = { scr: 'map', t: 0, mode: 'camp', li: 0, phase: 'ready', pt: 2, clock: 0, at: 0, time: 0, hull: HULL, fuel: 1, lock: false, got: 0, hurt: false,
      landT: 0, rumT: 0, thudT: 0, stabT: 0, jetT: 0, ouchT: 0, litT: 0, crush: 0, shield: false, shieldCd: 0, lavaT: 0, warnT: 0,
      depth: 0, ships: DEEP_SHIPS, pay: 0, msg: '', msgT: 0 };
    const sel = { r: 0, c: 0 }; let hsel = 0, rsel = 0, res = null;
    for (let i = LEVELS.length - 1; i >= 0; i--) if (unlocked(i)) { sel.r = Math.floor(i / 6); sel.c = i % 6; break; }
    const ship = { x: 0, y: 0, vx: 0, vy: 0, ang: 0, w: 0, inv: 0, ground: false, alive: true, eng: [0, 0], stab: 0, jet: 0, jetAim: -Math.PI / 2 };
    let raw = LEVELS[0], lvl = norm(raw), grid = buildGrid(lvl), stars = [], bonus = null, keys = [], gates = [], doors = [], zones = [], lasers = [], turrets = [], bullets = [], crate = null;
    const SC = 2;
    const layer = document.createElement('canvas'); layer.width = W * SC; layer.height = H * SC; const lg = layer.getContext('2d');
    const far = document.createElement('canvas'); far.width = W + 120; far.height = H + 120; const fg = far.getContext('2d');
    let farWorld = -1;
    const maxHull = () => HULL + up('hull');
    const solid = (c, r) => c < 0 || r < 0 || c >= GW || r >= GH || grid[r * GW + c] === 1;
    const hash = (c, r) => fract(Math.sin(c * 127.1 + r * 311.7) * 43758.5453);

    const MENU_PADS = { a: 'OK', b: 'BACK', stick: 'CHOOSE' };
    const FLY_PADS = NAVP ? [{ a: 'LEFT ENGINE', b: 'B', stick: 'UP = ENGINE' }, { a: 'RIGHT ENGINE', b: 'B', stick: 'UP = ENGINE' }, { a: 'JET', b: 'STEADY', stick: 'AIM THE JET' }]
      : [{ a: 'LEFT ENGINE', b: 'STEADY', stick: 'UP = ENGINE' }, { a: 'RIGHT ENGINE', b: 'STEADY', stick: 'UP = ENGINE' }];
    function go(scr) { st.scr = scr; st.t = 0; E.setPads(scr === 'fly' ? FLY_PADS : MENU_PADS, 'CO-PILOT'); }

    function renderFar(w) {
      if (farWorld === w) return; farWorld = w;
      const WD = WORLDS[w], bg = fg.createLinearGradient(0, 0, 0, far.height);
      bg.addColorStop(0, WD.bg[0]); bg.addColorStop(1, WD.bg[1]);
      fg.globalAlpha = 1; fg.fillStyle = bg; fg.fillRect(0, 0, far.width, far.height);
      for (let i = 0; i < 7; i++) {
        const x = rand(far.width), y = rand(far.height), r = rand(160, 340), ng = fg.createRadialGradient(x, y, 0, x, y, r);
        ng.addColorStop(0, pick(WD.shard)); ng.addColorStop(1, 'rgba(0,0,0,0)');
        fg.globalAlpha = 0.16; fg.fillStyle = ng; fg.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 34; i++) {
        const x = rand(far.width), y = rand(far.height), s = rand(20, 70), a = rand(-0.5, 0.5);
        fg.save(); fg.translate(x, y); fg.rotate(a);
        fg.globalAlpha = rand(0.07, 0.17); fg.fillStyle = pick(WD.shard);
        fg.beginPath(); fg.moveTo(0, -s); fg.lineTo(s * 0.28, 0); fg.lineTo(0, s * 0.5); fg.lineTo(-s * 0.28, 0); fg.closePath(); fg.fill();
        fg.restore();
      }
      for (let i = 0; i < 150; i++) { fg.globalAlpha = rand(0.1, 0.5); fg.fillStyle = '#fff'; fg.fillRect(rand(far.width), rand(far.height), rand(1, 2.4), rand(1, 2.4)); }
      fg.globalAlpha = 1;
    }
    function renderLayer() {
      const tint = WORLDS[lvl.world].tint;
      lg.setTransform(SC, 0, 0, SC, 0, 0); lg.clearRect(0, 0, W, H);
      for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
        if (!solid(c, r)) continue;
        const h = hash(c, r), v = Math.round(22 + h * 10);
        lg.fillStyle = 'rgb(' + (v + tint[0]) + ',' + (v + tint[1]) + ',' + (v + tint[2]) + ')'; lg.fillRect(c * T, r * T, T + 0.5, T + 0.5);
        lg.fillStyle = 'rgba(255,255,255,0.045)';
        lg.beginPath(); lg.moveTo(c * T + h * 30, r * T + 6); lg.lineTo(c * T + 10 + h * 26, r * T + 4 + h * 20); lg.lineTo(c * T + 2 + h * 18, r * T + 30); lg.closePath(); lg.fill();
        lg.fillStyle = 'rgba(0,0,0,0.25)'; lg.fillRect(c * T + hash(r, c) * 30, r * T + hash(c + 5, r) * 30, 5, 4);
      }
      lg.lineCap = 'round';
      for (const [wd, al] of [[16, 0.1], [8, 0.28], [2.6, 1]]) {
        lg.lineWidth = wd; lg.globalAlpha = al; lg.strokeStyle = lvl.glow; lg.beginPath();
        for (let r = 0; r < GH; r++) for (let c = 0; c < GW; c++) {
          if (!solid(c, r)) continue;
          const x = c * T, y = r * T;
          if (r > 0 && !solid(c, r - 1)) { lg.moveTo(x, y); lg.lineTo(x + T, y); }
          if (r < GH - 1 && !solid(c, r + 1)) { lg.moveTo(x, y + T); lg.lineTo(x + T, y + T); }
          if (c > 0 && !solid(c - 1, r)) { lg.moveTo(x, y); lg.lineTo(x, y + T); }
          if (c < GW - 1 && !solid(c + 1, r)) { lg.moveTo(x + T, y); lg.lineTo(x + T, y + T); }
        }
        lg.stroke();
      }
      lg.globalAlpha = 1;
      lg.fillStyle = '#3A4466'; lg.beginPath(); lg.roundRect(lvl.start[0] - 44, lvl.start[1] - 6, 88, 8, 3); lg.fill();
      lg.fillStyle = 'rgba(255,255,255,0.35)'; lg.fillRect(lvl.start[0] - 36, lvl.start[1] - 6, 72, 2);
    }

    // fresh = a new cavern; otherwise a retry that keeps stars and keys already collected
    function loadLevel(L, fresh) {
      raw = L; lvl = norm(L);
      if (NAVP && lvl.glow === '#7CFF6B') lvl.glow = '#DDE6FF';
      grid = buildGrid(lvl);
      if (fresh) {
        stars = lvl.stars.map(([x, y]) => ({ x, y, hx: x, hy: y, got: false, ph: rand(TAU) }));
        bonus = lvl.bonus ? { x: lvl.bonus[0], y: lvl.bonus[1], hx: lvl.bonus[0], hy: lvl.bonus[1], got: false, ph: rand(TAU) } : null;
        keys = lvl.keys.map(([x, y, gi]) => ({ x, y, g: gi, got: false }));
        crate = lvl.crate ? { hx: lvl.crate[0], hy: lvl.crate[1], x: lvl.crate[0], y: lvl.crate[1], s: 'home' } : null;
        st.got = 0; st.time = 0; st.hurt = false; st.litT = 0;
      } else {
        for (const s of stars) if (!s.got) { s.x = s.hx; s.y = s.hy; }
        if (bonus && !bonus.got) { bonus.x = bonus.hx; bonus.y = bonus.hy; }
        if (crate && crate.s !== 'done') { crate.s = 'home'; crate.x = crate.hx; crate.y = crate.hy; }
      }
      gates = lvl.gates.map(([c, r, w, h], i) => ({ c, r, w, h, open: keys.some(k => k.g === i && k.got), a: 0 }));
      for (const gt of gates) if (gt.open) gt.a = 1;
      doors = lvl.doors.map(d => Object.assign({ x: 0, y: 0, vx: 0, vy: 0 }, d));
      zones = lvl.zones.map(f => ({ x0: f.c * T, y0: f.r * T, x1: (f.c + f.w) * T, y1: (f.r + f.h) * T, fx: f.fx || 0, fy: f.fy || 0, pulse: f.pulse || 0, pw: 1, spin: 0 }));
      lasers = lvl.lasers; bullets = [];
      turrets = lvl.turrets.map(tu => ({ x: tu.x, y: tu.y, period: tu.period || 2.8, speed: tu.speed || 190, t: rand(0.5, 1.5), aim: Math.PI / 2 }));
      st.at = 0; st.hull = maxHull(); st.fuel = 1; st.lock = false; st.landT = 0; st.crush = 0;
      st.shield = up('shield') > 0; st.shieldCd = 0;
      renderFar(lvl.world); renderLayer(); resetShip(); moveDoors(0);
    }
    function resetShip() {
      ship.x = lvl.start[0]; ship.y = lvl.start[1] - R; ship.vx = ship.vy = 0; ship.ang = 0; ship.w = 0; ship.inv = 1.2; ship.alive = true;
      ship.eng[0] = ship.eng[1] = 0; ship.stab = 0; ship.jet = 0; ship.jetAim = -Math.PI / 2; ship.ground = true; st.landT = 0;
    }
    function moveDoors(dt) {
      for (const d of doors) {
        const b = doorBox(d, st.clock), nx = b[0], ny = b[1];
        d.vx = dt > 0 ? clamp((nx - d.x) / dt, -1200, 1200) : 0; d.vy = dt > 0 ? clamp((ny - d.y) / dt, -1200, 1200) : 0;
        d.x = nx; d.y = ny;
      }
    }
    const padOpen = () => st.got === stars.length && (!crate || crate.s === 'done');
    function checkPad() {
      if (st.litT > 0 || !padOpen()) return;
      st.litT = 0.001; S.power();
      FX.banner('PAD IS OPEN!', { size: 64, color: PADC, life: 1.2, y: 200 });
      FX.ring(lvl.pad[0], lvl.pad[1], { r1: 200, color: PADC, w: 7, life: 0.7 });
    }
    function intro(first) {
      st.phase = 'ready'; st.pt = first ? 2.0 : 1.2;
      if (first) {
        const title = st.mode === 'deep' ? 'DEPTH ' + (st.depth + 1) : 'CAVERN ' + (st.li + 1);
        FX.banner(title, { size: 96, life: 1.8, color: lvl.glow, sub: st.mode === 'deep' ? (lvl.hint || WORLDS[lvl.world].name) : lvl.name + (lvl.hint ? '  ·  ' + lvl.hint : '') }); S.wave();
      } else S.count();
    }
    function startCavern(i) { st.mode = 'camp'; st.li = i; FX.clear(); loadLevel(LEVELS[i], true); go('fly'); intro(true); }
    function startDeep() { st.mode = 'deep'; st.depth = 0; st.ships = DEEP_SHIPS; st.pay = 0; FX.clear(); loadLevel(genLevel(0), true); go('fly'); intro(true); }

    // circle-vs-boxes; returns the hardest impact this frame (or null)
    function collide() {
      ship.ground = false; let best = null, stuck = false;
      for (let it = 0; it < 3; it++) {
        const boxes = [];
        const c0 = Math.floor((ship.x - R) / T), c1 = Math.floor((ship.x + R) / T), r0 = Math.floor((ship.y - R) / T), r1 = Math.floor((ship.y + R) / T);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solid(c, r)) boxes.push([c * T, r * T, c * T + T, r * T + T, 0, 0, 0]);
        for (const d of doors) boxes.push([d.x, d.y, d.x + d.w * T, d.y + d.h * T, d.vx, d.vy, 1]);
        for (const gt of gates) if (!gt.open) boxes.push([gt.c * T, gt.r * T, (gt.c + gt.w) * T, (gt.r + gt.h) * T, 0, 0, 0]);
        let anyHit = false;
        for (const b of boxes) {
          const nx = clamp(ship.x, b[0], b[2]), ny = clamp(ship.y, b[1], b[3]);
          const dx = ship.x - nx, dy = ship.y - ny, d2 = dx * dx + dy * dy;
          if (d2 >= R * R) continue;
          let ux, uy, pen;
          if (d2 > 0.0001) { const d = Math.sqrt(d2); ux = dx / d; uy = dy / d; pen = R - d; }
          else {
            const l = ship.x - b[0], rt = b[2] - ship.x, tp = ship.y - b[1], bt = b[3] - ship.y, m = Math.min(l, rt, tp, bt);
            ux = m === l ? -1 : m === rt ? 1 : 0; uy = ux ? 0 : m === tp ? -1 : 1; pen = R + m;
          }
          anyHit = true; ship.x += ux * pen; ship.y += uy * pen;
          const rvx = ship.vx - b[4], rvy = ship.vy - b[5], vn = rvx * ux + rvy * uy;
          if (vn < 0) {
            const imp = -vn, e = imp > 60 ? 0.45 : 0;
            ship.vx = rvx - (1 + e) * vn * ux + b[4]; ship.vy = rvy - (1 + e) * vn * uy + b[5];
            if (imp > 60) ship.w += clamp((ship.vx * -uy + ship.vy * ux) * 0.012, -3, 3);
            if (!best || imp > best.imp) best = { imp, x: nx, y: ny, ux, uy };
          }
          if (uy < -0.7) { ship.ground = true; if (b[6] && b[4]) ship.x += b[4] * 0.016; }   // ride a moving platform
        }
        stuck = anyHit && it === 2;
        if (!anyHit) break;
      }
      st.crush = stuck ? st.crush + 1 : 0;
      return best;
    }

    function damage(hit, word) {
      if (st.shield) {
        st.shield = false; st.shieldCd = SHIELD_CD[up('shield')] || 40; ship.inv = 1.2;
        FX.ring(ship.x, ship.y, { r0: 24, r1: 110, color: '#9FE8FF', w: 8, life: 0.45 }); FX.burst(ship.x, ship.y, { n: 18, color: ['#9FE8FF', '#fff'], speed: 300, life: 0.5 });
        FX.text(ship.x, ship.y - 40, 'SHIELD!', { color: '#9FE8FF', size: 28 }); S.shield(); E.shake(6); E.buzz(-1, 60);
        return;
      }
      const free = lvl.free;
      if (!free) { st.hull--; st.hurt = true; }
      ship.inv = 1.4; st.ouchT = 0.8; ship.w += rand(-1, 1) * 3.5;
      FX.burst(hit.x, hit.y, { n: 22, color: ['#fff', GOLD, lvl.glow], speed: [120, 460], life: 0.5, size: 3.5, ang: Math.atan2(hit.uy, hit.ux), spread: 1.2 });
      FX.ring(hit.x, hit.y, { r1: 70, color: '#fff', life: 0.3 });
      FX.text(ship.x, ship.y - 40, word || pick(['BONK!', 'OOF!', 'CLANG!', 'WHOOPS!', 'OUCH!']), { color: '#FF8A5C', size: 28 });
      if (free) FX.text(ship.x, ship.y - 66, 'free in training', { color: '#fff', size: 15 });
      if (crate && crate.s === 'carried') { crate.s = 'home'; crate.x = crate.hx; crate.y = crate.hy; FX.text(ship.x, ship.y - 70, 'CRATE DROPPED!', { color: '#FFB347', size: 22 }); FX.ring(crate.hx, crate.hy, { r1: 70, color: '#FFB347' }); }
      E.shake(10); E.freeze(0.05); E.buzz(-1, 90); S.hit(ship.x); S.clang(ship.x);
      if (st.hull <= 0) explode('KABOOM!');
    }
    function explode(word) {
      if (!ship.alive) return;
      ship.alive = false; st.phase = 'dead'; st.pt = 1.9; st.hurt = true;
      if (st.mode === 'deep') st.ships--;
      const x = ship.x, y = ship.y;
      FX.burst(x, y, { n: 50, color: ['#FFD23F', '#FF8A5C', '#fff'], speed: [80, 520], life: 0.9, size: 7 });
      FX.burst(x, y, { n: 26, color: ['#555E7A', '#39405a'], speed: [40, 220], life: 1.4, size: 11, add: false, drag: 1.5 });
      FX.burst(x, y, { n: 14, color: COL.slice(0, NP).concat(['#EEF2FA']), speed: [200, 600], life: 1.5, size: 6, sq: true, add: false, grav: 380, drag: 0.8 });
      FX.ring(x, y, { r1: 190, color: '#fff', w: 9, life: 0.55 }); FX.ring(x, y, { r1: 120, color: GOLD, w: 6, life: 0.4 });
      E.shake(20); E.slow(0.3, 0.7); E.flash('#fff', 0.45); E.buzz(-1, 260); S.boom(x, true);
      const sub = st.mode === 'deep' ? (st.ships > 0 ? st.ships + (st.ships === 1 ? ' ship left' : ' ships left') : 'out of ships') : 'back to the launch plate — your stars are safe';
      FX.banner(word || 'KABOOM!', { size: 90, color: '#FF8A5C', life: 1.6, sub });
    }
    function touchdown() {
      st.phase = 'landed'; st.pt = 2.3; ship.vx = ship.vy = 0; ship.w = 0;
      FX.confetti(ship.x, ship.y - 30, 90); FX.ring(ship.x, ship.y, { r1: 220, color: PADC, w: 8, life: 0.7 });
      FX.banner('TOUCHDOWN!', { size: 104, color: PADC, life: 2.0, sub: fmt(st.time) + (st.time <= lvl.par ? '  ·  under par!' : '') });
      E.slow(0.35, 0.5); E.shake(6); E.buzz(-1, 160); S.goal();
    }
    function finishCavern() {
      const r = rec(st.li); let pay = 0; const fresh = [];
      stars.forEach((s, i) => { if (!r.g[i]) { r.g[i] = 1; pay += 1; } });
      if (bonus && bonus.got && !r.b) { r.b = 1; pay += 3; }
      const got = { c: 1, a: !bonus || bonus.got ? 1 : 0, f: st.hurt ? 0 : 1, p: st.time <= lvl.par ? 1 : 0 };
      for (const m of MEDALS) if (got[m[0]] && !r[m[0]]) { r[m[0]] = 1; pay += 3; fresh.push(m[0]); }
      const best = !r.t || st.time < r.t; if (best) r.t = +st.time.toFixed(1);
      save.stars += pay; persist();
      const worldDone = st.li % 6 === 5 && fresh.includes('c');
      res = { kind: 'camp', got, fresh, pay, time: st.time, best, li: st.li, opts: st.li + 1 < LEVELS.length ? ['NEXT CAVERN', 'FLY IT AGAIN', 'MAP'] : ['FLY IT AGAIN', 'MAP'],
        note: worldDone ? (st.li === 23 ? 'CAMPAIGN COMPLETE! You flew The Core.' : st.li === 5 ? WORLDS[1].name + ' and DEEP RUN unlocked!' : WORLDS[st.li / 6 + 1 | 0].name + ' unlocked!') : '' };
      rsel = 0; go('result'); if (worldDone) { FX.confetti(W / 2, 200, 140); S.win(); }
    }
    function endDeep() {
      const best = st.depth > save.deep; if (best) save.deep = st.depth;
      save.stars += st.pay; save.runs++; persist();
      res = { kind: 'deep', depth: st.depth, pay: st.pay, best, opts: ['DIVE AGAIN', 'MAP'] };
      rsel = 0; go('result'); if (best && st.depth > 0) S.win(); else S.lose();
    }

    function grab(s, isBonus) {
      s.got = true;
      FX.burst(s.x, s.y, { n: 22, color: isBonus ? [VIOLET, '#fff'] : [GOLD, '#fff', '#FFF2A8'], speed: [80, 380], life: 0.6, size: 4.5 });
      FX.ring(s.x, s.y, { r1: 80, color: isBonus ? VIOLET : GOLD, life: 0.4 });
      if (isBonus) { FX.text(s.x, s.y - 26, 'BONUS STAR!', { color: VIOLET, size: 26 }); S.power(); E.buzz(-1, 60); return; }
      st.got++;
      FX.text(s.x, s.y - 26, st.got + ' / ' + stars.length, { color: GOLD, size: 26 });
      const f = 620 * Math.pow(1.122, Math.min(st.got, 10));
      tone({ f, d: 0.1, v: 0.14, type: 'triangle', pan: panX(s.x) }); tone({ f: f * 1.5, d: 0.16, v: 0.12, type: 'triangle', t: 0.07, pan: panX(s.x) });
      E.buzz(-1, 30); checkPad();
    }

    function fly(dt, live) {
      const e0 = P[0].a || P[0].y < -0.5, e1 = P[1].a || P[1].y < -0.5;
      const k = 1 - Math.exp(-25 * dt), n = (e0 ? 1 : 0) + (e1 ? 1 : 0);
      ship.eng[0] += ((e0 ? 1 : 0) - ship.eng[0]) * k; ship.eng[1] += ((e1 ? 1 : 0) - ship.eng[1]) * k;
      // stabiliser / navigator energy
      const tank = 1 + 0.25 * up('tank'), refill = (NAVP ? 0.16 : 0.14) * (1 + 0.3 * up('charge'));
      if (st.fuel <= 0) st.lock = true; else if (st.lock && st.fuel > 0.3) st.lock = false;
      let stab, jet = false, drain = 0;
      if (NAVP) {
        const nav = P[2];
        if (nav.mag > 0.25) ship.jetAim = Math.atan2(nav.y, nav.x);
        stab = nav.b && !st.lock; jet = nav.a && !st.lock; drain = (stab ? STAB_COST : 0) + (jet ? JET_COST : 0);
      } else {
        const holders = (P[0].b ? 1 : 0) + (P[1].b ? 1 : 0);
        stab = holders > 0 && !st.lock; drain = stab ? STAB_COST * holders : 0;
      }
      st.fuel = drain > 0 ? Math.max(0, st.fuel - drain / tank * dt) : Math.min(1, st.fuel + refill * dt);
      ship.stab += ((stab ? 1 : 0) - ship.stab) * k; ship.jet += ((jet ? 1 : 0) - ship.jet) * k;
      // forces
      const thr = THR * (1 + 0.05 * up('engine')) * (crate && crate.s === 'carried' ? 0.88 : 1);
      let ax = Math.sin(ship.ang) * thr * n, ay = -Math.cos(ship.ang) * thr * n + GRAV * lvl.grav;
      if (jet) { ax += Math.cos(ship.jetAim) * JET; ay += Math.sin(ship.jetAim) * JET; }
      for (const f of zones) if (ship.x > f.x0 && ship.x < f.x1 && ship.y > f.y0 && ship.y < f.y1) { ax += f.fx * f.pw; ay += f.fy * f.pw; }
      let aa = TORQ * ((e0 ? 1 : 0) - (e1 ? 1 : 0)) - RIGHTING * Math.sin(ship.ang);
      if (stab) aa -= 5 * Math.sin(ship.ang);
      ship.w = (ship.w + aa * dt) * Math.exp(-(ADAMP + (stab ? 5 : 0)) * dt);
      ship.ang += ship.w * dt;
      if (ship.ang > Math.PI) ship.ang -= TAU; else if (ship.ang < -Math.PI) ship.ang += TAU;
      const drag = Math.exp(-(0.3 + (stab ? 1.8 : 0)) * dt);
      ship.vx = (ship.vx + ax * dt) * drag; ship.vy = (ship.vy + ay * dt) * drag;
      const sp = Math.hypot(ship.vx, ship.vy); if (sp > 560) { ship.vx *= 560 / sp; ship.vy *= 560 / sp; }
      ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      ship.inv -= dt; st.ouchT -= dt; st.thudT -= dt;
      const hit = collide();
      if (ship.ground) {
        ship.vx *= Math.exp(-5 * dt);
        if (n === 0) { ship.ang = angLerp(ship.ang, 0, 1 - Math.exp(-6 * dt)); ship.w *= Math.exp(-10 * dt); }
      }
      if (live && st.crush > 4) { explode('CRUSHED!'); return; }
      if (hit) {
        if (live && hit.imp > BUMP + 20 * up('bumper') && ship.inv <= 0) damage(hit);
        else if (hit.imp > 45 && st.thudT <= 0) { st.thudT = 0.15; S.thud(ship.x); FX.burst(hit.x, hit.y, { n: 6, color: '#9AA6C4', speed: 90, life: 0.4, size: 4, add: false }); }
      }
      if (!ship.alive) return;

      // exhaust
      const ca = Math.cos(ship.ang), sa = Math.sin(ship.ang);
      for (let i = 0; i < 2; i++) {
        if (!(i ? e1 : e0)) continue;
        const lx = i ? 16.5 : -16.5, nx = ship.x + ca * lx - sa * 18, ny = ship.y + sa * lx + ca * 18;
        FX.burst(nx, ny, { n: 2, color: [COL[i], COL[i], '#fff', GOLD], speed: [140, 300], life: 0.32, size: 4.5, ang: ship.ang + Math.PI / 2, spread: 0.22, drag: 1.2 });
        if (Math.random() < 0.3) FX.burst(nx, ny, { n: 1, color: '#6b7390', speed: [40, 110], life: 0.9, size: 7, ang: ship.ang + Math.PI / 2, spread: 0.5, add: false, drag: 1 });
      }
      st.rumT -= dt;
      if (n > 0 && st.rumT <= 0) {
        st.rumT = 0.1; const pan = panX(ship.x);
        if (e0) { noise({ d: 0.16, v: 0.07, f: 420, f2: 150, pan: pan - 0.25 }); tone({ f: 55, d: 0.14, v: 0.09, type: 'triangle', pan: pan - 0.25 }); }
        if (e1) { noise({ d: 0.16, v: 0.07, f: 560, f2: 190, pan: pan + 0.25 }); tone({ f: 69, d: 0.14, v: 0.09, type: 'triangle', pan: pan + 0.25 }); }
      }
      st.stabT -= dt;
      if (stab && st.stabT <= 0) { st.stabT = 0.12; noise({ d: 0.12, v: 0.04, f: 5200, ft: 'highpass', pan: panX(ship.x) }); FX.burst(ship.x, ship.y, { n: 2, color: [NAV, '#fff'], speed: [60, 120], life: 0.35, size: 3 }); }
      if (jet) {
        const jx = ship.x - sa * 13, jy = ship.y + ca * 13, ea = ship.jetAim + Math.PI;
        FX.burst(jx + Math.cos(ea) * 9, jy + Math.sin(ea) * 9, { n: 2, color: [NAV, NAV, '#fff'], speed: [130, 280], life: 0.36, size: 5, ang: ea, spread: 0.25, drag: 1.4 });
        st.jetT -= dt;
        if (st.jetT <= 0) { st.jetT = 0.1; noise({ d: 0.13, v: 0.055, f: 2600, f2: 1200, ft: 'bandpass', q: 1.2, pan: panX(ship.x) }); }
      }
      if (!live) return;

      // stars (the magnet upgrade pulls them in)
      const mg = up('magnet'), pull = mg ? 70 + 45 * mg : 0;
      for (const s of bonus && !bonus.got ? stars.concat([bonus]) : stars) {
        if (s.got) continue;
        const d = dist(s.x, s.y, ship.x, ship.y);
        if (pull && d < pull && d > 1) { const v = 150 * dt; s.x += (ship.x - s.x) / d * v; s.y += (ship.y - s.y) / d * v; }
        if (d < R + 18) grab(s, s === bonus);
      }
      // keys open their gate
      for (const ky of keys) {
        if (ky.got || dist(ky.x, ky.y, ship.x, ship.y) > R + 18) continue;
        ky.got = true; const gt = gates[ky.g]; if (gt) gt.open = true;
        FX.burst(ky.x, ky.y, { n: 20, color: [GOLD, '#fff'], speed: 300, life: 0.5 }); FX.text(ky.x, ky.y - 28, 'GATE OPEN!', { color: GOLD, size: 26 });
        if (gt) { const gx = (gt.c + gt.w / 2) * T, gy = (gt.r + gt.h / 2) * T; FX.ring(gx, gy, { r1: 120, color: lvl.glow, w: 7, life: 0.6 }); FX.burst(gx, gy, { n: 24, color: [lvl.glow, '#fff'], speed: 260, life: 0.6, sq: true, add: false }); }
        S.pickup(); S.clang(ship.x); E.buzz(-1, 80); E.shake(4);
      }
      // cargo crate
      if (crate) {
        if (crate.s === 'home' && dist(crate.x, crate.y - 10, ship.x, ship.y) < R + 24 && sp < 170) {
          crate.s = 'carried'; S.pickup(); FX.text(ship.x, ship.y - 44, 'GOT THE CRATE', { color: '#FFB347', size: 24 }); FX.ring(crate.x, crate.y, { r1: 60, color: '#FFB347' }); E.buzz(-1, 50);
        } else if (crate.s === 'carried') {
          crate.x = lerp(crate.x, ship.x - ship.vx * 0.05, 1 - Math.exp(-14 * dt)); crate.y = lerp(crate.y, ship.y + 40, 1 - Math.exp(-14 * dt));
          if (Math.abs(ship.x - lvl.drop[0]) < 62 && Math.abs(ship.y - lvl.drop[1]) < 70 && sp < 110) {
            crate.s = 'done'; crate.x = lvl.drop[0]; crate.y = lvl.drop[1] + 22;
            FX.confetti(crate.x, crate.y - 20, 40, { speed: [80, 360], life: 1.2 }); FX.text(crate.x, crate.y - 50, 'DELIVERED!', { color: '#FFB347', size: 30 }); S.point(); S.power(); E.buzz(-1, 120);
            checkPad();
          }
        }
      }
      // lasers
      for (const l of lasers) {
        if (!laserOn(l, st.clock) || ship.inv > 0) continue;
        const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], l2 = dx * dx + dy * dy || 1, tt = clamp(((ship.x - l.a[0]) * dx + (ship.y - l.a[1]) * dy) / l2, 0, 1);
        const cx = l.a[0] + dx * tt, cy = l.a[1] + dy * tt, d = dist(cx, cy, ship.x, ship.y);
        if (d < R + 3) {
          const ux = d > 0.5 ? (ship.x - cx) / d : 1, uy = d > 0.5 ? (ship.y - cy) / d : 0;
          ship.vx = ux * 240 + ship.vx * 0.2; ship.vy = uy * 240 + ship.vy * 0.2; S.zap(ship.x);
          damage({ x: cx, y: cy, ux, uy }, 'ZAP!');
          if (!ship.alive) return;
        }
      }
      // turret shots
      for (const b of bullets) {
        if (b.dead || ship.inv > 0 || dist(b.x, b.y, ship.x, ship.y) > R + 6) continue;
        b.dead = true; const d = Math.hypot(b.vx, b.vy) || 1;
        ship.vx += b.vx * 0.5; ship.vy += b.vy * 0.5;
        damage({ x: b.x, y: b.y, ux: b.vx / d, uy: b.vy / d }, 'HIT!');
        if (!ship.alive) return;
      }
      // lava
      if (lvl.lava && ship.y + R * 0.6 > lavaAt(lvl, st.at)) { FX.burst(ship.x, ship.y + 10, { n: 30, color: ['#FF5D3A', '#FFD23F'], speed: [100, 420], life: 0.8, size: 6, ang: -Math.PI / 2, spread: 1 }); explode('MELTED!'); return; }
      // landing: come to rest on the lit pad
      const gear = up('gear');
      const onPad = ship.ground && Math.abs(ship.x - lvl.pad[0]) < 46 && Math.abs(ship.y - (lvl.pad[1] - R)) < 6;
      if (st.litT > 0 && onPad && Math.hypot(ship.vx, ship.vy) < 45 + 16 * gear && Math.abs(ship.ang) < 0.35 + 0.1 * gear) { st.landT += dt; if (st.landT > 0.4) touchdown(); }
      else st.landT = 0;
    }

    function world(dt) {
      st.clock += dt; moveDoors(dt);
      for (const f of zones) { if (f.pulse) f.pw = clamp(0.5 + 1.6 * Math.sin(TAU * st.clock / f.pulse), 0, 1); f.spin += dt * (2 + 12 * f.pw); }
      for (const gt of gates) if (gt.open && gt.a < 1) gt.a = Math.min(1, gt.a + dt * 2.5);
      if (st.litT > 0) st.litT += dt;
      const live = st.phase === 'play';
      for (const tu of turrets) {
        const d = dist(tu.x, tu.y, ship.x, ship.y);
        if (ship.alive) tu.aim = angLerp(tu.aim, Math.atan2(ship.y - tu.y, ship.x - tu.x), 1 - Math.exp(-5 * dt));
        if (!live || d > 700) { tu.t = Math.max(tu.t, 0.8); continue; }
        tu.t -= dt;
        if (tu.t <= 0) {
          tu.t = tu.period;
          bullets.push({ x: tu.x + Math.cos(tu.aim) * 18, y: tu.y + Math.sin(tu.aim) * 18, vx: Math.cos(tu.aim) * tu.speed, vy: Math.sin(tu.aim) * tu.speed, life: 6, dead: false });
          FX.burst(tu.x + Math.cos(tu.aim) * 20, tu.y + Math.sin(tu.aim) * 20, { n: 8, color: ['#FF5D3A', '#FFD23F'], speed: 200, life: 0.25, size: 4, ang: tu.aim, spread: 0.5 });
          tone({ f: 300, f2: 90, d: 0.16, v: 0.12, type: 'sawtooth', pan: panX(tu.x) });
        }
      }
      for (const b of bullets) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || solid(Math.floor(b.x / T), Math.floor(b.y / T)) || doors.some(d => b.x > d.x && b.x < d.x + d.w * T && b.y > d.y && b.y < d.y + d.h * T) || gates.some(gt => !gt.open && b.x > gt.c * T && b.x < (gt.c + gt.w) * T && b.y > gt.r * T && b.y < (gt.r + gt.h) * T)) {
          if (!b.dead && b.life > 0) FX.burst(b.x, b.y, { n: 6, color: ['#FF5D3A', '#fff'], speed: 120, life: 0.25, size: 3 });
          b.dead = true;
        }
      }
      if (bullets.length) bullets = bullets.filter(b => !b.dead);
      // crusher warning rattle
      st.warnT -= dt;
      if (live && st.warnT <= 0) for (const d of doors) if (d.wave === 'slam') { const u = fract(st.clock / d.period + (d.phase || 0)); if (u > 0.47 && u < 0.55) { st.warnT = 0.12; noise({ d: 0.06, v: 0.05, f: 300, pan: panX(d.x) }); } if (u > 0.61 && u < 0.64) { st.warnT = 0.3; S.thud(d.x); E.shake(5); } }
      if (lvl.lava && live) { st.lavaT -= dt; if (st.lavaT <= 0 && st.at > lvl.lava.delay) { st.lavaT = 0.5; noise({ d: 0.4, v: 0.05, f: 240, f2: 120 }); } }
    }

    function updateFly(dt) {
      world(dt);
      if (st.shieldCd > 0 && up('shield') > 0) { st.shieldCd -= dt; if (st.shieldCd <= 0) { st.shield = true; FX.text(ship.x, ship.y - 44, 'SHIELD READY', { color: '#9FE8FF', size: 18 }); S.ui(); } }
      if (st.phase === 'ready') {
        st.pt -= dt; ship.inv = 0.2;
        if (st.pt <= 0) { st.phase = 'play'; FX.banner('LIFT OFF!', { size: 84, color: GOLD, life: 0.7 }); S.go(); }
      } else if (st.phase === 'play') {
        st.time += dt; st.at += dt; fly(dt, true);
      } else if (st.phase === 'landed') {
        st.pt -= dt; ship.eng[0] *= 0.8; ship.eng[1] *= 0.8; ship.stab *= 0.8; ship.jet *= 0.8; ship.ang = angLerp(ship.ang, 0, 0.2);
        if (st.pt <= 0) {
          if (st.mode === 'camp') finishCavern();
          else { st.depth++; st.pay += 2 + Math.floor(st.depth / 2) + (bonus && bonus.got ? 2 : 0); loadLevel(genLevel(st.depth), true); intro(true); }
        }
      } else if (st.phase === 'dead') {
        st.pt -= dt;
        if (st.pt <= 0) { if (st.mode === 'deep' && st.ships <= 0) endDeep(); else { loadLevel(raw, false); intro(false); } }
      }
    }
    function updateMap() {
      if (st.t < 0.25) return;
      let r = sel.r, c = sel.c;
      if (any('nr')) c = Math.min(5, c + 1); if (any('nl')) c = Math.max(0, c - 1);
      if (any('nd')) r = Math.min(4, r + 1); if (any('nu')) r = Math.max(0, r - 1);
      if (r !== sel.r || c !== sel.c) { sel.r = r; sel.c = c; S.ui(); }
      if (any('ap')) {
        if (sel.r < 4) { const i = sel.r * 6 + sel.c; if (unlocked(i)) { S.ok(); startCavern(i); } else { S.back(); st.msg = 'Clear cavern ' + i + ' first'; st.msgT = 1.6; } }
        else if (sel.c < 3) { S.ok(); hsel = 0; go('hangar'); }
        else if (deepOpen()) { S.ok(); startDeep(); }
        else { S.back(); st.msg = 'Clear all of ' + WORLDS[0].name + ' to unlock the Deep Run'; st.msgT = 2; }
      }
    }
    function updateHangar() {
      if (st.t < 0.2) return;
      let h = hsel;
      if (any('nr') && h % 2 === 0) h++; if (any('nl') && h % 2 === 1) h--;
      if (any('nd')) h = Math.min(9, h + 2); if (any('nu')) h = Math.max(0, h - 2);
      if (h !== hsel) { hsel = h; S.ui(); }
      if (any('bp')) { S.back(); go('map'); return; }
      if (any('ap')) {
        if (hsel < 8) {
          const u = UPS[hsel], lv = up(u.k);
          if (lv >= u.cost.length) { S.back(); st.msg = u.name + ' is fully upgraded'; st.msgT = 1.4; }
          else if (save.stars < u.cost[lv]) { S.back(); st.msg = 'Need ' + (u.cost[lv] - save.stars) + ' more stars'; st.msgT = 1.4; }
          else { save.stars -= u.cost[lv]; save.up[u.k] = lv + 1; persist(); S.power(); E.buzz(-1, 60); FX.confetti(W / 2, 300, 40, { speed: [80, 380], life: 1.1 }); st.msg = u.name + ' upgraded!'; st.msgT = 1.4; }
        } else if (hsel === 8) {
          const mc = medalCount(); let p = save.paint;
          for (let k = 0; k < PAINTS.length; k++) { p = (p + 1) % PAINTS.length; if (PAINTS[p].need <= mc) break; }
          if (p !== save.paint) { save.paint = p; persist(); S.ok(); } else { S.back(); st.msg = 'Earn more medals to unlock paint jobs'; st.msgT = 1.6; }
        } else { S.back(); go('map'); }
      }
    }
    function updateResult() {
      if (st.t < 0.9) return;
      const n = res.opts.length;
      if (any('nr')) { rsel = (rsel + 1) % n; S.ui(); } if (any('nl')) { rsel = (rsel + n - 1) % n; S.ui(); }
      if (any('ap')) {
        S.ok(); const o = res.opts[rsel];
        if (o === 'NEXT CAVERN') startCavern(res.li + 1);
        else if (o === 'FLY IT AGAIN') startCavern(res.li);
        else if (o === 'DIVE AGAIN') startDeep();
        else { if (res.kind === 'camp' && res.li + 1 < LEVELS.length) { sel.r = Math.floor((res.li + 1) / 6); sel.c = (res.li + 1) % 6; } go('map'); }
      } else if (any('bp')) { S.back(); go('map'); }
    }
    function update(dt) {
      st.t += dt; st.msgT -= dt;
      if (st.scr === 'fly') updateFly(dt);
      else { st.clock += dt; if (st.scr === 'map') updateMap(); else if (st.scr === 'hangar') updateHangar(); else updateResult(); }
      FX.update(dt);
    }

    // ---------------- drawing: the cavern ----------------
    function drawZones(g) {
      const t = st.clock;
      for (const f of zones) {
        const w = f.x1 - f.x0, h = f.y1 - f.y0, pw = f.pw, horiz = Math.abs(f.fx) > Math.abs(f.fy);
        g.fillStyle = 'rgba(160,230,255,' + (0.03 + 0.07 * pw) + ')'; g.fillRect(f.x0, f.y0, w, h);
        g.strokeStyle = '#CFF4FF'; g.lineCap = 'round'; g.lineJoin = 'round';
        if (horiz) {
          const dir = f.fx > 0 ? 1 : -1; g.lineWidth = 6;
          for (let k = 0; k < 3; k++) {
            const v = fract(k / 3 + t * 0.35), x = dir > 0 ? f.x0 + v * w : f.x1 - v * w;
            g.globalAlpha = Math.sin(Math.PI * v) * 0.18 * pw;
            g.beginPath(); g.moveTo(x - 16 * dir, f.y0 + h * 0.3); g.lineTo(x + 10 * dir, f.y0 + h * 0.5); g.lineTo(x - 16 * dir, f.y0 + h * 0.7); g.stroke();
          }
          g.lineWidth = 2.5; const n = Math.round(h / 16);
          for (let k = 0; k < n; k++) {
            const u = fract(k * 0.618 + 0.13), v = fract(k * 0.371 + t * (0.5 + 0.5 * fract(k * 0.77)) * Math.abs(f.fx) / 200);
            const y = f.y0 + 6 + u * (h - 12), x = dir > 0 ? f.x0 + v * w : f.x1 - v * w;
            g.globalAlpha = Math.sin(Math.PI * v) * 0.4 * pw; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 26 * dir, y); g.stroke();
          }
          g.globalAlpha = 1; continue;
        }
        const up2 = f.fy < 0; g.lineWidth = 6;
        for (let k = 0; k < 3; k++) {
          const v = fract(k / 3 + t * 0.35), y = up2 ? f.y1 - v * h : f.y0 + v * h, d = up2 ? 1 : -1;
          g.globalAlpha = Math.sin(Math.PI * v) * 0.16 * pw;
          g.beginPath(); g.moveTo(f.x0 + w * 0.3, y + 16 * d); g.lineTo(f.x0 + w * 0.5, y - 10 * d); g.lineTo(f.x0 + w * 0.7, y + 16 * d); g.stroke();
        }
        g.lineWidth = 2.5; const n = Math.round(w / 14);
        for (let k = 0; k < n; k++) {
          const u = fract(k * 0.618 + 0.13), v = fract(k * 0.371 + t * (0.5 + 0.5 * fract(k * 0.77)) * Math.abs(f.fy) / 260);
          const x = f.x0 + 6 + u * (w - 12), y = up2 ? f.y1 - v * h : f.y0 + v * h;
          g.globalAlpha = Math.sin(Math.PI * v) * 0.4 * pw; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (up2 ? 26 : -26)); g.stroke();
        }
        g.globalAlpha = 1;
        const by = up2 ? f.y1 - 12 : f.y0;
        g.fillStyle = '#39425f'; g.strokeStyle = '#0a0d18'; g.lineWidth = 2; g.beginPath(); g.roundRect(f.x0 + 4, by, w - 8, 12, 4); g.fill(); g.stroke();
        const nb = Math.max(1, Math.round(w / 80));
        for (let i = 0; i < nb; i++) {
          const cx = f.x0 + w * (i + 0.5) / nb, cy = by + 6, s = Math.cos(f.spin + i) * 26;
          g.fillStyle = pw > 0.2 ? '#CFF4FF' : '#7f8aa8'; g.beginPath(); g.ellipse(cx, cy, Math.abs(s) + 3, 3, 0, 0, TAU); g.fill();
          g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(cx, cy, 3, 0, TAU); g.fill();
        }
      }
    }
    function drawDoors(g) {
      for (const d of doors) {
        const slam = d.wave === 'slam', u = fract(st.clock / d.period + (d.phase || 0)), shake = slam && u > 0.45 && u < 0.55 ? Math.sin(st.clock * 90) * 3 : 0;
        const x = d.x + shake, y = d.y, w = d.w * T, h = d.h * T;
        g.fillStyle = slam ? '#4A2F2A' : '#2B345C'; g.beginPath(); g.roundRect(x + 2, y, w - 4, h, 6); g.fill();
        g.save(); g.beginPath(); g.roundRect(x + 2, y, w - 4, h, 6); g.clip();
        const bands = d.axis === 'x' || h < 60 ? [y] : [y, y + h - 12];
        for (const yy of bands) {
          g.fillStyle = slam ? '#FF5D3A' : '#FFD23F'; g.fillRect(x, yy, w, Math.min(12, h));
          g.fillStyle = '#1a1d2b'; for (let i = -1; i < w / 16 + 1; i++) { g.beginPath(); g.moveTo(x + i * 16, yy + 12); g.lineTo(x + i * 16 + 8, yy + 12); g.lineTo(x + i * 16 + 20, yy); g.lineTo(x + i * 16 + 12, yy); g.closePath(); g.fill(); }
        }
        g.fillStyle = 'rgba(255,255,255,0.08)'; if (h > 60) g.fillRect(x + 10, y + 18, w - 20, h - 36);
        g.restore();
        g.lineWidth = 3; g.strokeStyle = slam && shake ? '#fff' : lvl.glow; g.beginPath(); g.roundRect(x + 2, y, w - 4, h, 6); g.stroke();
      }
      for (const gt of gates) {
        if (gt.a >= 1) continue;
        const x = gt.c * T, y = gt.r * T, w = gt.w * T, h = gt.h * T, k = 1 - gt.a, horiz = w > h;
        g.globalAlpha = k; g.fillStyle = 'rgba(20,24,44,0.85)'; g.fillRect(x + 3, y + 3, w - 6, h - 6);
        g.strokeStyle = GOLD; g.lineWidth = 5; g.lineCap = 'round';
        const nbar = Math.max(2, Math.round((horiz ? w : h) / 26));
        for (let i = 0; i < nbar; i++) { const f2 = (i + 0.5) / nbar; g.beginPath(); if (horiz) { g.moveTo(x + w * f2, y + 4); g.lineTo(x + w * f2, y + 4 + (h - 8) * k); } else { g.moveTo(x + 4, y + h * f2); g.lineTo(x + 4 + (w - 8) * k, y + h * f2); } g.stroke(); }
        g.fillStyle = GOLD; g.strokeStyle = '#0a0d18'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x + w / 2 - 11, y + h / 2 - 9, 22, 18, 4); g.fill(); g.stroke();
        g.fillStyle = '#0a0d18'; g.beginPath(); g.arc(x + w / 2, y + h / 2 - 1, 3.5, 0, TAU); g.fill(); g.fillRect(x + w / 2 - 1.5, y + h / 2, 3, 6);
        g.globalAlpha = 1;
      }
    }
    function drawLasers(g) {
      for (const l of lasers) {
        const on = laserOn(l, st.clock), warn = !on && laserWarn(l, st.clock);
        for (const p of [l.a, l.b]) { g.fillStyle = '#39425f'; g.strokeStyle = '#0a0d18'; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], 9, 0, TAU); g.fill(); g.stroke(); g.fillStyle = on ? '#fff' : warn ? '#FF5D73' : '#7a2030'; g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill(); }
        if (on) {
          g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
          g.strokeStyle = '#FF2D55'; g.globalAlpha = 0.35; g.lineWidth = 16 + Math.sin(st.clock * 40) * 3; g.beginPath(); g.moveTo(l.a[0], l.a[1]); g.lineTo(l.b[0], l.b[1]); g.stroke();
          g.globalAlpha = 0.9; g.lineWidth = 6; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.stroke();
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        } else if (warn && Math.floor(st.clock * 14) % 2 === 0) {
          g.strokeStyle = '#FF5D73'; g.globalAlpha = 0.7; g.lineWidth = 2; g.setLineDash([8, 10]); g.beginPath(); g.moveTo(l.a[0], l.a[1]); g.lineTo(l.b[0], l.b[1]); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        }
      }
    }
    function drawTurrets(g) {
      for (const tu of turrets) {
        const ch = clamp(1 - tu.t / 0.8, 0, 1);
        g.save(); g.translate(tu.x, tu.y);
        if (ch > 0 && st.phase === 'play') { g.strokeStyle = '#FF5D3A'; g.lineWidth = 3; g.globalAlpha = ch; g.beginPath(); g.arc(0, 0, 30 - ch * 12, 0, TAU); g.stroke(); g.globalAlpha = 1; }
        g.rotate(tu.aim); g.fillStyle = '#55607A'; g.strokeStyle = '#0a0d18'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(4, -5, 20, 10, 3); g.fill(); g.stroke();
        g.rotate(-tu.aim); g.fillStyle = '#8A1C1C'; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = ch > 0.5 ? '#fff' : '#FF5D3A'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
        g.restore();
      }
      for (const b of bullets) { g.fillStyle = '#FF5D3A'; g.beginPath(); g.arc(b.x, b.y, 8, 0, TAU); g.fill(); g.fillStyle = '#FFE9A8'; g.beginPath(); g.arc(b.x, b.y, 4.5, 0, TAU); g.fill(); }
    }
    function drawPad(g) {
      const [cx, y] = lvl.pad, t = st.clock, lit = st.litT > 0;
      if (lit) {
        g.globalCompositeOperation = 'lighter';
        const gr = g.createLinearGradient(0, y - 8, 0, y - 190);
        gr.addColorStop(0, NAVP ? 'rgba(255,242,168,0.3)' : 'rgba(124,255,107,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 56, y - 8); g.lineTo(cx + 56, y - 8); g.lineTo(cx + 74, y - 190); g.lineTo(cx - 74, y - 190); g.closePath(); g.fill();
        g.globalCompositeOperation = 'source-over';
      }
      g.fillStyle = '#3A4466'; g.strokeStyle = '#0a0d18'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(cx - 62, y - 9, 124, 11, 4); g.fill(); g.stroke();
      g.fillStyle = lit ? PADC : '#6f7896'; g.fillRect(cx - 58, y - 9, 116, 3);
      for (let i = 0; i < 5; i++) {
        const on = lit && (Math.floor(t * 8) % 5 === i || Math.floor(t * 8) % 5 === 4 - i);
        g.fillStyle = lit ? (on ? '#fff' : PADC) : '#8A3550'; g.beginPath(); g.arc(cx - 44 + i * 22, y - 3.5, 2.6, 0, TAU); g.fill();
      }
      if (lit && st.phase === 'play') {
        const by = y - 86 + Math.sin(t * 5) * 9;
        g.fillStyle = PADC; g.strokeStyle = '#0a0d18'; g.lineWidth = 3; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(cx - 9, by - 26); g.lineTo(cx + 9, by - 26); g.lineTo(cx + 9, by - 4); g.lineTo(cx + 21, by - 4); g.lineTo(cx, by + 18); g.lineTo(cx - 21, by - 4); g.lineTo(cx - 9, by - 4); g.closePath(); g.fill(); g.stroke();
        txt('LAND HERE', cx, by - 44, 17, PADC, { stroke: '#0a0d18' });
      } else if (!lit && st.phase === 'play' && dist(ship.x, ship.y, cx, y) < 170) {
        txt(st.got < stars.length ? 'GET THE STARS FIRST' : 'DELIVER THE CRATE FIRST', cx, y - 58, 16, '#FFB3C1', { stroke: '#0a0d18' });
      }
    }
    function drawPickups(g) {
      const t = st.clock;
      for (const s of bonus ? stars.concat([bonus]) : stars) {
        if (s.got) continue;
        const isB = s === bonus, col = isB ? VIOLET : GOLD, tw = 1 + Math.sin(t * 4 + s.ph) * 0.13, y = s.y + Math.sin(t * 2 + s.ph) * 4;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16; g.fillStyle = col;
        g.beginPath(); g.arc(s.x, y, 30 * tw, 0, TAU); g.fill(); g.beginPath(); g.arc(s.x, y, 20 * tw, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        starPath(g, s.x, y, (isB ? 18 : 15) * tw, Math.sin(t * 1.6 + s.ph) * 0.3 + (isB ? t : 0));
        g.fillStyle = col; g.fill(); g.lineWidth = 2.5; g.strokeStyle = isB ? '#5A3A96' : '#7a5a00'; g.lineJoin = 'round'; g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x - 4, y - 5, 2.5, 0, TAU); g.fill();
      }
      for (const ky of keys) {
        if (ky.got) continue;
        const y = ky.y + Math.sin(t * 3) * 5;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18; g.fillStyle = GOLD; g.beginPath(); g.arc(ky.x, y, 30, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.save(); g.translate(ky.x, y); g.rotate(-0.6 + Math.sin(t * 2) * 0.15);
        g.strokeStyle = '#7a5a00'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(2, 0); g.lineTo(22, 0); g.moveTo(17, 0); g.lineTo(17, 9); g.stroke();
        g.strokeStyle = GOLD; g.lineWidth = 5; g.beginPath(); g.moveTo(2, 0); g.lineTo(22, 0); g.moveTo(17, 0); g.lineTo(17, 9); g.stroke();
        g.fillStyle = GOLD; g.strokeStyle = '#7a5a00'; g.lineWidth = 2.5; g.beginPath(); g.arc(-7, 0, 10, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#12203F'; g.beginPath(); g.arc(-7, 0, 4, 0, TAU); g.fill();
        g.restore();
        txt('KEY', ky.x, y - 30, 13, GOLD, { stroke: '#0a0d18' });
      }
      if (crate) {
        const [dx, dy] = lvl.drop;
        if (crate.s !== 'done') {
          g.strokeStyle = '#FFB347'; g.lineWidth = 3; g.setLineDash([10, 8]); g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 5); g.beginPath(); g.roundRect(dx - 56, dy - 44, 112, 84, 10); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
          txt(crate.s === 'carried' ? 'DROP IT HERE, SLOWLY' : 'CRATE GOES HERE', dx, dy - 58, 14, '#FFB347', { stroke: '#0a0d18' });
        }
        if (crate.s === 'carried') { g.strokeStyle = '#C9B28A'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ship.x, ship.y + 14); g.lineTo(crate.x, crate.y - 12); g.stroke(); }
        g.save(); g.translate(crate.x, crate.y); if (crate.s === 'carried') g.rotate(clamp(-ship.vx * 0.002, -0.4, 0.4));
        g.fillStyle = '#B5772E'; g.strokeStyle = '#0a0d18'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-16, -13, 32, 26, 4); g.fill(); g.stroke();
        g.strokeStyle = '#7A4A16'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, -4); g.lineTo(16, -4); g.moveTo(-16, 5); g.lineTo(16, 5); g.stroke();
        g.fillStyle = '#FFD23F'; g.fillRect(-4, -13, 8, 26);
        g.restore();
        if (crate.s === 'home') txt('CRATE', crate.x, crate.y - 30 + Math.sin(t * 4) * 3, 13, '#FFB347', { stroke: '#0a0d18' });
      }
    }
    function drawLava(g) {
      if (!lvl.lava) return;
      const ly = lavaAt(lvl, st.at), t = st.clock;
      if (ly > H + 10) return;
      g.globalCompositeOperation = 'lighter';
      const gl = g.createLinearGradient(0, ly - 90, 0, ly); gl.addColorStop(0, 'rgba(255,93,58,0)'); gl.addColorStop(1, 'rgba(255,93,58,0.35)');
      g.fillStyle = gl; g.fillRect(0, ly - 90, W, 90);
      g.globalCompositeOperation = 'source-over';
      g.beginPath(); g.moveTo(0, H); g.lineTo(0, ly);
      for (let x = 0; x <= W; x += 32) g.lineTo(x, ly + Math.sin(x * 0.02 + t * 2.4) * 5 + Math.sin(x * 0.05 - t * 3.1) * 3);
      g.lineTo(W, H); g.closePath();
      const gr = g.createLinearGradient(0, ly, 0, ly + 160); gr.addColorStop(0, '#FFD23F'); gr.addColorStop(0.12, '#FF8A3D'); gr.addColorStop(1, '#B3200E');
      g.globalAlpha = 0.94; g.fillStyle = gr; g.fill(); g.globalAlpha = 1;
      g.fillStyle = '#FFE9A8';
      for (let i = 0; i < 9; i++) { const x = fract(i * 0.618 + 0.2) * W, v = fract(t * 0.4 + i * 0.37); g.globalAlpha = 1 - v; g.beginPath(); g.arc(x, ly + 16 + i * 5, 3 + v * 7, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      if (st.phase === 'play' && st.at < lvl.lava.delay + 3) txt(st.at < lvl.lava.delay ? 'LAVA RISES IN ' + Math.ceil(lvl.lava.delay - st.at) : 'CLIMB!', W / 2, 96, 30, '#FF8A5C', { stroke: '#0a0d18' });
    }
    function drawShipWorld(g) {
      if (!ship.alive) return;
      const blink = ship.inv > 0 && st.phase === 'play' && Math.floor(st.clock * 16) % 2 === 0;
      if (st.shield) { g.strokeStyle = '#9FE8FF'; g.lineWidth = 2.5; g.globalAlpha = 0.45 + 0.2 * Math.sin(st.clock * 5); g.beginPath(); g.arc(ship.x, ship.y, 34, 0, TAU); g.stroke(); g.globalAlpha = 1; }
      if (ship.stab > 0.05) {
        g.strokeStyle = NAV; g.lineWidth = 3; g.globalAlpha = ship.stab * 0.8;
        for (let i = 0; i < 3; i++) { const a = st.clock * 5 + i * TAU / 3; g.beginPath(); g.arc(ship.x, ship.y, 31, a, a + 1.2); g.stroke(); }
        g.globalAlpha = 1;
      }
      if (st.landT > 0) { g.strokeStyle = PADC; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(ship.x, ship.y, 36, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, st.landT / 0.4)); g.stroke(); }
      if (NAVP) {
        const ca = Math.cos(ship.jetAim), sa = Math.sin(ship.jetAim), d = 36 + ship.jet * 5, px = ship.x + ca * d, py = ship.y + sa * d;
        g.fillStyle = NAV; g.strokeStyle = '#0a0d18'; g.lineWidth = 2; g.lineJoin = 'round'; g.globalAlpha = (st.lock ? 0.25 : 0.55) + 0.45 * ship.jet;
        g.beginPath(); g.moveTo(px + ca * 9, py + sa * 9); g.lineTo(px - sa * 7, py + ca * 7); g.lineTo(px + sa * 7, py - ca * 7); g.closePath(); g.fill(); g.stroke(); g.globalAlpha = 1;
      }
      g.save(); g.translate(ship.x, ship.y); g.rotate(ship.ang); g.globalAlpha = blink ? 0.4 : 1;
      drawShip(g, ship.eng[0], ship.eng[1], st.clock, { lx: ship.vx / 160, ly: ship.vy / 160, ouch: st.ouchT > 0, jet: ship.jet, jetAng: ship.jetAim + Math.PI - ship.ang, paint: save.paint });
      g.restore(); g.globalAlpha = 1;
      if (st.phase === 'ready' && st.pt < 1.9) {
        g.globalAlpha = Math.min(1, (2.0 - st.pt) * 3);
        for (let i = 0; i < 2; i++) {
          const dir = i ? 1 : -1, x = ship.x + dir * 34, y = ship.y - 64;
          g.strokeStyle = COL[i]; g.lineWidth = 3; g.beginPath(); g.moveTo(ship.x + dir * 17, ship.y - 8); g.lineTo(x, y + 14); g.stroke();
          txt(P[i].name, x + dir * 4, y, 18, COL[i], { align: i ? 'left' : 'right', stroke: '#0a0d18' });
          txt(i ? 'right engine' : 'left engine', x + dir * 4, y - 20, 13, '#fff', { align: i ? 'left' : 'right', stroke: '#0a0d18' });
        }
        if (NAVP) {
          g.strokeStyle = COL[2]; g.lineWidth = 3; g.beginPath(); g.moveTo(ship.x, ship.y - 30); g.lineTo(ship.x, ship.y - 100); g.stroke();
          txt(P[2].name, ship.x, ship.y - 114, 18, COL[2], { stroke: '#0a0d18' }); txt('navigator: jet + stabiliser', ship.x, ship.y - 134, 13, '#fff', { stroke: '#0a0d18' });
        }
        g.globalAlpha = 1;
      }
    }
    function drawHUD(g) {
      g.fillStyle = 'rgba(8,10,24,0.55)'; g.fillRect(0, 0, W, 38);
      const mh = maxHull();
      for (let i = 0; i < mh; i++) { heart(g, 30 + i * 27, 19, 9.5); g.fillStyle = i < st.hull ? '#FF5D73' : 'rgba(255,255,255,0.14)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#0a0d18'; g.stroke(); }
      let hx = 30 + mh * 27 + 4;
      if (up('shield') > 0) {
        g.strokeStyle = st.shield ? '#9FE8FF' : 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.beginPath(); g.arc(hx + 8, 19, 9, 0, TAU); g.stroke();
        if (!st.shield && st.shieldCd > 0) { g.strokeStyle = '#9FE8FF'; g.beginPath(); g.arc(hx + 8, 19, 9, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - st.shieldCd / (SHIELD_CD[up('shield')] || 40))); g.stroke(); }
        hx += 30;
      }
      if (st.mode === 'deep') for (let i = 0; i < DEEP_SHIPS; i++) { g.save(); g.translate(hx + 16 + i * 30, 21); g.scale(0.45, 0.45); g.globalAlpha = i < st.ships ? 1 : 0.18; drawShip(g, 0, 0, 0.2, { paint: save.paint }); g.restore(); g.globalAlpha = 1; }
      else if (lvl.free) txt('PRACTICE: FREE BUMPS', hx + 6, 20, 12, 'rgba(255,255,255,0.6)', { align: 'left' });
      txt(st.mode === 'deep' ? 'DEEP RUN  ·  DEPTH ' + (st.depth + 1) + '   +' + st.pay + '★' : 'CAVERN ' + (st.li + 1) + '   ' + lvl.name, W / 2, 20, 19, '#fff');
      starPath(g, W - 330, 19, 11, 0); g.fillStyle = GOLD; g.fill();
      txt(st.got + ' / ' + stars.length, W - 312, 20, 20, st.litT > 0 ? PADC : GOLD, { align: 'left' });
      if (bonus) { starPath(g, W - 232, 19, 9, 0); g.fillStyle = bonus.got ? VIOLET : 'rgba(201,160,255,0.25)'; g.fill(); }
      if (crate) txt(crate.s === 'done' ? 'CRATE ✓' : 'CRATE', W - 206, 20, 12, crate.s === 'done' ? PADC : '#FFB347', { align: 'left' });
      const under = st.time <= lvl.par;
      txt(fmt(st.time), W - 92, 20, 20, under ? '#6FD8FF' : '#fff', { align: 'right' });
      txt('par ' + fmt(lvl.par), W - 24, 21, 13, under ? '#6FD8FF' : 'rgba(255,255,255,0.45)', { align: 'right' });
      // bottom strip
      g.fillStyle = 'rgba(8,10,24,0.55)'; g.fillRect(0, H - 38, W, 38);
      for (let i = 0; i < 2; i++) {
        const on = ship.eng[i] > 0.3, x = i ? W - 30 : 30, al = i ? 'right' : 'left', d = i ? -1 : 1;
        g.fillStyle = COL[i]; g.globalAlpha = on ? 1 : 0.45; g.beginPath(); g.arc(x + d * 8, H - 19, on ? 11 : 8, 0, TAU); g.fill(); g.globalAlpha = 1;
        txt(P[i].name, x + d * 30, H - 19, 19, COL[i], { align: al });
        g.font = 'bold 19px ' + FONT; const nw = g.measureText(P[i].name).width;
        txt(i ? 'RIGHT ENGINE' : 'LEFT ENGINE', x + d * (42 + nw), H - 18, 13, 'rgba(255,255,255,0.6)', { align: al });
      }
      const bw = 240, bx = W / 2 - bw / 2;
      if (NAVP) {
        const by = H - 16; rr(bx, by, bw, 10, 5); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
        if (st.fuel > 0.01) { rr(bx, by, Math.max(10, bw * st.fuel), 10, 5); g.fillStyle = st.lock ? '#8A93AD' : NAV; g.fill(); }
        const busy = ship.jet > 0.3 || ship.stab > 0.3, job = st.lock ? 'RECHARGING…' : 'NAVIGATOR  ·  A jet  ·  B steady';
        g.font = 'bold 17px ' + FONT; const n3 = g.measureText(P[2].name).width; g.font = 'bold 12px ' + FONT; const jw = g.measureText(job).width, x3 = W / 2 - (n3 + 26 + jw) / 2;
        g.fillStyle = NAV; g.globalAlpha = busy ? 1 : 0.45; g.beginPath(); g.arc(x3, H - 27, busy ? 8 : 6, 0, TAU); g.fill(); g.globalAlpha = 1;
        txt(P[2].name, x3 + 14, H - 27, 17, NAV, { align: 'left' }); txt(job, x3 + 26 + n3, H - 26, 12, st.lock ? '#FFB3C1' : 'rgba(255,255,255,0.65)', { align: 'left' });
      } else {
        const by = H - 24; rr(bx, by, bw, 12, 6); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
        if (st.fuel > 0.01) { rr(bx, by, Math.max(12, bw * st.fuel), 12, 6); g.fillStyle = st.lock ? '#8A93AD' : NAV; g.fill(); }
        txt(st.lock ? 'STABILISER RECHARGING' : 'STABILISER  (B)', W / 2, H - 31, 11, 'rgba(255,255,255,0.7)');
      }
    }
    function drawFly(g) {
      g.drawImage(far, -60 - (ship.x - W / 2) * 0.045, -60 - (ship.y - H / 2) * 0.045);
      drawZones(g);
      g.drawImage(layer, 0, 0, W, H);
      drawDoors(g); drawLasers(g); drawPad(g); drawPickups(g); drawTurrets(g);
      FX.draw(g);
      drawShipWorld(g);
      drawLava(g);
      drawHUD(g);
      FX.drawText(g);
    }

    // ---------------- drawing: menus ----------------
    function backdrop(g, w) {
      renderFar(w); g.drawImage(far, -60 + Math.sin(st.clock * 0.2) * 20, -60 + Math.cos(st.clock * 0.17) * 20);
      g.fillStyle = 'rgba(6,8,20,0.55)'; g.fillRect(0, 0, W, H);
    }
    function starCount(g, x, y, size) {
      g.font = 'bold ' + size + 'px ' + FONT; const s = String(save.stars), w = g.measureText(s).width;
      starPath(g, x - w - size * 0.75, y - 1, size * 0.5, 0); g.fillStyle = GOLD; g.fill(); g.lineWidth = 2; g.strokeStyle = '#7a5a00'; g.stroke();
      txt(s, x, y, size, GOLD, { align: 'right' });
    }
    function button(g, x, y, w, h, label, on, sub, dim) {
      rr(x, y, w, h, 16); g.fillStyle = on ? GOLD : 'rgba(255,255,255,0.09)'; g.fill();
      if (!on) { g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.stroke(); }
      txt(label, x + w / 2 + (on ? Math.sin(st.clock * 8) * 2 : 0), y + h / 2 - (sub ? 9 : 0), 26, on ? '#0a0d18' : dim ? 'rgba(255,255,255,0.4)' : '#fff');
      if (sub) txt(sub, x + w / 2, y + h / 2 + 17, 13, on ? 'rgba(10,13,24,0.75)' : 'rgba(255,255,255,0.5)');
    }
    function drawMap(g) {
      const selIdx = sel.r < 4 ? sel.r * 6 + sel.c : -1;
      backdrop(g, selIdx >= 0 ? sel.r : 0);
      txt('CO-PILOT', 44, 50, 46, '#fff', { align: 'left', stroke: '#0a0d18' });
      txt('CAMPAIGN', 300, 56, 18, '#B58CFF', { align: 'left' });
      starCount(g, W - 44, 50, 38);
      txt(medalCount() + ' / ' + LEVELS.length * 4 + ' medals', W - 44, 84, 15, 'rgba(255,255,255,0.6)', { align: 'right' });
      const x0 = 250, cw = 112, chh = 84, y0 = 112, gy = 98;
      for (let w = 0; w < 4; w++) {
        const WD = WORLDS[w], y = y0 + w * gy, open = unlocked(w * 6);
        txt(WD.name, 44, y + 30, 21, open ? WD.glow : 'rgba(255,255,255,0.3)', { align: 'left' });
        let done = 0; for (let i = 0; i < 6; i++) if (cleared(w * 6 + i)) done++;
        txt(open ? done + ' of 6 clear' : 'locked', 44, y + 56, 14, 'rgba(255,255,255,0.5)', { align: 'left' });
        for (let i = 0; i < 6; i++) {
          const idx = w * 6 + i, x = x0 + i * (cw + 10), un = unlocked(idx), on = idx === selIdx, r = save.lv['c' + idx] || {};
          const bob = on ? Math.sin(st.clock * 6) * 2 : 0;
          rr(x, y + bob, cw, chh, 14); g.fillStyle = on ? '#243060' : un ? '#141B38' : '#0E1226'; g.fill();
          g.lineWidth = on ? 4 : 2; g.strokeStyle = on ? GOLD : un ? WD.glow : 'rgba(255,255,255,0.1)'; g.globalAlpha = on || !un ? 1 : 0.55; g.stroke(); g.globalAlpha = 1;
          if (un) {
            txt(String(idx + 1), x + cw / 2, y + 30 + bob, 32, r.c ? '#fff' : WD.glow);
            MEDALS.forEach((m, k) => drawMedal(g, x + 20 + k * 24, y + 64 + bob, 9, m, !!r[m[0]]));
          } else {
            g.fillStyle = 'rgba(255,255,255,0.22)'; rr(x + cw / 2 - 11, y + 36, 22, 18, 4); g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 4; g.beginPath(); g.arc(x + cw / 2, y + 36, 7, Math.PI, 0); g.stroke();
          }
        }
      }
      // info panel for the highlighted cavern
      const px = x0 + 6 * (cw + 10) + 14, pw = W - px - 40;
      rr(px, y0, pw, 4 * gy - 14, 16); g.fillStyle = 'rgba(10,14,34,0.8)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.14)'; g.stroke();
      if (selIdx >= 0) {
        const L = LEVELS[selIdx], r = save.lv['c' + selIdx] || {}, un = unlocked(selIdx), WD = WORLDS[sel.r];
        txt('CAVERN ' + (selIdx + 1), px + 18, y0 + 28, 15, WD.glow, { align: 'left' });
        g.font = 'bold 24px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(un ? L.name : '???', px + 18, y0 + 58, pw - 36);
        if (un) {
          g.font = '14px ' + FONT; g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillText(L.hint || '', px + 18, y0 + 86, pw - 36);
          txt('par ' + fmt(L.par || 60) + (r.t ? '   best ' + fmt(r.t) : ''), px + 18, y0 + 116, 15, '#6FD8FF', { align: 'left' });
          MEDALS.forEach((m, k) => { const yy = y0 + 156 + k * 42; drawMedal(g, px + 34, yy, 15, m, !!r[m[0]]); txt(m[1], px + 60, yy + 1, 16, r[m[0]] ? '#fff' : 'rgba(255,255,255,0.4)', { align: 'left' }); });
          txt('A = fly this cavern', px + pw / 2, y0 + 4 * gy - 36, 14, GOLD);
        } else txt('Clear cavern ' + selIdx + ' to unlock', px + 18, y0 + 92, 14, 'rgba(255,255,255,0.6)', { align: 'left' });
      } else if (sel.c < 3) {
        txt('HANGAR', px + 18, y0 + 30, 24, '#fff', { align: 'left' });
        txt('Spend stars on permanent', px + 18, y0 + 64, 14, 'rgba(255,255,255,0.65)', { align: 'left' }); txt('upgrades and paint jobs.', px + 18, y0 + 84, 14, 'rgba(255,255,255,0.65)', { align: 'left' });
      } else {
        txt('DEEP RUN', px + 18, y0 + 30, 24, '#fff', { align: 'left' });
        ['Endless random caverns,', 'each one harder. Three', 'ships for the whole dive.', 'Every cavern pays stars.'].forEach((s, k) => txt(s, px + 18, y0 + 64 + k * 20, 14, 'rgba(255,255,255,0.65)', { align: 'left' }));
        txt('best depth ' + save.deep, px + 18, y0 + 160, 16, '#6FD8FF', { align: 'left' });
      }
      const byy = y0 + 4 * gy + 6;
      button(g, 44, byy, 580, 76, 'HANGAR', sel.r === 4 && sel.c < 3, 'upgrades and paint  ·  ' + save.stars + ' stars to spend');
      button(g, 644, byy, W - 688, 76, deepOpen() ? 'DEEP RUN' : 'DEEP RUN  (locked)', sel.r === 4 && sel.c >= 3, deepOpen() ? 'endless dive  ·  best depth ' + save.deep : 'clear all six ' + WORLDS[0].name, !deepOpen());
      txt(st.msgT > 0 ? st.msg : 'Stick: choose   ·   A: go   ·   Stars and medals buy upgrades in the hangar   ·   Pause, then Restart, returns here mid-flight', W / 2, H - 22, 14, st.msgT > 0 ? '#FFB3C1' : 'rgba(255,255,255,0.5)');
    }
    function drawHangar(g) {
      backdrop(g, 0);
      txt('HANGAR', 44, 52, 46, '#fff', { align: 'left', stroke: '#0a0d18' });
      txt('upgrades are permanent', 300, 58, 16, 'rgba(255,255,255,0.55)', { align: 'left' });
      starCount(g, W - 44, 52, 38);
      const cw = 420, chh = 92, x0 = 44, y0 = 96;
      UPS.forEach((u, i) => {
        const x = x0 + (i % 2) * (cw + 14), y = y0 + Math.floor(i / 2) * (chh + 12), on = hsel === i, lv = up(u.k), max = lv >= u.cost.length, can = !max && save.stars >= u.cost[lv];
        rr(x, y, cw, chh, 14); g.fillStyle = on ? '#243060' : '#141B38'; g.fill(); g.lineWidth = on ? 4 : 2; g.strokeStyle = on ? GOLD : 'rgba(255,255,255,0.12)'; g.stroke();
        txt(u.name, x + 18, y + 26, 21, '#fff', { align: 'left' });
        for (let k = 0; k < u.cost.length; k++) { rr(x + 18 + k * 26, y + 44, 20, 9, 4); g.fillStyle = k < lv ? GOLD : 'rgba(255,255,255,0.14)'; g.fill(); }
        g.font = '14px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,0.7)';
        g.fillText(u.k === 'tank' && NAVP ? '+25% navigator energy' : u.desc, x + 18, y + 72, cw - 130);
        rr(x + cw - 104, y + 26, 88, 40, 20); g.fillStyle = max ? 'rgba(255,255,255,0.08)' : can ? GOLD : 'rgba(255,255,255,0.12)'; g.fill();
        if (max) txt('MAX', x + cw - 60, y + 47, 17, 'rgba(255,255,255,0.5)');
        else { starPath(g, x + cw - 84, y + 46, 9, 0); g.fillStyle = can ? '#0a0d18' : 'rgba(255,255,255,0.5)'; g.fill(); txt(String(u.cost[lv]), x + cw - 54, y + 47, 20, can ? '#0a0d18' : 'rgba(255,255,255,0.5)'); }
      });
      const by = y0 + 4 * (chh + 12) + 4, mc = medalCount(), nxt = PAINTS.find(p => p.need > mc);
      button(g, x0, by, cw, 70, 'PAINT:  ' + PAINTS[save.paint].name, hsel === 8, nxt ? 'next: ' + nxt.name + ' at ' + nxt.need + ' medals (you have ' + mc + ')' : 'every paint job unlocked');
      button(g, x0 + cw + 14, by, cw, 70, 'BACK TO MAP', hsel === 9);
      // the ship on its stand
      const sx = 1085, sy = 300;
      rr(930, 96, 306, 404, 18); g.fillStyle = 'rgba(10,14,34,0.8)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.14)'; g.stroke();
      g.save(); g.translate(sx, sy + Math.sin(st.clock * 2) * 6); g.rotate(Math.sin(st.clock * 1.3) * 0.08); g.scale(3.2, 3.2);
      drawShip(g, 0.5 + 0.5 * Math.sin(st.clock * 3), 0.5 + 0.5 * Math.cos(st.clock * 3), st.clock, { paint: save.paint, jet: 0 }); g.restore();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      txt(maxHull() + ' hearts', sx, 430, 17, '#FF8AA0'); txt('thrust +' + up('engine') * 5 + '%   energy +' + up('tank') * 25 + '%', sx, 456, 14, 'rgba(255,255,255,0.65)');
      txt(up('shield') ? 'shield recharges in ' + SHIELD_CD[up('shield')] + 's' : 'no shield yet', sx, 478, 14, 'rgba(255,255,255,0.65)');
      txt(st.msgT > 0 ? st.msg : 'Stick: choose   ·   A: buy   ·   B: back to the map', W / 2, H - 22, 15, st.msgT > 0 ? '#FFB3C1' : 'rgba(255,255,255,0.5)');
      FX.draw(g);
    }
    function drawResult(g) {
      drawFly(g);
      g.fillStyle = 'rgba(6,8,20,0.78)'; g.fillRect(0, 0, W, H);
      const k = ease.back(Math.min(1, st.t / 0.35));
      g.save(); g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-W / 2, -H / 2);
      rr(190, 70, 900, 580, 26); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 5; g.strokeStyle = res.kind === 'deep' ? '#6FD8FF' : lvl.glow; g.stroke();
      if (res.kind === 'camp') {
        txt('CAVERN ' + (res.li + 1) + ' CLEAR!', W / 2, 126, 54, '#fff', { stroke: '#0a0d18' });
        txt(LEVELS[res.li].name, W / 2, 174, 20, lvl.glow);
        MEDALS.forEach((m, i) => {
          const x = W / 2 - 300 + i * 200, show = st.t > 0.4 + i * 0.25, on = show && !!res.got[m[0]], pop = show ? ease.back(Math.min(1, (st.t - 0.4 - i * 0.25) / 0.3)) : 0;
          drawMedal(g, x, 290, 54 * (on ? pop : 1), m, on);
          txt(m[1], x, 368, 18, on ? '#fff' : 'rgba(255,255,255,0.35)');
          if (on && res.fresh.includes(m[0])) { rr(x - 34, 384, 68, 22, 11); g.fillStyle = GOLD; g.fill(); txt('NEW +3', x, 396, 13, '#0a0d18'); }
        });
        txt('time ' + fmt(res.time) + '   ·   par ' + fmt(lvl.par) + (res.best ? '   ·   NEW BEST' : ''), W / 2, 446, 22, res.got.p ? '#6FD8FF' : 'rgba(255,255,255,0.8)');
        if (res.pay) { starPath(g, W / 2 - 78, 492, 15, 0); g.fillStyle = GOLD; g.fill(); txt('+' + res.pay + ' stars', W / 2 - 54, 494, 28, GOLD, { align: 'left' }); }
        else txt('nothing new this time — chase the missing medals', W / 2, 494, 18, 'rgba(255,255,255,0.6)');
        if (res.note) txt(res.note, W / 2, 530, 20, PADC, { stroke: '#0a0d18' });
      } else {
        txt('DIVE OVER', W / 2, 140, 60, '#fff', { stroke: '#0a0d18' });
        txt('caverns cleared', W / 2, 220, 20, 'rgba(255,255,255,0.6)'); txt(String(res.depth), W / 2, 296, 110, '#6FD8FF', { stroke: '#0a0d18' });
        txt(res.best ? 'NEW BEST DEPTH!' : 'best depth ' + save.deep, W / 2, 384, 24, res.best ? GOLD : 'rgba(255,255,255,0.7)');
        starPath(g, W / 2 - 78, 452, 15, 0); g.fillStyle = GOLD; g.fill(); txt('+' + res.pay + ' stars', W / 2 - 54, 454, 28, GOLD, { align: 'left' });
      }
      const n = res.opts.length, bw = 250, gap = 16, bx = W / 2 - (n * bw + (n - 1) * gap) / 2;
      res.opts.forEach((o, i) => button(g, bx + i * (bw + gap), 566, bw, 60, o, rsel === i && st.t > 0.9));
      g.restore();
      starCount(g, W - 44, 40, 30);
      FX.draw(g); FX.drawText(g);
    }
    function draw(g) {
      if (st.scr === 'fly') drawFly(g);
      else if (st.scr === 'map') { drawMap(g); FX.draw(g); FX.drawText(g); }
      else if (st.scr === 'hangar') { drawHangar(g); FX.drawText(g); }
      else drawResult(g);
    }

    renderFar(0); loadLevel(LEVELS[0], true); go('map');
    return { update, draw, _dbg: { st, ship, save, sel, level: () => lvl, stars: () => stars, bonus: () => bonus, keys: () => keys, crate: () => crate, doors: () => doors, gates: () => gates,
      start: startCavern, deep: startDeep, load: i => startCavern(i), loadRaw: L => { st.mode = 'camp'; loadLevel(L, true); go('fly'); intro(true); }, persist, go, res: () => res,
      reset: () => { save.stars = 0; save.lv = {}; save.up = {}; save.paint = 0; save.deep = 0; save.runs = 0; persist(); } } };
  }

  GAMES.push({
    id: 'copilot', name: 'CO-PILOT', tag: 'CO-OP', rogue: true, badge: 'CAMPAIGN', color: '#B58CFF',
    get tagline() { return E.players.length >= 3 ? '24 caverns. Two engines, one navigator.' : '24 caverns. One ship. One engine each.'; },
    get pad() { return { a: 'OK', b: 'BACK', stick: 'CHOOSE' }; },
    get how() {
      const three = E.players.length >= 3;
      return {
        goal: 'Fly 24 caverns, earn medals, upgrade your ship',
        rows: three ? [['P1 A', 'LEFT engine (tips the ship right)'], ['P2 A', 'RIGHT engine (tips the ship left)'], ['P3 STICK + A', 'Navigator: aim the little jet, hold A to fire'], ['P3 B', 'Stabiliser (same energy bar as the jet)']]
          : [['P1 A', 'Fire the LEFT engine (tips the ship right)'], ['P2 A', 'Fire the RIGHT engine (tips the ship left)'], ['B', 'Stabiliser: steadies the ship, uses shared energy']],
        tips: three ? ['Grab every star, land gently. Progress is saved.'] : ['Grab every star, then land gently on the pad. Crashing only restarts the cavern.', 'Stars and medals buy upgrades in the hangar. Progress is saved.'],
      };
    },
    song: { bpm: 96, root: 53, minor: false, prog: [0, 3, 5, 4], kick: 'x-------x-----x-', snare: '----x-------x---', hat: '--x---x---x---x-',
      bass: 'x-----x-x-----o-', arp: '0-2-1-3-2-1-0-2-', arpWave: 'triangle', bassWave: 'sine' },
    icon(g, t) {
      const tilt = Math.sin(t * 2.2) * 0.32, e0 = Math.sin(t * 2.2 + 1.2) > -0.2 ? 1 : 0, e1 = Math.sin(t * 2.2 + 1.2) < 0.2 ? 1 : 0;
      g.fillStyle = '#1b2242'; g.fillRect(-120, 42, 240, 18);
      g.strokeStyle = '#B58CFF'; g.lineWidth = 3; g.beginPath(); g.moveTo(-120, 42); g.lineTo(120, 42); g.stroke();
      g.fillStyle = '#FFF2A8'; g.fillRect(52, 37, 50, 5);
      for (const [x, y, ph] of [[-84, -22, 0], [78, -30, 2]]) {
        starPath(g, x, y + Math.sin(t * 3 + ph) * 3, 12, Math.sin(t * 2 + ph) * 0.3); g.fillStyle = GOLD; g.fill(); g.lineWidth = 2; g.strokeStyle = '#7a5a00'; g.stroke();
      }
      MEDALS.forEach((m, i) => drawMedal(g, -96 + i * 22, 52, 8, m, true));
      g.save(); g.translate(Math.sin(t * 1.1) * 26, -6 + Math.cos(t * 2.2) * 6); g.rotate(tilt); g.scale(1.5, 1.5);
      drawShip(g, e0, e1, t, { lx: Math.sin(t * 1.1), ly: 0, jet: Math.sin(t * 1.3) > 0.3 ? 1 : 0, jetAng: Math.PI / 2 + Math.sin(t * 0.9) * 1.2 });
      g.restore();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    },
    create,
    _test: { LEVELS, validate, genLevel, norm, staticMask, stamp, nearFree,
      validateAll() { return LEVELS.map((L, i) => Object.assign({ i: i + 1, name: L.name }, validate(L))); },
      validateGen(n) { const out = []; for (let d = 0; d < n; d++) { const L = genLevel(d % 14), v = validate(L); out.push(Object.assign({ d: d % 14 }, v)); } return out; } },
  });
})();
