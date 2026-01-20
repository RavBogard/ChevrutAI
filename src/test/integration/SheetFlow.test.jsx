import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SheetView from '../../components/SheetView';
import { DndContext } from '@dnd-kit/core';
import { MemoryRouter } from 'react-router-dom';

// Mock Drag and Drop to avoid issues in test environment
vi.mock('@dnd-kit/core', async () => {
    const actual = await vi.importActual('@dnd-kit/core');
    return {
        ...actual,
        DndContext: ({ children }) => <div>{children}</div>,
        useSensor: () => null,
        useSensors: () => null,
        PointerSensor: null,
        KeyboardSensor: null,
        closestCenter: null,
    };
});

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }) => <div>{children}</div>,
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: (el) => el,
        transform: null,
        transition: null,
    }),
    verticalListSortingStrategy: {},
    arrayMove: (items) => items,
    sortableKeyboardCoordinates: {}
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        currentUser: { uid: 'test-user', email: 'test@example.com' }
    })
}));

vi.mock('html2pdf.js', () => ({
    default: () => ({
        set: () => ({
            from: () => ({
                save: vi.fn()
            })
        })
    })
}));

vi.mock('../../services/google', () => ({
    exportToGoogleDoc: vi.fn()
}));

// Mock dependencies
vi.mock('../../components/sheet/SheetToolbar', () => ({
    default: ({ onAddCustom, onAddHeader }) => (
        <div data-testid="sheet-toolbar">
            <button onClick={onAddCustom}>Add Note</button>
            <button onClick={onAddHeader}>Add Header</button>
        </div>
    )
}));

vi.mock('../../components/sheet/ShareButton', () => ({
    default: () => <button>Share</button>
}));

describe('SheetView Integration', () => {
    const mockProps = {
        sources: [
            { ref: 'Genesis 1:1', he: 'בראשית', en: 'In the beginning', type: 'sefaria' }
        ],
        onRemoveSource: vi.fn(),
        onUpdateSource: vi.fn(),
        onReorder: vi.fn(),
        onClearSheet: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        canUndo: false,
        canRedo: false,
        language: 'en',
        onSuggestionClick: vi.fn(),
        sheetTitle: 'Test Sheet',
        onTitleChange: vi.fn(),
        onSendMessage: vi.fn(),
        chatStarted: true,
        onAddSource: vi.fn(),
        userSheets: [],
        darkMode: false,
        toggleDarkMode: vi.fn(),
        toggleLanguage: vi.fn()
    };

    const renderWithRouter = (component) => {
        return render(
            <MemoryRouter>
                {component}
            </MemoryRouter>
        );
    };

    it('renders sources correctly', () => {
        renderWithRouter(<SheetView {...mockProps} />);
        expect(screen.getByText('Genesis 1:1')).toBeInTheDocument();
        expect(screen.getByText('In the beginning')).toBeInTheDocument();
    });

    it('calls onAddSource when Add Note is clicked', () => {
        renderWithRouter(<SheetView {...mockProps} />);
        const addNoteBtn = screen.getByText('Add Note');
        fireEvent.click(addNoteBtn);
        expect(mockProps.onAddSource).toHaveBeenCalledWith(expect.objectContaining({ type: 'custom' }));
    });

    it('triggers refine action when Refine button is clicked', () => {
        // Need to render functionality that includes the SourceBlock with Refine button.
        // Since we are mocking toolbar, we need to ensure SourceBlock is rendered by SheetView.
        // SourceBlock renders inside SortableSourceItem. 
        // We need to make sure we can find the Refine button. It's an icon-btn.

        const { container } = renderWithRouter(<SheetView {...mockProps} />);
        // Find refine button by title attribute
        const refineBtn = screen.getByTitle('Ask AI to Explain/Refine');
        fireEvent.click(refineBtn);

        // Expect onSendMessage to be called with the query
        expect(mockProps.onSendMessage).toHaveBeenCalledWith(
            expect.stringContaining('Genesis 1:1')
        );
    });
});
