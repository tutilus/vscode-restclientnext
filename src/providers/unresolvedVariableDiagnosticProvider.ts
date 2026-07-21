import {
    Diagnostic,
    DiagnosticCollection,
    DiagnosticSeverity,
    languages,
    TextDocument,
    workspace,
    Disposable,
} from 'vscode';
import { VariableUtility } from '../utils/variableUtility';
import { VariableProcessor } from '../utils/variableProcessor';

export class UnresolvedVariableDiagnosticProvider implements Disposable {
    private static readonly LANGUAGE_ID = 'http';
    private static readonly SOURCE = 'REST Client Next';
    private static readonly CODE_UNDEFINED = 'undefined-variable';
    private static readonly CODE_UNRESOLVED = 'unresolved-variable';

    private readonly diagnosticCollection: DiagnosticCollection;
    private readonly disposables: Disposable[] = [];

    constructor() {
        this.diagnosticCollection = languages.createDiagnosticCollection(
            UnresolvedVariableDiagnosticProvider.SOURCE
        );
        this.disposables.push(this.diagnosticCollection);

        // Workspace listeners
        workspace.onDidOpenTextDocument(this.analyzeDocument, this, this.disposables);
        workspace.onDidChangeTextDocument(
            e => this.analyzeDocument(e.document),
            this,
            this.disposables
        );
        workspace.onDidCloseTextDocument(
            doc => this.diagnosticCollection.delete(doc.uri),
            this,
            this.disposables
        );

        // Analyze opened documents
        workspace.textDocuments.forEach(this.analyzeDocument, this);
    }

    private async analyzeDocument(document: TextDocument): Promise<void> {
        if (document.languageId !== UnresolvedVariableDiagnosticProvider.LANGUAGE_ID) {
            return;
        }

        const references = VariableUtility.getDocumentVariables(document);
        if (references.length === 0) {
            this.diagnosticCollection.delete(document.uri);
            return;
        }

        const diagnostics: Diagnostic[] = [];

        await Promise.all(
            references.map(async ref => {
                const resolved = await VariableProcessor.resolveVariable(ref.name, document);

                if (!resolved || resolved.error || resolved.warning) {
                    const message = !resolved
                        ? `Undefined variable '${ref.name}'.`
                        : resolved.error || resolved.warning;
                    const severity =
                        resolved && resolved.warning
                            ? DiagnosticSeverity.Warning
                            : DiagnosticSeverity.Error;

                    const diagnostic = new Diagnostic(ref.range, message, severity);

                    diagnostic.source = UnresolvedVariableDiagnosticProvider.SOURCE;
                    diagnostic.code = !resolved
                        ? UnresolvedVariableDiagnosticProvider.CODE_UNDEFINED
                        : UnresolvedVariableDiagnosticProvider.CODE_UNRESOLVED;

                    diagnostics.push(diagnostic);
                }
            })
        );

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
