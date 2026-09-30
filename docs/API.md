# SPIDEY TRACKER - Platform API (B1 scaffolding)

Precise reference of everything exported by `js/engine.js` and `js/ui.js`, plus the
page shell contract. B2 (data/audio), B3 (map), B4 (interaction) build against this
document. If code and this file disagree, the code wins and this file must be fixed.

Owner of these files: B1 (scaffolder). `js/app.js` currently contains a TEMP DEMO
and is replaced wholesale by B4.

## 1. Page shell

`index.html` loads scripts in EXACT order: `js/data.js`, `js/audio.js`, `js/engine.js`,
`js/map.js`, `js/ui.js`, `js/app.js`. No modules, no inline JS. Shared namespace:
`window.ST = { data, audio, engine, map, ui, app }`.

DOM ids B1 owns and other builders may rely on:

| id         | what                                                    |
|------------|---------------------------------------------------------|
| `device`   | device body root. Classes: `tracking`, `screen-on`, `screen-off`, `no-scanlines` |
| `power`    | power slider `<button role="switch" aria-checked>`. Clicking it emits intent `power`. |
| `sensor`   | sensor dot; glows teal via `.device.tracking` CSS       |
| `screen`   | the canvas (400x400 logical)                            |
| `scanlines`| scanline overlay div (hidden by `.device.no-scanlines`) |

CSS files: `css/style.css` (backdrop, device chrome, overlays, power slider),
`css/font.css` (Press Start 2P 400, Silkscreen 400 + 700, base64 woff2 data URIs,
no external URLs, verified). Fallback stack everywhere ends in `monospace`.

## 2. ST.engine

Canvas: logical 400x400. Backing store is `400 * scale` where
`scale = clamp(1, round(devicePixelRatio), 4)` (integer only, re-applied on resize).
`ctx` transform is preset to that scale; `imageSmoothingEnabled = false` is re-set
every frame. All drawing coordinates are logical (0..400).

The loop starts after `document.fonts.ready` or a 1500 ms timeout, whichever first.
`visibilitychange` pauses/resumes it.

### 2.1 Lifecycle and time

```js
ST.engine.boot()                    // auto-run on DOMContentLoaded; do not call again
ST.engine.ctx()        -> CanvasRenderingContext2D
ST.engine.canvas()     -> HTMLCanvasElement
ST.engine.time()       -> seconds since start (pauses excluded, float)
ST.engine.start() / .pause() / .resume() / .isRunning()
ST.engine.screenOn()   -> bool       // see setScreenOn below
```

### 2.2 Frame callbacks and layers

```js
var unsub = ST.engine.onFrame(function (t, dt) { ... });   // t seconds, dt seconds (clamped <= 0.1)
unsub();
```

Layer stack (draw order: ascending z, then insertion order):

```js
var layer = ST.engine.addLayer({ id: 'main', z: 10, draw: function (ctx, t, dt) {} });
ST.engine.removeLayer('main');        // by id or by layer object
ST.engine.layers                      // the live array (read-only by convention)
```

Full redraw every frame is fine at 400x400 (SPEC 13). Draw back to front; later
layers draw on top. The TEMP DEMO registers one layer id `'demo'` at z 10; B4
replaces the whole file.

### 2.3 Intent bus

Every input funnels into `ST.engine.intent(name, data)`:

```js
ST.engine.intent('ok', { via: 'key' });
var unsub = ST.engine.onIntent(function (name, data) { ... });
```

Intent names (the complete set; unknown names are ignored):

```
up  down  left  right  ok  back  zoomin  zoomout
menu  sound  help  center  global  filters  power
select1  select2  select3      // 1/2/3 keys: rail portraits (SPEC 11)
```

Keyboard map (SPEC 11, bound by the engine): arrows -> up/down/left/right,
Enter/Space -> ok, Esc/Backspace -> back, +/- (and =/_) -> zoomin/zoomout,
C -> center, G -> global, F -> filters, S -> sound, M -> menu, H or ? -> help,
P -> power, 1/2/3 -> select1/2/3, Tab/Shift+Tab cycles keyboard focus
(preventDefault is called on Tab and all mapped keys).

