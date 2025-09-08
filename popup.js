document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("statForm");
  const itemText = document.getElementById("itemText");
  const minBufferInput = document.getElementById("minBufferInput");
  const maxBufferInput = document.getElementById("maxBufferInput");
  const status = document.getElementById("status");
  const clearCheckbox = document.getElementById("clearCheckbox");
  const genericAttributesCheckbox = document.getElementById("genericAttributes");
  const genericElementalResistsCheckbox = document.getElementById("genericElementalResists");

  // ui test
  const syncSliderWithInput = (rangeEl, numberEl) => {
    // Range to number
    rangeEl.addEventListener('input', () => {
      numberEl.value = rangeEl.value;
    });

    // Number to range
    numberEl.addEventListener('input', () => {
      rangeEl.value = numberEl.value;
    });
  };

  syncSliderWithInput(
    document.getElementById('minBufferRange'),
    document.getElementById('minBufferInput')
  );

  syncSliderWithInput(
    document.getElementById('maxBufferRange'),
    document.getElementById('maxBufferInput')
  );

  // end ui test

  // Load saved values from storage
  chrome.storage.local.get(["minBuffer", "maxBuffer", "genericAttributes", "genericElementalResists", "clearCheckbox"], (result) => {
    minBufferInput.value = result.minBuffer || 0;
    document.getElementById('minBufferRange').value = result.minBuffer || 0
    maxBufferInput.value = result.maxBuffer || 0;
    document.getElementById('maxBufferRange').value = result.maxBuffer || 0
    genericAttributesCheckbox.checked = result.genericAttributes || false;
    genericElementalResistsCheckbox.checked = result.genericElementalResists || false;
    clearCheckbox.checked = result.clearCheckbox || false;
  });

  // Save form field changes to local storage
  const saveToLocalStorage = () => {
    chrome.storage.local.set({
      minBuffer: minBufferInput.value,
      maxBuffer: maxBufferInput.value,
      genericAttributes: genericAttributesCheckbox.checked,
      genericElementalResists: genericElementalResistsCheckbox.checked,
      clearCheckbox: clearCheckbox.checked
    });
  };

  minBufferInput.addEventListener("input", saveToLocalStorage);
  document.getElementById('minBufferRange').addEventListener("input", saveToLocalStorage)
  maxBufferInput.addEventListener("input", saveToLocalStorage);
  document.getElementById('maxBufferRange').addEventListener("input", saveToLocalStorage)
  genericAttributesCheckbox.addEventListener("change", saveToLocalStorage);
  genericElementalResistsCheckbox.addEventListener("change", saveToLocalStorage);
  clearCheckbox.addEventListener("change", saveToLocalStorage);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fullText = itemText.value.trim();
    if (!fullText) {
      status.textContent = "Please paste the item text.";
      status.style.color = "red";
      return;
    }

    // Split the text into lines
    const lines = fullText.split("\n");

    // Extract the item class (always the first line)
    let itemClass = null;
    if (lines[0].startsWith("Item Class:")) {
      itemClass = lines[0].replace("Item Class:", "").trim();
      // De-pluralize. Quarterstaves is special.
      if (itemClass === "Quarterstaves") {
        itemClass = "Quarterstaff";
      }
      // Naively de-pluralize the class.
      if (itemClass.endsWith("s")) {
        itemClass = itemClass.slice(0, -1);
      }
    }

    // Filter out other lines with `:` except for the first one
    let filteredLines = lines.slice(1).filter(line => !line.includes(":"));

    if (filteredLines.length === 0) {
      status.textContent = "No valid stats found in the text.";
      status.style.color = "red";
      return;
    }

    // Function to clean up brackets and remove "|"
    const cleanLine = (line) => {
      return line.replace(/\[[^\]|]+\|([^\]]+)\]/g, "$1").replace(/[\[\]]/g, "");
    };


    let parsedStats = filteredLines.map((line) => {
      const cleanedLine = cleanLine(line);

      // Handle ranges (e.g., "Adds 10 to 16 Physical Damage to Attacks")
      if (/(\d+)\s+to\s+(\d+)/.test(cleanedLine)) {
        const humanText = cleanedLine.replace(/(\d+)\s+to\s+(\d+)/g, "# to #");
        const matches = cleanedLine.match(/(\d+)\s+to\s+(\d+)/);
        const minVal = parseFloat(matches[1]);
        const maxVal = parseFloat(matches[2]);
        const min = Math.floor((minVal + maxVal) / 2);
        return { humanText, min };
      }

      // Handle single numbers with optional `%` at the start (e.g., "34% increased Projectile Speed")
      if (/^[+-]?\d+%?/.test(cleanedLine)) {
        const humanText = cleanedLine.replace(/^[+-]?(\d+(\.\d+)?)/g, "#").trim();
        const min = parseFloat(cleanedLine.match(/[+-]?\d*\.?\d+/)?.[0] || 0);
        return { humanText, min };
      }

      // Handle numbers anywhere in the line (e.g., "Gain 3 Mana per Enemy Killed")
      if (/\d+/.test(cleanedLine)) {
        const humanText = cleanedLine.replace(/[+-]?(\d+(\.\d+)?)/g, "#").trim();
        const min = parseFloat(cleanedLine.match(/[+-]?\d+/)?.[0] || 0);
        return { humanText, min };
      }

      // Carry over lines with no numeric values
      return { humanText: cleanedLine.trim(), min: null };
    });

    let attributes = {};
    if (genericAttributesCheckbox.checked) {
      // Use reduce() to split parsedStats into two buckets: attributes and
      // everything else.
      const [ attr, other ] = parsedStats.reduce(([attr, other], parsed) => {
        const text = parsed.humanText;
        if (text.includes("Dexterity") || text.includes("Strength") || text.includes("Intelligence")) {
          attr.push(parsed);
        } else {
          other.push(parsed);
        }
        return [attr, other];
      }, [[], []]);

      parsedStats = other;

      // Convert attributes to fixed string: ATTRIBUTES.
      const transformedAttr = attr.map(({ humanText, min}) => {
        const modifiedLine = humanText.replace(/Dexterity|Strength|Intelligence/g, "ATTRIBUTES");
        return { humanText: modifiedLine, min };
      })
      // Dedupe the array, summing the min values.
      .reduce((dict, { humanText, min }) => {
        if (dict[humanText]) {
          dict[humanText].min += min; // Sum the min values
        } else {
          dict[humanText] = { humanText, min };
        }
        return dict;
      }, {});

      attributes = transformedAttr;
    }

    let elementalResists = {};
    if (genericElementalResistsCheckbox.checked) {
      // Use reduce() to split parsedStats into two buckets: elem resist and
      // everything else.
      const [resist, other] = parsedStats.reduce(([resist, other], parsed) => {
        const text = parsed.humanText;
        if (text.includes("Lightning Resistance") || text.includes("Cold Resistance") || text.includes("Fire Resistance")) {
          resist.push(parsed);
        } else {
          other.push(parsed);
        }
        return [resist, other];
      }, [[], []]);

      parsedStats = other;

      const transformedResist = resist.map(({ humanText, min }) => {
          const modifiedLine = humanText.replace(/Lightning|Cold|Fire/g, "ELEMENTAL_RESIST");
          return { humanText: modifiedLine, min };
        })
        .reduce((dict, { humanText, min }) => {
          if (dict[humanText]) {
            dict[humanText].min += min; // Sum the min values
          } else {
            dict[humanText] = { humanText, min };
          }
          return dict;
        }, {});

      elementalResists = transformedResist;
    }

    // Adjust min and max values based on min and max buffer value if available
    const minBufferValue = parseFloat(minBufferInput.value) || 0;
    const maxBufferValue = parseFloat(maxBufferInput.value) || 0;
    
    const minMultiplier = 1 - minBufferValue * 0.01;
    const maxMultiplier = 1 + maxBufferValue * 0.01;
    
    const adjustValue = (value, multiplier) => {
      const adjusted = value * multiplier;
      return Number.isInteger(value) ? Math.round(adjusted) : parseFloat(adjusted.toFixed(2));
    };

    // if max buffer is not provided, max is null so it won't be set on filter
    
    parsedStats = parsedStats.map(stat => {
      if (stat.min !== null) {
        return {
          ...stat,
          min: adjustValue(stat.min, minMultiplier),
          max: maxBufferValue > 0 ? adjustValue(stat.min, maxMultiplier) : null,
        };
      }
      return { ...stat, max: null };
    });
    
    Object.keys(attributes).forEach(key => {
      const originalMin = attributes[key].min;
      attributes[key].min = adjustValue(originalMin, minMultiplier);
      attributes[key].max = maxBufferValue > 0 ? adjustValue(originalMin, maxMultiplier) : null;
    });
    
    Object.keys(elementalResists).forEach(key => {
      const originalMin = elementalResists[key].min;
      elementalResists[key].min = adjustValue(originalMin, minMultiplier);
      elementalResists[key].max = maxBufferValue > 0 ? adjustValue(originalMin, maxMultiplier) : null;
    });
    

    // Inject the postMessage logic into the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          func: (parsedStats, attributes, elementalResists, itemClass, clear) => {
            // Clear first if needed.
            if (clear) {
              window.postMessage(
                {
                  type: "CLEAR_SEARCH_FORM",
                },
                "*"
              );
            }

            // Send parsed stats
            parsedStats.forEach(({ humanText, min, max }) => {
              window.postMessage(
                {
                  type: "SET_STAT_FILTER_FROM_TEXT",
                  humanText,
                  min,
                  max
                },
                "*"
              );
            });

            // Send attribute stats
            Object.entries(attributes).forEach(([humanText, {count, min, max}]) => {
              window.postMessage(
                {
                  type: "SET_EXPANDED_STAT_FILTER",
                  humanText,
                  count,
                  min,
                  max
                },
                "*"
              );
            });

            // Send elemental resist stats
            Object.entries(elementalResists).forEach(([humanText, {count, min, max}]) => {
              window.postMessage(
                {
                  type: "SET_EXPANDED_STAT_FILTER",
                  humanText,
                  count,
                  min,
                  max
                },
                "*"
              );
            });


            // Send item class (if available)
            if (itemClass) {
              window.postMessage(
                {
                  type: "SET_ITEM_CLASS_FILTER",
                  itemClass,
                },
                "*"
              );
            }
          },
          args: [parsedStats, attributes, elementalResists, itemClass, clearCheckbox.checked],
        },
        () => {
          if (chrome.runtime.lastError) {
            status.textContent = "Failed to set filters.";
            status.style.color = "red";
          } else {
            const statsCount = parsedStats.length + Object.keys(attributes).length + Object.keys(elementalResists).length;
            status.textContent = `Filters applied for ${statsCount} stats.`;
            status.style.color = "green";
          }
        }
      );
    });
  });
});
