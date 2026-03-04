import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SourceBlock from './SourceBlock';
import CustomSourceBlock from './CustomSourceBlock';
import SectionHeaderBlock from './SectionHeaderBlock';
import DividerBlock from './DividerBlock';

const getBlockComponent = (type) => {
  switch (type) {
    case 'source':      return SourceBlock;
    case 'commentary':  return CustomSourceBlock;
    case 'custom':      return CustomSourceBlock; // backward compat with Firestore data
    case 'header':      return SectionHeaderBlock;
    case 'divider':     return DividerBlock;
    default:            return SourceBlock;
  }
};

const SortableItem = ({ id, source, onRemove, onUpdate, onRefine }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: source.type === 'header' ? '0' : '1rem',
  };

  const BlockComponent = getBlockComponent(source.type);

  return (
    <div ref={setNodeRef} style={style} className="sortable-item">
      <BlockComponent
        source={source}
        onRemove={onRemove}
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRefine={onRefine}
      />
    </div>
  );
};

export default SortableItem;
