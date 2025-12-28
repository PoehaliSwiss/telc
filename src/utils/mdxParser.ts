export interface ExerciseComponent {
    type: 'Quiz' | 'Ordering' | 'Matching' | 'FillBlanks' | 'InlineBlanks' | 'Grouping' | 'Media' | 'Dialogue' | 'InteractiveMedia' | 'AudioPhrase' | 'SpeakingChallenge' | 'Flashcards' | 'ImageLabeling';
    props: Record<string, any>;
    raw: string;
    startIndex: number;
    endIndex: number;
    children?: string; // For components with children like Quiz or FillBlanks
}

// Helper to parse props string like: answer="2" multiple={true} pairs={[{...}]}
const parseProps = (propsString: string): Record<string, any> => {
    const props: Record<string, any> = {};
    let i = 0;

    while (i < propsString.length) {
        // Skip whitespace
        if (/\s/.test(propsString[i])) {
            i++;
            continue;
        }

        // Find key
        const keyStart = i;
        while (i < propsString.length && /[\w-]/.test(propsString[i])) {
            i++;
        }
        const key = propsString.substring(keyStart, i);

        if (!key) {
            i++;
            continue;
        }

        // Expect =
        if (propsString[i] !== '=') {
            // Boolean prop (e.g. <Component multiple />)
            props[key] = true;
            continue;
        }
        i++; // skip =

        // Value
        if (propsString[i] === '"' || propsString[i] === "'") {
            const quote = propsString[i];
            i++;
            const valStart = i;
            while (i < propsString.length && propsString[i] !== quote) {
                // Handle escaped quotes if needed, but simple for now
                if (propsString[i] === '\\') i++;
                i++;
            }
            props[key] = propsString.substring(valStart, i);
            i++; // skip closing quote
        } else if (propsString[i] === '{') {
            i++; // skip opening {
            const valStart = i;
            let braceCount = 1;
            while (i < propsString.length && braceCount > 0) {
                if (propsString[i] === '{') braceCount++;
                if (propsString[i] === '}') braceCount--;
                if (braceCount > 0) i++;
            }
            const valueStr = propsString.substring(valStart, i);
            i++; // skip closing }

            try {
                // Safe eval
                const safeValue = new Function(`return ${valueStr}`)();
                props[key] = safeValue;
            } catch (e) {
                console.warn(`Failed to parse prop ${key}:`, e);
                props[key] = valueStr;
            }
        } else {
            // Unquoted string? or number? Skip for now or handle until space
            // Just skip to next space
            while (i < propsString.length && !/\s/.test(propsString[i])) i++;
        }
    }

    return props;
};

export const parseExercises = (mdx: string): ExerciseComponent[] => {
    const exercises: ExerciseComponent[] = [];

    // Regex for self-closing tags: <Component ... />
    // and paired tags: <Component ...>...</Component>

    const componentTypes = ['Quiz', 'Ordering', 'Matching', 'FillBlanks', 'InlineBlanks', 'Grouping', 'Media', 'Dialogue', 'InteractiveMedia', 'AudioPhrase', 'SpeakingChallenge', 'Flashcards', 'ImageLabeling'];

    componentTypes.forEach(type => {
        // Match self-closing: <Type ... />
        const selfClosingRegex = new RegExp(`<${type}(\\s+[^>]*?)?/>`, 'g');
        let match;
        while ((match = selfClosingRegex.exec(mdx)) !== null) {
            exercises.push({
                type: type as any,
                props: parseProps(match[1] || ''),
                raw: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length
            });
        }

        // Match paired: <Type ...>...</Type>
        // Note: This regex is greedy and might fail with nested same-type components.
        // Assuming no nesting of same exercises for now.
        const pairedRegex = new RegExp(`<${type}(\\s+[^>]*)?>([\\s\\S]*?)</${type}>`, 'g');
        while ((match = pairedRegex.exec(mdx)) !== null) {
            exercises.push({
                type: type as any,
                props: parseProps(match[1] || ''),
                raw: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                children: match[2]
            });
        }
    });

    // Sort by position
    return exercises.sort((a, b) => a.startIndex - b.startIndex);
};

export const generateComponentCode = (component: ExerciseComponent): string => {
    const propsStr = Object.entries(component.props)
        .map(([key, value]) => {
            if (typeof value === 'string') return `${key}="${value}"`;
            if (typeof value === 'number' || typeof value === 'boolean') return `${key}={${value}}`;
            if (typeof value === 'object') return `${key}={${JSON.stringify(value)}}`; // formatting might be ugly
            return '';
        })
        .join(' ');

    const openTag = `<${component.type}${propsStr ? ' ' + propsStr : ''}`;

    if (component.children !== undefined) {
        // Add extra newlines to ensure block content (like headers/lists) is parsed correctly by MDX
        return `${openTag}>\n\n${component.children}\n\n</${component.type}>`;
    } else {
        return `${openTag} />`;
    }
};

export const generatePreviewCode = (component: ExerciseComponent): string => {
    const propsStr = Object.entries(component.props)
        .map(([key, value]) => {
            if (typeof value === 'string') return `${key}="${value}"`;
            // For preview, we convert everything to string attributes
            if (typeof value === 'number' || typeof value === 'boolean') return `${key}="${value}"`;
            if (typeof value === 'object') {
                // Escape quotes for HTML attribute
                const json = JSON.stringify(value);
                const escaped = json.replace(/"/g, '&quot;');
                return `${key}="${escaped}"`;
            }
            return '';
        })
        .join(' ');

    const openTag = `<${component.type}${propsStr ? ' ' + propsStr : ''}`;

    if (component.children !== undefined) {
        return `${openTag}>\n${component.children}\n</${component.type}>`;
    } else {
        return `${openTag} />`;
    }
};
