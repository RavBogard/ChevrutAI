import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    saveSheetToFirestore,
    subscribeToUserSheets,
    getSheetFromFirestore,
    deleteSheetFromFirestore
} from '../services/firebase';
import { useToast } from '../components/Toast';
import { getSefariaText, searchSefariaText } from '../services/sefaria';
import { sendGeminiMessage } from '../services/ai';
import { exportToGoogleDoc, syncToGoogleDoc } from '../services/google';

/**
 * Unified hook for sheet state management and persistence.
 * Addresses the architectural issues in the previous implementation:
 * - Uses refs to avoid stale closures in timeouts
 * - Single source of truth for all sheet data
 * - Robust error handling and loading state management
 * - Proper cleanup on unmount
 */
export const useSheetPersistence = (urlSheetId, isExplicitlyNew) => {
    const { currentUser } = useAuth();
    const { showToast } = useToast();

    // ========== CORE STATE ==========
    // Sheet content
    const [title, setTitle] = useState('New Source Sheet');
    const [sources, setSources] = useState([]);
    const [messages, setMessages] = useState([{
        id: 'welcome',
        role: 'model',
        text: 'Shalom! What kind of text sheet do you want to create together?',
        suggestedSources: []
    }]);

    // Undo/Redo for sources
    const [sourcesHistory, setSourcesHistory] = useState([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);

    // Persistence state
    const [currentSheetId, setCurrentSheetId] = useState(null);
    const [userSheets, setUserSheets] = useState([]);
    const [isPersisted, setIsPersisted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Initialize loading state:
    // If explicitly new, we are NOT loading (we are ready immediately).
    // Otherwise, assume loading until verified.
    const [isLoading, setIsLoading] = useState(!isExplicitlyNew);

    // Chat loading state
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Google Docs sync state
    const [googleDocId, setGoogleDocId] = useState(null);
    const [googleDocUrl, setGoogleDocUrl] = useState(null);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // ========== REFS FOR LATEST STATE (Avoids stale closures) ==========
    const latestDataRef = useRef({ title, sources, messages });
    const saveTimeoutRef = useRef(null);
    const mountedRef = useRef(true);

    // Keep ref updated with latest state
    useEffect(() => {
        latestDataRef.current = { title, sources, messages };
    }, [title, sources, messages]);

    // Track component mount status
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // ========== UNDO/REDO LOGIC ==========
    const updateSources = useCallback((newSourcesOrFn) => {
        setSources(prev => {
            const newSources = typeof newSourcesOrFn === 'function'
                ? newSourcesOrFn(prev)
                : newSourcesOrFn;

            // Update history
            setSourcesHistory(h => {
                const newHistory = h.slice(0, historyIndex + 1);
                newHistory.push(newSources);
                // Limit to 50
                if (newHistory.length > 50) newHistory.shift();
                return newHistory;
            });
            setHistoryIndex(i => Math.min(i + 1, 49));

            return newSources;
        });
    }, [historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(i => i - 1);
            setSources(sourcesHistory[historyIndex - 1]);
            showToast('Undo successful');
        }
    }, [historyIndex, sourcesHistory, showToast]);

    const redo = useCallback(() => {
        if (historyIndex < sourcesHistory.length - 1) {
            setHistoryIndex(i => i + 1);
            setSources(sourcesHistory[historyIndex + 1]);
            showToast('Redo successful');
        }
    }, [historyIndex, sourcesHistory, showToast]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < sourcesHistory.length - 1;

    // ========== SUBSCRIBE TO USER'S SHEETS ==========
    useEffect(() => {
        if (!currentUser) {
            setUserSheets([]);
            return;
        }

        const unsubscribe = subscribeToUserSheets(currentUser.uid, (sheets) => {
            if (!mountedRef.current) return;
            // Filter out empty sheets
            const nonEmptySheets = sheets.filter(sheet => {
                const hasSources = sheet.sources && sheet.sources.length > 0;
                const hasRealMessages = sheet.messages &&
                    sheet.messages.some(m => m.role === 'user' || (m.role === 'model' && m.id !== 'welcome'));
                return hasSources || hasRealMessages;
            });
            setUserSheets(nonEmptySheets);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // ========== LOAD SHEET FROM URL OR LOCAL STORAGE ==========
    useEffect(() => {
        const initSheet = async () => {
            // 0. Optimization: If explicitly new, skip DB check
            if (isExplicitlyNew) {
                if (currentSheetId === urlSheetId) return; // Already init?

                setCurrentSheetId(urlSheetId);
                setIsPersisted(false);
                setIsDirty(false);
                setTitle('New Source Sheet');
                setSources([]);
                setMessages([{
                    id: 'welcome',
                    role: 'model',
                    text: 'Shalom! What kind of text sheet do you want to create together?',
                    suggestedSources: []
                }]);
                setSourcesHistory([[]]);
                setHistoryIndex(0);
                setIsLoading(false); // Ensure loading is off
                return;
            }

            // 1. Try URL ID (Firestore)
            if (urlSheetId) {
                // If we already have this sheet loaded, skip
                if (currentSheetId === urlSheetId && isPersisted) return;

                setIsLoading(true);
                try {
                    const sheet = await getSheetFromFirestore(urlSheetId);
                    if (!mountedRef.current) return;

                    if (sheet) {
                        // Sheet exists in DB
                        setTitle(sheet.title || 'Untitled Source Sheet');
                        setSources(sheet.sources || []);
                        setMessages(sheet.messages || [{
                            id: 'welcome',
                            role: 'model',
                            text: 'Shalom! What kind of text sheet do you want to create together?',
                            suggestedSources: []
                        }]);
                        setSourcesHistory([sheet.sources || []]);
                        setHistoryIndex(0);
                        setCurrentSheetId(urlSheetId);
                        setIsPersisted(true);
                        setIsDirty(false);
                        setGoogleDocId(sheet.googleDocId || null);
                        setGoogleDocUrl(sheet.googleDocUrl || null);
                        setLastSyncedAt(sheet.lastSyncedAt || null);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to load sheet from DB:', error);
                } finally {
                    if (mountedRef.current) setIsLoading(false);
                }
            }

            // 2. Fallback: Load from Local Storage (Guest Mode)
            // If no URL ID, or URL ID failed/didn't exist, check local storage
            // But only if we are NOT logged in (or we treat LS as guest cache)
            // Ideally, recover guest session if no URL ID provided
            if (!urlSheetId && !currentUser) {
                try {
                    const localSources = localStorage.getItem('chevruta_sources');
                    const localMessages = localStorage.getItem('chevruta_messages');
                    const localTitle = localStorage.getItem('chevruta_title');

                    if (localSources) {
                        const parsedSources = JSON.parse(localSources);
                        setSources(parsedSources);
                        setSourcesHistory([parsedSources]);
                    }
                    if (localMessages) setMessages(JSON.parse(localMessages));
                    if (localTitle) setTitle(localTitle);

                    setIsPersisted(false); // Local storage is not "Persisted" to DB
                } catch (e) {
                    console.error("Failed to load from local storage", e);
                }
            } else if (urlSheetId) {
                // Initializing a NEW sheet from a specific URL ID (which wasn't in DB)
                setCurrentSheetId(urlSheetId);
                setIsPersisted(false);
                setIsDirty(false);
                setTitle('New Source Sheet');
                setSources([]);
                setMessages([{
                    id: 'welcome',
                    role: 'model',
                    text: 'Shalom! What kind of text sheet do you want to create together?',
                    suggestedSources: []
                }]);
                setSourcesHistory([[]]);
                setHistoryIndex(0);
            }
        };

        initSheet();
    }, [urlSheetId, currentSheetId, isPersisted, currentUser, isExplicitlyNew]);

    // ========== AUTOSAVE LOGIC ==========
    // Use refs for values we need in the timeout but don't want to trigger effect
    const currentUserRef = useRef(currentUser);
    const isLoadingRefAuto = useRef(isLoading);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    useEffect(() => {
        isLoadingRefAuto.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        // Skip if not logged in
        if (!currentUser) return;

        // Skip during initial load
        if (isLoading) return;

        // Check if there's real content
        const data = latestDataRef.current;
        const hasRealContent = data.sources.length > 0 ||
            data.messages.some(m => m.role === 'user' || (m.role === 'model' && m.id !== 'welcome'));

        if (!hasRealContent) return;

        // Mark as dirty
        setIsDirty(true);

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Immediate save for new sheets, debounced for existing
        const delay = isPersisted ? 2000 : 0;

        saveTimeoutRef.current = setTimeout(async () => {
            // Re-check conditions using REFS (not stale closure values)
            if (!mountedRef.current) return;
            if (isLoadingRefAuto.current) return;

            // Use the LATEST data from ref, not stale closure
            const dataToSave = latestDataRef.current;

            // GUEST MODE: Save to LocalStorage
            if (!currentUserRef.current) {
                try {
                    localStorage.setItem('chevruta_sources', JSON.stringify(dataToSave.sources));
                    localStorage.setItem('chevruta_messages', JSON.stringify(dataToSave.messages));
                    localStorage.setItem('chevruta_title', dataToSave.title);
                    console.log('Saved to LocalStorage (Guest Mode)');
                    setIsDirty(false); // Mark clean
                } catch (e) {
                    console.error("Failed to save to local storage", e);
                }
                return;
            }

            const sheetIdToUse = currentSheetId || urlSheetId;

            if (!sheetIdToUse) {
                console.error('No sheet ID available for save');
                return;
            }

            setIsSaving(true);
            try {
                const sheetData = {
                    id: sheetIdToUse,
                    title: dataToSave.title,
                    sources: dataToSave.sources,
                    messages: dataToSave.messages
                };

                await saveSheetToFirestore(currentUserRef.current.uid, sheetData);

                if (!mountedRef.current) return;

                setIsPersisted(true);
                setIsDirty(false);

                // Update URL if needed
                if (!currentSheetId && sheetIdToUse) {
                    setCurrentSheetId(sheetIdToUse);
                    window.history.replaceState(null, '', `#/sheet/${sheetIdToUse}`);
                }

                console.log('Autosaved sheet:', sheetIdToUse);
            } catch (error) {
                console.error('Autosave failed:', error);
                if (mountedRef.current) {
                    showToast('Autosave failed! Please check connection.', 'error');
                }
            } finally {
                if (mountedRef.current) {
                    setIsSaving(false);
                }
            }
        }, delay);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
        // NOTE: Reduced dependencies - we use refs for currentUser and isLoading
        // to prevent spurious effect re-runs
    }, [title, sources, messages, isPersisted, currentSheetId, urlSheetId, showToast, currentUser, isLoading]);

    // State for disambiguation modal
    const [disambiguationState, setDisambiguationState] = useState({
        isOpen: false,
        originalRef: '',
        options: [],
        pendingSource: null
    });

    // ========== SOURCE MANAGEMENT ==========
    const addSource = useCallback(async (source) => {
        // Custom notes and headers don't need fetching
        if (source.type === 'custom' || source.type === 'header') {
            updateSources(prev => [...prev, source]);
            return;
        }

        // Helper to check if text is empty/missing
        const isEmptyText = (text) => {
            if (!text) return true;
            if (typeof text === 'string') return !text.trim();
            if (Array.isArray(text)) return text.every(t => !t || (typeof t === 'string' && !t.trim()));
            return true;
        };

        // Fetch text if needed
        if (!source.he || !source.en) {
            try {
                const data = await getSefariaText(source.ref);

                // Check if successful
                if (data && !data.error && (!isEmptyText(data.he) || !isEmptyText(data.en))) {
                    source.he = data.he || null;
                    source.en = data.en || null;
                    source.ref = data.ref || source.ref; // Update ref if Sefaria canonicalized it
                    source.versions = data.versions || [];
                    source.versionTitle = data.versionTitle || null;
                    updateSources(prev => [...prev, source]);
                } else {
                    // Fetch failed or returned empty text
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
                        const msg = data && data.error ? data.error : "Could not fetch text";
                        showToast(`${msg} for ${source.ref}`, 'error');
                    }
                    return;
                }
            } catch (error) {
                showToast(`Could not fetch text for ${source.ref}`, 'error');
                return;
            }
        } else {
            // Already has text
            updateSources(prev => [...prev, source]);
        }
    }, [updateSources, showToast]);

    const resolveDisambiguation = useCallback(async (selectedOption) => {
        if (!disambiguationState.pendingSource) return;

        const newSource = { ...disambiguationState.pendingSource };
        newSource.ref = selectedOption.ref;

        // Close modal immediately
        setDisambiguationState(prev => ({ ...prev, isOpen: false, pendingSource: null }));

        // Recursively call add with the new valid ref
        await addSource(newSource);
    }, [disambiguationState, addSource]);

    const cancelDisambiguation = useCallback(() => {
        setDisambiguationState(prev => ({ ...prev, isOpen: false, pendingSource: null }));
    }, []);

    const removeSource = useCallback((index) => {
        updateSources(prev => prev.filter((_, i) => i !== index));
    }, [updateSources]);

    const updateSource = useCallback((index, updates) => {
        updateSources(prev => {
            const newSources = [...prev];
            if (index >= 0 && index < newSources.length) {
                newSources[index] = { ...newSources[index], ...updates };
            }
            return newSources;
        });
    }, [updateSources]);

    const reorderSources = useCallback((newSources) => {
        updateSources(newSources);
    }, [updateSources]);

    const clearSheet = useCallback(() => {
        if (window.confirm('Are you sure you want to clear the sheet?')) {
            updateSources([]);
        }
    }, [updateSources]);

    // ========== CHAT LOGIC ==========
    const sendMessage = useCallback(async (text) => {
        // Add user message
        const userMsg = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);

        // Create placeholder for bot message immediately
        const botMsgId = (Date.now() + 1).toString();
        const initialBotMsg = {
            id: botMsgId,
            role: 'model',
            text: '', // Start empty
            suggestedSources: []
        };

        setMessages(prev => [...prev, initialBotMsg]);
        setIsChatLoading(true);

        try {
            // Callback to update the *specific* bot message in state as chunks arrive
            const handleChunk = (currentText) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId
                        ? { ...msg, text: currentText }
                        : msg
                ));
            };

            const data = await sendGeminiMessage(text, [...messages, userMsg], sources, handleChunk);

            // Auto-title if still default
            if (data.suggested_title && title === 'New Source Sheet') {
                setTitle(data.suggested_title);
            }

            // Final update with sources
            if (mountedRef.current) {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId
                        ? {
                            ...msg,
                            text: data.content, // Ensure final clean text
                            suggestedSources: data.suggested_sources || []
                        }
                        : msg
                ));
            }
        } catch (error) {
            console.error('Chat error:', error);
            if (mountedRef.current) {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId
                        ? { ...msg, text: "I'm having trouble connecting right now. Please try again." }
                        : msg
                ));
            }
        } finally {
            if (mountedRef.current) {
                setIsChatLoading(false);
            }
        }
    }, [messages, title]);

    // ========== SHEET MANAGEMENT ==========
    const loadSheet = useCallback(async (id) => {
        setIsLoading(true);
        try {
            const sheet = await getSheetFromFirestore(id);
            if (!mountedRef.current) return false;

            if (sheet) {
                setTitle(sheet.title || 'Untitled Source Sheet');
                setSources(sheet.sources || []);
                setMessages(sheet.messages || [{
                    id: 'welcome',
                    role: 'model',
                    text: 'Shalom! What kind of text sheet do you want to create together?',
                    suggestedSources: []
                }]);
                setSourcesHistory([sheet.sources || []]);
                setHistoryIndex(0);
                setCurrentSheetId(id);
                setIsPersisted(true);
                setIsDirty(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load sheet:', error);
            showToast('Failed to load sheet', 'error');
            return false;
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [showToast]);

    const createNewSheet = useCallback((newId) => {
        setCurrentSheetId(newId);
        setIsPersisted(false);
        setIsDirty(false);
        setTitle('New Source Sheet');
        setSources([]);
        setMessages([{
            id: 'welcome',
            role: 'model',
            text: 'Shalom! What kind of text sheet do you want to create together?',
            suggestedSources: []
        }]);
        setSourcesHistory([[]]);
        setHistoryIndex(0);
    }, []);

    const deleteSheet = useCallback(async (id) => {
        try {
            await deleteSheetFromFirestore(id);
            showToast('Sheet deleted', 'success');
        } catch (error) {
            console.error('Failed to delete sheet:', error);
            showToast('Failed to delete sheet', 'error');
        }
    }, [showToast]);

    // ========== GOOGLE DOCS SYNC ==========
    const linkToGoogleDoc = useCallback(async () => {
        setIsSyncing(true);
        try {
            // Format sources for Google Docs export
            const formattedSources = sources.map(s => ({
                type: s.type || 'sefaria',
                title: s.title,
                citation: s.ref,
                hebrew: Array.isArray(s.he) ? s.he.join('\n') : s.he,
                english: Array.isArray(s.en) ? s.en.join('\n') : s.en,
                viewMode: s.viewMode || 'bilingual'
            }));

            const { documentId, documentUrl } = await exportToGoogleDoc(title, formattedSources);
            setGoogleDocId(documentId);
            setGoogleDocUrl(documentUrl);
            setLastSyncedAt(new Date());

            // Save the link to Firestore
            if (currentSheetId && currentUser) {
                await saveSheetToFirestore(currentUser.uid, {
                    id: currentSheetId,
                    googleDocId: documentId,
                    googleDocUrl: documentUrl,
                    lastSyncedAt: new Date()
                });
            }

            showToast('Exported and linked to Google Docs!', 'success');
            return documentUrl;
        } catch (error) {
            console.error('Failed to export to Google Docs:', error);
            showToast('Failed to export to Google Docs', 'error');
            throw error;
        } finally {
            setIsSyncing(false);
        }
    }, [title, sources, currentSheetId, currentUser, showToast]);

    const syncToLinkedGoogleDoc = useCallback(async () => {
        if (!googleDocId) {
            showToast('No linked Google Doc. Export first.', 'error');
            return;
        }

        setIsSyncing(true);
        try {
            // Format sources for Google Docs export
            const formattedSources = sources.map(s => ({
                type: s.type || 'sefaria',
                title: s.title,
                citation: s.ref,
                hebrew: Array.isArray(s.he) ? s.he.join('\n') : s.he,
                english: Array.isArray(s.en) ? s.en.join('\n') : s.en,
                viewMode: s.viewMode || 'bilingual'
            }));

            await syncToGoogleDoc(googleDocId, title, formattedSources);
            setLastSyncedAt(new Date());

            // Update sync time in Firestore
            if (currentSheetId && currentUser) {
                await saveSheetToFirestore(currentUser.uid, {
                    id: currentSheetId,
                    lastSyncedAt: new Date()
                });
            }

            showToast('Synced to Google Docs!', 'success');
        } catch (error) {
            console.error('Failed to sync to Google Docs:', error);
            showToast('Sync failed. The Google Doc may have been deleted.', 'error');
        } finally {
            setIsSyncing(false);
        }
    }, [googleDocId, title, sources, currentSheetId, currentUser, showToast]);

    const unlinkGoogleDoc = useCallback(async () => {
        setGoogleDocId(null);
        setGoogleDocUrl(null);
        setLastSyncedAt(null);

        // Remove link from Firestore
        if (currentSheetId && currentUser) {
            await saveSheetToFirestore(currentUser.uid, {
                id: currentSheetId,
                googleDocId: null,
                googleDocUrl: null,
                lastSyncedAt: null
            });
        }

        showToast('Unlinked from Google Docs', 'success');
    }, [currentSheetId, currentUser, showToast]);

    // ========== RETURN VALUES ==========
    // Derived loading state to prevent flash of stale content during navigation
    // If urlSheetId changes but we haven't loaded it yet (currentSheetId mismatch), treat as loading
    const isSwitching = urlSheetId && currentSheetId && urlSheetId !== currentSheetId;
    const effectiveLoading = isLoading || isSwitching;

    return {
        // Sheet content - shield with loading state
        title: effectiveLoading ? 'Loading...' : title,
        sources: effectiveLoading ? [] : sources,
        messages: effectiveLoading ? [] : messages,
        setMessages,

        // Source management
        addSource,
        removeSource,
        updateSource,
        reorderSources,
        clearSheet,

        // Undo/Redo
        undo,
        redo,
        canUndo,
        canRedo,

        // Chat
        sendMessage,
        isChatLoading,

        // Persistence state
        currentSheetId,
        userSheets,
        isPersisted,
        isSaving,
        isDirty,
        isLoading: effectiveLoading,

        // Sheet management
        loadSheet,
        createNewSheet,
        deleteSheet,

        // Google Docs sync
        googleDocId,
        googleDocUrl,
        lastSyncedAt,
        isSyncing,
        linkToGoogleDoc,
        syncToLinkedGoogleDoc,
        unlinkGoogleDoc,

        // Disambiguation
        disambiguationState,
        resolveDisambiguation,
        cancelDisambiguation
    };
};
