const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const Push = require("pushover-notifications");

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

  // Initialize Pushover if credentials are available
  let pushover = null;
  if (process.env.PUSHOVER_USER && process.env.PUSHOVER_TOKEN) {
    pushover = new Push({
      user: process.env.PUSHOVER_USER,
      token: process.env.PUSHOVER_TOKEN,
    });
    console.log("✅ Pushover notifications enabled");
  } else {
    console.log("⚠️ Pushover credentials not found - notifications disabled");
  }

  // Helper function to send Pushover notification
  const sendNotification = (message, title = "Steam Deck Restock Alert", priority = 0) => {
    return new Promise((resolve, reject) => {
      if (!pushover) {
        console.log(`📱 Would send notification: ${title} - ${message}`);
        resolve();
        return;
      }

      const msg = {
        message: message,
        title: title,
        priority: priority,
        sound: priority > 0 ? 'magic' : 'pushover'
      };

      pushover.send(msg, (err, result) => {
        if (err) {
          console.error("❌ Failed to send Pushover notification:", err);
          reject(err);
        } else {
          console.log("✅ Pushover notification sent successfully");
          resolve(result);
        }
      });
    });
  };
  
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
      
      // Log to file
      fs.appendFileSync(
        path.join(logsDir, "in_stock.txt"),
        `OLED 512GB in stock at ${timestamp}\n`
      );

      // Send high-priority Pushover notification
      await sendNotification(
        `🎉 Steam Deck OLED 512GB is now available for purchase!\n\nCheck: https://store.steampowered.com/sale/steamdeckrefurbished/`,
        "🚨 STEAM DECK IN STOCK! 🚨",
        1 // High priority
      );
    } else {
      console.log("❌ No OLED 512GB in stock.");
      
      // Log when we checked (for debugging)
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
    
    // Send error notification (but don't wait for it to complete)
    sendNotification(
      `Steam Deck checker encountered an error: ${error.message}`,
      "Steam Deck Checker Error",
      0
    ).catch(notifError => {
      console.error("Failed to send error notification:", notifError.message);
    });
    
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