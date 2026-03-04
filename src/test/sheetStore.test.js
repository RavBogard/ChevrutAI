import { describe, it, expect, beforeEach } from 'vitest';
import useSheetStore from '../stores/useSheetStore';

describe('useSheetStore', () => {
  // Reset store state before each test to ensure isolation
  beforeEach(() => {
    useSheetStore.getState().resetSheet();
    useSheetStore.temporal.getState().clear();
  });

  // -------------------------------------------------------------------------
  // addSource
  // -------------------------------------------------------------------------
  describe('addSource', () => {
    it('appends a source object to the sources array', () => {
      const source = { ref: 'Genesis 1:1', text: 'In the beginning...' };
      useSheetStore.getState().addSource(source);
      expect(useSheetStore.getState().sources).toHaveLength(1);
      expect(useSheetStore.getState().sources[0]).toEqual(source);
    });

    it('appends multiple sources in order', () => {
      const s1 = { ref: 'Genesis 1:1', text: 'text1' };
      const s2 = { ref: 'Exodus 1:1', text: 'text2' };
      useSheetStore.getState().addSource(s1);
      useSheetStore.getState().addSource(s2);
      expect(useSheetStore.getState().sources).toHaveLength(2);
      expect(useSheetStore.getState().sources[1]).toEqual(s2);
    });
  });

  // -------------------------------------------------------------------------
  // removeSource
  // -------------------------------------------------------------------------
  describe('removeSource', () => {
    it('removeSource(0) removes the first source', () => {
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      useSheetStore.getState().addSource({ ref: 'Exodus 1:1' });
      useSheetStore.getState().removeSource(0);
      expect(useSheetStore.getState().sources).toHaveLength(1);
      expect(useSheetStore.getState().sources[0].ref).toBe('Exodus 1:1');
    });

    it('removeSource(1) removes the second source', () => {
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      useSheetStore.getState().addSource({ ref: 'Exodus 1:1' });
      useSheetStore.getState().removeSource(1);
      expect(useSheetStore.getState().sources).toHaveLength(1);
      expect(useSheetStore.getState().sources[0].ref).toBe('Genesis 1:1');
    });
  });

  // -------------------------------------------------------------------------
  // reorderSources
  // -------------------------------------------------------------------------
  describe('reorderSources', () => {
    it('replaces the sources array entirely with the new array', () => {
      const s1 = { ref: 'Genesis 1:1' };
      const s2 = { ref: 'Exodus 1:1' };
      useSheetStore.getState().addSource(s1);
      useSheetStore.getState().addSource(s2);
      useSheetStore.getState().reorderSources([s2, s1]);
      expect(useSheetStore.getState().sources[0].ref).toBe('Exodus 1:1');
      expect(useSheetStore.getState().sources[1].ref).toBe('Genesis 1:1');
    });
  });

  // -------------------------------------------------------------------------
  // setTitle
  // -------------------------------------------------------------------------
  describe('setTitle', () => {
    it('updates the title string', () => {
      useSheetStore.getState().setTitle('My New Sheet');
      expect(useSheetStore.getState().title).toBe('My New Sheet');
    });
  });

  // -------------------------------------------------------------------------
  // updateSource
  // -------------------------------------------------------------------------
  describe('updateSource', () => {
    it('merges updates into the source at the given index', () => {
      useSheetStore.getState().addSource({ ref: 'Berakhot 2a', commentary: 'original' });
      useSheetStore.getState().updateSource(0, { commentary: 'new text' });
      expect(useSheetStore.getState().sources[0].commentary).toBe('new text');
      expect(useSheetStore.getState().sources[0].ref).toBe('Berakhot 2a');
    });
  });

  // -------------------------------------------------------------------------
  // loadSheet
  // -------------------------------------------------------------------------
  describe('loadSheet', () => {
    it('populates title, sources, currentSheetId, sets isPersisted=true, isLoading=false', () => {
      useSheetStore.getState().loadSheet({
        id: 'sheet-123',
        title: 'Torah Study',
        sources: [{ ref: 'Genesis 1:1' }],
      });
      const state = useSheetStore.getState();
      expect(state.title).toBe('Torah Study');
      expect(state.sources).toHaveLength(1);
      expect(state.currentSheetId).toBe('sheet-123');
      expect(state.isPersisted).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('applies defensive defaults for missing title field', () => {
      useSheetStore.getState().loadSheet({ id: 'sheet-456' });
      expect(useSheetStore.getState().title).toBe('New Source Sheet');
    });

    it('applies defensive defaults for missing sources field', () => {
      useSheetStore.getState().loadSheet({ id: 'sheet-789', title: 'Test' });
      expect(useSheetStore.getState().sources).toEqual([]);
    });

    it('applies defensive defaults for missing id field', () => {
      useSheetStore.getState().loadSheet({ title: 'No ID Sheet' });
      expect(useSheetStore.getState().currentSheetId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // resetSheet
  // -------------------------------------------------------------------------
  describe('resetSheet', () => {
    it('resets title to "New Source Sheet"', () => {
      useSheetStore.getState().setTitle('Custom Title');
      useSheetStore.getState().resetSheet();
      expect(useSheetStore.getState().title).toBe('New Source Sheet');
    });

    it('resets sources to empty array', () => {
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      useSheetStore.getState().resetSheet();
      expect(useSheetStore.getState().sources).toEqual([]);
    });

    it('resets currentSheetId to null', () => {
      useSheetStore.getState().setCurrentSheetId('sheet-123');
      useSheetStore.getState().resetSheet();
      expect(useSheetStore.getState().currentSheetId).toBeNull();
    });

    it('resets isPersisted to false', () => {
      useSheetStore.getState().loadSheet({ id: 'x', title: 'X', sources: [] });
      useSheetStore.getState().resetSheet();
      expect(useSheetStore.getState().isPersisted).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Undo/Redo behavior via zundo temporal middleware
  // -------------------------------------------------------------------------
  describe('undo/redo', () => {
    it('after addSource: temporal pastStates.length > 0 (undo history recorded)', () => {
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      expect(useSheetStore.temporal.getState().pastStates.length).toBeGreaterThan(0);
    });

    it('after undo: sources array reverts to pre-add state', () => {
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      useSheetStore.temporal.getState().undo();
      expect(useSheetStore.getState().sources).toHaveLength(0);
    });

    it('after redo: sources array returns to post-add state', () => {
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      useSheetStore.temporal.getState().undo();
      useSheetStore.temporal.getState().redo();
      expect(useSheetStore.getState().sources).toHaveLength(1);
      expect(useSheetStore.getState().sources[0].ref).toBe('Genesis 1:1');
    });

    it('after removeSource then undo: removed source is back in sources array', () => {
      const source = { ref: 'Exodus 1:1', text: 'text' };
      useSheetStore.getState().addSource(source);
      // Clear undo history from addSource before testing removeSource undo
      useSheetStore.temporal.getState().clear();
      useSheetStore.getState().removeSource(0);
      useSheetStore.temporal.getState().undo();
      expect(useSheetStore.getState().sources).toHaveLength(1);
      expect(useSheetStore.getState().sources[0].ref).toBe('Exodus 1:1');
    });

    it('after reorderSources then undo: sources array reverts to pre-reorder order', () => {
      const s1 = { ref: 'Genesis 1:1' };
      const s2 = { ref: 'Exodus 1:1' };
      useSheetStore.getState().addSource(s1);
      useSheetStore.getState().addSource(s2);
      useSheetStore.temporal.getState().clear();
      useSheetStore.getState().reorderSources([s2, s1]);
      useSheetStore.temporal.getState().undo();
      expect(useSheetStore.getState().sources[0].ref).toBe('Genesis 1:1');
      expect(useSheetStore.getState().sources[1].ref).toBe('Exodus 1:1');
    });

    it('after updateSource then undo: source commentary reverts to pre-update value (DATA-04)', () => {
      useSheetStore.getState().addSource({ ref: 'Berakhot 2a', commentary: 'original text' });
      useSheetStore.temporal.getState().clear();
      useSheetStore.getState().updateSource(0, { commentary: 'new text' });
      useSheetStore.temporal.getState().undo();
      expect(useSheetStore.getState().sources[0].commentary).toBe('original text');
    });

    it('setIsSaving(true) does NOT increment temporal pastStates.length (status flags excluded from history)', () => {
      const { pastStates } = useSheetStore.temporal.getState();
      const before = pastStates.length;
      useSheetStore.getState().setIsSaving(true);
      expect(useSheetStore.temporal.getState().pastStates.length).toBe(before);
    });

    it('setIsLoading(true) does NOT increment temporal pastStates.length', () => {
      const before = useSheetStore.temporal.getState().pastStates.length;
      useSheetStore.getState().setIsLoading(true);
      expect(useSheetStore.temporal.getState().pastStates.length).toBe(before);
    });

    it('setIsDirty(true) does NOT increment temporal pastStates.length', () => {
      const before = useSheetStore.temporal.getState().pastStates.length;
      useSheetStore.getState().setIsDirty(true);
      expect(useSheetStore.temporal.getState().pastStates.length).toBe(before);
    });

    it('canUndo: pastStates.length > 0 after mutation', () => {
      expect(useSheetStore.temporal.getState().pastStates.length).toBe(0);
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      expect(useSheetStore.temporal.getState().pastStates.length).toBeGreaterThan(0);
    });

    it('canRedo: futureStates.length > 0 after undo', () => {
      useSheetStore.getState().addSource({ ref: 'Genesis 1:1' });
      expect(useSheetStore.temporal.getState().futureStates.length).toBe(0);
      useSheetStore.temporal.getState().undo();
      expect(useSheetStore.temporal.getState().futureStates.length).toBeGreaterThan(0);
    });
  });
});
