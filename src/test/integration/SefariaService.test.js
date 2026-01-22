import { describe, it, expect } from 'vitest';
import { getSefariaText } from '../../services/sefaria';

describe('Sefaria Service Integration', () => {
    // Tests for "Crash & Delete" prevention (Deeply nested text arrays)
    it('flattens nested text arrays (Zohar style)', async () => {
        // Mock a complex Zohar-like response
        const checkRef = "Zohar, Mock 1:1";
        const mockResponse = {
            ref: checkRef,
            he: [["Deep Text", ["Nested"]], "Top Level"], // Complex nested structure
            text: ["English Text", ["More English"]],
            versionTitle: "Mock Version"
        };

        // Spy on fetch
        const originalFetch = global.fetch;
        global.fetch = async () => ({
            ok: true,
            json: async () => mockResponse
        });

        try {
            const result = await getSefariaText(checkRef);

            expect(result).not.toBeNull();
            expect(typeof result.he).toBe('string');
            expect(result.he).toContain("Deep Text");
            expect(result.he).toContain("Nested");
            expect(result.he).toContain("Top Level");

            // Should be space joined
            expect(result.he).toBe("Deep Text Nested Top Level");
        } finally {
            // Restore fetch
            global.fetch = originalFetch;
        }
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
