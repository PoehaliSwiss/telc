#!/usr/bin/env node

/**
 * Script to scan public/images directory and generate metadata JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
}

function scanDirectory(dir, basePath = '') {
    const items = [];

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
                // Recursively scan subdirectory
                const children = scanDirectory(fullPath, relativePath);
                items.push({
                    type: 'folder',
                    name: entry.name,
                    path: relativePath.replace(/\\/g, '/'),
                    children
                });
            } else if (entry.isFile() && isImageFile(entry.name)) {
                // Get file stats
                const stats = fs.statSync(fullPath);
                items.push({
                    type: 'image',
                    name: entry.name,
                    path: '/images/' + relativePath.replace(/\\/g, '/'),
                    size: stats.size
                });
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error.message);
    }

    return items;
}

const imagesDir = path.join(__dirname, '../public/images');
const outputFile = path.join(__dirname, '../src/imageMetadata.json');

console.log('📸 Scanning images directory...');

// Check if images directory exists
if (!fs.existsSync(imagesDir)) {
    console.log('⚠️  public/images directory not found, creating empty metadata');
    fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
    console.log('💾 Saved empty metadata to', outputFile);
} else {
    const metadata = scanDirectory(imagesDir);

    const totalImages = JSON.stringify(metadata).match(/"type":"image"/g)?.length || 0;
    console.log(`✅ Found ${totalImages} images`);

    fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
    console.log(`💾 Saved to ${outputFile}`);
}
