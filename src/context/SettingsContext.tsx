import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface LanguageSettings {
    learningLang: string;
    learningVoices: {
        primary: string;
        secondary?: string;
        additional?: string[];
    };
    translationLang: string;
    translationVoice: string;
}

interface SettingsContextType {
    showHints: boolean;
    toggleShowHints: () => void;
    languageSettings: LanguageSettings;
    updateLanguageSettings: (settings: Partial<LanguageSettings>) => void;
}

const defaultLanguageSettings: LanguageSettings = {
    learningLang: 'de-DE',
    learningVoices: {
        primary: '',
        secondary: '',
        additional: []
    },
    translationLang: 'en-US',
    translationVoice: ''
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [showHints, setShowHints] = useState<boolean>(() => {
        const saved = localStorage.getItem('yazula_settings_showHints');
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [languageSettings, setLanguageSettings] = useState<LanguageSettings>(() => {
        const saved = localStorage.getItem('yazula_settings_language');
        if (saved) {
            try {
                return { ...defaultLanguageSettings, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to parse language settings:', e);
            }
        }
        return defaultLanguageSettings;
    });

    useEffect(() => {
        localStorage.setItem('yazula_settings_showHints', JSON.stringify(showHints));
    }, [showHints]);

    useEffect(() => {
        localStorage.setItem('yazula_settings_language', JSON.stringify(languageSettings));
    }, [languageSettings]);

    const toggleShowHints = () => {
        setShowHints(prev => !prev);
    };

    const updateLanguageSettings = (newSettings: Partial<LanguageSettings>) => {
        setLanguageSettings(prev => ({
            ...prev,
            ...newSettings,
            // Deep merge for learningVoices
            learningVoices: newSettings.learningVoices
                ? { ...prev.learningVoices, ...newSettings.learningVoices }
                : prev.learningVoices
        }));
    };

    return (
        <SettingsContext.Provider value={{ showHints, toggleShowHints, languageSettings, updateLanguageSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
