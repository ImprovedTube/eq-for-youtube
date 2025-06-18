/**
 * EQ for YouTube - Utility Functions
 * 
 * Common utilities used across the extension
 */

/**
 * Convert a frequency value to a logarithmic x-coordinate for visualization
 * @param {number} frequency - Frequency in Hz
 * @param {number} minFreq - Minimum frequency (typically 20Hz)
 * @param {number} maxFreq - Maximum frequency (typically 20kHz)
 * @param {number} minX - Minimum x-coordinate
 * @param {number} maxX - Maximum x-coordinate
 * @returns {number} X-coordinate position
 */
function frequencyToX(frequency, minFreq = 20, maxFreq = 20000, minX = 30, maxX = 550) {
  // Convert to logarithmic scale
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const percentX = (Math.log10(frequency) - logMin) / (logMax - logMin);
  
  // Scale to the available pixel range
  return minX + percentX * (maxX - minX);
}

/**
 * Convert an x-coordinate to a frequency value
 * @param {number} x - X-coordinate
 * @param {number} minFreq - Minimum frequency (typically 20Hz)
 * @param {number} maxFreq - Maximum frequency (typically 20kHz)
 * @param {number} minX - Minimum x-coordinate
 * @param {number} maxX - Maximum x-coordinate
 * @returns {number} Frequency in Hz
 */
function xToFrequency(x, minFreq = 20, maxFreq = 20000, minX = 30, maxX = 550) {
  // Ensure x is within bounds
  x = Math.max(minX, Math.min(maxX, x));
  
  // Convert from position to logarithmic frequency
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const percentX = (x - minX) / (maxX - minX);
  
  // Calculate frequency from the logarithmic scale
  return Math.pow(10, logMin + percentX * (logMax - logMin));
}

/**
 * Convert a gain value to a y-coordinate
 * @param {number} gain - Gain in dB
 * @param {number} minGain - Minimum gain (typically -12dB)
 * @param {number} maxGain - Maximum gain (typically +12dB)
 * @param {number} minY - Minimum y-coordinate
 * @param {number} maxY - Maximum y-coordinate
 * @returns {number} Y-coordinate position
 */
function gainToY(gain, minGain = -12, maxGain = 12, minY = 180, maxY = 20) {
  // Convert gain to position (inverting y-axis since SVG has 0,0 at top-left)
  const percentY = (gain - minGain) / (maxGain - minGain);
  return minY - percentY * (minY - maxY);
}

/**
 * Convert a y-coordinate to a gain value
 * @param {number} y - Y-coordinate
 * @param {number} minGain - Minimum gain (typically -12dB)
 * @param {number} maxGain - Maximum gain (typically +12dB)
 * @param {number} minY - Minimum y-coordinate
 * @param {number} maxY - Maximum y-coordinate
 * @returns {number} Gain in dB
 */
function yToGain(y, minGain = -12, maxGain = 12, minY = 180, maxY = 20) {
  // Ensure y is within bounds
  y = Math.max(maxY, Math.min(minY, y));
  
  // Convert from position to gain
  const percentY = (minY - y) / (minY - maxY);
  return minGain + percentY * (maxGain - minGain);
}

/**
 * Format a frequency value for display
 * @param {number} frequency - Frequency in Hz
 * @returns {string} Formatted frequency string
 */
function formatFrequency(frequency) {
  if (frequency >= 1000) {
    return `${(frequency / 1000).toFixed(1)} kHz`;
  }
  return `${Math.round(frequency)} Hz`;
}

/**
 * Format a gain value for display
 * @param {number} gain - Gain in dB
 * @returns {string} Formatted gain string
 */
function formatGain(gain) {
  const prefix = gain > 0 ? '+' : '';
  return `${prefix}${gain.toFixed(1)} dB`;
}

/**
 * Format a Q value for display
 * @param {number} q - Q value
 * @returns {string} Formatted Q string
 */
function formatQ(q) {
  return `Q: ${q.toFixed(1)}`;
}

/**
 * Calculate the EQ response curve based on filter parameters
 * @param {Array} bands - Array of band objects with frequency, gain, Q, and isActive properties
 * @param {number} minFreq - Minimum frequency for calculation (Hz)
 * @param {number} maxFreq - Maximum frequency for calculation (Hz)
 * @param {number} minX - Minimum x-coordinate in the SVG
 * @param {number} maxX - Maximum x-coordinate in the SVG
 * @returns {string} SVG path data for the response curve
 */
function calculateEQResponse(bands, minFreq = 20, maxFreq = 20000, minX = 30, maxX = 550) {
  const samplePoints = 200;
  const nyquist = 22050; // Half of standard 44.1kHz sample rate
  const points = [];
  
  // Calculate frequency response at each sample point
  for (let i = 0; i <= samplePoints; i++) {
    // Calculate frequency for this sample point (logarithmically spaced)
    const percentX = i / samplePoints;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const frequency = Math.pow(10, logMin + percentX * (logMax - logMin));
    
    // Calculate x-coordinate for this frequency
    const x = minX + percentX * (maxX - minX);
    
    // Calculate combined gain of all filters at this frequency
    let totalGain = 0;
    
    bands.forEach(band => {
      if (!band.isActive) return;
      
      // Calculate filter response based on filter type and parameters
      let gain = 0;
      
      // Low shelf (first band)
      if (band.id === 1) {
        const w0 = 2 * Math.PI * frequency / nyquist;
        const A = Math.pow(10, band.gain / 40);
        
        if (frequency <= band.frequency) {
          gain = band.gain;
        } else {
          const ratio = frequency / band.frequency;
          // Simplified shelf filter approximation
          gain = band.gain / (1 + Math.pow(ratio, 4));
        }
      }
      // High shelf (last band)
      else if (band.id === 6) {
        if (frequency >= band.frequency) {
          gain = band.gain;
        } else {
          const ratio = band.frequency / frequency;
          // Simplified shelf filter approximation
          gain = band.gain / (1 + Math.pow(ratio, 4));
        }
      }
      // Peaking filter (middle bands)
      else {
        const freqRatio = frequency / band.frequency;
        const bw = 1 / band.q;
        
        // Simplified peak filter approximation
        gain = band.gain / (1 + Math.pow(Math.abs(Math.log(freqRatio) / bw), 2));
      }
      
      totalGain += gain;
    });
    
    // Calculate y-coordinate for this gain
    const y = gainToY(totalGain);
    
    points.push({ x, y });
  }
  
  // Generate SVG path data
  let pathData = `M${points[0].x},${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    pathData += ` L${points[i].x},${points[i].y}`;
  }
  
  // Add bottom line to close the path for fill
  pathData += ` L${maxX},180 L${minX},180 Z`;
  
  return pathData;
}

/**
 * Detect preferred color scheme from system settings
 * @returns {boolean} True if dark mode is preferred
 */
function prefersDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Save theme preference to storage
 * @param {boolean} isDark - Whether dark mode is enabled
 */
function saveThemePreference(isDark) {
  chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
}

/**
 * Load theme preference from storage
 * @returns {Promise<boolean>} Promise resolving to whether dark mode is enabled
 */
async function loadThemePreference() {
  return new Promise((resolve) => {
    chrome.storage.local.get('theme', (result) => {
      if (result.theme) {
        resolve(result.theme === 'dark');
      } else {
        // Default to system preference if not set
        resolve(prefersDarkMode());
      }
    });
  });
}

/**
 * Debounce a function to limit how often it can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Create a unique channel ID from a channel name
 * @param {string} channelName - Channel name
 * @returns {string} Normalized channel ID
 */
function createChannelId(channelName) {
  return channelName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}
