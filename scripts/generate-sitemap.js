import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COURSE_PATH = path.join(__dirname, '../src/content/course.yaml');
const DIST_PATH = path.join(__dirname, '../dist');
const BASE_URL = 'https://akkem.study';

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

function generateSitemap() {
    const course = loadCourse();
    const routes = flattenRoutes(course.structure);

    // Add static routes
    routes.push('/');
    routes.push('/Designer');
    routes.push('/Login');
    routes.push('/Register');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${routes.map(route => `
    <url>
        <loc>${BASE_URL}${route}</loc>
        <changefreq>weekly</changefreq>
        <priority>${route === '/' ? '1.0' : '0.8'}</priority>
    </url>
    `).join('')}
</urlset>`;

    if (!fs.existsSync(DIST_PATH)) {
        fs.mkdirSync(DIST_PATH, { recursive: true });
    }

    fs.writeFileSync(path.join(DIST_PATH, 'sitemap.xml'), sitemap);
    console.log('✅ Sitemap generated at dist/sitemap.xml');
}

generateSitemap();
