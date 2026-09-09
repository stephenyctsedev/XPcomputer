# Portfolio Migration (GBC -> XPcomputer, retiring Wix) — Design Spec

Date: 2026-09-08
Status: approved in brainstorming; implementation plan follows

## 1. Summary

The Wix portfolio at `stephenyctse.wixsite.com/portfolio` is retired and replaced
by XPcomputer. The nine project write-ups and their photos currently live in the
sibling `GBC_Portfolio` repo, whose `data.js` holds the same content as the Wix
site. Those projects move into XPcomputer as a real picture folder tree under
`My Documents\My Pictures`, browsable in the fake Explorer with a Thumbnails view
and opened in a new Windows Picture and Fax Viewer window.

After this work, `Resume/portfolio.tex` on every branch points at
`https://stephenyctsedev.github.io/XPcomputer/` instead of Wix, so the printed
resume and its QR code lead here.

### Goals

- Every project on the Wix site is browsable inside the XP desktop.
- A recruiter can find the projects without knowing where to click.
- Media ships small enough for GitHub Pages and loads fast in a small window.
- Content lives in one place afterwards, owned by this repo.
- The printed resume stops pointing at Wix.

### Non-goals

- Keeping GBC_Portfolio as an ongoing content source.
- Faithfully porting the Game Boy Color presentation.
- A general-purpose image viewer, editor, or file manager.
- Importing the GBC about and contact blocks; `resume.json` already owns both.

## 2. Decisions recorded

| Question | Decision |
|---|---|
| Where projects live in the shell | Real folders under `My Pictures`, browsed in Explorer, opened in a picture viewer |
| Media handling | Optimize on import via a repeatable `sync-portfolio` script |
| Content ownership after import | XPcomputer owns `portfolio.json`; GBC is a one-time source |
| Wix retirement | Flip all three Resume branches, as the final step after this ships |
| Prose placement | Explorer task pane Details group, not a text file |
| Video | Re-encoded once by hand; the script passes it through |
| Git | Never commit or push unless Stephen says so |

## 3. Source data

`GBC_Portfolio/data.js` exports a `DATA` object with `about`, `projects` and
`contact`. Only `projects` is imported. Nine projects; ids skip `project-3`.

| Source id | Asset folder | Slug | Default Explorer folder | Media |
|---|---|---|---|---|
| project-1 | coin_pusher | coin-pusher | Coin Pusher | 1 image |
| project-2 | emoji | megabox-emoji | MEGABOX × EMOJI | 3 images + 1 video |
| project-4 | beer_pushing_game | beer-happy-challenge | Beer Happy Challenge | 4 images |
| project-5 | monster_inc | monster-inc-cityplaza | Monster Inc × CityPlaza | 3 images |
| project-6 | nat_geo | nat-geo-rac-club | Nat Geo Kids RAC Club | 3 images |
| project-7 | bt21 | bt21-extensive-reading | Extensive Reading BT21 | 4 images |
| project-8 | jqvdm20 | jurlique-catching-game | Jurlique Catching Game | 4 images |
| project-9 | hrkr19 | helena-rubinstein-booth | Helena Rubinstein Booth | 5 images |
| project-10 | dior | dior-lip-glow | Dior Lip Glow | 5 images |

Totals: 32 images and 1 video across 9 projects.

### Known defects in the source

- `about.avatar` points at `assets/images/avatar.png`, which does not exist.
- `about.resume` points at `assets/resume.pdf`, which does not exist.
  Both are inside the `about` block, which is not imported, so both disappear.
- `assets/images/personal_project/img1.png` is referenced by no project. It is
  not imported. If it belongs to the coin pusher project, add it to that
  project's media list in `portfolio.json` afterwards.

## 4. Data model

`src/data/portfolio.json`, committed, sitting beside `resume.json`.

```json
{
  "projects": [
    {
      "slug": "dior-lip-glow",
      "folder": "Dior Lip Glow",
      "name": "Dior Lip Glow Face Detection",
      "category": "company",
      "tagline": "Gesture-controlled mini-game for Dior Lip Glow activation.",
      "description": "A Dior-branded mini-game using gesture detection ...",
      "tech": ["Unity", "C#"],
      "media": [
        {
          "file": "img1.jpg",
          "kind": "image",
          "src": "portfolio/dior-lip-glow/img1.jpg",
          "thumb": "portfolio/dior-lip-glow/thumbs/img1.jpg",
          "width": 1600,
          "height": 1067
        }
      ]
    }
  ],
  "source": "GBC_Portfolio@<short sha>",
  "updated": "2026-09-08"
}
```

