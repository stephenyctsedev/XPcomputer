# XPcomputer

Stephen Tse's interactive resume: a cyberpunk bedroom (three.js) with an old PC
running a fake Windows XP. Internet Explorer shows the resume, My Computer and
My Documents are explorable, and the Start menu has Minesweeper, Solitaire and
Pinball. Live at https://stephenyctsedev.github.io/XPcomputer/

## Run locally

    npm install
    npm run dev          # http://localhost:5173/XPcomputer/
    npm run dev -- --open

Add `?mode=flat` to skip the 3D room, `?mode=room` to force it.

## Test

    npm test

## Update the resume content

Check out the wanted branch in the sibling `../Resume` repo, wait for its CI to
publish `resume-<branch>.pdf` to the `preview` branch, then:

    npm run sync-resume                 # main branch, phone number excluded
    npm run sync-resume -- --branch bmo-job --display-name "Stephen Tse"

This rewrites `src/data/resume.json` and `public/resume/resume-main.pdf`.

**Note:** The downloadable PDF always includes the phone number — it is the
actual resume document as used in employer submissions. The `--include-phone`
flag only affects the generated site content (`resume.json` / homepage).

## Update the portfolio content

`src/data/portfolio.json` and `public/portfolio/` are the source of truth. Edit
the JSON directly to change a title, a description or a folder name.

The importer that first brought the content over from the sibling `GBC_Portfolio`
repo is still here and still works:

    npm run sync-portfolio
    npm run sync-portfolio -- --repo ../GBC_Portfolio

It re-optimizes every photo, so it overwrites hand edits. The video is the one
manual step: the script never runs ffmpeg, and prints the exact command to run
when the encoded file is missing.

## Build and deploy

    npm run build        # dist/

Pushing to `main` runs tests, builds, and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). Pages source must be set to "GitHub Actions".

## Controls

- Desktop: single click selects an icon, double click or Enter opens it; Alt+F4 closes the focused window; Escape closes dialogs.
- Start > Run accepts `iexplore`, `explorer`, `notepad`, `winmine`, `sol`, `pinball`.
- The tray speaker toggles sound (remembered between visits).
- 3D room: drag to orbit, wheel to zoom, click the PC to sit down at it, Escape or "Back to room" to stand up.
- "Low FX" (bottom right) turns bloom off and caps resolution for slower machines; the choice is remembered.
- Phones, tablets and browsers without WebGL2 skip the room and get the desktop full screen. Force a mode with `?mode=room` or `?mode=flat`.
- Minesweeper: left click reveals, right click flags (then ?), middle click or Shift+click chords, F2 new game. Best times are stored in the browser.
- Solitaire: drag runs, double-click sends a card to its foundation, click the stock to draw, F2 deals, Ctrl+Z undoes one move. Options and card back are remembered.
- Pinball: Z and / flippers, hold Space to launch, X and . nudge (three quick nudges tilt), F2 new game, F3 pause. High score is stored in the browser.
- Picture viewer: left and right arrows move between photos, Escape closes, and the button strip toggles best fit and actual size.

## Manual QA checklist

Run before every release, in Chrome and Firefox at minimum (Edge and Safari when available):

