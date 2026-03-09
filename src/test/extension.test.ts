import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('File variable parsing should handle quoted values, descriptions, and comments', async () => {
		const { FileVariableProvider } = require('../utils/httpVariableProviders/fileVariableProvider');
		const provider = new FileVariableProvider();
		
		// Access the private method for testing
		const parseMethod = (provider as any).parseVariableValueAndDescription;
		
		const testCases: Array<{
			input: string, 
			expectedValue: string, 
			expectedDesc?: string,
			description?: string // test case description
		}> = [
			// Basic cases
			{ input: 'abcd', expectedValue: 'abcd' },
			{ input: 'abcd | description', expectedValue: 'abcd', expectedDesc: 'description' },
			
			// Quoted values
			{ input: '"abcd"', expectedValue: 'abcd' },
			{ input: "'abcd'", expectedValue: 'abcd' },
			{ input: '"abcd" | description', expectedValue: 'abcd', expectedDesc: 'description' },
			
			// Pipe inside quotes
			{ input: '"abcd | desc"', expectedValue: 'abcd | desc' },
			{ input: '"abcd | desc" | description', expectedValue: 'abcd | desc', expectedDesc: 'description' },
			
			// Escape sequences
			{ input: '"ab\\"cd"', expectedValue: 'ab"cd' },
			{ input: '"ab\\ncd"', expectedValue: 'ab\ncd' },
			{ input: 'ab\\ncd', expectedValue: 'ab\ncd' },
			
			// Trailing comments (new feature)
			{ input: 'abcd # comment', expectedValue: 'abcd', description: 'Comment should be stripped' },
			{ input: 'abcd | description # comment', expectedValue: 'abcd', expectedDesc: 'description', description: 'Comment after description' },
			{ input: '"abcd" # comment', expectedValue: 'abcd', description: 'Comment after quoted value' },
			{ input: '"abcd | desc" # comment', expectedValue: 'abcd | desc', description: 'Comment after value with pipe' },
			{ input: '"abcd" | description # comment', expectedValue: 'abcd', expectedDesc: 'description', description: 'Comment after description' },
			
			// Edge case: # inside quotes should not be treated as comment
			{ input: '"abcd # not a comment"', expectedValue: 'abcd # not a comment' },
			{ input: '"abcd # not a comment" | description', expectedValue: 'abcd # not a comment', expectedDesc: 'description' },
		];
		
		for (const { input, expectedValue, expectedDesc, description } of testCases) {
			const result = parseMethod.call(provider, input);
			assert.strictEqual(result.value, expectedValue, `Value mismatch for input: "${input}"${description ? ` (${description})` : ''}`);
			if (expectedDesc !== undefined) {
				assert.strictEqual(result.description, expectedDesc, `Description mismatch for input: "${input}"${description ? ` (${description})` : ''}`);
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