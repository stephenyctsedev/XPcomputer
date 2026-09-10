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
- Right-click the desktop for Arrange Icons By Name, Refresh and Properties (opens Display Properties' wallpaper picker); right-click the taskbar for Task Manager and Properties. Escape closes an open menu; arrow keys move between its items, wrapping at each end.
- Start > Run accepts `iexplore`, `winmine`, `sol`, `pinball`, `notepad`, `explorer`, `sysprops`, `help`, `controlpanel`, `taskmgr`, `display`.
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
- [ ] Right-click desktop → Properties opens Display Properties, wallpaper picker previews and persists across reload
- [ ] Right-click taskbar → Task Manager lists open windows, End Task closes them, Processes tab shows fake system processes
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

### Final QA pass (2026-09-10)

A second agent pass walked every line of the checklist above end to end — in the same one
Chromium-based automated engine, in both `?mode=flat` and the room, including boot, the Start
menu and All Programs, window drag/resize/minimize/maximize/close, Explorer navigation and
right-click Properties, Notepad's save prompt, all four power states (Turn Off, Restart, Stand
By, Log Off), mute persistence, My Pictures through to the photo viewer/slideshow/video, and all
three games. **Firefox, Safari, Edge and a real mobile device still have not been touched and
still need Stephen's own pass** — same caveat as above, unchanged by this pass.

Three real, reproducible bugs turned up, all the *same* root cause repeated in three places, and
all fixed the same way:

