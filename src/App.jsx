import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomeView from './components/home/HomeView';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import EditorContainer from './components/EditorContainer';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [language, setLanguage] = useState('en');
  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'he' : 'en');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={`/sheet/${Date.now().toString()}`} replace />} />
        <Route path="/dashboard" element={<HomeView />} />
        <Route path="/sheet/new" element={<Navigate to={`/sheet/${Date.now().toString()}`} replace />} />
        {/* Pass props to EditorContainer */}
        <Route
          path="/sheet/:sheetId"
          element={
            <EditorContainer
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              language={language}
              toggleLanguage={toggleLanguage}
            />
          }
        />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </Router>
  );
}

export default App;
