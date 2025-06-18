/**
 * EQ for YouTube - Background Service Worker
 * 
 * This background service worker handles communication between the popup and content scripts
 * and manages browser-level events for the extension.
 */

// Initialize default state for the extension
chrome.runtime.onInstalled.addListener(() => {
  // Set default EQ settings
  chrome.storage.local.get('eqSettings', (result) => {
    if (!result.eqSettings) {
      // Default EQ settings if none exist
      const defaultEqSettings = {
        isActive: true,
        themeIsDark: prefersDarkMode(),
        bands: [
          { id: 1, frequency: 60, gain: 0, q: 0.8, isActive: true, color: "#EC407A" },
          { id: 2, frequency: 250, gain: 0, q: 1.0, isActive: true, color: "#7E57C2" },
          { id: 3, frequency: 1000, gain: 0, q: 1.2, isActive: true, color: "#29B6F6" },
          { id: 4, frequency: 4000, gain: 0, q: 1.5, isActive: true, color: "#66BB6A" },
          { id: 5, frequency: 8000, gain: 0, q: 1.0, isActive: true, color: "#FFCA28" },
          { id: 6, frequency: 16000, gain: 0, q: 0.8, isActive: true, color: "#FF7043" }
        ],
        presets: {
          "Flat": [
            { id: 1, frequency: 60, gain: 0, q: 0.8 },
            { id: 2, frequency: 250, gain: 0, q: 1.0 },
            { id: 3, frequency: 1000, gain: 0, q: 1.2 },
            { id: 4, frequency: 4000, gain: 0, q: 1.5 },
            { id: 5, frequency: 8000, gain: 0, q: 1.0 },
            { id: 6, frequency: 16000, gain: 0, q: 0.8 }
          ],
          "Bass Boost": [
            { id: 1, frequency: 60, gain: 8, q: 0.8 },
            { id: 2, frequency: 250, gain: 4, q: 1.0 },
            { id: 3, frequency: 1000, gain: 0, q: 1.2 },
            { id: 4, frequency: 4000, gain: 0, q: 1.5 },
            { id: 5, frequency: 8000, gain: 0, q: 1.0 },
            { id: 6, frequency: 16000, gain: 0, q: 0.8 }
          ],
          "Treble Boost": [
            { id: 1, frequency: 60, gain: 0, q: 0.8 },
            { id: 2, frequency: 250, gain: 0, q: 1.0 },
            { id: 3, frequency: 1000, gain: 0, q: 1.2 },
            { id: 4, frequency: 4000, gain: 4, q: 1.5 },
            { id: 5, frequency: 8000, gain: 6, q: 1.0 },
            { id: 6, frequency: 16000, gain: 8, q: 0.8 }
          ],
          "V-Shaped": [
            { id: 1, frequency: 60, gain: 6, q: 0.8 },
            { id: 2, frequency: 250, gain: 2, q: 1.0 },
            { id: 3, frequency: 1000, gain: -2, q: 1.2 },
            { id: 4, frequency: 4000, gain: 1, q: 1.5 },
            { id: 5, frequency: 8000, gain: 4, q: 1.0 },
            { id: 6, frequency: 16000, gain: 6, q: 0.8 }
          ]
        },
        channelSettings: {}
      };
      
      chrome.storage.local.set({ eqSettings: defaultEqSettings });
    }
  });
});

// Check system dark mode preference
function prefersDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Keyboard shortcuts have been removed per user request

// Message handler for communication between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different types of messages
  if (message.type === "getTabInfo") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Keep the message channel open for async response
  }
  
  // Handle shortcut key messages from content script
  if (message.type === "eqToggled") {
    // Update storage with new EQ active state
    chrome.storage.local.get('eqSettings', (result) => {
      if (result.eqSettings) {
        const newSettings = {
          ...result.eqSettings,
          isActive: message.isActive
        };
        chrome.storage.local.set({ eqSettings: newSettings });
      }
    });
  }
  
  if (message.type === "themeToggled") {
    // Update storage with new theme state
    chrome.storage.local.get('eqSettings', (result) => {
      if (result.eqSettings) {
        const newSettings = {
          ...result.eqSettings,
          themeIsDark: message.isDark
        };
        chrome.storage.local.set({ eqSettings: newSettings });
      }
    });
  }
  
  // Forward messages from popup to the active content script
  if (message.target === "content") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          sendResponse(response);
        });
      } else {
        sendResponse({ error: "No active tab found" });
      }
    });
    return true; // Keep the message channel open for async response
  }
});
