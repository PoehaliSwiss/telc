import React from 'react';
import { Link } from 'react-router-dom';
import { type CourseItem } from '../utils/contentLoader';

interface NextLessonNavigationProps {
    currentPath: string;
    structure: CourseItem[];
}

export const NextLessonNavigation: React.FC<NextLessonNavigationProps> = ({ currentPath, structure }) => {
    const findNext = (items: CourseItem[]): CourseItem | null => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.path === currentPath) {
                // Found current item
                if (i + 1 < items.length) {
                    const next = items[i + 1];
                    // Only return if it has a path (is a lesson, not a folder)
                    if (next.path) {
                        return next;
                    }
                }
                return null;
            }
            if (item.items) {
                const found = findNext(item.items);
                if (found) return found;
            }
        }
        return null;
    };

    const nextLesson = findNext(structure);

    if (!nextLesson || !nextLesson.path) return null;

    return (
        <div className="mt-12 flex justify-end border-t border-gray-100 dark:border-gray-800 pt-8">
            <Link
                to={nextLesson.path}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 !text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm group"
            >
                <span>Next: {nextLesson.title}</span>
                <svg
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </Link>
        </div>
    );
};