Arrows ALSO move the keyboard focus among focusable regions (2.5) before the
intent fires; B4 can call `ST.engine.setFocus(null)` etc. if it needs to own focus.

Gamepad: buttons 12/13/14/15 (dpad) -> up/down/left/right, button 0 -> ok,
button 1 -> back. Edge-triggered, polled each frame; absent gamepads are ignored.

The DOM power slider click emits `intent('power', { via: 'slider' })`.

### 2.4 Pointer events

```js
var unsub = ST.engine.onPointer(function (type, x, y, nativeEvent) { ... });
// type: 'down' | 'move' | 'up'; x/y logical 0..400; works for mouse AND touch
```

B3 uses this for map drag. Canvas has `touch-action: none`.

### 2.5 Hit regions

```js
var reg = ST.engine.addRegion({
  id: 'pin3',                    // required, unique (removeRegion by id)
  x: 100, y: 120, w: 12, h: 12,  // logical rect
  z: 5,                          // higher z hit-tested first (default 0)
  cursor: 'pointer',             // CSS cursor while hovered (default 'pointer' if onClick)
  focusable: true,               // participates in keyboard focus (default false)
  enabled: true,                 // disabled regions ignore hover/click (default true)
  onClick: function (pt) {},     // pt = { x, y } logical; fired on click/tap or Enter
  onHover: function (bool) {},   // enter/leave
  onPress: function (bool, pt) {},  // pointer down/up inside (for pressed visuals)
  onFocus: function (bool) {}    // keyboard focus gained/lost
});
ST.engine.removeRegion('pin3');
ST.engine.regionsAt(x, y)   -> array of regions under the point, topmost first
ST.engine.hover()           -> region currently hovered or null
ST.engine.focused()         -> region currently focused or null
ST.engine.focusRect()       -> { x, y, w, h } of focused region or null
ST.engine.setFocus(reg)     // reg or null; fires onFocus callbacks
ST.engine.cycleFocus(dir)   // dir +1/-1 spatial (row bands by y, then x)
ST.engine.moveFocus(dx, dy) // nearest focusable in that direction
ST.engine.activateFocus()   // fire focused region's onClick({x,y}, {viaKeyboard:true})
```

Click semantics: mousedown sets press + focus (if focusable); mouseup inside the
same region fires onClick. Touch taps behave the same. When the screen is off
(`setScreenOn(false)`) regions ignore pointer input.

`activateFocus` is guarded against self-recursion (a focusable OK key activating
itself cannot loop; it simply runs its own onClick once).

### 2.6 Draw helpers

All helpers draw on the live ctx at logical coordinates.

```js
ST.engine.text(str, x, y, opts)
// opts: font 'title' | 'label' | 'small' | 'tiny' (default 'small'),
//       color (default #FFFFFF), align 'left'|'center'|'right' (default left),
//       baseline (default 'top'), alpha 0..1, px (override point size).
// FONTS: title = 13px "Press Start 2P", lh 13
//        label = 700 10px "Silkscreen", lh 10
//        small = 8px "Silkscreen",     lh 8
//        tiny  = 6px "Silkscreen",     lh 6

ST.engine.textWidth(str, fontName, px)   // measure with the same font setup

ST.engine.sevenSeg(value, x, y, size, opts)
// value: string with 0-9, ':', '.', '-', ' ' (e.g. "12:34", "0.56")
// size: digit height in px (thickness = max(2, size/9), digit width = size*0.55)
// opts: color (default white), colonBlink (1 Hz, starts on), dim
// returns total width drawn (px) - handy for centering

ST.engine.sprite(grid, palette, x, y, scale)
// grid: array of equal-length strings (' ' and '.' transparent), palette maps
// char -> '#RRGGBB'. ALSO accepts data.js objects: { rows: [...], legend: {...} }
// (legend values may be null). Returns { w, h } drawn size.

ST.engine.rect(x, y, w, h, color, alpha)          // snapped fill

ST.engine.steppedPath(x, y, w, h, step)           // chamfered rect path on ctx

ST.engine.panel(x, y, w, h, opts)
// SPEC 8 pixel panel: opts.fill (default #0D1240), opts.border (default #00C8FF),
// 2px border, stepped corners (opts.step default 4), opts.title -> title strip
// (14px tall, #101961 fill, centered small white text) + opts.titleFont/Color/Fill.

ST.engine.bar(x, y, w, h, opts)                   // alias: roundedBar
// chamfered bar: opts.fill, opts.border, opts.borderWidth, opts.step (default 2)

ST.engine.focusRing(x, y, w, h, t)
// 2px dashed white ring with a slow animated dash crawl; pass t or omit for clock
```

