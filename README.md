# EQ for YouTube (Chrome Extension)

A sophisticated Chrome extension providing advanced 6-band parametric equalization for YouTube with cutting-edge user experience features.

## Features

- **Advanced 6-band Parametric EQ**: Complete control with adjustable frequency, gain, and Q factor for each band
- **Real-time Audio Visualization**: Live frequency response curve and spectrum analyzer
- **Custom Presets**: Save and load your personalized equalizer settings
- **Channel-specific Settings**: Automatically remembers settings for each YouTube channel
- **Dark/Light Theme**: Elegant interface that adapts to your preference
- **User-friendly Interface**: Intuitive controls designed for ease of use

## Installation

1. **Download the Extension**:
   - Visit our [website](https://aashishjhaa.github.io/eq-for-youtube/) and click the Download button
   - Alternatively, download directly from this repository

2. **Install in Chrome**:
   - Unzip the downloaded file
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked" and select the unzipped extension folder
   - The extension icon should appear in your browser toolbar

## How to Use

1. **Access the Equalizer**:
   - Go to any YouTube video
   - Click the EQ for YouTube extension icon in your browser toolbar
   - The equalizer interface will appear

2. **Adjust the EQ**:
   - Use sliders to adjust gain for each frequency band
   - Drag points on the graph for more precise control
   - Adjust frequency and Q factor using mouse wheel or advanced controls
   - Toggle bands on/off with the power buttons

3. **Save Your Settings**:
   - Your settings are automatically saved for each YouTube channel
   - Create custom presets for different types of content

## Technical Details

- Built with JavaScript and Web Audio API
- Uses parametric biquad filters for precise audio control
- Real-time audio visualization with canvas-based spectrum analyzer
- Clear separation of audio processing and UI components

## Development

### Project Structure
```
extension/
├── manifest.json     # Extension configuration
├── popup.html        # Main UI template
├── popup.js          # UI logic and controls
├── popup.css         # Styling
├── content.js        # YouTube integration and audio processing
├── background.js     # Background scripts
├── eq-visualizer.js  # Visualization components
├── presets.js        # Preset management
└── utils.js          # Utility functions
```

### Building from Source

1. Clone this repository
2. Make your modifications
3. Load the extension in developer mode as described in the installation section

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Developed by Genius Aashish Jha
- Audio processing algorithms inspired by No one

## Version History

- **1.2.0**: Added 6-band EQ, redesigned user interface, improved visualization
- **1.1.0**: Added channel-specific settings and preset management
- **1.0.0**: Initial release with 4-band EQ
