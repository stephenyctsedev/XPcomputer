import { describe, it, expect } from 'vitest';
import { createRegistry } from './registry.js';

describe('registry', () => {
  it('launches registered apps with the shell context and payload', () => {
    const calls = [];
    const ctx = { dialogs: { message: (o) => calls.push(o) } };
    const registry = createRegistry(ctx);
    registry.register('notepad', { name: 'Notepad', icon: 'notepad', launch: (c, payload) => calls.push([c === ctx, payload]) });
    registry.launch('notepad', { title: 'a.txt' });
    expect(calls).toEqual([[true, { title: 'a.txt' }]]);
    expect(registry.list()).toEqual([{ id: 'notepad', name: 'Notepad', icon: 'notepad' }]);
  });
  it('shows a Windows cannot find error for unknown ids', () => {
    const calls = [];
    const registry = createRegistry({ dialogs: { message: (o) => calls.push(o) } });
    registry.launch('cmd');
    expect(calls[0]).toMatchObject({ kind: 'error' });
    expect(calls[0].text).toContain("Windows cannot find 'cmd'");
  });
});
