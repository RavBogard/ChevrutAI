import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/AppShell.css';

// Lazy load components for performance
const HomeView = lazy(() => import('./components/home/HomeView'));
const Privacy = lazy(() => import('./components/Privacy'));
const Terms = lazy(() => import('./components/Terms'));
const Changelog = lazy(() => import('./components/Changelog'));
const EditorContainer = lazy(() => import('./components/EditorContainer'));
import ErrorBoundary from './components/ErrorBoundary';

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>
    Loading...
  </div>
);

// Generate new sheet ID (stable during render)
const NewSheetRedirect = () => {
  const [id] = useState(() => Date.now().toString());
  return <Navigate to={`/sheet/${id}`} replace />;
};

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
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<NewSheetRedirect />} />
            {/* User hated the dashboard. Redirect to editor. */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/sheet/new" element={<NewSheetRedirect />} />
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
            <Route path="/changelog" element={<Changelog />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
