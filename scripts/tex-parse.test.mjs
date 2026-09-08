// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  stripComments, readGroup, unescapeLatex, parseHeader, parseAboutMe, parseContact,
  parseEducation, parseExperience, parseExpertise, parseLanguages, parsePortfolio,
  deriveDisplayName, buildResume,
} from './tex-parse.mjs';

const fx = (name) => readFileSync(new URL(`../tests/fixtures/resume-tex/${name}.tex`, import.meta.url), 'utf8');
const files = Object.fromEntries(
  ['header', 'aboutme', 'contact', 'education', 'experience', 'expertise', 'language', 'portfolio']
    .map((n) => [`${n}.tex`, fx(n)]),
);

describe('primitives', () => {
  it('strips % comments but keeps escaped \\%', () => {
    expect(stripComments('a \\% b % comment\nc')).toBe('a \\% b \nc');
  });
  it('reads a nested brace group', () => {
    expect(readGroup('x{a{b}c}y', 1)).toEqual({ content: 'a{b}c', end: 8 });
  });
  it('unescapes common LaTeX', () => {
    expect(unescapeLatex('C\\#  \\& Node.js\\\\[3pt] 2018 -- 2020 {\\bfseries X}')).toBe('C# & Node.js 2018 – 2020 X');
  });
});

describe('sections', () => {
  it('parses header', () => {
    expect(parseHeader(files['header.tex'])).toEqual({ fullName: 'YIU CHUNG TSE, STEPHEN', title: 'Game Programmer' });
  });
  it('parses about me as one clean paragraph', () => {
    const s = parseAboutMe(files['aboutme.tex']);
    expect(s.startsWith('As a passionate and adaptable software developer')).toBe(true);
    expect(s.endsWith('as a software programmer.')).toBe(true);
    expect(s).not.toMatch(/[\\%{}]/);
  });
  it('parses contact', () => {
    expect(parseContact(files['contact.tex'])).toEqual({
      phone: '(204) 227-0624',
      email: 'stephenyctsedev@gmail.com',
      location: 'Winnipeg, Manitoba, Canada',
      linkedin: 'https://www.linkedin.com/in/stephenyctse/',
    });
  });
  it('parses education', () => {
    expect(parseEducation(files['education.tex'])).toEqual([
      { year: '2018', degree: 'Higher Diploma in Game Software Development', school: 'Hong Kong Institute of Vocational Education (Tsing Yi, Hong Kong)' },
      { year: '2013', degree: 'Diploma in Vocational Education (Information Technology)', school: 'Youth College (Kwai Chung, Hong Kong)' },
    ]);
  });
  it('parses experience entries with bullets', () => {
    const jobs = parseExperience(files['experience.tex']);
    expect(jobs).toHaveLength(4);
    expect(jobs[0]).toMatchObject({ period: '2023 – Present', title: 'Store Associate', company: 'Sun Wah Supermarket, Winnipeg, Canada' });
    expect(jobs[0].bullets).toHaveLength(4);
    expect(jobs[3].title).toBe('Game Programmer');
    expect(jobs[3].bullets[0]).toMatch(/^Develop interactive photo\/video booths/);
  });
  it('parses expertise table cells', () => {
    expect(parseExpertise(files['expertise.tex'])).toEqual(['Unity', 'SQL', 'Java', 'PHP', 'JavaScript', 'Python', 'C#', 'Node.js', 'PlayCanvas', 'Socket.IO']);
  });
  it('parses languages', () => {
    expect(parseLanguages(files['language.tex'])).toEqual([
      { name: 'Cantonese', level: 'Native Speaker' }, { name: 'English', level: 'Basic' }, { name: 'Mandarin', level: 'Advanced' },
    ]);
  });
  it('parses portfolio url', () => {
    expect(parsePortfolio(files['portfolio.tex'])).toBe('https://stephenyctse.wixsite.com/portfolio');
  });
});

describe('buildResume', () => {
  it('derives the display name', () => {
    expect(deriveDisplayName('YIU CHUNG TSE, STEPHEN')).toBe('Stephen Tse');
  });
  it('excludes the phone by default and includes it on request', () => {
    const r = buildResume(files, { updated: '2026-09-07' });
    expect(r.contact.phone).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('227-0624');
    expect(r.displayName).toBe('Stephen Tse');
    expect(r.sourceBranch).toBe('main');
    expect(r.updated).toBe('2026-09-07');
    expect(buildResume(files, { includePhone: true }).contact.phone).toBe('(204) 227-0624');
  });
  it('throws naming the missing section instead of writing partial data', () => {
    expect(() => buildResume({ ...files, 'experience.tex': '' })).toThrow(/experience/);
  });
});
