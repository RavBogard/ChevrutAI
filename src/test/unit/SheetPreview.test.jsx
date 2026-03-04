import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  hasContent,
  flattenToHtml,
  BilingualBlock,
  SourceText,
} from '../../components/sheet/SheetPreview';

// ---------------------------------------------------------------------------
// hasContent
// ---------------------------------------------------------------------------
describe('hasContent', () => {
  it('returns false for null', () => {
    expect(hasContent(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasContent('')).toBe(false);
  });

  it('returns false for whitespace string', () => {
    expect(hasContent('  ')).toBe(false);
  });

  it('returns true for non-empty string', () => {
    expect(hasContent('shalom')).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(hasContent([])).toBe(false);
  });

  it('returns true for array with content', () => {
    expect(hasContent(['shalom', 'world'])).toBe(true);
  });

  it('returns false for array of empty strings', () => {
    expect(hasContent([''])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// flattenToHtml
// ---------------------------------------------------------------------------
describe('flattenToHtml', () => {
  it('returns string unchanged', () => {
    expect(flattenToHtml('string')).toBe('string');
  });

  it('joins 1D array items with br tag', () => {
    const result = flattenToHtml(['a', 'b']);
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  it('flattens nested array', () => {
    const result = flattenToHtml([['a', 'b'], 'c']);
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
  });

  it('returns empty string for null', () => {
    expect(flattenToHtml(null)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// BilingualBlock
// ---------------------------------------------------------------------------
describe('BilingualBlock', () => {
  const makeSource = (he, en, viewMode = 'bilingual') => ({ he, en, viewMode });

  it('renders two columns for bilingual source', () => {
    const source = makeSource('Shalom', 'Hello');
    const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
    expect(container.querySelector('.source-col--hebrew')).toBeTruthy();
    expect(container.querySelector('.source-col--english')).toBeTruthy();
  });

  it('renders hebrew-only modifier class when en is empty', () => {
    const source = makeSource('Shalom', '');
    const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
    expect(container.querySelector('.source-bilingual-row--hebrew-only')).toBeTruthy();
  });

  it('renders english-only modifier class when he is empty', () => {
    const source = makeSource('', 'Hello');
    const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
    expect(container.querySelector('.source-bilingual-row--english-only')).toBeTruthy();
  });

  it('renders sheet-no-content paragraph when both he and en are empty', () => {
    const source = makeSource('', '');
    const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
    expect(container.querySelector('.sheet-no-content')).toBeTruthy();
  });

  it('wrapper div has dir attribute equal to ltr', () => {
    const source = makeSource('Shalom', 'Hello');
    const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
    const row = container.querySelector('.source-bilingual-row');
    expect(row).toBeTruthy();
    expect(row.getAttribute('dir')).toBe('ltr');
  });

  it('hebrew column has dir=rtl and lang=he', () => {
    const source = makeSource('Shalom', 'Hello');
    const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
    const heCol = container.querySelector('.source-col--hebrew');
    expect(heCol).toBeTruthy();
    expect(heCol.getAttribute('dir')).toBe('rtl');
    expect(heCol.getAttribute('lang')).toBe('he');
  });

  it('english column has dir=ltr and lang=en', () => {
    const source = makeSource('Shalom', 'Hello');
    const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
    const enCol = container.querySelector('.source-col--english');
    expect(enCol).toBeTruthy();
    expect(enCol.getAttribute('dir')).toBe('ltr');
    expect(enCol.getAttribute('lang')).toBe('en');
  });
});
