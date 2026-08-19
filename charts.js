// charts.js
// const db = firebase.firestore(); - nu mai functiona, trebuia var sau DELOC


// VARIANTA VECHE FARA RANGE 1W 1M 1Y
// ✅ charts.js
console.log("✅ charts.js loaded successfully");

let resizeListenerAttached = false; // 🔥 Previne duplicarea listenerelor

// Funcție principală pentru refresh grafice
async function refreshCharts(range = "1wk") { // range poate fi: '1d', '5d', '1mo', '3mo', '6mo', '1y'
    console.log("🔄 Se actualizează graficele din Firestore...");

    const chartsContainer = document.getElementById("charts-container");
    chartsContainer.innerHTML = ""; // curățăm toate graficele vechi

    try {
        // 1️⃣ Preluăm simbolurile din watchlist
        const watchlistSnapshot = await db.collection("watchlist").get();
        const symbols = watchlistSnapshot.docs.map(doc => doc.id);

        console.log("📊 Watchlist symbols:", symbols);

        // 2️⃣ Pentru fiecare simbol, obținem datele istorice
        for (const symbol of symbols) {
            let stockDoc = await db.collection("stock_data").doc(symbol).get();
            let stockData = stockDoc.exists ? stockDoc.data() : null;
            let chartData = [];

            // 🔹 Dacă există date și sunt proaspete (<1 oră)
            if (stockData && stockData.timestamp) {
                const lastUpdate = stockData.timestamp.toDate();
                const isFresh = (Date.now() - lastUpdate.getTime()) < 5 * 60 * 60 * 1000;

                if (isFresh && Array.isArray(stockData.chartData) && stockData.chartData.length > 0) {
                    console.log(`✅ Folosim date cache pentru ${symbol}`);
                    chartData = stockData.chartData;
                }
            }

            // Dacă nu avem date valide, preluăm de la RapidAPI
            if (!chartData || chartData.length === 0) {
                console.log(`🌐 Fetching historical data for ${symbol}...`);
                chartData = await fetchHistoricalData(symbol, range);

                // Salvăm datele în Firestore
                await db.collection("stock_data").doc(symbol).set({
                    symbol: symbol,
                    price: stockData?.price || null, // dacă nu există, setăm null
                    timestamp: new Date(),
                    chartData: chartData.map(candle => ({
                        time: typeof candle.time === "object" ? candle.time.seconds : candle.time, // în secunde
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close
                    }))
                }, { merge: true }); // ca sa nu pierdem datele existente
            }

            // 🔹 Normalize timestamps provenite din Firestore
            chartData = chartData.map(candle => ({
                ...candle,
                time: typeof candle.time === "object" ? candle.time.seconds : candle.time
            }));

            // Afișăm graficul
            showChart(symbol, chartData);
        }

    } catch (error) {
        console.error("❌ Eroare la actualizarea graficelor:", error);
    }
}

// Fetch Historical Data from RapidAPI
async function fetchHistoricalData(symbol, range = "1wk") {
    const url = `https://yahoo-finance166.p.rapidapi.com/api/stock/get-chart?region=US&range=${range}&symbol=${symbol}&interval=5m`;
    const options = {
        method: "GET",
        headers: {
            "x-rapidapi-key": "e960172fe6mshf730d03cde873bap107f3ejsn71fcee0222d5",
            // "x-rapidapi-key": "ff417b8d15msh68777dca49c569fp1386b1jsnc8e8c7944038",
            "x-rapidapi-host": "yahoo-finance166.p.rapidapi.com"
        }
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!data.chart?.result?.[0]) {
            console.error(`❌ No chart data for ${symbol}`);
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        // Mapare corectă pentru LightweightCharts 
        // - structura Add field in Firebase - array - schema din Firestore pe care 
        // o aștepți (document stock_data cu price, timestamp, chartData 
        // → chartData = array de obiecte { time (sec), open, high, low, close });
        const chartData = timestamps.map((time, i) => {
            const o = quotes.open[i];
            const h = quotes.high[i];
            const l = quotes.low[i];
            const c = quotes.close[i];

            if (o == null || h == null || l == null || c == null) return null;

            return {
                time: time, // already in seconds
                open: o,
                high: h,
                low: l,
                close: c
            };
        }).filter(Boolean);
        
        console.log(`📈 ChartData for ${symbol}:`, chartData.length, "candles");
        return chartData.slice(-70); // pastram ultimele 150 de puncte

    } catch (error) {
        console.error("❌ Error fetching historical data:", error);
        return [];
    }
}

