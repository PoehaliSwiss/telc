import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COURSE_PATH = path.join(__dirname, '../src/content/course.yaml');
const DIST_PATH = path.join(__dirname, '../dist');

function loadCourse() {
    if (!fs.existsSync(COURSE_PATH)) {
        console.warn('⚠️ course.yaml not found, skipping course routes.');
        return { structure: [] };
    }
    const fileContents = fs.readFileSync(COURSE_PATH, 'utf8');
    return yaml.load(fileContents);
}

function flattenRoutes(items, routes = []) {
    items.forEach(item => {
        if (item.path) {
            routes.push(item.path);
        }
        if (item.items) {
            flattenRoutes(item.items, routes);
        }
    });
    return routes;
}

function prerender() {
    const course = loadCourse();
    const routes = flattenRoutes(course.structure);

    // Add static routes
    routes.push('/editor');

    if (!fs.existsSync(DIST_PATH)) {
        console.error('❌ dist/ directory not found. Run build first.');
        process.exit(1);
    }

    const template = fs.readFileSync(path.join(DIST_PATH, 'index.html'), 'utf8');

    routes.forEach(route => {
        // Skip root route as it's already handled by dist/index.html
        if (route === '/') return;

        const routePath = path.join(DIST_PATH, route);
        if (!fs.existsSync(routePath)) {
            fs.mkdirSync(routePath, { recursive: true });
        }

        fs.writeFileSync(path.join(routePath, 'index.html'), template);
        console.log(`✅ Prerendered: ${route}`);
    });

    console.log(`🎉 Prerendered ${routes.length} pages.`);
}

prerender();
