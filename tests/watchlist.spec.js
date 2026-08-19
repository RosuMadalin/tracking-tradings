const { test, expect } = require('@playwright/test');
const { installMocks } = require('./setup');

test.describe('watchlist', () => {
  test('loads existing symbols from Firestore on page load', async ({ page }) => {
    await installMocks(page, {
      stockPrices: { MSFT: 250 },
      firestoreSeed: [{ collection: 'watchlist', id: 'MSFT', data: { timestamp: new Date() } }],
    });
    await page.goto('/index.html');

    const item = page.locator('#watchlist li[data-symbol="MSFT"]');
    await expect(item).toBeVisible();
    await expect(item.locator('.stock-price')).toHaveText('250 $');
  });

  test('adding a valid symbol saves it and shows its price', async ({ page }) => {
    await installMocks(page, { stockPrices: { AAPL: 190 } });
    await page.goto('/index.html');

    await page.fill('#stock-input', 'aapl');
    await page.click('#add-stock-button');

    const item = page.locator('#watchlist li[data-symbol="AAPL"]');
    await expect(item).toBeVisible();
    await expect(item.locator('.stock-price')).toHaveText('190 $');
    // Input is symbol-normalized to uppercase and cleared after submit.
    await expect(page.locator('#stock-input')).toHaveValue('');
  });

  test('rejects a symbol the price API does not recognize', async ({ page }) => {
    await installMocks(page, { invalidSymbols: ['FAKE'] });
    await page.goto('/index.html');

    const dialogMessages = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });

    await page.fill('#stock-input', 'FAKE');
    await page.click('#add-stock-button');

    await expect(page.locator('#watchlist li[data-symbol="FAKE"]')).toHaveCount(0);
    await expect.poll(() => dialogMessages).toContain('Invalid stock symbol. Please enter a correct stock symbol.');
  });

  test('rejects adding a symbol already in the watchlist', async ({ page }) => {
    await installMocks(page, { stockPrices: { AAPL: 190 } });
    await page.goto('/index.html');

    await page.fill('#stock-input', 'AAPL');
    await page.click('#add-stock-button');
    await expect(page.locator('#watchlist li[data-symbol="AAPL"]')).toBeVisible();

    const dialogMessages = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });

    await page.fill('#stock-input', 'AAPL');
    await page.click('#add-stock-button');

    await expect(page.locator('#watchlist li[data-symbol="AAPL"]')).toHaveCount(1);
    await expect.poll(() => dialogMessages).toContain('Stock symbol already exists in the watchlist.');
  });

  test('delete button removes the stock from the list', async ({ page }) => {
    await installMocks(page, { stockPrices: { AAPL: 190 } });
    await page.goto('/index.html');

    await page.fill('#stock-input', 'AAPL');
    await page.click('#add-stock-button');
    const item = page.locator('#watchlist li[data-symbol="AAPL"]');
    await expect(item).toBeVisible();

    await item.locator('.delete-button').click();
    await expect(item).toHaveCount(0);
  });

  test('toggle button shows and hides the watchlist', async ({ page }) => {
    await installMocks(page);
    await page.goto('/index.html');

    const watchlist = page.locator('#watchlist');
    const toggleButton = page.locator('#toggle-watchlist');

    await expect(watchlist).not.toHaveCSS('display', 'none');
    await toggleButton.click();
    await expect(watchlist).toHaveCSS('display', 'none');
    await expect(toggleButton).toHaveText('⬇️');
    await toggleButton.click();
    await expect(watchlist).toHaveCSS('display', 'block');
    await expect(toggleButton).toHaveText('⬆️');
  });
});
