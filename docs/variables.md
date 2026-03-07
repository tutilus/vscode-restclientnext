---
title: Variables
description: Comprehensive guide to using variables in REST Client Next - environment, file, request, prompt, and system variables.
---

Variables in REST Client Next allow you to create dynamic, reusable, and environment-agnostic requests. There are two main types:

- **Custom Variables** - User-defined (Environment, File, Request, Prompt)
- **System Variables** - Pre-defined dynamic values

## Variable Syntax

- Custom variables: `{% raw %}{{variableName}}{% endraw %}`
- System variables: `{% raw %}{{$variableName}}{% endraw %}`
- Request variable reference: `{% raw %}{{requestName.response.body.$.id}}{% endraw %}` (more complex)

When the same name is used, precedence order: **Request Variables** > **File Variables** > **Environment Variables**.

## Custom Variables

### Environment Variables

Defined in VS Code settings, shared across all `.http` files. Perfect for environment-specific values like hostnames, API keys, etc.

#### Configuration

```json
"rest-client.environmentVariables": {
    "$shared": {
        "version": "v1",
        "prodToken": "foo",
        "nonProdToken": "bar"
    },
    "local": {
        "version": "v2",
        "host": "localhost",
        "token": "{% raw %}{{$shared nonProdToken}}{% endraw %}",
        "secretKey": "devSecret"
    },
    "production": {
        "host": "example.com",
        "token": "{% raw %}{{$shared prodToken}}{% endraw %}",
        "secretKey": "prodSecret"
    }
}
```

- `$shared` - Variables available in ALL environments
- Environment names at the same level (local, production, etc.)
- Variables can reference other variables (including from `$shared`)

#### Usage

```http
GET https://{{host}}/api/{{version}}/comments/1 HTTP/1.1
Authorization: Bearer {{token}}
```

Switch environments via `Ctrl+Alt+E` (`Cmd+Alt+E` on macOS) or click the environment name in status bar.

### File Variables

Defined within the `.http` file itself. Scope: entire file.

#### Definition Syntax

Place anywhere in the file (before or between requests):

```http
@hostname = api.example.com
@port = 8080
@host = {{hostname}}:{{port}}
@contentType = application/json
@createdAt = {% raw %}{{$datetime iso8601}}{% endraw %}
@modifiedBy = {% raw %}{{$processEnv USERNAME}}{% endraw %}
```

Rules:
- `@variableName = value` on a single line
- Variable name cannot contain spaces
- Value can include whitespace and any characters
- Use `\` to escape special characters like `\n`
- Values can reference other variables (including system variables)

#### Reference

Use `{% raw %}{{variableName}}{% endraw %}` in the file. To percent-encode the value, use `{% raw %}%%{ variableName }%%{% endraw %}` (note: this is a Liquid percent-encoding escape, not the actual syntax; actual syntax is `{% raw %}{{% variableName %}}{% endraw %}`).

#### Features

- **Go to Definition**: `Ctrl+Click` or `F12` on variable reference
- **Find All References**: `Shift+F12` on variable (included in CodeLens if enabled)
- Hover to see resolved value

### Request Variables

Attach names to requests for cross-referencing. Perfect for request chaining (e.g., login then use token).

#### Definition

Just before the request URL:

```http
# @name login
POST https://api.example.com/login HTTP/1.1
Content-Type: application/json

{
    "username": "user",
    "password": "pass"
}

###

@authToken = {% raw %}{{login.response.body.token}}{% endraw %}

# @name createComment
POST https://api.example.com/comments HTTP/1.1
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
    "content": "Hello World"
}
```

**Important:** Must manually trigger the named request first to populate its response before referencing it.

#### Reference Syntax

**Form:** `{% raw %}{{requestName.(response|request).(body|headers).(*|JSONPath|XPath|Header Name)}}{% endraw %}`

**Components:**
- `requestName` - The name defined with `@name`
- `response` or `request` - Which to reference
- `body` or `headers` - Which part
- For `body`:
  - `*` - Entire body
  - `$.path` - JSONPath for JSON responses (e.g., `$.id`)
  - `//xpath` - XPath for XML responses (e.g., `//user/@id`)
- For `headers`:
  - Header name (case-insensitive) - e.g., `X-Auth-Token`

**Examples:**

