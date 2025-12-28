import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { MDXComponentsProvider } from './components/MDXComponentsProvider';
import { loadCourseStructure, type CourseStructure, type CourseItem } from './utils/contentLoader';
import { clsx } from 'clsx';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ProgressProvider, useProgress } from './context/ProgressContext';
import { NextLessonNavigation } from './components/NextLessonNavigation';
import { SettingsModal } from './components/settings/SettingsModal';
import { AnalyticsTracker } from './components/AnalyticsTracker';

import exerciseCountsData from './exerciseCounts.json';
import { ProgressBar } from './components/progress/ProgressBar';
import { Check, Loader2 } from 'lucide-react';

import { ToastProvider } from './context/ToastContext';


// In the standalone Reader App, we don't use GitHub Context or Editor
// We relies on standard fetching from the deployment URL (relative paths)

// Robust lookup for exercise counts (Shared Helper)
const normalizePath = (p: string) => {
    let s = p;
    if (s.startsWith('/')) s = s.slice(1);
    if (s.endsWith('.mdx')) s = s.slice(0, -4);
    return s;
};

const lookupExerciseCount = (exerciseCounts: Record<string, number>, p: string): number => {
    if (!p) return 0;
    if (exerciseCounts[p]) return exerciseCounts[p];

    const clean = normalizePath(p);
    // Try variations
    const variations = [
        clean,
        '/' + clean,
        clean + '.mdx',
        '/' + clean + '.mdx'
    ];

    for (const v of variations) {
        if (exerciseCounts[v]) return exerciseCounts[v];
    }
    return 0;
};

function SettingsToggle() {
    const { showHints, toggleShowHints } = useSettings();
    return (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Show Hints
                </span>
                <div className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={showHints}
                        onChange={toggleShowHints}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
            </label>
        </div>
    );
}

interface SidebarItemProps {
    item: CourseItem;
    depth?: number;
    exerciseCounts: Record<string, number>;
}