### 2.7 Device chrome toggles

```js
ST.engine.setGlow(bool)      // .device.tracking -> sensor teal glow
ST.engine.setSensor(bool)    // alias of setGlow
ST.engine.setScanlines(bool) // .device.no-scanlines hides the overlay
ST.engine.setScreenOn(bool)  // .device.screen-on/.screen-off; when off the loop
                             // paints #020409 and regions ignore input; also
                             // syncs the power slider aria-checked
```

## 3. ST.ui

Stateless widget draws: they take a state object and draw; no timers, no app
logic. Call them from a layer every frame. `ctx` is passed but currently equals
the engine ctx.

### 3.1 Palette and layout constants

```js
ST.ui.P    // SPEC 3 palette object. At load time ui.js MERGES ST.data.PALETTE
           // over its own defaults, so B2's pinned values win. Extra ui-only
           // keys: CYAN, CYAN_DEEP (visible key-border cyan), MAP_BLOCK_LT,
           // PANEL_NAVY, WATER, BACKDROP.

ST.ui.L    // every SPEC 5 region (logical px). See table below.
```

Layout constants table:

| key | value | meaning |
|-----|-------|---------|
| `screen` | 0,0,400,400 | full screen |
| `innerFrame` | 3,3,394,394 | 2px FRAME_NAVY frame |
| `titleBar` | 3,3,394,14 | wordmark strip (y 2..16) |
| `mapPanel` | 6,16,314,276 | spec map rect (x 6..320) |
| `mapContent` | 52,16,268,276 | visible map, right of the rail |
| `radar` | 268,240,44,44 | web radar slot (B3 fills) |
| `rail` | 6,16,46,276 | left rail |
| `rightCol` | 324,16,68,246 | right column |
| `iconRow` | y 20, xs [332,352,372], 12px | heart / clock / mail icons |
| `microCaption` | 328,38 | SCANNING + dots |
| `greenBand` | 324,57,68,10 | green status band |
| `digits` | 328,74, size 18 | seven-segment clock |
| `distValue` | cx 358, y 96 | distance value |
| `banner` | 324,116,68,18 | TRACKING / STANDBY |
| `pinkBars` | 328,142,60x4, gap 3 | two signal bars |
| `dataRows` | 328,186, pitch 18 | DIST/BRG/SIG/CONF rows |
| `divider` | 56,286,112,6 | green divider bar |
| `bottomBand` | 3,292,394,100 | bottom band |
| `strips.a` | 10,300,74,22 REPORT | white strip |
| `strips.b` | 10,328,74,22 WEB WATCH | pink strip |
| `battery` | x 96, ys [306,326,346], wMax 80, h 14 | three bars |
| `listBars` | left 184x44, right 232x44, rows y 302/340 h 28 | CENTER/GLOBAL/FILTERS/SOUND |
| `keyGrid` | cols [312,340,368], rows [300,340], key 24x36, gap 4 | 2x3 D-pad |
| `keyGrid.ids` | `[[focusPrev, zoomIn, ok], [focusNext, zoomOut, back]]` | key ids |
| `portraits` | x 11, ys [128,176,224], 36x36, gap 12 | rail portraits |
| `ticks` | x 12, w 28, ys [22,28,34,40] | signal ticks |

### 3.2 Built-in pixel art

