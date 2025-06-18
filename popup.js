/**
 * EQ for YouTube - Popup Script
 * 
 * Main script for the extension popup UI that handles:
 * 1. User interactions with EQ controls
 * 2. Communication with the content script
 * 3. Updating the visualization
 * 4. Managing presets and themes
 */

// Global state
let eqSettings = {
  isActive: true,
  bands: [
    { id: 1, frequency: 60, gain: 0, q: 0.8, isActive: true, color: "#EC407A" },
    { id: 2, frequency: 250, gain: 0, q: 1.0, isActive: true, color: "#7E57C2" },
    { id: 3, frequency: 1000, gain: 0, q: 1.2, isActive: true, color: "#29B6F6" },
    { id: 4, frequency: 4000, gain: 0, q: 1.5, isActive: true, color: "#66BB6A" },
    { id: 5, frequency: 8000, gain: 0, q: 1.0, isActive: true, color: "#FFCA28" },
    { id: 6, frequency: 16000, gain: 0, q: 0.8, isActive: true, color: "#FF7043" }
  ]
};

let eqVisualizer = null;
let isInitialized = false;
let updateTimeout = null;

// DOM Elements
const presetSelector = document.getElementById('preset-selector');
const savePresetButton = document.getElementById('save-preset');
const themeToggle = document.getElementById('toggle-theme');
const powerButton = document.getElementById('power-button');
const powerStatus = document.getElementById('power-status');
const resetButton = document.getElementById('reset-button');
// Status indicator has been removed from the UI
const bandControls = document.getElementById('band-controls');
const presetModal = document.getElementById('preset-modal');
const closeModalButton = document.getElementById('close-modal');
const cancelPresetButton = document.getElementById('cancel-preset');
const savePresetConfirmButton = document.getElementById('save-preset-confirm');
const presetNameInput = document.getElementById('preset-name');

// Advanced Controls Elements
const toggleAdvancedControls = document.getElementById('toggle-advanced-controls');

// No tutorial elements

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme
  const isDarkMode = await loadThemePreference();
  setTheme(isDarkMode);
  
  // Initialize EQ visualizer
  eqVisualizer = new EQVisualizer('eq-graph');
  
  // Initial toggle button state based on default settings
  if (eqSettings.isActive) {
    powerButton.classList.add('active-green');
    powerButton.classList.remove('inactive-red');
    powerStatus.textContent = 'Active';
  } else {
    powerButton.classList.add('inactive-red');
    powerButton.classList.remove('active-green');
    powerStatus.textContent = 'Inactive';
  }
  
  // Load presets
  await presetManager.loadPresets();
  presetManager.populatePresetSelector(presetSelector);
  
  // Load saved settings
  loadSettings();
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Load settings from storage
 */
function loadSettings() {
  chrome.storage.local.get('eqSettings', async (result) => {
    if (result.eqSettings) {
      eqSettings = result.eqSettings;
      
      // Apply theme setting if it exists
      if (eqSettings.themeIsDark !== undefined) {
        setTheme(eqSettings.themeIsDark);
      }
    }
    
    // Check status of the active YouTube tab
    checkTabStatus();
  });
}

/**
 * Check the status of the active tab
 */
function checkTabStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      updateStatus('error', 'No active tab');
      return;
    }
    
    const tab = tabs[0];
    
    // Check if the active tab is a YouTube page
    if (!tab.url || !tab.url.includes('youtube.com')) {
      updateStatus('error', 'Not a YouTube page');
      return;
    }
    
    // Get status from content script
    chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatus('error', 'Extension not ready');
        return;
      }
      
      if (response && response.isReady) {
        // Update channel info
        currentChannelInfo = response.channelInfo;
        updateChannelDisplay();
        
        // Update power status with color and text
        if (response.isActive) {
          powerButton.classList.add('active-green');
          powerButton.classList.remove('inactive-red');
          powerStatus.textContent = 'Active';
        } else {
          powerButton.classList.add('inactive-red');
          powerButton.classList.remove('active-green');
          powerStatus.textContent = 'Inactive';
        }
        
        // Update connection status
        updateStatus('success', 'Connected to YouTube');
        
        // Initialize the UI with current settings
        if (!isInitialized) {
          initializeUI();
          eqVisualizer.startSpectrumAnimation();
          isInitialized = true;
        }
      } else {
        updateStatus('error', 'Waiting for YouTube');
      }
    });
  });
}