- [ ] Boot plays and can be skipped by clicking; startup chime after the first click
- [ ] Balloon tip appears once per boot and opens Internet Explorer
- [ ] Homepage shows every resume section and no phone number
- [ ] PDF opens in the Adobe Reader window; Save a Copy downloads it; fallback shows when PDFs cannot embed
- [ ] Every desktop icon, Start menu item, All Programs entry and Run command does something sensible
- [ ] Windows drag, resize, minimize, maximize, close; task buttons stay in sync
- [ ] Explorer: drives, folders, Back/Forward/Up, Views, task pane links, right-click Properties
- [ ] Notepad edit → close asks to save
- [ ] Turn Off, Restart, Stand By, Log Off all recover to a working desktop
- [ ] `?mode=flat` letterboxes at any window size; phone width shows the notice
- [ ] Mute persists across reload
- [ ] Room loads with neon bloom and no console errors; orbit limits hold
- [ ] Click PC → screen fills the viewport, desktop crisp and interactive only after arrival
- [ ] Escape leaves the screen unless a menu or dialog is open
- [ ] Turn Off darkens the CRT glow and returns the camera; clicking the PC boots again
- [ ] Resize while focused re-fits the screen; Low FX toggles and persists; hidden tab pauses rendering
- [ ] Phone emulation and `?mode=flat` show the flat desktop
- [ ] resume.json (homepage) and resume-main.pdf agree on jobs/skills — re-run `npm run sync-resume` if Resume's CI has published a newer PDF
- [ ] Boot logo shows the rippling four-colour flag beside "Windows XP"; Start button flag matches; in room mode the CRT glows from the BIOS text onward
- [ ] Minesweeper: three levels resize the window; win and loss paths; best-time prompt; sounds and mute
- [ ] Solitaire: draw one/three, valid and invalid drops, scoring and timer, undo, deck change, win cascade and dialog
- [ ] My Pictures lists every project folder; each opens in Thumbnails view with images painted
- [ ] The task pane shows the project name, tagline, description and tech tags; clicking a photo shows its dimensions
- [ ] Double-clicking a photo opens the viewer; Previous, Next, arrow keys and the fit toggle all work; the buttons disable at each end
- [ ] "View as a slide show" advances on its own and stops at the last photo; clicking Next cancels it
- [ ] The MEGABOX video plays in the viewer and starts muted when the tray speaker is muted
- [ ] The desktop My Pictures icon, the Start menu entry and the homepage Projects link all reach the folder
- [ ] Pinball: launch, flippers, bumpers, targets/bank, letters/extra ball, tilt, three-ball game over with high score, pause on minimize

## Browser notes

An agent pass (2026-09-09) ran an automated smoke test against `npm run build && npm run
preview`. Be precise about what that does and doesn't cover: the only browser available to it was
the Claude Code in-app browser tool, a single Chromium-based automated engine (its user agent
reports `Chrome/152` inside a `Claude/…` wrapper) — not a real installed copy of Chrome, Edge,
Firefox or Safari, and not a real phone. **Firefox, Safari, Edge and a real mobile device have not
been tested and still need Stephen's own manual pass before shipping** — nothing below should be
read as covering them.

What the agent pass actually exercised in that one engine, all with a clean console (no errors) at
each step: room-mode load, forcing `?mode=room` and clicking the PC through boot to a working
desktop, opening Internet Explorer and the resume PDF path, opening and playing Minesweeper,
Escape back to the room, `?mode=flat`, and mobile-viewport emulation at 375x812. It also
specifically checked the CRT overlay: only one `.xp-crt[hidden]` rule exists in the CSS and nothing
later resets `display`; live in the browser, computed `opacity` does settle to `0` once the screen
is interactive (a transition mid-flight can make a snapshot look stuck at `1` for a moment — that
self-corrects and is not a bug).

Two real, reproducible issues turned up and were fixed:

- **Mobile/narrow-viewport flat desktop was badly mis-centered.** `.flat-stage` used
  `display: grid; place-items: center` to center the 1024x768 desktop inside the viewport. CSS
  grid's implicit auto-sized track grows to fit the *item's* content size when the item is bigger
  than the container, so on any viewport narrower than 1024px (i.e. every phone in portrait) the
  track itself overflowed and the desktop was centered inside that oversized track instead of the
  real viewport — landing most of it off-screen to one side rather than centered. Confirmed live at
  375x812 (rect was `x:324.5, w:375`, mostly beyond the right edge) and fixed by pinning the track
  to the container's own size (`grid-template-columns: 100%; grid-template-rows: 100%` in
  `src/styles/base.css`); re-verified centered (`x:0, w:375`) at 375x812 and correct at a
  height-constrained 1400x600 too. This is plain CSS grid behavior, not engine-specific, so it
  would reproduce in any standards-compliant browser — this wasn't a quirk of the test tool.
- **Zero-size WebGL render targets on every room-mode mount.** `createRoom()`'s initial `resize()`
  computed `container.clientWidth || window.innerWidth` for its fallback, but in this environment
  `window.innerWidth`/`innerHeight` can themselves read `0` for one synchronous tick right at mount
  (seen live, plus general robustness against any embedding context where that's true, e.g. a
  hidden iframe). That fed straight into `effects.setSize(0, 0)`, spamming
  `GL_INVALID_FRAMEBUFFER_OPERATION: Attachment has zero size` on every frame and setting
  `camera.aspect` to `NaN`, until a later real resize corrected it. Fixed with a small
  `resolveRoomSize()` guard in `src/room/cameraFit.js` (used from `src/room/index.js`) that skips
  sizing when neither source has a usable size yet; covered by unit tests in `cameraFit.test.js`.
  Confirmed live: a fresh tab loading `?mode=room` now logs zero framebuffer warnings.