```http
@authToken = {% raw %}{{login.response.headers.X-Auth-Token}}{% endraw %}
@userId = {% raw %}{{login.response.body.$.user.id}}{% endraw %}
@xmlValue = {% raw %}{{getUser.response.body.//name}}{% endraw %}
```

If resolution fails (invalid path, missing response), the literal text is sent and diagnostics appear.

### Prompt Variables

Interactive input per request. Override any pre-defined variable temporarily.

#### Definition

Before the request URL:

```http
# @prompt username
# @prompt password
# @prompt refCode Your reference code from webpage
POST https://{{host}}/verify/{{refCode}} HTTP/1.1
Authorization: Basic {{username}}:{{password}}
```

**Special Behavior:** Variable names matching `password`, `passwd`, `pass` (any case) will be masked during input.

When you send the request, an input dialog appears for each prompt variable. Enter values and the request uses them. Values are **not stored** for later requests.

### File Variables with Description

You can add description for better understanding (displayed in hover):

```http
# @variableName = value | description
@apiKey = abc123 | API key for external service
```

## System Variables

Pre-defined dynamic variables, format: `{% raw %}{{$variableName}}{% endraw %}` (case-sensitive).

### UUID & Random

- `{% raw %}{{$guid}}{% endraw %}` - RFC 4122 v4 UUID
- `{% raw %}{{$faker <module>.<property> [param]}}{% endraw %}` - Generate fake data using Faker.js
  - Examples: `{% raw %}{{$faker internet.email}}{% endraw %}`, `{% raw %}{{$faker name.fullName}}{% endraw %}`, `{% raw %}{{$faker string.alphanumeric 10}}{% endraw %}`

### Random Integer

`{% raw %}{{$randomInt min max}}{% endraw %}` - Random integer between `min` (inclusive) and `max` (exclusive)

```http
{% raw %}{{$randomInt 1 100}}{% endraw %}  // 1-99
```

### Timestamps & Dates

- `{% raw %}{{$timestamp [offset option]}}{% endraw %}` - Current UTC timestamp (seconds since epoch)
- `{% raw %}{{$datetime format [offset option]}}{% endraw %}` - Formatted datetime
- `{% raw %}{{$localDatetime format [offset option]}}{% endraw %}` - Formatted datetime in local timezone

**Formats:**
- `rfc1123` - RFC 1123 format (e.g., `Wed, 01 Jan 2020 00:00:00 GMT`)
- `iso8601` - ISO 8601 format (e.g., `2020-01-01T00:00:00.000Z`)
- `"custom"` or `'custom'` - Custom Day.js format (e.g., `{% raw %}{{$datetime "YYYY-MM-DD"}}{% endraw %}`)

**Offset Options:**
- `y` (year), `M` (month), `w` (week), `d` (day), `h` (hour), `m` (minute), `s` (second), `ms` (millisecond)

**Examples:**

```http
{% raw %}{{$timestamp}}{% endraw %}                      // Now
{% raw %}{{$timestamp -3 h}}{% endraw %}                 // 3 hours ago
{% raw %}{{$datetime iso8601}}{% endraw %}               // Current time ISO 8601
{% raw %}{{$datetime iso8601 1 y}}{% endraw %}           // One year from now
{% raw %}{{$datetime "YYYY-MM-DD" 2 d}}{% endraw %}      // Day after tomorrow
{% raw %}{{$localDatetime "DD/MM/YYYY"}}{% endraw %}     // Local time, custom format
```

### Environment Variables

- `{% raw %}{{$processEnv [%]envVarName}}{% endraw %}` - Look up local machine environment variable
- `{% raw %}{{$dotenv [%]variableName}}{% endraw %}` - Read from `.env` file in same directory

**processEnv Examples:**

```http
# Direct lookup
GET https://api.example.com
Authorization: Bearer {% raw %}{{$processEnv API_TOKEN}}{% endraw %}

# Indirect lookup (use variable name from settings)
GET https://api.example.com
Authorization: Bearer {% raw %}{{$processEnv %apiTokenEnvVar}}{% endraw %}
```

With `%` prefix, uses the variable name from extension settings (`rest-client.environmentVariables`), allowing environment-specific values.

**dotenv Examples:**

```http
GET https://api.example.com
Authorization: Bearer {% raw %}{{$dotenv API_TOKEN}}{% endraw %}
```

