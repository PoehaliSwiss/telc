import { FillBlanks } from './components/exercises/FillBlanks';
import { InlineBlanks } from './components/exercises/InlineBlanks';

export default function TableTest() {
    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold mb-8">Тест таблиц в FillBlanks и InlineBlanks</h1>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">1. InlineBlanks с таблицей</h2>
                <InlineBlanks>
                    {`| Header 1 | Header 2 | Header 3 |
| --- | --- | --- |
| Cell 1-1 | Cell 1-2 | Cell 1-3 |
| Cell 2-1 | Cell 2-2 | Cell 2-3 |
| Cell 3-1 | Cell 3-2 | Cell 3-3 |`}
                </InlineBlanks>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">2. FillBlanks с таблицей</h2>
                <FillBlanks>
                    {`| Header 1 | Header 2 | Header 3 |
| --- | --- | --- |
| Cell 1-1 | Cell 1-2 | Cell 1-3 |
| Cell 2-1 | Cell 2-2 | Cell 2-3 |
| Cell 3-1 | Cell 3-2 | Cell 3-3 |`}
                </FillBlanks>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">3. InlineBlanks с таблицей и пропусками</h2>
                <InlineBlanks>
                    {`| Artikel | Singular | Plural |
| --- | --- | --- |
| der | [Mann] | Männer |
| die | [Frau] | Frauen |
| das | [Kind] | Kinder |`}
                </InlineBlanks>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">4. FillBlanks с таблицей и пропусками (input mode)</h2>
                <FillBlanks mode="input">
                    {`| Artikel | Singular | Plural |
| --- | --- | --- |
| der | [Mann] | Männer |
| die | [Frau] | Frauen |
| das | [Kind] | Kinder |`}
                </FillBlanks>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">5. Обычный текст БЕЗ таблицы (не должен использовать ReactMarkdown)</h2>
                <InlineBlanks>
                    Complete: Der [Mann] geht in den Park.
                </InlineBlanks>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">6. Текст с символом | но БЕЗ разделителя (не должен быть таблицей)</h2>
                <InlineBlanks>
                    {`Choose: apple | banana | orange
The answer is [apple].`}
                </InlineBlanks>
            </section>
        </div>
    );
}
