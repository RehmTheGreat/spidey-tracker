/* ============================================================
   SPIDEY TRACKER - js/gui.js  (Rehm Edition)
   The whole application: world, tokens, sim, camera, tracking,
   panels, boot, Samsung gag, post-credits easter egg, audio,
   persistence. DOM + SVG, no canvas game loop, no dependencies
   beyond js/data.js + js/audio.js. Offline, file:// safe.
   ============================================================ */
(function () {
  'use strict';
  var ST = window.ST = window.ST || {};
  var D = ST.data;

  /* ---------------- storage (guarded) ---------------- */
  var store = (function () {
    try { localStorage.setItem('st_t', '1'); localStorage.removeItem('st_t'); return localStorage; }
    catch (e) {
      var m = {};
      return { getItem: function (k) { return k in m ? m[k] : null; },
               setItem: function (k, v) { m[k] = String(v); },
               removeItem: function (k) { delete m[k]; } };
    }
  })();
  function load(k, d) { try { var v = store.getItem('spideyTracker.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { store.setItem('spideyTracker.' + k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------- els ---------------- */
  function $(s) { return document.querySelector(s); }
  var scr = $('.scr'), map = $('#map'), w = $('#w'), rd = $('#rd'), tc = $('#tc'), chz = $('#chz'),
      lc = $('#lc'), hn = $('#hn'), bm = $('#bm'), t1 = $('#tl1'), t2 = $('#tl2'),
      md = $('#md'), mt = $('#mt'), mb = $('#mb'), bt = $('#bt'), off = $('#off'), eggEl = $('#egg'),
      cap = $('#cap'), toastsEl = $('#toasts'), subL = $('#subl'), subR = $('#subr');

  var esc = function (s) { return String(s).replace(/[&<>]/g, function (c) { return '&#' + c.charCodeAt() + ';'; }); };

  /* ---------------- sprite data URLs ---------------- */
  function sprURL(rows, pal) {
    var c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    var x = c.getContext('2d');
    rows.forEach(function (l, j) { for (var i = 0; i < l.length; i++) { var col = pal[l[i]]; if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } } });
    return 'url(' + c.toDataURL() + ')';
  }
  var SPIDER_ROWS = ['X.......X', '.X.XXX.X.', '..XXXXX..', 'XXXXXXXXX', '..XXXXX..', '.X.XXX.X.', 'X.......X'];
  var HEART_ROWS = ['.KK...KKGG', 'KRRK.KRRKG', 'KRWRKRRRRK', 'KRRRRRRRRK', '.KRRRRRRK.', '..KRRRRK..', '...KRRK...', '....KK....'];
  var FIG_ROWS = ['...KKKK...', '..KRRRRK..', '.KRWRRWRK.', '.KRRRRRRK.', '..KKRRKK..', '.KRRRRRRK.', 'KRRKRRKRRK', 'KRRKRRKRRK', '.KK.RR.KK.', '...KRRK...', '...KRRK...', '..KRRKRRK.', '..KKK.KKK.'];
  var PAL2 = { K: '#3a1030', R: '#f05a55', W: '#fff', X: '#161018', G: '#43d06c' };
  var rs = document.documentElement.style;
  rs.setProperty('--sp', sprURL(SPIDER_ROWS, PAL2));
  rs.setProperty('--ht', sprURL(HEART_ROWS, PAL2));
  rs.setProperty('--fg', sprURL(FIG_ROWS, PAL2));
  function portraitURL(p) {
    var legend = {};
    for (var k in p.legend) { if (typeof p.legend[k] === 'string' && p.legend[k].charAt(0) === '#') legend[k] = p.legend[k]; }
    return sprURL(p.rows, legend);
  }
  var PPF = D.ROSTER.map(function (r) { return portraitURL(r.portrait); });

  /* ---------------- world (SVG) ---------------- */
  var seed = 11;
  function rnd() { seed = seed * 16807 % 2147483647; return seed / 2147483647; }
  var G = D.CITY_GEOMETRY;
  function svgEl(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function polyStr(pts) { return pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }

  (function buildWorld() {
    /* Full-bleed world: the SVG spans -700..2300 so the camera never shows
       empty void at any legal zoom or pan. Water is drawn OVER the street
       grid so rivers read clean; the three diagonals cross it as bridges. */
    var svg = svgEl('svg', {
      width: 3000, height: 3000, viewBox: '-700 -700 3000 3000',
      style: 'position:absolute;left:-700px;top:-700px'
    });
    var s = '';
    // land base, full bleed
    s += '<rect x="-700" y="-700" width="3000" height="3000" fill="var(--land)"/>';
    // city blocks between grid lines (island only, terrain-revealable via .cty)
    var blocks = '<g class="cty" fill="var(--blk)">';
    for (var bi = 0; bi < G.avenues.length - 1; bi++) {
      for (var bj = 0; bj < G.streets.length - 1; bj++) {
        var ax = G.avenues[bi], bx2 = G.avenues[bi + 1];
        var by = typeof G.streets[bj] === 'number' ? G.streets[bj] : null;
        var by2 = typeof G.streets[bj + 1] === 'number' ? G.streets[bj + 1] : null;
        if (by === null || by2 === null) continue;
        if (bx2 - ax > 12 && by2 - by > 12) {
          blocks += '<rect x="' + (ax + 3) + '" y="' + (by + 3) + '" width="' + (bx2 - ax - 6) + '" height="' + (by2 - by - 6) + '"/>';
        }
      }
    }
    blocks += '</g>';
    s += blocks;
    // street grid: island avenues, east-bank avenues, NJ avenues, full-bleed streets
    var d1 = '';
    G.avenues.forEach(function (x) { d1 += 'M' + x + ' -700V2300'; });
    G.eastAvenues.forEach(function (x) { d1 += 'M' + x + ' -700V2300'; });
    [-660, -540, -420, -300, -180, -60].forEach(function (x) { d1 += 'M' + x + ' -700V2300'; });
    [950, 1010, 1070, 1130].forEach(function (x) { d1 += 'M' + x + ' -700V2300'; });
    G.streets.forEach(function (y) { if (typeof y === 'number') d1 += 'M-700 ' + y + 'H2300'; });
    s += '<path d="' + d1 + '" stroke="var(--st)" stroke-width="6" fill="none"/>';
    s += '<path d="' + d1 + '" transform="translate(-2 -2)" stroke="var(--st2)" stroke-width="1.2" opacity=".45" fill="none"/>';
    // parks
    G.parks.forEach(function (p) { s += '<polygon points="' + polyStr(p.pts) + '" fill="var(--pk)" stroke="var(--st2)" stroke-width="2" opacity=".95"/>'; });
    // water AFTER streets: rivers cover their crossings
    G.water.forEach(function (r) {
      s += '<rect x="' + r.x + '" y="-700" width="' + r.w + '" height="3000" fill="var(--wat)"/>';
    });
    // shorelines
    G.water.forEach(function (r) {
      s += '<rect x="' + r.x + '" y="-700" width="3" height="3000" fill="var(--st2)" opacity=".4"/>';
      s += '<rect x="' + (r.x + r.w - 3) + '" y="-700" width="3" height="3000" fill="var(--st2)" opacity=".4"/>';
    });
    // bank tint strips
    s += '<rect x="-700" y="-700" width="736" height="3000" fill="#00000018"/>';
    s += '<rect x="788" y="-700" width="1512" height="3000" fill="#00000018"/>';
    // three diagonal boulevards crossing the rivers as bridges
    s += '<path d="M-700 200L2300 700M300 -700L1300 2300M-700 900L2300 350" stroke="var(--st)" stroke-width="8" fill="none"/>';
    s += '<path d="M-700 200L2300 700M300 -700L1300 2300M-700 900L2300 350" transform="translate(-2 -2)" stroke="var(--st2)" stroke-width="1.4" opacity=".5" fill="none"/>';
    // landmark tower at EMPIRE STATE
    var emp = D.districtById('EMPIRE_STATE');
    if (emp) {
      s += '<g transform="translate(' + emp.x + ',' + emp.y + ')" fill="#dfe9ff" opacity=".9">' +
           '<rect x="-2" y="-10" width="4" height="14"/><rect x="-5" y="-4" width="10" height="8"/><rect x="-1" y="-15" width="2" height="6"/></g>';
    }
    // district labels: small, tucked below their anchor so markers stay visible
    D.DISTRICTS.forEach(function (d) {
      s += '<text x="' + d.x + '" y="' + (d.y + 26) + '" font-size="12" fill="#b5e0ff" opacity=".6" font-family="Silkscreen,monospace" text-anchor="middle">' + esc(d.label) + '</text>';
    });
    // region flavor labels on the outer banks
    [['NEW JERSEY', -420, 160], ['BROOKLYN', 1000, 720], ['QUEENS', 1080, 220]].forEach(function (r) {
      s += '<text x="' + r[1] + '" y="' + r[2] + '" font-size="14" fill="#b5e0ff" opacity=".4" font-family="Silkscreen,monospace" text-anchor="middle">' + esc(r[0]) + '</text>';
    });
    // hot zones (pulsing, CSS class)
    G.hotZones.forEach(function (z) {
      s += '<polygon class="hzp" points="' + polyStr(z.pts) + '" fill="#f0685e"/>';
    });
    // map corner stamp (attribution from data)
    s += '<text x="14" y="888" font-size="9" fill="#b5e0ff" opacity=".4" font-family="Silkscreen,monospace">' + esc(D.MISC.mapAttribution) + '</text>';
    svg.innerHTML = s;
    // transient fx group (THWIP lines etc): above everything static, below tokens
    var fxg = svgEl('g', { id: 'fxg', fill: 'none' });
    svg.appendChild(fxg);
    // YOU marker
    var me = document.createElement('div');
    me.className = 'me'; me.style.left = G.userPos.x + 'px'; me.style.top = G.userPos.y + 'px';
    w.appendChild(svg);
    w.appendChild(me);
    // trace group lives on top of svg, under tokens
    var tr = svgEl('g', { id: 'trg', stroke: '#d6f1ff', 'stroke-width': 1.4, 'stroke-dasharray': '5 4', opacity: '.6', fill: 'none' });
    svg.appendChild(tr);
  })();
  var trg = $('#trg');
  var fxg = $('#fxg');

  /* ---------------- radar (SVG) ---------------- */
  function polyPts(r) { var a = []; for (var i = 0; i < 12; i++) a.push((Math.cos(i * 0.5236) * r).toFixed(1) + ',' + (Math.sin(i * 0.5236) * r).toFixed(1)); return a.join(' '); }
  (function buildRadar() {
    rd.setAttribute('viewBox', '-50 -50 100 100');
    rd.innerHTML =
      '<polygon points="' + polyPts(49) + '" fill="#0c1a5acc" stroke="#6ec4f0" stroke-width="1.6"/>' +
      [16, 32].map(function (r) { return '<polygon points="' + polyPts(r) + '" fill="none" stroke="#3c86c8" stroke-width=".8"/>'; }).join('') +
      (function () { var s2 = ''; for (var i = 0; i < 12; i++) s2 += '<line x1="0" y1="0" x2="' + (Math.cos(i * 0.5236) * 49).toFixed(1) + '" y2="' + (Math.sin(i * 0.5236) * 49).toFixed(1) + '" stroke="#3c86c8" stroke-width=".6"/>'; return s2; })() +
      '<g class="sw"><path d="M0 0L0-48A48 48 0 0 1 24-41.6Z" fill="#8cffc8" opacity=".3"/></g>' +
      '<g id="bl"></g><circle r="2" fill="#f7b23f"/>';
  })();
  var blEl = null;

  /* ---------------- tokens ---------------- */
  var NM = ['WEB-07', 'NITE-OWL', 'QUEENS-1', 'THWIP-99', 'ROOFTOP', 'SILK-4', 'STICKY-1', 'DANGLER', 'BRKLYN-9', 'ARACHNO', 'SWINGER', 'WEB-HEAD', 'TANGLE-2', 'PIXEL-8', 'CRAWLER', 'SKYLINE', 'HOOK-3', 'AMBER-5', 'BOLT-12', 'MOTH-1', 'ZIP-LINE', 'GLOW-5', 'PATCH-7', 'ORBIT-3'];
  var TY = { r: 'RUMORED', g: 'CONFIRMED', e: 'EVENT' };
  var CL = { r: '#f0685e', g: '#55d977', e: '#6cc8ff' };
  var tk = [];
  var ni = 0;
  function hash8(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; var o = ''; for (var j = 0; j < 6; j++) { o += '0123456789ABCDEF'[h % 16]; h = (h / 16) | 0; } return o; }
  function place(x, y) {
    var best = null, bd = 1e9;
    D.DISTRICTS.forEach(function (d) { var dd = (d.x - x) * (d.x - x) + (d.y - y) * (d.y - y); if (dd < bd) { bd = dd; best = d; } });
    return best ? best.label : 'NEW YORK';
  }
  function addToken(t, x, y, opt) {
    opt = opt || {};
    var el = document.createElement('div');
    el.className = 'tk ' + t + (opt.fresh ? ' new' : '');
    el.style.left = x + 'px'; el.style.top = y + 'px';
    var o = { t: t, x: x, y: y, el: el, n: opt.n || NM[ni++ % NM.length], h: opt.h || hash8('' + x + y + ni), ago: opt.ago || 0,
              rep: opt.rep || null, in: 0, home: { x: x, y: y }, R: t === 'e' ? 0 : (t === 'r' ? 55 : 85), fresh: !!opt.fresh };
    el.title = o.n + ' / ' + TY[t];
    el.dataset.i = tk.length;
    w.appendChild(el);
    tk.push(o);
    if (opt.fresh) {
      var rp = document.createElement('div');
      rp.className = 'rp'; rp.style.left = x + 'px'; rp.style.top = y + 'px';
      w.appendChild(rp); setTimeout(function () { rp.remove(); }, 1300);
    }
    return o;
  }
  // seed from data
  D.SIGHTINGS_SEED.forEach(function (s2, i) {
    var t = s2.type === 'CONFIRMED' ? 'g' : s2.type === 'RUMORED' ? 'r' : 'e';
    var o = addToken(t, s2.x, s2.y, { n: s2.reporterHandle.replace('@', '').toUpperCase(), h: hash8(s2.id), ago: s2.timeAgoMinutes, rep: s2.report });
    o.home = { x: s2.x, y: s2.y };
  });
  // seed feed + chat
  var feed = [];
  var chat = [['THWIP-99', 'anyone near the east pier tonight?'], ['SILK-4', 'two red pings by the park, stay sharp']];
  for (var fi = 0; fi < 6; fi++) feed.push({ h: '@' + tk[fi].n.toLowerCase(), txt: tk[fi].rep || D.randomFeedLine(), ago: tk[fi].ago });

  /* ---------------- state ---------------- */
  var st = {
    z: 1, px: G.userPos.x, py: G.userPos.y,
    S: 1, T: 1, p: 1, a1: 1, a2: 1, ter: 0, d3: 0,
    sel: null, fol: 0, snd: load('snd', true), ov: 0, om: '',
    pIdx: load('suspect', 0), rep: 0, busy: 1, on: 0,
    eggDone: load('egg', false), samAsked: load('samAsked', false), samOn: load('samOn', false),
    bat: load('bat', 100), rsvp: load('rsvp', {}), log: [], eggCount: 0
  };
  if (!st.eggDone) cap.textContent = D.MISC.caption;
  else cap.textContent = D.EASTER_EGG.captionAfter;
  var savedLog = load('log', []);
  if (savedLog.length) st.log = savedLog;

  function logLine(txt) {
    var d = new Date();
    var hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    st.log.unshift(hh + ':' + mm + '  ' + txt);
    if (st.log.length > 60) st.log.pop();
    save('log', st.log.slice(0, 40));
  }

  /* ---------------- audio ---------------- */
  var AU = ST.audio;
  AU.setMuted(!st.snd);
  function bp(f, d) { if (st.snd) { AU.init(); AU.blip(f, d || 0.06, 'square', 0.14); } }
  function cue(n) { if (st.snd) { AU.init(); AU.play(n); } }

  /* ---------------- camera ---------------- */
  var tl = $('#tl');
  function cl() { st.px = Math.min(760, Math.max(140, st.px)); st.py = Math.min(760, Math.max(140, st.py)); }
  function T() {
    var W2 = map.clientWidth, H2 = map.clientHeight, s = W2 / 640 * st.z;
    w.style.transform = 'translate(' + (W2 / 2 - st.px * s) + 'px,' + (H2 / 2 - st.py * s) + 'px) scale(' + s + ')';
    w.style.setProperty('--s', s);
    tl.style.setProperty('--t', st.d3 ? 50 : 0);
    tl.style.transform = 'rotateX(calc(var(--t)*1deg))';
    map.style.setProperty('--t', st.d3 ? 50 : 0);
    $('#b3').classList.toggle('d', !st.d3 && st.z < 1.6);
  }
  function fly(x, y, z) {
    w.classList.add('fly'); st.px = x; st.py = y; if (z) st.z = z; cl(); T();
    setTimeout(function () { w.classList.remove('fly'); }, 800);
  }
  function zoom(f, e) {
    var W2 = map.clientWidth, H2 = map.clientHeight, s0 = W2 / 640 * st.z;
    var z = Math.min(3.2, Math.max(0.55, st.z * f)), s1 = W2 / 640 * z;
    if (e) {
      var b = map.getBoundingClientRect(), cx = e.clientX - b.left - W2 / 2, cy = e.clientY - b.top - H2 / 2;
      st.px += cx / s0 - cx / s1; st.py += cy / s0 - cy / s1;
    }
    st.z = z; cl(); T();
  }
  var dr = null, mv = 0;
  map.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e); }, { passive: false });
  map.addEventListener('pointerdown', function (e) {
    mv = 0;
    if (e.target.closest('button,#tc,#chz')) return;
    dr = { x: e.clientX, y: e.clientY, px: st.px, py: st.py };
    st.fol = 0; w.classList.remove('fly');
  });
  window.addEventListener('pointermove', function (e) {
    if (!dr) return;
    var dx = e.clientX - dr.x, dy = e.clientY - dr.y, s = map.clientWidth / 640 * st.z;
    mv = Math.max(mv, Math.abs(dx) + Math.abs(dy));
    st.px = dr.px - dx / s; st.py = dr.py - dy / s; cl(); T();
  });
  window.addEventListener('pointerup', function () { dr = null; });
  function screenToWorld(e) {
    var b = map.getBoundingClientRect(), s = b.width / 640 * st.z;
    return { x: st.px + (e.clientX - b.left - b.width / 2) / s, y: st.py + (e.clientY - b.top - b.height / 2) / s };
  }
  map.addEventListener('click', function (e) {
    if (mv > 5 || st.busy) return;
    if (e.target.closest('#chz,#tc,button')) return;
    if (st.rep) { reportPlace(e); return; }
    var t = e.target.closest('.tk');
    if (t) sel(+t.dataset.i);
    else sel(null);
  });

  /* ---------------- helpers ---------------- */
  var UX = G.userPos.x, UY = G.userPos.y;
  function dist(o) { return Math.hypot(o.x - UX, o.y - UY); }
  function brg(o) { return (Math.atan2(o.x - UX, UY - o.y) * 57.3 + 360) % 360 | 0; }
  function vis(o) { return o.t === 'e' ? st.S : (st.S && (st.p === 1 || (st.p === 2 && o.t === 'r') || (st.p === 3 && o.t === 'g'))); }
  function tiles(n) { return String(n).padStart(3, '0').replace(/./g, '<b class="t">$&</b>'); }
  function say(t, ms) {
    st.om = t; st.ov = Date.now() + (ms || 2400); draw(1);
    bm.classList.remove('flash'); void bm.offsetWidth; bm.classList.add('flash');
    setTimeout(function () { draw(1); }, (ms || 2400) + 60);
  }
  function toast(txt, sam) {
    var d = document.createElement('div');
    d.className = 'toast' + (sam ? ' sam' : ''); d.textContent = txt;
    toastsEl.appendChild(d);
    cue('toast');
    setTimeout(function () { d.style.opacity = '0'; d.style.transition = 'opacity .4s'; }, 2200);
    setTimeout(function () { d.remove(); }, 2700);
  }

  /* ---------------- draw ---------------- */
  blEl = $('#bl');
  function draw(q) {
    var nr = null, nd = 1e9, c = 0, al = '';
    var trS = '';
    tk.forEach(function (o, i) {
      var v = vis(o), d = dist(o) * 2.5;
      o.el.classList.toggle('off', !v);
      o.el.classList.toggle('sel', i === st.sel);
      if (v) {
        if (d < nd) { nd = d; nr = o; }
        if (d < 250) c++;
        var n = d < 175;
        if (!q && n && !o.in && o.t !== 'e' && (o.t === 'r' ? st.a2 : st.a1)) {
          al = TY[o.t] + ' SIGHTING / ' + o.n + ' / ' + (d | 0) + 'M';
          cue(o.t === 'r' ? 'spawn' : 'ping');
          logLine('ALERT ' + o.n + ' ' + (d | 0) + 'M');
        }
        o.in = n;
        if (st.T && d < 200) trS += '<line x1="' + UX + '" y1="' + UY + '" x2="' + o.x.toFixed(0) + '" y2="' + o.y.toFixed(0) + '"/>';
      } else o.in = 0;
    });
    if (al) {
      st.om = al; st.ov = Date.now() + 2600;
      bm.classList.remove('flash'); void bm.offsetWidth; bm.classList.add('flash');
    }
    hn.textContent = c;
    t1.innerHTML = tiles(nr ? Math.min(999, nd | 0) : 0);
    t2.innerHTML = tiles(nr ? brg(nr) : 0);
    var tx = nr ? (nd < 175 ? 'SIGHTING IN YOUR DIRECT VICINITY' : nd < 450 ? 'SIGHTING NEARBY' : 'DISTANT SIGNAL DETECTED') : 'NO SIGNAL IN RANGE';
    if (st.sel != null) tx = 'LOCKED / ' + tk[st.sel].n;
    if (Date.now() < st.ov) tx = st.om;
    bm.textContent = tx;
    if (blEl) {
      var vec = '';
      var so = tk[st.sel];
      if (so && vis(so)) {
        vec = '<line x1="0" y1="0" x2="' + ((so.x - UX) * 0.163).toFixed(1) + '" y2="' + ((so.y - UY) * 0.163).toFixed(1) + '" stroke="#ffd54a" stroke-width="1" stroke-dasharray="2 1.5"/>';
      }
      blEl.innerHTML = vec + tk.filter(function (o) { return vis(o) && dist(o) < 300; }).map(function (o) {
        return '<circle cx="' + ((o.x - UX) * 0.163).toFixed(1) + '" cy="' + ((o.y - UY) * 0.163).toFixed(1) + '" r="2.6" fill="' + CL[o.t] + '" stroke="#0a0a40" stroke-width=".8"/>';
      }).join('');
    }
    trg.innerHTML = trS;
    scr.classList.toggle('trk', !!(st.fol && st.sel != null));
    var m = { a1: st.a1, a2: st.a2, ter: st.ter, d3: st.d3, tS: st.S, tT: st.T, p1: st.p === 1, p2: st.p === 2, p3: st.p === 3, snd: st.snd, rep: st.rep };
    document.querySelectorAll('[data-k]').forEach(function (e2) {
      var k = e2.dataset.k;
      if (k in m) e2.classList.toggle('on', !!m[k]);
    });
    // target card
    var o = tk[st.sel];
    tc.style.display = o ? 'block' : 'none';
    if (o) {
      tc.innerHTML = '<div class="h"><i class="dot ' + o.t + '"></i><b>' + esc(o.n) + '</b><u>' + TY[o.t] + '</u></div>' +
        '<p>DIST ' + (dist(o) * 2.5 | 0) + ' M / BRG ' + brg(o) + ' DEG / ' + esc(place(o.x, o.y)) + '</p>' +
        (o.rep ? '<p class="rp2">"' + esc(o.rep) + '"</p>' : '') +
        '<p>ID 0x' + o.h + ' / ' + o.ago + 'M AGO</p>' +
        '<div class="cb"><button class="b o" data-k="ping">PING</button>' +
        '<button class="b g' + (st.fol ? ' on' : '') + '" data-k="fol">' + (st.fol ? 'TRACKING' : 'TRACK') + '</button>' +
        '<button class="b r" data-k="x">X</button></div>';
    }
    // sub row
    subL.textContent = 'SIG ' + c + ' IN RANGE';
    subR.textContent = 'BAT ' + Math.round(st.bat) + '%';
  }

  /* ---------------- selection / LCD ---------------- */
  var lt = null;
  function lcd(h) {
    var n = 0; clearInterval(lt);
    lt = setInterval(function () {
      n++;
      lc.textContent = '0x' + (n < 8 ? (function () { var s2 = ''; for (var i = 0; i < 8; i++) s2 += '0123456789ABCDEF'[Math.random() * 16 | 0]; return s2; })() : h);
      if (n >= 8) clearInterval(lt);
    }, 45);
  }
  function clearRing() { if (st.ringEl) { st.ringEl.remove(); st.ringEl = null; } }
  function sel(i) {
    st.sel = i; st.fol = 0; AU.stopLoop('sonar'); clearRing(); scr.classList.remove('trk');
    lcd(i == null ? '00000000' : tk[i].h);
    if (i != null) { bp(700, 0.05); logLine('SELECT ' + tk[i].n); }
    draw(1);
  }

  /* ---------------- sim ---------------- */
  function move() {
    tk.forEach(function (o) {
      if (o.t === 'e') return;
      var k = o.t === 'r' ? 14 : 8;
      o.x += (rnd() - 0.5) * k; o.y += (rnd() - 0.5) * k;
      var d = Math.hypot(o.x - o.home.x, o.y - o.home.y);
      if (d > o.R) { o.x += (o.home.x - o.x) * 0.2; o.y += (o.home.y - o.y) * 0.2; }
      o.el.style.left = o.x + 'px'; o.el.style.top = o.y + 'px';
    });
    if (st.fol && st.ringEl && st.sel != null && tk[st.sel]) {
      st.ringEl.style.left = tk[st.sel].x + 'px';
      st.ringEl.style.top = tk[st.sel].y + 'px';
    }
  }
  function spawnTick() {
    if (st.on && !st.busy) {
      var roll = rnd();
      var t = roll < 0.7 ? 'g' : roll < 0.97 ? 'r' : 'e';
      var z = G.hotZones[rnd() < 0.6 ? 0 : 1];
      var cx = (z.pts[0][0] + z.pts[2][0]) / 2, cy = (z.pts[0][1] + z.pts[2][1]) / 2;
      var o = addToken(t, cx + (rnd() - 0.5) * 220, cy + (rnd() - 0.5) * 160, { fresh: 1, ago: 0, rep: D.randomFeedLine() });
      if (tk.length > 26) {
        var old = tk.findIndex(function (x2) { return x2 !== o && tk.indexOf(x2) !== st.sel && x2.t !== 'e'; });
        if (old >= 0) { tk[old].el.classList.add('fade'); (function (x3) { setTimeout(function () { x3.remove(); }, 450); })(tk[old].el); tk.splice(old, 1); }
      }
      cue('spawn');
      // spider-sense: ripple from YOU when the report lands nearby
      if (Math.hypot(o.x - UX, o.y - UY) < 300) {
        var sr = document.createElement('div'); sr.className = 'rp';
        sr.style.left = UX + 'px'; sr.style.top = UY + 'px';
        w.appendChild(sr); setTimeout(function () { sr.remove(); }, 1300);
      }
      feed.unshift({ h: '@' + o.n.toLowerCase(), txt: o.rep, ago: 0 });
      logLine('NEW REPORT ' + o.n + ' ' + place(o.x, o.y));
      draw(1);
      if (st.samOn && rnd() < 0.55) toast('SAMSUNG EXCLUSIVE: new sighting near ' + place(o.x, o.y), 1);
    }
    setTimeout(spawnTick, 9000 + rnd() * 13000);
  }
  setInterval(function () { // rumor jitter
    tk.forEach(function (o) {
      if (o.t === 'r' && rnd() < 0.15) {
        o.x = o.home.x + (rnd() - 0.5) * 160; o.y = o.home.y + (rnd() - 0.5) * 160;
        o.el.style.left = o.x + 'px'; o.el.style.top = o.y + 'px';
        bp(300, 0.04);
      }
    });
  }, 30000);
  setInterval(function () {
    move(); draw();
    if (st.fol && st.sel != null) { var o = tk[st.sel]; fly(o.x, o.y); }
  }, 1400);
  setInterval(function () { // battery drain, wraps like canon tracker uptime
    if (!st.on) return;
    st.bat -= 100 / 1200 * (14 / 60);
    if (st.bat <= 0) st.bat = 100;
    save('bat', Math.round(st.bat));
  }, 14000);
  // LCD idle flutter
  setInterval(function () {
    if (st.on && !st.busy && st.sel == null && Math.random() < 0.4) {
      var keep = lc.textContent;
      lc.textContent = '0x' + (function () { var s2 = ''; for (var i = 0; i < 8; i++) s2 += '0123456789ABCDEF'[Math.random() * 16 | 0]; return s2; })();
      setTimeout(function () { if (st.sel == null) lc.textContent = keep; }, 140);
    }
  }, 7000);

  /* ---------------- report mode ---------------- */
  function reportPlace(e) {
    var pt = screenToWorld(e);
    chz.style.display = 'block';
    chz.innerHTML = '<div class="msg">MARK THIS SIGHTING AS:</div><div class="opts">' +
      '<button class="b g" data-k="rcg">CONFIRMED</button><button class="b r" data-k="rcr">RUMORED</button></div>' +
      '<button class="b o" data-k="rcx" style="margin-top:1.2cqw;width:100%">CANCEL</button>';
    chz.dataset.x = pt.x; chz.dataset.y = pt.y;
  }
  function reportDone(t) {
    var x = +chz.dataset.x, y = +chz.dataset.y;
    chz.style.display = 'none';
    var o = addToken(t, x, y, { n: 'YOU', h: hash8('YOU' + x + y), ago: 0, rep: 'reported by you', fresh: 1 });
    st.rep = 0; map.classList.remove('rep'); draw(1);
    cue('spawn');
    toast('REPORT RECEIVED. THANKS, WEB HEAD!');
    logLine('USER REPORT ' + TY[t] + ' ' + place(x, y));
    feed.unshift({ h: '@you', txt: 'filed a ' + TY[t] + ' sighting in ' + place(x, y), ago: 0 });
    sel(tk.indexOf(o));
  }

  /* ---------------- suspect ---------------- */
  function setSuspect(i) {
    st.pIdx = i; save('suspect', i);
    document.querySelectorAll('.tom .pf').forEach(function (el) { el.style.setProperty('--pp', PPF[i]); });
    logLine('SUSPECT ' + D.ROSTER[i].name);
  }

  /* ---------------- modal ---------------- */
  var RP = ['thwip! saw you on the tracker', 'heading north over the river, join?', 'careful on 5th, lots of red pings', 'anyone got eyes on the bridge?', 'copy that. staying on rooftops', 'signal is noisy near the water', 'cold trail by the park', 'meet at the clock tower in 10?', 'my web fluid is nearly out lol', '63 unexplored and counting'];
  var VKEYS = [['ARROWS', 'PAN MAP'], ['+ / -', 'ZOOM'], ['ENTER', 'LOCK / UNLOCK'], ['ESC', 'BACK / CLEAR'], ['C', 'CENTER ON YOU'], ['T', 'TERRAIN'], ['D', '3D VIEW (ZOOM IN)'], ['S', 'SOUND'], ['F', 'FILTER PROFILE'], ['R', 'REPORT SIGHTING'], ['M', 'MENU'], ['P', 'POWER']];
  function op(k) {
    md.style.display = 'flex'; md.dataset.k = k;
    var b = mb; bp(700, 0.05);
    var titles = { chat: 'SPIDEY CHAT // LOCAL', arc: 'SIGHTING ARCHIVE', shr: 'SHARE LOCATION', sus: 'SUSPECT FILE', vid: 'VIDEOS', ev: 'EVENTS', hlp: 'HELP', set: 'SETTINGS', log: 'ACTIVITY LOG', sam: 'SAMSUNG EXCLUSIVE DOWNLOADS', menu: 'SPIDEY TRACKER OS' };
    mt.textContent = titles[k] || k;
    if (k === 'chat') {
      b.innerHTML = '<div id="ms"></div><div class="in"><input id="ci" maxlength="60" placeholder="TYPE MESSAGE..." autocomplete="off"><button class="b o" data-k="send">SEND</button></div>';
      cr();
    } else if (k === 'arc') {
      b.innerHTML = tk.slice().sort(function (p, q2) { return p.ago - q2.ago; }).slice(0, 12).map(function (o) {
        return '<div class="ar" data-k="go" data-i="' + tk.indexOf(o) + '"><i class="dot ' + o.t + '"></i><b>' + esc(o.n) + '</b><span>' + esc(place(o.x, o.y)) + '</span><em>' + o.ago + 'M AGO</em></div>';
      }).join('');
    } else if (k === 'shr') {
      var code = 'SPT-' + (st.px | 0).toString(16).toUpperCase() + (st.py | 0).toString(16).toUpperCase() + '-' + (st.z * 10 | 0);
      b.innerHTML = '<div class="sh"><canvas id="qr" width="25" height="25"></canvas><div><p>YOUR SHARE CODE</p><h3 id="sc">' + code + '</h3><button class="b g" data-k="cp">COPY CODE</button><p id="cs"></p><p>SHOW THIS TO FELLOW WEB HEADS.</p></div></div>';
      var q = $('#qr').getContext('2d'); var s2 = [...code].reduce(function (a, c2) { return a * 31 + c2.charCodeAt(0) | 0; }, 7) >>> 0 || 7;
      q.fillStyle = '#16358a';
      for (var yy = 0; yy < 25; yy++) for (var xx = 0; xx < 25; xx++) {
        s2 = s2 * 16807 % 2147483647; var on = s2 & 1;
        if ((xx < 8 && yy < 8) || (xx > 16 && yy < 8) || (xx < 8 && yy > 16)) {
          var X2 = xx > 16 ? xx - 18 : xx, Y2 = yy > 16 ? yy - 18 : yy;
          on = X2 >= 0 && X2 < 7 && Y2 >= 0 && Y2 < 7 && (X2 % 6 === 0 || Y2 % 6 === 0 || (X2 > 1 && X2 < 5 && Y2 > 1 && Y2 < 5));
        }
        if (on) q.fillRect(xx, yy, 1, 1);
      }
      lcd(hash8(code));
    } else if (k === 'sus') {
      var r = D.ROSTER[st.pIdx];
      b.innerHTML = '<div class="big"><span class="pf" style="--pp:' + PPF[st.pIdx] + '"></span>' +
        '<h3 style="margin:0">' + esc(r.name) + '</h3><p style="margin:.4cqw 0">' + esc(r.className) + ' / IDENTITY MATCH ' + (r.matchPercent == null ? '??' : r.matchPercent + '%') + '</p>' +
        '<p style="margin:.4cqw 0">' + r.bio.map(esc).join('<br>') + '</p>' +
        '<p style="margin:.4cqw 0">LAST KNOWN: ' + esc(r.lastKnownDistrict) + '</p>' +
        '<button class="b o" data-k="loc">LOCATE</button></div>';
      logLine('FILE ' + r.name);
    } else if (k === 'vid') {
      b.innerHTML = '<div class="ar" data-k="v0"><b>TRAILER 1</b><span>the one that started it</span><em>0:10</em></div>' +
        '<div class="ar" data-k="v1"><b>TRAILER 2</b><span>web heads assemble</span><em>0:10</em></div>' +
        '<div class="ar" data-k="v2"><b>FINAL TRAILER</b><span>one last swing</span><em>0:10</em></div>' +
        '<div class="ar" data-k="v3"><b>NED TALK: FOUNDER SPECIAL</b><span>CEO and founder, everybody</span><em>0:10</em></div>';
    } else if (k === 'ev') {
      b.innerHTML = D.EVENTS_LIST.map(function (e2, i) {
        return '<div class="ar" style="cursor:default"><i class="dot e"></i><b>' + esc(e2.name) + '</b><span>' + esc(e2.date + ' ' + e2.time + ' / ' + e2.district) + '</span>' +
          '<button class="b ' + (st.rsvp[i] ? 'g on' : 'o') + '" data-k="rsv" data-i="' + i + '">' + (st.rsvp[i] ? 'GOING' : 'RSVP') + '</button></div>' +
          '<div class="m" style="margin:0 0 1cqw">' + esc(e2.blurb) + '</div>';
      }).join('');
    } else if (k === 'hlp') {
      b.innerHTML = '<div class="kv">' + VKEYS.map(function (v) { return '<b>' + v[0] + '</b><span>' + v[1] + '</span>'; }).join('') + '</div>' +
        '<p style="margin-top:1.2cqw">RED RUMORED / GREEN CONFIRMED / BLUE EVENT. TABS: 0 RESET / S SIGHTINGS / T WEB TRACE.</p>';
    } else if (k === 'set') {
      b.innerHTML = '<div class="tgl">SOUND<button class="b ' + (st.snd ? 'g on' : 'o') + '" data-k="snd">' + (st.snd ? 'ON' : 'OFF') + '</button></div>' +
        '<div class="tgl">SCANLINES<button class="b ' + (scr.classList.contains('nolines') ? 'o' : 'g on') + '" data-k="scan">' + (scr.classList.contains('nolines') ? 'OFF' : 'ON') + '</button></div>' +
        '<div class="tgl">SAMSUNG NOTIFICATIONS<button class="b ' + (st.samOn ? 'g on' : 'o') + '" data-k="samq">' + (st.samOn ? 'ON' : 'OFF') + '</button></div>' +
        '<div class="tgl" style="margin-top:2cqw">WIPE ALL DATA<button class="b r" data-k="wipe">RESET</button></div>';
    } else if (k === 'log') {
      b.innerHTML = '<div class="m" style="background:#0d1240;color:#a6e58f;border-color:#2b5c9a;white-space:pre-wrap">' +
        (st.log.length ? st.log.map(esc).join('\n') : 'NOTHING YET. GO TOUCH SOME GRASS.') + '</div>';
    } else if (k === 'sam') {
      b.innerHTML = '<div class="big"><div class="spin"></div><h3 style="margin:0">' + esc(D.MISC.samsungDownloads.line) + '</h3>' +
        '<p style="margin:.4cqw 0">SYNC YOUR GALAXY DEVICE TO RECEIVE EXCLUSIVE SIGHTING ALERTS.</p>' +
        '<button class="b g" data-k="samq">ENABLE NOTIFICATIONS</button></div>';
    } else if (k === 'menu') {
      b.innerHTML = '<div class="mn">' +
        '<button class="b o" data-k="chat">CHAT</button><button class="b o" data-k="arc">ARCHIVE</button>' +
        '<button class="b e" data-k="shr">SHARE</button><button class="b g" data-k="rep">REPORT SIGHTING</button>' +
        '<button class="b o" data-k="vid">VIDEOS</button><button class="b e" data-k="ev">EVENTS</button>' +
        '<button class="b o" data-k="sus">SUSPECT FILE</button><button class="b o" data-k="log">ACTIVITY LOG</button>' +
        '<button class="b o" data-k="hlp">HELP</button><button class="b o" data-k="set">SETTINGS</button>' +
        '<button class="b g" data-k="sam" style="grid-column:1/3">SAMSUNG EXCLUSIVE DOWNLOADS</button></div>';
    }
  }
  function cr() {
    var m = $('#ms'); if (!m) return;
    m.innerHTML = chat.map(function (c) { return '<div class="m' + (c[0] === 'YOU' ? ' y' : '') + '"><b>' + esc(c[0]) + '</b> ' + esc(c[1]) + '</div>'; }).join('');
    m.scrollTop = 1e9;
  }
  md.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'ci') A.send(); });

  /* ---------------- video player ---------------- */
  var vpTimer = null, vpTo = null;
  function playVid(i) {
    var v = D.VIDEO_SCENES[i]; if (!v) return;
    AU.stopLoop('theme');
    mb.innerHTML = '<div class="stg"><canvas id="vp" width="480" height="320"></canvas>' +
      '<div style="display:flex;gap:1.4cqw"><button class="b o" data-k="v' + i + '">REPLAY VIDEO</button><button class="b r" data-k="vstop">STOP</button></div>' +
      '<div id="vc" style="color:#16358a;font-weight:700"></div><div style="opacity:.7">TAP TO UNMUTE IF IT IS QUIET IN HERE</div></div>';
    var cv = $('#vp'), cx = cv.getContext('2d');
    var scene = 0, nsc = v.scenes.length, t0 = Date.now();
    if (st.snd) { AU.init(); AU.startLoop('theme'); }
    logLine('PLAY ' + v.title);
    function frame() {
      var el2 = (Date.now() - t0) / 1000;
      scene = Math.min(nsc - 1, Math.floor(el2 / (v.durationMs / 1000 / nsc)));
      drawScene(cx, v.scenes[scene], el2);
      $('#vc').textContent = v.captions[Math.min(scene, v.captions.length - 1)] || '';
      if (el2 * 1000 < v.durationMs) vpTimer = requestAnimationFrame(frame);
      else { cancelAnimationFrame(vpTimer); vpTimer = null; AU.stopLoop('theme'); }
    }
    cancelAnimationFrame(vpTimer || 0); frame();
  }
  function drawScene(cx, sc, t) {
    var p = sc.palette || {}, W3 = 480, H3 = 320;
    cx.imageSmoothingEnabled = false;
    if (sc.type === 'skyline_day' || sc.type === 'skyline_night') {
      cx.fillStyle = p.sky || '#2FC1FF'; cx.fillRect(0, 0, W3, H3);
      if (sc.type === 'skyline_night') { cx.fillStyle = '#fff'; for (var i = 0; i < 60; i++) cx.fillRect((i * 97) % W3, (i * 53) % 180, 2, 2); }
      else { cx.fillStyle = p.sun || '#FFF7D6'; cx.fillRect(370, 40, 46, 46); }
      for (var b2 = 0; b2 < 14; b2++) {
        var bw = 24 + (b2 * 37) % 40, bh = 60 + (b2 * 61) % 130, bx = b2 * 36 - 10;
        cx.fillStyle = p.fg || '#101961'; cx.fillRect(bx, H3 - bh, bw, bh);
        cx.fillStyle = sc.type === 'skyline_night' ? '#ffd66b' : '#8fdcff';
        for (var wy = H3 - bh + 8; wy < H3 - 10; wy += 14) for (var wx = bx + 5; wx < bx + bw - 6; wx += 10) if ((wx * wy + b2) % 3) cx.fillRect(wx, wy, 4, 6);
      }
    } else if (sc.type === 'mask_closeup') {
      cx.fillStyle = p.bg || '#FF3B30'; cx.fillRect(0, 0, W3, H3);
      cx.fillStyle = '#101961'; cx.beginPath(); cx.moveTo(60, 320); cx.quadraticCurveTo(240, -40, 420, 320); cx.fill();
      cx.fillStyle = p.eye || '#FFFFFF';
      cx.beginPath(); cx.ellipse(170, 140, 52, 34, -0.3, 0, 7); cx.fill();
      cx.beginPath(); cx.ellipse(310, 140, 52, 34, 0.3, 0, 7); cx.fill();
      cx.strokeStyle = '#101961'; cx.lineWidth = 6;
      cx.beginPath(); cx.ellipse(170, 140, 52, 34, -0.3, 0, 7); cx.stroke();
      cx.beginPath(); cx.ellipse(310, 140, 52, 34, 0.3, 0, 7); cx.stroke();
      cx.strokeStyle = '#00000030'; cx.lineWidth = 2;
      for (var w2 = 0; w2 < 8; w2++) { cx.beginPath(); cx.moveTo(240, 0); cx.lineTo(w2 * 70 - 20, 320); cx.stroke(); }
    } else if (sc.type === 'web_lines') {
      cx.fillStyle = p.bg || '#0D1240'; cx.fillRect(0, 0, W3, H3);
      cx.strokeStyle = p.web || '#F0D8D8'; cx.lineWidth = 2;
      for (var r2 = 30; r2 < 260; r2 += 34) { cx.beginPath(); cx.arc(240, 160, r2 + Math.sin(t + r2) * 3, 0, 7); cx.stroke(); }
      for (var a2 = 0; a2 < 16; a2++) { cx.beginPath(); cx.moveTo(240, 160); cx.lineTo(240 + Math.cos(a2 * 0.3927) * 300, 160 + Math.sin(a2 * 0.3927) * 300); cx.stroke(); }
      cx.fillStyle = '#f05a55'; cx.fillRect(232, 152, 16, 16);
    } else { // nyc_streets
      cx.fillStyle = p.sky || '#FF9F45'; cx.fillRect(0, 0, W3, 190);
      cx.fillStyle = p.building || '#101961';
      for (var b3 = 0; b3 < 10; b3++) { var bw2 = 40 + (b3 * 29) % 30, bh2 = 50 + (b3 * 47) % 90; cx.fillRect(b3 * 50 - 8, 190 - bh2, bw2, bh2); }
      cx.fillStyle = p.road || '#07072C'; cx.fillRect(0, 190, W3, 130);
      cx.fillStyle = '#ffd66b'; for (var l2 = 0; l2 < 8; l2++) cx.fillRect(l2 * 64 + ((t * 60) % 64), 250, 30, 6);
      var cabX = ((t * 130) % (W3 + 120)) - 100;
      cx.fillStyle = '#f7b23f'; cx.fillRect(cabX, 196, 70, 34);
      cx.fillStyle = '#101961'; cx.fillRect(cabX + 12, 200, 20, 14);
      cx.fillStyle = '#f05a55'; cx.fillRect(20 + Math.sin(t * 3) * 8, 120, 18, 60); // spidey swing
      cx.strokeStyle = '#dfe9ff'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(28 + Math.sin(t * 3) * 8, 120); cx.lineTo(28 + Math.sin(t * 3) * 8, 60); cx.stroke();
    }
  }

  /* ---------------- easter egg ---------------- */
  var eggBusy = false;
  (function stars() {
    for (var i = 0; i < 42; i++) {
      var s2 = document.createElement('i'); s2.className = 'star';
      s2.style.left = Math.random() * 100 + '%'; s2.style.top = Math.random() * 100 + '%';
      s2.style.animationDelay = (Math.random() * 2.6) + 's';
      eggEl.appendChild(s2);
    }
  })();
  function egg() {
    if (eggBusy || !st.on) return;
    eggBusy = true; st.busy = 1; st.fol = 0; AU.stopLoop('sonar'); AU.stopLoop('theme');
    sel(null);
    var ph1 = document.createElement('div'); ph1.className = 'ph'; ph1.style.display = 'grid';
    ph1.innerHTML = '<div class="lost shk">' + D.EASTER_EGG.signalLost + '</div><div class="glitch"></div>';
    var ph2 = document.createElement('div'); ph2.className = 'ph';
    ph2.innerHTML = '<div><div class="scan">' + D.EASTER_EGG.rescanning + '</div>' +
      '<svg class="gl" viewBox="-50 -50 100 100" style="margin-top:2cqw">' +
      '<circle r="34" fill="#0d1240" stroke="#8fe3ff" stroke-width="1.4"/>' +
      '<g class="lands" fill="#2f7a5c"><ellipse cx="-8" cy="-10" rx="16" ry="10"/><ellipse cx="12" cy="4" rx="12" ry="14"/><ellipse cx="-14" cy="12" rx="9" ry="6"/><ellipse cx="18" cy="-16" rx="7" ry="5"/></g>' +
      '<circle r="40" fill="none" stroke="#8fe3ff55" stroke-dasharray="4 3"/><circle cx="44" cy="-30" r="3" fill="#55d977"/></svg></div>';
    var ph3 = document.createElement('div'); ph3.className = 'ph';
    ph3.innerHTML = '<div class="drift"></div>';
    var ph4 = document.createElement('div'); ph4.className = 'ph';
    ph4.innerHTML = '<div class="ret">' + D.EASTER_EGG.willReturn + '</div>';
    eggEl.appendChild(ph1); eggEl.appendChild(ph2); eggEl.appendChild(ph3); eggEl.appendChild(ph4);
    eggEl.style.display = 'block';
    cue('zap');
    setTimeout(function () { // rescan
      ph1.remove(); ph2.style.display = 'grid'; cue('boom');
      if (st.snd) AU.startLoop('sonar');
      setTimeout(function () { AU.stopLoop('sonar'); cue('ping'); }, 3200);
    }, 1700);
    setTimeout(function () { // drift among stars
      ph2.remove(); ph3.style.display = 'grid';
      var notes = [['E5', 0], ['G5', 0.22], ['B5', 0.44], ['A5', 0.88]];
      notes.forEach(function (n) { setTimeout(function () { var f = { 'E5': 659, 'G5': 784, 'B5': 988, 'A5': 880 }[n[0]]; bp(f, 0.3, 'triangle', 0.08); }, n[1] * 1000); });
    }, 5800);
    setTimeout(function () { // will return
      ph3.remove(); ph4.style.display = 'grid';
    }, 8500);
    setTimeout(function () { // end
      eggEl.style.display = 'none'; ph4.remove();
      eggBusy = false; st.busy = 0;
      st.eggDone = true; save('egg', true);
      cap.textContent = D.EASTER_EGG.captionAfter;
      if (st.eggCount === 0) { logLine(D.EASTER_EGG.logLine); st.eggCount = 1; }
      draw(1);
    }, 11200);
  }
  var faceClicks = [];
  function maskTap() {
    var now = Date.now();
    faceClicks = faceClicks.filter(function (t) { return now - t < 2000; });
    faceClicks.push(now); bp(880, 0.04);
    if (faceClicks.length >= 3) { faceClicks = []; egg(); }
  }
  $('.row .face').addEventListener('click', maskTap);
  $('#mask').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); maskTap(); }
  });
  $('#tom').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSuspect((st.pIdx + 1) % 3); A.sus(); }
  });
  var pingCount = 0, pingTimer = null;
  function pingPressed() {
    var o = tk[st.sel];
    if (!o) return say('NO TARGET. TAP A SPIDER FIRST.');
    var rp2 = document.createElement('div'); rp2.className = 'rp';
    rp2.style.left = o.x + 'px'; rp2.style.top = o.y + 'px'; w.appendChild(rp2);
    setTimeout(function () { rp2.remove(); }, 1300);
    // THWIP: web line shooting from YOU to the target
    if (fxg) {
      var wl = svgEl('line', { x1: UX, y1: UY, x2: o.x, y2: o.y, pathLength: 100,
        stroke: '#d6f1ff', 'stroke-width': 2, 'stroke-dasharray': 100, 'stroke-dashoffset': 100 });
      wl.style.animation = 'thwip .3s ease-out forwards';
      fxg.appendChild(wl);
      setTimeout(function () { wl.remove(); }, 900);
    }
    say('PING SENT / ' + o.n); bp(960, 0.12);
    lcd(o.h);
    setTimeout(function () {
      chat.push([o.n, RP[Math.random() * RP.length | 0]]);
      if (md.dataset.k === 'chat' && md.style.display === 'flex') cr();
      say(o.n + ' REPLIED / OPEN CHAT'); bp(820);
    }, 1600);
    // egg path: spider suspect + tracking + 5 pings
    if (D.ROSTER[st.pIdx].id === 'SPIDER_MAN' && st.fol) {
      pingCount++;
      clearTimeout(pingTimer);
      pingTimer = setTimeout(function () { pingCount = 0; }, 6000);
      if (pingCount >= 5) { pingCount = 0; egg(); }
    }
  }

  /* ---------------- actions ---------------- */
  function pf(n) { st.p = n; say('PROFILE ' + n + ' / ' + ['ALL SIGNALS', 'RUMORED ONLY', 'CONFIRMED ONLY'][n - 1]); bp(600); logLine('FILTER ' + n); }
  function onoff(k, l) { st[k] ^= 1; say(l + (st[k] ? ' ON' : ' OFF')); bp(st[k] ? 800 : 400); }
  var A = {
    p1: function () { pf(1); }, p2: function () { pf(2); }, p3: function () { pf(3); },
    a1: function () { onoff('a1', 'CONFIRMED ALERTS'); },
    a2: function () { onoff('a2', 'RUMORED ALERTS'); },
    snd: function () {
      st.snd ^= 1; save('snd', st.snd); AU.setMuted(!st.snd);
      say('SOUND ' + (st.snd ? 'ON' : 'OFF')); if (st.snd) { AU.init(); bp(700); }
    },
    scan: function () { scr.classList.toggle('nolines'); op('set'); },
    samq: function () {
      st.samOn = !st.samOn; save('samOn', st.samOn);
      st.samAsked = true; save('samAsked', true);
      chz.style.display = 'none';
      toast(st.samOn ? 'SAMSUNG EXCLUSIVE NOTIFICATIONS ON' : 'NOTIFICATIONS OFF', 1);
      if (md.style.display === 'flex') op('set');
    },
    wipe: function () {
      ['snd', 'suspect', 'egg', 'samAsked', 'samOn', 'bat', 'rsvp', 'log'].forEach(function (k) { store.removeItem('spideyTracker.' + k); });
      location.reload();
    },
    ter: function () { st.ter ^= 1; w.classList.toggle('ter', !!st.ter); say('TERRAIN SCAN ' + (st.ter ? 'ON' : 'OFF')); bp(500); },
    d3: function () {
      if (!st.d3 && st.z < 1.6) return say('ZOOM IN TO ENABLE 3D VIEW');
      st.d3 ^= 1; T(); say('3D VIEW ' + (st.d3 ? 'ON' : 'OFF')); bp(600);
    },
    ctr: function () { st.fol = 0; fly(UX, UY, 1); say('RECENTERED ON YOUR LOCATION'); bp(760); },
    zi: function () { zoom(1.3); }, zo: function () { zoom(1 / 1.3); },
    chat: function () { op('chat'); }, arc: function () { op('arc'); }, shr: function () { op('shr'); },
    sus: function () { op('sus'); }, vid: function () { op('vid'); }, ev: function () { op('ev'); },
    hlp: function () { op('hlp'); }, set: function () { op('set'); }, log: function () { op('log'); },
    sam: function () { op('sam'); }, menu: function () { op('menu'); },
    cl: function () { md.style.display = 'none'; if (vpTimer) { cancelAnimationFrame(vpTimer); vpTimer = null; } AU.stopLoop('theme'); },
    rep: function () {
      A.cl();
      st.rep ^= 1;
      map.classList.toggle('rep', !!st.rep);
      if (st.rep) say('TAP MAP TO PLACE PIN', 3000);
      else { chz.style.display = 'none'; }
      draw(1);
    },
    rcg: function () { reportDone('g'); },
    rcr: function () { reportDone('r'); },
    rcx: function () { chz.style.display = 'none'; st.rep = 0; map.classList.remove('rep'); draw(1); },
    t0: function () { Object.assign(st, { S: 1, T: 1, p: 1, sel: null, fol: 0, ter: 0, d3: 0 }); w.classList.remove('ter'); AU.stopLoop('sonar'); lcd('00000000'); fly(UX, UY, 1); say('LAYERS RESET'); bp(440); },
    tS: function () { onoff('S', 'SIGHTINGS'); },
    tT: function () { onoff('T', 'WEB TRACE'); },
    ping: pingPressed,
    fol: function () {
      if (st.sel == null) return say('NO TARGET. TAP A SPIDER FIRST.');
      st.fol ^= 1;
      if (st.fol) {
        var o = tk[st.sel]; fly(o.x, o.y); cue('lock'); if (st.snd) AU.startLoop('sonar'); scr.classList.add('trk'); logLine('TRACK ' + o.n);
        clearRing();
        var ring = document.createElement('div'); ring.className = 'ring';
        ring.style.left = o.x + 'px'; ring.style.top = o.y + 'px';
        w.appendChild(ring); st.ringEl = ring;
      }
      else { AU.stopLoop('sonar'); scr.classList.remove('trk'); clearRing(); }
      say(st.fol ? 'TRACKING ' + tk[st.sel].n : 'TRACKING OFF');
      draw(1);
    },
    x: function () { sel(null); },
    go: function (el) { var i = +el.dataset.i, o = tk[i]; A.cl(); sel(i); fly(o.x, o.y, 1.6); },
    loc: function () {
      var r = D.ROSTER[st.pIdx];
      var d2 = D.districtById(r.lastKnownDistrict);
      if (!d2) {
        D.DISTRICTS.forEach(function (x2) { if (x2.label === r.lastKnownDistrict) d2 = x2; });
      }
      A.cl();
      if (d2) fly(d2.x, d2.y, 1.6);
      say('LAST KNOWN / ' + (d2 ? d2.label : r.lastKnownDistrict));
    },
    send: function () {
      var i = $('#ci'), v = i.value.trim(); if (!v) return;
      chat.push(['YOU', v]); i.value = ''; cr(); bp(700, 0.04);
      logLine('CHAT: ' + v.slice(0, 30));
      setTimeout(function () {
        chat.push([tk[Math.random() * tk.length | 0].n, RP[Math.random() * RP.length | 0]]);
        if (md.dataset.k === 'chat' && md.style.display === 'flex') cr(); bp(820);
      }, 900 + Math.random() * 900);
    },
    cp: function () {
      var c = $('#sc').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject())
        .then(function () { $('#cs').textContent = 'COPIED TO CLIPBOARD'; }, function () { $('#cs').textContent = 'SELECT CODE TO COPY'; });
    },
    rsv: function (el) {
      var i = +el.dataset.i;
      st.rsvp[i] = !st.rsvp[i]; save('rsvp', st.rsvp);
      toast(st.rsvp[i] ? 'RSVP YES / SEE YOU THERE' : 'RSVP CANCELED');
      op('ev');
    },
    v0: function () { playVid(0); }, v1: function () { playVid(1); }, v2: function () { playVid(2); }, v3: function () { playVid(3); },
    vstop: function () { if (vpTimer) { cancelAnimationFrame(vpTimer); vpTimer = null; } AU.stopLoop('theme'); op('vid'); }
  };
  scr.addEventListener('click', function (e) {
    var el = e.target.closest('[data-k]');
    if (el && A[el.dataset.k]) A[el.dataset.k](el);
  });

  /* ---------------- boot / power ---------------- */
  var bootTimers = [];
  function clearBoot() { bootTimers.forEach(clearTimeout); bootTimers = []; }
  function powerOn() {
    st.on = 0; st.busy = 1;
    off.style.display = 'none'; eggEl.style.display = 'none';
    bt.style.display = 'grid'; bt.style.opacity = '1';
    $('.pw').classList.add('on');
    scr.classList.add('pwr');
    cue('powerup');
    var bl = bt.querySelector('.bl');
    var logo = bt.querySelector('.logo'); var bar = bt.querySelector('.bar'); var cal = bt.querySelector('.cal');
    bl.textContent = ''; logo.style.visibility = 'hidden'; bar.style.visibility = 'hidden'; cal.style.visibility = 'hidden';
    var bi = bar.querySelector('i'); bi.style.animation = 'none'; void bi.offsetWidth; bi.style.animation = '';
    D.BOOT_LINES.forEach(function (line, i) {
      bootTimers.push(setTimeout(function () { bl.textContent += line + '\n'; cue('bootline'); }, 300 + i * 260));
    });
    var tLogo = 300 + D.BOOT_LINES.length * 260 + 200;
    bootTimers.push(setTimeout(function () {
      bl.textContent = ''; logo.style.visibility = 'visible'; bar.style.visibility = 'visible';
      cue('jingle');
    }, tLogo));
    bootTimers.push(setTimeout(finishBoot, tLogo + 1500));
    // skip
    var skip = function () {
      if (Date.now() - bootT0 < 400) return;
      clearBoot(); finishBoot();
      window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip);
    };
    var bootT0 = Date.now();
    window.addEventListener('keydown', skip); window.addEventListener('pointerdown', skip);
  }
  function finishBoot() {
    clearBoot();
    if (st.on) return;
    st.on = 1; st.busy = 0;
    bt.style.opacity = '0';
    scr.classList.add('crt');
    setTimeout(function () { scr.classList.remove('crt'); }, 520);
    setTimeout(function () { bt.style.display = 'none'; }, 550);
    draw(1);
    logLine('BOOT OK');
    if (!st.samAsked) {
      setTimeout(function () {
        if (!st.on || st.samAsked) return;
        st.samAsked = true; save('samAsked', true);
        chz.style.display = 'block';
        chz.innerHTML = '<div class="msg">' + esc(D.MISC.samsungPopup.text) + '</div>' +
          '<div class="opts"><button class="b g" data-k="samq">YES</button><button class="b r" data-k="sno">NO</button></div>';
      }, 8000);
    }
  }
  A.sno = function () { chz.style.display = 'none'; st.samOn = false; save('samOn', false); say('MAYBE LATER.'); };
  function powerOff() {
    st.on = 0; st.busy = 1; st.fol = 0;
    if (vpTimer) { cancelAnimationFrame(vpTimer); vpTimer = null; }
    AU.stopLoop('sonar'); AU.stopLoop('theme');
    md.style.display = 'none'; chz.style.display = 'none'; tc.style.display = 'none';
    off.style.display = 'grid'; $('.pw').classList.remove('on');
    scr.classList.remove('trk'); scr.classList.remove('pwr'); clearRing();
    cue('powerdown');
    lcd('00000000');
  }
  $('.pw').addEventListener('click', function () {
    if (st.on) powerOff();
    else powerOn();
  });
  A.pw = function () { $('.pw').click(); };

  /* ---------------- keyboard ---------------- */
  window.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    var k = e.key;
    var pan = 60 / st.z;
    if (k === 'ArrowLeft') { st.px -= pan; cl(); T(); }
    else if (k === 'ArrowRight') { st.px += pan; cl(); T(); }
    else if (k === 'ArrowUp') { st.py -= pan; cl(); T(); }
    else if (k === 'ArrowDown') { st.py += pan; cl(); T(); }
    else if (k === '+' || k === '=') zoom(1.25);
    else if (k === '-' || k === '_') zoom(1 / 1.25);
    else if (k === 'Enter' || k === ' ') { if (md.style.display === 'flex') { var f = mb.querySelector('[data-k]'); if (f) f.click(); } else if (st.sel != null) A.fol(); }
    else if (k === 'Escape' || k === 'Backspace') { if (md.style.display === 'flex') A.cl(); else if (chz.style.display === 'block') A.rcx(); else sel(null); }
    else if (k === 'c' || k === 'C') A.ctr();
    else if (k === 't' || k === 'T') A.ter();
    else if (k === 'd' || k === 'D') A.d3();
    else if (k === 's' || k === 'S') A.snd();
    else if (k === 'f' || k === 'F') pf(st.p % 3 + 1);
    else if (k === 'r' || k === 'R') A.rep();
    else if (k === 'm' || k === 'M') { if (md.style.display === 'flex' && md.dataset.k === 'menu') A.cl(); else A.menu(); }
    else if (k === 'h' || k === 'H') A.hlp();
    else if (k === 'l' || k === 'L') A.log();
    else if (k === 'p' || k === 'P') A.pw();
    else if (k === '1') setSuspect(0);
    else if (k === '2') setSuspect(1);
    else if (k === '3') setSuspect(2);
    else return;
    if (k !== 'Enter' && k !== ' ' && k.indexOf('Arrow') !== 0) bp(500, 0.03);
    e.preventDefault();
  });

  /* ---------------- attract mode ----------------
     After 45s of no input, drift the camera between hot zones,
     landmarks and clusters like a store demo. Any input wakes it. */
  var idleT = null, attract = false, attractStep = 0, attractTimer = null;
  function wake() {
    if (attract) {
      attract = false;
      clearTimeout(attractTimer);
      fly(G.userPos.x, G.userPos.y, 1);
    }
    clearTimeout(idleT);
    idleT = setTimeout(startAttract, 45000);
  }
  function startAttract() {
    if (!st.on || st.busy || md.style.display === 'flex' || st.sel != null) { wake(); return; }
    attract = true; attractStep = 0;
    logLine('ATTRACT MODE');
    (function next() {
      if (!attract) return;
      var spots = [];
      G.hotZones.forEach(function (z) { spots.push([(z.pts[0][0] + z.pts[2][0]) / 2, (z.pts[0][1] + z.pts[2][1]) / 2]); });
      var emp = D.districtById('EMPIRE_STATE'); if (emp) spots.push([emp.x, emp.y]);
      var fin = D.districtById('FIN_DIST'); if (fin) spots.push([fin.x, fin.y]);
      var s2 = spots[attractStep % spots.length];
      attractStep++;
      fly(s2[0], s2[1], 1.3);
      attractTimer = setTimeout(next, 9000);
    })();
  }
  ['pointerdown', 'pointermove', 'wheel', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, wake, { passive: true });
  });

  /* ---------------- start ---------------- */
  console.log('%c\n' +
    '  ;;;;        ;;;;  \n' +
    ' ;;;;;;      ;;;;;; \n' +
    '  ;;;;;; ;;;; ;;;;  \n' +
    '   ;;;;;;;;;;;;;;   \n' +
    '  ;;;;;;;;;;;;;;;;  \n' +
    '   ;;;;;;;;;;;;;;   \n' +
    '  ;;;;  ;;;;  ;;;;  \n' +
    '  ;;;;  ;;;;  ;;;;  \n' +
    '  SPIDEY TRACKER // REHM EDITION\n' +
    '  ps. if you are flash: hi flash. you are not spider-man.\n',
    'color:#f05a55;font-weight:bold');
  document.querySelector('.tom').addEventListener('click', function () { setSuspect((st.pIdx + 1) % 3); A.sus(); });
  setSuspect(st.pIdx);
  T(); draw(1);
  window.addEventListener('resize', T);
  setTimeout(powerOn, 350);
  setTimeout(spawnTick, 6000);
  logLine('SESSION START');

  /* ---------------- debug handle for QA ---------------- */
  ST.gui = {
    state: function () {
      return {
        on: st.on, busy: st.busy, sel: st.sel, selName: st.sel != null ? tk[st.sel].n : null,
        fol: st.fol, p: st.p, S: st.S, T: st.T, ter: st.ter, d3: st.d3, rep: st.rep,
        tokens: tk.length, chat: chat.length, feed: feed.length,
        sound: st.snd, muted: AU.isMuted(), samsung: { asked: st.samAsked, on: st.samOn },
        eggDone: st.eggDone, suspect: st.pIdx, suspectName: D.ROSTER[st.pIdx].name,
        modal: md.style.display === 'flex' ? md.dataset.k : null, bat: Math.round(st.bat),
        log: st.log.slice(0, 30), caption: cap.textContent
      };
    },
    actions: A
  };
})();
