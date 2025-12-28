
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight,
    Volume2, Mic, Keyboard, Layers, Brain, Shuffle, Check, X,
    Play, Pause, Repeat
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSettings } from '../../context/SettingsContext';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { generateStableExerciseId } from '../../utils/exerciseId';


export interface FlashcardItem {
    word: string;
    wordTranslation: string;
    phrase: string;
    phraseTranslation: string;
    audio?: string;
    category?: string;
    partOfSpeech?: string;
}

interface FlashcardsProps {
    items: FlashcardItem[];
    lang?: string;
    translationLang?: string;
    voice?: string;
    translationVoice?: string;
    autoPlay?: boolean;
    showLearn?: boolean;
    showQuiz?: boolean;
    showMatch?: boolean;
    showType?: boolean;
    showSpeak?: boolean;
}

type FlashcardMode = 'flip' | 'quiz' | 'matching' | 'typing' | 'speed';

export const Flashcards: React.FC<FlashcardsProps> = ({
    items,
    lang,
    translationLang,
    voice,
    translationVoice,
    autoPlay = false,
    showLearn = true,
    showQuiz = true,
    showMatch = true,
    showType = true,
    showSpeak = true
}) => {
    const { languageSettings } = useSettings();

    // Use global settings as defaults if props not provided
    const effectiveLang = lang || languageSettings.learningLang;
    const effectiveTranslationLang = translationLang || languageSettings.translationLang;
    const effectiveVoice = voice || languageSettings.learningVoices.primary;
    const effectiveTranslationVoice = translationVoice || languageSettings.translationVoice;

    // Determine available modes
    const availableModes: FlashcardMode[] = [];
    if (showLearn) availableModes.push('flip');
    if (showQuiz) availableModes.push('quiz');
    if (showMatch) availableModes.push('matching');
    if (showType) availableModes.push('typing');
    if (showSpeak) availableModes.push('speed');

    const [mode, setMode] = useState<FlashcardMode>(availableModes[0] || 'flip');
    const [currentIndex, setCurrentIndex] = useState(0);

    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const contentId = JSON.stringify(items.map(i => i.word + i.wordTranslation));
        const exerciseId = generateStableExerciseId(lessonPath, 'Flashcards', contentId);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, items, isExerciseComplete]);

    const handleComplete = useCallback(() => {
        if (exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    }, [markExerciseComplete, location.pathname]);

    const handleNext = () => {
        setCurrentIndex(prev => {
            const next = (prev + 1) % items.length;
            if (next === 0 && prev === items.length - 1) {
                // Completed a full cycle
                handleComplete();
            }
            return next;
        });
    };

    // Mode switching handler
    const handleModeChange = (newMode: FlashcardMode) => {
        setMode(newMode);
        setCurrentIndex(0); // Reset progress on mode change
    };

    return (
        <div className="my-8 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 relative">
            {isCompleted && (
                <div className="absolute top-2 right-2 z-10 bg-green-500 text-white rounded-full p-2 shadow-lg">
                    <Check size={20} />
                </div>
            )}
            {/* Header / Mode Selector */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-wrap gap-2 justify-center">
                {showLearn && (
                    <ModeButton
                        active={mode === 'flip'}
                        onClick={() => handleModeChange('flip')}
                        icon={<Layers size={18} />}
                        label="Learn"
                    />
                )}
                {showQuiz && (
                    <ModeButton
                        active={mode === 'quiz'}
                        onClick={() => handleModeChange('quiz')}
                        icon={<Brain size={18} />}
                        label="Quiz"
                    />
                )}
                {showMatch && (
                    <ModeButton
                        active={mode === 'matching'}
                        onClick={() => handleModeChange('matching')}
                        icon={<Shuffle size={18} />}
                        label="Match"
                    />
                )}
                {showType && (
                    <ModeButton
                        active={mode === 'typing'}
                        onClick={() => handleModeChange('typing')}
                        icon={<Keyboard size={18} />}
                        label="Type"
                    />
                )}
                {showSpeak && (
                    <ModeButton
                        active={mode === 'speed'}
                        onClick={() => handleModeChange('speed')}
                        icon={<Mic size={18} />}
                        label="Speak"
                    />
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 min-h-[400px] flex flex-col items-center justify-center relative">
                {mode === 'flip' && (
                    <FlipView
                        items={items}
                        currentIndex={currentIndex}
                        onNext={handleNext}
                        onPrev={() => setCurrentIndex(prev => (prev - 1 + items.length) % items.length)}
                        lang={effectiveLang}
                        voice={effectiveVoice}
                        autoPlay={autoPlay}
                    />
                )}
                {mode === 'quiz' && (
                    <QuizView
                        items={items}
                        currentIndex={currentIndex}
                        onNext={() => setCurrentIndex(prev => (prev + 1) % items.length)}
                    />
                )}
                {mode === 'matching' && (
                    <MatchingView items={items} onComplete={handleComplete} />
                )}
                {mode === 'typing' && (
                    <TypingView
                        items={items}
                        currentIndex={currentIndex}
                        onNext={() => setCurrentIndex(prev => (prev + 1) % items.length)}
                    />
                )}
                {mode === 'speed' && (
                    <SpeedView
                        items={items}
                        currentIndex={currentIndex}
                        onNext={handleNext}
                        lang={effectiveLang}
                        translationLang={effectiveTranslationLang}
                        voice={effectiveVoice}
                        translationVoice={effectiveTranslationVoice}
                    />
                )}
            </div>
        </div>
    );
};

const ModeButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            active
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        )}
    >
        {icon}
        <span>{label}</span>
    </button>
);

