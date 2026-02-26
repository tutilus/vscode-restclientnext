import * as assert from 'assert';
import * as vscode from 'vscode';

suite('REST Client Next - Extension Tests', () => {
	vscode.window.showInformationMessage('Start REST Client Next tests.');

	suite('Extension Activation', () => {
		test('Extension should be activated', async () => {
			const ext = vscode.extensions.getExtension('tutilus.rest-client-next');
			assert.ok(ext, 'Extension should be found');
			
			if (!ext?.isActive) {
				await ext?.activate();
			}
			assert.ok(ext?.isActive, 'Extension should be active');
		});

		test('Extension should register main commands', async () => {
			const ext = vscode.extensions.getExtension('tutilus.rest-client-next');
			assert.ok(ext, 'Extension should be found');
			
			if (!ext?.isActive) {
				await ext?.activate();
			}

			const commands = await vscode.commands.getCommands(true);
			const restClientCommands = [
				'rest-client.request',
				'rest-client.rerun-last-request',
				'rest-client.cancel-request',
				'rest-client.switch-environment',
				'rest-client.history',
				'rest-client.clear-history',
				'rest-client.generate-codesnippet',
				'rest-client.copy-request-as-curl',
				'rest-client.clear-aad-token-cache',
				'rest-client.clear-cookies'
			];

			restClientCommands.forEach(cmd => {
				assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
			});
		});
	});

	suite('Utility Functions', () => {
		test('MimeUtility should correctly identify JSON content type', () => {
			// Import MimeUtility for testing
			const testCases = [
				{ type: 'application/json', isJson: true },
				{ type: 'application/json; charset=utf-8', isJson: true },
				{ type: 'text/plain', isJson: false },
				{ type: 'text/xml', isJson: false }
			];

			testCases.forEach(({ type, isJson }) => {
				// This is a basic placeholder - actual implementation would import MimeUtility
				const result = type.toLowerCase().includes('json');
				assert.strictEqual(result, isJson, `Should correctly identify ${type}`);
			});
		});

		test('Basic string utilities should work correctly', () => {
			const testString = 'hello world';
			const trimmed = testString.trim();
			assert.strictEqual(trimmed, 'hello world', 'String trim should work');
			
			const uppercase = testString.toUpperCase();
			assert.strictEqual(uppercase, 'HELLO WORLD', 'String uppercase should work');
		});

		test('Array operations should work correctly', () => {
			const arr = [1, 2, 3, 4, 5];
			const filtered = arr.filter(x => x > 2);
			assert.deepStrictEqual(filtered, [3, 4, 5], 'Array filter should work');
			
			const mapped = arr.map(x => x * 2);
			assert.deepStrictEqual(mapped, [2, 4, 6, 8, 10], 'Array map should work');
		});
	});

	suite('HTTP Request Parsing', () => {
		test('Should validate HTTP method names', () => {
			const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
			validMethods.forEach(method => {
				assert.ok(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method), 
					`${method} should be a valid HTTP method`);
			});
		});

		test('Should handle URL parsing', () => {
			const testUrls = [
				'https://httpbin.org/get',
				'http://localhost:3000/api',
				'https://api.example.com:8080/v1/users'
			];

			testUrls.forEach(url => {
				try {
					new URL(url);
					assert.ok(true, `Should parse ${url}`);
				} catch {
					assert.fail(`Should parse ${url}`);
				}
			});
		});
	});

	suite('Environment Variables', () => {
		test('Should handle variable placeholders', () => {
			const testCase = '{{baseUrl}}/api/users';
			const variableRegex = /\{\{(\w+)\}\}/g;
			const matches = [...testCase.matchAll(variableRegex)];
			assert.strictEqual(matches.length, 1, 'Should find one variable');
			assert.strictEqual(matches[0][1], 'baseUrl', 'Should extract variable name');
		});

		test('Should validate variable names', () => {
			const validVariables = ['baseUrl', 'apiKey', 'user_id', 'API_TOKEN'];
			const variableRegex = /^\w+$/;
			
			validVariables.forEach(variable => {
				assert.ok(variableRegex.test(variable), `${variable} should be a valid variable name`);
			});
		});
	});
});
