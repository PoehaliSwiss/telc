import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { useSettings } from '../../context/SettingsContext';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface OrderingProps {
    items: string[];
    options?: string[]; // Optional list of all available words (including distractors)
    alternatives?: string[][]; // Optional list of other correct orders
    direction?: 'vertical' | 'horizontal';
    mode?: 'normal' | 'compact';
}

function SortableItem({ id, text, isCorrect, submitted, direction = 'vertical', mode = 'normal', onClick }: { id: string; text: string; isCorrect?: boolean; submitted: boolean; direction?: 'vertical' | 'horizontal'; mode?: 'normal' | 'compact'; onClick?: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={clsx(
                "rounded-lg border shadow-sm cursor-grab active:cursor-grabbing touch-none transition-colors",
                direction === 'vertical'
                    ? (mode === 'compact' ? "p-2 mb-1 text-sm w-fit" : "p-4 mb-2")
                    : "m-1 inline-block",
                direction === 'horizontal' && (mode === 'compact' ? "px-2 py-1 text-sm" : "px-3 py-2"),
                submitted
                    ? (isCorrect ? "bg-green-50 border-green-500 dark:bg-green-900/20" : "bg-red-50 border-red-500 dark:bg-red-900/20")
                    : "bg-white border-gray-200 hover:border-blue-400 dark:bg-gray-800 dark:border-gray-700"
            )}
        >
            <div className="flex items-center gap-2">
                {direction === 'vertical' && <span className="text-gray-400">:::</span>}
                <span>{text}</span>
            </div>
        </div>
    );
}

