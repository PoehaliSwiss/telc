import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { useSettings } from '../../context/SettingsContext';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface MatchingProps {
    pairs: { left: string; right: string }[];
    direction?: 'left' | 'right';
}

// Draggable Item (Left side)
function DraggableItem({ id, text, isDropped, className }: { id: string; text: string; isDropped: boolean; className?: string }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined;

    if (isDropped) {
        return null; // Hide if dropped (only for the list view)
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing",
                className || "p-4 mb-2"
            )}
        >
            {text}
        </div>
    );
}

// DroppableZone
function DroppableZone({ id, text, currentItem, matchedId, direction }: { id: string; text: string; currentItem?: string; matchedId?: string; direction: 'left' | 'right' }) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "p-4 border-2 rounded-lg mb-2 transition-colors min-h-[80px] flex items-center justify-between gap-4",
                isOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50",
                direction === 'left' ? "flex-row-reverse text-left" : "flex-row text-right"
            )}
        >
            <div className={clsx(
                "min-w-[150px] min-h-[50px] flex items-center justify-center rounded border border-dashed",
                matchedId ? "border-transparent" : "border-gray-300 dark:border-gray-600"
            )}>
                {matchedId && currentItem ? (
                    <DraggableItem
                        id={matchedId}
                        text={currentItem}
                        isDropped={false}
                        className="w-full py-2 px-4 text-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                    />
                ) : (
                    <span className="text-sm text-gray-400">Drop here</span>
                )}
            </div>
            <span className={clsx(
                "flex-1 font-medium text-gray-700 dark:text-gray-300",
                direction === 'left' ? "text-left" : "text-right"
            )}>{text}</span>
        </div>
    );
}

