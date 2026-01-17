import { useState } from 'react';
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
  "suggested_sources": [
    { "ref": "Citation Ref (e.g., Genesis 1:1 or Rashi on Genesis 1:1)", "summary": "One sentence summary of why this is relevant." }
  ]
}
4. If no sources are needed, "suggested_sources" should be an empty array.
5. Use standard Sefaria citation formats (e.g., "Mishnah Berakhot 1:1", "Rashi on Leviticus 19:18").
6. Do NOT provide the full text in the "content" field, just the citation and likelihood of relevance. The user will click to add the full text to the sheet.
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
          message: userText,
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

  return (
    <div className="app-container">
      <ChatSidebar
        messages={messages}
        onSendMessage={handleSendMessage}
        onAddSource={handleAddSource}
        isLoading={isLoading}
      />
      <SheetView
        sources={sourcesList}
        onRemoveSource={handleRemoveSource}
        onUpdateSource={handleUpdateSource}
        onReorder={setSourcesList}
      />
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
