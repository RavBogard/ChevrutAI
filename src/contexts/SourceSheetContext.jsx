import React, { createContext, useContext, useEffect } from 'react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useToast } from '../components/Toast';
import { getSefariaText } from '../services/sefaria';

const SourceSheetContext = createContext();

export const useSourceSheet = () => {
    return useContext(SourceSheetContext);
};

export const SourceSheetProvider = ({ children, initialTitle = "New Source Sheet" }) => {
    const { showToast } = useToast();
    const [sheetTitle, setSheetTitle] = React.useState(initialTitle);

    // Undo/Redo enabled sourcesList
    const {
        state: sourcesList,
        setState: setSourcesList,
        undo: undoSources,
        redo: redoSources,
        canUndo,
        canRedo,
        resetHistory
    } = useUndoRedo(() => []);

    // Persistence
    useEffect(() => {
        localStorage.setItem('chevruta_sources', JSON.stringify(sourcesList));
    }, [sourcesList]);

    useEffect(() => {
        localStorage.setItem('chevruta_title', sheetTitle);
    }, [sheetTitle]);

    const handleAddSource = async (source) => {
        // Skip fetching text for custom notes and headers
        if (source.type === 'custom' || source.type === 'header') {
            setSourcesList(prev => [...prev, source]);
            return;
        }

        if (!source.he || !source.en) {
            const data = await getSefariaText(source.ref);
            if (data) {
                source.he = data.he;
                source.en = data.en;
                source.versions = data.versions;
                source.versionTitle = data.versionTitle;
            } else {
                showToast(`Could not fetch text for ${source.ref}`, "error");
                return;
            }
        }
        setSourcesList(prev => [...prev, source]);
    };

    const handleRemoveSource = (index) => {
        setSourcesList(items => items.filter((_, i) => i !== index));
    };

    const handleUpdateSource = (index, updates) => {
        setSourcesList(items => {
            const newItems = [...items];
            if (index >= 0 && index < newItems.length) {
                newItems[index] = { ...newItems[index], ...updates };
            }
            return newItems;
        });
    };

    const handleReorder = (newSources) => {
        setSourcesList(newSources);
    };

    const clearSheet = () => {
        if (window.confirm("Are you sure you want to clear the sheet?")) {
            setSourcesList([]);
        }
    };

    const value = {
        sourcesList,
        setSourcesList,
        sheetTitle,
        setSheetTitle,
        undoSources,
        redoSources,
        canUndo,
        canRedo,
        handleAddSource,
        handleRemoveSource,
        handleUpdateSource,
        handleReorder,
        clearSheet,
        resetHistory
    };

    return (
        <SourceSheetContext.Provider value={value}>
            {children}
        </SourceSheetContext.Provider>
    );
};