/**
 * Initialize the UI with current settings
 */
function initializeUI() {
  // Initialize band controls
  renderBandControls();
  
  // Initialize EQ visualizer with current bands
  eqVisualizer.initHandles(eqSettings.bands);
  
  // Set preset selector to the correct value
  const currentPresetId = presetManager.identifyActivePreset(eqSettings.bands);
  presetSelector.value = currentPresetId;
  presetManager.currentPreset = currentPresetId;
}

/**
 * Render all band controls
 */
function renderBandControls() {
  bandControls.innerHTML = '';
  
  eqSettings.bands.forEach(band => {
    const bandControl = createBandControl(band);
    bandControls.appendChild(bandControl);
  });
}

/**
 * Create a band control element
 * @param {Object} band - Band settings
 * @returns {HTMLElement} Band control element
 */
function createBandControl(band) {
  const bandDiv = document.createElement('div');
  bandDiv.className = `band-control${band.isActive ? '' : ' disabled'}`;
  bandDiv.dataset.bandId = band.id;
  
  // Band header
  const header = document.createElement('div');
  header.className = 'band-header';
  
  const nameDiv = document.createElement('div');
  nameDiv.className = 'band-name';
  
  const colorDot = document.createElement('div');
  colorDot.className = `band-color band-color-${band.id}`;
  colorDot.style.backgroundColor = band.color;
  
  const title = document.createElement('span');
  title.className = 'band-title';
  title.textContent = `Band ${band.id}`;
  
  nameDiv.appendChild(colorDot);
  nameDiv.appendChild(title);
  
  const toggle = document.createElement('span');
  toggle.className = 'material-icons band-toggle';
  toggle.textContent = 'power_settings_new';
  toggle.style.color = band.isActive ? '' : 'rgba(0, 0, 0, 0.3)';
  toggle.addEventListener('click', () => toggleBand(band.id));
  
  header.appendChild(nameDiv);
  header.appendChild(toggle);
  
  // Band parameters
  const params = document.createElement('div');
  params.className = 'band-params';
  
  // Frequency control
  const freqRow = createParameterRow(
    'Freq',
    formatFrequency(band.frequency),
    createRangeInput(20, 20000, band.frequency, 'frequency', band.id)
  );
  
  // Gain control
  const gainRow = createParameterRow(
    'Gain',
    formatGain(band.gain),
    createRangeInput(-12, 12, band.gain, 'gain', band.id)
  );
  
  // Q control
  const qRow = createParameterRow(
    'Q',
    formatQ(band.q),
    createRangeInput(0.1, 10, band.q, 'q', band.id, 0.1)
  );
  
  params.appendChild(freqRow);
  params.appendChild(gainRow);
  params.appendChild(qRow);
  
  // Add all elements to band div
  bandDiv.appendChild(header);
  bandDiv.appendChild(params);
  
  return bandDiv;
}

/**
 * Create a parameter control row
 * @param {string} label - Parameter label
 * @param {string} value - Parameter formatted value
 * @param {HTMLElement} control - Control element
 * @returns {HTMLElement} Parameter row element
 */
