import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import Logo from './common/Logo';

const ChatSidebar = ({
    messages,
    onSendMessage,
    onAddSource,
    sheetSources,
    isLoading,
    isMobileOpen,
    onMobileClose,
    onToggleSidebar,
    suggestedInput,
    userSheets = [],
    onLoadSheet,
    currentSheetId,
    onDeleteSheet
}) => {
    const [inputObj, setInputObj] = useState('');
    const [activeTab, setActiveTab] = useState('chat');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const hasSetInitialTab = useRef(false);

    // Default to 'history' (My Sheets) if user has sheets and hasn't started chatting
    // Set initial tab based on user sheets - intentional state sync
    useEffect(() => {
        if (!hasSetInitialTab.current && userSheets && userSheets.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveTab('history');
            hasSetInitialTab.current = true;
        }
    }, [userSheets]);

    // Switch to chat tab when user sends a message OR interacts with sheet (has sources)
    // Switch to chat tab ONLY when a NEW message arrives
    const prevMessageCount = useRef(messages.length);
    useEffect(() => {
        if (messages.length > prevMessageCount.current) {
            setActiveTab('chat');
        }
        prevMessageCount.current = messages.length;
    }, [messages]);

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

    useEffect(() => {
        if (suggestedInput) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setInputObj(suggestedInput);
            if (textareaRef.current) {
                textareaRef.current.focus();
                // Reset height
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            }
        }

    }, [suggestedInput]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputObj(val);

        // Auto-resize
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset to calculate new shrinkage
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 400) + 'px'; // Dynamic resize up to 400px
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
                    {/* Unified Sidebar Toggle (Left) - Always visible, acts as Close */}
                    <button
                        className="sidebar-toggle-btn"
                        onClick={onToggleSidebar}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: '8px', borderRadius: '50%', color: 'var(--sheet-text)',
                            marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '40px', height: '40px'
                        }}
                        title="Close Menu"
                    >
                        {/* Close Icon (X) to replace Hamburger */}
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
                            <path d="M280-120 120-280l360-360 360 360-160 160-200-200-200 200Z" style={{ display: 'none' }} /> {/* Placeholder, real path below */}
                            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                        </svg>
                    </button>

                    <Logo
                        onClick={() => {
                            localStorage.removeItem('chevruta_sources');
                            localStorage.removeItem('chevruta_messages');
                            localStorage.removeItem('chevruta_title');
                            window.location.hash = '#/';
                            window.location.reload();
                        }}
                    />

                    <button
                        className="new-chat-btn-sidebar"
                        onClick={() => {
                            localStorage.removeItem('chevruta_sources');
                            localStorage.removeItem('chevruta_messages');
                            localStorage.removeItem('chevruta_title');
                            window.location.hash = '#/';
                            window.location.reload();
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'var(--input-bg)', border: 'none',
                            fontSize: '1.2rem', fontWeight: '500', cursor: 'pointer', color: 'var(--sheet-text)'
                        }}
                        title="New Chat"
                    >
                        +
                    </button>

                    {/* Removed redundant mobile-close-btn */}
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
                                    {msg.text && (
                                        <ReactMarkdown
                                            className="markdown-content"
                                            components={{
                                                a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    )}

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
                        {messages.length <= 1 && (
                            <div className="starter-chips" style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {['Parashat Noah', 'Ethics of War', 'Shabbat Candles', 'Laws of Tzedakah'].map(chip => (
                                    <button
                                        key={chip}
                                        onClick={() => setInputObj(chip)}
                                        style={{
                                            background: 'var(--sheet-bg)',
                                            border: '1px solid var(--primary-color)',
                                            color: 'var(--primary-color)',
                                            borderRadius: '16px',
                                            padding: '4px 12px',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        )}
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

                        {/* Onboarding Tooltip */}
                        {messages.length <= 1 && !localStorage.getItem('hasSeenOnboarding') && (
                            <div className="onboarding-tooltip" style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '20px',
                                background: '#1e40af',
                                color: 'white',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '10px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                maxWidth: '250px',
                                zIndex: 100
                            }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Start Here! 👋</div>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>Ask the AI to find a text, or pick a starter topic above.</p>
                                <button
                                    onClick={() => {
                                        localStorage.setItem('hasSeenOnboarding', 'true');
                                        // Force re-render trick or just let it hide on next load. 
                                        // For now, hide visually.
                                        document.querySelector('.onboarding-tooltip').style.display = 'none';
                                    }}
                                    style={{
                                        marginTop: '8px',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Got it
                                </button>
                                <div style={{
                                    content: '""',
                                    position: 'absolute',
                                    top: '100%',
                                    left: '20px',
                                    borderWidth: '8px',
                                    borderStyle: 'solid',
                                    borderColor: '#1e40af transparent transparent transparent'
                                }}></div>
                            </div>
                        )}
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
                        // Deduplicate sheets by ID
                        [...new Map(userSheets.map(s => [s.id, s])).values()].map((sheet) => (
                            <div
                                key={sheet.id}
                                className={`history-item ${currentSheetId === sheet.id ? 'active' : ''}`}
                                onClick={() => onLoadSheet(sheet.id)}
                            >
                                <div className="history-content-wrapper">
                                    <div className="history-title">{sheet.title || "Untitled Sheet"}</div>
                                    <div className="history-meta">
                                        {sheet.updatedAt && sheet.updatedAt.seconds
                                            ? new Date(sheet.updatedAt.seconds * 1000).toLocaleDateString()
                                            : 'Just now'}
                                    </div>
                                </div>
                                <button
                                    className="delete-sheet-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this sheet?')) {
                                            if (onDeleteSheet) onDeleteSheet(sheet.id);
                                        }
                                    }}
                                    title="Delete Sheet"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
                                        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;
