/**
 * SheetViewExport.test.jsx
 * Phase 04, Plan 01 — PDF Export via window.print()
 *
 * RED tests: verify that handleExportPDF in SheetView uses window.print()
 * and no longer imports html2pdf.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mock heavy dependencies ────────────────────────────────────────────────
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ currentUser: null })
}));

vi.mock('../../services/google', () => ({
    exportToGoogleDoc: vi.fn()
}));

// Helper: render SheetView in chatStarted state and open the export dropdown
function renderSheetViewWithDropdown(sheetTitle, SheetView) {
    const noop = () => {};
    render(
        <MemoryRouter>
            <SheetView
                sources={[]}
                onRemoveSource={noop}
                onUpdateSource={noop}
                onReorder={noop}
                onClearSheet={noop}
                onUndo={noop}
                onRedo={noop}
                canUndo={false}
                canRedo={false}
                language="en"
                sheetTitle={sheetTitle}
                onTitleChange={noop}
                onSendMessage={noop}
                chatStarted={true}
                onAddSource={noop}
                darkMode={false}
                toggleDarkMode={noop}
                toggleLanguage={noop}
            />
        </MemoryRouter>
    );

    // Open the export dropdown (click "Export ▾" button)
    const exportToggle = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportToggle);
}

describe('SheetView — PDF Export (window.print)', () => {

    beforeEach(() => {
        vi.spyOn(window, 'print').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('calls window.print() when the PDF export button is clicked', async () => {
        const { default: SheetView } = await import('../../components/SheetView.jsx');

        renderSheetViewWithDropdown('Test Sheet', SheetView);

        const pdfButton = screen.getByRole('button', { name: /^PDF$/i });
        fireEvent.click(pdfButton);

        expect(window.print).toHaveBeenCalledTimes(1);
    });

    it('sets document.title to sheetTitle before printing and restores it after', async () => {
        const { default: SheetView } = await import('../../components/SheetView.jsx');

        const prevTitle = document.title;
        const titleAtPrintTime = [];

        window.print.mockImplementationOnce(() => {
            titleAtPrintTime.push(document.title);
        });

        renderSheetViewWithDropdown('My Sheet', SheetView);

        const pdfButton = screen.getByRole('button', { name: /^PDF$/i });
        fireEvent.click(pdfButton);

        expect(titleAtPrintTime[0]).toBe('My Sheet');
        expect(document.title).toBe(prevTitle);
    });

    it('falls back to "Source Sheet" when sheetTitle is empty string', async () => {
        const { default: SheetView } = await import('../../components/SheetView.jsx');

        const titleAtPrintTime = [];
        window.print.mockImplementationOnce(() => {
            titleAtPrintTime.push(document.title);
        });

        renderSheetViewWithDropdown('', SheetView);

        const pdfButton = screen.getByRole('button', { name: /^PDF$/i });
        fireEvent.click(pdfButton);

        expect(titleAtPrintTime[0]).toBe('Source Sheet');
    });
});
