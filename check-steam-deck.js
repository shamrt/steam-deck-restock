import puppeteer from "puppeteer";
import Push from "pushover-notifications";
import { promisify } from "util";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

/**
 * Device configurations for Steam Deck models
 */
const DEVICES = {
  "oled-512": {
    name: "Steam Deck OLED 512GB",
    searchTerms: ["Steam Deck 512 GB OLED", "Add to cart"],
    priority: 1,
    sound: "magic",
  },
  "oled-1tb": {
    name: "Steam Deck OLED 1TB",
    searchTerms: ["Steam Deck 1 TB OLED", "Add to cart"],
    priority: 1,
    sound: "magic",
  },
  "lcd-256": {
    name: "Steam Deck LCD 256GB",
    searchTerms: ["Steam Deck 256 GB", "Add to cart"],
    priority: 0,
    sound: "pushover",
  },
  "lcd-512": {
    name: "Steam Deck LCD 512GB",
    searchTerms: ["Steam Deck 512 GB", "Add to cart"],
    priority: 0,
    sound: "pushover",
  },
};

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
async function sendNotification(
  pushover,
  message,
  title = "Steam Deck Restock Alert",
  priority = 0,
  sound = "pushover"
) {
  if (!pushover) {
    console.log(`📱 Would send notification: ${title} - ${message}`);
    return;
  }

  const notificationMessage = {
    message: message,
    title: title,
    priority: priority,
    sound: sound,
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
 * Checks if a specific Steam Deck device is available
 */
function checkDeviceAvailability(cartButtonTexts, device) {
  return cartButtonTexts.some((buttonText) =>
    device.searchTerms.every((term) => buttonText.includes(term))
  );
}

/**
 * Steam Deck Restock Checker
 * Monitors the Steam Deck refurbished page for availability
 */
async function checkSteamDeckStock(deviceCode = "oled-512") {
  let browser;

  // Get device configuration
  const device = DEVICES[deviceCode];
  if (!device) {
    throw new Error(
      `Unknown device code: ${deviceCode}. Available: ${Object.keys(DEVICES).join(", ")}`
    );
  }

  console.log(`🔍 Monitoring ${device.name}...`);

  // Initialize Pushover
  const pushover = initializePushover();

  try {
    console.log("Starting Steam Deck stock check...");

    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set a user agent to avoid blocking
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

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

    // Check for device availability
    const isDeviceAvailable = checkDeviceAvailability(cartButtonTexts, device);

    // Log results
    console.log({ cartButtonTexts });
    console.log(`${device.name} Available: ${isDeviceAvailable}`);

    if (isDeviceAvailable) {
      console.log(`🎉 ${device.name} is in stock!`);

      // Send Pushover notification with device-specific priority and sound
      await sendNotification(
        pushover,
        `🎉 ${device.name} is now available for purchase!\n\nCheck: https://store.steampowered.com/sale/steamdeckrefurbished/`,
        `🚨 ${device.name.toUpperCase()} IN STOCK! 🚨`,
        device.priority,
        device.sound
      );
    } else {
      console.log(`❌ No ${device.name} in stock.`);
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);

    // Send error notification (but don't wait for it to complete)
    sendNotification(
      pushover,
      `Steam Deck checker encountered an error: ${error.message}`,
      "Steam Deck Checker Error",
      0
    ).catch((notificationError) => {
      console.error(
        "Failed to send error notification:",
        notificationError.message
      );
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
  const argv = yargs(hideBin(process.argv))
    .option("device", {
      alias: "d",
      type: "string",
      description: "Device to monitor",
      choices: Object.keys(DEVICES),
      default: "oled-512",
    })
    .option("list-devices", {
      alias: "l",
      type: "boolean",
      description: "List available device codes",
    })
    .help()
    .alias("help", "h")
    .example("$0", "Monitor Steam Deck OLED 512GB (default)")
    .example("$0 --device oled-1tb", "Monitor Steam Deck OLED 1TB")
    .example("$0 -d lcd-256", "Monitor Steam Deck LCD 256GB")
    .example("$0 --list-devices", "List all available device codes")
    .parseSync();

  // Handle list devices option
  if (argv.listDevices) {
    console.log("📱 Available Steam Deck devices:");
    Object.entries(DEVICES).forEach(([code, device]) => {
      console.log(`  ${code.padEnd(10)} - ${device.name}`);
    });
    process.exit(0);
  }

  checkSteamDeckStock(argv.device)
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
