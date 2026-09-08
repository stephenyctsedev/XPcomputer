# XP Computer Portfolio — Design Spec

Date: 2026-09-07
Status: approved in brainstorming (parts 1–3); implementation plan follows

## 1. Summary

A public portfolio site for recruiters. A three.js cyberpunk bedroom contains an
old beige PC. Clicking the PC glides the camera to the CRT monitor, which runs a
fake Windows XP desktop. Internet Explorer opens an early-2000s personal homepage
built from Stephen's resume, with a link to the real PDF. My Computer and My
Documents are fake Explorer windows over a generated C: drive. The Start menu
carries three playable games: Minesweeper, Solitaire, and an original Pinball
table.

Hosted on GitHub Pages at `https://stephenyctsedev.github.io/XPcomputer/`.

### Goals

- Show the resume in a memorable, interactive way that still gets recruiters to
  the PDF in two clicks.
- Demonstrate game-programming skill (three.js scene, physics, UI systems).
- Zero licensing risk: no Microsoft artwork, sounds, logos, or card bitmaps.
- Fast static site, no backend, no runtime network calls except outbound links.

### Non-goals

- Faithful replicas of Microsoft's games or the real "Space Cadet" table.
- Downloaded 3D models or textures; the room is procedural.
- Mobile 3D experience; phones get the flat desktop only.
- Real settings, real file system, or a real browser inside IE.

## 2. Decisions recorded

| Question | Decision |
|---|---|
| Purpose | Public portfolio piece on GitHub Pages (own repo `XPcomputer`) |
| Resume in IE | Retro HTML homepage generated from `resume.json`, plus PDF download; `main` branch version only; phone number excluded |
| Games scope | Minesweeper and Solitaire fully playable; Pinball is an original simplified table, built last |
| Screen technique | Real DOM desktop placed in the 3D scene with `CSS3DRenderer`; flat overlay fallback for touch/small/no-WebGL |
| Stack | Vite, plain JavaScript ES modules, three.js, XP.css (MIT), Vitest + jsdom, GitHub Actions to Pages |
| Git | Never commit or push unless Stephen says so |

## 3. Architecture

### 3.1 Folder layout

```
XPcomputer/
  index.html
  package.json
  vite.config.js                base: '/XPcomputer/'
  vitest.config.js              environment: jsdom
  public/
    resume/resume-main.pdf      copied from Resume repo, preview branch
  src/
    main.js                     mode detection; wires room <-> desktop
    modes.js                    pure: decide 'room' | 'flat' from capabilities/query
    room/
      Room.js                   builds bedroom meshes, neon, props, lights, fog
      Computer.js               desk, tower, CRT, keyboard, mouse; screen plane; glow plane; CSS3DObject host
      CameraRig.js              OrbitControls + tweened states: 'overview' | 'screen'
      cameraFit.js              pure: distance to fit a w x h plane in the viewport
      Effects.js                EffectComposer + UnrealBloomPass, resize, Low FX toggle
      Interaction.js            raycast hover/click on the PC
      tween.js                  tiny easing/tween helper (no GSAP)
      textures.js               canvas-generated textures: city backdrop, posters, floor grid
      LoadingScreen.js          BIOS-style text while the scene builds
    xp/
      createDesktop.js          mounts the whole shell into an element; returns controller
      Desktop.js                wallpaper, icon grid, selection, open
      Taskbar.js                start button, task buttons, tray (mute, clock), balloon tips
      StartMenu.js              two-column Luna menu with flyouts
      WindowManager.js          create/focus/minimize/maximize/close/drag/resize, z-order
      Window.js                 one window's DOM (title bar, controls, content slot)
      Dialog.js                 message boxes (error/info/question), Run dialog
      Boot.js                   BIOS -> boot screen -> Welcome -> desktop; shutdown; log off
      sounds.js                 WebAudio synthesized sounds + mute state
      icons/                    own SVG icons (IE, My Computer, My Documents, Recycle Bin, folder, txt, pdf, drive, floppy, cd, notepad, games)
      wallpaper.svg             original rolling-hill wallpaper
      apps/
        InternetExplorer.js     IE6-style chrome around a srcdoc iframe
        Homepage.js             renders retro HTML string from resume.json
        homepage.css            retro styles injected into the iframe
        AdobeReader.js          PDF iframe window with Save + fallback link
        Explorer.js             My Computer / My Documents / Recycle Bin views over the fake FS
        Notepad.js              text viewer/editor for .txt entries
        SystemProperties.js     dialog with resume facts as "specs"
        registry.js             app id -> launcher; used by icons, Start menu, Run, Explorer
      games/
        minesweeper/engine.js, engine.test.js, Minesweeper.js, minesweeper.css
        solitaire/engine.js, engine.test.js, scoring.js, scoring.test.js, Solitaire.js, cards.js, winAnimation.js
        pinball/physics.js, physics.test.js, table.js, table.test.js, Pinball.js, render.js, input.js
    data/
      resume.json               single source of truth for shown content
      filesystem.js             builds the fake drive tree from resume.json + static entries
      filesystem.test.js
    styles/
      base.css, room.css, xp-overrides.css
  scripts/
    sync-resume.mjs             .tex -> resume.json; copies the PDF
    tex-parse.mjs               pure parsing functions used by the script
    tex-parse.test.mjs
  tests/fixtures/resume-tex/    snapshot copies of the .tex files for parser tests
  .github/workflows/deploy.yml
  README.md
  docs/superpowers/specs/, docs/superpowers/plans/
```

