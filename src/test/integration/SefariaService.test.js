import { describe, it, expect } from 'vitest';
import { getSefariaText } from '../../services/sefaria';

describe('Sefaria Service Integration', () => {
    // Tests for "Crash & Delete" prevention (Deeply nested text arrays)
    it('flattens nested text arrays (Zohar style)', async () => {
        // Zohar texts often come as [["Text..."], ["Text..."]] or deeper
        // We simulate this by mocking the fetch if we can't hit real API, 
        // but for integration we'll try real API if allowed, or trust our logic normalization.
        // Let's rely on the Real API for this test suite as "System Integration"

        const result = await getSefariaText("Zohar, 1.15a.1"); // Known complex text
        expect(result).not.toBeNull();
        expect(typeof result.he).toBe('string');
        expect(typeof result.en).toBe('string');
        // valid checks
        expect(result.ref).toBeDefined();
    });

    // Tests for "Missing Texts" (Fuzzy Search Typos)
    it('resolves typos like "Kosef Mishneh"', async () => {
        // "Kosef Mishneh" -> "Kessef Mishneh" (Sefaria spelling)
        // This relies on the new Name API fuzzy logic we implemented
        const result = await getSefariaText("Kosef Mishneh on Mishneh Torah, Gifts to the Poor 7:3");
        expect(result).not.toBeNull();
        // Sefaria uses "Kessef"
        expect(result.ref).toMatch(/Ke(s|ss)ef Mishneh/);
        expect(result.ref).toContain("Gifts to the Poor 7:3");
    });

    it('handles explicit "on" citations incorrectly formatted', async () => {
        const result = await getSefariaText("Radbaz on Mishneh Torah, Gifts to the Poor 7:3");
        expect(result).not.toBeNull();
        // Should resolve to something real
        expect(result.ref).toBeDefined();
    });
});
