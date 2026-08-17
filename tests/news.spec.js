const { test, expect } = require('@playwright/test');
const { installMocks } = require('./setup');

test.describe('news', () => {
  test('displays news for symbols found in stock_data', async ({ page }) => {
    await installMocks(page, {
      firestoreSeed: [
        { collection: 'stock_data', id: 'AAPL', data: { symbol: 'AAPL', price: 190, timestamp: new Date() } },
      ],
      news: [
        { title: 'Apple hits new high', snippet: 'Shares rallied today after earnings.' },
        { title: 'Analysts weigh in', snippet: 'Mixed reactions from Wall Street.' },
      ],
    });
    await page.goto('/index.html');

    const articles = page.locator('#news-container .news-article');
    await expect(articles).toHaveCount(2);
    await expect(articles.first().locator('h3 a')).toHaveText('Apple hits new high');
    await expect(articles.first().locator('p')).toContainText('Shares rallied today after earnings.');
  });

  test('shows nothing when there are no watchlist symbols', async ({ page }) => {
    await installMocks(page, { news: [{ title: 'Should not appear', snippet: '...' }] });
    await page.goto('/index.html');

    await expect(page.locator('#news-container .news-article')).toHaveCount(0);
  });

  test('limits displayed articles to three', async ({ page }) => {
    await installMocks(page, {
      firestoreSeed: [
        { collection: 'stock_data', id: 'AAPL', data: { symbol: 'AAPL', price: 190, timestamp: new Date() } },
      ],
      news: Array.from({ length: 5 }, (_, i) => ({ title: `Article ${i + 1}`, snippet: 'Body text' })),
    });
    await page.goto('/index.html');

    await expect(page.locator('#news-container .news-article')).toHaveCount(3);
  });
});
