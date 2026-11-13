'use strict';
/* =====================================================================
   COUCH CLASH engine — shared by every game.

   A game is one file in js/games/ that does  GAMES.push({ ... }):
     id, name, tag ('VERSUS' | 'CO-OP'), color, tagline
     pad:  {a:'FIRE', b:'DASH'}            labels on the phone buttons
           (or an array of two such objects, one per player)
     how:  {goal:'First to 5', rows:[['STICK','Drive'],['A','Fire'],['B','Dash']], tips:['...']}
     song: {bpm, root, minor, prog, kick, snare, hat, bass, arp}   (see Music)
     icon(g, t):   draw a ~240x120 animated vignette centred on 0,0
     create():     returns {update(dt), draw(g)} for one match

   The logical screen is W x H = 1280 x 720. draw(g) must paint the whole
   screen. update(dt) gets seconds (already slow-mo / hit-stop scaled).

   Input:  E.players[0|1] -> {x, y (-1..1 stick), mag (0..1), a, b (held),
           ap, bp (pressed this frame), ar, br (released this frame), name}
   Juice:  E.shake(px)  E.slow(scale, secs)  E.freeze(secs)  E.flash(color, alpha)
           E.buzz(slot, ms)   (phone vibration; slot -1 = both)
   End:    E.endMatch({winner: 0 | 1 | -1, title, sub})   (-1 = co-op / draw)
           then keep updating/drawing; the engine overlays the menu.
   FX:     FX.burst / ring / text / banner / confetti, FX.update(dt),
           FX.draw(g) (particles + rings), FX.drawText(g) (popups + banners).
           Each game calls FX.update and the two draws itself.
   Sound:  S.<name>() presets, or tone({f,f2,d,type,v,t,pan}) / noise({d,v,f,f2,ft,q,t,pan}).
           panX(x) converts a screen x to a stereo pan.
   Saves:  Save.load(key, defaults) -> plain object (defaults overlaid, shallowly, with what was saved)
           Save.store(key, obj) persists it (browser storage + the laptop's disk when the server allows).
           For games with progress between runs. Such games set `rogue: true`, loop hub -> run -> hub
           on their own and never call E.endMatch (players leave through the pause menu).
   Players: use E.players.length (2 here, 3 in the trio edition) instead of hardcoding 2.
   Helpers: clamp lerp rand pick dist angLerp ease txt rr COL COLD COLL FONT TAU
   ===================================================================== */
const W = 1280, H = 720, TAU = Math.PI * 2;
const COL = ['#35C2FF', '#FF5D73'], COLD = ['#0E6FB0', '#B32342'], COLL = ['#C9EEFF', '#FFD0D6'];
const FONT = "Futura,'Avenir Next','Trebuchet MS',sans-serif";
const GAMES = [];
const NET = (typeof window !== 'undefined' && window.CC_NET) || 'ws';   // 'ws' = relay server on this laptop, 'peer' = serverless (public website)

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angLerp = (a, b, t) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
};

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {   // older phones / browsers
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}
const cv = document.getElementById('c');
const g = cv.getContext('2d');
let VS = 1, VOX = 0, VOY = 0, DPR_CAP = 2;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  VS = Math.min(cv.width / W, cv.height / H); VOX = (cv.width - W * VS) / 2; VOY = (cv.height - H * VS) / 2;
}
addEventListener('resize', resize); resize();

