---
title: Home
description: REST Client Next allows you to send HTTP requests and view responses directly in VS Code.
---

REST Client Next allows you to send HTTP request and view the response in Visual Studio Code directly. It eliminates the need for a separate tool to test REST APIs and makes API testing convenient and efficient.

> This documentation is based on the original README from [Huachao's REST Client](https://github.com/Huachao/vscode-restclient).

## Main Features

REST Client Next provides a comprehensive set of features for API testing:

- Send/Cancel/Rerun **HTTP request** in editor and view response in a separate pane with syntax highlight
- Send **GraphQL query** and author **GraphQL variables** in editor
- Send **cURL command** in editor and copy HTTP request as `cURL command`
- Auto save and view/clear request history
- Compose _MULTIPLE_ requests in a single file (separated by `###` delimiter)
- View image response directly in pane
- Save raw response and response body only to local disk
- Fold and unfold response body
- Customize font(size/family/weight) in response preview
- Preview response with expected parts(_headers only_, _body only_, _full response_ and _both request and response_)
- Authentication support for Basic Auth, Digest Auth, SSL Client Certificates, Azure Active Directory, Microsoft Identity Platform, AWS Signature v4, and AWS Cognito
- Environments and custom/system variables support with powerful variable resolution
- Generate code snippets for HTTP requests in multiple languages
- Remember Cookies for subsequent requests
- Proxy support
- Send SOAP requests with snippet support
- Full HTTP language support with syntax highlighting, auto completion, and more

## Quick Start

In editor, type an HTTP request as simple as below:

```http
https://example.com/comments/1
```

Or follow the standard [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html) including request method, headers, and body:

```http
POST https://example.com/comments HTTP/1.1
content-type: application/json

{
    "name": "sample",
    "time": "Wed, 21 Oct 2015 18:27:50 GMT"
}
```

To send a prepared request, you can:
- Click the `Send Request` link above the request
- Use the shortcut `Ctrl+Alt+R` (`Cmd+Alt+R` for macOS)
- Right-click in the editor and select `Send Request`
- Press `F1` and select/type `Rest Client: Send Request`

The response will be previewed in a separate webview panel inside Visual Studio Code.

## Documentation Sections

- **[Features](/features/)** - Detailed feature overview
- **[Usage](/usage/)** - How to use the REST Client
- **[Commands](/commands/)** - Complete command reference and shortcuts
- **[Authentication](/authentication/)** - Authentication methods and configuration
- **[Variables](/variables/)** - Environment, file, request, and system variables
- **[Settings](/settings/)** - Configuration settings and customization
- **[HTTP Language](/http-language/)** - HTTP language support details

## Installation

Press `F1`, type `ext install` then search for `rest-client-next`.

Or install directly from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=restclientdev.rest-client-next).