import { useState, useEffect } from 'react';

export const useResizableSidebar = (initialWidth = 400) => {
    const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [mobileChatOpen, setMobileChatOpen] = useState(false);

    const toggleSidebar = () => {
        if (window.innerWidth <= 768) {
            setMobileChatOpen(prev => !prev);
        } else {
            setIsSidebarOpen(prev => !prev);
        }
    };

    const startResizing = () => setIsResizing(true);
    const stopResizing = () => setIsResizing(false);

    const resize = (mouseMoveEvent) => {
        if (isResizing) {
            const newWidth = mouseMoveEvent.clientX;
            // Min 300px, Max 800px
            if (newWidth > 300 && newWidth < 800) {
                setSidebarWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => resize(e);
        const handleMouseUp = () => stopResizing();

        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
        // Dependency on isResizing ensures we subscribe/unsubscribe correctly
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isResizing]);

    return {
        sidebarWidth,
        isSidebarOpen,
        setIsSidebarOpen,
        isResizing,
        startResizing,
        toggleSidebar,
        mobileChatOpen,
        setMobileChatOpen
    };
};
