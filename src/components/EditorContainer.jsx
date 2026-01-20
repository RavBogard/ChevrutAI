import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useFirestore } from '../hooks/useFirestore';
import { getSefariaText } from '../services/sefaria';
import SheetView from './SheetView';
import ChatSidebar from './ChatSidebar';
import UnifiedHeader from './UnifiedHeader';

// Wrapper to pass params to logic
const EditorContainer = ({ darkMode, toggleDarkMode, language, toggleLanguage }) => {
    const { sheetId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const [mobileChatOpen, setMobileChatOpen] = useState(false);

    // Undo/Redo enabled sourcesList with localStorage persistence
    const {
        state: sourcesList,
        setState: setSourcesList,
        undo: undoSources,
        redo: redoSources,
        canUndo,
        canRedo,

        resetHistory: _resetHistory
    } = useUndoRedo(() => {
        try {
            const saved = localStorage.getItem('chevruta_sources');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    });

    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('chevruta_messages');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.length > 0 ? parsed : [{
                    id: 'welcome',
                    role: 'model',
                    text: 'Shalom! What kind of text sheet do you want to create together?',
                    suggestedSources: []
                }];
            }
        } catch { /* Ignore parse errors */ }
        return [{
            id: 'welcome',
            role: 'model',
            text: 'Shalom! What kind of text sheet do you want to create together?',
            suggestedSources: []
        }];
    });

    const [isLoading, setIsLoading] = useState(false);

    const [sheetTitle, setSheetTitle] = useState(() => {
        return localStorage.getItem('chevruta_title') || "New Source Sheet";
    });

    // Persist state changes to localStorage
    useEffect(() => {
        localStorage.setItem('chevruta_sources', JSON.stringify(sourcesList));
    }, [sourcesList]);

    useEffect(() => {
        localStorage.setItem('chevruta_messages', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        localStorage.setItem('chevruta_title', sheetTitle);
    }, [sheetTitle]);

    // Cloud Persistence & Autosave
    const {
        userSheets,
        loadSheet,
        // eslint-disable-next-line no-unused-vars
        createNewSheet,
        currentSheetId,
        setCurrentSheetId,
        deleteSheet
    } = useFirestore(sheetTitle, sourcesList, messages);

    // Sync URL ID with System
    // Sync URL ID with System
    useEffect(() => {
        if (!sheetId) return;

        // Only act if the URL ID differs from our current internal state
        if (sheetId !== currentSheetId) {
            const isTimestamp = /^\d+$/.test(sheetId);

            if (isTimestamp) {
                // If it's a numeric timestamp ID (draft/legacy), we adopt it immediately.
                // This allows new drafts to be created with a specific ID.
                setCurrentSheetId(sheetId);
            } else {
                // If it's a Firestore alphanumeric ID, we MUST load existing data.
                loadSheet(sheetId, setSourcesList, setMessages, setSheetTitle).then((loaded) => {
                    if (!loaded) {
                        setCurrentSheetId(sheetId);
                    }
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sheetId]);

    const sendMessageToGemini = async (userText) => {
        setIsLoading(true);
        try {
            let historyMessages = messages.slice(-10);
            historyMessages = historyMessages.filter(m => m.text && m.text.trim() !== '');
            if (historyMessages.length > 0 && historyMessages[0].role === 'model') {
                historyMessages = historyMessages.slice(1);
            }
            const history = historyMessages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    history: history
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error("API Error:", response.status, errorData);
                throw new Error(`API Request Failed: ${response.status}`);
            }

            const data = await response.json();

            // Handle suggested_title if provided
            if (data.suggested_title && sheetTitle === 'New Source Sheet') {
                setSheetTitle(data.suggested_title);
            }

            const botMessage = {
                id: Date.now().toString(),
                role: 'model',
                text: data.content || data.text || '', // Support both field names
                suggestedSources: data.suggested_sources || []
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "I'm having trouble connecting to the Beit Midrash right now. Please try again.",
                suggestedSources: []
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSource = async (source) => {
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

    const handleLoadSheet = async (id) => {
        await loadSheet(id, setSourcesList, setMessages, setSheetTitle);
        navigate(`/sheet/${id}`);
    };

    const handleSendMessage = (text) => {
        const userMsg = { id: Date.now().toString(), role: 'user', text: text };
        setMessages(prev => [...prev, userMsg]);
        sendMessageToGemini(text);
    };

    const [sidebarWidth, setSidebarWidth] = useState(400);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

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

    const toggleSidebar = () => {
        if (window.innerWidth <= 768) {
            setMobileChatOpen(prev => !prev);
        } else {
            setIsSidebarOpen(prev => !prev);
        }
    };
    const startResizing = () => setIsResizing(true);
    const stopResizing = () => setIsResizing(false);

    const resize = (mouseMoveEvent) => {
        if (isResizing) {
            const newWidth = mouseMoveEvent.clientX;
            if (newWidth > 300 && newWidth < 800) {
                setSidebarWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isResizing]);

    const handleSuggestionClick = (text) => {
        handleSendMessage(text);
        if (window.innerWidth <= 768) {
            setMobileChatOpen(true);
        } else {
            setIsSidebarOpen(true);
        }
    };

    return (
        <div className={`app-container ${messages.length > 1 ? 'chat-active' : 'chat-initial'}`}>

            {/* Unified Sticky Header (Mobile & Desktop) */}
            <UnifiedHeader
                onToggleSidebar={toggleSidebar}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                language={language}
                toggleLanguage={toggleLanguage}
                isSidebarOpen={isSidebarOpen}
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
                    onLoadSheet={handleLoadSheet}
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
                            handleLoadSheet(id);
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
                onClearSheet={() => {
                    if (window.confirm("Are you sure you want to clear the sheet?")) {
                        setSourcesList([]);
                    }
                }}
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
                onLoadSheet={handleLoadSheet}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                toggleLanguage={toggleLanguage}
            />

            {/* Toggles moved to SheetView for better alignment with UserMenu */}
            {mobileChatOpen && (
                <div className="mobile-chat-backdrop" onClick={() => setMobileChatOpen(false)}></div>
            )}
        </div>
    );
};

export default EditorContainer;
