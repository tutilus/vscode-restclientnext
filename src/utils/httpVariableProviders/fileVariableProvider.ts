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

type ParseReason = 'descriptionMark' | 'commentMark' | 'endOfString' | 'endOfLine';

export class FileVariableProvider implements HttpVariableProvider {
    private static _instance: FileVariableProvider;

    public static get Instance(): FileVariableProvider {
        if (!this._instance) {
            this._instance = new FileVariableProvider();
        }

        return this._instance;
    }

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
        let values: string[] = [];
        let descs: string[] = [];
        let remaining = rightSide;
        let reason: ParseReason = 'endOfLine';
        
        do {
            const parsed = this.parseQuotedValue(remaining, true);
            values.push(parsed.value);
            remaining = parsed.remaining;
            reason = parsed.reason;
        } while (reason === 'endOfString');

        if ( reason === 'descriptionMark') {
            do {
                const parsed = this.parseQuotedValue(remaining);
                descs.push(parsed.value);
                remaining = parsed.remaining;
                reason = parsed.reason;
            } while (reason === 'endOfString');
            
            return { value: values.join(' '), description: descs.join(' ') };
        }

        return { value: values.join(' '), description: undefined };
    }

    private parseQuotedValue(value: string, stopAtPipe: boolean = false): { value: string; remaining: string; reason: ParseReason } {
        let quoteChar = '';
        let inQuote = false;
        let inEscape = false;
        let reason: ParseReason = 'endOfLine';
        let chunk = '';
        let idx = 0;
        // Trim trailing whitespace but preserve leading for quote detection
        let trimmed = value.trimEnd();

        if (trimmed.length === 0) {
            return { value: '', remaining: '', reason };
        }
        // Check if I am looking for a quoted value
        if (trimmed[0] === '"' || trimmed[0] === "'") {
            quoteChar = trimmed[0];
            inQuote = true;
            idx = 1;
        }

        while (idx < trimmed.length) {

            if (trimmed[idx] === '"' || trimmed[idx] === "'") {
                // Handle escape character first
                if (inEscape) {
                    chunk += trimmed[idx];
                    inEscape = false;
                    idx++;
                    continue;
                }

                if (inQuote && trimmed[idx] === quoteChar) {
                    return { value: chunk, remaining: trimmed.slice(idx + 1).trim(), reason: 'endOfString' };
                }
                chunk += trimmed[idx];

            } else if (trimmed[idx] === '\\' && inQuote) {
                if (inEscape) {
                    inEscape = false;
                    chunk += trimmed[idx];
                    idx++;
                    continue;
                } 
                inEscape = true;
                
            } else if (trimmed[idx] === '|' && !inQuote && stopAtPipe) {
                return { value: chunk, remaining: trimmed.slice(idx + 1).trim(), reason: 'descriptionMark' };
        
            } else if (trimmed[idx] === '#' && !inQuote) {
                // Start of comment, stop processing further  
                reason = 'commentMark';
                break;
            } else {
                if (inEscape) {
                    // Handle common escape sequences
                    switch (trimmed[idx]) {
                        case 'n':
                            chunk += '\n';
                            break;
                        case 'r':
                            chunk += '\r';
                            break;
                        case 't':
                            chunk += '\t';
                            break;
                        default:
                            chunk += trimmed[idx];
                    }
                    inEscape = false;
                } else {
                    chunk += trimmed[idx];
                }
            }
            idx++;
        }
        if (inEscape) {
            // Handle dangling escape character at end of string
            chunk += '\\';
        }
        return { value: chunk, remaining: trimmed.slice(idx).trim(), reason };
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