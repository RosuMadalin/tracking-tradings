// Fixture JSON matching the response shapes the app expects from the
// yahoo-finance166 RapidAPI endpoints, so tests never hit the real API or spend quota.

function stockPriceResponse(price) {
  return {
    quoteSummary: {
      result: [{ price: { regularMarketPrice: { raw: price } } }],
    },
  };
}

function invalidStockPriceResponse() {
  // Shape returned for a symbol with no market price, used to simulate an invalid symbol.
  return { quoteSummary: { result: [{ price: { regularMarketPrice: {} } }] } };
}

function newsResponse(articles) {
  return {
    data: {
      main: {
        stream: articles.map((a) => ({
          content: {
            title: a.title,
            snippet: a.snippet,
            clickThroughUrl: { url: a.url || '#' },
            thumbnail: a.imageUrl ? { resolutions: [{ url: a.imageUrl }] } : undefined,
          },
        })),
      },
    },
  };
}

function chartResponse({ symbol = 'AAPL', points = 3 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const timestamp = Array.from({ length: points }, (_, i) => now - (points - i) * 300);
  const open = Array.from({ length: points }, (_, i) => 100 + i);
  const close = Array.from({ length: points }, (_, i) => 101 + i);
  const high = close.map((c) => c + 1);
  const low = open.map((o) => o - 1);
  return {
    chart: {
      result: [
        {
          meta: { symbol },
          timestamp,
          indicators: { quote: [{ open, high, low, close }] },
        },
      ],
    },
  };
}

module.exports = { stockPriceResponse, invalidStockPriceResponse, newsResponse, chartResponse };
