import homepageCss from './homepage.css?raw';
import { PATHS } from '../../data/filesystem.js';

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Early-2000s personal homepage as a full HTML document for an <iframe srcdoc>. */
export function renderHomepage(resume, { pdfHref, repoUrl, visitors = 1337 } = {}) {
  const { displayName, title, summary, contact, expertise, languages, education, experience, updated } = resume;
  const half = Math.ceil(expertise.length / 2);
  const columns = [expertise.slice(0, half), expertise.slice(half)];
  const counter = String(visitors).padStart(6, '0').split('').map((d) => `<span class="digit">${d}</span>`).join('');
  const pdfLink = (label) => `<a class="pdf" href="${esc(pdfHref)}" data-app="reader" target="_blank" rel="noopener">${label}</a>`;
  const external = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  const PICTURES = `${PATHS.myDocuments}\\My Pictures`;
  const pictures = (label) => `<a href="#projects" data-app="explorer" data-path="${esc(PICTURES)}">${esc(label)}</a>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(displayName)}'s Homepage</title><style>${homepageCss}</style></head>
<body>
<table class="page" width="760" cellpadding="0" cellspacing="0">
<tr><td class="banner">
  <div class="marquee"><span>*** Welcome to my homepage! *** You are visitor number ${counter} *** Thanks for stopping by! ***</span></div>
  <h1>${esc(displayName)}</h1>
  <h2>${esc(title)} &middot; ${esc(contact.location)}</h2>
</td></tr>
<tr><td class="construction">&#9888; This site is under construction &#9888; Best viewed in Internet Explorer 6 at 1024&times;768</td></tr>
<tr><td class="nav"><a href="#about">About Me</a> | <a href="#experience">Experience</a> | ${pictures('Projects')} | <a href="#expertise">Expertise</a> | <a href="#education">Education</a> | <a href="#contact">Contact</a> | ${pdfLink('Download my resume (PDF)')}</td></tr>
<tr><td class="content">
  <h3 id="about">About Me</h3>
  <p>${esc(summary)}</p>
  <h3 id="experience">Experience</h3>
  <table class="jobs" width="100%" cellpadding="6" cellspacing="0">
  ${experience.map((job) => `<tr><td class="period">${esc(job.period)}</td><td><b>${esc(job.title)}</b><br><i>${esc(job.company)}</i><ul>${job.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></td></tr>`).join('\n  ')}
  </table>
  <h3 id="expertise">Expertise</h3>
  <table class="skills" cellpadding="2"><tr>${columns.map((col) => `<td><ul>${col.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></td>`).join('')}</tr></table>
  <h3 id="education">Education</h3>
  <table class="edu" cellpadding="4">${education.map((e) => `<tr><td class="period">${esc(e.year)}</td><td><b>${esc(e.degree)}</b><br>${esc(e.school)}</td></tr>`).join('')}</table>
  <h3>Languages</h3>
  <ul>${languages.map((l) => `<li>${esc(l.name)}: ${esc(l.level)}</li>`).join('')}</ul>
  <h3 id="contact">Contact &amp; Links</h3>
  <ul class="links">
    <li>E-mail: <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>
    <li>LinkedIn: ${external(contact.linkedin, contact.linkedin)}</li>
    <li>Portfolio: ${pictures('My project screenshots')}</li>
    <li>${pdfLink('Download my resume (PDF)')}</li>
    <li>${external(repoUrl, "View this site's source on GitHub")}</li>
  </ul>
</td></tr>
<tr><td class="footer">Last updated: ${esc(updated)} &middot; Made with Notepad and patience &middot; &copy; ${esc(displayName)}</td></tr>
</table>
</body></html>`;
}
