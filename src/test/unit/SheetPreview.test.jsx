import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  hasContent,
  flattenToHtml,
  BilingualBlock,
  SourceText,
} from '../../components/sheet/SheetPreview';
import SheetPreview from '../../components/sheet/SheetPreview';

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

// ---------------------------------------------------------------------------
// Edge cases (Plan 02-03)
// ---------------------------------------------------------------------------
describe('SheetPreview — edge cases (Plan 02-03)', () => {

  describe('viewMode behavior', () => {
    it('viewMode=hebrew hides English column', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'hebrew' };
      const { container } = render(<BilingualBlock source={source} viewMode="hebrew" />);
      expect(container.querySelector('.source-col--english')).toBeNull();
    });

    it('viewMode=hebrew shows Hebrew column', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'hebrew' };
      const { container } = render(<BilingualBlock source={source} viewMode="hebrew" />);
      expect(container.querySelector('.source-col--hebrew')).toBeTruthy();
    });

    it('viewMode=english hides Hebrew column', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'english' };
      const { container } = render(<BilingualBlock source={source} viewMode="english" />);
      expect(container.querySelector('.source-col--hebrew')).toBeNull();
    });

    it('viewMode=english shows English column', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'english' };
      const { container } = render(<BilingualBlock source={source} viewMode="english" />);
      expect(container.querySelector('.source-col--english')).toBeTruthy();
    });

    it('viewMode=bilingual renders both columns', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      expect(container.querySelector('.source-col--hebrew')).toBeTruthy();
      expect(container.querySelector('.source-col--english')).toBeTruthy();
    });
  });

  describe('JaggedArray content', () => {
    it('renders 1D array he content in Hebrew column', () => {
      const source = { he: ['verse 1', 'verse 2'], en: '', viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      const heCol = container.querySelector('.source-col--hebrew');
      expect(heCol).toBeTruthy();
      expect(heCol.innerHTML).toContain('verse 1');
      expect(heCol.innerHTML).toContain('verse 2');
    });

    it('renders nested array he content in Hebrew column', () => {
      const source = { he: [['nested', 'array'], 'flat'], en: '', viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      const heCol = container.querySelector('.source-col--hebrew');
      expect(heCol).toBeTruthy();
      expect(heCol.innerHTML).toContain('nested');
      expect(heCol.innerHTML).toContain('flat');
    });

    it('renders 1D array en content in English column', () => {
      const source = { he: '', en: ['English verse'], viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      const enCol = container.querySelector('.source-col--english');
      expect(enCol).toBeTruthy();
      expect(enCol.innerHTML).toContain('English verse');
    });
  });

  describe('RTL scoping — TYPO-03', () => {
    it('Hebrew column element has dir=rtl', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      const heCol = container.querySelector('[lang="he"]');
      expect(heCol).toBeTruthy();
      expect(heCol.getAttribute('dir')).toBe('rtl');
    });

    it('No ancestor of Hebrew column above .source-bilingual-row has dir=rtl', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      const row = container.querySelector('.source-bilingual-row');
      // Walk ancestors from row up to container root — none should have dir=rtl
      let node = row ? row.parentElement : null;
      while (node && node !== document.body) {
        expect(node.getAttribute('dir')).not.toBe('rtl');
        node = node.parentElement;
      }
    });

    it('.source-bilingual-row wrapper has dir=ltr', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      const row = container.querySelector('.source-bilingual-row');
      expect(row).toBeTruthy();
      expect(row.getAttribute('dir')).toBe('ltr');
    });
  });

  describe('Column order — TYPO-02', () => {
    it('English column is first child (DOM-first) in bilingual row', () => {
      const source = { he: 'שָׁלוֹם', en: 'Hello', viewMode: 'bilingual' };
      const { container } = render(<BilingualBlock source={source} viewMode="bilingual" />);
      const cols = container.querySelectorAll('.source-col--english, .source-col--hebrew');
      expect(cols.length).toBe(2);
      expect(cols[0].classList.contains('source-col--english')).toBe(true);
      expect(cols[1].classList.contains('source-col--hebrew')).toBe(true);
    });
  });

  describe('SheetPreview integration', () => {
    it('SheetPreview with empty sources renders null (nothing in DOM)', () => {
      const { container } = render(<SheetPreview sources={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('SheetPreview with one source renders one .sheet-source-block', () => {
      const sources = [{ ref: 'Genesis 1:1', he: 'בְּרֵאשִׁית', en: 'In the beginning', viewMode: 'bilingual' }];
      const { container } = render(<SheetPreview sources={sources} />);
      expect(container.querySelectorAll('.sheet-source-block').length).toBe(1);
    });

    it('SheetPreview with three sources renders three .sheet-source-block elements', () => {
      const sources = [
        { ref: 'Genesis 1:1', he: 'text', en: 'text', viewMode: 'bilingual' },
        { ref: 'Psalms 23:1', he: 'text', en: 'text', viewMode: 'bilingual' },
        { ref: 'Proverbs 1:1', he: 'text', en: 'text', viewMode: 'bilingual' },
      ];
      const { container } = render(<SheetPreview sources={sources} />);
      expect(container.querySelectorAll('.sheet-source-block').length).toBe(3);
    });

    it('.sheet-source-ref span shows the source.ref string', () => {
      const sources = [{ ref: 'Genesis 1:1', he: 'text', en: 'text', viewMode: 'bilingual' }];
      render(<SheetPreview sources={sources} />);
      expect(screen.getAllByText('Genesis 1:1').length).toBeGreaterThanOrEqual(1);
    });
  });
});
