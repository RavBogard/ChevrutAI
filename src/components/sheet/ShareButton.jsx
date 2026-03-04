import React, { useState } from 'react';
import { useToast } from '../Toast';

const ShareButton = ({ sheetId, isPublic, onTogglePublic }) => {
    const { showToast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const handleShare = async () => {
        if (!sheetId) {
            showToast('Save the sheet first before sharing.', 'info');
            return;
        }

        const newPublicState = !isPublic;
        await onTogglePublic(newPublicState);

        if (newPublicState) {
            // Becoming public — copy the share URL
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                setIsCopied(true);
                showToast('Sheet is now public. Link copied!', 'success');
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(() => {
                showToast('Sheet is now public.', 'success');
            });
        } else {
            showToast('Sheet is now private.', 'info');
        }
    };

    return (
        <button
            className={`toolbar-btn share-btn ${isPublic ? 'share-btn--public' : ''}`}
            onClick={handleShare}
            title={isPublic ? 'Sheet is public — click to make private' : 'Make sheet public and copy link'}
        >
            {isCopied ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                        <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                    </svg>
                    Copied
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                        <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Z" />
                    </svg>
                    {isPublic ? 'Public' : 'Share'}
                </>
            )}
        </button>
    );
};

export default ShareButton;
