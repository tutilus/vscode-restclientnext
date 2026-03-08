import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { DocumentCache } from '../../models/documentCache';
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { EnvironmentVariableProvider } from './environmentVariableProvider';
import { HttpVariable, HttpVariableProvider } from './httpVariableProvider';
import { RequestVariableProvider } from './requestVariableProvider';
import { SystemVariableProvider } from './systemVariableProvider';

type FileVariableValue = {
    name: string;
    value: string;
    description?: string;
};

export class FileVariableProvider implements HttpVariableProvider {
    private static _instance: FileVariableProvider;

    public static get Instance(): FileVariableProvider {
        if (!this._instance) {
            this._instance = new FileVariableProvider();
        }

        return this._instance;
    }

    private readonly escapee: Map<string, string> = new Map<string, string>([
        ['n', '\n'],
        ['r', '\r'],
        ['t', '\t']
    ]);

    private readonly innerVariableProviders: HttpVariableProvider[] = [
        SystemVariableProvider.Instance,
        RequestVariableProvider.Instance,
        EnvironmentVariableProvider.Instance,
    ];

    private readonly fileVariableCache = new DocumentCache<FileVariableValue[]>();

    private constructor() {
    }

    public readonly type: VariableType = VariableType.File;

    public async has(name: string, document: TextDocument): Promise<boolean> {
        name = name.replace(/^%/, "");
        const variables = await this.getFileVariables(document);
        return variables.some(v => v.name === name);
    }

    public async get(name: string, document: TextDocument): Promise<HttpVariable> {
        const isEncoded = name.startsWith("%");
        name = name.replace(/^%/, "");
        const variables = await this.getFileVariables(document);
        const variable = variables.find(v => v.name === name);
        if (!variable) {
            return { name, error: ResolveErrorMessage.FileVariableNotExist };
        } else {
            const variableMap = await this.resolveFileVariables(document, variables);
            let value = variableMap.get(name);
            if (value !== undefined && isEncoded) {
                value = encodeURIComponent(value);
            }
            return { name, value, description: variable.description };
        }
    }

    public async getAll(document: TextDocument): Promise<HttpVariable[]> {
        const variables = await this.getFileVariables(document);
        const variableMap = await this.resolveFileVariables(document, variables);
        const variableMapWithDescriptions = new Map(variables.map(v => [v.name, v.description]));
        return [...variableMap.entries()].map(([name, value]) => ({
            name,
            value,
            description: variableMapWithDescriptions.get(name)
        }));
    }

    private async getFileVariables(document: TextDocument): Promise<FileVariableValue[]> {
        if (this.fileVariableCache.has(document)) {
            return this.fileVariableCache.get(document)!;
        }

        const fileContent = document.getText();
        const variables = new Map<string, FileVariableValue>();
        for (const line of fileContent.split(Constants.LineSplitterRegex)) {
            const match = Constants.FileVariableDefinitionRegex.exec(line);
            if (!match) { continue; }
            
            const [, key, rightSide] = match;
            const { value, description } = this.parseVariableValueAndDescription(rightSide);
            const fileVar: FileVariableValue = { name: key, value };
            if (description !== undefined) {
                fileVar.description = description;
            }
            variables.set(key, fileVar);
        }

        const values = [...variables.values()];
        this.fileVariableCache.set(document, values);
        return values;
    }

    private parseVariableValueAndDescription(rightSide: string): { value: string; description?: string } {
        // Trim trailing whitespace but preserve leading for quote detection
        let trimmed = rightSide.trimEnd();
        
        // Check if the value starts with a quote
        if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
            const quoteChar = trimmed[0];
            let value = '';
            let i = 1;
            let inEscape = false;
            
            while (i < trimmed.length) {
                const char = trimmed[i];
                if (inEscape) {
                    value += char;
                    inEscape = false;
                } else if (char === '\\') {
                    inEscape = true;
                } else if (char === quoteChar) {
                    // Found closing quote
                    i++; // Move past closing quote
                    // Check if there's a | description after
                    const remainder = trimmed.slice(i).trimLeft();
                    if (remainder.startsWith('|')) {
                        const desc = remainder.slice(1).trim();
                        return { value, description: desc };
                    }
                    return { value };
                } else {
                    value += char;
                }
                i++;
            }
            // No closing quote found, treat whole rightSide as value (after processing escapes as we go)
            // We need to process escape sequences in the value
            return { value: this.processEscapes(rightSide) };
        }

