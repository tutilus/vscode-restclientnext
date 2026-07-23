import { TextDocument, window } from 'vscode';
import * as Constants from '../common/constants';
import { ElementType, HttpElement } from '../models/httpElement';
import { RequestMetadata } from '../models/requestMetadata';
import { EnvironmentVariableProvider } from './httpVariableProviders/environmentVariableProvider';
import { FileVariableProvider } from './httpVariableProviders/fileVariableProvider';
import { RequestVariableProvider } from './httpVariableProviders/requestVariableProvider';
import { Selector } from './selector';
import { UserDataManager } from './userDataManager';

// static registry imports
import { AUTHENTICATION_SNIPPETS } from './static/authSnippets';
import { HTTP_HEADERS, HTTP_METHODS, MIME_TYPES } from './static/httpHeaders';
import { getSystemVariableSnippets } from './static/systemVariables';
import {
    buildRequestVariableHttpElement,
    buildPromptVariableHttpElement,
    buildEnvironmentVariableHttpElement,
    buildFileVariableHttpElement,
    buildUrlHttpElement,
} from './static/requestVariables';

export class HttpElementFactory {
    // Cache for reused static elements
    private static readonly _staticElements: HttpElement[] = [
        ...HTTP_METHODS,
        ...HTTP_HEADERS,
        ...MIME_TYPES,
        ...AUTHENTICATION_SNIPPETS,
        ...getSystemVariableSnippets(),
    ];

    public static async getHttpElements(
        document: TextDocument,
        line: string
    ): Promise<HttpElement[]> {
        const originalElements: HttpElement[] = [...this._staticElements];

        // Add dynamic elements
        const dynamicElements = await this.getDynamicElements(document);
        originalElements.push(...dynamicElements);

        return this.filterElementsByLine(originalElements, line);
    }

    private static async getDynamicElements(document: TextDocument): Promise<HttpElement[]> {
        const dynamicElements: HttpElement[] = [];

        // Add environment custom variables
        const environmentVariables = await EnvironmentVariableProvider.Instance.getAll();
        for (const { name, value } of environmentVariables) {
            dynamicElements.push(buildEnvironmentVariableHttpElement(name, value));
        }

        // Add file custom variables
        const fileVariables = await FileVariableProvider.Instance.getAll(document);
        for (const { name, value } of fileVariables) {
            dynamicElements.push(buildFileVariableHttpElement(name, value));
        }

        // Add request variables
        const requestVariables = await RequestVariableProvider.Instance.getAll(document);
        for (const { name, value } of requestVariables) {
            dynamicElements.push(buildRequestVariableHttpElement(name, value));
        }

        // Add active editor prompt variables
        const editor = window.activeTextEditor;
        if (editor) {
            const activeLine = editor.selection.active.line;
            const selectedText = Selector.getDelimitedText(editor.document.getText(), activeLine);

            if (selectedText) {
                const lines = selectedText.split(Constants.LineSplitterRegex);
                const metadatas = Selector.parseReqMetadatas(lines);

                const promptVariablesDefinitions =
                    Selector.parsePromptMetadataForVariableDefinitions(
                        metadatas.get(RequestMetadata.Prompt)
                    );
                for (const { name, description } of promptVariablesDefinitions) {
                    dynamicElements.push(buildPromptVariableHttpElement(name, description));
                }
            }
        }

        // Add URLs from history
        const historyItems = await UserDataManager.getRequestHistory();
        const distinctRequestUrls = new Set(historyItems.map(item => item.url));

        distinctRequestUrls.forEach(requestUrl => {
            const urlElement = buildUrlHttpElement(requestUrl);
            if (urlElement) {
                dynamicElements.push(urlElement);
            }
        });

        return dynamicElements;
    }

    private static filterElementsByLine(
        originalElements: HttpElement[],
        line: string
    ): HttpElement[] {
        let elements: HttpElement[] = [];

        if (line) {
            originalElements.forEach(element => {
                if (element.prefix) {
                    if (line.match(new RegExp(element.prefix, 'i'))) {
                        elements.push(element);
                    }
                }
            });
        }

        if (elements.length === 0) {
            elements = originalElements.filter(e => !e.prefix);
        } else if (
            elements.every(
                e =>
                    e.type === ElementType.FileCustomVariable ||
                    e.type === ElementType.RequestCustomVariable
            )
        ) {
            elements = elements.concat(originalElements.filter(e => !e.prefix));
        } else {
            // Add global/custom variables anyway
            originalElements
                .filter(
                    e =>
                        !e.prefix &&
                        (e.type === ElementType.SystemVariable ||
                            e.type === ElementType.EnvironmentCustomVariable ||
                            e.type === ElementType.FileCustomVariable ||
                            e.type === ElementType.RequestCustomVariable)
                )
                .forEach(element => {
                    elements.push(element);
                });
        }

        return elements;
    }
}
