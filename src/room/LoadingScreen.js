/** Black BIOS-style overlay shown until the room renders its first frame. */
export function createLoadingScreen(container) {
  const el = document.createElement('div');
  el.className = 'room-loading';
  el.innerHTML = '<pre class="room-loading-text"></pre>';
  container.append(el);
  const pre = el.querySelector('pre');
  return {
    el,
    log(line) { pre.textContent += `${line}\n`; },
    done() {
      el.classList.add('room-loading-done');
      setTimeout(() => el.remove(), 700);
    },
  };
}
