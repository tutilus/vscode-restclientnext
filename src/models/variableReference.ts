import { Range } from 'vscode';

export interface VariableReferenceMatch {
    name: string;
    start: number;      // Block start -> `{{`
    end: number;        // Block end -> `}}`
    nameStart: number;  // Variable start
    nameEnd: number;    // Variable end
}

export interface VariableReference {
    name: string;
    range: Range;
}