
export const EXERCISE_COMPONENTS = [
    'Quiz',
    'FillBlanks',
    'InlineBlanks',
    'Matching',
    'Ordering',
    'Grouping',
    'Flashcards',
    'SpeakingChallenge',
    'InteractiveMedia',
    'AudioPhrase',
    'Dialogue'
];

export function countExercisesInMdx(mdxContent: string | any): number {
    // Handle case where mdxContent might not be a string
    if (typeof mdxContent !== 'string') {
        console.warn('countExercisesInMdx received non-string content:', typeof mdxContent);
        return 0;
    }

    let count = 0;
    // Remove comments to avoid false positives
    const cleanContent = mdxContent.replace(/<!--[\s\S]*?-->/g, '');

    EXERCISE_COMPONENTS.forEach(component => {
        // Match <Component or <Component> or <Component ...
        // We use a simple regex that looks for the component name at the start of a tag
        const regex = new RegExp(`<${component}\\b`, 'g');
        const matches = cleanContent.match(regex);
        if (matches) {
            count += matches.length;
        }
    });

    return count;
}
