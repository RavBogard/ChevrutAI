/**
 * PrintCSS.test.js
 * Phase 04, Plan 01 — @media print block in App.css
 *
 * Tests verify the @media print rules are present in App.css.
 * Uses raw CSS file reads (same pattern as HebrewTypography.test.jsx).
 * jsdom cannot compute print media, so static string analysis is correct.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const CSS_PATH = path.resolve(__dirname, '../../App.css');
const css = fs.readFileSync(CSS_PATH, 'utf-8');

// Extract the @media print block content for focused assertions
const printBlockMatch = css.match(/@media print\s*\{([\s\S]*?)\n\}/);
const printBlock = printBlockMatch ? printBlockMatch[0] : '';

describe('App.css @media print block', () => {

    it('has overflow: visible !important on .shell-content', () => {
        expect(printBlock).toMatch(/\.shell-content[\s\S]*?overflow:\s*visible\s*!important/);
    });

    it('has overflow: visible !important on .app-shell', () => {
        expect(printBlock).toMatch(/\.app-shell[\s\S]*?overflow:\s*visible\s*!important/);
    });

    it('hides .shell-sidebar with display: none !important', () => {
        expect(printBlock).toMatch(/\.shell-sidebar/);
        expect(printBlock).toMatch(/display:\s*none\s*!important/);
    });

    it('hides .shell-header with display: none !important', () => {
        expect(printBlock).toMatch(/\.shell-header/);
    });

    it('hides .sheet-toolbar with display: none !important', () => {
        expect(printBlock).toMatch(/\.sheet-toolbar/);
    });

    it('hides .sheet-footer with display: none !important', () => {
        expect(printBlock).toMatch(/\.sheet-footer/);
    });

    it('hides .gemini-input-box with display: none !important', () => {
        expect(printBlock).toMatch(/\.gemini-input-box/);
    });

    it('hides .gemini-suggestions with display: none !important', () => {
        expect(printBlock).toMatch(/\.gemini-suggestions/);
    });

    it('applies page-break-inside: avoid to .sortable-item', () => {
        expect(printBlock).toMatch(/\.sortable-item[\s\S]*?page-break-inside:\s*avoid/);
    });

    it('applies break-inside: avoid to .sortable-item', () => {
        expect(printBlock).toMatch(/\.sortable-item[\s\S]*?break-inside:\s*avoid/);
    });

    it('applies page-break-inside: avoid to .source-block for defense-in-depth', () => {
        expect(printBlock).toMatch(/\.source-block[\s\S]*?page-break-inside:\s*avoid/);
    });

    it('preserves bilingual flex layout with display: flex !important on .source-content', () => {
        expect(printBlock).toMatch(/\.source-content[\s\S]*?display:\s*flex\s*!important/);
    });

    it('sets body background: white and color: black to defeat dark mode variables', () => {
        expect(printBlock).toMatch(/body[\s\S]*?background:\s*white\s*!important/);
        expect(printBlock).toMatch(/body[\s\S]*?color:\s*black\s*!important/);
    });

    it('hides .title-input border and background in print', () => {
        expect(printBlock).toMatch(/\.title-input/);
    });

    it('has at least 2 occurrences of overflow: visible !important', () => {
        const matches = (printBlock.match(/overflow:\s*visible\s*!important/g) || []).length;
        expect(matches).toBeGreaterThanOrEqual(2);
    });
});
