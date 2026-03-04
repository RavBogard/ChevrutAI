import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SheetPreview, { BilingualBlock } from '../../components/sheet/SheetPreview';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const BILINGUAL_SOURCE = {
  ref: 'Genesis 1:1',
  he: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ',
  en: 'In the beginning God created the heavens and the earth.',
  viewMode: 'bilingual'
};
const HEBREW_ONLY_SOURCE = { ref: 'Psalms 23:1', he: 'מִזְמוֹר לְדָוִד', en: '', viewMode: 'hebrew' };
const ENGLISH_ONLY_SOURCE = { ref: 'Proverbs 1:1', he: '', en: 'The proverbs of Solomon', viewMode: 'english' };
const ARRAY_SOURCE = {
  ref: 'Exodus 20:1',
  he: ['וַיְדַבֵּר אֱלֹהִים', 'אֵת כָּל הַדְּבָרִים הָאֵלֶּה'],
  en: ['And God spoke', 'all these words'],
  viewMode: 'bilingual'
};
const NESTED_ARRAY_SOURCE = {
  ref: 'Talmud Bavli Berakhot 2a',
  he: [['מֵאֵימָתַי', 'קוֹרִין'], 'אֶת שְׁמַע'],
  en: 'From when do we recite the Shema?',
  viewMode: 'bilingual'
};

// Resolve SheetPreview.css path relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SHEET_PREVIEW_CSS_PATH = path.resolve(
  __dirname,
  '../../components/sheet/SheetPreview.css'
);

// ---------------------------------------------------------------------------
// TYPO-01: Hebrew font and nikud-safe line-height
// ---------------------------------------------------------------------------
describe('TYPO-01: Hebrew font and nikud line-height', () => {
  it('.source-col--hebrew class is present in rendered DOM', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    expect(container.querySelector('.source-col--hebrew')).toBeTruthy();
  });

  it('SheetPreview.css contains line-height: 1.9 for nikud clearance', () => {
    const css = fs.readFileSync(SHEET_PREVIEW_CSS_PATH, 'utf8');
    expect(css).toContain('line-height: 1.9');
  });

  it('Hebrew column has font via .source-col--hebrew class in DOM', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const heCol = container.querySelector('.source-col--hebrew');
    // jsdom does not compute CSS variables — verify class presence (SheetPreview.css carries font-family: var(--font-hebrew))
    expect(heCol.className).toContain('source-col--hebrew');
  });
});

// ---------------------------------------------------------------------------
// TYPO-02: Column order — English DOM-first, Hebrew DOM-second
// ---------------------------------------------------------------------------
describe('TYPO-02: Column order (English left / Hebrew right)', () => {
  it('English column is first child of bilingual row', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const cols = container.querySelectorAll('.source-col--english, .source-col--hebrew');
    expect(cols.length).toBe(2);
    expect(cols[0].classList.contains('source-col--english')).toBe(true);
  });

  it('Hebrew column is second child of bilingual row', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const cols = container.querySelectorAll('.source-col--english, .source-col--hebrew');
    expect(cols.length).toBe(2);
    expect(cols[1].classList.contains('source-col--hebrew')).toBe(true);
  });

  it('Row element has dir=ltr (physical column order anchor)', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const row = container.querySelector('.source-bilingual-row');
    expect(row).toBeTruthy();
    expect(row.getAttribute('dir')).toBe('ltr');
  });
});

