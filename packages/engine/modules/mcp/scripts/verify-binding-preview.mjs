import { chromium } from 'playwright';

const previewUrl = readFlag('--url') ?? 'http://127.0.0.1:7457';
const browserPath = readFlag('--browser') ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const targetX = Number(readFlag('--target-x') ?? 0);
const targetY = Number(readFlag('--target-y') ?? -30);
const designWidth = Number(readFlag('--design-width') ?? 960);
const designHeight = Number(readFlag('--design-height') ?? 640);
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

    const clickPoint = {
        x: box.x + ((targetX + designWidth / 2) / designWidth) * box.width,
        y: box.y + ((designHeight / 2 - targetY) / designHeight) * box.height,
    };
    await page.mouse.click(clickPoint.x, clickPoint.y);
    await page.waitForFunction(() => globalThis.__PEANUT_BINDING_PROOF__?.actionCount === 1, null, {
        timeout: 10_000,
    });
    const after = await page.evaluate(() => globalThis.__PEANUT_BINDING_PROOF__);
    if (
        before?.statusBound !== true ||
        before?.spriteBound !== true ||
        before?.labelText !== 'READY' ||
        before?.actionCount !== 0 ||
        after?.statusBound !== true ||
        after?.spriteBound !== true ||
        after?.labelText !== 'ACTION OK' ||
        after?.actionCount !== 1 ||
        after?.customEventData !== 'persistent-gallery' ||
        consoleErrors.length > 0
    ) {
        throw new Error('binding_runtime_proof_failed');
    }
    process.stdout.write(`${JSON.stringify({ before, after, consoleErrors, canvas: box, clickPoint }, null, 2)}\n`);
} finally {
    await browser.close();
}

function readFlag(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}
