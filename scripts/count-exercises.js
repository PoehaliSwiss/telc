#!/usr/bin/env node

/**
 * Script to count exercises in MDX files and generate a JSON manifest
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXERCISE_COMPONENTS = [
    'Quiz',
    'FillBlanks',
    'InlineBlanks',
    'Media',
    'AudioPhrase',
    'Dialogue',
    'Matching',
    'Ordering',
    'Grouping',
    'Flashcards',
    'SpeakingChallenge',
    'InteractiveMedia',
    'ImageLabeling'
];

function countExercisesInMdx(mdxContent) {
    let count = 0;
    for (const component of EXERCISE_COMPONENTS) {
        const regex = new RegExp(`<${component}[\\s>]`, 'g');
        const matches = mdxContent.match(regex);
        if (matches) {
            count += matches.length;
        }
    }
    return count;
}

function scanDirectory(dir, basePath = '') {
    const results = {};
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            Object.assign(results, scanDirectory(fullPath, path.join(basePath, item)));
        } else if (item.endsWith('.mdx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const count = countExercisesInMdx(content);
            const relativePath = path.join(basePath, item.replace('.mdx', '')).replace(/\\/g, '/');
            const lessonPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
            results[lessonPath] = count;
        }
    }

    return results;
}

const contentDir = path.join(__dirname, '../src/content');
const outputFile = path.join(__dirname, '../src/exerciseCounts.json');

console.log('📊 Counting exercises in MDX files...');
const counts = scanDirectory(contentDir);

console.log(`✅ Found ${Object.keys(counts).length} lessons`);
console.log(`📝 Total exercises: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);

fs.writeFileSync(outputFile, JSON.stringify(counts, null, 2));
console.log(`💾 Saved to ${outputFile}`);
