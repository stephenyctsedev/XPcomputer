import { describe, it, expect } from 'vitest';
import resume from './resume.json';
import { buildFileSystem, resolvePath, parentPath, PATHS } from './filesystem.js';

describe('fake file system', () => {
  const fs = buildFileSystem(resume);

  it('has the three drives and shared documents under My Computer', () => {
    expect(resolvePath(fs, PATHS.myComputer)).toBe(fs.root);
    expect(fs.root.children.map((c) => c.name)).toEqual(['3½ Floppy (A:)', 'Local Disk (C:)', 'CD Drive (D:)', 'Shared Documents']);
    expect(resolvePath(fs, 'A:').open).toMatchObject({ app: 'error', payload: { buttons: ['Retry', 'Cancel'] } });
  });
  it('generates one project file per job with the job details', () => {
    const projects = resolvePath(fs, `${PATHS.myDocuments}\\Projects`);
    expect(projects.children).toHaveLength(resume.experience.length);
    const first = projects.children[0];
    expect(first.name).toBe('Sun Wah Supermarket.txt');
    expect(first.open.app).toBe('notepad');
    expect(first.open.payload.text).toContain(resume.experience[0].bullets[0]);
    expect(first.path).toBe(`${PATHS.myDocuments}\\Projects\\Sun Wah Supermarket.txt`);
  });
  it('maps executables to apps and documents to viewers', () => {
    expect(resolvePath(fs, 'C:\\WINDOWS\\system32\\sol.exe').open).toEqual({ app: 'sol' });
    expect(resolvePath(fs, `${PATHS.myDocuments}\\resume.pdf`).open).toEqual({ app: 'reader' });
  });
  it('walks parents up to My Computer or Recycle Bin', () => {
    expect(parentPath('C:\\WINDOWS\\system32')).toBe('C:\\WINDOWS');
    expect(parentPath('C:')).toBe(PATHS.myComputer);
    expect(parentPath(PATHS.myComputer)).toBeNull();
    expect(parentPath('Recycle Bin\\old_resume_2018.doc')).toBe(PATHS.recycleBin);
    expect(resolvePath(fs, PATHS.recycleBin).children).toHaveLength(2);
    expect(resolvePath(fs, 'C:\\Nope')).toBeNull();
  });
  it('never leaks the phone number into generated text', () => {
    expect(JSON.stringify(fs)).not.toMatch(/\(\d{3}\) \d{3}-\d{4}/);
  });
});

describe('portfolio folders under My Pictures', () => {
  const portfolio = {
    projects: [
      {
        slug: 'dior-lip-glow', folder: 'Dior Lip Glow', name: 'Dior Lip Glow Face Detection',
        category: 'company', tagline: 'Gesture-controlled mini-game.', description: 'A Dior-branded mini-game.',
        tech: ['Unity', 'C#'],
        media: [
          { file: 'img1.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img1.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 },
          { file: 'clip.mp4', kind: 'video', src: 'portfolio/dior-lip-glow/clip.mp4', thumb: null },
        ],
      },
    ],
  };
  const fs = buildFileSystem(resume, portfolio);
  const pictures = () => resolvePath(fs, `${PATHS.myDocuments}\\My Pictures`);

  it('builds one folder per project and drops the old Wix shortcut', () => {
    expect(pictures().children.map((c) => c.name)).toEqual(['Dior Lip Glow']);
    expect(JSON.stringify(fs)).not.toContain('wixsite');
  });
  it('carries the project record on the folder node for the task pane', () => {
    expect(pictures().children[0].project.tech).toEqual(['Unity', 'C#']);
    expect(pictures().children[0].icon).toBe('pictures');
  });
  it('opens each media file in the viewer at its own index', () => {
    const folder = resolvePath(fs, `${PATHS.myDocuments}\\My Pictures\\Dior Lip Glow`);
    expect(folder.children.map((c) => c.name)).toEqual(['img1.jpg', 'clip.mp4']);
    expect(folder.children[0].open).toEqual({ app: 'viewer', payload: { slug: 'dior-lip-glow', index: 0, slideshow: false } });
    expect(folder.children[1].open.payload.index).toBe(1);
  });
  it('marks images and video with different icons and keeps the thumb only for images', () => {
    const folder = resolvePath(fs, `${PATHS.myDocuments}\\My Pictures\\Dior Lip Glow`);
    expect(folder.children[0]).toMatchObject({ icon: 'image', mediaKind: 'image', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 });
    expect(folder.children[1]).toMatchObject({ icon: 'video', mediaKind: 'video', thumb: null });
  });
  it('degrades to an empty My Pictures when no portfolio is supplied', () => {
    const bare = buildFileSystem(resume);
    expect(resolvePath(bare, `${PATHS.myDocuments}\\My Pictures`).children).toEqual([]);
  });
  it('points the readme at My Pictures instead of an external portfolio URL', () => {
    const readme = resolvePath(fs, `${PATHS.myDocuments}\\readme.txt`);
    expect(readme.open.payload.text).toContain('My Pictures');
    expect(readme.open.payload.text).not.toContain(resume.contact.portfolio);
  });
});