function createParameterRow(label, value, control) {
  const row = document.createElement('div');
  row.className = 'param-row';
  
  const header = document.createElement('div');
  header.className = 'param-header';
  
  const labelSpan = document.createElement('label');
  labelSpan.className = 'param-label';
  labelSpan.textContent = label;
  
  const valueSpan = document.createElement('span');
  valueSpan.className = 'param-value';
  valueSpan.dataset.paramType = label.toLowerCase();
  valueSpan.textContent = value;
  
  header.appendChild(labelSpan);
  header.appendChild(valueSpan);
  
  row.appendChild(header);
  row.appendChild(control);
  
  return row;
}

/**
 * Create a range input element
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} value - Current value
 * @param {string} paramType - Parameter type (frequency, gain, q)
 * @param {number} bandId - Band ID
 * @param {number} step - Step increment
 * @returns {HTMLElement} Range input element
 */
function createRangeInput(min, max, value, paramType, bandId, step = null) {
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.value = value;
  if (step !== null) {
    input.step = step;
  }
  
  // For frequency, use logarithmic scale
  if (paramType === 'frequency') {
    // Convert to logarithmic position for the slider
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logValue = Math.log10(value);
    const percent = (logValue - logMin) / (logMax - logMin) * 100;
    
    // Create a data attribute to store the actual frequency
    input.dataset.frequency = value;
    
    // Use a custom property for the slider position
    input.style.setProperty('--value', `${percent}%`);
  }
  
  input.dataset.bandId = bandId;
  input.dataset.paramType = paramType;
  
  // Add input event listener
  input.addEventListener('input', (e) => {
    updateBandParameter(bandId, paramType, parseFloat(e.target.value));
  });
  
  return input;
}

/**
 * Update a band parameter
 * @param {number} bandId - Band ID
 * @param {string} paramType - Parameter type (frequency, gain, q)
 * @param {number} value - New value
 */
function updateBandParameter(bandId, paramType, value) {
  // Find the band
  const band = eqSettings.bands.find(b => b.id === bandId);
  if (!band) return;
  
  // Special handling for frequency (logarithmic conversion)
  if (paramType === 'frequency') {
    // Frequency values can be very precise, round to integers for display
    value = Math.round(value);
  }
  
  // Update the band parameter
  band[paramType] = value;
  
  // Update the display value in the UI
  const bandDiv = document.querySelector(`.band-control[data-band-id="${bandId}"]`);
  if (bandDiv) {
    const valueDisplay = bandDiv.querySelector(`.param-value[data-param-type="${paramType}"]`);
    if (valueDisplay) {
      switch (paramType) {
        case 'frequency':
          valueDisplay.textContent = formatFrequency(value);
          break;
        case 'gain':
          valueDisplay.textContent = formatGain(value);
          break;
        case 'q':
          valueDisplay.textContent = formatQ(value);
          break;
      }
    }
  }
  
  // Update the visualizer
  eqVisualizer.updateHandle(band);
  
  // Send updates to content script with debounce
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    sendSettingsToContentScript();
    
    // Update preset selector
    const currentPresetId = presetManager.identifyActivePreset(eqSettings.bands);
    presetSelector.value = currentPresetId;
    presetManager.currentPreset = currentPresetId;
  }, 100);
}

/**
 * Toggle a band on/off
 * @param {number} bandId - Band ID
 */
function toggleBand(bandId) {
  // Find the band
  const band = eqSettings.bands.find(b => b.id === bandId);
  if (!band) return;
  
  // Toggle the active state
  band.isActive = !band.isActive;
  
  // Update the UI
  const bandDiv = document.querySelector(`.band-control[data-band-id="${bandId}"]`);
  if (bandDiv) {
    bandDiv.classList.toggle('disabled', !band.isActive);
    
    const toggle = bandDiv.querySelector('.band-toggle');
    if (toggle) {
      toggle.style.color = band.isActive ? '' : 'rgba(0, 0, 0, 0.3)';
    }
  }
  
  // Update the visualizer
  eqVisualizer.updateCurve();
  
  // Send updates to content script
  sendSettingsToContentScript();
}

/**
 * Send current settings to the content script
 */
