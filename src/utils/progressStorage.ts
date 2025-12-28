// Progress tracking utilities for localStorage

export interface ExerciseProgress {
    exerciseId: string;
    lessonPath: string;
    completed: boolean;
    lastAttempt?: number;
}

export interface LessonProgress {
    path: string;
    totalExercises: number;
    completedExercises: number;
    percentage: number;
}

export interface FolderProgress {
    path: string;
    totalLessons: number;
    completedLessons: number;
    totalExercises: number;
    completedExercises: number;
    percentage: number;
}

export interface CourseProgress {
    totalFolders: number;
    totalLessons: number;
    completedLessons: number;
    totalExercises: number;
    completedExercises: number;
    percentage: number;
}

const STORAGE_KEY = 'yazula_progress';

// Get all exercise progress data
export function getAllProgress(): Map<string, ExerciseProgress> {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return new Map();

        const parsed = JSON.parse(data);
        return new Map(Object.entries(parsed));
    } catch (error) {
        console.error('Error loading progress:', error);
        return new Map();
    }
}

// Save exercise progress
export function saveExerciseProgress(exerciseId: string, lessonPath: string): void {
    try {
        const progress = getAllProgress();
        progress.set(exerciseId, {
            exerciseId,
            lessonPath,
            completed: true,
            lastAttempt: Date.now()
        });

        const obj = Object.fromEntries(progress);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

// Check if exercise is completed
export function isExerciseCompleted(exerciseId: string): boolean {
    const progress = getAllProgress();
    return progress.get(exerciseId)?.completed ?? false;
}

// Get lesson progress
export function getLessonProgress(
    lessonPath: string,
    totalExercises: number
): LessonProgress {
    const progress = getAllProgress();

    // Filter to only exercises for this lesson
    const lessonExercises = Array.from(progress.values())
        .filter(p => p.lessonPath === lessonPath && p.completed);

    // Count all completed exercises for this lesson
    // Cap at totalExercises to prevent showing "7/6" if old exercises remain in storage
    const completedExercises = Math.min(lessonExercises.length, totalExercises);

    const percentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

    return {
        path: lessonPath,
        totalExercises,
        completedExercises,
        percentage
    };
}

// Get folder progress
export function getFolderProgress(
    folderPath: string,
    lessons: Array<{ path: string; exerciseCount: number }>
): FolderProgress {
    const progress = getAllProgress();

    let totalExercises = 0;
    let completedExercises = 0;
    let completedLessons = 0;

    for (const lesson of lessons) {
        totalExercises += lesson.exerciseCount;
        const lessonCompleted = Array.from(progress.values())
            .filter(p => p.lessonPath === lesson.path && p.completed)
            .length;

        completedExercises += lessonCompleted;

        if (lessonCompleted === lesson.exerciseCount && lesson.exerciseCount > 0) {
            completedLessons++;
        }
    }

    const percentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

    return {
        path: folderPath,
        totalLessons: lessons.length,
        completedLessons,
        totalExercises,
        completedExercises,
        percentage
    };
}

// Get course progress
export function getCourseProgress(
    allLessons: Array<{ path: string; exerciseCount: number; folder: string }>
): CourseProgress {
    const progress = getAllProgress();

    const folders = new Set(allLessons.map(l => l.folder));
    let totalExercises = 0;
    let completedExercises = 0;
    let completedLessons = 0;

    for (const lesson of allLessons) {
        totalExercises += lesson.exerciseCount;
        const lessonCompleted = Array.from(progress.values())
            .filter(p => p.lessonPath === lesson.path && p.completed)
            .length;

        completedExercises += lessonCompleted;

        if (lessonCompleted === lesson.exerciseCount && lesson.exerciseCount > 0) {
            completedLessons++;
        }
    }

    const percentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

    return {
        totalFolders: folders.size,
        totalLessons: allLessons.length,
        completedLessons,
        totalExercises,
        completedExercises,
        percentage
    };
}

// Reset all progress
export function resetAllProgress(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error resetting progress:', error);
    }
}
