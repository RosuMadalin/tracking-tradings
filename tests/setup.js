const { FIREBASE_MOCK_SCRIPT, FIREBASE_NOOP_SCRIPT } = require('./mocks/firebase-mock');
const { LIGHTWEIGHT_CHARTS_MOCK_SCRIPT } = require('./mocks/charts-mock');
const {
  stockPriceResponse,
  invalidStockPriceResponse,
  newsResponse,
  chartResponse,
} = require('./mocks/rapidapi-fixtures');

/**
 * Installs route mocks for Firebase, lightweight-charts and the RapidAPI stock
 * endpoints, and seeds the fake Firestore. Must be called before page.goto().
 *
 * @param {import('@playwright/test').Page} page
 * @param {{
 *   stockPrices?: Record<string, number>,
 *   defaultPrice?: number,
 *   invalidSymbols?: string[],
 *   news?: Array<{title: string, snippet: string, url?: string, imageUrl?: string}>,
 *   firestoreSeed?: Array<{collection: string, id: string, data: object}>,
 * }} [options]
 */
async function installMocks(page, options = {}) {
  const {
    stockPrices = {},
    defaultPrice = 150,
    invalidSymbols = [],
    news = [],
    firestoreSeed = [],
  } = options;

  await page.addInitScript((seed) => {
    window.__firestoreSeed = seed;
  }, firestoreSeed);

  await page.route('https://www.gstatic.com/firebasejs/**', async (route) => {
    const url = route.request().url();
    const body = url.includes('firebase-app-compat.js') ? FIREBASE_MOCK_SCRIPT : FIREBASE_NOOP_SCRIPT;
    await route.fulfill({ contentType: 'text/javascript', body });
  });

  await page.route('https://unpkg.com/lightweight-charts**', async (route) => {
    await route.fulfill({ contentType: 'text/javascript', body: LIGHTWEIGHT_CHARTS_MOCK_SCRIPT });
  });

  await page.route('https://yahoo-finance166.p.rapidapi.com/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.includes('/api/stock/get-price')) {
      const symbol = url.searchParams.get('symbol');
      const body = invalidSymbols.includes(symbol)
        ? invalidStockPriceResponse()
        : stockPriceResponse(stockPrices[symbol] ?? defaultPrice);
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      return;
    }

    if (url.pathname.includes('/api/news/list-by-symbol')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(newsResponse(news)) });
      return;
    }

    if (url.pathname.includes('/api/stock/get-chart')) {
      const symbol = url.searchParams.get('symbol');
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(chartResponse({ symbol })) });
      return;
    }

    await route.fulfill({ status: 404, body: 'not mocked' });
  });
}

module.exports = { installMocks };