// ---------- drawing helpers ----------
function txt(s, x, y, size, color, o) {
  o = o || {};
  g.font = (o.weight || 'bold') + ' ' + size + 'px ' + FONT;
  g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
  if (o.stroke) { g.lineWidth = o.sw || Math.max(3, size * 0.16); g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = color || '#fff'; g.fillText(s, x, y);
}
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// ---------- engine state ----------
function mkPlayer(i) {
  return { i, name: 'PLAYER ' + (i + 1), x: 0, y: 0, mag: 0, a: false, b: false, ap: false, bp: false, ar: false, br: false,
    nl: false, nr: false, nu: false, nd: false, _a: false, _b: false, _nx: 0, _ny: 0,
    pad: { x: 0, y: 0, a: 0, b: 0 }, padOn: false, latchA: false, latchB: false };
}
const E = {
  t: 0, rt: 0, players: [mkPlayer(0), mkPlayer(1)],
  shakeAmt: 0, slowT: 0, slowScale: 1, freezeT: 0, flashA: 0, flashCol: '#fff',
  joinUrl: '', ws: null, padCfg: null,
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  slow(scale, secs) { this.slowScale = scale; this.slowT = secs; },
  freeze(secs) { this.freezeT = Math.max(this.freezeT, secs); },
  flash(color, alpha) { this.flashCol = color || '#fff'; this.flashA = alpha === undefined ? 0.6 : alpha; },
  toPad(slot, d) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({ t: 'to', s: slot, d })); },
  buzz(slot, ms) { this.toPad(slot, { t: 'buzz', ms: ms || 60 }); },
  setPads(cfg, title) {   // cfg: {a,b,stick} or [cfg0, cfg1]
    this.padCfg = [0, 1].map(i => Object.assign({ t: 'cfg', title: title || '' }, Array.isArray(cfg) ? cfg[i] : cfg));
    this.toPad(0, this.padCfg[0]); this.toPad(1, this.padCfg[1]);
  },
  endMatch(o) { if (typeof App !== 'undefined') App.endMatch(o); },
};

// ---------- saves (rogue-lite progress) ----------
const Save = {
  _k: k => 'ccsave_' + k,
  load(key, def) {
    let o = {};
    try { o = JSON.parse(localStorage.getItem(this._k(key)) || '{}') || {}; } catch (e) { o = {}; }
    return Object.assign({}, def || {}, o);
  },
  store(key, obj) {
    obj._t = Date.now();
    const s = JSON.stringify(obj);
    try { localStorage.setItem(this._k(key), s); } catch (e) {}
    this._push(key, s);
  },
  _push(key, s) {
    if (NET !== 'ws') return;   // the public site has no save server; progress stays in this browser
    try { fetch('/save/' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: s }).catch(() => {}); } catch (e) {}
  },
  // On page load: whichever copy is newer (this browser or the laptop's disk) wins.
  sync() {
    try {
      fetch('/save').then(r => r.ok ? r.json() : null).then(all => {
        if (!all) return;
        for (const key in all) {
          let loc = null; try { loc = JSON.parse(localStorage.getItem(this._k(key))); } catch (e) {}
          if (!loc || (all[key]._t || 0) > (loc._t || 0)) localStorage.setItem(this._k(key), JSON.stringify(all[key]));
        }
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i); if (!k || !k.startsWith('ccsave_')) continue;
          const key = k.slice(7); let loc = null; try { loc = JSON.parse(localStorage.getItem(k)); } catch (e) {}
          if (loc && (!all[key] || (loc._t || 0) > (all[key]._t || 0))) this._push(key, JSON.stringify(loc));
        }
      }).catch(() => {});
    } catch (e) {}
  },
};

