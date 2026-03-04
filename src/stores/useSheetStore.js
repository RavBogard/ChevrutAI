// src/stores/useSheetStore.js
// Single Zustand store with zundo temporal middleware for undo/redo
// Replaces useSheetPersistence monolith + SourceSheetContext
// Source patterns: https://github.com/pmndrs/zustand and https://github.com/charkour/zundo

import { create } from 'zustand';
import { temporal } from 'zundo';
import { subscribeWithSelector, devtools } from 'zustand/middleware';

const useSheetStore = create(
  subscribeWithSelector(
    devtools(
      temporal(
        (set) => ({
          // Sheet content
          title: 'New Source Sheet',
          sources: [],
          currentSheetId: null,

          // Save/load status flags — NOT tracked in undo history (see partialize below)
          isSaving: false,
          isLoading: false,
          isDirty: false,
          isPersisted: false,

          // Actions — sources
          addSource: (source) =>
            set((state) => ({ sources: [...state.sources, source] })),

          removeSource: (index) =>
            set((state) => ({
              sources: state.sources.filter((_, i) => i !== index),
            })),

          updateSource: (index, updates) =>
            set((state) => {
              const next = [...state.sources];
              next[index] = { ...next[index], ...updates };
              return { sources: next };
            }),

          reorderSources: (newSources) => set({ sources: newSources }),

          // Actions — title
          setTitle: (title) => set({ title }),

          // Actions — sheet lifecycle
          setCurrentSheetId: (id) => set({ currentSheetId: id }),
          setIsSaving: (v) => set({ isSaving: v }),
          setIsLoading: (v) => set({ isLoading: v }),
          setIsDirty: (v) => set({ isDirty: v }),
          setIsPersisted: (v) => set({ isPersisted: v }),

          // Load sheet state from Firestore document with defensive defaults
          loadSheet: (sheetData) =>
            set({
              title: sheetData.title ?? 'New Source Sheet',
              sources: sheetData.sources ?? [],
              currentSheetId: sheetData.id ?? null,
              isPersisted: true,
              isLoading: false,
            }),

          // Reset to blank sheet
          resetSheet: () =>
            set({
              title: 'New Source Sheet',
              sources: [],
              currentSheetId: null,
              isPersisted: false,
              isDirty: false,
            }),
        }),
        // zundo options: only track sources and title in undo history
        // Status flags (isSaving, isLoading, isDirty, isPersisted) are excluded
        {
          partialize: (state) => ({
            sources: state.sources,
            title: state.title,
          }),
          limit: 50,
        }
      )
    )
  )
);

export default useSheetStore;
