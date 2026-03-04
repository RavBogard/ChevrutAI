import React from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import useSheetStore from '../../stores/useSheetStore';
import { useShallow } from 'zustand/shallow';
import SortableItem from './SortableItem';

const SheetCanvas = () => {
  const { sources, title } = useSheetStore(useShallow(s => ({ sources: s.sources, title: s.title })));
  const setTitle = useSheetStore.getState().setTitle;        // non-reactive
  const removeSource = useSheetStore.getState().removeSource; // non-reactive
  const updateSource = useSheetStore.getState().updateSource; // non-reactive
  const reorderSources = useSheetStore.getState().reorderSources; // non-reactive

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = sources.findIndex(s => s.id === active.id);
    const newIndex = sources.findIndex(s => s.id === over.id);
    reorderSources(arrayMove(sources, oldIndex, newIndex));
  };

  return (
    <div className="sheet-canvas" id="sheet-export-area">
      <input
        type="text"
        className="title-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Untitled Source Sheet"
      />
      {sources.length === 0 && (
        <div className="sheet-empty-state">Add a source above to get started.</div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sources.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sources.map((source, index) => (
            <SortableItem
              key={source.id}
              id={source.id}
              source={source}
              onRemove={() => removeSource(index)}
              onUpdate={(updates) => updateSource(index, updates)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SheetCanvas;
