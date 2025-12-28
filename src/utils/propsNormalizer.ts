export const normalizeProps = (props: any): any => {
    const newProps: any = { ...props };

    Object.keys(newProps).forEach(key => {
        const value = newProps[key];

        if (value === 'true') {
            newProps[key] = true;
        } else if (value === 'false') {
            newProps[key] = false;
        } else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
            // Be careful converting all numbers, some might be strings like "01"
            // For now, let's only convert if it looks like a safe number and isn't an ID
            // Actually, for Quiz/Ordering, most numeric props are likely numbers.
            // But 'answer' in Quiz can be "1".
            // Let's stick to boolean normalization for now as that's the main issue.
        }

        // Handle JSON-like arrays/objects if passed as string
        // We target specific keys to avoid false positives (like FillBlanks text starting with [)
        const jsonKeys = ['items', 'pairs', 'groups', 'options', 'alternatives'];
        if (jsonKeys.includes(key) && typeof value === 'string') {
            try {
                // Replace single quotes with double quotes if needed for JSON.parse
                // But be careful not to break actual content.
                // React usually passes double quoted JSON if it was stringified.
                // If it came from HTML attribute, it might be: items="['a', 'b']" -> value="['a', 'b']"
                // JSON.parse requires double quotes for strings: '["a", "b"]' -> valid. "['a', 'b']" -> invalid.

                // Let's try to parse as is first
                newProps[key] = JSON.parse(value);
            } catch (e) {
                // If simple parse fails, it might be single quoted array from manual input?
                // e.g. ['a', 'b']
                try {
                    // Risky replacement of ' with "
                    const fixed = value.replace(/'/g, '"');
                    newProps[key] = JSON.parse(fixed);
                } catch (e2) {
                    // console.warn(`Failed to parse prop ${key}:`, value);
                }
            }
        }
    });

    return newProps;
};