// ---------- input ----------
const keys = {}, keyLatch = {};   // keyLatch catches taps shorter than one frame
const KEYMAP = [
  { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], a: ['KeyF', 'Space'], b: ['KeyG', 'ShiftLeft'] },
  { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], a: ['Slash', 'Enter', 'KeyK'], b: ['Period', 'KeyL', 'ShiftRight'] },
];
const EAT = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Period', 'Enter', 'Tab'];
addEventListener('keydown', e => {
  if (EAT.includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true; keyLatch[e.code] = true;
  if (typeof App !== 'undefined') App.onKey(e);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const anyKey = list => { for (const c of list) if (keys[c] || keyLatch[c]) return true; return false; };

function pollInput() {
  for (const p of E.players) {
    const k = KEYMAP[p.i];
    let x = (anyKey(k.r) ? 1 : 0) - (anyKey(k.l) ? 1 : 0), y = (anyKey(k.d) ? 1 : 0) - (anyKey(k.u) ? 1 : 0);
    let a = anyKey(k.a), b = anyKey(k.b);
    if (p.padOn) { x += p.pad.x; y += p.pad.y; a = a || !!p.pad.a || p.latchA; b = b || !!p.pad.b || p.latchB; }
    p.latchA = p.latchB = false;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    p.x = x; p.y = y; p.mag = Math.min(1, m);
    p.ap = a && !p._a; p.bp = b && !p._b; p.ar = !a && p._a; p.br = !b && p._b;
    p.a = a; p.b = b; p._a = a; p._b = b;
    const nx = x > 0.55 ? 1 : x < -0.55 ? -1 : 0, ny = y > 0.55 ? 1 : y < -0.55 ? -1 : 0;
    p.nl = nx === -1 && p._nx !== -1; p.nr = nx === 1 && p._nx !== 1;
    p.nu = ny === -1 && p._ny !== -1; p.nd = ny === 1 && p._ny !== 1;
    p._nx = nx; p._ny = ny;
  }
  for (const k in keyLatch) delete keyLatch[k];
}

// ---------- network (phone pads) ----------
// A message about one pad: from the relay server, or from this page's own pad handling in serverless mode.
function hostMsg(m) {
  const p = E.players[m.s]; if (!p) return;
  if (m.t === 'i') {
    p.pad.x = +m.x || 0; p.pad.y = +m.y || 0;
    if (m.a) p.latchA = true; if (m.b) p.latchB = true;
    p.pad.a = m.a; p.pad.b = m.b;
  } else if (m.t === 'pad') {
    const was = p.padOn; p.padOn = !!m.on;
    if (!m.on) p.pad = { x: 0, y: 0, a: 0, b: 0 };
    p.name = m.on && m.name ? String(m.name).toUpperCase() : 'PLAYER ' + (p.i + 1);
    if (m.on && E.padCfg) E.toPad(p.i, E.padCfg[p.i]);
    if (m.on && !was) { S.join(); E.buzz(p.i, 80); }
  } else if (m.t === 'menu') { if (typeof App !== 'undefined') App.togglePause(); }
}

function connectHost() {
  let ws;
  try { ws = new WebSocket('ws://' + location.host); } catch (e) { return; }
  E.ws = ws;
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', role: 'host' }));
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (err) { return; }
    if (m.t === 'bye') { E.replaced = true; return; }   // another laptop tab took over as the screen
    hostMsg(m);
  };
  ws.onclose = () => { E.players.forEach(p => { p.padOn = false; p.pad = { x: 0, y: 0, a: 0, b: 0 }; }); if (!E.replaced) setTimeout(connectHost, 1000); };
}

// ---------- network: serverless mode (public website) ----------
// A static host has no relay server, so each phone connects straight to this page over WebRTC
// (PeerJS; its public broker only introduces the two browsers). This page then does the relay
// server's job itself: hand out player slots, let a phone that rejoins keep its slot, and free
// the slot of a phone that goes quiet.
function connectHostPeer() {
  if (typeof Peer === 'undefined') { E.netError = 'offline'; return; }
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const mkCode = () => Array.from({ length: 4 }, () => ABC[Math.random() * ABC.length | 0]).join('');
  const MAXP = E.players.length, pads = new Array(MAXP).fill(null), lastSlot = {};
  const drop = c => {
    if (c.dead) return; c.dead = true;
    try { c.conn.close(); } catch (e) {}
    if (c.slot >= 0 && pads[c.slot] === c) { pads[c.slot] = null; hostMsg({ t: 'pad', s: c.slot, on: false }); }
  };
  const onData = (c, m) => {
    if (!m || typeof m !== 'object') return;
    c.last = performance.now();
    if (m.t === 'hello') {
      c.id = String(m.id || '');
      for (const p of pads) if (p && p !== c) { if (p.id === c.id) { try { p.conn.send({ t: 'bye' }); } catch (e) {} drop(p); } else if (performance.now() - p.last > 3000) drop(p); }
      let s = lastSlot[c.id]; if (s === undefined || pads[s]) s = pads.indexOf(null);
      c.slot = s; c.name = String(m.name || '').slice(0, 10);
      if (s >= 0) pads[s] = c, lastSlot[c.id] = s;
      try { c.conn.send({ t: 'slot', s }); } catch (e) {}
      if (s >= 0) hostMsg({ t: 'pad', s, on: true, name: c.name });
    } else if (c.slot < 0) return;
    else if (m.t === 'i') hostMsg({ t: 'i', s: c.slot, x: m.x, y: m.y, a: m.a, b: m.b });
    else if (m.t === 'menu') hostMsg({ t: 'menu', s: c.slot });
    else if (m.t === 'name') { c.name = String(m.name || '').slice(0, 10); hostMsg({ t: 'pad', s: c.slot, on: true, name: c.name }); }
    else if (m.t === 'ping') { try { c.conn.send({ t: 'pong', ts: m.ts }); } catch (e) {} }
  };
  E.toPad = (slot, d) => { for (let s = 0; s < MAXP; s++) if (pads[s] && (slot < 0 || slot === s)) { try { pads[s].conn.send(d); } catch (e) {} } };
  setInterval(() => { const now = performance.now(); for (const p of pads) if (p && now - p.last > 6000) drop(p); }, 2000);
  const open = code => {
    const peer = new Peer('ccgn-' + code);
    peer.on('open', () => {
      E.room = code; E.peer = peer; E.netError = '';
      try { sessionStorage.setItem('cc_room', code); } catch (e) {}
      E.joinUrl = location.origin + location.pathname.replace(/[^/]*$/, '') + 'pad.html?r=' + code;
    });
    peer.on('connection', conn => {
      const c = { conn, slot: -1, id: '', name: '', last: performance.now(), dead: false };
      conn.on('data', m => onData(c, m)); conn.on('close', () => drop(c)); conn.on('error', () => drop(c));
    });
    peer.on('error', err => {
      const type = err && err.type;
      if (type === 'unavailable-id') { try { peer.destroy(); } catch (e) {} open(mkCode()); }
      else if (type !== 'peer-unavailable') E.netError = type || 'network';
    });
    peer.on('disconnected', () => { setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} }, 1500); });
  };
  let saved = ''; try { saved = sessionStorage.getItem('cc_room') || ''; } catch (e) {}
  open(/^[A-Z]{4}$/.test(saved) ? saved : mkCode());   // a reload keeps the same room, so phones find it again
}