```js
ST.ui.SPIDER             // 11x8 red spider glyph (title bar; data.js SPIDER_GLYPH wins if present)
ST.ui.PORTRAITS          // { spider, flash, harrington } 12x12 placeholder grids
ST.ui.PORTRAIT_PALETTE   // palette for the placeholder grids
ST.ui.ICONS              // { heart, clock, mail } 12x12 white grids
ST.ui.KEY_GLYPHS         // { up, down, zoomIn, zoomOut, back } 7x6 white grids
ST.ui.OK_GLYPH           // 7x5 dark spider for the OK key
```

### 3.3 Widget functions

```js
ST.ui.drawScreenBase(c)                  // SCREEN_BG fill + 2px inner frame
ST.ui.drawTitleBar(c, t)                 // centered SPIDER [spider] TRACER
ST.ui.drawLeftRail(c, state)
//   state: { portraits: [grid12x12 | {rows,legend}] (default built-ins or data.js),
//            selected: 0..2, ticks: 0..4 }
ST.ui.drawRightColumn(c, state)
//   state: { t, clock: 'HH:MM', distMiles, tracking: bool, signalA/B: 0..1,
//            hoverIcon: -1..2, rows: [{label, value, highlight}] }
ST.ui.drawBottomBand(c, state)           // calls the four below
ST.ui.drawStrips(c, state)               // { hoverId, pressedId }
ST.ui.drawBattery(c, state)              // { t, batteryPct }  // <20% blinks red on bar 3
ST.ui.drawListBars(c, state)             // { hoverId, pressedId, soundOn }
ST.ui.drawKeyGrid(c, state)
//   state: { focusId (key region id or null), pressedId, hoverId, highlightOk }
ST.ui.drawMapPanelFrame(c)               // navy ground + 1px STREET border + PLACEHOLDER
                                         // street grid; B3 draws the real map over/instead
ST.ui.drawDivider(c)                     // green divider bar
ST.ui.drawPopupFrame(c, rect, title)     // SPEC 8 panel frame for B4 overlays
ST.ui.drawToasts(c, toasts, t)           // toasts: [{ text, born, life }] (seconds)
ST.ui.drawFocusRing(c, rect, t)          // engine.focusRing wrapper
```

Widget ids used by hover/pressed/focus states (B4 keeps using these):
`report`, `webwatch`, `center`, `global`, `filters`, `sound`, and key ids
`focusPrev`, `zoomIn`, `ok`, `focusNext`, `zoomOut`, `back` (the TEMP DEMO
registers hit regions `key_<id>` plus `portrait0..2` and `icon0..2`).

## 4. Notes and gotchas for B2/B3/B4

