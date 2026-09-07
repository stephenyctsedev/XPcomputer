import { iconEl } from '../icons/index.js';

export function registerAdobeReader(registry) {
  registry.register('reader', { name: 'Adobe Reader', icon: 'pdf', launch: openAdobeReader });
}

export function openAdobeReader(ctx) {
  const { wm, pdfHref, openExternal } = ctx;
  const body = document.createElement('div');
  body.className = 'xp-reader';
  body.innerHTML = `
    <div class="xp-reader-toolbar">
      <a class="xp-tb" href="${pdfHref}" download="Stephen-Tse-Resume.pdf"><span class="xp-tb-ico"></span>Save a Copy</a>
      <button class="xp-tb" data-cmd="newtab">Open in new tab</button>
      <span class="xp-reader-hint">resume-main.pdf</span>
    </div>
    <div class="xp-reader-page">
      <iframe title="resume.pdf"></iframe>
      <div class="xp-reader-fallback" hidden>
        <p>This browser cannot display PDF files inside a window.</p>
        <p><a href="${pdfHref}" download="Stephen-Tse-Resume.pdf">Download resume-main.pdf</a></p>
      </div>
    </div>`;
  body.querySelector('.xp-tb-ico').append(iconEl('pdf', 16));
  const iframe = body.querySelector('iframe');
  const fallback = body.querySelector('.xp-reader-fallback');
  const showFallback = (show) => { iframe.hidden = show; fallback.hidden = !show; };

  if (navigator.pdfViewerEnabled === false) {
    showFallback(true);
  } else {
    let loaded = false;
    iframe.addEventListener('load', () => { loaded = true; showFallback(false); });
    iframe.src = pdfHref;
    setTimeout(() => { if (!loaded) showFallback(true); }, 4000);
  }
  body.querySelector('[data-cmd="newtab"]').addEventListener('click', () => openExternal(pdfHref));
  return wm.open({ appId: 'reader', title: 'resume.pdf - Adobe Reader', icon: 'pdf', width: 760, height: 640, minWidth: 420, minHeight: 320, content: body });
}
