#!/usr/bin/env node

/**
 * Playwright MCP Server
 * Exposes Playwright browser automation via Model Context Protocol (MCP)
 */

const { chromium, firefox, webkit } = require('playwright');
const readline = require('readline');

// MCP protocol state
let browser = null;
let pages = new Map();
let pageIdCounter = 0;

// MCP message handling
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

async function handleMessage(message) {
  try {
    const request = JSON.parse(message);
    const response = await processRequest(request);
    console.log(JSON.stringify(response));
  } catch (error) {
    console.log(
      JSON.stringify({
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message,
        },
      })
    );
  }
}

async function processRequest(request) {
  const { method, params, id } = request;

  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: {},
        serverInfo: {
          name: 'playwright-mcp',
          version: '1.0.0',
        },
      };

    case 'playwright/launch':
      return await launchBrowser(params);

    case 'playwright/close':
      return await closeBrowser();

    case 'playwright/navigate':
      return await navigate(params);

    case 'playwright/screenshot':
      return await takeScreenshot(params);

    case 'playwright/click':
      return await clickElement(params);

    case 'playwright/fill':
      return await fillText(params);

    case 'playwright/evaluate':
      return await evaluateScript(params);

    case 'playwright/waitForSelector':
      return await waitForSelector(params);

    case 'playwright/getContent':
      return await getPageContent(params);

    default:
      return {
        error: {
          code: -32601,
          message: `Unknown method: ${method}`,
        },
      };
  }
}

async function launchBrowser(params = {}) {
  try {
    const { browserType = 'chromium', headless = false } = params;
    const browser_module =
      browserType === 'firefox'
        ? firefox
        : browserType === 'webkit'
          ? webkit
          : chromium;

    browser = await browser_module.launch({ headless });
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageId = ++pageIdCounter;
    pages.set(pageId, { page, context, browser: browser_module });

    return {
      result: {
        browserId: 'default',
        pageId,
        browserType,
      },
    };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      pages.clear();
    }
    return { result: { closed: true } };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function navigate(params) {
  try {
    const { pageId, url } = params;
    const page_obj = pages.get(pageId);
    if (!page_obj) {
      throw new Error(`Page ${pageId} not found`);
    }
    await page_obj.page.goto(url);
    return {
      result: {
        url,
        title: await page_obj.page.title(),
      },
    };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function takeScreenshot(params) {
  try {
    const { pageId, path } = params;
    const page_obj = pages.get(pageId);
    if (!page_obj) {
      throw new Error(`Page ${pageId} not found`);
    }
    const buffer = await page_obj.page.screenshot({ path });
    return {
      result: {
        path: path || '<buffer>',
        size: buffer?.length || 0,
      },
    };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function clickElement(params) {
  try {
    const { pageId, selector } = params;
    const page_obj = pages.get(pageId);
    if (!page_obj) {
      throw new Error(`Page ${pageId} not found`);
    }
    await page_obj.page.click(selector);
    return { result: { clicked: true, selector } };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function fillText(params) {
  try {
    const { pageId, selector, text } = params;
    const page_obj = pages.get(pageId);
    if (!page_obj) {
      throw new Error(`Page ${pageId} not found`);
    }
    await page_obj.page.fill(selector, text);
    return { result: { filled: true, selector, text } };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function evaluateScript(params) {
  try {
    const { pageId, script } = params;
    const page_obj = pages.get(pageId);
    if (!page_obj) {
      throw new Error(`Page ${pageId} not found`);
    }
    const result = await page_obj.page.evaluate((s) => eval(s), script);
    return { result: { output: result } };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function waitForSelector(params) {
  try {
    const { pageId, selector, timeout = 5000 } = params;
    const page_obj = pages.get(pageId);
    if (!page_obj) {
      throw new Error(`Page ${pageId} not found`);
    }
    await page_obj.page.waitForSelector(selector, { timeout });
    return { result: { found: true, selector } };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

async function getPageContent(params) {
  try {
    const { pageId } = params;
    const page_obj = pages.get(pageId);
    if (!page_obj) {
      throw new Error(`Page ${pageId} not found`);
    }
    const content = await page_obj.page.content();
    return { result: { content } };
  } catch (error) {
    return {
      error: {
        code: -32603,
        message: error.message,
      },
    };
  }
}

// Start server
console.error('[playwright-mcp] Server started');

rl.on('line', (line) => {
  if (line.trim()) {
    handleMessage(line);
  }
});

rl.on('close', async () => {
  if (browser) {
    await closeBrowser();
  }
  process.exit(0);
});
