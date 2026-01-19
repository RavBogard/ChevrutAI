import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useFirestore } from '../hooks/useFirestore';
import { getSefariaText } from '../services/sefaria';
import SheetView from './SheetView';
import ChatSidebar from './ChatSidebar';

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
        resetHistory
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
        } catch { }
        return [{
            id: 'welcome',
            role: 'model',
            text: 'Shalom! What kind of text sheet do you want to create together?',
            suggestedSources: []
        }];
    });

    const [isLoading, setIsLoading] = useState(false);
    const [suggestedPrompt] = useState('');

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
        createNewSheet,
        currentSheetId,
        setCurrentSheetId
    } = useFirestore(sheetTitle, sourcesList, messages);

    // Sync URL ID with System
    useEffect(() => {
        if (!sheetId) return;

        if (sheetId !== currentSheetId) {
            const isTimestamp = /^\d+$/.test(sheetId);

            if (isTimestamp && !currentSheetId) {
                setCurrentSheetId(sheetId);
            } else if (currentSheetId && sheetId !== currentSheetId) {
                loadSheet(sheetId, setSourcesList, setMessages, setSheetTitle).then((loaded) => {
                    if (!loaded && isTimestamp) {
                        setSourcesList([]);
                        setMessages([{
                            id: 'welcome',
                            role: 'model',
                            text: 'Shalom! What kind of text sheet do you want to create together?',
                            suggestedSources: []
                        }]);
                        setSheetTitle("New Source Sheet");
                        setCurrentSheetId(sheetId);
                    }
                });
            } else if (!currentSheetId) {
                loadSheet(sheetId, setSourcesList, setMessages, setSheetTitle).then((loaded) => {
                    if (!loaded) {
                        setCurrentSheetId(sheetId);
                    }
                });
            }
        }
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

            if (!response.ok) throw new Error("API Request Failed");

            const data = await response.json();

            const botMessage = {
                id: Date.now().toString(),
                role: 'model',
                text: data.text,
                suggestedSources: data.suggested_sources || []
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error(error);
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

    const handleRemoveSource = (indexOrId) => {
        setSourcesList(items => items.filter(item => item.id !== indexOrId));
    };

    const handleUpdateSource = (id, updates) => {
        setSourcesList(items => items.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
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

    const [sidebarWidth, setSidebarWidth] = useState(350);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Auto-open sidebar when chat starts (desktop only)
    useEffect(() => {
        if (messages.length > 1 && window.innerWidth > 768 && !isSidebarOpen) {
            setIsSidebarOpen(true);
        }
    }, [messages]);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
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
    }, [isResizing]);

    return (
        <div className={`app-container ${messages.length > 1 ? 'chat-active' : 'chat-initial'}`}>

            {/* Hamburger Menu - Always visible in top left */}
            <button className="main-hamburger-btn" onClick={toggleSidebar} title="Toggle Menu">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
                    <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
                </svg>
            </button>

            {/* Sidebar Wrapper */}
            <div
                className={`chat-sidebar-wrapper ${isSidebarOpen ? 'open' : 'closed'}`}
                style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
            >
                <ChatSidebar
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onAddSource={handleAddSource}
                    sheetSources={sourcesList}
                    isLoading={isLoading}
                    isMobileOpen={mobileChatOpen}
                    onMobileClose={() => setMobileChatOpen(false)}
                    darkMode={darkMode}
                    toggleDarkMode={toggleDarkMode}
                    language={language}
                    userSheets={userSheets}
                    onLoadSheet={handleLoadSheet}
                    currentSheetId={currentSheetId}
                />
            </div>

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
                onSuggestionClick={sendMessageToGemini}
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

            {messages.length > 1 && (
                <button
                    className="mobile-chat-fab"
                    onClick={() => setMobileChatOpen(true)}
                    aria-label="Open Chat"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            )}

            {!isLoading && messages.length <= 1 && (
                <div className="initial-toggles">
                    <button
                        className="initial-theme-toggle"
                        onClick={toggleLanguage}
                        title={language === 'en' ? "Switch to Hebrew" : "Switch to English"}
                    >
                        {language === 'en' ? (
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'var(--font-hebrew)' }}>עב</span>
                        ) : (
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>EN</span>
                        )}
                    </button>

                    <button
                        className="initial-theme-toggle"
                        onClick={toggleDarkMode}
                        title="Toggle Theme"
                    >
                        {darkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        )}
                    </button>
                </div>
            )}

            {mobileChatOpen && (
                <div className="mobile-chat-backdrop" onClick={() => setMobileChatOpen(false)}></div>
            )}
        </div>
    );
};

export default EditorContainer;
