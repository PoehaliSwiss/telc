import yaml from 'js-yaml';
import type { IFileSystem } from '../lib/github/fileSystem';

export interface CourseItem {
    title: string;
    path?: string;
    items?: CourseItem[];
}

export interface CourseStructure {
    title: string;
    description?: string; // Adding description as it might be useful too
    googleAnalyticsId?: string;
    structure: CourseItem[];
}

export async function loadCourseStructure(fs?: IFileSystem): Promise<CourseStructure> {
    if (fs) {
        try {
            // Try loading from src/content first (standard location)
            if (await fs.exists('src/content/course.yaml')) {
                const content = await fs.readFile('src/content/course.yaml');
                return yaml.load(content) as CourseStructure;
            }
            // Fallback to root (legacy)
            if (await fs.exists('course.yaml')) {
                const content = await fs.readFile('course.yaml');
                return yaml.load(content) as CourseStructure;
            }
            // Fallback to src/content/course.yaml for compatibility?
            // Actually, for new GitHub repos we should enforce root.
            console.warn("course.yaml not found in root, returning empty structure");
            return { title: 'New Course', structure: [] };
        } catch (e) {
            console.error("Failed to load course.yaml from FS", e);
            return { title: 'Error Loading Course', structure: [] };
        }
    }

    // Import yaml as raw string
    const modules = import.meta.glob('../content/course.yaml', { query: '?raw', import: 'default', eager: true });
    const yamlContent = modules['../content/course.yaml'] as string;
    return yaml.load(yamlContent) as CourseStructure;
}

// Load compiled MDX component (Standard Vite Build)
export async function loadBundledComponent(path: string): Promise<React.ComponentType<any> | null> {
    // Import all MDX files as React components
    // eager: true ensures they are included in the bundle
    const modules = import.meta.glob('../content/**/*.mdx', { eager: true, import: 'default' });

    // Normalize path to match glob keys
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    if (cleanPath.startsWith('src/content/')) cleanPath = cleanPath.replace('src/content/', '');
    if (cleanPath.endsWith('.mdx')) cleanPath = cleanPath.slice(0, -4);

    const candidates = [
        `../content/${cleanPath}.mdx`,
        `../content/${cleanPath}/index.mdx`
    ];

    for (const key of candidates) {
        if (key in modules) {
            return modules[key] as React.ComponentType<any>;
        }
    }

    console.warn('[ContentLoader] No matching component found for:', path);
    return null;
}
