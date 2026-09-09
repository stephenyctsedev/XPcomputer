import { describe, it, expect } from 'vitest';
import resume from '../../data/resume.json';
import { renderHomepage } from './Homepage.js';

const opts = { pdfHref: '/XPcomputer/resume/resume-main.pdf', repoUrl: 'https://github.com/stephenyctsedev/XPcomputer', visitors: 42 };

describe('renderHomepage', () => {
  const html = renderHomepage(resume, opts);

  it('renders every resume section', () => {
    expect(html).toContain(resume.displayName);
    expect(html).toContain(resume.title);
    expect(html).toContain(resume.summary.slice(0, 40));
    for (const job of resume.experience) { expect(html).toContain(job.title); expect(html).toContain(job.bullets[0]); }
    for (const skill of resume.expertise) expect(html).toContain(skill);
    for (const e of resume.education) expect(html).toContain(e.degree);
    for (const l of resume.languages) expect(html).toContain(`${l.name}: ${l.level}`);
    expect(html).toContain(`mailto:${resume.contact.email}`);
    expect(html).toContain(resume.contact.linkedin);
    expect(html).toContain(`Last updated: ${resume.updated}`);
  });
  it('links the PDF through the reader app and the repo externally', () => {
    expect(html).toMatch(/<a[^>]+href="\/XPcomputer\/resume\/resume-main.pdf"[^>]+data-app="reader"/);
    expect(html).toContain(opts.repoUrl);
  });
  it('shows a six digit visitor counter', () => {
    const digits = [...html.matchAll(/<span class="digit">(\d)<\/span>/g)].map((m) => m[1]).join('');
    expect(digits).toBe('000042');
  });
  it('never shows the phone number or the legal full name', () => {
    expect(html).not.toMatch(/\(\d{3}\) \d{3}-\d{4}/);
    expect(html).not.toContain(resume.fullName);
  });
  it('escapes HTML in content', () => {
    expect(renderHomepage({ ...resume, displayName: '<b>x</b>' }, opts)).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
  it('links Projects and Portfolio into My Pictures rather than off-site', () => {
    const html = renderHomepage(resume, { pdfHref: '/x.pdf', repoUrl: 'https://example.com' });
    expect(html).toContain('data-app="explorer"');
    expect(html).toContain('data-path="C:\\Documents and Settings\\Stephen\\My Documents\\My Pictures"');
    expect(html).toContain('>Projects<');
    expect(html).not.toContain(resume.contact.portfolio);
  });
});