function sendSettingsToContentScript() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'updateEQ',
      settings: eqSettings
    });
    
    // Save to storage
    chrome.storage.local.set({ eqSettings });
  });
}

/**
 * Handle connection status in the background
 * @param {string} type - Status type ('success' or 'error')
 * @param {string} message - Status message
 */
function updateStatus(type, message) {
  // Connection status indicator has been removed from UI
  // But we keep this function for internal state tracking
  console.log(`Connection status: ${type} - ${message}`);
}

/**
 * Update channel display - now just manage connection state
 * (channel name display has been removed from the UI)
 */
function updateChannelDisplay() {
  // This function has been simplified since we no longer display channel name
  // It remains for backward compatibility but doesn't update any UI
  // The connection status is handled by updateStatus()
}

/**
 * Set the theme
 * @param {boolean} isDark - Whether to use dark mode
 */
function setTheme(isDark) {
  document.body.classList.toggle('dark-theme', isDark);
  saveThemePreference(isDark);
}

/**
 * Toggle the theme
 */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  saveThemePreference(isDark);
  
  // Save to extension settings
  if (eqSettings) {
    eqSettings.themeIsDark = isDark;
    chrome.storage.local.set({ eqSettings });
  }
}

/**
 * Toggle the equalizer on/off
 */
function togglePower() {
  eqSettings.isActive = !eqSettings.isActive;
  
  // Update UI with color change and status text
  if (eqSettings.isActive) {
    powerButton.classList.add('active-green');
    powerButton.classList.remove('inactive-red');
    powerStatus.textContent = 'Active';
  } else {
    powerButton.classList.add('inactive-red');
    powerButton.classList.remove('active-green');
    powerStatus.textContent = 'Inactive';
  }
  
  // Send to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'toggleEQ',
      isActive: eqSettings.isActive
    });
    
    // Save to storage
    chrome.storage.local.set({ eqSettings });
  });
}

/**
 * Reset the EQ to flat
 */
function resetEQ() {
  // Apply flat preset
  applyPreset('flat');
}

/**
 * Apply a preset
 * @param {string} presetId - ID of the preset to apply
 */
function applyPreset(presetId) {
  const preset = presetManager.getPreset(presetId);
  if (!preset) return;
  
  // Update bands with preset values
  preset.bands.forEach((presetBand, index) => {
    const band = eqSettings.bands[index];
    
    // Preserve band ID and color, update other properties
    band.frequency = presetBand.frequency;
    band.gain = presetBand.gain;
    band.q = presetBand.q;
    band.isActive = presetBand.isActive !== undefined ? presetBand.isActive : true;
  });
  
  // Update UI
  renderBandControls();
  eqVisualizer.initHandles(eqSettings.bands);
  
  // Send to content script
  sendSettingsToContentScript();
  
  // Update preset selector
  presetSelector.value = presetId;
  presetManager.currentPreset = presetId;
}

/**
 * Show the save preset modal
 */
function showSavePresetModal() {
  presetNameInput.value = '';
  presetModal.classList.remove('hidden');
  presetNameInput.focus();
}

/**
 * Hide the save preset modal
 */
function hidePresetModal() {
  presetModal.classList.add('hidden');
}

/**
 * Save the current EQ settings as a custom preset
 */
