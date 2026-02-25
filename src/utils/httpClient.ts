import * as fs from 'fs-extra';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import { CookieJar } from 'tough-cookie';
import FileCookieStore from 'tough-cookie-file-store';
import * as url from 'url';
import { Uri, window } from 'vscode';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import { IRestClientSettings, SystemSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { awsCognito } from './auth/awsCognito';
import { awsSignature } from './auth/awsSignature';
import { digest } from './auth/digest';
import { MimeUtility } from './mimeUtility';
import { getHeader, removeHeader } from './misc';
import { convertBufferToStream, convertStreamToBuffer } from './streamUtility';
import { UserDataManager } from './userDataManager';
import { getCurrentHttpFileName, getWorkspaceRootPath } from './workspaceUtility';

import got from 'got';
import { CancelableRequest, Headers, Method, OptionsOfBufferResponseBody, Response } from 'got';

const encodeUrl = require('encodeurl');

type Certificate = {
    cert?: Buffer;
    key?: Buffer;
    pfx?: Buffer;
    passphrase?: string;
};

export class HttpClient {
    private cookieStore: CookieJar;

    public constructor() {
        const cookieFilePath = UserDataManager.cookieFilePath;
        this.cookieStore = new CookieJar(new FileCookieStore(cookieFilePath));
    }

    public async send(httpRequest: HttpRequest, settings?: IRestClientSettings): Promise<HttpResponse> {
        settings = settings || SystemSettings.Instance;

        const options = await this.prepareOptions(httpRequest, settings);

        let bodySize = 0;
        let headersSize = 0;
        const requestUrl = encodeUrl(httpRequest.url);
        const request: CancelableRequest<Response<Buffer>> = got(requestUrl, options);
        httpRequest.setUnderlyingRequest(request);
        (request as any).on('response', (res: { rawHeaders: any[]; on: (arg0: string, arg1: (chunk: any) => void) => void; }) => {
            if (res.rawHeaders) {
                headersSize += res.rawHeaders.map(h => h.length).reduce((a, b) => a + b, 0);
                headersSize += (res.rawHeaders.length) / 2;
            }
            res.on('data', chunk => {
                bodySize += chunk.length;
            });
        });

        const response = await request;

        const contentType = response.headers['content-type'];
        let encoding: string | undefined;
        if (contentType) {
            encoding = MimeUtility.parse(contentType).charset;
        }

        if (!encoding) {
            encoding = "utf8";
        }

        const bodyBuffer = response.body;
        let bodyString = iconv.encodingExists(encoding) ? iconv.decode(bodyBuffer, encoding) : bodyBuffer.toString();

        if (settings.decodeEscapedUnicodeCharacters) {
            bodyString = this.decodeEscapedUnicodeCharacters(bodyString);
        }

        // adjust response header case, due to the response headers in nodejs http module is in lowercase
        const responseHeaders: ResponseHeaders = HttpClient.normalizeHeaderNames(response.headers, response.rawHeaders);

        const requestBody = options.body;

        return new HttpResponse(
            response.statusCode,
            response.statusMessage!,
            response.httpVersion,
            responseHeaders,
            bodyString,
            bodySize,
            headersSize,
            bodyBuffer,
            response.timings.phases,
            new HttpRequest(
                options.method!,
                requestUrl,
                HttpClient.normalizeHeaderNames(
                    (response as any).request.options.headers as RequestHeaders,
                    Object.keys(httpRequest.headers)),
                Buffer.isBuffer(requestBody)
                    ? convertBufferToStream(requestBody)
                    : (typeof requestBody === 'string' || requestBody === undefined
                        ? requestBody
                        : undefined),
                httpRequest.rawBody,
                httpRequest.name
            ));
    }

    public async clearCookies() {
        await fs.remove(UserDataManager.cookieFilePath);
        this.cookieStore = new CookieJar(new FileCookieStore(UserDataManager.cookieFilePath));
    }

    private async prepareOptions(httpRequest: HttpRequest, settings: IRestClientSettings): Promise<OptionsOfBufferResponseBody> {
        const originalRequestBody = httpRequest.body;
        let requestBody: string | Buffer | undefined;
        if (originalRequestBody) {
            if (typeof originalRequestBody !== 'string') {
                requestBody = await convertStreamToBuffer(originalRequestBody);
            } else {
                requestBody = originalRequestBody;
            }
        }

        // Fix #682 Do not touch original headers in httpRequest, which may be used for retry later
        // Simply do a shadow copy here
        const clonedHeaders = Object.assign({}, httpRequest.headers);

        const options: OptionsOfBufferResponseBody = {
            headers: clonedHeaders as any as Headers,
            method: httpRequest.method as any as Method,
            body: requestBody,
            responseType: 'buffer',
            decompress: true,
            followRedirect: settings.followRedirect,
            throwHttpErrors: false,
            retry: { limit: 0 },
            hooks: {
                afterResponse: [],
                beforeRequest: [],
            },
            https: {
                rejectUnauthorized: false
            }
        };

        if (settings.timeoutInMilliseconds > 0) {
            options.timeout = { request: settings.timeoutInMilliseconds };
        }

        if (settings.rememberCookiesForSubsequentRequests) {
            options.cookieJar = this.cookieStore;
        }

        const authorization = getHeader(options.headers!, 'Authorization') as string | undefined;
        if (authorization) {
            const [scheme, user, ...args] = authorization.split(/\s+/);
            const normalizedScheme = scheme.toLowerCase();

            switch (normalizedScheme) {
                case 'basic':
                    // No password means user is basé64 encoded user:password
                    if (args.length > 0) {
                        removeHeader(options.headers!, 'Authorization');
                        // Issue #8 : Check if the username contains ":", if yes, split it into username and password
                        var username = user;
                        var password = args.join(' ');
                        if (user.includes(':')) {
                            const [userPart, ...firstChunkPass] = user.split(':');
                            username = userPart;
                            password = [...firstChunkPass, ...args].join(' ');
                        }
                        options.username = username;
                        options.password = password;
                    }
                    break;
                case 'digest':
                    if (args.length > 0) {
                        const pass = args.join(' ');
                        removeHeader(options.headers!, 'Authorization');
                        options.hooks!.afterResponse!.push(digest(user, pass));
                    }
                    break;
                case 'bearer':
                    // Keep the Authorization header as is.
                    break;
                case 'aws':
                    if (args.length >= 3) {
                       removeHeader(options.headers!, 'Authorization');
                        options.hooks!.beforeRequest!.push(awsSignature(authorization));
                    } else {
                        window.showWarningMessage(`Invalid AWS authorization header, the format should be "Authorization: AWS [region:<region>] [service:<service>] [token:<sessionToken>] <accessKeyId> <secretAccessKey>". The Authorization header will be sent as is.`);
                    }
                    break;
                case 'cognito':
                    if (args.length >= 4) {
                       removeHeader(options.headers!, 'Authorization');
                       options.hooks!.beforeRequest!.push(await awsCognito(authorization));
                    } else {
                        window.showWarningMessage(`Invalid Cognito authorization header, the format should be "Authorization: Cognito [...] <username> <password> <userPoolId> <clientId>". The Authorization header will be sent as is.`);
                    }
                    break;
                default:
                    window.showWarningMessage(`Authorization scheme ${scheme} is not supported, the Authorization header will be sent as is.`);
            }
 
        }

        // set certificate
        const certificate = this.getRequestCertificate(httpRequest.url, settings);
        Object.assign(options, certificate);

        // set proxy
        if (
            settings.proxy &&
            !HttpClient.ignoreProxy(httpRequest.url, settings.excludeHostsForProxy)
        ) {
            if (httpRequest.url.startsWith('http:')) {
                const { HttpProxyAgent } = await import('http-proxy-agent');
                options.agent = {
                    http: new HttpProxyAgent(settings.proxy)
                };
            } else {
                const { HttpsProxyAgent } = await import('https-proxy-agent');
                options.agent = {
                    https: new HttpsProxyAgent(settings.proxy)
                };
            }
        }

        return options;
    }

    private decodeEscapedUnicodeCharacters(body: string): string {
        return body.replace(/\\u([0-9a-fA-F]{4})/gi, (_, g) => {
            const char = String.fromCharCode(parseInt(g, 16));
            return char === '"' ? '\\"' : char;
        });
    }

    private getRequestCertificate(requestUrl: string, settings: IRestClientSettings): Certificate | null {
        const host = url.parse(requestUrl).host;
        if (!host || !(host in settings.hostCertificates)) {
            return null;
        }

        const { cert: certPath, key: keyPath, pfx: pfxPath, passphrase } = settings.hostCertificates[host];
        const cert = this.resolveCertificate(certPath);
        const key = this.resolveCertificate(keyPath);
        const pfx = this.resolveCertificate(pfxPath);
        return { cert, key, pfx, passphrase };
    }

    private static ignoreProxy(requestUrl: string, excludeHostsForProxy: string[]): Boolean {
        if (!excludeHostsForProxy || excludeHostsForProxy.length === 0) {
            return false;
        }

        const resolvedUrl = url.parse(requestUrl);
        const hostName = resolvedUrl.hostname?.toLowerCase();
        const port = resolvedUrl.port;
        const excludeHostsProxyList = Array.from(new Set(excludeHostsForProxy.map(eh => eh.toLowerCase())));

        for (const eh of excludeHostsProxyList) {
            const urlParts = eh.split(":");
            if (!port) {
                // if no port specified in request url, host name must exactly match
                if (urlParts.length === 1 && urlParts[0] === hostName) {
                    return true;
                }
            } else {
                // if port specified, match host without port or hostname:port exactly match
                const [ph, pp] = urlParts;
                if (ph === hostName && (!pp || pp === port)) {
                    return true;
                }
            }
        }

        return false;
    }

    private resolveCertificate(absoluteOrRelativePath: string | undefined): Buffer | undefined {
        if (absoluteOrRelativePath === undefined) {
            return undefined;
        }

        if (path.isAbsolute(absoluteOrRelativePath)) {
            if (!fs.existsSync(absoluteOrRelativePath)) {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
                return undefined;
            } else {
                return fs.readFileSync(absoluteOrRelativePath);
            }
        }

        // the path should be relative path
        const rootPath = getWorkspaceRootPath();
        let absolutePath = '';
        if (rootPath) {
            absolutePath = path.join(Uri.parse(rootPath).fsPath, absoluteOrRelativePath);
            if (fs.existsSync(absolutePath)) {
                return fs.readFileSync(absolutePath);
            } else {
                window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
                return undefined;
            }
        }

        const currentFilePath = getCurrentHttpFileName();
        if (!currentFilePath) {
            return undefined;
        }

        absolutePath = path.join(path.dirname(currentFilePath), absoluteOrRelativePath);
        if (fs.existsSync(absolutePath)) {
            return fs.readFileSync(absolutePath);
        } else {
            window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
            return undefined;
        }
    }

    private static normalizeHeaderNames<T extends RequestHeaders | ResponseHeaders>(headers: T, rawHeaders: string[]): T {
        const headersDic: { [key: string]: string } = rawHeaders.reduce(
            (prev: { [key: string]: string }, cur: string) => {
                if (!(cur.toLowerCase() in prev)) {
                    prev[cur.toLowerCase()] = cur;
                }
                return prev;
            }, {});
        const adjustedResponseHeaders = {} as RequestHeaders | ResponseHeaders;
        for (const header in headers) {
            const adjustedHeaderName = headersDic[header] || header;
            adjustedResponseHeaders[adjustedHeaderName] = headers[header];
        }

        return adjustedResponseHeaders as T;
    }
}
