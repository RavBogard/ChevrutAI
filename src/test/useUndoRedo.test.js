import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../hooks/useUndoRedo';

describe('useUndoRedo', () => {
    it('should initialize with the initial state', () => {
        const { result } = renderHook(() => useUndoRedo(['initial']));
        expect(result.current.state).toEqual(['initial']);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should update state and enable undo', () => {
        const { result } = renderHook(() => useUndoRedo([]));

        act(() => {
            result.current.setState(['source1']);
        });

        expect(result.current.state).toEqual(['source1']);
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);
    });

    it('should undo to previous state', () => {
        const { result } = renderHook(() => useUndoRedo([]));

        act(() => {
            result.current.setState(['source1']);
        });

        act(() => {
            result.current.undo();
        });

        expect(result.current.state).toEqual([]);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);
    });

    it('should redo to next state', () => {
        const { result } = renderHook(() => useUndoRedo([]));

        act(() => {
            result.current.setState(['source1']);
        });

        act(() => {
            result.current.undo();
        });

        act(() => {
            result.current.redo();
        });

        expect(result.current.state).toEqual(['source1']);
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);
    });

    it('should clear redo history when new state is set', () => {
        const { result } = renderHook(() => useUndoRedo([]));

        act(() => {
            result.current.setState(['source1']);
            result.current.setState(['source1', 'source2']);
        });

        act(() => {
            result.current.undo();
        });

        // At source1, can redo to source1+source2
        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.setState(['source1', 'newSource']);
        });

        // Redo history should be cleared
        expect(result.current.canRedo).toBe(false);
        expect(result.current.state).toEqual(['source1', 'newSource']);
    });
});