// ---------- audio ----------
const A = { ctx: null, master: null, sfx: null, music: null, nbuf: null, musicOn: true };
function initAudio() {
  if (A.ctx) { if (A.ctx.state !== 'running') A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const C = A.ctx = new AC();
  A.master = C.createGain(); A.master.gain.value = 0.8;
  const comp = C.createDynamicsCompressor(); A.master.connect(comp); comp.connect(C.destination);
  A.sfx = C.createGain(); A.sfx.gain.value = 1; A.sfx.connect(A.master);
  A.music = C.createGain(); A.music.gain.value = 0.32; A.music.connect(A.master);
  const n = C.sampleRate * 2; A.nbuf = C.createBuffer(1, n, C.sampleRate);
  const d = A.nbuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
}
function _out(node, o) {
  const dest = o.out || A.sfx;
  if (o.pan && A.ctx.createStereoPanner) { const p = A.ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); node.connect(p); p.connect(dest); }
  else node.connect(dest);
}
// tone({f, f2 (slide to), d (secs), type, v (volume), t (delay), a (attack), pan})
function tone(o) {
  if (!A.ctx) return;
  const C = A.ctx, t0 = C.currentTime + (o.t || 0), d = o.d || 0.15;
  const osc = C.createOscillator(), gn = C.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(Math.max(1, o.f), t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + d);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(o.v === undefined ? 0.2 : o.v, t0 + (o.a || 0.005));
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(gn); _out(gn, o); osc.start(t0); osc.stop(t0 + d + 0.03);
}
// noise({d, v, f (filter hz), f2 (sweep to), ft ('lowpass'|'bandpass'|'highpass'), q, t, pan})
function noise(o) {
  if (!A.ctx) return;
  const C = A.ctx, t0 = C.currentTime + (o.t || 0), d = o.d || 0.2;
  const src = C.createBufferSource(); src.buffer = A.nbuf; src.loop = true;
  const fl = C.createBiquadFilter(); fl.type = o.ft || 'lowpass'; fl.Q.value = o.q || 0.8;
  fl.frequency.setValueAtTime(o.f || 1200, t0);
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + d);
  const gn = C.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(o.v === undefined ? 0.3 : o.v, t0 + (o.a || 0.005));
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(fl); fl.connect(gn); _out(gn, o); src.start(t0, Math.random() * 1.5); src.stop(t0 + d + 0.03);
}
const panX = x => clamp((x / W) * 1.4 - 0.7, -0.8, 0.8);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// Sound presets. x is an optional screen x for stereo placement.
const S = {
  ui() { tone({ f: 700, f2: 940, d: 0.05, v: 0.08 }); },
  ok() { tone({ f: 520, d: 0.07, v: 0.1 }); tone({ f: 780, d: 0.1, v: 0.1, t: 0.06 }); },
  back() { tone({ f: 420, f2: 260, d: 0.1, v: 0.09 }); },
  join() { [523, 659, 784].forEach((f, i) => tone({ f, d: 0.12, v: 0.12, type: 'triangle', t: i * 0.07 })); },
  count() { tone({ f: 440, d: 0.12, v: 0.14, type: 'triangle' }); },
  go() { tone({ f: 880, d: 0.35, v: 0.16, type: 'triangle' }); tone({ f: 1320, d: 0.35, v: 0.08, type: 'triangle' }); },
  shoot(x) { tone({ f: 620, f2: 140, d: 0.11, v: 0.13, pan: panX(x) }); noise({ d: 0.07, v: 0.12, f: 3000, ft: 'highpass', pan: panX(x) }); },
  bounce(x) { tone({ f: 1100, f2: 1700, d: 0.045, v: 0.08, type: 'triangle', pan: panX(x) }); },
  tink(x) { tone({ f: 2100, f2: 1400, d: 0.07, v: 0.09, type: 'triangle', pan: panX(x) }); },
  boom(x, big) {
    noise({ d: big ? 0.9 : 0.45, v: big ? 0.7 : 0.4, f: big ? 1400 : 1000, f2: 50, pan: panX(x) });
    tone({ f: big ? 140 : 180, f2: 28, d: big ? 0.7 : 0.35, v: big ? 0.6 : 0.35, type: 'sine', pan: panX(x) });
  },
  crate(x) { noise({ d: 0.16, v: 0.25, f: 900, f2: 200, ft: 'bandpass', pan: panX(x) }); tone({ f: 200, f2: 80, d: 0.1, v: 0.1, type: 'triangle' }); },
  pickup() { [660, 880, 1320].forEach((f, i) => tone({ f, d: 0.09, v: 0.11, type: 'square', t: i * 0.055 })); },
  power() { [392, 523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.1, v: 0.1, type: 'sawtooth', t: i * 0.045 })); },
  dash(x) { noise({ d: 0.2, v: 0.22, f: 500, f2: 3200, ft: 'bandpass', q: 1.5, pan: panX(x) }); },
  hit(x) { tone({ f: 240, f2: 60, d: 0.16, v: 0.25, type: 'sawtooth', pan: panX(x) }); noise({ d: 0.1, v: 0.25, f: 1800, pan: panX(x) }); },
  thud(x) { tone({ f: 110, f2: 45, d: 0.14, v: 0.35, type: 'sine', pan: panX(x) }); },
  hurt() { tone({ f: 330, f2: 70, d: 0.35, v: 0.22, type: 'sawtooth' }); noise({ d: 0.25, v: 0.2, f: 900, f2: 200 }); },
  shield() { tone({ f: 1500, f2: 300, d: 0.25, v: 0.14, type: 'triangle' }); noise({ d: 0.2, v: 0.1, f: 5000, ft: 'highpass' }); },
  pop(x, n) { const f = 380 * Math.pow(1.06, Math.min(n || 0, 24)); tone({ f, f2: f * 1.9, d: 0.07, v: 0.13, type: 'triangle', pan: panX(x) }); },
  zap(x) { tone({ f: 1800, f2: 200, d: 0.12, v: 0.1, type: 'sawtooth', pan: panX(x) }); },
  splash(x) { noise({ d: 0.3, v: 0.25, f: 2500, f2: 400, ft: 'bandpass', pan: panX(x) }); },
  clang(x) { tone({ f: 1250, d: 0.2, v: 0.12, type: 'triangle', pan: panX(x) }); tone({ f: 1870, d: 0.16, v: 0.08, type: 'triangle', pan: panX(x) }); noise({ d: 0.05, v: 0.15, f: 6000, ft: 'highpass' }); },
  whoosh(x) { noise({ d: 0.22, v: 0.16, f: 2400, f2: 300, ft: 'bandpass', q: 2, pan: panX(x) }); },
  charge(v) { tone({ f: 200 + 600 * v, d: 0.06, v: 0.05, type: 'triangle' }); },
  fall() { tone({ f: 900, f2: 90, d: 0.7, v: 0.16, type: 'triangle' }); },
  goal() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ f, d: 0.16, v: 0.14, type: 'square', t: i * 0.09 })); noise({ d: 1.2, v: 0.2, f: 500, f2: 3000, ft: 'bandpass', a: 0.3 }); },
  point() { tone({ f: 660, d: 0.1, v: 0.12 }); tone({ f: 990, d: 0.18, v: 0.12, t: 0.09 }); },
  wave() { [392, 494, 587, 784].forEach((f, i) => tone({ f, d: 0.16, v: 0.11, type: 'triangle', t: i * 0.08 })); },
  nova() { noise({ d: 1.4, v: 0.6, f: 200, f2: 6000, a: 0.05 }); tone({ f: 80, f2: 900, d: 0.8, v: 0.3, type: 'sawtooth' }); tone({ f: 60, f2: 30, d: 1.2, v: 0.5, type: 'sine' }); },
  win() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone({ f, d: 0.22, v: 0.13, type: 'square', t: i * 0.11 })); tone({ f: 262, d: 0.9, v: 0.15, type: 'triangle', t: 0.66 }); },
  lose() { [392, 349, 311, 262].forEach((f, i) => tone({ f, d: 0.28, v: 0.13, type: 'triangle', t: i * 0.2 })); },
};

