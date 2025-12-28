import { normalizePath } from './pathUtils';

/**
 * Generate a stable exercise ID using content hash
 * @param lessonPath - Current lesson path from location.pathname
 * @param exerciseType - Type of exercise (Quiz, Matching, etc.)
 * @param content - Unique content identifier (answer, items JSON, etc.)
 * @returns Stable exercise ID
 */
export function generateStableExerciseId(
    lessonPath: string,
    exerciseType: string,
    content: string
): string {
    const cleanPath = normalizePath(lessonPath);
    const hash = simpleHash(content);
    return `${cleanPath}:${exerciseType}:${hash}`;
}

/**
 * Simple hash function for strings
 * Returns a positive integer hash as string
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
}

