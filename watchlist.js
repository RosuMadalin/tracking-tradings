//watchlist.js
// Select the toggle button and the watchlist element
const toggleButton = document.getElementById("toggle-watchlist");
const watchlist = document.getElementById("watchlist");
// Add Stock Input and Button
const stockInput = document.getElementById("stock-input");
const addStockButton = document.getElementById("add-stock-button");

// Load watchlist from Firestore on page load
window.onload = () => {
  loadWatchlistFromFirestore();
};

// Toggle watchlist visibility
toggleButton.addEventListener("click", () => {
  watchlist.style.display = watchlist.style.display === "none" ? "block" : "none";
  toggleButton.textContent = watchlist.style.display === "block" ? "⬆️" : "⬇️";
});

// Add a new stock dynamically to the watchlist
addStockButton.addEventListener("click", () => {
  const symbol = stockInput.value.trim().toUpperCase();
  if (!symbol) return alert("Please enter a stock symbol.");
  stockInput.value = ""; // Clear input

 // Check if the stock symbol already exists in the watchlist
  const existing = [...document.querySelectorAll("#watchlist .stock-symbol")]
    .map(el => el.textContent);

  if (existing.includes(symbol)) {
    alert("Stock symbol already exists in the watchlist.");
    return;
  }
  
// Save to Firestore and add to UI
saveSymbolToFirestore(symbol);
});

// Validate the stock symbol before saving
async function saveSymbolToFirestore(symbol) {
  try {
    const isValid = await validateStockSymbol(symbol);
    if (!isValid) {
      alert("Invalid stock symbol. Please enter a correct stock symbol.");
      return;
    }

    // SAVE WATCHLIST ENTRY
    await db.collection("watchlist")
      .doc(symbol) // Use the symbol as the document ID for simplicity
      .set({ timestamp: new Date() });
    console.log(`✅ Stock symbol ${symbol} saved to Firestore.`);

    // ✔ FIX: Ensure stock_data exists with chartData array
    await db.collection("stock_data").doc(symbol).set({
      symbol,
      price: null,
      timestamp: new Date(),
      chartData: []       // REQUIRED by charts.js
    }, { merge: true });

    addStockToWatchlist(symbol);

    // 🔹 Instead of refreshing ALL charts, refresh only one
    if (window.refreshCharts) refreshCharts(); // poți ulterior optimiza la refresh single
  } catch (error) {
    console.error("❌ Error saving stock symbol:", error);
  }
}

// Validate stock symbol using RapidAPI
async function validateStockSymbol(symbol) {
  const url = `https://yahoo-finance166.p.rapidapi.com/api/stock/get-price?region=US&symbol=${symbol}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "e960172fe6mshf730d03cde873bap107f3ejsn71fcee0222d5",
      // "x-rapidapi-key": "ff417b8d15msh68777dca49c569fp1386b1jsnc8e8c7944038",
      "x-rapidapi-host": "yahoo-finance166.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    // Check if the response is successful
    if (!response.ok) {
      console.error(`API Error: ${response.status}`);
      return false;
    }

    const data = await response.json();

    // Check if the API returned a valid result
    const price = data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
    return price !== undefined; // Return true if the price exists
  } catch (error) {
    console.error("Error validating stock symbol:", error);
    return false;
  }
}

// Load watchlist from Firestore
function loadWatchlistFromFirestore() {
  db.collection("watchlist")
    .get()
    .then(snapshot => {
      const symbols = [];

      snapshot.forEach(doc => {
        const symbol = doc.id;
        symbols.push(symbol);
        addStockToWatchlist(symbol);
      });

      // ✔ FIX: update charts only ONCE
      if (window.refreshCharts) refreshCharts();
    })
    .catch(error => {
      console.error("Error loading watchlist from Firestore:", error);
    });
}

// Function to add a stock to the watchlist
async function addStockToWatchlist(symbol) {

  if (document.querySelector(`#watchlist li[data-symbol="${symbol}"]`)) {
    return;
  }

  const listItem = document.createElement("li");
  listItem.setAttribute("data-symbol", symbol);
  listItem.innerHTML = `
    <span class="stock-symbol">${symbol}</span> -
    <span class="stock-price">Loading...</span>
    <button class="delete-button" data-symbol="${symbol}">❌</button>
  `;

  watchlist.appendChild(listItem);

  listItem.querySelector(".delete-button").addEventListener("click", async (e) => {
    const stockSymbol = e.target.getAttribute("data-symbol");

    await deleteStockFromFirestore(stockSymbol);
    await db.collection("stock_data").doc(stockSymbol).delete();

    listItem.remove();

    if (window.refreshCharts) refreshCharts();
  });
  
  const stockPriceElement = listItem.querySelector(".stock-price");
  getDataFromStorage(symbol, stockPriceElement);
}

// Function to delete a stock from Firestore
async function deleteStockFromFirestore(symbol) {
  try {
    await db.collection("watchlist")
      .doc(symbol)
      .delete()
      .then(() => {
        console.log(`Stock symbol ${symbol} deleted from Firestore.`);
      })
    } catch (error) {
        console.error("Error deleting stock symbol from Firestore:", error);
    };
  }

