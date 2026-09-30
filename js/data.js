/* ============================================================
   SPIDEY TRACKER - js/data.js
   All content: palette, boot script, map geometry, districts,
   sightings seed, roster, feed lines, toasts, videos, events,
   help text, easter egg copy, misc UI strings.
   Loads FIRST. Zero dependencies. Attaches ST.data.
   ASCII only. No em-dashes. Everything the other modules read.
   ============================================================ */
(function () {
  "use strict";
  var W = typeof window !== "undefined" ? window : globalThis;
  W.ST = W.ST || {};

  /* ----------------------------------------------------------
     1. PALETTE - SPEC section 3, pinned values.
     PORTRAIT_* entries are data-agent extras for the suspect
     portraits (skin / hair / varsity gold / gray). All others
     are spec-verbatim.
     ---------------------------------------------------------- */
  var PALETTE = {
    SCREEN_BG: "#00C8FF",   // cyan LCD ground (pinned)
    SCREEN_BG_SOFT: "#2FC1FF", // softer alt, scanline/wobble use
    MAP_NAVY: "#101961",    // map panel ground
    MAP_BLOCK: "#07072C",   // city block fill, darkest
    BLOCK_LIGHT: "#0D0D45", // some blocks slightly lighter
    STREET: "#F0D8D8",      // street lines, pale
    SALMON: "#F8A080",      // hot zones
    RED_PIN: "#FF3B30",     // banner + rumored pins
    RED_DIM: "#B06058",     // secondary red, borders
    HOT_PINK: "#FF69B4",    // accent fills, bars, numbers
    PALE_PINK: "#F8D0D8",   // borders on pink elements
    GREEN_PARK: "#30A870",  // map parks
    GREEN_BAR: "#48E8A0",   // status bars, confirmed accents
    MINT: "#80F0C8",        // bar highlights
    WHITE: "#FFFFFF",       // text, digits, arrows
    FRAME_NAVY: "#0A1A5E",  // 1px inner screen border
    BODY: "#1A1A1A",        // device matte black
    BODY_EDGE: "#262626",   // device edge highlight
    SENSOR: "#002040",      // sensor dot, idle
    SENSOR_GLOW: "#00406A", // sensor dot, tracking teal glow
    BACKDROP: "#0B0E14",    // page bg
    WATER: "#0D2BB2",       // rivers on map
    PANEL_NAVY: "#0D1240",  // overlay panel fill (SPEC 8)
    LAND: "#E8D8C8",        // world map land, warm pale
    BLACK: "#000000",       // boot screen ground
    BOOT_GREEN: "#48E8A0",  // POST text green (uses GREEN_BAR)
    ORANGE: "#FF9F1C",      // unexplored sightings banner
    TEXT_DIM: "#6B7683",    // caption under device
    // portrait extras (data agent)
    PORTRAIT_SKIN: "#F0C8A0",
    PORTRAIT_HAIR: "#202020",
    PORTRAIT_GRAY: "#8A8A8A",
    PORTRAIT_GOLD: "#E8B820"
  };

  /* ----------------------------------------------------------
     2. BOOT_LINES - SPEC 8.1 verbatim, typed 120ms per line.
     ---------------------------------------------------------- */
  var BOOT_LINES = [
    "NED-OS v2.8.1 (c) 2028 LEEDS INDUSTRIES",
    "POWER AND RESPONSIBILITY... CHECK",
    "WEB RADAR ............ OK",
    "CROWD SOURCE UPLINK .. OK",
    "INITIALIZING MAP...",
    "LOADING SIGHTINGS: 63",
    "SIGNAL LOCKED"
  ];
  var BOOT_LOGO = {
    product: "SPIDEY TRACKER",
    byline: "by NED LEEDS"
  };

  /* ----------------------------------------------------------
     3. DISTRICTS - canon list, label anchors on the 900x900
     city canvas. bank: "west" = west of Hudson, "island" =
     Manhattan analog, "east" = east of the East River.
     labelSize = px hint for the map renderer (6..8).
     ---------------------------------------------------------- */
  var DISTRICTS = [
    { id: "HOBOKEN",      label: "HOBOKEN",      x: 4,   y: 430, park: false, labelSize: 6, bank: "west" },
    { id: "CHELSEA",      label: "CHELSEA",      x: 148, y: 312, park: false, labelSize: 8, bank: "island" },
    { id: "EMPIRE_STATE", label: "EMPIRE STATE", x: 352, y: 216, park: true,  labelSize: 8, bank: "island", landmark: true },
    { id: "FLATIRON",     label: "FLATIRON",     x: 388, y: 296, park: false, labelSize: 7, bank: "island" },
    { id: "E_VILLAGE",    label: "E VILLAGE",    x: 540, y: 442, park: true,  labelSize: 7, bank: "island" },
    { id: "TRIBECA",      label: "TRIBECA",      x: 212, y: 572, park: true,  labelSize: 7, bank: "island" },
    { id: "CHINATOWN",    label: "CHINATOWN",    x: 392, y: 576, park: false, labelSize: 7, bank: "island" },
    { id: "FIN_DIST",     label: "FIN DIST",     x: 332, y: 692, park: false, labelSize: 7, bank: "island" },
    { id: "DUMBO",        label: "DUMBO",        x: 806, y: 588, park: false, labelSize: 7, bank: "east" },
    { id: "WILLIAMSBURG", label: "WILLIAMSBURG", x: 796, y: 332, park: false, labelSize: 6, bank: "east" }
  ];

  /* ----------------------------------------------------------
     4. CITY_GEOMETRY - 900x900 city canvas. Compact arrays the
     map renderer consumes directly. Layout: Hoboken bank
     x 0..36, Hudson x 36..104 (7.6%), island x 104..660,
     East River x 660..788 (14.2%), east bank x 788..900.
     Irregular spacing 18..34 px between grid lines.
     ---------------------------------------------------------- */
  var CITY_GEOMETRY = {
    size: 900,
    westBank: { x0: 0, x1: 36 },
    island: { x0: 104, x1: 660 },
    eastBank: { x0: 788, x1: 900 },
    avenues: [104, 130, 148, 180, 202, 230, 250, 284, 302, 332, 356, 388, 406, 434, 456, 490, 510, 540, 564, 592, 610, 644],
    streets: [22, 48, 78, 96, 128, 150, 178, 212, 232, 258, 290, 308, 338, 362, 396, 414, 442, 464, 494, 514, 548, 574, 592, 624, 646, 676, 694, 728, 752, 780, 800, 832, 850, 880],
    eastAvenues: [794, 828, 860, 892],
    // parks: irregular polygons, GREEN_PARK
    parks: [
      { id: "CENTRAL", name: "BIG PARK", pts: [[250, 30], [472, 38], [478, 170], [362, 182], [244, 174]] },
      { id: "TOMPKINS", name: "SQ PARK", pts: [[520, 418], [586, 414], [590, 472], [524, 476]] },
      { id: "RIVER_PARK", name: "PARK", pts: [[150, 592], [212, 586], [216, 636], [154, 642]] }
    ],
    // hot zones: salmon blobs, 80% opacity, pulse 0.7..1.0 (4s)
    hotZones: [
      { id: "MIDTOWN_BAND", pts: [[132, 332], [642, 324], [650, 394], [140, 404]] },
      { id: "LOWER_RIGHT", pts: [[478, 598], [642, 578], [670, 662], [598, 702], [498, 672]] }
    ],
    // water rects (also world: renderer adds 1px lighter shoreline)
    water: [
      { id: "HUDSON", x: 36, y: 0, w: 68, h: 900 },
      { id: "EAST_RIVER", x: 660, y: 0, w: 128, h: 900 }
    ],
    // user ("YOU") fixed at Chelsea per SPEC 6.1
    userPos: { x: 152, y: 328, label: "YOU" },
    milesPerPx: 0.004,     // euclidean px * 0.004 = miles
    zoomLevels: [1, 1.6, 2.4],
    globalZoomLevels: [1, 2]
  };

  /* ----------------------------------------------------------
     5. WORLD_MAP - 48x24 bitmap, '#'=land '.'=water.
     Americas left, Europe/Africa middle, Asia/Australia right.
     labels: c = column, r = row of the label anchor (always
     placed on a land cell). Global-mode water is navy.
     ---------------------------------------------------------- */
  var WORLD_MAP = {
    cols: 48,
    rows: 24,
    land: "#",
    water: ".",
    colors: { land: "#E8D8C8", water: "#101961", label: "#FFFFFF" },
    grid: [
      "................................................",
      "................................................",
      ".....#########...####...........................",
      "...############.#####...........................",
      "..#############.####..##.################.......",
      "..##############........###################.....",
      "..##############........#####################...",
      "...#############........######################..",
      "....############........####################.##.",
      ".....###########........###############..###....",
      "........#####...........##########.###...####...",
      ".........###............##########.##...........",
      ".............########....#########..............",
      ".............#########....#######.#.............",
      "..............########....#######.#......######.",
      "...............######.....######.........######.",
      "...............######......####..........#####..",
      "................####.......###............####..",
      "................####........##..................",
      ".................##.............................",
      ".................##.............................",
      ".................#..............................",
      "................................................",
      "................................................"
    ],
    labels: [
      { name: "USA",       c: 7,  r: 6 },
      { name: "BRAZIL",    c: 17, r: 15 },
      { name: "UK",        c: 22, r: 4 },
      { name: "FRANCE",    c: 26, r: 7 },
      { name: "EGYPT",     c: 29, r: 9 },
      { name: "NIGERIA",   c: 26, r: 12 },
      { name: "INDIA",     c: 36, r: 10 },
      { name: "CHINA",     c: 39, r: 6 },
      { name: "JAPAN",     c: 45, r: 7 },
      { name: "AUSTRALIA", c: 43, r: 16 }
    ]
  };

  /* ----------------------------------------------------------
     6. SIGHTINGS_SEED - initial pins on the 900x900 canvas,
     biased to the two hot zones and canon districts.
     NOTE: SPEC 6.4 says "initial 14 pins (10 green, 4 red,
     1 event)" but 10+4+1 = 15; the per-type counts are stated
     twice, so 15 entries ship. See final report.
     ---------------------------------------------------------- */
  var SIGHTINGS_SEED = [
    { id: "S01", type: "CONFIRMED", x: 352, y: 352, timeAgoMinutes: 12,  reporterHandle: "@web_head_88",   report: "He waved at the tour bus. WAVED." },
    { id: "S02", type: "CONFIRMED", x: 210, y: 340, timeAgoMinutes: 31,  reporterHandle: "@nyc_spiderfan", report: "webbed a mugger to a bike rack" },
    { id: "S03", type: "CONFIRMED", x: 560, y: 368, timeAgoMinutes: 48,  reporterHandle: "@queens_bloke",   report: "caught a falling AC unit, no sweat" },
    { id: "S04", type: "CONFIRMED", x: 470, y: 384, timeAgoMinutes: 66,  reporterHandle: "@midtown_mj",     report: "rode a delivery van roof. no ticket" },
    { id: "S05", type: "CONFIRMED", x: 610, y: 556, timeAgoMinutes: 95,  reporterHandle: "@churro_lady",    report: "saved my churro mid-air. legend" },
    { id: "S06", type: "CONFIRMED", x: 588, y: 640, timeAgoMinutes: 120, reporterHandle: "@l_train_owl",    report: "cat rescue #3 this week. same cat?" },
    { id: "S07", type: "CONFIRMED", x: 640, y: 600, timeAgoMinutes: 150, reporterHandle: "@pizza_rat_nyc",  report: "stopped a pizza theft. slice safe" },
    { id: "S08", type: "CONFIRMED", x: 510, y: 660, timeAgoMinutes: 210, reporterHandle: "@d_train_rider",  report: "swung past my window doing laps" },
    { id: "S09", type: "CONFIRMED", x: 300, y: 560, timeAgoMinutes: 260, reporterHandle: "@dumpling_cart",  report: "webbed my cart wheel back on. free" },
    { id: "S10", type: "CONFIRMED", x: 160, y: 590, timeAgoMinutes: 300, reporterHandle: "@scaffold_guy",   report: "caught a plank mid-air over 6th" },
    { id: "S11", type: "RUMORED",   x: 655, y: 380, timeAgoMinutes: 45,  reporterHandle: "@spidey_skeptic", report: "him or a drone. honest answer: unsure" },
    { id: "S12", type: "RUMORED",   x: 500, y: 690, timeAgoMinutes: 75,  reporterHandle: "@cosplaydad",     report: "red blue blur. or a cosplayer. vote" },
    { id: "S13", type: "RUMORED",   x: 390, y: 430, timeAgoMinutes: 180, reporterHandle: "@night_nurse_fan",report: "heard webs at 3am. saw nothing" },
    { id: "S14", type: "RUMORED",   x: 830, y: 560, timeAgoMinutes: 240, reporterHandle: "@brooklyn_baker", report: "masked guy asked for directions" },
    { id: "S15", type: "EVENT",     x: 380, y: 300, timeAgoMinutes: 25,  reporterHandle: "@web_heads_nyc",  report: "WEB HEADS flash meetup, be nice" }
  ];

  /* ----------------------------------------------------------
     7. FEED_LINES - message center pool. All < 60 chars,
     canon districts, fan-community energy. 52 distinct.
     ---------------------------------------------------------- */
  var FEED_LINES = [
    "webbed mugger to a lamppost in CHELSEA. classic.",
    "saved my whole pizza in E VILLAGE. slice secured.",
    "crane save near EMPIRE STATE. jaws on the floor.",
    "cat stuck in tree in TRIBECA. cat now a regular.",
    "stopped a pizza theft in E VILLAGE. respect.",
    "rode the L train roof. transit cops furious.",
    "caught my phone mid-drop in FLATIRON. zero cracks.",
    "swung past my window in CHINATOWN doing laps.",
    "helped a dumpling cart across in CHINATOWN.",
    "landed on my fire escape in E VILLAGE. said hi.",
    "web parachute caught my gelato. TRUE story.",
    "someone left webs on my bike in WILLIAMSBURG.",
    "spidey photobombed my selfie in DUMBO. thanks?",
    "stopped a bike thief in HOBOKEN. yes, HOBOKEN.",
    "did a flip off the FLATIRON. illegal. iconic.",
    "caught a scaffold plank mid-air in CHELSEA.",
    "he waved at the tour bus. EMPIRE STATE crowds wild.",
    "unwedged a stroller wheel in FIN DIST. hero.",
    "took the stairs. all 60 floors. show off.",
    "webbed my coffee lid shut. upside down. no spill.",
    "L-train surprise: he sat down, read a paper, left.",
    "heard webs at 3am in TRIBECA. saw nothing. typical.",
    "caught a frisbee mid-swing in WILLIAMSBURG.",
    "my churro was saved mid-air. gravity canceled.",
    "asked him for directions in DUMBO. he knows maps.",
    "saluted a hot dog cart in CHELSEA. mutual respect.",
    "helped a granny cross in FIN DIST. she raced him.",
    "left a web hammock on my fire escape. keeping it.",
    "stopped a runaway e-scooter in E VILLAGE. easy.",
    "web zipline over the East River. permit pending.",
    "shared a pretzel with a squirrel. blessed.",
    "fixed my awning with webs. landlord furious.",
    "sightings spike after every Knicks loss. pattern?",
    "returned a dropped wallet in FIN DIST. no tip.",
    "kid's balloon freed, re-caught, re-freed. art.",
    "dangled a mugger over a trash can. accurate.",
    "my drone got webbed over DUMBO. honestly fair.",
    "caught a foul ball at Midtown's game. dad shocked.",
    "held the elevator in TRIBECA. in a hurry. still.",
    "two sightings, same minute. midtown math.",
    "webbed a pothole shut in CHINATOWN. city took credit.",
    "TRIBECA rumor: cosplayer or the real guy? vote.",
    "he nodded at my dog. my dog is famous now.",
    "school bus got a web escort across town.",
    "looped the EMPIRE STATE tower twice. showoff.",
    "caught a falling AC unit like a frisbee. DUMBO.",
    "saved my lunch, then my day, then my week.",
    "WILLIAMSBURG bridge sprint. red blur. big energy.",
    "webbing on my handlebars. free grip, honestly.",
    "waved from a rooftop in CHELSEA. we waved back.",
    "RUMOR: in two places at once. physics says no.",
    "he webbed my umbrella open in FIN DIST. gentlemen."
  ];

  /* ----------------------------------------------------------
     8. ROSTER - suspects per SPEC section 7. Portraits are
     12x12 palette-char strings (renderer scales 3x to 36x36).
     legend: char -> hex, "." = transparent.
     ---------------------------------------------------------- */
  var ROSTER = [
    {
      id: "SPIDER_MAN",
      name: "SPIDER-MAN",
      className: "UNKNOWN SUBJECT",
      matchPercent: null,       // shown as "??"
      matchLabel: "??",
      bio: [
        "Agility readings break every chart Ned owns.",
        "Zero socials. Zero selfies. Zero chill.",
        "If you know who he is, do NOT tell Flash."
      ],
      lastKnownDistrict: "E VILLAGE",
      portrait: {
        w: 12, h: 12,
        rows: [
          "....RRRR....",
          "..RRRRRRRR..",
          ".RRRRRRRRRR.",
          ".RWWRRRRWWR.",
          "RWWWRRRRWWWR",
          "RRRRRRRRRRRR",
          "RRRRRRRRRRRR",
          ".RRRRRRRRRR.",
          "..BBBBBBBB..",
          "..BBBBBBBB..",
          "...BBBBBB...",
          "....BBBB...."
        ],
        legend: { ".": null, "R": "#FF3B30", "B": "#101961", "W": "#FFFFFF" }
      }
    },
    {
      id: "FLASH",
      name: "FLASH T.",
      className: "PERSON OF INTEREST",
      matchPercent: 12,
      bio: [
        "Peak gym stats. Peak suspicion stats too.",
        "Told everyone HE almost caught Spider-Man. Twice.",
        "12% match. Ned is being generous."
      ],
      lastKnownDistrict: "EMPIRE STATE",
      portrait: {
        w: 12, h: 12,
        rows: [
          "...HHHHHH...",
          "..HHHHHHHH..",
          "..HHHHHHHH..",
          "..SSSSSSSS..",
          "..SWWSSWWS..",
          "..SSSSSSSS..",
          "...SSSSSS...",
          "...SSSSSS...",
          ".YYSSSSSSYY.",
          "YYYYWWWWYYYY",
          "NYYYWWWWYYYN",
          "NNYYWWWWYYNN"
        ],
        legend: { ".": null, "H": "#202020", "S": "#F0C8A0", "W": "#FFFFFF", "Y": "#E8B820", "N": "#0A1A5E" }
      }
    },
    {
      id: "HARRINGTON",
      name: "MR. HARRINGTON",
      className: "PERSON OF INTEREST",
      matchPercent: 9,
      bio: [
        "Chaperones every trip. Survives every trip.",
        "Was in DC during the robot thing. Coincidence?",
        "9% match. Ned doubts it. Harrington hopes not."
      ],
      lastKnownDistrict: "CHELSEA",
      portrait: {
        w: 12, h: 12,
        rows: [
          "..SSSSSSSS..",
          ".SSSSSSSSSS.",
          "HHSSSSSSSSHH",
          "HHSSSSSSSSHH",
          "HGGSSSSSSGGH",
          "HGWWSSSSWWGH",
          ".HSSSSSSSSH.",
          "..SSSSSSSS..",
          ".LLLSSSSLLL.",
          "..LLLLLLLL..",
          "..BBWWWWBB..",
          ".BBBWWWWBBB."
        ],
        legend: { ".": null, "S": "#F0C8A0", "H": "#8A8A8A", "G": "#202020", "W": "#FFFFFF", "L": "#FF3B30", "B": "#0A1A5E" }
      }
    }
  ];

  /* SPIDER_GLYPH - 11x8 title-bar spider, red. */
  var SPIDER_GLYPH = {
    w: 11, h: 8,
    rows: [
      "..#.....#..",
      ".#.#####.#.",
      "#..#####..#",
      ".#.#####.#.",
      "..#######..",
      ".#.#####.#.",
      "#..#####..#",
      "..#.....#.."
    ],
    legend: { ".": null, "#": "#FF3B30" }
  };

  /* MASK_SPRITE - 8x10 mask badge for pins. Two-color legend:
     "P" = primary (green confirmed / red rumored / blue event
     accent), "W" = eye white. Parameterizable. */
  var MASK_SPRITE = {
    w: 8, h: 10,
    rows: [
      "..PPPP..",
      ".PPPPPP.",
      "PPPPPPPP",
      "PWWPPWWP",
      "PWWPPWWP",
      "PPPPPPPP",
      ".PPPPPP.",
      "..PPPP..",
      "...PP...",
      "...PP..."
    ],
    legend: { ".": null, "P": "primary", "W": "#FFFFFF" }
  };

  /* ----------------------------------------------------------
     9. TOASTS - 8 Samsung-exclusive + 6 generic.
     ---------------------------------------------------------- */
  var TOASTS = {
    samsung: [
      "SAMSUNG EXCLUSIVE: New sighting near CHELSEA",
      "SAMSUNG EXCLUSIVE: Spider-signal spike in E VILLAGE",
      "SAMSUNG EXCLUSIVE: WEB WATCH ready on GALAXY devices",
      "SAMSUNG EXCLUSIVE: 3 new reports filed in DUMBO",
      "SAMSUNG EXCLUSIVE: rumor flagged near WILLIAMSBURG",
      "SAMSUNG EXCLUSIVE: new NED TALK episode out now",
      "SAMSUNG EXCLUSIVE: your tracker is 20% cooler today",
      "SAMSUNG EXCLUSIVE: thank you for choosing SAMSUNG"
    ],
    generic: [
      "REPORT RECEIVED. THANKS, WEB HEAD!",
      "SOUND ON",
      "SOUND OFF",
      "FILTER: CONFIRMED ONLY",
      "BATTERY LOW. WEB HEADS PLUG IN.",
      "SIGHTING MARKED EXPLORED"
    ]
  };

  /* ----------------------------------------------------------
     10. VIDEO_SCENES - 4 fake videos, 10s slideshows.
     Scene types: skyline_day, skyline_night, mask_closeup,
     web_lines, nyc_streets. palette = per-scene color hints.
     ---------------------------------------------------------- */
  var VIDEO_SCENES = [
    {
      id: "TRAILER_1",
      title: "TRAILER 1",
      durationMs: 10000,
      scenes: [
        { type: "skyline_day",   palette: { sky: "#2FC1FF", sun: "#FFF7D6", fg: "#101961", accent: "#F0D8D8" } },
        { type: "web_lines",     palette: { bg: "#0D1240", web: "#F0D8D8", glow: "#2FC1FF" } },
        { type: "mask_closeup",  palette: { bg: "#FF3B30", eye: "#FFFFFF", accent: "#101961" } }
      ],
      captions: ["THIS SUMMER WAS 2 MONTHS AGO", "HE'S STILL SWINGING", "SPIDER-MAN: BRAND NEW DAY"]
    },
    {
      id: "TRAILER_2",
      title: "TRAILER 2",
      durationMs: 10000,
      scenes: [
        { type: "nyc_streets",   palette: { sky: "#FF9F45", road: "#07072C", building: "#101961", accent: "#F8A080" } },
        { type: "skyline_night", palette: { sky: "#07072C", stars: "#FFFFFF", fg: "#0D2BB2", accent: "#FF69B4" } },
        { type: "web_lines",     palette: { bg: "#0D1240", web: "#F0D8D8", glow: "#2FC1FF" } }
      ],
      captions: ["EVERY HERO NEEDS A CREW", "HIS CREW NEEDS WIFI", "SPIDER-MAN: BRAND NEW DAY"]
    },
    {
      id: "FINAL_TRAILER",
      title: "FINAL TRAILER",
      durationMs: 10000,
      scenes: [
        { type: "skyline_night", palette: { sky: "#07072C", stars: "#FFFFFF", fg: "#0D2BB2", accent: "#FF69B4" } },
        { type: "mask_closeup",  palette: { bg: "#FF3B30", eye: "#FFFFFF", accent: "#101961" } },
        { type: "web_lines",     palette: { bg: "#0D1240", web: "#F0D8D8", glow: "#2FC1FF" } },
        { type: "skyline_day",   palette: { sky: "#2FC1FF", sun: "#FFF7D6", fg: "#101961", accent: "#F0D8D8" } }
      ],
      captions: ["ONE LAST SWING", "OK FINE, SEVERAL MORE", "SPIDER-MAN: BRAND NEW DAY"]
    },
    {
      id: "NED_TALK",
      title: "NED TALK: FOUNDER SPECIAL",
      durationMs: 10000,
      scenes: [
        { type: "nyc_streets",   palette: { sky: "#FF9F45", road: "#07072C", building: "#101961", accent: "#F8A080" } },
        { type: "mask_closeup",  palette: { bg: "#FF3B30", eye: "#FFFFFF", accent: "#101961" } },
        { type: "skyline_day",   palette: { sky: "#2FC1FF", sun: "#FFF7D6", fg: "#101961", accent: "#F0D8D8" } }
      ],
      captions: ["HI, I'M NED.", "CEO AND FOUNDER.", "I ALMOST DIED IN EUROPE ONCE.", "AVAILABLE ON GALAXY DEVICES."]
    }
  ];

  /* ----------------------------------------------------------
     11. EVENTS_LIST - 3 fan events (SPEC 8.10), 2026 dates.
     ---------------------------------------------------------- */
  var EVENTS_LIST = [
    {
      id: "E1",
      date: "2026-10-17",
      time: "18:00",
      name: "WEB HEADS MEETUP",
      district: "FLATIRON",
      blurb: "Pin trade, mask selfies, hot dogs. Ned maybe showing up. Maybe.",
      rsvp: false
    },
    {
      id: "E2",
      date: "2026-11-07",
      time: "20:00",
      name: "WEB HEADS SCREENING NIGHT",
      district: "E VILLAGE",
      blurb: "Spider-Man (2002) on a rooftop. Bring your own chair. And tissues.",
      rsvp: false
    },
    {
      id: "E3",
      date: "2026-12-05",
      time: "19:00",
      name: "COSPLAY NIGHT: MASKS ON",
      district: "DUMBO",
      blurb: "Best web-shooter wins a churro. Judged by crowd applause only.",
      rsvp: false
    }
  ];

  /* ----------------------------------------------------------
     12. HELP_PAGES - two pages, real, accurate (SPEC 11 + 5).
     ---------------------------------------------------------- */
  var HELP_PAGES = [
    {
      title: "HELP 1/2: KEYS",
      lines: [
        "ARROWS: DPAD (FOCUS/ZOOM/MOVE)",
        "ENTER / SPACE: OK, SELECT",
        "ESC / BACKSPACE: BACK / CLOSE",
        "+ / -: ZOOM IN / ZOOM OUT",
        "C: CENTER MAP",
        "G: GLOBAL MAP TOGGLE",
        "F: FILTERS CYCLE",
        "S: SOUND ON / OFF",
        "M: MENU",
        "H: HELP",
        "P: POWER ON / OFF",
        "1 / 2 / 3: SELECT RAIL PORTRAIT",
        "TAB: CYCLE FOCUS",
        "",
        "KEYPAD TOP-LEFT: FOCUS PREV",
        "KEYPAD TOP-RIGHT: ZOOM IN",
        "KEYPAD OK: SELECT / CONFIRM",
        "KEYPAD BOT-LEFT: FOCUS NEXT",
        "KEYPAD BOT-MID: ZOOM OUT",
        "KEYPAD BOT-RIGHT: BACK / CLOSE"
      ]
    },
    {
      title: "HELP 2/2: BUTTONS",
      lines: [
        "REPORT: REPORT A SIGHTING",
        "WEB WATCH: FULLSCREEN RADAR",
        "CENTER MAP: RESET CAMERA",
        "GLOBAL MAP: WORLD VIEW",
        "FILTERS: ALL / CONFIRMED / RUMORED",
        "SOUND OFF: TOGGLE SOUND",
        "HEART ICON: FAVORITES",
        "CLOCK ICON: RECENT",
        "ENVELOPE ICON: MESSAGE CENTER",
        "GREEN BARS: BATTERY + SIGNAL METER",
        "POWER SLIDER (TOP EDGE): ON / OFF",
        "",
        "DRAG MAP: PAN",
        "WHEEL / PINCH: ZOOM",
        "CLICK PIN: SIGHTING CARD",
        "CLICK PORTRAIT: SUSPECT FILE",
        "CLICK OK KEY: CONFIRM / OPEN"
      ]
    }
  ];

  /* ----------------------------------------------------------
     13. EASTER_EGG - post-credits copy (SPEC 10).
     ---------------------------------------------------------- */
  var EASTER_EGG = {
    signalLost: "SIGNAL LOST",
    rescanning: "RESCANNING...",
    willReturn: "SPIDER-MAN WILL RETURN",
    logLine: "ANOMALY DETECTED",
    moonBlip: "CONTACT?",
    driftCaption: "HE'S JUST OUT FOR A SWING",
    glitchCaptions: [
      "HE SEES YOU",
      "LOOK BEHIND YOU",
      "WITH GREAT POWER...",
      "IS THAT HIM?",
      "63 UNEXPLORED. 1 UNEXPLAINED."
    ],
    captionAfter: "HE WILL RETURN."
  };

  /* ----------------------------------------------------------
     14. MISC - titles, labels, counters, verbatim strings.
     ---------------------------------------------------------- */
  var MISC = {
    titleWords: ["SPIDER", "TRACER"],
    caption: "SPIDEY TRACKER // PROPERTY OF NED LEEDS. DO NOT TOUCH, FLASH.",
    captionAfter: "HE WILL RETURN.",
    keyboardHint: "ARROWS=DPAD ENTER=OK ESC=BACK M=MENU H=HELP P=POWER",
    unexploredCount: 63,
    unexploredBanner: "UNEXPLORED SIGHTINGS",   // shown as "<N> UNEXPLORED SIGHTINGS"
    digitPairs: "00 00 [MASK] 00 00",           // message center + videos header
    mapAttribution: "MAP DATA 2028",
    videoMeta: { play: "PLAY VIDEO", replay: "REPLAY VIDEO", unmute: "TAP TO UNMUTE" },
    samsungPopup: {
      text: "WOULD YOU LIKE TO ENABLE SAMSUNG EXCLUSIVE NOTIFICATIONS?",
      yes: "YES",
      no: "NO"
    },
    samsungDownloads: {
      title: "SAMSUNG EXCLUSIVE DOWNLOADS",
      line: "AVAILABLE ON GALAXY DEVICES"
    },
    menuItems: [
      "ACTIVITY LOG",
      "REPORT SIGHTING",
      "WEB WATCH",
      "VIDEOS",
      "EVENTS",
      "HELP",
      "SETTINGS",
      "SAMSUNG EXCLUSIVE DOWNLOADS"
    ],
    filterModes: ["ALL", "CONFIRMED ONLY", "RUMORED ONLY"],
    labels: {
      report: "REPORT",
      webWatch: "WEB WATCH",
      centerMap: "CENTER MAP",
      globalMap: "GLOBAL MAP",
      filters: "FILTERS",
      soundOff: "SOUND OFF",
      soundOn: "SOUND ON",
      tracking: "TRACKING",
      standby: "STANDBY",
      scanning: "SCANNING",
      you: "YOU",
      ok: "OK",
      dist: "DIST",
      brg: "BRG",
      sig: "SIG",
      conf: "CONF",
      confirmed: "CONFIRMED",
      rumored: "RUMORED",
      event: "EVENT",
      viewSighting: "VIEW SIGHTING",
      tapMap: "TAP MAP TO PLACE PIN",
      filterTagAll: "FILTER: ALL",
      filterTagConfirmed: "FILTER: CONFIRMED",
      filterTagRumored: "FILTER: RUMORED",
      favorites: "FAVORITES",
      recent: "RECENT",
      messageCenter: "MESSAGE CENTER",
      activityLog: "ACTIVITY LOG",
      settings: "SETTINGS"
    },
    settings: ["SOUND ON/OFF", "SCANLINES ON/OFF", "GLOW ON/OFF", "RESET DATA"]
  };

  /* Tiny pure helpers (no state, safe for any module). */
  function districtById(id) {
    for (var i = 0; i < DISTRICTS.length; i++) if (DISTRICTS[i].id === id) return DISTRICTS[i];
    return null;
  }
  function randomFeedLine() {
    return FEED_LINES[Math.floor(Math.random() * FEED_LINES.length)];
  }

  W.ST.data = {
    PALETTE: PALETTE,
    BOOT_LINES: BOOT_LINES,
    BOOT_LOGO: BOOT_LOGO,
    DISTRICTS: DISTRICTS,
    CITY_GEOMETRY: CITY_GEOMETRY,
    WORLD_MAP: WORLD_MAP,
    SIGHTINGS_SEED: SIGHTINGS_SEED,
    FEED_LINES: FEED_LINES,
    ROSTER: ROSTER,
    SPIDER_GLYPH: SPIDER_GLYPH,
    MASK_SPRITE: MASK_SPRITE,
    TOASTS: TOASTS,
    VIDEO_SCENES: VIDEO_SCENES,
    EVENTS_LIST: EVENTS_LIST,
    HELP_PAGES: HELP_PAGES,
    EASTER_EGG: EASTER_EGG,
    MISC: MISC,
    districtById: districtById,
    randomFeedLine: randomFeedLine
  };
})();