### 3.2 Boundaries

- `xp/` has zero imports from `three` or `room/`. `createDesktop(rootEl, options)`
  mounts a complete 1024×768 desktop and returns a controller:
  `{ powerOn(), powerOff(), setInteractive(bool), on(event, fn), destroy() }`.
  Events: `booted`, `shutdown`, `logoff`, `sound`, `power` (fires on every boot-state
  change with one of `booting`, `on`, `shutting-down`, `off`, `standby`, `logon`).
- `room/` never imports from `xp/`. `createRoom(canvas, screenElement, options)`
  returns `{ focusScreen(), leaveScreen(), on(event, fn), setLowFx(bool), dispose() }`.
  Events: `pcClicked`, `screenFocused`, `screenLeft`.
- `main.js` is the only module that knows both. It picks the mode, creates the
  desktop into a detached element, hands the element to the room (room mode) or
  to a letterboxed scaler (flat mode), and connects events:
  `pcClicked -> focusScreen + powerOn`, `screenFocused -> setInteractive(true)`,
  `shutdown -> setInteractive(false) + leaveScreen`, Escape/back button ->
  `leaveScreen`.
- Game engines (`engine.js`, `physics.js`, `table.js`) are pure modules with no
  DOM access. UIs subscribe to engine state and render.

### 3.3 Modes

`modes.js` exports `pickMode({ query, hasWebGL2, coarsePointer, viewportWidth })`:

- `?mode=flat` or `?mode=room` forces the mode.
- Otherwise `flat` when WebGL2 is unavailable, the primary pointer is coarse
  (touch), or the viewport is narrower than 900 px. Else `room`.

Flat mode: the 1024×768 desktop element is centered and CSS-scaled to fit the
viewport (letterboxed, aspect preserved), boot starts immediately, and no
three.js code is loaded (room code is a dynamic import used only in room mode).
In flat mode `main.js` calls `setInteractive(true)` right after mounting.

## 4. The 3D room

### 4.1 Contents (all procedural)

- Shell: floor, three walls, ceiling. Floor has a subtle emissive grid texture
  generated on a canvas. Dark purple `FogExp2`.
- Furniture: bed with magenta neon underglow strip, desk, office chair, shelf
  with a few boxes/props, a rug.
