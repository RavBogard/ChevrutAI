import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useFirestore } from '../hooks/useFirestore';
import { useSheetManager } from '../hooks/useSheetManager';
import { useChat } from '../hooks/useChat';
import { useResizableSidebar } from '../hooks/useResizableSidebar';
import SheetView from './SheetView';
import ChatSidebar from './ChatSidebar';
import UnifiedHeader from './UnifiedHeader';

// Wrapper to pass params to logic
const EditorContainer = ({ darkMode, toggleDarkMode, language, toggleLanguage }) => {
    const { sheetId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    // eslint-disable-next-line no-unused-vars
    const { showToast } = useToast();

    // --- State Management Hooks ---
    const {
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
        clearSheet
    } = useSheetManager();

    const {
        messages,
        setMessages,
        isLoading,
        handleSendMessage: _handleSendMessage
    } = useChat();

    // Wrapper to pass title state to chat for auto-titling
    const handleSendMessage = (text) => {
        _handleSendMessage(text, sheetTitle, setSheetTitle);
    };

    // --- Firestore Sync ---
    const {
        userSheets,
        loadSheet,
        currentSheetId,
        setCurrentSheetId,
        deleteSheet
    } = useFirestore(sheetTitle, sourcesList, messages);

    // Sync URL ID with System
    useEffect(() => {
        if (!sheetId) return;
        if (sheetId !== currentSheetId) {
            // Always try to load from Firestore first. If it doesn't exist, treat as new sheet.
            loadSheet(sheetId, setSourcesList, setMessages, setSheetTitle).then((loaded) => {
                if (!loaded) {
                    // Sheet doesn't exist in Firestore, treat as new sheet
                    setCurrentSheetId(sheetId);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sheetId]);

    // --- Sidebar & Resizing Logic ---
    const {
        sidebarWidth,
        isSidebarOpen,
        isResizing,
        startResizing,
        toggleSidebar,
        mobileChatOpen,
        setMobileChatOpen,
        setIsSidebarOpen
    } = useResizableSidebar();

    // Auto-open sidebar only when chat starts (desktop only)
    useEffect(() => {
        const isDesktop = window.innerWidth > 768;
        if (isDesktop && !isSidebarOpen) {
            if (messages.length > 1) {
                setIsSidebarOpen(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    const handleSuggestionClick = (text) => {
        handleSendMessage(text);
        if (window.innerWidth <= 768) {
            setMobileChatOpen(true);
        } else {
            setIsSidebarOpen(true);
        }
    };



    // --- UX SAFETY FEATURES ---

    // 1. Unsaved Changes Warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (sourcesList.length > 0) {
                e.preventDefault();
                e.returnValue = ''; // Trigger browser warning
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [sourcesList]);

    // 2. Logo Logic
    // "Home" is when we have no sources AND we haven't really started chatting (just welcome msg)
    const isHomeState = sourcesList.length === 0 && messages.length <= 1;

    return (
        <div className={`app-container ${messages.length > 1 ? 'chat-active' : 'chat-initial'}`}>

            {/* Guest Mode Banner */}
            {!currentUser && sourcesList.length > 0 && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    background: '#fff7ed', // orange-50
                    color: '#c2410c', // orange-700
                    textAlign: 'center',
                    padding: '4px',
                    fontSize: '0.8rem',
                    zIndex: 2000, // Above everything
                    borderBottom: '1px solid #fed7aa'
                }}>
                    Guest Mode: Changes are not saved to an account. Sign in to save.
                </div>
            )}

            {/* Unified Sticky Header (Mobile & Desktop) */}
            <UnifiedHeader
                onToggleSidebar={toggleSidebar}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                language={language}
                toggleLanguage={toggleLanguage}
                isSidebarOpen={isSidebarOpen}
                isHome={isHomeState} // <-- Calculated logic passed down
            />

            {/* Sidebar Wrapper for Desktop */}
            <div
                className={`chat-sidebar-wrapper ${isSidebarOpen ? 'open' : 'closed'} desktop-sidebar`}
                style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
            >
                <ChatSidebar
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onAddSource={handleAddSource}
                    sheetSources={sourcesList}
                    isLoading={isLoading}
                    isMobileOpen={false} // Desktop doesn't use this prop
                    onMobileClose={() => { }}
                    onToggleSidebar={toggleSidebar}
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    language={language}
                    userSheets={userSheets}
                    onLoadSheet={(id) => loadSheet(id, setSourcesList, setMessages, setSheetTitle).then(() => navigate(`/sheet/${id}`))}
                    currentSheetId={currentSheetId}
                    onDeleteSheet={deleteSheet}
                />
            </div>

            {/* Mobile Sidebar Drawer */}
            {mobileChatOpen && (
                <div className={`chat-sidebar-wrapper mobile-drawer open`}>
                    <ChatSidebar
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        onAddSource={handleAddSource}
                        sheetSources={sourcesList}
                        isLoading={isLoading}
                        isMobileOpen={true}
                        onMobileClose={() => setMobileChatOpen(false)}
                        onToggleSidebar={() => setMobileChatOpen(false)}
                        darkMode={darkMode}
                        toggleDarkMode={toggleDarkMode}
                        language={language}
                        userSheets={userSheets}
                        onLoadSheet={(id) => {
                            loadSheet(id, setSourcesList, setMessages, setSheetTitle);
                            navigate(`/sheet/${id}`);
                            setMobileChatOpen(false);
                        }}
                        currentSheetId={currentSheetId}
                        onDeleteSheet={deleteSheet}
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
                sources={sourcesList}
                onRemoveSource={handleRemoveSource}
                onUpdateSource={handleUpdateSource}
                onReorder={handleReorder}
                onClearSheet={clearSheet}
                onUndo={undoSources}
                onRedo={redoSources}
                canUndo={canUndo}
                canRedo={canRedo}
                language={language}
                onSuggestionClick={handleSuggestionClick}
                sheetTitle={sheetTitle}
                onTitleChange={setSheetTitle}
                onSendMessage={handleSendMessage}
                chatStarted={messages.length > 1}
                onAddSource={handleAddSource}
                userSheets={userSheets}
                onLoadSheet={(id) => loadSheet(id, setSourcesList, setMessages, setSheetTitle).then(() => navigate(`/sheet/${id}`))}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                toggleLanguage={toggleLanguage}
            />

            {/* Mobile Backdrop */}
            {mobileChatOpen && (
                <div className="mobile-chat-backdrop" onClick={() => setMobileChatOpen(false)}></div>
            )}
        </div>
    );
};

export default EditorContainer;