/* Music: a tiny step sequencer. A song is
   {bpm, root (midi note), minor (bool), prog: [scale degree per bar],
    kick/snare/hat: 16-char strings ('x' = hit), bass: 16 chars ('x' root, 'o' octave up, '-' rest),
    arp: 16 chars ('0'..'3' = chord tone, '-' rest), arpWave, bassWave} */
const Music = {
  song: null, step: 0, next: 0,
  play(song) { if (this.song === song) return; this.song = song; this.step = 0; if (A.ctx) this.next = A.ctx.currentTime + 0.1; },
  stop() { this.song = null; },
  tick() {
    if (!A.ctx || !this.song || A.ctx.state !== 'running' || !A.musicOn) return;
    const spb = 60 / this.song.bpm / 4, now = A.ctx.currentTime;
    if (this.next < now) this.next = now + 0.05;
    while (this.next < now + 0.2) { this.sched(this.step, this.next - now, spb); this.step++; this.next += spb; }
  },
  sched(step, dt, spb) {
    const s = this.song, i = step % 16, d = s.prog[(step >> 4) % s.prog.length];
    const sc = s.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const deg = n => sc[((n % 7) + 7) % 7] + 12 * Math.floor(n / 7);
    const out = A.music;
    if (s.kick && s.kick[i] === 'x') tone({ f: 150, f2: 42, d: 0.15, type: 'sine', v: 0.55, t: dt, out });
    if (s.snare && s.snare[i] === 'x') { noise({ d: 0.13, v: 0.3, f: 1900, ft: 'bandpass', q: 0.6, t: dt, out }); tone({ f: 190, f2: 120, d: 0.08, v: 0.12, type: 'triangle', t: dt, out }); }
    if (s.hat && s.hat[i] === 'x') noise({ d: 0.035, v: 0.09, f: 8000, ft: 'highpass', t: dt, out });
    const b = s.bass ? s.bass[i] : '-';
    if (b === 'x' || b === 'o') tone({ f: mtof(s.root - 12 + deg(d) + (b === 'o' ? 12 : 0)), d: spb * 1.7, type: s.bassWave || 'triangle', v: 0.34, t: dt, out });
    const a = s.arp ? s.arp[i] : '-';
    if (a >= '0' && a <= '3') tone({ f: mtof(s.root + 12 + deg(d + [0, 2, 4, 7][+a])), d: spb * 1.1, type: s.arpWave || 'square', v: 0.07, t: dt, out });
  },
};
setInterval(() => Music.tick(), 30);

