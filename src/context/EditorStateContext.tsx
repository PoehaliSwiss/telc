import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface EditorStateContextType {
    isDirty: boolean;
    setDirty: (dirty: boolean) => void;
    registerSaveHandler: (handler: () => Promise<void>) => void;
    saveCurrentFile: () => Promise<void>;
}

const EditorStateContext = createContext<EditorStateContextType | undefined>(undefined);

export function EditorStateProvider({ children }: { children: React.ReactNode }) {
    const [isDirty, setIsDirty] = useState(false);
    const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

    const registerSaveHandler = useCallback((handler: () => Promise<void>) => {
        saveHandlerRef.current = handler;
    }, []);

    const saveCurrentFile = useCallback(async () => {
        if (saveHandlerRef.current) {
            await saveHandlerRef.current();
            // We assume the handler will eventually reset dirty state via setDirty(false) 
            // OR the reloading of the page will reset it. 
            // But relying on the handler to be successful is safer.
        } else {
            console.warn("No save handler registered");
        }
    }, []);

    return (
        <EditorStateContext.Provider value={{ isDirty, setDirty: setIsDirty, registerSaveHandler, saveCurrentFile }}>
            {children}
        </EditorStateContext.Provider>
    );
}

export function useEditorState() {
    const context = useContext(EditorStateContext);
    if (context === undefined) {
        throw new Error('useEditorState must be used within an EditorStateProvider');
    }
    return context;
}