// === Retrieve cached or fresh data ===
function getDataFromStorage(symbol, result) {
  db.collection("stock_data")
    .doc(symbol)
    .get()
    .then(doc => {
    if (!doc.exists) return fetchStockPrice(symbol, result);

    const data = doc.data();
    const timestamp = data.timestamp.toDate();
    const price = data.price; // Date.now() - timestamp.getTime();

    if (!price || new Date() - timestamp > 20 * 60 * 60 * 1000) {
      console.log(`⏰ ${symbol} data older than 1 hour — refreshing`);
      fetchStockPrice(symbol, result);
    } else {
      result.textContent = `${price} $`;
      console.log(`✅ Using cached Firestore data for ${symbol}`);
    }
  })
  .catch((error) => console.error("Error fetching Firestore data:", error));
}

//   db.collection("stock_data")
//     .where("symbol", "==", symbol)
//     .orderBy("timestamp", "desc") // Ensure the latest data is retrieved first
//     .limit(1) // dif Ovi Only get the latest record
//     .get() // dif Ovi
//     .then((snapshot) => { // dif Ovi
//       if (snapshot.empty) {
//         // No data found in Firebase, so we need to fetch from RapidAPI
//         fetchStockPrice(symbol, result); // Fetch live price if no cached data
//         console.log("No data in Firebase, fetching from RapidAPI...");
//       } else {
//         // Data found in Firebase
//         snapshot.forEach((doc) => {
//           var item = doc.data();
//           var timestamp = item.timestamp.toDate(); // Convert Firestore timestamp to JavaScript Date object
//           var price = item.price;
          
//           // Check if the data is older than 1 hour
//           if (!price || new Date() - timestamp > 5 * 60 * 1000) {
//             // Data is older than 1 hour, fetch fresh data from RapidAPI
//             fetchStockPrice(symbol, result);
//             console.log(`${symbol} is older than 90 minutes, fetching from RapidAPI...`);
            
//           } else {
//             // Data is less than 1 hour old, display it
//             result.textContent = `${data.price} $`;
//             console.log(`✅ Using cached Firestore data for ${symbol}`);

//             // result.textContent = price + " $";
//             // console.log("Data is fresh, using Firebase data.");
//           }
//         })
//     .catch((error) => {
//       console.error("Error fetching stock data from Firestore:", error);
//     });
// }

// Fetch live stock price from RapidAPI and save to Firestore
async function fetchStockPrice(symbol, result) {
  var url = `https://yahoo-finance166.p.rapidapi.com/api/stock/get-price?region=US&symbol=${symbol}`;

  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "e960172fe6mshf730d03cde873bap107f3ejsn71fcee0222d5",
      "x-rapidapi-host": "yahoo-finance166.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    // console.log(data);
    const price = await data.quoteSummary.result[0].price.regularMarketPrice.raw;

    result.textContent = price + " $"; // Update UI
    addStockData(symbol, price); // Save price to Firestore
  } catch (error) {
    console.error("Error fetching stock price:", error);
    result.textContent = "N/A";
  }
}

// === Add/update ONLY price in Firestore ===
async function addStockData(symbol, price) {
  try {
    await db.collection("stock_data")
      .doc(symbol)
      .set(
        {
          symbol,
          price,
          timestamp: new Date(),
        },
        { merge: true }
      );

    console.log(`✅ Updated price in stock_data for ${symbol}`);
  } catch (err) {
    console.error("❌ Error updating stock price:", err);
  }
}

// // === Add/update stock data in Firestore (includes 150 points) ===
// async function addStockData(symbol, price) {
//     try {
//       const now = Math.floor(Date.now() / 1000);
//       const delta = price * 0.005;
//       const open = price - Math.random() * delta;
//       const close = price + Math.random() * delta;
//       const high = Math.max(open, close) + Math.random() * delta;
//       const low = Math.min(open, close) - Math.random() * delta;
//       const newPoint = { time: now, open, high, low, close };

//       const ref = db.collection("stock_data").doc(symbol);
//       const doc = await ref.get();
//         let chartData = doc.exists && Array.isArray(doc.data().chartData)
//           ? doc.data().chartData
//           : [];

//         chartData.push(newPoint);
//         if (chartData.length > 150) chartData = chartData.slice(-150);

//         await ref.set({ symbol, price, timestamp: new Date(), chartData }, { merge: true }
//       );

//         console.log(`✅ Updated stock_data for ${symbol}`);
//       } catch (err) {
//         console.error("❌ Error updating stock data:", err);
//       }
// }

  // // === Helper: get all stocks with prices + chartData ===
  // async function getWatchlistDataFromFirestore() {
  //   const snapshot = await db.collection("stock_data").get();
  //   const data = [];
  //   snapshot.forEach(doc => data.push(doc.data()));
  //   return data;
  // }