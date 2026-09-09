// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  slugify, sanitizeFolderName, assetFolder, mediaKind, outputName,
  parseData, buildPortfolio, PROJECT_META,
} from './portfolio-parse.mjs';

const source = readFileSync(new URL('../tests/fixtures/gbc-portfolio/data.js', import.meta.url), 'utf8');

describe('primitives', () => {
  it('slugifies to lowercase kebab with no leading or trailing dashes', () => {
    expect(slugify('beer_pushing_game')).toBe('beer-pushing-game');
    expect(slugify('  Nat Geo!!  ')).toBe('nat-geo');
  });
  it('strips characters Windows forbids in a filename', () => {
    expect(sanitizeFolderName('MEGABOX × EMOJI "TIGER"')).toBe('MEGABOX × EMOJI TIGER');
    expect(sanitizeFolderName('a/b\\c:d*e?f<g>h|i')).toBe('abcdefghi');
  });
  it('truncates over-long names at the cap without a trailing dash or space', () => {
    const out = sanitizeFolderName('A Brand New Activation With A Very Long Name Indeed');
    expect(out.length).toBeLessThanOrEqual(32);
    expect(out).toBe('A Brand New Activation With A');
  });
  it('reads the asset folder out of a photo path', () => {
    expect(assetFolder('assets/images/coin_pusher/img1.png')).toBe('coin_pusher');
  });
  it('classifies media by extension', () => {
    expect(mediaKind('img1.PNG')).toBe('image');
    expect(mediaKind('video1.mp4')).toBe('video');
  });
  it('renames images to .jpg and leaves video alone', () => {
    expect(outputName('img1.png', 'image')).toBe('img1.jpg');
    expect(outputName('video1.mp4', 'video')).toBe('video1.mp4');
  });
});

describe('parseData', () => {
  it('returns the DATA object', () => {
    expect(parseData(source).projects).toHaveLength(3);
  });
  it('throws when DATA.projects is missing', () => {
    expect(() => parseData('const DATA = {};')).toThrow(/DATA.projects/);
  });
});

describe('buildPortfolio', () => {
  const portfolio = buildPortfolio(source, { sourceRef: 'GBC_Portfolio@abc1234', updated: '2026-09-08' });

  it('uses the curated slug and folder for a known asset folder', () => {
    const p = portfolio.projects[0];
    expect(p.slug).toBe(PROJECT_META.coin_pusher.slug);
    expect(p.folder).toBe('Coin Pusher');
  });
  it('falls back to a derived slug and a sanitized name for an unknown folder', () => {
    const p = portfolio.projects[2];
    expect(p.slug).toBe('brand-new');
    expect(p.folder).toBe('A Brand New Activation With A');
  });
  it('builds media paths under the project slug and drops the thumb for video', () => {
    const media = portfolio.projects[1].media;
    expect(media[0]).toMatchObject({
      file: 'img1.jpg', kind: 'image',
      src: 'portfolio/megabox-emoji/img1.jpg',
      thumb: 'portfolio/megabox-emoji/thumbs/img1.jpg',
      source: 'assets/images/emoji/img1.jpg',
    });
    expect(media[1]).toMatchObject({ file: 'video1.mp4', kind: 'video', thumb: null });
  });
  it('carries the prose and tech across unchanged', () => {
    expect(portfolio.projects[0].tagline).toBe('Coin pusher game built with PlayCanvas and JavaScript.');
    expect(portfolio.projects[0].tech).toEqual(['PlayCanvas', 'JavaScript']);
    expect(portfolio.projects[0].category).toBe('personal');
  });
  it('records the source reference and date', () => {
    expect(portfolio.source).toBe('GBC_Portfolio@abc1234');
    expect(portfolio.updated).toBe('2026-09-08');
  });
  it('throws when a project has no photos', () => {
    expect(() => buildPortfolio('const DATA = { projects: [{ id: "p", photos: [] }] };')).toThrow(/no photos/);
  });
  it('throws when two projects resolve to the same slug', () => {
    const dupe = 'const DATA = { projects: ['
      + '{ id: "a", name: "A", tech: [], photos: ["assets/images/dior/img1.jpg"] },'
      + '{ id: "b", name: "B", tech: [], photos: ["assets/images/dior/img2.jpg"] }] };';
    expect(() => buildPortfolio(dupe)).toThrow(/duplicate slug/);
  });
});
