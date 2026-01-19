import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useFirestore } from '../hooks/useFirestore';
import { getSefariaText } from '../services/sefaria';
import SheetView from './SheetView';

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
            // It's a new ID for the system.
            // Try to load it.
            // If it's a numeric timestamp (approx), we treat as new/temp unless found
            // Check if it exists in userSheets? No, userSheets is partial.
            // We just try to load, if fails/not found, we assume it's a new draft key?
            // Actually, if we just navigated, we should try to load.
            const isTimestamp = /^\d+$/.test(sheetId);

            if (isTimestamp && !currentSheetId) {
                // It's a timestamp ID, likely new sheet.
                // We don't overwrite local storage if we already have content?
                // Logic: Logic should typically depend on useFirestore loading.
                // For now: we trust useFirestore or manual load.
                // If it IS a timestamp, and we have blank state, we are good.
                setCurrentSheetId(sheetId);
            } else if (currentSheetId && sheetId !== currentSheetId) {
                // User navigated from one sheet to another?
                // We should load.
                loadSheet(sheetId, setSourcesList, setMessages, setSheetTitle).then((loaded) => {
                    if (!loaded && isTimestamp) {
                        // Failed to load, maybe just new?
                        // Reset everything for new sheet
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
                // App init with ID
                loadSheet(sheetId, setSourcesList, setMessages, setSheetTitle).then((loaded) => {
                    if (!loaded) {
                        // Assuming new if failed to load
                        setCurrentSheetId(sheetId);
                    }
                });
            }
        }
    }, [sheetId]); // Removed recursive deps, focus on ID change

    const sendMessageToGemini = async (userText) => {
        setIsLoading(true);
        try {
            // Context Construction
            let historyMessages = messages.slice(-10);
            // removing error/empty messages from context
            historyMessages = historyMessages.filter(m => m.text && m.text.trim() !== '');
            // System instruction now on server
            if (historyMessages.length > 0 && historyMessages[0].role === 'model') {
                historyMessages = historyMessages.slice(1);
            }
            const history = historyMessages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            // Identify Mode: "planning" vs "editing" vs "sourcing"
            // For now, we trust the system prompt.
            const isFirstMessage = messages.length <= 1;

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
            // data should be { text, suggested_sources }

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
                id: Date.now().toString(), // Fixed syntax
                role: 'model',
                text: "I'm having trouble connecting to the Beit Midrash right now. Please try again.",
                suggestedSources: []
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSource = async (source) => {
        // Fetch text content if not present
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
        // We use index for sortable usually, or ID if we add IDs
        // Here assuming index for simplicity with DnD, but DnD uses IDs.
        // Let's assume onRemove passes the ID.
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

    const handleCreateNew = () => {
        createNewSheet(); // Hook resets state
        // We also need to reset local state here because hook only resets ID
        setSourcesList([]);
        setMessages([{
            id: 'welcome',
            role: 'model',
            text: 'Shalom! What kind of text sheet do you want to create together?',
            suggestedSources: []
        }]);
        setSheetTitle("New Source Sheet");
        navigate(`/sheet/${Date.now().toString()}`);
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

    return (
        onAddSource = { handleAddSource }
            userSheets = { userSheets }
    onLoadSheet = { handleLoadSheet }
        />
    );
};

export default EditorContainer;
