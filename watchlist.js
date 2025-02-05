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

// Add click event listener to the toggle button
toggleButton.addEventListener("click", () => {
  // Check the current display state of the watchlist
  if (watchlist.style.display === "none" || !watchlist.style.display) {
    // If hidden or no display style is set, show the watchlist
    watchlist.style.display = "block";
    toggleButton.textContent = "⬆️"; // Change the arrow to point upwards
  } else {
    // Otherwise, hide the watchlist
    watchlist.style.display = "none";
    toggleButton.textContent = "⬇️"; // Change the arrow to point downwards
  }
}); 

// Add stocks data from Firebase
function addStockData(symbol, price) {
  db.collection("stock_data")
    .add({
      symbol: symbol,
      price: price,
      timestamp: new Date(),
    })
    .then(() => {
      console.log("Stock data added for symbol: " + symbol);
    })
    .catch((error) => {
      console.error("Error adding stock data to Firebase:", error);
    });
}

// Add a new stock dynamically to the watchlist
addStockButton.addEventListener("click", () => {
  const symbol = stockInput.value.trim().toUpperCase();

  if (!symbol) {
    alert("Please enter a stock symbol.");
    return;
  }

  // Clear the input
  stockInput.value = "";

 // Check if the stock symbol already exists in the watchlist
 const existingSymbols = Array.from(
  document.querySelectorAll("#watchlist .stock-symbol")
).map((el) => el.textContent);

if (existingSymbols.includes(symbol)) {
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

    db.collection("watchlist")
      .doc(symbol) // Use the symbol as the document ID for simplicity
      .set({ timestamp: new Date() })
      .then(() => {
        console.log(`Stock symbol ${symbol} saved to Firestore.`);
        addStockToWatchlist(symbol); // Add to UI
      })
      .catch((error) => {
        console.error("Error saving stock symbol to Firestore:", error);
      });
  } catch (error) {
    console.log("Error validating stock symbol:", error);
  }
}

// Validate stock symbol using RapidAPI
async function validateStockSymbol(symbol) {
  const url = `https://yahoo-finance166.p.rapidapi.com/api/stock/get-price?region=US&symbol=${symbol}`;

  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "ff417b8d15msh68777dca49c569fp1386b1jsnc8e8c7944038",
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
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const symbol = doc.id; // Document ID is the stock symbol
        addStockToWatchlist(symbol);
      });
    })
    .catch((error) => {
      console.error("Error loading watchlist from Firestore:", error);
    });
}

// Function to add a stock to the watchlist
function addStockToWatchlist(symbol) {

  // Avoid duplicate entries in the UI
  if (document.querySelector(`#watchlist li[data-symbol="${symbol}"]`)) {
    console.log(`Symbol ${symbol} is already in the watchlist.`);
    return;
  }
  // Create list item for the stock
  const listItem = document.createElement("li");
  listItem.setAttribute("data-symbol", symbol);
  listItem.innerHTML = `
    <span class="stock-symbol">${symbol}</span> -
    <span class="stock-price">Loading...</span>
    <button class="delete-button" data-symbol="${symbol}">❌</button>
  `;

  watchlist.appendChild(listItem);

  // Attach event listener for delete button
  listItem.querySelector(".delete-button").addEventListener("click", (e) => {
    const stockSymbol = e.target.getAttribute("data-symbol");
    deleteStockFromFirestore(stockSymbol); // Delete from Firestore
    listItem.remove(); // Remove from UI
  });

  // Fetch stock news and display in the center column
  const newsContainer = document.createElement('div');
  newsContainer.setAttribute('id', `${symbol}-news`);
  document.getElementById('news-container').appendChild(newsContainer);

  getDataFromStorage(symbol);
}

// Function to delete a stock from Firestore
function deleteStockFromFirestore(symbol) {
  db.collection("watchlist")
    .doc(symbol)
    .delete()
    .then(() => {
      console.log(`Stock symbol ${symbol} deleted from Firestore.`);
    })
    .catch((error) => {
      console.error("Error deleting stock symbol from Firestore:", error);
    });
}

// Fetch stock price using Firestore or API
function getDataFromStorage(symbol, result) {
  db.collection("stock_data")
    .where("symbol", "==", symbol)
    .orderBy("timestamp", "desc") // Ensure the latest data is retrieved first
    .limit(1) // dif Ovi Only get the latest record
    .get() // dif Ovi
    .then((snapshot) => { // dif Ovi
      if (snapshot.empty) {
        // No data found in Firebase, so we need to fetch from RapidAPI
        fetchStockPrice(symbol, result); // Fetch live price if no cached data
        console.log("No data in Firebase, fetching from RapidAPI...");
      } else {
        // Data found in Firebase
        snapshot.forEach((doc) => {
          var item = doc.data();
          var timestamp = item.timestamp.toDate(); // Convert Firestore timestamp to JavaScript Date object
          var price = item.price;
          
          // Check if the data is older than 1 hour
          if (new Date() - timestamp > 90 * 60 * 1000) {
            // Data is older than 1 hour, fetch fresh data from RapidAPI
            fetchStockPrice(symbol, result);
            console.log("Data is older than 90 minutes, fetching from RapidAPI...");
          } else {
            // Data is less than 1 hour old, display it
            $(result).text(price + " $");
            console.log("Data is fresh, using Firebase data.");
          }
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching stock data from Firestore:", error);
    });
}

// Fetch live stock price from RapidAPI and save to Firestore
async function fetchStockPrice(symbol, result) {
  var url = `https://yahoo-finance166.p.rapidapi.com/api/stock/get-price?region=US&symbol=${symbol}`;

  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": "ff417b8d15msh68777dca49c569fp1386b1jsnc8e8c7944038",
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
} // end fetchStockPrice(symbol)

$(document).ready(function () {
  $("#watchlist .stock-symbol").each(function () {
    const symbol = $(this).text();
    const result = $(this).parent().find(".stock-price");
    console.log("running for: " + symbol);
    getDataFromStorage(symbol, result);
  });
});