1. **Palette source of truth is `ST.data.PALETTE`** (B2). `ST.ui.P` mirrors it at
   load (ui.js loads after data.js). Pinned SCREEN_BG is currently `#00C8FF`.
   `ST.ui.P.CYAN_DEEP` (#0898C8) exists because pure cyan borders on the cyan
   background are invisible.
2. **engine.sprite accepts both sprite formats** (plain rows+palette and the
   data.js `{ rows, legend }` objects). Legend values that are not color strings
   are skipped.
3. **The screen-off state** (`setScreenOn(false)`) paints near-black and freezes
   pointer regions; layers are NOT drawn while off. B4's boot sequence draws its
   own content while `screenOn` is true (call `setScreenOn(true)` at power-on).
4. **The power slider** already emits intent `power`. The TEMP DEMO handles it by
   toggling the screen; B4 replaces that handler (boot sequence, SPEC 8.1).
5. **Focus + arrows**: the engine moves keyboard focus on arrow keys AND emits
   the intent. If B4 needs arrows for something else spatial (map crosshair),
   it can ignore focus or set `focusable: false` when registering regions.
6. **Toasts**: manage the queue (push/prune) in app code; `drawToasts` only draws
   entries whose `t - born` is within `[0, life]`, sliding in over 250 ms and
   fading over the last 500 ms.
7. **Map panel**: `drawMapPanelFrame` is a placeholder (navy + simple street
   grid). B3 should draw its real map inside `ST.ui.L.mapContent` (52,16,268,276)
   or replace the call entirely; the left rail draws ON TOP of x 6..52.
8. **No allocations rule of thumb** (SPEC 13): widget draws reuse the state you
   pass; avoid building big arrays per frame in hot paths.
9. All files are ASCII-only, no em/en-dashes anywhere. Keep it that way.

## map.js API (B3)

`ST.map` owns the map panel: camera, city + global renderers, pins, web radar
(widget + fullscreen), coordinate mapping and distance math. It loads after
`engine.js` and before `ui.js` (index.html order), and works with or without
`ui.js` loaded: layout constants fall back to the same values
(map rect 52,16,268,276; radar slot 268,240,44,44).

### Camera

```js
ST.map.cam                       // { x, y, zoom, mode } - THE camera
ST.map.MAP_RECT                  // { x:52, y:16, w:268, h:276 } fallback rect
ST.map.RADAR_RECT                // { x:268, y:240, w:44, h:44 } radar slot
```

`cam.x` / `cam.y` are map-space coords of the view CENTER: city space is the
900x900 `ST.data.CITY_GEOMETRY` canvas, global space is 268x134 world units
(48x24 world cells, 2:1). `zoom` snaps to `[1, 1.6, 2.4]` in city mode and
`[1, 2]` in global mode. Panning is clamped to the world edges. Mutating
`cam` directly is safe; the next draw clamps it.

```js
ST.map.setMode('city' | 'global')   // 400 ms alpha crossfade (both worlds draw)
ST.map.getMode()                    // -> cam.mode
ST.map.fadeProgress()               // -> 0..1 during a fade, 1 when idle
ST.map.center(target, zoom)         // eased (~450 ms) move; target = {x, y} in
                                    //   current map space; omit for the mode's
                                    //   home (user dot in city, world center in
                                    //   global); zoom snaps to the level list
ST.map.centerOnUser()               // center(null, 1)
ST.map.setZoom(z, anchorPx?, anchorPy?)  // instant zoom, optional screen anchor
ST.map.zoomIn() / .zoomOut()        // one level, short eased tween
ST.map.zoomIndex() / .zoomLevels(mode?)  // current index / copy of the list
```

### Draw functions (call every frame from a layer)

All take the live engine ctx. `sim` is the app state object; every field is
optional:

```js
sim.rect        {x,y,w,h}  viewport override (default ST.ui.L.mapContent)
sim.pins        [{id, type:'CONFIRMED'|'RUMORED'|'EVENT', x, y, spawnT,
                  reporterHandle}]   x/y in city px; spawnT = seconds on the
                  engine clock (age < 0.4 s scale-in + ripple ring)
sim.selectedId | sim.selected   selected pin (id or object)
sim.hoverId    | sim.hoverPin   hovered pin (white outline + handle tooltip)
sim.filter     'ALL' | 'CONFIRMED' | 'RUMORED'   (EVENT pins always pass)
sim.t          time override (seconds); default ST.engine.time()
sim.userPos    {x,y} override of the YOU dot
```

```js
ST.map.drawCity(ctx, sim)    // navy ground, water + shoreline, 2px streets,
                             // inset city blocks, 3 park polygons, 2 salmon
                             // hot zones (alpha 0.7..1.0, 4 s pulse), district
                             // labels (white 60%, overlap-skipped), white
                             // landmark tower at EMPIRE STATE, YOU dot,
                             // "MAP DATA 2028" at 30% bottom-left
ST.map.drawGlobal(ctx, sim)  // WORLD_MAP bitmap scaled into a centered 2:1
                             // sub-rect on navy water, country labels
ST.map.drawPins(ctx, pins, sim)  // mask badges (MASK_SPRITE with a real hex
                             // substituted for the 'P' legend value:
                             // CONFIRMED GREEN_BAR, RUMORED RED_PIN, EVENT an
                             // 8x8 white/blue star). RUMORED blinks 0.8 Hz.
                             // Selected pin: corner brackets + bounce +
                             // white 30% crosshair to the map edges, drawn
                             // last. Hovered: 1px white outline.
ST.map.draw(ctx, sim)        // convenience: drawCity + drawGlobal + drawPins
ST.map.drawRadar(ctx, rect, sim)  // 44x44 web radar: 60% navy fill, 1px cyan
                             // border, 3 web rings + 8 spiral spokes, sweep
                             // 360 deg / 3 s, up to 4 blips (nearest pins,
                             // flash as the sweep passes their bearing)
ST.map.drawRadarFS(ctx, sim) // 200x200 centered fullscreen radar: 4 range
                             // rings, 12 spokes, sweep, blips with 7px
                             // handle labels
```

Performance: the static city (water, streets, blocks, parks, landmark) is
pre-rendered once to a 900x900 offscreen, hot zones to a second offscreen
(pulsed per frame via globalAlpha), and the world bitmap to a 576x288 offscreen
(12 px per cell). Per frame is 1-2 `drawImage` calls plus the dynamic layers.
`imageSmoothingEnabled` is forced false; no per-frame allocations in hot paths.

### District labels (SPEC 6.1 minimum)

At the lowest city zoom (1x) the label pass pads its cull rect and clamps the
label boxes of nearby off-view districts to the map edges, so at least 6 of the
10 canon districts are visible at the default zoom (the anchors span ~800x476
world px, so no 268x276 window at 1x can hold 6 of them in place). Higher
zooms draw in-place labels only.

```js
ST.map.labelLayout()   // district labels placed by the last drawCity frame:
                       // [{ id, label, x, y, px, clamped }] with x/y the label
                       // box origin in logical px; clamped = true when the
                       // box was pulled to a map edge for an off-view district
```

### Coordinates, hit-testing, projection

```js
ST.map.screenToMap(px, py)   // -> { x, y, mode }  (screen/logical -> map space)
ST.map.mapToScreen(mx, my)   // -> { x, y }        (map space -> logical)
ST.map.hitPin(px, py, pins)  // nearest pin within 6 px of the badge (anchor =
                             //   tip, 5 px above the map point), honors cam
                             //   and mode; returns the pin or null
ST.map.cityToWorld(x, y)     // -> { x, y } global-space point for a city point
ST.map.worldSize()           // -> { w: 268, h: 134 }
```

`cityToWorld` projection (deterministic, no randomness): find the nearest
`ST.data.DISTRICTS` entry by squared euclidean distance on the 900x900 canvas;
map district index i to `WORLD_MAP.labels[i % 10]` (1:1, in order):
HOBOKEN->USA, CHELSEA->BRAZIL, EMPIRE_STATE->UK, FLATIRON->FRANCE,
E_VILLAGE->EGYPT, TRIBECA->NIGERIA, CHINATOWN->INDIA, FIN_DIST->CHINA,
DUMBO->JAPAN, WILLIAMSBURG->AUSTRALIA. The label cell center maps to
`((c + 0.5) / 48 * 268, (r + 0.5) / 24 * 134)` world px; a hash jitter of the
pin's city coords (magnitude <= 13 world px, y squashed 0.55 for the
equirectangular look) is applied and retried with a shrinking radius until it
lands on a land cell (max 5 tries, then the exact label anchor).

### Sim hooks and math

```js
ST.map.spawnRipple(x, y)          // transient expanding ring at a city point
ST.map.suggestSpawn()             // random point biased into the hot zones
ST.map.districtAt(x, y)           // nearest district object
ST.map.userPos(sim?)              // { x:152, y:328 } unless sim overrides
ST.map.milesBetween(ax, ay, bx, by)   // euclidean city px * 0.004 mi
ST.map.distanceMilesAt(x, y, sim?)    // user -> point, miles
ST.map.bearingRadAt(x, y, sim?)   // 0 = north, clockwise
ST.map.bearingDegAt(x, y, sim?)   // 0..359 integer
ST.map.nearestPins(pins, n, x, y, filter)  // n closest, filter applied
ST.map.passesFilter(pin, filter)
ST.map.radarSweepAngle()          // current sweep radians (360 deg / 3 s)
ST.map.sweepLagRad(targetRad)     // how far the sweep is past a bearing
```

### Input (optional; the product wires this from app.js)

```js
ST.map.attachInput()   // engine pointer drag = pan, wheel = stepped zoom
ST.map.detachInput()
ST.map.isDragging()    // true while a drag has moved > 2 px (suppress clicks)
```
