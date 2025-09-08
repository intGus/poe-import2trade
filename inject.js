const MAX_RETRIES = 100;
let retryCount = 0;
const DEBUG = false;

// Function to wait for the `app` variable
function waitForApp() {
    try {
        if (window.app?.$data?.static_) {
            const staticData = window.app.$data.static_;

            // Get the stats
            const knownStatsArray = staticData.knownStats || [];
            const knownStats = knownStatsArray.find(stat => stat.id === "explicit");

            if (!knownStats) {
                console.error("Error: Could not find 'explicit' stats in knownStats.");
                return;
            }

            // Build the stats map
            const statsMap = knownStats.entries.reduce((map, stat) => {
                if (map[stat.text]) {
                    map[stat.text].push(stat.id);
                } else {
                    map[stat.text] = [stat.id];
                }

                return map;
            }, {});

            if (DEBUG) console.log("Stats map built:", statsMap);
            window.statsMap = statsMap;

            // Get the item category

            const propertyFilters = staticData.propertyFilters || [];
            const itemClassFilter = propertyFilters.find(filter => filter.id === 'type_filters')?.filters;

            if (!itemClassFilter) {
                console.error("Error: Could not find item class filter.");
                return;
            }

            const itemClassOptions = itemClassFilter[0].option?.options || [];
            const itemClassMap = itemClassOptions.reduce((map, entry) => {
                map[entry.text] = [entry.id];
                return map;
            }, {});

            if (DEBUG) console.log("Item Class Map Built:", itemClassMap);
            window.itemClassMap = itemClassMap;

            // Add event listener for stat lookups and filter setting
            window.addEventListener("message", (event) => {
                if (event.source !== window) return; // Only accept messages from the same page

                // Handle clear search form
                if (event.data.type === "CLEAR_SEARCH_FORM") {
                    window.app.$store.commit("clearSearchForm");
                }

                // Handle stat filters
                if (event.data.type === "SET_STAT_FILTER_FROM_TEXT") {
                    const { humanText, min, max } = event.data;
                    
                    // Remove (desecrated) and (fractured) modifiers. This
                    // treats them like explicit modifiers. This assumes that an
                    // explicit mod variant exists for these types of mods.
                    const cleanText = humanText.replace(/\s*\((desecrated|fractured)\)$/, '');
                    
                    if (!statsMap[cleanText]) {
                        if (DEBUG) console.log(`No matching stat ID found for "${cleanText}".`);
                        return;
                    }

                    const statIds = statsMap[cleanText];

                    if (statIds.length > 1) {
                        if (DEBUG) console.log(`Duplicate stat IDs found for "${humanText}":`, statIds);

                        const currentStats = window.app.$store.state.persistent.stats;
                        const newGroupIndex = currentStats.length;

                        window.app.$store.commit("pushStatGroup", {
                            filters: statIds.map((id) => ({
                                id,
                                value: { min, max },
                            })),
                            type: "count",
                        });

                        window.app.$store.commit("setStatGroupValue", {
                            group: newGroupIndex,
                            value: { min: 1 },
                        });

                        if (DEBUG) console.log(`New 'count' group added for "${humanText}" at index ${newGroupIndex}:`, statIds);
                    } else {
                        const statId = statIds[0];
                        if (window.app?.$store) {
                            window.app.$store.commit("setStatFilter", {
                                group: 0,
                                value: { id: statId, value: { min, max } },
                            });

                            if (DEBUG) console.log(`Stat filter set for ${statId} (Text: "${humanText}"): Min: ${min}, Max: ${max}`);
                        }
                    }
                }

                // Handle attribute and elemental resist filter
                if (event.data.type === "SET_EXPANDED_STAT_FILTER") {
                    const { humanText, min, max } = event.data;

                    const statIds = [];
                    ["Dexterity", "Intelligence", "Strength"].forEach(attr => {
                        const expandedText = humanText.replace("ATTRIBUTES", attr);
                        if (statsMap[expandedText]) {
                            statIds.push(...statsMap[expandedText]);
                        }
                    });
                    ["Lightning", "Cold", "Fire"].forEach(element => {
                        const expandedText = humanText.replace("ELEMENTAL_RESIST", element);
                        if (statsMap[expandedText]) {
                            statIds.push(...statsMap[expandedText]);
                        }
                    });

                    const currentStats = window.app.$store.state.persistent.stats;
                    const newGroupIndex = currentStats.length;

                    window.app.$store.commit("pushStatGroup", {
                        filters: statIds.map((id) => ({
                            id,
                        })),
                        type: "weight",
                    });

                    window.app.$store.commit("setStatGroupValue", {
                        group: newGroupIndex,
                        value: { min, max },
                    });
                }

                // Handle item class
                if (event.data.type === "SET_ITEM_CLASS_FILTER") {
                    const { itemClass } = event.data;
                    if (!window.itemClassMap[itemClass]) {
                        if (DEBUG) console.log(`No item class found for "${itemClass}".`);
                        return;
                    }

                    const id = window.itemClassMap[itemClass];

                    window.app.$store.commit("setPropertyFilter", {
                        group: "type_filters",
                        index: "category",
                        value: { option: id[0] },
                    });

                    if (DEBUG) console.log(`Item class set: "${itemClass}" → ID: ${id}`);
                }
            });

            if (DEBUG) console.log('Event listener for "SET_STAT_FILTER_FROM_TEXT" added.');
        } else if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(waitForApp, 100);
        } else {
            console.error('Failed to retrieve `app.$data.static_` after maximum retries.');
        }
    } catch (error) {
        console.error('Error accessing `app` variable:', error);
    }
}

// Start waiting for the `app` variable
setTimeout(waitForApp, 200);
