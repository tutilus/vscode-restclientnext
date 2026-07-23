import {
    CancellationToken,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    MarkdownString,
    Position,
    Range,
    TextDocument,
} from 'vscode';
import { EnvironmentController } from '../controllers/environmentController';
import { HttpResponse } from '../models/httpResponse';
import { RequestMetadata } from '../models/requestMetadata';
import { SystemSettings } from '../models/configurationSettings';
import { RequestVariableCache } from '../utils/requestVariableCache';
import { Selector } from '../utils/selector';
import { DIRECTIVE_OPTIONS } from '../utils/static/directives';

export class HttpDirectiveCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(
        document: TextDocument,
        position: Position,
        _token: CancellationToken
    ): Promise<CompletionItem[] | undefined> {
        const line = document.lineAt(position.line).text;
        const beforeCursor = line.substring(0, position.character);

        // 1. Vérifier qu'on est bien sur une ligne de commentaire
        if (!/^\s*(?:#|\/{2})\s*@/i.test(beforeCursor)) {
            return undefined;
        }

        // 2. CAS A : En train de taper le nom de la directive (# @, # @n, # @se...)
        const directiveMatch = beforeCursor.match(/^\s*(?:#|\/{2})\s*(@\w*)$/i);
        if (directiveMatch) {
            const prefix = directiveMatch[1].toLowerCase();

            return DIRECTIVE_OPTIONS.filter(d => d.name.toLowerCase().startsWith(prefix)).map(d => {
                const item = new CompletionItem(d.name, CompletionItemKind.Keyword);
                item.detail = d.detail;

                if (d.snippet) {
                    item.insertText = d.snippet;
                } else if (d.insertText) {
                    item.insertText = d.insertText;
                }

                return item;
            });
        }

        // 3. CAS B : Déjà sur la directive @set -> Logique dynamique pas-à-pas
        if (/^\s*(?:#|\/{2})\s*@set\b/i.test(beforeCursor)) {
            return this.provideSetDirectiveCompletions(document, position, beforeCursor);
        }

        return undefined;
    }

    // =========================================================================
    // LOGIQUE COMPLÈTE ET DYNAMIQUE POUR @set
    // =========================================================================

    private provideSetDirectiveCompletions(
        document: TextDocument,
        position: Position,
        beforeCursor: string
    ): CompletionItem[] | undefined {
        // B.1. Nom de la variable cible : # @set varName
        const targetMatch = beforeCursor.match(/^\s*(?:#|\/{2})\s*@set\s+([A-Za-z_]\w*)?$/i);
        if (targetMatch) {
            const prefix = targetMatch[1] ?? '';
            const sharedVariables = this.getSharedVariableNames();
            const range = new Range(
                new Position(position.line, position.character - prefix.length),
                position
            );

            return sharedVariables
                .filter(name => name.toLowerCase().startsWith(prefix.toLowerCase()))
                .map(name => {
                    const item = new CompletionItem(name, CompletionItemKind.Variable);
                    item.detail = '$shared variable';
                    item.insertText = name;
                    item.range = range;
                    return item;
                });
        }

        // B.2. Source : # @set varName = response...
        const sourceMatch = beforeCursor.match(
            /^\s*(?:#|\/{2})\s*@set\s+[A-Za-z_]\w*\s*=\s*(.*)$/i
        );
        if (sourceMatch) {
            return this.provideSourceCompletions(document, position, sourceMatch[1] ?? '');
        }

        return undefined;
    }

    private provideSourceCompletions(
        document: TextDocument,
        position: Position,
        prefix: string
    ): CompletionItem[] | undefined {
        const range = new Range(
            new Position(position.line, position.character - prefix.length),
            position
        );

        // Proposer response., response.headers. ou response.body.
        if (prefix === '' || prefix === 'response.') {
            const options =
                prefix === 'response.' ? ['response.headers.', 'response.body.'] : ['response.'];

            return options.map(option => {
                const item = new CompletionItem(option, CompletionItemKind.Field);
                item.detail = '@set source';
                item.insertText = option;
                item.range = range;
                return item;
            });
        }

        // Complétion dynamique des en-têtes (headers) issus du cache
        if (/^response\.headers\./i.test(prefix)) {
            const response = this.getCurrentRequestCachedResponse(document, position);
            if (!response) {
                return undefined;
            }

            const headerPrefix = prefix.match(/^response\.headers\.(.*)$/i)?.[1] ?? '';
            const headerRange = new Range(
                new Position(position.line, position.character - headerPrefix.length),
                position
            );

            return Object.keys(response.headers)
                .filter(h => h.toLowerCase().startsWith(headerPrefix.toLowerCase()))
                .map(headerName => {
                    const item = new CompletionItem(headerName, CompletionItemKind.Field);
                    item.detail = '@set header';
                    item.documentation = new MarkdownString(
                        `Value: \`${response.headers[headerName]}\``
                    );
                    item.insertText = headerName;
                    item.range = headerRange;
                    return item;
                });
        }

        // Complétion dynamique du corps (body / JSON path) issu du cache
        if (/^response\.body\./i.test(prefix)) {
            const response = this.getCurrentRequestCachedResponse(document, position);
            const bodyPrefix = prefix.match(/^response\.body\.(.*)$/i)?.[1] ?? '';
            const bodyRange = new Range(
                new Position(position.line, position.character - bodyPrefix.length),
                position
            );

            const options = ['*', '$.'];
            if (response) {
                try {
                    const parsedBody = JSON.parse(response.body);
                    if (
                        parsedBody &&
                        typeof parsedBody === 'object' &&
                        !Array.isArray(parsedBody)
                    ) {
                        for (const key of Object.keys(parsedBody)) {
                            options.push(`$.${key}`);
                        }
                    }
                } catch {
                    // Si le body n'est pas du JSON valide, on garde les options par défaut (*, $.)
                }
            }

            return Array.from(new Set(options))
                .filter(opt => opt.toLowerCase().startsWith(bodyPrefix.toLowerCase()))
                .map(option => {
                    const item = new CompletionItem(option, CompletionItemKind.Field);
                    item.detail = '@set body path';
                    item.insertText = option;
                    item.range = bodyRange;
                    return item;
                });
        }

        return undefined;
    }

    private getSharedVariableNames(): string[] {
        const environmentVariables = SystemSettings.Instance.environmentVariables;
        const sharedVariables =
            environmentVariables[EnvironmentController.sharedEnvironmentName] ?? {};
        return Object.keys(sharedVariables);
    }

    private getCurrentRequestCachedResponse(
        document: TextDocument,
        position: Position
    ): HttpResponse | undefined {
        const requestBlock = Selector.getDelimitedText(document.getText(), position.line);
        if (!requestBlock) {
            return undefined;
        }

        const metadatas = Selector.parseReqMetadatas(requestBlock.split(/\r?\n/g));
        const requestName = metadatas.get(RequestMetadata.Name);
        if (!requestName) {
            return undefined;
        }

        return RequestVariableCache.get(document, requestName) as HttpResponse | undefined;
    }
}