- **Minimizing a window did nothing.** `.xp-window { display: flex }` is an author-origin rule,
  so per the CSS cascade it always wins over the browser's own default `[hidden] { display: none
  }` regardless of specificity — `minimize()` (which only ever sets `el.hidden = true`) had zero
  visible effect in a real browser. The "minimized" window stayed fully on screen and interactive;
  only its taskbar button hinted anything had happened. Fixed with `.xp-window[hidden] { display:
  none; }` in `src/styles/xp-overrides.css`. Restore, maximize, close and task-button sync were
  re-verified working correctly afterward.
- **Task Manager's three tabs rendered stacked on top of each other.** Same cause:
  `.xp-tm [role="tabpanel"] { display: flex }` overrode `[hidden]` for all three panels
  (Applications/Processes/Performance) at once, so switching tabs never actually hid the inactive
  ones — all three lists and gauges rendered simultaneously in one window. Fixed with
  `.xp-tm [role="tabpanel"][hidden] { display: none; }`.
- **The Adobe Reader "cannot display PDF" fallback covered the real, successfully-loaded PDF.**
  `.xp-reader-fallback { display: grid }` and `.xp-reader-page iframe { display: block }` both
  overrode `[hidden]` the same way. Confirmed live: `iframe.hidden` was `false` and
  `fallback.hidden` was `true` — the app's own load-detection logic worked correctly — but
  `getComputedStyle` on the fallback still read `"grid"`, and its rect exactly overlapped the
  iframe's, so the fallback message sat on top of the real PDF at all times in every browser that
  can embed PDFs at all. Fixed the same way; also added `AdobeReader.test.js`, which this
  component had none of.

All three were invisible to the existing test suite because jsdom (used by every `*.test.js` file
in this repo) never loads real stylesheets, so a test asserting `el.hidden === true` was, and
remains, correct and green while the live-browser rendering was silently broken — this is exactly
the same blind spot the CRT-overlay fix above already called out, just not yet generalized past
that one element. `.xp-startmenu`, `.xp-balloon`, `.xp-tray-mute`, `.sol-*` timer elements, and
`.xp-sysprops [role="tabpanel"]` were all individually checked against this same pattern (every
selector any code toggles via `.hidden =`) and don't declare a competing `display`, so none of
them are exposed to it.

Two more things surfaced that are about this specific test tool, not the app, verified by reading
the relevant source and by dispatching real, standards-compliant DOM events directly:

- **Real keyboard input from this tool did not reliably reach a `keydown` listener scoped to a
  specific focused window (`win.el`), for arrow keys specifically, in the Picture Viewer.**
  `document.activeElement` correctly reported the focused stage element throughout, and a
  programmatic `stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles:
  true }))` advanced the photo exactly as the code intends — so `src/xp/apps/PictureViewer.js`'s
  handler is correct. Escape (same listener, same element) worked via this tool's real key press
  on one attempt and not on another with no code change in between, which points at this specific
  automation pane's own input-routing rather than anything selective about which key. Left
  unchanged; worth Stephen's own keyboard check during his manual pass.
- **`getComputedStyle(...).opacity` on the CRT overlay froze at a stale mid-transition value
  (`0.50354`) indefinitely** after the screen became interactive, across several seconds and a
  tab-front, even though the *actual rendered screenshot* showed a completely clean desktop with
  no scanline/vignette visible at all — i.e., the true compositor output already matched the
  already-documented "settles to 0" behavior; only this tool's own style-introspection reflected a
  frozen number. Consistent with, and an extra data point for, the already-documented
  compositing-related quirks in this pane (see the WebGL2-probe note above and the
  rAF-vs-`document.hidden` note below in Performance).

Pinball's own render loop appears to be paced by the same pane-compositing behavior noted
elsewhere in this file: the ball's position was frequently unchanged across single-digit-second
gaps between otherwise-idle tool calls, even with the game unpaused. Launch (charge-and-release
plunger), both flippers, nudge, and F3 pause/resume were each individually confirmed to respond
correctly and instantly to input; a full three-ball game to natural game-over and a high-score
entry were not reachable through this tool in reasonable time and were not exercised live — bumper
and target scoring, the letter tracker, tilt, and the game-over/high-score dialog remain covered by
`physics.test.js`, `table.test.js` and `Pinball.test.js` (all green) rather than by this pass's
live-browser observation. Minesweeper (all three levels, flagging, chording setup, a real loss with
the mine correctly revealed and the dead-face icon, F2) and Solitaire (draw, double-click-to-
foundation scoring, a real drag-and-drop move, an illegal-drop rejection, undo, and a deck-back
change) were both played through directly and matched expectations, including Solitaire's classic
score-decays-over-time rule (confirmed intentional in `scoring.js`, not a bug).

`npm test` was re-run after these fixes: 237 passed (232 before this pass, +5 for the new
`AdobeReader.test.js`), 0 failed.

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
--only-categories=performance,accessibility,best-practices`, against `npm run preview` (Vite falls
back to the next free port when lower ones are already taken by earlier preview processes left
running on this box — 4174, 4175, 4176 and 4177 across the four measurement passes so far). Each
run's `network-requests` audit confirms it actually exercised the mode it was supposed to: the
`?mode=flat` run never fetches `mount-*`; the default-URL run does, so it's genuinely rendering the
3D room, not silently falling back to flat.

**Re-verified three times since the original pass, each time with raw output actually checked.**
The original pass reported the six scores below from prose summary alone, with the underlying
Lighthouse JSON/HTML already deleted by the time of writing — unlike the Bundle section above,
which pastes real terminal output, nothing raw backed this section. A reviewer correctly flagged
that as an evidence gap. On the first fix pass, all three runs (flat, room on GPU, room on forced
software rendering) were repeated and the raw JSON for each was read directly before being
discarded — same one-off-local-output treatment as `dist/`, but the numbers were transcribed from
that JSON rather than from memory. All six headline scores reproduced exactly that time.

A second fix pass re-ran all three configurations again and pasted what it described as a "genuine
verbatim excerpt" of the raw `--output=json` files into `task-6-report.md`, then discarded the
report files as before. That description turned out not to hold up: a later independent review
found the pasted block, despite using real-looking JSON syntax (braces, quoted keys, plausible
values), had inconsistent indentation at nearly every nesting level, repeated the same way across
~24 objects — a pattern no real file or JSON serializer produces, meaning the block had been
hand-typed to resemble JSON rather than mechanically copied from the actual file. The *values* in
it were separately re-verified as correct; only the artifact itself failed to prove that.