function SidebarItem({ item, depth = 0, exerciseCounts }: SidebarItemProps) {
    const location = useLocation();
    const isActive = item.path && location.pathname === item.path;
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = item.items && item.items.length > 0;
    const { getFolderProgressData, getLessonProgressData } = useProgress();

    // Calculate progress for this item
    let progressElement = null;

    if (item.path && !hasChildren) {
        // It's a lesson - progress gradient will be shown in the background
    } else if (hasChildren) {
        // It's a folder/section
        const getDescendantLessons = (itm: CourseItem): Array<{ path: string; exerciseCount: number }> => {
            let lessons: Array<{ path: string; exerciseCount: number }> = [];
            if (itm.path && !itm.items) {
                // Use robust lookup here!
                const count = lookupExerciseCount(exerciseCounts, itm.path);
                lessons.push({ path: itm.path, exerciseCount: count });
            }
            if (itm.items) {
                itm.items.forEach(sub => {
                    lessons = [...lessons, ...getDescendantLessons(sub)];
                });
            }
            return lessons;
        };

        const descendantLessons = getDescendantLessons(item);
        const totalExercisesInFolder = descendantLessons.reduce((acc, l) => acc + l.exerciseCount, 0);

        if (totalExercisesInFolder > 0) {
            const folderProgress = getFolderProgressData(item.path || item.title, descendantLessons);
            progressElement = (
                <div className="w-full mt-1">
                    <ProgressBar
                        progress={folderProgress.percentage}
                        height="h-0.5"
                        showLabel={false}
                        color="bg-blue-500 dark:bg-blue-400"
                    />
                </div>
            );
        }
    }

    let progressPercentage = 0;
    const count = (item.path && !hasChildren) ? lookupExerciseCount(exerciseCounts, item.path) : 0;

    if (item.path && !hasChildren) {
        // Debug Log
        // console.log(`[ReaderSidebar] Item: ${item.path}, ResolvedCount: ${count}`);

        if (count > 0) {
            const lessonProgress = getLessonProgressData(item.path, count);
            progressPercentage = lessonProgress.percentage;
        }
    }

    return (
        <div className="mb-1">
            <div
                className={clsx(
                    "flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors relative overflow-hidden group/item",
                    isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                    depth > 0 && "ml-4"
                )}
            >
                {progressPercentage > 0 && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `linear-gradient(to right, 
                ${isActive
                                    ? 'rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.3)'
                                    : 'rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.12)'
                                } ${progressPercentage}%, 
                transparent ${progressPercentage}%, 
                transparent 100%)`,
                            borderRadius: 'inherit'
                        }}
                    />
                )}
                <div className="relative z-10 flex items-center w-full">
                    {hasChildren && (
                        <button
                            onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
                            className="mr-2 w-8 h-8 p-0 shrink-0 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                            <svg
                                className={clsx("w-8 h-8 transition-transform", isOpen ? "rotate-90" : "")}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                    {item.path && !hasChildren ? (
                        <Link
                            to={item.path}
                            className="flex-1 flex items-center justify-between gap-2"
                        >
                            <span>{item.title}</span>
                            {!hasChildren && count > 0 && (() => {
                                const lessonProgress = getLessonProgressData(item.path!, count);
                                const isComplete = lessonProgress.completedExercises === lessonProgress.totalExercises;
                                return (
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                        {isComplete && <Check size={14} className="text-green-600 dark:text-green-400" />}
                                        <span>{lessonProgress.completedExercises}/{lessonProgress.totalExercises}</span>
                                    </div>
                                );
                            })()}
                        </Link>
                    ) : (
                        <div className="flex-1 flex items-center justify-between group/parent">
                            <span className="flex-1" onClick={() => hasChildren && setIsOpen(!isOpen)}>
                                {item.title}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            {/* Progress bar for folders */}
            {hasChildren && progressElement}
            {hasChildren && isOpen && (
                <div className="border-l border-gray-200 dark:border-gray-700 ml-5">
                    {item.items!.map((subItem, idx) => (
                        <SidebarItem
                            key={idx}
                            item={subItem}
                            depth={depth + 1}
                            exerciseCounts={exerciseCounts}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

import { loadBundledComponent } from './utils/contentLoader';

function DynamicPage({ path }: { path: string }) {
    const [Content, setContent] = useState<React.ComponentType<any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const Component = await loadBundledComponent(path);

                if (Component) {
                    if (mounted) setContent(() => Component);
                } else {
                    throw new Error(`File not found: ${path}`);
                }
            } catch (err: any) {
                if (mounted) setError(err.message || 'Failed to load content');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [path]);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

    return (
        <div className="relative group">
            {Content && <Content />}
        </div>
    );
}

function AppContent() {
    const [course, setCourse] = useState<CourseStructure | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setLoading(true);
            // Don't pass fs to use the bundled version (import.meta.glob)
            try {
                const data = await loadCourseStructure();
                setCourse(data);
            } catch (e) {
                console.error("Failed to load course", e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { getCourseProgressData } = useProgress();

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-bold mb-2">Failed to load course</h1>
                    <p className="text-gray-500">Could not find course.yaml</p>
                </div>
            </div>
        )
    }

    // Calculate stats
    // Note: exerciseCounts.json should be present in public/ or generated during build
    // For ReaderApp, we assume it's available or we might need to fetch it too.
    // For ReaderApp, we assume it's available or we might need to fetch it too.

    const exerciseCounts = exerciseCountsData as Record<string, number>; // In a real reader build, this might be fetched or bundled. useProgress handles missing data gracefully.

    // Helper to flatten course structure for progress calculation
    const getAllLessons = (items: CourseItem[], parentFolder: string = ''): Array<{ path: string; exerciseCount: number; folder: string }> => {
        let lessons: Array<{ path: string; exerciseCount: number; folder: string }> = [];
        items.forEach(item => {
            if (item.path && !item.items) {
                lessons.push({
                    path: item.path,
                    exerciseCount: lookupExerciseCount(exerciseCounts, item.path),
                    folder: parentFolder
                });
            }
            if (item.items) {
                lessons = [...lessons, ...getAllLessons(item.items, item.title)];
            }
        });
        return lessons;
    };

    const allLessons = getAllLessons(course.structure);
    const courseProgress = getCourseProgressData(allLessons);

    const routes: Array<{ path: string; element: React.ReactNode }> = [];
    const traverse = (items: CourseItem[]) => {
        items.forEach(item => {
            if (item.path) {
                routes.push({
                    path: item.path,
                    element: <DynamicPage path={item.path} />
                });
            }
            if (item.items) {
                traverse(item.items);
            }
        });
    };
    traverse(course.structure);

    return (
        <HelmetProvider>
            <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden relative">
                <Helmet>
                    <title>{course.title}</title>
                </Helmet>

                <AnalyticsTracker courseGaId={course.googleAnalyticsId} />

                {/* Mobile Header */}
                <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 z-20">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="ml-4 font-bold truncate">{course.title}</span>
                </div>

                {/* Sidebar */}
                <div
                    className={clsx(
                        "fixed inset-y-0 left-0 z-30 w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-2">
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white break-words leading-tight pr-2">
                                    {course.title}
                                </h1>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            {courseProgress.totalExercises > 0 && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>Course Progress</span>
                                        <span>{courseProgress.percentage}%</span>
                                    </div>
                                    <ProgressBar progress={courseProgress.percentage} height="h-2" showLabel={false} color="bg-green-500" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {course.structure.map((item, index) => (
                                <SidebarItem
                                    key={index}
                                    item={item}
                                    exerciseCounts={exerciseCounts}
                                />
                            ))}
                        </div>

                        <div className="mt-auto bg-gray-50 dark:bg-gray-900">
                            <SettingsToggle />
                            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Language Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className={clsx(
                    "flex-1 h-full overflow-hidden transition-all duration-200",
                    isSidebarOpen ? "md:ml-0" : ""
                )}>
                    <div className="h-full overflow-y-auto pt-16 md:pt-0">
                        <React.Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>}>
                            <div className="max-w-6xl mx-auto p-4 md:p-8">
                                <Routes>
                                    {routes.map((route) => (
                                        <Route
                                            key={route.path}
                                            path={route.path}
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>{course.title}</title>
                                                    </Helmet>
                                                    <MDXComponentsProvider>
                                                        <article className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-xl">
                                                            {route.element}
                                                            <NextLessonNavigation currentPath={route.path} structure={course.structure} />
                                                        </article>
                                                    </MDXComponentsProvider>
                                                </>
                                            }
                                        />
                                    ))}
                                    <Route path="/table-test" element={<div />} /> {/* Dummy */}
                                    <Route path="/" element={<Navigate to={routes[0]?.path || '/'} replace />} />
                                </Routes>

                                <footer className="mt-16 py-8 text-center text-sm text-gray-400 dark:text-gray-600">
                                    <a
                                        href="https://akkem.study"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors"
                                    >
                                        Made with akkem.study
                                    </a>
                                </footer>
                            </div>
                        </React.Suspense>
                    </div>
                </div>

                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-20 md:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>
        </HelmetProvider>
    );
}

export default function ReaderApp() {
    return (
        <SettingsProvider>
            <ProgressProvider>
                <ToastProvider>
                    <Router basename={import.meta.env.BASE_URL.startsWith('.') ? '/' : import.meta.env.BASE_URL}>
                        <AppContent />
                    </Router>
                </ToastProvider>
            </ProgressProvider>
        </SettingsProvider>
    );
}
