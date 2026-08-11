import { escapeIlikePattern } from './sql';

describe('escapeIlikePattern', () => {
  it('escapes percent and underscore wildcards', () => {
    expect(escapeIlikePattern('100%')).toBe('100\\%');
    expect(escapeIlikePattern('a_b')).toBe('a\\_b');
  });

  it('escapes backslashes', () => {
    expect(escapeIlikePattern('path\\dir')).toBe('path\\\\dir');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeIlikePattern('Sangli')).toBe('Sangli');
  });
});
