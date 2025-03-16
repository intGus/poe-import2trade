# Path of Exile 2 Trade Filter Assistant

## Overview
**Path of Exile 2 Trade Filter Assistant** is a browser extension that enhances the **PoE 2 Trade** experience by automatically extracting item stats from copied in-game tooltips and applying them as search filters. No more manual input—just paste and price check instantly!

## Features
- 🛠 **Auto-Apply Filters** – Extracts item stats and converts them into trade filters.
- 🔢 **Supports Ranges & Percentages** – Handles numerical values, min-max ranges, and percentages.
- 🧠 **Smart Parsing** – Cleans and formats complex modifiers for accurate filtering.
- 🔄 **Duplicate Filter Management** – Groups similar stats into OR-based filters (count filters).
- ⚡ **Seamless Integration** – Works directly with **Path of Exile’s 2 trade website**.

## How It Works
1. **Copy** an item's stats from **Path of Exile**.
2. **Paste** them into the extension’s input field.
3. **Apply Filters** – Instantly updates the **PoE Trade** website with optimized search filters.

## Installation

### 🔹 Chrome
1. Download the extension from the **[Chrome Web Store](https://chromewebstore.google.com/detail/poe2-trade-import-filterp/egolclbodmghhneciiodfoehkcgccehk)**.
2. Click **Add to Chrome** and confirm installation.
3. 
### 🔹 Firefox
1. Download the extension from the **[Firefox Add-ons Store](https://addons.mozilla.org/en-US/firefox/addon/poe2-auto-filter-price-checker/)**.
2. Click **Add to Firefox** and confirm installation.

### 🔹 Manual Installation
1. Clone this repository or download as a ZIP file and unzip:
   ```sh
   git clone https://github.com/intGus/poe-import2trade
2. Open your browser’s extension settings:
  - **Firefox**: about:debugging#/runtime/this-firefox
 - **Chrome**: chrome://extensions/
3. Enable Developer Mode and load the unpacked extension from the cloned or unzipped folder.

### Development
To modify and test the extension:

1. **Clone the repository** and navigate into it:
```sh
git clone https://github.com/intGus/poe-import2trade
cd poe-import2trade
```
2. **Make changes** to popup.js, inject.js, or content.js.
3. **Reload the extension** in your browser.

### Contributing
Feel free to open **issues** or submit **pull requests** to improve functionality!

### License
This project is licensed under the **MIT License**.

Disclaimer
This extension is an independent tool and is **not affiliated with Grinding Gear Games**.
