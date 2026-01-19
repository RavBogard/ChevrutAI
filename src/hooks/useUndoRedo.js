import { useState, useCallback } from 'react';

/**
 * Custom hook for undo/redo functionality
 * @param {any} initialState - The initial state value
 * @param {number} maxHistory - Maximum number of history states to keep
 */
export function useUndoRedo(initialState, maxHistory = 50) {
    const [history, setHistory] = useState(() => {
        const resolvedInitial = typeof initialState === 'function' ? initialState() : initialState;
        return [resolvedInitial];
    });
    const [currentIndex, setCurrentIndex] = useState(0);

    const state = history[currentIndex];

    const setState = useCallback((newState) => {
        // If newState is a function, apply it to current state
        const resolvedState = typeof newState === 'function'
            ? newState(history[currentIndex])
            : newState;

        // Truncate any redo history and add new state
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(resolvedState);

        // Limit history size
        if (newHistory.length > maxHistory) {
            newHistory.shift();
            setHistory(newHistory);
            // Keep currentIndex the same relative position
        } else {
            setHistory(newHistory);
            setCurrentIndex(currentIndex + 1);
        }
    }, [history, currentIndex, maxHistory]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }, [currentIndex]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    }, [currentIndex, history.length]);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    // Reset history (for clear sheet)
    const resetHistory = useCallback((newInitialState) => {
        setHistory([newInitialState]);
        setCurrentIndex(0);
    }, []);

    return {
        state,
        setState,
        undo,
        redo,
        canUndo,
        canRedo,
        resetHistory
    };
}
