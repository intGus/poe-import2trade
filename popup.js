document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("statForm");
  const itemText = document.getElementById("itemText");
  const status = document.getElementById("status");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fullText = itemText.value.trim();
    if (!fullText) {
      status.textContent = "Please paste the item text.";
      status.style.color = "red";
      return;
    }

    // Split text into lines and filter out lines with `:`
    const lines = fullText.split("\n").filter(line => !line.includes(":"));

    if (lines.length === 0) {
      status.textContent = "No valid stats found in the text.";
      status.style.color = "red";
      return;
    }

    // Function to clean up brackets and remove "|"
    const cleanLine = (line) => {
      return line.replace(/\[[^\]|]+\|([^\]]+)\]/g, "$1").replace(/[\[\]]/g, "");
  };

    // Process each line
    const parsedStats = lines.map((line) => {
      const cleanedLine = cleanLine(line);

      // TODO: this can probably be combined and cleaned up - use regex101 to test

      // Handle ranges (e.g., "Adds 10 to 16 Physical Damage to Attacks")
      if (/(\d+)\s+to\s+(\d+)/.test(cleanedLine)) {
        const humanText = cleanedLine.replace(/(\d+)\s+to\s+(\d+)/g, "# to #");
        const min = parseFloat(cleanedLine.match(/\d+/)?.[0]); // Use the first number as min
        return { humanText, min };
      }

      // Handle single numbers with optional `%` at the start (e.g., "34% increased Projectile Speed")
      if (/^[+-]?\d+%?/.test(cleanedLine)) {
        const humanText = cleanedLine.replace(/^[+-]?(\d+(\.\d+)?)/g, "#").trim();
        const min = parseFloat(cleanedLine.match(/[+-]?\d*\.?\d+/)?.[0] || 0);
        return { humanText, min };
      }

      // Handle numbers anywhere in the line (e.g., "Gain 3 Mana per Enemy Killed" or "+2% to Lightning Resistance")
      if (/\d+/.test(cleanedLine)) {
        const humanText = cleanedLine.replace(/[+-]?(\d+(\.\d+)?)/g, "#").trim(); // Replace the entire number (with optional `%`) with "#%"
        const min = parseFloat(cleanedLine.match(/[+-]?\d+/)?.[0] || 0); // Extract the number for min
        return { humanText, min };
      }

      // Carry over lines with no numeric values
      return { humanText: cleanedLine.trim(), min: null };
    });

    // Debug
    //console.log("Parsed stats:", parsedStats);

    // Inject the postMessage logic into the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          func: (parsedStats) => {
            parsedStats.forEach(({ humanText, min }) => {
              // Send each parsed stat to the inject script
              window.postMessage(
                {
                  type: "SET_STAT_FILTER_FROM_TEXT",
                  humanText,
                  min,
                  max: null, // Not needed
                },
                "*"
              );
            });
          },
          args: [parsedStats],
        },
        () => {
          if (chrome.runtime.lastError) {
            //console.error("Error injecting script:", chrome.runtime.lastError.message);
            status.textContent = "Failed to set the stat filters.";
            status.style.color = "red";
          } else {
            status.textContent = `Filters applied for ${parsedStats.length} stats.`;
            status.style.color = "green";
          }
        }
      );
    });
  });
});