export const Ordering: React.FC<OrderingProps> = ({ items: correctOrder, options, alternatives, direction = 'vertical', mode = 'normal' }) => {
    const [items, setItems] = useState<{ id: string; text: string }[]>([]);
    // For horizontal mode (sentence builder):
    const [bankItems, setBankItems] = useState<{ id: string; text: string }[]>([]);
    const [answerItems, setAnswerItems] = useState<{ id: string; text: string }[]>([]);

    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = React.useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    const [submitted, setSubmitted] = useState(false);
    const [showingAnswer, setShowingAnswer] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const initializedRef = React.useRef(false);

    useEffect(() => {
        // Only initialize once on mount
        if (initializedRef.current) return;
        initializedRef.current = true;

        if (direction === 'vertical') {
            const shuffled = correctOrder
                .map((text, idx) => ({ id: `item-${idx}`, text }))
                .sort(() => Math.random() - 0.5);
            setItems(shuffled);
        } else {
            // Use options if provided, otherwise use correctOrder
            const sourceList = options || correctOrder;
            const shuffled = sourceList
                .map((text, idx) => ({ id: `bank-${idx}-${Math.random().toString(36).substr(2, 9)}`, text }))
                .sort(() => Math.random() - 0.5);
            setBankItems(shuffled);
            setAnswerItems([]);
        }
    }, []); // Empty deps - only run once on mount

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const contentId = JSON.stringify(items);
        const exerciseId = generateStableExerciseId(lessonPath, 'Ordering', contentId);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, items, isExerciseComplete]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (direction === 'vertical') {
            if (over && active.id !== over.id) {
                setItems((items) => {
                    const oldIndex = items.findIndex((item) => item.id === active.id);
                    const newIndex = items.findIndex((item) => item.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
        } else {
            // Horizontal mode
            if (!over) {
                // Dropped outside -> remove from answer and return to bank
                const itemToRemove = answerItems.find(i => i.id === active.id);
                if (itemToRemove) {
                    setAnswerItems(prev => prev.filter(i => i.id !== active.id));
                    setBankItems(prev => [...prev, itemToRemove]);
                }
            } else if (active.id !== over.id) {
                // Reordering within answer area
                setAnswerItems((items) => {
                    const oldIndex = items.findIndex((item) => item.id === active.id);
                    const newIndex = items.findIndex((item) => item.id === over.id);
                    if (oldIndex !== -1 && newIndex !== -1) {
                        return arrayMove(items, oldIndex, newIndex);
                    }
                    return items;
                });
            }
        }
    };

    const handleBankClick = (item: { id: string; text: string }) => {
        if (submitted) return;
        setBankItems(prev => prev.filter(i => i.id !== item.id));
        setAnswerItems(prev => [...prev, item]);
    };

    const handleAnswerClick = (item: { id: string; text: string }) => {
        if (submitted) return;
        setAnswerItems(prev => prev.filter(i => i.id !== item.id));
        setBankItems(prev => [...prev, item]);
    };

    const checkAnswers = () => {
        setSubmitted(true);
        setShowingAnswer(false);
    };

    const reset = () => {
        setSubmitted(false);
        setShowingAnswer(false);
        initializedRef.current = false; // Allow re-initialization
        if (direction === 'vertical') {
            const shuffled = correctOrder
                .map((text, idx) => ({ id: `item-${idx}`, text }))
                .sort(() => Math.random() - 0.5);
            setItems(shuffled);
        } else {
            const sourceList = options || correctOrder;
            const shuffled = sourceList
                .map((text, idx) => ({ id: `bank-${idx}-${Math.random().toString(36).substr(2, 9)}`, text }))
                .sort(() => Math.random() - 0.5);
            setBankItems(shuffled);
            setAnswerItems([]);
        }
        initializedRef.current = true; // Mark as initialized again
    };

    const { showHints } = useSettings();

    const handleShowAnswers = () => {
        if (direction === 'vertical') {
            setItems(correctOrder.map((text, idx) => ({ id: `item-${idx}`, text })));
        } else {
            setAnswerItems(correctOrder.map((text, idx) => ({ id: `answer-${idx}`, text })));
            setBankItems([]);
        }
        setShowingAnswer(true);
        setSubmitted(true);
    };

    const currentItems = direction === 'vertical' ? items : answerItems;

    const checkOrder = (itemsToCheck: { text: string }[], targetOrder: string[]) => {
        return itemsToCheck.length === targetOrder.length &&
            itemsToCheck.every((item, idx) => item.text === targetOrder[idx]);
    };

    const isCorrectOrder = checkOrder(currentItems, correctOrder) ||
        (alternatives?.some(alt => checkOrder(currentItems, alt)) ?? false);

    // Check completion
    useEffect(() => {
        if (submitted && isCorrectOrder && exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    }, [submitted, isCorrectOrder, markExerciseComplete, location.pathname]);

    return (
        <div className="my-6 p-6 border border-gray-200 rounded-xl bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700 relative">
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}
            {direction === 'vertical' ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {items.map((item) => (
                                <SortableItem
                                    key={item.id}
                                    id={item.id}
                                    text={item.text}
                                    submitted={submitted}
                                    isCorrect={submitted && isCorrectOrder}
                                    direction="vertical"
                                    mode={mode}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="space-y-6">
                    {/* Answer Area */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={answerItems.map(i => i.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="min-h-[60px] p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-wrap gap-2 items-center">
                                {answerItems.length === 0 && !submitted && (
                                    <span className="text-gray-400 italic">Click words to build the sentence</span>
                                )}
                                {answerItems.map((item) => (
                                    <SortableItem
                                        key={item.id}
                                        id={item.id}
                                        text={item.text}
                                        submitted={submitted}
                                        isCorrect={submitted && isCorrectOrder}
                                        direction="horizontal"
                                        mode={mode}
                                        // We need to pass onClick to SortableItem for horizontal mode removal
                                        onClick={() => handleAnswerClick(item)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Word Bank */}
                    {!submitted && (
                        <div className="flex flex-wrap gap-2">
                            {bankItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleBankClick(item)}
                                    className={clsx(
                                        "rounded-lg border shadow-sm hover:border-blue-400 hover:shadow-md transition-all dark:bg-gray-800 dark:border-gray-700 bg-white",
                                        mode === 'compact' ? "px-2 py-1 text-sm" : "px-3 py-2"
                                    )}
                                >
                                    {item.text}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-6 flex gap-4 items-center">
                {!submitted ? (
                    <>
                        <button
                            onClick={checkAnswers}
                            disabled={direction === 'horizontal' && answerItems.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-transparent"
                        >
                            Check
                        </button>
                        {showHints && (
                            <button
                                onClick={handleShowAnswers}
                                className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30 rounded-lg transition-colors font-medium"
                            >
                                Show answers
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <div className={clsx(
                            "px-4 py-2 rounded-lg font-medium",
                            isCorrectOrder || showingAnswer
                                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                        )}>
                            {isCorrectOrder || showingAnswer ? "✓ Correct!" : "✗ Incorrect"}
                        </div>
                        <button
                            onClick={reset}
                            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
                        >
                            Try again
                        </button>
                        {showHints && (
                            <button
                                onClick={handleShowAnswers}
                                className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30 rounded-lg transition-colors font-medium"
                            >
                                Show answers
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
