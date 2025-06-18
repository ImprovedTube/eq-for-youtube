/**
 * EQ for YouTube - EQ Visualizer
 * 
 * Handles the interactive graph, frequency response curve and 
 * audio spectrum visualization
 */

class EQVisualizer {
  /**
   * Initialize the equalizer visualizer
   * @param {string} svgId - ID of the SVG element
   */
  constructor(svgId) {
    this.svg = document.getElementById(svgId);
    this.svgWidth = 580;
    this.svgHeight = 200;
    this.minX = 30;
    this.maxX = 550;
    this.minY = 180;
    this.maxY = 20;
    this.minFreq = 20;
    this.maxFreq = 20000;
    this.minGain = -12;
    this.maxGain = 12;
    
    this.handles = [];
    this.bands = [];
    this.activeBand = null;
    this.spectrumData = null;
    this.isAnimationActive = false;
    
    // Create handles group if it doesn't exist
    this.handlesGroup = document.getElementById('eq-handles');
    if (!this.handlesGroup) {
      this.handlesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.handlesGroup.id = 'eq-handles';
      this.svg.appendChild(this.handlesGroup);
    }
    
    // Create spectrum group if it doesn't exist
    this.spectrumGroup = document.getElementById('audio-spectrum');
    if (!this.spectrumGroup) {
      this.spectrumGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.spectrumGroup.id = 'audio-spectrum';
      this.svg.appendChild(this.spectrumGroup);
    }
    
    // Get EQ curve path
    this.eqCurve = document.getElementById('eq-curve');
    
    // Readout elements
    this.readout = document.getElementById('active-band-readout');
    this.readoutFreq = document.getElementById('readout-freq');
    this.readoutGain = document.getElementById('readout-gain');
    this.readoutQ = document.getElementById('readout-q');
    
    // Mouse event tracking
    this.isDragging = false;
    this.lastY = 0;
    this.lastX = 0;
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners for drag interactions
   */
  setupEventListeners() {
    // Mouse move handler for the whole SVG
    this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Mouse up handler on window to catch all mouse up events
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Mouse wheel for Q adjustment
    this.svg.addEventListener('wheel', this.handleMouseWheel.bind(this));
  }
  
  /**
   * Initialize the EQ handles based on band parameters
   * @param {Array} bands - Array of band objects with frequency, gain, Q, etc.
   */
  initHandles(bands) {
    // Clear existing handles
    this.handlesGroup.innerHTML = '';
    this.handles = [];
    this.bands = bands;
    
    // Create a handle for each band
    bands.forEach((band, index) => {
      // Calculate position from frequency and gain
      const x = frequencyToX(band.frequency, this.minFreq, this.maxFreq, this.minX, this.maxX);
      const y = gainToY(band.gain, this.minGain, this.maxGain, this.minY, this.maxY);
      
      // Create SVG circle for the handle
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('id', `band${band.id}`);
      handle.setAttribute('class', 'eq-handle');
      handle.setAttribute('cx', x);
      handle.setAttribute('cy', y);
      handle.setAttribute('r', '8');
      handle.setAttribute('fill', band.color);
      handle.setAttribute('stroke', '#FFFFFF');
      handle.setAttribute('stroke-width', '2');
      handle.setAttribute('data-band-id', band.id);
      
      // Add mousedown event
      handle.addEventListener('mousedown', (e) => {
        this.handleMouseDown(e, band.id);
      });
      
      // Store handle reference
      this.handles.push(handle);
      this.handlesGroup.appendChild(handle);
    });
    
    // Update the EQ curve
    this.updateCurve();
  }
  
  /**
   * Update the position of a handle based on band parameters
   * @param {Object} band - Band object with frequency, gain, Q, etc.
   */
  updateHandle(band) {
    const handle = this.handles.find(h => parseInt(h.getAttribute('data-band-id')) === band.id);
    if (!handle) return;
    
    // Calculate position from frequency and gain
    const x = frequencyToX(band.frequency, this.minFreq, this.maxFreq, this.minX, this.maxX);
    const y = gainToY(band.gain, this.minGain, this.maxGain, this.minY, this.maxY);
    
    // Update handle position
    handle.setAttribute('cx', x);
    handle.setAttribute('cy', y);
    
    // Update the EQ curve
    this.updateCurve();
  }
  
  /**
   * Handle mouse down on an EQ handle
   * @param {Event} event - Mouse event
   * @param {number} bandId - ID of the band being adjusted
   */
  handleMouseDown(event, bandId) {
    // Prevent default to avoid text selection
    event.preventDefault();
    
    // Store state for dragging
    this.isDragging = true;
    this.activeBand = this.bands.find(band => band.id === bandId);
    
    // Store initial position
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    
    // Show and position the readout
    this.updateReadout();
    this.readout.classList.remove('hidden');
  }
  
  /**
   * Handle mouse move for dragging EQ handles
   * @param {Event} event - Mouse event
   */
  handleMouseMove(event) {
    if (!this.isDragging || !this.activeBand) return;
    
    const handle = this.handles.find(h => parseInt(h.getAttribute('data-band-id')) === this.activeBand.id);
    if (!handle) return;
    
    // Calculate new position
    const currentX = parseFloat(handle.getAttribute('cx')) + (event.clientX - this.lastX);
    const currentY = parseFloat(handle.getAttribute('cy')) + (event.clientY - this.lastY);
    
    // Constrain x within bounds
    const newX = Math.max(this.minX, Math.min(this.maxX, currentX));
    
    // Constrain y within bounds
    const newY = Math.max(this.maxY, Math.min(this.minY, currentY));
    
    // Update handle position
    handle.setAttribute('cx', newX);
    handle.setAttribute('cy', newY);
    
    // Convert position to frequency and gain
    const newFrequency = xToFrequency(newX, this.minFreq, this.maxFreq, this.minX, this.maxX);
    const newGain = yToGain(newY, this.minGain, this.maxGain, this.minY, this.maxY);
    
    // Update active band properties
    this.activeBand.frequency = newFrequency;
    this.activeBand.gain = newGain;
    
    // Update readout
    this.updateReadout();
    
    // Update the curve
    this.updateCurve();
    
    // Store current position for next move
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    
    // Dispatch custom event for value change
    const changeEvent = new CustomEvent('eq-change', {
      detail: {
        band: this.activeBand,
        parameter: 'position'
      }
    });
    document.dispatchEvent(changeEvent);
  }
  
  /**
   * Handle mouse up to end dragging
   */
  handleMouseUp() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    // Hide the readout after a delay
    setTimeout(() => {
      if (!this.isDragging) {
        this.readout.classList.add('hidden');
      }
    }, 2000);
    
    // Notify of complete adjustment
    if (this.activeBand) {
      const completeEvent = new CustomEvent('eq-change-complete', {
        detail: {
          band: this.activeBand
        }
      });
      document.dispatchEvent(completeEvent);
    }
  }
  