`slug` is the URL and directory name, kebab-cased from the GBC asset folder.
`folder` is the display name shown in Explorer, kept short because the real
project names run long and some contain characters Windows forbids in a
filename. The script derives a sanitized default, capped at 32 characters so it
does not wrap in a 720 pixel Explorer window; the value is hand-editable
afterwards because this repo owns the file.

`src` and `thumb` are relative. The base prefix is applied at runtime the same
way `pdfHref` is built in `main.js`, so the site keeps working under
`/XPcomputer/`.

`width` and `height` let the viewer size its window before the file loads.

## 5. Import pipeline

Mirrors the resume pipeline, including the split between a pure transform and
the script that touches disk.

- `scripts/portfolio-parse.mjs` — pure. Given the text of `data.js`, returns the
  project records with slugs, folder names and media lists. No file IO.
- `scripts/sync-portfolio.mjs` — reads the GBC checkout, calls the parser,
  optimizes media, writes `public/portfolio/**` and `src/data/portfolio.json`.
- `npm run sync-portfolio` — wired in `package.json`.

Defaults to `../GBC_Portfolio`, overridable with `--repo <path>`. It fails
loudly if a referenced photo is missing rather than emitting a partial tree.

### Optimization targets

| Asset | Now | Target |
|---|---|---|
| 32 photos | 23 MB | max 1600 px long edge, JPEG q82, roughly 6 to 9 MB |
| Thumbnails | none | 160 px long edge, JPEG q70, under 1 MB |
| 1 video | 119 MB | H.264 720p, under 8 MB |
| Total | 142 MB | under 20 MB |

1600 px keeps images crisp on a high-DPI screen with the window maximized,
which is roughly 800 CSS pixels wide.

### Why the video is manual

GitHub rejects blobs over 100 MB, and Pages serves Git LFS pointers as plain
text, so the 119 MB source cannot ship in either form. Re-encoding needs
ffmpeg, which the script must not assume is installed. So:

- If `public/portfolio/megabox-emoji/video1.mp4` already exists, pass it through.
- If not, stop with the exact ffmpeg command printed in the error message.

Run once, never again.

### Dependency

`sharp`, added as a devDependency, for resizing and thumbnailing. It ships
prebuilt Windows binaries, so no compiler is required.

The deploy workflow runs install, test and build only, and never the sync
scripts. Optimized media and `portfolio.json` are committed, exactly as
`resume.json` and `resume-main.pdf` already are.

## 6. File system changes

`src/data/filesystem.js`.

- `buildFileSystem(resume, portfolio = { projects: [] })`. The default keeps the
  existing tests passing unchanged and renders an empty `My Pictures` when
  nothing has been imported.
- `My Pictures` loses its `portfolio.url` shortcut to Wix and gains one folder
  per project.
- A project folder node carries its project record, so the task pane can read
  the prose without a second lookup.
- Each media node carries `src`, `thumb`, `width`, `height` and `kind`, and
  opens `{ app: 'viewer', payload: { slug, index, slideshow: false } }`. The
  slide show link in section 7 is the only caller that passes `slideshow: true`.
- `readmeText` stops pointing `Portfolio:` at the external URL and points at
  `My Documents\My Pictures` instead, since after the cutover that URL is this
  site.

### New icons

`src/xp/icons/index.js` has no pictures folder, image or video icon. Three get
drawn as SVG in the same file, honouring the repo's no-Microsoft-artwork rule.

## 7. Explorer changes

`src/xp/apps/Explorer.js`.

- **Thumbnails view.** A third mode beside Icons and Details, in both the View
  menu and the Views toolbar button. An item with a `thumb` paints the image; an
  item without one falls back to its icon, so the mode is safe in any folder.
- **View auto-pick.** On navigation, Thumbnails is chosen when the folder has
  children and every one of them is media, Icons otherwise. A folder of folders,
  such as My Pictures itself, gets Icons. An explicit choice from the menu sticks
  for the life of that window and disables the auto-pick.
- **Task pane Details.** Inside a project folder it shows the tagline, the
  description and the tech tags. Clicking a file re-renders the group for that
  file, showing dimensions for an image. Today `renderTaskPane` is only called
  for the folder; the item click handler gains one call.
- **Slide show link.** A project folder gets `View as a slide show` under File
  and Folder Tasks, launching the viewer at index 0 in slide show mode.

## 8. Picture viewer

New `src/xp/apps/PictureViewer.js`, registered as `viewer`, named
`Windows Picture and Fax Viewer`.

- Opens sized to the media's stored dimensions, clamped to the desktop.
- Caption line shows the project name and position within the folder.
- Button strip: previous, next, and a best fit / actual size toggle.
- Left and right arrows navigate; Escape closes.
- At either end the corresponding button disables rather than wrapping, matching
  Explorer Back and Forward.
