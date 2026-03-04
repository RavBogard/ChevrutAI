import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// subscribeToAuth callback captured here so tests can fire auth state changes
let capturedAuthCallback = null;

// Mock ../services/firebase — AuthContext imports from here
vi.mock('../services/firebase', () => ({
  loginWithGoogle: vi.fn(() => Promise.resolve()),
  logoutUser: vi.fn(() => Promise.resolve()),
  subscribeToAuth: vi.fn((callback) => {
    capturedAuthCallback = callback;
    return vi.fn(); // unsubscribe noop
  }),
  // Other firebase exports used in other tests — kept as stubs
  saveSheetToFirestore: vi.fn(),
  getSheetFromFirestore: vi.fn(),
  loadSheetWithDefaults: vi.fn(),
  subscribeToUserSheets: vi.fn(() => vi.fn()),
  deleteSheetFromFirestore: vi.fn(),
  auth: {},
  db: {},
}));

// Mock firebase/app and firebase/auth to prevent real initialization
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(function () { return {}; }),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => null),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(),
}));

import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Helper: renders AuthProvider with a child component that uses useAuth
function TestChild() {
  const { currentUser, loading, login } = useAuth();
  return (
    <div>
      <span data-testid="status">loaded</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{currentUser ? currentUser.uid : 'no-user'}</span>
      <span data-testid="login-type">{typeof login}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    capturedAuthCallback = null;
    vi.clearAllMocks();
  });

  it('renders loading state before auth resolves — children are NOT shown (AUTH-02 guard)', () => {
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    // loading=true initially; AuthProvider renders {!loading && children}
    // so the child should NOT be in the document
    expect(screen.queryByTestId('status')).toBeNull();
  });

  it('renders children after auth resolves with null user (no signed-in user)', async () => {
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    // Before callback fires — children absent
    expect(screen.queryByTestId('status')).toBeNull();

    // Fire auth state change with null (no user)
    await act(async () => {
      capturedAuthCallback(null);
    });

    // Now loading=false, children should be visible
    expect(screen.getByTestId('status')).toBeTruthy();
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('exposes currentUser after auth resolves with a user object', async () => {
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    const mockUser = { uid: 'u1', email: 'test@example.com' };

    await act(async () => {
      capturedAuthCallback(mockUser);
    });

    expect(screen.getByTestId('user').textContent).toBe('u1');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('login is a function exposed by useAuth — Google sign-in is callable (AUTH-01)', async () => {
    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    // Resolve auth first so children render
    await act(async () => {
      capturedAuthCallback(null);
    });

    // login (which wraps loginWithGoogle) must be a function
    expect(screen.getByTestId('login-type').textContent).toBe('function');
  });
});
