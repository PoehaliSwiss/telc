import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { Play, Square, Eye, EyeOff, Volume2, Pause, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useSettings } from '../../context/SettingsContext';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { generateStableExerciseId } from '../../utils/exerciseId';


interface AudioPhraseProps {
    children: ReactNode;
    speaker?: string;
    hideText?: boolean;
    autoPlay?: boolean;
    lang?: string;
    voice?: string;
}

const extractText = (node: ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return node.toString();
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (React.isValidElement(node)) {
        const props = node.props as { children?: ReactNode };
        return extractText(props.children);
    }
    return '';
};

export const AudioPhrase: React.FC<AudioPhraseProps> = ({ children, speaker, hideText = false, autoPlay = false, lang, voice }) => {
    const { languageSettings } = useSettings();
    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    // Use global settings as defaults if props not provided
    const effectiveLang = lang || languageSettings.learningLang;
    const effectiveVoice = voice || languageSettings.learningVoices.primary;

    const [isPlaying, setIsPlaying] = useState(false);
    const [isRevealed, setIsRevealed] = useState(!hideText);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const text = extractText(children);

    // Detect if this is a short phrase or long text
    // Consider it "long" if it has newlines or is longer than 150 characters
    const isLongText = text.includes('\n') || text.length > 150;

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const exerciseId = generateStableExerciseId(lessonPath, 'AudioPhrase', text);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, text, isExerciseComplete]);

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();

            // 1. Try to find exact voice match by name
            if (effectiveVoice) {
                const foundVoice = voices.find(v => v.name === effectiveVoice);
                if (foundVoice) {
                    setSelectedVoice(foundVoice);
                    return;
                }
            }

            // 2. Try to find voice by language
            if (effectiveLang) {
                const normalizeLang = (l: string) => l.replace('_', '-');
                const normalizedEffectiveLang = normalizeLang(effectiveLang);

                const langVoice = voices.find(v => {
                    const normalizedVoiceLang = normalizeLang(v.lang);
                    return normalizedVoiceLang.startsWith(normalizedEffectiveLang);
                });

                if (langVoice) {
                    setSelectedVoice(langVoice);
                    return;
                }
            }

            // 3. Fallback to German preference
            const deVoice = voices.find(v => v.lang.startsWith('de'));
            setSelectedVoice(deVoice || voices[0]);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [effectiveLang, effectiveVoice]);

    const speak = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            window.getSelection()?.removeAllRanges();
            setIsPlaying(false);
            return;
        }

        window.speechSynthesis.cancel();

        // Build text and map to nodes
        let textToSpeak = text;
        let segments: { node: Node, start: number, end: number, text: string }[] = [];

        if (contentRef.current) {
            const treeWalker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
            let currentNode = treeWalker.nextNode();
            let currentText = '';

            while (currentNode) {
                const nodeText = currentNode.textContent || '';
                // Only map non-empty nodes, but keep track of all text
                if (nodeText.trim().length > 0) {
                    const start = currentText.length;
                    currentText += nodeText;
                    const end = currentText.length;
                    segments.push({ node: currentNode, start, end, text: nodeText });

                    // Add space for separation if needed (simple heuristic)
                    if (!nodeText.match(/\s$/)) {
                        currentText += ' ';
                    }
                } else {
                    // Just append whitespace if any
                    currentText += nodeText;
                }
                currentNode = treeWalker.nextNode();
            }
            textToSpeak = currentText.trim().length > 0 ? currentText : text;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
            setIsPlaying(false);
            window.getSelection()?.removeAllRanges();
            // Mark complete when audio finishes
            if (exerciseIdRef.current) {
                markExerciseComplete(exerciseIdRef.current, location.pathname);
                setIsCompleted(true);
            }
        };
        utterance.onerror = () => {
            setIsPlaying(false);
            window.getSelection()?.removeAllRanges();
        };

        utterance.onboundary = (event) => {
            if (event.name === 'word' && segments.length > 0) {
                const charIndex = event.charIndex;

                // Find segment containing this charIndex
                const segment = segments.find(s => charIndex >= s.start && charIndex < s.end);

                if (segment) {
                    const localOffset = charIndex - segment.start;
                    // Find end of word in this segment
                    let endOffset = localOffset;
                    while (endOffset < segment.text.length && !/\s/.test(segment.text[endOffset])) {
                        endOffset++;
                    }

                    try {
                        const range = document.createRange();
                        range.setStart(segment.node, localOffset);
                        range.setEnd(segment.node, endOffset);

                        const selection = window.getSelection();
                        selection?.removeAllRanges();
                        selection?.addRange(range);

                        // Optional: scroll into view if needed
                        // (range.startContainer as Element).parentElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    } catch (e) {
                        // Ignore range errors
                    }
                }
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (autoPlay && selectedVoice) {
            speak();
        }
    }, [autoPlay, selectedVoice]);

    // Short phrase rendering (inline style)
    if (!isLongText) {
        return (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm my-4 border-gray-200 dark:border-gray-700">
                <button
                    onClick={speak}
                    className="p-3 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    title={isPlaying ? "Stop audio" : "Play audio"}
                >
                    {isPlaying ? <Square fill="currentColor" /> : <Play fill="currentColor" />}
                </button>

                <div className="flex-1 min-w-0" ref={contentRef}>
                    {speaker && <div className="text-xs font-bold text-gray-500 uppercase mb-1">{speaker}</div>}
                    <div className={clsx("text-lg transition-all break-words", !isRevealed && "blur-md select-none")}>
                        {children}
                    </div>
                </div>

                {hideText && (
                    <button
                        onClick={() => setIsRevealed(!isRevealed)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                        title={isRevealed ? "Hide text" : "Show text"}
                    >
                        {isRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
        );
    }



    return (
        <div className="relative">
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}
            <div className="border rounded-xl bg-white dark:bg-gray-800 shadow-sm my-6 border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <Volume2 className="text-blue-600" size={20} />
                        {speaker && <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{speaker}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={speak}
                            className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors focus:outline-none"
                            title={isPlaying ? "Stop" : "Play"}
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>
                        {hideText && (
                            <button
                                onClick={() => setIsRevealed(!isRevealed)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                                title={isRevealed ? "Hide text" : "Show text"}
                            >
                                {isRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div
                    ref={contentRef}
                    className={clsx(
                        "p-6 prose dark:prose-invert max-w-none transition-all",
                        !isRevealed && "blur-md select-none"
                    )}
                >
                    {children}
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-center gap-3">
                    <button
                        onClick={speak}
                        className={clsx(
                            "px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                            isPlaying
                                ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                                : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                        )}
                    >
                        {isPlaying ? (
                            <>
                                <Square size={20} fill="currentColor" />
                                Stop
                            </>
                        ) : (
                            <>
                                <Play size={20} fill="currentColor" />
                                Play Audio
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
