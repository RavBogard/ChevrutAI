import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ChatSidebar from './components/ChatSidebar';
import SheetView from './components/SheetView';
import { getSefariaText } from './services/sefaria';
import './App.css';

// System instruction for the persona and JSON output
const SYSTEM_INSTRUCTION = `
You are "Chevruta Bot", an expert Jewish librarian and study partner. 
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

function App() {
  const [sourcesList, setSourcesList] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: 'Shalom! I am your Chevruta. What topic shall we study today?',
      suggestedSources: []
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessageToGemini = async (userText) => {
    try {
      setIsLoading(true);
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.0-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: { responseMimeType: "application/json" }
      });

      // Construct history for context (last 10 messages to save tokens)
      // Map internal message format to Gemini format
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.text }] // use the text content
      }));

      const chat = model.startChat({
        history: history
      });

      const result = await chat.sendMessage(userText);
      const responseText = result.response.text();

      console.log("Gemini Raw Response:", responseText); // Debugging

      let parsedResponse;
      try {
        // Sanitize response in case it includes markdown formatting
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
        text: "I apologize, I encountered an error connecting to the yeshiva (API). Please try again."
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
      />
    </div>
  );
}

export default App;
