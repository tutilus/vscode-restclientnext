import { MarkdownString, SnippetString } from 'vscode';
import { HttpVariableValue } from '../../models/httpVariable';
import { ElementType, HttpElement } from '../../models/httpElement';

export function buildRequestVariableHttpElement(
    name: string,
    value: HttpVariableValue | undefined
): HttpElement {
    const v = new MarkdownString(`Value: Request Variable ${name}${value ? '' : ' *(Inactive)*'}`);
    return new HttpElement(
        name,
        ElementType.RequestCustomVariable,
        null,
        v,
        new SnippetString(
            `{{${name}.\${1|request,response|}.\${2|headers,body|}.\${3:Header Name, *(Full Body), JSONPath or XPath}}}`
        )
    );
}

export function buildPromptVariableHttpElement(
    name: string,
    description: string | undefined
): HttpElement {
    const v = new MarkdownString(
        `${description ? `Description: ${description}` : `Prompt Variable: \`${name}\``}`
    );

    return new HttpElement(
        name,
        ElementType.PromptVariable,
        '^\\s*[^@]',
        v,
        new SnippetString(`{{${name}}}`)
    );
}

export function buildEnvironmentVariableHttpElement(
    name: string,
    value: HttpVariableValue | undefined
): HttpElement {
    return new HttpElement(
        name,
        ElementType.EnvironmentCustomVariable,
        null,
        new MarkdownString(`Value: \`${value}\``),
        new SnippetString(`{{${name}}}`)
    );
}

export function buildFileVariableHttpElement(
    name: string,
    value: HttpVariableValue | undefined
): HttpElement {
    return new HttpElement(
        name,
        ElementType.FileCustomVariable,
        '^\\s*[^@]',
        new MarkdownString(`Value: \`${value}\``),
        new SnippetString(`{{${name}}}`)
    );
}

export function buildUrlHttpElement(requestUrl: string): HttpElement | null {
    try {
        const parsedUrl = new URL(requestUrl);
        const prefixLength = parsedUrl.protocol.length + 2;
        const urlWithoutProtocol = requestUrl.slice(prefixLength);

        return new HttpElement(
            urlWithoutProtocol,
            ElementType.URL,
            '^\\s*(?:(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|LOCK|UNLOCK|PROPFIND|PROPPATCH|COPY|MOVE|MKCOL|MKCALENDAR|ACL|SEARCH)\\s+)https?\\:\\/{2}'
        );
    } catch (error) {
        // Doesn't really matter if a bad Url from history doesn't comme back in completion
        console.warn(
            `[HttpElementFactory] Impossible to parse Url from history: "${requestUrl}"`,
            error
        );
        return null;
    }
}