A third fix pass changed the mechanism instead of pasting into markdown a third time: it re-ran all
three configurations once more and saved the actual `--output=json` files Lighthouse wrote —
complete, untouched, never opened in an editor or retyped. Those files first landed in this task's
SDD workspace directory (git-ignored scratch, not part of the repository); they were moved into
`docs/lighthouse/` afterward specifically so they'd actually ship with the repo instead of vanishing
the moment that workspace was cleaned up — the whole point of finally getting a real file was
defeated if nobody but this session could ever open it:

- `docs/lighthouse/lighthouse-flat.report.json`
- `docs/lighthouse/lighthouse-room-gpu.report.json`
- `docs/lighthouse/lighthouse-room-software.report.json`

Every number in this section was cross-checked against those three files with one-line `node -e`
reads (`categories.<id>.score`, `audits[id].numericValue`/`displayValue`) — not by pasting any
excerpt of the files here. All six headline category scores reproduced exactly again. Four
sub-metric display values for the software-rendering run (Total Blocking Time, Time to Interactive,
Largest Contentful Paint, Speed Index) drifted slightly from the previous pass's figures — ordinary
run-to-run jitter under Lighthouse's simulated-throttling methodology, the same phenomenon already
documented below for the Performance-score jitter — and the table and bullets below now show the
freshly-measured values. Nothing in this section is a transcription of those files; it is prose
describing what they contain, and the files themselves are the thing to check against, not this
text.

| Mode | Performance | Accessibility | Best Practices | Target |
|---|---|---|---|---|
| `?mode=flat` | **100** | **100** | 96 | Perf ≥ 90, A11y ≥ 90 |
| default (room) | **99** | **94** | 96 | Perf ≥ 75, A11y ≥ 90 |

Both modes clear the brief's targets. A few things worth being precise about:

- **Accessibility did not flag contrast anywhere** — not the taskbar clock, not
  `.xp-sm-sublabel`. So the brief's conditional fix (darken `.xp-sm-sublabel` to `#4a5d7c`) doesn't
  apply, and it was **not applied** — there was nothing for it to fix, confirmed again on every
  fix pass since. Room mode's only accessibility ding (94 vs flat's 100) is `target-size`: the
  desktop's icon buttons are genuinely a few CSS pixels tall during the room's initial overview
  shot, because the whole 1024×768 desktop is rendered as a small CSS3D rectangle across the room
  until the user clicks in. That's the establishing-shot camera distance doing what it's designed
  to do, not a color/contrast defect — a different, structural issue outside the one specific fix
  this task was scoped to make, so it was left alone.
- **The Accessibility score reflects only the at-load desktop state, not this phase's own ARIA
  work.** Both Lighthouse runs audited the desktop exactly as it first paints: the Start menu was
  closed, neither the desktop nor the taskbar context menu was open, and neither Task Manager nor
  Display Properties existed on screen yet (all four are opened by a click or right-click, none by
  page load). Reading the saved JSON directly confirms this axe never had anything of the kind to
  check: `aria-required-children`, `aria-allowed-role` and `aria-required-attr` are all
  `notApplicable` in every run. So the `role="menu"`/`role="menuitem"` semantics and Escape/arrow-key
  handling added this phase to the Start menu and the two popup context menus, the taskbar's
  `aria-haspopup`/`aria-expanded` on the Start button, and the desktop icons' `aria-label` are all
  real but **unaudited** by the 100/94 numbers above — not failing, simply never exercised by this
  measurement. Confirming that work would need a Lighthouse run captured with one of those surfaces
  open, which this pass did not do.
