import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveSheetToFirestore, subscribeToUserSheets, getSheetFromFirestore } from '../services/firebase';
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
    const isFirstLoad = useRef(true);

    // Subscribe to History List
    useEffect(() => {
        if (!currentUser) {
            setUserSheets([]);
            return;
        }

        const unsubscribe = subscribeToUserSheets(currentUser.uid, (sheets) => {
            setUserSheets(sheets);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Autosave Logic
    useEffect(() => {
        if (!currentUser) return;

        // Skip saving on initial mount/empty state to avoid overwriting accidentally
        // or creating empty sheets immediately on login.
        // But we do want to save if user STARTS adding things.
        if (currentSources.length === 0 && currentMessages.length <= 1 && !currentSheetId) {
            return;
        }

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
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
            }
        }, 2000); // 2 second debounce

        return () => clearTimeout(saveTimeoutRef.current);
    }, [currentUser, currentSheetTitle, currentSources, currentMessages, currentSheetId]);

    // Function to manually load a sheet
    const loadSheet = async (id, setSources, setMessages, setTitle) => {
        try {
            const sheet = await getSheetFromFirestore(id);
            if (sheet) {
                setSources(sheet.sources || []);
                setMessages(sheet.messages || []);
                setTitle(sheet.title || "Untitled Source Sheet");
                setCurrentSheetId(id);
                return true;
            }
        } catch (error) {
            showToast("Failed to load sheet", "error");
            console.error(error);
        }
        return false;
    };

    const createNewSheet = () => {
        setCurrentSheetId(null);
        window.history.replaceState(null, '', '#/');
    };

    return {
        userSheets,
        currentSheetId,
        loadSheet,
        createNewSheet,
        setCurrentSheetId // Exported so App can set it if loading from URL
    };
};
