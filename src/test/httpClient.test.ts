import * as assert from 'assert';
import { HttpClient } from '../utils/httpClient';
import { HttpRequest } from '../models/httpRequest';
import { SystemSettings } from '../models/configurationSettings';

suite('HttpClient Non-Regression Test Suite', () => {
    let httpClient: HttpClient;

    setup(() => {
        httpClient = new HttpClient();
    });

    test('Bearer token should remain untouched', async () => {
        const request = new HttpRequest('GET', 'http://example.com', {
            Authorization: 'Bearer total_secret_token',
        });

        const options = await (httpClient as any).prepareOptions(request, SystemSettings.Instance);

        assert.strictEqual(options.headers['Authorization'], 'Bearer total_secret_token');
        assert.strictEqual(options.username, undefined);
    });

    test('Digest auth should remove header and add afterResponse hook', async () => {
        const request = new HttpRequest('GET', 'http://example.com', {
            Authorization: 'Digest myUser myPassword',
        });

        const options = await (httpClient as any).prepareOptions(request, SystemSettings.Instance);

        assert.strictEqual(options.headers['Authorization'], undefined);
        assert.notStrictEqual(options.hooks?.afterResponse?.length, 0);
    });

    test('Proxy settings should correctly map to options.agent', async () => {
        const request = new HttpRequest('GET', 'https://example.com', {});
        const mockSettings = Object.assign({}, SystemSettings.Instance, {
            proxy: 'http://127.0.0.1:8080',
            excludeHostsForProxy: [],
        });

        const options = await (httpClient as any).prepareOptions(request, mockSettings);

        assert.ok(options.agent);
        assert.ok((options.agent as any).https, 'Should have an https proxy agent configured');
    });
});