- Computer on the desk: beige tower with a blinking power LED, CRT monitor with
  bezel and a 4:3 screen face, keyboard, mouse, cables.
- Window on the back wall: a generated night-city backdrop texture (gradient
  sky, random lit windows, soft neon haze) behind glass.
- Neon signs: two `TubeGeometry` tube signs (magenta and cyan) on the walls;
  one flickers via emissive intensity noise.
- Posters: canvas-generated text posters on the wall.
- Lights: low ambient, magenta and cyan point lights near the neon, a warm desk
  lamp spotlight, and a screen-glow point light in front of the monitor whose
  color slowly shifts while the PC is on and goes dark when it is off.

### 4.2 Rendering

- `WebGLRenderer` with ACES filmic tone mapping, pixel ratio capped at 2.
- `EffectComposer` with `RenderPass` + `UnrealBloomPass` at half resolution
  (strength ~0.8, threshold ~0.85, radius ~0.4; tuned by eye).
- Low FX toggle (small HUD button) disables bloom and drops the pixel ratio cap
  to 1. Render loop pauses when `document.hidden`.

### 4.3 Screen integration

- The desktop element is 1024×768 CSS px. The monitor screen face is
  0.32 m × 0.24 m in world units, so the `CSS3DObject` scale is 0.32/1024 per
  CSS px. The element is placed exactly on the screen face, facing outward.
- The `CSS3DRenderer` DOM layer sits above the WebGL canvas with
  `pointer-events: none`. Only the desktop element receives pointer events, and
  only when `setInteractive(true)` (camera in `screen` state). Everything else
  falls through to OrbitControls on the canvas.
- While unfocused, a CSS overlay on the desktop element applies a dark tint,
  scanlines, and a slight vignette so it reads as a dim CRT from across the
  room. The overlay fades out on focus.
- Behind the screen face, an emissive plane slightly larger than the screen
  peeks around the bezel and blooms as screen glow. The WebGL screen face
  itself is black and is only visible in one-frame edge cases.
- Accepted trade-off: nothing can be placed in front of the monitor; the screen
  is not lit or fogged by the scene.

### 4.4 Camera rig

- `overview`: OrbitControls around a target near the desk, damping on,
  clamped polar angle (no looking under the floor) and azimuth (stay inside the
  open front of the room), min/max distance.
- `screen`: camera on the screen's outward normal at distance
  `d = max(H/2 / tan(fov/2), W/2 / (tan(fov/2) * aspect)) * 1.04`, looking at
  the screen center, controls disabled. `cameraFit.js` implements and tests
  this. Re-evaluated on resize while in `screen` state.
- Transitions: 900 ms ease-in-out tween of position and target. With
  `prefers-reduced-motion: reduce`, transitions are instant.
- Leaving: Escape key, or a small "Back to room" HUD button shown only in
  `screen` state. Clicking the PC while in `overview` enters `screen`.
- Hovering the PC in overview shows a pointer cursor and a slight bezel
  emissive highlight.

### 4.5 Loading

