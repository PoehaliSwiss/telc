/**
 * Normalizes a path by stripping the Vite BASE_URL if present.
 * This ensures that paths are consistent (canonical) regardless of the deployment
 * subdirectory (e.g. /English/Lesson1 vs /Lesson1).
 */
export function normalizePath(path: string): string {
    const base = import.meta.env.BASE_URL;

    // Only strip if base is an absolute path (starts with /) and not just root /
    // If base is relative (e.g. './'), we don't try to strip it as it doesn't appear in location.pathname
    if (base && base.startsWith('/') && base !== '/' && path.startsWith(base)) {
        // e.g. base="/English/", path="/English/Intro" -> "Intro"
        // e.g. base="/English/", path="/English/A1/Lesson1" -> "A1/Lesson1"
        const relative = path.substring(base.length);
        return relative.startsWith('/') ? relative : '/' + relative;
    }

    return path;
}