function saveCustomPreset() {
  const presetName = presetNameInput.value.trim();
  if (!presetName) return;
  
  // Save the preset
  const presetId = presetManager.saveUserPreset(presetName, eqSettings.bands);
  
  // Update the preset selector
  presetManager.populatePresetSelector(presetSelector);
  presetSelector.value = presetId;
  presetManager.currentPreset = presetId;
  
  // Hide the modal
  hidePresetModal();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);
  
  // Power toggle
  powerButton.addEventListener('click', togglePower);
  
  // Reset button
  resetButton.addEventListener('click', resetEQ);
  
  // Preset selector
  presetSelector.addEventListener('change', (e) => {
    applyPreset(e.target.value);
  });
  
  // Save preset button
  savePresetButton.addEventListener('click', showSavePresetModal);
  
  // Modal close button
  closeModalButton.addEventListener('click', hidePresetModal);
  
  // Modal cancel button
  cancelPresetButton.addEventListener('click', hidePresetModal);
  
  // Modal save button
  savePresetConfirmButton.addEventListener('click', saveCustomPreset);
  
  // EQ change events from visualizer
  document.addEventListener('eq-change', (e) => {
    const { band, parameter } = e.detail;
    
    // Update slider controls to match
    const bandDiv = document.querySelector(`.band-control[data-band-id="${band.id}"]`);
    if (bandDiv) {
      if (parameter === 'position') {
        // Update frequency slider
        const freqInput = bandDiv.querySelector('input[data-param-type="frequency"]');
        if (freqInput) {
          freqInput.value = band.frequency;
          
          // Update frequency display
          const freqDisplay = bandDiv.querySelector('.param-value[data-param-type="frequency"]');
          if (freqDisplay) {
            freqDisplay.textContent = formatFrequency(band.frequency);
          }
        }
        
        // Update gain slider
        const gainInput = bandDiv.querySelector('input[data-param-type="gain"]');
        if (gainInput) {
          gainInput.value = band.gain;
          
          // Update gain display
          const gainDisplay = bandDiv.querySelector('.param-value[data-param-type="gain"]');
          if (gainDisplay) {
            gainDisplay.textContent = formatGain(band.gain);
          }
        }
      } else if (parameter === 'q') {
        // Update Q slider
        const qInput = bandDiv.querySelector('input[data-param-type="q"]');
        if (qInput) {
          qInput.value = band.q;
          
          // Update Q display
          const qDisplay = bandDiv.querySelector('.param-value[data-param-type="q"]');
          if (qDisplay) {
            qDisplay.textContent = formatQ(band.q);
          }
        }
      }
    }
  });
  
  // EQ change complete event
  document.addEventListener('eq-change-complete', () => {
    sendSettingsToContentScript();
    
    // Update preset selector
    const currentPresetId = presetManager.identifyActivePreset(eqSettings.bands);
    presetSelector.value = currentPresetId;
    presetManager.currentPreset = currentPresetId;
  });
  
  // Listen for Enter key in the preset name input
  presetNameInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      saveCustomPreset();
    } else if (e.key === 'Escape') {
      hidePresetModal();
    }
  });
  
  // Advanced Controls Toggle
  toggleAdvancedControls.addEventListener('click', toggleAdvanced);
  
  // Load advanced panel state
  loadAdvancedPanelState();
}

/**
 * Toggle the advanced controls panel
 */
function toggleAdvanced() {
  const isExpanded = bandControls.classList.toggle('expanded');
  bandControls.classList.toggle('collapsed', !isExpanded);
  toggleAdvancedControls.classList.toggle('expanded', isExpanded);
  
  // Update the toggle icon
  const toggleIcon = toggleAdvancedControls.querySelector('.toggle-icon');
  if (toggleIcon) {
    toggleIcon.textContent = isExpanded ? 'expand_less' : 'expand_more';
  }
  
  // Save preference to storage
  if (eqSettings) {
    eqSettings.advancedExpanded = isExpanded;
    chrome.storage.local.set({ eqSettings });
  }
}

/**
 * Load advanced panel state
 */
function loadAdvancedPanelState() {
  chrome.storage.local.get('eqSettings', (result) => {
    if (result.eqSettings && result.eqSettings.advancedExpanded) {
      bandControls.classList.add('expanded');
      bandControls.classList.remove('collapsed');
      toggleAdvancedControls.classList.add('expanded');
      
      const toggleIcon = toggleAdvancedControls.querySelector('.toggle-icon');
      if (toggleIcon) {
        toggleIcon.textContent = 'expand_less';
      }
    }
  });
}