A BIOS/POST-style text screen (own text, e.g. "XPcomputer BIOS v1.0 ...
Detecting room... OK") covers the canvas until the first frame renders, then
fades out.

## 5. Windows XP shell

### 5.1 Look

- XP.css (MIT) provides Luna window chrome, buttons, menus, scrollbars, tabs.
- Own SVG icon set drawn in the XP style (32 px and 16 px). Own wallpaper:
  an original rolling green hill under a blue sky as SVG.
- Boot logo is our own recreation: an SVG waving four-colour flag (red, green,
  blue, yellow) generated from a wave formula, beside "Windows XP" text and the
  sliding blue progress bar. The Start button uses the same flag. No Microsoft
  file is used.
- Default XP cursor look via CSS `cursor` on the desktop element using our own
  small SVG cursors (arrow, hand); falls back to system cursors.

### 5.2 Power and sessions (`Boot.js`)

- `powerOn()` when the PC is off: BIOS text (1.5 s) → boot screen (2.5 s) →
  "Welcome" (1 s) → desktop, startup chime. Any click skips ahead.
- PC stays on once booted; later focuses skip boot.
- Start → Turn Off Computer → dialog (Stand By / Turn Off / Restart / Cancel).
  Turn Off: "Windows is shutting down..." → screen black → emits `shutdown`.
  Restart: shutdown then boot again. Stand By: screen black, any click wakes.
- Start → Log Off → "Logging off..." → Welcome screen with a "Stephen" user
  tile; clicking it returns to the desktop (windows closed).

### 5.3 Desktop (`Desktop.js`)

- Icons: Internet Explorer, My Computer, My Documents, Recycle Bin (bottom-right
  corner like XP). Single click selects (blue highlight), double click or Enter
  opens, click on empty space deselects, arrow keys move selection.
- First arrival after boot: a taskbar balloon tip "Double-click Internet
  Explorer to view my resume" auto-dismisses after 8 s or on click (click also
  opens IE).

### 5.4 Taskbar and Start menu

- Taskbar: Start button, task buttons for open windows (active/inactive/
  minimized states, click to focus/restore), tray with a mute toggle and a live
  HH:MM AM/PM clock (updates each minute).
- Start menu: Luna two-column layout. Header: avatar + "Stephen".
  Left column: Internet (Internet Explorer), E-mail (mailto link), separator,
  Notepad, Minesweeper, Solitaire, Pinball, All Programs ▸.
  All Programs flyout: Accessories ▸ (Notepad), Games ▸ (Minesweeper,
  Pinball, Solitaire), Internet Explorer.
  Right column: My Documents, My Pictures, My Computer, Control Panel,
  Help and Support, Run....
  Bottom: Log Off, Turn Off Computer.
- Run... dialog accepts: `iexplore`, `winmine`, `sol`, `pinball`, `notepad`,
  `explorer`, `cmd` (error "not a valid Win32 application" joke). Unknown input →
  "Windows cannot find 'x'" error dialog.

### 5.5 Window manager

- Windows are absolutely positioned inside the 1024×768 desktop. Title bar
  drag (pointer events, clamped so at least 40 px stays visible), corner resize
  handle with per-app minimum size, minimize (to taskbar), maximize/restore
  (fills desktop above the taskbar), close.
- Focus on pointer-down anywhere in the window; z-order via incrementing
  z-index. New windows cascade by 24 px from the last opened position.
- Each app remembers its last size and position for the session.
- Alt+F4 closes the focused window; Escape closes the focused dialog.
- Modal dialogs (`Dialog.js`) block their owner window (owner gets an inert
  overlay) and reuse the same window machinery. Kinds: error, info, question,
  with configurable buttons.
- Windows emit `focus`, `minimize`, `restore`, `close` so the taskbar stays in
  sync.

### 5.6 Sounds (`sounds.js`)

All synthesized with WebAudio (oscillators, envelopes, filtered noise). No
sample files. Cues: startup chime, shutdown, click, error ding, balloon pop,
menu open, card flip, card place, mine tick, mine boom, win fanfare, pinball
flipper/bumper/target/drain. Audio context is created on the first user
gesture. Mute toggle persists in `localStorage`.

## 6. Apps

### 6.1 Internet Explorer

- Chrome: menu bar (File, Edit, View, Favorites, Tools, Help; Favorites opens a
  menu with Homepage, Resume PDF, LinkedIn, Portfolio; other menus are display
  only), toolbar (Back, Forward, Stop, Refresh, Home, Search, Favorites,
  History), address bar showing `http://www.stephentse.local/index.html`,
  status bar "Done" with the Internet zone indicator.
- Content: a same-origin `<iframe srcdoc>` holding the Homepage HTML so XP.css
  cannot leak into it. Links with `data-app` attributes are intercepted by the
  parent to open in-shell apps (Adobe Reader); external links open in a new
  browser tab with `rel="noopener"`.
