import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useSettings } from '../../context/SettingsContext';
import { useBlanks, getTextFromChildren, type BlankData, type BlankStatus } from './hooks/useBlanks';
import { useProgress } from '../../context/ProgressContext';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { generateStableExerciseId } from '../../utils/exerciseId';

interface FillBlanksProps {
    children: React.ReactNode; // Text with {answer} or [answer]
    mode?: 'input' | 'drag' | 'picker';
    options?: string[]; // For drag mode, distractors can be added here
    showItemHints?: boolean; // Enable individual hints (bulb icon)
}

// Draggable Item
function DraggableWord({ id, text, disabled, className }: { id: string; text: string; disabled?: boolean; className?: string }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id, disabled });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined;

    return (
        <span
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "inline-block px-2 py-1 m-1 border rounded cursor-grab active:cursor-grabbing",
                disabled ? "cursor-default bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600" : "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700",
                className
            )}
        >
            {text}
        </span>
    );
}

// Drop Zone
function DropZone({ id, current, text, disabled }: { id: string; current?: string; text?: string; disabled?: boolean }) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <span
            ref={setNodeRef}
            className={clsx(
                "inline-block min-w-[80px] min-h-[30px] mx-1 border-b-2 transition-colors align-bottom text-center",
                isOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600",
                current ? "" : "text-gray-400"
            )}
        >
            {current && text ? (
                <DraggableWord id={current} text={text} disabled={disabled} />
            ) : "?"}
        </span>
    );
}

// Context to pass data to markdown components without re-creating them
const BlanksContext = React.createContext<{
    blanksData: BlankData[];
    inputs: string[];
    touched: boolean[];
    blurred: boolean[];
    handleBlur: (index: number) => void;
    submitted: boolean;
    renderBlank: (index: number, data: BlankData, status: BlankStatus) => React.ReactNode;
} | null>(null);

// Component to render a blank within markdown
const MarkdownBlank = ({ indexStr }: { indexStr: string }) => {
    const context = React.useContext(BlanksContext);
    if (!context) return null;

    const { blanksData, inputs, touched, blurred, submitted, renderBlank } = context;
    const index = parseInt(indexStr);
    const data = blanksData[index];
    if (!data) return null;

    const value = inputs[index] || '';
    const isCorrect = value.trim().toLowerCase() === data.answer.toLowerCase();
    const showValidation = submitted;
    const isPartialMatch = value.trim().length > 0 && data.answer.toLowerCase().startsWith(value.trim().toLowerCase());

    const status = {
        value,
        isCorrect,
        isWrong: showValidation && !isCorrect && (submitted || (!isPartialMatch || blurred[index])),
        touched: touched[index],
        showValidation
    };
    return <>{renderBlank(index, data, status)}</>;
};

// Stable components object
const markdownComponents = {
    span: (props: any) => {
        const indexStr = props['data-blank'];
        if (indexStr !== undefined) {
            return <MarkdownBlank indexStr={indexStr} />;
        }
        return <span {...props} />;
    }
};


