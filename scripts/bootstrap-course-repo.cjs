const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SOURCE_DIR = path.resolve(__dirname, '..');
const REPO_NAME = 'Mogikan/DeutschBuch-1';
const TEMP_DIR = path.join(SOURCE_DIR, 'temp_deploy_build');

const GITHUB_TOKEN = process.argv[2];
if (!GITHUB_TOKEN) {
    console.error('❌ Error: Please provide your GitHub Personal Access Token as an argument.');
    console.error('Usage: node scripts/bootstrap-course-repo.cjs <YOUR_GITHUB_TOKEN>');
    process.exit(1);
}

// Construct URL with token for authentication
const TARGET_REPO_URL = `https://${GITHUB_TOKEN}@github.com/${REPO_NAME}.git`;

function run(command, cwd = SOURCE_DIR) {
    // Hide token in logs
    const safeCommand = command.replace(GITHUB_TOKEN, '***TOKEN***');
    console.log(`> ${safeCommand}`);
    // ... but run the real one
    try {
        execSync(command, { stdio: 'inherit', cwd });
    } catch (e) {
        throw new Error(`Command failed: ${safeCommand}`);
    }
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = stats && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

async function bootstrap() {
    console.log('🚀 Bootstrapping End-User Repository...');

    // 1. Prepare Temp Directory
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEMP_DIR);

    // 2. Clone Target Repo (to preserve history if any, or start fresh)
    console.log('📥 Cloning target repository...');
    try {
        run(`git clone ${TARGET_REPO_URL} .`, TEMP_DIR);
    } catch (e) {
        // If empty repo, git clone might warn, but that's ok we'll init
        console.log('Repo might be empty or not found, initializing fresh in temp...');
        run('git init', TEMP_DIR);
        run(`git remote add origin ${TARGET_REPO_URL}`, TEMP_DIR);
        run('git checkout -b main', TEMP_DIR);
    }

    // 2.1 Preserve CNAME if exists (GitHub Pages)
    // If CNAME exists in the repo, we ensure it's in public/ so it gets included in the build
    const cnamePath = path.join(TEMP_DIR, 'CNAME');
    if (fs.existsSync(cnamePath)) {
        console.log('📄 Found CNAME, preserving in public/ to include in build...');
        const publicDir = path.join(TEMP_DIR, 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
        fs.copyFileSync(cnamePath, path.join(publicDir, 'CNAME'));
    }

    // 3. Clean Target Directory (remove everything except .git and content potentially)
    // We want to KEEP content/ if it exists, but overwrite application code.
    // Actually, simpler to just overwrite App code.

    // 4. Copy Clean Application Code
    console.log('📦 Copying application files...');

    const filesToCopy = [
        'public',
        'index.html',
        'postcss.config.js',
        'tailwind.config.js', // if exists
        'tsconfig.json',
        'tsconfig.app.json',
        'tsconfig.node.json',
        'vite.config.ts',
        'eslint.config.js',
        '.gitignore'
    ];

    filesToCopy.forEach(f => {
        const srcCtx = path.join(SOURCE_DIR, f);
        const destCtx = path.join(TEMP_DIR, f);
        if (fs.existsSync(srcCtx)) {
            copyRecursiveSync(srcCtx, destCtx);
        }
    });

    // Copy src but filter excluded
    const srcDir = path.join(SOURCE_DIR, 'src');
    const destSrcDir = path.join(TEMP_DIR, 'src');
    if (!fs.existsSync(destSrcDir)) fs.mkdirSync(destSrcDir);

    const excludeInSrc = ['components/editor', 'components/github', 'context/GitHubContext.tsx', 'pages/EditorPage.tsx', 'ReaderApp.tsx'];
    // We EXCLUDE ReaderApp.tsx from the copy because we will rename it to App.tsx manually later

    function copySrcFiltered(currentDir, relativePath) {
        const items = fs.readdirSync(currentDir);
        items.forEach(item => {
            const fullPath = path.join(currentDir, item);
            const itemRelPath = path.join(relativePath, item);
            const destPath = path.join(destSrcDir, itemRelPath);

            // Check exclusions
            if (excludeInSrc.some(ex => itemRelPath.startsWith(ex) || itemRelPath === ex)) {
                return;
            }

            if (fs.statSync(fullPath).isDirectory()) {
                if (!fs.existsSync(destPath)) fs.mkdirSync(destPath);
                copySrcFiltered(fullPath, itemRelPath);
            } else {
                fs.copyFileSync(fullPath, destPath);
            }
        });
    }
    copySrcFiltered(srcDir, '');

    // 5. Transform ReaderApp.tsx -> App.tsx
    console.log('🔄 Swapping ReaderApp as main App...');
    const readerAppSource = path.join(SOURCE_DIR, 'src', 'ReaderApp.tsx');
    const appTsxDest = path.join(destSrcDir, 'App.tsx');
    fs.copyFileSync(readerAppSource, appTsxDest);

    // 6. Modify package.json -> Remove dev dependencies or unused ones
    console.log('📝 Optimizing package.json...');
    const packageJsonPath = path.join(SOURCE_DIR, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Remove GitHub/Editor specific deps
    delete pkg.dependencies['octokit'];
    // delete pkg.dependencies['@dnd-kit/core']; // Keep if used in viewer? Likely not.

    fs.writeFileSync(path.join(TEMP_DIR, 'package.json'), JSON.stringify(pkg, null, 2));


    // 7. Commit and Push
    console.log('🚀 Pushing to remote...');
    run('git add .', TEMP_DIR);
    try {
        run('git commit -m "Bootstrap: Deploy End-User Application Code"', TEMP_DIR);
    } catch (e) {
        console.log("Nothing to commit.");
    }

    // We need to push. Assuming SSH or Credential Manager handles auth.
    run('git push -u origin main', TEMP_DIR);

    console.log('✅ Bootstrap Complete!');
    console.log('🧹 Cleaning up...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

bootstrap();
