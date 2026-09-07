// Pure LaTeX extraction for the Resume repo's known macros. No filesystem access here.

export function stripComments(tex) {
  return tex.split('\n').map((line) => {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\\') { out += ch + (line[i + 1] ?? ''); i++; continue; }
      if (ch === '%') break;
      out += ch;
    }
    return out;
  }).join('\n');
}

/** str[start] must be "{". Returns the inner text and the index after the matching "}". */
export function readGroup(str, start) {
  if (str[start] !== '{') throw new Error(`expected "{" at index ${start}`);
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\') { i++; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { content: str.slice(start + 1, i), end: i + 1 };
    }
  }
  throw new Error('unbalanced braces');
}

export function readArgs(str, start, count) {
  let i = start;
  const args = [];
  for (let k = 0; k < count; k++) {
    while (i < str.length && /\s/.test(str[i])) i++;
    const g = readGroup(str, i);
    args.push(g.content);
    i = g.end;
  }
  return { args, end: i };
}

export function unescapeLatex(s) {
  return s
    .replace(/\\\\(\[[^\]]*\])?/g, ' ')                       // "\\" and "\\[5pt]" line breaks
    .replace(/\\#/g, '#').replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\_/g, '_').replace(/\\\$/g, '$')
    .replace(/---/g, '—').replace(/--/g, '–')
    .replace(/\\fontsize\{[^}]*\}\{[^}]*\}/g, ' ')             // two-argument command, drop both
    .replace(/\\(?:color|textcolor|vspace|hspace|href|qrcode)(\[[^\]]*\])?\{[^}]*\}/g, ' ') // drop first argument
    .replace(/\\[a-zA-Z]+\*?/g, ' ')                           // any remaining command name
    .replace(/\\ /g, ' ')                                      // control space
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHeader(tex) {
  const src = stripComments(tex);
  const name = src.match(/\\bfseries\\color\{darktext\}([^}]+)\}/)?.[1] ?? '';
  const title = src.match(/\\large\\color\{darktext\}([^}]+)\}/)?.[1] ?? '';
  return { fullName: unescapeLatex(name), title: unescapeLatex(title) };
}

export function parseAboutMe(tex) {
  const src = stripComments(tex);
  const i = src.indexOf('{\\normalsize');
  return i < 0 ? '' : unescapeLatex(readGroup(src, i).content);
}

export function parseContact(tex) {
  const src = stripComments(tex);
  const phone = src.match(/\\faPhone\{\}\\enspace\{\}([^\\\n]+)/)?.[1] ?? '';
  const location = src.match(/\\faMapMarker\{\}\\enspace\{\}([^\\\n]+)/)?.[1] ?? '';
  const email = src.match(/mailto:([^}]+)\}/)?.[1] ?? '';
  const linkedin = src.match(/\\href\{(https?:\/\/[^}]*linkedin[^}]*)\}/)?.[1] ?? '';
  return { phone: unescapeLatex(phone), email: email.trim(), location: unescapeLatex(location), linkedin: linkedin.trim() };
}

export function parseEducation(tex) {
  const src = stripComments(tex);
  const years = [...src.matchAll(/\{\\itshape\s*([^}]*)\}/g)];
  return years.map((m, k) => {
    const segStart = m.index + m[0].length;
    const segEnd = k + 1 < years.length ? years[k + 1].index : src.length;
    const seg = src.slice(segStart, segEnd);
    const gi = seg.indexOf('{\\color{eduBlue}');
    if (gi < 0) throw new Error(`education entry ${m[1]}: degree group not found`);
    const g = readGroup(seg, gi);
    const rest = seg.slice(g.end).replace(/^\s*\\par\s*\\vspace\{[^}]*\}/, '');
    return { year: unescapeLatex(m[1]), degree: unescapeLatex(g.content), school: unescapeLatex(rest.split('\\par')[0]) };
  });
}

export function parseExperience(tex) {
  const src = stripComments(tex);
  const out = [];
  let pos = src.indexOf('\\expEntry');
  while (pos >= 0) {
    const { args, end } = readArgs(src, pos + '\\expEntry'.length, 4);
    const [period, title, company, items] = args;
    out.push({
      period: unescapeLatex(period),
      title: unescapeLatex(title),
      company: unescapeLatex(company),
      bullets: items.split('\\item').map(unescapeLatex).filter(Boolean),
    });
    pos = src.indexOf('\\expEntry', end);
  }
  return out;
}

export function parseExpertise(tex) {
  return stripComments(tex).split('\n')
    .filter((line) => line.includes('&'))
    .flatMap((line) => line.split('&').map(unescapeLatex))
    .filter(Boolean);
}

export function parseLanguages(tex) {
  const src = stripComments(tex);
  const i = src.indexOf('{\\small');
  const body = i >= 0 ? readGroup(src, i).content : src;
  return body.split('\n').map(unescapeLatex).filter((l) => l.includes(':')).map((l) => {
    const [name, ...rest] = l.split(':');
    return { name: name.trim(), level: rest.join(':').trim() };
  });
}

export function parsePortfolio(tex) {
  return stripComments(tex).match(/\\href\{([^}]+)\}/)?.[1]?.trim() ?? '';
}

const titleCase = (s) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** "YIU CHUNG TSE, STEPHEN" -> "Stephen Tse" (given name after the comma + last word before it). */
export function deriveDisplayName(fullName) {
  const [before, after] = fullName.split(',').map((s) => s.trim());
  if (!after) return titleCase(fullName);
  return titleCase(`${after} ${before.split(/\s+/).pop()}`);
}

export function validateResume(r) {
  const missing = [];
  const need = (ok, name) => { if (!ok) missing.push(name); };
  need(r.fullName, 'fullName'); need(r.title, 'title'); need(r.summary, 'summary');
  need(r.contact.email, 'contact.email'); need(r.contact.location, 'contact.location');
  need(r.contact.linkedin, 'contact.linkedin'); need(r.contact.portfolio, 'contact.portfolio');
  need(r.expertise.length, 'expertise'); need(r.languages.length, 'languages');
  need(r.education.length, 'education'); need(r.experience.length, 'experience');
  r.experience.forEach((e, i) => need(e.period && e.title && e.company && e.bullets.length, `experience[${i}]`));
  return missing;
}

/** files: { 'header.tex': string, ... } (all eight). Throws if any section is empty. */
export function buildResume(files, { includePhone = false, displayName, sourceBranch = 'main', updated } = {}) {
  const header = parseHeader(files['header.tex'] ?? '');
  const contact = parseContact(files['contact.tex'] ?? '');
  const resume = {
    fullName: header.fullName,
    displayName: displayName || deriveDisplayName(header.fullName),
    title: header.title,
    summary: parseAboutMe(files['aboutme.tex'] ?? ''),
    contact: {
      email: contact.email,
      location: contact.location,
      linkedin: contact.linkedin,
      portfolio: parsePortfolio(files['portfolio.tex'] ?? ''),
      ...(includePhone ? { phone: contact.phone } : {}),
    },
    expertise: parseExpertise(files['expertise.tex'] ?? ''),
    languages: parseLanguages(files['language.tex'] ?? ''),
    education: parseEducation(files['education.tex'] ?? ''),
    experience: parseExperience(files['experience.tex'] ?? ''),
    sourceBranch,
    updated: updated ?? new Date().toISOString().slice(0, 10),
  };
  const missing = validateResume(resume);
  if (missing.length) throw new Error(`Resume parse incomplete, empty sections: ${missing.join(', ')}`);
  return resume;
}
