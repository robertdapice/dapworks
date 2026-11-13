'use strict';
// Lobby, how-to screen, pause menu, end-of-match menu.
const LOBBY_SONG = { bpm: 104, root: 57, minor: false, prog: [0, 4, 5, 3],
  kick: 'x---x---x---x-x-', snare: '----x-------x---', hat: 'x-x-x-x-x-x-x-xx', bass: 'x--x--x-x--x--o-', arp: '0-1-2-1-3-2-1-2-', arpWave: 'triangle' };

const App = {
  state: 'boot', sel: 0, game: null, inst: null, paused: false, psel: 0, over: null, overT: 0, osel: 0, fade: 1, st: 0,
  wins: (() => { try { const w = JSON.parse(localStorage.getItem('cc3_wins')); if (Array.isArray(w) && w.length === 3) return w; } catch (e) {} return [0, 0, 0]; })(),
  qr: null, bubbles: [],

  go(state) { this.state = state; this.fade = 1; this.st = 0; },
  toLobby() {
    this.inst = null; this.game = null; this.over = null; this.paused = false; FX.clear(); E.slowT = 0; E.freezeT = 0;
    Music.play(LOBBY_SONG); E.setPads({ a: 'OK', b: 'BACK', stick: 'CHOOSE' }, 'LOBBY'); this.go('lobby');
  },
  startGame() {
    FX.clear(); E.slowT = 0; E.freezeT = 0; E.shakeAmt = 0; this.over = null; this.paused = false;
    this.inst = this.game.create();
    Music.play(this.game.song || LOBBY_SONG); E.setPads(this.game.pad || { a: 'A', b: 'B' }, this.game.name);
    this.go('play');
  },
  endMatch(o) {
    if (this.state !== 'play' || this.over) return;
    this.over = o || {}; this.overT = 0; this.osel = 0;
    if (o.winner >= 0 && o.winner < NP) { this.wins[o.winner]++; localStorage.setItem('cc3_wins', JSON.stringify(this.wins)); S.win(); }
    else if (o.lose) S.lose(); else S.win();
    E.setPads({ a: 'OK', b: 'B', stick: 'CHOOSE' }, this.game.name);
  },
  togglePause() {
    if (this.state !== 'play' || this.over) return;
    this.paused = !this.paused; this.psel = 0; S.ui();
  },
  onKey(e) {
    initAudio();
    if (window.CC_OTHER && e.code === CC_OTHER.key && (this.state === 'boot' || this.state === 'lobby')) { location.href = CC_OTHER.url; return; }
    if (this.state === 'boot') { this.toLobby(); S.ok(); return; }
    if (e.code === 'Escape') { if (this.state === 'how') { S.back(); this.toLobby(); } else this.togglePause(); }
    if (e.code === 'KeyM') { A.musicOn = !A.musicOn; }
    if (e.code === 'Digit0' && this.state === 'lobby') { this.wins = [0, 0, 0]; localStorage.setItem('cc3_wins', '[0,0,0]'); S.back(); }
  },

  update(dt, rdt) {
    this.fade = Math.max(0, this.fade - rdt * 3.5); this.st += rdt;
    const P = E.players, any = k => P[0][k] || P[1][k] || P[2][k];
    if (this.state === 'lobby') {
      const n = GAMES.length, cols = 6; let s = this.sel;
      if (any('nr')) s = (s + 1) % n; if (any('nl')) s = (s + n - 1) % n;
      if (any('nd')) s = s + cols < n ? s + cols : s % cols; if (any('nu')) s = s - cols >= 0 ? s - cols : Math.min(n - 1, s + cols * Math.floor((n - 1 - s) / cols));
      if (s !== this.sel) { this.sel = s; S.ui(); }
      if (any('ap') && n) { this.game = GAMES[this.sel]; S.ok(); this.go('how'); }
      FX.update(rdt);
    } else if (this.state === 'how') {
      if (any('ap') && this.st > 0.25) { S.go(); this.startGame(); }
      else if (any('bp')) { S.back(); this.toLobby(); }
    } else if (this.state === 'play') {
      if (this.paused) {
        if (any('nd')) { this.psel = (this.psel + 1) % 3; S.ui(); }
        if (any('nu')) { this.psel = (this.psel + 2) % 3; S.ui(); }
        if (any('bp')) { this.paused = false; S.back(); }
        if (any('ap')) { S.ok(); if (this.psel === 0) this.paused = false; else if (this.psel === 1) this.startGame(); else this.toLobby(); }
        return;
      }
      this.inst.update(dt);
      if (this.over) {
        this.overT += rdt;
        if (this.overT > 1.6) {
          if (any('nd') || any('nu')) { this.osel = 1 - this.osel; S.ui(); }
          if (any('ap')) { S.ok(); if (this.osel === 0) this.startGame(); else this.toLobby(); }
        }
      }
    }
  },

  draw(g) {
    if (this.state === 'boot') this.drawBoot(g);
    else if (this.state === 'lobby') this.drawLobby(g);
    else if (this.state === 'how') this.drawHow(g);
    else if (this.state === 'play') {
      g.save(); this.inst.draw(g); g.restore();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      if (this.over && this.overT > 1.2) this.drawOver(g);
      if (this.paused) this.drawPause(g);
    }
    if (this.fade > 0) { g.globalAlpha = this.fade; g.fillStyle = '#05060c'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  },

  drawBg(g) {
    const t = E.rt, bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1b1446'); bg.addColorStop(1, '#0a1a3a');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.05; g.fillStyle = '#fff'; g.translate(W / 2, H / 2); g.rotate(-0.35);
    for (let i = -12; i < 12; i++) g.fillRect(-1200, i * 120 + (t * 24) % 120, 2400, 46);
    g.restore();
    if (!this.bubbles.length) for (let i = 0; i < 26; i++) this.bubbles.push({ x: rand(W), y: rand(H), r: rand(6, 30), s: rand(8, 30), c: pick(['#35C2FF', '#FF5D73', '#FFD23F', '#7CFF6B', '#C77DFF']), p: rand(TAU) });
    for (const b of this.bubbles) {
      b.y -= b.s * 0.016; if (b.y < -40) { b.y = H + 40; b.x = rand(W); }
      g.globalAlpha = 0.13; g.fillStyle = b.c; g.beginPath(); g.arc(b.x + Math.sin(t * 0.7 + b.p) * 20, b.y, b.r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  },
  drawTitle(g, y, size) {
    const s = 'COUCH CLASH', t = E.rt, cols = ['#35C2FF', '#FFD23F', '#FF5D73'];
    g.font = 'bold ' + size + 'px ' + FONT; let w = 0; const ws = [];
    for (const ch of s) { const cw = g.measureText(ch).width + size * 0.04; ws.push(cw); w += cw; }
    let x = W / 2 - w / 2;
    for (let i = 0; i < s.length; i++) {
      const yy = y + Math.sin(t * 3 + i * 0.6) * size * 0.07;
      g.save(); g.translate(x + ws[i] / 2, yy); g.rotate(Math.sin(t * 2.2 + i) * 0.06);
      txt(s[i], 0, 0, size, cols[i % 3], { stroke: '#0a0d18', sw: size * 0.22 });
      g.restore(); x += ws[i];
    }
    g.save(); g.translate(W / 2 + w / 2 + size * 0.1, y - size * 0.42); g.rotate(0.18); rr(-size * 0.52, -size * 0.2, size * 1.04, size * 0.4, size * 0.2); g.fillStyle = '#6EE06A'; g.fill();
    txt('TRIO', 0, size * 0.02, size * 0.3, '#0a0d18'); g.restore();
  },
  drawBoot(g) {
    this.drawBg(g); this.drawTitle(g, 280, 130);
    txt(GAMES.length + ' quick games for THREE', W / 2, 400, 34, '#6EE06A');
    g.globalAlpha = 0.6 + 0.4 * Math.sin(E.rt * 5);
    txt('PRESS SPACE ON THE LAPTOP TO START', W / 2, 520, 30, '#FFD23F', { stroke: '#0a0d18' });
    g.globalAlpha = 1;
    txt('Double-click for fullscreen', W / 2, 580, 18, 'rgba(255,255,255,0.5)');
    if (window.CC_OTHER) txt(CC_OTHER.label, W / 2, 630, 20, '#7CFF6B');
    if (E.netError) txt('Phone link unavailable (' + E.netError + '). Keyboard still works.', W / 2, 670, 16, '#FF5D73');
  },
  drawLobby(g) {
    const t = E.rt, P = E.players;
    this.drawBg(g); this.drawTitle(g, 62, 70);
    txt('version 4', W - 24, 22, 14, 'rgba(255,255,255,0.5)', { align: 'right' });
    // game cards: six across, two rows; the selected one is drawn last so it sits on top
    const COLS = 6, cw = 192, ch = 178, gx = 10, gy = 12, x0 = (W - (cw * COLS + gx * (COLS - 1))) / 2, y0 = 116;
    const order = GAMES.map((_, i) => i).filter(i => i !== this.sel); if (GAMES.length) order.push(this.sel);
    for (const i of order) {
      const gm = GAMES[i], on = i === this.sel, cx = x0 + (i % COLS) * (cw + gx) + cw / 2, cy = y0 + Math.floor(i / COLS) * (ch + gy) + ch / 2;
      const sc = on ? 1.07 + Math.sin(t * 6) * 0.012 : 1;
      g.save(); g.translate(cx, cy + (on ? Math.sin(t * 3) * 3 : 0)); g.scale(sc, sc);
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = on ? 30 : 10; g.shadowOffsetY = 6;
      rr(-cw / 2, -ch / 2, cw, ch, 16); g.fillStyle = on ? '#18203c' : '#111730'; g.fill();
      g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
      g.save(); rr(-cw / 2, -ch / 2, cw, ch, 16); g.clip();
      g.globalAlpha = on ? 0.32 : 0.14; g.fillStyle = gm.color; g.fillRect(-cw / 2, -ch / 2, cw, 118); g.globalAlpha = 1;
      g.save(); g.translate(0, -ch / 2 + 66); g.scale(0.7, 0.7);
      try { gm.icon(g, on ? t : 0.6); } catch (e) {}
      g.restore(); g.restore();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      rr(-cw / 2, -ch / 2, cw, ch, 16); g.lineWidth = on ? 5 : 2; g.strokeStyle = on ? gm.color : 'rgba(255,255,255,0.12)'; g.stroke();
      const label = gm.badge || (gm.rogue ? 'ROGUE-LITE' : gm.tag), bw = (gm.badge || gm.rogue) ? 84 : gm.tag === 'CO-OP' ? 56 : 62;
      rr(-cw / 2 + 8, -ch / 2 + 8, bw, 18, 9); g.fillStyle = gm.rogue ? '#C77DFF' : gm.tag === 'CO-OP' ? '#7CFF6B' : '#FFD23F'; g.fill();
      txt(label, -cw / 2 + 8 + bw / 2, -ch / 2 + 18, 10, '#10131f');
      g.font = 'bold 18px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.8)';
      g.fillText(gm.name, 0, ch / 2 - 30, cw - 14);
      g.restore();
    }
    if (GAMES[this.sel]) {
      const gm = GAMES[this.sel];
      txt((gm.rogue ? 'CO-OP · your progress is saved between runs  —  ' : '') + gm.tagline, W / 2, 512, 19, 'rgba(255,255,255,0.85)');
    }
    // bottom strip: three players + QR
    const by = 536, bh = 166, pw = 272;
    for (let i = 0; i < NP; i++) {
      const p = P[i], x = 39 + i * (pw + 12);
      rr(x, by, pw, bh, 18); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 3; g.strokeStyle = COL[i]; g.stroke();
      g.fillStyle = COL[i]; g.beginPath(); g.arc(x + 46, by + 48, 30 + (p.a ? 4 : 0), 0, TAU); g.fill();
      txt('P' + (i + 1), x + 46, by + 50, 26, '#0a0d18');
      g.font = 'bold 22px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(p.name, x + 88, by + 38, pw - 100);
      g.fillStyle = p.padOn ? '#7CFF6B' : '#FFD23F'; g.beginPath(); g.arc(x + 94, by + 65, 5, 0, TAU); g.fill();
      txt(p.padOn ? 'PHONE CONNECTED' : 'KEYBOARD', x + 106, by + 66, 13, p.padOn ? '#7CFF6B' : '#FFD23F', { align: 'left' });
      txt(['W A S D  +  F / G', 'Arrows  +  /  and  .', 'I J K L  +  O / P'][i], x + 58, by + 132, 13, 'rgba(255,255,255,0.55)', { align: 'left' });
      txt(String(this.wins[i]), x + pw - 42, by + 108, 44, COL[i]);
      txt('WINS', x + pw - 42, by + 142, 12, 'rgba(255,255,255,0.5)');
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(x + 32, by + 132, 13, 0, TAU); g.stroke();
      g.fillStyle = COL[i]; g.beginPath(); g.arc(x + 32 + p.x * 9, by + 132 + p.y * 9, 6, 0, TAU); g.fill();
    }
    // QR
    const qx = 905, qy = by + bh / 2;
    if (E.joinUrl) {
      if (!this.qr && window.qrcode) { try { const q = qrcode(0, 'M'); q.addData(E.joinUrl); q.make(); this.qr = q; } catch (e) {} }
      if (this.qr) {
        const n = this.qr.getModuleCount(), size = 132, m = size / n, ox = qx, oy = qy - size / 2;
        rr(ox - 10, oy - 10, size + 20, size + 20, 10); g.fillStyle = '#fff'; g.fill();
        g.fillStyle = '#0a0d18';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (this.qr.isDark(r, c)) g.fillRect(ox + c * m, oy + r * m, m + 0.4, m + 0.4);
      }
      txt('PHONE GAMEPAD', qx + 156, qy - 52, 16, '#FFD23F', { align: 'left' });
      txt(E.room ? 'Scan, or on your phone open' : 'Scan, or open', qx + 156, qy - 26, 14, 'rgba(255,255,255,0.7)', { align: 'left' });
      txt(E.room ? (location.host + location.pathname).replace(/\/(index\.html)?$/, '').replace(/\/trio$/, '') : E.joinUrl.replace('http://', ''), qx + 156, qy + 2, 17, '#fff', { align: 'left' });
      if (E.room) txt('code  ' + E.room, qx + 156, qy + 28 + 3, 26, '#FFD23F', { align: 'left', stroke: '#0a0d18' }); else txt('on the same wifi', qx + 156, qy + 28, 14, 'rgba(255,255,255,0.7)', { align: 'left' });
      txt('M music · Esc pause · 0 reset', qx + 156, qy + 58, 11, 'rgba(255,255,255,0.4)', { align: 'left' });
    }
    FX.draw(g);
  },
  drawHow(g) {
    const gm = this.game, t = this.st, h = gm.how || {};
    this.drawBg(g);
    g.fillStyle = 'rgba(5,6,12,0.55)'; g.fillRect(0, 0, W, H);
    const k = ease.back(Math.min(1, t / 0.3));
    g.save(); g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-W / 2, -H / 2);
    rr(140, 50, 1000, 620, 28); g.fillStyle = '#111730'; g.fill(); g.lineWidth = 6; g.strokeStyle = gm.color; g.stroke();
    g.save(); rr(140, 50, 1000, 620, 28); g.clip(); g.globalAlpha = 0.22; g.fillStyle = gm.color; g.fillRect(140, 50, 1000, 190); g.globalAlpha = 1;
    g.save(); g.translate(930, 148); g.scale(1.25, 1.25); try { gm.icon(g, E.rt); } catch (e) {} g.restore(); g.restore();
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    txt(gm.name, 190, 112, 58, '#fff', { align: 'left', stroke: '#0a0d18' });
    txt((gm.tag === 'CO-OP' ? 'CO-OP  ·  ' : 'VERSUS  ·  ') + (h.goal || ''), 192, 178, 24, gm.tag === 'CO-OP' ? '#7CFF6B' : '#FFD23F', { align: 'left' });
    let y = 290;
    for (const row of (h.rows || [])) {
      const key = row[0]; g.font = 'bold 24px ' + FONT; const kw = Math.max(74, g.measureText(key).width + 34);
      const c = /P1/.test(key) ? COL[0] : /P2/.test(key) ? COL[1] : /B$/.test(key) ? '#FFD23F' : '#fff';
      rr(200, y - 24, kw, 48, 24); g.fillStyle = c; g.fill();
      txt(key, 200 + kw / 2, y + 1, 24, '#0a0d18');
      txt(row[1], 200 + kw + 22, y + 1, 27, '#fff', { align: 'left' });
      y += 64;
    }
    y += 6;
    for (const tip of (h.tips || [])) { txt('★  ' + tip, 204, y, 20, 'rgba(255,255,255,0.75)', { align: 'left' }); y += 32; }
    txt('Keyboard:  P1 = WASD + F / G     P2 = arrows + / and .     P3 = IJKL + O / P', W / 2, 600, 16, 'rgba(255,255,255,0.45)');
    g.globalAlpha = 0.65 + 0.35 * Math.sin(E.rt * 6);
    txt('PRESS  A  TO START', W / 2, 640, 30, '#FFD23F', { stroke: '#0a0d18' });
    g.globalAlpha = 1;
    txt('B = back', 1080, 642, 16, 'rgba(255,255,255,0.45)', { align: 'right' });
    g.restore();
  },
  menu(g, title, color, sub, items, sel, y0) {
    g.fillStyle = 'rgba(5,6,12,0.72)'; g.fillRect(0, 0, W, H);
    txt(title, W / 2, y0, 96, color, { stroke: '#0a0d18', sw: 18 });
    if (sub) txt(sub, W / 2, y0 + 82, 34, '#fff', { stroke: '#0a0d18' });
    items.forEach((it, i) => {
      const y = y0 + 190 + i * 74, on = i === sel, w = 440;
      rr(W / 2 - w / 2, y - 30, w, 60, 30); g.fillStyle = on ? '#FFD23F' : 'rgba(255,255,255,0.1)'; g.fill();
      txt(it, W / 2 + (on ? Math.sin(E.rt * 8) * 3 : 0), y + 1, 28, on ? '#0a0d18' : '#fff');
    });
  },
  drawPause(g) { this.menu(g, 'PAUSED', '#fff', '', ['RESUME', 'RESTART', 'QUIT TO LOBBY'], this.psel, 190); },
  drawOver(g) {
    const o = this.over, a = Math.min(1, (this.overT - 1.2) / 0.3);
    g.globalAlpha = a;
    const c = o.winner >= 0 && o.winner < NP ? COL[o.winner] : (o.color || '#FFD23F');
    this.menu(g, o.title || 'GAME OVER', c, o.sub || '', ['PLAY AGAIN', 'PICK ANOTHER GAME'], this.osel, 170);
    if (this.game.tag !== 'CO-OP') {
      const P = E.players;
      for (let i = 0; i < NP; i++) txt(P[i].name + '  ' + this.wins[i], W / 2 + (i - 1) * 230, 300, 24, COL[i]);
    }
    g.globalAlpha = 1;
  },
};

cv.addEventListener('pointerdown', () => { initAudio(); if (App.state === 'boot') { App.toLobby(); S.ok(); } });
cv.addEventListener('dblclick', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (cv.requestFullscreen) document.documentElement.requestFullscreen(); });
if (NET === 'ws') fetch('/info').then(r => r.json()).then(j => { E.joinUrl = 'http://' + (j.ips[0] || location.hostname) + ':' + j.port; }).catch(() => {});
startEngine();
if (QS.has('game')) { const gm = GAMES.find(x => x.id === QS.get('game')); if (gm) { App.sel = GAMES.indexOf(gm); App.game = gm; App.startGame(); } }
