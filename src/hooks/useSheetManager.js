import { useState, useEffect } from 'react';
import { useUndoRedo } from './useUndoRedo';
import { useToast } from '../components/Toast';
import { getSefariaText, searchSefariaText } from '../services/sefaria';

export const useSheetManager = (initialTitle = "New Source Sheet") => {
    const { showToast } = useToast();
    const [sheetTitle, setSheetTitle] = useState(initialTitle);

    // Undo/Redo enabled sourcesList with localStorage persistence
    const {
        state: sourcesList,
        setState: setSourcesList,
        undo: undoSources,
        redo: redoSources,
        canUndo,
        canRedo,
        resetHistory
    } = useUndoRedo(() => []);

    // Persist state changes to localStorage
    useEffect(() => {
        localStorage.setItem('chevruta_sources', JSON.stringify(sourcesList));
    }, [sourcesList]);

    useEffect(() => {
        localStorage.setItem('chevruta_title', sheetTitle);
    }, [sheetTitle]);

    // State for disambiguation modal
    const [disambiguationState, setDisambiguationState] = useState({
        isOpen: false,
        originalRef: '',
        options: [],
        pendingSource: null
    });

    const handleAddSource = async (source) => {
        // Skip fetching text for custom notes and headers
        if (source.type === 'custom' || source.type === 'header') {
            setSourcesList(prev => [...prev, source]);
            return;
        }

        if (!source.he || !source.en) {
            const data = await getSefariaText(source.ref);

            if (data && !data.error) {
                // Success path
                source.he = data.he;
                source.en = data.en;
                source.ref = data.ref || source.ref; // Update ref if Sefaria canonicalized it
                source.versions = data.versions;
                source.versionTitle = data.versionTitle;
                setSourcesList(prev => [...prev, source]);
            } else {
                // Failure path - Try to search for alternatives
                console.log("Fetch failed directly, searching for alternatives for:", source.ref);
                const searchResults = await searchSefariaText(source.ref);

                if (searchResults && searchResults.length > 0) {
                    // Trigger modal
                    setDisambiguationState({
                        isOpen: true,
                        originalRef: source.ref,
                        options: searchResults,
                        pendingSource: source
                    });
                } else {
                    // No fallback found either
                    const msg = data && data.error ? data.error : "Could not fetch text";
                    showToast(`${msg} for ${source.ref}`, "error");
                }
                return;
            }
        } else {
            // Already has text (dragged/pasted?)
            setSourcesList(prev => [...prev, source]);
        }
    };

    const resolveDisambiguation = async (selectedOption) => {
        if (!disambiguationState.pendingSource) return;

        // The user selected an option from the search results
        // We need to fetch the FULL text for this specific option to ensure we get clean data
        // (Search results sometimes have snippets)

        const newSource = { ...disambiguationState.pendingSource };
        newSource.ref = selectedOption.ref;

        // Close modal immediately
        setDisambiguationState(prev => ({ ...prev, isOpen: false }));

        // Recursively call add with the new valid ref
        await handleAddSource(newSource);
    };

    const cancelDisambiguation = () => {
        setDisambiguationState(prev => ({ ...prev, isOpen: false, pendingSource: null }));
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

    return {
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
        disambiguationState,
        resolveDisambiguation,
        cancelDisambiguation
    };
};
