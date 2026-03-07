# Project Architecture: REST Client Next

This document describes the structure of the repository and the primary purpose of each folder/file. It can be used as a quick orientation for contributors or maintainers.

---

## Top-level directories and files

- **`src/`** – TypeScript source code for the extension. Everything in the VS Code runtime is built from here.
- **`test/`** – Unit/integration tests (compiled to `out/test` when running).
- **`docs/`** – (optional) documentation content used in the GitHub wiki or shipped with the project.
- **`lock` files (`package-lock.json`)** – lock down exact dependency versions.
- **`package.json`** – metadata, dependencies, scripts, extension manifest contributions section.
- **`webpack.config.js`** – build configuration used to bundle the extension for publishing.
- **`tsconfig.json`** – TypeScript compiler options.
- **`.vscodeignore`** – lists files to exclude from the VSIX package.
- **`CHANGELOG.md`**, **`README.md`**, **`NOTE.md`** – user-facing documentation.


## `src/` tree overview

The source code is organised into a few broad categories.

### `extension.ts`

Entry point. Defines the `activate` function that VS Code calls when the
extension is loaded. It wires up controller instances, registers commands,
code lenses, and other language features. Also handles deactivation cleanup.

### `logger.ts`

Simple logging helper used across the project.

### `common/`

Shared constants and value objects used by multiple modules. e.g. HTTP
header names, environment variable names, storage keys.

### `controllers/`

High-level objects that orchestrate features and business logic.

| File | Responsibility |
|------|----------------|
| `requestController.ts` | Main flow for sending HTTP requests, handling responses, managing status bar. |
| `historyController.ts` | Stores and retrieves request history. |
| `codeSnippetController.ts` | Generates code snippets from HAR requests using `httpsnippet`. |
| `environmentController.ts` | Manages environment variable files and switching. |
| `swaggerController.ts` | Imports Swagger/OpenAPI files as requests. |


### `views/`

Webview and text‑based UI components used to render responses / snippets.

- `baseWebview.ts` – base class with common webview logic (CSP, messaging).
- `httpResponseWebview.ts` – HTML schema for response panels, syntax highlighting.
- `httpResponseTextDocumentView.ts` – alternative response view rendered in text editor.
- `codeSnippetWebview.ts` – UI for displaying generated code snippets.


### `providers/`

VS Code *provider* implementations that integrate with the editor.

- Completion item providers (`httpCompletionItemProvider.ts`, `requestVariableCompletionItemProvider.ts`, ...)
- Definition/reference providers (`fileVariableDefinitionProvider.ts`, `requestVariableDefinitionProvider.ts`, etc.)
- Link/code lens providers (`httpCodeLensProvider.ts`, `fileVariableReferencesCodeLensProvider.ts`, ...)
- Hover providers (`requestVariableHoverProvider.ts`, `environmentOrFileVariableHoverProvider.ts`)

These files register with VS Code via `languages.register*` inside `extension.ts`.


### `models/`

Plain data classes/interfaces representing domain concepts, such as
`HttpRequest`, `HttpResponse`, `HttpVariableResolveResult`, along with
some utility logic (parsing, caches, etc.).

Examples:
- `httpRequest.ts` / `httpResponse.ts` – representations of HTTP messages.
- `httpVariableResolveResult.ts` – return type used by variable resolution.
- `documentCache.ts` – simple in‑memory cache for parsed HTTP documents.


### `utils/`

Collection of helper modules with pure functions or small classes.

Major categories:

- **HTTP-related**: `httpClient.ts` (wrapper around got), `curlRequestParser.ts`, `requestParser.ts`, `harHttpRequest.ts`.
- **Variable handling**: `requestVariableCache.ts`, `requestVariableCacheValueProcessor.ts`, various providers such as `systemVariableProvider.ts`, each implementing `HttpVariableProvider`.
- **Authentication**: `awsSignature.ts`, `awsCognito.ts`, `digest.ts`, `oidcClient.ts` etc.
- **Miscellaneous**: `workspaceUtility.ts`, `userDataManager.ts`, `mimeUtility.ts`, `streamUtility.ts`, `environmentStatusBarEntry.ts`, and others.

These utilities keep controller code lean and facilitate testing.


### `auth/` subfolder

Contains helpers for various authentication schemes used in request headers.
In the `security/replace-adal-node` branch, the code for Azure AD v1/v2 may
live here (e.g. `awsCognito.ts`, `oidcClient.ts`).


### `providers/httpVariableProviders/`

Implementations of variable providers used when resolving variables in
HTTP files. Examples: `systemVariableProvider` (date, faker, env vars),
`fileVariableProvider`, etc.


### `test/`

Contains test files (`extension.test.ts` etc.) and the `README.md` we added.
Use the VS Code test harness to run suite via `npm run test`.


## Dependency notes

- **`got`** – HTTP client used by `httpClient.ts`; switched to ES module.
- **`httpsnippet`** – used for code snippet generation; a potential security concern.
- **`adal-node` / `@azure/msal`** – authentication libraries for Azure AD.
- **Various helpers** (dayjs, fs-extra, uuid, faker, etc.).

Most third‑party code is bundled by Webpack into `extension.js` during build.


## Build and release

- Run `npm run compile` or `npm run watch` to build with Webpack.
- `npm run package` creates a production VSIX.
- Lint with `npm run lint` and tests via `npm run test`.

The build output `dist/extension.js` is what VS Code loads at runtime.

---

This overview should provide a solid starting point for understanding how
each part of the project contributes to the extension's functionality.
Feel free to update or expand this document as the codebase evolves.