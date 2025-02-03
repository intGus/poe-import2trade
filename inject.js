const MAX_RETRIES = 50;
let retryCount = 0;

// Function to wait for the `app` variable
function waitForApp() {
    try {
        // Check if app variable is available
        if (window.app && window.app.$data && window.app.$data.static_ && window.app.$data.static_.knownStats) {
            const knownStats = window.app.$data.static_.knownStats[0];

            // Build the stats map
            const statsMap = knownStats.entries.reduce((map, stat) => {
                if (map[stat.text]) {
                    // Handle duplicates
                    // console.warn(`Duplicate text found: "${stat.text}" with IDs ${map[stat.text]} and ${stat.id}`);
                    map[stat.text].push(stat.id);
                } else {
                    map[stat.text] = [stat.id];
                }
                return map;
            }, {});

            // console.log("Stats map built:", statsMap);

            // Expose statsMap for debugging
            window.statsMap = statsMap;

            // Add event listener for stat lookups and filter setting
            window.addEventListener("message", (event) => {
                if (event.source !== window) return; // Only accept messages from the same page

                if (event.data.type === "SET_STAT_FILTER_FROM_TEXT") {
                    const { humanText, min, max } = event.data;

                    if (statsMap[humanText]) {
                        const statIds = statsMap[humanText];

                        if (statIds.length > 1) {
                            // console.warn(`Duplicate stat IDs found for "${humanText}":`, statIds);

                            // Get the current group index (length of stats array)
                            const currentStats = window.app.$store.state.persistent.stats;
                            const newGroupIndex = currentStats.length;

                            // Add a new group with type 'count' for duplicate stat IDs, including the min values
                            window.app.$store.commit("pushStatGroup", {
                                filters: statIds.map((id) => ({
                                    id,
                                    value: { min }, // Include min value in each filter
                                })),
                                type: "count",
                            });

                            // Set the group value to 1 (require at least one filter to match)
                            window.app.$store.commit("setStatGroupValue", {
                                group: newGroupIndex,
                                value: { min: 1 }, // set a min 1 to the count filter
                            });

                            // console.log(
                            //     `New 'count' group added for duplicates of "${humanText}" at group index ${newGroupIndex}:`,
                            //     statIds
                            // );
                        } else {
                            // Single stat ID case
                            const statId = statIds[0];
                            if (window.app && window.app.$store) {
                                window.app.$store.commit("setStatFilter", {
                                    group: 0, // Default group index for single stat
                                    value: { id: statId, value: { min, max } },
                                });

                                // Debug
                                // console.log(
                                //     `Stat filter set for ${statId} (Text: "${humanText}"): Min: ${min}, Max: ${max}`
                                // );
                                // console.log(
                                //     "Filters after adding:",
                                //     window.app.$store.state.persistent.stats[0].filters
                                // );
                            }
                        }
                    } else {
                        console.log(`No stat ID found for "${humanText}".`);
                    }
                }
            });

           // console.log('Event listener for "SET_STAT_FILTER_FROM_TEXT" added.');
        } else if (retryCount < MAX_RETRIES) {
            // Retry if `app` is not yet available and within the retry limit
            retryCount++;
            setTimeout(waitForApp, 100);
        } else {
            console.error('Failed to retrieve `app.$data.static_.knownStats[0]` after maximum retries.');
        }
    } catch (error) {
        console.error('Error accessing `app` variable:', error);
    }
}

// Start waiting for the `app` variable
setTimeout(waitForApp, 200);
