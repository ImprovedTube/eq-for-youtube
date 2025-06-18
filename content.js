/**
 * EQ for YouTube - Content Script
 * 
 * This script is injected into YouTube pages and handles:
 * 1. Finding and capturing the audio from the video element
 * 2. Setting up the Web Audio API for real-time audio processing
 * 3. Creating and configuring the equalizer filter nodes
 * 4. Detecting YouTube channel information
 * 5. Analyzing audio for visualization
 */

// Audio Context and nodes
let audioContext = null;
let videoElement = null;
let sourceNode = null;
let analyserNode = null;
let gainNode = null;
let filterNodes = [];
let isProcessingActive = true;
let currentChannelId = null;
let eqSettings = null;
let isExtensionReady = false;

// Initialize the extension when the page is fully loaded
window.addEventListener('load', initializeExtension);

// Keyboard shortcuts have been removed per user request

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'updateEQ':
      updateEqualizerSettings(message.settings);
      sendResponse({ success: true });
      break;
      
    case 'getStatus':
      const status = {
        isReady: isExtensionReady,
        isActive: isProcessingActive,
        channelInfo: getChannelInfo(),
        audioConnected: audioContext !== null
      };
      sendResponse(status);
      break;
      
    case 'toggleEQ':
      toggleEqualizer(message.isActive);
      sendResponse({ success: true, isActive: isProcessingActive });
      break;
      
    case 'getAudioData':
      if (analyserNode) {
        const audioData = getAudioData();
        sendResponse({ success: true, audioData });
      } else {
        sendResponse({ success: false, error: 'Analyzer not ready' });
      }
      break;
      
    case 'resetAudioNodes':
      resetAudioNodes();
      sendResponse({ success: true });
      break;
  }
  return true; // Keep the messaging channel open for async responses
});

/**
 * Initialize the extension and set up audio processing
 */
function initializeExtension() {
  // Try to find the video element repeatedly until found
  const findVideoInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (video && video.src) {
      videoElement = video;
      clearInterval(findVideoInterval);
      setupAudioProcessing();
      detectChannelChanges();
      isExtensionReady = true;
      
      // Send ready message to background
      chrome.runtime.sendMessage({
        type: 'contentReady',
        channelInfo: getChannelInfo()
      });
    }
  }, 1000);
}

/**
 * Get the current YouTube channel information
 */
