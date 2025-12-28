
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';


const mdxContent = `
<InteractiveMedia src="/video.mp4">
  <Checkpoint time="00:01">

    This is the best dialog in the world

    <Quiz answer="1,3" multiple>
      Was sagt Professor Albrecht über Englisch?
      <Option>Englisch ist eine Lingua franca</Option>
    </Quiz>

  </Checkpoint>
</InteractiveMedia>
`;

const cleanBlock = (text, tagName) => {
    const regex = new RegExp(`(<${tagName}\\b[^>]*>)([\\s\\S]*?)(<\\/\\s*${tagName}\\s*>)`, 'gi');
    return text.replace(regex, (_match, openTag, content, closeTag) => {
        const cleanedContent = content
            .split('\\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ');
        return openTag + cleanedContent + closeTag;
    });
};

async function test() {
    try {
        // Removed Checkpoint from the list to see if it fails
        const componentsToClean = ['InteractiveMedia', 'Quiz', 'Option'];
        let processedMdx = mdxContent;
        componentsToClean.forEach(component => {
            processedMdx = cleanBlock(processedMdx, component);
        });

        console.log('Processed MDX:');
        console.log(processedMdx);

        await evaluate(processedMdx, {
            ...runtime,
            remarkPlugins: [remarkGfm, remarkGithubBlockquoteAlert],
            baseUrl: import.meta.url,
        });
        console.log('Compilation successful!');
    } catch (err) {
        console.error('Compilation failed:', err);
    }
}

test();