  /**
   * Handle mouse wheel for Q adjustment
   * @param {Event} event - Mouse wheel event
   */
  handleMouseWheel(event) {
    // Check if mouse is over a handle
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || !element.classList.contains('eq-handle')) return;
    
    // Prevent default scrolling
    event.preventDefault();
    
    // Get band ID from handle
    const bandId = parseInt(element.getAttribute('data-band-id'));
    const band = this.bands.find(b => b.id === bandId);
    if (!band) return;
    
    // Adjust Q based on wheel direction
    const direction = event.deltaY > 0 ? -1 : 1;
    let newQ = band.q + direction * 0.1;
    
    // Constrain Q value
    newQ = Math.max(0.1, Math.min(10, newQ));
    
    // Update band Q
    band.q = newQ;
    
    // Set as active band for readout
    this.activeBand = band;
    
    // Update readout
    this.updateReadout();
    this.readout.classList.remove('hidden');
    
    // Hide readout after delay
    clearTimeout(this.readoutTimer);
    this.readoutTimer = setTimeout(() => {
      this.readout.classList.add('hidden');
    }, 2000);
    
    // Update the curve
    this.updateCurve();
    
    // Dispatch custom event for value change
    const changeEvent = new CustomEvent('eq-change', {
      detail: {
        band,
        parameter: 'q'
      }
    });
    document.dispatchEvent(changeEvent);
    
