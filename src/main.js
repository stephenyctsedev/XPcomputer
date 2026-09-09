import './styles/base.css';
import { pickMode, detectEnv } from './modes.js';
import { createDesktop } from './xp/createDesktop.js';
import resume from './data/resume.json';
import portfolio from './data/portfolio.json';

const REPO_URL = 'https://github.com/stephenyctsedev/XPcomputer';
const pdfHref = `${import.meta.env.BASE_URL}resume/resume-main.pdf`;
const mediaBase = import.meta.env.BASE_URL;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = document.querySelector('#app');
const mode = pickMode(detectEnv());

const screenEl = document.createElement('div');
const desktop = createDesktop(screenEl, { resume, portfolio, pdfHref, mediaBase, repoUrl: REPO_URL, reducedMotion });

(async () => {
  if (mode === 'room') {
    try {
      const { mountRoom } = await import('./room/mount.js');
      await mountRoom(app, screenEl, desktop, { reducedMotion });
      return;
    } catch (err) {
      console.error('[XPcomputer] 3D room failed to start; falling back to the flat desktop.', err);
      app.replaceChildren();
    }
  }
  mountFlat(app, screenEl, desktop, mode === 'flat');
})();

/** Center and scale the 1024x768 screen to the viewport; interactive immediately; boots on load. */
function mountFlat(root, screen, desk, showNotice) {
  const stage = document.createElement('div');
  stage.className = 'flat-stage';
  stage.append(screen);
  root.append(stage);
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
