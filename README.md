# SPIDEY TRACKER - Rehm Edition

A fan-made, non-commercial interactive replica of the Spidey Tracker from
*Spider-Man: Brand New Day* (2026): the crowd-sourced Spider-Man sightings tracker built
by Ned Leeds, presented as the handheld from the reference still. Rebuilt overnight in the
"Mark 1" visual idiom: chunky glossy controls, comic accent cards, green hex LCD, SVG
spider-web radar, container-query scaling, full sound.

Not affiliated with Sony Pictures, Marvel Studios, or Samsung. Every graphic and sound is
synthesized in code (DOM pixel sprites, SVG geometry, WebAudio oscillators). No copyrighted
assets are bundled.

## Run it

Double-click `index.html` (any modern browser). No server, no build step, no network.
It boots itself; the slider on the top edge is power.

## What it does

- **Boot**: NED-OS POST log with key clicks, logo flash + jingle, "CALIBRATING WEB GRID"
  with a live progress bar, and a one-shot CRT power-on bloom when the screen lifts.
  Any input after 0.4s skips.
- **Live city map**: lower-Manhattan-style SVG world built from data (Hudson + East River,
  irregular street grid with shaded city blocks, three diagonal boulevards, parks, pulsing
  salmon hot zones, ten canon district labels, Empire State tower, YOU marker in Chelsea,
  region labels on the outer banks, bridges over both rivers, and a MAP DATA 2028 stamp;
  the world extends well past the visible clamps so the camera never shows void).
  Drag to pan, scroll or +/- to zoom, arrow keys pan, TERRAIN flips a
  green terrain scan that reveals the block layer, 3D VIEW tilts the map in perspective
  (zoom in first), CENTER re-centers with a fly animation. Leave it alone for 45s and
  an attract mode drifts the camera across hot zones like a store demo; any input wakes it.
- **Sightings**: wandering spider tokens - red RUMORED, green CONFIRMED, blue EVENT. New
  crowd reports drop every 9-22s with a ripple, spawn arpeggio and feed entry; rumors
  relocate ("corrected") with a glitch blip. Tabs: 0 reset layers, S toggle sightings,
  T toggle web-trace lines to nearby tokens.
- **Alerts**: A.1 (confirmed) and A.2 (rumored) alert toggles; get close to a token and the
  banner flips to a comic alert card with distance + handle. PROF 1/2/3 filter profiles.
- **Lock-on**: tap a spider -> target card (type, district, DIST/BRG, ID, report quote) ->
  TRACK: banner locks, a dashed ring locks on and follows the target, the radar draws a
  gold vector to it, the gold tracking LED lights, the little Spider-Man figure bounces,
  sonar pings every 1.2s, camera follows. PING fires a THWIP web-line from YOU to the
  target and the target replies in chat.
- **Split-flap readouts**: three-digit distance and bearing tiles flip toward the nearest
  sighting; the heart chest counts signals within range; green hex LCD shows target IDs,
  share codes, and the occasional idle flutter.
- **Suspect file** (left portrait, or 1/2/3): SPIDER-MAN (?? match), FLASH T. (12%),
  MR. HARRINGTON (9%) - Ned is hilariously off-scent. LOCATE flies to their last known
  district.
- **Panels** (MENU button or M): CHAT (send messages, web heads reply), ARCHIVE (sightings
  by recency, GO to fly to one), SHARE (share code + scannable-style QR + copy),
  REPORT SIGHTING (R: tap the map, mark CONFIRMED or RUMORED, you become the reporter),
  VIDEOS (four 10s pixel "trailers" - skyline, mask close-up, web lines, swinging Spidey -
  with the original chiptune), EVENTS (canon fan events with persisted RSVP), HELP,
  SETTINGS (sound / scanlines / Samsung / data wipe), ACTIVITY LOG, SAMSUNG EXCLUSIVE
  DOWNLOADS.
- **The notifications gag**: ~8s after first boot the device asks the canon question.
  YES has consequences (periodic SAMSUNG EXCLUSIVE toasts). Persisted.
- **Post-credits easter egg**: as the SPIDER-MAN suspect, track a target and PING it five
  times (or triple-click the big mask). SIGNAL LOST, glitch, rescan across a rotating globe,
  a green blip past the moon, a figure drifting among the stars, and
  SPIDER-MAN WILL RETURN. The caption under the device changes forever. Persisted.
- **Sound everywhere**: 60+ synthesized cues and loops - UI blips, boot key clicks, jingle,
  spawn arpeggio, alert stings, sonar, chat chime, chiptune theme, glitch zap, deep boom.
  The round badge toggles sound; S does too. Starts on (synth, no assets); persisted.
- **Hardware details**: camera glint in the bezel, breathing power LED (gold when
  tracking), SMT-1 serial plate, a tiny spider patrolling the radar rim, screen shake on
  SIGNAL LOST, and a console surprise for anyone who opens devtools (hi, Flash).

## Controls

Mouse/touch: everything is clickable and draggable. Keyboard: arrows pan, +/- zoom,
Enter lock, Esc back, C center, T terrain, D 3D, S sound, F filter, R report, M menu,
H help, L log, P power, 1/2/3 suspects.

## Tech

Zero dependencies, zero runtime network calls, file:// safe, no build:

- `index.html` - the device DOM (map viewport, banner, LCD, chest, buttons, modal, boot,
  easter-egg overlays)
- `css/style.css` - the entire look: container-query scaled (cqw) device, glossy buttons,
  comic cards, LCD, radar, animations
- `css/font.css` - Press Start 2P, Silkscreen 400/700, VT323 embedded as base64 woff2
- `js/data.js` - all content: palette, boot script, districts, city geometry, world data,
  sightings seed, feed lines, roster, toasts, video scenes, events, help, easter-egg copy
- `js/audio.js` - WebAudio synth engine: cues, free-frequency blips, chiptune scheduler
- `js/gui.js` - the application: sprites, SVG world + radar, tokens, sim, camera,
  tracking, panels, boot, gag, easter egg, persistence

(`js/engine.js`, `js/ui.js`, `js/map.js`, `js/app.js` are the earlier canvas architecture,
kept for reference; they are not loaded. `.qa/` holds the headless QA tooling.)

## Verification

Headless Brave via CDP: zero console errors on load and 20s soak; a full click-through
gauntlet (boot, select, track, ping + reply, filters, terrain, 3D, reset, Samsung popup,
menu, chat, archive, share, suspect, videos, RSVP, help, settings, log, report flow,
keyboard map, and the complete easter-egg sequence) passes with returned state evidence;
palette pixel counts verified on rendered screenshots. QA scripts and screenshots in `.qa/`.
