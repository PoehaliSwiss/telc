import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { Mic, Square, Eye, EyeOff, Check, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { useSettings } from '../../context/SettingsContext';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface SpeakingChallengeProps {
    children: ReactNode;
    hideText?: boolean;
    lang?: string;
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

export const SpeakingChallenge: React.FC<SpeakingChallengeProps> = ({ children, hideText = false, lang }) => {
    const { languageSettings } = useSettings();

    // Use global settings as defaults if props not provided
    const effectiveLang = lang || languageSettings.learningLang;
    // Note: voice is not used in SpeakingChallenge (only speech recognition, no TTS)

    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState<'idle' | 'recording' | 'verifying' | 'correct' | 'incorrect'>('idle');
    const [isRevealed, setIsRevealed] = useState(!hideText);
    const [error, setError] = useState<string | null>(null);
    const [matchedIndices, setMatchedIndices] = useState<Set<number>>(new Set());

    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef('');

    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    const text = extractText(children);

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const exerciseId = generateStableExerciseId(lessonPath, 'SpeakingChallenge', text);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, text, isExerciseComplete]);

    // Check completion
    useEffect(() => {
        if (status === 'correct' && exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    }, [status, markExerciseComplete, location.pathname]);

    // Split text into words, keeping punctuation attached to words for display but handling it in matching
    const words = text.split(/\s+/);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true; // Enable continuous recognition
                recognition.interimResults = true;
                recognition.lang = effectiveLang;

                recognition.onstart = () => {
                    setIsRecording(true);
                    setStatus('recording');
                    setTranscript('');
                    finalTranscriptRef.current = '';
                    setMatchedIndices(new Set());
                    setError(null);
                };

                recognition.onresult = (event: any) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscriptRef.current += event.results[i][0].transcript + ' ';
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    const currentFullTranscript = (finalTranscriptRef.current + interimTranscript).trim();
                    setTranscript(currentFullTranscript);
                    verifySpeech(currentFullTranscript);
                };

                recognition.onerror = (event: any) => {
                    // Ignore 'no-speech' error in continuous mode as it might just be a pause
                    if (event.error === 'no-speech') return;

                    console.error('Speech recognition error', event.error);
                    setIsRecording(false);
                    if (event.error === 'not-allowed') {
                        setError('Microphone access denied.');
                    } else {
                        setError(`Error: ${event.error}`);
                        setStatus('idle');
                    }
                };

                recognition.onend = () => {
                    // Only stop if we explicitly stopped or if there was a fatal error
                    // In continuous mode, we might want to restart if it stopped unexpectedly but for now let's respect the stop
                    setIsRecording(false);
                };

                recognitionRef.current = recognition;
            } else {
                setError('Speech recognition not supported in this browser.');
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [effectiveLang, text]);

    const verifySpeech = (spokenText: string) => {
        setStatus('verifying');

        const normalize = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
        const targetWords = words.map(w => normalize(w));
        const spokenWords = spokenText.split(/\s+/).map(w => normalize(w)).filter(Boolean);

        const newMatchedIndices = new Set<number>();
        let tIndex = 0;
        let sIndex = 0;

        // Fuzzy matching logic
        while (tIndex < targetWords.length && sIndex < spokenWords.length) {
            const target = targetWords[tIndex];
            const spoken = spokenWords[sIndex];

            // Check for exact match or fuzzy match
            const isMatch = target === spoken ||
                (target.length > 3 && spoken.length > 3 && levenshteinDistance(target, spoken) <= 1);

            if (isMatch) {
                newMatchedIndices.add(tIndex);
                tIndex++;
                sIndex++;
            } else {
                // Look ahead in spoken words (maybe extra word was spoken)
                let found = false;
                for (let offset = 1; offset <= 2; offset++) {
                    if (sIndex + offset < spokenWords.length) {
                        const nextSpoken = spokenWords[sIndex + offset];
                        if (target === nextSpoken || (target.length > 3 && nextSpoken.length > 3 && levenshteinDistance(target, nextSpoken) <= 1)) {
                            newMatchedIndices.add(tIndex);
                            sIndex += offset + 1;
                            tIndex++;
                            found = true;
                            break;
                        }
                    }
                }

                if (!found) {
                    // If not found, maybe we missed this target word?
                    // But we don't advance sIndex to give next target word a chance
                    tIndex++;
                }
            }
        }

        setMatchedIndices(newMatchedIndices);

        // Check for completion (e.g., 85% of words matched)
        const matchPercentage = newMatchedIndices.size / targetWords.length;
        if (matchPercentage >= 0.85) {
            setStatus('correct');
            recognitionRef.current?.stop();
        } else {
            setStatus('recording'); // Keep recording
        }
    };

    // Levenshtein distance for fuzzy matching
    const levenshteinDistance = (a: string, b: string) => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        // increment along the first column of each row
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // increment each column in the first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1 // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    };

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
        } else {
            setStatus('idle');
            setTranscript('');
            recognitionRef.current?.start();
        }
    };

    return (
        <div className={clsx(
            "flex flex-col gap-4 p-6 border rounded-xl shadow-sm my-6 transition-colors",
            status === 'correct' ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" :
                status === 'incorrect' ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" :
                    "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 relative"
        )}>
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Speaking Challenge</div>
                    <div className={clsx("text-xl font-medium transition-all break-words leading-relaxed", !isRevealed && "blur-md select-none")}>
                        {words.map((word, index) => (
                            <span
                                key={index}
                                className={clsx(
                                    "inline-block mr-1.5 transition-colors duration-300",
                                    matchedIndices.has(index)
                                        ? "text-green-600 dark:text-green-400 font-semibold"
                                        : "text-gray-900 dark:text-gray-100"
                                )}
                            >
                                {word}
                            </span>
                        ))}
                    </div>
                    {transcript && (
                        <div className="mt-2 text-sm text-gray-500 italic">
                            You said: "{transcript}"
                        </div>
                    )}
                    {error && (
                        <div className="mt-2 text-sm text-red-500">
                            {error}
                        </div>
                    )}
                </div>

                {hideText && (
                    <button
                        onClick={() => setIsRevealed(!isRevealed)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                    >
                        {isRevealed ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>

            <div className="flex items-center justify-center pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <button
                    onClick={toggleRecording}
                    disabled={!!error && error !== 'Microphone access denied.' && error.includes('not supported')}
                    className={clsx(
                        "p-4 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-md focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
                        isRecording ? "bg-red-500 text-white animate-pulse ring-red-300" :
                            status === 'correct' ? "bg-green-500 text-white ring-green-300" :
                                "bg-blue-600 text-white hover:bg-blue-700 ring-blue-300"
                    )}
                >
                    {isRecording ? <Square fill="currentColor" /> :
                        status === 'correct' ? <Check size={28} strokeWidth={3} /> :
                            status === 'incorrect' ? <RotateCcw size={28} /> :
                                <Mic size={28} />}
                </button>
            </div>

            {status === 'incorrect' && !isRecording && (
                <div className="text-center text-red-500 font-medium text-sm animate-bounce">
                    Try again!
                </div>
            )}
            {status === 'correct' && (
                <div className="text-center text-green-600 font-medium text-sm">
                    Excellent!
                </div>
            )}
        </div>
    );
};
