import { iconEl } from '../icons/index.js';

export const SLIDE_MS = 4000;
const MAX_W = 900;
const MAX_H = 620;
const VIDEO_SIZE = { width: 800, height: 600 };

export function registerPictureViewer(registry) {
  registry.register('viewer', { name: 'Windows Picture and Fax Viewer', icon: 'image', launch: openPictureViewer });
}

/** Window big enough for the image at best fit, with room for the caption strip and buttons. */
function windowSize(item) {
  if (item.kind === 'video' || !item.width || !item.height) return VIDEO_SIZE;
  const scale = Math.min(1, MAX_W / item.width, MAX_H / item.height);
  return { width: Math.round(item.width * scale) + 24, height: Math.round(item.height * scale) + 96 };
}

export function openPictureViewer(ctx, payload = {}) {
  const { wm, portfolio, mediaBase = '', sounds, dialogs } = ctx;
  const project = (portfolio?.projects ?? []).find((p) => p.slug === payload.slug);
  if (!project || project.media.length === 0) {
    return dialogs.message({
      title: 'Windows Picture and Fax Viewer', kind: 'error',
      text: 'Windows cannot open this picture. It may have been moved or deleted.',
    });
  }

  let index = Math.min(Math.max(Number(payload.index) || 0, 0), project.media.length - 1);
  let fit = true;
  let timer = null;

  const body = document.createElement('div');
  body.className = 'xp-viewer';
  body.innerHTML = `
    <div class="xp-viewer-stage xp-viewer-fit" tabindex="0"></div>
    <div class="xp-viewer-caption"></div>
    <div class="xp-viewer-bar">
      <button class="xp-tb" data-cmd="prev"><span class="xp-tb-ico" data-icon="arrowLeft"></span>Previous</button>
      <button class="xp-tb" data-cmd="next">Next<span class="xp-tb-ico" data-icon="arrowRight"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="fit">Actual Size</button>
    </div>`;
  for (const holder of body.querySelectorAll('.xp-tb-ico')) holder.append(iconEl(holder.dataset.icon, 16));

  const stage = body.querySelector('.xp-viewer-stage');
  const caption = body.querySelector('.xp-viewer-caption');
  const button = (cmd) => body.querySelector(`[data-cmd="${cmd}"]`);

  const win = wm.open({
    appId: 'viewer', title: `${project.media[index].file} - Windows Picture and Fax Viewer`, icon: 'image',
    minWidth: 320, minHeight: 240, content: body, ...windowSize(project.media[index]),
  });

  function stopSlideshow() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  function scheduleSlide() {
    stopSlideshow();
    if (index >= project.media.length - 1) return;
    timer = setTimeout(() => { index += 1; render(); scheduleSlide(); }, SLIDE_MS);
  }

  function go(delta) {
    const next = index + delta;
    if (next < 0 || next >= project.media.length) return;
    stopSlideshow();
    index = next;
    render();
  }

  function render() {
    const item = project.media[index];
    stage.replaceChildren();
    stage.classList.toggle('xp-viewer-fit', fit);

    if (item.kind === 'video') {
      const video = document.createElement('video');
      video.src = `${mediaBase}${item.src}`;
      video.controls = true;
      // The tray speaker is the one place sound is turned on and off; honour it here too.
      video.muted = Boolean(sounds?.isMuted?.());
      stage.append(video);
    } else {
      const image = document.createElement('img');
      image.src = `${mediaBase}${item.src}`;
      image.alt = `${project.name} screenshot ${index + 1}`;
      image.addEventListener('error', () => {
        const broken = document.createElement('div');
        broken.className = 'xp-viewer-broken';
        broken.textContent = 'This picture could not be displayed.';
        stage.replaceChildren(broken);
      });
      stage.append(image);
    }

    caption.textContent = `${project.name} — ${index + 1} of ${project.media.length}`;
    win.setTitle(`${item.file} - Windows Picture and Fax Viewer`);
    button('prev').disabled = index === 0;
    button('next').disabled = index === project.media.length - 1;
    button('fit').textContent = fit ? 'Actual Size' : 'Best Fit';
  }

  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (cmd === 'prev') go(-1);
    else if (cmd === 'next') go(1);
    else if (cmd === 'fit') { fit = !fit; render(); }
  });
  win.el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'Escape') win.close();
  });

  render();
  // The stage takes focus so the arrow keys work as soon as the window opens.
  stage.focus();
  if (payload.slideshow) scheduleSlide();
  return win;
}
