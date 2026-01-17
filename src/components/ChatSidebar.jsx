import React, { useState, useRef, useEffect } from 'react';

const ChatSidebar = ({ messages, onSendMessage, onAddSource, isLoading, isMobileOpen, onMobileClose, darkMode }) => {
    const [inputObj, setInputObj] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputObj.trim()) return;
        onSendMessage(inputObj);
        setInputObj('');
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
                    {/* Mobile Close Button */}
                    <button className="mobile-close-btn" onClick={onMobileClose}>
                        &times;
                    </button>
                </div>
                <span className="status-indicator">Online</span>
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
                    <div className="message model loading">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={inputObj}
                    onChange={(e) => setInputObj(e.target.value)}
                    placeholder="Ask a question or find a text..."
                />
                <button type="submit" disabled={isLoading}>Send</button>
            </form>
        </div>
    );
};

export default ChatSidebar;
