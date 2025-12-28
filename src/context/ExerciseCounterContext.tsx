import { createContext, useContext, useRef, type ReactNode } from 'react';

interface ExerciseCounterContextType {
    getNextIndex: (exerciseType: string) => number;
    reset: () => void;
}

const ExerciseCounterContext = createContext<ExerciseCounterContextType | undefined>(undefined);

export function ExerciseCounterProvider({ children }: { children: ReactNode }) {
    const countersRef = useRef<Record<string, number>>({});

    const getNextIndex = (exerciseType: string): number => {
        if (!countersRef.current[exerciseType]) {
            countersRef.current[exerciseType] = 0;
        }
        return countersRef.current[exerciseType]++;
    };

    const reset = () => {
        countersRef.current = {};
    };

    return (
        <ExerciseCounterContext.Provider value={{ getNextIndex, reset }}>
            {children}
        </ExerciseCounterContext.Provider>
    );
}

export function useExerciseCounter(): ExerciseCounterContextType {
    const context = useContext(ExerciseCounterContext);
    if (!context) {
        throw new Error('useExerciseCounter must be used within an ExerciseCounterProvider');
    }
    return context;
}
