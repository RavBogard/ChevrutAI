import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { useAuth } from '../contexts/AuthContext';
import useSheetStore from '../stores/useSheetStore';
import { useAutosave } from '../hooks/useAutosave';
import {
    saveSheetToFirestore,
    getSheetFromFirestore,
    loadSheetWithDefaults,
    subscribeToUserSheets,
    deleteSheetFromFirestore
} from '../services/firebase';
import { getSefariaText, searchSefariaText } from '../services/sefaria';
import { sendGeminiMessage } from '../services/ai';
import { exportToGoogleDoc, syncToGoogleDoc } from '../services/google';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import { useToast } from '../components/Toast';
import SheetView from './SheetView';
import ChatSidebar from './ChatSidebar';
import UnifiedHeader from './UnifiedHeader';
import GuestBanner from './common/GuestBanner';
import SavingIndicator from './common/SavingIndicator';

const EditorContainer = ({ darkMode, toggleDarkMode, language, toggleLanguage }) => {
    const { sheetId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const { showToast } = useToast();

    // Check if we are redirected from a "New Sheet" action
    const isExplicitlyNew = location.state?.isNew;

    // --- Store State (reactive) ---
    const { title, sources, isSaving, isLoading, isDirty, currentSheetId } = useSheetStore(
        useShallow((s) => ({
            title: s.title,
            sources: s.sources,
            isSaving: s.isSaving,
            isLoading: s.isLoading,
            isDirty: s.isDirty,
            currentSheetId: s.currentSheetId,
        }))
    );

    // Undo/Redo availability (reactive via temporal store)
    const canUndo = useStoreWithEqualityFn(useSheetStore.temporal, (s) => s.pastStates.length > 0);
    const canRedo = useStoreWithEqualityFn(useSheetStore.temporal, (s) => s.futureStates.length > 0);

    // --- Local State (Phase 1: messages, userSheets, Google Docs, disambiguation stay local) ---
    const [messages, setMessages] = useState([{
        id: 'welcome',
        role: 'model',
        text: 'Shalom! What kind of text sheet do you want to create together?',
        suggestedSources: []
    }]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const [userSheets, setUserSheets] = useState([]);

    const [googleDocId, setGoogleDocId] = useState(null);
    const [googleDocUrl, setGoogleDocUrl] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const [disambiguationState, setDisambiguationState] = useState({
        isOpen: false,
        originalRef: '',
        options: [],
        pendingSource: null
    });

    // Track mount status for async callbacks
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // --- Autosave ---
    useAutosave(currentUser?.uid);

    // --- Load sheet from URL ---
    useEffect(() => {
        if (isExplicitlyNew) {
            const { resetSheet, setCurrentSheetId } = useSheetStore.getState();
            resetSheet();
            if (sheetId) setCurrentSheetId(sheetId);
            useSheetStore.temporal.getState().clear();
            setMessages([{
                id: 'welcome',
                role: 'model',
                text: 'Shalom! What kind of text sheet do you want to create together?',
                suggestedSources: []
            }]);
            setGoogleDocId(null);
            setGoogleDocUrl(null);
            return;
        }

        if (!sheetId) return;

        const { setIsLoading, loadSheet, resetSheet } = useSheetStore.getState();
        setIsLoading(true);
        getSheetFromFirestore(sheetId)
            .then((rawDoc) => {
                if (!mountedRef.current) return;
                if (rawDoc) {
                    const sheetData = loadSheetWithDefaults(rawDoc);
                    loadSheet(sheetData);
                    useSheetStore.temporal.getState().clear();
                    setGoogleDocId(rawDoc.googleDocId || null);
                    setGoogleDocUrl(rawDoc.googleDocUrl || null);
                    // Reset messages on sheet load
                    setMessages([{
                        id: 'welcome',
                        role: 'model',
                        text: 'Shalom! What kind of text sheet do you want to create together?',
                        suggestedSources: []
                    }]);
                } else {
                    resetSheet();
                    useSheetStore.getState().setCurrentSheetId(sheetId);
                    useSheetStore.getState().setIsLoading(false);
                    useSheetStore.temporal.getState().clear();
                }
            })
            .catch((err) => {
                console.error('[EditorContainer] Sheet load failed:', err);
                if (mountedRef.current) {
                    useSheetStore.getState().setIsLoading(false);
                }
            });
    }, [sheetId, isExplicitlyNew]);

    // --- Subscribe to user's sheet list ---
    useEffect(() => {
        if (!currentUser) {
            setUserSheets([]);
            return;
        }
        const unsubscribe = subscribeToUserSheets(currentUser.uid, (sheets) => {
            if (!mountedRef.current) return;
            const nonEmptySheets = sheets.filter(sheet => {
                return (sheet.sources && sheet.sources.length > 0);
            });
            setUserSheets(nonEmptySheets);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // --- Sidebar & Resizing Logic ---
    const {
        sidebarWidth,
        isSidebarOpen,
        startResizing,
        toggleSidebar,
        mobileChatOpen,
        setMobileChatOpen,
        setIsSidebarOpen
    } = useResizableSidebar();

    // Auto-open sidebar when chat starts (desktop only)
    useEffect(() => {
        const isDesktop = window.innerWidth > 768;
        if (isDesktop && !isSidebarOpen && messages.length > 1) {
            setIsSidebarOpen(true);
        }
    }, [messages, setIsSidebarOpen]);

    // --- UX Safety: Unsaved Changes Warning ---
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // --- Source Actions (delegate to store, with Sefaria fetch for non-custom sources) ---
    const addSource = useCallback(async (source) => {
        const { addSource: storeAddSource } = useSheetStore.getState();

        // Custom notes and headers don't need fetching
        if (source.type === 'custom' || source.type === 'header') {
            storeAddSource(source);
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

                if (data && !data.error && (!isEmptyText(data.he) || !isEmptyText(data.en))) {
                    source.he = data.he || null;
                    source.en = data.en || null;
                    source.ref = data.ref || source.ref;
                    source.versions = data.versions || [];
                    source.versionTitle = data.versionTitle || null;
                    storeAddSource(source);
                } else {
                    console.log("Fetch failed directly, searching for alternatives for:", source.ref);
                    const searchResults = await searchSefariaText(source.ref);

                    if (searchResults && searchResults.length > 0) {
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
            storeAddSource(source);
        }
    }, [showToast]);

    const removeSource = useCallback((index) => {
        useSheetStore.getState().removeSource(index);
    }, []);

    const updateSource = useCallback((index, updates) => {
        useSheetStore.getState().updateSource(index, updates);
    }, []);

    const reorderSources = useCallback((newSources) => {
        useSheetStore.getState().reorderSources(newSources);
    }, []);

    const clearSheet = useCallback(() => {
        if (window.confirm('Are you sure you want to clear the sheet?')) {
            useSheetStore.getState().reorderSources([]);
        }
    }, []);

    const setTitle = useCallback((newTitle) => {
        useSheetStore.getState().setTitle(newTitle);
    }, []);

    const undo = useCallback(() => {
        useSheetStore.temporal.getState().undo();
    }, []);

    const redo = useCallback(() => {
        useSheetStore.temporal.getState().redo();
    }, []);

    // --- Disambiguation ---
    const resolveDisambiguation = useCallback(async (selectedOption) => {
        if (!disambiguationState.pendingSource) return;
        const newSource = { ...disambiguationState.pendingSource };
        newSource.ref = selectedOption.ref;
        setDisambiguationState(prev => ({ ...prev, isOpen: false, pendingSource: null }));
        await addSource(newSource);
    }, [disambiguationState, addSource]);

    const cancelDisambiguation = useCallback(() => {
        setDisambiguationState(prev => ({ ...prev, isOpen: false, pendingSource: null }));
    }, []);

    // --- Chat Logic ---
    const sendMessage = useCallback(async (text) => {
        const userMsg = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);

        const botMsgId = (Date.now() + 1).toString();
        const initialBotMsg = { id: botMsgId, role: 'model', text: '', suggestedSources: [] };
        setMessages(prev => [...prev, initialBotMsg]);
        setIsChatLoading(true);

        try {
            const handleChunk = (currentText) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId ? { ...msg, text: currentText } : msg
                ));
            };

            const currentMessages = [];
            setMessages(prev => { Object.assign(currentMessages, prev); return prev; });

            const data = await sendGeminiMessage(
                text,
                [...messages, userMsg],
                sources,
                handleChunk
            );

            // Auto-title if still default
            if (data.suggested_title && title === 'New Source Sheet') {
                useSheetStore.getState().setTitle(data.suggested_title);
            }

            if (mountedRef.current) {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId
                        ? { ...msg, text: data.content, suggestedSources: data.suggested_sources || [] }
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
    }, [messages, title, sources]);

    // --- Sheet Management ---
    const handleLoadSheet = useCallback(async (id) => {
        useSheetStore.getState().setIsLoading(true);
        try {
            const rawDoc = await getSheetFromFirestore(id);
            if (!mountedRef.current) return false;
            if (rawDoc) {
                const sheetData = loadSheetWithDefaults(rawDoc);
                useSheetStore.getState().loadSheet(sheetData);
                useSheetStore.temporal.getState().clear();
                setGoogleDocId(rawDoc.googleDocId || null);
                setGoogleDocUrl(rawDoc.googleDocUrl || null);
                setMessages([{
                    id: 'welcome',
                    role: 'model',
                    text: 'Shalom! What kind of text sheet do you want to create together?',
                    suggestedSources: []
                }]);
                navigate(`/sheet/${id}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load sheet:', error);
            showToast('Failed to load sheet', 'error');
            return false;
        } finally {
            if (mountedRef.current) {
                useSheetStore.getState().setIsLoading(false);
            }
        }
    }, [navigate, showToast]);

    const handleNewSheet = useCallback(() => {
        const newId = Date.now().toString();
        useSheetStore.getState().resetSheet();
        useSheetStore.getState().setCurrentSheetId(newId);
        useSheetStore.temporal.getState().clear();
        setMessages([{
            id: 'welcome',
            role: 'model',
            text: 'Shalom! What kind of text sheet do you want to create together?',
            suggestedSources: []
        }]);
        setGoogleDocId(null);
        setGoogleDocUrl(null);
        navigate(`/sheet/${newId}`, { state: { isNew: true } });
    }, [navigate]);

    const deleteSheet = useCallback(async (id) => {
        try {
            await deleteSheetFromFirestore(id);
            showToast('Sheet deleted', 'success');
        } catch (error) {
            console.error('Failed to delete sheet:', error);
            showToast('Failed to delete sheet', 'error');
        }
    }, [showToast]);

    // --- Google Docs Sync ---
    const linkToGoogleDoc = useCallback(async () => {
        setIsSyncing(true);
        try {
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
            const formattedSources = sources.map(s => ({
                type: s.type || 'sefaria',
                title: s.title,
                citation: s.ref,
                hebrew: Array.isArray(s.he) ? s.he.join('\n') : s.he,
                english: Array.isArray(s.en) ? s.en.join('\n') : s.en,
                viewMode: s.viewMode || 'bilingual'
            }));
            await syncToGoogleDoc(googleDocId, title, formattedSources);
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

    // --- Derived State ---
    const isHomeState = sources.length === 0 && messages.length <= 1;
    const chatStarted = messages.length > 1;

    // --- Event Handlers ---
    const handleSendMessage = useCallback((text) => {
        sendMessage(text);
    }, [sendMessage]);

    const handleSuggestionClick = useCallback((text) => {
        handleSendMessage(text);
        if (window.innerWidth <= 768) {
            setMobileChatOpen(true);
        } else {
            setIsSidebarOpen(true);
        }
    }, [handleSendMessage, setMobileChatOpen, setIsSidebarOpen]);

    // --- Loading State ---
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Loading...
            </div>
        );
    }

    return (
        <div
            className="app-shell"
            data-sidebar-open={isSidebarOpen}
            style={{
                '--sidebar-width': `${sidebarWidth}px`
            }}
        >
            {/* Header Area */}
            <header className="shell-header">
                <UnifiedHeader
                    onToggleSidebar={toggleSidebar}
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    language={language}
                    toggleLanguage={toggleLanguage}
                    isSidebarOpen={isSidebarOpen}
                    isHome={isHomeState}
                />
            </header>

            {/* Sidebar Area */}
            <aside className="shell-sidebar">
                <ChatSidebar
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onAddSource={addSource}
                    sheetSources={sources}
                    isLoading={isChatLoading}
                    isMobileOpen={false}
                    onMobileClose={() => { }}
                    onToggleSidebar={toggleSidebar}
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    language={language}
                    userSheets={userSheets}
                    onLoadSheet={handleLoadSheet}
                    currentSheetId={currentSheetId}
                    onDeleteSheet={deleteSheet}
                    onNewSheet={handleNewSheet}
                />

                {/* Resizer inside sidebar area (positioned absolute right) */}
                {isSidebarOpen && (
                    <div
                        className="shell-resizer"
                        onMouseDown={startResizing}
                    ></div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="shell-content">
                <SheetView
                    sources={sources}
                    onRemoveSource={removeSource}
                    onUpdateSource={updateSource}
                    onReorder={reorderSources}
                    onClearSheet={clearSheet}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    language={language}
                    onSuggestionClick={handleSuggestionClick}
                    sheetTitle={title}
                    onTitleChange={setTitle}
                    onSendMessage={handleSendMessage}
                    chatStarted={chatStarted}
                    onAddSource={addSource}
                    userSheets={userSheets}
                    onLoadSheet={handleLoadSheet}
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    toggleLanguage={toggleLanguage}
                    googleDocId={googleDocId}
                    googleDocUrl={googleDocUrl}
                    isSyncing={isSyncing}
                    onSyncGoogleDoc={syncToLinkedGoogleDoc}
                    onUnlinkGoogleDoc={unlinkGoogleDoc}
                    onLinkToGoogleDoc={linkToGoogleDoc}
                    disambiguationState={disambiguationState}
                    onResolveDisambiguation={resolveDisambiguation}
                    onCancelDisambiguation={cancelDisambiguation}
                />
            </main>

            {/* Overlays / Global Elements */}
            <div className="shell-overlays">
                {!currentUser && sources.length > 0 && <GuestBanner />}
                {isSaving && <SavingIndicator />}
            </div>

            {/* Mobile Extras */}
            {mobileChatOpen && (
                <>
                    <div className="chat-sidebar-wrapper mobile-drawer open">
                        <ChatSidebar
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            onAddSource={addSource}
                            sheetSources={sources}
                            isLoading={isChatLoading}
                            isMobileOpen={true}
                            onMobileClose={() => setMobileChatOpen(false)}
                            onToggleSidebar={() => setMobileChatOpen(false)}
                            darkMode={darkMode}
                            toggleDarkMode={toggleDarkMode}
                            language={language}
                            userSheets={userSheets}
                            onLoadSheet={(id) => {
                                handleLoadSheet(id);
                                setMobileChatOpen(false);
                            }}
                            currentSheetId={currentSheetId}
                            onDeleteSheet={deleteSheet}
                            onNewSheet={() => {
                                handleNewSheet();
                                setMobileChatOpen(false);
                            }}
                        />
                    </div>
                    <div className="mobile-chat-backdrop" onClick={() => setMobileChatOpen(false)}></div>
                </>
            )}
        </div>
    );
};

export default EditorContainer;
