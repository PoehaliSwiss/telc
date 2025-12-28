import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

function getRepoName() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY.split('/')[1];
  }
  return null;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const repoName = getRepoName();
  console.log('Building for repo:', repoName, 'Mode:', mode);

  return {
    base: mode === 'production' && repoName ? `/${repoName}/` : './',
    define: {
      'import.meta.env.VITE_APP_MODE': JSON.stringify(process.env.VITE_APP_MODE || 'designer')
    },
    plugins: [
      mdx({
        remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
        providerImportSource: "@mdx-js/react"
      }),
      react()
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5292',
        changeOrigin: true,
        secure: false
      }
    }
  };
})
