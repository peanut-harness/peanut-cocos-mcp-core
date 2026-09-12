import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { chromium } from 'playwright';

const previewUrl = readFlag('--url') ?? 'http://127.0.0.1:7457';
const outputPath = resolve(readRequiredFlag('--output'));
const browserPath = readFlag('--browser') ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, executablePath: browserPath });

try {
    const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
    const consoleErrors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') {
            consoleErrors.push(message.text());
        }
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForFunction(() => globalThis.__PEANUT_BINDING_PROOF__?.statusBound === true, null, {
        timeout: 30_000,
    });
    const before = await page.evaluate(() => globalThis.__PEANUT_BINDING_PROOF__);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box == null) {
        throw new Error('preview_canvas_missing');
    }

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => globalThis.__PEANUT_BINDING_PROOF__?.actionCount === 1, null, {
        timeout: 10_000,
    });
    const after = await page.evaluate(() => globalThis.__PEANUT_BINDING_PROOF__);
    await mkdir(dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath, fullPage: true });
    process.stdout.write(`${JSON.stringify({ before, after, consoleErrors, canvas: box, outputPath }, null, 2)}\n`);
} finally {
    await browser.close();
}

function readFlag(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function readRequiredFlag(name) {
    const value = readFlag(name);
    if (value == null || value.length === 0) {
        throw new Error(`missing_required_flag:${name}`);
    }
    return value;
}
