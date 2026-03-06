import { CancellationToken, CodeLens, CodeLensProvider, Command, Range, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { Selector } from '../utils/selector';

export class HttpCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, _token: CancellationToken): Promise<CodeLens[]> {
        const blocks: CodeLens[] = [];
        const lines: string[] = document.getText().split(Constants.LineSplitterRegex);
        const requestRanges: [number, number][] = Selector.getRequestRanges(lines);

        // Add "Send All Requests" code lens at the top if there are at least 2 requests
        if (requestRanges.length >= 2) {
            const cmd: Command = {
                arguments: [document],
                title: 'Send All Requests Sequentially',
                command: 'rest-client.run-all-requests-sequentially'
            };
            blocks.push(new CodeLens(new Range(0, 0, 0, 0), cmd));
        }

        for (const [blockStart, blockEnd] of requestRanges) {
            const range = new Range(blockStart, 0, blockEnd, 0);
            const cmd: Command = {
                arguments: [document, range],
                title: 'Send Request',
                command: 'rest-client.request'
            };
            blocks.push(new CodeLens(range, cmd));
        }

        return Promise.resolve(blocks);
    }
}