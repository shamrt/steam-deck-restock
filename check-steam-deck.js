const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/**
 * Steam Deck Restock Checker
 * Monitors the Steam Deck refurbished page for availability
 */
async function checkSteamDeckStock() {
  let browser;
  
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  try {
    console.log("Starting Steam Deck stock check...");
    
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log("Navigating to Steam Deck refurbished page...");
    await page.goto(
      "https://store.steampowered.com/sale/steamdeckrefurbished/",
      { waitUntil: "networkidle0" }
    );

    console.log("Checking cart buttons...");
    await page.focus("div.CartBtn");
    const btns = await page.$$("div.CartBtn");

    let result = [];
    for (let btn of btns) {
      const text = await btn.evaluate(
        (element) =>
          element.parentElement.parentElement.parentElement.parentElement
            .textContent
      );
      result.push(text);
    }

    console.log("Found cart buttons:", result.length);
    
    // Check for OLED 512GB availability
    const isOled512gbAvailable = result.some(
      (text) => text.includes("Steam Deck 512 GB OLED") && text.includes("Add to cart")
    );

    // Log results
    console.log({ result });
    console.log(`OLED 512GB Available: ${isOled512gbAvailable}`);

    const timestamp = new Date().toISOString();
    
    if (isOled512gbAvailable) {
      console.log("🎉 OLED 512GB is in stock!");
      fs.appendFileSync(
        path.join(logsDir, "in_stock.txt"),
        `OLED 512GB in stock at ${timestamp}\n`
      );
    } else {
      console.log("❌ No OLED 512GB in stock.");
      // Optionally log when we checked (for debugging)
      fs.appendFileSync(
        path.join(logsDir, "check_log.txt"),
        `Checked at ${timestamp} - No stock\n`
      );
    }

  } catch (error) {
    const timestamp = new Date().toISOString();
    const errorMessage = `Error at: ${timestamp} - ${error.message}\n`;
    
    console.error("❌ Error occurred:", error.message);
    fs.appendFileSync(path.join(logsDir, "error.txt"), errorMessage);
    
    // Re-throw to ensure the workflow fails on error
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkSteamDeckStock()
    .then(() => {
      console.log("✅ Stock check completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Stock check failed:", error.message);
      process.exit(1);
    });
}

module.exports = { checkSteamDeckStock };