// --- Flip Mode Components ---

const FlipView: React.FC<{
    items: FlashcardItem[];
    currentIndex: number;
    onNext: () => void;
    onPrev: () => void;
    lang: string;
    voice?: string;
    autoPlay?: boolean;
}> = ({ items, currentIndex, onNext, onPrev, lang, voice, autoPlay = false }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [reverseCards, setReverseCards] = useState(false);
    const item = items[currentIndex];

    // Reset flip state when index changes
    useEffect(() => {
        setIsFlipped(false);

        // Auto-play sound when navigating to a new card
        if (autoPlay && isPlaying) {
            // Cancel any pending speech to prevent queuing
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(item.word);
            utterance.lang = lang;
            if (voice) {
                const voices = window.speechSynthesis.getVoices();
                const selectedVoice = voices.find(v => v.name === voice);
                if (selectedVoice) utterance.voice = selectedVoice;
            }
            // Small delay to ensure smooth transition
            const timer = setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [currentIndex, autoPlay, isPlaying, item.word, lang, voice]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handleSpeakWord = (e: React.MouseEvent) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(item.word);
        utterance.lang = lang;
        if (voice) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === voice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }
        window.speechSynthesis.speak(utterance);
    };

    // Helper to render phrase with highlighted word
    const renderPhrase = (text: string) => {
        const parts = text.split(/(\*[^*]+\*)/g);
        return (
            <span>
                {parts.map((part, i) => {
                    if (part.startsWith('*') && part.endsWith('*')) {
                        return <span key={i} className="text-blue-600 dark:text-blue-400 font-bold">{part.slice(1, -1)}</span>;
                    }
                    return part;
                })}
            </span>
        );
    };

    return (
        <div className="w-full max-w-md perspective-[1000px]">
            <div
                className={clsx(
                    "relative w-full aspect-[4/3] transition-transform duration-500 [transform-style:preserve-3d] cursor-pointer",
                    isFlipped && "[transform:rotateY(180deg)]"
                )}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                {/* Front */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8 text-center">
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {reverseCards ? item.wordTranslation : item.word}
                            </h3>
                            {!reverseCards && (
                                <button
                                    onClick={handleSpeakWord}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                                >
                                    <Volume2 size={20} />
                                </button>
                            )}
                        </div>

                        <div className="w-full h-px bg-gray-100 dark:bg-gray-700" />

                        <div className="space-y-2">
                            <div className="text-lg text-gray-700 dark:text-gray-200">
                                {renderPhrase(reverseCards ? item.phraseTranslation : item.phrase)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-xs text-gray-400 uppercase tracking-wider font-bold">
                        Tap to flip
                    </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-lg border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center p-8 text-center">
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                            {reverseCards ? item.word : item.wordTranslation}
                        </h3>
                        {reverseCards && (
                            <button
                                onClick={handleSpeakWord}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                            >
                                <Volume2 size={20} />
                            </button>
                        )}
                        <div className="w-full h-px bg-blue-200 dark:bg-blue-800" />

                        <div className="space-y-2 opacity-75">
                            <div className="text-lg text-gray-700 dark:text-gray-200">
                                {renderPhrase(item.phrase)}
                            </div>
                            {(
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.phraseTranslation}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4 mt-8 px-4">
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); setReverseCards(!reverseCards); }}
                    className={clsx(
                        "p-2 rounded-full transition-colors",
                        reverseCards
                            ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    )}
                    title={reverseCards ? "Normal order" : "Reverse order"}
                >
                    <Repeat size={18} />
                </button>

                <span className="text-sm font-medium text-gray-500 min-w-[60px] text-center">
                    {currentIndex + 1} / {items.length}
                </span>

                {/* Always reserve space for play button */}
                <div className="w-[40px] h-[40px] flex items-center justify-center">
                    {autoPlay && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                            className={clsx(
                                "p-2 rounded-full transition-colors",
                                isPlaying
                                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                            )}
                            title={isPlaying ? "Stop Auto-play" : "Start Auto-play"}
                        >
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};

// --- Quiz Mode Components ---

const QuizView: React.FC<{
    items: FlashcardItem[];
    currentIndex: number;
    onNext: () => void;
    onComplete?: () => void;
}> = ({ items, onComplete }) => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [shuffledItems, setShuffledItems] = useState<FlashcardItem[]>([]);
    const [quizIndex, setQuizIndex] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    // Initialize/Reset Quiz
    useEffect(() => {
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        setShuffledItems(shuffled);
        setQuizIndex(0);
        setIsFinished(false);
        setSelectedOption(null);
    }, [items]); // Only reset when items change (or explicit reset)

    const currentItem = shuffledItems[quizIndex];

    useEffect(() => {
        if (!currentItem) return;

        setSelectedOption(null);

        // Helper to get random items from an array
        const getRandom = (arr: FlashcardItem[], n: number) => {
            const count = Math.min(n, arr.length);
            return arr.sort(() => Math.random() - 0.5).slice(0, count);
        };

        // 1. Filter out the current item
        const otherItems = items.filter(i => i.word !== currentItem.word);

        // Stage 1: Same POS + Same Category
        // We handle undefined/null by treating them as equal if both are missing
        const samePosSameCat = otherItems.filter(i =>
            i.partOfSpeech === currentItem.partOfSpeech &&
            i.category === currentItem.category
        );

        // Stage 2: Same POS + Diff Category
        const samePosDiffCat = otherItems.filter(i =>
            i.partOfSpeech === currentItem.partOfSpeech &&
            i.category !== currentItem.category
        );

        // Stage 3: Diff POS (Random fallback)
        // This includes items where POS doesn't match, effectively "random others" relative to the constraint
        const diffPos = otherItems.filter(i =>
            i.partOfSpeech !== currentItem.partOfSpeech
        );

        let finalDistractors: FlashcardItem[] = [];

        // 1. Try to fill with Same POS + Same Cat
        const fromStage1 = getRandom(samePosSameCat, 3);
        finalDistractors = [...fromStage1];

        // 2. If needed, fill with Same POS + Diff Cat
        if (finalDistractors.length < 3) {
            const needed = 3 - finalDistractors.length;
            const fromStage2 = getRandom(samePosDiffCat, needed);
            finalDistractors = [...finalDistractors, ...fromStage2];
        }

        // 3. If needed, fill with Diff POS (Random)
        if (finalDistractors.length < 3) {
            const needed = 3 - finalDistractors.length;
            const fromStage3 = getRandom(diffPos, needed);
            finalDistractors = [...finalDistractors, ...fromStage3];
        }

        const distractors = finalDistractors.map(i => i.wordTranslation);

        const allOptions = [currentItem.wordTranslation, ...distractors].sort(() => Math.random() - 0.5);
        setOptions(allOptions);
    }, [quizIndex, currentItem, items]);

    const handleSelect = (option: string) => {
        if (selectedOption) return; // Prevent multiple selections
        setSelectedOption(option);
    };

    const handleNext = () => {
        if (quizIndex < shuffledItems.length - 1) {
            setQuizIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
            onComplete?.();
        }
    };

    const handleRestart = () => {
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        setShuffledItems(shuffled);
        setQuizIndex(0);
        setIsFinished(false);
        setSelectedOption(null);
    };

    if (isFinished) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                    <Brain size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quiz Complete!</h3>
                <button
                    onClick={handleRestart}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Restart Quiz
                </button>
            </div>
        );
    }

    if (!currentItem) return null;

    return (
        <div className="w-full max-w-md flex flex-col gap-6">
            <div className="flex justify-between text-sm text-gray-500 px-1">
                <span>Question {quizIndex + 1} of {shuffledItems.length}</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{currentItem.word}</h3>
                <div className="text-gray-500 dark:text-gray-400 text-sm">Select the correct translation</div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {options.map((option, idx) => {
                    let stateClass = "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700";

                    if (selectedOption) {
                        if (option === currentItem.wordTranslation) {
                            stateClass = "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300";
                        } else if (option === selectedOption) {
                            stateClass = "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300";
                        } else {
                            stateClass = "opacity-50";
                        }
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelect(option)}
                            disabled={!!selectedOption}
                            className={clsx(
                                "p-4 rounded-xl border text-lg font-medium transition-all text-left",
                                stateClass
                            )}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>

            {selectedOption && (
                <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4">
                    <button
                        onClick={handleNext}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        {quizIndex < shuffledItems.length - 1 ? 'Next' : 'Finish'} <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

// --- Matching Mode Components ---

const MatchingView: React.FC<{ items: FlashcardItem[]; onComplete?: () => void }> = ({ items, onComplete }) => {
    const [leftCards, setLeftCards] = useState<{ id: string, matchKey: string, text: string, state: 'idle' | 'selected' | 'matched' }[]>([]);
    const [rightCards, setRightCards] = useState<{ id: string, matchKey: string, text: string, state: 'idle' | 'selected' | 'matched' }[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [selectedRight, setSelectedRight] = useState<string | null>(null);

    const startNewGame = useCallback(() => {
        // Shuffle all items first, then take 6
        const shuffledItems = [...items].sort(() => Math.random() - 0.5);
        const roundItems = shuffledItems.slice(0, 6);

        const left = roundItems.map((i, idx) => ({
            id: `word-${idx}`,
            matchKey: i.word,
            text: i.word,
            state: 'idle' as const
        }));

        const right = roundItems
            .map((i, idx) => ({
                id: `trans-${idx}`,
                matchKey: i.word,
                text: i.wordTranslation,
                state: 'idle' as const
            }))
            .sort(() => Math.random() - 0.5); // Shuffle right side for matching challenge

        setLeftCards(left);
        setRightCards(right);
        setSelectedLeft(null);
        setSelectedRight(null);
    }, [items]);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const handleLeftClick = (id: string) => {
        const card = leftCards.find(c => c.id === id);
        if (!card || card.state === 'matched') return;

        setSelectedLeft(selectedLeft === id ? null : id);

        // If right card is selected, try to match
        if (selectedRight) {
            const leftCard = leftCards.find(c => c.id === id);
            const rightCard = rightCards.find(c => c.id === selectedRight);

            if (leftCard && rightCard && leftCard.matchKey === rightCard.matchKey) {
                // Match!
                setLeftCards(prev => prev.map(c => c.id === id ? { ...c, state: 'matched' } : c));
                setRightCards(prev => prev.map(c => c.id === selectedRight ? { ...c, state: 'matched' } : c));
                setSelectedLeft(null);
                setSelectedRight(null);
            }
        }
    };

    const handleRightClick = (id: string) => {
        const card = rightCards.find(c => c.id === id);
        if (!card || card.state === 'matched') return;

        setSelectedRight(selectedRight === id ? null : id);

        // If left card is selected, try to match
        if (selectedLeft) {
            const leftCard = leftCards.find(c => c.id === selectedLeft);
            const rightCard = rightCards.find(c => c.id === id);

            if (leftCard && rightCard && leftCard.matchKey === rightCard.matchKey) {
                // Match!
                setLeftCards(prev => prev.map(c => c.id === selectedLeft ? { ...c, state: 'matched' } : c));
                setRightCards(prev => prev.map(c => c.id === id ? { ...c, state: 'matched' } : c));
                setSelectedLeft(null);
                setSelectedRight(null);
            }
        }
    };

    const isFinished = leftCards.length > 0 && leftCards.every(c => c.state === 'matched');

    useEffect(() => {
        if (isFinished) {
            onComplete?.();
        }
    }, [isFinished, onComplete]);

    if (isFinished) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Matched!</h3>
                <button
                    onClick={startNewGame}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl">
            <div className="grid grid-cols-2 gap-8">
                {/* Left column - Words */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center mb-4">Words</h4>
                    {leftCards.map(card => (
                        <button
                            key={card.id}
                            onClick={() => handleLeftClick(card.id)}
                            disabled={card.state === 'matched'}
                            className={clsx(
                                "w-full p-4 rounded-xl border text-center font-medium transition-all h-20 flex items-center justify-center",
                                card.state === 'idle' && selectedLeft !== card.id && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300",
                                selectedLeft === card.id && "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 ring-2 ring-blue-200",
                                card.state === 'matched' && "bg-green-50 border-green-200 text-green-700 opacity-50 cursor-default dark:bg-green-900/20 dark:border-green-800"
                            )}
                        >
                            {card.text}
                        </button>
                    ))}
                </div>

                {/* Right column - Translations */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center mb-4">Translations</h4>
                    {rightCards.map(card => (
                        <button
                            key={card.id}
                            onClick={() => handleRightClick(card.id)}
                            disabled={card.state === 'matched'}
                            className={clsx(
                                "w-full p-4 rounded-xl border text-center font-medium transition-all h-20 flex items-center justify-center",
                                card.state === 'idle' && selectedRight !== card.id && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300",
                                selectedRight === card.id && "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 ring-2 ring-blue-200",
                                card.state === 'matched' && "bg-green-50 border-green-200 text-green-700 opacity-50 cursor-default dark:bg-green-900/20 dark:border-green-800"
                            )}
                        >
                            {card.text}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Typing Mode Components ---

const TypingView: React.FC<{
    items: FlashcardItem[];
    currentIndex: number;
    onNext: () => void;
}> = ({ items, currentIndex, onNext }) => {
    const [input, setInput] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const item = items[currentIndex];

    useEffect(() => {
        setInput('');
        setIsCorrect(null);
        setShowAnswer(false);
        // Focus input when moving to next word
        inputRef.current?.focus();
    }, [currentIndex]);

    const handleCheck = (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedInput = input.trim().toLowerCase();
        const normalizedTarget = item.word.trim().toLowerCase();

        if (normalizedInput === normalizedTarget) {
            setIsCorrect(true);
        } else {
            setIsCorrect(false);
        }
    };

    // Helper to render phrase with highlighted word
    const renderPhrase = (text: string) => {
        const parts = text.split(/(\*[^*]+\*)/g);
        return (
            <span>
                {parts.map((part, i) => {
                    if (part.startsWith('*') && part.endsWith('*')) {
                        return <span key={i} className="text-blue-600 dark:text-blue-400 font-bold">{part.slice(1, -1)}</span>;
                    }
                    return part;
                })}
            </span>
        );
    };

    return (
        <div className="w-full max-w-md flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">{item.wordTranslation}</h3>
                {/* Only show phrase if correct */}
                {isCorrect === true && (
                    <div className="animate-in fade-in">
                        <div className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                            {renderPhrase(item.phrase)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.phraseTranslation}
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleCheck} className="flex flex-col gap-4">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type the word..."
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className={clsx(
                        "w-full p-4 rounded-xl border text-lg text-center focus:outline-none focus:ring-2 transition-all",
                        isCorrect === true ? "bg-green-50 border-green-300 text-green-800 focus:ring-green-200" :
                            isCorrect === false ? "bg-red-50 border-red-300 text-red-800 focus:ring-red-200" :
                                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-200"
                    )}
                    autoFocus
                />

                {isCorrect === null && (
                    <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-colors"
                    >
                        Check
                    </button>
                )}

                {isCorrect === false && (
                    <div className="text-center animate-in fade-in slide-in-from-top-2">
                        <div className="text-red-500 font-medium mb-2">Incorrect.</div>
                        <div className="flex gap-2 justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCorrect(null);
                                    setInput('');
                                    inputRef.current?.focus();
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium"
                            >
                                Try Again
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAnswer(true)}
                                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Show Answer
                            </button>
                        </div>
                    </div>
                )}

                {showAnswer && (
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <span className="font-bold text-gray-900 dark:text-white">{item.word}</span>
                    </div>
                )}

                {isCorrect === true && (
                    <button
                        type="button"
                        onClick={() => {
                            onNext();
                            // Focus will be set by useEffect when currentIndex changes
                        }}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 animate-in zoom-in"
                        autoFocus // Focus next button so Enter works
                    >
                        Next <ChevronRight size={20} />
                    </button>
                )}
            </form>
        </div>
    );
};

// --- Speed Mode Components ---

const SpeedView: React.FC<{
    items: FlashcardItem[];
    currentIndex: number;
    onNext: () => void;
    lang: string;
    translationLang?: string;
    voice?: string;
    translationVoice?: string;
}> = ({ items, currentIndex, onNext, lang, translationLang = 'en-US', voice, translationVoice }) => {
    const item = items[currentIndex];
    const [status, setStatus] = useState<'listening' | 'speaking' | 'verifying' | 'correct' | 'incorrect' | 'error_wait'>('listening');
    const [transcript, setTranscript] = useState('');
    const [showAnswer, setShowAnswer] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Auto-play translation audio on mount
    useEffect(() => {
        setStatus('listening');
        setTranscript('');
        setShowAnswer(false);

        const utterance = new SpeechSynthesisUtterance(item.wordTranslation);
        utterance.lang = translationLang; // Use the translation language for TTS
        if (translationVoice) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === translationVoice);
            if (selectedVoice) utterance.voice = selectedVoice;
        } else if (voice) {
            // Fallback to main voice if no translation voice set (though unlikely to match lang)
            // Actually better to not fallback to main voice if lang is different
        }

        utterance.onend = () => {
            startRecognition();
        };
        window.speechSynthesis.speak(utterance);

        return () => {
            window.speechSynthesis.cancel();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, [currentIndex, item, translationLang, translationVoice]);

    const startRecognition = () => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = lang;
                recognition.continuous = false;
                recognition.interimResults = true;

                recognition.onstart = () => setStatus('speaking');

                recognition.onresult = (event: any) => {
                    const current = event.resultIndex;
                    const transcript = event.results[current][0].transcript;
                    setTranscript(transcript);
                    if (event.results[current].isFinal) {
                        verify(transcript);
                    }
                };

                recognition.onerror = () => {
                    setStatus('incorrect');
                };
                recognition.start();
                recognitionRef.current = recognition;
            } else {
                alert('Speech recognition not supported');
            }
        }
    };

    const verify = (spoken: string) => {
        setStatus('verifying');
        const normalizedSpoken = spoken.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
        const normalizedTarget = item.word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

        if (normalizedSpoken === normalizedTarget) {
            setStatus('correct');
            setTimeout(onNext, 1500); // Auto advance
        } else {
            setStatus('incorrect');
        }
    };

    return (
        <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">
            <div className="space-y-4">
                <div className="text-sm text-gray-500 uppercase tracking-wider font-bold">Translate this:</div>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{item.wordTranslation}</h3>
            </div>

            <div className={clsx(
                "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
                status === 'listening' && "bg-gray-100 text-gray-400",
                status === 'speaking' && "bg-red-100 text-red-600 animate-pulse ring-4 ring-red-50",
                status === 'verifying' && "bg-yellow-100 text-yellow-600",
                status === 'correct' && "bg-green-100 text-green-600 scale-110",
                status === 'incorrect' && "bg-red-100 text-red-600"
            )}>
                {status === 'correct' ? <Check size={48} /> :
                    status === 'incorrect' ? <X size={48} /> :
                        <Mic size={48} />}
            </div>

            <div className="h-8 text-lg font-medium text-gray-600 dark:text-gray-300">
                {transcript}
            </div>

            {status === 'incorrect' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center gap-3">
                    <div className="text-red-500 font-medium">Incorrect.</div>

                    {showAnswer && (
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.word}</div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => startRecognition()}
                            className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => setShowAnswer(true)}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                        >
                            Show Answer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