- Default size 800×600 at first open.

### 6.2 Homepage (`Homepage.js`, `homepage.css`)

Rendered from `resume.json`. Early-2000s style: table layout, Times New Roman /
Verdana, tiled subtle background, a CSS marquee "Welcome to my homepage!",
an "under construction" striped banner, and a visitor counter (odometer digits;
base number plus a `localStorage` increment). Sections:

1. Header: display name, title, location.
2. About Me (summary paragraph).
3. Experience: one table row per job (period, title, company, bullet list).
4. Expertise: two-column bullet table.
5. Education: year, degree, school.
6. Languages.
7. Contact & Links: email (mailto), LinkedIn, portfolio, "Download my resume
   (PDF)" (opens Adobe Reader in-shell; the anchor's real `href` still points at
   the PDF so middle-click and "save link as" work), "View this site's source
   on GitHub".
8. Footer: "Last updated: {updated}", "Best viewed in Internet Explorer 6 at
   1024×768".

### 6.3 Adobe Reader window

Title "resume.pdf - Adobe Reader". Body: `<iframe src="resume/resume-main.pdf">`
using the browser's PDF viewer, plus a toolbar with Save (anchor with
`download`) and "Open in new tab". If the iframe cannot render (detected by
`navigator.pdfViewerEnabled === false`, or no load event within 1.5 s), show a
friendly panel with the download link instead.

### 6.4 Explorer (My Computer, My Documents, Recycle Bin)

One component `openExplorer(path)`. Layout: Luna task pane on the left (blue
panels: "System Tasks"/"File and Folder Tasks", "Other Places", "Details"),
icon view on the right, toolbar (Back, Forward, Up, Views toggle Icons/Details),
address bar with the path, status bar "N objects".

Fake file system (`filesystem.js`), built from `resume.json` + static entries:

```
My Computer
  3.5 Floppy (A:)             -> error "Please insert a disk into drive A:"  [Retry][Cancel]
  Local Disk (C:)
    Documents and Settings\Stephen\
      Desktop\                  shortcuts mirroring the desktop icons
      My Documents\
        My Pictures\            portfolio.url (opens portfolio in new tab)
        My Music\               (empty)
        Projects\               one .txt per experience entry (title, company, period, bullets)
        resume.pdf              opens Adobe Reader
        readme.txt              about this site, controls, tech used
        todo.txt                short joke list
    Program Files\
      Internet Explorer\iexplore.exe
      Windows NT\Pinball\pinball.exe
    WINDOWS\system32\           winmine.exe, sol.exe, notepad.exe
  CD Drive (D:)                 -> error "Please insert a disc into drive D:"
  Shared Documents              -> same as My Documents
Recycle Bin
  old_resume_2018.doc, cover_letter_FINAL_v3_really_final.doc  (opening -> "This file is in the Recycle Bin")
```

