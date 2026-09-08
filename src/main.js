import './styles/base.css';
import { pickMode, detectEnv } from './modes.js';
import { createDesktop } from './xp/createDesktop.js';
import resume from './data/resume.json';

const REPO_URL = 'https://github.com/stephenyctsedev/XPcomputer';
const pdfHref = `${import.meta.env.BASE_URL}resume/resume-main.pdf`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mode = pickMode(detectEnv());

const screenEl = document.createElement('div');
const desktop = createDesktop(screenEl, { resume, pdfHref, repoUrl: REPO_URL, reducedMotion });

if (mode === 'room') {
  // Phase 2 replaces this branch with `import('./room/index.js')` and the camera wiring from the spec §3.2.
  console.info('[XPcomputer] The 3D room ships in Phase 2; showing the flat desktop.');
}
mountFlat(document.querySelector('#app'), screenEl, desktop, mode === 'flat');

/** Center and scale the 1024x768 screen to the viewport; interactive immediately; boots on load. */
function mountFlat(app, screen, desk, showNotice) {
  const stage = document.createElement('div');
  stage.className = 'flat-stage';
  stage.append(screen);
  app.append(stage);
  if (showNotice) {
    const note = document.createElement('div');
    note.className = 'flat-notice';
    note.textContent = 'The 3D room needs a desktop browser with WebGL2. The computer itself works everywhere.';
    stage.append(note);
  }
  const fit = () => {
    const scale = Math.min(innerWidth / 1024, (innerHeight - (showNotice ? 28 : 0)) / 768);
    screen.style.transform = `scale(${scale})`;
  };
  fit();
  addEventListener('resize', fit);
  desk.setInteractive(true);
  desk.powerOn();
}
