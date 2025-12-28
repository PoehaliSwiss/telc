import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Volume2, VolumeX, RotateCcw, ChevronRight, Check } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { generateStableExerciseId } from '../../utils/exerciseId';

// New interface for children-based structure
export interface MessageProps {
    speaker: string;
    side?: 'left' | 'right';
    voice?: string;
    silent?: boolean;
    children: ReactNode;
}

export const Message: React.FC<MessageProps> = ({ children }) => {
    return <>{children}</>;
};

// Legacy interface
interface DialogueLine {
    speaker: string;
    text: string;
    side?: 'left' | 'right';
    voice?: string;
    silent?: boolean;
}

interface DialogueProps {
    lines?: DialogueLine[]; // Optional now
    children?: ReactNode;   // Support for nested Message components
    autoPlay?: boolean;
}

// Helper to extract text from ReactNode for TTS
const extractText = (node: ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return node.toString();
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (React.isValidElement(node)) {
        // If it's a known interactive component, maybe skip or say something generic?
        // For now, try to extract text from children
        return extractText((node as React.ReactElement<{ children: ReactNode }>).props.children);
    }
    return '';
};

export const Dialogue: React.FC<DialogueProps> = ({ lines: propLines, children, autoPlay = false }) => {
    const { languageSettings } = useSettings();
    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [speakerVoices, setSpeakerVoices] = useState<{ [speaker: string]: SpeechSynthesisVoice }>({});
    const [isMuted, setIsMuted] = useState(false);

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const childrenText = extractText(children);
        const exerciseId = generateStableExerciseId(lessonPath, 'Dialogue', childrenText);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, children, isExerciseComplete]);

    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Normalize lines from props OR children
    const lines = React.useMemo(() => {
        if (propLines && propLines.length > 0) {
            return propLines.map(l => ({
                ...l,
                content: l.text // Map text to content for unified rendering
            }));
        }

        return React.Children.toArray(children)
            .filter((child): child is React.ReactElement<MessageProps> => {
                return React.isValidElement(child) && (child.type === Message || (child.type as any).name === 'Message');
            })
            .map(child => ({
                speaker: child.props.speaker,
                side: child.props.side,
                voice: child.props.voice,
                silent: child.props.silent,
                text: extractText(child.props.children), // Extract text for TTS
                content: child.props.children // Keep full content for rendering
            }));
    }, [propLines, children]);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            // Filter for voices matching learning language (e.g. 'de-DE', 'en-US')
            // Match logic: start with the full code, fallback to just the language part (e.g. 'de')
            const langCode = languageSettings.learningLang || 'en-US';
            const langPrefix = langCode.split('-')[0];

            const matchingVoices = availableVoices.filter(v =>
                v.lang === langCode || v.lang.startsWith(langPrefix)
            );

            setVoices(matchingVoices.length > 0 ? matchingVoices : availableVoices);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
            window.speechSynthesis.cancel();
        };
    }, [languageSettings.learningLang]); // Reload if language changes

    // Assign voices to speakers
    useEffect(() => {
        if (voices.length === 0 || lines.length === 0) return;

        const uniqueSpeakers = Array.from(new Set(lines.map(l => l.speaker)));
        const assignments: { [speaker: string]: SpeechSynthesisVoice } = {};

        // Use global settings voice priority: primary, secondary, additional[]
        const globalVoicesList = [
            languageSettings.learningVoices.primary,
            languageSettings.learningVoices.secondary,
            ...(languageSettings.learningVoices.additional || [])
        ].filter(v => v); // Remove empty values

        // Find the actual voice objects corresponding to the names in settings
        const availableGlobalVoices = globalVoicesList
            .map(name => voices.find(v => v.name === name))
            .filter((v): v is SpeechSynthesisVoice => !!v);

        let globalVoiceIdx = 0;

        // Fallback pools if settings are not enough
        const maleNames = ['Markus', 'Yannick', 'Viktor', 'Stefan', 'Microsoft Stefan', 'David', 'James'];
        const femaleNames = ['Anna', 'Petra', 'Amelie', 'Hedda', 'Microsoft Hedda', 'Katja', 'Linda', 'Mary'];

        const maleVoices = voices.filter((v: SpeechSynthesisVoice) => maleNames.some(name => v.name.includes(name)) || v.name.toLowerCase().includes('male'));
        const femaleVoices = voices.filter((v: SpeechSynthesisVoice) => femaleNames.some(name => v.name.includes(name)) || v.name.toLowerCase().includes('female'));

        // Filter out voices that are already categorized to avoid duplicates in "other"
        const categorizedVoices = new Set([...maleVoices, ...femaleVoices]);
        const otherVoices = voices.filter((v: SpeechSynthesisVoice) => !categorizedVoices.has(v));

        let maleIdx = 0;
        let femaleIdx = 0;
        let otherIdx = 0;

        uniqueSpeakers.forEach((speaker) => {
            // 1. Check if this line has an explicit voice preference defined in prop
            const lineWithSpeaker = lines.find(l => l.speaker === speaker);
            if (lineWithSpeaker?.voice) {
                const explicitVoice = voices.find(v => v.name === lineWithSpeaker.voice);
                if (explicitVoice) {
                    assignments[speaker] = explicitVoice;
                    return;
                }
            }

            // 2. Try to assign from global settings (Primary, Secondary, Additional) sequentially
            if (globalVoiceIdx < availableGlobalVoices.length) {
                assignments[speaker] = availableGlobalVoices[globalVoiceIdx];
                globalVoiceIdx++;
                return;
            }

            // 3. Fallback to heuristic logic (Male/Female/Other)
            const isLikelyMale = ['Mark', 'Hans', 'Peter', 'Lukas', 'John', 'David'].some(n => speaker.includes(n));
            const isLikelyFemale = ['Anna', 'Maria', 'Julia', 'Lisa', 'Sarah', 'Mary'].some(n => speaker.includes(n));

            if (isLikelyMale && maleVoices.length > 0) {
                assignments[speaker] = maleVoices[maleIdx % maleVoices.length];
                maleIdx++;
            } else if (isLikelyFemale && femaleVoices.length > 0) {
                assignments[speaker] = femaleVoices[femaleIdx % femaleVoices.length];
                femaleIdx++;
            } else {
                // Fallback: try to distribute evenly across available pools
                if (otherVoices.length > 0) {
                    assignments[speaker] = otherVoices[otherIdx % otherVoices.length];
                    otherIdx++;
                } else if (voices.length > 0) {
                    // Absolute fallback
                    assignments[speaker] = voices[(maleIdx + femaleIdx + otherIdx) % voices.length];
                    otherIdx++;
                }
            }
        });

        setSpeakerVoices(assignments);
    }, [voices, lines, languageSettings]);

    const speak = (text: string, speaker: string, preferredVoiceName?: string, silent?: boolean) => {
        if (isMuted || !text || silent) return;

        window.speechSynthesis.cancel(); // Stop previous

        const utterance = new SpeechSynthesisUtterance(text);
        // Use the configured learning language
        utterance.lang = languageSettings.learningLang || 'en-US';

        let voiceToUse: SpeechSynthesisVoice | undefined;

        // 1. Try explicit preference (from Wizard)
        if (preferredVoiceName) {
            voiceToUse = voices.find(v => v.name === preferredVoiceName);
        }

        // 2. Fallback to auto-assigned speaker voice (which now respects global settings)
        if (!voiceToUse && speakerVoices[speaker]) {
            voiceToUse = speakerVoices[speaker];
        }

        // 3. Absolute fallback (first available matching voice)
        if (!voiceToUse && voices.length > 0) {
            voiceToUse = voices[0];
        }

        if (voiceToUse) {
            utterance.voice = voiceToUse;
        }

        // Adjust rate/pitch slightly if needed
        utterance.rate = 0.9; // Slightly slower for learning

        utterance.onend = () => {
            if (autoPlay && currentIndex < lines.length - 1) {
                // Optional: auto-advance logic could go here, but "Next" button is safer for learning
            }
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const handleNext = () => {
        if (currentIndex < lines.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            speak(lines[nextIndex].text, lines[nextIndex].speaker, lines[nextIndex].voice, lines[nextIndex].silent);

            // Mark complete if we reached the last line
            if (nextIndex === lines.length - 1 && exerciseIdRef.current) {
                markExerciseComplete(exerciseIdRef.current, location.pathname);
                setIsCompleted(true);
            }
        }
    };

    const handleReplay = () => {
        setCurrentIndex(0);
        speak(lines[0].text, lines[0].speaker, lines[0].voice, lines[0].silent);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (!isMuted) {
            window.speechSynthesis.cancel();
        }
    };

    // Speak initial line on mount if autoPlay or just ready
    useEffect(() => {
        // Don't auto-speak on mount to avoid annoyance, unless requested
        // But we do want to speak when index changes via Next button
    }, []);

    // Deterministic color generation based on name
    const getSpeakerColor = (name: string) => {
        const colors = [
            "text-blue-600 dark:text-blue-400",
            "text-green-600 dark:text-green-400",
            "text-purple-600 dark:text-purple-400",
            "text-orange-600 dark:text-orange-400",
            "text-pink-600 dark:text-pink-400",
            "text-teal-600 dark:text-teal-400",
            "text-indigo-600 dark:text-indigo-400",
            "text-red-600 dark:text-red-400",
            "text-cyan-600 dark:text-cyan-400",
            "text-emerald-600 dark:text-emerald-400",
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="max-w-2xl mx-auto my-8 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative">
            {isCompleted && (
                <div className="absolute top-2 right-2 z-10 bg-green-500 text-white rounded-full p-1 shadow-lg">
                    <Check size={16} />
                </div>
            )}
            {/* Header / Controls */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Dialogue</h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleReplay}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                        title="Restart"
                    >
                        <RotateCcw size={18} />
                    </button>
                    <button
                        onClick={toggleMute}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div
                className="p-6 space-y-6 min-h-[300px] max-h-[500px] overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50"
            // Remove onClick to advance, as it might interfere with interactive content
            >
                {lines.slice(0, currentIndex + 1).map((line, idx) => {
                    const isLeft = line.side === 'left' || (!line.side && idx % 2 === 0);
                    const isLast = idx === currentIndex;

                    return (
                        <div
                            key={idx}
                            className={clsx(
                                "flex flex-col max-w-[85%] transition-all duration-500 ease-out",
                                isLeft ? "self-start items-start" : "self-end items-end ml-auto",
                                isLast ? "opacity-100 translate-y-0" : "opacity-80"
                            )}
                        >
                            <span className={clsx("text-xs font-bold mb-1 px-1", getSpeakerColor(line.speaker))}>
                                {line.speaker}
                            </span>
                            <div
                                className={clsx(
                                    "px-4 py-3 rounded-2xl shadow-sm text-base leading-relaxed relative",
                                    isLeft
                                        ? "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700"
                                        : "bg-blue-600 text-white rounded-tr-none"
                                )}
                            >
                                {line.content}
                                {isLast && !isMuted && line.text && !line.silent && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speak(line.text, line.speaker, line.voice, line.silent);
                                        }}
                                        className={clsx(
                                            "absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                                            isLeft ? "text-gray-400 hover:text-blue-500" : "text-blue-200 hover:text-white"
                                        )}
                                    >
                                        <Volume2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Spacer for scrolling */}
                <div className="h-4" />
            </div>

            {/* Footer / Next Action */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                {currentIndex < lines.length - 1 ? (
                    <button
                        onClick={handleNext}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
                    >
                        <span>Next</span>
                        <ChevronRight size={20} />
                    </button>
                ) : (
                    <button
                        onClick={handleReplay}
                        className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={18} />
                        <span>Replay Dialogue</span>
                    </button>
                )}
            </div>
        </div>
    );
};
