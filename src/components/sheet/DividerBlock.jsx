import React from 'react';

const DividerBlock = ({ onRemove, dragHandleProps }) => {
  return (
    <div className="divider-block">
      <div className="divider-inner">
        <div className="drag-handle" {...dragHandleProps} title="Drag to reorder">
          <svg width="14" height="24" viewBox="0 0 14 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="4" cy="4" r="2" fill="#9CA3AF" />
            <circle cx="4" cy="12" r="2" fill="#9CA3AF" />
            <circle cx="4" cy="20" r="2" fill="#9CA3AF" />
            <circle cx="10" cy="4" r="2" fill="#9CA3AF" />
            <circle cx="10" cy="12" r="2" fill="#9CA3AF" />
            <circle cx="10" cy="20" r="2" fill="#9CA3AF" />
          </svg>
        </div>
        <hr className="sheet-divider" />
        <button
          className="remove-btn"
          onClick={onRemove}
          title="Remove Divider"
          data-html2canvas-ignore="true"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default DividerBlock;
