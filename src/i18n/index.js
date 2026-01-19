import React, { createContext, useContext } from 'react';
import en from './en.json';
import he from './he.json';

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
        // key is dot-notation like "actions.addToSheet"
        const keys = key.split('.');
        let value = translations[language] || translations.en;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to English
                value = translations.en;
                for (const fallbackKey of keys) {
                    value = value?.[fallbackKey];
                }
                break;
            }
        }

        // Handle string replacements like {ref}
        if (typeof value === 'string') {
            return Object.entries(replacements).reduce(
                (str, [k, v]) => str.replace(`{${k}}`, v),
                value
            );
        }

        return key; // Return key if translation not found
    };

    return (
        <I18nContext.Provider value={{ t, language }}>
            {children}
        </I18nContext.Provider>
    );
}

/**
 * Hook to access translations
 * @returns {{ t: function, language: string }}
 */
export function useTranslation() {
    return useContext(I18nContext);
}
