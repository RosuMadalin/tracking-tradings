// NAVBAR.JS
const chartsButton = document.getElementById("charts-btn");
const portfolioContainer = document.getElementById("portfolio-container");
const chartsContainer = document.getElementById("charts-container");

chartsButton.addEventListener("click", () => {
    // 1. hide div 1
    portfolioContainer.style.display = 'none';           // Hide
    // 2. show div 2
    chartsContainer.style.display = 'flex';             // Show      
});
  