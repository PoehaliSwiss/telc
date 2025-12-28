import React, { useState, useEffect, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface Slot {
    id: string;
    x: number;        // Percentage (0-100)
    y: number;        // Percentage (0-100)
    answer: string;   // Correct word
}

interface ImageLabelingProps {
    image: string;
    slots: Slot[];
    words: string[];
    mode?: 'normal' | 'compact';
    onResolvePath?: (path: string) => string;
}

function DraggableWord({ id, text, isUsed }: { id: string; text: string; isUsed: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        disabled: isUsed
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : isUsed ? 0.3 : 1,
        zIndex: isDragging ? 1000 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={clsx(
                "px-4 py-2 rounded-lg border-2 shadow-sm transition-all",
                isUsed
                    ? "bg-gray-100 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:border-gray-600"
                    : "bg-white border-blue-400 cursor-grab active:cursor-grabbing hover:shadow-md dark:bg-gray-700 dark:border-blue-500"
            )}
        >
            {text}
        </div>
    );
}

function DroppableSlot({
    slot,
    value,
    submitted,
    onSlotClick,
    onSelectWord,
    availableWords,
    mode = 'normal'
}: {
    slot: Slot;
    value: string | undefined;
    submitted: boolean;
    onSlotClick: () => void;
    onSelectWord: (word: string) => void;
    availableWords: string[];
    mode?: 'normal' | 'compact';
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: slot.id,
    });

    const [showWordPicker, setShowWordPicker] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const slotRef = useRef<HTMLDivElement>(null);
    const isSlotCorrect = submitted && value === slot.answer;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!submitted && !value && availableWords.length > 0) {
            // Calculate dropdown position
            if (slotRef.current) {
                const rect = slotRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom + 8,
                    left: rect.left + rect.width / 2
                });
            }
            setShowWordPicker(!showWordPicker);
        } else if (!submitted) {
            onSlotClick();
        }
    };

    const slotSize = mode === 'compact' ? 'min-w-[60px] min-h-[60px]' : 'min-w-[80px] min-h-[80px]';
    const fontSize = mode === 'compact' ? 'text-xs' : 'text-sm';

    return (
        <>
            <div
                ref={(node) => {
                    setNodeRef(node);
                    if (node) {
                        (slotRef as any).current = node;
                    }
                }}
                onClick={handleClick}
                className={clsx(
                    "absolute flex items-center justify-center rounded-full border-4 cursor-pointer transition-all p-2",
                    slotSize,
                    isOver && !value && "ring-4 ring-blue-300 scale-110",
                    value
                        ? submitted
                            ? isSlotCorrect
                                ? "bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400"
                                : "bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-400"
                            : "bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400"
                        : "bg-white/80 border-gray-400 border-dashed hover:border-blue-400 dark:bg-gray-800/80 dark:border-gray-500"
                )}
                style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                {value && (
                    <span className={clsx("font-medium text-center px-2", fontSize)}>
                        {value}
                    </span>
                )}
            </div>

            {/* Word picker dropdown - rendered outside with fixed positioning */}
            {showWordPicker && !submitted && availableWords.length > 0 && (
                <div
                    className="fixed bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-xl min-w-[150px] pointer-events-auto -translate-x-1/2"
                    style={{
                        zIndex: 9999,
                        top: `${dropdownPos.top}px`,
                        left: `${dropdownPos.left}px`
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                        <div className="text-xs text-gray-500 px-2 py-1">Select word:</div>
                        {availableWords.map(word => (
                            <button
                                key={word}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectWord(word);
                                    setShowWordPicker(false);
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-sm"
                            >
                                {word}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

export const ImageLabeling: React.FC<ImageLabelingProps> = ({ image, slots, words, mode = 'normal', onResolvePath }) => {
    const [slotValues, setSlotValues] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Resolve image path
    const resolvedImage = React.useMemo(() => {
        if (image && (image.startsWith('public/') || image.startsWith('/public/'))) {
            const path = image.startsWith('/') ? image.slice(1) : image;

            if (onResolvePath) {
                return onResolvePath(path);
            }

            // Runtime/Production resolution for Reader
            const relativePath = path.replace(/^public\//, '');
            const baseUrl = import.meta.env.BASE_URL || '/';
            return `${baseUrl}${relativePath}`.replace(/\/+/g, '/');
        }
        return image;
    }, [image, onResolvePath]);

    useEffect(() => {
        const lessonPath = location.pathname;
        const exerciseId = generateStableExerciseId(
            lessonPath,
            'ImageLabeling',
            JSON.stringify({ image, slots: slots.map(s => s.answer) })
        );
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, image, slots, isExerciseComplete]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const word = active.id as string;
        const slotId = over.id as string;

        const targetSlot = slots.find(s => s.id === slotId);
        if (targetSlot) {
            setSlotValues(prev => ({
                ...prev,
                [slotId]: word
            }));
        }
    };

    const handleSlotClick = (slotId: string) => {
        if (submitted) return;
        setSlotValues(prev => {
            const newValues = { ...prev };
            delete newValues[slotId];
            return newValues;
        });
    };

    const handleSelectWord = (slotId: string, word: string) => {
        if (submitted) return;
        setSlotValues(prev => ({
            ...prev,
            [slotId]: word
        }));
    };

    const checkAnswers = () => {
        setSubmitted(true);
        const allCorrect = slots.every(slot => slotValues[slot.id] === slot.answer);

        if (allCorrect && exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    };

    const reset = () => {
        setSubmitted(false);
        setSlotValues({});
    };

    const usedWords = new Set(Object.values(slotValues));
    const availableWords = words.filter(w => !usedWords.has(w));
    const allSlotsFilled = slots.every(slot => slotValues[slot.id]);
    const isCorrect = submitted && slots.every(slot => slotValues[slot.id] === slot.answer);

    return (
        <div className="my-6 p-6 border border-gray-200 rounded-xl bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700 relative">
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="relative mb-6 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <img
                        src={resolvedImage}
                        alt="Labeling exercise"
                        className="w-full h-auto"
                        draggable={false}
                    />

                    {slots.map(slot => (
                        <DroppableSlot
                            key={slot.id}
                            slot={slot}
                            value={slotValues[slot.id]}
                            submitted={submitted}
                            onSlotClick={() => handleSlotClick(slot.id)}
                            onSelectWord={(word) => handleSelectWord(slot.id, word)}
                            availableWords={availableWords}
                            mode={mode}
                        />
                    ))}
                </div>

                <SortableContext items={words} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        {words.map(word => (
                            <DraggableWord
                                key={word}
                                id={word}
                                text={word}
                                isUsed={usedWords.has(word)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <div className="mt-6 flex gap-4 items-center">
                {!submitted ? (
                    <button
                        onClick={checkAnswers}
                        disabled={!allSlotsFilled}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        Check
                    </button>
                ) : (
                    <>
                        <div className={clsx(
                            "px-4 py-2 rounded-lg font-medium",
                            isCorrect
                                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                        )}>
                            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                        </div>
                        <button
                            onClick={reset}
                            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                            Try again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