// Funcție pentru afișarea graficului
function showChart(symbol, chartData) {
    const container = document.createElement("div");
    container.id = `chart-${symbol}`;
    container.style.width = "100%";
    container.style.height = "400px";
    container.style.marginBottom = "30px";

    document.getElementById("charts-container").appendChild(container);

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 400,
        layout: {
            background: { color: "#ffffff" },
            textColor: "#000",
        },
        grid: {
            vertLines: { color: "#e1e1e1" },
            horzLines: { color: "#e1e1e1" },
        },
    });

    const series = chart.addCandlestickSeries();
    series.setData(chartData);

    // 🔥 Attach ONE resize listener only once
    if (!resizeListenerAttached) {
        window.addEventListener("resize", () => {
            document.querySelectorAll("[id^='chart-']").forEach(div => {
                chart.applyOptions({ width: div.clientWidth });
            });
        });

        resizeListenerAttached = true;
    }
}




// // CHARTS.JS
// function refreshCharts() {
//     console.log("Refreshing charts...");
//     //TODO Check the LocalStorage
//     const symbolList = getSymbolList();
//     const now = Date.now();
//     const chartsContainer = document.getElementById("charts-container");

//     chartsContainer.innerHTML = ""; // Curățăm containerul complet la fiecare refresh

//     symbolList.forEach(symbol => {
//         //TODO check if data for this symbol exists in local storage
//         //TODO if data for this symbol IS in local storage, return it, and DO NOT fetch the API
//         const storedData = localStorage.getItem(`chartData_${symbol}`);
        
//         if (storedData) {
//             const parsedData = JSON.parse(storedData);
//             const lastUpdated = parsedData.timestamp;

//             // Check if stored data is still fresh (less than 5 hours old)
//             if (now - lastUpdated < 5 * 60 * 60 * 1000) {
//                 console.log(`Using cached data for ${symbol}`);
//                 showChart(parsedData.data, symbol); // Use cached data
//                 return;
//             }
//         }
//         //TODO if data for this symbol is not in local storage, fetch new DATA from the API
//         // Fetch new data if no valid cache
//         console.log(`Fetching new data for ${symbol}`);
//         fetch(`https://yahoo-finance166.p.rapidapi.com/api/stock/get-chart?region=US&range=1d&symbol=${symbol}&interval=5m`, {
//             method: "GET",
//             headers: {
//                 "x-rapidapi-key": "8f461caa94mshd535b0ab8ca78adp10e742jsn92a44733b8d2",
//                 "x-rapidapi-host": "yahoo-finance166.p.rapidapi.com"
//             }
//         })
//         .then(response => response.json())
//         .then(data => {
//             // Store new data in localStorage with timestamp
//             localStorage.setItem(`chartData_${symbol}`, JSON.stringify({ timestamp: now, data }));
//             showChart(data, symbol);
//         })
//         .catch(error => console.error("Historical Data API Error:", error));        
//     });
// }

// // Extracts stock symbols from the watchlist ([AAPL, AMD, AMZN, GOOG])
// function getSymbolList() {
//     //TODO 1. Get ul by id
//     const symbolList = [];

//     //TODO 2. Iterate through all the li in that ul and get data-symbol
//     $('#watchlist > li').each(function() {
//         const symbol = $(this).data('symbol');
//         if (symbol) {
//             symbolList.push(symbol);
//         }
//     });
//     console.log("Symbol list:", symbolList);
    
//     //TODO 3. Return array populate at step 2
//     return symbolList;
// }

// function showChart(data, symbol) {
//     console.log(`Showing chart for ${symbol}`);

//     if (!data.chart || !data.chart.result) {
//         console.error("No historical data found for", symbol);
//         return;
//     }

//     const historicalData = data.chart.result[0];
//     const timestamps = historicalData.timestamp;
//     const prices = historicalData.indicators.quote[0];

//     const chartData = timestamps.map((time, index) => ({
//         time: time,
//         open: prices.open[index],
//         high: prices.high[index],
//         low: prices.low[index],
//         close: prices.close[index]
//     }))
//     .filter(candle => candle.open && candle.close);

//     console.log("Chart Data for", symbol, chartData);

//     // Create a unique Lightweight container for each stock's Chart
//     const chartsContainer = document.getElementById("charts-container");

