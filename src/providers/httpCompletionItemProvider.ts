import {
    CancellationToken,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    Range,
    SnippetString,
    TextDocument,
} from 'vscode';
import { ElementType } from '../models/httpElement';
import { HttpElementFactory } from '../utils/httpElementFactory';

export class HttpCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(
        document: TextDocument,
        position: Position,
        _token: CancellationToken
    ): Promise<CompletionItem[] | undefined> {
        const innerRange = this.variableRangeInDocumentPosition(document, position);
        const lineText = document.lineAt(position.line).text;
        const elements = await HttpElementFactory.getHttpElements(document, lineText);

        const variableTypes = [
            ElementType.SystemVariable,
            ElementType.EnvironmentCustomVariable,
            ElementType.FileCustomVariable,
            ElementType.RequestCustomVariable,
        ];

        return elements.map(e => {
            const item = new CompletionItem(e.name);
            item.detail = `HTTP ${ElementType[e.type]}`;
            item.documentation = e.description;

            if (variableTypes.includes(e.type)) {
                item.kind = CompletionItemKind.Variable;
            } else if (e.type === ElementType.Method) {
                item.kind = CompletionItemKind.Method;
            } else if (e.type === ElementType.Header) {
                item.kind = CompletionItemKind.Property;
            } else {
                item.kind = CompletionItemKind.Field;
            }

            const rawText = typeof e.text === 'string' ? e.text : (e.text?.value ?? '');

            if (innerRange != undefined && rawText.startsWith('{{') && rawText.endsWith('}}')) {
                const innerContent = rawText.slice(2, -2).trim();

                if (innerRange) {
                    item.range = innerRange;
                }

                if (typeof e.text !== 'string') {
                    item.insertText = new SnippetString(innerContent);
                } else {
                    item.insertText = innerContent;
                }

                if (innerContent.startsWith('$')) {
                    const withoutDollar = innerContent.substring(1);
                    item.filterText = `${innerContent} ${withoutDollar}`;
                }
            } else {
                item.insertText = e.text;

                if (rawText.includes('$')) {
                    const clean = rawText.replace(/[{}\s]/g, '');
                    if (clean.startsWith('$')) {
                        item.filterText = `${clean} ${clean.substring(1)}`;
                    }
                }
            }

            return item;
        });
    }

    private variableRangeInDocumentPosition(
        document: TextDocument,
        position: Position
    ): Range | undefined {
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        const leftBracesIdx = textBeforeCursor.lastIndexOf('{{');
        const lastClosedIdx = textBeforeCursor.lastIndexOf('}}');
        const isInsideBraces = leftBracesIdx > lastClosedIdx;

        // Check if cursor is inside or outside brackets
        if (isInsideBraces) {
            const contentStartCol = leftBracesIdx + 2;
            const rightBracesIdx = lineText.indexOf('}}', position.character);
            const contentEndCol = rightBracesIdx !== -1 ? rightBracesIdx : lineText.length;

            return new Range(
                new Position(position.line, contentStartCol),
                new Position(position.line, contentEndCol)
            );
        }
        return undefined;
    }
}
