
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';

// Mock components
const InteractiveMedia = () => null;
const Checkpoint = () => null;
const Quiz = () => null;
const Option = () => null;

// Problematic MDX content with empty lines
const mdxContent = `
# Test User Content

<InteractiveMedia src="/audio/ErkundungenC2_02.mp3">
  <Checkpoint time="00:00:18,470">
    <Quiz answer="3">
      Worüber handelt das Interview?
      <Option>Über die Geschichte der deutschen Sprache</Option>
      <Option>Über Dialekte in Deutschland</Option>
      <Option>Ob die deutsche Sprache eine Zukunft hat</Option>
      <Option>Über den Einfluss des Latein auf das Deutsche</Option>
    </Quiz>
  </Checkpoint>
  <Checkpoint time="00:00:33,680">
    <FillBlanks mode="picker">
      Viele Menschen sorgen sich um zu viele [Anglizismen|Dialekte|Lehnwörter aus dem Französischen] im Deutschen und fürchten, dass Deutsch langfristig durch das [Englische|Französische|Latein] verdrängt werden könnte.
    </FillBlanks>
  </Checkpoint>
  <Checkpoint time="00:01:29,120">
    <Quiz answer="2">
      Was meint Professor Albrecht mit „Deutsch als Dialekt“?
      <Option>Deutsch wird zu einer regionalen Sprache wie Bairisch oder Kölsch</Option>
      <Option>Deutsch bleibt nur im privaten Bereich, während Englisch offiziell genutzt wird</Option>
      <Option>Deutsch verliert seine Grammatik und wird nur noch gesprochen, nicht mehr geschrieben</Option>
      <Option>Deutsch wird nur noch von alten Menschen gesprochen</Option>
    </Quiz>
  </Checkpoint>
  {/* После статистики */}
  <Checkpoint time="00:02:27,200">
    <FillBlanks mode="input">
      Deutsch ist die meistgesprochene [Muttersprache] in Europa. In der EU sprechen [32]% aller Einwohner Deutsch – als Muttersprache oder [Fremdsprache].
    </FillBlanks>
  </Checkpoint>
  {/* После глобальных данных */}
  <Checkpoint time="00:03:21,960">
    <InlineBlanks>
      Weltweit hat Deutsch etwa [121] Millionen Sprecher und belegt damit Platz [8 bis 10] im internationalen Ranking.
    </InlineBlanks>
  </Checkpoint>
  <Checkpoint time="00:04:26,220">
    <Quiz answer="1,3" multiple>
      Was sagt Professor Albrecht über Englisch?
      <Option>Englisch ist eine Lingua franca – eine gemeinsame Verkehrssprache</Option>
      <Option>Englisch ersetzt alle anderen Sprachen vollständig</Option>
      <Option>Englisch ist eine Erleichterung, nicht nur eine Bedrohung</Option>
      <Option>Englisch war schon immer die wichtigste Sprache Europas</Option>
    </Quiz>
  </Checkpoint>
  <Checkpoint time="00:05:26,969">
    <Matching pairs={[
      { left: "Latein", right: "War früher Lingua franca, aber nie Muttersprache" },
      { left: "Englisch", right: "Ist heute Lingua franca und auch Muttersprache" }
    ]} />
  </Checkpoint>
  <Checkpoint time="00:05:55,300">
    <Grouping groups={{
      "Emotionale Gründe": ["gekränkter Nationalstolz", "Angst vor Verlust der kulturellen Identität"],
      "Sachliche Fakten": ["Englisch ist globale Verkehrssprache", "Deutsch hat 121 Mio. Sprecher"]
    }} />
  </Checkpoint>
  <Checkpoint time="00:07:59,796">
    <Ordering direction="vertical" items={[
      "Im 17. Jahrhundert sprach der deutsche Adel Französisch.",
      "Damals gab es noch kein einheitliches Hochdeutsch.",
      "Trotzdem überlebte und entwickelte sich die deutsche Sprache weiter.",
      "Heute ist Deutsch eine stabile und etablierte Sprache."
    ]} />
  </Checkpoint>
  <Checkpoint time="00:09:39,836">
    <FillBlanks mode="drag">
      Die richtige Frage lautet nicht „[Englisch oder Deutsch?]“, sondern „Welche Rolle kann das [Deutsche] neben dem [Englisch] spielen?“
    </FillBlanks>
  </Checkpoint>
</InteractiveMedia>
`;

// Preprocessing logic (copied from EditorPage.tsx)
const cleanBlock = (text, tagName) => {
    // Regex to find <TagName ...> ... </TagName>
    // Handles multiline opening tags, whitespace, case insensitivity
    const regex = new RegExp(`(<${tagName}\\b[^>]*>)([\\s\\S]*?)(<\\/\\s*${tagName}\\s*>)`, 'gi');
    return text.replace(regex, (_match, openTag, content, closeTag) => {
        const cleanedContent = content
            .split('\n')
            .map(line => line.trim()) // Trim whitespace from each line
            .filter(line => line.length > 0) // Remove empty lines
            .join(' '); // Join with space to avoid paragraph breaks
        return openTag + cleanedContent + closeTag;
    });
};

const componentsToClean = [
    'InteractiveMedia',
    'Checkpoint',
    'Quiz',
    'Option'
];

let processedMdx = mdxContent;
componentsToClean.forEach(component => {
    processedMdx = cleanBlock(processedMdx, component);
});

console.log('--- Processed MDX ---');
console.log(processedMdx);
console.log('---------------------');

async function test() {
    try {
        await evaluate(processedMdx, {
            ...runtime,
            remarkPlugins: [remarkGfm, remarkGithubBlockquoteAlert],
            baseUrl: import.meta.url,
        });
        console.log('✅ Compilation SUCCESS');
    } catch (err) {
        console.error('❌ Compilation FAILED');
        console.error(err);
    }
}

test();
