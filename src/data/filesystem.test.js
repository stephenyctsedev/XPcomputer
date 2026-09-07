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
    expect(resolvePath(fs, `${PATHS.myDocuments}\\My Pictures\\portfolio.url`).open).toEqual({ app: 'external', payload: { url: resume.contact.portfolio } });
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