export const Matching: React.FC<MatchingProps> = ({ pairs, direction = 'right' }) => {
    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = React.useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    const [draggableItems, setDraggableItems] = useState<{ id: string; text: string; originalIndex: number }[]>([]);
    const [matches, setMatches] = useState<{ [key: string]: string }>({}); // targetId -> draggableId
    const [submitted, setSubmitted] = useState(false);
    const [selected, setSelected] = useState<{ id: string; type: 'draggable' | 'target' } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        const source = direction === 'right'
            ? pairs.map((p, i) => ({ text: p.left, index: i }))
            : pairs.map((p, i) => ({ text: p.right, index: i }));

        const items = source.map((item) => ({
            id: `drag-${item.index}`,
            text: item.text,
            originalIndex: item.index
        }));

        setDraggableItems(items.sort(() => Math.random() - 0.5));
    }, [pairs, direction]);

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const contentId = JSON.stringify(pairs);
        const exerciseId = generateStableExerciseId(lessonPath, 'Matching', contentId);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, pairs, isExerciseComplete]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over) {
            setMatches(prev => {
                const newMatches = { ...prev };
                // Remove if already matched elsewhere
                const prevKey = Object.keys(newMatches).find(k => newMatches[k] === active.id);
                if (prevKey) delete newMatches[prevKey];

                newMatches[over.id as string] = active.id as string;
                return newMatches;
            });
        }
        setSelected(null);
    };

    const handleItemClick = (id: string, type: 'draggable' | 'target') => {
        if (submitted) return;

        if (!selected) {
            setSelected({ id, type });
            return;
        }

        if (selected.id === id) {
            setSelected(null); // Deselect
            return;
        }

        if (selected.type === type) {
            setSelected({ id, type }); // Switch selection
            return;
        }

        // Attempt match
        const draggableId = type === 'draggable' ? id : selected.id;
        const targetId = type === 'target' ? id : selected.id;

        setMatches(prev => {
            const newMatches = { ...prev };
            // Remove if already matched elsewhere
            const prevKey = Object.keys(newMatches).find(k => newMatches[k] === draggableId);
            if (prevKey) delete newMatches[prevKey];

            newMatches[targetId] = draggableId;
            return newMatches;
        });
        setSelected(null);
    };

    const checkAnswers = () => {
        setSubmitted(true);
        setSelected(null);
    };

    const reset = () => {
        setSubmitted(false);
        setMatches({});
        setSelected(null);
        const source = direction === 'right'
            ? pairs.map((p, i) => ({ text: p.left, index: i }))
            : pairs.map((p, i) => ({ text: p.right, index: i }));

        const items = source.map((item) => ({
            id: `drag-${item.index}`,
            text: item.text,
            originalIndex: item.index
        }));
        setDraggableItems(items.sort(() => Math.random() - 0.5));
    };

    const { showHints } = useSettings();

    const handleShowAnswers = () => {
        const correctMatches: { [key: string]: string } = {};
        pairs.forEach((_, idx) => {
            correctMatches[`target-${idx}`] = `drag-${idx}`;
        });
        setMatches(correctMatches);
        setSubmitted(true);
        setSelected(null);
    };

    const isCorrect = (targetIndex: number) => {
        const targetId = `target-${targetIndex}`;
        const draggableId = matches[targetId];
        if (!draggableId) return false;

        const draggableIndex = parseInt(draggableId.split('-')[1]);

        if (direction === 'right') {
            return pairs[draggableIndex].right === pairs[targetIndex].right;
        } else {
            return pairs[draggableIndex].left === pairs[targetIndex].left;
        }
    };

    const allCorrect = pairs.every((_, i) => isCorrect(i));

    // Check completion
    useEffect(() => {
        if (submitted && allCorrect && exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    }, [submitted, allCorrect, markExerciseComplete, location.pathname]);

    // Filter out matched items for the main view
    const visibleDraggables = draggableItems.filter(item => !Object.values(matches).includes(item.id));
    const visibleTargets = pairs.map((_, i) => i).filter(i => !matches[`target-${i}`]);

    const draggablesColumn = (
        <div className="space-y-2">
            <h3 className="font-medium mb-4 text-gray-500 dark:text-gray-400">Options</h3>
            {visibleDraggables.map(item => (
                <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id, 'draggable')}
                    className={clsx(
                        "transition-all duration-200",
                        selected?.id === item.id ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 rounded-lg" : ""
                    )}
                >
                    <DraggableItem id={item.id} text={item.text} isDropped={false} />
                </div>
            ))}
            {visibleDraggables.length === 0 && (
                <div className="text-center text-gray-400 py-8 italic">All options placed</div>
            )}
        </div>
    );

    const targetsColumn = (
        <div className="space-y-2">
            <h3 className="font-medium mb-4 text-gray-500 dark:text-gray-400">
                {direction === 'right' ? "Definitions" : "Tasks"}
            </h3>
            {pairs.map((pair, idx) => {
                const targetId = `target-${idx}`;
                // Only show if NOT matched
                if (matches[targetId]) return null;

                const targetText = direction === 'right' ? pair.right : pair.left;

                return (
                    <div
                        key={targetId}
                        onClick={() => handleItemClick(targetId, 'target')}
                        className={clsx(
                            "cursor-pointer transition-all duration-200",
                            selected?.id === targetId ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 rounded-lg" : ""
                        )}
                    >
                        <DroppableZone
                            id={targetId}
                            text={targetText}
                            currentItem={undefined} // Always empty in main list
                            matchedId={undefined}
                            direction={direction}
                        />
                    </div>
                );
            })}
            {visibleTargets.length === 0 && (
                <div className="text-center text-gray-400 py-8 italic">All tasks completed</div>
            )}
        </div>
    );

    const matchedPairsList = (
        <div className="mt-8 space-y-2">
            <h3 className="font-medium mb-4 text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                Completed pairs
            </h3>
            <div className="grid grid-cols-1 gap-2">
                {Object.entries(matches).map(([targetId, draggableId]) => {
                    const targetIndex = parseInt(targetId.split('-')[1]);
                    const draggableIndex = parseInt(draggableId.split('-')[1]);

                    const targetText = direction === 'right' ? pairs[targetIndex].right : pairs[targetIndex].left;
                    const draggableText = direction === 'right' ? pairs[draggableIndex].left : pairs[draggableIndex].right;

                    const correct = submitted && isCorrect(targetIndex);
                    const wrong = submitted && !correct;

                    return (
                        <div key={targetId} className={clsx(
                            "flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700",
                            correct && "border-green-200 bg-green-50 dark:bg-green-900/20",
                            wrong && "border-red-200 bg-red-50 dark:bg-red-900/20"
                        )}>
                            <div className="flex items-center gap-4 flex-1">
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {direction === 'right' ? draggableText : targetText}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300">
                                    {direction === 'right' ? targetText : draggableText}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {submitted && (
                                    <>
                                        {correct && <span className="text-green-500">✓</span>}
                                        {wrong && <span className="text-red-500">✗</span>}
                                    </>
                                )}
                                {!submitted && (
                                    <button
                                        onClick={() => {
                                            setMatches(prev => {
                                                const next = { ...prev };
                                                delete next[targetId];
                                                return next;
                                            });
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Remove pair"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="my-6 p-6 border border-gray-200 rounded-xl bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700 relative">
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {direction === 'left' ? (
                        <>
                            {targetsColumn}
                            {draggablesColumn}
                        </>
                    ) : (
                        <>
                            {draggablesColumn}
                            {targetsColumn}
                        </>
                    )}
                </div>
            </DndContext>

            {Object.keys(matches).length > 0 && matchedPairsList}

            <div className="mt-8 flex gap-4 items-center">
                {!submitted ? (
                    <>
                        <button
                            onClick={checkAnswers}
                            disabled={Object.keys(matches).length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        <button
                            onClick={reset}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-white transition-colors"
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
                        <span className={clsx(
                            "font-medium",
                            allCorrect ? "text-green-600" : "text-red-600"
                        )}>
                            {allCorrect ? "Correct! 🎉" : "There are errors"}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};
