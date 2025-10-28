# Steam Deck Restock Monitor

Automated monitoring for Steam Deck refurbished units using GitHub Actions, Puppeteer, and Pushover notifications.

## Overview

This project uses GitHub Actions to periodically check the Steam Deck refurbished page for availability. When a Steam Deck OLED 512GB model becomes available, it sends instant Pushover notifications to alert you immediately.

## How it works

- **Schedule**: Runs every 60 minutes via GitHub Actions cron job
- **Target**: Monitors the [Steam Deck refurbished page](https://store.steampowered.com/sale/steamdeckrefurbished/)
- **Focus**: Specifically tracks Steam Deck OLED 512GB availability
- **Notifications**: Sends instant high-priority Pushover notifications when stock is available
- **Modern Stack**: Built with ESM modules, TypeScript-ready, with automated code quality tools

## Setup

### 1. Pushover Configuration

1. Sign up for [Pushover](https://pushover.net/) if you haven't already
2. Create a new application in your Pushover dashboard to get an API token
3. Note your User Key from the Pushover dashboard

### 2. GitHub Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `PUSHOVER_USER`: Your Pushover User Key
- `PUSHOVER_TOKEN`: Your Pushover Application API Token

### 3. Local Development

#### Prerequisites

- Volta (recommended) or Node.js v24+
- npm (comes with Node.js)

#### Installation & Testing

```bash
# Clone the repository
git clone <your-repo-url>
cd steam-deck-restock

# Install dependencies
npm install

# Set environment variables for testing
export PUSHOVER_USER="your_user_key"
export PUSHOVER_TOKEN="your_app_token"

# Run the stock checker
npm run check

# Run code quality checks
npm run lint        # Check and fix code issues
npm run format      # Format code with Prettier
```

## Configuration

To modify the checking frequency, edit the cron schedule in `.github/workflows/steamdeck.yml`:

```yaml
schedule:
  - cron: "*/60 * * * *" # Every 60 minutes
```

## Development

### Monitoring Different Models

To monitor different Steam Deck models, modify the condition in `check-steam-deck.js`:

```javascript
function checkOledAvailability(cartButtonTexts) {
  return cartButtonTexts.some(
    (buttonText) =>
      buttonText.includes("Steam Deck 512 GB OLED") &&
      buttonText.includes("Add to cart")
  );
}
```

## License

MIT License - Feel free to fork and modify for your own use!
