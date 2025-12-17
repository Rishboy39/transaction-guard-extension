# Transaction Guard - Chrome Extension

A Chrome extension that monitors web pages for financial transactions and alerts users about potential scams. Works as an overlay similar to Cluely.

## Features

- 🛡️ **Real-time Monitoring**: Scans web pages for financial transaction indicators
- 🎨 **Visual Overlay**: Beautiful, draggable overlay that appears on web pages
- ⚠️ **Scam Detection**: Analyzes transactions using heuristics to detect potential scams
- ✅ **Legitimate Transaction Verification**: Confirms when transactions appear safe
- 🎯 **Toggle On/Off**: Easy toggle via popup interface

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the folder containing this extension

## Usage

1. Click the extension icon in your Chrome toolbar
2. Toggle the switch to "On" to start monitoring
3. Navigate to any webpage - the overlay will appear if a transaction is detected
4. The overlay will show:
   - 🚨 **Red warning** if potential scam detected
   - ✅ **Green checkmark** if transaction looks legitimate
5. Drag the overlay to reposition it on the page
6. Click the × button to close the overlay

## How It Works

The extension:
- Monitors web pages for payment forms, price elements, and transaction-related content
- Analyzes security indicators (HTTPS, domain trust, suspicious keywords)
- Provides visual feedback through an animated overlay
- Updates in real-time as you browse

## Prototype Notes

This is a prototype version. The scam detection uses basic heuristics:
- HTTPS verification
- Suspicious keyword detection
- URL shortener detection
- Payment processor recognition
- Multiple form detection

For production use, this would need:
- Machine learning models
- Database of known scam sites
- More sophisticated analysis
- User reporting system

## Files Structure

- `manifest.json` - Extension configuration
- `popup.html/css/js` - Extension popup interface
- `content.js/css` - Content script that runs on web pages
- `background.js` - Background service worker
- `icons/` - Extension icons (you'll need to add these)

## Development

To modify the extension:
1. Make changes to the files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload the webpage you're testing on

## License

MIT

