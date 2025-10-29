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
    priority: 1,
    sound: "magic",
  },
  "oled-1tb": {
    name: "Steam Deck OLED 1TB",
    priority: 1,
    sound: "magic",
  },
  "lcd-256": {
    name: "Steam Deck LCD 256GB",
    priority: 0,
    sound: "pushover",
  },
  "lcd-512": {
    name: "Steam Deck LCD 512GB",
    priority: 0,
    sound: "pushover",
  },
};

/**
 * Initializes Pushover client if credentials are available
 */
function initializePushover(userKey, apiToken) {
  if (userKey && apiToken) {
    const pushover = new Push({
      user: userKey,
      token: apiToken,
    });

    console.log("✅ Pushover notifications enabled");
    return pushover;
  } else {
    console.log("⚠️ Pushover credentials not found - notifications disabled");
    console.log(
      "   Provide via --pushover-user/--pushover-token or PUSHOVER_USER/PUSHOVER_TOKEN env vars"
    );
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
 * Device is considered available if it matches the device name and does NOT contain "Out of stock"
 */
function checkDeviceAvailability(cartButtonTexts, device) {
  return cartButtonTexts.some(
    (buttonText) =>
      buttonText.includes(device.name) && !buttonText.includes("Out of stock")
  );
}

/**
 * Checks availability for all Steam Deck devices
 * Returns an array of available device codes
 */
function checkAllDevicesAvailability(cartButtonTexts) {
  const availableDevices = [];

  Object.entries(DEVICES).forEach(([deviceCode, device]) => {
    if (checkDeviceAvailability(cartButtonTexts, device)) {
      availableDevices.push(deviceCode);
    }
  });

  return availableDevices;
}

/**
 * Steam Deck Restock Checker
 * Monitors the Steam Deck refurbished page for availability
 */
async function checkSteamDeckStock(
  deviceCode = "oled-512",
  pushover,
  notifySuccess = false
) {
  let browser;

  // Get device configuration
  const device = DEVICES[deviceCode];
  if (!device) {
    throw new Error(
      `Unknown device code: ${deviceCode}. Available: ${Object.keys(DEVICES).join(", ")}`
    );
  }

  console.log(`🔍 Monitoring ${device.name}...`);

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

    // Check for target device availability
    const isDeviceAvailable = checkDeviceAvailability(cartButtonTexts, device);

    // Check availability for all devices
    const availableDevices = checkAllDevicesAvailability(cartButtonTexts);

    // Log results
    console.log({ cartButtonTexts });
    console.log(`${device.name} Available: ${isDeviceAvailable}`);
    console.log(
      `All available devices: ${availableDevices.join(", ") || "none"}`
    );

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

      // Check if other devices are available
      if (availableDevices.length > 0) {
        const otherDeviceNames = availableDevices.map(
          (code) => DEVICES[code].name
        );
        console.log(
          `ℹ️ Other Steam Deck models available: ${otherDeviceNames.join(", ")}`
        );

        // Send notification about other available devices
        await sendNotification(
          pushover,
          `ℹ️ Your monitored device (${device.name}) is not available, but other models are in stock:\n\n${otherDeviceNames.map((name) => `• ${name}`).join("\n")}\n\nCheck: https://store.steampowered.com/sale/steamdeckrefurbished/`,
          `📦 Other Steam Decks Available`,
          0, // Normal priority - less urgent than target device
          "pushover"
        );
      } else {
        // Send success notification if requested and no devices available
        if (notifySuccess) {
          await sendNotification(
            pushover,
            `✅ Stock check completed successfully for ${device.name}.\n\nNo Steam Deck models available at this time.\n\nChecked at: ${new Date().toISOString()}`,
            `✅ Steam Deck Check Complete`,
            0, // Normal priority
            "pushover"
          );
        }
      }
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);

    // Send error notification and wait for it to complete
    try {
      await sendNotification(
        pushover,
        `🚨 Steam Deck checker encountered an error:\n\n${error.message}\n\nDevice: ${device.name}\nTime: ${new Date().toISOString()}`,
        "🔥 Steam Deck Checker Error",
        1, // High priority for errors
        "siren"
      );
      console.log("✅ Error notification sent successfully");
    } catch (notificationError) {
      console.error(
        "❌ Failed to send error notification:",
        notificationError.message
      );
    }

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
    .option("pushover-user", {
      alias: "u",
      type: "string",
      description:
        "Pushover user key for notifications (fallback to PUSHOVER_USER env var)",
    })
    .option("pushover-token", {
      alias: "t",
      type: "string",
      description:
        "Pushover API token for notifications (fallback to PUSHOVER_TOKEN env var)",
    })
    .option("notify-success", {
      alias: "n",
      type: "boolean",
      description:
        "Send notification when check completes successfully (even if no stock found)",
      default: false,
    })
    .option("list-devices", {
      alias: "l",
      type: "boolean",
      description: "List available device codes",
    })
    .help()
    .alias("help", "h")
    .example("$0", "Monitor Steam Deck OLED 512GB (uses env vars for Pushover)")
    .example("$0 --device oled-1tb", "Monitor Steam Deck OLED 1TB")
    .example("$0 -d lcd-256", "Monitor Steam Deck LCD 256GB")
    .example(
      "$0 -u USER123 -t TOKEN456",
      "Override Pushover credentials via CLI"
    )
    .example(
      "$0 --notify-success",
      "Send notification on successful check (no stock)"
    )
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

  // Get Pushover credentials from command line arguments or fallback to env vars
  const userKey = argv.pushoverUser || process.env.PUSHOVER_USER;
  const apiToken = argv.pushoverToken || process.env.PUSHOVER_TOKEN;
  const pushover = initializePushover(userKey, apiToken);

  checkSteamDeckStock(argv.device, pushover, argv.notifySuccess)
    .then(() => {
      console.log("✅ Stock check completed successfully");
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("💥 Stock check failed:", error.message);

      // Send a final error notification if the main function failed
      if (pushover) {
        try {
          await sendNotification(
            pushover,
            `💥 Critical failure in Steam Deck checker:\n\n${error.message}\n\nStack trace:\n${error.stack}\n\nTime: ${new Date().toISOString()}`,
            "🚨 CRITICAL: Steam Deck Checker Failed",
            2, // Emergency priority
            "siren"
          );
          console.log("✅ Critical error notification sent");
        } catch (notificationError) {
          console.error(
            "❌ Failed to send critical error notification:",
            notificationError.message
          );
        }
      }

      process.exit(1);
    });
}

export { checkSteamDeckStock };
