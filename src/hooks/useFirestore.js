import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveSheetToFirestore, subscribeToUserSheets, getSheetFromFirestore, deleteSheetFromFirestore } from '../services/firebase';
import { useToast } from '../components/Toast';

export const useFirestore = (currentSheetTitle, currentSources, currentMessages) => {
    const { currentUser } = useAuth();
    const { showToast } = useToast();

    // We need to keep track of the current sheet ID being worked on.
    // Initially null until saved.
    const [currentSheetId, setCurrentSheetId] = useState(null);
    const [userSheets, setUserSheets] = useState([]);

    // Autosave timer
    const saveTimeoutRef = useRef(null);
    const isLoadingRef = useRef(false);

    // Subscribe to History List
    useEffect(() => {
        if (!currentUser) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUserSheets([]);
            return;
        }

        const unsubscribe = subscribeToUserSheets(currentUser.uid, (sheets) => {
            // Filter out empty sheets (no sources and no real conversation)
            const nonEmptySheets = sheets.filter(sheet => {
                const hasSources = sheet.sources && sheet.sources.length > 0;
                const hasRealMessages = sheet.messages &&
                    sheet.messages.some(m => m.role === 'user' || (m.role === 'model' && m.id !== 'welcome'));
                return hasSources || hasRealMessages;
            });
            setUserSheets(nonEmptySheets);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Autosave Logic
    const isCreatingRef = useRef(false);

    useEffect(() => {
        if (!currentUser) return;
        if (isLoadingRef.current) return; // Skip saving if we are in the middle of loading

        // Skip saving on initial mount/empty state to avoid overwriting accidentally
        // or creating empty sheets immediately on login.
        // Also skip saving if sheet is effectively empty (no sources and only welcome message)
        const hasRealContent = currentSources.length > 0 ||
            currentMessages.some(m => m.role === 'user' || (m.role === 'model' && m.id !== 'welcome'));

        if (!hasRealContent) {
            // Don't save empty sheets
            return;
        }

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        // Immediate save for new sheets (first edit), standard debounce for updates
        const delay = (!currentSheetId && !isCreatingRef.current) ? 0 : 2000;

        if (delay === 0) {
            isCreatingRef.current = true;
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                // Double check loading state inside timeout
                if (isLoadingRef.current) {
                    isCreatingRef.current = false;
                    return;
                }

                const sheetData = {
                    title: currentSheetTitle,
                    sources: currentSources,
                    messages: currentMessages,
                    updatedAt: new Date() // Firestore updates this with serverTimestamp anyway
                };

                // If we have an ID, we update. If not, we create.
                // If we create, we need to update state with new ID.
                if (currentSheetId) {
                    sheetData.id = currentSheetId;
                }

                const savedId = await saveSheetToFirestore(currentUser.uid, sheetData);

                if (!currentSheetId && savedId) {
                    setCurrentSheetId(savedId);
                    // Update URL without reload (optional, for later routing)
                    window.history.replaceState(null, '', `#/sheet/${savedId}`);
                }

                console.log("Autosaved sheet:", savedId);
            } catch (error) {
                console.error("Autosave failed:", error);
                // Maybe show toast? Don't spam user though.
            } finally {
                isCreatingRef.current = false;
            }
        }, delay);

        return () => clearTimeout(saveTimeoutRef.current);
    }, [currentUser, currentSheetTitle, currentSources, currentMessages, currentSheetId]);

    // Function to manually load a sheet
    const loadSheet = async (id, setSources, setMessages, setTitle) => {
        try {
            isLoadingRef.current = true;
            const sheet = await getSheetFromFirestore(id);
            if (sheet) {
                setSources(sheet.sources || []);
                setMessages(sheet.messages || []);
                setTitle(sheet.title || "Untitled Source Sheet");
                setCurrentSheetId(id);

                // Allow state to settle before re-enabling autosave
                // Allow state to settle before re-enabling autosave
                setTimeout(() => {
                    isLoadingRef.current = false;
                }, 500);
                return true;
            }

            // If sheet doesn't exist (new sheet), we must also reset loading
            isLoadingRef.current = false;
        } catch (error) {
            showToast("Failed to load sheet", "error");
            console.error(error);
            isLoadingRef.current = false;
        }
        return false;
    };

    const createNewSheet = () => {
        isLoadingRef.current = true;
        setCurrentSheetId(null);
        window.history.replaceState(null, '', '#/');
        setTimeout(() => {
            isLoadingRef.current = false;
        }, 300);
    };

    const deleteSheet = async (id) => {
        try {
            await deleteSheetFromFirestore(id);
        } catch (error) {
            console.error("Failed to delete sheet:", error);
            showToast("Failed to delete sheet", "error");
        }
    };

    return {
        userSheets,
        currentSheetId,
        loadSheet,
        createNewSheet,
        deleteSheet,
        setCurrentSheetId // Exported so App can set it if loading from URL
    };
};
