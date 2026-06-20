# Playwright MCP Server

This is a local Model Context Protocol (MCP) server that exposes Playwright browser automation capabilities.

## Installation

Playwright is already installed as a dependency. The MCP server is implemented in `mcp-server-playwright.js`.

## Running the MCP Server

```bash
npm run mcp:playwright
```

This starts the MCP server which listens for JSON-RPC requests over stdin/stdout.

## Available Methods

### `playwright/launch`
Launch a browser instance.

**Parameters:**
- `browserType` (string): `'chromium'`, `'firefox'`, or `'webkit'` (default: `'chromium'`)
- `headless` (boolean): Run in headless mode (default: `false`)

**Response:**
```json
{
  "result": {
    "browserId": "default",
    "pageId": 1,
    "browserType": "chromium"
  }
}
```

### `playwright/navigate`
Navigate to a URL.

**Parameters:**
- `pageId` (number): Page ID from launch response
- `url` (string): URL to navigate to

**Response:**
```json
{
  "result": {
    "url": "http://example.com",
    "title": "Example Domain"
  }
}
```

### `playwright/screenshot`
Take a screenshot.

**Parameters:**
- `pageId` (number): Page ID
- `path` (string, optional): File path to save screenshot

**Response:**
```json
{
  "result": {
    "path": "/path/to/screenshot.png",
    "size": 12345
  }
}
```

### `playwright/click`
Click an element.

**Parameters:**
- `pageId` (number): Page ID
- `selector` (string): CSS selector

**Response:**
```json
{
  "result": {
    "clicked": true,
    "selector": "button.primary"
  }
}
```

### `playwright/fill`
Fill text into an input field.

**Parameters:**
- `pageId` (number): Page ID
- `selector` (string): CSS selector
- `text` (string): Text to fill

**Response:**
```json
{
  "result": {
    "filled": true,
    "selector": "input#username",
    "text": "example@test.com"
  }
}
```

### `playwright/waitForSelector`
Wait for an element to appear.

**Parameters:**
- `pageId` (number): Page ID
- `selector` (string): CSS selector
- `timeout` (number, optional): Timeout in ms (default: 5000)

**Response:**
```json
{
  "result": {
    "found": true,
    "selector": ".modal"
  }
}
```

### `playwright/getContent`
Get full page HTML content.

**Parameters:**
- `pageId` (number): Page ID

**Response:**
```json
{
  "result": {
    "content": "<!DOCTYPE html>..."
  }
}
```

### `playwright/evaluate`
Execute JavaScript on the page.

**Parameters:**
- `pageId` (number): Page ID
- `script` (string): JavaScript code to execute

**Response:**
```json
{
  "result": {
    "output": "result of script"
  }
}
```

### `playwright/close`
Close the browser.

**Response:**
```json
{
  "result": {
    "closed": true
  }
}
```

## Example Usage

### Command Line

```bash
npm run mcp:playwright
```

Then send JSON-RPC requests:

```json
{"method": "playwright/launch", "params": {"browserType": "chromium", "headless": false}, "id": 1}
{"method": "playwright/navigate", "params": {"pageId": 1, "url": "http://localhost:3000/studio/quick"}, "id": 2}
{"method": "playwright/screenshot", "params": {"pageId": 1, "path": "screenshot.png"}, "id": 3}
{"method": "playwright/close", "params": {}, "id": 4}
```

### VS Code Integration

The MCP server can be used with VS Code's Copilot Chat for browser automation tasks:

1. Start the MCP server: `npm run mcp:playwright`
2. Use browser automation commands in Copilot Chat
3. Reference the method names and parameters from the documentation above

## Testing with the Local App

Test against your locally running dev server:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start MCP server
npm run mcp:playwright

# Terminal 3 (or in VS Code chat): Send commands to interact with the running app
```

## Browser Support

- **Chromium** - Full support (default)
- **Firefox** - Full support
- **WebKit** - Full support

## Limitations

- Single browser instance per server session
- Must be closed with `playwright/close` before launching another
- Script evaluation is executed directly (no sandboxing)
- Page state is maintained only during server lifetime
