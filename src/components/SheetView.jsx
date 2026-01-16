import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2pdf from 'html2pdf.js';

const SourceBlock = ({ source, onRemove, dragHandleProps }) => {
    const [viewMode, setViewMode] = useState('bilingual'); // bilingual, hebrew, english

    // Helper to render content safely (Sefaria API can return strings or arrays)
    const renderText = (text) => {
        if (Array.isArray(text)) {
            return text.map((t, i) => <p key={i} dangerouslySetInnerHTML={{ __html: t }} />);
        }
        return <p dangerouslySetInnerHTML={{ __html: text }} />;
    };

    return (
        <div className="source-block">
            <div className="source-header">
                <div className="header-left">
                    {/* Drag Handle */}
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
                    <h3>{source.ref}</h3>
                </div>

                <div className="source-controls" data-html2canvas-ignore="true">
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="view-toggle"
                    >
                        <option value="bilingual">Bilingual</option>
                        <option value="hebrew">Hebrew Only</option>
                        <option value="english">English Only</option>
                    </select>
                    <button className="remove-btn" onClick={onRemove} title="Remove Source">
                        &times;
                    </button>
                </div>
            </div>

            <div className={`source-content view-${viewMode}`}>
                {(viewMode === 'bilingual' || viewMode === 'english') && (
                    <div className="text-eng" dir="ltr">
                        {renderText(source.en)}
                    </div>
                )}

                {(viewMode === 'bilingual' || viewMode === 'hebrew') && (
                    <div className="text-heb" dir="rtl">
                        {renderText(source.he)}
                    </div>
                )}
            </div>
        </div>
    );
};

const SortableSourceItem = ({ source, id, onRemove }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="sortable-item">
            <SourceBlock
                source={source}
                onRemove={onRemove}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
};

const SheetView = ({ sources, onRemoveSource, onReorder }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = sources.findIndex((item) => item.ref === active.id);
            const newIndex = sources.findIndex((item) => item.ref === over.id);

            if (onReorder) {
                onReorder(arrayMove(sources, oldIndex, newIndex));
            }
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('sheet-export-area');
        const opt = {
            margin: [0.5, 0.5],
            filename: 'source-sheet.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    return (
        <div className="sheet-view">
            <div className="sheet-header">
                <h1>New Source Sheet</h1>
                <div className="header-actions">
                    <button className="export-btn" onClick={handleExportPDF}>Download PDF</button>
                </div>
                <p className="sheet-meta">Created with ChevrutAI</p>
            </div>

            <div className="sheet-paper" id="sheet-export-area">
                {sources.length === 0 ? (
                    <div className="empty-state">
                        <p>Your sheet is empty.</p>
                        <p>Ask Chevruta Bot to find texts for you!</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sources.map(s => s.ref)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sources.map((source, index) => (
                                <SortableSourceItem
                                    key={source.ref} // Assuming Ref is unique. If duplicates allowed, need uuid.
                                    id={source.ref}
                                    source={source}
                                    onRemove={() => onRemoveSource(index)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
};

export default SheetView;