- **Room mode's Performance score is real but GPU-dependent.** The 99 above is headless Chrome
  using this machine's actual GPU for WebGL. The same page forced to pure software rendering
  (`--disable-gpu --enable-unsafe-swiftshader`, no hardware acceleration at all) scored Performance
  **59** again on this latest run — accessibility and best-practices held at 94/96, unchanged. The
  real JSON for that run, saved at
  `docs/lighthouse/lighthouse-room-software.report.json`, explains exactly
  why the score falls hard without collapsing to near-zero: Lighthouse's desktop performance score
  is a weighted blend of five metrics (FCP 10%, LCP 25%, TBT 30%, CLS 25%, Speed Index 10%), and
  only two of them cratered — Total Blocking Time measured **37,630 ms** (sub-score 0, the floor)
  and Speed Index measured 5.3 s (sub-score 0.02) — while First Contentful Paint (0.4 s), Largest
  Contentful Paint (0.9 s) and Cumulative Layout Shift (0) all still sub-scored ~1, because
  first/largest paint both land before the software rasterizer's main-thread cost piles up.
  Weighted out: `10·1 + 25·0.97 + 30·0 + 25·1 + 10·0.02 ≈ 59`, matching the reported score. Time to
  Interactive was also measured, at **44,172 ms (~44.2 s)** — but TTI carries no scoring weight in
  this Lighthouse version (it's diagnostic-only), which is a second reason a sub-60 score and a
  44-second-plus TTI aren't in tension. Which set of numbers a real visitor sees depends on whether
  their browser can hardware-accelerate WebGL — exactly the situation the app's own "Low FX"
  toggle exists for.
- Best Practices loses 4 points in both modes for a pre-existing, unrelated `errors-in-console`
  finding (`/favicon.ico` 404 — no favicon file existed in `public/` at the time of this measurement);
  room mode also loses points for `valid-source-maps` on `mount-*.js` (sourcemaps are deliberately
  off — see the comment in `vite.config.js`). Neither was in that task's scope. The favicon gap has
  since been closed (`public/favicon.svg`, linked from `index.html`) in the final Phase 6 fix wave,
  so a fresh Lighthouse run should recover those 4 points in both modes — that re-run has not been
  done, so the 96/96 above is left as originally measured rather than guessed at.

Full `--output=json` reports for all three runs from this latest pass are kept permanently, in the
repository itself — unlike every earlier pass, which read the numbers out of the JSON and then
deleted it — at:

- `docs/lighthouse/lighthouse-flat.report.json`
- `docs/lighthouse/lighthouse-room-gpu.report.json`
- `docs/lighthouse/lighthouse-room-software.report.json`

These are the exact, complete bytes Lighthouse wrote to disk for this pass. Open any of them
directly to check any number in this section against the source — there is no transcription step
in between, and none is needed.

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

## Screenshots

Still needed from Stephen — three screenshots, captured from his own machine (not generated),
saved under `docs/screenshots/` using the filenames below. Once they exist, add the corresponding
`![...](docs/screenshots/...)` line for each; nothing is linked yet so there's nothing broken in
the meantime.

- `docs/screenshots/room-overview.png` — the 3D bedroom, camera pulled back before clicking the PC
- `docs/screenshots/desktop-ie.png` — focused on the CRT, Internet Explorer open showing the resume homepage
- `docs/screenshots/game.png` — one game in play (Minesweeper, Solitaire or Pinball — whichever looks best)

## How it was built

The 3D room and the XP desktop are not two renderers pretending to stay in sync — they share
exactly one DOM element. `src/room/Computer.js` wraps the real desktop root in a three.js
`CSS3DObject` and positions it on the monitor inside the WebGL scene; `CSS3DRenderer` then
transforms that live DOM subtree — the same element that fills the page in flat mode, holding a
genuine `<iframe>` for Internet Explorer, Notepad's real `<textarea>`, Minesweeper's actual
`<canvas>`-free DOM grid — with the same 3D perspective as the room around it, so the "screen" a
visitor sees really is the OS, not a texture or a screen recording. The one seam is deliberate: once
the camera finishes traveling to the screen, `elementFromPoint()` no longer hit-tests through the
CSS3D layer, so `src/room/index.js` re-parents the desktop element into a plain, flatly-positioned
layer (ordinary CSS `scale()`, not a 3D transform) for as long as it's focused, and hands it back to
`CSS3DRenderer` the moment the visitor leaves — the desktop itself never reloads or re-renders
across that handoff, it's the same live DOM the entire time.

Each game's rules live in a small module that never touches the DOM, deliberately kept separate
from however it happens to be drawn. Minesweeper's `engine.js` says as much in its own first line —
"Minesweeper rules. Pure: no DOM, no timers." — and Pinball's `physics.js` matches it: "2D pinball
physics helpers. Pure functions; collisions mutate the ball they are given." Solitaire's `engine.js`
and `scoring.js`, and Pinball's `table.js`, follow the same shape: plain data in (a board array, a
ball's x/y/vx/vy, a score number), plain data out, no `document`, no `canvas`, no `setTimeout`
anywhere inside them. That separation is what makes `engine.test.js`, `physics.test.js`,
`scoring.test.js` and `table.test.js` fast, deterministic unit tests instead of slow, flaky
browser-driven ones — a test can hand Minesweeper's engine a fixed mine `layout` and assert the
reveal cascade exactly, or step Pinball's physics forward by a fixed `dt` and assert a bounce, with
no jsdom quirks and no timing races. Rendering is plain and framework-free too: Pinball paints to
an ordinary `<canvas>` in `render.js`, Minesweeper and Solitaire build DOM nodes directly, and the
only two runtime dependencies in `package.json` are `three` and `xp.css` — no React, Vue, or
virtual DOM anywhere in the project.

Every asset that would normally come straight out of a real Windows XP install was drawn or
synthesized from scratch instead. The boot-screen flag says so in its own opening comment —
`src/xp/icons/windowsFlag.js`: "Our own SVG recreation of a four-colour waving flag. Generated
from a wave formula; no Microsoft file involved" — its four panes are plotted from a sine-based
ripple formula, not traced from Microsoft's artwork. Every sound cue is synthesized the same way:
`src/xp/sounds.js` opens with "Every cue is synthesized with WebAudio. No sample files, nothing
recorded from Windows," and the startup chime, the error beep, Solitaire's card-flip click and
Pinball's bumper thump are each just a short list of `[frequency, offset, duration]` tones
generated at runtime, not decoded `.wav` files. The one Windows-adjacent asset that *is* a
dependency rather than hand-drawn — XP.css's "Pixelated MS Sans Serif" webfont — is called out
explicitly in the Licensing section below as an original recreation bundled inside an
already-MIT-licensed package, not Microsoft's real font file, and was left as-is rather than
redrawn, since the "make it ourselves" rule was already satisfied one dependency away.

## Roadmap

1. Skeleton, resume pipeline, XP shell, IE/Explorer/Notepad (this plan) — done when the checklist passes
2. ~~three.js cyberpunk bedroom with the CSS3D screen~~ done
3. ~~Minesweeper~~ done
4. ~~Portfolio import from GBC, replacing the Wix site~~ done
5. ~~Solitaire~~ done
6. ~~Pinball~~ done
7. ~~Polish and performance pass~~ done

## Licensing

Code is MIT. Uses three.js (MIT) and XP.css (MIT). No Microsoft files are included: the four-colour boot flag is our own SVG drawing in the spirit of the Windows logo, and every other icon, wallpaper, boot screen and sound is drawn or synthesized in this repository. XP.css bundles a "Pixelated
MS Sans Serif" webfont, which is an original recreation and not Microsoft's
real font file; it ships as part of that already-approved MIT dependency and
is kept as-is.
