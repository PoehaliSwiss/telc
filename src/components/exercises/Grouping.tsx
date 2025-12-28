import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { useSettings } from '../../context/SettingsContext';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface GroupingProps {
    groups: { [groupName: string]: string[] };
}

// Draggable Item
function DraggableItem({ id, text, className, disabled }: { id: string; text: string; className?: string; disabled?: boolean }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id, disabled });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "inline-block px-3 py-1.5 m-1 border rounded-full shadow-sm cursor-grab active:cursor-grabbing",
                className || "bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600",
                disabled && "cursor-default"
            )}
        >
            {text}
        </div>
    );
}

// Group Container
// Group Container
function GroupContainer({ id, title, items, isOver, submitted, correctItems, onItemClick }: { id: string; title: string; items: { id: string; text: string }[]; isOver: boolean; submitted: boolean; correctItems: string[]; onItemClick?: (id: string) => void }) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex-1 min-w-[200px] p-4 rounded-xl border-2 transition-colors min-h-[200px]",
                isOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
            )}
        >
            <h3 className="font-bold mb-4 text-center text-gray-700 dark:text-gray-300">{title}</h3>
            <div className="flex flex-wrap gap-2 content-start">
                {items.map(item => {
                    const isCorrect = submitted && correctItems.includes(item.text);
                    const isWrong = submitted && !isCorrect;

                    return (
                        <div key={item.id} onClick={(e) => {
                            e.stopPropagation(); // Prevent group click
                            onItemClick?.(item.id);
                        }}>
                            <DraggableItem
                                id={item.id}
                                text={item.text}
                                disabled={submitted}
                                className={clsx(
                                    isCorrect ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-200" :
                                        isWrong ? "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-200" :
                                            "bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                                )}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const Grouping: React.FC<GroupingProps> = ({ groups }) => {
    const [items, setItems] = useState<{ id: string; text: string }[]>([]);
    const [placements, setPlacements] = useState<{ [itemId: string]: string }>({}); // itemId -> groupId
    const [submitted, setSubmitted] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const { showHints } = useSettings();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = React.useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        const allItems: { id: string; text: string }[] = [];
        Object.values(groups).flat().forEach((text, i) => {
            allItems.push({ id: `item-${i}-${text}`, text });
        });
        setItems(allItems.sort(() => Math.random() - 0.5));
    }, [groups]);

    // Generate exercise ID
    useEffect(() => {
        const lessonPath = location.pathname;
        const contentId = JSON.stringify(groups);
        const exerciseId = generateStableExerciseId(lessonPath, 'Grouping', contentId);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, groups, isExerciseComplete]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over) {
            setPlacements(prev => ({
                ...prev,
                [active.id as string]: over.id as string
            }));
        } else {
            // If dropped outside, remove from group (return to bank)
            setPlacements(prev => {
                const next = { ...prev };
                delete next[active.id as string];
                return next;
            });
        }
        setSelectedId(null);
    };

    const handleItemClick = (id: string) => {
        if (submitted) return;
        setSelectedId(prev => prev === id ? null : id);
    };

    const handleGroupClick = (groupId: string) => {
        if (submitted || !selectedId) return;

        setPlacements(prev => ({
            ...prev,
            [selectedId]: groupId
        }));
        setSelectedId(null);
    };

    const handleMoveToGroup = (itemId: string, groupId: string) => {
        setPlacements(prev => ({
            ...prev,
            [itemId]: groupId
        }));
        setSelectedId(null);
    };

    const handleReturnToBank = (itemId: string) => {
        setPlacements(prev => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
        setSelectedId(null);
    };

    const checkAnswers = () => {
        setSubmitted(true);
        setShowAnswers(false);
        setSelectedId(null);
    };

    const reset = () => {
        setSubmitted(false);
        setShowAnswers(false);
        setPlacements({});
        setSelectedId(null);
        setItems(prev => [...prev].sort(() => Math.random() - 0.5));
    };

    const handleShowAnswers = () => {
        setShowAnswers(true);
        setSubmitted(true);
        setSelectedId(null);

        const newPlacements: { [itemId: string]: string } = {};
        items.forEach(item => {
            // Find which group this item belongs to
            const groupName = Object.keys(groups).find(g => groups[g].includes(item.text));
            if (groupName) {
                newPlacements[item.id] = groupName;
            }
        });
        setPlacements(newPlacements);
    };

    const unplacedItems = items.filter(item => !placements[item.id]);

    const isAllCorrect = items.every(item => {
        const groupId = placements[item.id];
        if (!groupId) return false;
        return groups[groupId].includes(item.text);
    });

    // Check completion
    useEffect(() => {
        if (submitted && isAllCorrect && exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    }, [submitted, isAllCorrect, markExerciseComplete, location.pathname]);

    return (
        <div className="my-6 p-6 border border-gray-200 rounded-xl bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700 relative">
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>

                {/* Bank of items */}
                {!submitted && !showAnswers && (
                    <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg min-h-[60px] flex flex-wrap gap-2">
                        {unplacedItems.length === 0 ? (
                            <span className="text-gray-400 italic w-full text-center">All items placed</span>
                        ) : (
                            unplacedItems.map(item => (
                                <div key={item.id} className="relative group">
                                    <div onClick={() => handleItemClick(item.id)}>
                                        <DraggableItem
                                            id={item.id}
                                            text={item.text}
                                            className={selectedId === item.id ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : ""}
                                        />
                                    </div>
                                    {/* Move to Menu */}
                                    {selectedId === item.id && (
                                        <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 min-w-[150px]">
                                            <div className="text-xs font-semibold text-gray-500 mb-2 px-2">Move to:</div>
                                            {Object.keys(groups).map(groupName => (
                                                <button
                                                    key={groupName}
                                                    onClick={() => handleMoveToGroup(item.id, groupName)}
                                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300"
                                                >
                                                    {groupName}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Groups */}
                <div className="flex flex-wrap gap-4">
                    {Object.keys(groups).map(groupName => {
                        const groupItems = items.filter(item => placements[item.id] === groupName);
                        return (
                            <div
                                key={groupName}
                                className="flex-1 min-w-[200px]"
                                onClick={() => handleGroupClick(groupName)}
                            >
                                <GroupContainer
                                    id={groupName}
                                    title={groupName}
                                    items={groupItems}
                                    isOver={selectedId !== null} // Visual hint that it's a target
                                    submitted={submitted}
                                    correctItems={groups[groupName]}
                                    onItemClick={handleReturnToBank}
                                />
                                {/* Render items inside group with click handlers to remove/move */}
                                <div className="hidden">
                                    {/* This is a hack to keep using the existing GroupContainer structure but we need to inject the click handler for items inside. 
                                        Actually, GroupContainer renders the items. We need to pass the click handler down or wrap them.
                                        Let's modify GroupContainer to accept an onItemClick prop.
                                    */}
                                </div>
                            </div>
                        );
                    })}
                </div>

            </DndContext>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
                {!submitted ? (
                    <>
                        <button
                            onClick={checkAnswers}
                            disabled={unplacedItems.length > 0}
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
                        {!showAnswers && showHints && (
                            <button
                                onClick={handleShowAnswers}
                                className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30 rounded-lg transition-colors font-medium"
                            >
                                Show answers
                            </button>
                        )}
                        <span className={clsx(
                            "font-medium ml-auto",
                            isAllCorrect ? "text-green-600" : "text-red-600"
                        )}>
                            {isAllCorrect ? "Correct! 🎉" : "There are errors"}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};
