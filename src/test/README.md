# REST Client Next - Test Suite

## Overview

This directory contains unit tests for the REST Client Next VS Code extension.

## Test Structure

The test suite (`extension.test.ts`) is organized into the following test suites:

### 1. Extension Activation Tests
- **Verifies extension activation**: Ensures the extension can be activated without errors
- **Validates command registration**: Checks that all 10+ main commands are properly registered

### 2. Utility Function Tests
- **MIME type detection**: Tests identification of JSON content types
- **String utilities**: Validates basic string operations (trim, uppercase)
- **Array operations**: Tests array filtering and mapping

### 3. HTTP Request Parsing Tests
- **HTTP method validation**: Verifies support for standard HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- **URL parsing**: Tests URL validation and parsing with Node.js URL API

### 4. Environment Variables Tests
- **Variable placeholder detection**: Tests regex matching for `{{variableName}}` patterns
- **Variable name validation**: Ensures variable names follow valid patterns

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in watch mode:
```bash
npm run watch-tests
```

### Compile tests only:
```bash
npm run compile-tests
```

## Test Output

When tests run successfully, you'll see output like:

```
START all tests.
Extension Test Suite
  ✓ Extension Activation
    ✓ Extension should be activated
    ✓ Extension should register main commands
  ✓ Utility Functions
    ✓ MimeUtility should correctly identify JSON content type
    ✓ Basic string utilities should work correctly
    ✓ Array operations should work correctly
  ✓ HTTP Request Parsing
    ✓ Should validate HTTP method names
    ✓ Should handle URL parsing
  ✓ Environment Variables
    ✓ Should handle variable placeholders
    ✓ Should validate variable names
```

## Adding New Tests

To add new tests:

1. Edit `src/test/extension.test.ts`
2. Add a new test case within an existing suite or create a new `suite()` block
3. Use `assert` module for assertions (included in Node.js)
4. Run `npm test` to verify

### Example:
```typescript
suite('New Feature Tests', () => {
	test('Should do something specific', () => {
		const result = someFunction();
		assert.strictEqual(result, expectedValue, 'Error message');
	});
});
```

## Known Issues

- Some TypeScript compilation warnings exist in node_modules dependencies (aws-amplify, eslint-scope)
- These do not affect test execution
- Tests compile and run successfully despite these warnings

## Next Steps

Consider adding:
- Unit tests for `MimeUtility`, `misc`, and utility functions
- Integration tests for request/response handling
- Mock tests for HTTP client functionality
- Tests for variable resolution and parsing
