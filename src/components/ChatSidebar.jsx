import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ChatSidebar = ({
    messages,
    onSendMessage,
    onAddSource,
    sheetSources,
    isLoading,
    isMobileOpen,
    onMobileClose,
    darkMode,
    toggleDarkMode,
    language,
    suggestedInput,
    userSheets = [],
    onLoadSheet,
    currentSheetId
}) => {
    const [inputObj, setInputObj] = useState('');
    const [activeTab, setActiveTab] = useState('chat');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (activeTab === 'chat') {
            scrollToBottom();
        }
    }, [messages, isLoading, activeTab]);

    // ... (rest of input logic, keep lines 28-70 same, but need to include them if I replace the whole component function body or just parts)
    // To be safe and since I'm wrapping the return in a conditional, I might need to replace a large chunk.

    // Let's rewrite the render part mainly. 
    // But first, let's keep the hook logic. I need to copy the `useEffect` and handlers.

    // Update input when a suggestion is clicked from the empty state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (suggestedInput) {
            setInputObj(suggestedInput);
            if (textareaRef.current) {
                textareaRef.current.focus();
                // Reset height
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suggestedInput]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputObj(val);

        // Auto-resize
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset to calculate new shrinkage
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'; // Cap at 150px
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputObj.trim()) return;
        onSendMessage(inputObj);
        setInputObj('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className={`chat-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
            <div className="chat-header">
                <div className="header-top-row">
                    <button
                        className="new-chat-btn-sidebar"
                        onClick={() => { window.location.hash = '#/'; window.location.reload(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', borderRadius: '24px',
                            background: '#dde3ea', border: 'none',
                            fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', color: '#444746'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> New Chat
                    </button>
                    <div className="header-controls">
                        <button
                            className="theme-toggle-btn"
                            onClick={toggleDarkMode}
                            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {darkMode ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                            )}
                        </button>
                        <button className="mobile-close-btn" onClick={onMobileClose} aria-label="Close chat">
                            &times;
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="sidebar-tabs">
                    <button
                        className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => handleTabChange('chat')}
                    >
                        Chat
                    </button>
                    <button
                        className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => handleTabChange('history')}
                    >
                        My Sheets
                    </button>
                </div>
            </div>

            {activeTab === 'chat' ? (
                <>
                    <div className="messages-list">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.role} `}>
                                <div className="message-content">
                                    {msg.text && <p>{msg.text}</p>}

                                    {msg.suggestedSources && msg.suggestedSources.length > 0 && (
                                        <div className="suggested-sources">
                                            <h4>Suggest Sources:</h4>
                                            {msg.suggestedSources.map((source, idx) => {
                                                const isAdded = Array.isArray(sheetSources) && sheetSources.some(s => s.ref === source.ref);
                                                return (
                                                    <div key={idx} className="source-suggestion-card">
                                                        <div className="source-info">
                                                            <strong>{source.ref}</strong>
                                                            <span className="source-summary">{source.summary}</span>
                                                        </div>
                                                        <button
                                                            className={`add - source - btn ${isAdded ? 'added' : ''} `}
                                                            onClick={() => !isAdded && onAddSource(source)}
                                                            disabled={isAdded}
                                                        >
                                                            {isAdded ? (
                                                                <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Added</>
                                                            ) : '+ Add to Sheet'}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="loading-indicator">
                                <div className="typing-dots">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                                <span>Searching Sefaria for relevant texts...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-container">
                        <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
                            <textarea
                                ref={textareaRef}
                                className="chat-textarea"
                                value={inputObj}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question or describe your source sheet..."
                                rows={1}
                                autoFocus
                            />
                            <button type="submit" className="send-button" disabled={isLoading || !inputObj.trim()}>
                                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                                    <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="history-list">
                    {userSheets.length === 0 ? (
                        <div className="empty-history">
                            <p>No saved sheets yet.</p>
                            <small>Sign in and start creating sheets to see them here.</small>
                        </div>
                    ) : (
                        userSheets.map((sheet) => (
                            <div
                                key={sheet.id}
                                className={`history-item ${currentSheetId === sheet.id ? 'active' : ''}`}
                                onClick={() => onLoadSheet(sheet.id)}
                            >
                                <div className="history-title">{sheet.title || "Untitled Sheet"}</div>
                                <div className="history-meta">
                                    {sheet.updatedAt && sheet.updatedAt.seconds
                                        ? new Date(sheet.updatedAt.seconds * 1000).toLocaleDateString()
                                        : 'Just now'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;
