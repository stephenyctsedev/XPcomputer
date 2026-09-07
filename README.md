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

## Build and deploy

    npm run build        # dist/

Pushing to `main` runs tests, builds, and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). Pages source must be set to "GitHub Actions".

## Licensing

Code is MIT. Uses three.js (MIT) and XP.css (MIT). No Microsoft artwork,
sounds, logos or card art are included; everything is drawn or synthesized here.
