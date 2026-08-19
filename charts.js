// CHARTS.JS
function refreshCharts() {
    console.log("Refreshing charts...");
    //TODO Check the LocalStorage
    const symbolList = getSymbolList();
    const now = Date.now();
    const chartsContainer = document.getElementById("charts-container");

    chartsContainer.innerHTML = ""; // Curățăm containerul complet la fiecare refresh

    symbolList.forEach(symbol => {
        //TODO check if data for this symbol exists in local storage
        //TODO if data for this symbol IS in local storage, return it, and DO NOT fetch the API
        const storedData = localStorage.getItem(`chartData_${symbol}`);
        
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            const lastUpdated = parsedData.timestamp;

            // Check if stored data is still fresh (less than 5 hours old)
            if (now - lastUpdated < 5 * 60 * 60 * 1000) {
                console.log(`Using cached data for ${symbol}`);
                showChart(parsedData.data, symbol); // Use cached data
                return;
            }
        }
        //TODO if data for this symbol is not in local storage, fetch new DATA from the API
        // Fetch new data if no valid cache
        console.log(`Fetching new data for ${symbol}`);
        fetch(`https://yahoo-finance166.p.rapidapi.com/api/stock/get-chart?region=US&range=1d&symbol=${symbol}&interval=5m`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": "8f461caa94mshd535b0ab8ca78adp10e742jsn92a44733b8d2",
                "x-rapidapi-host": "yahoo-finance166.p.rapidapi.com"
            }
        })
        .then(response => response.json())
        .then(data => {
            // Store new data in localStorage with timestamp
            localStorage.setItem(`chartData_${symbol}`, JSON.stringify({ timestamp: now, data }));
            showChart(data, symbol);
        })
        .catch(error => console.error("Historical Data API Error:", error));        
    });
}

// Extracts stock symbols from the watchlist ([AAPL, AMD, AMZN, GOOG])
function getSymbolList() {
    //TODO 1. Get ul by id
    const symbolList = [];

    //TODO 2. Iterate through all the li in that ul and get data-symbol
    $('#watchlist > li').each(function() {
        const symbol = $(this).data('symbol');
        if (symbol) {
            symbolList.push(symbol);
        }
    });
    console.log("Symbol list:", symbolList);
    
    //TODO 3. Return array populate at step 2
    return symbolList;
}

function showChart(data, symbol) {
    console.log(`Showing chart for ${symbol}`);

    if (!data.chart || !data.chart.result) {
        console.error("No historical data found for", symbol);
        return;
    }


    // if (data.chart && data.chart.result) {
    //     historicalData = data.chart.result[0]; // Extract first stock result
    // } else {
    //     console.error("No historical data found for", data);
    //     return;
    // }

    // ✅ Fix: Declare historicalData properly
    const historicalData = data.chart.result[0];
    const timestamps = historicalData.timestamp;
    const prices = historicalData.indicators.quote[0];

    const chartData = timestamps.map((time, index) => ({
        time: time,
        open: prices.open[index],
        high: prices.high[index],
        low: prices.low[index],
        close: prices.close[index]
    }))
    .filter(candle => candle.open && candle.close);

    console.log("Chart Data for", symbol, chartData);

    // Create a unique Lightweight container for each stock's Chart
    const chartsContainer = document.getElementById("charts-container");

    // ✅ Check if a chart already exists for the symbol
    let stockChartDiv = document.getElementById(`chart-${symbol}`);
    if (!stockChartDiv) {
        stockChartDiv = document.createElement("div");
        stockChartDiv.id = `chart-${symbol}`;
        stockChartDiv.style.width = "100%";
        stockChartDiv.style.height = "400px";
        stockChartDiv.style.marginBottom = "20px";
        chartsContainer.appendChild(stockChartDiv);
    } else {
        stockChartDiv.innerHTML = ""; // Clear existing chart if necessary
    }
    // Create Lightweight Chart inside the new div
    const chart = LightweightCharts.createChart(stockChartDiv, {
        width: stockChartDiv.clientWidth,
        height: 400,
        layout: { backgroundColor: "#1e1e1e", textColor: "#ffffff" },
        grid: { vertLines: { color: "#2b2b2b" }, horzLines: { color: "#2b2b2b" } }
    });
    // Create the Main Series (Candlesticks)
    const mainSeries = chart.addCandlestickSeries();

    // Set the data for the Main Series
    mainSeries.setData(chartData);
}

// Attach event listener to the Charts button
// document.getElementById("charts-btn").addEventListener("click", refreshCharts);

document.addEventListener("DOMContentLoaded", () => {
    let chartsButton = document.getElementById("charts-btn");
    if (chartsButton && !chartsButton.dataset.listenerAdded) {
        chartsButton.addEventListener("click", refreshCharts);
        chartsButton.dataset.listenerAdded = "true";
    }
});


