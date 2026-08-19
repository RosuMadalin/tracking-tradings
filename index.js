// INDEX.JS

document.addEventListener("DOMContentLoaded", function () {
    fetchWatchlistSymbols(); // Fetch stock symbols first, then fetch news
  });
  
  // Function to fetch watchlist symbols from Firestore
  async function fetchWatchlistSymbols() {
    try {
      const snapshot = await db.collection("stock_data")
      .orderBy("timestamp", "desc") // Order by latest added
      .get();

      const uniqueSymbols = new Set(); // Store unique symbols
      snapshot.forEach(doc => uniqueSymbols.add(doc.data().symbol));
      //TODO remove this after you fixed duplicates
      // symbols = ['AMZN', 'GOOGL'];
      const symbols = Array.from(uniqueSymbols); // Convert Set to Array

      console.log(symbols); //TODO deduplicate symbols here

      if (symbols.length === 0) {
        console.warn("No watchlist symbols found.");
        return;
      }
  
      // Stocăm simbolurile în localStorage
      localStorage.setItem("watchlistSymbols", JSON.stringify(symbols));

      // Join symbols into a comma-separated string for API
      const symbolQuery = symbols.join("%2C");
      fetchStockMarketNews(symbolQuery);
    } catch (error) {
      console.error("Error fetching watchlist symbols:", error);
    }
  }
  
  // FETCH NEWS
  async function fetchStockMarketNews(symbolQuery, range = "1d") {
    const apiKey = 'e960172fe6mshf730d03cde873bap107f3ejsn71fcee0222d5';  // Replace with your actual RapidAPI key
    const url = `https://yahoo-finance166.p.rapidapi.com/api/news/list-by-symbol?s=${symbolQuery}&region=US&snippetCount=500`;  
    // Check if news data exists in localStorage
    const cachedNews = localStorage.getItem("stockNews");
    const now = new Date().getTime();
  
    if (cachedNews) {
      const { data, timestamp, cachedSymbols } = JSON.parse(cachedNews);
  
      // If data is less than 3 hour old and the symbols match, use it
      if (now - timestamp < 20 * 60 * 60 * 1000 && JSON.stringify(cachedSymbols) === JSON.stringify(symbolQuery)) { 
        console.log("Loaded news from cache");
        displayNews(data);
        return;
      }
    }
  
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'yahoo-finance166.p.rapidapi.com',
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
  
      const newsData = await response.json();
  
      if (newsData?.data?.main?.stream) {
        // Save fetched news in localStorage with timestamp and symbols
        localStorage.setItem("stockNews", JSON.stringify({
          data: newsData.data.main.stream,
          timestamp: now,
          cachedSymbols: symbolQuery
        }));
  
        console.log("Fetched new data from API");
        displayNews(newsData.data.main.stream);
      } else {
        console.error("Unexpected data format:", newsData);
      }
    } catch (error) {
      console.error("Error fetching stock market news:", error);
    }
  }
  
  // DISPLAY NEWS
  function displayNews(newsData) {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = ''; // Clear previous content
  
    if (Array.isArray(newsData)) {
      const limitedNews = newsData.slice(0, 3); // Limit to 3 articles
  
      limitedNews.forEach(article => {
        const content = article.content || {};
        const title = content.title || 'No Title Available';
        const description = content.snippet || 'No Description Available';
        const articleUrl = content.clickThroughUrl?.url || '#';
        const imageUrl = content.thumbnail?.resolutions?.[0]?.url || '';
  
        const articleElement = document.createElement('div');
        articleElement.classList.add('news-article');
  
        articleElement.innerHTML = `
          <h3><a href="${articleUrl}" target="_blank">${title}</a></h3>
          <p>${description.substring(0, 200)}...</p>           
          ${imageUrl ? `<img src="${imageUrl}" alt="Article Image" width="300">` : ''}
          <hr>
        `;
        newsContainer.appendChild(articleElement);
      });
    } else {
      console.error('No valid news data to display');
    }
  }

// ============================
// CHARTS BUTTON CLICK
// ============================
document.getElementById("charts-btn").addEventListener("click", () => {
    // Ascunde news
    document.getElementById("news-container").innerHTML = "";

    // Arătăm charts și selector
    document.getElementById("charts-container").style.display = "block";
    document.getElementById("range-selector").style.display = "block";

    // Refresh charts
    refreshCharts("1wk");
});

// // HOME BUTTON - optimizat
// document.getElementById("home-btn").addEventListener("click", () => {
//     // Ascunde charts și range selector
//     document.getElementById("charts-container").style.display = "none";
//     document.getElementById("range-selector").style.display = "none";

//     // Afișează news
//     const storedSymbols = JSON.parse(localStorage.getItem("watchlistSymbols") || "[]");
//     if (storedSymbols.length > 0) {
//         const symbolQuery = storedSymbols.join("%2C");

//         // Verificăm cache
//         const cachedNews = localStorage.getItem("stockNews");
//         if (cachedNews) {
//             const { data, cachedSymbols } = JSON.parse(cachedNews);

//             if (JSON.stringify(cachedSymbols) === JSON.stringify(symbolQuery)) {
//                 console.log("Displaying news from cache on HOME click");
//                 displayNews(data);
//                 return;
//             }
//         }

//         // Dacă nu există cache sau simbolurile s-au schimbat, facem fetch
//         fetchStockMarketNews(symbolQuery);
//     } else {
//         fetchWatchlistSymbols();
//     }
// });