// ---------- particles, rings, popups, banners ----------
const FX = {
  ps: [], rings: [], texts: [], banners: [],
  clear() { this.ps.length = 0; this.rings.length = 0; this.texts.length = 0; this.banners.length = 0; },
  // burst(x, y, {n, color (string | array), speed (max, or [min,max]), life, size, ang, spread, drag, grav, add (glow, default true), sq (square confetti)})
  burst(x, y, o) {
    o = o || {}; const n = o.n || 12;
    for (let i = 0; i < n; i++) {
      if (this.ps.length > 1600) break;
      const a = o.ang !== undefined ? o.ang + rand(-1, 1) * (o.spread === undefined ? 0.5 : o.spread) : rand(TAU);
      const s = Array.isArray(o.speed) ? rand(o.speed[0], o.speed[1]) : rand(0.25, 1) * (o.speed === undefined ? 200 : o.speed);
      const life = (o.life || 0.6) * rand(0.6, 1);
      this.ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: (o.size || 4) * rand(0.6, 1.2),
        color: Array.isArray(o.color) ? pick(o.color) : (o.color || '#fff'), drag: o.drag === undefined ? 2.5 : o.drag,
        grav: o.grav || 0, add: o.add !== false, sq: !!o.sq, rot: rand(TAU), vr: rand(-9, 9) });
    }
  },
  ring(x, y, o) { o = o || {}; const life = o.life || 0.4; this.rings.push({ x, y, r0: o.r0 || 4, r1: o.r1 || 80, life, max: life, color: o.color || '#fff', w: o.w || 5 }); },
  text(x, y, s, o) { o = o || {}; const life = o.life || 0.9; this.texts.push({ x, y, s, color: o.color || '#fff', size: o.size || 26, life, max: life, vy: o.vy === undefined ? -50 : o.vy }); },
  banner(s, o) { o = o || {}; const life = o.life || 1.1; this.banners.push({ s, color: o.color || '#fff', size: o.size || 120, life, max: life, y: o.y || H / 2, sub: o.sub || '' }); },
  confetti(x, y, n, o) {
    this.burst(x, y, Object.assign({ n: n || 60, color: ['#FFD23F', '#35C2FF', '#FF5D73', '#7CFF6B', '#ffffff', '#C77DFF'],
      speed: [150, 650], life: 1.9, size: 8, grav: 520, drag: 1.2, sq: true, add: false }, o || {}));
  },
  update(dt) {
    let ps = this.ps;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; p.life -= dt;
      if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy = p.vy * k + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (const a of [this.rings, this.texts, this.banners]) for (let i = a.length - 1; i >= 0; i--) {
      a[i].life -= dt; if (a[i].vy) a[i].y += a[i].vy * dt;
      if (a[i].life <= 0) a.splice(i, 1);
    }
  },
  draw(g) {
    for (let pass = 0; pass < 2; pass++) {
      g.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      for (const p of this.ps) {
        if (p.add !== !!pass) continue;
        const k = p.life / p.max;
        g.globalAlpha = Math.min(1, k * 1.6); g.fillStyle = p.color;
        const s = p.size * (0.4 + 0.6 * k);
        if (p.sq) { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-s, -s * 0.5, s * 2, s); g.restore(); }
        else { g.beginPath(); g.arc(p.x, p.y, s, 0, TAU); g.fill(); }
      }
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      g.globalAlpha = 1 - k; g.strokeStyle = r.color; g.lineWidth = r.w * (1 - k) + 0.5;
      g.beginPath(); g.arc(r.x, r.y, lerp(r.r0, r.r1, ease.out(k)), 0, TAU); g.stroke();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  },
  drawText(g) {
    for (const t of this.texts) {
      const k = 1 - t.life / t.max;
      g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const sc = k < 0.15 ? ease.back(k / 0.15) : 1;
      txt(t.s, t.x, t.y, t.size * sc, t.color, { stroke: 'rgba(0,0,0,0.75)' });
    }
    for (const b of this.banners) {
      const k = 1 - b.life / b.max;
      const sc = k < 0.18 ? ease.back(k / 0.18) : 1 + (k - 0.18) * 0.12;
      g.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      g.save(); g.translate(W / 2, b.y); g.scale(sc, sc); g.rotate(-0.04);
      txt(b.s, 0, 0, b.size, b.color, { stroke: '#0a0d18', sw: b.size * 0.2 });
      if (b.sub) txt(b.sub, 0, b.size * 0.72, b.size * 0.3, '#fff', { stroke: '#0a0d18' });
      g.restore();
    }
    g.globalAlpha = 1;
  },
};

