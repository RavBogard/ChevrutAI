import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    deleteDoc
} from "firebase/firestore";

// Your web app's Firebase configuration
// Read from .env file
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Auth Helpers ---

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
};

export const logoutUser = () => signOut(auth);

export const subscribeToAuth = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// --- Database Helpers ---

// Save or Update a Sheet
export const saveSheetToFirestore = async (userId, sheetData) => {
    if (!userId) {
        throw new Error('Cannot save sheet: No user ID provided');
    }

    // Sanitize data: remove undefined values which Firebase rejects
    // JSON.parse(JSON.stringify(obj)) removes undefined and converts them properly
    const sanitize = (obj) => {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch {
            return obj;
        }
    };

    // Create a reference ID if one doesn't exist, otherwise use existing
    const sheetId = sheetData.id || doc(collection(db, "sheets")).id;

    const sheetRef = doc(db, "sheets", sheetId);

    const dataToSave = sanitize({
        ...sheetData,
        id: sheetId,
        ownerId: userId,
        updatedAt: serverTimestamp(),
        // If it's new, set createdAt
        ...(sheetData.createdAt ? {} : { createdAt: serverTimestamp() })
    });

    await setDoc(sheetRef, dataToSave, { merge: true });
    return sheetId;
};

// Get a single sheet
export const getSheetFromFirestore = async (sheetId) => {
    const docRef = doc(db, "sheets", sheetId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
};

// Subscribe to User's Sheets (for Sidebar)
export const subscribeToUserSheets = (userId, callback) => {
    if (!userId) return () => { };

    const q = query(
        collection(db, "sheets"),
        where("ownerId", "==", userId),
        orderBy("updatedAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const sheets = [];
        snapshot.forEach((doc) => {
            sheets.push({ id: doc.id, ...doc.data() });
        });
        callback(sheets);
    });
};

export { auth, db };

// Delete a sheet
export const deleteSheetFromFirestore = async (sheetId) => {
    const docRef = doc(db, 'sheets', sheetId);
    await deleteDoc(docRef);
};