- Slide show mode auto-advances every 4 seconds, stops on any manual navigation,
  and stops at the last item.
- A `video` node renders a video element with native controls in the same
  window. It starts muted whenever the tray speaker is muted, so the existing
  sound toggle keeps meaning what it says.
- Media that fails to load shows an XP-style broken-image placeholder.

### Wiring

`src/xp/createDesktop.js`:

- `createDesktop(rootEl, { resume, portfolio, pdfHref, ... })`
- line 53: `buildFileSystem(resume, portfolio)`
- line 59: `portfolio` added to `ctx`
- one `registerPictureViewer(registry)` call alongside the existing seven

`src/main.js` imports `portfolio.json` and passes it in.

## 9. Discoverability

Four cheap touchpoints, because nine folders three levels deep is a poor front
door.

- The boot balloon tip mentions the portfolio as well as the resume.
- The Start menu already carries a `My Pictures` entry pointing at the right
  path, so it only needs the new pictures icon in place of the generic folder.
- The desktop gains a `My Pictures` shortcut beside Internet Explorer and My
  Documents, opening Explorer at that folder.
- The homepage nav bar gains a `Projects` link.

The homepage `Portfolio:` line stops being an external link and opens Explorer
at `My Pictures`. That needs a small extension to the click bridge in
`InternetExplorer.js`, which currently forwards `data-app` from the page but
drops any payload with it.

## 10. Wix cutover

Order matters, because the Wix address reaches `resume.json` from the Resume
repo rather than by hand. Editing `resume.json` directly is overwritten by the
next `npm run sync-resume`.

1. This work ships to `main`, deploys, and passes the QA checklist.
2. Edit `portfolio.tex` on Resume `main`, `bmo-job` and `non-tech-resume`,
   changing both the visible link text and the `\qrcode` target to
   `https://stephenyctsedev.github.io/XPcomputer/`.
3. Wait for the Resume CI to publish each rebuilt `resume-<branch>.pdf` to the
   `preview` branch.
4. Run `npm run sync-resume` here to pull the new `resume.json` and PDF.

Skipping step 4 leaves the Wix address on the homepage and inside the
downloadable PDF even after the LaTeX is correct.

### Do not delete the Wix site

Resumes already sent carry a QR code pointing at Wix, and those PDFs cannot be
recalled. Leave the site up with its homepage replaced by a short pointer to the
new address. Retire it much later, if ever.

## 11. Testing

Vitest with jsdom, sibling `.test.js` files, matching the existing layout.

- `scripts/portfolio-parse.test.mjs` — slug derivation, folder-name sanitizing
  of forbidden characters and over-long names, media classification as image or
  video, and a hard failure when a referenced photo is missing. Pure, so it needs
  no GBC checkout and writes nothing.
- `src/data/filesystem.test.js` — My Pictures builds nine folders; image nodes
  target the viewer with the right slug and index; an absent portfolio degrades
  to an empty folder.
- `src/xp/apps/Explorer.test.js` — Thumbnails paints images; the auto-pick
  chooses Thumbnails inside a media folder and Icons elsewhere; an explicit
  choice disables the auto-pick; the task pane shows project prose and updates
  on selection.
- `src/xp/apps/PictureViewer.test.js` — navigation stops at both ends; the fit
  toggle; the video branch renders a video element and respects mute; manual
  navigation cancels the slide show timer.

The README manual QA checklist gains portfolio lines: thumbnails render, the
viewer opens and navigates, the slide show advances and stops, the video plays
and respects mute, and the homepage Projects link opens My Pictures.

## 12. Error handling

| Case | Behaviour |
|---|---|
| Referenced photo missing at import | Script exits non-zero naming the file |
| Encoded video absent at import | Script exits non-zero printing the ffmpeg command |
| `portfolio.json` absent or empty at build | My Pictures renders as an empty folder; nothing throws |
| Media 404 at runtime | Viewer shows a broken-image placeholder |
| Thumbnail 404 at runtime | Explorer falls back to the file icon |

## 13. Out of scope

- Full-screen slide show chrome beyond the auto-advance timer.
- Rotate and zoom controls in the viewer.
- A custom domain. Worth doing later as its own task, since a redirect would
  then cover every resume branch without re-editing LaTeX.
- Keeping GBC_Portfolio deployed. If it stays up, its copy diverges on purpose.

## 14. Roadmap placement

The README roadmap has Solitaire, Pinball and a polish pass outstanding. This
slots ahead of Solitaire, since it is the item that actually retires Wix.
