# REST Client Next

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tutilus.rest-client-next?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=tutilus.rest-client-next) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

REST Client Next lets you send HTTP requests and view responses directly
inside VS Code --- no external tools required.

A modernized fork of the popular REST Client extension for Visual Studio
Code of [Huachao's REST Client](https://github.com/Huachao/vscode-restclient). 

------------------------------------------------------------------------

## Table of contents

- [REST Client Next](#rest-client-next)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
  - [Quick Example](#quick-example)
  - [Installation](#installation)
  - [Build \& Run locally](#build--run-locally)
  - [Documentation](#documentation)
  - [Basic Example with variables](#basic-example-with-variables)
  - [Why REST Client Next?](#why-rest-client-next)
  - [License](#license)
  - [Change Log](#change-log)
  - [Special Thanks](#special-thanks)
  - [Feedback](#feedback)

------------------------------------------------------------------------

## Features

-   Send HTTP requests from `.http` and `.rest` files
-   Environment variables support
-   Authentication:
    -   Basic
    -   Digest
    -   AWS Signature v4
    -   AWS Cognito
-   GraphQL requests
-   cURL import
-   Code snippet generation
-   Cookie persistence
-   Proxy support
-   Request history
-   SSL client certificates

## Quick Example

Create a file named `test.http`:

``` http
GET https://httpbin.org/get
```

Click **Send Request** above the request line.

------------------------------------------------------------------------

## Installation

Install from the VS Code Marketplace\
Search for: **REST Client Next**

------------------------------------------------------------------------

## Build & Run locally

To build and run the extension locally for development:

```bash
npm install
# build once
npm run compile
# or watch for changes during development
npm run watch
```

To package a production build:

```bash
npm run package
```

------------------------------------------------------------------------

## Documentation

Full documentation is available in the project Wiki:

👉 https://github.com/tutilus/vscode-restclientnext/wiki

------------------------------------------------------------------------

## Basic Example with variables

``` http
```http
@baseUrl = https://example.com
###

GET {{baseUrl}}/comments/1 HTTP/1.1

###

GET {{baseUrl}}/topics/1 HTTP/1.1

###

POST {{baseUrl}}/comments HTTP/1.1
content-type: application/json

{
    "name": "sample",
    "time": "Wed, 21 Oct 2015 18:27:50 GMT"
}
```
```

------------------------------------------------------------------------

## Basic Authentication Example

``` http
GET https://httpbin.org/basic-auth/user/pass
Authorization: Basic user pass
```

------------------------------------------------------------------------

## Why REST Client Next?

There is already an excellent fork called [http-yac](https://github.com/anweber/vscode-httpyac), but my goal with REST Client Next is to preserve the simplicity of the original REST Client and continue using its lightweight approach while modernizing it for recent VS Code versions. 

So my main goal is:

- Updated dependencies
- Modern TypeScript support
- Compatible with latest VS Code versions
- Fix the main issues
- Probably add functionality as long as the compatibility is preserved

## License
[MIT License](LICENSE)

## Change Log
See CHANGELOG [here](CHANGELOG.md)

## Special Thanks
All the amazing [contributors](https://github.com/tutilus/vscode-restclientnext/graphs/contributors)❤️

## Feedback
Please provide feedback through the [GitHub Issue](https://github.com/tutilus/vscode-restclientnext/issues) system, or fork the repository and submit PR.
