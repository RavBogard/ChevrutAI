import React, { useState, useRef, useEffect } from 'react';

const ChatSidebar = ({ messages, onSendMessage, onAddSource, isLoading, isMobileOpen, onMobileClose, darkMode, toggleDarkMode, suggestedInput }) => {
    const [inputObj, setInputObj] = useState('');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Update input when a suggestion is clicked from the empty state
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

    return (
        <div className={`chat-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
            <div className="chat-header">
                <div className="header-top-row">
                    <img
                        src={darkMode ? "/logo-dark.png" : "/logo.png"}
                        alt="ChevrutAI"
                        className="sidebar-logo"
                    />
                    <div className="header-controls">
                        <button
                            className="theme-toggle-btn"
                            onClick={toggleDarkMode}
                            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {darkMode ? (
                                // Sun Icon
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5"></circle>
                                    <line x1="12" y1="1" x2="12" y2="3"></line>
                                    <line x1="12" y1="21" x2="12" y2="23"></line>
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                    <line x1="1" y1="12" x2="3" y2="12"></line>
                                    <line x1="21" y1="12" x2="23" y2="12"></line>
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                                </svg>
                            ) : (
                                // Moon Icon
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                                </svg>
                            )}
                        </button>
                        {/* Mobile Close Button */}
                        <button className="mobile-close-btn" onClick={onMobileClose}>
                            &times;
                        </button>
                    </div>
                </div>
            </div>

            <div className="messages-list">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        <div className="message-content">
                            {msg.text && <p>{msg.text}</p>}

                            {msg.suggestedSources && msg.suggestedSources.length > 0 && (
                                <div className="suggested-sources">
                                    <h4>Suggest Sources:</h4>
                                    {msg.suggestedSources.map((source, idx) => (
                                        <div key={idx} className="source-suggestion-card">
                                            <div className="source-info">
                                                <strong>{source.ref}</strong>
                                                <span className="source-summary">{source.summary}</span>
                                            </div>
                                            <button
                                                className="add-source-btn"
                                                onClick={() => onAddSource(source)}
                                            >
                                                + Add to Sheet
                                            </button>
                                        </div>
                                    ))}
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
                        {/* Send / Arrow Icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatSidebar;