    // Notify of complete adjustment
    const completeEvent = new CustomEvent('eq-change-complete', {
      detail: { band }
    });
    document.dispatchEvent(completeEvent);
  }
  
  /**
   * Update the readout showing band parameters
   */
  updateReadout() {
    if (!this.activeBand) return;
    
    // Update readout text
    this.readoutFreq.textContent = formatFrequency(this.activeBand.frequency);
    this.readoutGain.textContent = formatGain(this.activeBand.gain);
    this.readoutQ.textContent = formatQ(this.activeBand.q);
    
    // Position the readout near the active handle
    const handle = this.handles.find(h => parseInt(h.getAttribute('data-band-id')) === this.activeBand.id);
    if (handle) {
      const cx = parseFloat(handle.getAttribute('cx'));
      const cy = parseFloat(handle.getAttribute('cy'));
      
      // Position readout based on which quadrant the handle is in
      let x, y;
      
      // Right side of graph
      if (cx > (this.minX + this.maxX) / 2) {
        x = cx - 110; // Position to the left of the handle
      } else {
        x = cx + 10; // Position to the right of the handle
      }
      
      // Bottom half of graph
      if (cy > (this.minY + this.maxY) / 2) {
        y = cy - 60; // Position above the handle
      } else {
        y = cy + 5; // Position below the handle
      }
      
      // Ensure readout remains within bounds
      x = Math.max(5, Math.min(this.maxX - 100, x));
      y = Math.max(5, Math.min(this.minY - 60, y));
      
      this.readout.setAttribute('transform', `translate(${x}, ${y})`);
    }
  }
  
  /**
   * Update the EQ response curve based on current band settings
   */
  updateCurve() {
    const pathData = calculateEQResponse(this.bands, this.minFreq, this.maxFreq, this.minX, this.maxX);
    this.eqCurve.setAttribute('d', pathData);
  }
  
  /**
   * Start the spectrum visualization animation
   */
  startSpectrumAnimation() {
    if (this.isAnimationActive) return;
    
    this.isAnimationActive = true;
    this.updateSpectrum();
  }
  
  /**
   * Stop the spectrum visualization animation
   */
  stopSpectrumAnimation() {
    this.isAnimationActive = false;
  }
  
  /**
   * Update the audio spectrum visualization
   */
  updateSpectrum() {
    if (!this.isAnimationActive) return;
    
    // Request new audio data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getAudioData' }, (response) => {
        if (response && response.success) {
          this.spectrumData = response.audioData;
          this.renderSpectrum();
        }
        
        // Continue animation loop
        requestAnimationFrame(() => this.updateSpectrum());
      });
    });
  }
  
  /**
   * Render the spectrum visualization based on current audio data
   */
  renderSpectrum() {
    if (!this.spectrumData) return;
    
    // Clear previous spectrum
    this.spectrumGroup.innerHTML = '';
    
    const { dataArray, bufferLength } = this.spectrumData;
    
    // Calculate bar width based on available space
    const barWidth = Math.max(1, Math.floor((this.maxX - this.minX) / 128));
    const barSpacing = 1;
    
    // Render a subset of frequency bins (logarithmically spaced to match EQ frequencies)
    const totalBars = Math.floor((this.maxX - this.minX) / (barWidth + barSpacing));
    
    for (let i = 0; i < totalBars; i++) {
      // Calculate which frequency bin to use (logarithmic spacing)
      const percentX = i / totalBars;
      const logMin = Math.log10(1);
      const logMax = Math.log10(bufferLength / 4); // Use first quarter of bins for audible range
      const binIndex = Math.floor(Math.pow(10, logMin + percentX * (logMax - logMin)));
      
      // Get value from frequency data (0-255)
      const value = dataArray[binIndex < dataArray.length ? binIndex : dataArray.length - 1] || 0;
      
      // Scale value to match our graph height
      const barHeight = Math.max(1, (value / 255) * (this.minY - this.maxY) * 0.8);
      
      // Calculate bar position
      const x = this.minX + i * (barWidth + barSpacing);
      const y = this.minY - barHeight;
      
      // Create bar element
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('class', 'spectrum-bar');
      bar.setAttribute('x', x);
      bar.setAttribute('y', y);
      bar.setAttribute('width', barWidth);
      bar.setAttribute('height', barHeight);
      
      this.spectrumGroup.appendChild(bar);
    }
  }
}
