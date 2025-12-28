import React, { useEffect, useRef, useState } from 'react';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface MediaProps {
    src: string;
    type: 'audio' | 'video' | 'youtube' | 'image';
    caption?: string;
    onResolvePath?: (path: string) => string;
}

export const Media: React.FC<MediaProps> = ({ src, type, caption, onResolvePath }) => {
    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        const lessonPath = location.pathname;
        const exerciseId = generateStableExerciseId(lessonPath, 'Media', src);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, src, isExerciseComplete]);

    const handleMediaEnd = () => {
        if (exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    };

    const renderMedia = () => {
        let resolvedSrc = src;
        // Resolve path if resolver provided, functionality for the Editor
        if (type === 'image' && (src.startsWith('public/') || src.startsWith('/public/'))) {
            const path = src.startsWith('/') ? src.slice(1) : src;

            if (onResolvePath) {
                resolvedSrc = onResolvePath(path);
            } else {
                // Runtime/Production resolution for Reader
                // Strip 'public/' and prepend base URL
                const relativePath = path.replace(/^public\//, '');
                // Ensure we don't end up with double slashes if BASE_URL ends with / and path starts with /
                // Usually BASE_URL ends with /
                const baseUrl = import.meta.env.BASE_URL || '/';
                resolvedSrc = `${baseUrl}${relativePath}`.replace(/\/+/g, '/');
            }
        }

        switch (type) {
            case 'youtube':
                // Extract video ID if full URL is provided, or use as is if it's just ID
                const videoId = src.includes('v=') ? src.split('v=')[1].split('&')[0] : src;
                return (
                    <div className="aspect-w-16 aspect-h-9 w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-lg">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full min-h-[400px]"
                        ></iframe>
                    </div>
                );
            case 'video':
                return (
                    <video controls className="w-full max-w-3xl mx-auto rounded-xl shadow-lg" onEnded={handleMediaEnd}>
                        <source src={src} />
                        Your browser does not support the video tag.
                    </video>
                );
            case 'audio':
                return (
                    <div className="w-full max-w-xl mx-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm">
                        <audio controls className="w-full" onEnded={handleMediaEnd}>
                            <source src={src} />
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                );
            case 'image':
                return (
                    <div className="w-full max-w-3xl mx-auto">
                        <img
                            src={resolvedSrc}
                            alt={caption || 'Media image'}
                            className="w-full h-auto rounded-xl shadow-lg"
                            onLoad={handleMediaEnd}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="my-8 relative">
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}
            {renderMedia()}
            {caption && (
                <p className="text-center text-sm text-gray-500 mt-2 dark:text-gray-400">
                    {caption}
                </p>
            )}
        </div>
    );
};
