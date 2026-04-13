// API Configuration for Face Swap Service
// This file contains the API configuration for connecting to face swap services

const API_CONFIG = {
    // API Endpoint - change this to your backend URL in production
    endpoint: '/api',

    // Demo mode - set to true to use simulated processing
    demoMode: true,

    // API Keys - add your keys here
    keys: {
        deepai: '',      // DeepAI API Key
        mybuttons: ''    // MyButtons AI API Key
    },

    // Processing settings
    settings: {
        quality: 'balanced',  // fast, balanced, high
        format: 'mp4'        // mp4, webm
    }
};

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}
