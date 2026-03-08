import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('File variable parsing should handle quoted values and descriptions', async () => {
		const { FileVariableProvider } = require('../utils/httpVariableProviders/fileVariableProvider');
		const provider = new FileVariableProvider();
		
		// Access the private method via type assertion for testing
		const parseMethod = (provider as any).parseVariableValueAndDescription;
		
		const testCases: Array<{input: string, expectedValue: string, expectedDesc?: string}> = [
			// Basic cases without quotes
			{ input: 'abcd', expectedValue: 'abcd' },
			{ input: 'abcd | description', expectedValue: 'abcd', expectedDesc: 'description' },
			
			// Quoted values without description
			{ input: '"abcd"', expectedValue: 'abcd' },
			{ input: "'abcd'", expectedValue: 'abcd' },
			
			// Quoted values with description
			{ input: '"abcd" | description', expectedValue: 'abcd', expectedDesc: 'description' },
			{ input: "'abcd' | description", expectedValue: 'abcd', expectedDesc: 'description' },
			
			// Quoted values containing pipe - no description
			{ input: '"abcd | desc"', expectedValue: 'abcd | desc' },
			{ input: "'abcd | desc'", expectedValue: 'abcd | desc' },
			
			// Quoted values containing pipe with description
			{ input: '"abcd | desc" | description', expectedValue: 'abcd | desc', expectedDesc: 'description' },
			{ input: "'abcd | desc' | description", expectedValue: 'abcd | desc', expectedDesc: 'description' },
			
			// With escape sequences
			{ input: '"ab\\"cd"', expectedValue: 'ab"cd' },
			{ input: '"ab\\ncd"', expectedValue: 'ab\ncd' },
			{ input: 'ab\\ncd', expectedValue: 'ab\ncd' },
		];
		
		for (const { input, expectedValue, expectedDesc } of testCases) {
			const result = parseMethod.call(provider, input);
			assert.strictEqual(result.value, expectedValue, `Value mismatch for input: "${input}"`);
			if (expectedDesc !== undefined) {
				assert.strictEqual(result.description, expectedDesc, `Description mismatch for input: "${input}"`);
			} else {
				assert.strictEqual(result.description, undefined, `Expected no description for input: "${input}"`);
			}
		}
	});

	test('File variable regex captures correctly', () => {
		const { FileVariableDefinitionRegex } = require('../common/constants');
		
		let match = FileVariableDefinitionRegex.exec('@apiKey = abc123');
		assert.ok(match);
		assert.strictEqual(match[1], 'apiKey');
		assert.strictEqual(match[2], 'abc123');
		
		match = FileVariableDefinitionRegex.exec('@port = 8080 | Port number');
		assert.ok(match);
		assert.strictEqual(match[1], 'port');
		assert.strictEqual(match[2], '8080 | Port number');
		
		match = FileVariableDefinitionRegex.exec('@var = "abcd | desc" | my desc');
		assert.ok(match);
		assert.strictEqual(match[1], 'var');
		assert.strictEqual(match[2], '"abcd | desc" | my desc');
	});
});