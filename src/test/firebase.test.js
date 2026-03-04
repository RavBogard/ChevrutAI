import { describe, it, expect, vi } from 'vitest';

// Mock Firebase SDK to prevent initialization errors in tests
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

import { loadSheetWithDefaults } from '../services/firebase';

describe('loadSheetWithDefaults', () => {
  it('returns schemaVersion 0 for pre-versioning document', () => {
    const result = loadSheetWithDefaults({ id: 'abc', title: 'My Sheet', sources: [] });
    expect(result.schemaVersion).toBe(0);
  });

  it('returns default title for document missing title', () => {
    const result = loadSheetWithDefaults({ id: 'abc' });
    expect(result.title).toBe('New Source Sheet');
  });

  it('returns empty sources array for document missing sources', () => {
    const result = loadSheetWithDefaults({ id: 'abc' });
    expect(result.sources).toEqual([]);
  });

  it('returns isPublic false for document missing isPublic', () => {
    const result = loadSheetWithDefaults({ id: 'abc' });
    expect(result.isPublic).toBe(false);
  });

  it('preserves all fields when document is complete', () => {
    const doc = {
      id: 'xyz',
      title: 'Torah Study',
      sources: [{ type: 'text' }],
      schemaVersion: 1,
      isPublic: true,
      ownerId: 'u1',
      createdAt: null,
      updatedAt: null,
    };
    const result = loadSheetWithDefaults(doc);
    expect(result.schemaVersion).toBe(1);
    expect(result.title).toBe('Torah Study');
    expect(result.isPublic).toBe(true);
    expect(result.sources).toHaveLength(1);
  });
});