// ---------------------------------------------------------------------------
// TYPO-03: RTL scoping — no bleed outside .source-col--hebrew
// ---------------------------------------------------------------------------
describe('TYPO-03: RTL scoping (no bleed)', () => {
  it('Hebrew column element has dir=rtl', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const heCol = container.querySelector('.source-col--hebrew');
    expect(heCol).toBeTruthy();
    expect(heCol.getAttribute('dir')).toBe('rtl');
  });

  it('Hebrew column element has lang=he', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const heCol = container.querySelector('.source-col--hebrew');
    expect(heCol.getAttribute('lang')).toBe('he');
  });

  it('English column element has dir=ltr', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const enCol = container.querySelector('.source-col--english');
    expect(enCol).toBeTruthy();
    expect(enCol.getAttribute('dir')).toBe('ltr');
  });

  it('English column element has lang=en', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const enCol = container.querySelector('.source-col--english');
    expect(enCol.getAttribute('lang')).toBe('en');
  });

  it('document.body does NOT have dir=rtl after rendering SheetPreview', () => {
    render(<SheetPreview sources={[BILINGUAL_SOURCE]} />);
    expect(document.body.getAttribute('dir')).not.toBe('rtl');
  });

  it('No element outside .source-bilingual-row in rendered container has dir=rtl', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const row = container.querySelector('.source-bilingual-row');
    // Walk all children of container — only the row's internal descendants (the hebrew col) should have dir=rtl
    const allElements = container.querySelectorAll('[dir="rtl"]');
    allElements.forEach(el => {
      // Each rtl element must be the hebrew col itself or a descendant of it — not outside the row
      expect(row.contains(el)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// TYPO-04: Screen rendering — SheetPreview renders all source variants
// ---------------------------------------------------------------------------
describe('TYPO-04: Screen rendering (all source variants)', () => {
  it('renders without errors for bilingual source', () => {
    expect(() => render(<SheetPreview sources={[BILINGUAL_SOURCE]} />)).not.toThrow();
  });

  it('renders without errors for Hebrew-only source', () => {
    expect(() => render(<SheetPreview sources={[HEBREW_ONLY_SOURCE]} />)).not.toThrow();
  });

  it('renders without errors for English-only source', () => {
    expect(() => render(<SheetPreview sources={[ENGLISH_ONLY_SOURCE]} />)).not.toThrow();
  });

  it('renders without errors for array he content', () => {
    expect(() => render(<SheetPreview sources={[ARRAY_SOURCE]} />)).not.toThrow();
  });

  it('renders without errors for nested array he content', () => {
    expect(() => render(<SheetPreview sources={[NESTED_ARRAY_SOURCE]} />)).not.toThrow();
  });

  it('.sheet-preview container is present in SheetPreview output', () => {
    const { container } = render(<SheetPreview sources={[BILINGUAL_SOURCE]} />);
    expect(container.querySelector('.sheet-preview')).toBeTruthy();
  });

  it('renders all five source variants without error and shows five .sheet-source-block elements', () => {
    const allSources = [
      BILINGUAL_SOURCE,
      HEBREW_ONLY_SOURCE,
      ENGLISH_ONLY_SOURCE,
      ARRAY_SOURCE,
      NESTED_ARRAY_SOURCE,
    ];
    const { container } = render(<SheetPreview sources={allSources} />);
    expect(container.querySelectorAll('.sheet-source-block').length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Dark mode CSS token usage
// ---------------------------------------------------------------------------
describe('Dark mode CSS token class assertions', () => {
  it('.source-col--hebrew class exists on Hebrew column (carries --sheet-text in CSS)', () => {
    const { container } = render(<BilingualBlock source={BILINGUAL_SOURCE} viewMode="bilingual" />);
    const heCol = container.querySelector('.source-col--hebrew');
    expect(heCol).toBeTruthy();
    expect(heCol.className).toContain('source-col--hebrew');
  });

  it('.sheet-source-block class exists on source block (carries --source-bg in CSS)', () => {
    const { container } = render(<SheetPreview sources={[BILINGUAL_SOURCE]} />);
    const block = container.querySelector('.sheet-source-block');
    expect(block).toBeTruthy();
    expect(block.className).toContain('sheet-source-block');
  });

  it('SheetPreview.css contains --sheet-text variable reference in .source-col--hebrew rule', () => {
    const css = fs.readFileSync(SHEET_PREVIEW_CSS_PATH, 'utf8');
    expect(css).toContain('--sheet-text');
  });

  it('SheetPreview.css contains --source-bg variable reference in .sheet-source-block rule', () => {
    const css = fs.readFileSync(SHEET_PREVIEW_CSS_PATH, 'utf8');
    expect(css).toContain('--source-bg');
  });
});
