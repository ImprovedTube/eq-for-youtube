/**
 * EQ for YouTube - Presets Management
 * 
 * Manages built-in and user-defined presets
 */

class PresetManager {
  /**
   * Initialize the preset manager
   */
  constructor() {
    this.currentPreset = 'custom';
    this.builtInPresets = {
      'flat': {
        name: 'Flat',
        bands: [
          { id: 1, frequency: 60, gain: 0, q: 0.8, isActive: true },
          { id: 2, frequency: 250, gain: 0, q: 1.0, isActive: true },
          { id: 3, frequency: 1000, gain: 0, q: 1.2, isActive: true },
          { id: 4, frequency: 4000, gain: 0, q: 1.5, isActive: true },
          { id: 5, frequency: 8000, gain: 0, q: 1.0, isActive: true },
          { id: 6, frequency: 16000, gain: 0, q: 0.8, isActive: true }
        ]
      },
      'bass-boost': {
        name: 'Bass Boost',
        bands: [
          { id: 1, frequency: 60, gain: 8, q: 0.8, isActive: true },
          { id: 2, frequency: 250, gain: 4, q: 1.0, isActive: true },
          { id: 3, frequency: 1000, gain: 0, q: 1.2, isActive: true },
          { id: 4, frequency: 4000, gain: 0, q: 1.5, isActive: true },
          { id: 5, frequency: 8000, gain: 0, q: 1.0, isActive: true },
          { id: 6, frequency: 16000, gain: 0, q: 0.8, isActive: true }
        ]
      },
      'treble-boost': {
        name: 'Treble Boost',
        bands: [
          { id: 1, frequency: 60, gain: 0, q: 0.8, isActive: true },
          { id: 2, frequency: 250, gain: 0, q: 1.0, isActive: true },
          { id: 3, frequency: 1000, gain: 0, q: 1.2, isActive: true },
          { id: 4, frequency: 4000, gain: 4, q: 1.5, isActive: true },
          { id: 5, frequency: 8000, gain: 6, q: 1.0, isActive: true },
          { id: 6, frequency: 16000, gain: 8, q: 0.8, isActive: true }
        ]
      },
      'v-shaped': {
        name: 'V-Shaped',
        bands: [
          { id: 1, frequency: 60, gain: 6, q: 0.8, isActive: true },
          { id: 2, frequency: 250, gain: 2, q: 1.0, isActive: true },
          { id: 3, frequency: 1000, gain: -2, q: 1.2, isActive: true },
          { id: 4, frequency: 4000, gain: 1, q: 1.5, isActive: true },
          { id: 5, frequency: 8000, gain: 4, q: 1.0, isActive: true },
          { id: 6, frequency: 16000, gain: 6, q: 0.8, isActive: true }
        ]
      }
    };
    this.userPresets = {};
  }
  
  /**
   * Load all presets from storage
   * @returns {Promise} Promise that resolves when presets are loaded
   */
  async loadPresets() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['eqSettings'], (result) => {
        if (result.eqSettings && result.eqSettings.presets) {
          // Load user presets from storage
          Object.keys(result.eqSettings.presets).forEach(presetKey => {
            if (!this.builtInPresets[presetKey]) {
              this.userPresets[presetKey] = result.eqSettings.presets[presetKey];
            }
          });
        }
        resolve();
      });
    });
  }
  
  /**
   * Save user presets to storage
   * @returns {Promise} Promise that resolves when presets are saved
   */
  async savePresets() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['eqSettings'], (result) => {
        if (result.eqSettings) {
          const updatedSettings = { ...result.eqSettings };
          
          // Merge built-in and user presets
          updatedSettings.presets = {
            ...this.builtInPresets,
            ...this.userPresets
          };
          
          chrome.storage.local.set({ eqSettings: updatedSettings }, resolve);
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * Get a preset by its ID
   * @param {string} presetId - ID of the preset to get
   * @returns {Object|null} The preset object or null if not found
   */
  getPreset(presetId) {
    if (this.builtInPresets[presetId]) {
      return this.builtInPresets[presetId];
    }
    
    if (this.userPresets[presetId]) {
      return this.userPresets[presetId];
    }
    
    return null;
  }
  
  /**
   * Get all available presets (built-in and user)
   * @returns {Object} Object containing all presets
   */
  getAllPresets() {
    return {
      ...this.builtInPresets,
      ...this.userPresets
    };
  }
  
  /**
   * Create or update a user preset
   * @param {string} name - Name of the preset
   * @param {Array} bands - Array of band settings
   * @returns {string} ID of the saved preset
   */
  saveUserPreset(name, bands) {
    // Create a sanitized ID from the name
    const presetId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Create the preset object
    this.userPresets[presetId] = {
      name,
      bands: JSON.parse(JSON.stringify(bands)), // Deep copy
      isUserPreset: true
    };
    
    // Save to storage
    this.savePresets();
    
    return presetId;
  }
  
  /**
   * Delete a user preset
   * @param {string} presetId - ID of the preset to delete
   * @returns {boolean} True if deletion was successful
   */
  deleteUserPreset(presetId) {
    // Cannot delete built-in presets
    if (this.builtInPresets[presetId]) {
      return false;
    }
    
    if (this.userPresets[presetId]) {
      delete this.userPresets[presetId];
      this.savePresets();
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if the current settings match a preset
   * @param {Array} bands - Current band settings
   * @returns {string} Preset ID if matched, 'custom' otherwise
   */
  identifyActivePreset(bands) {
    const allPresets = this.getAllPresets();
    
    // Check against each preset
    for (const [presetId, preset] of Object.entries(allPresets)) {
      let isMatch = true;
      
      // Compare each band
      for (let i = 0; i < bands.length; i++) {
        const currentBand = bands[i];
        const presetBand = preset.bands[i];
        
        // Allow small differences due to rounding
        if (
          Math.abs(currentBand.frequency - presetBand.frequency) > 1 ||
          Math.abs(currentBand.gain - presetBand.gain) > 0.1 ||
          Math.abs(currentBand.q - presetBand.q) > 0.1 ||
          currentBand.isActive !== presetBand.isActive
        ) {
          isMatch = false;
          break;
        }
      }
      
      if (isMatch) {
        return presetId;
      }
    }
    
    return 'custom';
  }
  
  /**
   * Populate a select element with available presets
   * @param {HTMLSelectElement} selectElement - Select element to populate
   */
  populatePresetSelector(selectElement) {
    // Clear existing options
    selectElement.innerHTML = '';
    
    // Add custom option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom';
    selectElement.appendChild(customOption);
    
    // Add built-in presets
    Object.entries(this.builtInPresets).forEach(([id, preset]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = preset.name;
      selectElement.appendChild(option);
    });
    
    // Add separator if there are user presets
    if (Object.keys(this.userPresets).length > 0) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '──────────';
      selectElement.appendChild(separator);
      
      // Add user presets
      Object.entries(this.userPresets).forEach(([id, preset]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${preset.name} ★`;
        selectElement.appendChild(option);
      });
    }
    
    // Set current preset
    selectElement.value = this.currentPreset;
  }
}

// Create a global instance
const presetManager = new PresetManager();
