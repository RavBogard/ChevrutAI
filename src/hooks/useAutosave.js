import { useEffect, useRef } from 'react';
import useSheetStore from '../stores/useSheetStore';
import { saveSheetToFirestore } from '../services/firebase';

export const useAutosave = (userId) => {
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = useSheetStore.subscribe(
      (state) => ({ title: state.title, sources: state.sources }),
      () => {
        useSheetStore.getState().setIsDirty(true);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
          const state = useSheetStore.getState();
          if (!userId || !state.currentSheetId) return;

          state.setIsSaving(true);
          try {
            await saveSheetToFirestore(userId, {
              id: state.currentSheetId,
              title: state.title,
              sources: state.sources,
              schemaVersion: 1,
            });
            useSheetStore.getState().setIsDirty(false);
          } catch (err) {
            console.error('[useAutosave] Firestore save failed:', err);
          } finally {
            useSheetStore.getState().setIsSaving(false);
          }
        }, 1000);
      }
    );

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId]);
};
