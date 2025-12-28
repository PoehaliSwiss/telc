import React, { useState, useEffect, useMemo } from 'react';
import * as runtime from 'react/jsx-runtime';
import { evaluate } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import { ErrorBoundary } from './ErrorBoundary';
import { Quiz, Option } from './exercises/Quiz';
import { Ordering } from './exercises/Ordering';
import { Matching } from './exercises/Matching';
import { FillBlanks } from './exercises/FillBlanks';
import { InlineBlanks } from './exercises/InlineBlanks';
import { Grouping } from './exercises/Grouping';
import { Media } from './exercises/Media';
import { InteractiveMedia, Checkpoint } from './exercises/InteractiveMedia';
import { Dialogue, Message } from './exercises/Dialogue';
import { AudioPhrase } from './exercises/AudioPhrase';
import { SpeakingChallenge } from './exercises/SpeakingChallenge';
import { ImageLabeling } from './exercises/ImageLabeling';
import { Flashcards } from './exercises/Flashcards';

interface MDXViewerProps {
    content: string;
    className?: string;
}

export const MDXViewer: React.FC<MDXViewerProps> = ({ content, className }) => {
    if (typeof content !== 'string') {
        console.error('MDXViewer received non-string content:', content);
        return <div className="p-4 text-red-500">Error: Invalid content format</div>;
    }

    const [MDXComponent, setMDXComponent] = useState<React.ComponentType<any> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const compileMdx = async () => {
            try {
                // Preprocess: Remove empty lines within exercise blocks (same logic as Editor)
                const cleanBlock = (text: string, tagName: string) => {
                    const regex = new RegExp(`(<${tagName}\\b[^>]*>)([\\s\\S]*?)(<\\/\\s*${tagName}\\s*>)`, 'gi');
                    return text.replace(regex, (_match, openTag, subcontent, closeTag) => {
                        const hasTableSeparator = /^\s*\|[\s\-:|]+\|\s*$/m.test(subcontent);
                        if (hasTableSeparator) {
                            const cleanedContent = subcontent.split('\n').map((l: string) => l.trim()).join('\n');
                            return `${openTag}\n${cleanedContent}\n${closeTag}`;
                        }
                        const cleanedContent = subcontent.split('\n').filter((l: string) => l.trim() !== '').map((l: string) => l.trim()).join('\n');
                        return `${openTag}\n${cleanedContent}\n${closeTag}`;
                    });
                };

                let processedMdx = content;
                const componentTypes = [
                    'Quiz', 'Ordering', 'Matching', 'FillBlanks', 'Grouping',
                    'Media', 'InlineBlanks', 'Dialogue', 'InteractiveMedia',
                    'AudioPhrase', 'SpeakingChallenge', 'Flashcards', 'ImageLabeling'
                ];

                componentTypes.forEach(type => {
                    processedMdx = cleanBlock(processedMdx, type);
                });

                const { default: Content } = await evaluate(processedMdx, {
                    ...runtime as any,
                    remarkPlugins: [remarkGfm, remarkGithubBlockquoteAlert],
                    baseUrl: import.meta.url,
                });
                setMDXComponent(() => Content);
                setError(null);
            } catch (err: any) {
                console.error('MDX Compilation Error:', err);
                setError(err.message);
            }
        };

        compileMdx();
    }, [content]);

    const components = useMemo(() => {
        return {
            Quiz, quiz: Quiz,
            Ordering, ordering: Ordering,
            Matching, matching: Matching,
            FillBlanks, fillblanks: FillBlanks,
            Grouping, grouping: Grouping,
            Media, media: Media,
            InlineBlanks, inlineblanks: InlineBlanks,
            Option, option: Option,
            Dialogue, dialogue: Dialogue,
            Message, message: Message,
            InteractiveMedia, interactivemedia: InteractiveMedia,
            Checkpoint, checkpoint: Checkpoint,
            AudioPhrase,
            SpeakingChallenge,
            Flashcards, flashcards: Flashcards,
            ImageLabeling, imagelabeling: ImageLabeling,
        };
    }, []);

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded border border-red-200">
                <h3 className="font-bold mb-2">Error rendering content</h3>
                <pre className="whitespace-pre-wrap text-sm font-mono">{error}</pre>
            </div>
        );
    }

    if (!MDXComponent) {
        return <div className="p-8 text-center text-gray-500">Loading content...</div>;
    }

    return (
        <div className={className}>
            <ErrorBoundary fallback={(err) => (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    <h3 className="font-bold mb-2">Runtime Error</h3>
                    <pre className="whitespace-pre-wrap text-sm font-mono">{err.message}</pre>
                </div>
            )}>
                <MDXComponent components={components} />
            </ErrorBoundary>
        </div>
    );
};