Also environment-only and *not* an app bug, noted for whoever runs this again: on a cold first
navigation, this specific browser tool's own `detectEnv()` WebGL2 probe can read `false` even
though WebGL2 genuinely works (confirmed by forcing `?mode=room`, which renders correctly) — a
startup/GPU-warmup quirk of the automated engine itself, not something real browsers do, so it was
left alone rather than "fixed".

## Performance

An agent pass (2026-09-09) measured bundle size for real, ran the real `lighthouse` CLI against a
real installed Chrome, and probed runtime behaviour through the Performance API in the same Claude
Code browser tool used for the Browser notes above. As with that pass, be precise about what each
number actually is.

### Bundle (`npm run build`)

| File | Role | Size | Gzip |
|---|---|---|---|
| `index-*.js` | entry — XP shell, flat desktop, mode detection | 94.89 kB | 30.05 kB |
| `index-*.css` | entry styles (xp.css + overrides) | 279.79 kB | 45.58 kB |
| `mount-*.js` | room chunk — three.js, OrbitControls, CSS3DRenderer; dynamically imported only once room mode actually mounts | 600.06 kB | 152.35 kB |
| `mount-*.css` | room styles | 2.51 kB | 1.16 kB |
| `Minesweeper-*.js` / `.css` | Minesweeper game chunk | 8.85 kB / 1.85 kB | 3.66 kB / 0.67 kB |
| `Solitaire-*.js` / `.css` | Solitaire game chunk | 17.47 kB / 1.62 kB | 6.52 kB / 0.67 kB |
| `Pinball-*.js` / `.css` | Pinball game chunk | 13.18 kB / 1.81 kB | 5.74 kB / 0.72 kB |
| 6 `.woff`/`.woff2` files | xp.css + DOS VGA bitmap fonts | 70.56 kB combined | n/a (already-compressed formats; Vite doesn't gzip-report them) |

`grep -c WebGLRenderer dist/assets/index-*.js` → **0**: the entry chunk carries no three.js. Every
`WebGLRenderer` reference (6 of them) lives in `mount-*.js`, which `src/main.js` only `import()`s
once room mode actually decides to mount (confirmed separately below: a Lighthouse run against
`?mode=flat` never requests `mount-*.js`/`mount-*.css` at all). The Minesweeper/Solitaire/Pinball
chunks also grep to 0.

### Lighthouse (`npm run preview` + real Chrome)

This machine has a real Google Chrome install
(`C:\Program Files\Google\Chrome\Application\chrome.exe`), so this was run for real: `npx
lighthouse` (v13.4.1, downloaded on demand) driving that Chrome headless, `--preset=desktop
--only-categories=performance,accessibility,best-practices`, against `npm run preview`
(`http://localhost:4174/XPcomputer/` — port 4173 was already taken). Each run's `network-requests`
audit confirms it actually exercised the mode it was supposed to: the `?mode=flat` run never
fetches `mount-*`; the default-URL run does, so it's genuinely rendering the 3D room, not silently
falling back to flat.

| Mode | Performance | Accessibility | Best Practices | Target |
|---|---|---|---|---|
| `?mode=flat` | **100** | **100** | 96 | Perf ≥ 90, A11y ≥ 90 |
| default (room) | **98** | **94** | 96 | Perf ≥ 75, A11y ≥ 90 |

Both modes clear the brief's targets. Two things worth being precise about:

- **Accessibility did not flag contrast anywhere** — not the taskbar clock, not
  `.xp-sm-sublabel`. So the brief's conditional fix (darken `.xp-sm-sublabel` to `#4a5d7c`) doesn't
  apply, and it was **not applied** — there was nothing for it to fix. Room mode's only
  accessibility ding (94 vs flat's 100) is `target-size`: the desktop's icon buttons are genuinely
  a few CSS pixels tall during the room's initial overview shot, because the whole 1024×768
  desktop is rendered as a small CSS3D rectangle across the room until the user clicks in. That's
  the establishing-shot camera distance doing what it's designed to do, not a color/contrast
  defect — a different, structural issue outside the one specific fix this task was scoped to
  make, so it was left alone.
- **Room mode's Performance score is real but GPU-dependent.** The 98 above is headless Chrome
  using this machine's actual GPU for WebGL. The same run forced to pure software rendering
  (`--disable-gpu --enable-unsafe-swiftshader`, no hardware acceleration at all) scored Performance
  **60** instead (Total Blocking Time ballooned to ~38 s, Time to Interactive to ~44 s under a
  software GL rasterizer) — accessibility and best-practices stayed at 94/96. Both numbers are
  genuinely measured; which one a real visitor sees depends on whether their browser can
  hardware-accelerate WebGL, which is exactly the situation the app's own "Low FX" toggle exists
  for.
- Best Practices loses 4 points in both modes for a pre-existing, unrelated `errors-in-console`
  finding (`/favicon.ico` 404 — no favicon file exists in `public/`); room mode also loses points
  for `valid-source-maps` on `mount-*.js` (sourcemaps are deliberately off — see the comment in
  `vite.config.js`). Neither is in this task's scope.

Full JSON/HTML reports were generated locally (`lighthouse-*.report.{json,html}`) while doing this
and then discarded afterward — one-off measurement output, not project files, same treatment as
`dist/`.

### Runtime (Performance API, in room mode)

**This is agent-measured Performance-API proxy data, not a DevTools Performance-panel
recording** — this environment has no such panel to click through. Measured live against `npm run
preview` in the same Claude Code browser pane as above, in room mode (`?mode=room`), via
`PerformanceObserver({entryTypes:['longtask']})` and a patched `requestAnimationFrame` used as a
call counter.

- **Long tasks: none.** Zero `longtask` entries over 50 ms were recorded across the whole ~250 s
  instrumented session, including while driving 9 real drag gestures and 2 scroll (zoom) gestures
  on the room canvas — confirmed genuinely orbiting by comparing before/after screenshots (the
  camera framing visibly changes between them).
- **FPS: not reported, and here's exactly why.** While instrumenting this, the browser tool
  reported the pane itself as hidden from the user's screen even though the page's own
  `document.hidden` / `visibilityState` / `hasFocus()` all read visible/focused the whole time. A
  bare, app-independent `requestAnimationFrame` callback (nothing to do with the room's own loop)
  failed to fire even once over a clean 4-second window under that condition. That means
  `requestAnimationFrame` delivery in this specific automation pane is gated on the pane actually
  being composited to the user's screen, not on the page-visibility API the app itself checks — so
  any FPS number computed by counting rAF calls here would measure this tool's own
  pane-compositing cadence, not the app's real frame rate. Rather than print a number that isn't
  really about the app, none is reported. **This is the one number in this section that genuinely
  needs Stephen's own pass:** open DevTools → Performance, record ~10 s while orbiting in room
  mode, and read the FPS meter / frame chart directly.
- **Idle-on-hidden: confirmed.** `src/room/index.js` wires
  `document.addEventListener('visibilitychange', onVisibility)` with `onVisibility = () =>
  (document.hidden ? stop() : start())`, where `stop()` sets `running = false` and calls
  `cancelAnimationFrame`, and `start()` sets `running = true` and runs one frame immediately
  (synchronously). Verified live, independent of the compositor issue above, by monkey-patching
  `cancelAnimationFrame` and stubbing `document.hidden` / `visibilityState`: forcing `hidden =
  true` and dispatching `visibilitychange` triggered a real `cancelAnimationFrame()` call; forcing
  it back to `false` and dispatching again triggered an immediate, synchronous re-run of the frame
  body. The render loop genuinely pauses when the tab goes hidden and resumes when it's shown
  again.

## Roadmap

1. Skeleton, resume pipeline, XP shell, IE/Explorer/Notepad (this plan) — done when the checklist passes
2. ~~three.js cyberpunk bedroom with the CSS3D screen~~ done
3. ~~Minesweeper~~ done
4. ~~Portfolio import from GBC, replacing the Wix site~~ done
5. ~~Solitaire~~ done
6. ~~Pinball~~ done
7. Polish and performance pass

## Licensing

Code is MIT. Uses three.js (MIT) and XP.css (MIT). No Microsoft files are included: the four-colour boot flag is our own SVG drawing in the spirit of the Windows logo, and every other icon, wallpaper, boot screen and sound is drawn or synthesized in this repository. XP.css bundles a "Pixelated
MS Sans Serif" webfont, which is an original recreation and not Microsoft's
real font file; it ships as part of that already-approved MIT dependency and
is kept as-is.
