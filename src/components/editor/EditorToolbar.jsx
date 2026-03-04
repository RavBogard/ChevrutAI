import React from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import useSheetStore from '../../stores/useSheetStore';

const EditorToolbar = () => {
  // Reactive only for button disabled state — temporal store tracks undo/redo history
  const canUndo = useStoreWithEqualityFn(useSheetStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStoreWithEqualityFn(useSheetStore.temporal, (s) => s.futureStates.length > 0);

  const handleAddNote = () => {
    useSheetStore.getState().addSource({
      type: 'commentary',
      ref: `commentary-${Date.now()}`,
      en: '',
      title: '',
      dir: 'ltr'
    });
  };

  const handleAddHeader = () => {
    useSheetStore.getState().addSource({
      type: 'header',
      ref: `header-${Date.now()}`,
      en: ''
    });
  };

  const handleAddDivider = () => {
    useSheetStore.getState().addSource({
      type: 'divider',
      ref: `divider-${Date.now()}`
    });
  };

  return (
    <div className="editor-toolbar" data-html2canvas-ignore="true">
      <div className="toolbar-group add-group">
        <button className="toolbar-btn primary-action-btn" onClick={handleAddNote} title="Add Text Block">
          {/* pencil/edit SVG icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Add Note
        </button>
        <button className="toolbar-btn primary-action-btn" onClick={handleAddHeader} title="Add Section Header">
          {/* lines SVG icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h8"/>
          </svg>
          Add Header
        </button>
        <button className="toolbar-btn" onClick={handleAddDivider} title="Add Visual Divider">
          {/* minus/divider SVG icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Divider
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group history-group">
        <button
          className="toolbar-btn icon-only subtle-btn"
          onClick={() => useSheetStore.temporal.getState().undo()}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </button>
        <button
          className="toolbar-btn icon-only subtle-btn"
          onClick={() => useSheetStore.temporal.getState().redo()}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
