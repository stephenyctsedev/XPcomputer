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
