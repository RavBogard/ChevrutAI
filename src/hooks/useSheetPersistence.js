import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    saveSheetToFirestore,
    subscribeToUserSheets,
    getSheetFromFirestore,
    deleteSheetFromFirestore
} from '../services/firebase';
import { useToast } from '../components/Toast';
import { getSefariaText } from '../services/sefaria';
import { sendGeminiMessage } from '../services/ai';

/**
 * Unified hook for sheet state management and persistence.
 * Addresses the architectural issues in the previous implementation:
 * - Uses refs to avoid stale closures in timeouts
 * - Single source of truth for all sheet data
 * - Robust error handling and loading state management
 * - Proper cleanup on unmount
 */
export const useSheetPersistence = (urlSheetId) => {
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
    const [isLoading, setIsLoading] = useState(false);

    // Chat loading state
    const [isChatLoading, setIsChatLoading] = useState(false);

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
        }
    }, [historyIndex, sourcesHistory]);

    const redo = useCallback(() => {
        if (historyIndex < sourcesHistory.length - 1) {
            setHistoryIndex(i => i + 1);
            setSources(sourcesHistory[historyIndex + 1]);
        }
    }, [historyIndex, sourcesHistory]);

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

    // ========== LOAD SHEET FROM URL ==========
    useEffect(() => {
        if (!urlSheetId) return;

        const loadFromUrl = async () => {
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
                } else {
                    // New sheet - use URL ID as canonical ID
                    setCurrentSheetId(urlSheetId);
                    setIsPersisted(false);
                    setIsDirty(false);
                    // Reset to defaults
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
            } catch (error) {
                console.error('Failed to load sheet:', error);
                if (mountedRef.current) {
                    showToast('Failed to load sheet', 'error');
                }
            } finally {
                if (mountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        loadFromUrl();
    }, [urlSheetId, currentSheetId, isPersisted, showToast]);

    // ========== AUTOSAVE LOGIC ==========
    useEffect(() => {
        // Skip if not logged in or still loading
        if (!currentUser || isLoading) return;

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
            if (!mountedRef.current) return;
            if (isLoading) return;

            // Use the LATEST data from ref, not stale closure
            const dataToSave = latestDataRef.current;
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

                await saveSheetToFirestore(currentUser.uid, sheetData);

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
    }, [currentUser, title, sources, messages, isPersisted, isLoading, currentSheetId, urlSheetId, showToast]);

    // ========== SOURCE MANAGEMENT ==========
    const addSource = useCallback(async (source) => {
        // Custom notes and headers don't need fetching
        if (source.type === 'custom' || source.type === 'header') {
            updateSources(prev => [...prev, source]);
            return;
        }

        // Fetch text if needed
        if (!source.he || !source.en) {
            try {
                const data = await getSefariaText(source.ref);
                if (data) {
                    source.he = data.he;
                    source.en = data.en;
                    source.versions = data.versions;
                    source.versionTitle = data.versionTitle;
                } else {
                    showToast(`Could not fetch text for ${source.ref}`, 'error');
                    return;
                }
            } catch (error) {
                showToast(`Could not fetch text for ${source.ref}`, 'error');
                return;
            }
        }
        updateSources(prev => [...prev, source]);
    }, [updateSources, showToast]);

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

        setIsChatLoading(true);
        try {
            const data = await sendGeminiMessage(text, [...messages, userMsg]);

            // Auto-title if still default
            if (data.suggested_title && title === 'New Source Sheet') {
                setTitle(data.suggested_title);
            }

            const botMessage = {
                id: Date.now().toString(),
                role: 'model',
                text: data.content || data.text || '',
                suggestedSources: data.suggested_sources || []
            };

            if (mountedRef.current) {
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            if (mountedRef.current) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: "I'm having trouble connecting right now. Please try again.",
                    suggestedSources: []
                }]);
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

    // ========== RETURN VALUES ==========
    return {
        // Sheet content
        title,
        setTitle,
        sources,
        messages,
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
        isLoading,

        // Sheet management
        loadSheet,
        createNewSheet,
        deleteSheet
    };
};
