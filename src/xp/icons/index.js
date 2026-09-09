// Our own XP-flavoured icons. Nothing here is copied from Microsoft artwork.
const svg = (body, viewBox = '0 0 32 32') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">${body}</svg>`;

export const icons = {
  ie: svg('<circle cx="16" cy="16" r="13" fill="#2f7fe0"/><circle cx="16" cy="16" r="9" fill="none" stroke="#fff" stroke-width="3"/><path d="M8 16h16" stroke="#fff" stroke-width="3"/><path d="M4 22c8 6 20 2 26-8" fill="none" stroke="#f5c400" stroke-width="2.5"/>'),
  computer: svg('<rect x="3" y="4" width="20" height="15" rx="1.5" fill="#d7d3c8" stroke="#6b6b6b"/><rect x="5" y="6" width="16" height="11" fill="#2a5db0"/><rect x="9" y="20" width="8" height="2" fill="#8a8a8a"/><rect x="7" y="22" width="12" height="2" fill="#bdbdbd"/><rect x="24" y="8" width="6" height="18" fill="#e6e2d6" stroke="#6b6b6b"/><rect x="25.5" y="10" width="3" height="1.5" fill="#444"/><circle cx="27" cy="23" r="1" fill="#3fbf3f"/>'),
  documents: svg('<path d="M2 8h10l3 3h15v16H2z" fill="#f2c94c" stroke="#b58a12"/><rect x="9" y="4" width="12" height="15" fill="#fff" stroke="#8a8a8a"/><path d="M11 8h8M11 11h8M11 14h6" stroke="#9aa" stroke-width="1"/><path d="M2 13h28v14H2z" fill="#f7d774" stroke="#b58a12"/>'),
  recycle: svg('<path d="M8 8h16l-2 20H10z" fill="#cfd8e3" stroke="#6a7c8f"/><path d="M12 10v16M16 10v16M20 10v16" stroke="#8fa3b8"/><rect x="6" y="5" width="20" height="3" fill="#b9c6d4" stroke="#6a7c8f"/><path d="M13 5l1-2h4l1 2" fill="none" stroke="#6a7c8f"/>'),
  folder: svg('<path d="M2 8h10l3 3h15v16H2z" fill="#f2c94c" stroke="#b58a12"/><path d="M2 13h28v14H2z" fill="#f7d774" stroke="#b58a12"/>'),
  pictures: svg('<path d="M2 8h10l3 3h15v16H2z" fill="#f2c94c" stroke="#b58a12"/><path d="M2 13h28v14H2z" fill="#f7d774" stroke="#b58a12"/><rect x="8" y="16" width="16" height="10" fill="#fff" stroke="#8a8a8a"/><circle cx="12" cy="19" r="1.6" fill="#f5c400"/><path d="M8 26l5-6 4 4 3-3 4 5z" fill="#4b9b4b"/>'),
  image: svg('<rect x="4" y="6" width="24" height="20" fill="#fff" stroke="#7a7a7a"/><rect x="6" y="8" width="20" height="16" fill="#cfe4f7"/><circle cx="11" cy="13" r="2" fill="#f5c400"/><path d="M6 24l6-8 5 5 4-4 5 7z" fill="#4b9b4b"/>'),
  video: svg('<rect x="3" y="7" width="20" height="18" rx="1.5" fill="#2b2b2b" stroke="#6b6b6b"/><path d="M23 14l6-4v12l-6-4z" fill="#4a4a4a" stroke="#6b6b6b"/><path d="M10 12l7 4-7 4z" fill="#fff"/>'),
  txt: svg('<path d="M7 2h13l6 6v22H7z" fill="#fff" stroke="#7a7a7a"/><path d="M20 2v6h6" fill="#e0e0e0" stroke="#7a7a7a"/><path d="M10 12h12M10 16h12M10 20h12M10 24h8" stroke="#666" stroke-width="1.2"/>'),
  pdf: svg('<path d="M7 2h13l6 6v22H7z" fill="#fff" stroke="#7a7a7a"/><path d="M20 2v6h6" fill="#e0e0e0" stroke="#7a7a7a"/><rect x="9" y="14" width="14" height="10" fill="#d33"/><text x="16" y="22" font-size="7" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">PDF</text>'),
  drive: svg('<rect x="3" y="10" width="26" height="12" rx="1" fill="#d9d9d9" stroke="#6b6b6b"/><rect x="5" y="12" width="18" height="8" fill="#a9a9a9"/><circle cx="26" cy="16" r="1.2" fill="#3fbf3f"/>'),
  floppy: svg('<rect x="4" y="4" width="24" height="24" rx="1" fill="#2b2b2b"/><rect x="9" y="4" width="14" height="9" fill="#cfcfcf"/><rect x="12" y="6" width="4" height="5" fill="#2b2b2b"/><rect x="8" y="18" width="16" height="10" fill="#e8e8e8"/>'),
  cd: svg('<circle cx="16" cy="16" r="13" fill="#d8e6f3" stroke="#7a8fa6"/><circle cx="16" cy="16" r="4" fill="#fff" stroke="#7a8fa6"/><path d="M6 12a11 11 0 0 1 8-7" fill="none" stroke="#fff" stroke-width="2"/>'),
  notepad: svg('<rect x="6" y="3" width="20" height="26" fill="#fff" stroke="#7a7a7a"/><rect x="6" y="3" width="20" height="5" fill="#3a7bd5"/><path d="M10 13h12M10 17h12M10 21h9" stroke="#666" stroke-width="1.2"/>'),
  url: svg('<rect x="6" y="3" width="20" height="26" fill="#fff" stroke="#7a7a7a"/><circle cx="16" cy="16" r="7" fill="#2f7fe0"/><path d="M9 16h14M16 9v14" stroke="#fff"/>'),
  exe: svg('<rect x="4" y="6" width="24" height="20" rx="2" fill="#e9e9e9" stroke="#6b6b6b"/><rect x="6" y="8" width="20" height="4" fill="#2a5db0"/><path d="M10 17h5v5h-5zM17 17h5v5h-5z" fill="#7aa9ee"/>'),
  mine: svg('<circle cx="16" cy="17" r="8" fill="#222"/><path d="M16 5v24M4 17h24M8 9l16 16M24 9L8 25" stroke="#222" stroke-width="2"/><circle cx="13" cy="14" r="2" fill="#fff"/>'),
  cards: svg('<rect x="5" y="8" width="14" height="19" rx="1.5" fill="#fff" stroke="#555" transform="rotate(-10 12 17)"/><rect x="13" y="6" width="14" height="19" rx="1.5" fill="#fff" stroke="#555" transform="rotate(8 20 15)"/><path d="M20 12l3 4-3 4-3-4z" fill="#d22"/>'),
  pinball: svg('<rect x="6" y="2" width="20" height="28" rx="6" fill="#1b1f3a" stroke="#6ee7ff"/><circle cx="16" cy="12" r="3" fill="#ff4fd8"/><circle cx="11" cy="18" r="2" fill="#6ee7ff"/><circle cx="21" cy="18" r="2" fill="#6ee7ff"/><circle cx="16" cy="25" r="1.8" fill="#eee"/>'),
  help: svg('<circle cx="16" cy="16" r="13" fill="#3a7bd5"/><text x="16" y="22" font-size="17" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">?</text>'),
  run: svg('<rect x="4" y="8" width="24" height="16" rx="2" fill="#fff" stroke="#6b6b6b"/><path d="M8 13h12M8 17h8" stroke="#666" stroke-width="1.5"/><path d="M22 16l4 3-4 3z" fill="#3a7bd5"/>'),
  controlpanel: svg('<rect x="4" y="6" width="24" height="20" rx="2" fill="#e9e9e9" stroke="#6b6b6b"/><circle cx="11" cy="14" r="3" fill="#3a7bd5"/><circle cx="21" cy="14" r="3" fill="#e0a020"/><rect x="8" y="20" width="16" height="3" fill="#9c9c9c"/>'),
  mail: svg('<rect x="3" y="8" width="26" height="17" fill="#fff" stroke="#6b6b6b"/><path d="M3 8l13 10 13-10" fill="none" stroke="#6b6b6b"/>'),
  user: svg('<circle cx="16" cy="11" r="6" fill="#f0c27b"/><path d="M4 30c1-8 6-11 12-11s11 3 12 11z" fill="#3a7bd5"/>'),
  speaker: svg('<path d="M6 12h6l6-5v18l-6-5H6z" fill="#555"/><path d="M21 11c3 3 3 7 0 10M24 8c5 5 5 11 0 16" fill="none" stroke="#555" stroke-width="2"/>'),
  speakerMuted: svg('<path d="M6 12h6l6-5v18l-6-5H6z" fill="#555"/><path d="M21 12l8 8M29 12l-8 8" stroke="#c33" stroke-width="2.5"/>'),
  shield: svg('<path d="M16 3l11 4v9c0 7-5 12-11 14C10 28 5 23 5 16V7z" fill="#e33" stroke="#900"/><text x="16" y="22" font-size="14" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">!</text>'),
  errorIcon: svg('<circle cx="16" cy="16" r="13" fill="#d33" stroke="#900"/><path d="M10 10l12 12M22 10L10 22" stroke="#fff" stroke-width="3"/>'),
  infoIcon: svg('<circle cx="16" cy="16" r="13" fill="#3a7bd5" stroke="#1b4f9c"/><path d="M16 13v10M16 9v1.5" stroke="#fff" stroke-width="3"/>'),
  questionIcon: svg('<circle cx="16" cy="16" r="13" fill="#3a7bd5" stroke="#1b4f9c"/><text x="16" y="22" font-size="17" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">?</text>'),
  arrowLeft: svg('<path d="M20 6L10 16l10 10" fill="none" stroke="#2a7a2a" stroke-width="4"/>'),
  arrowRight: svg('<path d="M12 6l10 10-10 10" fill="none" stroke="#2a7a2a" stroke-width="4"/>'),
  arrowUp: svg('<path d="M6 20l10-10 10 10" fill="none" stroke="#2a7a2a" stroke-width="4"/>'),
  stop: svg('<circle cx="16" cy="16" r="12" fill="#d33"/><path d="M10 10l12 12M22 10L10 22" stroke="#fff" stroke-width="3"/>'),
  refresh: svg('<path d="M25 14a10 10 0 1 0 2 8" fill="none" stroke="#2a7a2a" stroke-width="3"/><path d="M26 6v8h-8" fill="none" stroke="#2a7a2a" stroke-width="3"/>'),
  home: svg('<path d="M4 16L16 5l12 11" fill="none" stroke="#555" stroke-width="3"/><path d="M8 15v12h16V15" fill="#f5deb3" stroke="#555"/>'),
  search: svg('<circle cx="14" cy="14" r="8" fill="none" stroke="#3a7bd5" stroke-width="3"/><path d="M20 20l8 8" stroke="#3a7bd5" stroke-width="3"/>'),
  star: svg('<path d="M16 3l4 9 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1z" fill="#f5c400" stroke="#b58a12"/>'),
  clock: svg('<circle cx="16" cy="16" r="12" fill="#fff" stroke="#555"/><path d="M16 9v7l5 3" fill="none" stroke="#555" stroke-width="2"/>'),
  power: svg('<circle cx="16" cy="16" r="11" fill="#d33"/><path d="M16 9v7" stroke="#fff" stroke-width="3"/><path d="M11 12a7 7 0 1 0 10 0" fill="none" stroke="#fff" stroke-width="3"/>'),
  logoff: svg('<circle cx="16" cy="16" r="11" fill="#e0a020"/><path d="M12 16h8M17 12l4 4-4 4" fill="none" stroke="#fff" stroke-width="3"/>'),
  flag: svg('<path d="M8 4v24" stroke="#555" stroke-width="2"/><path d="M9 5h14l-3 5 3 5H9z" fill="#d33"/>'),
};

/** Inline SVG wrapped in a span sized `size` px. Unknown names fall back to the exe icon. */
export function iconEl(name, size = 32, className = '') {
  const span = document.createElement('span');
  span.className = `xp-ico ${className}`.trim();
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.innerHTML = icons[name] ?? icons.exe;
  return span;
}

export function iconDataUri(name) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(icons[name] ?? icons.exe)}`;
}
