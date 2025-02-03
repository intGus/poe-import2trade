// Inject the `inject.js` script into the webpage
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');

// Append the script to the page to access main context
(document.head || document.documentElement).appendChild(script);

// Clean up the DOM
script.onload = () => script.remove();
