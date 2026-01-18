import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ChatSidebar from './components/ChatSidebar';
import SheetView from './components/SheetView';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import { getSefariaText } from './services/sefaria';
import './App.css';

// System instruction for the persona and JSON output
const SYSTEM_INSTRUCTION = `
You are "ChevrutAI", an expert Jewish librarian and study partner. 
You are knowledgeable in Tanakh, Talmud, Halakha, and Jewish philosophy.
Your goal is to help the user build a source sheet.

Protocol:
1. Analyze the user's request.
2. If the user asks a question that requires sources, "fetch" them mentally and propose them.
3. ALWAYS output your response in valid JSON format with this structure:
{
  "content": "Your conversational response here. Be helpful, scholarly, and efficient. If proposing sources, describe them briefly here too.",
  "suggested_title": "A short, relevant title for the source sheet based on the user request (max 5-6 words). PROVIDE THIS ON THE FIRST TURN.",
  "suggested_sources": [
    { "ref": "Citation Ref (e.g., Genesis 1:1 or Rashi on Genesis 1:1)", "summary": "One sentence summary of why this is relevant." }
  ]
}
4. If no sources are needed, "suggested_sources" should be an empty array.
5. Use standard Sefaria citation formats (e.g., "Mishnah Berakhot 1:1", "Rashi on Leviticus 19:18").
6. Do NOT provide the full text in the "content" field, just the citation and likelihood of relevance. The user will click to add the full text to the sheet.
7. IMPORTANT: On the very first interaction, you MUST provide a "suggested_title" in the JSON.
`;

function ChevrutaApp() {
  const [sourcesList, setSourcesList] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: 'Shalom! What kind of text sheet do you want to create together?',
      suggestedSources: []
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [sheetTitle, setSheetTitle] = useState("New Source Sheet");

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

      // Call our secure backend endpoint instead of exposing the key here!
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messages.length === 0 ? userText + " \n\n[SYSTEM: You MUST provide a 'suggested_title' for this source sheet in your JSON response.]" : userText,
          history: history
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log("Gemini Raw Response:", responseText);

      let parsedResponse;
      try {
        const cleanText = responseText.replace(/```json|```/g, '').trim();
        parsedResponse = JSON.parse(cleanText);
      } catch (e) {
        console.error("Failed to parse JSON", e);
        parsedResponse = { content: responseText, suggested_sources: [] };
      }

      const botMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: parsedResponse.content,
        suggestedSources: parsedResponse.suggested_sources || []
      };

      console.log("Parsed AI Response:", parsedResponse);

      // Auto-update title if provided
      if (parsedResponse.suggested_title) {
        console.log("Setting title to:", parsedResponse.suggested_title);
        setSheetTitle(parsedResponse.suggested_title);
      } else if (history.length === 0) {
        // Fallback: Smart Title Cleanup
        let cleanTitle = userText;
        // Common prefixes to strip
        const prefixes = [
          /^(find|get|show|give|list) (me )?(texts?|sources?|quotes?) (for|about|on|regarding) /i,
          /^(create|make|build|generate) (a )?(source )?sheet (for|about|on|regarding) /i,
          /^(what does) (.+) (say about) /i, // Extract middle part? No, usually "What does Torah say about X" -> "X"
          /^(texts?|sources?) (about|on|for) /i,
          /^(i want|i need|can you|please) /i
        ];

        for (const p of prefixes) {
          cleanTitle = cleanTitle.replace(p, '');
        }

        // Specific fix for "What does X say about Y" -> "Y according to X" or just "Y". 
        // Let's just strip "What does ... say about" wrapper if possible, or leave it if complex.
        // Simple Strip: remove "What does X say about" is hard without capturing groups.
        // Let's try to remove "What does the Talmud say about forgiveness?" -> "Forgiveness"
        const questionMatch = cleanTitle.match(/what does .* say about (.+)\??/i);
        if (questionMatch && questionMatch[1]) {
          cleanTitle = questionMatch[1];
        }

        // Capitalize first letter
        cleanTitle = cleanTitle.trim();
        if (cleanTitle.length > 0) {
          cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        } else {
          cleanTitle = "New Source Sheet";
        }

        // Remove trailing question mark
        cleanTitle = cleanTitle.replace(/\?$/, '');

        const fallbackTitle = cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + "..." : cleanTitle;
        console.log("Using smart fallback title:", fallbackTitle);
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
  };

  const handleAddSource = async (sourceSuggestion) => {
    // Check if already exists to avoid dupes? Maybe allow dupes if user wants.
    // Let's fetch the full text.
    const fullSource = await getSefariaText(sourceSuggestion.ref);
    if (fullSource) {
      setSourcesList(prev => [...prev, fullSource]);
    } else {
      // Maybe show a toast error? For now just log.
      console.error("Could not fetch source text");
      alert(`Could not fetch text for ${sourceSuggestion.ref}. It might not exist in the free Sefaria edition API or is misspelt.`);
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

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const [sidebarWidth, setSidebarWidth] = useState(400); // Default width in px
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (mouseDownEvent) => {
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
  }, [isResizing]);

  const chatStarted = messages.length > 1;

  return (
    <div className={`app-container ${chatStarted ? 'chat-active' : 'chat-initial'}`}>
      {chatStarted && (
        <>
          <div style={{ width: sidebarWidth, minWidth: '300px', flexShrink: 0, display: 'flex' }}>
            <ChatSidebar
              messages={messages}
              onSendMessage={handleSendMessage}
              onAddSource={handleAddSource}
              isLoading={isLoading}
              isMobileOpen={mobileChatOpen}
              onMobileClose={() => setMobileChatOpen(false)}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              suggestedInput={suggestedPrompt}
            />
          </div>
          <div
            className="resizer"
            onMouseDown={startResizing}
          ></div>
        </>
      )}

      <SheetView
        sources={sourcesList}
        onRemoveSource={handleRemoveSource}
        onUpdateSource={handleUpdateSource}
        onReorder={setSourcesList}
        sheetTitle={sheetTitle}
        onTitleChange={setSheetTitle}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onSuggestionClick={handleSendMessage}
        onSendMessage={handleSendMessage}
        chatStarted={chatStarted}
      />

      {/* Mobile Floating Action Button */}
      <button
        className="mobile-chat-fab"
        onClick={() => setMobileChatOpen(true)}
        aria-label="Open Chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {/* Standalone Theme Toggle (Initial View) */}
      {!chatStarted && (
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
        <Route path="/" element={<ChevrutaApp />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </Router>
  );
}

export default App;
