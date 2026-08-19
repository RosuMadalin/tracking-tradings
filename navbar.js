// NAVBAR.JS

// VARIANTE DESFASURATA VECHE

// const chartsButton = document.getElementById("charts-btn");

// chartsButton.addEventListener("click", () => {
//     // 1. hide div 1
//     portfolioContainer.style.display = 'none';           // Hide
//     // 2. show div 2
//     chartsContainer.style.display = 'flex';             // Show      
// });
  
// SAU in varianta mai scurta - dar selectii diferite

// NAVBAR.JS - versiune simplificată și clară
document.addEventListener("DOMContentLoaded", function() {
    const homeBtn = document.getElementById("home-btn");
    const portfolioContainer = document.getElementById("portfolio-container");
    const chartsContainer = document.getElementById("charts-container");
    const rangeSelector = document.getElementById("range-selector");
    const newsContainer = document.getElementById("news-container");

    // HOME: afișăm doar news
    homeBtn.addEventListener("click", () => {
        portfolioContainer.style.display = "none";
        chartsContainer.style.display = "none";
        chartsContainer.innerHTML = "";    // curățăm graficele
        rangeSelector.style.display = "none";
        // afișăm doar news
        newsContainer.style.display = "block";

        const storedSymbols = JSON.parse(localStorage.getItem("watchlistSymbols") || "[]");
        if (storedSymbols.length > 0) {
            const symbolQuery = storedSymbols.join("%2C");
            const cachedNews = localStorage.getItem("stockNews");
            if (cachedNews) {
                const { data, cachedSymbols } = JSON.parse(cachedNews);
                if (JSON.stringify(cachedSymbols) === JSON.stringify(symbolQuery)) {
                    console.log("Displaying news from cache on HOME click");
                    displayNews(data);
                    return;
                }
            }
            fetchStockMarketNews(symbolQuery);
        }
    });
});