// ---------- main loop ----------
let _last = 0, _slow = 0;
function _tick(rdt) {
  pollInput();
  let dt = rdt;
  if (E.freezeT > 0) { E.freezeT -= rdt; dt = 0; }
  else if (E.slowT > 0) { E.slowT -= rdt; dt *= E.slowScale; }
  E.t += dt; E.rt += rdt;
  E.shakeAmt = Math.max(0, E.shakeAmt - rdt * (E.shakeAmt * 7 + 6));
  E.flashA = Math.max(0, E.flashA - rdt * 2.5);
  App.update(dt, rdt);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  const sx = (Math.random() * 2 - 1) * E.shakeAmt, sy = (Math.random() * 2 - 1) * E.shakeAmt;
  g.setTransform(VS, 0, 0, VS, VOX + sx * VS, VOY + sy * VS);
  g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  App.draw(g);
  if (E.flashA > 0) { g.globalAlpha = E.flashA; g.fillStyle = E.flashCol; g.fillRect(-20, -20, W + 40, H + 40); g.globalAlpha = 1; }
  g.restore();
}
function _frame(now) {
  requestAnimationFrame(_frame);
  const raw = (now - _last) / 1000 || 0.016, rdt = Math.min(0.034, raw); _last = now;
  // If the laptop cannot hold ~45fps at full resolution, drop to 1x pixels once.
  if (DPR_CAP > 1 && raw < 0.25 && !document.hidden) { _slow = raw > 0.024 ? _slow + 1 : Math.max(0, _slow - 2); if (_slow > 150) { DPR_CAP = 1; resize(); } }
  if (!QS.has('manual')) _tick(rdt);
}
const QS = new URLSearchParams(location.search);
function startEngine() {
  if (!QS.has('test')) { if (NET === 'peer') connectHostPeer(); else connectHost(); }
  if (NET === 'ws') Save.sync();
  requestAnimationFrame(_frame);
}
// Test hooks (used with ?test): T.set(player, x, y, a, b) fakes a phone pad, T.step(n) runs n frames now.
const T = {
  set(i, x, y, a, b) { const p = E.players[i]; p.padOn = true; p.pad = { x: x || 0, y: y || 0, a: a ? 1 : 0, b: b ? 1 : 0 }; },
  step(n) { for (let i = 0; i < (n || 1); i++) _tick(1 / 60); return App.state; },
};
