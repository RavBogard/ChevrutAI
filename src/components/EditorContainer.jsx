import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSheetPersistence } from '../hooks/useSheetPersistence';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import SheetView from './SheetView';
import ChatSidebar from './ChatSidebar';
import UnifiedHeader from './UnifiedHeader';
import GuestBanner from './common/GuestBanner';
import SavingIndicator from './common/SavingIndicator';

const EditorContainer = ({ darkMode, toggleDarkMode, language, toggleLanguage }) => {
    const { sheetId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // --- Unified State Management ---
    const {
        // Sheet content
        title,
        setTitle,
        sources,
        messages,

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
        isDirty,
        isSaving,
        isLoading,

        // Sheet management
        loadSheet,
        createNewSheet,
        deleteSheet,

        // Google Docs sync
        googleDocId,
        googleDocUrl,
        isSyncing,
        linkToGoogleDoc,
        syncToLinkedGoogleDoc,
        unlinkGoogleDoc
    } = useSheetPersistence(sheetId);

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

    // --- Event Handlers ---
    const handleSendMessage = (text) => {
        sendMessage(text);
    };

    const handleSuggestionClick = (text) => {
        handleSendMessage(text);
        if (window.innerWidth <= 768) {
            setMobileChatOpen(true);
        } else {
            setIsSidebarOpen(true);
        }
    };

    const handleLoadSheet = async (id) => {
        const loaded = await loadSheet(id);
        if (loaded) {
            navigate(`/sheet/${id}`);
        }
    };

    const handleNewSheet = () => {
        const newId = Date.now().toString();
        createNewSheet(newId);
        navigate(`/sheet/${newId}`);
    };

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

    // --- Derived State ---
    const isHomeState = sources.length === 0 && messages.length <= 1;
    const chatStarted = messages.length > 1;

    // --- Loading State ---
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Loading...
            </div>
        );
    }

    return (
        <div className={`app-container ${chatStarted ? 'chat-active' : 'chat-initial'}`}>

            {/* Guest Mode Banner */}
            {/* Guest Mode Banner */}
            {!currentUser && sources.length > 0 && <GuestBanner />}

            {/* Saving Indicator */}
            {isSaving && <SavingIndicator />}

            {/* Unified Sticky Header */}
            <UnifiedHeader
                onToggleSidebar={toggleSidebar}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                language={language}
                toggleLanguage={toggleLanguage}
                isSidebarOpen={isSidebarOpen}
                isHome={isHomeState}
            />

            {/* Desktop Sidebar */}
            <div
                className={`chat-sidebar-wrapper ${isSidebarOpen ? 'open' : 'closed'} desktop-sidebar`}
                style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
            >
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
            </div>

            {/* Mobile Sidebar Drawer */}
            {mobileChatOpen && (
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
            )}

            {/* Resizer */}
            {isSidebarOpen && (
                <div
                    className="resizer"
                    onMouseDown={startResizing}
                ></div>
            )}

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
            />

            {/* Mobile Backdrop */}
            {mobileChatOpen && (
                <div className="mobile-chat-backdrop" onClick={() => setMobileChatOpen(false)}></div>
            )}
        </div>
    );
};

export default EditorContainer;
