import { createContext, useContext, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
    saveExerciseProgress,
    isExerciseCompleted,
    getLessonProgress,
    getFolderProgress,
    getCourseProgress,
    resetAllProgress,
    type LessonProgress,
    type FolderProgress,
    type CourseProgress
} from '../utils/progressStorage';
import { normalizePath } from '../utils/pathUtils';

interface ProgressContextType {
    markExerciseComplete: (exerciseId: string, lessonPath: string) => void;
    isExerciseComplete: (exerciseId: string) => boolean;
    getLessonProgressData: (lessonPath: string, totalExercises: number) => LessonProgress;
    getFolderProgressData: (folderPath: string, lessons: Array<{ path: string; exerciseCount: number }>) => FolderProgress;
    getCourseProgressData: (allLessons: Array<{ path: string; exerciseCount: number; folder: string }>) => CourseProgress;
    resetProgress: () => void;
    refreshProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
    // Force re-render trigger
    const [, setRefreshKey] = useState(0);



    const markExerciseComplete = useCallback((exerciseId: string, lessonPath: string) => {
        saveExerciseProgress(exerciseId, normalizePath(lessonPath));
        setRefreshKey(prev => prev + 1); // Trigger re-render
    }, []);

    const isExerciseComplete = useCallback((exerciseId: string): boolean => {
        return isExerciseCompleted(exerciseId);
    }, []);

    const getLessonProgressData = useCallback((lessonPath: string, totalExercises: number): LessonProgress => {
        return getLessonProgress(lessonPath, totalExercises);
    }, []);

    const getFolderProgressData = useCallback((
        folderPath: string,
        lessons: Array<{ path: string; exerciseCount: number }>
    ): FolderProgress => {
        return getFolderProgress(folderPath, lessons);
    }, []);

    const getCourseProgressData = useCallback((
        allLessons: Array<{ path: string; exerciseCount: number; folder: string }>
    ): CourseProgress => {
        return getCourseProgress(allLessons);
    }, []);

    const resetProgress = useCallback(() => {
        resetAllProgress();
        setRefreshKey(prev => prev + 1); // Trigger re-render
    }, []);

    const refreshProgress = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <ProgressContext.Provider
            value={{
                markExerciseComplete,
                isExerciseComplete,
                getLessonProgressData,
                getFolderProgressData,
                getCourseProgressData,
                resetProgress,
                refreshProgress
            }}
        >
            {children}
        </ProgressContext.Provider>
    );
}

export function useProgress(): ProgressContextType {
    const context = useContext(ProgressContext);
    if (!context) {
        throw new Error('useProgress must be used within a ProgressProvider');
    }
    return context;
}
