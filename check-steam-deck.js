import puppeteer from "puppeteer";
import Push from "pushover-notifications";
import { promisify } from "util";



/**
 * Initializes Pushover client if credentials are available
 */
function initializePushover() {
  if (process.env.PUSHOVER_USER && process.env.PUSHOVER_TOKEN) {
    const pushover = new Push({
      user: process.env.PUSHOVER_USER,
      token: process.env.PUSHOVER_TOKEN,
    });
    console.log("✅ Pushover notifications enabled");
    return pushover;
  } else {
    console.log("⚠️ Pushover credentials not found - notifications disabled");
    return null;
  }
}

/**
 * Sends a Pushover notification
 */
async function sendNotification(pushover, message, title = "Steam Deck Restock Alert", priority = 0) {
  if (!pushover) {
    console.log(`📱 Would send notification: ${title} - ${message}`);
    return;
  }

  const notificationMessage = {
    message: message,
    title: title,
    priority: priority,
    sound: priority > 0 ? 'magic' : 'pushover'
  };

  try {
    const pushoverSend = promisify(pushover.send.bind(pushover));
    const result = await pushoverSend(notificationMessage);
    console.log("✅ Pushover notification sent successfully");
    return result;
  } catch (error) {
    console.error("❌ Failed to send Pushover notification:", error);
    throw error;
  }
}

/**
 * Checks if Steam Deck OLED 512GB is available
 */
function checkOledAvailability(cartButtonTexts) {
  return cartButtonTexts.some(
    (buttonText) => buttonText.includes("Steam Deck 512 GB OLED") && buttonText.includes("Add to cart")
  );
}



/**
 * Steam Deck Restock Checker
 * Monitors the Steam Deck refurbished page for availability
 */
async function checkSteamDeckStock() {
  let browser;
  
  // Initialize Pushover
  const pushover = initializePushover();
  
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
    const cartButtons = await page.$$("div.CartBtn");

    let cartButtonTexts = [];
    for (let cartButton of cartButtons) {
      const text = await cartButton.evaluate(
        (element) =>
          element.parentElement.parentElement.parentElement.parentElement
            .textContent
      );
      cartButtonTexts.push(text);
    }

    console.log("Found cart buttons:", cartButtonTexts.length);
    
    // Check for OLED 512GB availability
    const isOled512gbAvailable = checkOledAvailability(cartButtonTexts);

    // Log results
    console.log({ cartButtonTexts });
    console.log(`OLED 512GB Available: ${isOled512gbAvailable}`);

    const timestamp = new Date().toISOString();
    
    if (isOled512gbAvailable) {
      console.log("🎉 OLED 512GB is in stock!");

      // Send high-priority Pushover notification
      await sendNotification(
        pushover,
        `🎉 Steam Deck OLED 512GB is now available for purchase!\n\nCheck: https://store.steampowered.com/sale/steamdeckrefurbished/`,
        "🚨 STEAM DECK IN STOCK! 🚨",
        1 // High priority
      );
    } else {
      console.log("❌ No OLED 512GB in stock.");
    }

  } catch (error) {
    console.error("❌ Error occurred:", error.message);
    
    // Send error notification (but don't wait for it to complete)
    sendNotification(
      pushover,
      `Steam Deck checker encountered an error: ${error.message}`,
      "Steam Deck Checker Error",
      0
    ).catch(notificationError => {
      console.error("Failed to send error notification:", notificationError.message);
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
if (import.meta.url === `file://${process.argv[1]}`) {
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

export { checkSteamDeckStock };