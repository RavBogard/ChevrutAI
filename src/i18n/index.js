import React, { createContext, useContext } from 'react';

// Inline translations to avoid JSON import issues with Vite build
const en = {
    app: {
        title: "Chevruta.AI",
        tagline: "Build Beautiful Jewish Source Sheets"
    },
    welcome: {
        greeting: "Shalom! What kind of text sheet do you want to create together?",
        placeholder: "What would you like to learn about today?"
    },
    actions: {
        addToSheet: "+ Add to Sheet",
        added: "Added",
        export: "Export",
        clearSheet: "Clear Sheet",
        undo: "Undo",
        redo: "Redo"
    },
    export: {
        googleDocs: "Google Docs",
        word: "Word (.docx)",
        pdf: "PDF"
    },
    sources: {
        suggestedSources: "Suggested Sources:",
        poweredBy: "Powered by Sefaria"
    },
    errors: {
        fetchFailed: "Could not fetch text for {ref}. It might not exist in Sefaria.",
        rateLimited: "Too many requests. Please wait a moment."
    },
    confirm: {
        clearSheet: "Are you sure you want to clear your current sheet? This cannot be undone."
    },
    footer: {
        projectOf: "A Project of",
        author: "Rabbi Daniel Bogard",
        privacyPolicy: "Privacy Policy",
        termsOfService: "Terms of Service"
    }
};

const he = {
    app: {
        title: "חברותא.AI",
        tagline: "בנה דפי מקורות יהודיים יפים"
    },
    welcome: {
        greeting: "שלום! איזה דף מקורות תרצה ליצור יחד?",
        placeholder: "על מה תרצה ללמוד היום?"
    },
    actions: {
        addToSheet: "+ הוסף לדף",
        added: "נוסף",
        export: "ייצוא",
        clearSheet: "נקה דף",
        undo: "בטל",
        redo: "שחזר"
    },
    export: {
        googleDocs: "Google Docs",
        word: "Word (.docx)",
        pdf: "PDF"
    },
    sources: {
        suggestedSources: "מקורות מוצעים:",
        poweredBy: "מופעל על ידי ספריא"
    },
    errors: {
        fetchFailed: "לא ניתן לטעון טקסט עבור {ref}. ייתכן שהוא לא קיים בספריא.",
        rateLimited: "יותר מדי בקשות. אנא המתן רגע."
    },
    confirm: {
        clearSheet: "האם אתה בטוח שברצונך לנקות את הדף? לא ניתן לבטל פעולה זו."
    },
    footer: {
        projectOf: "פרויקט של",
        author: "הרב דניאל בוגרד",
        privacyPolicy: "מדיניות פרטיות",
        termsOfService: "תנאי שימוש"
    }
};

const translations = { en, he };

const I18nContext = createContext({
    t: (key) => key,
    language: 'en'
});

/**
 * Translation provider component
 */
export function I18nProvider({ language = 'en', children }) {
    const t = (key, replacements = {}) => {
        const keys = key.split('.');
        let value = translations[language] || translations.en;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                value = translations.en;
                for (const fallbackKey of keys) {
                    value = value?.[fallbackKey];
                }
                break;
            }
        }

        if (typeof value === 'string') {
            return Object.entries(replacements).reduce(
                (str, [k, v]) => str.replace(`{${k}}`, v),
                value
            );
        }

        return key;
    };

    return (
        <I18nContext.Provider value={{ t, language }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    return useContext(I18nContext);
}
