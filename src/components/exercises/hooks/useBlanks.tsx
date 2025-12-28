import React, { useState, useMemo, useCallback } from 'react';

// Helper to extract text from ReactNode
export function getTextFromChildren(node: React.ReactNode): string {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return node.toString();
    if (Array.isArray(node)) return node.map(getTextFromChildren).join('');
    if (React.isValidElement(node)) {
        const props = node.props as { children?: React.ReactNode };
        if (props.children) {
            return getTextFromChildren(props.children);
        }
    }
    return '';
};

export interface BlankData {
    answer: string;
    localOptions: string[];
    hint?: string;
}

export interface BlankStatus {
    value: string;
    isCorrect: boolean;
    isWrong: boolean;
    touched: boolean;
    showValidation: boolean;
}

export interface UseBlanksOptions {
    children: React.ReactNode;
    mode?: 'input' | 'drag' | 'picker' | 'type';
    options?: string[]; // Global options
}

export const useBlanks = ({ children, options: _options = [] }: UseBlanksOptions) => {
    // 1. Parse text and extract blanks
    const { blanksData } = useMemo(() => {
        const text = getTextFromChildren(children);
        // Parse text to find blanks: [answer] or [answer|opt1|opt2]
        // We need to keep the structure, so we don't just split the text.
        // Actually, for parsing answers, we just need the text.
        // For rendering, we will traverse the React tree.

        const parts = text.split(/(\[.*?\])/g);
        const data: BlankData[] = parts
            .filter(p => p.startsWith('[') && p.endsWith(']'))
            .map(p => {
                const content = p.slice(1, -1); // Remove [ and ]
                const items = content.split('|');
                const answer = items[0];

                let hint: string | undefined;
                const localOptions: string[] = [];

                for (let i = 1; i < items.length; i++) {
                    if (items[i].startsWith('hint:')) {
                        hint = items[i].substring(5);
                    } else {
                        localOptions.push(items[i]);
                    }
                }

                return { answer, localOptions, hint };
            });

        return { blanksData: data };
    }, [children]);

    const answers = useMemo(() => blanksData.map(b => b.answer), [blanksData]);

    // 2. State management
    const [inputs, setInputs] = useState<string[]>(() => new Array(answers.length).fill(''));
    const [touched, setTouched] = useState<boolean[]>(() => new Array(answers.length).fill(false));
    const [blurred, setBlurred] = useState<boolean[]>(() => new Array(answers.length).fill(false));
    const [submitted, setSubmitted] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);

    const handleInputChange = useCallback((index: number, value: string) => {
        setInputs(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setTouched(prev => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
        // Reset blur state on change so partial matches are valid again while typing
        setBlurred(prev => {
            const next = [...prev];
            next[index] = false;
            return next;
        });
    }, []);

    const handleBlur = useCallback((index: number) => {
        setBlurred(prev => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
    }, []);

    const checkAnswers = useCallback(() => {
        setSubmitted(true);
        setShowAnswers(false);
    }, []);

    const reset = useCallback(() => {
        setSubmitted(false);
        setShowAnswers(false);
        setInputs(new Array(answers.length).fill(''));
        setTouched(new Array(answers.length).fill(false));
    }, [answers.length]);

    const revealAnswer = useCallback((index: number) => {
        setInputs(prev => {
            const next = [...prev];
            // Toggle logic: if already correct, clear it? Or just show?
            // User usually wants to see the answer.
            next[index] = answers[index];
            return next;
        });
        setTouched(prev => {
            const next = [...prev];
            next[index] = true;
            return next;
        });
    }, [answers]);

    const showAllAnswers = useCallback(() => {
        setInputs([...answers]);
        setSubmitted(true);
        setShowAnswers(true);
    }, [answers]);

    // 3. Recursive Renderer
    const renderContent = useCallback((
        renderBlank: (index: number, data: BlankData, status: BlankStatus) => React.ReactNode
    ) => {
        let blankIndexCounter = 0;

        const processNode = (node: React.ReactNode): React.ReactNode => {
            return React.Children.map(node, (child) => {
                if (typeof child === 'string') {
                    // Split by blanks: [answer]
                    const parts = child.split(/(\[.*?\])/g);
                    return parts.map((part, i) => {
                        if (part.startsWith('[') && part.endsWith(']')) {
                            if (blankIndexCounter >= blanksData.length) return part; // Should not happen if parsing matches

                            const data = blanksData[blankIndexCounter];
                            const index = blankIndexCounter++;

                            const value = inputs[index] || '';
                            const isCorrect = value.trim().toLowerCase() === data.answer.toLowerCase();
                            const showValidation = submitted || (touched[index] && value.trim() !== '');
                            const isPartialMatch = value.trim().length > 0 && data.answer.toLowerCase().startsWith(value.trim().toLowerCase());

                            const status: BlankStatus = {
                                value,
                                isCorrect,
                                isWrong: showValidation && !isCorrect && (submitted || (!isPartialMatch || blurred[index])),
                                touched: touched[index],
                                showValidation
                            };

                            return (
                                <React.Fragment key={`${index}-${i}`}>
                                    {renderBlank(index, data, status)}
                                </React.Fragment>
                            );
                        }
                        return part;
                    });
                }

                if (React.isValidElement(child)) {
                    // Recurse into children
                    const props = child.props as { children?: React.ReactNode };
                    if (props.children) {
                        return React.cloneElement(child, {
                            ...props,
                            children: processNode(props.children)
                        } as any);
                    }
                    return child;
                }

                return child;
            });
        };

        return processNode(children);
    }, [children, blanksData, inputs, submitted, touched]);

    const allCorrect = inputs.every((val, idx) => val.trim().toLowerCase() === answers[idx].toLowerCase());

    return {
        blanksData,
        answers,
        inputs,
        setInputs,
        touched,
        blurred,
        submitted,
        showAnswers,
        handleInputChange,
        handleBlur,
        checkAnswers,
        reset,
        revealAnswer,
        showAllAnswers,
        renderContent,
        allCorrect,
        setSubmitted
    };
};