### Azure Active Directory

- `{% raw %}{{$aadV2Token [new] [cloud] [appOnly] [scopes:] [tenantid:] [clientid:]}}{% endraw %}`

See [Authentication](/authentication/) for full details.

### OpenID Connect

- `{% raw %}{{$oidcAccessToken [new] [<clientId:] [<callbackPort:] [authorizeEndpoint:] [tokenEndpoint:] [scopes:] [audience:]}}{% endraw %}`

See [Authentication](/authentication/) for full details.

## Variable Best Practices

1. **Security First**
   - Never commit secrets to source control
   - Use environment variables or `{% raw %}{{$processEnv}}{% endraw %}` for API keys, passwords
   - Use `$shared` for non-sensitive common values

2. **File-Level Constants**
   - Use `@variable` for constants in the file (base URLs, common headers)
   - You get Go to Definition and Find References for free

3. **Request Chaining**
   - Use `@name` and request variables for multi-step workflows
   - Reference responses from previous requests
   - Order matters: define and execute named requests before referencing them

4. **Prompt for Dynamic Values**
   - Use `@prompt` for one-time values (OTP, temporary codes)
   - Mask sensitive prompts by using `password`, `pass`, or `passwd` in name

5. **Leverage System Variables**
   - `{% raw %}{{$guid}}{% endraw %}` for unique identifiers
   - `{% raw %}{{$timestamp}}{% endraw %}` and `{% raw %}{{$datetime}}{% endraw %}` for time-sensitive requests
   - `{% raw %}{{$faker}}{% endraw %}` for realistic test data
   - `{% raw %}{{$randomInt}}{% endraw %}` for random selections

6. **Naming Conventions**
   - Use descriptive names: `@authToken` not `@token1`
   - Use lowercase with camelCase or snake_case consistently
   - Avoid names that might conflict with system variables

## Troubleshooting

### Variable Not Resolving

Check:
1. Variable is defined (spelling/case matters)
2. For request variables: named request was executed first
3. For JSONPath/XPath: syntax is correct and path exists in response
4. File saved (some features require saved file)

### Hover for Diagnostics

Hover over a variable reference to see:
- Resolved value
- Errors (if any)
- Source of the variable

### Enable Logging

Set `"rest-client.logLevel": "debug"` in settings to see variable resolution in output panel.

## Advanced Examples

### Environment-Specific API Endpoint

```json
"rest-client.environmentVariables": {
    "$shared": {
        "apiVersion": "v1"
    },
    "dev": {
        "host": "dev.api.example.com"
    },
    "prod": {
        "host": "api.example.com"
    }
}
```

```http
GET https://{{host}}/{{apiVersion}}/users
```

### Request Chaining with Tokens

```http
@baseUrl = https://api.example.com/v1

# @name login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
    "username": "user",
    "password": "pass"
}

###

@authToken = {% raw %}{{login.response.body.token}}{% endraw %}

# @name getUser
GET {{baseUrl}}/user/profile
Authorization: Bearer {{authToken}}

###

# @name createPost
POST {{baseUrl}}/posts
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
    "title": "My Post",
    "userId": {% raw %}{{getUser.response.body.id}}{% endraw %}
}
```

### Dynamic Test Data

```http
POST https://api.example.com/users
Content-Type: application/json

{
    "email": "{% raw %}{{$faker internet.email}}{% endraw %}",
    "name": "{% raw %}{{$faker name.fullName}}{% endraw %}",
    "phone": "{% raw %}{{$faker phone.number}}{% endraw %}",
    "address": "{% raw %}{{$faker address.city}}{% endraw %}, {% raw %}{{$faker address.country}}{% endraw %}",
    "createdAt": "{% raw %}{{$datetime iso8601}}{% endraw %}",
    "id": "{% raw %}{{$guid}}{% endraw %}"
}
```

### Using Process Environment Variables

`.bashrc` / `.zshrc`:

```bash
export API_KEY="my-secret-key"
```

Settings:

```json
{
    "rest-client.environmentVariables": {
        "production": {
            "apiKeyEnvVar": "API_KEY"
        }
    }
}
```

Request:

```http
GET https://api.example.com/data
Authorization: Bearer {% raw %}{{$processEnv %apiKeyEnvVar}}{% endraw %}