function getChannelInfo() {
  let channelName = 'Unknown Channel';
  let channelId = null;
  
  // Try to extract channel name and ID from the page
  try {
    // Method 1: From channel link in video info
    const channelLink = document.querySelector('a.yt-simple-endpoint.style-scope.ytd-channel-name');
    if (channelLink) {
      channelName = channelLink.textContent.trim();
      const href = channelLink.getAttribute('href');
      if (href) {
        channelId = href.split('/').pop();
      }
    }
    
    // Method 2: From metadata
    if (!channelId) {
      const metaChannelLink = document.querySelector('link[rel="canonical"]');
      if (metaChannelLink) {
        const url = new URL(metaChannelLink.href);
        const pathParts = url.pathname.split('/');
        if (pathParts.includes('channel')) {
          const idIndex = pathParts.indexOf('channel') + 1;
          if (idIndex < pathParts.length) {
            channelId = pathParts[idIndex];
          }
        }
      }
    }
    
    // Method 3: From video owner renderer
    if (!channelId) {
      const ownerRenderer = document.querySelector('ytd-video-owner-renderer');
      if (ownerRenderer) {
        const channelElement = ownerRenderer.querySelector('#channel-name');
        if (channelElement) {
          channelName = channelElement.textContent.trim();
          const channelLinkElem = ownerRenderer.querySelector('a');
          if (channelLinkElem) {
            const href = channelLinkElem.getAttribute('href');
            if (href) {
              channelId = href.split('/').pop();
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting channel info:', error);
  }
  
  // Update current channel ID
  currentChannelId = channelId;
  
  return {
    name: channelName,
    id: channelId
  };
}

/**
 * Set up audio processing using Web Audio API
 */
function setupAudioProcessing() {
  try {
    // Create audio context if not already created
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create source node from video element
    sourceNode = audioContext.createMediaElementSource(videoElement);
    
    // Create analyzer node for visualization
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.8;
    
    // Create master gain node
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    
    // Create 6 filter nodes (one for each band)
    for (let i = 0; i < 6; i++) {
      const filterNode = audioContext.createBiquadFilter();
      
      // Set filter type based on position
      if (i === 0) {
        filterNode.type = 'lowshelf';
      } else if (i === 5) {
        filterNode.type = 'highshelf';
      } else {
        filterNode.type = 'peaking';
      }
      
      // Set initial filter values
      filterNode.gain.value = 0;
      filterNode.Q.value = 1.0;
      
      // Default frequencies spread logarithmically
      const defaultFrequencies = [60, 250, 1000, 4000, 8000, 16000];
      filterNode.frequency.value = defaultFrequencies[i];
      
      filterNodes.push(filterNode);
    }
    
    // Connect nodes: source -> filters -> gain -> analyser -> destination
    sourceNode.connect(filterNodes[0]);
    
    for (let i = 0; i < filterNodes.length - 1; i++) {
      filterNodes[i].connect(filterNodes[i + 1]);
    }
    
    filterNodes[filterNodes.length - 1].connect(gainNode);
    gainNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);
    
    // Load settings after connecting
    loadChannelSettings();
    
  } catch (error) {
    console.error('Error setting up audio processing:', error);
    isExtensionReady = false;
  }
}

/**
 * Update equalizer settings based on the provided configuration
 */
function updateEqualizerSettings(settings) {
  if (!isExtensionReady || !filterNodes.length) return;
  
  eqSettings = settings;
  const bands = settings.bands;
  
  // Apply changes to each filter node
  bands.forEach((band, index) => {
    if (index < filterNodes.length) {
      const filter = filterNodes[index];
      
      // Update filter parameters
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      
      // Only set Q for peaking filters (not the first and last)
      if (index > 0 && index < 5) {
        filter.Q.value = band.q;
      }
      
      // Handle band on/off state
      if (band.isActive === false) {
        filter.gain.value = 0;
      }
    }
  });
  
  // Save settings for current channel
  if (currentChannelId) {
    saveChannelSettings(settings);
  }
}

/**
 * Toggle the equalizer on and off
 */
function toggleEqualizer(isActive) {
  isProcessingActive = isActive;
  
  if (!isExtensionReady || !filterNodes.length) return;
  
  if (isProcessingActive) {
    // Reactivate EQ
    sourceNode.disconnect();
    sourceNode.connect(filterNodes[0]);
  } else {
    // Bypass all filters
    sourceNode.disconnect();
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);
  }
}

/**
 * Get current audio data for visualization
 */
function getAudioData() {
  if (!analyserNode) return null;
  
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyserNode.getByteFrequencyData(dataArray);
  
  return {
    dataArray: Array.from(dataArray),
    bufferLength
  };
}

/**
 * Reset and recreate audio nodes
 */
function resetAudioNodes() {
  if (audioContext) {
    // Disconnect all nodes
    if (sourceNode) {
      sourceNode.disconnect();
    }
    
    filterNodes.forEach(node => {
      node.disconnect();
    });
    
    if (gainNode) {
      gainNode.disconnect();
    }
    
    if (analyserNode) {
      analyserNode.disconnect();
    }
    
    // Clear references
    filterNodes = [];
    sourceNode = null;
    gainNode = null;
    analyserNode = null;
    
    // Re-initialize audio processing
    setupAudioProcessing();
  }
}

/**
 * Monitor for channel changes
 */
function detectChannelChanges() {
  // Check for URL changes which could indicate channel change
  let currentUrl = window.location.href;
  
  setInterval(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      
      // Wait for the page to load new content
      setTimeout(() => {
        const newChannelInfo = getChannelInfo();
        
        // If channel has changed, load appropriate settings
        if (newChannelInfo.id !== currentChannelId) {
          currentChannelId = newChannelInfo.id;
          loadChannelSettings();
          
          // Notify popup of channel change
          chrome.runtime.sendMessage({
            type: 'channelChanged',
            channelInfo: newChannelInfo
          });
        }
      }, 1500);
    }
  }, 1000);
}

/**
 * Load channel-specific EQ settings
 */
function loadChannelSettings() {
  if (!currentChannelId) return;
  
  chrome.storage.local.get('eqSettings', (result) => {
    if (result.eqSettings) {
      const channelSettings = result.eqSettings.channelSettings || {};
      
      // Check if we have settings for this channel
      if (channelSettings[currentChannelId]) {
        // Apply channel-specific settings
        updateEqualizerSettings(channelSettings[currentChannelId]);
      } else {
        // Apply default settings
        updateEqualizerSettings(result.eqSettings);
      }
    }
  });
}

/**
 * Save channel-specific EQ settings
 */
function saveChannelSettings(settings) {
  if (!currentChannelId) return;
  
  chrome.storage.local.get('eqSettings', (result) => {
    if (result.eqSettings) {
      const updatedSettings = { ...result.eqSettings };
      
      // Initialize channelSettings if it doesn't exist
      if (!updatedSettings.channelSettings) {
        updatedSettings.channelSettings = {};
      }
      
      // Save current settings for this channel
      updatedSettings.channelSettings[currentChannelId] = {
        ...settings,
        channelInfo: getChannelInfo()
      };
      
      // Update storage
      chrome.storage.local.set({ eqSettings: updatedSettings });
    }
  });
}