export const FillBlanks: React.FC<FillBlanksProps> = ({ children, mode = 'input', options = [], showItemHints = false }) => {
    const { markExerciseComplete, isExerciseComplete } = useProgress();
    const location = useLocation();
    const exerciseIdRef = useRef<string>('');
    const [isCompleted, setIsCompleted] = useState(false);

    // Generate exercise ID on mount
    useEffect(() => {
        const lessonPath = location.pathname;
        const childrenText = getTextFromChildren(children);
        const exerciseId = generateStableExerciseId(lessonPath, 'FillBlanks', childrenText);
        exerciseIdRef.current = exerciseId;
        setIsCompleted(isExerciseComplete(exerciseId));
    }, [location.pathname, children, isExerciseComplete]);
    // Pre-process children: dedent if string to ensure markdown tables work
    const contentToProcess = useMemo(() => {
        // Convert children to string first (MDX may pass as array)
        const text = getTextFromChildren(children);

        if (text.includes('|') || text.includes('\n')) {
            const lines = text.split('\n');
            const minIndent = lines.reduce((min, line) => {
                if (line.trim().length === 0) return min;
                const indent = line.match(/^\s*/)?.[0].length || 0;
                return Math.min(min, indent);
            }, Infinity);

            if (minIndent !== Infinity && minIndent > 0) {
                return lines.map(line => line.length >= minIndent ? line.slice(minIndent) : line).join('\n');
            }
            return text;
        }
        return children;
    }, [children]);

    const {
        blanksData,
        answers,
        inputs,
        handleInputChange,
        handleBlur,
        touched,
        blurred,
        submitted,
        checkAnswers: hookCheckAnswers,
        reset: hookReset,
        revealAnswer,
        showAllAnswers,
        renderContent,
        allCorrect: inputsAllCorrect,
        setSubmitted
    } = useBlanks({ children: contentToProcess, mode: mode === 'drag' ? 'input' : mode, options });

    const { showHints } = useSettings();

    // --- Drag and Drop Logic ---
    // Generate unique IDs for all items (answers + options)
    const [allItems] = useState<{ id: string; text: string }[]>(() => {
        const getFreq = (arr: string[]) => {
            const map = new Map<string, number>();
            arr.forEach(t => map.set(t, (map.get(t) || 0) + 1));
            return map;
        };

        const ansFreq = getFreq(answers);
        const optFreq = getFreq(options);
        const allKeys = new Set([...ansFreq.keys(), ...optFreq.keys()]);

        const merged: string[] = [];
        allKeys.forEach(key => {
            const count = Math.max(ansFreq.get(key) || 0, optFreq.get(key) || 0);
            for (let i = 0; i < count; i++) merged.push(key);
        });

        return merged.map((t, i) => ({ id: `item-${i}-${Math.random().toString(36).substr(2, 9)}`, text: t }));
    });

    // dragItems stores IDs of items currently in the bank
    const [dragItems, setDragItems] = useState<string[]>(() =>
        allItems.map(i => i.id).sort(() => Math.random() - 0.5)
    );

    // droppedItems maps dropZoneId -> itemId
    const [droppedItems, setDroppedItems] = useState<{ [key: string]: string }>({});

    // Selection state for click interaction
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeDropMenu, setActiveDropMenu] = useState<string | null>(null); // dropZoneId

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeId = active.id as string;

        // Determine if the active item came from the bank or a drop zone
        const sourceDropZoneId = Object.keys(droppedItems).find(key => droppedItems[key] === activeId);
        const isFromBank = dragItems.includes(activeId);

        if (over) {
            const targetDropZoneId = over.id as string;

            // If dropping on same zone, do nothing
            if (sourceDropZoneId === targetDropZoneId) return;

            // Get the item currently in the target drop zone, if any
            const itemInTargetZone = droppedItems[targetDropZoneId];

            setDroppedItems(prevDropped => {
                const newDropped = { ...prevDropped };
                newDropped[targetDropZoneId] = activeId;
                if (sourceDropZoneId) {
                    delete newDropped[sourceDropZoneId];
                }
                return newDropped;
            });

            setDragItems(prevDragItems => {
                let newDragItems = [...prevDragItems];
                if (isFromBank) {
                    newDragItems = newDragItems.filter(item => item !== activeId);
                }
                if (itemInTargetZone) {
                    newDragItems.push(itemInTargetZone);
                }
                return newDragItems;
            });

        } else {
            // Dropped outside (back to bank)
            if (sourceDropZoneId) {
                setDroppedItems(prevDropped => {
                    const newDropped = { ...prevDropped };
                    delete newDropped[sourceDropZoneId];
                    return newDropped;
                });
                setDragItems(prevDragItems => [...prevDragItems, activeId]);
            }
        }
        setSelectedId(null);
    };

    const handleWordClick = (id: string) => {
        if (submitted) return;
        setSelectedId(prev => prev === id ? null : id);
        setActiveDropMenu(null);
    };

    const handleDropZoneClick = (dropId: string) => {
        if (submitted) return;

        const currentItemId = droppedItems[dropId];

        // Case 1: Word selected -> Fill blank
        if (selectedId) {
            if (currentItemId === selectedId) {
                setSelectedId(null);
                return;
            }

            const sourceDropZoneId = Object.keys(droppedItems).find(key => droppedItems[key] === selectedId);
            const isFromBank = dragItems.includes(selectedId);

            setDroppedItems(prev => {
                const next = { ...prev };
                next[dropId] = selectedId;
                if (sourceDropZoneId) delete next[sourceDropZoneId];
                return next;
            });

            setDragItems(prev => {
                let next = [...prev];
                if (isFromBank) next = next.filter(id => id !== selectedId);
                if (currentItemId) next.push(currentItemId);
                return next;
            });

            setSelectedId(null);
            return;
        }

        // Case 2: Blank filled -> Return to bank
        if (currentItemId) {
            setDroppedItems(prev => {
                const next = { ...prev };
                delete next[dropId];
                return next;
            });
            setDragItems(prev => [...prev, currentItemId]);
            return;
        }

        // Case 3: Blank empty -> Show menu
        setActiveDropMenu(prev => prev === dropId ? null : dropId);
    };

    const handleMenuOptionClick = (dropId: string, itemId: string) => {
        setDroppedItems(prev => ({ ...prev, [dropId]: itemId }));
        setDragItems(prev => prev.filter(id => id !== itemId));
        setActiveDropMenu(null);
    };

    const handleShowAnswers = () => {
        showAllAnswers(); // Sets submitted=true and inputs=answers

        if (mode === 'drag') {
            // Fill drops with correct items
            const newDropped: { [key: string]: string } = {};
            const usedItemIds = new Set<string>();

            answers.forEach((ans, idx) => {
                const item = allItems.find(i => i.text === ans && !usedItemIds.has(i.id));
                if (item) {
                    newDropped[`drop-${idx}`] = item.id;
                    usedItemIds.add(item.id);
                }
            });

            setDroppedItems(newDropped);
            setDragItems(allItems.filter(i => !usedItemIds.has(i.id)).map(i => i.id));
        }
    };

    const checkAnswers = () => {
        hookCheckAnswers();
        // DnD validation happens in render or calculation below

        // Check if all correct and mark as complete
        if (allCorrect && exerciseIdRef.current) {
            markExerciseComplete(exerciseIdRef.current, location.pathname);
            setIsCompleted(true);
        }
    };

    const reset = () => {
        hookReset();
        setDroppedItems({});
        setDragItems(allItems.map(i => i.id).sort(() => Math.random() - 0.5));
        setSelectedId(null);
        setActiveDropMenu(null);
    };

    // Helper to look up text
    const getItemText = (id: string) => allItems.find(i => i.id === id)?.text || '';

    const allCorrect = (mode === 'input' || mode === 'picker')
        ? inputsAllCorrect
        : answers.every((ans, idx) => {
            const droppedId = droppedItems[`drop-${idx}`];
            return droppedId && getItemText(droppedId) === ans;
        });

    const renderBlank = useCallback((index: number, data: BlankData, status: BlankStatus) => {
        const { value } = status;
        const { answer, localOptions } = data;

        // Strict validation: only show if submitted
        const isCorrectRaw = value.trim().toLowerCase() === data.answer.toLowerCase();
        const shouldShowValidation = submitted;

        const isCorrect = shouldShowValidation && isCorrectRaw;
        const isWrong = shouldShowValidation && !isCorrectRaw && value.trim() !== '';
        // Combine answer with options for the dropdown
        const currentOptions = localOptions.length > 0 ? localOptions : options;
        const dropdownOptions = Array.from(new Set([...currentOptions, answer])).sort();

        if (mode === 'picker') {
            return (
                <span key={index} className="inline-flex items-center relative mx-1 align-middle">
                    <select
                        key={`blank-select-${index}`}
                        value={value}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onBlur={() => handleBlur(index)}
                        disabled={submitted}
                        className={clsx(
                            "border-b-2 outline-none px-1 transition-colors bg-transparent min-w-[60px] text-center cursor-pointer appearance-none pr-4",
                            isCorrect ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20" :
                                isWrong ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20" :
                                    "border-gray-300 focus:border-blue-500 dark:border-gray-600"
                        )}
                    >
                        <option value="" disabled>...</option>
                        {dropdownOptions.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                    {showItemHints && !submitted && (
                        <button
                            onClick={() => revealAnswer(index)}
                            title={value === answer ? "Hide hint" : "Show hint"}
                            className="ml-0.5 p-0.5 text-gray-400 hover:text-yellow-500 transition-colors focus:outline-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                                <path d="M9 18h6" />
                                <path d="M10 22h4" />
                            </svg>
                        </button>
                    )}
                </span>
            );
        }

        if (mode === 'drag') {
            const dropId = `drop-${index}`;
            const droppedItemId = droppedItems[dropId];
            const droppedText = getItemText(droppedItemId || '');

            const isCorrect = submitted && droppedText === answer;
            const isWrong = submitted && droppedItemId && !isCorrect;

            return (
                <span key={index} className={clsx(
                    "inline-block mx-1 rounded px-1 relative",
                    isCorrect && "bg-green-100 dark:bg-green-900/30",
                    isWrong && "bg-red-100 dark:bg-red-900/30"
                )}>
                    <span onClick={() => handleDropZoneClick(dropId)} className="inline-block cursor-pointer">
                        <DropZone
                            key={`blank-drop-${index}`}
                            id={dropId}
                            current={droppedItemId}
                            text={droppedText}
                            disabled={submitted}
                        />
                    </span>
                    {/* Options Menu */}
                    {activeDropMenu === dropId && !submitted && (
                        <span className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 min-w-[150px] max-h-[200px] overflow-y-auto block text-left">
                            <span className="text-xs font-semibold text-gray-500 mb-2 px-2 block">Select word:</span>
                            {dragItems.map(itemId => (
                                <button
                                    key={itemId}
                                    onClick={() => handleMenuOptionClick(dropId, itemId)}
                                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 block"
                                >
                                    {getItemText(itemId)}
                                </button>
                            ))}
                            {dragItems.length === 0 && (
                                <span className="text-xs text-gray-400 px-2 italic block">No words available</span>
                            )}
                        </span>
                    )}
                </span>
            );
        }

        return (
            <span key={index} className="inline-block relative">
                <input
                    key={`blank-input-${index}`}
                    type="text"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    value={value}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onBlur={() => handleBlur(index)}
                    disabled={submitted}
                    className={clsx(
                        "mx-1 px-2 py-1 border-b-2 outline-none bg-transparent transition-colors text-center min-w-[60px]",
                        isCorrect ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20" :
                            isWrong ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20" :
                                "border-gray-300 focus:border-blue-500 dark:border-gray-600"
                    )}
                    style={{ width: `${Math.max(answer.length * 10 + 20, 60)}px` }}
                />
                {showItemHints && !isCorrect && !submitted && (
                    <button
                        onClick={() => revealAnswer(index)}
                        className="absolute -right-6 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Show hint"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                            <path d="M9 18h6" />
                            <path d="M10 22h4" />
                        </svg>
                    </button>
                )}
                {data.hint && (submitted || (touched[index] && value === data.answer)) && (
                    <span className="ml-2 text-sm text-gray-500 italic animate-in fade-in">
                        ({data.hint})
                    </span>
                )}
            </span>
        );
    }, [mode, inputs, handleInputChange, handleBlur, options, submitted, showItemHints, revealAnswer, droppedItems, handleDropZoneClick, getItemText, activeDropMenu, dragItems, handleMenuOptionClick]);


    // Check if content is a markdown table (not just any text with pipes or newlines)
    const isMarkdown = useMemo(() => {
        if (typeof contentToProcess !== 'string') return false;
        const text = contentToProcess;
        const lines = text.split('\n');
        // A markdown table must have pipes AND a separator line (e.g., | --- | --- |)
        const hasPipes = lines.some(line => line.includes('|'));
        const hasSeparator = lines.some(line => /^\s*\|[\s\-:|]+\|\s*$/.test(line));
        return hasPipes && hasSeparator;
    }, [contentToProcess]);

    // Memoize processed markdown to prevent re-parsing
    const processedMarkdown = useMemo(() => {
        if (!isMarkdown) return '';
        const text = contentToProcess as string;
        const parts = text.split(/(\[.*?\])/g);
        let blankIndex = 0;
        return parts.map(part => {
            if (part.startsWith('[') && part.endsWith(']')) {
                const index = blankIndex++;
                return `<span data-blank="${index}"></span>`;
            }
            return part;
        }).join('');
    }, [isMarkdown, contentToProcess]);



    let content;
    if (isMarkdown) {
        content = (
            <BlanksContext.Provider value={{ blanksData, inputs, touched, blurred, handleBlur, submitted, renderBlank }}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={markdownComponents}
                >
                    {processedMarkdown}
                </ReactMarkdown>
            </BlanksContext.Provider>
        );
    } else {
        content = renderContent(renderBlank);
    }

    return (
        <div className="my-6 relative">
            {isCompleted && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-lg z-10">
                    <Check size={20} />
                </div>
            )}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className={clsx(
                    "mb-6 text-gray-800 dark:text-gray-200",
                    isMarkdown
                        ? "prose dark:prose-invert max-w-none leading-normal"
                        : "leading-loose text-lg"
                )}>
                    {content}
                </div>
                {mode === 'drag' && !submitted && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Options:</div>
                        <div className="flex flex-wrap gap-2">
                            {dragItems.map(id => (
                                <span key={id} onClick={() => handleWordClick(id)} className="inline-block">
                                    <DraggableWord
                                        id={id}
                                        text={getItemText(id)}
                                        className={selectedId === id ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900" : ""}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </DndContext>

            <div className="flex gap-4 items-center flex-wrap">
                {!submitted ? (
                    <>
                        <button
                            onClick={checkAnswers}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm border border-transparent"
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
                            onClick={() => {
                                setSubmitted(false); // Just unsubmit to allow fixing
                                // Do NOT clear inputs
                            }}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 dark:bg-gray-700 dark:text-white transition-colors"
                        >
                            Fix
                        </button>
                        <button
                            onClick={reset}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                        >
                            Reset
                        </button>
                        <span className={clsx(
                            "font-medium ml-auto",
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
