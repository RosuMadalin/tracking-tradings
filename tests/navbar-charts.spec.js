const { test, expect } = require('@playwright/test');
const { installMocks } = require('./setup');

test.describe('navbar / charts', () => {
  test('charts button swaps the visible container and renders a chart per watchlist symbol', async ({ page }) => {
    await installMocks(page, {
      stockPrices: { AAPL: 190 },
      firestoreSeed: [{ collection: 'watchlist', id: 'AAPL', data: { timestamp: new Date() } }],
    });
    await page.goto('/index.html');

    const portfolioContainer = page.locator('#portfolio-container');
    const chartsContainer = page.locator('#charts-container');

    await expect(portfolioContainer).toBeVisible();
    await expect(chartsContainer).toBeHidden();

    await page.click('#charts-btn');

    await expect(portfolioContainer).toBeHidden();
    await expect(chartsContainer).toBeVisible();
    await expect(page.locator('#chart-AAPL')).toBeVisible();
  });
});
