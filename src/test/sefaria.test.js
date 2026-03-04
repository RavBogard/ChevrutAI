import { describe, it, expect } from 'vitest';
import { flattenSefariaText } from '../services/sefaria';

describe('flattenSefariaText', () => {
    it('Test 1: flat string input returns the string unchanged (Tanakh single verse)', () => {
        expect(flattenSefariaText('בְּרֵאשִׁית')).toBe('בְּרֵאשִׁית');
    });

    it('Test 2: string[] input joins with single space (Tanakh verse range, Mishnah)', () => {
        expect(flattenSefariaText(['verse 1', 'verse 2'])).toBe('verse 1 verse 2');
    });

    it('Test 3: string[][] input flattens two levels and joins (Talmud amud)', () => {
        expect(flattenSefariaText([['line 1a', 'line 1b'], ['line 2a']])).toBe('line 1a line 1b line 2a');
    });

    it('Test 4: string[][][] input flattens three levels and joins (Zohar section)', () => {
        expect(flattenSefariaText([[['para 1a', 'para 1b'], ['para 2a']]])).toBe('para 1a para 1b para 2a');
    });

    it('Test 5: null, undefined, and empty string return empty string without throwing', () => {
        expect(flattenSefariaText(null)).toBe('');
        expect(flattenSefariaText(undefined)).toBe('');
        expect(flattenSefariaText('')).toBe('');
    });

    it('Test 6: array with null/undefined gap nodes filters them out and returns non-null text only (Sefaria gap nodes)', () => {
        expect(flattenSefariaText([null, 'text', undefined])).toBe('text');
    });
});
