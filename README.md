# Steam Deck Restock Monitor

Automated monitoring for Steam Deck refurbished units using GitHub Actions, Puppeteer, and Pushover notifications.

## Overview

This project uses GitHub Actions to periodically check the Steam Deck refurbished page for availability. When any monitored Steam Deck model becomes available, it sends instant Pushover notifications to alert you immediately.

## Features

- 🕐 **Automated Scheduling**: Runs every 60 minutes via GitHub Actions cron job
- 🎮 **Multi-Device Support**: Monitor any Steam Deck model (OLED 512GB/1TB, LCD 256GB/512GB)
- 📱 **Smart Notifications**: Device-specific priority levels and sounds via Pushover
- 🔧 **Flexible Configuration**: Command line arguments with environment variable fallbacks
- ✅ **Success Notifications**: Optional heartbeat notifications for monitoring confirmation
- 🚨 **Error Handling**: Comprehensive error notifications with high priority alerts
- 🏗️ **Modern Stack**: ESM modules, async/await, development tooling with ESLint/Prettier
- 🔒 **Secure**: Supports both environment variables and CLI arguments for credentials

## Setup

### 1. Pushover Configuration

1. Sign up for [Pushover](https://pushover.net/) if you haven't already
2. Create a new application in your Pushover dashboard to get an API token
3. Note your User Key from the Pushover dashboard

### 2. GitHub Configuration

#### Required Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `PUSHOVER_USER`: Your Pushover User Key
- `PUSHOVER_TOKEN`: Your Pushover Application API Token

#### Optional Variables

You can also set repository variables (Settings → Secrets and variables → Actions → Variables):

- `DEVICE_CODE`: Device to monitor (default: `oled-512`)
  - Available options: `oled-512`, `oled-1tb`, `lcd-256`, `lcd-512`

### 3. Local Development

#### Prerequisites

- Node.js v24+ (Volta recommended for version management)
- npm (comes with Node.js)

#### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd steam-deck-restock

# Install dependencies
npm install
```

#### Usage

```bash
# List available device codes
npm run devices

# Monitor default device (OLED 512GB) using environment variables
export PUSHOVER_USER="your_user_key"
export PUSHOVER_TOKEN="your_app_token"
npm run check

# Monitor specific devices
npm run check:oled-512    # Steam Deck OLED 512GB
npm run check:oled-1tb    # Steam Deck OLED 1TB
npm run check:lcd-256     # Steam Deck LCD 256GB
npm run check:lcd-512     # Steam Deck LCD 512GB

# Use command line arguments (overrides environment variables)
node check-steam-deck.js --device oled-1tb --pushover-user USER123 --pushover-token TOKEN456

# Send success notifications for testing
node check-steam-deck.js --notify-success

# Get help
node check-steam-deck.js --help
```

#### Development Tools

```bash
npm run lint          # Check and fix code issues
npm run format        # Format code with Prettier
npm run lint:check    # Check code without fixing
npm run format:check  # Check formatting without fixing
```

## Configuration

### Device Models

The monitor supports all Steam Deck models with different notification priorities:

| Device Code | Model                 | Priority   | Sound    | Description        |
| ----------- | --------------------- | ---------- | -------- | ------------------ |
| `oled-512`  | Steam Deck OLED 512GB | High (1)   | magic    | Most popular model |
| `oled-1tb`  | Steam Deck OLED 1TB   | High (1)   | magic    | Premium OLED model |
| `lcd-256`   | Steam Deck LCD 256GB  | Normal (0) | pushover | Entry LCD model    |
| `lcd-512`   | Steam Deck LCD 512GB  | Normal (0) | pushover | Mid-tier LCD model |

### Scheduling

To modify the checking frequency, edit the cron schedule in `.github/workflows/steamdeck.yml`:

```yaml
schedule:
  - cron: "*/60 * * * *" # Every 60 minutes
```

Common cron patterns:

- `"*/30 * * * *"` - Every 30 minutes
- `"0 * * * *"` - Every hour on the hour
- `"0 9-17 * * 1-5"` - Every hour during business hours (9 AM - 5 PM, Mon-Fri)

See [crontab.guru](https://crontab.guru/) for more examples.

### Notification Types

The system sends different types of notifications:

1. **Stock Alert** (High Priority): When monitored device becomes available
2. **Success Notification** (Normal Priority): Optional heartbeat when check completes successfully
3. **Error Alert** (High Priority): When errors occur during checking
4. **Critical Error** (Emergency Priority): For critical system failures

### Environment Variables vs CLI Arguments

The application supports both environment variables and command line arguments:

```bash
# Environment variables (recommended for automation)
export PUSHOVER_USER="your_user_key"
export PUSHOVER_TOKEN="your_app_token"

# Command line arguments (override environment variables)
node check-steam-deck.js --pushover-user USER123 --pushover-token TOKEN456
```

## Development Architecture

## Troubleshooting

### Common Issues

1. **No notifications received**: Check Pushover credentials and app setup

- You can run the script locally with `--notify-success` to verify notifications

2. **GitHub Actions failing**: Verify secrets are set correctly
3. **Local development issues**: Ensure Node.js 24+ is installed

### Debugging

Enable success notifications to test the system:

```bash
node check-steam-deck.js --notify-success
```

This will send a notification even when no stock is found, confirming the system is working.

## License

MIT License - Feel free to fork and modify for your own use!
