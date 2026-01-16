import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY is not set in .env.local');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      setResponse(text);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Gemini API Connector Test</h1>

      <form onSubmit={handleSubmit} className="chat-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          rows="4"
          className="prompt-input"
        />
        <button type="submit" disabled={isLoading || !prompt}>
          {isLoading ? 'Generating...' : 'Send to Gemini'}
        </button>
      </form>

      {error && <div className="error-message">Error: {error}</div>}

      {response && (
        <div className="response-area">
          <h3>Response:</h3>
          <pre className="response-text">{response}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
