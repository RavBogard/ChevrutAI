import { useAuth } from './contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import HomeView from './components/home/HomeView';
import ChatSidebar from './components/ChatSidebar';
import SheetView from './components/SheetView';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import { useToast } from './components/Toast';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useFirestore } from './hooks/useFirestore';
import { getSefariaText } from './services/sefaria';
import './App.css';

// System instruction for the persona and JSON output
// System instruction is now handled server-side in api/chat.js

// Wrapper to pass params to logic
function EditorContainer() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // -- Copied from ChevrutaApp, need to adapt --
  const { showToast } = useToast();

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
    setCurrentSheetId // Helper exposed from hook
  } = useFirestore(sheetTitle, sourcesList, messages);

  // Sync URL ID with System
  useEffect(() => {
    if (!sheetId) return;

    if (sheetId !== currentSheetId) {
      // It's a new ID for the system.
      // Try to load it.
      loadSheet(sheetId, setSourcesList, setMessages, setSheetTitle).then((loaded) => {
        if (!loaded) {
          // If not found, assume it's a NEW sheet with this ID.
          // We manually set the ID so next save uses it.
          console.log("Sheet not found, starting new with ID:", sheetId);
          resetHistory([]);
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
    }
  }, [sheetId]); // Only run when URL changes

  const handleLoadSheet = async (id) => {
    // Navigation is now handled by URL change
    navigate(`/sheet/${id}`);
  };

  // Clear sheet function
  const handleClearSheet = () => {
    if (confirm('Are you sure you want to clear your current sheet? This cannot be undone.')) {
      resetHistory([]);
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: 'Shalom! What kind of text sheet do you want to create together?',
        suggestedSources: []
      }]);
      setSheetTitle("New Source Sheet");
      createNewSheet(); // Reset cloud ID
      showToast('Sheet cleared!', 'info');
    }
  };


  const sendMessageToGemini = async (userText) => {
    try {
      setIsLoading(true);

      // Construct history for context (last 10 messages to save tokens)
      // Gemini requires history to start with 'user' role.
      let historyMessages = messages.slice(-10);

      // Filter out any messages with empty/null text to prevent API errors
      historyMessages = historyMessages.filter(m => m.text && m.text.trim() !== '');

      if (historyMessages.length > 0 && historyMessages[0].role === 'model') {
        historyMessages = historyMessages.slice(1);
      }

      const history = historyMessages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text || " " }]
      }));

      // Detect if this is the first user message (only welcome message exists)
      const isFirstMessage = messages.length <= 1;

      // Call our secure backend endpoint instead of exposing the key here!
      // For the first message, strongly emphasize title generation
      let messageToSend = userText;
      if (isFirstMessage) {
        messageToSend = userText + "\n\n[CRITICAL: Generate a SHORT 2-5 word THEMATIC TITLE for this source sheet. Do NOT copy my prompt. Extract the core TOPIC only. Example: if I ask about 'sources for someone navigating infertility', title should be 'Infertility & Hope' NOT my prompt.]";
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          history: history
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const responseText = await response.text();
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        // If it fails to parse, it might be raw text or error
        console.warn("Could not parse JSON from Gemini:", responseText);
        parsedResponse = { text: responseText };
      }

      const botMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: parsedResponse.text || responseText,
        suggestedSources: parsedResponse.suggested_sources || []
      };

      // Auto-update title if provided AND it's a good title
      let suggestedTitle = parsedResponse.suggested_title;

      // Validate the suggested title - reject if it's just the prompt copied
      const isBadTitle = suggestedTitle && (
        suggestedTitle.length > 40 || // Too long
        suggestedTitle.toLowerCase().startsWith("sources") ||
        suggestedTitle.toLowerCase().startsWith("texts") ||
        suggestedTitle.toLowerCase().startsWith("find") ||
        suggestedTitle.toLowerCase().startsWith("build") ||
        suggestedTitle.toLowerCase().startsWith("create") ||
        suggestedTitle.toLowerCase().startsWith("i'm giving") ||
        suggestedTitle.toLowerCase().startsWith("i need") ||
        suggestedTitle.toLowerCase().includes("source sheet")
      );

      if (suggestedTitle && !isBadTitle) {
        console.log("Setting title to:", suggestedTitle);
        setSheetTitle(suggestedTitle);
      } else if (isFirstMessage) {
        // Fallback: Extract topic words from the request
        console.log("AI title was bad or missing, generating fallback...", suggestedTitle);

        // Try to extract meaningful topic from user text
        let topicWords = userText
          .replace(/^(find|get|show|give|list|create|make|build|generate|i'm giving|i need|preparing|assembling|leading|designing|our congregation|speaking at|want to)/gi, '')
          .replace(/\b(me|a|an|the|texts?|sources?|quotes?|sheet|for|about|on|regarding|with|to|that|of)\b/gi, '')
          .replace(/drash|sermon|lesson|class|study|session/gi, '')
          .replace(/[?.,!-]/g, '')
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 2)
          .slice(0, 4)
          .join(' ');

        // Capitalize each word
        topicWords = topicWords.replace(/\b\w/g, l => l.toUpperCase());

        const fallbackTitle = topicWords.length > 3 ? topicWords : "New Source Sheet";
        console.log("Using fallback title:", fallbackTitle);
        setSheetTitle(fallbackTitle);
      }

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: `Error connecting to Chevruta Brain: ${error.message || error}. Please try again later.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (text) => {
    const userMsg = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    sendMessageToGemini(text);

    // Auto-open chat on mobile after first message
    if (window.innerWidth <= 768) {
      setMobileChatOpen(true);
    }
  };

  const handleAddSource = async (sourceSuggestion) => {
    // If it's a custom block or header, just add it directly.
    if (sourceSuggestion.type === 'custom' || sourceSuggestion.type === 'header') {
      setSourcesList(prev => [...prev, sourceSuggestion]);
      return;
    }

    // Check if already exists to avoid dupes? Maybe allow dupes if user wants.
    // Let's fetch the full text.
    const fullSource = await getSefariaText(sourceSuggestion.ref);
    if (fullSource) {
      setSourcesList(prev => [...prev, fullSource]);
    } else {
      // Show toast error instead of alert
      console.error("Could not fetch source text");
      showToast(`Could not fetch text for ${sourceSuggestion.ref}. It might not exist in Sefaria.`, 'error');
    }
  };

  const handleRemoveSource = (index) => {
    setSourcesList(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSource = (index, newSourceData) => {
    setSourcesList(prev => prev.map((s, i) => i === index ? { ...s, ...newSourceData } : s));
  };

  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  // Smart Language Detection: Persisted > Browser > Timezone
  const [language, setLanguage] = useState(() => {
    // 1. Check saved preference
    const saved = localStorage.getItem('appLanguage');
    if (saved) return saved;

    // 2. Check Browser Language
    if (navigator.language.startsWith('he')) return 'he';

    // 3. Check Timezone (Israel Proxy)
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timeZone === 'Asia/Jerusalem') return 'he';
    } catch (e) {
      console.log('Timezone check failed', e);
    }

    return 'en';
  });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [language]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const toggleLanguage = () => {
    setLanguage(prev => {
      const newLang = prev === 'en' ? 'he' : 'en';
      localStorage.setItem('appLanguage', newLang);
      return newLang;
    });
  };

  const [sidebarWidth, setSidebarWidth] = useState(350); // Slightly narrower default
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed for clean home
  const [isResizing, setIsResizing] = useState(false);

  // Auto-open sidebar when chat starts (if on desktop)
  useEffect(() => {
    if (chatStarted && window.innerWidth > 768 && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [chatStarted]);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (mouseMoveEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 300 && newWidth < 800) { // Min/Max constraints
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

  const chatStarted = messages.length > 1;

  return (
    <div className={`app-container ${chatStarted ? 'chat-active' : 'chat-initial'}`}>

      {/* Hamburger Menu - Always visible in top left */}
      <button className="main-hamburger-btn" onClick={toggleSidebar} title="Toggle Menu">
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
          <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
        </svg>
      </button>

      {/* Sidebar Wrapper - Always rendered, transparency/width transitions */}
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
          toggleLanguage={toggleLanguage}
          suggestedInput={suggestedPrompt}
          userSheets={userSheets}
          onLoadSheet={handleLoadSheet}
          currentSheetId={currentSheetId}
        />
      </div>

      {/* Resizer - Only visible if sidebar is open */}
      {isSidebarOpen && (
        <div
          className="resizer"
          onMouseDown={startResizing}
        ></div>
      )}

      <SheetView
        sources={sourcesList}
        onAddSource={handleAddSource} // Pass the handler
        onRemoveSource={handleRemoveSource}
        onUpdateSource={handleUpdateSource}
        onReorder={setSourcesList}
        onClearSheet={handleClearSheet}
        onUndo={undoSources}
        onRedo={redoSources}
        canUndo={canUndo}
        canRedo={canRedo}
        sheetTitle={sheetTitle}
        onTitleChange={setSheetTitle}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        language={language}
        toggleLanguage={toggleLanguage}
        onSuggestionClick={handleSendMessage}
        onSendMessage={handleSendMessage}
        chatStarted={chatStarted}
        userSheets={userSheets}
        onLoadSheet={handleLoadSheet}
      />

      {/* Mobile Floating Action Button - only show after chat has started */}
      {chatStarted && (
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

      {/* Standalone Toggles (Initial View) */}
      {!chatStarted && (
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
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>
        </div>
      )}

      {/* Backdrop for mobile chat */}
      {mobileChatOpen && (
        <div className="mobile-chat-backdrop" onClick={() => setMobileChatOpen(false)}></div>
      )}
    </div>
  );
}


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={`/sheet/${Date.now().toString()}`} replace />} />
        <Route path="/dashboard" element={<HomeView />} />
        <Route path="/sheet/new" element={<Navigate to={`/sheet/${Date.now().toString()}`} replace />} />
        <Route path="/sheet/:sheetId" element={<EditorContainer />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </Router>
  );
}

export default App;
