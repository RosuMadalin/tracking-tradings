// Minimal stub of the lightweight-charts CDN library, just enough for charts.js's
// showChart() to run without errors (createChart().addCandlestickSeries().setData()).
const LIGHTWEIGHT_CHARTS_MOCK_SCRIPT = `
window.LightweightCharts = {
  createChart: function () {
    return {
      addCandlestickSeries: function () {
        return { setData: function () {} };
      },
    };
  },
};
`;

module.exports = { LIGHTWEIGHT_CHARTS_MOCK_SCRIPT };