        // Non-quoted value: look for | that's not inside any quotes
        let inQuote = false;
        let currentQuoteChar = '';
        let pipeIndex = -1;
        
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            if (inQuote) {
                if (char === currentQuoteChar) {
                    inQuote = false;
                }
            } else if (char === '"' || char === "'") {
                inQuote = true;
                currentQuoteChar = char;
            } else if (char === '|') {
                pipeIndex = i;
                break;
            }
        }

        if (pipeIndex !== -1) {
            const rawValue = trimmed.slice(0, pipeIndex).trimRight();
            const description = trimmed.slice(pipeIndex + 1).trimLeft();
            const value = this.processEscapes(rawValue);
            return { value, description };
        }

        return { value: this.processEscapes(trimmed) };
    }

    private processEscapes(value: string): string {
        let result = '';
        let isPrevCharEscape = false;
        for (const currentChar of value) {
            if (isPrevCharEscape) {
                isPrevCharEscape = false;
                result += this.escapee.get(currentChar) || currentChar;
            } else {
                if (currentChar === "\\") {
                    isPrevCharEscape = true;
                    continue;
                }
                result += currentChar;
            }
        }
        return result;
    }

    private async resolveFileVariables(document: TextDocument, variables: FileVariableValue[]): Promise<Map<string, string>> {
        // Resolve non-file variables in variable value
        const fileVariableNames = new Set(variables.map(v => v.name));
        const resolvedVariables = await Promise.all(variables.map(
            async ({ name, value }) => {
                const parsedValue = await this.processNonFileVariableValue(document, value, fileVariableNames);
                return { name, value: parsedValue };
            }
        ));

        const variableMap = new Map(resolvedVariables.map(({ name, value }): [string, string] => [name, value]));
        const dependentVariables = new Map<string, string[]>();
        const dependencyCount = new Map<string, number>();
        const noDependencyVariables: string[] = [];
        for (const [name, value] of variableMap) {
            const dependentVariableNames = new Set(this.resolveDependentFileVariableNames(value).filter(v => variableMap.has(v)));
            if (dependentVariableNames.size === 0) {
                noDependencyVariables.push(name);
            } else {
                dependencyCount.set(name, dependentVariableNames.size);
                dependentVariableNames.forEach(dname => {
                    if (dependentVariables.has(dname)) {
                        dependentVariables.get(dname)!.push(name);
                    } else {
                        dependentVariables.set(dname, [name]);
                    }
                });
            }
        }

        // Resolve all dependent file variables to actual value
        while (noDependencyVariables.length !== 0) {
            const current = noDependencyVariables.shift();
            if (!dependentVariables.has(current!)) {
                continue;
            }
            const dependents = dependentVariables.get(current!);
            dependents!.forEach(d => {
                const originalValue = variableMap.get(d);
                const currentValue = originalValue!.replace(
                    new RegExp(`{{\\s*${current}\\s*}}`, 'g'),
                    variableMap.get(current!)!);
                variableMap.set(d, currentValue);
                const newCount = dependencyCount.get(d)! - 1;
                if (newCount === 0) {
                    noDependencyVariables.push(d);
                    dependencyCount.delete(d);
                } else {
                    dependencyCount.set(d, newCount);
                }
            });
        }

        return variableMap;
    }

    private async processNonFileVariableValue(document: TextDocument, value: string, variables: Set<string>): Promise<string> {
        const variableReferenceRegex = /\{{2}(.+?)\}{2}/g;
        let result = '';
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        variable:
        while (match = variableReferenceRegex.exec(value)) {
            result += value.substring(lastIndex, match.index);
            lastIndex = variableReferenceRegex.lastIndex;
            const name = match[1].trim();
            if (!variables.has(name)) {
                const context = { rawRequest: value, parsedRequest: result };
                for (const provider of this.innerVariableProviders) {
                    if (await provider.has(name, document, context)) {
                        const { value, error, warning } = await provider.get(name, document, context);
                        if (!error && !warning) {
                            result += value;
                            continue variable;
                        } else {
                            break;
                        }
                    }
                }
            }

            result += `{{${name}}}`;
        }
        result += value.substring(lastIndex);
        return result;
    }

    private resolveDependentFileVariableNames(value: string): string[] {
        const variableReferenceRegex = /\{{2}(.+?)\}{2}/g;
        let match: RegExpExecArray | null;
        const result: string[] = [];
        while (match = variableReferenceRegex.exec(value)) {
            result.push(match[1].trim());
        }
        return result;
    }
}