Double-clicking `.exe` entries launches the mapped app via `registry.js`.
Right-click on the My Computer background or an item opens a context menu with
Properties; My Computer → Properties opens System Properties (`General` tab:
"Registered to: Stephen Tse", "Computer: Game Programmer", "Memory: 6+ years
of experience"; `Hardware` tab lists Expertise items as devices).

### 6.5 Notepad

Menu bar (File, Edit, Format, View, Help; Format → Word Wrap toggles), a
textarea with the file content, editable. Closing after edits asks "Do you want
to save changes?" → Yes/No/Cancel; Yes shows an info dialog "Saved to nowhere
(this is a demo)".

### 6.6 Control Panel and Help and Support

Control Panel → error dialog "This operation has been cancelled due to
restrictions in effect on this computer. Please contact your system
administrator (Stephen)." Help and Support → small window with an About text,
controls, and a link to the GitHub repo.

## 7. Games

Each game: a pure engine with unit tests plus a UI module. Best times / high
scores live in `localStorage` under `xpcomputer.*` keys, guarded by try/catch.

### 7.1 Minesweeper

- Levels: Beginner 9×9/10, Intermediate 16×16/40, Expert 16×30/99; Custom
  omitted.
- Engine: `createGame(rows, cols, mines)`; mines placed on the first reveal
  excluding that cell; `reveal`, `toggleMark` (none → flag → ? → none when
  Marks enabled, else none ↔ flag), `chord` (reveal unflagged neighbors of a
  satisfied number), states `ready | playing | won | lost`; on loss, reveal all
  mines and mark wrong flags; on win, auto-flag remaining mines.
- UI: menu Game (New F2, levels, Marks (?), Best Times..., Exit), Help (About).
  LED counters for mines left and elapsed seconds (000–999), smiley button
  (smile, :o while a cell is pressed, sunglasses on win, dead on loss; click
  restarts). Bevelled tiles via CSS borders, classic number colors. Left click
  reveals, right click marks, middle click or left+right chords.

### 7.2 Solitaire (Klondike)

- Engine: seeded shuffle for tests, deal 7 columns, stock/waste, 4 foundations.
  Options: draw one/three, scoring Standard/None, timed game. Moves validated:
  tableau descending alternating colors, only Kings to empty columns;
  foundation ascending same suit from Ace. `drawFromStock`, `recycleWaste`,
  `moveStack(from, count, to)`, `autoToFoundation(card)`, `undo` (one level,
  like Windows), win when all 52 cards are on foundations.
- Standard scoring (Windows rules): waste→tableau +5, waste→foundation +10,
  tableau→foundation +10, flipping a tableau card +5, foundation→tableau −15;
  draw-one recycle −100 per pass after the first; draw-three recycle −20 per
  pass after the fourth; timed: −2 every 10 s; win bonus `700000 / seconds`
  when the game lasted over 30 s. Score floors at 0.
- UI: green felt, own card art (rank/suit glyphs, stylized face cards), six CSS
  card backs selectable via Game → Deck..., drag-and-drop of stacks with
  pointer events and a drop-target highlight, double-click auto-foundation,
  status bar with score and time, menus Game (Deal F2, Undo, Deck..., Options...,
  Exit) and Help. Win animation: cards launch from the foundations, bounce off
  the bottom edge under gravity and exit sideways, leaving trails on a canvas
  overlay; any click stops it.

### 7.3 Pinball (original table)

- Window about 900×620: table canvas on the left (portrait, own neon/space
  art), score panel on the right (score, ball number, high score, mission text).
- `physics.js`: fixed timestep 1/240 s with substeps per frame, ball as a
  circle, static geometry as line segments and circles, swept circle-segment
  collision with reflection and restitution, gravity along the table slope,
  max speed clamp, flippers as rotating segments whose angular velocity adds
  tangential velocity on contact, plunger charge (hold Space) → launch speed,
  nudge (X and . keys) with a tilt after three nudges in 2 s (flippers dead
  until drain).
- `table.js`: layout of walls, two flippers, three pop bumpers, two
  slingshots, a 3-bank of drop targets, rollover lanes spelling S-T-E-P-H-E-N,
  outlanes, drain. Scoring: bumper 100, slingshot 50, drop target 500 and
  bank complete 5,000 (targets reset), each new letter 250, word complete
  10,000 and one extra ball per game. Three balls per game; F2 new game.
- Controls: Z left flipper, / right flipper, Space plunger, X and . nudge,
  F2 new game, F3 pause. On-screen key hints in the panel.
- Rendering (`render.js`): canvas 2D at device pixel ratio, glow via shadowBlur
  sparingly, lit targets/lanes, ball trail.

## 8. Data and content pipeline

### 8.1 `resume.json` schema

```json
{
  "fullName": "YIU CHUNG TSE, STEPHEN",
  "displayName": "Stephen Tse",
  "title": "Game Programmer",
  "summary": "As a passionate and adaptable software developer ...",
  "contact": {
    "email": "stephenyctsedev@gmail.com",
    "location": "Winnipeg, Manitoba, Canada",
    "linkedin": "https://www.linkedin.com/in/stephenyctse/",
    "portfolio": "https://stephenyctse.wixsite.com/portfolio"
  },
  "expertise": ["Unity", "SQL", "Java", "PHP", "JavaScript", "Python", "C#", "Node.js", "PlayCanvas", "Socket.IO"],
  "languages": [{ "name": "Cantonese", "level": "Native Speaker" }],
  "education": [{ "year": "2018", "degree": "Higher Diploma in Game Software Development", "school": "Hong Kong Institute of Vocational Education (Tsing Yi, Hong Kong)" }],
  "experience": [{ "period": "2023 – Present", "title": "Store Associate", "company": "Sun Wah Supermarket, Winnipeg, Canada", "bullets": ["..."] }],
  "sourceBranch": "main",
  "updated": "2026-09-07"
}
```

No phone field unless the script is run with `--include-phone`.

### 8.2 `scripts/sync-resume.mjs`

- Args: `--repo <path>` (default `../Resume`), `--branch <name>` (default
  `main`; selects `resume-<branch>.pdf`), `--display-name <text>` (default
  derived as "<given names after the comma> <last word before the comma>",
  title-cased), `--include-phone`.
- Reads the .tex files from the working tree of `--repo` (the user checks out
  the wanted branch first) and parses with `tex-parse.mjs`:
  - `header.tex`: name inside the `\fontsize...\bfseries\color{darktext}...}` group;
    title from the `\large\color{darktext}` group.
  - `aboutme.tex`: paragraph inside the `\normalsize` group; strip `%`
    comments/line continuations; collapse whitespace.
  - `contact.tex`: phone after `\faPhone`, email from `mailto:`, location after
    `\faMapMarker`, LinkedIn from `\href{...}`.
  - `education.tex`: repeating triples of `{\itshape YEAR}`, `\bfseries DEGREE`,
    SCHOOL text up to `\par`; `\\` becomes a space.
  - `experience.tex`: `\expEntry{period}{title}{company}{items}` using a brace
    matcher; items split on `\item`.
  - `expertise.tex`: tabular rows split on `&`, strip `\textbullet\ ` and
    `\\[...]`.
  - `language.tex`: `Name: Level` lines.
  - `portfolio.tex`: first `\href{URL}`.
  - LaTeX unescape: `\#`→`#`, `\&`→`&`, `\%`→`%`, `\_`→`_`, `--`→`–`,
    strip `{}` groups and font commands.
- Writes `src/data/resume.json` only if every section parsed to a non-empty
  value; otherwise prints which section failed and exits 1.
- Copies the PDF: `git -C <repo> fetch origin preview` then
  `git -C <repo> show origin/preview:resume-<branch>.pdf` streamed to
  `public/resume/resume-main.pdf` (binary safe). Missing PDF → exit 1 with a
  hint to wait for the Resume CI.
- `npm run sync-resume` runs it. Parser tests run against
  `tests/fixtures/resume-tex/` snapshot copies of the current .tex files.

### 8.3 Fake file system

`filesystem.js` exports `buildFileSystem(resume)` returning a tree of nodes
`{ name, kind: 'drive'|'folder'|'file'|'shortcut'|'exe', icon, children?, open? }`
where `open` names an app id and payload. Explorer only walks this tree.

## 9. Deployment

- Public repo `stephenyctsedev/XPcomputer`, created only when Stephen says so.
- `.github/workflows/deploy.yml`: on push to `main` and manual dispatch:
  checkout → setup-node 20 → `npm ci` → `npm test` → `npm run build` →
  `actions/upload-pages-artifact` → `actions/deploy-pages`. Pages source:
  GitHub Actions. Vite `base: '/XPcomputer/'`.
- Bundle budget: under 600 KB gzipped for JS+CSS (three.js is about 150 KB gz);
  the PDF loads only when opened. Room-mode code is dynamically imported so
  flat mode never downloads three.js.

## 10. Testing

- Vitest, jsdom environment. Unit tests: Minesweeper engine, Solitaire engine
  and scoring, Pinball physics (segment/circle collision, reflection, flipper
  impulse, gravity integration, drain detection) and table scoring state
  machine, `WindowManager` (create/focus order/minimize/restore/close events,
  clamping), `filesystem.js`, `modes.js`, `cameraFit.js`, `tween.js`,
  `tex-parse.mjs` against fixtures, `Homepage.js` (renders every resume section
  and omits phone).
- `npm test` runs in CI before build; a failing test blocks deploy.
- Manual QA checklist in README: boot/skip, every desktop icon and Start item,
  window drag/resize/minimize/maximize, IE → PDF download, all three games
  including win/loss paths, Escape/back from screen, resize while focused,
  Low FX toggle, `?mode=flat`, phone fallback, Chrome/Edge/Firefox/Safari.
- Visual verification of the 3D room by screenshots during development.

## 11. Error handling and fallbacks

- No WebGL2 / coarse pointer / narrow viewport → flat mode with a one-line
  notice "3D room needs a desktop browser".
- three.js init throws → catch, log, fall back to flat mode.
- PDF iframe cannot render → download panel.
- `localStorage` unavailable → features work without persistence.
- WebAudio unavailable → sounds silently disabled, mute button hidden.
- Sync script: fail loudly, never write partial JSON.

## 12. Performance and accessibility

- Cap DPR at 2 (1 in Low FX), bloom half resolution, pause when hidden,
  `requestAnimationFrame` only in room mode.
- `prefers-reduced-motion`: instant camera moves, boot animations shortened,
  Solitaire win animation replaced by a static "You won" dialog.
- Keyboard: Escape leaves the screen; desktop icons and menus navigable with
  arrows/Enter; games fully keyboard-playable where the original was
  (Minesweeper needs the mouse, as the original did).
- All interactive DOM has focusable elements with visible focus in XP style.

## 13. Licensing and assets

- Code: MIT. Dependencies: three.js (MIT), XP.css (MIT), Vite/Vitest (MIT).
- No Microsoft bitmaps, icons, wallpapers, sounds, fonts, or card art. The
  four-colour flag is an original SVG drawing that is deliberately reminiscent
  of the Windows mark; it is the one recognisable brand shape on the site.
  Names used in menus are generic ("Pinball", "Minesweeper", "Solitaire").
- README states this stance and credits XP.css and three.js.

## 14. Phases (each shippable)

1. **Skeleton + XP shell + resume.** Vite project, deploy workflow, sync script
   + `resume.json` + PDF, boot, desktop, taskbar, Start menu, window manager,
   dialogs, sounds, IE + Homepage + Adobe Reader, Explorer + fake FS, Notepad,
   System Properties, flat mode. Acceptance: at `?mode=flat` a recruiter can
   boot, open IE, read the resume, and download the PDF.
2. **3D room.** Spike first: CSS3D screen + bloom coexisting with a placeholder
   desktop. Then room contents, camera rig, interaction, loading screen, mode
   detection, Low FX. Acceptance: click PC → focused desktop, Escape → room.
3. **Minesweeper.**
4. **Solitaire.**
5. **Pinball.**
6. **Polish.** Balloon tips, Run dialog, Recycle Bin, easter eggs, performance
   pass, README final, QA checklist run.

## 15. Assumptions

- Display name "Stephen Tse"; full name shown once in System Properties.
- Resume repo checkout lives at `../Resume` relative to this project.
- The phone number never appears on the site.
- Node 20+, npm, desktop Chrome/Edge as the primary target browsers.
